import React, { useRef, useEffect } from 'react';
import type { MarketState } from './types';

interface BondingCurveVizProps {
  market: MarketState;
  previewAmount?: number;
  previewType?: 'buy' | 'sell';
  width?: number;
  height?: number;
}

/**
 * BondingCurveViz -- Interactive bonding curve with trade preview overlay.
 */
export function BondingCurveViz({ market, previewAmount, previewType, width = 500, height = 300 }: BondingCurveVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || market.curve.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    const pad = { top: 20, right: 20, bottom: 30, left: 55 };
    const pW = width - pad.left - pad.right;
    const pH = height - pad.top - pad.bottom;
    const maxS = Math.max(...market.curve.map((p) => p.supply));
    const maxP = Math.max(...market.curve.map((p) => p.price));

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (pH * i) / 4;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
    }

    // Curve fill
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + pH);
    for (const p of market.curve) {
      ctx.lineTo(pad.left + (p.supply / maxS) * pW, pad.top + (1 - p.price / maxP) * pH);
    }
    ctx.lineTo(pad.left + pW, pad.top + pH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59,130,246,0.06)';
    ctx.fill();

    // Curve line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    market.curve.forEach((p, i) => {
      const x = pad.left + (p.supply / maxS) * pW;
      const y = pad.top + (1 - p.price / maxP) * pH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Preview zone
    if (previewAmount && previewType) {
      const curIdx = market.curve.findIndex((p) => p.supply >= market.currentSupply);
      const futureSupply = previewType === 'buy' ? market.currentSupply + previewAmount : market.currentSupply - previewAmount;
      const curX = pad.left + (market.currentSupply / maxS) * pW;
      const futX = pad.left + (Math.max(0, futureSupply) / maxS) * pW;
      ctx.fillStyle = previewType === 'buy' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
      ctx.fillRect(Math.min(curX, futX), pad.top, Math.abs(futX - curX), pH);
    }

    // Current position dot
    const cx = pad.left + (market.currentSupply / maxS) * pW;
    const cy = pad.top + (1 - market.currentPrice / maxP) * pH;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#4ecdc4';
    ctx.fill();
    ctx.strokeStyle = '#0a0e1a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [market, previewAmount, previewType, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}
      role="img"
      aria-label={`Bonding curve: price ${market.currentPrice.toFixed(4)} at supply ${market.currentSupply.toLocaleString()}`}
    />
  );
}

export default BondingCurveViz;
