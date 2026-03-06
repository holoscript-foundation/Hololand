/**
 * Tests for SpatialMarketplace, TradeHub, PriceAnchor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BondingCurveMarket } from '../../BondingCurveMarket';
import { SpatialMarketplace } from '../SpatialMarketplace';
import { TradeHub } from '../TradeHub';
import { PriceAnchor } from '../PriceAnchor';

describe('SpatialMarketplace', () => {
  let market: BondingCurveMarket;
  let spatial: SpatialMarketplace;

  beforeEach(() => {
    market = new BondingCurveMarket({ basePrice: 1, slope: 0.001, exponent: 2, feeRate: 0.01 });
    spatial = new SpatialMarketplace(market, 0.01);
    market.createMarket('gem', 100);
    spatial.addHub({
      hubId: 'hub1',
      position: { x: 0, y: 0, z: 0 },
      influenceRadius: 50,
      specializations: ['gem'],
      specializationDiscount: 0.1,
    });
  });

  it('applies no premium for trades within influence radius', () => {
    const result = spatial.buy('gem', 5, { x: 10, y: 0, z: 0 });
    expect(result).not.toBeNull();
    expect(result!.distancePremium).toBe(0);
  });

  it('applies distance premium outside influence radius', () => {
    const result = spatial.buy('gem', 5, { x: 100, y: 0, z: 0 });
    expect(result).not.toBeNull();
    expect(result!.distancePremium).toBeGreaterThan(0);
  });

  it('applies specialization discount', () => {
    const result = spatial.buy('gem', 5, { x: 10, y: 0, z: 0 });
    expect(result!.specializationApplied).toBe(true);
  });

  it('finds nearest hub', () => {
    spatial.addHub({
      hubId: 'hub2',
      position: { x: 100, y: 0, z: 0 },
      influenceRadius: 50,
      specializations: [],
      specializationDiscount: 0,
    });
    const hub = spatial.findNearestHub({ x: 90, y: 0, z: 0 });
    expect(hub!.hubId).toBe('hub2');
  });

  it('returns null when no hubs exist', () => {
    const empty = new SpatialMarketplace(market);
    expect(empty.buy('gem', 5, { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it('gets distance-adjusted quotes', () => {
    const nearQuote = spatial.getQuote('gem', 5, { x: 10, y: 0, z: 0 });
    const farQuote = spatial.getQuote('gem', 5, { x: 200, y: 0, z: 0 });
    expect(nearQuote).not.toBeNull();
    expect(farQuote).not.toBeNull();
    expect(farQuote!).toBeGreaterThan(nearQuote!);
  });
});

describe('TradeHub', () => {
  let hub: TradeHub;

  beforeEach(() => {
    hub = new TradeHub('hub1', { x: 0, y: 0, z: 0 });
  });

  it('records trade activities', () => {
    hub.recordActivity({
      tradeId: 't1', assetId: 'gem', quantity: 10, price: 5,
      traderId: 'p1', direction: 'buy', timestamp: Date.now(),
    });
    expect(hub.getTradeCount()).toBe(1);
    expect(hub.getActiveTraderCount()).toBe(1);
  });

  it('computes VWAP', () => {
    hub.recordActivity({
      tradeId: 't1', assetId: 'gem', quantity: 10, price: 5,
      traderId: 'p1', direction: 'buy', timestamp: Date.now(),
    });
    hub.recordActivity({
      tradeId: 't2', assetId: 'gem', quantity: 10, price: 15,
      traderId: 'p2', direction: 'buy', timestamp: Date.now(),
    });
    expect(hub.getVWAP('gem')).toBe(10); // (5*10 + 15*10) / 20
  });

  it('tracks total volume', () => {
    hub.recordActivity({
      tradeId: 't1', assetId: 'gem', quantity: 10, price: 5,
      traderId: 'p1', direction: 'buy', timestamp: Date.now(),
    });
    expect(hub.getTotalVolume()).toBe(50);
  });
});

describe('PriceAnchor', () => {
  let anchor: PriceAnchor;

  beforeEach(() => {
    anchor = new PriceAnchor({ windowSize: 10, maxDeviation: 0.2, anchorStrength: 0.3 });
  });

  it('tracks anchor price as moving average', () => {
    anchor.recordPrice('gem', 10, 'hub1');
    anchor.recordPrice('gem', 20, 'hub1');
    expect(anchor.getAnchorPrice('gem')).toBe(15);
  });

  it('detects deviant prices', () => {
    for (let i = 0; i < 5; i++) anchor.recordPrice('gem', 10, 'hub1');
    expect(anchor.isDeviant('gem', 10)).toBe(false);
    expect(anchor.isDeviant('gem', 20)).toBe(true);
  });

  it('anchors deviant prices towards average', () => {
    for (let i = 0; i < 5; i++) anchor.recordPrice('gem', 10, 'hub1');
    const anchored = anchor.anchorPrice('gem', 20);
    expect(anchored).toBeLessThan(20);
    expect(anchored).toBeGreaterThan(10);
  });

  it('passes prices within deviation threshold', () => {
    for (let i = 0; i < 5; i++) anchor.recordPrice('gem', 10, 'hub1');
    const anchored = anchor.anchorPrice('gem', 11);
    expect(anchored).toBe(11);
  });
});
