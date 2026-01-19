/**
 * Hololand DevTools Hook
 *
 * This script injects BEFORE Hololand initializes to create the global hook.
 * Following pattern P.EXT.015: Global Hook Installation Pattern
 *
 * CRITICAL: Must run at document_start before any Hololand code executes.
 * See gotcha G.EXT.010: Hook Timing Race
 */

interface HololandApp {
  id: string;
  name: string;
  version?: string;
  world?: unknown;
  renderer?: unknown;
  scenes?: Map<string, unknown>;
  components?: Map<string, unknown>;
}

interface HololandDevToolsHook {
  // Version info
  version: string;

  // Registered apps
  apps: Map<string, HololandApp>;
  scenes: Map<string, unknown>;
  components: Map<string, unknown>;

  // Event system
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;

  // App registration (called by @hololand/core)
  registerApp: (app: Partial<HololandApp>) => string;
  unregisterApp: (id: string) => void;

  // Scene/component registration
  registerScene: (id: string, scene: unknown) => void;
  registerComponent: (id: string, component: unknown) => void;

  // Brittney AI interface (populated by DevTools panel)
  brittney: {
    query: ((prompt: string, context?: unknown) => Promise<string>) | null;
    inspect: ((target: unknown) => void) | null;
    suggest: ((context: unknown) => Promise<string[]>) | null;
  };

  // Profiler integration (from @hololand/devtools)
  profiler: {
    getStats: (() => unknown) | null;
    getHistory: (() => unknown[]) | null;
  };

  // Console integration
  console: {
    getEntries: (() => unknown[]) | null;
  };
}

declare global {
  interface Window {
    __HOLOLAND_DEVTOOLS_HOOK__?: HololandDevToolsHook;
  }
}

(function installHololandHook() {
  // Don't reinstall if already present
  if (window.__HOLOLAND_DEVTOOLS_HOOK__) {
    return;
  }

  // Event listeners storage
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  // Create the hook object
  const hook: HololandDevToolsHook = {
    version: '1.0.0',

    // Storage
    apps: new Map(),
    scenes: new Map(),
    components: new Map(),

    // Event system
    on(event: string, callback: (...args: unknown[]) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(callback);
    },

    off(event: string, callback: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(callback);
    },

    emit(event: string, ...args: unknown[]) {
      const cbs = listeners.get(event);
      if (cbs) {
        cbs.forEach((cb) => {
          try {
            cb(...args);
          } catch (e) {
            console.error('[Hololand DevTools Hook] Event handler error:', e);
          }
        });
      }

      // Bridge to content script via postMessage
      window.postMessage(
        {
          source: 'hololand-devtools-hook',
          event,
          payload: args,
        },
        '*'
      );
    },

    // App registration
    registerApp(app: Partial<HololandApp>): string {
      const id = app.id || `hololand-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const fullApp: HololandApp = {
        id,
        name: app.name || 'Hololand App',
        version: app.version,
        world: app.world,
        renderer: app.renderer,
        scenes: app.scenes || new Map(),
        components: app.components || new Map(),
      };

      this.apps.set(id, fullApp);
      this.emit('app-registered', { id, app: fullApp });

      console.log(`[Hololand DevTools] App registered: ${fullApp.name} (${id})`);
      return id;
    },

    unregisterApp(id: string) {
      const app = this.apps.get(id);
      if (app) {
        this.apps.delete(id);
        this.emit('app-unregistered', { id, app });
      }
    },

    // Scene registration
    registerScene(id: string, scene: unknown) {
      this.scenes.set(id, scene);
      this.emit('scene-registered', { id, scene });
    },

    // Component registration
    registerComponent(id: string, component: unknown) {
      this.components.set(id, component);
      this.emit('component-registered', { id, component });
    },

    // Brittney AI interface (populated later by DevTools panel)
    brittney: {
      query: null,
      inspect: null,
      suggest: null,
    },

    // Profiler integration (populated by @hololand/devtools if present)
    profiler: {
      getStats: null,
      getHistory: null,
    },

    // Console integration
    console: {
      getEntries: null,
    },
  };

  // Install as non-overridable, hidden property
  // Pattern P.EXT.015: Object.defineProperty with configurable:false
  Object.defineProperty(window, '__HOLOLAND_DEVTOOLS_HOOK__', {
    configurable: false,
    enumerable: false,
    get() {
      return hook;
    },
  });

  // Notify that hook is ready
  window.postMessage(
    {
      source: 'hololand-devtools-hook',
      event: 'hook-installed',
      payload: [{ version: hook.version }],
    },
    '*'
  );

  console.log('[Hololand DevTools] Hook installed v' + hook.version);
})();

export {};
