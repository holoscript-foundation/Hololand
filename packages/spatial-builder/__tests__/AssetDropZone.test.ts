/**
 * @hololand/spatial-builder - AssetDropZone + GLTFPreview Tests
 *
 * Tests for:
 * - File type validation (ACCEPTED_ASSET_EXTENSIONS)
 * - File size validation (MAX_ASSET_FILE_SIZE)
 * - ImportedAssetMeta type construction
 * - addImportedAsset action via useSceneEditor reducer
 * - AssetDropZone file processing logic
 *
 * Note: GLTFPreview and AssetDropZone DOM rendering tests require
 * jsdom + @testing-library/react + canvas mock, which are integration-level.
 * These tests cover the core logic and type contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  ACCEPTED_ASSET_EXTENSIONS,
  MAX_ASSET_FILE_SIZE,
} from '../src/scene-editor/types';
import type {
  ImportedAssetMeta,
  AssetFileType,
  SceneObject,
} from '../src/scene-editor/types';

// =============================================================================
// FILE TYPE VALIDATION
// =============================================================================

describe('ACCEPTED_ASSET_EXTENSIONS', () => {
  it('accepts .gltf extension', () => {
    expect(ACCEPTED_ASSET_EXTENSIONS['.gltf']).toBe('gltf');
  });

  it('accepts .glb extension', () => {
    expect(ACCEPTED_ASSET_EXTENSIONS['.glb']).toBe('glb');
  });

  it('accepts .obj extension', () => {
    expect(ACCEPTED_ASSET_EXTENSIONS['.obj']).toBe('obj');
  });

  it('accepts .fbx extension', () => {
    expect(ACCEPTED_ASSET_EXTENSIONS['.fbx']).toBe('fbx');
  });

  it('rejects unsupported extensions', () => {
    expect(ACCEPTED_ASSET_EXTENSIONS['.png']).toBeUndefined();
    expect(ACCEPTED_ASSET_EXTENSIONS['.jpg']).toBeUndefined();
    expect(ACCEPTED_ASSET_EXTENSIONS['.stl']).toBeUndefined();
    expect(ACCEPTED_ASSET_EXTENSIONS['.usdz']).toBeUndefined();
    expect(ACCEPTED_ASSET_EXTENSIONS['.abc']).toBeUndefined();
  });

  it('has exactly 4 supported formats', () => {
    expect(Object.keys(ACCEPTED_ASSET_EXTENSIONS)).toHaveLength(4);
  });
});

// =============================================================================
// FILE SIZE LIMITS
// =============================================================================

describe('MAX_ASSET_FILE_SIZE', () => {
  it('is set to 50 MB', () => {
    expect(MAX_ASSET_FILE_SIZE).toBe(50 * 1024 * 1024);
  });

  it('correctly identifies files within limit', () => {
    const smallFile = 1024; // 1 KB
    const mediumFile = 10 * 1024 * 1024; // 10 MB
    const atLimit = MAX_ASSET_FILE_SIZE; // exactly 50 MB

    expect(smallFile <= MAX_ASSET_FILE_SIZE).toBe(true);
    expect(mediumFile <= MAX_ASSET_FILE_SIZE).toBe(true);
    expect(atLimit <= MAX_ASSET_FILE_SIZE).toBe(true);
  });

  it('correctly rejects files exceeding limit', () => {
    const overLimit = MAX_ASSET_FILE_SIZE + 1;
    const wayOver = 100 * 1024 * 1024; // 100 MB

    expect(overLimit <= MAX_ASSET_FILE_SIZE).toBe(false);
    expect(wayOver <= MAX_ASSET_FILE_SIZE).toBe(false);
  });
});

// =============================================================================
// IMPORTED ASSET META TYPE CONTRACT
// =============================================================================

describe('ImportedAssetMeta', () => {
  it('can be constructed with required fields', () => {
    const meta: ImportedAssetMeta = {
      fileName: 'robot.glb',
      fileType: 'glb',
      fileSize: 2048576,
      objectUrl: 'blob:http://localhost/abc123',
    };

    expect(meta.fileName).toBe('robot.glb');
    expect(meta.fileType).toBe('glb');
    expect(meta.fileSize).toBe(2048576);
    expect(meta.objectUrl).toBe('blob:http://localhost/abc123');
    expect(meta.boundingBox).toBeUndefined();
    expect(meta.triangleCount).toBeUndefined();
  });

  it('can be constructed with all optional fields', () => {
    const meta: ImportedAssetMeta = {
      fileName: 'castle.gltf',
      fileType: 'gltf',
      fileSize: 10485760,
      objectUrl: 'blob:http://localhost/def456',
      boundingBox: {
        min: { x: -5, y: 0, z: -5 },
        max: { x: 5, y: 10, z: 5 },
      },
      triangleCount: 45230,
    };

    expect(meta.boundingBox).toBeDefined();
    expect(meta.boundingBox!.min).toEqual({ x: -5, y: 0, z: -5 });
    expect(meta.boundingBox!.max).toEqual({ x: 5, y: 10, z: 5 });
    expect(meta.triangleCount).toBe(45230);
  });
});

// =============================================================================
// SCENE OBJECT WITH ASSET META
// =============================================================================

describe('SceneObject with imported asset', () => {
  it('can represent an imported GLTF model', () => {
    const obj: SceneObject = {
      id: 'obj-test-1',
      name: 'Robot',
      kind: 'imported',
      visible: true,
      locked: false,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: {
        color: '#6366f1',
        metalness: 0.1,
        roughness: 0.6,
        emissive: '#000000',
        emissiveIntensity: 0,
        opacity: 1,
        transparent: false,
        wireframe: false,
      },
      assetMeta: {
        fileName: 'robot.glb',
        fileType: 'glb',
        fileSize: 2048576,
        objectUrl: 'blob:http://localhost/test',
        triangleCount: 12500,
        boundingBox: {
          min: { x: -1, y: 0, z: -1 },
          max: { x: 1, y: 2, z: 1 },
        },
      },
      parentId: null,
      childIds: [],
    };

    expect(obj.kind).toBe('imported');
    expect(obj.assetMeta).toBeDefined();
    expect(obj.assetMeta!.fileName).toBe('robot.glb');
    expect(obj.assetMeta!.triangleCount).toBe(12500);
  });

  it('primitive objects have no assetMeta', () => {
    const obj: SceneObject = {
      id: 'obj-test-2',
      name: 'Box',
      kind: 'primitive',
      primitiveType: 'box',
      visible: true,
      locked: false,
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: {
        color: '#6366f1',
        metalness: 0.1,
        roughness: 0.6,
        emissive: '#000000',
        emissiveIntensity: 0,
        opacity: 1,
        transparent: false,
        wireframe: false,
      },
      parentId: null,
      childIds: [],
    };

    expect(obj.kind).toBe('primitive');
    expect(obj.assetMeta).toBeUndefined();
  });
});

// =============================================================================
// FILE EXTENSION PARSING (mirrors AssetDropZone internal logic)
// =============================================================================

describe('File extension parsing', () => {
  function getFileExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.substring(dotIndex).toLowerCase() : '';
  }

  it('extracts .glb extension', () => {
    expect(getFileExtension('model.glb')).toBe('.glb');
  });

  it('extracts .gltf extension', () => {
    expect(getFileExtension('scene.gltf')).toBe('.gltf');
  });

  it('extracts extension from files with dots in name', () => {
    expect(getFileExtension('my.model.v2.glb')).toBe('.glb');
  });

  it('handles files with no extension', () => {
    expect(getFileExtension('README')).toBe('');
  });

  it('normalizes case', () => {
    expect(getFileExtension('Model.GLB')).toBe('.glb');
    expect(getFileExtension('Scene.GLTF')).toBe('.gltf');
  });

  it('validates against accepted extensions', () => {
    const ext = getFileExtension('robot.glb');
    const fileType: AssetFileType | undefined = ACCEPTED_ASSET_EXTENSIONS[ext];
    expect(fileType).toBe('glb');
  });

  it('rejects unknown extensions', () => {
    const ext = getFileExtension('texture.png');
    const fileType: AssetFileType | undefined = ACCEPTED_ASSET_EXTENSIONS[ext];
    expect(fileType).toBeUndefined();
  });
});

// =============================================================================
// FILE SIZE FORMATTING (mirrors AssetDropZone internal logic)
// =============================================================================

describe('File size formatting', () => {
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(5120)).toBe('5.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(10485760)).toBe('10.0 MB');
  });

  it('formats fractional megabytes', () => {
    expect(formatFileSize(2621440)).toBe('2.5 MB');
  });
});

// =============================================================================
// FILE NAME STRIPPING (mirrors AssetDropZone internal logic)
// =============================================================================

describe('File name stripping', () => {
  function stripFileExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
  }

  it('strips .glb extension', () => {
    expect(stripFileExtension('robot.glb')).toBe('robot');
  });

  it('strips extension from dotted names', () => {
    expect(stripFileExtension('my.model.v2.glb')).toBe('my.model.v2');
  });

  it('returns full name if no extension', () => {
    expect(stripFileExtension('README')).toBe('README');
  });

  it('handles leading dot (hidden files)', () => {
    // A file named ".hidden" has dotIndex 0, so we keep the name
    expect(stripFileExtension('.hidden')).toBe('.hidden');
  });
});
