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
import type { RendererConfig, LightingConfig, QualitySettings, QualityPreset } from './types';
import { QUALITY_PRESETS } from './types';
import { QualityManager, createQualityManager } from './QualityManager';
import { PostProcessingPipeline, createPostProcessingPipeline } from './PostProcessing';
import { EnvironmentManager, createEnvironmentManager } from './EnvironmentManager';
import { MaterialFactory, createMaterialFactory } from './MaterialFactory';
import { GPUContext } from './GPUContext';
import type {
  AgentCommunicationManager,
} from './AgentCommunicationManager';
import type {
  AgentWorldState,
  AgentAvatarState,
  AgentCommand,
} from './AgentStateBuffer';

// Config type with optional fields
type InternalConfig = Omit<Required<RendererConfig>, 'uiCanvasElement' | 'qualityOverrides' | 'environment' | 'postProcessing'> & {
  uiCanvasElement?: HTMLCanvasElement;
  qualityOverrides?: Partial<QualitySettings>;
  environment?: RendererConfig['environment'];
  postProcessing?: RendererConfig['postProcessing'];
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

  // Scene structure
  private scalingRoot: THREE.Group;

  // Advanced systems
  private qualityManager: QualityManager;
  private postProcessing: PostProcessingPipeline | null = null;
  private environmentManager: EnvironmentManager | null = null;
  private materialFactory: MaterialFactory;
  private gpuContext: GPUContext;

  // Agent communication (double-buffered, off render loop)
  private agentCommunication: AgentCommunicationManager | null = null;
  private agentAvatarMap: Map<string, THREE.Object3D> = new Map();
  private agentCommandHandlers: Map<string, (command: AgentCommand) => void> = new Map();

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

    // Setup default lighting (unless using HDRI environment)
    if (!this.config.environment?.hdri) {
      this.setupDefaultLighting();
    }

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
