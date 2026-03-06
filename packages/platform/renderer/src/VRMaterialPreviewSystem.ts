/**
 * VRMaterialPreviewSystem
 *
 * Renders PBR materials from HoloScript material_block grammar at 90fps in VR.
 * Bridges HoloScript's material_block AST (material, pbr_material, unlit_material,
 * shader, toon_material, glass_material, subsurface_material) to Three.js materials
 * displayed on preview spheres in an interactive VR gallery.
 *
 * Architecture:
 * 1. HoloScriptMaterialParser  -> Parses material_block AST into MaterialDefinition
 * 2. VRMaterialPreviewSystem   -> Manages preview gallery, rendering, and interaction
 * 3. MaterialFactory           -> Creates Three.js materials (existing, extended)
 *
 * 90fps VR Budget (11.1ms per frame):
 * - Material compilation: async, off-frame (pre-compiled)
 * - Texture loading: async streaming with LOD placeholders
 * - Preview sphere rendering: instanced geometry, shared UVs
 * - Interaction: ray-based selection, no per-frame allocation
 * - LOD: adaptive detail based on eye distance
 *
 * @module VRMaterialPreviewSystem
 */

import * as THREE from 'three';
import type { QualitySettings } from './types';
import { MaterialFactory, type MaterialOptions } from './MaterialFactory';
import { logger } from './logger';

// =============================================================================
// TYPES — HoloScript material_block AST mapping
// =============================================================================

/**
 * Supported HoloScript material block types (from grammar.js material_block rule).
 * Maps directly to: material, pbr_material, unlit_material, shader,
 *                    toon_material, glass_material, subsurface_material
 */
export type HoloMaterialType =
  | 'material'
  | 'pbr_material'
  | 'unlit_material'
  | 'shader'
  | 'toon_material'
  | 'glass_material'
  | 'subsurface_material';

/**
 * Texture map channel names from grammar.js texture_map rule.
 * Supports both inline (texture_map) and block (texture_map_block) forms.
 */
export type TextureChannel =
  | 'albedo_map' | 'normal_map' | 'roughness_map' | 'metallic_map'
  | 'emission_map' | 'ao_map' | 'height_map' | 'opacity_map'
  | 'displacement_map' | 'specular_map' | 'clearcoat_map'
  | 'baseColor_map' | 'emissive_map' | 'transmission_map'
  | 'sheen_map' | 'anisotropy_map' | 'thickness_map'
  | 'subsurface_map' | 'iridescence_map';

/**
 * Texture map definition — inline or block form
 */
export interface TextureMapDef {
  channel: TextureChannel;
  source: string;
  tiling?: [number, number];
  filtering?: 'nearest' | 'bilinear' | 'trilinear' | 'anisotropic';
  strength?: number;
  format?: string;
  intensity?: number;
  scale?: number;
  /** Which color channel to read from (for packed maps) */
  channelSelect?: 'r' | 'g' | 'b' | 'a';
}

/**
 * Shader pass definition from grammar.js shader_pass rule.
 */
export interface ShaderPassDef {
  name?: string;
  vertex?: string;
  fragment?: string;
  blend?: string;
  properties: Record<string, unknown>;
}

/**
 * Complete material definition parsed from HoloScript material_block.
 * This is the intermediate representation between the AST and Three.js materials.
 */
export interface MaterialDefinition {
  /** Material block type (material, pbr_material, etc.) */
  type: HoloMaterialType;
  /** Material name from the grammar field('name', ...) */
  name: string;
  /** Trait decorators (@pbr, @transparent, @cel_shaded, @sss, etc.) */
  traits: string[];

  // ── PBR Core Properties ──────────────────────────────────────────
  baseColor?: string | number[];
  roughness?: number;
  metallic?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  IOR?: number;
  transmission?: number;
  thickness?: number;
  doubleSided?: boolean;

  // ── Subsurface (subsurface_material) ─────────────────────────────
  subsurfaceColor?: string;
  subsurfaceRadius?: number[];

  // ── Toon (toon_material) ─────────────────────────────────────────
  outlineWidth?: number;
  outlineColor?: string;
  shadeSteps?: number;
  specularSize?: number;
  rimLight?: number;
  rimColor?: string;

  // ── Glass (glass_material) ───────────────────────────────────────
  attenuationColor?: string;

  // ── Texture Maps ─────────────────────────────────────────────────
  textureMaps: TextureMapDef[];

  // ── Shader Passes (shader blocks only) ───────────────────────────
  shaderPasses: ShaderPassDef[];

  // ── Shader Connections (output -> input) ─────────────────────────
  shaderConnections: Array<{ output: string; input: string }>;

  // ── Additional properties (catch-all for extensibility) ──────────
  properties: Record<string, unknown>;
}

// =============================================================================
// PREVIEW SPHERE CONFIGURATION
// =============================================================================

/**
 * Configuration for a single preview sphere in the VR gallery
 */
export interface PreviewSphereConfig {
  /** Sphere radius in meters */
  radius: number;
  /** Geometry segments — VR needs fewer for 90fps */
  widthSegments: number;
  heightSegments: number;
  /** Distance from camera at which to show full detail */
  lodDistances: [number, number, number]; // [high, medium, low]
}

/**
 * VR-optimized sphere detail levels
 */
const VR_SPHERE_LOD: Record<string, PreviewSphereConfig> = {
  /** Focused sphere (being examined) */
  focused: {
    radius: 0.4,
    widthSegments: 64,
    heightSegments: 64,
    lodDistances: [2, 5, 10],
  },
  /** Gallery sphere (in-row) */
  gallery: {
    radius: 0.3,
    widthSegments: 32,
    heightSegments: 32,
    lodDistances: [3, 8, 20],
  },
  /** Distant sphere (scrolled away) */
  distant: {
    radius: 0.3,
    widthSegments: 16,
    heightSegments: 16,
    lodDistances: [5, 15, 40],
  },
};

// =============================================================================
// GALLERY LAYOUT
// =============================================================================

/**
 * How materials are arranged in VR space
 */
export interface GalleryLayout {
  /** Grid or arc arrangement */
  type: 'grid' | 'arc' | 'carousel';
  /** Number of materials per row */
  columns: number;
  /** Spacing between spheres in meters */
  spacing: number;
  /** Height offset from eye level */
  heightOffset: number;
  /** Distance from the user in meters */
  viewDistance: number;
  /** Arc angle in degrees (for 'arc' layout) */
  arcAngle?: number;
}

const DEFAULT_GALLERY_LAYOUT: GalleryLayout = {
  type: 'arc',
  columns: 5,
  spacing: 0.9,
  heightOffset: 0,
  viewDistance: 2.0,
  arcAngle: 120,
};

// =============================================================================
// PREVIEW METRICS — always monitoring for 90fps budget
// =============================================================================

export interface VRPreviewMetrics {
  /** Current FPS */
  fps: number;
  /** Frame time in ms (must stay under 11.1ms for 90fps) */
  frameTimeMs: number;
  /** Number of materials loaded */
  materialsLoaded: number;
  /** Number of textures in VRAM */
  texturesInVRAM: number;
  /** Estimated VRAM usage in MB */
  vramUsageMB: number;
  /** Number of draw calls this frame */
  drawCalls: number;
  /** Number of triangles this frame */
  triangles: number;
  /** Whether we are within 90fps budget */
  withinBudget: boolean;
}

// =============================================================================
// VR MATERIAL PREVIEW SYSTEM
// =============================================================================

/**
 * Configuration for the VR Material Preview System
 */
export interface VRMaterialPreviewConfig {
  /** Quality settings from the renderer */
  qualitySettings: QualitySettings;
  /** Gallery layout */
  layout?: Partial<GalleryLayout>;
  /** Maximum number of preview spheres visible at once (for culling) */
  maxVisiblePreviews?: number;
  /** Enable real-time environment reflections on preview spheres */
  enableReflections?: boolean;
  /** HDRI environment map for reflections */
  envMap?: THREE.Texture;
  /** Texture budget in MB (will stream/evict to stay under) */
  textureBudgetMB?: number;
  /** Enable interaction (ray selection, haptic feedback markers) */
  enableInteraction?: boolean;
}

/**
 * State for a single material preview in the gallery
 */
interface PreviewState {
  /** The parsed material definition */
  definition: MaterialDefinition;
  /** Three.js material instance */
  material: THREE.Material | null;
  /** Preview sphere mesh */
  mesh: THREE.Mesh | null;
  /** Name label (3D text sprite) */
  label: THREE.Sprite | null;
  /** Whether the material is compiled and ready */
  ready: boolean;
  /** Whether this preview is currently selected/focused */
  focused: boolean;
  /** Texture loading progress (0-1) */
  textureProgress: number;
  /** Estimated VRAM for this material in bytes */
  vramBytes: number;
}

/**
 * VR Material Preview System
 *
 * Renders HoloScript material_block definitions as interactive preview spheres
 * in a VR gallery, maintaining 90fps.
 *
 * Usage:
 * ```typescript
 * const previewSystem = new VRMaterialPreviewSystem(scene, camera, {
 *   qualitySettings: renderer.getQualitySettings(),
 *   envMap: envManager.getEnvironmentMap(),
 * });
 *
 * // Parse materials from HoloScript AST
 * const materials = HoloScriptMaterialParser.parseAll(astNodes);
 *
 * // Load into preview system
 * await previewSystem.loadMaterials(materials);
 *
 * // In render loop (call every frame)
 * previewSystem.update(deltaTime, camera);
 * ```
 */
export class VRMaterialPreviewSystem {
  private scene: THREE.Scene;
  private config: Required<VRMaterialPreviewConfig>;
  private materialFactory: MaterialFactory;
  private textureLoader: THREE.TextureLoader;

  // Preview state
  private previews: Map<string, PreviewState> = new Map();
  private galleryRoot: THREE.Group;
  private layout: GalleryLayout;

  // Geometry pool (shared across all preview spheres for instancing)
  private geometryPool: Map<string, THREE.SphereGeometry> = new Map();

  // Interaction state
  private focusedPreview: string | null = null;
  private raycaster: THREE.Raycaster;
  private interactionTargets: THREE.Mesh[] = [];

  // Performance monitoring
  private frameTimeAccumulator: number = 0;
  private frameCount: number = 0;
  private currentFPS: number = 90;
  private lastMetricsUpdate: number = 0;

  // Texture streaming
  private textureCache: Map<string, THREE.Texture> = new Map();
  private textureVRAMBytes: number = 0;
  private textureBudgetBytes: number;

  // Placeholder material (shown while real material compiles)
  private placeholderMaterial: THREE.MeshBasicMaterial;

  constructor(
    scene: THREE.Scene,
    _camera: THREE.Camera,
    config: VRMaterialPreviewConfig,
  ) {
    this.scene = scene;
    this.config = {
      qualitySettings: config.qualitySettings,
      layout: config.layout ?? {},
      maxVisiblePreviews: config.maxVisiblePreviews ?? 20,
      enableReflections: config.enableReflections ?? true,
      envMap: config.envMap ?? null as unknown as THREE.Texture,
      textureBudgetMB: config.textureBudgetMB ?? 128,
      enableInteraction: config.enableInteraction ?? true,
    };

    this.layout = { ...DEFAULT_GALLERY_LAYOUT, ...config.layout };
    this.materialFactory = new MaterialFactory(config.qualitySettings);
    this.textureLoader = new THREE.TextureLoader();
    this.raycaster = new THREE.Raycaster();
    this.textureBudgetBytes = this.config.textureBudgetMB * 1024 * 1024;

    // Create gallery root group
    this.galleryRoot = new THREE.Group();
    this.galleryRoot.name = 'VRMaterialPreviewGallery';
    this.scene.add(this.galleryRoot);

    // Create shared geometries (VR budget: minimize unique geometries)
    this.initGeometryPool();

    // Placeholder material for loading state
    this.placeholderMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      wireframe: true,
    });

    // Set environment map on factory if provided
    if (config.envMap) {
      this.materialFactory.setEnvironmentMap(config.envMap);
    }

    logger.info('[VRMaterialPreviewSystem] Initialized', {
      layout: this.layout.type,
      maxVisible: this.config.maxVisiblePreviews,
      textureBudgetMB: this.config.textureBudgetMB,
      reflections: this.config.enableReflections,
    });
  }

  // ===========================================================================
  // GEOMETRY POOL — shared spheres to minimize draw calls
  // ===========================================================================

  private initGeometryPool(): void {
    for (const [key, config] of Object.entries(VR_SPHERE_LOD)) {
      const geometry = new THREE.SphereGeometry(
        config.radius,
        config.widthSegments,
        config.heightSegments,
      );
      // Pre-compute bounding sphere for frustum culling
      geometry.computeBoundingSphere();
      this.geometryPool.set(key, geometry);
    }
  }

  private getGeometry(level: 'focused' | 'gallery' | 'distant'): THREE.SphereGeometry {
    return this.geometryPool.get(level) ?? this.geometryPool.get('gallery')!;
  }

  // ===========================================================================
  // MATERIAL LOADING — async pipeline off the render frame
  // ===========================================================================

  /**
   * Load an array of HoloScript MaterialDefinitions into the preview gallery.
   * Materials are compiled asynchronously to avoid blocking the render loop.
   */
  async loadMaterials(definitions: MaterialDefinition[]): Promise<void> {
    logger.info('[VRMaterialPreviewSystem] Loading materials', {
      count: definitions.length,
    });

    // Create preview states with placeholder meshes immediately
    for (let i = 0; i < definitions.length; i++) {
      const def = definitions[i];
      const position = this.calculatePosition(i, definitions.length);

      const state: PreviewState = {
        definition: def,
        material: null,
        mesh: null,
        label: null,
        ready: false,
        focused: false,
        textureProgress: 0,
        vramBytes: 0,
      };

      // Create placeholder mesh immediately (no frame stall)
      const mesh = new THREE.Mesh(
        this.getGeometry('gallery'),
        this.placeholderMaterial,
      );
      mesh.position.copy(position);
      mesh.name = `preview_${def.name}`;
      mesh.userData.materialName = def.name;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      // Store frustum culling hint
      mesh.frustumCulled = true;

      state.mesh = mesh;
      this.galleryRoot.add(mesh);
      this.interactionTargets.push(mesh);

      // Create name label
      state.label = this.createLabel(def.name, def.type);
      state.label.position.copy(position);
      state.label.position.y -= 0.5;
      this.galleryRoot.add(state.label);

      this.previews.set(def.name, state);
    }

    // Compile materials asynchronously (off the render thread)
    // Use microtask batching to avoid blocking frames
    const BATCH_SIZE = 3; // Compile 3 materials per frame
    for (let i = 0; i < definitions.length; i += BATCH_SIZE) {
      const batch = definitions.slice(i, i + BATCH_SIZE);
      await this.compileMaterialBatch(batch);
      // Yield to render loop between batches
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    logger.info('[VRMaterialPreviewSystem] All materials loaded', {
      count: this.previews.size,
    });
  }

  /**
   * Compile a batch of materials and update their preview meshes.
   */
  private async compileMaterialBatch(definitions: MaterialDefinition[]): Promise<void> {
    for (const def of definitions) {
      const state = this.previews.get(def.name);
      if (!state) continue;

      try {
        // Convert MaterialDefinition to Three.js material
        const material = await this.compileMaterial(def);
        state.material = material;
        state.ready = true;

        // Swap placeholder material with compiled material
        if (state.mesh) {
          state.mesh.material = material;
        }
      } catch (error) {
        logger.warn('[VRMaterialPreviewSystem] Failed to compile material', {
          name: def.name,
          error: String(error),
        });
        // Keep placeholder material on failure
      }
    }
  }

  /**
   * Compile a single HoloScript MaterialDefinition into a Three.js material.
   * This is where grammar data maps to rendering.
   */
  private async compileMaterial(def: MaterialDefinition): Promise<THREE.Material> {
    const options: MaterialOptions = {};

    // ── Base color ─────────────────────────────────────────────────
    if (def.baseColor) {
      if (typeof def.baseColor === 'string') {
        options.color = def.baseColor;
      } else if (Array.isArray(def.baseColor)) {
        const c = new THREE.Color(def.baseColor[0], def.baseColor[1], def.baseColor[2]);
        options.color = c.getHex();
      }
    }

    // ── PBR properties ────────────────────────────────────────────
    if (def.roughness !== undefined) options.roughness = def.roughness;
    if (def.metallic !== undefined) options.metalness = def.metallic;
    if (def.opacity !== undefined) {
      options.opacity = def.opacity;
      options.transparent = def.opacity < 1.0;
    }
    if (def.doubleSided) {
      options.side = THREE.DoubleSide;
    }

    // ── Emissive ──────────────────────────────────────────────────
    if (def.emissive) {
      options.emissive = def.emissive;
    }
    if (def.emissiveIntensity !== undefined) {
      options.emissiveIntensity = def.emissiveIntensity;
    }

    // ── Glass / Transmission ──────────────────────────────────────
    if (def.transmission !== undefined) {
      options.transmission = def.transmission;
      options.transparent = true;
    }
    if (def.IOR !== undefined) {
      options.ior = def.IOR;
    }
    if (def.thickness !== undefined) {
      options.thickness = def.thickness;
    }

    // ── Texture maps (async load) ──────────────────────────────────
    // Load textures within VRAM budget
    for (const texMap of def.textureMaps) {
      const texture = await this.loadTexture(texMap);
      if (!texture) continue;

      switch (texMap.channel) {
        case 'albedo_map':
        case 'baseColor_map':
          options.map = texture;
          if (texMap.tiling) {
            texture.repeat.set(texMap.tiling[0], texMap.tiling[1]);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
          }
          break;
        case 'normal_map':
          options.normalMap = texture;
          if (texMap.strength !== undefined) {
            options.normalScale = { x: texMap.strength, y: texMap.strength };
          }
          break;
        case 'roughness_map':
          options.roughnessMap = texture;
          break;
        case 'metallic_map':
          options.metalnessMap = texture;
          break;
        case 'emission_map':
        case 'emissive_map':
          options.emissiveMap = texture;
          break;
        case 'ao_map':
          options.aoMap = texture;
          if (texMap.intensity !== undefined) {
            options.aoMapIntensity = texMap.intensity;
          }
          break;
        case 'displacement_map':
        case 'height_map':
          options.displacementMap = texture;
          if (texMap.scale !== undefined) {
            options.displacementScale = texMap.scale;
          }
          break;
      }
    }

    // ── Environment reflections ────────────────────────────────────
    if (this.config.enableReflections && this.config.envMap) {
      options.envMap = this.config.envMap;
      options.envMapIntensity = 1.0;
    }

    // ── Create material based on type ──────────────────────────────
    switch (def.type) {
      case 'unlit_material':
        return this.createUnlitMaterial(def, options);

      case 'toon_material':
        return this.createToonMaterial(def, options);

      case 'glass_material':
        return this.createGlassMaterial(def, options);

      case 'subsurface_material':
        return this.createSubsurfaceMaterial(def, options);

      case 'shader':
        return this.createShaderMaterial(def, options);

      case 'material':
      case 'pbr_material':
      default:
        return this.materialFactory.create(options);
    }
  }

  // ===========================================================================
  // SPECIALIZED MATERIAL CREATORS — grammar type -> Three.js material
  // ===========================================================================

  private createUnlitMaterial(_def: MaterialDefinition, options: MaterialOptions): THREE.Material {
    return new THREE.MeshBasicMaterial({
      color: options.color ?? 0xffffff,
      map: options.map,
      opacity: options.opacity ?? 1.0,
      transparent: options.transparent ?? false,
      side: options.side ?? THREE.FrontSide,
    });
  }

  private createToonMaterial(def: MaterialDefinition, options: MaterialOptions): THREE.Material {
    const steps = def.shadeSteps ?? 3;
    return this.materialFactory.createToonMaterial(
      options.color ?? 0xffffff,
      steps,
    );
  }

  private createGlassMaterial(def: MaterialDefinition, options: MaterialOptions): THREE.Material {
    return new THREE.MeshPhysicalMaterial({
      color: options.color ?? 0xffffff,
      metalness: options.metalness ?? 0,
      roughness: def.roughness ?? 0.05,
      transmission: def.transmission ?? 0.95,
      thickness: def.thickness ?? 0.5,
      ior: def.IOR ?? 1.5,
      transparent: true,
      opacity: def.opacity ?? 0.3,
      envMap: options.envMap,
      envMapIntensity: 1.0,
      side: THREE.DoubleSide,
    });
  }

  private createSubsurfaceMaterial(def: MaterialDefinition, options: MaterialOptions): THREE.Material {
    // Three.js MeshPhysicalMaterial supports subsurface approximation via
    // transmission + thickness + attenuation. True SSS requires custom shaders,
    // but this gives a convincing approximation at 90fps.
    const sssColor = def.subsurfaceColor
      ? new THREE.Color(def.subsurfaceColor)
      : new THREE.Color(0xcc4422);

    return new THREE.MeshPhysicalMaterial({
      color: options.color ?? 0xddb8a0,
      metalness: options.metalness ?? 0,
      roughness: def.roughness ?? 0.4,
      // SSS approximation
      transmission: 0.1,
      thickness: 1.0,
      attenuationColor: sssColor,
      attenuationDistance: 0.5,
      // Texture maps
      map: options.map,
      normalMap: options.normalMap,
      roughnessMap: options.roughnessMap,
      emissiveMap: options.emissiveMap,
      // Environment
      envMap: options.envMap,
      envMapIntensity: 0.5,
      side: def.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    });
  }

  private createShaderMaterial(def: MaterialDefinition, _options: MaterialOptions): THREE.Material {
    // For shader blocks, we create a basic representation
    // since custom shaders need target-specific compilation.
    // The preview uses a distinctive visual to indicate "custom shader".
    if (def.shaderPasses.length > 0) {
      const pass = def.shaderPasses[0];
      return new THREE.ShaderMaterial({
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          void main() {
            vec3 light = normalize(vec3(0.5, 1.0, 0.3));
            float diffuse = max(dot(vNormal, light), 0.0);
            vec3 color = mix(vec3(0.2, 0.2, 0.3), vec3(0.8, 0.7, 0.6), diffuse);
            // Indicate this is a custom shader preview with a stripe pattern
            float stripe = step(0.5, fract(vUv.x * 10.0));
            color = mix(color, color * 1.3, stripe * 0.15);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        uniforms: {
          // Store pass info for inspection
          passName: { value: pass.name ?? 'default' },
        },
      });
    }

    // Fallback for shader blocks without passes
    return this.materialFactory.create({
      roughness: def.roughness ?? 0.5,
      metalness: def.metallic ?? 0,
    });
  }

  // ===========================================================================
  // TEXTURE STREAMING — budget-aware loading
  // ===========================================================================

  /**
   * Load a texture with VRAM budget awareness.
   * Returns null if budget is exceeded (texture eviction happens separately).
   */
  private async loadTexture(texMap: TextureMapDef): Promise<THREE.Texture | null> {
    // Check cache first
    const cacheKey = `${texMap.source}_${texMap.filtering ?? 'default'}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    // Estimate VRAM for this texture (assume 1024x1024 RGBA by default)
    const estimatedBytes = this.estimateTextureVRAM(texMap);
    if (this.textureVRAMBytes + estimatedBytes > this.textureBudgetBytes) {
      logger.warn('[VRMaterialPreviewSystem] Texture budget exceeded, skipping', {
        texture: texMap.source,
        budgetMB: this.config.textureBudgetMB,
        currentMB: (this.textureVRAMBytes / (1024 * 1024)).toFixed(1),
      });
      return null;
    }

    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        this.textureLoader.load(texMap.source, resolve, undefined, reject);
      });

      // Apply filtering
      switch (texMap.filtering) {
        case 'nearest':
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          break;
        case 'bilinear':
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearFilter;
          break;
        case 'trilinear':
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.generateMipmaps = true;
          break;
        case 'anisotropic':
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.generateMipmaps = true;
          texture.anisotropy = this.config.qualitySettings.anisotropy;
          break;
        default:
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.generateMipmaps = true;
      }

      // Apply tiling
      if (texMap.tiling) {
        texture.repeat.set(texMap.tiling[0], texMap.tiling[1]);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      }

      // Downscale to quality budget
      const maxSize = this.config.qualitySettings.maxTextureSize;
      if (texture.image && (texture.image.width > maxSize || texture.image.height > maxSize)) {
        // Three.js will handle this via texture.image resizing in GPU upload
        texture.userData.originalSize = [texture.image.width, texture.image.height];
      }

      // Track VRAM
      const actualBytes = this.measureTextureVRAM(texture);
      this.textureVRAMBytes += actualBytes;
      this.textureCache.set(cacheKey, texture);

      return texture;
    } catch {
      // Texture loading failed — return null (preview will use color only)
      logger.debug('[VRMaterialPreviewSystem] Texture not found (expected in preview mode)', {
        source: texMap.source,
      });
      return null;
    }
  }

  private estimateTextureVRAM(_texMap: TextureMapDef): number {
    // Default estimate: 1024x1024 RGBA = 4MB, with mipmaps = ~5.3MB
    return 5.3 * 1024 * 1024;
  }

  private measureTextureVRAM(texture: THREE.Texture): number {
    if (!texture.image) return 0;
    const w = texture.image.width || 1024;
    const h = texture.image.height || 1024;
    const bytesPerPixel = 4; // RGBA
    const mipmapFactor = texture.generateMipmaps ? 1.33 : 1.0;
    return w * h * bytesPerPixel * mipmapFactor;
  }

  // ===========================================================================
  // GALLERY LAYOUT — position calculation
  // ===========================================================================

  /**
   * Calculate the 3D position of a preview sphere in the gallery
   */
  private calculatePosition(index: number, total: number): THREE.Vector3 {
    const { columns, spacing, heightOffset, viewDistance, arcAngle } = this.layout;

    switch (this.layout.type) {
      case 'arc': {
        const angleRad = THREE.MathUtils.degToRad(arcAngle ?? 120);
        const row = Math.floor(index / columns);
        const col = index % columns;
        const totalCols = Math.min(total, columns);

        // Distribute evenly across the arc
        const t = totalCols > 1 ? col / (totalCols - 1) : 0.5;
        const angle = -angleRad / 2 + t * angleRad;

        const x = Math.sin(angle) * viewDistance;
        const z = -Math.cos(angle) * viewDistance;
        const y = heightOffset - row * spacing;

        return new THREE.Vector3(x, y, z);
      }

      case 'carousel': {
        const angleStep = (2 * Math.PI) / Math.min(total, columns);
        const angle = index * angleStep;
        const x = Math.sin(angle) * viewDistance;
        const z = -Math.cos(angle) * viewDistance;
        const y = heightOffset;

        return new THREE.Vector3(x, y, z);
      }

      case 'grid':
      default: {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const totalCols = Math.min(total, columns);

        const x = (col - (totalCols - 1) / 2) * spacing;
        const y = heightOffset - row * spacing;
        const z = -viewDistance;

        return new THREE.Vector3(x, y, z);
      }
    }
  }

  // ===========================================================================
  // LABEL CREATION — minimal sprite labels
  // ===========================================================================

  private createLabel(name: string, type: HoloMaterialType): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, 256, 64);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Truncate long names
      const displayName = name.length > 16 ? name.slice(0, 15) + '...' : name;
      ctx.fillText(displayName, 128, 8);

      // Type indicator
      ctx.fillStyle = this.getTypeColor(type);
      ctx.font = '14px monospace';
      ctx.fillText(type.replace('_', ' '), 128, 36);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.6, 0.15, 1);
    return sprite;
  }

  private getTypeColor(type: HoloMaterialType): string {
    const colors: Record<HoloMaterialType, string> = {
      material: '#88ccff',
      pbr_material: '#88ff88',
      unlit_material: '#ffff88',
      shader: '#ff88ff',
      toon_material: '#ff8888',
      glass_material: '#88ffff',
      subsurface_material: '#ffbb88',
    };
    return colors[type] ?? '#cccccc';
  }

  // ===========================================================================
  // UPDATE LOOP — called every frame, must stay under 2ms
  // ===========================================================================

  /**
   * Per-frame update. Call from the render loop.
   * Budget: < 2ms to leave ~9ms for the renderer itself.
   */
  update(deltaTimeMs: number, camera: THREE.Camera): void {
    // Track frame metrics
    this.frameTimeAccumulator += deltaTimeMs;
    this.frameCount++;
    if (performance.now() - this.lastMetricsUpdate > 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.frameTimeAccumulator = 0;
      this.lastMetricsUpdate = performance.now();
    }

    // 1. Frustum culling — hide spheres outside camera view
    this.updateVisibility(camera);

    // 2. LOD update — swap geometry detail based on distance
    this.updateLOD(camera);

    // 3. Animation — gentle rotation on focused sphere
    this.updateAnimation(deltaTimeMs);

    // 4. Adaptive quality — degrade if falling below 90fps
    if (this.currentFPS < 85) {
      this.degradeQuality();
    } else if (this.currentFPS > 88) {
      this.restoreQuality();
    }
  }

  /**
   * Frustum culling — only render visible preview spheres
   */
  private updateVisibility(camera: THREE.Camera): void {
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(
      (camera as THREE.PerspectiveCamera).projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);

    let visibleCount = 0;
    for (const [_name, state] of this.previews) {
      if (!state.mesh) continue;

      const inFrustum = frustum.intersectsObject(state.mesh);
      const withinBudget = visibleCount < this.config.maxVisiblePreviews;

      state.mesh.visible = inFrustum && withinBudget;
      if (state.label) {
        state.label.visible = state.mesh.visible;
      }

      if (state.mesh.visible) {
        visibleCount++;
      }
    }
  }

  /**
   * LOD update — swap sphere geometry based on distance to camera
   */
  private updateLOD(camera: THREE.Camera): void {
    const cameraPos = camera.position;

    for (const [_name, state] of this.previews) {
      if (!state.mesh || !state.mesh.visible) continue;

      const distance = cameraPos.distanceTo(state.mesh.position);

      if (distance < 2) {
        // Close — use high-detail sphere
        if (state.mesh.geometry !== this.getGeometry('focused')) {
          state.mesh.geometry = this.getGeometry('focused');
        }
      } else if (distance < 6) {
        // Medium distance — gallery detail
        if (state.mesh.geometry !== this.getGeometry('gallery')) {
          state.mesh.geometry = this.getGeometry('gallery');
        }
      } else {
        // Far away — minimal detail
        if (state.mesh.geometry !== this.getGeometry('distant')) {
          state.mesh.geometry = this.getGeometry('distant');
        }
      }
    }
  }

  /**
   * Gentle rotation animation on focused preview
   */
  private updateAnimation(deltaTimeMs: number): void {
    for (const [name, state] of this.previews) {
      if (!state.mesh) continue;

      if (name === this.focusedPreview) {
        // Slowly rotate focused sphere to showcase material
        state.mesh.rotation.y += deltaTimeMs * 0.001;
      }
    }
  }

  // ===========================================================================
  // ADAPTIVE QUALITY — maintain 90fps budget
  // ===========================================================================

  private degradeQuality(): void {
    // Strategy: reduce visible previews, then reduce sphere detail
    if (this.config.maxVisiblePreviews > 5) {
      this.config.maxVisiblePreviews -= 2;
      logger.debug('[VRMaterialPreviewSystem] Degrading: reducing visible previews', {
        maxVisible: this.config.maxVisiblePreviews,
      });
    }
  }

  private restoreQuality(): void {
    const originalMax = 20;
    if (this.config.maxVisiblePreviews < originalMax) {
      this.config.maxVisiblePreviews += 1;
    }
  }

  // ===========================================================================
  // INTERACTION — VR ray selection
  // ===========================================================================

  /**
   * Cast a ray to select a material preview sphere.
   * Call with the VR controller's ray origin and direction.
   */
  selectWithRay(origin: THREE.Vector3, direction: THREE.Vector3): MaterialDefinition | null {
    if (!this.config.enableInteraction) return null;

    this.raycaster.set(origin, direction);
    const intersects = this.raycaster.intersectObjects(this.interactionTargets, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const materialName = hit.userData.materialName as string;

      // Update focus state
      this.setFocused(materialName);

      const state = this.previews.get(materialName);
      return state?.definition ?? null;
    }

    // No hit — clear focus
    this.setFocused(null);
    return null;
  }

  /**
   * Set which preview is currently focused
   */
  private setFocused(name: string | null): void {
    // Un-focus previous
    if (this.focusedPreview) {
      const prev = this.previews.get(this.focusedPreview);
      if (prev) {
        prev.focused = false;
        if (prev.mesh) {
          // Reset scale
          prev.mesh.scale.setScalar(1.0);
        }
      }
    }

    this.focusedPreview = name;

    // Focus new
    if (name) {
      const state = this.previews.get(name);
      if (state) {
        state.focused = true;
        if (state.mesh) {
          // Slightly enlarge focused sphere
          state.mesh.scale.setScalar(1.2);
        }
      }
    }
  }

  // ===========================================================================
  // PUBLIC API — Material management
  // ===========================================================================

  /**
   * Add a single material to the gallery
   */
  async addMaterial(definition: MaterialDefinition): Promise<void> {
    const index = this.previews.size;
    const position = this.calculatePosition(index, index + 1);

    const state: PreviewState = {
      definition,
      material: null,
      mesh: null,
      label: null,
      ready: false,
      focused: false,
      textureProgress: 0,
      vramBytes: 0,
    };

    const mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> = new THREE.Mesh(
      this.getGeometry('gallery'),
      this.placeholderMaterial,
    );
    mesh.position.copy(position);
    mesh.name = `preview_${definition.name}`;
    mesh.userData.materialName = definition.name;
    mesh.frustumCulled = true;

    state.mesh = mesh;
    this.galleryRoot.add(mesh);
    this.interactionTargets.push(mesh);

    state.label = this.createLabel(definition.name, definition.type);
    state.label.position.copy(position);
    state.label.position.y -= 0.5;
    this.galleryRoot.add(state.label);

    this.previews.set(definition.name, state);

    // Compile asynchronously
    try {
      const material = await this.compileMaterial(definition);
      state.material = material;
      state.ready = true;
      mesh.material = material;
    } catch (error) {
      logger.warn('[VRMaterialPreviewSystem] Failed to add material', {
        name: definition.name,
      });
    }
  }

  /**
   * Remove a material from the gallery
   */
  removeMaterial(name: string): void {
    const state = this.previews.get(name);
    if (!state) return;

    if (state.mesh) {
      this.galleryRoot.remove(state.mesh);
      const idx = this.interactionTargets.indexOf(state.mesh);
      if (idx >= 0) this.interactionTargets.splice(idx, 1);
      state.mesh.geometry?.dispose();
      (state.mesh.material as THREE.Material)?.dispose();
    }
    if (state.label) {
      this.galleryRoot.remove(state.label);
      (state.label.material as THREE.SpriteMaterial).map?.dispose();
      (state.label.material as THREE.SpriteMaterial).dispose();
    }

    this.previews.delete(name);

    if (this.focusedPreview === name) {
      this.focusedPreview = null;
    }
  }

  /**
   * Get the currently focused material definition
   */
  getFocusedMaterial(): MaterialDefinition | null {
    if (!this.focusedPreview) return null;
    return this.previews.get(this.focusedPreview)?.definition ?? null;
  }

  /**
   * Get all loaded material definitions
   */
  getMaterials(): MaterialDefinition[] {
    return Array.from(this.previews.values()).map(s => s.definition);
  }

  /**
   * Get the gallery root group (for positioning in the scene)
   */
  getGalleryRoot(): THREE.Group {
    return this.galleryRoot;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): VRPreviewMetrics {
    const renderer = this.scene.userData.renderer as THREE.WebGLRenderer | undefined;
    const info = renderer?.info;

    return {
      fps: this.currentFPS,
      frameTimeMs: this.currentFPS > 0 ? 1000 / this.currentFPS : 0,
      materialsLoaded: Array.from(this.previews.values()).filter(s => s.ready).length,
      texturesInVRAM: this.textureCache.size,
      vramUsageMB: this.textureVRAMBytes / (1024 * 1024),
      drawCalls: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      withinBudget: this.currentFPS >= 88,
    };
  }

  /**
   * Set gallery layout and reposition all spheres
   */
  setLayout(layout: Partial<GalleryLayout>): void {
    this.layout = { ...this.layout, ...layout };
    this.repositionAll();
  }

  /**
   * Reposition all previews according to current layout
   */
  private repositionAll(): void {
    const entries = Array.from(this.previews.entries());
    const total = entries.length;

    entries.forEach(([_name, state], index) => {
      const position = this.calculatePosition(index, total);
      if (state.mesh) {
        state.mesh.position.copy(position);
      }
      if (state.label) {
        state.label.position.copy(position);
        state.label.position.y -= 0.5;
      }
    });
  }

  /**
   * Update the environment map for reflections
   */
  setEnvironmentMap(envMap: THREE.Texture): void {
    this.config.envMap = envMap;
    this.materialFactory.setEnvironmentMap(envMap);

    // Update all physical materials
    for (const [_name, state] of this.previews) {
      if (state.material && state.material instanceof THREE.MeshStandardMaterial) {
        state.material.envMap = envMap;
        state.material.needsUpdate = true;
      }
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Dispose all preview meshes and materials
    for (const [name] of this.previews) {
      this.removeMaterial(name);
    }

    // Dispose geometry pool
    for (const geometry of this.geometryPool.values()) {
      geometry.dispose();
    }
    this.geometryPool.clear();

    // Dispose texture cache
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
    this.textureVRAMBytes = 0;

    // Dispose placeholder
    this.placeholderMaterial.dispose();

    // Remove gallery from scene
    this.scene.remove(this.galleryRoot);

    logger.info('[VRMaterialPreviewSystem] Disposed');
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a VR Material Preview System
 */
export function createVRMaterialPreviewSystem(
  scene: THREE.Scene,
  camera: THREE.Camera,
  config: VRMaterialPreviewConfig,
): VRMaterialPreviewSystem {
  return new VRMaterialPreviewSystem(scene, camera, config);
}
