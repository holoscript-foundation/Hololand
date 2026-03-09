/**
 * @vitest-environment jsdom
 */

/**
 * Tests for CulturalZoneManager
 *
 * Validates the Axelrod-style cultural zone system:
 * - Cultural vector similarity computation (Axelrod overlap coefficient)
 * - Zone CRUD (create, read, update, dissolve)
 * - Zone containment via spatial hash (AABB point-in-box)
 * - Graduated interaction bandwidth at boundaries
 * - Bridge agent deployment and recall lifecycle
 * - Critical mass override detection
 * - Zone permeability metrics aggregation
 * - Integration points with BehavioralTrustScoring
 * - Event system
 * - Render-loop safe queries (O(1))
 * - Management cycle
 * - Metrics reporting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  CulturalZoneManager,
  createCulturalZoneManager,
} from '../CulturalZoneManager';

import {
  computeCulturalSimilarity,
  similarityToBandwidth,
  bandwidthToMultiplier,
  createDefaultCulturalVector,
  createDefaultZoneNorms,
  createDefaultZoneGeometry,
  createEmptyCulturalZoneWorldState,
  makeBoundaryKey,
  parseBoundaryKey,
  type CulturalVector,
  type CulturalZoneManagerConfig,
  type InteractionBandwidthLevel,
  type ZoneId,
} from '../CulturalZoneTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestManager(
  overrides?: Partial<CulturalZoneManagerConfig>,
): CulturalZoneManager {
  return new CulturalZoneManager({
    localAgentId: 'test-server',
    worldId: 'test-world',
    managementHz: 2,
    ...overrides,
  });
}

function createVectorWithValues(
  values: Record<string, string>,
): CulturalVector {
  const vector = createDefaultCulturalVector();
  for (const [featureId, value] of Object.entries(values)) {
    if (vector.features[featureId]) {
      vector.features[featureId].value = value;
    }
  }
  return vector;
}

/**
 * Force a management cycle to run (for testing without timers).
 * We access private managementCycle via type cast.
 */
function forceManagementCycle(manager: CulturalZoneManager): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (manager as any).managementCycle();
}

// =============================================================================
// CULTURAL VECTOR & SIMILARITY
// =============================================================================

describe('Cultural Vector & Similarity', () => {
  it('should compute similarity of 1.0 for identical vectors', () => {
    const a = createDefaultCulturalVector();
    const b = createDefaultCulturalVector();
    expect(computeCulturalSimilarity(a, b)).toBe(1.0);
  });

  it('should compute similarity of 0.0 for completely different vectors', () => {
    const a = createVectorWithValues({
      communication_style: 'formal',
      trust_protocol: 'strict',
      interaction_tempo: 'rapid',
      spatial_density: 'dense',
      functional_focus: 'building',
      noise_tolerance: 'silent',
      hierarchy_model: 'autocratic',
      content_openness: 'closed',
    });
    const b = createVectorWithValues({
      communication_style: 'casual',
      trust_protocol: 'open',
      interaction_tempo: 'contemplative',
      spatial_density: 'isolated',
      functional_focus: 'recreation',
      noise_tolerance: 'chaotic',
      hierarchy_model: 'flat',
      content_openness: 'unrestricted',
    });
    expect(computeCulturalSimilarity(a, b)).toBe(0.0);
  });

  it('should compute partial similarity for vectors with some shared features', () => {
    const a = createDefaultCulturalVector();
    const b = createDefaultCulturalVector();
    // Change 2 out of 8 features
    b.features['communication_style'].value = 'formal';
    b.features['noise_tolerance'].value = 'chaotic';

    const similarity = computeCulturalSimilarity(a, b);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it('should weight features according to their weight property', () => {
    const a = createDefaultCulturalVector();
    const b = createDefaultCulturalVector();

    // trust_protocol has weight 1.5, noise_tolerance has weight 0.7
    // Changing the high-weight feature should decrease similarity more
    const bLowWeight = createDefaultCulturalVector();
    bLowWeight.features['noise_tolerance'].value = 'chaotic'; // weight 0.7

    const bHighWeight = createDefaultCulturalVector();
    bHighWeight.features['trust_protocol'].value = 'strict'; // weight 1.5

    const simLow = computeCulturalSimilarity(a, bLowWeight);
    const simHigh = computeCulturalSimilarity(a, bHighWeight);

    // Changing the higher-weight feature should reduce similarity more
    expect(simHigh).toBeLessThan(simLow);
  });

  it('should handle vectors with different feature sets', () => {
    const a = createDefaultCulturalVector();
    const b = createDefaultCulturalVector();
    // Add an extra feature to b that a doesn't have
    b.features['custom_feature'] = {
      id: 'custom_feature',
      label: 'Custom',
      description: 'A custom feature',
      possibleValues: ['alpha', 'beta'],
      value: 'alpha',
      weight: 1.0,
    };

    const sim = computeCulturalSimilarity(a, b);
    // a doesn't have 'custom_feature', so it counts as a mismatch
    expect(sim).toBeLessThan(1.0);
    expect(sim).toBeGreaterThan(0);
  });
});

// =============================================================================
// BANDWIDTH MAPPING
// =============================================================================

describe('Bandwidth Mapping', () => {
  it('should map similarity to correct bandwidth levels', () => {
    expect(similarityToBandwidth(1.0)).toBe('full');
    expect(similarityToBandwidth(0.95)).toBe('full');
    expect(similarityToBandwidth(0.9)).toBe('full');
    expect(similarityToBandwidth(0.85)).toBe('high');
    expect(similarityToBandwidth(0.75)).toBe('high');
    expect(similarityToBandwidth(0.6)).toBe('moderate');
    expect(similarityToBandwidth(0.5)).toBe('moderate');
    expect(similarityToBandwidth(0.3)).toBe('limited');
    expect(similarityToBandwidth(0.25)).toBe('limited');
    expect(similarityToBandwidth(0.1)).toBe('minimal');
    expect(similarityToBandwidth(0.0)).toBe('blocked');
  });

  it('should respect custom thresholds', () => {
    const custom = { full: 0.8, high: 0.6, moderate: 0.4, limited: 0.2, minimal: 0.0 };
    expect(similarityToBandwidth(0.85, custom)).toBe('full');
    expect(similarityToBandwidth(0.7, custom)).toBe('high');
    expect(similarityToBandwidth(0.5, custom)).toBe('moderate');
    expect(similarityToBandwidth(0.3, custom)).toBe('limited');
    expect(similarityToBandwidth(0.1, custom)).toBe('minimal');
    expect(similarityToBandwidth(0.0, custom)).toBe('blocked');
  });

  it('should convert bandwidth to numeric multiplier', () => {
    expect(bandwidthToMultiplier('full')).toBe(1.0);
    expect(bandwidthToMultiplier('high')).toBe(0.75);
    expect(bandwidthToMultiplier('moderate')).toBe(0.5);
    expect(bandwidthToMultiplier('limited')).toBe(0.25);
    expect(bandwidthToMultiplier('minimal')).toBe(0.1);
    expect(bandwidthToMultiplier('blocked')).toBe(0.0);
  });
});

// =============================================================================
// BOUNDARY KEY UTILITIES
// =============================================================================

describe('Boundary Key Utilities', () => {
  it('should create order-independent boundary keys', () => {
    const key1 = makeBoundaryKey('zone-a', 'zone-b');
    const key2 = makeBoundaryKey('zone-b', 'zone-a');
    expect(key1).toBe(key2);
  });

  it('should parse boundary keys back into zone IDs', () => {
    const key = makeBoundaryKey('zone-a', 'zone-b');
    const parsed = parseBoundaryKey(key);
    expect(parsed.zoneAId).toBe('zone-a');
    expect(parsed.zoneBId).toBe('zone-b');
  });

  it('should throw on invalid boundary key', () => {
    expect(() => parseBoundaryKey('invalid-key')).toThrow();
  });
});

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

describe('Factory Functions', () => {
  it('should create empty world state', () => {
    const state = createEmptyCulturalZoneWorldState();
    expect(state.zones).toEqual({});
    expect(state.boundaries).toEqual({});
    expect(state.bridgeAgents).toEqual({});
    expect(state.criticalMassStates).toEqual([]);
    expect(state.sequence).toBe(0);
  });

  it('should create default cultural vector with 8 features', () => {
    const vector = createDefaultCulturalVector();
    expect(Object.keys(vector.features)).toHaveLength(8);
    expect(vector.version).toBe(1);
  });

  it('should create default zone norms', () => {
    const norms = createDefaultZoneNorms();
    expect(norms.minTrustScore).toBe(0.3);
    expect(norms.maxOccupancy).toBe(50);
    expect(norms.personalSpaceRadius).toBe(1.0);
  });

  it('should create default zone geometry', () => {
    const center = { x: 10, y: 0, z: 20 };
    const geom = createDefaultZoneGeometry(center);
    expect(geom.center).toEqual(center);
    expect(geom.halfExtents).toEqual({ x: 10, y: 5, z: 10 });
    expect(geom.floorArea).toBe(400); // 20 * 20
    expect(geom.volume).toBe(4000);   // 20 * 10 * 20
  });
});

// =============================================================================
// ZONE MANAGER LIFECYCLE
// =============================================================================

describe('CulturalZoneManager Lifecycle', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should initialize in stopped state', () => {
    expect(manager.getIsRunning()).toBe(false);
  });

  it('should start the management loop', () => {
    vi.useFakeTimers();
    manager.start();
    expect(manager.getIsRunning()).toBe(true);
    manager.stop();
    vi.useRealTimers();
  });

  it('should stop the management loop', () => {
    vi.useFakeTimers();
    manager.start();
    manager.stop();
    expect(manager.getIsRunning()).toBe(false);
    vi.useRealTimers();
  });

  it('should not start twice', () => {
    vi.useFakeTimers();
    manager.start();
    manager.start(); // Should warn, not throw
    expect(manager.getIsRunning()).toBe(true);
    manager.stop();
    vi.useRealTimers();
  });

  it('should dispose cleanly', () => {
    manager.createZone('zone:test:a', 'Zone A', {
      center: { x: 0, y: 0, z: 0 },
    });
    manager.dispose();
    expect(manager.getIsRunning()).toBe(false);
    expect(manager.getZone('zone:test:a')).toBeUndefined();
  });

  it('should create manager via factory function', () => {
    const m = createCulturalZoneManager({
      localAgentId: 'test',
      worldId: 'world',
    });
    expect(m).toBeInstanceOf(CulturalZoneManager);
    m.dispose();
  });
});

// =============================================================================
// ZONE CRUD
// =============================================================================

describe('Zone CRUD', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should create a zone with defaults', () => {
    const zone = manager.createZone('zone:test:lobby', 'Lobby', {
      center: { x: 0, y: 0, z: 0 },
    });

    expect(zone.id).toBe('zone:test:lobby');
    expect(zone.name).toBe('Lobby');
    expect(zone.type).toBe('workspace');
    expect(zone.status).toBe('active');
    expect(zone.occupants).toEqual([]);
    expect(zone.occupantCount).toBe(0);
  });

  it('should create a zone with custom options', () => {
    const zone = manager.createZone('zone:test:quiet', 'Quiet Zone', {
      type: 'meditation',
      description: 'A quiet space',
      center: { x: 50, y: 0, z: 50 },
      halfExtents: { x: 5, y: 3, z: 5 },
      norms: { maxChatPerMinute: 5, voiceAllowed: false },
      tags: ['quiet', 'meditation'],
    });

    expect(zone.type).toBe('meditation');
    expect(zone.description).toBe('A quiet space');
    expect(zone.norms.maxChatPerMinute).toBe(5);
    expect(zone.norms.voiceAllowed).toBe(false);
    expect(zone.tags).toContain('quiet');
  });

  it('should throw when creating duplicate zone', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    expect(() => {
      manager.createZone('zone:test:a', 'Zone A Dupe', { center: { x: 10, y: 0, z: 10 } });
    }).toThrow('Zone already exists');
  });

  it('should get a zone by ID', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    const zone = manager.getZone('zone:test:a');
    expect(zone).toBeDefined();
    expect(zone!.name).toBe('Zone A');
  });

  it('should return undefined for unknown zone', () => {
    expect(manager.getZone('zone:nonexistent')).toBeUndefined();
  });

  it('should get all zones', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 50 } });

    const allZones = manager.getAllZones();
    expect(allZones.size).toBe(2);
  });

  it('should update zone culture', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });

    manager.updateZoneCulture('zone:test:a', 'communication_style', 'formal');

    const zone = manager.getZone('zone:test:a');
    expect(zone!.culturalVector.features['communication_style'].value).toBe('formal');
    expect(zone!.culturalVector.version).toBe(2);
  });

  it('should reject invalid feature value', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.updateZoneCulture('zone:test:a', 'communication_style', 'INVALID');
    // Value should not change
    const zone = manager.getZone('zone:test:a');
    expect(zone!.culturalVector.features['communication_style'].value).toBe('professional');
  });

  it('should update zone norms', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.updateZoneNorms('zone:test:a', { maxChatPerMinute: 5, voiceAllowed: false });

    const zone = manager.getZone('zone:test:a');
    expect(zone!.norms.maxChatPerMinute).toBe(5);
    expect(zone!.norms.voiceAllowed).toBe(false);
  });

  it('should dissolve a zone', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.dissolveZone('zone:test:a', 'test_cleanup');

    expect(manager.getZone('zone:test:a')).toBeUndefined();
  });

  it('should emit zone:created event', () => {
    const eventHandler = vi.fn();
    manager = createTestManager({
      onZoneEvent: eventHandler,
    });

    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });

    expect(eventHandler).toHaveBeenCalledWith(
      'zone:created',
      expect.objectContaining({
        zone: expect.objectContaining({ id: 'zone:test:a' }),
      }),
    );
  });

  it('should emit zone:dissolved event', () => {
    const eventHandler = vi.fn();
    manager = createTestManager({
      onZoneEvent: eventHandler,
    });

    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.dissolveZone('zone:test:a', 'test_cleanup');

    expect(eventHandler).toHaveBeenCalledWith(
      'zone:dissolved',
      expect.objectContaining({ zoneId: 'zone:test:a', reason: 'test_cleanup' }),
    );
  });
});

// =============================================================================
// BOUNDARY CREATION & SIMILARITY
// =============================================================================

describe('Boundary Creation & Similarity', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should create boundaries between all zones automatically', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 50 } });
    manager.createZone('zone:test:c', 'Zone C', { center: { x: 100, y: 0, z: 0 } });

    const boundaries = manager.getAllBoundaries();
    // 3 zones = 3 boundaries (AB, AC, BC)
    expect(Object.keys(boundaries)).toHaveLength(3);
  });

  it('should compute similarity 1.0 for zones with identical culture', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 50 } });

    const similarity = manager.getZoneSimilarity('zone:test:a', 'zone:test:b');
    expect(similarity).toBe(1.0);
  });

  it('should compute reduced similarity after culture change', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 50 } });

    // Change zone B's culture
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'formal');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');

    const similarity = manager.getZoneSimilarity('zone:test:a', 'zone:test:b');
    expect(similarity).toBeLessThan(1.0);
    expect(similarity).toBeGreaterThan(0);
  });

  it('should return full bandwidth for same-zone query', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });

    const bandwidth = manager.getZoneBandwidth('zone:test:a', 'zone:test:a');
    expect(bandwidth).toBe('full');
  });

  it('should return appropriate bandwidth for culturally distant zones', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 50 } });

    // Make zones maximally different
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    manager.updateZoneCulture('zone:test:b', 'interaction_tempo', 'contemplative');
    manager.updateZoneCulture('zone:test:b', 'spatial_density', 'isolated');
    manager.updateZoneCulture('zone:test:b', 'functional_focus', 'meditation');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');
    manager.updateZoneCulture('zone:test:b', 'hierarchy_model', 'autocratic');
    manager.updateZoneCulture('zone:test:b', 'content_openness', 'closed');

    const bandwidth = manager.getZoneBandwidth('zone:test:a', 'zone:test:b');
    // Should be blocked or minimal since cultures are completely different
    expect(['blocked', 'minimal']).toContain(bandwidth);
  });

  it('should return blocked for unknown boundary', () => {
    const bandwidth = manager.getZoneBandwidth('zone:unknown:a', 'zone:unknown:b');
    expect(bandwidth).toBe('blocked');
  });
});

// =============================================================================
// ZONE CONTAINMENT & AGENT TRACKING
// =============================================================================

describe('Zone Containment & Agent Tracking', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
    manager.createZone('zone:test:lobby', 'Lobby', {
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 10, y: 5, z: 10 },
    });
    manager.createZone('zone:test:office', 'Office', {
      center: { x: 50, y: 0, z: 0 },
      halfExtents: { x: 10, y: 5, z: 10 },
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should track agent entering a zone', () => {
    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    forceManagementCycle(manager);

    expect(manager.getAgentZone('agent-1')).toBe('zone:test:lobby');
  });

  it('should track agent leaving a zone', () => {
    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    forceManagementCycle(manager);
    expect(manager.getAgentZone('agent-1')).toBe('zone:test:lobby');

    // Move outside all zones
    manager.updateAgentPosition('agent-1', { x: 200, y: 0, z: 200 });
    forceManagementCycle(manager);
    expect(manager.getAgentZone('agent-1')).toBeUndefined();
  });

  it('should track agent moving between zones', () => {
    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    forceManagementCycle(manager);
    expect(manager.getAgentZone('agent-1')).toBe('zone:test:lobby');

    // Move to office zone
    manager.updateAgentPosition('agent-1', { x: 52, y: 0, z: 3 });
    forceManagementCycle(manager);
    expect(manager.getAgentZone('agent-1')).toBe('zone:test:office');
  });

  it('should update zone occupant counts', () => {
    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    manager.updateAgentPosition('agent-2', { x: -3, y: 0, z: 5 });
    forceManagementCycle(manager);

    const lobby = manager.getZone('zone:test:lobby');
    expect(lobby!.occupantCount).toBe(2);
    expect(lobby!.occupants).toContain('agent-1');
    expect(lobby!.occupants).toContain('agent-2');
  });

  it('should emit zone:agent-entered events', () => {
    const eventHandler = vi.fn();
    manager.on('zone:agent-entered', eventHandler);

    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    forceManagementCycle(manager);

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        zoneId: 'zone:test:lobby',
        agentId: 'agent-1',
      }),
    );
  });

  it('should emit zone:agent-exited events', () => {
    const eventHandler = vi.fn();
    manager.on('zone:agent-exited', eventHandler);

    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    forceManagementCycle(manager);

    manager.updateAgentPosition('agent-1', { x: 200, y: 0, z: 200 });
    forceManagementCycle(manager);

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        zoneId: 'zone:test:lobby',
        agentId: 'agent-1',
      }),
    );
  });

  it('should remove agent from tracking', () => {
    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    forceManagementCycle(manager);
    expect(manager.getAgentZone('agent-1')).toBe('zone:test:lobby');

    manager.removeAgent('agent-1');
    expect(manager.getAgentZone('agent-1')).toBeUndefined();
  });

  it('should return undefined zone for untracked agent', () => {
    expect(manager.getAgentZone('unknown-agent')).toBeUndefined();
  });

  it('should not place agent at boundary edge (just outside)', () => {
    // Place at exactly the boundary edge (+10.1 on x, beyond halfExtent of 10)
    manager.updateAgentPosition('agent-1', { x: 10.1, y: 0, z: 0 });
    forceManagementCycle(manager);
    expect(manager.getAgentZone('agent-1')).toBeUndefined();
  });

  it('should place agent at boundary edge (just inside)', () => {
    // Place at exactly the boundary edge (10.0 on x, within halfExtent of 10)
    manager.updateAgentPosition('agent-1', { x: 10, y: 0, z: 0 });
    forceManagementCycle(manager);
    expect(manager.getAgentZone('agent-1')).toBe('zone:test:lobby');
  });
});

// =============================================================================
// INTERACTION MULTIPLIER
// =============================================================================

describe('Interaction Multiplier', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
    manager.createZone('zone:test:a', 'Zone A', {
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 10, y: 5, z: 10 },
    });
    manager.createZone('zone:test:b', 'Zone B', {
      center: { x: 50, y: 0, z: 0 },
      halfExtents: { x: 10, y: 5, z: 10 },
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should return 1.0 for agents in the same zone', () => {
    manager.updateAgentPosition('agent-1', { x: 3, y: 0, z: 3 });
    manager.updateAgentPosition('agent-2', { x: -3, y: 0, z: -3 });
    forceManagementCycle(manager);

    const multiplier = manager.getInteractionMultiplier('agent-1', 'agent-2');
    expect(multiplier).toBe(1.0);
  });

  it('should return 1.0 for untracked agents', () => {
    const multiplier = manager.getInteractionMultiplier('unknown-1', 'unknown-2');
    expect(multiplier).toBe(1.0);
  });

  it('should return reduced multiplier for agents in different zones', () => {
    // Make zones culturally different
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');

    manager.updateAgentPosition('agent-1', { x: 3, y: 0, z: 3 });
    manager.updateAgentPosition('agent-2', { x: 53, y: 0, z: 3 });
    forceManagementCycle(manager);

    const multiplier = manager.getInteractionMultiplier('agent-1', 'agent-2');
    expect(multiplier).toBeLessThan(1.0);
  });
});

// =============================================================================
// TRUST-BASED ZONE ACCESS
// =============================================================================

describe('Trust-Based Zone Access', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
    manager.createZone('zone:test:restricted', 'Restricted Zone', {
      type: 'restricted',
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 10, y: 5, z: 10 },
      norms: { minTrustScore: 0.7 },
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should allow entry when no trust scoring is configured', () => {
    const allowed = manager.isAgentAllowedInZone('agent-1', 'zone:test:restricted');
    expect(allowed).toBe(true);
  });

  it('should deny entry when trust score is below minimum', () => {
    const mockScoring = {
      getAgentScore: vi.fn().mockReturnValue(0.3),
    };
    manager.setTrustScoring(mockScoring as any);

    const allowed = manager.isAgentAllowedInZone('agent-1', 'zone:test:restricted');
    expect(allowed).toBe(false);
  });

  it('should allow entry when trust score meets minimum', () => {
    const mockScoring = {
      getAgentScore: vi.fn().mockReturnValue(0.8),
    };
    manager.setTrustScoring(mockScoring as any);

    const allowed = manager.isAgentAllowedInZone('agent-1', 'zone:test:restricted');
    expect(allowed).toBe(true);
  });

  it('should deny entry to full zones', () => {
    manager.updateZoneNorms('zone:test:restricted', { maxOccupancy: 1 });

    // Put one agent in the zone
    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    forceManagementCycle(manager);

    const allowed = manager.isAgentAllowedInZone('agent-2', 'zone:test:restricted');
    expect(allowed).toBe(false);
  });

  it('should emit zone:entry-denied event when trust too low', () => {
    const eventHandler = vi.fn();
    manager.on('zone:entry-denied', eventHandler);

    const mockScoring = {
      getAgentScore: vi.fn().mockReturnValue(0.3),
    };
    manager.setTrustScoring(mockScoring as any);

    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    forceManagementCycle(manager);

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        zoneId: 'zone:test:restricted',
        agentId: 'agent-1',
        reason: 'trust_score_too_low',
      }),
    );
  });
});

// =============================================================================
// BRIDGE AGENT DEPLOYMENT
// =============================================================================

describe('Bridge Agent Deployment', () => {
  let manager: CulturalZoneManager;
  let deployCounter: number;

  beforeEach(() => {
    deployCounter = 0;
    manager = createTestManager({
      bridgeAgentDeploymentThreshold: 0.4,
      bridgeAgentRecallThreshold: 0.7,
      onBridgeAgentDeployRequest: (zoneAId, zoneBId, position) => {
        return `bridge-agent-${++deployCounter}`;
      },
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should deploy bridge agent at low-similarity boundary', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 0 } });

    // Make zones very different (all features different)
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    manager.updateZoneCulture('zone:test:b', 'interaction_tempo', 'contemplative');
    manager.updateZoneCulture('zone:test:b', 'spatial_density', 'isolated');
    manager.updateZoneCulture('zone:test:b', 'functional_focus', 'meditation');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');
    manager.updateZoneCulture('zone:test:b', 'hierarchy_model', 'autocratic');
    manager.updateZoneCulture('zone:test:b', 'content_openness', 'closed');

    forceManagementCycle(manager);

    const bridgeAgents = manager.getBridgeAgents();
    expect(Object.keys(bridgeAgents).length).toBeGreaterThanOrEqual(1);
  });

  it('should not deploy bridge agent at high-similarity boundary', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 0 } });

    // Keep default culture (identical)
    forceManagementCycle(manager);

    const bridgeAgents = manager.getBridgeAgents();
    expect(Object.keys(bridgeAgents)).toHaveLength(0);
  });

  it('should recall bridge agent when similarity increases', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 0 } });

    // Make zones very different to trigger deployment
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    manager.updateZoneCulture('zone:test:b', 'interaction_tempo', 'contemplative');
    manager.updateZoneCulture('zone:test:b', 'spatial_density', 'isolated');
    manager.updateZoneCulture('zone:test:b', 'functional_focus', 'meditation');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');
    manager.updateZoneCulture('zone:test:b', 'hierarchy_model', 'autocratic');
    manager.updateZoneCulture('zone:test:b', 'content_openness', 'closed');

    forceManagementCycle(manager);
    expect(Object.keys(manager.getBridgeAgents()).length).toBeGreaterThanOrEqual(1);

    // Now make zones identical again (similarity = 1.0 > recall threshold 0.7)
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'professional');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'standard');
    manager.updateZoneCulture('zone:test:b', 'interaction_tempo', 'normal');
    manager.updateZoneCulture('zone:test:b', 'spatial_density', 'comfortable');
    manager.updateZoneCulture('zone:test:b', 'functional_focus', 'discussion');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'moderate');
    manager.updateZoneCulture('zone:test:b', 'hierarchy_model', 'flat');
    manager.updateZoneCulture('zone:test:b', 'content_openness', 'moderated');

    forceManagementCycle(manager);
    expect(Object.keys(manager.getBridgeAgents())).toHaveLength(0);
  });

  it('should emit zone:bridge-deployed event', () => {
    const eventHandler = vi.fn();
    manager.on('zone:bridge-deployed', eventHandler);

    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 0 } });

    // Make zones very different
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    manager.updateZoneCulture('zone:test:b', 'interaction_tempo', 'contemplative');
    manager.updateZoneCulture('zone:test:b', 'spatial_density', 'isolated');
    manager.updateZoneCulture('zone:test:b', 'functional_focus', 'meditation');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');
    manager.updateZoneCulture('zone:test:b', 'hierarchy_model', 'autocratic');
    manager.updateZoneCulture('zone:test:b', 'content_openness', 'closed');

    forceManagementCycle(manager);

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: expect.any(String),
        zoneAId: expect.any(String),
        zoneBId: expect.any(String),
        position: expect.objectContaining({ x: expect.any(Number) }),
      }),
    );
  });

  it('should emit zone:bridge-recalled event', () => {
    const eventHandler = vi.fn();
    manager.on('zone:bridge-recalled', eventHandler);

    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 0 } });

    // Deploy
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    manager.updateZoneCulture('zone:test:b', 'interaction_tempo', 'contemplative');
    manager.updateZoneCulture('zone:test:b', 'spatial_density', 'isolated');
    manager.updateZoneCulture('zone:test:b', 'functional_focus', 'meditation');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');
    manager.updateZoneCulture('zone:test:b', 'hierarchy_model', 'autocratic');
    manager.updateZoneCulture('zone:test:b', 'content_openness', 'closed');
    forceManagementCycle(manager);

    // Recall by increasing similarity
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'professional');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'standard');
    manager.updateZoneCulture('zone:test:b', 'interaction_tempo', 'normal');
    manager.updateZoneCulture('zone:test:b', 'spatial_density', 'comfortable');
    manager.updateZoneCulture('zone:test:b', 'functional_focus', 'discussion');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'moderate');
    manager.updateZoneCulture('zone:test:b', 'hierarchy_model', 'flat');
    manager.updateZoneCulture('zone:test:b', 'content_openness', 'moderated');
    forceManagementCycle(manager);

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: expect.any(String),
        reason: 'similarity_increased',
      }),
    );
  });

  it('should not deploy when callback returns null', () => {
    const nullDeployManager = createTestManager({
      onBridgeAgentDeployRequest: () => null,
    });

    nullDeployManager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    nullDeployManager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 0 } });

    // Make zones very different
    nullDeployManager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    nullDeployManager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    nullDeployManager.updateZoneCulture('zone:test:b', 'interaction_tempo', 'contemplative');
    nullDeployManager.updateZoneCulture('zone:test:b', 'spatial_density', 'isolated');
    nullDeployManager.updateZoneCulture('zone:test:b', 'functional_focus', 'meditation');
    nullDeployManager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');
    nullDeployManager.updateZoneCulture('zone:test:b', 'hierarchy_model', 'autocratic');
    nullDeployManager.updateZoneCulture('zone:test:b', 'content_openness', 'closed');
    forceManagementCycle(nullDeployManager);

    expect(Object.keys(nullDeployManager.getBridgeAgents())).toHaveLength(0);
    nullDeployManager.dispose();
  });
});

// =============================================================================
// CRITICAL MASS DETECTION
// =============================================================================

describe('Critical Mass Detection', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager({
      criticalMassRatio: 0.4,
      criticalMassDurationMs: 0, // Immediate triggering for tests
    });

    manager.createZone('zone:test:target', 'Target Zone', {
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 20, y: 5, z: 20 },
    });
    manager.createZone('zone:test:source', 'Source Zone', {
      center: { x: 100, y: 0, z: 0 },
      halfExtents: { x: 20, y: 5, z: 20 },
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should detect critical mass when foreign agents exceed threshold', () => {
    // Place 2 native agents and 3 foreign agents in target zone
    manager.updateAgentPosition('native-1', { x: 5, y: 0, z: 5 });
    manager.updateAgentPosition('native-2', { x: -5, y: 0, z: -5 });
    manager.updateAgentPosition('foreign-1', { x: 3, y: 0, z: 3 });
    manager.updateAgentPosition('foreign-2', { x: -3, y: 0, z: -3 });
    manager.updateAgentPosition('foreign-3', { x: 1, y: 0, z: 1 });

    manager.setAgentHomeZone('native-1', 'zone:test:target');
    manager.setAgentHomeZone('native-2', 'zone:test:target');
    manager.setAgentHomeZone('foreign-1', 'zone:test:source');
    manager.setAgentHomeZone('foreign-2', 'zone:test:source');
    manager.setAgentHomeZone('foreign-3', 'zone:test:source');

    forceManagementCycle(manager);

    const criticalMass = manager.getCriticalMassStates();
    expect(criticalMass.length).toBeGreaterThanOrEqual(1);

    const state = criticalMass.find(
      s => s.targetZoneId === 'zone:test:target' && s.sourceZoneId === 'zone:test:source',
    );
    expect(state).toBeDefined();
    expect(state!.foreignRatio).toBe(0.6); // 3/5
    expect(state!.thresholdExceeded).toBe(true);
  });

  it('should not trigger critical mass below threshold', () => {
    // Place 4 native agents and 1 foreign agent (ratio = 0.2 < 0.4)
    manager.updateAgentPosition('native-1', { x: 5, y: 0, z: 5 });
    manager.updateAgentPosition('native-2', { x: -5, y: 0, z: -5 });
    manager.updateAgentPosition('native-3', { x: 7, y: 0, z: 7 });
    manager.updateAgentPosition('native-4', { x: -7, y: 0, z: -7 });
    manager.updateAgentPosition('foreign-1', { x: 3, y: 0, z: 3 });

    manager.setAgentHomeZone('native-1', 'zone:test:target');
    manager.setAgentHomeZone('native-2', 'zone:test:target');
    manager.setAgentHomeZone('native-3', 'zone:test:target');
    manager.setAgentHomeZone('native-4', 'zone:test:target');
    manager.setAgentHomeZone('foreign-1', 'zone:test:source');

    forceManagementCycle(manager);

    const criticalMass = manager.getCriticalMassStates();
    expect(criticalMass).toHaveLength(0);
  });

  it('should emit zone:critical-mass event', () => {
    const eventHandler = vi.fn();
    manager.on('zone:critical-mass', eventHandler);

    // Create critical mass scenario
    manager.updateAgentPosition('native-1', { x: 5, y: 0, z: 5 });
    manager.updateAgentPosition('foreign-1', { x: 3, y: 0, z: 3 });
    manager.updateAgentPosition('foreign-2', { x: -3, y: 0, z: -3 });
    manager.updateAgentPosition('foreign-3', { x: 1, y: 0, z: 1 });

    manager.setAgentHomeZone('native-1', 'zone:test:target');
    manager.setAgentHomeZone('foreign-1', 'zone:test:source');
    manager.setAgentHomeZone('foreign-2', 'zone:test:source');
    manager.setAgentHomeZone('foreign-3', 'zone:test:source');

    forceManagementCycle(manager);

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          targetZoneId: 'zone:test:target',
          sourceZoneId: 'zone:test:source',
          thresholdExceeded: true,
        }),
      }),
    );
  });

  it('should emit zone:critical-mass-resolved when ratio drops', () => {
    const resolvedHandler = vi.fn();
    manager.on('zone:critical-mass-resolved', resolvedHandler);

    // Create critical mass
    manager.updateAgentPosition('native-1', { x: 5, y: 0, z: 5 });
    manager.updateAgentPosition('foreign-1', { x: 3, y: 0, z: 3 });
    manager.updateAgentPosition('foreign-2', { x: -3, y: 0, z: -3 });
    manager.updateAgentPosition('foreign-3', { x: 1, y: 0, z: 1 });

    manager.setAgentHomeZone('native-1', 'zone:test:target');
    manager.setAgentHomeZone('foreign-1', 'zone:test:source');
    manager.setAgentHomeZone('foreign-2', 'zone:test:source');
    manager.setAgentHomeZone('foreign-3', 'zone:test:source');

    forceManagementCycle(manager);

    // Now remove foreign agents to resolve
    manager.removeAgent('foreign-1');
    manager.removeAgent('foreign-2');
    manager.removeAgent('foreign-3');
    forceManagementCycle(manager);

    expect(resolvedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        targetZoneId: 'zone:test:target',
        sourceZoneId: 'zone:test:source',
      }),
    );
  });
});

// =============================================================================
// PERMEABILITY METRICS
// =============================================================================

describe('Permeability Metrics', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
    manager.createZone('zone:test:a', 'Zone A', {
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 10, y: 5, z: 10 },
    });
    manager.createZone('zone:test:b', 'Zone B', {
      center: { x: 30, y: 0, z: 0 },
      halfExtents: { x: 10, y: 5, z: 10 },
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should initialize permeability metrics for boundaries', () => {
    const metrics = manager.getPermeabilityMetrics('zone:test:a', 'zone:test:b');
    expect(metrics).toBeDefined();
    expect(metrics!.crossingsAtoB).toBe(0);
    expect(metrics!.crossingsBtoA).toBe(0);
    expect(metrics!.interactionSuccessRate).toBe(1.0);
  });

  it('should track boundary crossings', () => {
    // Agent starts in zone A, moves to zone B
    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 0 });
    forceManagementCycle(manager);
    expect(manager.getAgentZone('agent-1')).toBe('zone:test:a');

    manager.updateAgentPosition('agent-1', { x: 35, y: 0, z: 0 });
    forceManagementCycle(manager);
    expect(manager.getAgentZone('agent-1')).toBe('zone:test:b');

    const metrics = manager.getPermeabilityMetrics('zone:test:a', 'zone:test:b');
    expect(metrics).toBeDefined();
    expect(metrics!.crossInteractions).toBeGreaterThanOrEqual(1);
  });

  it('should update permeability based on similarity', () => {
    const metrics = manager.getPermeabilityMetrics('zone:test:a', 'zone:test:b');
    expect(metrics!.currentPermeability).toBe(1.0); // Identical culture

    // Change culture
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    forceManagementCycle(manager);

    const updated = manager.getPermeabilityMetrics('zone:test:a', 'zone:test:b');
    expect(updated!.currentPermeability).toBeLessThan(1.0);
  });

  it('should track tension score', () => {
    forceManagementCycle(manager);
    const metrics = manager.getPermeabilityMetrics('zone:test:a', 'zone:test:b');
    expect(metrics!.tensionScore).toBe(0); // Identical culture = no tension

    // Change culture
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    forceManagementCycle(manager);

    const updated = manager.getPermeabilityMetrics('zone:test:a', 'zone:test:b');
    expect(updated!.tensionScore).toBeGreaterThan(0);
  });
});

// =============================================================================
// EVENT SYSTEM
// =============================================================================

describe('Event System', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should register and fire event listeners', () => {
    const handler = vi.fn();
    manager.on('zone:created', handler);

    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should unregister event listeners', () => {
    const handler = vi.fn();
    manager.on('zone:created', handler);
    manager.off('zone:created', handler);

    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle errors in event listeners gracefully', () => {
    const badHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    const goodHandler = vi.fn();

    manager.on('zone:created', badHandler);
    manager.on('zone:created', goodHandler);

    // Should not throw
    expect(() => {
      manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    }).not.toThrow();

    expect(badHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();
  });

  it('should fire zone:culture-changed events', () => {
    const handler = vi.fn();
    manager.on('zone:culture-changed', handler);

    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.updateZoneCulture('zone:test:a', 'communication_style', 'formal');

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        zoneId: 'zone:test:a',
        featureId: 'communication_style',
        oldValue: 'professional',
        newValue: 'formal',
      }),
    );
  });
});

// =============================================================================
// METRICS
// =============================================================================

describe('Metrics', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should report initial metrics', () => {
    const metrics = manager.getMetrics();
    expect(metrics.isRunning).toBe(false);
    expect(metrics.totalZones).toBe(0);
    expect(metrics.activeZones).toBe(0);
    expect(metrics.totalBoundaries).toBe(0);
    expect(metrics.activeBridgeAgents).toBe(0);
    expect(metrics.totalTrackedAgents).toBe(0);
    expect(metrics.totalZoneEntries).toBe(0);
    expect(metrics.totalZoneExits).toBe(0);
    expect(metrics.totalEntryDenials).toBe(0);
  });

  it('should track zone count metrics', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 50 } });

    const metrics = manager.getMetrics();
    expect(metrics.totalZones).toBe(2);
    expect(metrics.activeZones).toBe(2);
    expect(metrics.totalBoundaries).toBe(1);
  });

  it('should track agent metrics', () => {
    manager.createZone('zone:test:a', 'Zone A', {
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 10, y: 5, z: 10 },
    });

    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 5 });
    forceManagementCycle(manager);

    const metrics = manager.getMetrics();
    expect(metrics.totalTrackedAgents).toBe(1);
    expect(metrics.totalZoneEntries).toBe(1);
  });

  it('should compute average cultural similarity', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 50 } });

    const metrics = manager.getMetrics();
    // Identical default culture
    expect(metrics.averageCulturalSimilarity).toBe(1.0);
    expect(metrics.averagePermeability).toBe(1.0);
  });

  it('should track bridge deployment metrics', () => {
    let counter = 0;
    const m = createTestManager({
      onBridgeAgentDeployRequest: () => `bridge-${++counter}`,
    });

    m.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    m.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 0 } });

    // Make zones different to trigger deployment
    m.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    m.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    m.updateZoneCulture('zone:test:b', 'interaction_tempo', 'contemplative');
    m.updateZoneCulture('zone:test:b', 'spatial_density', 'isolated');
    m.updateZoneCulture('zone:test:b', 'functional_focus', 'meditation');
    m.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');
    m.updateZoneCulture('zone:test:b', 'hierarchy_model', 'autocratic');
    m.updateZoneCulture('zone:test:b', 'content_openness', 'closed');
    forceManagementCycle(m);

    const metrics = m.getMetrics();
    expect(metrics.totalBridgeDeployments).toBeGreaterThanOrEqual(1);
    expect(metrics.activeBridgeAgents).toBeGreaterThanOrEqual(1);

    m.dispose();
  });
});

// =============================================================================
// MANAGEMENT CYCLE TIMING
// =============================================================================

describe('Management Cycle', () => {
  it('should run management cycle on timer', () => {
    vi.useFakeTimers();
    const manager = createTestManager({ managementHz: 2 }); // 500ms interval

    manager.createZone('zone:test:a', 'Zone A', {
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 10, y: 5, z: 10 },
    });

    manager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
    manager.start();

    // Agent should not be placed yet (no cycle has run)
    expect(manager.getAgentZone('agent-1')).toBeUndefined();

    // Advance time past one interval
    vi.advanceTimersByTime(501);

    // Now agent should be placed
    expect(manager.getAgentZone('agent-1')).toBe('zone:test:a');

    manager.dispose();
    vi.useRealTimers();
  });
});

// =============================================================================
// WORLD STATE
// =============================================================================

describe('World State', () => {
  let manager: CulturalZoneManager;

  beforeEach(() => {
    manager = createTestManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should expose full world state', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 0 } });

    const state = manager.getWorldState();
    expect(Object.keys(state.zones)).toHaveLength(2);
    expect(Object.keys(state.boundaries)).toHaveLength(1);
    expect(state.sequence).toBe(0); // No management cycle run
  });

  it('should increment sequence on management cycle', () => {
    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });

    forceManagementCycle(manager);
    const state = manager.getWorldState();
    expect(state.sequence).toBe(1);

    forceManagementCycle(manager);
    expect(manager.getWorldState().sequence).toBe(2);
  });
});

// =============================================================================
// ZONE DISSOLUTION WITH BRIDGE AGENTS
// =============================================================================

describe('Zone Dissolution with Bridge Agents', () => {
  it('should recall bridge agents when zone is dissolved', () => {
    let counter = 0;
    const recallHandler = vi.fn();

    const manager = createTestManager({
      onBridgeAgentDeployRequest: () => `bridge-${++counter}`,
      onBridgeAgentRecallRequest: recallHandler,
    });

    manager.createZone('zone:test:a', 'Zone A', { center: { x: 0, y: 0, z: 0 } });
    manager.createZone('zone:test:b', 'Zone B', { center: { x: 50, y: 0, z: 0 } });

    // Make zones different to deploy bridge agent
    manager.updateZoneCulture('zone:test:b', 'communication_style', 'silent');
    manager.updateZoneCulture('zone:test:b', 'trust_protocol', 'strict');
    manager.updateZoneCulture('zone:test:b', 'interaction_tempo', 'contemplative');
    manager.updateZoneCulture('zone:test:b', 'spatial_density', 'isolated');
    manager.updateZoneCulture('zone:test:b', 'functional_focus', 'meditation');
    manager.updateZoneCulture('zone:test:b', 'noise_tolerance', 'silent');
    manager.updateZoneCulture('zone:test:b', 'hierarchy_model', 'autocratic');
    manager.updateZoneCulture('zone:test:b', 'content_openness', 'closed');
    forceManagementCycle(manager);

    expect(Object.keys(manager.getBridgeAgents()).length).toBeGreaterThanOrEqual(1);

    // Dissolve zone B
    manager.dissolveZone('zone:test:b', 'test');

    expect(Object.keys(manager.getBridgeAgents())).toHaveLength(0);
    expect(recallHandler).toHaveBeenCalled();

    manager.dispose();
  });
});
