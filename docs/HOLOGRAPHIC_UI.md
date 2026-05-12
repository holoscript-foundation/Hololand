# Holographic UI

HoloLand-side UI surface. Two layers ship today: a 2D component canvas (`@hololand/ui`) and a 3D in-world primitives layer that renders HoloScript data cells via Three.js `CSS3DRenderer`.

> The pre-2026-05 version of this doc described a `HolographicUI` global with gesture menus, voice commands, friend dots, and a portal browser. None of those symbols exist in `packages/platform/ui/`. The doc has been collapsed to what is actually shipped. Conceptual VR-UX guidance and roadmap content has been dropped rather than carried forward without disk evidence.

## Status

Alive. `packages/platform/ui` is classified **Keep — reduce TS product logic** in the 2026-05-07 should-exist audit ([`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)). Per the [HoloScript Source Contract](./HOLOSCRIPT_SOURCE_CONTRACT.md), product UI behavior should move into `.holo` / `.hsplus`; the package already carries `index.hsplus`, `types.hsplus`, `UICanvas.hsplus`, and matching `.hsplus` files for every primitive.

## Surfaces

| Surface | Source-of-truth file | Role |
|---|---|---|
| 2D component canvas | [`packages/platform/ui/src/UICanvas.ts`](../packages/platform/ui/src/UICanvas.ts) ([`.hsplus`](../packages/platform/ui/src/UICanvas.hsplus)) | Mounts `UIComponent` instances onto an HTML canvas; supports themes, batching, breakpoints. |
| 2D components | [`packages/platform/ui/src/components/`](../packages/platform/ui/src/components/) | `Button`, `TextInput`, `Panel`, `Text`, `Image`, `Slider`, `Toggle`, `Dropdown`, `Modal`, `List`, `FlexContainer`, `GridContainer`, `ScrollView`, `TabView`, plus HUD/economy components. Each ships with a paired `.hsplus`. |
| Adaptive layout | [`packages/platform/ui/src/AdaptiveLayout.ts`](../packages/platform/ui/src/AdaptiveLayout.ts) | `kidTheme` / `expertTheme` and `UserMode` mode switching. |
| Universal input | [`packages/platform/ui/src/InteractionBridge.ts`](../packages/platform/ui/src/InteractionBridge.ts) | One pointer event shape across mouse, touch, and WebXR controllers (`HoloPointerType`). |
| 3D HoloPrimitives | [`packages/platform/ui/src/holo/HoloPrimitives.ts`](../packages/platform/ui/src/holo/HoloPrimitives.ts) | Data-cell types: `HoloTextData`, `HoloMetricData`, `HoloListData`, `HoloStatusData`, `HoloProgressData`, `HoloChartData`, `HoloInputData`, `HoloButtonData`. |
| 3D panel renderer | [`packages/platform/ui/src/holo/HoloPanel3D.ts`](../packages/platform/ui/src/holo/HoloPanel3D.ts) | Mounts data cells as `CSS3DObject` instances inside a Three.js scene. |
| Theme system | [`packages/platform/ui/src/theme/`](../packages/platform/ui/src/theme/) | `lightTheme`, `darkTheme`, `highContrastTheme`. |

Public exports: see [`packages/platform/ui/src/index.ts`](../packages/platform/ui/src/index.ts).

## Two-layer model

```
2D layer  → UICanvas + components/   (HTML canvas, themes, accessibility)
3D layer  → holo/ HoloPrimitives + HoloPanel3D  (CSS3DObject in Three.js scene)
Bridge    → InteractionBridge        (one pointer event for mouse/touch/XR)
```

Use the 2D layer for non-immersive shells, debugging HUDs, and 2D-mode fallbacks. Use the 3D HoloPrimitive layer when a panel needs to live in world space alongside HoloScript-authored content. The renderer-side `HoloPanel3D` is the bridge between [`DataCellDefinition`](../packages/platform/ui/src/holo/HoloPrimitives.ts) and the live Three.js scene.

## What this package does *not* own

| Concern | Lives in |
|---|---|
| Voice / speech | [`packages/platform/voice/`](../packages/platform/voice/) (`SpeechRecognizer.ts`, `TextToSpeech.ts`) plus [`packages/brittney/ai-bridge/src/VoiceMCPPipeline.ts`](../packages/brittney/ai-bridge/src/VoiceMCPPipeline.ts) for the in-VR authoring pipeline. |
| Hand / body / emotion gestures | [`packages/platform/gestures/`](../packages/platform/gestures/) (`hand.ts`, `body.ts`, `emotion.ts`, `sequence.ts`). |
| Haptics | [`packages/platform/haptics/`](../packages/platform/haptics/). |
| Avatars | [`packages/ar/avatar-studio/`](../packages/ar/avatar-studio/) — see [`AVATAR_STUDIO_BRIDGE.md`](./AVATAR_STUDIO_BRIDGE.md). |
| Quality / device tier presets | [`packages/platform/quality-profiles/`](../packages/platform/quality-profiles/) — see [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md). |
| Accessibility primitives | [`packages/platform/accessibility/`](../packages/platform/accessibility/). |

When wiring a voice command, gesture, or haptic into a UI surface, depend on those packages directly rather than re-exporting through `@hololand/ui`.

## See also

- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) — product UI behavior must move into HoloScript.
- [`HOLOLAND_PURPOSE.md`](./HOLOLAND_PURPOSE.md) — HoloLand owns runtime embodiment; UI surfaces are part of the embodiment layer.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md).
