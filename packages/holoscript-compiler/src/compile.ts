/**
 * High-level compilation functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { R3FCompiler, type CompilerOptions, type CompilationResult } from './R3FCompiler.js';

/**
 * Compile HoloScript source code to R3F
 */
export function compile(
  source: string,
  options?: Partial<CompilerOptions>
): CompilationResult {
  const compiler = new R3FCompiler(options);
  return compiler.compile(source);
}

/**
 * Compile a HoloScript file
 */
export function compileFile(
  filePath: string,
  options?: Partial<CompilerOptions>
): CompilationResult {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    return {
      success: false,
      errors: [{ message: `File not found: ${absolutePath}` }],
      warnings: [],
      metadata: {
        orbs: 0,
        worlds: 0,
        imports: [],
        exports: [],
        duration: 0,
      },
    };
  }

  const source = fs.readFileSync(absolutePath, 'utf-8');
  return compile(source, options);
}

/**
 * Compile and write output to file
 */
export function compileToFile(
  inputPath: string,
  outputPath?: string,
  options?: Partial<CompilerOptions>
): CompilationResult {
  const result = compileFile(inputPath, options);

  if (result.success && result.code) {
    const outPath =
      outputPath ||
      inputPath.replace(/\.(holo|hsplus)$/, '.tsx');

    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outPath, result.code);
    console.log(`✅ Compiled: ${inputPath} → ${outPath}`);
  } else {
    console.error(`❌ Failed to compile: ${inputPath}`);
    for (const error of result.errors) {
      const loc = error.line ? `:${error.line}:${error.column || 0}` : '';
      console.error(`  ${inputPath}${loc}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Watch a file for changes and recompile
 */
export function watchFile(
  inputPath: string,
  outputPath?: string,
  options?: Partial<CompilerOptions>,
  callback?: (result: CompilationResult) => void
): fs.FSWatcher {
  console.log(`👀 Watching: ${inputPath}`);

  // Initial compile
  const result = compileToFile(inputPath, outputPath, options);
  callback?.(result);

  // Watch for changes
  return fs.watch(inputPath, (eventType) => {
    if (eventType === 'change') {
      console.log(`🔄 Recompiling: ${inputPath}`);
      const result = compileToFile(inputPath, outputPath, options);
      callback?.(result);
    }
  });
}

/**
 * Compile all HoloScript files in a directory
 */
export function compileDirectory(
  inputDir: string,
  outputDir?: string,
  options?: Partial<CompilerOptions>
): Map<string, CompilationResult> {
  const results = new Map<string, CompilationResult>();
  const absoluteInputDir = path.resolve(inputDir);
  const absoluteOutputDir = outputDir ? path.resolve(outputDir) : absoluteInputDir;

  function processDir(dir: string, relativeBase: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        processDir(fullPath, path.join(relativeBase, entry.name));
      } else if (entry.name.endsWith('.holo') || entry.name.endsWith('.hsplus')) {
        const relativePath = path.join(relativeBase, entry.name);
        const outputPath = path.join(
          absoluteOutputDir,
          relativePath.replace(/\.(holo|hsplus)$/, '.tsx')
        );

        const result = compileToFile(fullPath, outputPath, options);
        results.set(relativePath, result);
      }
    }
  }

  processDir(absoluteInputDir);

  // Summary
  const successful = [...results.values()].filter((r) => r.success).length;
  const failed = results.size - successful;

  console.log(`\n📊 Compilation complete: ${successful} succeeded, ${failed} failed`);

  return results;
}
