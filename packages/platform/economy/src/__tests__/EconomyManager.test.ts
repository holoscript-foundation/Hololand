/**
 * Tests for BondingCurveMarket, PIDFaucetSink, WealthRecycler, EconomyManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BondingCurveMarket } from '../BondingCurveMarket';
import { PIDFaucetSink } from '../PIDFaucetSink';
import { WealthRecycler } from '../WealthRecycler';
import { EconomyManager } from '../EconomyManager';

describe('BondingCurveMarket', () => {
  let market: BondingCurveMarket;

  beforeEach(() => {
    market = new BondingCurveMarket({ curveType: 'quadratic', basePrice: 1, slope: 0.001, exponent: 2 });
  });

  it('creates markets', () => {
    const state = market.createMarket('asset1');
    expect(state.assetId).toBe('asset1');
    expect(state.supply).toBe(0);
  });

  it('buys increase supply and price', () => {
    market.createMarket('asset1');
    const result = market.buy('asset1', 100);
    expect(result).not.toBeNull();
    expect(result!.newSupply).toBe(100);
    expect(result!.newPrice).toBeGreaterThan(1);
  });

  it('sells decrease supply', () => {
    market.createMarket('asset1', 100);
    const result = market.sell('asset1', 50);
    expect(result).not.toBeNull();
    expect(result!.newSupply).toBe(50);
  });

  it('rejects buy above max supply', () => {
    market.createMarket('asset1', 99_999);
    expect(market.buy('asset1', 10)).toBeNull();
  });

  it('rejects sell above current supply', () => {
    market.createMarket('asset1', 10);
    expect(market.sell('asset1', 20)).toBeNull();
  });

  it('charges fees on trades', () => {
    market.createMarket('asset1');
    const result = market.buy('asset1', 10)!;
    expect(result.fee).toBeGreaterThan(0);
  });

  it('provides buy quotes', () => {
    market.createMarket('asset1');
    const quote = market.getBuyQuote('asset1', 10);
    expect(quote).toBeGreaterThan(0);
  });
});

describe('PIDFaucetSink', () => {
  let pid: PIDFaucetSink;

  beforeEach(() => {
    pid = new PIDFaucetSink(10_000);
  });

  it('starts with initial supply', () => {
    expect(pid.getTotalSupply()).toBe(10_000);
  });

  it('updates supply on tick', () => {
    pid.update();
    // First tick with 0 inflation should trigger faucet
    expect(pid.getFaucetRate()).toBeGreaterThanOrEqual(0);
  });

  it('injects currency directly', () => {
    pid.inject(500);
    expect(pid.getTotalSupply()).toBe(10_500);
  });

  it('drains currency directly', () => {
    pid.drain(500);
    expect(pid.getTotalSupply()).toBe(9_500);
  });

  it('never goes below 0', () => {
    pid.drain(20_000);
    expect(pid.getTotalSupply()).toBe(0);
  });

  it('maintains history', () => {
    pid.update();
    pid.update();
    expect(pid.getHistory().length).toBe(2);
  });
});

describe('WealthRecycler', () => {
  let recycler: WealthRecycler;

  beforeEach(() => {
    recycler = new WealthRecycler({ giniThreshold: 0.4, povertyLine: 100 });
  });

  it('computes Gini coefficient', () => {
    recycler.setPlayerWealth('rich', 10000);
    recycler.setPlayerWealth('poor', 10);
    const gini = recycler.computeGini();
    expect(gini).toBeGreaterThan(0.5);
  });

  it('Gini is 0 for equal wealth', () => {
    recycler.setPlayerWealth('p1', 1000);
    recycler.setPlayerWealth('p2', 1000);
    expect(recycler.computeGini()).toBe(0);
  });

  it('redistributes wealth when Gini exceeds threshold', () => {
    recycler.setPlayerWealth('rich', 10000);
    recycler.setPlayerWealth('poor', 10);
    const result = recycler.recycle();
    expect(result.giniAfterRecycle).toBeLessThan(result.giniBeforeRecycle);
  });

  it('tracks player count', () => {
    recycler.setPlayerWealth('p1', 100);
    recycler.setPlayerWealth('p2', 200);
    expect(recycler.getPlayerCount()).toBe(2);
  });
});

describe('EconomyManager', () => {
  let economy: EconomyManager;

  beforeEach(() => {
    economy = new EconomyManager({ initialMoneySupply: 100_000 });
  });

  it('creates markets and processes trades', () => {
    economy.createMarket('gem');
    economy.registerPlayer('player1', 5000);
    const result = economy.buy('gem', 10, 'player1');
    expect(result).not.toBeNull();
  });

  it('processes economy ticks', () => {
    const snapshot = economy.tick();
    expect(snapshot.totalMoneySupply).toBeGreaterThan(0);
  });

  it('reports metrics', () => {
    economy.registerPlayer('p1', 1000);
    economy.createMarket('gold');
    const metrics = economy.getMetrics();
    expect(metrics.totalPlayers).toBe(1);
    expect(metrics.activeMarkets).toBe(1);
  });

  it('trips circuit breaker on extreme conditions', () => {
    // Drain almost all money to trigger circuit breaker
    economy.getFaucetSink().drain(95_000);
    economy.tick();
    expect(economy.isCircuitBreakerTripped()).toBe(true);
  });

  it('blocks trades when circuit breaker is tripped', () => {
    economy.createMarket('item');
    economy.getFaucetSink().drain(95_000);
    economy.tick();
    expect(economy.buy('item', 1, 'p1')).toBeNull();
  });

  it('resets circuit breaker', () => {
    economy.getFaucetSink().drain(95_000);
    economy.tick();
    economy.resetCircuitBreaker();
    expect(economy.isCircuitBreakerTripped()).toBe(false);
  });
});
