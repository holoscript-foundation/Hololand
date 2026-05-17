/**
 * HoloScript Test Utilities
 *
 * Provides HoloScript-specific testing helpers built on top of Vitest.
 * Includes fixtures, assertions, and utilities for testing HoloScript Plus systems.
 */

import { EventEmitter } from 'events';

/**
 * Test fixture for BattleArena system
 */
export interface BattleArenaFixture {
  arena: any;
  npcs: any[];
  projectiles: any[];
  events: any[];
  cleanup: () => void;
}

/**
 * Create a test fixture for BattleArena system
 */
export function createBattleArenaFixture(): BattleArenaFixture {
  const events: any[] = [];

  return {
    arena: null,
    npcs: [],
    projectiles: [],
    events,
    cleanup: () => {
      events.length = 0;
    },
  };
}

/**
 * Assert that an event was emitted
 */
export function expectEventEmitted(
  system: EventEmitter,
  eventName: string,
  timeout = 1000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Event "${eventName}" was not emitted within ${timeout}ms`));
    }, timeout);

    const listener = (data: any) => {
      clearTimeout(timer);
      system.removeListener(eventName, listener);
      resolve(data);
    };

    system.once(eventName, listener);
  });
}

/**
 * Create a mock NPC for testing
 */
export function createMockNPC(overrides?: Partial<any>) {
  return {
    id: 'mock-npc-1',
    name: 'Mock NPC',
    type: 'fire-mage' as const,
    position: { x: 0, y: 0, z: 0 },
    health: 50,
    maxHealth: 100,
    mana: 30,
    maxMana: 100,
    isAlive: true,
    stats: {
      attack: 15,
      defense: 5,
      speed: 10,
      attackRange: 25,
    },
    ...overrides,
  };
}

/**
 * Create a mock projectile for testing
 */
export function createMockProjectile(overrides?: Partial<any>) {
  return {
    id: 'mock-projectile-1',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 1, y: 0, z: 0 },
    owner: 'mock-npc-1',
    targetId: 'mock-npc-2',
    damage: 10,
    speed: 20,
    lifespan: 5000,
    type: 'fireball' as const,
    ...overrides,
  };
}

/**
 * Wait for a condition to be true
 */
export function waitFor(condition: () => boolean, timeout = 1000, interval = 50): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

/**
 * Create a test system with event tracking
 */
export function createTestSystem<T extends EventEmitter>(
  SystemClass: new (...args: any[]) => T,
  ...args: any[]
): T & { recordedEvents: any[] } {
  const system = new SystemClass(...args);
  const recordedEvents: any[] = [];

  // Intercept all events
  const originalOn = system.on.bind(system);
  system.on = function (eventName: string | symbol, listener: (...args: unknown[]) => void) {
    recordedEvents.push({ eventName, timestamp: Date.now() });
    return originalOn(eventName, listener);
  };

  // Add recorded events property
  return Object.assign(system, { recordedEvents });
}

/**
 * Perform an action and wait for an event
 */
export async function expectEventAfterAction<T>(
  system: EventEmitter,
  eventName: string,
  action: () => T | Promise<T>,
  timeout = 1000
): Promise<{ data: any; actionResult: T }> {
  const eventPromise = expectEventEmitted(system, eventName, timeout);
  const actionResult = await action();
  const data = await eventPromise;
  return { data, actionResult };
}

/**
 * Test that a system initializes correctly
 */
export function expectSystemInitialization<T extends EventEmitter>(system: T): void {
  if (!system) {
    throw new Error('System failed to initialize');
  }
  if (typeof system.on !== 'function') {
    throw new Error('System is not an EventEmitter');
  }
}

/**
 * Test that a system has all required methods
 */
export function expectSystemHasMethods<T extends EventEmitter>(system: T, methods: string[]): void {
  for (const method of methods) {
    if (typeof (system as any)[method] !== 'function') {
      throw new Error(`System missing required method: ${method}`);
    }
  }
}

/**
 * Compare NPC states
 */
export function compareNPCStates(npc1: any, npc2: any): string[] {
  const differences: string[] = [];

  if (npc1.health !== npc2.health) {
    differences.push(`health: ${npc1.health} -> ${npc2.health}`);
  }
  if (npc1.mana !== npc2.mana) {
    differences.push(`mana: ${npc1.mana} -> ${npc2.mana}`);
  }
  if (npc1.isAlive !== npc2.isAlive) {
    differences.push(`isAlive: ${npc1.isAlive} -> ${npc2.isAlive}`);
  }
  if (npc1.position.x !== npc2.position.x || npc1.position.y !== npc2.position.y) {
    differences.push(
      `position: (${npc1.position.x},${npc1.position.y}) -> (${npc2.position.x},${npc2.position.y})`
    );
  }

  return differences;
}

/**
 * Create a simple mock EventEmitter for testing
 */
export class MockEventEmitter extends EventEmitter {
  emittedEvents: Array<{ eventName: string | symbol; data: unknown; timestamp: number }> = [];

  emit(eventName: string | symbol, ...args: unknown[]): boolean {
    this.emittedEvents.push({
      eventName,
      data: args[0],
      timestamp: Date.now(),
    });
    return super.emit(eventName, ...args);
  }

  getEmittedEvents(eventName?: string) {
    if (eventName) {
      return this.emittedEvents.filter((e) => e.eventName === eventName);
    }
    return this.emittedEvents;
  }

  clearEmittedEvents() {
    this.emittedEvents = [];
  }
}

export default {
  createBattleArenaFixture,
  expectEventEmitted,
  expectEventAfterAction,
  createMockNPC,
  createMockProjectile,
  waitFor,
  createTestSystem,
  expectSystemInitialization,
  expectSystemHasMethods,
  compareNPCStates,
  MockEventEmitter,
};
