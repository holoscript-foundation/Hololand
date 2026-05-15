# HoloScript Inclusion Inventory For HoloShell

HoloShell's target is not an information dashboard. It is the HoloLand operating shell: a full-screen world that can wrap, reconstruct, and eventually replace legacy desktop/mobile UI with HoloScript-native objects.

The working product read is:

- Legacy windows become source-backed HoloScript object graphs.
- UI controls become geometric objects, labels, glyphs, particles, and interaction fields.
- Programs, agents, files, browsers, team rooms, receipts, and OS capabilities become bubbles or portals in the shell.
- Brittney becomes the assistant/AGI presence that sees shell state, explains risk, launches agents, and acts through receipts.
- Skins such as water, fire, developer circuitry, aura, glass, and hologram are source-level HoloScript projections, not one-off HTML/CSS themes.

Refresh the machine inventory from the HoloLand repo:

```powershell
node scripts\holoshell-holoscript-inventory.mjs --self-test
```

The full machine-readable inventory is written to:

```text
.tmp/holoshell/holoscript-inventory.json
```

## Scan Snapshot

Latest local scan source: `C:\Users\josep\Documents\GitHub\HoloScript`

| Surface | Count |
| --- | ---: |
| HoloScript packages | 69 |
| HoloScript services | 6 |
| Compiler files | 50 |
| Registered dialects | 26 |
| Trait source files scanned | 1996 |
| Trait/directive handlers detected | 538 |
| MCP server source files scanned | 198 |
| Compile-to MCP tool names detected | 27 |
| 2D parser element types | 15 |
| Native 2D trait handlers | 14 |
| Semantic 2D trait handlers | 8 |
| Three.js compiler geometries | 12 |
| Headless renderer geometries | 8 |

## HoloShell Inclusion Map

### Legacy UI Geometric Wrapper

This is the next big product primitive. HoloShell should capture a legacy app surface, turn it into `.holo` or `.hsplus`, and render it as a living object layer.

Use now:

- `HoloScript2DParser` for screen-native UI element grammar.
- `Native2DCompiler` for HTML and React projections.
- `DOM2DRenderer` for AST-to-DOM runtime projection.
- Semantic 2D traits for priority, intent, agent attention, live metrics, and particle feedback.
- Three.js/R3F geometry vocabulary for reconstructing controls as shapes.
- WebGPU, GPU instancing, splats, SDF, particles, and hologram media for high-density skins.

Bridge still needed:

- Windows/macOS/Android window enumeration.
- Accessibility tree capture.
- Screenshot plus OCR fallback for apps with poor accessibility metadata.
- Gesture-to-legacy-command adapter.
- A canonical HoloScript shell object schema for wrapped windows, controls, files, URLs, and processes.

### Water/Fire/Developer/Aura Skins

Skins should be HoloScript source artifacts. The shell can use animated materials, VFX particles, portals, holograms, bloom/glow, fluid fields, and procedural backgrounds to change the whole computer's behavior and feel.

Use now:

- R3F animated material vocabulary.
- VFX particles for fire, smoke, sparks, magic, rain, and snow.
- Fluid, portal, hologram, GPU particle, bloom, glass, ripple, flow, and wave surfaces.
- Headless screenshot/prerender path for visual receipts.

Bridge still needed:

- A promoted skin preset schema in HoloScript.
- Renderer path tuned for thousands of shell nodes plus stable text/icons.

### Brittney/AGI Presence

Brittney should not be a backend status panel. She should be the assistant layer inside the shell: voice/chat, context perception, agent orchestration, permission explanation, and receipt narration.

Use now:

- `@holoscript/aibrittney`.
- `AvatarEmbodimentTrait`, `AICompanionTrait`, `AvatarIntentTrait`, and voice hooks for embodied assistant state.
- AIBrittney `runAgentTurn` event stream for thinking, tool calls, tool results, final replies, and errors.
- Agent protocol and orchestration packages.
- Agent, companion, LLM, memory, intent, and HoloMesh trait/tool families.
- Semantic 2D `agent_attention` and `intent_driven`.
- Receipt, custody, permission, audit, identity, and team-room infrastructure.
- HoloLand Avatar Studio bridge for future VRM-quality avatar export.

Bridge still needed:

- Local screen/context perception contract.
- Strict per-action permission envelopes.
- Native host microphone/listening permission receipts.
- A production avatar renderer that upgrades the procedural preview to a VRM or Gaussian/splat persona.
- A native host action executor that can promote read-only shell proposals into approved app/file/browser operations.

### Program/File/Browser Bubbles

Programs, files, URLs, repositories, agents, and rooms should be shell objects with launch, preview, transform, and receipt behavior.

Use now:

- File, browser, HTTP, native call, computer-use, and system IO style surfaces where present.
- HoloScript CLI, package, MCP, and service surfaces.
- Absorb/GraphRAG/codebase intelligence for local projects and documents.
- HoloMesh team state for agent presence.

Bridge still needed:

- Canonical shell object schema.
- Per-object capability and permission envelopes.
- Reversible launch/action receipts.

### Cross-Platform HoloLand

HoloShell should author once in HoloScript and project to desktop web, mobile, VR/AR, game engines, services, and hologram media.

Registered compiler dialect groups:

- AI: `a2a-agent-card`
- Game engines: `godot`, `unity`, `unreal`
- IoT/robotics: `dtdl`, `sdf`, `urdf`
- Mobile: `android`, `ar`, `ios`
- Runtime/shader: `wasm`, `webgpu`
- Services/web: `nextjs-api`, `node-service`
- Web3D/native UI: `babylon`, `native-2d`, `playcanvas`, `r3f`, `threejs`
- XR/social VR: `android-xr`, `openxr`, `visionos`, `vrchat`, `vrr`
- Neuromorphic/meta: `nir`, `state`

## 2D Inventory

Parser element types:

```text
button, canvas, dropdown, flex-container, grid-container, image, list, modal,
panel, scroll-view, slider, tab-view, text, textinput, toggle
```

Native 2D traits:

```text
button, card, form, icon, image, input, layout, link, list, panel,
responsive, tailwind, text, theme
```

Semantic 2D traits:

```text
2d_canvas, agent_attention, dynamic_visual, intent_driven, live_metric,
particle_feedback, semantic_entity, semantic_layout
```

Inventory finding: `HoloScript2DParser` has default properties for `dashboard`, `card`, `metric`, `row`, and `col`, but the validator does not accept those as parser element types. HoloShell can still use `card` through Native 2D traits, but parser-level dashboard reconstruction should promote or explicitly map those types before relying on them.

## Geometry And Rendering Inventory

Three.js compiler geometry vocabulary:

```text
box, capsule, cone, cube, cylinder, ground, orb, plane, pyramid, ring,
sphere, torus
```

Headless renderer geometry vocabulary:

```text
box, capsule, cone, cube, cylinder, plane, sphere, torus
```

The live shell should favor R3F/Three.js for rich geometry and reserve headless rendering for proven visual slices until the headless path supports the same text, icon, portal, and high-density shape expectations.

High-density rendering candidates already visible in HoloScript:

- React Three Fiber renderer.
- Three.js compiler.
- WebGPU compiler.
- GPU splat sorting.
- GPU instancing.
- Shape pool rendering.
- SDF and SDF ray marching compilers.
- Gaussian splatting compiler/viewer.
- Hologram image/GIF/video, quilt, MV-HEVC, and parallax routes.
- Hologram worker pipeline.

## Critical Gaps

1. OS UI capture bridge: HoloScript has many pieces around browser/native/system/file capability, but HoloShell needs one canonical source contract that turns OS windows and accessibility trees into `.holo` graphs.
2. Legacy action adapter: reconstructed geometry must drive the original app until replacement apps exist.
3. Shell object schema: app/file/browser/agent/process/window objects need one HoloScript-owned schema.
4. Skin preset schema: skins need reusable source-level parameters for material, particles, fluid, typography, accessibility, and performance budgets.
5. Renderer parity: live R3F/Three.js can be richer than headless receipts today, so receipts must state which renderer proved the slice.

## Next Build Order

1. Define `holoshell-os-ui-capture.hsplus`: window, control, screenshot, accessibility tree, OCR, confidence, permission, and receipt contract.
2. Build a Windows-first read-only bridge that emits a shell object graph for active windows.
3. Render one captured legacy app as 1000+ geometric shapes in the HoloShell liquid world.
4. Route one interaction from geometric shell object back to the legacy app with a receipt.
5. Promote skin presets to HoloScript source and compile the same shell into liquid, fire, and developer skins.
6. Move Brittney from "panel" to "presence": chat/voice, context, action proposal, permission explanation, and receipt narration.
