/**
 * MaterialsValidator
 *
 * Validator #2 of the 3-validator cross-validation protocol.
 * Ground-truth oracle: @holoscript/core MaterialTrait schemas.
 *
 * Validates all material-related state deltas against the canonical
 * material type system defined in HoloScript:
 *   - MaterialType enum validation (pbr, standard, unlit, transparent, volumetric, custom, neural)
 *   - PBR property ranges (metallic 0-1, roughness 0-1, etc.)
 *   - Texture channel names (16 valid channels from MaterialTrait)
 *   - Volumetric material property validation
 *   - Blend mode validation
 *   - Advanced PBR (subsurface, sheen, clearcoat, iridescence) range validation
 *   - Color component validation (r,g,b 0-1 linear space)
 *
 * @module MaterialsValidator
 * @version 1.0.0
 */

import type {
  Validator,
  ValidatorId,
  ValidationResult,
  ValidationViolation,
  StateDelta,
  MaterialDeltaPayload,
  CompositeDeltaPayload,
} from './CrossValidationTypes';

// =============================================================================
// GROUND-TRUTH CONSTANTS (from @holoscript/core MaterialTrait)
// =============================================================================

/**
 * Valid material types from @holoscript/core MaterialTrait.MaterialType
 */
const VALID_MATERIAL_TYPES = new Set([
  'pbr',
  'standard',
  'unlit',
  'transparent',
  'volumetric',
  'custom',
  'neural',
]);

/**
 * Valid HoloMaterialType from @holoscript/core MaterialTypes.ts
 */
const VALID_HOLO_MATERIAL_TYPES = new Set([
  'material',
  'pbr_material',
  'unlit_material',
  'shader',
  'toon_material',
  'glass_material',
  'subsurface_material',
]);

/**
 * Valid texture channels from @holoscript/core MaterialTrait.TextureChannel
 */
const VALID_TEXTURE_CHANNELS = new Set([
  'baseColor',
  'normalMap',
  'roughnessMap',
  'metallicMap',
  'ambientOcclusionMap',
  'emissionMap',
  'heightMap',
  'coatNormalMap',
  'specularColorMap',
  'detailNormalMap',
  'displacementMap',
  'glintMap',
  'sheenColorMap',
  'anisotropyDirectionMap',
  'subsurfaceThicknessMap',
  'weatheringMaskMap',
  // Also accept grammar-level texture channels from MaterialTypes.ts
  'albedo_map',
  'normal_map',
  'roughness_map',
  'metallic_map',
  'emission_map',
  'ao_map',
  'height_map',
  'opacity_map',
  'displacement_map',
  'specular_map',
  'clearcoat_map',
  'baseColor_map',
  'emissive_map',
  'transmission_map',
  'sheen_map',
  'anisotropy_map',
  'thickness_map',
  'subsurface_map',
  'iridescence_map',
]);

/**
 * Valid blend modes from @holoscript/core MaterialTrait.MaterialConfig
 */
const VALID_BLEND_MODES = new Set(['opaque', 'blend', 'additive', 'multiply']);

/**
 * Valid volumetric volume types from @holoscript/core MaterialTrait.VolumetricMaterial
 */
const VALID_VOLUME_TYPES = new Set([
  'fog',
  'smoke',
  'fire',
  'clouds',
  'dust',
  'mist',
  'steam',
  'aurora',
  'nebula',
  'underwater',
  'god_rays',
  'neon_gas',
]);

// =============================================================================
// MATERIALS VALIDATOR
// =============================================================================

/**
 * Validates material state deltas against @holoscript/core material schemas.
 *
 * Enforces:
 *   - Valid material types
 *   - PBR property ranges (metallic, roughness, emission intensity, IOR, transmission)
 *   - Color component ranges (linear space 0-1)
 *   - Texture channel validity
 *   - Blend mode validity
 *   - Volumetric property ranges
 *   - Advanced PBR parameter ranges (subsurface, sheen, clearcoat, iridescence)
 */
export class MaterialsValidator implements Validator {
  readonly id: ValidatorId = 'materials';
  readonly name = 'Materials Schema Oracle';

  /**
   * Validate a state delta against material schemas.
   *
   * Routes:
   *   - material: Full material property validation
   *   - composite: Validates each sub-delta
   *   - physics/transform/trait/world: Accepted (not materials domain)
   */
  validate(delta: StateDelta): ValidationResult {
    const start = performance.now();
    const violations: ValidationViolation[] = [];

    switch (delta.payload.type) {
      case 'material':
        this.validateMaterialPayload(delta.payload, violations);
        break;

      case 'composite':
        this.validateCompositePayload(delta.payload, violations);
        break;

      case 'physics':
      case 'transform':
      case 'trait':
      case 'world':
        // Not in materials domain — accept by default
        break;
    }

    const durationMs = performance.now() - start;
    const hasErrors = violations.some((v) => v.severity === 'error');

    return {
      validatorId: this.id,
      verdict: hasErrors ? 'reject' : 'accept',
      reason: hasErrors
        ? `Material schema violation: ${violations.filter((v) => v.severity === 'error').length} constraint(s) violated`
        : 'All material properties conform to @holoscript/core schemas',
      violations,
      durationMs,
      deltaId: delta.id,
    };
  }

  // ---- Material payload validation -----------------------------------------

  private validateMaterialPayload(
    payload: MaterialDeltaPayload,
    violations: ValidationViolation[]
  ): void {
    // Material type
    if (payload.materialType !== undefined) {
      if (
        !VALID_MATERIAL_TYPES.has(payload.materialType) &&
        !VALID_HOLO_MATERIAL_TYPES.has(payload.materialType)
      ) {
        violations.push({
          property: 'materialType',
          proposedValue: payload.materialType,
          constraint: 'validMaterialType',
          bound: [...VALID_MATERIAL_TYPES],
          severity: 'error',
          suggestion: `Invalid material type "${payload.materialType}". Valid types: ${[...VALID_MATERIAL_TYPES].join(', ')}`,
        });
      }
    }

    // Base color (linear space 0-1)
    if (payload.baseColor) {
      this.validateColorRange('baseColor', payload.baseColor, violations);
    }

    // Metallic (0-1)
    if (payload.metallic !== undefined) {
      this.validateUnitRange('metallic', payload.metallic, violations);
    }

    // Roughness (0-1)
    if (payload.roughness !== undefined) {
      this.validateUnitRange('roughness', payload.roughness, violations);
    }

    // Emission
    if (payload.emission) {
      this.validateColorRange('emission.color', payload.emission.color, violations);
      if (payload.emission.intensity !== undefined) {
        if (!Number.isFinite(payload.emission.intensity) || payload.emission.intensity < 0) {
          violations.push({
            property: 'emission.intensity',
            proposedValue: payload.emission.intensity,
            constraint: 'nonNegativeFinite',
            severity: 'error',
            suggestion: 'Emission intensity must be a non-negative finite number',
          });
        } else if (payload.emission.intensity > 100) {
          violations.push({
            property: 'emission.intensity',
            proposedValue: payload.emission.intensity,
            constraint: 'maxEmissionIntensity',
            bound: 100,
            severity: 'warning',
            suggestion: 'Emission intensity > 100 may cause bloom overflow',
          });
        }
      }
    }

    // IOR (Index of Refraction)
    if (payload.ior !== undefined) {
      if (!Number.isFinite(payload.ior)) {
        violations.push({
          property: 'ior',
          proposedValue: payload.ior,
          constraint: 'finite',
          severity: 'error',
          suggestion: 'IOR must be a finite number',
        });
      } else if (payload.ior < 1.0 || payload.ior > 5.0) {
        violations.push({
          property: 'ior',
          proposedValue: payload.ior,
          constraint: 'iorRange',
          bound: [1.0, 5.0],
          severity: payload.ior < 1.0 ? 'error' : 'warning',
          suggestion:
            'IOR should be between 1.0 (vacuum) and 5.0 (diamond). Common: glass=1.5, water=1.33',
        });
      }
    }

    // Transmission (0-1)
    if (payload.transmission !== undefined) {
      this.validateUnitRange('transmission', payload.transmission, violations);
    }

    // Opacity (0-1)
    if (payload.opacity !== undefined) {
      this.validateUnitRange('opacity', payload.opacity, violations);
    }

    // Blend mode
    if (payload.blendMode !== undefined) {
      if (!VALID_BLEND_MODES.has(payload.blendMode)) {
        violations.push({
          property: 'blendMode',
          proposedValue: payload.blendMode,
          constraint: 'validBlendMode',
          bound: [...VALID_BLEND_MODES],
          severity: 'error',
          suggestion: `Invalid blend mode "${payload.blendMode}". Valid: ${[...VALID_BLEND_MODES].join(', ')}`,
        });
      }
    }

    // Textures
    if (payload.textures) {
      for (let i = 0; i < payload.textures.length; i++) {
        const tex = payload.textures[i];
        if (!VALID_TEXTURE_CHANNELS.has(tex.channel)) {
          violations.push({
            property: `textures[${i}].channel`,
            proposedValue: tex.channel,
            constraint: 'validTextureChannel',
            severity: 'error',
            suggestion: `Invalid texture channel "${tex.channel}". Valid channels include: baseColor, normalMap, roughnessMap, metallicMap, etc.`,
          });
        }
        if (!tex.path || typeof tex.path !== 'string' || tex.path.trim().length === 0) {
          violations.push({
            property: `textures[${i}].path`,
            proposedValue: tex.path,
            constraint: 'nonEmptyPath',
            severity: 'error',
            suggestion: 'Texture path must be a non-empty string',
          });
        }
      }
    }

    // Volumetric material
    if (payload.volumetric) {
      this.validateVolumetricPayload(payload.volumetric, violations);
    }

    // Advanced PBR — subsurface
    if (payload.subsurface) {
      if (payload.subsurface.thickness !== undefined) {
        if (!Number.isFinite(payload.subsurface.thickness) || payload.subsurface.thickness < 0) {
          violations.push({
            property: 'subsurface.thickness',
            proposedValue: payload.subsurface.thickness,
            constraint: 'nonNegativeFinite',
            severity: 'error',
            suggestion: 'Subsurface thickness must be a non-negative finite number',
          });
        }
      }
      if (payload.subsurface.attenuationDistance !== undefined) {
        if (
          !Number.isFinite(payload.subsurface.attenuationDistance) ||
          payload.subsurface.attenuationDistance <= 0
        ) {
          violations.push({
            property: 'subsurface.attenuationDistance',
            proposedValue: payload.subsurface.attenuationDistance,
            constraint: 'positiveFinite',
            severity: 'error',
            suggestion: 'Subsurface attenuation distance must be a positive finite number',
          });
        }
      }
    }

    // Advanced PBR — sheen
    if (payload.sheen) {
      if (payload.sheen.intensity !== undefined) {
        this.validateUnitRange('sheen.intensity', payload.sheen.intensity, violations);
      }
      if (payload.sheen.roughness !== undefined) {
        this.validateUnitRange('sheen.roughness', payload.sheen.roughness, violations);
      }
    }

    // Advanced PBR — clearcoat
    if (payload.clearcoat) {
      if (payload.clearcoat.intensity !== undefined) {
        this.validateUnitRange('clearcoat.intensity', payload.clearcoat.intensity, violations);
      }
      if (payload.clearcoat.roughness !== undefined) {
        this.validateUnitRange('clearcoat.roughness', payload.clearcoat.roughness, violations);
      }
    }

    // Advanced PBR — iridescence
    if (payload.iridescence) {
      if (payload.iridescence.intensity !== undefined) {
        this.validateUnitRange('iridescence.intensity', payload.iridescence.intensity, violations);
      }
      if (payload.iridescence.ior !== undefined) {
        if (!Number.isFinite(payload.iridescence.ior) || payload.iridescence.ior < 1.0) {
          violations.push({
            property: 'iridescence.ior',
            proposedValue: payload.iridescence.ior,
            constraint: 'iridescenceIorRange',
            bound: [1.0, 5.0],
            severity: 'error',
            suggestion: 'Iridescence IOR must be >= 1.0 and finite',
          });
        }
      }
    }
  }

  // ---- Volumetric payload validation ---------------------------------------

  private validateVolumetricPayload(
    volumetric: NonNullable<MaterialDeltaPayload['volumetric']>,
    violations: ValidationViolation[]
  ): void {
    if (volumetric.volumeType !== undefined) {
      if (!VALID_VOLUME_TYPES.has(volumetric.volumeType)) {
        violations.push({
          property: 'volumetric.volumeType',
          proposedValue: volumetric.volumeType,
          constraint: 'validVolumeType',
          bound: [...VALID_VOLUME_TYPES],
          severity: 'error',
          suggestion: `Invalid volume type "${volumetric.volumeType}". Valid: ${[...VALID_VOLUME_TYPES].join(', ')}`,
        });
      }
    }

    if (volumetric.density !== undefined) {
      this.validateUnitRange('volumetric.density', volumetric.density, violations);
    }

    if (volumetric.scattering !== undefined) {
      if (!Number.isFinite(volumetric.scattering) || volumetric.scattering < 0) {
        violations.push({
          property: 'volumetric.scattering',
          proposedValue: volumetric.scattering,
          constraint: 'nonNegativeFinite',
          severity: 'error',
          suggestion: 'Scattering coefficient must be a non-negative finite number',
        });
      }
    }

    if (volumetric.absorption !== undefined) {
      if (!Number.isFinite(volumetric.absorption) || volumetric.absorption < 0) {
        violations.push({
          property: 'volumetric.absorption',
          proposedValue: volumetric.absorption,
          constraint: 'nonNegativeFinite',
          severity: 'error',
          suggestion: 'Absorption coefficient must be a non-negative finite number',
        });
      }
    }
  }

  // ---- Composite payload validation ----------------------------------------

  private validateCompositePayload(
    payload: CompositeDeltaPayload,
    violations: ValidationViolation[]
  ): void {
    for (const subPayload of payload.deltas) {
      if (subPayload.type === 'material') {
        this.validateMaterialPayload(subPayload, violations);
      } else if (subPayload.type === 'composite') {
        this.validateCompositePayload(subPayload, violations);
      }
    }
  }

  // ---- Utility -------------------------------------------------------------

  /**
   * Validate a value is in [0, 1] range.
   */
  private validateUnitRange(
    property: string,
    value: number,
    violations: ValidationViolation[]
  ): void {
    if (!Number.isFinite(value)) {
      violations.push({
        property,
        proposedValue: value,
        constraint: 'finite',
        severity: 'error',
        suggestion: `${property} must be a finite number`,
      });
    } else if (value < 0 || value > 1) {
      violations.push({
        property,
        proposedValue: value,
        constraint: 'unitRange',
        bound: [0, 1],
        severity: 'error',
        suggestion: `${property} must be in range [0, 1], got ${value}`,
      });
    }
  }

  /**
   * Validate color components are in [0, 1] range (linear space).
   */
  private validateColorRange(
    property: string,
    color: { r: number; g: number; b: number; a?: number },
    violations: ValidationViolation[]
  ): void {
    const channels: Array<[string, number]> = [
      [`${property}.r`, color.r],
      [`${property}.g`, color.g],
      [`${property}.b`, color.b],
    ];
    if (color.a !== undefined) {
      channels.push([`${property}.a`, color.a]);
    }

    for (const [name, value] of channels) {
      if (!Number.isFinite(value)) {
        violations.push({
          property: name,
          proposedValue: value,
          constraint: 'finite',
          severity: 'error',
          suggestion: `Color component ${name} must be a finite number`,
        });
      } else if (value < 0 || value > 1) {
        violations.push({
          property: name,
          proposedValue: value,
          constraint: 'colorRange',
          bound: [0, 1],
          severity: 'error',
          suggestion: `Color component ${name} must be in [0, 1] linear space, got ${value}`,
        });
      }
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a MaterialsValidator.
 */
export function createMaterialsValidator(): MaterialsValidator {
  return new MaterialsValidator();
}
