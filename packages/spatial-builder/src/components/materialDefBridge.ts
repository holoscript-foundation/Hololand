/**
 * materialDefBridge.ts
 *
 * Bidirectional conversion between the spatial-builder's SceneMaterial
 * (hex-string colors, flat structure) and @holoscript/core's MaterialDef
 * (linear RGBA objects, full PBR definition).
 *
 * This bridge lets the MaterialInspector work natively with MaterialDef
 * while the scene editor continues to use its simpler SceneMaterial type.
 */

import type { SceneMaterial } from '../scene-editor/types';

// ---------------------------------------------------------------------------
// MaterialDef types (mirrored from @holoscript/core to avoid hard dependency)
// ---------------------------------------------------------------------------

export type BlendMode = 'opaque' | 'transparent' | 'additive' | 'multiply';
export type CullMode = 'none' | 'front' | 'back';
export type MaterialType =
  | 'standard'
  | 'physical'
  | 'basic'
  | 'emissive'
  | 'toon'
  | 'glass'
  | 'metal';

export interface TextureSlot {
  textureId: string;
  uvChannel: number;
  tiling: { x: number; y: number };
  offset: { x: number; y: number };
}

/**
 * Full PBR material definition.
 * Mirrors the canonical MaterialDef from @holoscript/core/rendering/MaterialLibrary.
 */
export interface MaterialDef {
  id: string;
  name: string;
  materialType?: MaterialType;
  albedo: { r: number; g: number; b: number; a: number };
  metallic: number;
  roughness: number;
  emission: { r: number; g: number; b: number };
  emissionStrength: number;
  normalScale: number;
  aoStrength: number;
  albedoMap?: TextureSlot;
  normalMap?: TextureSlot;
  metallicRoughnessMap?: TextureSlot;
  emissionMap?: TextureSlot;
  aoMap?: TextureSlot;
  blendMode: BlendMode;
  cullMode: CullMode;
  depthWrite: boolean;
  depthTest: boolean;
  doubleSided: boolean;
  shaderGraphId?: string;
  customUniforms?: Record<string, number | number[]>;
  properties?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Color conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert hex (#RRGGBB or #RRGGBBAA) to linear RGBA (0-1 per channel).
 */
export function hexToRGBA(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const a = clean.length >= 8 ? parseInt(clean.substring(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/**
 * Convert linear RGBA (0-1) to hex string (#RRGGBB).
 */
export function rgbaToHex(color: { r: number; g: number; b: number; a?: number }): string {
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

// ---------------------------------------------------------------------------
// Default factory
// ---------------------------------------------------------------------------

/**
 * Create a default MaterialDef with sensible PBR defaults.
 */
export function createDefaultMaterialDef(
  id: string,
  name?: string,
  materialType?: MaterialType,
): MaterialDef {
  return {
    id,
    name: name ?? id,
    materialType: materialType ?? 'standard',
    albedo: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
    metallic: 0,
    roughness: 0.5,
    emission: { r: 0, g: 0, b: 0 },
    emissionStrength: 0,
    normalScale: 1,
    aoStrength: 1,
    blendMode: 'opaque',
    cullMode: 'back',
    depthWrite: true,
    depthTest: true,
    doubleSided: false,
  };
}

// ---------------------------------------------------------------------------
// Preset materials (subset from @holoscript/core)
// ---------------------------------------------------------------------------

export const MATERIAL_PRESETS: Record<string, Partial<MaterialDef> & { name: string }> = {
  metal: {
    name: 'Metal',
    materialType: 'metal',
    metallic: 0.9,
    roughness: 0.2,
    albedo: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
  },
  wood: {
    name: 'Wood',
    materialType: 'standard',
    metallic: 0,
    roughness: 0.7,
    albedo: { r: 0.55, g: 0.35, b: 0.15, a: 1 },
  },
  glass: {
    name: 'Glass',
    materialType: 'glass',
    metallic: 0,
    roughness: 0.05,
    albedo: { r: 0.9, g: 0.95, b: 1, a: 0.3 },
    blendMode: 'transparent',
    doubleSided: true,
  },
  plastic: {
    name: 'Plastic',
    materialType: 'physical',
    metallic: 0,
    roughness: 0.4,
    albedo: { r: 1, g: 0.2, b: 0.2, a: 1 },
  },
  emissive: {
    name: 'Emissive',
    materialType: 'emissive',
    metallic: 0,
    roughness: 1,
    albedo: { r: 0, g: 0, b: 0, a: 1 },
    emission: { r: 0.3, g: 0.7, b: 1 },
    emissionStrength: 5,
  },
  ground: {
    name: 'Ground',
    materialType: 'standard',
    metallic: 0,
    roughness: 0.9,
    albedo: { r: 0.35, g: 0.3, b: 0.2, a: 1 },
  },
  gold: {
    name: 'Gold',
    materialType: 'metal',
    metallic: 1.0,
    roughness: 0.15,
    albedo: { r: 1.0, g: 0.843, b: 0.0, a: 1 },
  },
  copper: {
    name: 'Copper',
    materialType: 'metal',
    metallic: 1.0,
    roughness: 0.25,
    albedo: { r: 0.722, g: 0.451, b: 0.2, a: 1 },
  },
  ceramic: {
    name: 'Ceramic',
    materialType: 'physical',
    metallic: 0,
    roughness: 0.3,
    albedo: { r: 0.941, g: 0.941, b: 0.941, a: 1 },
  },
  rubber: {
    name: 'Rubber',
    materialType: 'standard',
    metallic: 0,
    roughness: 0.8,
    albedo: { r: 0.2, g: 0.2, b: 0.2, a: 1 },
  },
  neon: {
    name: 'Neon',
    materialType: 'emissive',
    albedo: { r: 0, g: 1, b: 0, a: 1 },
    emission: { r: 0, g: 1, b: 0 },
    emissionStrength: 2.0,
  },
};

// ---------------------------------------------------------------------------
// Bidirectional conversion
// ---------------------------------------------------------------------------

/**
 * Convert a spatial-builder SceneMaterial to a full MaterialDef.
 * Missing fields receive sensible defaults.
 */
export function sceneMaterialToMaterialDef(
  sceneMat: SceneMaterial,
  id?: string,
  name?: string,
): MaterialDef {
  const albedo = hexToRGBA(sceneMat.color);
  albedo.a = sceneMat.opacity;

  const emission = hexToRGBA(sceneMat.emissive);

  const blendMode: BlendMode =
    sceneMat.transparent || sceneMat.opacity < 1 ? 'transparent' : 'opaque';

  return {
    id: id ?? `scene_mat_${Date.now()}`,
    name: name ?? 'Scene Material',
    materialType: 'standard',
    albedo,
    metallic: sceneMat.metalness,
    roughness: sceneMat.roughness,
    emission: { r: emission.r, g: emission.g, b: emission.b },
    emissionStrength: sceneMat.emissiveIntensity,
    normalScale: 1,
    aoStrength: 1,
    blendMode,
    cullMode: 'back',
    depthWrite: true,
    depthTest: true,
    doubleSided: false,
  };
}

/**
 * Convert a MaterialDef back to a SceneMaterial for the scene editor.
 */
export function materialDefToSceneMaterial(def: MaterialDef): SceneMaterial {
  return {
    color: rgbaToHex(def.albedo),
    metalness: def.metallic,
    roughness: def.roughness,
    emissive: rgbaToHex(def.emission),
    emissiveIntensity: def.emissionStrength,
    opacity: def.albedo.a,
    transparent: def.blendMode === 'transparent' || def.albedo.a < 1,
    wireframe: false,
  };
}
