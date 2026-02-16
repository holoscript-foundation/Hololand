/**
 * @hololand/backend — RoomService
 *
 * Application-level room lifecycle management with search, filter,
 * categories, tags, and persistence-ready hooks. Transport-agnostic —
 * wraps any room CRUD backend.
 *
 * Usage:
 *   const rooms = new RoomService({ maxRooms: 200 });
 *   const room = rooms.create({ name: 'Arena', hostId: 'peer-1', category: 'pvp' });
 *   rooms.join(room.id, 'peer-2');
 *   rooms.search({ category: 'pvp', hasSpace: true });
 *   rooms.onEvent((e) => console.log(e));
 */

// ============================================================================
// Types
// ============================================================================

export type RoomStatus = 'open' | 'locked' | 'closed' | 'full';

export interface RoomRecord {
  id: string;
  name: string;
  hostId: string;
  status: RoomStatus;
  isPrivate: boolean;
  passwordHash: string | null;
  maxPlayers: number;
  playerIds: Set<string>;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface CreateRoomOptions {
  name: string;
  hostId: string;
  maxPlayers?: number;
  isPrivate?: boolean;
  password?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RoomSearchQuery {
  /** Filter by name substring (case-insensitive). */
  name?: string;
  /** Filter by category. */
  category?: string;
  /** Filter rooms that have at least one of these tags. */
  tags?: string[];
  /** Only rooms with available space. */
  hasSpace?: boolean;
  /** Only public rooms. Default: true */
  publicOnly?: boolean;
  /** Only open rooms. Default: true */
  openOnly?: boolean;
  /** Sort by field. Default: 'createdAt' */
  sortBy?: 'name' | 'playerCount' | 'createdAt';
  /** Sort direction. Default: 'desc' */
  sortOrder?: 'asc' | 'desc';
  /** Maximum results. Default: 50 */
  limit?: number;
  /** Offset for pagination. Default: 0 */
  offset?: number;
}

export interface RoomSearchResult {
  rooms: RoomPublicInfo[];
  total: number;
  limit: number;
  offset: number;
}

/** Sanitized room info safe for clients. */
export interface RoomPublicInfo {
  id: string;
  name: string;
  hostId: string;
  status: RoomStatus;
  isPrivate: boolean;
  playerCount: number;
  maxPlayers: number;
  category: string;
  tags: string[];
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface RoomServiceConfig {
  /** Maximum rooms. Default: 500 */
  maxRooms?: number;
  /** Maximum players per room. Default: 50 */
  defaultMaxPlayers?: number;
  /** Auto-delete rooms when empty. Default: true */
  autoDeleteEmpty?: boolean;
  /** Grace period before deleting empty rooms (ms). Default: 0 */
  emptyGracePeriod?: number;
}

export type RoomEventType =
  | 'room_created'
  | 'room_deleted'
  | 'room_status_changed'
  | 'player_joined'
  | 'player_left'
  | 'host_changed'
  | 'room_updated';

export interface RoomEvent {
  type: RoomEventType;
  roomId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

type RoomEventCallback = (event: RoomEvent) => void;

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CONFIG: Required<RoomServiceConfig> = {
  maxRooms: 500,
  defaultMaxPlayers: 50,
  autoDeleteEmpty: true,
  emptyGracePeriod: 0,
};

// ============================================================================
// RoomService
// ============================================================================

export class RoomService {
  private config: Required<RoomServiceConfig>;
  private rooms: Map<string, RoomRecord> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId → roomId
  private listeners: Set<RoomEventCallback> = new Set();
  private emptyTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private nextId = 1;

  constructor(config: RoomServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Room CRUD
  // ============================================================================

  /** Create a new room. The host is automatically added as a player. */
  create(opts: CreateRoomOptions): RoomRecord {
    if (this.rooms.size >= this.config.maxRooms) {
      throw new Error(`Maximum room limit reached (${this.config.maxRooms})`);
    }

    // Player must leave current room first
    const currentRoomId = this.playerRooms.get(opts.hostId);
    if (currentRoomId) {
      this.leave(currentRoomId, opts.hostId);
    }

    const now = Date.now();
    const room: RoomRecord = {
      id: this.generateId(),
      name: opts.name,
      hostId: opts.hostId,
      status: 'open',
      isPrivate: opts.isPrivate ?? false,
      passwordHash: opts.password ? this.hashPassword(opts.password) : null,
      maxPlayers: opts.maxPlayers ?? this.config.defaultMaxPlayers,
      playerIds: new Set([opts.hostId]),
      category: opts.category ?? 'general',
      tags: opts.tags ?? [],
      createdAt: now,
      updatedAt: now,
      metadata: opts.metadata ?? {},
    };

    this.rooms.set(room.id, room);
    this.playerRooms.set(opts.hostId, room.id);

    this.emit({
      type: 'room_created',
      roomId: room.id,
      timestamp: now,
      data: { name: room.name, hostId: room.hostId },
    });

    return room;
  }

  /** Delete a room, removing all players first. */
  delete(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove all players
    for (const playerId of room.playerIds) {
      this.playerRooms.delete(playerId);
    }
    room.playerIds.clear();

    // Clear any grace timer
    this.clearEmptyTimer(roomId);

    this.rooms.delete(roomId);

    this.emit({
      type: 'room_deleted',
      roomId,
      timestamp: Date.now(),
      data: { name: room.name },
    });

    return true;
  }

  /** Update room metadata, tags, category, or name. */
  update(roomId: string, updates: Partial<Pick<RoomRecord, 'name' | 'category' | 'tags' | 'metadata' | 'maxPlayers' | 'isPrivate'>>): RoomRecord | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    if (updates.name !== undefined) room.name = updates.name;
    if (updates.category !== undefined) room.category = updates.category;
    if (updates.tags !== undefined) room.tags = updates.tags;
    if (updates.metadata !== undefined) room.metadata = { ...room.metadata, ...updates.metadata };
    if (updates.maxPlayers !== undefined) room.maxPlayers = updates.maxPlayers;
    if (updates.isPrivate !== undefined) room.isPrivate = updates.isPrivate;
    room.updatedAt = Date.now();

    this.emit({
      type: 'room_updated',
      roomId,
      timestamp: room.updatedAt,
      data: { updates },
    });

    return room;
  }

  // ============================================================================
  // Join / Leave
  // ============================================================================

  /** Join a player into a room. */
  join(roomId: string, playerId: string, password?: string): RoomRecord {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.status === 'closed') throw new Error('Room is closed');
    if (room.status === 'locked') throw new Error('Room is locked');
    if (room.playerIds.size >= room.maxPlayers) throw new Error('Room is full');
    if (room.passwordHash && !this.verifyPassword(password ?? '', room.passwordHash)) {
      throw new Error('Invalid password');
    }

    // Leave current room if in one
    const currentRoomId = this.playerRooms.get(playerId);
    if (currentRoomId && currentRoomId !== roomId) {
      this.leave(currentRoomId, playerId);
    }

    // Already in this room
    if (room.playerIds.has(playerId)) return room;

    room.playerIds.add(playerId);
    room.updatedAt = Date.now();
    this.playerRooms.set(playerId, roomId);

    // Cancel empty grace timer
    this.clearEmptyTimer(roomId);

    // Update status if full
    if (room.playerIds.size >= room.maxPlayers && room.status === 'open') {
      room.status = 'full';
      this.emit({
        type: 'room_status_changed',
        roomId,
        timestamp: Date.now(),
        data: { from: 'open', to: 'full' },
      });
    }

    this.emit({
      type: 'player_joined',
      roomId,
      timestamp: room.updatedAt,
      data: { playerId },
    });

    return room;
  }

  /** Remove a player from a room. */
  leave(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (!room.playerIds.has(playerId)) return;

    room.playerIds.delete(playerId);
    room.updatedAt = Date.now();
    this.playerRooms.delete(playerId);

    this.emit({
      type: 'player_left',
      roomId,
      timestamp: room.updatedAt,
      data: { playerId },
    });

    // Transition from full → open
    if (room.status === 'full' && room.playerIds.size < room.maxPlayers) {
      room.status = 'open';
      this.emit({
        type: 'room_status_changed',
        roomId,
        timestamp: Date.now(),
        data: { from: 'full', to: 'open' },
      });
    }

    // Handle host leaving
    if (playerId === room.hostId && room.playerIds.size > 0) {
      const newHostId = room.playerIds.values().next().value!;
      room.hostId = newHostId;
      this.emit({
        type: 'host_changed',
        roomId,
        timestamp: Date.now(),
        data: { previousHostId: playerId, newHostId },
      });
    }

    // Handle empty room
    if (room.playerIds.size === 0 && this.config.autoDeleteEmpty) {
      if (this.config.emptyGracePeriod > 0) {
        this.scheduleEmptyDelete(roomId);
      } else {
        this.delete(roomId);
      }
    }
  }

  /** Kick a player from a room. Only the host can kick. */
  kick(roomId: string, playerId: string, requesterId: string, reason = 'Kicked'): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.hostId !== requesterId) return false;
    if (!room.playerIds.has(playerId)) return false;
    if (playerId === requesterId) return false; // Can't kick yourself

    this.leave(roomId, playerId);
    return true;
  }

  // ============================================================================
  // Room Status
  // ============================================================================

  /** Lock a room (prevent new joins). */
  lockRoom(roomId: string, requesterId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== requesterId) return false;
    if (room.status === 'closed') return false;

    const oldStatus = room.status;
    room.status = 'locked';
    room.updatedAt = Date.now();

    this.emit({
      type: 'room_status_changed',
      roomId,
      timestamp: room.updatedAt,
      data: { from: oldStatus, to: 'locked' },
    });

    return true;
  }

  /** Unlock a room (allow joins again). */
  unlockRoom(roomId: string, requesterId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== requesterId) return false;
    if (room.status !== 'locked') return false;

    const newStatus = room.playerIds.size >= room.maxPlayers ? 'full' : 'open';
    room.status = newStatus as RoomStatus;
    room.updatedAt = Date.now();

    this.emit({
      type: 'room_status_changed',
      roomId,
      timestamp: room.updatedAt,
      data: { from: 'locked', to: newStatus },
    });

    return true;
  }

  /** Close a room permanently. No new joins, existing players stay. */
  closeRoom(roomId: string, requesterId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== requesterId) return false;

    const oldStatus = room.status;
    room.status = 'closed';
    room.updatedAt = Date.now();

    this.emit({
      type: 'room_status_changed',
      roomId,
      timestamp: room.updatedAt,
      data: { from: oldStatus, to: 'closed' },
    });

    return true;
  }

  // ============================================================================
  // Search & Query
  // ============================================================================

  /** Search rooms with filters, sorting, and pagination. */
  search(query: RoomSearchQuery = {}): RoomSearchResult {
    const publicOnly = query.publicOnly ?? true;
    const openOnly = query.openOnly ?? true;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    let results = Array.from(this.rooms.values());

    // Filter
    if (publicOnly) results = results.filter((r) => !r.isPrivate);
    if (openOnly) results = results.filter((r) => r.status === 'open');
    if (query.hasSpace) results = results.filter((r) => r.playerIds.size < r.maxPlayers);
    if (query.name) {
      const nameLower = query.name.toLowerCase();
      results = results.filter((r) => r.name.toLowerCase().includes(nameLower));
    }
    if (query.category) results = results.filter((r) => r.category === query.category);
    if (query.tags && query.tags.length > 0) {
      results = results.filter((r) => query.tags!.some((t) => r.tags.includes(t)));
    }

    const total = results.length;

    // Sort
    results.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'playerCount') cmp = a.playerIds.size - b.playerIds.size;
      else cmp = a.createdAt - b.createdAt;
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    // Paginate
    results = results.slice(offset, offset + limit);

    return {
      rooms: results.map((r) => this.toPublicInfo(r)),
      total,
      limit,
      offset,
    };
  }

  /** Get a room by ID. */
  getRoom(roomId: string): RoomRecord | undefined {
    return this.rooms.get(roomId);
  }

  /** Get public info for a room. */
  getRoomPublicInfo(roomId: string): RoomPublicInfo | undefined {
    const room = this.rooms.get(roomId);
    return room ? this.toPublicInfo(room) : undefined;
  }

  /** Get the room a player is currently in. */
  getPlayerRoom(playerId: string): RoomRecord | undefined {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /** Get player IDs in a room. */
  getPlayers(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.playerIds) : [];
  }

  /** Get total room count. */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /** Get rooms by category. */
  getRoomsByCategory(category: string): RoomPublicInfo[] {
    return Array.from(this.rooms.values())
      .filter((r) => r.category === category)
      .map((r) => this.toPublicInfo(r));
  }

  /** Get all distinct categories. */
  getCategories(): string[] {
    const cats = new Set<string>();
    for (const room of this.rooms.values()) {
      cats.add(room.category);
    }
    return Array.from(cats);
  }

  /** Handle a player disconnecting — removes from any room. */
  handlePlayerDisconnect(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (roomId) {
      this.leave(roomId, playerId);
    }
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: RoomEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.offEvent(callback);
  }

  offEvent(callback: RoomEventCallback): void {
    this.listeners.delete(callback);
  }

  private emit(event: RoomEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Don't let listener errors crash the service
      }
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Clean up all rooms and timers. */
  destroy(): void {
    for (const timer of this.emptyTimers.values()) {
      clearTimeout(timer);
    }
    this.emptyTimers.clear();
    this.rooms.clear();
    this.playerRooms.clear();
    this.listeners.clear();
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private toPublicInfo(room: RoomRecord): RoomPublicInfo {
    return {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      status: room.status,
      isPrivate: room.isPrivate,
      playerCount: room.playerIds.size,
      maxPlayers: room.maxPlayers,
      category: room.category,
      tags: room.tags,
      createdAt: room.createdAt,
      metadata: room.metadata,
    };
  }

  private generateId(): string {
    return `room_${Date.now()}_${(this.nextId++).toString(36)}`;
  }

  /** Simple hash for room passwords. NOT crypto-secure — use bcrypt in production. */
  private hashPassword(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const chr = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `simple:${hash.toString(16)}`;
  }

  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  private scheduleEmptyDelete(roomId: string): void {
    this.clearEmptyTimer(roomId);
    const timer = setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (room && room.playerIds.size === 0) {
        this.delete(roomId);
      }
      this.emptyTimers.delete(roomId);
    }, this.config.emptyGracePeriod);
    this.emptyTimers.set(roomId, timer);
  }

  private clearEmptyTimer(roomId: string): void {
    const timer = this.emptyTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.emptyTimers.delete(roomId);
    }
  }
}
