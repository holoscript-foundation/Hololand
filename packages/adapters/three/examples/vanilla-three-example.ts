/**
 * Vanilla Three.js Example
 *
 * This example shows how to use SmartAssetLoader with Three.js
 * WITHOUT React Three Fiber - just plain Three.js.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Import from @holoscript/core
import {
  getSmartAssetLoader,
  getAssetRegistry,
  AssetManifest,
  createAssetMetadata,
  resolveAssetAlias,
} from '@holoscript/core';

// Import the bridge from @hololand/three-adapter
import {
  setupSmartAssetLoader,
  getSmartAssetBridge,
  type GLTFResult,
} from '../src/SmartAssetBridge';

// ============================================================================
// Setup
// ============================================================================

// Initialize Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x1a3d1a });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ============================================================================
// Initialize SmartAssetLoader with Three.js
// ============================================================================

async function initAssetSystem() {
  // Step 1: Configure SmartAssetLoader
  const loader = getSmartAssetLoader({
    baseUrl: '/assets/',
    platform: 'desktop',
    quality: 'high',
    autoLOD: true,
    memoryBudget: 512 * 1024 * 1024,
  });

  // Step 2: Inject the Three.js model parser
  const bridge = setupSmartAssetLoader(loader, {
    enableShadows: true,
    shadowSettings: {
      castShadow: true,
      receiveShadow: true,
    },
  });

  // Step 3: Create and register an asset manifest
  const registry = getAssetRegistry();

  // Create a manifest with our assets
  const manifest = new AssetManifest('hololand-assets', '1.0.0');

  // Add assets to manifest
  manifest.addAsset(
    createAssetMetadata({
      id: 'nature/oak_tree_v1',
      name: 'oak_tree_v1',
      displayName: 'Oak Tree',
      format: 'glb',
      assetType: 'model',
      sourcePath: '/assets/models/solarpunk_tree.glb',
      fileSize: 524288,
      estimatedGPUMemory: 1048576,
      estimatedCPUMemory: 786432,
      estimatedLoadTime: 200,
      tags: ['nature', 'tree', 'outdoor'],
    })
  );

  manifest.addAsset(
    createAssetMetadata({
      id: 'props/park_bench_wood',
      name: 'park_bench_wood',
      displayName: 'Park Bench',
      format: 'glb',
      assetType: 'model',
      sourcePath: '/assets/models/park_bench.glb',
      fileSize: 262144,
      estimatedGPUMemory: 524288,
      estimatedCPUMemory: 393216,
      estimatedLoadTime: 100,
      tags: ['props', 'bench', 'outdoor', 'seating'],
    })
  );

  manifest.addAsset(
    createAssetMetadata({
      id: 'characters/brittney_v4_rigged',
      name: 'brittney_v4',
      displayName: 'Brittney',
      format: 'glb',
      assetType: 'model',
      sourcePath: '/assets/models/Brian_Flexing.glb', // Using existing model
      fileSize: 1048576,
      estimatedGPUMemory: 2097152,
      estimatedCPUMemory: 1572864,
      estimatedLoadTime: 400,
      tags: ['character', 'npc', 'animated'],
      semanticTags: {
        category: 'character',
        rig: 'humanoid',
        animations: ['idle', 'walk', 'talk'],
      },
    })
  );

  // Register the manifest
  registry.registerManifest('hololand', manifest);

  return { loader, bridge, registry };
}

// ============================================================================
// Load and Display Assets
// ============================================================================

async function loadAssets(loader: ReturnType<typeof getSmartAssetLoader>) {
  const loadingStatus = document.getElementById('loading-status');

  // Helper to update loading UI
  const updateStatus = (message: string) => {
    if (loadingStatus) {
      loadingStatus.textContent = message;
    }
    console.log(message);
  };

  try {
    // Load a tree using the alias
    updateStatus('Loading tree...');
    const treeResult = await loader.load<GLTFResult>({
      asset: 'tree', // Uses alias -> "nature/oak_tree_v1"
      onProgress: (progress) => {
        updateStatus(`Loading tree: ${Math.round(progress.percent)}%`);
      },
    });

    // Add tree to scene
    const tree = treeResult.data.scene;
    tree.position.set(-5, 0, 0);
    scene.add(tree);
    console.log('Tree loaded:', tree);

    // Clone the tree for a small forest
    for (let i = 0; i < 3; i++) {
      const treeClone = tree.clone();
      treeClone.position.set(
        -8 + Math.random() * 4,
        0,
        -5 + Math.random() * 10
      );
      treeClone.scale.setScalar(0.8 + Math.random() * 0.4);
      treeClone.rotation.y = Math.random() * Math.PI * 2;
      scene.add(treeClone);
    }

    // Load a bench
    updateStatus('Loading bench...');
    const benchResult = await loader.load<GLTFResult>({
      asset: 'bench', // Uses alias -> "props/park_bench_wood"
    });

    const bench = benchResult.data.scene;
    bench.position.set(3, 0, 2);
    bench.rotation.y = Math.PI / 4;
    scene.add(bench);
    console.log('Bench loaded:', bench);

    // Load animated character
    updateStatus('Loading character...');
    const characterResult = await loader.load<GLTFResult>({
      asset: 'brittney', // Uses alias -> "characters/brittney_v4_rigged"
    });

    const character = characterResult.data.scene;
    character.position.set(0, 0, 0);
    scene.add(character);

    // Set up animations if available
    if (characterResult.data.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(character);
      const idleAction = mixer.clipAction(characterResult.data.animations[0]);
      idleAction.play();

      // Add mixer to animation loop
      (window as any).animationMixer = mixer;
    }

    console.log('Character loaded:', character);

    updateStatus('All assets loaded!');
    setTimeout(() => {
      if (loadingStatus) {
        loadingStatus.style.display = 'none';
      }
    }, 2000);
  } catch (error) {
    console.error('Failed to load assets:', error);
    updateStatus(`Error: ${error}`);
  }
}

// ============================================================================
// Alternative: Direct Loading Without SmartAssetLoader
// ============================================================================

async function loadDirectExample() {
  // You can also load models directly via the bridge
  // without going through SmartAssetLoader (for quick testing)

  const bridge = getSmartAssetBridge();

  // Load directly by URL
  const result = await bridge.loadDirect('/assets/models/fountain_art_deco.glb');
  const fountain = result.scene;
  fountain.position.set(0, 0, 5);
  scene.add(fountain);

  console.log('Fountain loaded directly:', fountain);
}

// ============================================================================
// Animation Loop
// ============================================================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update animation mixer if available
  const mixer = (window as any).animationMixer as THREE.AnimationMixer | undefined;
  if (mixer) {
    mixer.update(delta);
  }

  controls.update();
  renderer.render(scene, camera);
}

// ============================================================================
// Resize Handler
// ============================================================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// HTML Template
// ============================================================================

document.body.innerHTML = `
  <style>
    body {
      margin: 0;
      overflow: hidden;
      font-family: 'Courier New', monospace;
    }
    #loading-status {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: #00ffff;
      padding: 10px 20px;
      border-radius: 5px;
      border: 1px solid #00ffff;
      z-index: 1000;
    }
    #info {
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ffff;
      padding: 15px;
      border-radius: 10px;
      max-width: 300px;
    }
    #info h3 {
      margin: 0 0 10px 0;
    }
    #info ul {
      margin: 0;
      padding-left: 20px;
    }
    #info li {
      margin: 5px 0;
      opacity: 0.8;
    }
  </style>
  <div id="loading-status">Initializing...</div>
  <div id="info">
    <h3>Vanilla Three.js Example</h3>
    <ul>
      <li>Uses SmartAssetLoader</li>
      <li>Semantic asset aliases</li>
      <li>Platform-aware loading</li>
      <li>No React required</li>
    </ul>
  </div>
`;

document.body.appendChild(renderer.domElement);

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  try {
    // Initialize the asset system
    const { loader } = await initAssetSystem();

    // Load assets using semantic aliases
    await loadAssets(loader);

    // Optional: Load additional assets directly
    // await loadDirectExample();

    // Start animation loop
    animate();
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

main();

// Export for testing
export { initAssetSystem, loadAssets };
