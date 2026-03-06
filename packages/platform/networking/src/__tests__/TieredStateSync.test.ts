/**
 * Tests for TieredStateSync, ConsistencyTier, ServerAuthority, ClientPrediction, NetworkManager
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConsistencyTierManager, ConsistencyLevel } from '../ConsistencyTier';
import { ServerAuthority, type EntityState, type ClientInput } from '../ServerAuthority';
import { ClientPrediction } from '../ClientPrediction';
import { TieredStateSync } from '../TieredStateSync';
import { NetworkManager } from '../NetworkManager';

// =============================================================================
// Helpers
// =============================================================================

function makeEntity(id: string, ownerId = 'client1'): EntityState {
  return {
    entityId: id,
    ownerId,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    velocity: { x: 0, y: 0, z: 0 },
    health: 100,
    customState: {},
    lastUpdateTick: 0,
    consistencyTier: ConsistencyLevel.Eventual,
  };
}

function makeInput(clientId: string, entityId: string, seq: number): ClientInput {
  return {
    clientId,
    entityId,
    inputSequence: seq,
    timestamp: Date.now(),
    moveDirection: { x: 1, y: 0, z: 0 },
    actions: [],
  };
}

// =============================================================================
// ConsistencyTierManager
// =============================================================================

describe('ConsistencyTierManager', () => {
  let manager: ConsistencyTierManager;

  beforeEach(() => {
    manager = new ConsistencyTierManager();
  });

  it('assigns and retrieves tiers', () => {
    manager.assignTier('e1', ConsistencyLevel.Strict);
    expect(manager.getTier('e1')).toBe(ConsistencyLevel.Strict);
  });

  it('defaults unknown entities to Relaxed', () => {
    expect(manager.getTier('unknown')).toBe(ConsistencyLevel.Relaxed);
  });

  it('creates state entries with incrementing sequences', () => {
    manager.assignTier('e1', ConsistencyLevel.Eventual);
    const e1 = manager.createStateEntry('e1', { pos: 1 });
    const e2 = manager.createStateEntry('e1', { pos: 2 });
    expect(e2.sequenceNumber).toBe(e1.sequenceNumber + 1);
  });

  it('tracks pending entries for ack-required tiers', () => {
    manager.assignTier('e1', ConsistencyLevel.Strict);
    manager.createStateEntry('e1', { data: 1 });
    expect(manager.getPendingEntries('e1').length).toBe(1);
  });

  it('does not track pending for Cosmetic tier', () => {
    manager.assignTier('e1', ConsistencyLevel.Cosmetic);
    manager.createStateEntry('e1', { data: 1 });
    expect(manager.getPendingEntries('e1').length).toBe(0);
  });

  it('acknowledges entries and clears them', () => {
    manager.assignTier('e1', ConsistencyLevel.Strict);
    const entry = manager.createStateEntry('e1', { data: 1 });
    expect(manager.acknowledge('e1', entry.sequenceNumber)).toBe(true);
    expect(manager.getPendingEntries('e1').length).toBe(0);
  });

  it('detects stale entries', () => {
    manager.assignTier('e1', ConsistencyLevel.Eventual);
    const entry = manager.createStateEntry('e1', { data: 1 });
    expect(manager.isStale(entry, entry.timestamp + 200)).toBe(true);
    expect(manager.isStale(entry, entry.timestamp + 50)).toBe(false);
  });

  it('Cosmetic entries are never stale', () => {
    manager.assignTier('e1', ConsistencyLevel.Cosmetic);
    const entry = manager.createStateEntry('e1', { data: 1 });
    expect(manager.isStale(entry, entry.timestamp + 999999)).toBe(false);
  });

  it('reports shouldPredict correctly', () => {
    manager.assignTier('e1', ConsistencyLevel.Strict);
    manager.assignTier('e2', ConsistencyLevel.Eventual);
    expect(manager.shouldPredict('e1')).toBe(false);
    expect(manager.shouldPredict('e2')).toBe(true);
  });

  it('removes entities', () => {
    manager.assignTier('e1', ConsistencyLevel.Strict);
    manager.removeEntity('e1');
    expect(manager.getEntityCount()).toBe(0);
  });

  it('groups entities by tier', () => {
    manager.assignTier('e1', ConsistencyLevel.Strict);
    manager.assignTier('e2', ConsistencyLevel.Strict);
    manager.assignTier('e3', ConsistencyLevel.Cosmetic);
    const grouped = manager.getEntitiesByTier();
    expect(grouped.get(ConsistencyLevel.Strict)!.length).toBe(2);
    expect(grouped.get(ConsistencyLevel.Cosmetic)!.length).toBe(1);
  });
});

// =============================================================================
// ServerAuthority
// =============================================================================

describe('ServerAuthority', () => {
  let server: ServerAuthority;

  beforeEach(() => {
    server = new ServerAuthority({ maxEntities: 5, maxVelocity: 10, maxTeleportDistance: 2 });
  });

  it('registers entities up to capacity', () => {
    for (let i = 0; i < 5; i++) {
      expect(server.registerEntity(makeEntity(`e${i}`))).toBe(true);
    }
    expect(server.registerEntity(makeEntity('e5'))).toBe(false);
    expect(server.getEntityCount()).toBe(5);
  });

  it('removes entities', () => {
    server.registerEntity(makeEntity('e1'));
    expect(server.removeEntity('e1')).toBe(true);
    expect(server.getEntityCount()).toBe(0);
  });

  it('validates velocity limits', () => {
    server.registerEntity(makeEntity('e1'));
    const result = server.validateStateChange('e1', {
      velocity: { x: 100, y: 0, z: 0 },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Velocity');
  });

  it('validates teleport distance', () => {
    server.registerEntity(makeEntity('e1'));
    const result = server.validateStateChange('e1', {
      position: { x: 10, y: 0, z: 0 },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('teleport');
  });

  it('validates health bounds', () => {
    server.registerEntity(makeEntity('e1'));
    const result = server.validateStateChange('e1', { health: 200 });
    expect(result.valid).toBe(false);
  });

  it('accepts valid state changes', () => {
    server.registerEntity(makeEntity('e1'));
    const result = server.validateStateChange('e1', {
      position: { x: 0.5, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
      health: 50,
    });
    expect(result.valid).toBe(true);
  });

  it('processes ticks and creates snapshots', () => {
    server.registerEntity(makeEntity('e1'));
    const snapshot = server.tick();
    expect(snapshot.tick).toBe(1);
    expect(snapshot.entities.length).toBe(1);
  });

  it('processes input on tick', () => {
    server.registerEntity(makeEntity('e1'));
    server.submitInput(makeInput('client1', 'e1', 1));
    const snapshot = server.tick();
    // Entity should have moved
    const entity = snapshot.entities.find((e) => e.entityId === 'e1')!;
    expect(entity.position.x).toBeGreaterThan(0);
  });

  it('rejects input from non-owner', () => {
    server.registerEntity(makeEntity('e1', 'client1'));
    server.submitInput(makeInput('client2', 'e1', 1));
    const snapshot = server.tick();
    const entity = snapshot.entities.find((e) => e.entityId === 'e1')!;
    expect(entity.position.x).toBe(0); // Did not move
  });

  it('generates delta snapshots', () => {
    server.registerEntity(makeEntity('e1'));
    server.tick();
    server.submitInput(makeInput('client1', 'e1', 1));
    server.tick();
    const delta = server.getDeltaSnapshot(1);
    expect(delta).not.toBeNull();
    expect(delta!.deltasFromTick).toBe(1);
    expect(delta!.entities.length).toBe(1);
  });
});

// =============================================================================
// ClientPrediction
// =============================================================================

describe('ClientPrediction', () => {
  let prediction: ClientPrediction;

  beforeEach(() => {
    prediction = new ClientPrediction({ snapThreshold: 5 });
  });

  it('initializes entity state', () => {
    const entity = makeEntity('e1');
    entity.position = { x: 10, y: 0, z: 0 };
    prediction.initializeEntity(entity);
    const state = prediction.getPredictedState('e1');
    expect(state!.position.x).toBe(10);
  });

  it('predicts local movement', () => {
    prediction.initializeEntity(makeEntity('e1'));
    const input = makeInput('client1', 'e1', 1);
    const state = prediction.predictInput('e1', input, 1 / 60);
    expect(state.position.x).toBeGreaterThan(0);
  });

  it('tracks unacknowledged inputs', () => {
    prediction.initializeEntity(makeEntity('e1'));
    prediction.predictInput('e1', makeInput('c1', 'e1', 1), 1 / 60);
    prediction.predictInput('e1', makeInput('c1', 'e1', 2), 1 / 60);
    expect(prediction.getUnacknowledgedCount('e1')).toBe(2);
  });

  it('reconciles with server state', () => {
    prediction.initializeEntity(makeEntity('e1'));
    prediction.predictInput('e1', makeInput('c1', 'e1', 1), 1 / 60);
    prediction.predictInput('e1', makeInput('c1', 'e1', 2), 1 / 60);

    const serverState = makeEntity('e1');
    serverState.position = { x: 0.01, y: 0, z: 0 };
    const result = prediction.reconcile('e1', serverState, 1);
    expect(result.inputsReplayed).toBe(1); // Only seq 2 is after tick 1
  });

  it('snaps on large correction', () => {
    prediction.initializeEntity(makeEntity('e1'));
    // Predict far from actual
    for (let i = 0; i < 100; i++) {
      prediction.predictInput('e1', makeInput('c1', 'e1', i + 1), 1);
    }
    const serverState = makeEntity('e1');
    serverState.position = { x: 0, y: 0, z: 0 };
    const result = prediction.reconcile('e1', serverState, 100);
    expect(result.smoothingFrames).toBe(0); // Snap, no smoothing
  });

  it('removes entities', () => {
    prediction.initializeEntity(makeEntity('e1'));
    prediction.removeEntity('e1');
    expect(prediction.getPredictedState('e1')).toBeUndefined();
  });
});

// =============================================================================
// TieredStateSync
// =============================================================================

describe('TieredStateSync', () => {
  let sync: TieredStateSync;

  beforeEach(() => {
    sync = new TieredStateSync({ maxEntities: 200 });
  });

  it('registers entities with tiers', () => {
    expect(sync.registerEntity(makeEntity('e1'), ConsistencyLevel.Strict)).toBe(true);
    expect(sync.registerEntity(makeEntity('e2'), ConsistencyLevel.Eventual)).toBe(true);
  });

  it('enforces entity limit', () => {
    const smallSync = new TieredStateSync({ maxEntities: 2 });
    expect(smallSync.registerEntity(makeEntity('e1'), ConsistencyLevel.Strict)).toBe(true);
    expect(smallSync.registerEntity(makeEntity('e2'), ConsistencyLevel.Strict)).toBe(true);
    expect(smallSync.registerEntity(makeEntity('e3'), ConsistencyLevel.Strict)).toBe(false);
  });

  it('processes ticks and returns snapshots', () => {
    sync.registerEntity(makeEntity('e1'), ConsistencyLevel.Eventual);
    const snapshot = sync.processTick();
    expect(snapshot.tick).toBe(1);
    expect(snapshot.entities.length).toBe(1);
  });

  it('returns predicted state for Eventual entities', () => {
    sync.registerEntity(makeEntity('e1'), ConsistencyLevel.Eventual);
    const predicted = sync.submitInput(makeInput('client1', 'e1', 1));
    expect(predicted).not.toBeNull();
    expect(predicted!.position.x).toBeGreaterThan(0);
  });

  it('returns null for Strict entities (no prediction)', () => {
    sync.registerEntity(makeEntity('e1'), ConsistencyLevel.Strict);
    const predicted = sync.submitInput(makeInput('client1', 'e1', 1));
    expect(predicted).toBeNull();
  });

  it('provides sync metrics', () => {
    sync.registerEntity(makeEntity('e1'), ConsistencyLevel.Strict);
    sync.registerEntity(makeEntity('e2'), ConsistencyLevel.Cosmetic);
    sync.processTick();
    const metrics = sync.getMetrics();
    expect(metrics.totalEntities).toBe(2);
    expect(metrics.ticksProcessed).toBe(1);
  });

  it('changes entity tier at runtime', () => {
    sync.registerEntity(makeEntity('e1'), ConsistencyLevel.Strict);
    sync.changeTier('e1', ConsistencyLevel.Cosmetic);
    expect(sync.getTierManager().getTier('e1')).toBe(ConsistencyLevel.Cosmetic);
  });

  it('removes entities cleanly', () => {
    sync.registerEntity(makeEntity('e1'), ConsistencyLevel.Strict);
    sync.removeEntity('e1');
    expect(sync.getServerAuthority().getEntityCount()).toBe(0);
  });
});

// =============================================================================
// NetworkManager
// =============================================================================

describe('NetworkManager', () => {
  let net: NetworkManager;

  afterEach(() => {
    net?.stop();
  });

  beforeEach(() => {
    net = new NetworkManager({ maxClients: 4, networkTickRateHz: 60, maxEntities: 200 });
  });

  it('connects clients up to limit', () => {
    expect(net.connectClient('c1')).toBe(true);
    expect(net.connectClient('c2')).toBe(true);
    expect(net.connectClient('c3')).toBe(true);
    expect(net.connectClient('c4')).toBe(true);
    expect(net.connectClient('c5')).toBe(false);
    expect(net.getClientCount()).toBe(4);
  });

  it('rejects duplicate clients', () => {
    net.connectClient('c1');
    expect(net.connectClient('c1')).toBe(false);
  });

  it('disconnects clients and removes their entities', () => {
    net.connectClient('c1');
    net.registerEntity('c1', makeEntity('e1', 'c1'), ConsistencyLevel.Eventual);
    net.disconnectClient('c1');
    expect(net.getClientCount()).toBe(0);
  });

  it('registers entities for connected clients', () => {
    net.connectClient('c1');
    expect(net.registerEntity('c1', makeEntity('e1', 'c1'))).toBe(true);
  });

  it('rejects entity registration for unconnected clients', () => {
    expect(net.registerEntity('c1', makeEntity('e1', 'c1'))).toBe(false);
  });

  it('emits events', () => {
    const events: string[] = [];
    net.on('client_connected', () => events.push('connected'));
    net.on('client_disconnected', () => events.push('disconnected'));
    net.connectClient('c1');
    net.disconnectClient('c1');
    expect(events).toEqual(['connected', 'disconnected']);
  });

  it('updates client latency', () => {
    net.connectClient('c1');
    net.updateLatency('c1', 42);
    const clients = net.getClients();
    expect(clients[0].latencyMs).toBe(42);
  });

  it('starts and stops tick loop', () => {
    net.start();
    expect(net.isRunning()).toBe(true);
    net.stop();
    expect(net.isRunning()).toBe(false);
  });

  it('generates unique session IDs', () => {
    const net2 = new NetworkManager();
    expect(net.getSessionId()).not.toBe(net2.getSessionId());
    net2.stop();
  });
});
