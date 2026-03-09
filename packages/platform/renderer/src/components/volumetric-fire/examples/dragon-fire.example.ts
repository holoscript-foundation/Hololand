/**
 * Dragon Fire Breath Example
 *
 * Demonstrates the compute shader volumetric fire system for dragon fire breath.
 * Replaces 9 cone-based fire meshes from fire-dragon.holo with a single
 * compute+render pipeline that:
 *
 *   1. Generates a 3D density field via compute shader (amortized)
 *   2. Raymarches through the field with temporal reprojection
 *   3. Auto-adjusts quality: 12/24/32/48 steps based on frame budget
 *
 * Performance: <2ms on Quest 3 (11.1ms total VR frame budget at 90Hz)
 */

import { VolumetricFireRenderer } from '../VolumetricFireRenderer';
import { QUALITY_STEPS } from '../VolumetricFireTypes';

// =============================================================================
// EXAMPLE 1: Basic Dragon Fire Breath (Quest 3 default)
// =============================================================================

export function createDragonFireBreath(device: GPUDevice): VolumetricFireRenderer {
  const fireRenderer = new VolumetricFireRenderer(device, {
    // Hot, intense fire (dragon breath)
    temperature: 3200,
    intensity: 2.0,
    animationSpeed: 1.5,

    // Elongated cone shape (breath stream)
    scale: { x: 0.8, y: 3.0, z: 0.8 },

    // High turbulence (chaotic dragon breath)
    turbulence: 0.8,
    windStrength: 0.5,
    windDirection: { x: 0.0, y: 0.8, z: 0.2 },

    // Noise settings
    noiseScale: 3.0,
    noiseOctaves: 3,

    // All 9 layers enabled for dragon fire
    layers: {
      whiteHotCore: { enabled: true, intensity: 1.0, densityThreshold: 0.1 },
      innerOrange: { enabled: true, intensity: 1.0 },
      midFlame: { enabled: true, intensity: 1.0 },
      outerGlow: { enabled: true, intensity: 0.9 },
      tendrils: { enabled: true, intensity: 0.8 },
      heatHaze: { enabled: true, intensity: 0.7 },
      embers: { enabled: true, intensity: 1.0 },
      smoke: { enabled: true, intensity: 0.5 },
      edgeGlow: { enabled: true, intensity: 0.8 },
    },

    // Performance (Quest 3 baseline: 24 steps, compute density)
    qualityLevel: 1,
    maxRaymarchSteps: 24,
    temporalReprojection: true,
    temporalBlendFactor: 0.25,
    foveatedRendering: true,

    // Compute pipeline (key new feature)
    useComputeDensity: true,
    densityFieldResolution: 32,
    densityUpdateInterval: 2,

    // Lighting
    emitsVolumetricLight: true,
    volumetricLightRadius: 4.0,
    scatteringIntensity: 0.6,
  });

  return fireRenderer;
}

// =============================================================================
// EXAMPLE 2: DragonMeshBatcher Integration
//
// Shows how the batcher replaces 9 cone meshes (FireCore, FireInner, FireMid,
// FireOuter, FireTendrilUL/UR/LL/LR, HeatHaze) with a single volumetric pass.
// =============================================================================

export async function integrateDragonFire(
  device: GPUDevice,
  batcherFireGroup: {
    userData: {
      fireOrigin: { x: number; y: number; z: number };
      volumeMin: { x: number; y: number; z: number };
      volumeMax: { x: number; y: number; z: number };
      recommendedQualityPreset: 'quest2' | 'quest3';
    };
  }
): Promise<VolumetricFireRenderer> {
  const fire = createDragonFireBreath(device);

  // Set fire origin from batcher's computed centroid
  const origin = batcherFireGroup.userData.fireOrigin;
  fire.setFireOrigin(origin.x, origin.y, origin.z);

  // Apply batcher's recommended quality preset
  fire.applyQualityPreset(batcherFireGroup.userData.recommendedQualityPreset);

  await fire.initialize();
  return fire;
}

// =============================================================================
// EXAMPLE 3: Multi-Platform Quality Variants
// =============================================================================

export function createDragonFireQuest2(device: GPUDevice): VolumetricFireRenderer {
  const fire = new VolumetricFireRenderer(device);
  fire.applyQualityPreset('quest2');
  fire.updateConfig({
    temperature: 3200,
    intensity: 2.0,
    scale: { x: 0.8, y: 3.0, z: 0.8 },
    turbulence: 0.8,
  });
  return fire;
}

export function createDragonFireQuest3(device: GPUDevice): VolumetricFireRenderer {
  const fire = new VolumetricFireRenderer(device);
  fire.applyQualityPreset('quest3');
  fire.updateConfig({
    temperature: 3200,
    intensity: 2.0,
    scale: { x: 0.8, y: 3.0, z: 0.8 },
    turbulence: 0.8,
    animationSpeed: 1.5,
  });
  return fire;
}

export function createDragonFirePCVR(device: GPUDevice): VolumetricFireRenderer {
  const fire = new VolumetricFireRenderer(device);
  fire.applyQualityPreset('pcvr');
  fire.updateConfig({
    temperature: 3200,
    intensity: 2.5,
    scale: { x: 0.8, y: 3.0, z: 0.8 },
    turbulence: 0.9,
    animationSpeed: 1.8,
    noiseOctaves: 4,
  });
  return fire;
}

// =============================================================================
// EXAMPLE 4: Performance Monitoring with Quality Step Feedback
// =============================================================================

export class PerformanceMonitoredDragonFire {
  private fireRenderer: VolumetricFireRenderer;
  private targetFrameTime = 11.1;
  private performanceCheckInterval = 1000;
  private lastCheckTime = 0;

  constructor(device: GPUDevice) {
    this.fireRenderer = createDragonFireBreath(device);
  }

  async initialize(): Promise<void> {
    await this.fireRenderer.initialize();
  }

  /**
   * Log current quality step and metrics.
   */
  checkPerformance(currentFrameTime: number): void {
    const metrics = this.fireRenderer.getPerformanceMetrics();
    const step = this.fireRenderer.getCurrentQualityStep();

    console.log('[DragonFire] Performance:', {
      frameTime: currentFrameTime.toFixed(2) + 'ms',
      qualityStep: step.name,
      raymarchSteps: step.raymarchSteps,
      fireCPUTime: metrics.cpuTimeMs.toFixed(2) + 'ms',
      budgetExceeded: metrics.budgetExceeded,
      temporalActive: metrics.temporalActive,
      densityUpdates: metrics.densityUpdatesPerSecond + '/s',
    });

    // Emergency fallback if well over budget
    if (currentFrameTime > this.targetFrameTime * 1.3 && metrics.autoQualityLevel > 0) {
      console.warn('[DragonFire] Frame exceeded, forcing Quest 2 preset');
      this.fireRenderer.applyQualityPreset('quest2');
    }
  }

  dispose(): void {
    this.fireRenderer.dispose();
  }
}

// =============================================================================
// EXAMPLE 5: Quality Step Visualization
//
// Shows the four quality steps and their configurations.
// =============================================================================

export function logQualitySteps(): void {
  console.log('=== Volumetric Fire Quality Steps ===');
  for (const level of [0, 1, 2, 3] as const) {
    const step = QUALITY_STEPS[level];
    console.log(`  Level ${level} (${step.name}):`);
    console.log(`    Raymarch steps: ${step.raymarchSteps}`);
    console.log(`    Noise octaves: ${step.noiseOctaves}`);
    console.log(`    Temporal reprojection: ${step.temporalReprojection}`);
    console.log(`    Density field: ${step.densityFieldResolution}^3`);
    console.log(`    Density update interval: every ${step.densityUpdateInterval} frame(s)`);
    console.log(`    Render scale: ${step.renderScale}`);
    console.log(`    Frame budget: ${step.frameBudgetMs}ms`);
  }
}
