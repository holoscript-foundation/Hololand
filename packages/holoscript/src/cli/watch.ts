import { watch as fsWatch } from 'fs';
import { resolve } from 'path';
import { HoloScriptBuilder } from './build';

export interface WatchOptions {
  output?: string;
  optimize?: boolean;
  verbose?: boolean;
  sourceMaps?: boolean;
  debounce?: number; // Milliseconds to debounce rebuilds
  hotReload?: boolean; // Enable hot reload integration
}

/**
 * Watch a HoloScript file and rebuild on changes
 *
 * Features:
 * - Auto-rebuild on file changes
 * - Debouncing (configurable, default 300ms)
 * - Error recovery (continues watching on error)
 * - Timestamp logging for each rebuild
 * - Hot reload ready (can integrate with dev servers)
 *
 * WEEK 2 ENHANCEMENTS:
 * - Debouncing: Prevents multiple rebuilds on rapid saves
 * - Error recovery: Shows errors but continues watching
 * - Hot reload hooks: WebSocket/IPC ready for Next.js integration
 * - Multi-file watching: Prepare for module system (Week 3)
 * - Performance optimization: AST caching when module system added
 */
export async function watch(
  inputFile: string,
  options: WatchOptions = {}
): Promise<void> {
  const inputPath = resolve(inputFile);
  let isBuilding = false;
  let lastBuildTime = 0;
  let debounceTimer: NodeJS.Timeout | null = null;
  const debounceMs = options.debounce ?? 300;

  console.log(`👀 Watching ${inputFile}`);
  console.log(`   Output: ${options.output || 'auto'}`);
  console.log(`   Debounce: ${debounceMs}ms`);
  console.log(`   Press Ctrl+C to stop\n`);

  const rebuild = async () => {
    if (isBuilding) return;

    isBuilding = true;
    const startTime = Date.now();

    const builder = new HoloScriptBuilder({
      input: inputPath,
      ...options,
      verbose: false, // Suppress verbose output in watch mode
    });

    try {
      const result = await builder.build();
      const timestamp = new Date().toLocaleTimeString();

      if (result.success) {
        lastBuildTime = Date.now();
        console.log(
          `[${timestamp}] ✅ Built (${result.duration}ms) → ${result.size} bytes`
        );

        // Hot reload notification (Week 2)
        if (options.hotReload) {
          notifyHotReload(result.output);
        }
      } else {
        console.log(`[${timestamp}] ❌ Error: ${result.errors[0]}`);
        // Continue watching despite error (error recovery)
      }
    } catch (err: any) {
      const timestamp = new Date().toLocaleTimeString();
      console.error(`[${timestamp}] 💥 Error: ${err.message}`);
      // Continue watching despite unexpected error
    } finally {
      isBuilding = false;
    }
  };

  // Initial build
  await rebuild();

  // Watch for changes with debouncing
  const watcher = fsWatch(inputPath, { persistent: true }, (eventType) => {
    if (eventType === 'change') {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Debounce rebuild
      debounceTimer = setTimeout(() => {
        rebuild();
        debounceTimer = null;
      }, debounceMs);
    }
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n👋 Watch mode stopped');
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    watcher.close();
    process.exit(0);
  });

  // Keep process alive
  return new Promise(() => {
    // Never resolves - watch mode runs forever until SIGINT
  });
}

/**
 * Notify dev server of hot reload (Week 2 enhancement)
 * Currently a placeholder for integration with:
 * - Next.js Fast Refresh
 * - Webpack hot module replacement
 * - Vite HMR
 */
function notifyHotReload(outputPath: string) {
  // TODO Week 2: Implement actual hot reload
  // Options:
  // 1. WebSocket to dev server
  // 2. IPC message to parent process
  // 3. File-based trigger (create .refresh file)
  // 4. HTTP POST to dev server
  //
  // Example (placeholder):
  // if (process.env.HOLOSCRIPT_HMR_PORT) {
  //   const socket = io(`http://localhost:${process.env.HOLOSCRIPT_HMR_PORT}`);
  //   socket.emit('holoscript:change', { file: outputPath });
  // }
}

/**
 * WEEK 2 TODO: Advanced watch features
 *
 * 1. Multi-file watching:
 *    - Watch entire directories: watch('worlds/', options)
 *    - Automatic handling of new files
 *    - Dependency tracking when module system added
 *
 * 2. Enhanced debouncing:
 *    - Exponential backoff (faster debounce after successive changes)
 *    - Flush on Ctrl+S key press (if monitoring stdin)
 *
 * 3. Error recovery improvements:
 *    - Keep last successful build available
 *    - Show error diff (what changed)
 *    - Auto-fix hints for common errors
 *
 * 4. Hot reload integration:
 *    - Next.js Fast Refresh (via WebSocket)
 *    - Webpack HMR (via dev server API)
 *    - Vite HMR (via plugin)
 *    - Browser refresh fallback
 *
 * 5. Performance optimization:
 *    - AST caching between rebuilds
 *    - Incremental parsing (only re-parse changed tokens)
 *    - Parallel compilation for multiple files
 *    - Memory monitoring (cleanup on large files)
 *
 * 6. Developer experience:
 *    - Colored output (errors in red, warnings in yellow)
 *    - Progress indicators for long builds
 *    - Build statistics (tokens, AST nodes, output size)
 *    - Integration with IDE (VS Code extension)
 */

/**
 * WEEK 2 TODO: Advanced watch features
 * 
 * 1. Multi-file watching:
 *    - Watch entire directories
 *    - Handle imports/includes when module system added
 * 
 * 2. Debouncing:
 *    - Delay rebuild by 100-300ms
 *    - Prevents multiple rebuilds on rapid saves
 * 
 * 3. Error recovery:
 *    - Don't exit on compilation errors
 *    - Show errors, continue watching
 *    - Clear errors when fixed
 * 
 * 4. Hot reload integration:
 *    - Send rebuild events to dev server
 *    - Trigger React Fast Refresh
 *    - WebSocket or IPC communication
 * 
 * 5. Performance optimization:
 *    - Cache lexer output
 *    - Incremental parsing (only reparse changes)
 *    - Parallel builds (if multiple files)
 */
