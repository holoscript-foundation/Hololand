# Distributed Scene Graph for Multiplayer Composition Authoring

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [HoloScript Integration](#holoscript-integration)
  - [Marking Objects as Networked](#marking-objects-as-networked)
  - [Network Decorators](#network-decorators)
- [Ownership Transfer Protocol](#ownership-transfer-protocol)
  - [Authority Models](#authority-models)
  - [Requesting Authority](#requesting-authority)
  - [Transfer Examples](#transfer-examples)
- [State Synchronization Strategies](#state-synchronization-strategies)
  - [Full Sync (Tier 0)](#full-sync-tier-0)
  - [Delta Sync (Tier 1)](#delta-sync-tier-1)
  - [Batched Updates (Tier 2)](#batched-updates-tier-2)
  - [Event-Based (Tier 3)](#event-based-tier-3)
- [Conflict Resolution](#conflict-resolution)
  - [Simultaneous Edits](#simultaneous-edits)
  - [Conflict Strategies](#conflict-strategies)
- [Network Topology Options](#network-topology-options)
  - [Client-Server](#client-server)
  - [Peer-to-Peer](#peer-to-peer)
  - [Relay (Hybrid)](#relay-hybrid)
- [Bandwidth Optimization](#bandwidth-optimization)
  - [Spatial Prioritization](#spatial-prioritization)
  - [Interest Management](#interest-management)
  - [Compression Techniques](#compression-techniques)
- [Code Examples](#code-examples)
  - [Multiplayer Puzzle Game](#multiplayer-puzzle-game)
  - [Collaborative 3D Modeling](#collaborative-3d-modeling)
  - [Shared VR Training](#shared-vr-training)
- [API Reference](#api-reference)
  - [DistributedSceneGraphOrchestrator](#distributedscenegraphorchestrator)
  - [NetworkManager](#networkmanager)
  - [TieredStateSync](#tieredstatesync)
  - [StateAuthority](#stateauthority)
- [Performance Considerations](#performance-considerations)
- [Best Practices](#best-practices)

---

## Overview

The **Distributed Scene Graph Orchestrator** is HoloLand's multiplayer synchronization system that enables real-time collaboration in VR/AR environments. It provides a unified API for networked scene composition with support for:

- **Multi-agent scene graph building**: Each client independently builds a local 3D semantic scene graph
- **Training-free alignment merging**: Graphs are merged into a global representation without machine learning
- **Tiered consistency models**: Different objects sync at different rates (90Hz for physics, 10Hz for NPCs, etc.)
- **Ownership transfer protocols**: Interactive objects can transfer control between clients
- **Bandwidth optimization**: Spatial prioritization and delta encoding keep bandwidth under 50KB/s per client

### Design Goals

1. **90Hz VR Performance**: Support 200 entities at 90fps without frame drops
2. **Low Bandwidth**: Maintain <50KB/s per client for 200 entities
3. **Flexible Authority**: Support server-authoritative, client-authoritative, and hybrid models
4. **Easy Authoring**: Simple HoloScript decorators (`@networked`, `@synced`) for multiplayer compositions

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    HoloScript Composition                       │
│  (@networked objects, @synced state, authority declarations)   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           DistributedSceneGraphOrchestrator                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Agent Local  │  │ Training-Free│  │ Spatial Relation   │   │
│  │ Graph Builder│─▶│ Alignment    │─▶│ Extractor          │   │
│  │              │  │ Merger       │  │                    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NetworkManager                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Tiered State │  │ Server       │  │ Client Prediction  │   │
│  │ Sync         │  │ Authority    │  │                    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Transport Layer                              │
│            (WebRTC, WebSockets, or Relay Server)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Component Hierarchy

#### 1. DistributedSceneGraphOrchestrator

Top-level orchestrator that connects MA3DSG-inspired modules:

- **AgentLocalGraphBuilder**: Per-agent local graph construction from observations
- **TrainingFreeAlignmentMerger**: Training-free graph alignment and merging
- **SpatialRelationshipExtractor**: Relationship extraction from merged global graph

**Key Responsibilities**:
- Accept `ObjectSnapshot[]` from the scene (same format as SpatialReasoningEngine)
- Run on Tier 1 (1-5Hz) via InferenceScheduler
- Produce `SpatialRelationship[]` and `SpatialRegion[]` for CachedSpatialState
- Implement `SpatialReasoningProvider` interface for drop-in compatibility

**Multi-Agent Flow**:
1. Each agent submits observations via `submitObservations(agentId, snapshots)`
2. Orchestrator routes observations to per-agent `LocalGraphBuilder`
3. On `infer()`, all local graphs are merged into global graph
4. Spatial relationships extracted and written to `CachedSpatialState`

#### 2. NetworkManager

High-level network manager that ties together `TieredStateSync` with transport, connection management, and bandwidth monitoring.

**Key Responsibilities**:
- Manage client connections and session lifecycle
- Register networked entities with consistency tiers
- Process network ticks at configurable rate (default 60Hz)
- Monitor bandwidth usage and latency per client
- Emit network events (`client_connected`, `entity_registered`, etc.)

**Design Targets**:
- Support up to 32 clients per session
- Handle 200 entities at 90fps VR rendering
- Keep bandwidth under 50KB/s per client

#### 3. TieredStateSync

Orchestrates the 4-tier consistency model for multiplayer state synchronization.

**Tier Definitions**:
- **Tier 0 (Strict)**: Full server validation each tick — physics, collision (90Hz)
- **Tier 1 (Eventual)**: Optimistic local + eventual reconciliation — player movement (30-60Hz)
- **Tier 2 (Relaxed)**: Batched updates — NPC animations, decorations (10Hz)
- **Tier 3 (Cosmetic)**: Best-effort multicast — particles, effects (1-5Hz)

**Key Responsibilities**:
- Coordinate `ServerAuthority`, `ConsistencyTierManager`, and `ClientPrediction`
- Batch state entries by tier based on update frequency
- Reconcile predicted entities with authoritative server state
- Track tick durations and prediction accuracy

#### 4. StateAuthority

Centralized authority management for networked entities. Determines who controls each object and resolves ownership conflicts.

**Authority Models**:
- **Server**: Host/server always has final authority (most secure)
- **Owner**: The spawning client owns the entity until transfer
- **Shared**: Any client can claim authority (grab-to-own pattern)

**Conflict Resolution**:
When two clients simultaneously claim the same object, authority uses a priority system:
`existing_owner > earlier_timestamp > lower_peer_id`

---

## HoloScript Integration

### Marking Objects as Networked

Use the `@networked` decorator to mark objects, state, or entire spatial groups for network synchronization.

#### Basic Example

```holoscript
composition "Multiplayer Room" {

  // Networked state — synchronized across all clients
  state {
    @networked
    room_name: "Lobby"
    player_count: 0

    @synced
    chat_messages: []
  }

  // Networked object — position and state synchronized
  object "SharedCube" {
    @networked
    type: "box"
    position: [0, 1, 0]
    color: "#6366f1"

    @interactive
    on_grab: transfer_authority_to_grabber
  }

  // Local-only object — not synchronized (HUD, UI)
  object "LocalUI" {
    @local_only
    type: "ui-panel"
    position: "attached_to_player"
  }
}
```

### Network Decorators

| Decorator | Scope | Behavior |
|-----------|-------|----------|
| `@networked` | Object, State, Group | Full object/state synchronization (position, rotation, scale, properties) |
| `@synced` | State, Action | State variable or action synchronized across all clients |
| `@local_only` | Object, State | Never synchronized — client-local only (UI, camera, audio) |
| `@server_authority` | Object | Server owns this object; clients send inputs, server sends authoritative state |
| `@owner_authority` | Object | Object owner (spawner) has authority; others receive updates |
| `@shared_authority` | Object | Any client can claim authority (grab-to-own pattern) |
| `@interactive` | Object | Object supports ownership transfer via interaction (grab, click) |

#### Advanced Example

```holoscript
composition "Collaborative Whiteboard" {

  // Server-authoritative shared canvas
  object "Canvas" {
    @networked
    @server_authority
    type: "plane"
    size: [5, 3]
    material: "whiteboard"

    state {
      @synced
      strokes: []  // Drawing strokes from all clients
    }
  }

  // Shared-authority markers (grab-to-own)
  for i in range(8) {
    object "Marker_${i}" {
      @networked
      @shared_authority
      @interactive

      type: "cylinder"
      size: [0.02, 0.15, 0.02]
      position: [i * 0.3 - 1.2, 1.5, 0.5]
      color: hsl(i * 45, 70, 60)

      on_grab: (player) => claim_authority(player)
      on_release: (player) => release_authority()
    }
  }

  // Owner-authority player avatars
  template "PlayerAvatar" {
    @networked
    @owner_authority

    state {
      player_id: null
      display_name: "Player"
      head_position: [0, 1.7, 0]
      hand_l_position: [0, 0, 0]
      hand_r_position: [0, 0, 0]
    }

    object "Head" {
      type: "sphere"
      size: [0.2, 0.2, 0.2]
      position: state.head_position
    }
  }
}
```

---

## Ownership Transfer Protocol

### Authority Models

HoloLand supports three authority models for networked objects:

#### 1. Server Authoritative

**Use Case**: Secure gameplay objects (health, inventory, game state)

**Behavior**:
- Server owns the object permanently
- Clients send inputs to server
- Server validates inputs and sends authoritative state updates
- Highest security, higher latency

**Example**:
```holoscript
object "PlayerHealth" {
  @networked
  @server_authority

  state {
    current_hp: 100
    max_hp: 100
  }

  action take_damage(amount) {
    // Client sends input, server validates
    network.send_input("take_damage", { entity_id: this.id, amount })
  }
}
```

#### 2. Owner Authoritative

**Use Case**: Player-owned objects (avatars, personal items)

**Behavior**:
- Object creator (spawner) owns the object
- Owner sends state updates directly to other clients
- No server validation (optimistic)
- Low latency, moderate security

**Example**:
```holoscript
object "PlayerAvatar" {
  @networked
  @owner_authority

  state {
    position: [0, 0, 0]
    rotation: [0, 0, 0]
  }

  update(dt) {
    // Owner updates position locally, broadcasts to others
    this.position = player.head_position
  }
}
```

#### 3. Shared Authoritative (Grab-to-Own)

**Use Case**: Interactive shared objects (whiteboards, tools, puzzle pieces)

**Behavior**:
- Any client can request authority
- Authority transferred on grab/interaction
- Conflicts resolved by priority system
- Medium latency, good for collaboration

**Example**:
```holoscript
object "PuzzlePiece" {
  @networked
  @shared_authority
  @interactive

  state {
    grabbed_by: null
    position: [0, 0, 0]
  }

  on_grab: (player_id) => {
    network.request_authority(this.id, player_id)
  }

  on_release: () => {
    network.release_authority(this.id)
  }
}
```

### Requesting Authority

Use the network API to request, transfer, or release authority.

#### API Methods

```typescript
// Request authority over an entity
network.requestAuthority(entityId: string, peerId: string, priority?: number): boolean

// Release authority (make object unowned)
network.releaseAuthority(entityId: string): void

// Transfer authority to specific peer
network.transferAuthority(entityId: string, fromPeer: string, toPeer: string): boolean

// Check current owner
network.getOwner(entityId: string): string | null

// Lock/unlock to prevent transfers
network.lockAuthority(entityId: string): void
network.unlockAuthority(entityId: string): void
```

#### Priority System

When multiple clients request authority simultaneously:

1. **Existing owner retains** (if currently owned)
2. **Earlier timestamp wins** (who clicked first)
3. **Lower peer ID wins** (tiebreaker)

Priority can be overridden by passing a higher `priority` value:

```holoscript
// Normal priority (1)
network.request_authority("puzzle_piece_1", player_id)

// High priority (10) — host overriding normal grab
network.request_authority("puzzle_piece_1", host_id, 10)
```

### Transfer Examples

#### Example 1: Grab-to-Own Tool

```holoscript
object "Hammer" {
  @networked
  @shared_authority
  @interactive

  state {
    held_by: null
    position: [0, 1, 0]
  }

  on_grab: (player_id) => {
    if network.request_authority(this.id, player_id) {
      state.held_by = player_id
      attach_to_player_hand(player_id)
    } else {
      show_notification("Hammer is currently in use")
    }
  }

  on_release: () => {
    network.release_authority(this.id)
    state.held_by = null
    detach_from_player()
  }
}
```

#### Example 2: Turn-Based Game Piece

```holoscript
object "ChessPiece" {
  @networked
  @server_authority  // Server validates legal moves

  state {
    position: [0, 0, 0]
    current_turn: null
  }

  on_click: (player_id) => {
    if player_id == state.current_turn {
      network.send_input("request_move", {
        entity_id: this.id,
        player_id,
        new_position: get_target_square()
      })
    } else {
      show_notification("Not your turn!")
    }
  }

  on_move_validated: (new_pos) => {
    // Server sends authoritative move
    animate_to(new_pos, duration: 0.5)
  }
}
```

#### Example 3: Host-Override Authority

```holoscript
composition "Meeting Room" {

  state {
    @networked
    host_id: null
    presentation_mode: false
  }

  object "Presentation Screen" {
    @networked
    @owner_authority  // Normally owned by presenter

    state {
      current_slide: 0
      locked: false
    }

    on_next_slide: (player_id) => {
      if player_id == network.get_owner(this.id) || player_id == state.host_id {
        state.current_slide += 1
      }
    }

    // Host can take over presentation
    action host_take_over() {
      if local_player.id == state.host_id {
        network.transfer_authority(this.id, network.get_owner(this.id), state.host_id)
      }
    }
  }
}
```

---

## State Synchronization Strategies

HoloLand's **Tiered State Sync** system allows different objects to synchronize at different rates and with different strategies. This enables 200 entities at 90fps VR while staying under 50KB/s bandwidth.

### Full Sync (Tier 0)

**Use Case**: Critical gameplay objects requiring strict consistency (physics, collision, health)

**Sync Strategy**: Full server validation each network tick (60-90Hz)

**Characteristics**:
- Server authoritative by default
- Complete state sent every tick (no delta compression)
- Highest bandwidth cost (~512 bytes/entity/tick)
- Used for <20 critical entities

**Example**:
```holoscript
object "PhysicsBall" {
  @networked
  @server_authority
  @tier(0)  // Strict consistency

  state {
    position: [0, 5, 0]
    velocity: [0, 0, 0]
    angular_velocity: [0, 0, 0]
  }

  @physics {
    mass: 1.0
    friction: 0.5
    restitution: 0.8
  }

  update(dt) {
    // Server runs physics simulation
    apply_gravity(dt)
    apply_collisions(dt)
    // State broadcast to all clients at 60Hz
  }
}
```

**Bandwidth Cost**: 20 entities × 512 bytes × 60Hz = 614 KB/s

### Delta Sync (Tier 1)

**Use Case**: Interactive objects with frequent updates (player movement, interactive tools)

**Sync Strategy**: Optimistic local prediction + eventual reconciliation (30-60Hz)

**Characteristics**:
- Client predicts movement locally (instant feedback)
- Server sends corrections when prediction diverges
- Only changed properties sent (delta encoding)
- Moderate bandwidth (~128 bytes/entity when moving)
- Used for 20-50 interactive entities

**Example**:
```holoscript
object "PlayerController" {
  @networked
  @owner_authority
  @tier(1)  // Eventual consistency with prediction

  state {
    position: [0, 1.7, 0]
    velocity: [0, 0, 0]
    input_sequence: 0
  }

  update(dt) {
    // Client predicts movement immediately
    local_position = predict_movement(input, dt)

    // Send input to server
    network.send_input({
      sequence: state.input_sequence++,
      input: get_player_input(),
      timestamp: now()
    })
  }

  on_server_correction(authoritative_state) {
    // Reconcile if prediction diverged
    if distance(local_position, authoritative_state.position) > 0.1 {
      interpolate_to(authoritative_state.position, duration: 0.1)
    }
  }
}
```

**Bandwidth Cost**: 50 entities × 128 bytes × 30Hz = 192 KB/s (when moving)

### Batched Updates (Tier 2)

**Use Case**: Non-critical ambient objects (NPCs, decorations, distant players)

**Sync Strategy**: Batched updates at low frequency (5-10Hz)

**Characteristics**:
- Updates grouped and sent in batches
- Server sends state snapshots at fixed intervals
- Interpolation on client for smooth visuals
- Low bandwidth (~64 bytes/entity/update)
- Used for 50-100 entities

**Example**:
```holoscript
object "AmbientNPC" {
  @networked
  @server_authority
  @tier(2)  // Relaxed consistency

  state {
    position: [0, 0, 0]
    animation_state: "idle"
    target_waypoint: 0
  }

  update(dt) {
    // Server updates NPC AI at 60Hz
    update_ai(dt)

    // But only broadcasts state at 10Hz
    // Client interpolates between received snapshots
  }

  on_state_update(new_state) {
    // Interpolate smoothly from current to new state
    interpolate({
      position: new_state.position,
      animation_state: new_state.animation_state
    }, duration: 0.1)  // 100ms interpolation window
  }
}
```

**Bandwidth Cost**: 100 entities × 64 bytes × 10Hz = 64 KB/s

### Event-Based (Tier 3)

**Use Case**: Cosmetic, infrequent events (particles, sound effects, notifications)

**Sync Strategy**: Best-effort multicast on events (1-5Hz or on-trigger)

**Characteristics**:
- Only sent when event occurs (spawn, trigger, etc.)
- No guaranteed delivery (UDP-like)
- Minimal bandwidth (~32 bytes/event)
- Used for 30+ cosmetic entities

**Example**:
```holoscript
object "ParticleEmitter" {
  @networked
  @tier(3)  // Cosmetic, best-effort

  state {
    active: false
    particle_count: 100
  }

  action trigger_explosion() {
    // Send event to all clients (no ack required)
    network.broadcast_event("explosion", {
      entity_id: this.id,
      position: this.position,
      intensity: 1.0
    })
  }

  on_event_received(event) {
    if event.type == "explosion" {
      play_particle_effect("explosion", event.position, event.intensity)
      play_sound("explosion", event.position)
    }
  }
}
```

**Bandwidth Cost**: 30 entities × 32 bytes × 2Hz = 1.92 KB/s

### Total Bandwidth Budget

| Tier | Entities | Frequency | Bytes/Entity | Total Bandwidth |
|------|----------|-----------|--------------|-----------------|
| 0 (Strict) | 20 | 60Hz | 512 | 614 KB/s |
| 1 (Eventual) | 50 | 30Hz | 128 | 192 KB/s |
| 2 (Relaxed) | 100 | 10Hz | 64 | 64 KB/s |
| 3 (Cosmetic) | 30 | 2Hz | 32 | 1.92 KB/s |
| **Total** | **200** | — | — | **~872 KB/s** |

With spatial prioritization and delta encoding, actual bandwidth is ~400-500 KB/s for 200 entities, divided across 8-32 clients = **~50 KB/s per client**.

---

## Conflict Resolution

### Simultaneous Edits

When two or more clients edit the same networked object simultaneously, conflicts must be resolved. HoloLand provides multiple strategies depending on the authority model.

#### Scenario 1: Two Clients Grab Same Object

```holoscript
object "SharedTool" {
  @networked
  @shared_authority

  on_grab: (player_id) => {
    // Both Client A and Client B send grab request at same time
    network.request_authority(this.id, player_id)
  }
}
```

**Resolution** (Priority Strategy):
1. Check if object already owned → existing owner retains
2. Compare timestamps → earlier request wins
3. Tiebreaker → lower peer ID wins

**Outcome**: Client A gets authority, Client B receives `authority_denied` event

#### Scenario 2: Simultaneous Whiteboard Strokes

```holoscript
object "Whiteboard" {
  @networked
  @server_authority

  state {
    @synced
    strokes: []
  }

  action add_stroke(stroke_data) {
    // Both clients draw simultaneously
    network.send_input("add_stroke", stroke_data)
  }
}
```

**Resolution** (Server Authority):
1. Server receives both stroke inputs
2. Server validates and orders by server timestamp
3. Server broadcasts ordered strokes to all clients
4. Clients render strokes in server-defined order

**Outcome**: Both strokes appear, ordered by server reception time

#### Scenario 3: Conflicting Property Edits

```holoscript
object "Slider" {
  @networked
  @shared_authority

  state {
    value: 0.5
  }

  on_slide: (new_value) => {
    // Client A sets value to 0.7
    // Client B sets value to 0.3
    // Which wins?
  }
}
```

**Resolution** (Last-Write-Wins):
1. Both clients broadcast state update
2. Each update has a lamport timestamp
3. Update with higher timestamp wins
4. Losing client reconciles to winning state

**Outcome**: If Client B's update arrives last, value becomes 0.3

### Conflict Strategies

HoloLand supports three conflict resolution strategies, configurable per entity:

#### 1. Priority (Default)

**How it works**: Conflict resolved by owner priority → timestamp → peer ID

**Use case**: Interactive grab-to-own objects

**Configuration**:
```typescript
StateAuthority.register(entityId, ownerId, {
  mode: 'shared',
  conflictStrategy: 'priority'
});
```

**Example**:
```holoscript
object "PuzzlePiece" {
  @networked
  @shared_authority
  @conflict_strategy("priority")

  // Existing owner always wins over new claim
  // If no owner, first grabber wins
}
```

#### 2. First Wins

**How it works**: First claim to arrive at server wins, subsequent claims denied

**Use case**: Limited-resource objects (single-seat vehicle, unique item)

**Configuration**:
```typescript
StateAuthority.register(entityId, null, {
  mode: 'shared',
  conflictStrategy: 'first_wins'
});
```

**Example**:
```holoscript
object "DriverSeat" {
  @networked
  @shared_authority
  @conflict_strategy("first_wins")

  on_sit: (player_id) => {
    // Only first player to click can sit
    // Others receive "seat occupied" message
  }
}
```

#### 3. Host Wins

**How it works**: Host/server always wins conflicts, regardless of timestamp

**Use case**: Moderated sessions, admin control

**Configuration**:
```typescript
StateAuthority.register(entityId, null, {
  mode: 'shared',
  conflictStrategy: 'host_wins',
  hostPeerId: 'host-peer-id'
});
```

**Example**:
```holoscript
composition "Classroom" {

  state {
    @networked
    host_id: "teacher-123"
  }

  object "PresentationScreen" {
    @networked
    @shared_authority
    @conflict_strategy("host_wins")

    on_slide_change: (player_id, slide) => {
      // Teacher can always override student's slide changes
    }
  }
}
```

### Handling Conflicts in HoloScript

#### Listen for Authority Events

```holoscript
object "InteractiveTool" {
  @networked
  @shared_authority

  on_authority_granted: (player_id) => {
    if player_id == local_player.id {
      show_notification("You are now controlling the tool")
      enable_controls()
    } else {
      show_notification("${player_id} is now controlling the tool")
      disable_controls()
    }
  }

  on_authority_denied: (player_id, reason) => {
    if player_id == local_player.id {
      show_notification("Cannot grab tool: ${reason}")
      play_feedback_sound("denied")
    }
  }

  on_authority_conflict: (claimants) => {
    // Multiple clients tried to grab simultaneously
    log("Authority conflict between: ${claimants.join(', ')}")
  }
}
```

#### Graceful Degradation

```holoscript
object "SharedDocument" {
  @networked
  @server_authority

  state {
    @synced
    content: ""
    locked_by: null
  }

  action request_edit() {
    if state.locked_by != null {
      // Document locked by another user
      show_notification("Document is being edited by ${state.locked_by}")
      enable_read_only_mode()
    } else {
      network.send_input("request_lock", { player_id: local_player.id })
    }
  }

  on_lock_granted: (player_id) => {
    if player_id == local_player.id {
      state.locked_by = player_id
      enable_edit_mode()
    }
  }

  on_lock_timeout: () => {
    // Auto-release lock after 30s of inactivity
    state.locked_by = null
  }
}
```

---

## Network Topology Options

HoloLand supports three network topologies for multiplayer sessions. The choice depends on your use case (security, latency, player count).

### Client-Server

**Architecture**: All clients connect to a central authoritative server

```
     ┌─────────┐
     │ Server  │
     │(Auth)   │
     └────┬────┘
          │
    ┌─────┼─────┬─────┐
    │     │     │     │
┌───▼─┐ ┌─▼──┐ ┌▼───┐ ┌▼───┐
│Cli 1│ │Cli2│ │Cli3│ │Cli4│
└─────┘ └────┘ └────┘ └────┘
```

**Use Case**: Secure gameplay, large player counts (8-100 players)

**Pros**:
- Server validates all actions (cheat-proof)
- Centralized state (no sync conflicts)
- Scales to 100+ players with dedicated server

**Cons**:
- Higher latency (client → server → client round-trip)
- Requires dedicated server infrastructure
- Server is single point of failure

**HoloScript Configuration**:
```holoscript
composition "Multiplayer Game" {

  network_config {
    topology: "client_server"
    server_url: "wss://game-server.hololand.io"
    max_clients: 32
    tick_rate: 60  // Server tick rate in Hz
  }

  object "GameState" {
    @networked
    @server_authority

    state {
      score: 0
      round: 1
      time_remaining: 300
    }
  }
}
```

**TypeScript Setup**:
```typescript
import { NetworkManager } from '@hololand/networking';

const network = new NetworkManager({
  maxClients: 32,
  networkTickRateHz: 60,
  serverConfig: {
    authorityMode: 'server',
    validateAllInputs: true
  }
});

network.start();
```

### Peer-to-Peer

**Architecture**: Direct connections between clients (no central server)

```
┌─────┐      ┌─────┐
│Cli 1│◄────►│Cli 2│
└──┬──┘      └──┬──┘
   │ ╲        ╱ │
   │  ╲      ╱  │
   │   ╲    ╱   │
   │    ╲  ╱    │
   │     ╳╱     │
   │    ╱ ╲     │
   │   ╱   ╲    │
┌──▼──┐    ┌──▼──┐
│Cli 3│◄──►│Cli 4│
└─────┘    └─────┘
```

**Use Case**: Low-latency collaboration, small groups (2-8 players)

**Pros**:
- Lowest latency (direct peer connections)
- No server infrastructure needed
- Best for local co-op or small trusted groups

**Cons**:
- Limited player count (mesh topology scales O(n²))
- No central authority (vulnerable to cheating)
- NAT traversal can be complex

**HoloScript Configuration**:
```holoscript
composition "Co-op Puzzle" {

  network_config {
    topology: "peer_to_peer"
    max_peers: 4
    signaling_server: "wss://signaling.hololand.io"  // For WebRTC negotiation
    ice_servers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  }

  object "PuzzleState" {
    @networked
    @owner_authority  // First player owns the state

    state {
      pieces_placed: []
      completed: false
    }
  }
}
```

**TypeScript Setup**:
```typescript
import { NetworkManager } from '@hololand/networking';
import { WebRTCTransport } from '@hololand/network/transports';

const network = new NetworkManager({
  maxClients: 4,
  transport: new WebRTCTransport({
    signalingServer: 'wss://signaling.hololand.io',
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  })
});

network.start();
```

### Relay (Hybrid)

**Architecture**: Clients connect via a relay server (forwarding messages), but server doesn't validate state

```
     ┌─────────┐
     │ Relay   │
     │(Forward)│
     └────┬────┘
          │
    ┌─────┼─────┬─────┐
    │     │     │     │
┌───▼─┐ ┌─▼──┐ ┌▼───┐ ┌▼───┐
│Cli 1│ │Cli2│ │Cli3│ │Cli4│
│(Auth)│ │    │ │    │ │    │
└─────┘ └────┘ └────┘ └────┘
```

**Use Case**: Mid-sized groups with NAT issues (4-16 players)

**Pros**:
- Better latency than client-server (relay doesn't validate)
- Scales better than P2P (relay handles NAT traversal)
- Good balance for semi-trusted groups

**Cons**:
- Requires relay server infrastructure (but lightweight)
- Less secure than full server authority
- One client is "host" with authority

**HoloScript Configuration**:
```holoscript
composition "Social Hangout" {

  network_config {
    topology: "relay"
    relay_url: "wss://relay.hololand.io"
    max_clients: 16
    host_authority: true  // Host client has authority
  }

  object "RoomSettings" {
    @networked
    @owner_authority  // Host owns room settings

    state {
      theme: "cyber"
      music_volume: 0.5
      locked: false
    }
  }

  object "PlayerAvatar" {
    @networked
    @owner_authority  // Each player owns their avatar

    state {
      position: [0, 0, 0]
      animation: "idle"
    }
  }
}
```

**TypeScript Setup**:
```typescript
import { NetworkManager } from '@hololand/networking';
import { RelayTransport } from '@hololand/network/transports';

const network = new NetworkManager({
  maxClients: 16,
  transport: new RelayTransport({
    relayUrl: 'wss://relay.hololand.io',
    hostAuthority: true
  })
});

network.start();
```

### Topology Comparison Table

| Feature | Client-Server | Peer-to-Peer | Relay |
|---------|---------------|--------------|-------|
| **Max Players** | 100+ | 2-8 | 4-16 |
| **Latency** | High (2× RTT) | Low (1× RTT) | Medium (1.5× RTT) |
| **Security** | High | Low | Medium |
| **Infrastructure** | Dedicated server | None (signaling only) | Lightweight relay |
| **Bandwidth (server)** | High | None | Medium |
| **Cheat Protection** | Excellent | None | Limited (host only) |
| **NAT Traversal** | Easy | Hard | Easy |
| **Best For** | Competitive games | Local co-op | Social hangouts |

---

## Bandwidth Optimization

HoloLand uses several techniques to keep bandwidth under 50KB/s per client while supporting 200 entities.

### Spatial Prioritization

Objects are prioritized by distance from the local player. Closer objects sync more frequently and with higher precision.

#### Distance-Based Update Frequency

```holoscript
object "DistantNPC" {
  @networked
  @server_authority
  @spatial_priority  // Enable distance-based prioritization

  state {
    position: [100, 0, 100]  // Far from player
  }

  // Automatically downgraded to Tier 2 (10Hz) when >50m away
  // Upgraded to Tier 1 (30Hz) when <20m away
  // Upgraded to Tier 0 (60Hz) when <5m away (if interacting)
}
```

**Implementation**:
```typescript
// BandwidthAllocator dynamically adjusts tiers based on distance
import { BandwidthAllocator } from '@hololand/networking/spatial';

const allocator = new BandwidthAllocator({
  bandwidthBudget: 50_000,  // 50 KB/s
  tiers: [
    { distance: 5, updateHz: 60, bytes: 512 },   // Close
    { distance: 20, updateHz: 30, bytes: 128 },  // Medium
    { distance: 50, updateHz: 10, bytes: 64 },   // Far
    { distance: Infinity, updateHz: 2, bytes: 32 } // Very far
  ]
});

// Automatically adjusts entity tiers based on player position
allocator.updateSpatialPriorities(playerPosition, entities);
```

#### Frustum Culling

Objects outside the player's view frustum are synced at lower frequency or not at all.

```holoscript
object "BehindPlayer" {
  @networked
  @frustum_culling  // Only sync when in view

  // Update frequency:
  // - In frustum: Tier 1 (30Hz)
  // - Out of frustum: Tier 3 (2Hz) or paused
}
```

**Savings**: 40-60% bandwidth reduction in typical VR scenes

### Interest Management

Divide the world into zones; clients only receive updates for zones they're in or nearby.

#### Zone-Based Sync

```holoscript
composition "Large World" {

  spatial_zone "Zone_A" {
    bounds: { min: [0, 0, 0], max: [100, 10, 100] }

    @zone_sync  // Only sync to players in or near this zone

    object "ZoneObject_1" {
      @networked
      position: [50, 0, 50]
    }
  }

  spatial_zone "Zone_B" {
    bounds: { min: [100, 0, 0], max: [200, 10, 100] }

    @zone_sync

    object "ZoneObject_2" {
      @networked
      position: [150, 0, 50]
    }
  }
}
```

**TypeScript API**:
```typescript
// InterestManager tracks which zones each client subscribes to
import { InterestManager } from '@hololand/networking/spatial';

const interest = new InterestManager();

// Subscribe client to zone
interest.subscribe(clientId, 'Zone_A');

// Client automatically receives:
// - All entities in Zone_A
// - Entities in adjacent zones (configurable radius)
// - No entities from distant zones

// Auto-subscribe based on position
interest.autoSubscribe(clientId, playerPosition, subscriptionRadius: 150);
```

**Savings**: 70-90% bandwidth reduction for large open worlds

#### Entity Streaming

Load/unload entities dynamically as players move through the world.

```holoscript
object "StreamedBuilding" {
  @networked
  @stream_range(100)  // Load when within 100m, unload when >120m

  on_stream_in: () => {
    load_geometry()
    register_to_network()
  }

  on_stream_out: () => {
    unregister_from_network()
    unload_geometry()
  }
}
```

### Compression Techniques

#### Delta Encoding

Only send changed properties, not full state snapshots.

**Full State** (512 bytes):
```json
{
  "entityId": "player-123",
  "position": [1.234, 5.678, 9.012],
  "rotation": [0.1, 0.2, 0.3, 0.9],
  "velocity": [0.5, 0.0, 0.3],
  "health": 87,
  "animation": "running",
  "equipped_item": "sword_01",
  ...
}
```

**Delta Update** (64 bytes):
```json
{
  "entityId": "player-123",
  "position": [1.234, 5.678, 9.012],
  "velocity": [0.5, 0.0, 0.3]
}
```

**Savings**: 87% smaller for typical movement updates

#### Quantization

Reduce precision of floating-point values to save bytes.

```holoscript
object "Player" {
  @networked
  @quantize {
    position: 0.01,   // 1cm precision (16-bit instead of 32-bit per axis)
    rotation: 0.001,  // ~0.05° precision
    velocity: 0.1     // 10cm/s precision
  }

  state {
    position: [0, 0, 0]
    rotation: [0, 0, 0, 1]
    velocity: [0, 0, 0]
  }
}
```

**Savings**:
- Position: 12 bytes → 6 bytes (50% reduction)
- Rotation (quaternion): 16 bytes → 8 bytes (50% reduction)
- Full entity: ~100 bytes → ~50 bytes (50% reduction)

#### Binary Encoding

Use binary protocols (MessagePack, Protobuf) instead of JSON.

**JSON** (156 bytes):
```json
{"entityId":"player-123","position":[1.234,5.678,9.012],"rotation":[0.1,0.2,0.3,0.9],"health":87}
```

**MessagePack** (48 bytes):
```
Binary representation (not human-readable)
```

**Savings**: 69% smaller

**TypeScript Configuration**:
```typescript
import { NetworkManager } from '@hololand/networking';
import { MessagePackSerializer } from '@hololand/network/serializers';

const network = new NetworkManager({
  serializer: new MessagePackSerializer(),  // Use binary instead of JSON
  compression: 'lz4'  // Optional additional compression
});
```

#### State Diffing

Track changed properties and only send diffs.

```typescript
// Example: Only position changed
const previousState = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  health: 100
};

const currentState = {
  position: [1, 0, 0],  // CHANGED
  rotation: [0, 0, 0, 1],
  health: 100
};

// Send only diff:
const diff = { position: [1, 0, 0] };  // 12 bytes instead of 28 bytes
```

### Bandwidth Budget Allocation

Example allocation for 200 entities at 50 KB/s per client:

| Category | Entities | Tier | Hz | Bytes/Entity | Total/s |
|----------|----------|------|----|--------------| --------|
| Player avatar (self) | 1 | 0 | 90 | 64 (delta) | 5.7 KB |
| Nearby players (3) | 3 | 1 | 60 | 64 (delta) | 11.5 KB |
| Interactive objects (10) | 10 | 1 | 30 | 48 (delta) | 14.4 KB |
| Visible NPCs (20) | 20 | 2 | 10 | 32 (quantized) | 6.4 KB |
| Zone objects (100) | 100 | 2 | 5 | 24 (compressed) | 12 KB |
| Distant objects (66) | 66 | 3 | 1 | 16 (minimal) | 1 KB |
| **Total** | **200** | — | — | — | **~51 KB/s** |

**Additional Optimizations**:
- Frustum culling: -20% (40.8 KB/s)
- Interest management (zones): -30% (35.7 KB/s)
- Binary encoding: -40% (30.6 KB/s)
- **Final**: ~30 KB/s per client

---

## Code Examples

### Multiplayer Puzzle Game

A collaborative puzzle where players work together to arrange colored blocks.

```holoscript
composition "Multiplayer Puzzle" {

  network_config {
    topology: "relay"
    max_clients: 4
    relay_url: "wss://relay.hololand.io"
  }

  environment {
    skybox: "space"
    ambient_light: 0.6
  }

  // ═══════════════════════════════════════════════════════════
  // NETWORKED STATE
  // ═══════════════════════════════════════════════════════════

  state {
    @networked
    puzzle_solved: false
    pieces_placed: []

    @local_only
    local_player_id: uuid()
  }

  // ═══════════════════════════════════════════════════════════
  // PUZZLE GRID
  // ═══════════════════════════════════════════════════════════

  spatial_group "PuzzleGrid" {
    position: [0, 1, 0]

    for row in range(3) {
      for col in range(3) {
        object "GridSlot_${row}_${col}" {
          type: "plane"
          position: [col - 1, 0, row - 1]
          size: [0.9, 0.9]
          color: "#1a1a2e"

          state {
            target_color: get_target_color(row, col)
            occupied_by: null
          }

          @snap_zone {
            accepts: "PuzzlePiece"
            on_snap: (piece) => check_placement(row, col, piece)
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PUZZLE PIECES (Networked, Shared Authority)
  // ═══════════════════════════════════════════════════════════

  spatial_group "PuzzlePieces" {
    position: [-3, 1.5, 0]

    for i in range(9) {
      object "Piece_${i}" {
        @networked
        @shared_authority
        @interactive
        @tier(1)  // Eventual consistency

        type: "box"
        size: [0.8, 0.8, 0.1]
        position: [(i % 3) - 1, floor(i / 3), 0]
        color: get_piece_color(i)

        state {
          grabbed_by: null
          placed_in_slot: null
          original_position: this.position
        }

        on_grab: (player_id) => {
          if network.request_authority(this.id, player_id) {
            state.grabbed_by = player_id
            play_sound("grab")
          } else {
            show_notification("Piece is held by another player")
          }
        }

        on_release: (player_id) => {
          // Check if released over a grid slot
          nearest_slot = find_nearest_snap_zone(this.position)

          if nearest_slot && distance(this.position, nearest_slot.position) < 0.5 {
            snap_to(nearest_slot)
            network.broadcast_event("piece_placed", {
              piece_id: this.id,
              slot_id: nearest_slot.id
            })
          } else {
            // Return to original position
            animate {
              position: state.original_position
              duration: 0.5
              easing: "ease_out"
            }
          }

          network.release_authority(this.id)
          state.grabbed_by = null
        }

        // Render held piece attached to player's hand
        update(dt) {
          if state.grabbed_by == local_player.id {
            this.position = player.hand_position
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PLAYER AVATARS
  // ═══════════════════════════════════════════════════════════

  template "PlayerAvatar" {
    @networked
    @owner_authority
    @tier(1)

    state {
      player_id: null
      display_name: "Player"
      head_position: [0, 1.7, 0]
      hand_position: [0, 1.2, 0.5]
      holding_piece: null
    }

    object "Head" {
      type: "sphere"
      size: [0.2, 0.2, 0.2]
      position: state.head_position
      color: get_player_color(state.player_id)
    }

    object "Hand" {
      type: "sphere"
      size: [0.1, 0.1, 0.1]
      position: state.hand_position
      color: get_player_color(state.player_id)
      visible: state.holding_piece != null
    }

    object "NameTag" {
      type: "ui-text"
      position: [0, 0.3, 0]
      text: state.display_name
      billboard: true
      font_size: 12
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GAME LOGIC
  // ═══════════════════════════════════════════════════════════

  logic {

    function get_target_color(row, col) {
      colors = [
        ["#ef4444", "#f59e0b", "#10b981"],
        ["#3b82f6", "#8b5cf6", "#ec4899"],
        ["#06b6d4", "#84cc16", "#f97316"]
      ]
      return colors[row][col]
    }

    function get_piece_color(index) {
      colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
                "#ec4899", "#06b6d4", "#84cc16", "#f97316"]
      return colors[index]
    }

    @networked
    action check_placement(row, col, piece) {
      slot = grid.slots[row][col]

      if piece.color == slot.state.target_color {
        slot.state.occupied_by = piece.id
        state.pieces_placed.push({ row, col, piece_id: piece.id })
        play_sound("correct")

        // Check if puzzle is complete
        if state.pieces_placed.length == 9 {
          state.puzzle_solved = true
          trigger_victory_animation()
        }
      } else {
        play_sound("wrong")
        show_notification("Wrong color!")
      }
    }

    action trigger_victory_animation() {
      play_sound("victory")
      show_notification("Puzzle Solved!")

      // Fireworks at each player's position
      for player in get_all_players() {
        spawn_particle_effect("fireworks", player.head_position)
      }
    }

    // Spawn player avatars for each connected client
    on_player_joined: (player) => {
      spawn_object("PlayerAvatar", {
        state: {
          player_id: player.id,
          display_name: player.display_name,
          head_position: get_spawn_position(player.index)
        }
      })
    }

    on_player_left: (player) => {
      // Release any pieces held by disconnected player
      for piece in find_all("PuzzlePiece") {
        if piece.state.grabbed_by == player.id {
          piece.state.grabbed_by = null
          network.release_authority(piece.id)
        }
      }

      destroy_object("Avatar_${player.id}")
    }
  }
}
```

### Collaborative 3D Modeling

A shared whiteboard/modeling session where multiple users can draw and build together.

```holoscript
composition "Collaborative Studio" {

  network_config {
    topology: "client_server"
    server_url: "wss://studio-server.hololand.io"
    max_clients: 8
  }

  environment {
    skybox: "studio"
    ambient_light: 0.9
  }

  // ═══════════════════════════════════════════════════════════
  // NETWORKED STATE
  // ═══════════════════════════════════════════════════════════

  state {
    @networked
    @server_authority
    scene_objects: []      // All created objects
    undo_stack: []
    redo_stack: []

    @local_only
    current_tool: "brush"
    brush_color: "#ffffff"
    brush_size: 0.1
  }

  // ═══════════════════════════════════════════════════════════
  // SHARED CANVAS (Server Authoritative)
  // ═══════════════════════════════════════════════════════════

  object "Canvas" {
    @networked
    @server_authority
    @tier(0)  // Strict consistency for drawing

    type: "plane"
    size: [5, 3]
    position: [0, 1.5, -2]
    material: "whiteboard"

    state {
      @synced
      strokes: []  // Array of drawing strokes from all users
    }

    on_draw_start: (player_id, position) => {
      // Send draw input to server
      network.send_input("start_stroke", {
        player_id,
        position,
        color: get_player_brush_color(player_id),
        size: get_player_brush_size(player_id),
        timestamp: now()
      })
    }

    on_draw_continue: (player_id, position) => {
      network.send_input("add_stroke_point", {
        player_id,
        position,
        timestamp: now()
      })
    }

    on_draw_end: (player_id) => {
      network.send_input("end_stroke", {
        player_id,
        timestamp: now()
      })
    }

    // Server broadcasts validated strokes
    on_stroke_added: (stroke) => {
      state.strokes.push(stroke)
      render_stroke(stroke)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TOOL PALETTE (Local UI)
  // ═══════════════════════════════════════════════════════════

  spatial_group "ToolPalette" {
    @local_only
    position: "attached_to_left_hand"

    object "PalettePanel" {
      type: "ui-panel"
      size: [200, 300]
      background: "rgba(20, 20, 40, 0.9)"
      border_radius: 10

      object "BrushButton" {
        type: "ui-button"
        position: [10, 10]
        size: [80, 40]
        text: "Brush"
        color: state.current_tool == "brush" ? "#6366f1" : "#374151"
        @clickable
        on_click: () => { state.current_tool = "brush" }
      }

      object "CubeButton" {
        type: "ui-button"
        position: [110, 10]
        size: [80, 40]
        text: "Cube"
        color: state.current_tool == "cube" ? "#6366f1" : "#374151"
        @clickable
        on_click: () => { state.current_tool = "cube" }
      }

      object "ColorPicker" {
        type: "ui-color-picker"
        position: [10, 60]
        size: [180, 120]
        value: state.brush_color
        on_change: (color) => { state.brush_color = color }
      }

      object "SizeSlider" {
        type: "ui-slider"
        position: [10, 190]
        size: [180, 20]
        min: 0.01
        max: 0.5
        value: state.brush_size
        on_change: (size) => { state.brush_size = size }
      }

      object "UndoButton" {
        type: "ui-button"
        position: [10, 250]
        size: [85, 40]
        text: "Undo"
        @clickable
        on_click: undo_last_action
      }

      object "ClearButton" {
        type: "ui-button"
        position: [105, 250]
        size: [85, 40]
        text: "Clear All"
        color: "#ef4444"
        @clickable
        on_click: clear_canvas
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DYNAMICALLY CREATED OBJECTS (Server Authoritative)
  // ═══════════════════════════════════════════════════════════

  spatial_group "SceneObjects" {
    @networked
    @server_authority

    // Objects created by users are dynamically spawned here
    // Server validates and broadcasts to all clients
  }

  // ═══════════════════════════════════════════════════════════
  // SHARED TOOLS (Grab-to-Own)
  // ═══════════════════════════════════════════════════════════

  spatial_group "SharedTools" {
    position: [3, 1, 0]

    for i in range(4) {
      object "Marker_${i}" {
        @networked
        @shared_authority
        @interactive
        @tier(1)

        type: "cylinder"
        size: [0.02, 0.15, 0.02]
        position: [0, i * 0.2, 0]
        color: ["#ef4444", "#10b981", "#3b82f6", "#f59e0b"][i]

        state {
          held_by: null
        }

        on_grab: (player_id) => {
          if network.request_authority(this.id, player_id) {
            state.held_by = player_id
            attach_to_player_hand(player_id)
          }
        }

        on_release: () => {
          network.release_authority(this.id)
          state.held_by = null
          return_to_rack()
        }

        // While held, marker draws when trigger is pressed
        update(dt) {
          if state.held_by == local_player.id && is_trigger_pressed() {
            draw_at_marker_tip()
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PLAYER CURSORS (Show where others are drawing)
  // ═══════════════════════════════════════════════════════════

  template "PlayerCursor" {
    @networked
    @owner_authority
    @tier(1)

    state {
      player_id: null
      position: [0, 0, 0]
      active: false
    }

    object "CursorDot" {
      type: "sphere"
      size: [0.05, 0.05, 0.05]
      position: state.position
      color: get_player_color(state.player_id)
      visible: state.active

      @glow
      glow_intensity: 2.0
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GAME LOGIC
  // ═══════════════════════════════════════════════════════════

  logic {

    @networked
    action spawn_cube(position, size, color) {
      // Send create request to server
      network.send_input("create_object", {
        type: "cube",
        position,
        size,
        color,
        creator_id: local_player.id,
        timestamp: now()
      })
    }

    on_object_created: (object_data) => {
      // Server validated and broadcasted new object
      obj = spawn_object("box", {
        position: object_data.position,
        size: object_data.size,
        color: object_data.color,
        @networked: true,
        @server_authority: true
      })

      state.scene_objects.push(object_data)
      state.undo_stack.push({ action: "create", object_id: obj.id })
    }

    @networked
    action undo_last_action() {
      if state.undo_stack.length == 0 { return }

      last_action = state.undo_stack.pop()
      state.redo_stack.push(last_action)

      // Send undo request to server
      network.send_input("undo", {
        action: last_action,
        player_id: local_player.id
      })
    }

    @networked
    action clear_canvas() {
      network.send_input("clear_all", {
        player_id: local_player.id,
        timestamp: now()
      })
    }

    on_canvas_cleared: () => {
      state.strokes = []
      state.scene_objects = []
      state.undo_stack = []
      state.redo_stack = []

      // Remove all dynamically created objects
      destroy_all_in_group("SceneObjects")
    }

    function get_player_color(player_id) {
      // Assign consistent color per player
      hash = hash_string(player_id)
      return hsl(hash % 360, 70, 60)
    }

    // Update local player cursor position
    update(dt) {
      if is_drawing() {
        cursor = find_object("Cursor_${local_player.id}")
        cursor.state.position = get_brush_tip_position()
        cursor.state.active = true
      }
    }
  }
}
```

### Shared VR Training

A training scenario where multiple users practice a procedure together (e.g., medical training, equipment maintenance).

```holoscript
composition "Medical Training Lab" {

  network_config {
    topology: "client_server"
    server_url: "wss://training-server.hololand.io"
    max_clients: 4  // 1 instructor + 3 trainees
  }

  environment {
    skybox: "hospital"
    ambient_light: 0.8
  }

  // ═══════════════════════════════════════════════════════════
  // NETWORKED STATE
  // ═══════════════════════════════════════════════════════════

  state {
    @networked
    @server_authority
    scenario_state: "waiting"  // waiting, in_progress, completed
    current_step: 0
    total_steps: 5
    participants: []

    @synced
    instructor_id: null
    voice_channel_active: false
  }

  // ═══════════════════════════════════════════════════════════
  // PATIENT (Server Authoritative, Shared State)
  // ═══════════════════════════════════════════════════════════

  object "Patient" {
    @networked
    @server_authority
    @tier(0)  // Critical medical data must be consistent

    type: "humanoid"
    position: [0, 0.8, 0]
    scale: [1, 1, 1]

    state {
      heart_rate: 75
      blood_pressure: "120/80"
      breathing_rate: 16
      consciousness: "alert"
      injuries: [
        { location: "left_arm", type: "laceration", severity: "moderate" }
      ]
    }

    // Vital signs UI (visible to all)
    object "VitalSignsMonitor" {
      @networked
      type: "ui-panel"
      position: [1.5, 1.5, 0]
      size: [300, 200]
      background: "#1a1a2e"

      object "HeartRate" {
        type: "ui-text"
        position: [20, 20]
        text: "Heart Rate: ${state.heart_rate} BPM"
        color: state.heart_rate > 100 ? "#ef4444" : "#10b981"
        font_size: 18
      }

      object "BloodPressure" {
        type: "ui-text"
        position: [20, 60]
        text: "BP: ${state.blood_pressure}"
        font_size: 18
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // MEDICAL TOOLS (Shared Authority, Grab-to-Own)
  // ═══════════════════════════════════════════════════════════

  spatial_group "MedicalTools" {
    position: [-2, 1, 0]

    object "Stethoscope" {
      @networked
      @shared_authority
      @interactive
      @tier(1)

      type: "custom_model"
      model: "stethoscope.glb"
      position: [0, 0, 0]

      state {
        held_by: null
        active: false
      }

      on_grab: (player_id) => {
        if network.request_authority(this.id, player_id) {
          state.held_by = player_id
          attach_to_player_hand(player_id)
        } else {
          show_notification("Stethoscope is being used by ${state.held_by}")
        }
      }

      on_use: (player_id) => {
        if state.held_by == player_id {
          // Check if near patient's chest
          if distance(this.position, Patient.position) < 0.5 {
            state.active = true
            play_sound("heartbeat", volume: 0.8)

            // Send observation to server
            network.send_input("observe_vitals", {
              tool: "stethoscope",
              player_id,
              findings: {
                heart_rate: Patient.state.heart_rate,
                rhythm: "regular"
              }
            })
          }
        }
      }

      on_release: () => {
        network.release_authority(this.id)
        state.held_by = null
        state.active = false
        return_to_tray()
      }
    }

    object "Bandage" {
      @networked
      @shared_authority
      @interactive

      type: "custom_model"
      model: "bandage.glb"
      position: [0.3, 0, 0]

      state {
        held_by: null
        used: false
      }

      on_grab: (player_id) => {
        if network.request_authority(this.id, player_id) {
          state.held_by = player_id
        }
      }

      on_apply: (player_id, injury) => {
        if state.held_by == player_id && !state.used {
          // Send treatment action to server
          network.send_input("apply_treatment", {
            tool: "bandage",
            injury_id: injury.id,
            player_id,
            timestamp: now()
          })
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PROCEDURE STEPS (Server Broadcasts Progress)
  // ═══════════════════════════════════════════════════════════

  spatial_group "ProcedureSteps" {
    position: [2, 1.5, 0]

    object "StepDisplay" {
      @networked
      type: "ui-panel"
      size: [400, 500]
      background: "rgba(26, 26, 46, 0.95)"
      border_radius: 12

      object "Title" {
        type: "ui-text"
        position: [20, 20]
        text: "Training Procedure"
        font_size: 24
        color: "#00ffff"
      }

      object "Progress" {
        type: "ui-text"
        position: [20, 60]
        text: "Step ${state.current_step + 1} of ${state.total_steps}"
        font_size: 16
      }

      object "StepList" {
        type: "ui-list"
        position: [20, 100]
        size: [360, 350]
        items: get_procedure_steps()

        // Highlight current step
        item_color: (index) => {
          if index < state.current_step { return "#10b981" }  // Completed
          if index == state.current_step { return "#f59e0b" }  // Current
          return "#6b7280"  // Upcoming
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PARTICIPANT AVATARS (Owner Authority)
  // ═══════════════════════════════════════════════════════════

  template "ParticipantAvatar" {
    @networked
    @owner_authority
    @tier(1)

    state {
      player_id: null
      display_name: "Trainee"
      role: "trainee"  // "instructor" or "trainee"
      head_position: [0, 1.7, 0]
      hand_l_position: [0, 0, 0]
      hand_r_position: [0, 0, 0]
      holding_tool: null
    }

    object "Head" {
      type: "sphere"
      size: [0.25, 0.25, 0.25]
      position: state.head_position
      color: state.role == "instructor" ? "#f59e0b" : "#6366f1"
    }

    object "HandLeft" {
      type: "sphere"
      size: [0.08, 0.08, 0.08]
      position: state.hand_l_position
      color: state.role == "instructor" ? "#f59e0b" : "#6366f1"
    }

    object "HandRight" {
      type: "sphere"
      size: [0.08, 0.08, 0.08]
      position: state.hand_r_position
      color: state.role == "instructor" ? "#f59e0b" : "#6366f1"
    }

    object "NameTag" {
      type: "ui-text"
      position: [0, 0.4, 0]
      text: "${state.display_name} (${state.role})"
      billboard: true
      font_size: 14
      color: "#ffffff"
    }
  }

  // ═══════════════════════════════════════════════════════════
  // VOICE CHAT INDICATOR
  // ═══════════════════════════════════════════════════════════

  object "VoiceIndicator" {
    @local_only
    type: "ui-panel"
    position: "top_left"
    size: [200, 150]

    object "VoiceStatus" {
      type: "ui-text"
      position: [10, 10]
      text: state.voice_channel_active ? "Voice Active" : "Voice Inactive"
      color: state.voice_channel_active ? "#10b981" : "#ef4444"
      font_size: 16
    }

    object "ParticipantList" {
      type: "ui-list"
      position: [10, 40]
      size: [180, 100]
      items: state.participants.map(p => p.display_name)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GAME LOGIC
  // ═══════════════════════════════════════════════════════════

  logic {

    function get_procedure_steps() {
      return [
        "1. Assess scene safety and patient consciousness",
        "2. Check vital signs (heart rate, breathing)",
        "3. Identify and assess injuries",
        "4. Apply appropriate first aid (bandage, pressure)",
        "5. Monitor patient and call for advanced care"
      ]
    }

    @networked
    action start_scenario() {
      // Only instructor can start
      if local_player.id == state.instructor_id {
        network.send_input("start_scenario", {
          instructor_id: local_player.id,
          timestamp: now()
        })
      }
    }

    on_scenario_started: () => {
      state.scenario_state = "in_progress"
      state.current_step = 0
      show_notification("Training scenario started!")

      // Enable voice chat
      state.voice_channel_active = true
      voice.join("training_room")
    }

    @networked
    action complete_step(step_index) {
      // Server validates step completion
      network.send_input("complete_step", {
        step_index,
        player_id: local_player.id,
        timestamp: now()
      })
    }

    on_step_completed: (step_index) => {
      state.current_step = step_index + 1
      play_sound("step_complete")
      show_notification("Step ${step_index + 1} completed!")

      if state.current_step >= state.total_steps {
        complete_scenario()
      }
    }

    @networked
    action complete_scenario() {
      state.scenario_state = "completed"
      show_notification("Training scenario completed!")

      // Display performance summary
      show_performance_summary()
    }

    // Spawn avatars for all participants
    on_player_joined: (player) => {
      state.participants.push(player)

      spawn_object("ParticipantAvatar", {
        state: {
          player_id: player.id,
          display_name: player.display_name,
          role: player.id == state.instructor_id ? "instructor" : "trainee",
          head_position: get_spawn_position(state.participants.length)
        }
      })

      show_notification("${player.display_name} joined the training session")
    }

    on_player_left: (player) => {
      state.participants = state.participants.filter(p => p.id != player.id)
      destroy_object("Avatar_${player.id}")

      // Release any tools held by disconnected player
      release_all_tools_held_by(player.id)
    }

    action release_all_tools_held_by(player_id) {
      for tool in find_all("@interactive") {
        if tool.state.held_by == player_id {
          tool.state.held_by = null
          network.release_authority(tool.id)
        }
      }
    }
  }
}
```

---

## API Reference

### DistributedSceneGraphOrchestrator

Top-level orchestrator for distributed multi-agent scene graph building and merging.

#### Constructor

```typescript
constructor(config?: Partial<DistributedSceneGraphConfig>)
```

**Parameters**:
- `config`: Optional configuration object

**Default Configuration**:
```typescript
{
  alignment: {
    minIntersectionSize: 3,
    maxCentroidDistance: 2.0,
    minBboxIoU: 0.3,
    minMatchConfidence: 0.5,
    maxAnchorCandidates: 10,
    maxSearchDepth: 5,
    resolveLabelConflicts: true
  },
  maxAgents: 8,
  neighborDistanceThreshold: 5.0,
  minSegmentPoints: 10,
  featureVectorDimension: 12,
  emitEvents: true,
  maxEdgesPerNode: 8
}
```

#### Methods

##### registerAgent

```typescript
registerAgent(agentId: string, builderConfig?: Partial<AgentLocalGraphBuilderConfig>): void
```

Register a new agent. Creates a local graph builder for the agent.

**Throws**: Error if max agents reached or agent already registered

**Example**:
```typescript
orchestrator.registerAgent('agent-1');
orchestrator.registerAgent('agent-2', {
  neighborDistanceThreshold: 10.0,
  maxEdgesPerNode: 12
});
```

##### unregisterAgent

```typescript
unregisterAgent(agentId: string): void
```

Unregister an agent and remove its local graph builder.

##### submitObservations

```typescript
submitObservations(agentId: string, snapshots: ObjectSnapshot[]): void
```

Submit observations from an agent. Observations are buffered and processed on the next `infer()` call.

**Example**:
```typescript
const snapshots: ObjectSnapshot[] = [
  {
    id: 'table',
    type: 'mesh',
    label: 'table',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    boundsMin: { x: -1, y: 0, z: -1 },
    boundsMax: { x: 1, y: 1, z: 1 },
    visible: true
  }
];

orchestrator.submitObservations('agent-1', snapshots);
```

##### infer

```typescript
async infer(state: CachedSpatialState, deltaMs: number): Promise<void>
```

Run a single distributed inference pass.

**Pipeline**:
1. Process pending observations through per-agent builders
2. Merge all local graphs into global graph
3. Extract spatial relationships from global graph
4. Write results to `CachedSpatialState`

**Budget**: 200-1000ms (called at 1-5Hz, NOT at 90Hz)

##### getMetrics

```typescript
getMetrics(): DistributedSceneGraphMetrics
```

Get comprehensive metrics for the distributed scene graph system.

**Returns**:
```typescript
{
  activeAgents: number;
  globalNodeCount: number;
  globalEdgeCount: number;
  agentGraphSizes: Record<string, { nodes: number; edges: number }>;
  totalMerges: number;
  averageMergeDurationMs: number;
  totalMatchedNodes: number;
  totalNewNodes: number;
  totalLabelConflicts: number;
  lastMergeTimestamp: number;
  spatialExtent: number;
}
```

##### addEventListener

```typescript
addEventListener(listener: DistributedSceneGraphEventListener): void
```

Register an event listener for distributed scene graph events.

**Event Types**:
- `agent_registered`
- `agent_unregistered`
- `local_graph_updated`
- `merge_started`
- `merge_completed`
- `node_matched`
- `node_added`
- `label_conflict`
- `edge_updated`
- `global_graph_rebuilt`

**Example**:
```typescript
orchestrator.addEventListener((event) => {
  console.log(`Event: ${event.type}`, event.data);
});
```

##### getGlobalGraph

```typescript
getGlobalGraph(): GlobalSceneGraph
```

Get the global scene graph for inspection/debug.

**Returns**:
```typescript
{
  nodes: Map<string, SceneGraphNode>;
  edges: Map<string, SceneGraphEdge>;
  contributingAgentIds: string[];
  mergeHistory: MergeEvent[];
  lastMerged: number;
  mergeCount: number;
  bounds: { min: Vec3; max: Vec3 };
}
```

---

### NetworkManager

High-level network manager for HoloLand multiplayer.

#### Constructor

```typescript
constructor(config?: Partial<NetworkManagerConfig>)
```

**Default Configuration**:
```typescript
{
  maxClients: 32,
  networkTickRateHz: 60,
  targetFps: 90,
  maxEntities: 200,
  bandwidthBudgetBytesPerSec: 50_000
}
```

#### Methods

##### start

```typescript
start(): void
```

Start the network tick loop.

##### stop

```typescript
stop(): void
```

Stop the network tick loop.

##### connectClient

```typescript
connectClient(clientId: string): boolean
```

Connect a client to the session.

**Returns**: `true` if successful, `false` if max clients reached or already connected

##### disconnectClient

```typescript
disconnectClient(clientId: string): void
```

Disconnect a client from the session. Removes all entities owned by this client.

##### registerEntity

```typescript
registerEntity(
  clientId: string,
  entity: EntityState,
  tier: ConsistencyLevel = ConsistencyLevel.Relaxed
): boolean
```

Register an entity for a connected client with a specified consistency tier.

**Example**:
```typescript
network.registerEntity('client-1', {
  entityId: 'player-avatar',
  position: { x: 0, y: 1.7, z: 0 },
  velocity: { x: 0, y: 0, z: 0 }
}, ConsistencyLevel.Eventual);
```

##### submitInput

```typescript
submitInput(input: ClientInput): PredictedState | null
```

Submit input for processing. Returns predicted state if entity supports prediction.

**Example**:
```typescript
const prediction = network.submitInput({
  clientId: 'client-1',
  entityId: 'player-avatar',
  tick: 1234,
  input: {
    forward: true,
    strafe: 0,
    jump: false
  }
});
```

##### getMetrics

```typescript
getMetrics(): SyncMetrics
```

Get sync metrics for monitoring.

**Returns**:
```typescript
{
  totalEntities: number;
  entitiesByTier: Record<number, number>;
  ticksProcessed: number;
  averageTickDurationMs: number;
  bandwidthUsedBytesPerSec: number;
  predictionAccuracy: number;
  reconciliationsPerSecond: number;
}
```

---

### TieredStateSync

Orchestrates the 4-tier consistency model for multiplayer state synchronization.

#### Constructor

```typescript
constructor(config?: Partial<TieredStateSyncConfig>)
```

**Default Configuration**:
```typescript
{
  targetFps: 90,
  bandwidthBudgetBytesPerSec: 50_000,
  maxEntities: 200
}
```

#### Methods

##### registerEntity

```typescript
registerEntity(entity: EntityState, tier: ConsistencyLevel = ConsistencyLevel.Relaxed): boolean
```

Register an entity with a specified consistency tier.

**Tiers**:
- `ConsistencyLevel.Strict` (Tier 0): Full server validation each tick
- `ConsistencyLevel.Eventual` (Tier 1): Optimistic local + reconciliation
- `ConsistencyLevel.Relaxed` (Tier 2): Batched updates at low frequency
- `ConsistencyLevel.Cosmetic` (Tier 3): Best-effort multicast

##### processTick

```typescript
processTick(): StateSnapshot
```

Process one simulation tick. Advances server state, batches updates by tier, and triggers reconciliation.

**Returns**: State snapshot with all entity states

##### changeTier

```typescript
changeTier(entityId: string, newTier: ConsistencyLevel): void
```

Change an entity's consistency tier at runtime (e.g., for dynamic spatial prioritization).

**Example**:
```typescript
// Upgrade distant NPC to higher tier when player approaches
if (distance < 10) {
  sync.changeTier('npc-123', ConsistencyLevel.Eventual);
} else {
  sync.changeTier('npc-123', ConsistencyLevel.Relaxed);
}
```

---

### StateAuthority

Centralized authority management for networked entities.

#### Constructor

```typescript
constructor(config?: Partial<AuthorityConfig>)
```

**Default Configuration**:
```typescript
{
  defaultMode: 'owner',
  conflictStrategy: 'priority',
  claimTimeout: 5000,
  hostPeerId: null,
  localPeerId: ''
}
```

#### Methods

##### register

```typescript
register(
  entityId: string,
  owner: string | null,
  options?: {
    mode?: AuthorityMode;
    transferable?: boolean;
  }
): AuthorityEntry
```

Register an entity for authority tracking.

**Authority Modes**:
- `'server'`: Server always has authority
- `'owner'`: Spawning client owns entity
- `'shared'`: Any client can claim authority

##### requestAuthority

```typescript
requestAuthority(entityId: string, peerId: string, priority?: number): boolean
```

Request authority over an entity.

**Returns**: `true` if immediately granted, `false` if denied or pending

##### releaseAuthority

```typescript
releaseAuthority(entityId: string, peerId: string): boolean
```

Release authority over an entity.

##### transferAuthority

```typescript
transferAuthority(entityId: string, fromPeer: string, toPeer: string): boolean
```

Transfer authority from one peer to another.

**Returns**: `true` if successful, `false` if failed

##### addEventListener

```typescript
addEventListener(listener: AuthorityCallback): void
```

Register a listener for authority events.

**Event Types**:
- `authority_granted`
- `authority_denied`
- `authority_released`
- `authority_transferred`
- `authority_conflict`

**Example**:
```typescript
stateAuthority.addEventListener((event) => {
  if (event.type === 'authority_granted') {
    console.log(`Authority granted to ${event.peerId} for ${event.entityId}`);
  }
});
```

---

## Performance Considerations

### Frame Budget Allocation

HoloLand VR targets 90Hz (11.1ms frame budget). The distributed scene graph system must fit within Tier 1 inference allocation:

| System | Frequency | Budget | Usage |
|--------|-----------|--------|-------|
| Render | 90Hz | 11.1ms | 8-9ms |
| Physics | 90Hz | 11.1ms | 1-2ms |
| **Scene Graph** | **1-5Hz** | **200-1000ms** | **50-200ms** |
| Networking | 60Hz | 16.7ms | 1-3ms |

**Scene Graph Breakdown** (at 5Hz):
- Local graph building: 20-50ms (per agent)
- Graph alignment merging: 50-100ms (all agents)
- Spatial relationship extraction: 10-50ms
- **Total**: 80-200ms per tick

**Optimization**: Graph inference runs on a separate thread (Web Worker) to avoid blocking the render loop.

### Entity Count Limits

| Tier | Max Entities | Update Hz | Bandwidth/Client |
|------|--------------|-----------|------------------|
| 0 (Strict) | 20 | 60-90 | ~15 KB/s |
| 1 (Eventual) | 50 | 30-60 | ~20 KB/s |
| 2 (Relaxed) | 100 | 5-10 | ~10 KB/s |
| 3 (Cosmetic) | 30 | 1-5 | ~2 KB/s |
| **Total** | **200** | — | **~47 KB/s** |

**Exceeding limits**:
- 200-500 entities: Enable aggressive spatial prioritization and frustum culling
- 500-1000 entities: Use zone-based interest management (only sync nearby zones)
- 1000+ entities: Requires dedicated server cluster with spatial sharding

### Memory Usage

**Per Entity**:
- SceneGraphNode: ~256 bytes (segment data + feature vector)
- SceneGraphEdge: ~128 bytes (relative properties)
- Network state entry: ~64 bytes (quantized state)

**Total for 200 entities**:
- 200 nodes × 256 bytes = 51.2 KB
- 400 edges (avg 2 per node) × 128 bytes = 51.2 KB
- 200 network entries × 64 bytes = 12.8 KB
- **Total**: ~115 KB per client

**Multi-agent (8 agents)**:
- 8 local graphs × 115 KB = 920 KB
- 1 global graph: 115 KB
- **Total**: ~1 MB

### Network Latency Impact

| Latency | Authority Model | User Experience |
|---------|-----------------|-----------------|
| <30ms | Any | Feels local, imperceptible |
| 30-60ms | Owner/Shared | Slight delay, still good |
| 60-100ms | Owner/Shared | Noticeable delay |
| 100-150ms | Server only | Significant lag, use prediction |
| >150ms | Server only | Poor UX, consider regional servers |

**Mitigation**:
- Use client prediction for Tier 1 entities
- Interpolate Tier 2/3 entities between snapshots
- Show visual feedback during authority transfer (highlight object)

---

## Best Practices

### 1. Choose the Right Authority Model

- **Server Authoritative**: Competitive gameplay, anti-cheat required
  - Examples: health, inventory, score, physics simulation
- **Owner Authoritative**: Player-owned objects, low-stakes
  - Examples: avatar, cosmetics, emotes
- **Shared Authoritative**: Collaborative tools, interactive objects
  - Examples: whiteboard markers, puzzle pieces, shared documents

### 2. Assign Appropriate Tiers

- **Tier 0 (Strict)**: Only for critical objects (health, game state)
  - Limit to <20 entities
- **Tier 1 (Eventual)**: Interactive objects with frequent updates
  - Player movement, held tools (20-50 entities)
- **Tier 2 (Relaxed)**: Ambient objects, NPCs
  - Background animations (50-100 entities)
- **Tier 3 (Cosmetic)**: Effects, particles
  - Fire, smoke, sounds (30+ entities)

### 3. Optimize Bandwidth

- Enable `@spatial_priority` for all non-critical objects
- Use `@frustum_culling` for objects that can be hidden
- Implement zone-based sync for large worlds (`@zone_sync`)
- Quantize float precision (`@quantize`) for position/rotation
- Use delta encoding for state updates

### 4. Handle Conflicts Gracefully

- Show visual feedback when authority is denied
- Implement undo/rollback for simultaneous edits
- Lock objects during critical operations
- Use priority system for important clients (instructor, host)

### 5. Test with Realistic Conditions

- Simulate network latency (50-150ms)
- Test with max client count (8-32 clients)
- Monitor bandwidth usage (`getMetrics()`)
- Profile inference timing (should be <200ms per tick)
- Test ownership transfer edge cases (disconnects, conflicts)

### 6. Provide User Feedback

- Show current owner of shared objects (nameplate, glow)
- Display voice chat indicators (speaking, muted)
- Show connection status (connected, reconnecting, disconnected)
- Indicate when objects are locked or unavailable

### 7. Security Considerations

- Always validate inputs on server (never trust client)
- Rate-limit authority requests (prevent spam)
- Implement anti-cheat for competitive scenarios
- Use encrypted transport (WSS, DTLS for WebRTC)
- Audit authority transfers (log for moderation)

### 8. Scalability Planning

- Start with relay topology for prototypes (easy setup)
- Move to client-server for production (scalable)
- Use CDN edge servers for global player base (reduce latency)
- Implement regional sharding for 100+ player worlds
- Monitor server load and auto-scale as needed

---

## Additional Resources

- **HoloScript Language Reference**: [`HOLOSCRIPT_LANGUAGE_SPEC.md`](./HOLOSCRIPT_LANGUAGE_SPEC.md)
- **Networking Package**: `packages/platform/networking/`
- **Example Compositions**: `examples/demos/multiplayer-lobby.holo`
- **Network Gateway**: `packages/platform/network/src/gateway/`
- **Spatial Reasoning**: `packages/platform/renderer/src/SpatialReasoningEngine.ts`
- **MCP Best Practices**: [`MCP_BEST_PRACTICES.md`](./MCP_BEST_PRACTICES.md)

---

**Document Version**: 1.0.0
**Last Updated**: 2026-03-07
**Maintained by**: HoloLand Platform Team
