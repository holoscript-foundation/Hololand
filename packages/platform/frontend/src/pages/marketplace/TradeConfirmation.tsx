import React from 'react';
import type { TradeParams, MarketState } from './types';

interface TradeConfirmationProps {
  trade: TradeParams;
  market: MarketState;
  estimatedPrice: number;
  estimatedTotal: number;
  estimatedSlippage: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * TradeConfirmation -- Confirmation dialog before executing a trade.
 */
export function TradeConfirmation({ trade, market, estimatedPrice, estimatedTotal, estimatedSlippage, onConfirm, onCancel }: TradeConfirmationProps) {
  const isBuy = trade.type === 'buy';
  const slippageWarning = estimatedSlippage > trade.maxSlippage;

  return (
    <div
      style={{
        background: '#0d1020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 20,
        maxWidth: 380, color: '#d0d0e8', fontFamily: "'Inter', sans-serif",
      }}
      role="dialog"
      aria-label="Trade confirmation"
    >
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f8', marginBottom: 16, textAlign: 'center' }}>
        Confirm {isBuy ? 'Buy' : 'Sell'} Order
      </h3>

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Amount', value: `${trade.amount.toLocaleString()} tokens` },
          { label: 'Current Price', value: `${market.currentPrice.toFixed(6)}` },
          { label: 'Estimated Price', value: `${estimatedPrice.toFixed(6)}` },
          { label: 'Estimated Total', value: `${estimatedTotal.toFixed(4)}` },
          { label: 'Slippage', value: `${(estimatedSlippage * 100).toFixed(2)}%`, warn: slippageWarning },
        ].map(({ label, value, warn }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: '#889' }}>{label}</span>
            <span style={{ color: warn ? '#f87171' : '#e8e8f8', fontFamily: 'monospace', fontWeight: warn ? 700 : 400 }}>{value}</span>
          </div>
        ))}
      </div>

      {slippageWarning && (
        <div style={{ padding: 8, background: '#ef444415', border: '1px solid #ef444430', borderRadius: 6, fontSize: 11, color: '#f87171', marginBottom: 12 }} role="alert">
          Slippage exceeds your max tolerance of {(trade.maxSlippage * 100).toFixed(1)}%
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#889', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={slippageWarning}
          style={{
            flex: 1, padding: '10px',
            background: isBuy ? '#22c55e20' : '#ef444420',
            border: `1px solid ${isBuy ? '#22c55e40' : '#ef444440'}`,
            borderRadius: 8, color: isBuy ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 600,
            cursor: slippageWarning ? 'not-allowed' : 'pointer', opacity: slippageWarning ? 0.5 : 1,
          }}
        >
          {isBuy ? 'Buy' : 'Sell'}
        </button>
      </div>
    </div>
  );
}

export default TradeConfirmation;
