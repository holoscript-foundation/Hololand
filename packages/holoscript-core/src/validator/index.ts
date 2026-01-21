/**
 * @holoscript/core - Validator Module
 *
 * Validates HoloScript AST for semantic errors.
 */

import type {
  Program,
  ASTNode,
  Declaration,
  Statement,
  Expression,
  ValidationError,
  ValidationResult,
  OrbDeclaration,
  WorldDeclaration,
  FunctionDeclaration,
  VariableDeclaration,
  SystemDeclaration,
} from '../types.js';
import { parse } from '../parser/parser.js';

/**
 * Validation context
 */
interface ValidationContext {
  scope: Map<string, string>; // name -> type
  functions: Map<string, FunctionDeclaration>;
  orbs: Map<string, OrbDeclaration>;
  worlds: Map<string, WorldDeclaration>;
  systems: Map<string, SystemDeclaration>;
  inFunction: boolean;
  inLoop: boolean;
  inSystem: boolean;
}

/**
 * HoloScript Validator
 */
export class HoloScriptValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private context: ValidationContext = this.createContext();

  private createContext(): ValidationContext {
    return {
      scope: new Map(),
      functions: new Map(),
      orbs: new Map(),
      worlds: new Map(),
      systems: new Map(),
      inFunction: false,
      inLoop: false,
      inSystem: false,
    };
  }

  /**
   * Validate source code
   */
  validateSource(source: string): ValidationResult {
    const parseResult = parse(source);

    if (!parseResult.success) {
      return {
        valid: false,
        errors: parseResult.errors.map((e) => ({
          message: e.message,
          line: e.line,
          column: e.column,
          severity: 'error' as const,
        })),
        warnings: [],
      };
    }

    return this.validate(parseResult.program!);
  }

  /**
   * Validate a parsed program
   */
  validate(program: Program): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.context = this.createContext();

    // First pass: collect declarations
    for (const node of program.body) {
      this.collectDeclaration(node);
    }

    // Second pass: validate
    for (const node of program.body) {
      this.validateNode(node);
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private collectDeclaration(node: Declaration | Statement): void {
    switch (node.type) {
      case 'FunctionDeclaration':
        this.context.functions.set(node.name, node);
        this.context.scope.set(node.name, 'function');
        break;

      case 'OrbDeclaration':
        this.context.orbs.set(node.name, node);
        this.context.scope.set(node.name, 'orb');
        break;

      case 'WorldDeclaration':
        this.context.worlds.set(node.name, node);
        this.context.scope.set(node.name, 'world');
        break;

      case 'SystemDeclaration':
        this.context.systems.set(node.name, node);
        this.context.scope.set(node.name, 'system');
        break;

      case 'VariableDeclaration':
        for (const decl of node.declarations) {
          this.context.scope.set(decl.id.name, decl.typeAnnotation?.typeIdentifier || 'unknown');
        }
        break;
    }
  }

  private validateNode(node: ASTNode): void {
    if (!node) return;

    switch (node.type) {
      case 'Program':
        for (const child of (node as Program).body) {
          this.validateNode(child);
        }
        break;

      case 'FunctionDeclaration':
        this.validateFunction(node as FunctionDeclaration);
        break;

      case 'OrbDeclaration':
        this.validateOrb(node as OrbDeclaration);
        break;

      case 'WorldDeclaration':
        this.validateWorld(node as WorldDeclaration);
        break;

      case 'SystemDeclaration':
        this.validateSystem(node as SystemDeclaration);
        break;

      case 'VariableDeclaration':
        this.validateVariableDeclaration(node as VariableDeclaration);
        break;

      case 'IfStatement':
        this.validateExpression((node as any).test);
        this.validateNode((node as any).consequent);
        if ((node as any).alternate) {
          this.validateNode((node as any).alternate);
        }
        break;

      case 'ForStatement':
      case 'ForOfStatement':
      case 'WhileStatement':
        const prevInLoop = this.context.inLoop;
        this.context.inLoop = true;
        if ((node as any).test) this.validateExpression((node as any).test);
        this.validateNode((node as any).body);
        this.context.inLoop = prevInLoop;
        break;

      case 'ReturnStatement':
        if (!this.context.inFunction) {
          this.addError("'return' statement outside of function", node);
        }
        if ((node as any).argument) {
          this.validateExpression((node as any).argument);
        }
        break;

      case 'BreakStatement':
      case 'ContinueStatement':
        if (!this.context.inLoop) {
          this.addError(`'${node.type === 'BreakStatement' ? 'break' : 'continue'}' statement outside of loop`, node);
        }
        break;

      case 'BlockStatement':
        for (const stmt of (node as any).body) {
          this.validateNode(stmt);
        }
        break;

      case 'ExpressionStatement':
        this.validateExpression((node as any).expression);
        break;
    }
  }

  private validateFunction(node: FunctionDeclaration): void {
    // Check for duplicate parameter names
    const paramNames = new Set<string>();
    for (const param of node.params) {
      if (paramNames.has(param.name)) {
        this.addError(`Duplicate parameter '${param.name}'`, node);
      }
      paramNames.add(param.name);
    }

    // Validate body
    const prevInFunction = this.context.inFunction;
    this.context.inFunction = true;

    // Add parameters to scope
    for (const param of node.params) {
      this.context.scope.set(param.name, param.typeAnnotation?.typeIdentifier || 'unknown');
    }

    this.validateNode(node.body);
    this.context.inFunction = prevInFunction;
  }

  private validateOrb(node: OrbDeclaration): void {
    const validProperties = new Set([
      'geometry',
      'color',
      'position',
      'rotation',
      'scale',
      'material',
      'texture',
      'visible',
      'castShadow',
      'receiveShadow',
      'physics',
      'collider',
      'onClick',
      'onHover',
      'children',
    ]);

    for (const prop of node.properties) {
      if (!validProperties.has(prop.name)) {
        this.addWarning(`Unknown orb property '${prop.name}'`, prop);
      }
      this.validateExpression(prop.value);
    }

    // Check geometry is specified
    if (!node.properties.some((p) => p.name === 'geometry')) {
      this.addWarning("Orb is missing 'geometry' property", node);
    }
  }

  private validateWorld(node: WorldDeclaration): void {
    const validProperties = new Set([
      'light',
      'ambient',
      'fog',
      'skybox',
      'ground',
      'gravity',
      'background',
    ]);

    for (const prop of node.properties) {
      if (!validProperties.has(prop.name)) {
        this.addWarning(`Unknown world property '${prop.name}'`, prop);
      }
      this.validateExpression(prop.value);
    }

    // Validate children
    for (const child of node.children) {
      this.validateNode(child);
    }
  }

  private validateSystem(node: SystemDeclaration): void {
    const prevInSystem = this.context.inSystem;
    this.context.inSystem = true;

    // Validate state if present
    if (node.state) {
      for (const prop of node.state.properties) {
        this.validateExpression(prop.value);
      }
    }

    // Validate lifecycle methods
    if (node.init) {
      this.validateFunction(node.init as FunctionDeclaration);
    }
    if (node.update) {
      this.validateFunction(node.update as FunctionDeclaration);
    }
    if (node.cleanup) {
      this.validateFunction(node.cleanup as FunctionDeclaration);
    }

    // Validate other methods
    if (node.methods) {
      for (const method of node.methods) {
        this.validateFunction(method);
      }
    }

    this.context.inSystem = prevInSystem;
  }

  private validateVariableDeclaration(node: VariableDeclaration): void {
    for (const decl of node.declarations) {
      // Check for const without initializer
      if (node.kind === 'const' && !decl.init) {
        this.addError(`'const' declarations must be initialized`, node);
      }

      // Validate initializer
      if (decl.init) {
        this.validateExpression(decl.init);
      }

      // Check for redeclaration in same scope
      if (this.context.scope.has(decl.id.name)) {
        this.addWarning(`Variable '${decl.id.name}' shadows existing declaration`, decl as unknown as ASTNode);
      }
    }
  }

  private validateExpression(expr: Expression): void {
    if (!expr) return;

    switch (expr.type) {
      case 'Identifier':
        // Check if identifier is defined
        if (!this.context.scope.has(expr.name) && !this.isBuiltIn(expr.name)) {
          this.addError(`Undefined identifier '${expr.name}'`, expr);
        }
        break;

      case 'CallExpression':
        this.validateExpression((expr as any).callee);
        for (const arg of (expr as any).arguments) {
          this.validateExpression(arg);
        }
        break;

      case 'MemberExpression':
        this.validateExpression((expr as any).object);
        if ((expr as any).computed) {
          this.validateExpression((expr as any).property);
        }
        break;

      case 'BinaryExpression':
      case 'AssignmentExpression':
        this.validateExpression((expr as any).left);
        this.validateExpression((expr as any).right);
        break;

      case 'UnaryExpression':
        this.validateExpression((expr as any).argument);
        break;

      case 'ConditionalExpression':
        this.validateExpression((expr as any).test);
        this.validateExpression((expr as any).consequent);
        this.validateExpression((expr as any).alternate);
        break;

      case 'ArrayLiteral':
        for (const elem of (expr as any).elements) {
          this.validateExpression(elem);
        }
        break;

      case 'ObjectLiteral':
        for (const prop of (expr as any).properties) {
          this.validateExpression(prop.value);
        }
        break;

      case 'ArrowFunctionExpression':
        const prevInFunction = this.context.inFunction;
        this.context.inFunction = true;
        if ((expr as any).body.type === 'BlockStatement') {
          this.validateNode((expr as any).body);
        } else {
          this.validateExpression((expr as any).body);
        }
        this.context.inFunction = prevInFunction;
        break;

      case 'AwaitExpression':
        if (!this.context.inFunction) {
          this.addError("'await' expression outside of async function", expr);
        }
        this.validateExpression((expr as any).argument);
        break;
    }
  }

  private isBuiltIn(name: string): boolean {
    const builtIns = new Set([
      // Globals
      'console',
      'print',
      'Math',
      'JSON',
      'Date',
      'Array',
      'Object',
      'String',
      'Number',
      'Boolean',
      'Promise',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
      'fetch',

      // HoloScript built-ins
      'Vec2',
      'Vec3',
      'Vec4',
      'Quat',
      'Color',
      'Transform',

      // Geometry types
      'sphere',
      'box',
      'cylinder',
      'plane',
      'torus',

      // Light types
      'ambient',
      'directional',
      'point',
      'spot',
    ]);

    return builtIns.has(name);
  }

  private addError(message: string, node: ASTNode): void {
    this.errors.push({
      message,
      line: node.line,
      column: node.column,
      severity: 'error',
    });
  }

  private addWarning(message: string, node: ASTNode): void {
    this.warnings.push({
      message,
      line: node.line,
      column: node.column,
      severity: 'warning',
    });
  }
}

/**
 * Validate HoloScript source
 */
export function validate(source: string): ValidationResult {
  return new HoloScriptValidator().validateSource(source);
}
