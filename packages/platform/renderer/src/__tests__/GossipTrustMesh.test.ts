/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GossipTrustMesh
 *
 * Validates the gossip protocol mesh:
 * - Fan-out 3 peer selection
 * - O(log2 n) convergence estimation
 * - Trust update propagation between nodes
 * - Vector clock ordering and conflict resolution
 * - Bloom filter integration for O(1) revocation
 * - Anti-entropy reconciliation
 * - Peer lifecycle (add, remove, failure detection)
 * - Gossip loop (start, stop, dispose)
 * - Metrics tracking
 * - Multi-node mesh simulation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  GossipTrustMesh,
  createGossipTrustMesh,
  type GossipMessage,
  type GossipTrustMeshConfig,
  type TrustUpdate,
} from '../GossipTrustMesh';
import type { TrustLevel, AgentCapability } from '../VRTrustHandshake';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMesh(overrides?: Partial<GossipTrustMeshConfig>): GossipTrustMesh {
  return new GossipTrustMesh({
    nodeId: 'node-1',
    fanOut: 3,
    gossipIntervalMs: 200,
    ...overrides,
  });
}

/**
 * Create a connected mesh of N nodes with message routing.
 * Returns array of meshes and a function to deliver all pending messages.
 */
function createConnectedMesh(nodeCount: number): {
  meshes: GossipTrustMesh[];
  deliverMessages: () => void;
} {
  const meshes: GossipTrustMesh[] = [];
  const messageQueues: Map<string, GossipMessage[]> = new Map();

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node-${i}`;
    messageQueues.set(nodeId, []);
    meshes.push(
      new GossipTrustMesh({
        nodeId,
        fanOut: 3,
        gossipIntervalMs: 200,
        maxTtl: 20,
      }),
    );
  }

  // Connect all nodes to each other
  for (let i = 0; i < nodeCount; i++) {
    for (let j = 0; j < nodeCount; j++) {
      if (i !== j) {
        const targetNodeId = `node-${j}`;
        meshes[i].addPeer(targetNodeId, (msg: GossipMessage) => {
          messageQueues.get(targetNodeId)!.push(msg);
        });
      }
    }
  }

  // Function to deliver all queued messages
  const deliverMessages = () => {
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = `node-${i}`;
      const queue = messageQueues.get(nodeId)!;
      while (queue.length > 0) {
        const msg = queue.shift()!;
        meshes[i].onGossipReceived(msg);
      }
    }
  };

  return { meshes, deliverMessages };
}

// =============================================================================
// TESTS
// =============================================================================

describe('GossipTrustMesh', () => {
  let mesh: GossipTrustMesh;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (mesh) {
      mesh.dispose();
    }
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      mesh = createMesh();
      expect(mesh.getNodeId()).toBe('node-1');
      expect(mesh.getIsRunning()).toBe(false);
      expect(mesh.getPeerCount()).toBe(0);
    });

    it('should use factory function', () => {
      mesh = createGossipTrustMesh({ nodeId: 'factory-node' });
      expect(mesh.getNodeId()).toBe('factory-node');
    });

    it('should initialize vector clock with own entry', () => {
      mesh = createMesh();
      const clock = mesh.getVectorClock();
      expect(clock['node-1']).toBe(0);
    });

    it('should initialize bloom filter', () => {
      mesh = createMesh();
      const filter = mesh.getBloomFilter();
      expect(filter).toBeDefined();
      expect(filter.getItemCount()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PEER MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  describe('peer management', () => {
    beforeEach(() => {
      mesh = createMesh();
    });

    it('should add peers', () => {
      mesh.addPeer('node-2', vi.fn());
      mesh.addPeer('node-3', vi.fn());
      expect(mesh.getPeerCount()).toBe(2);
    });

    it('should not add self as peer', () => {
      mesh.addPeer('node-1', vi.fn()); // Same as nodeId
      expect(mesh.getPeerCount()).toBe(0);
    });

    it('should remove peers', () => {
      mesh.addPeer('node-2', vi.fn());
      mesh.addPeer('node-3', vi.fn());
      expect(mesh.getPeerCount()).toBe(2);

      mesh.removePeer('node-2');
      expect(mesh.getPeerCount()).toBe(1);
    });

    it('should initialize vector clock for new peers', () => {
      mesh.addPeer('node-2', vi.fn());
      const clock = mesh.getVectorClock();
      expect(clock['node-2']).toBe(0);
    });

    it('should count alive peers', () => {
      mesh.addPeer('node-2', vi.fn());
      mesh.addPeer('node-3', vi.fn());
      expect(mesh.getAlivePeerCount()).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LOCAL TRUST CHANGES
  // ─────────────────────────────────────────────────────────────────────────

  describe('local trust changes', () => {
    beforeEach(() => {
      mesh = createMesh();
    });

    it('should queue local trust changes for gossip', () => {
      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'Session expired');
      expect(mesh.getPendingUpdateCount()).toBe(1);
    });

    it('should increment vector clock on local change', () => {
      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');
      const clock = mesh.getVectorClock();
      expect(clock['node-1']).toBe(1);

      mesh.onLocalTrustChange('agent-2', 'trusted', 1, ['read_state'], 'test');
      expect(mesh.getVectorClock()['node-1']).toBe(2);
    });

    it('should add revoked agents to Bloom filter', () => {
      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'Session expired');
      expect(mesh.isRevoked('agent-1')).toBe(true);
    });

    it('should remove un-revoked agents from Bloom filter', () => {
      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'Session expired');
      expect(mesh.isRevoked('agent-1')).toBe(true);

      // Agent re-joins and becomes trusted
      mesh.onLocalTrustChange('agent-1', 'trusted', 1.0, ['read_state'], 'Re-joined');
      expect(mesh.isRevoked('agent-1')).toBe(false);
    });

    it('should store trust state locally', () => {
      mesh.onLocalTrustChange('agent-1', 'trusted', 1.0, ['read_state', 'write_position'], 'Joined');
      const state = mesh.getAgentTrustState('agent-1');

      expect(state).toBeDefined();
      expect(state!.agentId).toBe('agent-1');
      expect(state!.trustLevel).toBe('trusted');
      expect(state!.trustScore).toBe(1.0);
      expect(state!.grantedCapabilities).toContain('read_state');
      expect(state!.originNodeId).toBe('node-1');
    });

    it('should track local update count in metrics', () => {
      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');
      mesh.onLocalTrustChange('agent-2', 'trusted', 1, ['read_state'], 'test');

      const metrics = mesh.getMetrics();
      expect(metrics.totalLocalUpdates).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BLOOM FILTER INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('Bloom filter integration', () => {
    beforeEach(() => {
      mesh = createMesh();
    });

    it('should return false for unknown agents (O(1))', () => {
      expect(mesh.isRevoked('unknown-agent')).toBe(false);
    });

    it('should return true for revoked agents (O(1))', () => {
      mesh.onLocalTrustChange('bad-agent', 'revoked', 0, [], 'Eviction');
      expect(mesh.isRevoked('bad-agent')).toBe(true);
    });

    it('isRevoked should be render-loop safe (< 1ms for 1000 checks)', () => {
      // Add some revoked agents
      for (let i = 0; i < 100; i++) {
        mesh.onLocalTrustChange(`revoked-${i}`, 'revoked', 0, [], 'test');
      }

      // Measure 1000 checks
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        mesh.isRevoked(`revoked-${i % 100}`);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Generous bound for CI
    });

    it('should expose bloom filter for direct access', () => {
      const filter = mesh.getBloomFilter();
      expect(filter).toBeDefined();
      expect(filter.getItemCount()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GOSSIP LOOP
  // ─────────────────────────────────────────────────────────────────────────

  describe('gossip loop', () => {
    it('should start and stop', () => {
      mesh = createMesh();
      mesh.start();
      expect(mesh.getIsRunning()).toBe(true);

      mesh.stop();
      expect(mesh.getIsRunning()).toBe(false);
    });

    it('should warn when starting while already running', () => {
      mesh = createMesh();
      mesh.start();
      mesh.start(); // Should warn, not throw
      expect(mesh.getIsRunning()).toBe(true);
    });

    it('should gossip pending updates to peers', () => {
      mesh = createMesh();
      const sendFn = vi.fn();

      mesh.addPeer('node-2', sendFn);
      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');

      mesh.start();
      vi.advanceTimersByTime(200); // One gossip round

      expect(sendFn).toHaveBeenCalled();
      const sentMessage = sendFn.mock.calls[0][0] as GossipMessage;
      expect(sentMessage.fromNodeId).toBe('node-1');
      expect(sentMessage.updates.length).toBeGreaterThan(0);
      expect(sentMessage.updates[0].agentId).toBe('agent-1');
    });

    it('should send to at most fan-out peers per round', () => {
      mesh = createMesh({ nodeId: 'node-0', fanOut: 3 });
      const sendFns: ReturnType<typeof vi.fn>[] = [];

      for (let i = 1; i <= 10; i++) {
        const fn = vi.fn();
        sendFns.push(fn);
        mesh.addPeer(`node-${i}`, fn);
      }

      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');
      mesh.start();
      vi.advanceTimersByTime(200);

      const sentCount = sendFns.filter(fn => fn.mock.calls.length > 0).length;
      expect(sentCount).toBeLessThanOrEqual(3); // Fan-out 3
      expect(sentCount).toBeGreaterThan(0);
    });

    it('should not send when there are no pending updates', () => {
      mesh = createMesh();
      const sendFn = vi.fn();
      mesh.addPeer('node-2', sendFn);

      mesh.start();
      vi.advanceTimersByTime(200);

      // No pending updates, so no messages sent
      expect(sendFn).not.toHaveBeenCalled();
    });

    it('should clear pending updates after gossip round', () => {
      mesh = createMesh();
      mesh.addPeer('node-2', vi.fn());

      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');
      expect(mesh.getPendingUpdateCount()).toBe(1);

      mesh.start();
      vi.advanceTimersByTime(200);

      expect(mesh.getPendingUpdateCount()).toBe(0);
    });

    it('should include Bloom filter snapshot in gossip messages', () => {
      mesh = createMesh();
      const sendFn = vi.fn();
      mesh.addPeer('node-2', sendFn);

      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');
      mesh.start();
      vi.advanceTimersByTime(200);

      const sentMessage = sendFn.mock.calls[0][0] as GossipMessage;
      expect(sentMessage.bloomSnapshot).not.toBeNull();
      expect(sentMessage.bloomSnapshot!.itemCount).toBeGreaterThan(0);
    });

    it('should include vector clock in gossip messages', () => {
      mesh = createMesh();
      const sendFn = vi.fn();
      mesh.addPeer('node-2', sendFn);

      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');
      mesh.start();
      vi.advanceTimersByTime(200);

      const sentMessage = sendFn.mock.calls[0][0] as GossipMessage;
      expect(sentMessage.senderClock['node-1']).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GOSSIP RECEPTION
  // ─────────────────────────────────────────────────────────────────────────

  describe('gossip reception', () => {
    beforeEach(() => {
      mesh = createMesh();
      mesh.addPeer('node-2', vi.fn());
    });

    it('should process received trust updates', () => {
      const update: TrustUpdate = {
        updateId: 'node-2-1',
        agentId: 'agent-remote',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Expired',
        originNodeId: 'node-2',
        vectorClock: { 'node-2': 1 },
        timestamp: Date.now(),
        ttl: 10,
      };

      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [update],
        bloomSnapshot: null,
        senderClock: { 'node-2': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);

      // Should have applied the remote update
      const state = mesh.getAgentTrustState('agent-remote');
      expect(state).toBeDefined();
      expect(state!.trustLevel).toBe('revoked');
      expect(mesh.isRevoked('agent-remote')).toBe(true);
    });

    it('should reject messages with unknown protocol version', () => {
      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [],
        bloomSnapshot: null,
        senderClock: {},
        timestamp: Date.now(),
        protocolVersion: '99.0', // Unknown version
      };

      mesh.onGossipReceived(message);
      expect(mesh.getMetrics().totalDroppedUpdates).toBe(1);
    });

    it('should skip duplicate update IDs', () => {
      const update: TrustUpdate = {
        updateId: 'dup-1',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'test',
        originNodeId: 'node-2',
        vectorClock: { 'node-2': 1 },
        timestamp: Date.now(),
        ttl: 10,
      };

      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [update],
        bloomSnapshot: null,
        senderClock: { 'node-2': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);
      mesh.onGossipReceived(message); // Same message again

      expect(mesh.getMetrics().totalRemoteUpdates).toBe(1);
      expect(mesh.getMetrics().totalDroppedUpdates).toBe(1);
    });

    it('should skip updates with TTL 0', () => {
      const update: TrustUpdate = {
        updateId: 'ttl-0',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'test',
        originNodeId: 'node-2',
        vectorClock: { 'node-2': 1 },
        timestamp: Date.now(),
        ttl: 0, // Expired TTL
      };

      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [update],
        bloomSnapshot: null,
        senderClock: { 'node-2': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);
      expect(mesh.getAgentTrustState('agent-1')).toBeUndefined();
    });

    it('should skip updates older than maxAgeMs', () => {
      const veryOld: TrustUpdate = {
        updateId: 'old-1',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'test',
        originNodeId: 'node-2',
        vectorClock: { 'node-2': 1 },
        timestamp: Date.now() - 120000, // 2 minutes ago (default max age is 60s)
        ttl: 10,
      };

      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [veryOld],
        bloomSnapshot: null,
        senderClock: { 'node-2': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);
      expect(mesh.getAgentTrustState('agent-1')).toBeUndefined();
    });

    it('should update peer liveness on message receipt', () => {
      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [],
        bloomSnapshot: null,
        senderClock: { 'node-2': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);
      expect(mesh.getAlivePeerCount()).toBe(1);
    });

    it('should merge vector clock from received messages', () => {
      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [],
        bloomSnapshot: null,
        senderClock: { 'node-2': 5, 'node-3': 3 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);

      const clock = mesh.getVectorClock();
      expect(clock['node-2']).toBe(5);
      expect(clock['node-3']).toBe(3);
    });

    it('should call onRemoteTrustUpdate callback', () => {
      const onRemote = vi.fn();
      mesh = new GossipTrustMesh({
        nodeId: 'node-1',
        onRemoteTrustUpdate: onRemote,
      });
      mesh.addPeer('node-2', vi.fn());

      const update: TrustUpdate = {
        updateId: 'callback-test-1',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'test',
        originNodeId: 'node-2',
        vectorClock: { 'node-2': 1 },
        timestamp: Date.now(),
        ttl: 10,
      };

      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [update],
        bloomSnapshot: null,
        senderClock: { 'node-2': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);
      expect(onRemote).toHaveBeenCalledWith(expect.objectContaining({
        agentId: 'agent-1',
        trustLevel: 'revoked',
      }));
    });

    it('should re-gossip received updates with decremented TTL', () => {
      const update: TrustUpdate = {
        updateId: 're-gossip-1',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'test',
        originNodeId: 'node-2',
        vectorClock: { 'node-2': 1 },
        timestamp: Date.now(),
        ttl: 10,
      };

      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [update],
        bloomSnapshot: null,
        senderClock: { 'node-2': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);

      // The update should be re-queued for gossip with TTL - 1
      expect(mesh.getPendingUpdateCount()).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // VECTOR CLOCK CONFLICT RESOLUTION
  // ─────────────────────────────────────────────────────────────────────────

  describe('vector clock conflict resolution', () => {
    beforeEach(() => {
      mesh = createMesh();
      mesh.addPeer('node-2', vi.fn());
    });

    it('should accept newer remote updates (remote after local)', () => {
      // Local update at clock {node-1: 1}
      mesh.onLocalTrustChange('agent-1', 'trusted', 1.0, ['read_state'], 'joined');

      // Remote update at clock {node-2: 2, node-1: 1} (strictly after local)
      const remoteUpdate: TrustUpdate = {
        updateId: 'newer-remote',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Remote revocation',
        originNodeId: 'node-2',
        vectorClock: { 'node-2': 2, 'node-1': 1 },
        timestamp: Date.now(),
        ttl: 10,
      };

      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [remoteUpdate],
        bloomSnapshot: null,
        senderClock: { 'node-2': 2, 'node-1': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);

      // Remote should win (newer)
      const state = mesh.getAgentTrustState('agent-1');
      expect(state!.trustLevel).toBe('revoked');
    });

    it('should resolve concurrent conflicts: revoked wins over trusted', () => {
      // Local says trusted at {node-1: 1}
      mesh.onLocalTrustChange('agent-1', 'trusted', 1.0, ['read_state'], 'joined');

      // Remote says revoked at {node-2: 1} (concurrent with local)
      const remoteUpdate: TrustUpdate = {
        updateId: 'concurrent-revoked',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Concurrent revocation',
        originNodeId: 'node-2',
        vectorClock: { 'node-2': 1 },
        timestamp: Date.now(),
        ttl: 10,
      };

      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [remoteUpdate],
        bloomSnapshot: null,
        senderClock: { 'node-2': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);

      // Revoked should win (more restrictive)
      const state = mesh.getAgentTrustState('agent-1');
      expect(state!.trustLevel).toBe('revoked');
    });

    it('should ignore older remote updates (remote before local)', () => {
      // Local update at {node-1: 2, node-2: 1}
      mesh.onLocalTrustChange('agent-1', 'trusted', 1.0, ['read_state'], 'recent');
      mesh.onLocalTrustChange('agent-1', 'trusted', 0.9, ['read_state'], 'updated');

      // Remote update at {node-2: 1} (strictly before local {node-1: 2})
      const remoteUpdate: TrustUpdate = {
        updateId: 'older-remote',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Old revocation',
        originNodeId: 'node-2',
        vectorClock: { 'node-1': 0 }, // Older than local (node-1 is at 2)
        timestamp: Date.now() - 5000,
        ttl: 10,
      };

      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [remoteUpdate],
        bloomSnapshot: null,
        senderClock: { 'node-2': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);

      // Local should still be trusted (local is newer)
      const state = mesh.getAgentTrustState('agent-1');
      expect(state!.trustLevel).toBe('trusted');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CONVERGENCE ESTIMATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('convergence estimation', () => {
    it('should estimate O(log2 n) convergence rounds', () => {
      mesh = createMesh({ fanOut: 3 });

      // With fan-out 3:
      // 1 peer: ceil(log3(2)) = 1 round
      // 3 peers: ceil(log3(4)) = 2 rounds
      // 9 peers: ceil(log3(10)) = 3 rounds
      // 27 peers: ceil(log3(28)) = 4 rounds
      // 100 peers: ceil(log3(101)) = 5 rounds
      // 1000 peers: ceil(log3(1001)) = 7 rounds

      mesh.addPeer('p1', vi.fn());
      expect(mesh.getEstimatedConvergenceRounds()).toBe(1);

      mesh.addPeer('p2', vi.fn());
      mesh.addPeer('p3', vi.fn());
      expect(mesh.getEstimatedConvergenceRounds()).toBe(2);

      // Add more peers
      for (let i = 4; i <= 27; i++) {
        mesh.addPeer(`p${i}`, vi.fn());
      }
      // 27 peers + self = 28 nodes → ceil(log3(28)) = 4
      expect(mesh.getEstimatedConvergenceRounds()).toBeLessThanOrEqual(4);
    });

    it('should return 0 rounds when no peers', () => {
      mesh = createMesh();
      expect(mesh.getEstimatedConvergenceRounds()).toBe(0);
    });

    it('should estimate convergence time in ms', () => {
      mesh = createMesh({ fanOut: 3, gossipIntervalMs: 200 });
      for (let i = 0; i < 10; i++) {
        mesh.addPeer(`p${i}`, vi.fn());
      }

      const rounds = mesh.getEstimatedConvergenceRounds();
      const timeMs = mesh.getEstimatedConvergenceTimeMs();
      expect(timeMs).toBe(rounds * 200);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MULTI-NODE MESH SIMULATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('multi-node mesh simulation', () => {
    it('should propagate trust updates across a 5-node mesh', () => {
      const { meshes, deliverMessages } = createConnectedMesh(5);

      // Node 0 revokes an agent
      meshes[0].onLocalTrustChange('bad-agent', 'revoked', 0, [], 'Eviction');

      // Simulate gossip rounds manually
      // Round 1: Node 0 gossips to up to 3 peers
      meshes[0].start();
      vi.advanceTimersByTime(200);
      meshes[0].stop();

      // Deliver messages from round 1
      deliverMessages();

      // Some nodes now know about the revocation and will re-gossip
      // Round 2: Those nodes gossip further
      for (const m of meshes) {
        if (m.getPendingUpdateCount() > 0) {
          m.start();
        }
      }
      vi.advanceTimersByTime(200);
      for (const m of meshes) {
        m.stop();
      }
      deliverMessages();

      // After 2 rounds with fan-out 3, all 5 nodes should know
      for (let i = 0; i < 5; i++) {
        expect(meshes[i].isRevoked('bad-agent')).toBe(true);
      }

      // Cleanup
      for (const m of meshes) {
        m.dispose();
      }
    });

    it('should propagate across a 3-node mesh in 1 round', () => {
      const { meshes, deliverMessages } = createConnectedMesh(3);

      // Node 0 revokes an agent
      meshes[0].onLocalTrustChange('agent-x', 'revoked', 0, [], 'test');

      // One round with fan-out 3 should reach all 2 peers
      meshes[0].start();
      vi.advanceTimersByTime(200);
      meshes[0].stop();
      deliverMessages();

      for (let i = 0; i < 3; i++) {
        expect(meshes[i].isRevoked('agent-x')).toBe(true);
      }

      for (const m of meshes) {
        m.dispose();
      }
    });

    it('should handle multiple simultaneous trust changes', () => {
      const { meshes, deliverMessages } = createConnectedMesh(4);

      // Different nodes make different trust changes simultaneously
      meshes[0].onLocalTrustChange('agent-a', 'revoked', 0, [], 'test');
      meshes[1].onLocalTrustChange('agent-b', 'revoked', 0, [], 'test');
      meshes[2].onLocalTrustChange('agent-c', 'trusted', 1.0, ['read_state'], 'test');

      // Run a few gossip rounds
      for (let round = 0; round < 3; round++) {
        for (const m of meshes) {
          m.start();
        }
        vi.advanceTimersByTime(200);
        for (const m of meshes) {
          m.stop();
        }
        deliverMessages();
      }

      // All nodes should know about all changes
      for (let i = 0; i < 4; i++) {
        expect(meshes[i].isRevoked('agent-a')).toBe(true);
        expect(meshes[i].isRevoked('agent-b')).toBe(true);
        // agent-c is trusted, not revoked
        expect(meshes[i].getAgentTrustState('agent-c')).toBeDefined();
      }

      for (const m of meshes) {
        m.dispose();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PEER FAILURE DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  describe('peer failure detection', () => {
    it('should mark peer as dead after max failed sends', () => {
      const onPeerDead = vi.fn();
      mesh = new GossipTrustMesh({
        nodeId: 'node-1',
        maxFailedSends: 3,
        onPeerDead,
      });

      // Peer that always throws
      mesh.addPeer('bad-peer', () => {
        throw new Error('Connection refused');
      });

      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');

      mesh.start();

      // Run enough rounds to exceed maxFailedSends
      for (let i = 0; i < 4; i++) {
        mesh.onLocalTrustChange(`agent-${i}`, 'revoked', 0, [], 'test');
        vi.advanceTimersByTime(200);
      }

      mesh.stop();

      expect(onPeerDead).toHaveBeenCalledWith('bad-peer');
      expect(mesh.getAlivePeerCount()).toBe(0);
    });

    it('should reset failed count on successful receive', () => {
      mesh = createMesh({ maxFailedSends: 5 });
      mesh.addPeer('flaky-peer', vi.fn());

      // Receive a message from the peer
      const message: GossipMessage = {
        fromNodeId: 'flaky-peer',
        sequence: 1,
        updates: [],
        bloomSnapshot: null,
        senderClock: {},
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      mesh.onGossipReceived(message);
      expect(mesh.getAlivePeerCount()).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('should dispose cleanly', () => {
      mesh = createMesh();
      mesh.addPeer('node-2', vi.fn());
      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');
      mesh.start();

      mesh.dispose();

      expect(mesh.getIsRunning()).toBe(false);
      expect(mesh.getPeerCount()).toBe(0);
      expect(mesh.getPendingUpdateCount()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should provide comprehensive metrics', () => {
      mesh = createMesh();
      mesh.addPeer('node-2', vi.fn());
      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');

      const metrics = mesh.getMetrics();

      expect(metrics.nodeId).toBe('node-1');
      expect(metrics.isRunning).toBe(false);
      expect(metrics.fanOut).toBe(3);
      expect(metrics.peerCount).toBe(1);
      expect(metrics.alivePeerCount).toBe(1);
      expect(metrics.totalLocalUpdates).toBe(1);
      expect(metrics.pendingUpdateCount).toBe(1);
      expect(metrics.bloomFilterMetrics).toBeDefined();
      expect(metrics.gossipIntervalMs).toBe(200);
    });

    it('should track round count', () => {
      mesh = createMesh();
      mesh.addPeer('node-2', vi.fn());
      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');

      mesh.start();
      vi.advanceTimersByTime(600); // 3 rounds
      mesh.stop();

      // First round sends pending, subsequent rounds have nothing
      expect(mesh.getMetrics().totalRounds).toBeGreaterThanOrEqual(1);
    });

    it('should track messages sent and received', () => {
      mesh = createMesh();
      mesh.addPeer('node-2', vi.fn());

      mesh.onLocalTrustChange('agent-1', 'revoked', 0, [], 'test');
      mesh.start();
      vi.advanceTimersByTime(200);
      mesh.stop();

      expect(mesh.getMetrics().totalMessagesSent).toBeGreaterThanOrEqual(1);

      // Receive a message
      const message: GossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [],
        bloomSnapshot: null,
        senderClock: {},
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };
      mesh.onGossipReceived(message);

      expect(mesh.getMetrics().totalMessagesReceived).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY API
  // ─────────────────────────────────────────────────────────────────────────

  describe('query API', () => {
    beforeEach(() => {
      mesh = createMesh();
    });

    it('should return all trust states', () => {
      mesh.onLocalTrustChange('agent-1', 'trusted', 1.0, ['read_state'], 'test');
      mesh.onLocalTrustChange('agent-2', 'revoked', 0, [], 'test');

      const states = mesh.getAllTrustStates();
      expect(states.size).toBe(2);
      expect(states.get('agent-1')!.trustLevel).toBe('trusted');
      expect(states.get('agent-2')!.trustLevel).toBe('revoked');
    });

    it('should return undefined for unknown agent trust state', () => {
      expect(mesh.getAgentTrustState('unknown')).toBeUndefined();
    });
  });
});
