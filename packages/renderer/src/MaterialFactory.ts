/**
 * MaterialFactory
 *
 * Creates materials based on quality settings.
 * Provides presets for common material types and PBR workflows.
 */

import * as THREE from 'three';
import type { QualitySettings } from './types';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface MaterialOptions {
  // Base properties
  color?: number | string;
  opacity?: number;
  transparent?: boolean;
  side?: THREE.Side;

  // PBR properties
  metalness?: number;
  roughness?: number;
  emissive?: number | string;
  emissiveIntensity?: number;

  // Physical material properties (high/ultra quality)
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  sheen?: number;
  sheenColor?: number | string;
  sheenRoughness?: number;
  iridescence?: number;
  iridescenceIOR?: number;

  // Textures
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  normalScale?: { x: number; y: number };
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  aoMapIntensity?: number;
  emissiveMap?: THREE.Texture;
  displacementMap?: THREE.Texture;
  displacementScale?: number;

  // Environment
  envMap?: THREE.Texture;
  envMapIntensity?: number;

  // Other
  flatShading?: boolean;
  wireframe?: boolean;
}

export type MaterialPreset =
  | 'plastic'
  | 'rubber'
  | 'metal'
  | 'chrome'
  | 'gold'
  | 'copper'
  | 'glass'
  | 'crystal'
  | 'wood'
  | 'fabric'
  | 'leather'
  | 'skin'
  | 'water'
  | 'emissive'
  | 'hologram';

// =============================================================================
// PRESET DEFINITIONS
// =============================================================================

const MATERIAL_PRESETS: Record<MaterialPreset, Partial<MaterialOptions>> = {
  plastic: {
    metalness: 0,
    roughness: 0.4,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
  },
  rubber: {
    metalness: 0,
    roughness: 0.9,
  },
  metal: {
    metalness: 1.0,
    roughness: 0.3,
  },
  chrome: {
    metalness: 1.0,
    roughness: 0.05,
    color: 0xcccccc,
  },
  gold: {
    metalness: 1.0,
    roughness: 0.2,
    color: 0xffd700,
  },
  copper: {
    metalness: 1.0,
    roughness: 0.25,
    color: 0xb87333,
  },
  glass: {
    metalness: 0,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 0.5,
    ior: 1.5,
    transparent: true,
    opacity: 0.3,
  },
  crystal: {
    metalness: 0,
    roughness: 0,
    transmission: 0.9,
    thickness: 1.0,
    ior: 2.4,
    transparent: true,
    opacity: 0.5,
    iridescence: 1.0,
    iridescenceIOR: 1.3,
  },
  wood: {
    metalness: 0,
    roughness: 0.7,
  },
  fabric: {
    metalness: 0,
    roughness: 0.95,
    sheen: 1.0,
    sheenRoughness: 0.8,
  },
  leather: {
    metalness: 0,
    roughness: 0.6,
    sheen: 0.3,
    sheenRoughness: 0.4,
  },
  skin: {
    metalness: 0,
    roughness: 0.5,
    // Would need subsurface scattering for realistic skin
  },
  water: {
    metalness: 0,
    roughness: 0.1,
    transmission: 0.95,
    thickness: 2.0,
    ior: 1.33,
    transparent: true,
    opacity: 0.6,
    color: 0x0077be,
  },
  emissive: {
    metalness: 0,
    roughness: 1.0,
    emissiveIntensity: 2.0,
  },
  hologram: {
    metalness: 0.5,
    roughness: 0.1,
    transmission: 0.5,
    transparent: true,
    opacity: 0.7,
    emissiveIntensity: 0.5,
    iridescence: 1.0,
    iridescenceIOR: 2.0,
  },
};

// =============================================================================
// MATERIAL FACTORY CLASS
// =============================================================================

export class MaterialFactory {
  private qualitySettings: QualitySettings;
  private envMap: THREE.Texture | null = null;

  constructor(qualitySettings: QualitySettings) {
    this.qualitySettings = qualitySettings;
    logger.info('[MaterialFactory] Created');
  }

  /**
   * Create a material based on quality settings
   */
  create(options: MaterialOptions = {}): THREE.Material {
    switch (this.qualitySettings.materialType) {
      case 'basic':
        return this.createBasicMaterial(options);
      case 'standard':
        return this.createStandardMaterial(options);
      case 'physical':
        return this.createPhysicalMaterial(options);
      default:
        return this.createStandardMaterial(options);
    }
  }

  /**
   * Create a material from a preset
   */
  createFromPreset(preset: MaterialPreset, overrides: MaterialOptions = {}): THREE.Material {
    const presetOptions = MATERIAL_PRESETS[preset];
    const mergedOptions: MaterialOptions = { ...presetOptions, ...overrides };

    // Set emissive color for emissive preset
    if (preset === 'emissive' && !mergedOptions.emissive) {
      mergedOptions.emissive = mergedOptions.color || 0xffffff;
    }

    return this.create(mergedOptions);
  }

  /**
   * Create basic material (low quality)
   */
  private createBasicMaterial(options: MaterialOptions): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: options.color ?? 0xffffff,
      opacity: options.opacity ?? 1.0,
      transparent: options.transparent ?? false,
      side: options.side ?? THREE.FrontSide,
      map: options.map,
      wireframe: options.wireframe ?? false,
    });
  }

  /**
   * Create standard PBR material (medium quality)
   */
  private createStandardMaterial(options: MaterialOptions): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: options.color ?? 0xffffff,
      metalness: options.metalness ?? 0.0,
      roughness: options.roughness ?? 0.5,
      opacity: options.opacity ?? 1.0,
      transparent: options.transparent ?? false,
      side: options.side ?? THREE.FrontSide,
      flatShading: options.flatShading ?? false,
      wireframe: options.wireframe ?? false,

      // Textures
      map: options.map,
      normalMap: options.normalMap,
      roughnessMap: options.roughnessMap,
      metalnessMap: options.metalnessMap,
      aoMap: options.aoMap,
      aoMapIntensity: options.aoMapIntensity ?? 1.0,
      emissiveMap: options.emissiveMap,
      displacementMap: options.displacementMap,
      displacementScale: options.displacementScale ?? 1.0,

      // Emissive
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 1.0,

      // Environment
      envMap: options.envMap || this.envMap,
      envMapIntensity: this.qualitySettings.hdriEnvironment
        ? (options.envMapIntensity ?? 1.0)
        : 0,
    });

    // Set normal scale if provided
    if (options.normalScale) {
      material.normalScale.set(options.normalScale.x, options.normalScale.y);
    }

    return material;
  }

  /**
   * Create physical material (high/ultra quality)
   */
  private createPhysicalMaterial(options: MaterialOptions): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
      color: options.color ?? 0xffffff,
      metalness: options.metalness ?? 0.0,
      roughness: options.roughness ?? 0.5,
      opacity: options.opacity ?? 1.0,
      transparent: options.transparent ?? false,
      side: options.side ?? THREE.FrontSide,
      flatShading: options.flatShading ?? false,
      wireframe: options.wireframe ?? false,

      // Textures
      map: options.map,
      normalMap: options.normalMap,
      roughnessMap: options.roughnessMap,
      metalnessMap: options.metalnessMap,
      aoMap: options.aoMap,
      aoMapIntensity: options.aoMapIntensity ?? 1.0,
      emissiveMap: options.emissiveMap,
      displacementMap: options.displacementMap,
      displacementScale: options.displacementScale ?? 1.0,

      // Emissive
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 1.0,

      // Environment
      envMap: options.envMap || this.envMap,
      envMapIntensity: this.qualitySettings.hdriEnvironment
        ? (options.envMapIntensity ?? 1.0)
        : 0,

      // Physical properties
      clearcoat: options.clearcoat ?? 0,
      clearcoatRoughness: options.clearcoatRoughness ?? 0,
      transmission: options.transmission ?? 0,
      thickness: options.thickness ?? 0,
      ior: options.ior ?? 1.5,
      sheen: options.sheen ?? 0,
      sheenColor: options.sheenColor ?? 0xffffff,
      sheenRoughness: options.sheenRoughness ?? 1.0,
      iridescence: options.iridescence ?? 0,
      iridescenceIOR: options.iridescenceIOR ?? 1.3,
    });

    // Set normal scale if provided
    if (options.normalScale) {
      material.normalScale.set(options.normalScale.x, options.normalScale.y);
    }

    return material;
  }

  /**
   * Set environment map for all new materials
   */
  setEnvironmentMap(envMap: THREE.Texture | null): void {
    this.envMap = envMap;
  }

  /**
   * Update quality settings
   */
  setQualitySettings(settings: QualitySettings): void {
    this.qualitySettings = settings;
  }

  /**
   * Upgrade material to current quality level
   */
  upgradeMaterial(material: THREE.Material): THREE.Material {
    if (!(material instanceof THREE.MeshStandardMaterial)) {
      return material; // Can't upgrade non-standard materials easily
    }

    if (this.qualitySettings.materialType === 'physical' &&
        !(material instanceof THREE.MeshPhysicalMaterial)) {
      // Convert to physical material
      const physical = new THREE.MeshPhysicalMaterial();

      // Copy standard properties
      physical.color.copy(material.color);
      physical.metalness = material.metalness;
      physical.roughness = material.roughness;
      physical.map = material.map;
      physical.normalMap = material.normalMap;
      physical.normalScale.copy(material.normalScale);
      physical.roughnessMap = material.roughnessMap;
      physical.metalnessMap = material.metalnessMap;
      physical.aoMap = material.aoMap;
      physical.aoMapIntensity = material.aoMapIntensity;
      physical.emissive.copy(material.emissive);
      physical.emissiveIntensity = material.emissiveIntensity;
      physical.emissiveMap = material.emissiveMap;
      physical.envMap = material.envMap || this.envMap;
      physical.envMapIntensity = this.qualitySettings.hdriEnvironment ? material.envMapIntensity : 0;
      physical.opacity = material.opacity;
      physical.transparent = material.transparent;
      physical.side = material.side;

      return physical;
    }

    // Just update environment settings
    material.envMap = material.envMap || this.envMap;
    material.envMapIntensity = this.qualitySettings.hdriEnvironment
      ? (material.envMapIntensity || 1.0)
      : 0;

    return material;
  }

  /**
   * Create a color gradient material (for stylized looks)
   */
  createGradientMaterial(
    topColor: number | string,
    bottomColor: number | string,
    direction: 'vertical' | 'horizontal' = 'vertical'
  ): THREE.ShaderMaterial {
    const top = new THREE.Color(topColor);
    const bottom = new THREE.Color(bottomColor);

    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: top },
        bottomColor: { value: bottom },
        direction: { value: direction === 'vertical' ? 0 : 1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform int direction;
        varying vec2 vUv;
        void main() {
          float t = direction == 0 ? vUv.y : vUv.x;
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
      `,
    });
  }

  /**
   * Create toon/cel-shaded material
   */
  createToonMaterial(color: number | string, steps: number = 3): THREE.MeshToonMaterial {
    // Create gradient map for toon shading
    const colors = new Uint8Array(steps);
    for (let i = 0; i < steps; i++) {
      colors[i] = Math.floor((i / (steps - 1)) * 255);
    }

    const gradientMap = new THREE.DataTexture(colors, steps, 1, THREE.RedFormat);
    gradientMap.needsUpdate = true;

    return new THREE.MeshToonMaterial({
      color: new THREE.Color(color),
      gradientMap,
    });
  }

  /**
   * Get list of available presets
   */
  static getPresets(): MaterialPreset[] {
    return Object.keys(MATERIAL_PRESETS) as MaterialPreset[];
  }

  /**
   * Get preset options for reference
   */
  static getPresetOptions(preset: MaterialPreset): Partial<MaterialOptions> {
    return { ...MATERIAL_PRESETS[preset] };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a material factory
 */
export function createMaterialFactory(qualitySettings: QualitySettings): MaterialFactory {
  return new MaterialFactory(qualitySettings);
}
