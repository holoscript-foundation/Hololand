# Local-First Architecture Guide

## Overview

Complete local-first implementation with optional cloud sync. All features work offline - cloud is optional.

**Key Benefits:**
- ✅ Zero server costs for local parties
- ✅ Works completely offline (LAN + P2P)
- ✅ Optional cloud sync when connected
- ✅ Automatic conflict resolution
- ✅ Local analytics without infrastructure
- ✅ Party management without servers
- ✅ Scales to infinite local parties

## Systems Overview

### 1. PartySystem.hsplus
**Purpose:** Local player group management  
**Storage:** Local only (localStorage)  
**Network:** None required  

**Key Classes:**
- `PartyManager` - Create/join/leave parties locally
- `PartyDiscovery` - Find nearby parties via LAN broadcast

**Usage:**
```holoscript
// Create a party
let partyId = PartyManager.createParty("Battle Arena", 4)

// Join a party
PartyManager.joinParty(partyId)

// Invite players
PartyManager.invitePlayer("player_123", "PlayerName")

// Get current party
let party = PartyManager.getCurrentParty()

// Leave party
PartyManager.leaveParty()
```

**Events:**
- `party:created` - New party created
- `party:joined` - Player joined party
- `party:left` - Player left party
- `party:memberOffline` - Member went offline
- `party:allPlayersReady` - All members ready to start
- `party:discovered` - Found nearby party (LAN broadcast)

### 2. LocalAnalytics.hsplus
**Purpose:** Track metrics and events locally  
**Storage:** Local only (localStorage)  
**Network:** None required (optional cloud export)  

**Key Classes:**
- `LocalAnalytics` - Event tracking and metrics
- `AnalyticsDashboard` - Display live metrics

**Usage:**
```holoscript
// Track custom event
LocalAnalytics.trackEvent('playerKilled', 'combat', {
  attacker: 'player_123',
  damage: 45.5
})

// Track player joins/leaves
LocalAnalytics.trackPlayerJoin('player_456', 'PlayerName')
LocalAnalytics.trackPlayerLeave('player_456')

// Track combat
LocalAnalytics.trackCombatEvent('attacker_id', 'defender_id', 25.0)

// Track network
LocalAnalytics.trackNetworkEvent('packetSent', 256)

// Get session report
let report = LocalAnalytics.getSessionReport(sessionId)

// Export to CSV
let csv = LocalAnalytics.exportAsCSV()
```

**Metrics Tracked:**
- Total events
- Session duration
- Average FPS
- Peak memory usage
- Network bytes transferred
- Player join/leave
- Combat events
- Physics events
- World events

### 3. OfflineSync.hsplus
**Purpose:** Sync local changes to cloud when available  
**Storage:** Local queue + cloud (optional)  
**Network:** Uses when available, works offline  

**Key Classes:**
- `OfflineSync` - Queue and sync system
- Automatic conflict resolution
- Retry logic

**Usage:**
```holoscript
// Track update (queued locally)
OfflineSync.trackLocalUpdate('object_123', 'update', {
  position: [10, 5, 0],
  rotation: [0, 45, 0]
})

// Manual sync when online
OfflineSync.syncAll().then(result => {
  console.log(`Synced ${result.synced} updates`)
})

// Get pending updates
let pending = OfflineSync.getPendingUpdates()

// Get conflicts
let conflicts = OfflineSync.getConflicts()

// Manually resolve conflict
OfflineSync.resolveConflictManual('object_123', true)  // Use local version

// Get stats
let stats = OfflineSync.getStats()
console.log(`${stats.pendingUpdates} updates pending`)
console.log(`Estimated sync time: ${stats.estimatedSyncTime}s`)
```

**Configuration:**
```holoscript
OfflineSync.config = {
  enabled: true,                    // Enable sync
  endpoint: "https://api...",       // Cloud endpoint
  autoSync: true,                   // Auto-sync when online
  syncInterval: 30000,              // Check every 30s
  conflictResolution: "local-first", // local-first, cloud-first, manual
  compressionEnabled: true,         // Compress payloads
  batchSize: 50,                    // Sync N items at a time
  maxRetries: 3                     // Retry failed syncs
}
```

**Events:**
- `network:online` - Connection restored
- `network:offline` - Lost connection
- `sync:updateQueued` - Update added to queue
- `sync:batchSuccess` - Batch synced
- `sync:batchFailed` - Sync failed
- `sync:conflict` - Conflict detected
- `sync:conflictResolved` - Conflict resolved

### 4. LocalNetworking.hsplus (from previous)
**Purpose:** P2P multiplayer without cloud  
**Storage:** Local  
**Network:** LAN + P2P discovery  

**Features:**
- `LocalNetworkManager` - P2P connection management
- `MeshNetworkTopology` - Multi-hop networking
- `LocalStateStore` - Synchronized world state
- Offline conflict resolution

**Usage:**
```holoscript
// Start local multiplayer
LocalNetworkManager.startLocalParty("Battle Arena", 4)

// Broadcast presence on LAN
LocalNetworkManager.broadcastPresence()

// Accept peer connection
LocalNetworkManager.acceptPeer(peerId)

// Sync object state
LocalNetworkManager.syncObjectState(objectId, stateData)
```

## Example Worlds

### 1. LocalMultiplayerArena
4-player local battle arena with:
- Networked physics objects
- Spring and hinge constraints
- Real-time synchronization
- Local analytics
- Auto-snapshots

**Launch:**
```holoscript
import { LocalMultiplayerArena } from 'ExampleWorlds'

spawnWorld(LocalMultiplayerArena, {
  maxPlayers: 4,
  useCloudSync: false
})
```

### 2. ProceduralIsland
Randomly generated island with:
- Terrain generation (Perlin noise)
- NPC enemies
- Procedural structure placement
- 2-player cooperative
- Local version control

### 3. PhysicsSandbox
Physics testing environment:
- All constraint types
- Spring oscillation demo
- Ball socket ragdoll
- Hinge joint rotation
- Real-time metrics

### 4. MarketplaceShowcase
Browse and test templates:
- Download marketplace items locally
- Try templates offline
- Rate and review
- Share via party

### 5. CollaborativeBuilder
Multi-player building environment:
- Version control for every change
- Auto-snapshots every 30 seconds
- 3-way merge for conflicts
- Timeline of all edits
- 4-player collaboration

## Complete Flow Example

### Setting up a local party with analytics:

```holoscript
// 1. Create party
let partyId = PartyManager.createParty("My Game", 4)

// 2. Start analytics session
LocalAnalytics.startSession(partyId)

// 3. Launch world
spawnWorld(LocalMultiplayerArena, {
  maxPlayers: 4,
  partyId: partyId,
  useCloudSync: false  // Stay local only
})

// 4. Track events during play
on.objectCreated(object) => {
  OfflineSync.trackLocalUpdate(object.id, 'create', object.data)
  LocalAnalytics.trackWorldEvent(currentWorld.id, 'objectCreated', {
    objectId: object.id,
    type: object.type
  })
}

// 5. When ready to sync (if online)
if (OfflineSync.stats.isOnline) {
  OfflineSync.syncAll().then(result => {
    LocalAnalytics.trackEvent('syncCompleted', 'sync', {
      synced: result.synced,
      conflicts: result.conflicts?.length || 0
    })
  })
}

// 6. End session
PartyManager.leaveParty()
LocalAnalytics.endSession()

// 7. Export analytics
let csv = LocalAnalytics.exportAsCSV()
let report = LocalAnalytics.getSessionReport(LocalAnalytics.currentSessionId)
```

## Conflict Resolution

### Automatic (No Server)

**Scenario:** Two players edit same object offline, then sync

```
Local State: { position: [10, 5, 0], health: 90 }
Cloud State: { position: [8, 5, 0], health: 100 }
```

**Resolution Strategies:**

1. **local-first** (default)
   - Use local version for all fields
   - Good for: Single-player, creative tools
   
2. **cloud-first**
   - Use cloud version for all fields
   - Good for: Authoritative server scenarios
   
3. **merged**
   - Combine: Use newer timestamp
   - Cloud fields: [8, 5, 0], [100]
   - Local fields newer?: Override with local
   - Good for: Multi-field updates

4. **manual**
   - Emit event, wait for player decision
   - UI shows: "Local vs Cloud, choose:"
   - Good for: Important decisions

**Example:**
```holoscript
OfflineSync.config.conflictResolution = 'merged'

on.sync:conflict(event) => {
  console.log(`Conflict on ${event.objectId}`)
  // Merged automatically
}
```

## Cost Optimization

### Before (Cloud-Only)
- All multiplayer = cloud servers
- Parties = cloud database
- Analytics = cloud infrastructure
- **Cost:** $X per month minimum + per-user scaling

### After (Local-First)
- Local parties = free (LAN/P2P)
- Analytics = local storage
- Sync = optional, batched
- **Cost:** $0 for local, optional cloud sync only

### Cost Model
```
Local Usage:     FREE (all features work offline)
                 - Unlimited parties
                 - Unlimited players
                 - Unlimited sessions
                 
Cloud Sync:      $0.01 per 100KB synced
                 - Optional feature
                 - Batched to minimize transfers
                 - Compression enabled
                 
Storage:         $0.023 per GB/month
                 - Only for persistent clouds saves
                 - Analytics optional export
```

## Deployment Checklist

- [ ] Enable all 4 local systems
- [ ] Configure OfflineSync endpoint (or disable)
- [ ] Set conflict resolution strategy
- [ ] Test offline functionality
- [ ] Test LAN discovery
- [ ] Load example worlds
- [ ] Verify analytics collection
- [ ] Test sync when reconnecting
- [ ] Configure party discovery
- [ ] Set up analytics export

## Monitoring

### Real-Time Stats
```holoscript
let stats = OfflineSync.getStats()
console.log(`Online: ${stats.isOnline}`)
console.log(`Pending: ${stats.pendingUpdates} updates`)
console.log(`Sync Time: ${stats.estimatedSyncTime}s`)
```

### Analytics Dashboard
```holoscript
// Appears in UI
AnalyticsDashboard.render()
// Shows:
// - FPS
// - Memory
// - Network bytes
// - Recent events
// - Session duration
```

### Conflict Log
```holoscript
let conflicts = OfflineSync.getConflicts()
for (let conflict of conflicts) {
  console.log(`${conflict.objectId}: resolved as ${conflict.resolution}`)
}
```

## Troubleshooting

**Issue:** Updates not syncing
- Check: `OfflineSync.stats.isOnline`
- Check: `OfflineSync.config.autoSync`
- Manual: `OfflineSync.syncAll()`

**Issue:** Party members can't connect
- Check: `PartyDiscovery.discoveredParties`
- Check: Local firewall allows broadcast
- Manual: Share partyId directly

**Issue:** Conflicts happening frequently
- Use: `conflictResolution: "merged"` instead of "local-first"
- Consider: More frequent auto-sync

**Issue:** High memory usage
- Check: `LocalAnalytics.clearOldSessions(7)` - delete old data
- Check: `OfflineSync.syncQueue.totalBytes` - sync pending data
- Reduce: `maxLocalEvents` in LocalAnalytics

## Next Steps

1. **Deploy** local-first systems to production
2. **Monitor** first week (parties, conflicts, analytics)
3. **Optimize** based on usage patterns
4. **Scale** cloud sync endpoint if needed
5. **Add** cross-device sync (with conflict resolution)

All systems **work completely offline**. Cloud is **fully optional**.
