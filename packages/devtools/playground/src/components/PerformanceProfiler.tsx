/**
 * Performance Profiler Component - Real-time performance monitoring
 */

import React, { useEffect, useState, useRef } from 'react';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'good' | 'warning' | 'critical';
}

interface PerformanceHistory {
  timestamp: number;
  fps: number;
  frameTime: number;
  memory: number;
  drawCalls: number;
}

const PerformanceProfiler: React.FC = () => {
  const { preview } = usePlaygroundStore();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [history, setHistory] = useState<PerformanceHistory[]>([]);
  const [showChart, setShowChart] = useState(true);
  const historyRef = useRef<PerformanceHistory[]>([]);
  const chartRef = useRef<HTMLCanvasElement | null>(null);

  // Update metrics
  useEffect(() => {
    const updateMetrics = () => {
      const memory = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0;

      const newMetrics: PerformanceMetric[] = [
        {
          name: 'FPS',
          value: preview.fps,
          unit: 'fps',
          threshold: 60,
          status: preview.fps >= 60 ? 'good' : preview.fps >= 30 ? 'warning' : 'critical',
        },
        {
          name: 'Frame Time',
          value: preview.renderTime,
          unit: 'ms',
          threshold: 16,
          status: preview.renderTime <= 16 ? 'good' : preview.renderTime <= 33 ? 'warning' : 'critical',
        },
        {
          name: 'Memory',
          value: memory,
          unit: 'MB',
          threshold: 200,
          status: memory <= 150 ? 'good' : memory <= 200 ? 'warning' : 'critical',
        },
        {
          name: 'Objects',
          value: preview.objectCount,
          unit: 'count',
          threshold: 1000,
          status: preview.objectCount <= 500 ? 'good' : preview.objectCount <= 1000 ? 'warning' : 'critical',
        },
      ];

      setMetrics(newMetrics);

      // Track history
      const histEntry: PerformanceHistory = {
        timestamp: Date.now(),
        fps: preview.fps,
        frameTime: preview.renderTime,
        memory: memory,
        drawCalls: 0, // Would come from Three.js
      };

      historyRef.current.push(histEntry);
      if (historyRef.current.length > 120) {
        historyRef.current.shift();
      }
      setHistory([...historyRef.current]);
    };

    const interval = setInterval(updateMetrics, 100);
    return () => clearInterval(interval);
  }, [preview.fps, preview.renderTime, preview.objectCount]);

  // Draw chart
  useEffect(() => {
    if (!showChart || !chartRef.current || history.length < 2) return;

    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw FPS line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < history.length; i++) {
      const x = (i / history.length) * width;
      const y = height - (history[i].fps / 60) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw frame time line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < history.length; i++) {
      const x = (i / history.length) * width;
      const y = height - (history[i].frameTime / 33) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw memory line
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < history.length; i++) {
      const x = (i / history.length) * width;
      const y = height - (history[i].memory / 300) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend
    ctx.font = '12px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText('FPS', 10, 20);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Frame Time', 70, 20);

    ctx.fillStyle = '#8b5cf6';
    ctx.fillText('Memory', 180, 20);
  }, [showChart, history]);

  const getMetricColor = (status: string): string => {
    switch (status) {
      case 'good':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getMetricBgColor = (status: string): string => {
    switch (status) {
      case 'good':
        return 'bg-green-900/20 border-green-700';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-700';
      case 'critical':
        return 'bg-red-900/20 border-red-700';
      default:
        return 'bg-gray-800/20 border-gray-700';
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-200">Performance Profiler</h3>
        <button
          onClick={() => setShowChart(!showChart)}
          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
        >
          {showChart ? '📊 Chart' : '📈 Graph'}
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {metrics.map((metric) => (
          <div
            key={metric.name}
            className={`p-2 rounded border ${getMetricBgColor(metric.status)}`}
          >
            <div className="text-xs text-gray-400">{metric.name}</div>
            <div className={`text-lg font-mono font-bold ${getMetricColor(metric.status)}`}>
              {metric.value.toFixed(1)}
              <span className="text-xs ml-1">{metric.unit}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Target: {metric.threshold}
              {metric.status === 'good' ? ' ✓' : metric.status === 'warning' ? ' ⚠' : ' ✗'}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {showChart && (
        <div className="flex-1 p-3 overflow-hidden border-t border-gray-700">
          <canvas ref={chartRef} width={400} height={200} className="w-full h-full" />
        </div>
      )}

      {/* History Table */}
      {!showChart && (
        <div className="flex-1 overflow-y-auto p-3 border-t border-gray-700">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-gray-800">
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-1">Time</th>
                <th className="text-right py-1">FPS</th>
                <th className="text-right py-1">Frame</th>
                <th className="text-right py-1">Memory</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().slice(0, 20).map((entry, index) => (
                <tr key={index} className="text-gray-300 border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-1">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="text-right">
                    <span className={getMetricColor(entry.fps >= 60 ? 'good' : entry.fps >= 30 ? 'warning' : 'critical')}>
                      {entry.fps.toFixed(0)}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={getMetricColor(entry.frameTime <= 16 ? 'good' : entry.frameTime <= 33 ? 'warning' : 'critical')}>
                      {entry.frameTime.toFixed(2)}ms
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={getMetricColor(entry.memory <= 150 ? 'good' : entry.memory <= 200 ? 'warning' : 'critical')}>
                      {entry.memory}MB
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tips */}
      <div className="border-t border-gray-700 bg-gray-800/50 p-3">
        <p className="text-xs text-gray-400">
          💡 <span className="font-semibold">Tips:</span> Green = optimal, Yellow = acceptable, Red = needs optimization
        </p>
      </div>
    </div>
  );
};

export default PerformanceProfiler;
