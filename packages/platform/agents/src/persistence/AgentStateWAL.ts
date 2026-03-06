/**
 * @hololand/agents -- Agent State Write-Ahead Log (WAL)
 *
 * Implements a Write-Ahead Log for cross-scene agent state persistence.
 * Every state mutation is first written to the WAL before being applied,
 * ensuring crash-recovery semantics and full audit trail.
 *
 * PROBLEM: When agents transition between scenes (worlds), their state
 * (position, emotion, memory, inventory, conversation context) is lost.
 * In-memory state buffers (AgentStateBuffer) only persist within a single
 * renderer lifetime.
 *
 * SOLUTION: WAL captures every state change as an immutable log entry.
 * On scene transition, the new scene replays the WAL to reconstruct
 * the agent's full state. WAL entries are checkpointed periodically
 * to bound replay cost.
 *
 * PERFORMANCE:
 *   - Write: O(1) append (no random I/O)
 *   - Checkpoint: O(n) where n = state fields
 *   - Replay: O(k) where k = entries since last checkpoint
 *   - Memory: O(n + k) for state + pending entries
 *
 * @version 1.0.0
 */

import { createDID } from './AgentDID.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * WAL entry operation types
 */
export type WALOperationType =
  | 'SET'           // Set a state field
  | 'DELETE'        // Delete a state field
  | 'MERGE'         // Deep merge into a state field
  | 'PUSH'          // Push to an array field
  | 'CHECKPOINT'    // Full state snapshot
  | 'SCENE_ENTER'   // Agent entered a scene
  | 'SCENE_EXIT'    // Agent exited a scene
  | 'MIGRATION';    // State migrated between schema versions

/**
 * A single WAL entry (immutable after creation)
 */
export interface WALEntry {
  /** Monotonically increasing sequence number */
  sequence: number;
  /** Agent DID (did:holo:<agentId>) */
  agentDID: string;
  /** Operation type */
  operation: WALOperationType;
  /** State field path (dot-separated, e.g. 'position.x', 'memory.shortTerm') */
  path: string;
  /** Value for SET/MERGE/PUSH operations */
  value?: unknown;
  /** Previous value (for undo capability) */
  previousValue?: unknown;
  /** Scene ID where this change occurred */
  sceneId: string;
  /** ISO timestamp */
  timestamp: string;
  /** Optional correlation ID for grouping related changes */
  correlationId?: string;
  /** Schema version for forward compatibility */
  schemaVersion: number;
}

/**
 * A checkpoint captures the complete agent state at a point in time.
 * Replaying from checkpoint is faster than replaying from the beginning.
 */
export interface WALCheckpoint {
  /** Sequence number of this checkpoint */
  sequence: number;
  /** Agent DID */
  agentDID: string;
  /** Full agent state snapshot */
  state: Record<string, unknown>;
  /** Scene ID at checkpoint time */
  sceneId: string;
  /** ISO timestamp */
  timestamp: string;
  /** Schema version */
  schemaVersion: number;
  /** Number of entries compacted into this checkpoint */
  entriesCompacted: number;
}

/**
 * Scene transition record
 */
export interface SceneTransition {
  /** Agent DID */
  agentDID: string;
  /** Source scene ID */
  fromSceneId: string;
  /** Destination scene ID */
  toSceneId: string;
  /** ISO timestamp */
  timestamp: string;
  /** State snapshot carried across the transition */
  carriedState: Record<string, unknown>;
  /** WAL sequence at transition time */
  walSequence: number;
}

/**
 * WAL configuration
 */
export interface AgentStateWALConfig {
  /** Maximum entries before auto-checkpoint (default: 100) */
  maxEntriesBeforeCheckpoint?: number;
  /** Maximum total entries to retain (default: 10000) */
  maxTotalEntries?: number;
  /** Schema version for state format (default: 1) */
  schemaVersion?: number;
  /** Whether to track previous values for undo (default: true) */
  trackPreviousValues?: boolean;
  /** Callback when checkpoint is created */
  onCheckpoint?: (checkpoint: WALCheckpoint) => void;
  /** Callback when scene transition occurs */
  onSceneTransition?: (transition: SceneTransition) => void;
}

/**
 * WAL metrics
 */
export interface AgentStateWALMetrics {
  /** Total WAL entries */
  totalEntries: number;
  /** Total checkpoints */
  totalCheckpoints: number;
  /** Entries since last checkpoint */
  entriesSinceCheckpoint: number;
  /** Total scene transitions */
  totalSceneTransitions: number;
  /** Current schema version */
  schemaVersion: number;
  /** Estimated memory usage in bytes */
  estimatedMemoryBytes: number;
  /** Number of unique agents in WAL */
  uniqueAgents: number;
  /** Average entries per agent */
  avgEntriesPerAgent: number;
}

// =============================================================================
// AGENT STATE WAL
// =============================================================================

/**
 * Write-Ahead Log for cross-scene agent state persistence.
 *
 * Usage:
 * ```typescript
 * const wal = new AgentStateWAL();
 *
 * // Agent enters scene
 * wal.sceneEnter('brittney', 'world-1');
 *
 * // Record state changes
 * wal.set('brittney', 'world-1', 'position', { x: 1, y: 2, z: 3 });
 * wal.set('brittney', 'world-1', 'emotion', 'curious');
 * wal.merge('brittney', 'world-1', 'memory.shortTerm', { lastTopic: 'physics' });
 *
 * // Agent transitions to new scene
 * const transition = wal.sceneTransition('brittney', 'world-1', 'world-2');
 * // transition.carriedState contains full state to apply in new scene
 *
 * // In new scene, replay state
 * const state = wal.replayState('brittney');
 * // state = { position: { x: 1, y: 2, z: 3 }, emotion: 'curious', memory: { shortTerm: { lastTopic: 'physics' } } }
 * ```
 */
export class AgentStateWAL {
  private readonly config: Required<AgentStateWALConfig>;
  private entries: WALEntry[] = [];
  private checkpoints: WALCheckpoint[] = [];
  private transitions: SceneTransition[] = [];
  private sequence: number = 0;

  // Current reconstructed state per agent (cache)
  private stateCache: Map<string, Record<string, unknown>> = new Map();
  // Track which scene each agent is currently in
  private currentScene: Map<string, string> = new Map();

  constructor(config?: AgentStateWALConfig) {
    this.config = {
      maxEntriesBeforeCheckpoint: config?.maxEntriesBeforeCheckpoint ?? 100,
      maxTotalEntries: config?.maxTotalEntries ?? 10000,
      schemaVersion: config?.schemaVersion ?? 1,
      trackPreviousValues: config?.trackPreviousValues ?? true,
      onCheckpoint: config?.onCheckpoint ?? (() => {}),
      onSceneTransition: config?.onSceneTransition ?? (() => {}),
    };
  }

  // =========================================================================
  // State Mutation Operations
  // =========================================================================

  /**
   * Set a state field value.
   *
   * @param agentId - Agent identifier (will be converted to DID)
   * @param sceneId - Current scene ID
   * @param path - Dot-separated field path
   * @param value - Value to set
   * @param correlationId - Optional correlation ID
   * @returns The WAL entry sequence number
   */
  set(
    agentId: string,
    sceneId: string,
    path: string,
    value: unknown,
    correlationId?: string,
  ): number {
    const did = createDID(agentId);
    const previousValue = this.config.trackPreviousValues
      ? this.getNestedValue(this.getOrCreateState(did), path)
      : undefined;

    const entry = this.createEntry(did, 'SET', path, sceneId, value, previousValue, correlationId);
    this.appendEntry(entry);
    // Cache is invalidated by appendEntry; getOrCreateState will rebuild lazily.

    return entry.sequence;
  }

  /**
   * Delete a state field.
   *
   * @param agentId - Agent identifier
   * @param sceneId - Current scene ID
   * @param path - Dot-separated field path
   * @returns The WAL entry sequence number
   */
  delete(agentId: string, sceneId: string, path: string): number {
    const did = createDID(agentId);
    const previousValue = this.config.trackPreviousValues
      ? this.getNestedValue(this.getOrCreateState(did), path)
      : undefined;

    const entry = this.createEntry(did, 'DELETE', path, sceneId, undefined, previousValue);
    this.appendEntry(entry);
    // Cache is invalidated by appendEntry; getOrCreateState will rebuild lazily.

    return entry.sequence;
  }

  /**
   * Deep merge into a state field.
   *
   * @param agentId - Agent identifier
   * @param sceneId - Current scene ID
   * @param path - Dot-separated field path
   * @param value - Object to merge
   * @returns The WAL entry sequence number
   */
  merge(
    agentId: string,
    sceneId: string,
    path: string,
    value: Record<string, unknown>,
    correlationId?: string,
  ): number {
    const did = createDID(agentId);
    const previousValue = this.config.trackPreviousValues
      ? this.getNestedValue(this.getOrCreateState(did), path)
      : undefined;

    const entry = this.createEntry(did, 'MERGE', path, sceneId, value, previousValue, correlationId);
    this.appendEntry(entry);
    // Cache is invalidated by appendEntry; getOrCreateState will rebuild lazily.

    return entry.sequence;
  }

  /**
   * Push a value to an array field.
   *
   * @param agentId - Agent identifier
   * @param sceneId - Current scene ID
   * @param path - Dot-separated field path to an array
   * @param value - Value to push
   * @returns The WAL entry sequence number
   */
  push(agentId: string, sceneId: string, path: string, value: unknown): number {
    const did = createDID(agentId);

    const entry = this.createEntry(did, 'PUSH', path, sceneId, value);
    this.appendEntry(entry);
    // Cache is invalidated by appendEntry; getOrCreateState will rebuild lazily
    // from WAL entries (which now includes this PUSH entry).

    return entry.sequence;
  }

  // =========================================================================
  // Scene Lifecycle
  // =========================================================================

  /**
   * Record agent entering a scene.
   *
   * @param agentId - Agent identifier
   * @param sceneId - Scene being entered
   * @returns The WAL entry sequence number
   */
  sceneEnter(agentId: string, sceneId: string): number {
    const did = createDID(agentId);
    this.currentScene.set(did, sceneId);

    const entry = this.createEntry(did, 'SCENE_ENTER', '', sceneId, { sceneId });
    this.appendEntry(entry);

    return entry.sequence;
  }

  /**
   * Record agent exiting a scene.
   *
   * @param agentId - Agent identifier
   * @param sceneId - Scene being exited
   * @returns The WAL entry sequence number
   */
  sceneExit(agentId: string, sceneId: string): number {
    const did = createDID(agentId);

    const entry = this.createEntry(did, 'SCENE_EXIT', '', sceneId, { sceneId });
    this.appendEntry(entry);

    return entry.sequence;
  }

  /**
   * Handle a complete scene transition.
   * Creates exit entry, captures state, creates enter entry.
   *
   * @param agentId - Agent identifier
   * @param fromSceneId - Scene being left
   * @param toSceneId - Scene being entered
   * @returns The scene transition record with carried state
   */
  sceneTransition(agentId: string, fromSceneId: string, toSceneId: string): SceneTransition {
    const did = createDID(agentId);

    // Create checkpoint before transition
    this.checkpoint(agentId);

    // Record exit
    this.sceneExit(agentId, fromSceneId);

    // Capture state for transition
    const carriedState = this.replayState(agentId);

    // Record enter
    this.sceneEnter(agentId, toSceneId);

    // Create transition record
    const transition: SceneTransition = {
      agentDID: did,
      fromSceneId,
      toSceneId,
      timestamp: new Date().toISOString(),
      carriedState: JSON.parse(JSON.stringify(carriedState)),
      walSequence: this.sequence,
    };

    this.transitions.push(transition);
    this.config.onSceneTransition(transition);

    return transition;
  }

  // =========================================================================
  // State Replay
  // =========================================================================

  /**
   * Replay the WAL to reconstruct an agent's full state.
   *
   * Starts from the most recent checkpoint and replays subsequent entries.
   * This is the primary mechanism for cross-scene state recovery.
   *
   * @param agentId - Agent identifier
   * @returns The reconstructed state
   */
  replayState(agentId: string): Record<string, unknown> {
    const did = createDID(agentId);

    // Check cache first
    const cached = this.stateCache.get(did);
    if (cached) {
      return JSON.parse(JSON.stringify(cached));
    }

    // Find most recent checkpoint for this agent
    const checkpoint = this.getLatestCheckpoint(did);
    let state: Record<string, unknown> = checkpoint
      ? JSON.parse(JSON.stringify(checkpoint.state))
      : {};

    // Replay entries after checkpoint
    const startSequence = checkpoint ? checkpoint.sequence + 1 : 0;
    const entries = this.entries.filter(
      e => e.agentDID === did && e.sequence >= startSequence,
    );

    for (const entry of entries) {
      state = this.applyEntry(state, entry);
    }

    // Update cache
    this.stateCache.set(did, state);

    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Get the state at a specific point in time (WAL sequence).
   *
   * @param agentId - Agent identifier
   * @param upToSequence - Replay up to this sequence number (inclusive)
   * @returns The state at that point
   */
  replayStateAt(agentId: string, upToSequence: number): Record<string, unknown> {
    const did = createDID(agentId);

    // Find checkpoint before the target sequence
    const checkpoint = this.checkpoints
      .filter(c => c.agentDID === did && c.sequence <= upToSequence)
      .sort((a, b) => b.sequence - a.sequence)[0];

    let state: Record<string, unknown> = checkpoint
      ? JSON.parse(JSON.stringify(checkpoint.state))
      : {};

    const startSequence = checkpoint ? checkpoint.sequence + 1 : 0;
    const entries = this.entries.filter(
      e => e.agentDID === did && e.sequence >= startSequence && e.sequence <= upToSequence,
    );

    for (const entry of entries) {
      state = this.applyEntry(state, entry);
    }

    return state;
  }

  // =========================================================================
  // Checkpoint
  // =========================================================================

  /**
   * Create a checkpoint of the current agent state.
   * Checkpoints allow efficient replay by providing a restore point.
   *
   * @param agentId - Agent identifier
   * @returns The created checkpoint
   */
  checkpoint(agentId: string): WALCheckpoint {
    const did = createDID(agentId);
    const state = this.replayState(agentId);
    const sceneId = this.currentScene.get(did) ?? 'unknown';

    const lastCheckpointSeq = this.getLatestCheckpoint(did)?.sequence ?? 0;
    const entriesSince = this.entries.filter(
      e => e.agentDID === did && e.sequence > lastCheckpointSeq,
    ).length;

    const cp: WALCheckpoint = {
      sequence: this.sequence,
      agentDID: did,
      state: JSON.parse(JSON.stringify(state)),
      sceneId,
      timestamp: new Date().toISOString(),
      schemaVersion: this.config.schemaVersion,
      entriesCompacted: entriesSince,
    };

    this.checkpoints.push(cp);
    this.config.onCheckpoint(cp);

    return cp;
  }

  // =========================================================================
  // Query
  // =========================================================================

  /**
   * Get all WAL entries for an agent.
   *
   * @param agentId - Agent identifier
   * @param limit - Maximum entries to return
   * @returns Array of WAL entries, newest first
   */
  getEntries(agentId: string, limit?: number): WALEntry[] {
    const did = createDID(agentId);
    let entries = this.entries.filter(e => e.agentDID === did);
    if (limit) {
      entries = entries.slice(-limit);
    }
    return entries;
  }

  /**
   * Get all entries for a specific scene.
   *
   * @param sceneId - Scene identifier
   * @returns Array of WAL entries for that scene
   */
  getEntriesForScene(sceneId: string): WALEntry[] {
    return this.entries.filter(e => e.sceneId === sceneId);
  }

  /**
   * Get all scene transitions for an agent.
   *
   * @param agentId - Agent identifier
   * @returns Array of scene transitions
   */
  getTransitions(agentId: string): SceneTransition[] {
    const did = createDID(agentId);
    return this.transitions.filter(t => t.agentDID === did);
  }

  /**
   * Get the current scene for an agent.
   *
   * @param agentId - Agent identifier
   * @returns Scene ID or undefined
   */
  getCurrentScene(agentId: string): string | undefined {
    return this.currentScene.get(createDID(agentId));
  }

  /**
   * Get all agent IDs that have WAL entries.
   */
  getTrackedAgents(): string[] {
    const dids = new Set<string>();
    for (const entry of this.entries) {
      dids.add(entry.agentDID);
    }
    return Array.from(dids);
  }

  // =========================================================================
  // Undo
  // =========================================================================

  /**
   * Undo the last mutation for an agent.
   * Only works if trackPreviousValues is enabled.
   *
   * @param agentId - Agent identifier
   * @returns The undone entry, or null if nothing to undo
   */
  undo(agentId: string): WALEntry | null {
    if (!this.config.trackPreviousValues) return null;

    const did = createDID(agentId);
    const agentEntries = this.entries.filter(
      e => e.agentDID === did &&
        (e.operation === 'SET' || e.operation === 'DELETE' || e.operation === 'MERGE'),
    );

    if (agentEntries.length === 0) return null;

    const lastEntry = agentEntries[agentEntries.length - 1];
    if (lastEntry.previousValue === undefined && lastEntry.operation !== 'DELETE') return null;

    const sceneId = this.currentScene.get(did) ?? 'unknown';

    if (lastEntry.operation === 'SET' || lastEntry.operation === 'MERGE') {
      if (lastEntry.previousValue !== undefined) {
        this.set(
          did.replace('did:holo:', ''),
          sceneId,
          lastEntry.path,
          lastEntry.previousValue,
        );
      } else {
        this.delete(did.replace('did:holo:', ''), sceneId, lastEntry.path);
      }
    } else if (lastEntry.operation === 'DELETE') {
      if (lastEntry.previousValue !== undefined) {
        this.set(
          did.replace('did:holo:', ''),
          sceneId,
          lastEntry.path,
          lastEntry.previousValue,
        );
      }
    }

    return lastEntry;
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Get WAL metrics.
   */
  getMetrics(): AgentStateWALMetrics {
    const agentSet = new Set<string>();
    for (const e of this.entries) agentSet.add(e.agentDID);

    const estimatedBytes = JSON.stringify(this.entries).length +
      JSON.stringify(this.checkpoints).length;

    return {
      totalEntries: this.entries.length,
      totalCheckpoints: this.checkpoints.length,
      entriesSinceCheckpoint: this.checkpoints.length > 0
        ? this.entries.filter(
            e => e.sequence > this.checkpoints[this.checkpoints.length - 1].sequence,
          ).length
        : this.entries.length,
      totalSceneTransitions: this.transitions.length,
      schemaVersion: this.config.schemaVersion,
      estimatedMemoryBytes: estimatedBytes,
      uniqueAgents: agentSet.size,
      avgEntriesPerAgent: agentSet.size > 0
        ? Math.round(this.entries.length / agentSet.size)
        : 0,
    };
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Clear all WAL state. For testing or shutdown.
   */
  destroy(): void {
    this.entries = [];
    this.checkpoints = [];
    this.transitions = [];
    this.stateCache.clear();
    this.currentScene.clear();
    this.sequence = 0;
  }

  // =========================================================================
  // Internals
  // =========================================================================

  private createEntry(
    agentDID: string,
    operation: WALOperationType,
    path: string,
    sceneId: string,
    value?: unknown,
    previousValue?: unknown,
    correlationId?: string,
  ): WALEntry {
    return {
      sequence: ++this.sequence,
      agentDID,
      operation,
      path,
      value,
      previousValue,
      sceneId,
      timestamp: new Date().toISOString(),
      correlationId,
      schemaVersion: this.config.schemaVersion,
    };
  }

  private appendEntry(entry: WALEntry): void {
    this.entries.push(entry);

    // Invalidate cache for this agent
    this.stateCache.delete(entry.agentDID);

    // Auto-checkpoint if needed
    const agentEntries = this.entries.filter(e => e.agentDID === entry.agentDID);
    const lastCheckpoint = this.getLatestCheckpoint(entry.agentDID);
    const entriesSinceCheckpoint = lastCheckpoint
      ? agentEntries.filter(e => e.sequence > lastCheckpoint.sequence).length
      : agentEntries.length;

    if (entriesSinceCheckpoint >= this.config.maxEntriesBeforeCheckpoint) {
      const agentId = entry.agentDID.replace('did:holo:', '');
      this.checkpoint(agentId);
    }

    // Trim old entries if over max
    if (this.entries.length > this.config.maxTotalEntries) {
      const toRemove = this.entries.length - this.config.maxTotalEntries;
      this.entries.splice(0, toRemove);
    }
  }

  private getLatestCheckpoint(agentDID: string): WALCheckpoint | undefined {
    const agentCheckpoints = this.checkpoints.filter(c => c.agentDID === agentDID);
    return agentCheckpoints[agentCheckpoints.length - 1];
  }

  /**
   * Get or create the in-memory state cache for an agent.
   * This is the live state that mutations are applied to between replays.
   */
  private getOrCreateState(agentDID: string): Record<string, unknown> {
    let state = this.stateCache.get(agentDID);
    if (!state) {
      // Replay from WAL to build current state
      // But avoid recursion - build from entries directly
      const checkpoint = this.getLatestCheckpoint(agentDID);
      state = checkpoint
        ? JSON.parse(JSON.stringify(checkpoint.state))
        : {};

      const startSequence = checkpoint ? checkpoint.sequence + 1 : 0;
      const entries = this.entries.filter(
        e => e.agentDID === agentDID && e.sequence >= startSequence,
      );

      for (const entry of entries) {
        state = this.applyEntry(state!, entry);
      }

      this.stateCache.set(agentDID, state!);
    }
    return state!;
  }

  private applyEntry(state: Record<string, unknown>, entry: WALEntry): Record<string, unknown> {
    switch (entry.operation) {
      case 'SET':
        this.setNestedValue(state, entry.path, entry.value);
        break;
      case 'DELETE':
        this.deleteNestedValue(state, entry.path);
        break;
      case 'MERGE': {
        const existing = this.getNestedValue(state, entry.path);
        if (existing && typeof existing === 'object' && !Array.isArray(existing) && entry.value) {
          this.setNestedValue(state, entry.path, {
            ...(existing as Record<string, unknown>),
            ...(entry.value as Record<string, unknown>),
          });
        } else {
          this.setNestedValue(state, entry.path, entry.value);
        }
        break;
      }
      case 'PUSH': {
        const arr = this.getNestedValue(state, entry.path);
        if (Array.isArray(arr)) {
          arr.push(entry.value);
        } else {
          this.setNestedValue(state, entry.path, [entry.value]);
        }
        break;
      }
      // SCENE_ENTER, SCENE_EXIT, CHECKPOINT, MIGRATION don't modify state directly
      default:
        break;
    }
    return state;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    if (!path) return obj;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    if (!path) return;
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  private deleteNestedValue(obj: Record<string, unknown>, path: string): void {
    if (!path) return;
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        return;
      }
      current = current[part] as Record<string, unknown>;
    }
    delete current[parts[parts.length - 1]];
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let _wal: AgentStateWAL | null = null;

/**
 * Get the singleton AgentStateWAL instance.
 */
export function getAgentStateWAL(config?: AgentStateWALConfig): AgentStateWAL {
  if (!_wal) {
    _wal = new AgentStateWAL(config);
  }
  return _wal;
}

/**
 * Reset the WAL (for testing).
 */
export function resetAgentStateWAL(): void {
  if (_wal) {
    _wal.destroy();
    _wal = null;
  }
}
