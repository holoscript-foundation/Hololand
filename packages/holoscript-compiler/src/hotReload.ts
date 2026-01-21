/**
 * Hot Reload System for HoloScript
 *
 * Enables live preview of HoloScript changes without full page reload.
 * Works with Vite, Webpack, and standalone development servers.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { R3FCompiler, type CompilationResult } from './R3FCompiler.js';

export interface HotReloadOptions {
  /** Watch directory */
  watchDir: string;
  /** Output directory for compiled files */
  outputDir: string;
  /** File extensions to watch */
  extensions: string[];
  /** Debounce delay in ms */
  debounce: number;
  /** Enable verbose logging */
  verbose: boolean;
  /** Callback when a file changes */
  onChange?: (file: string, result: CompilationResult) => void;
  /** Callback when compilation starts */
  onCompileStart?: (file: string) => void;
  /** Callback when compilation completes */
  onCompileEnd?: (file: string, result: CompilationResult) => void;
}

const DEFAULT_OPTIONS: HotReloadOptions = {
  watchDir: './src',
  outputDir: './src/generated',
  extensions: ['.holo', '.hsplus'],
  debounce: 100,
  verbose: false,
};

export class HotReloadServer extends EventEmitter {
  private options: HotReloadOptions;
  private compiler: R3FCompiler;
  private watchers: fs.FSWatcher[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private compiledFiles: Map<string, CompilationResult> = new Map();
  private isRunning = false;

  constructor(options: Partial<HotReloadOptions> = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.compiler = new R3FCompiler({ optimize: false }); // Disable optimization for faster compilation
  }

  /**
   * Start watching for file changes
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[HotReload] Already running');
      return;
    }

    this.isRunning = true;
    const watchDir = path.resolve(this.options.watchDir);

    if (!fs.existsSync(watchDir)) {
      console.error(`[HotReload] Watch directory does not exist: ${watchDir}`);
      return;
    }

    // Ensure output directory exists
    const outputDir = path.resolve(this.options.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`[HotReload] Watching: ${watchDir}`);
    console.log(`[HotReload] Output: ${outputDir}`);

    // Initial compilation of all files
    this.compileAll();

    // Watch for changes
    this.watchDirectory(watchDir);

    this.emit('started', { watchDir, outputDir });
  }

  /**
   * Stop watching for file changes
   */
  stop(): void {
    if (!this.isRunning) return;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.isRunning = false;
    console.log('[HotReload] Stopped');
    this.emit('stopped');
  }

  /**
   * Compile all HoloScript files in the watch directory
   */
  compileAll(): void {
    const watchDir = path.resolve(this.options.watchDir);
    const files = this.findHoloScriptFiles(watchDir);

    console.log(`[HotReload] Found ${files.length} HoloScript files`);

    for (const file of files) {
      this.compileFile(file);
    }
  }

  /**
   * Compile a single file
   */
  compileFile(filePath: string): CompilationResult {
    const absolutePath = path.resolve(filePath);
    const relativePath = path.relative(this.options.watchDir, absolutePath);
    const outputPath = path.join(
      this.options.outputDir,
      relativePath.replace(/\.(holo|hsplus)$/, '.tsx')
    );

    if (this.options.verbose) {
      console.log(`[HotReload] Compiling: ${relativePath}`);
    }

    this.options.onCompileStart?.(absolutePath);
    this.emit('compileStart', { file: absolutePath });

    try {
      const source = fs.readFileSync(absolutePath, 'utf-8');
      const result = this.compiler.compile(source);

      if (result.success && result.code) {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, result.code);

        if (this.options.verbose) {
          console.log(`[HotReload] ✅ ${relativePath} → ${path.relative(process.cwd(), outputPath)}`);
        }
      } else {
        console.error(`[HotReload] ❌ ${relativePath}`);
        for (const error of result.errors) {
          const loc = error.line ? `:${error.line}:${error.column || 0}` : '';
          console.error(`  ${loc} ${error.message}`);
        }
      }

      this.compiledFiles.set(absolutePath, result);
      this.options.onCompileEnd?.(absolutePath, result);
      this.options.onChange?.(absolutePath, result);
      this.emit('compileEnd', { file: absolutePath, result });
      this.emit('change', { file: absolutePath, result });

      return result;
    } catch (error) {
      const result: CompilationResult = {
        success: false,
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
        warnings: [],
        metadata: { orbs: 0, worlds: 0, imports: [], exports: [], duration: 0 },
      };

      this.compiledFiles.set(absolutePath, result);
      this.options.onCompileEnd?.(absolutePath, result);
      this.emit('compileEnd', { file: absolutePath, result });

      return result;
    }
  }

  /**
   * Watch a directory recursively
   */
  private watchDirectory(dir: string): void {
    const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const ext = path.extname(filename);
      if (!this.options.extensions.includes(ext)) return;

      const filePath = path.join(dir, filename);

      // Debounce
      if (this.debounceTimers.has(filePath)) {
        clearTimeout(this.debounceTimers.get(filePath)!);
      }

      this.debounceTimers.set(
        filePath,
        setTimeout(() => {
          this.debounceTimers.delete(filePath);

          if (fs.existsSync(filePath)) {
            console.log(`[HotReload] 🔄 ${filename}`);
            this.compileFile(filePath);
          } else {
            // File was deleted
            console.log(`[HotReload] 🗑️ ${filename}`);
            this.compiledFiles.delete(filePath);
            this.emit('delete', { file: filePath });
          }
        }, this.options.debounce)
      );
    });

    this.watchers.push(watcher);
  }

  /**
   * Find all HoloScript files in a directory
   */
  private findHoloScriptFiles(dir: string): string[] {
    const files: string[] = [];

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (this.options.extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Get compilation result for a file
   */
  getResult(filePath: string): CompilationResult | undefined {
    return this.compiledFiles.get(path.resolve(filePath));
  }

  /**
   * Get all compiled files
   */
  getAllResults(): Map<string, CompilationResult> {
    return new Map(this.compiledFiles);
  }

  /**
   * Check if server is running
   */
  get running(): boolean {
    return this.isRunning;
  }
}

/**
 * Create a Vite plugin for HoloScript hot reload
 */
export function viteHoloScriptPlugin(options: Partial<HotReloadOptions> = {}) {
  const compiler = new R3FCompiler({ optimize: false });

  return {
    name: 'vite-plugin-holoscript',
    enforce: 'pre' as const,

    transform(code: string, id: string) {
      if (!id.endsWith('.holo') && !id.endsWith('.hsplus')) {
        return null;
      }

      const result = compiler.compile(code);

      if (!result.success) {
        const errors = result.errors.map((e) => {
          const loc = e.line ? `:${e.line}:${e.column || 0}` : '';
          return `${loc} ${e.message}`;
        });
        throw new Error(`HoloScript compilation error:\n${errors.join('\n')}`);
      }

      return {
        code: result.code || '',
        map: null,
      };
    },

    handleHotUpdate({ file, server }: { file: string; server: any }) {
      if (file.endsWith('.holo') || file.endsWith('.hsplus')) {
        console.log(`[HoloScript] Hot update: ${path.basename(file)}`);

        // Trigger full page reload for now
        // In the future, we could implement more granular HMR
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

/**
 * Create a webpack plugin for HoloScript hot reload
 */
export class WebpackHoloScriptPlugin {
  private options: Partial<HotReloadOptions>;
  private compiler: R3FCompiler;

  constructor(options: Partial<HotReloadOptions> = {}) {
    this.options = options;
    this.compiler = new R3FCompiler({ optimize: false });
  }

  apply(webpackCompiler: any) {
    webpackCompiler.hooks.compilation.tap('WebpackHoloScriptPlugin', (compilation: any) => {
      // Add loader for .holo and .hsplus files
      compilation.hooks.buildModule.tap('WebpackHoloScriptPlugin', (module: any) => {
        if (module.resource && (module.resource.endsWith('.holo') || module.resource.endsWith('.hsplus'))) {
          console.log(`[HoloScript] Compiling: ${path.basename(module.resource)}`);
        }
      });
    });
  }
}

/**
 * Standalone hot reload function
 */
export function startHotReload(options: Partial<HotReloadOptions> = {}): HotReloadServer {
  const server = new HotReloadServer(options);
  server.start();
  return server;
}
