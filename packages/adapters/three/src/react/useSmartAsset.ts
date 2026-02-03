/**
 * React Three Fiber Hooks for SmartAssetLoader Integration
 *
 * Provides React hooks that bridge @holoscript/core SmartAssetLoader
 * with @react-three/fiber and @react-three/drei for seamless asset loading.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  SmartAssetBridge,
  getSmartAssetBridge,
  type GLTFResult,
  type SmartAssetBridgeConfig,
} from '../SmartAssetBridge';

// ============================================================================
// Types
// ============================================================================

export interface UseSmartAssetOptions {
  /** Whether to start loading immediately (default: true) */
  autoLoad?: boolean;

  /** Whether to clone the loaded model (default: true) */
  clone?: boolean;

  /** Custom SmartAssetBridge config */
  bridgeConfig?: SmartAssetBridgeConfig;

  /** Called when loading starts */
  onLoadStart?: (assetName: string) => void;

  /** Called on loading progress */
  onProgress?: (assetName: string, loaded: number, total: number) => void;

  /** Called when loading completes */
  onLoad?: (result: GLTFResult) => void;

  /** Called on error */
  onError?: (error: Error) => void;
}

export interface UseSmartAssetReturn {
  /** The loaded model's scene (cloned if clone option is true) */
  scene: THREE.Group | null;

  /** All scenes from the GLTF */
  scenes: THREE.Group[];

  /** Animation clips from the model */
  animations: THREE.AnimationClip[];

  /** Cameras defined in the model */
  cameras: THREE.Camera[];

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Progress (0-1) */
  progress: number;

  /** The full GLTF result */
  gltf: GLTFResult | null;

  /** Manually trigger load (if autoLoad is false) */
  load: () => Promise<void>;

  /** Reload the asset */
  reload: () => Promise<void>;
}

// ============================================================================
// Context for SmartAssetLoader Configuration
// ============================================================================

import { createContext, useContext, type ReactNode } from 'react';

export interface SmartAssetContextValue {
  bridge: SmartAssetBridge;
  loader: {
    load: <T>(request: { asset: string }) => Promise<{ data: T }>;
  } | null;
  baseUrl: string;
}

const SmartAssetContext = createContext<SmartAssetContextValue | null>(null);

export interface SmartAssetProviderProps {
  children: ReactNode;
  /** @holoscript/core SmartAssetLoader instance */
  loader?: {
    load: <T>(request: { asset: string }) => Promise<{ data: T }>;
  };
  /** Base URL for assets */
  baseUrl?: string;
  /** SmartAssetBridge configuration */
  bridgeConfig?: SmartAssetBridgeConfig;
}

/**
 * Provider component that configures SmartAssetLoader for React Three Fiber
 *
 * @example
 * ```tsx
 * import { SmartAssetProvider } from '@hololand/three-adapter/react';
 * import { getSmartAssetLoader } from '@holoscript/core';
 *
 * const loader = getSmartAssetLoader({ baseUrl: '/assets/' });
 *
 * function App() {
 *   return (
 *     <Canvas>
 *       <SmartAssetProvider loader={loader} baseUrl="/assets/">
 *         <Scene />
 *       </SmartAssetProvider>
 *     </Canvas>
 *   );
 * }
 * ```
 */
export function SmartAssetProvider({
  children,
  loader,
  baseUrl = '/',
  bridgeConfig,
}: SmartAssetProviderProps) {
  const bridge = useMemo(() => getSmartAssetBridge(bridgeConfig), [bridgeConfig]);

  const value = useMemo(
    () => ({
      bridge,
      loader: loader ?? null,
      baseUrl,
    }),
    [bridge, loader, baseUrl]
  );

  return <SmartAssetContext.Provider value={value}>{children}</SmartAssetContext.Provider>;
}

/**
 * Hook to access SmartAsset context
 */
export function useSmartAssetContext(): SmartAssetContextValue {
  const ctx = useContext(SmartAssetContext);
  if (!ctx) {
    // Return default context if not provided
    return {
      bridge: getSmartAssetBridge(),
      loader: null,
      baseUrl: '/',
    };
  }
  return ctx;
}

// ============================================================================
// Main Hook: useSmartAsset
// ============================================================================

/**
 * Load a 3D model using SmartAssetLoader with semantic aliases
 *
 * @param assetName - Asset alias (e.g., "tree", "bench") or full path
 * @param options - Loading options
 *
 * @example Basic usage
 * ```tsx
 * function Tree() {
 *   const { scene, isLoading } = useSmartAsset('tree');
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!scene) return null;
 *
 *   return <primitive object={scene} position={[0, 0, 0]} />;
 * }
 * ```
 *
 * @example With animations
 * ```tsx
 * function AnimatedCharacter() {
 *   const { scene, animations } = useSmartAsset('brittney');
 *   const { actions } = useAnimations(animations, scene);
 *
 *   useEffect(() => {
 *     actions.idle?.play();
 *   }, [actions]);
 *
 *   return scene ? <primitive object={scene} /> : null;
 * }
 * ```
 *
 * @example With SmartAssetLoader integration
 * ```tsx
 * // In your setup:
 * const loader = getSmartAssetLoader({ platform: 'vr', quality: 'high' });
 * setupSmartAssetLoader(loader);
 *
 * // In your component:
 * function VRReadyModel() {
 *   // Automatically uses optimal LOD for VR
 *   const { scene } = useSmartAsset('complex_environment');
 *   return scene ? <primitive object={scene} /> : null;
 * }
 * ```
 */
export function useSmartAsset(
  assetName: string,
  options: UseSmartAssetOptions = {}
): UseSmartAssetReturn {
  const { autoLoad = true, clone = true, onLoadStart, onProgress, onLoad, onError } = options;

  const { bridge, loader, baseUrl } = useSmartAssetContext();
  const { gl } = useThree();

  const [gltf, setGltf] = useState<GLTFResult | null>(null);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const loadedRef = useRef(false);

  // Compute the scene (clone if needed)
  const scene = useMemo(() => {
    if (!gltf) return null;
    return clone ? gltf.scene.clone() : gltf.scene;
  }, [gltf, clone]);

  // Load function
  const loadAsset = useCallback(async () => {
    if (loadedRef.current && !options.bridgeConfig) {
      return; // Already loaded, skip unless forcing reload
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    onLoadStart?.(assetName);

    try {
      let result: GLTFResult;

      if (loader) {
        // Use SmartAssetLoader (preferred path)
        const loadResult = await loader.load<GLTFResult>({ asset: assetName });
        result = loadResult.data;
      } else {
        // Fallback: Load directly via bridge
        const url = assetName.startsWith('http') || assetName.startsWith('/')
          ? assetName
          : `${baseUrl}${assetName}`;

        result = await bridge.loadDirect(url);
      }

      setGltf(result);
      setProgress(1);
      loadedRef.current = true;
      onLoad?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [assetName, loader, bridge, baseUrl, onLoadStart, onLoad, onError]);

  // Reload function
  const reload = useCallback(async () => {
    loadedRef.current = false;
    await loadAsset();
  }, [loadAsset]);

  // Auto-load effect
  useEffect(() => {
    if (autoLoad) {
      loadAsset();
    }
  }, [autoLoad, assetName]); // Re-load when asset name changes

  return {
    scene,
    scenes: gltf?.scenes ?? [],
    animations: gltf?.animations ?? [],
    cameras: gltf?.cameras ?? [],
    isLoading,
    error,
    progress,
    gltf,
    load: loadAsset,
    reload,
  };
}

// ============================================================================
// Convenience Hook: useSmartModel
// ============================================================================

/**
 * Simplified hook that just returns the scene for quick usage
 *
 * @example
 * ```tsx
 * function Forest() {
 *   const tree = useSmartModel('tree');
 *   const rock = useSmartModel('rock');
 *
 *   return (
 *     <group>
 *       {tree && <primitive object={tree.clone()} position={[0, 0, 0]} />}
 *       {tree && <primitive object={tree.clone()} position={[5, 0, 3]} />}
 *       {rock && <primitive object={rock.clone()} position={[2, 0, 1]} />}
 *     </group>
 *   );
 * }
 * ```
 */
export function useSmartModel(assetName: string): THREE.Group | null {
  const { scene } = useSmartAsset(assetName);
  return scene;
}

// ============================================================================
// Preloading Hook
// ============================================================================

/**
 * Preload multiple assets in the background
 *
 * @example
 * ```tsx
 * function Scene() {
 *   // Preload assets that will be needed soon
 *   usePreloadSmartAssets(['tree', 'bench', 'lamp', 'fountain']);
 *
 *   return <World />;
 * }
 * ```
 */
export function usePreloadSmartAssets(assetNames: string[]): {
  progress: number;
  isComplete: boolean;
  errors: Map<string, Error>;
} {
  const { bridge, loader, baseUrl } = useSmartAssetContext();
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const errorMap = new Map<string, Error>();
    let completed = 0;

    const preload = async () => {
      for (const assetName of assetNames) {
        if (cancelled) break;

        try {
          if (loader) {
            await loader.load({ asset: assetName });
          } else {
            const url = assetName.startsWith('http') || assetName.startsWith('/')
              ? assetName
              : `${baseUrl}${assetName}`;
            await bridge.loadDirect(url);
          }
        } catch (err) {
          errorMap.set(assetName, err instanceof Error ? err : new Error(String(err)));
        }

        completed++;
        if (!cancelled) {
          setProgress(completed / assetNames.length);
          setErrors(new Map(errorMap));
        }
      }

      if (!cancelled) {
        setIsComplete(true);
      }
    };

    preload();

    return () => {
      cancelled = true;
    };
  }, [assetNames.join(','), loader, bridge, baseUrl]);

  return { progress, isComplete, errors };
}

// ============================================================================
// Re-export types
// ============================================================================

export type { GLTFResult, SmartAssetBridgeConfig };
