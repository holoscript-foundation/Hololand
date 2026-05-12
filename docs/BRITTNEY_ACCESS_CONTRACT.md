# Brittney Access Contract

**Status:** Required contract
**Date:** 2026-05-12
**Related:** [BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md), [BRITTNEY_OWNERSHIP_MODEL.md](./BRITTNEY_OWNERSHIP_MODEL.md), [BRITTNEY_MODELS_DEPLOYMENT.md](./BRITTNEY_MODELS_DEPLOYMENT.md)

## Decision

Brittney is an intelligence lineage, not a monopoly endpoint. HoloLand may
offer managed Brittney services, but managed cloud is one route among peers.
New Brittney features must declare which access modes they support, which
access modes they intentionally do not support yet, and what receipt behavior
proves the route and world effect.

This contract applies to creator copilots, world stewards, NPCs, item arcs,
encounter intelligence, HoloScript generation, and any runtime tool that markets
itself as Brittney or a Brittney descendant.

## Required Access Matrix

| Mode | Runtime owner | Required use | Receipt behavior |
|---|---|---|---|
| Local GGUF | `@hololand/brittney-toolkit` | Offline app use, private worlds, sovereign NPCs, and creator tools that cannot depend on network access. | Record actor/session, local model registry entry, model file hash when available, prompt/source hash, and whether no network route was used. |
| Local/LAN Ollama | `@hololand/inference` | Self-hosted worlds, LAN deployments, modding labs, and local steward loops that need stronger models without platform lock-in. | Record actor/session, endpoint class (`local` or `lan`), model tag, world or project id, prompt/source hash, and network boundary. |
| BYOK cloud | `@hololand/inference` | Users or teams that bring provider keys while keeping account ownership and billing outside HoloLand. | Record actor/session, provider alias, key owner or tenant id without secrets, model id, request id when available, prompt/source hash, and cost estimate. |
| Managed HoloLand service | HoloLand-hosted runtime | Convenience, premium uptime, fleet operations, and high-scale live events where HoloLand operates the route. | Record actor/session, service deployment id, tenant/world id, model route, cost ceiling, prompt/source hash, and completion status. |
| HoloScript CLI/MCP | HoloScript CLI, `@holoscript/aibrittney`, and HoloScript MCP tools | Source authoring, validation, graph understanding, trait consumption, and build/review loops. | Record CLI command or MCP tool, HoloScript source hash, trait contracts consumed, validation or compile result, and downstream HoloLand target if any. |
| In-world NPC/steward embodiment | HoloLand shard runtime consuming HoloScript traits | Live guides, faction actors, world stewards, item arcs, encounter intelligence, safety reviewers, and market/event operators. | Record world id, shard id, entity id, trait manifest hash, actor/session, action, outcome, rollback plan, and player-visible impact. |

All six modes are first-class. A feature may launch with a subset only when the
unsupported modes are explicitly listed with reasons and unblock conditions.
Managed HoloLand service must never be the only documented access path for a
new Brittney feature unless the feature is purely an internal HoloLand
operations tool with no user, creator, NPC, or world-authoring surface.

## Feature Declaration Template

Every new Brittney feature doc, package README, or tool manifest must include a
declaration with these fields:

```yaml
brittney_feature:
  name: "<feature name>"
  supported_modes:
    - local_gguf
    - local_lan_ollama
    - byok_cloud
    - managed_hololand_service
    - holoscript_cli_mcp
    - in_world_npc_steward
  unsupported_modes:
    - mode: "<mode slug>"
      reason: "<why it is not required for this slice>"
      unblock_condition: "<what would make it required>"
  receipt_behavior:
    actor: "<user, creator, agent, or system actor>"
    source: "<HoloScript source, prompt, model registry entry, or trait manifest>"
    route: "<local, LAN, BYOK, managed, CLI/MCP, or in-world embodiment>"
    world_effect: "<none, proposal, preview, mutation, rollback>"
    storage: "<where the receipt is written>"
  fallback_order:
    - "<preferred mode>"
    - "<next mode>"
  cost_ceiling: "<budget or explicit no-cost path>"
  privacy_boundary: "<local-only, LAN, tenant, provider, or public>"
  source_contract: "<HoloScript trait/source contract consumed>"
```

The declaration may be smaller for a non-mutating UI surface, but it must still
state supported modes, unsupported modes, receipt behavior, and privacy
boundary. Live-world mutation must also include cost ceiling, rollback plan,
and source contract.

## Review Rule

Reject a new Brittney feature if it only describes a remote chat endpoint,
centralized API, or product-specific assistant without the access matrix above.
The acceptable pattern is:

1. HoloScript owns source and trait semantics.
2. HoloLand owns world/runtime embodiment.
3. The feature declares supported access modes and receipt behavior.
4. Managed service remains optional unless the feature is internal operations.

## Validation

Run:

```bash
node scripts/check-brittney-access-contract.mjs
```

The check guards the mode names and declaration fields that make this contract
load-bearing.
