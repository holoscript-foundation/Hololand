/**
 * React Three Fiber Hook for Progressive GLTF Loading with 3-Tier LOD
 *
 * Provides React hooks that integrate the ProgressiveGLTFLoader with
 * @react-three/fiber for seamless progressive 3D asset loading in VR.
 *
 * Assets load in 3 tiers:
 *   Tier 1 (Proxy):   Instant bounding-box placeholder
 *   Tier 2 (Preview): Compressed geometry with small textures
 *   Tier 3 (Full):    Full-resolution model
 *
 * @module useProgressiveAsset
 */

import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ProgressiveGLTFLoader,
  getProgressiveGLTFLoader,
  createProgressiveConfig,
  LODTier,
  LoadingState,
  type ProgressiveAssetConfig,
  type ProgressiveAssetResult,
  type ProgressiveGLTFLoaderConfig,
  type ProgressiveLoadMetrics,
} from '../ProgressiveGLTFLoader';

// ============================================================================
// Types
// ============================================================================

export interface UseProgressiveAssetOptions {
  /** Whether to start loading immediately (default: true) */
  autoLoad?: boolean;

  /** Loading priority (0-1, higher = more urgent) */
  priority?: number;

  /** URL for the preview tier (Draco-compressed, smaller textures) */
  previewUrl?: string;

  /** URL for the proxy tier (low-poly placeholder) */
  proxyUrl?: string;

  /** Distance from camera to trigger full-quality upgrade (meters) */
  distanceThreshold?: number;

  /** Screen coverage to trigger full-quality upgrade (0-1) */
  screenCoverageThreshold?: number;

  /** Enable shadows on loaded meshes */
  enableShadows?: boolean;

  /** Called when a tier transition occurs */
  onTierChange?: (oldTier: LODTier, newTier: LODTier) => void;

  /** Called on loading progress */
  onProgress?: (tier: LODTier, progress: number) => void;

  /** Called when all tiers are loaded */
  onComplete?: () => void;

  /** Called on error */
  onError?: (error: Error) => void;
}

export interface UseProgressiveAssetReturn {
  /** The root group containing the current best-quality model */
  scene: THREE.Group | null;

  /** Current active LOD tier */
  currentTier: LODTier;

  /** Current loading state */
  state: LoadingState;

  /** Whether any tier is currently loading */
  isLoading: boolean;

  /** Whether the full-quality tier is loaded */
  isFullyLoaded: boolean;

  /** Animation clips from the highest loaded tier */
  animations: THREE.AnimationClip[];

  /** Loading progress per tier (0-1) */
  progress: {
    proxy: number;
    preview: number;
    full: number;
    /** Overall progress (average of all tiers) */
    overall: number;
  };

  /** Error state */
  error: Error | null;

  /** Manually trigger upgrade to a specific tier */
  upgradeTo: (tier: LODTier) => Promise<void>;

  /** Reload the asset from scratch */
  reload: () => Promise<void>;

  /** The full progressive asset result (for advanced usage) */
  result: ProgressiveAssetResult | null;
}

// ============================================================================
// Context
// ============================================================================

export interface ProgressiveAssetContextValue {
  loader: ProgressiveGLTFLoader;
}

const ProgressiveAssetContext = createContext<ProgressiveAssetContextValue | null>(null);

export interface ProgressiveAssetProviderProps {
  children: ReactNode;
  /** Custom loader configuration */
  config?: Partial<ProgressiveGLTFLoaderConfig>;
}

/**
 * Provider component that configures the ProgressiveGLTFLoader for React Three Fiber.
 *
 * Wrap your Canvas content with this provider to enable progressive asset loading.
 * The provider also runs the distance-based auto-upgrade loop every frame.
 *
 * @example
 * ```tsx
 * import { Canvas } from '@react-three/fiber';
 * import { ProgressiveAssetProvider } from '@hololand/three-adapter/react';
 *
 * function App() {
 *   return (
 *     <Canvas>
 *       <ProgressiveAssetProvider config={{ maxConcurrentLoads: 6 }}>
 *         <VRScene />
 *       </ProgressiveAssetProvider>
 *     </Canvas>
 *   );
 * }
 * ```
 */
export function ProgressiveAssetProvider({
  children,
  config,
}: ProgressiveAssetProviderProps): JSX.Element {
  const loader = useMemo(
    () => getProgressiveGLTFLoader(config),
    // Only create once - config changes after mount are applied via updateConfig
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Update config if it changes
  useEffect(() => {
    if (config) {
      loader.updateConfig(config);
    }
  }, [config, loader]);

  // Run distance-based auto-upgrade every frame
  const { camera } = useThree();
  useFrame(() => {
    loader.update(camera);
  });

  const value = useMemo(() => ({ loader }), [loader]);

  return (
    <ProgressiveAssetContext.Provider value={value}>
      {children}
    </ProgressiveAssetContext.Provider>
  );
}

/**
 * Hook to access the ProgressiveGLTFLoader context
 */
export function useProgressiveAssetContext(): ProgressiveAssetContextValue {
  const ctx = useContext(ProgressiveAssetContext);
  if (!ctx) {
    // Return default context if not wrapped in provider
    return { loader: getProgressiveGLTFLoader() };
  }
  return ctx;
}

// ============================================================================
// Main Hook: useProgressiveAsset
// ============================================================================

/**
 * Load a 3D model progressively with 3-tier LOD.
 *
 * Displays a proxy placeholder immediately, then streams in preview and
 * full-quality tiers in the background. Distance-based auto-upgrade ensures
 * nearby objects get full quality first.
 *
 * @param fullUrl - URL to the full-quality GLTF/GLB model
 * @param id - Unique identifier for this asset (defaults to URL)
 * @param options - Progressive loading options
 *
 * @example Basic usage
 * ```tsx
 * function Building() {
 *   const { scene, currentTier, isLoading } = useProgressiveAsset(
 *     '/models/building.glb',
 *     'building_01'
 *   );
 *
 *   if (!scene) return null;
 *
 *   return <primitive object={scene} position={[0, 0, -10]} />;
 * }
 * ```
 *
 * @example With preview tier and callbacks
 * ```tsx
 * function DetailedCharacter() {
 *   const { scene, currentTier, animations, progress } = useProgressiveAsset(
 *     '/models/character_full.glb',
 *     'character_01',
 *     {
 *       previewUrl: '/models/character_preview.glb',
 *       priority: 0.9,
 *       distanceThreshold: 5,
 *       onTierChange: (oldTier, newTier) => {
 *         console.log(`Character upgraded: tier ${oldTier} -> ${newTier}`);
 *       },
 *     }
 *   );
 *
 *   return (
 *     <group>
 *       {scene && <primitive object={scene} />}
 *       {currentTier < LODTier.FULL && (
 *         <LoadingIndicator progress={progress.overall} />
 *       )}
 *     </group>
 *   );
 * }
 * ```
 *
 * @example VR scene with many progressive assets
 * ```tsx
 * function VRForest() {
 *   const tree1 = useProgressiveAsset('/models/oak.glb', 'oak_1', { priority: 0.3 });
 *   const tree2 = useProgressiveAsset('/models/pine.glb', 'pine_1', { priority: 0.3 });
 *   const cabin = useProgressiveAsset('/models/cabin.glb', 'cabin', { priority: 0.9 });
 *
 *   return (
 *     <group>
 *       {tree1.scene && <primitive object={tree1.scene} position={[5, 0, -3]} />}
 *       {tree2.scene && <primitive object={tree2.scene} position={[-5, 0, -8]} />}
 *       {cabin.scene && <primitive object={cabin.scene} position={[0, 0, -15]} />}
 *     </group>
 *   );
 * }
 * ```
 */
export function useProgressiveAsset(
  fullUrl: string,
  id?: string,
  options: UseProgressiveAssetOptions = {}
): UseProgressiveAssetReturn {
  const {
    autoLoad = true,
    priority = 0.5,
    previewUrl,
    proxyUrl,
    distanceThreshold,
    screenCoverageThreshold,
    enableShadows,
    onTierChange,
    onProgress,
    onComplete,
    onError,
  } = options;

  const { loader } = useProgressiveAssetContext();

  const assetId = id ?? fullUrl;
  const [result, setResult] = useState<ProgressiveAssetResult | null>(null);
  const [currentTier, setCurrentTier] = useState<LODTier>(LODTier.PROXY);
  const [state, setState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<Error | null>(null);
  const [proxyProgress, setProxyProgress] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [fullProgress, setFullProgress] = useState(0);

  const loadedRef = useRef(false);
  const assetIdRef = useRef(assetId);

  // Create progressive config
  const config = useMemo(
    () =>
      createProgressiveConfig(assetId, fullUrl, {
        previewUrl,
        proxyUrl,
        priority,
        distanceThreshold,
        screenCoverageThreshold,
        enableShadows,
        onTierChange: (oldTier, newTier) => {
          setCurrentTier(newTier);
          onTierChange?.(oldTier, newTier);

          if (newTier === LODTier.FULL) {
            onComplete?.();
          }
        },
        onProgress: (tier, progress) => {
          switch (tier) {
            case LODTier.PROXY:
              setProxyProgress(progress);
              break;
            case LODTier.PREVIEW:
              setPreviewProgress(progress);
              break;
            case LODTier.FULL:
              setFullProgress(progress);
              break;
          }
          onProgress?.(tier, progress);
        },
      }),
    [
      assetId,
      fullUrl,
      previewUrl,
      proxyUrl,
      priority,
      distanceThreshold,
      screenCoverageThreshold,
      enableShadows,
      onTierChange,
      onProgress,
      onComplete,
    ]
  );

  // Load function
  const loadAsset = useCallback(async () => {
    if (loadedRef.current && assetIdRef.current === assetId) return;

    setState(LoadingState.LOADING_PROXY);
    setError(null);
    setProxyProgress(0);
    setPreviewProgress(0);
    setFullProgress(0);

    try {
      const loadResult = await loader.load(config);
      setResult(loadResult);
      setCurrentTier(loadResult.currentTier);
      setState(loadResult.state);
      loadedRef.current = true;
      assetIdRef.current = assetId;
    } catch (err) {
      const loadError = err instanceof Error ? err : new Error(String(err));
      setError(loadError);
      setState(LoadingState.ERROR);
      onError?.(loadError);
    }
  }, [assetId, config, loader, onError]);

  // Reload function
  const reload = useCallback(async () => {
    loadedRef.current = false;
    result?.dispose();
    setResult(null);
    await loadAsset();
  }, [loadAsset, result]);

  // Upgrade function
  const upgradeTo = useCallback(
    async (tier: LODTier) => {
      if (!result) return;
      await result.upgradeTo(tier);
      setCurrentTier(result.currentTier);
      setState(result.state);
    },
    [result]
  );

  // Auto-load effect
  useEffect(() => {
    if (autoLoad) {
      loadAsset();
    }

    return () => {
      // Cleanup on unmount
      // Note: We don't dispose here because the loader manages lifecycle
    };
  }, [autoLoad, assetId]); // Re-load when asset ID changes

  // Poll for state updates (tier transitions happen asynchronously)
  useFrame(() => {
    if (result) {
      if (result.currentTier !== currentTier) {
        setCurrentTier(result.currentTier);
      }
      if (result.state !== state) {
        setState(result.state);
      }
    }
  });

  // Compute scene
  const scene = result?.group ?? null;

  // Compute progress
  const progress = useMemo(
    () => ({
      proxy: proxyProgress,
      preview: previewProgress,
      full: fullProgress,
      overall: (proxyProgress + previewProgress + fullProgress) / 3,
    }),
    [proxyProgress, previewProgress, fullProgress]
  );

  return {
    scene,
    currentTier,
    state,
    isLoading:
      state !== LoadingState.COMPLETE && state !== LoadingState.ERROR,
    isFullyLoaded: currentTier === LODTier.FULL,
    animations: result?.animations ?? [],
    progress,
    error,
    upgradeTo,
    reload,
    result,
  };
}

// ============================================================================
// Convenience Hook: useProgressiveModel
// ============================================================================

/**
 * Simplified hook that returns the scene group for quick usage.
 *
 * @example
 * ```tsx
 * function Tree({ position }) {
 *   const tree = useProgressiveModel('/models/oak.glb', 'oak_1');
 *   return tree ? <primitive object={tree} position={position} /> : null;
 * }
 * ```
 */
export function useProgressiveModel(
  fullUrl: string,
  id?: string,
  options?: UseProgressiveAssetOptions
): THREE.Group | null {
  const { scene } = useProgressiveAsset(fullUrl, id, options);
  return scene;
}

// ============================================================================
// Batch Preloading Hook
// ============================================================================

export interface ProgressivePreloadEntry {
  /** URL to the full-quality model */
  fullUrl: string;
  /** Unique asset ID */
  id: string;
  /** Loading priority (0-1) */
  priority?: number;
  /** Optional preview URL */
  previewUrl?: string;
}

/**
 * Preload multiple progressive assets in the background.
 *
 * All assets begin loading proxy tiers immediately, then preview and full
 * tiers are streamed based on priority.
 *
 * @example
 * ```tsx
 * function VRWorld() {
 *   const { progress, isComplete } = usePreloadProgressiveAssets([
 *     { fullUrl: '/models/building.glb', id: 'building', priority: 0.9 },
 *     { fullUrl: '/models/tree.glb', id: 'tree', priority: 0.3 },
 *     { fullUrl: '/models/car.glb', id: 'car', priority: 0.6 },
 *   ]);
 *
 *   if (!isComplete) {
 *     return <LoadingScreen progress={progress} />;
 *   }
 *
 *   return <Scene />;
 * }
 * ```
 */
export function usePreloadProgressiveAssets(
  entries: ProgressivePreloadEntry[]
): {
  /** Overall loading progress (0-1, based on proxy tier completion) */
  progress: number;
  /** Whether all proxy tiers are loaded (scene is interactive) */
  isReady: boolean;
  /** Whether all tiers of all assets are loaded */
  isComplete: boolean;
  /** Errors by asset ID */
  errors: Map<string, Error>;
} {
  const { loader } = useProgressiveAssetContext();
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const errorMap = new Map<string, Error>();

    const preload = async () => {
      const configs = entries.map((entry) =>
        createProgressiveConfig(entry.id, entry.fullUrl, {
          priority: entry.priority,
          previewUrl: entry.previewUrl,
        })
      );

      try {
        const results = await loader.loadBatch(configs);

        if (cancelled) return;

        // All proxies are loaded at this point
        setIsReady(true);
        setProgress(0.33); // Proxy tier = 33% of total

        // Monitor for completion
        const checkComplete = () => {
          if (cancelled) return;

          let allComplete = true;
          let totalProgress = 0;

          for (const [id, result] of results) {
            if (result.state === LoadingState.ERROR) {
              errorMap.set(id, new Error(`Asset ${id} failed to load`));
            }
            if (result.state !== LoadingState.COMPLETE) {
              allComplete = false;
            }

            // Calculate progress based on loaded tiers
            let assetProgress = 0;
            if (result.isTierLoaded(LODTier.PROXY)) assetProgress += 0.33;
            if (result.isTierLoaded(LODTier.PREVIEW)) assetProgress += 0.33;
            if (result.isTierLoaded(LODTier.FULL)) assetProgress += 0.34;
            totalProgress += assetProgress;
          }

          setProgress(totalProgress / results.size);
          setErrors(new Map(errorMap));

          if (allComplete) {
            setIsComplete(true);
          } else {
            // Check again in 500ms
            setTimeout(checkComplete, 500);
          }
        };

        checkComplete();
      } catch (err) {
        if (!cancelled) {
          setErrors(
            new Map([['batch', err instanceof Error ? err : new Error(String(err))]])
          );
        }
      }
    };

    preload();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map((e) => e.id).join(',')]);

  return { progress, isReady, isComplete, errors };
}

// ============================================================================
// Metrics Hook
// ============================================================================

/**
 * Hook to access progressive loading metrics.
 *
 * Updates every frame for real-time monitoring.
 *
 * @example
 * ```tsx
 * function PerformanceOverlay() {
 *   const metrics = useProgressiveLoadMetrics();
 *
 *   return (
 *     <Html>
 *       <div>Assets: {metrics.totalAssets}</div>
 *       <div>Full: {metrics.assetsByTier[LODTier.FULL]}</div>
 *       <div>Memory: {metrics.estimatedMemoryMB.toFixed(1)} MB</div>
 *     </Html>
 *   );
 * }
 * ```
 */
export function useProgressiveLoadMetrics(): ProgressiveLoadMetrics {
  const { loader } = useProgressiveAssetContext();
  const [metrics, setMetrics] = useState<ProgressiveLoadMetrics>(
    loader.getMetrics()
  );

  // Update metrics periodically (not every frame to avoid overhead)
  const frameCount = useRef(0);
  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % 30 === 0) {
      // ~2Hz at 60fps
      setMetrics(loader.getMetrics());
    }
  });

  return metrics;
}

// ============================================================================
// Re-exports
// ============================================================================

export {
  LODTier,
  LoadingState,
  type ProgressiveAssetConfig,
  type ProgressiveAssetResult,
  type ProgressiveGLTFLoaderConfig,
  type ProgressiveLoadMetrics,
};
