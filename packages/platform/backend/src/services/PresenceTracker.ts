/**
 * @hololand/backend — PresenceTracker
 *
 * Tracks online/offline status of peers, heartbeat monitoring,
 * room location, and presence queries. Transport-agnostic —
 * works with any WebSocket/WebRTC/polling backend.
 *
 * Usage:
 *   const presence = new PresenceTracker({ heartbeatTimeout: 30_000 });
 *   presence.connect('peer-1', { displayName: 'Alice' });
 *   presence.heartbeat('peer-1');
 *   presence.setRoom('peer-1', 'room-abc');
 *   presence.onEvent((event) => console.log(event));
 */

// ============================================================================
// Types
// ============================================================================

export type PresenceStatus = 'online' | 'idle' | 'away' | 'offline';

export interface PeerPresence {
  peerId: string;
  displayName: string;
  status: PresenceStatus;
  roomId: string | null;
  connectedAt: number;
  lastHeartbeat: number;
  lastActivity: number;
  metadata: Record<string, unknown>;
}

export interface PresenceConfig {
  /** How long before a peer is considered timed-out (ms). Default: 30000 */
  heartbeatTimeout?: number;
  /** How often the reaper checks for stale peers (ms). Default: 10000 */
  reaperInterval?: number;
  /** Time before transitioning from online → idle (ms). Default: 60000 */
  idleThreshold?: number;
  /** Time before transitioning from idle → away (ms). Default: 300000 */
  awayThreshold?: number;
  /** Maximum number of concurrent peers. Default: 10000 */
  maxPeers?: number;
}

export type PresenceEventType =
  | 'peer_connected'
  | 'peer_disconnected'
  | 'peer_timeout'
  | 'peer_status_changed'
  | 'peer_room_changed';

export interface PresenceEvent {
  type: PresenceEventType;
  peerId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface PresenceSnapshot {
  totalOnline: number;
  totalIdle: number;
  totalAway: number;
  roomCounts: Map<string, number>;
  peers: PeerPresence[];
}

type PresenceEventCallback = (event: PresenceEvent) => void;

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CONFIG: Required<PresenceConfig> = {
  heartbeatTimeout: 30_000,
  reaperInterval: 10_000,
  idleThreshold: 60_000,
  awayThreshold: 300_000,
  maxPeers: 10_000,
};

// ============================================================================
// PresenceTracker
// ============================================================================

export class PresenceTracker {
  private config: Required<PresenceConfig>;
  private peers: Map<string, PeerPresence> = new Map();
  private roomIndex: Map<string, Set<string>> = new Map(); // roomId → peerIds
  private listeners: Set<PresenceEventCallback> = new Set();
  private reaperTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(config: PresenceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start the heartbeat reaper. Call once on server boot. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.reaperTimer = setInterval(() => this.reap(), this.config.reaperInterval);
  }

  /** Stop the reaper and clean up. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.reaperTimer) {
      clearInterval(this.reaperTimer);
      this.reaperTimer = null;
    }
  }

  /** Remove all peers and stop. */
  destroy(): void {
    this.stop();
    this.peers.clear();
    this.roomIndex.clear();
    this.listeners.clear();
  }

  // ============================================================================
  // Peer Management
  // ============================================================================

  /** Register a new peer as online. */
  connect(peerId: string, opts: { displayName?: string; metadata?: Record<string, unknown> } = {}): PeerPresence {
    if (this.peers.size >= this.config.maxPeers) {
      throw new Error(`Maximum peer limit reached (${this.config.maxPeers})`);
    }

    // If already connected, treat as reconnect
    const existing = this.peers.get(peerId);
    if (existing) {
      existing.status = 'online';
      existing.lastHeartbeat = Date.now();
      existing.lastActivity = Date.now();
      if (opts.displayName) existing.displayName = opts.displayName;
      if (opts.metadata) existing.metadata = { ...existing.metadata, ...opts.metadata };
      this.emit({
        type: 'peer_connected',
        peerId,
        timestamp: Date.now(),
        data: { reconnect: true },
      });
      return existing;
    }

    const now = Date.now();
    const peer: PeerPresence = {
      peerId,
      displayName: opts.displayName ?? peerId,
      status: 'online',
      roomId: null,
      connectedAt: now,
      lastHeartbeat: now,
      lastActivity: now,
      metadata: opts.metadata ?? {},
    };

    this.peers.set(peerId, peer);
    this.emit({
      type: 'peer_connected',
      peerId,
      timestamp: now,
      data: {},
    });

    return peer;
  }

  /** Explicitly disconnect a peer. */
  disconnect(peerId: string, reason = 'explicit'): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    // Remove from room index
    if (peer.roomId) {
      this.removeFromRoomIndex(peerId, peer.roomId);
    }

    peer.status = 'offline';
    this.peers.delete(peerId);

    this.emit({
      type: 'peer_disconnected',
      peerId,
      timestamp: Date.now(),
      data: { reason },
    });
  }

  /** Record a heartbeat from a peer. Resets timeout. */
  heartbeat(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    if (!peer) return false;

    peer.lastHeartbeat = Date.now();

    // If peer was idle/away, bring them back online on heartbeat
    if (peer.status !== 'online') {
      const oldStatus = peer.status;
      peer.status = 'online';
      this.emit({
        type: 'peer_status_changed',
        peerId,
        timestamp: Date.now(),
        data: { from: oldStatus, to: 'online' },
      });
    }

    return true;
  }

  /** Record activity from a peer (chat message, movement, etc.). */
  activity(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.lastActivity = Date.now();

    if (peer.status !== 'online') {
      const oldStatus = peer.status;
      peer.status = 'online';
      this.emit({
        type: 'peer_status_changed',
        peerId,
        timestamp: Date.now(),
        data: { from: oldStatus, to: 'online' },
      });
    }
  }

  // ============================================================================
  // Room Location
  // ============================================================================

  /** Set which room a peer is in. Pass null to leave all rooms. */
  setRoom(peerId: string, roomId: string | null): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const previousRoomId = peer.roomId;

    // Remove from previous room
    if (previousRoomId) {
      this.removeFromRoomIndex(peerId, previousRoomId);
    }

    // Add to new room
    peer.roomId = roomId;
    if (roomId) {
      if (!this.roomIndex.has(roomId)) {
        this.roomIndex.set(roomId, new Set());
      }
      this.roomIndex.get(roomId)!.add(peerId);
    }

    this.emit({
      type: 'peer_room_changed',
      peerId,
      timestamp: Date.now(),
      data: { from: previousRoomId, to: roomId },
    });
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /** Get a single peer's presence. */
  getPeer(peerId: string): PeerPresence | undefined {
    return this.peers.get(peerId);
  }

  /** Check if a peer is currently tracked (any status except offline). */
  isOnline(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    return peer !== undefined && peer.status !== 'offline';
  }

  /** Get all peers in a specific room. */
  getPeersInRoom(roomId: string): PeerPresence[] {
    const peerIds = this.roomIndex.get(roomId);
    if (!peerIds) return [];
    return Array.from(peerIds)
      .map((id) => this.peers.get(id))
      .filter((p): p is PeerPresence => p !== undefined);
  }

  /** Get the count of peers in a specific room. */
  getRoomCount(roomId: string): number {
    return this.roomIndex.get(roomId)?.size ?? 0;
  }

  /** Get all occupied room IDs. */
  getOccupiedRooms(): string[] {
    return Array.from(this.roomIndex.entries())
      .filter(([, peers]) => peers.size > 0)
      .map(([roomId]) => roomId);
  }

  /** Get peers filtered by status. */
  getPeersByStatus(status: PresenceStatus): PeerPresence[] {
    return Array.from(this.peers.values()).filter((p) => p.status === status);
  }

  /** Get all tracked peers. */
  getAllPeers(): PeerPresence[] {
    return Array.from(this.peers.values());
  }

  /** Get total count of tracked peers. */
  getPeerCount(): number {
    return this.peers.size;
  }

  /** Get a full presence snapshot. */
  getSnapshot(): PresenceSnapshot {
    const peers = this.getAllPeers();
    const roomCounts = new Map<string, number>();

    for (const [roomId, peerIds] of this.roomIndex) {
      if (peerIds.size > 0) {
        roomCounts.set(roomId, peerIds.size);
      }
    }

    return {
      totalOnline: peers.filter((p) => p.status === 'online').length,
      totalIdle: peers.filter((p) => p.status === 'idle').length,
      totalAway: peers.filter((p) => p.status === 'away').length,
      roomCounts,
      peers,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  /** Subscribe to presence events. */
  onEvent(callback: PresenceEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.offEvent(callback);
  }

  /** Unsubscribe from presence events. */
  offEvent(callback: PresenceEventCallback): void {
    this.listeners.delete(callback);
  }

  private emit(event: PresenceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Don't let listener errors crash the tracker
      }
    }
  }

  // ============================================================================
  // Internal: Heartbeat Reaper
  // ============================================================================

  /** Check for stale peers and update statuses. Called on interval. */
  private reap(): void {
    const now = Date.now();

    for (const [peerId, peer] of this.peers) {
      // Check heartbeat timeout
      const heartbeatAge = now - peer.lastHeartbeat;
      if (heartbeatAge >= this.config.heartbeatTimeout) {
        // Remove from room index
        if (peer.roomId) {
          this.removeFromRoomIndex(peerId, peer.roomId);
        }
        this.peers.delete(peerId);
        this.emit({
          type: 'peer_timeout',
          peerId,
          timestamp: now,
          data: { lastHeartbeat: peer.lastHeartbeat, age: heartbeatAge },
        });
        continue;
      }

      // Check idle/away transitions based on last activity
      const activityAge = now - peer.lastActivity;
      if (peer.status === 'online' && activityAge >= this.config.idleThreshold) {
        peer.status = 'idle';
        this.emit({
          type: 'peer_status_changed',
          peerId,
          timestamp: now,
          data: { from: 'online', to: 'idle' },
        });
      } else if (peer.status === 'idle' && activityAge >= this.config.awayThreshold) {
        peer.status = 'away';
        this.emit({
          type: 'peer_status_changed',
          peerId,
          timestamp: now,
          data: { from: 'idle', to: 'away' },
        });
      }
    }
  }

  /** Exposed for testing — run one reap cycle manually. */
  _reapNow(): void {
    this.reap();
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private removeFromRoomIndex(peerId: string, roomId: string): void {
    const peerIds = this.roomIndex.get(roomId);
    if (peerIds) {
      peerIds.delete(peerId);
      if (peerIds.size === 0) {
        this.roomIndex.delete(roomId);
      }
    }
  }
}
