/**
 * VR Performance Degradation Manager
 *
 * Implements graceful degradation system for VR rendering targeting 90fps (11.1ms frame budget).
 * Automatically adjusts quality settings based on frame time measurements to eliminate stuttering
 * and motion sickness events.
 *
 * CRITICAL VR REQUIREMENTS:
 * - Target: 90fps (11.1ms frame budget) for comfort
 * - Motion-to-photon latency: <20ms
 * - Frame time consistency: Minimize jank (frame time spikes)
 * - Quality levels: 5 progressive degradation levels (0-4)
 *
 * @module VRPerformanceDegradationManager
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Quality levels for VR rendering (0 = highest quality, 4 = maximum performance)
 */
export enum QualityLevel {
  /** Level 0: Full Quality - All effects enabled */
  FULL_QUALITY = 0,
  /** Level 1: Reduced Shadows - Shadow resolution 50%, disable ambient occlusion */
  REDUCED_SHADOWS = 1,
  /** Level 2: Reduced Textures - Texture LOD bias +1, aggressive mipmapping */
  REDUCED_TEXTURES = 2,
  /** Level 3: Disable Post-Processing - Remove bloom, DOF, motion blur, chromatic aberration */
  NO_POST_PROCESSING = 3,
  /** Level 4: Simplify Geometry - Switch to LOD2 models, reduce particle counts 75% */
  SIMPLIFIED_GEOMETRY = 4,
}

/**
 * Quality level configuration
 */
export interface QualityLevelConfig {
  /** Quality level */
  level: QualityLevel;
  /** Human-readable name */
  name: string;
  /** Description of optimizations at this level */
  description: string;
  /** Estimated performance improvement percentage */
  performanceGain: number;
  /** Settings applied at this level */
  settings: QualitySettings;
}

/**
 * Rendering quality settings
 */
export interface QualitySettings {
  // Shadows
  shadowsEnabled: boolean;
  shadowResolution: number; // 512, 1024, 2048, 4096
  shadowCascades: number;
  ambientOcclusionEnabled: boolean;

  // Textures
  textureLODBias: number; // 0 = full quality, +1 = half res, +2 = quarter res
  anisotropicFiltering: number; // 1, 2, 4, 8, 16
  mipmapBias: number;

  // Post-processing
  bloomEnabled: boolean;
  depthOfFieldEnabled: boolean;
  motionBlurEnabled: boolean;
  chromaticAberrationEnabled: boolean;
  vignetteEnabled: boolean;
  colorGradingEnabled: boolean;

  // Geometry
  lodBias: number; // 0 = full detail, 1 = LOD1, 2 = LOD2
  particleQuality: number; // 0-1, percentage of max particles
  meshSimplification: number; // 0-1, percentage of original triangles

  // Rendering
  pixelRatio: number; // 0.5-2.0, render resolution multiplier
  antialiasingMode: 'none' | 'fxaa' | 'smaa' | 'msaa2x' | 'msaa4x';
  maxLights: number;
}

/**
 * Frame time statistics
 */
export interface FrameTimeStats {
  /** Current frame time in ms */
  current: number;
  /** Average frame time over monitoring window */
  average: number;
  /** Minimum frame time */
  min: number;
  /** Maximum frame time */
  max: number;
  /** 95th percentile frame time */
  p95: number;
  /** 99th percentile frame time */
  p99: number;
  /** Number of frames that exceeded target */
  jankFrames: number;
  /** Total frames measured */
  totalFrames: number;
}

/**
 * Degradation manager configuration
 */
export interface DegradationConfig {
  /** Target frame time in ms (default: 11.1ms for 90fps) */
  targetFrameTime: number;
  /** FPS threshold for triggering escalation (default: 85fps) */
  escalationThreshold: number;
  /** FPS threshold for de-escalation (default: 92fps) */
  deEscalationThreshold: number;
  /** Duration in seconds to sustain low FPS before escalating (default: 5) */
  escalationDuration: number;
  /** Duration in seconds to sustain high FPS before de-escalating (default: 30) */
  deEscalationDuration: number;
  /** Enable automatic quality adjustment (default: true) */
  autoAdjust: boolean;
  /** User-locked quality level (overrides auto-adjust if set) */
  userLockedLevel: QualityLevel | null;
  /** Monitoring window size in frames (default: 300 = ~3.3s at 90fps) */
  monitoringWindow: number;
  /** Enable telemetry tracking (default: true) */
  enableTelemetry: boolean;
}

/**
 * Telemetry event for degradation changes
 */
export interface DegradationEvent {
  timestamp: number;
  event: 'escalation' | 'de-escalation' | 'user-override' | 'auto-adjust-enabled' | 'auto-adjust-disabled';
  fromLevel: QualityLevel;
  toLevel: QualityLevel;
  reason: string;
  frameStats: FrameTimeStats;
}

/**
 * Degradation metrics
 */
export interface DegradationMetrics {
  /** Current quality level */
  currentLevel: QualityLevel;
  /** Frame time statistics */
  frameStats: FrameTimeStats;
  /** Total escalations since start */
  totalEscalations: number;
  /** Total de-escalations since start */
  totalDeEscalations: number;
  /** Time spent at each quality level (in seconds) */
  timeAtLevel: Record<QualityLevel, number>;
  /** User override active */
  userOverrideActive: boolean;
  /** Auto-adjust enabled */
  autoAdjustEnabled: boolean;
  /** Uptime in seconds */
  uptime: number;
  /** Percentage of time within frame budget */
  frameTimeBudgetCompliance: number;
}

// =============================================================================
// QUALITY LEVEL DEFINITIONS
// =============================================================================

const QUALITY_LEVELS: Record<QualityLevel, QualityLevelConfig> = {
  [QualityLevel.FULL_QUALITY]: {
    level: QualityLevel.FULL_QUALITY,
    name: 'Full Quality',
    description: 'All effects enabled, high-res textures, real-time shadows, post-processing',
    performanceGain: 0,
    settings: {
      shadowsEnabled: true,
      shadowResolution: 2048,
      shadowCascades: 4,
      ambientOcclusionEnabled: true,
      textureLODBias: 0,
      anisotropicFiltering: 16,
      mipmapBias: 0,
      bloomEnabled: true,
      depthOfFieldEnabled: true,
      motionBlurEnabled: true,
      chromaticAberrationEnabled: true,
      vignetteEnabled: true,
      colorGradingEnabled: true,
      lodBias: 0,
      particleQuality: 1.0,
      meshSimplification: 1.0,
      pixelRatio: 1.0,
      antialiasingMode: 'msaa4x',
      maxLights: 8,
    },
  },

  [QualityLevel.REDUCED_SHADOWS]: {
    level: QualityLevel.REDUCED_SHADOWS,
    name: 'Reduced Shadows',
    description: 'Shadow resolution 50%, disable ambient occlusion',
    performanceGain: 15,
    settings: {
      shadowsEnabled: true,
      shadowResolution: 1024,
      shadowCascades: 2,
      ambientOcclusionEnabled: false,
      textureLODBias: 0,
      anisotropicFiltering: 16,
      mipmapBias: 0,
      bloomEnabled: true,
      depthOfFieldEnabled: true,
      motionBlurEnabled: true,
      chromaticAberrationEnabled: true,
      vignetteEnabled: true,
      colorGradingEnabled: true,
      lodBias: 0,
      particleQuality: 1.0,
      meshSimplification: 1.0,
      pixelRatio: 1.0,
      antialiasingMode: 'msaa2x',
      maxLights: 6,
    },
  },

  [QualityLevel.REDUCED_TEXTURES]: {
    level: QualityLevel.REDUCED_TEXTURES,
    name: 'Reduced Textures',
    description: 'Texture LOD bias +1, aggressive mipmapping',
    performanceGain: 30,
    settings: {
      shadowsEnabled: true,
      shadowResolution: 1024,
      shadowCascades: 2,
      ambientOcclusionEnabled: false,
      textureLODBias: 1,
      anisotropicFiltering: 8,
      mipmapBias: 0.5,
      bloomEnabled: true,
      depthOfFieldEnabled: true,
      motionBlurEnabled: false,
      chromaticAberrationEnabled: false,
      vignetteEnabled: true,
      colorGradingEnabled: true,
      lodBias: 0,
      particleQuality: 1.0,
      meshSimplification: 1.0,
      pixelRatio: 1.0,
      antialiasingMode: 'smaa',
      maxLights: 4,
    },
  },

  [QualityLevel.NO_POST_PROCESSING]: {
    level: QualityLevel.NO_POST_PROCESSING,
    name: 'No Post-Processing',
    description: 'Remove bloom, DOF, motion blur, chromatic aberration',
    performanceGain: 50,
    settings: {
      shadowsEnabled: true,
      shadowResolution: 512,
      shadowCascades: 1,
      ambientOcclusionEnabled: false,
      textureLODBias: 1,
      anisotropicFiltering: 4,
      mipmapBias: 1.0,
      bloomEnabled: false,
      depthOfFieldEnabled: false,
      motionBlurEnabled: false,
      chromaticAberrationEnabled: false,
      vignetteEnabled: false,
      colorGradingEnabled: false,
      lodBias: 1,
      particleQuality: 0.75,
      meshSimplification: 0.9,
      pixelRatio: 0.9,
      antialiasingMode: 'fxaa',
      maxLights: 3,
    },
  },

  [QualityLevel.SIMPLIFIED_GEOMETRY]: {
    level: QualityLevel.SIMPLIFIED_GEOMETRY,
    name: 'Simplified Geometry',
    description: 'Switch to LOD2 models, reduce particle counts 75%',
    performanceGain: 70,
    settings: {
      shadowsEnabled: false,
      shadowResolution: 512,
      shadowCascades: 1,
      ambientOcclusionEnabled: false,
      textureLODBias: 2,
      anisotropicFiltering: 2,
      mipmapBias: 1.5,
      bloomEnabled: false,
      depthOfFieldEnabled: false,
      motionBlurEnabled: false,
      chromaticAberrationEnabled: false,
      vignetteEnabled: false,
      colorGradingEnabled: false,
      lodBias: 2,
      particleQuality: 0.25,
      meshSimplification: 0.7,
      pixelRatio: 0.8,
      antialiasingMode: 'none',
      maxLights: 2,
    },
  },
};

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: DegradationConfig = {
  targetFrameTime: 11.1, // 90fps
  escalationThreshold: 85, // fps
  deEscalationThreshold: 92, // fps
  escalationDuration: 5, // seconds
  deEscalationDuration: 30, // seconds
  autoAdjust: true,
  userLockedLevel: null,
  monitoringWindow: 300, // frames (~3.3s at 90fps)
  enableTelemetry: true,
};

// =============================================================================
// VR PERFORMANCE DEGRADATION MANAGER
// =============================================================================

/**
 * Manages automatic quality degradation for VR rendering to maintain target frame rate.
 *
 * USAGE:
 * ```typescript
 * const manager = new VRPerformanceDegradationManager({
 *   targetFrameTime: 11.1, // 90fps
 *   escalationThreshold: 85,
 *   deEscalationThreshold: 92,
 * });
 *
 * // In render loop
 * function render(deltaTime: number) {
 *   manager.recordFrame(deltaTime);
 *   const quality = manager.getCurrentQualitySettings();
 *   applyQualitySettings(renderer, quality);
 * }
 *
 * // User override
 * manager.setQualityLevel(QualityLevel.REDUCED_SHADOWS, true);
 *
 * // Get metrics
 * const metrics = manager.getMetrics();
 * console.log(`Quality Level: ${metrics.currentLevel}, FPS: ${1000 / metrics.frameStats.average}`);
 * ```
 */
export class VRPerformanceDegradationManager {
  private config: DegradationConfig;
  private currentLevel: QualityLevel = QualityLevel.FULL_QUALITY;
  private frameHistory: number[] = [];
  private escalationTimer: number = 0;
  private deEscalationTimer: number = 0;
  private lastFrameTime: number = 0;
  private startTime: number = Date.now();
  private timeAtLevel: Record<QualityLevel, number> = {
    [QualityLevel.FULL_QUALITY]: 0,
    [QualityLevel.REDUCED_SHADOWS]: 0,
    [QualityLevel.REDUCED_TEXTURES]: 0,
    [QualityLevel.NO_POST_PROCESSING]: 0,
    [QualityLevel.SIMPLIFIED_GEOMETRY]: 0,
  };
  private lastLevelChangeTime: number = Date.now();
  private totalEscalations: number = 0;
  private totalDeEscalations: number = 0;
  private telemetryEvents: DegradationEvent[] = [];
  private listeners: Set<(event: DegradationEvent) => void> = new Set();

  constructor(config?: Partial<DegradationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CORE FRAME MONITORING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Record a frame time measurement
   * Call this once per frame with the frame delta time in milliseconds
   */
  recordFrame(frameTime: number): void {
    const now = Date.now();
    const deltaSeconds = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    // Update time at current level
    this.timeAtLevel[this.currentLevel] += deltaSeconds;

    // Add to history
    this.frameHistory.push(frameTime);
    if (this.frameHistory.length > this.config.monitoringWindow) {
      this.frameHistory.shift();
    }

    // Skip auto-adjust if disabled or user override active
    if (!this.config.autoAdjust || this.config.userLockedLevel !== null) {
      this.escalationTimer = 0;
      this.deEscalationTimer = 0;
      return;
    }

    // Calculate current FPS
    const currentFPS = 1000 / frameTime;

    // Check for escalation (performance degradation)
    if (currentFPS < this.config.escalationThreshold) {
      this.escalationTimer += deltaSeconds;
      this.deEscalationTimer = 0;

      if (this.escalationTimer >= this.config.escalationDuration) {
        this.escalate('Sustained FPS below threshold');
        this.escalationTimer = 0;
      }
    }
    // Check for de-escalation (performance improvement)
    else if (currentFPS > this.config.deEscalationThreshold) {
      this.deEscalationTimer += deltaSeconds;
      this.escalationTimer = 0;

      if (this.deEscalationTimer >= this.config.deEscalationDuration) {
        this.deEscalate('Sustained FPS above threshold');
        this.deEscalationTimer = 0;
      }
    }
    // In acceptable range - reset timers
    else {
      this.escalationTimer = 0;
      this.deEscalationTimer = 0;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // QUALITY LEVEL MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Escalate to next higher performance level (lower quality)
   */
  private escalate(reason: string): void {
    if (this.currentLevel >= QualityLevel.SIMPLIFIED_GEOMETRY) {
      return; // Already at lowest quality
    }

    const fromLevel = this.currentLevel;
    const toLevel = this.currentLevel + 1;

    this.setQualityLevelInternal(toLevel, reason, 'escalation');
    this.totalEscalations++;
  }

  /**
   * De-escalate to next lower performance level (higher quality)
   */
  private deEscalate(reason: string): void {
    if (this.currentLevel <= QualityLevel.FULL_QUALITY) {
      return; // Already at highest quality
    }

    const fromLevel = this.currentLevel;
    const toLevel = this.currentLevel - 1;

    this.setQualityLevelInternal(toLevel, reason, 'de-escalation');
    this.totalDeEscalations++;
  }

  /**
   * Set quality level (internal)
   */
  private setQualityLevelInternal(
    level: QualityLevel,
    reason: string,
    eventType: DegradationEvent['event']
  ): void {
    const fromLevel = this.currentLevel;
    this.currentLevel = level;
    this.lastLevelChangeTime = Date.now();

    // Emit event
    const event: DegradationEvent = {
      timestamp: Date.now(),
      event: eventType,
      fromLevel,
      toLevel: level,
      reason,
      frameStats: this.getFrameTimeStats(),
    };

    if (this.config.enableTelemetry) {
      this.telemetryEvents.push(event);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Set quality level manually (user override)
   * @param level Target quality level
   * @param lock If true, locks the quality level and disables auto-adjust
   */
  setQualityLevel(level: QualityLevel, lock: boolean = false): void {
    const fromLevel = this.currentLevel;

    if (lock) {
      this.config.userLockedLevel = level;
      this.config.autoAdjust = false;
    }

    this.setQualityLevelInternal(level, lock ? 'User locked quality level' : 'User changed quality level', 'user-override');
  }

  /**
   * Unlock quality level and re-enable auto-adjust
   */
  unlockQualityLevel(): void {
    this.config.userLockedLevel = null;
    this.config.autoAdjust = true;

    const event: DegradationEvent = {
      timestamp: Date.now(),
      event: 'auto-adjust-enabled',
      fromLevel: this.currentLevel,
      toLevel: this.currentLevel,
      reason: 'User unlocked quality level',
      frameStats: this.getFrameTimeStats(),
    };

    if (this.config.enableTelemetry) {
      this.telemetryEvents.push(event);
    }

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Get current quality level
   */
  getCurrentLevel(): QualityLevel {
    return this.currentLevel;
  }

  /**
   * Get current quality settings
   */
  getCurrentQualitySettings(): QualitySettings {
    return { ...QUALITY_LEVELS[this.currentLevel].settings };
  }

  /**
   * Get quality configuration for a specific level
   */
  getQualityLevelConfig(level: QualityLevel): QualityLevelConfig {
    return { ...QUALITY_LEVELS[level] };
  }

  /**
   * Get all quality level configurations
   */
  getAllQualityLevels(): QualityLevelConfig[] {
    return Object.values(QUALITY_LEVELS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATISTICS & METRICS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get frame time statistics
   */
  getFrameTimeStats(): FrameTimeStats {
    if (this.frameHistory.length === 0) {
      return {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0,
        jankFrames: 0,
        totalFrames: 0,
      };
    }

    const sorted = [...this.frameHistory].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const jankThreshold = this.config.targetFrameTime * 2;
    const jankFrames = this.frameHistory.filter(ft => ft > jankThreshold).length;

    return {
      current: this.frameHistory[this.frameHistory.length - 1],
      average: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      jankFrames,
      totalFrames: this.frameHistory.length,
    };
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): DegradationMetrics {
    const frameStats = this.getFrameTimeStats();
    const uptime = (Date.now() - this.startTime) / 1000;
    const framesWithinBudget = this.frameHistory.filter(
      ft => ft <= this.config.targetFrameTime
    ).length;
    const frameTimeBudgetCompliance =
      this.frameHistory.length > 0
        ? (framesWithinBudget / this.frameHistory.length) * 100
        : 0;

    return {
      currentLevel: this.currentLevel,
      frameStats,
      totalEscalations: this.totalEscalations,
      totalDeEscalations: this.totalDeEscalations,
      timeAtLevel: { ...this.timeAtLevel },
      userOverrideActive: this.config.userLockedLevel !== null,
      autoAdjustEnabled: this.config.autoAdjust,
      uptime,
      frameTimeBudgetCompliance,
    };
  }

  /**
   * Get telemetry events
   */
  getTelemetryEvents(): DegradationEvent[] {
    return [...this.telemetryEvents];
  }

  /**
   * Clear telemetry events
   */
  clearTelemetryEvents(): void {
    this.telemetryEvents = [];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to degradation events
   * @returns Unsubscribe function
   */
  onDegradationEvent(listener: (event: DegradationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DegradationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DegradationConfig {
    return { ...this.config };
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.currentLevel = QualityLevel.FULL_QUALITY;
    this.frameHistory = [];
    this.escalationTimer = 0;
    this.deEscalationTimer = 0;
    this.totalEscalations = 0;
    this.totalDeEscalations = 0;
    this.telemetryEvents = [];
    this.startTime = Date.now();
    this.lastLevelChangeTime = Date.now();
    this.timeAtLevel = {
      [QualityLevel.FULL_QUALITY]: 0,
      [QualityLevel.REDUCED_SHADOWS]: 0,
      [QualityLevel.REDUCED_TEXTURES]: 0,
      [QualityLevel.NO_POST_PROCESSING]: 0,
      [QualityLevel.SIMPLIFIED_GEOMETRY]: 0,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const config = QUALITY_LEVELS[this.currentLevel];
    const avgFPS = 1000 / metrics.frameStats.average;

    const lines: string[] = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '  VR PERFORMANCE DEGRADATION REPORT',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `  Quality Level: ${config.name} (Level ${config.level})`,
      `  ${config.description}`,
      '',
      '── Frame Statistics ──',
      `  Average FPS:           ${avgFPS.toFixed(1)} fps`,
      `  Current Frame Time:    ${metrics.frameStats.current.toFixed(2)} ms`,
      `  Average Frame Time:    ${metrics.frameStats.average.toFixed(2)} ms`,
      `  Target Frame Time:     ${this.config.targetFrameTime.toFixed(2)} ms`,
      `  P95 Frame Time:        ${metrics.frameStats.p95.toFixed(2)} ms`,
      `  P99 Frame Time:        ${metrics.frameStats.p99.toFixed(2)} ms`,
      `  Jank Frames:           ${metrics.frameStats.jankFrames} / ${metrics.frameStats.totalFrames}`,
      `  Budget Compliance:     ${metrics.frameTimeBudgetCompliance.toFixed(1)}%`,
      '',
      '── Degradation Activity ──',
      `  Total Escalations:     ${metrics.totalEscalations}`,
      `  Total De-escalations:  ${metrics.totalDeEscalations}`,
      `  User Override Active:  ${metrics.userOverrideActive ? 'YES' : 'NO'}`,
      `  Auto-Adjust Enabled:   ${metrics.autoAdjustEnabled ? 'YES' : 'NO'}`,
      `  Uptime:                ${metrics.uptime.toFixed(1)}s`,
      '',
      '── Time at Each Level ──',
    ];

    for (const level of Object.values(QualityLevel).filter(v => typeof v === 'number') as QualityLevel[]) {
      const cfg = QUALITY_LEVELS[level];
      const time = metrics.timeAtLevel[level];
      const percent = metrics.uptime > 0 ? (time / metrics.uptime * 100).toFixed(1) : '0.0';
      const marker = level === this.currentLevel ? '→' : ' ';
      lines.push(`  ${marker} Level ${level} (${cfg.name}): ${time.toFixed(1)}s (${percent}%)`);
    }

    if (this.telemetryEvents.length > 0) {
      lines.push('');
      lines.push('── Recent Events (Last 10) ──');
      const recent = this.telemetryEvents.slice(-10);
      for (const event of recent) {
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        const icon = event.event === 'escalation' ? '↓' : event.event === 'de-escalation' ? '↑' : '•';
        lines.push(`  ${icon} ${timestamp} | ${event.event} | L${event.fromLevel}→L${event.toLevel} | ${event.reason}`);
      }
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate recommended quality level based on target hardware
 */
export function getRecommendedQualityLevel(
  gpuTier: 'high' | 'medium' | 'low',
  targetFPS: number = 90
): QualityLevel {
  if (targetFPS >= 90) {
    // VR targets
    switch (gpuTier) {
      case 'high': return QualityLevel.FULL_QUALITY;
      case 'medium': return QualityLevel.REDUCED_SHADOWS;
      case 'low': return QualityLevel.NO_POST_PROCESSING;
    }
  } else if (targetFPS >= 60) {
    // Desktop targets
    switch (gpuTier) {
      case 'high': return QualityLevel.FULL_QUALITY;
      case 'medium': return QualityLevel.REDUCED_TEXTURES;
      case 'low': return QualityLevel.SIMPLIFIED_GEOMETRY;
    }
  } else {
    // Mobile targets
    return gpuTier === 'high' ? QualityLevel.REDUCED_TEXTURES : QualityLevel.SIMPLIFIED_GEOMETRY;
  }

  return QualityLevel.REDUCED_SHADOWS;
}

/**
 * Estimate GPU tier from WebGL capabilities
 */
export async function estimateGPUTier(gl: WebGLRenderingContext | WebGL2RenderingContext): Promise<'high' | 'medium' | 'low'> {
  // Get renderer info
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  let renderer = 'unknown';
  if (debugInfo) {
    renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
  }

  // High-end GPUs
  if (
    renderer.includes('rtx') ||
    renderer.includes('radeon rx') ||
    renderer.includes('apple m') ||
    renderer.includes('adreno 6') ||
    renderer.includes('mali-g')
  ) {
    return 'high';
  }

  // Low-end GPUs
  if (
    renderer.includes('intel hd') ||
    renderer.includes('adreno 3') ||
    renderer.includes('adreno 4') ||
    renderer.includes('mali-4')
  ) {
    return 'low';
  }

  // Default to medium
  return 'medium';
}
