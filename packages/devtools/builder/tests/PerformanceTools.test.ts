/**
 * Performance Tools Tests
 *
 * Unit tests for scene complexity analysis, render/memory estimation,
 * recommendation engine, profiler, snapshots, and budget system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeSceneComplexity,
  estimateRenderStats,
  estimateMemoryStats,
  generateRecommendations,
  getBudgetPreset,
  PerformanceProfiler,
  createProfiler,
} from '../src/PerformanceTools';
import { SceneManager } from '../src/VisualEditor';
import type { Scene } from '../src/VisualEditor';

describe('PerformanceTools', () => {
  let sceneManager: SceneManager;

  beforeEach(() => {
    sceneManager = new SceneManager('Performance Test Scene');
  });

  // Helper to build a populated scene
  function buildScene(nodeCount: number = 5): Scene {
    for (let i = 0; i < nodeCount; i++) {
      const node = sceneManager.createNode('mesh', `Object_${i}`);
      sceneManager.setNodeTransform(node.id, {
        position: { x: i * 2, y: 0, z: 0 },
      });
    }
    return sceneManager.getScene();
  }

  // ─── Budget Presets ───

  describe('getBudgetPreset', () => {
    it('should return VR budget preset', () => {
      const budget = getBudgetPreset('vr');
      expect(budget.maxTriangles).toBeDefined();
      expect(budget.maxDrawCalls).toBeDefined();
      expect(budget.targetFPS).toBeGreaterThanOrEqual(72);
    });

    it('should return mobile budget preset', () => {
      const budget = getBudgetPreset('mobile');
      expect(budget.maxTriangles).toBeLessThan(getBudgetPreset('desktop').maxTriangles);
      expect(budget.targetFPS).toBeGreaterThanOrEqual(30);
    });

    it('should return desktop budget preset', () => {
      const budget = getBudgetPreset('desktop');
      expect(budget.maxTriangles).toBeGreaterThan(getBudgetPreset('vr').maxTriangles);
    });

    it('VR should be more restrictive than desktop', () => {
      const vr = getBudgetPreset('vr');
      const desktop = getBudgetPreset('desktop');
      expect(vr.maxTriangles).toBeLessThan(desktop.maxTriangles);
      expect(vr.maxDrawCalls).toBeLessThan(desktop.maxDrawCalls);
    });
  });

  // ─── Scene Complexity Analysis ───

  describe('analyzeSceneComplexity', () => {
    it('should analyze an empty scene', () => {
      const scene = sceneManager.getScene();
      const result = analyzeSceneComplexity(scene);

      expect(result.objectCount).toBe(0);
      expect(result.complexityScore).toBe(0);
    });

    it('should count objects correctly', () => {
      const scene = buildScene(10);
      const result = analyzeSceneComplexity(scene);

      expect(result.objectCount).toBe(10);
    });

    it('should compute a complexity score', () => {
      const scene = buildScene(20);
      const result = analyzeSceneComplexity(scene);

      expect(result.complexityScore).toBeGreaterThan(0);
      expect(result.complexityScore).toBeLessThanOrEqual(100);
    });

    it('should track max depth for nested hierarchies', () => {
      const parent = sceneManager.createNode('group', 'Level1');
      sceneManager.createNode('mesh', 'Level2', parent.id);
      const scene = sceneManager.getScene();
      const result = analyzeSceneComplexity(scene);

      expect(result.maxDepth).toBeGreaterThanOrEqual(1);
    });

    it('should count components', () => {
      const node = sceneManager.createNode('mesh', 'CompNode');
      sceneManager.addComponent(node.id, 'vr_trait', { name: 'grabbable' });
      sceneManager.addComponent(node.id, 'vr_trait', { name: 'collidable' });

      const scene = sceneManager.getScene();
      const result = analyzeSceneComplexity(scene);

      expect(result.componentCount).toBeGreaterThanOrEqual(2);
      expect(result.traitCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── Render Stats Estimation ───

  describe('estimateRenderStats', () => {
    it('should estimate zero for empty scene', () => {
      const scene = sceneManager.getScene();
      const stats = estimateRenderStats(scene);

      expect(stats.triangles).toBe(0);
      expect(stats.drawCalls).toBe(0);
    });

    it('should estimate triangles for mesh nodes', () => {
      const scene = buildScene(5);
      const stats = estimateRenderStats(scene);

      expect(stats.triangles).toBeGreaterThan(0);
      expect(stats.drawCalls).toBeGreaterThan(0);
    });

    it('should scale with object count', () => {
      const sceneSmall = buildScene(2);
      const statsSmall = estimateRenderStats(sceneSmall);

      // Rebuild with more nodes
      sceneManager = new SceneManager('Large Scene');
      const sceneLarge = buildScene(20);
      const statsLarge = estimateRenderStats(sceneLarge);

      expect(statsLarge.triangles).toBeGreaterThan(statsSmall.triangles);
    });

    it('should count materials', () => {
      const scene = buildScene(3);
      const stats = estimateRenderStats(scene);

      expect(stats.materials).toBeGreaterThanOrEqual(0);
    });

    it('should count lights', () => {
      sceneManager.createNode('light', 'Light1');
      sceneManager.createNode('light', 'Light2');
      const scene = sceneManager.getScene();
      const stats = estimateRenderStats(scene);

      expect(stats.lights).toBe(2);
    });
  });

  // ─── Memory Stats Estimation ───

  describe('estimateMemoryStats', () => {
    it('should estimate zero for empty scene', () => {
      const scene = sceneManager.getScene();
      const stats = estimateMemoryStats(scene);

      expect(stats.totalBytes).toBe(0);
    });

    it('should estimate memory for populated scene', () => {
      const scene = buildScene(5);
      const stats = estimateMemoryStats(scene);

      expect(stats.totalBytes).toBeGreaterThan(0);
      expect(stats.geometryBytes).toBeGreaterThanOrEqual(0);
    });

    it('should increase with more objects', () => {
      const sceneSmall = buildScene(2);
      const small = estimateMemoryStats(sceneSmall);

      sceneManager = new SceneManager('Bigger');
      const sceneBig = buildScene(20);
      const big = estimateMemoryStats(sceneBig);

      expect(big.totalBytes).toBeGreaterThan(small.totalBytes);
    });
  });

  // ─── Recommendation Engine ───

  describe('generateRecommendations', () => {
    it('should return recommendations for a scene', () => {
      const scene = buildScene(5);
      const recs = generateRecommendations(scene);

      expect(recs).toBeInstanceOf(Array);
    });

    it('should include severity and description', () => {
      const scene = buildScene(5);
      const recs = generateRecommendations(scene);

      recs.forEach(rec => {
        expect(rec.severity).toBeDefined();
        expect(['info', 'warning', 'critical']).toContain(rec.severity);
        expect(rec.description).toBeDefined();
        expect(typeof rec.description).toBe('string');
      });
    });

    it('should flag high-object-count scenes', () => {
      // Create enough nodes to exceed VR budget (500 objects)
      const scene = buildScene(600);
      const recs = generateRecommendations(scene);

      // Should have at least one recommendation about object count or triangles
      expect(recs.length).toBeGreaterThan(0);
    });

    it('should return actionable recommendations', () => {
      const scene = buildScene(5);
      const recs = generateRecommendations(scene);

      recs.forEach(rec => {
        expect(rec.description.length).toBeGreaterThan(5);
      });
    });
  });

  // ─── Performance Profiler ───

  describe('PerformanceProfiler', () => {
    let profiler: PerformanceProfiler;

    beforeEach(() => {
      // createProfiler takes SceneManager, not Scene
      profiler = createProfiler(sceneManager);
    });

    it('should create a profiler instance', () => {
      expect(profiler).toBeDefined();
    });

    it('should submit frames and track FPS', () => {
      // submitFrame(frameTime, cpuTime?) takes numbers
      for (let i = 0; i < 60; i++) {
        profiler.submitFrame(16.67);
      }

      const fps = profiler.getCurrentFPS();
      expect(fps).toBeGreaterThan(0);
    });

    it('should get stats summary', () => {
      for (let i = 0; i < 30; i++) {
        profiler.submitFrame(16.0 + Math.random() * 2);
      }

      const summary = profiler.getStatsSummary();
      expect(summary).toBeDefined();
      expect(summary.avgFrameTime).toBeGreaterThan(0);
      expect(summary.avgFPS).toBeGreaterThan(0);
    });

    it('should start and stop recording', () => {
      const id = profiler.startRecording();
      expect(typeof id).toBe('string');

      for (let i = 0; i < 10; i++) {
        profiler.submitFrame(16.67);
      }

      const recording = profiler.stopRecording();
      expect(recording).toBeDefined();
      expect(recording).not.toBeNull();
      expect(recording!.frames).toBeDefined();
      expect(recording!.frames.length).toBe(10);
    });

    it('should return null when stopping without recording', () => {
      for (let i = 0; i < 5; i++) {
        profiler.submitFrame(16.67);
      }

      const recording = profiler.stopRecording();
      expect(recording).toBeNull();
    });

    // ─── Snapshots ───

    it('should take a snapshot', () => {
      // Add some scene content
      buildScene(5);

      for (let i = 0; i < 30; i++) {
        profiler.submitFrame(16.67);
      }

      const snapshot = profiler.takeSnapshot('Initial');
      expect(snapshot).toBeDefined();
      expect(snapshot.name).toBe('Initial');
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should compare two snapshots', () => {
      buildScene(5);

      for (let i = 0; i < 30; i++) {
        profiler.submitFrame(16.67);
      }

      const snap1 = profiler.takeSnapshot('Before');

      // Simulate performance change
      for (let i = 0; i < 30; i++) {
        profiler.submitFrame(33.33);
      }

      const snap2 = profiler.takeSnapshot('After');

      // compareSnapshots takes snapshot IDs
      const comparison = profiler.compareSnapshots(snap1.id, snap2.id);
      expect(comparison).toBeDefined();
      expect(comparison).not.toBeNull();
      expect(comparison!.before).toBeDefined();
      expect(comparison!.after).toBeDefined();
      expect(comparison!.deltas).toBeDefined();
    });

    // ─── Budget Checking ───

    it('should check against a budget', () => {
      buildScene(5);

      for (let i = 0; i < 30; i++) {
        profiler.submitFrame(16.67);
      }

      // checkBudget() uses the internal budget (set in constructor)
      const result = profiler.checkBudget();
      expect(result).toBeDefined();
      expect(result.withinBudget).toBeDefined();
      expect(typeof result.withinBudget).toBe('boolean');
    });

    it('should allow setting a custom budget', () => {
      buildScene(5);

      profiler.setBudget({
        maxTriangles: 10,
        maxDrawCalls: 1,
        maxTextureMemoryMB: 1,
        targetFPS: 120,
        maxObjects: 1,
        maxDepth: 1,
        maxScriptNodes: 1,
      });

      const result = profiler.checkBudget();
      // With such tight budget and 5 objects, should have violations
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.withinBudget).toBe(false);
    });

    // ─── Report Generation ───

    it('should generate a performance report', () => {
      buildScene(5);

      for (let i = 0; i < 30; i++) {
        profiler.submitFrame(16.67);
      }

      const report = profiler.generateReport();
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(50);
      expect(report).toContain('Performance');
    });

    // ─── Frame Listeners ───

    it('should support frame listeners', () => {
      const received: any[] = [];
      // onFrame returns an unsubscribe function
      const unsub = profiler.onFrame((stats) => received.push(stats));

      profiler.submitFrame(16.67);

      expect(received.length).toBe(1);
      expect(received[0].frameTime).toBe(16.67);
      expect(received[0].fps).toBeGreaterThan(0);

      unsub();
      profiler.submitFrame(16.67);
      expect(received.length).toBe(1); // no more after unsub
    });

    // ─── History ───

    it('should track frame history', () => {
      for (let i = 0; i < 10; i++) {
        profiler.submitFrame(16.67);
      }

      const history = profiler.getFrameHistory();
      expect(history.length).toBe(10);
    });

    it('should clear frame history', () => {
      for (let i = 0; i < 10; i++) {
        profiler.submitFrame(16.67);
      }

      profiler.clearHistory();
      expect(profiler.getFrameHistory().length).toBe(0);
    });
  });
});
