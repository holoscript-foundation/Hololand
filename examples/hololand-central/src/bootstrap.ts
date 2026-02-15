/**
 * HoloScript Bootstrap — ONLY TypeScript file for the application.
 * Everything else (worlds, logic, UI, systems) lives in .hsplus files.
 *
 * This file:
 *   1. Initializes the HoloScript runtime
 *   2. Loads the main composition (app.hsplus)
 *   3. Starts the render loop
 */
import { createRuntime } from '@holoscript/core/runtime';
import { loadComposition } from '@holoscript/loader';

async function main() {
  // Load the root composition — all game logic, zones, systems defined in HoloScript
  const composition = await loadComposition('./app.hsplus');

  // Create runtime targeting the DOM root
  const runtime = createRuntime(composition, {
    target: document.getElementById('root')!,
    mode: 'progressive', // desktop → VR when headset detected
    features: {
      physics: true,
      networking: true,
      audio: true,
      xr: true,
    },
  });

  // Start the application — HoloScript takes over from here
  runtime.start();

  // Expose runtime for dev tools / Brittney AI
  if (import.meta.env.DEV) {
    (window as any).__HOLOSCRIPT_RUNTIME__ = runtime;
  }
}

main().catch(console.error);
