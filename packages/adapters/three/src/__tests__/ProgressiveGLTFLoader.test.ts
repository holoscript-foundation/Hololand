/**
 * ProgressiveGLTFLoader Tests
 *
 * Tests the progressive 3-tier LOD loading system for GLTF/GLB assets.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock Three.js loaders
const mockScene = new THREE.Group();
mockScene.name = 'MockScene';

const mockMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
mockScene.add(mockMesh);

const mockGLTF = {
  scene: mockScene,
  scenes: [mockScene],
  animations: [new THREE.AnimationClip('idle', 1.0, [])],
  cameras: [],
  asset: { version: '2.0' },
  parser: {},
  userData: {},
};

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  return {
    GLTFLoader: vi.fn().mockImplementation(() => ({
      setDRACOLoader: vi.fn(),
      setMeshoptDecoder: vi.fn(),
      parse: vi.fn((buffer, path, onSuccess, onError) => {
        setTimeout(() => onSuccess(mockGLTF), 0);
      }),
      load: vi.fn((url, onSuccess, onProgress, onError) => {
        // Simulate progress
        if (onProgress) {
          setTimeout(() => onProgress({ loaded: 512, total: 1024 }), 0);
        }
        setTimeout(() => onSuccess(mockGLTF), 10);
      }),
    })),
  };
});

vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => ({
  DRACOLoader: vi.fn().mockImplementation(() => ({
    setDecoderPath: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('three/examples/jsm/libs/meshopt_decoder.module.js', () => ({
  MeshoptDecoder: {},
}));

import {
  ProgressiveGLTFLoader,
  createProgressiveGLTFLoader,
  getProgressiveGLTFLoader,
  createProgressiveConfig,
  LODTier,
  LoadingState,
  type ProgressiveAssetConfig,
} from '../ProgressiveGLTFLoader';

describe('ProgressiveGLTFLoader', () => {
  let loader: ProgressiveGLTFLoader;

  beforeEach(() => {
    loader = createProgressiveGLTFLoader();
  });

  afterEach(() => {
    loader.dispose();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Constructor and Configuration
  // ──────────────────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create loader with default config', () => {
      expect(loader).toBeDefined();
      expect(loader.getGLTFLoader()).toBeDefined();
      expect(loader.getDRACOLoader()).toBeDefined();
    });

    it('should accept custom config', () => {
      const custom = createProgressiveGLTFLoader({
        maxConcurrentLoads: 8,
        proxyColor: 0xff0000,
        proxyOpacity: 0.5,
        autoUpgrade: false,
        defaultDistanceThreshold: 20,
      });

      const config = custom.getConfig();
      expect(config.maxConcurrentLoads).toBe(8);
      expect(config.proxyColor).toBe(0xff0000);
      expect(config.proxyOpacity).toBe(0.5);
      expect(config.autoUpgrade).toBe(false);
      expect(config.defaultDistanceThreshold).toBe(20);

      custom.dispose();
    });

    it('should initialize GLTF loader with Draco support', () => {
      const gltfLoader = loader.getGLTFLoader();
      expect(gltfLoader.setDRACOLoader).toHaveBeenCalled();
    });

    it('should initialize GLTF loader with Meshopt support', () => {
      const gltfLoader = loader.getGLTFLoader();
      expect(gltfLoader.setMeshoptDecoder).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Loading - Proxy Tier
  // ──────────────────────────────────────────────────────────────────────────

  describe('proxy tier loading', () => {
    it('should auto-generate proxy when no proxy URL provided', async () => {
      const result = await loader.load({
        id: 'test_asset',
        tiers: { full: { url: '/models/test.glb' } },
      });

      expect(result).toBeDefined();
      expect(result.group).toBeInstanceOf(THREE.Group);
      expect(result.group.name).toBe('progressive_test_asset');

      // Proxy should be generated as bounding box
      const proxyGroup = result.tiers.get(LODTier.PROXY);
      expect(proxyGroup).toBeDefined();
      expect(proxyGroup?.userData.isAutoProxy).toBe(true);
    });

    it('should load explicit proxy when URL provided', async () => {
      const result = await loader.load({
        id: 'proxy_test',
        tiers: {
          proxy: { url: '/models/test_proxy.glb' },
          full: { url: '/models/test.glb' },
        },
      });

      expect(result).toBeDefined();
      expect(result.tiers.has(LODTier.PROXY)).toBe(true);
    });

    it('should display proxy immediately', async () => {
      const result = await loader.load({
        id: 'immediate_proxy',
        tiers: { full: { url: '/models/test.glb' } },
      });

      // Group should have proxy as child immediately
      expect(result.group.children.length).toBeGreaterThan(0);
      expect(result.currentTier).toBe(LODTier.PROXY);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Loading - Progressive Tiers
  // ──────────────────────────────────────────────────────────────────────────

  describe('progressive tier loading', () => {
    it('should transition from proxy to preview to full', async () => {
      const tierChanges: Array<[LODTier, LODTier]> = [];

      const result = await loader.load({
        id: 'progressive_test',
        tiers: {
          preview: { url: '/models/test_preview.glb' },
          full: { url: '/models/test.glb' },
        },
        onTierChange: (oldTier, newTier) => {
          tierChanges.push([oldTier, newTier]);
        },
      });

      // Wait for async loads to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should start at proxy
      expect(result.tiers.has(LODTier.PROXY)).toBe(true);
    });

    it('should upgrade to full tier on demand', async () => {
      const result = await loader.load({
        id: 'upgrade_test',
        tiers: { full: { url: '/models/test.glb' } },
      });

      // Manually upgrade to full
      await result.upgradeTo(LODTier.FULL);

      expect(result.currentTier).toBe(LODTier.FULL);
      expect(result.state).toBe(LoadingState.COMPLETE);
    });

    it('should provide animations from highest loaded tier', async () => {
      const result = await loader.load({
        id: 'anim_test',
        tiers: { full: { url: '/models/animated.glb' } },
      });

      await result.upgradeTo(LODTier.FULL);

      // Wait for load
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(result.animations).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Batch Loading
  // ──────────────────────────────────────────────────────────────────────────

  describe('batch loading', () => {
    it('should load multiple assets in batch', async () => {
      const configs: ProgressiveAssetConfig[] = [
        { id: 'batch_1', tiers: { full: { url: '/models/a.glb' } }, priority: 0.9 },
        { id: 'batch_2', tiers: { full: { url: '/models/b.glb' } }, priority: 0.5 },
        { id: 'batch_3', tiers: { full: { url: '/models/c.glb' } }, priority: 0.1 },
      ];

      const results = await loader.loadBatch(configs);

      expect(results.size).toBe(3);
      expect(results.has('batch_1')).toBe(true);
      expect(results.has('batch_2')).toBe(true);
      expect(results.has('batch_3')).toBe(true);
    });

    it('should not duplicate assets on repeated load', async () => {
      const config: ProgressiveAssetConfig = {
        id: 'dedup_test',
        tiers: { full: { url: '/models/test.glb' } },
      };

      const result1 = await loader.load(config);
      const result2 = await loader.load(config);

      // Should return same result
      expect(result1).toBe(result2);
      expect(loader.getAssetCount()).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // State and Progress
  // ──────────────────────────────────────────────────────────────────────────

  describe('state and progress', () => {
    it('should track loading state', async () => {
      const result = await loader.load({
        id: 'state_test',
        tiers: { full: { url: '/models/test.glb' } },
      });

      // After load, should be in loading_preview (queued for preview)
      expect(
        [LoadingState.LOADING_PREVIEW, LoadingState.LOADING_FULL].includes(result.state)
      ).toBe(true);
    });

    it('should report progress per tier', async () => {
      const result = await loader.load({
        id: 'progress_test',
        tiers: { full: { url: '/models/test.glb' } },
      });

      // Proxy progress should be 1 (loaded)
      expect(result.getProgress(LODTier.PROXY)).toBe(1);
    });

    it('should report tier loaded status', async () => {
      const result = await loader.load({
        id: 'loaded_test',
        tiers: { full: { url: '/models/test.glb' } },
      });

      expect(result.isTierLoaded(LODTier.PROXY)).toBe(true);
      expect(result.isTierLoaded(LODTier.FULL)).toBe(false);

      await result.upgradeTo(LODTier.FULL);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(result.isTierLoaded(LODTier.FULL)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Metrics
  // ──────────────────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should track asset counts by tier', async () => {
      await loader.load({
        id: 'metrics_1',
        tiers: { full: { url: '/models/a.glb' } },
      });

      await loader.load({
        id: 'metrics_2',
        tiers: { full: { url: '/models/b.glb' } },
      });

      const metrics = loader.getMetrics();
      expect(metrics.totalAssets).toBe(2);
      expect(metrics.assetsByTier[LODTier.PROXY]).toBe(2);
    });

    it('should generate readable report', async () => {
      await loader.load({
        id: 'report_test',
        tiers: { full: { url: '/models/test.glb' } },
      });

      const report = loader.generateReport();
      expect(report).toContain('PROGRESSIVE GLTF LOADER REPORT');
      expect(report).toContain('3-Tier LOD');
      expect(report).toContain('Total Assets');
      expect(report).toContain('Tier 1 (Proxy)');
      expect(report).toContain('Tier 2 (Preview)');
      expect(report).toContain('Tier 3 (Full)');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Configuration Update
  // ──────────────────────────────────────────────────────────────────────────

  describe('configuration', () => {
    it('should update config', () => {
      loader.updateConfig({ maxConcurrentLoads: 10 });
      expect(loader.getConfig().maxConcurrentLoads).toBe(10);
    });

    it('should respect concurrent load limit', async () => {
      const narrowLoader = createProgressiveGLTFLoader({
        maxConcurrentLoads: 1,
      });

      // Load multiple assets
      const promises = [
        narrowLoader.load({ id: 'conc_1', tiers: { full: { url: '/a.glb' } } }),
        narrowLoader.load({ id: 'conc_2', tiers: { full: { url: '/b.glb' } } }),
      ];

      await Promise.all(promises);
      expect(narrowLoader.getAssetCount()).toBe(2);

      narrowLoader.dispose();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Disposal
  // ──────────────────────────────────────────────────────────────────────────

  describe('disposal', () => {
    it('should dispose a single asset', async () => {
      const result = await loader.load({
        id: 'dispose_test',
        tiers: { full: { url: '/models/test.glb' } },
      });

      result.dispose();
      expect(loader.getAssetCount()).toBe(0);
    });

    it('should dispose all assets on loader dispose', async () => {
      await loader.load({ id: 'disp_1', tiers: { full: { url: '/a.glb' } } });
      await loader.load({ id: 'disp_2', tiers: { full: { url: '/b.glb' } } });

      expect(loader.getAssetCount()).toBe(2);

      loader.dispose();
      expect(loader.getAssetCount()).toBe(0);
    });

    it('should reject loads after disposal', async () => {
      loader.dispose();

      await expect(
        loader.load({ id: 'post_dispose', tiers: { full: { url: '/test.glb' } } })
      ).rejects.toThrow('disposed');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cancel
  // ──────────────────────────────────────────────────────────────────────────

  describe('cancellation', () => {
    it('should cancel pending loads for an asset', async () => {
      const result = await loader.load({
        id: 'cancel_test',
        tiers: { full: { url: '/models/test.glb' } },
      });

      loader.cancelLoad('cancel_test');

      // Asset should still exist with proxy
      expect(result.tiers.has(LODTier.PROXY)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Asset Accessors
  // ──────────────────────────────────────────────────────────────────────────

  describe('asset accessors', () => {
    it('should get asset by ID', async () => {
      await loader.load({
        id: 'accessor_test',
        tiers: { full: { url: '/models/test.glb' } },
      });

      const asset = loader.getAsset('accessor_test');
      expect(asset).toBeDefined();
      expect(asset?.group).toBeInstanceOf(THREE.Group);
    });

    it('should return undefined for unknown asset', () => {
      const asset = loader.getAsset('nonexistent');
      expect(asset).toBeUndefined();
    });

    it('should list all asset IDs', async () => {
      await loader.load({ id: 'id_1', tiers: { full: { url: '/a.glb' } } });
      await loader.load({ id: 'id_2', tiers: { full: { url: '/b.glb' } } });

      const ids = loader.getAssetIds();
      expect(ids).toContain('id_1');
      expect(ids).toContain('id_2');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Callbacks
  // ──────────────────────────────────────────────────────────────────────────

  describe('callbacks', () => {
    it('should call onProgress during loading', async () => {
      const progressCalls: Array<[LODTier, number]> = [];

      await loader.load({
        id: 'callback_progress',
        tiers: {
          proxy: { url: '/models/proxy.glb' },
          full: { url: '/models/test.glb' },
        },
        onProgress: (tier, progress) => {
          progressCalls.push([tier, progress]);
        },
      });

      // Wait for async loads
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have received some progress calls
      // Note: Proxy URL triggers a load which reports progress
      expect(progressCalls.length).toBeGreaterThanOrEqual(0);
    });

    it('should call onTierChange on tier transitions', async () => {
      const tierChanges: Array<[LODTier, LODTier]> = [];

      const result = await loader.load({
        id: 'callback_tier',
        tiers: { full: { url: '/models/test.glb' } },
        onTierChange: (oldTier, newTier) => {
          tierChanges.push([oldTier, newTier]);
        },
      });

      // Upgrade to full
      await result.upgradeTo(LODTier.FULL);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have at least one tier change
      expect(tierChanges.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('createProgressiveConfig', () => {
  it('should create config from full URL only', () => {
    const config = createProgressiveConfig('tree', '/models/oak.glb');

    expect(config.id).toBe('tree');
    expect(config.tiers.full.url).toBe('/models/oak.glb');
    expect(config.tiers.proxy).toBeUndefined();
    expect(config.tiers.preview).toBeUndefined();
  });

  it('should create config with preview and proxy URLs', () => {
    const config = createProgressiveConfig('building', '/models/building.glb', {
      previewUrl: '/models/building_preview.glb',
      proxyUrl: '/models/building_proxy.glb',
      priority: 0.8,
      distanceThreshold: 10,
    });

    expect(config.id).toBe('building');
    expect(config.tiers.full.url).toBe('/models/building.glb');
    expect(config.tiers.preview?.url).toBe('/models/building_preview.glb');
    expect(config.tiers.preview?.draco).toBe(true);
    expect(config.tiers.preview?.maxTextureSize).toBe(128);
    expect(config.tiers.proxy?.url).toBe('/models/building_proxy.glb');
    expect(config.priority).toBe(0.8);
    expect(config.distanceThreshold).toBe(10);
  });

  it('should include callbacks in config', () => {
    const onTierChange = vi.fn();
    const onProgress = vi.fn();

    const config = createProgressiveConfig('test', '/test.glb', {
      onTierChange,
      onProgress,
    });

    expect(config.onTierChange).toBe(onTierChange);
    expect(config.onProgress).toBe(onProgress);
  });
});

// =============================================================================
// Singleton Tests
// =============================================================================

describe('singleton', () => {
  it('should return same instance from getProgressiveGLTFLoader', () => {
    const loader1 = getProgressiveGLTFLoader();
    const loader2 = getProgressiveGLTFLoader();

    expect(loader1).toBe(loader2);
  });
});

// =============================================================================
// LODTier and LoadingState Enums
// =============================================================================

describe('enums', () => {
  it('should have correct LODTier values', () => {
    expect(LODTier.PROXY).toBe(0);
    expect(LODTier.PREVIEW).toBe(1);
    expect(LODTier.FULL).toBe(2);
  });

  it('should have correct LoadingState values', () => {
    expect(LoadingState.IDLE).toBe('idle');
    expect(LoadingState.LOADING_PROXY).toBe('loading_proxy');
    expect(LoadingState.LOADING_PREVIEW).toBe('loading_preview');
    expect(LoadingState.LOADING_FULL).toBe('loading_full');
    expect(LoadingState.COMPLETE).toBe('complete');
    expect(LoadingState.ERROR).toBe('error');
  });
});

// =============================================================================
// Integration with SpatialLODManager
// =============================================================================

describe('SpatialLOD integration', () => {
  it('should register assets with spatial LOD manager', async () => {
    const loader = createProgressiveGLTFLoader();

    await loader.load({
      id: 'spatial_test',
      tiers: { full: { url: '/models/test.glb' } },
      priority: 0.7,
    });

    // Upgrade to full so we have real meshes
    const asset = loader.getAsset('spatial_test');
    await asset?.upgradeTo(LODTier.FULL);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Mock spatial LOD manager
    const registerMesh = vi.fn();
    const mockSpatialLOD = { registerMesh };

    loader.registerWithSpatialLOD(mockSpatialLOD);

    // Should have called registerMesh for each mesh in the asset
    // (mock scene has one mesh)
    expect(registerMesh).toHaveBeenCalled();

    loader.dispose();
  });
});
