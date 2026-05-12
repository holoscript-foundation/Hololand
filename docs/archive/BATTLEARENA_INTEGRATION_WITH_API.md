# BattleArena Integration with HoloScriptSystemsAPI

## Overview

This guide shows how to integrate the BattleArena system into the existing HoloScriptSystemsAPI infrastructure.

---

## Architecture

### Current Systems (Existing)
1. NavigationSystem
2. EventBusSystem
3. AnalyticsSystem
4. AudioSystem
5. ParticleSystem
6. AnimationSystem
7. PhysicsSystem
8. UISystem
9. NetworkSystem
10. CameraSystem

### New System (Adding)
11. **BattleArenaSystem** ← You are here

---

## Integration Steps

### Step 1: Add BattleArena to HoloScriptSystemsAPI

**File**: `packages/core/src/HoloScriptSystemsAPI.ts`

```typescript
import BattleArena from '../systems/BattleArena.hsplus'

export class HoloScriptSystemsAPI {
  private systems: Map<string, any> = new Map()
  
  // ... existing code ...

  registerBattleArena(arena: BattleArena) {
    this.systems.set('battleArena', arena)
    return arena
  }

  getBattleArena(): BattleArena | undefined {
    return this.systems.get('battleArena')
  }
}
```

### Step 2: Export from Hook Layer

**File**: `packages/playground/src/hooks/useHoloScriptSystems.ts`

```typescript
import { useBattleArena } from './useBattleArena'

export function useHoloScriptSystems() {
  // ... existing systems ...
  
  const battleArena = useBattleArena()
  
  return {
    // ... existing systems ...
    battleArena
  }
}
```

### Step 3: Create Composite Hook

**File**: `packages/playground/src/hooks/useGameSystems.ts`

```typescript
import { useHoloScriptSystems } from './useHoloScriptSystems'
import { useBattleArena } from './useBattleArena'

export function useGameSystems() {
  const systems = useHoloScriptSystems()
  const battle = useBattleArena()

  // Connect systems
  if (battle.arena && systems.analytics) {
    battle.arena.on('damage:dealt', (event) => {
      systems.analytics.trackEvent('combat:damage', event)
    })

    battle.arena.on('npc:spawned', (event) => {
      systems.analytics.trackEvent('combat:spawn', event)
    })
  }

  return {
    ...systems,
    battleArena: battle
  }
}
```

---

## Cross-System Integration Examples

### 1. Analytics Integration

```typescript
const { battleArena, analytics } = useGameSystems()

// Track combat events
battleArena.arena?.on('damage:dealt', (event) => {
  analytics.trackEvent('combat:damage', {
    attacker: event.attacker,
    defender: event.defender,
    damage: event.damage,
    timestamp: Date.now()
  })
})

// Track NPC spawns
battleArena.arena?.on('npc:spawned', (event) => {
  analytics.trackEvent('combat:spawn', {
    npcType: event.npc.type,
    position: event.npc.position
  })
})
```

### 2. Audio Integration

```typescript
const { battleArena, audio } = useGameSystems()

// Play sounds on combat events
battleArena.arena?.on('projectile:fired', (event) => {
  audio.playSound('projectile-launch', {
    position: event.position,
    volume: 0.8
  })
})

battleArena.arena?.on('projectile:hit', (event) => {
  audio.playSound('impact', {
    position: event.position,
    volume: 1.0
  })
})

battleArena.arena?.on('death:animation', (event) => {
  audio.playSound('death', {
    position: event.npc.position,
    volume: 0.6
  })
})
```

### 3. Particle Integration

```typescript
const { battleArena, particles } = useGameSystems()

// Create particle effects
battleArena.arena?.on('projectile:hit', (event) => {
  particles.emit({
    type: 'explosion',
    position: event.position,
    count: 20,
    lifetime: 1000
  })
})

battleArena.arena?.on('damage:dealt', (event) => {
  // Floating damage numbers
  particles.emit({
    type: 'damage-number',
    position: event.position,
    text: `-${event.damage}`,
    color: '#ff0000'
  })
})
```

### 4. Animation Integration

```typescript
const { battleArena, animation } = useGameSystems()

// Play animations
battleArena.arena?.on('npc:spawned', (event) => {
  animation.play(event.npc.id, 'spawn', {
    duration: 0.5,
    loop: false
  })
})

battleArena.arena?.on('death:animation', (event) => {
  animation.play(event.npc.id, 'death', {
    duration: 3.0,
    loop: false
  })
})
```

### 5. Network Synchronization

```typescript
const { battleArena, network } = useGameSystems()

// Sync events across network
battleArena.arena?.on('npc:spawned', (event) => {
  network.broadcast('battle:npc-spawned', event)
})

battleArena.arena?.on('damage:dealt', (event) => {
  network.broadcast('battle:damage-dealt', event)
})

// Receive remote events
network.on('battle:npc-spawned', (data) => {
  battleArena.spawnNPC(data.config)
})

network.on('battle:damage-dealt', (data) => {
  battleArena.dealDamage(data.npcId, data.damage)
})
```

### 6. Camera Integration

```typescript
const { battleArena, camera } = useGameSystems()

// Focus on combat
battleArena.arena?.on('npc:spawned', (event) => {
  // If first NPC spawned, focus camera
  if (battleArena.npcs.length === 1) {
    camera.focus(event.npc.position, {
      distance: 30,
      height: 10
    })
  }
})

// Follow combat action
battleArena.arena?.on('projectile:fired', (event) => {
  camera.pan(event.position, { duration: 0.5 })
})
```

### 7. UI System Integration

```typescript
const { battleArena, ui } = useGameSystems()

// Show damage popups
battleArena.arena?.on('damage:dealt', (event) => {
  ui.createPopup({
    type: 'damage',
    text: `-${event.damage}`,
    position: event.position,
    duration: 1000,
    color: event.damage > 20 ? '#ff0000' : '#ffff00'
  })
})

// Show status messages
battleArena.arena?.on('npc:removed', (event) => {
  ui.createNotification({
    type: 'info',
    message: `${event.npc.name} defeated!`,
    duration: 3000
  })
})
```

---

## React Component Integration

### Example: Full Game Component

```typescript
import React, { useEffect } from 'react'
import { useGameSystems } from '@/hooks/useGameSystems'
import BattleArenaDemo from '@/components/BattleArenaDemo'

export function GameScene() {
  const systems = useGameSystems()

  useEffect(() => {
    // Initialize all systems on mount
    if (!systems.battleArena.arena) {
      systems.battleArena.initArena(100, 100)
    }

    // Spawn initial NPCs
    if (systems.battleArena.npcs.length === 0) {
      systems.battleArena.spawnNPC({
        id: 'fire-1',
        name: 'Fire Mage',
        type: 'fire-mage',
        position: { x: 0, y: 0, z: 0 },
        maxHealth: 80
      })

      systems.battleArena.spawnNPC({
        id: 'water-1',
        name: 'Water Elemental',
        type: 'water-elemental',
        position: { x: 30, y: 0, z: 0 },
        maxHealth: 100
      })
    }

    return () => {
      // Cleanup
      systems.battleArena.stopArena()
    }
  }, [systems])

  return (
    <div className="game-scene">
      <BattleArenaDemo />
      
      {/* Additional UI */}
      <div className="game-stats">
        <p>Active NPCs: {systems.battleArena.npcs.length}</p>
        <p>Projectiles: {systems.battleArena.projectiles.length}</p>
        <p>Events: {systems.battleArena.events.length}</p>
      </div>
    </div>
  )
}
```

---

## Event Flow Diagram

```
BattleArena System
      ↓
   Events
      ↓
   ┌─────────────────────────────────────┐
   │  Event Bus                          │
   │  ├─ analytics:trackEvent            │
   │  ├─ audio:playSound                 │
   │  ├─ particles:emit                  │
   │  ├─ animation:play                  │
   │  ├─ network:broadcast               │
   │  ├─ camera:focus                    │
   │  └─ ui:createPopup                  │
   └─────────────────────────────────────┘
      ↓
   All Systems Updated
      ↓
   UI Re-renders
      ↓
   User Sees Result
```

---

## Data Flow

```typescript
// Example: User spawns NPC and starts battle

1. User clicks "Start Battle"
   ↓
2. Component calls: battleArena.spawnNPC({ ... })
   ↓
3. BattleArena.spawnNPC() executes
   - Creates NPC
   - Emits 'npc:spawned' event
   ↓
4. Event listeners trigger:
   - Analytics: trackEvent('npc:spawned', ...)
   - Particles: emit('spawn', ...)
   - Animation: play('spawn', ...)
   - Audio: playSound('spawn', ...)
   ↓
5. useBattleArena hook updates state
   - Adds NPC to npcs array
   - Updates events log
   ↓
6. React re-renders
   - BattleArenaDemo component updates
   - Shows new NPC in list
   - Displays event in log
   ↓
7. UI reflects combat state
```

---

## Testing Integration

### Example: Testing System Integration

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGameSystems } from '@/hooks/useGameSystems'

describe('BattleArena System Integration', () => {
  it('should emit events to analytics', () => {
    const { result } = renderHook(() => useGameSystems())
    const { battleArena, analytics } = result.current

    // Spy on analytics
    const trackSpy = vi.spyOn(analytics, 'trackEvent')

    // Spawn NPC
    battleArena.spawnNPC({
      id: 'fire-1',
      name: 'Test',
      type: 'fire-mage',
      position: { x: 0, y: 0, z: 0 }
    })

    // Verify analytics was called
    expect(trackSpy).toHaveBeenCalledWith('npc:spawned', expect.any(Object))
  })

  it('should sync events across network', () => {
    const { result } = renderHook(() => useGameSystems())
    const { battleArena, network } = result.current

    // Spy on network broadcast
    const broadcastSpy = vi.spyOn(network, 'broadcast')

    // Perform action
    battleArena.dealDamage('fire-1', 10)

    // Verify broadcast
    expect(broadcastSpy).toHaveBeenCalledWith(
      'battle:damage-dealt',
      expect.any(Object)
    )
  })
})
```

---

## Performance Considerations

### Event Subscription Best Practices

```typescript
// ❌ DON'T: Create listeners on every render
function BadComponent() {
  const { battleArena } = useGameSystems()

  // This creates a new listener on every render!
  battleArena.arena?.on('damage:dealt', (event) => {
    console.log(event)
  })

  return <div />
}

// ✅ DO: Use useEffect to manage listeners
function GoodComponent() {
  const { battleArena } = useGameSystems()

  useEffect(() => {
    if (!battleArena.arena) return

    const handleDamage = (event: DamageEvent) => {
      console.log(event)
    }

    battleArena.arena.on('damage:dealt', handleDamage)

    // Cleanup listener on unmount
    return () => {
      battleArena.arena?.removeListener('damage:dealt', handleDamage)
    }
  }, [battleArena.arena])

  return <div />
}
```

### Event Debouncing

```typescript
// For high-frequency events, debounce:
import { debounce } from 'lodash'

const handleProjectileFired = debounce((event) => {
  audio.playSound('projectile', { position: event.position })
}, 100) // Max once per 100ms

battleArena.arena?.on('projectile:fired', handleProjectileFired)
```

---

## Configuration

### System Registration Order

```typescript
// File: packages/core/src/index.ts

import { HoloScriptSystemsAPI } from './HoloScriptSystemsAPI'
import { NavigationSystem } from './systems/NavigationSystem'
import { AudioSystem } from './systems/AudioSystem'
import { BattleArena } from './systems/BattleArena'

export function initializeHoloScriptSystems() {
  const api = HoloScriptSystemsAPI.getInstance()

  // Register core systems first
  api.registerSystem('navigation', new NavigationSystem())
  api.registerSystem('audio', new AudioSystem())

  // Register combat system
  const battleArena = new BattleArena(100, 100)
  api.registerBattleArena(battleArena)

  return api
}
```

---

## Troubleshooting

### Event Listeners Not Firing

```typescript
// Make sure arena is initialized
if (!battleArena.arena) {
  battleArena.initArena(100, 100)
}

// Make sure arena is started
battleArena.startArena()

// Check event names match exactly
battleArena.arena?.on('npc:spawned', ...)  // Correct
battleArena.arena?.on('npcSpawned', ...)   // Wrong - won't fire
```

### Memory Leaks

```typescript
// Always remove listeners when done
const listener = (event) => { ... }
battleArena.arena?.on('damage:dealt', listener)

// Later, cleanup:
battleArena.arena?.removeListener('damage:dealt', listener)

// Or use useEffect cleanup:
useEffect(() => {
  battleArena.arena?.on('damage:dealt', listener)
  return () => {
    battleArena.arena?.removeListener('damage:dealt', listener)
  }
}, [])
```

### Performance Issues

```typescript
// Profile system interactions
console.time('battle-update')
battleArena.arena?.update(deltaTime)
console.timeEnd('battle-update')

// If slow, check:
// 1. Number of NPCs
// 2. Number of projectiles
// 3. Number of event listeners
// 4. Other systems running simultaneously
```

---

## Summary

The BattleArena system integrates seamlessly with the existing HoloScriptSystemsAPI:

✅ Registers as 11th system
✅ Emits events for other systems to consume
✅ Subscribes to events from other systems
✅ Uses React hooks for state management
✅ Follows existing patterns and conventions

**Next**: Run tests, integrate into playground, add 3D rendering.
