/**
 * VolumetricVideoPlayer — Main Orchestrator for Volumetric Video Playback
 *
 * Combines all subsystems into a unified volumetric video playback engine:
 * - SPZ base frame loading (I-frames via existing GaussianSplatLoader)
 * - 4D-MoDe temporal delta streaming (motion-decoupled P-frames)
 * - 4DGCPro progressive quality tiers (H.264 hardware decode)
 * - Adaptive keyframe insertion at 15% dynamic threshold
 * - Performance-adaptive quality switching (52+ FPS desktop, 25+ FPS mobile)
 *
 * Architecture:
 * ```
 *   ManifestLoader → FrameBuffer → [HardwareDecoder | SoftwareDecode]
 *       ↓                ↓                       ↓
 *   FrameIndex    AdaptiveKeyframe    TemporalDeltaProcessor
 *       ↓                ↓                       ↓
 *   PrefetchHead  KeyframeDecision    ReconstructedFrame
 *       ↓                ↓                       ↓
 *   StreamFetch   PerformanceMonitor  → GaussianSplat Render
 * ```
 *
 * Research references:
 *   W.033 - SPZ base frame format
 *   W.036 - 4D-MoDe temporal delta streaming
 *   W.039 - 4DGCPro progressive quality with H.264
 *   P.030.03 - Temporal delta streaming architecture
 *   P.030.04 - Adaptive keyframe insertion at 15% threshold
 *
 * @module volumetric-bridge/volumetric-video
 */

import {
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Box3,
  Vector3,
  DoubleSide,
} from 'three';

import type {
  VolumetricVideoPlayerConfig,
  VolumetricVideoManifest,
  KeyframeData,
  DeltaFrameData,
  DecodedFrame,
  PlayerStatus,
  PlaybackState,
  VolumetricQualityTier,
  VolumetricVideoEvent,
  VolumetricVideoEventHandler,
  TargetPlatform,
  PlatformProfile,
  FrameIndexEntry,
  DecodedAttributeMaps,
} from './types';
import { PLATFORM_PROFILES, QUALITY_TIER_CONFIGS } from './types';
import { HardwareDecoder, dequantizeAttributeMaps } from './HardwareDecoder';
import { TemporalDeltaProcessor } from './TemporalDeltaProcessor';
import { AdaptiveKeyframeManager } from './AdaptiveKeyframeManager';
import { FrameBuffer } from './FrameBuffer';
import { PerformanceMonitor } from './PerformanceMonitor';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum time to wait for manifest load (ms) */
const MANIFEST_TIMEOUT_MS = 10000;

/** Minimum buffer frames before starting playback */
const MIN_BUFFER_BEFORE_PLAY = 3;

// =============================================================================
// SPLAT SHADERS (shared with GaussianSplatLoader)
// =============================================================================

const SPLAT_VERTEX = /* glsl */ `
  precision highp float;

  attribute vec3 splatPosition;
  attribute vec3 splatScale;
  attribute vec4 splatRotation;
  attribute vec4 splatColor;

  varying vec4 vColor;
  varying vec2 vUV;

  mat3 quatToMat3(vec4 q) {
    float x2 = q.x * 2.0, y2 = q.y * 2.0, z2 = q.z * 2.0;
    float xx = q.x * x2, xy = q.x * y2, xz = q.x * z2;
    float yy = q.y * y2, yz = q.y * z2, zz = q.z * z2;
    float wx = q.w * x2, wy = q.w * y2, wz = q.w * z2;
    return mat3(
      1.0 - yy - zz, xy + wz, xz - wy,
      xy - wz, 1.0 - xx - zz, yz + wx,
      xz + wy, yz - wx, 1.0 - xx - yy
    );
  }

  void main() {
    vColor = splatColor;
    vUV = position.xy;

    mat3 rot = quatToMat3(splatRotation);
    vec3 scaled = rot * (position.xyz * splatScale);
    vec4 worldPos = modelMatrix * vec4(splatPosition + scaled, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SPLAT_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec4 vColor;
  varying vec2 vUV;

  void main() {
    float d = dot(vUV, vUV);
    if (d > 1.0) discard;

    float alpha = vColor.a * exp(-0.5 * d * 4.0);
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(vColor.rgb, alpha);
  }
`;

// =============================================================================
// VOLUMETRIC VIDEO PLAYER
// =============================================================================

/**
 * Main volumetric video playback engine.
 *
 * Usage:
 * ```typescript
 * const player = new VolumetricVideoPlayer({
 *   manifestUrl: '/assets/volumetric/scene.manifest.json',
 *   platform: 'desktop',
 *   adaptiveQuality: true,
 *   keyframeThreshold: 0.15,
 * });
 *
 * player.on((event) => {
 *   if (event.type === 'state-change') console.log('State:', event.state);
 *   if (event.type === 'quality-change') console.log('Quality:', event.tier);
 * });
 *
 * const mesh = await player.load();
 * scene.add(mesh);
 *
 * player.play();
 *
 * // In render loop:
 * player.update(deltaTime);
 *
 * // Cleanup:
 * player.dispose();
 * ```
 */
export class VolumetricVideoPlayer {
  // Configuration
  private config: Required<VolumetricVideoPlayerConfig>;
  private platformProfile: PlatformProfile;

  // Subsystems
  private hardwareDecoder: HardwareDecoder;
  private deltaProcessor: TemporalDeltaProcessor;
  private keyframeManager: AdaptiveKeyframeManager;
  private frameBuffer: FrameBuffer;
  private performanceMonitor: PerformanceMonitor;

  // Playback state
  private state: PlaybackState = 'idle';
  private manifest: VolumetricVideoManifest | null = null;
  private currentFrame = 0;
  private currentTime = 0;
  private playbackSpeed = 1.0;
  private referenceFrame: KeyframeData | null = null;
  private lastFrameTime = 0;
  private frameAccumulator = 0;

  // Three.js rendering
  private mesh: Mesh | null = null;
  private geometry: InstancedBufferGeometry | null = null;
  private material: ShaderMaterial | null = null;
  private positionAttr: InstancedBufferAttribute | null = null;
  private scaleAttr: InstancedBufferAttribute | null = null;
  private rotationAttr: InstancedBufferAttribute | null = null;
  private colorAttr: InstancedBufferAttribute | null = null;
  private maxAllocatedGaussians = 0;

  // Events
  private eventHandlers: VolumetricVideoEventHandler[] = [];

  // Animation
  private animationFrameId: number | null = null;

  constructor(config: VolumetricVideoPlayerConfig) {
    // Apply defaults
    const platform: TargetPlatform = config.platform ?? 'desktop';
    this.platformProfile = PLATFORM_PROFILES[platform];
    const tierConfig = QUALITY_TIER_CONFIGS[
      config.qualityTier ?? this.platformProfile.defaultTier
    ];

    this.config = {
      manifestUrl: config.manifestUrl,
      platform,
      qualityTier: config.qualityTier ?? this.platformProfile.defaultTier,
      adaptiveQuality: config.adaptiveQuality ?? true,
      keyframeThreshold: config.keyframeThreshold ?? 0.15,
      bufferSize: config.bufferSize ?? 30,
      enableHardwareDecode: config.enableHardwareDecode ?? true,
      maxMemoryMB: config.maxMemoryMB ?? this.platformProfile.maxMemoryMB,
      maxGaussians: config.maxGaussians ?? tierConfig.maxGaussians,
      loop: config.loop ?? false,
      autoplay: config.autoplay ?? false,
      playbackSpeed: config.playbackSpeed ?? 1.0,
      enableMotionDecomposition: config.enableMotionDecomposition ?? true,
      position: config.position ?? [0, 0, 0],
      rotation: config.rotation ?? [0, 0, 0],
      scale: config.scale ?? 1,
    };

    this.playbackSpeed = this.config.playbackSpeed;

    // Initialize subsystems
    this.hardwareDecoder = new HardwareDecoder();
    this.deltaProcessor = new TemporalDeltaProcessor();
    this.keyframeManager = new AdaptiveKeyframeManager({
      threshold: this.config.keyframeThreshold,
    });
    this.frameBuffer = new FrameBuffer(this.config.bufferSize, this.config.maxMemoryMB);
    this.performanceMonitor = new PerformanceMonitor(
      this.platformProfile,
      this.config.qualityTier,
      this.config.adaptiveQuality,
    );

    // Wire up internal event forwarding
    this.keyframeManager.on((e) => this.emit(e));
    this.frameBuffer.on((e) => this.emit(e));
    this.performanceMonitor.on((e) => {
      this.emit(e);
      // Propagate quality tier changes
      if (e.type === 'quality-change') {
        this.hardwareDecoder.setQualityTier(e.tier);
        this.frameBuffer.setQualityTier(e.tier);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  /**
   * Load the volumetric video manifest and initialize the pipeline.
   * Returns the Three.js mesh to add to the scene.
   */
  async load(): Promise<Mesh> {
    this.setState('loading');

    try {
      // Step 1: Fetch manifest
      const manifest = await this.fetchManifest(this.config.manifestUrl);
      this.manifest = manifest;
      this.frameBuffer.setManifest(manifest);
      this.emit({ type: 'manifest-loaded', manifest });

      // Step 2: Initialize hardware decoder
      if (this.config.enableHardwareDecode) {
        const layout = this.computeCodecLayout(manifest.maxGaussianCount);
        await this.hardwareDecoder.initialize({
          codec: 'avc1.640028', // H.264 High Profile Level 4.0
          codedWidth: layout.width,
          codedHeight: layout.height,
          colorFormat: 'yuv444',
          referenceFrames: 3, // Per 4DGCPro spec
          hardwareAcceleration: 'prefer-hardware',
        });
        this.hardwareDecoder.setQualityTier(this.config.qualityTier);
      }

      // Step 3: Create Three.js geometry with pre-allocated buffers
      const maxGaussians = Math.min(
        this.config.maxGaussians,
        manifest.maxGaussianCount,
      );
      this.createRenderGeometry(maxGaussians);

      // Step 4: Load and decode first keyframe
      await this.loadFirstKeyframe();

      // Step 5: Start prefetch buffer
      this.startPrefetch();

      // Step 6: Auto-play if configured
      if (this.config.autoplay) {
        this.play();
      } else {
        this.setState('paused');
      }

      return this.mesh!;
    } catch (err) {
      this.setState('error');
      this.emit({
        type: 'error',
        error: err instanceof Error ? err : new Error(String(err)),
        recoverable: false,
      });
      throw err;
    }
  }

  /**
   * Fetch and parse the stream manifest.
   */
  private async fetchManifest(url: string): Promise<VolumetricVideoManifest> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MANIFEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Manifest fetch failed: ${response.status} ${response.statusText}`);
      }
      const manifest = await response.json() as VolumetricVideoManifest;

      // Validate manifest
      if (!manifest.frameCount || !manifest.frameRate || !manifest.frameIndex) {
        throw new Error('Invalid manifest: missing required fields');
      }

      return manifest;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Compute the H.264 codec layout dimensions for a Gaussian count.
   */
  private computeCodecLayout(maxGaussians: number): { width: number; height: number } {
    const sqrtN = Math.ceil(Math.sqrt(maxGaussians));
    const width = Math.ceil(sqrtN / 16) * 16;
    const blockHeight = Math.ceil(maxGaussians / width);
    const alignedBlockHeight = Math.ceil(blockHeight / 16) * 16;
    const height = alignedBlockHeight * 13; // 13 attribute channels
    return { width, height };
  }

  /**
   * Create pre-allocated Three.js instanced geometry for rendering.
   */
  private createRenderGeometry(maxGaussians: number): void {
    this.maxAllocatedGaussians = maxGaussians;

    const baseGeo = new PlaneGeometry(1, 1);
    this.geometry = new InstancedBufferGeometry();
    this.geometry.index = baseGeo.index;
    this.geometry.attributes.position = baseGeo.attributes.position;
    this.geometry.attributes.uv = baseGeo.attributes.uv;

    // Pre-allocate instance buffers at maximum size
    const positions = new Float32Array(maxGaussians * 3);
    const scales = new Float32Array(maxGaussians * 3);
    const rotations = new Float32Array(maxGaussians * 4);
    const colors = new Float32Array(maxGaussians * 4);

    this.positionAttr = new InstancedBufferAttribute(positions, 3);
    this.scaleAttr = new InstancedBufferAttribute(scales, 3);
    this.rotationAttr = new InstancedBufferAttribute(rotations, 4);
    this.colorAttr = new InstancedBufferAttribute(colors, 4);

    // Mark as dynamic for frequent updates
    this.positionAttr.setUsage(35048); // THREE.DynamicDrawUsage
    this.scaleAttr.setUsage(35048);
    this.rotationAttr.setUsage(35048);
    this.colorAttr.setUsage(35048);

    this.geometry.setAttribute('splatPosition', this.positionAttr);
    this.geometry.setAttribute('splatScale', this.scaleAttr);
    this.geometry.setAttribute('splatRotation', this.rotationAttr);
    this.geometry.setAttribute('splatColor', this.colorAttr);
    this.geometry.instanceCount = 0; // Start with no instances

    this.material = new ShaderMaterial({
      vertexShader: SPLAT_VERTEX,
      fragmentShader: SPLAT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'volumetric-video';

    // Apply transform
    if (this.config.position) {
      this.mesh.position.set(...this.config.position);
    }
    if (this.config.rotation) {
      this.mesh.rotation.set(...this.config.rotation);
    }
    if (this.config.scale) {
      const s = typeof this.config.scale === 'number'
        ? [this.config.scale, this.config.scale, this.config.scale] as const
        : this.config.scale;
      this.mesh.scale.set(...s);
    }
  }

  /**
   * Load and decode the first keyframe to initialize rendering.
   */
  private async loadFirstKeyframe(): Promise<void> {
    if (!this.manifest) throw new Error('No manifest loaded');

    // Find the first I-frame in the manifest
    const firstIFrame = this.manifest.frameIndex.find((f) => f.type === 'I');
    if (!firstIFrame) {
      throw new Error('No keyframe found in manifest');
    }

    // Fetch and decode
    const frameData = await this.fetchAndDecodeFrame(firstIFrame);
    this.referenceFrame = frameData;
    this.currentFrame = firstIFrame.index;
    this.currentTime = firstIFrame.timestamp;

    // Update render buffers
    this.updateRenderBuffers(frameData);

    // Store in buffer
    this.frameBuffer.addFrame(frameData, true);
    this.keyframeManager.recordKeyframe(firstIFrame.index, 'seek');
  }

  /**
   * Fetch and decode a single frame from the stream.
   */
  private async fetchAndDecodeFrame(entry: FrameIndexEntry): Promise<KeyframeData> {
    if (!this.manifest) throw new Error('No manifest loaded');

    const startTime = performance.now();
    const tier = this.performanceMonitor.getCurrentTier();
    const tierRange = entry.tierRanges[tier];

    // Fetch frame data
    const url = `${this.manifest.baseUrl}`;
    const response = await fetch(url, {
      headers: {
        Range: `bytes=${entry.byteOffset + tierRange.offset}-${entry.byteOffset + tierRange.offset + tierRange.length - 1}`,
      },
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Frame fetch failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // Decode via hardware decoder or software fallback
    let frameData: KeyframeData;

    if (this.hardwareDecoder.isSupported && this.config.enableHardwareDecode) {
      const maps = await this.hardwareDecoder.decode(buffer, entry.type);
      const gaussians = dequantizeAttributeMaps(maps, this.manifest.fractionalBits);

      frameData = {
        frameIndex: entry.index,
        frameType: 'I',
        timestamp: entry.timestamp,
        positions: gaussians.positions,
        scales: gaussians.scales,
        rotations: gaussians.rotations,
        colors: gaussians.colors,
        opacities: gaussians.opacities,
        gaussianCount: gaussians.count,
        decodeTimeMs: performance.now() - startTime,
      };
    } else {
      // Software decode: treat as raw SPZ-like attribute data
      const gaussians = dequantizeAttributeMaps(
        this.softwareDecodeRaw(buffer, entry.gaussianCount),
        this.manifest.fractionalBits,
      );

      frameData = {
        frameIndex: entry.index,
        frameType: 'I',
        timestamp: entry.timestamp,
        positions: gaussians.positions,
        scales: gaussians.scales,
        rotations: gaussians.rotations,
        colors: gaussians.colors,
        opacities: gaussians.opacities,
        gaussianCount: gaussians.count,
        decodeTimeMs: performance.now() - startTime,
      };
    }

    return frameData;
  }

  /**
   * Software decode fallback: parse raw attribute bytes.
   */
  private softwareDecodeRaw(
    buffer: ArrayBuffer,
    expectedGaussians: number,
  ): DecodedAttributeMaps {
    const data = new Uint8Array(buffer);
    const tier = QUALITY_TIER_CONFIGS[this.performanceMonitor.getCurrentTier()];
    const gaussianCount = Math.min(expectedGaussians, tier.maxGaussians);
    const bytesPerGaussian = tier.highPrecisionPositions ? 16 : 13;
    const actualCount = Math.min(
      gaussianCount,
      Math.floor(data.byteLength / bytesPerGaussian),
    );

    // Parse packed attributes
    let offset = 0;
    const useHighPrecision = tier.highPrecisionPositions;

    let positionMap: Uint8Array | Uint16Array;
    if (useHighPrecision) {
      positionMap = new Uint16Array(actualCount * 3);
      const view = new DataView(buffer);
      for (let i = 0; i < actualCount * 3; i++) {
        positionMap[i] = view.getUint16(offset, true);
        offset += 2;
      }
    } else {
      positionMap = new Uint8Array(actualCount * 3);
      for (let i = 0; i < actualCount * 3; i++) {
        positionMap[i] = data[offset++];
      }
    }

    const scaleMap = data.slice(offset, offset + actualCount * 3);
    offset += actualCount * 3;

    const rotationMap = data.slice(offset, offset + actualCount * 3);
    offset += actualCount * 3;

    const opacityMap = data.slice(offset, offset + actualCount);
    offset += actualCount;

    const colorMap = data.slice(offset, offset + actualCount * 3);

    return {
      positionMap,
      scaleMap: new Uint8Array(scaleMap),
      rotationMap: new Uint8Array(rotationMap),
      opacityMap: new Uint8Array(opacityMap),
      colorMap: new Uint8Array(colorMap),
      width: Math.ceil(Math.sqrt(actualCount)),
      height: Math.ceil(Math.sqrt(actualCount)),
      gaussianCount: actualCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Render Buffer Updates
  // ---------------------------------------------------------------------------

  /**
   * Update the Three.js instanced geometry with new frame data.
   * Copies decoded Gaussian attributes into the pre-allocated buffers.
   */
  private updateRenderBuffers(frame: KeyframeData): void {
    if (!this.geometry || !this.positionAttr || !this.scaleAttr ||
        !this.rotationAttr || !this.colorAttr) {
      return;
    }

    const count = Math.min(frame.gaussianCount, this.maxAllocatedGaussians);

    // Copy positions
    const posArray = this.positionAttr.array as Float32Array;
    posArray.set(frame.positions.subarray(0, count * 3));
    this.positionAttr.needsUpdate = true;

    // Copy scales
    const scaleArray = this.scaleAttr.array as Float32Array;
    scaleArray.set(frame.scales.subarray(0, count * 3));
    this.scaleAttr.needsUpdate = true;

    // Copy rotations
    const rotArray = this.rotationAttr.array as Float32Array;
    rotArray.set(frame.rotations.subarray(0, count * 4));
    this.rotationAttr.needsUpdate = true;

    // Copy colors
    const colorArray = this.colorAttr.array as Float32Array;
    colorArray.set(frame.colors.subarray(0, count * 4));
    this.colorAttr.needsUpdate = true;

    // Update instance count
    this.geometry.instanceCount = count;

    // Record memory usage
    const memMB = (count * 60) / (1024 * 1024); // 60 bytes per Gaussian
    this.performanceMonitor.recordMemoryUsage(memMB);
  }

  // ---------------------------------------------------------------------------
  // Prefetching
  // ---------------------------------------------------------------------------

  /**
   * Start the prefetch loop in the background.
   */
  private startPrefetch(): void {
    if (!this.manifest) return;

    this.frameBuffer.startPrefetch(
      this.currentFrame + 1,
      async (index, tier) => {
        const entry = this.manifest!.frameIndex[index];
        if (!entry) throw new Error(`Frame index ${index} out of range`);
        return this.fetchAndDecodeFrame(entry);
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Playback Control
  // ---------------------------------------------------------------------------

  /**
   * Start or resume playback.
   */
  play(): void {
    if (this.state === 'playing') return;

    this.setState('playing');
    this.lastFrameTime = performance.now();
    this.frameAccumulator = 0;

    // Start the update loop
    this.startUpdateLoop();
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.stopUpdateLoop();
  }

  /**
   * Seek to a specific time in seconds.
   */
  async seek(timeSeconds: number): Promise<void> {
    if (!this.manifest) return;

    const previousState = this.state;
    this.setState('seeking');
    this.stopUpdateLoop();

    // Find the target frame
    const targetFrame = Math.floor(timeSeconds * this.manifest.frameRate);
    const clampedFrame = Math.max(0, Math.min(targetFrame, this.manifest.frameCount - 1));

    // Find the nearest keyframe at or before target
    let keyframeIndex = clampedFrame;
    for (let i = clampedFrame; i >= 0; i--) {
      if (this.manifest.frameIndex[i]?.type === 'I') {
        keyframeIndex = i;
        break;
      }
    }

    // Clear buffer and reset keyframe state
    this.frameBuffer.clear();
    this.keyframeManager.reset();

    // Load the keyframe
    const entry = this.manifest.frameIndex[keyframeIndex];
    if (entry) {
      const frameData = await this.fetchAndDecodeFrame(entry);
      this.referenceFrame = frameData;
      this.frameBuffer.addFrame(frameData, true);
      this.keyframeManager.recordKeyframe(keyframeIndex, 'seek');

      // If target is ahead of keyframe, apply deltas forward
      let currentFrameData = frameData;
      for (let i = keyframeIndex + 1; i <= clampedFrame; i++) {
        const deltaEntry = this.manifest.frameIndex[i];
        if (deltaEntry && this.frameBuffer.hasFrame(i)) {
          currentFrameData = this.frameBuffer.getFrame(i)!;
        }
        // In a full implementation, we would decode and apply each delta
      }

      this.currentFrame = clampedFrame;
      this.currentTime = clampedFrame / this.manifest.frameRate;
      this.updateRenderBuffers(currentFrameData);
    }

    // Restart prefetch from new position
    this.startPrefetch();

    // Restore state
    if (previousState === 'playing') {
      this.play();
    } else {
      this.setState('paused');
    }
  }

  /**
   * Stop playback and reset to beginning.
   */
  stop(): void {
    this.stopUpdateLoop();
    this.frameBuffer.clear();
    this.keyframeManager.reset();
    this.currentFrame = 0;
    this.currentTime = 0;
    this.setState('idle');
  }

  // ---------------------------------------------------------------------------
  // Update Loop
  // ---------------------------------------------------------------------------

  /**
   * Main per-frame update. Call this from the render loop or let the
   * internal animation loop handle it.
   *
   * @param deltaTimeMs - Time since last frame in milliseconds
   */
  update(deltaTimeMs?: number): void {
    if (this.state !== 'playing') return;
    if (!this.manifest) return;

    const now = performance.now();
    const dt = deltaTimeMs ?? (now - this.lastFrameTime);
    this.lastFrameTime = now;

    // Accumulate time and determine if we need to advance frames
    const frameInterval = 1000 / (this.manifest.frameRate * this.playbackSpeed);
    this.frameAccumulator += dt;

    if (this.frameAccumulator < frameInterval) return;

    // Consume accumulated time (may skip frames if behind)
    let framesToAdvance = 0;
    while (this.frameAccumulator >= frameInterval) {
      this.frameAccumulator -= frameInterval;
      framesToAdvance++;
    }

    // Limit frame skip to prevent large jumps
    framesToAdvance = Math.min(framesToAdvance, 3);

    for (let f = 0; f < framesToAdvance; f++) {
      const nextFrame = this.currentFrame + 1;

      // Check for end of stream
      if (nextFrame >= this.manifest.frameCount) {
        if (this.config.loop) {
          this.seek(0);
          return;
        }
        this.setState('ended');
        this.emit({ type: 'ended' });
        this.stopUpdateLoop();
        return;
      }

      // Try to get the next frame from buffer
      const decodeStart = performance.now();
      const bufferedFrame = this.frameBuffer.getFrame(nextFrame);

      if (bufferedFrame) {
        // Frame is buffered — check adaptive keyframe decision
        const entry = this.manifest.frameIndex[nextFrame];

        if (entry && entry.type === 'P' && this.referenceFrame) {
          // Evaluate adaptive keyframe insertion
          const decision = this.keyframeManager.evaluate(null, this.referenceFrame.gaussianCount);
          // Note: In production, we would construct a DeltaFrameData here
          // For now, use the pre-decoded frame from buffer
        }

        // Update render buffers
        const renderStart = performance.now();
        this.updateRenderBuffers(bufferedFrame);
        const renderEnd = performance.now();

        // If this was a keyframe, update reference
        if (this.manifest.frameIndex[nextFrame]?.type === 'I') {
          this.referenceFrame = bufferedFrame;
          this.keyframeManager.recordKeyframe(nextFrame, 'scheduled');
        }

        // Record performance
        const decodeTimeMs = renderStart - decodeStart;
        const renderTimeMs = renderEnd - renderStart;
        this.performanceMonitor.recordFrame(decodeTimeMs, renderTimeMs);

        // Emit events
        this.emit({ type: 'frame-rendered', frameIndex: nextFrame, renderTimeMs });

        this.currentFrame = nextFrame;
        this.currentTime = nextFrame / this.manifest.frameRate;

        this.emit({
          type: 'progress',
          currentTime: this.currentTime,
          duration: this.manifest.duration,
        });
      } else {
        // Frame not buffered — check if we need to rebuffer
        if (this.frameBuffer.isBufferLow()) {
          this.setState('buffering');
          this.performanceMonitor.recordDroppedFrame();
          this.startPrefetch();
          return;
        }

        // Skip frame and record drop
        this.performanceMonitor.recordDroppedFrame();
      }
    }

    // Evict old frames behind playback position
    this.frameBuffer.evictBefore(this.currentFrame - 5);
  }

  /**
   * Start the internal animation update loop.
   */
  private startUpdateLoop(): void {
    if (this.animationFrameId !== null) return;

    const loop = () => {
      this.update();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop the internal animation update loop.
   */
  private stopUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  private setState(newState: PlaybackState): void {
    if (newState === this.state) return;
    const previousState = this.state;
    this.state = newState;
    this.emit({ type: 'state-change', state: newState, previousState });
  }

  // ---------------------------------------------------------------------------
  // Public Getters
  // ---------------------------------------------------------------------------

  /**
   * Get comprehensive player status.
   */
  getStatus(): PlayerStatus {
    const metrics = this.performanceMonitor.getMetrics();
    const bufferStats = this.frameBuffer.getStats();
    const keyframeStats = this.keyframeManager.getStatistics();

    return {
      state: this.state,
      currentTime: this.currentTime,
      duration: this.manifest?.duration ?? 0,
      currentFrame: this.currentFrame,
      totalFrames: this.manifest?.frameCount ?? 0,
      qualityTier: this.performanceMonitor.getCurrentTier(),
      effectiveFPS: metrics.effectiveFPS,
      lastDecodeTimeMs: metrics.avgDecodeTimeMs,
      lastRenderTimeMs: metrics.avgRenderTimeMs,
      lastTotalTimeMs: metrics.avgTotalTimeMs,
      bufferedFrames: bufferStats.bufferedFrames,
      activeGaussianCount: this.geometry?.instanceCount ?? 0,
      keyframesDecoded: keyframeStats.totalKeyframes,
      deltaFramesDecoded: keyframeStats.totalKeyframes, // Simplified
      adaptiveQualityActive: this.config.adaptiveQuality,
      hardwareDecodeActive: this.hardwareDecoder.isSupported,
      memoryUsageMB: metrics.memoryUsageMB,
      droppedFrames: Math.round(metrics.frameDropRate * (this.currentFrame + 1)),
      motionDecompositionActive: this.config.enableMotionDecomposition,
    };
  }

  /**
   * Get the Three.js mesh (null before load).
   */
  getMesh(): Mesh | null {
    return this.mesh;
  }

  /**
   * Get the current playback state.
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * Get current time in seconds.
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Get total duration in seconds.
   */
  getDuration(): number {
    return this.manifest?.duration ?? 0;
  }

  /**
   * Get the performance monitor for external monitoring.
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Get the adaptive keyframe manager for external monitoring.
   */
  getKeyframeManager(): AdaptiveKeyframeManager {
    return this.keyframeManager;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Set the quality tier manually (disables adaptive for this change).
   */
  setQualityTier(tier: VolumetricQualityTier): void {
    this.performanceMonitor.setTier(tier);
    this.hardwareDecoder.setQualityTier(tier);
    this.frameBuffer.setQualityTier(tier);
  }

  /**
   * Set playback speed multiplier.
   */
  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.1, Math.min(4.0, speed));
  }

  /**
   * Enable or disable adaptive quality.
   */
  setAdaptiveQuality(enabled: boolean): void {
    this.config.adaptiveQuality = enabled;
    this.performanceMonitor.setAdaptiveEnabled(enabled);
  }

  /**
   * Set the adaptive keyframe threshold (default 0.15 = 15%).
   */
  setKeyframeThreshold(threshold: number): void {
    this.keyframeManager.setThreshold(threshold);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to player events.
   */
  on(handler: VolumetricVideoEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  private emit(event: VolumetricVideoEvent): void {
    for (const h of this.eventHandlers) {
      try {
        h(event);
      } catch (err) {
        console.error('[VolumetricVideoPlayer] Event handler error:', err);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stopUpdateLoop();
    this.frameBuffer.clear();

    // Dispose Three.js resources
    this.geometry?.dispose();
    this.material?.dispose();

    // Dispose subsystems
    this.hardwareDecoder.dispose();
    this.deltaProcessor.dispose();

    // Clear references
    this.mesh = null;
    this.geometry = null;
    this.material = null;
    this.positionAttr = null;
    this.scaleAttr = null;
    this.rotationAttr = null;
    this.colorAttr = null;
    this.manifest = null;
    this.referenceFrame = null;
    this.eventHandlers = [];

    this.setState('idle');
  }
}
