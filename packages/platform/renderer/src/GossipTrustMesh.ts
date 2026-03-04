/**
 * GossipTrustMesh
 *
 * Epidemic (gossip) protocol mesh for propagating agent trust state changes
 * across VR world nodes. Uses fan-out 3 and achieves O(log2 n) convergence
 * where n is the number of nodes in the mesh.
 *
 * DESIGN PRINCIPLES:
 * - Fan-out 3: Each node gossips to exactly 3 randomly selected peers per round.
 *   This provides a good balance between convergence speed and network overhead.
 *   With fan-out f and n nodes, convergence takes O(log_f(n)) rounds.
 * - O(log2 n) convergence: Information reaches all n nodes in approximately
 *   log2(n) gossip rounds. For 1000 nodes, this is ~10 rounds. For 1M nodes,
 *   ~20 rounds. Each round takes gossipIntervalMs (default: 200ms).
 * - Anti-entropy: Periodic full state reconciliation between peers to recover
 *   from lost messages and ensure eventual consistency.
 * - Bloom filter revocation: Uses BloomFilterRevocation for O(1) render-loop
 *   safe revocation checks. The filter is gossiped alongside trust updates.
 * - Vector clocks: Each trust update carries a logical timestamp (vector clock)
 *   so nodes can determine causality and resolve conflicts.
 * - Off render loop: All gossip operations (send, receive, merge, reconcile)
 *   run on a separate timing loop, never touching the 90Hz render path.
 *
 * GOSSIP PROTOCOL:
 * ```
 * ┌──────────────────────────────────────────────────────────────────┐
 * │                    GOSSIP ROUND (every 200ms)                   │
 * │                                                                  │
 * │  1. Select 3 random peers from known nodes                      │
 * │  2. Package pending trust updates into a GossipMessage          │
 * │  3. Send message to each selected peer                          │
 * │  4. Clear pending updates                                       │
 * │                                                                  │
 * │  On receive:                                                    │
 * │  1. Validate message (check vector clock, sequence)             │
 * │  2. For each trust update in message:                           │
 * │     a. Compare vector clock with local state                    │
 * │     b. If remote is newer: apply update, add to Bloom filter    │
 * │     c. If local is newer: ignore (will be sent in next round)   │
 * │     d. If concurrent: resolve using trust level priority        │
 * │  3. Merge Bloom filter snapshot (union)                         │
 * │  4. Queue any NEW updates for re-gossip (epidemic spread)       │
 * └──────────────────────────────────────────────────────────────────┘
 * ```
 *
 * CONVERGENCE PROOF:
 * With fan-out f = 3 and n nodes:
 * - Round 1: 1 node knows the update, gossips to 3 → 4 nodes know
 * - Round 2: 4 nodes each gossip to 3 → ~12 more nodes know (with overlap)
 * - Round r: ~3^r nodes know (minus overlaps)
 * - Convergence when 3^r >= n → r >= log3(n) = log(n)/log(3) ≈ log2(n)/1.585
 * - With randomized peer selection and accounting for overlaps, this is
 *   bounded by O(log2(n)) rounds in expectation.
 *
 * DATA FLOW:
 * ```
 *   VRTrustHandshake.changeTrustLevel()
 *        |
 *        v
 *   GossipTrustMesh.onLocalTrustChange()   <-- OFF render loop
 *        |
 *        v
 *   pendingUpdates.push(update)             <-- Queue for next gossip round
 *        |
 *        v
 *   gossipRound() [every 200ms]             <-- OFF render loop
 *        |
 *        ├── Select 3 peers
 *        ├── Send GossipMessage
 *        └── Clear pending
 *        |
 *        v
 *   Peer.onGossipReceived()                 <-- OFF render loop
 *        |
 *        ├── Merge trust updates
 *        ├── Update Bloom filter
 *        └── Re-gossip new updates
 * ```
 *
 * INTEGRATION WITH VRTrustHandshake:
 * ```typescript
 * const trustHandshake = new VRTrustHandshake({ worldId: 'world-1' });
 * const gossipMesh = new GossipTrustMesh({
 *   nodeId: 'node-1',
 *   trustHandshake,
 * });
 *
 * // Register peer nodes
 * gossipMesh.addPeer('node-2', sendFn);
 * gossipMesh.addPeer('node-3', sendFn);
 *
 * // Start gossiping
 * gossipMesh.start();
 *
 * // In render loop: O(1) revocation check
 * if (gossipMesh.isRevoked('agent-id')) {
 *   // Agent has been revoked somewhere in the mesh
 * }
 * ```
 *
 * @module GossipTrustMesh
 */

import { logger } from './logger';
import {
  BloomFilterRevocation,
  type BloomFilterSnapshot,
} from './BloomFilterRevocation';
import type {
  TrustLevel,
  AgentCapability,
} from './VRTrustHandshake';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Vector clock for causal ordering of trust updates.
 * Maps nodeId -> logical timestamp.
 */
export type VectorClock = Record<string, number>;

/**
 * A single trust state update to be propagated through the mesh.
 */
export interface TrustUpdate {
  /** Unique update ID */
  updateId: string;
  /** Agent whose trust state changed */
  agentId: string;
  /** New trust level */
  trustLevel: TrustLevel;
  /** Trust score (0-1) */
  trustScore: number;
  /** Granted capabilities (if trusted) */
  grantedCapabilities: AgentCapability[];
  /** Reason for the change */
  reason: string;
  /** Node that originated this update */
  originNodeId: string;
  /** Vector clock at the time of the update */
  vectorClock: VectorClock;
  /** Wall clock timestamp (for TTL and debugging) */
  timestamp: number;
  /** TTL: number of hops remaining before the update is dropped */
  ttl: number;
}

/**
 * A gossip message sent between nodes.
 */
export interface GossipMessage {
  /** Sending node ID */
  fromNodeId: string;
  /** Message sequence number (monotonically increasing per sender) */
  sequence: number;
  /** Trust updates to propagate */
  updates: TrustUpdate[];
  /** Bloom filter snapshot for revocation state sync */
  bloomSnapshot: BloomFilterSnapshot | null;
  /** Sender's current vector clock */
  senderClock: VectorClock;
  /** Message creation timestamp */
  timestamp: number;
  /** Protocol version */
  protocolVersion: string;
}

/**
 * A peer node in the gossip mesh.
 */
export interface GossipPeer {
  /** Peer node ID */
  nodeId: string;
  /** Function to send a gossip message to this peer */
  send: (message: GossipMessage) => void;
  /** Last time we received a message from this peer */
  lastSeenTimestamp: number;
  /** Whether this peer is considered alive */
  isAlive: boolean;
  /** Number of consecutive failed sends */
  failedSends: number;
}

/**
 * Configuration for the GossipTrustMesh.
 */
export interface GossipTrustMeshConfig {
  /** Unique node ID for this mesh participant */
  nodeId: string;
  /** Fan-out: number of peers to gossip to per round (default: 3) */
  fanOut?: number;
  /** Gossip round interval in ms (default: 200) */
  gossipIntervalMs?: number;
  /** Anti-entropy reconciliation interval in ms (default: 5000) */
  antiEntropyIntervalMs?: number;
  /** Maximum TTL for trust updates (default: 20, sufficient for ~1M nodes) */
  maxTtl?: number;
  /** Maximum age of a trust update before it is discarded (ms, default: 60000) */
  updateMaxAgeMs?: number;
  /** Bloom filter configuration */
  bloomFilterConfig?: {
    expectedItems?: number;
    falsePositiveRate?: number;
  };
  /** Maximum failed sends before marking a peer as dead (default: 5) */
  maxFailedSends?: number;
  /** Callback when a remote trust update is applied locally */
  onRemoteTrustUpdate?: (update: TrustUpdate) => void;
  /** Callback when convergence is detected (all nodes have same state) */
  onConvergence?: (roundCount: number) => void;
  /** Callback when a peer is marked as dead */
  onPeerDead?: (nodeId: string) => void;
}

/**
 * Metrics for the gossip mesh.
 */
export interface GossipTrustMeshMetrics {
  /** This node's ID */
  nodeId: string;
  /** Whether the gossip loop is running */
  isRunning: boolean;
  /** Fan-out setting */
  fanOut: number;
  /** Number of known peers */
  peerCount: number;
  /** Number of alive peers */
  alivePeerCount: number;
  /** Total gossip rounds executed */
  totalRounds: number;
  /** Total messages sent */
  totalMessagesSent: number;
  /** Total messages received */
  totalMessagesReceived: number;
  /** Total trust updates originated locally */
  totalLocalUpdates: number;
  /** Total trust updates received from remote */
  totalRemoteUpdates: number;
  /** Total updates dropped (stale, duplicate, expired) */
  totalDroppedUpdates: number;
  /** Pending updates waiting for next round */
  pendingUpdateCount: number;
  /** Current vector clock */
  vectorClock: VectorClock;
  /** Bloom filter metrics */
  bloomFilterMetrics: ReturnType<BloomFilterRevocation['getMetrics']>;
  /** Estimated rounds to convergence (log2 of peer count) */
  estimatedConvergenceRounds: number;
  /** Gossip interval in ms */
  gossipIntervalMs: number;
  /** Average gossip round duration in ms */
  averageRoundDurationMs: number;
}

// =============================================================================
// GOSSIP TRUST MESH
// =============================================================================

/**
 * Gossip protocol mesh for VR world agent trust propagation.
 *
 * Implements epidemic gossip with fan-out 3 and O(log2 n) convergence.
 * Each gossip round, this node selects 3 random peers and sends them
 * any trust state updates that have occurred since the last round.
 *
 * The Bloom filter provides O(1) render-loop safe revocation checks.
 *
 * Usage:
 * ```typescript
 * const mesh = new GossipTrustMesh({ nodeId: 'world-server-1' });
 *
 * // Add peers
 * mesh.addPeer('world-server-2', (msg) => ws2.send(JSON.stringify(msg)));
 * mesh.addPeer('world-server-3', (msg) => ws3.send(JSON.stringify(msg)));
 * mesh.addPeer('world-server-4', (msg) => ws4.send(JSON.stringify(msg)));
 *
 * // Start gossiping
 * mesh.start();
 *
 * // When a local trust change happens
 * mesh.onLocalTrustChange('agent-123', 'revoked', 0, [], 'Session expired');
 *
 * // Receive gossip from peers
 * ws.onmessage = (event) => {
 *   mesh.onGossipReceived(JSON.parse(event.data));
 * };
 *
 * // Render-loop safe: O(1) revocation check
 * const isRevoked = mesh.isRevoked('agent-123');
 * ```
 */
export class GossipTrustMesh {
  private readonly config: Required<GossipTrustMeshConfig>;

  /** Known peers in the mesh */
  private readonly peers: Map<string, GossipPeer> = new Map();

  /** Bloom filter for O(1) revocation lookup */
  private readonly bloomFilter: BloomFilterRevocation;

  /** This node's vector clock */
  private vectorClock: VectorClock = {};

  /** Pending updates to gossip in the next round */
  private pendingUpdates: TrustUpdate[] = [];

  /** Seen update IDs (to prevent re-processing) */
  private readonly seenUpdates: Set<string> = new Set();
  private readonly MAX_SEEN_UPDATES = 10000;

  /** Local trust state cache (agentId -> latest TrustUpdate) */
  private readonly localTrustState: Map<string, TrustUpdate> = new Map();

  /** Gossip loop */
  private gossipIntervalId: ReturnType<typeof setInterval> | null = null;
  private antiEntropyIntervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  /** Metrics */
  private totalRounds: number = 0;
  private totalMessagesSent: number = 0;
  private totalMessagesReceived: number = 0;
  private totalLocalUpdates: number = 0;
  private totalRemoteUpdates: number = 0;
  private totalDroppedUpdates: number = 0;
  private messageSequence: number = 0;
  private roundDurations: number[] = [];
  private readonly MAX_DURATION_HISTORY = 60;

  constructor(config: GossipTrustMeshConfig) {
    this.config = {
      nodeId: config.nodeId,
      fanOut: config.fanOut ?? 3,
      gossipIntervalMs: config.gossipIntervalMs ?? 200,
      antiEntropyIntervalMs: config.antiEntropyIntervalMs ?? 5000,
      maxTtl: config.maxTtl ?? 20,
      updateMaxAgeMs: config.updateMaxAgeMs ?? 60000,
      bloomFilterConfig: config.bloomFilterConfig ?? {},
      maxFailedSends: config.maxFailedSends ?? 5,
      onRemoteTrustUpdate: config.onRemoteTrustUpdate ?? (() => {}),
      onConvergence: config.onConvergence ?? (() => {}),
      onPeerDead: config.onPeerDead ?? (() => {}),
    };

    // Initialize vector clock with this node
    this.vectorClock[this.config.nodeId] = 0;

    // Initialize Bloom filter
    this.bloomFilter = new BloomFilterRevocation({
      expectedItems: config.bloomFilterConfig?.expectedItems ?? 1024,
      falsePositiveRate: config.bloomFilterConfig?.falsePositiveRate ?? 0.01,
      counting: true,
    });

    logger.info('[GossipTrustMesh] Initialized', {
      nodeId: config.nodeId,
      fanOut: this.config.fanOut,
      gossipIntervalMs: this.config.gossipIntervalMs,
      maxTtl: this.config.maxTtl,
    });
  }

  // ===========================================================================
  // PEER MANAGEMENT
  // ===========================================================================

  /**
   * Add a peer node to the mesh.
   *
   * @param nodeId - Unique peer node ID
   * @param sendFn - Function to send a gossip message to this peer
   */
  addPeer(nodeId: string, sendFn: (message: GossipMessage) => void): void {
    if (nodeId === this.config.nodeId) {
      logger.warn('[GossipTrustMesh] Cannot add self as peer');
      return;
    }

    this.peers.set(nodeId, {
      nodeId,
      send: sendFn,
      lastSeenTimestamp: 0,
      isAlive: true,
      failedSends: 0,
    });

    // Initialize vector clock entry for this peer
    if (!(nodeId in this.vectorClock)) {
      this.vectorClock[nodeId] = 0;
    }

    logger.info('[GossipTrustMesh] Peer added', { nodeId, totalPeers: this.peers.size });
  }

  /**
   * Remove a peer from the mesh.
   *
   * @param nodeId - Peer to remove
   */
  removePeer(nodeId: string): void {
    this.peers.delete(nodeId);
    logger.info('[GossipTrustMesh] Peer removed', { nodeId, totalPeers: this.peers.size });
  }

  /**
   * Get the number of peers in the mesh.
   */
  getPeerCount(): number {
    return this.peers.size;
  }

  /**
   * Get the number of alive peers.
   */
  getAlivePeerCount(): number {
    let count = 0;
    for (const peer of this.peers.values()) {
      if (peer.isAlive) count++;
    }
    return count;
  }

  // ===========================================================================
  // LOCAL TRUST CHANGES (Called by VRTrustHandshake)
  // ===========================================================================

  /**
   * Notify the mesh of a local trust state change.
   *
   * Called by the VRTrustHandshake when an agent's trust level changes
   * locally. The update is queued for the next gossip round.
   *
   * @param agentId - Agent whose trust changed
   * @param trustLevel - New trust level
   * @param trustScore - New trust score
   * @param capabilities - Granted capabilities
   * @param reason - Reason for the change
   */
  onLocalTrustChange(
    agentId: string,
    trustLevel: TrustLevel,
    trustScore: number,
    capabilities: AgentCapability[],
    reason: string,
  ): void {
    // Increment this node's vector clock
    this.vectorClock[this.config.nodeId] =
      (this.vectorClock[this.config.nodeId] || 0) + 1;

    const update: TrustUpdate = {
      updateId: `${this.config.nodeId}-${Date.now()}-${this.vectorClock[this.config.nodeId]}`,
      agentId,
      trustLevel,
      trustScore,
      grantedCapabilities: [...capabilities],
      reason,
      originNodeId: this.config.nodeId,
      vectorClock: { ...this.vectorClock },
      timestamp: Date.now(),
      ttl: this.config.maxTtl,
    };

    // Update local state
    this.localTrustState.set(agentId, update);
    this.seenUpdates.add(update.updateId);

    // Update Bloom filter
    if (trustLevel === 'revoked') {
      this.bloomFilter.add(agentId);
    } else if (trustLevel === 'trusted') {
      // Agent was un-revoked (re-joined or recovered)
      this.bloomFilter.remove(agentId);
    }

    // Queue for gossip
    this.pendingUpdates.push(update);
    this.totalLocalUpdates++;

    logger.debug('[GossipTrustMesh] Local trust change queued', {
      agentId,
      trustLevel,
      updateId: update.updateId,
    });
  }

  // ===========================================================================
  // GOSSIP RECEPTION
  // ===========================================================================

  /**
   * Handle a received gossip message from a peer.
   *
   * Processes the updates in the message, merging newer state and
   * re-gossipping any new information to maintain epidemic spread.
   *
   * @param message - The received gossip message
   */
  onGossipReceived(message: GossipMessage): void {
    this.totalMessagesReceived++;

    // Validate message
    if (message.protocolVersion !== '1.0') {
      logger.warn('[GossipTrustMesh] Ignoring message with unknown protocol version', {
        version: message.protocolVersion,
        from: message.fromNodeId,
      });
      this.totalDroppedUpdates++;
      return;
    }

    // Update peer liveness
    const peer = this.peers.get(message.fromNodeId);
    if (peer) {
      peer.lastSeenTimestamp = Date.now();
      peer.isAlive = true;
      peer.failedSends = 0;
    }

    // Merge sender's vector clock into ours
    this.mergeVectorClock(message.senderClock);

    // Process trust updates
    for (const update of message.updates) {
      this.processRemoteUpdate(update);
    }

    // Merge Bloom filter snapshot
    if (message.bloomSnapshot) {
      this.bloomFilter.merge(message.bloomSnapshot);
    }

    logger.debug('[GossipTrustMesh] Gossip received', {
      from: message.fromNodeId,
      updateCount: message.updates.length,
      sequence: message.sequence,
    });
  }

  /**
   * Process a single remote trust update.
   *
   * Compares the update's vector clock with local state to determine
   * whether to accept, reject, or conflict-resolve the update.
   */
  private processRemoteUpdate(update: TrustUpdate): void {
    // Skip if already seen
    if (this.seenUpdates.has(update.updateId)) {
      this.totalDroppedUpdates++;
      return;
    }

    // Skip if TTL expired
    if (update.ttl <= 0) {
      this.totalDroppedUpdates++;
      return;
    }

    // Skip if too old
    if (Date.now() - update.timestamp > this.config.updateMaxAgeMs) {
      this.totalDroppedUpdates++;
      return;
    }

    // Mark as seen
    this.seenUpdates.add(update.updateId);
    this.evictSeenUpdates();

    // Compare with local state for this agent
    const localUpdate = this.localTrustState.get(update.agentId);

    let shouldApply = false;

    if (!localUpdate) {
      // No local state: accept remote
      shouldApply = true;
    } else {
      // Compare vector clocks
      const comparison = this.compareVectorClocks(
        update.vectorClock,
        localUpdate.vectorClock,
      );

      if (comparison === 'after') {
        // Remote is strictly newer
        shouldApply = true;
      } else if (comparison === 'concurrent') {
        // Concurrent updates: resolve conflict
        shouldApply = this.resolveConflict(update, localUpdate);
      }
      // If comparison === 'before' or 'equal': local is newer, ignore remote
    }

    if (shouldApply) {
      // Apply the update
      this.localTrustState.set(update.agentId, update);

      // Update Bloom filter
      if (update.trustLevel === 'revoked') {
        this.bloomFilter.add(update.agentId);
      } else if (update.trustLevel === 'trusted') {
        this.bloomFilter.remove(update.agentId);
      }

      // Re-gossip with decremented TTL
      const reGossip: TrustUpdate = {
        ...update,
        ttl: update.ttl - 1,
      };
      this.pendingUpdates.push(reGossip);

      this.totalRemoteUpdates++;
      this.config.onRemoteTrustUpdate(update);

      logger.debug('[GossipTrustMesh] Remote update applied', {
        agentId: update.agentId,
        trustLevel: update.trustLevel,
        originNode: update.originNodeId,
        ttl: update.ttl,
      });
    } else {
      this.totalDroppedUpdates++;
    }
  }

  // ===========================================================================
  // RENDER-LOOP SAFE: BLOOM FILTER QUERIES
  // ===========================================================================

  /**
   * Check if an agent might be revoked (O(1), render-loop safe).
   *
   * Uses the Bloom filter for constant-time probabilistic lookup.
   * Returns false means DEFINITELY not revoked.
   * Returns true means POSSIBLY revoked (do full check off render loop).
   *
   * Budget: <0.01ms (ON render loop)
   *
   * @param agentId - Agent to check
   * @returns true if possibly revoked, false if definitely not revoked
   */
  isRevoked(agentId: string): boolean {
    return this.bloomFilter.mightBeRevoked(agentId);
  }

  /**
   * Get the Bloom filter for direct access.
   */
  getBloomFilter(): BloomFilterRevocation {
    return this.bloomFilter;
  }

  /**
   * Get the local trust state for an agent.
   * Not render-loop safe (may involve map lookup).
   */
  getAgentTrustState(agentId: string): TrustUpdate | undefined {
    return this.localTrustState.get(agentId);
  }

  // ===========================================================================
  // GOSSIP LOOP (OFF RENDER LOOP)
  // ===========================================================================

  /**
   * Start the gossip loop.
   *
   * Runs at the configured interval (default: 200ms) and gossips
   * pending trust updates to `fanOut` (3) random peers.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[GossipTrustMesh] Already running');
      return;
    }

    // Main gossip loop
    this.gossipIntervalId = setInterval(
      () => this.gossipRound(),
      this.config.gossipIntervalMs,
    );

    // Anti-entropy reconciliation loop
    this.antiEntropyIntervalId = setInterval(
      () => this.antiEntropyRound(),
      this.config.antiEntropyIntervalMs,
    );

    this.isRunning = true;

    logger.info('[GossipTrustMesh] Started', {
      gossipIntervalMs: this.config.gossipIntervalMs,
      antiEntropyIntervalMs: this.config.antiEntropyIntervalMs,
      fanOut: this.config.fanOut,
    });
  }

  /**
   * Stop the gossip loop.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[GossipTrustMesh] Already stopped');
      return;
    }

    if (this.gossipIntervalId !== null) {
      clearInterval(this.gossipIntervalId);
      this.gossipIntervalId = null;
    }

    if (this.antiEntropyIntervalId !== null) {
      clearInterval(this.antiEntropyIntervalId);
      this.antiEntropyIntervalId = null;
    }

    this.isRunning = false;
    logger.info('[GossipTrustMesh] Stopped');
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stop();
    this.peers.clear();
    this.pendingUpdates = [];
    this.seenUpdates.clear();
    this.localTrustState.clear();
    this.bloomFilter.clear();
    this.vectorClock = {};
    logger.info('[GossipTrustMesh] Disposed');
  }

  /**
   * Execute a single gossip round.
   *
   * Selects `fanOut` random alive peers and sends them all pending
   * trust updates. This is the core epidemic spreading mechanism.
   *
   * Budget: Off render loop, typically <1ms for up to 100 pending updates.
   */
  private gossipRound(): void {
    const startTime = this.now();

    if (this.pendingUpdates.length === 0) {
      return; // Nothing to gossip
    }

    // Select random peers
    const selectedPeers = this.selectRandomPeers(this.config.fanOut);

    if (selectedPeers.length === 0) {
      return; // No alive peers
    }

    // Build gossip message
    const message: GossipMessage = {
      fromNodeId: this.config.nodeId,
      sequence: ++this.messageSequence,
      updates: [...this.pendingUpdates],
      bloomSnapshot: this.bloomFilter.serialize(),
      senderClock: { ...this.vectorClock },
      timestamp: Date.now(),
      protocolVersion: '1.0',
    };

    // Send to selected peers
    for (const peer of selectedPeers) {
      try {
        peer.send(message);
        this.totalMessagesSent++;
      } catch (e) {
        peer.failedSends++;
        if (peer.failedSends >= this.config.maxFailedSends) {
          peer.isAlive = false;
          this.config.onPeerDead(peer.nodeId);
          logger.warn('[GossipTrustMesh] Peer marked as dead', {
            nodeId: peer.nodeId,
            failedSends: peer.failedSends,
          });
        }
      }
    }

    // Clear pending updates (they have been sent)
    this.pendingUpdates = [];
    this.totalRounds++;

    // Track round duration
    const duration = this.now() - startTime;
    this.roundDurations.push(duration);
    if (this.roundDurations.length > this.MAX_DURATION_HISTORY) {
      this.roundDurations.shift();
    }
  }

  /**
   * Anti-entropy reconciliation round.
   *
   * Sends the full local trust state to one random peer for
   * complete state synchronization. This catches any updates
   * that may have been lost during normal gossip rounds.
   *
   * Runs less frequently than gossip rounds (default: every 5s).
   */
  private antiEntropyRound(): void {
    const peers = this.selectRandomPeers(1);
    if (peers.length === 0) return;

    // Convert local trust state to updates for full reconciliation
    const allUpdates: TrustUpdate[] = [];
    for (const update of this.localTrustState.values()) {
      allUpdates.push({
        ...update,
        ttl: 1, // Don't re-gossip anti-entropy messages far
      });
    }

    if (allUpdates.length === 0) return;

    const message: GossipMessage = {
      fromNodeId: this.config.nodeId,
      sequence: ++this.messageSequence,
      updates: allUpdates,
      bloomSnapshot: this.bloomFilter.serialize(),
      senderClock: { ...this.vectorClock },
      timestamp: Date.now(),
      protocolVersion: '1.0',
    };

    try {
      peers[0].send(message);
      this.totalMessagesSent++;
    } catch {
      peers[0].failedSends++;
    }

    logger.debug('[GossipTrustMesh] Anti-entropy round', {
      peer: peers[0].nodeId,
      updateCount: allUpdates.length,
    });
  }

  // ===========================================================================
  // PEER SELECTION
  // ===========================================================================

  /**
   * Select `count` random alive peers for gossip.
   *
   * Uses Fisher-Yates shuffle for unbiased random selection.
   *
   * @param count - Number of peers to select
   * @returns Selected peers (may be fewer than count if not enough alive peers)
   */
  private selectRandomPeers(count: number): GossipPeer[] {
    const alivePeers: GossipPeer[] = [];
    for (const peer of this.peers.values()) {
      if (peer.isAlive) {
        alivePeers.push(peer);
      }
    }

    if (alivePeers.length <= count) {
      return alivePeers;
    }

    // Fisher-Yates partial shuffle to select `count` random peers
    const selected: GossipPeer[] = [];
    const indices = Array.from({ length: alivePeers.length }, (_, i) => i);

    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (indices.length - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
      selected.push(alivePeers[indices[i]]);
    }

    return selected;
  }

  // ===========================================================================
  // VECTOR CLOCK OPERATIONS
  // ===========================================================================

  /**
   * Merge a remote vector clock into the local one.
   * Takes the element-wise maximum.
   */
  private mergeVectorClock(remote: VectorClock): void {
    for (const [nodeId, timestamp] of Object.entries(remote)) {
      this.vectorClock[nodeId] = Math.max(
        this.vectorClock[nodeId] || 0,
        timestamp,
      );
    }
  }

  /**
   * Compare two vector clocks to determine causal ordering.
   *
   * @returns
   *   'before' - a happened before b (a < b)
   *   'after'  - a happened after b (a > b)
   *   'equal'  - a and b are the same
   *   'concurrent' - a and b are causally concurrent (conflict)
   */
  private compareVectorClocks(
    a: VectorClock,
    b: VectorClock,
  ): 'before' | 'after' | 'equal' | 'concurrent' {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

    let aLessB = false;
    let bLessA = false;

    for (const key of allKeys) {
      const aVal = a[key] || 0;
      const bVal = b[key] || 0;

      if (aVal < bVal) aLessB = true;
      if (aVal > bVal) bLessA = true;
    }

    if (aLessB && !bLessA) return 'before';
    if (bLessA && !aLessB) return 'after';
    if (!aLessB && !bLessA) return 'equal';
    return 'concurrent';
  }

  /**
   * Resolve a conflict between two concurrent trust updates.
   *
   * Resolution strategy (priority order):
   * 1. Revoked always wins (most restrictive state)
   * 2. Degraded wins over trusted
   * 3. Higher trust score wins if same level
   * 4. Earlier timestamp wins as tiebreaker
   *
   * @returns true if the remote update should be applied
   */
  private resolveConflict(remote: TrustUpdate, local: TrustUpdate): boolean {
    const TRUST_PRIORITY: Record<TrustLevel, number> = {
      revoked: 5,
      degraded: 4,
      pending: 3,
      verified: 2,
      trusted: 1,
      none: 0,
    };

    const remotePriority = TRUST_PRIORITY[remote.trustLevel];
    const localPriority = TRUST_PRIORITY[local.trustLevel];

    // Higher priority (more restrictive) wins
    if (remotePriority > localPriority) return true;
    if (remotePriority < localPriority) return false;

    // Same trust level: lower trust score wins (more conservative)
    if (remote.trustScore < local.trustScore) return true;
    if (remote.trustScore > local.trustScore) return false;

    // Tiebreaker: earlier timestamp
    return remote.timestamp < local.timestamp;
  }

  // ===========================================================================
  // CONVERGENCE ESTIMATION
  // ===========================================================================

  /**
   * Estimate the number of gossip rounds needed for convergence.
   *
   * With fan-out f and n nodes, convergence takes approximately:
   *   rounds = ceil(log_f(n + 1))
   *
   * With fan-out 3:
   *   - 3 nodes: 1 round
   *   - 10 nodes: 3 rounds
   *   - 100 nodes: 5 rounds
   *   - 1000 nodes: 7 rounds
   *   - 10000 nodes: 9 rounds
   *   - 1000000 nodes: 13 rounds
   *
   * This is O(log2(n)) since log3(n) = log2(n) / log2(3) ≈ log2(n) / 1.585.
   */
  getEstimatedConvergenceRounds(): number {
    const n = this.peers.size + 1; // Include self
    if (n <= 1) return 0;
    return Math.ceil(Math.log(n) / Math.log(this.config.fanOut));
  }

  /**
   * Get the estimated convergence time in milliseconds.
   */
  getEstimatedConvergenceTimeMs(): number {
    return this.getEstimatedConvergenceRounds() * this.config.gossipIntervalMs;
  }

  // ===========================================================================
  // QUERY API
  // ===========================================================================

  /**
   * Get the current vector clock.
   */
  getVectorClock(): Readonly<VectorClock> {
    return this.vectorClock;
  }

  /**
   * Get the node ID.
   */
  getNodeId(): string {
    return this.config.nodeId;
  }

  /**
   * Check if the gossip loop is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get all known agent trust states from gossip.
   */
  getAllTrustStates(): ReadonlyMap<string, TrustUpdate> {
    return this.localTrustState;
  }

  /**
   * Get the number of pending updates.
   */
  getPendingUpdateCount(): number {
    return this.pendingUpdates.length;
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive mesh metrics.
   */
  getMetrics(): GossipTrustMeshMetrics {
    let averageRoundDuration = 0;
    if (this.roundDurations.length > 0) {
      averageRoundDuration =
        this.roundDurations.reduce((a, b) => a + b, 0) /
        this.roundDurations.length;
    }

    return {
      nodeId: this.config.nodeId,
      isRunning: this.isRunning,
      fanOut: this.config.fanOut,
      peerCount: this.peers.size,
      alivePeerCount: this.getAlivePeerCount(),
      totalRounds: this.totalRounds,
      totalMessagesSent: this.totalMessagesSent,
      totalMessagesReceived: this.totalMessagesReceived,
      totalLocalUpdates: this.totalLocalUpdates,
      totalRemoteUpdates: this.totalRemoteUpdates,
      totalDroppedUpdates: this.totalDroppedUpdates,
      pendingUpdateCount: this.pendingUpdates.length,
      vectorClock: { ...this.vectorClock },
      bloomFilterMetrics: this.bloomFilter.getMetrics(),
      estimatedConvergenceRounds: this.getEstimatedConvergenceRounds(),
      gossipIntervalMs: this.config.gossipIntervalMs,
      averageRoundDurationMs: Math.round(averageRoundDuration * 1000) / 1000,
    };
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  /**
   * Evict oldest entries from seenUpdates to prevent unbounded growth.
   */
  private evictSeenUpdates(): void {
    if (this.seenUpdates.size > this.MAX_SEEN_UPDATES) {
      // Set iteration order is insertion order; delete oldest entries
      const deleteCount = this.seenUpdates.size - this.MAX_SEEN_UPDATES + 100;
      let i = 0;
      for (const id of this.seenUpdates) {
        if (i >= deleteCount) break;
        this.seenUpdates.delete(id);
        i++;
      }
    }
  }

  /**
   * High-resolution timestamp.
   */
  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a GossipTrustMesh with the given configuration.
 */
export function createGossipTrustMesh(
  config: GossipTrustMeshConfig,
): GossipTrustMesh {
  return new GossipTrustMesh(config);
}
