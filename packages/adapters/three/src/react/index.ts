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

// Progressive GLTF Loading with 3-Tier LOD
export {
  useProgressiveAsset,
  useProgressiveModel,
  usePreloadProgressiveAssets,
  useProgressiveLoadMetrics,
  useProgressiveAssetContext,
  ProgressiveAssetProvider,
  type UseProgressiveAssetOptions,
  type UseProgressiveAssetReturn,
  type ProgressiveAssetProviderProps,
  type ProgressiveAssetContextValue,
  type ProgressivePreloadEntry,
} from './useProgressiveAsset';

// Re-export progressive loading types
export {
  LODTier,
  LoadingState,
  type ProgressiveAssetConfig,
  type ProgressiveAssetResult,
  type ProgressiveGLTFLoaderConfig,
  type ProgressiveLoadMetrics,
} from './useProgressiveAsset';

// Re-export types from bridge
export type { GLTFResult, SmartAssetBridgeConfig } from './useSmartAsset';

// Studio IDE Components (Asset Import with Drag-and-Drop + Progressive Preview)
export {
  // Types
  AssetCategory,
  ImportState,
  PreviewStage,
  DropZoneState,
  ValidationSeverity,
  EXTENSION_CATEGORY_MAP,
  MAX_FILE_SIZES,
  DEFAULT_IMPORT_QUEUE_CONFIG,
  type ImportEntry,
  type ImportQueueConfig,
  type ImportEvents,
  type AssetPreview,
  type ModelPreviewInfo,
  type AudioPreviewInfo,
  type ValidationResult,
  type ValidationMessage,
  type AssetMetadataResult,
  // Utilities
  classifyFile,
  extractFileMetadata,
  validateFile,
  generateImageThumbnail,
  generateAudioPreview,
  generateVideoThumbnail,
  extractGLBMetadata,
  computeFileHash,
  formatFileSize,
  formatDuration,
  generateImportId,
  getCategoryLabel,
  getFileExtension,
  getAcceptString,
  createEmptyPreview,
  // Hook
  useAssetImport,
  type UseAssetImportOptions,
  type UseAssetImportReturn,
  // Components
  AssetDropZone,
  type AssetDropZoneProps,
  AssetPreviewCard,
  type AssetPreviewCardProps,
  ImportQueuePanel,
  type ImportQueuePanelProps,
  AssetImportDialog,
  type AssetImportDialogProps,
  // Renderer Detection & Toggle
  hasWebGPUAPI,
  hasWebGL2,
  getWebGL2RendererInfo,
  probeWebGPU,
  detectRendererCapabilities,
  saveRendererPreference,
  loadRendererPreference,
  clearRendererPreference,
  resolveRendererBackend,
  type RendererBackend,
  type RendererCapabilities,
  type GPUAdapterInfo,
  // Performance Monitoring
  PerformanceMonitor,
  type RenderStats,
  type PerformanceMonitorConfig,
  // Renderer Toggle Hook
  useRendererToggle,
  type UseRendererToggleOptions,
  type UseRendererToggleReturn,
  // Renderer Stats Overlay
  RendererStatsOverlay,
  type RendererStatsOverlayProps,
  // Post-Processing Types
  DEFAULT_POST_PROCESSING,
  DEFAULT_BLOOM,
  DEFAULT_DEPTH_OF_FIELD,
  DEFAULT_MOTION_BLUR,
  DEFAULT_COLOR_GRADING,
  SLIDER_RANGES,
  BUILT_IN_PRESETS,
  type PostProcessingSettings,
  type BloomSettings,
  type DepthOfFieldSettings,
  type MotionBlurSettings,
  type ColorGradingSettings,
  type PostProcessingPreset,
  type PostProcessingEvents,
  type SliderRange,
  // Post-Processing Hook
  usePostProcessing,
  type UsePostProcessingOptions,
  type UsePostProcessingReturn,
  // Post-Processing Controls Component
  PostProcessingControls,
  type PostProcessingControlsProps,
  // Post-Processing Preview (Three.js render pipeline bridge)
  PostProcessingPreview,
  type PostProcessingPreviewConfig,
  // Post-Processing HoloScript Export
  exportPostProcessingToHoloScript,
  exportPostProcessingMinimal,
  parsePostProcessingFromHoloScript,
} from './studio';
