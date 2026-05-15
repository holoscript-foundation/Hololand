# HoloShell Skin Simulation Research

**Status:** Research spec
**Date:** 2026-05-13
**Scope:** Source-level HoloShell skins and simulation behavior
**Source anchor:** `apps/holoshell/source/holoshell-skin-presets.hsplus`

## Purpose

HoloShell skins are not color themes. A skin changes how the whole operating
surface behaves, moves, responds, and explains state.

Water, fire, aura, developer circuitry, glass, hologram, and future skins need
source-level parameters for simulation, materials, accessibility, and hardware
budget.

## Skin Object

```text
ShellSkin
  id
  displayName
  materialSystem
  motionSystem
  particleSystem
  lightingModel
  typographyMode
  accessibilityMode
  performanceBudget
  riskVisualization
  receiptVisualization
  agentAttentionVisualization
```

## Skin Modes

| Skin | Behavior |
| --- | --- |
| `liquid` | Ripples, caustics, fluid bands, soft object buoyancy. |
| `fire` | Heat shimmer, embers, ignition highlights, mutation risk glow. |
| `aura` | Orbital fields, attention halos, soft presence pulses. |
| `developer` | Circuit traces, data lanes, control ids, route overlays. |
| `glass` | Refraction, blur, depth panes, low-noise focus state. |
| `hologram` | Scanlines, parallax, volumetric shimmer, projection errors. |

## Simulation Requirements

Each skin should define:

- How shell objects idle.
- How objects react to hover, focus, voice, and selection.
- How Brittney's attention moves through the shell.
- How approvals interrupt without becoming alarming by default.
- How receipts attach to objects.
- How risk is shown.
- How reduced-motion users receive equivalent state.

## Water Skin

Water is the default calm operating mode.

Expected effects:

- Large fluid background fields.
- Caustic highlights around active objects.
- Ripples for selection and voice activity.
- Buoyant shell objects.
- Approval chip as a dense droplet or pressure surface.
- Receipt timeline as sediment layers or wave rings.

Risk language:

- Read-only: clear ripple.
- Guarded: denser ring.
- Break-glass: turbulent pressure field.

## Fire Skin

Fire is not just orange. It is urgency, transformation, and active execution.

Expected effects:

- Ember particles.
- Heat distortion around active workflows.
- Ignition trails for launched apps.
- Smoke or ash for blocked actions.
- Bright controlled glow for approved execution.

Risk language:

- Guarded execution glows hot but contained.
- Break-glass actions require a deliberate ignition gesture.

## Aura Skin

Aura is agent presence and attention.

Expected effects:

- Orbit rings around active agents.
- Soft field lines connecting Brittney, target object, approval, and receipt.
- Color is secondary to motion, grouping, and labels.
- Voice/listening state appears as an expanding attention field.

## Developer Skin

Developer skin is the inspection mode, not the main product feel.

Expected effects:

- Route overlays.
- Control ids and confidence labels.
- Receipt edges.
- PID and lane metadata.
- Adapter path diagnostics.

This is useful for agents and builders, but the default HoloShell experience
should stay non-developer.

## Performance Budget

Each skin needs budget tiers:

| Tier | Target |
| --- | --- |
| `low` | Static or reduced particles, safe for old hardware. |
| `standard` | Animated 2D canvas and DOM shell objects. |
| `gpu` | WebGPU or R3F particles, instancing, fluid-like fields. |
| `xr` | Stereo-safe, lower latency, stable text and controls. |

Reduced motion must be equivalent, not empty. It can use opacity, layout,
labels, and static field changes instead of animation.

## Receipt Rendering

Receipts should record which renderer proved a skin:

```text
renderer: html_canvas | r3f | threejs | webgpu | headless
skinId
viewport
motionMode
objectCount
particleCount
frameBudget
visualWitnessPath
```

The live shell can be richer than headless receipts, but the receipt must say
what was actually proven.

## Next Build Order

1. Promote `ShellSkin` source fields in `holoshell-skin-presets.hsplus`.
2. Add per-skin risk, approval, and receipt visual vocabulary.
3. Add performance budget fields.
4. Add one realistic water pass with actual fluid-like fields.
5. Add fire and aura as distinct simulation systems.
6. Add developer trace overlays for captured UI reconstruction.

