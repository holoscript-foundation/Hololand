/**
 * Integration Tests for HoloScript Systems
 * 
 * Tests interactions between multiple systems
 */

import { getHoloScriptAPI } from '../services/HoloScriptSystemsAPI'

describe('HoloScript Systems Integration', () => {
  let api: ReturnType<typeof getHoloScriptAPI>
  
  beforeEach(() => {
    api = getHoloScriptAPI()
  })
  
  // =========================================================================
  // NETWORKING + PHYSICS INTEGRATION
  // =========================================================================
  
  describe('Networking + Physics Integration', () => {
    it('should sync physics constraints over network', () => {
      // Create constraint
      const constraint = api.physics.applyJoint('obj1', 'obj2', { offset: [0, 0, 0] })
      
      // Sync over network
      api.networking.registerObject(constraint)
      const synced = api.networking.syncedObjects.get(constraint.id)
      
      expect(synced).toBeDefined()
    })
    
    it('should maintain physics state in networked objects', () => {
      // Register networked object
      const object = { id: 'obj1', x: 0, y: 0, vx: 0, vy: 0 }
      api.networking.registerObject(object)
      
      // Apply physics
      api.physics.applyJoint('obj1', 'ground', { offset: [0, 0, 0] })
      
      // Sync updated state
      api.networking.syncObject('obj1', { x: 5, y: 10, vx: 1, vy: 2 })
      
      const updated = api.networking.syncedObjects.get('obj1')
      expect(updated?.x).toBe(5)
      expect(updated?.vx).toBe(1)
    })
    
    it('should run solver on networked objects', async () => {
      api.networking.registerObject({ id: 'obj1', x: 0, y: 0 })
      api.networking.registerObject({ id: 'obj2', x: 10, y: 0 })
      
      api.physics.applyJoint('obj1', 'obj2', { offset: [0, 0, 0] })
      
      const result = await api.physics.applySolver(5)
      expect(result.iterations).toBe(5)
    })
  })
  
  // =========================================================================
  // PARTY SYSTEM + ANALYTICS INTEGRATION
  // =========================================================================
  
  describe('Party System + Analytics Integration', () => {
    it('should track party events in analytics', () => {
      api.analytics.startSession('Player1')
      
      const party = api.party.createParty('Analytics Test', { maxPlayers: 4 })
      api.analytics.trackEvent('partyCreated', { partyId: party.partyId })
      
      const report = api.analytics.getSessionReport()
      expect(report.eventCount).toBeGreaterThan(0)
    })
    
    it('should track player joins in analytics', () => {
      api.analytics.startSession('Player1')
      const party = api.party.createParty('Join Test', { maxPlayers: 4 })
      
      api.analytics.trackEvent('playerJoined', { playerName: 'Player2', partyId: party.partyId })
      api.analytics.trackEvent('playerJoined', { playerName: 'Player3', partyId: party.partyId })
      
      const report = api.analytics.getSessionReport()
      expect(report.eventCount).toBe(2)
    })
    
    it('should export party session data', () => {
      api.analytics.startSession('Player1')
      const party = api.party.createParty('Export Test', { maxPlayers: 4 })
      
      api.analytics.trackEvent('partyCreated', { partyId: party.partyId })
      api.analytics.trackEvent('playerJoined', { playerName: 'Player2' })
      
      const csv = api.analytics.exportAsCSV()
      expect(csv).toContain('partyCreated')
      expect(csv).toContain('playerJoined')
    })
  })
  
  // =========================================================================
  // OFFLINE SYNC + NETWORKING INTEGRATION
  // =========================================================================
  
  describe('Offline Sync + Networking Integration', () => {
    it('should queue networked object updates when offline', () => {
      // Register networked object
      api.networking.registerObject({ id: 'obj1', x: 0, y: 0 })
      
      // Track update offline
      api.sync.trackLocalUpdate({ objectId: 'obj1', state: { x: 10, y: 20 } })
      
      // Verify it's queued
      const pending = api.sync.getPendingUpdates()
      expect(pending.length).toBeGreaterThan(0)
    })
    
    it('should sync networked objects when connection restored', async () => {
      api.networking.registerObject({ id: 'obj1', x: 0, y: 0 })
      
      // Simulate offline updates
      api.sync.trackLocalUpdate({ objectId: 'obj1', state: { x: 5 } })
      api.sync.trackLocalUpdate({ objectId: 'obj1', state: { x: 10 } })
      
      // Sync all
      const result = await api.sync.syncAll()
      expect(result).toBeDefined()
    })
    
    it('should handle concurrent updates to same object', () => {
      api.networking.registerObject({ id: 'shared', value: 0 })
      
      // Local update
      api.sync.trackLocalUpdate({ objectId: 'shared', state: { value: 1 } })
      
      // Network update (from peer)
      api.networking.syncObject('shared', { value: 2 })
      
      expect(api.networking.syncedObjects.get('shared')).toBeDefined()
    })
  })
  
  // =========================================================================
  // VERSION CONTROL + MARKETPLACE INTEGRATION
  // =========================================================================
  
  describe('Version Control + Marketplace Integration', () => {
    it('should publish versioned scenes to marketplace', async () => {
      // Create version
      const snapshot = api.versionControl.createSnapshot('Release 1.0', { 
        scene: { objects: [] }
      })
      
      // Publish
      const item = await api.marketplace.publish({
        name: 'Versioned World',
        type: 'world',
        data: { snapshotId: snapshot.snapshotId }
      })
      
      expect(item.itemId).toBeDefined()
    })
    
    it('should download and restore versioned scene', async () => {
      // Create and publish
      const snapshot = api.versionControl.createSnapshot('v1', { scene: {} })
      const item = await api.marketplace.publish({
        name: 'Download Test',
        type: 'world',
        data: { snapshotId: snapshot.snapshotId }
      })
      
      // Download
      const downloaded = await api.marketplace.download(item.itemId)
      expect(downloaded).toBeDefined()
      
      // Restore
      const restored = api.versionControl.restoreSnapshot(snapshot.snapshotId)
      expect(restored).toBeDefined()
    })
    
    it('should track marketplace downloads in analytics', () => {
      api.analytics.startSession('Player1')
      
      const published = api.marketplace.publish({
        name: 'Tracked Download',
        type: 'world',
        data: {}
      })
      
      api.analytics.trackEvent('marketplace:download', { itemId: published.itemId })
      const report = api.analytics.getSessionReport()
      expect(report.eventCount).toBeGreaterThan(0)
    })
  })
  
  // =========================================================================
  // PROCEDURAL GENERATION + VERSIONING INTEGRATION
  // =========================================================================
  
  describe('Procedural Generation + Version Control Integration', () => {
    it('should version generated terrain', async () => {
      const terrain = await api.generation.generateTerrain(50, 50, { seed: 123 })
      const snapshot = api.versionControl.createSnapshot('Generated Terrain', { terrain })
      
      expect(snapshot.snapshotId).toBeDefined()
    })
    
    it('should restore and re-generate with same seed', async () => {
      const terrain1 = await api.generation.generateTerrain(50, 50, { seed: 456 })
      api.versionControl.createSnapshot('Terrain v1', { terrain: terrain1 })
      
      const terrain2 = await api.generation.generateTerrain(50, 50, { seed: 456 })
      expect(terrain1.data).toEqual(terrain2.data)
    })
  })
  
  // =========================================================================
  // LOCAL NETWORKING + PARTY INTEGRATION
  // =========================================================================
  
  describe('Local Networking + Party Integration', () => {
    it('should create LAN party with local networking', () => {
      const party = api.party.createParty('LAN Party', { maxPlayers: 4 })
      const networkParty = api.network.startLocalParty(party.partyId, { maxPlayers: 4 })
      
      expect(networkParty.partyId).toBe(party.partyId)
    })
    
    it('should broadcast party presence on network', () => {
      const party = api.party.createParty('Broadcast Test', { maxPlayers: 4 })
      api.network.startLocalParty(party.partyId, { maxPlayers: 4 })
      
      api.network.broadcastPresence('Player1', { partyId: party.partyId })
      
      const localParties = api.party.getLocalParties()
      expect(localParties.length).toBeGreaterThan(0)
    })
    
    it('should sync networked objects within party', () => {
      const party = api.party.createParty('Object Sync', { maxPlayers: 4 })
      api.network.startLocalParty(party.partyId, { maxPlayers: 4 })
      
      const object = { id: 'party-obj', x: 0, y: 0 }
      api.networking.registerObject(object)
      
      api.network.syncObjectState('party-obj', { x: 5, y: 10 })
      
      expect(api.networking.syncedObjects.get('party-obj')).toBeDefined()
    })
  })
  
  // =========================================================================
  // EXAMPLE WORLDS + MULTI-SYSTEM INTEGRATION
  // =========================================================================
  
  describe('Example Worlds + Multi-System Integration', () => {
    it('should spawn example world and track in analytics', async () => {
      api.analytics.startSession('Player1')
      
      const world = await api.examples.spawnWorld('Arena')
      api.analytics.trackEvent('worldSpawned', { worldId: world.worldId })
      
      const report = api.analytics.getSessionReport()
      expect(report.eventCount).toBeGreaterThan(0)
    })
    
    it('should use networked objects in example worlds', async () => {
      const world = await api.examples.spawnWorld('Arena')
      
      // Add networked players
      api.networking.registerObject({ id: 'player1', x: 0, y: 0, name: 'Player1' })
      api.networking.registerObject({ id: 'player2', x: 10, y: 0, name: 'Player2' })
      
      expect(api.networking.syncedObjects.size).toBe(2)
    })
    
    it('should use physics in example worlds', async () => {
      const world = await api.examples.spawnWorld('Arena')
      
      // Add physics constraints
      api.physics.applyJoint('player1', 'player2', { offset: [0, 0, 0] })
      api.physics.applySpring('wall', 'player1', { stiffness: 100 })
      
      expect(api.physics.constraints.size).toBe(2)
    })
  })
  
  // =========================================================================
  // FULL MULTIPLAYER SESSION INTEGRATION
  // =========================================================================
  
  describe('Full Multiplayer Session', () => {
    it('should run complete multiplayer scenario', async () => {
      // Start analytics
      api.analytics.startSession('Player1')
      
      // Create party
      const party = api.party.createParty('Multiplayer Game', { maxPlayers: 4 })
      api.analytics.trackEvent('partyCreated', { partyId: party.partyId })
      
      // Start local networking
      api.network.startLocalParty(party.partyId, { maxPlayers: 4 })
      api.network.broadcastPresence('Player1', { partyId: party.partyId })
      
      // Spawn example world
      const world = await api.examples.spawnWorld('Arena')
      api.analytics.trackEvent('worldSpawned', { worldId: world.worldId })
      
      // Register networked players
      api.networking.registerObject({ id: 'player1', x: 0, y: 0, name: 'Player1' })
      api.networking.registerObject({ id: 'player2', x: 10, y: 0, name: 'Player2' })
      
      // Add physics
      api.physics.applyJoint('player1', 'ground', { offset: [0, -1, 0] })
      api.physics.applyJoint('player2', 'ground', { offset: [10, -1, 0] })
      
      // Run solver
      await api.physics.applySolver(5)
      
      // Track gameplay events
      api.analytics.trackEvent('playerMoved', { playerId: 'player1', x: 5, y: 2 })
      api.analytics.trackEvent('playerAttacked', { playerId: 'player2' })
      
      // Version control for replays
      const snapshot = api.versionControl.createSnapshot('Gameplay Snapshot', {
        players: [
          { id: 'player1', x: 5, y: 2 },
          { id: 'player2', x: 10, y: 0 }
        ]
      })
      
      // Verify full state
      const report = api.analytics.getSessionReport()
      expect(report.eventCount).toBeGreaterThan(0)
      expect(api.networking.syncedObjects.size).toBe(2)
      expect(api.physics.constraints.size).toBe(2)
      expect(api.versionControl.snapshots.size).toBe(1)
    })
    
    it('should handle offline multiplayer with sync', async () => {
      // Setup session
      const party = api.party.createParty('Offline Game', { maxPlayers: 4 })
      api.network.startLocalParty(party.partyId, { maxPlayers: 4 })
      
      // Create objects
      api.networking.registerObject({ id: 'obj1', x: 0, y: 0 })
      api.networking.registerObject({ id: 'obj2', x: 10, y: 0 })
      
      // Simulate offline updates
      api.sync.trackLocalUpdate({ objectId: 'obj1', state: { x: 5 } })
      api.sync.trackLocalUpdate({ objectId: 'obj2', state: { x: 15 } })
      
      // Check pending updates
      const pending = api.sync.getPendingUpdates()
      expect(pending.length).toBe(2)
      
      // Sync when back online
      const result = await api.sync.syncAll()
      expect(result).toBeDefined()
    })
  })
  
  // =========================================================================
  // EVENT PROPAGATION INTEGRATION
  // =========================================================================
  
  describe('Event Propagation', () => {
    it('should propagate networking events through event bus', (done) => {
      let eventFired = false
      
      api.events.on('networking:objectUpdated', () => {
        eventFired = true
        done()
      })
      
      api.networking.registerObject({ id: 'obj1', x: 0, y: 0 })
      api.networking.syncObject('obj1', { x: 5 })
    })
    
    it('should handle multiple system events in sequence', (done) => {
      const events: string[] = []
      
      api.events.on('networking:objectCreated', () => {
        events.push('created')
      })
      
      api.events.on('physics:constraintApplied', () => {
        events.push('physics')
      })
      
      api.networking.registerObject({ id: 'obj1', x: 0, y: 0 })
      api.physics.applyJoint('obj1', 'obj2', { offset: [0, 0, 0] })
      
      setTimeout(() => {
        expect(events.length).toBeGreaterThan(0)
        done()
      }, 100)
    })
  })
})
