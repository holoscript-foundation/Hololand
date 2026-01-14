/**
 * HoloScript Code Parser
 *
 * Parses HoloScript code strings into AST nodes that can be executed
 * by the HoloScriptRuntime. This bridges the gap between ai-bridge
 * generated code and actual execution.
 *
 * Syntax Reference:
 * - orb <name> { properties }
 * - function <name>(<params>): <return> { body }
 * - connect <from> to <to> [as <type>]
 * - gate <name> { condition, true_path, false_path }
 * - stream <name> from <source> { transformations }
 */

import { logger } from './logger';
import {
  ASTNode,
  OrbNode,
  MethodNode,
  ParameterNode,
  ConnectionNode,
  GateNode,
  StreamNode,
  SpatialPosition,
  HologramProperties,
} from './HoloScriptParser';

// Security configuration
const CODE_SECURITY_CONFIG = {
  maxCodeLength: 50000,
  maxBlocks: 100,
  maxNestingDepth: 10,
  suspiciousKeywords: [
    'process', 'require', 'eval', 'import', 'constructor',
    'prototype', '__proto__', 'fs', 'child_process', 'exec', 'spawn',
  ],
};

export interface ParseResult {
  success: boolean;
  ast: ASTNode[];
  errors: ParseError[];
  warnings: string[];
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
}

interface Token {
  type: 'keyword' | 'identifier' | 'number' | 'string' | 'operator' | 'punctuation' | 'newline';
  value: string;
  line: number;
  column: number;
}

export class HoloScriptCodeParser {
  private errors: ParseError[] = [];
  private warnings: string[] = [];
  private tokens: Token[] = [];
  private position: number = 0;

  /**
   * Parse HoloScript code string into AST
   */
  parse(code: string): ParseResult {
    this.errors = [];
    this.warnings = [];
    this.tokens = [];
    this.position = 0;

    // Security: Check code length
    if (code.length > CODE_SECURITY_CONFIG.maxCodeLength) {
      return {
        success: false,
        ast: [],
        errors: [{ line: 0, column: 0, message: `Code exceeds max length (${CODE_SECURITY_CONFIG.maxCodeLength})` }],
        warnings: [],
      };
    }

    // Security: Check for suspicious keywords
    for (const keyword of CODE_SECURITY_CONFIG.suspiciousKeywords) {
      if (code.toLowerCase().includes(keyword)) {
        logger.warn('[HoloScriptCodeParser] Suspicious keyword detected', { keyword });
        return {
          success: false,
          ast: [],
          errors: [{ line: 0, column: 0, message: `Suspicious keyword detected: ${keyword}` }],
          warnings: [],
        };
      }
    }

    try {
      // Tokenize
      this.tokens = this.tokenize(code);

      // Parse tokens into AST
      const ast = this.parseProgram();

      return {
        success: this.errors.length === 0,
        ast,
        errors: this.errors,
        warnings: this.warnings,
      };
    } catch (error) {
      return {
        success: false,
        ast: [],
        errors: [{ line: 0, column: 0, message: String(error) }],
        warnings: this.warnings,
      };
    }
  }

  /**
   * Tokenize code into tokens
   */
  private tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    let line = 1;
    let column = 1;
    let i = 0;

    const keywords = ['orb', 'function', 'connect', 'to', 'as', 'gate', 'stream', 'from', 'through', 'return', 'if', 'else', 'nexus', 'building', 'pillar', 'foundation'];

    while (i < code.length) {
      const char = code[i];

      // Skip whitespace (except newlines)
      if (char === ' ' || char === '\t' || char === '\r') {
        i++;
        column++;
        continue;
      }

      // Newline
      if (char === '\n') {
        tokens.push({ type: 'newline', value: '\n', line, column });
        line++;
        column = 1;
        i++;
        continue;
      }

      // Comments (skip)
      if (char === '/' && code[i + 1] === '/') {
        while (i < code.length && code[i] !== '\n') {
          i++;
        }
        continue;
      }

      // String
      if (char === '"' || char === "'") {
        const quote = char;
        let str = '';
        const startCol = column;
        i++;
        column++;

        while (i < code.length && code[i] !== quote) {
          if (code[i] === '\\' && i + 1 < code.length) {
            str += code[i + 1];
            i += 2;
            column += 2;
          } else {
            str += code[i];
            i++;
            column++;
          }
        }

        i++; // Skip closing quote
        column++;

        tokens.push({ type: 'string', value: str, line, column: startCol });
        continue;
      }

      // Number
      if (/[0-9]/.test(char) || (char === '-' && /[0-9]/.test(code[i + 1]))) {
        let num = '';
        const startCol = column;

        while (i < code.length && /[0-9.\-]/.test(code[i])) {
          num += code[i];
          i++;
          column++;
        }

        tokens.push({ type: 'number', value: num, line, column: startCol });
        continue;
      }

      // Identifier or keyword
      if (/[a-zA-Z_]/.test(char)) {
        let ident = '';
        const startCol = column;

        while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
          ident += code[i];
          i++;
          column++;
        }

        const isKeyword = keywords.includes(ident.toLowerCase());
        tokens.push({
          type: isKeyword ? 'keyword' : 'identifier',
          value: ident,
          line,
          column: startCol,
        });
        continue;
      }

      // Operators and punctuation
      const punctuation = ['{', '}', '(', ')', '[', ']', ':', ',', '.', ';', '=', '<', '>', '+', '-', '*', '/'];
      if (punctuation.includes(char)) {
        tokens.push({ type: 'punctuation', value: char, line, column });
        i++;
        column++;
        continue;
      }

      // Unknown character - skip
      i++;
      column++;
    }

    return tokens;
  }

  /**
   * Parse program (list of declarations)
   */
  private parseProgram(): ASTNode[] {
    const nodes: ASTNode[] = [];
    let blockCount = 0;

    while (this.position < this.tokens.length) {
      // Skip newlines
      while (this.currentToken()?.type === 'newline') {
        this.advance();
      }

      if (this.position >= this.tokens.length) break;

      // Security: limit blocks
      blockCount++;
      if (blockCount > CODE_SECURITY_CONFIG.maxBlocks) {
        this.errors.push({ line: 0, column: 0, message: 'Too many blocks in program' });
        break;
      }

      const node = this.parseDeclaration();
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Parse a single declaration
   */
  private parseDeclaration(): ASTNode | null {
    const token = this.currentToken();
    if (!token) return null;

    if (token.type === 'keyword') {
      switch (token.value.toLowerCase()) {
        case 'orb':
          return this.parseOrb();
        case 'function':
          return this.parseFunction();
        case 'connect':
          return this.parseConnection();
        case 'gate':
          return this.parseGate();
        case 'stream':
          return this.parseStream();
        case 'nexus':
          return this.parseNexus();
        case 'building':
          return this.parseBuilding();
        default:
          this.advance();
          return null;
      }
    }

    // Skip unrecognized tokens
    this.advance();
    return null;
  }

  /**
   * Parse orb declaration
   *
   * orb <name> {
   *   property: value
   *   ...
   * }
   */
  private parseOrb(): OrbNode | null {
    this.expect('keyword', 'orb');
    const name = this.expectIdentifier();
    if (!name) return null;

    const properties: Record<string, any> = {};
    let position: SpatialPosition | undefined;
    let hologram: HologramProperties | undefined;

    if (this.check('punctuation', '{')) {
      this.advance(); // {

      while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
        this.skipNewlines();
        if (this.check('punctuation', '}')) break;

        const prop = this.parseProperty();
        if (prop) {
          // Handle special properties
          if (prop.key === 'position' || prop.key === 'at') {
            position = this.parsePosition(prop.value);
          } else if (prop.key === 'color' || prop.key === 'glow' || prop.key === 'size') {
            hologram = hologram || { shape: 'orb', color: '#00ffff', size: 1, glow: true, interactive: true };
            if (prop.key === 'color') hologram.color = String(prop.value);
            if (prop.key === 'glow') hologram.glow = Boolean(prop.value);
            if (prop.key === 'size') hologram.size = Number(prop.value);
          } else {
            properties[prop.key] = prop.value;
          }
        }

        this.skipNewlines();
      }

      this.expect('punctuation', '}');
    }

    return {
      type: 'orb',
      name,
      position: position || { x: 0, y: 0, z: 0 },
      hologram: hologram || { shape: 'orb', color: '#00ffff', size: 1, glow: true, interactive: true },
      properties,
      methods: [],
    };
  }

  /**
   * Parse function declaration
   *
   * function <name>(<params>): <return> {
   *   body
   * }
   */
  private parseFunction(): MethodNode | null {
    this.expect('keyword', 'function');
    const name = this.expectIdentifier();
    if (!name) return null;

    const parameters: ParameterNode[] = [];
    let returnType: string | undefined;

    // Parse parameters
    if (this.check('punctuation', '(')) {
      this.advance(); // (

      while (!this.check('punctuation', ')') && this.position < this.tokens.length) {
        const paramName = this.expectIdentifier();
        if (!paramName) break;

        let paramType = 'any';
        if (this.check('punctuation', ':')) {
          this.advance(); // :
          paramType = this.expectIdentifier() || 'any';
        }

        parameters.push({
          type: 'parameter',
          name: paramName,
          dataType: paramType,
        });

        if (this.check('punctuation', ',')) {
          this.advance();
        }
      }

      this.expect('punctuation', ')');
    }

    // Parse return type
    if (this.check('punctuation', ':')) {
      this.advance();
      returnType = this.expectIdentifier() || undefined;
    }

    // Parse body
    const body: ASTNode[] = [];
    if (this.check('punctuation', '{')) {
      this.advance(); // {
      // Skip body parsing for now - just find closing brace
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'method',
      name,
      parameters,
      body,
      returnType,
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'cube', color: '#ff6b35', size: 1.5, glow: true, interactive: true },
    };
  }

  /**
   * Parse connection
   *
   * connect <from> to <to> [as <type>]
   */
  private parseConnection(): ConnectionNode | null {
    this.expect('keyword', 'connect');
    const from = this.expectIdentifier();
    if (!from) return null;

    this.expect('keyword', 'to');
    const to = this.expectIdentifier();
    if (!to) return null;

    let dataType = 'any';
    if (this.check('keyword', 'as')) {
      this.advance();
      const typeStr = this.currentToken();
      if (typeStr?.type === 'string' || typeStr?.type === 'identifier') {
        dataType = typeStr.value;
        this.advance();
      }
    }

    return {
      type: 'connection',
      from,
      to,
      dataType,
      bidirectional: false,
    };
  }

  /**
   * Parse gate (conditional)
   */
  private parseGate(): GateNode | null {
    this.expect('keyword', 'gate');
    this.expectIdentifier(); // Gate name (consumed but not currently stored)

    let condition = '';
    if (this.check('punctuation', '(')) {
      this.advance();
      // Parse condition expression
      while (!this.check('punctuation', ')') && this.position < this.tokens.length) {
        const token = this.currentToken();
        if (token) condition += token.value + ' ';
        this.advance();
      }
      this.expect('punctuation', ')');
    }

    // Parse body if present
    if (this.check('punctuation', '{')) {
      this.advance();
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'gate',
      condition: condition.trim(),
      truePath: [],
      falsePath: [],
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'pyramid', color: '#4ecdc4', size: 1, glow: true, interactive: true },
    };
  }

  /**
   * Parse stream
   */
  private parseStream(): StreamNode | null {
    this.expect('keyword', 'stream');
    const name = this.expectIdentifier();
    if (!name) return null;

    let source = 'unknown';
    if (this.check('keyword', 'from')) {
      this.advance();
      source = this.expectIdentifier() || 'unknown';
    }

    // Parse body if present
    if (this.check('punctuation', '{')) {
      this.advance();
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'stream',
      name,
      source,
      transformations: [],
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'cylinder', color: '#45b7d1', size: 2, glow: true, interactive: true },
    };
  }

  /**
   * Parse nexus (multi-agent hub)
   */
  private parseNexus(): ASTNode | null {
    this.expect('keyword', 'nexus');
    const name = this.expectIdentifier();
    if (!name) return null;

    const properties: Record<string, any> = {};

    if (this.check('punctuation', '{')) {
      this.advance();
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'nexus',
      name,
      properties,
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'sphere', color: '#9b59b6', size: 3, glow: true, interactive: true },
    } as any;
  }

  /**
   * Parse building (class-like)
   */
  private parseBuilding(): ASTNode | null {
    this.expect('keyword', 'building');
    const name = this.expectIdentifier();
    if (!name) return null;

    if (this.check('punctuation', '{')) {
      this.advance();
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'building',
      name,
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'cube', color: '#e74c3c', size: 4, glow: true, interactive: true },
    } as any;
  }

  /**
   * Parse a property (key: value)
   */
  private parseProperty(): { key: string; value: any } | null {
    const key = this.expectIdentifier();
    if (!key) return null;

    if (!this.check('punctuation', ':')) {
      return { key, value: true }; // Flag-style property
    }

    this.advance(); // :

    const valueToken = this.currentToken();
    if (!valueToken) return null;

    let value: any;
    if (valueToken.type === 'string') {
      value = valueToken.value;
      this.advance();
    } else if (valueToken.type === 'number') {
      value = parseFloat(valueToken.value);
      this.advance();
    } else if (valueToken.type === 'identifier') {
      if (valueToken.value === 'true') value = true;
      else if (valueToken.value === 'false') value = false;
      else value = valueToken.value;
      this.advance();
    } else if (this.check('punctuation', '[')) {
      value = this.parseArray();
    } else if (this.check('punctuation', '{')) {
      value = this.parseObject();
    } else {
      value = valueToken.value;
      this.advance();
    }

    return { key, value };
  }

  /**
   * Parse array [...]
   */
  private parseArray(): any[] {
    const arr: any[] = [];
    this.expect('punctuation', '[');

    while (!this.check('punctuation', ']') && this.position < this.tokens.length) {
      const token = this.currentToken();
      if (token?.type === 'string' || token?.type === 'number' || token?.type === 'identifier') {
        if (token.type === 'number') {
          arr.push(parseFloat(token.value));
        } else {
          arr.push(token.value);
        }
        this.advance();
      }

      if (this.check('punctuation', ',')) {
        this.advance();
      }
    }

    this.expect('punctuation', ']');
    return arr;
  }

  /**
   * Parse object {...}
   */
  private parseObject(): Record<string, any> {
    const obj: Record<string, any> = {};
    this.expect('punctuation', '{');

    while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
      this.skipNewlines();
      if (this.check('punctuation', '}')) break;

      const prop = this.parseProperty();
      if (prop) {
        obj[prop.key] = prop.value;
      }

      this.skipNewlines();
      if (this.check('punctuation', ',')) {
        this.advance();
      }
    }

    this.expect('punctuation', '}');
    return obj;
  }

  /**
   * Parse position from value
   */
  private parsePosition(value: any): SpatialPosition {
    if (typeof value === 'object' && value !== null) {
      return {
        x: value.x || 0,
        y: value.y || 0,
        z: value.z || 0,
      };
    }
    return { x: 0, y: 0, z: 0 };
  }

  // Helper methods

  private currentToken(): Token | undefined {
    return this.tokens[this.position];
  }

  private advance(): Token | undefined {
    return this.tokens[this.position++];
  }

  private check(type: string, value?: string): boolean {
    const token = this.currentToken();
    if (!token) return false;
    if (token.type !== type) return false;
    if (value !== undefined && token.value.toLowerCase() !== value.toLowerCase()) return false;
    return true;
  }

  private expect(type: string, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    const token = this.currentToken();
    this.errors.push({
      line: token?.line || 0,
      column: token?.column || 0,
      message: `Expected ${type}${value ? ` '${value}'` : ''}, got ${token?.type || 'EOF'} '${token?.value || ''}'`,
    });
    return false;
  }

  private expectIdentifier(): string | null {
    const token = this.currentToken();
    if (token?.type === 'identifier' || token?.type === 'keyword') {
      this.advance();
      return token.value;
    }
    this.errors.push({
      line: token?.line || 0,
      column: token?.column || 0,
      message: `Expected identifier, got ${token?.type || 'EOF'}`,
    });
    return null;
  }

  private skipNewlines(): void {
    while (this.currentToken()?.type === 'newline') {
      this.advance();
    }
  }
}
