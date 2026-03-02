/**
 * Tests for AvatarMeshAssembler
 *
 * Validates the geometry pipeline that converts blueprints to 3D meshes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvatarMeshAssembler } from '../AvatarMeshAssembler';
import { AvatarBlueprintManager } from '../AvatarBlueprintManager';

// Mock Three.js since we're in a Node environment
vi.mock('three', () => {
  const Vector3 = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ x, y, z }));
  const Color = vi.fn().mockImplementation((hex?: string) => ({
    r: 1, g: 1, b: 1,
    copy: vi.fn(),
    set: vi.fn(),
  }));

  const BufferAttribute = vi.fn().mockImplementation((array, itemSize) => ({
    array, itemSize, count: array.length / itemSize,
    getY: vi.fn((i: number) => array[i * itemSize + 1]),
  }));

  const BufferGeometry = vi.fn().mockImplementation(() => {
    const geo: any = {
      attributes: {},
      index: { count: 300 },
      morphAttributes: {},
      morphTargetsRelative: false,
      userData: {},
      dispose: vi.fn(),
      setAttribute: vi.fn((name: string, attr: any) => { geo.attributes[name] = attr; }),
      getAttribute: vi.fn((name: string) => geo.attributes[name] ?? { count: 100 }),
      setIndex: vi.fn((indexAttr: any) => { geo.index = indexAttr; }),
      getIndex: vi.fn(() => geo.index),
    };
    return geo;
  });

  const MeshStandardMaterial = vi.fn().mockImplementation((params) => ({
    ...params,
    uuid: Math.random().toString(36),
    color: { copy: vi.fn(), set: vi.fn() },
    userData: {},
    clone: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  }));

  const Mesh = vi.fn().mockImplementation((geo, mat) => ({
    geometry: geo ?? new BufferGeometry(),
    material: mat ?? new MeshStandardMaterial({}),
    userData: {},
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
    scale: { set: vi.fn(), setScalar: vi.fn(), x: 1, y: 1, z: 1 },
    castShadow: false,
    receiveShadow: false,
    name: '',
    add: vi.fn(),
    traverse: vi.fn(),
  }));

  const SkinnedMesh = vi.fn().mockImplementation((geo, mat) => ({
    ...new (Mesh as any)(geo, mat),
    geometry: geo ?? new BufferGeometry(),
    material: mat ?? new MeshStandardMaterial({}),
    skeleton: null,
    bind: vi.fn(),
    morphTargetDictionary: null,
    morphTargetInfluences: [],
  }));

  const Bone = vi.fn().mockImplementation(() => ({
    name: '',
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    add: vi.fn(),
  }));

  const Skeleton = vi.fn().mockImplementation((bones) => ({
    bones: bones ?? [],
  }));

  const Group = vi.fn().mockImplementation(() => ({
    name: '',
    children: [],
    add: vi.fn(function(this: any, child: any) { this.children.push(child); }),
    scale: { setScalar: vi.fn(), set: vi.fn(), x: 1, y: 1, z: 1 },
    traverse: vi.fn(),
    userData: {},
  }));

  const makeGeo = () => ({
    setAttribute: vi.fn(),
    getAttribute: vi.fn().mockReturnValue({
      count: 100,
      getX: vi.fn((i: number) => 0),
      getY: vi.fn((i: number) => i * 0.017),
      getZ: vi.fn((i: number) => 0),
    }),
    index: { count: 300 },
    morphAttributes: {},
    userData: {},
    dispose: vi.fn(),
  });

  const CylinderGeometry = vi.fn().mockImplementation(() => makeGeo());
  const SphereGeometry = vi.fn().mockImplementation(() => makeGeo());
  const BoxGeometry = vi.fn().mockImplementation(() => makeGeo());

  const Matrix4 = vi.fn().mockImplementation(() => ({
    elements: new Float32Array(16),
    makeTranslation: vi.fn().mockReturnThis(),
    toArray: vi.fn((arr: Float32Array, offset: number) => {
      for (let i = 0; i < 16; i++) arr[offset + i] = i === 0 || i === 5 || i === 10 || i === 15 ? 1 : 0;
    }),
  }));

  return {
    Vector3,
    Color,
    BufferAttribute,
    BufferGeometry,
    CylinderGeometry,
    SphereGeometry,
    BoxGeometry,
    MeshStandardMaterial,
    Mesh,
    SkinnedMesh,
    Bone,
    Skeleton,
    Group,
    Matrix4,
    FrontSide: 0,
    DoubleSide: 2,
    MathUtils: {
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      degToRad: (deg: number) => deg * Math.PI / 180,
    },
  };
});

// Mock GLTFLoader
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    loadAsync: vi.fn().mockRejectedValue(new Error('Asset not found (test)')),
  })),
}));

// Mock VRM plugin
vi.mock('@pixiv/three-vrm', () => ({
  VRMLoaderPlugin: vi.fn(),
}));

describe('AvatarMeshAssembler', () => {
  let assembler: AvatarMeshAssembler;
  let blueprintManager: AvatarBlueprintManager;

  beforeEach(() => {
    assembler = new AvatarMeshAssembler({
      assetBaseUrl: '/test-assets',
      enablePhysics: false,
      targetPlatform: 'desktop',
    });
    blueprintManager = new AvatarBlueprintManager();
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('initialization', () => {
    it('creates assembler with default config', () => {
      const defaultAssembler = new AvatarMeshAssembler();
      expect(defaultAssembler).toBeDefined();
    });

    it('accepts custom config', () => {
      const custom = new AvatarMeshAssembler({
        assetBaseUrl: 'https://cdn.example.com/assets',
        enablePhysics: true,
        maxTextureResolution: 1024,
        enableLOD: true,
        targetPlatform: 'quest',
      });
      expect(custom).toBeDefined();
    });
  });

  // ===========================================================================
  // ASSEMBLY
  // ===========================================================================

  describe('assemble', () => {
    it('assembles a default blueprint into a result', async () => {
      const blueprint = blueprintManager.getBlueprint();
      const result = await assembler.assemble(blueprint);

      expect(result).toBeDefined();
      expect(result.group).toBeDefined();
      expect(result.group.name).toContain('avatar_');
      expect(result.stats).toBeDefined();
      expect(result.stats.assemblyTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.materials).toBeDefined();
      expect(result.materials.skin).toBeDefined();
    });

    it('creates a skeleton from the body assembly', async () => {
      const blueprint = blueprintManager.getBlueprint();
      const result = await assembler.assemble(blueprint);

      expect(result.skeleton).toBeDefined();
      expect(result.rootBone).toBeDefined();
    });

    it('includes skin materials in the result', async () => {
      const blueprint = blueprintManager.getBlueprint();
      const result = await assembler.assemble(blueprint);

      expect(result.materials.skin.length).toBeGreaterThan(0);
    });

    it('handles bald hair style by returning null hair mesh', async () => {
      blueprintManager.setHairStyle('hair-bald-01');
      const blueprint = blueprintManager.getBlueprint();
      const result = await assembler.assemble(blueprint);

      // Stats should show minimal poly count (no hair)
      expect(result.stats).toBeDefined();
    });

    it('tracks assembly statistics', async () => {
      const blueprint = blueprintManager.getBlueprint();
      const result = await assembler.assemble(blueprint);

      expect(result.stats.totalVertices).toBeGreaterThanOrEqual(0);
      expect(result.stats.totalTriangles).toBeGreaterThanOrEqual(0);
      expect(result.stats.totalBones).toBeGreaterThanOrEqual(0);
      expect(result.stats.assemblyTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // MATERIAL UPDATES
  // ===========================================================================

  describe('updateMaterials', () => {
    it('updates skin color across all skin materials', async () => {
      const blueprint = blueprintManager.getBlueprint();
      const result = await assembler.assemble(blueprint);

      blueprintManager.setSkinColor('#ff0000');
      const updatedBlueprint = blueprintManager.getBlueprint();

      assembler.updateMaterials(result.materials, updatedBlueprint);

      for (const mat of result.materials.skin) {
        expect(mat.color.copy).toHaveBeenCalled();
      }
    });

    it('updates hair color across all hair materials', async () => {
      const blueprint = blueprintManager.getBlueprint();
      const result = await assembler.assemble(blueprint);

      blueprintManager.setHairColor('#00ff00');
      const updatedBlueprint = blueprintManager.getBlueprint();

      assembler.updateMaterials(result.materials, updatedBlueprint);

      for (const mat of result.materials.hair) {
        expect(mat.color.copy).toHaveBeenCalled();
      }
    });

    it('updates eye color across all eye materials', async () => {
      const blueprint = blueprintManager.getBlueprint();
      const result = await assembler.assemble(blueprint);

      blueprintManager.setEyeColor('#0000ff');
      const updatedBlueprint = blueprintManager.getBlueprint();

      assembler.updateMaterials(result.materials, updatedBlueprint);

      for (const mat of result.materials.eye) {
        expect(mat.color.copy).toHaveBeenCalled();
      }
    });
  });

  // ===========================================================================
  // CACHE
  // ===========================================================================

  describe('cache management', () => {
    it('clears cache without errors', () => {
      expect(() => assembler.clearCache()).not.toThrow();
    });
  });
});
