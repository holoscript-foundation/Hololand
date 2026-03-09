/**
 * Performance Metrics Display Component
 * Real-time performance monitoring for WebGPU simulations
 */

import React from 'react';
import type { PerformanceMetrics } from './types';

interface PerformanceMetricsProps {
  metrics: PerformanceMetrics;
}

export const PerformanceMetricsDisplay: React.FC<PerformanceMetricsProps> = ({ metrics }) => {
  const getPerformanceColor = (fps: number): string => {
    if (fps >= 60) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryColor = (usageMB: number): string => {
    if (usageMB < 500) return 'text-green-400';
    if (usageMB < 1000) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="performance-metrics bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* FPS */}
        <div className="metric-card bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400 mb-1">FPS</div>
          <div className={`text-2xl font-bold ${getPerformanceColor(metrics.fps)}`}>
            {metrics.fps.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.frameTimeMs.toFixed(2)}ms/frame
          </div>
        </div>

        {/* Compute Time */}
        <div className="metric-card bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400 mb-1">Compute Time</div>
          <div className="text-2xl font-bold text-blue-400">
            {metrics.computeTimeMs.toFixed(2)}ms
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {((metrics.computeTimeMs / metrics.frameTimeMs) * 100).toFixed(1)}% of frame
          </div>
        </div>

        {/* Render Time */}
        <div className="metric-card bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400 mb-1">Render Time</div>
          <div className="text-2xl font-bold text-purple-400">
            {metrics.renderTimeMs.toFixed(2)}ms
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {((metrics.renderTimeMs / metrics.frameTimeMs) * 100).toFixed(1)}% of frame
          </div>
        </div>

        {/* Memory Usage */}
        <div className="metric-card bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400 mb-1">Memory</div>
          <div className={`text-2xl font-bold ${getMemoryColor(metrics.memoryUsageMB)}`}>
            {metrics.memoryUsageMB.toFixed(0)}MB
          </div>
          <div className="text-xs text-gray-500 mt-1">
            System
          </div>
        </div>

        {/* GPU Memory */}
        <div className="metric-card bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400 mb-1">GPU Memory</div>
          <div className={`text-2xl font-bold ${getMemoryColor(metrics.gpuMemoryUsageMB)}`}>
            {metrics.gpuMemoryUsageMB.toFixed(0)}MB
          </div>
          <div className="text-xs text-gray-500 mt-1">
            VRAM
          </div>
        </div>

        {/* Particle Count */}
        <div className="metric-card bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400 mb-1">Particles</div>
          <div className="text-2xl font-bold text-cyan-400">
            {metrics.particleCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Active
          </div>
        </div>

        {/* Triangle Count */}
        <div className="metric-card bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400 mb-1">Triangles</div>
          <div className="text-2xl font-bold text-orange-400">
            {metrics.triangleCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Rendered
          </div>
        </div>

        {/* Draw Calls */}
        <div className="metric-card bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400 mb-1">Draw Calls</div>
          <div className="text-2xl font-bold text-pink-400">
            {metrics.drawCalls}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Per frame
          </div>
        </div>
      </div>

      {/* Shader Compile Time (if recent) */}
      {metrics.shaderCompileTimeMs > 0 && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Last Shader Compile</div>
          <div className="text-lg font-semibold text-yellow-400">
            {metrics.shaderCompileTimeMs.toFixed(0)}ms
          </div>
        </div>
      )}

      {/* Performance Budget indicator */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-2">Frame Budget (16.67ms @ 60 FPS)</div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              metrics.frameTimeMs <= 16.67
                ? 'bg-green-500'
                : metrics.frameTimeMs <= 33.33
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min((metrics.frameTimeMs / 33.33) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0ms</span>
          <span className="text-yellow-400">16.67ms</span>
          <span className="text-red-400">33.33ms</span>
        </div>
      </div>

      {/* Compute budget indicator */}
      <div className="mt-3">
        <div className="text-xs text-gray-400 mb-2">Compute Budget (8ms recommended)</div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              metrics.computeTimeMs <= 8
                ? 'bg-blue-500'
                : metrics.computeTimeMs <= 12
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min((metrics.computeTimeMs / 16) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0ms</span>
          <span className="text-yellow-400">8ms</span>
          <span className="text-red-400">16ms</span>
        </div>
      </div>
    </div>
  );
};
