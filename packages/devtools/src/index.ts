/**
 * @hololand/devtools
 *
 * Developer tools for Hololand - performance profiling, visual debugging,
 * network inspection, and in-VR console.
 *
 * @example
 * ```typescript
 * import { Profiler, DevConsole, NetworkInspector } from '@hololand/devtools';
 *
 * const profiler = new Profiler();
 * profiler.startFrame();
 * // ... render frame ...
 * profiler.endFrame();
 * console.log(profiler.getStats());
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export interface FrameStats {
  frameTime: number;
  fps: number;
  cpuTime: number;
  gpuTime?: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  memoryUsed: number;
}

export interface ProfilerConfig {
  enabled: boolean;
  historySize: number;
  warningThresholds: {
    frameTime: number;
    drawCalls: number;
    triangles: number;
    memory: number;
  };
}

export interface ConsoleEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
  stack?: string;
  data?: unknown;
}

export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status?: number;
  startTime: number;
  endTime?: number;
  requestSize: number;
  responseSize?: number;
  error?: string;
}

// =============================================================================
// PROFILER
// =============================================================================

/**
 * Performance profiler for tracking frame times and resource usage
 */
export class Profiler {
  private config: ProfilerConfig;
  private frameStart = 0;
  private frameHistory: FrameStats[] = [];
  private currentFrame: Partial<FrameStats> = {};
  private markers: Map<string, { start: number; duration?: number }> = new Map();

  constructor(config?: Partial<ProfilerConfig>) {
    this.config = {
      enabled: true,
      historySize: 120,
      warningThresholds: {
        frameTime: 16.67,
        drawCalls: 1000,
        triangles: 1000000,
        memory: 512 * 1024 * 1024,
      },
      ...config,
    };
  }

  /**
   * Start frame measurement
   */
  startFrame(): void {
    if (!this.config.enabled) return;
    this.frameStart = performance.now();
    this.currentFrame = {
      drawCalls: 0,
      triangles: 0,
      textures: 0,
    };
  }

  /**
   * End frame measurement
   */
  endFrame(): FrameStats | null {
    if (!this.config.enabled || this.frameStart === 0) return null;

    const frameTime = performance.now() - this.frameStart;
    const stats: FrameStats = {
      frameTime,
      fps: 1000 / frameTime,
      cpuTime: frameTime,
      drawCalls: this.currentFrame.drawCalls ?? 0,
      triangles: this.currentFrame.triangles ?? 0,
      textures: this.currentFrame.textures ?? 0,
      memoryUsed: this.getMemoryUsage(),
    };

    this.frameHistory.push(stats);
    if (this.frameHistory.length > this.config.historySize) {
      this.frameHistory.shift();
    }

    this.checkThresholds(stats);
    this.frameStart = 0;

    return stats;
  }

  /**
   * Record draw call
   */
  recordDrawCall(triangles: number): void {
    if (this.currentFrame.drawCalls !== undefined) {
      this.currentFrame.drawCalls++;
      this.currentFrame.triangles = (this.currentFrame.triangles ?? 0) + triangles;
    }
  }

  /**
   * Start a custom marker
   */
  beginMarker(name: string): void {
    this.markers.set(name, { start: performance.now() });
  }

  /**
   * End a custom marker
   */
  endMarker(name: string): number | null {
    const marker = this.markers.get(name);
    if (!marker) return null;

    marker.duration = performance.now() - marker.start;
    return marker.duration;
  }

  /**
   * Get marker duration
   */
  getMarkerDuration(name: string): number | null {
    return this.markers.get(name)?.duration ?? null;
  }

  /**
   * Get current stats
   */
  getStats(): FrameStats | null {
    return this.frameHistory[this.frameHistory.length - 1] ?? null;
  }

  /**
   * Get average stats over history
   */
  getAverageStats(): FrameStats {
    if (this.frameHistory.length === 0) {
      return {
        frameTime: 0, fps: 0, cpuTime: 0, drawCalls: 0,
        triangles: 0, textures: 0, memoryUsed: 0,
      };
    }

    const sum = this.frameHistory.reduce(
      (acc, s) => ({
        frameTime: acc.frameTime + s.frameTime,
        fps: acc.fps + s.fps,
        cpuTime: acc.cpuTime + s.cpuTime,
        drawCalls: acc.drawCalls + s.drawCalls,
        triangles: acc.triangles + s.triangles,
        textures: acc.textures + s.textures,
        memoryUsed: acc.memoryUsed + s.memoryUsed,
      }),
      { frameTime: 0, fps: 0, cpuTime: 0, drawCalls: 0, triangles: 0, textures: 0, memoryUsed: 0 }
    );

    const count = this.frameHistory.length;
    return {
      frameTime: sum.frameTime / count,
      fps: sum.fps / count,
      cpuTime: sum.cpuTime / count,
      drawCalls: Math.round(sum.drawCalls / count),
      triangles: Math.round(sum.triangles / count),
      textures: Math.round(sum.textures / count),
      memoryUsed: Math.round(sum.memoryUsed / count),
    };
  }

  /**
   * Get frame history
   */
  getHistory(): FrameStats[] {
    return [...this.frameHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.frameHistory = [];
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
    }
    return 0;
  }

  private checkThresholds(stats: FrameStats): void {
    const t = this.config.warningThresholds;

    if (stats.frameTime > t.frameTime) {
      console.warn(`[Profiler] Frame time ${stats.frameTime.toFixed(2)}ms exceeds threshold ${t.frameTime}ms`);
    }
    if (stats.drawCalls > t.drawCalls) {
      console.warn(`[Profiler] Draw calls ${stats.drawCalls} exceeds threshold ${t.drawCalls}`);
    }
  }

  /**
   * Enable/disable profiler
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Is profiler enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// =============================================================================
// DEV CONSOLE
// =============================================================================

/**
 * In-app developer console for logging and debugging
 */
export class DevConsole {
  private entries: ConsoleEntry[] = [];
  private maxEntries: number;
  private listeners: Set<(entry: ConsoleEntry) => void> = new Set();
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
    debug: typeof console.debug;
  };

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };
  }

  /**
   * Intercept console methods
   */
  intercept(): void {
    const self = this;

    console.log = function (...args) {
      self.addEntry('log', args);
      self.originalConsole.log(...args);
    };

    console.warn = function (...args) {
      self.addEntry('warn', args);
      self.originalConsole.warn(...args);
    };

    console.error = function (...args) {
      self.addEntry('error', args);
      self.originalConsole.error(...args);
    };

    console.info = function (...args) {
      self.addEntry('info', args);
      self.originalConsole.info(...args);
    };

    console.debug = function (...args) {
      self.addEntry('debug', args);
      self.originalConsole.debug(...args);
    };
  }

  /**
   * Restore original console
   */
  restore(): void {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  /**
   * Add log entry
   */
  private addEntry(type: ConsoleEntry['type'], args: unknown[]): void {
    const entry: ConsoleEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      message: args.map(a => this.stringify(a)).join(' '),
      timestamp: Date.now(),
      data: args.length > 1 ? args : args[0],
    };

    if (type === 'error') {
      entry.stack = new Error().stack;
    }

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  /**
   * Get all entries
   */
  getEntries(): ConsoleEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries by type
   */
  getEntriesByType(type: ConsoleEntry['type']): ConsoleEntry[] {
    return this.entries.filter(e => e.type === type);
  }

  /**
   * Clear entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Search entries
   */
  search(query: string): ConsoleEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.entries.filter(e => e.message.toLowerCase().includes(lowerQuery));
  }

  /**
   * Add listener for new entries
   */
  onEntry(listener: (entry: ConsoleEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Execute command
   */
  execute(command: string): unknown {
    try {
      // eslint-disable-next-line no-eval
      return eval(command);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }
}

// =============================================================================
// NETWORK INSPECTOR
// =============================================================================

/**
 * Network request inspector
 */
export class NetworkInspector {
  private requests: Map<string, NetworkRequest> = new Map();
  private listeners: Set<(request: NetworkRequest) => void> = new Set();
  private originalFetch: typeof fetch | null = null;

  /**
   * Start intercepting fetch requests
   */
  startIntercepting(): void {
    if (this.originalFetch) return;

    this.originalFetch = window.fetch.bind(window);
    const self = this;

    window.fetch = async function (input, init) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? 'GET';

      // Calculate request size safely
      let requestSize = 0;
      if (init?.body) {
        if (typeof init.body === 'string') {
          requestSize = new Blob([init.body]).size;
        } else if (init.body instanceof Blob) {
          requestSize = init.body.size;
        } else if (init.body instanceof ArrayBuffer) {
          requestSize = init.body.byteLength;
        }
        // Skip ReadableStream as it can't be sized without consuming
      }

      const request: NetworkRequest = {
        id,
        method,
        url,
        startTime: performance.now(),
        requestSize,
      };

      self.requests.set(id, request);
      self.notify(request);

      try {
        const response = await self.originalFetch!(input, init);
        const clone = response.clone();
        const blob = await clone.blob();

        request.status = response.status;
        request.endTime = performance.now();
        request.responseSize = blob.size;
        self.notify(request);

        return response;
      } catch (error) {
        request.endTime = performance.now();
        request.error = error instanceof Error ? error.message : String(error);
        self.notify(request);
        throw error;
      }
    };
  }

  /**
   * Stop intercepting
   */
  stopIntercepting(): void {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  private notify(request: NetworkRequest): void {
    for (const listener of this.listeners) {
      try {
        listener(request);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Get all requests
   */
  getRequests(): NetworkRequest[] {
    return Array.from(this.requests.values());
  }

  /**
   * Get request by ID
   */
  getRequest(id: string): NetworkRequest | undefined {
    return this.requests.get(id);
  }

  /**
   * Clear requests
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Add listener
   */
  onRequest(listener: (request: NetworkRequest) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get stats
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageTime: number;
    totalBytes: number;
  } {
    const requests = Array.from(this.requests.values());
    const completed = requests.filter(r => r.endTime !== undefined);

    return {
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.status && r.status >= 200 && r.status < 400).length,
      failedRequests: requests.filter(r => r.error || (r.status && r.status >= 400)).length,
      averageTime: completed.length > 0
        ? completed.reduce((sum, r) => sum + (r.endTime! - r.startTime), 0) / completed.length
        : 0,
      totalBytes: completed.reduce((sum, r) => sum + (r.responseSize ?? 0), 0),
    };
  }
}

// =============================================================================
// VISUAL DEBUGGER
// =============================================================================

export interface DebugDrawCommand {
  type: 'line' | 'sphere' | 'box' | 'text';
  color: string;
  duration: number;
  data: unknown;
}

/**
 * Visual debugger for drawing debug shapes in 3D space
 */
export class VisualDebugger {
  private commands: DebugDrawCommand[] = [];
  private enabled = true;

  /**
   * Draw a line
   */
  drawLine(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
    color = '#00ff00',
    duration = 0
  ): void {
    if (!this.enabled) return;
    this.commands.push({
      type: 'line',
      color,
      duration,
      data: { start, end },
    });
  }

  /**
   * Draw a sphere
   */
  drawSphere(
    center: { x: number; y: number; z: number },
    radius: number,
    color = '#00ff00',
    duration = 0
  ): void {
    if (!this.enabled) return;
    this.commands.push({
      type: 'sphere',
      color,
      duration,
      data: { center, radius },
    });
  }

  /**
   * Draw a box
   */
  drawBox(
    center: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number },
    color = '#00ff00',
    duration = 0
  ): void {
    if (!this.enabled) return;
    this.commands.push({
      type: 'box',
      color,
      duration,
      data: { center, size },
    });
  }

  /**
   * Draw text at position
   */
  drawText(
    position: { x: number; y: number; z: number },
    text: string,
    color = '#ffffff',
    duration = 0
  ): void {
    if (!this.enabled) return;
    this.commands.push({
      type: 'text',
      color,
      duration,
      data: { position, text },
    });
  }

  /**
   * Get all draw commands
   */
  getCommands(): DebugDrawCommand[] {
    return this.commands;
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands = [];
  }

  /**
   * Update (remove expired commands)
   */
  update(deltaTime: number): void {
    this.commands = this.commands.filter(cmd => {
      if (cmd.duration <= 0) return false;
      cmd.duration -= deltaTime;
      return cmd.duration > 0;
    });
  }

  /**
   * Enable/disable debugger
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const VERSION = '1.0.0-alpha.1';

// Singleton instances
let profilerInstance: Profiler | null = null;
let consoleInstance: DevConsole | null = null;
let networkInstance: NetworkInspector | null = null;
let visualDebuggerInstance: VisualDebugger | null = null;

/**
 * Get or create profiler singleton
 */
export function getProfiler(config?: Partial<ProfilerConfig>): Profiler {
  if (!profilerInstance) {
    profilerInstance = new Profiler(config);
  }
  return profilerInstance;
}

/**
 * Get or create dev console singleton
 */
export function getDevConsole(maxEntries?: number): DevConsole {
  if (!consoleInstance) {
    consoleInstance = new DevConsole(maxEntries);
  }
  return consoleInstance;
}

/**
 * Get or create network inspector singleton
 */
export function getNetworkInspector(): NetworkInspector {
  if (!networkInstance) {
    networkInstance = new NetworkInspector();
  }
  return networkInstance;
}

/**
 * Get or create visual debugger singleton
 */
export function getVisualDebugger(): VisualDebugger {
  if (!visualDebuggerInstance) {
    visualDebuggerInstance = new VisualDebugger();
  }
  return visualDebuggerInstance;
}
