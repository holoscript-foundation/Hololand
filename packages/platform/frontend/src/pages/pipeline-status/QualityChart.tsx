import React, { useRef, useEffect } from 'react';
import type { QualityPoint } from './types';

interface QualityChartProps { data: QualityPoint[]; target: number; width?: number; height?: number; }

export function QualityChart({ data, target, width = 500, height = 200 }: QualityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0a0e1a'; ctx.fillRect(0, 0, width, height);
    const pad = { top: 20, right: 10, bottom: 20, left: 40 };
    const pW = width - pad.left - pad.right;
    const pH = height - pad.top - pad.bottom;

    // Target line
    const ty = pad.top + (1 - target / 100) * pH;
    ctx.strokeStyle = '#4ade8040'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pad.left, ty); ctx.lineTo(width - pad.right, ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#4ade80'; ctx.font = '9px Inter'; ctx.textAlign = 'left'; ctx.fillText(`Target: ${target}`, pad.left, ty - 4);

    // Quality line
    ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
    data.forEach((p, i) => {
      const x = pad.left + (i / (data.length - 1)) * pW;
      const y = pad.top + (1 - p.score / 100) * pH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, target, width, height]);

  return <canvas ref={canvasRef} style={{ width, height, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }} role="img" aria-label={`Quality score chart: latest ${data[data.length - 1]?.score.toFixed(1) ?? 'N/A'}`} />;
}
export default QualityChart;
