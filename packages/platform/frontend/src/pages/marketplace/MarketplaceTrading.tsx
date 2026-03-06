import React, { useState, useCallback } from 'react';
import { BondingCurveViz } from './BondingCurveViz';
import { TradeConfirmation } from './TradeConfirmation';
import type { MarketState, TradeParams } from './types';

interface MarketplaceTradingProps {
  market: MarketState;
  onTrade?: (params: TradeParams) => Promise<void>;
}

/**
 * MarketplaceTrading -- Interactive marketplace trading UI with bonding curve.
 */
export function MarketplaceTrading({ market, onTrade }: MarketplaceTradingProps) {
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [maxSlippage, setMaxSlippage] = useState(0.02);
  const [showConfirm, setShowConfirm] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const estimatedPrice = numAmount > 0 ? market.currentPrice * (1 + (type === 'buy' ? 0.005 : -0.005) * numAmount / 100) : market.currentPrice;
  const estimatedTotal = numAmount * estimatedPrice;
  const estimatedSlippage = Math.abs(estimatedPrice - market.currentPrice) / market.currentPrice;

  const handleConfirm = useCallback(async () => {
    await onTrade?.({ type, amount: numAmount, maxSlippage });
    setShowConfirm(false);
    setAmount('');
  }, [type, numAmount, maxSlippage, onTrade]);

  const priceChangeColor = market.priceChange24h >= 0 ? '#4ade80' : '#f87171';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Marketplace Trading</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>Real-time bonding curve trading</p>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 20, fontWeight: 700, color: '#e8e8f8' }}>{market.currentPrice.toFixed(6)}</div><div style={{ fontSize: 9, color: '#556677' }}>Price</div></div>
        <div><div style={{ fontSize: 20, fontWeight: 700, color: priceChangeColor }}>{market.priceChange24h > 0 ? '+' : ''}{market.priceChange24h.toFixed(2)}%</div><div style={{ fontSize: 9, color: '#556677' }}>24h</div></div>
        <div><div style={{ fontSize: 20, fontWeight: 700, color: '#e8e8f8' }}>{market.volume24h.toLocaleString()}</div><div style={{ fontSize: 9, color: '#556677' }}>Volume</div></div>
        <div><div style={{ fontSize: 20, fontWeight: 700, color: '#e8e8f8' }}>{market.userTokens.toLocaleString()}</div><div style={{ fontSize: 9, color: '#556677' }}>Your Tokens</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Curve */}
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
          <BondingCurveViz market={market} previewAmount={numAmount > 0 ? numAmount : undefined} previewType={numAmount > 0 ? type : undefined} width={560} height={320} />
        </div>

        {/* Trade panel */}
        <div style={{ background: '#0d1020', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
          {showConfirm ? (
            <TradeConfirmation
              trade={{ type, amount: numAmount, maxSlippage }}
              market={market}
              estimatedPrice={estimatedPrice}
              estimatedTotal={estimatedTotal}
              estimatedSlippage={estimatedSlippage}
              onConfirm={handleConfirm}
              onCancel={() => setShowConfirm(false)}
            />
          ) : (
            <>
              {/* Buy/Sell toggle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 2 }}>
                {(['buy', 'sell'] as const).map((t) => (
                  <button key={t} onClick={() => setType(t)} style={{
                    flex: 1, padding: '8px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: type === t ? (t === 'buy' ? '#22c55e20' : '#ef444420') : 'transparent',
                    color: type === t ? (t === 'buy' ? '#4ade80' : '#f87171') : '#667788',
                  }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <label htmlFor="trade-amount" style={{ fontSize: 11, color: '#889', marginBottom: 4, display: 'block' }}>Amount</label>
              <input id="trade-amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e8f8', fontSize: 16, outline: 'none', marginBottom: 12, fontFamily: 'monospace' }} />

              {/* Slippage */}
              <label htmlFor="trade-slippage" style={{ fontSize: 11, color: '#889', marginBottom: 4, display: 'block' }}>Max Slippage</label>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {[0.005, 0.01, 0.02, 0.05].map((s) => (
                  <button key={s} onClick={() => setMaxSlippage(s)} style={{
                    flex: 1, padding: '6px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                    background: maxSlippage === s ? '#4ecdc420' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${maxSlippage === s ? '#4ecdc440' : 'rgba(255,255,255,0.06)'}`,
                    color: maxSlippage === s ? '#4ecdc4' : '#889',
                  }}>
                    {(s * 100).toFixed(1)}%
                  </button>
                ))}
              </div>

              {/* Preview */}
              {numAmount > 0 && (
                <div style={{ marginBottom: 12, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#889' }}>Est. Price</span><span style={{ color: '#e8e8f8' }}>{estimatedPrice.toFixed(6)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#889' }}>Est. Total</span><span style={{ color: '#e8e8f8' }}>{estimatedTotal.toFixed(4)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#889' }}>Slippage</span><span style={{ color: estimatedSlippage > maxSlippage ? '#f87171' : '#4ade80' }}>{(estimatedSlippage * 100).toFixed(2)}%</span></div>
                </div>
              )}

              <button onClick={() => numAmount > 0 && setShowConfirm(true)} disabled={numAmount <= 0} style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 700, cursor: numAmount > 0 ? 'pointer' : 'not-allowed',
                background: type === 'buy' ? '#22c55e' : '#ef4444', color: '#fff', opacity: numAmount > 0 ? 1 : 0.5,
              }}>
                {type === 'buy' ? 'Buy' : 'Sell'} Tokens
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarketplaceTrading;
