/**
 * @hololand/lifecycle AWUMetric
 *
 * Agentic Work Unit metric for VR worlds.
 * Tracks session duration, interaction depth, experience completion,
 * quality-weighted scoring, per-user and aggregate AWU calculation,
 * and time-series history.
 */

export interface SessionData {
  userId: string;
  startTimestamp: number;
  endTimestamp: number;
  /** Number of meaningful interactions during the session */
  interactionCount: number;
  /** Fraction of available experiences completed (0-1) */
  experienceCompletion: number;
  /** Quality rating for this session (0-1, e.g. from comfort score) */
  qualityRating: number;
}

export interface UserAWU {
  userId: string;
  /** Raw session count this week */
  sessionCount: number;
  /** Total session duration in seconds */
  totalDurationSec: number;
  /** Average interaction depth per session */
  avgInteractionDepth: number;
  /** Average experience completion */
  avgExperienceCompletion: number;
  /** Quality-weighted AWU score (the final metric) */
  awuScore: number;
}

export interface AggregateAWU {
  weekKey: string;
  uniqueUsers: number;
  totalSessions: number;
  avgSessionDurationSec: number;
  avgAwuScore: number;
  medianAwuScore: number;
  topPerformers: Array<{ userId: string; awuScore: number }>;
}

export interface AWUConfig {
  /** Weight for session duration in AWU calc */
  durationWeight: number;
  /** Weight for interaction depth */
  interactionWeight: number;
  /** Weight for experience completion */
  completionWeight: number;
  /** Weight for quality rating */
  qualityWeight: number;
  /** Minimum session duration in seconds to count */
  minSessionDurationSec: number;
  /** Maximum session duration for scoring cap (seconds) */
  maxSessionDurationSec: number;
  /** Number of top performers to include in aggregate */
  topPerformerCount: number;
}

const DEFAULT_AWU_CONFIG: AWUConfig = {
  durationWeight: 0.25,
  interactionWeight: 0.30,
  completionWeight: 0.25,
  qualityWeight: 0.20,
  minSessionDurationSec: 30,
  maxSessionDurationSec: 7200, // 2 hours cap
  topPerformerCount: 10,
};

export class AWUMetric {
  readonly worldId: string;
  private weeklyUsers: Map<string, Set<string>> = new Map(); // weekKey -> userIds
  private sessions: Map<string, SessionData[]> = new Map();   // weekKey -> sessions
  private config: AWUConfig;

  constructor(worldId: string, config?: Partial<AWUConfig>) {
    this.worldId = worldId;
    this.config = { ...DEFAULT_AWU_CONFIG, ...config };
  }

  // ── Original API (preserved) ─────────────────────────────────────

  recordUser(userId: string, timestamp: number = Date.now()): void {
    const weekKey = this.getWeekKey(timestamp);
    if (!this.weeklyUsers.has(weekKey)) this.weeklyUsers.set(weekKey, new Set());
    this.weeklyUsers.get(weekKey)!.add(userId);
  }

  getAWU(timestamp: number = Date.now()): number {
    return this.weeklyUsers.get(this.getWeekKey(timestamp))?.size ?? 0;
  }

  getAWUHistory(weeks: number = 4): Array<{ week: string; users: number }> {
    const result: Array<{ week: string; users: number }> = [];
    const now = Date.now();
    for (let i = 0; i < weeks; i++) {
      const ts = now - i * 7 * 24 * 60 * 60 * 1000;
      const weekKey = this.getWeekKey(ts);
      result.push({ week: weekKey, users: this.weeklyUsers.get(weekKey)?.size ?? 0 });
    }
    return result;
  }

  // ── Session recording ────────────────────────────────────────────

  /**
   * Record a complete session with interaction and quality data.
   * This is the primary data ingestion method for AWU scoring.
   */
  recordSession(session: SessionData): void {
    const durationSec = (session.endTimestamp - session.startTimestamp) / 1000;
    if (durationSec < this.config.minSessionDurationSec) return; // too short

    const weekKey = this.getWeekKey(session.startTimestamp);

    // Record user presence
    this.recordUser(session.userId, session.startTimestamp);

    // Store session data
    if (!this.sessions.has(weekKey)) this.sessions.set(weekKey, []);
    this.sessions.get(weekKey)!.push({ ...session });
  }

  // ── Per-user AWU calculation ─────────────────────────────────────

  /**
   * Calculate AWU score for a specific user in a given week.
   * The AWU score is a quality-weighted composite of:
   * - Session duration (capped)
   * - Interaction depth
   * - Experience completion
   * - Quality rating
   */
  getUserAWU(userId: string, timestamp: number = Date.now()): UserAWU {
    const weekKey = this.getWeekKey(timestamp);
    const weekSessions = (this.sessions.get(weekKey) ?? []).filter(
      (s) => s.userId === userId,
    );

    if (weekSessions.length === 0) {
      return {
        userId,
        sessionCount: 0,
        totalDurationSec: 0,
        avgInteractionDepth: 0,
        avgExperienceCompletion: 0,
        awuScore: 0,
      };
    }

    let totalDuration = 0;
    let totalInteractions = 0;
    let totalCompletion = 0;
    let totalQuality = 0;

    for (const s of weekSessions) {
      const duration = Math.min(
        this.config.maxSessionDurationSec,
        (s.endTimestamp - s.startTimestamp) / 1000,
      );
      totalDuration += duration;
      totalInteractions += s.interactionCount;
      totalCompletion += s.experienceCompletion;
      totalQuality += s.qualityRating;
    }

    const count = weekSessions.length;
    const avgInteractionDepth = totalInteractions / count;
    const avgCompletion = totalCompletion / count;
    const avgQuality = totalQuality / count;

    // Normalize duration to 0-1 scale (capped at max)
    const durationScore = Math.min(1, totalDuration / (this.config.maxSessionDurationSec * 2));
    // Normalize interaction depth: log scale (1 interaction = 0, 100+ = 1)
    const interactionScore = Math.min(1, Math.log10(Math.max(1, avgInteractionDepth)) / 2);
    // Completion is already 0-1
    const completionScore = avgCompletion;
    // Quality is already 0-1
    const qualityScore = avgQuality;

    const awuScore =
      durationScore * this.config.durationWeight +
      interactionScore * this.config.interactionWeight +
      completionScore * this.config.completionWeight +
      qualityScore * this.config.qualityWeight;

    return {
      userId,
      sessionCount: count,
      totalDurationSec: totalDuration,
      avgInteractionDepth,
      avgExperienceCompletion: avgCompletion,
      awuScore: Math.max(0, Math.min(1, awuScore)),
    };
  }

  // ── Aggregate AWU calculation ────────────────────────────────────

  /**
   * Calculate aggregate AWU statistics for a given week.
   */
  getAggregateAWU(timestamp: number = Date.now()): AggregateAWU {
    const weekKey = this.getWeekKey(timestamp);
    const userIds = this.weeklyUsers.get(weekKey) ?? new Set();
    const weekSessions = this.sessions.get(weekKey) ?? [];

    const userScores: Array<{ userId: string; awuScore: number }> = [];

    for (const userId of userIds) {
      const userAwu = this.getUserAWU(userId, timestamp);
      userScores.push({ userId, awuScore: userAwu.awuScore });
    }

    // Sort by score descending
    userScores.sort((a, b) => b.awuScore - a.awuScore);

    // Compute aggregate stats
    const scores = userScores.map((u) => u.awuScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Median
    const sorted = [...scores].sort((a, b) => a - b);
    const medianScore = sorted.length > 0
      ? sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]
      : 0;

    // Average session duration
    let totalDuration = 0;
    for (const s of weekSessions) {
      totalDuration += (s.endTimestamp - s.startTimestamp) / 1000;
    }
    const avgDuration = weekSessions.length > 0 ? totalDuration / weekSessions.length : 0;

    return {
      weekKey,
      uniqueUsers: userIds.size,
      totalSessions: weekSessions.length,
      avgSessionDurationSec: avgDuration,
      avgAwuScore: avgScore,
      medianAwuScore: medianScore,
      topPerformers: userScores.slice(0, this.config.topPerformerCount),
    };
  }

  // ── Time-series history ──────────────────────────────────────────

  /**
   * Get AWU time series across multiple weeks.
   */
  getAWUTimeSeries(weeks: number = 8): Array<{
    week: string;
    uniqueUsers: number;
    avgAwuScore: number;
    totalSessions: number;
  }> {
    const result: Array<{
      week: string;
      uniqueUsers: number;
      avgAwuScore: number;
      totalSessions: number;
    }> = [];

    const now = Date.now();
    for (let i = 0; i < weeks; i++) {
      const ts = now - i * 7 * 24 * 60 * 60 * 1000;
      const agg = this.getAggregateAWU(ts);
      result.push({
        week: agg.weekKey,
        uniqueUsers: agg.uniqueUsers,
        avgAwuScore: agg.avgAwuScore,
        totalSessions: agg.totalSessions,
      });
    }

    return result;
  }

  /**
   * Get growth rate of AWU between the two most recent weeks.
   * Positive = growth, negative = decline.
   */
  getGrowthRate(): number {
    const now = Date.now();
    const currentWeek = this.getAWU(now);
    const lastWeek = this.getAWU(now - 7 * 24 * 60 * 60 * 1000);

    if (lastWeek === 0) return currentWeek > 0 ? 1 : 0;
    return (currentWeek - lastWeek) / lastWeek;
  }

  // ── Week key utility ─────────────────────────────────────────────

  private getWeekKey(timestamp: number): string {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const week = Math.ceil((d.getDate() + new Date(year, d.getMonth(), 1).getDay()) / 7);
    return `${year}-W${week}`;
  }

  // ── Config ───────────────────────────────────────────────────────

  getConfig(): AWUConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AWUConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
