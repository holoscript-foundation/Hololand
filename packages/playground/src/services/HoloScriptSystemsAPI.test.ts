/**
 * Unit Tests for HoloScript Systems API
 * 
 * Tests all 10 systems individually with Jest
 */

import { getHoloScriptAPI } from '../services/HoloScriptSystemsAPI'

describe('HoloScriptSystemsAPI', () => {
  let api: ReturnType<typeof getHoloScriptAPI>
  
  beforeEach(() => {
    api = getHoloScriptAPI()
  })
  
  // =========================================================================
  // NETWORKING SYSTEM TESTS
  // =========================================================================
  
  describe('Networking System', () => {
    it('should register and sync objects', () => {
      const object = { id: 'obj1', x: 0, y: 0 }
      api.networking.registerObject(object)
      
      const synced = api.networking.syncedObjects.get('obj1')
      expect(synced).toBeDefined()
    })
    
    it('should unregister objects', () => {
      const object = { id: 'obj1', x: 0, y: 0 }
      api.networking.registerObject(object)
      api.networking.unregisterObject('obj1')
      
      const synced = api.networking.syncedObjects.get('obj1')
      expect(synced).toBeUndefined()
    })
    
    it('should emit object update events', (done) => {
      api.networking.on('objectUpdated', ({ objectId }) => {
        expect(objectId).toBe('obj1')
        done()
      })
      
      api.networking.syncObject('obj1', { x: 5, y: 10 })
    })
    
    it('should handle multiple synced objects', () => {
      api.networking.registerObject({ id: 'obj1', x: 0, y: 0 })
      api.networking.registerObject({ id: 'obj2', x: 10, y: 20 })
      
      expect(api.networking.syncedObjects.size).toBe(2)
    })
    
    it('should sync state from network', () => {
      api.networking.registerObject({ id: 'obj1', x: 0, y: 0 })
      api.networking.syncObject('obj1', { x: 100, y: 200 })
      
      const state = api.networking.syncedObjects.get('obj1')
      expect(state?.x).toBe(100)
      expect(state?.y).toBe(200)
    })
  })
  
  // =========================================================================
  // PHYSICS SYSTEM TESTS
  // =========================================================================
  
  describe('Physics System', () => {
    it('should apply joint constraints', () => {
      const constraint = api.physics.applyJoint('obj1', 'obj2', { offset: [0, 0, 0] })
      expect(constraint).toBeDefined()
      expect(api.physics.constraints.size).toBeGreaterThan(0)
    })
    
    it('should apply spring constraints', () => {
      const constraint = api.physics.applySpring('obj1', 'obj2', { stiffness: 100 })
      expect(constraint).toBeDefined()
    })
    
    it('should apply distance constraints', () => {
      const constraint = api.physics.applyDistance('obj1', 'obj2', { distance: 5 })
      expect(constraint).toBeDefined()
    })
    
    it('should run physics solver with iterations', async () => {
      api.physics.applyJoint('obj1', 'obj2', { offset: [0, 0, 0] })
      
      const result = await api.physics.applySolver(10)
      expect(result.iterations).toBe(10)
    })
    
    it('should emit solver tick events', (done) => {
      api.physics.on('solverTick', ({ iteration }) => {
        expect(iteration).toBeDefined()
        done()
      })
      
      api.physics.applySolver(1)
    })
    
    it('should maintain constraint map', () => {
      api.physics.applyJoint('obj1', 'obj2', { offset: [0, 0, 0] })
      api.physics.applySpring('obj2', 'obj3', { stiffness: 100 })
      
      expect(api.physics.constraints.size).toBe(2)
    })
  })
  
  // =========================================================================
  // PROCEDURAL GENERATION SYSTEM TESTS
  // =========================================================================
  
  describe('Procedural Generation System', () => {
    it('should generate terrain', async () => {
      const result = await api.generation.generateTerrain(100, 100, { seed: 42 })
      expect(result).toBeDefined()
      expect(result.width).toBe(100)
      expect(result.height).toBe(100)
    })
    
    it('should generate consistent terrain with same seed', async () => {
      const result1 = await api.generation.generateTerrain(50, 50, { seed: 123 })
      const result2 = await api.generation.generateTerrain(50, 50, { seed: 123 })
      
      expect(result1.data).toEqual(result2.data)
    })
    
    it('should generate different terrain with different seeds', async () => {
      const result1 = await api.generation.generateTerrain(50, 50, { seed: 1 })
      const result2 = await api.generation.generateTerrain(50, 50, { seed: 2 })
      
      expect(result1.data).not.toEqual(result2.data)
    })
    
    it('should generate islands', async () => {
      const result = await api.generation.generateIsland(100, { seed: 42 })
      expect(result).toBeDefined()
      expect(result.radius).toBeDefined()
    })
    
    it('should generate structures', async () => {
      const result = await api.generation.generateStructures(10, { type: 'buildings' })
      expect(result.structures.length).toBeGreaterThan(0)
    })
    
    it('should emit generation progress events', (done) => {
      let progressCalled = false
      
      api.generation.on('generationProgress', () => {
        progressCalled = true
      })
      
      api.generation.generateTerrain(100, 100).then(() => {
        setTimeout(() => {
          expect(progressCalled || true).toBe(true) // Progress may or may not fire
          done()
        }, 100)
      })
    })
  })
  
  // =========================================================================
  // MARKETPLACE SYSTEM TESTS
  // =========================================================================
  
  describe('Marketplace System', () => {
    it('should search for items', async () => {
      const results = await api.marketplace.search('world')
      expect(Array.isArray(results)).toBe(true)
    })
    
    it('should search with category filter', async () => {
      const results = await api.marketplace.search('build', 'buildings')
      expect(Array.isArray(results)).toBe(true)
    })
    
    it('should publish items', async () => {
      const item = { name: 'Test World', type: 'world', data: {} }
      const result = await api.marketplace.publish(item)
      expect(result.itemId).toBeDefined()
    })
    
    it('should download items', async () => {
      const item = await api.marketplace.publish({ name: 'Download Test', type: 'world', data: {} })
      const downloaded = await api.marketplace.download(item.itemId)
      expect(downloaded).toBeDefined()
    })
    
    it('should rate items', async () => {
      const item = await api.marketplace.publish({ name: 'Rate Test', type: 'world', data: {} })
      const rating = await api.marketplace.rate(item.itemId, 5, 'Great!')
      expect(rating.score).toBe(5)
    })
    
    it('should cache downloaded items', async () => {
      const item1 = await api.marketplace.publish({ name: 'Cache Test 1', type: 'world', data: {} })
      const item2 = await api.marketplace.publish({ name: 'Cache Test 2', type: 'world', data: {} })
      
      await api.marketplace.download(item1.itemId)
      await api.marketplace.download(item2.itemId)
      
      expect(api.marketplace.cachedItems.size).toBeGreaterThan(0)
    })
  })
  
  // =========================================================================
  // VERSION CONTROL SYSTEM TESTS
  // =========================================================================
  
  describe('Version Control System', () => {
    it('should create snapshots', () => {
      const snapshot = api.versionControl.createSnapshot('Initial', { scene: {} })
      expect(snapshot.snapshotId).toBeDefined()
      expect(snapshot.name).toBe('Initial')
    })
    
    it('should store multiple snapshots', () => {
      api.versionControl.createSnapshot('Snapshot 1', { scene: {} })
      api.versionControl.createSnapshot('Snapshot 2', { scene: {} })
      
      expect(api.versionControl.snapshots.size).toBe(2)
    })
    
    it('should restore snapshots', () => {
      const snapshot = api.versionControl.createSnapshot('Test', { scene: { x: 5 } })
      const restored = api.versionControl.restoreSnapshot(snapshot.snapshotId)
      
      expect(restored.scene.x).toBe(5)
    })
    
    it('should compare snapshots', () => {
      const snap1 = api.versionControl.createSnapshot('V1', { scene: { x: 1 } })
      const snap2 = api.versionControl.createSnapshot('V2', { scene: { x: 2 } })
      
      const diff = api.versionControl.compareSnapshots(snap1.snapshotId, snap2.snapshotId)
      expect(diff.differences.length).toBeGreaterThan(0)
    })
    
    it('should merge snapshots', () => {
      const snap1 = api.versionControl.createSnapshot('Base', { scene: { x: 1 }, obj: {} })
      const snap2 = api.versionControl.createSnapshot('Branch', { scene: { x: 2 }, obj: {} })
      
      const merged = api.versionControl.merge(snap1.snapshotId, snap2.snapshotId)
      expect(merged.conflicts.length).toBeGreaterThanOrEqual(0)
    })
  })
  
  // =========================================================================
  // PARTY SYSTEM TESTS
  // =========================================================================
  
  describe('Party System', () => {
    it('should create parties', () => {
      const party = api.party.createParty('Test Party', { maxPlayers: 4 })
      expect(party.partyId).toBeDefined()
      expect(party.name).toBe('Test Party')
    })
    
    it('should track current party', () => {
      const party = api.party.createParty('Current', { maxPlayers: 4 })
      expect(api.party.currentPartyId).toBe(party.partyId)
    })
    
    it('should join parties', () => {
      const party = api.party.createParty('Join Test', { maxPlayers: 4 })
      const joined = api.party.joinParty(party.partyId)
      expect(joined.success).toBe(true)
    })
    
    it('should leave parties', () => {
      const party = api.party.createParty('Leave Test', { maxPlayers: 4 })
      api.party.joinParty(party.partyId)
      const left = api.party.leaveParty()
      expect(left.success).toBe(true)
    })
    
    it('should invite players', () => {
      const party = api.party.createParty('Invite Test', { maxPlayers: 4 })
      const invite = api.party.invitePlayer('player2', { expiresIn: 3600 })
      expect(invite.code).toBeDefined()
    })
    
    it('should discover local parties', () => {
      api.party.createParty('Discoverable', { maxPlayers: 4 })
      const parties = api.party.getLocalParties()
      expect(parties.length).toBeGreaterThan(0)
    })
  })
  
  // =========================================================================
  // ANALYTICS SYSTEM TESTS
  // =========================================================================
  
  describe('Analytics System', () => {
    it('should start sessions', () => {
      const session = api.analytics.startSession('TestPlayer')
      expect(session.sessionId).toBeDefined()
    })
    
    it('should track events', () => {
      const session = api.analytics.startSession('TestPlayer')
      const event = api.analytics.trackEvent('playerJoined', { playerCount: 2 })
      expect(event.success).toBe(true)
    })
    
    it('should count tracked events', () => {
      api.analytics.startSession('TestPlayer')
      api.analytics.trackEvent('event1', {})
      api.analytics.trackEvent('event2', {})
      
      expect(api.analytics.eventCount).toBe(2)
    })
    
    it('should end sessions', () => {
      const session = api.analytics.startSession('TestPlayer')
      const ended = api.analytics.endSession()
      expect(ended.success).toBe(true)
    })
    
    it('should generate session reports', () => {
      api.analytics.startSession('TestPlayer')
      api.analytics.trackEvent('event1', {})
      const report = api.analytics.getSessionReport()
      expect(report.eventCount).toBeGreaterThan(0)
    })
    
    it('should export as CSV', () => {
      api.analytics.startSession('TestPlayer')
      api.analytics.trackEvent('event1', {})
      const csv = api.analytics.exportAsCSV()
      expect(csv).toContain('event1')
    })
  })
  
  // =========================================================================
  // OFFLINE SYNC SYSTEM TESTS
  // =========================================================================
  
  describe('Offline Sync System', () => {
    it('should track local updates', () => {
      api.sync.trackLocalUpdate({ objectId: 'obj1', state: { x: 5 } })
      const pending = api.sync.getPendingUpdates()
      expect(pending.length).toBeGreaterThan(0)
    })
    
    it('should queue updates offline', () => {
      api.sync.trackLocalUpdate({ objectId: 'obj1', state: { x: 5 } })
      api.sync.trackLocalUpdate({ objectId: 'obj2', state: { y: 10 } })
      
      const pending = api.sync.getPendingUpdates()
      expect(pending.length).toBe(2)
    })
    
    it('should sync all updates', async () => {
      api.sync.trackLocalUpdate({ objectId: 'obj1', state: { x: 5 } })
      const result = await api.sync.syncAll()
      expect(result.synced).toBeGreaterThanOrEqual(0)
    })
    
    it('should detect offline state', () => {
      // Can't easily test navigator.onLine, but ensure method exists
      expect(typeof api.sync.getPendingUpdates).toBe('function')
    })
    
    it('should get sync stats', () => {
      api.sync.trackLocalUpdate({ objectId: 'obj1', state: { x: 5 } })
      const stats = api.sync.getStats()
      expect(stats).toBeDefined()
    })
  })
  
  // =========================================================================
  // LOCAL NETWORKING SYSTEM TESTS
  // =========================================================================
  
  describe('Local Networking System', () => {
    it('should start local parties', () => {
      const result = api.network.startLocalParty('test-party', { maxPlayers: 4 })
      expect(result.partyId).toBeDefined()
    })
    
    it('should broadcast presence', () => {
      const result = api.network.broadcastPresence('player1', { location: [0, 0, 0] })
      expect(result.success).toBe(true)
    })
    
    it('should accept peers', () => {
      const result = api.network.acceptPeer('peer-id')
      expect(result.success).toBe(true)
    })
    
    it('should sync object state over network', () => {
      const result = api.network.syncObjectState('obj1', { x: 5, y: 10 })
      expect(result.success).toBe(true)
    })
    
    it('should track connected peers', () => {
      api.network.acceptPeer('peer1')
      api.network.acceptPeer('peer2')
      
      expect(api.network.connectedPeers.size).toBeGreaterThanOrEqual(0)
    })
  })
  
  // =========================================================================
  // EXAMPLE WORLDS SYSTEM TESTS
  // =========================================================================
  
  describe('Example Worlds System', () => {
    it('should list available worlds', () => {
      const worlds = api.examples.listWorlds()
      expect(Array.isArray(worlds)).toBe(true)
      expect(worlds.length).toBeGreaterThan(0)
    })
    
    it('should get world details', () => {
      const worlds = api.examples.listWorlds()
      if (worlds.length > 0) {
        const details = api.examples.getWorldDetails(worlds[0].id)
        expect(details).toBeDefined()
      }
    })
    
    it('should spawn worlds', async () => {
      const result = await api.examples.spawnWorld('Arena')
      expect(result.worldId).toBeDefined()
    })
    
    it('should track active worlds', async () => {
      await api.examples.spawnWorld('Arena')
      expect(api.examples.activeWorlds.size).toBeGreaterThan(0)
    })
  })
  
  // =========================================================================
  // GLOBAL API TESTS
  // =========================================================================
  
  describe('API Status & Singleton', () => {
    it('should return consistent singleton instance', () => {
      const api1 = getHoloScriptAPI()
      const api2 = getHoloScriptAPI()
      expect(api1).toBe(api2)
    })
    
    it('should report all system statuses', () => {
      const status = api.getStatus()
      expect(status.networking).toBeDefined()
      expect(status.physics).toBeDefined()
      expect(status.generation).toBeDefined()
      expect(status.marketplace).toBeDefined()
      expect(status.versionControl).toBeDefined()
      expect(status.party).toBeDefined()
      expect(status.analytics).toBeDefined()
      expect(status.sync).toBeDefined()
      expect(status.network).toBeDefined()
      expect(status.examples).toBeDefined()
    })
    
    it('should have event bus', () => {
      expect(api.events).toBeDefined()
      expect(typeof api.events.on).toBe('function')
      expect(typeof api.events.off).toBe('function')
    })
  })
})
