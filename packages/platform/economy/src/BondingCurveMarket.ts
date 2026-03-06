/**
 * @hololand/economy BondingCurveMarket
 *
 * Automated market maker using bonding curves for VR asset pricing.
 * Price is a function of supply: P(s) = a * s^n + b
 * Supports linear, quadratic, and sigmoid curve types.
 */

export type CurveType = 'linear' | 'quadratic' | 'sigmoid';

export interface BondingCurveConfig {
  curveType: CurveType;
  /** Base price at supply = 0. */
  basePrice: number;
  /** Slope coefficient. */
  slope: number;
  /** Exponent for polynomial curves. */
  exponent: number;
  /** Maximum supply cap. */
  maxSupply: number;
  /** Transaction fee rate (0-1). */
  feeRate: number;
}

const DEFAULT_CONFIG: BondingCurveConfig = {
  curveType: 'quadratic',
  basePrice: 1.0,
  slope: 0.001,
  exponent: 2,
  maxSupply: 100_000,
  feeRate: 0.02,
};

export interface TradeResult {
  assetId: string;
  direction: 'buy' | 'sell';
  quantity: number;
  totalCost: number;
  averagePrice: number;
  fee: number;
  newSupply: number;
  newPrice: number;
}

export interface MarketState {
  assetId: string;
  supply: number;
  currentPrice: number;
  totalVolume: number;
  totalFees: number;
}

/**
 * Bonding curve automated market maker for VR economy.
 */
export class BondingCurveMarket {
  private config: BondingCurveConfig;
  private markets: Map<string, MarketState> = new Map();

  constructor(config?: Partial<BondingCurveConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new market for an asset.
   */
  createMarket(assetId: string, initialSupply: number = 0): MarketState {
    const state: MarketState = {
      assetId,
      supply: initialSupply,
      currentPrice: this.priceAtSupply(initialSupply),
      totalVolume: 0,
      totalFees: 0,
    };
    this.markets.set(assetId, state);
    return { ...state };
  }

  /**
   * Buy tokens from the bonding curve.
   */
  buy(assetId: string, quantity: number): TradeResult | null {
    const market = this.markets.get(assetId);
    if (!market) return null;
    if (market.supply + quantity > this.config.maxSupply) return null;
    if (quantity <= 0) return null;

    // Integrate price curve from current supply to current + quantity
    const totalCost = this.integrateCurve(market.supply, market.supply + quantity);
    const fee = totalCost * this.config.feeRate;

    market.supply += quantity;
    market.currentPrice = this.priceAtSupply(market.supply);
    market.totalVolume += totalCost;
    market.totalFees += fee;

    return {
      assetId,
      direction: 'buy',
      quantity,
      totalCost: totalCost + fee,
      averagePrice: totalCost / quantity,
      fee,
      newSupply: market.supply,
      newPrice: market.currentPrice,
    };
  }

  /**
   * Sell tokens back to the bonding curve.
   */
  sell(assetId: string, quantity: number): TradeResult | null {
    const market = this.markets.get(assetId);
    if (!market) return null;
    if (quantity > market.supply) return null;
    if (quantity <= 0) return null;

    const totalReturn = this.integrateCurve(market.supply - quantity, market.supply);
    const fee = totalReturn * this.config.feeRate;

    market.supply -= quantity;
    market.currentPrice = this.priceAtSupply(market.supply);
    market.totalVolume += totalReturn;
    market.totalFees += fee;

    return {
      assetId,
      direction: 'sell',
      quantity,
      totalCost: totalReturn - fee,
      averagePrice: totalReturn / quantity,
      fee,
      newSupply: market.supply,
      newPrice: market.currentPrice,
    };
  }

  /**
   * Get the current price for an asset.
   */
  getPrice(assetId: string): number {
    const market = this.markets.get(assetId);
    return market?.currentPrice ?? 0;
  }

  /**
   * Get quote for buying a quantity (without executing).
   */
  getBuyQuote(assetId: string, quantity: number): number | null {
    const market = this.markets.get(assetId);
    if (!market) return null;
    if (market.supply + quantity > this.config.maxSupply) return null;
    const cost = this.integrateCurve(market.supply, market.supply + quantity);
    return cost * (1 + this.config.feeRate);
  }

  /**
   * Get market state.
   */
  getMarket(assetId: string): MarketState | undefined {
    const m = this.markets.get(assetId);
    return m ? { ...m } : undefined;
  }

  /**
   * Get all markets.
   */
  getAllMarkets(): MarketState[] {
    return Array.from(this.markets.values()).map((m) => ({ ...m }));
  }

  getMarketCount(): number {
    return this.markets.size;
  }

  /**
   * Compute price at a given supply level.
   */
  priceAtSupply(supply: number): number {
    switch (this.config.curveType) {
      case 'linear':
        return this.config.basePrice + this.config.slope * supply;
      case 'quadratic':
        return this.config.basePrice + this.config.slope * Math.pow(supply, this.config.exponent);
      case 'sigmoid':
        return this.config.basePrice + this.config.slope * supply / (1 + supply * 0.001);
      default:
        return this.config.basePrice;
    }
  }

  private integrateCurve(from: number, to: number): number {
    // Numerical integration using Simpson's rule
    const steps = 100;
    const h = (to - from) / steps;
    let sum = this.priceAtSupply(from) + this.priceAtSupply(to);

    for (let i = 1; i < steps; i++) {
      const s = from + i * h;
      sum += (i % 2 === 0 ? 2 : 4) * this.priceAtSupply(s);
    }

    return (h / 3) * sum;
  }
}
