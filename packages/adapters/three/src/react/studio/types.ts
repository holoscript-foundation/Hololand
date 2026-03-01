/**
 * Asset Import Types for Studio IDE
 *
 * Defines the type system for the drag-and-drop asset import pipeline,
 * including file classification, import state machines, progressive
 * preview stages, and validation results.
 *
 * @module studio/types
 */

// =============================================================================
// ASSET FILE CLASSIFICATION
// =============================================================================

/**
 * Supported asset categories for import
 */
export enum AssetCategory {
  /** 3D models: .glb, .gltf, .fbx, .obj, .usdz */
  MODEL_3D = 'model_3d',
  /** Textures/images: .png, .jpg, .webp, .hdr, .exr */
  TEXTURE = 'texture',
  /** Audio: .mp3, .ogg, .wav, .flac */
  AUDIO = 'audio',
  /** Video: .mp4, .webm */
  VIDEO = 'video',
  /** HoloScript source: .hsplus */
  HOLOSCRIPT = 'holoscript',
  /** Configuration: .json, .yaml */
  CONFIG = 'config',
  /** Unknown/unsupported file type */
  UNKNOWN = 'unknown',
}

/**
 * Mapping of file extensions to asset categories
 */
export const EXTENSION_CATEGORY_MAP: Record<string, AssetCategory> = {
  // 3D Models
  '.glb': AssetCategory.MODEL_3D,
  '.gltf': AssetCategory.MODEL_3D,
  '.fbx': AssetCategory.MODEL_3D,
  '.obj': AssetCategory.MODEL_3D,
  '.usdz': AssetCategory.MODEL_3D,
  '.dae': AssetCategory.MODEL_3D,
  '.stl': AssetCategory.MODEL_3D,
  '.ply': AssetCategory.MODEL_3D,
  // Textures
  '.png': AssetCategory.TEXTURE,
  '.jpg': AssetCategory.TEXTURE,
  '.jpeg': AssetCategory.TEXTURE,
  '.webp': AssetCategory.TEXTURE,
  '.hdr': AssetCategory.TEXTURE,
  '.exr': AssetCategory.TEXTURE,
  '.svg': AssetCategory.TEXTURE,
  '.gif': AssetCategory.TEXTURE,
  '.bmp': AssetCategory.TEXTURE,
  '.tga': AssetCategory.TEXTURE,
  '.ktx2': AssetCategory.TEXTURE,
  '.basis': AssetCategory.TEXTURE,
  // Audio
  '.mp3': AssetCategory.AUDIO,
  '.ogg': AssetCategory.AUDIO,
  '.wav': AssetCategory.AUDIO,
  '.flac': AssetCategory.AUDIO,
  '.aac': AssetCategory.AUDIO,
  '.m4a': AssetCategory.AUDIO,
  // Video
  '.mp4': AssetCategory.VIDEO,
  '.webm': AssetCategory.VIDEO,
  '.mov': AssetCategory.VIDEO,
  // HoloScript
  '.hsplus': AssetCategory.HOLOSCRIPT,
  '.hs': AssetCategory.HOLOSCRIPT,
  // Config
  '.json': AssetCategory.CONFIG,
  '.yaml': AssetCategory.CONFIG,
  '.yml': AssetCategory.CONFIG,
  '.toml': AssetCategory.CONFIG,
};

/**
 * Maximum file sizes per category (in bytes)
 */
export const MAX_FILE_SIZES: Record<AssetCategory, number> = {
  [AssetCategory.MODEL_3D]: 500 * 1024 * 1024,   // 500 MB
  [AssetCategory.TEXTURE]: 100 * 1024 * 1024,     // 100 MB
  [AssetCategory.AUDIO]: 50 * 1024 * 1024,        // 50 MB
  [AssetCategory.VIDEO]: 500 * 1024 * 1024,       // 500 MB
  [AssetCategory.HOLOSCRIPT]: 10 * 1024 * 1024,   // 10 MB
  [AssetCategory.CONFIG]: 5 * 1024 * 1024,        // 5 MB
  [AssetCategory.UNKNOWN]: 50 * 1024 * 1024,      // 50 MB
};

// =============================================================================
// IMPORT STATE MACHINE
// =============================================================================

/**
 * Import processing state for a single file
 */
export enum ImportState {
  /** Queued, waiting for processing slot */
  QUEUED = 'queued',
  /** File is being validated (type check, size check, duplicate check) */
  VALIDATING = 'validating',
  /** Generating preview (thumbnail, waveform, metadata extraction) */
  GENERATING_PREVIEW = 'generating_preview',
  /** File is being read/parsed */
  READING = 'reading',
  /** Generating optimized variants (LOD tiers, compressed textures) */
  OPTIMIZING = 'optimizing',
  /** Writing to asset store / uploading */
  IMPORTING = 'importing',
  /** Successfully imported */
  COMPLETE = 'complete',
  /** Import failed with error */
  ERROR = 'error',
  /** User cancelled the import */
  CANCELLED = 'cancelled',
}

// =============================================================================
// PROGRESSIVE PREVIEW
// =============================================================================

/**
 * Preview generation stages (displayed progressively)
 */
export enum PreviewStage {
  /** No preview available yet */
  NONE = 'none',
  /** Placeholder icon based on file type */
  ICON = 'icon',
  /** Low-resolution thumbnail (fast, from EXIF or first frame) */
  THUMBNAIL = 'thumbnail',
  /** Full preview (rendered 3D thumbnail, full image, waveform) */
  FULL_PREVIEW = 'full_preview',
}

/**
 * Preview data for an importing asset
 */
export interface AssetPreview {
  /** Current preview stage */
  stage: PreviewStage;
  /** Data URL or object URL for the preview image */
  imageUrl: string | null;
  /** Dominant color extracted from the asset (hex string) */
  dominantColor: string | null;
  /** Aspect ratio of the preview (width / height) */
  aspectRatio: number;
  /** 3D model metadata (if applicable) */
  modelInfo: ModelPreviewInfo | null;
  /** Audio metadata (if applicable) */
  audioInfo: AudioPreviewInfo | null;
}

/**
 * Metadata extracted from a 3D model during preview
 */
export interface ModelPreviewInfo {
  /** Number of vertices */
  vertexCount: number;
  /** Number of triangles/faces */
  faceCount: number;
  /** Number of materials */
  materialCount: number;
  /** Number of animation clips */
  animationCount: number;
  /** Animation clip names */
  animationNames: string[];
  /** Bounding box dimensions [width, height, depth] */
  boundingBox: [number, number, number];
  /** Whether the model contains morph targets */
  hasMorphTargets: boolean;
  /** Whether the model contains skinned meshes */
  hasSkinnedMeshes: boolean;
  /** Texture count */
  textureCount: number;
  /** Total estimated GPU memory (bytes) */
  estimatedGPUMemory: number;
}

/**
 * Metadata extracted from an audio file during preview
 */
export interface AudioPreviewInfo {
  /** Duration in seconds */
  duration: number;
  /** Sample rate */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Waveform data (normalized 0-1, ~200 samples) */
  waveform: Float32Array | null;
}

// =============================================================================
// IMPORT ENTRY
// =============================================================================

/**
 * Complete state for a single file being imported
 */
export interface ImportEntry {
  /** Unique ID for this import entry */
  id: string;
  /** Original file reference */
  file: File;
  /** Detected asset category */
  category: AssetCategory;
  /** Current import state */
  state: ImportState;
  /** Import progress (0-1) */
  progress: number;
  /** Progressive preview data */
  preview: AssetPreview;
  /** Validation result (populated after validation) */
  validation: ValidationResult | null;
  /** Error message (if state is ERROR) */
  error: string | null;
  /** Timestamp when the import started */
  startedAt: number;
  /** Timestamp when the import completed or failed */
  completedAt: number | null;
  /** User-editable asset alias (defaults to filename without extension) */
  alias: string;
  /** Target import path in the project */
  targetPath: string;
  /** Whether this entry is selected in the UI */
  selected: boolean;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Severity level for validation messages
 */
export enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * A single validation message
 */
export interface ValidationMessage {
  severity: ValidationSeverity;
  message: string;
  /** Suggested fix (optional) */
  suggestion?: string;
}

/**
 * Result of validating a file for import
 */
export interface ValidationResult {
  /** Whether the file can be imported (no errors) */
  isValid: boolean;
  /** Validation messages (info, warnings, errors) */
  messages: ValidationMessage[];
  /** Whether a duplicate was detected */
  isDuplicate: boolean;
  /** If duplicate, the path of the existing asset */
  duplicatePath?: string;
  /** Computed file hash (for dedup) */
  fileHash?: string;
}

// =============================================================================
// DROP ZONE
// =============================================================================

/**
 * Drop zone visual state
 */
export enum DropZoneState {
  /** Default idle state */
  IDLE = 'idle',
  /** User is dragging files over the window (not yet over zone) */
  DRAG_ACTIVE = 'drag_active',
  /** User is dragging files directly over the drop zone */
  DRAG_OVER = 'drag_over',
  /** Files have been dropped and are being processed */
  PROCESSING = 'processing',
  /** Drop rejected (wrong file types, too many files) */
  REJECTED = 'rejected',
}

// =============================================================================
// IMPORT QUEUE CONFIGURATION
// =============================================================================

/**
 * Configuration for the import queue
 */
export interface ImportQueueConfig {
  /** Maximum number of files that can be imported at once */
  maxFiles: number;
  /** Maximum total size across all files (bytes) */
  maxTotalSize: number;
  /** Number of concurrent file processing slots */
  concurrency: number;
  /** Accepted file extensions (empty = accept all known) */
  acceptedExtensions: string[];
  /** Rejected file extensions (takes priority over accepted) */
  rejectedExtensions: string[];
  /** Whether to auto-start importing after files are dropped */
  autoImport: boolean;
  /** Default target path for imported assets */
  defaultTargetPath: string;
  /** Whether to generate 3D model previews */
  generate3DPreviews: boolean;
  /** Maximum time for preview generation (ms) */
  previewTimeout: number;
}

/**
 * Default import queue configuration
 */
export const DEFAULT_IMPORT_QUEUE_CONFIG: ImportQueueConfig = {
  maxFiles: 50,
  maxTotalSize: 2 * 1024 * 1024 * 1024, // 2 GB
  concurrency: 3,
  acceptedExtensions: [],
  rejectedExtensions: [],
  autoImport: false,
  defaultTargetPath: '/assets/',
  generate3DPreviews: true,
  previewTimeout: 10000, // 10 seconds
};

// =============================================================================
// CALLBACKS AND EVENTS
// =============================================================================

/**
 * Events emitted by the import system
 */
export interface ImportEvents {
  /** Files have been dropped / selected */
  onFilesAdded: (entries: ImportEntry[]) => void;
  /** An entry's state has changed */
  onEntryStateChange: (entry: ImportEntry, previousState: ImportState) => void;
  /** All imports are complete */
  onAllComplete: (entries: ImportEntry[]) => void;
  /** An import failed */
  onError: (entry: ImportEntry, error: Error) => void;
  /** Progress update for an entry */
  onProgress: (entry: ImportEntry) => void;
  /** User cancelled an import */
  onCancel: (entry: ImportEntry) => void;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Extract metadata result from an asset file
 */
export interface AssetMetadataResult {
  /** File size in bytes */
  fileSize: number;
  /** File extension (lowercase, with dot) */
  extension: string;
  /** MIME type */
  mimeType: string;
  /** Asset category */
  category: AssetCategory;
  /** Last modified timestamp */
  lastModified: number;
  /** Suggested alias (cleaned filename) */
  suggestedAlias: string;
}
