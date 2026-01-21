#!/usr/bin/env node
/**
 * HoloScript CLI Compiler
 *
 * Usage:
 *   holoscript build <input> [output]
 *   holoscript watch <input> [output]
 *   holoscript compile <dir> [outdir]
 */

import * as fs from 'fs';
import * as path from 'path';
import { compileFile, compileToFile, compileDirectory, watchFile } from './compile.js';
import type { CompilerOptions } from './R3FCompiler.js';

const VERSION = '1.0.0';

function printHelp() {
  console.log(`
HoloScript Compiler v${VERSION}

Usage:
  holoscript build <input.holo> [output.tsx]   Compile a single file
  holoscript watch <input.holo> [output.tsx]   Watch and recompile on changes
  holoscript dir <inputDir> [outputDir]        Compile all files in directory
  holoscript check <input.holo>                Validate without compiling

Options:
  --typescript, -ts      Output TypeScript (default: true)
  --javascript, -js      Output JavaScript
  --optimize, -O         Enable optimizations (default: true)
  --no-optimize          Disable optimizations
  --sourcemap, -s        Generate source maps
  --help, -h             Show this help message
  --version, -v          Show version

Examples:
  holoscript build src/world.hsplus
  holoscript build src/world.hsplus dist/World.tsx
  holoscript watch src/world.hsplus
  holoscript dir src/worlds dist/generated
  holoscript check src/world.hsplus
`);
}

function parseArgs(args: string[]): {
  command: string;
  input?: string;
  output?: string;
  options: Partial<CompilerOptions>;
} {
  const options: Partial<CompilerOptions> = {
    typescript: true,
    optimize: true,
    sourceMaps: false,
  };

  let command = '';
  let input: string | undefined;
  let output: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        command = 'help';
        break;
      case '--version':
      case '-v':
        command = 'version';
        break;
      case '--typescript':
      case '-ts':
        options.typescript = true;
        break;
      case '--javascript':
      case '-js':
        options.typescript = false;
        break;
      case '--optimize':
      case '-O':
        options.optimize = true;
        break;
      case '--no-optimize':
        options.optimize = false;
        break;
      case '--sourcemap':
      case '-s':
        options.sourceMaps = true;
        break;
      default:
        if (!command && ['build', 'watch', 'dir', 'check'].includes(arg)) {
          command = arg;
        } else if (!input) {
          input = arg;
        } else if (!output) {
          output = arg;
        }
    }
  }

  return { command, input, output, options };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const { command, input, output, options } = parseArgs(args);

  switch (command) {
    case 'help':
      printHelp();
      break;

    case 'version':
      console.log(`HoloScript Compiler v${VERSION}`);
      break;

    case 'build':
      if (!input) {
        console.error('Error: No input file specified');
        process.exit(1);
      }
      const buildResult = compileToFile(input, output, options);
      process.exit(buildResult.success ? 0 : 1);
      break;

    case 'watch':
      if (!input) {
        console.error('Error: No input file specified');
        process.exit(1);
      }
      watchFile(input, output, options);
      // Keep process alive
      process.stdin.resume();
      break;

    case 'dir':
      if (!input) {
        console.error('Error: No input directory specified');
        process.exit(1);
      }
      const dirResults = compileDirectory(input, output, options);
      const hasErrors = [...dirResults.values()].some((r) => !r.success);
      process.exit(hasErrors ? 1 : 0);
      break;

    case 'check':
      if (!input) {
        console.error('Error: No input file specified');
        process.exit(1);
      }
      const checkResult = compileFile(input, options);
      if (checkResult.success) {
        console.log(`✅ ${input} is valid`);
        if (checkResult.warnings.length > 0) {
          console.log(`\n⚠️  ${checkResult.warnings.length} warning(s):`);
          for (const warn of checkResult.warnings) {
            const loc = warn.line ? `:${warn.line}:${warn.column || 0}` : '';
            console.log(`  ${input}${loc}: ${warn.message}`);
          }
        }
        console.log(`\n📊 Stats: ${checkResult.metadata.orbs} orbs, ${checkResult.metadata.worlds} worlds`);
      } else {
        console.error(`❌ ${input} has errors:`);
        for (const error of checkResult.errors) {
          const loc = error.line ? `:${error.line}:${error.column || 0}` : '';
          console.error(`  ${input}${loc}: ${error.message}`);
        }
      }
      process.exit(checkResult.success ? 0 : 1);
      break;

    default:
      // If no command, treat first arg as file to build
      if (input) {
        const result = compileToFile(input, output, options);
        process.exit(result.success ? 0 : 1);
      } else {
        printHelp();
      }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
