/**
 * @holoscript/core - Runtime Module
 *
 * Executes HoloScript AST in a sandboxed environment.
 */

import type {
  Program,
  ASTNode,
  Declaration,
  Statement,
  Expression,
  RuntimeContext,
  ExecutionResult,
  SystemInstance,
  OrbInstance,
  WorldInstance,
  FunctionDeclaration,
  VariableDeclaration,
  OrbDeclaration,
  WorldDeclaration,
  SystemDeclaration,
  BlockStatement,
} from '../types.js';
import { parse } from '../parser/parser.js';

/**
 * Scope for variable lookup
 */
class Scope {
  private variables: Map<string, unknown> = new Map();
  private parent: Scope | null;

  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  get(name: string): unknown {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    return undefined;
  }

  set(name: string, value: unknown): void {
    this.variables.set(name, value);
  }

  has(name: string): boolean {
    if (this.variables.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  update(name: string, value: unknown): boolean {
    if (this.variables.has(name)) {
      this.variables.set(name, value);
      return true;
    }
    if (this.parent) {
      return this.parent.update(name, value);
    }
    return false;
  }
}

/**
 * Control flow signals
 */
class ReturnSignal {
  constructor(public value: unknown) {}
}

class BreakSignal {}

class ContinueSignal {}

/**
 * HoloScript Runtime
 */
export class HoloScriptRuntime {
  private scope: Scope = new Scope();
  private context: RuntimeContext = {
    variables: new Map(),
    functions: new Map(),
    systems: new Map(),
    orbs: new Map(),
    worlds: new Map(),
  };

  constructor() {
    this.registerBuiltIns();
  }

  /**
   * Execute source code
   */
  execute(source: string): ExecutionResult {
    const parseResult = parse(source);

    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.errors.map((e) => `Line ${e.line || '?'}: ${e.message}`).join('\n'),
      };
    }

    return this.run(parseResult.program!);
  }

  /**
   * Execute a parsed program
   */
  run(program: Program): ExecutionResult {
    try {
      let result: unknown;

      for (const node of program.body) {
        result = this.evaluateNode(node);
      }

      return {
        success: true,
        value: result,
        context: this.context,
      };
    } catch (error) {
      if (error instanceof ReturnSignal) {
        return {
          success: true,
          value: error.value,
          context: this.context,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Evaluate a single node
   */
  private evaluateNode(node: ASTNode): unknown {
    if (!node) return undefined;

    switch (node.type) {
      case 'Program':
        return this.evaluateProgram(node as Program);

      case 'VariableDeclaration':
        return this.evaluateVariableDeclaration(node as VariableDeclaration);

      case 'FunctionDeclaration':
        return this.evaluateFunctionDeclaration(node as FunctionDeclaration);

      case 'OrbDeclaration':
        return this.evaluateOrbDeclaration(node as OrbDeclaration);

      case 'WorldDeclaration':
        return this.evaluateWorldDeclaration(node as WorldDeclaration);

      case 'SystemDeclaration':
        return this.evaluateSystemDeclaration(node as SystemDeclaration);

      case 'BlockStatement':
        return this.evaluateBlockStatement(node as BlockStatement);

      case 'IfStatement':
        return this.evaluateIfStatement(node as any);

      case 'ForStatement':
        return this.evaluateForStatement(node as any);

      case 'ForOfStatement':
        return this.evaluateForOfStatement(node as any);

      case 'WhileStatement':
        return this.evaluateWhileStatement(node as any);

      case 'ReturnStatement':
        throw new ReturnSignal(this.evaluateExpression((node as any).argument));

      case 'BreakStatement':
        throw new BreakSignal();

      case 'ContinueStatement':
        throw new ContinueSignal();

      case 'ExpressionStatement':
        return this.evaluateExpression((node as any).expression);

      default:
        if (this.isExpression(node)) {
          return this.evaluateExpression(node as Expression);
        }
        return undefined;
    }
  }

  private evaluateProgram(program: Program): unknown {
    let result: unknown;
    for (const node of program.body) {
      result = this.evaluateNode(node);
    }
    return result;
  }

  private evaluateVariableDeclaration(node: VariableDeclaration): void {
    for (const decl of node.declarations) {
      const value = decl.init ? this.evaluateExpression(decl.init) : undefined;
      this.scope.set(decl.id.name, value);
      this.context.variables.set(decl.id.name, value);
    }
  }

  private evaluateFunctionDeclaration(node: FunctionDeclaration): void {
    const fn = (...args: unknown[]) => {
      const childScope = new Scope(this.scope);
      const prevScope = this.scope;
      this.scope = childScope;

      // Bind parameters
      for (let i = 0; i < node.params.length; i++) {
        const param = node.params[i];
        const value = i < args.length ? args[i] : (param.defaultValue ? this.evaluateExpression(param.defaultValue) : undefined);
        this.scope.set(param.name, value);
      }

      try {
        this.evaluateNode(node.body);
        return undefined;
      } catch (signal) {
        if (signal instanceof ReturnSignal) {
          return signal.value;
        }
        throw signal;
      } finally {
        this.scope = prevScope;
      }
    };

    this.scope.set(node.name, fn);
    this.context.functions.set(node.name, fn as (...args: unknown[]) => unknown);
  }

  private evaluateOrbDeclaration(node: OrbDeclaration): OrbInstance {
    const properties: Record<string, unknown> = {};

    for (const prop of node.properties) {
      properties[prop.name] = this.evaluateExpression(prop.value);
    }

    const orb: OrbInstance = {
      name: node.name,
      properties,
      position: properties.position as [number, number, number],
      rotation: properties.rotation as [number, number, number],
      scale: properties.scale as [number, number, number],
    };

    this.context.orbs.set(node.name, orb);
    return orb;
  }

  private evaluateWorldDeclaration(node: WorldDeclaration): WorldInstance {
    const properties: Record<string, unknown> = {};
    const orbs: OrbInstance[] = [];

    for (const prop of node.properties) {
      properties[prop.name] = this.evaluateExpression(prop.value);
    }

    for (const child of node.children) {
      if (child.type === 'OrbDeclaration') {
        orbs.push(this.evaluateOrbDeclaration(child));
      } else {
        this.evaluateNode(child);
      }
    }

    const world: WorldInstance = {
      name: node.name,
      properties,
      orbs,
    };

    this.context.worlds.set(node.name, world);
    return world;
  }

  private evaluateSystemDeclaration(node: SystemDeclaration): SystemInstance {
    const state: Record<string, unknown> = {};

    if (node.state) {
      for (const prop of node.state.properties) {
        state[prop.key.type === 'Identifier' ? prop.key.name : (prop.key as any).value] = this.evaluateExpression(prop.value);
      }
    }

    const system: SystemInstance = {
      name: node.name,
      state,
    };

    // Create update function if defined
    if (node.update) {
      const updateFn = node.update as FunctionDeclaration;
      system.update = (dt: number) => {
        const childScope = new Scope(this.scope);
        const prevScope = this.scope;
        this.scope = childScope;

        // Bind dt parameter
        if (updateFn.params.length > 0) {
          this.scope.set(updateFn.params[0].name, dt);
        }

        // Bind state
        this.scope.set('state', system.state);

        try {
          this.evaluateNode(updateFn.body);
        } finally {
          this.scope = prevScope;
        }
      };
    }

    this.context.systems.set(node.name, system);
    return system;
  }

  private evaluateBlockStatement(node: BlockStatement): unknown {
    const childScope = new Scope(this.scope);
    const prevScope = this.scope;
    this.scope = childScope;

    try {
      let result: unknown;
      for (const stmt of node.body) {
        result = this.evaluateNode(stmt);
      }
      return result;
    } finally {
      this.scope = prevScope;
    }
  }

  private evaluateIfStatement(node: any): unknown {
    const test = this.evaluateExpression(node.test);

    if (test) {
      return this.evaluateNode(node.consequent);
    } else if (node.alternate) {
      return this.evaluateNode(node.alternate);
    }

    return undefined;
  }

  private evaluateForStatement(node: any): void {
    const childScope = new Scope(this.scope);
    const prevScope = this.scope;
    this.scope = childScope;

    try {
      if (node.init) {
        this.evaluateNode(node.init);
      }

      while (node.test ? this.evaluateExpression(node.test) : true) {
        try {
          this.evaluateNode(node.body);
        } catch (signal) {
          if (signal instanceof BreakSignal) break;
          if (signal instanceof ContinueSignal) continue;
          throw signal;
        }

        if (node.update) {
          this.evaluateExpression(node.update);
        }
      }
    } finally {
      this.scope = prevScope;
    }
  }

  private evaluateForOfStatement(node: any): void {
    const iterable = this.evaluateExpression(node.right);

    if (!iterable || typeof (iterable as any)[Symbol.iterator] !== 'function') {
      throw new Error('Value is not iterable');
    }

    const childScope = new Scope(this.scope);
    const prevScope = this.scope;
    this.scope = childScope;

    try {
      for (const item of iterable as Iterable<unknown>) {
        if (node.left.type === 'VariableDeclaration') {
          this.scope.set(node.left.declarations[0].id.name, item);
        } else {
          this.scope.set(node.left.name, item);
        }

        try {
          this.evaluateNode(node.body);
        } catch (signal) {
          if (signal instanceof BreakSignal) break;
          if (signal instanceof ContinueSignal) continue;
          throw signal;
        }
      }
    } finally {
      this.scope = prevScope;
    }
  }

  private evaluateWhileStatement(node: any): void {
    while (this.evaluateExpression(node.test)) {
      try {
        this.evaluateNode(node.body);
      } catch (signal) {
        if (signal instanceof BreakSignal) break;
        if (signal instanceof ContinueSignal) continue;
        throw signal;
      }
    }
  }

  private evaluateExpression(expr: Expression | null): unknown {
    if (!expr) return undefined;

    switch (expr.type) {
      case 'NumberLiteral':
        return (expr as any).value;

      case 'StringLiteral':
        return (expr as any).value;

      case 'BooleanLiteral':
        return (expr as any).value;

      case 'NullLiteral':
        return null;

      case 'ColorLiteral':
        return (expr as any).value;

      case 'ArrayLiteral':
        return (expr as any).elements.map((e: Expression) => this.evaluateExpression(e));

      case 'ObjectLiteral':
        const obj: Record<string, unknown> = {};
        for (const prop of (expr as any).properties) {
          const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
          obj[key] = this.evaluateExpression(prop.value);
        }
        return obj;

      case 'Identifier':
        const name = (expr as any).name;
        if (this.scope.has(name)) {
          return this.scope.get(name);
        }
        throw new Error(`Undefined variable: ${name}`);

      case 'MemberExpression':
        const object = this.evaluateExpression((expr as any).object);
        if (object === null || object === undefined) {
          throw new Error('Cannot read property of null/undefined');
        }
        const property = (expr as any).computed
          ? this.evaluateExpression((expr as any).property)
          : (expr as any).property.name;
        return (object as any)[property];

      case 'CallExpression':
        const callee = this.evaluateExpression((expr as any).callee);
        if (typeof callee !== 'function') {
          throw new Error('Not a function');
        }
        const args = (expr as any).arguments.map((a: Expression) => this.evaluateExpression(a));
        return (callee as Function)(...args);

      case 'BinaryExpression':
        return this.evaluateBinaryExpression(expr as any);

      case 'UnaryExpression':
        return this.evaluateUnaryExpression(expr as any);

      case 'ConditionalExpression':
        const test = this.evaluateExpression((expr as any).test);
        return test
          ? this.evaluateExpression((expr as any).consequent)
          : this.evaluateExpression((expr as any).alternate);

      case 'AssignmentExpression':
        return this.evaluateAssignmentExpression(expr as any);

      case 'ArrowFunctionExpression':
        return this.evaluateArrowFunction(expr as any);

      case 'AwaitExpression':
        // In synchronous runtime, just evaluate the argument
        return this.evaluateExpression((expr as any).argument);

      default:
        return undefined;
    }
  }

  private evaluateBinaryExpression(expr: any): unknown {
    const left = this.evaluateExpression(expr.left);
    const right = this.evaluateExpression(expr.right);

    switch (expr.operator) {
      case '+': return (left as number) + (right as number);
      case '-': return (left as number) - (right as number);
      case '*': return (left as number) * (right as number);
      case '/': return (left as number) / (right as number);
      case '%': return (left as number) % (right as number);
      case '**': return Math.pow(left as number, right as number);
      case '==': return left == right;
      case '!=': return left != right;
      case '===': return left === right;
      case '!==': return left !== right;
      case '<': return (left as number) < (right as number);
      case '>': return (left as number) > (right as number);
      case '<=': return (left as number) <= (right as number);
      case '>=': return (left as number) >= (right as number);
      case '&&': return left && right;
      case '||': return left || right;
      case '??': return left ?? right;
      case '&': return (left as number) & (right as number);
      case '|': return (left as number) | (right as number);
      case '^': return (left as number) ^ (right as number);
      case '<<': return (left as number) << (right as number);
      case '>>': return (left as number) >> (right as number);
      default: throw new Error(`Unknown operator: ${expr.operator}`);
    }
  }

  private evaluateUnaryExpression(expr: any): unknown {
    const arg = this.evaluateExpression(expr.argument);

    switch (expr.operator) {
      case '!': return !arg;
      case '-': return -(arg as number);
      case '+': return +(arg as number);
      case '~': return ~(arg as number);
      default: throw new Error(`Unknown operator: ${expr.operator}`);
    }
  }

  private evaluateAssignmentExpression(expr: any): unknown {
    const right = this.evaluateExpression(expr.right);
    let value = right;

    if (expr.operator !== '=') {
      const left = this.evaluateExpression(expr.left);
      switch (expr.operator) {
        case '+=': value = (left as number) + (right as number); break;
        case '-=': value = (left as number) - (right as number); break;
        case '*=': value = (left as number) * (right as number); break;
        case '/=': value = (left as number) / (right as number); break;
        case '%=': value = (left as number) % (right as number); break;
        case '&&=': value = left && right; break;
        case '||=': value = left || right; break;
        case '??=': value = left ?? right; break;
        default: throw new Error(`Unknown assignment operator: ${expr.operator}`);
      }
    }

    if (expr.left.type === 'Identifier') {
      if (!this.scope.update(expr.left.name, value)) {
        this.scope.set(expr.left.name, value);
      }
    } else if (expr.left.type === 'MemberExpression') {
      const obj = this.evaluateExpression(expr.left.object);
      const prop = expr.left.computed
        ? this.evaluateExpression(expr.left.property)
        : expr.left.property.name;
      (obj as any)[prop] = value;
    }

    return value;
  }

  private evaluateArrowFunction(expr: any): Function {
    return (...args: unknown[]) => {
      const childScope = new Scope(this.scope);
      const prevScope = this.scope;
      this.scope = childScope;

      // Bind parameters
      for (let i = 0; i < expr.params.length; i++) {
        const param = expr.params[i];
        const value = i < args.length ? args[i] : (param.defaultValue ? this.evaluateExpression(param.defaultValue) : undefined);
        this.scope.set(param.name, value);
      }

      try {
        if (expr.body.type === 'BlockStatement') {
          this.evaluateNode(expr.body);
          return undefined;
        } else {
          return this.evaluateExpression(expr.body);
        }
      } catch (signal) {
        if (signal instanceof ReturnSignal) {
          return signal.value;
        }
        throw signal;
      } finally {
        this.scope = prevScope;
      }
    };
  }

  private isExpression(node: ASTNode): boolean {
    const expressionTypes = [
      'NumberLiteral', 'StringLiteral', 'BooleanLiteral', 'NullLiteral',
      'ArrayLiteral', 'ObjectLiteral', 'ColorLiteral', 'Vec2Literal', 'Vec3Literal',
      'Identifier', 'MemberExpression', 'CallExpression', 'BinaryExpression',
      'UnaryExpression', 'ConditionalExpression', 'AssignmentExpression',
      'ArrowFunctionExpression', 'AwaitExpression',
    ];
    return expressionTypes.includes(node.type);
  }

  private registerBuiltIns(): void {
    // Console
    this.scope.set('console', console);
    this.scope.set('print', (...args: unknown[]) => console.log(...args));

    // Math
    this.scope.set('Math', Math);

    // Constructors
    this.scope.set('Vec2', (x = 0, y = 0) => ({ x, y }));
    this.scope.set('Vec3', (x = 0, y = 0, z = 0) => ({ x, y, z }));
    this.scope.set('Vec4', (x = 0, y = 0, z = 0, w = 0) => ({ x, y, z, w }));
    this.scope.set('Color', (r: string | number, g?: number, b?: number) => {
      if (typeof r === 'string') return r;
      return `rgb(${r}, ${g}, ${b})`;
    });

    // Geometry types
    this.scope.set('sphere', 'sphere');
    this.scope.set('box', 'box');
    this.scope.set('cylinder', 'cylinder');
    this.scope.set('plane', 'plane');
    this.scope.set('torus', 'torus');

    // Light types
    this.scope.set('ambient', 'ambient');
    this.scope.set('directional', 'directional');
    this.scope.set('point', 'point');
    this.scope.set('spot', 'spot');
  }

  /**
   * Get the current context
   */
  getContext(): RuntimeContext {
    return this.context;
  }

  /**
   * Update all systems
   */
  updateSystems(deltaTime: number): void {
    for (const system of this.context.systems.values()) {
      if (system.update) {
        system.update(deltaTime);
      }
    }
  }
}

/**
 * Execute HoloScript source
 */
export function execute(source: string): ExecutionResult {
  return new HoloScriptRuntime().execute(source);
}

/**
 * Create a new runtime environment
 */
export function createHoloScriptEnvironment(): HoloScriptRuntime {
  return new HoloScriptRuntime();
}

/**
 * Check if HoloScript is supported in current environment
 */
export function isHoloScriptSupported(): boolean {
  return true; // Runtime works in any JS environment
}
