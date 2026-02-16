/**
 * @hololand/backend — SpatialVoiceMixer
 *
 * Computes 3D spatial audio parameters for voice chat.
 * Given peer positions, calculates per-listener gain, stereo pan,
 * and distance for each speaker. Used by VoiceChannel to produce
 * spatial voice routing hints that clients apply to their local
 * WebRTC audio streams.
 *
 * Features:
 *   - Distance-based attenuation (inverse, linear, exponential)
 *   - 3D stereo panning (simplified left/right based on relative angle)
 *   - Configurable max distance / rolloff
 *   - Voice zones (named regions with different attenuation rules)
 *   - Per-peer position tracking
 *
 * Audio model is intentionally simple — the heavy lifting happens
 * client-side via Web Audio API / Resonance Audio / Steam Audio.
 * This module provides the SERVER-SIDE parameters so the server
 * can make routing decisions (don't relay to out-of-range peers).
 *
 * Usage:
 *   const mixer = new SpatialVoiceMixer({ maxDistance: 50, rolloff: 'inverse' });
 *   mixer.addPeer('p1');
 *   mixer.updatePosition('p1', { x: 0, y: 1.6, z: 0 });
 *   mixer.addPeer('p2');
 *   mixer.updatePosition('p2', { x: 5, y: 1.6, z: 3 });
 *   const gains = mixer.calculateGains('p1');
 *   // → [{ peerId: 'p2', gain: 0.72, pan: 0.45, distance: 5.83 }]
 */

// ============================================================================
// Types
// ============================================================================

/** 3D position. */
export interface VoicePosition {
  x: number;
  y: number;
  z: number;
}

/** Listener orientation (for panning). Simplified: just a yaw angle. */
export interface VoiceOrientation {
  /** Yaw in radians (0 = +Z forward, π/2 = +X right). */
  yaw: number;
}

/** Computed gain for one speaker from a listener's perspective. */
export interface VoiceGain {
  /** Speaker's peer ID. */
  peerId: string;
  /** Volume gain (0-1). 0 = inaudible. */
  gain: number;
  /** Stereo pan (-1 = full left, 0 = center, 1 = full right). */
  pan: number;
  /** Distance in world units from the listener. */
  distance: number;
}

/** Attenuation model. */
export type RolloffModel = 'linear' | 'inverse' | 'exponential';

/** Voice zone — a named region with custom audio rules. */
export interface VoiceZone {
  /** Unique zone ID. */
  id: string;
  /** Zone name. */
  name: string;
  /** Center position. */
  center: VoicePosition;
  /** Radius of the zone. */
  radius: number;
  /** Gain multiplier inside the zone (0-2). Default: 1 */
  gainMultiplier: number;
  /** Whether zone blocks sound from outside. Default: false */
  isolated: boolean;
}

/** Service configuration. */
export interface SpatialVoiceMixerConfig {
  /** Maximum audible distance. Default: 50 */
  maxDistance?: number;
  /** Minimum distance (no attenuation within this range). Default: 1 */
  refDistance?: number;
  /** Attenuation model. Default: 'inverse' */
  rolloff?: RolloffModel;
  /** Rolloff factor (higher = faster attenuation). Default: 1 */
  rolloffFactor?: number;
  /** Minimum gain before cutting off entirely. Default: 0.01 */
  minGain?: number;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CONFIG: Required<SpatialVoiceMixerConfig> = {
  maxDistance: 50,
  refDistance: 1,
  rolloff: 'inverse',
  rolloffFactor: 1,
  minGain: 0.01,
};

// ============================================================================
// SpatialVoiceMixer
// ============================================================================

export class SpatialVoiceMixer {
  private config: Required<SpatialVoiceMixerConfig>;

  /** Peer positions: peerId → VoicePosition. */
  private positions: Map<string, VoicePosition> = new Map();

  /** Peer orientations: peerId → VoiceOrientation. */
  private orientations: Map<string, VoiceOrientation> = new Map();

  /** Voice zones. */
  private zones: Map<string, VoiceZone> = new Map();

  /** Next zone ID. */
  private nextZoneId = 1;

  constructor(config: SpatialVoiceMixerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.maxDistance <= 0) {
      throw new Error('maxDistance must be positive');
    }
    if (this.config.refDistance < 0) {
      throw new Error('refDistance must be non-negative');
    }
    if (this.config.rolloffFactor < 0) {
      throw new Error('rolloffFactor must be non-negative');
    }
  }

  // ============================================================================
  // Peer Management
  // ============================================================================

  /** Register a peer for spatial tracking. */
  addPeer(peerId: string): void {
    if (!this.positions.has(peerId)) {
      this.positions.set(peerId, { x: 0, y: 0, z: 0 });
      this.orientations.set(peerId, { yaw: 0 });
    }
  }

  /** Remove a peer from spatial tracking. */
  removePeer(peerId: string): void {
    this.positions.delete(peerId);
    this.orientations.delete(peerId);
  }

  /** Check if a peer is tracked. */
  hasPeer(peerId: string): boolean {
    return this.positions.has(peerId);
  }

  /** Get all tracked peer IDs. */
  getPeers(): string[] {
    return Array.from(this.positions.keys());
  }

  /** Update a peer's position. */
  updatePosition(peerId: string, position: VoicePosition): void {
    const existing = this.positions.get(peerId);
    if (existing) {
      existing.x = position.x;
      existing.y = position.y;
      existing.z = position.z;
    }
  }

  /** Update a peer's orientation (for panning). */
  updateOrientation(peerId: string, orientation: VoiceOrientation): void {
    const existing = this.orientations.get(peerId);
    if (existing) {
      existing.yaw = orientation.yaw;
    }
  }

  /** Get a peer's current position. */
  getPosition(peerId: string): VoicePosition | undefined {
    const pos = this.positions.get(peerId);
    return pos ? { ...pos } : undefined;
  }

  // ============================================================================
  // Gain Calculation
  // ============================================================================

  /**
   * Calculate voice gains from the listener's perspective.
   * Returns an array of VoiceGain, one per other peer (excluding those
   * beyond maxDistance or below minGain).
   */
  calculateGains(listenerId: string): VoiceGain[] {
    const listenerPos = this.positions.get(listenerId);
    if (!listenerPos) return [];

    const listenerOri = this.orientations.get(listenerId) ?? { yaw: 0 };
    const listenerZone = this.getZoneForPosition(listenerPos);

    const gains: VoiceGain[] = [];

    for (const [peerId, speakerPos] of this.positions) {
      if (peerId === listenerId) continue;

      const distance = this.distance3D(listenerPos, speakerPos);

      // Beyond max distance → skip
      if (distance > this.config.maxDistance) continue;

      // Zone isolation check
      const speakerZone = this.getZoneForPosition(speakerPos);
      if (listenerZone?.isolated && speakerZone?.id !== listenerZone.id) continue;
      if (speakerZone?.isolated && listenerZone?.id !== speakerZone.id) continue;

      // Calculate raw gain from distance
      let gain = this.calculateAttenuation(distance);

      // Apply zone gain multipliers
      if (listenerZone) gain *= listenerZone.gainMultiplier;
      if (speakerZone && speakerZone.id !== listenerZone?.id) {
        gain *= speakerZone.gainMultiplier;
      }

      // Clamp
      gain = Math.min(1, Math.max(0, gain));

      // Below minimum threshold → skip
      if (gain < this.config.minGain) continue;

      // Calculate stereo pan
      const pan = this.calculatePan(listenerPos, listenerOri, speakerPos);

      gains.push({ peerId, gain, pan, distance });
    }

    return gains;
  }

  /**
   * Get the distance between two peers.
   * Returns Infinity if either peer is not tracked.
   */
  getDistance(peerId1: string, peerId2: string): number {
    const p1 = this.positions.get(peerId1);
    const p2 = this.positions.get(peerId2);
    if (!p1 || !p2) return Infinity;
    return this.distance3D(p1, p2);
  }

  /**
   * Check if two peers are within hearing range.
   */
  isInRange(peerId1: string, peerId2: string): boolean {
    return this.getDistance(peerId1, peerId2) <= this.config.maxDistance;
  }

  // ============================================================================
  // Voice Zones
  // ============================================================================

  /** Create a voice zone. */
  addZone(options: Omit<VoiceZone, 'id'>): VoiceZone {
    const id = `vz_${(this.nextZoneId++).toString(36)}`;
    const zone: VoiceZone = {
      id,
      name: options.name,
      center: { ...options.center },
      radius: options.radius,
      gainMultiplier: options.gainMultiplier ?? 1,
      isolated: options.isolated ?? false,
    };
    this.zones.set(id, zone);
    return zone;
  }

  /** Remove a voice zone. */
  removeZone(zoneId: string): boolean {
    return this.zones.delete(zoneId);
  }

  /** Get all voice zones. */
  getZones(): VoiceZone[] {
    return Array.from(this.zones.values());
  }

  /** Get the zone a position is in (first matching). */
  getZoneForPosition(position: VoicePosition): VoiceZone | null {
    for (const zone of this.zones.values()) {
      const dist = this.distance3D(position, zone.center);
      if (dist <= zone.radius) return zone;
    }
    return null;
  }

  /** Get the zone a peer is in. */
  getZoneForPeer(peerId: string): VoiceZone | null {
    const pos = this.positions.get(peerId);
    if (!pos) return null;
    return this.getZoneForPosition(pos);
  }

  // ============================================================================
  // Stats
  // ============================================================================

  /** Get mixer stats. */
  getStats(): {
    peers: number;
    zones: number;
    maxDistance: number;
    rolloff: RolloffModel;
  } {
    return {
      peers: this.positions.size,
      zones: this.zones.size,
      maxDistance: this.config.maxDistance,
      rolloff: this.config.rolloff,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Clean up all state. */
  destroy(): void {
    this.positions.clear();
    this.orientations.clear();
    this.zones.clear();
  }

  // ============================================================================
  // Internal Calculations
  // ============================================================================

  /** 3D Euclidean distance. */
  private distance3D(a: VoicePosition, b: VoicePosition): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /** Calculate gain based on distance and attenuation model. */
  private calculateAttenuation(distance: number): number {
    const { refDistance, maxDistance, rolloff, rolloffFactor } = this.config;

    // Within reference distance → full volume
    if (distance <= refDistance) return 1;

    // Beyond max distance → silence
    if (distance >= maxDistance) return 0;

    switch (rolloff) {
      case 'linear': {
        return 1 - rolloffFactor * ((distance - refDistance) / (maxDistance - refDistance));
      }
      case 'inverse': {
        return refDistance / (refDistance + rolloffFactor * (distance - refDistance));
      }
      case 'exponential': {
        return Math.pow(distance / refDistance, -rolloffFactor);
      }
      default:
        return 1;
    }
  }

  /**
   * Calculate stereo pan (-1 to 1) based on listener position/orientation
   * and speaker position. Uses a simplified 2D angle in the XZ plane.
   */
  private calculatePan(
    listenerPos: VoicePosition,
    listenerOri: VoiceOrientation,
    speakerPos: VoicePosition
  ): number {
    const dx = speakerPos.x - listenerPos.x;
    const dz = speakerPos.z - listenerPos.z;

    // Angle from listener to speaker in world space
    const angleToSpeaker = Math.atan2(dx, dz);

    // Relative angle (subtract listener's yaw)
    const relativeAngle = angleToSpeaker - listenerOri.yaw;

    // Pan = sin of relative angle (left=-1, right=+1)
    return Math.sin(relativeAngle);
  }
}
