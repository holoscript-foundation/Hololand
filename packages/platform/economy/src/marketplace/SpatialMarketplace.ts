/**
 * @hololand/economy SpatialMarketplace
 *
 * Spatial marketplace where prices follow bonding curves with distance decay.
 * Closer trade hubs have lower transaction costs; distant trades pay a premium.
 */

import { BondingCurveMarket, type TradeResult } from '../BondingCurveMarket';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface TradeHubConfig {
  hubId: string;
  position: Vector3;
  /** Influence radius: trades within this radius get full pricing. */
  influenceRadius: number;
  /** Specialization bonuses for specific asset types. */
  specializations: string[];
  /** Fee discount for specialized assets (0-1). */
  specializationDiscount: number;
}

export interface SpatialTradeResult extends TradeResult {
  hubId: string;
  distanceFromHub: number;
  distancePremium: number;
  specializationApplied: boolean;
}

/**
 * Spatial marketplace with distance-aware pricing.
 */
export class SpatialMarketplace {
  private market: BondingCurveMarket;
  private hubs: Map<string, TradeHubConfig> = new Map();
  private distanceDecayRate: number;

  constructor(market: BondingCurveMarket, distanceDecayRate: number = 0.01) {
    this.market = market;
    this.distanceDecayRate = distanceDecayRate;
  }

  /**
   * Register a trade hub at a world position.
   */
  addHub(config: TradeHubConfig): void {
    this.hubs.set(config.hubId, { ...config });
  }

  /**
   * Remove a trade hub.
   */
  removeHub(hubId: string): void {
    this.hubs.delete(hubId);
  }

  /**
   * Find the nearest trade hub to a position.
   */
  findNearestHub(position: Vector3): TradeHubConfig | null {
    let nearest: TradeHubConfig | null = null;
    let minDist = Infinity;
    for (const hub of this.hubs.values()) {
      const dist = this.distance(position, hub.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = hub;
      }
    }
    return nearest;
  }

  /**
   * Buy with distance-based pricing.
   */
  buy(
    assetId: string,
    quantity: number,
    traderPosition: Vector3,
  ): SpatialTradeResult | null {
    const hub = this.findNearestHub(traderPosition);
    if (!hub) return null;

    const dist = this.distance(traderPosition, hub.position);
    const premium = this.computeDistancePremium(dist, hub.influenceRadius);
    const isSpecialized = hub.specializations.includes(assetId);

    const baseResult = this.market.buy(assetId, quantity);
    if (!baseResult) return null;

    // Apply distance premium and specialization discount
    let adjustedCost = baseResult.totalCost * (1 + premium);
    if (isSpecialized) {
      adjustedCost *= 1 - hub.specializationDiscount;
    }

    return {
      ...baseResult,
      totalCost: adjustedCost,
      averagePrice: adjustedCost / quantity,
      hubId: hub.hubId,
      distanceFromHub: dist,
      distancePremium: premium,
      specializationApplied: isSpecialized,
    };
  }

  /**
   * Sell with distance-based pricing.
   */
  sell(
    assetId: string,
    quantity: number,
    traderPosition: Vector3,
  ): SpatialTradeResult | null {
    const hub = this.findNearestHub(traderPosition);
    if (!hub) return null;

    const dist = this.distance(traderPosition, hub.position);
    const premium = this.computeDistancePremium(dist, hub.influenceRadius);
    const isSpecialized = hub.specializations.includes(assetId);

    const baseResult = this.market.sell(assetId, quantity);
    if (!baseResult) return null;

    // Distance reduces sell returns; specialization increases them
    let adjustedReturn = baseResult.totalCost * (1 - premium * 0.5);
    if (isSpecialized) {
      adjustedReturn *= 1 + hub.specializationDiscount * 0.5;
    }

    return {
      ...baseResult,
      totalCost: adjustedReturn,
      averagePrice: adjustedReturn / quantity,
      hubId: hub.hubId,
      distanceFromHub: dist,
      distancePremium: premium,
      specializationApplied: isSpecialized,
    };
  }

  /**
   * Get price quote accounting for distance.
   */
  getQuote(assetId: string, quantity: number, position: Vector3): number | null {
    const hub = this.findNearestHub(position);
    if (!hub) return null;
    const baseQuote = this.market.getBuyQuote(assetId, quantity);
    if (baseQuote === null) return null;
    const dist = this.distance(position, hub.position);
    const premium = this.computeDistancePremium(dist, hub.influenceRadius);
    return baseQuote * (1 + premium);
  }

  getHubCount(): number {
    return this.hubs.size;
  }

  getHubs(): TradeHubConfig[] {
    return Array.from(this.hubs.values());
  }

  private computeDistancePremium(distance: number, influenceRadius: number): number {
    if (distance <= influenceRadius) return 0;
    return Math.min(1, (distance - influenceRadius) * this.distanceDecayRate);
  }

  private distance(a: Vector3, b: Vector3): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }
}
