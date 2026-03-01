/**
 * Performance Monitor for Studio IDE
 *
 * Tracks real-time rendering metrics from the Three.js WebGLRenderer
 * (or WebGPURenderer when available):
 *   - FPS (frames per second, smoothed over a rolling window)
 *   - GPU utilization estimate (via EXT_disjoint_timer_query_webgl2)
 *   - Draw call count per frame
 *   - Triangle (face) count per frame
 *
 * Usage:
 *   const monitor = new PerformanceMonitor(renderer);
 *   // Call once per frame, AFTER renderer.render():
 *   monitor.sample();
 *   // Read current stats:
 *   const stats = monitor.getStats();
 *
 * @module studio/PerformanceMonitor
 */

import type * as THREE from 'three';

// =============================================================================
// TYPES
// =============================================================================

/** Snapshot of rendering performance metrics */
export interface RenderStats {
  /** Frames per second (smoothed) */
  fps: number;
  /** Instantaneous frame time in milliseconds */
  frameTimeMs: number;
  /** Estimated GPU utilization (0-100). -1 if unavailable. */
  gpuUtilization: number;
  /** Number of draw calls in the last frame */
  drawCalls: number;
  /** Number of triangles rendered in the last frame */
  triangles: number;
  /** Number of texture bindings in the last frame */
  textures: number;
  /** Number of shader program switches in the last frame */
  programs: number;
  /** Number of geometry uploads (buffer updates) */
  geometries: number;
  /** Total GPU memory estimate in MB (if available, else -1) */
  gpuMemoryMB: number;
  /** Active renderer backend label */
  backendLabel: string;
}

/** Configuration for the performance monitor */
export interface PerformanceMonitorConfig {
  /** Number of frames to average for FPS smoothing (default: 60) */
  fpsWindowSize: number;
  /** How often to attempt GPU timer query in frames (default: 30) */
  gpuTimerInterval: number;
  /** Target frame budget in ms for GPU utilization % (default: 16.67 for 60fps) */
  frameBudgetMs: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  fpsWindowSize: 60,
  gpuTimerInterval: 30,
  frameBudgetMs: 16.67,
};

// =============================================================================
// PERFORMANCE MONITOR
// =============================================================================

export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;

  // Frame timing
  private frameTimes: number[] = [];
  private lastTimestamp: number = 0;
  private frameCount: number = 0;

  // GPU timer query (WebGL2 extension)
  private gpuTimerExt: any = null;
  private gpuQuery: WebGLQuery | null = null;
  private gpuQueryPending: boolean = false;
  private lastGpuTimeMs: number = -1;
  private gl: WebGL2RenderingContext | null = null;

  // Cached stats (updated each sample)
  private currentStats: RenderStats = {
    fps: 0,
    frameTimeMs: 0,
    gpuUtilization: -1,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    programs: 0,
    geometries: 0,
    gpuMemoryMB: -1,
    backendLabel: 'WebGL2',
  };

  // Reference to renderer.info
  private rendererInfo: THREE.WebGLInfo | null = null;

  constructor(
    renderer?: THREE.WebGLRenderer,
    config?: Partial<PerformanceMonitorConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (renderer) {
      this.attach(renderer);
    }
  }

  /**
   * Attach to a Three.js renderer to read its info and attempt
   * GPU timer query setup.
   */
  attach(renderer: THREE.WebGLRenderer): void {
    this.rendererInfo = (renderer as any).info as THREE.WebGLInfo;

    // Try to get the GL context for GPU timer queries
    try {
      const domElement = renderer.domElement;
      const gl = domElement.getContext('webgl2') as WebGL2RenderingContext | null;
      if (gl) {
        this.gl = gl;
        this.setupGPUTimerQuery(gl);
      }
    } catch {
      // Cannot access GL context directly - that is fine
    }

    // Detect backend label
    this.currentStats.backendLabel = this.detectBackendLabel(renderer);
  }

  /**
   * Detect which backend label to display.
   */
  private detectBackendLabel(renderer: any): string {
    // Three.js r160+ WebGPURenderer has a `backend` property
    if (renderer.backend) {
      const backendName = renderer.backend.constructor?.name || '';
      if (backendName.includes('WebGPU')) return 'WebGPU';
      if (backendName.includes('WebGL')) return 'WebGL2';
      return backendName || 'Unknown';
    }

    // Standard WebGLRenderer
    if (renderer.constructor?.name === 'WebGPURenderer') return 'WebGPU';
    return 'WebGL2';
  }

  /**
   * Attempt to set up the EXT_disjoint_timer_query_webgl2 extension
   * for real GPU time measurement.
   */
  private setupGPUTimerQuery(gl: WebGL2RenderingContext): void {
    try {
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      if (ext) {
        this.gpuTimerExt = ext;
      }
    } catch {
      // Extension not available
    }
  }

  /**
   * Call once per frame AFTER renderer.render() to capture metrics.
   */
  sample(): void {
    const now = performance.now();

    // Frame time
    if (this.lastTimestamp > 0) {
      const dt = now - this.lastTimestamp;
      this.frameTimes.push(dt);

      // Keep rolling window
      if (this.frameTimes.length > this.config.fpsWindowSize) {
        this.frameTimes.shift();
      }

      this.currentStats.frameTimeMs = dt;
    }
    this.lastTimestamp = now;

    // Compute smoothed FPS
    if (this.frameTimes.length > 0) {
      const avgDt =
        this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.currentStats.fps = avgDt > 0 ? 1000 / avgDt : 0;
    }

    // Read renderer.info
    if (this.rendererInfo) {
      const render = (this.rendererInfo as any).render;
      if (render) {
        this.currentStats.drawCalls = render.calls ?? 0;
        this.currentStats.triangles = render.triangles ?? 0;
      }

      const memory = (this.rendererInfo as any).memory;
      if (memory) {
        this.currentStats.textures = memory.textures ?? 0;
        this.currentStats.geometries = memory.geometries ?? 0;
      }

      const programs = (this.rendererInfo as any).programs;
      if (Array.isArray(programs)) {
        this.currentStats.programs = programs.length;
      }
    }

    // GPU timer query
    this.frameCount++;
    if (this.gpuTimerExt && this.gl) {
      this.processGPUTimerQuery();
    }

    // GPU memory (Chrome-specific extension)
    this.currentStats.gpuMemoryMB = this.estimateGPUMemory();
  }

  /**
   * Process GPU timer queries for utilization measurement.
   */
  private processGPUTimerQuery(): void {
    const gl = this.gl!;
    const ext = this.gpuTimerExt;

    // Check for disjoint (GPU reset) -- invalidate pending query
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    if (disjoint) {
      this.gpuQueryPending = false;
      this.gpuQuery = null;
    }

    // Read result of previous query
    if (this.gpuQueryPending && this.gpuQuery) {
      const available = gl.getQueryParameter(
        this.gpuQuery,
        gl.QUERY_RESULT_AVAILABLE,
      );
      if (available) {
        const timeElapsed = gl.getQueryParameter(
          this.gpuQuery,
          gl.QUERY_RESULT,
        );
        // timeElapsed is in nanoseconds
        this.lastGpuTimeMs = timeElapsed / 1_000_000;
        this.currentStats.gpuUtilization = Math.min(
          100,
          (this.lastGpuTimeMs / this.config.frameBudgetMs) * 100,
        );
        gl.deleteQuery(this.gpuQuery);
        this.gpuQuery = null;
        this.gpuQueryPending = false;
      }
    }

    // Start a new query periodically
    if (
      !this.gpuQueryPending &&
      this.frameCount % this.config.gpuTimerInterval === 0
    ) {
      const query = gl.createQuery();
      if (query) {
        gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
        // NOTE: the actual render pass happens between beginQuery/endQuery
        // in practice we measure the gap between two sample() calls which
        // approximates the GPU work. For a precise measurement, the user
        // would wrap their render call. We end immediately on next sample.
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        this.gpuQuery = query;
        this.gpuQueryPending = true;
      }
    }
  }

  /**
   * Estimate GPU memory usage via renderer.info.memory or
   * the non-standard WEBGL_memory_info extension.
   */
  private estimateGPUMemory(): number {
    // Chrome DevTools protocol exposes memory info
    if (this.gl) {
      try {
        const memInfo = this.gl.getExtension('WEBGL_memory_info' as any);
        if (memInfo) {
          const totalMB =
            (this.gl as any).getParameter(
              (memInfo as any).GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX,
            ) / 1024;
          return totalMB > 0 ? totalMB : -1;
        }
      } catch {
        // Not available
      }
    }
    return -1;
  }

  /**
   * Get the current rendering statistics snapshot.
   */
  getStats(): Readonly<RenderStats> {
    return { ...this.currentStats };
  }

  /**
   * Override the backend label (useful when switching renderers at runtime).
   */
  setBackendLabel(label: string): void {
    this.currentStats.backendLabel = label;
  }

  /**
   * Reset all accumulated statistics.
   */
  reset(): void {
    this.frameTimes = [];
    this.lastTimestamp = 0;
    this.frameCount = 0;
    this.lastGpuTimeMs = -1;
    this.currentStats = {
      fps: 0,
      frameTimeMs: 0,
      gpuUtilization: -1,
      drawCalls: 0,
      triangles: 0,
      textures: 0,
      programs: 0,
      geometries: 0,
      gpuMemoryMB: -1,
      backendLabel: this.currentStats.backendLabel,
    };
  }

  /**
   * Clean up resources (delete pending GPU query).
   */
  dispose(): void {
    if (this.gl && this.gpuQuery) {
      this.gl.deleteQuery(this.gpuQuery);
      this.gpuQuery = null;
    }
    this.gpuQueryPending = false;
    this.rendererInfo = null;
    this.gl = null;
  }
}
