import React, { useRef, useEffect, useMemo } from 'react';
import type { RewardFunctionData } from './types';

interface GRPORewardChartProps {
  rewardFunctions: RewardFunctionData[];
  width?: number;
  height?: number;
}

/**
 * GRPORewardChart -- Renders per-reward-function training curves on a canvas.
 *
 * Displays one line per reward function with color coding, auto-scaling Y axis,
 * and a legend. Uses canvas for performance with high-frequency updates.
 */
export function GRPORewardChart({ rewardFunctions, width = 600, height = 300 }: GRPORewardChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const maxSteps = useMemo(
    () => Math.max(1, ...rewardFunctions.map((rf) => rf.values.length)),
    [rewardFunctions],
  );

  const { yMin, yMax } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const rf of rewardFunctions) {
      for (const v of rf.values) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 1;
    const padding = (max - min) * 0.1 || 0.1;
    return { yMin: min - padding, yMax: max + padding };
  }, [rewardFunctions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = 30 + ((height - 60) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = '#556677';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = 30 + ((height - 60) * i) / 4;
      const val = yMax - ((yMax - yMin) * i) / 4;
      ctx.fillText(val.toFixed(2), 45, y + 3);
    }

    // Draw curves
    const plotW = width - 70;
    const plotH = height - 60;
    const plotX = 50;
    const plotY = 30;

    for (const rf of rewardFunctions) {
      if (rf.values.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = rf.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < rf.values.length; i++) {
        const x = plotX + (i / (maxSteps - 1)) * plotW;
        const y = plotY + plotH - ((rf.values[i] - yMin) / (yMax - yMin)) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = '#b0b0c8';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Reward Functions', plotX, 18);
  }, [rewardFunctions, width, height, maxSteps, yMin, yMax]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width, height, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}
        role="img"
        aria-label="GRPO reward function training curves"
      />
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {rewardFunctions.map((rf) => (
          <div key={rf.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <span style={{ width: 12, height: 3, background: rf.color, borderRadius: 2, display: 'inline-block' }} />
            <span style={{ color: '#b0b0c8' }}>{rf.name}</span>
            <span style={{ color: '#556677' }}>
              (w={rf.weight.toFixed(1)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GRPORewardChart;
