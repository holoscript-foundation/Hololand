# AgentCommunicationManager

Comprehensive agent communication service for HoloLand VR/AR platform with real-time P2P messaging, CRDT synchronization, and MVC object persistence.

## Features

### Core Capabilities
- **Delta CRDT Synchronization** - Efficient state sync with delta-based operations
- **WebRTC P2P Communication** - Low-latency peer-to-peer data channels
- **Message Routing** - Priority queuing with delivery guarantees
- **MVC Object Persistence** - IndexedDB storage for cross-reality state
- **AgentRBAC Integration** - Permission enforcement for all operations

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│         AgentCommunicationManager (Public API)          │
└─────────────────────────────────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────┐      ┌─────────────┐      ┌──────────────┐
│  Delta   │      │   WebRTC    │      │   Message    │
│  CRDT    │◄────►│   Manager   │◄────►│   Router     │
│  Sync    │      │             │      │              │
│  Engine  │      └─────────────┘      └──────────────┘
└──────────┘              │                    │
      │                   ▼                    ▼
      │            ┌─────────────┐      ┌──────────────┐
      │            │  Signaling  │      │   Delivery   │
      │            │   Server    │      │  Guarantee   │
      │            └─────────────┘      │   Manager    │
      │                                 └──────────────┘
      ▼
┌──────────────────────┐
│   MVC Persistence    │
│   (IndexedDB)        │
└──────────────────────┘
```

## Installation

```bash
# In Hololand platform
cd packages/platform/services
npm install @holoscript/crdt @holoscript/mvc-schema @hololand/agents
```

## Quick Start

### Basic Setup

```typescript
import { AgentCommunicationManager } from '@hololand/services';
import { createTestSigner } from '@holoscript/crdt';
import { RBACEnforcer } from '@hololand/agents';

// Initialize communication manager
const commManager = new AgentCommunicationManager({
  agentDid: 'did:holo:agent123',
  didSigner: createTestSigner('did:holo:agent123'),
  rbacEnforcer: new RBACEnforcer('/path/to/project'),
  agentToken: {
    agentId: 'agent123',
    role: 'agent',
    permissions: {
      allowedPaths: ['**/*'],
      allowedOperations: ['*'],
      environments: ['production'],
    },
  },
});

await commManager.initialize();

// Send a message
await commManager.sendMessage({
  type: 'task_assignment',
  from: 'did:holo:agent123',
  to: 'did:holo:agent456',
  payload: {
    task: 'Process user feedback',
    priority: 'high',
  },
  priority: 8,
  deliveryGuarantee: 'exactly-once',
});

// Receive messages
commManager.onMessage('task_assignment', async (message) => {
  console.log('Received task:', message.payload);
});
```

## Integration with HoloScript @agent Compositions

### Example 1: Basic Agent Communication

```holoscript
@agent CollaborationAgent {
  @identity {
    did: "did:holo:collab-agent-001"
    capabilities: ["message", "sync", "persist"]
  }

  @crdt decision_log using DecisionHistory {
    @authenticated by identity.did
    @sync via p2p
  }

  @trait communication {
    type: "AgentCommunication"
    config: {
      deliveryGuarantee: "exactly-once"
      priority: 7
      enableDeltaSync: true
    }
  }

  fn sendStatusUpdate(status: string) {
    // Automatically uses AgentCommunicationManager
    @send {
      type: "status_update"
      to: ["did:holo:manager", "did:holo:monitor"]
      payload: { status, timestamp: @now() }
      priority: 5
    }
  }

  @on_message("task_assigned") {
    fn handleTaskAssignment(message: Message) {
      decision_log.add({
        decision: "task_accepted"
        context: message.payload
        timestamp: @now()
      })

      // Sync decision log with peers
      @sync decision_log
    }
  }
}
```

### Example 2: Multi-Agent Collaboration

```holoscript
@composition VRMeetingRoom {
  @agents {
    moderator: Agent("did:holo:moderator-001")
    participants: Agent[]
    note_taker: Agent("did:holo:notes-agent")
  }

  @crdt shared_whiteboard using LWWMap {
    @authenticated by moderator.identity.did
    @sync via p2p {
      interval: 1000  // 1 second sync
      batchSize: 50
    }
  }

  @trait collaboration {
    type: "MultiAgentSync"
    config: {
      topology: "mesh"
      conflictResolution: "rbac"
    }
  }

  fn onParticipantJoin(participant: Agent) {
    // Establish P2P connection
    @connect_peer participant.identity.did

    // Sync current whiteboard state
    @sync shared_whiteboard to: participant

    // Notify all participants
    @broadcast {
      type: "participant_joined"
      payload: {
        did: participant.identity.did
        name: participant.displayName
      }
    }
  }

  fn updateWhiteboard(stroke: DrawStroke) {
    shared_whiteboard.set(stroke.id, stroke)

    // Delta sync broadcasts only the new stroke
    // (not the entire whiteboard)
  }

  @on_message("voice_transcription") {
    fn captureNotes(message: Message) {
      note_taker.processTranscript(message.payload.text)

      // Persist to MVC object
      @persist ActiveTaskState {
        id: "meeting-notes-{@now()}"
        data: {
          transcript: message.payload.text
          speaker: message.from
          timestamp: @now()
        }
      }
    }
  }
}
```

### Example 3: Cross-Reality Agent State Synchronization

```holoscript
@agent SpatialAgent {
  @identity {
    did: "did:holo:spatial-001"
    geolocation: @gps()
  }

  @mvc_objects {
    spatial_context: SpatialContextSummary
    decisions: DecisionHistory
    preferences: UserPreferences
    evidence: EvidenceTrail
  }

  @trait cross_reality {
    type: "CrossRealitySync"
    config: {
      anchor: "geospatial"  // Use WGS84 coordinates
      syncInterval: 5000
    }
  }

  fn updateSpatialContext() {
    spatial_context.updateLocation({
      lat: @gps().lat
      lon: @gps().lon
      alt: @gps().alt
      accuracy: @gps().accuracy
      timestamp: @now()
    })

    // Auto-persist via MVCPersistenceLayer
    @persist spatial_context

    // Broadcast to nearby agents
    @broadcast_radius(100) {  // 100 meters
      type: "spatial_update"
      payload: spatial_context.summary
    }
  }

  @on_enter_vr_world(world_id: string) {
    fn syncToVR() {
      // Load persisted state
      @load spatial_context from: "mvc_storage"

      // Sync with VR environment
      @sync_to_vr {
        world: world_id
        state: spatial_context
        crdts: [decisions, preferences]
      }
    }
  }

  @on_exit_vr_world() {
    fn persistState() {
      // Save all MVC objects before exiting
      @persist [spatial_context, decisions, preferences, evidence]

      // Ensure delivery before disconnect
      @flush_pending_saves()
    }
  }
}
```

## API Reference

### AgentCommunicationManager

#### Constructor

```typescript
constructor(config: AgentCommunicationConfig)
```

**Config Options:**
- `agentDid` - Agent DID identifier
- `didSigner` - DID signer for CRDT operations
- `rbacEnforcer` - Permission enforcer
- `agentToken` - Agent authentication token
- `webrtc` - WebRTC configuration (ICE servers, signaling URL)
- `routing` - Message routing configuration (queue size, retry)
- `persistence` - IndexedDB configuration (auto-save, interval)
- `deltaSync` - Delta sync configuration (enabled, interval, batch size)

#### Methods

##### Messaging

```typescript
// Send a message
await sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string>

// Register message handler
onMessage(type: string, handler: (message: AgentMessage) => void): () => void

// Get message status
await getMessageStatus(messageId: string): Promise<MessageDeliveryStatus | null>
```

##### WebRTC Connections

```typescript
// Connect to peer
await connectToPeer(peerDid: string): Promise<void>

// Disconnect from peer
await disconnectFromPeer(peerDid: string): Promise<void>

// Get connection state
getConnectionState(peerDid: string): WebRTCConnectionState | null

// Get all active connections
getActiveConnections(): WebRTCConnectionState[]
```

##### CRDT Synchronization

```typescript
// Register CRDT for sync
await registerCRDT(crdtId: string, crdtInstance: any): Promise<void>

// Unregister CRDT
await unregisterCRDT(crdtId: string): Promise<void>

// Manual sync trigger
await syncCRDT(crdtId: string, peerDid?: string): Promise<void>

// Get sync state
getSyncState(crdtId: string): DeltaSyncState | null
```

##### MVC Object Persistence

```typescript
// Save MVC object
await saveMVCObject(
  type: MVCObjectType,
  id: string,
  object: MVCObject
): Promise<void>

// Load MVC object
await loadMVCObject(
  type: MVCObjectType,
  id: string
): Promise<MVCObject | null>

// Delete MVC object
await deleteMVCObject(type: MVCObjectType, id: string): Promise<void>

// List objects of type
await listMVCObjects(type: MVCObjectType): Promise<string[]>
```

##### Statistics

```typescript
// Get communication stats
getStats(): CommunicationStats

// Reset statistics
resetStats(): void
```

## Message Types

### Standard Message Structure

```typescript
interface AgentMessage {
  id: string;                    // Auto-generated
  type: string;                  // Message type identifier
  from: string;                  // Sender DID
  to: string | string[];         // Recipient DID(s)
  payload: unknown;              // Message data
  priority?: number;             // 1-10 (10 = highest)
  timestamp: number;             // Auto-generated
  deliveryGuarantee?: 'at-most-once' | 'at-least-once' | 'exactly-once';
  ttl?: number;                  // Time-to-live (ms)
  crdtOperation?: SignedOperation;  // Optional CRDT op
}
```

### Delivery Guarantees

#### At-Most-Once (Fire-and-Forget)
- No retry on failure
- Lowest latency
- Best for high-frequency state updates

```typescript
await commManager.sendMessage({
  type: 'avatar_position',
  from: 'did:holo:player1',
  to: 'did:holo:server',
  payload: { x: 10, y: 5, z: 3 },
  deliveryGuarantee: 'at-most-once',
});
```

#### At-Least-Once (Retry Until Ack)
- Retry on failure
- May deliver duplicates
- Best for important notifications

```typescript
await commManager.sendMessage({
  type: 'achievement_unlocked',
  from: 'did:holo:game-engine',
  to: 'did:holo:player1',
  payload: { achievement: 'first_win' },
  deliveryGuarantee: 'at-least-once',
});
```

#### Exactly-Once (Deduplication + Ack)
- Retry with deduplication
- Guaranteed single delivery
- Best for critical transactions

```typescript
await commManager.sendMessage({
  type: 'token_transfer',
  from: 'did:holo:wallet1',
  to: 'did:holo:wallet2',
  payload: { amount: 100, token: 'HOLO' },
  deliveryGuarantee: 'exactly-once',
});
```

## CRDT Integration

### Supported CRDT Types

The service integrates with `@holoscript/crdt` package:

- **LWWRegister** - Last-Writer-Wins register
- **ORSet** - Observed-Remove set
- **GCounter** - Grow-only counter
- **LWWMap** - Last-Writer-Wins map
- **Custom CRDTs** - Any type implementing merge semantics

### Delta Synchronization

Delta sync sends only changes since last sync, not full state:

```typescript
import { LWWMap } from '@holoscript/crdt';

// Create CRDT
const sharedMap = new LWWMap('did:holo:agent123');

// Register with communication manager
await commManager.registerCRDT('shared-notes', sharedMap);

// Make changes
sharedMap.set('task1', 'Implement feature X');
sharedMap.set('task2', 'Review PR #123');

// Delta sync automatically broadcasts only new operations
// (not the entire map)
```

### Merkle Tree Verification

State integrity verification using Merkle trees:

```typescript
const syncState = commManager.getSyncState('shared-notes');
console.log('Merkle root:', syncState?.merkleRoot);

// On receiving delta:
// 1. Apply operations
// 2. Recompute Merkle root
// 3. Verify against received root
// 4. Flag inconsistency if mismatch
```

## MVC Object Schema

### DecisionHistory (G-Set CRDT)

```typescript
import { DecisionHistory } from '@holoscript/mvc-schema';

const decisions: DecisionHistory = {
  crdtType: 'g-set',
  crdtId: 'agent123-decisions',
  decisions: [
    {
      id: 'decision-1',
      decision: 'accept_task',
      context: { task_id: 'task-456' },
      timestamp: Date.now(),
      agentDid: 'did:holo:agent123',
    },
  ],
  vectorClock: { 'did:holo:agent123': 1 },
  lastUpdated: Date.now(),
};

await commManager.saveMVCObject('DecisionHistory', 'agent123-decisions', decisions);
```

### ActiveTaskState (OR-Set + LWW)

```typescript
import { ActiveTaskState } from '@holoscript/mvc-schema';

const tasks: ActiveTaskState = {
  crdtType: 'or-set',
  crdtId: 'agent123-tasks',
  tasks: [
    {
      id: 'task-1',
      title: 'Process customer feedback',
      status: 'in_progress',
      priority: 'high',
      createdAt: Date.now(),
      tags: ['g-set', { 'customer-service': true }],
    },
  ],
  vectorClock: { 'did:holo:agent123': 2 },
  lastUpdated: Date.now(),
};

await commManager.saveMVCObject('ActiveTaskState', 'agent123-tasks', tasks);
```

### UserPreferences (LWW-Map)

```typescript
import { UserPreferences } from '@holoscript/mvc-schema';

const prefs: UserPreferences = {
  crdtType: 'lww-map',
  crdtId: 'agent123-prefs',
  preferences: {
    theme: { value: 'dark', timestamp: Date.now() },
    language: { value: 'en-US', timestamp: Date.now() },
    notifications: { value: true, timestamp: Date.now() },
  },
  vectorClock: { 'did:holo:agent123': 3 },
  lastUpdated: Date.now(),
};

await commManager.saveMVCObject('UserPreferences', 'agent123-prefs', prefs);
```

### SpatialContextSummary (LWW + G-Set)

```typescript
import { SpatialContextSummary } from '@holoscript/mvc-schema';

const spatial: SpatialContextSummary = {
  crdtType: 'lww',
  crdtId: 'agent123-spatial',
  currentLocation: {
    lat: 37.7749,
    lon: -122.4194,
    alt: 10,
    accuracy: 5,
    timestamp: Date.now(),
  },
  recentLocations: {
    crdtType: 'g-set',
    locations: [
      { lat: 37.7749, lon: -122.4194, timestamp: Date.now() - 60000 },
      { lat: 37.7750, lon: -122.4195, timestamp: Date.now() - 30000 },
    ],
  },
  vectorClock: { 'did:holo:agent123': 4 },
  lastUpdated: Date.now(),
};

await commManager.saveMVCObject('SpatialContextSummary', 'agent123-spatial', spatial);
```

### EvidenceTrail (VCP v1.1 Hash Chain)

```typescript
import { EvidenceTrail } from '@holoscript/mvc-schema';

const evidence: EvidenceTrail = {
  vcpVersion: '1.1',
  chainId: 'agent123-evidence',
  evidence: [
    {
      id: 'evidence-1',
      type: 'decision_made',
      data: { decision: 'task_accepted' },
      hash: 'abc123...',
      previousHash: null,
      timestamp: Date.now(),
      signature: 'signature123...',
    },
  ],
  lastUpdated: Date.now(),
};

await commManager.saveMVCObject('EvidenceTrail', 'agent123-evidence', evidence);
```

## Performance Considerations

### Message Throughput

- **Target**: 1000 messages/second per agent
- **Batch size**: 50-100 operations per delta sync
- **Queue processing**: <10ms per batch

### WebRTC Latency

- **P2P latency**: 10-50ms (local network)
- **Signaling latency**: 50-200ms (depends on server)
- **ICE gathering**: 1-5 seconds (initial connection)

### IndexedDB Performance

- **Write latency**: <50ms per MVC object
- **Read latency**: <10ms per object
- **Batch operations**: 5-10x faster than individual

### Memory Usage

- **Message queue**: ~1MB per 1000 messages
- **CRDT state**: <10KB per instance
- **MVC objects**: <2KB per object (compressed)
- **Total footprint**: <100MB for typical workload

## Security

### AgentRBAC Permission Model

All operations require permission checks:

```typescript
// Operation types
'send_message'          // Send a message to another agent
'connect_peer'          // Establish WebRTC connection
'register_crdt'         // Register CRDT for sync
'sync_crdt'             // Synchronize CRDT
'save_mvc_object'       // Persist MVC object
'load_mvc_object'       // Load MVC object
'delete_mvc_object'     // Delete MVC object
```

### CRDT Authentication

All CRDT operations are signed with DID:

```typescript
import { DIDSigner } from '@holoscript/crdt';

const signer = new DIDSigner({
  did: 'did:holo:agent123',
  privateKey: '...',
});

// Operations are automatically signed
const signedOp = await signer.sign(operation);

// Verification on receive
const valid = await signer.verify(signedOp);
```

## Troubleshooting

### Connection Issues

**Problem**: WebRTC connection fails to establish

**Solutions**:
1. Check ICE servers configuration
2. Verify signaling server is running
3. Check firewall/NAT settings
4. Enable TURN fallback

### Sync Issues

**Problem**: CRDT state diverges between peers

**Solutions**:
1. Enable Merkle tree verification
2. Trigger manual full sync
3. Check network partition
4. Verify vector clock merge logic

### Performance Issues

**Problem**: High latency or message queue backlog

**Solutions**:
1. Increase batch size for delta sync
2. Use at-most-once for non-critical messages
3. Enable compression for large messages
4. Optimize message handler performance

## Examples Repository

See `examples/` directory for complete working examples:

- `basic-communication.ts` - Simple P2P messaging
- `crdt-sync.ts` - Delta CRDT synchronization
- `multi-agent-collab.ts` - Multi-agent collaboration
- `cross-reality-sync.ts` - VR/AR state synchronization
- `mvc-persistence.ts` - MVC object storage and retrieval

## License

MIT License - Copyright (c) 2026 HoloLand Team
