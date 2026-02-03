/**
 * SmartAssetBridge Tests
 *
 * Tests the integration between @holoscript/core SmartAssetLoader and Three.js GLTFLoader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock Three.js loaders for testing
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  const mockScene = new THREE.Group();
  mockScene.name = 'MockScene';

  const mockGLTF = {
    scene: mockScene,
    scenes: [mockScene],
    animations: [],
    cameras: [],
    asset: { version: '2.0' },
    parser: {},
    userData: {},
  };

  return {
    GLTFLoader: vi.fn().mockImplementation(() => ({
      setDRACOLoader: vi.fn(),
      setMeshoptDecoder: vi.fn(),
      parse: vi.fn((buffer, path, onSuccess, onError) => {
        setTimeout(() => onSuccess(mockGLTF), 0);
      }),
      load: vi.fn((url, onSuccess, onProgress, onError) => {
        setTimeout(() => onSuccess(mockGLTF), 0);
      }),
    })),
  };
});

vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => ({
  DRACOLoader: vi.fn().mockImplementation(() => ({
    setDecoderPath: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('three/examples/jsm/libs/meshopt_decoder.module.js', () => ({
  MeshoptDecoder: {},
}));

import {
  SmartAssetBridge,
  getSmartAssetBridge,
  createSmartAssetBridge,
  setupSmartAssetLoader,
} from '../SmartAssetBridge';
import type { AssetMetadata } from '@holoscript/core';

describe('SmartAssetBridge', () => {
  let bridge: SmartAssetBridge;

  beforeEach(() => {
    bridge = createSmartAssetBridge();
  });

  afterEach(() => {
    bridge.dispose();
  });

  describe('constructor', () => {
    it('should create bridge with default config', () => {
      expect(bridge).toBeDefined();
      expect(bridge.getGLTFLoader()).toBeDefined();
      expect(bridge.getDRACOLoader()).toBeDefined();
    });

    it('should accept custom config', () => {
      const customBridge = createSmartAssetBridge({
        dracoDecoderPath: '/custom/draco/',
        enableShadows: false,
      });

      expect(customBridge).toBeDefined();
      customBridge.dispose();
    });
  });

  describe('createModelParser', () => {
    it('should return a function', () => {
      const parser = bridge.createModelParser();
      expect(typeof parser).toBe('function');
    });

    it('should parse ArrayBuffer to GLTF result', async () => {
      const parser = bridge.createModelParser();
      const mockBuffer = new ArrayBuffer(100);
      const mockMetadata: AssetMetadata = {
        id: 'test-asset',
        name: 'test',
        displayName: 'Test Asset',
        format: 'glb',
        assetType: 'model',
        mimeType: 'model/gltf-binary',
        extension: 'glb',
        sourcePath: '/models/test.glb',
        version: '1.0.0',
        platformCompatibility: { webgl: true },
        fileSize: 100,
        estimatedGPUMemory: 200,
        estimatedCPUMemory: 150,
        estimatedLoadTime: 50,
        tags: ['test'],
        semanticTags: {},
        dependencies: [],
        textureDependencies: [],
        shaderDependencies: [],
        sourceFile: '/models/test.glb',
        sourceHash: 'abc123',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        optimizations: [],
        isOptimized: false,
        validated: true,
        validationErrors: [],
        validationWarnings: [],
      };

      const result = await parser(mockBuffer, mockMetadata);

      expect(result).toBeDefined();
      expect(result.scene).toBeInstanceOf(THREE.Group);
    });
  });

  describe('loadDirect', () => {
    it('should load model directly by URL', async () => {
      const result = await bridge.loadDirect('/models/test.glb');

      expect(result).toBeDefined();
      expect(result.scene).toBeInstanceOf(THREE.Group);
    });
  });

  describe('caching', () => {
    it('should cache loaded models', async () => {
      const parser = bridge.createModelParser();
      const mockBuffer = new ArrayBuffer(100);
      const mockMetadata: AssetMetadata = {
        id: 'cached-asset',
        name: 'cached',
        displayName: 'Cached Asset',
        format: 'glb',
        assetType: 'model',
        mimeType: 'model/gltf-binary',
        extension: 'glb',
        sourcePath: '/models/cached.glb',
        version: '1.0.0',
        platformCompatibility: { webgl: true },
        fileSize: 100,
        estimatedGPUMemory: 200,
        estimatedCPUMemory: 150,
        estimatedLoadTime: 50,
        tags: [],
        semanticTags: {},
        dependencies: [],
        textureDependencies: [],
        shaderDependencies: [],
        sourceFile: '/models/cached.glb',
        sourceHash: 'def456',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        optimizations: [],
        isOptimized: false,
        validated: true,
        validationErrors: [],
        validationWarnings: [],
      };

      await parser(mockBuffer, mockMetadata);

      const cached = bridge.getCached('cached-asset');
      expect(cached).toBeDefined();
      expect(cached?.scene).toBeInstanceOf(THREE.Group);
    });

    it('should clone cached models', async () => {
      const parser = bridge.createModelParser();
      const mockBuffer = new ArrayBuffer(100);
      const mockMetadata: AssetMetadata = {
        id: 'clone-test',
        name: 'clone',
        displayName: 'Clone Test',
        format: 'glb',
        assetType: 'model',
        mimeType: 'model/gltf-binary',
        extension: 'glb',
        sourcePath: '/models/clone.glb',
        version: '1.0.0',
        platformCompatibility: { webgl: true },
        fileSize: 100,
        estimatedGPUMemory: 200,
        estimatedCPUMemory: 150,
        estimatedLoadTime: 50,
        tags: [],
        semanticTags: {},
        dependencies: [],
        textureDependencies: [],
        shaderDependencies: [],
        sourceFile: '/models/clone.glb',
        sourceHash: 'ghi789',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        optimizations: [],
        isOptimized: false,
        validated: true,
        validationErrors: [],
        validationWarnings: [],
      };

      await parser(mockBuffer, mockMetadata);

      const clone1 = bridge.cloneCached('clone-test');
      const clone2 = bridge.cloneCached('clone-test');

      expect(clone1).toBeDefined();
      expect(clone2).toBeDefined();
      expect(clone1).not.toBe(clone2); // Different instances
    });
  });

  describe('singleton', () => {
    it('should return same instance from getSmartAssetBridge', () => {
      const bridge1 = getSmartAssetBridge();
      const bridge2 = getSmartAssetBridge();

      expect(bridge1).toBe(bridge2);
    });
  });

  describe('setupSmartAssetLoader', () => {
    it('should inject model parser into loader', () => {
      const mockLoader = {
        setModelParser: vi.fn(),
      };

      const resultBridge = setupSmartAssetLoader(mockLoader);

      expect(mockLoader.setModelParser).toHaveBeenCalledOnce();
      expect(mockLoader.setModelParser).toHaveBeenCalledWith(expect.any(Function));
      expect(resultBridge).toBe(getSmartAssetBridge());
    });
  });
});

describe('Integration with SmartAssetLoader', () => {
  it('should work with SmartAssetLoader interface', async () => {
    // Mock SmartAssetLoader
    const bridge = createSmartAssetBridge();
    const modelParser = bridge.createModelParser();

    // Simulate what SmartAssetLoader does
    const mockAsset = {
      id: 'tree',
      name: 'oak_tree_v1',
      displayName: 'Oak Tree',
      format: 'glb' as const,
      assetType: 'model' as const,
      mimeType: 'model/gltf-binary',
      extension: 'glb',
      sourcePath: '/assets/nature/oak_tree_v1.glb',
      version: '1.0.0',
      platformCompatibility: { webgl: true, webgl2: true },
      fileSize: 524288, // 512KB
      estimatedGPUMemory: 1048576, // 1MB
      estimatedCPUMemory: 786432, // 768KB
      estimatedLoadTime: 200,
      tags: ['nature', 'tree', 'outdoor'],
      semanticTags: { category: 'environment' as const },
      dependencies: [],
      textureDependencies: [],
      shaderDependencies: [],
      sourceFile: '/assets/nature/oak_tree_v1.glb',
      sourceHash: 'tree123',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      optimizations: [],
      isOptimized: true,
      validated: true,
      validationErrors: [],
      validationWarnings: [],
    };

    // This is what SmartAssetLoader.parseAssetData calls
    const mockBuffer = new ArrayBuffer(100);
    const result = await modelParser(mockBuffer, mockAsset);

    expect(result).toBeDefined();
    expect(result.scene).toBeInstanceOf(THREE.Group);
    expect(result.scene.userData.holoMetadata).toBe(mockAsset);
    expect(result.scene.userData.assetId).toBe('tree');

    bridge.dispose();
  });
});
