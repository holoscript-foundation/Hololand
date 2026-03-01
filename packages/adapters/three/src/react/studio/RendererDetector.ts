/**
 * Renderer Detection & Preference Persistence
 *
 * Detects browser support for WebGPU and WebGL2 renderers,
 * auto-selects the best available backend, and persists
 * user preference via localStorage.
 *
 * @module studio/RendererDetector
 */

// =============================================================================
// TYPES
// =============================================================================

/** Available rendering backends */
export type RendererBackend = 'webgpu' | 'webgl2';

/** Result of capability detection */
export interface RendererCapabilities {
  /** Whether WebGPU is supported in the current browser */
  webgpuSupported: boolean;
  /** Whether WebGL2 is supported in the current browser */
  webgl2Supported: boolean;
  /** The best available backend (WebGPU preferred) */
  recommended: RendererBackend;
  /** GPU adapter info (WebGPU only, available after async probe) */
  gpuAdapterInfo: GPUAdapterInfo | null;
  /** WebGL2 renderer string (vendor + renderer) */
  webgl2RendererInfo: string | null;
}

/** GPU adapter info extracted from WebGPU */
export interface GPUAdapterInfo {
  vendor: string;
  architecture: string;
  description: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'hololand-studio-renderer-preference';

// =============================================================================
// DETECTION
// =============================================================================

/**
 * Synchronously check if WebGPU API is present.
 * Does NOT guarantee the adapter will succeed (use probeWebGPU for that).
 */
export function hasWebGPUAPI(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Synchronously check if WebGL2 is supported.
 */
export function hasWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2');
    const supported = ctx !== null;
    // Clean up
    if (ctx) {
      const ext = ctx.getExtension('WEBGL_lose_context');
      ext?.loseContext();
    }
    return supported;
  } catch {
    return false;
  }
}

/**
 * Get WebGL2 renderer info string (GPU vendor + model).
 */
export function getWebGL2RendererInfo(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let info: string | null = null;
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      info = `${vendor} - ${renderer}`;
    }

    // Clean up
    const loseCtx = gl.getExtension('WEBGL_lose_context');
    loseCtx?.loseContext();

    return info;
  } catch {
    return null;
  }
}

/**
 * Asynchronously probe WebGPU adapter to confirm real support
 * and extract GPU info.
 */
export async function probeWebGPU(): Promise<GPUAdapterInfo | null> {
  if (!hasWebGPUAPI()) return null;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;

    // Request adapter info - fallback for browsers that do not expose it
    let info: GPUAdapterInfo = {
      vendor: 'Unknown',
      architecture: 'Unknown',
      description: 'WebGPU Adapter',
    };

    // adapterInfo is available on newer Chrome builds
    if ('adapterInfo' in adapter) {
      const ai = (adapter as any).adapterInfo;
      info = {
        vendor: ai.vendor || 'Unknown',
        architecture: ai.architecture || 'Unknown',
        description: ai.description || 'WebGPU Adapter',
      };
    }

    return info;
  } catch {
    return null;
  }
}

/**
 * Perform full async capability detection.
 * This probes WebGPU (if available) to confirm real hardware support.
 */
export async function detectRendererCapabilities(): Promise<RendererCapabilities> {
  const webgl2Supported = hasWebGL2();
  const webgl2RendererInfo = webgl2Supported ? getWebGL2RendererInfo() : null;

  let webgpuSupported = false;
  let gpuAdapterInfo: GPUAdapterInfo | null = null;

  if (hasWebGPUAPI()) {
    gpuAdapterInfo = await probeWebGPU();
    webgpuSupported = gpuAdapterInfo !== null;
  }

  const recommended: RendererBackend = webgpuSupported ? 'webgpu' : 'webgl2';

  return {
    webgpuSupported,
    webgl2Supported,
    recommended,
    gpuAdapterInfo,
    webgl2RendererInfo,
  };
}

// =============================================================================
// PERSISTENCE
// =============================================================================

/**
 * Save the user's renderer preference to localStorage.
 */
export function saveRendererPreference(backend: RendererBackend): void {
  try {
    localStorage.setItem(STORAGE_KEY, backend);
  } catch {
    // localStorage may be unavailable (incognito, storage quota, etc.)
  }
}

/**
 * Load the user's saved renderer preference.
 * Returns null if no preference was saved.
 */
export function loadRendererPreference(): RendererBackend | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'webgpu' || value === 'webgl2') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear the saved renderer preference (revert to auto-detection).
 */
export function clearRendererPreference(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Resolve the effective renderer backend.
 *
 * Priority:
 * 1. User's saved preference (if that backend is actually supported)
 * 2. Auto-detected recommendation
 */
export function resolveRendererBackend(
  capabilities: RendererCapabilities,
): RendererBackend {
  const saved = loadRendererPreference();

  // If user has a preference AND the backend is available, honour it
  if (saved === 'webgpu' && capabilities.webgpuSupported) return 'webgpu';
  if (saved === 'webgl2' && capabilities.webgl2Supported) return 'webgl2';

  // Fall back to recommendation
  return capabilities.recommended;
}
