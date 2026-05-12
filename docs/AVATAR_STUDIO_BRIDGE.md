# Avatar Studio Bridge

HoloLand's avatar pipeline: HoloScript avatar declarations ↔ `AvatarBlueprint` ↔ VRM 1.0 export. Lives in [`packages/ar/avatar-studio/`](../packages/ar/avatar-studio/).

> **Correction:** the [March 2026 audit](./HOLOLAND_DOCUMENTATION_AUDIT_MARCH_2026.md) listed this doc under "Severely Deprecated", claiming Avatar Studio was retired. That verdict was wrong. The 2026-05-07 [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) classifies `packages/ar/avatar-studio` as a live AR-bridge package needing bridge rationale (which this doc supplies), not retirement. Disk wins; the package is alive with src + tests.

## Status

Alive. Provides Ready Player Me's vacated migration path — see [`packages/ar/avatar-studio/MIGRATION_FROM_RPM.md`](../packages/ar/avatar-studio/MIGRATION_FROM_RPM.md). TypeScript bridge code is permitted under the [HoloScript Source Contract](./HOLOSCRIPT_SOURCE_CONTRACT.md) for hardware/format adapter layers; HoloScript is the source of truth for avatar *semantics* (skeleton, body, face, expressions), VRM is the wire format.

## Modules

| Module | Source-of-truth file | Role |
|---|---|---|
| Studio facade | [`AvatarStudio.ts`](../packages/ar/avatar-studio/src/AvatarStudio.ts) | Orchestrates blueprint, preview, catalog, exporter, mesh assembler, and cloud service. |
| Embeddable SDK (RPM replacement) | [`AvatarStudioSDK.ts`](../packages/ar/avatar-studio/src/AvatarStudioSDK.ts) | Iframe / popup / inline / API integration modes. |
| Blueprint manager | [`AvatarBlueprintManager.ts`](../packages/ar/avatar-studio/src/AvatarBlueprintManager.ts) | State, undo/redo, serialization. |
| HoloScript ↔ Blueprint bridge | [`HoloScriptAvatarBridge.ts`](../packages/ar/avatar-studio/src/HoloScriptAvatarBridge.ts) | `parseHoloScriptAvatar()`, `holoScriptToBlueprint()`, `blueprintToHoloScript()`. |
| VRM 1.0 export | [`VRMExporter.ts`](../packages/ar/avatar-studio/src/VRMExporter.ts) | 8-step pipeline: validate → prepare scene → inject metadata → inject expressions → optimize meshes → check budget → export binary → finalize. |
| Mesh assembly | [`AvatarMeshAssembler.ts`](../packages/ar/avatar-studio/src/AvatarMeshAssembler.ts) | Body, face, hair, clothing geometry. |
| Procedural body | [`ProceduralBodyGenerator.ts`](../packages/ar/avatar-studio/src/ProceduralBodyGenerator.ts) | Generated body geometry from blueprint params. |
| Asset catalog | [`AssetCatalog.ts`](../packages/ar/avatar-studio/src/AssetCatalog.ts) | Hair / clothing / accessory asset lookup; performance + compatibility filtering. |
| Preview renderer | [`AvatarPreviewRenderer.ts`](../packages/ar/avatar-studio/src/AvatarPreviewRenderer.ts) | Three.js preview with VRM, lighting, camera. |
| Cloud service | [`AvatarCloudService.ts`](../packages/ar/avatar-studio/src/AvatarCloudService.ts) | Save / load / version / share avatars via CDN. |
| React UI | [`components/`](../packages/ar/avatar-studio/src/components/) | `ScenarioGallery`, `StudioModeSwitcher`. |

Public exports: see [`packages/ar/avatar-studio/src/index.ts`](../packages/ar/avatar-studio/src/index.ts).

## HoloScript declaration → blueprint → VRM

`HoloScriptAvatarBridge` parses avatar declarations like:

```holoscript
avatar#player
  @skeleton(type: "humanoid", ik_enabled: true)
  @body(preset: "athletic", height: 1.8)
  @face(shape: "oval")
  @expressive(blend_shapes: true, auto_blink: true)
  @locomotion(style: "realistic", walk_speed: 1.4)
{
  name: "Player Avatar"
  vrm_url: "https://assets.hololand.io/avatars/player.vrm"
}
```

into [`HoloScriptAvatarNode`](../packages/ar/avatar-studio/src/HoloScriptAvatarBridge.ts), then converts to/from the studio's internal [`AvatarBlueprint`](../packages/ar/avatar-studio/src/types.ts). The blueprint feeds `AvatarMeshAssembler` for geometry and `VRMExporter` for the wire format. Both directions are supported (parse for ingest; emit for round-trip).

## VRM export pipeline

`VRMExporter.export(blueprint, scene, config?)` runs the 8-step pipeline described above ([`VRMExporter.ts`](../packages/ar/avatar-studio/src/VRMExporter.ts)). Output is VRM 1.0 with humanoid skeleton, expressions, and metadata that is downstream-compatible with VRChat, cluster, and Vroid Hub.

Quality presets (`full` / `optimized` / `mobile`) trade texture resolution, mesh optimization, physics inclusion, and animation inclusion. Use `optimized` for Quest, `mobile` for AR phones, `full` for desktop authoring.

## Performance budgets

The exporter enforces poly count and draw-call budgets per target platform. For the broader render-side budget system that integrates with these presets, see [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md) — quality profiles drive HoloLand-wide tier choice; the avatar-studio export config is the avatar-specific subset.

## RPM migration

Ready Player Me shut down public developer services on 2026-01-31. The [migration guide](../packages/ar/avatar-studio/MIGRATION_FROM_RPM.md) covers iframe, popup, inline, and REST integration paths plus the avatar data-model changes from RPM's GLB pipeline to VRM 1.0.

## See also

- [`packages/ar/avatar-studio/MIGRATION_FROM_RPM.md`](../packages/ar/avatar-studio/MIGRATION_FROM_RPM.md) — RPM → Avatar Studio migration.
- [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md) — platform-wide quality tier presets.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) — semantics belong in HoloScript; bridges may stay TS.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) — current source-of-truth.
