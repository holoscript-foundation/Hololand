# Agent HoloScript Tooling Guide

**Audience:** Claude, Codex, Gemini, Cursor, Copilot, and other agents working in HoloLand
**Last reviewed:** 2026-05-07
**Status:** Authoritative agent workflow for the HoloLand platform/product repo

HoloLand is the builder-proof surface for HoloScript. HoloScript is the
developer substrate. Agents should use HoloScript tools to understand,
validate, generate, execute, render, and receipt HoloScript-authored artifacts
inside HoloLand. The active repo goal is proof that agents can build with the
language, not restoration of every historical Hololand package.

See [`docs/specs/HOLOLAND_BUILDER_PROOF_REBOOT.md`](specs/HOLOLAND_BUILDER_PROOF_REBOOT.md).

## First Principles

1. HoloLand is the builder-proof experience that fully utilizes HoloScript.
2. HoloScript owns language, traits, compilers, validation, agent tools, and semantic world definitions.
3. TypeScript in HoloLand is allowed as bootstrap, bridge, runtime infrastructure, hardware integration, and tests.
4. Gameplay, world rules, simulation, IoT twin behavior, creator templates, quests, NPC behavior, and live-world semantics must have `.holo`, `.hs`, or `.hsplus` source.
5. HoloLand owns proof loops that HoloScript does not need as developer substrate: agent builder shells, live render surfaces, interaction receipts, and hardware validation harnesses.
6. HoloLand owns Twin Earth robot/AI operational substrate: actor identity, geospatial world state, sensor feeds, actuator permissions, task plans, safety envelopes, and real-world action receipts.
7. If HoloLand and HoloScript disagree about reusable language/runtime semantics, HoloScript wins. If the question is HoloLand's look, feel, content, player fantasy, or product direction, the founder team decides.
8. Package install failures in stale legacy packages are not automatically HoloLand work. Fix them only when they block the active builder proof loop or a still-running deployment.

## Repository Map

| Repository | Local path | Agent posture |
|---|---|---|
| HoloLand | `C:/Users/josep/Documents/GitHub/Hololand` | Builder-proof experience, docs, live render/runtime references, HoloScript consumption surface. |
| HoloScript | `C:/Users/josep/Documents/GitHub/HoloScript` | Source of truth for language, traits, parser, compilers, MCP tools, Absorb, HoloMesh, and runtime primitives. |
| ai-ecosystem | `C:/Users/josep/.ai-ecosystem` | Team protocol, knowledge, board, cross-repo decisions. Do not write HoloLand docs there. |

## Required Task Classification

Before editing, classify the request:

| Request type | Default action |
|---|---|
| Documentation, migration guide, agent guide | Edit HoloLand docs directly. |
| Critical bug in existing HoloLand deployment | Fix narrowly, validate locally, preserve deployments. |
| Legacy package install/dependency failure | Fix only if it blocks the builder proof loop or an active deployment; otherwise record as migration debt. |
| New world/gameplay/VR feature | Implement in HoloLand using `.holo`, `.hs`, or `.hsplus`; upstream only missing reusable HoloScript primitives, validators, receipts, or runtime capabilities. |
| HoloLand-specific asset/world/tool | Keep in HoloLand when it serves gamers, creators, shards, NPCs, encounters, visual direction, or live runtime operations rather than general HoloScript developers. |
| Twin Earth robot/AI feature | Keep HoloLand product semantics in HoloLand: robot/AI actor registration, sensor/actuator binding, task planning, safety envelopes, geospatial operations, and action receipts. Upstream only reusable primitives and validators. |
| External or forked HoloScript artifact | Treat as untrusted input until conformance, provenance, sandbox, permissions, and receipt gates pass. Do not give world-write, robot/AI, payment, or player-impact authority based on syntax alone. |
| TypeScript runtime bridge | Keep TS minimal and justify why it is bridge-only. |
| Brittney agent orchestration | May live here when it is part of HoloLand's product experience; document the HoloScript boundary. |
| Architecture decision | Read `NORTH_STAR.md`, this guide, and `docs/HOLOSCRIPT_SOURCE_CONTRACT.md` before changing code. |

## HoloScript Source Contract

Read [docs/HOLOSCRIPT_SOURCE_CONTRACT.md](HOLOSCRIPT_SOURCE_CONTRACT.md) before changing product behavior.

Covered domains:

- `packages/platform/**`
- `packages/ar/**`
- `packages/adapters/**`
- `examples/**` when adding real feature behavior

Rule:

- Feature-domain TypeScript changes require matching `.holo`, `.hs`, or `.hsplus` changes.
- TS-only feature-domain changes need the `ts-bridge-only` label plus rationale.
- Docs, tests, mocks, CI, runtime internals, and host API bridges can be TypeScript-only when clearly scoped.

Local check pattern:

```powershell
$env:BASE_REF = "main"
$env:HEAD_REF = "HEAD"
pnpm run check:holoscript-source-contract
```

The CI workflow also enforces this with `.github/workflows/holoscript-source-contract.yml`.

## HoloScript Tooling Surfaces

### Hosted MCP

Health check:

```powershell
Invoke-RestMethod https://mcp.holoscript.net/health
```

Verified 2026-05-07:

- service: `holoscript-mcp`
- version: `7.0.0`
- tools: `239`
- public health endpoint works
- raw `/mcp` calls can require auth; use the configured MCP client/connector rather than assuming unauthenticated manual POST access

### HoloScript MCP Tool Categories

Use the MCP tools whenever available through your agent surface:

| Goal | Preferred tools |
|---|---|
| Discover which tool to use | `suggest_tools_for_goal`, `get_tool_manifest` |
| Generate HoloScript | `generate_scene`, `generate_object`, `hs_ai_scaffold` |
| Pick traits | `suggest_traits`, `list_traits`, `explain_trait` |
| Validate code | `validate_holoscript`, `hs_diagnostics`, `hs_ai_fix_code` |
| Understand `.holo` files as graphs | `holo_parse_to_graph`, `holo_visualize_flow`, `holo_get_node_connections` |
| Compile targets | `compile_holoscript`, `compile_to_r3f`, `compile_to_webgpu`, `compile_to_unity`, `compile_to_unreal`, `compile_to_urdf`, `compile_to_sdf` |
| Inspect codebase structure | `holo_graph_status`, `holo_absorb_repo`, `holo_query_codebase`, `holo_impact_analysis`, `holo_semantic_search`, `holo_ask_codebase` |

### HoloScript CLI

Run from the HoloScript repo:

```powershell
Set-Location C:/Users/josep/Documents/GitHub/HoloScript
pnpm exec holoscript --help
pnpm exec holoscript status
```

Use the CLI for local gateway/status checks. Use MCP tools for code generation, validation, graph queries, and compilation when your agent environment exposes them.

## Agent Investigation Workflow

Use this sequence before changing HoloLand code:

1. Read the relevant HoloLand doc or source file directly.
2. Search local code with `rg`:

```powershell
rg -n "World|HoloScript|Runtime|Brittney|compile|validate" .
rg --files | rg "\.(holo|hs|hsplus|ts|tsx)$"
```

3. Check the source contract and migration docs:

```powershell
Get-Content docs/HOLOSCRIPT_SOURCE_CONTRACT.md
Get-Content docs/specs/HOLOSCRIPT_FIRST_MIGRATION.md
```

4. Query HoloScript tooling when available:

- `holo_graph_status` before broad codebase questions.
- `holo_absorb_repo` if the graph is stale.
- `holo_query_codebase` or `holo_ask_codebase` for architecture questions.
- `holo_impact_analysis` before shared runtime edits.

5. If changing `.holo`, `.hs`, or `.hsplus`, validate with HoloScript tools before claiming it works.
6. If changing TypeScript in feature domains, include HoloScript source or document the TS bridge rationale.

## Writing `.holo` and `.hsplus`

Use `.holo` when the artifact is a visual graph: objects, zones, flows, events, relationships, simple interactions.

Use `.hsplus` when the artifact needs full language features: systems, backends, complex state, multiplayer logic, advanced agent behavior, async work.

Always prefer:

- Semantic objects over hardcoded renderer tricks.
- Traits from HoloScript over invented properties.
- Validation receipts over prose claims.
- Generated examples that can be parsed and compiled.

Minimum generation workflow:

1. Ask `suggest_traits` for the object/scene.
2. Generate with `generate_scene` or `generate_object`.
3. Validate with `validate_holoscript` or `hs_diagnostics`.
4. If useful, inspect graph shape with `holo_parse_to_graph`.
5. Compile to the target path if the task requires runtime proof.

## HoloLand-Specific High-Signal Paths

| Path | Why agents should inspect it |
|---|---|
| `NORTH_STAR.md` | Project status and HoloScript-first platform rule. |
| `CLAUDE.md` | Current detailed HoloScript file-type primer. |
| `docs/HOLOLAND_PURPOSE.md` | Product authority, gamer/developer split, and native HoloScript proof policy. |
| `docs/HOLOLAND_HOUSEKEEPING.md` | Cleanup lanes, visible experiment intake, ignored debris, and package-manager blockers. |
| `docs/BRITTNEY_OWNERSHIP_MODEL.md` | Brittney lineage, sovereignty, local/BYOK/managed deployment boundary, and NPC/AGI posture. |
| `docs/HOLOSCRIPT_SOURCE_CONTRACT.md` | Enforcement boundary for HoloScript-first work. |
| `docs/specs/HOLOSCRIPT_FIRST_MIGRATION.md` | Existing migration direction for HoloLand Central. |
| `docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md` | Current product north star: programmable living frontier MMO. |
| `docs/specs/HOLOTUNNEL_NONDEVELOPER_ACCESS.md` | Product boundary for easy HoloTunnel sharing/access in HoloLand. |
| `docs/specs/HOLOLAND_SOVEREIGN_TOOLS.md` | Boundary for HoloLand MCP tools, MCP Orchestrator support, and cross-MCP receipts. |
| `examples/hololand-central/**` | Reference central hub and existing runtime surface. |
| `examples/hololand-legends/**` | Game loop reference and HoloScript/TypeScript hybrid sample. |
| `packages/platform/**` | Legacy platform runtime and bridge code. |
| `packages/brittney/**` | Brittney agent/toolkit code that may still be developed until migration. |

## Validation Matrix

| Change type | Validation |
|---|---|
| Agent docs only | `git diff --check -- <changed-docs>` |
| HoloScript examples in docs | Validate snippets with HoloScript MCP if possible. |
| `.holo` / `.hs` / `.hsplus` | `validate_holoscript` or `hs_diagnostics`; compile if target behavior matters. |
| Feature-domain TypeScript | HoloScript source contract check plus focused package tests. |
| Runtime/bridge TypeScript | Focused package tests, then build if blast radius is broad. |
| XR/hardware UX | Local browser/headset validation when feasible; record device/runtime notes. |

## Anti-Patterns

Do not:

- Add new gameplay, world, NPC, quest, item, economy, or simulation behavior only in TypeScript.
- Treat `.holo` as a decorative export after the real logic is already in TS.
- Treat HoloLand as a compiler-parity demo for competitor runtimes. HoloLand proves native HoloScript worlds work for gamers.
- Push HoloLand-only assets, art direction, shard tools, or gamer UX into HoloScript unless they reveal a reusable substrate gap.
- Push Twin Earth robot/AI product operations into HoloScript unless the need is a reusable language, trait, validator, runtime, or receipt primitive.
- Treat a HoloScript-looking fork, package, runtime adapter, or MCP tool as trusted because it parses.
- Claim MCP or Absorb results without showing the tool/check used.
- Invent HoloScript syntax without validation.
- Move canonical language or trait definitions into HoloLand.
- Delete existing files in the already-dirty worktree unless explicitly asked.
- Use `git add -A`.

## Agent Handoff Checklist

Every agent handoff should say:

- Which HoloScript/HoloLand docs were read.
- Whether the change is docs-only, HoloScript source, TS bridge, or critical bug fix.
- Which HoloScript tools/checks were used or why they were unavailable.
- Which files changed.
- Which validation commands passed.
- Whether unrelated dirty worktree changes were left untouched.

## Short Version For Future Agents

If you remember one thing:

```text
HoloLand is the platform experience. HoloScript is the source of reality.
Use HoloScript tools before changing HoloLand behavior.
```
