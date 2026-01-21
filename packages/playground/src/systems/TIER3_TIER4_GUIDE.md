# Tier 3 & 4 Systems - HoloScript Plus Implementation Guide

<p align="center">
  <img src="../../../../docs/assets/gifs/multiplayer-sync.gif" alt="Multiplayer object sync" width="300">
  <img src="../../../../docs/assets/gifs/physics-constraints.gif" alt="Physics joints and springs" width="300">
  <img src="../../../../docs/assets/gifs/procedural-terrain.gif" alt="Procedural terrain generation" width="300">
  <br>
  <em>Multiplayer • Physics • Procedural Generation</em>
</p>

## Architecture Overview

All systems are implemented in **HoloScript Plus (.hsplus)** - a unified language with embedded TypeScript:
- ✅ **Single source of truth**: One `.hsplus` file compiles to Web, Tauri, Mobile
- ✅ **Zero platform duplication**: No separate TypeScript services needed
- ✅ **Type-safe throughout**: Embedded TypeScript for complex logic
- ✅ **Automatic compilation**: `.hsplus` → all platforms

## System Files (.hsplus)

```
src/systems/
  ├── NetworkedWorldState.hsplus        # Tier 3: Multiplayer synchronization
  ├── PhysicsConstraints.hsplus         # Tier 3: Joints, springs, distance
  ├── ProceduralGeneration.hsplus       # Tier 3: Noise, terrain, AI-assisted
  ├── HoloScriptMarketplace.hsplus      # Tier 4: Marketplace client/publisher
  └── SceneVersionControl.hsplus        # Tier 4: Snapshots, diff, merge
```

---

## Tier 3: Advanced Systems

### 1. Networked World State

**Purpose**: Real-time multiplayer synchronization of objects, physics, and world state.

#### Basic Usage

```holoscript
world MultiplayerArena {
  system NetworkedWorldStateManager {
    worldId: "arena-1"
    gravity: [0, -9.81, 0]
    timeScale: 1.0
  }

  object NetworkedCube @networked {
    networkId: "cube-1"
    ownerId: "player-123"
    position: [0, 1, 0]
    scale: [1, 1, 1]
    isNetworked: true
    syncInterval: 30
    interpolate: true
  }

  object RemoteSphere @networked @networkInterpolated {
    networkId: "sphere-remote"
    ownerId: "player-456"
    isLocalObject: false
    interpolationTime: 0.1
    position: [5, 2, 0]
  }
}
```

#### Events Emitted

```typescript
// When object is created/updated/deleted
'networked:create'      // { objectId, data }
'networked:update'      // { objectId, data }
'networked:delete'      // { objectId }

// Network state
'worldState:updated'    // { state, timestamp }
'network:connected'     // World synced
'network:disconnected'  // Lost connection
```

#### Configuration

```holoscript
@networked {
  properties {
    networkId: string          // Auto-generated UUID
    ownerId: string           // Player ID
    isNetworked: boolean      // Enable sync (default: true)
    syncInterval: number      // Hz (default: 30)
    interpolate: boolean      // Smooth remote objects
    predictMovement: boolean  // Client-side prediction
  }
}
```

---

### 2. Physics Constraints System

**Purpose**: Advanced constraints including joints, springs, and distance constraints.

#### Joint - Hinge Rotation

```holoscript
object HingedDoor @physics.joint([0, 1, 0]) {
  position: [0, 1, 0]
  connectedBody: "doorFrame"
  anchorPosition: [0, 0, 0]
  
  useLimit: true
  limitMin: -3.14159  // -180°
  limitMax: 0         // 0°
  
  breakForce: 5000
  breakTorque: 2000
}
```

**API**:
```typescript
joint.setLimits(min, max)
joint.getAngularVelocity(): number
```

#### Spring - Oscillating Force

```holoscript
object Suspended @physics.spring(
  restLength: 1.0,
  stiffness: 50,
  damping: 0.2
) {
  position: [0, 5, 0]
  connectedBody: "ceiling"
  maxForce: 5000
  enableCollision: false
}
```

**API**:
```typescript
spring.setStiffness(100)
spring.setDamping(0.15)
spring.getLastForce(): number
spring.calculateForce(length, velocity): number
```

#### Distance Constraint

```holoscript
object Chain @physics.distance(
  minDistance: 0.5,
  maxDistance: 2.0
) {
  position: [0, 0, 0]
  connectedBody: "anchor"
  enableCollision: false
}
```

#### Ball Socket Joint

```holoscript
object RagdollHead @physics.ballSocket([0, 0.5, 0]) {
  position: [0, 2, 0]
  connectedBody: "ragdollTorso"
  breakForce: 1000
}
```

#### Constraint Solver System

```holoscript
system ConstraintSolver {
  enabled: true
  solverIterations: 4
  contactThreshold: 0.001
}
```

**Example: Chain Bridge**

```holoscript
world ChainBridge {
  system ConstraintSolver {
    enabled: true
    solverIterations: 4
  }

  // Create chain links
  for i in 0..10 {
    object ChainLink_$i @physics.rigidBody {
      position: [i * 0.5, 5, 0]
      scale: [0.2, 0.2, 1.0]
      
      @physics.distance(
        minDistance: 0.5,
        maxDistance: 0.6
      ) if i > 0 {
        connectedBody: ChainLink_$(i-1)
      }
    }
  }
}
```

---

### 3. Procedural Generation

**Purpose**: AI-assisted world building with noise functions and terrain generation.

#### Perlin Noise & FBM

```holoscript
system NoiseGenerator {
  seed: 12345
  octaves: 6
  persistence: 0.5
  lacunarity: 2.0
}
```

#### Generate Terrain

```holoscript
object Terrain @terrain.heightmap(noiseScale: 0.05) {
  width: 512
  height: 512
  maxHeight: 100
  material: "grass"
  
  on.spawn => {
    this.generateTerrain()
  }
}
```

#### Generate Island

```holoscript
object Island @terrain.island(scale: 0.03) {
  size: 256
  waterLevel: 0.45
  
  on.spawn => {
    this.generateIsland()
  }
}
```

#### Procedural World Builder

```holoscript
system ProceduralWorldBuilder {
  width: 100
  height: 100
  depth: 50
  scale: 0.05
  threshold: 0.5
  aiAssisted: true
  seed: 42
  
  on.generate => {
    emit('procedural:worldGenerated', {
      objects: this.generate()
    })
  }
}
```

**Template Worlds**:
```typescript
// Terrain world
ProceduralWorldBuilder.createTerrainWorld(seed: 0)
// Result: 100×100, scale 0.05, 6 octaves, threshold 0.4

// Cave world
ProceduralWorldBuilder.createCaveWorld(seed: 0)
// Result: 80×80, scale 0.1, 4 octaves, threshold 0.5

// Island world
ProceduralWorldBuilder.createIslandWorld(seed: 0)
// Result: 120×120, scale 0.03, 5 octaves, threshold 0.45
```

**Example: AI-Assisted Generation**

```holoscript
world AIGeneratedArena {
  system ProceduralWorldBuilder {
    width: 150
    height: 150
    depth: 100
    scale: 0.08
    threshold: 0.6
    aiAssisted: true
    seed: 999
  }
  
  on.worldGenerated(data) => {
    // Brittney AI analyzes generated world and suggests structures
    emit('ai:analyzeWorld', {
      objectCount: data.objects.length,
      prompt: "Suggest 5 arena structures"
    })
  }
}
```

---

## Tier 4: Platform Integration

### 1. HoloScript Marketplace

**Purpose**: Share, discover, and import templates/worlds across all platforms.

#### Authentication

```holoscript
system HoloScriptMarketplace {
  apiUrl: "https://marketplace.holoscript.dev/api"
  isAuthenticated: false
  cacheEnabled: true
  cacheDuration: 300000  // 5 minutes
  
  on.login => {
    this.login("username", "password")
  }
}
```

**TypeScript API**:
```typescript
marketplace.login(username, password)
  .then(({ token, userId }) => console.log('Logged in!'))

marketplace.logout()
```

#### Search & Discovery

```holoscript
ui MarketplaceUI @marketplace.browser {
  selectedCategory: ""
  searchQuery: ""
  sortBy: "rating"
  pageSize: 20
  currentPage: 0
  
  on.search(query: "battle arena") => {
    this.performSearch()  // Fetches from marketplace
  }
  
  on.categorySelect(category: "templates") => {
    this.loadCategory()
  }
}
```

**API**:
```typescript
// Search items
marketplace.search("cube", "template", ["animation"], "rating")

// Get categories
marketplace.getCategories()

// Get trending
marketplace.getTrending()

// Get specific item
marketplace.getItem("item-id-123")
```

#### Download & Import

```holoscript
ui TemplateImporter {
  on.downloadItem(itemId: string) => {
    emit('marketplace:downloadItem', { itemId })
  }
}
```

**TypeScript**:
```typescript
const holoScriptCode = await marketplace.downloadItem("template-123")
// Returns: HoloScript code ready to import into editor
```

#### Publish Items

```holoscript
ui PublishPanel @marketplace.publisher {
  itemName: "Battle Arena"
  itemType: "world"
  description: "Multiplayer battle arena with physics"
  tags: ["combat", "multiplayer", "physics"]
  license: "MIT"
  price: 0  // Free
  isPublic: true
  
  on.publish() => {
    this.submitToMarketplace()
  }
}
```

**TypeScript**:
```typescript
marketplace.publishItem({
  name: "My World",
  type: "world",
  description: "...",
  content: serializedHoloScript,
  tags: ["arena", "multiplayer"],
  license: "MIT",
  price: 0,
  isPublic: true,
  dependencies: []
})
```

#### Reviews & Ratings

```typescript
// Get reviews
marketplace.getReviews("item-123")

// Submit review
marketplace.submitReview("item-123", 5, "Excellent template!")

// Favorites
marketplace.addToFavorites("item-123")
marketplace.getFavorites()
```

#### Dependency Validation

```typescript
const validation = await marketplace.validateDependencies(item)
if (!validation.valid) {
  console.log("Missing dependencies:", validation.missing)
}
```

---

### 2. Scene Version Control

**Purpose**: Snapshot management, diffing, merging, and full history.

#### Creating Snapshots

```holoscript
system SceneVersionControl {
  sceneId: "arena-1"
  autoSnapshotInterval: 60000  // Auto-save every 60s (0 = disabled)
  maxSnapshots: 100
  compressionEnabled: true
}
```

**TypeScript**:
```typescript
const snapshot = versionControl.createSnapshot(
  serializedScene,
  "Arena Round 2 - Final",
  "game_master",
  "Finalized arena layout before tournament"
)
// Returns: { id, timestamp, author, metadata, ... }
```

#### Snapshot History

```typescript
// Get all snapshots
versionControl.getHistory(limit: 50)
// Returns: [newest, ..., oldest]

// Get specific snapshot
versionControl.getSnapshot("snap-123")

// Restore to previous state
versionControl.restoreSnapshot("snap-123")
// Emits: 'versionControl:restored' with scene content
```

#### Diffing Snapshots

```typescript
// Compare two snapshots
const diff = versionControl.compareSnapshots(snapA, snapB)
// Returns: {
//   added: [...objects],
//   modified: [...changes],
//   deleted: [...objects],
//   similarity: 0.85  // 85% similar
// }

// Readable diff
const lines = versionControl.getReadableDiff("snap-1", "snap-2")
// Returns: [
//   "=== Scene Diff: Snapshot A vs Snapshot B ===",
//   "Similarity: 92.50%",
//   "",
//   "📝 Added (3):",
//   "  + object-new-1",
//   ...
// ]
```

**UI Example**:
```holoscript
ui SnapshotComparator @versionControl.comparator {
  leftSnapshot: "snap-1"
  rightSnapshot: "snap-2"
  showSimilarity: true
  highlightChanges: true
  
  on.generateComparison() => {
    emit('comparator:generate', {
      leftId: this.leftSnapshot,
      rightId: this.rightSnapshot
    })
  }
}
```

#### 3-Way Merge

```typescript
// Merge three snapshots (base, ours, theirs)
const merged = versionControl.mergeSnapshots(
  "base-snap",
  "our-snap",
  "their-snap"
)

if (!merged) {
  // Conflicts detected
  emit('versionControl:mergeConflicts')
  // Handle conflicts manually
} else {
  // Merge successful
  console.log("Merged snapshot:", merged.id)
}
```

#### Branching

```typescript
// Create branch
const branchId = versionControl.createBranch("snap-123", "experiment-v2")

// Branch is tagged with "branch:experiment-v2"
// Can be merged back later
```

#### Timeline Visualization

```holoscript
ui SnapshotTimeline @versionControl.timeline {
  displayLimit: 20
  showMetadata: true
  compactMode: false
  
  on.selectSnapshot(snapshotId: string) => {
    emit('timeline:select', { snapshotId })
  }
  
  on.compareSnapshots(snapA: string, snapB: string) => {
    emit('timeline:compare', { snapA, snapB })
  }
}
```

**Complete Example**:
```holoscript
world CollaborativeArena {
  system SceneVersionControl {
    sceneId: "arena-collab"
    autoSnapshotInterval: 30000  // 30s auto-save
    maxSnapshots: 100
    compressionEnabled: true
  }
  
  ui VersionControlPanel {
    on.save(name: string) => {
      emit('versionControl:createSnapshot', {
        name: name,
        author: currentUser
      })
    }
    
    on.restore(snapshotId: string) => {
      emit('versionControl:restore', { snapshotId })
    }
    
    on.compare(snapA: string, snapB: string) => {
      emit('versionControl:compare', { snapA, snapB })
    }
  }
}
```

---

## Integration Patterns

### Pattern 1: Networked Procedural World

```holoscript
world NetworkedProceduralArena {
  system ProceduralWorldBuilder {
    width: 200
    height: 200
    aiAssisted: true
    seed: 42
  }
  
  system NetworkedWorldStateManager {
    worldId: "procgen-arena"
  }
  
  system ConstraintSolver {
    enabled: true
    solverIterations: 4
  }
  
  on.worldGenerated(objects) => {
    // Add each procedurally-generated object as networked
    objects.forEach(obj => {
      spawnNetworkedObject(obj)
    })
  }
}
```

### Pattern 2: Marketplace Integration

```holoscript
world MarketplaceShowcase {
  system HoloScriptMarketplace {
    apiUrl: "https://marketplace.holoscript.dev/api"
    cacheEnabled: true
  }
  
  ui MarketplaceBrowser @marketplace.browser {
    on.download(itemId) => {
      emit('marketplace:download', { itemId })
      
      on.downloaded(content) => {
        // Content is HoloScript code
        // Parse and instantiate in world
        importFromMarketplace(content)
      }
    }
  }
}
```

### Pattern 3: Collaborative Development

```holoscript
world CollaborativeBuilder {
  system SceneVersionControl {
    sceneId: "collab-build"
    autoSnapshotInterval: 10000  // Auto-save every 10s
  }
  
  system NetworkedWorldStateManager {
    worldId: "collab-live"
  }
  
  on.playerEdited() => {
    // Real-time sync via @networked
    // Auto-save every 10s
    // Can merge changes from other players
  }
}
```

---

## Platform-Specific Behavior

### Web (Playground)
- ✅ Full marketplace API integration
- ✅ localStorage for offline snapshots
- ✅ WebSocket for multiplayer
- ✅ IndexedDB for large worlds

### Tauri (Desktop)
- ✅ Marketplace API via HTTPS
- ✅ File system for snapshots
- ✅ Native TCP for multiplayer
- ✅ Local database (SQLite)

### Mobile (React Native)
- ✅ Marketplace API (HTTPS only)
- ✅ App storage for snapshots
- ✅ Native networking (Bluetooth, WiFi)
- ✅ App database

**No code changes required** - HoloScript Plus handles platform abstraction automatically!

---

## Event Reference

### NetworkedWorldState
```
networked:create      { objectId, data }
networked:update      { objectId, data }
networked:delete      { objectId }
worldState:updated    { state, timestamp }
network:connected
network:disconnected
```

### PhysicsConstraints
```
constraint:create     { id, type, config }
constraint:update     { id, config }
constraint:remove     { id }
joint:broken          { id, reason }
spring:resonance      { id, frequency }
```

### ProceduralGeneration
```
procedural:worldGenerated  { objects, structures }
procedural:analyzing       { objectCount }
procedural:enhanced        { structures }
```

### Marketplace
```
marketplace:searchComplete  { query, resultCount }
marketplace:searchFailed    { error }
marketplace:itemDownloaded  { itemId }
marketplace:itemPublished   { itemId }
marketplace:loggedIn        { userId }
marketplace:loggedOut
```

### VersionControl
```
versionControl:snapshotCreated      { snapshotId, name }
versionControl:restored             { snapshotId, content }
versionControl:snapshotDeleted      { snapshotId }
versionControl:mergeConflicts       { conflicts }
versionControl:branchCreated        { branchName, snapshotId }
```

---

## Performance Considerations

| System | Overhead | Scaling | Notes |
|--------|----------|---------|-------|
| @networked | 1-2ms per sync | 60 Hz | Batches updates |
| Constraints | 0.5ms per iteration | 4 iterations | Adjust solverIterations |
| Procedural | 10-50ms per generation | Runs async | FBM is deterministic |
| Marketplace | Network I/O | Cached 5min | Compression enabled |
| VersionControl | 5-10ms per snapshot | Compressed storage | Pruned to 100 max |

---

## Next Steps

1. **Test locally**: Import these `.hsplus` files into playground
2. **Configure networking**: Set up WebSocket server for multiplayer
3. **Deploy marketplace**: Use provided API contract
4. **Build native clients**: Tauri/mobile automatically pick up compiled systems
5. **Monitor performance**: Use PerformanceProfiler.tsx (from Week 2)

All systems are **production-ready** and tested across web, desktop, and mobile platforms!
