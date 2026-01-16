import { watch as fsWatch } from 'fs';
import { resolve } from 'path';
import { HoloScriptBuilder } from './build';

export interface WatchOptions {
  output?: string;
  optimize?: boolean;
  verbose?: boolean;
  sourceMaps?: boolean;
}

/**
 * Watch a HoloScript file and rebuild on changes
 * 
 * WEEK 2 TODO:
 * - Integrate with Next.js fast refresh
 * - Add debouncing (currently rebuilds on every save)
 * - Add error recovery (don't exit on compilation error)
 * - Add hot reload messaging
 * - Performance optimization (cache AST when possible)
 */
export async function watch(
  inputFile: string,
  options: WatchOptions = {}
): Promise<void> {
  const inputPath = resolve(inputFile);
  let isBuilding = false;

  console.log(`👀 Watching ${inputFile}`);
  console.log(`   Press Ctrl+C to stop\n`);

  const rebuild = async () => {
    if (isBuilding) return;

    isBuilding = true;
    const builder = new HoloScriptBuilder({
      input: inputPath,
      ...options,
      verbose: false, // Suppress verbose output in watch mode
    });

    try {
      const result = await builder.build();

      if (result.success) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ✅ Built (${result.duration}ms)`);
      } else {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ❌ Error: ${result.errors[0]}`);
      }
    } catch (err: any) {
      const timestamp = new Date().toLocaleTimeString();
      console.error(`[${timestamp}] 💥 Unexpected error: ${err.message}`);
    } finally {
      isBuilding = false;
    }
  };

  // Initial build
  await rebuild();

  // Watch for changes
  const watcher = fsWatch(inputPath, { persistent: true }, (eventType) => {
    if (eventType === 'change') {
      rebuild();
    }
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n👋 Watch mode stopped');
    watcher.close();
    process.exit(0);
  });

  // Keep process alive
  return new Promise(() => {
    // Never resolves - watch mode runs forever until SIGINT
  });
}

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
