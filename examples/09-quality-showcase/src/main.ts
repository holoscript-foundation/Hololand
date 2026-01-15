/**
 * Quality Showcase Example
 *
 * Demonstrates the quality tier system in @hololand/renderer:
 * - Quality presets (low/medium/high/ultra)
 * - HDRI environments
 * - Post-processing effects
 * - PBR material presets
 * - Performance monitoring
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  QualityManager,
  createQualityManager,
  createPostProcessingPipeline,
  createEnvironmentManager,
  createMaterialFactory,
  HDRI_PRESETS,
  QUALITY_PRESETS,
  type QualityPreset,
  type MaterialPreset,
  type PostProcessingPipeline,
  type EnvironmentManager,
  type MaterialFactory,
} from '@hololand/renderer';

// =============================================================================
// APPLICATION STATE
// =============================================================================

interface AppState {
  quality: QualityPreset;
  environment: string;
  material: MaterialPreset;
  postProcessing: {
    bloom: boolean;
    ssao: boolean;
    vignette: boolean;
    antialiasing: boolean;
  };
}

const state: AppState = {
  quality: 'high',
  environment: 'daylight',
  material: 'chrome',
  postProcessing: {
    bloom: true,
    ssao: false,
    vignette: true,
    antialiasing: true,
  },
};

// =============================================================================
// THREE.JS SETUP
// =============================================================================

const container = document.getElementById('canvas-container')!;
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(4, 3, 6);

// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1, 0);

// =============================================================================
// QUALITY SYSTEM INITIALIZATION
// =============================================================================

// Create quality manager
const qualityManager = createQualityManager({ defaultPreset: 'high' });
const qualitySettings = qualityManager.getSettings();

// Create environment manager
const environmentManager = createEnvironmentManager({
  renderer,
  scene,
  qualitySettings,
});

// Create material factory
const materialFactory = createMaterialFactory({ qualitySettings });

// Create post-processing pipeline
let postProcessing: PostProcessingPipeline | null = null;

function initPostProcessing() {
  postProcessing = createPostProcessingPipeline(renderer, scene, camera, {
    quality: state.quality === 'auto' ? 'high' : state.quality,
    bloom: {
      enabled: state.postProcessing.bloom,
      strength: 0.8,
      radius: 0.4,
      threshold: 0.85,
    },
    ssao: {
      enabled: state.postProcessing.ssao,
      radius: 0.5,
      intensity: 0.5,
    },
    vignette: {
      enabled: state.postProcessing.vignette,
      offset: 0.5,
      darkness: 0.5,
    },
    colorGrading: {
      enabled: true,
      saturation: 1.1,
      contrast: 1.05,
      brightness: 1.0,
    },
    antialiasing: state.postProcessing.antialiasing ? 'fxaa' : 'none',
    toneMapping: true,
  });
}

// =============================================================================
// SCENE OBJECTS
// =============================================================================

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0.8,
  metalness: 0.2,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Main showcase sphere
const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
let sphereMaterial = materialFactory.createFromPreset('chrome');
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 1.5, 0);
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add(sphere);

// Surrounding torus knots
const torusKnotGeometry = new THREE.TorusKnotGeometry(0.3, 0.1, 128, 32);
const torusKnots: THREE.Mesh[] = [];

for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2;
  const x = Math.cos(angle) * 3;
  const z = Math.sin(angle) * 3;

  const material = materialFactory.createFromPreset(
    ['gold', 'glass', 'metal', 'plastic', 'wood', 'emissive'][i] as MaterialPreset
  );
  const mesh = new THREE.Mesh(torusKnotGeometry, material);
  mesh.position.set(x, 1, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  torusKnots.push(mesh);
}

// Floor pedestals
const pedestalGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.1, 32);
const pedestalMaterial = materialFactory.createFromPreset('metal');

const mainPedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.8, 1, 0.2, 32),
  pedestalMaterial
);
mainPedestal.position.set(0, 0.1, 0);
mainPedestal.receiveShadow = true;
scene.add(mainPedestal);

for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2;
  const x = Math.cos(angle) * 3;
  const z = Math.sin(angle) * 3;

  const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
  pedestal.position.set(x, 0.05, z);
  pedestal.receiveShadow = true;
  scene.add(pedestal);
}

// Directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 30;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
scene.add(directionalLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// =============================================================================
// UI CONTROLS
// =============================================================================

// Quality buttons
document.querySelectorAll('.quality-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.quality-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const quality = btn.getAttribute('data-quality') as QualityPreset;
    setQuality(quality);
  });
});

// Environment select
document.getElementById('environment-select')?.addEventListener('change', (e) => {
  const env = (e.target as HTMLSelectElement).value;
  setEnvironment(env);
});

// Post-processing toggles
document.querySelectorAll('.toggle').forEach((toggle) => {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    const effect = toggle.getAttribute('data-toggle') as keyof typeof state.postProcessing;
    state.postProcessing[effect] = toggle.classList.contains('active');
    updatePostProcessing();
  });
});

// Material chips
document.querySelectorAll('.material-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.material-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');

    const material = chip.getAttribute('data-material') as MaterialPreset;
    setMaterial(material);
  });
});

// =============================================================================
// STATE UPDATES
// =============================================================================

function setQuality(quality: QualityPreset) {
  state.quality = quality;
  qualityManager.setPreset(quality);

  // Update shadow quality
  const settings = qualityManager.getSettings();
  directionalLight.shadow.mapSize.width = settings.shadowMapSize;
  directionalLight.shadow.mapSize.height = settings.shadowMapSize;
  directionalLight.shadow.map?.dispose();
  directionalLight.shadow.map = null as unknown as THREE.WebGLRenderTarget;

  // Update pixel ratio
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.pixelRatio));

  // Reinitialize post-processing
  postProcessing?.dispose();
  initPostProcessing();

  console.log(`Quality set to: ${quality}`, settings);
}

async function setEnvironment(env: string) {
  state.environment = env;

  const hdriUrl = HDRI_PRESETS[env as keyof typeof HDRI_PRESETS];
  if (hdriUrl) {
    try {
      await environmentManager.loadHDRI(hdriUrl, { setBackground: true });
      console.log(`Environment set to: ${env}`);
    } catch (error) {
      console.warn(`Failed to load HDRI for ${env}, using procedural sky`);
      environmentManager.createProceduralSky({ sunPosition: { elevation: 45, azimuth: 180 } });
    }
  } else {
    // Create procedural sky based on preset name
    const skyPresets: Record<string, { elevation: number; azimuth: number; turbidity?: number }> = {
      sunset: { elevation: 5, azimuth: 270, turbidity: 10 },
      daylight: { elevation: 60, azimuth: 180, turbidity: 2 },
      studio: { elevation: 90, azimuth: 180, turbidity: 0.1 },
      night: { elevation: -10, azimuth: 0, turbidity: 20 },
      forest: { elevation: 45, azimuth: 120, turbidity: 4 },
      city: { elevation: 30, azimuth: 200, turbidity: 8 },
    };

    const preset = skyPresets[env] || skyPresets.daylight;
    environmentManager.createProceduralSky({
      sunPosition: { elevation: preset.elevation, azimuth: preset.azimuth },
      turbidity: preset.turbidity,
    });
  }
}

function setMaterial(preset: MaterialPreset) {
  state.material = preset;

  // Dispose old material
  sphere.material.dispose();

  // Create new material
  sphereMaterial = materialFactory.createFromPreset(preset);
  sphere.material = sphereMaterial;

  console.log(`Material set to: ${preset}`);
}

function updatePostProcessing() {
  if (!postProcessing) return;

  postProcessing.setEffectEnabled('bloom', state.postProcessing.bloom);
  postProcessing.setEffectEnabled('ssao', state.postProcessing.ssao);
  postProcessing.setEffectEnabled('vignette', state.postProcessing.vignette);
  postProcessing.setAntialiasing(state.postProcessing.antialiasing ? 'fxaa' : 'none');
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

const fpsHistory: number[] = [];
let lastTime = performance.now();
let frameCount = 0;

function updateStats() {
  const now = performance.now();
  frameCount++;

  if (now - lastTime >= 1000) {
    const fps = Math.round(frameCount * 1000 / (now - lastTime));
    fpsHistory.push(fps);
    if (fpsHistory.length > 60) fpsHistory.shift();

    const avgFps = Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length);

    const fpsEl = document.getElementById('fps-value');
    if (fpsEl) {
      fpsEl.textContent = String(avgFps);
      fpsEl.className = 'stat-value ' + (avgFps >= 55 ? 'good' : avgFps >= 30 ? 'warn' : 'bad');
    }

    const drawCallsEl = document.getElementById('draw-calls');
    if (drawCallsEl) {
      drawCallsEl.textContent = String(renderer.info.render.calls);
    }

    const trianglesEl = document.getElementById('triangles');
    if (trianglesEl) {
      trianglesEl.textContent = formatNumber(renderer.info.render.triangles);
    }

    frameCount = 0;
    lastTime = now;
  }
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// Update GPU tier display
const gpuEl = document.getElementById('gpu-tier');
if (gpuEl) {
  gpuEl.textContent = qualityManager.getDeviceType();
}

// =============================================================================
// ANIMATION LOOP
// =============================================================================

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  // Rotate main sphere
  sphere.rotation.y = time * 0.3;

  // Animate torus knots
  torusKnots.forEach((knot, i) => {
    knot.rotation.x = time * 0.5 + i;
    knot.rotation.y = time * 0.3 + i;
    knot.position.y = 1 + Math.sin(time + i) * 0.2;
  });

  // Update controls
  controls.update();

  // Render
  if (postProcessing && state.postProcessing.bloom) {
    postProcessing.render();
  } else {
    renderer.render(scene, camera);
  }

  // Update performance stats
  updateStats();
}

// =============================================================================
// WINDOW RESIZE
// =============================================================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postProcessing?.setSize(window.innerWidth, window.innerHeight);
});

// =============================================================================
// INITIALIZATION
// =============================================================================

async function init() {
  // Initialize post-processing
  initPostProcessing();

  // Load initial environment
  await setEnvironment('daylight');

  // Start animation loop
  animate();

  console.log('Quality Showcase initialized');
  console.log('Device type:', qualityManager.getDeviceType());
  console.log('GPU tier:', qualityManager.getGPUTier());
  console.log('Quality settings:', qualityManager.getSettings());
}

init();
