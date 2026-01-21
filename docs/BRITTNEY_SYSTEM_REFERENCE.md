# Brittney HoloScript Systems Reference

Complete technical reference for all 10 HoloScript systems integrated with React and TypeScript.

---

## System Overview

### Tier 3 Systems (Core Multiplayer)

| System | Purpose | Key Methods | State |
|--------|---------|-------------|-------|
| **Networking** | Real-time object sync | registerObject, syncObject, unregister | syncedObjects Map |
| **Physics** | Constraints & solver | applyJoint, applySpring, applyDistance, applySolver | constraints Map |
| **Generation** | Terrain & structures | generateTerrain, generateIsland, generateStructures | generation progress |

### Tier 4 Systems (Content & Version)

| System | Purpose | Key Methods | State |
|--------|---------|-------------|-------|
| **Marketplace** | Share & discover | search, publish, download, rate | cachedItems Map |
| **VersionControl** | Snapshots & merge | createSnapshot, restore, compare, merge | snapshots Map |

### Local-First Systems (Offline & Social)

| System | Purpose | Key Methods | State |
|--------|---------|-------------|-------|
| **Party** | Local groups | createParty, joinParty, invite, getLocal | currentParty/discoveredParties |
| **Analytics** | Event tracking | startSession, trackEvent, exportCSV | eventCount, sessionId |
| **Sync** | Offline queuing | trackLocalUpdate, syncAll, getPending | pendingUpdates count |
| **Network** | P2P LAN | startLocalParty, broadcastPresence, acceptPeer | connectedPeers Set |
| **Examples** | Demo worlds | listWorlds, spawnWorld, getDetails | activeWorlds Map |

---

## Detailed API Documentation

### NETWORKING SYSTEM

**File**: `NetworkedWorldState.hsplus` (Tier 3)  
**Purpose**: Synchronize game objects in real-time  
**Architecture**: Client-server with optional peer-to-peer  

#### Methods

```typescript
registerObject(object: {
  id: string
  x: number
  y: number
  z: number
  [key: string]: any
}): void
```
Registers object on network. Required fields: id, x, y, z. All additional properties are synced.

```typescript
syncObject(objectId: string, state: any): void
```
Updates object state across network. Should call frequently (every frame).

```typescript
unregisterObject(objectId: string): void
```
Removes object from network. Called on deletion or when out of scope.

#### State Properties

```typescript
syncedObjects: Map<string, any>
  // All currently synced objects
  // Usage: api.networking.syncedObjects.get('player-1')

objectCount: number
  // Total synced objects
  // Usage: console.log(`${api.networking.objectCount} objects`)

lastSync: number
  // Last sync timestamp (milliseconds)
  // Usage: const latency = Date.now() - api.networking.lastSync
```

#### Events

```typescript
'objectUpdated'
  // Fired when object state changes
  // Data: { objectId: string, state: unknown }

'objectCreated'
  // Fired when new object registered
  // Data: { objectId: string, state: unknown }

'objectDeleted'
  // Fired when object unregistered
  // Data: { objectId: string }

'syncFailed'
  // Fired when sync fails
  // Data: { objectId: string, reason: string }
```

#### Example Usage

```typescript
// Register player
api.networking.registerObject({
  id: 'player-1',
  x: 0, y: 0, z: 0,
  name: 'Alice',
  health: 100,
  rotation: 0
})

// Listen for other players
api.networking.on('objectCreated', ({ objectId, state }) => {
  console.log(`${state.name} joined the game`)
})

// Update each frame
const position = getPlayerPosition()
api.networking.syncObject('player-1', {
  x: position.x,
  y: position.y,
  z: position.z,
  rotation: position.rotation
})

// Check synced objects
const players = Array.from(api.networking.syncedObjects.values())
  .filter(obj => obj.type === 'player')
console.log(`${players.length} players in game`)
```

---

### PHYSICS SYSTEM

**File**: `PhysicsConstraints.hsplus` (Tier 3)  
**Purpose**: Advanced physics with joints, springs, distance constraints  
**Algorithm**: Constraint-based iterative solver  

#### Methods

```typescript
applyJoint(obj1: string, obj2: string, options: {
  offset: [number, number, number]
  rotationOffset: [number, number, number]
}): void
```
Creates rigid joint between two objects. Objects maintain relative position/rotation.

```typescript
applySpring(obj1: string, obj2: string, options: {
  stiffness: number      // 0-1000 (higher = stiffer)
  damping: number        // 0-1 (higher = more damped)
  restLength: number     // target distance
}): void
```
Creates spring constraint. Objects oscillate around rest length.

```typescript
applyDistance(obj1: string, obj2: string, options: {
  minDistance: number
  maxDistance: number
}): void
```
Constrains distance between objects to range.

```typescript
applySolver(iterations: number): Promise<void>
```
Runs physics solver. Higher iterations = more accurate but slower.

#### State Properties

```typescript
constraints: Map<string, any>
  // All active constraints
  // Key: constraint ID, Value: constraint data

solverIterations: number
  // Current solver iteration count (0-N)
  // Indicates solver progress if awaited

solverTime: number
  // Last solver execution time (ms)
  // Usage: if (api.physics.solverTime > 16) console.warn('Physics slow')
```

#### Events

```typescript
'constraintApplied'
  // Fired when constraint created/updated
  // Data: { constraintId: string, obj1: string, obj2: string }

'solverTick'
  // Fired each solver iteration
  // Data: { iteration: number, totalIterations: number }

'collision'
  // Fired on constraint violation
  // Data: { obj1: string, obj2: string, error: number }
```

#### Example Usage

```typescript
// Create pendulum
api.physics.applyJoint('anchor', 'pendulum', {
  offset: [0, 0, 0],
  rotationOffset: [0, 0, 0]
})

api.physics.applySpring('anchor', 'pendulum', {
  stiffness: 100,
  damping: 0.3,
  restLength: 5
})

// Run solver multiple times per frame
const startTime = performance.now()
await api.physics.applySolver(20)
const elapsed = performance.now() - startTime
console.log(`Physics solved in ${elapsed.toFixed(2)}ms`)

// Monitor solver
api.physics.on('solverTick', ({ iteration, totalIterations }) => {
  const progress = (iteration / totalIterations) * 100
  console.log(`Solving... ${progress.toFixed(0)}%`)
})
```

---

### PROCEDURAL GENERATION SYSTEM

**File**: `ProceduralGeneration.hsplus` (Tier 3)  
**Purpose**: Deterministic terrain and structure generation  
**Algorithm**: Perlin noise with octaves  

#### Methods

```typescript
generateTerrain(width: number, height: number, options: {
  seed: number
  scale: number         // noise scale (smaller = more detail)
  octaves: number       // 1-8 (more = more detail)
  persistence: number   // 0-1 (amplitude reduction per octave)
  lacunarity: number    // > 1 (frequency multiplier per octave)
}): Promise<TerrainData>
```
Generates heightmap using Perlin noise.

```typescript
generateIsland(radius: number, options: {
  seed: number
  waterLevel: number    // 0-1 (higher = more water)
  mountainPercent: number // 0-1
}): Promise<IslandData>
```
Generates island with water around edges.

```typescript
generateStructures(count: number, options: {
  type: string         // 'buildings' | 'trees' | 'rocks'
  minHeight: number
  maxHeight: number
  spacing: number      // minimum distance between structures
}): Promise<StructureData[]>
```
Generates placeable structures.

#### State Properties

```typescript
generationProgress: number
  // 0-100 (percentage complete)

isGenerating: boolean
  // True while generation in progress

lastGeneratedSeed: number
  // Seed of last successful generation
```

#### Events

```typescript
'generationStart'
  // Fired when generation begins
  // Data: { seed: number, type: string }

'generationProgress'
  // Fired during generation
  // Data: { progress: number (0-100) }

'generationComplete'
  // Fired when done
  // Data: { seed: number, entityCount: number }

'generationFailed'
  // Fired on error
  // Data: { error: string }
```

#### Example Usage

```typescript
// Generate large terrain
const terrain = await api.generation.generateTerrain(256, 256, {
  seed: 12345,
  scale: 50,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2
})

// Listen to progress
api.generation.on('generationProgress', ({ progress }) => {
  console.log(`Generation ${progress}% complete`)
})

// Generate island with predictable output
const island = await api.generation.generateIsland(100, {
  seed: Date.now(),  // Same seed = same island
  waterLevel: 0.3,
  mountainPercent: 0.2
})

// Generate structures
const buildings = await api.generation.generateStructures(50, {
  type: 'buildings',
  minHeight: 5,
  maxHeight: 20,
  spacing: 10
})

console.log(`Generated ${buildings.length} buildings`)
```

---

### MARKETPLACE SYSTEM

**File**: `HoloScriptMarketplace.hsplus` (Tier 4)  
**Purpose**: Discover, publish, and rate game content  
**Storage**: Local cache + optional cloud sync  

#### Methods

```typescript
search(query: string, category?: string): Promise<SearchResult[]>
```
Searches marketplace for items. Returns cached results.

```typescript
publish(item: {
  name: string
  description: string
  type: string         // 'world' | 'asset' | 'script'
  category: string
  data: any
  thumbnail?: string
}): Promise<{ itemId: string, url: string }>
```
Publishes item to marketplace.

```typescript
download(itemId: string): Promise<{ itemId: string, data: any }>
```
Downloads item. Cached locally for offline use.

```typescript
rate(itemId: string, score: 1-5, comment?: string): Promise<void>
```
Submits rating and optional review.

#### State Properties

```typescript
cachedItems: Map<string, any>
  // Downloaded items stored locally
  // Available even when offline

searchCache: Map<string, SearchResult[]>
  // Recent search results

myPublished: Array<{ itemId: string, name: string, rating: number }>
  // Items published by current player

totalDownloads: number
  // Download count across all items
```

#### Events

```typescript
'itemsLoaded'
  // Fired when search results loaded
  // Data: { query: string, resultCount: number }

'publishSuccess'
  // Fired when item published
  // Data: { itemId: string, name: string }

'downloadStart'
  // Fired when download begins
  // Data: { itemId: string, name: string }

'downloadComplete'
  // Fired when download finished
  // Data: { itemId: string, size: number }

'ratingSubmitted'
  // Fired when rating submitted
  // Data: { itemId: string, score: number }
```

#### Example Usage

```typescript
// Search marketplace
const results = await api.marketplace.search('castle', 'buildings')
console.log(`Found ${results.length} results`)

// Download and use
if (results.length > 0) {
  const castle = await api.marketplace.download(results[0].itemId)
  console.log('Downloaded:', castle.data)
}

// Publish created world
const published = await api.marketplace.publish({
  name: 'My Epic Castle',
  description: 'A beautiful castle with towers',
  type: 'world',
  category: 'buildings',
  data: {
    terrain: terrainData,
    structures: structureData
  },
  thumbnail: base64ImageData
})

console.log(`Published! ID: ${published.itemId}`)

// Rate an item
await api.marketplace.rate(published.itemId, 5, 'I love this!')

// Use cached item anytime
const cached = api.marketplace.cachedItems.get(published.itemId)
```

---

### VERSION CONTROL SYSTEM

**File**: `SceneVersionControl.hsplus` (Tier 4)  
**Purpose**: Create, compare, merge, and restore scene snapshots  
**Use Case**: Save points, branching worlds, undo/redo  

#### Methods

```typescript
createSnapshot(name: string, data: {
  terrain?: any
  objects?: any
  players?: any
  [key: string]: any
}): Snapshot
```
Creates immutable snapshot of current state.

```typescript
restoreSnapshot(snapshotId: string): Promise<any>
```
Restores world to snapshot state.

```typescript
compareSnapshots(id1: string, id2: string): {
  added: string[]
  modified: string[]
  deleted: string[]
}
```
Compares two snapshots and returns diff.

```typescript
merge(mainId: string, featureId: string): Snapshot
```
Merges feature branch into main. Handles conflicts.

#### State Properties

```typescript
snapshots: Map<string, Snapshot>
  // All created snapshots
  // Immutable once created

snapshotCount: number
  // Total snapshots stored

largestSnapshot: number
  // Size of largest snapshot (bytes)
```

#### Events

```typescript
'snapshotCreated'
  // Fired when snapshot created
  // Data: { snapshotId: string, name: string, size: number }

'snapshotRestored'
  // Fired when restored
  // Data: { snapshotId: string, name: string }

'mergeStart'
  // Fired when merge begins
  // Data: { mainId: string, featureId: string }

'mergeComplete'
  // Fired when merge done
  // Data: { resultId: string, conflicts: number }

'conflictDetected'
  // Fired on merge conflict
  // Data: { key: string, mainValue: any, featureValue: any }
```

#### Example Usage

```typescript
// Save game
const checkpoint = api.versionControl.createSnapshot('level-1-complete', {
  terrain: currentTerrain,
  objects: currentObjects,
  playerStats: { kills: 10, deaths: 2 }
})

// Later, restore save
const restored = await api.versionControl.restoreSnapshot(checkpoint.snapshotId)

// Compare versions
const diff = api.versionControl.compareSnapshots(
  checkpoint.snapshotId,
  'current'
)

console.log(`Added: ${diff.added.length}, Modified: ${diff.modified.length}`)

// Merge development branch into release
const release = await api.versionControl.merge(
  'main',
  'feature/new-world'
)

console.log('Release merged!')
```

---

### PARTY SYSTEM

**File**: `PartySystem.hsplus` (Local-First)  
**Purpose**: Create local multiplayer groups without server  
**Scope**: Single LAN/WiFi network  

#### Methods

```typescript
createParty(name: string, options: {
  maxPlayers: number
  isPublic: boolean
  password?: string
}): Party
```
Creates new party. Returns party ID for joining.

```typescript
joinParty(partyId: string): Promise<{ success: boolean }>
```
Joins existing party if space available.

```typescript
leaveParty(): void
```
Leaves current party.

```typescript
invitePlayer(playerName: string, options: {
  expiresIn: number  // seconds
}): Invite
```
Creates invite link/code for specific player.

```typescript
getLocalParties(): Party[]
```
Lists available parties on network.

#### State Properties

```typescript
currentPartyId: string | null
  // Current party ID or null

currentParty: Party | null
  // Current party details including members

discoveredParties: Party[]
  // Available parties to join on network

inParty: boolean
  // True if in a party

memberCount: number
  // Number of players in current party
```

#### Events

```typescript
'partyCreated'
  // Fired when party created
  // Data: { partyId: string, name: string, creator: string }

'partyJoined'
  // Fired when player joins party
  // Data: { partyId: string, playerId: string, playerName: string }

'partyLeft'
  // Fired when player leaves
  // Data: { partyId: string, playerId: string, playerCount: number }

'partyDiscovered'
  // Fired when local party found
  // Data: { partyId: string, name: string, playerCount: number }
```

#### Example Usage

```typescript
// Create party for friends
const party = api.party.createParty('Gaming Session', {
  maxPlayers: 4,
  isPublic: true
})

// Get link to send to friend
const invite = api.party.invitePlayer('John', {
  expiresIn: 3600  // 1 hour
})

console.log(`Share this code: ${invite.code}`)

// Friend can see local parties
const parties = api.party.getLocalParties()
const myParty = parties.find(p => p.id === party.partyId)

// Friend joins
await api.party.joinParty(myParty.partyId)

// Listen for joins
api.party.on('partyJoined', ({ playerName, playerCount }) => {
  console.log(`${playerName} joined! Now ${playerCount} players`)
})

// Get current party info
console.log(`Party: ${api.party.currentParty?.name}`)
console.log(`Members: ${api.party.memberCount}`)
```

---

### ANALYTICS SYSTEM

**File**: `LocalAnalytics.hsplus` (Local-First)  
**Purpose**: Track player events and sessions locally  
**Storage**: Browser localStorage or IndexedDB  

#### Methods

```typescript
startSession(playerName: string): { sessionId: string }
```
Begins recording session.

```typescript
endSession(): void
```
Ends recording. Can still export data.

```typescript
trackEvent(eventName: string, eventData?: any): void
```
Records event with optional data.

```typescript
getSessionReport(): {
  sessionId: string
  playerName: string
  startTime: number
  endTime: number
  eventCount: number
  events: any[]
}
```
Returns all events in current session.

```typescript
exportAsCSV(): string
```
Exports session as CSV for analysis.

#### State Properties

```typescript
sessionId: string | null
  // Current session ID

isRecording: boolean
  // Whether actively tracking

eventCount: number
  // Total events in session

totalSessions: number
  // Historical session count
```

#### Events

```typescript
'sessionStarted'
  // Fired when session created
  // Data: { sessionId: string, playerName: string }

'sessionEnded'
  // Fired when session ended
  // Data: { sessionId: string, eventCount: number }

'eventTracked'
  // Fired when event recorded
  // Data: { eventName: string }

'exportReady'
  // Fired when export complete
  // Data: { format: 'csv' | 'json', size: number }
```

#### Example Usage

```typescript
// Start tracking
const session = api.analytics.startSession('Player1')

// Track gameplay events
api.analytics.trackEvent('enemyDefeated', {
  enemyType: 'skeleton',
  damageDealt: 150,
  timeSpent: 45.5
})

api.analytics.trackEvent('itemPickup', {
  itemName: 'health potion',
  quantity: 3,
  position: [10, 20, 0]
})

// Get report
const report = api.analytics.getSessionReport()
console.log(`${report.eventCount} events tracked`)
console.log(`Session lasted ${report.endTime - report.startTime}ms`)

// Export for sharing
const csv = api.analytics.exportAsCSV()
// Save to file or send to server
```

---

### OFFLINE SYNC SYSTEM

**File**: `OfflineSync.hsplus` (Local-First)  
**Purpose**: Queue updates offline, sync when online  
**Conflict Resolution**: Last-write-wins with history  

#### Methods

```typescript
trackLocalUpdate(update: {
  objectId: string
  state: any
}): void
```
Queues update for later sync.

```typescript
syncAll(): Promise<{ synced: number, failed: number }>
```
Syncs all pending updates. Returns result.

```typescript
getPendingUpdates(): Update[]
```
Lists updates waiting to sync.

```typescript
getStats(): {
  pending: number
  synced: number
  failed: number
  lastSyncTime: number
}
```
Returns sync statistics.

#### State Properties

```typescript
pendingUpdates: number
  // Count of updates waiting to sync

isOnline: boolean
  // Current network status

lastSyncTime: number
  // Timestamp of last sync

syncProgress: number
  // 0-100 (percentage synced)
```

#### Events

```typescript
'online'
  // Fired when connection restored
  // Data: {}

'offline'
  // Fired when connection lost
  // Data: {}

'syncStart'
  // Fired when sync begins
  // Data: { updateCount: number }

'syncComplete'
  // Fired when sync done
  // Data: { synced: number, failed: number }

'conflict'
  // Fired on conflict
  // Data: { objectId: string, localState: any, remoteState: any }

'updateQueued'
  // Fired when update queued
  // Data: { objectId: string }
```

#### Example Usage

```typescript
// Track update while offline
api.sync.trackLocalUpdate({
  objectId: 'player-1',
  state: { x: 50, y: 100, z: 0 }
})

console.log(`${api.sync.pendingUpdates} updates waiting`)

// Auto-sync when online
api.sync.on('online', async () => {
  const result = await api.sync.syncAll()
  console.log(`Synced ${result.synced}/${result.synced + result.failed}`)
})

// Handle conflicts
api.sync.on('conflict', ({ objectId, localState, remoteState }) => {
  console.log(`Conflict on ${objectId}`)
  // Keep local version or merge
  api.sync.trackLocalUpdate({ objectId, state: localState })
})

// Check stats
const stats = api.sync.getStats()
console.log(`Sync: ${stats.synced} OK, ${stats.failed} failed`)
```

---

### LOCAL NETWORKING (P2P)

**File**: `LocalNetworking.hsplus` (Local-First)  
**Purpose**: LAN-based peer-to-peer without cloud  
**Transport**: UDP broadcast + TCP connections  

#### Methods

```typescript
startLocalParty(partyId: string, options: {
  broadcastInterval: number  // milliseconds
  maxPeers: number
}): void
```
Starts P2P party on LAN.

```typescript
broadcastPresence(playerName: string, data: any): void
```
Announces player presence to nearby peers.

```typescript
acceptPeer(peerId: string): void
```
Accepts peer connection.

```typescript
syncObjectState(objectId: string, state: any): void
```
Syncs object state peer-to-peer.

#### State Properties

```typescript
connectedPeers: Set<string>
  // Currently connected peer IDs

isActive: boolean
  // True if P2P active

peerCount: number
  // Number of connected peers
```

#### Events

```typescript
'peerConnected'
  // Fired when peer joins
  // Data: { peerId: string, playerName: string }

'peerDisconnected'
  // Fired when peer leaves
  // Data: { peerId: string, playerName: string }

'presenceBroadcast'
  // Fired when presence received
  // Data: { peerId: string, playerName: string, data: any }

'objectSynced'
  // Fired when object state received
  // Data: { peerId: string, objectId: string, state: any }
```

#### Example Usage

```typescript
// Start local game
api.network.startLocalParty('game-session', {
  broadcastInterval: 100,
  maxPeers: 4
})

// Announce yourself
api.network.broadcastPresence('Player1', {
  location: [0, 0, 0],
  health: 100,
  ready: true
})

// Listen for nearby players
api.network.on('presenceBroadcast', ({ peerId, playerName, data }) => {
  console.log(`${playerName} is near!`)
  api.network.acceptPeer(peerId)
  
  // Now connected to peer
  api.network.syncObjectState('player-1', {
    x: 10, y: 20, z: 0
  })
})

console.log(`Connected to ${api.network.peerCount} peers`)
```

---

### EXAMPLE WORLDS

**File**: `ExampleWorlds.hsplus` (Local-First)  
**Purpose**: Pre-built playable worlds for learning  
**Includes**: Arena, Island, Maze, Dungeon  

#### Methods

```typescript
listWorlds(): Array<{
  id: string
  name: string
  description: string
}>
```
Lists all available example worlds.

```typescript
getWorldDetails(worldId: string): WorldDetails
```
Gets world info, size, and features.

```typescript
spawnWorld(worldName: string): Promise<{ success: boolean }>
```
Loads and initializes world.

#### State Properties

```typescript
activeWorlds: Map<string, World>
  // Currently running worlds

worldCount: number
  // Total playable worlds

lastSpawned: string | null
  // ID of last spawned world
```

#### Events

```typescript
'worldSpawned'
  // Fired when world loaded
  // Data: { worldId: string, name: string }

'worldLoaded'
  // Fired when ready to play
  // Data: { worldId: string, playerCount: number }

'worldDestroyed'
  // Fired when world unloaded
  // Data: { worldId: string }
```

#### Example Usage

```typescript
// List available
const worlds = api.examples.listWorlds()
// Output: [
//   { id: 'arena', name: 'Arena', description: 'PvP arena' },
//   { id: 'island', name: 'Island', description: 'Exploration' }
// ]

// Get details
const arena = api.examples.getWorldDetails('arena')
console.log(`Arena: ${arena.description}`)
console.log(`Max players: ${arena.maxPlayers}`)

// Spawn world
const spawned = await api.examples.spawnWorld('Arena')

// Track active
api.examples.on('worldLoaded', ({ worldId, playerCount }) => {
  console.log(`${worldId} loaded with ${playerCount} players`)
})

console.log(`${api.examples.activeWorlds.size} worlds running`)
```

---

## Integration Patterns

### Multi-System Hooks

```typescript
// useAllSystems() provides access to all 10
export function GameComponent() {
  const all = useAllSystems()
  
  // All systems available
  all.networking    // Sync objects
  all.physics       // Physics solver
  all.generation    // Terrain generation
  all.marketplace   // Content sharing
  all.versionControl // Snapshots
  all.party        // Local groups
  all.analytics    // Event tracking
  all.sync         // Offline queuing
  all.network      // P2P LAN
  all.examples     // Demo worlds
}
```

### Best Practice Pattern

```typescript
export function FeatureComponent() {
  const { system1, system2 } = useAllSystems()
  const [state, setState] = useState()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const handler = (data: any) => setState(data)
    system1.on('event', handler)
    
    return () => system1.off('event', handler)
  }, [system1])

  const handleAction = useCallback(async () => {
    try {
      await system2.doSomething()
      setState(prev => ({...prev, updated: true}))
    } catch (err) {
      setError(err.message)
    }
  }, [system2])

  if (error) return <div>{error}</div>
  return <button onClick={handleAction}>Action</button>
}
```

---

## Testing Integration

Each system has corresponding test coverage:

- **Unit Tests**: Individual system methods
- **Integration Tests**: Multi-system interactions
- **Event Tests**: Event ordering and data
- **Performance Tests**: Sync latency, solver speed
- **Offline Tests**: Queue and conflict resolution

See `HoloScriptSystemsAPI.test.ts` and `.integration.test.ts`.

---

## Performance Considerations

| Operation | Typical Time | Notes |
|-----------|--------------|-------|
| Object sync | 1-5ms | Per object |
| Physics solve | 5-20ms | 10 iterations |
| Terrain gen | 100-500ms | 256x256 map |
| Marketplace search | 50-200ms | Cached |
| Snapshot create | 10-50ms | Size dependent |
| Party discovery | 100-500ms | Network dependent |
| Event tracking | <1ms | Per event |
| Offline sync | 10-100ms | Per update |
| P2P sync | 5-15ms | LAN dependent |

---

This reference should give Brittney complete understanding of all 10 systems and their integration patterns.
