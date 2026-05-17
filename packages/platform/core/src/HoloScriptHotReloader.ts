/**
 * HoloScriptHotReloader
 *
 * Phase 5: Self-Building World — Hot-reload .hsplus/.holo files while
 * keeping a live WebXR session running.
 *
 * Flow:
 *   1. Watch file system for .hsplus / .holo changes
 *   2. Re-parse changed file → new AST
 *   3. Diff old AST vs new AST (node-level)
 *   4. Patch the running scene graph via TraitRuntimeIntegration + HoloScriptBridge
 *   5. Emit events so HUD / Brittney can notify the user
 *
 * NOTE: This file stays in Hololand — depends on @hololand/logger, fs.watch,
 * and local platform bridges. When TraitRuntimeIntegration migrates,
 * update import to use @holoscript/core.
 *
 * Supported environments:
 *   - Node.js (uses fs.watch)
 *   - Browser  (polling or external WebSocket push)
 */

import { createLogger } from '@hololand/logger';
import type { ASTNode, HSPlusNode, ParseResult } from '@holoscript/core';
import type { HoloScriptBridge } from './HoloScriptBridge';
import type { TraitRuntimeIntegration } from './TraitRuntimeIntegration';

const logger = createLogger('HotReloader');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HotReloaderConfig {
  /** Root directory to watch (absolute path) */
  watchDir: string;

  /** File extensions to watch */
  extensions: string[];

  /** Debounce interval in ms */
  debounceMs: number;

  /** Strategy: 'patch' tries node-level diff, 'full' reloads entire composition */
  strategy: 'patch' | 'full';

  /** Enable verbose logging */
  debug: boolean;

  /** WebSocket URL for browser-side push updates (optional) */
  wsUrl?: string;
}

export interface FileChange {
  filePath: string;
  timestamp: number;
  type: 'change' | 'add' | 'remove';
}

export interface PatchResult {
  success: boolean;
  filePath: string;
  nodesAdded: number;
  nodesRemoved: number;
  nodesUpdated: number;
  duration: number;
  error?: string;
}

export interface HotReloaderStats {
  isWatching: boolean;
  watchedFiles: number;
  totalReloads: number;
  successfulReloads: number;
  failedReloads: number;
  lastReload?: PatchResult;
  averageReloadMs: number;
}

type ReloaderEventType =
  | 'reload:start'
  | 'reload:success'
  | 'reload:error'
  | 'file:change'
  | 'file:add'
  | 'file:remove';

type ReloaderEventHandler = (data: unknown) => void;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: HotReloaderConfig = {
  watchDir: '.',
  extensions: ['.hsplus', '.holo', '.hs'],
  debounceMs: 250,
  strategy: 'patch',
  debug: false,
};

// ---------------------------------------------------------------------------
// AST Differ
// ---------------------------------------------------------------------------

interface ASTDiff {
  added: HSPlusNode[];
  removed: HSPlusNode[];
  updated: Array<{ oldNode: HSPlusNode; newNode: HSPlusNode }>;
  unchanged: HSPlusNode[];
}

function nodeKey(node: HSPlusNode): string {
  return node.id || node.type + '_' + JSON.stringify(node.properties ?? {}).slice(0, 64);
}

/**
 * Shallow diff two flat arrays of AST nodes by id/key.
 */
function diffAST(oldNodes: HSPlusNode[], newNodes: HSPlusNode[]): ASTDiff {
  const oldMap = new Map<string, HSPlusNode>();
  const newMap = new Map<string, HSPlusNode>();

  for (const n of oldNodes) oldMap.set(nodeKey(n), n);
  for (const n of newNodes) newMap.set(nodeKey(n), n);

  const added: HSPlusNode[] = [];
  const removed: HSPlusNode[] = [];
  const updated: Array<{ oldNode: HSPlusNode; newNode: HSPlusNode }> = [];
  const unchanged: HSPlusNode[] = [];

  // Nodes in new but not old → added
  for (const [key, node] of newMap) {
    if (!oldMap.has(key)) {
      added.push(node);
    }
  }

  // Nodes in old but not new → removed
  for (const [key, node] of oldMap) {
    if (!newMap.has(key)) {
      removed.push(node);
    }
  }

  // Nodes in both → check for changes
  for (const [key, newNode] of newMap) {
    const oldNode = oldMap.get(key);
    if (!oldNode) continue;

    if (nodesEqual(oldNode, newNode)) {
      unchanged.push(newNode);
    } else {
      updated.push({ oldNode, newNode });
    }
  }

  return { added, removed, updated, unchanged };
}

/**
 * Shallow equality check for two HSPlusNodes.
 */
function nodesEqual(a: HSPlusNode, b: HSPlusNode): boolean {
  // Quick type check
  if (a.type !== b.type) return false;

  // Compare properties
  const aProps = JSON.stringify(a.properties ?? {});
  const bProps = JSON.stringify(b.properties ?? {});
  if (aProps !== bProps) return false;

  // Compare traits
  const aTraits = a.traits ? JSON.stringify(Array.from(a.traits.entries())) : '';
  const bTraits = b.traits ? JSON.stringify(Array.from(b.traits.entries())) : '';
  if (aTraits !== bTraits) return false;

  // Compare directives
  const aDir = JSON.stringify(a.directives ?? []);
  const bDir = JSON.stringify(b.directives ?? []);
  if (aDir !== bDir) return false;

  return true;
}

/**
 * Flatten an AST tree into a flat list of nodes with ids.
 */
function flattenAST(nodes: ASTNode[]): HSPlusNode[] {
  const result: HSPlusNode[] = [];
  const walk = (list: ASTNode[]) => {
    for (const node of list) {
      result.push(node as HSPlusNode);
      if ((node as any).children) {
        walk((node as any).children);
      }
    }
  };
  walk(nodes);
  return result;
}

// ---------------------------------------------------------------------------
// HoloScriptHotReloader
// ---------------------------------------------------------------------------

export class HoloScriptHotReloader {
  private config: HotReloaderConfig;
  private bridge: HoloScriptBridge;
  private traitRuntime: TraitRuntimeIntegration;

  // File watching
  private watcher: any = null; // fs.FSWatcher | WebSocket | null
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // State
  private fileASTCache: Map<string, HSPlusNode[]> = new Map();
  private isWatching = false;
  private stats: HotReloaderStats = {
    isWatching: false,
    watchedFiles: 0,
    totalReloads: 0,
    successfulReloads: 0,
    failedReloads: 0,
    averageReloadMs: 0,
  };
  private totalReloadMs = 0;

  // Event emitter
  private listeners: Map<ReloaderEventType, Set<ReloaderEventHandler>> = new Map();

  constructor(
    bridge: HoloScriptBridge,
    traitRuntime: TraitRuntimeIntegration,
    config: Partial<HotReloaderConfig> = {}
  ) {
    this.bridge = bridge;
    this.traitRuntime = traitRuntime;
    this.config = { ...DEFAULT_CONFIG, ...config };

    logger.info('HotReloader created', {
      strategy: this.config.strategy,
      extensions: this.config.extensions,
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Start watching for file changes.
   *
   * In Node.js: uses `fs.watch` recursively.
   * In Browser with wsUrl: connects to a WebSocket that pushes file changes.
   * In Browser without wsUrl: does nothing (call `handleExternalChange` manually).
   */
  async start(): Promise<void> {
    if (this.isWatching) return;

    if (this.config.wsUrl) {
      await this.startWebSocketWatcher();
    } else if (
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as any).process !== 'undefined'
    ) {
      await this.startFSWatcher();
    } else {
      logger.info('No watcher available — use handleExternalChange() for browser hot-reload');
    }

    this.isWatching = true;
    this.stats.isWatching = true;
    logger.info('HotReloader started', { watchDir: this.config.watchDir });
  }

  /**
   * Stop watching.
   */
  stop(): void {
    if (!this.isWatching) return;

    if (this.watcher) {
      if (typeof this.watcher.close === 'function') {
        this.watcher.close();
      }
      this.watcher = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.isWatching = false;
    this.stats.isWatching = false;
    logger.info('HotReloader stopped');
  }

  /**
   * Manually trigger a reload for a file (browser API).
   * Call this from external watchers, WebSocket handlers, or dev tools.
   */
  async handleExternalChange(change: FileChange): Promise<PatchResult> {
    return this.processFileChange(change);
  }

  /**
   * Force a full reload of all cached files.
   */
  async forceFullReload(): Promise<PatchResult[]> {
    const results: PatchResult[] = [];
    for (const filePath of this.fileASTCache.keys()) {
      const result = await this.processFileChange({
        filePath,
        timestamp: Date.now(),
        type: 'change',
      });
      results.push(result);
    }
    return results;
  }

  /**
   * Pre-cache the AST for a file (call after initial load).
   */
  cacheFileAST(filePath: string, ast: ASTNode[]): void {
    this.fileASTCache.set(filePath, flattenAST(ast));
    this.stats.watchedFiles = this.fileASTCache.size;
  }

  /**
   * Get reload statistics.
   */
  getStats(): HotReloaderStats {
    return { ...this.stats };
  }

  // -------------------------------------------------------------------------
  // Event Emitter
  // -------------------------------------------------------------------------

  on(event: ReloaderEventType, handler: ReloaderEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: ReloaderEventType, handler: ReloaderEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: ReloaderEventType, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (e) {
          logger.error('Event handler error', { event, error: e });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // File Watching Internals
  // -------------------------------------------------------------------------

  private async startFSWatcher(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const watchDir = path.resolve(this.config.watchDir);

      // Use recursive watch (supported on Windows, macOS, and modern Linux)
      this.watcher = fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        const ext = path.extname(filename);
        if (!this.config.extensions.includes(ext)) return;

        const fullPath = path.join(watchDir, filename);
        this.debouncedChange({
          filePath: fullPath,
          timestamp: Date.now(),
          type: eventType === 'rename' ? 'add' : 'change',
        });
      });

      logger.info('FS watcher started', { dir: watchDir });
    } catch (e) {
      logger.warn('Failed to start FS watcher', { error: e });
    }
  }

  private async startWebSocketWatcher(): Promise<void> {
    try {
      const ws = new WebSocket(this.config.wsUrl!);

      ws.onmessage = (event) => {
        try {
          const change = JSON.parse(event.data as string) as FileChange;
          this.debouncedChange(change);
        } catch {
          logger.warn('Invalid WebSocket message', { data: event.data });
        }
      };

      ws.onclose = () => {
        logger.warn('WebSocket watcher disconnected');
        this.isWatching = false;
        this.stats.isWatching = false;
      };

      ws.onerror = (err) => {
        logger.error('WebSocket watcher error', { error: err });
      };

      this.watcher = ws;
      logger.info('WebSocket watcher connected', { url: this.config.wsUrl });
    } catch (e) {
      logger.warn('Failed to start WebSocket watcher', { error: e });
    }
  }

  private debouncedChange(change: FileChange): void {
    // Cancel any existing debounce timer for this file
    const existing = this.debounceTimers.get(change.filePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(change.filePath);
      this.processFileChange(change).catch((e) => {
        logger.error('Hot-reload failed', { file: change.filePath, error: e });
      });
    }, this.config.debounceMs);

    this.debounceTimers.set(change.filePath, timer);
  }

  // -------------------------------------------------------------------------
  // Core Reload Logic
  // -------------------------------------------------------------------------

  private async processFileChange(change: FileChange): Promise<PatchResult> {
    const start = performance.now();

    this.emit(('file:' + change.type) as ReloaderEventType, change);
    this.emit('reload:start', change);

    // Handle file removal
    if (change.type === 'remove') {
      return this.handleFileRemoval(change, start);
    }

    try {
      // 1. Read file contents
      const source = await this.readFile(change.filePath);
      if (!source) {
        return this.failResult(change.filePath, start, 'Could not read file');
      }

      // 2. Parse to AST
      const parseResult = await this.parseFile(source, change.filePath);
      if (!parseResult.success || !parseResult.ast) {
        const errors =
          parseResult.errors?.map((e: any) => e.message).join('; ') ?? 'Unknown parse error';
        return this.failResult(change.filePath, start, `Parse error: ${errors}`);
      }

      const newNodes = flattenAST(parseResult.ast);
      const oldNodes = this.fileASTCache.get(change.filePath) ?? [];

      let result: PatchResult;

      if (this.config.strategy === 'patch' && oldNodes.length > 0) {
        // Attempt node-level patching
        result = this.patchScene(change.filePath, oldNodes, newNodes, start);
      } else {
        // Full reload
        result = await this.fullReload(change.filePath, source, newNodes, start);
      }

      // Update cache
      this.fileASTCache.set(change.filePath, newNodes);
      this.stats.watchedFiles = this.fileASTCache.size;

      // Update stats
      this.stats.totalReloads++;
      if (result.success) {
        this.stats.successfulReloads++;
        this.emit('reload:success', result);
      } else {
        this.stats.failedReloads++;
        this.emit('reload:error', result);
      }
      this.stats.lastReload = result;
      this.totalReloadMs += result.duration;
      this.stats.averageReloadMs =
        this.stats.totalReloads > 0 ? this.totalReloadMs / this.stats.totalReloads : 0;

      return result;
    } catch (error) {
      const result = this.failResult(change.filePath, start, String(error));
      this.stats.totalReloads++;
      this.stats.failedReloads++;
      this.stats.lastReload = result;
      this.emit('reload:error', result);
      return result;
    }
  }

  /**
   * Node-level patching: diff old/new AST, apply minimal changes.
   */
  private patchScene(
    filePath: string,
    oldNodes: HSPlusNode[],
    newNodes: HSPlusNode[],
    startTime: number
  ): PatchResult {
    const diff = diffAST(oldNodes, newNodes);

    if (this.config.debug) {
      logger.debug('AST diff', {
        file: filePath,
        added: diff.added.length,
        removed: diff.removed.length,
        updated: diff.updated.length,
        unchanged: diff.unchanged.length,
      });
    }

    // 1. Remove deleted nodes from trait runtime
    for (const node of diff.removed) {
      const id = node.id || nodeKey(node);
      this.traitRuntime.unregisterNode(id);

      if (this.config.debug) {
        logger.debug('Node removed', { id });
      }
    }

    // 2. Add new nodes
    for (const node of diff.added) {
      this.traitRuntime.registerNode(node);

      if (this.config.debug) {
        logger.debug('Node added', { id: node.id });
      }
    }

    // 3. Update changed nodes (detach old traits, reattach new)
    for (const { oldNode, newNode } of diff.updated) {
      const oldId = oldNode.id || nodeKey(oldNode);
      this.traitRuntime.unregisterNode(oldId);
      this.traitRuntime.registerNode(newNode);

      if (this.config.debug) {
        logger.debug('Node updated', { id: newNode.id });
      }
    }

    // 4. Refresh context to pick up any provider changes
    this.traitRuntime.refreshContext();

    const duration = performance.now() - startTime;

    logger.info('Hot-reload patch applied', {
      file: filePath,
      added: diff.added.length,
      removed: diff.removed.length,
      updated: diff.updated.length,
      durationMs: duration.toFixed(1),
    });

    return {
      success: true,
      filePath,
      nodesAdded: diff.added.length,
      nodesRemoved: diff.removed.length,
      nodesUpdated: diff.updated.length,
      duration,
    };
  }

  /**
   * Full reload: reset bridge, reload entire script.
   */
  private async fullReload(
    filePath: string,
    source: string,
    newNodes: HSPlusNode[],
    startTime: number
  ): Promise<PatchResult> {
    // Pause trait runtime during reload to avoid flicker
    this.traitRuntime.pause();

    try {
      // Reset and reload via bridge
      this.bridge.reset();
      this.traitRuntime.reset();

      const results = await this.bridge.loadScript(source);
      const success = results.every((r) => r.success);

      if (success) {
        // Re-attach traits for all nodes
        this.traitRuntime.attachTraitsFromAST(newNodes);
      }

      const duration = performance.now() - startTime;

      logger.info('Hot-reload full reload', {
        file: filePath,
        success,
        durationMs: duration.toFixed(1),
      });

      return {
        success,
        filePath,
        nodesAdded: newNodes.length,
        nodesRemoved: 0,
        nodesUpdated: 0,
        duration,
        error: success ? undefined : results.find((r) => !r.success)?.error,
      };
    } finally {
      this.traitRuntime.resume();
    }
  }

  /**
   * Handle removal of a file — unregister all its nodes.
   */
  private handleFileRemoval(change: FileChange, startTime: number): PatchResult {
    const oldNodes = this.fileASTCache.get(change.filePath) ?? [];

    for (const node of oldNodes) {
      const id = node.id || nodeKey(node);
      this.traitRuntime.unregisterNode(id);
    }

    this.fileASTCache.delete(change.filePath);
    this.stats.watchedFiles = this.fileASTCache.size;

    const duration = performance.now() - startTime;
    this.stats.totalReloads++;
    this.stats.successfulReloads++;

    logger.info('File removed — nodes unregistered', {
      file: change.filePath,
      nodesRemoved: oldNodes.length,
    });

    return {
      success: true,
      filePath: change.filePath,
      nodesAdded: 0,
      nodesRemoved: oldNodes.length,
      nodesUpdated: 0,
      duration,
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async readFile(filePath: string): Promise<string | null> {
    try {
      // Node.js path
      if (typeof (globalThis as any).process !== 'undefined') {
        const fs = await import('fs/promises');
        return await fs.readFile(filePath, 'utf-8');
      }

      // Browser path — try fetch
      const response = await fetch(filePath);
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  }

  private async parseFile(source: string, _filePath: string): Promise<ParseResult> {
    try {
      // Lazy-load parser to avoid circular deps
      const { HoloScriptCodeParser } = await import('@holoscript/core');
      const parser = new HoloScriptCodeParser();
      return parser.parse(source);
    } catch (error) {
      return {
        success: false,
        ast: [],
        errors: [{ message: String(error), line: 0, column: 0 }],
      } as unknown as ParseResult;
    }
  }

  private failResult(filePath: string, startTime: number, error: string): PatchResult {
    const duration = performance.now() - startTime;
    logger.error('Hot-reload failed', { file: filePath, error, durationMs: duration.toFixed(1) });
    return {
      success: false,
      filePath,
      nodesAdded: 0,
      nodesRemoved: 0,
      nodesUpdated: 0,
      duration,
      error,
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  dispose(): void {
    this.stop();
    this.fileASTCache.clear();
    this.listeners.clear();
    logger.info('HotReloader disposed');
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createHotReloader(
  bridge: HoloScriptBridge,
  traitRuntime: TraitRuntimeIntegration,
  config?: Partial<HotReloaderConfig>
): HoloScriptHotReloader {
  return new HoloScriptHotReloader(bridge, traitRuntime, config);
}
