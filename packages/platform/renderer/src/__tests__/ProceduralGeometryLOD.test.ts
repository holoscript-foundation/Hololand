/**
 * Tests for ProceduralGeometryLODManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ProceduralGeometryLODManager } from '../ProceduralGeometryLOD';

describe('ProceduralGeometryLODManager', () => {
  let lodManager: ProceduralGeometryLODManager;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    lodManager = new ProceduralGeometryLODManager();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
  });

  describe('Registration', () => {
    it('should register hull geometry', () => {
      const hullGeometry = new THREE.BoxGeometry(1, 1, 1);
      const hullMesh = new THREE.Mesh(hullGeometry);

      lodManager.register('hull_1', hullMesh, 'hull', hullGeometry);

      const stats = lodManager.getStats();
      expect(stats.totalObjects).toBe(1);
      expect(stats.objectsByType.hull).toBe(1);
    });

    it('should register spline geometry', () => {
      const splineGeometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(2, 0, 0),
        ]),
        64,
        0.1,
        8,
        false
      );
      const splineMesh = new THREE.Mesh(splineGeometry);

      lodManager.register('spline_1', splineMesh, 'spline', splineGeometry);

      const stats = lodManager.getStats();
      expect(stats.totalObjects).toBe(1);
      expect(stats.objectsByType.spline).toBe(1);
    });

    it('should register membrane geometry', () => {
      const membraneGeometry = new THREE.PlaneGeometry(10, 10, 32, 32);
      const membraneMesh = new THREE.Mesh(membraneGeometry);

      lodManager.register('membrane_1', membraneMesh, 'membrane', membraneGeometry);

      const stats = lodManager.getStats();
      expect(stats.totalObjects).toBe(1);
      expect(stats.objectsByType.membrane).toBe(1);
    });

    it('should unregister geometry', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      expect(lodManager.getStats().totalObjects).toBe(1);

      lodManager.unregister('hull_1');
      expect(lodManager.getStats().totalObjects).toBe(0);
    });
  });

  describe('LOD Switching', () => {
    it('should use LOD 0 for nearby objects', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -10); // 10m away

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      const stats = lodManager.getStats();
      expect(stats.lodDistribution[0]).toBe(1); // Should be LOD 0 (< 15m)
    });

    it('should use LOD 1 for medium distance objects', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -25); // 25m away

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      const stats = lodManager.getStats();
      expect(stats.lodDistribution[1]).toBe(1); // Should be LOD 1 (15-35m)
    });

    it('should use LOD 2 for distant objects', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -50); // 50m away

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      const stats = lodManager.getStats();
      expect(stats.lodDistribution[2]).toBe(1); // Should be LOD 2 (35-70m)
    });

    it('should use LOD 3 for very distant objects', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -100); // 100m away

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      const stats = lodManager.getStats();
      expect(stats.lodDistribution[3]).toBe(1); // Should be LOD 3 (>70m)
    });

    it('should switch LOD when distance changes', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -10);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      let stats = lodManager.getStats();
      expect(stats.lodDistribution[0]).toBe(1); // LOD 0

      // Move object farther
      mesh.position.set(0, 0, -50);
      lodManager.update(camera);

      stats = lodManager.getStats();
      expect(stats.lodDistribution[2]).toBe(1); // LOD 2
      expect(stats.lodSwitchCount).toBeGreaterThan(0);
    });

    it('should handle multiple objects at different distances', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      const mesh1 = new THREE.Mesh(geometry.clone());
      mesh1.position.set(0, 0, -10);

      const mesh2 = new THREE.Mesh(geometry.clone());
      mesh2.position.set(0, 0, -30);

      const mesh3 = new THREE.Mesh(geometry.clone());
      mesh3.position.set(0, 0, -80);

      lodManager.register('hull_1', mesh1, 'hull', geometry.clone());
      lodManager.register('hull_2', mesh2, 'hull', geometry.clone());
      lodManager.register('hull_3', mesh3, 'hull', geometry.clone());

      lodManager.update(camera);

      const stats = lodManager.getStats();
      expect(stats.totalObjects).toBe(3);
      expect(stats.lodDistribution[0]).toBe(1); // mesh1
      expect(stats.lodDistribution[1]).toBe(1); // mesh2
      expect(stats.lodDistribution[3]).toBe(1); // mesh3
    });
  });

  describe('Foveated Rendering', () => {
    beforeEach(() => {
      lodManager = new ProceduralGeometryLODManager({
        foveated: {
          enabled: true,
          fovealForceHighDetail: true,
          peripheralMinLOD: 1,
          peripheralDistanceMultiplier: 0.6,
          gazeContingentThreshold: 15,
        },
      });
    });

    it('should force LOD 0 for foveal objects', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -30); // Normally LOD 1

      lodManager.register('hull_1', mesh, 'hull', geometry);

      // Gaze direction pointing at object
      const gazeDirection = new THREE.Vector3(0, 0, -1);
      lodManager.update(camera, gazeDirection);

      const stats = lodManager.getStats();
      expect(stats.lodDistribution[0]).toBe(1); // Forced to LOD 0
      expect(stats.fovealObjects).toBe(1);
    });

    it('should apply peripheral LOD bias', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(15, 0, -20); // To the side (peripheral) - angle ~37 degrees

      lodManager.register('hull_1', mesh, 'hull', geometry);

      // Gaze direction pointing forward (not at object)
      const gazeDirection = new THREE.Vector3(0, 0, -1);
      lodManager.update(camera, gazeDirection);

      const stats = lodManager.getStats();
      // In peripheral zone (>15 degrees from gaze)
      expect(stats.peripheralObjects).toBe(1);
      expect(stats.fovealObjects).toBe(0);
      // Distance = sqrt(15^2 + 20^2) ≈ 25m
      // With multiplier: 25m * 0.6 = 15m (exactly at threshold)
      // Should be LOD 0 or 1, but peripheral minimum is 1
      expect(stats.lodDistribution[1]).toBe(1);
    });

    it('should track foveal vs peripheral objects', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      const mesh1 = new THREE.Mesh(geometry.clone());
      mesh1.position.set(0, 0, -20); // Center (foveal)

      const mesh2 = new THREE.Mesh(geometry.clone());
      mesh2.position.set(10, 0, -20); // To the side (peripheral)

      lodManager.register('hull_1', mesh1, 'hull', geometry.clone());
      lodManager.register('hull_2', mesh2, 'hull', geometry.clone());

      const gazeDirection = new THREE.Vector3(0, 0, -1);
      lodManager.update(camera, gazeDirection);

      const stats = lodManager.getStats();
      expect(stats.fovealObjects).toBe(1);
      expect(stats.peripheralObjects).toBe(1);
    });
  });

  describe('Hysteresis', () => {
    beforeEach(() => {
      lodManager = new ProceduralGeometryLODManager({
        enableHysteresis: true,
        hysteresisPercent: 10,
      });
    });

    it('should prevent LOD flickering with hysteresis', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -10);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      let stats = lodManager.getStats();
      const initialLOD = stats.lodDistribution[0];
      expect(initialLOD).toBe(1); // LOD 0

      // Move object just past LOD 0 threshold (15m)
      mesh.position.set(0, 0, -15.5);
      lodManager.update(camera);

      stats = lodManager.getStats();
      // Should still be LOD 0 due to hysteresis (15m + 10% = 16.5m threshold)
      expect(stats.lodDistribution[0]).toBe(1);

      // Move past hysteresis threshold
      mesh.position.set(0, 0, -17);
      lodManager.update(camera);

      stats = lodManager.getStats();
      // Now should switch to LOD 1
      expect(stats.lodDistribution[1]).toBe(1);
    });
  });

  describe('Smooth Transitions', () => {
    beforeEach(() => {
      lodManager = new ProceduralGeometryLODManager({
        smoothTransitions: true,
        transitionDuration: 200,
      });
    });

    it('should create transition when switching LOD', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, 0, -10);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      // Move object to trigger LOD switch
      mesh.position.set(0, 0, -50);
      lodManager.update(camera);

      const stats = lodManager.getStats();
      expect(stats.activeTransitions).toBe(1);
    });

    it('should complete transitions after duration', async () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, 0, -10);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      // Move object to trigger LOD switch
      mesh.position.set(0, 0, -50);
      lodManager.update(camera);

      expect(lodManager.getStats().activeTransitions).toBe(1);

      // Wait for transition to complete
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Update again to process completed transitions
      lodManager.update(camera);

      expect(lodManager.getStats().activeTransitions).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should calculate memory savings', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -50); // LOD 2 distance

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      const stats = lodManager.getStats();
      expect(stats.totalMemorySavingsMB).toBeGreaterThan(0);
      expect(stats.lodDistribution[2]).toBe(1); // LOD 2 has 70% memory savings
    });

    it('should track update performance', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      for (let i = 0; i < 10; i++) {
        const mesh = new THREE.Mesh(geometry.clone());
        mesh.position.set(i * 10, 0, -20);
        lodManager.register(`hull_${i}`, mesh, 'hull', geometry.clone());
      }

      for (let i = 0; i < 5; i++) {
        lodManager.update(camera);
      }

      const stats = lodManager.getStats();
      expect(stats.avgUpdateTimeMs).toBeGreaterThan(0);
      expect(stats.avgUpdateTimeMs).toBeLessThan(1); // Should be < 1ms
    });

    it('should report LOD distribution across all levels', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      const distances = [10, 25, 50, 100]; // Different LOD levels
      for (let i = 0; i < distances.length; i++) {
        const mesh = new THREE.Mesh(geometry.clone());
        mesh.position.set(0, 0, -distances[i]);
        lodManager.register(`hull_${i}`, mesh, 'hull', geometry.clone());
      }

      lodManager.update(camera);

      const stats = lodManager.getStats();
      expect(stats.lodDistribution[0]).toBe(1);
      expect(stats.lodDistribution[1]).toBe(1);
      expect(stats.lodDistribution[2]).toBe(1);
      expect(stats.lodDistribution[3]).toBe(1);
    });
  });

  describe('Force LOD', () => {
    it('should allow forcing specific LOD level', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -10); // Normally LOD 0

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      // Force LOD 2
      lodManager.forceLOD('hull_1', 2);

      const stats = lodManager.getStats();
      expect(stats.lodDistribution[2]).toBe(1);
    });

    it('should reject invalid LOD levels', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);

      lodManager.register('hull_1', mesh, 'hull', geometry);

      // Try to force invalid LOD - should log warning via logger
      const currentLOD = lodManager.getStats().lodDistribution[0];
      lodManager.forceLOD('hull_1', 10); // Invalid level
      const newLOD = lodManager.getStats().lodDistribution[0];

      // LOD should not have changed
      expect(currentLOD).toBe(newLOD);
    });
  });

  describe('Cache Management', () => {
    it('should cache LOD geometries', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -10);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      // Move to trigger LOD switch
      mesh.position.set(0, 0, -50);
      lodManager.update(camera);

      // Move back
      mesh.position.set(0, 0, -10);
      lodManager.update(camera);

      // Should reuse cached LOD 0 geometry
      const stats = lodManager.getStats();
      expect(stats.lodDistribution[0]).toBe(1);
    });

    it('should clear LOD cache', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      lodManager.clearCache();

      const stats = lodManager.getStats();
      expect(stats.totalObjects).toBe(1); // Objects still registered
    });
  });

  describe('Geometry Type Specific LOD', () => {
    it('should apply hull-specific LOD configuration', () => {
      const hullManager = new ProceduralGeometryLODManager({
        hull: {
          maxVertices: [64, 32, 16, 8],
          useConvexSimplification: true,
          edgeDecimation: [1.0, 0.5, 0.25, 0.1],
        },
      });

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -50);

      hullManager.register('hull_1', mesh, 'hull', geometry);
      hullManager.update(camera);

      const stats = hullManager.getStats();
      expect(stats.lodDistribution[2]).toBe(1);
    });

    it('should apply spline-specific LOD configuration', () => {
      const splineManager = new ProceduralGeometryLODManager({
        spline: {
          curveSegments: [32, 16, 8, 4],
          radialSegments: [12, 8, 4, 4],
          linearFallback: true,
          adaptiveTessellation: true,
        },
      });

      const splineGeometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(1, 0, 0),
        ]),
        64,
        0.1,
        8,
        false
      );
      const mesh = new THREE.Mesh(splineGeometry);
      mesh.position.set(0, 0, -50);

      splineManager.register('spline_1', mesh, 'spline', splineGeometry);
      splineManager.update(camera);

      const stats = splineManager.getStats();
      expect(stats.lodDistribution[2]).toBe(1);
    });

    it('should apply membrane-specific LOD configuration', () => {
      const membraneManager = new ProceduralGeometryLODManager({
        membrane: {
          gridResolution: [64, 32, 16, 8],
          deformationDetail: [1.0, 0.6, 0.3, 0.1],
          billboardFallback: true,
          normalMapScale: [1.0, 0.5, 0.25, 0.0],
        },
      });

      const membraneGeometry = new THREE.PlaneGeometry(10, 10, 32, 32);
      const mesh = new THREE.Mesh(membraneGeometry);
      mesh.position.set(0, 0, -50);

      membraneManager.register('membrane_1', mesh, 'membrane', membraneGeometry);
      membraneManager.update(camera);

      const stats = membraneManager.getStats();
      expect(stats.lodDistribution[2]).toBe(1);
    });
  });
});
