# Quality Inspector Component

Interactive UI for controlling quality tier, LOD settings, geometry resolution, and effect parameters in HoloLand applications. Integrates seamlessly with `QualityProfileManager` for real-time profile updates and preset management.

## Features

- **Quality Tier Selection**: Switch between Industrial, Cinematic, and Mobile profiles
- **LOD Configuration**: Fine-tune level-of-detail transitions and distance thresholds
- **Geometry Controls**: Adjust polygon count, texture resolution, and shadow quality
- **Fire Effect Controls**: Modify intensity, color, particle count, and emission rate
- **Preset Management**: Save and load custom quality configurations
- **Real-time Preview**: Optional immediate updates as sliders change
- **Persistent Storage**: localStorage integration for saved presets

## Installation

The component is part of the `@hololand/renderer` package:

```bash
pnpm add @hololand/renderer @hololand/quality-profiles
```

## Basic Usage

```tsx
import { QualityInspector, useQualityInspector } from '@hololand/renderer';

function App() {
  const {
    currentProfile,
    setProfile,
    presets,
    savePreset,
    loadPreset,
  } = useQualityInspector({
    initialProfile: 'industrial',
    persistPresets: true,
    enablePreview: true,
  });

  return (
    <QualityInspector
      currentProfile={currentProfile}
      onProfileChange={setProfile}
      onLODChange={(params) => console.log('LOD changed:', params)}
      onGeometryChange={(params) => console.log('Geometry changed:', params)}
      onPresetSave={savePreset}
      onPresetLoad={loadPreset}
      presets={presets}
      enablePreview={true}
    />
  );
}
```

## Integration with QualityProfileManager

```tsx
import { QualityInspector } from '@hololand/renderer';
import { createQualityProfileManager } from '@hololand/quality-profiles';

const qualityManager = createQualityProfileManager({
  defaultProfile: 'industrial',
  autoApply: true,
  onProfileChange: (profile, metadata) => {
    console.log('Quality profile changed:', profile);
  },
  onTraitConfigChange: (traitConfig) => {
    console.log('Trait config updated:', traitConfig);
  },
});

function QualityControlPanel() {
  const handleProfileChange = (profile) => {
    qualityManager.setProfile(profile);
  };

  const handleLODChange = (lodParams) => {
    // Apply LOD settings to your renderer
    renderer.setLODConfig(lodParams);
  };

  const handleGeometryChange = (geometryParams) => {
    // Apply geometry settings to your renderer
    renderer.setMaxPolyCount(geometryParams.maxPolyCount);
    renderer.setTextureSize(geometryParams.maxTextureSize);
  };

  return (
    <QualityInspector
      currentProfile={qualityManager.getProfile().name}
      onProfileChange={handleProfileChange}
      onLODChange={handleLODChange}
      onGeometryChange={handleGeometryChange}
      enablePreview={true}
    />
  );
}
```

## Component Props

### QualityInspectorProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentProfile` | `QualityProfileName` | **required** | Current quality profile |
| `onProfileChange` | `(profile: QualityProfileName) => void` | - | Callback when profile changes |
| `onLODChange` | `(params: LODParams) => void` | - | Callback when LOD params change |
| `onGeometryChange` | `(params: GeometryParams) => void` | - | Callback when geometry params change |
| `onFireEffectChange` | `(params: FireEffectParams) => void` | - | Callback when fire effect params change |
| `onPresetSave` | `(preset: QualityPreset) => void` | - | Callback when preset is saved |
| `onPresetLoad` | `(preset: QualityPreset) => void` | - | Callback when preset is loaded |
| `presets` | `QualityPreset[]` | `[]` | Available presets |
| `showFireControls` | `boolean` | `false` | Show fire effect controls tab |
| `enablePreview` | `boolean` | `true` | Enable real-time preview updates |
| `className` | `string` | - | Custom CSS class name |

## Hook API

### useQualityInspector

Custom React hook for managing quality inspector state.

```tsx
const {
  currentProfile,
  setProfile,
  presets,
  savePreset,
  loadPreset,
  deletePreset,
  clearPresets,
  exportPresets,
  importPresets,
} = useQualityInspector(options);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `initialProfile` | `QualityProfileName` | `'industrial'` | Initial quality profile |
| `persistPresets` | `boolean` | `true` | Enable localStorage persistence |
| `enablePreview` | `boolean` | `true` | Enable real-time preview updates |
| `onProfileChange` | `(profile: QualityProfileName) => void` | - | Profile change callback |
| `onLODChange` | `(params: LODParams) => void` | - | LOD change callback |
| `onGeometryChange` | `(params: GeometryParams) => void` | - | Geometry change callback |
| `onFireEffectChange` | `(params: FireEffectParams) => void` | - | Fire effect change callback |

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `currentProfile` | `QualityProfileName` | Current quality profile |
| `setProfile` | `(profile: QualityProfileName) => void` | Set quality profile |
| `presets` | `QualityPreset[]` | Saved presets |
| `savePreset` | `(preset: QualityPreset) => void` | Save a new preset |
| `loadPreset` | `(preset: QualityPreset) => void` | Load a preset |
| `deletePreset` | `(presetId: string) => void` | Delete a preset |
| `clearPresets` | `() => void` | Clear all presets |
| `exportPresets` | `() => string` | Export presets as JSON |
| `importPresets` | `(json: string) => boolean` | Import presets from JSON |

## Type Definitions

### LODParams

```typescript
interface LODParams {
  enabled: boolean;
  levels: number;                  // 2-6 levels
  distanceMultiplier: number;       // 0.5-3.0x
  autoSwitch: boolean;
  maxDistanceLOD0: number;         // 10-200 meters
}
```

### GeometryParams

```typescript
interface GeometryParams {
  maxPolyCount: number;            // 10K-5M polygons
  maxTextureSize: number;          // 256-8192 pixels
  anisotropy: number;              // 1-16x
  shadowMapSize: number;           // 256-8192 pixels
}
```

### FireEffectParams

```typescript
interface FireEffectParams {
  intensity: number;               // 0-1
  color: string;                   // Hex color
  particleCount: number;           // 10-5000
  sizeScale: number;               // 0.1-5.0x
  emissionRate: number;            // 10-1000 particles/sec
}
```

### QualityPreset

```typescript
interface QualityPreset {
  id: string;
  name: string;
  profile: QualityProfileName;
  lod: LODParams;
  geometry: GeometryParams;
  fireEffect?: FireEffectParams;
  isCustom: boolean;
  createdAt: number;
}
```

## Advanced Examples

### Fire Effect Controls

```tsx
<QualityInspector
  currentProfile="cinematic"
  showFireControls={true}
  onFireEffectChange={(params) => {
    fireSystem.setIntensity(params.intensity);
    fireSystem.setColor(params.color);
    fireSystem.setParticleCount(params.particleCount);
    fireSystem.setSizeScale(params.sizeScale);
    fireSystem.setEmissionRate(params.emissionRate);
  }}
/>
```

### Manual Apply (Non-Preview Mode)

```tsx
<QualityInspector
  currentProfile="industrial"
  enablePreview={false}
  onLODChange={(params) => {
    // This callback fires when user clicks "Apply Changes"
    renderer.applyLODSettings(params);
  }}
/>
```

### Preset Import/Export

```tsx
function PresetManager() {
  const { exportPresets, importPresets } = useQualityInspector();

  const handleExport = () => {
    const json = exportPresets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'quality-presets.json';
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const success = importPresets(text);

    if (success) {
      alert('Presets imported successfully');
    } else {
      alert('Failed to import presets');
    }
  };

  return (
    <div>
      <button onClick={handleExport}>Export Presets</button>
      <input
        type="file"
        accept=".json"
        onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
      />
    </div>
  );
}
```

### VR/AR Integration

```tsx
import { useXR } from '@react-three/xr';

function VRQualityControls() {
  const { isPresenting } = useXR();
  const { currentProfile, setProfile } = useQualityInspector({
    initialProfile: 'cinematic',
  });

  useEffect(() => {
    // Auto-switch to mobile profile in VR mode
    if (isPresenting) {
      setProfile('mobile');
    }
  }, [isPresenting, setProfile]);

  return (
    <QualityInspector
      currentProfile={currentProfile}
      onProfileChange={setProfile}
      showFireControls={true}
      enablePreview={true}
    />
  );
}
```

## Accessibility

The component follows WCAG 2.1 Level AA standards:

- Keyboard navigation for all controls
- ARIA roles for tabs and controls
- Proper labels for sliders and inputs
- Color contrast ratios meet standards
- Screen reader announcements for state changes

## Testing

```bash
# Run all tests
pnpm test quality-inspector

# Run with coverage
pnpm test quality-inspector --coverage

# Watch mode
pnpm test quality-inspector --watch
```

## Performance Considerations

### Real-time Preview Mode

When `enablePreview={true}`, callbacks fire on every slider change. For expensive operations:

```tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedLODChange = useDebouncedCallback(
  (params) => {
    renderer.applyLODSettings(params);
  },
  300 // 300ms debounce
);

<QualityInspector
  currentProfile="cinematic"
  onLODChange={debouncedLODChange}
  enablePreview={true}
/>
```

### Manual Apply Mode

For optimal performance with heavy rendering updates:

```tsx
<QualityInspector
  currentProfile="cinematic"
  enablePreview={false}
  onLODChange={(params) => {
    // Only fires when user clicks "Apply Changes"
    renderer.applyLODSettings(params);
  }}
/>
```

## Styling

The component uses inline styles by default but accepts a `className` prop for custom styling:

```tsx
<QualityInspector
  currentProfile="industrial"
  className="my-custom-quality-inspector"
/>
```

CSS variables can be used for theming:

```css
.my-custom-quality-inspector {
  --primary-color: #3b82f6;
  --background-color: #f8f9fa;
  --text-color: #1a1a2e;
  --border-color: #e0e0e0;
}
```

## Related Components

- **QualityProfileManager** (`@hololand/quality-profiles`) - Core quality management service
- **VRPerformanceDashboard** - Real-time performance monitoring
- **GaussianBudgetUtilization** - Memory budget tracking
- **LightingFidelityManager** - Dynamic lighting quality adjustment

## License

Part of the HoloLand platform. See LICENSE file for details.
