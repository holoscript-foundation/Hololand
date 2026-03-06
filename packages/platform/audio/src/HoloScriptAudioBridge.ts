import { getSpatialAudioEngine, type Vector3 } from './index';
import { type AudioContext as HSAudioContext } from '@holoscript/core';

/**
 * HoloScriptAudioBridge
 * 
 * Implements the HoloScript AudioContext interface by delegating to 
 * Hololand's SpatialAudioEngine. This enables Phase 8 Advanced Spatial Audio traits.
 */
export class HoloScriptAudioBridge implements HSAudioContext {
  private engine = getSpatialAudioEngine();

  /**
   * Play a sound at a position (Standard HoloScript Hook)
   */
  playSound(source: string, options?: { position?: [number, number, number]; volume?: number; spatial?: boolean }): void {
    const pos: Vector3 = options?.position 
      ? { x: options.position[0], y: options.position[1], z: options.position[2] }
      : { x: 0, y: 0, z: 0 };
    
    this.engine.playOneShot(source, pos, options?.volume ?? 1.0);
  }

  /**
   * Update HRTF and spatial properties (Phase 8 Hook)
   */
  updateSpatialSource(nodeId: string, options: { hrtfProfile?: string; occlusion?: number; reverbWet?: number }): void {
    const source = this.engine.getSource(nodeId);
    if (!source) return;

    if (options.hrtfProfile) {
      // In a real Web Audio context, we'd update panner properties or convolution IR
      // For now we log and update the internal config
      source.config.metadata = { ...source.config.metadata, hrtfProfile: options.hrtfProfile };
    }

    if (options.reverbWet !== undefined) {
      this.engine.updateReverb({ wetMix: options.reverbWet });
    }
  }

  /**
   * Register Ambisonic Source (Phase 8 Hook)
   */
  registerAmbisonicSource(nodeId: string, order: number): void {
    // Ambisonics implementation would go here (using JSAmbisonics or similar)
    console.log(`[AudioBridge] Registering Ambisonic source ${nodeId} with order ${order}`);
  }

  /**
   * Set Audio Portal (Phase 8 Hook)
   */
  setAudioPortal(portalId: string, targetZone: string, openingSize: number): void {
    // Wire to AudioZoneManager
    console.log(`[AudioBridge] Setting audio portal ${portalId} to ${targetZone}`);
  }

  /**
   * Update Audio Material (Phase 8 Hook)
   */
  updateAudioMaterial(nodeId: string, absorption: number, reflection: number): void {
    // Wire to Occlusion/Reflection processors
    console.log(`[AudioBridge] Updating audio material for ${nodeId}: abs=${absorption}, ref=${reflection}`);
  }
}

let instance: HoloScriptAudioBridge | null = null;
export function getHoloScriptAudioBridge(): HoloScriptAudioBridge {
  if (!instance) instance = new HoloScriptAudioBridge();
  return instance;
}
