/**
 * @hololand/holoscript - Main entry point
 * 
 * HoloScript compiler: VR-native spatial programming language
 * Lexer → Parser → R3F Compiler
 */

// Lexer
export { tokenize } from './parser/lexer';
export type { Token, TokenType } from './parser/lexer';

// Parser
export { Parser } from './parser/parser';
export type {
  ASTNode,
  ZoneNode,
  EntityNode,
  HandlerNode,
  ActionNode,
  PropertyNode,
} from './parser/parser';

// Compiler
export { R3FCompiler, compileHoloScript } from './compiler/r3f-compiler';
export type { CompilerOptions } from './compiler/r3f-compiler';

// CLI
export { HoloScriptBuilder, runBuild } from './cli/build';
export type { BuildOptions, BuildResult } from './cli/build';
