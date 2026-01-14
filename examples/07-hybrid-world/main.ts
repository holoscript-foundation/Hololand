/**
 * Hololand Hybrid World Example
 *
 * Demonstrates 2D UI controlling a 3D VR world
 * This is the core Phase 2 hybrid rendering mode
 */

import { HololandWorld } from '@hololand/world';
import { HololandRenderer } from '@hololand/renderer';
import {
  UICanvas,
  Button,
  Panel,
  Text,
  Slider,
  Toggle,
  Dropdown,
  Modal,
  darkTheme,
} from '@hololand/ui';
import type { DropdownOption } from '@hololand/ui';

// ============================================================================
// Setup 3D World
// ============================================================================
const worldCanvas = document.getElementById('world-canvas') as HTMLCanvasElement;
worldCanvas.width = window.innerWidth;
worldCanvas.height = window.innerHeight;

// Create Hololand world
const world = new HololandWorld();

// Create 3D renderer
const renderer = new HololandRenderer(worldCanvas, world, {
  enableVR: true,
  enableShadows: true,
  backgroundColor: 0x0a0a12,
  cameraPosition: { x: 8, y: 6, z: 8 },
});

// Add initial objects to world
const platform = world.createObject('platform', {
  position: { x: 0, y: -0.5, z: 0 },
  scale: { x: 20, y: 1, z: 20 },
  metadata: { color: 0x1a1a2e, name: 'Ground' },
});

const centerOrb = world.createObject('orb', {
  position: { x: 0, y: 2, z: 0 },
  scale: { x: 2, y: 2, z: 2 },
  metadata: { color: 0x6366f1, glow: true, name: 'Central Orb' },
});

// Track spawned objects
let spawnedObjects: string[] = [];
let objectCounter = 0;

// ============================================================================
// Setup 2D UI Overlay
// ============================================================================
const uiCanvas = document.getElementById('ui-canvas') as HTMLCanvasElement;
uiCanvas.width = 320;
uiCanvas.height = window.innerHeight;

const ui = new UICanvas(uiCanvas, {
  width: 320,
  height: window.innerHeight,
  transparent: true,
});

// Colors
const colors = {
  panelBg: 'rgba(26, 26, 46, 0.95)',
  surface: 'rgba(37, 37, 66, 0.9)',
  primary: '#6366f1',
  text: '#e0e0e0',
  textSecondary: '#9ca3af',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

// ============================================================================
// Control Panel
// ============================================================================
const controlPanel = new Panel({
  position: { x: 10, y: 10 },
  size: { width: 300, height: 580 },
  backgroundColor: colors.panelBg,
  borderRadius: 16,
});

// Title
const title = new Text({
  position: { x: 20, y: 20 },
  content: 'World Controls',
  fontSize: 20,
  color: colors.text,
  fontWeight: '600',
});
controlPanel.addChild(title);

const subtitle = new Text({
  position: { x: 20, y: 48 },
  content: '2D UI controlling 3D world',
  fontSize: 12,
  color: colors.textSecondary,
});
controlPanel.addChild(subtitle);

// ============================================================================
// Object Spawning Section
// ============================================================================
const spawnTitle = new Text({
  position: { x: 20, y: 90 },
  content: 'Spawn Objects',
  fontSize: 14,
  color: colors.text,
  fontWeight: '500',
});
controlPanel.addChild(spawnTitle);

// Object type dropdown
const objectTypes: DropdownOption[] = [
  { value: 'cube', label: 'Cube' },
  { value: 'sphere', label: 'Sphere' },
  { value: 'cylinder', label: 'Cylinder' },
];

let selectedObjectType = 'cube';

const objectDropdown = new Dropdown({
  position: { x: 20, y: 115 },
  size: { width: 180, height: 36 },
  options: objectTypes,
  value: 'cube',
  backgroundColor: colors.surface,
  textColor: colors.text,
  borderRadius: 8,
  onChange: (value) => {
    selectedObjectType = value;
    console.log('Object type:', value);
  },
});
controlPanel.addChild(objectDropdown);

// Spawn button
const spawnBtn = new Button({
  position: { x: 210, y: 115 },
  size: { width: 70, height: 36 },
  text: 'Spawn',
  backgroundColor: colors.primary,
  textColor: '#ffffff',
  borderRadius: 8,
  onClick: () => {
    spawnObject(selectedObjectType);
  },
});
controlPanel.addChild(spawnBtn);

// Object count
const objectCountText = new Text({
  position: { x: 20, y: 165 },
  content: 'Objects: 2',
  fontSize: 12,
  color: colors.textSecondary,
});
controlPanel.addChild(objectCountText);

// Clear all button
const clearBtn = new Button({
  position: { x: 160, y: 158 },
  size: { width: 120, height: 28 },
  text: 'Clear All',
  backgroundColor: colors.error,
  textColor: '#ffffff',
  borderRadius: 6,
  fontSize: 12,
  onClick: () => {
    clearAllObjects();
  },
});
controlPanel.addChild(clearBtn);

// ============================================================================
// Central Orb Controls
// ============================================================================
const orbTitle = new Text({
  position: { x: 20, y: 210 },
  content: 'Central Orb',
  fontSize: 14,
  color: colors.text,
  fontWeight: '500',
});
controlPanel.addChild(orbTitle);

// Size slider
const sizeLabel = new Text({
  position: { x: 20, y: 245 },
  content: 'Size',
  fontSize: 12,
  color: colors.textSecondary,
});
controlPanel.addChild(sizeLabel);

const sizeSlider = new Slider({
  position: { x: 60, y: 238 },
  size: { width: 180, height: 24 },
  min: 0.5,
  max: 5,
  value: 2,
  step: 0.1,
  showValue: true,
  activeTrackColor: colors.primary,
  onChange: (value) => {
    centerOrb.setScale({ x: value, y: value, z: value });
    console.log('Orb size:', value);
  },
});
controlPanel.addChild(sizeSlider);

// Height slider
const heightLabel = new Text({
  position: { x: 20, y: 285 },
  content: 'Height',
  fontSize: 12,
  color: colors.textSecondary,
});
controlPanel.addChild(heightLabel);

const heightSlider = new Slider({
  position: { x: 60, y: 278 },
  size: { width: 180, height: 24 },
  min: 1,
  max: 10,
  value: 2,
  step: 0.5,
  showValue: true,
  activeTrackColor: colors.warning,
  onChange: (value) => {
    const pos = centerOrb.getPosition();
    centerOrb.setPosition({ x: pos.x, y: value, z: pos.z });
    console.log('Orb height:', value);
  },
});
controlPanel.addChild(heightSlider);

// Glow toggle
const glowToggle = new Toggle({
  position: { x: 20, y: 320 },
  checked: true,
  label: 'Enable Glow',
  trackColorOn: colors.primary,
  labelColor: colors.text,
  onChange: (checked) => {
    centerOrb.setMetadata({ ...centerOrb.getMetadata(), glow: checked });
    console.log('Glow:', checked);
  },
});
controlPanel.addChild(glowToggle);

// ============================================================================
// Camera Controls
// ============================================================================
const cameraTitle = new Text({
  position: { x: 20, y: 370 },
  content: 'Camera',
  fontSize: 14,
  color: colors.text,
  fontWeight: '500',
});
controlPanel.addChild(cameraTitle);

// Auto-rotate toggle
const rotateToggle = new Toggle({
  position: { x: 20, y: 400 },
  checked: false,
  label: 'Auto-Rotate',
  trackColorOn: colors.success,
  labelColor: colors.text,
  onChange: (checked) => {
    const controls = renderer.getRenderer().domElement;
    // In real implementation, would toggle OrbitControls autoRotate
    console.log('Auto-rotate:', checked);
  },
});
controlPanel.addChild(rotateToggle);

// Reset camera button
const resetCameraBtn = new Button({
  position: { x: 20, y: 445 },
  size: { width: 120, height: 36 },
  text: 'Reset View',
  backgroundColor: colors.surface,
  textColor: colors.text,
  borderRadius: 8,
  onClick: () => {
    // Reset camera position
    const camera = renderer.getCamera();
    camera.position.set(8, 6, 8);
    camera.lookAt(0, 0, 0);
    console.log('Camera reset');
  },
});
controlPanel.addChild(resetCameraBtn);

// VR button
const vrBtn = new Button({
  position: { x: 150, y: 445 },
  size: { width: 130, height: 36 },
  text: 'Enter VR',
  backgroundColor: colors.primary,
  textColor: '#ffffff',
  borderRadius: 8,
  onClick: () => {
    // VR is handled by Three.js VRButton
    console.log('VR requested - use browser VR button');
    showNotification('Use the VR button in the 3D view');
  },
});
controlPanel.addChild(vrBtn);

// ============================================================================
// Stats Display
// ============================================================================
const statsPanel = new Panel({
  position: { x: 20, y: 500 },
  size: { width: 260, height: 60 },
  backgroundColor: colors.surface,
  borderRadius: 8,
});

const fpsText = new Text({
  position: { x: 15, y: 15 },
  content: 'FPS: 60',
  fontSize: 12,
  color: colors.success,
});
statsPanel.addChild(fpsText);

const objectsText = new Text({
  position: { x: 15, y: 35 },
  content: 'Triangles: ~1.2K',
  fontSize: 12,
  color: colors.textSecondary,
});
statsPanel.addChild(objectsText);

const modeText = new Text({
  position: { x: 130, y: 15 },
  content: 'Mode: Desktop',
  fontSize: 12,
  color: colors.text,
});
statsPanel.addChild(modeText);

const rendererText = new Text({
  position: { x: 130, y: 35 },
  content: 'Renderer: WebGL2',
  fontSize: 12,
  color: colors.textSecondary,
});
statsPanel.addChild(rendererText);

controlPanel.addChild(statsPanel);
ui.add(controlPanel);

// ============================================================================
// Notification Modal
// ============================================================================
const notification = new Modal({
  position: { x: 10, y: window.innerHeight - 80 },
  size: { width: 300, height: 60 },
  title: '',
  content: '',
  visible: false,
  backgroundColor: colors.surface,
  borderRadius: 12,
  showOverlay: false,
  closeButton: false,
  padding: 15,
});
notification.setCanvasSize(320, window.innerHeight);
ui.add(notification);

function showNotification(message: string) {
  notification.content = message;
  notification.open();
  setTimeout(() => notification.close(), 3000);
}

// ============================================================================
// World Control Functions
// ============================================================================
function spawnObject(type: string) {
  const randomX = (Math.random() - 0.5) * 10;
  const randomZ = (Math.random() - 0.5) * 10;
  const randomColor = Math.floor(Math.random() * 0xffffff);

  const objType = type === 'sphere' ? 'orb' : type;
  const obj = world.createObject(objType, {
    position: { x: randomX, y: 1, z: randomZ },
    scale: { x: 1, y: 1, z: 1 },
    metadata: { color: randomColor, name: `${type}_${objectCounter++}` },
  });

  spawnedObjects.push(obj.id);
  updateObjectCount();
  showNotification(`Spawned ${type} at (${randomX.toFixed(1)}, 1, ${randomZ.toFixed(1)})`);
}

function clearAllObjects() {
  spawnedObjects.forEach((id) => {
    world.removeObject(id);
  });
  spawnedObjects = [];
  objectCounter = 0;
  updateObjectCount();
  showNotification('Cleared all spawned objects');
}

function updateObjectCount() {
  const total = 2 + spawnedObjects.length; // platform + orb + spawned
  objectCountText.content = `Objects: ${total}`;
}

// ============================================================================
// Start Everything
// ============================================================================

// Start 3D renderer
renderer.start();

// Start 2D UI
ui.start();

// Handle window resize
window.addEventListener('resize', () => {
  worldCanvas.width = window.innerWidth;
  worldCanvas.height = window.innerHeight;
  renderer.resize(window.innerWidth, window.innerHeight);

  uiCanvas.height = window.innerHeight;
  ui.resize(320, window.innerHeight);
  notification.setCanvasSize(320, window.innerHeight);
  notification.y = window.innerHeight - 80;
});

// FPS counter
let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    fpsText.content = `FPS: ${frameCount}`;
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(updateFPS);
}
updateFPS();

console.log('Hololand Hybrid World started!');
console.log('');
console.log('This example demonstrates:');
console.log('- 2D UI overlay on 3D world');
console.log('- Spawning 3D objects from UI controls');
console.log('- Real-time object manipulation');
console.log('- Camera controls');
console.log('- VR-ready rendering');
