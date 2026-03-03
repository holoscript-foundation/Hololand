/**
 * PerformanceAdapter - Adaptive quality management for mobile devices
 *
 * Detects GPU capabilities, classifies device tier, recommends quality presets,
 * monitors frame rate, and handles WebGPU-to-WebGL fallback detection.
 *
 * Designed to work with the HoloLand renderer quality system to ensure
 * smooth VR/AR experiences across a range of mobile hardware.
 */

// =============================================================================
// TYPES
// =============================================================================

/** Device GPU performance tier */
export type GPUTier = 'low' | 'mid' | 'high';

/** Graphics API backend */
export type GraphicsBackend = 'webgpu' | 'webgl2' | 'webgl1';

/** Recommended quality preset for mobile rendering */
export interface MobileQualityPreset {
  /** Device tier classification */
  tier: GPUTier;
  /** Maximum Gaussian splat budget (for 3DGS rendering) */
  gaussianBudget: number;
  /** Maximum texture resolution (width/height in pixels) */
  textureResolution: number;
  /** Shadow quality level */
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  /** Whether post-processing effects are enabled */
  postProcessingEnabled: boolean;
  /** Target frames per second */
  targetFPS: number;
  /** Pixel ratio multiplier (relative to device pixel ratio) */
  pixelRatio: number;
  /** Maximum polygon count for scene */
  maxPolyCount: number;
  /** Whether bloom effect is enabled */
  bloomEnabled: boolean;
  /** Antialiasing mode */
  antialiasing: 'none' | 'fxaa';
  /** Recommended graphics backend */
  graphicsBackend: GraphicsBackend;
}

/** GPU detection result */
export interface GPUDetectionResult {
  /** Detected GPU tier */
  tier: GPUTier;
  /** Raw WebGL renderer string */
  rendererString: string;
  /** Raw WebGL vendor string */
  vendorString: string;
  /** Maximum texture size supported */
  maxTextureSize: number;
  /** Maximum render buffer size */
  maxRenderBufferSize: number;
  /** Number of vertex texture image units */
  maxVertexTextureUnits: number;
  /** Whether WebGPU is available */
  webgpuAvailable: boolean;
  /** Available graphics backend */
  graphicsBackend: GraphicsBackend;
}

/** Frame rate monitor callback */
export type FrameRateCallback = (fps: number, averageFps: number, dropped: boolean) => void;

// =============================================================================
// GPU TIER CLASSIFICATION PATTERNS
// =============================================================================

/** Known low-end GPU patterns (mobile/integrated) */
const LOW_TIER_PATTERNS = [
  'mali-4', 'mali-t6', 'mali-t7',
  'adreno 3', 'adreno 4', 'adreno 5',
  'powervr sgx', 'powervr rogue ge',
  'intel hd graphics',
  'tegra 3', 'tegra 4',
  'vivante',
  'videocore',
];

/** Known mid-tier GPU patterns */
const MID_TIER_PATTERNS = [
  'mali-g5', 'mali-g7',
  'adreno 6', 'adreno 7',
  'apple a1', // A10-A14
  'powervr gm',
  'intel uhd',
  'intel iris',
  'mali-g610', 'mali-g710',
];

/** Known high-tier GPU patterns */
const HIGH_TIER_PATTERNS = [
  'apple a15', 'apple a16', 'apple a17',
  'apple m1', 'apple m2', 'apple m3', 'apple m4',
  'adreno 730', 'adreno 740', 'adreno 750',
  'mali-g715', 'mali-g720',
  'apple gpu', // Generic Apple GPU (Safari reports this)
  'xclipse',
];

// =============================================================================
// QUALITY PRESETS PER TIER
// =============================================================================

const TIER_PRESETS: Record<GPUTier, Omit<MobileQualityPreset, 'tier' | 'graphicsBackend'>> = {
  low: {
    gaussianBudget: 100_000,
    textureResolution: 512,
    shadowQuality: 'off',
    postProcessingEnabled: false,
    targetFPS: 30,
    pixelRatio: 0.667,
    maxPolyCount: 30_000,
    bloomEnabled: false,
    antialiasing: 'none',
  },
  mid: {
    gaussianBudget: 500_000,
    textureResolution: 1024,
    shadowQuality: 'low',
    postProcessingEnabled: false,
    targetFPS: 60,
    pixelRatio: 0.85,
    maxPolyCount: 100_000,
    bloomEnabled: false,
    antialiasing: 'fxaa',
  },
  high: {
    gaussianBudget: 2_000_000,
    textureResolution: 2048,
    shadowQuality: 'medium',
    postProcessingEnabled: true,
    targetFPS: 60,
    pixelRatio: 1.0,
    maxPolyCount: 300_000,
    bloomEnabled: true,
    antialiasing: 'fxaa',
  },
};

// =============================================================================
// PERFORMANCE ADAPTER
// =============================================================================

export class PerformanceAdapter {
  private gpuResult: GPUDetectionResult | null = null;
  private currentPreset: MobileQualityPreset | null = null;

  // Frame rate monitoring state
  private monitorActive = false;
  private monitorRafId: number | null = null;
  private frameTimestamps: number[] = [];
  private fpsHistory: number[] = [];
  private monitorCallback: FrameRateCallback | null = null;
  private readonly FPS_SAMPLE_WINDOW = 60; // frames to average over
  private readonly FPS_REPORT_INTERVAL = 1000; // report every 1s
  private lastReportTime = 0;

  // Auto-downgrade state
  private autoDowngradeEnabled = true;
  private downgradeThresholdFPS = 24; // below this, trigger downgrade
  private downgradeCooldownMs = 5000; // wait between downgrades
  private lastDowngradeTime = 0;

  /**
   * Detect the GPU tier of the current device.
   * Analyzes WebGL renderer string, max texture size, and WebGPU availability
   * to classify the device as low, mid, or high tier.
   *
   * @returns GPUDetectionResult with tier classification and raw GPU data
   */
  async detectGPUTier(): Promise<GPUDetectionResult> {
    let rendererString = 'unknown';
    let vendorString = 'unknown';
    let maxTextureSize = 2048;
    let maxRenderBufferSize = 2048;
    let maxVertexTextureUnits = 0;
    let graphicsBackend: GraphicsBackend = 'webgl1';

    // Attempt WebGL2 first, then fall back to WebGL1
    const canvas = document.createElement('canvas');
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;

    gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (gl) {
      graphicsBackend = 'webgl2';
    } else {
      gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      if (gl) {
        graphicsBackend = 'webgl1';
      }
    }

    if (gl) {
      // Extract debug renderer info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        rendererString = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
        vendorString = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
      }

      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
      maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 2048;
      maxVertexTextureUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) || 0;
    }

    // Check WebGPU availability
    const webgpuAvailable = await this.checkWebGPUAvailability();
    if (webgpuAvailable) {
      graphicsBackend = 'webgpu';
    }

    // Classify GPU tier
    const tier = this.classifyGPUTier(rendererString, maxTextureSize);

    // Clean up the temporary canvas
    canvas.width = 0;
    canvas.height = 0;

    this.gpuResult = {
      tier,
      rendererString,
      vendorString,
      maxTextureSize,
      maxRenderBufferSize,
      maxVertexTextureUnits,
      webgpuAvailable,
      graphicsBackend,
    };

    console.info('[PerformanceAdapter] GPU detected:', {
      tier,
      renderer: rendererString,
      vendor: vendorString,
      maxTexture: maxTextureSize,
      backend: graphicsBackend,
    });

    return this.gpuResult;
  }

  /**
   * Get recommended quality preset for the detected device.
   * Must call detectGPUTier() first, or this will auto-detect.
   *
   * @returns MobileQualityPreset with all rendering parameters tuned for the device
   */
  async getRecommendedQuality(): Promise<MobileQualityPreset> {
    if (!this.gpuResult) {
      await this.detectGPUTier();
    }

    const tier = this.gpuResult!.tier;
    const tierPreset = TIER_PRESETS[tier];

    this.currentPreset = {
      ...tierPreset,
      tier,
      graphicsBackend: this.gpuResult!.graphicsBackend,
    };

    console.info('[PerformanceAdapter] Quality preset:', {
      tier,
      backend: this.currentPreset.graphicsBackend,
      gaussianBudget: this.currentPreset.gaussianBudget,
      textureRes: this.currentPreset.textureResolution,
      targetFPS: this.currentPreset.targetFPS,
    });

    return this.currentPreset;
  }

  /**
   * Start monitoring frame rate using requestAnimationFrame timing.
   * Reports FPS via the callback and automatically downgrades quality
   * if sustained frame drops are detected.
   *
   * @param callback - Invoked with current FPS, rolling average FPS, and drop flag
   * @returns Stop function to halt monitoring
   */
  monitorFrameRate(callback: FrameRateCallback): () => void {
    if (this.monitorActive) {
      console.warn('[PerformanceAdapter] Frame rate monitor already active.');
      return () => this.stopMonitor();
    }

    this.monitorActive = true;
    this.monitorCallback = callback;
    this.frameTimestamps = [];
    this.fpsHistory = [];
    this.lastReportTime = performance.now();

    const tick = (timestamp: number) => {
      if (!this.monitorActive) return;

      this.frameTimestamps.push(timestamp);

      // Keep only the last N frames for FPS calculation
      if (this.frameTimestamps.length > this.FPS_SAMPLE_WINDOW + 1) {
        this.frameTimestamps.shift();
      }

      // Report at the specified interval
      const now = performance.now();
      if (now - this.lastReportTime >= this.FPS_REPORT_INTERVAL) {
        this.lastReportTime = now;
        this.reportFrameRate();
      }

      this.monitorRafId = requestAnimationFrame(tick);
    };

    this.monitorRafId = requestAnimationFrame(tick);

    return () => this.stopMonitor();
  }

  /**
   * Get the last detected GPU information.
   * Returns null if detectGPUTier() has not been called yet.
   */
  getGPUInfo(): GPUDetectionResult | null {
    return this.gpuResult;
  }

  /**
   * Get the current quality preset.
   * Returns null if getRecommendedQuality() has not been called yet.
   */
  getCurrentPreset(): MobileQualityPreset | null {
    return this.currentPreset;
  }

  /**
   * Enable or disable automatic quality downgrade on frame drops.
   */
  setAutoDowngrade(enabled: boolean): void {
    this.autoDowngradeEnabled = enabled;
  }

  /**
   * Clean up resources. Stops frame rate monitoring.
   */
  dispose(): void {
    this.stopMonitor();
    this.gpuResult = null;
    this.currentPreset = null;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Check if WebGPU is available on this device.
   */
  private async checkWebGPUAvailability(): Promise<boolean> {
    try {
      if (typeof navigator === 'undefined') return false;

      const nav = navigator as Navigator & { gpu?: GPU };
      if (!nav.gpu) return false;

      const adapter = await nav.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  /**
   * Classify GPU tier from renderer string and max texture size.
   */
  private classifyGPUTier(rendererString: string, maxTextureSize: number): GPUTier {
    const lower = rendererString.toLowerCase();

    // Check high-tier patterns first
    if (HIGH_TIER_PATTERNS.some((p) => lower.includes(p))) {
      return 'high';
    }

    // Check mid-tier patterns
    if (MID_TIER_PATTERNS.some((p) => lower.includes(p))) {
      return 'mid';
    }

    // Check low-tier patterns
    if (LOW_TIER_PATTERNS.some((p) => lower.includes(p))) {
      return 'low';
    }

    // Fallback: classify by max texture size as a proxy for GPU capability
    if (maxTextureSize >= 8192) {
      return 'high';
    } else if (maxTextureSize >= 4096) {
      return 'mid';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate and report current frame rate.
   */
  private reportFrameRate(): void {
    if (this.frameTimestamps.length < 2) return;

    // Calculate FPS from timestamps
    const oldest = this.frameTimestamps[0];
    const newest = this.frameTimestamps[this.frameTimestamps.length - 1];
    const elapsed = newest - oldest;

    if (elapsed <= 0) return;

    const currentFPS = Math.round(((this.frameTimestamps.length - 1) / elapsed) * 1000);

    // Track FPS history for rolling average
    this.fpsHistory.push(currentFPS);
    if (this.fpsHistory.length > 30) {
      this.fpsHistory.shift();
    }

    const averageFPS = Math.round(
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length,
    );

    // Detect if FPS has dropped significantly below target
    const targetFPS = this.currentPreset?.targetFPS ?? 60;
    const dropped = currentFPS < targetFPS * 0.7;

    // Report to callback
    if (this.monitorCallback) {
      this.monitorCallback(currentFPS, averageFPS, dropped);
    }

    // Auto-downgrade if enabled and FPS is critically low
    if (this.autoDowngradeEnabled && dropped && averageFPS < this.downgradeThresholdFPS) {
      this.attemptQualityDowngrade();
    }
  }

  /**
   * Attempt to downgrade quality preset when performance is poor.
   */
  private attemptQualityDowngrade(): void {
    const now = performance.now();
    if (now - this.lastDowngradeTime < this.downgradeCooldownMs) return;
    if (!this.currentPreset) return;

    const tierOrder: GPUTier[] = ['high', 'mid', 'low'];
    const currentIndex = tierOrder.indexOf(this.currentPreset.tier);

    if (currentIndex < tierOrder.length - 1) {
      const newTier = tierOrder[currentIndex + 1];
      const newPreset = TIER_PRESETS[newTier];

      this.currentPreset = {
        ...newPreset,
        tier: newTier,
        graphicsBackend: this.currentPreset.graphicsBackend,
      };

      this.lastDowngradeTime = now;

      console.warn('[PerformanceAdapter] Auto-downgraded quality', {
        from: tierOrder[currentIndex],
        to: newTier,
        newTargetFPS: this.currentPreset.targetFPS,
      });
    }
  }

  /**
   * Stop the frame rate monitor.
   */
  private stopMonitor(): void {
    this.monitorActive = false;
    if (this.monitorRafId !== null) {
      cancelAnimationFrame(this.monitorRafId);
      this.monitorRafId = null;
    }
    this.monitorCallback = null;
    this.frameTimestamps = [];
    this.fpsHistory = [];
  }
}
