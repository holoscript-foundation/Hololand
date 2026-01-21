/**
 * Shared Data Bridge for Brittney MCP Server
 *
 * This module provides inter-process communication between:
 * - Native Messaging Host (receives data from Chrome extension)
 * - MCP Server (provides data to IDE agents)
 *
 * Uses a file-based approach for simplicity. Data is written to a temp file
 * by the native messaging host and read by the MCP server.
 *
 * Architecture:
 * Browser Extension → Native Messaging Host → SharedDataBridge (file) → MCP Server → IDE Agent
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, watchFile, unwatchFile } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

// =============================================================================
// TYPES
// =============================================================================

export interface BrowserStateData {
  url: string;
  title: string;
  isHololandApp: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export interface SceneInfoData {
  id: string;
  name: string;
  objectCount: number;
  componentCount: number;
  isActive: boolean;
}

export interface ProfilerStatsData {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  memoryUsed: number;
  gpuMemory?: number;
}

export interface ConsoleLogData {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
  source?: string;
  stack?: string;
}

export interface RuntimeErrorData {
  message: string;
  stack?: string;
  componentId?: string;
  line?: number;
  column?: number;
  source?: string;
}

export interface BridgeData {
  lastUpdate: number;
  connected: boolean;
  browserState?: BrowserStateData;
  scenes?: SceneInfoData[];
  profilerStats?: ProfilerStatsData;
  consoleLogs?: ConsoleLogData[];
  runtimeErrors?: RuntimeErrorData[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const BRIDGE_DIR = join(tmpdir(), 'hololand-mcp');
const BRIDGE_FILE = join(BRIDGE_DIR, 'browser-data.json');
const DATA_TTL = 10000; // Data expires after 10 seconds
const WATCH_INTERVAL = 500; // Check for updates every 500ms

// =============================================================================
// BRIDGE IMPLEMENTATION
// =============================================================================

/**
 * Shared data bridge for cross-process communication
 */
class SharedDataBridge {
  private cachedData: BridgeData | null = null;
  private lastReadTime = 0;
  private watchers: ((data: BridgeData) => void)[] = [];

  constructor() {
    // Ensure bridge directory exists
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!existsSync(BRIDGE_DIR)) {
      mkdirSync(BRIDGE_DIR, { recursive: true });
    }
  }

  /**
   * Write data to the shared bridge (called by native messaging host)
   */
  write(data: Partial<BridgeData>): void {
    this.ensureDirectory();
    
    // Read existing data and merge
    const existing = this.read() || { lastUpdate: 0, connected: false };
    const merged: BridgeData = {
      ...existing,
      ...data,
      lastUpdate: Date.now(),
    };

    try {
      writeFileSync(BRIDGE_FILE, JSON.stringify(merged, null, 2), 'utf8');
      this.cachedData = merged;
      
      // Notify watchers
      this.watchers.forEach(callback => callback(merged));
    } catch (error) {
      console.error('[SharedDataBridge] Failed to write:', error);
    }
  }

  /**
   * Read data from the shared bridge (called by MCP server)
   */
  read(): BridgeData | null {
    // Use cached data if recent enough
    const now = Date.now();
    if (this.cachedData && now - this.lastReadTime < WATCH_INTERVAL) {
      return this.cachedData;
    }

    if (!existsSync(BRIDGE_FILE)) {
      return null;
    }

    try {
      const content = readFileSync(BRIDGE_FILE, 'utf8');
      const data = JSON.parse(content) as BridgeData;
      
      // Check if data is stale
      if (now - data.lastUpdate > DATA_TTL) {
        return null;
      }

      this.cachedData = data;
      this.lastReadTime = now;
      return data;
    } catch (error) {
      console.error('[SharedDataBridge] Failed to read:', error);
      return null;
    }
  }

  /**
   * Check if browser is connected and data is fresh
   */
  isConnected(): boolean {
    const data = this.read();
    return data?.connected === true && Date.now() - data.lastUpdate < DATA_TTL;
  }

  /**
   * Get browser state
   */
  getBrowserState(): BrowserStateData | undefined {
    return this.read()?.browserState;
  }

  /**
   * Get scene list
   */
  getScenes(): SceneInfoData[] {
    return this.read()?.scenes || [];
  }

  /**
   * Get profiler stats
   */
  getProfilerStats(): ProfilerStatsData | undefined {
    return this.read()?.profilerStats;
  }

  /**
   * Get console logs
   */
  getConsoleLogs(): ConsoleLogData[] {
    return this.read()?.consoleLogs || [];
  }

  /**
   * Get runtime errors
   */
  getRuntimeErrors(): RuntimeErrorData[] {
    return this.read()?.runtimeErrors || [];
  }

  /**
   * Set connection status (called by native messaging host)
   */
  setConnected(value: boolean): void {
    this.write({ connected: value });
  }

  /**
   * Set browser state (called by native messaging host)
   */
  setBrowserState(state: BrowserStateData): void {
    this.write({ browserState: state, connected: true });
  }

  /**
   * Set scenes (called by native messaging host)
   */
  setScenes(scenes: SceneInfoData[]): void {
    this.write({ scenes });
  }

  /**
   * Set profiler stats (called by native messaging host)
   */
  setProfilerStats(stats: ProfilerStatsData): void {
    this.write({ profilerStats: stats });
  }

  /**
   * Set console logs (called by native messaging host)
   */
  setConsoleLogs(logs: ConsoleLogData[]): void {
    this.write({ consoleLogs: logs });
  }

  /**
   * Add console log (called by native messaging host)
   */
  addConsoleLog(log: ConsoleLogData): void {
    const existing = this.read()?.consoleLogs || [];
    const logs = [...existing, log].slice(-100); // Keep last 100 logs
    this.write({ consoleLogs: logs });
  }

  /**
   * Set runtime errors (called by native messaging host)
   */
  setRuntimeErrors(errors: RuntimeErrorData[]): void {
    this.write({ runtimeErrors: errors });
  }

  /**
   * Clear all data
   */
  clear(): void {
    try {
      if (existsSync(BRIDGE_FILE)) {
        unlinkSync(BRIDGE_FILE);
      }
      this.cachedData = null;
    } catch (error) {
      console.error('[SharedDataBridge] Failed to clear:', error);
    }
  }

  /**
   * Watch for data changes
   */
  watch(callback: (data: BridgeData) => void): () => void {
    this.watchers.push(callback);
    
    // Return unwatch function
    return () => {
      const index = this.watchers.indexOf(callback);
      if (index > -1) {
        this.watchers.splice(index, 1);
      }
    };
  }

  /**
   * Get bridge file path (for debugging)
   */
  getBridgeFilePath(): string {
    return BRIDGE_FILE;
  }
}

// Export singleton instance
export const sharedDataBridge = new SharedDataBridge();
