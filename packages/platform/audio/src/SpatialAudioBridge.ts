/**
 * SpatialAudioBridge (Phase 8)
 *
 * Implements AudioProvider from @hololand/core TraitContextFactory,
 * connecting HoloScript's 7 spatial audio trait handlers to
 * Hololand's SpatialAudioEngine runtime.
 *
 * Wired handlers:
 *   - ambisonicsHandler    (HOA encoding/decoding)
 *   - hrtfHandler          (personalized HRTF)
 *   - reverbZoneHandler    (environmental reverb)
 *   - audioOcclusionHandler(raycast-based occlusion)
 *   - audioPortalHandler   (cross-zone audio routing)
 *   - audioMaterialHandler (surface absorption/reflection)
 *   - headTrackedAudioHandler (head-locked vs world-space)
 */

import type { AudioProvider } from '@hololand/core';
import type { SpatialAudioEngine } from './SpatialAudioEngine';
import type { Vector3 } from './types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SpatialAudioBridgeConfig {
  /** Reference to the SpatialAudioEngine instance */
  engine: SpatialAudioEngine;
  /** Default HRTF profile when none specified */
  defaultHRTFProfile?: string;
  /** Max number of concurrent spatial sources */
  maxSpatialSources?: number;
  /** Enable ambisonics (requires HOA decoder) */
  enableAmbisonics?: boolean;
  /** Enable audio occlusion raycasting */
  enableOcclusion?: boolean;
}

// ---------------------------------------------------------------------------
// Reverb zone tracking
// ---------------------------------------------------------------------------

interface ReverbZone {
  nodeId: string;
  preset: string;
  size: number;
  decayTime: number;
  damping: number;
  wetLevel: number;
  priority: number;
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

export class SpatialAudioBridge implements AudioProvider {
  private engine: SpatialAudioEngine;
  private config: Required<SpatialAudioBridgeConfig>;
  private spatialSources: Map<string, { gain: number; position: Vector3 }> = new Map();
  private reverbZones: Map<string, ReverbZone> = new Map();
  private ambisonicSources: Map<string, number> = new Map(); // nodeId → order
  private audioPortals: Map<string, { targetZone: string; openingSize: number }> = new Map();

  constructor(config: SpatialAudioBridgeConfig) {
    this.config = {
      defaultHRTFProfile: 'generic',
      maxSpatialSources: 64,
      enableAmbisonics: true,
      enableOcclusion: true,
      ...config,
    };
    this.engine = config.engine;
  }

  // ---- AudioProvider implementation --------------------------------------

  playSound(
    source: string,
    options?: { position?: Vector3; volume?: number; spatial?: boolean },
  ): void {
    if (!options?.spatial) {
      // Non-spatial: play through engine's 2D channel
      this.engine.play(source, { volume: options?.volume ?? 1.0 });
      return;
    }

    // Spatial: create positioned source
    const pos = options.position ?? { x: 0, y: 0, z: 0 };
    this.engine.playSpatial(source, {
      position: pos,
      volume: options.volume ?? 1.0,
      rolloff: 'inverse',
      refDistance: 1,
      maxDistance: 50,
    });
  }

  updateSpatialSource(
    nodeId: string,
    options: { hrtfProfile?: string; occlusion?: number; reverbWet?: number },
  ): void {
    const source = this.spatialSources.get(nodeId);

    if (options.hrtfProfile) {
      // Apply HRTF profile to this source's panner
      this.engine.setSourceHRTF(nodeId, options.hrtfProfile);
    }

    if (options.occlusion !== undefined && this.config.enableOcclusion) {
      // Apply low-pass filter based on occlusion amount (0 = clear, 1 = fully occluded)
      const cutoff = 22050 * (1 - options.occlusion * 0.9); // 22kHz → ~2.2kHz
      this.engine.setSourceFilter(nodeId, { type: 'lowpass', frequency: cutoff });
    }

    if (options.reverbWet !== undefined) {
      // Route source to reverb send
      this.engine.setSourceReverbSend(nodeId, options.reverbWet);
    }

    if (source) {
      source.gain = options.occlusion !== undefined ? 1 - options.occlusion * 0.3 : source.gain;
    }
  }

  registerAmbisonicSource(nodeId: string, order: number): void {
    if (!this.config.enableAmbisonics) return;

    this.ambisonicSources.set(nodeId, order);
    // Register with engine's HOA encoder
    this.engine.registerAmbisonicSource(nodeId, {
      order,
      normalization: 'sn3d',
      channelOrdering: 'acn',
    });
  }

  setAudioPortal(portalId: string, targetZone: string, openingSize: number): void {
    this.audioPortals.set(portalId, { targetZone, openingSize });
    // Route audio between zones through portal with size-based filtering
    this.engine.setPortalRouting(portalId, {
      targetZone,
      openingSize,
      highPassCutoff: Math.max(100, 2000 * (1 - openingSize)), // larger opening = more bass
    });
  }

  updateAudioMaterial(nodeId: string, absorption: number, reflection: number): void {
    // Apply material properties to surfaces for occlusion/reflection calculations
    this.engine.setMaterialProperties(nodeId, { absorption, reflection });
  }

  // ---- Reverb zone management -------------------------------------------

  registerReverbZone(zone: ReverbZone): void {
    this.reverbZones.set(zone.nodeId, zone);
    this.engine.setReverbZone(zone.nodeId, {
      preset: zone.preset,
      size: zone.size,
      decayTime: zone.decayTime,
      damping: zone.damping,
      wetLevel: zone.wetLevel,
    });
  }

  removeReverbZone(nodeId: string): void {
    this.reverbZones.delete(nodeId);
    this.engine.removeReverbZone(nodeId);
  }

  // ---- Spatial source management ----------------------------------------

  registerSpatialSource(nodeId: string, position: Vector3): void {
    if (this.spatialSources.size >= this.config.maxSpatialSources) return;
    this.spatialSources.set(nodeId, { gain: 1.0, position });
    this.engine.createSpatialSource(nodeId, { position, hrtf: this.config.defaultHRTFProfile });
  }

  updateSourcePosition(nodeId: string, position: Vector3): void {
    const source = this.spatialSources.get(nodeId);
    if (source) {
      source.position = position;
      this.engine.updateSourcePosition(nodeId, position);
    }
  }

  removeSpatialSource(nodeId: string): void {
    this.spatialSources.delete(nodeId);
    this.ambisonicSources.delete(nodeId);
    this.engine.destroySpatialSource(nodeId);
  }

  // ---- Stats ------------------------------------------------------------

  getStats(): {
    spatialSources: number;
    reverbZones: number;
    ambisonicSources: number;
    audioPortals: number;
  } {
    return {
      spatialSources: this.spatialSources.size,
      reverbZones: this.reverbZones.size,
      ambisonicSources: this.ambisonicSources.size,
      audioPortals: this.audioPortals.size,
    };
  }

  dispose(): void {
    for (const nodeId of this.spatialSources.keys()) {
      this.engine.destroySpatialSource(nodeId);
    }
    for (const nodeId of this.reverbZones.keys()) {
      this.engine.removeReverbZone(nodeId);
    }
    this.spatialSources.clear();
    this.reverbZones.clear();
    this.ambisonicSources.clear();
    this.audioPortals.clear();
  }
}

export function createSpatialAudioBridge(config: SpatialAudioBridgeConfig): SpatialAudioBridge {
  return new SpatialAudioBridge(config);
}
