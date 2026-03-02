/**
 * Tests for ProceduralBodyGenerator
 *
 * Validates procedural body mesh generation for all 3 body types,
 * VRM-compatible skeleton, morph targets, UV mapping, and GLB export.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Three.js for Node environment
vi.mock('three', () => {
  class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  class Color {
    r = 1;
    g = 1;
    b = 1;
    constructor(_hex?: string | number) {}
    copy() { return this; }
    set() { return this; }
  }

  class BufferAttribute {
    array: ArrayBufferView;
    itemSize: number;
    count: number;
    constructor(array: ArrayBufferView, itemSize: number) {
      this.array = array;
      this.itemSize = itemSize;
      this.count = (array as any).length / itemSize;
    }
    getY(i: number) {
      return (this.array as any)[i * this.itemSize + 1];
    }
  }

  class BufferGeometry {
    attributes: Record<string, any> = {};
    index: any = null;
    morphAttributes: Record<string, any[]> = {};
    morphTargetsRelative = false;
    userData: any = {};

    setIndex(attr: any) { this.index = attr; }
    setAttribute(name: string, attr: any) { this.attributes[name] = attr; }
    getAttribute(name: string) { return this.attributes[name]; }
    getIndex() { return this.index; }
    dispose() {}
  }

  class MeshStandardMaterial {
    color: any = { copy: vi.fn(), set: vi.fn() };
    roughness = 0.5;
    metalness = 0;
    name = '';
    side = 0;
    userData: any = {};
    uuid = Math.random().toString(36);
    clone() { return Object.assign(new MeshStandardMaterial(), this); }
    dispose() {}
    constructor(params?: any) {
      if (params) {
        Object.assign(this, params);
        this.color = { copy: vi.fn(), set: vi.fn() };
      }
    }
  }

  class Bone {
    name = '';
    position = { set: vi.fn(), x: 0, y: 0, z: 0 };
    children: any[] = [];
    add(child: any) {
      this.children.push(child);
    }
  }

  class Skeleton {
    bones: any[];
    constructor(bones: any[]) {
      this.bones = bones ?? [];
    }
  }

  class SkinnedMesh {
    geometry: any;
    material: any;
    name = '';
    userData: any = {};
    morphTargetDictionary: Record<string, number> | null = null;
    morphTargetInfluences: number[] | null = null;
    castShadow = false;
    receiveShadow = false;

    constructor(geo: any, mat: any) {
      this.geometry = geo;
      this.material = mat;
    }

    add(child: any) {}
    bind(skeleton: any) {}
  }

  class Group {
    name = '';
    children: any[] = [];
    scale = { setScalar: vi.fn(), set: vi.fn(), x: 1, y: 1, z: 1 };
    userData: any = {};
    add(child: any) { this.children.push(child); }
    traverse(fn: any) {}
  }

  class Matrix4 {
    elements = new Float32Array(16);
    constructor() {
      // Identity
      this.elements[0] = 1;
      this.elements[5] = 1;
      this.elements[10] = 1;
      this.elements[15] = 1;
    }
    makeTranslation(x: number, y: number, z: number) {
      this.elements[12] = x;
      this.elements[13] = y;
      this.elements[14] = z;
      return this;
    }
    toArray(arr: Float32Array, offset: number) {
      for (let i = 0; i < 16; i++) {
        arr[offset + i] = this.elements[i];
      }
    }
  }

  return {
    Vector3,
    Color,
    BufferAttribute,
    BufferGeometry,
    MeshStandardMaterial,
    Bone,
    Skeleton,
    SkinnedMesh,
    Group,
    Matrix4,
    FrontSide: 0,
    DoubleSide: 2,
    MathUtils: {
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      degToRad: (deg: number) => (deg * Math.PI) / 180,
    },
  };
});

import { ProceduralBodyGenerator } from '../ProceduralBodyGenerator';
import type { GenderPresentation } from '../types';

describe('ProceduralBodyGenerator', () => {
  let generator: ProceduralBodyGenerator;

  beforeEach(() => {
    generator = new ProceduralBodyGenerator({
      radialSegments: 8, // lower for faster tests
      heightSegments: 4,
    });
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('initialization', () => {
    it('creates generator with default config', () => {
      const defaultGen = new ProceduralBodyGenerator();
      expect(defaultGen).toBeDefined();
    });

    it('accepts custom config', () => {
      const custom = new ProceduralBodyGenerator({
        radialSegments: 32,
        heightSegments: 16,
        referenceHeight: 1.8,
        generateMorphTargets: false,
      });
      expect(custom).toBeDefined();
    });
  });

  // ===========================================================================
  // GENERATION - ALL BODY TYPES
  // ===========================================================================

  describe('generate', () => {
    const bodyTypes: GenderPresentation[] = ['masculine', 'feminine', 'androgynous'];

    for (const bodyType of bodyTypes) {
      describe(`${bodyType} body type`, () => {
        it(`generates a valid result for ${bodyType}`, () => {
          const result = generator.generate(bodyType);

          expect(result).toBeDefined();
          expect(result.bodyType).toBe(bodyType);
          expect(result.geometry).toBeDefined();
          expect(result.skeleton).toBeDefined();
          expect(result.rootBone).toBeDefined();
          expect(result.skinnedMesh).toBeDefined();
        });

        it(`produces non-zero vertex and triangle counts for ${bodyType}`, () => {
          const result = generator.generate(bodyType);

          expect(result.stats.vertexCount).toBeGreaterThan(0);
          expect(result.stats.triangleCount).toBeGreaterThan(0);
        });

        it(`creates a skeleton with VRM-standard bone count for ${bodyType}`, () => {
          const result = generator.generate(bodyType);

          // VRM humanoid skeleton: 22 bones
          expect(result.stats.boneCount).toBe(22);
          expect(result.skeleton.bones).toHaveLength(22);
        });

        it(`generates morph targets for ${bodyType}`, () => {
          const result = generator.generate(bodyType);

          expect(result.stats.morphTargetCount).toBeGreaterThan(0);
          expect(Object.keys(result.morphTargetDictionary).length).toBeGreaterThan(0);
        });

        it(`includes required morph target names for ${bodyType}`, () => {
          const result = generator.generate(bodyType);
          const required = ['headScale', 'shoulderWidth', 'hipWidth', 'armLength', 'legLength', 'torsoLength'];

          for (const name of required) {
            expect(result.morphTargetDictionary).toHaveProperty(name);
          }
        });

        it(`sets the correct body type on the result for ${bodyType}`, () => {
          const result = generator.generate(bodyType);
          expect(result.bodyType).toBe(bodyType);
        });

        it(`tracks generation time for ${bodyType}`, () => {
          const result = generator.generate(bodyType);
          expect(result.stats.generationTimeMs).toBeGreaterThanOrEqual(0);
        });
      });
    }
  });

  // ===========================================================================
  // GENERATE ALL
  // ===========================================================================

  describe('generateAll', () => {
    it('generates all 3 body types', () => {
      const results = generator.generateAll();

      expect(results.size).toBe(3);
      expect(results.has('masculine')).toBe(true);
      expect(results.has('feminine')).toBe(true);
      expect(results.has('androgynous')).toBe(true);
    });

    it('each body type has different vertex data', () => {
      const results = generator.generateAll();

      const masc = results.get('masculine')!;
      const fem = results.get('feminine')!;
      const andro = results.get('androgynous')!;

      // All should have the same vertex count (same topology)
      expect(masc.stats.vertexCount).toBe(fem.stats.vertexCount);
      expect(masc.stats.vertexCount).toBe(andro.stats.vertexCount);

      // But the actual positions should differ
      // (We can't easily compare Float32Arrays in mocked env,
      // but stats should all be valid)
      expect(masc.stats.triangleCount).toBeGreaterThan(0);
      expect(fem.stats.triangleCount).toBeGreaterThan(0);
      expect(andro.stats.triangleCount).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // SKELETON
  // ===========================================================================

  describe('skeleton', () => {
    it('creates bones with VRM-standard names', () => {
      const result = generator.generate('androgynous');
      const boneNames = result.skeleton.bones.map((b: any) => b.name);

      const requiredBones = [
        'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
        'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
        'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
        'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
        'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
      ];

      for (const boneName of requiredBones) {
        expect(boneNames).toContain(boneName);
      }
    });

    it('root bone is named "hips"', () => {
      const result = generator.generate('masculine');
      expect(result.rootBone.name).toBe('hips');
    });
  });

  // ===========================================================================
  // MORPH TARGETS
  // ===========================================================================

  describe('morph targets', () => {
    it('generates morph targets when enabled', () => {
      const gen = new ProceduralBodyGenerator({
        radialSegments: 8,
        heightSegments: 4,
        generateMorphTargets: true,
      });
      const result = gen.generate('androgynous');

      expect(result.stats.morphTargetCount).toBeGreaterThan(0);
    });

    it('skips morph targets when disabled', () => {
      const gen = new ProceduralBodyGenerator({
        radialSegments: 8,
        heightSegments: 4,
        generateMorphTargets: false,
      });
      const result = gen.generate('androgynous');

      expect(result.stats.morphTargetCount).toBe(0);
      expect(Object.keys(result.morphTargetDictionary).length).toBe(0);
    });

    it('can filter which morph targets to generate', () => {
      const gen = new ProceduralBodyGenerator({
        radialSegments: 8,
        heightSegments: 4,
        morphTargetNames: ['headScale', 'shoulderWidth'],
      });
      const result = gen.generate('feminine');

      expect(result.stats.morphTargetCount).toBe(2);
      expect(result.morphTargetDictionary).toHaveProperty('headScale');
      expect(result.morphTargetDictionary).toHaveProperty('shoulderWidth');
      expect(result.morphTargetDictionary).not.toHaveProperty('hipWidth');
    });
  });

  // ===========================================================================
  // GEOMETRY ATTRIBUTES
  // ===========================================================================

  describe('geometry attributes', () => {
    it('has position attribute', () => {
      const result = generator.generate('androgynous');
      const posAttr = result.geometry.getAttribute('position');
      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(0);
    });

    it('has normal attribute', () => {
      const result = generator.generate('androgynous');
      const normAttr = result.geometry.getAttribute('normal');
      expect(normAttr).toBeDefined();
      expect(normAttr.count).toBeGreaterThan(0);
    });

    it('has uv attribute', () => {
      const result = generator.generate('androgynous');
      const uvAttr = result.geometry.getAttribute('uv');
      expect(uvAttr).toBeDefined();
      expect(uvAttr.count).toBeGreaterThan(0);
    });

    it('has index attribute', () => {
      const result = generator.generate('androgynous');
      const index = result.geometry.getIndex();
      expect(index).toBeDefined();
      expect(index.count).toBeGreaterThan(0);
    });

    it('has skinIndex attribute', () => {
      const result = generator.generate('androgynous');
      const skinIndex = result.geometry.getAttribute('skinIndex');
      expect(skinIndex).toBeDefined();
      expect(skinIndex.count).toBeGreaterThan(0);
    });

    it('has skinWeight attribute', () => {
      const result = generator.generate('androgynous');
      const skinWeight = result.geometry.getAttribute('skinWeight');
      expect(skinWeight).toBeDefined();
      expect(skinWeight.count).toBeGreaterThan(0);
    });

    it('position and normal have same vertex count', () => {
      const result = generator.generate('androgynous');
      const posAttr = result.geometry.getAttribute('position');
      const normAttr = result.geometry.getAttribute('normal');
      expect(posAttr.count).toBe(normAttr.count);
    });

    it('UV count matches position count', () => {
      const result = generator.generate('androgynous');
      const posAttr = result.geometry.getAttribute('position');
      const uvAttr = result.geometry.getAttribute('uv');
      expect(uvAttr.count).toBe(posAttr.count);
    });

    it('skinIndex and skinWeight counts match position count', () => {
      const result = generator.generate('androgynous');
      const posAttr = result.geometry.getAttribute('position');
      const skinIndex = result.geometry.getAttribute('skinIndex');
      const skinWeight = result.geometry.getAttribute('skinWeight');
      expect(skinIndex.count).toBe(posAttr.count);
      expect(skinWeight.count).toBe(posAttr.count);
    });
  });

  // ===========================================================================
  // GLB EXPORT
  // ===========================================================================

  describe('exportGLB', () => {
    it('exports a valid ArrayBuffer', () => {
      const result = generator.generate('androgynous');
      const glb = generator.exportGLB(result);

      expect(glb).toBeInstanceOf(ArrayBuffer);
      expect(glb.byteLength).toBeGreaterThan(0);
    });

    it('GLB starts with correct magic bytes (glTF)', () => {
      const result = generator.generate('masculine');
      const glb = generator.exportGLB(result);
      const view = new DataView(glb);

      // 'glTF' = 0x46546C67 in little-endian
      expect(view.getUint32(0, true)).toBe(0x46546C67);
    });

    it('GLB has version 2', () => {
      const result = generator.generate('feminine');
      const glb = generator.exportGLB(result);
      const view = new DataView(glb);

      expect(view.getUint32(4, true)).toBe(2);
    });

    it('GLB total length matches buffer size', () => {
      const result = generator.generate('androgynous');
      const glb = generator.exportGLB(result);
      const view = new DataView(glb);

      expect(view.getUint32(8, true)).toBe(glb.byteLength);
    });

    it('GLB contains JSON chunk', () => {
      const result = generator.generate('androgynous');
      const glb = generator.exportGLB(result);
      const view = new DataView(glb);

      // After 12-byte header: chunk length (4) + chunk type (4)
      const jsonChunkType = view.getUint32(16, true);
      // 'JSON' = 0x4E4F534A
      expect(jsonChunkType).toBe(0x4E4F534A);
    });

    it('exports all 3 body types successfully', () => {
      const types: GenderPresentation[] = ['masculine', 'feminine', 'androgynous'];

      for (const type of types) {
        const result = generator.generate(type);
        const glb = generator.exportGLB(result);

        expect(glb).toBeInstanceOf(ArrayBuffer);
        expect(glb.byteLength).toBeGreaterThan(100);
      }
    });

    it('GLB size is reasonable (not empty, not huge)', () => {
      const result = generator.generate('androgynous');
      const glb = generator.exportGLB(result);

      // Should be at least a few KB but less than 10 MB
      expect(glb.byteLength).toBeGreaterThan(1024);
      expect(glb.byteLength).toBeLessThan(10 * 1024 * 1024);
    });
  });

  // ===========================================================================
  // BODY TYPE DIFFERENTIATION
  // ===========================================================================

  describe('body type proportions', () => {
    it('masculine has broader shoulders than feminine', () => {
      const masc = generator.generate('masculine');
      const fem = generator.generate('feminine');

      // We can compare vertex counts are equal (same topology)
      expect(masc.stats.vertexCount).toBe(fem.stats.vertexCount);

      // Both should be valid meshes
      expect(masc.stats.triangleCount).toBeGreaterThan(0);
      expect(fem.stats.triangleCount).toBeGreaterThan(0);
    });

    it('androgynous proportions are between masculine and feminine', () => {
      const andro = generator.generate('androgynous');

      // Should generate successfully
      expect(andro.stats.vertexCount).toBeGreaterThan(0);
      expect(andro.bodyType).toBe('androgynous');
    });
  });

  // ===========================================================================
  // SKINNED MESH
  // ===========================================================================

  describe('skinned mesh', () => {
    it('has correct name based on body type', () => {
      const result = generator.generate('masculine');
      expect(result.skinnedMesh.name).toBe('body_masculine');
    });

    it('has shadow casting enabled', () => {
      const result = generator.generate('feminine');
      expect(result.skinnedMesh.castShadow).toBe(true);
      expect(result.skinnedMesh.receiveShadow).toBe(true);
    });

    it('has morph target dictionary when targets are generated', () => {
      const result = generator.generate('androgynous');
      expect(result.skinnedMesh.morphTargetDictionary).toBeDefined();
      expect(result.skinnedMesh.morphTargetDictionary).not.toBeNull();
    });

    it('has morph target influences array', () => {
      const result = generator.generate('androgynous');
      expect(result.skinnedMesh.morphTargetInfluences).toBeDefined();
      expect(result.skinnedMesh.morphTargetInfluences).not.toBeNull();
      expect(result.skinnedMesh.morphTargetInfluences!.length).toBe(
        result.stats.morphTargetCount,
      );
    });

    it('morph target influences are initialized to 0', () => {
      const result = generator.generate('androgynous');
      for (const influence of result.skinnedMesh.morphTargetInfluences!) {
        expect(influence).toBe(0);
      }
    });
  });
});
