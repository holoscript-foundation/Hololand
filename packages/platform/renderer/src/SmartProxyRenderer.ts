/**
 * SmartProxyRenderer
 *
 * Implements the Smart Proxy VR Preview pattern for HoloLand.
 *
 * CONCEPT: During editing, the scene renders at reduced quality (proxy mode)
 * for fast iteration and responsive manipulation. When the user enters VR
 * preview, the system ramps up to full quality rendering with all post-processing,
 * PBR materials, high-resolution shadows, and HDRI environments.
 *
 * ARCHITECTURE:
 * - ProxyMode (editing):  Low resolution, basic materials, no post-processing,
 *                         reduced shadow maps, simplified geometry (LOD2),
 *                         wireframe overlays for selected objects.
 * - PreviewMode (VR):     Full quality per device detection, PBR materials,
 *                         post-processing pipeline, HDRI environment, full LOD0,
 *                         adaptive quality degradation for sustained 90fps.
 * - TransitionMode:       Progressive quality ramp-up during the switch from
 *                         proxy to preview to avoid a loading stall.
 *
 * INTEGRATION: Wraps HololandRenderer and coordinates with QualityManager,
 * LODManager, and the VR Performance Degradation system.
 *
 * @module SmartProxyRenderer
 */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import type { HololandWorld } from '@hololand/world';
import type {
  QualityPreset,
  QualitySettings,
  RendererConfig,
  PostProcessingConfig,
} from './types';
import { QUALITY_PRESETS } from './types';
import { QualityManager, createQualityManager } from './QualityManager';
import { PostProcessingPipeline, createPostProcessingPipeline } from './PostProcessing';
import { EnvironmentManager, createEnvironmentManager } from './EnvironmentManager';
import { MaterialFactory, createMaterialFactory } from './MaterialFactory';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Rendering mode for the Smart Proxy system
 */
export type SmartProxyMode = 'proxy' | 'preview' | 'transition';

/**
 * Proxy quality tier - controls how aggressively quality is reduced during editing
 */
export type ProxyQualityTier = 'wireframe' | 'minimal' | 'balanced' | 'near-final';

/**
 * Configuration for the Smart Proxy Renderer
 */
export interface SmartProxyConfig {
  /** Initial proxy quality tier for editing mode (default: 'balanced') */
  proxyTier?: ProxyQualityTier;

  /** Quality preset to use in VR preview mode (default: 'auto') */
  previewQuality?: QualityPreset;

  /** Duration of transition from proxy to preview in ms (default: 2000) */
  transitionDuration?: number;

  /** Enable progressive transition (ramp up quality over time) */
  progressiveTransition?: boolean;

  /** Resolution scale for proxy mode (0.25 - 1.0, default: 0.5) */
  proxyResolutionScale?: number;

  /** Resolution scale for preview mode (0.75 - 2.0, default: 1.0) */
  previewResolutionScale?: number;

  /** Show wireframe overlay in proxy mode for selected objects */
  proxyWireframeOverlay?: boolean;

  /** Show quality indicator HUD */
  showQualityIndicator?: boolean;

  /** Maximum geometry segments in proxy mode */
  proxyMaxSegments?: number;

  /** Enable auto-enter VR preview when headset detected */
  autoEnterVRPreview?: boolean;

  /** Callback when mode changes */
  onModeChange?: (mode: SmartProxyMode, previousMode: SmartProxyMode) => void;

  /** Callback when transition completes */
  onTransitionComplete?: (targetMode: SmartProxyMode) => void;

  /** Callback with quality metrics during preview */
  onPreviewMetrics?: (metrics: PreviewMetrics) => void;

  /** Base renderer config to merge */
  rendererConfig?: RendererConfig;
}

/**
 * Metrics reported during VR preview mode
 */
export interface PreviewMetrics {
  /** Current FPS */
  fps: number;
  /** Average frame time in ms */
  avgFrameTime: number;
  /** Current quality preset */
  qualityPreset: string;
  /** Whether adaptive quality is active */
  adaptiveActive: boolean;
  /** Transition progress (0-1, 1 = fully transitioned) */
  transitionProgress: number;
  /** Number of objects at each LOD level */
  lodDistribution: { lod0: number; lod1: number; lod2: number };
  /** Current render resolution */
  renderResolution: { width: number; height: number };
  /** Post-processing enabled */
  postProcessingEnabled: boolean;
  /** GPU memory estimate in MB */
  estimatedGPUMemoryMB: number;
}

/**
 * Proxy quality settings per tier
 */
const PROXY_TIER_SETTINGS: Record<ProxyQualityTier, Partial<QualitySettings>> = {
  wireframe: {
    shadowsEnabled: false,
    shadowMapSize: 0,
    shadowType: 'basic',
    materialType: 'basic',
    maxTextureSize: 128,
    anisotropy: 1,
    maxPolyCount: 10000,
    lodBias: 2,
    postProcessing: false,
    bloom: false,
    ssao: false,
    ssr: false,
    toneMapping: false,
    antialiasing: 'none',
    hdriEnvironment: false,
    envMapResolution: 64,
    realTimeReflections: false,
    maxAnimatedObjects: 0,
    physicsSubsteps: 1,
    targetFPS: 60,
    pixelRatio: 0.5,
  },
  minimal: {
    shadowsEnabled: false,
    shadowMapSize: 256,
    shadowType: 'basic',
    materialType: 'basic',
    maxTextureSize: 256,
    anisotropy: 1,
    maxPolyCount: 25000,
    lodBias: 2,
    postProcessing: false,
    bloom: false,
    ssao: false,
    ssr: false,
    toneMapping: false,
    antialiasing: 'none',
    hdriEnvironment: false,
    envMapResolution: 128,
    realTimeReflections: false,
    maxAnimatedObjects: 5,
    physicsSubsteps: 1,
    targetFPS: 60,
    pixelRatio: 0.5,
  },
  balanced: {
    shadowsEnabled: true,
    shadowMapSize: 512,
    shadowType: 'basic',
    materialType: 'standard',
    maxTextureSize: 512,
    anisotropy: 2,
    maxPolyCount: 50000,
    lodBias: 1.5,
    postProcessing: false,
    bloom: false,
    ssao: false,
    ssr: false,
    toneMapping: false,
    antialiasing: 'fxaa',
    hdriEnvironment: false,
    envMapResolution: 128,
    realTimeReflections: false,
    maxAnimatedObjects: 10,
    physicsSubsteps: 1,
    targetFPS: 60,
    pixelRatio: 0.75,
  },
  'near-final': {
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowType: 'pcf',
    materialType: 'standard',
    maxTextureSize: 1024,
    anisotropy: 4,
    maxPolyCount: 150000,
    lodBias: 1,
    postProcessing: false,
    bloom: false,
    ssao: false,
    ssr: false,
    toneMapping: true,
    antialiasing: 'fxaa',
    hdriEnvironment: true,
    envMapResolution: 256,
    realTimeReflections: false,
    maxAnimatedObjects: 25,
    physicsSubsteps: 2,
    targetFPS: 60,
    pixelRatio: 1.0,
  },
};

/**
 * Transition steps define the progressive quality ramp-up sequence
 * from proxy mode to full preview. Each step applies a subset of
 * the final quality settings.
 */
interface TransitionStep {
  /** Progress threshold (0-1) at which this step activates */
  threshold: number;
  /** Human-readable label */
  label: string;
  /** Quality overrides to apply at this step */
  overrides: Partial<QualitySettings>;
}

// =============================================================================
// SMART PROXY RENDERER
// =============================================================================

/**
 * SmartProxyRenderer manages the dual-mode rendering pipeline for HoloLand.
 *
 * In proxy mode, the scene renders at reduced quality for fast editing.
 * In preview mode, full VR-quality rendering is active with post-processing.
 *
 * Usage:
 * ```typescript
 * const proxy = new SmartProxyRenderer(canvas, world, {
 *   proxyTier: 'balanced',
 *   previewQuality: 'auto',
 *   transitionDuration: 2000,
 * });
 *
 * // Start in proxy mode (editing)
 * proxy.start();
 *
 * // Enter VR preview
 * proxy.enterPreview();
 *
 * // Return to editing
 * proxy.exitPreview();
 *
 * // Get current metrics
 * const metrics = proxy.getPreviewMetrics();
 * ```
 */
export class SmartProxyRenderer {
  // Core state
  private canvas: HTMLCanvasElement;
  private world: HololandWorld;
  private config: Required<SmartProxyConfig>;
  private currentMode: SmartProxyMode = 'proxy';

  // Three.js objects
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private scalingRoot: THREE.Group;

  // Object tracking
  private objectMap: Map<string, THREE.Object3D> = new Map();
  private proxyMaterials: Map<string, THREE.Material | THREE.Material[]> = new Map();
  private previewMaterials: Map<string, THREE.Material | THREE.Material[]> = new Map();

  // Quality systems
  private qualityManager: QualityManager;
  private materialFactory: MaterialFactory;
  private postProcessing: PostProcessingPipeline | null = null;
  private environmentManager: EnvironmentManager | null = null;

  // Wireframe overlay for proxy mode
  private wireframeOverlays: Map<string, THREE.LineSegments> = new Map();

  // Transition state
  private transitionStartTime: number = 0;
  private transitionTargetMode: SmartProxyMode = 'proxy';
  private transitionSteps: TransitionStep[] = [];
  private transitionCurrentStep: number = -1;

  // Render loop
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private frameTimeHistory: number[] = [];
  private readonly FRAME_HISTORY_SIZE = 120;

  // VR state
  private vrEnabled: boolean = false;
  private vrButton: HTMLElement | null = null;

  // Proxy render target (for resolution scaling)
  private proxyRenderTarget: THREE.WebGLRenderTarget | null = null;
  private proxyQuad: THREE.Mesh | null = null;
  private proxyScene: THREE.Scene | null = null;
  private proxyCamera: THREE.OrthographicCamera | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    world: HololandWorld,
    config?: SmartProxyConfig,
  ) {
    this.canvas = canvas;
    this.world = world;

    // Resolve config with defaults
    this.config = {
      proxyTier: config?.proxyTier ?? 'balanced',
      previewQuality: config?.previewQuality ?? 'auto',
      transitionDuration: config?.transitionDuration ?? 2000,
      progressiveTransition: config?.progressiveTransition ?? true,
      proxyResolutionScale: Math.max(0.25, Math.min(1.0, config?.proxyResolutionScale ?? 0.5)),
      previewResolutionScale: Math.max(0.75, Math.min(2.0, config?.previewResolutionScale ?? 1.0)),
      proxyWireframeOverlay: config?.proxyWireframeOverlay ?? true,
      showQualityIndicator: config?.showQualityIndicator ?? true,
      proxyMaxSegments: config?.proxyMaxSegments ?? 16,
      autoEnterVRPreview: config?.autoEnterVRPreview ?? true,
      onModeChange: config?.onModeChange ?? (() => {}),
      onTransitionComplete: config?.onTransitionComplete ?? (() => {}),
      onPreviewMetrics: config?.onPreviewMetrics ?? (() => {}),
      rendererConfig: config?.rendererConfig ?? {},
    };

    // Build progressive transition steps
    this.transitionSteps = this.buildTransitionSteps();

    // Initialize quality manager with proxy settings initially
    const proxySettings = PROXY_TIER_SETTINGS[this.config.proxyTier];
    this.qualityManager = createQualityManager({
      preset: 'low',
      overrides: proxySettings,
      adaptiveQuality: false, // Disabled during proxy mode
      onQualityChange: (settings, preset) => this.onQualityChange(settings, preset),
    });

    // Initialize material factory with proxy quality
    const initialSettings = { ...QUALITY_PRESETS.low, ...proxySettings };
    this.materialFactory = createMaterialFactory(initialSettings);

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      this.config.rendererConfig.backgroundColor ?? 0x1a1a2e,
    );

    // Scaling root
    this.scalingRoot = new THREE.Group();
    this.scene.add(this.scalingRoot);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      this.config.rendererConfig.cameraFov ?? 75,
      canvas.width / canvas.height,
      0.1,
      1000,
    );
    const camPos = this.config.rendererConfig.cameraPosition ?? { x: 10, y: 10, z: 10 };
    this.camera.position.set(camPos.x, camPos.y, camPos.z);

    // Renderer - start with proxy-friendly settings
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // Disabled in proxy, enabled in preview
      powerPreference: 'default', // Save power in proxy
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(proxySettings.pixelRatio ?? 0.75);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Apply proxy shadow settings
    this.renderer.shadowMap.enabled = proxySettings.shadowsEnabled ?? false;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;

    // Setup proxy render target for resolution scaling
    this.setupProxyRenderTarget();

    // Default proxy lighting (simple, fast)
    this.setupProxyLighting();

    // Sync world objects
    this.setupWorldSync();

    // VR support (but don't enter VR in proxy mode)
    this.setupVRSupport();

    logger.info('[SmartProxyRenderer] Initialized', {
      mode: this.currentMode,
      proxyTier: this.config.proxyTier,
      previewQuality: this.config.previewQuality,
      proxyResolution: this.config.proxyResolutionScale,
    });
  }

  // ===========================================================================
  // MODE MANAGEMENT
  // ===========================================================================

  /**
   * Get current rendering mode
   */
  getMode(): SmartProxyMode {
    return this.currentMode;
  }

  /**
   * Enter VR preview mode with full quality rendering.
   * If progressiveTransition is enabled, quality ramps up over transitionDuration.
   */
  enterPreview(): void {
    if (this.currentMode === 'preview') {
      logger.warn('[SmartProxyRenderer] Already in preview mode');
      return;
    }

    const previousMode = this.currentMode;

    if (this.config.progressiveTransition) {
      // Start progressive transition
      this.currentMode = 'transition';
      this.transitionTargetMode = 'preview';
      this.transitionStartTime = performance.now();
      this.transitionCurrentStep = -1;

      logger.info('[SmartProxyRenderer] Starting progressive transition to preview', {
        duration: this.config.transitionDuration,
        steps: this.transitionSteps.length,
      });
    } else {
      // Immediate switch to full preview quality
      this.currentMode = 'preview';
      this.applyPreviewMode();
    }

    this.config.onModeChange(this.currentMode, previousMode);
  }

  /**
   * Exit VR preview and return to proxy editing mode.
   */
  exitPreview(): void {
    if (this.currentMode === 'proxy') {
      logger.warn('[SmartProxyRenderer] Already in proxy mode');
      return;
    }

    const previousMode = this.currentMode;
    this.currentMode = 'proxy';

    this.applyProxyMode();

    this.config.onModeChange(this.currentMode, previousMode);

    logger.info('[SmartProxyRenderer] Returned to proxy mode', {
      proxyTier: this.config.proxyTier,
    });
  }

  /**
   * Set proxy quality tier (changes quality during editing)
   */
  setProxyTier(tier: ProxyQualityTier): void {
    this.config.proxyTier = tier;

    if (this.currentMode === 'proxy') {
      this.applyProxyMode();
    }

    logger.info('[SmartProxyRenderer] Proxy tier changed', { tier });
  }

  /**
   * Set preview quality preset
   */
  setPreviewQuality(preset: QualityPreset): void {
    this.config.previewQuality = preset;

    if (this.currentMode === 'preview') {
      this.applyPreviewMode();
    }

    logger.info('[SmartProxyRenderer] Preview quality changed', { preset });
  }

  // ===========================================================================
  // PROXY MODE
  // ===========================================================================

  /**
   * Apply proxy mode settings for fast editing
   */
  private applyProxyMode(): void {
    const proxySettings = PROXY_TIER_SETTINGS[this.config.proxyTier];

    // Update quality manager
    this.qualityManager.setPreset('low', proxySettings);
    this.qualityManager.setAdaptiveQuality(false);

    // Disable post-processing
    if (this.postProcessing) {
      this.postProcessing.setEnabled(false);
    }

    // Reduce pixel ratio
    this.renderer.setPixelRatio(proxySettings.pixelRatio ?? 0.75);

    // Simplify shadows
    this.renderer.shadowMap.enabled = proxySettings.shadowsEnabled ?? false;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;

    // Disable tone mapping for speed
    this.renderer.toneMapping = THREE.NoToneMapping;

    // Swap materials to proxy versions
    this.applyProxyMaterials();

    // Add wireframe overlays if enabled
    if (this.config.proxyWireframeOverlay) {
      this.addWireframeOverlays();
    }

    // Setup proxy render target for resolution downscaling
    this.setupProxyRenderTarget();

    logger.info('[SmartProxyRenderer] Proxy mode applied', {
      tier: this.config.proxyTier,
      shadows: proxySettings.shadowsEnabled,
      materialType: proxySettings.materialType,
    });
  }

  /**
   * Setup proxy render target for rendering at reduced resolution
   */
  private setupProxyRenderTarget(): void {
    if (this.currentMode !== 'proxy' && this.currentMode !== 'transition') return;

    const scale = this.config.proxyResolutionScale;
    const width = Math.max(1, Math.floor(this.canvas.width * scale));
    const height = Math.max(1, Math.floor(this.canvas.height * scale));

    // Dispose old target
    if (this.proxyRenderTarget) {
      this.proxyRenderTarget.dispose();
    }

    this.proxyRenderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // Create fullscreen quad for displaying the low-res render
    if (!this.proxyScene) {
      this.proxyScene = new THREE.Scene();
      this.proxyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const quadGeometry = new THREE.PlaneGeometry(2, 2);
      const quadMaterial = new THREE.MeshBasicMaterial({
        map: this.proxyRenderTarget.texture,
        depthTest: false,
        depthWrite: false,
      });

      this.proxyQuad = new THREE.Mesh(quadGeometry, quadMaterial);
      this.proxyScene.add(this.proxyQuad);
    } else if (this.proxyQuad) {
      // Update the texture reference
      (this.proxyQuad.material as THREE.MeshBasicMaterial).map = this.proxyRenderTarget.texture;
      (this.proxyQuad.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }

    logger.debug('[SmartProxyRenderer] Proxy render target created', {
      width,
      height,
      scale,
    });
  }

  /**
   * Apply simplified proxy materials to all objects
   */
  private applyProxyMaterials(): void {
    const tier = this.config.proxyTier;

    this.objectMap.forEach((obj, id) => {
      if (!(obj instanceof THREE.Mesh)) return;

      // Save preview materials if not already saved
      if (!this.previewMaterials.has(id)) {
        this.previewMaterials.set(
          id,
          Array.isArray(obj.material)
            ? obj.material.map((m) => m.clone())
            : obj.material.clone(),
        );
      }

      // Create or get proxy material
      let proxyMat = this.proxyMaterials.get(id);
      if (!proxyMat) {
        const currentMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        const color = (currentMat as THREE.MeshStandardMaterial).color?.clone() ??
          new THREE.Color(0x888888);

        if (tier === 'wireframe') {
          proxyMat = new THREE.MeshBasicMaterial({
            color,
            wireframe: true,
            transparent: true,
            opacity: 0.8,
          });
        } else if (tier === 'minimal') {
          proxyMat = new THREE.MeshBasicMaterial({ color });
        } else {
          // balanced and near-final use standard material with reduced params
          proxyMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.8,
            metalness: 0.1,
            envMapIntensity: 0,
          });
        }

        this.proxyMaterials.set(id, proxyMat);
      }

      obj.material = proxyMat;

      // Reduce geometry segments for proxy
      if (tier === 'wireframe' || tier === 'minimal') {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
  }

  /**
   * Add wireframe overlays to objects in proxy mode
   */
  private addWireframeOverlays(): void {
    this.objectMap.forEach((obj, id) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (this.wireframeOverlays.has(id)) return;

      const edges = new THREE.EdgesGeometry(obj.geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.15,
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      wireframe.name = `proxy-wireframe-${id}`;

      obj.add(wireframe);
      this.wireframeOverlays.set(id, wireframe);
    });
  }

  /**
   * Remove wireframe overlays
   */
  private removeWireframeOverlays(): void {
    this.wireframeOverlays.forEach((wireframe, id) => {
      const obj = this.objectMap.get(id);
      if (obj) {
        obj.remove(wireframe);
      }
      wireframe.geometry.dispose();
      (wireframe.material as THREE.LineBasicMaterial).dispose();
    });
    this.wireframeOverlays.clear();
  }

  // ===========================================================================
  // PREVIEW MODE
  // ===========================================================================

  /**
   * Apply full VR preview quality settings
   */
  private applyPreviewMode(): void {
    // Determine preview quality preset
    let previewPreset: Exclude<QualityPreset, 'auto'>;
    if (this.config.previewQuality === 'auto') {
      // Will be resolved by QualityManager's device detection
      previewPreset = 'high';
    } else {
      previewPreset = this.config.previewQuality;
    }

    const previewSettings = QUALITY_PRESETS[previewPreset];

    // Update quality manager
    this.qualityManager.setPreset(previewPreset);
    this.qualityManager.setAdaptiveQuality(true);

    // Full resolution rendering
    this.renderer.setPixelRatio(
      Math.min(this.config.previewResolutionScale * previewSettings.pixelRatio, window.devicePixelRatio),
    );

    // Enable shadows at full quality
    this.renderer.shadowMap.enabled = previewSettings.shadowsEnabled;
    switch (previewSettings.shadowType) {
      case 'pcf':
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        break;
      case 'pcfsoft':
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
      case 'vsm':
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        break;
      default:
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
    }

    // Enable tone mapping
    if (previewSettings.toneMapping) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
    }

    // Enable post-processing
    if (previewSettings.postProcessing) {
      if (!this.postProcessing) {
        this.postProcessing = createPostProcessingPipeline({
          renderer: this.renderer,
          scene: this.scene,
          camera: this.camera,
          qualitySettings: previewSettings,
          config: this.config.rendererConfig.postProcessing,
        });
      }
      this.postProcessing.setEnabled(true);
      this.postProcessing.applyQualitySettings(
        previewSettings,
        this.config.rendererConfig.postProcessing,
      );
    }

    // Enable environment mapping
    if (previewSettings.hdriEnvironment && !this.environmentManager) {
      this.environmentManager = createEnvironmentManager({
        scene: this.scene,
        renderer: this.renderer,
        qualitySettings: previewSettings,
        config: this.config.rendererConfig.environment,
      });
      this.environmentManager.initialize().then(() => {
        const envMap = this.environmentManager?.getEnvironmentMap();
        if (envMap) {
          this.materialFactory.setEnvironmentMap(envMap);
        }
      });
    }

    // Restore preview materials
    this.applyPreviewMaterials();

    // Remove wireframe overlays
    this.removeWireframeOverlays();

    // Enable VR if headset available
    if ('xr' in navigator && !this.vrEnabled) {
      this.renderer.xr.enabled = true;
      this.vrEnabled = true;
    }

    logger.info('[SmartProxyRenderer] Preview mode applied', {
      preset: previewPreset,
      postProcessing: previewSettings.postProcessing,
      shadows: previewSettings.shadowsEnabled,
      hdri: previewSettings.hdriEnvironment,
    });
  }

  /**
   * Restore high-quality preview materials
   */
  private applyPreviewMaterials(): void {
    const settings = this.qualityManager.getSettings();

    this.objectMap.forEach((obj, id) => {
      if (!(obj instanceof THREE.Mesh)) return;

      // Check if we have saved preview materials
      const savedMat = this.previewMaterials.get(id);
      if (savedMat) {
        obj.material = savedMat;
      }

      // Re-enable shadows
      obj.castShadow = settings.shadowsEnabled;
      obj.receiveShadow = settings.shadowsEnabled;

      // Upgrade materials if needed
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((mat) => {
          this.materialFactory.upgradeMaterial(mat);
        });
      }
    });
  }

  // ===========================================================================
  // PROGRESSIVE TRANSITION
  // ===========================================================================

  /**
   * Build the progressive transition step sequence
   */
  private buildTransitionSteps(): TransitionStep[] {
    return [
      {
        threshold: 0.0,
        label: 'resolution-boost',
        overrides: {
          pixelRatio: 0.85,
          antialiasing: 'fxaa',
          materialType: 'standard',
        },
      },
      {
        threshold: 0.2,
        label: 'shadows-enabled',
        overrides: {
          shadowsEnabled: true,
          shadowMapSize: 1024,
          shadowType: 'pcf',
        },
      },
      {
        threshold: 0.4,
        label: 'materials-upgraded',
        overrides: {
          materialType: 'physical',
          maxTextureSize: 2048,
          anisotropy: 8,
          toneMapping: true,
        },
      },
      {
        threshold: 0.6,
        label: 'environment-loaded',
        overrides: {
          hdriEnvironment: true,
          envMapResolution: 512,
          realTimeReflections: true,
        },
      },
      {
        threshold: 0.8,
        label: 'post-processing-enabled',
        overrides: {
          postProcessing: true,
          bloom: true,
          ssao: true,
          antialiasing: 'smaa',
        },
      },
      {
        threshold: 1.0,
        label: 'full-quality',
        overrides: {
          pixelRatio: 1.0,
          maxPolyCount: 500000,
          lodBias: 0.5,
        },
      },
    ];
  }

  /**
   * Update the progressive transition (called in render loop)
   */
  private updateTransition(): void {
    if (this.currentMode !== 'transition') return;

    const elapsed = performance.now() - this.transitionStartTime;
    const progress = Math.min(elapsed / this.config.transitionDuration, 1.0);

    // Apply transition steps that have been reached
    for (let i = 0; i < this.transitionSteps.length; i++) {
      const step = this.transitionSteps[i];

      if (progress >= step.threshold && i > this.transitionCurrentStep) {
        this.transitionCurrentStep = i;
        this.applyTransitionStep(step);

        logger.debug('[SmartProxyRenderer] Transition step applied', {
          step: step.label,
          progress: Math.round(progress * 100) + '%',
        });
      }
    }

    // Transition complete
    if (progress >= 1.0) {
      const previousMode = this.currentMode;
      this.currentMode = this.transitionTargetMode;

      if (this.transitionTargetMode === 'preview') {
        this.applyPreviewMode();
      }

      this.config.onTransitionComplete(this.currentMode);
      this.config.onModeChange(this.currentMode, previousMode);

      logger.info('[SmartProxyRenderer] Transition complete', {
        mode: this.currentMode,
        duration: elapsed.toFixed(0) + 'ms',
      });
    }
  }

  /**
   * Apply a single transition step's quality overrides
   */
  private applyTransitionStep(step: TransitionStep): void {
    this.qualityManager.applyOverrides(step.overrides);
    this.qualityManager.applyToRenderer(this.renderer);
    this.materialFactory.setQualitySettings(this.qualityManager.getSettings());

    // Handle specific step effects
    if (step.overrides.postProcessing && !this.postProcessing) {
      this.postProcessing = createPostProcessingPipeline({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        qualitySettings: this.qualityManager.getSettings(),
        config: this.config.rendererConfig.postProcessing,
      });
    }

    if (step.overrides.postProcessing && this.postProcessing) {
      this.postProcessing.setEnabled(true);
    }

    if (step.overrides.hdriEnvironment && !this.environmentManager) {
      this.environmentManager = createEnvironmentManager({
        scene: this.scene,
        renderer: this.renderer,
        qualitySettings: this.qualityManager.getSettings(),
        config: this.config.rendererConfig.environment,
      });
      this.environmentManager.initialize();
    }

    // Progressively restore materials from proxy to preview
    if (step.overrides.materialType === 'physical' || step.overrides.materialType === 'standard') {
      this.applyPreviewMaterials();
      this.removeWireframeOverlays();
    }

    // Update pixel ratio
    if (step.overrides.pixelRatio !== undefined) {
      this.renderer.setPixelRatio(
        Math.min(step.overrides.pixelRatio, window.devicePixelRatio),
      );
    }
  }

  // ===========================================================================
  // RENDER LOOP
  // ===========================================================================

  /**
   * Start the render loop
   */
  start(): void {
    if (this.animationId !== null) {
      logger.warn('[SmartProxyRenderer] Already running');
      return;
    }

    // Apply initial proxy mode
    this.applyProxyMode();

    logger.info('[SmartProxyRenderer] Starting render loop in proxy mode');

    const animate = (time: number) => {
      // Calculate delta
      const deltaMs = time - (this.lastFrameTime || time);
      this.lastFrameTime = time;

      // Track frame times
      this.frameTimeHistory.push(deltaMs);
      if (this.frameTimeHistory.length > this.FRAME_HISTORY_SIZE) {
        this.frameTimeHistory.shift();
      }

      // Record frame time for adaptive quality (only in preview mode)
      if (this.currentMode === 'preview') {
        this.qualityManager.recordFrameTime(deltaMs);
      }

      // Handle XR loop
      if ((this.renderer.xr as unknown as { isPresenting: boolean }).isPresenting) {
        this.renderer.setAnimationLoop(animate);
        this.animationId = -1;
      } else {
        this.animationId = requestAnimationFrame(animate) as unknown as number;
      }

      // Update transition if active
      this.updateTransition();

      // Sync world to scene
      this.syncWorldToScene();

      // Render based on current mode
      this.renderFrame();

      // Emit metrics during preview
      if (this.currentMode === 'preview' || this.currentMode === 'transition') {
        this.emitMetrics();
      }
    };

    animate(performance.now());
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    if (this.animationId !== null) {
      if ((this.renderer.xr as unknown as { isPresenting: boolean }).isPresenting) {
        this.renderer.setAnimationLoop(null);
      } else {
        cancelAnimationFrame(this.animationId);
      }
      this.animationId = null;
      logger.info('[SmartProxyRenderer] Stopped');
    }
  }

  /**
   * Render a frame based on current mode
   */
  private renderFrame(): void {
    switch (this.currentMode) {
      case 'proxy':
        this.renderProxy();
        break;
      case 'transition':
        this.renderTransition();
        break;
      case 'preview':
        this.renderPreview();
        break;
    }
  }

  /**
   * Render in proxy mode (reduced resolution with render target)
   */
  private renderProxy(): void {
    if (this.proxyRenderTarget && this.proxyScene && this.proxyCamera) {
      // Render scene at reduced resolution to render target
      this.renderer.setRenderTarget(this.proxyRenderTarget);
      this.renderer.render(this.scene, this.camera);

      // Display the low-res result full screen
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.proxyScene, this.proxyCamera);
    } else {
      // Fallback: direct render at reduced pixel ratio
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Render during transition (direct render with increasing quality)
   */
  private renderTransition(): void {
    // During transition, render directly (quality is being ramped up)
    if (this.postProcessing && this.postProcessing.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Render in full VR preview mode
   */
  private renderPreview(): void {
    if (this.postProcessing && this.postProcessing.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Emit current preview metrics
   */
  private emitMetrics(): void {
    const metrics = this.getPreviewMetrics();
    this.config.onPreviewMetrics(metrics);
  }

  /**
   * Get current preview metrics
   */
  getPreviewMetrics(): PreviewMetrics {
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 0;

    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    // LOD distribution
    let lod0 = 0;
    let lod1 = 0;
    let lod2 = 0;

    this.objectMap.forEach((obj) => {
      const lodLevel = obj.userData?.lodLevel ?? 0;
      if (lodLevel === 0) lod0++;
      else if (lodLevel === 1) lod1++;
      else lod2++;
    });

    // Estimate GPU memory
    let memoryEstimate = 0;
    this.objectMap.forEach((obj) => {
      if (obj instanceof THREE.Mesh) {
        const geo = obj.geometry;
        if (geo) {
          const posAttr = geo.getAttribute('position');
          if (posAttr) {
            memoryEstimate += posAttr.array.byteLength;
          }
        }
      }
    });

    // Transition progress
    let transitionProgress = this.currentMode === 'preview' ? 1.0 : 0.0;
    if (this.currentMode === 'transition') {
      const elapsed = performance.now() - this.transitionStartTime;
      transitionProgress = Math.min(elapsed / this.config.transitionDuration, 1.0);
    }

    const renderSize = new THREE.Vector2();
    this.renderer.getSize(renderSize);

    return {
      fps: Math.round(fps * 10) / 10,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      qualityPreset: this.qualityManager.getPreset(),
      adaptiveActive: this.currentMode === 'preview',
      transitionProgress,
      lodDistribution: { lod0, lod1, lod2 },
      renderResolution: {
        width: Math.round(renderSize.x),
        height: Math.round(renderSize.y),
      },
      postProcessingEnabled: this.postProcessing?.isEnabled() ?? false,
      estimatedGPUMemoryMB: Math.round((memoryEstimate / (1024 * 1024)) * 100) / 100,
    };
  }

  // ===========================================================================
  // WORLD SYNC
  // ===========================================================================

  /**
   * Setup world event listeners
   */
  private setupWorldSync(): void {
    this.world.getAllObjects().forEach((obj) => this.addObjectToScene(obj));

    this.world.on('object:added', (event) => {
      const obj = this.world.getObject(event.data.objectId);
      if (obj) this.addObjectToScene(obj);
    });

    this.world.on('object:removed', (event) => {
      this.removeObjectFromScene(event.data.objectId);
    });
  }

  /**
   * Add a world object to the scene with appropriate materials for current mode
   */
  private addObjectToScene(obj: { id: string; type: string; getScale: () => { x: number; y: number; z: number }; getPosition: () => { x: number; y: number; z: number }; getRotation: () => { x: number; y: number; z: number; w: number }; getMetadata: () => Record<string, any>; isVisible: () => boolean }): void {
    const scale = obj.getScale();
    const metadata = obj.getMetadata();
    const segments = this.currentMode === 'proxy' ? this.config.proxyMaxSegments : 32;

    // Create geometry
    let geometry: THREE.BufferGeometry;
    switch (obj.type) {
      case 'sphere':
      case 'orb':
        geometry = new THREE.SphereGeometry(scale.x / 2, segments, segments);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(scale.x / 2, scale.x / 2, scale.y, segments);
        break;
      case 'cube':
      case 'box':
      case 'platform':
      case 'floor':
      default:
        geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
        break;
    }

    // Create material based on current mode
    const color = metadata.color ? new THREE.Color(metadata.color) : new THREE.Color(0x00ffff);
    let material: THREE.Material;

    if (this.currentMode === 'proxy') {
      const tier = this.config.proxyTier;
      if (tier === 'wireframe') {
        material = new THREE.MeshBasicMaterial({
          color,
          wireframe: true,
          transparent: true,
          opacity: 0.8,
        });
      } else if (tier === 'minimal') {
        material = new THREE.MeshBasicMaterial({ color });
      } else {
        material = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.8,
          metalness: 0.1,
        });
      }
      this.proxyMaterials.set(obj.id, material);
    } else {
      material = this.materialFactory.create({
        color: color.getHex(),
        metalness: metadata.metalness ?? 0.3,
        roughness: metadata.roughness ?? 0.7,
        emissive: metadata.glow ? color.getHex() : 0x000000,
        emissiveIntensity: metadata.glow ? 0.3 : 0,
      });
      this.previewMaterials.set(obj.id, material);
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = obj.id;

    // Shadows only in preview mode
    const settings = this.qualityManager.getSettings();
    mesh.castShadow = this.currentMode !== 'proxy' && settings.shadowsEnabled;
    mesh.receiveShadow = this.currentMode !== 'proxy' && settings.shadowsEnabled;

    // Set transform
    const pos = obj.getPosition();
    mesh.position.set(pos.x, pos.y, pos.z);
    const rot = obj.getRotation();
    mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

    this.objectMap.set(obj.id, mesh);
    this.scalingRoot.add(mesh);

    // Add wireframe overlay in proxy mode
    if (this.currentMode === 'proxy' && this.config.proxyWireframeOverlay) {
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.15,
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      mesh.add(wireframe);
      this.wireframeOverlays.set(obj.id, wireframe);
    }
  }

  /**
   * Remove object from scene
   */
  private removeObjectFromScene(objectId: string): void {
    const mesh = this.objectMap.get(objectId);
    if (mesh) {
      this.scalingRoot.remove(mesh);
      this.objectMap.delete(objectId);
      this.proxyMaterials.delete(objectId);
      this.previewMaterials.delete(objectId);

      // Clean up wireframe overlay
      const wireframe = this.wireframeOverlays.get(objectId);
      if (wireframe) {
        wireframe.geometry.dispose();
        (wireframe.material as THREE.LineBasicMaterial).dispose();
        this.wireframeOverlays.delete(objectId);
      }
    }
  }

  /**
   * Sync world state to Three.js scene
   */
  private syncWorldToScene(): void {
    for (const [objectId, mesh] of this.objectMap.entries()) {
      const obj = this.world.getObject(objectId);
      if (!obj) continue;

      const pos = obj.getPosition();
      mesh.position.set(pos.x, pos.y, pos.z);

      const rot = obj.getRotation();
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

      const scale = obj.getScale();
      mesh.scale.set(scale.x, scale.y, scale.z);

      mesh.visible = obj.isVisible();
    }
  }

  // ===========================================================================
  // LIGHTING
  // ===========================================================================

  /**
   * Setup simple proxy lighting (minimal cost)
   */
  private setupProxyLighting(): void {
    // Simple ambient + directional (no shadows in proxy)
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    ambient.name = 'proxy-ambient';
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.7);
    directional.name = 'proxy-directional';
    directional.position.set(10, 20, 10);
    directional.castShadow = false;
    this.scene.add(directional);
  }

  // ===========================================================================
  // VR SUPPORT
  // ===========================================================================

  /**
   * Setup VR button and auto-enter support
   */
  private setupVRSupport(): void {
    if (!('xr' in navigator)) return;

    // Create VR button but don't enable XR yet (proxy mode)
    this.vrButton = VRButton.createButton(this.renderer);
    this.vrButton.style.display = 'none'; // Hidden until preview mode

    document.body.appendChild(this.vrButton);

    // Auto-enter preview when VR session starts
    if (this.config.autoEnterVRPreview) {
      this.renderer.xr.addEventListener('sessionstart', () => {
        if (this.currentMode === 'proxy') {
          logger.info('[SmartProxyRenderer] VR session started, entering preview mode');
          this.enterPreview();
        }
      });

      this.renderer.xr.addEventListener('sessionend', () => {
        logger.info('[SmartProxyRenderer] VR session ended, returning to proxy mode');
        this.exitPreview();
      });
    }
  }

  /**
   * Show/hide the VR button
   */
  showVRButton(visible: boolean): void {
    if (this.vrButton) {
      this.vrButton.style.display = visible ? 'block' : 'none';
    }
  }

  // ===========================================================================
  // QUALITY CHANGE HANDLER
  // ===========================================================================

  /**
   * Handle quality changes from QualityManager
   */
  private onQualityChange(
    settings: QualitySettings,
    preset: Exclude<QualityPreset, 'auto'>,
  ): void {
    logger.info('[SmartProxyRenderer] Quality changed', { preset, mode: this.currentMode });

    this.qualityManager.applyToRenderer(this.renderer);
    this.materialFactory.setQualitySettings(settings);

    if (this.environmentManager) {
      this.environmentManager.setQualitySettings(settings);
    }

    if (this.postProcessing) {
      this.postProcessing.applyQualitySettings(settings, this.config.rendererConfig.postProcessing);
    }
  }

  // ===========================================================================
  // THREE.JS ACCESS
  // ===========================================================================

  /** Get the Three.js scene */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /** Get the Three.js camera */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /** Get the Three.js renderer */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /** Get the quality manager */
  getQualityManager(): QualityManager {
    return this.qualityManager;
  }

  /** Get the material factory */
  getMaterialFactory(): MaterialFactory {
    return this.materialFactory;
  }

  /** Get the post-processing pipeline (null if not initialized) */
  getPostProcessing(): PostProcessingPipeline | null {
    return this.postProcessing;
  }

  /** Get the environment manager (null if not initialized) */
  getEnvironmentManager(): EnvironmentManager | null {
    return this.environmentManager;
  }

  // ===========================================================================
  // RESIZE
  // ===========================================================================

  /**
   * Handle window resize
   */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    // Resize proxy render target
    if (this.currentMode === 'proxy') {
      this.setupProxyRenderTarget();
    }

    // Resize post-processing
    if (this.postProcessing) {
      this.postProcessing.setSize(width, height);
    }
  }

  // ===========================================================================
  // DISPOSE
  // ===========================================================================

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stop();

    // Dispose proxy resources
    if (this.proxyRenderTarget) {
      this.proxyRenderTarget.dispose();
    }
    if (this.proxyQuad) {
      this.proxyQuad.geometry.dispose();
      (this.proxyQuad.material as THREE.Material).dispose();
    }

    // Dispose wireframe overlays
    this.removeWireframeOverlays();

    // Dispose proxy materials
    this.proxyMaterials.forEach((mat) => {
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    });
    this.proxyMaterials.clear();

    // Dispose preview materials
    this.previewMaterials.forEach((mat) => {
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    });
    this.previewMaterials.clear();

    // Dispose object map
    this.objectMap.forEach((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
      }
    });
    this.objectMap.clear();

    // Dispose renderer
    this.renderer.dispose();

    // Remove VR button
    if (this.vrButton && this.vrButton.parentElement) {
      this.vrButton.parentElement.removeChild(this.vrButton);
    }

    logger.info('[SmartProxyRenderer] Disposed');
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a SmartProxyRenderer instance
 */
export function createSmartProxyRenderer(
  canvas: HTMLCanvasElement,
  world: HololandWorld,
  config?: SmartProxyConfig,
): SmartProxyRenderer {
  return new SmartProxyRenderer(canvas, world, config);
}

/**
 * Proxy tier presets with descriptions
 */
export const PROXY_TIER_DESCRIPTIONS: Record<ProxyQualityTier, string> = {
  wireframe: 'Wireframe only - fastest editing, minimal GPU usage. Objects shown as transparent wireframes.',
  minimal: 'Basic materials, no shadows - fast editing with solid object visibility.',
  balanced: 'Standard materials, basic shadows - good editing experience with decent visual quality.',
  'near-final': 'Near-preview quality - slower editing but accurate visual representation.',
};

/**
 * Get proxy tier settings (for external inspection)
 */
export function getProxyTierSettings(tier: ProxyQualityTier): Readonly<Partial<QualitySettings>> {
  return { ...PROXY_TIER_SETTINGS[tier] };
}
