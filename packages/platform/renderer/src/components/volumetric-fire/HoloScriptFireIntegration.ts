/**
 * HoloScriptFireIntegration
 *
 * Bridges HoloScript material_block syntax to VolumetricFireRenderer.
 * Enables declarative fire configuration via HoloScript DSL.
 *
 * Example HoloScript:
 * ```holoscript
 * material "DragonBreath" @volumetric_fire @pbr {
 *   temperature: 2800
 *   intensity: 1.5
 *   noiseScale: 2.5
 *   turbulence: 0.7
 *   windDirection: [0.2, 1.0, 0.1]
 *
 *   layers {
 *     whiteHotCore: { enabled: true, intensity: 1.0 }
 *     innerOrange: { enabled: true, intensity: 0.9 }
 *     midFlame: { enabled: true, intensity: 1.0 }
 *     outerGlow: { enabled: true, intensity: 0.8 }
 *     tendrils: { enabled: true, intensity: 0.6 }
 *     heatHaze: { enabled: true, intensity: 0.5 }
 *     embers: { enabled: true, intensity: 0.7 }
 *     smoke: { enabled: true, intensity: 0.6 }
 *     edgeGlow: { enabled: true, intensity: 0.7 }
 *   }
 *
 *   performance {
 *     qualityLevel: 2
 *     maxRaymarchSteps: 32
 *     temporalReprojection: true
 *     foveatedRendering: true
 *   }
 * }
 * ```
 *
 * @module volumetric-fire/holoscript-integration
 */

import { HoloScriptMaterialParser } from '../../HoloScriptMaterialParser';
import type { MaterialDefinition } from '../../VRMaterialPreviewSystem';
import type {
  VolumetricFireConfig,
  LayerConfig,
  FireRenderPassConfig,
} from './VolumetricFireTypes';
import {
  DEFAULT_FIRE_CONFIG,
  FIRE_QUALITY_PRESETS,
} from './VolumetricFireTypes';
import { logger } from '../../logger';

// =============================================================================
// HOLOSCRIPT → FIRE CONFIG PARSER
// =============================================================================

export class HoloScriptFireIntegration {
  /**
   * Parse HoloScript material_block into VolumetricFireConfig.
   */
  static parseFireMaterial(
    materialDef: MaterialDefinition
  ): VolumetricFireConfig | null {
    // Check if material has @volumetric_fire trait
    if (!materialDef.traits.includes('volumetric_fire')) {
      return null;
    }

    logger.debug('[HoloScriptFireIntegration] Parsing fire material', {
      name: materialDef.name,
      traits: materialDef.traits,
    });

    // Start with default config
    const config: VolumetricFireConfig = { ...DEFAULT_FIRE_CONFIG };

    // Extract core properties
    if (materialDef.properties.temperature !== undefined) {
      config.temperature = materialDef.properties.temperature as number;
    }
    if (materialDef.properties.intensity !== undefined) {
      config.intensity = materialDef.properties.intensity as number;
    }
    if (materialDef.properties.animationSpeed !== undefined) {
      config.animationSpeed = materialDef.properties.animationSpeed as number;
    }
    if (materialDef.properties.noiseScale !== undefined) {
      config.noiseScale = materialDef.properties.noiseScale as number;
    }
    if (materialDef.properties.noiseOctaves !== undefined) {
      config.noiseOctaves = materialDef.properties.noiseOctaves as number;
    }
    if (materialDef.properties.turbulence !== undefined) {
      config.turbulence = materialDef.properties.turbulence as number;
    }
    if (materialDef.properties.windStrength !== undefined) {
      config.windStrength = materialDef.properties.windStrength as number;
    }

    // Extract wind direction
    if (materialDef.properties.windDirection !== undefined) {
      const dir = materialDef.properties.windDirection as number[] | { x: number; y: number; z: number };
      if (Array.isArray(dir)) {
        config.windDirection = { x: dir[0] || 0, y: dir[1] || 1, z: dir[2] || 0 };
      } else {
        config.windDirection = dir;
      }
    }

    // Extract scale
    if (materialDef.properties.scale !== undefined) {
      const scale = materialDef.properties.scale as number[] | { x: number; y: number; z: number };
      if (Array.isArray(scale)) {
        config.scale = { x: scale[0] || 1, y: scale[1] || 2, z: scale[2] || 1 };
      } else {
        config.scale = scale;
      }
    }

    // Extract layers block
    if (materialDef.properties.layers !== undefined) {
      const layersData = materialDef.properties.layers as Record<string, unknown>;
      config.layers = HoloScriptFireIntegration.parseLayers(layersData);
    }

    // Extract performance block
    if (materialDef.properties.performance !== undefined) {
      const perfData = materialDef.properties.performance as Record<string, unknown>;
      HoloScriptFireIntegration.parsePerformanceSettings(config, perfData);
    }

    // Apply quality preset if specified
    if (materialDef.properties.qualityPreset !== undefined) {
      const preset = materialDef.properties.qualityPreset as keyof typeof FIRE_QUALITY_PRESETS;
      const presetConfig = FIRE_QUALITY_PRESETS[preset];
      if (presetConfig) {
        Object.assign(config, presetConfig);
        logger.info('[HoloScriptFireIntegration] Applied quality preset', { preset });
      }
    }

    logger.info('[HoloScriptFireIntegration] Fire config parsed', {
      name: materialDef.name,
      temperature: config.temperature,
      quality: config.qualityLevel,
      maxSteps: config.maxRaymarchSteps,
    });

    return config;
  }

  /**
   * Parse layers block from HoloScript properties.
   */
  private static parseLayers(
    layersData: Record<string, unknown>
  ): VolumetricFireConfig['layers'] {
    const defaultLayers = DEFAULT_FIRE_CONFIG.layers;

    return {
      whiteHotCore: HoloScriptFireIntegration.parseLayerConfig(
        layersData.whiteHotCore,
        defaultLayers.whiteHotCore
      ),
      innerOrange: HoloScriptFireIntegration.parseLayerConfig(
        layersData.innerOrange,
        defaultLayers.innerOrange
      ),
      midFlame: HoloScriptFireIntegration.parseLayerConfig(
        layersData.midFlame,
        defaultLayers.midFlame
      ),
      outerGlow: HoloScriptFireIntegration.parseLayerConfig(
        layersData.outerGlow,
        defaultLayers.outerGlow
      ),
      tendrils: HoloScriptFireIntegration.parseLayerConfig(
        layersData.tendrils,
        defaultLayers.tendrils
      ),
      heatHaze: HoloScriptFireIntegration.parseLayerConfig(
        layersData.heatHaze,
        defaultLayers.heatHaze
      ),
      embers: HoloScriptFireIntegration.parseLayerConfig(
        layersData.embers,
        defaultLayers.embers
      ),
      smoke: HoloScriptFireIntegration.parseLayerConfig(
        layersData.smoke,
        defaultLayers.smoke
      ),
      edgeGlow: HoloScriptFireIntegration.parseLayerConfig(
        layersData.edgeGlow,
        defaultLayers.edgeGlow
      ),
    };
  }

  /**
   * Parse individual layer config.
   */
  private static parseLayerConfig(
    layerData: unknown,
    defaultLayer: LayerConfig
  ): LayerConfig {
    if (!layerData || typeof layerData !== 'object') {
      return defaultLayer;
    }

    const data = layerData as Record<string, unknown>;

    return {
      enabled: data.enabled !== undefined ? (data.enabled as boolean) : defaultLayer.enabled,
      intensity: data.intensity !== undefined ? (data.intensity as number) : defaultLayer.intensity,
      color: data.color !== undefined ? HoloScriptFireIntegration.parseColor(data.color) : defaultLayer.color,
      noiseScale: data.noiseScale !== undefined ? (data.noiseScale as number) : defaultLayer.noiseScale,
      densityThreshold: data.densityThreshold !== undefined ? (data.densityThreshold as number) : defaultLayer.densityThreshold,
      alphaMultiplier: data.alphaMultiplier !== undefined ? (data.alphaMultiplier as number) : defaultLayer.alphaMultiplier,
    };
  }

  /**
   * Parse color from various HoloScript formats.
   */
  private static parseColor(
    colorData: unknown
  ): { r: number; g: number; b: number } | undefined {
    if (Array.isArray(colorData)) {
      return {
        r: colorData[0] || 0,
        g: colorData[1] || 0,
        b: colorData[2] || 0,
      };
    }

    if (typeof colorData === 'object' && colorData !== null) {
      const obj = colorData as Record<string, unknown>;
      if ('r' in obj && 'g' in obj && 'b' in obj) {
        return {
          r: obj.r as number,
          g: obj.g as number,
          b: obj.b as number,
        };
      }
    }

    if (typeof colorData === 'string') {
      // Parse hex color (e.g., "#ff5500")
      const hex = colorData.replace('#', '');
      if (hex.length === 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16) / 255,
          g: parseInt(hex.substring(2, 4), 16) / 255,
          b: parseInt(hex.substring(4, 6), 16) / 255,
        };
      }
    }

    return undefined;
  }

  /**
   * Parse performance settings block.
   */
  private static parsePerformanceSettings(
    config: VolumetricFireConfig,
    perfData: Record<string, unknown>
  ): void {
    if (perfData.qualityLevel !== undefined) {
      config.qualityLevel = perfData.qualityLevel as 0 | 1 | 2 | 3;
    }
    if (perfData.maxRaymarchSteps !== undefined) {
      config.maxRaymarchSteps = perfData.maxRaymarchSteps as number;
    }
    if (perfData.temporalReprojection !== undefined) {
      config.temporalReprojection = perfData.temporalReprojection as boolean;
    }
    if (perfData.temporalBlendFactor !== undefined) {
      config.temporalBlendFactor = perfData.temporalBlendFactor as number;
    }
    if (perfData.foveatedRendering !== undefined) {
      config.foveatedRendering = perfData.foveatedRendering as boolean;
    }
    if (perfData.useComputeDensity !== undefined) {
      config.useComputeDensity = perfData.useComputeDensity as boolean;
    }
    if (perfData.densityFieldResolution !== undefined) {
      config.densityFieldResolution = perfData.densityFieldResolution as number;
    }
    if (perfData.densityUpdateInterval !== undefined) {
      config.densityUpdateInterval = perfData.densityUpdateInterval as number;
    }
    if (perfData.emitsVolumetricLight !== undefined) {
      config.emitsVolumetricLight = perfData.emitsVolumetricLight as boolean;
    }
    if (perfData.volumetricLightRadius !== undefined) {
      config.volumetricLightRadius = perfData.volumetricLightRadius as number;
    }
    if (perfData.scatteringIntensity !== undefined) {
      config.scatteringIntensity = perfData.scatteringIntensity as number;
    }
  }

  /**
   * Generate HoloScript material_block from VolumetricFireConfig.
   */
  static generateHoloScript(config: VolumetricFireConfig): string {
    const lines: string[] = [];

    lines.push('material "VolumetricFire" @volumetric_fire @pbr {');

    // Core properties
    lines.push(`  temperature: ${config.temperature}`);
    lines.push(`  intensity: ${config.intensity}`);
    lines.push(`  animationSpeed: ${config.animationSpeed}`);
    lines.push(`  noiseScale: ${config.noiseScale}`);
    lines.push(`  noiseOctaves: ${config.noiseOctaves}`);
    lines.push(`  turbulence: ${config.turbulence}`);
    lines.push(`  windStrength: ${config.windStrength}`);
    lines.push(
      `  windDirection: [${config.windDirection.x}, ${config.windDirection.y}, ${config.windDirection.z}]`
    );
    lines.push(
      `  scale: [${config.scale.x}, ${config.scale.y}, ${config.scale.z}]`
    );
    lines.push('');

    // Layers
    lines.push('  layers {');
    lines.push(
      `    whiteHotCore: { enabled: ${config.layers.whiteHotCore.enabled}, intensity: ${config.layers.whiteHotCore.intensity} }`
    );
    lines.push(
      `    innerOrange: { enabled: ${config.layers.innerOrange.enabled}, intensity: ${config.layers.innerOrange.intensity} }`
    );
    lines.push(
      `    midFlame: { enabled: ${config.layers.midFlame.enabled}, intensity: ${config.layers.midFlame.intensity} }`
    );
    lines.push(
      `    outerGlow: { enabled: ${config.layers.outerGlow.enabled}, intensity: ${config.layers.outerGlow.intensity} }`
    );
    lines.push(
      `    tendrils: { enabled: ${config.layers.tendrils.enabled}, intensity: ${config.layers.tendrils.intensity} }`
    );
    lines.push(
      `    heatHaze: { enabled: ${config.layers.heatHaze.enabled}, intensity: ${config.layers.heatHaze.intensity} }`
    );
    lines.push(
      `    embers: { enabled: ${config.layers.embers.enabled}, intensity: ${config.layers.embers.intensity} }`
    );
    lines.push(
      `    smoke: { enabled: ${config.layers.smoke.enabled}, intensity: ${config.layers.smoke.intensity} }`
    );
    lines.push(
      `    edgeGlow: { enabled: ${config.layers.edgeGlow.enabled}, intensity: ${config.layers.edgeGlow.intensity} }`
    );
    lines.push('  }');
    lines.push('');

    // Performance
    lines.push('  performance {');
    lines.push(`    qualityLevel: ${config.qualityLevel}`);
    lines.push(`    maxRaymarchSteps: ${config.maxRaymarchSteps}`);
    lines.push(`    temporalReprojection: ${config.temporalReprojection}`);
    lines.push(`    temporalBlendFactor: ${config.temporalBlendFactor}`);
    lines.push(`    foveatedRendering: ${config.foveatedRendering}`);
    lines.push(`    useComputeDensity: ${config.useComputeDensity}`);
    lines.push(`    densityFieldResolution: ${config.densityFieldResolution}`);
    lines.push(`    densityUpdateInterval: ${config.densityUpdateInterval}`);
    lines.push(`    emitsVolumetricLight: ${config.emitsVolumetricLight}`);
    lines.push(`    volumetricLightRadius: ${config.volumetricLightRadius}`);
    lines.push(`    scatteringIntensity: ${config.scatteringIntensity}`);
    lines.push('  }');

    lines.push('}');

    return lines.join('\n');
  }
}

// =============================================================================
// MATERIAL FACTORY EXTENSION
// =============================================================================

/**
 * Extend MaterialFactory with volumetric fire support.
 * Usage: materialFactory.createVolumetricFire(config)
 */
export function createVolumetricFireMaterial(
  config: Partial<VolumetricFireConfig> = {}
): MaterialDefinition {
  const fullConfig: VolumetricFireConfig = { ...DEFAULT_FIRE_CONFIG, ...config };

  return {
    type: 'shader',
    name: 'VolumetricFire',
    traits: ['volumetric_fire', 'pbr', 'emissive'],
    properties: {
      temperature: fullConfig.temperature,
      intensity: fullConfig.intensity,
      animationSpeed: fullConfig.animationSpeed,
      noiseScale: fullConfig.noiseScale,
      noiseOctaves: fullConfig.noiseOctaves,
      turbulence: fullConfig.turbulence,
      windStrength: fullConfig.windStrength,
      windDirection: fullConfig.windDirection,
      scale: fullConfig.scale,
      layers: fullConfig.layers,
      performance: {
        qualityLevel: fullConfig.qualityLevel,
        maxRaymarchSteps: fullConfig.maxRaymarchSteps,
        temporalReprojection: fullConfig.temporalReprojection,
        foveatedRendering: fullConfig.foveatedRendering,
        emitsVolumetricLight: fullConfig.emitsVolumetricLight,
        volumetricLightRadius: fullConfig.volumetricLightRadius,
        scatteringIntensity: fullConfig.scatteringIntensity,
      },
    },
    textureMaps: [],
    shaderPasses: [
      {
        name: 'fire',
        vertex: 'volumetric-fire.wgsl::vertexMain',
        fragment: 'volumetric-fire.wgsl::fragmentMain',
        blend: 'additive',
        properties: {},
      },
    ],
    shaderConnections: [],
  };
}
