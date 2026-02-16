/**
 * StateAuthority
 *
 * Centralized authority management for networked entities.
 * Determines who controls each object and resolves ownership conflicts.
 *
 * Authority Models:
 * - **Server**: Host/server always has final authority (most secure)
 * - **Owner**: The spawning client owns the entity until transfer
 * - **Shared**: Any client can claim authority (grab-to-own pattern)
 *
 * Conflict Resolution:
 * When two clients simultaneously claim the same object, the authority
 * uses a priority system: existing owner > earlier timestamp > lower peer ID.
 *
 * @version 1.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

export type AuthorityMode = 'server' | 'owner' | 'shared';
export type ConflictStrategy = 'priority' | 'first_wins' | 'host_wins';

export interface AuthorityEntry {
  /** Network entity ID */
  entityId: string;
  /** Current authority holder (peer ID) */
  owner: string | null;
  /** Authority mode for this entity */
  mode: AuthorityMode;
  /** When authority was last changed */
  lastChanged: number;
  /** Whether ownership can be transferred */
  transferable: boolean;
  /** Lock state — prevents transfers while locked */
  locked: boolean;
  /** Pending claim requests */
  pendingClaims: AuthorityClaim[];
}

export interface AuthorityClaim {
  /** Requesting peer ID */
  peerId: string;
  /** Claim timestamp */
  timestamp: number;
  /** Priority override (e.g., from grab events) */
  priority: number;
  /** Callback to resolve the claim */
  resolve?: (granted: boolean) => void;
}

export interface AuthorityConfig {
  /** Default authority mode for new entities */
  defaultMode: AuthorityMode;
  /** How to resolve conflicting claims */
  conflictStrategy: ConflictStrategy;
  /** Timeout for pending claims in ms */
  claimTimeout: number;
  /** ID of the host/server peer (wins conflicts in host_wins mode) */
  hostPeerId: string | null;
  /** Local peer ID */
  localPeerId: string;
}

export type AuthorityEvent =
  | { type: 'authority_granted'; entityId: string; peerId: string }
  | { type: 'authority_denied'; entityId: string; peerId: string; reason: string }
  | { type: 'authority_released'; entityId: string; previousOwner: string }
  | { type: 'authority_transferred'; entityId: string; from: string; to: string }
  | { type: 'authority_conflict'; entityId: string; claimants: string[] };

type AuthorityCallback = (event: AuthorityEvent) => void;

// =============================================================================
// STATE AUTHORITY
// =============================================================================

export class StateAuthority {
  private config: AuthorityConfig;
  private entries: Map<string, AuthorityEntry> = new Map();
  private listeners: AuthorityCallback[] = [];

  constructor(config: Partial<AuthorityConfig> = {}) {
    this.config = {
      defaultMode: config.defaultMode || 'owner',
      conflictStrategy: config.conflictStrategy || 'priority',
      claimTimeout: config.claimTimeout || 5000,
      hostPeerId: config.hostPeerId || null,
      localPeerId: config.localPeerId || '',
    };
  }

  // ===========================================================================
  // Entry Management
  // ===========================================================================

  /**
   * Register an entity for authority tracking.
   */
  register(
    entityId: string,
    owner: string | null,
    options: {
      mode?: AuthorityMode;
      transferable?: boolean;
    } = {},
  ): AuthorityEntry {
    const entry: AuthorityEntry = {
      entityId,
      owner,
      mode: options.mode || this.config.defaultMode,
      lastChanged: Date.now(),
      transferable: options.transferable ?? true,
      locked: false,
      pendingClaims: [],
    };

    this.entries.set(entityId, entry);
    return entry;
  }

  /**
   * Unregister an entity.
   */
  unregister(entityId: string): void {
    const entry = this.entries.get(entityId);
    if (entry) {
      // Deny all pending claims
      for (const claim of entry.pendingClaims) {
        claim.resolve?.(false);
      }
      this.entries.delete(entityId);
    }
  }

  // ===========================================================================
  // Authority Operations
  // ===========================================================================

  /**
   * Request authority over an entity.
   * Returns true if immediately granted, false if denied or pending.
   */
  requestAuthority(entityId: string, peerId: string, priority: number = 1): boolean {
    const entry = this.entries.get(entityId);
    if (!entry) return false;

    // Already the owner
    if (entry.owner === peerId) return true;

    // Not transferable
    if (!entry.transferable) {
      this.emit({
        type: 'authority_denied',
        entityId,
        peerId,
        reason: 'not_transferable',
      });
      return false;
    }

    // Locked
    if (entry.locked) {
      this.emit({
        type: 'authority_denied',
        entityId,
        peerId,
        reason: 'locked',
      });
      return false;
    }

    // Mode-specific handling
    switch (entry.mode) {
      case 'server':
        return this.handleServerAuthority(entry, peerId, priority);

      case 'owner':
        return this.handleOwnerAuthority(entry, peerId, priority);

      case 'shared':
        return this.handleSharedAuthority(entry, peerId, priority);

      default:
        return false;
    }
  }

  /**
   * Release authority over an entity.
   */
  releaseAuthority(entityId: string, peerId: string): void {
    const entry = this.entries.get(entityId);
    if (!entry || entry.owner !== peerId) return;

    const previousOwner = entry.owner;
    entry.owner = null;
    entry.lastChanged = Date.now();

    this.emit({
      type: 'authority_released',
      entityId,
      previousOwner,
    });

    // Process pending claims
    this.processPendingClaims(entry);
  }

  /**
   * Force transfer authority (server/host only).
   */
  forceTransfer(entityId: string, newOwner: string): boolean {
    const entry = this.entries.get(entityId);
    if (!entry) return false;

    const previousOwner = entry.owner;
    entry.owner = newOwner;
    entry.lastChanged = Date.now();

    if (previousOwner && previousOwner !== newOwner) {
      this.emit({
        type: 'authority_transferred',
        entityId,
        from: previousOwner,
        to: newOwner,
      });
    } else {
      this.emit({
        type: 'authority_granted',
        entityId,
        peerId: newOwner,
      });
    }

    return true;
  }

  /**
   * Lock an entity to prevent ownership changes.
   */
  lock(entityId: string): void {
    const entry = this.entries.get(entityId);
    if (entry) entry.locked = true;
  }

  /**
   * Unlock an entity.
   */
  unlock(entityId: string): void {
    const entry = this.entries.get(entityId);
    if (entry) {
      entry.locked = false;
      this.processPendingClaims(entry);
    }
  }

  // ===========================================================================
  // Queries
  // ===========================================================================

  /** Get the authority entry for an entity */
  getEntry(entityId: string): AuthorityEntry | undefined {
    return this.entries.get(entityId);
  }

  /** Get current owner of an entity */
  getOwner(entityId: string): string | null {
    return this.entries.get(entityId)?.owner || null;
  }

  /** Check if a peer has authority over an entity */
  hasAuthority(entityId: string, peerId: string): boolean {
    const entry = this.entries.get(entityId);
    return entry?.owner === peerId;
  }

  /** Check if local peer has authority */
  isLocalAuthority(entityId: string): boolean {
    return this.hasAuthority(entityId, this.config.localPeerId);
  }

  /** Get all entities owned by a peer */
  getEntitiesOwnedBy(peerId: string): string[] {
    const result: string[] = [];
    for (const [id, entry] of this.entries) {
      if (entry.owner === peerId) result.push(id);
    }
    return result;
  }

  /** Get all entities with no owner */
  getUnownedEntities(): string[] {
    const result: string[] = [];
    for (const [id, entry] of this.entries) {
      if (!entry.owner) result.push(id);
    }
    return result;
  }

  /** Get total entity count */
  getEntityCount(): number {
    return this.entries.size;
  }

  // ===========================================================================
  // Peer Management
  // ===========================================================================

  /**
   * Handle a peer disconnecting — release all their entities.
   */
  handlePeerDisconnect(peerId: string): void {
    for (const entry of this.entries.values()) {
      if (entry.owner === peerId) {
        const previousOwner = entry.owner;
        entry.owner = null;
        entry.lastChanged = Date.now();

        this.emit({
          type: 'authority_released',
          entityId: entry.entityId,
          previousOwner,
        });

        // Try to assign to pending claimants
        this.processPendingClaims(entry);
      }

      // Remove disconnected peer's pending claims
      entry.pendingClaims = entry.pendingClaims.filter((c) => {
        if (c.peerId === peerId) {
          c.resolve?.(false);
          return false;
        }
        return true;
      });
    }
  }

  /**
   * Set the host peer ID (for host_wins conflict resolution).
   */
  setHostPeer(peerId: string): void {
    this.config.hostPeerId = peerId;
  }

  // ===========================================================================
  // Internal: Authority Mode Handlers
  // ===========================================================================

  private handleServerAuthority(
    entry: AuthorityEntry,
    peerId: string,
    priority: number,
  ): boolean {
    // In server mode, only host can grant authority
    if (peerId === this.config.hostPeerId) {
      return this.grantAuthority(entry, peerId);
    }

    // Non-host clients must request from host
    this.addPendingClaim(entry, peerId, priority);
    return false;
  }

  private handleOwnerAuthority(
    entry: AuthorityEntry,
    peerId: string,
    priority: number,
  ): boolean {
    // If no current owner, grant immediately
    if (!entry.owner) {
      return this.grantAuthority(entry, peerId);
    }

    // Owner mode requires explicit transfer from current owner
    this.addPendingClaim(entry, peerId, priority);
    return false;
  }

  private handleSharedAuthority(
    entry: AuthorityEntry,
    peerId: string,
    _priority: number,
  ): boolean {
    // Shared mode: if unclaimed, grant immediately
    if (!entry.owner) {
      return this.grantAuthority(entry, peerId);
    }

    // If someone else owns it, resolve the conflict
    return this.resolveConflict(entry, peerId);
  }

  // ===========================================================================
  // Internal: Conflict Resolution
  // ===========================================================================

  private resolveConflict(entry: AuthorityEntry, challenger: string): boolean {
    switch (this.config.conflictStrategy) {
      case 'host_wins':
        if (challenger === this.config.hostPeerId) {
          return this.transferAuthority(entry, challenger);
        }
        this.emit({
          type: 'authority_denied',
          entityId: entry.entityId,
          peerId: challenger,
          reason: 'host_priority',
        });
        return false;

      case 'first_wins':
        // Current owner keeps it
        this.emit({
          type: 'authority_denied',
          entityId: entry.entityId,
          peerId: challenger,
          reason: 'first_wins',
        });
        return false;

      case 'priority':
      default:
        // In shared mode with priority strategy, newer claim wins
        // (supports grab-to-own pattern)
        return this.transferAuthority(entry, challenger);
    }
  }

  // ===========================================================================
  // Internal: Grant/Transfer
  // ===========================================================================

  private grantAuthority(entry: AuthorityEntry, peerId: string): boolean {
    entry.owner = peerId;
    entry.lastChanged = Date.now();

    this.emit({
      type: 'authority_granted',
      entityId: entry.entityId,
      peerId,
    });

    return true;
  }

  private transferAuthority(entry: AuthorityEntry, newOwner: string): boolean {
    const previousOwner = entry.owner!;
    entry.owner = newOwner;
    entry.lastChanged = Date.now();

    this.emit({
      type: 'authority_transferred',
      entityId: entry.entityId,
      from: previousOwner,
      to: newOwner,
    });

    return true;
  }

  private addPendingClaim(
    entry: AuthorityEntry,
    peerId: string,
    priority: number,
  ): void {
    // Don't duplicate
    if (entry.pendingClaims.some((c) => c.peerId === peerId)) return;

    const claim: AuthorityClaim = {
      peerId,
      timestamp: Date.now(),
      priority,
    };

    entry.pendingClaims.push(claim);

    // Auto-timeout
    setTimeout(() => {
      const idx = entry.pendingClaims.indexOf(claim);
      if (idx !== -1) {
        entry.pendingClaims.splice(idx, 1);
        claim.resolve?.(false);
      }
    }, this.config.claimTimeout);
  }

  private processPendingClaims(entry: AuthorityEntry): void {
    if (entry.pendingClaims.length === 0 || entry.owner || entry.locked) return;

    // Sort by priority (desc), then timestamp (asc)
    entry.pendingClaims.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

    // Grant to highest priority claimant
    const winner = entry.pendingClaims.shift()!;
    this.grantAuthority(entry, winner.peerId);
    winner.resolve?.(true);

    // Deny rest
    for (const claim of entry.pendingClaims) {
      claim.resolve?.(false);
      this.emit({
        type: 'authority_denied',
        entityId: entry.entityId,
        peerId: claim.peerId,
        reason: 'outprioritized',
      });
    }
    entry.pendingClaims = [];
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  onEvent(callback: AuthorityCallback): void {
    this.listeners.push(callback);
  }

  offEvent(callback: AuthorityCallback): void {
    const idx = this.listeners.indexOf(callback);
    if (idx !== -1) this.listeners.splice(idx, 1);
  }

  private emit(event: AuthorityEvent): void {
    for (const cb of this.listeners) {
      cb(event);
    }
  }
}

export default StateAuthority;
