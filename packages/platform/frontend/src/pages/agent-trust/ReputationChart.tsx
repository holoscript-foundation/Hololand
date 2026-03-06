import React, { useRef, useEffect } from 'react';
import type { AgentTrustInfo } from './types';

interface ReputationChartProps { agent: AgentTrustInfo; width?: number; height?: number; }

export function ReputationChart({ agent, width = 300, height = 150 }: ReputationChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || agent.history.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0a0e1a'; ctx.fillRect(0, 0, width, height);

    const pad = { top: 10, right: 10, bottom: 20, left: 40 };
    const pW = width - pad.left - pad.right;
    const pH = height - pad.top - pad.bottom;
    const maxRep = 100;

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = pad.top + (pH * i) / 4; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke(); }

    ctx.beginPath(); ctx.strokeStyle = '#4ecdc4'; ctx.lineWidth = 2;
    agent.history.forEach((p, i) => {
      const x = pad.left + (i / (agent.history.length - 1)) * pW;
      const y = pad.top + (1 - p.reputation / maxRep) * pH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [agent, width, height]);

  return (
    <canvas ref={canvasRef} style={{ width, height, borderRadius: 8 }} role="img" aria-label={`Reputation history for ${agent.name}: current ${agent.reputation}`} />
  );
}

export default ReputationChart;
