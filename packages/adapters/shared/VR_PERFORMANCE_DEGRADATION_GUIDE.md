# VR Performance Degradation System - Complete Guide

## Overview

The VR Performance Degradation System implements **graceful degradation** for VR rendering, automatically adjusting quality settings to maintain a target frame rate of **90fps (11.1ms frame budget)**. This eliminates VR stuttering and motion sickness by ensuring consistent performance.

### Key Features

- **5-Level Quality Degradation**: Progressive quality reduction from Full Quality to Simplified Geometry
- **Automatic Escalation**: Degrades quality when FPS drops below threshold for sustained period
- **Automatic De-Escalation**: Restores quality when performance improves
- **User Override**: Allow users to manually lock quality level (accessibility requirement)
- **Comprehensive Metrics**: Frame time distribution, escalation frequency, budget compliance
- **Renderer-Agnostic Core**: Works with Three.js, Babylon.js, or any WebGL renderer

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         VRPerformanceDegradationManager (Core)              │
│  - Frame time monitoring                                    │
│  - Quality level state machine                              │
│  - Escalation/de-escalation logic                          │
│  - Metrics tracking & telemetry                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  Three.js        │   │  Babylon.js      │
│  Integration     │   │  Integration     │
│                  │   │                  │
│ - Apply shadows  │   │ - Apply shadows  │
│ - Texture LOD    │   │ - Texture LOD    │
│ - Post-FX        │   │ - Post-FX        │
│ - Geometry LOD   │   │ - Geometry LOD   │
│ - Particles      │   │ - Particles      │
└──────────────────┘   └──────────────────┘
```

## Quality Levels

### Level 0: Full Quality (Baseline)
- **Performance Gain**: 0%
- **Settings**:
  - Shadows: Enabled, 2048px resolution, 4 cascades
  - Ambient Occlusion: Enabled
  - Textures: Full resolution, 16x anisotropic filtering
  - Post-Processing: All effects enabled (bloom, DOF, motion blur, CA, vignette, color grading)
  - Geometry: LOD0, 100% particles
  - Pixel Ratio: 1.0x
  - Antialiasing: MSAA 4x
  - Max Lights: 8

### Level 1: Reduced Shadows
- **Performance Gain**: ~15%
- **Changes from Level 0**:
  - Shadows: 1024px resolution (50% reduction), 2 cascades
  - Ambient Occlusion: Disabled
  - Antialiasing: MSAA 2x
  - Max Lights: 6

### Level 2: Reduced Textures
- **Performance Gain**: ~30%
- **Changes from Level 1**:
  - Textures: LOD bias +1 (half resolution), 8x anisotropic filtering
  - Motion Blur: Disabled
  - Chromatic Aberration: Disabled
  - Antialiasing: SMAA
  - Max Lights: 4

### Level 3: No Post-Processing
- **Performance Gain**: ~50%
- **Changes from Level 2**:
  - Shadows: 512px resolution, 1 cascade
  - Textures: 4x anisotropic filtering
  - Post-Processing: All effects disabled
  - Geometry: LOD1, 75% particles
  - Pixel Ratio: 0.9x
  - Antialiasing: FXAA
  - Max Lights: 3

### Level 4: Simplified Geometry
- **Performance Gain**: ~70%
- **Changes from Level 3**:
  - Shadows: Disabled
  - Textures: LOD bias +2 (quarter resolution), 2x anisotropic filtering
  - Geometry: LOD2, 25% particles
  - Mesh Simplification: 70% of original triangles
  - Pixel Ratio: 0.8x
  - Antialiasing: None
  - Max Lights: 2

## Escalation Logic

### Escalation (Performance Degradation)
**Trigger**: Sustained FPS < 85 for 5 seconds
**Action**: Degrade quality by one level

```
Frame Rate → 80fps (below 85fps threshold)
   ↓
Wait 5 seconds
   ↓
Still below threshold?
   ↓
YES → Escalate to next lower quality level
   ↓
Apply new quality settings (e.g., L0 → L1)
   ↓
Continue monitoring
```

### De-Escalation (Performance Improvement)
**Trigger**: Sustained FPS > 92 for 30 seconds
**Action**: Restore quality by one level

```
Frame Rate → 95fps (above 92fps threshold)
   ↓
Wait 30 seconds (hysteresis to prevent oscillation)
   ↓
Still above threshold?
   ↓
YES → De-escalate to next higher quality level
   ↓
Apply new quality settings (e.g., L1 → L0)
   ↓
Continue monitoring
```

## Usage Examples

### Three.js Integration

```typescript
import * as THREE from 'three';
import { createThreeVRPerformanceManager } from '@hololand/adapters-three';

// Setup scene
const renderer = new THREE.WebGLRenderer({ antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create VR performance manager
const vrPerformance = createThreeVRPerformanceManager(renderer, scene, camera, {
  targetFrameTime: 11.1, // 90fps
  escalationThreshold: 85, // fps
  deEscalationThreshold: 92, // fps
  escalationDuration: 5, // seconds
  deEscalationDuration: 30, // seconds
  autoAdjust: true,
});

// Start monitoring and auto-adjustment
vrPerformance.startMonitoring(() => {
  // Your render logic here
  renderer.render(scene, camera);
});

// Listen to quality changes
vrPerformance.getDegradationManager().onDegradationEvent((event) => {
  console.log(`Quality changed: ${event.fromLevel} → ${event.toLevel}`);
  console.log(`Reason: ${event.reason}`);
  console.log(`Current FPS: ${1000 / event.frameStats.average}`);
});

// Get metrics
const metrics = vrPerformance.getMetrics();
console.log(`Current Level: ${metrics.currentLevel}`);
console.log(`Budget Compliance: ${metrics.frameTimeBudgetCompliance.toFixed(1)}%`);
console.log(`Total Escalations: ${metrics.totalEscalations}`);

// User override (e.g., from settings UI)
vrPerformance.setQualityLevel(QualityLevel.REDUCED_SHADOWS, true); // Lock to Level 1
vrPerformance.unlockQualityLevel(); // Re-enable auto-adjust
```

### Babylon.js Integration

```typescript
import { Engine, Scene } from '@babylonjs/core';
import { createBabylonVRPerformanceManager } from '@hololand/adapters-babylon';

// Setup scene
const canvas = document.getElementById('renderCanvas');
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

// Create VR performance manager
const vrPerformance = createBabylonVRPerformanceManager(engine, scene, undefined, {
  targetFrameTime: 11.1,
  escalationThreshold: 85,
  deEscalationThreshold: 92,
});

// Start monitoring
vrPerformance.startMonitoring();

// Render loop (Babylon.js handles this internally)
engine.runRenderLoop(() => {
  scene.render();
});

// Get performance report
console.log(vrPerformance.generateReport());
```

### Custom Render Loop Integration

```typescript
import { VRPerformanceDegradationManager } from '@hololand/adapters-shared';

const manager = new VRPerformanceDegradationManager({
  targetFrameTime: 11.1,
  escalationThreshold: 85,
  deEscalationThreshold: 92,
});

let lastTime = performance.now();

function render() {
  const now = performance.now();
  const frameTime = now - lastTime;
  lastTime = now;

  // Record frame time
  manager.recordFrame(frameTime);

  // Get current quality settings
  const quality = manager.getCurrentQualitySettings();

  // Apply settings to your renderer
  applyQualitySettings(renderer, quality);

  // Render frame
  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

render();
```

## User Interface Integration

### Settings UI Example

```typescript
import { QualityLevel } from '@hololand/adapters-shared';

function createQualitySettingsUI(vrPerformance) {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="vr-quality-settings">
      <h3>VR Quality Settings</h3>

      <label>
        <input type="checkbox" id="auto-adjust" checked>
        Auto-Adjust Quality
      </label>

      <select id="quality-level" disabled>
        <option value="0">Level 0: Full Quality</option>
        <option value="1">Level 1: Reduced Shadows (~15% faster)</option>
        <option value="2">Level 2: Reduced Textures (~30% faster)</option>
        <option value="3">Level 3: No Post-Processing (~50% faster)</option>
        <option value="4">Level 4: Simplified Geometry (~70% faster)</option>
      </select>

      <div id="metrics">
        <p>Current FPS: <span id="fps">-</span></p>
        <p>Quality Level: <span id="level">0</span></p>
        <p>Frame Budget Compliance: <span id="compliance">-</span>%</p>
      </div>
    </div>
  `;

  const autoAdjustCheckbox = container.querySelector('#auto-adjust');
  const qualitySelect = container.querySelector('#quality-level');

  // Auto-adjust toggle
  autoAdjustCheckbox.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    qualitySelect.disabled = enabled;

    if (enabled) {
      vrPerformance.unlockQualityLevel();
    }
  });

  // Manual quality change
  qualitySelect.addEventListener('change', (e) => {
    const level = parseInt(e.target.value);
    vrPerformance.setQualityLevel(level, true); // Lock to this level
  });

  // Update metrics every second
  setInterval(() => {
    const metrics = vrPerformance.getMetrics();
    const fps = 1000 / metrics.frameStats.average;

    container.querySelector('#fps').textContent = fps.toFixed(1);
    container.querySelector('#level').textContent = metrics.currentLevel;
    container.querySelector('#compliance').textContent = metrics.frameTimeBudgetCompliance.toFixed(1);

    qualitySelect.value = metrics.currentLevel;
  }, 1000);

  return container;
}
```

### HUD Overlay Example

```typescript
function createVRPerformanceHUD(vrPerformance) {
  const hud = document.createElement('div');
  hud.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    border-radius: 5px;
    z-index: 9999;
  `;

  function update() {
    const metrics = vrPerformance.getMetrics();
    const stats = metrics.frameStats;
    const fps = 1000 / stats.average;
    const levelConfig = vrPerformance.getDegradationManager().getQualityLevelConfig(metrics.currentLevel);

    const fpsColor = fps >= 90 ? '#0f0' : fps >= 85 ? '#ff0' : '#f00';
    const jankPercent = (stats.jankFrames / stats.totalFrames * 100).toFixed(1);

    hud.innerHTML = `
      <strong>VR Performance</strong><br>
      FPS: <span style="color: ${fpsColor}">${fps.toFixed(1)}</span><br>
      Frame: ${stats.current.toFixed(2)}ms (p95: ${stats.p95.toFixed(2)}ms)<br>
      Quality: L${metrics.currentLevel} - ${levelConfig.name}<br>
      Jank: ${stats.jankFrames} / ${stats.totalFrames} (${jankPercent}%)<br>
      Budget: ${metrics.frameTimeBudgetCompliance.toFixed(1)}%<br>
      ${metrics.userOverrideActive ? '<strong style="color: #ff0">LOCKED</strong>' : 'Auto'}
    `;

    requestAnimationFrame(update);
  }

  update();
  return hud;
}
```

## Best Practices

### 1. Integration Timing
- Initialize VR performance manager **after** scene setup
- Start monitoring **before** entering VR mode
- Update rendering state when scene changes significantly

### 2. Escalation Tuning
- **Conservative**: Longer escalation duration (10s) for stable experiences
- **Aggressive**: Shorter escalation duration (2s) for demanding scenes
- **Hysteresis**: Keep de-escalation duration > escalation duration (e.g., 30s vs 5s)

### 3. User Experience
- **Show Quality Changes**: Display brief notification when quality changes
- **Accessibility**: Always provide manual quality lock option
- **Transparency**: Show current quality level in settings/HUD
- **Presets**: Offer "Performance", "Balanced", "Quality" presets

### 4. Monitoring
- Log escalation events to analytics
- Track budget compliance over time
- Monitor user override frequency (high = system too aggressive)
- Review p95/p99 frame times for outliers

### 5. Testing
- **Stress Test**: Force worst-case scenarios (many lights, particles, complex geometry)
- **Verify LOD**: Ensure LOD geometries exist for all quality levels
- **Check Hysteresis**: Verify system doesn't oscillate between levels
- **User Testing**: Measure motion sickness reduction (goal: 100% elimination)

## Performance Metrics

### Key Performance Indicators (KPIs)

1. **Frame Time Budget Compliance**
   - Target: >95%
   - Measures percentage of frames within 11.1ms budget
   - Formula: `(frames <= 11.1ms) / total_frames * 100`

2. **Jank Frame Rate**
   - Target: <2%
   - Frames exceeding 2x target frame time (22.2ms)
   - Formula: `(frames > 22.2ms) / total_frames * 100`

3. **Escalation Frequency**
   - Target: <5 per hour
   - Indicates system stability
   - High frequency = scene too complex or thresholds too aggressive

4. **User Override Rate**
   - Target: <10%
   - Percentage of users locking quality manually
   - High rate = auto-adjust not meeting user expectations

5. **p95/p99 Frame Time**
   - Target: p95 < 12ms, p99 < 15ms
   - Measures consistency beyond average
   - Critical for VR comfort

## Troubleshooting

### System not escalating despite low FPS
- Check `autoAdjust` is enabled
- Verify `userLockedLevel` is null
- Ensure `escalationDuration` is reasonable (not too long)
- Confirm FPS is consistently below threshold (not intermittent)

### System oscillating between quality levels
- Increase de-escalation duration (e.g., 30s → 60s)
- Widen threshold gap (e.g., 85fps / 92fps → 82fps / 95fps)
- Check for performance spikes causing instability

### Quality settings not being applied
- Verify renderer integration is calling `applyQualitySettings()`
- Check console for errors during quality application
- Ensure scene objects are properly scanned (lights, meshes, particles)
- Update rendering state after scene changes

### Frame time measurements inaccurate
- Use `performance.now()` for high-resolution timing
- Avoid measuring across multiple frames
- Account for VSync timing (may snap to 16.67ms / 11.11ms)

## API Reference

See `VRPerformanceDegradationManager.ts` for complete API documentation.

### Core Methods

- `recordFrame(frameTime: number)` - Record frame time measurement
- `setQualityLevel(level, lock)` - Manually set quality level
- `unlockQualityLevel()` - Re-enable auto-adjust
- `getCurrentQualitySettings()` - Get current quality settings
- `getMetrics()` - Get comprehensive metrics
- `generateReport()` - Generate text performance report
- `onDegradationEvent(callback)` - Subscribe to quality changes

### Integration Methods (Three.js)

- `createThreeVRPerformanceManager(renderer, scene, camera, config)` - Factory function
- `startMonitoring(renderCallback)` - Start auto-monitoring
- `stopMonitoring()` - Stop monitoring
- `updateRenderingState(state)` - Update scene objects

### Integration Methods (Babylon.js)

- `createBabylonVRPerformanceManager(engine, scene, camera, config)` - Factory function
- `startMonitoring()` - Start auto-monitoring
- `stopMonitoring()` - Stop monitoring
- `updateRenderingState(state)` - Update scene objects

## Timeline

**Implementation**: 4-6 weeks

- Week 1-2: Core degradation manager + Three.js integration
- Week 3: Babylon.js integration
- Week 4: Testing, metrics tracking, UI components
- Week 5-6: Optimization, user testing, documentation

## Expected Results

- **100% elimination** of VR stuttering/motion sickness events
- **90fps sustained** on target hardware (Quest 2/3, PCVR)
- **Automatic quality adjustment** requiring no user intervention (95%+ of cases)
- **Comprehensive metrics** for performance monitoring and optimization

## License

MIT License - See LICENSE file for details

---

**VR Performance Degradation System v1.0**
*Eliminates Motion Sickness • Automatic Quality Adjustment • 90fps Target*
*Part of HoloLand VR/AR Platform • https://github.com/yourusername/hololand*
