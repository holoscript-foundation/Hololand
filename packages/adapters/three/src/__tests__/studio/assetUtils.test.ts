/**
 * Tests for Asset Import Utilities
 *
 * Covers file classification, metadata extraction, validation,
 * file hashing, and formatting helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFileExtension,
  classifyFile,
  extractFileMetadata,
  validateFile,
  createEmptyPreview,
  computeFileHash,
  formatFileSize,
  formatDuration,
  generateImportId,
  getCategoryLabel,
  getAcceptString,
  extractGLBMetadata,
} from '../../react/studio/assetUtils';
import {
  AssetCategory,
  PreviewStage,
  ValidationSeverity,
  DEFAULT_IMPORT_QUEUE_CONFIG,
  type ImportQueueConfig,
} from '../../react/studio/types';

// =============================================================================
// HELPERS
// =============================================================================

function createMockFile(
  name: string,
  size: number,
  type: string = '',
): File {
  const content = new ArrayBuffer(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
}

// =============================================================================
// getFileExtension
// =============================================================================

describe('getFileExtension', () => {
  it('returns lowercase extension with dot', () => {
    expect(getFileExtension('model.GLB')).toBe('.glb');
    expect(getFileExtension('texture.PNG')).toBe('.png');
    expect(getFileExtension('scene.hsplus')).toBe('.hsplus');
  });

  it('handles multiple dots', () => {
    expect(getFileExtension('my.file.name.gltf')).toBe('.gltf');
  });

  it('returns empty string for no extension', () => {
    expect(getFileExtension('README')).toBe('');
    expect(getFileExtension('Makefile')).toBe('');
  });

  it('returns empty string for trailing dot', () => {
    expect(getFileExtension('file.')).toBe('');
  });
});

// =============================================================================
// classifyFile
// =============================================================================

describe('classifyFile', () => {
  it('classifies 3D model files', () => {
    expect(classifyFile(createMockFile('model.glb', 1024))).toBe(AssetCategory.MODEL_3D);
    expect(classifyFile(createMockFile('model.gltf', 1024))).toBe(AssetCategory.MODEL_3D);
    expect(classifyFile(createMockFile('model.fbx', 1024))).toBe(AssetCategory.MODEL_3D);
    expect(classifyFile(createMockFile('model.obj', 1024))).toBe(AssetCategory.MODEL_3D);
    expect(classifyFile(createMockFile('model.usdz', 1024))).toBe(AssetCategory.MODEL_3D);
  });

  it('classifies texture files', () => {
    expect(classifyFile(createMockFile('tex.png', 1024))).toBe(AssetCategory.TEXTURE);
    expect(classifyFile(createMockFile('tex.jpg', 1024))).toBe(AssetCategory.TEXTURE);
    expect(classifyFile(createMockFile('tex.webp', 1024))).toBe(AssetCategory.TEXTURE);
    expect(classifyFile(createMockFile('tex.hdr', 1024))).toBe(AssetCategory.TEXTURE);
    expect(classifyFile(createMockFile('tex.ktx2', 1024))).toBe(AssetCategory.TEXTURE);
  });

  it('classifies audio files', () => {
    expect(classifyFile(createMockFile('sound.mp3', 1024))).toBe(AssetCategory.AUDIO);
    expect(classifyFile(createMockFile('sound.ogg', 1024))).toBe(AssetCategory.AUDIO);
    expect(classifyFile(createMockFile('sound.wav', 1024))).toBe(AssetCategory.AUDIO);
    expect(classifyFile(createMockFile('sound.flac', 1024))).toBe(AssetCategory.AUDIO);
  });

  it('classifies video files', () => {
    expect(classifyFile(createMockFile('clip.mp4', 1024))).toBe(AssetCategory.VIDEO);
    expect(classifyFile(createMockFile('clip.webm', 1024))).toBe(AssetCategory.VIDEO);
  });

  it('classifies HoloScript files', () => {
    expect(classifyFile(createMockFile('scene.hsplus', 1024))).toBe(AssetCategory.HOLOSCRIPT);
    expect(classifyFile(createMockFile('script.hs', 1024))).toBe(AssetCategory.HOLOSCRIPT);
  });

  it('classifies config files', () => {
    expect(classifyFile(createMockFile('config.json', 1024))).toBe(AssetCategory.CONFIG);
    expect(classifyFile(createMockFile('config.yaml', 1024))).toBe(AssetCategory.CONFIG);
    expect(classifyFile(createMockFile('config.yml', 1024))).toBe(AssetCategory.CONFIG);
  });

  it('returns UNKNOWN for unrecognized extensions', () => {
    expect(classifyFile(createMockFile('file.xyz', 1024))).toBe(AssetCategory.UNKNOWN);
    expect(classifyFile(createMockFile('file.exe', 1024))).toBe(AssetCategory.UNKNOWN);
  });

  it('handles case-insensitive extensions', () => {
    expect(classifyFile(createMockFile('MODEL.GLB', 1024))).toBe(AssetCategory.MODEL_3D);
    expect(classifyFile(createMockFile('TEXTURE.PNG', 1024))).toBe(AssetCategory.TEXTURE);
  });
});

// =============================================================================
// extractFileMetadata
// =============================================================================

describe('extractFileMetadata', () => {
  it('extracts basic metadata', () => {
    const file = createMockFile('my_model.glb', 1024, 'model/gltf-binary');
    const meta = extractFileMetadata(file);

    expect(meta.fileSize).toBe(1024);
    expect(meta.extension).toBe('.glb');
    expect(meta.mimeType).toBe('model/gltf-binary');
    expect(meta.category).toBe(AssetCategory.MODEL_3D);
    expect(meta.suggestedAlias).toBe('my_model');
  });

  it('cleans special characters from alias', () => {
    const file = createMockFile('My Cool Model (v2)!.glb', 1024);
    const meta = extractFileMetadata(file);

    expect(meta.suggestedAlias).toBe('my_cool_model_v2');
  });

  it('handles files with no MIME type', () => {
    const file = createMockFile('custom.hsplus', 1024, '');
    const meta = extractFileMetadata(file);

    expect(meta.mimeType).toBe('text/x-holoscript');
  });

  it('generates default alias for unnamed files', () => {
    // File with only special chars before extension
    const file = createMockFile('!!!.glb', 1024);
    const meta = extractFileMetadata(file);

    expect(meta.suggestedAlias).toBe('unnamed_asset');
  });
});

// =============================================================================
// validateFile
// =============================================================================

describe('validateFile', () => {
  const defaultConfig: ImportQueueConfig = { ...DEFAULT_IMPORT_QUEUE_CONFIG };

  it('validates a normal file successfully', () => {
    const file = createMockFile('model.glb', 1024);
    const result = validateFile(file, defaultConfig);

    expect(result.isValid).toBe(true);
    expect(result.isDuplicate).toBe(false);
  });

  it('rejects empty files', () => {
    const file = createMockFile('empty.glb', 0);
    const result = validateFile(file, defaultConfig);

    expect(result.isValid).toBe(false);
    expect(result.messages.some((m) => m.severity === ValidationSeverity.ERROR)).toBe(true);
  });

  it('rejects files exceeding size limit', () => {
    const file = createMockFile('huge.glb', 600 * 1024 * 1024); // 600 MB > 500 MB limit
    const result = validateFile(file, defaultConfig);

    expect(result.isValid).toBe(false);
    expect(result.messages.some((m) => m.message.includes('exceeds'))).toBe(true);
  });

  it('rejects files not in accepted extensions list', () => {
    const config: ImportQueueConfig = {
      ...defaultConfig,
      acceptedExtensions: ['.glb', '.gltf'],
    };
    const file = createMockFile('image.png', 1024);
    const result = validateFile(file, config);

    expect(result.isValid).toBe(false);
    expect(result.messages.some((m) => m.message.includes('not accepted'))).toBe(true);
  });

  it('rejects explicitly blocked extensions', () => {
    const config: ImportQueueConfig = {
      ...defaultConfig,
      rejectedExtensions: ['.exe', '.bat'],
    };
    const file = createMockFile('program.exe', 1024);
    const result = validateFile(file, config);

    expect(result.isValid).toBe(false);
    expect(result.messages.some((m) => m.message.includes('rejected'))).toBe(true);
  });

  it('warns about unknown file types', () => {
    const file = createMockFile('data.xyz', 1024);
    const result = validateFile(file, defaultConfig);

    expect(result.isValid).toBe(true); // Warning, not error
    expect(result.messages.some((m) => m.severity === ValidationSeverity.WARNING)).toBe(true);
  });

  it('rejects when max file count is reached', () => {
    const existingFiles = Array.from({ length: 50 }, (_, i) =>
      createMockFile(`file${i}.glb`, 100),
    );
    const file = createMockFile('new.glb', 100);
    const result = validateFile(file, defaultConfig, existingFiles);

    expect(result.isValid).toBe(false);
    expect(result.messages.some((m) => m.message.includes('Maximum number'))).toBe(true);
  });

  it('rejects when total batch size limit is exceeded', () => {
    const config: ImportQueueConfig = { ...defaultConfig, maxTotalSize: 1024 };
    const existingFiles = [createMockFile('existing.glb', 900)];
    const file = createMockFile('new.glb', 200);
    const result = validateFile(file, config, existingFiles);

    expect(result.isValid).toBe(false);
    expect(result.messages.some((m) => m.message.includes('total import size'))).toBe(true);
  });

  it('adds info message for 3D models', () => {
    const file = createMockFile('model.glb', 1024);
    const result = validateFile(file, defaultConfig);

    expect(result.messages.some((m) => m.severity === ValidationSeverity.INFO)).toBe(true);
  });

  it('warns about large files', () => {
    const file = createMockFile('big.png', 60 * 1024 * 1024); // 60 MB
    const result = validateFile(file, defaultConfig);

    expect(result.isValid).toBe(true);
    expect(result.messages.some((m) => m.message.includes('Large file'))).toBe(true);
  });
});

// =============================================================================
// createEmptyPreview
// =============================================================================

describe('createEmptyPreview', () => {
  it('creates a preview with NONE stage', () => {
    const preview = createEmptyPreview();

    expect(preview.stage).toBe(PreviewStage.NONE);
    expect(preview.imageUrl).toBeNull();
    expect(preview.dominantColor).toBeNull();
    expect(preview.aspectRatio).toBe(1);
    expect(preview.modelInfo).toBeNull();
    expect(preview.audioInfo).toBeNull();
  });
});

// =============================================================================
// formatFileSize
// =============================================================================

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });
});

// =============================================================================
// formatDuration
// =============================================================================

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(5.3)).toBe('5.3s');
    expect(formatDuration(0.5)).toBe('0.5s');
  });

  it('formats minutes:seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(130)).toBe('2:10');
  });
});

// =============================================================================
// generateImportId
// =============================================================================

describe('generateImportId', () => {
  it('generates unique IDs', () => {
    const id1 = generateImportId();
    const id2 = generateImportId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^import_\d+_[a-z0-9]+$/);
  });
});

// =============================================================================
// getCategoryLabel
// =============================================================================

describe('getCategoryLabel', () => {
  it('returns correct labels', () => {
    expect(getCategoryLabel(AssetCategory.MODEL_3D)).toBe('3D Model');
    expect(getCategoryLabel(AssetCategory.TEXTURE)).toBe('Texture');
    expect(getCategoryLabel(AssetCategory.AUDIO)).toBe('Audio');
    expect(getCategoryLabel(AssetCategory.VIDEO)).toBe('Video');
    expect(getCategoryLabel(AssetCategory.HOLOSCRIPT)).toBe('HoloScript');
    expect(getCategoryLabel(AssetCategory.CONFIG)).toBe('Config');
    expect(getCategoryLabel(AssetCategory.UNKNOWN)).toBe('Unknown');
  });
});

// =============================================================================
// getAcceptString
// =============================================================================

describe('getAcceptString', () => {
  it('returns accepted extensions when configured', () => {
    const config: ImportQueueConfig = {
      ...DEFAULT_IMPORT_QUEUE_CONFIG,
      acceptedExtensions: ['.glb', '.png'],
    };
    expect(getAcceptString(config)).toBe('.glb,.png');
  });

  it('returns all known extensions when no filter is set', () => {
    const result = getAcceptString(DEFAULT_IMPORT_QUEUE_CONFIG);
    expect(result).toContain('.glb');
    expect(result).toContain('.png');
    expect(result).toContain('.mp3');
    expect(result).toContain('.hsplus');
  });
});

// =============================================================================
// extractGLBMetadata
// =============================================================================

describe('extractGLBMetadata', () => {
  it('returns null for non-GLB files', async () => {
    const file = createMockFile('image.png', 1024);
    const result = await extractGLBMetadata(file);
    expect(result).toBeNull();
  });

  it('returns null for files too small to be GLB', async () => {
    const file = createMockFile('tiny.glb', 4);
    const result = await extractGLBMetadata(file);
    expect(result).toBeNull();
  });

  it('extracts metadata from a valid GLB header', async () => {
    // Construct a minimal valid GLB file
    const jsonContent = JSON.stringify({
      asset: { version: '2.0' },
      meshes: [
        {
          primitives: [
            {
              attributes: { POSITION: 0 },
              indices: 1,
            },
          ],
        },
      ],
      accessors: [
        { count: 100, type: 'VEC3', componentType: 5126 }, // position
        { count: 300, type: 'SCALAR', componentType: 5123 }, // indices
      ],
      materials: [{ name: 'Material1' }],
      textures: [{ source: 0 }],
      animations: [{ name: 'walk' }],
    });

    const jsonBytes = new TextEncoder().encode(jsonContent);
    // Pad to 4-byte alignment
    const paddedLength = Math.ceil(jsonBytes.length / 4) * 4;
    const paddedJson = new Uint8Array(paddedLength);
    paddedJson.set(jsonBytes);

    // GLB Header (12 bytes)
    const totalLength = 12 + 8 + paddedLength;
    const buffer = new ArrayBuffer(totalLength);
    const view = new DataView(buffer);

    // Magic: "glTF"
    view.setUint32(0, 0x46546C67, true);
    // Version: 2
    view.setUint32(4, 2, true);
    // Total length
    view.setUint32(8, totalLength, true);

    // JSON chunk header
    view.setUint32(12, paddedLength, true);
    // JSON chunk type: "JSON"
    view.setUint32(16, 0x4E4F534A, true);

    // JSON chunk data
    const fullArray = new Uint8Array(buffer);
    fullArray.set(paddedJson, 20);

    const file = new File([buffer], 'test.glb', { type: 'model/gltf-binary' });
    const result = await extractGLBMetadata(file);

    expect(result).not.toBeNull();
    expect(result!.vertexCount).toBe(100);
    expect(result!.faceCount).toBe(100); // 300 indices / 3
    expect(result!.materialCount).toBe(1);
    expect(result!.textureCount).toBe(1);
    expect(result!.animationCount).toBe(1);
    expect(result!.animationNames).toEqual(['walk']);
  });
});

// =============================================================================
// computeFileHash
// =============================================================================

describe('computeFileHash', () => {
  it('produces consistent hashes for the same content', async () => {
    const content = new Uint8Array([1, 2, 3, 4, 5]);
    const file1 = new File([content], 'a.bin');
    const file2 = new File([content], 'b.bin');

    const hash1 = await computeFileHash(file1);
    const hash2 = await computeFileHash(file2);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  it('produces different hashes for different content', async () => {
    const file1 = new File([new Uint8Array([1, 2, 3])], 'a.bin');
    const file2 = new File([new Uint8Array([4, 5, 6])], 'b.bin');

    const hash1 = await computeFileHash(file1);
    const hash2 = await computeFileHash(file2);

    expect(hash1).not.toBe(hash2);
  });
});
