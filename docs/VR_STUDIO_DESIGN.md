# VR Studio Design (OASIS)

Design doc for the in-VR HoloLand creator experience — wrist powers, holographic
glass UI, marketplace portals. Lives upstream of any specific implementation;
this is intent, not shipped surface.

> **Status:** design doc. The wrist-power gesture surface, marketplace portal,
> and asset-shelf interactions described below are **not yet wired** in the
> HoloLand packages. Use this as the design north-star when building VR-side
> Studio surfaces; do not cite it as if it were a current feature. The earlier
> version of this doc and the related design `HOLOLAND_OASIS_CENTRAL_DESIGN.md`
> have moved to [`docs/archive/`](./archive/HOLOLAND_OASIS_CENTRAL_DESIGN.md).

## Where the building blocks already live on disk

The wrist-power surface is design intent; the underlying tracking and AR
primitives it would rest on already exist as bridges:

| Building block | Source-of-truth file |
|---|---|
| Hand / wrist keypoint tracking | [`packages/ar/tracking/src/holoscript/bindings.ts`](../packages/ar/tracking/src/holoscript/bindings.ts) — `left_wrist` / `right_wrist` keypoints |
| Pose / skeleton types | [`packages/ar/tracking/dist/types-DEt2aiAp.d.ts`](../packages/ar/tracking/dist/types-DEt2aiAp.d.ts) |
| Detection keypoint enum | [`packages/ar/detection/src/types.ts`](../packages/ar/detection/src/types.ts) |
| Avatar / VRM pipeline | [`packages/ar/avatar-studio/`](../packages/ar/avatar-studio/) — see [`AVATAR_STUDIO_BRIDGE.md`](./AVATAR_STUDIO_BRIDGE.md) |
| Templates the asset shelf would surface | [`examples/hololand-central/templates/`](../examples/hololand-central/templates/) (10 `.holo` worlds) and [`packages/components/templates/`](../packages/components/templates/) |
| Brittney chat (the "Chat / Brittney AI" wrist slot would call into) | [`packages/brittney/toolkit/src/chat/`](../packages/brittney/toolkit/src/chat/) and [`@hololand/ai-bridge`](../packages/brittney/ai-bridge/src/) |

What is missing is the gesture-recognition glue, the holographic-glass UI
primitives, and the marketplace-portal renderer that would turn these into
the OASIS experience.

## Design principles

1. **90% invisible** — zero UI unless actively creating.
2. **Holographic glass** — translucent, glowing edges, no solid backgrounds.
3. **One thing at a time** — never more than one floating card visible.
4. **Physical metaphors** — marketplace = portal, assets = shelf, tools = wrist powers.
5. **Contextual** — appears on intent, fades on disengagement.
6. **Gamers first** — playing a game should feel like a game, not an IDE.

## Wrist powers (basic set, design)

Double-tap wrist → power ring appears as a glowing arc around the user's hand.

| Power | Gesture | Effect |
|---|---|---|
| Select | Point at object | Highlights object, whisper-label appears (name, type, creator) |
| Grab | Pinch object | Pick up, move in 3D space |
| Rotate | Spin wrist while grabbing | Rotate selected object |
| Scale | Spread / pinch with two hands | Resize selected object |
| Paint | Draw in air | Creates HoloScript geometry (lines, shapes, volumes) |
| Inspect | Hold palm up toward object | Single holographic card: properties, code, edit button |
| Delete | Flick away while grabbing | Remove from scene (undo via wrist menu) |
| Spawn | Cup hands and pull apart | Opens asset shelf — pull items off to place |
| Portal | Draw circle in air | Opens marketplace portal — walk through to browse |
| Save | Tap wrists together | Saves current scene state |

These are design names. The gesture-to-action wiring is not implemented —
treat as a target for [`packages/ar/tracking/`](../packages/ar/tracking/)
binding work, not as an extant API.

## Wrist menu (design)

Tap wrist → minimal ring with five icons:

- Powers (toggle creator mode)
- Avatar
- Teleport
- Chat / Brittney AI
- Settings

## Holographic UI elements (design)

| Element | Trigger | Content |
|---|---|---|
| Object whisper | 0.5 s after pointing at an object | Name + 1-line description + creator badge. Translucent glass card, ~20 cm wide, floats 10 cm above object. Fades 2 s after looking away. |
| Property card | Palm held toward selected object | Key properties (position, material, behaviors), mini code snippet, Edit button. ~40 cm card with slight glass blur. |
| Asset shelf | Cup hands and pull apart | 3D carousel of recent / favorite assets across categories (scenes, characters, props, skills, templates). |
| Marketplace portal | Draw circle gesture in air | Glowing ring portal; walk through to enter immersive marketplace space; walk back to exit. |

## Power extension (design)

Custom wrist powers would be authored in HoloScript. Example shape (illustrative):

```holoscript
power "Laser Cutter" {
  gesture: "finger_gun"
  trigger: "index_pinch"

  on_activate {
    emit ray from hand.index_tip
    on_hit(object) {
      split(object, ray.plane)
      play_effect("slice_spark")
    }
  }

  icon: "⚡"
  slot: 6
}
```

The HoloScript `power` primitive is not yet defined — implementing this design
requires adding it upstream in HoloScript per the
[HoloScript Source Contract](./HOLOSCRIPT_SOURCE_CONTRACT.md), then wiring
gesture recognition in [`packages/ar/tracking/`](../packages/ar/tracking/).

## Mode transitions (design)

```text
Game Mode (default)
  └── double-tap wrist → Creator Mode
        ├── tap wrist → Wrist Menu (minimal ring)
        ├── gestures → Use powers directly
        ├── draw circle → Marketplace Portal
        └── double-tap wrist → back to Game Mode
```

## 2D-to-3D bridge (design)

The intent is that Studio's 2D web surface and the in-VR Studio share state.
The 2D Studio referenced in the original draft used a Zustand `useSceneStore`
abstraction; **no `useSceneStore` symbol currently exists in this repo**.
Treat the bridge below as a target architecture, not a current contract.

| HoloScript Studio (2D) | → | HoloLand VR (3D) |
|---|---|---|
| Scene store (planned shared) | shared | Same store, different renderers |
| Panel-visibility store (planned) | maps to | Power-ring slot visibility |
| Scene Graph panel | becomes | Select + Inspect whispers |
| Properties panel | becomes | Property card |
| Asset library | becomes | Asset shelf (3D carousel) |
| Upload Wizard | becomes | Marketplace portal |
| Code editor | becomes | Single floating code card |
| Marketplace filters | becomes | Spatial categories in portal |

When this bridge is built, both directions should sync — edits in VR appear in
the web Studio and vice versa.

## Claims dropped

- **"useSceneStore (Zustand) shared today"** — no such symbol in the repo;
  was implementation aspiration, not shipped contract. Re-classified as
  "planned shared".
- **"Power Marketplace, custom powers sold today"** — no marketplace surface
  yet. Treated as design target.
- **Implementation-status framing in the original ("users get basic powers
  via their wrists")** — flipped to design intent; no gesture binding wired.

## See also

- [`AVATAR_STUDIO_BRIDGE.md`](./AVATAR_STUDIO_BRIDGE.md) — avatar pipeline that
  the OASIS avatar slot would consume.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) — gesture
  bindings and Studio surfaces should land as HoloScript source first, not as
  hand-authored TS.
- [`docs/archive/HOLOLAND_OASIS_CENTRAL_DESIGN.md`](./archive/HOLOLAND_OASIS_CENTRAL_DESIGN.md)
  — earlier OASIS design draft.
- [`packages/ar/tracking/`](../packages/ar/tracking/) — the binding layer this
  design depends on.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
  — `packages/ar/tracking` and adapters classified as bridge code.
