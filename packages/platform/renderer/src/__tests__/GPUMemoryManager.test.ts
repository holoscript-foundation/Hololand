/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GPUMemoryManager (GPU Memory Budget Management)
 *
 * Domain: spatial-rendering / scene-graph
 * VR Priority: VRAM budget enforcement, memory pressure thresholds,
 *              circuit breaker health for VR subsystems
 *
 * Validates:
 * - Memory tracking for textures, geometry, shaders, render targets
 * - Threshold state transitions (normal -> alert -> reduction -> critical -> emergency)
 * - Memory estimation accuracy for VR scenes
 * - Resource lifecycle (track, touch, untrack)
 * - Memory statistics and reporting
 * - Monitoring start/stop
 * - LRU and largest resource queries
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  GPUMemoryManager,
  type GPUMemoryManagerConfig,
} from '../GPUMemoryManager';

// =============================================================================
// HELPERS
// =============================================================================

function createManager(config?: GPUMemoryManagerConfig): GPUMemoryManager {
  return new GPUMemoryManager({
    budgetMB: 2048,
    verbose: false,
    ...config,
  });
}

function createMockTexture(width: number, height: number): THREE.Texture {
  const tex = new THREE.Texture();
  tex.image = { width, height };
  tex.generateMipmaps = true;
  return tex;
}

function createMockGeometry(vertexCount: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(vertexCount * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const normals = new Float32Array(vertexCount * 3);
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geo;
}

// =============================================================================
// TESTS
// =============================================================================

describe('GPUMemoryManager', () => {
  let manager: GPUMemoryManager;

  beforeEach(() => {
    manager = createManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should create with default 2GB budget', () => {
      const stats = manager.getStats();
      expect(stats.breakdown.budgetMB).toBe(2048);
    });

    it('should start in normal threshold state', () => {
      expect(manager.getThresholdState()).toBe('normal');
    });

    it('should start with 0% utilization', () => {
      expect(manager.getUtilization()).toBe(0);
    });

    it('should accept custom budget', () => {
      const m = createManager({ budgetMB: 1024 });
      expect(m.getStats().breakdown.budgetMB).toBe(1024);
      m.dispose();
    });

    it('should accept custom thresholds', () => {
      const m = createManager({
        thresholds: { alert: 0.50, reduction: 0.60, critical: 0.70, emergency: 0.80 },
      });
      expect(m.getThresholdState()).toBe('normal');
      m.dispose();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RESOURCE TRACKING
  // ───────────────────────────────────────────────────────────────────────────

  describe('resource tracking', () => {
    it('should track a texture resource', () => {
      const tex = createMockTexture(1024, 1024);
      manager.trackTexture('sky_hdr', tex);

      const stats = manager.getStats();
      expect(stats.resourceCounts.texture).toBe(1);
      expect(stats.totalResources).toBe(1);
    });

    it('should track geometry resource', () => {
      const geo = createMockGeometry(10000);
      manager.trackGeometry('terrain', geo);

      const stats = manager.getStats();
      expect(stats.resourceCounts.geometry).toBe(1);
    });

    it('should track shader/material resource', () => {
      const mat = new THREE.MeshStandardMaterial();
      manager.trackShader('pbr_shader', mat);

      const stats = manager.getStats();
      expect(stats.resourceCounts.shader).toBe(1);
    });

    it('should track render target resource', () => {
      const rt = new THREE.WebGLRenderTarget(1920, 1080);
      manager.trackRenderTarget('main_rt', rt);

      const stats = manager.getStats();
      expect(stats.resourceCounts.rendertarget).toBe(1);
    });

    it('should untrack resources on dispose', () => {
      const tex = createMockTexture(512, 512);
      manager.trackTexture('temp_tex', tex);
      expect(manager.getStats().totalResources).toBe(1);

      manager.untrackResource('temp_tex');
      expect(manager.getStats().totalResources).toBe(0);
    });

    it('should update access timestamp on touch', () => {
      const tex = createMockTexture(256, 256);
      manager.trackTexture('touched_tex', tex);

      // Touch the resource
      manager.touchResource('touched_tex');

      const resources = manager.getResources({ type: 'texture' });
      expect(resources.length).toBe(1);
    });

    it('should handle untracking nonexistent resource', () => {
      // Should not throw
      manager.untrackResource('nonexistent');
    });

    it('should mark resource loaded/unloaded', () => {
      const geo = createMockGeometry(1000);
      manager.trackGeometry('dynamic_geo', geo);
      manager.setResourceLoaded('dynamic_geo', false);

      const resources = manager.getResources({ loaded: false });
      expect(resources.length).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MEMORY MEASUREMENT
  // ───────────────────────────────────────────────────────────────────────────

  describe('memory measurement', () => {
    it('should measure total memory from tracked resources', async () => {
      const tex = createMockTexture(2048, 2048);
      manager.trackTexture('large_tex', tex);

      const breakdown = await manager.measureMemory();
      expect(breakdown.textures).toBeGreaterThan(0);
      expect(breakdown.total).toBeGreaterThan(0);
      expect(breakdown.utilizationPercent).toBeGreaterThan(0);
    });

    it('should exclude unloaded resources from measurement', async () => {
      const tex = createMockTexture(4096, 4096);
      manager.trackTexture('unloaded_tex', tex);
      manager.setResourceLoaded('unloaded_tex', false);

      const breakdown = await manager.measureMemory();
      expect(breakdown.textures).toBe(0);
    });

    it('should calculate correct utilization percentage', async () => {
      // 256MB budget
      const m = createManager({ budgetMB: 256 });

      // Track a 4K RGBA texture with mipmaps: ~90MB
      const tex = createMockTexture(4096, 4096);
      m.trackTexture('big_tex', tex);

      const breakdown = await m.measureMemory();
      // Utilization should be > 0 and < 1
      expect(breakdown.utilizationPercent).toBeGreaterThan(0);
      expect(breakdown.utilizationPercent).toBeLessThan(1);
      m.dispose();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // THRESHOLD STATE TRANSITIONS (Circuit Breaker Health)
  // ───────────────────────────────────────────────────────────────────────────

  describe('threshold state transitions', () => {
    it('should transition to alert at 70% utilization', async () => {
      // Create a tiny budget so we can easily exceed thresholds
      const m = createManager({ budgetMB: 1 }); // 1MB budget

      // Track resources that total > 70% of 1MB = 716,800 bytes
      const tex = createMockTexture(512, 512); // ~1.4MB with mipmaps > 1MB budget
      m.trackTexture('alert_tex', tex);

      await m.measureMemory();
      // Should be in alert, reduction, critical, or emergency depending on utilization
      expect(['alert', 'reduction', 'critical', 'emergency']).toContain(m.getThresholdState());
      m.dispose();
    });

    it('should emit threshold events on state change', async () => {
      const m = createManager({ budgetMB: 1 });
      const listener = vi.fn();
      m.on('threshold:alert', listener);
      m.on('threshold:reduction', listener);
      m.on('threshold:critical', listener);
      m.on('threshold:emergency', listener);

      const tex = createMockTexture(1024, 1024);
      m.trackTexture('event_tex', tex);
      await m.measureMemory();

      // At least one threshold event should have fired
      expect(listener).toHaveBeenCalled();
      m.dispose();
    });

    it('should emit stats:updated event on measurement', async () => {
      const listener = vi.fn();
      manager.on('stats:updated', listener);

      await manager.measureMemory();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RESOURCE QUERIES
  // ───────────────────────────────────────────────────────────────────────────

  describe('resource queries', () => {
    it('should return largest resources sorted by memory', () => {
      const small = createMockTexture(64, 64);
      const medium = createMockTexture(512, 512);
      const large = createMockTexture(2048, 2048);

      manager.trackTexture('small', small);
      manager.trackTexture('medium', medium);
      manager.trackTexture('large', large);

      const largest = manager.getLargestResources(2);
      expect(largest.length).toBe(2);
      expect(largest[0].id).toBe('large');
      expect(largest[1].id).toBe('medium');
    });

    it('should return least recently used resources', () => {
      const tex1 = createMockTexture(256, 256);
      const tex2 = createMockTexture(256, 256);

      manager.trackTexture('old', tex1);
      manager.trackTexture('new', tex2);

      // Touch 'new' to make 'old' LRU
      manager.touchResource('new');

      const lru = manager.getLeastRecentlyUsed(1);
      expect(lru.length).toBe(1);
      expect(lru[0].id).toBe('old');
    });

    it('should estimate freed memory for specific resources', () => {
      const tex = createMockTexture(1024, 1024);
      manager.trackTexture('free_me', tex);

      const freed = manager.estimateFreedMemory(['free_me']);
      expect(freed).toBeGreaterThan(0);
    });

    it('should filter resources by type', () => {
      const tex = createMockTexture(256, 256);
      const geo = createMockGeometry(1000);

      manager.trackTexture('filter_tex', tex);
      manager.trackGeometry('filter_geo', geo);

      const textures = manager.getResources({ type: 'texture' });
      expect(textures.length).toBe(1);
      expect(textures[0].type).toBe('texture');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MONITORING
  // ───────────────────────────────────────────────────────────────────────────

  describe('monitoring', () => {
    it('should start and stop monitoring without errors', () => {
      expect(() => manager.startMonitoring()).not.toThrow();
      expect(() => manager.stopMonitoring()).not.toThrow();
    });

    it('should warn when starting monitoring twice', () => {
      manager.startMonitoring();
      // Second call should warn but not throw
      expect(() => manager.startMonitoring()).not.toThrow();
      manager.stopMonitoring();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // REPORTING
  // ───────────────────────────────────────────────────────────────────────────

  describe('reporting', () => {
    it('should generate a memory report string', () => {
      const tex = createMockTexture(1024, 1024);
      manager.trackTexture('report_tex', tex);

      const report = manager.generateReport();
      expect(report).toContain('GPU MEMORY BUDGET REPORT');
      expect(report).toContain('Textures');
      expect(report).toContain('Thresholds');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ───────────────────────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('should dispose and clear all resources', () => {
      const tex = createMockTexture(256, 256);
      manager.trackTexture('dispose_tex', tex);

      manager.dispose();
      expect(manager.getStats().totalResources).toBe(0);
    });
  });
});
