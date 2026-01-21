/**
 * Hololand DevTools Integration Service
 * 
 * This module integrates Hololand Central with the DevTools extension,
 * enabling live editing from the IDE via Brittney.
 * 
 * Features:
 * - Registers the app with DevTools hook
 * - Exposes real profiler stats
 * - Allows live HoloScript injection
 * - Broadcasts scene updates
 */

import type { ReactThreeFiber } from '@react-three/fiber';

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  renderer: {
    drawCalls: number;
    triangles: number;
    points: number;
    lines: number;
  };
}

interface HololandDevToolsHook {
  version: string;
  apps: Map<string, unknown>;
  scenes: Map<string, unknown>;
  components: Map<string, unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
  registerApp: (app: { id?: string; name: string; version?: string }) => string;
  registerScene: (id: string, scene: unknown) => void;
  profiler: {
    getStats: (() => PerformanceStats) | null;
    getHistory: (() => PerformanceStats[]) | null;
  };
  console: {
    getEntries: (() => unknown[]) | null;
  };
}

declare global {
  interface Window {
    __HOLOLAND_DEVTOOLS_HOOK__?: HololandDevToolsHook;
    __HOLOLAND_CENTRAL__?: HololandCentralAPI;
  }
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

interface HololandCentralAPI {
  // App info
  appId: string;
  version: string;
  
  // State
  currentWorld: string;
  holoScriptContent: string;
  
  // Methods
  injectHoloScript: (script: string) => void;
  navigateTo: (world: string) => void;
  getScenes: () => string[];
  getStats: () => PerformanceStats;
  
  // Event subscriptions
  onWorldChange: (callback: (world: string) => void) => () => void;
  onHoloScriptUpdate: (callback: (script: string) => void) => () => void;
}

// State management
let currentWorld = 'oasis';
let holoScriptContent = '';
let appId: string | null = null;
const worldChangeListeners = new Set<(world: string) => void>();
const holoScriptListeners = new Set<(script: string) => void>();

// Performance tracking
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 60;
const statsHistory: PerformanceStats[] = [];
let rendererInfo: { drawCalls: number; triangles: number; points: number; lines: number } = {
  drawCalls: 0,
  triangles: 0,
  points: 0,
  lines: 0,
};

// Console log capture
const consoleEntries: Array<{ level: string; message: string; timestamp: number }> = [];
const originalConsole = { ...console };

/**
 * Initialize DevTools integration
 */
export function initDevToolsIntegration(): void {
  console.log('[Hololand Central] Initializing DevTools integration...');
  
  // Check for hook (installed by DevTools extension)
  const hook = window.__HOLOLAND_DEVTOOLS_HOOK__;
  
  if (hook) {
    console.log('[Hololand Central] DevTools hook found, registering app...');
    
    // Register app
    appId = hook.registerApp({
      name: 'Hololand Central',
      version: '1.0.0',
    });
    
    // Install profiler
    hook.profiler.getStats = getPerformanceStats;
    hook.profiler.getHistory = () => [...statsHistory];
    
    // Install console integration
    hook.console.getEntries = () => [...consoleEntries];
    
    // Listen for commands from DevTools
    hook.on('inject-holoscript', (script: unknown) => {
      if (typeof script === 'string') {
        injectHoloScript(script);
      }
    });
    
    hook.on('navigate-to', (world: unknown) => {
      if (typeof world === 'string') {
        navigateTo(world);
      }
    });
    
    hook.on('request-stats', () => {
      hook.emit('profiler-stats', getPerformanceStats());
    });
    
    console.log(`[Hololand Central] Registered with DevTools as ${appId}`);
  } else {
    console.log('[Hololand Central] DevTools hook not found, installing polling hook...');
    
    // Poll for hook (extension might load after app)
    let attempts = 0;
    const pollInterval = setInterval(() => {
      attempts++;
      if (window.__HOLOLAND_DEVTOOLS_HOOK__) {
        clearInterval(pollInterval);
        initDevToolsIntegration(); // Retry initialization
      } else if (attempts > 50) {
        clearInterval(pollInterval);
        console.log('[Hololand Central] DevTools extension not detected after 5s');
      }
    }, 100);
  }
  
  // Expose global API for DevTools
  window.__HOLOLAND_CENTRAL__ = {
    appId: appId || 'not-registered',
    version: '1.0.0',
    currentWorld,
    holoScriptContent,
    injectHoloScript,
    navigateTo,
    getScenes,
    getStats: getPerformanceStats,
    onWorldChange: (callback) => {
      worldChangeListeners.add(callback);
      return () => worldChangeListeners.delete(callback);
    },
    onHoloScriptUpdate: (callback) => {
      holoScriptListeners.add(callback);
      return () => holoScriptListeners.delete(callback);
    },
  };
  
  // Start performance monitoring
  startPerformanceMonitoring();
  
  // Capture console logs
  captureConsoleLogs();
  
  console.log('[Hololand Central] DevTools integration ready');
}

/**
 * Get current performance stats
 */
function getPerformanceStats(): PerformanceStats {
  const memory = performance.memory || {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  };
  
  return {
    fps,
    frameTime: 1000 / fps,
    memory: {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    },
    renderer: { ...rendererInfo },
  };
}

/**
 * Start monitoring performance
 */
function startPerformanceMonitoring(): void {
  function measureFrame(): void {
    const now = performance.now();
    frameCount++;
    
    // Calculate FPS every second
    if (now - lastFrameTime >= 1000) {
      fps = Math.round(frameCount * 1000 / (now - lastFrameTime));
      frameCount = 0;
      lastFrameTime = now;
      
      // Store in history
      const stats = getPerformanceStats();
      statsHistory.push(stats);
      if (statsHistory.length > 60) statsHistory.shift(); // Keep 60 samples
      
      // Emit to DevTools
      const hook = window.__HOLOLAND_DEVTOOLS_HOOK__;
      if (hook) {
        hook.emit('profiler-stats', stats);
      }
    }
    
    requestAnimationFrame(measureFrame);
  }
  
  requestAnimationFrame(measureFrame);
}

/**
 * Capture console logs for DevTools
 */
function captureConsoleLogs(): void {
  const levels = ['log', 'info', 'warn', 'error'] as const;
  
  levels.forEach((level) => {
    console[level] = (...args: unknown[]) => {
      // Store entry
      consoleEntries.push({
        level,
        message: args.map(a => 
          typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' '),
        timestamp: Date.now(),
      });
      
      // Keep only last 100 entries
      if (consoleEntries.length > 100) consoleEntries.shift();
      
      // Forward to DevTools hook
      const hook = window.__HOLOLAND_DEVTOOLS_HOOK__;
      if (hook) {
        hook.emit('console-log', { level, args, timestamp: Date.now() });
      }
      
      // Call original
      originalConsole[level](...args);
    };
  });
}

/**
 * Inject HoloScript and trigger live update
 */
export function injectHoloScript(script: string): void {
  console.log('[Hololand Central] Injecting HoloScript:', script.slice(0, 100) + '...');
  
  holoScriptContent = script;
  
  // Update global API
  if (window.__HOLOLAND_CENTRAL__) {
    window.__HOLOLAND_CENTRAL__.holoScriptContent = script;
  }
  
  // Notify listeners
  holoScriptListeners.forEach(cb => cb(script));
  
  // Emit to DevTools
  const hook = window.__HOLOLAND_DEVTOOLS_HOOK__;
  if (hook) {
    hook.emit('holoscript-updated', { script, timestamp: Date.now() });
  }
}

/**
 * Navigate to a world
 */
export function navigateTo(world: string): void {
  console.log('[Hololand Central] Navigating to:', world);
  
  currentWorld = world;
  
  // Update global API
  if (window.__HOLOLAND_CENTRAL__) {
    window.__HOLOLAND_CENTRAL__.currentWorld = world;
  }
  
  // Notify listeners
  worldChangeListeners.forEach(cb => cb(world));
  
  // Emit to DevTools
  const hook = window.__HOLOLAND_DEVTOOLS_HOOK__;
  if (hook) {
    hook.emit('world-changed', { world, timestamp: Date.now() });
  }
}

/**
 * Get list of scenes
 */
function getScenes(): string[] {
  return [
    'oasis',
    'central',
    'plaza',
    'casino',
    'lounge',
    'builder',
    'arcade',
    'infinity',
  ];
}

/**
 * Update renderer info from R3F
 */
export function updateRendererInfo(info: {
  render: { calls: number; triangles: number; points: number; lines: number };
}): void {
  rendererInfo = {
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    points: info.render.points,
    lines: info.render.lines,
  };
}

/**
 * Register a scene with DevTools
 */
export function registerScene(sceneId: string, sceneData: unknown): void {
  const hook = window.__HOLOLAND_DEVTOOLS_HOOK__;
  if (hook) {
    hook.registerScene(sceneId, sceneData);
    hook.emit('scene-updated', { id: sceneId, data: sceneData });
  }
}

// Export state getters
export function getCurrentWorld(): string {
  return currentWorld;
}

export function getHoloScriptContent(): string {
  return holoScriptContent;
}
