# HoloLand Runtime Service Catalog

Reference documentation for composition authors working with HoloLand's core runtime services. Each service is located in `packages/platform/renderer/src/` and follows a consistent pattern: a main class, a types module, a factory function, and a test suite.

---

## Table of Contents

1. [FoveatedGaussianRenderer](#1-foveatedgaussianrenderer)
2. [InferenceScheduler](#2-inferencescheduler)
3. [SpatialReasoningEngine](#3-spatialreasoningengine)
4. [AgentCommunicationManager](#4-agentcommunicationmanager)
5. [TeleoperationHub](#5-teleoperationhub)
6. [Cross-Service Architecture](#6-cross-service-architecture)
7. [Common Patterns](#7-common-patterns)

---

## 1. FoveatedGaussianRenderer

**File:** `FoveatedGaussianRenderer.ts`
**Types:** `FoveatedGaussianTypes.ts`
**GPU Pipeline:** `components/gaussian-splat-viewer/FoveatedGaussianPipeline.ts`
**Factory:** `createFoveatedGaussianRenderer(config?)` / `createFoveatedGaussianRendererForDevice(deviceType, config?)`

### Purpose

VRSplat-style foveated Gaussian splatting pipeline with StopThePop hierarchical per-pixel sorting for temporally stable, view-consistent rendering in VR. Targets an 8-12ms stereo frame budget at 90Hz.

### Architecture (6-Stage Pipeline)

```
GaussianSplatData[] (CPU)
    |
    v
[1] Frustum Cull (CPU, < 0.5ms)
    |
    v
[2] Tile Assignment + Foveated Zone Classification (CPU/GPU, < 1ms)
    |
    v
[3] Radix Sort by depth (GPU preferred, CPU fallback, < 2ms)
    |
    v
[4] StopThePop Hierarchical Per-Pixel Re-Sort (GPU, < 1.5ms)
    |  Three-level queue: 4x4 tile(64) -> 2x2 sub-tile(8) -> pixel(4)
    |  Computes t_opt = (d^T Sigma^-1 (mu - o)) / (d^T Sigma^-1 d)
    |
    v
[5] Alpha Blending with Foveated Resolution (GPU, < 3ms)
    |  Foveal: 16x16 tiles, full-res, full SH
    |  Peripheral: 32x32 tiles, half-res, DC-only SH
    |
    v
[6] Blend Zone Interpolation (GPU, < 0.5ms)
    |
    v
Composited Frame (per eye)
```

### Key Interfaces

| Interface | Role |
|-----------|------|
| `GaussianSplatData` | Packed splat cloud (positions, covariances, SH coefficients, opacities, bounds). 56 bytes per baked splat. |
| `GaussianCloudParams` | Registration parameters: id, data, world matrix, layer (`baked`/`relightable`/`interactive`), priority, pinned flag. |
| `FoveatedGaussianPipelineConfig` | Top-level config: target frame time, max Gaussians, foveated settings, StopThePop settings, stereo, adaptive quality. |
| `FoveatedRenderConfig` | Foveation config: foveal angle (default 10 deg), blend zone (default 5 deg), per-zone quality, gaze smoothing, fixed foveation center. |
| `StopThePopConfig` | Three-level queue sizes (64/8/4), hierarchical culling toggle, opacity threshold, optimal depth toggle. |
| `EyeRenderState` | Per-eye state: view/projection matrices, camera position/forward, gaze direction, resolution, tile counts. |
| `GaussianRenderTimings` | Per-frame timing breakdown: frustumCull, tileAssign, sort, hierarchicalResort, rasterize, blendZone, sync (all in ms). |
| `GaussianRenderStats` | Rolling performance stats: avg/p95/p99 frame times, within-budget percentage, cull efficiency, state (`excellent`/`good`/`marginal`/`degraded`/`critical`). |

### Public API

```typescript
class FoveatedGaussianRenderer extends EventEmitter {
  // Cloud Management
  registerCloud(params: GaussianCloudParams): boolean;
  unregisterCloud(id: string): boolean;
  updateCloudTransform(id: string, worldMatrix: Float32Array): void;
  updateCloudData(id: string, data: GaussianSplatData): void;

  // Gaze Tracking
  updateGaze(leftGaze: [number, number, number], rightGaze: [number, number, number]): void;

  // Main Render Entry Point
  renderFrame(eyeStates: EyeRenderState[]): GaussianRenderTimings;

  // Performance
  getPerformanceStats(): GaussianRenderStats | null;
  getLastTiming(): GaussianRenderTimings | null;
  generateReport(): string;

  // Queries
  getTotalGaussianCount(): number;
  getTotalEffectiveGaussianCount(): number;
  getCloudCount(): number;
  getCloudInfo(id: string): Readonly<RegisteredCloud> | undefined;
  getCloudIds(): string[];
  getConfig(): Readonly<FoveatedGaussianPipelineConfig>;
  getQualityLevel(): number;
  getFrameNumber(): number;

  // Configuration
  setFoveatedConfig(config: Partial<FoveatedRenderConfig>): void;
  setStopThePopConfig(config: Partial<StopThePopConfig>): void;
  setTargetFrameTime(ms: number): void;
  forceQualityLevel(level: number): void;
  resetQuality(): void;

  // Presets
  applyQuest3Preset(): void;   // 90Hz, 160K Gaussians, 11.1ms budget
  applyQuest2Preset(): void;   // 72Hz, 80K Gaussians, 13.9ms budget
  applyPCVRPreset(): void;     // 120Hz, 1M Gaussians, 8.33ms budget
  applyDesktopPreset(): void;  // 60Hz, 2M Gaussians, 16.67ms budget

  // Lifecycle
  clear(): void;
  dispose(): void;
}
```

### Events

| Event | When |
|-------|------|
| `cloud:added` | Cloud registered successfully |
| `cloud:removed` | Cloud unregistered |
| `cloud:updated` | Cloud data updated |
| `quality:adapted` | Adaptive quality changed level |
| `budget:exceeded` | Cloud rejected (Gaussian budget full) |
| `frame:over_budget` | Frame exceeded timing target |
| `frame:recovered` | Frame returned to budget after over-budget |
| `sort:fallback` | Fell back from hierarchical to simple sort |

### Adaptive Quality Levels

| Level | SH Band | Resolution Scale | Description |
|-------|---------|-----------------|-------------|
| 0 | L3 | 100% | Best quality |
| 1 | L2 | 100% | Slight SH reduction |
| 2 | L1 | 90% | Reduced SH + slight resolution drop |
| 3 | DC only | 80% | Minimum SH + resolution reduction |
| 4 | DC only | 65% | Aggressive degradation |
| 5 | DC only | 50% | Emergency minimal quality |

Quality adapts every 30 frames: degrades if > 20% over budget, improves if > 30% under budget.

### Distance LOD

| Distance | Gaussian Count |
|----------|---------------|
| < 5m | 100% |
| 5-15m | 75% |
| 15-30m | 50% |
| 30-60m | 25% |
| 60m+ | 10% |

### GPU Pipeline (WebGPU)

The `FoveatedGaussianPipeline` class in `components/gaussian-splat-viewer/` orchestrates six WGSL compute shaders:

1. **sort-key-gen.wgsl** -- Depth + foveated zone encoding per Gaussian (zone in top 2 bits)
2. **radix-histogram.wgsl** -- Per-workgroup radix histogram with local atomics
3. **prefix-sum.wgsl** -- Blelloch exclusive prefix sum scan
4. **radix-scatter.wgsl** -- Scatter with ping-pong buffer pattern
5. **tile-assignment.wgsl** -- Project, classify tiles into foveated zones, apply decimation
6. **stop-the-pop.wgsl** -- Per-tile bitonic sort by t_opt within workgroup shared memory

All shaders use `workgroup_size(256)` for cross-platform compatibility. No global atomics, no subgroup ops.

### Usage Example

```typescript
import { createFoveatedGaussianRendererForDevice } from './FoveatedGaussianRenderer';

const renderer = createFoveatedGaussianRendererForDevice('quest3');

renderer.registerCloud({
  id: 'environment',
  data: splatData,
  worldMatrix: new Float32Array(16), // identity
  layer: 'baked',
  priority: 10,
  pinned: true,
});

renderer.on('quality:adapted', (event) => {
  console.log('Quality level:', event.data.level);
});

// Per-frame (in render loop):
renderer.updateGaze(leftEyeDir, rightEyeDir);
const timings = renderer.renderFrame([leftEyeState, rightEyeState]);
```

### References

- VRSplat (I3D 2025): Foveated rasterizer, 72+ FPS on Quest 3
- StopThePop (SIGGRAPH 2024): Hierarchical sorting, eliminates popping
- VR-Splatting (I3D 2025): Foveated 3DGS at 90Hz

---

## 2. InferenceScheduler

**File:** `InferenceScheduler.ts`
**Types:** `SpatialInferenceTypes.ts`
**Factory:** `createInferenceScheduler(provider, config?)`

### Purpose

Orchestrates the hierarchical inference scheduling architecture, decoupling computationally expensive spatial reasoning (10-200ms) from the 90Hz VR render loop (11.1ms budget). Runs inference at 1-5Hz on a separate timing loop and publishes results via double-buffered state.

### Architecture (Two-Tier Scheduling)

```
TIER 1 (SLOW PATH - 1-5Hz):
  SpatialReasoningProvider.infer() runs on a setInterval loop,
  completely decoupled from the VR render loop.
  Results written to BACK buffer of CachedSpatialState.

TIER 2 (FAST PATH - 90Hz):
  HololandRenderer reads from FRONT buffer of CachedSpatialState.
  No blocking, no inference computation, just data reads.
  Budget: < 0.1ms per frame.

BUFFER SWAP:
  After each inference pass, the scheduler swaps the double-buffered
  CachedSpatialState, making new results visible to the renderer.
```

### Data Flow

```
Scene Graph (Three.js)
     |
     v
InferenceScheduler.takeSnapshot()         <-- Between frames
     |
     v
SpatialReasoningProvider.infer()           <-- 1-5Hz, OFF render loop
     |
     v
AgentStateBuffer<CachedSpatialState>.swap()  <-- Atomic swap
     |
     v
getFrontBuffer()                           <-- 90Hz, ON render loop
     |
     v
HololandRenderer.syncSpatialInference()   <-- Apply to scene
```

### Key Interfaces

| Interface | Role |
|-----------|------|
| `InferenceSchedulerConfig` | Frequency bounds (minHz/maxHz/initialHz), budget, complexity threshold, adaptive toggle, staleness threshold. |
| `InferenceSchedulerMetrics` | Running state, current/target Hz, total passes, avg/peak duration, scene complexity, buffer staleness. |
| `SpatialReasoningProvider` | Plugin interface: `infer(state, deltaMs)`, `getComplexity()`, optional `initialize()`/`dispose()`. |
| `CachedSpatialState` | Double-buffered result: relationships, regions, occlusion states, navigation hints, labels, scene summary, timing metadata. |
| `SceneSnapshotCallback` | Callback signature `() => { objects: ObjectSnapshot[]; camera: CameraSnapshot }`. |

### Public API

```typescript
class InferenceScheduler {
  // Lifecycle
  start(): Promise<void>;
  stop(): void;
  dispose(): void;

  // Scene Integration
  setSnapshotCallback(callback: SceneSnapshotCallback): void;

  // Buffer Access (for renderer)
  getBuffer(): AgentStateBuffer<CachedSpatialState>;
  getCurrentState(): Readonly<CachedSpatialState>;

  // Frequency Control
  getCurrentHz(): number;
  getTargetHz(): number;
  setTargetHz(hz: number): void;

  // Metrics
  getMetrics(): InferenceSchedulerMetrics;
  getIsRunning(): boolean;
}
```

### Adaptive Frequency

The scheduler automatically adjusts inference frequency based on pass duration:

| Duration vs Budget | Action | Threshold |
|-------------------|--------|-----------|
| < 50% of budget | Increase Hz by 0.5 (after 5 consecutive fast passes) | FAST |
| 50-90% of budget | No change | Normal |
| > 90% of budget | Decrease Hz by 0.5 (after 2 consecutive slow passes) | SLOW |
| High complexity (> 0.7) | Bias toward lower Hz | Complexity override |

Scene complexity thresholds for default frequency:
- Simple (< 50 objects): 5Hz (200ms budget)
- Medium (50-200 objects): 3Hz (333ms budget)
- Complex (200+ objects): 1-2Hz (500-1000ms budget)

### Default Configuration

```typescript
{
  minHz: 1,
  maxHz: 5,
  initialHz: 2,
  maxInferenceBudgetMs: 200,
  complexityThreshold: 0.7,
  autoStart: false,
  stalenessThresholdMs: 2000,
  adaptiveFrequency: true,
}
```

### Usage Example

```typescript
import { createInferenceScheduler } from './InferenceScheduler';
import { createSpatialReasoningEngine } from './SpatialReasoningEngine';

const engine = createSpatialReasoningEngine();
const scheduler = createInferenceScheduler(engine, { initialHz: 3 });

// Register scene snapshot provider
scheduler.setSnapshotCallback(() => ({
  objects: captureObjectSnapshots(scene),
  camera: captureCameraSnapshot(camera),
}));

await scheduler.start();

// In render loop (90Hz):
const spatialState = scheduler.getCurrentState();
// Use spatialState.relationships, spatialState.regions, etc.
```

---

## 3. SpatialReasoningEngine

**File:** `SpatialReasoningEngine.ts`
**Types:** `SpatialInferenceTypes.ts`
**Factory:** `createSpatialReasoningEngine(config?)`

### Purpose

Default implementation of the `SpatialReasoningProvider` interface. Performs spatial analysis of the Three.js scene graph at 1-5Hz, producing cached spatial state consumed by the renderer at 90Hz. Runs entirely on its own timing loop with a 200-1000ms budget per pass.

### Capabilities

1. **Pairwise Spatial Relationships** -- O(n^2) analysis of object pairs with configurable limits
2. **Region Clustering** -- Density-based clustering (DBSCAN-like) to identify functional zones
3. **Occlusion Estimation** -- CPU-side conservative front-to-back occlusion testing
4. **Spatial Label Generation** -- Billboard labels for named objects and detected regions
5. **Scene Summary** -- Bounding box, center of mass, object count, complexity score

### Key Interfaces

| Interface | Role |
|-----------|------|
| `ObjectSnapshot` | Lightweight scene object copy: id, type, position, rotation, scale, bounds, visibility, label. |
| `CameraSnapshot` | Camera state: position, forward/up/right, FOV, near/far. |
| `SpatialReasoningEngineConfig` | Distance thresholds, confidence minimums, max relationships, clustering params, occlusion/label toggles. |
| `SpatialRelationship` | Detected relationship: source/target ids, type, confidence, distance, direction vector. |
| `SpatialRegion` | Detected cluster: center, extents, object ids, type, confidence, metadata (density). |
| `OcclusionState` | Per-object: potentially visible, visibility ratio, occluded-by list, timestamp. |
| `SpatialLabel` | Positioned text: category, confidence, billboard flag, max visibility distance. |

### Relationship Types

| Type | Detection Method |
|------|-----------------|
| `near` | Distance <= nearThreshold (default 5m) |
| `adjacent` | Distance <= adjacentThreshold (default 1.5m) |
| `far` | Distance > nearThreshold |
| `above` / `below` | Y-axis dominant direction (> 0.6 dot product) |
| `left_of` / `right_of` | Camera-relative horizontal direction (> 0.5 dot with camera right) |
| `in_front_of` / `behind` | Camera-relative depth direction (> 0.5 dot with camera forward) |
| `contains` / `contained_by` | AABB containment test |
| `overlapping` | AABB overlap test |
| `aligned` | Shared axis within 0.3m tolerance |

### Public API

```typescript
class SpatialReasoningEngine implements SpatialReasoningProvider {
  // Scene Snapshot
  setSceneSnapshot(objects: ObjectSnapshot[], camera: CameraSnapshot): void;
  getObjectCount(): number;

  // SpatialReasoningProvider Interface
  infer(state: CachedSpatialState, deltaMs: number): Promise<void>;
  getComplexity(): number;
  initialize(): Promise<void>;
  dispose(): void;
}
```

### Complexity Calculation

```
complexity = countFactor * 0.6 + densityFactor * 0.4

countFactor  = min(log10(objectCount + 1) / 3, 1.0)   // 1000 objects = 1.0
densityFactor = min(objectCount / volume / 10, 1.0)
```

### Default Configuration

```typescript
{
  nearThreshold: 5,
  adjacentThreshold: 1.5,
  minRelationshipConfidence: 0.3,
  maxRelationships: 500,
  enableRegionDetection: true,
  minClusterSize: 3,
  clusterDistanceThreshold: 8,
  enableOcclusion: true,
  enableLabels: true,
  maxLabelDistance: 50,
}
```

### Usage Example

```typescript
import { createSpatialReasoningEngine } from './SpatialReasoningEngine';

const engine = createSpatialReasoningEngine({
  nearThreshold: 3,
  maxRelationships: 200,
});

engine.setSceneSnapshot(objectSnapshots, cameraSnapshot);

const state = createEmptyCachedSpatialState();
await engine.infer(state, 500); // 500ms since last pass

// state.relationships -> all detected spatial relationships
// state.regions -> detected clusters
// state.occlusionStates -> per-object occlusion
// state.labels -> billboard labels
```

---

## 4. AgentCommunicationManager

**File:** `AgentCommunicationManager.ts`
**Types:** Defined inline and in `AgentStateBuffer.ts`
**Factory:** `createAgentCommunicationManager(config?)`

### Purpose

Manages all agent communication OFF the VR render loop. Agent communication involves network I/O (WebSocket, HTTP, MCP tool calls) with 10-500ms latency. This manager runs on a separate `setInterval` loop (configurable Hz, default 30Hz) and writes agent state updates to the BACK buffer of an `AgentStateBuffer`. The renderer reads the FRONT buffer.

### Data Flow

```
Agent Message (MCP/WS/HTTP)
     |
     v
AgentCommunicationManager.onMessage()     <-- OFF render loop
     |
     v
AgentStateBuffer.getBackBuffer()          <-- Write to back buffer
     |
     v
AgentStateBuffer.swap()                   <-- Between frames
     |
     v
AgentStateBuffer.getFrontBuffer()         <-- Renderer reads (ON render loop)
     |
     v
HololandRenderer.syncAgentState()         <-- Apply to Three.js scene
```

### Key Interfaces

| Interface | Role |
|-----------|------|
| `AgentCommunicationConfig` | Update Hz (default 30), max command queue (default 100), staleness threshold (default 500ms), lifecycle callbacks. |
| `AgentMessage` | Inbound message: type (`state_update`/`command`/`connect`/`disconnect`/`heartbeat`), agentId, timestamp, payload. |
| `AgentWorldState` | Double-buffered root state: agents map, commands queue, notification, sequence, last swap timestamp. |
| `AgentAvatarState` | Per-agent: position, rotation, scale, visibility, animation state, emotion, gaze target, speech text, metadata. |
| `AgentCommand` | Queued command: id, agentId, type, payload, timestamp, consumed flag. |
| `AgentCommunicationMetrics` | Running state, connected agents, message throughput, pending commands, buffer metrics. |
| `AgentStateBuffer<T>` | Generic double-buffered container with O(1) reads, O(1) writes, O(n) swap (deep copy). |
| `AgentStateBufferMetrics` | Swap count, average interval, writes/reads since swap, staleness state. |

### Public API

```typescript
class AgentCommunicationManager {
  // Lifecycle
  start(): void;
  stop(): void;
  dispose(): void;

  // Message Ingestion (OFF render loop)
  onMessage(message: AgentMessage): void;
  updateAgentState(agentId: string, updates: Partial<AgentAvatarState>): void;
  queueCommand(agentId: string, commandType: string, payload: Record<string, unknown>): string;
  connectAgent(agentId: string, name?: string, initialState?: Partial<AgentAvatarState>): void;
  disconnectAgent(agentId: string): void;

  // Buffer Access
  getBuffer(): AgentStateBuffer<AgentWorldState>;
  getCurrentState(): Readonly<AgentWorldState>;

  // Queries
  isAgentConnected(agentId: string): boolean;
  getConnectedAgentIds(): string[];
  getConnectedAgentCount(): number;
  getIsRunning(): boolean;

  // Renderer Integration
  consumeCommands(): AgentCommand[];

  // Metrics
  getMetrics(): AgentCommunicationMetrics;
}
```

### Message Types

| Type | Behavior |
|------|----------|
| `connect` | Creates default `AgentAvatarState`, applies initial state from payload, fires `onAgentConnected` callback. |
| `disconnect` | Removes agent from state, fires `onAgentDisconnected` callback. |
| `state_update` | Merges position, rotation, scale, visibility, animation, emotion, gaze, speech, metadata. Auto-connects if needed. |
| `command` | Pushes `AgentCommand` to queue (capped at `maxCommandQueueSize`, drops oldest unconsumed). Fires `onCommandQueued`. |
| `heartbeat` | Updates `lastUpdateTimestamp` on existing agent. |

### AgentStateBuffer Guarantees

- **Renderer NEVER blocks on agent I/O** -- front buffer reads are O(1), zero allocation
- **No torn reads** -- state is consistent within a single frame
- **Swap cost is O(n)** via `structuredClone` (or JSON round-trip fallback), but happens at 30Hz, not 90Hz
- **Staleness detection** -- `isStale` flag after configurable threshold (default 500ms)

### Usage Example

```typescript
import { createAgentCommunicationManager } from './AgentCommunicationManager';

const manager = createAgentCommunicationManager({ updateHz: 30 });
manager.start();

// Connect an agent
manager.connectAgent('brittney', 'Brittney', {
  position: { x: 1, y: 0, z: 2 },
  emotion: 'happy',
});

// Send state updates (from WebSocket handler, MCP callback, etc.)
manager.onMessage({
  type: 'state_update',
  agentId: 'brittney',
  timestamp: Date.now(),
  payload: { position: { x: 3, y: 0, z: 4 }, animationState: 'talking' },
});

// Queue a command
manager.queueCommand('brittney', 'spawn_object', { objectType: 'chair', at: { x: 2, y: 0, z: 2 } });

// In render loop (90Hz):
const agentState = manager.getCurrentState();
// Apply agentState.agents to Three.js scene
const commands = manager.consumeCommands();
// Execute commands
```

---

## 5. TeleoperationHub

**File:** `TeleoperationHub.ts`
**Types:** `TeleoperationHubTypes.ts`
**Factory:** `createTeleoperationHub(config?)`

### Purpose

Main orchestrator for XR headset robot teleoperation. Wires together six subsystems into a unified teleoperation experience: IK solver, policy stream WebSocket client, camera overlay, telemetry display, safety boundary system, and optional GR00T N1.6 policy client.

### Architecture

```
                    TeleoperationHub
 ┌──────────────┐  ┌────────────────────┐
 │   IK Solver   │  │ PolicyStreamClient  │
 │  (XRHand ->   │  │  (WS Binary Proto)  │
 │   Joints)     │--│  (Robot Controller)  │
 └──────────────┘  └────────────────────┘
 ┌──────────────┐  ┌────────────────────┐
 │ Camera       │  │ Telemetry Display   │
 │ Overlay      │  │ (HUD Panel)         │
 │ (VR Viewport)│  │ (Joints/Forces/Bat) │
 └──────────────┘  └────────────────────┘
 ┌──────────────────────────────────────┐
 │ GR00TN16PolicyClient (Optional)      │
 │  (WS -> Inference Server, 30Hz obs)  │
 │  (256-dim -> 37-DOF, Action Chunking)│
 │  (Policy Switch: manip/nav/bimanual) │
 └──────────────────────────────────────┘
 ┌──────────────────────────────────────┐
 │     Safety Boundary System           │
 │  (Workspace limits + Force Feedback)  │
 │  (E-Stop + Haptic Simulation)        │
 └──────────────────────────────────────┘
```

### Per-Frame Budget

```
update(leftHand, rightHand, headPose, deltaTime)
    |
    +-- IK Solve (both hands) ............... ~0.3ms
    +-- Safety Check ......................... ~0.1ms
    +-- Clamp Joints ......................... ~0.01ms
    +-- Send Joint Commands (WS binary) ...... ~0.05ms
    +-- Update Camera Overlay ................ ~0.02ms
    +-- Update Telemetry Display ............. ~0.5ms (rate limited)
    |                                          --------
    Total: ~1ms (well within 11.1ms budget)
```

### Key Interfaces

| Interface | Role |
|-----------|------|
| `TeleoperationHubConfig` | Nested configs for all 6 subsystems plus NPU model name, GR00T toggle. |
| `RobotState` | Full telemetry snapshot: joint states (37 joints), end-effector poses, battery, operating mode, e-stop, contact forces, health flags. |
| `HandTrackingInput` | XRHand API input: wrist pose, finger tips, curl/pinch/grip values, confidence. |
| `IKSolveResult` | Target joint angles, convergence, residual error, iterations, solve time. |
| `RobotJointName` | Union type of 37 joint names: head (2), torso (3), arms (7+7), hands (3+3), legs (6+6). |
| `JointLimits` | Per-joint: min/max angle, max velocity (rad/s), max torque (N*m). |
| `SafetyBoundary` | Shape (box/sphere/cylinder), center, dimensions, type (exclusion/workspace), soft/hard margins. |
| `PolicyStreamConfig` | WebSocket URL, reconnect params, heartbeat, command rate (default 60Hz), compression toggle. |
| `CameraOverlayConfig` | VR overlay position/size, opacity, resolution, gaze following, latency indicator. |
| `TelemetryDisplayConfig` | HUD position/size, update rate, toggles for joint diagram, force vectors, battery, latency. |
| `TeleoperationHubMetrics` | Connection state, latency, command rate, camera FPS, IK solve time, NPU inference time, boundary violations, uptime. |
| `TeleoperationEvent` | Event types: connected, disconnected, error, state_update, camera_frame, boundary_violation, emergency_stop, resume, calibration_complete, latency_warning, battery_warning. |

### Public API

```typescript
class TeleoperationHub {
  // Subsystems (read-only)
  readonly ikSolver: InverseKinematicsSolver;
  readonly policyStream: RobotPolicyStreamClient;
  readonly cameraOverlay: RobotCameraOverlay;
  readonly telemetryDisplay: RobotTelemetryDisplay;
  readonly safetySystem: SafetyBoundarySystem;
  readonly grootPolicy: GR00TN16PolicyClient | null;

  // Lifecycle
  connect(): void;
  disconnect(): void;
  start(): void;
  stop(): void;
  reset(): void;
  destroy(): void;

  // Per-Frame Update (call from VR render loop)
  update(
    leftHand: HandTrackingInput | null,
    rightHand: HandTrackingInput | null,
    headPosition: Vec3,
    headForward: Vec3,
    deltaTime: number,
  ): void;

  // Policy Control
  sendPolicyAction(actions: Float32Array | number[]): boolean;
  switchGR00TPolicy(mode: GR00TPolicyMode): boolean;
  getGR00TPolicyMode(): GR00TPolicyMode | null;
  updateCameraEmbedding(embedding: Float32Array): void;

  // Safety
  emergencyStop(): void;
  resume(): void;

  // Getters
  getConnectionState(): TeleoperationConnectionState;
  getMetrics(): Readonly<TeleoperationHubMetrics>;
  getRobotState(): Readonly<RobotState>;
  getIKResults(): { left: IKSolveResult | null; right: IKSolveResult | null };
  getHapticState(): { left: number; right: number };
  isRunning(): boolean;
  isConnected(): boolean;

  // Events
  addEventListener(listener: TeleoperationEventListener): () => void;
}
```

### WebSocket Binary Protocol

| Byte Offset | Field | Size |
|-------------|-------|------|
| 0 | Message type (see `WsMessageType` enum) | 1 byte |
| 1-4 | Sequence number | 4 bytes |
| 5-8 | Timestamp (monotonic) | 4 bytes |
| 9+ | Payload | variable |

Message types:
- `0x01` JOINT_COMMAND: 37 joints * 4 bytes = 148 bytes payload
- `0x02` STATE_TELEMETRY: Full robot state
- `0x03` POLICY_ACTION: 256 floats = 1024 bytes (GR00T N1.6 action space)
- `0x04` CAMERA_FRAME: MJPEG/H.264 NAL unit
- `0x05` HEARTBEAT: Keepalive
- `0x06` EMERGENCY_STOP: Immediate halt
- `0x07` RESUME: Clear e-stop
- `0x08` ERROR: Error notification
- `0x09` CALIBRATE: Calibration request
- `0x0A` CALIBRATION_RESULT: Calibration response

### GR00T N1.6 Policy Integration

When `enableGR00TPolicy: true`, the hub creates a `GR00TN16PolicyClient` that:

1. Receives robot state updates and assembles observations at 30Hz
2. Sends 256-dimensional observation vectors to a WebSocket inference server
3. Receives 37-DOF action vectors with action chunking
4. Supports policy mode switching: `manipulation`, `navigation`, `bimanual`, `idle`

Policy merging with IK:
- **Navigation mode**: Policy controls legs and torso; IK controls arms
- **Manipulation/Bimanual mode**: IK controls arms; policy fills remaining joints

### Safety Boundary System

| Feature | Default |
|---------|---------|
| Workspace box | 0.8m x 0.8m x 0.6m centered at (0, 0.9, 0.3) |
| Soft margin (haptic warning) | 0.05m |
| Hard margin (motion blocked) | 0.01m |
| Max contact force | 100N |
| Max joint velocity | 5.0 rad/s |
| Haptic frequency | 200Hz |
| Boundary visualization | Enabled (red, 30% opacity) |

### Lifecycle

```
create() -> configure subsystems
connect() -> establish WebSocket to robot
start() -> begin processing loop
[per frame] update(handInputs) -> IK solve, safety check, send commands
stop() -> pause processing
disconnect() -> close WebSocket
destroy() -> release all resources
```

### Usage Example

```typescript
import { createTeleoperationHub } from './TeleoperationHub';

const hub = createTeleoperationHub({
  policyStream: { robotUrl: 'ws://robot.local:9090', commandRateHz: 60 },
  enableGR00TPolicy: true,
  safety: {
    boundaries: [{
      id: 'workspace',
      shape: 'box',
      center: { x: 0, y: 0.9, z: 0.3 },
      dimensions: { x: 0.8, y: 0.8, z: 0.6 },
      type: 'workspace',
      softMargin: 0.05,
      hardMargin: 0.01,
      active: true,
    }],
    enableHaptics: true,
    maxContactForce: 80,
  },
});

hub.addEventListener((event) => {
  if (event.type === 'emergency_stop') {
    showEmergencyStopUI();
  }
});

hub.connect();
hub.start();

// In VR render loop:
hub.update(leftHandInput, rightHandInput, headPos, headForward, dt);
const metrics = hub.getMetrics();
const haptics = hub.getHapticState();
```

---

## 6. Cross-Service Architecture

### Render Loop Budget (11.1ms at 90Hz)

| Service | Budget | How It Stays in Budget |
|---------|--------|----------------------|
| FoveatedGaussianRenderer | 8-12ms per stereo frame | 6-stage pipeline with adaptive quality degradation |
| InferenceScheduler | < 0.1ms per frame (read only) | Double-buffered front buffer read, inference runs at 1-5Hz off-loop |
| SpatialReasoningEngine | 200-1000ms per pass (off-loop) | Runs on InferenceScheduler's setInterval, never touches render thread |
| AgentCommunicationManager | < 0.1ms per frame (read only) | Double-buffered front buffer read, message processing at 30Hz off-loop |
| TeleoperationHub | ~1ms per frame | IK solve + safety check + rate-limited WebSocket send |

### Double-Buffer Pattern

Both `InferenceScheduler` and `AgentCommunicationManager` use `AgentStateBuffer<T>`:

```
Writer (off render loop)          Reader (on render loop)
        |                                  |
        v                                  v
  getBackBuffer() ---- swap() ----> getFrontBuffer()
        |                                  |
   mutate state                     read-only access
  (O(1) per write)                  (O(1) per read)
```

- `getFrontBuffer()`: O(1), zero allocation
- `getBackBuffer()`: O(1), zero allocation
- `swap()`: O(n) deep copy via `structuredClone`, called at low Hz (1-30Hz)
- Staleness detection via configurable threshold

### Service Dependency Graph

```
FoveatedGaussianRenderer
    (standalone - receives eye states from renderer)

InferenceScheduler
    |-- depends on --> SpatialReasoningProvider (interface)
    |-- uses --------> AgentStateBuffer<CachedSpatialState>
    |
    v
SpatialReasoningEngine (implements SpatialReasoningProvider)

AgentCommunicationManager
    |-- uses --> AgentStateBuffer<AgentWorldState>

TeleoperationHub
    |-- composes --> InverseKinematicsSolver
    |-- composes --> RobotPolicyStreamClient
    |-- composes --> RobotCameraOverlay
    |-- composes --> RobotTelemetryDisplay
    |-- composes --> SafetyBoundarySystem
    |-- composes --> GR00TN16PolicyClient (optional)
```

---

## 7. Common Patterns

### Factory Functions

Every service exports a `createXxx()` factory function as the recommended construction method:

```typescript
createFoveatedGaussianRenderer(config?)
createFoveatedGaussianRendererForDevice('quest3' | 'quest2' | 'pcvr' | 'desktop', config?)
createInferenceScheduler(provider, config?)
createSpatialReasoningEngine(config?)
createAgentCommunicationManager(config?)
createTeleoperationHub(config?)
```

### Configuration Pattern

All services accept a `Partial<XxxConfig>` with sensible defaults. Configuration types are fully documented with JSDoc and exported from their respective type modules.

### Lifecycle Pattern

```
create -> configure -> start -> [per-frame update] -> stop -> dispose/destroy
```

- `start()`: Begin processing loop / connect
- `stop()`: Pause processing (state preserved)
- `dispose()` / `destroy()`: Release all resources (irreversible)

### Metrics Pattern

All services expose a `getMetrics()` method returning a snapshot of operational metrics for debugging and performance monitoring.

### Event Pattern

- `FoveatedGaussianRenderer`: Node.js `EventEmitter` pattern (`on('event', handler)`)
- `TeleoperationHub`: `addEventListener(listener)` returning an unsubscribe function
- `AgentCommunicationManager`: Config callbacks (`onAgentConnected`, `onCommandQueued`, etc.)
- `InferenceScheduler`: Config callback (`onFrequencyChange`)
