/**
 * HoloScript Service - Handles code compilation, validation, and execution
 */

import type {
  CodeCompilationResult,
  HoloScriptValidationResult,
  PlaygroundError,
} from '../types/playground';
import { HoloScriptCodeParser, HoloScriptValidator } from '@hololand/core';

export class HoloScriptService {
  private static parser = new HoloScriptCodeParser();
  /** Validator instance for advanced validation - used in validate() */
  private static validatorInstance = new HoloScriptValidator();

  /**
   * Get the validator instance for external use
   */
  static getValidator(): HoloScriptValidator {
    return this.validatorInstance;
  }

  /**
   * Validates HoloScript syntax
   */
  static validate(code: string): HoloScriptValidationResult {
    const errors: PlaygroundError[] = [];
    const warnings: PlaygroundError[] = [];

    // Basic validation
    const lines = code.split('\n');

    // Check for unclosed braces
    let braceCount = 0;
    lines.forEach((line, index) => {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      // Check for syntax issues
      if (line.includes('world') && !line.includes('{')) {
        if (!/^(\/\/|\/\*)/.test(line.trim())) {
          warnings.push({
            id: `warn-${index}`,
            type: 'warning',
            message: 'World declaration may be incomplete',
            line: index + 1,
          });
        }
      }

      // Check for invalid syntax
      if (line.includes('{{') || line.includes('}}')) {
        errors.push({
          id: `error-${index}`,
          type: 'syntax',
          message: 'Double braces detected',
          line: index + 1,
          column: line.indexOf('{{') !== -1 ? line.indexOf('{{') : line.indexOf('}}'),
        });
      }
    });

    if (braceCount !== 0) {
      errors.push({
        id: 'brace-mismatch',
        type: 'syntax',
        message: `Unmatched braces: ${Math.abs(braceCount)} ${braceCount > 0 ? 'opening' : 'closing'} brace(s)`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Compiles HoloScript code
   */
  static compile(code: string): CodeCompilationResult {
    const startTime = performance.now();

    // Validate first
    const validation = this.validate(code);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        duration: performance.now() - startTime,
      };
    }

    try {
      // Mock compilation - in real scenario, use @hololand/core
      const compiled = this.mockCompile(code);

      return {
        success: true,
        errors: [],
        compiled,
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            id: 'compile-error',
            type: 'syntax',
            message: error instanceof Error ? error.message : 'Unknown compilation error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        ],
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Mock compilation - simulates compilation process
   * In production, use @hololand/core parser
   */
  private static mockCompile(code: string) {
    const ast: {
      type: string;
      body: Array<{ type: string; name: string }>;
      source: string;
      metadata: { compiledAt: Date; version: string };
    } = {
      type: 'Program',
      body: [],
      source: code,
      metadata: {
        compiledAt: new Date(),
        version: '1.0.0',
      },
    };

    // Simple AST generation
    const worldMatch = code.match(/world\s+(\w+)/);
    if (worldMatch) {
      ast.body.push({
        type: 'WorldDeclaration',
        name: worldMatch[1],
      });
    }

    return ast;
  }

  /**
   * Extract imports from code
   */
  static extractImports(code: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+[\w\s,{}]+\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Get syntax highlighting rules for Monaco
   */
  static getMonacoTokensProvider() {
    return {
      tokenizer: {
        root: [
          // Keywords - Core
          [/\b(world|composition|scene)\b/, 'keyword'],
          [/\b(object|orb|template|spatial_group)\b/, 'keyword'],
          [/\b(trait|behavior|state|logic)\b/, 'keyword'],
          [/\b(import|from|export|using)\b/, 'keyword'],
          [/\b(function|action|on|every|emit)\b/, 'keyword.control'],
          [/\b(if|else|for|while|return|break|continue)\b/, 'keyword.control'],
          [/\b(async|await|spawn|parallel)\b/, 'keyword.async'],
          
          // Traits - VR Interaction (@ prefix)
          [/@(grabbable|throwable|climbable|wearable|holdable)\b/, 'annotation'],
          [/@(interactive|stackable|rotatable|scalable)\b/, 'annotation'],
          [/@(persistent|networked|networkInterpolated)\b/, 'annotation'],
          [/@(physics|collision|trigger|sensor)\b/, 'annotation'],
          
          // Traits - Physics & Constraints
          [/@physics\.(joint|spring|distance|ballSocket)\b/, 'annotation'],
          [/@terrain\.(heightmap|island|erosion)\b/, 'annotation'],
          [/@marketplace\.(browser|publisher)\b/, 'annotation'],
          [/@versionControl\.(timeline|comparator)\b/, 'annotation'],
          
          // Properties - Transform
          [/\b(position|rotation|scale|transform)\b/, 'variable.property'],
          [/\b(velocity|acceleration|force|torque)\b/, 'variable.property'],
          
          // Properties - Visual
          [/\b(color|material|texture|opacity|emissive)\b/, 'variable.property'],
          [/\b(mesh|geometry|model|animation)\b/, 'variable.property'],
          
          // Properties - Physics
          [/\b(mass|friction|restitution|drag)\b/, 'variable.property'],
          [/\b(collider|rigidbody|kinematic|static)\b/, 'variable.property'],
          
          // Properties - Interaction
          [/\b(health|damage|armor|speed)\b/, 'variable.property'],
          [/\b(inventory|equipment|stats)\b/, 'variable.property'],
          
          // Built-in types/shapes
          [/\b(cube|sphere|plane|cylinder|capsule|cone|torus)\b/, 'type'],
          [/\b(box|mesh|group|light|camera|audio)\b/, 'type'],
          
          // Events
          [/\b(on_grab|on_release|on_collision|on_trigger)\b/, 'function'],
          [/\b(on_enter|on_exit|on_interact|on_use)\b/, 'function'],
          [/\b(on_damage|on_death|on_spawn|on_destroy)\b/, 'function'],
          [/\b(on_player_enter|on_player_exit|on_player_attack)\b/, 'function'],
          
          // Boolean & special values
          [/\b(true|false|null|undefined|this)\b/, 'constant'],
          [/\b(PI|TAU|EPSILON|Infinity)\b/, 'constant.numeric'],
          
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          
          // Numbers
          [/-?\d+\.\d+/, 'number.float'],
          [/-?\d+/, 'number'],
          [/0x[0-9a-fA-F]+/, 'number.hex'],
          
          // Operators
          [/[+\-*/%=<>!&|^~?:]/, 'operator'],
          [/=>/, 'operator.arrow'],
          
          // Brackets & Punctuation
          [/[{}()\[\]]/, 'delimiter.bracket'],
          [/[;,.]/, 'delimiter'],
          
          // Identifiers
          [/[a-zA-Z_]\w*/, 'identifier'],
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop'],
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop'],
        ],
        comment: [
          [/[^*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/./, 'comment'],
        ],
      },
    };
  }

  /**
   * Get auto-completion suggestions
   */
  static getCompletionSuggestions(_code: string, _position: { line: number; column: number }) {
    const suggestions = [
      // Core structures
      { label: 'world', kind: 'Keyword', insertText: 'world ${1:name} {\n  $0\n}' },
      { label: 'composition', kind: 'Keyword', insertText: 'composition "${1:Scene Name}" {\n  $0\n}' },
      { label: 'object', kind: 'Keyword', insertText: 'object "${1:name}" {\n  position: [${2:0}, ${3:0}, ${4:0}]\n  $0\n}' },
      { label: 'template', kind: 'Keyword', insertText: 'template "${1:Type}" {\n  state { $2 }\n  action ${3:name}() { $0 }\n}' },
      { label: 'spatial_group', kind: 'Keyword', insertText: 'spatial_group "${1:name}" {\n  $0\n}' },
      { label: 'trait', kind: 'Keyword', insertText: 'trait ${1:name} {\n  $0\n}' },
      { label: 'behavior', kind: 'Keyword', insertText: 'behavior ${1:name} {\n  $0\n}' },
      { label: 'state', kind: 'Keyword', insertText: 'state {\n  ${1:property}: ${2:value}\n}' },
      { label: 'logic', kind: 'Keyword', insertText: 'logic {\n  $0\n}' },
      
      // Properties - Transform
      { label: 'position', kind: 'Property', insertText: 'position: [${1:0}, ${2:0}, ${3:0}]' },
      { label: 'rotation', kind: 'Property', insertText: 'rotation: [${1:0}, ${2:0}, ${3:0}]' },
      { label: 'scale', kind: 'Property', insertText: 'scale: [${1:1}, ${2:1}, ${3:1}]' },
      
      // Properties - Visual
      { label: 'color', kind: 'Property', insertText: 'color: "${1:#ff0000}"' },
      { label: 'material', kind: 'Property', insertText: 'material: "${1:standard}"' },
      { label: 'opacity', kind: 'Property', insertText: 'opacity: ${1:1.0}' },
      { label: 'emissive', kind: 'Property', insertText: 'emissive: ${1:0.5}' },
      
      // Properties - Physics
      { label: 'mass', kind: 'Property', insertText: 'mass: ${1:1.0}' },
      { label: 'friction', kind: 'Property', insertText: 'friction: ${1:0.5}' },
      { label: 'restitution', kind: 'Property', insertText: 'restitution: ${1:0.5}' },
      
      // Properties - Gameplay
      { label: 'health', kind: 'Property', insertText: 'health: ${1:100}' },
      { label: 'damage', kind: 'Property', insertText: 'damage: ${1:10}' },
      { label: 'speed', kind: 'Property', insertText: 'speed: ${1:5}' },
      
      // VR Traits
      { label: '@grabbable', kind: 'Interface', insertText: '@grabbable' },
      { label: '@throwable', kind: 'Interface', insertText: '@throwable' },
      { label: '@climbable', kind: 'Interface', insertText: '@climbable' },
      { label: '@interactive', kind: 'Interface', insertText: '@interactive' },
      { label: '@stackable', kind: 'Interface', insertText: '@stackable {\n  maxStack: ${1:10}\n  snapDistance: ${2:0.1}\n}' },
      { label: '@rotatable', kind: 'Interface', insertText: '@rotatable(\n  axis: "${1:y}",\n  snapAngle: ${2:45}\n)' },
      { label: '@persistent', kind: 'Interface', insertText: '@persistent {\n  saveKey: "${1:save}"\n}' },
      { label: '@networked', kind: 'Interface', insertText: '@networked {\n  syncRate: ${1:20}\n}' },
      
      // Events
      { label: 'on_grab', kind: 'Function', insertText: 'on_grab: () => {\n  $0\n}' },
      { label: 'on_release', kind: 'Function', insertText: 'on_release: () => {\n  $0\n}' },
      { label: 'on_collision', kind: 'Function', insertText: 'on_collision: (other) => {\n  $0\n}' },
      { label: 'on_interact', kind: 'Function', insertText: 'on_interact: () => {\n  $0\n}' },
      { label: 'on_damage', kind: 'Function', insertText: 'on_damage: (amount) => {\n  this.health -= amount\n  $0\n}' },
      { label: 'every', kind: 'Function', insertText: 'every(${1:1000}) {\n  $0\n}' },
      { label: 'emit', kind: 'Function', insertText: 'emit("${1:event}", { $0 })' },
      
      // Actions
      { label: 'action', kind: 'Method', insertText: 'action ${1:name}(${2:params}) {\n  $0\n}' },
      { label: 'transform', kind: 'Method', insertText: 'transform(${1:x}, ${2:y}, ${3:z})' },
      { label: 'animate', kind: 'Method', insertText: 'animate("${1:property}", ${2:value}, ${3:duration})' },
      { label: 'spawn', kind: 'Method', insertText: 'spawn("${1:template}", {\n  position: [${2:0}, ${3:0}, ${4:0}]\n})' },
      { label: 'destroy', kind: 'Method', insertText: 'destroy()' },
      
      // Built-in shapes
      { label: 'cube', kind: 'Value', insertText: 'type: "cube"\nsize: [${1:1}, ${2:1}, ${3:1}]' },
      { label: 'sphere', kind: 'Value', insertText: 'type: "sphere"\nradius: ${1:0.5}' },
      { label: 'plane', kind: 'Value', insertText: 'type: "plane"\nsize: [${1:10}, ${2:10}]' },
      { label: 'cylinder', kind: 'Value', insertText: 'type: "cylinder"\nradius: ${1:0.5}\nheight: ${2:2}' },
      
      // Import
      { label: 'import', kind: 'Keyword', insertText: 'import { ${1:module} } from "${2:@holoscript/core}"' },
      { label: 'using', kind: 'Keyword', insertText: 'using "${1:TemplateName}"' },
    ];

    return suggestions;
  }

  /**
   * Find object ID at specific line number
   */
  static getObjectAtLine(code: string, line: number): string | null {
    const parseResult = this.parser.parse(code);
    if (!parseResult.success) return null;

    // Traverse AST to find node at line
    for (const node of parseResult.ast) {
        if (node.type === 'orb' && node.line) {
            // Check if line is within this object's block
            // We assume object block ends at next object or end of file? 
            // Or roughly: if node.line <= line, check if it's the closest.
            // Better: Check if line is >= node.line. 
            // Since AST is sequential, the last node with node.line <= line is the candidate.
            // But we need to handle block end.
            // For now, simple heuristic: strict match or "closest previous declaration".
        }
    }

    // Since we don't track EndLine in AST yet (requires more parser work), 
    // we'll find the *closest* object definition *before* the cursor.
    let bestMatch: string | null = null;
    let maxLine = -1;

    for (const node of parseResult.ast) {
        if (node.type === 'orb' && node.line !== undefined) {
             const orbNode = node as any; // Cast to access 'name' if TS complains
             if (node.line <= line && node.line > maxLine) {
                 maxLine = node.line;
                 bestMatch = orbNode.name;
             }
        }
    }

    return bestMatch;
  }

  /**
   * Get line number of object definition
   */
  static getLineOfObject(code: string, id: string): number | null {
    const parseResult = this.parser.parse(code);
    if (!parseResult.success) return null;

    for (const node of parseResult.ast) {
        if (node.type === 'orb' && (node as any).name === id) {
            return node.line || null;
        }
    }
    return null;
  }

  /**
   * Patch HoloScript code with new values (Smart Update)
   */
  static patchHoloScript(code: string, objectId: string, updates: { position?: { x: number, y: number, z: number } }): string {
    // 1. Find the object block
    // Regex for: object name { ... } or orb name { ... }
    const objectRegex = new RegExp(`(orb|object)\\s+${objectId}\\s*{`, 'g');
    const match = objectRegex.exec(code);
    
    if (!match) return code;

    const startIndex = match.index;
    const blockStart = startIndex + match[0].length;
    
    // Find the closing brace for this block to limit scope
    let braceCount = 1;
    let blockEnd = -1;
    for (let i = blockStart; i < code.length; i++) {
        if (code[i] === '{') braceCount++;
        if (code[i] === '}') braceCount--;
        if (braceCount === 0) {
            blockEnd = i;
            break;
        }
    }

    if (blockEnd === -1) return code; // Malformed block

    const blockContent = code.substring(blockStart, blockEnd);
    let newBlockContent = blockContent;

    // 2. Patch Position
    if (updates.position) {
        const { x, y, z } = updates.position;
        const posStr = `[${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]`;
        
        if (blockContent.match(/position:\s*\[/)) {
            // Replace existing
            newBlockContent = newBlockContent.replace(/position:\s*\[[^\]]+\]/, `position: ${posStr}`);
        } else {
            // Append if missing (simple append at start of block)
            newBlockContent = `\n    position: ${posStr}` + newBlockContent;
        }
    }

    // 3. Reconstruct
    return code.substring(0, blockStart) + newBlockContent + code.substring(blockEnd);
  }
}
