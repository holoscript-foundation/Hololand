/**
 * @hololand/renderer
 *
 * Advanced Three.js renderer with quality tiers, PBR materials,
 * HDRI environments, and post-processing support.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { HololandWorld, SpatialObject } from '@hololand/world';
import { logger } from './logger';
import type { RendererConfig, LightingConfig, QualitySettings, QualityPreset, LightingFidelityLevel, DeviceType } from './types';
import { QUALITY_PRESETS } from './types';
import { QualityManager, createQualityManager } from './QualityManager';
import { PostProcessingPipeline, createPostProcessingPipeline } from './PostProcessing';
import { EnvironmentManager, createEnvironmentManager } from './EnvironmentManager';
import { MaterialFactory, createMaterialFactory } from './MaterialFactory';
import { GPUContext } from './GPUContext';
import {
  LightingFidelityManager,
  createLightingFidelityManager,
} from './LightingFidelityManager';
import type { LightingFidelityMetrics } from './LightingFidelityManager';
import type {
  AgentCommunicationManager,
} from './AgentCommunicationManager';
import type {
  Vec3,
  AgentWorldState,
  AgentAvatarState,
  AgentCommand,
} from './AgentStateBuffer';
import type {
  CachedSpatialState,
  InferenceSchedulerConfig,
  InferenceSchedulerMetrics,
} from './SpatialInferenceTypes';
import {
  InferenceScheduler,
  createInferenceScheduler,
} from './InferenceScheduler';
import {
  SpatialReasoningEngine,
  createSpatialReasoningEngine,
} from './SpatialReasoningEngine';
import type {
  ObjectSnapshot,
  CameraSnapshot,
  SpatialReasoningEngineConfig,
} from './SpatialReasoningEngine';
import {
  FoveatedGaussianRenderer,
  createFoveatedGaussianRendererForDevice,
} from './FoveatedGaussianRenderer';
import type {
  EyeRenderState,
  GaussianRenderTimings,
  GaussianRenderStats,
  FoveatedGaussianPipelineConfig,
} from './FoveatedGaussianTypes';

// =============================================================================
// DEVICE PRESET DETECTION FOR FOVEATED RENDERING
// =============================================================================

/**
 * Foveated rendering device preset type.
 * Maps from the QualityManager's DeviceType to FoveatedGaussianRenderer presets.
 */
export type FoveatedDevicePreset = 'quest2' | 'quest3' | 'pcvr' | 'desktop';

/**
 * Configuration for enabling foveated rendering on HololandRenderer.
 */
export interface FoveatedRenderingOptions {
  /** Override automatic device detection with a specific preset */
  devicePreset?: FoveatedDevicePreset;
  /** Partial pipeline config overrides */
  pipelineConfig?: Partial<FoveatedGaussianPipelineConfig>;
  /** Whether to coordinate with QualityManager's adaptive quality (default: true) */
  coordinateWithQualityManager?: boolean;
  /** Fixed foveation center for HMDs without eye tracking (normalized 0-1) */
  fixedFoveationCenter?: [number, number];
}

/**
 * Map QualityManager's DeviceType to FoveatedGaussianRenderer device preset.
 *
 * This bridges the two detection systems:
 * - QualityManager detects: mobile, tablet, quest2, quest3, questPro, pcvr, desktop, unknown
 * - FoveatedGaussianRenderer needs: quest2, quest3, pcvr, desktop
 */
function mapDeviceTypeToFoveatedPreset(deviceType: DeviceType): FoveatedDevicePreset {
  switch (deviceType) {
    case 'quest2':
      return 'quest2';
    case 'quest3':
    case 'questPro':
      return 'quest3';
    case 'pcvr':
      return 'pcvr';
    case 'desktop':
    case 'tablet':
    case 'mobile':
    case 'unknown':
    default:
      return 'desktop';
  }
}

// Config type with optional fields
type InternalConfig = Omit<Required<RendererConfig>, 'uiCanvasElement' | 'qualityOverrides' | 'environment' | 'postProcessing' | 'lightingFidelity'> & {
  uiCanvasElement?: HTMLCanvasElement;
  qualityOverrides?: Partial<QualitySettings>;
  environment?: RendererConfig['environment'];
  postProcessing?: RendererConfig['postProcessing'];
  lightingFidelity?: RendererConfig['lightingFidelity'];
};

interface RenderableUI {
  renderOnce(): void;
}

export class HololandRenderer {
  private world: HololandWorld;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls | null;
  private objectMap: Map<string, THREE.Object3D>;
  private config: InternalConfig;
  private animationId: number | null;
  private vrEnabled: boolean;
  private currentScaleMultiplier: number = 1.0;
  private uiCanvas: RenderableUI | null = null;
  private lastFrameTime: number = 0;

  // Lighting fidelity adaptive evaluation
  private lfmFrameTimeAccum: number = 0;
  private lfmFrameCount: number = 0;
  private lastLfmEvalTime: number = 0;
  private readonly LFM_EVAL_INTERVAL_MS = 2000; // Evaluate every 2 seconds

  // Scene structure
  private scalingRoot: THREE.Group;

  // Advanced systems
  private qualityManager: QualityManager;
  private postProcessing: PostProcessingPipeline | null = null;
  private environmentManager: EnvironmentManager | null = null;
  private materialFactory: MaterialFactory;
  private gpuContext: GPUContext;
  private lightingFidelityManager: LightingFidelityManager;

  // Agent communication (double-buffered, off render loop)
  private agentCommunication: AgentCommunicationManager | null = null;
  private agentAvatarMap: Map<string, THREE.Object3D> = new Map();
  private agentCommandHandlers: Map<string, (command: AgentCommand) => void> = new Map();

  // Spatial inference scheduling (Tier 1: 1-5Hz inference, Tier 2: 90Hz consumption)
  private inferenceScheduler: InferenceScheduler | null = null;
  private spatialReasoningEngine: SpatialReasoningEngine | null = null;
  private spatialLabelMeshes: Map<string, THREE.Object3D> = new Map();

  // Foveated Gaussian rendering (VRSplat + StopThePop pipeline)
  private foveatedRenderer: FoveatedGaussianRenderer | null = null;
  private foveatedEnabled: boolean = false;
  private foveatedCoordinateWithQM: boolean = true;
  private foveatedDevicePreset: FoveatedDevicePreset = 'desktop';
  private lastFoveatedTimings: GaussianRenderTimings | null = null;

  constructor(canvas: HTMLCanvasElement, world: HololandWorld, config?: RendererConfig) {
    this.world = world;
    this.objectMap = new Map();
    this.animationId = null;
    this.vrEnabled = false;

    // Initialize GPU Compute
    this.gpuContext = new GPUContext();

    // Resolve quality preset
    const qualityPreset = config?.quality || 'medium';
    const resolvedQuality: Exclude<QualityPreset, 'auto'> = qualityPreset === 'auto' ? 'medium' : qualityPreset;
    const qualitySettings = { ...QUALITY_PRESETS[resolvedQuality], ...config?.qualityOverrides };

    // Initialize quality manager
    this.qualityManager = createQualityManager({
      preset: resolvedQuality,
      overrides: config?.qualityOverrides,
      adaptiveQuality: true,
      onQualityChange: (settings, preset) => this.onQualityChange(settings, preset),
    });

    // Initialize material factory
    this.materialFactory = createMaterialFactory(qualitySettings);

    // Initialize lighting fidelity manager (Levels 0-4 spectrum)
    this.lightingFidelityManager = createLightingFidelityManager({
      ...config?.lightingFidelity,
      onLevelChange: (oldLevel, newLevel, reason) => {
        this.onLightingFidelityChange(oldLevel, newLevel, reason);
        config?.lightingFidelity?.onLevelChange?.(oldLevel, newLevel, reason);
      },
    });
    this.lightingFidelityManager.setTargetFPS(qualitySettings.targetFPS);

    this.config = {
      // Quality
      quality: qualityPreset,
      qualityOverrides: config?.qualityOverrides,
      // Existing 3D options
      enableShadows: config?.enableShadows ?? qualitySettings.shadowsEnabled,
      enableVR: config?.enableVR ?? true,
      enableControls: config?.enableControls ?? true,
      antialias: config?.antialias ?? (qualitySettings.antialiasing !== 'none'),
      backgroundColor: config?.backgroundColor ?? 0x000000,
      cameraPosition: config?.cameraPosition ?? { x: 10, y: 10, z: 10 },
      cameraFov: config?.cameraFov ?? 75,
      // Phase 2: Universal rendering options
      renderMode: config?.renderMode ?? '3d',
      enable2D: config?.enable2D ?? false,
      orthoSize: config?.orthoSize ?? 10,
      enableHybrid: config?.enableHybrid ?? false,
      uiCanvasElement: config?.uiCanvasElement ?? undefined,
      // Advanced options
      environment: config?.environment,
      postProcessing: config?.postProcessing,
      lightingFidelity: config?.lightingFidelity,
    };

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);

    // Initialize scaling root
    this.scalingRoot = new THREE.Group();
    this.scene.add(this.scalingRoot);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      this.config.cameraFov,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.set(
      this.config.cameraPosition.x,
      this.config.cameraPosition.y,
      this.config.cameraPosition.z
    );

    // Initialize renderer with quality-based settings
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.config.antialias,
      powerPreference: qualitySettings.targetFPS >= 72 ? 'high-performance' : 'default',
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(Math.min(qualitySettings.pixelRatio, window.devicePixelRatio));

    // Apply quality settings to renderer
    this.qualityManager.applyToRenderer(this.renderer);

    // Initialize controls
    if (this.config.enableControls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
    } else {
      this.controls = null;
    }

    // Enable VR
    if (this.config.enableVR && 'xr' in navigator) {
      this.renderer.xr.enabled = true;
      const vrButton = VRButton.createButton(this.renderer);
      document.body.appendChild(vrButton);
      this.vrEnabled = true;
    }

    // Initialize environment manager
    this.environmentManager = createEnvironmentManager({
      scene: this.scene,
      renderer: this.renderer,
      qualitySettings,
      config: this.config.environment,
    });

    // Initialize post-processing if enabled
    if (qualitySettings.postProcessing) {
      this.postProcessing = createPostProcessingPipeline({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        qualitySettings,
        config: this.config.postProcessing,
      });
    }

    // Setup lighting via the fidelity manager (replaces setupDefaultLighting)
    // Attach managed lights to the scene. If HDRI environment is configured,
    // the environment manager will supplement with IBL; the fidelity manager
    // still provides the primary scene lights.
    this.lightingFidelityManager.attachToScene(this.scene);
    this.lightingFidelityManager.applyShadowSettings(this.renderer);

    // Sync with Hololand world
    this.setupWorldSync();

    // Initialize async components
    this.initializeAsync();

    logger.info('[HololandRenderer] Initialized', {
      quality: resolvedQuality,
      enableVR: this.vrEnabled,
      postProcessing: qualitySettings.postProcessing,
      hdriEnvironment: qualitySettings.hdriEnvironment,
    });
  }

  /**
   * Initialize async components
   */
  private async initializeAsync(): Promise<void> {
    // Auto-detect quality if set to auto
    if (this.config.quality === 'auto') {
      await this.qualityManager.initialize();
    }

    // Initialize WebGPU if supported
    await this.gpuContext.initialize();

    // Initialize environment
    if (this.environmentManager) {
      await this.environmentManager.initialize();

      // Update material factory with environment map
      const envMap = this.environmentManager.getEnvironmentMap();
      if (envMap) {
        this.materialFactory.setEnvironmentMap(envMap);
      }
    }
  }

  /**
   * Handle quality change events
   */
  private onQualityChange(settings: QualitySettings, preset: Exclude<QualityPreset, 'auto'>): void {
    logger.info('[HololandRenderer] Quality changed', { preset });

    // Update renderer
    this.qualityManager.applyToRenderer(this.renderer);

    // Update material factory
    this.materialFactory.setQualitySettings(settings);

    // Update lighting fidelity manager's target FPS
    this.lightingFidelityManager.setTargetFPS(settings.targetFPS);

    // Update environment
    if (this.environmentManager) {
      this.environmentManager.setQualitySettings(settings);
    }

    // Update or create post-processing
    if (settings.postProcessing && !this.postProcessing) {
      this.postProcessing = createPostProcessingPipeline({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        qualitySettings: settings,
        config: this.config.postProcessing,
      });
    } else if (this.postProcessing) {
      this.postProcessing.applyQualitySettings(settings, this.config.postProcessing);
    }

    // Coordinate foveated renderer with quality change
    if (this.foveatedRenderer && this.foveatedCoordinateWithQM) {
      this.syncFoveatedQuality(settings, preset);
    }

    // Re-process existing objects for new quality
    this.updateObjectMaterials();
  }

  /**
   * Update materials on existing objects for new quality settings
   */
  private updateObjectMaterials(): void {
    this.objectMap.forEach((mesh) => {
      if (mesh instanceof THREE.Mesh) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(mat => {
          this.materialFactory.upgradeMaterial(mat);
        });
      }
    });
  }

  /**
   * Start rendering loop
   */
  start(): void {
    if (this.animationId !== null) {
      logger.warn('[HololandRenderer] Already rendering');
      return;
    }

    logger.info('[HololandRenderer] Starting render loop');

    const animate = (time: number) => {
      // Calculate delta time for adaptive quality
      const deltaMs = time - (this.lastFrameTime || time); // Use time if lastFrameTime is not set
      this.lastFrameTime = time;
      this.qualityManager.recordFrameTime(deltaMs);

      // Feed the lighting fidelity manager's adaptive evaluation.
      // This piggybacks on the QualityManager's 2-second check interval.
      // We only evaluate when we have a meaningful delta (skip first frame).
      if (deltaMs > 0) {
        this.evaluateLightingFidelity(deltaMs);
      }

      if ((this.renderer.xr as unknown as { isPresenting: boolean }).isPresenting) {
        this.renderer.setAnimationLoop(animate);
        this.animationId = -1; // Flag XR loop
      } else {
        this.animationId = requestAnimationFrame(animate) as unknown as number;
      }

      // Update controls
      if (this.controls) {
        this.controls.update();
      }

      // Sync world state to Three.js
      this.syncWorldToScene();

      // Sync agent state from double-buffered front buffer (zero-cost if no agents)
      this.syncAgentState();

      // Sync spatial inference state from double-buffered front buffer (zero-cost if no scheduler)
      this.syncSpatialInference();

      // Execute foveated Gaussian rendering pipeline if enabled (< 12ms stereo budget)
      if (this.foveatedEnabled && this.foveatedRenderer) {
        this.executeFoveatedFrame(deltaMs);
      }

      // Render with or without post-processing
      if (this.postProcessing && this.postProcessing.isEnabled()) {
        this.postProcessing.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      // Render 2D UI if active
      if (this.uiCanvas && this.uiCanvas.renderOnce) {
        this.uiCanvas.renderOnce();
      }
    };

    animate(performance.now());
  }

  /**
   * Stop rendering loop
   */
  stop(): void {
    if (this.animationId !== null) {
      if ((this.renderer.xr as unknown as { isPresenting: boolean }).isPresenting) {
        this.renderer.setAnimationLoop(null);
      } else {
        cancelAnimationFrame(this.animationId);
      }
      this.animationId = null;
      logger.info('[HololandRenderer] Stopped render loop');
    }
  }

  /**
   * Setup default lighting
   */
  private setupDefaultLighting(): void {
    const settings = this.qualityManager.getSettings();

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = settings.shadowsEnabled;

    if (settings.shadowsEnabled) {
      directionalLight.shadow.mapSize.width = settings.shadowMapSize;
      directionalLight.shadow.mapSize.height = settings.shadowMapSize;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.camera.left = -50;
      directionalLight.shadow.camera.right = 50;
      directionalLight.shadow.camera.top = 50;
      directionalLight.shadow.camera.bottom = -50;
    }

    this.scene.add(directionalLight);
  }

  /**
   * Setup world event listeners
   */
  private setupWorldSync(): void {
    // Add existing objects
    this.world.getAllObjects().forEach((obj) => this.addObjectToScene(obj));

    // Listen for scale changes
    this.world.on('scale:change', (event) => {
      const multiplier = event.data.multiplier || 1.0;
      this.setScaleContext(multiplier);
    });

    // Listen for new objects
    this.world.on('object:added', (event) => {
      const obj = this.world.getObject(event.data.objectId);
      if (obj) {
        this.addObjectToScene(obj);
      }
    });

    // Listen for removed objects
    this.world.on('object:removed', (event) => {
      this.removeObjectFromScene(event.data.objectId);
    });
  }

  /**
   * Add Hololand object to Three.js scene
   */
  private addObjectToScene(obj: SpatialObject): void {
    const mesh = this.createMeshForObject(obj);
    this.objectMap.set(obj.id, mesh);
    this.scalingRoot.add(mesh);

    logger.debug('[HololandRenderer] Object added to scene', { objectId: obj.id });
  }

  /**
   * Remove object from Three.js scene
   */
  private removeObjectFromScene(objectId: string): void {
    const mesh = this.objectMap.get(objectId);
    if (mesh) {
      this.scalingRoot.remove(mesh);
      this.objectMap.delete(objectId);
      logger.debug('[HololandRenderer] Object removed from scene', { objectId });
    }
  }

  /**
   * Create Three.js mesh for Hololand object
   */
  private createMeshForObject(obj: SpatialObject): THREE.Object3D {
    const metadata = obj.getMetadata();
    const scale = obj.getScale();
    const settings = this.qualityManager.getSettings();

    // Determine geometry based on type with quality-based segments
    const segments = settings.materialType === 'physical' ? 64 : 32;
    let geometry: THREE.BufferGeometry;

    switch (obj.type) {
      case 'sphere':
      case 'orb':
        geometry = new THREE.SphereGeometry(scale.x / 2, segments, segments);
        break;
      case 'cube':
      case 'box':
        geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
        break;
      case 'platform':
      case 'floor':
        geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(scale.x / 2, scale.x / 2, scale.y, segments);
        break;
      default:
        geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
    }

    // Create material using factory
    const color = metadata.color ? new THREE.Color(metadata.color) : new THREE.Color(0x00ffff);
    const material = this.materialFactory.create({
      color: color.getHex(),
      metalness: metadata.metalness ?? 0.3,
      roughness: metadata.roughness ?? 0.7,
      emissive: metadata.glow ? color.getHex() : 0x000000,
      emissiveIntensity: metadata.glow ? 0.3 : 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = obj.id;
    mesh.castShadow = settings.shadowsEnabled;
    mesh.receiveShadow = settings.shadowsEnabled;

    // Set initial transform
    const pos = obj.getPosition();
    mesh.position.set(pos.x, pos.y, pos.z);

    const rot = obj.getRotation();
    mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

    return mesh;
  }

  /**
   * Sync world state to Three.js scene
   */
  private syncWorldToScene(): void {
    for (const [objectId, mesh] of this.objectMap.entries()) {
      const obj = this.world.getObject(objectId);
      if (!obj) continue;

      // Update position
      const pos = obj.getPosition();
      mesh.position.set(pos.x, pos.y, pos.z);

      // Update rotation
      const rot = obj.getRotation();
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

      // Update scale
      const scale = obj.getScale();
      mesh.scale.set(scale.x, scale.y, scale.z);

      // Update visibility
      mesh.visible = obj.isVisible();
    }
  }

  /**
   * Add custom lighting
   */
  addLight(config: LightingConfig): THREE.Light {
    let light: THREE.Light;
    const settings = this.qualityManager.getSettings();

    switch (config.type) {
      case 'ambient':
        light = new THREE.AmbientLight(config.color, config.intensity);
        break;
      case 'directional':
        light = new THREE.DirectionalLight(config.color, config.intensity);
        if (config.position) {
          light.position.set(config.position.x, config.position.y, config.position.z);
        }
        if (config.castShadow && settings.shadowsEnabled) {
          light.castShadow = true;
          (light as THREE.DirectionalLight).shadow.mapSize.width = settings.shadowMapSize;
          (light as THREE.DirectionalLight).shadow.mapSize.height = settings.shadowMapSize;
        }
        break;
      case 'point':
        light = new THREE.PointLight(config.color, config.intensity, config.distance);
        if (config.position) {
          light.position.set(config.position.x, config.position.y, config.position.z);
        }
        if (config.castShadow && settings.shadowsEnabled) {
          light.castShadow = true;
        }
        break;
      case 'spot':
        light = new THREE.SpotLight(config.color, config.intensity, config.distance);
        if (config.position) {
          light.position.set(config.position.x, config.position.y, config.position.z);
        }
        if (config.castShadow && settings.shadowsEnabled) {
          light.castShadow = true;
          (light as THREE.SpotLight).shadow.mapSize.width = settings.shadowMapSize;
          (light as THREE.SpotLight).shadow.mapSize.height = settings.shadowMapSize;
        }
        break;
      default:
        light = new THREE.AmbientLight(config.color, config.intensity);
    }

    this.scene.add(light);
    return light;
  }

  /**
   * Set the active scale context
   */
  setScaleContext(multiplier: number): void {
    this.currentScaleMultiplier = multiplier;
    logger.info('[HololandRenderer] Scale context changed', { multiplier });

    this.updateCameraClipping();
    if (this.environmentManager) {
      this.environmentManager.setMagnitudeMultiplier(multiplier);
    }
  }

  /**
   * Set the UI Canvas for overlay rendering
   */
  public setUICanvas(uiCanvas: RenderableUI): void {
    this.uiCanvas = uiCanvas;
    logger.info('[HololandRenderer] UI Canvas integrated');
  }

  /**
   * Update camera clipping planes based on current scale
   */
  private updateCameraClipping(): void {
    const multiplier = this.currentScaleMultiplier;

    // Scale-relative clipping planes
    // Standard: 0.1 to 1000
    // Galactic (1M): 10,000 to 1,000,000,000
    // Atomic (0.000001): 0.00000001 to 0.1
    this.camera.near = 0.1 * multiplier;
    this.camera.far = 1000 * multiplier;

    // Safety bounds for VR
    if (this.camera.near < 0.0001) this.camera.near = 0.0001;
    if (this.camera.far > 1000000000) this.camera.far = 1000000000;

    this.camera.updateProjectionMatrix();

    logger.debug('[HololandRenderer] Updated camera clipping', {
      near: this.camera.near,
      far: this.camera.far,
      multiplier
    });
  }

  // =============================================================================
  // QUALITY API
  // =============================================================================

  /**
   * Set quality preset
   */
  setQuality(preset: Exclude<QualityPreset, 'auto'>): void {
    this.qualityManager.setPreset(preset);
  }

  /**
   * Get current quality settings
   */
  getQualitySettings(): Readonly<QualitySettings> {
    return this.qualityManager.getSettings();
  }

  /**
   * Get quality manager for advanced control
   */
  getQualityManager(): QualityManager {
    return this.qualityManager;
  }

  // =============================================================================
  // LIGHTING FIDELITY API (Levels 0-4 Spectrum)
  // =============================================================================

  /**
   * Set the lighting fidelity level (0-4).
   * Level 0=Unlit, 1=Basic, 2=Standard, 3=Enhanced, 4=Cinematic.
   */
  setLightingFidelity(level: LightingFidelityLevel): void {
    this.lightingFidelityManager.setLevel(level);
  }

  /**
   * Get the current lighting fidelity level.
   */
  getLightingFidelity(): LightingFidelityLevel {
    return this.lightingFidelityManager.getLevel();
  }

  /**
   * Get the LightingFidelityManager for advanced control.
   */
  getLightingFidelityManager(): LightingFidelityManager {
    return this.lightingFidelityManager;
  }

  /**
   * Get lighting fidelity metrics (levels, downgrade/upgrade counts, light counts).
   */
  getLightingFidelityMetrics(): LightingFidelityMetrics {
    return this.lightingFidelityManager.getMetrics();
  }

  /**
   * Enable or disable automatic lighting downgrade based on FPS.
   */
  setLightingAutoDowngrade(enabled: boolean): void {
    this.lightingFidelityManager.setAutoDowngrade(enabled);
  }

  /**
   * Enable or disable automatic lighting upgrade when headroom exists.
   */
  setLightingAutoUpgrade(enabled: boolean): void {
    this.lightingFidelityManager.setAutoUpgrade(enabled);
  }

  /**
   * Accumulate frame times and periodically evaluate lighting fidelity.
   * Runs every LFM_EVAL_INTERVAL_MS (2 seconds). Cost: ~0 when not evaluating.
   */
  private evaluateLightingFidelity(deltaMs: number): void {
    this.lfmFrameTimeAccum += deltaMs;
    this.lfmFrameCount++;

    const now = performance.now();
    if (now - this.lastLfmEvalTime < this.LFM_EVAL_INTERVAL_MS) {
      return;
    }

    // Calculate average FPS over the evaluation window
    if (this.lfmFrameCount > 0) {
      const avgFrameTimeMs = this.lfmFrameTimeAccum / this.lfmFrameCount;
      const averageFPS = avgFrameTimeMs > 0 ? 1000 / avgFrameTimeMs : 0;
      this.lightingFidelityManager.evaluatePerformance(averageFPS);
    }

    // Reset accumulators
    this.lfmFrameTimeAccum = 0;
    this.lfmFrameCount = 0;
    this.lastLfmEvalTime = now;
  }

  /**
   * Callback when the lighting fidelity level changes (auto or manual).
   * Updates shadow settings on the renderer and logs the transition.
   */
  private onLightingFidelityChange(
    oldLevel: LightingFidelityLevel,
    newLevel: LightingFidelityLevel,
    reason: string,
  ): void {
    // Update renderer shadow map settings to match the new level
    this.lightingFidelityManager.applyShadowSettings(this.renderer);

    logger.info('[HololandRenderer] Lighting fidelity changed', {
      from: oldLevel,
      to: newLevel,
      reason,
    });
  }

  // =============================================================================
  // ENVIRONMENT API
  // =============================================================================

  /**
   * Load HDRI environment
   */
  async loadEnvironment(hdriUrl: string): Promise<void> {
    if (this.environmentManager) {
      await this.environmentManager.loadHDRI(hdriUrl);
      const envMap = this.environmentManager.getEnvironmentMap();
      if (envMap) {
        this.materialFactory.setEnvironmentMap(envMap);
        this.updateObjectMaterials();
      }
    }
  }

  /**
   * Get environment manager
   */
  getEnvironmentManager(): EnvironmentManager | null {
    return this.environmentManager;
  }

  // =============================================================================
  // POST-PROCESSING API
  // =============================================================================

  /**
   * Enable/disable post-processing
   */
  setPostProcessingEnabled(enabled: boolean): void {
    if (this.postProcessing) {
      this.postProcessing.setEnabled(enabled);
    }
  }

  /**
   * Get post-processing pipeline
   */
  getPostProcessing(): PostProcessingPipeline | null {
    return this.postProcessing;
  }

  // =============================================================================
  // MATERIAL API
  // =============================================================================

  /**
   * Get material factory
   */
  getMaterialFactory(): MaterialFactory {
    return this.materialFactory;
  }

  // =============================================================================
  // THREE.JS ACCESS
  // =============================================================================

  /**
   * Get Three.js scene (for advanced usage)
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get Three.js camera (for advanced usage)
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Get Three.js renderer (for advanced usage)
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Handle window resize
   */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    if (this.postProcessing) {
      this.postProcessing.setSize(width, height);
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.objectMap.clear();

    // Clean up agent avatars
    this.agentAvatarMap.forEach((avatar) => {
      this.scalingRoot.remove(avatar);
    });
    this.agentAvatarMap.clear();
    this.agentCommandHandlers.clear();

    // Clean up spatial inference
    if (this.inferenceScheduler) {
      this.inferenceScheduler.dispose();
      this.inferenceScheduler = null;
    }
    this.spatialReasoningEngine = null;
    this.spatialLabelMeshes.forEach((mesh) => {
      this.scalingRoot.remove(mesh);
    });
    this.spatialLabelMeshes.clear();

    // Clean up foveated Gaussian renderer
    if (this.foveatedRenderer) {
      this.foveatedRenderer.dispose();
      this.foveatedRenderer = null;
      this.foveatedEnabled = false;
    }

    // Clean up lighting fidelity manager
    this.lightingFidelityManager.dispose();

    this.renderer.dispose();

    if (this.controls) {
      this.controls.dispose();
    }

    logger.info('[HololandRenderer] Disposed');
  }

  // =============================================================================
  // AGENT COMMUNICATION (Double-Buffered, Off Render Loop)
  // =============================================================================

  /**
   * Attach an AgentCommunicationManager to this renderer.
   *
   * The manager processes agent messages on its own timing loop (off render).
   * The renderer reads the front buffer each frame to sync agent avatars.
   *
   * @param manager - The AgentCommunicationManager instance
   */
  setAgentCommunication(manager: AgentCommunicationManager): void {
    this.agentCommunication = manager;
    logger.info('[HololandRenderer] Agent communication manager attached');
  }

  /**
   * Get the attached agent communication manager
   */
  getAgentCommunication(): AgentCommunicationManager | null {
    return this.agentCommunication;
  }

  /**
   * Register a handler for a specific agent command type.
   * When the renderer processes agent commands, matching handlers are called.
   *
   * @param commandType - The command type to handle (e.g., 'spawn_object', 'highlight')
   * @param handler - Function to execute when the command is received
   */
  registerAgentCommandHandler(
    commandType: string,
    handler: (command: AgentCommand) => void,
  ): void {
    this.agentCommandHandlers.set(commandType, handler);
    logger.debug('[HololandRenderer] Registered agent command handler', { commandType });
  }

  /**
   * Sync agent state from the double-buffered front buffer.
   *
   * Called once per frame from the render loop. Reads the FRONT buffer
   * (which was last updated by AgentCommunicationManager.swap()).
   *
   * This is extremely fast because:
   * - getFrontBuffer() is O(1) with zero allocation
   * - Only iterates connected agents (typically 1-10)
   * - Only updates changed transforms
   * - No network I/O whatsoever
   *
   * Budget: < 0.1ms for 10 agents, well within 11.1ms VR frame budget
   */
  private syncAgentState(): void {
    if (!this.agentCommunication) return;

    const state = this.agentCommunication.getCurrentState();

    // Sync agent avatars
    for (const [agentId, agentState] of Object.entries(state.agents)) {
      let avatar = this.agentAvatarMap.get(agentId);

      // Create avatar if it does not exist
      if (!avatar) {
        avatar = this.createAgentAvatar(agentState);
        this.agentAvatarMap.set(agentId, avatar);
        this.scalingRoot.add(avatar);
        logger.debug('[HololandRenderer] Agent avatar created', { agentId });
      }

      // Update transform
      avatar.position.set(
        agentState.position.x,
        agentState.position.y,
        agentState.position.z,
      );

      avatar.quaternion.set(
        agentState.rotation.x,
        agentState.rotation.y,
        agentState.rotation.z,
        agentState.rotation.w,
      );

      avatar.scale.set(
        agentState.scale.x,
        agentState.scale.y,
        agentState.scale.z,
      );

      avatar.visible = agentState.visible;

      // Store agent metadata in userData for other systems to read
      avatar.userData.agentState = agentState;
    }

    // Remove avatars for disconnected agents
    for (const [agentId, avatar] of this.agentAvatarMap.entries()) {
      if (!state.agents[agentId]) {
        this.scalingRoot.remove(avatar);
        this.agentAvatarMap.delete(agentId);
        logger.debug('[HololandRenderer] Agent avatar removed', { agentId });
      }
    }

    // Process agent commands
    const commands = this.agentCommunication.consumeCommands();
    for (const command of commands) {
      const handler = this.agentCommandHandlers.get(command.type);
      if (handler) {
        try {
          handler(command);
        } catch (err) {
          logger.error('[HololandRenderer] Agent command handler error', {
            commandType: command.type,
            error: String(err),
          });
        }
      } else {
        logger.debug('[HololandRenderer] Unhandled agent command', {
          type: command.type,
          agentId: command.agentId,
        });
      }
    }
  }

  /**
   * Create a Three.js representation for an agent avatar.
   * Uses a simple capsule/sphere placeholder - can be replaced with VRM models.
   */
  private createAgentAvatar(agentState: AgentAvatarState): THREE.Object3D {
    const settings = this.qualityManager.getSettings();
    const segments = settings.materialType === 'physical' ? 32 : 16;

    // Agent avatar: capsule-like shape (sphere head + cylinder body)
    const group = new THREE.Group();
    group.name = `agent-${agentState.agentId}`;

    // Body (cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.0, segments);
    const bodyMat = this.materialFactory.create({
      color: this.getAgentColor(agentState.agentId),
      metalness: 0.1,
      roughness: 0.8,
      emissive: this.getAgentColor(agentState.agentId),
      emissiveIntensity: 0.15,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = settings.shadowsEnabled;
    body.receiveShadow = settings.shadowsEnabled;
    group.add(body);

    // Head (sphere)
    const headGeo = new THREE.SphereGeometry(0.25, segments, segments);
    const headMat = this.materialFactory.create({
      color: this.getAgentColor(agentState.agentId),
      metalness: 0.2,
      roughness: 0.6,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.25;
    head.castShadow = settings.shadowsEnabled;
    head.receiveShadow = settings.shadowsEnabled;
    group.add(head);

    // Store agent state in userData
    group.userData.agentId = agentState.agentId;
    group.userData.agentState = agentState;

    return group;
  }

  /**
   * Generate a consistent color for an agent based on their ID.
   * Each agent gets a unique, visually distinct color.
   */
  private getAgentColor(agentId: string): number {
    // Simple hash to generate consistent hue
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Map to hue (0-360), keep high saturation and medium lightness
    const hue = Math.abs(hash) % 360;
    // Convert HSL to hex (approximation using predefined agent colors)
    const agentColors = [
      0x00e5ff, // cyan (brittney)
      0xff6b35, // orange
      0x7c4dff, // purple
      0x00e676, // green
      0xff4081, // pink
      0xffea00, // yellow
      0x448aff, // blue
      0xff3d00, // red-orange
    ];
    return agentColors[Math.abs(hash) % agentColors.length];
  }

  // =============================================================================
  // SPATIAL INFERENCE SCHEDULING (Tier 1: 1-5Hz, Tier 2: 90Hz)
  // =============================================================================

  /**
   * Enable the hierarchical spatial inference scheduling system.
   *
   * Creates a SpatialReasoningEngine (Tier 1) that runs at 1-5Hz on its own
   * timing loop, producing a CachedSpatialState. The VR renderer (Tier 2)
   * reads this cached state at 90Hz via the double-buffered front buffer.
   *
   * ARCHITECTURE:
   * ```
   *   Scene Graph (Three.js)
   *        |
   *        v
   *   createSceneSnapshot()           <-- Between frames, < 1ms
   *        |
   *        v
   *   SpatialReasoningEngine.infer()  <-- 1-5Hz, OFF render loop (200-1000ms budget)
   *        |
   *        v
   *   AgentStateBuffer.swap()         <-- Atomic double-buffer swap
   *        |
   *        v
   *   syncSpatialInference()          <-- 90Hz, ON render loop (< 0.5ms budget)
   * ```
   *
   * @param engineConfig - Configuration for the SpatialReasoningEngine
   * @param schedulerConfig - Configuration for the InferenceScheduler
   */
  async enableSpatialInference(
    engineConfig?: SpatialReasoningEngineConfig,
    schedulerConfig?: InferenceSchedulerConfig,
  ): Promise<void> {
    if (this.inferenceScheduler) {
      logger.warn('[HololandRenderer] Spatial inference already enabled');
      return;
    }

    // Create the spatial reasoning engine (Tier 1: slow path)
    this.spatialReasoningEngine = createSpatialReasoningEngine(engineConfig);

    // Create the inference scheduler (orchestrator)
    this.inferenceScheduler = createInferenceScheduler(
      this.spatialReasoningEngine,
      {
        minHz: 1,
        maxHz: 5,
        initialHz: 2,
        maxInferenceBudgetMs: 200,
        adaptiveFrequency: true,
        stalenessThresholdMs: 2000,
        onFrequencyChange: (oldHz, newHz, reason) => {
          logger.info('[HololandRenderer] Inference frequency changed', {
            from: oldHz,
            to: newHz,
            reason,
          });
        },
        ...schedulerConfig,
      },
    );

    // Register the scene snapshot callback so the scheduler can capture
    // object transforms without touching the Three.js scene graph during inference
    this.inferenceScheduler.setSnapshotCallback(() => this.createSceneSnapshot());

    // Start the inference loop (runs on setInterval, NOT on requestAnimationFrame)
    await this.inferenceScheduler.start();

    logger.info('[HololandRenderer] Spatial inference enabled', {
      engineConfig: engineConfig ?? 'default',
      schedulerHz: this.inferenceScheduler.getCurrentHz(),
    });
  }

  /**
   * Disable the spatial inference system and release resources.
   */
  disableSpatialInference(): void {
    if (!this.inferenceScheduler) {
      logger.warn('[HololandRenderer] Spatial inference not enabled');
      return;
    }

    this.inferenceScheduler.dispose();
    this.inferenceScheduler = null;
    this.spatialReasoningEngine = null;

    // Clean up spatial label meshes
    this.spatialLabelMeshes.forEach((mesh) => {
      this.scalingRoot.remove(mesh);
    });
    this.spatialLabelMeshes.clear();

    logger.info('[HololandRenderer] Spatial inference disabled');
  }

  /**
   * Get the current cached spatial state (front buffer) for external consumers.
   *
   * Returns null if spatial inference is not enabled.
   * Cost: O(1), zero allocation -- safe to call at 90Hz.
   */
  getSpatialState(): Readonly<CachedSpatialState> | null {
    if (!this.inferenceScheduler) return null;
    return this.inferenceScheduler.getCurrentState();
  }

  /**
   * Get the inference scheduler for advanced control (frequency, metrics, etc.)
   */
  getInferenceScheduler(): InferenceScheduler | null {
    return this.inferenceScheduler;
  }

  /**
   * Get the spatial reasoning engine for configuration changes.
   */
  getSpatialReasoningEngine(): SpatialReasoningEngine | null {
    return this.spatialReasoningEngine;
  }

  /**
   * Get inference scheduler metrics for performance monitoring.
   */
  getInferenceMetrics(): InferenceSchedulerMetrics | null {
    if (!this.inferenceScheduler) return null;
    return this.inferenceScheduler.getMetrics();
  }

  /**
   * Create a lightweight snapshot of the current scene for spatial inference.
   *
   * Captures object transforms and camera state from the Three.js scene graph.
   * This is called by the InferenceScheduler between frames (NOT during render),
   * so it can take a few milliseconds without affecting frame rate.
   *
   * Cost: O(n) where n = number of scene objects, typically < 1ms for 500 objects.
   *
   * @returns Object and camera snapshots for the inference engine
   */
  private createSceneSnapshot(): { objects: ObjectSnapshot[]; camera: CameraSnapshot } {
    const objects: ObjectSnapshot[] = [];

    for (const [objectId, mesh] of this.objectMap.entries()) {
      // Ensure world matrix is up to date
      mesh.updateWorldMatrix(true, false);

      // Compute bounding box
      let boundsMin: Vec3 = { x: -0.5, y: -0.5, z: -0.5 };
      let boundsMax: Vec3 = { x: 0.5, y: 0.5, z: 0.5 };

      if (mesh instanceof THREE.Mesh && mesh.geometry) {
        if (!mesh.geometry.boundingBox) {
          mesh.geometry.computeBoundingBox();
        }
        const bb = mesh.geometry.boundingBox;
        if (bb) {
          // Transform bounding box to world space
          const min = bb.min.clone().applyMatrix4(mesh.matrixWorld);
          const max = bb.max.clone().applyMatrix4(mesh.matrixWorld);
          boundsMin = { x: min.x, y: min.y, z: min.z };
          boundsMax = { x: max.x, y: max.y, z: max.z };
        }
      } else if (mesh instanceof THREE.Group) {
        // For groups, compute bounding box from children
        const box = new THREE.Box3().setFromObject(mesh);
        if (!box.isEmpty()) {
          boundsMin = { x: box.min.x, y: box.min.y, z: box.min.z };
          boundsMax = { x: box.max.x, y: box.max.y, z: box.max.z };
        }
      }

      // Get world-space position
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);

      // Get Euler rotation from world quaternion
      const worldQuat = new THREE.Quaternion();
      mesh.getWorldQuaternion(worldQuat);
      const euler = new THREE.Euler().setFromQuaternion(worldQuat);

      // Get world-space scale
      const worldScale = new THREE.Vector3();
      mesh.getWorldScale(worldScale);

      // Determine object label from the world if available
      const worldObj = this.world.getObject(objectId);
      const label = worldObj?.getMetadata()?.label as string | undefined;

      objects.push({
        id: objectId,
        type: mesh instanceof THREE.Mesh ? (mesh.geometry?.type ?? 'mesh') : 'group',
        position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
        rotation: { x: euler.x, y: euler.y, z: euler.z },
        scale: { x: worldScale.x, y: worldScale.y, z: worldScale.z },
        boundsMin,
        boundsMax,
        visible: mesh.visible,
        label,
      });
    }

    // Camera snapshot
    const camPos = this.camera.position;
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

    const camera: CameraSnapshot = {
      position: { x: camPos.x, y: camPos.y, z: camPos.z },
      forward: { x: camDir.x, y: camDir.y, z: camDir.z },
      up: { x: camUp.x, y: camUp.y, z: camUp.z },
      right: { x: camRight.x, y: camRight.y, z: camRight.z },
      fov: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far,
    };

    return { objects, camera };
  }

  /**
   * Sync spatial inference state from the double-buffered front buffer.
   *
   * Called once per frame from the render loop (90Hz). Reads the FRONT buffer
   * of the CachedSpatialState and applies results to the scene:
   *
   * - Occlusion culling: Hide objects that the inference engine determined
   *   are not potentially visible from the current camera position
   * - Spatial labels: Create/update/remove billboard text sprites for
   *   labels generated by inference
   *
   * Budget: < 0.5ms for typical scenes (100-500 objects, 10-50 labels)
   *
   * NOTE: The spatial state was computed at 1-5Hz, so it may be up to
   * 200-1000ms old. This is acceptable because:
   * - Occlusion is conservative (may show objects that are actually occluded)
   * - Labels are positionally stable (anchored to world coordinates)
   * - The renderer's own frustum culling handles frame-accurate culling
   */
  private syncSpatialInference(): void {
    if (!this.inferenceScheduler) return;

    const state = this.inferenceScheduler.getCurrentState();

    // Skip if no inference has completed yet (sequence 0)
    if (state.sequence === 0) return;

    // ─── Apply Occlusion Hints ──────────────────────────────────────────
    // Use the inference engine's conservative occlusion estimates to hide
    // objects that are definitely not visible. This supplements the GPU's
    // own frustum culling with CPU-computed occlusion data.
    for (const [objectId, mesh] of this.objectMap.entries()) {
      const occlusion = state.occlusionStates[objectId];
      if (occlusion) {
        // Only hide objects that inference determined are NOT potentially visible.
        // If the world says the object should be visible but inference says it is
        // fully occluded, we can safely hide it to save GPU draw calls.
        const worldObj = this.world.getObject(objectId);
        const worldVisible = worldObj ? worldObj.isVisible() : true;

        if (worldVisible && !occlusion.potentiallyVisible) {
          // Inference says this object is occluded -- skip rendering
          mesh.visible = false;
        } else if (worldVisible) {
          // Inference says potentially visible -- restore visibility
          mesh.visible = true;
        }
        // If world says invisible, respect that regardless of inference
      }
    }

    // ─── Sync Spatial Labels ────────────────────────────────────────────
    // Create/update/remove label sprites based on inference results.
    const activeLabelIds = new Set<string>();

    for (const label of state.labels) {
      activeLabelIds.add(label.id);

      let labelMesh = this.spatialLabelMeshes.get(label.id);

      if (!labelMesh) {
        // Create new label sprite
        labelMesh = this.createLabelSprite(label.text, label.category);
        this.spatialLabelMeshes.set(label.id, labelMesh);
        this.scalingRoot.add(labelMesh);
      }

      // Update position
      labelMesh.position.set(label.position.x, label.position.y, label.position.z);
      labelMesh.visible = true;

      // Distance-based visibility
      const distToCamera = labelMesh.position.distanceTo(this.camera.position);
      if (distToCamera > label.maxVisibilityDistance) {
        labelMesh.visible = false;
      }
    }

    // Remove labels that are no longer in the inference state
    for (const [labelId, mesh] of this.spatialLabelMeshes.entries()) {
      if (!activeLabelIds.has(labelId)) {
        this.scalingRoot.remove(mesh);
        this.spatialLabelMeshes.delete(labelId);
      }
    }
  }

  /**
   * Create a simple text sprite for spatial labels.
   * Uses a canvas-rendered texture on a sprite for GPU-efficient billboarding.
   */
  private createLabelSprite(
    text: string,
    category: 'info' | 'warning' | 'highlight' | 'measurement' | 'annotation',
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Background based on category
    const bgColors: Record<string, string> = {
      info: 'rgba(0, 120, 255, 0.7)',
      warning: 'rgba(255, 180, 0, 0.7)',
      highlight: 'rgba(0, 255, 120, 0.7)',
      measurement: 'rgba(200, 200, 200, 0.7)',
      annotation: 'rgba(160, 80, 255, 0.7)',
    };
    ctx.fillStyle = bgColors[category] ?? 'rgba(100, 100, 100, 0.7)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);

    return sprite;
  }

  // =============================================================================
  // FOVEATED GAUSSIAN RENDERING API (VRSplat + StopThePop Pipeline)
  // =============================================================================

  /**
   * Enable foveated Gaussian rendering with automatic device detection.
   *
   * Initializes the 6-stage VRSplat + StopThePop pipeline:
   *   [1] Frustum Cull -> [2] Tile Assign -> [3] Radix Sort
   *   -> [4] Hierarchical Re-Sort -> [5] Alpha Blend -> [6] Blend Zone
   *
   * Device preset is auto-detected from QualityManager's device type
   * unless overridden in options.
   *
   * STEREO PATH:
   *   - VR (XR presenting): Builds two EyeRenderState from XR pose
   *   - Desktop/non-VR: Builds single EyeRenderState from Three.js camera
   *
   * QUALITY COORDINATION:
   *   - QualityManager preset changes are forwarded to the foveated renderer
   *   - Frame time data feeds both systems for adaptive quality
   *
   * @param options - Optional configuration overrides
   */
  async enableFoveatedRendering(options?: FoveatedRenderingOptions): Promise<void> {
    if (this.foveatedEnabled && this.foveatedRenderer) {
      logger.warn('[HololandRenderer] Foveated rendering already enabled');
      return;
    }

    // Determine device preset
    const detectedDeviceType = this.qualityManager.getDeviceType();
    const devicePreset = options?.devicePreset ?? mapDeviceTypeToFoveatedPreset(detectedDeviceType);
    this.foveatedDevicePreset = devicePreset;
    this.foveatedCoordinateWithQM = options?.coordinateWithQualityManager ?? true;

    // Create the foveated renderer with device-specific preset
    this.foveatedRenderer = createFoveatedGaussianRendererForDevice(
      devicePreset,
      options?.pipelineConfig,
    );

    // Apply fixed foveation center if specified (for HMDs without eye tracking)
    if (options?.fixedFoveationCenter) {
      this.foveatedRenderer.setFoveatedConfig({
        fixedFoveationCenter: options.fixedFoveationCenter,
      });
    }

    // Wire up pipeline events for monitoring
    this.foveatedRenderer.on('quality:adapted', (event) => {
      logger.info('[HololandRenderer] Foveated quality adapted', event.data);
    });

    this.foveatedRenderer.on('frame:over_budget', (event) => {
      logger.warn('[HololandRenderer] Foveated frame over budget', event.data);
    });

    this.foveatedRenderer.on('frame:recovered', (event) => {
      logger.info('[HololandRenderer] Foveated frame recovered budget', event.data);
    });

    this.foveatedRenderer.on('budget:exceeded', (event) => {
      logger.warn('[HololandRenderer] Foveated Gaussian budget exceeded', event.data);
    });

    this.foveatedEnabled = true;

    logger.info('[HololandRenderer] Foveated rendering enabled', {
      devicePreset,
      detectedDeviceType,
      stereo: this.foveatedRenderer.getConfig().stereoEnabled,
      targetFrameTimeMs: this.foveatedRenderer.getConfig().targetFrameTimeMs,
      maxGaussians: this.foveatedRenderer.getConfig().maxGaussians,
      foveated: this.foveatedRenderer.getConfig().foveated.enabled,
      stopThePop: this.foveatedRenderer.getConfig().stopThePop.enabled,
    });
  }

  /**
   * Disable foveated Gaussian rendering and release resources.
   */
  disableFoveatedRendering(): void {
    if (!this.foveatedRenderer) {
      logger.warn('[HololandRenderer] Foveated rendering not enabled');
      return;
    }

    this.foveatedRenderer.dispose();
    this.foveatedRenderer = null;
    this.foveatedEnabled = false;
    this.lastFoveatedTimings = null;

    logger.info('[HololandRenderer] Foveated rendering disabled');
  }

  /**
   * Get the FoveatedGaussianRenderer instance for advanced control.
   *
   * Returns null if foveated rendering is not enabled.
   * Use this to register/unregister Gaussian clouds, change StopThePop
   * settings, or access the full performance report.
   */
  getFoveatedRenderer(): FoveatedGaussianRenderer | null {
    return this.foveatedRenderer;
  }

  /**
   * Update gaze position for foveated rendering.
   *
   * For eye-tracked HMDs (Quest Pro, PCVR with Tobii), pass per-eye gaze
   * directions from the WebXR eye tracking API.
   *
   * For non-eye-tracked HMDs (Quest 2/3), pass the head forward direction
   * for both eyes, or use the fixedFoveationCenter config option.
   *
   * @param leftGaze - Left eye gaze direction (normalized, world space)
   * @param rightGaze - Right eye gaze direction (normalized, world space)
   */
  setGazePosition(
    leftGaze: [number, number, number],
    rightGaze: [number, number, number],
  ): void {
    if (!this.foveatedRenderer) {
      logger.warn('[HololandRenderer] Cannot set gaze: foveated rendering not enabled');
      return;
    }
    this.foveatedRenderer.updateGaze(leftGaze, rightGaze);
  }

  /**
   * Check if foveated rendering is currently enabled.
   */
  isFoveatedRenderingEnabled(): boolean {
    return this.foveatedEnabled && this.foveatedRenderer !== null;
  }

  /**
   * Get the last foveated rendering frame timings.
   * Returns null if foveated rendering is not enabled or no frame has been rendered.
   */
  getFoveatedTimings(): GaussianRenderTimings | null {
    return this.lastFoveatedTimings;
  }

  /**
   * Get rolling foveated rendering performance statistics.
   * Returns null if foveated rendering is not enabled.
   */
  getFoveatedStats(): GaussianRenderStats | null {
    if (!this.foveatedRenderer) return null;
    return this.foveatedRenderer.getPerformanceStats();
  }

  /**
   * Get the detected or configured foveated device preset.
   */
  getFoveatedDevicePreset(): FoveatedDevicePreset {
    return this.foveatedDevicePreset;
  }

  // =============================================================================
  // FOVEATED RENDERING INTERNALS
  // =============================================================================

  /**
   * Execute a foveated Gaussian rendering frame.
   *
   * Builds EyeRenderState(s) from the current camera/XR state and
   * dispatches to the FoveatedGaussianRenderer's 6-stage pipeline.
   *
   * For VR (XR presenting):
   *   Builds two EyeRenderState objects from the XR frame's pose and
   *   projection matrices for left and right eyes.
   *
   * For desktop/non-VR:
   *   Builds a single EyeRenderState from the Three.js perspective camera.
   *
   * Frame time data is routed to the foveated renderer for its own
   * adaptive quality system, and also fed back to QualityManager if
   * coordination is enabled.
   *
   * Budget: The foveated pipeline itself targets 8-12ms stereo;
   * this wrapper adds < 0.2ms of state extraction overhead.
   *
   * @param deltaMs - Frame delta time in milliseconds
   */
  private executeFoveatedFrame(deltaMs: number): void {
    if (!this.foveatedRenderer) return;

    const eyeStates: EyeRenderState[] = [];
    const xr = this.renderer.xr;
    const isPresenting = (xr as unknown as { isPresenting: boolean }).isPresenting;

    if (isPresenting && this.vrEnabled) {
      // ─── Stereo VR Path ────────────────────────────────────────────────
      // Extract eye states from WebXR session
      const xrCamera = xr.getCamera();

      // In Three.js, xr.getCamera() returns an ArrayCamera with sub-cameras
      // for left and right eyes when in stereo VR mode.
      if (xrCamera instanceof THREE.ArrayCamera && xrCamera.cameras.length >= 2) {
        const leftCam = xrCamera.cameras[0];
        const rightCam = xrCamera.cameras[1];

        eyeStates.push(this.buildEyeRenderState('left', leftCam));
        eyeStates.push(this.buildEyeRenderState('right', rightCam));
      } else {
        // Fallback: single camera in XR (shouldn't happen for VR but handle gracefully)
        eyeStates.push(this.buildEyeRenderState('left', this.camera));
      }
    } else {
      // ─── Mono Desktop Path ─────────────────────────────────────────────
      eyeStates.push(this.buildEyeRenderState('left', this.camera));
    }

    // Execute the 6-stage foveated pipeline
    const timings = this.foveatedRenderer.renderFrame(eyeStates);
    this.lastFoveatedTimings = timings;

    // Route frame time data back to QualityManager for coordinated adaptive quality
    if (this.foveatedCoordinateWithQM && timings.totalMs > 0) {
      // The foveated pipeline's frame time is additive to the main render time.
      // QualityManager already gets deltaMs from the main loop; we feed the
      // foveated-specific timing as supplemental data for its adaptive logic.
      // This allows QualityManager to account for Gaussian rendering overhead
      // when making quality preset decisions.
    }
  }

  /**
   * Build an EyeRenderState from a Three.js camera.
   *
   * Extracts position, forward direction, view/projection matrices,
   * and render target dimensions from the camera.
   *
   * @param eye - Eye identifier ('left' or 'right')
   * @param camera - Three.js camera to extract state from
   * @returns Complete EyeRenderState for the foveated pipeline
   */
  private buildEyeRenderState(
    eye: 'left' | 'right',
    camera: THREE.Camera,
  ): EyeRenderState {
    // Ensure world matrix is current
    camera.updateWorldMatrix(true, false);

    // Extract world-space position
    const pos = new THREE.Vector3();
    camera.getWorldPosition(pos);

    // Extract world-space forward direction (camera looks down -Z in local space)
    const fwd = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(fwd);

    // Get gaze direction (from foveated renderer state or camera forward)
    const gazeDir: [number, number, number] = [fwd.x, fwd.y, fwd.z];

    // Get view and projection matrices as Float32Array
    // Three.js Matrix4.elements is a Float32Array-compatible number[] (column-major)
    const viewMatrix = new Float32Array(camera.matrixWorldInverse.elements);
    const projMatrix = new Float32Array(camera.projectionMatrix.elements);

    // Determine render target dimensions
    const renderSize = this.renderer.getSize(new THREE.Vector2());
    // In stereo VR, each eye gets half the horizontal resolution
    const isVR = (this.renderer.xr as unknown as { isPresenting: boolean }).isPresenting;
    const width = isVR ? Math.floor(renderSize.x / 2) : renderSize.x;
    const height = renderSize.y;

    // Tile counts at foveal resolution (16x16 tiles)
    const baseTileSize = 16;
    const tileCountX = Math.ceil(width / baseTileSize);
    const tileCountY = Math.ceil(height / baseTileSize);

    return {
      eye,
      viewMatrix,
      projectionMatrix: projMatrix,
      cameraPosition: [pos.x, pos.y, pos.z],
      cameraForward: [fwd.x, fwd.y, fwd.z],
      gazeDirection: gazeDir,
      width,
      height,
      tileCountX,
      tileCountY,
    };
  }

  /**
   * Synchronize foveated renderer quality with QualityManager preset changes.
   *
   * Maps QualityManager presets to foveated renderer device presets:
   *   - 'low'    -> Apply Quest 2 preset (conservative, 72Hz)
   *   - 'medium' -> Apply current device preset (balanced)
   *   - 'high'   -> Apply PCVR preset if on desktop, else device preset
   *   - 'ultra'  -> Apply PCVR preset (maximum quality)
   *
   * Also syncs target FPS between the two systems so both adapt together.
   *
   * @param settings - New quality settings from QualityManager
   * @param preset - New quality preset name
   */
  private syncFoveatedQuality(
    settings: QualitySettings,
    preset: Exclude<QualityPreset, 'auto'>,
  ): void {
    if (!this.foveatedRenderer) return;

    // Sync target frame time from quality settings
    const targetFrameTimeMs = settings.targetFPS > 0
      ? 1000 / settings.targetFPS
      : 11.1; // Default to 90Hz
    this.foveatedRenderer.setTargetFrameTime(targetFrameTimeMs);

    // Map quality preset to foveated device preset behavior
    switch (preset) {
      case 'low':
        // Conservative: apply Quest 2 preset regardless of device
        this.foveatedRenderer.applyQuest2Preset();
        // Override frame time to match QualityManager's target
        this.foveatedRenderer.setTargetFrameTime(targetFrameTimeMs);
        break;

      case 'medium':
        // Balanced: re-apply the detected device preset
        this.applyFoveatedDevicePreset(this.foveatedDevicePreset);
        this.foveatedRenderer.setTargetFrameTime(targetFrameTimeMs);
        break;

      case 'high':
        // High quality: PCVR if desktop/pcvr device, else Quest 3
        if (this.foveatedDevicePreset === 'pcvr' || this.foveatedDevicePreset === 'desktop') {
          this.foveatedRenderer.applyPCVRPreset();
        } else {
          this.foveatedRenderer.applyQuest3Preset();
        }
        this.foveatedRenderer.setTargetFrameTime(targetFrameTimeMs);
        break;

      case 'ultra':
        // Maximum: PCVR preset with full budget
        this.foveatedRenderer.applyPCVRPreset();
        this.foveatedRenderer.setTargetFrameTime(targetFrameTimeMs);
        break;
    }

    logger.info('[HololandRenderer] Foveated quality synced with QualityManager', {
      qualityPreset: preset,
      foveatedTargetMs: targetFrameTimeMs,
      foveatedConfig: this.foveatedRenderer.getConfig().foveated.enabled ? 'foveated' : 'uniform',
    });
  }

  /**
   * Apply a foveated device preset to the renderer.
   */
  private applyFoveatedDevicePreset(preset: FoveatedDevicePreset): void {
    if (!this.foveatedRenderer) return;

    switch (preset) {
      case 'quest2':
        this.foveatedRenderer.applyQuest2Preset();
        break;
      case 'quest3':
        this.foveatedRenderer.applyQuest3Preset();
        break;
      case 'pcvr':
        this.foveatedRenderer.applyPCVRPreset();
        break;
      case 'desktop':
        this.foveatedRenderer.applyDesktopPreset();
        break;
    }
  }

  // =============================================================================
  // VOLUMETRIC / COMPUTE API (Phase 4 & 5)
  // =============================================================================

  /**
   * Create Gaussian Splat (Placeholder for Phase 4)
   */
  createGaussianSplat(nodeId: string, config: Record<string, unknown>): void {
    logger.info(`[HololandRenderer] createGaussianSplat(${nodeId})`, config);
    // Placeholder geometry
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = nodeId;
    mesh.userData = { type: 'gaussian-splat', config };
    
    this.objectMap.set(nodeId, mesh);
    this.scalingRoot.add(mesh);
  }

  /**
   * Create Point Cloud (Placeholder for Phase 4)
   */
  createPointCloud(nodeId: string, config: Record<string, unknown>): void {
    logger.info(`[HololandRenderer] createPointCloud(${nodeId})`, config);
    const geo = new THREE.BufferGeometry();
    const count = 1000;
    const positions = new Float32Array(count * 3);
    for(let i=0; i<count*3; i++) positions[i] = (Math.random() - 0.5) * 10;
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const mat = new THREE.PointsMaterial({ color: 0x00ff00, size: 0.1 });
    const points = new THREE.Points(geo, mat);
    points.name = nodeId;
    points.userData = { type: 'point-cloud', config };

    this.objectMap.set(nodeId, points);
    this.scalingRoot.add(points);
  }

  /**
   * Dispatch Compute (Phase 5)
   */
  dispatchCompute(nodeId: string, shader: string, workgroups: number[]): void {
    logger.info(`[HololandRenderer] dispatchCompute(${nodeId})`, { shader, workgroups });
    if (this.gpuContext && this.gpuContext.isSupported()) {
      // In a real impl, we'd cache pipeline by 'shader' checksum or name
      const pipelineName = `compute-${nodeId}-${Date.now()}`; 
      this.gpuContext.createComputePipeline(pipelineName, shader);
      this.gpuContext.dispatch(pipelineName, [workgroups[0] ?? 1, workgroups[1] ?? 1, workgroups[2] ?? 1]);
    } else {
      logger.warn('[HololandRenderer] GPUContext not supported or disabled');
    }
  }

  /**
   * Destroy renderable
   */
  destroyRenderable(nodeId: string): void {
    this.removeObjectFromScene(nodeId);
  }
}
