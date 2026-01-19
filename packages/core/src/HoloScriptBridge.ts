/**
 * HoloScript-to-World Bridge
 *
 * Connects the HoloScript runtime to the Hololand world,
 * translating AST execution into spatial objects and world events.
 */

import {
  HoloScriptRuntime,
  HoloScriptCodeParser,
  type ASTNode,
  type ExecutionResult,
  type SpatialPosition,
  type HoloScriptValue,
} from '@holoscript/core';
import { createLogger } from '@hololand/logger';

// Types from @hololand/world (avoiding direct import for build flexibility)
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface WorldObject {
  id: string;
  setPosition(pos: Vector3): void;
  setVisible(visible: boolean): void;
  getPosition(): Vector3;
}

export interface WorldInterface {
  createObject(config: {
    type: string;
    position: Vector3;
    scale?: Vector3;
    metadata?: Record<string, unknown>;
  }): WorldObject;
  getObject(id: string): WorldObject | undefined;
  removeObject(id: string): void;
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
}

const logger = createLogger('HoloScriptBridge');

export interface BridgeConfig {
  /** Auto-sync runtime state to world */
  autoSync: boolean;
  /** Sync interval in ms (if autoSync) */
  syncInterval: number;
  /** Enable debug logging */
  debug: boolean;
  /** Default object scale */
  defaultScale: number;
}

export interface BridgeState {
  objectCount: number;
  functionCount: number;
  connectionCount: number;
  lastSyncTime: number;
  errors: string[];
}

const DEFAULT_CONFIG: BridgeConfig = {
  autoSync: true,
  syncInterval: 16, // ~60fps
  debug: false,
  defaultScale: 1,
};

/**
 * Bridge between HoloScript runtime and Hololand world
 */
export class HoloScriptBridge {
  private runtime: HoloScriptRuntime;
  private parser: HoloScriptCodeParser;
  private world: WorldInterface;
  private config: BridgeConfig;
  private objectMap: Map<string, string> = new Map(); // orb name -> world object id
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private state: BridgeState = {
    objectCount: 0,
    functionCount: 0,
    connectionCount: 0,
    lastSyncTime: 0,
    errors: [],
  };

  constructor(world: WorldInterface, config: Partial<BridgeConfig> = {}) {
    this.world = world;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.runtime = new HoloScriptRuntime();
    this.parser = new HoloScriptCodeParser();

    // Setup runtime event listeners
    this.setupRuntimeEvents();

    if (this.config.autoSync) {
      this.startAutoSync();
    }

    logger.info('HoloScriptBridge initialized', { config: this.config });
  }

  /**
   * Execute from natural language using AI bridge
   */
  async executeFromNL(input: string, context?: any): Promise<ExecutionResult[]> {
    try {
      // Lazy load AI bridge to avoid circular dependencies
      const { createAIBridge } = require('@hololand/ai-bridge');
      const aiBridge = createAIBridge();
      
      logger.info('Translating NL to HoloScript', { input });
      const result = await aiBridge.translateToHoloScript({ 
        naturalLanguage: input,
        context 
      });

      if (result.holoScript) {
        return this.loadScript(result.holoScript);
      }
      return [{ success: false, error: 'Translation produced no code' }];
    } catch (error) {
      logger.error('NL execution failed', { error });
      throw error;
    }
  }

  /**
   * Load and execute HoloScript code
   */
  async loadScript(code: string): Promise<ExecutionResult[]> {
    const parseResult = this.parser.parse(code);

    if (!parseResult.success) {
      const errors = parseResult.errors.map(e => `Line ${e.line}: ${e.message}`);
      this.state.errors.push(...errors);
      logger.error('Parse errors', { errors });
      return [{
        success: false,
        error: errors.join('\n'),
      }];
    }

    return this.executeAST(parseResult.ast);
  }

  /**
   * Execute parsed AST nodes
   */
  async executeAST(ast: ASTNode[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const node of ast) {
      const result = await this.executeNode(node);
      results.push(result);

      // Sync to world on each node execution
      if (result.success) {
        await this.syncNodeToWorld(node as any, result);
      }
    }

    return results;
  }

  /**
   * Execute a single AST node
   */
  private async executeNode(node: ASTNode): Promise<ExecutionResult> {
    const result = await this.runtime.executeNode(node);

    if (this.config.debug) {
      logger.debug('Node executed', {
        type: node.type,
        success: result.success,
        output: result.output,
      });
    }

    return result;
  }

  /**
   * Sync a node's execution result to the world
   */
  private async syncNodeToWorld(node: ASTNode, result: ExecutionResult): Promise<void> {
    switch (node.type) {
      case 'orb':
        await this.syncOrbToWorld(node, result);
        break;
      case 'connection':
        await this.syncConnectionToWorld(node);
        break;
      case 'stream':
        // Streams don't create spatial objects
        break;
      case 'gate':
        // Gates are logic, not spatial
        break;
      case 'shop':
        this.world.emit('commerce:shop_synced', node);
        break;
      case 'template':
        this.world.emit('builder:template_synced', node);
        break;
    }
  }

  /**
   * Sync an orb to the world as a SpatialObject
   */
  private async syncOrbToWorld(node: ASTNode, result: ExecutionResult): Promise<void> {
    const orbNode = node as ASTNode & { name: string; properties: Record<string, unknown> };
    const name = orbNode.name;

    // Check if orb already exists in world
    if (this.objectMap.has(name)) {
      // Update existing object
      const objectId = this.objectMap.get(name)!;
      const obj = this.world.getObject(objectId);
      if (obj && result.spatialPosition) {
        obj.setPosition(this.toVector3(result.spatialPosition));
      }
      return;
    }

    // Create new spatial object
    const position = result.spatialPosition || node.position || { x: 0, y: 0, z: 0 };
    const hologram = node.hologram || { color: '#00ffff', glow: true };

    const obj = this.world.createObject({
      type: 'orb',
      position: this.toVector3(position),
      scale: { x: this.config.defaultScale, y: this.config.defaultScale, z: this.config.defaultScale },
      metadata: {
        name,
        color: hologram.color,
        glow: hologram.glow,
        properties: orbNode.properties,
      },
    });

    this.objectMap.set(name, obj.id);
    this.state.objectCount++;

    logger.debug('Orb synced to world', { name, objectId: obj.id });
  }

  /**
   * Sync a connection to the world (visual link between objects)
   */
  private async syncConnectionToWorld(node: ASTNode): Promise<void> {
    const connNode = node as ASTNode & { from: string; to: string; dataType: string };

    const fromId = this.objectMap.get(connNode.from);
    const toId = this.objectMap.get(connNode.to);

    if (!fromId || !toId) {
      logger.warn('Connection references non-existent objects', {
        from: connNode.from,
        to: connNode.to,
      });
      return;
    }

    // Emit connection event for renderer to visualize
    this.world.emit('connection:created', {
      id: `${connNode.from}->${connNode.to}`,
      from: fromId,
      to: toId,
      dataType: connNode.dataType,
    });

    this.state.connectionCount++;
  }

  /**
   * Convert SpatialPosition to Vector3
   */
  private toVector3(pos: SpatialPosition): Vector3 {
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  /**
   * Setup runtime event listeners
   */
  private setupRuntimeEvents(): void {
    // Listen for runtime function calls that should affect the world
    this.runtime.on('spawn', (data) => {
      this.handleSpawn(data as { type: string; position: SpatialPosition; properties: Record<string, unknown> });
    });

    this.runtime.on('move', (data) => {
      this.handleMove(data as { target: string; position: SpatialPosition });
    });

    this.runtime.on('show', (data) => {
      this.handleVisibility(data as { target: string }, true);
    });

    this.runtime.on('hide', (data) => {
      this.handleVisibility(data as { target: string }, false);
    });

    // Commerce Events
    this.runtime.on('shop', (data) => {
      this.world.emit('commerce:shop_created', data);
    });
    this.runtime.on('inventory', (data) => {
      this.world.emit('commerce:inventory_updated', data);
    });
    this.runtime.on('purchase', (data) => {
      this.world.emit('commerce:purchase_initiated', data);
    });

    // Social Events
    this.runtime.on('presence', (data) => {
      this.world.emit('social:presence_updated', data);
    });
    this.runtime.on('invite', (data) => {
      this.world.emit('social:invite_sent', data);
    });
    this.runtime.on('share', (data) => {
      this.world.emit('social:script_shared', data);
    });

    // Physics Events
    this.runtime.on('physics', (data) => {
      this.world.emit('physics:config_updated', data);
    });
    this.runtime.on('gravity', (data) => {
      this.world.emit('physics:gravity_changed', data);
    });
    this.runtime.on('collide', (data) => {
      this.world.emit('physics:collision_registered', data);
    });
  }

  /**
   * Handle spawn command from runtime
   */
  private handleSpawn(data: { type: string; position: SpatialPosition; properties: Record<string, unknown> }): void {
    const obj = this.world.createObject({
      type: data.type || 'orb',
      position: this.toVector3(data.position),
      metadata: data.properties,
    });

    const name = `spawned_${obj.id}`;
    this.objectMap.set(name, obj.id);
    this.state.objectCount++;

    logger.debug('Spawned object', { name, id: obj.id });
  }

  /**
   * Handle move command from runtime
   */
  private handleMove(data: { target: string; position: SpatialPosition }): void {
    const objectId = this.objectMap.get(data.target);
    if (!objectId) {
      logger.warn('Move target not found', { target: data.target });
      return;
    }

    const obj = this.world.getObject(objectId);
    if (obj) {
      obj.setPosition(this.toVector3(data.position));
    }
  }

  /**
   * Handle visibility change
   */
  private handleVisibility(data: { target: string }, visible: boolean): void {
    const objectId = this.objectMap.get(data.target);
    if (!objectId) return;

    const obj = this.world.getObject(objectId);
    if (obj) {
      obj.setVisible(visible);
    }
  }

  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(() => {
      this.sync();
    }, this.config.syncInterval);
  }

  /**
   * Stop auto-sync timer
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Manual sync of runtime state to world
   */
  sync(): void {
    const context = this.runtime.getContext();

    // Sync variables that represent positions
    context.variables.forEach((value, name) => {
      if (this.isPosition(value)) {
        const objectId = this.objectMap.get(name);
        if (objectId) {
          const obj = this.world.getObject(objectId);
          if (obj) {
            obj.setPosition(value as Vector3);
          }
        }
      }
    });

    this.state.lastSyncTime = Date.now();
  }

  /**
   * Check if value is a position object
   */
  private isPosition(value: unknown): value is Vector3 {
    return (
      typeof value === 'object' &&
      value !== null &&
      'x' in value &&
      'y' in value &&
      'z' in value
    );
  }

  /**
   * Call a HoloScript function by name
   */
  async callFunction(name: string, args: HoloScriptValue[] = []): Promise<ExecutionResult> {
    return this.runtime.callFunction(name, args);
  }

  /**
   * Set a runtime variable
   */
  setVariable(name: string, value: HoloScriptValue): void {
    this.runtime.setVariable(name, value);
  }

  /**
   * Get a runtime variable
   */
  getVariable(name: string): unknown {
    return this.runtime.getVariable(name);
  }

  /**
   * Get bridge state
   */
  getState(): BridgeState {
    return { ...this.state };
  }

  /**
   * Get the underlying runtime
   */
  getRuntime(): HoloScriptRuntime {
    return this.runtime;
  }

  /**
   * Get the world
   */
  getWorld(): WorldInterface {
    return this.world;
  }

  /**
   * Reset bridge state
   */
  reset(): void {
    this.stopAutoSync();

    // Remove all synced objects from world
    this.objectMap.forEach((objectId) => {
      this.world.removeObject(objectId);
    });

    this.objectMap.clear();
    this.runtime.reset();

    this.state = {
      objectCount: 0,
      functionCount: 0,
      connectionCount: 0,
      lastSyncTime: 0,
      errors: [],
    };

    if (this.config.autoSync) {
      this.startAutoSync();
    }

    logger.info('Bridge reset');
  }

  /**
   * Dispose bridge
   */
  dispose(): void {
    this.stopAutoSync();
    this.objectMap.clear();
    logger.info('Bridge disposed');
  }
}

/**
 * Create a bridge instance
 */
export function createBridge(world: WorldInterface, config?: Partial<BridgeConfig>): HoloScriptBridge {
  return new HoloScriptBridge(world, config);
}
