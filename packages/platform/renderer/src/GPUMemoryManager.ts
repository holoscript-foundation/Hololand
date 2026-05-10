/**
 * GPUMemoryManager
 *
 * Real-time GPU memory budget management for VR scene graphs.
 * Monitors VRAM usage via WebGPU/WebGL APIs, tracks objects, and triggers
 * optimizations (LOD reduction, culling) to maintain 90fps VR presence.
 *
 * TARGET: 2-3x object capacity vs naive approach while maintaining 90fps
 *
 * @module GPUMemoryManager
 */

import { EventEmitter } from 'events';
import * as THREE from 'three';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Memory breakdown by resource type
 */
export interface MemoryBreakdown {
  /** Texture VRAM in bytes */
  textures: number;
  /** Vertex/index buffer memory in bytes */
  geometryBuffers: number;
  /** Compiled shader program memory */
  shaderPrograms: number;
  /** Framebuffers and render targets */
  renderTargets: number;
  /** Miscellaneous GPU allocations */
  other: number;
  /** Total VRAM usage in bytes */
  total: number;
  /** Total available VRAM budget in MB */
  budgetMB: number;
  /** Current utilization as percentage (0-1) */
  utilizationPercent: number;
}

/**
 * Memory threshold configuration
 */
export interface MemoryThresholds {
  /** Warning threshold (default: 0.70 = 70%) */
  alert: number;
  /** Start LOD reduction (default: 0.80 = 80%) */
  reduction: number;
  /** Critical state, aggressive culling (default: 0.90 = 90%) */
  critical: number;
  /** Emergency mode, maximum performance (default: 0.95 = 95%) */
  emergency: number;
}

/**
 * GPU memory manager configuration
 */
export interface GPUMemoryManagerConfig {
  /** VRAM budget in MB (default: auto-detect) */
  budgetMB?: number;
  /** Memory thresholds */
  thresholds?: Partial<MemoryThresholds>;
  /** Enable WebGPU memory tracking if available */
  useWebGPU?: boolean;
  /** Enable detailed memory logging */
  verbose?: boolean;
  /** Measurement interval in ms (default: 1000) */
  measurementInterval?: number;
  /** Memory estimate buffer multiplier for safety (default: 1.1 = +10%) */
  estimationBuffer?: number;
}

type ResolvedGPUMemoryManagerConfig = Omit<Required<GPUMemoryManagerConfig>, 'thresholds'> & {
  thresholds: MemoryThresholds;
};

/**
 * Tracked resource metadata
 */
export interface TrackedResource {
  /** Unique resource ID */
  id: string;
  /** Resource type */
  type: 'texture' | 'geometry' | 'shader' | 'rendertarget' | 'other';
  /** Estimated memory in bytes */
  memoryBytes: number;
  /** Timestamp when resource was created */
  createdAt: number;
  /** Timestamp of last access/use */
  lastAccessedAt: number;
  /** Reference to actual resource (for cleanup) */
  resource: any;
  /** Whether resource is currently loaded in VRAM */
  loaded: boolean;
}

/**
 * Memory statistics snapshot
 */
export interface MemoryStats {
  /** Current memory breakdown */
  breakdown: MemoryBreakdown;
  /** Tracked resources count by type */
  resourceCounts: Record<TrackedResource['type'], number>;
  /** Total tracked resources */
  totalResources: number;
  /** Current threshold state */
  thresholdState: 'normal' | 'alert' | 'reduction' | 'critical' | 'emergency';
  /** Time since last measurement */
  measurementAge: number;
}

/**
 * Memory event types
 */
export type MemoryEvent =
  | 'threshold:alert'
  | 'threshold:reduction'
  | 'threshold:critical'
  | 'threshold:emergency'
  | 'threshold:normal'
  | 'resource:loaded'
  | 'resource:unloaded'
  | 'stats:updated';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_THRESHOLDS: MemoryThresholds = {
  alert: 0.7,
  reduction: 0.8,
  critical: 0.9,
  emergency: 0.95,
};

const DEFAULT_CONFIG: ResolvedGPUMemoryManagerConfig = {
  budgetMB: 2048, // 2GB default, auto-detected if possible
  thresholds: DEFAULT_THRESHOLDS,
  useWebGPU: true,
  verbose: false,
  measurementInterval: 1000, // 1 second
  estimationBuffer: 1.1, // 10% safety buffer
};

// =============================================================================
// GPU MEMORY MANAGER
// =============================================================================

/**
 * Manages GPU memory budget for VR scene graphs.
 *
 * USAGE:
 * ```typescript
 * const memoryManager = new GPUMemoryManager({
 *   budgetMB: 2048,
 *   thresholds: { alert: 0.70, reduction: 0.80, critical: 0.90 }
 * });
 *
 * // Track resources
 * memoryManager.trackTexture('sky_texture', skyTexture);
 * memoryManager.trackGeometry('terrain_mesh', terrainGeometry);
 *
 * // Listen for memory events
 * memoryManager.on('threshold:reduction', () => {
 *   console.log('Memory pressure detected, reducing LOD...');
 *   lodManager.reduceQuality();
 * });
 *
 * // Start monitoring
 * memoryManager.startMonitoring();
 *
 * // Get current stats
 * const stats = memoryManager.getStats();
 * console.log(`VRAM: ${stats.breakdown.utilizationPercent.toFixed(1)}%`);
 * ```
 */
export class GPUMemoryManager extends EventEmitter {
  private config: ResolvedGPUMemoryManagerConfig;
  private resources: Map<string, TrackedResource> = new Map();
  private currentBreakdown: MemoryBreakdown;
  private lastMeasurement: number = 0;
  private currentThresholdState: MemoryStats['thresholdState'] = 'normal';
  private monitoringInterval: NodeJS.Timeout | null = null;
  private webGPUDevice: GPUDevice | null = null;
  private threeRenderer: THREE.WebGLRenderer | null = null;

  constructor(config: GPUMemoryManagerConfig = {}) {
    super();

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      thresholds: {
        ...DEFAULT_THRESHOLDS,
        ...config.thresholds,
      },
    };

    this.currentBreakdown = this.createEmptyBreakdown();

    logger.info('[GPUMemoryManager] Initialized', {
      budgetMB: this.config.budgetMB,
      thresholds: this.config.thresholds,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Initialize WebGPU memory tracking if available
   */
  async initializeWebGPU(): Promise<boolean> {
    if (!this.config.useWebGPU || !navigator.gpu) {
      logger.info('[GPUMemoryManager] WebGPU not available, using fallback estimation');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        logger.warn('[GPUMemoryManager] No WebGPU adapter available');
        return false;
      }

      this.webGPUDevice = await adapter.requestDevice();
      logger.info('[GPUMemoryManager] WebGPU memory tracking enabled');
      return true;
    } catch (error) {
      logger.warn('[GPUMemoryManager] WebGPU initialization failed', { error: String(error) });
      return false;
    }
  }

  /**
   * Set Three.js renderer for memory tracking
   */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.threeRenderer = renderer;
    logger.info('[GPUMemoryManager] Three.js renderer registered');
  }

  /**
   * Auto-detect GPU memory budget
   */
  async detectMemoryBudget(): Promise<number> {
    // Try WebGPU adapter limits
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          // WebGPU doesn't expose total VRAM yet, use reasonable estimate based on tier
          const info = await this.getGPUInfo();
          return this.estimateBudgetFromGPUInfo(info);
        }
      } catch {
        // Fall through to heuristics
      }
    }

    // Fallback to heuristics based on device type and screen resolution
    const screenPixels = window.screen.width * window.screen.height;
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Mobile devices typically have less VRAM
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile) {
      return screenPixels > 2000000 ? 1024 : 512; // High-res mobile: 1GB, else 512MB
    }

    // Desktop: estimate based on resolution
    if (screenPixels > 8000000) {
      return 4096; // 4K+ display: assume 4GB
    } else if (screenPixels > 2000000) {
      return 2048; // 1440p display: assume 2GB
    } else {
      return 1536; // 1080p display: assume 1.5GB
    }
  }

  private async getGPUInfo(): Promise<{ vendor: string; renderer: string }> {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
      return { vendor: 'unknown', renderer: 'unknown' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      };
    }

    return { vendor: 'unknown', renderer: 'unknown' };
  }

  private estimateBudgetFromGPUInfo(info: { vendor: string; renderer: string }): number {
    const renderer = info.renderer.toLowerCase();

    // High-end GPUs
    if (renderer.includes('rtx 40') || renderer.includes('rtx 30')) return 8192;
    if (renderer.includes('rx 7') || renderer.includes('rx 6')) return 8192;
    if (renderer.includes('m1 max') || renderer.includes('m2 max')) return 4096;

    // Mid-range GPUs
    if (renderer.includes('rtx 20') || renderer.includes('gtx 16')) return 4096;
    if (renderer.includes('rx 5') || renderer.includes('vega')) return 4096;
    if (renderer.includes('m1') || renderer.includes('m2')) return 2048;

    // Low-end GPUs / integrated
    if (renderer.includes('intel hd') || renderer.includes('intel uhd')) return 1024;
    if (renderer.includes('adreno') || renderer.includes('mali')) return 512;

    // Default conservative estimate
    return 2048;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RESOURCE TRACKING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Track a texture resource
   */
  trackTexture(id: string, texture: THREE.Texture): void {
    const memoryBytes = this.estimateTextureMemory(texture);

    this.addResource({
      id,
      type: 'texture',
      memoryBytes,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      resource: texture,
      loaded: true,
    });

    if (this.config.verbose) {
      logger.debug('[GPUMemoryManager] Tracked texture', {
        id,
        memoryMB: (memoryBytes / 1024 / 1024).toFixed(2),
      });
    }
  }

  /**
   * Track a geometry resource
   */
  trackGeometry(id: string, geometry: THREE.BufferGeometry): void {
    const memoryBytes = this.estimateGeometryMemory(geometry);

    this.addResource({
      id,
      type: 'geometry',
      memoryBytes,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      resource: geometry,
      loaded: true,
    });

    if (this.config.verbose) {
      logger.debug('[GPUMemoryManager] Tracked geometry', {
        id,
        memoryMB: (memoryBytes / 1024 / 1024).toFixed(2),
      });
    }
  }

  /**
   * Track a shader program
   */
  trackShader(id: string, material: THREE.Material): void {
    const memoryBytes = this.estimateShaderMemory(material);

    this.addResource({
      id,
      type: 'shader',
      memoryBytes,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      resource: material,
      loaded: true,
    });
  }

  /**
   * Track a render target
   */
  trackRenderTarget(id: string, renderTarget: THREE.WebGLRenderTarget): void {
    const memoryBytes = this.estimateRenderTargetMemory(renderTarget);

    this.addResource({
      id,
      type: 'rendertarget',
      memoryBytes,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      resource: renderTarget,
      loaded: true,
    });
  }

  /**
   * Untrack a resource (when disposed)
   */
  untrackResource(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      this.resources.delete(id);
      this.emit('resource:unloaded', {
        id,
        type: resource.type,
        memoryBytes: resource.memoryBytes,
      });

      if (this.config.verbose) {
        logger.debug('[GPUMemoryManager] Untracked resource', {
          id,
          type: resource.type,
        });
      }
    }
  }

  /**
   * Update resource access timestamp
   */
  touchResource(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastAccessedAt = Date.now();
    }
  }

  /**
   * Mark resource as loaded/unloaded
   */
  setResourceLoaded(id: string, loaded: boolean): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.loaded = loaded;
    }
  }

  private addResource(resource: TrackedResource): void {
    this.resources.set(resource.id, resource);
    this.emit('resource:loaded', {
      id: resource.id,
      type: resource.type,
      memoryBytes: resource.memoryBytes,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MEMORY ESTIMATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Estimate texture memory usage
   */
  private estimateTextureMemory(texture: THREE.Texture): number {
    const image = texture.image;
    if (!image) return 0;

    const width = image.width || 1024;
    const height = image.height || 1024;

    // Bytes per pixel based on format
    let bytesPerPixel = 4; // Default RGBA

    if (texture.format === THREE.RedFormat) bytesPerPixel = 1;

    // Account for mipmaps (adds ~33% memory)
    const mipmapMultiplier = texture.generateMipmaps ? 1.33 : 1.0;

    // Base memory
    let memory = width * height * bytesPerPixel * mipmapMultiplier;

    // Apply safety buffer
    memory *= this.config.estimationBuffer;

    return Math.ceil(memory);
  }

  /**
   * Estimate geometry memory usage
   */
  private estimateGeometryMemory(geometry: THREE.BufferGeometry): number {
    let memory = 0;

    // Count all buffer attributes
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      if (attribute && 'array' in attribute) {
        memory += (attribute as THREE.BufferAttribute).array.byteLength;
      }
    }

    // Index buffer
    if (geometry.index) {
      memory += geometry.index.array.byteLength;
    }

    // Apply safety buffer
    memory *= this.config.estimationBuffer;

    return Math.ceil(memory);
  }

  /**
   * Estimate shader program memory
   */
  private estimateShaderMemory(material: THREE.Material): number {
    // Shader programs are relatively small (~10-50KB per program)
    // Estimate based on material complexity
    let baseSize = 10 * 1024; // 10KB base

    if ('map' in material && material.map) baseSize += 5 * 1024;
    if ('normalMap' in material && material.normalMap) baseSize += 5 * 1024;
    if ('roughnessMap' in material && material.roughnessMap) baseSize += 5 * 1024;
    if ('metalnessMap' in material && material.metalnessMap) baseSize += 5 * 1024;

    return baseSize;
  }

  /**
   * Estimate render target memory
   */
  private estimateRenderTargetMemory(renderTarget: THREE.WebGLRenderTarget): number {
    const width = renderTarget.width;
    const height = renderTarget.height;

    // Assume RGBA16F for HDR render targets, RGBA8 otherwise
    const bytesPerPixel = 8; // Conservative estimate

    return width * height * bytesPerPixel;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MEMORY MEASUREMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Measure current GPU memory usage
   */
  async measureMemory(): Promise<MemoryBreakdown> {
    const breakdown: MemoryBreakdown = this.createEmptyBreakdown();

    // Sum tracked resources
    for (const resource of this.resources.values()) {
      if (!resource.loaded) continue;

      switch (resource.type) {
        case 'texture':
          breakdown.textures += resource.memoryBytes;
          break;
        case 'geometry':
          breakdown.geometryBuffers += resource.memoryBytes;
          break;
        case 'shader':
          breakdown.shaderPrograms += resource.memoryBytes;
          break;
        case 'rendertarget':
          breakdown.renderTargets += resource.memoryBytes;
          break;
        default:
          breakdown.other += resource.memoryBytes;
      }
    }

    // Add renderer overhead if available
    if (this.threeRenderer) {
      const rendererMemory = this.getRendererMemoryEstimate();
      breakdown.other += rendererMemory;
    }

    // Calculate totals
    breakdown.total =
      breakdown.textures +
      breakdown.geometryBuffers +
      breakdown.shaderPrograms +
      breakdown.renderTargets +
      breakdown.other;

    breakdown.budgetMB = this.config.budgetMB;
    breakdown.utilizationPercent = breakdown.total / (this.config.budgetMB * 1024 * 1024);

    this.currentBreakdown = breakdown;
    this.lastMeasurement = Date.now();

    this.checkThresholds(breakdown.utilizationPercent);

    this.emit('stats:updated', this.getStats());

    return breakdown;
  }

  /**
   * Get Three.js renderer memory estimate
   */
  private getRendererMemoryEstimate(): number {
    if (!this.threeRenderer) return 0;

    const info = this.threeRenderer.info;
    let estimate = 0;

    // Framebuffer overhead
    const width = this.threeRenderer.domElement.width;
    const height = this.threeRenderer.domElement.height;
    estimate += width * height * 8; // Main framebuffer (RGBA16F estimate)

    // Program overhead (if not already tracked)
    estimate += (info.programs?.length || 0) * 10 * 1024; // 10KB per program

    return estimate;
  }

  private createEmptyBreakdown(): MemoryBreakdown {
    return {
      textures: 0,
      geometryBuffers: 0,
      shaderPrograms: 0,
      renderTargets: 0,
      other: 0,
      total: 0,
      budgetMB: this.config.budgetMB,
      utilizationPercent: 0,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // THRESHOLD MONITORING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Check memory thresholds and emit events
   */
  private checkThresholds(utilization: number): void {
    const thresholds = this.config.thresholds;
    let newState: MemoryStats['thresholdState'] = 'normal';

    if (utilization >= thresholds.emergency) {
      newState = 'emergency';
    } else if (utilization >= thresholds.critical) {
      newState = 'critical';
    } else if (utilization >= thresholds.reduction) {
      newState = 'reduction';
    } else if (utilization >= thresholds.alert) {
      newState = 'alert';
    }

    // Emit event on state change
    if (newState !== this.currentThresholdState) {
      const oldState = this.currentThresholdState;
      this.currentThresholdState = newState;

      logger.info('[GPUMemoryManager] Threshold state changed', {
        from: oldState,
        to: newState,
        utilization: (utilization * 100).toFixed(1) + '%',
      });

      // Emit specific threshold event
      this.emit(`threshold:${newState}`, {
        utilization,
        breakdown: this.currentBreakdown,
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MONITORING CONTROL
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Start automatic memory monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      logger.warn('[GPUMemoryManager] Monitoring already started');
      return;
    }

    logger.info('[GPUMemoryManager] Starting memory monitoring', {
      interval: this.config.measurementInterval + 'ms',
    });

    this.monitoringInterval = setInterval(() => {
      this.measureMemory().catch((error) => {
        logger.error('[GPUMemoryManager] Measurement failed', { error: String(error) });
      });
    }, this.config.measurementInterval);

    // Take initial measurement
    this.measureMemory();
  }

  /**
   * Stop automatic memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('[GPUMemoryManager] Stopped memory monitoring');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATISTICS & QUERIES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get current memory statistics
   */
  getStats(): MemoryStats {
    const resourceCounts: Record<TrackedResource['type'], number> = {
      texture: 0,
      geometry: 0,
      shader: 0,
      rendertarget: 0,
      other: 0,
    };

    for (const resource of this.resources.values()) {
      resourceCounts[resource.type]++;
    }

    return {
      breakdown: { ...this.currentBreakdown },
      resourceCounts,
      totalResources: this.resources.size,
      thresholdState: this.currentThresholdState,
      measurementAge: Date.now() - this.lastMeasurement,
    };
  }

  /**
   * Get current utilization percentage
   */
  getUtilization(): number {
    return this.currentBreakdown.utilizationPercent;
  }

  /**
   * Get current threshold state
   */
  getThresholdState(): MemoryStats['thresholdState'] {
    return this.currentThresholdState;
  }

  /**
   * Get all tracked resources, optionally filtered
   */
  getResources(filter?: {
    type?: TrackedResource['type'];
    loaded?: boolean;
    olderThan?: number; // Milliseconds since last access
  }): TrackedResource[] {
    const now = Date.now();
    const resources = Array.from(this.resources.values());

    if (!filter) return resources;

    return resources.filter((resource) => {
      if (filter.type && resource.type !== filter.type) return false;
      if (filter.loaded !== undefined && resource.loaded !== filter.loaded) return false;
      if (filter.olderThan && now - resource.lastAccessedAt < filter.olderThan) return false;
      return true;
    });
  }

  /**
   * Get resources sorted by memory size (largest first)
   */
  getLargestResources(count: number = 10): TrackedResource[] {
    return Array.from(this.resources.values())
      .sort((a, b) => b.memoryBytes - a.memoryBytes)
      .slice(0, count);
  }

  /**
   * Get least recently used resources
   */
  getLeastRecentlyUsed(count: number = 10): TrackedResource[] {
    return Array.from(this.resources.values())
      .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)
      .slice(0, count);
  }

  /**
   * Estimate how much memory would be freed by unloading specific resources
   */
  estimateFreedMemory(resourceIds: string[]): number {
    let total = 0;
    for (const id of resourceIds) {
      const resource = this.resources.get(id);
      if (resource && resource.loaded) {
        total += resource.memoryBytes;
      }
    }
    return total;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // REPORTING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Generate detailed memory report
   */
  generateReport(): string {
    const stats = this.getStats();
    const breakdown = stats.breakdown;
    const utilizationPct = (breakdown.utilizationPercent * 100).toFixed(1);

    const lines: string[] = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '  GPU MEMORY BUDGET REPORT',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `  Status:        ${stats.thresholdState.toUpperCase()}`,
      `  Utilization:   ${utilizationPct}% (${this.formatBytes(breakdown.total)} / ${breakdown.budgetMB} MB)`,
      '',
      '── Memory Breakdown ──',
      `  Textures:          ${this.formatBytes(breakdown.textures).padStart(12)} (${((breakdown.textures / breakdown.total) * 100).toFixed(1)}%)`,
      `  Geometry Buffers:  ${this.formatBytes(breakdown.geometryBuffers).padStart(12)} (${((breakdown.geometryBuffers / breakdown.total) * 100).toFixed(1)}%)`,
      `  Shader Programs:   ${this.formatBytes(breakdown.shaderPrograms).padStart(12)} (${((breakdown.shaderPrograms / breakdown.total) * 100).toFixed(1)}%)`,
      `  Render Targets:    ${this.formatBytes(breakdown.renderTargets).padStart(12)} (${((breakdown.renderTargets / breakdown.total) * 100).toFixed(1)}%)`,
      `  Other:             ${this.formatBytes(breakdown.other).padStart(12)} (${((breakdown.other / breakdown.total) * 100).toFixed(1)}%)`,
      '',
      '── Resource Counts ──',
      `  Textures:          ${stats.resourceCounts.texture}`,
      `  Geometries:        ${stats.resourceCounts.geometry}`,
      `  Shaders:           ${stats.resourceCounts.shader}`,
      `  Render Targets:    ${stats.resourceCounts.rendertarget}`,
      `  Other:             ${stats.resourceCounts.other}`,
      `  Total:             ${stats.totalResources}`,
      '',
      '── Thresholds ──',
      `  Alert      (${(this.config.thresholds.alert * 100).toFixed(0)}%):    ${breakdown.utilizationPercent >= this.config.thresholds.alert ? '✗ EXCEEDED' : '✓ OK'}`,
      `  Reduction  (${(this.config.thresholds.reduction * 100).toFixed(0)}%):    ${breakdown.utilizationPercent >= this.config.thresholds.reduction ? '✗ EXCEEDED' : '✓ OK'}`,
      `  Critical   (${(this.config.thresholds.critical * 100).toFixed(0)}%):    ${breakdown.utilizationPercent >= this.config.thresholds.critical ? '✗ EXCEEDED' : '✓ OK'}`,
      `  Emergency  (${(this.config.thresholds.emergency * 100).toFixed(0)}%):    ${breakdown.utilizationPercent >= this.config.thresholds.emergency ? '✗ EXCEEDED' : '✓ OK'}`,
    ];

    // Show largest resources
    const largest = this.getLargestResources(5);
    if (largest.length > 0) {
      lines.push('');
      lines.push('── Largest Resources ──');
      for (const resource of largest) {
        const pct = ((resource.memoryBytes / breakdown.total) * 100).toFixed(1);
        lines.push(
          `  ${resource.id.padEnd(25)} ${this.formatBytes(resource.memoryBytes).padStart(12)} (${pct}%)`
        );
      }
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Cleanup and stop monitoring
   */
  dispose(): void {
    this.stopMonitoring();
    this.resources.clear();
    this.removeAllListeners();
    logger.info('[GPUMemoryManager] Disposed');
  }
}
