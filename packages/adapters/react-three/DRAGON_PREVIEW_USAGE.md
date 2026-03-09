# DragonPreview Component Usage Guide

## Overview

The `DragonPreview` component provides a complete 3D dragon model viewer with:

- **GLTF Model Loading** via `@react-three/drei`'s `useGLTF` hook
- **Full Quality Rendering** with hull, spline, and membrane geometry
- **Volumetric Fire Effects** for dragon breath
- **Animation Controls** with play/pause and animation selection
- **Camera Orbit Controls** for interactive viewing
- **THREE.js Post-Processing** with bloom effects for enhanced visuals
- **Studio Inspector Integration** for debugging and asset management

## Installation

The component is part of the `@hololand/react-three` package:

```bash
npm install @hololand/react-three
# or
pnpm add @hololand/react-three
```

### Peer Dependencies

Ensure you have the required peer dependencies:

```bash
npm install react@^18.0.0 three@^0.159.0 @react-three/fiber @react-three/drei @react-three/postprocessing
```

## Basic Usage

```tsx
import { DragonPreview } from '@hololand/react-three';

function App() {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <DragonPreview
        modelPath="/models/dragon.glb"
        showControls={true}
      />
    </div>
  );
}
```

## Props

### DragonPreviewProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelPath` | `string` | `'/models/dragon.glb'` | Path to the dragon GLTF model file |
| `showControls` | `boolean` | `true` | Whether to display the animation control UI |
| `cameraPosition` | `[number, number, number]` | `[0, 2, 5]` | Initial camera position `[x, y, z]` |
| `onAnimationChange` | `(animationName: string) => void` | `undefined` | Callback fired when the active animation changes |
| `className` | `string` | `undefined` | Additional CSS class name for the container |

## Advanced Examples

### Custom Camera Position

```tsx
<DragonPreview
  modelPath="/models/dragon.glb"
  cameraPosition={[5, 10, 15]}
  showControls={true}
/>
```

### Track Animation Changes

```tsx
function DragonViewer() {
  const [currentAnimation, setCurrentAnimation] = useState<string>('');

  return (
    <>
      <DragonPreview
        modelPath="/models/dragon.glb"
        onAnimationChange={(name) => {
          console.log('Now playing:', name);
          setCurrentAnimation(name);
        }}
      />
      <p>Current: {currentAnimation}</p>
    </>
  );
}
```

### Custom Model Path

```tsx
<DragonPreview
  modelPath="/assets/creatures/fire-dragon-v2.glb"
  showControls={true}
/>
```

### Minimal (No Controls)

```tsx
<DragonPreview
  modelPath="/models/dragon.glb"
  showControls={false}
/>
```

### Integration with Studio Inspector

```tsx
import { DragonPreview } from '@hololand/react-three';
import { AssetImportDialog } from '@hololand/three-adapter/react/studio';

function StudioPanel() {
  const [modelPath, setModelPath] = useState('/models/dragon.glb');

  return (
    <div className="studio-layout">
      {/* Asset Browser */}
      <aside className="asset-panel">
        <AssetImportDialog
          onImport={(entries) => {
            const dragonModel = entries.find(e => e.file.name.includes('dragon'));
            if (dragonModel) {
              setModelPath(URL.createObjectURL(dragonModel.file));
            }
          }}
        />
      </aside>

      {/* 3D Preview */}
      <main className="preview-panel">
        <DragonPreview
          modelPath={modelPath}
          showControls={true}
          onAnimationChange={(name) => console.log('Animation:', name)}
        />
      </main>
    </div>
  );
}
```

## Features

### 1. GLTF Model Loading

The component uses `@react-three/drei`'s `useGLTF` hook for efficient model loading:

- Automatic geometry buffering
- Material optimization
- Texture caching
- Progressive loading support

### 2. Animation System

- **Auto-detection**: All animations in the GLTF file are automatically detected
- **Play/Pause**: Control animation playback
- **Animation Selector**: Dropdown menu with all available animations
- **Duration Display**: Shows animation length in seconds
- **Smooth Transitions**: Uses THREE.js AnimationMixer for smooth blending

### 3. Volumetric Fire Effects

Placeholder volumetric fire effect (to be replaced with full VolumetricFireRenderer):

- Point light emitting from dragon's mouth
- Cone geometry for fire stream visualization
- Particle embers system
- Emissive material for glow effect

**Future Enhancement**: Integration with `VolumetricFireRenderer` from `@hololand/platform/renderer`:

```tsx
import { VolumetricFireRenderer } from '@hololand/platform/renderer/volumetric-fire';

// Full 9-layer volumetric fire with GPU shaders
<VolumetricFireRenderer
  temperature={3200}
  intensity={2.0}
  animationSpeed={1.5}
  // ... (see dragon-fire.example.ts)
/>
```

### 4. Camera Controls

Built-in OrbitControls for intuitive navigation:

- **Orbit**: Click and drag to rotate around the model
- **Zoom**: Scroll to zoom in/out (min: 2, max: 15 units)
- **Pan**: Right-click and drag to pan
- **Constraints**: Prevents camera from going below the ground plane

### 5. Post-Processing Effects

Uses `@react-three/postprocessing` for enhanced visuals:

- **Bloom**: Adds glow to bright areas (fire, emissive materials)
  - Intensity: `0.8`
  - Luminance Threshold: `0.5`
  - Smoothing: `0.9`
  - Resolution: `300px`

### 6. Lighting Setup

Professional 3-point lighting system:

- **Ambient Light**: `0.4` intensity for base illumination
- **Directional Light (Key)**: `0.8` intensity from `[5, 5, 5]` with shadows
- **Directional Light (Fill)**: `0.4` intensity from `[-5, 3, -5]`
- **Hemisphere Light**: `0.3` intensity with ground color `#444444`

### 7. Shadow System

- High-quality shadow maps: `2048x2048`
- Dragon casts and receives shadows
- Ground plane receives shadows
- Optimized for performance

## Model Requirements

### GLTF/GLB Format

The model should be in GLTF 2.0 or GLB format with:

- **Geometry**: Preferably uses Draco compression for smaller file size
- **Materials**: PBR materials (metalness/roughness workflow)
- **Textures**: Embedded or external (PNG/JPG)
- **Animations**: Optional, but recommended (idle, fly, breathe, roar, etc.)

### Naming Conventions

For best results, name your meshes according to their function:

- `*hull*` or `*membrane*`: Wing membranes, body surfaces
  - Rendered with `roughness: 0.3`, `metalness: 0.1`, double-sided
- `*spline*` or `*bone*`: Skeletal structure, wing bones
  - Rendered with `roughness: 0.6`, `metalness: 0.4`

### Recommended Geometry

- **Vertices**: 10K - 50K (optimized for real-time)
- **Triangles**: 20K - 100K
- **Textures**: 1024x1024 or 2048x2048 (power-of-2)
- **Animations**: 1-10 clips, 1-5 seconds each

## Performance Tips

### 1. Model Optimization

```bash
# Use gltf-pipeline to optimize your model
npm install -g gltf-pipeline
gltf-pipeline -i dragon.glb -o dragon-optimized.glb --draco.compressionLevel 10
```

### 2. Texture Compression

```bash
# Convert textures to KTX2 for GPU-friendly compression
npx @gltf-transform/cli ktx dragon.glb dragon-ktx2.glb --slots "{baseColorTexture,normalTexture}"
```

### 3. LOD (Level of Detail)

For complex scenes with multiple dragons:

```tsx
import { useProgressiveAsset } from '@hololand/three-adapter/react';

function MultiDragonScene() {
  const dragon1 = useProgressiveAsset('/models/dragon.glb', 'dragon_1', {
    previewUrl: '/models/dragon-preview.glb', // Low-poly version
    priority: 0.9,
  });

  return dragon1.scene ? <primitive object={dragon1.scene} /> : null;
}
```

### 4. Render Budget

On Quest 3 (90 Hz), maintain <11.1ms frame time:

- **Canvas Settings**: `dpr={[1, 2]}` adjusts pixel ratio based on device
- **GL Settings**: `powerPreference: 'high-performance'`
- **Shadow Maps**: Already optimized at 2048x2048 (consider 1024 for Quest)

## Troubleshooting

### Model Not Loading

1. **Check file path**: Ensure `/models/dragon.glb` exists in your `public` folder
2. **CORS Issues**: If loading from external URL, ensure CORS headers are set
3. **File Size**: Large files (>50MB) may timeout - optimize with Draco compression

### Animations Not Playing

1. **Check GLTF**: Open model in [gltf.report](https://gltf.report/) to verify animations
2. **Console Errors**: Check browser console for AnimationMixer errors
3. **Clip Names**: Ensure animation names don't contain special characters

### Poor Performance

1. **Reduce Shadow Map Size**: Edit component to use `shadow-mapSize-width={1024}`
2. **Disable Bloom**: Remove `<EffectComposer>` wrapper for low-end devices
3. **Lower Resolution**: Set `<Canvas dpr={1}>` to force 1x pixel ratio

### Fire Effect Not Visible

1. **Check Positioning**: Fire cone is at `[0, 1.5, 2]` - adjust if dragon is scaled differently
2. **Bloom Disabled**: Bloom enhances the fire glow significantly
3. **Light Intensity**: Increase `intensity={5}` on fire point light

## API Reference

### Component Tree

```
DragonPreview
├── Canvas (THREE.js renderer)
│   ├── PerspectiveCamera
│   ├── OrbitControls
│   ├── Lighting (4 lights)
│   ├── DragonModel (Suspense wrapper)
│   │   ├── GLTF Scene (dragon geometry)
│   │   ├── AnimationMixer
│   │   └── Fire Effect Group
│   │       ├── PointLight
│   │       ├── Cone Mesh (fire stream)
│   │       └── Points (embers)
│   ├── Ground Plane
│   └── EffectComposer
│       └── Bloom
└── ControlsUI (overlay)
    ├── Play/Pause Button
    ├── Animation Selector
    └── Info Badge
```

### Internal Hooks

- `useGLTF(modelPath)`: Loads GLTF model
- `useFrame(callback)`: Updates animation mixer every frame
- `useThree()`: Accesses THREE.js context (camera, scene, gl)
- `useState`: Manages playback state and active animation

### Three.js Objects

- `THREE.AnimationMixer`: Handles animation playback
- `THREE.AnimationClip`: Individual animation data
- `THREE.Group`: Scene graph nodes
- `THREE.Mesh`: Geometry + Material pairs

## Related Components

### Asset Import

```tsx
import { AssetImportDialog } from '@hololand/three-adapter/react/studio';
```

### Progressive Loading

```tsx
import { useProgressiveAsset } from '@hololand/three-adapter/react';
```

### Volumetric Fire (Full Implementation)

```tsx
import { VolumetricFireRenderer } from '@hololand/platform/renderer/volumetric-fire';
```

## License

MIT © Hololand Contributors

## Support

- **Documentation**: [https://docs.hololand.io](https://docs.hololand.io)
- **GitHub**: [https://github.com/brianonbased-dev/Hololand](https://github.com/brianonbased-dev/Hololand)
- **Discord**: [https://discord.gg/hololand](https://discord.gg/hololand)
