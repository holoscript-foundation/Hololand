# HoloScript Surface Bridge For HoloShell

**Status:** HoloShell bridge design
**Date:** 2026-05-12
**Source:** `apps/holoshell/source/holoshell-holoscript-bridge.hsplus`
**Discovery adapter:** `scripts/holoshell-holoscript-surface-map.mjs`

## Decision

HoloShell should consume HoloScript's existing API, REST, RPC, MCP, and CLI
surfaces before inventing new local tools.

The bridge is not a fork of HoloScript. It is a HoloLand product adapter that
turns HoloScript capabilities into HoloShell rooms, machines, approvals, and
receipts for non-developers.

## Why

HoloScript already solves many HoloShell problems:

- Source validation.
- Parsing and AST inspection.
- Compilation and runtime targets.
- Trait and template discovery.
- Codebase absorb/query/impact analysis.
- MCP tool discovery and invocation.
- HoloMesh coordination.
- Protocol and payment primitives.
- Headless rendering, screenshots, PDFs, prerendering, and deployment.

The gap is consumption. A non-developer should not see raw endpoints, command
names, or tool schemas first. They should see what HoloShell can safely do.

## Surface Families

| Surface | Best use in HoloShell | Default trust | Default permission |
| --- | --- | --- | --- |
| REST/API | Health, discovery, compile dispatch, public status, service probes. | `verified` when reachable | `public_read` or `guarded_execute` |
| MCP/RPC | Typed tool manifests and authenticated tool calls. | `verified` when tools/list succeeds | `auth_required` |
| CLI | Local, offline, repo-scoped, hardware-proven operations. | `verified` when command discovery succeeds | `guarded_execute` |
| Studio | Creator direction, not HoloShell operation. | external product surface | route to Studio |
| HoloMesh | Agent/team/knowledge/task coordination. | `verified` when auth/board works | `team_auth_required` |

## HoloShell Projection

Raw HoloScript tools become product objects:

| HoloShell room | Consumes | User-facing meaning |
| --- | --- | --- |
| HoloScript Source Room | parse, validate, ast, traits, suggest, generate, templates, public tools | "Can this source become reality?" |
| HoloScript Runtime Machine | compile, build, run, headless, screenshot, pdf, package, deploy | "Can we execute or ship it?" |
| Codebase Intelligence Room | absorb, graph-status, query, impact, codebase MCP tools | "What does this codebase mean?" |
| HoloMesh Coordination Room | HoloMesh REST and MCP tools | "Who is acting and what changed?" |
| HoloScript Protocol Machine | protocol/payment/x402 tools | "What value or entitlement moved?" |

## Adapter Rules

1. Prefer REST/API for passive status and public discovery.
2. Prefer MCP/RPC for typed tool manifests and authenticated tool calls.
3. Prefer CLI for local/offline or hardware-proven source operations.
4. Never expose a raw tool list as the primary non-developer UI.
5. Every mutating action needs a permission envelope and receipt.
6. Payment, credential, deploy, publish, delete, install/uninstall, and system
   mutation actions default to break-glass.
7. HoloShell may cache surface maps locally, but live discovery remains the
   source of truth for tool counts and command availability.

## First Adapter

Run:

```powershell
node scripts\holoshell-holoscript-surface-map.mjs --self-test
```

This writes:

```text
.tmp/holoshell/holoscript-surface-map.json
```

The output is local runtime data and should not be committed unless explicitly
redacted and converted into a sample.

## HoloScript Upstream Candidates

If this bridge stabilizes, upstream these as reusable HoloScript substrate:

- `CapabilityProvider` schema.
- `ToolSurface` schema for REST/RPC/MCP/CLI sources.
- Permission envelope traits for tool execution.
- Receipt linker for tool calls across REST, MCP, and CLI.
- HoloScript-native "surface map" compiler target.

HoloLand keeps the HoloShell UX: rooms, machines, calm pulse, trust timeline,
and non-developer outcome flows.
