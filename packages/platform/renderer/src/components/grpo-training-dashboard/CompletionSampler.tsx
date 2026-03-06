/**
 * CompletionSampler Component
 *
 * Card-based component showing the best and worst completion samples
 * from GRPO training with per-reward breakdowns.
 *
 * Features:
 *   - Current prompt text display
 *   - Best completion (green highlight) with total score
 *   - Worst completion (red highlight) with total score
 *   - Per-reward breakdown table for selected completion
 *   - Prev/Next navigation through completion groups
 *   - WCAG 2.1 AA accessible
 *
 * @module grpo-training-dashboard/CompletionSampler
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  CompletionGroup,
  CompletionSample,
  RewardSignalConfig,
  GRPOTheme,
} from './types';
import {
  DEFAULT_GRPO_THEME,
  DEFAULT_REWARD_CONFIGS,
  formatStep,
} from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface CompletionSamplerProps {
  /** Completion groups to navigate */
  groups: CompletionGroup[];
  /** Reward signal configs for breakdown table */
  signalConfigs?: RewardSignalConfig[];
  /** Theme overrides */
  theme?: Partial<GRPOTheme>;
  /** Custom CSS class */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label */
  ariaLabel?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CompletionSampler: React.FC<CompletionSamplerProps> = ({
  groups,
  signalConfigs = DEFAULT_REWARD_CONFIGS,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'Completion Sampler',
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_GRPO_THEME, ...themeOverride }),
    [themeOverride],
  );

  const [currentIndex, setCurrentIndex] = useState(Math.max(0, groups.length - 1));
  const [selectedCompletion, setSelectedCompletion] = useState<'best' | 'worst'>('best');

  // Clamp index
  const safeIndex = Math.max(0, Math.min(currentIndex, groups.length - 1));
  const currentGroup = groups.length > 0 ? groups[safeIndex] : null;

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(groups.length - 1, prev + 1));
  }, [groups.length]);

  if (groups.length === 0) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.borderColor}`,
          borderRadius: theme.borderRadius,
          padding: '1.5rem',
          textAlign: 'center',
          color: theme.textMuted,
          fontFamily: theme.fontFamily,
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          ...style,
        }}
        role="region"
        aria-label={ariaLabel}
      >
        No completion samples available yet.
      </div>
    );
  }

  const sample: CompletionSample = selectedCompletion === 'best'
    ? currentGroup!.best
    : currentGroup!.worst;

  // Non-composite signals for breakdown
  const breakdownConfigs = signalConfigs.filter((c) => c.name !== 'composite');

  return (
    <div
      className={className}
      style={{
        backgroundColor: theme.cardBackground,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: theme.borderRadius,
        padding: '0.75rem',
        fontFamily: theme.fontFamily,
        ...style,
      }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header with navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: `calc(0.8rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textPrimary,
          }}
        >
          Completions
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            Step {formatStep(currentGroup!.step)} ({safeIndex + 1}/{groups.length})
          </span>
          <button
            type="button"
            onClick={goToPrev}
            disabled={safeIndex === 0}
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontFamily: theme.fontFamily,
              color: safeIndex === 0 ? theme.textMuted : theme.textPrimary,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.borderColor}`,
              borderRadius: '4px',
              padding: '0.15rem 0.4rem',
              cursor: safeIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: safeIndex === 0 ? 0.4 : 1,
            }}
            aria-label="Previous completion group"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={safeIndex >= groups.length - 1}
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontFamily: theme.fontFamily,
              color: safeIndex >= groups.length - 1 ? theme.textMuted : theme.textPrimary,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.borderColor}`,
              borderRadius: '4px',
              padding: '0.15rem 0.4rem',
              cursor: safeIndex >= groups.length - 1 ? 'not-allowed' : 'pointer',
              opacity: safeIndex >= groups.length - 1 ? 0.4 : 1,
            }}
            aria-label="Next completion group"
          >
            Next
          </button>
        </div>
      </div>

      {/* Prompt */}
      <div
        style={{
          backgroundColor: theme.containerBackground,
          border: `1px solid ${theme.borderColor}`,
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <div
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.25rem',
          }}
        >
          Prompt
        </div>
        <div
          style={{
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            color: theme.textSecondary,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '80px',
            overflow: 'auto',
            lineHeight: 1.5,
          }}
        >
          {currentGroup!.prompt}
        </div>
      </div>

      {/* Best/Worst toggle */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.5rem',
        }}
        role="tablist"
        aria-label="Select completion type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedCompletion === 'best'}
          onClick={() => setSelectedCompletion('best')}
          style={{
            flex: 1,
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            fontWeight: 600,
            fontFamily: theme.fontFamily,
            color: selectedCompletion === 'best' ? theme.successColor : theme.textMuted,
            backgroundColor: selectedCompletion === 'best' ? theme.bestCompletionColor : 'transparent',
            border: `1px solid ${selectedCompletion === 'best' ? theme.successColor : theme.borderColor}`,
            borderRadius: '6px',
            padding: '0.4rem',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          Best ({currentGroup!.best.totalScore.toFixed(3)})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedCompletion === 'worst'}
          onClick={() => setSelectedCompletion('worst')}
          style={{
            flex: 1,
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            fontWeight: 600,
            fontFamily: theme.fontFamily,
            color: selectedCompletion === 'worst' ? theme.dangerColor : theme.textMuted,
            backgroundColor: selectedCompletion === 'worst' ? theme.worstCompletionColor : 'transparent',
            border: `1px solid ${selectedCompletion === 'worst' ? theme.dangerColor : theme.borderColor}`,
            borderRadius: '6px',
            padding: '0.4rem',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          Worst ({currentGroup!.worst.totalScore.toFixed(3)})
        </button>
      </div>

      {/* Completion text */}
      <div
        role="tabpanel"
        style={{
          backgroundColor: selectedCompletion === 'best'
            ? theme.bestCompletionColor
            : theme.worstCompletionColor,
          border: `1px solid ${selectedCompletion === 'best' ? theme.successColor : theme.dangerColor}`,
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <div
          style={{
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            color: theme.textPrimary,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '160px',
            overflow: 'auto',
            lineHeight: 1.5,
            fontFamily: 'monospace',
          }}
        >
          {sample.completion}
        </div>
      </div>

      {/* Per-reward breakdown table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
        }}
        aria-label={`Reward breakdown for ${selectedCompletion} completion`}
      >
        <thead>
          <tr>
            <th
              scope="col"
              style={{
                textAlign: 'left',
                color: theme.textMuted,
                fontWeight: 600,
                padding: '0.25rem 0.5rem',
                borderBottom: `1px solid ${theme.borderColor}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Reward
            </th>
            <th
              scope="col"
              style={{
                textAlign: 'center',
                color: theme.textMuted,
                fontWeight: 600,
                padding: '0.25rem 0.5rem',
                borderBottom: `1px solid ${theme.borderColor}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Weight
            </th>
            <th
              scope="col"
              style={{
                textAlign: 'right',
                color: theme.textMuted,
                fontWeight: 600,
                padding: '0.25rem 0.5rem',
                borderBottom: `1px solid ${theme.borderColor}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Score
            </th>
            <th
              scope="col"
              style={{
                textAlign: 'right',
                color: theme.textMuted,
                fontWeight: 600,
                padding: '0.25rem 0.5rem',
                borderBottom: `1px solid ${theme.borderColor}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Weighted
            </th>
          </tr>
        </thead>
        <tbody>
          {breakdownConfigs.map((cfg) => {
            const score = sample.rewardBreakdown[cfg.name] ?? 0;
            const weighted = cfg.weight !== null ? score * cfg.weight : score;
            return (
              <tr key={cfg.name}>
                <td
                  style={{
                    padding: '0.2rem 0.5rem',
                    color: cfg.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: cfg.color,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  {cfg.label}
                </td>
                <td
                  style={{
                    textAlign: 'center',
                    color: theme.textMuted,
                    padding: '0.2rem 0.5rem',
                  }}
                >
                  {cfg.weight !== null ? cfg.weight.toFixed(2) : '--'}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    color: theme.textPrimary,
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                  }}
                >
                  {score.toFixed(4)}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    color: theme.textSecondary,
                    padding: '0.2rem 0.5rem',
                  }}
                >
                  {weighted.toFixed(4)}
                </td>
              </tr>
            );
          })}
          {/* Total row */}
          <tr>
            <td
              colSpan={3}
              style={{
                textAlign: 'right',
                fontWeight: 700,
                color: theme.textPrimary,
                padding: '0.3rem 0.5rem',
                borderTop: `1px solid ${theme.borderColor}`,
              }}
            >
              Total
            </td>
            <td
              style={{
                textAlign: 'right',
                fontWeight: 700,
                color: selectedCompletion === 'best' ? theme.successColor : theme.dangerColor,
                padding: '0.3rem 0.5rem',
                borderTop: `1px solid ${theme.borderColor}`,
              }}
            >
              {sample.totalScore.toFixed(4)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default CompletionSampler;
