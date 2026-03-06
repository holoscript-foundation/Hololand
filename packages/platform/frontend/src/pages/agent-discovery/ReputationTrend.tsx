import React, { useRef, useEffect } from 'react';
import type { ReputationTrendPoint } from './types';

interface ReputationTrendProps { data: ReputationTrendPoint[]; width?: number; height?: number; }

export function ReputationTrend({ data, width = 300, height = 120 }: ReputationTrendProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0a0e1a'; ctx.fillRect(0, 0, width, height);

    const pad = 10;
    const pW = width - pad * 2;
    const pH = height - pad * 2;

    ctx.beginPath(); ctx.strokeStyle = '#4ecdc4'; ctx.lineWidth = 2;
    data.forEach((p, i) => {
      const x = pad + (i / (data.length - 1)) * pW;
      const y = pad + (1 - p.reputation / 100) * pH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, width, height]);

  return <canvas ref={canvasRef} style={{ width, height, borderRadius: 8 }} role="img" aria-label="Reputation trend over time" />;
}

export default ReputationTrend;
