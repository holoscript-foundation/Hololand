# HoloShell Shell Object Schema

**Status:** Research schema
**Date:** 2026-05-13
**Scope:** Objects rendered and operated by HoloShell
**Pairs with:** `HOLOSHELL_OS_REPLACEMENT_DOCTRINE.md`

## Purpose

HoloShell needs one grammar for the whole computer. Programs, files, browsers,
agents, approvals, receipts, workflows, windows, and controls cannot remain
separate UI concepts. They become shell objects.

This document defines the product schema HoloLand should use until the reusable
parts graduate upstream into HoloScript.

## Core Object

```text
ShellObject
  id
  displayName
  objectKind
  sourceKind
  capabilityFamily
  trustState
  permissionEnvelope
  adapterPath
  visualForm
  status
  actorLaneId
  receiptTypes
  relationships
  privacyClass
  replacementPath
```

## Field Meanings

| Field | Meaning |
| --- | --- |
| `id` | Stable local object id. Does not need to expose private names. |
| `displayName` | User-facing label. Can be redacted or generalized. |
| `objectKind` | Product role: program, file, browser, agent, workflow, receipt. |
| `sourceKind` | Where it comes from: app, cli, mcp, browser, filesystem, process. |
| `capabilityFamily` | What it can help do: documents, web, local project, media, system. |
| `trustState` | verified, partial, stale, disputed, unsafe, unknown. |
| `permissionEnvelope` | read_only, guarded_execute, break_glass, classified_per_app. |
| `adapterPath` | Preferred route: API, MCP, CLI, browser automation, UI Automation, OCR. |
| `visualForm` | glyph, bubble, room, machine, approval, timeline_node, captured_surface. |
| `status` | idle, available, staged, running, pending_approval, blocked, complete. |
| `actorLaneId` | Active agent lane when an agent is responsible for the object. |
| `receiptTypes` | Receipts expected when the object is inspected or operated. |
| `relationships` | Links to source process, file, window, workflow, approval, receipt. |
| `privacyClass` | public, local_private, credential_adjacent, secret, unknown. |
| `replacementPath` | preserve_engine, wrap_then_reimagine, replace_with_holoscript, classify_first. |

## Object Kinds

| Kind | Meaning | Examples |
| --- | --- | --- |
| `program` | Installed or running app presented as a capability engine. | Excel, Chrome, terminal. |
| `file` | File or folder represented as work material. | Project folder, spreadsheet, document. |
| `browser_surface` | Tab, web app, or URL boundary. | YouTube, docs, dashboard. |
| `terminal_surface` | Shell, command, REPL, build, or room marathon lane. | PowerShell, Claude CLI, pnpm build. |
| `agent` | Active or available AI actor. | Brittney, Codex, Claude, Gemini. |
| `room` | Capability grouping or work context. | HoloScript Room, Project Room. |
| `workflow` | Ordered multi-step action plan. | Room Marathon with Lofi, Asset Folder to Playable Shard. |
| `approval` | User decision object for guarded or break-glass work. | Hardware approval, workflow approval. |
| `receipt` | Evidence object attached to action or observation. | Action receipt, DOM witness, screenshot. |
| `readiness_room` | Evidence room proving whether the local machine can build a HoloLand world. | World Build Readiness. |
| `captured_window` | Legacy app window reconstructed into shell geometry. | Active app surface. |
| `captured_control` | Legacy UI control reconstructed as an interactable object. | Button, input, menu item. |
| `process` | Running PID or service under custody. | Dev server, build, daemon. |

## Source Kinds

```text
holoscript
hololand
holomesh
mcp
cli
browser
app
filesystem
process
service
hardware
window
control
workflow
approval
receipt
```

## Visual Forms

| Form | Use |
| --- | --- |
| `glyph` | Small status or capability marker. |
| `bubble` | First-screen selectable shell object. |
| `room` | Large inspectable capability family. |
| `machine` | Legacy engine or service with multiple operations. |
| `captured_surface` | Re-rendered legacy UI region. |
| `interaction_field` | Geometric control region mapped back to legacy action. |
| `timeline_node` | Completed or running action with evidence. |
| `approval_object` | Consent gate for guarded work. |
| `avatar_anchor` | Embodied actor presence. |

## Permission Envelopes

| Envelope | Default behavior |
| --- | --- |
| `read_only` | Can inspect quietly, must write receipt. |
| `guarded_execute` | Can stage, needs explicit approval to mutate. |
| `break_glass` | Requires high-friction approval and rollback or witness note. |
| `classified_per_app` | Cannot act until adapter and risk class are known. |
| `manual_witness` | User or agent records outcome when automation is unsafe. |

## Relationship Model

Objects should link instead of duplicating truth.

```text
program -> process
program -> captured_window
captured_window -> captured_control
workflow -> approval
workflow -> receipt
agent -> lane
lane -> run
run -> receipt
browser_surface -> screenshot_witness
file -> file_snapshot
approval -> exact_command
```

## Minimal JSON Shape

```json
{
  "id": "program.chrome",
  "displayName": "Browser",
  "objectKind": "program",
  "sourceKind": "app",
  "capabilityFamily": "web",
  "trustState": "partial",
  "permissionEnvelope": "guarded_execute",
  "adapterPath": "browser_automation",
  "visualForm": "machine",
  "status": "available",
  "actorLaneId": "",
  "receiptTypes": ["program_registry_receipt", "browser_action_receipt"],
  "relationships": {
    "programRegistryId": "redacted",
    "runningWindowIds": []
  },
  "privacyClass": "local_private",
  "replacementPath": "wrap_then_reimagine"
}
```

## Runtime Graph

The current bridge materializes this schema into:

```text
scripts/holoshell-shell-objects.mjs
.tmp/holoshell/shell-objects.json
.tmp/holoshell/shell-objects.js
window.HOLOSHELL_SHELL_OBJECTS
```

Inputs:

- `.tmp/holoshell/program-registry.json`
- `.tmp/holoshell/readiness-evidence.json`
- `.tmp/holoshell/os-ui-capture.json`
- `.tmp/holoshell/agent-lanes.json`
- `.tmp/holoshell/shard-workflow-latest.json`
- Brittney avatar, workflow, approval, intent-gate, and action receipts

The graph intentionally does not expose raw executable paths to the browser
prototype. Program objects keep the program registry id and a staged launch
intent; the guarded daemon resolves the real target locally and mints the
approval bundle.

The live feed now embeds the graph at `feed.feeds.shellObjects` and summarizes
app bubbles, browser surfaces, terminal surfaces, captured windows, approvals,
receipts, and guarded powers. This makes the shell object graph the runtime
join between the HoloScript source, local app registry, legacy UI capture, and
Brittney's action surface.

Readiness evidence packs become a `readiness_room` plus receipt tokens. The
current HoloLand bridge reads the HoloScript flagship run from
`../HoloScript/.bench-logs/holoshell-human-os-frontier/<date>/` through
`scripts/holoshell-readiness-evidence.mjs`, then emits build, validation,
WebGPU, WASM, headset, replay, graph-status, and HoloMesh task tokens. Missing
headset/replay evidence uses `manual_witness`; command and validation passes
remain `read_only`.

Local asset shard workflows become a `workflow.asset-shard` bubble plus a
receipt token. The public graph only exposes folder basename, relative asset
paths, preview source, counts, and hashes. Absolute paths stay in the private
`.tmp/holoshell/shard-receipts/` receipt so the browser projection can show the
plan without leaking the user's filesystem. Importing or publishing the shard
is always `guarded_execute`; scanning and preview generation are read-only plus
temporary-file writes.

## Source Boundary

HoloLand owns which objects appear and how they feel. HoloScript should
eventually own the generic schema, validator, permission traits, adapter
contract, and receipt relations.

Until that upstream move happens, HoloShell docs and `.hsplus` source should use
this vocabulary consistently.
