/**
 * BattleArenaDemo.tsx
 * 
 * React component demonstrating the BattleArena system.
 * Shows spawning NPCs, managing combat, and viewing real-time state.
 */

import { useState } from 'react'
import { useBattleArena } from '../hooks/useBattleArena'

interface Character {
  name: string
  type: 'fire-mage' | 'water-elemental'
  health: number
  maxHealth: number
}

export function BattleArenaDemo() {
  const battle = useBattleArena()
  const [characters, setCharacters] = useState<Character[]>([])
  const [eventFilter, setEventFilter] = useState<string>('')

  // Initialize arena with default NPCs
  const initializeBattle = () => {
    // Spawn Fire Mage
    const fireMage = battle.spawnNPC({
      id: 'fire-mage-1',
      name: 'Inferno',
      type: 'fire-mage',
      position: { x: 0, y: 5, z: 0 },
      maxHealth: 80
    })

    // Spawn Water Elemental
    const waterElem = battle.spawnNPC({
      id: 'water-elem-1',
      name: 'Aqua',
      type: 'water-elemental',
      position: { x: 30, y: 5, z: 0 },
      maxHealth: 100
    })

    setCharacters([
      {
        name: fireMage.name,
        type: 'fire-mage',
        health: fireMage.health,
        maxHealth: fireMage.maxHealth
      },
      {
        name: waterElem.name,
        type: 'water-elemental',
        health: waterElem.health,
        maxHealth: waterElem.maxHealth
      }
    ])
  }

  const handleStartBattle = () => {
    if (!battle.isRunning) {
      if (battle.npcs.length === 0) {
        initializeBattle()
      }
      battle.startArena()
    }
  }

  const handleStopBattle = () => {
    if (battle.isRunning) {
      battle.stopArena()
    }
  }

  const handleResetBattle = () => {
    battle.resetArena()
    setCharacters([])
  }

  const filteredEvents = battle.events.filter(event =>
    !eventFilter || event.type.includes(eventFilter)
  )

  const healthStatus = battle.getHealthStatus()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Battle Arena Demo</h1>

      {/* Status */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Arena Status</p>
          <p className="text-2xl font-bold">
            {battle.isRunning ? '🟢 Running' : '🔴 Stopped'}
          </p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Active NPCs</p>
          <p className="text-2xl font-bold">{battle.npcs.length}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Projectiles</p>
          <p className="text-2xl font-bold">{battle.projectiles.length}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleStartBattle}
            disabled={battle.isRunning}
            className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:bg-gray-300"
          >
            {battle.npcs.length === 0 ? 'Initialize & Start' : 'Start'}
          </button>
          <button
            onClick={handleStopBattle}
            disabled={!battle.isRunning}
            className="px-4 py-2 bg-red-500 text-white rounded-lg disabled:bg-gray-300"
          >
            Stop
          </button>
          <button
            onClick={handleResetBattle}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Characters Status */}
      {battle.npcs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Character Status</h2>
          <div className="grid grid-cols-1 gap-4">
            {battle.npcs.map(npc => {
              const status = healthStatus[npc.id]
              const healthPercent = status
                ? (status.current / status.max) * 100
                : 0
              const healthColor =
                healthPercent > 66
                  ? 'bg-green-500'
                  : healthPercent > 33
                    ? 'bg-yellow-500'
                    : 'bg-red-500'

              return (
                <div
                  key={npc.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">{npc.name}</h3>
                    <span className="text-sm text-gray-600">
                      {npc.type === 'fire-mage' ? '🔥' : '💧'} {npc.type}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Health</span>
                      <span>
                        {status?.current ?? npc.health}/
                        {status?.max ?? npc.maxHealth}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className={`${healthColor} h-full rounded-full transition-all`}
                        style={{ width: `${healthPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-blue-50 p-2 rounded">
                      <span className="text-gray-600">Mana</span>
                      <p className="font-semibold">
                        {npc.mana.toFixed(0)}/{npc.maxMana}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <span className="text-gray-600">Attack</span>
                      <p className="font-semibold">{npc.stats.attack}</p>
                    </div>
                  </div>

                  {status && !status.alive && (
                    <div className="text-center text-lg font-bold text-red-600">
                      💀 Defeated
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Events Log */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Event Log</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filter events..."
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
              className="px-2 py-1 border rounded text-sm"
            />
            <button
              onClick={() => battle.clearEventLog()}
              className="px-2 py-1 text-sm bg-gray-200 rounded"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="border rounded-lg bg-gray-50 p-4 max-h-96 overflow-y-auto space-y-1 font-mono text-sm">
          {filteredEvents.length === 0 ? (
            <p className="text-gray-400">No events yet...</p>
          ) : (
            filteredEvents.map((event, idx) => (
              <div key={idx} className="py-1 border-b last:border-b-0">
                <span className="font-semibold text-blue-600">
                  {event.type}
                </span>
                <span className="text-gray-600 ml-2">
                  {JSON.stringify(event.data).substring(0, 80)}...
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-100 p-4 rounded-lg space-y-2 text-sm">
        <p>
          <span className="font-semibold">Total Events:</span>{' '}
          {battle.events.length}
        </p>
        <p>
          <span className="font-semibold">Arena State:</span>{' '}
          <code>{JSON.stringify(battle.getArenaState()).substring(0, 100)}...</code>
        </p>
      </div>
    </div>
  )
}

export default BattleArenaDemo
