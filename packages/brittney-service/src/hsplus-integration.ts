/**
 * Brittney HoloScript Plus Integration
 *
 * Enables Brittney to generate, analyze, and understand HoloScript Plus code.
 * This module provides the bridge between Brittney AI and the .hsplus ecosystem.
 */

import type { HoloScriptCodeParser, ParseResult, ValidationResult, HoloScriptValidator } from '@holoscript/core';

/**
 * HoloScript Plus knowledge base for Brittney
 */
export const HSPLUS_KNOWLEDGE = {
  fileExtensions: {
    holo: 'Simple spatial DSL for 3D scenes (artists/designers)',
    hsplus: 'Full programming language with systems, async, file I/O, AI integration',
  },

  coreLibraries: {
    '@holoscript/std': 'Standard library (Vec3, List, Map, math, time utilities)',
    '@holoscript/fs': 'File system operations (read/write files, watch, glob)',
    '@holoscript/ai': 'AI/LLM integration (chat, embeddings, agents, Brittney)',
  },

  syntax: {
    variables: `
// Variables
let mutableVar = 5;
const CONSTANT = "immutable";
`,

    functions: `
// Functions
fn greet(name: string) -> string {
  return "Hello, " + name;
}

// Async functions
async fn fetchData() -> Data {
  let response = await fetch("/api/data");
  return response.json();
}
`,

    controlFlow: `
// If/else
if (condition) {
  // ...
} else if (other) {
  // ...
} else {
  // ...
}

// For loops
for (let i = 0; i < 10; i++) {
  // ...
}

// For-of loops
for (item of items) {
  // ...
}

// While loops
while (condition) {
  // ...
}

// Match expression
match (value) {
  1 => "one",
  2 => "two",
  _ => "other"
}
`,

    orbs: `
// Orb (3D object) declaration
orb Crystal {
  geometry: box;
  color: #4a90d9;
  position: [0, 1, 0];
  rotation: [0.5, 0, 0];
  scale: 1.5;
  material: GlowMaterial;

  onClick: fn() {
    this.color = Color.random();
  };
}
`,

    worlds: `
// World declaration
world MyWorld {
  background: #1a1a2e;
  light: ambient;
  gravity: [0, -9.8, 0];

  orb Ground {
    geometry: plane;
    color: #333333;
    position: [0, 0, 0];
    scale: [20, 1, 20];
  }

  orb Player {
    geometry: sphere;
    color: #ff0000;
    position: [0, 1, 0];
  }
}
`,

    systems: `
// System declaration (stateful components)
system GameLoop {
  state: {
    score: 0,
    time: 0,
    paused: false
  };

  init: fn() {
    print("Game started!");
  };

  update: fn(dt) {
    if (!state.paused) {
      state.time += dt;
    }
  };

  cleanup: fn() {
    print("Game ended. Score:", state.score);
  };

  fn addScore(points) {
    state.score += points;
  }
}
`,

    materials: `
// Material declaration
material GlowMaterial {
  color: #4a90d9;
  emissive: #4a90d9;
  emissiveIntensity: 1.0;
  metalness: 0.5;
  roughness: 0.3;
}
`,

    imports: `
// Import syntax
import { Vec3, List, random } from "@holoscript/std";
import { readJson, writeJson } from "@holoscript/fs";
import { brittney, Agent } from "@holoscript/ai";

// Import with alias
import { HoloMap as Map } from "@holoscript/std";
`,
  },

  bestPractices: [
    'Use descriptive names for orbs and systems',
    'Organize code into systems for complex behavior',
    'Use materials for reusable visual styles',
    'Keep world declarations focused on scene structure',
    'Use @holoscript/std types (Vec3, Color) for spatial data',
    'Handle async operations properly with await',
    'Add comments for complex logic',
    'Use const for values that should not change',
    'Break large systems into smaller, focused systems',
    'Test systems independently before combining',
  ],

  commonPatterns: {
    gameLoop: `
system GameLoop {
  state: { running: true };

  update: fn(dt) {
    if (state.running) {
      Physics.step(dt);
      AI.update(dt);
      Render.draw();
    }
  };
}
`,

    eventHandling: `
system EventHandler {
  init: fn() {
    Events.on("playerDamage", fn(data) {
      UI.showDamage(data.amount);
    });
  };
}
`,

    proceduralGeneration: `
system WorldGenerator {
  fn generate(seed) {
    let rng = SeededRandom(seed);

    for (let i = 0; i < 100; i++) {
      let x = rng.range(-50, 50);
      let z = rng.range(-50, 50);

      orb Tree_{i} {
        geometry: cylinder;
        position: [x, 0, z];
        scale: [0.3, rng.range(2, 5), 0.3];
      };
    }
  }
}
`,
  },
};

/**
 * Generate a system prompt for Brittney with HoloScript Plus context
 */
export function generateHsPlusSystemPrompt(): string {
  return `You are Brittney, an AI assistant specialized in HoloScript Plus (.hsplus) development.

## HoloScript Plus Overview
HoloScript Plus is a full programming language for 3D spatial development. It extends the simple .holo DSL with:
- Variables (let, const)
- Functions (fn, async fn)
- Control flow (if/else, for, while, match)
- Systems (stateful components with lifecycle methods)
- Module system (import/export)
- Standard library (@holoscript/std, @holoscript/fs, @holoscript/ai)

## Core Syntax Examples
${HSPLUS_KNOWLEDGE.syntax.variables}
${HSPLUS_KNOWLEDGE.syntax.functions}
${HSPLUS_KNOWLEDGE.syntax.orbs}
${HSPLUS_KNOWLEDGE.syntax.systems}

## Best Practices
${HSPLUS_KNOWLEDGE.bestPractices.map((p) => `- ${p}`).join('\n')}

When generating HoloScript Plus code:
1. Always include necessary imports
2. Use proper type annotations when helpful
3. Follow the established syntax patterns
4. Add comments for complex logic
5. Consider performance implications
`;
}

/**
 * Code generation result
 */
export interface CodeGenResult {
  code: string;
  type: 'holo' | 'hsplus';
  explanation?: string;
  warnings?: string[];
}

/**
 * Code analysis result
 */
export interface CodeAnalysis {
  summary: string;
  complexity: 'simple' | 'moderate' | 'complex';
  orbs: string[];
  worlds: string[];
  systems: string[];
  imports: string[];
  issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; line?: number }>;
  suggestions: string[];
}

/**
 * Brittney HoloScript Plus Assistant
 */
export class BrittneyHsPlusAssistant {
  private parser?: HoloScriptCodeParser;
  private validator?: HoloScriptValidator;

  constructor() {
    // Lazy-load parser to avoid circular dependencies
  }

  private async getParser(): Promise<HoloScriptCodeParser> {
    if (!this.parser) {
      const core = await import('@holoscript/core');
      this.parser = new core.HoloScriptCodeParser();
    }
    return this.parser;
  }

  private async getValidator(): Promise<HoloScriptValidator> {
    if (!this.validator) {
      const core = await import('@holoscript/core');
      this.validator = new core.HoloScriptValidator();
    }
    return this.validator;
  }

  /**
   * Parse HoloScript Plus code
   */
  async parse(code: string): Promise<ParseResult> {
    const parser = await this.getParser();
    return parser.parse(code);
  }

  /**
   * Validate HoloScript Plus code
   */
  async validate(code: string): Promise<ValidationResult> {
    const validator = await this.getValidator();
    return validator.validateSource(code);
  }

  /**
   * Analyze code and provide insights
   */
  async analyzeCode(code: string): Promise<CodeAnalysis> {
    const parseResult = await this.parse(code);
    const validationResult = await this.validate(code);

    const orbs: string[] = [];
    const worlds: string[] = [];
    const systems: string[] = [];
    const imports: string[] = [];

    // Extract declarations from AST
    if (parseResult.success && parseResult.ast) {
      for (const node of parseResult.ast) {
        switch (node.type) {
          case 'OrbDeclaration':
            orbs.push((node as any).name);
            break;
          case 'WorldDeclaration':
            worlds.push((node as any).name);
            break;
          case 'SystemDeclaration':
            systems.push((node as any).name);
            break;
          case 'ImportDeclaration':
            imports.push((node as any).source.value);
            break;
        }
      }
    }

    // Determine complexity
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    const totalDeclarations = orbs.length + worlds.length + systems.length;
    if (totalDeclarations > 10 || systems.length > 3) {
      complexity = 'complex';
    } else if (totalDeclarations > 3 || systems.length > 0) {
      complexity = 'moderate';
    }

    // Convert validation errors
    const issues = validationResult.errors.map((e) => ({
      severity: e.severity,
      message: e.message,
      line: e.line,
    }));

    // Generate suggestions
    const suggestions: string[] = [];
    if (orbs.length > 5 && worlds.length === 0) {
      suggestions.push('Consider organizing orbs into a world declaration');
    }
    if (systems.length === 0 && orbs.length > 3) {
      suggestions.push('Consider using systems for complex behaviors');
    }
    if (!imports.includes('@holoscript/std') && code.includes('Vec3')) {
      suggestions.push('Add import for @holoscript/std');
    }

    return {
      summary: `${orbs.length} orbs, ${worlds.length} worlds, ${systems.length} systems`,
      complexity,
      orbs,
      worlds,
      systems,
      imports,
      issues,
      suggestions,
    };
  }

  /**
   * Generate HoloScript Plus code from description
   */
  async generateCode(description: string, type: 'holo' | 'hsplus' = 'hsplus'): Promise<CodeGenResult> {
    // This would typically call the Brittney AI service
    // For now, we provide a simple template-based generation

    const warnings: string[] = [];

    // Simple keyword-based generation
    let code = '';

    if (description.toLowerCase().includes('empty') || description.toLowerCase().includes('basic')) {
      code = this.generateBasicWorld(description);
    } else if (description.toLowerCase().includes('game')) {
      code = this.generateGameWorld(description);
    } else if (description.toLowerCase().includes('gallery') || description.toLowerCase().includes('museum')) {
      code = this.generateGalleryWorld(description);
    } else {
      // Default to a simple world
      code = this.generateBasicWorld(description);
      warnings.push('Generated a basic world. Provide more details for specific features.');
    }

    return {
      code,
      type,
      explanation: `Generated ${type === 'holo' ? 'HoloScript' : 'HoloScript Plus'} code based on: "${description}"`,
      warnings,
    };
  }

  private generateBasicWorld(description: string): string {
    return `
import { Vec3, Color } from "@holoscript/std";

// ${description}
world BasicWorld {
  background: #1a1a2e;
  light: ambient;

  orb MainObject {
    geometry: sphere;
    color: #4a90d9;
    position: [0, 1, 0];
    scale: 1;
  }

  orb Ground {
    geometry: plane;
    color: #333333;
    position: [0, 0, 0];
    scale: [10, 1, 10];
  }
}
`.trim();
  }

  private generateGameWorld(description: string): string {
    return `
import { Vec3, Color, random, clamp } from "@holoscript/std";

// ${description}
world GameWorld {
  background: #0f0f23;
  light: ambient;
  gravity: [0, -9.8, 0];

  orb Player {
    geometry: capsule;
    color: #e94560;
    position: [0, 1, 0];
    scale: [0.5, 1, 0.5];
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

system PlayerController {
  state: {
    speed: 5,
    jumpForce: 8,
    isGrounded: true
  };

  update: fn(dt) {
    // Movement
    let moveX = Input.getAxis("Horizontal") * state.speed;
    let moveZ = Input.getAxis("Vertical") * state.speed;

    Player.velocity.x = moveX;
    Player.velocity.z = moveZ;

    // Jump
    if (Input.getKeyDown("Space") && state.isGrounded) {
      Player.velocity.y = state.jumpForce;
      state.isGrounded = false;
    }
  };
}

system GameManager {
  state: {
    score: 0,
    gameOver: false
  };

  fn addScore(points) {
    state.score += points;
    UI.updateScore(state.score);
  }
}
`.trim();
  }

  private generateGalleryWorld(description: string): string {
    return `
import { Vec3, Color } from "@holoscript/std";

// ${description}
world GalleryWorld {
  background: #ffffff;
  light: ambient;

  // Floor
  orb Floor {
    geometry: plane;
    color: #e0e0e0;
    position: [0, 0, 0];
    scale: [20, 1, 30];
    receiveShadow: true;
  }

  // Walls
  orb BackWall {
    geometry: plane;
    color: #f5f5f5;
    position: [0, 3, -15];
    scale: [20, 6, 1];
  }

  orb LeftWall {
    geometry: plane;
    color: #f5f5f5;
    position: [-10, 3, 0];
    rotation: [0, 1.5708, 0];
    scale: [30, 6, 1];
  }

  orb RightWall {
    geometry: plane;
    color: #f5f5f5;
    position: [10, 3, 0];
    rotation: [0, -1.5708, 0];
    scale: [30, 6, 1];
  }

  // Ceiling with lights
  orb Ceiling {
    geometry: plane;
    color: #ffffff;
    position: [0, 6, 0];
    rotation: [3.14159, 0, 0];
    scale: [20, 1, 30];
  }

  // Gallery spotlights
  orb Spotlight1 {
    type: spot;
    color: #ffffff;
    position: [-5, 5.5, -10];
    rotation: [0.5, 0, 0];
    intensity: 2;
    angle: 0.5;
    castShadow: true;
  }

  orb Spotlight2 {
    type: spot;
    color: #ffffff;
    position: [5, 5.5, -10];
    rotation: [0.5, 0, 0];
    intensity: 2;
    angle: 0.5;
    castShadow: true;
  }
}

// Exhibit items would be added here
// Example:
// orb Exhibit1 {
//   geometry: box;
//   color: #gold;
//   position: [-5, 1.5, -12];
//   scale: [1, 1, 1];
// }
`.trim();
  }

  /**
   * Get code completion suggestions
   */
  getCompletions(code: string, position: { line: number; column: number }): string[] {
    const suggestions: string[] = [];

    // Get the line content up to cursor
    const lines = code.split('\n');
    const currentLine = lines[position.line - 1] || '';
    const prefix = currentLine.slice(0, position.column).trim();

    // Context-based completions
    if (prefix.endsWith('import {')) {
      suggestions.push(
        'Vec3', 'Vec2', 'Color', 'List', 'HoloMap', 'random',
        'clamp', 'lerp', 'sleep', 'readText', 'writeText'
      );
    } else if (prefix.endsWith('geometry:')) {
      suggestions.push('sphere', 'box', 'cylinder', 'plane', 'torus', 'capsule', 'cone');
    } else if (prefix.endsWith('type:')) {
      suggestions.push('"static"', '"dynamic"', '"kinematic"');
    } else if (prefix.endsWith('light:')) {
      suggestions.push('ambient', 'directional', 'point', 'spot');
    } else if (prefix.startsWith('fn ') || prefix.startsWith('async fn')) {
      suggestions.push('()', '() -> void', '(dt: number)', '(event: Event)');
    } else if (prefix === '' || prefix.endsWith('\n')) {
      // Top-level suggestions
      suggestions.push(
        'orb', 'world', 'system', 'material', 'fn', 'async fn',
        'let', 'const', 'import', 'export'
      );
    }

    return suggestions;
  }
}

/**
 * Create a Brittney HoloScript Plus assistant instance
 */
export function createHsPlusAssistant(): BrittneyHsPlusAssistant {
  return new BrittneyHsPlusAssistant();
}

/**
 * Get the HoloScript Plus knowledge base
 */
export function getHsPlusKnowledge(): typeof HSPLUS_KNOWLEDGE {
  return HSPLUS_KNOWLEDGE;
}
