/**
 * @hololand/renderer
 *
 * Three.js renderer that syncs with @hololand/world
 * Provides complete 3D rendering for VR and web
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { HololandWorld, SpatialObject } from '@hololand/world';
import { logger } from './logger';
import type { RendererConfig, LightingConfig } from './types';
// Note: MaterialConfig is exported but not used yet - reserved for future material customization API

// Config type with uiCanvasElement as optional
type InternalConfig = Omit<Required<RendererConfig>, 'uiCanvasElement'> & {
  uiCanvasElement?: HTMLCanvasElement;
};

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

  constructor(canvas: HTMLCanvasElement, world: HololandWorld, config?: RendererConfig) {
    this.world = world;
    this.objectMap = new Map();
    this.animationId = null;
    this.vrEnabled = false;

    this.config = {
      // Existing 3D options
      enableShadows: config?.enableShadows ?? true,
      enableVR: config?.enableVR ?? true,
      enableControls: config?.enableControls ?? true,
      antialias: config?.antialias ?? true,
      backgroundColor: config?.backgroundColor ?? 0x000000,
      cameraPosition: config?.cameraPosition ?? { x: 10, y: 10, z: 10 },
      cameraFov: config?.cameraFov ?? 75,
      // Phase 2: Universal rendering options
      renderMode: config?.renderMode ?? '3d',
      enable2D: config?.enable2D ?? false,
      orthoSize: config?.orthoSize ?? 10,
      enableHybrid: config?.enableHybrid ?? false,
      uiCanvasElement: config?.uiCanvasElement ?? undefined,
    };

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);

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

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.config.antialias,
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    if (this.config.enableShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

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

    // Default lighting
    this.setupDefaultLighting();

    // Sync with Hololand world
    this.setupWorldSync();

    logger.info('[HololandRenderer] Initialized', {
      enableVR: this.vrEnabled,
      enableShadows: this.config.enableShadows,
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

    const animate = () => {
      this.animationId = this.renderer.xr.isPresenting
        ? this.renderer.setAnimationLoop(animate)
        : requestAnimationFrame(animate) as any;

      // Update controls
      if (this.controls) {
        this.controls.update();
      }

      // Sync world state to Three.js
      this.syncWorldToScene();

      // Render
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Stop rendering loop
   */
  stop(): void {
    if (this.animationId !== null) {
      if (this.renderer.xr.isPresenting) {
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
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = this.config.enableShadows;

    if (this.config.enableShadows) {
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
    }

    this.scene.add(directionalLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  /**
   * Setup world event listeners
   */
  private setupWorldSync(): void {
    // Add existing objects
    this.world.getAllObjects().forEach((obj) => this.addObjectToScene(obj));

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
    this.scene.add(mesh);

    logger.debug('[HololandRenderer] Object added to scene', { objectId: obj.id });
  }

  /**
   * Remove object from Three.js scene
   */
  private removeObjectFromScene(objectId: string): void {
    const mesh = this.objectMap.get(objectId);
    if (mesh) {
      this.scene.remove(mesh);
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

    // Determine geometry based on type
    let geometry: THREE.BufferGeometry;

    switch (obj.type) {
      case 'sphere':
      case 'orb':
        geometry = new THREE.SphereGeometry(scale.x / 2, 32, 32);
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
        geometry = new THREE.CylinderGeometry(scale.x / 2, scale.x / 2, scale.y, 32);
        break;
      default:
        // Default to box
        geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
    }

    // Create material
    const color = metadata.color ? new THREE.Color(metadata.color) : new THREE.Color(0x00ffff);
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.3,
      roughness: 0.7,
      emissive: metadata.glow ? color : new THREE.Color(0x000000),
      emissiveIntensity: metadata.glow ? 0.2 : 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = obj.id;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

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

    switch (config.type) {
      case 'ambient':
        light = new THREE.AmbientLight(config.color, config.intensity);
        break;
      case 'directional':
        light = new THREE.DirectionalLight(config.color, config.intensity);
        if (config.position) {
          light.position.set(config.position.x, config.position.y, config.position.z);
        }
        break;
      case 'point':
        light = new THREE.PointLight(config.color, config.intensity, config.distance);
        if (config.position) {
          light.position.set(config.position.x, config.position.y, config.position.z);
        }
        break;
      case 'spot':
        light = new THREE.SpotLight(config.color, config.intensity, config.distance);
        if (config.position) {
          light.position.set(config.position.x, config.position.y, config.position.z);
        }
        break;
      default:
        light = new THREE.AmbientLight(config.color, config.intensity);
    }

    this.scene.add(light);
    return light;
  }

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
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();

    // Dispose geometries and materials
    this.objectMap.forEach((mesh) => {
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.objectMap.clear();
    this.renderer.dispose();

    if (this.controls) {
      this.controls.dispose();
    }

    logger.info('[HololandRenderer] Disposed');
  }
}
