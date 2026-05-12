# Runtime Service Catalog

The runtime services that compose HoloLand's renderer-side execution: rendering, off-loop inference, agent communication, and teleoperation. Located in [`packages/platform/renderer/src/`](../packages/platform/renderer/src/) — the renderer package owns most of them because they share the 90 Hz / off-loop two-tier scheduling pattern.

## Verify what's live

The renderer service set drifts faster than this doc. Always verify against disk before depending on a name:

```bash
ls packages/platform/renderer/src/*.ts | sort
```

For the cross-cutting CRDT / message-router / persistence services (a separate package), see:

```bash
ls packages/platform/services/*.ts
```

Treat any list in this doc as a snapshot — the `index.ts` files are authoritative.

## Anchor entries

These four services define the load-bearing scheduling pattern that the rest of the renderer-side runtime composes on top of. Every other service in `packages/platform/renderer/src/` either feeds one of these or follows the same render-loop budget rules.

### FoveatedGaussianRenderer

Foveated Gaussian splatting pipeline with hierarchical per-pixel sorting. Targets an 8–12 ms stereo frame budget at 90 Hz with adaptive quality degradation.

- [`FoveatedGaussianRenderer.ts`](../packages/platform/renderer/src/FoveatedGaussianRenderer.ts) — `registerCloud`, `updateGaze`, `renderFrame`, performance stats, device presets (Quest 3 / Quest 2 / PCVR / Desktop).
- [`FoveatedGaussianTypes.ts`](../packages/platform/renderer/src/FoveatedGaussianTypes.ts) — `GaussianSplatData`, `FoveatedGaussianPipelineConfig`, `EyeRenderState`, `GaussianRenderTimings`.
- GPU pipeline: WGSL compute shaders under [`packages/platform/renderer/src/components/gaussian-splat-viewer/`](../packages/platform/renderer/src/components/gaussian-splat-viewer/).
- Factory: `createFoveatedGaussianRenderer(config?)` and `createFoveatedGaussianRendererForDevice(device, config?)`.

### InferenceScheduler

Decouples expensive spatial reasoning (10–200 ms per pass) from the 90 Hz render loop by running inference at 1–5 Hz off-loop and publishing results through a double-buffered `AgentStateBuffer<CachedSpatialState>`. The renderer reads from the front buffer in <0.1 ms per frame.

- [`InferenceScheduler.ts`](../packages/platform/renderer/src/InferenceScheduler.ts) — `start`, `stop`, `setSnapshotCallback`, `getCurrentState`, adaptive frequency control.
- [`SpatialInferenceTypes.ts`](../packages/platform/renderer/src/SpatialInferenceTypes.ts) — `InferenceSchedulerConfig`, `SpatialReasoningProvider`, `CachedSpatialState`.
- Default provider: `SpatialReasoningEngine` (single-agent). Drop-in alternative: `DistributedSceneGraphOrchestrator` (multi-agent — see [`DISTRIBUTED_SCENE_GRAPH.md`](./DISTRIBUTED_SCENE_GRAPH.md)).

### AgentCommunicationManager (renderer-side)

Runs all agent network I/O off the render loop on its own update tick (default 30 Hz). Message processing writes to the back buffer of an `AgentStateBuffer<AgentWorldState>`; the renderer reads from the front buffer at 90 Hz. Same pattern as `InferenceScheduler`.

- [`AgentCommunicationManager.ts`](../packages/platform/renderer/src/AgentCommunicationManager.ts) — `connectAgent`, `onMessage`, `updateAgentState`, `queueCommand`, `consumeCommands`.
- Cross-cutting CRDT/transport for non-agent state lives in [`packages/platform/services/`](../packages/platform/services/) (`DeltaCRDTSyncEngine`, `MVCPersistenceLayer`, `WebRTCManager`, `MessageRouter` — see [`index.ts`](../packages/platform/services/index.ts)).

### TeleoperationHub

XR headset → robot teleoperation. Composes IK solver, policy stream WebSocket client, camera overlay, telemetry display, safety boundary system, and an optional GR00T N1.6 policy client. ~1 ms per frame budget.

- [`TeleoperationHub.ts`](../packages/platform/renderer/src/TeleoperationHub.ts) — `connect`, `start`, `update(leftHand, rightHand, head, dt)`, `emergencyStop`, `resume`.
- [`TeleoperationHubTypes.ts`](../packages/platform/renderer/src/TeleoperationHubTypes.ts) — `RobotState`, `HandTrackingInput`, `JointLimits`, `SafetyBoundary`, `TeleoperationEvent`.
- Subsystems (same directory): [`InverseKinematicsSolver.ts`](../packages/platform/renderer/src/InverseKinematicsSolver.ts), [`RobotPolicyStreamClient.ts`](../packages/platform/renderer/src/RobotPolicyStreamClient.ts), [`RobotCameraOverlay.ts`](../packages/platform/renderer/src/RobotCameraOverlay.ts), [`RobotTelemetryDisplay.ts`](../packages/platform/renderer/src/RobotTelemetryDisplay.ts), [`SafetyBoundarySystem.ts`](../packages/platform/renderer/src/SafetyBoundarySystem.ts), [`GR00TN16PolicyClient.ts`](../packages/platform/renderer/src/GR00TN16PolicyClient.ts).

## Render-loop budget rules

| Tier | Budget | Pattern |
|---|---|---|
| 90 Hz render loop | 11.1 ms total | `renderFrame()`, front-buffer reads, `update()` for teleop. No I/O, no inference. |
| 30 Hz agent comm | ~33 ms per tick | Off-loop. Writes to back buffer, swaps. |
| 1–5 Hz inference | 200–1000 ms per pass | Off-loop. Heavy spatial reasoning, scene-graph merge. |

The double-buffer pattern (`AgentStateBuffer<T>`) is the contract: writers mutate the back buffer, swap on a low-Hz cadence, readers always see a consistent front buffer. Implemented in [`AgentStateBuffer.ts`](../packages/platform/renderer/src/AgentStateBuffer.ts).

## Common patterns

- **Factory functions.** Every service exports a `createXxx(config?)` factory — prefer these over `new`.
- **`Partial<XxxConfig>` with sane defaults.** Configs are documented inline; defaults live alongside the class.
- **Lifecycle: `create → configure → start → [per-frame update] → stop → dispose`.** `dispose()` is irreversible.
- **`getMetrics()` everywhere.** Every service exposes a metrics snapshot for debugging and adaptive control.
- **Events.** `EventEmitter` (`FoveatedGaussianRenderer`), `addEventListener` (`TeleoperationHub`), or config callbacks (`AgentCommunicationManager`, `InferenceScheduler`).

## See also

- [`DISTRIBUTED_SCENE_GRAPH.md`](./DISTRIBUTED_SCENE_GRAPH.md) — multi-agent scene-graph generator that drops into `InferenceScheduler`.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) — these renderer services are bridge / runtime; product semantics belong in HoloScript.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) — `packages/platform/renderer` is **Keep as runtime bridge; enormous blast radius**.
