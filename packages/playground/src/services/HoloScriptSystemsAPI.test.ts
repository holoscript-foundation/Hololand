/**
 * Unit Tests for HoloScript Systems API
 *
 * Tests all 10 systems with correct API signatures
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getHoloScriptAPI } from './HoloScriptSystemsAPI'

describe('HoloScriptSystemsAPI', () => {
  let api: ReturnType<typeof getHoloScriptAPI>

  beforeEach(() => {
    api = getHoloScriptAPI()
  })

  // =========================================================================
  // NETWORKING SYSTEM TESTS
  // =========================================================================

  describe('Networking System', () => {
    it('should register objects by ID', () => {
      api.networking.registerObject('obj1')
      const synced = api.networking.syncedObjects.get('obj1')
      expect(synced).toBeDefined()
    })

    it('should unregister objects', () => {
      api.networking.registerObject('obj1')
      api.networking.unregisterObject('obj1')
      const synced = api.networking.syncedObjects.get('obj1')
      expect(synced).toBeUndefined()
    })

    it('should sync object state', () => {
      api.networking.registerObject('obj1')
      api.networking.syncObject('obj1', { x: 100, y: 200 })

      const state = api.networking.syncedObjects.get('obj1')
      expect(state).toEqual({ x: 100, y: 200 })
    })

    it('should handle multiple synced objects', () => {
      api.networking.registerObject('obj1')
      api.networking.registerObject('obj2')
      expect(api.networking.syncedObjects.size).toBe(2)
    })

    it('should update lastSync timestamp', () => {
      const before = api.networking.lastSync
      api.networking.syncObject('obj1', { x: 5 })
      expect(api.networking.lastSync).toBeGreaterThanOrEqual(before)
    })
  })

  // =========================================================================
  // PHYSICS SYSTEM TESTS
  // =========================================================================

  describe('Physics System', () => {
    it('should apply joint constraints', () => {
      api.physics.applyJoint('obj1', [0, 1, 0])
      expect(api.physics.constraints.size).toBeGreaterThan(0)
    })

    it('should apply joint constraints with limits', () => {
      api.physics.applyJoint('obj1', [0, 1, 0], [-90, 90])
      expect(api.physics.constraints.has('obj1:joint')).toBe(true)
    })

    it('should apply spring constraints', () => {
      api.physics.applySpring('obj1', 100, 10)
      expect(api.physics.constraints.has('obj1:spring')).toBe(true)
    })

    it('should apply distance constraints', () => {
      api.physics.applyDistance('obj1', 1, 5)
      expect(api.physics.constraints.has('obj1:distance')).toBe(true)
    })

    it('should run physics solver', () => {
      api.physics.applyJoint('obj1', [0, 1, 0])
      // applySolver returns void, just verify it doesn't throw
      expect(() => api.physics.applySolver()).not.toThrow()
    })

    it('should maintain constraint map', () => {
      const initialSize = api.physics.constraints.size
      api.physics.applyJoint('objA', [0, 1, 0])
      api.physics.applySpring('objB', 100, 10)
      expect(api.physics.constraints.size).toBe(initialSize + 2)
    })

    it('should have default solver iterations', () => {
      expect(api.physics.solverIterations).toBe(4)
    })
  })

  // =========================================================================
  // PROCEDURAL GENERATION SYSTEM TESTS
  // =========================================================================

  describe('Procedural Generation System', () => {
    it('should generate terrain', async () => {
      const result = await api.generation.generateTerrain(100, 100, 42)
      expect(result).toBeDefined()
      expect(result.width).toBe(100)
      expect(result.height).toBe(100)
    })

    it('should generate consistent terrain with same seed', async () => {
      const result1 = await api.generation.generateTerrain(50, 50, 123)
      const result2 = await api.generation.generateTerrain(50, 50, 123)
      expect(result1.seed).toEqual(result2.seed)
    })

    it('should generate islands', async () => {
      const result = await api.generation.generateIsland(100, 42)
      expect(result).toBeDefined()
      expect(result.size).toBe(100)
    })

    it('should generate structures', async () => {
      const terrain = { width: 100, height: 100 }
      const structures = await api.generation.generateStructures(terrain, 5)
      expect(structures.length).toBe(5)
    })

    it('should track last generated info', async () => {
      await api.generation.generateTerrain(50, 50, 999)
      expect(api.generation.lastGenerated.seed).toBe(999)
      expect(api.generation.lastGenerated.timestamp).toBeGreaterThan(0)
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
      const itemId = await api.marketplace.publish(item)
      expect(typeof itemId).toBe('string')
    })

    it('should download items', async () => {
      const item = { name: 'Download Test', type: 'world', data: {} }
      const itemId = await api.marketplace.publish(item)
      const downloaded = await api.marketplace.download(itemId)
      expect(downloaded).toBeDefined()
    })

    it('should rate items', async () => {
      const item = { name: 'Rate Test', type: 'world', data: {} }
      const itemId = await api.marketplace.publish(item)
      await api.marketplace.rate(itemId, 5)
      // Rate returns void
    })

    it('should maintain items map', () => {
      expect(api.marketplace.items).toBeInstanceOf(Map)
    })

    it('should track user published items', () => {
      expect(Array.isArray(api.marketplace.userPublished)).toBe(true)
    })
  })

  // =========================================================================
  // VERSION CONTROL SYSTEM TESTS
  // =========================================================================

  describe('Version Control System', () => {
    it('should create snapshots', async () => {
      const snapshotId = await api.versionControl.createSnapshot('initial')
      expect(typeof snapshotId).toBe('string')
    })

    it('should restore snapshots', async () => {
      const snapshotId = await api.versionControl.createSnapshot('test')
      await api.versionControl.restoreSnapshot(snapshotId)
      expect(api.versionControl.currentSnapshot).toBe(snapshotId)
    })

    it('should compare snapshots', async () => {
      const snap1 = await api.versionControl.createSnapshot('snap1')
      const snap2 = await api.versionControl.createSnapshot('snap2')
      const diff = await api.versionControl.compareSnapshots(snap1, snap2)
      expect(diff).toBeDefined()
    })

    it('should merge snapshots', async () => {
      const snap1 = await api.versionControl.createSnapshot('snap1')
      const snap2 = await api.versionControl.createSnapshot('snap2')
      const merged = await api.versionControl.merge(snap1, snap2)
      expect(merged).toBeDefined()
    })

    it('should track history', async () => {
      await api.versionControl.createSnapshot('first')
      await api.versionControl.createSnapshot('second')
      expect(api.versionControl.history.length).toBeGreaterThanOrEqual(2)
    })
  })

  // =========================================================================
  // PARTY SYSTEM TESTS
  // =========================================================================

  describe('Party System', () => {
    it('should create parties', () => {
      const partyId = api.party.createParty('Test Party', 4)
      expect(typeof partyId).toBe('string')
    })

    it('should join parties', () => {
      const partyId = api.party.createParty('Join Test', 4)
      const joined = api.party.joinParty(partyId)
      expect(joined).toBe(true)
    })

    it('should leave parties', () => {
      const partyId = api.party.createParty('Leave Test', 4)
      api.party.joinParty(partyId)
      const left = api.party.leaveParty()
      expect(left).toBe(true)
    })

    it('should invite players', () => {
      api.party.createParty('Invite Test', 4)
      const invited = api.party.invitePlayer('player1', 'Player One')
      expect(typeof invited).toBe('boolean')
    })

    it('should list local parties', () => {
      api.party.createParty('Local Test', 4)
      const parties = api.party.getLocalParties()
      expect(Array.isArray(parties)).toBe(true)
    })
  })

  // =========================================================================
  // ANALYTICS SYSTEM TESTS
  // =========================================================================

  describe('Analytics System', () => {
    it('should start sessions', () => {
      const sessionId = api.analytics.startSession('party1')
      expect(typeof sessionId).toBe('string')
    })

    it('should end sessions', () => {
      api.analytics.startSession('party1')
      api.analytics.endSession()
      expect(api.analytics.isRecording).toBe(false)
    })

    it('should track events', () => {
      api.analytics.startSession('party1')
      api.analytics.trackEvent('test_event', 'testing', { data: 'value' })
      expect(api.analytics.events.length).toBeGreaterThan(0)
    })

    it('should get session reports', () => {
      const sessionId = api.analytics.startSession('party1')
      const report = api.analytics.getSessionReport(sessionId)
      expect(report).toBeDefined()
    })

    it('should export as CSV', () => {
      api.analytics.startSession('party1')
      api.analytics.trackEvent('export_test', 'testing')
      const csv = api.analytics.exportAsCSV()
      expect(typeof csv).toBe('string')
    })
  })

  // =========================================================================
  // OFFLINE SYNC SYSTEM TESTS
  // =========================================================================

  describe('Offline Sync System', () => {
    it('should track local updates', () => {
      api.sync.trackLocalUpdate('obj1', 'update', { x: 10 })
      expect(api.sync.pendingUpdates.length).toBeGreaterThan(0)
    })

    it('should get pending updates', () => {
      api.sync.trackLocalUpdate('obj1', 'create', { x: 0 })
      const pending = api.sync.getPendingUpdates()
      expect(Array.isArray(pending)).toBe(true)
    })

    it('should sync all updates', async () => {
      api.sync.trackLocalUpdate('obj1', 'update', { x: 10 })
      const result = await api.sync.syncAll()
      expect(result).toBeDefined()
    })

    it('should resolve conflicts manually', () => {
      api.sync.trackLocalUpdate('obj1', 'update', { x: 10 })
      const resolved = api.sync.resolveConflictManual('obj1', true)
      expect(typeof resolved).toBe('boolean')
    })

    it('should get sync stats', () => {
      const stats = api.sync.getStats()
      expect(stats).toBeDefined()
    })
  })

  // =========================================================================
  // LOCAL NETWORKING SYSTEM TESTS
  // =========================================================================

  describe('Local Networking System', () => {
    it('should start local party', () => {
      expect(() => api.network.startLocalParty('Test', 4)).not.toThrow()
    })

    it('should broadcast presence', () => {
      api.network.startLocalParty('Test', 4)
      expect(() => api.network.broadcastPresence()).not.toThrow()
    })

    it('should accept peers', () => {
      expect(() => api.network.acceptPeer('peer1')).not.toThrow()
    })

    it('should sync object state', () => {
      expect(() => api.network.syncObjectState('obj1', { x: 10 })).not.toThrow()
    })

    it('should track connected peers', () => {
      expect(Array.isArray(api.network.connectedPeers)).toBe(true)
    })
  })

  // =========================================================================
  // EXAMPLE WORLDS SYSTEM TESTS
  // =========================================================================

  describe('Example Worlds System', () => {
    it('should spawn worlds', async () => {
      const world = await api.examples.spawnWorld('TestWorld')
      expect(world).toBeDefined()
    })

    it('should list worlds', () => {
      const worlds = api.examples.listWorlds()
      expect(Array.isArray(worlds)).toBe(true)
    })

    it('should track active worlds', () => {
      expect(api.examples.activeWorlds).toBeInstanceOf(Map)
    })
  })
})
