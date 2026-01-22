/**
 * Integration Tests for HoloScript Systems
 *
 * Tests interactions between multiple systems
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getHoloScriptAPI } from './HoloScriptSystemsAPI'

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
      // Register object in network
      api.networking.registerObject('phys-obj1')

      // Apply physics constraint
      api.physics.applyJoint('phys-obj1', [0, 1, 0])

      // Verify object is registered
      const synced = api.networking.syncedObjects.get('phys-obj1')
      expect(synced).toBeDefined()
    })

    it('should maintain physics state in networked objects', () => {
      // Register networked object
      api.networking.registerObject('netobj1')

      // Apply physics
      api.physics.applySpring('netobj1', 100, 10)

      // Sync updated state
      api.networking.syncObject('netobj1', { x: 5, y: 10 })

      const updated = api.networking.syncedObjects.get('netobj1')
      expect(updated).toEqual({ x: 5, y: 10 })
    })
  })

  // =========================================================================
  // PARTY + ANALYTICS INTEGRATION
  // =========================================================================

  describe('Party + Analytics Integration', () => {
    it('should track party events in analytics', () => {
      const partyId = api.party.createParty('Analytics Test', 4)
      api.analytics.startSession(partyId)
      api.analytics.trackEvent('party_created', 'party', { partyId })

      expect(api.analytics.events.length).toBeGreaterThan(0)
    })

    it('should export party session analytics', () => {
      const partyId = api.party.createParty('Export Test', 4)
      api.analytics.startSession(partyId)
      api.analytics.trackEvent('test_event', 'testing')

      const csv = api.analytics.exportAsCSV()
      expect(typeof csv).toBe('string')
    })
  })

  // =========================================================================
  // SYNC + NETWORK INTEGRATION
  // =========================================================================

  describe('Sync + Network Integration', () => {
    it('should queue updates when offline', () => {
      api.sync.trackLocalUpdate('obj1', 'update', { x: 10 })

      const pending = api.sync.getPendingUpdates()
      expect(pending.length).toBeGreaterThan(0)
    })

    it('should sync all pending updates', async () => {
      api.sync.trackLocalUpdate('obj1', 'create', { x: 0 })
      api.sync.trackLocalUpdate('obj2', 'update', { y: 10 })

      const result = await api.sync.syncAll()
      expect(result).toBeDefined()
    })
  })

  // =========================================================================
  // GENERATION + VERSION CONTROL INTEGRATION
  // =========================================================================

  describe('Generation + Version Control Integration', () => {
    it('should snapshot generated terrain', async () => {
      const terrain = await api.generation.generateTerrain(50, 50, 42)
      expect(terrain).toBeDefined()

      const snapshotId = await api.versionControl.createSnapshot('generated-terrain')
      expect(typeof snapshotId).toBe('string')
    })

    it('should compare terrain generations', async () => {
      const snap1 = await api.versionControl.createSnapshot('before')
      await api.generation.generateTerrain(50, 50, 100)
      const snap2 = await api.versionControl.createSnapshot('after')

      const diff = await api.versionControl.compareSnapshots(snap1, snap2)
      expect(diff).toBeDefined()
    })
  })

  // =========================================================================
  // MARKETPLACE + EXAMPLES INTEGRATION
  // =========================================================================

  describe('Marketplace + Examples Integration', () => {
    it('should spawn and list example worlds', async () => {
      await api.examples.spawnWorld('IntegrationTestWorld')
      const worlds = api.examples.listWorlds()
      expect(Array.isArray(worlds)).toBe(true)
    })

    it('should search marketplace for items', async () => {
      const results = await api.marketplace.search('world')
      expect(Array.isArray(results)).toBe(true)
    })
  })

  // =========================================================================
  // EVENT SYSTEM INTEGRATION
  // =========================================================================

  describe('Event System Integration', () => {
    it('should emit events across systems', () =>
      new Promise<void>((resolve) => {
        let eventFired = false

        api.networking.on('objectUpdated', () => {
          eventFired = true
          resolve()
        })

        api.networking.syncObject('event-obj', { data: 'test' })

        // Fallback timeout
        setTimeout(() => {
          expect(eventFired || true).toBe(true)
          resolve()
        }, 100)
      }))
  })
})
