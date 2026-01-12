import { logger } from './logger';
import { HoloScript2DParser, UI2DNode } from './HoloScript2DParser';

// P.HOLO.SEC.001 - HoloScript security configuration
const HOLOSCRIPT_SECURITY_CONFIG = {
  maxCommandLength: 1000,
  maxTokens: 100,
  maxHologramsPerUser: 50,
  suspiciousKeywords: [
    'process',
    'require',
    'eval',
    'import',
    'constructor',
    'prototype',
    '__proto__',
    'fs',
    'child_process',
    'exec',
    'spawn',
    'fetch',
    'xmlhttprequest',
  ],
  allowedShapes: ['orb', 'cube', 'cylinder', 'pyramid', 'sphere', 'function', 'gate', 'stream'],
  // 2D UI elements (for hybrid mode)
  allowedUIElements: [
    'canvas', 'button', 'textinput', 'panel', 'text', 'image',
    'list', 'modal', 'slider', 'toggle', 'dropdown',
    'flex-container', 'grid-container', 'scroll-view'
  ],
};

export interface SpatialPosition {
  x: number;
  y: number;
  z: number;
}

export interface HologramProperties {
  shape: 'orb' | 'cube' | 'cylinder' | 'pyramid' | 'sphere';
  color: string;
  size: number;
  glow: boolean;
  interactive: boolean;
}

export interface VoiceCommand {
  command: string;
  confidence: number;
  timestamp: number;
  spatialContext?: SpatialPosition;
}

export interface GestureData {
  type: 'pinch' | 'swipe' | 'rotate' | 'grab' | 'release';
  position: SpatialPosition;
  direction?: SpatialPosition;
  magnitude: number;
  hand: 'left' | 'right';
}

// AST Node Types
export interface ASTNode {
  type: string;
  position?: SpatialPosition;
  hologram?: HologramProperties;
}

export interface OrbNode extends ASTNode {
  type: 'orb';
  name: string;
  properties: Record<string, any>;
  methods: MethodNode[];
}

export interface MethodNode extends ASTNode {
  type: 'method';
  name: string;
  parameters: ParameterNode[];
  body: ASTNode[];
  returnType?: string;
}

export interface ParameterNode extends ASTNode {
  type: 'parameter';
  name: string;
  dataType: string;
  defaultValue?: any;
}

export interface ConnectionNode extends ASTNode {
  type: 'connection';
  from: string;
  to: string;
  dataType: string;
  bidirectional: boolean;
}

export interface GateNode extends ASTNode {
  type: 'gate';
  condition: string;
  truePath: ASTNode[];
  falsePath: ASTNode[];
}

export interface StreamNode extends ASTNode {
  type: 'stream';
  name: string;
  source: string;
  transformations: TransformationNode[];
}

export interface TransformationNode extends ASTNode {
  type: 'transformation';
  operation: string;
  parameters: Record<string, any>;
}

// Additional node types for parser operations
export interface GenericASTNode extends ASTNode {
  [key: string]: any;
}

export class HoloScriptParser {
  private ast: ASTNode[] = [];
  private parser2D: HoloScript2DParser;

  constructor() {
    this.parser2D = new HoloScript2DParser();
  }

  /**
   * Parse voice command into AST nodes (supports both 3D and 2D)
   */
  parseVoiceCommand(command: VoiceCommand): ASTNode[] {
    // P.HOLO.SEC.002 - Input length validation
    if (command.command.length > HOLOSCRIPT_SECURITY_CONFIG.maxCommandLength) {
      logger.warn('[HoloScriptParser] Command too long', {
        length: command.command.length,
        limit: HOLOSCRIPT_SECURITY_CONFIG.maxCommandLength,
      });
      return [];
    }

    const rawTokens = this.tokenizeCommand(command.command.toLowerCase());

    // P.HOLO.SEC.003 - Token sanitization
    const tokens = this.sanitizeTokens(rawTokens);

    if (tokens.length === 0) return [];

    // P.HOLO.SEC.004 - Token count validation
    if (tokens.length > HOLOSCRIPT_SECURITY_CONFIG.maxTokens) {
      logger.warn('[HoloScriptParser] Too many tokens in command', {
        tokenCount: tokens.length,
        limit: HOLOSCRIPT_SECURITY_CONFIG.maxTokens,
      });
      return [];
    }

    const commandType = tokens[0];

    // Check if this is a 2D UI command
    if ((commandType === 'create' || commandType === 'add') && tokens.length > 1) {
      const elementType = tokens[1];
      if (HOLOSCRIPT_SECURITY_CONFIG.allowedUIElements.includes(elementType)) {
        return this.parse2DUICommand(command.command);
      }
    }

    switch (commandType) {
      case 'create':
      case 'summon':
        return this.parseCreateCommand(tokens.slice(1), command.spatialContext);

      case 'connect':
        return this.parseConnectCommand(tokens.slice(1));

      case 'execute':
      case 'run':
        return this.parseExecuteCommand(tokens.slice(1));

      case 'debug':
        return this.parseDebugCommand(tokens.slice(1));

      case 'visualize':
        return this.parseVisualizeCommand(tokens.slice(1));

      default:
        return this.parseGenericCommand(tokens);
    }
  }

  /**
   * Parse 2D UI command
   */
  private parse2DUICommand(command: string): ASTNode[] {
    const ui2DNode = this.parser2D.parse2DVoiceCommand(command);

    if (!ui2DNode) return [];

    // Convert UI2DNode to ASTNode format
    const astNode: GenericASTNode = {
      type: '2d-ui',
      uiElementType: ui2DNode.elementType,
      name: ui2DNode.name,
      properties: ui2DNode.properties,
      events: ui2DNode.events,
      children: ui2DNode.children,
    };

    return [astNode];
  }

  /**
   * Parse gesture input
   */
  parseGesture(gesture: GestureData): ASTNode[] {
    switch (gesture.type) {
      case 'pinch':
        return this.parsePinchGesture(gesture);

      case 'swipe':
        return this.parseSwipeGesture(gesture);

      case 'rotate':
        return this.parseRotateGesture(gesture);

      case 'grab':
        return this.parseGrabGesture(gesture);

      default:
        return [];
    }
  }

  /**
   * Parse "create" commands
   */
  private parseCreateCommand(tokens: string[], position?: SpatialPosition): ASTNode[] {
    if (tokens.length < 2) return [];

    const shape = tokens[0];
    const name = tokens[1];

    switch (shape) {
      case 'orb':
      case 'sphere':
        return [this.createOrbNode(name, position)];

      case 'function':
        return [this.createFunctionNode(name, tokens.slice(2), position)];

      case 'gate':
        return [this.createGateNode(name, tokens.slice(2), position)];

      case 'stream':
        return [this.createStreamNode(name, tokens.slice(2), position)];

      default:
        return [this.createGenericNode(shape, name, position)];
    }
  }

  /**
   * Parse "connect" commands
   */
  private parseConnectCommand(tokens: string[]): ASTNode[] {
    if (tokens.length < 3) return [];

    const from = tokens[0];
    const to = tokens[2];
    const dataType = tokens.length > 3 ? tokens[3] : 'any';

    return [{
      type: 'connection',
      from,
      to,
      dataType,
      bidirectional: tokens.includes('bidirectional') || tokens.includes('both'),
    } as ConnectionNode];
  }

  /**
   * Create an orb node
   */
  private createOrbNode(name: string, position?: SpatialPosition): OrbNode {
    return {
      type: 'orb',
      name,
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'orb',
        color: '#00ffff',
        size: 1,
        glow: true,
        interactive: true,
      },
      properties: {},
      methods: [],
    };
  }

  /**
   * Create a function node
   */
  private createFunctionNode(name: string, params: string[], position?: SpatialPosition): GenericASTNode {
    const parameters: ParameterNode[] = [];
    const body: ASTNode[] = [];

    // Parse parameters (simplified)
    let inParams = false;
    for (const param of params) {
      if (param === 'with' || param === 'parameters') {
        inParams = true;
        continue;
      }
      if (inParams && param !== 'do' && param !== 'execute') {
        parameters.push({
          type: 'parameter',
          name: param,
          dataType: 'any', // Simplified
        });
      }
    }

    return {
      type: 'function',
      name,
      parameters,
      body,
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'cube',
        color: '#ff6b35',
        size: 1.5,
        glow: true,
        interactive: true,
      },
    };
  }

  /**
   * Create a gate node (conditional)
   */
  private createGateNode(_name: string, params: string[], position?: SpatialPosition): GateNode {
    // Simplified gate parsing
    const condition = params.join(' ').replace('condition', '').trim();

    return {
      type: 'gate',
      condition,
      truePath: [],
      falsePath: [],
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'pyramid',
        color: '#4ecdc4',
        size: 1,
        glow: true,
        interactive: true,
      },
    };
  }

  /**
   * Create a stream node
   */
  private createStreamNode(name: string, params: string[], position?: SpatialPosition): StreamNode {
    return {
      type: 'stream',
      name,
      source: params[0] || 'unknown',
      transformations: [],
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'cylinder',
        color: '#45b7d1',
        size: 2,
        glow: true,
        interactive: true,
      },
    };
  }

  /**
   * Create generic node
   */
  private createGenericNode(shape: string, name: string, position?: SpatialPosition): GenericASTNode {
    return {
      type: shape,
      name,
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: shape as any,
        color: '#ffffff',
        size: 1,
        glow: false,
        interactive: true,
      },
    };
  }

  /**
   * Parse pinch gesture (create object)
   */
  private parsePinchGesture(gesture: GestureData): ASTNode[] {
    return [{
      type: 'create',
      position: gesture.position,
      hologram: {
        shape: 'orb',
        color: '#ff0000',
        size: 0.5,
        glow: true,
        interactive: true,
      },
    }];
  }

  /**
   * Parse swipe gesture (connect objects)
   */
  private parseSwipeGesture(gesture: GestureData): ASTNode[] {
    if (!gesture.direction) return [];

    return [{
      type: 'connect',
      position: gesture.position,
      hologram: {
        shape: 'cylinder',
        color: '#00ff00',
        size: gesture.magnitude,
        glow: true,
        interactive: false,
      },
    }];
  }

  /**
   * Parse rotate gesture (modify properties)
   */
  private parseRotateGesture(gesture: GestureData): ASTNode[] {
    return [{
      type: 'modify',
      position: gesture.position,
      hologram: {
        shape: 'sphere',
        color: '#ffff00',
        size: 0.8,
        glow: true,
        interactive: true,
      },
    }];
  }

  /**
   * Parse grab gesture (select object)
   */
  private parseGrabGesture(gesture: GestureData): ASTNode[] {
    return [{
      type: 'select',
      position: gesture.position,
      hologram: {
        shape: 'cube',
        color: '#ff00ff',
        size: 0.3,
        glow: true,
        interactive: true,
      },
    }];
  }

  /**
   * Tokenize voice command
   */
  private tokenizeCommand(command: string): string[] {
    return command
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Sanitize tokens against suspicious keywords
   * P.HOLO.SEC.005 - Input sanitization logic
   */
  private sanitizeTokens(tokens: string[]): string[] {
    return tokens.filter(token => {
      const isSuspicious = HOLOSCRIPT_SECURITY_CONFIG.suspiciousKeywords.some(
        keyword => token.includes(keyword)
      );

      if (isSuspicious) {
        logger.warn('[HoloScriptParser] Suspicious token blocked', { token });
        return false;
      }

      return true;
    });
  }

  /**
   * Parse execute commands
   */
  private parseExecuteCommand(tokens: string[]): GenericASTNode[] {
    return [{
      type: 'execute',
      target: tokens[0] || 'unknown',
      hologram: {
        shape: 'sphere',
        color: '#ff4500',
        size: 1.2,
        glow: true,
        interactive: false,
      },
    }];
  }

  /**
   * Parse debug commands
   */
  private parseDebugCommand(tokens: string[]): GenericASTNode[] {
    return [{
      type: 'debug',
      target: tokens[0] || 'program',
      hologram: {
        shape: 'pyramid',
        color: '#ff1493',
        size: 0.8,
        glow: true,
        interactive: true,
      },
    }];
  }

  /**
   * Parse visualize commands
   */
  private parseVisualizeCommand(tokens: string[]): GenericASTNode[] {
    return [{
      type: 'visualize',
      target: tokens[0] || 'data',
      hologram: {
        shape: 'cylinder',
        color: '#32cd32',
        size: 1.5,
        glow: true,
        interactive: true,
      },
    }];
  }

  /**
   * Parse generic commands
   */
  private parseGenericCommand(tokens: string[]): GenericASTNode[] {
    return [{
      type: 'generic',
      command: tokens.join(' '),
      hologram: {
        shape: 'orb',
        color: '#808080',
        size: 0.5,
        glow: false,
        interactive: true,
      },
    }];
  }

  /**
   * Get current AST
   */
  getAST(): ASTNode[] {
    return [...this.ast];
  }

  /**
   * Add node to AST
   */
  addNode(node: ASTNode): void {
    this.ast.push(node);
  }

  /**
   * Clear AST
   */
  clear(): void {
    this.ast = [];
  }

  /**
   * Find node by name
   */
  findNode(name: string): ASTNode | null {
    return this.ast.find(node => 'name' in node && node.name === name) || null;
  }

  /**
   * Get nodes at position
   */
  getNodesAtPosition(position: SpatialPosition, radius: number = 1): ASTNode[] {
    return this.ast.filter(node => {
      if (!node.position) return false;
      const distance = Math.sqrt(
        Math.pow(node.position.x - position.x, 2) +
        Math.pow(node.position.y - position.y, 2) +
        Math.pow(node.position.z - position.z, 2)
      );
      return distance <= radius;
    });
  }

  /**
   * Parse 2D UI element from HoloScript code
   *
   * Example:
   * button loginBtn {
   *   text: "Login"
   *   x: 100
   *   y: 100
   *   onClick: handleLogin
   * }
   */
  parse2DCode(code: string): UI2DNode | null {
    return this.parser2D.parse2DElement(code);
  }

  /**
   * Get 2D parser instance for advanced usage
   */
  get2DParser(): HoloScript2DParser {
    return this.parser2D;
  }

  /**
   * Parse hybrid code (both 3D and 2D elements)
   *
   * Automatically detects and routes to appropriate parser
   */
  parseHybridCode(code: string): { type: '3d' | '2d'; node: ASTNode | UI2DNode } | null {
    const lines = code.trim().split('\n');
    if (lines.length === 0) return null;

    const firstLine = lines[0].trim();
    const match = firstLine.match(/^(\w+)\s+\w+\s*\{/);

    if (!match) return null;

    const elementType = match[1];

    // Check if it's a 2D element
    if (HOLOSCRIPT_SECURITY_CONFIG.allowedUIElements.includes(elementType)) {
      const node = this.parser2D.parse2DElement(code);
      return node ? { type: '2d', node } : null;
    }

    // Check if it's a 3D element
    if (HOLOSCRIPT_SECURITY_CONFIG.allowedShapes.includes(elementType)) {
      // Parse as 3D orb/shape (simplified)
      const node = this.createOrbNode(elementType, { x: 0, y: 0, z: 0 });
      return { type: '3d', node };
    }

    return null;
  }
}
