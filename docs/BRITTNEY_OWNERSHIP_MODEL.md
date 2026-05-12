# Brittney Ownership Model

Brittney spans **HoloScript**, **Studio**, and **HoloLand**. The three layers
do not own her symmetrically.

- **HoloScript** is the substrate.
- **Studio** is Brittney's primary authoring home.
- **HoloLand** is Brittney's flagship runtime and experiential embodiment.

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
  Ollama-backed cloud/local providers (inference layer).
- **In-world agent presence** via the premium MCP server (live browser
  context, debugging, world/object CRUD).
- **NL → HoloScript and voice authoring** in VR via `@hololand/ai-bridge`.
- **IoT → digital-twin** generation via `@hololand/iot-digital-twins`.
- **Free-tier model distribution** via `@hololand/brittney-models`.

## Simple Framing

- In **HoloScript**, Brittney is the **builder**.
- In **Studio**, Brittney is the **creator**.
- In **HoloLand**, Brittney is the **embodied guide and operator**.

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

## Why This Matters

This keeps the architecture coherent: one intelligence layer, one primary
creation surface, one flagship runtime expression. It avoids fragmenting
Brittney into separate assistant identities across the ecosystem and aligns
with the HoloScript Source Contract — `packages/brittney/**` is explicitly in
scope ([HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md)).
