/**
 * Real-Time 3D Scene Preview
 *
 * Renders HoloScript scenes in real-time using Three.js.
 * Provides:
 * - Live preview synchronized with the editor
 * - Object selection and highlighting
 * - Camera controls (orbit, pan, zoom)
 * - Grid and axis helpers
 * - Performance metrics (FPS, draw calls, triangles)
 * - Screenshot capture for sharing
 */

import type { ParseResult, SceneNode } from '../editor/SceneEditor';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface ScenePreviewConfig {
  /** Canvas element or container to render into */
  canvas: HTMLCanvasElement;
  /** Enable orbit controls */
  controls?: boolean;
  /** Show grid helper */
  showGrid?: boolean;
  /** Show axis helper */
  showAxes?: boolean;
  /** Background color (CSS hex) */
  backgroundColor?: string;
  /** Enable antialiasing */
  antialias?: boolean;
  /** Enable shadows */
  shadows?: boolean;
  /** Callback when an object is clicked/selected in the preview */
  onObjectSelect?: (objectName: string | null) => void;
  /** Callback with performance metrics every frame */
  onMetrics?: (metrics: PreviewMetrics) => void;
}

export interface PreviewMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  objectCount: number;
  memoryMB: number;
}

export interface PreviewObject {
  name: string;
  mesh: any; // THREE.Object3D
  properties: Record<string, any>;
  selected: boolean;
}

// --------------------------------------------------------------------------
// Geometry/Color Maps
// --------------------------------------------------------------------------

const GEOMETRY_MAP: Record<string, string> = {
  cube: 'BoxGeometry',
  box: 'BoxGeometry',
  sphere: 'SphereGeometry',
  cylinder: 'CylinderGeometry',
  cone: 'ConeGeometry',
  torus: 'TorusGeometry',
  capsule: 'CapsuleGeometry',
  plane: 'PlaneGeometry',
  ring: 'RingGeometry',
  dodecahedron: 'DodecahedronGeometry',
  icosahedron: 'IcosahedronGeometry',
  octahedron: 'OctahedronGeometry',
  tetrahedron: 'TetrahedronGeometry',
};

const SKYBOX_COLORS: Record<string, string> = {
  default: '#1a1a2e',
  sunset: '#ff6b35',
  nebula: '#0a0a2a',
  'developer-dark': '#0f0f1a',
  forest: '#1a3a1a',
  ocean: '#0a2a3a',
  arctic: '#d0e8f0',
};

// --------------------------------------------------------------------------
// Scene Preview Class
// --------------------------------------------------------------------------

/**
 * Real-time 3D preview renderer for HoloScript scenes.
 *
 * Takes parsed HoloScript AST and renders it using Three.js.
 * Supports object selection, camera controls, and performance monitoring.
 */
export class ScenePreview {
  private config: Required<ScenePreviewConfig>;
  private THREE: any = null;
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private controls: any = null;
  private objects: Map<string, PreviewObject> = new Map();
  private gridHelper: any = null;
  private axesHelper: any = null;
  private animationId: number | null = null;
  private isRunning = false;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsAccumulator = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;
  private selectedObjectName: string | null = null;
  private selectionOutline: any = null;
  private raycaster: any = null;
  private mouse: any = null;

  constructor(config: ScenePreviewConfig) {
    this.config = {
      canvas: config.canvas,
      controls: config.controls ?? true,
      showGrid: config.showGrid ?? true,
      showAxes: config.showAxes ?? false,
      backgroundColor: config.backgroundColor ?? '#1a1a2e',
      antialias: config.antialias ?? true,
      shadows: config.shadows ?? true,
      onObjectSelect: config.onObjectSelect ?? (() => {}),
      onMetrics: config.onMetrics ?? (() => {}),
    };
  }

  /**
   * Initialize the preview renderer.
   * Requires Three.js to be loaded (from CDN or npm).
   */
  async initialize(threeInstance?: any): Promise<void> {
    const THREE = threeInstance ?? (window as any).THREE;
    if (!THREE) {
      throw new Error('Three.js not found. Load Three.js before initializing ScenePreview.');
    }
    this.THREE = THREE;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.config.canvas,
      antialias: this.config.antialias,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.config.canvas.clientWidth, this.config.canvas.clientHeight);
    this.renderer.shadowMap.enabled = this.config.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);

    // Create camera
    const aspect = this.config.canvas.clientWidth / this.config.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(5, 5, 8);
    this.camera.lookAt(0, 0, 0);

    // Create controls
    if (this.config.controls && (window as any).THREE?.OrbitControls) {
      this.controls = new (window as any).THREE.OrbitControls(this.camera, this.config.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 1;
      this.controls.maxDistance = 100;
    }

    // Add default lighting
    this.addDefaultLighting();

    // Add grid helper
    if (this.config.showGrid) {
      this.gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
      this.scene.add(this.gridHelper);
    }

    // Add axes helper
    if (this.config.showAxes) {
      this.axesHelper = new THREE.AxesHelper(5);
      this.scene.add(this.axesHelper);
    }

    // Raycaster for object selection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Click handler for object selection
    this.config.canvas.addEventListener('click', (event: MouseEvent) => {
      this.handleClick(event);
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    resizeObserver.observe(this.config.canvas.parentElement ?? this.config.canvas);
  }

  /**
   * Start the render loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.lastFpsUpdate = performance.now();
    this.animate();
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Update the preview from a HoloScript parse result
   */
  updateFromParseResult(code: string, parseResult: ParseResult): void {
    if (!parseResult.success || !parseResult.ast) return;
    this.rebuildScene(parseResult.ast);
  }

  /**
   * Update the preview from raw HoloScript code
   */
  updateFromCode(code: string, parseResult: ParseResult): void {
    this.updateFromParseResult(code, parseResult);
  }

  /**
   * Select an object by name (highlights it in the preview)
   */
  selectObject(objectName: string | null): void {
    // Remove previous selection highlight
    if (this.selectedObjectName && this.objects.has(this.selectedObjectName)) {
      const prevObj = this.objects.get(this.selectedObjectName)!;
      prevObj.selected = false;
      this.removeSelectionHighlight(prevObj.mesh);
    }

    this.selectedObjectName = objectName;

    // Add selection highlight
    if (objectName && this.objects.has(objectName)) {
      const obj = this.objects.get(objectName)!;
      obj.selected = true;
      this.addSelectionHighlight(obj.mesh);
    }

    this.config.onObjectSelect(objectName);
  }

  /**
   * Capture a screenshot of the current preview
   */
  captureScreenshot(width = 1200, height = 630): string {
    if (!this.renderer || !this.scene || !this.camera) return '';

    // Temporarily resize for screenshot
    const prevSize = this.renderer.getSize(new this.THREE.Vector2());
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Render one frame
    this.renderer.render(this.scene, this.camera);

    // Get data URL
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Restore original size
    this.renderer.setSize(prevSize.x, prevSize.y);
    this.camera.aspect = prevSize.x / prevSize.y;
    this.camera.updateProjectionMatrix();

    return dataUrl;
  }

  /**
   * Get current object list
   */
  getObjects(): Array<{ name: string; position: number[]; selected: boolean }> {
    return Array.from(this.objects.entries()).map(([name, obj]) => ({
      name,
      position: obj.mesh.position ? [obj.mesh.position.x, obj.mesh.position.y, obj.mesh.position.z] : [0, 0, 0],
      selected: obj.selected,
    }));
  }

  /**
   * Toggle grid visibility
   */
  toggleGrid(show?: boolean): void {
    if (this.gridHelper) {
      this.gridHelper.visible = show ?? !this.gridHelper.visible;
    }
  }

  /**
   * Toggle axes visibility
   */
  toggleAxes(show?: boolean): void {
    if (this.axesHelper) {
      this.axesHelper.visible = show ?? !this.axesHelper.visible;
    } else if (show && this.THREE && this.scene) {
      this.axesHelper = new this.THREE.AxesHelper(5);
      this.scene.add(this.axesHelper);
    }
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    if (!this.camera) return;
    this.camera.position.set(5, 5, 8);
    this.camera.lookAt(0, 0, 0);
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  /**
   * Dispose and clean up all resources
   */
  dispose(): void {
    this.stop();
    this.clearScene();
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.controls) {
      this.controls.dispose();
    }
  }

  // --- Private methods ---

  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Update controls
    if (this.controls) {
      this.controls.update();
    }

    // Render
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // Calculate FPS
    this.frameCount++;
    this.fpsAccumulator += deltaTime;
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round(this.frameCount * 1000 / this.fpsAccumulator);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
      this.lastFpsUpdate = now;

      // Report metrics
      const info = this.renderer?.info;
      this.config.onMetrics({
        fps: this.currentFps,
        frameTime: deltaTime,
        drawCalls: info?.render?.calls ?? 0,
        triangles: info?.render?.triangles ?? 0,
        objectCount: this.objects.size,
        memoryMB: (info?.memory?.geometries ?? 0) * 0.01,
      });
    }
  };

  private addDefaultLighting(): void {
    if (!this.THREE || !this.scene) return;

    // Ambient light
    const ambient = new this.THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Directional light (sun)
    const directional = new this.THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    directional.castShadow = this.config.shadows;
    if (directional.shadow) {
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

    // Hemisphere light for natural lighting
    const hemisphere = new this.THREE.HemisphereLight(0x87ceeb, 0x362d1b, 0.3);
    this.scene.add(hemisphere);
  }

  private rebuildScene(ast: SceneNode): void {
    if (!this.THREE || !this.scene) return;

    // Clear existing objects (keep lights and helpers)
    this.clearSceneObjects();

    // Update background from environment
    const envNode = ast.children.find(c => c.type === 'environment');
    if (envNode) {
      const skybox = envNode.properties.skybox;
      if (skybox && SKYBOX_COLORS[skybox]) {
        this.scene.background = new this.THREE.Color(SKYBOX_COLORS[skybox]);
      }

      const ambientLight = envNode.properties.ambient_light;
      if (typeof ambientLight === 'number') {
        // Update ambient light intensity
        this.scene.traverse((child: any) => {
          if (child.isAmbientLight) {
            child.intensity = ambientLight;
          }
        });
      }

      // Toggle grid
      if (this.gridHelper) {
        this.gridHelper.visible = envNode.properties.grid !== false;
      }
    }

    // Build templates map
    const templates = new Map<string, SceneNode>();
    for (const child of ast.children) {
      if (child.type === 'template') {
        templates.set(child.name, child);
      }
    }

    // Create objects
    for (const child of ast.children) {
      if (child.type === 'object') {
        this.createObjectFromNode(child, templates);
      }
    }
  }

  private createObjectFromNode(node: SceneNode, templates: Map<string, SceneNode>): void {
    if (!this.THREE || !this.scene) return;

    // Merge template properties if using a template
    let props = { ...node.properties };
    const templateName = props.template;
    if (templateName && templates.has(templateName)) {
      const tpl = templates.get(templateName)!;
      props = { ...tpl.properties, ...props };
    }

    // Determine geometry type
    const geoType = props.geometry || props.type || 'cube';
    const geometry = this.createGeometry(geoType, props);
    if (!geometry) return;

    // Create material
    const color = props.color || '#888888';
    const material = new this.THREE.MeshStandardMaterial({
      color: new this.THREE.Color(color),
      roughness: props.roughness ?? 0.5,
      metalness: props.metalness ?? 0.1,
      opacity: props.opacity ?? 1.0,
      transparent: (props.opacity ?? 1.0) < 1.0,
      wireframe: props.wireframe ?? false,
    });

    // Add emissive if glowing
    if (props.emissive || geoType === 'text') {
      material.emissive = new this.THREE.Color(color);
      material.emissiveIntensity = 0.3;
    }

    // Create mesh
    const mesh = new this.THREE.Mesh(geometry, material);
    mesh.name = node.name;

    // Set position
    if (props.position) {
      const [x, y, z] = props.position;
      mesh.position.set(x, y, z);
    }

    // Set rotation (convert degrees to radians)
    if (props.rotation) {
      const [rx, ry, rz] = props.rotation;
      mesh.rotation.set(
        (rx * Math.PI) / 180,
        (ry * Math.PI) / 180,
        (rz * Math.PI) / 180,
      );
    }

    // Set scale
    if (props.scale) {
      if (Array.isArray(props.scale)) {
        const [sx, sy, sz] = props.scale;
        mesh.scale.set(sx, sy, sz);
      } else {
        mesh.scale.setScalar(props.scale);
      }
    }

    // Enable shadows
    mesh.castShadow = props.castShadow !== false;
    mesh.receiveShadow = props.receiveShadow !== false;

    // Store userData for selection
    mesh.userData = { holoName: node.name, holoProps: props };

    this.scene.add(mesh);
    this.objects.set(node.name, {
      name: node.name,
      mesh,
      properties: props,
      selected: node.name === this.selectedObjectName,
    });

    // Re-apply selection if needed
    if (node.name === this.selectedObjectName) {
      this.addSelectionHighlight(mesh);
    }
  }

  private createGeometry(type: string, props: Record<string, any>): any {
    if (!this.THREE) return null;

    switch (type) {
      case 'cube':
      case 'box':
        return new this.THREE.BoxGeometry(1, 1, 1);
      case 'sphere':
        return new this.THREE.SphereGeometry(0.5, 32, 32);
      case 'cylinder':
        return new this.THREE.CylinderGeometry(0.5, 0.5, 1, 32);
      case 'cone':
        return new this.THREE.ConeGeometry(0.5, 1, 32);
      case 'torus':
        return new this.THREE.TorusGeometry(0.5, 0.15, 16, 32);
      case 'capsule':
        return new this.THREE.CapsuleGeometry(0.3, 0.5, 8, 16);
      case 'plane':
        return new this.THREE.PlaneGeometry(1, 1);
      case 'ring':
        return new this.THREE.RingGeometry(0.3, 0.5, 32);
      case 'dodecahedron':
        return new this.THREE.DodecahedronGeometry(0.5);
      case 'icosahedron':
        return new this.THREE.IcosahedronGeometry(0.5);
      case 'octahedron':
        return new this.THREE.OctahedronGeometry(0.5);
      case 'tetrahedron':
        return new this.THREE.TetrahedronGeometry(0.5);
      case 'text':
      case 'ui-text':
        // Use a simple plane as placeholder for text
        return new this.THREE.PlaneGeometry(2, 0.5);
      case 'humanoid':
      case 'model':
        // Use capsule as placeholder for models
        return new this.THREE.CapsuleGeometry(0.3, 0.7, 8, 16);
      default:
        return new this.THREE.BoxGeometry(1, 1, 1);
    }
  }

  private clearSceneObjects(): void {
    // Remove all user objects, keep lights and helpers
    for (const [, obj] of this.objects) {
      if (obj.mesh.geometry) obj.mesh.geometry.dispose();
      if (obj.mesh.material) {
        if (Array.isArray(obj.mesh.material)) {
          obj.mesh.material.forEach((m: any) => m.dispose());
        } else {
          obj.mesh.material.dispose();
        }
      }
      this.scene.remove(obj.mesh);
    }
    this.objects.clear();
  }

  private clearScene(): void {
    this.clearSceneObjects();
    if (this.gridHelper) {
      this.scene?.remove(this.gridHelper);
      this.gridHelper = null;
    }
    if (this.axesHelper) {
      this.scene?.remove(this.axesHelper);
      this.axesHelper = null;
    }
  }

  private handleClick(event: MouseEvent): void {
    if (!this.raycaster || !this.mouse || !this.camera) return;

    const rect = this.config.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = Array.from(this.objects.values()).map(o => o.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitName = intersects[0].object.userData?.holoName;
      this.selectObject(hitName ?? null);
    } else {
      this.selectObject(null);
    }
  }

  private addSelectionHighlight(mesh: any): void {
    if (!this.THREE || !mesh) return;

    // Add wireframe outline
    const outlineGeometry = mesh.geometry.clone();
    const outlineMaterial = new this.THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const outline = new this.THREE.Mesh(outlineGeometry, outlineMaterial);
    outline.scale.multiplyScalar(1.05);
    outline.name = '__selection_outline__';
    mesh.add(outline);
  }

  private removeSelectionHighlight(mesh: any): void {
    if (!mesh) return;
    const outline = mesh.getObjectByName('__selection_outline__');
    if (outline) {
      outline.geometry.dispose();
      outline.material.dispose();
      mesh.remove(outline);
    }
  }

  private handleResize(): void {
    if (!this.renderer || !this.camera || !this.config.canvas) return;

    const parent = this.config.canvas.parentElement;
    const width = parent ? parent.clientWidth : this.config.canvas.clientWidth;
    const height = parent ? parent.clientHeight : this.config.canvas.clientHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
