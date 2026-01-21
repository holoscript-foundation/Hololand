/**
 * @holoscript/core
 *
 * Core parser, validator, and runtime for the HoloScript language.
 *
 * Supports both:
 * - HoloScript (.holo) - Simple spatial DSL for 3D scenes
 * - HoloScript Plus (.hsplus) - Full programming language with systems, async, etc.
 */

// Types
export type {
  // Source locations
  SourceLocation,
  SourceRange,

  // Base
  BaseNode,

  // Literals
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
  NullLiteral,
  ArrayLiteral,
  ObjectLiteral,
  PropertyAssignment,
  Vec2Literal,
  Vec3Literal,
  ColorLiteral,
  Literal,

  // Expressions
  Identifier,
  MemberExpression,
  CallExpression,
  BinaryExpression,
  UnaryExpression,
  ConditionalExpression,
  AssignmentExpression,
  ArrowFunctionExpression,
  AwaitExpression,
  NewExpression,
  Expression,

  // Statements
  ExpressionStatement,
  VariableDeclaration,
  VariableDeclarator,
  TypeAnnotation,
  BlockStatement,
  IfStatement,
  ForStatement,
  ForOfStatement,
  WhileStatement,
  ReturnStatement,
  BreakStatement,
  ContinueStatement,
  MatchStatement,
  MatchCase,
  Statement,

  // Declarations
  Parameter,
  FunctionDeclaration,
  ImportDeclaration,
  ImportSpecifier,
  ExportDeclaration,
  ExportSpecifier,
  OrbDeclaration,
  OrbProperty,
  WorldDeclaration,
  MaterialDeclaration,
  SystemDeclaration,
  MacroDeclaration,
  MacroCall,
  Declaration,

  // Program
  Program,
  Comment,
  ASTNode,

  // Results
  ParseError,
  ParseResult,
  ValidationError,
  ValidationResult,

  // Runtime
  RuntimeContext,
  SystemInstance,
  OrbInstance,
  WorldInstance,
  ExecutionResult,
} from './types.js';

// Parser
export {
  Lexer,
  TokenType,
  type Token,
  tokenize,
  Parser,
  parse,
  HoloScriptCodeParser,
  HoloScript2DParser,
  HoloScriptParser,
} from './parser/index.js';

// Validator
export { HoloScriptValidator, validate } from './validator/index.js';

// Runtime
export {
  HoloScriptRuntime,
  execute,
  createHoloScriptEnvironment,
  isHoloScriptSupported,
} from './runtime/index.js';

// Version and constants
export const HOLOSCRIPT_VERSION = '1.0.0';

export const HOLOSCRIPT_SUPPORTED_PLATFORMS = ['browser', 'node', 'react-native', 'electron'];

export const HOLOSCRIPT_VOICE_COMMANDS = [
  'create orb',
  'move to',
  'rotate',
  'scale',
  'change color',
  'delete',
  'duplicate',
  'group',
  'ungroup',
];

export const HOLOSCRIPT_GESTURES = [
  { name: 'pinch', description: 'Scale object' },
  { name: 'rotate', description: 'Rotate object' },
  { name: 'swipe', description: 'Move object' },
  { name: 'tap', description: 'Select object' },
  { name: 'double-tap', description: 'Edit object' },
  { name: 'hold', description: 'Context menu' },
];

export const HOLOSCRIPT_DEMO_SCRIPTS = {
  helloWorld: `
// Hello World in HoloScript
world HelloWorld {
  light: ambient;
  background: #1a1a2e;

  orb Greeting {
    geometry: sphere;
    color: #e94560;
    position: [0, 1, 0];
    scale: 1;
  }
}
`.trim(),

  interactiveOrb: `
// Interactive Orb in HoloScript Plus
import { Vec3, Color } from "@holoscript/std";

world InteractiveDemo {
  light: ambient;
  background: #0f0f23;

  orb Crystal {
    geometry: box;
    color: #00d9ff;
    position: [0, 1.5, 0];
    rotation: [0.5, 0.5, 0];

    onClick: fn() {
      this.color = Color.random();
    };

    onHover: fn(hovering) {
      this.scale = hovering ? 1.2 : 1.0;
    };
  }
}

system Spinner {
  state: { angle: 0 };

  update: fn(dt) {
    state.angle += dt * 0.5;
    Crystal.rotation = Vec3(0, state.angle, 0);
  };
}
`.trim(),

  gameWorld: `
// Simple Game World in HoloScript Plus
import { Vec3, random, List } from "@holoscript/std";

const PLATFORM_COUNT = 10;
const PLATFORM_SPACING = 3;

world PlatformerWorld {
  light: directional;
  background: #1a1a2e;
  gravity: [0, -9.8, 0];

  orb Player {
    geometry: sphere;
    color: #e94560;
    position: [0, 5, 0];
    scale: 0.5;
    physics: { type: "dynamic", mass: 1 };
  }

  orb Ground {
    geometry: plane;
    color: #16213e;
    position: [0, 0, 0];
    scale: [20, 1, 20];
    physics: { type: "static" };
  }
}

system PlatformGenerator {
  state: { platforms: [] };

  init: fn() {
    for (let i = 0; i < PLATFORM_COUNT; i++) {
      let x = random(-8, 8);
      let y = i * PLATFORM_SPACING + 2;
      let z = random(-8, 8);

      let platform = orb Platform_{i} {
        geometry: box;
        color: #0f3460;
        position: [x, y, z];
        scale: [2, 0.2, 2];
        physics: { type: "static" };
      };

      state.platforms.push(platform);
    }
  };
}

system PlayerController {
  state: { jumpForce: 10 };

  update: fn(dt) {
    if (Input.getKeyDown("Space") && Player.isGrounded) {
      Player.applyForce(Vec3(0, state.jumpForce, 0));
    }

    let moveX = Input.getAxis("Horizontal") * 5;
    let moveZ = Input.getAxis("Vertical") * 5;
    Player.velocity = Vec3(moveX, Player.velocity.y, moveZ);
  };
}
`.trim(),
};

// Logger interface
export interface HoloScriptLogger {
  log(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// Default no-op logger
export const NoOpLogger: HoloScriptLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// Console logger
export const ConsoleLogger: HoloScriptLogger = {
  log: (msg, ...args) => console.log(`[HoloScript] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[HoloScript] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[HoloScript] ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`[HoloScript] ${msg}`, ...args),
};

// Current logger
let currentLogger: HoloScriptLogger = NoOpLogger;

export function setHoloScriptLogger(logger: HoloScriptLogger): void {
  currentLogger = logger;
}

export function resetLogger(): void {
  currentLogger = NoOpLogger;
}

export function enableConsoleLogging(): void {
  currentLogger = ConsoleLogger;
}

export function getLogger(): HoloScriptLogger {
  return currentLogger;
}
