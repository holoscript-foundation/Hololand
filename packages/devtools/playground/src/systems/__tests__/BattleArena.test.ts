/**
 * BattleArena.test.ts
 * 
 * Production tests for BattleArena system.
 * Validates all combat mechanics, projectiles, and NPC behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BattleArena } from '../BattleArena'

describe('BattleArena System', () => {
  let arena: BattleArena

  beforeEach(() => {
    arena = new BattleArena(100, 100)
  })

  afterEach(() => {
    arena.stop()
  })

  // ========================================================================
  // NPC Spawning & Management
  // ========================================================================

  describe('NPC Spawning', () => {
    it('should spawn a Fire Mage NPC', () => {
      const npc = arena.spawnNPC({
        id: 'fire-mage-1',
        name: 'Inferno',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 },
        maxHealth: 80
      })

      expect(npc.id).toBe('fire-mage-1')
      expect(npc.type).toBe('fire-mage')
      expect(npc.maxHealth).toBe(80)
      expect(npc.stats.attack).toBe(15)
      expect(npc.isAlive).toBe(true)
    })

    it('should spawn a Water Elemental NPC', () => {
      const npc = arena.spawnNPC({
        id: 'water-elem-1',
        name: 'Aqua',
        type: 'water-elemental',
        position: { x: 20, y: 0, z: 0 },
        maxHealth: 100
      })

      expect(npc.type).toBe('water-elemental')
      expect(npc.stats.defense).toBe(8)
      expect(npc.stats.speed).toBe(3)
    })

    it('should retrieve spawned NPC', () => {
      arena.spawnNPC({
        id: 'test-npc',
        name: 'Test',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 }
      })

      const npc = arena.getNPC('test-npc')
      expect(npc).toBeDefined()
      expect(npc?.name).toBe('Test')
    })

    it('should get all NPCs', () => {
      arena.spawnNPC({
        id: 'npc-1',
        name: 'First',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 }
      })

      arena.spawnNPC({
        id: 'npc-2',
        name: 'Second',
        type: 'water-elemental',
        position: { x: 10, y: 0, z: 0 }
      })

      const all = arena.getAllNPCs()
      expect(all).toHaveLength(2)
      expect(all.map(n => n.id)).toContain('npc-1')
      expect(all.map(n => n.id)).toContain('npc-2')
    })

    it('should remove NPC', () => {
      arena.spawnNPC({
        id: 'removable',
        name: 'Remove Me',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 }
      })

      arena.removeNPC('removable')
      const npc = arena.getNPC('removable')
      expect(npc).toBeUndefined()
    })
  })

  // ========================================================================
  // Combat System
  // ========================================================================

  describe('Combat Damage', () => {
    it('should deal damage to NPC', () => {
      arena.spawnNPC({
        id: 'target',
        name: 'Target',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 },
        maxHealth: 100
      })

      arena.dealDamage('target', 25, 'attacker')
      const npc = arena.getNPC('target')
      expect(npc?.health).toBeLessThan(100)
      expect(npc?.health).toBeGreaterThan(0)
    })

    it('should reduce damage based on defense', () => {
      arena.spawnNPC({
        id: 'defensive',
        name: 'Defensive',
        type: 'water-elemental',  // Has 8 defense
        position: { x: 0, y: 0, z: 0 },
        maxHealth: 100
      })

      const healthBefore = 100
      arena.dealDamage('defensive', 20, 'attacker')
      const npc = arena.getNPC('defensive')!

      const damageTaken = healthBefore - npc.health
      expect(damageTaken).toBeLessThan(20)
    })

    it('should kill NPC when health reaches 0', () => {
      arena.spawnNPC({
        id: 'doomed',
        name: 'Doomed',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 },
        maxHealth: 50
      })

      arena.dealDamage('doomed', 100, 'attacker')
      const npc = arena.getNPC('doomed')
      expect(npc?.health).toBe(0)
      expect(npc?.isAlive).toBe(false)
    })

    it('should not deal damage to dead NPC', () => {
      arena.spawnNPC({
        id: 'dead',
        name: 'Dead',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 },
        maxHealth: 50
      })

      arena.killNPC('dead')
      const npcBefore = arena.getNPC('dead')!
      const healthBefore = npcBefore.health

      arena.dealDamage('dead', 50, 'attacker')
      // NPC removed after animation, so should be undefined
      const npcAfter = arena.getNPC('dead')
      // Either undefined or health unchanged
      if (npcAfter) {
        expect(npcAfter.health).toBe(healthBefore)
      }
    })
  })

  describe('Projectiles', () => {
    it('should fire projectile from NPC', () => {
      arena.spawnNPC({
        id: 'shooter',
        name: 'Shooter',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 }
      })

      const projectile = arena.fireProjectile({
        ownerId: 'shooter',
        targetId: null,
        position: { x: 0, y: 0, z: 0 }
      })

      expect(projectile.owner).toBe('shooter')
      expect(projectile.type).toBe('fireball')
      expect(projectile.damage).toBe(15)  // Fire Mage attack
    })

    it('should fire correct projectile type', () => {
      arena.spawnNPC({
        id: 'water',
        name: 'Water',
        type: 'water-elemental',
        position: { x: 0, y: 0, z: 0 }
      })

      const projectile = arena.fireProjectile({
        ownerId: 'water',
        targetId: null,
        position: { x: 0, y: 0, z: 0 }
      })

      expect(projectile.type).toBe('water-bolt')
    })

    it('should throw error when firing from non-existent NPC', () => {
      expect(() => {
        arena.fireProjectile({
          ownerId: 'nonexistent',
          targetId: null,
          position: { x: 0, y: 0, z: 0 }
        })
      }).toThrow()
    })

    it('should calculate projectile velocity towards target', () => {
      arena.spawnNPC({
        id: 'shooter',
        name: 'Shooter',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 }
      })

      arena.spawnNPC({
        id: 'target',
        name: 'Target',
        type: 'water-elemental',
        position: { x: 10, y: 0, z: 0 }
      })

      const projectile = arena.fireProjectile({
        ownerId: 'shooter',
        targetId: 'target',
        position: { x: 0, y: 0, z: 0 }
      })

      // Velocity should point towards target
      expect(projectile.velocity.x).toBeGreaterThan(0)
      const speed = Math.sqrt(
        projectile.velocity.x ** 2 +
        projectile.velocity.y ** 2 +
        projectile.velocity.z ** 2
      )
      expect(speed).toBeCloseTo(projectile.speed, 0.1)
    })
  })

  // ========================================================================
  // Range & Distance
  // ========================================================================

  describe('Range & Distance Checks', () => {
    beforeEach(() => {
      arena.spawnNPC({
        id: 'npc-1',
        name: 'NPC1',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 }
      })

      arena.spawnNPC({
        id: 'npc-2',
        name: 'NPC2',
        type: 'water-elemental',
        position: { x: 15, y: 0, z: 0 }
      })
    })

    it('should check if NPC is in attack range', () => {
      // Fire Mage has 20 range, water is at 15 distance
      const inRange = arena.isInRange('npc-1', 'npc-2')
      expect(inRange).toBe(true)
    })

    it('should return false when out of range', () => {
      arena.spawnNPC({
        id: 'far-npc',
        name: 'Far',
        type: 'fire-mage',
        position: { x: 100, y: 0, z: 0 }
      })

      const inRange = arena.isInRange('npc-1', 'far-npc')
      expect(inRange).toBe(false)
    })

    it('should calculate distance between NPCs', () => {
      const distance = arena.getDistance('npc-1', 'npc-2')
      expect(distance).toBeCloseTo(15, 0.1)
    })

    it('should find nearest NPC', () => {
      arena.spawnNPC({
        id: 'npc-3',
        name: 'NPC3',
        type: 'fire-mage',
        position: { x: 5, y: 0, z: 0 }
      })

      const nearest = arena.getNearestNPC({ x: 0, y: 0, z: 0 }, 'npc-1')
      expect(nearest?.id).toBe('npc-3')
    })

    it('should respect max distance for nearest NPC', () => {
      const nearest = arena.getNearestNPC(
        { x: 0, y: 0, z: 0 },
        'npc-1',
        10
      )
      expect(nearest).toBeNull()
    })
  })

  // ========================================================================
  // Arena State
  // ========================================================================

  describe('Arena State', () => {
    it('should get arena state', () => {
      arena.spawnNPC({
        id: 'npc',
        name: 'NPC',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 }
      })

      const state = arena.getState()
      expect(state.npcs).toHaveLength(1)
      expect(state.npcs[0].id).toBe('npc')
    })

    it('should get health status of all NPCs', () => {
      arena.spawnNPC({
        id: 'npc-1',
        name: 'NPC1',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 },
        maxHealth: 100
      })

      arena.spawnNPC({
        id: 'npc-2',
        name: 'NPC2',
        type: 'water-elemental',
        position: { x: 10, y: 0, z: 0 },
        maxHealth: 120
      })

      const status = arena.getHealthStatus()
      expect(status['npc-1'].current).toBe(100)
      expect(status['npc-1'].max).toBe(100)
      expect(status['npc-2'].current).toBe(120)
      expect(status['npc-2'].max).toBe(120)
    })
  })

  // ========================================================================
  // Arena Lifecycle
  // ========================================================================

  describe('Arena Lifecycle', () => {
    it('should start arena', (done) => {
      const listener = vi.fn()
      arena.on('arena:started', listener)

      arena.start()
      setTimeout(() => {
        expect(listener).toHaveBeenCalled()
        done()
      }, 100)
    })

    it('should stop arena', (done) => {
      arena.start()
      const listener = vi.fn()
      arena.on('arena:stopped', listener)

      setTimeout(() => {
        arena.stop()
        setTimeout(() => {
          expect(listener).toHaveBeenCalled()
          done()
        }, 50)
      }, 100)
    })
  })
})
