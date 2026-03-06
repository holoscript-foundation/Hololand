/**
 * @hololand/economy WealthRecycler
 *
 * Implements wealth redistribution mechanisms to prevent extreme
 * inequality. Uses Gini coefficient tracking and progressive
 * taxation/redistribution.
 */

export interface PlayerWealth {
  playerId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastActive: number;
}

export interface WealthRecyclerConfig {
  /** Gini coefficient threshold to trigger redistribution. */
  giniThreshold: number;
  /** Maximum tax rate for richest tier (0-1). */
  maxTaxRate: number;
  /** Redistribution target: 'equal' or 'needBased'. */
  redistributionMode: 'equal' | 'needBased';
  /** Minimum balance for need-based redistribution. */
  povertyLine: number;
  /** Period between recycling cycles (ticks). */
  cyclePeriod: number;
}

const DEFAULT_CONFIG: WealthRecyclerConfig = {
  giniThreshold: 0.6,
  maxTaxRate: 0.05,
  redistributionMode: 'needBased',
  povertyLine: 100,
  cyclePeriod: 100,
};

export interface RecycleResult {
  giniBeforeRecycle: number;
  giniAfterRecycle: number;
  totalTaxed: number;
  totalRedistributed: number;
  playersAbovePoverty: number;
  playersBelowPoverty: number;
}

/**
 * Wealth recycling and Gini coefficient management for VR economy.
 */
export class WealthRecycler {
  private config: WealthRecyclerConfig;
  private players: Map<string, PlayerWealth> = new Map();
  private tickCount: number = 0;
  private lastRecycleResult: RecycleResult | null = null;

  constructor(config?: Partial<WealthRecyclerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register or update a player's wealth.
   */
  setPlayerWealth(playerId: string, balance: number): void {
    const existing = this.players.get(playerId);
    this.players.set(playerId, {
      playerId,
      balance,
      totalEarned: existing?.totalEarned ?? 0,
      totalSpent: existing?.totalSpent ?? 0,
      lastActive: Date.now(),
    });
  }

  /**
   * Compute the Gini coefficient for current wealth distribution.
   * Returns 0 (perfect equality) to 1 (maximum inequality).
   */
  computeGini(): number {
    const balances = Array.from(this.players.values())
      .map((p) => p.balance)
      .sort((a, b) => a - b);

    const n = balances.length;
    if (n <= 1) return 0;

    const mean = balances.reduce((a, b) => a + b, 0) / n;
    if (mean === 0) return 0;

    let sumOfDiffs = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumOfDiffs += Math.abs(balances[i] - balances[j]);
      }
    }

    return sumOfDiffs / (2 * n * n * mean);
  }

  /**
   * Execute one tick. Triggers recycling cycle if conditions are met.
   */
  tick(): RecycleResult | null {
    this.tickCount++;
    if (this.tickCount % this.config.cyclePeriod !== 0) return null;

    const gini = this.computeGini();
    if (gini < this.config.giniThreshold) return null;

    return this.recycle();
  }

  /**
   * Force a recycling cycle regardless of tick/threshold.
   */
  recycle(): RecycleResult {
    const giniBefore = this.computeGini();
    const sorted = Array.from(this.players.values()).sort((a, b) => b.balance - a.balance);
    const n = sorted.length;
    if (n === 0) {
      return {
        giniBeforeRecycle: 0,
        giniAfterRecycle: 0,
        totalTaxed: 0,
        totalRedistributed: 0,
        playersAbovePoverty: 0,
        playersBelowPoverty: 0,
      };
    }

    // Progressive taxation: top 10% pay maxTaxRate, gradually less
    let totalTaxed = 0;
    const taxThreshold = Math.floor(n * 0.5); // Top 50%

    for (let i = 0; i < taxThreshold; i++) {
      const player = sorted[i];
      const tierRate = this.config.maxTaxRate * (1 - i / taxThreshold);
      const tax = player.balance * tierRate;
      player.balance -= tax;
      totalTaxed += tax;
      this.players.set(player.playerId, player);
    }

    // Redistribute
    let totalRedistributed = 0;
    if (this.config.redistributionMode === 'needBased') {
      const belowPoverty = sorted.filter((p) => p.balance < this.config.povertyLine);
      if (belowPoverty.length > 0) {
        const perPlayer = totalTaxed / belowPoverty.length;
        for (const player of belowPoverty) {
          player.balance += perPlayer;
          totalRedistributed += perPlayer;
          this.players.set(player.playerId, player);
        }
      }
    } else {
      // Equal distribution
      const perPlayer = totalTaxed / n;
      for (const player of sorted) {
        player.balance += perPlayer;
        totalRedistributed += perPlayer;
        this.players.set(player.playerId, player);
      }
    }

    const giniAfter = this.computeGini();
    const belowPoverty = Array.from(this.players.values()).filter(
      (p) => p.balance < this.config.povertyLine,
    ).length;

    this.lastRecycleResult = {
      giniBeforeRecycle: giniBefore,
      giniAfterRecycle: giniAfter,
      totalTaxed,
      totalRedistributed,
      playersAbovePoverty: n - belowPoverty,
      playersBelowPoverty: belowPoverty,
    };

    return this.lastRecycleResult;
  }

  getPlayerWealth(playerId: string): PlayerWealth | undefined {
    const p = this.players.get(playerId);
    return p ? { ...p } : undefined;
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getLastRecycleResult(): RecycleResult | null {
    return this.lastRecycleResult;
  }
}
