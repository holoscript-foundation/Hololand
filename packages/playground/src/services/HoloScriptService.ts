/**
 * HoloScript Service - Handles code compilation, validation, and execution
 */

import type {
  CodeCompilationResult,
  HoloScriptValidationResult,
  PlaygroundError,
} from '../types/playground';
import { HoloScriptCodeParser, HoloScriptValidator, type ValidationError } from '@hololand/core';

export class HoloScriptService {
  private static parser = new HoloScriptCodeParser();
  private static validator = new HoloScriptValidator();

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
    const ast = {
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
          [/\bworld\b/, 'keyword'],
          [/\bobject\b/, 'keyword'],
          [/\btrait\b/, 'keyword'],
          [/\bbehavior\b/, 'keyword'],
          [/\bimport\b/, 'keyword'],
          [/\bfrom\b/, 'keyword'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/\d+\.\d+/, 'number'],
          [/\d+/, 'number'],
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
  static getCompletionSuggestions(code: string, position: { line: number; column: number }) {
    const suggestions = [
      { label: 'world', kind: 'Keyword', insertText: 'world ${1:name} {$0}' },
      { label: 'object', kind: 'Keyword', insertText: 'object ${1:name} {$0}' },
      { label: 'trait', kind: 'Keyword', insertText: 'trait ${1:name} {$0}' },
      { label: 'behavior', kind: 'Keyword', insertText: 'behavior ${1:name} {$0}' },
      { label: 'import', kind: 'Keyword', insertText: 'import ${1:module} from "${2:path}"' },
      { label: 'position', kind: 'Property', insertText: 'position' },
      { label: 'rotation', kind: 'Property', insertText: 'rotation' },
      { label: 'scale', kind: 'Property', insertText: 'scale' },
      { label: 'transform', kind: 'Method', insertText: 'transform(${1:x}, ${2:y}, ${3:z})' },
      { label: 'animate', kind: 'Method', insertText: 'animate(${1:property}, ${2:value}, ${3:duration})' },
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
