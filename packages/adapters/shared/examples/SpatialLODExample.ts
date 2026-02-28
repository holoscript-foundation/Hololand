/**
 * Spatial LOD Example
 *
 * Complete example demonstrating how to integrate the Spatial LOD Manager
 * with Three.js for "Lost in Middle" optimization strategy.
 *
 * @module SpatialLODExample
 */

import * as THREE from 'three';
import {
  ThreeSpatialLODIntegration,
  createThreeSpatialLOD,
  generateLODGeometries,
} from '../three/src/SpatialLODIntegration';
import {
  VRPerformanceDegradationManager,
  ThreeVRPerformanceManager,
  createThreeVRPerformanceManager,
} from '../three/src/VRPerformanceIntegration';
import { SpatialZone, LODLevel } from './SpatialLODManager';

// =============================================================================
// EXAMPLE 1: BASIC SPATIAL LOD SETUP
// =============================================================================

export function basicSpatialLODExample() {
  // Create Three.js scene
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Position camera
  camera.position.set(0, 2, 10);

  // Create spatial LOD integration
  const spatialLOD = createThreeSpatialLOD(scene, camera, renderer);

  // Create a simple tree with LOD geometries
  const treeLODs = {
    lod0: new THREE.ConeGeometry(1, 3, 16, 16), // 256 tris
    lod1: new THREE.ConeGeometry(1, 3, 12, 12), // 144 tris
    lod2: new THREE.ConeGeometry(1, 3, 8, 8), // 64 tris
    lod3: new THREE.ConeGeometry(1, 3, 4, 4), // 16 tris
    impostor: new THREE.PlaneGeometry(1, 3), // 2 tris (billboard)
  };

  const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });

  // Create multiple trees at different distances
  const distances = [3, 8, 15, 30, 60, 100];
  for (let i = 0; i < distances.length; i++) {
    const tree = new THREE.Mesh(treeLODs.lod0, treeMaterial);
    tree.position.set(i * 5 - 12.5, 0, -distances[i]);
    scene.add(tree);

    // Register with spatial LOD
    spatialLOD.registerMesh({
      id: `tree_${i}`,
      mesh: tree,
      lodGeometries: treeLODs,
      priority: 0.5,
    });
  }

  // Animation loop
  let lastTime = performance.now();
  function animate(time: number) {
    requestAnimationFrame(animate);

    const frameTime = time - lastTime;
    lastTime = time;

    // Update spatial LOD
    spatialLOD.update(time);

    // Render scene
    renderer.render(scene, camera);
  }

  animate(performance.now());

  // Log metrics every 5 seconds
  setInterval(() => {
    const metrics = spatialLOD.getMetrics();
    console.log(spatialLOD.generateReport());
  }, 5000);
}

// =============================================================================
// EXAMPLE 2: INTEGRATION WITH VR PERFORMANCE MANAGER
// =============================================================================

export function combinedPerformanceExample() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  // Create VR Performance Manager
  const vrPerformance = createThreeVRPerformanceManager(renderer, scene, camera, {
    targetFrameTime: 11.1, // 90fps
    escalationThreshold: 85,
    deEscalationThreshold: 92,
  });

  // Create Spatial LOD Integration (with VR performance integration)
  const spatialLOD = createThreeSpatialLOD(scene, camera, renderer, vrPerformance.getDegradationManager(), {
    enableAggressiveMiddleReduction: true,
    middleReductionThreshold: 11.1,
  });

  // Start VR performance monitoring
  vrPerformance.startMonitoring(() => {
    // Sync spatial LOD with performance state
    spatialLOD.syncWithPerformanceManager();
  });

  // Create a complex scene with many objects
  createComplexScene(scene, spatialLOD);

  // Render loop
  let lastTime = performance.now();
  renderer.setAnimationLoop((time) => {
    const frameTime = time - lastTime;
    lastTime = time;

    // Update spatial LOD
    spatialLOD.update(time);

    // Record frame time for VR performance manager
    vrPerformance.recordFrame(frameTime);

    // Render
    renderer.render(scene, camera);
  });

  // Metrics dashboard
  setInterval(() => {
    console.log('=== VR PERFORMANCE REPORT ===');
    console.log(vrPerformance.generateReport());
    console.log('\n=== SPATIAL LOD REPORT ===');
    console.log(spatialLOD.generateReport());
  }, 10000);
}

// =============================================================================
// EXAMPLE 3: AUTOMATIC LOD MESH REGISTRATION
// =============================================================================

export function autoRegisterExample() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();

  // Create spatial LOD
  const spatialLOD = createThreeSpatialLOD(scene, camera, renderer);

  // Load a GLB/GLTF model with embedded LOD groups
  loadGLTFWithLODs('assets/forest_scene.glb').then((gltf) => {
    scene.add(gltf.scene);

    // Automatically register all LOD meshes in the scene
    const registered = spatialLOD.autoRegisterLODMeshes();
    console.log(`Auto-registered ${registered} LOD meshes`);
  });

  // Render loop
  renderer.setAnimationLoop((time) => {
    spatialLOD.update(time);
    renderer.render(scene, camera);
  });
}

// =============================================================================
// EXAMPLE 4: CUSTOM LOD GENERATION
// =============================================================================

export function customLODGenerationExample() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();

  const spatialLOD = createThreeSpatialLOD(scene, camera, renderer);

  // Load high-poly model
  loadHighPolyModel('assets/character.glb').then((model) => {
    // Generate LOD geometries automatically
    const lodGeometries = generateLODGeometries(model.geometry, {
      lod1Ratio: 0.75, // 75% of original
      lod2Ratio: 0.5, // 50% of original
      lod3Ratio: 0.25, // 25% of original
      generateImpostor: true,
    });

    // Create mesh
    const character = new THREE.Mesh(lodGeometries.lod0, model.material);
    character.position.set(0, 0, -10);
    scene.add(character);

    // Register with spatial LOD
    spatialLOD.registerMesh({
      id: 'character_01',
      mesh: character,
      lodGeometries,
      priority: 0.9, // High priority (important character)
      alwaysHighQuality: false,
    });
  });

  // Render loop
  renderer.setAnimationLoop((time) => {
    spatialLOD.update(time);
    renderer.render(scene, camera);
  });
}

// =============================================================================
// EXAMPLE 5: DYNAMIC CAMERA MOVEMENT
// =============================================================================

export function dynamicCameraExample() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();

  const spatialLOD = createThreeSpatialLOD(scene, camera, renderer, undefined, {
    updateFrequency: 20, // 20Hz updates (more responsive)
    maxObjectsPerFrame: 100, // Higher throughput
  });

  // Create grid of objects
  for (let x = -50; x <= 50; x += 5) {
    for (let z = -50; z <= 50; z += 5) {
      const cube = createCubeWithLODs();
      cube.position.set(x, 0, z);
      scene.add(cube);

      spatialLOD.registerMesh({
        id: `cube_${x}_${z}`,
        mesh: cube,
        lodGeometries: cube.userData.lodGeometries,
      });
    }
  }

  // Camera movement
  let cameraAngle = 0;
  const cameraRadius = 30;

  renderer.setAnimationLoop((time) => {
    // Move camera in circle
    cameraAngle += 0.01;
    camera.position.x = Math.cos(cameraAngle) * cameraRadius;
    camera.position.z = Math.sin(cameraAngle) * cameraRadius;
    camera.position.y = 10;
    camera.lookAt(0, 0, 0);

    // Update spatial LOD
    spatialLOD.update(time);

    // Render
    renderer.render(scene, camera);

    // Log metrics
    if (Math.floor(time / 1000) % 5 === 0) {
      const metrics = spatialLOD.getMetrics();
      console.log(`Camera: (${camera.position.x.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
      console.log(`Near: ${metrics.objectsByZone[SpatialZone.NEAR]}`);
      console.log(`Middle: ${metrics.objectsByZone[SpatialZone.MIDDLE]}`);
      console.log(`Far: ${metrics.objectsByZone[SpatialZone.FAR]}`);
    }
  });
}

// =============================================================================
// EXAMPLE 6: VR HEADSET WITH XR
// =============================================================================

export async function vrHeadsetExample() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: false }); // Disable AA for VR performance
  renderer.xr.enabled = true;

  // VR Performance + Spatial LOD
  const vrPerformance = createThreeVRPerformanceManager(renderer, scene, camera, {
    targetFrameTime: 11.1, // 90fps for VR
  });

  const spatialLOD = createThreeSpatialLOD(scene, camera, renderer, vrPerformance.getDegradationManager(), {
    enableAggressiveMiddleReduction: true,
  });

  // Create VR scene
  createVRScene(scene, spatialLOD);

  // Start VR session
  document.getElementById('vr-button')?.addEventListener('click', async () => {
    const session = await navigator.xr?.requestSession('immersive-vr');
    if (session) {
      renderer.xr.setSession(session);
    }
  });

  // VR render loop
  vrPerformance.startMonitoring(() => {
    spatialLOD.syncWithPerformanceManager();
  });

  renderer.setAnimationLoop((time, frame) => {
    if (frame) {
      // XR frame - update camera from XR pose
      const pose = frame.getViewerPose(renderer.xr.getReferenceSpace());
      if (pose) {
        // Camera position updated by Three.js WebXRManager automatically
      }
    }

    spatialLOD.update(time);
    renderer.render(scene, camera);
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createComplexScene(scene: THREE.Scene, spatialLOD: ThreeSpatialLODIntegration) {
  // Ground
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x7cfc00 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);

  // Create forest of trees at varying distances
  const treePositions: Array<[number, number, number]> = [];

  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    const distance = Math.sqrt(x * x + z * z);

    treePositions.push([x, 0, z]);
  }

  // Sort by distance (for progressive loading)
  treePositions.sort((a, b) => {
    const distA = Math.sqrt(a[0] * a[0] + a[2] * a[2]);
    const distB = Math.sqrt(b[0] * b[0] + b[2] * b[2]);
    return distA - distB;
  });

  // Create trees with LOD
  treePositions.forEach(([x, y, z], i) => {
    const tree = createTreeWithLODs();
    tree.position.set(x, y, z);
    scene.add(tree);

    spatialLOD.registerMesh({
      id: `tree_${i}`,
      mesh: tree,
      lodGeometries: tree.userData.lodGeometries,
      priority: 0.3, // Trees are not high priority
    });
  });

  console.log(`Created scene with ${treePositions.length} trees`);
}

function createTreeWithLODs(): THREE.Mesh {
  // Create LOD geometries for a simple tree
  const lodGeometries = {
    lod0: new THREE.ConeGeometry(1, 3, 16, 16), // 256 tris
    lod1: new THREE.ConeGeometry(1, 3, 12, 12), // 144 tris
    lod2: new THREE.ConeGeometry(1, 3, 8, 8), // 64 tris
    lod3: new THREE.ConeGeometry(1, 3, 4, 4), // 16 tris
    impostor: new THREE.PlaneGeometry(1, 3), // 2 tris
  };

  const material = new THREE.MeshStandardMaterial({ color: 0x228B22 });
  const tree = new THREE.Mesh(lodGeometries.lod0, material);

  // Store LOD geometries in userData
  tree.userData.lodGeometries = lodGeometries;

  return tree;
}

function createCubeWithLODs(): THREE.Mesh {
  const lodGeometries = {
    lod0: new THREE.BoxGeometry(1, 1, 1, 8, 8, 8), // High detail
    lod1: new THREE.BoxGeometry(1, 1, 1, 4, 4, 4), // Medium detail
    lod2: new THREE.BoxGeometry(1, 1, 1, 2, 2, 2), // Low detail
    lod3: new THREE.BoxGeometry(1, 1, 1, 1, 1, 1), // Minimal
    impostor: new THREE.PlaneGeometry(1, 1), // Billboard
  };

  const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
  const cube = new THREE.Mesh(lodGeometries.lod0, material);

  cube.userData.lodGeometries = lodGeometries;

  return cube;
}

function createVRScene(scene: THREE.Scene, spatialLOD: ThreeSpatialLODIntegration) {
  // VR-optimized scene with spatial LOD
  createComplexScene(scene, spatialLOD);

  // Add VR controllers
  // (Three.js XRControllerModelFactory handles this)
}

async function loadGLTFWithLODs(path: string): Promise<any> {
  // Placeholder - implement with GLTFLoader
  return { scene: new THREE.Group() };
}

async function loadHighPolyModel(path: string): Promise<any> {
  // Placeholder - implement with GLTFLoader
  return {
    geometry: new THREE.BoxGeometry(1, 2, 1),
    material: new THREE.MeshStandardMaterial({ color: 0xff0000 }),
  };
}

// =============================================================================
// EXPORT ALL EXAMPLES
// =============================================================================

export default {
  basicSpatialLODExample,
  combinedPerformanceExample,
  autoRegisterExample,
  customLODGenerationExample,
  dynamicCameraExample,
  vrHeadsetExample,
};
