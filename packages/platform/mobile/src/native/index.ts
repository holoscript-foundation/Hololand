/**
 * @hololand/mobile - Native Bridge Layer
 *
 * Barrel export and initialization for the Capacitor-based mobile runtime shell.
 * Detects whether the app is running inside a Capacitor native container and
 * initializes all native bridge instances accordingly.
 *
 * Usage:
 *   import { initializeNativeBridge } from '@hololand/mobile';
 *
 *   const bridge = await initializeNativeBridge();
 *   if (bridge) {
 *     await bridge.haptics.lightImpact();
 *     const quality = await bridge.performance.getRecommendedQuality();
 *   }
 */

// Re-export all bridge classes and types
export { CameraBridge } from './CameraBridge';
export type {
  CameraFacing,
  CameraResolution,
  CameraConfig,
  CapturedFrame,
  CameraCapabilities,
} from './CameraBridge';

export { PushNotificationBridge } from './PushNotificationBridge';
export type {
  NotificationReceivedCallback,
  NotificationTappedCallback,
  HoloNotification,
  PushRegistrationResult,
} from './PushNotificationBridge';

export { HapticBridge } from './HapticBridge';
export type {
  HapticIntensity,
  HapticPatternStep,
} from './HapticBridge';

export { PerformanceAdapter } from './PerformanceAdapter';
export type {
  GPUTier,
  GraphicsBackend,
  MobileQualityPreset,
  GPUDetectionResult,
  FrameRateCallback,
} from './PerformanceAdapter';

// =============================================================================
// TYPES
// =============================================================================

import { CameraBridge } from './CameraBridge';
import { PushNotificationBridge } from './PushNotificationBridge';
import { HapticBridge } from './HapticBridge';
import { PerformanceAdapter } from './PerformanceAdapter';

/** The platform the app is running on */
export type NativePlatform = 'ios' | 'android' | 'web';

/** Aggregated native bridge API returned by initializeNativeBridge() */
export interface NativeBridgeAPI {
  /** The detected platform */
  platform: NativePlatform;
  /** Whether running inside a Capacitor native container */
  isNative: boolean;
  /** Camera bridge for AR/volumetric capture */
  camera: CameraBridge;
  /** Push notification bridge for FCM/APNS */
  pushNotifications: PushNotificationBridge;
  /** Haptic feedback bridge for VR/spatial interactions */
  haptics: HapticBridge;
  /** Adaptive performance and quality management */
  performance: PerformanceAdapter;
  /** Dispose all bridges and clean up resources */
  dispose: () => Promise<void>;
}

// =============================================================================
// PLATFORM DETECTION
// =============================================================================

interface CapacitorGlobal {
  isNativePlatform: () => boolean;
  getPlatform: () => string;
}

/**
 * Detect whether we are running inside a Capacitor native container.
 */
function detectCapacitorEnvironment(): { isNative: boolean; platform: NativePlatform } {
  if (typeof window === 'undefined') {
    return { isNative: false, platform: 'web' };
  }

  const win = window as Window & { Capacitor?: CapacitorGlobal };

  if (win.Capacitor && typeof win.Capacitor.isNativePlatform === 'function') {
    const isNative = win.Capacitor.isNativePlatform();
    const rawPlatform = win.Capacitor.getPlatform();

    let platform: NativePlatform = 'web';
    if (rawPlatform === 'ios') {
      platform = 'ios';
    } else if (rawPlatform === 'android') {
      platform = 'android';
    }

    return { isNative, platform };
  }

  return { isNative: false, platform: 'web' };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/** Singleton instance to prevent double initialization */
let bridgeInstance: NativeBridgeAPI | null = null;

/**
 * Initialize the native bridge layer.
 *
 * Detects the Capacitor environment, instantiates all bridge classes,
 * and runs initial setup (GPU detection, etc.).
 *
 * Can be called multiple times safely; returns the same instance after
 * the first initialization.
 *
 * @returns NativeBridgeAPI with all bridge instances, or null if running
 *          outside a supported environment (e.g., Node.js / SSR)
 */
export async function initializeNativeBridge(): Promise<NativeBridgeAPI | null> {
  // Return existing instance if already initialized
  if (bridgeInstance) {
    return bridgeInstance;
  }

  // Check for browser environment
  if (typeof window === 'undefined') {
    console.info('[NativeBridge] Not in browser environment, skipping initialization.');
    return null;
  }

  const { isNative, platform } = detectCapacitorEnvironment();

  console.info('[NativeBridge] Initializing', { isNative, platform });

  // Create bridge instances
  const camera = new CameraBridge();
  const pushNotifications = new PushNotificationBridge();
  const haptics = new HapticBridge();
  const performance = new PerformanceAdapter();

  // Run initial GPU detection (non-blocking, best-effort)
  try {
    await performance.detectGPUTier();
  } catch (error) {
    console.warn('[NativeBridge] GPU detection failed, using defaults:', error);
  }

  // Build the API
  bridgeInstance = {
    platform,
    isNative,
    camera,
    pushNotifications,
    haptics,
    performance,

    async dispose() {
      await camera.dispose();
      await pushNotifications.dispose();
      performance.dispose();
      bridgeInstance = null;
      console.info('[NativeBridge] Disposed all bridges.');
    },
  };

  console.info('[NativeBridge] Initialization complete', {
    platform,
    isNative,
    gpuTier: performance.getGPUInfo()?.tier ?? 'unknown',
    hapticsAvailable: haptics.isAvailable(),
  });

  return bridgeInstance;
}

/**
 * Get the current native bridge instance without initializing.
 * Returns null if initializeNativeBridge() has not been called yet.
 */
export function getNativeBridge(): NativeBridgeAPI | null {
  return bridgeInstance;
}
