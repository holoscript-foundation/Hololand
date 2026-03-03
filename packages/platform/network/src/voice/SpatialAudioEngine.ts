/**
 * @hololand/network SpatialAudioEngine
 *
 * Web Audio API-based 3D audio positioning engine.
 * Provides HRTF panner nodes per audio source, inverse distance attenuation,
 * audio zones with volume multipliers and reverb, wall occlusion via raycast
 * callback, and per-participant AudioNode chains:
 *
 *   MediaStreamSource -> GainNode -> PannerNode -> destination
 *
 * With optional reverb path:
 *   MediaStreamSource -> GainNode -> ConvolverNode -> wetGainNode -> destination
 *                                 -> dryGainNode -> PannerNode -> destination
 *
 * Listener position/orientation is updated from camera transform each frame.
 */

import { logger } from '../logger';
import type { Vector3 } from '../types';
import type {
  SpatialAudioConfig,
  AudioZone,
  ReverbSettings,
  OcclusionRaycastCallback,
  AudioSourceNode,
} from './types';

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CONFIG: Required<SpatialAudioConfig> = {
  hrtfModel: '',
  distanceModel: 'inverse',
  rolloffFactor: 1.0,
  refDistance: 1.0,
  maxDistance: 50,
  coneInnerAngle: 360,
  coneOuterAngle: 360,
  coneOuterGain: 0,
  gainRampTime: 0.05,
};

// ============================================================================
// SpatialAudioEngine
// ============================================================================

export class SpatialAudioEngine {
  private config: Required<SpatialAudioConfig>;
  private audioContext: AudioContext | null = null;
  private isInitialized: boolean = false;

  /** Audio sources (one per participant). */
  private sources: Map<string, AudioSourceNode> = new Map();

  /** Audio zones (rectangular or spherical regions with volume/reverb modifiers). */
  private zones: Map<string, AudioZone> = new Map();

  /** Loaded impulse response buffers. */
  private impulseResponses: Map<string, AudioBuffer> = new Map();

  /** Wall occlusion raycast callback. */
  private occlusionCallback: OcclusionRaycastCallback | null = null;

  /** Current listener position and orientation. */
  private listenerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private listenerForward: Vector3 = { x: 0, y: 0, z: -1 };
  private listenerUp: Vector3 = { x: 0, y: 1, z: 0 };

  constructor(config: SpatialAudioConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('SpatialAudioEngine: initialized', {
      distanceModel: this.config.distanceModel,
      maxDistance: this.config.maxDistance,
      rolloffFactor: this.config.rolloffFactor,
    });
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the AudioContext. Must be called after a user interaction
   * (browser autoplay policy). Can optionally accept an existing AudioContext.
   */
  async initialize(existingContext?: AudioContext): Promise<void> {
    if (this.isInitialized) return;

    this.audioContext = existingContext || new AudioContext({ sampleRate: 48000 });

    // Resume if suspended (autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isInitialized = true;
    logger.info('SpatialAudioEngine: AudioContext initialized', {
      sampleRate: this.audioContext.sampleRate,
      state: this.audioContext.state,
    });
  }

  /**
   * Get the AudioContext (useful for sharing with WebRTCVoiceTransport).
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  // ============================================================================
  // Audio Source Management
  // ============================================================================

  /**
   * Add an audio source for a participant.
   * Creates the full AudioNode chain: MediaStreamSource -> GainNode -> PannerNode -> destination.
   */
  addSource(participantId: string, stream: MediaStream, position?: Vector3): void {
    if (!this.audioContext || !this.isInitialized) {
      logger.warn('SpatialAudioEngine: not initialized, cannot add source');
      return;
    }

    // Remove existing source if present
    if (this.sources.has(participantId)) {
      this.removeSource(participantId);
    }

    try {
      const ctx = this.audioContext;

      // Create source from media stream
      const sourceNode = ctx.createMediaStreamSource(stream);

      // Create gain node for volume control
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;

      // Create HRTF panner node for 3D positioning
      const pannerNode = ctx.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = this.config.distanceModel;
      pannerNode.rolloffFactor = this.config.rolloffFactor;
      pannerNode.refDistance = this.config.refDistance;
      pannerNode.maxDistance = this.config.maxDistance;
      pannerNode.coneInnerAngle = this.config.coneInnerAngle;
      pannerNode.coneOuterAngle = this.config.coneOuterAngle;
      pannerNode.coneOuterGain = this.config.coneOuterGain;

      // Set initial position
      const pos = position || { x: 0, y: 0, z: 0 };
      pannerNode.positionX.value = pos.x;
      pannerNode.positionY.value = pos.y;
      pannerNode.positionZ.value = pos.z;

      // Connect chain: source -> gain -> panner -> destination
      sourceNode.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(ctx.destination);

      const audioSource: AudioSourceNode = {
        participantId,
        sourceNode,
        gainNode,
        pannerNode,
        position: { ...pos },
        currentGain: 1.0,
        occlusionFactor: 0,
      };

      this.sources.set(participantId, audioSource);

      logger.debug('SpatialAudioEngine: source added', { participantId, position: pos });
    } catch (error) {
      logger.error('SpatialAudioEngine: failed to add source', {
        participantId,
        error: String(error),
      });
    }
  }

  /**
   * Remove an audio source for a participant.
   */
  removeSource(participantId: string): void {
    const source = this.sources.get(participantId);
    if (!source) return;

    try {
      source.sourceNode.disconnect();
      source.gainNode.disconnect();
      source.pannerNode.disconnect();

      if (source.convolverNode) {
        source.convolverNode.disconnect();
      }
      if (source.convolverGainNode) {
        source.convolverGainNode.disconnect();
      }
      if (source.dryGainNode) {
        source.dryGainNode.disconnect();
      }
    } catch {
      // Nodes may already be disconnected
    }

    this.sources.delete(participantId);
    logger.debug('SpatialAudioEngine: source removed', { participantId });
  }

  /**
   * Update the position of an audio source.
   * Uses linearRampToValueAtTime for smooth transitions.
   */
  updateSourcePosition(participantId: string, position: Vector3): void {
    const source = this.sources.get(participantId);
    if (!source || !this.audioContext) return;

    source.position = { ...position };

    const currentTime = this.audioContext.currentTime;
    const rampTime = currentTime + this.config.gainRampTime;

    source.pannerNode.positionX.linearRampToValueAtTime(position.x, rampTime);
    source.pannerNode.positionY.linearRampToValueAtTime(position.y, rampTime);
    source.pannerNode.positionZ.linearRampToValueAtTime(position.z, rampTime);
  }

  /**
   * Set gain for a specific source (manual volume override).
   */
  setSourceGain(participantId: string, gain: number): void {
    const source = this.sources.get(participantId);
    if (!source || !this.audioContext) return;

    const clampedGain = Math.max(0, Math.min(2, gain));
    source.currentGain = clampedGain;

    const currentTime = this.audioContext.currentTime;
    source.gainNode.gain.linearRampToValueAtTime(
      clampedGain,
      currentTime + this.config.gainRampTime
    );
  }

  // ============================================================================
  // Listener (Camera) Position
  // ============================================================================

  /**
   * Update listener position and orientation from the camera transform.
   * Should be called each frame.
   */
  updateListener(position: Vector3, forward: Vector3, up: Vector3): void {
    if (!this.audioContext || !this.isInitialized) return;

    this.listenerPosition = { ...position };
    this.listenerForward = { ...forward };
    this.listenerUp = { ...up };

    const listener = this.audioContext.listener;

    const currentTime = this.audioContext.currentTime;
    const rampTime = currentTime + this.config.gainRampTime;

    // Position
    if (listener.positionX) {
      listener.positionX.linearRampToValueAtTime(position.x, rampTime);
      listener.positionY.linearRampToValueAtTime(position.y, rampTime);
      listener.positionZ.linearRampToValueAtTime(position.z, rampTime);
    } else {
      // Fallback for older browsers
      listener.setPosition(position.x, position.y, position.z);
    }

    // Orientation (forward + up vectors)
    if (listener.forwardX) {
      listener.forwardX.linearRampToValueAtTime(forward.x, rampTime);
      listener.forwardY.linearRampToValueAtTime(forward.y, rampTime);
      listener.forwardZ.linearRampToValueAtTime(forward.z, rampTime);
      listener.upX.linearRampToValueAtTime(up.x, rampTime);
      listener.upY.linearRampToValueAtTime(up.y, rampTime);
      listener.upZ.linearRampToValueAtTime(up.z, rampTime);
    } else {
      listener.setOrientation(
        forward.x, forward.y, forward.z,
        up.x, up.y, up.z
      );
    }
  }

  /**
   * Convenience method: update listener from a typical camera transform.
   */
  updateListenerFromCamera(cameraPosition: Vector3, cameraRotationEuler: Vector3): void {
    // Convert Euler angles to forward/up vectors
    const yaw = cameraRotationEuler.y;
    const pitch = cameraRotationEuler.x;

    const forward: Vector3 = {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch),
    };

    const up: Vector3 = {
      x: -Math.sin(yaw) * Math.sin(-pitch),
      y: Math.cos(-pitch),
      z: -Math.cos(yaw) * Math.sin(-pitch),
    };

    this.updateListener(cameraPosition, forward, up);
  }

  // ============================================================================
  // Audio Zones
  // ============================================================================

  /**
   * Add an audio zone (rectangular or spherical) with volume multiplier and reverb settings.
   */
  addZone(zone: AudioZone): void {
    this.zones.set(zone.id, { ...zone });

    // Pre-load impulse response if reverb is configured
    if (zone.reverb?.impulseResponseUrl) {
      this.loadImpulseResponse(zone.reverb.impulseResponseUrl).catch((err) => {
        logger.warn('SpatialAudioEngine: failed to load impulse response', {
          zoneId: zone.id,
          error: String(err),
        });
      });
    }

    logger.debug('SpatialAudioEngine: zone added', {
      id: zone.id,
      shape: zone.shape,
      volumeMultiplier: zone.volumeMultiplier,
    });
  }

  /**
   * Remove an audio zone.
   */
  removeZone(zoneId: string): void {
    this.zones.delete(zoneId);
    logger.debug('SpatialAudioEngine: zone removed', { zoneId });
  }

  /**
   * Update an existing audio zone.
   */
  updateZone(zoneId: string, updates: Partial<AudioZone>): void {
    const zone = this.zones.get(zoneId);
    if (!zone) return;

    Object.assign(zone, updates);
    logger.debug('SpatialAudioEngine: zone updated', { zoneId });
  }

  /**
   * Get all zones the listener is currently inside.
   * Returns sorted by priority (highest first).
   */
  getActiveZones(): AudioZone[] {
    const active: AudioZone[] = [];

    for (const zone of this.zones.values()) {
      if (this.isPointInZone(this.listenerPosition, zone)) {
        active.push(zone);
      }
    }

    return active.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if a point is inside a zone.
   */
  private isPointInZone(point: Vector3, zone: AudioZone): boolean {
    if (zone.shape === 'spherical' && zone.radius !== undefined) {
      const dist = this.distance(point, zone.center);
      return dist <= zone.radius;
    }

    if (zone.shape === 'rectangular' && zone.halfExtents) {
      const dx = Math.abs(point.x - zone.center.x);
      const dy = Math.abs(point.y - zone.center.y);
      const dz = Math.abs(point.z - zone.center.z);
      return (
        dx <= zone.halfExtents.x &&
        dy <= zone.halfExtents.y &&
        dz <= zone.halfExtents.z
      );
    }

    return false;
  }

  // ============================================================================
  // Wall Occlusion
  // ============================================================================

  /**
   * Set the wall occlusion raycast callback.
   * The callback takes two Vector3 positions (listener, source) and returns
   * an occlusion factor between 0 (no occlusion) and 1 (fully occluded).
   */
  setOcclusionCallback(callback: OcclusionRaycastCallback | null): void {
    this.occlusionCallback = callback;
    logger.debug('SpatialAudioEngine: occlusion callback', {
      set: callback !== null,
    });
  }

  // ============================================================================
  // Per-Frame Update
  // ============================================================================

  /**
   * Call each frame to update spatial audio processing.
   * Applies zone volume multipliers, wall occlusion, and distance attenuation.
   */
  update(): void {
    if (!this.audioContext || !this.isInitialized) return;

    const currentTime = this.audioContext.currentTime;
    const rampTime = currentTime + this.config.gainRampTime;

    // Get active zones for the listener
    const activeZones = this.getActiveZones();
    const zoneMultiplier = this.calculateZoneMultiplier(activeZones);

    // Update each audio source
    for (const source of this.sources.values()) {
      let effectiveGain = source.currentGain;

      // Apply zone volume multiplier
      effectiveGain *= zoneMultiplier;

      // Apply source-specific zone multiplier (based on source position)
      const sourceZones = this.getZonesForPoint(source.position);
      const sourceZoneMultiplier = this.calculateZoneMultiplier(sourceZones);
      effectiveGain *= sourceZoneMultiplier;

      // Apply wall occlusion
      if (this.occlusionCallback) {
        const occlusion = this.occlusionCallback(this.listenerPosition, source.position);
        const clampedOcclusion = Math.max(0, Math.min(1, occlusion));
        source.occlusionFactor = clampedOcclusion;

        // Reduce gain based on occlusion (fully occluded = 10% volume)
        effectiveGain *= 1.0 - clampedOcclusion * 0.9;
      }

      // Apply reverb based on active zone settings
      this.updateSourceReverb(source, activeZones);

      // Apply gain with smooth ramping
      source.gainNode.gain.linearRampToValueAtTime(
        Math.max(0, effectiveGain),
        rampTime
      );
    }
  }

  /**
   * Get zones containing a specific point.
   */
  private getZonesForPoint(point: Vector3): AudioZone[] {
    const result: AudioZone[] = [];
    for (const zone of this.zones.values()) {
      if (this.isPointInZone(point, zone)) {
        result.push(zone);
      }
    }
    return result.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate combined volume multiplier from active zones.
   * Uses highest-priority zone's multiplier.
   */
  private calculateZoneMultiplier(zones: AudioZone[]): number {
    if (zones.length === 0) return 1.0;

    // Use highest priority zone
    return zones[0].volumeMultiplier;
  }

  /**
   * Update reverb for a source based on active zone settings.
   */
  private updateSourceReverb(source: AudioSourceNode, activeZones: AudioZone[]): void {
    if (!this.audioContext) return;

    // Find the highest-priority zone with reverb
    const reverbZone = activeZones.find((z) => z.reverb && z.reverb.mix > 0);

    if (!reverbZone || !reverbZone.reverb) {
      // Remove reverb if no active zone has it
      if (source.convolverNode) {
        this.disconnectReverb(source);
      }
      return;
    }

    const reverb = reverbZone.reverb;
    const impulseUrl = reverb.impulseResponseUrl;

    // Only set up reverb if we have a loaded impulse response
    if (!impulseUrl || !this.impulseResponses.has(impulseUrl)) return;

    const impulseBuffer = this.impulseResponses.get(impulseUrl)!;

    // Create convolver if not exists
    if (!source.convolverNode) {
      this.connectReverb(source, impulseBuffer, reverb);
    } else {
      // Update mix
      const rampTime = this.audioContext.currentTime + this.config.gainRampTime;
      if (source.convolverGainNode) {
        source.convolverGainNode.gain.linearRampToValueAtTime(reverb.mix, rampTime);
      }
      if (source.dryGainNode) {
        source.dryGainNode.gain.linearRampToValueAtTime(1 - reverb.mix, rampTime);
      }
    }
  }

  private connectReverb(source: AudioSourceNode, impulseBuffer: AudioBuffer, reverb: ReverbSettings): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;

    // Create convolver
    const convolverNode = ctx.createConvolver();
    convolverNode.buffer = impulseBuffer;

    // Wet path: gain -> convolver -> destination
    const convolverGainNode = ctx.createGain();
    convolverGainNode.gain.value = reverb.mix;

    // Dry path: gain -> panner -> destination (already connected)
    const dryGainNode = ctx.createGain();
    dryGainNode.gain.value = 1 - reverb.mix;

    // Disconnect existing chain
    source.gainNode.disconnect();

    // Reconnect with wet/dry split
    source.gainNode.connect(dryGainNode);
    dryGainNode.connect(source.pannerNode);

    source.gainNode.connect(convolverGainNode);
    convolverGainNode.connect(convolverNode);
    convolverNode.connect(ctx.destination);

    source.convolverNode = convolverNode;
    source.convolverGainNode = convolverGainNode;
    source.dryGainNode = dryGainNode;
  }

  private disconnectReverb(source: AudioSourceNode): void {
    if (!this.audioContext) return;

    // Disconnect reverb nodes
    if (source.convolverNode) {
      source.convolverNode.disconnect();
      source.convolverNode = undefined;
    }
    if (source.convolverGainNode) {
      source.convolverGainNode.disconnect();
      source.convolverGainNode = undefined;
    }
    if (source.dryGainNode) {
      source.dryGainNode.disconnect();
      source.dryGainNode = undefined;
    }

    // Reconnect direct chain: gain -> panner -> destination
    source.gainNode.disconnect();
    source.gainNode.connect(source.pannerNode);
    source.pannerNode.connect(this.audioContext.destination);
  }

  // ============================================================================
  // Impulse Response Loading
  // ============================================================================

  /**
   * Load an impulse response audio file for convolution reverb.
   */
  async loadImpulseResponse(url: string): Promise<AudioBuffer> {
    if (this.impulseResponses.has(url)) {
      return this.impulseResponses.get(url)!;
    }

    if (!this.audioContext) {
      throw new Error('SpatialAudioEngine: AudioContext not initialized');
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.impulseResponses.set(url, audioBuffer);
    logger.info('SpatialAudioEngine: impulse response loaded', { url });

    return audioBuffer;
  }

  // ============================================================================
  // Utility
  // ============================================================================

  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getListenerPosition(): Vector3 {
    return { ...this.listenerPosition };
  }

  getSourcePosition(participantId: string): Vector3 | null {
    const source = this.sources.get(participantId);
    return source ? { ...source.position } : null;
  }

  getSourceOcclusion(participantId: string): number {
    return this.sources.get(participantId)?.occlusionFactor ?? 0;
  }

  getSources(): string[] {
    return Array.from(this.sources.keys());
  }

  getZones(): AudioZone[] {
    return Array.from(this.zones.values());
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    // Disconnect and remove all sources
    for (const participantId of this.sources.keys()) {
      this.removeSource(participantId);
    }
    this.sources.clear();
    this.zones.clear();
    this.impulseResponses.clear();
    this.occlusionCallback = null;

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.isInitialized = false;
    logger.info('SpatialAudioEngine: destroyed');
  }
}
