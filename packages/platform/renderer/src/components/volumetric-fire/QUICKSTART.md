# Volumetric Fire - Quick Start Guide

Get dragon fire breath rendering in **5 minutes**.

## Installation

```bash
# Already included in @hololand/renderer
npm install @hololand/renderer
```

## Minimal Example (3 steps)

### 1. Import

```typescript
import { VolumetricFireRenderer } from '@hololand/renderer/volumetric-fire';
import { GPUContext } from '@hololand/renderer';
```

### 2. Initialize

```typescript
const gpuContext = new GPUContext();
await gpuContext.initialize();

const fireRenderer = new VolumetricFireRenderer(gpuContext);
await fireRenderer.initialize();
```

### 3. Render

```typescript
function renderLoop(time: number) {
  const encoder = gpuContext.device.createCommandEncoder();
  const renderPass = encoder.beginRenderPass({ /* your config */ });

  // Render fire
  fireRenderer.render(
    renderPass,
    viewMatrix,
    projectionMatrix,
    cameraPosition,
    time,
    depthTexture
  );

  renderPass.end();
  gpuContext.device.queue.submit([encoder.finish()]);
}
```

**That's it!** You now have volumetric fire rendering at 90Hz.

## Dragon Breath Configuration

For dragon-specific fire (hot, intense, elongated):

```typescript
const fireRenderer = new VolumetricFireRenderer(gpuContext, {
  temperature: 3200,    // Hotter than normal fire
  intensity: 2.0,       // Very bright
  scale: { x: 0.8, y: 3.0, z: 0.8 }, // Elongated cone
  turbulence: 0.8,      // Chaotic
  animationSpeed: 1.5,  // Fast movement
});
```

## Platform Presets

**Quest 2** (low quality, 72Hz):
```typescript
fireRenderer.applyQualityPreset('quest2');
```

**Quest 3** (medium quality, 90Hz):
```typescript
fireRenderer.applyQualityPreset('quest3'); // Default
```

**PCVR** (high quality, 90Hz):
```typescript
fireRenderer.applyQualityPreset('pcvr');
```

## HoloScript (Declarative)

```holoscript
material "DragonBreath" @volumetric_fire {
  temperature: 3200
  intensity: 2.0
  scale: [0.8, 3.0, 0.8]

  performance {
    qualityLevel: 1
    maxRaymarchSteps: 24
  }
}
```

Parse and apply:

```typescript
import { HoloScriptFireIntegration } from '@hololand/renderer/volumetric-fire';

const fireConfig = HoloScriptFireIntegration.parseFireMaterial(materialDef);
fireRenderer.updateConfig(fireConfig);
```

## Performance Monitoring

```typescript
const metrics = fireRenderer.getPerformanceMetrics();

if (metrics.budgetExceeded) {
  console.warn('Fire exceeded performance budget!');
  console.log('Auto quality:', metrics.autoQualityLevel);
  console.log('GPU time:', metrics.gpuTimeMs + 'ms');
}
```

## Common Patterns

### Pulsing Breath

```typescript
function render(time: number) {
  const pulse = 0.7 + 0.3 * Math.sin(time * 2.0);
  fireRenderer.updateConfig({ intensity: 2.0 * pulse });
  fireRenderer.render(/* ... */);
}
```

### Directional Breath

```typescript
fireRenderer.updateConfig({
  windDirection: { x: 0.0, y: 0.7, z: 0.3 }, // Forward + up
  windStrength: 0.6,
});
```

### Multi-Color Fire (Blue Dragon)

```typescript
fireRenderer.updateConfig({
  temperature: 4500, // Hotter = bluer
  layers: {
    whiteHotCore: {
      enabled: true,
      color: { r: 0.7, g: 0.8, b: 1.0 }, // Bluish white
    },
    midFlame: {
      enabled: true,
      color: { r: 0.3, g: 0.5, b: 1.0 }, // Blue flame
    },
  },
});
```

## Troubleshooting

### Fire not visible
- Check `intensity` > 0
- Verify `layers.*.enabled = true`
- Ensure camera is positioned to see fire volume

### Performance issues
- Apply lower quality preset: `fireRenderer.applyQualityPreset('quest2')`
- Reduce `maxRaymarchSteps` (try 16 or 12)
- Disable expensive layers (tendrils, smoke, heatHaze)

### Fire looks pixelated
- Increase `noiseScale` (try 3.0 or 4.0)
- Increase `noiseOctaves` (try 4 on PCVR/desktop)
- Increase `maxRaymarchSteps` (try 32 or 48)

### Auto-quality too aggressive
```typescript
// Disable auto-adjustment, set manual quality
fireRenderer.updateConfig({
  qualityLevel: 2, // Fixed high quality
  maxRaymarchSteps: 32,
  temporalReprojection: false, // Disable if causing artifacts
});
```

## Full Example (Copy-Paste Ready)

```typescript
import { VolumetricFireRenderer } from '@hololand/renderer/volumetric-fire';
import { GPUContext } from '@hololand/renderer';

async function main() {
  // Setup
  const gpuContext = new GPUContext();
  await gpuContext.initialize();

  const fireRenderer = new VolumetricFireRenderer(gpuContext, {
    temperature: 3200,
    intensity: 2.0,
    scale: { x: 0.8, y: 3.0, z: 0.8 },
    qualityLevel: 1, // Quest 3 baseline
  });

  await fireRenderer.initialize();

  // Render loop
  function render(time: number) {
    const encoder = gpuContext.device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: colorTextureView,
        loadOp: 'load',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthTextureView,
        depthLoadOp: 'load',
        depthStoreOp: 'store',
      },
    });

    fireRenderer.render(
      renderPass,
      viewMatrix,
      projectionMatrix,
      { x: 0, y: 2, z: 0 }, // Camera position
      time,
      depthTexture
    );

    renderPass.end();
    gpuContext.device.queue.submit([encoder.finish()]);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
```

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- See [examples/dragon-fire.example.ts](./examples/dragon-fire.example.ts) for advanced usage
- Check [IMPLEMENTATION.md](./IMPLEMENTATION.md) for technical details

## Support

- Issues: https://github.com/hololand/platform/issues
- Docs: https://docs.hololand.io/renderer/volumetric-fire
- Discord: https://discord.gg/hololand
