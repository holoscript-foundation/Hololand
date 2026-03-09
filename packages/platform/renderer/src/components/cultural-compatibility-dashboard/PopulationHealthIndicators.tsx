/**
 * PopulationHealthIndicators Component
 *
 * Displays cross-model population health metrics:
 *   - Overall population health gauge (circular SVG)
 *   - Model family breakdown cards with cooperation/adherence scores
 *   - Diversity index and stability indicators
 *   - Per-model cooperation trend sparklines
 *   - Active/total agent counts
 *
 * Features:
 *   - SVG circular gauge for overall health
 *   - Model family cards with health badges
 *   - Mini sparkline trend charts per model
 *   - Diversity and stability meters
 *   - Population summary statistics
 *
 * Performance:
 *   - Max model families displayed: 10
 *   - Sparkline samples: max 60 per model
 *   - All SVG, no canvas or DOM-heavy operations
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="meter" on all gauges with aria-valuenow/min/max
 *   - role="list" / role="listitem" for model cards
 *   - Descriptive aria-labels on all metrics
 *   - Colour is NOT the sole health channel (text labels)
 *   - Minimum 4.5:1 contrast
 *
 * @module cultural-compatibility-dashboard/PopulationHealthIndicators
 */

import React, { useMemo } from 'react';
import type {
  PopulationHealthState,
  ModelPopulationHealth,
  CompatibilityDashboardTheme,
  PopulationHealthLevel,
} from './types';
import {
  DEFAULT_COMPATIBILITY_THEME,
  getHealthColor,
  formatScore,
} from './types';
import type { TimeSample } from '../../CulturalHealthTypes';

// =============================================================================
// PROPS
// =============================================================================

export interface PopulationHealthIndicatorsProps {
  /** Population health state */
  health: PopulationHealthState;
  /** Theme overrides */
  theme?: Partial<CompatibilityDashboardTheme>;
  /** Custom CSS styles */
  style?: React.CSSProperties;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PopulationHealthIndicators: React.FC<PopulationHealthIndicatorsProps> = ({
  health,
  theme: themeOverride,
  style,
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_COMPATIBILITY_THEME, ...themeOverride }),
    [themeOverride],
  );

  const healthColor = getHealthColor(health.overallHealth, theme);

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
    >
      {/* Panel header */}
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
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Population Health
        </span>
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: healthColor,
            textTransform: 'uppercase',
            border: `1px solid ${healthColor}`,
            borderRadius: '4px',
            padding: '0.1rem 0.4rem',
          }}
          role="status"
          aria-label={`Population health: ${health.overallHealth}`}
        >
          {health.overallHealth}
        </span>
      </div>

      {/* Summary row: gauge + metrics */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '0.5rem',
        }}
      >
        {/* Circular health gauge */}
        <HealthGauge
          value={health.overallCooperation}
          color={healthColor}
          theme={theme}
        />

        {/* Key metrics grid */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.4rem',
          }}
          role="status"
          aria-label="Population health summary metrics"
        >
          <MetricCell
            label="Agents"
            value={`${health.activeAgents}/${health.totalAgents}`}
            theme={theme}
          />
          <MetricCell
            label="Cooperation"
            value={formatScore(health.overallCooperation)}
            valueColor={healthColor}
            theme={theme}
          />
          <MetricCell
            label="Diversity"
            value={formatScore(health.diversityIndex)}
            valueColor={getHealthColor(
              health.diversityIndex >= 0.6 ? 'good' : health.diversityIndex >= 0.3 ? 'moderate' : 'poor',
              theme,
            )}
            theme={theme}
          />
          <MetricCell
            label="Stability"
            value={formatScore(health.stabilityScore)}
            valueColor={getHealthColor(
              health.stabilityScore >= 0.7 ? 'good' : health.stabilityScore >= 0.4 ? 'moderate' : 'poor',
              theme,
            )}
            theme={theme}
          />
        </div>
      </div>

      {/* Diversity and stability meters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <MeterBar
          label="Diversity Index"
          value={health.diversityIndex}
          theme={theme}
        />
        <MeterBar
          label="Stability"
          value={health.stabilityScore}
          theme={theme}
        />
      </div>

      {/* Model family breakdown */}
      {health.modelBreakdown.length > 0 && (
        <>
          <div
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.3rem',
            }}
          >
            Model Families ({health.modelBreakdown.length})
          </div>
          <div
            role="list"
            aria-label="Per-model-family health breakdown"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {health.modelBreakdown.map((model) => (
              <ModelFamilyCard
                key={model.modelFamily}
                model={model}
                theme={theme}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// HEALTH GAUGE (Circular SVG)
// =============================================================================

interface HealthGaugeProps {
  value: number;
  color: string;
  theme: CompatibilityDashboardTheme;
}

const HealthGauge: React.FC<HealthGaugeProps> = ({ value, color, theme }) => {
  const size = 64;
  const strokeWidth = 5;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * Math.max(0, Math.min(1, value));
  const offset = circumference - filled;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="meter"
      aria-label={`Overall cooperation: ${(value * 100).toFixed(0)}%`}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={theme.borderColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={`calc(0.75rem * ${theme.fontScale})`}
        fontWeight="700"
        fontFamily={theme.fontFamily}
      >
        {(value * 100).toFixed(0)}
      </text>
    </svg>
  );
};

// =============================================================================
// MODEL FAMILY CARD
// =============================================================================

interface ModelFamilyCardProps {
  model: ModelPopulationHealth;
  theme: CompatibilityDashboardTheme;
}

const ModelFamilyCard: React.FC<ModelFamilyCardProps> = ({ model, theme }) => {
  const healthColor = getHealthColor(model.health, theme);

  return (
    <div
      role="listitem"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.5rem',
        borderRadius: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        fontSize: `calc(0.7rem * ${theme.fontScale})`,
      }}
    >
      {/* Health dot */}
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: healthColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      {/* Model family name */}
      <span
        style={{
          color: theme.textSecondary,
          fontWeight: 600,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {model.modelFamily}
      </span>

      {/* Agent count */}
      <span
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          color: theme.textMuted,
          flexShrink: 0,
        }}
      >
        {model.agentCount} agents
      </span>

      {/* Cooperation score */}
      <span
        style={{
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
          color: healthColor,
          fontWeight: 600,
          flexShrink: 0,
          minWidth: '40px',
          textAlign: 'right',
        }}
      >
        {formatScore(model.averageCooperation)}
      </span>

      {/* Cross-model compatibility */}
      <span
        style={{
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          color: theme.textMuted,
          flexShrink: 0,
        }}
        title="Cross-model compatibility"
      >
        x{formatScore(model.crossModelCompatibility)}
      </span>

      {/* Mini sparkline */}
      {model.cooperationTrend.length >= 2 && (
        <MiniSparkline
          data={model.cooperationTrend}
          color={healthColor}
          width={50}
          height={14}
          theme={theme}
        />
      )}
    </div>
  );
};

// =============================================================================
// METRIC CELL
// =============================================================================

interface MetricCellProps {
  label: string;
  value: string;
  valueColor?: string;
  theme: CompatibilityDashboardTheme;
}

const MetricCell: React.FC<MetricCellProps> = ({
  label,
  value,
  valueColor,
  theme,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
    <span
      style={{
        fontSize: `calc(0.55rem * ${theme.fontScale})`,
        color: theme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: `calc(0.75rem * ${theme.fontScale})`,
        fontWeight: 600,
        color: valueColor ?? theme.textPrimary,
      }}
    >
      {value}
    </span>
  </div>
);

// =============================================================================
// METER BAR
// =============================================================================

interface MeterBarProps {
  label: string;
  value: number;
  theme: CompatibilityDashboardTheme;
}

const MeterBar: React.FC<MeterBarProps> = ({ label, value, theme }) => {
  const level: PopulationHealthLevel =
    value >= 0.7 ? 'good' : value >= 0.4 ? 'moderate' : 'poor';
  const color = getHealthColor(level, theme);

  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          color: theme.textMuted,
          marginBottom: '0.15rem',
        }}
      >
        <span>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{formatScore(value)}</span>
      </div>
      <div
        role="meter"
        aria-label={`${label}: ${formatScore(value)}`}
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
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
            width: `${value * 100}%`,
            borderRadius: '2px',
            backgroundColor: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

// =============================================================================
// MINI SPARKLINE
// =============================================================================

interface MiniSparklineProps {
  data: TimeSample[];
  color: string;
  width: number;
  height: number;
  theme: CompatibilityDashboardTheme;
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color,
  width,
  height,
  theme,
}) => {
  if (data.length < 2) return null;

  const padding = 1;
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((d.value - minVal) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PopulationHealthIndicators;
