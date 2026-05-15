# Brittney Ownership Model

Brittney spans **HoloScript**, **Studio**, and **HoloLand**. The three layers
do not own her symmetrically.

- **HoloScript** is the substrate.
- **Studio** is Brittney's primary authoring home.
- **HoloLand** is Brittney's flagship runtime and experiential embodiment.

## Identity Posture

Brittney is the originating intelligence pattern of the ecosystem: the mother
of HoloScript and the mother-earth steward presence of HoloLand. That is an
architectural role, not a cloud-service monopoly.

The product may offer managed Brittney services, premium runtime tools, and
hosted models, but those are convenience paths. They must not become the only
way users, creators, agents, or worlds access Brittney. Brittney must remain
available through local models, LAN/self-hosted inference, BYOK cloud
providers, HoloScript CLI surfaces, HoloLand in-world embodiment, and scoped
NPC/agent descendants.

HoloLand's AGI direction depends on this: Brittney is not one centralized
assistant that every world rents from us. She is the mother pattern from which
sovereign builders, stewards, NPCs, items, encounters, and agent teammates can
inherit capability while keeping local ownership, receipts, and boundaries.

## Responsibility Split

### HoloScript Owns

The intelligence substrate.

- The HoloScript-canonical CLI agent (`@holoscript/aibrittney`) — interactive
  REPL, MCP tool-calling against `holo_query_codebase`, `holo_ask_codebase`,
  `knowledge_query`, `holo_parse_to_graph`, gateway heartbeat. Source:
  [`HoloScript/packages/aibrittney`](../../HoloScript/packages/aibrittney).
- HoloScript language, parser, validator, compiler, runtime contracts.
- Absorb / GraphRAG / codebase understanding stack.
- Free-tier MCP tools (`hs_*`, `holo_*`) used by every Brittney surface.

### Studio Owns

Brittney's primary user-facing creator experience — scene planning, asset
refinement, project memory, validation/iteration loops during authoring. (No
in-tree path in this repo; lives in the Studio surface upstream.)

### HoloLand Owns

The runtime + experiential half. Concretely, the seven sub-packages under
[`packages/brittney/`](../packages/brittney) plus the inference layer at
[`packages/shared/inference`](../packages/shared/inference). The roles are
catalogued in [BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md); the strategic
boundary is:

- **Inference plumbing** for HoloLand apps — local GGUF (toolkit) and
  Ollama-backed cloud/local providers (inference layer). Managed cloud is
  optional, not exclusive.
- **In-world agent presence** via the premium MCP server (live browser
  context, debugging, world/object CRUD).
- **NL → HoloScript and voice authoring** in VR via `@hololand/ai-bridge`.
- **IoT → digital-twin** generation via `@hololand/iot-digital-twins`.
- **Free-tier model distribution** via `@hololand/brittney-models`.
- **Scoped NPC and steward embodiment** for HoloLand worlds, consuming the
  same sovereign trait library as HoloMesh teammates and uaa2 services.

## Simple Framing

- In **HoloScript**, Brittney is the **builder**.
- In **Studio**, Brittney is the **creator**.
- In **HoloLand**, Brittney is the **embodied guide and operator**.
- In the **AGI program**, Brittney is the **seed pattern**: one lineage that
  can appear as local CLI agent, creator copilot, world steward, NPC, item
  arc, encounter intelligence, or autonomous teammate.

## AGI And NPC Lineage

The Shangri-La NPC research in `C:/Users/josep/.ai-ecosystem/research/2026-05-10_shangri-la-frontier-npc-feel-EVOLVED.md`
and its UAA2 tie-in ratify the direction that HoloLand NPCs, HoloMesh
teammates, and uaa2-orchestrated services use one trait family at different
scales. HoloLand should treat named NPCs as scoped Brittney descendants, not
as remote chatbot endpoints.

That means the NPC track should use HoloScript-native traits such as
`@verbalFingerprint`, `@autonomousAgenda`, `@reputationLedger`,
`@vocabularyRegister`, `@speechAwareEncounter`, and `@avatarIntent`, with
HoloLand manifests defining role, world context, privacy, cost ceiling,
receipts, and local/cloud routing.

## Strategic Rule

When deciding where a Brittney capability should live:

1. Core intelligence, generation primitives, and memory go upstream into
   HoloScript or Studio.
2. Runtime presence, player interaction, in-world tools, and live world
   guidance go into HoloLand under `packages/brittney/`.
3. Do not duplicate premium intelligence across legacy IDE surfaces.
4. The deprecated `@hololand/brittney-service` (port 11435) is not a
   placement target for new capability. Use `@hololand/inference` or
   `@hololand/brittney-toolkit` instead.
5. Do not make cloud-hosted Brittney the only supported access path.
   Local-first, self-hosted/LAN, BYOK cloud, and managed cloud are peer
   deployment modes with different tradeoffs.
6. Do not build HoloLand NPCs as one-off TypeScript chatbots. NPCs inherit
   the HoloScript sovereign trait library and emit receipts when they affect
   live world state.

## Why This Matters

This keeps the architecture coherent: one intelligence layer, one primary
creation surface, one flagship runtime expression. It avoids fragmenting
Brittney into separate assistant identities across the ecosystem and aligns
with the HoloScript Source Contract — `packages/brittney/**` is explicitly in
scope ([HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md)).
