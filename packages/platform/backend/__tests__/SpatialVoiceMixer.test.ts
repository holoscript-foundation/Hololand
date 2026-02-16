import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpatialVoiceMixer } from '../src/services/SpatialVoiceMixer';
import type { SpatialVoiceMixerConfig, VoicePosition } from '../src/services/SpatialVoiceMixer';

describe('SpatialVoiceMixer', () => {
  let mixer: SpatialVoiceMixer;

  beforeEach(() => {
    mixer = new SpatialVoiceMixer();
  });

  afterEach(() => {
    mixer.destroy();
  });

  // ============================================================================
  // Construction
  // ============================================================================

  describe('construction', () => {
    it('creates with default config', () => {
      const stats = mixer.getStats();
      expect(stats.peers).toBe(0);
      expect(stats.zones).toBe(0);
      expect(stats.maxDistance).toBe(50);
      expect(stats.rolloff).toBe('inverse');
    });

    it('creates with custom config', () => {
      const custom = new SpatialVoiceMixer({
        maxDistance: 100,
        refDistance: 2,
        rolloff: 'linear',
        rolloffFactor: 0.5,
        minGain: 0.05,
      });
      const stats = custom.getStats();
      expect(stats.maxDistance).toBe(100);
      expect(stats.rolloff).toBe('linear');
      custom.destroy();
    });

    it('throws on invalid maxDistance', () => {
      expect(() => new SpatialVoiceMixer({ maxDistance: 0 })).toThrow('maxDistance must be positive');
      expect(() => new SpatialVoiceMixer({ maxDistance: -1 })).toThrow('maxDistance must be positive');
    });

    it('throws on invalid refDistance', () => {
      expect(() => new SpatialVoiceMixer({ refDistance: -1 })).toThrow('refDistance must be non-negative');
    });

    it('throws on invalid rolloffFactor', () => {
      expect(() => new SpatialVoiceMixer({ rolloffFactor: -1 })).toThrow('rolloffFactor must be non-negative');
    });

    it('allows zero refDistance', () => {
      const m = new SpatialVoiceMixer({ refDistance: 0 });
      expect(m.getStats().peers).toBe(0);
      m.destroy();
    });
  });

  // ============================================================================
  // Peer Management
  // ============================================================================

  describe('peer management', () => {
    it('adds a peer', () => {
      mixer.addPeer('p1');
      expect(mixer.hasPeer('p1')).toBe(true);
      expect(mixer.getPeers()).toEqual(['p1']);
    });

    it('adds multiple peers', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.addPeer('p3');
      expect(mixer.getPeers()).toHaveLength(3);
      expect(mixer.getStats().peers).toBe(3);
    });

    it('ignores duplicate addPeer calls', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p1');
      expect(mixer.getPeers()).toHaveLength(1);
    });

    it('removes a peer', () => {
      mixer.addPeer('p1');
      mixer.removePeer('p1');
      expect(mixer.hasPeer('p1')).toBe(false);
      expect(mixer.getPeers()).toHaveLength(0);
    });

    it('removes non-existent peer without error', () => {
      expect(() => mixer.removePeer('nobody')).not.toThrow();
    });

    it('peers start at origin', () => {
      mixer.addPeer('p1');
      const pos = mixer.getPosition('p1');
      expect(pos).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('returns undefined position for unknown peer', () => {
      expect(mixer.getPosition('nobody')).toBeUndefined();
    });
  });

  // ============================================================================
  // Position Updates
  // ============================================================================

  describe('position updates', () => {
    it('updates a peer position', () => {
      mixer.addPeer('p1');
      mixer.updatePosition('p1', { x: 5, y: 1.6, z: 3 });
      const pos = mixer.getPosition('p1');
      expect(pos).toEqual({ x: 5, y: 1.6, z: 3 });
    });

    it('returns a copy of position (not reference)', () => {
      mixer.addPeer('p1');
      mixer.updatePosition('p1', { x: 1, y: 2, z: 3 });
      const pos = mixer.getPosition('p1');
      pos!.x = 999;
      expect(mixer.getPosition('p1')!.x).toBe(1);
    });

    it('ignores updates for unknown peers', () => {
      mixer.updatePosition('nobody', { x: 1, y: 2, z: 3 });
      expect(mixer.getPosition('nobody')).toBeUndefined();
    });

    it('updates orientation', () => {
      mixer.addPeer('p1');
      mixer.updateOrientation('p1', { yaw: Math.PI / 2 });
      // orientation affects panning — verify via calculateGains
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 5, y: 0, z: 0 }); // to the right in world space
      const gains = mixer.calculateGains('p1');
      expect(gains).toHaveLength(1);
      // With yaw=PI/2 (facing +X), speaker at +X should be in front (~0 pan)
    });
  });

  // ============================================================================
  // Distance Calculation
  // ============================================================================

  describe('distance calculation', () => {
    it('calculates distance between two peers', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p1', { x: 0, y: 0, z: 0 });
      mixer.updatePosition('p2', { x: 3, y: 4, z: 0 });
      expect(mixer.getDistance('p1', 'p2')).toBe(5);
    });

    it('returns Infinity for unknown peer', () => {
      mixer.addPeer('p1');
      expect(mixer.getDistance('p1', 'nobody')).toBe(Infinity);
    });

    it('returns 0 for same position', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      expect(mixer.getDistance('p1', 'p2')).toBe(0);
    });

    it('isInRange checks maxDistance', () => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 10 });
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 5, y: 0, z: 0 });
      expect(mixer.isInRange('p1', 'p2')).toBe(true);

      mixer.updatePosition('p2', { x: 15, y: 0, z: 0 });
      expect(mixer.isInRange('p1', 'p2')).toBe(false);
    });

    it('isInRange returns false for unknown peers', () => {
      expect(mixer.isInRange('a', 'b')).toBe(false);
    });
  });

  // ============================================================================
  // Gain Calculation — Inverse Rolloff (default)
  // ============================================================================

  describe('gain calculation — inverse rolloff', () => {
    beforeEach(() => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 50, refDistance: 1, rolloff: 'inverse', rolloffFactor: 1 });
    });

    it('returns empty array for unknown listener', () => {
      expect(mixer.calculateGains('nobody')).toEqual([]);
    });

    it('excludes self from gains', () => {
      mixer.addPeer('p1');
      const gains = mixer.calculateGains('p1');
      expect(gains.find(g => g.peerId === 'p1')).toBeUndefined();
    });

    it('full gain within refDistance', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 0.5, y: 0, z: 0 }); // distance=0.5 < refDistance=1
      const gains = mixer.calculateGains('p1');
      expect(gains).toHaveLength(1);
      expect(gains[0].gain).toBe(1);
      expect(gains[0].distance).toBeCloseTo(0.5);
    });

    it('attenuates with distance (inverse model)', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 10, y: 0, z: 0 }); // distance=10
      const gains = mixer.calculateGains('p1');
      // inverse: refDistance / (refDistance + rolloffFactor * (distance - refDistance))
      // = 1 / (1 + 1 * 9) = 0.1
      expect(gains).toHaveLength(1);
      expect(gains[0].gain).toBeCloseTo(0.1);
    });

    it('returns 0 gain at maxDistance (filtered out)', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 50, y: 0, z: 0 }); // at maxDistance
      const gains = mixer.calculateGains('p1');
      // at exactly maxDistance, gain = 0 → filtered
      expect(gains).toHaveLength(0);
    });

    it('filters peers beyond maxDistance', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 60, y: 0, z: 0 }); // beyond maxDistance
      expect(mixer.calculateGains('p1')).toEqual([]);
    });

    it('filters gains below minGain', () => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 50, refDistance: 1, rolloff: 'inverse', minGain: 0.15 });
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 10, y: 0, z: 0 }); // gain = 0.1 < minGain
      expect(mixer.calculateGains('p1')).toEqual([]);
    });

    it('returns gains for multiple peers', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.addPeer('p3');
      mixer.updatePosition('p2', { x: 2, y: 0, z: 0 });
      mixer.updatePosition('p3', { x: 0, y: 0, z: 5 });
      const gains = mixer.calculateGains('p1');
      expect(gains).toHaveLength(2);
      expect(gains.map(g => g.peerId).sort()).toEqual(['p2', 'p3']);
    });

    it('provides correct distance in result', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 3, y: 4, z: 0 });
      const gains = mixer.calculateGains('p1');
      expect(gains[0].distance).toBeCloseTo(5);
    });
  });

  // ============================================================================
  // Gain Calculation — Linear Rolloff
  // ============================================================================

  describe('gain calculation — linear rolloff', () => {
    beforeEach(() => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 100, refDistance: 1, rolloff: 'linear', rolloffFactor: 1 });
    });

    it('attenuates linearly', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 50.5, y: 0, z: 0 }); // halfway
      const gains = mixer.calculateGains('p1');
      // linear: 1 - rolloffFactor * ((distance - refDistance) / (maxDistance - refDistance))
      // = 1 - 1 * (49.5 / 99) = 0.5
      expect(gains[0].gain).toBeCloseTo(0.5);
    });

    it('full gain at refDistance', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 0.5, y: 0, z: 0 });
      const gains = mixer.calculateGains('p1');
      expect(gains[0].gain).toBe(1);
    });
  });

  // ============================================================================
  // Gain Calculation — Exponential Rolloff
  // ============================================================================

  describe('gain calculation — exponential rolloff', () => {
    beforeEach(() => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 100, refDistance: 1, rolloff: 'exponential', rolloffFactor: 2 });
    });

    it('attenuates exponentially', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 4, y: 0, z: 0 });
      const gains = mixer.calculateGains('p1');
      // exponential: (distance / refDistance) ^ -rolloffFactor = (4/1)^-2 = 1/16
      expect(gains[0].gain).toBeCloseTo(1 / 16);
    });
  });

  // ============================================================================
  // Panning
  // ============================================================================

  describe('panning', () => {
    it('speaker directly ahead has pan ~0', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      // Listener at origin, facing +Z (yaw=0). Speaker at (0, 0, 5) — directly ahead
      mixer.updatePosition('p2', { x: 0, y: 0, z: 5 });
      const gains = mixer.calculateGains('p1');
      expect(gains[0].pan).toBeCloseTo(0, 1);
    });

    it('speaker to the right has positive pan', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 5, y: 0, z: 0 }); // to the right
      const gains = mixer.calculateGains('p1');
      expect(gains[0].pan).toBeGreaterThan(0);
    });

    it('speaker to the left has negative pan', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: -5, y: 0, z: 0 }); // to the left
      const gains = mixer.calculateGains('p1');
      expect(gains[0].pan).toBeLessThan(0);
    });

    it('orientation affects panning', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 5, y: 0, z: 0 }); // +X direction

      // Facing default (+Z), speaker at +X is to the right
      const gains1 = mixer.calculateGains('p1');
      expect(gains1[0].pan).toBeGreaterThan(0);

      // Turn to face +X (yaw = PI/2), speaker is now ahead
      mixer.updateOrientation('p1', { yaw: Math.PI / 2 });
      const gains2 = mixer.calculateGains('p1');
      expect(Math.abs(gains2[0].pan)).toBeLessThan(0.1);
    });

    it('speaker directly behind has pan ~0', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 0, y: 0, z: -5 }); // behind (facing +Z)
      const gains = mixer.calculateGains('p1');
      expect(Math.abs(gains[0].pan)).toBeLessThan(0.01);
    });
  });

  // ============================================================================
  // Voice Zones
  // ============================================================================

  describe('voice zones', () => {
    it('creates a zone', () => {
      const zone = mixer.addZone({
        name: 'Room A',
        center: { x: 0, y: 0, z: 0 },
        radius: 10,
        gainMultiplier: 1,
        isolated: false,
      });
      expect(zone.id).toBeTruthy();
      expect(zone.name).toBe('Room A');
      expect(mixer.getZones()).toHaveLength(1);
    });

    it('removes a zone', () => {
      const zone = mixer.addZone({
        name: 'Room A',
        center: { x: 0, y: 0, z: 0 },
        radius: 10,
        gainMultiplier: 1,
        isolated: false,
      });
      expect(mixer.removeZone(zone.id)).toBe(true);
      expect(mixer.getZones()).toHaveLength(0);
    });

    it('returns false for unknown zone removal', () => {
      expect(mixer.removeZone('unknown')).toBe(false);
    });

    it('identifies which zone a position is in', () => {
      const zone = mixer.addZone({
        name: 'Room A',
        center: { x: 10, y: 0, z: 10 },
        radius: 5,
        gainMultiplier: 1,
        isolated: false,
      });

      // Inside
      expect(mixer.getZoneForPosition({ x: 10, y: 0, z: 10 })).toBeTruthy();
      expect(mixer.getZoneForPosition({ x: 12, y: 0, z: 10 })?.id).toBe(zone.id);

      // Outside
      expect(mixer.getZoneForPosition({ x: 20, y: 0, z: 20 })).toBeNull();
    });

    it('getZoneForPeer works', () => {
      const zone = mixer.addZone({
        name: 'Room',
        center: { x: 0, y: 0, z: 0 },
        radius: 10,
        gainMultiplier: 1,
        isolated: false,
      });
      mixer.addPeer('p1');
      mixer.updatePosition('p1', { x: 5, y: 0, z: 0 });
      expect(mixer.getZoneForPeer('p1')?.id).toBe(zone.id);

      mixer.updatePosition('p1', { x: 20, y: 0, z: 0 });
      expect(mixer.getZoneForPeer('p1')).toBeNull();
    });

    it('returns null zone for unknown peer', () => {
      expect(mixer.getZoneForPeer('nobody')).toBeNull();
    });

    it('isolated zones block sound from outside', () => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 100 });

      mixer.addZone({
        name: 'Private Room',
        center: { x: 0, y: 0, z: 0 },
        radius: 10,
        gainMultiplier: 1,
        isolated: true,
      });

      mixer.addPeer('inside');
      mixer.updatePosition('inside', { x: 0, y: 0, z: 0 }); // inside zone
      mixer.addPeer('outside');
      mixer.updatePosition('outside', { x: 5, y: 0, z: 0 }); // also inside zone (within radius)

      // Both inside → can hear each other
      const gainsInside = mixer.calculateGains('inside');
      expect(gainsInside).toHaveLength(1);

      // Move outside → can't hear
      mixer.updatePosition('outside', { x: 15, y: 0, z: 0 }); // outside zone
      const gainsIsolated = mixer.calculateGains('inside');
      expect(gainsIsolated).toHaveLength(0);
    });

    it('isolated zone blocks sound from inside to outside', () => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 100 });

      mixer.addZone({
        name: 'Private Room',
        center: { x: 0, y: 0, z: 0 },
        radius: 10,
        gainMultiplier: 1,
        isolated: true,
      });

      mixer.addPeer('inside');
      mixer.updatePosition('inside', { x: 5, y: 0, z: 0 }); // inside zone
      mixer.addPeer('outside');
      mixer.updatePosition('outside', { x: 15, y: 0, z: 0 }); // outside zone

      // Outside listener can't hear inside speaker
      const gainsOutside = mixer.calculateGains('outside');
      expect(gainsOutside).toHaveLength(0);
    });

    it('gainMultiplier amplifies volume in zone', () => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 100, refDistance: 1, rolloff: 'inverse' });

      mixer.addZone({
        name: 'Loud Zone',
        center: { x: 0, y: 0, z: 0 },
        radius: 20,
        gainMultiplier: 1.5,
        isolated: false,
      });

      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 5, y: 0, z: 0 });

      const gains = mixer.calculateGains('p1');
      // Without zone: gain ≈ 1/(1+4) = 0.2
      // With 1.5x multiplier (listener in zone): 0.2 * 1.5 = 0.3, clamped to 1 max
      expect(gains[0].gain).toBeGreaterThan(0.2);
    });
  });

  // ============================================================================
  // Stats
  // ============================================================================

  describe('stats', () => {
    it('reports peer count', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      expect(mixer.getStats().peers).toBe(2);
    });

    it('reports zone count', () => {
      mixer.addZone({ name: 'A', center: { x: 0, y: 0, z: 0 }, radius: 5, gainMultiplier: 1, isolated: false });
      mixer.addZone({ name: 'B', center: { x: 10, y: 0, z: 0 }, radius: 5, gainMultiplier: 1, isolated: false });
      expect(mixer.getStats().zones).toBe(2);
    });
  });

  // ============================================================================
  // Destroy
  // ============================================================================

  describe('destroy', () => {
    it('clears all state', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.addZone({ name: 'Z', center: { x: 0, y: 0, z: 0 }, radius: 5, gainMultiplier: 1, isolated: false });

      mixer.destroy();

      expect(mixer.getPeers()).toHaveLength(0);
      expect(mixer.getZones()).toHaveLength(0);
      expect(mixer.getStats().peers).toBe(0);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles 3D distance correctly', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 1, y: 2, z: 2 });
      // sqrt(1 + 4 + 4) = 3
      expect(mixer.getDistance('p1', 'p2')).toBeCloseTo(3);
    });

    it('handles rolloffFactor of 0 (no attenuation)', () => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 50, rolloffFactor: 0 });
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 30, y: 0, z: 0 });
      const gains = mixer.calculateGains('p1');
      expect(gains[0].gain).toBe(1);
    });

    it('handles negative coordinates', () => {
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p1', { x: -5, y: -3, z: -2 });
      mixer.updatePosition('p2', { x: -8, y: -7, z: -14 });
      const distance = mixer.getDistance('p1', 'p2');
      expect(distance).toBeGreaterThan(0);
      const gains = mixer.calculateGains('p1');
      expect(gains.length).toBe(1);
    });

    it('peer at exactly refDistance gets gain of 1', () => {
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ refDistance: 5 });
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 5, y: 0, z: 0 }); // exactly at refDistance
      const gains = mixer.calculateGains('p1');
      expect(gains[0].gain).toBe(1);
    });

    it('gain clamped to max 1', () => {
      // With zone multiplier > 1 and close distance = gain > 1, should be clamped
      mixer.destroy();
      mixer = new SpatialVoiceMixer({ maxDistance: 100 });
      mixer.addZone({ name: 'Loud', center: { x: 0, y: 0, z: 0 }, radius: 50, gainMultiplier: 2, isolated: false });
      mixer.addPeer('p1');
      mixer.addPeer('p2');
      mixer.updatePosition('p2', { x: 0.1, y: 0, z: 0 }); // very close
      const gains = mixer.calculateGains('p1');
      expect(gains[0].gain).toBeLessThanOrEqual(1);
    });
  });
});
