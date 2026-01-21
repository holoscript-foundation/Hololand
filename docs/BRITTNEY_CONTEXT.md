# Brittney AI System Context & Reference

> ⚠️ **This is a technical reference for AI training and advanced developers.**  
> For a friendlier introduction, see [HOLOSCRIPT_FILE_TYPES.md](./HOLOSCRIPT_FILE_TYPES.md).

## Overview

This document provides Brittney with comprehensive context about the HoloScript integration layer, all 10 systems, API patterns, and code generation guidelines.

**Audience**: Brittney AI model, system architects, advanced developers  
**Purpose**: Code generation for HoloScript systems, React components, and multiplayer features  
**Framework**: React + TypeScript + HoloScript  

---

## HoloScript File Types

> **IMPORTANT**: Brittney must understand when to generate `.holo` vs `.hsplus` syntax.

### `.holo` (Standard HoloScript)
- **Audience**: Students, beginners, prototyping
- **Features**: Objects, materials, basic interactions, simple animations, UI panels
- **Does NOT include**: Multiplayer, physics constraints, procedural gen, marketplace, analytics

### `.hsplus` (HoloScript Plus)
- **Audience**: Production, advanced developers
- **Features**: All `.holo` features PLUS all 10 system APIs
- **Includes**: Networking, physics constraints, procedural generation, marketplace, version control, parties, analytics, offline sync

### When to Generate Which Format

| User Request | Format | Reason |
|--------------|--------|--------|
| "Create a cube with red color" | `.holo` | Simple object, no systems needed |
| "Make a settings panel" | `.holo` | Basic UI, no networking |
| "Build a multiplayer game" | `.hsplus` | Requires NetworkedWorldState |
| "Add physics joints to a door" | `.hsplus` | Requires PhysicsConstraints |
| "Generate a procedural island" | `.hsplus` | Requires ProceduralGeneration |
| "Integrate with marketplace" | `.hsplus` | Requires HoloScriptMarketplace |

**See full guide**: [HOLOSCRIPT_FILE_TYPES.md](./HOLOSCRIPT_FILE_TYPES.md)

---

## Core Architecture

### System Hierarchy
```
10 .hsplus Systems (native language)
        ↓
HoloScriptSystemsAPI (TypeScript bridge)
        ↓
React Hooks Layer (10 custom hooks)
        ↓
React Components (browser/desktop/mobile)
        ↓
Optional Cloud APIs (Express.js)
```

### Access Pattern
```typescript
// Always use this pattern
import { getHoloScriptAPI } from '../services/HoloScriptSystemsAPI'

const api = getHoloScriptAPI()
// Then access: api.networking, api.physics, etc.
```

---

## 10 Systems API Reference

### 1. Networking System (Real-time Multiplayer)

**Purpose**: Synchronize game objects across network

**API**:
```typescript
api.networking.registerObject(object)
api.networking.unregisterObject(objectId)
api.networking.syncObject(objectId, state)

api.networking.syncedObjects  // Map of all synced objects
api.networking.on('objectUpdated', handler)
api.networking.on('objectCreated', handler)
api.networking.on('objectDeleted', handler)
```

**Usage Pattern**:
```typescript
// Register a player
api.networking.registerObject({
  id: 'player-123',
  x: 0, y: 0, z: 0,
  name: 'Player Name',
  health: 100
})

// Listen for updates
api.networking.on('objectUpdated', ({ objectId, state }) => {
  console.log(`${objectId} updated:`, state)
})

// Sync movement
api.networking.syncObject('player-123', { x: 5, y: 10, z: 0 })
```

---

### 2. Physics System (Constraints & Solver)

**Purpose**: Advanced physics with joints, springs, distance constraints

**API**:
```typescript
api.physics.applyJoint(obj1, obj2, options)
api.physics.applySpring(obj1, obj2, options)
api.physics.applyDistance(obj1, obj2, options)
api.physics.applySolver(iterations)

api.physics.constraints  // Map of all active constraints
api.physics.solverIterations  // Current iteration count
api.physics.on('constraintApplied', handler)
api.physics.on('solverTick', handler)
```

**Usage Pattern**:
```typescript
// Create joint between two objects
api.physics.applyJoint('obj1', 'obj2', { 
  offset: [0, 0, 0],
  rotationOffset: [0, 0, 0]
})

// Add spring constraint
api.physics.applySpring('obj1', 'anchor', {
  stiffness: 100,
  damping: 0.5,
  restLength: 5
})

// Run physics solver
await api.physics.applySolver(10)  // 10 iterations
```

---

### 3. Procedural Generation (Terrain & Structures)

**Purpose**: Deterministic procedural terrain and structure generation

**API**:
```typescript
api.generation.generateTerrain(width, height, options)
api.generation.generateIsland(radius, options)
api.generation.generateStructures(count, options)

api.generation.on('generationStart', handler)
api.generation.on('generationProgress', handler)
api.generation.on('generationComplete', handler)
```

**Usage Pattern**:
```typescript
// Generate terrain with seed
const terrain = await api.generation.generateTerrain(100, 100, {
  seed: 42,
  scale: 50,
  octaves: 5
})

// Generate island
const island = await api.generation.generateIsland(50, {
  seed: 123,
  waterLevel: 0.4
})

// Generate structures
const structures = await api.generation.generateStructures(10, {
  type: 'buildings',
  minHeight: 5,
  maxHeight: 20
})
```

---

### 4. Marketplace System (Share & Discover)

**Purpose**: Publish, search, and rate game content

**API**:
```typescript
api.marketplace.search(query, category)
api.marketplace.publish(item)
api.marketplace.download(itemId)
api.marketplace.rate(itemId, score, comment)

api.marketplace.cachedItems  // Map of downloaded items
api.marketplace.on('itemsLoaded', handler)
api.marketplace.on('publishSuccess', handler)
api.marketplace.on('downloadComplete', handler)
```

**Usage Pattern**:
```typescript
// Search marketplace
const results = await api.marketplace.search('world', 'buildings')

// Publish item
const published = await api.marketplace.publish({
  name: 'My World',
  description: 'A beautiful world with mountains',
  type: 'world',
  category: 'buildings',
  data: { /* world data */ }
})

// Download and use
const item = await api.marketplace.download(published.itemId)

// Rate item
await api.marketplace.rate(published.itemId, 5, 'Awesome!')
```

---

### 5. Version Control System (Scene Snapshots)

**Purpose**: Create snapshots, restore, merge, and compare scenes

**API**:
```typescript
api.versionControl.createSnapshot(name, data)
api.versionControl.restoreSnapshot(snapshotId)
api.versionControl.compareSnapshots(id1, id2)
api.versionControl.merge(id1, id2)

api.versionControl.snapshots  // Map of all snapshots
api.versionControl.on('snapshotCreated', handler)
api.versionControl.on('snapshotRestored', handler)
api.versionControl.on('mergeComplete', handler)
```

**Usage Pattern**:
```typescript
// Create snapshot
const snapshot = api.versionControl.createSnapshot('v1.0', {
  terrain: terrainData,
  objects: objectData,
  players: playerData
})

// Compare versions
const diff = api.versionControl.compareSnapshots(
  snapshot1.snapshotId,
  snapshot2.snapshotId
)

// Merge branches
const merged = api.versionControl.merge(
  mainSnapshot.snapshotId,
  featureSnapshot.snapshotId
)

// Restore from snapshot
const restored = api.versionControl.restoreSnapshot(snapshot.snapshotId)
```

---

### 6. Party System (Local Multiplayer Groups)

**Purpose**: Create and manage local player groups (no server required)

**API**:
```typescript
api.party.createParty(name, options)
api.party.joinParty(partyId)
api.party.leaveParty()
api.party.invitePlayer(playerName, options)
api.party.getLocalParties()

api.party.currentPartyId  // Current party ID
api.party.currentParty    // Current party data
api.party.discoveredParties  // Available parties to join
api.party.on('partyCreated', handler)
api.party.on('partyJoined', handler)
api.party.on('playerJoined', handler)
```

**Usage Pattern**:
```typescript
// Create party
const party = api.party.createParty('Game Night', {
  maxPlayers: 4,
  isPublic: true
})

// Invite player
const invite = api.party.invitePlayer('Friend', {
  expiresIn: 3600  // 1 hour
})

// Get local parties to join
const parties = api.party.getLocalParties()

// Join a party
const joined = api.party.joinParty(parties[0].id)

// Listen for player joins
api.party.on('playerJoined', ({ playerName, playerCount }) => {
  console.log(`${playerName} joined! Total: ${playerCount}`)
})
```

---

### 7. Analytics System (Event Tracking)

**Purpose**: Track player events and sessions without server

**API**:
```typescript
api.analytics.startSession(playerName)
api.analytics.endSession()
api.analytics.trackEvent(eventName, eventData)
api.analytics.getSessionReport()
api.analytics.exportAsCSV()

api.analytics.sessionId    // Current session ID
api.analytics.isRecording  // Whether recording
api.analytics.eventCount   // Total events tracked
api.analytics.on('sessionStarted', handler)
api.analytics.on('eventTracked', handler)
```

**Usage Pattern**:
```typescript
// Start tracking
const session = api.analytics.startSession('Player1')

// Track events
api.analytics.trackEvent('playerSpawned', {
  position: [0, 0, 0],
  timestamp: Date.now()
})

api.analytics.trackEvent('enemyDefeated', {
  enemyType: 'fire-mage',
  damageDealt: 150,
  timeSpent: 45.5
})

// Get report
const report = api.analytics.getSessionReport()
console.log(`${report.eventCount} events tracked`)

// Export data
const csv = api.analytics.exportAsCSV()
// Save or upload csv
```

---

### 8. Offline Sync System (Conflict Resolution)

**Purpose**: Queue updates offline, sync when online with conflict resolution

**API**:
```typescript
api.sync.trackLocalUpdate(update)
api.sync.syncAll()
api.sync.getPendingUpdates()
api.sync.getStats()

api.sync.pendingUpdates  // Number of queued updates
api.sync.isOnline        // Network status
api.sync.lastSyncTime    // Last successful sync
api.sync.on('syncStart', handler)
api.sync.on('syncComplete', handler)
api.sync.on('conflict', handler)
```

**Usage Pattern**:
```typescript
// Track update while offline
api.sync.trackLocalUpdate({
  objectId: 'player-123',
  state: { x: 10, y: 20 }
})

// Manually sync when ready
const result = await api.sync.syncAll()
console.log(`Synced ${result.synced} updates`)

// Or listen for auto-sync on reconnect
api.sync.on('syncComplete', ({ synced }) => {
  console.log(`Auto-synced ${synced} updates`)
})

// Check pending
const pending = api.sync.getPendingUpdates()
console.log(`${pending.length} updates waiting`)
```

---

### 9. Local Networking (P2P without Cloud)

**Purpose**: LAN-based peer-to-peer networking

**API**:
```typescript
api.network.startLocalParty(partyId, options)
api.network.broadcastPresence(playerName, data)
api.network.acceptPeer(peerId)
api.network.syncObjectState(objectId, state)

api.network.connectedPeers  // Set of peer IDs
api.network.on('peerConnected', handler)
api.network.on('peerDisconnected', handler)
api.network.on('presenceBroadcast', handler)
```

**Usage Pattern**:
```typescript
// Start local party
const party = api.network.startLocalParty('lan-game', {
  maxPlayers: 4,
  broadcastInterval: 1000  // 1 second
})

// Broadcast presence
api.network.broadcastPresence('Player1', {
  location: [5, 10, 0],
  health: 100,
  ready: true
})

// Accept new peers
api.network.on('presenceBroadcast', ({ peerId, playerName }) => {
  api.network.acceptPeer(peerId)
  console.log(`Connected to ${playerName}`)
})

// Sync objects between peers
api.network.syncObjectState('player-123', {
  x: 50, y: 100, z: 0
})
```

---

### 10. Example Worlds (Educational Templates)

**Purpose**: Pre-built playable worlds demonstrating all systems

**API**:
```typescript
api.examples.listWorlds()
api.examples.getWorldDetails(worldId)
api.examples.spawnWorld(worldName)

api.examples.activeWorlds  // Currently running worlds
api.examples.on('worldSpawned', handler)
api.examples.on('worldLoaded', handler)
```

**Usage Pattern**:
```typescript
// List available example worlds
const worlds = api.examples.listWorlds()
// Output: [
//   { id: 'arena', name: 'Arena', description: '...' },
//   { id: 'island', name: 'Island', description: '...' },
//   ...
// ]

// Get details
const arena = api.examples.getWorldDetails('arena')

// Spawn world
const spawned = await api.examples.spawnWorld('Arena')

// Track active
console.log(`${api.examples.activeWorlds.size} worlds running`)
```

---

## React Hook Patterns

### Each hook follows this pattern:

```typescript
export function useSystemName() {
  const api = getHoloScriptAPI()
  const [state1, setState1] = useState(initialValue)
  const [state2, setState2] = useState(initialValue)
  
  useEffect(() => {
    // Event listeners
    api.system.on('eventName', handler)
    
    return () => {
      // Cleanup
      api.system.off('eventName', handler)
    }
  }, [api])
  
  return {
    // Methods from API
    method1: api.system.method1,
    method2: api.system.method2,
    
    // State
    state1,
    state2
  }
}
```

### Integration in React:

```typescript
export function GameComponent() {
  const { networking, physics, party } = useAllSystems()
  
  // All states available
  console.log(networking.objectCount)
  console.log(physics.constraints)
  console.log(party.party?.name)
  
  // All methods available
  const handleSpawn = () => {
    networking.registerObject({ id: 'obj1', x: 0, y: 0 })
  }
  
  return <button onClick={handleSpawn}>Spawn Object</button>
}
```

---

## Event Bus

### Event Types (40+)

```typescript
// Networking (4 events)
'networking:objectUpdated'
'networking:objectCreated'
'networking:objectDeleted'
'networking:syncFailed'

// Physics (3 events)
'physics:constraintApplied'
'physics:solverTick'
'physics:collision'

// Generation (4 events)
'generation:generationStart'
'generation:generationProgress'
'generation:generationComplete'
'generation:generationFailed'

// Marketplace (5 events)
'marketplace:itemsLoaded'
'marketplace:publishSuccess'
'marketplace:downloadStart'
'marketplace:downloadComplete'
'marketplace:ratingSubmitted'

// VersionControl (5 events)
'versionControl:snapshotCreated'
'versionControl:snapshotRestored'
'versionControl:mergeStart'
'versionControl:mergeComplete'
'versionControl:conflictDetected'

// Party (4 events)
'party:partyCreated'
'party:partyJoined'
'party:partyLeft'
'party:partyDiscovered'

// Analytics (4 events)
'analytics:sessionStarted'
'analytics:sessionEnded'
'analytics:eventTracked'
'analytics:exportReady'

// Sync (6 events)
'sync:online'
'sync:offline'
'sync:syncStart'
'sync:syncComplete'
'sync:conflict'
'sync:updateQueued'

// Network (3 events)
'network:peerConnected'
'network:peerDisconnected'
'network:presenceBroadcast'

// Examples (3 events)
'examples:worldSpawned'
'examples:worldLoaded'
'examples:worldDestroyed'
```

### Using Event Bus:

```typescript
import { getEventBus } from '../services/HoloScriptEventBus'

const bus = getEventBus()

// Listen
bus.on('networking:objectUpdated', ({ objectId, state }) => {
  console.log('Update:', objectId, state)
})

// Emit (internal use mostly)
bus.emit('custom:event', { data: 'value' })

// Debug
bus.printLog({ limit: 10 })
console.log(bus.getStats())
```

---

## Code Generation Guidelines

### When generating HoloScript multiplayer code:

1. **Always use API pattern**:
```typescript
const api = getHoloScriptAPI()
// Not: import { networking, physics } ...
```

2. **Always handle cleanup**:
```typescript
useEffect(() => {
  api.system.on('event', handler)
  return () => api.system.off('event', handler)
}, [api])
```

3. **Always include types**:
```typescript
const handleUpdate = ({ objectId, state }: { 
  objectId: string
  state: unknown 
}) => { ... }
```

4. **Always use proper TypeScript**:
- Import types: `type MyType = ...`
- Use interfaces for complex data
- Avoid `any`, use `unknown` when needed
- Full type safety throughout

5. **For React components**:
- Use hooks for state management
- Use useCallback for event handlers
- Use useEffect for subscriptions
- Clean up all event listeners

6. **For multi-system interactions**:
- Use `useAllSystems()` when accessing multiple systems
- Track event sequence carefully
- Handle race conditions
- Consider offline scenarios

---

## Common Code Patterns

### Pattern 1: Register and Sync Objects

```typescript
const handleSpawnPlayer = () => {
  const playerId = `player-${Date.now()}`
  
  // Register
  api.networking.registerObject({
    id: playerId,
    x: 0, y: 0, z: 0,
    name: 'Player',
    health: 100
  })
  
  // Listen for updates
  api.networking.on('objectUpdated', ({ objectId, state }) => {
    if (objectId === playerId) {
      setPlayerPosition({ x: state.x, y: state.y, z: state.z })
    }
  })
  
  // Sync updates
  api.networking.syncObject(playerId, {
    x: 5, y: 10, z: 0
  })
}
```

### Pattern 2: Physics with Networking

```typescript
const handleAddConstraint = (obj1: string, obj2: string) => {
  // Create constraint
  api.physics.applyJoint(obj1, obj2, {
    offset: [0, 0, 0]
  })
  
  // Run solver
  api.physics.applySolver(10)
  
  // Sync both objects
  api.networking.syncObject(obj1, { constrained: true })
  api.networking.syncObject(obj2, { constrained: true })
  
  // Listen for solver ticks
  api.physics.on('solverTick', ({ iteration }) => {
    console.log(`Solver iteration: ${iteration}`)
  })
}
```

### Pattern 3: Party with Analytics

```typescript
const handleCreatePartyWithTracking = (partyName: string) => {
  // Start analytics session
  api.analytics.startSession('Player1')
  
  // Create party
  const party = api.party.createParty(partyName, { maxPlayers: 4 })
  
  // Track event
  api.analytics.trackEvent('partyCreated', {
    partyId: party.partyId,
    partyName: party.name,
    maxPlayers: party.maxPlayers
  })
  
  // Listen for player joins
  api.party.on('playerJoined', ({ playerName, playerCount }) => {
    api.analytics.trackEvent('playerJoined', {
      playerName,
      totalPlayers: playerCount
    })
  })
}
```

### Pattern 4: Offline Sync

```typescript
const handleOfflineUpdate = async (objectId: string, newState: any) => {
  // Check if online
  if (api.sync.isOnline) {
    // Sync immediately
    api.networking.syncObject(objectId, newState)
  } else {
    // Queue for later
    api.sync.trackLocalUpdate({ objectId, state: newState })
  }
  
  // Auto-sync when online
  api.sync.on('online', async () => {
    const result = await api.sync.syncAll()
    console.log(`Synced ${result.synced} updates`)
  })
}
```

---

## Best Practices

### DO:
✓ Use singleton pattern via `getHoloScriptAPI()`  
✓ Always handle event cleanup in useEffect  
✓ Type all parameters and return values  
✓ Use useCallback for event handlers  
✓ Check network status before syncing  
✓ Track events for analytics  
✓ Handle offline scenarios  
✓ Create snapshots before major changes  

### DON'T:
✗ Import systems directly, use API  
✗ Forget to unsubscribe from events  
✗ Use `any` type, use `unknown` instead  
✗ Assume always online  
✗ Create multiple API instances  
✗ Ignore error states  
✗ Leave event listeners in cleanup  
✗ Skip TypeScript type safety  

---

## Summary

**Key Concepts**:
- 10 independent systems unified under one API
- React hooks for easy component integration
- Event-driven architecture for debugging
- Offline-first with optional cloud sync
- Type-safe TypeScript throughout
- Singleton pattern for consistency

**Always Remember**:
1. Use `getHoloScriptAPI()` for access
2. Clean up event listeners
3. Handle offline scenarios
4. Track important events
5. Maintain TypeScript safety
6. Test multi-system interactions

---

This context should enable Brittney to generate high-quality code for HoloScript multiplayer features, components, and systems integration.
