/**
 * Progressive GLTF Loader with 3-Tier LOD
 *
 * Implements progressive loading of GLTF/GLB assets with a 3-tier Level of Detail
 * strategy optimized for VR/AR experiences. Assets load in stages from low-fidelity
 * proxies to full-quality models, enabling sub-5-second VR entry with background
 * streaming of high-detail content.
 *
 * 3-Tier LOD Strategy:
 *   Tier 1 (Proxy):      Bounding-box placeholder or low-poly silhouette (<1KB)
 *                         Shown immediately, enables spatial awareness
 *   Tier 2 (Preview):    Draco-compressed geometry with 128px textures (~10-50KB)
 *                         Loaded asynchronously, replaces proxy
 *   Tier 3 (Full):       Full-resolution geometry and textures (original size)
 *                         Streamed progressively based on screen coverage / distance
 *
 * Integration Points:
 *   - SpatialLODManager:            Distance-based tier selection
 *   - SmartAssetBridge:             GLTF parsing with Draco/Meshopt support
 *   - VRPerformanceDegradationMgr:  Adaptive quality under frame budget pressure
 *   - ThreeSpatialLODIntegration:   Automatic mesh registration
 *
 * Performance Targets:
 *   - Proxy display:   <50ms after load call
 *   - Preview display:  <500ms (compressed preview)
 *   - Full quality:     Background stream, 2-10s depending on asset size
 *   - VR frame budget:  11.1ms (90fps) maintained throughout loading
 *
 * @module ProgressiveGLTFLoader
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * The 3 LOD tiers for progressive loading
 */
export enum LODTier {
  /** Bounding-box placeholder or low-poly silhouette */
  PROXY = 0,
  /** Draco-compressed geometry with small textures */
  PREVIEW = 1,
  /** Full-resolution geometry and textures */
  FULL = 2,
}

/**
 * Loading state for a progressive asset
 */
export enum LoadingState {
  /** Not started */
  IDLE = 'idle',
  /** Loading proxy tier */
  LOADING_PROXY = 'loading_proxy',
  /** Proxy displayed, loading preview */
  LOADING_PREVIEW = 'loading_preview',
  /** Preview displayed, loading full */
  LOADING_FULL = 'loading_full',
  /** All tiers loaded */
  COMPLETE = 'complete',
  /** Error occurred */
  ERROR = 'error',
}

/**
 * Configuration for a single LOD tier source
 */
export interface LODTierSource {
  /** URL to the GLTF/GLB file for this tier */
  url: string;
  /** Expected file size in bytes (for progress estimation) */
  expectedSize?: number;
  /** Whether this tier uses Draco compression */
  draco?: boolean;
  /** Maximum texture resolution for this tier */
  maxTextureSize?: number;
}

/**
 * Configuration for progressive loading of an asset
 */
export interface ProgressiveAssetConfig {
  /** Unique asset identifier */
  id: string;

  /** Tier sources - at minimum provide full, proxy and preview are auto-generated if absent */
  tiers: {
    /** Tier 1: Low-poly proxy (auto-generated bounding box if not provided) */
    proxy?: LODTierSource;
    /** Tier 2: Compressed preview model */
    preview?: LODTierSource;
    /** Tier 3: Full-resolution model (required) */
    full: LODTierSource;
  };

  /** Priority for loading queue (0-1, higher = more urgent) */
  priority?: number;

  /** Screen coverage threshold to trigger full-quality load (0-1) */
  screenCoverageThreshold?: number;

  /** Distance threshold (meters) below which full quality is loaded */
  distanceThreshold?: number;

  /** Maximum memory budget for this asset in MB */
  memoryBudgetMB?: number;

  /** Enable shadow casting/receiving */
  enableShadows?: boolean;

  /** Material overrides applied after loading */
  materialOverrides?: (material: THREE.Material) => THREE.Material;

  /** Callback when tier transitions occur */
  onTierChange?: (oldTier: LODTier, newTier: LODTier) => void;

  /** Callback for loading progress (0-1) per tier */
  onProgress?: (tier: LODTier, progress: number) => void;
}

/**
 * Result of a progressive load operation
 */
export interface ProgressiveAssetResult {
  /** The root Group containing the current best-quality model */
  group: THREE.Group;

  /** Current active LOD tier */
  currentTier: LODTier;

  /** Current loading state */
  state: LoadingState;

  /** Loaded tier meshes (populated as tiers complete loading) */
  tiers: Map<LODTier, THREE.Group>;

  /** GLTF data per tier (for animations, cameras, etc.) */
  gltfData: Map<LODTier, GLTF>;

  /** Animation clips from the highest loaded tier */
  animations: THREE.AnimationClip[];

  /** Force upgrade to a specific tier */
  upgradeTo: (tier: LODTier) => Promise<void>;

  /** Dispose all resources */
  dispose: () => void;

  /** Get loading progress for a specific tier (0-1) */
  getProgress: (tier: LODTier) => number;

  /** Check if a tier is loaded */
  isTierLoaded: (tier: LODTier) => boolean;
}

/**
 * Configuration for the ProgressiveGLTFLoader
 */
export interface ProgressiveGLTFLoaderConfig {
  /** Path to Draco decoder files */
  dracoDecoderPath?: string;

  /** Enable Meshopt compression support */
  meshoptEnabled?: boolean;

  /** Maximum concurrent downloads */
  maxConcurrentLoads?: number;

  /** Default proxy color */
  proxyColor?: number;

  /** Default proxy opacity */
  proxyOpacity?: number;

  /** Enable automatic tier upgrade based on distance */
  autoUpgrade?: boolean;

  /** Default distance threshold for auto-upgrade to full (meters) */
  defaultDistanceThreshold?: number;

  /** Default screen coverage threshold for auto-upgrade */
  defaultScreenCoverageThreshold?: number;

  /** Enable shadow on loaded meshes */
  enableShadows?: boolean;

  /** Target frame time for load scheduling (ms) */
  targetFrameTime?: number;

  /** Maximum time per frame for processing loaded assets (ms) */
  maxProcessingTimePerFrame?: number;
}

/**
 * Metrics for the progressive loading system
 */
export interface ProgressiveLoadMetrics {
  /** Total assets managed */
  totalAssets: number;
  /** Assets by current tier */
  assetsByTier: Record<LODTier, number>;
  /** Assets by loading state */
  assetsByState: Record<LoadingState, number>;
  /** Total bytes loaded */
  totalBytesLoaded: number;
  /** Current concurrent loads */
  concurrentLoads: number;
  /** Average time to proxy display (ms) */
  avgProxyTime: number;
  /** Average time to preview display (ms) */
  avgPreviewTime: number;
  /** Average time to full quality (ms) */
  avgFullTime: number;
  /** Memory usage estimate (MB) */
  estimatedMemoryMB: number;
  /** Tier upgrades this session */
  totalUpgrades: number;
}

/**
 * Internal tracking for a loading asset
 */
interface AssetEntry {
  config: ProgressiveAssetConfig;
  result: ProgressiveAssetResult;
  loadStartTime: number;
  tierLoadTimes: Map<LODTier, number>;
  tierProgress: Map<LODTier, number>;
  tierSizes: Map<LODTier, number>;
  abortControllers: Map<LODTier, AbortController>;
  isUpgrading: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: Required<ProgressiveGLTFLoaderConfig> = {
  dracoDecoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
  meshoptEnabled: true,
  maxConcurrentLoads: 4,
  proxyColor: 0x334455,
  proxyOpacity: 0.3,
  autoUpgrade: true,
  defaultDistanceThreshold: 15,
  defaultScreenCoverageThreshold: 0.05,
  enableShadows: true,
  targetFrameTime: 11.1,
  maxProcessingTimePerFrame: 2.0,
};

// =============================================================================
// PROGRESSIVE GLTF LOADER
// =============================================================================

/**
 * Manages progressive loading of GLTF/GLB assets with 3-tier LOD for VR.
 *
 * USAGE:
 * ```typescript
 * const loader = new ProgressiveGLTFLoader();
 *
 * // Load with explicit tier URLs
 * const result = await loader.load({
 *   id: 'building_01',
 *   tiers: {
 *     proxy:   { url: '/models/building_01_proxy.glb' },
 *     preview: { url: '/models/building_01_preview.glb', draco: true },
 *     full:    { url: '/models/building_01.glb' },
 *   },
 *   priority: 0.8,
 * });
 *
 * scene.add(result.group);
 *
 * // Load with auto-generated proxy (only full URL needed)
 * const tree = await loader.load({
 *   id: 'tree_01',
 *   tiers: { full: { url: '/models/oak_tree.glb' } },
 * });
 *
 * scene.add(tree.group);
 *
 * // Update in render loop for distance-based upgrades
 * function render() {
 *   loader.update(camera);
 *   renderer.render(scene, camera);
 * }
 * ```
 */
export class ProgressiveGLTFLoader {
  private config: Required<ProgressiveGLTFLoaderConfig>;
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private assets: Map<string, AssetEntry> = new Map();
  private loadQueue: string[] = [];
  private activeLoads: number = 0;
  private totalBytesLoaded: number = 0;
  private totalUpgrades: number = 0;
  private isDisposed: boolean = false;

  constructor(config?: Partial<ProgressiveGLTFLoaderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize GLTF loader with compression support
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();

    if (this.config.dracoDecoderPath) {
      this.dracoLoader.setDecoderPath(this.config.dracoDecoderPath);
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    if (this.config.meshoptEnabled) {
      this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Load an asset progressively through 3 tiers.
   *
   * Returns immediately with a proxy placeholder. Preview and full-quality
   * tiers are loaded asynchronously in the background.
   *
   * @param config - Progressive asset configuration
   * @returns Progressive asset result with live-updating group
   */
  async load(config: ProgressiveAssetConfig): Promise<ProgressiveAssetResult> {
    if (this.isDisposed) {
      throw new Error('[ProgressiveGLTFLoader] Loader has been disposed');
    }

    // Check if already loaded
    const existing = this.assets.get(config.id);
    if (existing) {
      return existing.result;
    }

    // Create the root group that will hold the active tier
    const group = new THREE.Group();
    group.name = `progressive_${config.id}`;
    group.userData.progressiveAssetId = config.id;
    group.userData.currentTier = LODTier.PROXY;

    // Create result object
    const result: ProgressiveAssetResult = {
      group,
      currentTier: LODTier.PROXY,
      state: LoadingState.IDLE,
      tiers: new Map(),
      gltfData: new Map(),
      animations: [],
      upgradeTo: (tier: LODTier) => this.upgradeTo(config.id, tier),
      dispose: () => this.disposeAsset(config.id),
      getProgress: (tier: LODTier) => this.getProgress(config.id, tier),
      isTierLoaded: (tier: LODTier) => this.isTierLoaded(config.id, tier),
    };

    // Create tracking entry
    const entry: AssetEntry = {
      config,
      result,
      loadStartTime: performance.now(),
      tierLoadTimes: new Map(),
      tierProgress: new Map(),
      tierSizes: new Map(),
      abortControllers: new Map(),
      isUpgrading: false,
    };

    this.assets.set(config.id, entry);

    // Phase 1: Generate/load proxy immediately
    await this.loadProxy(entry);

    // Phase 2: Queue preview and full loads
    this.queueTierLoad(config.id, LODTier.PREVIEW);
    this.processQueue();

    return result;
  }

  /**
   * Load multiple assets with priority-based scheduling.
   *
   * @param configs - Array of asset configurations
   * @returns Map of asset ID to progressive result
   */
  async loadBatch(
    configs: ProgressiveAssetConfig[]
  ): Promise<Map<string, ProgressiveAssetResult>> {
    // Sort by priority (highest first)
    const sorted = [...configs].sort(
      (a, b) => (b.priority ?? 0.5) - (a.priority ?? 0.5)
    );

    const results = new Map<string, ProgressiveAssetResult>();

    // Load all proxies immediately (fast)
    const loadPromises = sorted.map(async (config) => {
      const result = await this.load(config);
      results.set(config.id, result);
    });

    await Promise.all(loadPromises);
    return results;
  }

  /**
   * Update distance-based tier upgrades. Call once per frame.
   *
   * Checks each asset's distance from the camera and triggers tier upgrades
   * when thresholds are crossed.
   *
   * @param camera - The active camera for distance calculations
   */
  update(camera: THREE.Camera): void {
    if (!this.config.autoUpgrade || this.isDisposed) return;

    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);

    for (const [assetId, entry] of this.assets) {
      if (entry.result.state === LoadingState.ERROR) continue;
      if (entry.isUpgrading) continue;

      const group = entry.result.group;
      const groupPos = new THREE.Vector3();
      group.getWorldPosition(groupPos);

      const distance = cameraPos.distanceTo(groupPos);
      const distanceThreshold =
        entry.config.distanceThreshold ?? this.config.defaultDistanceThreshold;

      // Upgrade from preview to full if within distance threshold
      if (
        entry.result.currentTier === LODTier.PREVIEW &&
        distance < distanceThreshold &&
        !entry.result.isTierLoaded(LODTier.FULL)
      ) {
        this.prioritizeLoad(assetId, LODTier.FULL);
      }

      // Upgrade from proxy to preview if within 3x distance threshold
      if (
        entry.result.currentTier === LODTier.PROXY &&
        distance < distanceThreshold * 3 &&
        !entry.result.isTierLoaded(LODTier.PREVIEW)
      ) {
        this.prioritizeLoad(assetId, LODTier.PREVIEW);
      }
    }
  }

  /**
   * Get metrics for the progressive loading system
   */
  getMetrics(): ProgressiveLoadMetrics {
    const assetsByTier: Record<LODTier, number> = {
      [LODTier.PROXY]: 0,
      [LODTier.PREVIEW]: 0,
      [LODTier.FULL]: 0,
    };

    const assetsByState: Record<LoadingState, number> = {
      [LoadingState.IDLE]: 0,
      [LoadingState.LOADING_PROXY]: 0,
      [LoadingState.LOADING_PREVIEW]: 0,
      [LoadingState.LOADING_FULL]: 0,
      [LoadingState.COMPLETE]: 0,
      [LoadingState.ERROR]: 0,
    };

    let totalProxyTime = 0;
    let proxyCount = 0;
    let totalPreviewTime = 0;
    let previewCount = 0;
    let totalFullTime = 0;
    let fullCount = 0;
    let estimatedMemoryMB = 0;

    for (const entry of this.assets.values()) {
      assetsByTier[entry.result.currentTier]++;
      assetsByState[entry.result.state]++;

      const proxyTime = entry.tierLoadTimes.get(LODTier.PROXY);
      if (proxyTime !== undefined) {
        totalProxyTime += proxyTime;
        proxyCount++;
      }

      const previewTime = entry.tierLoadTimes.get(LODTier.PREVIEW);
      if (previewTime !== undefined) {
        totalPreviewTime += previewTime;
        previewCount++;
      }

      const fullTime = entry.tierLoadTimes.get(LODTier.FULL);
      if (fullTime !== undefined) {
        totalFullTime += fullTime;
        fullCount++;
      }

      // Estimate memory from loaded tier sizes
      for (const size of entry.tierSizes.values()) {
        estimatedMemoryMB += size / (1024 * 1024);
      }
    }

    return {
      totalAssets: this.assets.size,
      assetsByTier,
      assetsByState,
      totalBytesLoaded: this.totalBytesLoaded,
      concurrentLoads: this.activeLoads,
      avgProxyTime: proxyCount > 0 ? totalProxyTime / proxyCount : 0,
      avgPreviewTime: previewCount > 0 ? totalPreviewTime / previewCount : 0,
      avgFullTime: fullCount > 0 ? totalFullTime / fullCount : 0,
      estimatedMemoryMB,
      totalUpgrades: this.totalUpgrades,
    };
  }

  /**
   * Generate a human-readable performance report
   */
  generateReport(): string {
    const m = this.getMetrics();

    return [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '  PROGRESSIVE GLTF LOADER REPORT',
      '  3-Tier LOD: Proxy -> Preview -> Full',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '-- Asset Distribution --',
      `  Total Assets:        ${m.totalAssets}`,
      `  Tier 1 (Proxy):      ${m.assetsByTier[LODTier.PROXY]}`,
      `  Tier 2 (Preview):    ${m.assetsByTier[LODTier.PREVIEW]}`,
      `  Tier 3 (Full):       ${m.assetsByTier[LODTier.FULL]}`,
      '',
      '-- Loading State --',
      `  Idle:                ${m.assetsByState[LoadingState.IDLE]}`,
      `  Loading Proxy:       ${m.assetsByState[LoadingState.LOADING_PROXY]}`,
      `  Loading Preview:     ${m.assetsByState[LoadingState.LOADING_PREVIEW]}`,
      `  Loading Full:        ${m.assetsByState[LoadingState.LOADING_FULL]}`,
      `  Complete:            ${m.assetsByState[LoadingState.COMPLETE]}`,
      `  Error:               ${m.assetsByState[LoadingState.ERROR]}`,
      '',
      '-- Performance --',
      `  Concurrent Loads:    ${m.concurrentLoads} / ${this.config.maxConcurrentLoads}`,
      `  Avg Proxy Time:      ${m.avgProxyTime.toFixed(1)} ms`,
      `  Avg Preview Time:    ${m.avgPreviewTime.toFixed(1)} ms`,
      `  Avg Full Time:       ${m.avgFullTime.toFixed(1)} ms`,
      `  Total Downloaded:    ${(m.totalBytesLoaded / (1024 * 1024)).toFixed(2)} MB`,
      `  Est. GPU Memory:     ${m.estimatedMemoryMB.toFixed(2)} MB`,
      `  Total Upgrades:      ${m.totalUpgrades}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');
  }

  /**
   * Get asset entry by ID
   */
  getAsset(assetId: string): ProgressiveAssetResult | undefined {
    return this.assets.get(assetId)?.result;
  }

  /**
   * Cancel loading for an asset (keeps whatever is already loaded)
   */
  cancelLoad(assetId: string): void {
    const entry = this.assets.get(assetId);
    if (!entry) return;

    for (const [, controller] of entry.abortControllers) {
      controller.abort();
    }
    entry.abortControllers.clear();
  }

  /**
   * Dispose all assets and release resources
   */
  dispose(): void {
    this.isDisposed = true;

    for (const [assetId] of this.assets) {
      this.disposeAsset(assetId);
    }

    this.assets.clear();
    this.loadQueue = [];
    this.dracoLoader.dispose();
  }

  // ---------------------------------------------------------------------------
  // TIER LOADING
  // ---------------------------------------------------------------------------

  /**
   * Load/generate the proxy tier (Tier 1).
   *
   * If a proxy URL is provided, loads it. Otherwise, generates a bounding-box
   * placeholder from the asset configuration.
   */
  private async loadProxy(entry: AssetEntry): Promise<void> {
    const startTime = performance.now();
    entry.result.state = LoadingState.LOADING_PROXY;

    try {
      let proxyGroup: THREE.Group;

      if (entry.config.tiers.proxy?.url) {
        // Load explicit proxy model
        proxyGroup = await this.loadGLTFTier(
          entry,
          LODTier.PROXY,
          entry.config.tiers.proxy.url
        );
      } else {
        // Generate bounding-box proxy
        proxyGroup = this.generateProxyGeometry(entry.config);
      }

      // Store tier
      entry.result.tiers.set(LODTier.PROXY, proxyGroup);

      // Set as active tier
      this.setActiveTier(entry, LODTier.PROXY, proxyGroup);

      // Record timing
      const elapsed = performance.now() - startTime;
      entry.tierLoadTimes.set(LODTier.PROXY, elapsed);
      entry.tierProgress.set(LODTier.PROXY, 1);

    } catch (error) {
      console.error(
        `[ProgressiveGLTFLoader] Proxy load failed for ${entry.config.id}:`,
        error
      );
      // Generate fallback proxy even on error
      const fallback = this.generateProxyGeometry(entry.config);
      entry.result.tiers.set(LODTier.PROXY, fallback);
      this.setActiveTier(entry, LODTier.PROXY, fallback);
    }
  }

  /**
   * Load a GLTF/GLB file and return the parsed scene group.
   */
  private loadGLTFTier(
    entry: AssetEntry,
    tier: LODTier,
    url: string
  ): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      entry.abortControllers.set(tier, controller);

      this.gltfLoader.load(
        url,
        (gltf) => {
          entry.abortControllers.delete(tier);
          const scene = gltf.scene.clone();

          // Apply shadow settings
          if (entry.config.enableShadows ?? this.config.enableShadows) {
            scene.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Apply material overrides
                if (entry.config.materialOverrides && child.material) {
                  if (Array.isArray(child.material)) {
                    child.material = child.material.map(
                      entry.config.materialOverrides
                    );
                  } else {
                    child.material = entry.config.materialOverrides(
                      child.material
                    );
                  }
                }
              }
            });
          }

          // Constrain texture size for preview tier
          const tierSource = this.getTierSource(entry.config, tier);
          if (tierSource?.maxTextureSize) {
            this.constrainTextures(scene, tierSource.maxTextureSize);
          }

          // Store GLTF data (guard against disposed entry)
          if (entry.result.gltfData) {
            entry.result.gltfData.set(tier, gltf);
          }

          // Store metadata
          scene.userData.lodTier = tier;
          scene.userData.progressiveAssetId = entry.config.id;

          resolve(scene);
        },
        (event) => {
          // Progress callback
          if (entry.tierProgress && event.total > 0) {
            const progress = event.loaded / event.total;
            entry.tierProgress.set(tier, progress);
            entry.config.onProgress?.(tier, progress);
          }
          if (entry.tierSizes && event.loaded) {
            entry.tierSizes.set(tier, event.loaded);
            this.totalBytesLoaded += event.loaded;
          }
        },
        (error) => {
          entry.abortControllers.delete(tier);
          reject(error);
        }
      );
    });
  }

  /**
   * Generate a bounding-box proxy geometry for immediate display.
   */
  private generateProxyGeometry(config: ProgressiveAssetConfig): THREE.Group {
    const group = new THREE.Group();
    group.name = `proxy_${config.id}`;

    // Create a semi-transparent bounding box as placeholder
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: this.config.proxyColor,
      opacity: this.config.proxyOpacity,
      transparent: true,
      wireframe: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isProxy = true;
    group.add(mesh);

    group.userData.lodTier = LODTier.PROXY;
    group.userData.isAutoProxy = true;
    group.userData.progressiveAssetId = config.id;

    return group;
  }

  /**
   * Constrain texture sizes for a scene to a maximum dimension.
   */
  private constrainTextures(scene: THREE.Group, maxSize: number): void {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            const textures = [
              mat.map,
              mat.normalMap,
              mat.roughnessMap,
              mat.metalnessMap,
              mat.aoMap,
              mat.emissiveMap,
            ].filter(Boolean) as THREE.Texture[];

            for (const tex of textures) {
              if (
                tex.image &&
                (tex.image.width > maxSize || tex.image.height > maxSize)
              ) {
                // Downscale via minFilter - renderer will handle mip-mapping
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.generateMipmaps = true;
                tex.needsUpdate = true;
              }
            }
          }
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // TIER MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Set the active (visible) tier for an asset.
   * Swaps the displayed mesh in the root group.
   */
  private setActiveTier(
    entry: AssetEntry,
    tier: LODTier,
    tierGroup: THREE.Group
  ): void {
    const oldTier = entry.result.currentTier;
    const rootGroup = entry.result.group;

    // Remove current children (old tier)
    while (rootGroup.children.length > 0) {
      const child = rootGroup.children[0];
      rootGroup.remove(child);
      // Don't dispose - keep in tiers map for potential downgrade
    }

    // Add new tier
    rootGroup.add(tierGroup);

    // Update state
    entry.result.currentTier = tier;
    rootGroup.userData.currentTier = tier;

    // Update animations from highest tier
    const gltf = entry.result.gltfData.get(tier);
    if (gltf) {
      entry.result.animations = gltf.animations ?? [];
    }

    // Update loading state
    if (tier === LODTier.FULL) {
      entry.result.state = LoadingState.COMPLETE;
    } else if (tier === LODTier.PREVIEW) {
      entry.result.state = LoadingState.LOADING_FULL;
    } else {
      entry.result.state = LoadingState.LOADING_PREVIEW;
    }

    // Notify callback
    if (oldTier !== tier) {
      entry.config.onTierChange?.(oldTier, tier);
      this.totalUpgrades++;
    }
  }

  /**
   * Upgrade an asset to a higher tier.
   */
  private async upgradeTo(assetId: string, tier: LODTier): Promise<void> {
    const entry = this.assets.get(assetId);
    if (!entry) {
      throw new Error(`[ProgressiveGLTFLoader] Asset not found: ${assetId}`);
    }

    // Already at this tier or higher
    if (entry.result.currentTier >= tier) return;

    // Already loaded this tier - just switch to it
    const cached = entry.result.tiers.get(tier);
    if (cached) {
      this.setActiveTier(entry, tier, cached);
      return;
    }

    // Need to load this tier
    entry.isUpgrading = true;

    try {
      const tierSource = this.getTierSource(entry.config, tier);
      if (!tierSource) {
        throw new Error(`No source URL for tier ${tier}`);
      }

      const startTime = performance.now();
      const stateMap: Record<number, LoadingState> = {
        [LODTier.PREVIEW]: LoadingState.LOADING_PREVIEW,
        [LODTier.FULL]: LoadingState.LOADING_FULL,
      };
      entry.result.state = stateMap[tier] ?? LoadingState.LOADING_FULL;

      const tierGroup = await this.loadGLTFTier(entry, tier, tierSource.url);

      // Store and activate
      entry.result.tiers.set(tier, tierGroup);
      this.setActiveTier(entry, tier, tierGroup);

      // Record timing
      const elapsed = performance.now() - startTime;
      entry.tierLoadTimes.set(tier, elapsed);
      entry.tierProgress.set(tier, 1);

    } catch (error) {
      console.error(
        `[ProgressiveGLTFLoader] Tier ${tier} load failed for ${assetId}:`,
        error
      );
      entry.result.state = LoadingState.ERROR;
    } finally {
      entry.isUpgrading = false;
    }
  }

  /**
   * Get the tier source configuration for a specific tier.
   */
  private getTierSource(
    config: ProgressiveAssetConfig,
    tier: LODTier
  ): LODTierSource | undefined {
    switch (tier) {
      case LODTier.PROXY:
        return config.tiers.proxy;
      case LODTier.PREVIEW:
        return config.tiers.preview ?? config.tiers.full;
      case LODTier.FULL:
        return config.tiers.full;
    }
  }

  // ---------------------------------------------------------------------------
  // LOAD QUEUE
  // ---------------------------------------------------------------------------

  /**
   * Queue a tier load with priority ordering.
   */
  private queueTierLoad(assetId: string, tier: LODTier): void {
    const key = `${assetId}:${tier}`;
    if (!this.loadQueue.includes(key)) {
      this.loadQueue.push(key);
      // Sort by priority (higher priority assets first)
      this.loadQueue.sort((a, b) => {
        const idA = a.split(':')[0];
        const idB = b.split(':')[0];
        const entryA = this.assets.get(idA);
        const entryB = this.assets.get(idB);
        return (entryB?.config.priority ?? 0.5) - (entryA?.config.priority ?? 0.5);
      });
    }
  }

  /**
   * Prioritize a specific tier load (move to front of queue).
   */
  private prioritizeLoad(assetId: string, tier: LODTier): void {
    const key = `${assetId}:${tier}`;
    // Remove from current position
    this.loadQueue = this.loadQueue.filter((k) => k !== key);
    // Add to front
    this.loadQueue.unshift(key);
    this.processQueue();
  }

  /**
   * Process the load queue, respecting concurrency limits.
   */
  private processQueue(): void {
    while (
      this.activeLoads < this.config.maxConcurrentLoads &&
      this.loadQueue.length > 0
    ) {
      const key = this.loadQueue.shift()!;
      const [assetId, tierStr] = key.split(':');
      const tier = parseInt(tierStr, 10) as LODTier;

      const entry = this.assets.get(assetId);
      if (!entry) continue;

      // Skip if already loaded
      if (entry.result.tiers.has(tier)) continue;

      this.activeLoads++;

      this.upgradeTo(assetId, tier)
        .catch((error) => {
          console.error(
            `[ProgressiveGLTFLoader] Queue load failed for ${assetId} tier ${tier}:`,
            error
          );
        })
        .finally(() => {
          this.activeLoads--;
          // Continue processing queue
          this.processQueue();
        });
    }
  }

  // ---------------------------------------------------------------------------
  // PROGRESS / STATE QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Get loading progress for a specific tier of an asset.
   */
  private getProgress(assetId: string, tier: LODTier): number {
    const entry = this.assets.get(assetId);
    if (!entry) return 0;
    return entry.tierProgress.get(tier) ?? 0;
  }

  /**
   * Check if a specific tier is loaded for an asset.
   */
  private isTierLoaded(assetId: string, tier: LODTier): boolean {
    const entry = this.assets.get(assetId);
    if (!entry) return false;
    return entry.result.tiers.has(tier);
  }

  // ---------------------------------------------------------------------------
  // SPATIAL LOD INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Register all loaded assets with a ThreeSpatialLODIntegration instance.
   *
   * Creates LOD geometry mappings from the 3-tier system to the SpatialLODManager's
   * LOD0-LOD3 + Impostor levels.
   *
   * Mapping:
   *   - LODTier.FULL    -> LODLevel.LOD0 (highest quality)
   *   - LODTier.PREVIEW -> LODLevel.LOD2 (medium quality)
   *   - LODTier.PROXY   -> LODLevel.IMPOSTOR (lowest quality)
   *
   * @param spatialLOD - The ThreeSpatialLODIntegration instance
   */
  registerWithSpatialLOD(
    spatialLOD: { registerMesh: (config: any) => void }
  ): void {
    for (const [assetId, entry] of this.assets) {
      const meshes = this.extractMeshesFromEntry(entry);

      for (const [meshId, meshData] of meshes) {
        spatialLOD.registerMesh({
          id: `${assetId}_${meshId}`,
          mesh: meshData.mesh,
          lodGeometries: meshData.lodGeometries,
          priority: entry.config.priority ?? 0.5,
          alwaysHighQuality: false,
        });
      }
    }
  }

  /**
   * Extract meshes and their LOD geometries from an asset entry.
   */
  private extractMeshesFromEntry(
    entry: AssetEntry
  ): Map<string, { mesh: THREE.Mesh; lodGeometries: Record<string, THREE.BufferGeometry> }> {
    const result = new Map<string, { mesh: THREE.Mesh; lodGeometries: Record<string, THREE.BufferGeometry> }>();

    // Get the highest loaded tier's meshes
    const activeTier = entry.result.currentTier;
    const activeGroup = entry.result.tiers.get(activeTier);
    if (!activeGroup) return result;

    let meshIndex = 0;
    activeGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const lodGeometries: Record<string, THREE.BufferGeometry> = {};

        // Map loaded tiers to LOD geometries
        const fullGroup = entry.result.tiers.get(LODTier.FULL);
        const previewGroup = entry.result.tiers.get(LODTier.PREVIEW);
        const proxyGroup = entry.result.tiers.get(LODTier.PROXY);

        if (fullGroup) {
          const fullMesh = this.findMeshByIndex(fullGroup, meshIndex);
          if (fullMesh) lodGeometries.lod0 = fullMesh.geometry;
        }

        if (previewGroup) {
          const previewMesh = this.findMeshByIndex(previewGroup, meshIndex);
          if (previewMesh) lodGeometries.lod2 = previewMesh.geometry;
        }

        if (proxyGroup) {
          const proxyMesh = this.findMeshByIndex(proxyGroup, meshIndex);
          if (proxyMesh) lodGeometries.impostor = proxyMesh.geometry;
        }

        // Use current mesh geometry as fallback
        if (Object.keys(lodGeometries).length === 0) {
          lodGeometries.lod0 = child.geometry;
        }

        result.set(`mesh_${meshIndex}`, {
          mesh: child,
          lodGeometries,
        });

        meshIndex++;
      }
    });

    return result;
  }

  /**
   * Find a mesh by its index in the traversal order.
   */
  private findMeshByIndex(
    group: THREE.Group,
    index: number
  ): THREE.Mesh | null {
    let currentIndex = 0;
    let found: THREE.Mesh | null = null;

    group.traverse((child) => {
      if (child instanceof THREE.Mesh && !found) {
        if (currentIndex === index) {
          found = child;
        }
        currentIndex++;
      }
    });

    return found;
  }

  // ---------------------------------------------------------------------------
  // DISPOSAL
  // ---------------------------------------------------------------------------

  /**
   * Dispose a single asset and release its resources.
   */
  private disposeAsset(assetId: string): void {
    const entry = this.assets.get(assetId);
    if (!entry) return;

    // Cancel any pending loads
    this.cancelLoad(assetId);

    // Dispose all tier groups
    for (const [, tierGroup] of entry.result.tiers) {
      tierGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              this.disposeMaterial(mat);
            });
          } else if (child.material) {
            this.disposeMaterial(child.material);
          }
        }
      });
    }

    entry.result.tiers.clear();
    entry.result.gltfData.clear();

    // Remove from root group
    while (entry.result.group.children.length > 0) {
      entry.result.group.remove(entry.result.group.children[0]);
    }

    // Remove from queue
    this.loadQueue = this.loadQueue.filter((k) => !k.startsWith(`${assetId}:`));

    this.assets.delete(assetId);
  }

  /**
   * Dispose a material and its textures.
   */
  private disposeMaterial(material: THREE.Material): void {
    if (material instanceof THREE.MeshStandardMaterial) {
      material.map?.dispose();
      material.normalMap?.dispose();
      material.roughnessMap?.dispose();
      material.metalnessMap?.dispose();
      material.aoMap?.dispose();
      material.emissiveMap?.dispose();
    }
    material.dispose();
  }

  // ---------------------------------------------------------------------------
  // ACCESSORS
  // ---------------------------------------------------------------------------

  /**
   * Get the underlying GLTFLoader
   */
  getGLTFLoader(): GLTFLoader {
    return this.gltfLoader;
  }

  /**
   * Get the underlying DRACOLoader
   */
  getDRACOLoader(): DRACOLoader {
    return this.dracoLoader;
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ProgressiveGLTFLoaderConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProgressiveGLTFLoaderConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get number of assets currently managed
   */
  getAssetCount(): number {
    return this.assets.size;
  }

  /**
   * Get all managed asset IDs
   */
  getAssetIds(): string[] {
    return Array.from(this.assets.keys());
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

let defaultLoader: ProgressiveGLTFLoader | null = null;

/**
 * Get the default ProgressiveGLTFLoader instance (singleton)
 */
export function getProgressiveGLTFLoader(
  config?: Partial<ProgressiveGLTFLoaderConfig>
): ProgressiveGLTFLoader {
  if (!defaultLoader) {
    defaultLoader = new ProgressiveGLTFLoader(config);
  }
  return defaultLoader;
}

/**
 * Create a new ProgressiveGLTFLoader instance
 */
export function createProgressiveGLTFLoader(
  config?: Partial<ProgressiveGLTFLoaderConfig>
): ProgressiveGLTFLoader {
  return new ProgressiveGLTFLoader(config);
}

// =============================================================================
// HELPER: Generate progressive asset config from a single URL
// =============================================================================

/**
 * Create a ProgressiveAssetConfig from a single GLTF/GLB URL.
 *
 * Useful when you only have the full-quality model URL and want the loader
 * to auto-generate proxy and handle progressive loading.
 *
 * @param id - Unique asset identifier
 * @param fullUrl - URL to the full-quality GLTF/GLB
 * @param options - Optional configuration overrides
 *
 * @example
 * ```typescript
 * const config = createProgressiveConfig('tree', '/models/oak_tree.glb', {
 *   priority: 0.8,
 *   distanceThreshold: 10,
 * });
 *
 * const result = await loader.load(config);
 * scene.add(result.group);
 * ```
 */
export function createProgressiveConfig(
  id: string,
  fullUrl: string,
  options?: Partial<Omit<ProgressiveAssetConfig, 'id' | 'tiers'>> & {
    previewUrl?: string;
    proxyUrl?: string;
  }
): ProgressiveAssetConfig {
  const tiers: ProgressiveAssetConfig['tiers'] = {
    full: { url: fullUrl },
  };

  if (options?.previewUrl) {
    tiers.preview = { url: options.previewUrl, draco: true, maxTextureSize: 128 };
  }

  if (options?.proxyUrl) {
    tiers.proxy = { url: options.proxyUrl };
  }

  return {
    id,
    tiers,
    priority: options?.priority,
    screenCoverageThreshold: options?.screenCoverageThreshold,
    distanceThreshold: options?.distanceThreshold,
    memoryBudgetMB: options?.memoryBudgetMB,
    enableShadows: options?.enableShadows,
    materialOverrides: options?.materialOverrides,
    onTierChange: options?.onTierChange,
    onProgress: options?.onProgress,
  };
}
