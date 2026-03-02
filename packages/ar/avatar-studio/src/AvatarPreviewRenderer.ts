/**
 * Avatar Preview Renderer
 *
 * Renders a real-time 3D preview of the avatar being authored.
 * Integrates with @pixiv/three-vrm for VRM model display and
 * @hololand/ar-renderer for the Three.js scene management.
 *
 * This renderer watches the AvatarBlueprintManager for changes and
 * updates the 3D preview in real time. It manages:
 * - Scene setup with studio lighting
 * - Camera orbiting and view presets
 * - Expression preview with animation
 * - Performance HUD overlay
 * - Turntable auto-rotation
 * - Screenshot capture for thumbnails
 */

import * as THREE from 'three';
import type {
  AvatarBlueprint,
  StudioViewAngle,
  ExpressionPreset,
  PerformanceBudget,
} from './types';
import { DEFAULT_PERFORMANCE_BUDGET } from './types';
import type { AvatarBlueprintManager } from './AvatarBlueprintManager';

// =============================================================================
// TYPES
// =============================================================================

export interface PreviewRendererConfig {
  /** Canvas element to render into */
  canvas: HTMLCanvasElement;
  /** Initial width */
  width: number;
  /** Initial height */
  height: number;
  /** Enable antialiasing */
  antialias?: boolean;
  /** Background style */
  background: 'studio-light' | 'studio-dark' | 'outdoor' | 'transparent';
  /** Enable shadow rendering */
  shadows?: boolean;
  /** Enable turntable auto-rotation */
  autoRotate?: boolean;
  /** Auto-rotation speed (degrees per second) */
  autoRotateSpeed?: number;
  /** Performance budget for warnings */
  performanceBudget?: PerformanceBudget;
}

export interface CameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

const CAMERA_PRESETS: Record<StudioViewAngle, CameraPreset> = {
  'front': {
    position: new THREE.Vector3(0, 1.2, 2.5),
    target: new THREE.Vector3(0, 1.0, 0),
    fov: 45,
  },
  'side': {
    position: new THREE.Vector3(2.5, 1.2, 0),
    target: new THREE.Vector3(0, 1.0, 0),
    fov: 45,
  },
  'back': {
    position: new THREE.Vector3(0, 1.2, -2.5),
    target: new THREE.Vector3(0, 1.0, 0),
    fov: 45,
  },
  'face-closeup': {
    position: new THREE.Vector3(0, 1.55, 0.8),
    target: new THREE.Vector3(0, 1.55, 0),
    fov: 35,
  },
  'full-body': {
    position: new THREE.Vector3(0, 1.0, 3.5),
    target: new THREE.Vector3(0, 0.85, 0),
    fov: 50,
  },
  'free': {
    position: new THREE.Vector3(1.5, 1.5, 2.0),
    target: new THREE.Vector3(0, 1.0, 0),
    fov: 45,
  },
};

// =============================================================================
// PREVIEW RENDERER
// =============================================================================

export class AvatarPreviewRenderer {
  private config: PreviewRendererConfig;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock = new THREE.Clock();
  private animationId: number = 0;
  private isRunning: boolean = false;

  // Avatar model
  private avatarGroup: THREE.Group = new THREE.Group();
  private currentVRM: any = null;

  // Lighting
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  // Camera control state
  private currentViewAngle: StudioViewAngle = 'front';
  private orbitAngle: number = 0;
  private orbitRadius: number = 2.5;
  private orbitHeight: number = 1.2;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Blueprint manager reference
  private blueprintManager: AvatarBlueprintManager | null = null;
  private unsubscribe: (() => void) | null = null;

  // Performance tracking
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private triangleCount: number = 0;

  // Expression animation
  private activeExpression: string | null = null;
  private expressionWeight: number = 0;
  private expressionTarget: number = 0;

  constructor(config: PreviewRendererConfig) {
    this.config = config;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
      alpha: config.background === 'transparent',
      preserveDrawingBuffer: true, // for screenshot capture
    });
    this.renderer.setSize(config.width, config.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    if (config.shadows !== false) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Create scene
    this.scene = new THREE.Scene();
    this.setBackground(config.background);

    // Create camera
    const aspect = config.width / config.height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.copy(CAMERA_PRESETS.front.position);
    this.camera.lookAt(CAMERA_PRESETS.front.target);

    // Setup lighting (three-point studio setup)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.keyLight.position.set(2, 3, 2);
    this.keyLight.castShadow = config.shadows !== false;
    if (this.keyLight.castShadow) {
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.camera.near = 0.1;
      this.keyLight.shadow.camera.far = 10;
    }
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xaabbff, 0.6);
    this.fillLight.position.set(-2, 2, 1);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xffddcc, 0.4);
    this.rimLight.position.set(0, 2, -3);
    this.scene.add(this.rimLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    // Add avatar group to scene
    this.scene.add(this.avatarGroup);

    // Add floor
    this.addFloor();

    // Setup mouse interaction for orbit
    this.setupMouseControls();
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Connect to a blueprint manager for reactive updates
   */
  connectBlueprintManager(manager: AvatarBlueprintManager): void {
    // Disconnect previous if any
    this.disconnectBlueprintManager();

    this.blueprintManager = manager;
    this.unsubscribe = manager.on('blueprint:changed', () => {
      this.updateFromBlueprint(manager.getBlueprint());
    });

    // Initial render
    this.updateFromBlueprint(manager.getBlueprint());
  }

  /**
   * Disconnect from blueprint manager
   */
  disconnectBlueprintManager(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.blueprintManager = null;
  }

  /**
   * Start the render loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.renderLoop();
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.stop();
    this.disconnectBlueprintManager();

    // Remove mouse listeners
    this.config.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.config.canvas.removeEventListener('wheel', this.onWheel);

    // Dispose VRM
    if (this.currentVRM) {
      this.currentVRM.dispose?.();
      this.currentVRM = null;
    }

    // Dispose scene
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.scene.clear();

    this.renderer.dispose();
  }

  // ===========================================================================
  // CAMERA CONTROL
  // ===========================================================================

  /**
   * Set camera to a named view preset
   */
  setViewAngle(angle: StudioViewAngle): void {
    this.currentViewAngle = angle;

    if (angle === 'free') return; // Free mode keeps current position

    const preset = CAMERA_PRESETS[angle];
    // Animate camera to preset position
    this.animateCameraTo(preset.position, preset.target, preset.fov);
  }

  /**
   * Get current view angle
   */
  getViewAngle(): StudioViewAngle {
    return this.currentViewAngle;
  }

  /**
   * Enable/disable turntable auto-rotation
   */
  setAutoRotate(enabled: boolean, speed?: number): void {
    this.config.autoRotate = enabled;
    if (speed !== undefined) {
      this.config.autoRotateSpeed = speed;
    }
  }

  // ===========================================================================
  // EXPRESSION PREVIEW
  // ===========================================================================

  /**
   * Preview an expression on the avatar
   */
  previewExpression(expression: ExpressionPreset): void {
    this.activeExpression = expression.name;
    this.expressionTarget = 1.0;
  }

  /**
   * Clear expression preview (return to neutral)
   */
  clearExpression(): void {
    this.expressionTarget = 0;
  }

  // ===========================================================================
  // SCREENSHOT / THUMBNAIL
  // ===========================================================================

  /**
   * Capture a screenshot of the current view
   */
  captureScreenshot(width?: number, height?: number): string {
    const originalWidth = this.config.width;
    const originalHeight = this.config.height;

    if (width && height) {
      this.resize(width, height);
    }

    // Render one frame
    this.renderer.render(this.scene, this.camera);

    // Capture as data URL
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Restore original size
    if (width && height) {
      this.resize(originalWidth, originalHeight);
    }

    return dataUrl;
  }

  /**
   * Capture thumbnail (256x256) and apply to blueprint manager
   */
  captureThumbnail(): string {
    const dataUrl = this.captureScreenshot(256, 256);
    if (this.blueprintManager) {
      this.blueprintManager.setThumbnail(dataUrl);
    }
    return dataUrl;
  }

  // ===========================================================================
  // PERFORMANCE METRICS
  // ===========================================================================

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): {
    fps: number;
    triangles: number;
    drawCalls: number;
    textureMemoryMB: number;
    withinBudget: boolean;
  } {
    const info = this.renderer.info;
    const budget = this.config.performanceBudget ?? DEFAULT_PERFORMANCE_BUDGET;

    const metrics = {
      fps: this.currentFps,
      triangles: info.render.triangles,
      drawCalls: info.render.calls,
      textureMemoryMB: (info.memory.textures * 4) / (1024 * 1024), // rough estimate
      withinBudget: true,
    };

    metrics.withinBudget =
      metrics.triangles <= budget.maxPolyCount &&
      metrics.drawCalls <= budget.maxDrawCalls;

    return metrics;
  }

  // ===========================================================================
  // BACKGROUND
  // ===========================================================================

  /**
   * Set background style
   */
  setBackground(style: 'studio-light' | 'studio-dark' | 'outdoor' | 'transparent'): void {
    switch (style) {
      case 'studio-light':
        this.scene.background = new THREE.Color(0xe8e8e8);
        this.ambientLight.intensity = 0.5;
        break;
      case 'studio-dark':
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.ambientLight.intensity = 0.3;
        break;
      case 'outdoor':
        this.scene.background = new THREE.Color(0x87ceeb);
        this.ambientLight.intensity = 0.6;
        break;
      case 'transparent':
        this.scene.background = null;
        this.ambientLight.intensity = 0.4;
        break;
    }
  }

  // ===========================================================================
  // INTERNAL: RENDER LOOP
  // ===========================================================================

  private renderLoop = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.renderLoop);
    const delta = this.clock.getDelta();

    // Auto-rotate
    if (this.config.autoRotate && !this.isDragging) {
      this.orbitAngle += ((this.config.autoRotateSpeed ?? 30) * delta * Math.PI) / 180;
      this.updateCameraFromOrbit();
    }

    // Expression animation (smooth blend)
    if (this.activeExpression && this.currentVRM) {
      this.expressionWeight = THREE.MathUtils.lerp(
        this.expressionWeight,
        this.expressionTarget,
        delta * 5
      );

      const expressionManager = this.currentVRM.expressionManager;
      if (expressionManager) {
        expressionManager.setValue(this.activeExpression, this.expressionWeight);
      }

      if (this.expressionTarget === 0 && this.expressionWeight < 0.01) {
        this.activeExpression = null;
        this.expressionWeight = 0;
      }
    }

    // Update VRM
    if (this.currentVRM) {
      this.currentVRM.update(delta);
    }

    // Render
    this.renderer.render(this.scene, this.camera);

    // FPS tracking
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  };

  // ===========================================================================
  // INTERNAL: BLUEPRINT UPDATE
  // ===========================================================================

  /**
   * Update 3D preview from blueprint changes
   */
  private updateFromBlueprint(blueprint: Readonly<AvatarBlueprint>): void {
    // Update skin material color
    this.updateSkinColor(blueprint.body.skinColor.hex);

    // Update hair color
    this.updateHairColor(blueprint.hair.primaryColor.hex);

    // Update model scale based on height
    const heightScale = blueprint.body.height / 1.7; // normalize to default
    this.avatarGroup.scale.setScalar(heightScale);

    // Body proportions would be applied via morph targets on the VRM model
    // For now, the preview shows the color/scale changes in real-time
    // Full morph target support is part of the mesh generation pipeline
  }

  /**
   * Update skin material color across all body meshes
   */
  private updateSkinColor(hex: string): void {
    const color = new THREE.Color(hex);
    this.avatarGroup.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.materialType === 'skin') {
        if (object.material instanceof THREE.MeshStandardMaterial) {
          object.material.color.copy(color);
        }
      }
    });
  }

  /**
   * Update hair material color
   */
  private updateHairColor(hex: string): void {
    const color = new THREE.Color(hex);
    this.avatarGroup.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.materialType === 'hair') {
        if (object.material instanceof THREE.MeshStandardMaterial) {
          object.material.color.copy(color);
        }
      }
    });
  }

  // ===========================================================================
  // INTERNAL: VRM MODEL LOADING
  // ===========================================================================

  /**
   * Load a VRM model for preview
   */
  async loadVRMModel(url: string): Promise<void> {
    // Clear existing
    if (this.currentVRM) {
      this.avatarGroup.remove(this.currentVRM.scene);
      this.currentVRM.dispose?.();
      this.currentVRM = null;
    }

    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { VRMLoaderPlugin } = await import('@pixiv/three-vrm');

      const loader = new GLTFLoader();
      loader.register((parser: any) => new VRMLoaderPlugin(parser));

      const gltf = await loader.loadAsync(url);
      const vrm = gltf.userData.vrm;

      if (vrm) {
        this.currentVRM = vrm;

        // Setup model
        vrm.scene.traverse((object: THREE.Object3D) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });

        this.avatarGroup.add(vrm.scene);
        console.log(`VRM model loaded for preview: ${url}`);
      } else {
        // Fallback: add as regular GLTF
        this.avatarGroup.add(gltf.scene);
        console.warn('Loaded as GLTF (no VRM data), some features unavailable');
      }
    } catch (error) {
      console.error('Failed to load VRM model:', error);
      // Add placeholder mannequin
      this.addPlaceholderMannequin();
    }
  }

  /**
   * Load a base mesh for authoring (procedural or from URL)
   */
  loadPlaceholder(): void {
    this.addPlaceholderMannequin();
  }

  // ===========================================================================
  // INTERNAL: SCENE SETUP
  // ===========================================================================

  private addFloor(): void {
    // Circular floor platform
    const geometry = new THREE.CircleGeometry(3, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Grid overlay
    const gridHelper = new THREE.PolarGridHelper(3, 8, 4, 64, 0x999999, 0x999999);
    gridHelper.position.y = 0.001;
    (gridHelper.material as THREE.Material).opacity = 0.15;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);
  }

  private addPlaceholderMannequin(): void {
    // Clear existing avatar content
    while (this.avatarGroup.children.length > 0) {
      const child = this.avatarGroup.children[0];
      this.avatarGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0b896,
      roughness: 0.6,
      metalness: 0.0,
    });

    // Head
    const headGeometry = new THREE.SphereGeometry(0.12, 32, 32);
    const head = new THREE.Mesh(headGeometry, skinMaterial.clone());
    head.position.y = 1.55;
    head.userData.materialType = 'skin';
    head.castShadow = true;
    this.avatarGroup.add(head);

    // Torso
    const torsoGeometry = new THREE.CylinderGeometry(0.15, 0.12, 0.5, 16);
    const torso = new THREE.Mesh(torsoGeometry, skinMaterial.clone());
    torso.position.y = 1.15;
    torso.userData.materialType = 'skin';
    torso.castShadow = true;
    this.avatarGroup.add(torso);

    // Hips
    const hipGeometry = new THREE.CylinderGeometry(0.12, 0.13, 0.2, 16);
    const hips = new THREE.Mesh(hipGeometry, skinMaterial.clone());
    hips.position.y = 0.8;
    hips.userData.materialType = 'skin';
    hips.castShadow = true;
    this.avatarGroup.add(hips);

    // Left leg
    const legGeometry = new THREE.CylinderGeometry(0.06, 0.05, 0.7, 8);
    const leftLeg = new THREE.Mesh(legGeometry, skinMaterial.clone());
    leftLeg.position.set(-0.08, 0.35, 0);
    leftLeg.userData.materialType = 'skin';
    leftLeg.castShadow = true;
    this.avatarGroup.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry.clone(), skinMaterial.clone());
    rightLeg.position.set(0.08, 0.35, 0);
    rightLeg.userData.materialType = 'skin';
    rightLeg.castShadow = true;
    this.avatarGroup.add(rightLeg);

    // Left arm
    const armGeometry = new THREE.CylinderGeometry(0.04, 0.035, 0.5, 8);
    const leftArm = new THREE.Mesh(armGeometry, skinMaterial.clone());
    leftArm.position.set(-0.22, 1.15, 0);
    leftArm.rotation.z = 0.15;
    leftArm.userData.materialType = 'skin';
    leftArm.castShadow = true;
    this.avatarGroup.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeometry.clone(), skinMaterial.clone());
    rightArm.position.set(0.22, 1.15, 0);
    rightArm.rotation.z = -0.15;
    rightArm.userData.materialType = 'skin';
    rightArm.castShadow = true;
    this.avatarGroup.add(rightArm);

    // Hair (placeholder sphere)
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2b1f,
      roughness: 0.7,
      metalness: 0.0,
    });
    const hairGeometry = new THREE.SphereGeometry(0.14, 32, 32);
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 1.6;
    hair.scale.set(1.0, 0.9, 1.0);
    hair.userData.materialType = 'hair';
    hair.castShadow = true;
    this.avatarGroup.add(hair);

    // Eyes (small spheres)
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const irisMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4423 });

    const eyeGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const irisGeometry = new THREE.SphereGeometry(0.012, 16, 16);

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.04, 1.56, 0.1);
    this.avatarGroup.add(leftEye);

    const leftIris = new THREE.Mesh(irisGeometry, irisMaterial);
    leftIris.position.set(-0.04, 1.56, 0.115);
    this.avatarGroup.add(leftIris);

    const rightEye = new THREE.Mesh(eyeGeometry.clone(), eyeMaterial.clone());
    rightEye.position.set(0.04, 1.56, 0.1);
    this.avatarGroup.add(rightEye);

    const rightIris = new THREE.Mesh(irisGeometry.clone(), irisMaterial.clone());
    rightIris.position.set(0.04, 1.56, 0.115);
    this.avatarGroup.add(rightIris);
  }

  // ===========================================================================
  // INTERNAL: CAMERA ANIMATION
  // ===========================================================================

  private animateCameraTo(
    position: THREE.Vector3,
    target: THREE.Vector3,
    fov: number
  ): void {
    // For simplicity, snap to position. In production, use GSAP or tween.
    this.camera.position.copy(position);
    this.camera.lookAt(target);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();

    // Update orbit state to match
    this.orbitAngle = Math.atan2(position.x, position.z);
    this.orbitRadius = Math.sqrt(position.x ** 2 + position.z ** 2);
    this.orbitHeight = position.y;
  }

  private updateCameraFromOrbit(): void {
    const x = Math.sin(this.orbitAngle) * this.orbitRadius;
    const z = Math.cos(this.orbitAngle) * this.orbitRadius;
    this.camera.position.set(x, this.orbitHeight, z);
    this.camera.lookAt(0, 1.0, 0);
  }

  // ===========================================================================
  // INTERNAL: MOUSE CONTROLS
  // ===========================================================================

  private setupMouseControls(): void {
    this.config.canvas.addEventListener('mousedown', this.onMouseDown);
    this.config.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onMouseDown = (event: MouseEvent): void => {
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.currentViewAngle = 'free';

    const onMouseMove = (e: MouseEvent): void => {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      // Orbit horizontal
      this.orbitAngle -= deltaX * 0.01;

      // Orbit vertical (clamp)
      this.orbitHeight = Math.max(0.2, Math.min(3.0, this.orbitHeight + deltaY * 0.005));

      this.updateCameraFromOrbit();

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    };

    const onMouseUp = (): void => {
      this.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.orbitRadius = Math.max(1.0, Math.min(8.0, this.orbitRadius + event.deltaY * 0.005));
    this.updateCameraFromOrbit();
    this.currentViewAngle = 'free';
  };
}
