/**
 * VR Performance Degradation System - Complete Usage Example
 *
 * This example demonstrates:
 * 1. Three.js integration with automatic quality adjustment
 * 2. User interface for manual quality control
 * 3. Performance metrics display (HUD)
 * 4. Telemetry event logging
 * 5. Scene updates and dynamic object management
 */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import {
  createThreeVRPerformanceManager,
  type ThreeVRPerformanceManager,
} from '../../../three/src/VRPerformanceIntegration';
import { QualityLevel } from '../VRPerformanceDegradationManager';

// =============================================================================
// SCENE SETUP
// =============================================================================

class VRPerformanceDemo {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private vrPerformance: ThreeVRPerformanceManager;
  private clock: THREE.Clock;
  private objects: THREE.Mesh[] = [];
  private lights: THREE.Light[] = [];
  private particles: THREE.Points[] = [];

  constructor(container: HTMLElement) {
    // Initialize Three.js
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Add VR button
    container.appendChild(VRButton.createButton(this.renderer));

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 3);

    // Clock for animations
    this.clock = new THREE.Clock();

    // Setup scene objects
    this.setupLights();
    this.setupGeometry();
    this.setupParticles();

    // Initialize VR performance manager
    this.vrPerformance = createThreeVRPerformanceManager(
      this.renderer,
      this.scene,
      this.camera,
      {
        targetFrameTime: 11.1, // 90fps for VR
        escalationThreshold: 85, // Escalate if FPS < 85
        deEscalationThreshold: 92, // De-escalate if FPS > 92
        escalationDuration: 5, // Wait 5 seconds before escalating
        deEscalationDuration: 30, // Wait 30 seconds before de-escalating
        monitoringWindow: 300, // Monitor 300 frames (~3.3s at 90fps)
        autoAdjust: true, // Enable automatic quality adjustment
        enableTelemetry: true, // Track escalation events
      }
    );

    // Setup event listeners
    this.setupEventListeners();

    // Setup UI
    this.setupUI();

    // Start monitoring and rendering
    this.start();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENE SETUP
  // ───────────────────────────────────────────────────────────────────────────

  private setupLights(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);
    this.lights.push(ambient);

    // Directional light (sun) with shadows
    const directional = new THREE.DirectionalLight(0xffffff, 1.0);
    directional.position.set(5, 10, 5);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    this.scene.add(directional);
    this.lights.push(directional);

    // Point lights for atmosphere
    for (let i = 0; i < 6; i++) {
      const pointLight = new THREE.PointLight(0x00ffff, 0.5, 10);
      pointLight.position.set(
        Math.cos((i / 6) * Math.PI * 2) * 5,
        2,
        Math.sin((i / 6) * Math.PI * 2) * 5
      );
      this.scene.add(pointLight);
      this.lights.push(pointLight);
    }
  }

  private setupGeometry(): void {
    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.objects.push(ground);

    // Create rotating cubes with varying complexity
    for (let i = 0; i < 50; i++) {
      const size = 0.2 + Math.random() * 0.3;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
        roughness: 0.5,
        metalness: 0.5,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        0.5 + Math.random() * 3,
        (Math.random() - 0.5) * 10
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Store original geometry for LOD
      mesh.userData.lodGeometries = {
        0: geometry, // Full detail
        1: new THREE.BoxGeometry(size, size, size, 2, 2, 2), // LOD1
        2: new THREE.BoxGeometry(size, size, size, 1, 1, 1), // LOD2
      };

      this.scene.add(mesh);
      this.objects.push(mesh);
    }
  }

  private setupParticles(): void {
    // Create particle system
    const particleCount = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 20;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    this.particles.push(particles);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ───────────────────────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    // Listen to quality degradation events
    this.vrPerformance.getDegradationManager().onDegradationEvent((event) => {
      console.log(
        `[VR Performance] ${event.event}: L${event.fromLevel} → L${event.toLevel}`
      );
      console.log(`  Reason: ${event.reason}`);
      console.log(`  FPS: ${(1000 / event.frameStats.average).toFixed(1)}`);
      console.log(`  p95: ${event.frameStats.p95.toFixed(2)}ms`);

      // Log to analytics (example)
      this.logTelemetry(event);

      // Show notification to user
      this.showQualityChangeNotification(event);
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private logTelemetry(event: any): void {
    // Example: Send to analytics backend
    // fetch('/api/analytics/vr-performance', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     event: event.event,
    //     fromLevel: event.fromLevel,
    //     toLevel: event.toLevel,
    //     reason: event.reason,
    //     avgFPS: 1000 / event.frameStats.average,
    //     p95: event.frameStats.p95,
    //     timestamp: event.timestamp,
    //   }),
    // });
  }

  private showQualityChangeNotification(event: any): void {
    const levelNames = [
      'Full Quality',
      'Reduced Shadows',
      'Reduced Textures',
      'No Post-Processing',
      'Simplified Geometry',
    ];

    const message =
      event.event === 'escalation'
        ? `Quality reduced to ${levelNames[event.toLevel]} for better performance`
        : event.event === 'de-escalation'
        ? `Quality restored to ${levelNames[event.toLevel]}`
        : `Quality set to ${levelNames[event.toLevel]}`;

    // Show notification (example using simple DOM)
    const notification = document.createElement('div');
    notification.className = 'vr-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UI SETUP
  // ───────────────────────────────────────────────────────────────────────────

  private setupUI(): void {
    const container = document.createElement('div');
    container.id = 'vr-performance-ui';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      min-width: 300px;
    `;

    container.innerHTML = `
      <h3 style="margin: 0 0 10px 0;">VR Performance</h3>

      <!-- Auto-adjust toggle -->
      <label style="display: block; margin-bottom: 10px;">
        <input type="checkbox" id="auto-adjust" checked>
        Auto-Adjust Quality
      </label>

      <!-- Manual quality selector -->
      <div style="margin-bottom: 10px;">
        <label>Quality Level:</label>
        <select id="quality-level" disabled style="width: 100%; margin-top: 5px;">
          <option value="0">Level 0: Full Quality</option>
          <option value="1">Level 1: Reduced Shadows (~15% faster)</option>
          <option value="2">Level 2: Reduced Textures (~30% faster)</option>
          <option value="3">Level 3: No Post-Processing (~50% faster)</option>
          <option value="4">Level 4: Simplified Geometry (~70% faster)</option>
        </select>
      </div>

      <!-- Performance metrics -->
      <div id="metrics" style="border-top: 1px solid #555; padding-top: 10px; margin-top: 10px;">
        <div>FPS: <span id="fps">-</span></div>
        <div>Frame Time: <span id="frame-time">-</span> ms</div>
        <div>p95: <span id="p95">-</span> ms</div>
        <div>Quality Level: <span id="current-level">0</span></div>
        <div>Jank: <span id="jank">-</span>%</div>
        <div>Budget: <span id="budget">-</span>%</div>
        <div>Escalations: <span id="escalations">0</span></div>
      </div>
    `;

    document.body.appendChild(container);

    // Auto-adjust toggle
    const autoAdjustCheckbox = document.getElementById('auto-adjust') as HTMLInputElement;
    const qualitySelect = document.getElementById('quality-level') as HTMLSelectElement;

    autoAdjustCheckbox.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      qualitySelect.disabled = enabled;

      if (enabled) {
        this.vrPerformance.unlockQualityLevel();
      }
    });

    // Manual quality change
    qualitySelect.addEventListener('change', (e) => {
      const level = parseInt((e.target as HTMLSelectElement).value) as QualityLevel;
      this.vrPerformance.setQualityLevel(level, true); // Lock to this level
    });

    // Update metrics every 500ms
    setInterval(() => {
      this.updateMetrics();
    }, 500);
  }

  private updateMetrics(): void {
    const metrics = this.vrPerformance.getMetrics();
    const stats = metrics.frameStats;
    const fps = stats.totalFrames > 0 ? 1000 / stats.average : 0;
    const jankPercent = stats.totalFrames > 0 ? (stats.jankFrames / stats.totalFrames) * 100 : 0;

    // Update DOM
    const fpsElem = document.getElementById('fps');
    const frameTimeElem = document.getElementById('frame-time');
    const p95Elem = document.getElementById('p95');
    const levelElem = document.getElementById('current-level');
    const jankElem = document.getElementById('jank');
    const budgetElem = document.getElementById('budget');
    const escalationsElem = document.getElementById('escalations');

    if (fpsElem) {
      const fpsColor = fps >= 90 ? '#0f0' : fps >= 85 ? '#ff0' : '#f00';
      fpsElem.innerHTML = `<span style="color: ${fpsColor}">${fps.toFixed(1)}</span>`;
    }

    if (frameTimeElem) frameTimeElem.textContent = stats.current.toFixed(2);
    if (p95Elem) p95Elem.textContent = stats.p95.toFixed(2);
    if (levelElem) levelElem.textContent = metrics.currentLevel.toString();
    if (jankElem) jankElem.textContent = jankPercent.toFixed(1);
    if (budgetElem) budgetElem.textContent = metrics.frameTimeBudgetCompliance.toFixed(1);
    if (escalationsElem) escalationsElem.textContent = metrics.totalEscalations.toString();

    // Update quality selector to match current level
    const qualitySelect = document.getElementById('quality-level') as HTMLSelectElement;
    if (qualitySelect) {
      qualitySelect.value = metrics.currentLevel.toString();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ANIMATION & RENDERING
  // ───────────────────────────────────────────────────────────────────────────

  private animate = () => {
    const delta = this.clock.getDelta();

    // Rotate objects
    for (const obj of this.objects) {
      if (obj.geometry.type === 'BoxGeometry') {
        obj.rotation.x += delta * 0.5;
        obj.rotation.y += delta * 0.3;
      }
    }

    // Rotate particles
    for (const particles of this.particles) {
      particles.rotation.y += delta * 0.1;
    }

    // Render will be called by VR performance manager
  };

  public start(): void {
    // Start VR performance monitoring with automatic quality adjustment
    this.vrPerformance.startMonitoring(() => {
      // Animation updates
      this.animate();

      // Render
      this.renderer.render(this.scene, this.camera);
    });

    console.log('[VR Performance Demo] Started monitoring and rendering');
    console.log(this.vrPerformance.generateReport());
  }

  public stop(): void {
    this.vrPerformance.stopMonitoring();
    console.log('[VR Performance Demo] Stopped monitoring');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DYNAMIC SCENE UPDATES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Add more objects dynamically (simulates scene complexity increase)
   */
  public addObjects(count: number): void {
    for (let i = 0; i < count; i++) {
      const size = 0.2 + Math.random() * 0.3;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        0.5 + Math.random() * 3,
        (Math.random() - 0.5) * 10
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.scene.add(mesh);
      this.objects.push(mesh);
    }

    // Update VR performance manager with new scene state
    this.vrPerformance.updateRenderingState({
      scene: this.scene,
      meshes: this.objects,
      lights: this.lights,
      particleSystems: this.particles,
    });

    console.log(`[VR Performance Demo] Added ${count} objects (total: ${this.objects.length})`);
  }

  /**
   * Remove objects (simulates scene simplification)
   */
  public removeObjects(count: number): void {
    for (let i = 0; i < count && this.objects.length > 0; i++) {
      const obj = this.objects.pop();
      if (obj) {
        this.scene.remove(obj);
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    }

    // Update VR performance manager
    this.vrPerformance.updateRenderingState({
      meshes: this.objects,
    });

    console.log(`[VR Performance Demo] Removed ${count} objects (total: ${this.objects.length})`);
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app') || document.body;
  const demo = new VRPerformanceDemo(container);

  // Expose to window for debugging
  (window as any).vrDemo = demo;

  console.log('VR Performance Demo initialized');
  console.log('Available commands:');
  console.log('  vrDemo.addObjects(50)    - Add 50 objects (increase complexity)');
  console.log('  vrDemo.removeObjects(50) - Remove 50 objects (decrease complexity)');
  console.log('  vrDemo.stop()            - Stop performance monitoring');
  console.log('  vrDemo.start()           - Start performance monitoring');
});
