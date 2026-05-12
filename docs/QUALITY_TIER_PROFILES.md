# Quality Tier Profiles

Domain-specific rendering presets that bundle render, physics, audio, and network settings under one profile name. Compositions select a profile via metadata; the renderer applies the bundle.

Lives in [`packages/platform/quality-profiles/`](../packages/platform/quality-profiles/) — `@hololand/quality-profiles`.

## Status

Alive. Listed in the 2026-05-07 [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) as **Keep — tie to hardware receipts**. The package is TypeScript today; per the [HoloScript Source Contract](./HOLOSCRIPT_SOURCE_CONTRACT.md) profile semantics should move into HoloScript metadata as the runtime matures.

## Modules

| Module | Source-of-truth file | Role |
|---|---|---|
| Profile manager | [`QualityProfileManager.ts`](../packages/platform/quality-profiles/src/QualityProfileManager.ts) | `setProfile`, `applyFromMetadata`, `getEffectiveQualitySettings`, `getEffectiveTraitConfig`, recommendation, validation. |
| Types + presets | [`types.ts`](../packages/platform/quality-profiles/src/types.ts) | `QualityProfile`, `QualitySettings`, `QualityTraitConfig`, plus `INDUSTRIAL_PROFILE`, `CINEMATIC_PROFILE`, `MOBILE_PROFILE`, `QUALITY_PROFILES`. |
| Public exports | [`index.ts`](../packages/platform/quality-profiles/src/index.ts) | Re-exports profiles, types, manager, factory. |

## Profiles

The shipped profile names are typed as `QualityProfileName = 'industrial' | 'cinematic' | 'mobile'` in [`types.ts`](../packages/platform/quality-profiles/src/types.ts). All concrete numeric values (shadow map size, poly budgets, sync rates, FPS targets) are defined in the same file — read it to see the current settings rather than copying them here.

| Profile | Priority | Use cases |
|---|---|---|
| `industrial` | `data-accuracy` | Digital twins, IoT visualization, CAD/BIM, training simulators. |
| `cinematic` | `visual-fidelity` | Marketing demos, archviz, entertainment, product showcases. |
| `mobile` | `performance` | Quest standalone, mobile AR, battery-constrained devices. |

The profile manager exposes `compareProfiles(a, b)` to surface the actual differences between two profiles — use it instead of memorizing values that will drift.

## HoloScript metadata interface

Compositions declare their profile in metadata:

```holoscript
composition IndustrialTwin {
  metadata {
    profile: "industrial",
    overrides: { targetFPS: 90 },
    traitOverrides: { networking: { syncRate: 20 } },
    priorityOverride: "performance"
  }
}
```

Shape: [`CompositionQualityMetadata`](../packages/platform/quality-profiles/src/types.ts) — `profile?`, `overrides?: Partial<QualitySettings>`, `traitOverrides?: Partial<QualityTraitConfig>`, `priorityOverride?: RenderingPriority`. Validate with `manager.validateMetadata(metadata)`.

## Wiring into the renderer

```ts
import { QualityProfileManager } from '@hololand/quality-profiles';

const manager = new QualityProfileManager({ defaultProfile: 'industrial' });
manager.applyFromMetadata(composition.metadata.quality);

renderer.getQualityManager().applyOverrides(manager.getEffectiveQualitySettings());
physicsEngine.configure(manager.getEffectiveTraitConfig().physics);
networkManager.configure(manager.getEffectiveTraitConfig().networking);
```

The renderer-side `QualityManager` lives at [`packages/platform/renderer/src/QualityManager.ts`](../packages/platform/renderer/src/QualityManager.ts) — that's the consumer of the effective quality settings.

## Recommendation helpers

The manager exposes three recommendation paths:

- `recommendProfileByTags(tags)` — `digital-twin` / `iot` / `precision` → `industrial`; `marketing` / `archviz` → `cinematic`; `quest` / `mobile-ar` → `mobile`.
- `recommendProfileByDevice(deviceType)` — Quest → `mobile`, PCVR → `cinematic`, etc.
- `recommendProfileByPriority(priority)` — direct `data-accuracy` / `visual-fidelity` / `performance` mapping.

Tag and device mappings live in [`QualityProfileManager.ts`](../packages/platform/quality-profiles/src/QualityProfileManager.ts) — read the source for the current table.

## Override discipline

Overrides apply on top of a profile. Stay close to profile intent — override `maxTextureSize` upward on a Quest 3 to take advantage of headroom, but don't override `industrial.physics.accuracy` down to `basic` or you defeat the profile's reason for existing. The [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) ties quality profiles to hardware receipts — the override pattern should produce a hardware receipt when it lands in production.

## See also

- [`packages/platform/quality-profiles/README.md`](../packages/platform/quality-profiles/README.md) — package-level quick-start.
- [`packages/platform/quality-profiles/IMPLEMENTATION_SUMMARY.md`](../packages/platform/quality-profiles/IMPLEMENTATION_SUMMARY.md) — implementation notes.
- [`AVATAR_STUDIO_BRIDGE.md`](./AVATAR_STUDIO_BRIDGE.md) — VRM exporter has its own per-target quality presets that should align with the HoloLand-wide profile.
- [`RUNTIME_SERVICE_CATALOG.md`](./RUNTIME_SERVICE_CATALOG.md) — `QualityManager` is one of the renderer-side services.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md).
