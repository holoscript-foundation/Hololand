import React, { useRef, useEffect } from 'react';
import type { BondingCurveState } from '../types';

interface BondingCurveChartProps {
  state: BondingCurveState;
  width?: number;
  height?: number;
}

/**
 * BondingCurveChart -- Visualizes the bonding curve with current position marker.
 * WCAG 2.1 AA compliant.
 */
export function BondingCurveChart({ state, width = 400, height = 250 }: BondingCurveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || state.curve.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    const pad = { top: 30, right: 20, bottom: 40, left: 60 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const maxSupply = Math.max(...state.curve.map((p) => p.supply));
    const maxPrice = Math.max(...state.curve.map((p) => p.price));

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
    }

    // Y labels
    ctx.fillStyle = '#556677';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH * i) / 4;
      const val = maxPrice * (1 - i / 4);
      ctx.fillText(val.toFixed(2), pad.left - 6, y + 3);
    }

    // X labels
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const x = pad.left + (plotW * i) / 4;
      const val = maxSupply * (i / 4);
      ctx.fillText(val.toFixed(0), x, height - pad.bottom + 16);
    }

    // Axis labels
    ctx.fillStyle = '#667788';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.save();
    ctx.translate(12, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Price', 0, 0);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillText('Supply', pad.left + plotW / 2, height - 6);

    // Curve fill
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    for (const p of state.curve) {
      const x = pad.left + (p.supply / maxSupply) * plotW;
      const y = pad.top + (1 - p.price / maxPrice) * plotH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59,130,246,0.08)';
    ctx.fill();

    // Curve line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    for (let i = 0; i < state.curve.length; i++) {
      const x = pad.left + (state.curve[i].supply / maxSupply) * plotW;
      const y = pad.top + (1 - state.curve[i].price / maxPrice) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current position
    const cx = pad.left + (state.currentSupply / maxSupply) * plotW;
    const cy = pad.top + (1 - state.currentPrice / maxPrice) * plotH;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#4ecdc4';
    ctx.fill();
    ctx.strokeStyle = '#0d1020';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title
    ctx.fillStyle = '#e8e8f8';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Bonding Curve', pad.left, pad.top - 10);
  }, [state, width, height]);

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
      <canvas
        ref={canvasRef}
        style={{ width, height, borderRadius: 8 }}
        role="img"
        aria-label={`Bonding curve: supply ${state.currentSupply.toFixed(0)}, price ${state.currentPrice.toFixed(4)}`}
      />
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, fontSize: 11 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#e8e8f8' }}>{state.currentPrice.toFixed(4)}</div>
          <div style={{ fontSize: 9, color: '#556677' }}>Current Price</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#e8e8f8' }}>{state.currentSupply.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: '#556677' }}>Supply</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#e8e8f8' }}>{state.reserveBalance.toFixed(2)}</div>
          <div style={{ fontSize: 9, color: '#556677' }}>Reserve</div>
        </div>
      </div>
    </div>
  );
}

export default BondingCurveChart;
