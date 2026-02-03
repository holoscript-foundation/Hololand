/**
 * React Three Fiber Integration for SmartAssetLoader
 *
 * Provides React hooks and components that bridge @holoscript/core SmartAssetLoader
 * with @react-three/fiber for seamless 3D asset loading with semantic aliases.
 *
 * @example Basic setup
 * ```tsx
 * import { Canvas } from '@react-three/fiber';
 * import { SmartAssetProvider, SmartModel } from '@hololand/three-adapter/react';
 * import { getSmartAssetLoader, setupSmartAssetLoader } from '@holoscript/core';
 *
 * // Configure SmartAssetLoader
 * const loader = getSmartAssetLoader({
 *   baseUrl: '/assets/',
 *   platform: 'vr',
 *   quality: 'high',
 * });
 * setupSmartAssetLoader(loader);
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
 *
 * function Scene() {
 *   return (
 *     <group>
 *       <SmartModel asset="tree" position={[0, 0, 0]} />
 *       <SmartModel asset="bench" position={[3, 0, 0]} />
 *       <SmartModel asset="brittney" animation="idle" position={[-3, 0, 0]} />
 *     </group>
 *   );
 * }
 * ```
 */

// Hooks
export {
  useSmartAsset,
  useSmartModel,
  usePreloadSmartAssets,
  useSmartAssetContext,
  type UseSmartAssetOptions,
  type UseSmartAssetReturn,
} from './useSmartAsset';

// Context/Provider
export {
  SmartAssetProvider,
  type SmartAssetProviderProps,
  type SmartAssetContextValue,
} from './useSmartAsset';

// Components
export {
  SmartModel,
  SmartModelWithLoader,
  SmartModelInstances,
  type SmartModelProps,
  type SmartModelInstancesProps,
} from './SmartModel';

// Re-export types from bridge
export type { GLTFResult, SmartAssetBridgeConfig } from './useSmartAsset';
