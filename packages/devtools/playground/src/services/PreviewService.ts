/**
 * Preview Service - Handles 3D scene rendering and HoloScript execution
 */

import * as THREE from 'three';
import type { PerformanceMetrics } from '../types/playground';

export class PreviewService {
  private scene: any;
  private camera: any;
  private renderer: any;
  private objects: Map<string, any> = new Map();
  private transformControl: any;
  // Post-processing composer could be added here when needed
  private animationFrameId: number | null = null;
  private startTime: number = Date.now();
  private frameCount: number = 0;
  private lastFrameTime: number = Date.now();
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsed: 0,
  };

  private raycaster: any;
  private pointer: any;
  public onObjectChange: ((id: string, updates: any) => void) | null = null;

  /**
   * Initialize preview with Three.js scene
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    // Dynamic import
    const THREE = await import('three');
    
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    // Add grid
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);

    // Start render loop
    this.startRenderLoop();

    // Handle window resize
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Initialize TransformControls (Dynamic Import)
    const { TransformControls } = await import('three/examples/jsm/controls/TransformControls.js');
    this.transformControl = new TransformControls(this.camera, canvas);
    this.transformControl.addEventListener('change', () => {
      // Request render if needed, but we have a loop
    });
    this.transformControl.addEventListener('dragging-changed', (event: any) => {
       // When dragging ends (event.value === false), emit update
       if (!event.value && this.transformControl.object && this.onObjectChange) {
           const obj = this.transformControl.object;
           // Find ID
           let foundId: string | null = null;
           for(const [id, object] of this.objects.entries()) {
               if (object === obj) {
                   foundId = id;
                   break;
               }
           }
           
           if (foundId) {
               this.onObjectChange(foundId, {
                   position: { 
                       x: obj.position.x, 
                       y: obj.position.y, 
                       z: obj.position.z 
                   },
                   rotation: {
                       x: obj.rotation.x,
                       y: obj.rotation.y,
                       z: obj.rotation.z
                   },
                   scale: {
                       x: obj.scale.x,
                       y: obj.scale.y,
                       z: obj.scale.z
                   }
               });
           }
       }
    });
    this.scene.add(this.transformControl);
  }

  /**
   * Select an object for manipulation
   */
  selectObject(id: string | null) {
    if (!this.transformControl) return;

    if (!id) {
      this.transformControl.detach();
      return;
    }

    const object = this.objects.get(id);
    if (object) {
      this.transformControl.attach(object);
    }
  }

  /**
   * Get the current transform of the selected object (for sync)
   */
  getSelectedObjectTransform() {
    if (!this.transformControl || !this.transformControl.object) return null;
    const obj = this.transformControl.object;
    return {
      position: obj.position.toArray(),
      rotation: obj.rotation.toArray().slice(0, 3),
      scale: obj.scale.toArray()
    };
  }

  /**
   * Create object in scene
   */
  createObject(id: string, type: string, properties: any): any {
    let object: any;

    switch (type) {
      case 'cube':
      case 'box':
        object = new THREE.Mesh(
          new THREE.BoxGeometry(properties.width || 1, properties.height || 1, properties.depth || 1),
          new THREE.MeshStandardMaterial({
            color: properties.color || 0x00ff00,
            metalness: properties.metalness || 0.5,
            roughness: properties.roughness || 0.5,
          })
        );
        break;

      case 'sphere':
        object = new THREE.Mesh(
          new THREE.SphereGeometry(properties.radius || 1, 32, 32),
          new THREE.MeshStandardMaterial({
            color: properties.color || 0x0080ff,
            metalness: properties.metalness || 0.5,
            roughness: properties.roughness || 0.5,
          })
        );
        break;

      case 'cylinder':
        object = new THREE.Mesh(
          new THREE.CylinderGeometry(properties.radiusTop || 1, properties.radiusBottom || 1, properties.height || 2, 32),
          new THREE.MeshStandardMaterial({
            color: properties.color || 0xff00ff,
            metalness: properties.metalness || 0.5,
            roughness: properties.roughness || 0.5,
          })
        );
        break;

      case 'cone':
        object = new THREE.Mesh(
          new THREE.ConeGeometry(properties.radius || 1, properties.height || 2, 32),
          new THREE.MeshStandardMaterial({
            color: properties.color || 0xffff00,
            metalness: properties.metalness || 0.5,
            roughness: properties.roughness || 0.5,
          })
        );
        break;

      default:
        object = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
        );
    }

    // Apply properties
    if (properties.position) {
      object.position.copy(properties.position);
    }
    if (properties.rotation) {
      object.rotation.copy(properties.rotation);
    }
    if (properties.scale) {
      object.scale.copy(properties.scale);
    }

    this.scene.add(object);
    this.objects.set(id, object);

    return object;
  }

  /**
   * Pick object at normalized coordinates (-1 to +1)
   */
  pickObject(x: number, y: number): string | null {
    if (!this.raycaster || !this.camera || !this.scene) return null;

    this.pointer.set(x, y);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, false);
    
    for (const intersect of intersects) {
      // Find object in our map (ignoring helpers/grid)
      for (const [id, obj] of this.objects.entries()) {
        if (obj === intersect.object) {
          return id;
        }
      }
    }
    
    return null;
  }

  /**
   * Update object properties
   */
  updateObject(id: string, properties: any): void {
    const object = this.objects.get(id);
    if (!object) return;

    if (properties.position) object.position.copy(properties.position);
    if (properties.rotation) object.rotation.copy(properties.rotation);
    if (properties.scale) object.scale.copy(properties.scale);
    if (properties.color && object.material) {
      object.material.color.setHex(properties.color);
    }
  }

  /**
   * Remove object from scene
   */
  removeObject(id: string): void {
    const object = this.objects.get(id);
    if (object) {
      this.scene.remove(object);
      this.objects.delete(id);
    }
  }

  /**
   * Clear all objects
   */
  clear(): void {
    this.objects.forEach((object) => {
      this.scene.remove(object);
    });
    this.objects.clear();
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Start render loop
   */
  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const now = Date.now();
      const deltaTime = (now - this.lastFrameTime) / 1000;

      // Update metrics
      this.frameCount++;
      const elapsed = now - this.startTime;
      if (elapsed >= 1000) {
        this.metrics.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.startTime = now;
      }

      // Calculate frame time
      this.metrics.frameTime = deltaTime * 1000;

      // Count draw calls and triangles
      this.metrics.drawCalls = this.renderer.info?.render?.calls || 0;
      this.metrics.triangles = this.renderer.info?.render?.triangles || 0;

      // Memory usage
      if (performance.memory) {
        this.metrics.memoryUsed = Math.round(performance.memory.usedJSHeapSize / 1048576);
      }

      // Render scene
      this.renderer.render(this.scene, this.camera);

      this.lastFrameTime = now;
    };

    animate();
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    if (!this.camera || !this.renderer) return;

    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.clear();
    this.renderer?.dispose();
    window.removeEventListener('resize', () => this.onWindowResize());
  }
}
