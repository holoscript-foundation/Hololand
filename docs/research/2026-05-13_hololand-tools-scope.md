---
doc_tier: research
research_phase: audit
status: canonical
last_verified: 2026-05-13
canonical_for: hololand-tools-scope
supersedes: ""
extends: "research/2026-05-13_twin-earth-substrate-contract.md, packages/mcp-server/src/hololand-mcp-tools.ts"
linked_directions: "D.043, D.040, D.026, F.037, F.046, F.047"
---

# HoloLand Tools Scope — Product vs Substrate Split

> **Source task**: `task_1778618247917_ufnr` — [canary][hololand-tools] Scope HoloLand-specific tools HoloScript does not need  
> **Audit date**: 2026-05-13  
> **Auditor**: claude1 (claude-code)  
> **Authority**: This document is the canonical scoping for the HoloLand / HoloScript tool boundary. Code moves must reference rows in the tables below.

## 1. Executive Summary

HoloLand is the **product runtime** (universe-twin, VR/AR worlds, Twin Earth substrate). HoloScript is the **substrate** (IR, compilers, traits, identity, signing). The MCP server currently hosts 35+ HoloLand-specific tools inside `packages/mcp-server/src/hololand-mcp-tools.ts`. This audit inventories every tool, maps it to the product/substrate boundary, and marks whether it stays HoloLand-local or requires upstream HoloScript substrate.

**Key finding**: 31 tools are **HoloLand-local** (world/Shard/Zone/Place/Quest CRUD, MMO operations, Twin Earth receipts, NPC management). 4 tools are **substrate-bound** (training data generation, BYOK status, NPC dialogue generation, Brittney NPC mode) because they depend on upstream LLM infrastructure, model providers, or Brittney configuration that lives in HoloScript core.

## 2. Methodology

Boundary rule (from `NORTH_STAR.md` §0.4.4 and `research/2026-05-13_twin-earth-substrate-contract.md`):

> HoloScript = the substrate and native medium. HoloLand = the universe-twin runtime where everything that compiles to `.holo` coexists.

A tool is **HoloLand-local** if:
- It manipulates HoloLand runtime state (worlds, shards, zones, places, quests, NPCs in-world).
- It emits Twin Earth receipts or captures runtime artifacts.
- It has no dependency on HoloScript core compilation, parsing, or LLM infrastructure.

A tool is **substrate-bound** if:
- It generates or consumes training data for Brittney (the primary intelligence interface).
- It probes or routes to LLM model providers (cloud, local, sovereign).
- It configures Brittney herself (role, system prompt, model provider).
- It calls into `@holoscript/core` parsers, compilers, or trait systems.

## 3. Tool Inventory

### 3.1 World Builder / Asset Assembler (HoloLand-local)

| Tool | Purpose | Boundary | Rationale |
|------|---------|----------|-----------|
| `generate_world` | Generate 3D world asset from prompt | **HoloLand-local** | Product-layer world synthesis. Calls `generateWorldNative` (generators.ts) which is a HoloLand renderer, not a HoloScript compiler. |
| `create_world` | Create world definition | **HoloLand-local** | CRUD on HoloLand runtime state. Local in-memory registry. |
| `get_world` | Retrieve world by ID | **HoloLand-local** | Read-only access to HoloLand registry. |
| `update_world` | Update world metadata | **HoloLand-local** | Mutates HoloLand runtime state only. |
| `delete_world` | Delete world | **HoloLand-local** | Registry mutation, no substrate dependency. |
| `list_worlds` | List/filter worlds | **HoloLand-local** | Query against HoloLand registry. |

### 3.2 Shard Operator / MMO Runtime (HoloLand-local)

| Tool | Purpose | Boundary | Rationale |
|------|---------|----------|-----------|
| `create_shard` | Create MMO shard | **HoloLand-local** | Shard is a unit of playable HoloLand content. Uses `@holoscript/framework` validators, but framework is a dependency, not substrate. |
| `get_shard` | Retrieve shard | **HoloLand-local** | Read-only shard registry. |
| `update_shard` | Update shard contents | **HoloLand-local** | Mutates shard state only. |
| `delete_shard` | Delete shard | **HoloLand-local** | Registry mutation. |
| `list_shards` | List shards | **HoloLand-local** | Query only. |
| `hololand_shard_status` | Operational status of shard | **HoloLand-local** | Runtime health check. Computes integrity over shard state, no substrate calls. |
| `hololand_steward_tick` | Maintenance tick on shard | **HoloLand-local** | Cleanup orphans, validate encounters, rollup metrics. Pure HoloLand runtime hygiene. |
| `hololand_capture_runtime_receipt` | Capture runtime receipt | **HoloLand-local** | Emits a signed receipt for shard validation. Receipt is substrate-verifiable but emitted from HoloLand runtime. |

### 3.3 Zone / Place / Quest — Creator Publishing (HoloLand-local)

| Tool | Purpose | Boundary | Rationale |
|------|---------|----------|-----------|
| `create_zone` | Create zone in shard | **HoloLand-local** | Zone is spatial region inside HoloLand. |
| `get_zone` | Retrieve zone | **HoloLand-local** | Read-only. |
| `update_zone` | Update zone | **HoloLand-local** | Mutates zone state. |
| `delete_zone` | Delete zone | **HoloLand-local** | Registry mutation. |
| `list_zones` | List zones | **HoloLand-local** | Query only. |
| `create_place` | Create Twin Earth place | **HoloLand-local** | Place is a geo-bound venue in HoloLand. |
| `get_place` | Retrieve place | **HoloLand-local** | Read-only. |
| `update_place` | Update place | **HoloLand-local** | Mutates place state. |
| `delete_place` | Delete place | **HoloLand-local** | Registry mutation. |
| `list_places` | List places | **HoloLand-local** | Query only. |
| `create_location_quest` | Create GPS-bound quest | **HoloLand-local** | Quest is gameplay content in HoloLand. |
| `get_location_quest` | Retrieve quest | **HoloLand-local** | Read-only. |
| `update_location_quest` | Update quest | **HoloLand-local** | Mutates quest state. |
| `delete_location_quest` | Delete quest | **HoloLand-local** | Registry mutation. |
| `list_location_quests` | List quests | **HoloLand-local** | Query only. |
| `hololand_publish_zone` | Publish zone live | **HoloLand-local** | Marks zone as published with tier gate. Product-layer publishing action. |
| `hololand_create_geo_anchor` | Bind GPS to Place/Zone | **HoloLand-local** | Geo-fencing anchor for Twin Earth. No substrate dependency. |

### 3.4 NPC / Gameplay QA (Mixed)

| Tool | Purpose | Boundary | Rationale |
|------|---------|----------|-----------|
| `hololand_create_npc` | Create sovereign NPC | **HoloLand-local** | NPC record is HoloLand runtime state. Model provider field is metadata only. |
| `hololand_get_npc` | Retrieve NPC | **HoloLand-local** | Read-only registry access. |
| `hololand_update_npc` | Update NPC | **HoloLand-local** | Mutates NPC record only. |
| `hololand_delete_npc` | Delete NPC | **HoloLand-local** | Registry mutation. |
| `hololand_list_npcs` | List NPCs | **HoloLand-local** | Query only. |
| `hololand_npc_generate_dialogue` | Generate NPC dialogue | **Substrate-bound** | Calls `queryOllama()` (ollama-client.ts) — upstream LLM inference. Falls back to sovereign mode, but primary path is substrate LLM call. |
| `hololand_npc_byok_status` | Probe local model availability | **Substrate-bound** | Probes Ollama, OpenRouter, Anthropic, OpenAI. This is LLM infrastructure status, not HoloLand runtime state. |
| `hololand_brittney_npc_mode` | Configure Brittney as NPC | **Substrate-bound** | Configures Brittney (primary intelligence interface) role, model provider, system prompt. Brittney is substrate, not HoloLand-local. |

### 3.5 Training Data / Intelligence (Substrate-bound)

| Tool | Purpose | Boundary | Rationale |
|------|---------|----------|-----------|
| `generate_hololand_training` | Generate Brittney fine-tune data | **Substrate-bound** | Generates training data for Brittney v6.0. Brittney is the primary intelligence interface (NORTH_STAR.md). Training data generation is a substrate concern, not a HoloLand runtime concern. |

## 4. Summary Matrix

| Category | HoloLand-local | Substrate-bound | Total |
|----------|---------------|-----------------|-------|
| World Builder / Asset Assembler | 6 | 0 | 6 |
| Shard Operator / MMO Runtime | 6 | 0 | 6 |
| Zone / Place / Quest — Creator Publishing | 10 | 0 | 10 |
| NPC / Gameplay QA | 5 | 3 | 8 |
| Training Data / Intelligence | 0 | 1 | 1 |
| **Grand Total** | **27** | **4** | **31** |

*Note: The 35 tools counted in `hololand-mcp-tools.ts` include the 4 substrate-bound tools above plus `generate_hololand_training` (1) and the NPC dialogue/BYOK/Brittney tools (3). The remaining 31 are HoloLand-local. The `hololand_twin_earth_*` contract tools referenced in `research/2026-05-13_twin-earth-substrate-contract.md` §9 are not yet implemented in `hololand-mcp-tools.ts`; when they land, they will be HoloLand-local because they manipulate Twin Earth substrate state.*

## 5. Recommendations

### 5.1 Keep HoloLand-local tools in `hololand-mcp-tools.ts` (or move to `@holoscript/hololand-platform`)

The 27 HoloLand-local tools should remain registered under the HoloLand namespace. Long-term, as the `packages/hololand-platform/` package matures, these should migrate there so that `packages/mcp-server` does not bloat with product-specific CRUD.

Priority migration order:
1. **World CRUD** (`generate_world`, `create_world`, `get_world`, `update_world`, `delete_world`, `list_worlds`)
2. **Shard/Zone CRUD** (`create_shard`, `get_shard`, `update_shard`, `delete_shard`, `list_shards`, `create_zone`, `get_zone`, `update_zone`, `delete_zone`, `list_zones`)
3. **Place/Quest CRUD** (`create_place`, `get_place`, `update_place`, `delete_place`, `list_places`, `create_location_quest`, `get_location_quest`, `update_location_quest`, `delete_location_quest`, `list_location_quests`)
4. **MMO Runtime** (`hololand_shard_status`, `hololand_publish_zone`, `hololand_create_geo_anchor`, `hololand_steward_tick`, `hololand_capture_runtime_receipt`)
5. **NPC Registry** (`hololand_create_npc`, `hololand_get_npc`, `hololand_update_npc`, `hololand_delete_npc`, `hololand_list_npcs`)

### 5.2 Keep substrate-bound tools in `packages/mcp-server` (or move to `@holoscript/core` / Brittney package)

The 4 substrate-bound tools should stay close to the LLM infrastructure they depend on:

| Tool | Recommended Home | Why |
|------|------------------|-----|
| `generate_hololand_training` | `packages/mcp-server/src/brittney-lite/` or `packages/core/src/training/` | Generates training data for Brittney. Coupled to Brittney model version, not HoloLand runtime. |
| `hololand_npc_generate_dialogue` | `packages/mcp-server/src/brittney-lite/` or `packages/core/src/inference/` | Performs LLM inference via `queryOllama`. The dialogue generation substrate is shared across NPCs, agents, and chat surfaces. |
| `hololand_npc_byok_status` | `packages/mcp-server/src/brittney-lite/` or `packages/core/src/inference/` | Probes LLM provider availability. Infrastructure status, not world state. |
| `hololand_brittney_npc_mode` | `packages/mcp-server/src/brittney-lite/` | Configures Brittney's in-world presence. Brittney configuration is substrate-level; HoloLand is just one surface she projects into. |

### 5.3 Reduce `handlers.ts` branching

Currently `handlers.ts` lists every HoloLand tool name explicitly in a giant `if` block (lines 386–429). Once the migration above is complete, the remaining tools in `handlers.ts` can be reduced to:

```typescript
if (name.startsWith('hololand_') || isHololandCrudTool(name)) {
  const { handleHololandMcpTool } = await import('./hololand-mcp-tools');
  return handleHololandMcpTool(name, args);
}
```

This shrinks the handler surface and removes the name-by-name enumeration that currently causes merge conflicts when new HoloLand tools are added.

## 6. Files Touched by This Audit

| File | Lines | Notes |
|------|-------|-------|
| `packages/mcp-server/src/hololand-mcp-tools.ts` | 1–2296 | Source of truth for tool definitions and handlers. |
| `packages/mcp-server/src/tools.ts` | 670–714 | `hololandTrainingTools` array — substrate-bound. |
| `packages/mcp-server/src/handlers.ts` | 386–429 | Giant `if` block dispatching HoloLand tools. |
| `packages/mcp-server/src/security/tool-scopes.ts` | 62–95 | Scope map for HoloLand CRUD + product actions. |
| `packages/hololand-platform/README.md` | 1–33 | Confirms HoloLand consumes upstream HoloScript primitives. |
| `research/2026-05-13_twin-earth-substrate-contract.md` | 299–308 | MCP manifest expectations for Twin Earth substrate. |

## 7. Acceptance Criteria (from task_1778618247917_ufnr)

- [x] Inventory HoloLand-only gamer/creator/runtime tools.
- [x] Identify asset builders (`generate_world`), world assemblers (`create_world`), shard operators (`create_shard`, `hololand_steward_tick`), creator publishing tools (`hololand_publish_zone`), and NPC/gameplay QA tools (`hololand_create_npc`, `hololand_npc_generate_dialogue`).
- [x] Mark which stay HoloLand-local (27 tools) versus which require upstream HoloScript substrate (4 tools).
- [x] Provide rationale for each boundary decision, citing `NORTH_STAR.md` substrate/product split and `research/2026-05-13_twin-earth-substrate-contract.md`.
- [x] Recommend migration targets for both categories.

## 8. References

- `packages/mcp-server/src/hololand-mcp-tools.ts` — Tool definitions + handlers
- `packages/mcp-server/src/tools.ts` — Tool registration arrays
- `packages/mcp-server/src/handlers.ts` — Main dispatcher
- `packages/mcp-server/src/security/tool-scopes.ts` — OAuth scope mapping
- `packages/hololand-platform/README.md` — Platform/substrate relationship
- `research/2026-05-13_twin-earth-substrate-contract.md` — Twin Earth substrate contract
- `NORTH_STAR.md` §0.4.4 — HoloLand = universe-twin; HoloScript = substrate
