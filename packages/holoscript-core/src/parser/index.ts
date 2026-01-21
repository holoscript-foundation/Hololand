/**
 * @holoscript/core - Parser Module
 *
 * Exports the lexer and parser for HoloScript and HoloScript Plus.
 */

export { Lexer, TokenType, type Token, tokenize } from './lexer.js';
export { Parser, parse } from './parser.js';

import { Parser } from './parser.js';
import type { ParseResult } from '../types.js';

/**
 * HoloScript Code Parser - Main entry point
 *
 * This class provides a simple interface for parsing HoloScript code.
 */
export class HoloScriptCodeParser {
  private parser: Parser;

  constructor(options: { isHsPlus?: boolean } = {}) {
    this.parser = new Parser(options.isHsPlus ?? true);
  }

  /**
   * Parse HoloScript source code
   */
  parse(source: string): ParseResult {
    return this.parser.parse(source);
  }

  /**
   * Check if source code is valid
   */
  validate(source: string): { valid: boolean; errors: string[] } {
    const result = this.parse(source);
    return {
      valid: result.success,
      errors: result.errors.map((e) => `Line ${e.line || '?'}: ${e.message}`),
    };
  }
}

/**
 * HoloScript 2D Parser (subset for 2D/UI elements)
 */
export class HoloScript2DParser extends HoloScriptCodeParser {
  constructor() {
    super({ isHsPlus: false });
  }
}

/**
 * Legacy HoloScript Parser (for .holo files)
 */
export class HoloScriptParser extends HoloScriptCodeParser {
  constructor() {
    super({ isHsPlus: false });
  }
}
