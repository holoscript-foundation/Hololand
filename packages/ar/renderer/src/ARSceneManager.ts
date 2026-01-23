/**
 * AR Scene Manager
 * 
 * Manages Three.js scene for AR rendering.
 */

import * as THREE from 'three';
import type { RendererConfig, Vector3 } from './types';
import { DEFAULT_RENDERER_CONFIG } from './types';

/**
 * AR Scene Manager
 * 
 * Handles Three.js scene setup for WebXR AR rendering.
 */
export class ARSceneManager {
  private config: RendererConfig;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private xrSession: XRSession | null = null;
  private referenceSpace: XRReferenceSpace | null = null;
  private animationId: number = 0;
  private isRunning: boolean = false;
  private onFrameCallbacks: ((time: number, frame?: XRFrame) => void)[] = [];

  constructor(config?: Partial<RendererConfig>) {
    this.config = { ...DEFAULT_RENDERER_CONFIG, ...config };
  }

  /**
   * Initialize the scene
   */
  initialize(container?: HTMLElement): void {
    // Create scene
    this.scene = new THREE.Scene();

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    this.camera.position.set(0, 1.6, 3);

    // Create renderer
    const canvas = this.config.canvas ?? document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.config.antialias,
      alpha: this.config.alpha,
      preserveDrawingBuffer: this.config.preserveDrawingBuffer,
    });

    this.renderer.setPixelRatio(this.config.pixelRatio ?? window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    // Configure shadows
    if (this.config.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Configure tone mapping
    if (this.config.toneMapping) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1;
    }

    // Output color space
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Add to container
    if (container && !this.config.canvas) {
      container.appendChild(this.renderer.domElement);
    }

    // Setup default lighting
    this.setupDefaultLighting();

    // Handle resize
    window.addEventListener('resize', this.onResize);
  }

  /**
   * Setup default lighting
   */
  private setupDefaultLighting(): void {
    if (!this.scene) return;

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    // Directional light (sun)
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    directional.castShadow = this.config.shadows ?? false;
    
    if (this.config.shadows) {
      directional.shadow.mapSize.width = 2048;
      directional.shadow.mapSize.height = 2048;
      directional.shadow.camera.near = 0.5;
      directional.shadow.camera.far = 50;
      directional.shadow.camera.left = -10;
      directional.shadow.camera.right = 10;
      directional.shadow.camera.top = 10;
      directional.shadow.camera.bottom = -10;
    }
    
    this.scene.add(directional);
  }

  /**
   * Start WebXR AR session
   */
  async startARSession(): Promise<void> {
    if (!navigator.xr) {
      throw new Error('WebXR not supported');
    }

    const isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!isARSupported) {
      throw new Error('Immersive AR not supported');
    }

    // Request session
    this.xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking', 'hit-test', 'depth-sensing', 'light-estimation'],
    });

    // Set up renderer XR
    await this.renderer!.xr.setSession(this.xrSession);

    // Get reference space
    this.referenceSpace = await this.xrSession.requestReferenceSpace('local-floor');

    console.log('AR session started');
  }

  /**
   * Start VR session (fallback)
   */
  async startVRSession(): Promise<void> {
    if (!navigator.xr) {
      throw new Error('WebXR not supported');
    }

    const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!isVRSupported) {
      throw new Error('Immersive VR not supported');
    }

    this.xrSession = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking'],
    });

    await this.renderer!.xr.setSession(this.xrSession);
    this.referenceSpace = await this.xrSession.requestReferenceSpace('local-floor');

    console.log('VR session started');
  }

  /**
   * End XR session
   */
  async endSession(): Promise<void> {
    if (this.xrSession) {
      await this.xrSession.end();
      this.xrSession = null;
      this.referenceSpace = null;
    }
  }

  /**
   * Start animation loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.renderer!.setAnimationLoop((time, frame) => {
      // Call registered callbacks
      for (const callback of this.onFrameCallbacks) {
        callback(time, frame);
      }

      // Render
      this.renderer!.render(this.scene!, this.camera!);
    });
  }

  /**
   * Stop animation loop
   */
  stop(): void {
    this.isRunning = false;
    this.renderer?.setAnimationLoop(null);
  }

  /**
   * Register frame callback
   */
  onFrame(callback: (time: number, frame?: XRFrame) => void): () => void {
    this.onFrameCallbacks.push(callback);
    return () => {
      const index = this.onFrameCallbacks.indexOf(callback);
      if (index >= 0) {
        this.onFrameCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Add object to scene
   */
  add(object: THREE.Object3D): void {
    this.scene?.add(object);
  }

  /**
   * Remove object from scene
   */
  remove(object: THREE.Object3D): void {
    this.scene?.remove(object);
  }

  /**
   * Get scene
   */
  getScene(): THREE.Scene | null {
    return this.scene;
  }

  /**
   * Get camera
   */
  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  /**
   * Get renderer
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  /**
   * Get XR session
   */
  getXRSession(): XRSession | null {
    return this.xrSession;
  }

  /**
   * Get reference space
   */
  getReferenceSpace(): XRReferenceSpace | null {
    return this.referenceSpace;
  }

  /**
   * Check if XR is active
   */
  isXRActive(): boolean {
    return this.xrSession !== null;
  }

  /**
   * Handle window resize
   */
  private onResize = (): void => {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  /**
   * Convert world position to screen position
   */
  worldToScreen(position: Vector3): { x: number; y: number } | null {
    if (!this.camera || !this.renderer) return null;

    const vector = new THREE.Vector3(position.x, position.y, position.z);
    vector.project(this.camera);

    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    return {
      x: (vector.x * 0.5 + 0.5) * width,
      y: (-vector.y * 0.5 + 0.5) * height,
    };
  }

  /**
   * Convert screen position to world ray
   */
  screenToRay(x: number, y: number): THREE.Raycaster | null {
    if (!this.camera || !this.renderer) return null;

    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    const mouse = new THREE.Vector2(
      (x / width) * 2 - 1,
      -(y / height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    return raycaster;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);

    if (this.xrSession) {
      this.xrSession.end();
      this.xrSession = null;
    }

    if (this.scene) {
      // Dispose all objects
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
      this.scene = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.camera = null;
    this.onFrameCallbacks = [];
  }
}
