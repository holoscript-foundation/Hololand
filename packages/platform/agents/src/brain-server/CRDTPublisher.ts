/**
 * @hololand/agents CRDTPublisher
 *
 * Publishes agent inference results as CRDT operations for
 * conflict-free distributed state convergence. Each agent's
 * state is represented as a Last-Writer-Wins Register (LWW)
 * with vector clocks for causality ordering.
 */

export interface VectorClock {
  [nodeId: string]: number;
}

export interface CRDTOperation {
  operationId: string;
  agentId: string;
  key: string;
  value: unknown;
  timestamp: number;
  vectorClock: VectorClock;
  nodeId: string;
}

export interface CRDTState {
  agentId: string;
  entries: Map<string, { value: unknown; timestamp: number; vectorClock: VectorClock }>;
}

export type CRDTSubscriber = (operation: CRDTOperation) => void;

/**
 * CRDT publisher for conflict-free agent state distribution.
 */
export class CRDTPublisher {
  private nodeId: string;
  private states: Map<string, CRDTState> = new Map();
  private vectorClocks: Map<string, VectorClock> = new Map();
  private subscribers: CRDTSubscriber[] = [];
  private operationLog: CRDTOperation[] = [];
  private maxLogSize: number;
  private opCount: number = 0;

  constructor(nodeId: string, maxLogSize: number = 1000) {
    this.nodeId = nodeId;
    this.maxLogSize = maxLogSize;
  }

  /**
   * Publish a state update for an agent. Creates a CRDT operation
   * with an incremented vector clock.
   */
  publish(agentId: string, key: string, value: unknown): CRDTOperation {
    // Get or create vector clock for this agent
    if (!this.vectorClocks.has(agentId)) {
      this.vectorClocks.set(agentId, {});
    }
    const clock = this.vectorClocks.get(agentId)!;
    clock[this.nodeId] = (clock[this.nodeId] ?? 0) + 1;

    const operation: CRDTOperation = {
      operationId: `op_${this.nodeId}_${++this.opCount}`,
      agentId,
      key,
      value,
      timestamp: Date.now(),
      vectorClock: { ...clock },
      nodeId: this.nodeId,
    };

    // Apply locally
    this.applyOperation(operation);

    // Store in log
    this.operationLog.push(operation);
    if (this.operationLog.length > this.maxLogSize) {
      this.operationLog.shift();
    }

    // Notify subscribers
    for (const subscriber of this.subscribers) {
      try {
        subscriber(operation);
      } catch {
        // Swallow subscriber errors
      }
    }

    return operation;
  }

  /**
   * Merge a remote CRDT operation. Uses LWW semantics with
   * vector clock comparison for causality.
   */
  merge(operation: CRDTOperation): boolean {
    const state = this.states.get(operation.agentId);
    if (!state) {
      this.applyOperation(operation);
      return true;
    }

    const existing = state.entries.get(operation.key);
    if (!existing) {
      this.applyOperation(operation);
      return true;
    }

    // LWW: latest timestamp wins, with vector clock as tiebreaker
    if (operation.timestamp > existing.timestamp) {
      this.applyOperation(operation);
      return true;
    }

    if (
      operation.timestamp === existing.timestamp &&
      this.compareVectorClocks(operation.vectorClock, existing.vectorClock) > 0
    ) {
      this.applyOperation(operation);
      return true;
    }

    return false; // Stale operation, not applied
  }

  /**
   * Get the current CRDT state for an agent.
   */
  getState(agentId: string): Record<string, unknown> | undefined {
    const state = this.states.get(agentId);
    if (!state) return undefined;
    const result: Record<string, unknown> = {};
    for (const [key, entry] of state.entries) {
      result[key] = entry.value;
    }
    return result;
  }

  /**
   * Get operations since a given vector clock (for sync).
   */
  getOperationsSince(sinceTimestamp: number): CRDTOperation[] {
    return this.operationLog.filter((op) => op.timestamp > sinceTimestamp);
  }

  /**
   * Subscribe to CRDT operations.
   */
  subscribe(handler: CRDTSubscriber): void {
    this.subscribers.push(handler);
  }

  /**
   * Get the node ID.
   */
  getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Get the number of tracked agents.
   */
  getAgentCount(): number {
    return this.states.size;
  }

  /**
   * Get total operation count.
   */
  getOperationCount(): number {
    return this.opCount;
  }

  /**
   * Remove an agent's state.
   */
  removeAgent(agentId: string): void {
    this.states.delete(agentId);
    this.vectorClocks.delete(agentId);
  }

  private applyOperation(op: CRDTOperation): void {
    if (!this.states.has(op.agentId)) {
      this.states.set(op.agentId, { agentId: op.agentId, entries: new Map() });
    }
    const state = this.states.get(op.agentId)!;
    state.entries.set(op.key, {
      value: op.value,
      timestamp: op.timestamp,
      vectorClock: { ...op.vectorClock },
    });

    // Merge vector clocks
    if (!this.vectorClocks.has(op.agentId)) {
      this.vectorClocks.set(op.agentId, {});
    }
    const localClock = this.vectorClocks.get(op.agentId)!;
    for (const [node, tick] of Object.entries(op.vectorClock)) {
      localClock[node] = Math.max(localClock[node] ?? 0, tick);
    }
  }

  private compareVectorClocks(a: VectorClock, b: VectorClock): number {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let aGreater = false;
    let bGreater = false;
    for (const key of allKeys) {
      const aVal = a[key] ?? 0;
      const bVal = b[key] ?? 0;
      if (aVal > bVal) aGreater = true;
      if (bVal > aVal) bGreater = true;
    }
    if (aGreater && !bGreater) return 1;
    if (bGreater && !aGreater) return -1;
    return 0; // Concurrent
  }
}
