/**
 * useBattleArena.ts
 * 
 * React hook for integrating BattleArena system with Hololand.
 * Provides UI state and control methods for arena management.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import BattleArena, { type NPC, type Projectile } from '../systems/BattleArena'
import type { Vector3 } from '../types'

interface BattleState {
  npcs: NPC[]
  projectiles: Projectile[]
  isRunning: boolean
  activeCombats: Array<[string, string]>
  events: Array<{
    type: string
    timestamp: number
    data: any
  }>
}

const initialState: BattleState = {
  npcs: [],
  projectiles: [],
  isRunning: false,
  activeCombats: [],
  events: []
}

export function useBattleArena() {
  const [state, setState] = useState<BattleState>(initialState)
  const arenaRef = useRef<BattleArena | null>(null)
  const eventLogRef = useRef<Array<{ type: string; timestamp: number; data: any }>>([])

  // ========================================================================
  // Initialize Arena
  // ========================================================================

  const initializeArena = useCallback((width?: number, height?: number) => {
    if (arenaRef.current) return arenaRef.current

    const arena = new BattleArena(width, height)
    arenaRef.current = arena

    // Wire up events
    const handleEvent = (type: string) => (data: any) => {
      const event = {
        type,
        timestamp: Date.now(),
        data
      }
      eventLogRef.current.push(event)
      eventLogRef.current = eventLogRef.current.slice(-50) // Keep last 50 events

      setState(prev => ({
        ...prev,
        events: eventLogRef.current
      }))
    }

    arena.on('npc:spawned', handleEvent('npc:spawned'))
    arena.on('npc:removed', handleEvent('npc:removed'))
    arena.on('damage:dealt', handleEvent('damage:dealt'))
    arena.on('death:animation', handleEvent('death:animation'))
    arena.on('projectile:fired', handleEvent('projectile:fired'))
    arena.on('projectile:hit', handleEvent('projectile:hit'))
    arena.on('projectile:expired', handleEvent('projectile:expired'))
    arena.on('arena:started', handleEvent('arena:started'))
    arena.on('arena:stopped', handleEvent('arena:stopped'))

    return arena
  }, [])

  // ========================================================================
  // Arena Control
  // ========================================================================

  const startArena = useCallback(() => {
    const arena = arenaRef.current || initializeArena()
    arena.start()
    setState(prev => ({ ...prev, isRunning: true }))
  }, [initializeArena])

  const stopArena = useCallback(() => {
    if (arenaRef.current) {
      arenaRef.current.stop()
      setState(prev => ({ ...prev, isRunning: false }))
    }
  }, [])

  const resetArena = useCallback(() => {
    stopArena()
    arenaRef.current = null
    eventLogRef.current = []
    setState(initialState)
  }, [stopArena])

  // ========================================================================
  // NPC Management
  // ========================================================================

  const spawnNPC = useCallback((config: {
    id: string
    name: string
    type: 'fire-mage' | 'water-elemental' | 'player'
    position: Vector3
    maxHealth?: number
    maxMana?: number
  }) => {
    const arena = arenaRef.current || initializeArena()
    const npc = arena.spawnNPC({
      ...config,
      stats: config.type === 'fire-mage' ? {
        attack: 15,
        defense: 5,
        speed: 2.5,
        attackRange: 20
      } : config.type === 'water-elemental' ? {
        attack: 12,
        defense: 8,
        speed: 3,
        attackRange: 15
      } : {
        attack: 10,
        defense: 5,
        speed: 4,
        attackRange: 20
      }
    })

    setState(prev => ({
      ...prev,
      npcs: [...prev.npcs, npc]
    }))

    return npc
  }, [initializeArena])

  const getNPC = useCallback((npcId: string) => {
    return arenaRef.current?.getNPC(npcId)
  }, [])

  const removeNPC = useCallback((npcId: string) => {
    if (arenaRef.current) {
      arenaRef.current.removeNPC(npcId)
      setState(prev => ({
        ...prev,
        npcs: prev.npcs.filter(n => n.id !== npcId)
      }))
    }
  }, [])

  // ========================================================================
  // Combat
  // ========================================================================

  const dealDamage = useCallback((targetId: string, damage: number, attackerId: string) => {
    if (arenaRef.current) {
      arenaRef.current.dealDamage(targetId, damage, attackerId)
    }
  }, [])

  const killNPC = useCallback((npcId: string) => {
    if (arenaRef.current) {
      arenaRef.current.killNPC(npcId)
    }
  }, [])

  const fireProjectile = useCallback((config: {
    ownerId: string
    targetId: string | null
    position: Vector3
    damage?: number
    projectileType?: 'fireball' | 'water-bolt'
  }) => {
    if (arenaRef.current) {
      return arenaRef.current.fireProjectile(config)
    }
  }, [])

  // ========================================================================
  // Movement & Range
  // ========================================================================

  const moveTowards = useCallback((npcId: string, target: Vector3) => {
    if (arenaRef.current) {
      arenaRef.current.moveTowards(npcId, target, 0.016)
    }
  }, [])

  const isInRange = useCallback((npcId: string, targetId: string): boolean => {
    return arenaRef.current?.isInRange(npcId, targetId) ?? false
  }, [])

  const getDistance = useCallback((npcId1: string, npcId2: string): number => {
    return arenaRef.current?.getDistance(npcId1, npcId2) ?? Infinity
  }, [])

  const getNearestNPC = useCallback((position: Vector3, excludeId?: string, maxDistance?: number) => {
    return arenaRef.current?.getNearestNPC(position, excludeId, maxDistance) ?? null
  }, [])

  // ========================================================================
  // State
  // ========================================================================

  const getArenaState = useCallback(() => {
    return arenaRef.current?.getState() ?? { npcs: [], projectiles: [], activeCombats: [] }
  }, [])

  const getHealthStatus = useCallback(() => {
    return arenaRef.current?.getHealthStatus() ?? {}
  }, [])

  const clearEventLog = useCallback(() => {
    eventLogRef.current = []
    setState(prev => ({ ...prev, events: [] }))
  }, [])

  // ========================================================================
  // Update State Periodically
  // ========================================================================

  useEffect(() => {
    if (!state.isRunning || !arenaRef.current) return

    const interval = setInterval(() => {
      const arena = arenaRef.current!
      setState(prev => ({
        ...prev,
        npcs: arena.getAllNPCs(),
        projectiles: arena.getState().projectiles
      }))
    }, 16) // ~60 FPS

    return () => clearInterval(interval)
  }, [state.isRunning])

  // ========================================================================
  // Cleanup
  // ========================================================================

  useEffect(() => {
    return () => {
      if (arenaRef.current) {
        arenaRef.current.stop()
      }
    }
  }, [])

  return {
    // State
    npcs: state.npcs,
    projectiles: state.projectiles,
    isRunning: state.isRunning,
    events: state.events,
    activeCombats: state.activeCombats,

    // Arena Control
    startArena,
    stopArena,
    resetArena,

    // NPC Management
    spawnNPC,
    getNPC,
    removeNPC,

    // Combat
    dealDamage,
    killNPC,
    fireProjectile,

    // Movement & Range
    moveTowards,
    isInRange,
    getDistance,
    getNearestNPC,

    // State
    getArenaState,
    getHealthStatus,
    clearEventLog
  }
}

export type UseBattleArenaReturn = ReturnType<typeof useBattleArena>
