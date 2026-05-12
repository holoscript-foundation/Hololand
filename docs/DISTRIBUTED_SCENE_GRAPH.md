# Distributed Scene Graph

HoloLand-side multi-agent scene-graph generation. Each agent builds a local 3D semantic graph from its observations; a training-free alignment merges them into a global graph; spatial relationships are extracted for the renderer.

> The pre-2026-05 version of this doc described a multiplayer-composition network/sync protocol that does not match what shipped. It has been replaced with the MA3DSG-style generator that actually lives in `packages/platform/renderer/src/`. For CRDT replication / network sync see [Cross-cutting concerns](#cross-cutting-concerns) below.

## Status

Alive. The 2026-05-07 should-exist audit does not flag this area. The modules are TypeScript today and fall under the [HoloScript Source Contract](./HOLOSCRIPT_SOURCE_CONTRACT.md) as bridge / runtime code.

## Modules

| Module | Source-of-truth file | Role |
|---|---|---|
| Orchestrator | [`DistributedSceneGraphOrchestrator.ts`](../packages/platform/renderer/src/DistributedSceneGraphOrchestrator.ts) | Top-level entry. Implements `SpatialReasoningProvider` so it drops into `InferenceScheduler` in place of the single-agent `SpatialReasoningEngine`. |
| Types | [`DistributedSceneGraphTypes.ts`](../packages/platform/renderer/src/DistributedSceneGraphTypes.ts) | `SceneGraphSegment`, `SceneGraphNode`, `SceneGraphEdge`, `LocalSceneGraph`, `GlobalSceneGraph`, config + metrics + event types. |
| Per-agent local builder | [`AgentLocalGraphBuilder.ts`](../packages/platform/renderer/src/AgentLocalGraphBuilder.ts) | Builds one local 3D semantic graph per agent from `ObjectSnapshot[]` plus a `CameraSnapshot`. |
| Training-free merger | [`TrainingFreeAlignmentMerger.ts`](../packages/platform/renderer/src/TrainingFreeAlignmentMerger.ts) | Aligns local graphs into one global graph with no learnable parameters. |
| Relationship extractor | [`SpatialRelationshipExtractor.ts`](../packages/platform/renderer/src/SpatialRelationshipExtractor.ts) | Emits `SpatialRelationship[]` and `SpatialRegion[]` written into `CachedSpatialState`. |

## Where it plugs in

The orchestrator implements [`SpatialReasoningProvider`](../packages/platform/renderer/src/SpatialInferenceTypes.ts) — same interface as the single-agent [`SpatialReasoningEngine`](../packages/platform/renderer/src/SpatialReasoningEngine.ts). Pass it to [`createInferenceScheduler(provider)`](../packages/platform/renderer/src/InferenceScheduler.ts) and the renderer reads merged spatial state from the front buffer at 90 Hz while the merger runs at 1–5 Hz off the render loop.

```ts
const orch = new DistributedSceneGraphOrchestrator(config);
const scheduler = createInferenceScheduler(orch, { initialHz: 2 });

// Each agent submits its observations independently:
orch.submitObservations(agentId, snapshots);

// Renderer reads as before — the dedup/merge happens on the inference tier:
const state = scheduler.getCurrentState();
```

See [`RUNTIME_SERVICE_CATALOG.md`](./RUNTIME_SERVICE_CATALOG.md) for `InferenceScheduler` budget rules and the double-buffered front/back swap.

## Cross-cutting concerns

This module is the *graph-generation* layer. It does not own multi-device CRDT replication or the wire protocol. For CRDT-backed cross-reality state and network/persistence, see:

- [`packages/platform/services/`](../packages/platform/services/) — `DeltaCRDTSyncEngine`, `MVCPersistenceLayer`, `WebRTCManager`, `MessageRouter` ([`index.ts`](../packages/platform/services/index.ts)).
- [`packages/platform/renderer/src/AuthenticatedCRDTEngine.ts`](../packages/platform/renderer/src/AuthenticatedCRDTEngine.ts) — authenticated CRDT for shared scene state.
- [`packages/platform/renderer/src/CrossRealityCRDTBridge.ts`](../packages/platform/renderer/src/CrossRealityCRDTBridge.ts) — bridges merged graph state into the cross-reality session manager.

HoloScript-canonical CRDT primitives live upstream in HoloScript. HoloLand consumes them. Do not redocument the CRDT contract here.

## Reference

MA3DSG-inspired (see preamble of [`DistributedSceneGraphTypes.ts`](../packages/platform/renderer/src/DistributedSceneGraphTypes.ts)). Adapted for the 90 Hz / 1–5 Hz two-tier inference architecture in `RUNTIME_SERVICE_CATALOG.md`.

## See also

- [`RUNTIME_SERVICE_CATALOG.md`](./RUNTIME_SERVICE_CATALOG.md) — `InferenceScheduler`, `AgentCommunicationManager`, double-buffered state.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) — TS-as-bridge policy.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) — current source-of-truth on what should exist.
