/**
 * @hololand/backend — ServerAntiCheat
 *
 * Server-side anti-cheat enforcement for multiplayer integrity.
 * Validates position updates, rate-limits actions, tracks violations,
 * manages a per-player trust score, and enforces penalties.
 *
 * Architecture:
 *   Client message (position/state/action)
 *       ↓
 *   ServerAntiCheat.validate*()
 *       ├── speed check
 *       ├── teleport check
 *       ├── rate limiter
 *       ├── state ownership check
 *       └── violation recorded → trust score updated → penalty emitted
 *
 * Trust Score Model:
 *   - Starts at 100 (fully trusted)
 *   - Each violation deducts severity × violationWeight points
 *   - Recovers at trustRecoveryRate points/sec during clean play
 *   - Below warnThreshold → 'penalty_warn' event
 *   - Below kickThreshold → 'penalty_kick' event
 *   - Below banThreshold  → 'penalty_ban' event + auto-ban
 *
 * Transport-agnostic — emits events; the lobby/transport layer
 * actually disconnects or notifies players.
 *
 * @version 1.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type ViolationType =
  | 'speed'
  | 'teleport'
  | 'rate_limit'
  | 'state_ownership'
  | 'invalid_state'
  | 'custom';

export type PenaltyAction = 'warn' | 'mute' | 'kick' | 'ban';

export interface Violation {
  type: ViolationType;
  severity: number; // 1-10
  description: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface Penalty {
  action: PenaltyAction;
  reason: string;
  violationType: ViolationType;
  timestamp: number;
  /** Duration in ms (for temp bans/mutes). Omitted = permanent. */
  duration?: number;
  /** Expiry timestamp for temp penalties. */
  expiresAt?: number;
}

export interface PlayerRecord {
  peerId: string;
  position: Vec3;
  lastPositionUpdate: number;
  hasReceivedFirstUpdate: boolean;
  violations: Violation[];
  penalties: Penalty[];
  trustScore: number; // 0-100
  actionWindows: Map<string, ActionWindow>;
  registeredAt: number;
  banned: boolean;
  muted: boolean;
  bannedUntil?: number;
  mutedUntil?: number;
}

export interface PlayerRecordInfo {
  peerId: string;
  position: Vec3;
  trustScore: number;
  violations: number;
  penalties: number;
  banned: boolean;
  muted: boolean;
  registeredAt: number;
}

interface ActionWindow {
  count: number;
  windowStart: number;
}

export interface PositionValidation {
  valid: boolean;
  violation?: Violation;
  /** If invalid, the last known good position. */
  correctedPosition?: Vec3;
}

export interface ActionValidation {
  allowed: boolean;
  violation?: Violation;
}

export interface StateValidation {
  valid: boolean;
  violation?: Violation;
}

export type AntiCheatEventType =
  | 'violation'
  | 'penalty_warn'
  | 'penalty_mute'
  | 'penalty_kick'
  | 'penalty_ban'
  | 'penalty_expired'
  | 'trust_recovered'
  | 'player_pardoned';

export interface AntiCheatEvent {
  type: AntiCheatEventType;
  peerId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

type AntiCheatCallback = (event: AntiCheatEvent) => void;

/** Callback to check if a peer owns a given object. */
export type OwnershipCheckFn = (peerId: string, objectId: string) => boolean;

export interface ServerAntiCheatConfig {
  /** Maximum movement speed in units/sec. Default: 20 */
  maxSpeed?: number;
  /** Maximum instant teleport distance. Default: 100 */
  maxTeleportDistance?: number;
  /** Global max actions per second. Default: 30 */
  maxActionsPerSecond?: number;
  /** Per-action-type rate limits (overrides global). */
  actionRateLimits?: Record<string, number>;
  /** Trust score points deducted = severity × this. Default: 5 */
  violationWeight?: number;
  /** Trust recovery rate (points/sec). Default: 0.5 */
  trustRecoveryRate?: number;
  /** Trust below this → warn. Default: 50 */
  warnThreshold?: number;
  /** Trust below this → kick. Default: 25 */
  kickThreshold?: number;
  /** Trust below this → auto-ban. Default: 10 */
  banThreshold?: number;
  /** Max violations to keep per player. Default: 100 */
  maxViolationHistory?: number;
  /** Default temp-ban duration in ms. Default: 300_000 (5 min) */
  tempBanDuration?: number;
  /** Default temp-mute duration in ms. Default: 60_000 (1 min) */
  tempMuteDuration?: number;
  /** Speed tolerance multiplier for jitter. Default: 1.5 */
  positionTolerance?: number;
}

export interface AntiCheatStats {
  players: number;
  banned: number;
  muted: number;
  totalViolations: number;
  avgTrustScore: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULTS: Required<ServerAntiCheatConfig> = {
  maxSpeed: 20,
  maxTeleportDistance: 100,
  maxActionsPerSecond: 30,
  actionRateLimits: {},
  violationWeight: 5,
  trustRecoveryRate: 0.5,
  warnThreshold: 50,
  kickThreshold: 25,
  banThreshold: 10,
  maxViolationHistory: 100,
  tempBanDuration: 300_000,
  tempMuteDuration: 60_000,
  positionTolerance: 1.5,
};

// =============================================================================
// SERVER ANTI-CHEAT
// =============================================================================

export class ServerAntiCheat {
  private config: Required<ServerAntiCheatConfig>;
  private players: Map<string, PlayerRecord> = new Map();
  private listeners: Set<AntiCheatCallback> = new Set();
  private ownershipCheck: OwnershipCheckFn | null = null;
  private lastTickTime: number = Date.now();

  constructor(config: ServerAntiCheatConfig = {}) {
    this.config = { ...DEFAULTS, ...config };
  }

  // ===========================================================================
  // Player Registration
  // ===========================================================================

  /** Register a player for anti-cheat monitoring. */
  registerPlayer(peerId: string, position: Vec3 = { x: 0, y: 0, z: 0 }): void {
    if (this.players.has(peerId)) return;

    const now = Date.now();
    this.players.set(peerId, {
      peerId,
      position: { ...position },
      lastPositionUpdate: now,
      hasReceivedFirstUpdate: false,
      violations: [],
      penalties: [],
      trustScore: 100,
      actionWindows: new Map(),
      registeredAt: now,
      banned: false,
      muted: false,
    });
  }

  /** Unregister a player. */
  unregisterPlayer(peerId: string): void {
    this.players.delete(peerId);
  }

  /** Check if a player is registered. */
  isRegistered(peerId: string): boolean {
    return this.players.has(peerId);
  }

  /** Get a read-only summary of a player's record. */
  getPlayer(peerId: string): PlayerRecordInfo | undefined {
    const p = this.players.get(peerId);
    if (!p) return undefined;
    return {
      peerId: p.peerId,
      position: { ...p.position },
      trustScore: p.trustScore,
      violations: p.violations.length,
      penalties: p.penalties.length,
      banned: p.banned,
      muted: p.muted,
      registeredAt: p.registeredAt,
    };
  }

  /** Get all registered player IDs. */
  getPlayerIds(): string[] {
    return [...this.players.keys()];
  }

  // ===========================================================================
  // Ownership Check
  // ===========================================================================

  /** Set a callback to verify state ownership. */
  setOwnershipCheck(fn: OwnershipCheckFn): void {
    this.ownershipCheck = fn;
  }

  // ===========================================================================
  // Position Validation
  // ===========================================================================

  /**
   * Validate a position update from a client.
   * Returns valid:true if acceptable, or a violation + corrected position.
   */
  validatePosition(peerId: string, newPosition: Vec3): PositionValidation {
    const player = this.players.get(peerId);
    if (!player) return { valid: false };
    if (player.banned) return { valid: false, correctedPosition: { ...player.position } };

    const now = Date.now();
    const dtMs = now - player.lastPositionUpdate;
    const dt = Math.max(dtMs / 1000, 0.001); // seconds, min 1ms
    const isFirstUpdate = !player.hasReceivedFirstUpdate;
    player.hasReceivedFirstUpdate = true;

    const dx = newPosition.x - player.position.x;
    const dy = newPosition.y - player.position.y;
    const dz = newPosition.z - player.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // --- Teleport detection ---
    if (distance > this.config.maxTeleportDistance) {
      const violation: Violation = {
        type: 'teleport',
        severity: 8,
        description: `Teleport detected: ${distance.toFixed(1)} units (max: ${this.config.maxTeleportDistance})`,
        timestamp: now,
      };
      this.recordViolation(player, violation);
      return { valid: false, violation, correctedPosition: { ...player.position } };
    }

    // --- Speed detection (skip on first update after registration) ---
    if (!isFirstUpdate) {
      const speed = distance / dt;
      const maxAllowed = this.config.maxSpeed * this.config.positionTolerance;
      if (speed > maxAllowed) {
        const violation: Violation = {
          type: 'speed',
          severity: 4,
          description: `Speed violation: ${speed.toFixed(1)} u/s (max: ${maxAllowed.toFixed(1)})`,
          timestamp: now,
        };
        this.recordViolation(player, violation);
        return { valid: false, violation, correctedPosition: { ...player.position } };
      }
    }

    // --- Accept update ---
    player.position = { ...newPosition };
    player.lastPositionUpdate = now;
    return { valid: true };
  }

  // ===========================================================================
  // Action Rate Limiting
  // ===========================================================================

  /**
   * Check if an action is allowed under rate limits.
   * @param actionType Optional action type for per-action limits.
   */
  validateAction(peerId: string, actionType?: string): ActionValidation {
    const player = this.players.get(peerId);
    if (!player) return { allowed: false };
    if (player.banned) return { allowed: false };

    const key = actionType ?? '__global__';
    const limit = (actionType && this.config.actionRateLimits[actionType])
      ?? this.config.maxActionsPerSecond;

    const now = Date.now();
    let window = player.actionWindows.get(key);

    if (!window) {
      window = { count: 0, windowStart: now };
      player.actionWindows.set(key, window);
    }

    // Reset window if expired
    if (now - window.windowStart > 1000) {
      window.count = 1;
      window.windowStart = now;
      return { allowed: true };
    }

    window.count++;

    if (window.count > limit) {
      const violation: Violation = {
        type: 'rate_limit',
        severity: 3,
        description: `Rate limit exceeded for '${key}': ${window.count}/${limit} per second`,
        timestamp: now,
      };
      this.recordViolation(player, violation);
      return { allowed: false, violation };
    }

    return { allowed: true };
  }

  // ===========================================================================
  // State Validation
  // ===========================================================================

  /**
   * Validate a state mutation attempt.
   * Checks ownership (if ownershipCheck is configured) and legitimacy.
   */
  validateStateUpdate(
    peerId: string,
    objectId: string,
    updates?: Record<string, unknown>
  ): StateValidation {
    const player = this.players.get(peerId);
    if (!player) return { valid: false };
    if (player.banned) return { valid: false };

    // Ownership check
    if (this.ownershipCheck && !this.ownershipCheck(peerId, objectId)) {
      const violation: Violation = {
        type: 'state_ownership',
        severity: 6,
        description: `Unauthorized state update: peer '${peerId}' does not own object '${objectId}'`,
        timestamp: Date.now(),
        data: { objectId, updates },
      };
      this.recordViolation(player, violation);
      return { valid: false, violation };
    }

    return { valid: true };
  }

  // ===========================================================================
  // Manual Violation Reporting
  // ===========================================================================

  /**
   * Report a custom violation for a player.
   * Use this for game-specific cheat detection (impossible scores, etc.).
   */
  reportViolation(
    peerId: string,
    type: ViolationType,
    severity: number,
    description: string,
    data?: Record<string, unknown>
  ): boolean {
    const player = this.players.get(peerId);
    if (!player) return false;

    const violation: Violation = {
      type,
      severity: Math.max(1, Math.min(10, severity)),
      description,
      timestamp: Date.now(),
      data,
    };
    this.recordViolation(player, violation);
    return true;
  }

  // ===========================================================================
  // Penalties — Manual
  // ===========================================================================

  /** Ban a player (permanent or temp). */
  ban(peerId: string, duration?: number): boolean {
    const player = this.players.get(peerId);
    if (!player) return false;

    const now = Date.now();
    const dur = duration ?? undefined;
    player.banned = true;
    player.bannedUntil = dur ? now + dur : undefined;
    player.trustScore = 0;

    const penalty: Penalty = {
      action: 'ban',
      reason: 'Manual ban',
      violationType: 'custom',
      timestamp: now,
      duration: dur,
      expiresAt: dur ? now + dur : undefined,
    };
    player.penalties.push(penalty);

    this.emit({
      type: 'penalty_ban',
      peerId,
      timestamp: now,
      data: { manual: true, duration: dur, permanent: !dur },
    });

    return true;
  }

  /** Unban a player. */
  unban(peerId: string): boolean {
    const player = this.players.get(peerId);
    if (!player) return false;

    player.banned = false;
    player.bannedUntil = undefined;
    return true;
  }

  /** Mute a player (permanent or temp). */
  mute(peerId: string, duration?: number): boolean {
    const player = this.players.get(peerId);
    if (!player) return false;

    const now = Date.now();
    const dur = duration ?? undefined;
    player.muted = true;
    player.mutedUntil = dur ? now + dur : undefined;

    const penalty: Penalty = {
      action: 'mute',
      reason: 'Manual mute',
      violationType: 'custom',
      timestamp: now,
      duration: dur,
      expiresAt: dur ? now + dur : undefined,
    };
    player.penalties.push(penalty);

    this.emit({
      type: 'penalty_mute',
      peerId,
      timestamp: now,
      data: { manual: true, duration: dur, permanent: !dur },
    });

    return true;
  }

  /** Unmute a player. */
  unmute(peerId: string): boolean {
    const player = this.players.get(peerId);
    if (!player) return false;

    player.muted = false;
    player.mutedUntil = undefined;
    return true;
  }

  /** Pardon a player — clear violations, restore trust to 100. */
  pardon(peerId: string): boolean {
    const player = this.players.get(peerId);
    if (!player) return false;

    player.violations = [];
    player.trustScore = 100;
    player.banned = false;
    player.muted = false;
    player.bannedUntil = undefined;
    player.mutedUntil = undefined;

    this.emit({
      type: 'player_pardoned',
      peerId,
      timestamp: Date.now(),
      data: {},
    });

    return true;
  }

  // ===========================================================================
  // Queries
  // ===========================================================================

  /** Check if a player is banned. */
  isBanned(peerId: string): boolean {
    const player = this.players.get(peerId);
    if (!player) return false;
    return player.banned;
  }

  /** Check if a player is muted. */
  isMuted(peerId: string): boolean {
    const player = this.players.get(peerId);
    if (!player) return false;
    return player.muted;
  }

  /** Get a player's trust score. */
  getTrustScore(peerId: string): number {
    return this.players.get(peerId)?.trustScore ?? -1;
  }

  /** Get violation history for a player. */
  getViolations(peerId: string): Violation[] {
    return this.players.get(peerId)?.violations.slice() ?? [];
  }

  /** Get violation count for a player. */
  getViolationCount(peerId: string): number {
    return this.players.get(peerId)?.violations.length ?? 0;
  }

  /** Get penalty history for a player. */
  getPenalties(peerId: string): Penalty[] {
    return this.players.get(peerId)?.penalties.slice() ?? [];
  }

  // ===========================================================================
  // Tick — Trust Recovery & Penalty Expiry
  // ===========================================================================

  /**
   * Called periodically to:
   * 1. Recover trust for well-behaving players
   * 2. Expire temporary bans/mutes
   */
  tick(): void {
    const now = Date.now();
    const elapsed = (now - this.lastTickTime) / 1000; // seconds
    this.lastTickTime = now;

    if (elapsed <= 0) return;

    for (const player of this.players.values()) {
      // --- Expire temp bans ---
      if (player.banned && player.bannedUntil && now >= player.bannedUntil) {
        player.banned = false;
        player.bannedUntil = undefined;
        this.emit({
          type: 'penalty_expired',
          peerId: player.peerId,
          timestamp: now,
          data: { penalty: 'ban' },
        });
      }

      // --- Expire temp mutes ---
      if (player.muted && player.mutedUntil && now >= player.mutedUntil) {
        player.muted = false;
        player.mutedUntil = undefined;
        this.emit({
          type: 'penalty_expired',
          peerId: player.peerId,
          timestamp: now,
          data: { penalty: 'mute' },
        });
      }

      // --- Trust recovery ---
      if (!player.banned && player.trustScore < 100) {
        const oldScore = player.trustScore;
        player.trustScore = Math.min(100, player.trustScore + this.config.trustRecoveryRate * elapsed);

        // Emit recovery event when crossing back above warn threshold
        if (oldScore < this.config.warnThreshold && player.trustScore >= this.config.warnThreshold) {
          this.emit({
            type: 'trust_recovered',
            peerId: player.peerId,
            timestamp: now,
            data: { trustScore: player.trustScore },
          });
        }
      }
    }
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  /** Subscribe to anti-cheat events. Returns unsubscribe function. */
  onEvent(callback: AntiCheatCallback): () => void {
    this.listeners.add(callback);
    return () => this.offEvent(callback);
  }

  /** Unsubscribe from events. */
  offEvent(callback: AntiCheatCallback): void {
    this.listeners.delete(callback);
  }

  // ===========================================================================
  // Stats
  // ===========================================================================

  /** Get aggregate anti-cheat statistics. */
  getStats(): AntiCheatStats {
    let banned = 0;
    let muted = 0;
    let totalViolations = 0;
    let totalTrust = 0;

    for (const p of this.players.values()) {
      if (p.banned) banned++;
      if (p.muted) muted++;
      totalViolations += p.violations.length;
      totalTrust += p.trustScore;
    }

    const count = this.players.size;
    return {
      players: count,
      banned,
      muted,
      totalViolations,
      avgTrustScore: count > 0 ? Math.round((totalTrust / count) * 100) / 100 : 0,
    };
  }

  /** Get config (read-only copy). */
  getConfig(): Required<ServerAntiCheatConfig> {
    return { ...this.config, actionRateLimits: { ...this.config.actionRateLimits } };
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /** Destroy — clear all state. */
  destroy(): void {
    this.players.clear();
    this.listeners.clear();
    this.ownershipCheck = null;
  }

  // ===========================================================================
  // Internals
  // ===========================================================================

  /** Record a violation and update trust score + enforce penalties. */
  private recordViolation(player: PlayerRecord, violation: Violation): void {
    // Add violation
    player.violations.push(violation);

    // Trim history
    if (player.violations.length > this.config.maxViolationHistory) {
      player.violations = player.violations.slice(-this.config.maxViolationHistory);
    }

    // Deduct trust
    const deduction = violation.severity * this.config.violationWeight;
    const oldScore = player.trustScore;
    player.trustScore = Math.max(0, player.trustScore - deduction);

    // Emit violation event
    this.emit({
      type: 'violation',
      peerId: player.peerId,
      timestamp: violation.timestamp,
      data: {
        violationType: violation.type,
        severity: violation.severity,
        description: violation.description,
        trustScore: player.trustScore,
        deduction,
        ...(violation.data ?? {}),
      },
    });

    // Check threshold crossings
    this.checkThresholds(player, oldScore);
  }

  /** Check if trust score crossed penalty thresholds. */
  private checkThresholds(player: PlayerRecord, oldScore: number): void {
    const now = Date.now();

    // Ban threshold
    if (
      player.trustScore < this.config.banThreshold &&
      oldScore >= this.config.banThreshold &&
      !player.banned
    ) {
      player.banned = true;
      player.bannedUntil = now + this.config.tempBanDuration;

      const penalty: Penalty = {
        action: 'ban',
        reason: `Trust score dropped below ${this.config.banThreshold}`,
        violationType: player.violations[player.violations.length - 1]?.type ?? 'custom',
        timestamp: now,
        duration: this.config.tempBanDuration,
        expiresAt: now + this.config.tempBanDuration,
      };
      player.penalties.push(penalty);

      this.emit({
        type: 'penalty_ban',
        peerId: player.peerId,
        timestamp: now,
        data: {
          trustScore: player.trustScore,
          duration: this.config.tempBanDuration,
          permanent: false,
        },
      });
      return; // Ban supersedes kick/warn
    }

    // Kick threshold
    if (
      player.trustScore < this.config.kickThreshold &&
      oldScore >= this.config.kickThreshold
    ) {
      const penalty: Penalty = {
        action: 'kick',
        reason: `Trust score dropped below ${this.config.kickThreshold}`,
        violationType: player.violations[player.violations.length - 1]?.type ?? 'custom',
        timestamp: now,
      };
      player.penalties.push(penalty);

      this.emit({
        type: 'penalty_kick',
        peerId: player.peerId,
        timestamp: now,
        data: { trustScore: player.trustScore },
      });
      return; // Kick supersedes warn
    }

    // Warn threshold
    if (
      player.trustScore < this.config.warnThreshold &&
      oldScore >= this.config.warnThreshold
    ) {
      const penalty: Penalty = {
        action: 'warn',
        reason: `Trust score dropped below ${this.config.warnThreshold}`,
        violationType: player.violations[player.violations.length - 1]?.type ?? 'custom',
        timestamp: now,
      };
      player.penalties.push(penalty);

      this.emit({
        type: 'penalty_warn',
        peerId: player.peerId,
        timestamp: now,
        data: { trustScore: player.trustScore },
      });
    }
  }

  /** Emit an event to all listeners. */
  private emit(event: AntiCheatEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // swallow listener errors
      }
    }
  }
}
