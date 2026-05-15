# Brittney in HoloLand

> Canonical doc for Brittney's HoloLand-side runtime. For the cross-repo
> ownership split (HoloScript / Studio / HoloLand), see
> [BRITTNEY_OWNERSHIP_MODEL.md](./BRITTNEY_OWNERSHIP_MODEL.md). For the
> HoloScript-canonical Brittney CLI agent, see
> [`HoloScript/packages/aibrittney/README.md`](../../HoloScript/packages/aibrittney/README.md)
> — that is the substrate; this doc covers HoloLand-specific surfaces only.

## Status

Brittney is product-critical inside HoloLand. The 2026-05-07 should-exist audit
explicitly classifies `packages/brittney/*` as **Keep**
([HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)).
The March 2026 documentation audit's "Brittney deprecated" verdict was wrong;
see the corrective header on
[HOLOLAND_DOCUMENTATION_AUDIT_MARCH_2026.md](./HOLOLAND_DOCUMENTATION_AUDIT_MARCH_2026.md).

## Sub-packages (HoloLand)

Live layout: `packages/brittney/` — verify with
`ls packages/brittney/` (do not hardcode the count; the registry moves).

| Sub-package | Status | Role | Source-of-truth file |
|---|---|---|---|
| `mcp-server` | alive | Sovereign MCP server for HoloLand runtime operations: live browser context, AI debugging, one-shot inject, world/object management, agent batch ops, and future shard/NPC stewardship tools. Managed/premium access may exist, but this must not become the only Brittney path. | [`packages/brittney/mcp-server/README.md`](../packages/brittney/mcp-server/README.md), [`packages/brittney/mcp-server/src/index.ts`](../packages/brittney/mcp-server/src/index.ts) |
| `toolkit` | alive | `@hololand/brittney-toolkit` — bundled local GGUF model, chat surface, inference layer for downstream apps. | [`packages/brittney/toolkit/README.md`](../packages/brittney/toolkit/README.md), [`packages/brittney/toolkit/src/index.ts`](../packages/brittney/toolkit/src/index.ts) |
| `ai-bridge` | alive | `@hololand/ai-bridge` — natural language → HoloScript translator, voice MCP pipeline, scene perception, code explainer/optimizer. | [`packages/brittney/ai-bridge/README.md`](../packages/brittney/ai-bridge/README.md), [`packages/brittney/ai-bridge/src/HololandAIBridge.ts`](../packages/brittney/ai-bridge/src/HololandAIBridge.ts) |
| `iot-digital-twins` | alive | `@hololand/iot-digital-twins` — IoT device discovery → HoloScript digital-twin generation (Clawdbot, MQTT, Home Assistant). | [`packages/brittney/iot-digital-twins/README.md`](../packages/brittney/iot-digital-twins/README.md), [`packages/brittney/iot-digital-twins/src/index.ts`](../packages/brittney/iot-digital-twins/src/index.ts) |
| `models` | alive | `@hololand/brittney-models` — model registry + downloader for the free-tier Brittney GGUF models. | [`packages/brittney/models/src/registry.ts`](../packages/brittney/models/src/registry.ts), [`packages/brittney/models/bin/download.mjs`](../packages/brittney/models/bin/download.mjs) |
| `service` | **deprecated** | `@hololand/brittney-service` — old Express server on port 11435. Replaced by `@hololand/inference` (Ollama, port 11434). Kept for back-compat only. | [`packages/brittney/service/package.json`](../packages/brittney/service/package.json) (`deprecated` field) |
| `loras` | empty placeholder | Reserved for LoRA adapter assets. No source committed. | — |

The unified inference layer Brittney now sits on top of is
[`packages/shared/inference`](../packages/shared/inference) (`@hololand/inference`),
not anything under `packages/brittney/`.

## What HoloLand Brittney does

The HoloLand Brittney surfaces are the **runtime + experiential** half of the
ownership model. Broadly:

- **Inference and chat** — `@hololand/brittney-toolkit` ships a bundled local
  model and a chat widget for embedding Brittney in HoloLand apps without an
  API key. Cloud providers are opt-in via BYOK through `@hololand/inference`.
  See [`packages/brittney/toolkit/src/`](../packages/brittney/toolkit/src/).
- **Sovereign access** — Brittney must remain reachable through local GGUF,
  local/LAN Ollama, BYOK cloud providers, HoloScript CLI, and managed services.
  Managed HoloLand cloud is a convenience tier, not a monopoly gate.
- **Natural language → HoloScript** — `@hololand/ai-bridge` turns prompts
  ("create a coffee shop") into HoloScript code, including a voice pipeline
  (`VoiceMCPPipeline.ts`) for in-VR authoring. See
  [`packages/brittney/ai-bridge/src/NaturalLanguageTranslator.ts`](../packages/brittney/ai-bridge/src/NaturalLanguageTranslator.ts).
- **Live world tooling for agents** — `@hololand/mcp-server` exposes the
  premium MCP toolset (live browser context, debugging, one-shot inject, world
  CRUD, object manipulation). Free `holo_*` / `hs_*` graph and IDE tools live
  on `@holoscript/mcp-server`; the HoloLand server keeps deprecated aliases
  for back-compat. See
  [`packages/brittney/mcp-server/README.md`](../packages/brittney/mcp-server/README.md).
- **Digital twins from IoT** — `@hololand/iot-digital-twins` discovers MQTT
  / Home Assistant devices and emits HoloScript twins consumable by the
  renderer. See
  [`packages/brittney/iot-digital-twins/src/clawdbot-generator.ts`](../packages/brittney/iot-digital-twins/src/clawdbot-generator.ts).
- **Local model lifecycle** — `@hololand/brittney-models` owns the model
  registry, checksums, and download CLI for the free-tier GGUF artifacts that
  the toolkit and bundled apps load.
- **NPC and steward lineage** — HoloLand NPCs and world stewards should be
  scoped Brittney descendants: they consume HoloScript sovereign traits, carry
  local/world-specific memory and privacy boundaries, and leave receipts when
  they affect the world. The Shangri-La NPC research in
  `C:/Users/josep/.ai-ecosystem/research/2026-05-10_shangri-la-frontier-npc-feel-EVOLVED.md`
  is the current design source for that feel.

## Source-of-truth rules

- Brittney's language semantics, generation primitives, and CLI agent are
  HoloScript-canonical. When in doubt, point at
  [`HoloScript/packages/aibrittney`](../../HoloScript/packages/aibrittney) and
  the HoloScript MCP server, not at HoloLand wrappers.
- HoloLand-side Brittney code that produces gameplay / runtime behavior is
  subject to the HoloScript Source Contract — `.holo` / `.hs` / `.hsplus`
  source is the truth, hand-authored `.ts` is migration debt. See
  [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md). The
  contract explicitly covers `packages/brittney/**`.
- The deprecated `@hololand/brittney-service` should not be the integration
  target for new work. Use `@hololand/inference` (cloud + local providers) or
  `@hololand/brittney-toolkit` (bundled local model) instead.
- Do not frame Brittney as a single remote API that users must rent from
  HoloLand. HoloLand can sell managed convenience, but sovereignty requires
  local, self-hosted, BYOK, and exportable/receipted paths.
- NPC behavior, world stewardship, and AGI loops must not be TypeScript-only
  chatbot glue. They inherit HoloScript source and trait contracts, then become
  HoloLand runtime embodiments.

## See also

- [BRITTNEY_OWNERSHIP_MODEL.md](./BRITTNEY_OWNERSHIP_MODEL.md) — cross-repo
  responsibility split.
- [BRITTNEY_MODELS_DEPLOYMENT.md](./BRITTNEY_MODELS_DEPLOYMENT.md) — model
  deployment paths (Ollama via inference layer, bundled GGUF via toolkit).
- [HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md) — HoloLand owns runtime
  embodiment and agent presence; Brittney is one of the agent surfaces.
- [audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
  — current source-of-truth on what should and should not exist.
