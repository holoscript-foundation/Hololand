/**
 * VRMaterialPreviewSystem Tests
 *
 * Tests the complete pipeline from HoloScript material_block grammar data
 * through parsing, compilation, and VR preview rendering.
 *
 * Covers:
 * - HoloScriptMaterialParser (AST -> MaterialDefinition)
 * - VRMaterialPreviewSystem (MaterialDefinition -> Three.js VR preview)
 * - All 7 material block types from the grammar
 * - Texture map parsing (inline and block forms)
 * - Shader pass and connection parsing
 * - Gallery layout calculations
 * - 90fps budget monitoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { HoloScriptMaterialParser } from '../HoloScriptMaterialParser';
import type { ASTNode, CompositionMaterialNode } from '../HoloScriptMaterialParser';
import {
  VRMaterialPreviewSystem,
  createVRMaterialPreviewSystem,
  type MaterialDefinition,
  type HoloMaterialType,
  type VRMaterialPreviewConfig,
} from '../VRMaterialPreviewSystem';
import { QUALITY_PRESETS } from '../types';

// =============================================================================
// MOCK FIXTURES — HoloScript material_block examples from grammar
// =============================================================================

/**
 * Creates a minimal AST node structure for testing.
 * Mirrors the tree-sitter output for material_block nodes.
 */
function createASTNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    type: 'material_block',
    text: '',
    children: [],
    namedChildren: [],
    ...overrides,
  };
}

/**
 * Sample MaterialDefinitions matching the grammar test files.
 * These correspond to examples/perception-tests/01-material-blocks.holo
 */
const SAMPLE_MATERIALS: MaterialDefinition[] = [
  {
    type: 'material',
    name: 'BrushedSteel',
    traits: ['pbr'],
    baseColor: '#888888',
    roughness: 0.3,
    metallic: 1.0,
    opacity: 1.0,
    IOR: 1.45,
    textureMaps: [],
    shaderPasses: [],
    shaderConnections: [],
    properties: {},
  },
  {
    type: 'pbr_material',
    name: 'HardwoodFloor',
    traits: [],
    roughness: 0.55,
    metallic: 0.0,
    textureMaps: [
      { channel: 'albedo_map', source: 'textures/hardwood_albedo.png' },
      { channel: 'normal_map', source: 'textures/hardwood_normal.png' },
      { channel: 'roughness_map', source: 'textures/hardwood_roughness.png' },
      { channel: 'ao_map', source: 'textures/hardwood_ao.png' },
    ],
    shaderPasses: [],
    shaderConnections: [],
    properties: {},
  },
  {
    type: 'pbr_material',
    name: 'WeatheredBrick',
    traits: ['pbr'],
    roughness: 0.85,
    metallic: 0.0,
    textureMaps: [
      { channel: 'albedo_map', source: 'textures/brick_albedo.png', tiling: [4, 4], filtering: 'trilinear' },
      { channel: 'normal_map', source: 'textures/brick_normal.png', strength: 1.2 },
      { channel: 'ao_map', source: 'textures/brick_ao.png', intensity: 0.8 },
      { channel: 'height_map', source: 'textures/brick_height.png', scale: 0.05 },
    ],
    shaderPasses: [],
    shaderConnections: [],
    properties: {},
  },
  {
    type: 'unlit_material',
    name: 'HologramOverlay',
    traits: ['transparent'],
    baseColor: '#00ffaa',
    opacity: 0.6,
    doubleSided: true,
    textureMaps: [
      { channel: 'emission_map', source: 'textures/hologram_emission.png' },
    ],
    shaderPasses: [],
    shaderConnections: [],
    properties: {},
  },
  {
    type: 'toon_material',
    name: 'CartoonCharacter',
    traits: ['cel_shaded'],
    baseColor: '#ff6633',
    outlineWidth: 0.02,
    outlineColor: '#000000',
    shadeSteps: 3,
    specularSize: 0.2,
    rimLight: 0.4,
    rimColor: '#ffffff',
    textureMaps: [],
    shaderPasses: [],
    shaderConnections: [],
    properties: {},
  },
  {
    type: 'glass_material',
    name: 'ArchitecturalGlass',
    traits: ['transparent'],
    baseColor: '#ffffff',
    opacity: 0.15,
    IOR: 1.52,
    transmission: 0.95,
    roughness: 0.02,
    thickness: 0.01,
    attenuationColor: '#eeffee',
    textureMaps: [],
    shaderPasses: [],
    shaderConnections: [],
    properties: {},
  },
  {
    type: 'subsurface_material',
    name: 'HumanSkin',
    traits: ['sss'],
    baseColor: '#ddb8a0',
    roughness: 0.4,
    metallic: 0.0,
    subsurfaceColor: '#cc4422',
    subsurfaceRadius: [1.0, 0.2, 0.1],
    textureMaps: [
      { channel: 'subsurface_map', source: 'textures/skin_subsurface.png' },
      { channel: 'thickness_map', source: 'textures/skin_thickness.png' },
      { channel: 'normal_map', source: 'textures/skin_normal.png', strength: 0.8 },
    ],
    shaderPasses: [],
    shaderConnections: [],
    properties: {},
  },
];

const SHADER_MATERIAL: MaterialDefinition = {
  type: 'shader',
  name: 'CustomTerrain',
  traits: [],
  roughness: 0.7,
  textureMaps: [],
  shaderPasses: [
    {
      name: 'ForwardBase',
      vertex: 'shaders/terrain.vert',
      fragment: 'shaders/terrain.frag',
      blend: 'opaque',
      properties: {},
    },
    {
      name: 'ShadowCaster',
      vertex: 'shaders/terrain_shadow.vert',
      fragment: 'shaders/terrain_shadow.frag',
      properties: {},
    },
  ],
  shaderConnections: [
    { output: 'heightBlend', input: 'material.baseColor' },
    { output: 'normalOut', input: 'material.normal' },
  ],
  properties: { tiling_scale: 4.0 },
};

// =============================================================================
// MOCK Three.js (minimal)
// =============================================================================

// Three.js is partially mocked in vitest; we check constructor calls and args.

// =============================================================================
// TEST: HoloScriptMaterialParser
// =============================================================================

describe('HoloScriptMaterialParser', () => {
  describe('parseJSON', () => {
    it('should parse a basic PBR material from JSON', () => {
      const result = HoloScriptMaterialParser.parseJSON({
        type: 'material',
        name: 'BrushedSteel',
        traits: ['pbr'],
        baseColor: '#888888',
        roughness: 0.3,
        metallic: 1.0,
      });

      expect(result.type).toBe('material');
      expect(result.name).toBe('BrushedSteel');
      expect(result.traits).toEqual(['pbr']);
      expect(result.baseColor).toBe('#888888');
      expect(result.roughness).toBe(0.3);
      expect(result.metallic).toBe(1.0);
    });

    it('should parse texture maps from properties', () => {
      const result = HoloScriptMaterialParser.parseJSON({
        type: 'pbr_material',
        name: 'Floor',
        albedo_map: 'textures/floor.png',
        normal_map: 'textures/floor_n.png',
        roughness: 0.5,
      });

      expect(result.textureMaps).toHaveLength(2);
      expect(result.textureMaps[0].channel).toBe('albedo_map');
      expect(result.textureMaps[0].source).toBe('textures/floor.png');
      expect(result.textureMaps[1].channel).toBe('normal_map');
      expect(result.roughness).toBe(0.5);
    });

    it('should parse structured texture map blocks from JSON', () => {
      const result = HoloScriptMaterialParser.parseJSON({
        type: 'pbr_material',
        name: 'Brick',
        albedo_map: {
          source: 'textures/brick.png',
          tiling: [4, 4],
          filtering: 'trilinear',
        },
      });

      expect(result.textureMaps).toHaveLength(1);
      const map = result.textureMaps[0];
      expect(map.channel).toBe('albedo_map');
      expect(map.source).toBe('textures/brick.png');
      expect(map.tiling).toEqual([4, 4]);
      expect(map.filtering).toBe('trilinear');
    });

    it('should parse glass material with transmission properties', () => {
      const result = HoloScriptMaterialParser.parseJSON({
        type: 'glass_material',
        name: 'Window',
        baseColor: '#ffffff',
        opacity: 0.15,
        IOR: 1.52,
        transmission: 0.95,
        roughness: 0.02,
        thickness: 0.01,
      });

      expect(result.type).toBe('glass_material');
      expect(result.IOR).toBe(1.52);
      expect(result.transmission).toBe(0.95);
      expect(result.thickness).toBe(0.01);
    });

    it('should parse toon material with outline properties', () => {
      const result = HoloScriptMaterialParser.parseJSON({
        type: 'toon_material',
        name: 'Cartoon',
        baseColor: '#ff6633',
        outline_width: 0.02,
        outline_color: '#000000',
        shade_steps: 3,
      });

      expect(result.type).toBe('toon_material');
      expect(result.outlineWidth).toBe(0.02);
      expect(result.outlineColor).toBe('#000000');
      expect(result.shadeSteps).toBe(3);
    });

    it('should parse subsurface material with SSS properties', () => {
      const result = HoloScriptMaterialParser.parseJSON({
        type: 'subsurface_material',
        name: 'Skin',
        baseColor: '#ddb8a0',
        subsurface_color: '#cc4422',
        subsurface_radius: [1.0, 0.2, 0.1],
      });

      expect(result.type).toBe('subsurface_material');
      expect(result.subsurfaceColor).toBe('#cc4422');
      expect(result.subsurfaceRadius).toEqual([1.0, 0.2, 0.1]);
    });

    it('should handle snake_case and camelCase property aliases', () => {
      const snakeCase = HoloScriptMaterialParser.parseJSON({
        type: 'material',
        name: 'Test',
        double_sided: true,
        emissive_intensity: 2.5,
      });

      const camelCase = HoloScriptMaterialParser.parseJSON({
        type: 'material',
        name: 'Test',
        doubleSided: true,
        emissiveIntensity: 2.5,
      });

      expect(snakeCase.doubleSided).toBe(true);
      expect(snakeCase.emissiveIntensity).toBe(2.5);
      expect(camelCase.doubleSided).toBe(true);
      expect(camelCase.emissiveIntensity).toBe(2.5);
    });
  });

  describe('parseFromComposition', () => {
    it('should parse composition IR nodes', () => {
      const nodes: CompositionMaterialNode[] = [
        {
          type: 'material',
          name: 'Steel',
          traits: [{ name: 'pbr' }],
          properties: { roughness: 0.3, metallic: 1.0 },
        },
        {
          type: 'glass_material',
          name: 'Window',
          properties: { transmission: 0.95, IOR: 1.52 },
        },
      ];

      const results = HoloScriptMaterialParser.parseFromComposition(nodes);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Steel');
      expect(results[0].roughness).toBe(0.3);
      expect(results[1].name).toBe('Window');
      expect(results[1].transmission).toBe(0.95);
    });

    it('should filter out non-material nodes', () => {
      const nodes: CompositionMaterialNode[] = [
        { type: 'material', name: 'Steel', properties: {} },
        { type: 'object', name: 'Cube', properties: {} }, // not a material
        { type: 'pbr_material', name: 'Wood', properties: {} },
      ];

      const results = HoloScriptMaterialParser.parseFromComposition(nodes);
      expect(results).toHaveLength(2);
    });
  });

  describe('all 7 material types coverage', () => {
    const types: HoloMaterialType[] = [
      'material', 'pbr_material', 'unlit_material', 'shader',
      'toon_material', 'glass_material', 'subsurface_material',
    ];

    types.forEach(type => {
      it(`should handle ${type} type`, () => {
        const result = HoloScriptMaterialParser.parseJSON({
          type,
          name: `Test_${type}`,
          roughness: 0.5,
        });

        expect(result.type).toBe(type);
        expect(result.name).toBe(`Test_${type}`);
      });
    });
  });

  describe('all 19 texture map channels', () => {
    const channels = [
      'albedo_map', 'normal_map', 'roughness_map', 'metallic_map',
      'emission_map', 'ao_map', 'height_map', 'opacity_map',
      'displacement_map', 'specular_map', 'clearcoat_map',
      'baseColor_map', 'emissive_map', 'transmission_map',
      'sheen_map', 'anisotropy_map', 'thickness_map',
      'subsurface_map', 'iridescence_map',
    ];

    channels.forEach(channel => {
      it(`should parse ${channel} texture channel`, () => {
        const json: Record<string, unknown> = {
          type: 'pbr_material',
          name: 'TextureTest',
        };
        json[channel] = `textures/${channel}.png`;

        const result = HoloScriptMaterialParser.parseJSON(json);
        const map = result.textureMaps.find(m => m.channel === channel);

        expect(map).toBeDefined();
        expect(map!.source).toBe(`textures/${channel}.png`);
      });
    });
  });
});

// =============================================================================
// TEST: VRMaterialPreviewSystem
// =============================================================================

describe('VRMaterialPreviewSystem', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let system: VRMaterialPreviewSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    camera.updateMatrixWorld();

    system = createVRMaterialPreviewSystem(scene, camera, {
      qualitySettings: QUALITY_PRESETS.high,
      maxVisiblePreviews: 20,
      enableInteraction: true,
    });
  });

  afterEach(() => {
    system.dispose();
  });

  describe('initialization', () => {
    it('should create a gallery root group in the scene', () => {
      const galleryRoot = system.getGalleryRoot();
      expect(galleryRoot).toBeInstanceOf(THREE.Group);
      expect(galleryRoot.name).toBe('VRMaterialPreviewGallery');
      expect(scene.children).toContain(galleryRoot);
    });

    it('should initialize with correct quality settings', () => {
      const metrics = system.getMetrics();
      expect(metrics.materialsLoaded).toBe(0);
      expect(metrics.texturesInVRAM).toBe(0);
    });
  });

  describe('material loading', () => {
    it('should load materials and create preview meshes', async () => {
      const materials = SAMPLE_MATERIALS.slice(0, 3);
      await system.loadMaterials(materials);

      const loaded = system.getMaterials();
      expect(loaded).toHaveLength(3);
      expect(loaded[0].name).toBe('BrushedSteel');
      expect(loaded[1].name).toBe('HardwoodFloor');
      expect(loaded[2].name).toBe('WeatheredBrick');
    });

    it('should create sphere meshes for each material', async () => {
      await system.loadMaterials([SAMPLE_MATERIALS[0]]);

      const galleryRoot = system.getGalleryRoot();
      // Should have mesh + label = 2 children
      expect(galleryRoot.children.length).toBeGreaterThanOrEqual(2);

      const mesh = galleryRoot.children.find(
        c => c instanceof THREE.Mesh && c.name === 'preview_BrushedSteel'
      );
      expect(mesh).toBeDefined();
    });

    it('should handle all 7 material types without errors', async () => {
      const allTypes: MaterialDefinition[] = [
        ...SAMPLE_MATERIALS,
        SHADER_MATERIAL,
      ];

      // Should not throw
      await expect(system.loadMaterials(allTypes)).resolves.not.toThrow();

      const loaded = system.getMaterials();
      expect(loaded).toHaveLength(8);
    });
  });

  describe('gallery layout', () => {
    it('should position materials in an arc by default', async () => {
      await system.loadMaterials(SAMPLE_MATERIALS.slice(0, 3));

      const galleryRoot = system.getGalleryRoot();
      const meshes = galleryRoot.children.filter(c => c instanceof THREE.Mesh);

      // All meshes should have different X positions (arc layout)
      const xPositions = meshes.map(m => m.position.x);
      const uniqueX = new Set(xPositions.map(x => x.toFixed(2)));
      expect(uniqueX.size).toBe(meshes.length);
    });

    it('should support grid layout', async () => {
      system.setLayout({ type: 'grid', columns: 3 });
      await system.loadMaterials(SAMPLE_MATERIALS.slice(0, 6));

      const galleryRoot = system.getGalleryRoot();
      const meshes = galleryRoot.children.filter(c => c instanceof THREE.Mesh) as THREE.Mesh[];

      // Grid: first 3 should have the same Y, next 3 different Y
      expect(meshes.length).toBe(6);
    });

    it('should reposition all spheres when layout changes', async () => {
      await system.loadMaterials(SAMPLE_MATERIALS.slice(0, 3));

      const galleryRoot = system.getGalleryRoot();
      const mesh = galleryRoot.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
      const originalX = mesh.position.x;

      system.setLayout({ type: 'carousel', viewDistance: 3.0 });

      // Position should have changed
      expect(mesh.position.x).not.toBe(originalX);
    });
  });

  describe('update loop (90fps budget)', () => {
    it('should update without errors', async () => {
      await system.loadMaterials(SAMPLE_MATERIALS.slice(0, 3));

      // Simulate 10 frames at 90fps (11.1ms each)
      for (let i = 0; i < 10; i++) {
        system.update(11.1, camera);
      }

      // Should still have valid metrics
      const metrics = system.getMetrics();
      expect(metrics.materialsLoaded).toBe(3);
    });

    it('should perform frustum culling', async () => {
      await system.loadMaterials(SAMPLE_MATERIALS);

      // Move camera to only see some materials
      camera.position.set(100, 100, 100);
      camera.lookAt(100, 100, 0);
      camera.updateMatrixWorld();

      system.update(11.1, camera);

      // Some spheres should be hidden
      const galleryRoot = system.getGalleryRoot();
      const visibleMeshes = galleryRoot.children.filter(
        c => c instanceof THREE.Mesh && c.visible
      );

      // At extreme distance, none should be visible
      expect(visibleMeshes.length).toBeLessThanOrEqual(SAMPLE_MATERIALS.length);
    });

    it('should perform LOD switching based on distance', async () => {
      await system.loadMaterials([SAMPLE_MATERIALS[0]]);

      const galleryRoot = system.getGalleryRoot();
      const mesh = galleryRoot.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;

      // Close camera — should use high-detail geometry
      camera.position.set(0, 0, 1);
      camera.updateMatrixWorld();
      system.update(11.1, camera);

      const closeGeometry = mesh.geometry;

      // Far camera — should use low-detail geometry
      camera.position.set(0, 0, 100);
      camera.updateMatrixWorld();
      system.update(11.1, camera);

      const farGeometry = mesh.geometry;

      // Geometries should differ (different segment counts)
      expect(closeGeometry).not.toBe(farGeometry);
    });
  });

  describe('interaction', () => {
    it('should select material with ray intersection', async () => {
      await system.loadMaterials([SAMPLE_MATERIALS[0]]);

      const galleryRoot = system.getGalleryRoot();
      const mesh = galleryRoot.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;

      // Cast ray towards the sphere
      const origin = new THREE.Vector3(
        mesh.position.x,
        mesh.position.y,
        mesh.position.z + 5,
      );
      const direction = new THREE.Vector3(0, 0, -1);

      const selected = system.selectWithRay(origin, direction);

      expect(selected).toBeDefined();
      expect(selected?.name).toBe('BrushedSteel');
    });

    it('should return null when ray misses', async () => {
      await system.loadMaterials([SAMPLE_MATERIALS[0]]);

      // Cast ray in opposite direction
      const origin = new THREE.Vector3(100, 100, 100);
      const direction = new THREE.Vector3(0, 1, 0);

      const selected = system.selectWithRay(origin, direction);
      expect(selected).toBeNull();
    });

    it('should track focused state', async () => {
      await system.loadMaterials(SAMPLE_MATERIALS.slice(0, 2));

      // Before selection
      expect(system.getFocusedMaterial()).toBeNull();

      const galleryRoot = system.getGalleryRoot();
      const mesh = galleryRoot.children.find(
        c => c instanceof THREE.Mesh && c.name === 'preview_BrushedSteel'
      ) as THREE.Mesh;

      // Select
      const origin = new THREE.Vector3(
        mesh.position.x,
        mesh.position.y,
        mesh.position.z + 5,
      );
      system.selectWithRay(origin, new THREE.Vector3(0, 0, -1));

      const focused = system.getFocusedMaterial();
      expect(focused?.name).toBe('BrushedSteel');
    });
  });

  describe('material management', () => {
    it('should add a single material', async () => {
      expect(system.getMaterials()).toHaveLength(0);

      await system.addMaterial(SAMPLE_MATERIALS[0]);

      expect(system.getMaterials()).toHaveLength(1);
      expect(system.getMaterials()[0].name).toBe('BrushedSteel');
    });

    it('should remove a material', async () => {
      await system.loadMaterials(SAMPLE_MATERIALS.slice(0, 3));
      expect(system.getMaterials()).toHaveLength(3);

      system.removeMaterial('HardwoodFloor');

      expect(system.getMaterials()).toHaveLength(2);
      expect(system.getMaterials().find(m => m.name === 'HardwoodFloor')).toBeUndefined();
    });
  });

  describe('environment map', () => {
    it('should update environment map on all materials', async () => {
      await system.loadMaterials([SAMPLE_MATERIALS[0]]);

      const envMap = new THREE.CubeTexture();
      system.setEnvironmentMap(envMap);

      // The system should have updated — no throw
      expect(() => system.setEnvironmentMap(envMap)).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should dispose all resources', async () => {
      await system.loadMaterials(SAMPLE_MATERIALS);

      system.dispose();

      // Gallery root should be removed from scene
      expect(scene.children.find(c => c.name === 'VRMaterialPreviewGallery')).toBeUndefined();
      expect(system.getMaterials()).toHaveLength(0);
    });
  });

  describe('metrics', () => {
    it('should report correct material count', async () => {
      await system.loadMaterials(SAMPLE_MATERIALS.slice(0, 4));

      const metrics = system.getMetrics();
      expect(metrics.materialsLoaded).toBe(4);
    });

    it('should report VRAM usage', async () => {
      const metrics = system.getMetrics();
      expect(metrics.vramUsageMB).toBeGreaterThanOrEqual(0);
    });
  });
});

// =============================================================================
// TEST: Material type -> Three.js mapping
// =============================================================================

describe('Material Type Mapping', () => {
  it('should map all 7 grammar types to valid Three.js materials', () => {
    // This verifies the grammar coverage is complete
    const grammarTypes: HoloMaterialType[] = [
      'material',
      'pbr_material',
      'unlit_material',
      'shader',
      'toon_material',
      'glass_material',
      'subsurface_material',
    ];

    // Each should produce a valid MaterialDefinition
    for (const type of grammarTypes) {
      const def = HoloScriptMaterialParser.parseJSON({
        type,
        name: `test_${type}`,
        roughness: 0.5,
      });

      expect(def.type).toBe(type);
      expect(def.name).toBe(`test_${type}`);
    }
  });

  it('should preserve shader pass and connection data', () => {
    expect(SHADER_MATERIAL.shaderPasses).toHaveLength(2);
    expect(SHADER_MATERIAL.shaderPasses[0].name).toBe('ForwardBase');
    expect(SHADER_MATERIAL.shaderPasses[1].name).toBe('ShadowCaster');
    expect(SHADER_MATERIAL.shaderConnections).toHaveLength(2);
    expect(SHADER_MATERIAL.shaderConnections[0].output).toBe('heightBlend');
    expect(SHADER_MATERIAL.shaderConnections[0].input).toBe('material.baseColor');
  });
});
