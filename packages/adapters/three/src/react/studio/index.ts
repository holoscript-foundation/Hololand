/**
 * Studio IDE Components
 *
 * A complete set of Studio IDE components including:
 *
 * **Asset Import System** — Drag-and-drop asset import with progressive loading previews.
 *   AssetImportDialog (orchestrator)
 *     -> AssetDropZone (drag-and-drop input)
 *     -> ImportQueuePanel (queue display + actions)
 *       -> AssetPreviewCard[] (progressive preview per file)
 *
 *   useAssetImport (state management hook)
 *     -> File classification (assetUtils)
 *     -> Validation pipeline
 *     -> Progressive preview generation
 *     -> Import queue management
 *
 * **Multiplayer Presence** — CRDT-backed real-time collaborator awareness.
 *   PresenceOverlay (top-level container)
 *     -> CollaboratorCursor[] (remote user cursors on viewport)
 *     -> UserListPanel (sidebar with connected user list)
 *
 *   usePresence (CRDT-backed presence state hook)
 *     -> CRDTRoom event subscriptions (player:joined, player:left, player:updated)
 *     -> Throttled cursor/selection broadcasting
 *     -> Deterministic color assignment per user
 *     -> Idle detection and stale cursor cleanup
 *
 * @example Quick start — Asset Import
 * ```tsx
 * import { AssetImportDialog } from '@hololand/three-adapter/react/studio';
 *
 * function App() {
 *   return (
 *     <AssetImportDialog
 *       onImport={async (entries) => {
 *         for (const entry of entries) {
 *           await projectStore.addAsset(entry.file, entry.alias);
 *         }
 *       }}
 *     />
 *   );
 * }
 * ```
 *
 * @example Multiplayer Presence
 * ```tsx
 * import { PresenceOverlay } from '@hololand/three-adapter/react/studio';
 *
 * function StudioViewport({ room, localPlayerId }) {
 *   return (
 *     <>
 *       <Canvas>{/* 3D scene */}</Canvas>
 *       <PresenceOverlay
 *         room={room}
 *         localPlayerId={localPlayerId}
 *         showCursors
 *         showUserList
 *         userListPosition="top-left"
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * @example Renderer stats overlay
 * ```tsx
 * import { RendererStatsOverlay } from '@hololand/three-adapter/react/studio';
 *
 * function StudioViewport({ renderer }) {
 *   return (
 *     <RendererStatsOverlay
 *       renderer={renderer}
 *       position="top-right"
 *       onBackendChange={(backend) => console.log('Switched to', backend)}
 *     />
 *   );
 * }
 * ```
 *
 * @example Post-processing controls
 * ```tsx
 * import { PostProcessingControls, usePostProcessing } from '@hololand/three-adapter/react/studio';
 *
 * function StudioViewport() {
 *   const ppCtrl = usePostProcessing({ persist: true });
 *
 *   return (
 *     <>
 *       <Canvas>{/* 3D scene with PostProcessingPreview */}</Canvas>
 *       <PostProcessingControls
 *         controller={ppCtrl}
 *         position="bottom-right"
 *         onExport={(source) => console.log(source)}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * @module studio
 */

// Types
export {
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
} from './types';

// Utilities
export {
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
} from './assetUtils';

// Hook
export {
  useAssetImport,
  type UseAssetImportOptions,
  type UseAssetImportReturn,
} from './useAssetImport';

// Components
export { AssetDropZone, type AssetDropZoneProps } from './AssetDropZone';
export { AssetPreviewCard, type AssetPreviewCardProps } from './AssetPreviewCard';
export { ImportQueuePanel, type ImportQueuePanelProps } from './ImportQueuePanel';
export { AssetImportDialog, type AssetImportDialogProps } from './AssetImportDialog';

// Renderer Detection & Preference Persistence
export {
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
} from './RendererDetector';

// Performance Monitoring
export {
  PerformanceMonitor,
  type RenderStats,
  type PerformanceMonitorConfig,
} from './PerformanceMonitor';

// Renderer Toggle Hook
export {
  useRendererToggle,
  type UseRendererToggleOptions,
  type UseRendererToggleReturn,
} from './useRendererToggle';

// Renderer Stats Overlay Component
export {
  RendererStatsOverlay,
  type RendererStatsOverlayProps,
} from './RendererStatsOverlay';

// Multiplayer Presence Hook
export {
  usePresence,
  type UsePresenceOptions,
  type UsePresenceReturn,
  type Collaborator,
  type CursorPosition,
} from './usePresence';

// Multiplayer Presence Components
export { CollaboratorCursor, type CollaboratorCursorProps } from './CollaboratorCursor';
export { UserListPanel, type UserListPanelProps } from './UserListPanel';
export { PresenceOverlay, type PresenceOverlayProps } from './PresenceOverlay';

// Post-Processing Types
export {
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
} from './PostProcessingTypes';

// Post-Processing Hook
export {
  usePostProcessing,
  type UsePostProcessingOptions,
  type UsePostProcessingReturn,
} from './usePostProcessing';

// Post-Processing Controls Component
export {
  PostProcessingControls,
  type PostProcessingControlsProps,
} from './PostProcessingControls';

// Post-Processing Preview (Three.js render pipeline bridge)
export {
  PostProcessingPreview,
  type PostProcessingPreviewConfig,
} from './PostProcessingPreview';

// Post-Processing HoloScript Export
export {
  exportPostProcessingToHoloScript,
  exportPostProcessingMinimal,
  parsePostProcessingFromHoloScript,
} from './postProcessingExport';
