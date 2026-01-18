/**
 * QualityManager
 *
 * Handles automatic device detection and quality preset selection.
 * Manages runtime quality adjustments based on performance metrics.
 */

import * as THREE from 'three';
import {
  QualityPreset,
  QualitySettings,
  DeviceType,
  QUALITY_PRESETS,
} from './types';
import { logger } from './logger';

// =============================================================================
// DEVICE DETECTION
// =============================================================================

interface GPUInfo {
  vendor: string;
  renderer: string;
  tier: 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * Detect GPU capabilities using WebGL debug info
 */
function detectGPU(): GPUInfo {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) {
    return { vendor: 'unknown', renderer: 'unknown', tier: 'low' };
  }

  const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');

  let vendor = 'unknown';
  let renderer = 'unknown';

  if (debugInfo) {
    vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
    renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
  }

  // Determine GPU tier based on renderer string
  const rendererLower = renderer.toLowerCase();
  let tier: GPUInfo['tier'] = 'medium';

  // High-end GPUs
  const highEndPatterns = [
    'rtx 40', 'rtx 30', 'rtx 20',
    'rx 7', 'rx 6',
    'radeon pro',
    'a100', 'h100', 'v100',
    'm1 pro', 'm1 max', 'm2', 'm3',
    'apple gpu',
  ];

  // Low-end GPUs
  const lowEndPatterns = [
    'intel hd', 'intel uhd',
    'mali-4', 'mali-t',
    'adreno 5', 'adreno 4', 'adreno 3',
    'powervr',
    'sgx',
    'tegra',
  ];

  // Ultra high-end
  const ultraPatterns = [
    'rtx 4090', 'rtx 4080',
    'rx 7900',
    'm3 max', 'm3 ultra',
  ];

  if (ultraPatterns.some(p => rendererLower.includes(p))) {
    tier = 'ultra';
  } else if (highEndPatterns.some(p => rendererLower.includes(p))) {
    tier = 'high';
  } else if (lowEndPatterns.some(p => rendererLower.includes(p))) {
    tier = 'low';
  }

  return { vendor, renderer, tier };
}

/**
 * Detect device type from user agent and XR capabilities
 */
async function detectDeviceType(): Promise<DeviceType> {
  const ua = navigator.userAgent.toLowerCase();

  // Check for Meta Quest headsets
  if (ua.includes('quest 3')) return 'quest3';
  if (ua.includes('quest pro')) return 'questPro';
  if (ua.includes('quest 2') || ua.includes('quest')) return 'quest2';
  if (ua.includes('oculus')) return 'quest2';

  // Check for other VR headsets
  if (ua.includes('openvr') || ua.includes('steamvr')) return 'pcvr';
  if (ua.includes('windows mixed reality') || ua.includes('wmr')) return 'pcvr';

  // Check WebXR capabilities
  if (navigator.xr) {
    try {
      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      if (vrSupported) {
        // Desktop with VR headset connected
        return 'pcvr';
      }
    } catch {
      // WebXR check failed, continue with other detection
    }
  }

  // Mobile detection
  if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    // Tablet detection
    if (/ipad|tablet|playbook|silk/i.test(ua) || (window.innerWidth > 768)) {
      return 'tablet';
    }
    return 'mobile';
  }

  // Desktop
  return 'desktop';
}

/**
 * Get recommended quality preset for device type
 */
function getRecommendedPreset(deviceType: DeviceType, gpuTier: GPUInfo['tier']): Exclude<QualityPreset, 'auto'> {
  const recommendations: Record<DeviceType, Record<GPUInfo['tier'], Exclude<QualityPreset, 'auto'>>> = {
    mobile: { low: 'low', medium: 'low', high: 'medium', ultra: 'medium' },
    tablet: { low: 'low', medium: 'medium', high: 'medium', ultra: 'high' },
    quest2: { low: 'low', medium: 'low', high: 'medium', ultra: 'medium' },
    quest3: { low: 'medium', medium: 'medium', high: 'high', ultra: 'high' },
    questPro: { low: 'medium', medium: 'medium', high: 'high', ultra: 'high' },
    pcvr: { low: 'medium', medium: 'high', high: 'high', ultra: 'ultra' },
    desktop: { low: 'medium', medium: 'high', high: 'high', ultra: 'ultra' },
    unknown: { low: 'low', medium: 'medium', high: 'medium', ultra: 'high' },
  };

  return recommendations[deviceType][gpuTier];
}

// =============================================================================
// QUALITY MANAGER CLASS
// =============================================================================

export interface QualityManagerOptions {
  /** Initial quality preset */
  preset?: QualityPreset;
  /** Custom quality overrides */
  overrides?: Partial<QualitySettings>;
  /** Enable adaptive quality (auto-adjust based on FPS) */
  adaptiveQuality?: boolean;
  /** Target FPS for adaptive quality */
  targetFPS?: number;
  /** Callback when quality changes */
  onQualityChange?: (settings: QualitySettings, preset: Exclude<QualityPreset, 'auto'>) => void;
}

export class QualityManager {
  private currentPreset: Exclude<QualityPreset, 'auto'>;
  private currentSettings: QualitySettings;
  private deviceType: DeviceType = 'unknown';
  private gpuInfo: GPUInfo = { vendor: 'unknown', renderer: 'unknown', tier: 'medium' };
  private adaptiveQuality: boolean;
  private onQualityChange?: QualityManagerOptions['onQualityChange'];

  // Performance tracking
  private frameTimeHistory: number[] = [];
  private lastAdaptiveCheck: number = 0;
  private readonly ADAPTIVE_CHECK_INTERVAL = 2000; // Check every 2 seconds
  private readonly FRAME_HISTORY_SIZE = 60;

  constructor(options: QualityManagerOptions = {}) {
    this.adaptiveQuality = options.adaptiveQuality ?? true;
    this.onQualityChange = options.onQualityChange;

    // Set initial quality
    if (options.preset && options.preset !== 'auto') {
      this.currentPreset = options.preset;
      this.currentSettings = { ...QUALITY_PRESETS[options.preset] };
    } else {
      // Will be updated in initialize()
      this.currentPreset = 'medium';
      this.currentSettings = { ...QUALITY_PRESETS.medium };
    }

    // Apply overrides
    if (options.overrides) {
      this.currentSettings = { ...this.currentSettings, ...options.overrides };
    }

    logger.info('[QualityManager] Created', { preset: this.currentPreset });
  }

  /**
   * Initialize quality manager (async device detection)
   */
  async initialize(): Promise<void> {
    // Detect GPU
    this.gpuInfo = detectGPU();

    // Detect device type
    this.deviceType = await detectDeviceType();

    // Get recommended preset if on auto
    const recommendedPreset = getRecommendedPreset(this.deviceType, this.gpuInfo.tier);

    logger.info('[QualityManager] Detected', {
      deviceType: this.deviceType,
      gpuVendor: this.gpuInfo.vendor,
      gpuRenderer: this.gpuInfo.renderer,
      gpuTier: this.gpuInfo.tier,
      recommendedPreset,
    });

    // Only apply recommendation if no preset was explicitly set
    if (this.currentPreset === 'medium' && !this.onQualityChange) {
      this.setPreset(recommendedPreset);
    }
  }

  /**
   * Get current quality settings
   */
  getSettings(): Readonly<QualitySettings> {
    return this.currentSettings;
  }

  /**
   * Get current preset name
   */
  getPreset(): Exclude<QualityPreset, 'auto'> {
    return this.currentPreset;
  }

  /**
   * Get detected device type
   */
  getDeviceType(): DeviceType {
    return this.deviceType;
  }

  /**
   * Get GPU info
   */
  getGPUInfo(): Readonly<GPUInfo> {
    return this.gpuInfo;
  }

  /**
   * Set quality preset
   */
  setPreset(preset: Exclude<QualityPreset, 'auto'>, overrides?: Partial<QualitySettings>): void {
    this.currentPreset = preset;
    this.currentSettings = { ...QUALITY_PRESETS[preset], ...overrides };

    logger.info('[QualityManager] Preset changed', { preset });

    this.onQualityChange?.(this.currentSettings, preset);
  }

  /**
   * Apply partial settings override
   */
  applyOverrides(overrides: Partial<QualitySettings>): void {
    this.currentSettings = { ...this.currentSettings, ...overrides };
    this.onQualityChange?.(this.currentSettings, this.currentPreset);
  }

  /**
   * Record frame time for adaptive quality
   */
  recordFrameTime(deltaMs: number): void {
    if (!this.adaptiveQuality) return;

    this.frameTimeHistory.push(deltaMs);
    if (this.frameTimeHistory.length > this.FRAME_HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }

    // Check if we should adapt quality
    const now = performance.now();
    if (now - this.lastAdaptiveCheck > this.ADAPTIVE_CHECK_INTERVAL) {
      this.lastAdaptiveCheck = now;
      this.checkAdaptiveQuality();
    }
  }

  /**
   * Check and adjust quality based on performance
   */
  private checkAdaptiveQuality(): void {
    if (this.frameTimeHistory.length < 30) return;

    // Calculate average FPS from frame times
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const currentFPS = 1000 / avgFrameTime;

    const targetWithBuffer = this.currentSettings.targetFPS * 0.9; // 10% buffer

    // Too slow - decrease quality
    if (currentFPS < targetWithBuffer && this.currentPreset !== 'low') {
      const presetOrder: Array<Exclude<QualityPreset, 'auto'>> = ['ultra', 'high', 'medium', 'low'];
      const currentIndex = presetOrder.indexOf(this.currentPreset);
      if (currentIndex < presetOrder.length - 1) {
        const newPreset = presetOrder[currentIndex + 1];
        logger.info('[QualityManager] Adaptive: Decreasing quality', {
          currentFPS: Math.round(currentFPS),
          targetFPS: this.currentSettings.targetFPS,
          newPreset,
        });
        this.setPreset(newPreset);
      }
    }

    // Running well above target - could increase quality
    if (currentFPS > this.currentSettings.targetFPS * 1.3 && this.currentPreset !== 'ultra') {
      // Only increase if we've been stable for a while
      const minFrameTime = Math.min(...this.frameTimeHistory);
      const maxFrameTime = Math.max(...this.frameTimeHistory);
      const variance = maxFrameTime - minFrameTime;

      if (variance < avgFrameTime * 0.3) { // Low variance = stable
        const presetOrder: Array<Exclude<QualityPreset, 'auto'>> = ['low', 'medium', 'high', 'ultra'];
        const currentIndex = presetOrder.indexOf(this.currentPreset);
        if (currentIndex < presetOrder.length - 1) {
          const newPreset = presetOrder[currentIndex + 1];
          logger.info('[QualityManager] Adaptive: Increasing quality', {
            currentFPS: Math.round(currentFPS),
            newPreset,
          });
          this.setPreset(newPreset);
        }
      }
    }
  }

  /**
   * Enable/disable adaptive quality
   */
  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQuality = enabled;
    this.frameTimeHistory = [];
    logger.info('[QualityManager] Adaptive quality', { enabled });
  }

  /**
   * Apply quality settings to Three.js renderer
   */
  applyToRenderer(renderer: THREE.WebGLRenderer): void {
    const settings = this.currentSettings;

    // Pixel ratio
    renderer.setPixelRatio(Math.min(settings.pixelRatio, window.devicePixelRatio));

    // Shadows
    renderer.shadowMap.enabled = settings.shadowsEnabled;
    switch (settings.shadowType) {
      case 'basic':
        renderer.shadowMap.type = THREE.BasicShadowMap;
        break;
      case 'pcf':
        renderer.shadowMap.type = THREE.PCFShadowMap;
        break;
      case 'pcfsoft':
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
      case 'vsm':
        renderer.shadowMap.type = THREE.VSMShadowMap;
        break;
    }

    // Tone mapping
    if (settings.toneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
    } else {
      renderer.toneMapping = THREE.NoToneMapping;
    }

    // Output encoding
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    logger.debug('[QualityManager] Applied to renderer', { preset: this.currentPreset });
  }

  /**
   * Get summary string for UI display
   */
  getSummary(): string {
    const settings = this.currentSettings;
    const features: string[] = [];

    if (settings.shadowsEnabled) features.push('Shadows');
    if (settings.postProcessing) features.push('Post-FX');
    if (settings.bloom) features.push('Bloom');
    if (settings.ssao) features.push('SSAO');
    if (settings.hdriEnvironment) features.push('HDRI');
    if (settings.realTimeReflections) features.push('Reflections');

    return `${this.currentPreset.toUpperCase()}: ${features.join(', ') || 'Basic rendering'}`;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let defaultManager: QualityManager | null = null;

/**
 * Get or create the default quality manager
 */
export function getQualityManager(options?: QualityManagerOptions): QualityManager {
  if (!defaultManager) {
    defaultManager = new QualityManager(options);
  }
  return defaultManager;
}

/**
 * Create a new quality manager instance
 */
export function createQualityManager(options?: QualityManagerOptions): QualityManager {
  return new QualityManager(options);
}
