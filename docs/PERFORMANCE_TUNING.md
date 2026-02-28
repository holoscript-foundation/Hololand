# Performance Tuning Guide

**Optimize your VR/AR worlds for 90fps+**

Comprehensive guide to achieving and maintaining high framerates in HoloLand VR/AR applications. Learn optimization strategies for Quest 2/3, desktop VR, and browser-based WebXR.

---

## Table of Contents

1. [Target Framerates](#target-framerates)
2. [Quick Wins](#quick-wins)
3. [Asset Optimization](#asset-optimization)
4. [Rendering Optimization](#rendering-optimization)
5. [Physics Optimization](#physics-optimization)
6. [Networking Optimization](#networking-optimization)
7. [Memory Management](#memory-management)
8. [Profiling & Debugging](#profiling--debugging)
9. [Platform-Specific Tips](#platform-specific-tips)
10. [Checklist](#checklist)

---

## Target Framerates

### VR Platforms

| Platform | Minimum | Target | Maximum | Notes |
|----------|---------|--------|---------|-------|
| **Quest 2** | 72 FPS | 90 FPS | 120 FPS | 90Hz is recommended |
| **Quest 3** | 72 FPS | 90 FPS | 120 FPS | Supports 120Hz |
| **Valve Index** | 90 FPS | 120 FPS | 144 FPS | High refresh |
| **HTC Vive** | 90 FPS | 90 FPS | 90 FPS | Fixed 90Hz |
| **PSVR** | 60 FPS | 90 FPS | 120 FPS | Reprojection at 120Hz |

### Browser/Desktop

| Platform | Minimum | Target | Maximum |
|----------|---------|--------|---------|
| **WebXR (Desktop)** | 60 FPS | 90 FPS | 120 FPS |
| **WebXR (Mobile)** | 30 FPS | 60 FPS | 90 FPS |
| **Desktop App** | 60 FPS | 90 FPS | 144 FPS |

**Critical**: Dropping below minimum FPS causes motion sickness in VR!

---

## Quick Wins

**Start here for immediate improvements** (10-30% FPS boost):

### 1. Enable LOD System

```typescript
import { LODManager } from '@hololand/lod';

const lod = new LODManager();

// Register all objects with LOD levels
objects.forEach(obj => {
  lod.registerObject({
    id: obj.id,
    position: obj.position,
    bounds: obj.bounds,
    levels: [
      { distance: 0, mesh: obj.highPoly },
      { distance: 20, mesh: obj.mediumPoly },
      { distance: 50, mesh: obj.lowPoly },
      { distance: 100, mesh: null }  // Hide beyond 100m
    ]
  });
});

// Update every frame
lod.update(camera.position, camera.frustum);
```

**Impact**: 20-40% FPS improvement in dense scenes.

### 2. Enable Frustum Culling

```typescript
import { FrustumCuller } from '@hololand/lod';

const culler = new FrustumCuller();

function render() {
  culler.updateFrustum(camera);

  objects.forEach(obj => {
    if (!culler.isVisible(obj.position, obj.radius)) {
      return;  // Skip rendering
    }
    renderer.render(obj);
  });
}
```

**Impact**: 10-30% FPS improvement.

### 3. Reduce Draw Calls

```typescript
// ❌ Bad - 1000 draw calls
objects.forEach(obj => {
  renderer.render(obj.mesh, obj.material);
});

// ✅ Good - Batch by material (10 draw calls)
const batches = groupByMaterial(objects);
batches.forEach(batch => {
  renderer.renderBatch(batch.mesh, batch.material);
});
```

**Impact**: 15-50% FPS improvement.

### 4. Use Texture Atlases

```typescript
// ❌ Bad - 100 textures (100 texture binds)
objects.forEach(obj => {
  obj.material.map = obj.uniqueTexture;
});

// ✅ Good - 1 texture atlas (1 texture bind)
objects.forEach(obj => {
  obj.material.map = textureAtlas;
  obj.material.uvOffset = obj.atlasOffset;
});
```

**Impact**: 10-25% FPS improvement.

### 5. Enable Adaptive Quality

```typescript
import { AdaptiveLODController } from '@hololand/lod';

const adaptive = new AdaptiveLODController({
  targetFPS: 90,
  minFPS: 72,
  adjustInterval: 1000
});

function render(deltaTime) {
  adaptive.update(deltaTime);

  const quality = adaptive.getCurrentQuality();
  lod.setDistanceMultiplier(quality.lodBias);
  renderer.setQualityLevel(quality.level);
}
```

**Impact**: Maintains target FPS dynamically.

---

## Asset Optimization

### Polygon Budgets

**Quest 2/3 Budgets** (per frame):

| Category | High Detail | Medium Detail | Low Detail |
|----------|-------------|---------------|------------|
| **Characters** | 20K tris | 10K tris | 3K tris |
| **Vehicles** | 30K tris | 15K tris | 5K tris |
| **Buildings** | 50K tris | 20K tris | 5K tris |
| **Props** | 5K tris | 2K tris | 500 tris |
| **Total Scene** | 750K tris | 350K tris | 150K tris |

**Desktop VR Budgets**:

- Total scene: 2-5M triangles
- Single object: Up to 200K triangles

### Mesh Optimization

```bash
# Simplify meshes
holoscript optimize model.glb --target-tris 10000 --output model-lod1.glb

# Remove unnecessary data
holoscript optimize model.glb --remove-normals --remove-tangents --no-animations
```

**Techniques**:
- Remove backfaces
- Merge vertices
- Remove duplicate geometry
- Use LOD (Level of Detail)
- Bake animations to vertex data

### Texture Optimization

```typescript
// ❌ Bad - 4K textures everywhere
const material = new Material({
  map: '4k-texture.png',  // 4096x4096 = 64MB VRAM
  normalMap: '4k-normal.png',
  roughnessMap: '4k-roughness.png'
});

// ✅ Good - Resolution based on importance
const material = new Material({
  map: '1k-texture.png',        // 1024x1024 = 4MB VRAM
  normalMap: '512-normal.png',   // 512x512 = 1MB VRAM
  roughnessMap: '512-roughness.png'
});
```

**Texture Guidelines**:

| Object Distance | Texture Size | Use Case |
|----------------|--------------|----------|
| 0-5m | 2048px | Hero objects, characters |
| 5-20m | 1024px | Buildings, vehicles |
| 20-50m | 512px | Props, vegetation |
| 50m+ | 256px | Distant objects |

**Compression**:
```bash
# Convert to compressed formats
holoscript texture compress texture.png --format basis --quality 0.9

# Generate mipmaps
holoscript texture mipmaps texture.png --levels auto
```

### Audio Optimization

```typescript
// ❌ Bad - Full quality audio
const sound = new Audio('music.wav');  // 50MB uncompressed

// ✅ Good - Compressed audio
const sound = new Audio('music.mp3');  // 5MB compressed

// ✅ Better - Streaming audio
const sound = new StreamingAudio('music.mp3', {
  buffer: 2  // 2 second buffer
});
```

**Audio Guidelines**:
- Music: MP3/OGG @ 128-192 kbps
- Sound effects: MP3/OGG @ 96-128 kbps
- Voices: MP3/OGG @ 64-96 kbps
- Spatial audio: Use mono sources
- Stream long audio files (>30 seconds)

---

## Rendering Optimization

### Shadow Optimization

```typescript
// ❌ Bad - High quality shadows everywhere
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
light.shadow.mapSize.width = 4096;

// ✅ Good - Adaptive shadow quality
const shadowQuality = adaptive.getCurrentQuality().shadowQuality;

switch (shadowQuality) {
  case 'high':
    light.shadow.mapSize.width = 2048;
    renderer.shadowMap.type = PCFSoftShadowMap;
    break;
  case 'medium':
    light.shadow.mapSize.width = 1024;
    renderer.shadowMap.type = PCFShadowMap;
    break;
  case 'low':
    light.shadow.mapSize.width = 512;
    renderer.shadowMap.type = BasicShadowMap;
    break;
  case 'off':
    renderer.shadowMap.enabled = false;
    break;
}
```

**Shadow Budget**:
- Quest 2/3: 1-2 shadow-casting lights max
- Desktop VR: 3-5 shadow-casting lights max
- Shadow map size: 512-1024px for Quest, 1024-2048px for desktop

### Lighting Optimization

```typescript
// ❌ Bad - Many dynamic lights
for (let i = 0; i < 100; i++) {
  const light = new PointLight();
  light.castShadow = true;
  scene.add(light);
}

// ✅ Good - Baked lighting + few dynamic lights
const bakedLightmap = loadLightmap('scene-lightmap.exr');
scene.setLightmap(bakedLightmap);

// Only 2-3 dynamic lights for gameplay
const playerLight = new PointLight();
playerLight.castShadow = true;
scene.add(playerLight);
```

**Light Budget**:
- Quest 2/3: 2-4 dynamic lights max
- Desktop VR: 5-10 dynamic lights max
- Use baked lightmaps for static lighting

### Post-Processing

```typescript
// ❌ Bad - Heavy post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new SSAOPass());
composer.addPass(new BloomPass());
composer.addPass(new DofPass());
composer.addPass(new SSRPass());

// ✅ Good - Minimal post-processing for VR
const composer = new EffectComposer(renderer);

if (quality.level >= 3) {
  composer.addPass(new BloomPass({ quality: 'low' }));
}

// Skip expensive effects in VR
```

**Post-Processing Budget**:
- Quest 2/3: Avoid post-processing or use very lightweight effects
- Desktop VR: 1-2 lightweight passes max
- Desktop: 3-5 passes ok

### Shader Optimization

```glsl
// ❌ Bad - Expensive per-pixel operations
void main() {
  vec3 color = texture2D(diffuse, vUv).rgb;

  // Expensive per-pixel math
  for (int i = 0; i < 10; i++) {
    color += sin(vUv.x * 100.0 + float(i)) * 0.1;
  }

  gl_FragColor = vec4(color, 1.0);
}

// ✅ Good - Precompute or simplify
void main() {
  vec3 color = texture2D(diffuse, vUv).rgb;

  // Lookup table instead of math
  float noise = texture2D(noiseLUT, vUv).r;
  color += noise * 0.1;

  gl_FragColor = vec4(color, 1.0);
}
```

**Shader Tips**:
- Avoid loops in fragment shaders
- Precompute values in vertex shader
- Use texture lookups instead of math
- Minimize texture samples (max 4-6 per fragment)
- Use lower precision floats where possible

---

## Physics Optimization

### Collision Mesh Optimization

```typescript
// ❌ Bad - Use visual mesh for collision (50K tris)
const body = physics.createRigidBody({
  mesh: visualMesh,  // Way too detailed!
  mass: 1
});

// ✅ Good - Use simplified collision mesh (500 tris)
const body = physics.createRigidBody({
  mesh: collisionMesh,  // Simple convex hull
  mass: 1
});

// ✅ Better - Use primitive shapes
const body = physics.createRigidBody({
  shape: 'box',  // Or 'sphere', 'capsule'
  size: { x: 2, y: 2, z: 2 },
  mass: 1
});
```

**Collision Budget**:
- Quest 2/3: 50-100 active physics bodies
- Desktop VR: 200-500 active physics bodies

### Physics Simulation Rate

```typescript
// ❌ Bad - Physics every frame (90 times/second)
function update() {
  physics.step(deltaTime);
}

// ✅ Good - Fixed timestep physics (30-60 times/second)
let accumulator = 0;
const fixedTimeStep = 1 / 60;  // 60Hz physics

function update(deltaTime) {
  accumulator += deltaTime;

  while (accumulator >= fixedTimeStep) {
    physics.step(fixedTimeStep);
    accumulator -= fixedTimeStep;
  }
}
```

### Sleeping Bodies

```typescript
// Enable sleeping for static/slow objects
physics.configure({
  sleepThreshold: 0.01,  // m/s velocity threshold
  sleepTimeThreshold: 1.0  // seconds before sleep
});

// Force sleep for temporarily static objects
physics.sleepBody(bodyId);
```

---

## Networking Optimization

### Update Rate Optimization

```typescript
// ❌ Bad - Send updates every frame (90 times/second)
function update() {
  network.sendPlayerPosition(player.position);
}

// ✅ Good - Send updates at reasonable rate (10-20 times/second)
let lastUpdate = 0;
const updateRate = 1 / 20;  // 20Hz

function update(time) {
  if (time - lastUpdate >= updateRate) {
    network.sendPlayerPosition(player.position);
    lastUpdate = time;
  }
}
```

**Network Update Rates**:
- Player position: 10-20 Hz
- Player rotation: 10-20 Hz
- Animations: 5-10 Hz
- Object states: 1-5 Hz
- Chat messages: As needed

### Data Compression

```typescript
// ❌ Bad - Send full precision data
network.send({
  x: 123.456789123456,
  y: 987.654321987654,
  z: 456.789123456789
});

// ✅ Good - Quantize data
network.send({
  x: Math.round(player.x * 100) / 100,  // 2 decimal places
  y: Math.round(player.y * 100) / 100,
  z: Math.round(player.z * 100) / 100
});

// ✅ Better - Binary encoding
const buffer = new ArrayBuffer(12);
const view = new Float32Array(buffer);
view[0] = player.x;
view[1] = player.y;
view[2] = player.z;
network.sendBinary(buffer);  // Smaller payload
```

### Interest Management

```typescript
// Only sync nearby players
const nearbyPlayers = players.filter(p => {
  return distance(localPlayer.position, p.position) < 100;
});

nearbyPlayers.forEach(p => {
  network.syncPlayer(p.id);
});
```

---

## Memory Management

### Asset Streaming

```typescript
import { AssetStreamer } from '@hololand/streaming';

const streamer = new AssetStreamer({
  maxCacheSize: 200 * 1024 * 1024,  // 200MB cache
  preloadDistance: 50,
  unloadDistance: 100
});

// Stream assets based on player position
function update() {
  const nearby = world.getChunksNear(player.position, 50);

  nearby.forEach(chunk => {
    streamer.load(chunk.assets);
  });

  const distant = world.getChunksNear(player.position, 100);
  const toUnload = allChunks.filter(c => !distant.includes(c));

  toUnload.forEach(chunk => {
    streamer.unload(chunk.assets);
  });
}
```

### Memory Leaks

```typescript
// ❌ Bad - Memory leak (event listeners not removed)
function createObject() {
  const obj = new GameObject();

  window.addEventListener('resize', () => {
    obj.update();
  });

  return obj;
}

// ✅ Good - Clean up properly
function createObject() {
  const obj = new GameObject();

  const resizeHandler = () => obj.update();
  window.addEventListener('resize', resizeHandler);

  obj.destroy = () => {
    window.removeEventListener('resize', resizeHandler);
    obj.dispose();
  };

  return obj;
}
```

### Texture Memory

```typescript
// Monitor VRAM usage
const stats = renderer.info.memory;
console.log(`Textures: ${stats.textures}`);
console.log(`Geometries: ${stats.geometries}`);

// Dispose unused textures
function disposeTexture(texture) {
  texture.dispose();
  renderer.info.memory.textures--;
}

// Reuse textures
const textureCache = new Map();

function loadTexture(path) {
  if (!textureCache.has(path)) {
    textureCache.set(path, new Texture(path));
  }
  return textureCache.get(path);
}
```

---

## Profiling & Debugging

### Built-in Stats

```typescript
import { PerformanceMonitor } from '@hololand/core';

const monitor = new PerformanceMonitor();

function render() {
  monitor.begin();

  renderer.render(scene, camera);

  monitor.end();

  // Display stats
  if (monitor.fps < 72) {
    console.warn(`Low FPS: ${monitor.fps}`);
    console.log(`Frame time: ${monitor.frameTime}ms`);
    console.log(`Draw calls: ${renderer.info.render.calls}`);
    console.log(`Triangles: ${renderer.info.render.triangles}`);
  }
}
```

### Chrome DevTools

**Profiling steps**:
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with scene for 5-10 seconds
5. Stop recording
6. Analyze flame graph

**What to look for**:
- Long frames (>16ms for 60fps, >11ms for 90fps)
- JavaScript bottlenecks
- Layout/reflow issues
- Garbage collection spikes

### GPU Profiling

**Quest 2/3**:
```bash
# Enable GPU profiling
adb shell setprop debug.oculus.gpuLevel 4

# View metrics in Oculus Link
```

**Desktop**:
- NVIDIA: NSight Graphics
- AMD: Radeon GPU Profiler
- Intel: Intel GPA

### Custom Profiling

```typescript
class Profiler {
  timings = new Map();

  begin(label) {
    this.timings.set(label, performance.now());
  }

  end(label) {
    const start = this.timings.get(label);
    const duration = performance.now() - start;
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }
}

const profiler = new Profiler();

function render() {
  profiler.begin('total');

  profiler.begin('culling');
  cullObjects();
  profiler.end('culling');

  profiler.begin('rendering');
  renderer.render(scene, camera);
  profiler.end('rendering');

  profiler.begin('physics');
  physics.step(deltaTime);
  profiler.end('physics');

  profiler.end('total');
}
```

---

## Platform-Specific Tips

### Quest 2/3 Optimization

**Foveated Rendering**:
```typescript
renderer.xr.setFoveation(1.0);  // 0.0 - 1.0 (max foveation)
```

**Fixed Foveated Rendering** (FFR):
- Level 0: Off
- Level 1: Low (5-10% FPS gain)
- Level 2: Medium (10-15% FPS gain)
- Level 3: High (15-20% FPS gain)

**Quest-Specific Settings**:
```typescript
const questSettings = {
  targetFPS: 90,
  foveation: 1.0,
  textureResolution: 0.9,  // 90% resolution
  shadowQuality: 'low',
  postProcessing: false,
  maxDrawCalls: 100,
  maxTriangles: 350000
};
```

### Desktop VR Optimization

**Resolution Scaling**:
```typescript
// Reduce render resolution if needed
renderer.xr.setPixelRatio(0.8);  // 80% resolution = 36% fewer pixels
```

**Multi-threaded Rendering**:
```typescript
// Enable if supported
renderer.capabilities.threaded = true;
```

---

## Checklist

### Before Publishing

- [ ] Target FPS achieved on Quest 2 (90fps)
- [ ] Target FPS achieved on desktop VR (90-120fps)
- [ ] LOD system configured for all objects
- [ ] Frustum culling enabled
- [ ] Texture atlases used where possible
- [ ] Draw calls under budget (Quest: 100-200, Desktop: 500-1000)
- [ ] Triangle count under budget (Quest: 350K, Desktop: 2M)
- [ ] Texture memory under budget (Quest: 500MB, Desktop: 2GB)
- [ ] Physics bodies under budget (Quest: 100, Desktop: 500)
- [ ] Shadow quality optimized
- [ ] Post-processing disabled/minimal on Quest
- [ ] Audio compressed and streaming
- [ ] Network update rates optimized (10-20 Hz)
- [ ] Memory leaks fixed (tested with DevTools)
- [ ] Tested on target hardware
- [ ] Profiled and no major bottlenecks

### Common Issues

**Low FPS**:
1. Check draw calls (should be <200 on Quest)
2. Check triangle count (should be <350K on Quest)
3. Enable LOD system
4. Enable frustum culling
5. Reduce shadow quality
6. Disable post-processing

**Stuttering**:
1. Check garbage collection (DevTools)
2. Enable object pooling
3. Stream assets instead of loading all at once
4. Optimize physics (use fixed timestep)

**High Memory Usage**:
1. Unload distant assets
2. Use texture compression
3. Reduce texture resolutions
4. Dispose unused objects

---

## Resources

- [Unity VR Optimization Guide](https://docs.unity3d.com/Manual/VROptimization.html)
- [Oculus Quest Best Practices](https://developer.oculus.com/resources/mobile-performance/)
- [WebXR Performance Tips](https://www.w3.org/TR/webxr/#performance)
- [Three.js Optimization](https://threejs.org/docs/#manual/en/introduction/Performance-tips)

---

## Next Steps

- Review [LOD Package](../packages/platform/lod/README.md) for LOD system details
- Review [Streaming Package](../packages/platform/streaming/README.md) for asset streaming
- Join [Discord](https://discord.gg/hololand) for performance tips from community

---

**Last Updated**: February 21, 2026

---

*Part of the [Hololand](https://github.com/brianonbased-dev/Hololand) VR/AR platform*
