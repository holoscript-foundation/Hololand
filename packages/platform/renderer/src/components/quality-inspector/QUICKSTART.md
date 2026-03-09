# Quality Inspector Quick Start

Get up and running with the Quality Inspector component in 5 minutes.

## Installation

The component is already part of `@hololand/renderer`. No additional installation needed.

## Minimal Example (30 seconds)

```tsx
import { QualityInspector, useQualityInspector } from '@hololand/renderer';

function App() {
  const { currentProfile, setProfile } = useQualityInspector();

  return (
    <QualityInspector
      currentProfile={currentProfile}
      onProfileChange={setProfile}
    />
  );
}
```

That's it! You now have a fully functional quality inspector with:
- Quality tier selection
- LOD controls
- Geometry settings
- Real-time preview

## With QualityProfileManager (2 minutes)

```tsx
import { QualityInspector, useQualityInspector } from '@hololand/renderer';
import { createQualityProfileManager } from '@hololand/quality-profiles';

const qualityManager = createQualityProfileManager({
  defaultProfile: 'industrial',
});

function App() {
  const { currentProfile, setProfile } = useQualityInspector({
    initialProfile: 'industrial',
  });

  const handleProfileChange = (profile) => {
    qualityManager.setProfile(profile);
    setProfile(profile);

    // Apply to your renderer
    const settings = qualityManager.getEffectiveQualitySettings();
    console.log('New quality settings:', settings);
  };

  return (
    <QualityInspector
      currentProfile={currentProfile}
      onProfileChange={handleProfileChange}
      onLODChange={(params) => {
        console.log('LOD updated:', params);
        // renderer.setLODConfig(params);
      }}
      onGeometryChange={(params) => {
        console.log('Geometry updated:', params);
        // renderer.setMaxPolyCount(params.maxPolyCount);
      }}
    />
  );
}
```

## With Fire Effects (3 minutes)

```tsx
import { QualityInspector, useQualityInspector } from '@hololand/renderer';

function App() {
  const {
    currentProfile,
    setProfile,
    presets,
    savePreset,
    loadPreset
  } = useQualityInspector({
    persistPresets: true, // Saves to localStorage
  });

  return (
    <QualityInspector
      currentProfile={currentProfile}
      onProfileChange={setProfile}
      onFireEffectChange={(params) => {
        console.log('Fire effect updated:', params);
        // fireSystem.setIntensity(params.intensity);
        // fireSystem.setColor(params.color);
        // fireSystem.setParticleCount(params.particleCount);
      }}
      onPresetSave={savePreset}
      onPresetLoad={loadPreset}
      presets={presets}
      showFireControls={true}
      enablePreview={true}
    />
  );
}
```

## Common Use Cases

### 1. Manual Apply (for expensive operations)

```tsx
<QualityInspector
  currentProfile="cinematic"
  enablePreview={false}  // Disable real-time updates
  onLODChange={(params) => {
    // Only fires when user clicks "Apply Changes"
    expensiveRendererUpdate(params);
  }}
/>
```

### 2. Debounced Updates

```tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedUpdate = useDebouncedCallback(
  (params) => {
    renderer.updateLOD(params);
  },
  300 // 300ms delay
);

<QualityInspector
  currentProfile="industrial"
  onLODChange={debouncedUpdate}
  enablePreview={true}
/>
```

### 3. VR Auto-Switch

```tsx
import { useXR } from '@react-three/xr';

function VRApp() {
  const { isPresenting } = useXR();
  const { currentProfile, setProfile } = useQualityInspector();

  useEffect(() => {
    // Auto-switch to mobile profile in VR
    if (isPresenting) {
      setProfile('mobile');
    }
  }, [isPresenting]);

  return <QualityInspector currentProfile={currentProfile} />;
}
```

### 4. Export/Import Presets

```tsx
function PresetManager() {
  const { exportPresets, importPresets } = useQualityInspector();

  const handleExport = () => {
    const json = exportPresets();
    // Download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presets.json';
    a.click();
  };

  const handleImport = (file) => {
    file.text().then((json) => {
      const success = importPresets(json);
      alert(success ? 'Imported!' : 'Failed');
    });
  };

  return (
    <>
      <button onClick={handleExport}>Export</button>
      <input type="file" onChange={(e) => handleImport(e.target.files[0])} />
    </>
  );
}
```

## Props Reference (Quick)

| Prop | Required | Default | Description |
|------|----------|---------|-------------|
| `currentProfile` | ✅ | - | Current quality profile |
| `onProfileChange` | ❌ | - | Profile change callback |
| `onLODChange` | ❌ | - | LOD change callback |
| `onGeometryChange` | ❌ | - | Geometry change callback |
| `onFireEffectChange` | ❌ | - | Fire effect change callback |
| `showFireControls` | ❌ | `false` | Show fire controls tab |
| `enablePreview` | ❌ | `true` | Real-time updates |
| `presets` | ❌ | `[]` | Saved presets |

## Hook Options (Quick)

| Option | Default | Description |
|--------|---------|-------------|
| `initialProfile` | `'industrial'` | Starting profile |
| `persistPresets` | `true` | localStorage on/off |
| `enablePreview` | `true` | Real-time updates |

## Next Steps

1. **Full Documentation**: See [README.md](./README.md)
2. **Examples**: See [example.tsx](./example.tsx)
3. **Implementation Details**: See [IMPLEMENTATION.md](./IMPLEMENTATION.md)
4. **Tests**: See `__tests__/` directory

## Troubleshooting

### Issue: Changes not applying

**Solution**: Check if `enablePreview={true}` and callbacks are provided:

```tsx
<QualityInspector
  enablePreview={true}  // Must be true for real-time
  onLODChange={(params) => {
    console.log('Callback fired:', params);
  }}
/>
```

### Issue: Presets not saving

**Solution**: Ensure `persistPresets={true}` in hook:

```tsx
const { savePreset } = useQualityInspector({
  persistPresets: true,  // Enable localStorage
});
```

### Issue: Fire tab not showing

**Solution**: Set `showFireControls={true}`:

```tsx
<QualityInspector showFireControls={true} />
```

## Support

- **Issues**: HoloLand GitHub repository
- **Documentation**: This directory's README.md
- **Examples**: example.tsx in this directory

---

**You're ready to go!** Start with the minimal example and add features as needed.
