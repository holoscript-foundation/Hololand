# HoloShell World Build Cockpit

**Source room:** `apps/holoshell/source/holoshell-world-build-cockpit.holo`  
**Policy:** `apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus`  
**Pipeline:** `apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs`

The world-build cockpit wraps the flagship HoloShell job:

```text
Make this computer ready to build a HoloLand world, use local files,
verify it works, and show what changed.
```

The cockpit is a non-developer control room. It composes local-file custody,
hardware proof, HoloScript source validation, build custody, visual witness,
agent lanes, task filing, replay, and rollback into one ready/warn/blocked
surface before any HoloLand world import or publish action is allowed.

## Gates

| Gate | Receipt | Owner surface | Default permission |
| --- | --- | --- | --- |
| Local Files | `LocalFileManifestReceipt` | HoloShell custodian | Silent read |
| Hardware | `CodexHardwareAuditReceipt` | Codex hardware | Silent read or guarded witness |
| Source | `SourceValidationReceipt` | HoloScript source | Guarded validation |
| Build Custody | `BuildCustodyReceipt` | HoloShell hardware reality | Silent read |
| World Preview | `VisualWitnessReceipt` | HoloLand product | Guarded preview |
| Agent Orchestra | `AgentLaneReceipt` | HoloMesh and local lanes | Visible owner lanes |
| Replay | `WorldBuildReadinessCockpitReceipt` | HoloScript runtime | Append-only receipt |

## Product Boundary

HoloLand owns the room, Brittney/operator presentation, creator preview dock,
player-facing language, and promotion flow. HoloScript owns reusable receipt
schemas, validators, CLI/MCP primitives, stdlib policy hooks, source parsing,
and cross-surface replay contracts.

The cockpit keeps HoloLand preview-only until all blocking gates pass and a
human promotion is recorded. Startup registration, app launch, package install,
world import, publish, file deletion, credential access, and process termination
remain guarded or break-glass actions.

## Source Map

This cockpit consumes existing HoloShell source contracts:

| Capability | Source |
| --- | --- |
| Shell world | `apps/holoshell/source/holoshell-shell-world.holo` |
| Build custody | `apps/holoshell/source/holoshell-build-custody.hsplus` |
| Readiness evidence | `apps/holoshell/source/holoshell-readiness-evidence.hsplus` |
| Hardware reality | `apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus` |
| Visual witness | `apps/holoshell/source/holoshell-visual-witness.hsplus` |
| Source validation | `apps/holoshell/source/holoshell-source-validation.hsplus` |
| Agent lanes | `apps/holoshell/source/holoshell-agent-presence-lanes.hsplus` |
| Hardware control | `apps/holoshell/source/holoshell-hardware-control.hsplus` |
| Package custody | `apps/holoshell/source/holoshell-package-custody.hsplus` |
| Process health | `apps/holoshell/source/holoshell-process-health-room.hsplus` |

## Validation

Run from the HoloLand repo:

```powershell
pnpm run holoshell:source-validation
```

For targeted checks from the HoloScript repo:

```powershell
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-world-build-cockpit.holo
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-world-build-cockpit-policy.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-world-build-cockpit-pipeline.hs
```
