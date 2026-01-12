/**
 * HoloScript Runtime Engine
 *
 * Executes HoloScript AST in VR environment with spatial computation
 */

import {
  ASTNode,
  OrbNode,
  MethodNode,
  ConnectionNode,
  GateNode,
  StreamNode,
  SpatialPosition,
  HologramProperties
} from './HoloScriptParser';
import { logger } from "./logger";;

// P.HOLO.SEC.006 - Runtime security limits
const RUNTIME_SECURITY_LIMITS = {
  maxExecutionDepth: 50,
  maxTotalNodes: 1000,
  maxExecutionTimeMs: 5000,
  maxParticlesPerSystem: 1000,
};

export interface RuntimeContext {
  variables: Map<string, any>;
  functions: Map<string, MethodNode>;
  connections: ConnectionNode[];
  spatialMemory: Map<string, SpatialPosition>;
  hologramState: Map<string, HologramProperties>;
  executionStack: ASTNode[];
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  hologram?: HologramProperties;
  spatialPosition?: SpatialPosition;
  error?: string;
  executionTime?: number;
}

export interface ParticleSystem {
  particles: SpatialPosition[];
  color: string;
  lifetime: number;
  speed: number;
}

export class HoloScriptRuntime {
  private context: RuntimeContext;
  private particleSystems: Map<string, ParticleSystem> = new Map();
  private executionHistory: ExecutionResult[] = [];

  private startTime: number = 0;
  private nodeCount: number = 0;

  constructor() {
    this.context = this.createEmptyContext();
  }

  /**
   * Execute a single AST node
   */
  async executeNode(node: ASTNode): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      this.context.executionStack.push(node);

      let result: ExecutionResult;

      switch (node.type) {
        case 'orb':
          result = await this.executeOrb(node as OrbNode);
          break;

        case 'function':
          result = await this.executeFunction(node as MethodNode);
          break;

        case 'connection':
          result = await this.executeConnection(node as ConnectionNode);
          break;

        case 'gate':
          result = await this.executeGate(node as GateNode);
          break;

        case 'stream':
          result = await this.executeStream(node as StreamNode);
          break;

        case 'execute':
          result = await this.executeTarget(node);
          break;

        case 'debug':
          result = await this.executeDebug(node);
          break;

        case 'visualize':
          result = await this.executeVisualize(node);
          break;

        default:
          result = {
            success: false,
            error: `Unknown node type: ${node.type}`,
            executionTime: Date.now() - startTime,
          };
      }

      result.executionTime = Date.now() - startTime;
      this.executionHistory.push(result);
      this.context.executionStack.pop();

      return result;

    } catch (error) {
      const execTime = Date.now() - startTime;
      const errorResult: ExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: execTime,
      };

      this.executionHistory.push(errorResult);
      this.context.executionStack.pop();

      return errorResult;
    }
  }

  /**
   * Execute multiple nodes in sequence
   */
  async executeProgram(nodes: ASTNode[], depth: number = 0): Promise<ExecutionResult[]> {
    if (depth === 0) {
      this.startTime = Date.now();
      this.nodeCount = 0;
    }

    // P.HOLO.SEC.007 - Recursion depth limit
    if (depth > RUNTIME_SECURITY_LIMITS.maxExecutionDepth) {
      logger.error('[HoloScriptRuntime] Max execution depth exceeded', { depth });
      return [{
        success: false,
        error: `Max execution depth exceeded (${RUNTIME_SECURITY_LIMITS.maxExecutionDepth})`,
        executionTime: 0,
      }];
    }

    const results: ExecutionResult[] = [];

    for (const node of nodes) {
      // P.HOLO.SEC.008 - Total nodes limit
      this.nodeCount++;
      if (this.nodeCount > RUNTIME_SECURITY_LIMITS.maxTotalNodes) {
        logger.error('[HoloScriptRuntime] Max total nodes exceeded', { count: this.nodeCount });
        results.push({
          success: false,
          error: 'Max total nodes exceeded',
          executionTime: Date.now() - this.startTime,
        });
        break;
      }

      // P.HOLO.SEC.009 - Execution time limit
      if (Date.now() - this.startTime > RUNTIME_SECURITY_LIMITS.maxExecutionTimeMs) {
        logger.error('[HoloScriptRuntime] Execution timeout', { duration: Date.now() - this.startTime });
        results.push({
          success: false,
          error: 'Execution timeout',
          executionTime: Date.now() - this.startTime,
        });
        break;
      }

      const result = await this.executeNode(node);
      results.push(result);

      // Stop on first error unless it's a visualization
      if (!result.success && node.type !== 'visualize') {
        break;
      }
    }

    return results;
  }

  /**
   * Execute orb creation
   */
  private async executeOrb(node: OrbNode): Promise<ExecutionResult> {
    // Create spatial memory entry
    if (node.position) {
      this.context.spatialMemory.set(node.name, node.position);
    }

    // Initialize properties
    this.context.variables.set(node.name, {
      type: 'orb',
      properties: node.properties,
      position: node.position,
      created: Date.now(),
    });

    // Create hologram state
    if (node.hologram) {
      this.context.hologramState.set(node.name, node.hologram);
    }

    // Create particle effect for creation
    this.createParticleEffect(`${node.name}_creation`, node.position || {x:0,y:0,z:0}, '#00ffff', 20);

    return {
      success: true,
      output: node,
      hologram: node.hologram,
      spatialPosition: node.position,
    };
  }

  /**
   * Execute function definition
   */
  private async executeFunction(node: MethodNode): Promise<ExecutionResult> {
    // Register function in context
    this.context.functions.set(node.name, node);

    // Create visual representation
    const hologram: HologramProperties = {
      shape: 'cube',
      color: '#ff6b35',
      size: 1.5,
      glow: true,
      interactive: true,
      ...node.hologram,
    };

    this.context.hologramState.set(node.name, hologram);

    return {
      success: true,
      output: `Function ${node.name} defined with ${node.parameters.length} parameters`,
      hologram,
      spatialPosition: node.position,
    };
  }

  /**
   * Execute connection between objects
   */
  private async executeConnection(node: ConnectionNode): Promise<ExecutionResult> {
    // Add connection to context
    this.context.connections.push(node);

    // Create particle stream between connected objects
    const fromPos = this.context.spatialMemory.get(node.from);
    const toPos = this.context.spatialMemory.get(node.to);

    if (fromPos && toPos) {
      this.createConnectionStream(node.from, node.to, fromPos, toPos, node.dataType);
    }

    return {
      success: true,
      output: `Connected ${node.from} to ${node.to}`,
      hologram: {
        shape: 'cylinder',
        color: this.getDataTypeColor(node.dataType),
        size: 0.1,
        glow: true,
        interactive: false,
      },
    };
  }

  /**
   * Execute conditional gate
   */
  private async executeGate(node: GateNode): Promise<ExecutionResult> {
    try {
      // Evaluate condition (simplified - in real implementation would use proper expression evaluation)
      const condition = this.evaluateCondition(node.condition);

      const path = condition ? node.truePath : node.falsePath;
      await this.executeProgram(path);

      return {
        success: true,
        output: `Gate executed: ${condition ? 'true' : 'false'} path`,
        hologram: {
          shape: 'pyramid',
          color: condition ? '#00ff00' : '#ff0000',
          size: 1,
          glow: true,
          interactive: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Gate execution failed: ${error}`,
      };
    }
  }

  /**
   * Execute data stream
   */
  private async executeStream(node: StreamNode): Promise<ExecutionResult> {
    // Simulate data processing through stream
    let data = this.context.variables.get(node.source);

    for (const transform of node.transformations) {
      data = await this.applyTransformation(data, transform);
    }

    // Store result
    this.context.variables.set(`${node.name}_result`, data);

    // Create flowing particle effect
    this.createFlowingStream(node.name, node.position || {x:0,y:0,z:0}, data);

    return {
      success: true,
      output: `Stream ${node.name} processed ${Array.isArray(data) ? data.length : 1} items`,
      hologram: node.hologram,
      spatialPosition: node.position,
    };
  }

  /**
   * Execute target execution
   */
  private async executeTarget(node: any): Promise<ExecutionResult> {
    const target = this.context.functions.get(node.target);

    if (!target) {
      return {
        success: false,
        error: `Function ${node.target} not found`,
      };
    }

    // Simulate function execution
    await this.executeFunction(target);

    // Create execution particle effect
    this.createExecutionEffect(node.target, target.position || {x:0,y:0,z:0});

    return {
      success: true,
      output: `Executed ${node.target}`,
      hologram: {
        shape: 'sphere',
        color: '#ff4500',
        size: 1.2,
        glow: true,
        interactive: false,
      },
    };
  }

  /**
   * Execute debug operation
   */
  private async executeDebug(node: any): Promise<ExecutionResult> {
    const target = node.target;
    const debugInfo = {
      variables: Object.fromEntries(this.context.variables),
      functions: Array.from(this.context.functions.keys()),
      connections: this.context.connections.length,
      executionHistory: this.executionHistory.slice(-10),
    };

    // Create debug hologram
    const debugOrb = {
      shape: 'pyramid' as const,
      color: '#ff1493',
      size: 0.8,
      glow: true,
      interactive: true,
    };

    this.context.hologramState.set(`debug_${target}`, debugOrb);

    return {
      success: true,
      output: debugInfo,
      hologram: debugOrb,
    };
  }

  /**
   * Execute visualization
   */
  private async executeVisualize(node: any): Promise<ExecutionResult> {
    const target = node.target;
    const data = this.context.variables.get(target);

    if (!data) {
      return {
        success: false,
        error: `No data found for ${target}`,
      };
    }

    // Create visualization hologram
    const visHologram = {
      shape: 'cylinder' as const,
      color: '#32cd32',
      size: 1.5,
      glow: true,
      interactive: true,
    };

    // Create data visualization particles
    this.createDataVisualization(target, data, node.position || {x:0,y:0,z:0});

    return {
      success: true,
      output: `Visualizing ${target}`,
      hologram: visHologram,
    };
  }

  /**
   * Evaluate simple condition
   * P.HOLO.SEC.010 - Strict and safe condition evaluation
   */
  private evaluateCondition(condition: string): boolean {
    if (!condition) return false;

    // Reject suspicious keywords in conditions even if not evaluating directly
    const suspiciousKeywords = ['eval', 'process', 'require', '__proto__', 'constructor'];
    if (suspiciousKeywords.some(kw => condition.toLowerCase().includes(kw))) {
      logger.warn('[HoloScriptRuntime] Suspicious condition blocked', { condition });
      return false;
    }

    try {
      // Handle basic comparisons: var > 10, var == "value", etc.
      const match = condition.match(/^(\w+)\s*(>=|<=|==|!=|>|<)\s*(.+)$/);
      if (match) {
        const [, varName, operator, rawValue] = match;
        const variable = this.context.variables.get(varName);

        if (variable === undefined) return false;

        // Strip quotes if string
        let value: any = rawValue.trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        } else if (!isNaN(parseFloat(value))) {
          value = parseFloat(value);
        }

        switch (operator) {
          case '>=': return variable >= value;
          case '<=': return variable <= value;
          case '==': return variable === value;
          case '!=': return variable !== value;
          case '>': return variable > value;
          case '<': return variable < value;
        }
      }

      // Boolean constants
      if (condition.trim().toLowerCase() === 'true') return true;
      if (condition.trim().toLowerCase() === 'false') return false;

      // Variable existence
      if (/^\w+$/.test(condition.trim())) {
        return !!this.context.variables.get(condition.trim());
      }

      logger.warn('[HoloScriptRuntime] Complex condition defaulted to false', { condition });
      return false;
    } catch (error) {
      logger.error('[HoloScriptRuntime] Condition evaluation error', { condition, error });
      return false;
    }
  }

  /**
   * Apply transformation to data
   */
  private async applyTransformation(data: any, transform: any): Promise<any> {
    // Simulate various transformations
    switch (transform.operation) {
      case 'filter':
        return Array.isArray(data) ? data.filter(item => item !== null) : data;

      case 'map':
        return Array.isArray(data) ? data.map(item => ({ ...item, processed: true })) : data;

      case 'sort':
        return Array.isArray(data) ? data.sort() : data;

      case 'sum':
        return Array.isArray(data) ? data.reduce((sum, item) => sum + (typeof item === 'number' ? item : 0), 0) : data;

      default:
        return data;
    }
  }

  /**
   * Create particle effect
   * P.HOLO.SEC.011 - Limit Max Particles per system
   */
  private createParticleEffect(name: string, position: SpatialPosition, color: string, count: number): void {
    const limitedCount = Math.min(count, RUNTIME_SECURITY_LIMITS.maxParticlesPerSystem);
    const particles: SpatialPosition[] = [];

    for (let i = 0; i < limitedCount; i++) {
      particles.push({
        x: position.x + (Math.random() - 0.5) * 2,
        y: position.y + (Math.random() - 0.5) * 2,
        z: position.z + (Math.random() - 0.5) * 2,
      });
    }

    this.particleSystems.set(name, {
      particles,
      color,
      lifetime: 3000, // 3 seconds
      speed: 0.01,
    });
  }

  /**
   * Create connection stream
   */
  private createConnectionStream(from: string, to: string, fromPos: SpatialPosition, toPos: SpatialPosition, dataType: string): void {
    const streamName = `connection_${from}_${to}`;
    const particles: SpatialPosition[] = [];

    // Create particles along the connection line
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      particles.push({
        x: fromPos.x + (toPos.x - fromPos.x) * t,
        y: fromPos.y + (toPos.y - fromPos.y) * t,
        z: fromPos.z + (toPos.z - fromPos.z) * t,
      });
    }

    this.particleSystems.set(streamName, {
      particles,
      color: this.getDataTypeColor(dataType),
      lifetime: 5000, // 5 seconds
      speed: 0.02,
    });
  }

  /**
   * Create flowing stream effect
   */
  private createFlowingStream(name: string, position: SpatialPosition, data: any): void {
    const count = Array.isArray(data) ? Math.min(data.length, 50) : 10;
    this.createParticleEffect(`${name}_flow`, position, '#45b7d1', count);
  }

  /**
   * Create execution effect
   */
  private createExecutionEffect(name: string, position: SpatialPosition): void {
    this.createParticleEffect(`${name}_execution`, position, '#ff4500', 30);
  }

  /**
   * Create data visualization
   */
  private createDataVisualization(name: string, data: any, position: SpatialPosition): void {
    let count = 10;

    if (Array.isArray(data)) {
      count = Math.min(data.length, 100);
    } else if (typeof data === 'object') {
      count = Math.min(Object.keys(data).length * 5, 50);
    }

    this.createParticleEffect(`${name}_visualization`, position, '#32cd32', count);
  }

  /**
   * Get color for data type
   */
  private getDataTypeColor(dataType: string): string {
    const colors: Record<string, string> = {
      'string': '#ff6b35',
      'number': '#4ecdc4',
      'boolean': '#45b7d1',
      'object': '#96ceb4',
      'array': '#ffeaa7',
      'any': '#dda0dd',
    };

    return colors[dataType] || '#ffffff';
  }

  /**
   * Get current particle systems for rendering
   */
  getParticleSystems(): Map<string, ParticleSystem> {
    return new Map(this.particleSystems);
  }

  /**
   * Update particle systems (call this in render loop)
   */
  updateParticles(deltaTime: number): void {
    for (const [name, system] of this.particleSystems) {
      system.lifetime -= deltaTime;

      // Move particles
      system.particles.forEach(particle => {
        particle.x += (Math.random() - 0.5) * system.speed;
        particle.y += (Math.random() - 0.5) * system.speed;
        particle.z += (Math.random() - 0.5) * system.speed;
      });

      // Remove expired systems
      if (system.lifetime <= 0) {
        this.particleSystems.delete(name);
      }
    }
  }

  /**
   * Get current runtime context
   */
  getContext(): RuntimeContext {
    return { ...this.context };
  }

  /**
   * Reset runtime
   */
  reset(): void {
    this.context = this.createEmptyContext();
    this.particleSystems.clear();
    this.executionHistory = [];
  }

  /**
   * Create empty context
   */
  private createEmptyContext(): RuntimeContext {
    return {
      variables: new Map(),
      functions: new Map(),
      connections: [],
      spatialMemory: new Map(),
      hologramState: new Map(),
      executionStack: [],
    };
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * Get hologram states for rendering
   */
  getHologramStates(): Map<string, HologramProperties> {
    return new Map(this.context.hologramState);
  }
}