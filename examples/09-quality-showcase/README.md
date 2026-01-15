# 09 - Quality Showcase

Demonstrates the comprehensive quality tier system in `@hololand/renderer`. This example showcases how Hololand can scale from mobile VR devices to high-end desktops with automatic quality detection and manual override options.

## Features

### Quality Presets
- **Low**: Optimized for Quest 2 and mobile (72 FPS target)
- **Medium**: Balanced for Quest 3/Pro (90 FPS target)
- **High**: Full PBR and post-processing for PC VR
- **Ultra**: Maximum quality for high-end desktops

### Post-Processing Effects
- **Bloom**: Cinematic glow on bright areas
- **SSAO**: Screen-space ambient occlusion for depth
- **Vignette**: Darkened corners for focus
- **FXAA/SMAA**: Anti-aliasing options

### HDRI Environments
- Sunset, Daylight, Studio, Night, Forest, City presets
- Real-time environment map reflections
- Procedural sky fallback

### PBR Material Presets
- Chrome, Gold, Glass, Plastic, Metal
- Wood, Fabric, Leather, Rubber
- Emissive, Hologram (special effects)

## Quick Start

```bash
cd examples/09-quality-showcase
npm install
npm run dev
```

Then open http://localhost:5173

## Controls

### Left Panel
- **Quality Preset**: Switch between Low/Medium/High/Ultra
- **Environment**: Change the HDRI lighting environment
- **Post-Processing**: Toggle individual effects

### Right Panel
- **FPS**: Current frame rate (green=good, yellow=warn, red=bad)
- **Draw Calls**: Number of render calls per frame
- **Triangles**: Total triangle count
- **GPU**: Detected device/GPU tier

### Bottom Panel
- **Material Presets**: Click to change the center sphere's material

### 3D Scene
- **Left-drag**: Orbit camera
- **Right-drag**: Pan camera
- **Scroll**: Zoom in/out

## Code Highlights

### Quality Manager
```typescript
import { createQualityManager } from '@hololand/renderer';

const qualityManager = createQualityManager({ defaultPreset: 'auto' });

// Get current settings
const settings = qualityManager.getSettings();
console.log(settings.shadowMapSize); // 2048 on high, 512 on low

// Change quality at runtime
qualityManager.setPreset('ultra');
```

### Material Factory
```typescript
import { createMaterialFactory } from '@hololand/renderer';

const materialFactory = createMaterialFactory({ qualitySettings });

// Create PBR material preset
const chromeMaterial = materialFactory.createFromPreset('chrome');
const glassMaterial = materialFactory.createFromPreset('glass');

// Custom material
const custom = materialFactory.create({
  color: '#7c3aed',
  roughness: 0.3,
  metalness: 0.8,
});
```

### Post-Processing Pipeline
```typescript
import { createPostProcessingPipeline } from '@hololand/renderer';

const postProcessing = createPostProcessingPipeline(renderer, scene, camera, {
  quality: 'high',
  bloom: { enabled: true, strength: 0.8 },
  ssao: { enabled: true, radius: 0.5 },
  vignette: { enabled: true, darkness: 0.5 },
  antialiasing: 'fxaa',
});

// Toggle effects at runtime
postProcessing.setEffectEnabled('bloom', false);
```

### Environment Manager
```typescript
import { createEnvironmentManager, HDRI_PRESETS } from '@hololand/renderer';

const envManager = createEnvironmentManager({ renderer, scene, qualitySettings });

// Load HDRI
await envManager.loadHDRI(HDRI_PRESETS.sunset, { setBackground: true });

// Or use procedural sky
envManager.createProceduralSky({
  sunPosition: { elevation: 45, azimuth: 180 },
  turbidity: 4,
});
```

## Performance Tips

1. **Start with Auto**: Let the quality manager detect the best preset
2. **Monitor FPS**: If below 60, try lowering quality
3. **SSAO is expensive**: Disable on mobile/VR devices
4. **Bloom is cheap**: Keep enabled for cinematic look
5. **Shadow quality**: Lower shadow map size for big performance gains

## Architecture

```
09-quality-showcase/
├── index.html          # UI controls and canvas container
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── vite.config.ts      # Vite build config
├── src/
│   └── main.ts         # Main application logic
└── README.md           # This file
```

## Technologies

- Three.js for 3D rendering
- @hololand/renderer for quality system
- Vite for development server
- TypeScript for type safety

## Next Steps

- Try loading your own GLTF models with `AssetLoader`
- Create custom material presets
- Implement adaptive quality based on FPS monitoring
- Add VR support with WebXR
