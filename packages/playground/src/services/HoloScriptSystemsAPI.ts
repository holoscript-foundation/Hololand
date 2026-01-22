/**
 * HoloScript Systems API - Unified Interface to All 10 .hsplus Systems
 * 
 * This file bridges all .hsplus systems (created in HoloScript Plus) to React components.
 * Provides event emitters, state management, and method exposure for browser integration.
 * 
 * Systems:
 * - Tier 3: NetworkedWorldState, PhysicsConstraints, ProceduralGeneration
 * - Tier 4: HoloScriptMarketplace, SceneVersionControl
 * - Local-First: PartySystem, LocalAnalytics, OfflineSync, LocalNetworking, ExampleWorlds
 */

import { EventEmitter } from 'events'

// ============================================================================
// COMMON TYPES
// ============================================================================

type EventCallback = (...args: unknown[]) => void

// ============================================================================
// SYSTEM STATE INTERFACES
// ============================================================================

interface NetworkedWorldStateAPI {
  // Methods
  syncObject: (objectId: string, state: object) => void
  registerObject: (objectId: string) => void
  unregisterObject: (objectId: string) => void
  
  // State
  syncedObjects: Map<string, object>
  lastSync: number
  
  // Events
  on: (event: 'objectUpdated' | 'objectCreated' | 'objectDeleted' | 'conflict', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

interface PhysicsConstraintsAPI {
  // Methods
  applyJoint: (objectId: string, axis: [number, number, number], limits?: [number, number]) => void
  applySpring: (objectId: string, stiffness: number, damping: number) => void
  applyDistance: (objectId: string, min: number, max: number) => void
  applySolver: () => void
  
  // State
  constraints: Map<string, object>
  solverIterations: number
  
  // Events
  on: (event: 'constraintApplied' | 'solverTick', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

interface ProceduralGenerationAPI {
  // Methods
  generateTerrain: (width: number, height: number, seed: number) => Promise<object>
  generateIsland: (size: number, seed: number) => Promise<object>
  generateStructures: (terrain: object, count: number) => Promise<object[]>
  
  // State
  lastGenerated: { seed: number; timestamp: number }
  
  // Events
  on: (event: 'generationStart' | 'generationProgress' | 'generationComplete', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

interface HoloScriptMarketplaceAPI {
  // Methods
  search: (query: string, category?: string) => Promise<object[]>
  publish: (item: object) => Promise<string>
  download: (itemId: string) => Promise<object>
  rate: (itemId: string, rating: number) => Promise<void>
  
  // State
  items: Map<string, object>
  userPublished: string[]
  
  // Events
  on: (event: 'itemsLoaded' | 'publishSuccess' | 'downloadStart' | 'downloadComplete', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

interface SceneVersionControlAPI {
  // Methods
  createSnapshot: (name: string) => Promise<string>
  restoreSnapshot: (snapshotId: string) => Promise<void>
  compareSnapshots: (snapA: string, snapB: string) => Promise<object>
  merge: (snapA: string, snapB: string) => Promise<object>
  
  // State
  snapshots: Map<string, object>
  currentSnapshot: string | null
  history: string[]
  
  // Events
  on: (event: 'snapshotCreated' | 'snapshotRestored' | 'mergeConflict', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

interface PartySystemAPI {
  // Methods
  createParty: (name: string, maxPlayers: number) => string
  joinParty: (partyId: string) => boolean
  leaveParty: () => boolean
  invitePlayer: (playerId: string, playerName: string) => boolean
  getLocalParties: () => object[]
  
  // State
  currentPartyId: string | null
  currentParty: object | null
  
  // Events
  on: (event: 'partyCreated' | 'partyJoined' | 'partyLeft' | 'memberOffline' | 'partyDiscovered', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

interface LocalAnalyticsAPI {
  // Methods
  startSession: (partyId: string) => string
  endSession: () => void
  trackEvent: (eventName: string, category: string, data?: object) => void
  getSessionReport: (sessionId: string) => object | null
  exportAsCSV: () => string
  
  // State
  isRecording: boolean
  currentSessionId: string | null
  events: object[]
  
  // Events
  on: (event: 'sessionStarted' | 'sessionEnded' | 'eventTracked', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

interface OfflineSyncAPI {
  // Methods
  trackLocalUpdate: (objectId: string, operation: string, data: object) => void
  syncAll: () => Promise<object>
  getPendingUpdates: () => object[]
  resolveConflictManual: (objectId: string, useLocal: boolean) => boolean
  getStats: () => object
  
  // State
  isOnline: boolean
  pendingUpdates: object[]
  
  // Events
  on: (event: 'online' | 'offline' | 'syncStart' | 'syncComplete' | 'conflict', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

interface LocalNetworkingAPI {
  // Methods
  startLocalParty: (name: string, maxPlayers: number) => void
  broadcastPresence: () => void
  acceptPeer: (peerId: string) => void
  syncObjectState: (objectId: string, state: object) => void
  
  // State
  connectedPeers: string[]
  
  // Events
  on: (event: 'peerConnected' | 'peerDisconnected' | 'stateSync', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

interface ExampleWorldsAPI {
  // Methods
  spawnWorld: (worldName: string) => Promise<object>
  getWorldDetails: (worldId: string) => object | null
  listWorlds: () => string[]
  
  // State
  activeWorlds: Map<string, object>
  
  // Events
  on: (event: 'worldSpawned' | 'worldLoaded', callback: EventCallback) => void
  off: (event: string, callback: EventCallback) => void
}

// ============================================================================
// HOLOSCRIPT SYSTEMS API - MAIN CLASS
// ============================================================================

export class HoloScriptSystemsAPI {
  // System instances (initialized in constructor via initializeSystems)
  private networkingSystem!: NetworkedWorldStateAPI
  private physicsSystem!: PhysicsConstraintsAPI
  private generationSystem!: ProceduralGenerationAPI
  private marketplaceSystem!: HoloScriptMarketplaceAPI
  private versionControlSystem!: SceneVersionControlAPI
  private partySystem!: PartySystemAPI
  private analyticsSystem!: LocalAnalyticsAPI
  private syncSystem!: OfflineSyncAPI
  private networkSystem!: LocalNetworkingAPI
  private examplesSystem!: ExampleWorldsAPI
  
  // Event bus
  private eventBus: EventEmitter
  
  // State
  private initialized: boolean = false
  
  constructor() {
    this.eventBus = new EventEmitter()
    this.initializeSystems()
  }
  
  /**
   * Initialize all 10 systems
   */
  private initializeSystems(): void {
    // Tier 3 Systems
    this.networkingSystem = this.createNetworkingSystem()
    this.physicsSystem = this.createPhysicsSystem()
    this.generationSystem = this.createGenerationSystem()
    
    // Tier 4 Systems
    this.marketplaceSystem = this.createMarketplaceSystem()
    this.versionControlSystem = this.createVersionControlSystem()
    
    // Local-First Systems
    this.partySystem = this.createPartySystem()
    this.analyticsSystem = this.createAnalyticsSystem()
    this.syncSystem = this.createSyncSystem()
    this.networkSystem = this.createNetworkSystem()
    this.examplesSystem = this.createExamplesSystem()
    
    this.initialized = true
  }
  
  // ========================================================================
  // SYSTEM CREATORS
  // ========================================================================
  
  private createNetworkingSystem(): NetworkedWorldStateAPI {
    return {
      syncedObjects: new Map(),
      lastSync: 0,
      syncObject: (objectId: string, state: object) => {
        this.networkingSystem.syncedObjects.set(objectId, state)
        this.networkingSystem.lastSync = Date.now()
        this.eventBus.emit('networking:objectUpdated', { objectId, state })
      },
      registerObject: (objectId: string) => {
        this.networkingSystem.syncedObjects.set(objectId, {})
        this.eventBus.emit('networking:objectCreated', { objectId })
      },
      unregisterObject: (objectId: string) => {
        this.networkingSystem.syncedObjects.delete(objectId)
        this.eventBus.emit('networking:objectDeleted', { objectId })
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`networking:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`networking:${event}`, callback)
      }
    }
  }
  
  private createPhysicsSystem(): PhysicsConstraintsAPI {
    return {
      constraints: new Map(),
      solverIterations: 4,
      applyJoint: (objectId: string, axis: [number, number, number], limits?: [number, number]) => {
        this.physicsSystem.constraints.set(`${objectId}:joint`, { axis, limits })
        this.eventBus.emit('physics:constraintApplied', { objectId, type: 'joint' })
      },
      applySpring: (objectId: string, stiffness: number, damping: number) => {
        this.physicsSystem.constraints.set(`${objectId}:spring`, { stiffness, damping })
        this.eventBus.emit('physics:constraintApplied', { objectId, type: 'spring' })
      },
      applyDistance: (objectId: string, min: number, max: number) => {
        this.physicsSystem.constraints.set(`${objectId}:distance`, { min, max })
        this.eventBus.emit('physics:constraintApplied', { objectId, type: 'distance' })
      },
      applySolver: () => {
        for (let i = 0; i < this.physicsSystem.solverIterations; i++) {
          this.eventBus.emit('physics:solverTick', { iteration: i })
        }
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`physics:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`physics:${event}`, callback)
      }
    }
  }
  
  private createGenerationSystem(): ProceduralGenerationAPI {
    return {
      lastGenerated: { seed: 0, timestamp: 0 },
      generateTerrain: async (width: number, height: number, seed: number) => {
        this.eventBus.emit('generation:generationStart', { width, height, seed })
        
        // Simulate terrain generation
        await new Promise(r => setTimeout(r, 100))
        
        const terrain = { width, height, seed, vertices: [] }
        this.generationSystem.lastGenerated = { seed, timestamp: Date.now() }
        
        this.eventBus.emit('generation:generationComplete', { terrain })
        return terrain
      },
      generateIsland: async (size: number, seed: number) => {
        this.eventBus.emit('generation:generationStart', { size, seed })
        await new Promise(r => setTimeout(r, 150))
        
        const island = { size, seed, waterLevel: 0.45 }
        this.generationSystem.lastGenerated = { seed, timestamp: Date.now() }
        
        this.eventBus.emit('generation:generationComplete', { island })
        return island
      },
      generateStructures: async (_terrain: object, count: number) => {
        const structures = Array(count).fill(null).map((_, i) => ({
          id: `structure_${i}`,
          type: 'building',
          position: [Math.random() * 100, 0, Math.random() * 100]
        }))
        return structures
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`generation:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`generation:${event}`, callback)
      }
    }
  }
  
  private createMarketplaceSystem(): HoloScriptMarketplaceAPI {
    return {
      items: new Map(),
      userPublished: [],
      search: async (query: string, category?: string) => {
        const results = Array.from(this.marketplaceSystem.items.values()).filter((item: any) =>
          item.name.includes(query) && (!category || item.category === category)
        )
        this.eventBus.emit('marketplace:itemsLoaded', { results })
        return results
      },
      publish: async (item: object) => {
        const itemId = `item_${Date.now()}`
        this.marketplaceSystem.items.set(itemId, item)
        this.marketplaceSystem.userPublished.push(itemId)
        this.eventBus.emit('marketplace:publishSuccess', { itemId })
        return itemId
      },
      download: async (itemId: string) => {
        const item = this.marketplaceSystem.items.get(itemId)
        if (!item) throw new Error('Item not found')
        
        this.eventBus.emit('marketplace:downloadStart', { itemId })
        await new Promise(r => setTimeout(r, 50))
        this.eventBus.emit('marketplace:downloadComplete', { itemId })
        
        return item
      },
      rate: async (itemId: string, rating: number) => {
        const item = this.marketplaceSystem.items.get(itemId) as any
        if (item) item.rating = rating
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`marketplace:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`marketplace:${event}`, callback)
      }
    }
  }
  
  private createVersionControlSystem(): SceneVersionControlAPI {
    return {
      snapshots: new Map(),
      currentSnapshot: null,
      history: [],
      createSnapshot: async (name: string) => {
        const snapshotId = `snap_${Date.now()}`
        this.versionControlSystem.snapshots.set(snapshotId, { name, timestamp: Date.now() })
        this.versionControlSystem.history.push(snapshotId)
        this.versionControlSystem.currentSnapshot = snapshotId
        this.eventBus.emit('versionControl:snapshotCreated', { snapshotId, name })
        return snapshotId
      },
      restoreSnapshot: async (snapshotId: string) => {
        this.versionControlSystem.currentSnapshot = snapshotId
        this.eventBus.emit('versionControl:snapshotRestored', { snapshotId })
      },
      compareSnapshots: async (_snapA: string, _snapB: string) => {
        const diff = { added: [], removed: [], modified: [] }
        return diff
      },
      merge: async (_snapA: string, _snapB: string) => {
        const merged = { conflicts: 0, resolved: true }
        this.eventBus.emit('versionControl:mergeComplete', merged)
        return merged
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`versionControl:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`versionControl:${event}`, callback)
      }
    }
  }
  
  private createPartySystem(): PartySystemAPI {
    return {
      currentPartyId: null,
      currentParty: null,
      createParty: (name: string, maxPlayers: number) => {
        const partyId = `party_${Date.now()}`
        this.partySystem.currentPartyId = partyId
        this.partySystem.currentParty = { id: partyId, name, maxPlayers, members: [] }
        this.eventBus.emit('party:partyCreated', { partyId, name })
        return partyId
      },
      joinParty: (partyId: string) => {
        this.partySystem.currentPartyId = partyId
        this.eventBus.emit('party:partyJoined', { partyId })
        return true
      },
      leaveParty: () => {
        this.eventBus.emit('party:partyLeft', { partyId: this.partySystem.currentPartyId })
        this.partySystem.currentPartyId = null
        this.partySystem.currentParty = null
        return true
      },
      invitePlayer: (playerId: string, playerName: string) => {
        this.eventBus.emit('party:invitationSent', { playerId, playerName })
        return true
      },
      getLocalParties: () => {
        return this.partySystem.currentParty ? [this.partySystem.currentParty] : []
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`party:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`party:${event}`, callback)
      }
    }
  }
  
  private createAnalyticsSystem(): LocalAnalyticsAPI {
    return {
      isRecording: false,
      currentSessionId: null,
      events: [],
      startSession: (partyId: string) => {
        const sessionId = `session_${Date.now()}`
        this.analyticsSystem.currentSessionId = sessionId
        this.analyticsSystem.isRecording = true
        this.analyticsSystem.events = []
        this.eventBus.emit('analytics:sessionStarted', { sessionId, partyId })
        return sessionId
      },
      endSession: () => {
        this.eventBus.emit('analytics:sessionEnded', { 
          sessionId: this.analyticsSystem.currentSessionId,
          eventCount: this.analyticsSystem.events.length
        })
        this.analyticsSystem.isRecording = false
      },
      trackEvent: (eventName: string, category: string, data?: object) => {
        const event = { eventName, category, timestamp: Date.now(), data }
        this.analyticsSystem.events.push(event)
        this.eventBus.emit('analytics:eventTracked', event)
      },
      getSessionReport: (sessionId: string) => {
        return { sessionId, eventCount: this.analyticsSystem.events.length }
      },
      exportAsCSV: () => {
        return this.analyticsSystem.events
          .map((e: any) => `${e.timestamp},${e.eventName},${e.category}`)
          .join('\n')
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`analytics:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`analytics:${event}`, callback)
      }
    }
  }
  
  private createSyncSystem(): OfflineSyncAPI {
    return {
      isOnline: navigator.onLine,
      pendingUpdates: [],
      trackLocalUpdate: (objectId: string, operation: string, data: object) => {
        const update = { objectId, operation, timestamp: Date.now(), data }
        this.syncSystem.pendingUpdates.push(update)
        this.eventBus.emit('sync:updateQueued', update)
      },
      syncAll: async () => {
        this.eventBus.emit('sync:syncStart', {})
        await new Promise(r => setTimeout(r, 100))
        const result = { success: true, synced: this.syncSystem.pendingUpdates.length, failed: 0 }
        this.syncSystem.pendingUpdates = []
        this.eventBus.emit('sync:syncComplete', result)
        return result
      },
      getPendingUpdates: () => {
        return this.syncSystem.pendingUpdates
      },
      resolveConflictManual: (objectId: string, useLocal: boolean) => {
        this.eventBus.emit('sync:conflictResolved', { objectId, useLocal })
        return true
      },
      getStats: () => {
        return {
          isOnline: this.syncSystem.isOnline,
          pendingUpdates: this.syncSystem.pendingUpdates.length,
          totalBytes: this.syncSystem.pendingUpdates.length * 100
        }
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`sync:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`sync:${event}`, callback)
      }
    }
  }
  
  private createNetworkSystem(): LocalNetworkingAPI {
    return {
      connectedPeers: [],
      startLocalParty: (name: string, maxPlayers: number) => {
        this.eventBus.emit('network:partyStarted', { name, maxPlayers })
      },
      broadcastPresence: () => {
        this.eventBus.emit('network:broadcastSent', {})
      },
      acceptPeer: (peerId: string) => {
        this.networkSystem.connectedPeers.push(peerId)
        this.eventBus.emit('network:peerConnected', { peerId })
      },
      syncObjectState: (objectId: string, state: object) => {
        this.eventBus.emit('network:stateSync', { objectId, state })
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`network:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`network:${event}`, callback)
      }
    }
  }
  
  private createExamplesSystem(): ExampleWorldsAPI {
    return {
      activeWorlds: new Map(),
      spawnWorld: async (worldName: string) => {
        const worldId = `world_${Date.now()}`
        const world = { id: worldId, name: worldName }
        this.examplesSystem.activeWorlds.set(worldId, world)
        this.eventBus.emit('examples:worldSpawned', { worldId, worldName })
        await new Promise(r => setTimeout(r, 50))
        this.eventBus.emit('examples:worldLoaded', { worldId })
        return world
      },
      getWorldDetails: (worldId: string) => {
        return this.examplesSystem.activeWorlds.get(worldId) || null
      },
      listWorlds: () => {
        return Array.from(this.examplesSystem.activeWorlds.keys())
      },
      on: (event: string, callback: EventCallback) => {
        this.eventBus.on(`examples:${event}`, callback)
      },
      off: (event: string, callback: EventCallback) => {
        this.eventBus.off(`examples:${event}`, callback)
      }
    }
  }
  
  // ========================================================================
  // PUBLIC API - ACCESS SYSTEMS
  // ========================================================================
  
  get networking(): NetworkedWorldStateAPI {
    return this.networkingSystem
  }
  
  get physics(): PhysicsConstraintsAPI {
    return this.physicsSystem
  }
  
  get generation(): ProceduralGenerationAPI {
    return this.generationSystem
  }
  
  get marketplace(): HoloScriptMarketplaceAPI {
    return this.marketplaceSystem
  }
  
  get versionControl(): SceneVersionControlAPI {
    return this.versionControlSystem
  }
  
  get party(): PartySystemAPI {
    return this.partySystem
  }
  
  get analytics(): LocalAnalyticsAPI {
    return this.analyticsSystem
  }
  
  get sync(): OfflineSyncAPI {
    return this.syncSystem
  }
  
  get network(): LocalNetworkingAPI {
    return this.networkSystem
  }
  
  get examples(): ExampleWorldsAPI {
    return this.examplesSystem
  }
  
  /**
   * Get the event bus for custom event handling
   */
  get events(): EventEmitter {
    return this.eventBus
  }
  
  /**
   * Check if all systems are initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
  
  /**
   * Get complete status of all systems
   */
  getStatus(): object {
    return {
      initialized: this.initialized,
      systems: {
        networking: { synced: this.networkingSystem.syncedObjects.size },
        physics: { constraints: this.physicsSystem.constraints.size },
        marketplace: { items: this.marketplaceSystem.items.size },
        versionControl: { snapshots: this.versionControlSystem.snapshots.size },
        party: { current: this.partySystem.currentPartyId },
        analytics: { recording: this.analyticsSystem.isRecording, events: this.analyticsSystem.events.length },
        sync: { online: this.syncSystem.isOnline, pending: this.syncSystem.pendingUpdates.length },
        network: { peers: this.networkSystem.connectedPeers.length },
        examples: { active: this.examplesSystem.activeWorlds.size }
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: HoloScriptSystemsAPI | null = null

export function getHoloScriptAPI(): HoloScriptSystemsAPI {
  if (!instance) {
    instance = new HoloScriptSystemsAPI()
  }
  return instance
}

export default HoloScriptSystemsAPI

