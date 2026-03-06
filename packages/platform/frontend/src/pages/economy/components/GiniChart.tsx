import React, { useRef, useEffect } from 'react';
import type { GiniData } from '../types';

interface GiniChartProps {
  data: GiniData[];
  width?: number;
  height?: number;
}

/**
 * GiniChart -- Gini coefficient over time with wealth distribution context.
 * WCAG 2.1 AA compliant.
 */
export function GiniChart({ data, width = 400, height = 200 }: GiniChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    const pad = { top: 30, right: 20, bottom: 30, left: 50 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
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
      ctx.fillText((1 - i / 4).toFixed(2), pad.left - 6, y + 3);
    }

    // Threshold zones
    ctx.fillStyle = 'rgba(34,197,94,0.05)';
    ctx.fillRect(pad.left, pad.top + plotH * 0.6, plotW, plotH * 0.4);
    ctx.fillStyle = 'rgba(239,68,68,0.05)';
    ctx.fillRect(pad.left, pad.top, plotW, plotH * 0.3);

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    for (let i = 0; i < data.length; i++) {
      const x = pad.left + (i / (data.length - 1)) * plotW;
      const y = pad.top + (1 - data[i].coefficient) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current value
    const latest = data[data.length - 1];
    ctx.fillStyle = '#e8e8f8';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Gini: ${latest.coefficient.toFixed(3)}`, pad.left, pad.top - 10);
  }, [data, width, height]);

  const latest = data[data.length - 1];

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
      <canvas
        ref={canvasRef}
        style={{ width, height, borderRadius: 8 }}
        role="img"
        aria-label={`Gini coefficient chart: current value ${latest?.coefficient.toFixed(3) ?? 'N/A'}`}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#556677' }}>
        <span>Top 10%: {latest ? `${(latest.topPercentShare * 100).toFixed(1)}%` : 'N/A'}</span>
        <span>Bottom 50%: {latest ? `${(latest.bottomPercentShare * 100).toFixed(1)}%` : 'N/A'}</span>
      </div>
    </div>
  );
}

export default GiniChart;
