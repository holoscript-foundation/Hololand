/**
 * @hololand/economy EconomyManager
 *
 * Top-level orchestrator for the 9-layer self-regulating VR economy.
 * Coordinates BondingCurveMarket, PIDFaucetSink, and WealthRecycler
 * into a coherent economic system.
 */

import { BondingCurveMarket, type TradeResult, type BondingCurveConfig } from './BondingCurveMarket';
import { PIDFaucetSink, type PIDConfig, type EconomySnapshot } from './PIDFaucetSink';
import { WealthRecycler, type WealthRecyclerConfig, type RecycleResult } from './WealthRecycler';

export interface EconomyManagerConfig {
  bondingCurve?: Partial<BondingCurveConfig>;
  pid?: Partial<PIDConfig>;
  recycler?: Partial<WealthRecyclerConfig>;
  initialMoneySupply: number;
}

const DEFAULT_CONFIG: EconomyManagerConfig = {
  initialMoneySupply: 100_000,
};

export interface EconomyMetrics {
  totalMoneySupply: number;
  giniCoefficient: number;
  inflationRate: number;
  activeMarkets: number;
  totalPlayers: number;
  faucetRate: number;
  sinkRate: number;
}

/**
 * 9-layer self-regulating VR economy orchestrator.
 *
 * Layers:
 * 1. Bonding curve pricing
 * 2. PID-controlled faucet/sink
 * 3. Wealth redistribution
 * 4. Transaction fee recycling
 * 5. Supply cap enforcement
 * 6. Inflation targeting
 * 7. Velocity monitoring
 * 8. Gini coefficient tracking
 * 9. Emergency circuit breakers
 */
export class EconomyManager {
  private config: EconomyManagerConfig;
  private market: BondingCurveMarket;
  private faucetSink: PIDFaucetSink;
  private recycler: WealthRecycler;
  private circuitBreakerTripped: boolean = false;
  private tickCount: number = 0;

  constructor(config?: Partial<EconomyManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.market = new BondingCurveMarket(this.config.bondingCurve);
    this.faucetSink = new PIDFaucetSink(this.config.initialMoneySupply, this.config.pid);
    this.recycler = new WealthRecycler(this.config.recycler);
  }

  /**
   * Process one economy tick. Runs all layers.
   */
  tick(): EconomySnapshot {
    if (this.circuitBreakerTripped) {
      return this.faucetSink.getLatestSnapshot() ?? {
        totalMoneySupply: this.faucetSink.getTotalSupply(),
        inflationRate: 0,
        faucetRate: 0,
        sinkRate: 0,
        netFlow: 0,
        timestamp: Date.now(),
      };
    }

    this.tickCount++;

    // Layer 2: PID faucet/sink update
    const snapshot = this.faucetSink.update();

    // Layer 3: Wealth recycling
    this.recycler.tick();

    // Layer 9: Circuit breaker check
    this.checkCircuitBreaker(snapshot);

    return snapshot;
  }

  /**
   * Execute a buy trade on a market.
   */
  buy(assetId: string, quantity: number, buyerId: string): TradeResult | null {
    if (this.circuitBreakerTripped) return null;
    const result = this.market.buy(assetId, quantity);
    if (result) {
      // Drain buyer's balance
      this.faucetSink.drain(result.totalCost);
      // Track player wealth
      const current = this.recycler.getPlayerWealth(buyerId);
      this.recycler.setPlayerWealth(
        buyerId,
        (current?.balance ?? 1000) - result.totalCost,
      );
    }
    return result;
  }

  /**
   * Execute a sell trade on a market.
   */
  sell(assetId: string, quantity: number, sellerId: string): TradeResult | null {
    if (this.circuitBreakerTripped) return null;
    const result = this.market.sell(assetId, quantity);
    if (result) {
      this.faucetSink.inject(result.totalCost);
      const current = this.recycler.getPlayerWealth(sellerId);
      this.recycler.setPlayerWealth(
        sellerId,
        (current?.balance ?? 0) + result.totalCost,
      );
    }
    return result;
  }

  /**
   * Create a new asset market.
   */
  createMarket(assetId: string, initialSupply?: number) {
    return this.market.createMarket(assetId, initialSupply);
  }

  /**
   * Register a player with the economy.
   */
  registerPlayer(playerId: string, initialBalance: number = 1000): void {
    this.recycler.setPlayerWealth(playerId, initialBalance);
  }

  /**
   * Get economy-wide metrics.
   */
  getMetrics(): EconomyMetrics {
    return {
      totalMoneySupply: this.faucetSink.getTotalSupply(),
      giniCoefficient: this.recycler.computeGini(),
      inflationRate: this.faucetSink.getLatestSnapshot()?.inflationRate ?? 0,
      activeMarkets: this.market.getMarketCount(),
      totalPlayers: this.recycler.getPlayerCount(),
      faucetRate: this.faucetSink.getFaucetRate(),
      sinkRate: this.faucetSink.getSinkRate(),
    };
  }

  /**
   * Reset circuit breaker.
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerTripped = false;
  }

  isCircuitBreakerTripped(): boolean {
    return this.circuitBreakerTripped;
  }

  getMarket(): BondingCurveMarket {
    return this.market;
  }

  getFaucetSink(): PIDFaucetSink {
    return this.faucetSink;
  }

  getRecycler(): WealthRecycler {
    return this.recycler;
  }

  private checkCircuitBreaker(snapshot: EconomySnapshot): void {
    // Trip if inflation exceeds 50% or supply drops below 10% of initial
    if (Math.abs(snapshot.inflationRate) > 0.5) {
      this.circuitBreakerTripped = true;
    }
    if (snapshot.totalMoneySupply < this.config.initialMoneySupply * 0.1) {
      this.circuitBreakerTripped = true;
    }
  }
}
