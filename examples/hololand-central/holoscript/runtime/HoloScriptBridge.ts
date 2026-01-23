/**
 * HoloScript Runtime Bridge
 *
 * Bridges HoloScript compositions to React Three Fiber rendering.
 * Handles system initialization, event routing, and state sync.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  HoloScriptPlusParser,
  HoloScriptPlusRuntimeImpl,
} from '@holoscript/core';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface HoloScriptSystem {
  id: string;
  config: Record<string, any>;
  state: Record<string, any>;
  actions: Record<string, (...args: any[]) => void>;
  getters: Record<string, () => any>;
}

export interface HoloScriptWorld {
  id: string;
  config: Record<string, any>;
  objects: HoloScriptObject[];
  spatialGroups: HoloScriptSpatialGroup[];
}

export interface HoloScriptObject {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  material?: Record<string, any>;
  properties: Record<string, any>;
  children?: HoloScriptObject[];
  traits?: string[];
  visible?: boolean;
}

export interface HoloScriptSpatialGroup {
  id: string;
  position: [number, number, number];
  objects: HoloScriptObject[];
}

export interface HoloScriptEvent {
  type: string;
  data?: any;
  source?: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT BUS
// ═══════════════════════════════════════════════════════════════════════════

class EventBus {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      });
    }

    // Also dispatch to window for cross-component communication
    window.dispatchEvent(new CustomEvent(`holoscript:${event}`, { detail: data }));
  }

  off(event: string, callback?: (data: any) => void): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }
}

export const eventBus = new EventBus();

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════

export const storage = {
  async get(key: string): Promise<any> {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('Storage error:', err);
    }
  },

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

class SystemRegistry {
  private systems: Map<string, HoloScriptSystem> = new Map();
  private initialized: Set<string> = new Set();

  register(system: HoloScriptSystem): void {
    this.systems.set(system.id, system);
  }

  get(id: string): HoloScriptSystem | undefined {
    return this.systems.get(id);
  }

  async initialize(id: string): Promise<void> {
    const system = this.systems.get(id);
    if (!system || this.initialized.has(id)) return;

    // Call system's on_init if defined
    if (typeof (system as any).on_init === 'function') {
      await (system as any).on_init();
    }

    this.initialized.add(id);
    console.log(`[HoloScript] System initialized: ${id}`);
  }

  async initializeAll(): Promise<void> {
    for (const id of this.systems.keys()) {
      await this.initialize(id);
    }
  }

  callAction(systemId: string, action: string, ...args: any[]): any {
    const system = this.systems.get(systemId);
    if (!system) {
      console.warn(`System not found: ${systemId}`);
      return;
    }

    const actionFn = system.actions[action];
    if (typeof actionFn !== 'function') {
      console.warn(`Action not found: ${systemId}.${action}`);
      return;
    }

    return actionFn(...args);
  }

  getState(systemId: string): Record<string, any> | undefined {
    return this.systems.get(systemId)?.state;
  }
}

export const systemRegistry = new SystemRegistry();

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

export const device = {
  get isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  },

  get isVR(): boolean {
    return 'xr' in navigator;
  },

  get supportsVR(): boolean {
    if (!('xr' in navigator)) return false;
    // @ts-ignore
    return navigator.xr?.isSessionSupported?.('immersive-vr') ?? false;
  },

  get isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  get prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HOLOSCRIPT LOADER HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useHoloScriptLoader(path: string) {
  const [composition, setComposition] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load ${path}: ${response.statusText}`);
        }

        const source = await response.text();
        const parser = new HoloScriptPlusParser();
        const parseResult = parser.parse(source);

        if (!parseResult.success) {
          throw new Error(
            `Parse error: ${parseResult.errors?.[0]?.message || 'Unknown error'}`
          );
        }

        const runtime = new HoloScriptPlusRuntimeImpl();
        const compiled = runtime.compile(parseResult.program);

        setComposition(compiled);
        setLoading(false);
      } catch (err) {
        console.error('HoloScript load error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }

    load();
  }, [path]);

  return { composition, error, loading };
}

// ═══════════════════════════════════════════════════════════════════════════
// WORLD RENDERER HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useWorldRenderer(world: HoloScriptWorld | null) {
  const objectsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const { scene } = useThree();

  // Update objects each frame
  useFrame((state, delta) => {
    if (!world) return;

    // Update animated objects
    objectsRef.current.forEach((obj, id) => {
      const def = findObjectDef(world, id);
      if (def?.animation) {
        applyAnimation(obj, def.animation, delta);
      }
    });
  });

  return {
    objectsRef,
    registerObject: (id: string, obj: THREE.Object3D) => {
      objectsRef.current.set(id, obj);
    },
    unregisterObject: (id: string) => {
      objectsRef.current.delete(id);
    },
  };
}

function findObjectDef(
  world: HoloScriptWorld,
  id: string
): HoloScriptObject | undefined {
  // Search in objects
  const obj = world.objects.find(o => o.id === id);
  if (obj) return obj;

  // Search in spatial groups
  for (const group of world.spatialGroups) {
    const groupObj = group.objects.find(o => o.id === id);
    if (groupObj) return groupObj;
  }

  return undefined;
}

function applyAnimation(
  obj: THREE.Object3D,
  animation: Record<string, any>,
  delta: number
): void {
  if (animation.type === 'rotate') {
    const axis = animation.axis || 'y';
    const speed = animation.speed || 1;
    obj.rotation[axis as 'x' | 'y' | 'z'] += delta * speed;
  } else if (animation.type === 'pulse') {
    const time = performance.now() / 1000;
    const min = animation.min ?? 0.8;
    const max = animation.max ?? 1.2;
    const scale = min + (Math.sin(time * 2) + 1) * 0.5 * (max - min);
    obj.scale.setScalar(scale);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

let navigateCallback: ((path: string) => void) | null = null;

export function setNavigateCallback(callback: (path: string) => void): void {
  navigateCallback = callback;
}

export function navigate(path: string): void {
  if (path === 'back') {
    window.history.back();
  } else if (navigateCallback) {
    navigateCallback(path);
  } else {
    window.location.href = path;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS FOR HOLOSCRIPT
// ═══════════════════════════════════════════════════════════════════════════

export function after(ms: number, callback: () => void): number {
  return window.setTimeout(callback, ms) as unknown as number;
}

export function every(ms: number, callback: () => void): number {
  return window.setInterval(callback, ms) as unknown as number;
}

export function debounce<T extends (...args: any[]) => void>(
  ms: number,
  callback: T
): T {
  let timeoutId: number | null = null;
  return ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), ms);
  }) as T;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL EXPORTS FOR HOLOSCRIPT
// ═══════════════════════════════════════════════════════════════════════════

// Make these available to HoloScript runtime
(globalThis as any).HoloScriptBridge = {
  eventBus,
  storage,
  systemRegistry,
  device,
  navigate,
  after,
  every,
  debounce,
  lerp,
  clamp,
};

export default {
  eventBus,
  storage,
  systemRegistry,
  device,
  navigate,
  after,
  every,
  debounce,
  lerp,
  clamp,
  useHoloScriptLoader,
  useWorldRenderer,
  setNavigateCallback,
};
