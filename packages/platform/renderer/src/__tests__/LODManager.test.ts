/**
 * @vitest-environment jsdom
 */

/**
 * Tests for LODManager (Level of Detail Management)
 *
 * Domain: scene-graph / spatial-rendering
 * VR Priority: Spatial accuracy (0.001m position tolerance),
 *              LOD distance thresholds, memory pressure response
 *
 * Validates:
 * - LOD level calculation based on camera distance
 * - Memory pressure mode threshold switching
 * - Quality reduction/increase commands
 * - LOD statistics tracking
 * - Smooth transition management
 * - Cache management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the dependencies
vi.mock('../SceneGraphMemoryTracker', () => {
  return {
    SceneGraphMemoryTracker: vi.fn().mockImplementation(() => ({
      getAllObjects: vi.fn(() => []),
      getObject: vi.fn(() => null),
      getObjectCount: vi.fn(() => 0),
    })),
  };
});

vi.mock('../GPUMemoryManager', () => {
  return {
    GPUMemoryManager: vi.fn().mockImplementation(() => ({
      getUtilization: vi.fn(() => 0.5),
      on: vi.fn(),
      dispose: vi.fn(),
    })),
  };
});

import { LODManager, type LODManagerConfig } from '../LODManager';
import { SceneGraphMemoryTracker } from '../SceneGraphMemoryTracker';
import { GPUMemoryManager } from '../GPUMemoryManager';

// =============================================================================
// HELPERS
// =============================================================================

function createMockTrackedObject(id: string, distance: number, lodLevel: number = 0) {
  return {
    id,
    type: 'mesh' as const,
    object: new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial(),
    ),
    distance: { toCamera: distance, toCenter: distance },
    lod: { current: lodLevel, available: [0, 1, 2] },
    memoryBytes: 1024 * 1024, // 1MB
  };
}

function createTestLODManager(
  objects: ReturnType<typeof createMockTrackedObject>[] = [],
  utilization: number = 0.5,
): {
  manager: LODManager;
  sceneTracker: SceneGraphMemoryTracker;
  memoryManager: GPUMemoryManager;
} {
  const sceneTracker = new SceneGraphMemoryTracker() as any;
  sceneTracker.getAllObjects = vi.fn(() => objects);
  sceneTracker.getObject = vi.fn((id: string) => objects.find(o => o.id === id) || null);
  sceneTracker.getObjectCount = vi.fn(() => objects.length);

  const memoryManager = new GPUMemoryManager() as any;
  memoryManager.getUtilization = vi.fn(() => utilization);

  const manager = new LODManager(sceneTracker, memoryManager);

  return { manager, sceneTracker, memoryManager };
}

// =============================================================================
// TESTS
// =============================================================================

describe('LODManager', () => {
  describe('initialization', () => {
    it('should create with default configuration', () => {
      const { manager } = createTestLODManager();
      expect(manager).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const sceneTracker = new SceneGraphMemoryTracker() as any;
      sceneTracker.getAllObjects = vi.fn(() => []);
      sceneTracker.getObjectCount = vi.fn(() => 0);

      const memoryManager = new GPUMemoryManager() as any;
      memoryManager.getUtilization = vi.fn(() => 0);

      const config: LODManagerConfig = {
        normalThresholds: { lod0: 10, lod1: 30, lod2: 30 },
        smoothTransitions: false,
        transitionDuration: 500,
      };

      const manager = new LODManager(sceneTracker, memoryManager, config);
      expect(manager).toBeDefined();
    });
  });

  describe('LOD level calculation', () => {
    it('should assign LOD0 to close objects (< 20m)', () => {
      const obj = createMockTrackedObject('close', 10);
      const { manager } = createTestLODManager([obj], 0.5);
      const camera = new THREE.PerspectiveCamera();

      manager.updateLODLevels(camera);

      // Object at 10m should be LOD0
      expect(obj.lod.current).toBe(0);
    });

    it('should assign LOD1 to medium distance objects (20-50m)', () => {
      const obj = createMockTrackedObject('medium', 35);
      const { manager } = createTestLODManager([obj], 0.5);
      const camera = new THREE.PerspectiveCamera();

      manager.updateLODLevels(camera);

      expect(obj.lod.current).toBe(1);
    });

    it('should assign LOD2 to distant objects (> 50m)', () => {
      const obj = createMockTrackedObject('far', 100);
      const { manager } = createTestLODManager([obj], 0.5);
      const camera = new THREE.PerspectiveCamera();

      manager.updateLODLevels(camera);

      expect(obj.lod.current).toBe(2);
    });
  });

  describe('memory pressure response', () => {
    it('should switch to pressure thresholds at > 70% utilization', () => {
      const closeObj = createMockTrackedObject('pressure_close', 15);
      const { manager } = createTestLODManager([closeObj], 0.75);
      const camera = new THREE.PerspectiveCamera();

      manager.updateLODLevels(camera);

      // At 75% utilization, pressure thresholds apply
      // Normal LOD0 threshold is 20m, but pressure is 10m
      // Object at 15m with pressure thresholds should be LOD1
      expect(closeObj.lod.current).toBe(1);
    });

    it('should apply additional pressure bias at 80% utilization', () => {
      const obj = createMockTrackedObject('high_pressure', 5);
      const { manager } = createTestLODManager([obj], 0.85);
      const camera = new THREE.PerspectiveCamera();

      manager.updateLODLevels(camera);

      // At 85%, pressureBias=1 is added on top of distance-based LOD
      expect(obj.lod.current).toBeGreaterThanOrEqual(1);
    });

    it('should force maximum LOD at 90% utilization', () => {
      const obj = createMockTrackedObject('emergency_pressure', 5);
      const { manager } = createTestLODManager([obj], 0.92);
      const camera = new THREE.PerspectiveCamera();

      manager.updateLODLevels(camera);

      // At 92%, pressureBias=2 clamps to LOD2
      expect(obj.lod.current).toBe(2);
    });
  });

  describe('forced quality reduction', () => {
    it('should reduce quality by N levels for all objects', () => {
      const obj1 = createMockTrackedObject('reduce1', 5, 0);
      const obj2 = createMockTrackedObject('reduce2', 10, 0);
      const { manager } = createTestLODManager([obj1, obj2]);

      manager.reduceQuality(1);

      expect(obj1.lod.current).toBe(1);
      expect(obj2.lod.current).toBe(1);
    });

    it('should not exceed LOD2 when reducing', () => {
      const obj = createMockTrackedObject('max_reduce', 5, 1);
      const { manager } = createTestLODManager([obj]);

      manager.reduceQuality(5);

      expect(obj.lod.current).toBe(2); // Clamped to max
    });

    it('should increase quality by N levels', () => {
      const obj = createMockTrackedObject('increase', 5, 2);
      const { manager } = createTestLODManager([obj]);

      manager.increaseQuality(1);

      expect(obj.lod.current).toBe(1);
    });

    it('should not go below LOD0 when increasing', () => {
      const obj = createMockTrackedObject('min_increase', 5, 0);
      const { manager } = createTestLODManager([obj]);

      manager.increaseQuality(5);

      expect(obj.lod.current).toBe(0); // Clamped to min
    });
  });

  describe('statistics', () => {
    it('should count objects per LOD level', () => {
      const obj0 = createMockTrackedObject('lod0', 5, 0);
      const obj1 = createMockTrackedObject('lod1', 30, 1);
      const obj2 = createMockTrackedObject('lod2', 100, 2);
      const { manager } = createTestLODManager([obj0, obj1, obj2]);

      const stats = manager.getStats();
      expect(stats.lod0Count).toBe(1);
      expect(stats.lod1Count).toBe(1);
      expect(stats.lod2Count).toBe(1);
      expect(stats.totalObjects).toBe(3);
    });

    it('should track active transitions count', () => {
      const { manager } = createTestLODManager([]);
      const stats = manager.getStats();
      expect(stats.activeTransitions).toBe(0);
    });

    it('should estimate memory savings from LOD', () => {
      const obj2 = createMockTrackedObject('savings', 100, 2);
      const { manager } = createTestLODManager([obj2]);

      const stats = manager.getStats();
      // LOD2 has 70% memory savings
      expect(stats.estimatedMemorySavings).toBeCloseTo(0.70, 1);
    });
  });

  describe('cache management', () => {
    it('should clear LOD cache', () => {
      const { manager } = createTestLODManager([]);
      // Should not throw
      expect(() => manager.clearCache()).not.toThrow();
    });
  });
});
