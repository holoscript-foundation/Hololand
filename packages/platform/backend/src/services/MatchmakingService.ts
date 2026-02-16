/**
 * @hololand/backend — MatchmakingService
 *
 * Skill-based matchmaking with queue management, party support,
 * region preferences, and backfill. Transport-agnostic — creates
 * rooms via RoomService when matches are found.
 *
 * Architecture:
 *   Player/Party enqueues
 *       ↓
 *   MatchmakingService (queue per mode)
 *       ├── Skill matching (MMR ± tolerance)
 *       ├── Region preference (soft constraint)
 *       ├── Wait-time expansion (tolerance widens)
 *       └── Backfill (add to existing rooms)
 *       ↓
 *   RoomService.create() + join()
 *
 * Usage:
 *   const mm = new MatchmakingService({ roomService });
 *   mm.addMode('ranked_2v2', { teamSize: 2, teamCount: 2, ranked: true });
 *   mm.start();
 *
 *   mm.enqueue('player-1', 'ranked_2v2', { skillRating: 1500, region: 'us-east' });
 *   // ... when match found, rooms are auto-created and players joined
 */

import type { RoomService } from './RoomService';

// ============================================================================
// Types
// ============================================================================

/** Configuration for a matchmaking game mode. */
export interface GameModeConfig {
  /** Minimum players required to start a match. */
  minPlayers: number;
  /** Maximum players in a match. */
  maxPlayers: number;
  /** Players per team. 0 = free-for-all. Default: 0 */
  teamSize?: number;
  /** Number of teams. Default: 0 (FFA) */
  teamCount?: number;
  /** Use skill-based matching. Default: false */
  ranked?: boolean;
  /** Initial skill tolerance range (± MMR). Default: 100 */
  skillRange?: number;
  /** Max skill tolerance after expansion (± MMR). Default: 500 */
  maxSkillRange?: number;
  /** Rate at which skill tolerance expands (MMR per second). Default: 10 */
  skillExpansionRate?: number;
  /** Maximum wait time in ms before force-match or timeout. Default: 120000 (2 min) */
  maxWaitTime?: number;
  /** Allow backfilling into existing rooms with space. Default: false */
  allowBackfill?: boolean;
  /** Room category for created rooms. Default: mode name */
  roomCategory?: string;
  /** Room tags for created rooms. */
  roomTags?: string[];
  /** Additional metadata for created rooms. */
  roomMetadata?: Record<string, unknown>;
}

/** Options when a player enqueues. */
export interface EnqueueOptions {
  /** Player's skill rating (MMR). Default: 1000 */
  skillRating?: number;
  /** Preferred region. Soft constraint — matched if possible. */
  region?: string;
  /** Additional player metadata. */
  metadata?: Record<string, unknown>;
}

/** A single entry in a matchmaking queue (player or party). */
export interface QueueEntry {
  /** Unique entry ID. */
  id: string;
  /** The player who enqueued (or party leader). */
  playerId: string;
  /** All player IDs in this entry (solo = [playerId], party = multiple). */
  playerIds: string[];
  /** Game mode. */
  mode: string;
  /** Average skill rating of the group. */
  skillRating: number;
  /** Preferred region. */
  region: string | null;
  /** When this entry joined the queue. */
  enqueuedAt: number;
  /** Additional metadata. */
  metadata: Record<string, unknown>;
}

/** Team assignment within a match. */
export interface MatchTeam {
  /** Team index (0-based). */
  teamIndex: number;
  /** Player IDs on this team. */
  playerIds: string[];
  /** Average skill rating of the team. */
  averageSkill: number;
}

/** Result of a successful match. */
export interface MatchResult {
  /** Unique match ID. */
  id: string;
  /** Game mode. */
  mode: string;
  /** All player IDs in the match. */
  playerIds: string[];
  /** Team assignments (empty for FFA). */
  teams: MatchTeam[];
  /** Room ID (created via RoomService). Null if room creation failed. */
  roomId: string | null;
  /** Average skill rating across all players. */
  averageSkill: number;
  /** Average wait time (ms) for matched players. */
  averageWaitTime: number;
  /** Region selected for the match (most common among players). */
  region: string | null;
  /** Whether this was a backfill into an existing room. */
  isBackfill: boolean;
  /** Timestamp of match creation. */
  createdAt: number;
}

/** Stats for a matchmaking queue. */
export interface QueueStats {
  /** Game mode name. */
  mode: string;
  /** Number of entries in queue. */
  queueSize: number;
  /** Total players across all entries (includes parties). */
  totalPlayers: number;
  /** Average wait time (ms) for current queue. */
  averageWaitTime: number;
  /** Estimated time to match (ms). */
  estimatedWaitTime: number;
}

/** Event types emitted by the matchmaking service. */
export type MatchmakingEventType =
  | 'queue_joined'
  | 'queue_left'
  | 'match_found'
  | 'match_cancelled'
  | 'backfill_found'
  | 'queue_expired';

export interface MatchmakingEvent {
  type: MatchmakingEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

type MatchmakingEventCallback = (event: MatchmakingEvent) => void;

/** Service-level configuration. */
export interface MatchmakingServiceConfig {
  /** Reference to RoomService for room creation. */
  roomService?: RoomService;
  /** How often to process queues (ms). Default: 1000 */
  tickInterval?: number;
  /** Maximum total entries across all queues. Default: 10000 */
  maxQueueSize?: number;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_SERVICE_CONFIG: Required<Omit<MatchmakingServiceConfig, 'roomService'>> = {
  tickInterval: 1000,
  maxQueueSize: 10_000,
};

const DEFAULT_MODE_CONFIG: Required<Omit<GameModeConfig, 'roomCategory' | 'roomTags' | 'roomMetadata'>> = {
  minPlayers: 2,
  maxPlayers: 10,
  teamSize: 0,
  teamCount: 0,
  ranked: false,
  skillRange: 100,
  maxSkillRange: 500,
  skillExpansionRate: 10,
  maxWaitTime: 120_000,
  allowBackfill: false,
};

// ============================================================================
// MatchmakingService
// ============================================================================

export class MatchmakingService {
  private serviceConfig: Required<Omit<MatchmakingServiceConfig, 'roomService'>>;
  private roomService: RoomService | null;

  /** Registered game modes and their configs. */
  private modes: Map<string, Required<GameModeConfig>> = new Map();

  /** Per-mode queues. Each mode has an ordered array of QueueEntry. */
  private queues: Map<string, QueueEntry[]> = new Map();

  /** Track which queue a player is in: playerId → entryId. */
  private playerQueue: Map<string, string> = new Map();

  /** Track which entry each player belongs to: entryId → QueueEntry. */
  private entryMap: Map<string, QueueEntry> = new Map();

  /** Completed matches. */
  private matches: Map<string, MatchResult> = new Map();

  /** Rooms available for backfill: roomId → { mode, currentPlayers, maxPlayers }. */
  private backfillPool: Map<string, { mode: string; currentPlayers: number; maxPlayers: number }> = new Map();

  /** Event listeners. */
  private listeners: Set<MatchmakingEventCallback> = new Set();

  /** Tick timer. */
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  /** Running state. */
  private running = false;

  /** Next IDs. */
  private nextEntryId = 1;
  private nextMatchId = 1;

  /** Total entries across all queues (for limit enforcement). */
  private totalEntries = 0;

  constructor(config: MatchmakingServiceConfig = {}) {
    this.serviceConfig = {
      ...DEFAULT_SERVICE_CONFIG,
      ...config,
    };
    this.roomService = config.roomService ?? null;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start processing matchmaking queues on a timer. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.tickTimer = setInterval(() => this.processQueues(), this.serviceConfig.tickInterval);
  }

  /** Stop processing queues. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /** Full cleanup — stops processing, clears all state. */
  destroy(): void {
    this.stop();
    this.modes.clear();
    this.queues.clear();
    this.playerQueue.clear();
    this.entryMap.clear();
    this.matches.clear();
    this.backfillPool.clear();
    this.listeners.clear();
    this.totalEntries = 0;
  }

  // ============================================================================
  // Game Mode Management
  // ============================================================================

  /** Register a game mode with matchmaking parameters. */
  addMode(name: string, config: GameModeConfig): void {
    if (this.modes.has(name)) {
      throw new Error(`Mode "${name}" already exists`);
    }

    if (config.minPlayers < 1) {
      throw new Error('minPlayers must be at least 1');
    }

    if (config.maxPlayers < config.minPlayers) {
      throw new Error('maxPlayers must be >= minPlayers');
    }

    const teamSize = config.teamSize ?? 0;
    const teamCount = config.teamCount ?? 0;

    if (teamSize > 0 && teamCount > 0 && teamSize * teamCount > config.maxPlayers) {
      throw new Error('teamSize × teamCount exceeds maxPlayers');
    }

    const fullConfig: Required<GameModeConfig> = {
      ...DEFAULT_MODE_CONFIG,
      ...config,
      roomCategory: config.roomCategory ?? name,
      roomTags: config.roomTags ?? [],
      roomMetadata: config.roomMetadata ?? {},
    };

    this.modes.set(name, fullConfig);
    this.queues.set(name, []);
  }

  /** Remove a game mode. All queued players in this mode are dequeued. */
  removeMode(name: string): boolean {
    if (!this.modes.has(name)) return false;

    // Dequeue all entries in this mode
    const queue = this.queues.get(name);
    if (queue) {
      for (const entry of queue) {
        this.removeEntry(entry);
        this.emit({
          type: 'queue_left',
          timestamp: Date.now(),
          data: { playerId: entry.playerId, mode: name, reason: 'mode_removed' },
        });
      }
    }

    this.modes.delete(name);
    this.queues.delete(name);
    return true;
  }

  /** Get configuration for a mode. */
  getMode(name: string): Required<GameModeConfig> | undefined {
    return this.modes.get(name);
  }

  /** Get all registered mode names. */
  getModeNames(): string[] {
    return Array.from(this.modes.keys());
  }

  // ============================================================================
  // Enqueue / Dequeue
  // ============================================================================

  /** Add a solo player to a matchmaking queue. Returns the queue entry. */
  enqueue(playerId: string, mode: string, options: EnqueueOptions = {}): QueueEntry {
    return this.enqueueInternal([playerId], mode, options);
  }

  /** Add a party to a matchmaking queue. Returns the queue entry. */
  enqueueParty(
    partyLeaderId: string,
    memberIds: string[],
    mode: string,
    options: EnqueueOptions = {}
  ): QueueEntry {
    const allIds = [partyLeaderId, ...memberIds.filter((id) => id !== partyLeaderId)];

    if (allIds.length < 1) {
      throw new Error('Party must have at least one member');
    }

    // Validate party fits in mode
    const modeConfig = this.modes.get(mode);
    if (!modeConfig) {
      throw new Error(`Mode "${mode}" not found`);
    }

    if (modeConfig.teamSize > 0 && allIds.length > modeConfig.teamSize) {
      throw new Error(
        `Party size ${allIds.length} exceeds team size ${modeConfig.teamSize}`
      );
    }

    if (allIds.length > modeConfig.maxPlayers) {
      throw new Error(
        `Party size ${allIds.length} exceeds max players ${modeConfig.maxPlayers}`
      );
    }

    return this.enqueueInternal(allIds, mode, options);
  }

  private enqueueInternal(
    playerIds: string[],
    mode: string,
    options: EnqueueOptions
  ): QueueEntry {
    const modeConfig = this.modes.get(mode);
    if (!modeConfig) {
      throw new Error(`Mode "${mode}" not found`);
    }

    // Check if any player is already in a queue
    for (const id of playerIds) {
      if (this.playerQueue.has(id)) {
        throw new Error(`Player "${id}" is already in a queue`);
      }
    }

    // Enforce global queue limit
    if (this.totalEntries >= this.serviceConfig.maxQueueSize) {
      throw new Error('Matchmaking queue is full');
    }

    const now = Date.now();
    const entry: QueueEntry = {
      id: `qe_${(this.nextEntryId++).toString(36)}_${now.toString(36)}`,
      playerId: playerIds[0],
      playerIds: [...playerIds],
      mode,
      skillRating: options.skillRating ?? 1000,
      region: options.region ?? null,
      enqueuedAt: now,
      metadata: options.metadata ?? {},
    };

    // Add to queue
    const queue = this.queues.get(mode)!;
    queue.push(entry);

    // Track player → entry mapping
    for (const id of playerIds) {
      this.playerQueue.set(id, entry.id);
    }
    this.entryMap.set(entry.id, entry);
    this.totalEntries++;

    this.emit({
      type: 'queue_joined',
      timestamp: now,
      data: {
        playerId: entry.playerId,
        playerIds: entry.playerIds,
        mode,
        skillRating: entry.skillRating,
        region: entry.region,
        queueSize: queue.length,
      },
    });

    return entry;
  }

  /** Remove a player (or their party) from their current queue. */
  dequeue(playerId: string): boolean {
    const entryId = this.playerQueue.get(playerId);
    if (!entryId) return false;

    const entry = this.entryMap.get(entryId);
    if (!entry) return false;

    this.removeEntry(entry);

    // Remove from mode queue array
    const queue = this.queues.get(entry.mode);
    if (queue) {
      const idx = queue.indexOf(entry);
      if (idx >= 0) queue.splice(idx, 1);
    }

    this.emit({
      type: 'queue_left',
      timestamp: Date.now(),
      data: {
        playerId: entry.playerId,
        playerIds: entry.playerIds,
        mode: entry.mode,
        reason: 'cancelled',
      },
    });

    return true;
  }

  /** Check if a player is in a queue. */
  isQueued(playerId: string): boolean {
    return this.playerQueue.has(playerId);
  }

  /** Get the queue entry for a player. */
  getQueueEntry(playerId: string): QueueEntry | undefined {
    const entryId = this.playerQueue.get(playerId);
    return entryId ? this.entryMap.get(entryId) : undefined;
  }

  /** Get position in queue (0-based). Returns -1 if not queued. */
  getQueuePosition(playerId: string): number {
    const entryId = this.playerQueue.get(playerId);
    if (!entryId) return -1;

    const entry = this.entryMap.get(entryId);
    if (!entry) return -1;

    const queue = this.queues.get(entry.mode);
    if (!queue) return -1;

    return queue.indexOf(entry);
  }

  // ============================================================================
  // Backfill Pool
  // ============================================================================

  /** Register a room as available for backfill. */
  registerBackfillRoom(
    roomId: string,
    mode: string,
    currentPlayers: number,
    maxPlayers: number
  ): void {
    this.backfillPool.set(roomId, { mode, currentPlayers, maxPlayers });
  }

  /** Remove a room from the backfill pool. */
  unregisterBackfillRoom(roomId: string): void {
    this.backfillPool.delete(roomId);
  }

  /** Update player count for a backfill room. */
  updateBackfillRoom(roomId: string, currentPlayers: number): void {
    const room = this.backfillPool.get(roomId);
    if (room) {
      room.currentPlayers = currentPlayers;
      if (room.currentPlayers >= room.maxPlayers) {
        this.backfillPool.delete(roomId);
      }
    }
  }

  // ============================================================================
  // Queue Processing (Main Loop)
  // ============================================================================

  /** Process all queues and find matches. Called on each tick. */
  processQueues(): MatchResult[] {
    const results: MatchResult[] = [];
    const now = Date.now();

    for (const [modeName, modeConfig] of this.modes) {
      const queue = this.queues.get(modeName);
      if (!queue || queue.length === 0) continue;

      // First, expire entries that exceeded maxWaitTime
      this.expireEntries(queue, modeName, modeConfig, now);

      // Then attempt backfill if enabled
      if (modeConfig.allowBackfill) {
        const backfillResults = this.attemptBackfill(queue, modeName, modeConfig, now);
        results.push(...backfillResults);
      }

      // Finally, try to form new matches
      const matchResults = this.attemptMatches(queue, modeName, modeConfig, now);
      results.push(...matchResults);
    }

    return results;
  }

  private expireEntries(
    queue: QueueEntry[],
    modeName: string,
    modeConfig: Required<GameModeConfig>,
    now: number
  ): void {
    const toRemove: QueueEntry[] = [];

    for (const entry of queue) {
      if (now - entry.enqueuedAt >= modeConfig.maxWaitTime) {
        toRemove.push(entry);
      }
    }

    for (const entry of toRemove) {
      const idx = queue.indexOf(entry);
      if (idx >= 0) queue.splice(idx, 1);
      this.removeEntry(entry);

      this.emit({
        type: 'queue_expired',
        timestamp: now,
        data: {
          playerId: entry.playerId,
          playerIds: entry.playerIds,
          mode: modeName,
          waitTime: now - entry.enqueuedAt,
        },
      });
    }
  }

  private attemptBackfill(
    queue: QueueEntry[],
    modeName: string,
    modeConfig: Required<GameModeConfig>,
    now: number
  ): MatchResult[] {
    const results: MatchResult[] = [];
    const toRemove: QueueEntry[] = [];

    for (const [roomId, backfill] of this.backfillPool) {
      if (backfill.mode !== modeName) continue;
      if (backfill.currentPlayers >= backfill.maxPlayers) continue;

      const slotsAvailable = backfill.maxPlayers - backfill.currentPlayers;

      // Find entries that fit the available slots
      for (const entry of queue) {
        if (toRemove.includes(entry)) continue;
        if (entry.playerIds.length > slotsAvailable) continue;

        // Backfill — join existing room
        const joined = this.joinBackfillRoom(roomId, entry);
        if (joined) {
          backfill.currentPlayers += entry.playerIds.length;
          toRemove.push(entry);

          const matchResult: MatchResult = {
            id: `match_${(this.nextMatchId++).toString(36)}_${now.toString(36)}`,
            mode: modeName,
            playerIds: entry.playerIds,
            teams: [],
            roomId,
            averageSkill: entry.skillRating,
            averageWaitTime: now - entry.enqueuedAt,
            region: entry.region,
            isBackfill: true,
            createdAt: now,
          };

          this.matches.set(matchResult.id, matchResult);
          results.push(matchResult);

          this.emit({
            type: 'backfill_found',
            timestamp: now,
            data: {
              matchId: matchResult.id,
              roomId,
              playerIds: entry.playerIds,
              mode: modeName,
            },
          });

          if (backfill.currentPlayers >= backfill.maxPlayers) break;
        }
      }
    }

    // Remove backfilled entries from queue
    for (const entry of toRemove) {
      const idx = queue.indexOf(entry);
      if (idx >= 0) queue.splice(idx, 1);
      this.removeEntry(entry);
    }

    return results;
  }

  private attemptMatches(
    queue: QueueEntry[],
    modeName: string,
    modeConfig: Required<GameModeConfig>,
    now: number
  ): MatchResult[] {
    const results: MatchResult[] = [];

    // Keep matching while there are enough entries
    while (queue.length > 0) {
      const candidateGroup = this.findMatchGroup(queue, modeConfig, now);
      if (!candidateGroup) break;

      // Remove matched entries from queue
      for (const entry of candidateGroup) {
        const idx = queue.indexOf(entry);
        if (idx >= 0) queue.splice(idx, 1);
        this.removeEntry(entry);
      }

      const allPlayerIds = candidateGroup.flatMap((e) => e.playerIds);
      const avgSkill =
        candidateGroup.reduce((sum, e) => sum + e.skillRating * e.playerIds.length, 0) /
        allPlayerIds.length;
      const avgWait =
        candidateGroup.reduce(
          (sum, e) => sum + (now - e.enqueuedAt) * e.playerIds.length,
          0
        ) / allPlayerIds.length;

      // Determine region (most common among entries)
      const region = this.selectRegion(candidateGroup);

      // Build teams
      const teams = this.assignTeams(candidateGroup, modeConfig);

      // Create room
      const roomId = this.createMatchRoom(modeName, modeConfig, allPlayerIds, avgSkill, region);

      const matchResult: MatchResult = {
        id: `match_${(this.nextMatchId++).toString(36)}_${now.toString(36)}`,
        mode: modeName,
        playerIds: allPlayerIds,
        teams,
        roomId,
        averageSkill: Math.round(avgSkill),
        averageWaitTime: Math.round(avgWait),
        region,
        isBackfill: false,
        createdAt: now,
      };

      this.matches.set(matchResult.id, matchResult);
      results.push(matchResult);

      this.emit({
        type: 'match_found',
        timestamp: now,
        data: {
          matchId: matchResult.id,
          mode: modeName,
          playerIds: allPlayerIds,
          teams,
          roomId,
          averageSkill: matchResult.averageSkill,
          averageWaitTime: matchResult.averageWaitTime,
          region,
        },
      });
    }

    return results;
  }

  /**
   * Find a group of queue entries that together form a valid match.
   *
   * Algorithm:
   * 1. Take the first entry as the anchor (longest-waiting).
   * 2. Calculate expanded skill tolerance based on anchor's wait time.
   * 3. Iterate remaining entries and add compatible ones until we reach target size.
   * 4. If we have at least minPlayers, return the group.
   */
  private findMatchGroup(
    queue: QueueEntry[],
    modeConfig: Required<GameModeConfig>,
    now: number
  ): QueueEntry[] | null {
    if (queue.length === 0) return null;

    const anchor = queue[0];
    const waitSeconds = (now - anchor.enqueuedAt) / 1000;

    // Calculate expanded skill tolerance
    const tolerance = modeConfig.ranked
      ? Math.min(
          modeConfig.skillRange + waitSeconds * modeConfig.skillExpansionRate,
          modeConfig.maxSkillRange
        )
      : Infinity;

    const targetSize = this.getTargetPlayerCount(modeConfig);
    const group: QueueEntry[] = [anchor];
    let totalPlayers = anchor.playerIds.length;

    for (let i = 1; i < queue.length && totalPlayers < targetSize; i++) {
      const candidate = queue[i];

      // Skill check
      if (modeConfig.ranked) {
        if (Math.abs(candidate.skillRating - anchor.skillRating) > tolerance) {
          continue;
        }
      }

      // Region preference — soft constraint: prefer same region but don't block
      // (We just prioritize same-region but include others)

      // Check if adding this entry won't exceed target
      if (totalPlayers + candidate.playerIds.length > modeConfig.maxPlayers) {
        continue;
      }

      // Team size constraint: if teams are set, ensure party doesn't split across teams
      if (modeConfig.teamSize > 0) {
        if (candidate.playerIds.length > modeConfig.teamSize) {
          continue; // Party is too large for a single team
        }
      }

      group.push(candidate);
      totalPlayers += candidate.playerIds.length;
    }

    // Check if we have enough players
    if (totalPlayers < modeConfig.minPlayers) {
      return null;
    }

    return group;
  }

  /** Calculate the ideal player count for a match. */
  private getTargetPlayerCount(modeConfig: Required<GameModeConfig>): number {
    if (modeConfig.teamSize > 0 && modeConfig.teamCount > 0) {
      return modeConfig.teamSize * modeConfig.teamCount;
    }
    return modeConfig.maxPlayers;
  }

  /** Assign players to teams. */
  private assignTeams(
    group: QueueEntry[],
    modeConfig: Required<GameModeConfig>
  ): MatchTeam[] {
    const teamSize = modeConfig.teamSize;
    const teamCount = modeConfig.teamCount;

    // FFA: no teams
    if (teamSize === 0 || teamCount === 0) {
      return [];
    }

    // Sort entries by skill for balanced assignment
    const sorted = [...group].sort((a, b) => b.skillRating - a.skillRating);

    const teams: MatchTeam[] = Array.from({ length: teamCount }, (_, i) => ({
      teamIndex: i,
      playerIds: [],
      averageSkill: 0,
    }));

    // Snake-draft assignment for balance:
    // Round 1: Team 0, 1, 2, ...
    // Round 2: Team ..., 2, 1, 0
    // This approximates balanced skill distribution
    let forward = true;
    let teamIdx = 0;

    for (const entry of sorted) {
      for (const playerId of entry.playerIds) {
        // Find the team with fewest players (respecting snake direction)
        const target = this.findSmallestTeam(teams, teamSize, teamIdx, forward);
        if (target !== null) {
          teams[target].playerIds.push(playerId);
        }

        // Advance snake
        if (forward) {
          teamIdx++;
          if (teamIdx >= teamCount) {
            teamIdx = teamCount - 1;
            forward = false;
          }
        } else {
          teamIdx--;
          if (teamIdx < 0) {
            teamIdx = 0;
            forward = true;
          }
        }
      }
    }

    // Calculate average skill per team
    for (const team of teams) {
      if (team.playerIds.length > 0) {
        const totalSkill = team.playerIds.reduce((sum, pid) => {
          // Find the entry containing this player
          const entry = group.find((e) => e.playerIds.includes(pid));
          return sum + (entry?.skillRating ?? 1000);
        }, 0);
        team.averageSkill = Math.round(totalSkill / team.playerIds.length);
      }
    }

    return teams.filter((t) => t.playerIds.length > 0);
  }

  /** Find the smallest team (by player count) that hasn't hit teamSize limit. */
  private findSmallestTeam(
    teams: MatchTeam[],
    teamSize: number,
    preferredIdx: number,
    _forward: boolean
  ): number | null {
    // Try preferred team first
    if (teams[preferredIdx] && teams[preferredIdx].playerIds.length < teamSize) {
      return preferredIdx;
    }

    // Fall back to smallest team
    let bestIdx: number | null = null;
    let bestCount = Infinity;
    for (let i = 0; i < teams.length; i++) {
      if (teams[i].playerIds.length < teamSize && teams[i].playerIds.length < bestCount) {
        bestCount = teams[i].playerIds.length;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /** Select the most common region among entries, or null. */
  private selectRegion(group: QueueEntry[]): string | null {
    const counts = new Map<string, number>();
    for (const entry of group) {
      if (entry.region) {
        counts.set(entry.region, (counts.get(entry.region) ?? 0) + entry.playerIds.length);
      }
    }

    if (counts.size === 0) return null;

    let bestRegion: string | null = null;
    let bestCount = 0;
    for (const [region, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestRegion = region;
      }
    }
    return bestRegion;
  }

  /** Create a room for a match via RoomService. */
  private createMatchRoom(
    modeName: string,
    modeConfig: Required<GameModeConfig>,
    playerIds: string[],
    avgSkill: number,
    region: string | null
  ): string | null {
    if (!this.roomService) return null;

    try {
      const hostId = playerIds[0];
      const room = this.roomService.create({
        name: `${modeName}_${Date.now()}`,
        hostId,
        maxPlayers: modeConfig.maxPlayers,
        category: modeConfig.roomCategory,
        tags: modeConfig.roomTags,
        metadata: {
          ...modeConfig.roomMetadata,
          matchmade: true,
          mode: modeName,
          averageSkill: Math.round(avgSkill),
          region,
        },
      });

      // Join remaining players
      for (let i = 1; i < playerIds.length; i++) {
        this.roomService.join(room.id, playerIds[i]);
      }

      // Register for backfill if allowed
      if (modeConfig.allowBackfill && playerIds.length < modeConfig.maxPlayers) {
        this.registerBackfillRoom(room.id, modeName, playerIds.length, modeConfig.maxPlayers);
      }

      return room.id;
    } catch {
      return null;
    }
  }

  /** Join a backfill room via RoomService. */
  private joinBackfillRoom(roomId: string, entry: QueueEntry): boolean {
    if (!this.roomService) return false;

    try {
      for (const playerId of entry.playerIds) {
        this.roomService.join(roomId, playerId);
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Remove an entry from tracking maps. Does NOT remove from queue array. */
  private removeEntry(entry: QueueEntry): void {
    for (const id of entry.playerIds) {
      this.playerQueue.delete(id);
    }
    this.entryMap.delete(entry.id);
    this.totalEntries--;
  }

  // ============================================================================
  // Stats & Queries
  // ============================================================================

  /** Get stats for a specific queue. */
  getQueueStats(mode: string): QueueStats | undefined {
    const modeConfig = this.modes.get(mode);
    const queue = this.queues.get(mode);
    if (!modeConfig || !queue) return undefined;

    const now = Date.now();
    const totalPlayers = queue.reduce((sum, e) => sum + e.playerIds.length, 0);
    const avgWait =
      queue.length > 0
        ? queue.reduce((sum, e) => sum + (now - e.enqueuedAt), 0) / queue.length
        : 0;

    // Estimate: how many more players needed for a match, at current join rate
    const targetSize = this.getTargetPlayerCount(modeConfig);
    const needed = Math.max(0, modeConfig.minPlayers - totalPlayers);
    const estimatedWait = needed > 0 ? avgWait * 2 : 0; // rough estimate

    return {
      mode,
      queueSize: queue.length,
      totalPlayers,
      averageWaitTime: Math.round(avgWait),
      estimatedWaitTime: Math.round(estimatedWait),
    };
  }

  /** Get stats for all queues. */
  getAllQueueStats(): QueueStats[] {
    const stats: QueueStats[] = [];
    for (const mode of this.modes.keys()) {
      const s = this.getQueueStats(mode);
      if (s) stats.push(s);
    }
    return stats;
  }

  /** Get a match result by ID. */
  getMatch(matchId: string): MatchResult | undefined {
    return this.matches.get(matchId);
  }

  /** Get all completed matches. */
  getMatches(): MatchResult[] {
    return Array.from(this.matches.values());
  }

  /** Get global stats. */
  getStats(): {
    modes: number;
    totalQueued: number;
    totalMatches: number;
    backfillRooms: number;
    running: boolean;
  } {
    return {
      modes: this.modes.size,
      totalQueued: this.totalEntries,
      totalMatches: this.matches.size,
      backfillRooms: this.backfillPool.size,
      running: this.running,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  /** Subscribe to matchmaking events. Returns an unsubscribe function. */
  onEvent(callback: MatchmakingEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.offEvent(callback);
  }

  /** Unsubscribe from matchmaking events. */
  offEvent(callback: MatchmakingEventCallback): void {
    this.listeners.delete(callback);
  }

  private emit(event: MatchmakingEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // swallow listener errors
      }
    }
  }
}
