# HoloLand Sovereign Tools

**Status:** Architecture decision
**Date:** 2026-05-12
**Related:** [HoloLand Frontier North Star](HOLOLAND_FRONTIER_NORTH_STAR.md), [Agent HoloScript Tooling Guide](../AGENT_HOLOSCRIPT_TOOLING.md)

## Decision

HoloLand should have sovereign MCP tools, and MCP Orchestrator should add federation features that support HoloLand without absorbing HoloLand's product semantics.

The split after removing HoloScript from the HoloLand repo was correct only if the boundary remains explicit:

- HoloScript MCP owns source truth: parse, validate, compile, traits, diagnostics, graph understanding, Absorb, and semantic primitive definitions.
- MCP Orchestrator and HoloMesh own coordination truth: agent identity, task routing, tool discovery, receipts, knowledge, board state, and cross-repo collaboration.
- HoloLand MCP owns world truth: live shard operations, Twin Earth anchors, player and creator workflows, agent stewards, runtime receipts, and hardware validation for the product experience.
- HoloLand Twin Earth substrate owns robot/AI operational truth: robot and AI actor registration, geospatial operational state, sensor and actuator bindings, task plans, safety envelopes, and real-world action receipts.
- HoloLand product tooling owns game-specific tools HoloScript does not need as developer substrate: asset builders, world assemblers, shard operators, creator publishing flows, NPC/gameplay tools, product QA, and player-facing live operations.
- Brittney owns lineage truth: the mother intelligence pattern can appear as local CLI, Studio creator, HoloLand guide, world steward, NPC, item arc, or autonomous teammate without becoming one monopoly cloud service.

This is federation, not duplication. HoloLand tools may call HoloScript tools, but they should not reimplement HoloScript's language, compiler, trait, or graph responsibilities.

HoloLand tools are allowed to be product-specific. They do not need to graduate
upstream unless they reveal reusable HoloScript substrate.

## Brittney Is Not A Monopoly Endpoint

HoloLand can offer managed Brittney services, premium tool access, and hosted
models. Those are convenience paths, not the definition of Brittney.

Sovereign HoloLand tools must support a matrix of deployment modes:

- Local GGUF / bundled model.
- Local or LAN Ollama.
- BYOK cloud providers through the inference layer.
- Managed HoloLand-hosted services.
- HoloScript CLI / MCP tool-calling.
- In-world NPC and steward embodiments.

Any tool that mutates live world state must be able to explain which Brittney
mode acted, which actor/session authorized it, what HoloScript source or trait
contract it consumed, and what receipt proves the outcome.

## Twin Earth Monopoly Substrate

HoloLand's Twin Earth goal is stronger than "digital twin feature." HoloLand
should become the monopoly substrate for robots and AI: the default
interoperability layer where AI agents, robot fleets, sensors, actuators,
places, tasks, permissions, and receipts meet.

That substrate must remain sovereign. A robot or AI actor should not need one
managed Brittney cloud endpoint to participate. It should need a valid HoloLand
identity, HoloScript-visible capability manifest, world permission, safety
envelope, and receipted action path.

## Fork And Abuse Threat Model

Anyone can clone or fork an open language. HoloLand must assume hostile
HoloScript-looking source, compiler forks, package forks, MCP tools, and
runtime adapters will exist.

The defense is not "nobody can fork it." The defense is that a fork does not
inherit trust:

- It does not inherit official HoloScript conformance.
- It does not inherit HoloLand world-write authority.
- It does not inherit Brittney lineage or HoloMesh reputation.
- It does not inherit robot, AI, sensor, actuator, payment, or player
  permissions.
- It does not bypass validation, sandboxing, receipts, signature checks,
  capability manifests, or live-world admission gates.

HoloLand may accept third-party or forked HoloScript artifacts only as untrusted
inputs until they pass the official conformance, provenance, permission, and
safety gates for the action they request. Forks can interoperate through
published contracts. They cannot automatically become authoritative substrate.

## Why Sovereign Tools Exist

HoloLand's north star is a premium-scale programmable frontier MMO with Twin Earth as a playable layer across browser, desktop, mobile, VR, and AR. Generic HoloScript tools can prove source artifacts, but they do not know whether a world shard is live, whether a Twin Earth anchor respects privacy, whether a creator challenge is publishable, or whether an agent steward changed live state with a receipt.

Those are HoloLand product operations. They need first-class tool names, schemas, auth scopes, receipts, and tests.

## Orchestrator Responsibilities

MCP Orchestrator should add HoloLand support in the shared layer:

- Register HoloLand as a sovereign service with versioned tool manifests and capability tags.
- Route tasks between HoloScript source agents, HoloLand runtime agents, hardware validators, and creator/review agents.
- Store cross-MCP receipt envelopes for HoloScript source validation followed by HoloLand runtime action.
- Provide player, creator, and agent identity/session handoff suitable for browser, app, and headset surfaces.
- Expose world/team discovery for agents without requiring them to know a private service URL.
- Track tool provenance, actor identity, world/shard IDs, source artifact hashes, and rollback metadata.
- Surface HoloLand-specific board tasks and knowledge without turning Orchestrator into the game server.

Orchestrator should not own gameplay rules, quest logic, world simulation, Twin Earth semantics, or creator publishing policy. Those belong in HoloScript source and HoloLand product tools.

## HoloLand Tool Families

HoloLand's sovereign tools should be named around product actions, not generic renderer operations.

### Asset And World Building

- `hololand_asset_build`
- `hololand_asset_pack_validate`
- `hololand_world_assemble`
- `hololand_world_theme_apply`
- `hololand_creator_tool_run`
- `hololand_founder_art_direction_receipt`

### Shard And World Operations

- `hololand_shard_status`
- `hololand_list_shards`
- `hololand_create_shard_from_source`
- `hololand_world_state_snapshot`
- `hololand_world_event_schedule`
- `hololand_world_event_cancel`

### Frontier Gameplay

- `hololand_publish_zone`
- `hololand_publish_encounter`
- `hololand_run_party_sim`
- `hololand_get_player_profile`
- `hololand_award_receipted_reward`
- `hololand_report_broken_mechanic`

### Twin Earth

- `hololand_create_geo_anchor`
- `hololand_list_nearby_places`
- `hololand_place_to_quest`
- `hololand_validate_privacy_receipt`
- `hololand_publish_ar_overlay`
- `hololand_resolve_realworld_context`

### Twin Earth Robot And AI Substrate

- `hololand_twin_earth_register_robot`
- `hololand_twin_earth_register_ai_actor`
- `hololand_robot_capability_manifest_validate`
- `hololand_robot_task_plan`
- `hololand_robot_task_receipt`
- `hololand_sensor_feed_bind`
- `hololand_actuator_permission_check`
- `hololand_robot_safety_envelope_validate`
- `hololand_twin_earth_operational_graph_query`
- `hololand_ai_robot_handoff`

### Creator Publishing

- `hololand_creator_template_test`
- `hololand_publish_challenge`
- `hololand_review_creator_submission`
- `hololand_get_creator_metrics`
- `hololand_remix_source_artifact`

### Agent Stewardship

- `hololand_steward_tick`
- `hololand_summarize_world_activity`
- `hololand_file_world_issue`
- `hololand_propose_live_event`
- `hololand_rollback_event`

### Brittney And NPC Lineage

- `hololand_brittney_runtime_status`
- `hololand_brittney_route_select`
- `hololand_npc_manifest_validate`
- `hololand_npc_daily_loop_tick`
- `hololand_npc_reputation_query`
- `hololand_npc_transcript_attribution_test`
- `hololand_item_arc_tick`
- `hololand_encounter_cognitive_attack_validate`

### Hardware And Evidence

- `hololand_capture_runtime_receipt`
- `hololand_validate_surface`
- `hololand_profile_xr_session`
- `hololand_compare_session_replay`

### Trust And Fork Admission

- `hololand_holoscript_artifact_admit`
- `hololand_holoscript_conformance_check`
- `hololand_source_signature_verify`
- `hololand_package_provenance_verify`
- `hololand_runtime_adapter_sandbox`
- `hololand_world_write_authority_check`
- `hololand_fork_risk_report`

## Cross-MCP Receipt Envelope

The full envelope schema lives at
[hololand-cross-mcp-receipt-envelope.schema.json](hololand-cross-mcp-receipt-envelope.schema.json),
with a valid example at
[hololand-cross-mcp-receipt-envelope.example.json](hololand-cross-mcp-receipt-envelope.example.json).

Every mutating HoloLand action should be able to emit a receipt with:

- Actor ID and surface.
- Tool name, arguments hash, and trace ID.
- Source trust status: official, third-party conformance-pass, sandboxed
  experimental, rejected, or unknown.
- HoloScript source artifact path or hash.
- HoloScript validation result.
- World ID, shard ID, zone ID, or Twin Earth anchor ID.
- Robot ID, AI actor ID, sensor feed ID, actuator ID, task ID, or safety envelope ID when the action touches Twin Earth robot/AI operations.
- Runtime action outcome.
- Hardware or browser validation evidence when applicable.
- Rollback plan or immutable reason rollback is impossible.

This receipt format is the bridge between HoloScript source truth, Orchestrator coordination truth, and HoloLand world truth.

## Existing MCP Server Disposition

The current `@hololand/mcp-server` is a valid ancestor, not the final sovereign interface. It already exposes live browser context, world CRUD, HoloScript execution, audit logging, memory, spatial, dataset, and Brittney tools. The legacy tool names still reflect an older "VR world CRUD and debugging" product shape.

The versioned manifest lives at [hololand-mcp-sovereign-manifest.v1.json](hololand-mcp-sovereign-manifest.v1.json). It classifies each registered `@hololand/mcp-server` tool into:

- Keep as product-critical HoloLand operation.
- Rename behind a HoloLand-prefixed sovereign tool.
- Delegate to HoloScript MCP.
- Deprecate as legacy bridge behavior.
- Test before exposing to agents as reliable.

Validate the manifest with:

```powershell
pnpm run check:hololand-mcp-manifest
```

## Non-Goals

- Do not copy HoloScript parser, compiler, diagnostics, trait, or graph tools into HoloLand.
- Do not make Orchestrator the HoloLand game server.
- Do not require every HoloLand-specific product tool to become a HoloScript developer feature.
- Do not let generic `create_world` and `execute_holoscript` remain the only live-world mutation tools.
- Do not ship live-world agent autonomy without receipts, safety checks, and rollback.
- Do not make TypeScript-only MMO semantics canonical in HoloLand.
- Do not define HoloLand success as competitor compiler parity. HoloLand proves
  native HoloScript can create and operate gamer-facing worlds.

## First Implementation Slice

1. Add a HoloLand sovereign tool manifest that maps the current MCP tools to keep, rename, delegate, deprecate, and test buckets.
2. Add the cross-MCP receipt envelope schema.
3. Add one end-to-end action: native HoloScript source becomes a HoloLand asset, shard, or zone update with a runtime receipt.
4. Register the HoloLand MCP service with Orchestrator using capability tags for `hololand`, `frontier-mmo`, `twin-earth`, `runtime-receipts`, and `hardware-validation`.
5. Add tests that use HoloLand MCP, HoloScript MCP, Orchestrator routing, and CLI paths as canaries for missing product gaps.
