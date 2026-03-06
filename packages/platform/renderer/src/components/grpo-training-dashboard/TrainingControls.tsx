/**
 * TrainingControls Component
 *
 * Parameter adjustment panel for GRPO training with
 * pause/resume, temperature, beta sliders, benchmark trigger,
 * and GPU/memory/step stats.
 *
 * Features:
 *   - Pause/Resume button with status indicator
 *   - Temperature slider (0.1 - 2.0)
 *   - Beta slider (0.001 - 0.2)
 *   - Trigger benchmark button
 *   - Current GPU utilization, memory, temperature stats
 *   - Training progress (step / total, elapsed, ETA)
 *   - WCAG 2.1 AA accessible (keyboard-navigable sliders)
 *
 * @module grpo-training-dashboard/TrainingControls
 */

import React, { useMemo, useCallback } from 'react';
import type {
  TrainingStatus,
  TrainingParams,
  TrainingProgress,
  GPUStats,
  GRPOTheme,
  GRPODashboardActions,
} from './types';
import {
  DEFAULT_GRPO_THEME,
  formatStep,
  formatDuration,
  formatPercent,
} from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface TrainingControlsProps {
  /** Current training status */
  status: TrainingStatus;
  /** Current training parameters */
  params: TrainingParams;
  /** Training progress */
  progress: TrainingProgress;
  /** GPU statistics (null if unavailable) */
  gpuStats: GPUStats | null;
  /** Whether dashboard is connected */
  connected: boolean;
  /** Dashboard actions */
  actions: GRPODashboardActions;
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

export const TrainingControls: React.FC<TrainingControlsProps> = ({
  status,
  params,
  progress,
  gpuStats,
  connected,
  actions,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'Training Controls',
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_GRPO_THEME, ...themeOverride }),
    [themeOverride],
  );

  const isRunning = status === 'running';
  const isDisabled = !connected || status === 'completed' || status === 'error';

  const statusColor = useMemo(() => {
    switch (status) {
      case 'running': return theme.successColor;
      case 'paused': return theme.warningColor;
      case 'completed': return theme.accentColor;
      case 'error': return theme.dangerColor;
      default: return theme.textMuted;
    }
  }, [status, theme]);

  const handlePauseResume = useCallback(() => {
    if (isRunning) {
      actions.pauseTraining();
    } else {
      actions.resumeTraining();
    }
  }, [isRunning, actions]);

  const handleTemperatureChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      actions.setTemperature(parseFloat(e.target.value));
    },
    [actions],
  );

  const handleBetaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      actions.setBeta(parseFloat(e.target.value));
    },
    [actions],
  );

  // Progress percentage
  const progressPct = progress.totalSteps > 0
    ? (progress.currentStep / progress.totalSteps) * 100
    : 0;

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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? statusColor : theme.textMuted,
              display: 'inline-block',
              boxShadow: isRunning ? `0 0 6px ${statusColor}` : 'none',
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: `calc(0.8rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textPrimary,
            }}
          >
            Controls
          </span>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: statusColor,
              border: `1px solid ${statusColor}`,
              borderRadius: '4px',
              padding: '0.1rem 0.35rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            role="status"
            aria-label={`Training status: ${status}`}
          >
            {status}
          </span>
        </div>
        {!connected && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.dangerColor,
            }}
          >
            Disconnected
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.2rem',
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
          }}
        >
          <span style={{ color: theme.textMuted }}>
            Step {formatStep(progress.currentStep)} / {formatStep(progress.totalSteps)}
          </span>
          <span style={{ color: theme.textSecondary }}>
            {progressPct.toFixed(1)}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Training progress"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            height: '6px',
            borderRadius: '3px',
            backgroundColor: theme.borderColor,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: '3px',
              backgroundColor: theme.accentColor,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.2rem',
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          <span>Elapsed: {formatDuration(progress.elapsedSeconds)}</span>
          <span>ETA: {formatDuration(progress.estimatedRemainingSeconds)}</span>
        </div>
      </div>

      {/* Pause/Resume + Benchmark buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={handlePauseResume}
          disabled={isDisabled}
          style={{
            flex: 1,
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            fontWeight: 600,
            fontFamily: theme.fontFamily,
            color: isRunning ? theme.warningColor : theme.successColor,
            backgroundColor: isRunning
              ? 'rgba(234, 179, 8, 0.1)'
              : 'rgba(34, 197, 94, 0.1)',
            border: `1px solid ${isRunning ? theme.warningColor : theme.successColor}`,
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
          aria-label={isRunning ? 'Pause training' : 'Resume training'}
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
        <button
          type="button"
          onClick={actions.triggerBenchmark}
          disabled={isDisabled}
          style={{
            flex: 1,
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            fontWeight: 600,
            fontFamily: theme.fontFamily,
            color: theme.accentColor,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: `1px solid ${theme.accentColor}`,
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
          aria-label="Trigger benchmark evaluation"
        >
          Run Benchmark
        </button>
      </div>

      {/* Temperature slider */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.2rem',
          }}
        >
          <label
            htmlFor="grpo-temperature"
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              color: theme.textSecondary,
              fontWeight: 600,
            }}
          >
            Temperature
          </label>
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textPrimary,
              fontWeight: 700,
            }}
          >
            {params.temperature.toFixed(2)}
          </span>
        </div>
        <input
          id="grpo-temperature"
          type="range"
          min={0.1}
          max={2.0}
          step={0.01}
          value={params.temperature}
          onChange={handleTemperatureChange}
          disabled={isDisabled}
          aria-valuemin={0.1}
          aria-valuemax={2.0}
          aria-valuenow={params.temperature}
          style={{
            width: '100%',
            height: '4px',
            appearance: 'auto',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            accentColor: theme.accentColor,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: `calc(0.5rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          <span>0.1</span>
          <span>2.0</span>
        </div>
      </div>

      {/* Beta slider */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.2rem',
          }}
        >
          <label
            htmlFor="grpo-beta"
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              color: theme.textSecondary,
              fontWeight: 600,
            }}
          >
            Beta (KL penalty)
          </label>
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textPrimary,
              fontWeight: 700,
            }}
          >
            {params.beta.toFixed(3)}
          </span>
        </div>
        <input
          id="grpo-beta"
          type="range"
          min={0.001}
          max={0.2}
          step={0.001}
          value={params.beta}
          onChange={handleBetaChange}
          disabled={isDisabled}
          aria-valuemin={0.001}
          aria-valuemax={0.2}
          aria-valuenow={params.beta}
          style={{
            width: '100%',
            height: '4px',
            appearance: 'auto',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            accentColor: theme.accentColor,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: `calc(0.5rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          <span>0.001</span>
          <span>0.200</span>
        </div>
      </div>

      {/* GPU Stats */}
      {gpuStats && (
        <div
          style={{
            borderTop: `1px solid ${theme.borderColor}`,
            paddingTop: '0.5rem',
          }}
        >
          <div
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.35rem',
            }}
          >
            GPU
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.35rem',
            }}
            role="status"
            aria-label="GPU statistics"
          >
            <StatCell
              label="Utilization"
              value={`${gpuStats.gpuUtilization.toFixed(0)}%`}
              valueColor={
                gpuStats.gpuUtilization > 95 ? theme.dangerColor
                  : gpuStats.gpuUtilization > 80 ? theme.warningColor
                    : theme.successColor
              }
              theme={theme}
            />
            <StatCell
              label="Memory"
              value={`${gpuStats.memoryUsedGB.toFixed(1)}/${gpuStats.memoryTotalGB.toFixed(0)}GB`}
              valueColor={
                gpuStats.memoryUsedGB / gpuStats.memoryTotalGB > 0.9 ? theme.dangerColor
                  : gpuStats.memoryUsedGB / gpuStats.memoryTotalGB > 0.75 ? theme.warningColor
                    : theme.textPrimary
              }
              theme={theme}
            />
            <StatCell
              label="Temperature"
              value={`${gpuStats.temperatureCelsius}°C`}
              valueColor={
                gpuStats.temperatureCelsius > 85 ? theme.dangerColor
                  : gpuStats.temperatureCelsius > 75 ? theme.warningColor
                    : theme.textPrimary
              }
              theme={theme}
            />
            <StatCell
              label="Step Rate"
              value={
                progress.elapsedSeconds > 0
                  ? `${(progress.currentStep / progress.elapsedSeconds).toFixed(1)}/s`
                  : '--'
              }
              theme={theme}
            />
          </div>

          {/* Memory usage bar */}
          <div style={{ marginTop: '0.35rem' }}>
            <div
              role="meter"
              aria-label={`GPU memory usage: ${gpuStats.memoryUsedGB.toFixed(1)} of ${gpuStats.memoryTotalGB.toFixed(0)} GB`}
              aria-valuenow={Math.round(gpuStats.memoryUsedGB)}
              aria-valuemin={0}
              aria-valuemax={Math.round(gpuStats.memoryTotalGB)}
              style={{
                height: '4px',
                borderRadius: '2px',
                backgroundColor: theme.borderColor,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min((gpuStats.memoryUsedGB / gpuStats.memoryTotalGB) * 100, 100)}%`,
                  borderRadius: '2px',
                  backgroundColor:
                    gpuStats.memoryUsedGB / gpuStats.memoryTotalGB > 0.9 ? theme.dangerColor
                      : gpuStats.memoryUsedGB / gpuStats.memoryTotalGB > 0.75 ? theme.warningColor
                        : theme.accentColor,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCellProps {
  label: string;
  value: string;
  valueColor?: string;
  theme: GRPOTheme;
}

const StatCell: React.FC<StatCellProps> = ({ label, value, valueColor, theme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
    <span
      style={{
        fontSize: `calc(0.5rem * ${theme.fontScale})`,
        color: theme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: `calc(0.7rem * ${theme.fontScale})`,
        fontWeight: 600,
        color: valueColor ?? theme.textPrimary,
      }}
    >
      {value}
    </span>
  </div>
);

export default TrainingControls;
