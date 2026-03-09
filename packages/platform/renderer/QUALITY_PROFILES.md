# Quality Profile Integration Guide

**Package**: `@hololand/renderer`
**Feature**: Domain-Specific Quality Tier Profiles
**Status**: ✅ Integrated
**Version**: 1.0.0

## Overview

The HololandRenderer now integrates with `@hololand/quality-profiles` to provide domain-specific quality tier configurations optimized for specific use cases. This allows for fine-tuned rendering, physics, networking, and material settings that go beyond the basic quality presets.

## Three Quality Profiles

### 🏭 Industrial Profile

**Priority**: Data Accuracy over Visual Fidelity

**Optimized for**:
- Digital twins
- IoT sensor visualization
- Factory floor simulations
- Precision measurement tools
- CAD/BIM viewers

**Key Settings**:
- Physics: Exact accuracy with 4 substeps, continuous collision detection
- Shadows: Basic (1024px) for spatial awareness only
- Textures: Standard resolution (1024px), focus on geometry accuracy
- Post-processing: Disabled (only FXAA antialiasing)
- Target FPS: 60
- Network Sync: 10Hz for real-time IoT data

**Use when**: Data accuracy and collision precision are critical, visual fidelity is secondary.

---

### 🎬 Cinematic Profile

**Priority**: Visual Fidelity for Marketing and Entertainment

**Optimized for**:
- Marketing demos
- Architectural visualization
- Entertainment experiences
- Product showcases
- Film/TV pre-visualization

**Key Settings**:
- Physics: Standard accuracy (3 substeps), sufficient for visuals
- Shadows: Soft, high-resolution (4096px)
- Textures: Maximum resolution (4096px) with full anisotropic filtering
- Post-processing: Full suite (Bloom, SSAO, SSR, tone mapping, TAA)
- Materials: Full PBR with normal maps, roughness/metallic
- Environment: HDRI with real-time reflections
- Audio: Studio quality
- Target FPS: 60
- Network Sync: 20Hz for smooth multi-user experiences

**Use when**: Maximum visual quality is required, performance is less critical, typically for PC VR or desktop.

---

### 📱 Mobile Profile

**Priority**: Performance for Standalone Headsets

**Optimized for**:
- Quest standalone (Quest 2/3/Pro)
- Mobile AR (phones/tablets)
- Low-power devices
- Battery-constrained scenarios

**Key Settings**:
- Physics: Basic accuracy (1 substep), discrete collision
- Shadows: Basic (512px)
- Textures: Compressed, low resolution (512px)
- Post-processing: Disabled
- LOD: Aggressive (5 levels, 2x distance multiplier)
- Materials: Simple standard materials, no normal maps
- Target FPS: 72 (Quest native)
- Pixel Ratio: 0.75 (reduced resolution)
- Network Sync: 5Hz to conserve bandwidth

**Use when**: Running on mobile hardware with limited GPU/battery, need to maintain high frame rates.

---

## Basic Usage

### Setting a Profile

```typescript
import { HololandRenderer } from '@hololand/renderer';
import { HololandWorld } from '@hololand/world';

const canvas = document.createElement('canvas');
const world = new HololandWorld({ name: 'my-world' });

const renderer = new HololandRenderer(canvas, world);

// Set quality profile
renderer.setQualityProfile('industrial');
// or
renderer.setQualityProfile('cinematic');
// or
renderer.setQualityProfile('mobile');
```

### Getting Current Profile

```typescript
const currentProfile = renderer.getQualityProfile();
console.log(currentProfile?.name);        // 'industrial'
console.log(currentProfile?.priority);    // 'data-accuracy'
console.log(currentProfile?.displayName); // 'Industrial'
```

### Applying Profile with Overrides

```typescript
renderer.setQualityProfile('industrial', {
  overrides: {
    targetFPS: 90,        // Custom FPS target
    shadowMapSize: 2048,  // Better shadows than default
  },
  traitOverrides: {
    networking: {
      enabled: true,
      syncRate: 20,       // Faster sync than default 10Hz
      interpolation: true,
      compression: false,
    },
  },
});
```

## Composition Metadata Integration

### HoloScript Composition Metadata

Quality profiles can be embedded in HoloScript compositions and automatically applied when the world is loaded:

```typescript
// In your HoloScript composition, add a metadata object
world.addObject(new SpatialObject({
  type: 'composition:metadata',
  metadata: {
    qualityProfile: {
      profile: 'cinematic',
      overrides: {
        targetFPS: 90,
        shadowMapSize: 2048,
      },
    },
  },
}));

// When the renderer loads the world, it automatically applies the profile
const renderer = new HololandRenderer(canvas, world);
// Profile is now 'cinematic' with custom overrides
```

### Programmatic Application

```typescript
import type { CompositionQualityMetadata } from '@hololand/quality-profiles';

const metadata: CompositionQualityMetadata = {
  profile: 'industrial',
  overrides: {
    targetFPS: 90,
    shadowMapSize: 2048,
  },
  traitOverrides: {
    networking: {
      enabled: true,
      syncRate: 20,
      interpolation: true,
      compression: false,
    },
  },
};

renderer.applyCompositionQualityMetadata(metadata);
```

## Advanced Usage

### Profile Recommendation

Let the system recommend a profile based on detected device type:

```typescript
const recommendedProfile = renderer.recommendQualityProfile();

if (recommendedProfile) {
  renderer.setQualityProfile(recommendedProfile);
}
```

### Accessing the Profile Manager

For advanced control, access the QualityProfileManager directly:

```typescript
const profileManager = renderer.getQualityProfileManager();

if (profileManager) {
  // Get all available profiles
  const allProfiles = profileManager.getAllProfiles();

  // Get profile by name
  const industrial = profileManager.getProfileByName('industrial');

  // Compare profiles
  const diffs = profileManager.compareProfiles('industrial', 'cinematic');
  console.log(diffs);
  // [
  //   'Priority: data-accuracy → visual-fidelity',
  //   'Shadow map: 1024 → 4096',
  //   'Texture size: 1024 → 4096',
  //   ...
  // ]

  // Get profile summary
  const summary = profileManager.getProfileSummary('industrial');
  console.log(summary);
  // "Industrial (data-accuracy): Physics: exact, Collision: continuous, ..."

  // Recommend by tags
  const tags = ['digital-twin', 'iot', 'precision'];
  const recommended = profileManager.recommendProfileByTags(tags);
  // 'industrial'

  // Validate metadata
  const validation = profileManager.validateMetadata({
    profile: 'industrial',
    overrides: { targetFPS: 20 }, // Too low!
  });
  if (!validation.valid) {
    console.error(validation.errors);
    // ['Target FPS too low (min 30)']
  }
}
```

### Runtime Profile Switching

Profiles can be switched at runtime without recreating the renderer:

```typescript
// Start with mobile for initial load
renderer.setQualityProfile('mobile');

// Later, detect device capabilities and upgrade
const gpuTier = renderer.getQualityManager().getGPUInfo().tier;

if (gpuTier === 'high' || gpuTier === 'ultra') {
  renderer.setQualityProfile('cinematic');
}
```

### Performance-Based Auto-Adjustment

```typescript
// Monitor FPS and adjust profile
function adjustQualityForPerformance(currentFPS: number) {
  const currentProfile = renderer.getQualityProfile();
  const targetFPS = currentProfile?.renderSettings.targetFPS ?? 60;

  if (currentFPS < targetFPS * 0.8) {
    // Performance low, downgrade
    if (currentProfile?.name === 'cinematic') {
      renderer.setQualityProfile('industrial');
    } else if (currentProfile?.name === 'industrial') {
      renderer.setQualityProfile('mobile');
    }
  } else if (currentFPS > targetFPS * 1.3) {
    // Performance excellent, upgrade
    if (currentProfile?.name === 'mobile') {
      renderer.setQualityProfile('industrial');
    } else if (currentProfile?.name === 'industrial') {
      renderer.setQualityProfile('cinematic');
    }
  }
}

// Call periodically
setInterval(() => {
  const stats = renderer.getQualityManager().getPerformanceStats();
  adjustQualityForPerformance(stats.averageFPS);
}, 2000);
```

## Integration with Existing Systems

### Quality Manager

Quality profiles work in conjunction with the existing QualityManager:

- **QualityManager**: Low-level quality presets (low, medium, high, ultra)
- **QualityProfileManager**: Domain-specific configurations that apply settings to QualityManager

When you set a quality profile, it automatically updates the QualityManager's settings via `applyOverrides()`.

### Lighting Fidelity Manager

Quality profiles set the target FPS which the LightingFidelityManager uses for automatic lighting level adjustments:

```typescript
// Industrial profile sets targetFPS: 60
renderer.setQualityProfile('industrial');

// LightingFidelityManager now uses 60 FPS as the target for auto-adjustment
const lfm = renderer.getLightingFidelityManager();
console.log(lfm.getMetrics().targetFPS); // 60
```

### Material Factory

Quality profiles configure material settings that the MaterialFactory uses:

```typescript
// Cinematic profile: Full PBR with normal maps
renderer.setQualityProfile('cinematic');

const profile = renderer.getQualityProfile();
console.log(profile?.traitConfig.material);
// {
//   pbrEnabled: true,
//   normalMaps: true,
//   roughnessMetallic: true,
//   emissive: true,
//   maxTextureResolution: 4096,
// }
```

## Profile Configuration Reference

### Render Settings

| Setting               | Industrial | Cinematic | Mobile |
|-----------------------|------------|-----------|--------|
| shadowMapSize         | 1024       | 4096      | 512    |
| maxTextureSize        | 1024       | 4096      | 512    |
| maxPolyCount          | 500,000    | 2,000,000 | 50,000 |
| lodBias               | 0.5        | 0         | 2      |
| postProcessing        | false      | true      | false  |
| bloom                 | false      | true      | false  |
| ssao                  | false      | true      | false  |
| ssr                   | false      | true      | false  |
| targetFPS             | 60         | 60        | 72     |
| pixelRatio            | 1.0        | 1.5       | 0.75   |

### Physics Configuration

| Setting               | Industrial | Cinematic | Mobile |
|-----------------------|------------|-----------|--------|
| physicsAccuracy       | exact      | standard  | basic  |
| substeps              | 4          | 3         | 1      |
| collisionDetection    | continuous | discrete  | discrete |

### Networking Configuration

| Setting     | Industrial | Cinematic | Mobile |
|-------------|------------|-----------|--------|
| syncRate    | 10Hz       | 20Hz      | 5Hz    |
| compression | true       | false     | true   |

### Audio Configuration

| Setting      | Industrial | Cinematic | Mobile |
|--------------|------------|-----------|--------|
| audioQuality | medium     | studio    | low    |

## Testing

Run integration tests:

```bash
cd packages/platform/renderer
pnpm test src/__tests__/integration/quality-profiles.integration.test.ts
```

Tests verify:
- ✅ All 3 profiles (industrial, cinematic, mobile)
- ✅ Profile settings application to QualityManager
- ✅ Composition metadata parsing and application
- ✅ Profile recommendation based on device type
- ✅ Runtime profile switching
- ✅ Profile manager API

## Examples

See `@hololand/quality-profiles/examples/renderer-integration.ts` for comprehensive usage examples including:

1. Basic integration
2. Renderer integration
3. Composition metadata application
4. Profile recommendation
5. Device-specific adjustment
6. Profile comparison
7. Runtime profile switching
8. All profiles overview

## Best Practices

### 1. **Choose the Right Profile**

- **Digital Twins / IoT / CAD**: Use `industrial` for accurate physics and collision
- **Marketing / Archviz / Demos**: Use `cinematic` for maximum visual quality
- **Quest Standalone / Mobile AR**: Use `mobile` for performance

### 2. **Use Composition Metadata**

Embed quality profiles in HoloScript compositions so they're automatically applied:

```typescript
world.addObject(new SpatialObject({
  type: 'composition:metadata',
  metadata: {
    qualityProfile: { profile: 'industrial' },
  },
}));
```

### 3. **Validate Before Applying**

Always validate composition metadata before applying:

```typescript
const profileManager = renderer.getQualityProfileManager();
const validation = profileManager?.validateMetadata(metadata);

if (validation?.valid) {
  renderer.applyCompositionQualityMetadata(metadata);
} else {
  console.error('Invalid metadata:', validation?.errors);
}
```

### 4. **Monitor and Adjust**

Use profile recommendation and performance monitoring to adjust quality at runtime:

```typescript
const recommended = renderer.recommendQualityProfile();
if (recommended) {
  renderer.setQualityProfile(recommended);
}
```

### 5. **Customize with Overrides**

Don't hesitate to customize profiles with overrides for your specific use case:

```typescript
renderer.setQualityProfile('industrial', {
  overrides: {
    targetFPS: 90,     // Higher FPS for smoother experience
    shadowMapSize: 2048, // Better shadows
  },
});
```

## API Reference

### HololandRenderer Methods

```typescript
// Get quality profile manager
getQualityProfileManager(): QualityProfileManager | null

// Set quality profile
setQualityProfile(profile: QualityProfileName, metadata?: CompositionQualityMetadata): void

// Get current quality profile
getQualityProfile(): Readonly<QualityProfile> | null

// Apply composition quality metadata
applyCompositionQualityMetadata(metadata: CompositionQualityMetadata): void

// Recommend profile based on device
recommendQualityProfile(): QualityProfileName | null
```

### Quality Profile Types

```typescript
type QualityProfileName = 'industrial' | 'cinematic' | 'mobile'

type RenderingPriority = 'data-accuracy' | 'visual-fidelity' | 'performance'

type PhysicsAccuracy = 'none' | 'basic' | 'standard' | 'precise' | 'exact'

interface CompositionQualityMetadata {
  profile?: QualityProfileName
  overrides?: Partial<QualitySettings>
  traitOverrides?: Partial<QualityTraitConfig>
  priorityOverride?: RenderingPriority
}
```

## Migration Guide

### From Basic Quality Presets

**Before**:
```typescript
const renderer = new HololandRenderer(canvas, world, {
  quality: 'high',
  qualityOverrides: {
    shadowMapSize: 4096,
    bloom: true,
    ssao: true,
  },
});
```

**After**:
```typescript
const renderer = new HololandRenderer(canvas, world);
renderer.setQualityProfile('cinematic'); // Includes all those settings and more
```

### From Manual Configuration

**Before**:
```typescript
renderer.setQuality('medium');
renderer.getQualityManager().applyOverrides({
  shadowMapSize: 1024,
  maxTextureSize: 1024,
  postProcessing: false,
  // ... many manual settings
});
```

**After**:
```typescript
renderer.setQualityProfile('industrial'); // One line, domain-optimized
```

## Troubleshooting

### Profile Not Applied

**Problem**: Profile settings don't seem to be applied.

**Solution**: Ensure the QualityProfileManager is initialized:

```typescript
const profileManager = renderer.getQualityProfileManager();
if (!profileManager) {
  console.error('QualityProfileManager not initialized');
}
```

### Composition Metadata Not Loading

**Problem**: Metadata object in world not being detected.

**Solution**: Ensure the object type is exactly `'composition:metadata'`:

```typescript
world.addObject(new SpatialObject({
  type: 'composition:metadata', // Must be this exact string
  metadata: {
    qualityProfile: { profile: 'industrial' },
  },
}));
```

### Invalid Metadata Errors

**Problem**: Metadata validation fails.

**Solution**: Check validation errors and ensure metadata is well-formed:

```typescript
const profileManager = renderer.getQualityProfileManager();
const validation = profileManager?.validateMetadata(metadata);

if (!validation?.valid) {
  console.error('Validation errors:', validation?.errors);
  // Fix errors and try again
}
```

## Related Documentation

- [QualityManager Guide](./GPU_MEMORY_INTEGRATION_GUIDE.md) - Low-level quality presets
- [LightingFidelityManager Guide](./README.md#lighting-fidelity) - Automatic lighting adjustment
- [GPU Memory Management](./GPU_MEMORY_BUDGET_MANAGEMENT_PLAN.md) - GPU memory budgets
- [@hololand/quality-profiles Package](../quality-profiles/README.md) - Standalone package docs

## Support

For issues or questions:
- File an issue on GitHub
- Check integration tests for usage examples
- Review the example code in `@hololand/quality-profiles/examples/`

---

**Last Updated**: 2026-03-07
**Integration Version**: 1.0.0
