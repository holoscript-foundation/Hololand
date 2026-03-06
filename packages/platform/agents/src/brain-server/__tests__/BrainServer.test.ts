/**
 * Tests for BrainServer, BatchedInference, AgentOrphanManager, CRDTPublisher
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BatchedInference, type InferenceRequest } from '../BatchedInference';
import { AgentOrphanManager } from '../AgentOrphanManager';
import { CRDTPublisher } from '../CRDTPublisher';
import { BrainServer } from '../BrainServer';

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(agentId: string, requestId?: string): InferenceRequest {
  return {
    requestId: requestId ?? `req_${agentId}_${Date.now()}`,
    agentId,
    modelId: 'test-model',
    inputTokens: [1, 2, 3],
    maxOutputTokens: 10,
    priority: 1,
    createdAt: Date.now(),
    timeoutMs: 5000,
  };
}

const mockExecutor = vi.fn().mockImplementation(async (batch: InferenceRequest[]) => {
  return batch.map(() => [10, 20, 30]);
});

// =============================================================================
// BatchedInference
// =============================================================================

describe('BatchedInference', () => {
  let engine: BatchedInference;

  beforeEach(() => {
    mockExecutor.mockClear();
    engine = new BatchedInference(mockExecutor, { maxBatchSize: 4, maxBatchWaitMs: 10 });
  });

  it('processes a single request', async () => {
    const response = await engine.submit(makeRequest('agent1', 'r1'));
    expect(response.agentId).toBe('agent1');
    expect(response.outputTokens).toEqual([10, 20, 30]);
  });

  it('batches multiple requests', async () => {
    const promises = [
      engine.submit(makeRequest('agent1', 'r1')),
      engine.submit(makeRequest('agent2', 'r2')),
      engine.submit(makeRequest('agent3', 'r3')),
    ];
    const results = await Promise.all(promises);
    expect(results.length).toBe(3);
    // All should share the same batch
    expect(results[0].batchId).toBe(results[1].batchId);
  });

  it('respects priority ordering', async () => {
    const lowPriority = makeRequest('agent1', 'low');
    lowPriority.priority = 10;
    const highPriority = makeRequest('agent2', 'high');
    highPriority.priority = 0;

    const promises = [engine.submit(lowPriority), engine.submit(highPriority)];
    const results = await Promise.all(promises);
    // High priority should be first in batch
    const highResult = results.find((r) => r.requestId === 'high')!;
    expect(highResult.batchPosition).toBe(0);
  });

  it('reports metrics', async () => {
    await engine.submit(makeRequest('agent1', 'r1'));
    const metrics = engine.getMetrics();
    expect(metrics.totalBatches).toBeGreaterThanOrEqual(1);
    expect(metrics.totalRequests).toBe(1);
  });
});

// =============================================================================
// AgentOrphanManager
// =============================================================================

describe('AgentOrphanManager', () => {
  let manager: AgentOrphanManager;

  beforeEach(() => {
    manager = new AgentOrphanManager({
      heartbeatTimeoutMs: 100,
      gracePeriodMs: 50,
      checkIntervalMs: 1000,
    });
  });

  afterEach(() => {
    manager.stopMonitoring();
  });

  it('registers and retrieves agents', () => {
    manager.registerAgent('a1', 'c1', 'model1');
    expect(manager.getAgent('a1')).toBeDefined();
    expect(manager.getAgentCount()).toBe(1);
  });

  it('records heartbeats', () => {
    manager.registerAgent('a1', 'c1', 'model1');
    expect(manager.heartbeat('a1')).toBe(true);
    expect(manager.heartbeat('unknown')).toBe(false);
  });

  it('tracks active inferences', () => {
    manager.registerAgent('a1', 'c1', 'model1');
    manager.startInference('a1');
    manager.startInference('a1');
    expect(manager.getAgent('a1')!.activeInferences).toBe(2);
    manager.endInference('a1');
    expect(manager.getAgent('a1')!.activeInferences).toBe(1);
  });

  it('detects orphans after heartbeat timeout + grace period', async () => {
    manager.registerAgent('a1', 'c1', 'model1');
    // Wait for heartbeat timeout
    await new Promise((r) => setTimeout(r, 110));
    let orphans = manager.checkOrphans();
    expect(orphans.length).toBe(0); // In grace period

    await new Promise((r) => setTimeout(r, 60));
    orphans = manager.checkOrphans();
    expect(orphans).toContain('a1');
  });

  it('calls cleanup handlers', async () => {
    const handler = vi.fn();
    manager.onOrphan(handler);
    manager.registerAgent('a1', 'c1', 'model1');
    await new Promise((r) => setTimeout(r, 170));
    manager.checkOrphans();
    expect(handler).toHaveBeenCalledWith('a1', 'heartbeat_timeout');
  });

  it('removes agents manually', () => {
    manager.registerAgent('a1', 'c1', 'model1');
    manager.removeAgent('a1');
    expect(manager.getAgentCount()).toBe(0);
  });
});

// =============================================================================
// CRDTPublisher
// =============================================================================

describe('CRDTPublisher', () => {
  let publisher: CRDTPublisher;

  beforeEach(() => {
    publisher = new CRDTPublisher('node1');
  });

  it('publishes and retrieves state', () => {
    publisher.publish('agent1', 'position', { x: 1, y: 2 });
    const state = publisher.getState('agent1');
    expect(state).toBeDefined();
    expect(state!.position).toEqual({ x: 1, y: 2 });
  });

  it('increments vector clocks', () => {
    const op1 = publisher.publish('agent1', 'key1', 'val1');
    const op2 = publisher.publish('agent1', 'key2', 'val2');
    expect(op2.vectorClock['node1']).toBeGreaterThan(op1.vectorClock['node1']);
  });

  it('merges remote operations', () => {
    publisher.merge({
      operationId: 'remote_op_1',
      agentId: 'agent2',
      key: 'health',
      value: 100,
      timestamp: Date.now(),
      vectorClock: { node2: 1 },
      nodeId: 'node2',
    });
    const state = publisher.getState('agent2');
    expect(state!.health).toBe(100);
  });

  it('rejects stale remote operations', () => {
    publisher.publish('agent1', 'key1', 'new');
    const merged = publisher.merge({
      operationId: 'old_op',
      agentId: 'agent1',
      key: 'key1',
      value: 'old',
      timestamp: 1, // Very old
      vectorClock: { node2: 1 },
      nodeId: 'node2',
    });
    expect(merged).toBe(false);
    expect(publisher.getState('agent1')!.key1).toBe('new');
  });

  it('notifies subscribers', () => {
    const handler = vi.fn();
    publisher.subscribe(handler);
    publisher.publish('agent1', 'key1', 'val1');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removes agent state', () => {
    publisher.publish('agent1', 'key1', 'val1');
    publisher.removeAgent('agent1');
    expect(publisher.getState('agent1')).toBeUndefined();
  });

  it('retrieves operations since timestamp', () => {
    const before = Date.now();
    publisher.publish('agent1', 'key1', 'val1');
    const ops = publisher.getOperationsSince(before - 1);
    expect(ops.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// BrainServer
// =============================================================================

describe('BrainServer', () => {
  let server: BrainServer;

  beforeEach(() => {
    mockExecutor.mockClear();
    server = new BrainServer(mockExecutor, {
      nodeId: 'test-node',
      maxConcurrentAgents: 10,
      batchConfig: { maxBatchWaitMs: 10 },
    });
    server.start();
  });

  afterEach(() => {
    server.stop();
  });

  it('registers agents up to capacity', () => {
    for (let i = 0; i < 10; i++) {
      expect(server.registerAgent(`a${i}`, `c${i}`, 'model')).toBe(true);
    }
    expect(server.registerAgent('a10', 'c10', 'model')).toBe(false);
  });

  it('performs inference for registered agents', async () => {
    server.registerAgent('agent1', 'client1', 'model1');
    const response = await server.infer(makeRequest('agent1'));
    expect(response.outputTokens).toEqual([10, 20, 30]);
  });

  it('rejects inference for unregistered agents', async () => {
    await expect(server.infer(makeRequest('unknown'))).rejects.toThrow('not registered');
  });

  it('rejects inference when not running', async () => {
    server.stop();
    server.registerAgent('agent1', 'client1', 'model1');
    await expect(server.infer(makeRequest('agent1'))).rejects.toThrow('not running');
  });

  it('publishes CRDT state after inference', async () => {
    server.registerAgent('agent1', 'client1', 'model1');
    await server.infer(makeRequest('agent1'));
    const state = server.getAgentState('agent1');
    expect(state).toBeDefined();
    expect(state!.lastInference).toBeDefined();
  });

  it('handles heartbeats', () => {
    server.registerAgent('agent1', 'client1', 'model1');
    expect(server.heartbeat('agent1')).toBe(true);
    expect(server.heartbeat('unknown')).toBe(false);
  });

  it('reports metrics', () => {
    server.registerAgent('agent1', 'client1', 'model1');
    const metrics = server.getMetrics();
    expect(metrics.activeAgents).toBe(1);
    expect(metrics.maxAgents).toBe(10);
  });

  it('unregisters agents', () => {
    server.registerAgent('agent1', 'client1', 'model1');
    server.unregisterAgent('agent1');
    expect(server.getMetrics().activeAgents).toBe(0);
  });
});
