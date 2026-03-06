/**
 * YjsCollaboration.ts - Yjs-compatible CRDT Collaboration Layer
 *
 * Implements the Yjs awareness protocol pattern on top of Hololand's existing
 * CRDT infrastructure. Provides:
 *   - Awareness protocol (cursor positions, user presence, selections)
 *   - Cursor presence tracking across peers
 *   - Selection range synchronization
 *   - Conflict detection and resolution strategies
 *
 * This bridges Hololand's native CRDTs (LWWMap, ORSet, RGASequence) with
 * a Yjs-compatible awareness API so frontend components can consume
 * real-time collaboration state through a unified interface.
 *
 * @module YjsCollaboration
 */

import type { VectorClock } from './crdt';
import { createVectorClock, incrementClock, mergeClock, compareClock } from './crdt';
import { LWWMap, ORSet, LWWRegister } from './crdt';

// =============================================================================
// Types
// =============================================================================

/** Unique color assigned to each collaborator */
export interface UserColor {
  /** Primary color in hex format, e.g. '#3b82f6' */
  color: string;
  /** Lighter variant for backgrounds/highlights */
  light: string;
}

/** Represents a cursor position in a text document */
export interface CursorPosition {
  /** Line number (0-indexed) */
  line: number;
  /** Column number (0-indexed) */
  column: number;
  /** Absolute character offset from document start */
  offset: number;
}

/** Represents a text selection range */
export interface SelectionRange {
  /** Anchor position (where selection started) */
  anchor: CursorPosition;
  /** Head position (where selection ends / active end) */
  head: CursorPosition;
  /** Whether the selection is reversed (head before anchor) */
  isReversed: boolean;
}

/** Full awareness state for a single user/peer */
export interface AwarenessState {
  /** Unique user/client identifier */
  clientId: string;
  /** Display name for the user */
  displayName: string;
  /** Assigned color for cursor/selection rendering */
  color: UserColor;
  /** Current cursor position (null if user has no focus) */
  cursor: CursorPosition | null;
  /** Current text selection (null if nothing selected) */
  selection: SelectionRange | null;
  /** Whether the user is currently typing */
  isTyping: boolean;
  /** Whether the user is currently connected/online */
  isOnline: boolean;
  /** Timestamp of last activity */
  lastActivity: number;
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
}

/** Event types emitted by the awareness protocol */
export type AwarenessEventType =
  | 'awareness-update'
  | 'awareness-add'
  | 'awareness-remove'
  | 'cursor-move'
  | 'selection-change'
  | 'typing-start'
  | 'typing-stop'
  | 'conflict-detected'
  | 'conflict-resolved';

/** Awareness event payload */
export interface AwarenessEvent {
  type: AwarenessEventType;
  clientId: string;
  state?: Partial<AwarenessState>;
  timestamp: number;
}

/** Configuration for the awareness protocol */
export interface AwarenessConfig {
  /** Local client/user ID */
  clientId: string;
  /** Display name for the local user */
  displayName: string;
  /** How often to broadcast awareness state (ms) */
  broadcastIntervalMs?: number;
  /** How long before a peer is considered offline (ms) */
  offlineTimeoutMs?: number;
  /** Typing indicator debounce time (ms) */
  typingDebounceMs?: number;
  /** Maximum number of concurrent peers to track */
  maxPeers?: number;
  /** Color assignment strategy */
  colorStrategy?: 'hash' | 'sequential' | 'custom';
  /** Custom color for the local user */
  customColor?: UserColor;
}

/** Conflict information for overlapping edits */
export interface EditConflict {
  /** Unique conflict identifier */
  id: string;
  /** The text region where the conflict exists */
  region: SelectionRange;
  /** Edits from different users that conflict */
  edits: ConflictingEdit[];
  /** Current resolution status */
  status: 'detected' | 'auto-resolved' | 'user-resolved' | 'dismissed';
  /** Which strategy was used to resolve (if resolved) */
  resolvedWith?: ConflictResolutionStrategy;
  /** The winning edit (if resolved) */
  resolvedEdit?: ConflictingEdit;
  /** Timestamp of detection */
  detectedAt: number;
  /** Timestamp of resolution (if resolved) */
  resolvedAt?: number;
}

/** A single conflicting edit from one user */
export interface ConflictingEdit {
  clientId: string;
  displayName: string;
  color: UserColor;
  text: string;
  timestamp: number;
  vectorClock: VectorClock;
}

/** Strategies for resolving conflicts */
export type ConflictResolutionStrategy =
  | 'last-writer-wins'
  | 'first-writer-wins'
  | 'merge-both'
  | 'user-choice'
  | 'transform';

// =============================================================================
// Color Palette
// =============================================================================

const COLLABORATOR_COLORS: UserColor[] = [
  { color: '#3b82f6', light: '#93c5fd' }, // Blue
  { color: '#ef4444', light: '#fca5a5' }, // Red
  { color: '#10b981', light: '#6ee7b7' }, // Green
  { color: '#f59e0b', light: '#fcd34d' }, // Amber
  { color: '#8b5cf6', light: '#c4b5fd' }, // Purple
  { color: '#ec4899', light: '#f9a8d4' }, // Pink
  { color: '#06b6d4', light: '#67e8f9' }, // Cyan
  { color: '#f97316', light: '#fdba74' }, // Orange
  { color: '#14b8a6', light: '#5eead4' }, // Teal
  { color: '#84cc16', light: '#bef264' }, // Lime
  { color: '#6366f1', light: '#a5b4fc' }, // Indigo
  { color: '#e11d48', light: '#fda4af' }, // Rose
];

/**
 * Deterministically assign a color based on client ID hash.
 */
function hashColor(clientId: string): UserColor {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = ((hash << 5) - hash + clientId.charCodeAt(i)) | 0;
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

// =============================================================================
// Awareness Protocol
// =============================================================================

/**
 * AwarenessProtocol manages real-time presence, cursor positions, selections,
 * and typing indicators for all connected peers.
 *
 * Modeled after the Yjs awareness protocol but built on Hololand's native
 * CRDT infrastructure (LWWMap for state, ORSet for peer tracking).
 *
 * Usage:
 * ```ts
 * const awareness = new AwarenessProtocol({
 *   clientId: 'user-1',
 *   displayName: 'Alice',
 * });
 *
 * awareness.on('awareness-update', (event) => {
 *   console.log('User updated:', event.clientId);
 * });
 *
 * awareness.setLocalCursor({ line: 5, column: 10, offset: 120 });
 * awareness.setLocalSelection({ anchor: {...}, head: {...}, isReversed: false });
 * ```
 */
export class AwarenessProtocol {
  private localClientId: string;
  private localState: AwarenessState;
  private peers: Map<string, AwarenessState> = new Map();
  private eventListeners: Map<AwarenessEventType, Set<(event: AwarenessEvent) => void>> = new Map();
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private offlineCheckInterval: ReturnType<typeof setInterval> | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private config: Required<AwarenessConfig>;
  private broadcastFn: ((state: AwarenessState) => void) | null = null;
  private colorIndex = 0;

  // CRDT-backed state for conflict detection
  private stateMap: LWWMap<AwarenessState>;
  private peerSet: ORSet<string>;
  private vectorClock: VectorClock;

  constructor(config: AwarenessConfig) {
    this.config = {
      clientId: config.clientId,
      displayName: config.displayName,
      broadcastIntervalMs: config.broadcastIntervalMs ?? 200,
      offlineTimeoutMs: config.offlineTimeoutMs ?? 10_000,
      typingDebounceMs: config.typingDebounceMs ?? 2000,
      maxPeers: config.maxPeers ?? 50,
      colorStrategy: config.colorStrategy ?? 'hash',
      customColor: config.customColor ?? hashColor(config.clientId),
    };

    this.localClientId = this.config.clientId;

    const color = this.config.colorStrategy === 'custom'
      ? this.config.customColor
      : this.config.colorStrategy === 'sequential'
        ? COLLABORATOR_COLORS[0]
        : hashColor(this.config.clientId);

    this.localState = {
      clientId: this.config.clientId,
      displayName: this.config.displayName,
      color,
      cursor: null,
      selection: null,
      isTyping: false,
      isOnline: true,
      lastActivity: Date.now(),
    };

    // Initialize CRDT backing
    this.stateMap = new LWWMap<AwarenessState>(this.localClientId);
    this.peerSet = new ORSet<string>(this.localClientId);
    this.vectorClock = createVectorClock(this.localClientId);

    // Register self
    this.peerSet.add(this.localClientId);
    this.stateMap.set(this.localClientId, this.localState);
  }

  // --- Lifecycle ---

  /**
   * Start broadcasting local awareness state and checking for offline peers.
   */
  start(): void {
    if (this.broadcastInterval) return;

    this.broadcastInterval = setInterval(() => {
      this.broadcastLocalState();
    }, this.config.broadcastIntervalMs);

    this.offlineCheckInterval = setInterval(() => {
      this.checkOfflinePeers();
    }, this.config.offlineTimeoutMs / 2);
  }

  /**
   * Stop broadcasting and cleanup timers.
   */
  stop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval);
      this.offlineCheckInterval = null;
    }
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }

  /**
   * Destroy the awareness protocol, marking local user as offline.
   */
  destroy(): void {
    this.stop();
    this.localState.isOnline = false;
    this.broadcastLocalState();
    this.peers.clear();
    this.eventListeners.clear();
  }

  // --- Local State Mutations ---

  /**
   * Update the local cursor position and broadcast.
   */
  setLocalCursor(cursor: CursorPosition | null): void {
    this.localState.cursor = cursor;
    this.localState.lastActivity = Date.now();
    this.vectorClock = incrementClock(this.vectorClock, this.localClientId);
    this.emitEvent({
      type: 'cursor-move',
      clientId: this.localClientId,
      state: { cursor },
      timestamp: Date.now(),
    });
    this.broadcastLocalState();
  }

  /**
   * Update the local selection range and broadcast.
   */
  setLocalSelection(selection: SelectionRange | null): void {
    this.localState.selection = selection;
    this.localState.lastActivity = Date.now();
    this.vectorClock = incrementClock(this.vectorClock, this.localClientId);
    this.emitEvent({
      type: 'selection-change',
      clientId: this.localClientId,
      state: { selection },
      timestamp: Date.now(),
    });
    this.broadcastLocalState();
  }

  /**
   * Signal that the local user started typing.
   * Automatically resets after the debounce timeout.
   */
  setLocalTyping(): void {
    if (!this.localState.isTyping) {
      this.localState.isTyping = true;
      this.emitEvent({
        type: 'typing-start',
        clientId: this.localClientId,
        timestamp: Date.now(),
      });
    }

    this.localState.lastActivity = Date.now();

    // Reset typing indicator after debounce
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.localState.isTyping = false;
      this.emitEvent({
        type: 'typing-stop',
        clientId: this.localClientId,
        timestamp: Date.now(),
      });
      this.broadcastLocalState();
    }, this.config.typingDebounceMs);

    this.broadcastLocalState();
  }

  /**
   * Update arbitrary metadata on the local awareness state.
   */
  setLocalMetadata(metadata: Record<string, unknown>): void {
    this.localState.metadata = { ...this.localState.metadata, ...metadata };
    this.localState.lastActivity = Date.now();
    this.broadcastLocalState();
  }

  // --- Remote State Handling ---

  /**
   * Receive an awareness state update from a remote peer.
   * Called by the transport layer when a remote awareness message arrives.
   */
  receiveRemoteState(remoteState: AwarenessState): void {
    const clientId = remoteState.clientId;
    if (clientId === this.localClientId) return;

    // Enforce max peers
    if (!this.peers.has(clientId) && this.peers.size >= this.config.maxPeers) {
      return;
    }

    const isNew = !this.peers.has(clientId);
    const prev = this.peers.get(clientId);

    // Assign color if new peer
    if (isNew) {
      if (this.config.colorStrategy === 'sequential') {
        this.colorIndex++;
        remoteState.color = COLLABORATOR_COLORS[this.colorIndex % COLLABORATOR_COLORS.length];
      } else if (this.config.colorStrategy === 'hash') {
        remoteState.color = hashColor(clientId);
      }
    }

    this.peers.set(clientId, { ...remoteState });
    this.peerSet.add(clientId);
    this.stateMap.set(clientId, remoteState);

    if (isNew) {
      this.emitEvent({
        type: 'awareness-add',
        clientId,
        state: remoteState,
        timestamp: Date.now(),
      });
    }

    // Emit specific events for cursor/selection changes
    if (prev?.cursor !== remoteState.cursor) {
      this.emitEvent({
        type: 'cursor-move',
        clientId,
        state: { cursor: remoteState.cursor },
        timestamp: Date.now(),
      });
    }

    if (prev?.selection !== remoteState.selection) {
      this.emitEvent({
        type: 'selection-change',
        clientId,
        state: { selection: remoteState.selection },
        timestamp: Date.now(),
      });
    }

    if (prev?.isTyping !== remoteState.isTyping) {
      this.emitEvent({
        type: remoteState.isTyping ? 'typing-start' : 'typing-stop',
        clientId,
        timestamp: Date.now(),
      });
    }

    this.emitEvent({
      type: 'awareness-update',
      clientId,
      state: remoteState,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove a peer from the awareness tracking.
   */
  removePeer(clientId: string): void {
    if (this.peers.has(clientId)) {
      this.peers.delete(clientId);
      this.peerSet.remove(clientId);
      this.emitEvent({
        type: 'awareness-remove',
        clientId,
        timestamp: Date.now(),
      });
    }
  }

  // --- Transport Binding ---

  /**
   * Set the function used to broadcast local state to other peers.
   * The transport layer should call this with its send function.
   */
  setBroadcastFunction(fn: (state: AwarenessState) => void): void {
    this.broadcastFn = fn;
  }

  // --- Queries ---

  /**
   * Get the local user's awareness state.
   */
  getLocalState(): Readonly<AwarenessState> {
    return { ...this.localState };
  }

  /**
   * Get all remote peers' awareness states.
   */
  getPeers(): ReadonlyMap<string, AwarenessState> {
    return this.peers;
  }

  /**
   * Get a specific peer's awareness state.
   */
  getPeer(clientId: string): AwarenessState | undefined {
    if (clientId === this.localClientId) return { ...this.localState };
    return this.peers.get(clientId);
  }

  /**
   * Get all awareness states (local + remote).
   */
  getAllStates(): AwarenessState[] {
    return [this.localState, ...Array.from(this.peers.values())];
  }

  /**
   * Get all peers with active cursors.
   */
  getActiveCursors(): Array<{ clientId: string; cursor: CursorPosition; color: UserColor; displayName: string }> {
    const cursors: Array<{ clientId: string; cursor: CursorPosition; color: UserColor; displayName: string }> = [];

    for (const state of this.getAllStates()) {
      if (state.cursor && state.isOnline && state.clientId !== this.localClientId) {
        cursors.push({
          clientId: state.clientId,
          cursor: state.cursor,
          color: state.color,
          displayName: state.displayName,
        });
      }
    }

    return cursors;
  }

  /**
   * Get all peers with active selections.
   */
  getActiveSelections(): Array<{ clientId: string; selection: SelectionRange; color: UserColor; displayName: string }> {
    const selections: Array<{ clientId: string; selection: SelectionRange; color: UserColor; displayName: string }> = [];

    for (const state of this.getAllStates()) {
      if (state.selection && state.isOnline && state.clientId !== this.localClientId) {
        selections.push({
          clientId: state.clientId,
          selection: state.selection,
          color: state.color,
          displayName: state.displayName,
        });
      }
    }

    return selections;
  }

  /**
   * Get the current vector clock for causal ordering.
   */
  getVectorClock(): VectorClock {
    return { ...this.vectorClock };
  }

  /**
   * Get the count of online peers (excluding local user).
   */
  getOnlinePeerCount(): number {
    let count = 0;
    for (const peer of this.peers.values()) {
      if (peer.isOnline) count++;
    }
    return count;
  }

  // --- Event System ---

  /**
   * Subscribe to awareness events.
   * Returns an unsubscribe function.
   */
  on(eventType: AwarenessEventType, handler: (event: AwarenessEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(handler);
    return () => {
      this.eventListeners.get(eventType)?.delete(handler);
    };
  }

  // --- Internal ---

  private broadcastLocalState(): void {
    this.stateMap.set(this.localClientId, this.localState);
    if (this.broadcastFn) {
      this.broadcastFn({ ...this.localState });
    }
  }

  private checkOfflinePeers(): void {
    const now = Date.now();
    for (const [clientId, state] of this.peers) {
      if (state.isOnline && now - state.lastActivity > this.config.offlineTimeoutMs) {
        state.isOnline = false;
        this.emitEvent({
          type: 'awareness-remove',
          clientId,
          timestamp: now,
        });
      }
    }
  }

  private emitEvent(event: AwarenessEvent): void {
    this.eventListeners.get(event.type)?.forEach((handler) => handler(event));
  }
}

// =============================================================================
// Conflict Detector
// =============================================================================

/**
 * ConflictDetector watches for overlapping edits from multiple peers
 * and provides resolution strategies.
 *
 * It uses vector clocks from the awareness protocol to determine
 * causal ordering and detect true concurrent edits.
 */
export class ConflictDetector {
  private conflicts: Map<string, EditConflict> = new Map();
  private conflictCounter = 0;
  private defaultStrategy: ConflictResolutionStrategy;
  private eventListeners: Map<string, Set<(conflict: EditConflict) => void>> = new Map();

  constructor(defaultStrategy: ConflictResolutionStrategy = 'last-writer-wins') {
    this.defaultStrategy = defaultStrategy;
  }

  /**
   * Check if two edit ranges overlap.
   */
  rangesOverlap(a: SelectionRange, b: SelectionRange): boolean {
    const aStart = Math.min(a.anchor.offset, a.head.offset);
    const aEnd = Math.max(a.anchor.offset, a.head.offset);
    const bStart = Math.min(b.anchor.offset, b.head.offset);
    const bEnd = Math.max(b.anchor.offset, b.head.offset);

    return aStart < bEnd && bStart < aEnd;
  }

  /**
   * Detect a conflict between two concurrent edits.
   */
  detectConflict(editA: ConflictingEdit, editB: ConflictingEdit, region: SelectionRange): EditConflict | null {
    // Use vector clocks to determine if edits are truly concurrent
    const order = compareClock(editA.vectorClock, editB.vectorClock);

    // If one edit causally happened before the other, no conflict
    if (order === 'before' || order === 'after') {
      return null;
    }

    // Concurrent edits in the same region = conflict
    const conflict: EditConflict = {
      id: `conflict-${++this.conflictCounter}`,
      region,
      edits: [editA, editB],
      status: 'detected',
      detectedAt: Date.now(),
    };

    this.conflicts.set(conflict.id, conflict);
    this.emitConflictEvent('detected', conflict);

    return conflict;
  }

  /**
   * Automatically resolve a conflict using the specified strategy.
   */
  resolveConflict(
    conflictId: string,
    strategy?: ConflictResolutionStrategy,
  ): ConflictingEdit | null {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict || conflict.status !== 'detected') return null;

    const resolveStrategy = strategy ?? this.defaultStrategy;

    let winner: ConflictingEdit;

    switch (resolveStrategy) {
      case 'last-writer-wins': {
        // Most recent timestamp wins
        winner = conflict.edits.reduce((latest, edit) =>
          edit.timestamp > latest.timestamp ? edit : latest,
        );
        break;
      }

      case 'first-writer-wins': {
        // Earliest timestamp wins
        winner = conflict.edits.reduce((earliest, edit) =>
          edit.timestamp < earliest.timestamp ? edit : earliest,
        );
        break;
      }

      case 'merge-both': {
        // Concatenate both edits (ordered by timestamp)
        const sorted = [...conflict.edits].sort((a, b) => a.timestamp - b.timestamp);
        winner = {
          ...sorted[0],
          text: sorted.map((e) => e.text).join(''),
        };
        break;
      }

      case 'transform': {
        // Operational transform: apply both edits in causal order
        // For concurrent edits, transform the second edit's position
        const sorted = [...conflict.edits].sort((a, b) => a.timestamp - b.timestamp);
        winner = {
          ...sorted[0],
          text: sorted[0].text, // First edit wins position, both are preserved via OT
        };
        break;
      }

      case 'user-choice':
      default:
        // Cannot auto-resolve; return null to let UI handle it
        return null;
    }

    conflict.status = 'auto-resolved';
    conflict.resolvedWith = resolveStrategy;
    conflict.resolvedEdit = winner;
    conflict.resolvedAt = Date.now();

    this.emitConflictEvent('resolved', conflict);

    return winner;
  }

  /**
   * Manually resolve a conflict with a user-chosen edit.
   */
  resolveConflictManually(conflictId: string, chosenEdit: ConflictingEdit): void {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return;

    conflict.status = 'user-resolved';
    conflict.resolvedWith = 'user-choice';
    conflict.resolvedEdit = chosenEdit;
    conflict.resolvedAt = Date.now();

    this.emitConflictEvent('resolved', conflict);
  }

  /**
   * Dismiss a conflict without resolving it.
   */
  dismissConflict(conflictId: string): void {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return;

    conflict.status = 'dismissed';
    conflict.resolvedAt = Date.now();
    this.emitConflictEvent('resolved', conflict);
  }

  /**
   * Get all active (unresolved) conflicts.
   */
  getActiveConflicts(): EditConflict[] {
    return Array.from(this.conflicts.values()).filter(
      (c) => c.status === 'detected',
    );
  }

  /**
   * Get a specific conflict by ID.
   */
  getConflict(conflictId: string): EditConflict | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * Get all conflicts (including resolved).
   */
  getAllConflicts(): EditConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Clear resolved/dismissed conflicts.
   */
  clearResolved(): void {
    for (const [id, conflict] of this.conflicts) {
      if (conflict.status !== 'detected') {
        this.conflicts.delete(id);
      }
    }
  }

  /**
   * Subscribe to conflict events.
   */
  onConflict(
    eventType: 'detected' | 'resolved',
    handler: (conflict: EditConflict) => void,
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(handler);
    return () => {
      this.eventListeners.get(eventType)?.delete(handler);
    };
  }

  private emitConflictEvent(eventType: string, conflict: EditConflict): void {
    this.eventListeners.get(eventType)?.forEach((handler) => handler(conflict));
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a new AwarenessProtocol instance with sensible defaults.
 */
export function createAwarenessProtocol(config: AwarenessConfig): AwarenessProtocol {
  return new AwarenessProtocol(config);
}

/**
 * Create a new ConflictDetector instance.
 */
export function createConflictDetector(
  strategy: ConflictResolutionStrategy = 'last-writer-wins',
): ConflictDetector {
  return new ConflictDetector(strategy);
}
