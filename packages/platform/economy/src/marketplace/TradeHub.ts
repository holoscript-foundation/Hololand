/**
 * @hololand/economy TradeHub
 *
 * Individual trade hub instance that manages local market activity.
 * Tracks trade volume, active traders, and local price anchoring.
 */

import type { Vector3 } from './SpatialMarketplace';

export interface TradeActivity {
  tradeId: string;
  assetId: string;
  quantity: number;
  price: number;
  traderId: string;
  direction: 'buy' | 'sell';
  timestamp: number;
}

/**
 * Local trade hub with activity tracking and price anchoring.
 */
export class TradeHub {
  readonly hubId: string;
  readonly position: Vector3;
  private activities: TradeActivity[] = [];
  private activeTraders: Set<string> = new Set();
  private maxActivityHistory: number;
  private totalVolume: number = 0;

  constructor(hubId: string, position: Vector3, maxActivityHistory: number = 500) {
    this.hubId = hubId;
    this.position = { ...position };
    this.maxActivityHistory = maxActivityHistory;
  }

  /**
   * Record a trade activity at this hub.
   */
  recordActivity(activity: TradeActivity): void {
    this.activities.push(activity);
    this.activeTraders.add(activity.traderId);
    this.totalVolume += activity.price * activity.quantity;

    if (this.activities.length > this.maxActivityHistory) {
      this.activities.shift();
    }
  }

  /**
   * Get the local volume-weighted average price for an asset.
   */
  getVWAP(assetId: string): number {
    const relevant = this.activities.filter((a) => a.assetId === assetId);
    if (relevant.length === 0) return 0;

    let totalValue = 0;
    let totalQuantity = 0;
    for (const a of relevant) {
      totalValue += a.price * a.quantity;
      totalQuantity += a.quantity;
    }

    return totalQuantity > 0 ? totalValue / totalQuantity : 0;
  }

  /**
   * Get trade count for a time window.
   */
  getTradeCount(sinceMs?: number): number {
    if (!sinceMs) return this.activities.length;
    const cutoff = Date.now() - sinceMs;
    return this.activities.filter((a) => a.timestamp > cutoff).length;
  }

  getActiveTraderCount(): number {
    return this.activeTraders.size;
  }

  getTotalVolume(): number {
    return this.totalVolume;
  }

  getRecentActivities(count: number = 10): TradeActivity[] {
    return this.activities.slice(-count);
  }
}
