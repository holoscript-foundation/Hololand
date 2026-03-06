import React, { useRef, useEffect } from 'react';

interface FoveationHeatmapProps { data: number[][]; width?: number; height?: number; userId: string; }

export function FoveationHeatmap({ data, width = 200, height = 150, userId }: FoveationHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const rows = data.length;
    const cols = data[0]?.length ?? 1;
    const cellW = width / cols;
    const cellH = height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = data[r][c] ?? 0;
        const t = Math.min(v, 1);
        const red = Math.floor(255 * t);
        const green = Math.floor(255 * (1 - t) * 0.3);
        ctx.fillStyle = `rgb(${red},${green},80)`;
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }
  }, [data, width, height]);

  return <canvas ref={canvasRef} style={{ width, height, borderRadius: 6 }} role="img" aria-label={`Foveation heatmap for user ${userId}`} />;
}
export default FoveationHeatmap;
