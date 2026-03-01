/**
 * Asset Import Utilities
 *
 * Pure utility functions for file classification, validation, preview
 * generation, and metadata extraction. These are used by the import
 * hooks and components but contain no React-specific code.
 *
 * @module studio/assetUtils
 */

import {
  AssetCategory,
  EXTENSION_CATEGORY_MAP,
  MAX_FILE_SIZES,
  PreviewStage,
  ValidationSeverity,
  type AssetMetadataResult,
  type AssetPreview,
  type AudioPreviewInfo,
  type ImportQueueConfig,
  type ModelPreviewInfo,
  type ValidationMessage,
  type ValidationResult,
} from './types';

// =============================================================================
// FILE CLASSIFICATION
// =============================================================================

/**
 * Get the file extension (lowercase, with leading dot).
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) return '';
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Classify a file into an AssetCategory based on its extension.
 */
export function classifyFile(file: File): AssetCategory {
  const ext = getFileExtension(file.name);
  return EXTENSION_CATEGORY_MAP[ext] ?? AssetCategory.UNKNOWN;
}

/**
 * Extract metadata from a File object.
 */
export function extractFileMetadata(file: File): AssetMetadataResult {
  const extension = getFileExtension(file.name);
  const category = classifyFile(file);
  const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

  // Clean up the filename to create a valid alias:
  // - replace spaces and special chars with underscores
  // - collapse multiple underscores
  // - trim leading/trailing underscores
  // - lowercase
  const suggestedAlias = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

  return {
    fileSize: file.size,
    extension,
    mimeType: file.type || guessMimeType(extension),
    category,
    lastModified: file.lastModified,
    suggestedAlias: suggestedAlias || 'unnamed_asset',
  };
}

/**
 * Guess MIME type from extension when the browser doesn't provide one.
 */
function guessMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.fbx': 'application/octet-stream',
    '.obj': 'text/plain',
    '.usdz': 'model/vnd.usdz+zip',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.hdr': 'image/vnd.radiance',
    '.exr': 'image/x-exr',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.hsplus': 'text/x-holoscript',
    '.json': 'application/json',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a file for import.
 *
 * Checks:
 * - File extension is recognized
 * - File size is within limits for its category
 * - File is not empty
 * - Total batch constraints are respected
 */
export function validateFile(
  file: File,
  config: ImportQueueConfig,
  existingFiles: File[] = [],
): ValidationResult {
  const messages: ValidationMessage[] = [];
  const ext = getFileExtension(file.name);
  const category = classifyFile(file);
  let isValid = true;

  // Check if extension is accepted
  if (config.acceptedExtensions.length > 0 && !config.acceptedExtensions.includes(ext)) {
    messages.push({
      severity: ValidationSeverity.ERROR,
      message: `File type "${ext}" is not accepted. Accepted types: ${config.acceptedExtensions.join(', ')}`,
    });
    isValid = false;
  }

  // Check if extension is rejected
  if (config.rejectedExtensions.includes(ext)) {
    messages.push({
      severity: ValidationSeverity.ERROR,
      message: `File type "${ext}" is explicitly rejected.`,
    });
    isValid = false;
  }

  // Check unknown category
  if (category === AssetCategory.UNKNOWN) {
    messages.push({
      severity: ValidationSeverity.WARNING,
      message: `File type "${ext}" is not a recognized asset format.`,
      suggestion: 'The file may still be imported but preview generation will be limited.',
    });
  }

  // Check file is not empty
  if (file.size === 0) {
    messages.push({
      severity: ValidationSeverity.ERROR,
      message: 'File is empty (0 bytes).',
    });
    isValid = false;
  }

  // Check file size limit for category
  const maxSize = MAX_FILE_SIZES[category];
  if (file.size > maxSize) {
    messages.push({
      severity: ValidationSeverity.ERROR,
      message: `File size (${formatFileSize(file.size)}) exceeds the maximum for ${category} assets (${formatFileSize(maxSize)}).`,
    });
    isValid = false;
  }

  // Check total batch size
  const currentTotal = existingFiles.reduce((sum, f) => sum + f.size, 0);
  if (currentTotal + file.size > config.maxTotalSize) {
    messages.push({
      severity: ValidationSeverity.ERROR,
      message: `Adding this file would exceed the total import size limit of ${formatFileSize(config.maxTotalSize)}.`,
    });
    isValid = false;
  }

  // Check max file count
  if (existingFiles.length >= config.maxFiles) {
    messages.push({
      severity: ValidationSeverity.ERROR,
      message: `Maximum number of files (${config.maxFiles}) has been reached.`,
    });
    isValid = false;
  }

  // Info messages
  if (isValid && category === AssetCategory.MODEL_3D) {
    messages.push({
      severity: ValidationSeverity.INFO,
      message: '3D model will be analyzed for vertex count, materials, and animations.',
    });
  }

  if (isValid && file.size > 50 * 1024 * 1024) {
    messages.push({
      severity: ValidationSeverity.WARNING,
      message: `Large file (${formatFileSize(file.size)}). Import may take a while.`,
    });
  }

  return {
    isValid,
    messages,
    isDuplicate: false, // Duplicate detection requires hash comparison, handled externally
  };
}

// =============================================================================
// PREVIEW GENERATION
// =============================================================================

/**
 * Create an initial empty preview
 */
export function createEmptyPreview(): AssetPreview {
  return {
    stage: PreviewStage.NONE,
    imageUrl: null,
    dominantColor: null,
    aspectRatio: 1,
    modelInfo: null,
    audioInfo: null,
  };
}

/**
 * Generate a thumbnail preview for an image file.
 *
 * Creates a small canvas-rendered thumbnail from the image file.
 * Returns a data URL suitable for display in an <img> tag.
 */
export async function generateImageThumbnail(
  file: File,
  maxSize: number = 256,
): Promise<{ imageUrl: string; aspectRatio: number; dominantColor: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate thumbnail dimensions preserving aspect ratio
        const aspectRatio = img.width / img.height;
        let width = maxSize;
        let height = maxSize;

        if (aspectRatio > 1) {
          height = Math.round(maxSize / aspectRatio);
        } else {
          width = Math.round(maxSize * aspectRatio);
        }

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Extract dominant color from a 1x1 sample
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 1;
        sampleCanvas.height = 1;
        const sampleCtx = sampleCanvas.getContext('2d');
        if (sampleCtx) {
          sampleCtx.drawImage(img, 0, 0, 1, 1);
          const pixel = sampleCtx.getImageData(0, 0, 1, 1).data;
          var dominantColor = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
        } else {
          var dominantColor = '#666666';
        }

        const imageUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(objectUrl);

        resolve({ imageUrl, aspectRatio, dominantColor });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Generate a waveform preview for an audio file.
 *
 * Decodes the audio and samples ~200 peak values for visualization.
 */
export async function generateAudioPreview(
  file: File,
  sampleCount: number = 200,
): Promise<AudioPreviewInfo> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBucket = Math.floor(channelData.length / sampleCount);

    const waveform = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const start = i * samplesPerBucket;
      const end = Math.min(start + samplesPerBucket, channelData.length);
      let peak = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > peak) peak = abs;
      }
      waveform[i] = peak;
    }

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      waveform,
    };
  } finally {
    await audioContext.close();
  }
}

/**
 * Generate a video thumbnail by capturing the first frame.
 */
export async function generateVideoThumbnail(
  file: File,
  maxSize: number = 256,
): Promise<{ imageUrl: string; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    video.onloadeddata = () => {
      // Seek to 1 second for a more representative frame
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      try {
        const aspectRatio = video.videoWidth / video.videoHeight;
        let width = maxSize;
        let height = maxSize;

        if (aspectRatio > 1) {
          height = Math.round(maxSize / aspectRatio);
        } else {
          width = Math.round(maxSize * aspectRatio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const imageUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(objectUrl);

        resolve({ imageUrl, aspectRatio });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load video: ${file.name}`));
    };

    video.src = objectUrl;
  });
}

// =============================================================================
// GLB/GLTF METADATA EXTRACTION (browser-safe, no Three.js dependency)
// =============================================================================

/**
 * Extract basic metadata from a GLB file header without full parsing.
 *
 * Reads the GLB binary header and JSON chunk to extract scene metadata
 * (vertex counts, materials, animations) without loading into Three.js.
 */
export async function extractGLBMetadata(file: File): Promise<ModelPreviewInfo | null> {
  try {
    // Read just enough of the file for the header + JSON chunk
    const headerSize = 12; // GLB header: magic(4) + version(4) + length(4)
    const headerBuffer = await readFileSlice(file, 0, headerSize);
    const headerView = new DataView(headerBuffer);

    // Validate GLB magic number: 0x46546C67 ("glTF")
    const magic = headerView.getUint32(0, true);
    if (magic !== 0x46546C67) {
      return null; // Not a valid GLB file
    }

    // Read chunk 0 header (JSON chunk)
    const chunk0HeaderBuffer = await readFileSlice(file, headerSize, headerSize + 8);
    const chunk0View = new DataView(chunk0HeaderBuffer);
    const jsonChunkLength = chunk0View.getUint32(0, true);
    const jsonChunkType = chunk0View.getUint32(4, true);

    // Verify it's a JSON chunk (0x4E4F534A = "JSON")
    if (jsonChunkType !== 0x4E4F534A) {
      return null;
    }

    // Read the JSON chunk (cap at 2MB to avoid memory issues)
    const maxJsonSize = Math.min(jsonChunkLength, 2 * 1024 * 1024);
    const jsonBuffer = await readFileSlice(file, headerSize + 8, headerSize + 8 + maxJsonSize);
    const decoder = new TextDecoder();
    // Strip trailing null bytes from 4-byte alignment padding
    const jsonString = decoder.decode(jsonBuffer).replace(/\0+$/, '');
    const gltf = JSON.parse(jsonString);

    return extractGLTFJsonMetadata(gltf);
  } catch {
    return null;
  }
}

/**
 * Extract metadata from parsed GLTF JSON.
 */
function extractGLTFJsonMetadata(gltf: any): ModelPreviewInfo {
  let vertexCount = 0;
  let faceCount = 0;
  let textureCount = 0;
  let estimatedGPUMemory = 0;

  // Count vertices from accessors
  const accessors = gltf.accessors ?? [];
  const meshes = gltf.meshes ?? [];

  for (const mesh of meshes) {
    for (const primitive of mesh.primitives ?? []) {
      // Position accessor typically gives vertex count
      if (primitive.attributes?.POSITION !== undefined) {
        const accessor = accessors[primitive.attributes.POSITION];
        if (accessor) {
          vertexCount += accessor.count ?? 0;
        }
      }

      // Index accessor gives face count
      if (primitive.indices !== undefined) {
        const accessor = accessors[primitive.indices];
        if (accessor) {
          faceCount += Math.floor((accessor.count ?? 0) / 3);
        }
      }
    }
  }

  // Count textures
  const textures = gltf.textures ?? [];
  textureCount = textures.length;

  // Count materials
  const materials = gltf.materials ?? [];

  // Count animations
  const animations = gltf.animations ?? [];
  const animationNames = animations.map((a: any) => a.name ?? 'Unnamed');

  // Check for morph targets
  let hasMorphTargets = false;
  for (const mesh of meshes) {
    for (const primitive of mesh.primitives ?? []) {
      if (primitive.targets && primitive.targets.length > 0) {
        hasMorphTargets = true;
        break;
      }
    }
  }

  // Check for skinned meshes
  const skins = gltf.skins ?? [];
  const hasSkinnedMeshes = skins.length > 0;

  // Estimate GPU memory (rough: vertices * 32 bytes + textures * estimated size)
  estimatedGPUMemory = vertexCount * 32 + textureCount * 256 * 256 * 4;

  return {
    vertexCount,
    faceCount,
    materialCount: materials.length,
    animationCount: animations.length,
    animationNames,
    boundingBox: [1, 1, 1], // Would need actual bounds computation
    hasMorphTargets,
    hasSkinnedMeshes,
    textureCount,
    estimatedGPUMemory,
  };
}

/**
 * Read a slice of a File as ArrayBuffer.
 */
function readFileSlice(file: File, start: number, end: number): Promise<ArrayBuffer> {
  const blob = file.slice(start, end);
  // FileReader is the most reliable across all environments (browser + jsdom)
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }
  // Fallback for non-browser environments
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Response(blob).arrayBuffer();
}

// =============================================================================
// FILE HASHING (for deduplication)
// =============================================================================

/**
 * Compute a SHA-256 hash of a file's contents.
 *
 * For large files, only hashes the first 1MB + last 1MB + file size
 * to keep hashing fast while still being collision-resistant enough
 * for deduplication.
 */
export async function computeFileHash(file: File): Promise<string> {
  const SAMPLE_SIZE = 1024 * 1024; // 1 MB

  let dataToHash: ArrayBuffer;

  if (file.size <= SAMPLE_SIZE * 2) {
    // Small file: hash the whole thing
    dataToHash = await readFileSlice(file, 0, file.size);
  } else {
    // Large file: hash first 1MB + last 1MB + size
    const first = await readFileSlice(file, 0, SAMPLE_SIZE);
    const last = await readFileSlice(file, file.size - SAMPLE_SIZE, file.size);
    const sizeBuffer = new ArrayBuffer(8);
    new DataView(sizeBuffer).setFloat64(0, file.size);

    const combined = new Uint8Array(first.byteLength + last.byteLength + sizeBuffer.byteLength);
    combined.set(new Uint8Array(first), 0);
    combined.set(new Uint8Array(last), first.byteLength);
    combined.set(new Uint8Array(sizeBuffer), first.byteLength + last.byteLength);
    dataToHash = combined.buffer;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', dataToHash);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Format a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Format a duration in seconds to a human-readable string.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate a unique ID for an import entry.
 */
export function generateImportId(): string {
  return `import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get a display-friendly category label.
 */
export function getCategoryLabel(category: AssetCategory): string {
  const labels: Record<AssetCategory, string> = {
    [AssetCategory.MODEL_3D]: '3D Model',
    [AssetCategory.TEXTURE]: 'Texture',
    [AssetCategory.AUDIO]: 'Audio',
    [AssetCategory.VIDEO]: 'Video',
    [AssetCategory.HOLOSCRIPT]: 'HoloScript',
    [AssetCategory.CONFIG]: 'Config',
    [AssetCategory.UNKNOWN]: 'Unknown',
  };
  return labels[category];
}

/**
 * Get the accept string for file input based on config.
 */
export function getAcceptString(config: ImportQueueConfig): string {
  if (config.acceptedExtensions.length > 0) {
    return config.acceptedExtensions.join(',');
  }
  // Return all known extensions
  return Object.keys(EXTENSION_CATEGORY_MAP).join(',');
}
