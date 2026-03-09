/**
 * Benchmark Comparison Component
 * Compare simulation performance across different parameters
 */

import React, { useState } from 'react';
import type { BenchmarkResult, FluidSimulationParams, ParticleSystemParams, ClothPhysicsParams } from './types';

interface BenchmarkComparisonProps {
  benchmarks: BenchmarkResult[];
  onAddBenchmark: (
    simulationType: 'fluid' | 'particles' | 'cloth',
    params: FluidSimulationParams | ParticleSystemParams | ClothPhysicsParams,
    notes: string
  ) => void;
  onDeleteBenchmark: (id: string) => void;
  onExport: () => void;
  currentSimulation: 'fluid' | 'particles' | 'cloth' | null;
  disabled?: boolean;
}

export const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({
  benchmarks,
  onAddBenchmark,
  onDeleteBenchmark,
  onExport,
  currentSimulation,
  disabled = false,
}) => {
  const [benchmarkNotes, setBenchmarkNotes] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'fps' | 'computeTime'>('timestamp');

  const sortedBenchmarks = [...benchmarks].sort((a, b) => {
    switch (sortBy) {
      case 'timestamp':
        return b.timestamp - a.timestamp;
      case 'fps':
        return b.metrics.fps - a.metrics.fps;
      case 'computeTime':
        return a.metrics.computeTimeMs - b.metrics.computeTimeMs;
      default:
        return 0;
    }
  });

  const getBenchmarkColor = (fps: number): string => {
    if (fps >= 60) return 'bg-green-900/30 border-green-500';
    if (fps >= 30) return 'bg-yellow-900/30 border-yellow-500';
    return 'bg-red-900/30 border-red-500';
  };

  return (
    <div className="benchmark-comparison">
      <h3 className="text-lg font-semibold mb-4">Benchmark Comparison</h3>

      {/* Add Benchmark */}
      <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
        <h4 className="text-sm font-semibold mb-3">Capture Benchmark</h4>
        <input
          type="text"
          value={benchmarkNotes}
          onChange={e => setBenchmarkNotes(e.target.value)}
          placeholder="Benchmark notes (optional)"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm mb-3"
        />
        <button
          onClick={() => {
            if (currentSimulation) {
              // In real implementation, this would capture current params
              // For now, just show the concept
              setBenchmarkNotes('');
            }
          }}
          disabled={disabled || !currentSimulation}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Capture Current State
        </button>
      </div>

      {/* Sort Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {benchmarks.length} benchmark{benchmarks.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Sort by:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'timestamp' | 'fps' | 'computeTime')}
            className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          >
            <option value="timestamp">Date</option>
            <option value="fps">FPS</option>
            <option value="computeTime">Compute Time</option>
          </select>
        </div>
      </div>

      {/* Benchmarks List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedBenchmarks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No benchmarks captured yet
          </div>
        ) : (
          sortedBenchmarks.map(benchmark => (
            <div
              key={benchmark.id}
              className={`p-4 rounded border ${getBenchmarkColor(benchmark.metrics.fps)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">
                    {benchmark.simulationType.charAt(0).toUpperCase() + benchmark.simulationType.slice(1)} Simulation
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(benchmark.timestamp).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteBenchmark(benchmark.id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Delete
                </button>
              </div>

              {benchmark.notes && (
                <div className="text-sm text-gray-300 mb-3 italic">
                  "{benchmark.notes}"
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400">FPS</div>
                  <div className="font-semibold">{benchmark.metrics.fps.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Compute</div>
                  <div className="font-semibold">{benchmark.metrics.computeTimeMs.toFixed(2)}ms</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Memory</div>
                  <div className="font-semibold">{benchmark.metrics.memoryUsageMB.toFixed(0)}MB</div>
                </div>
              </div>

              {/* Parameter Summary */}
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                  View Parameters
                </summary>
                <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs font-mono">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(benchmark.params, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          ))
        )}
      </div>

      {/* Export */}
      {benchmarks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={onExport}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
          >
            Export All Benchmarks (JSON)
          </button>
        </div>
      )}

      {/* Statistics */}
      {benchmarks.length > 0 && (
        <div className="mt-4 p-4 bg-gray-800 rounded border border-gray-700">
          <h4 className="text-sm font-semibold mb-3">Statistics</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-400">Avg FPS</div>
              <div className="font-semibold">
                {(benchmarks.reduce((sum, b) => sum + b.metrics.fps, 0) / benchmarks.length).toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Max FPS</div>
              <div className="font-semibold text-green-400">
                {Math.max(...benchmarks.map(b => b.metrics.fps)).toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Avg Compute</div>
              <div className="font-semibold">
                {(benchmarks.reduce((sum, b) => sum + b.metrics.computeTimeMs, 0) / benchmarks.length).toFixed(2)}ms
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Min Compute</div>
              <div className="font-semibold text-green-400">
                {Math.min(...benchmarks.map(b => b.metrics.computeTimeMs)).toFixed(2)}ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
