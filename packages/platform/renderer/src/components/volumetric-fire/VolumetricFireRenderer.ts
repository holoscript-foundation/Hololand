/**
 * VolumetricFireRenderer
 *
 * WebGPU compute + render pipeline for volumetric fire in VR.
 *
 * Architecture:
 *   1. Compute Pass: Generates 3D density field via noise sampling
 *      - Runs every N frames (amortized cost)
 *      - Outputs RGBA16F 3D texture: [density, temperature, emission, curl]
 *   2. Render Pass: Raymarches through density field
 *      - Temporal reprojection blends with previous frame
 *      - Auto quality stepping: 12/24/32/48 steps based on frame time
 *      - Foveated rendering for VR eye tracking
 *
 * Performance Budget: <2ms on Quest 3 (90Hz VR, 11.1ms total frame)
 *
 * Integration: DragonMeshBatcher Phase 1 replaces 9 cone-based fire meshes
 * with a single VolumetricFireRenderer draw call.
 *
 * @module volumetric-fire
 */

import type {
  VolumetricFireConfig,
  FirePerformanceMetrics,
  FireRenderPassConfig,
  NoiseTextureConfig,
  TemporalReprojectionState,
  ComputePipelineState,
  QualityStep,
} from './VolumetricFireTypes';
import {
  DEFAULT_FIRE_CONFIG,
  FIRE_QUALITY_PRESETS,
  QUALITY_STEPS,
  FireShaderFlags,
  getTemporalJitter,
} from './VolumetricFireTypes';
import { logger } from '../../logger';

// =============================================================================
// RENDERER CLASS
// =============================================================================

export class VolumetricFireRenderer {
  private device: GPUDevice;
  private config: VolumetricFireConfig;
  private renderPassConfig: FireRenderPassConfig;

  // GPU Resources — Compute Pipeline
  private computeState: ComputePipelineState;

  // GPU Resources — Render Pipeline
  private renderPipeline: GPURenderPipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private uniformData: Float32Array;
  private noiseTexture: GPUTexture | null = null;
  private noiseSampler: GPUSampler | null = null;
  private renderBindGroup: GPUBindGroup | null = null;

  // Temporal reprojection state
  private temporalState: TemporalReprojectionState;
  private prevFrameTexture: GPUTexture | null = null;
  private prevFrameSampler: GPUSampler | null = null;

  // Performance tracking
  private performanceMetrics: FirePerformanceMetrics;
  private frameTimes: number[] = [];
  private lastQualityAdjustTime = 0;
  private densityUpdateCount = 0;
  private lastDensityCountResetTime = 0;

  // Fire world-space origin (set by DragonMeshBatcher)
  private fireOrigin = { x: 0, y: 4.35, z: 6.0 };

  // Volume bounds (AABB around fire, computed from origin + scale)
  private volumeMin = { x: -1, y: 2.35, z: 4.0 };
  private volumeMax = { x: 1, y: 6.35, z: 8.0 };

  // Shader code (loaded once)
  private shaderCode: string | null = null;

  constructor(
    device: GPUDevice,
    config: Partial<VolumetricFireConfig> = {},
    renderPassConfig: Partial<FireRenderPassConfig> = {}
  ) {
    this.device = device;
    this.config = { ...DEFAULT_FIRE_CONFIG, ...config };

    this.renderPassConfig = {
      resolution: { width: 1024, height: 1024 },
      renderScale: 0.75,
      renderOrder: 100,
      blendMode: 'additive',
      depthTest: true,
      depthWrite: false,
      ...renderPassConfig,
    };

    // Uniform buffer: 512 bytes (aligned to 256-byte boundary)
    this.uniformData = new Float32Array(128); // 512 bytes

    this.computeState = {
      pipeline: null,
      densityField: null,
      prevDensityField: null,
      bindGroup: null,
      resolution: this.config.densityFieldResolution,
      framesSinceUpdate: 0,
    };

    this.temporalState = {
      prevViewProjection: new Float32Array(16),
      prevFrameTexture: null,
      prevDensityField: null,
      frameIndex: 0,
      isFirstFrame: true,
      haltonIndex: 0,
    };

    this.performanceMetrics = {
      gpuTimeMs: 0,
      cpuTimeMs: 0,
      computeTimeMs: 0,
      averageRaymarchSteps: this.config.maxRaymarchSteps,
      pixelsRendered: 0,
      fillRate: 0,
      autoQualityLevel: this.config.qualityLevel,
      budgetExceeded: false,
      temporalActive: this.config.temporalReprojection,
      densityUpdatesPerSecond: 0,
    };

    logger.info('[VolumetricFireRenderer] Initialized', {
      quality: this.config.qualityLevel,
      maxSteps: this.config.maxRaymarchSteps,
      renderScale: this.renderPassConfig.renderScale,
      computeDensity: this.config.useComputeDensity,
      temporalReprojection: this.config.temporalReprojection,
    });
  }

  /**
   * Initialize all GPU resources (compute pipeline, render pipeline, textures).
   * Must be called before rendering.
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      // Create noise texture
      await this.createNoiseTexture();

      // Create sampler
      this.noiseSampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        addressModeW: 'repeat',
      });

      // Create uniform buffer (512 bytes, aligned)
      this.uniformBuffer = this.device.createBuffer({
        size: 512,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: 'volumetric-fire-uniforms',
      });

      // Load shader code
      this.shaderCode = await this.loadShaderCode();

      // Create compute pipeline (density field generation)
      if (this.config.useComputeDensity) {
        await this.createComputePipeline();
      }

      // Create render pipeline
      await this.createRenderPipeline();

      // Create temporal reprojection resources
      if (this.config.temporalReprojection) {
        this.createTemporalResources();
      }

      const elapsedMs = performance.now() - startTime;
      logger.info('[VolumetricFireRenderer] GPU resources initialized', {
        elapsedMs: elapsedMs.toFixed(2),
        computePipeline: !!this.computeState.pipeline,
        renderPipeline: !!this.renderPipeline,
      });
    } catch (error) {
      logger.error('[VolumetricFireRenderer] Initialization failed', { error });
      throw error;
    }
  }

  /**
   * Set the world-space origin of the fire volume.
   * Called by DragonMeshBatcher to position fire at dragon's mouth.
   */
  setFireOrigin(x: number, y: number, z: number): void {
    this.fireOrigin = { x, y, z };
    this.updateVolumeBounds();
  }

  /**
   * Render fire volume.
   * Handles both compute pass (if needed) and render pass.
   */
  render(
    commandEncoder: GPUCommandEncoder,
    colorAttachment: GPURenderPassColorAttachment,
    depthStencilAttachment: GPURenderPassDepthStencilAttachment,
    viewMatrix: Float32Array,
    projectionMatrix: Float32Array,
    cameraPosition: { x: number; y: number; z: number },
    time: number,
    depthTextureView: GPUTextureView
  ): void {
    if (!this.renderPipeline || !this.uniformBuffer) {
      logger.warn('[VolumetricFireRenderer] Not initialized, skipping render');
      return;
    }

    const cpuStartTime = performance.now();

    // Step 1: Compute density field (if due for update)
    if (this.config.useComputeDensity) {
      this.computeState.framesSinceUpdate++;
      if (this.computeState.framesSinceUpdate >= this.config.densityUpdateInterval) {
        this.dispatchComputePass(commandEncoder, viewMatrix, projectionMatrix, cameraPosition, time);
        this.computeState.framesSinceUpdate = 0;
        this.densityUpdateCount++;
      }
    }

    // Step 2: Update uniforms
    this.updateUniforms(viewMatrix, projectionMatrix, cameraPosition, time);
    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      this.uniformData.buffer
    );

    // Step 3: Update render bind group with current depth texture
    this.updateRenderBindGroup(depthTextureView);

    // Step 4: Render pass
    if (this.renderPipeline && this.renderBindGroup) {
      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [colorAttachment],
        depthStencilAttachment,
        label: 'volumetric-fire-render',
      });

      renderPass.setPipeline(this.renderPipeline);
      renderPass.setBindGroup(0, this.renderBindGroup);
      renderPass.draw(3, 1, 0, 0); // Fullscreen triangle (3 vertices)
      renderPass.end();
    }

    // Step 5: Swap temporal buffers
    if (this.config.temporalReprojection) {
      this.swapTemporalBuffers(viewMatrix, projectionMatrix);
    }

    // Track performance
    const cpuElapsedMs = performance.now() - cpuStartTime;
    this.performanceMetrics.cpuTimeMs = cpuElapsedMs;
    this.performanceMetrics.temporalActive = this.config.temporalReprojection;

    // Update density updates/sec metric
    const now = performance.now();
    if (now - this.lastDensityCountResetTime > 1000) {
      this.performanceMetrics.densityUpdatesPerSecond = this.densityUpdateCount;
      this.densityUpdateCount = 0;
      this.lastDensityCountResetTime = now;
    }

    // Auto-adjust quality based on frame time
    this.autoAdjustQuality(cpuElapsedMs);

    this.temporalState.frameIndex++;
  }

  /**
   * Update fire configuration at runtime.
   */
  updateConfig(config: Partial<VolumetricFireConfig>): void {
    const prevQuality = this.config.qualityLevel;
    this.config = { ...this.config, ...config };

    // If quality level changed, apply the corresponding step settings
    if (config.qualityLevel !== undefined && config.qualityLevel !== prevQuality) {
      this.applyQualityStep(config.qualityLevel);
    }

    this.updateVolumeBounds();
    logger.debug('[VolumetricFireRenderer] Config updated', config);
  }

  /**
   * Apply quality preset (Quest 2/3/Pro, PCVR, Desktop).
   */
  applyQualityPreset(preset: keyof typeof FIRE_QUALITY_PRESETS): void {
    const presetConfig = FIRE_QUALITY_PRESETS[preset];
    this.updateConfig(presetConfig);
    logger.info('[VolumetricFireRenderer] Applied quality preset', { preset });
  }

  /**
   * Get current performance metrics.
   */
  getPerformanceMetrics(): FirePerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get current quality step configuration.
   */
  getCurrentQualityStep(): QualityStep {
    return QUALITY_STEPS[this.config.qualityLevel];
  }

  /**
   * Clean up all GPU resources.
   */
  dispose(): void {
    this.uniformBuffer?.destroy();
    this.noiseTexture?.destroy();
    this.computeState.densityField?.destroy();
    this.computeState.prevDensityField?.destroy();
    this.prevFrameTexture?.destroy();

    this.uniformBuffer = null;
    this.noiseTexture = null;
    this.noiseSampler = null;
    this.renderBindGroup = null;
    this.renderPipeline = null;
    this.computeState.pipeline = null;
    this.computeState.densityField = null;
    this.computeState.prevDensityField = null;
    this.computeState.bindGroup = null;
    this.prevFrameTexture = null;

    logger.info('[VolumetricFireRenderer] Disposed');
  }

  // ===========================================================================
  // PRIVATE -- Compute Pipeline
  // ===========================================================================

  private async createComputePipeline(): Promise<void> {
    if (!this.shaderCode) return;

    const shaderModule = this.device.createShaderModule({
      label: 'volumetric-fire-compute-shader',
      code: this.shaderCode,
    });

    // Create density field textures (current + previous for temporal)
    const res = this.config.densityFieldResolution;
    this.computeState.resolution = res;

    this.computeState.densityField = this.device.createTexture({
      label: 'fire-density-field',
      size: [res, res, res],
      format: 'rgba16float',
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
      dimension: '3d',
    });

    this.computeState.prevDensityField = this.device.createTexture({
      label: 'fire-density-field-prev',
      size: [res, res, res],
      format: 'rgba16float',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST,
      dimension: '3d',
    });

    // Create compute pipeline
    this.computeState.pipeline = this.device.createComputePipeline({
      label: 'volumetric-fire-compute-pipeline',
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'computeDensityField',
      },
    });

    logger.debug('[VolumetricFireRenderer] Compute pipeline created', {
      resolution: res,
    });
  }

  private dispatchComputePass(
    commandEncoder: GPUCommandEncoder,
    viewMatrix: Float32Array,
    projectionMatrix: Float32Array,
    cameraPosition: { x: number; y: number; z: number },
    time: number
  ): void {
    if (
      !this.computeState.pipeline ||
      !this.computeState.densityField ||
      !this.computeState.prevDensityField ||
      !this.uniformBuffer ||
      !this.noiseTexture ||
      !this.noiseSampler
    ) {
      return;
    }

    // Update uniforms for compute pass
    this.updateUniforms(viewMatrix, projectionMatrix, cameraPosition, time);
    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      this.uniformData.buffer
    );

    // Create compute bind group (group 0 in shader)
    const computeBindGroup = this.device.createBindGroup({
      label: 'fire-compute-bind-group',
      layout: this.computeState.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        {
          binding: 1,
          resource: this.noiseTexture.createView({ dimension: '3d' }),
        },
        { binding: 2, resource: this.noiseSampler },
        {
          binding: 3,
          resource: this.computeState.densityField.createView({
            dimension: '3d',
          }),
        },
        {
          binding: 4,
          resource: this.computeState.prevDensityField.createView({
            dimension: '3d',
          }),
        },
        {
          binding: 5,
          resource: this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
          }),
        },
      ],
    });

    // Dispatch compute shader
    const res = this.computeState.resolution;
    const workgroupSize = 4;
    const workgroups = Math.ceil(res / workgroupSize);

    const computePass = commandEncoder.beginComputePass({
      label: 'fire-density-compute',
    });
    computePass.setPipeline(this.computeState.pipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(workgroups, workgroups, workgroups);
    computePass.end();

    // Copy current density to previous for next frame's temporal blend
    commandEncoder.copyTextureToTexture(
      { texture: this.computeState.densityField },
      { texture: this.computeState.prevDensityField },
      [res, res, res]
    );
  }

  // ===========================================================================
  // PRIVATE -- Render Pipeline
  // ===========================================================================

  private async createRenderPipeline(): Promise<void> {
    if (!this.shaderCode) return;

    const shaderModule = this.device.createShaderModule({
      label: 'volumetric-fire-render-shader',
      code: this.shaderCode,
    });

    this.renderPipeline = this.device.createRenderPipeline({
      label: 'volumetric-fire-render-pipeline',
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: 'bgra8unorm',
            blend:
              this.renderPassConfig.blendMode === 'additive'
                ? {
                    color: {
                      srcFactor: 'one',
                      dstFactor: 'one',
                      operation: 'add',
                    },
                    alpha: {
                      srcFactor: 'one',
                      dstFactor: 'one',
                      operation: 'add',
                    },
                  }
                : {
                    color: {
                      srcFactor: 'src-alpha',
                      dstFactor: 'one-minus-src-alpha',
                      operation: 'add',
                    },
                    alpha: {
                      srcFactor: 'one',
                      dstFactor: 'one-minus-src-alpha',
                      operation: 'add',
                    },
                  },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
      depthStencil: this.renderPassConfig.depthTest
        ? {
            format: 'depth24plus',
            depthWriteEnabled: this.renderPassConfig.depthWrite,
            depthCompare: 'less',
          }
        : undefined,
    });
  }

  private updateRenderBindGroup(depthTextureView: GPUTextureView): void {
    if (
      !this.renderPipeline ||
      !this.uniformBuffer ||
      !this.noiseSampler
    ) {
      return;
    }

    // Get density field view (or create a placeholder if compute is disabled)
    const densityFieldView = this.computeState.densityField
      ? this.computeState.densityField.createView({ dimension: '3d' })
      : this.createPlaceholderDensityView();

    // Get previous frame texture view (or placeholder)
    const prevFrameView = this.prevFrameTexture
      ? this.prevFrameTexture.createView()
      : this.createPlaceholderPrevFrameView();

    const prevFrameSampler = this.prevFrameSampler || this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    this.renderBindGroup = this.device.createBindGroup({
      label: 'fire-render-bind-group',
      layout: this.renderPipeline.getBindGroupLayout(1),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: densityFieldView },
        {
          binding: 2,
          resource: this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            addressModeW: 'clamp-to-edge',
          }),
        },
        { binding: 3, resource: depthTextureView },
        {
          binding: 4,
          resource: this.device.createSampler({
            compare: 'less',
          }),
        },
        { binding: 5, resource: prevFrameView },
        { binding: 6, resource: prevFrameSampler },
      ],
    });
  }

  // ===========================================================================
  // PRIVATE -- Temporal Reprojection
  // ===========================================================================

  private createTemporalResources(): void {
    const { width, height } = this.renderPassConfig.resolution;

    this.prevFrameTexture = this.device.createTexture({
      label: 'fire-prev-frame',
      size: [width, height],
      format: 'bgra8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.prevFrameSampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });
  }

  private swapTemporalBuffers(
    viewMatrix: Float32Array,
    projectionMatrix: Float32Array
  ): void {
    // Store current VP matrix as previous for next frame
    this.multiplyMatrices(
      this.temporalState.prevViewProjection,
      projectionMatrix,
      viewMatrix
    );

    this.temporalState.isFirstFrame = false;
    this.temporalState.haltonIndex =
      (this.temporalState.haltonIndex + 1) % 16;
  }

  // ===========================================================================
  // PRIVATE -- Uniform Buffer Updates
  // ===========================================================================

  private updateUniforms(
    viewMatrix: Float32Array,
    projectionMatrix: Float32Array,
    cameraPosition: { x: number; y: number; z: number },
    time: number
  ): void {
    let offset = 0;

    // modelViewMatrix (16 floats)
    this.uniformData.set(viewMatrix, offset);
    offset += 16;

    // projectionMatrix (16 floats)
    this.uniformData.set(projectionMatrix, offset);
    offset += 16;

    // invViewProjection (16 floats) - compute inverse VP
    const vpMatrix = new Float32Array(16);
    this.multiplyMatrices(vpMatrix, projectionMatrix, viewMatrix);
    const invVP = this.invertMatrix(vpMatrix);
    this.uniformData.set(invVP, offset);
    offset += 16;

    // prevViewProjection (16 floats)
    this.uniformData.set(this.temporalState.prevViewProjection, offset);
    offset += 16;

    // cameraPosition (vec4: xyz + time)
    this.uniformData[offset++] = cameraPosition.x;
    this.uniformData[offset++] = cameraPosition.y;
    this.uniformData[offset++] = cameraPosition.z;
    this.uniformData[offset++] = time;

    // fireOrigin (vec4)
    this.uniformData[offset++] = this.fireOrigin.x;
    this.uniformData[offset++] = this.fireOrigin.y;
    this.uniformData[offset++] = this.fireOrigin.z;
    this.uniformData[offset++] = 0; // padding

    // fireScale (vec4: xyz scale + w intensity)
    this.uniformData[offset++] = this.config.scale.x;
    this.uniformData[offset++] = this.config.scale.y;
    this.uniformData[offset++] = this.config.scale.z;
    this.uniformData[offset++] = this.config.intensity;

    // temperature, animationSpeed, noiseScale, noiseOctaves
    this.uniformData[offset++] = this.config.temperature;
    this.uniformData[offset++] = this.config.animationSpeed;
    this.uniformData[offset++] = this.config.noiseScale;
    // Store u32 as float bits
    const octavesView = new DataView(this.uniformData.buffer);
    octavesView.setUint32(offset * 4, this.config.noiseOctaves, true);
    offset++;

    // turbulence, windStrength, maxRaymarchSteps, qualityLevel
    this.uniformData[offset++] = this.config.turbulence;
    this.uniformData[offset++] = this.config.windStrength;
    octavesView.setUint32(offset * 4, this.config.maxRaymarchSteps, true);
    offset++;
    octavesView.setUint32(offset * 4, this.config.qualityLevel, true);
    offset++;

    // windDirection (vec4)
    this.uniformData[offset++] = this.config.windDirection.x;
    this.uniformData[offset++] = this.config.windDirection.y;
    this.uniformData[offset++] = this.config.windDirection.z;
    this.uniformData[offset++] = 0; // padding

    // layerIntensities1 (vec4)
    this.uniformData[offset++] = this.config.layers.whiteHotCore.intensity;
    this.uniformData[offset++] = this.config.layers.innerOrange.intensity;
    this.uniformData[offset++] = this.config.layers.midFlame.intensity;
    this.uniformData[offset++] = this.config.layers.outerGlow.intensity;

    // layerIntensities2 (vec4)
    this.uniformData[offset++] = this.config.layers.tendrils.intensity;
    this.uniformData[offset++] = this.config.layers.heatHaze.intensity;
    this.uniformData[offset++] = this.config.layers.embers.intensity;
    this.uniformData[offset++] = this.config.layers.smoke.intensity;

    // layerIntensities3 (vec4)
    this.uniformData[offset++] = this.config.layers.edgeGlow.intensity;
    this.uniformData[offset++] = 0;
    this.uniformData[offset++] = 0;
    this.uniformData[offset++] = 0;

    // Temporal reprojection params
    const [jitterX, jitterY] = getTemporalJitter(this.temporalState.frameIndex);
    octavesView.setUint32(offset * 4, this.temporalState.frameIndex, true);
    offset++;
    this.uniformData[offset++] = this.config.temporalBlendFactor;
    this.uniformData[offset++] = jitterX;
    this.uniformData[offset++] = jitterY;

    // Performance flags
    let flags = 0;
    if (this.config.temporalReprojection) flags |= FireShaderFlags.TEMPORAL_REPROJECTION;
    if (this.config.foveatedRendering) flags |= FireShaderFlags.FOVEATED_RENDERING;
    if (this.config.emitsVolumetricLight) flags |= FireShaderFlags.VOLUMETRIC_LIGHT;
    if (this.config.noiseOctaves >= 4) flags |= FireShaderFlags.HIGH_QUALITY_NOISE;
    if (this.config.useComputeDensity) flags |= FireShaderFlags.COMPUTE_DENSITY;

    octavesView.setUint32(offset * 4, flags, true);
    offset++;
    this.uniformData[offset++] = this.renderPassConfig.renderScale;
    this.uniformData[offset++] = 0.5; // foveaCenterX
    this.uniformData[offset++] = 0.5; // foveaCenterY

    // Volume bounds (min + max)
    this.uniformData[offset++] = this.volumeMin.x;
    this.uniformData[offset++] = this.volumeMin.y;
    this.uniformData[offset++] = this.volumeMin.z;
    this.uniformData[offset++] = 0; // padding

    this.uniformData[offset++] = this.volumeMax.x;
    this.uniformData[offset++] = this.volumeMax.y;
    this.uniformData[offset++] = this.volumeMax.z;
    this.uniformData[offset++] = 0; // padding
  }

  // ===========================================================================
  // PRIVATE -- Auto Quality Stepping (12/24/32/48)
  // ===========================================================================

  /**
   * Apply a specific quality step.
   * Maps quality level to raymarch step count and associated settings.
   */
  private applyQualityStep(level: 0 | 1 | 2 | 3): void {
    const step = QUALITY_STEPS[level];
    this.config.qualityLevel = level;
    this.config.maxRaymarchSteps = step.raymarchSteps;
    this.config.noiseOctaves = step.noiseOctaves;
    this.config.temporalReprojection = step.temporalReprojection;
    this.config.densityUpdateInterval = step.densityUpdateInterval;
    this.renderPassConfig.renderScale = step.renderScale;

    this.performanceMetrics.autoQualityLevel = level;
    this.performanceMetrics.averageRaymarchSteps = step.raymarchSteps;

    logger.debug('[VolumetricFireRenderer] Quality step applied', {
      level: step.name,
      steps: step.raymarchSteps,
      renderScale: step.renderScale,
    });
  }

  /**
   * Auto-adjust quality based on frame time budget.
   * Steps down (fewer steps) if over budget, steps up if under budget.
   */
  private autoAdjustQuality(frameTimeMs: number): void {
    const currentStep = QUALITY_STEPS[this.config.qualityLevel];
    const ADJUSTMENT_COOLDOWN_MS = 2000;

    this.frameTimes.push(frameTimeMs);
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }

    const now = performance.now();
    if (now - this.lastQualityAdjustTime < ADJUSTMENT_COOLDOWN_MS) {
      return;
    }

    const avgFrameTime =
      this.frameTimes.reduce((sum, t) => sum + t, 0) / this.frameTimes.length;

    // Over budget: step down
    if (
      avgFrameTime > currentStep.frameBudgetMs * 1.2 &&
      this.config.qualityLevel > 0
    ) {
      const newLevel = (this.config.qualityLevel - 1) as 0 | 1 | 2 | 3;
      this.applyQualityStep(newLevel);
      this.performanceMetrics.budgetExceeded = true;
      this.lastQualityAdjustTime = now;

      logger.warn('[VolumetricFireRenderer] Quality downgraded', {
        avgFrameTime: avgFrameTime.toFixed(2),
        newLevel: QUALITY_STEPS[newLevel].name,
        newSteps: QUALITY_STEPS[newLevel].raymarchSteps,
      });
    }
    // Under budget: step up
    else if (
      avgFrameTime < currentStep.frameBudgetMs * 0.6 &&
      this.config.qualityLevel < 3
    ) {
      const newLevel = (this.config.qualityLevel + 1) as 0 | 1 | 2 | 3;
      this.applyQualityStep(newLevel);
      this.performanceMetrics.budgetExceeded = false;
      this.lastQualityAdjustTime = now;

      logger.info('[VolumetricFireRenderer] Quality upgraded', {
        avgFrameTime: avgFrameTime.toFixed(2),
        newLevel: QUALITY_STEPS[newLevel].name,
        newSteps: QUALITY_STEPS[newLevel].raymarchSteps,
      });
    }
  }

  // ===========================================================================
  // PRIVATE -- GPU Resource Creation
  // ===========================================================================

  private async createNoiseTexture(): Promise<void> {
    const noiseConfig: NoiseTextureConfig = {
      dimensions: { width: 64, height: 64, depth: 64 },
      type: 'combined',
      format: 'rgba8unorm',
      generateOnGPU: false,
      seamless: true,
    };

    const noiseData = this.generatePerlinNoise3D(noiseConfig);

    this.noiseTexture = this.device.createTexture({
      label: 'fire-noise-3d',
      size: [
        noiseConfig.dimensions.width,
        noiseConfig.dimensions.height,
        noiseConfig.dimensions.depth,
      ],
      format: noiseConfig.format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      dimension: '3d',
    });

    this.device.queue.writeTexture(
      { texture: this.noiseTexture },
      noiseData,
      {
        bytesPerRow: noiseConfig.dimensions.width * 4,
        rowsPerImage: noiseConfig.dimensions.height,
      },
      [
        noiseConfig.dimensions.width,
        noiseConfig.dimensions.height,
        noiseConfig.dimensions.depth,
      ]
    );

    logger.debug('[VolumetricFireRenderer] Noise texture created', noiseConfig.dimensions);
  }

  private generatePerlinNoise3D(config: NoiseTextureConfig): Uint8Array {
    const { width, height, depth } = config.dimensions;
    const data = new Uint8Array(width * height * depth * 4);

    // Improved 3D noise with proper gradient hashing
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (z * height * width + y * width + x) * 4;

          let noise = 0;
          let amplitude = 1.0;
          let frequency = 1.0;
          let maxAmp = 0;

          for (let octave = 0; octave < 4; octave++) {
            const nx = (x / width) * frequency;
            const ny = (y / height) * frequency;
            const nz = (z / depth) * frequency;

            // Improved hash (multiple primes for better distribution)
            const h1 = Math.sin(nx * 127.1 + ny * 311.7 + nz * 74.7) * 43758.5453;
            const h2 = Math.sin(nx * 269.5 + ny * 183.3 + nz * 246.1) * 43758.5453;
            const h3 = Math.sin(nx * 419.2 + ny * 371.9 + nz * 168.2) * 43758.5453;
            const v1 = (h1 - Math.floor(h1)) * 2.0 - 1.0;
            const v2 = (h2 - Math.floor(h2)) * 2.0 - 1.0;
            const v3 = (h3 - Math.floor(h3)) * 2.0 - 1.0;

            noise += v1 * amplitude;
            amplitude *= 0.5;
            frequency *= 2.0;
            maxAmp += amplitude;
          }

          const normalized = Math.floor(((noise / maxAmp + 1.0) * 0.5) * 255);
          const clamped = Math.max(0, Math.min(255, normalized));

          // R: primary noise, G: offset noise, B: high-freq noise, A: 255
          data[idx] = clamped;
          data[idx + 1] = Math.max(0, Math.min(255, (clamped + 64) % 256));
          data[idx + 2] = Math.max(0, Math.min(255, (clamped * 2 + 128) % 256));
          data[idx + 3] = 255;
        }
      }
    }

    return data;
  }

  private async loadShaderCode(): Promise<string> {
    // In a bundled environment, the WGSL file would be imported as a raw string.
    // Here we provide a stub that returns the path for the build system to resolve.
    const shaderPath = new URL('./shaders/volumetric-fire.wgsl', import.meta.url);
    logger.debug('[VolumetricFireRenderer] Loading shader', {
      shaderPath: shaderPath.toString(),
    });

    try {
      const response = await fetch(shaderPath.toString());
      if (response.ok) {
        return await response.text();
      }
    } catch {
      // Fallback: if fetch fails (e.g., in tests), return empty string
      logger.warn('[VolumetricFireRenderer] Shader fetch failed, using stub');
    }

    return '// Shader code loaded by bundler';
  }

  // ===========================================================================
  // PRIVATE -- Placeholder Resources
  // ===========================================================================

  private createPlaceholderDensityView(): GPUTextureView {
    const placeholder = this.device.createTexture({
      label: 'fire-density-placeholder',
      size: [4, 4, 4],
      format: 'rgba16float',
      usage: GPUTextureUsage.TEXTURE_BINDING,
      dimension: '3d',
    });
    return placeholder.createView({ dimension: '3d' });
  }

  private createPlaceholderPrevFrameView(): GPUTextureView {
    const placeholder = this.device.createTexture({
      label: 'fire-prev-frame-placeholder',
      size: [4, 4],
      format: 'bgra8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING,
    });
    return placeholder.createView();
  }

  // ===========================================================================
  // PRIVATE -- Math Utilities
  // ===========================================================================

  private updateVolumeBounds(): void {
    const margin = 1.0;
    this.volumeMin = {
      x: this.fireOrigin.x - this.config.scale.x - margin,
      y: this.fireOrigin.y - this.config.scale.y - margin,
      z: this.fireOrigin.z - this.config.scale.z - margin,
    };
    this.volumeMax = {
      x: this.fireOrigin.x + this.config.scale.x + margin,
      y: this.fireOrigin.y + this.config.scale.y + margin,
      z: this.fireOrigin.z + this.config.scale.z + margin,
    };
  }

  private multiplyMatrices(
    out: Float32Array,
    a: Float32Array,
    b: Float32Array
  ): void {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[i * 4 + k] * b[k * 4 + j];
        }
        out[i * 4 + j] = sum;
      }
    }
  }

  private invertMatrix(m: Float32Array): Float32Array {
    const out = new Float32Array(16);

    // Compute cofactors and determinant for 4x4 matrix inversion
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (Math.abs(det) < 1e-8) {
      // Singular matrix, return identity
      out[0] = out[5] = out[10] = out[15] = 1;
      return out;
    }

    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
  }
}
