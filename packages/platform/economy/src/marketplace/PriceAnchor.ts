/**
 * @hololand/economy PriceAnchor
 *
 * Price anchoring system that stabilizes prices across spatial trade hubs.
 * Uses a moving average anchor to prevent wild price swings between hubs.
 */

export interface PriceAnchorConfig {
  /** Moving average window size. */
  windowSize: number;
  /** Maximum allowed deviation from anchor (0-1). */
  maxDeviation: number;
  /** Anchor strength (0-1): how strongly prices are pulled to anchor. */
  anchorStrength: number;
}

const DEFAULT_CONFIG: PriceAnchorConfig = {
  windowSize: 50,
  maxDeviation: 0.3,
  anchorStrength: 0.2,
};

interface PriceRecord {
  price: number;
  timestamp: number;
  hubId: string;
}

/**
 * Cross-hub price anchor for stabilization.
 */
export class PriceAnchor {
  private config: PriceAnchorConfig;
  private priceHistories: Map<string, PriceRecord[]> = new Map(); // assetId -> records
  private anchors: Map<string, number> = new Map(); // assetId -> anchor price

  constructor(config?: Partial<PriceAnchorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a price observation.
   */
  recordPrice(assetId: string, price: number, hubId: string): void {
    if (!this.priceHistories.has(assetId)) {
      this.priceHistories.set(assetId, []);
    }
    const history = this.priceHistories.get(assetId)!;
    history.push({ price, timestamp: Date.now(), hubId });

    if (history.length > this.config.windowSize) {
      history.shift();
    }

    // Update anchor
    this.updateAnchor(assetId);
  }

  /**
   * Get the anchor price for an asset.
   */
  getAnchorPrice(assetId: string): number {
    return this.anchors.get(assetId) ?? 0;
  }

  /**
   * Adjust a proposed price towards the anchor.
   */
  anchorPrice(assetId: string, proposedPrice: number): number {
    const anchor = this.anchors.get(assetId);
    if (!anchor || anchor === 0) return proposedPrice;

    const deviation = (proposedPrice - anchor) / anchor;
    if (Math.abs(deviation) <= this.config.maxDeviation) {
      return proposedPrice;
    }

    // Pull towards anchor
    return proposedPrice * (1 - this.config.anchorStrength) +
           anchor * this.config.anchorStrength;
  }

  /**
   * Check if a price deviates too far from anchor.
   */
  isDeviant(assetId: string, price: number): boolean {
    const anchor = this.anchors.get(assetId);
    if (!anchor || anchor === 0) return false;
    return Math.abs((price - anchor) / anchor) > this.config.maxDeviation;
  }

  getTrackedAssetCount(): number {
    return this.priceHistories.size;
  }

  private updateAnchor(assetId: string): void {
    const history = this.priceHistories.get(assetId);
    if (!history || history.length === 0) return;

    const sum = history.reduce((acc, r) => acc + r.price, 0);
    this.anchors.set(assetId, sum / history.length);
  }
}
