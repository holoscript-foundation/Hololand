'use client';

import { useMemo } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { TriangleBudget } from './types';

// ---------------------------------------------------------------------------
// Default Budgets
// ---------------------------------------------------------------------------

const DEFAULT_BUDGETS: TriangleBudget[] = [
  {
    platform: 'quest',
    label: 'Quest',
    budget: 10000,
    current: 0,
    color: '#4cf680',
    warningThreshold: 0.8,
  },
  {
    platform: 'desktopVR',
    label: 'Desktop VR',
    budget: 150000,
    current: 0,
    color: '#4c9ef6',
    warningThreshold: 0.85,
  },
  {
    platform: 'mobileAR',
    label: 'Mobile AR',
    budget: 30000,
    current: 0,
    color: '#f6854c',
    warningThreshold: 0.8,
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatTriCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function getBarColor(ratio: number, baseColor: string, warningThreshold: number): string {
  if (ratio > 1.0) return '#ef4444';
  if (ratio > warningThreshold) return '#f59e0b';
  return baseColor;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TriangleBudgetDisplayProps {
  currentTriangleCount?: number;
  budgets?: TriangleBudget[];
}

export function TriangleBudgetDisplay({
  currentTriangleCount = 0,
  budgets: customBudgets,
}: TriangleBudgetDisplayProps) {
  const budgets = useMemo(() => {
    const base = customBudgets ?? DEFAULT_BUDGETS;
    return base.map((b) => ({
      ...b,
      current: currentTriangleCount,
    }));
  }, [customBudgets, currentTriangleCount]);

  const overBudgetPlatforms = useMemo(() => budgets.filter((b) => b.current > b.budget), [budgets]);

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      <SectionHeader
        title="Triangle Budget"
        description="Compare current mesh complexity against platform limits"
      />

      {/* Current Count */}
      <div className="studio-panel rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-studio-text font-mono">
          {formatTriCount(currentTriangleCount)}
        </div>
        <div className="text-xs text-studio-muted mt-1">Current Triangle Count</div>
      </div>

      {/* Budget Bars */}
      <section className="flex flex-col gap-4">
        {budgets.map((budget) => {
          const ratio = budget.budget > 0 ? budget.current / budget.budget : 0;
          const percentage = Math.min(ratio * 100, 100);
          const barColor = getBarColor(ratio, budget.color, budget.warningThreshold);
          const isOver = ratio > 1.0;
          const isWarning = ratio > budget.warningThreshold && !isOver;

          return (
            <div key={budget.platform} className="studio-panel rounded-lg p-3">
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: budget.color }}
                  />
                  <span className="text-xs font-semibold text-studio-text">{budget.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono ${
                      isOver
                        ? 'text-red-400 font-bold'
                        : isWarning
                          ? 'text-amber-400'
                          : 'text-studio-muted'
                    }`}
                  >
                    {formatTriCount(budget.current)} / {formatTriCount(budget.budget)}
                  </span>
                  {isOver && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">
                      OVER
                    </span>
                  )}
                  {isWarning && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">
                      WARN
                    </span>
                  )}
                </div>
              </div>

              {/* Bar */}
              <div className="w-full h-3 bg-studio-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                    boxShadow: isOver ? `0 0 8px ${barColor}40` : undefined,
                  }}
                />
              </div>

              {/* Scale markers */}
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-studio-muted">0</span>
                <span className="text-[9px] text-studio-muted">
                  {formatTriCount(budget.budget * 0.5)}
                </span>
                <span className="text-[9px] text-studio-muted">
                  {formatTriCount(budget.budget)}
                </span>
              </div>

              {/* Platform-specific info */}
              <div className="mt-2 text-[10px] text-studio-muted">
                {budget.platform === 'quest' && (
                  <span>Meta Quest 2/3 standalone limit for stable 72Hz rendering</span>
                )}
                {budget.platform === 'desktopVR' && (
                  <span>Desktop VR (PCVR) maximum for 90Hz with shadows and post-processing</span>
                )}
                {budget.platform === 'mobileAR' && (
                  <span>Mobile AR (iOS/Android) budget for 60fps AR rendering with occlusion</span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Optimization Suggestions */}
      {overBudgetPlatforms.length > 0 && (
        <section className="studio-panel rounded-lg p-3 border border-red-500/20">
          <div className="text-xs font-semibold text-red-400 mb-2">Optimization Required</div>
          <ul className="flex flex-col gap-1.5 text-[10px] text-studio-muted">
            <li className="flex items-start gap-1.5">
              <span className="text-red-400 mt-0.5">--</span>
              <span>Reduce polygon count using decimation or LOD generation</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-red-400 mt-0.5">--</span>
              <span>Merge overlapping meshes and remove internal geometry</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-red-400 mt-0.5">--</span>
              <span>Consider removing accessory meshes for constrained platforms</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-red-400 mt-0.5">--</span>
              <span>Use texture atlasing to reduce draw calls alongside triangle reduction</span>
            </li>
          </ul>
        </section>
      )}

      {/* Budget Legend */}
      <section className="studio-panel rounded-lg p-3">
        <div className="text-xs font-medium text-studio-muted mb-2">Budget Guidelines</div>
        <div className="flex flex-col gap-1.5 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1.5 rounded-full bg-green-500" />
            <span className="text-studio-muted">Under budget -- optimal performance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1.5 rounded-full bg-amber-500" />
            <span className="text-studio-muted">Warning zone -- approaching limit ({'>'}80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1.5 rounded-full bg-red-500" />
            <span className="text-studio-muted">
              Over budget -- performance degradation expected
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
