/**
 * CalibrationUncertaintyIndicator Component
 *
 * Displays calibrated uncertainty that is **inversely correlated** with raw
 * model confidence.  Based on MIT research showing that models are ~34% more
 * confident when they are wrong, this component applies an inverse calibration
 * curve so that extremely high raw confidence actually _raises_ the displayed
 * uncertainty.
 *
 * Key insight: naive confidence bars mislead operators because overconfidence
 * is the dominant failure mode of modern LLMs.  By inverting the display this
 * component communicates risk more honestly.
 *
 * Visual design:
 *   - SVG ring gauge showing calibrated uncertainty (0-100%)
 *   - Raw vs calibrated comparison bar
 *   - Risk tier badge (low / moderate / elevated / high)
 *   - Optional sparkline of recent calibration history
 *
 * Follows the PostProcessingControls / RealTimePerformanceMonitor inline-style
 * pattern used across the admin dashboard components.
 *
 * @module confidence-ui/CalibrationUncertaintyIndicator
 */

import React, { useMemo, type CSSProperties } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/** A single snapshot in the calibration history feed */
export interface CalibrationSnapshot {
  /** Unix epoch ms */
  timestamp: number;
  /** Raw model confidence (0-1) */
  rawConfidence: number;
  /** Whether the prediction was ultimately correct (null = unknown) */
  wasCorrect: boolean | null;
}

/** Risk tier derived from calibrated uncertainty */
export type UncertaintyRisk = 'low' | 'moderate' | 'elevated' | 'high';

export interface CalibrationUncertaintyIndicatorProps {
  /** Raw model confidence score (0-1) */
  rawConfidence: number;
  /** Model / source identifier (optional label) */
  modelId?: string;
  /** Historical snapshots for the sparkline (most recent last) */
  history?: CalibrationSnapshot[];
  /**
   * Overconfidence factor derived from empirical testing.
   * MIT baseline: 0.34 (models are 34% more confident when wrong).
   * @default 0.34
   */
  overconfidenceFactor?: number;
  /**
   * Confidence threshold above which the overconfidence penalty kicks in.
   * @default 0.80
   */
  penaltyThreshold?: number;
  /** Whether to show the raw vs calibrated comparison bar */
  showComparison?: boolean;
  /** Whether to show the sparkline history */
  showHistory?: boolean;
  /** Optional CSS class */
  className?: string;
  /** Optional inline styles on the root element */
  style?: CSSProperties;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COLORS = {
  bg: '#0f0f19',
  bgCard: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.04)',
  textPrimary: '#d4d4d8',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  textDim: '#52525b',
  success: '#4ade80',
  successBg: 'rgba(74, 222, 128, 0.15)',
  warning: '#fbbf24',
  warningBg: 'rgba(251, 191, 36, 0.15)',
  error: '#f87171',
  errorBg: 'rgba(248, 113, 113, 0.15)',
  info: '#60a5fa',
  infoBg: 'rgba(96, 165, 250, 0.15)',
  accent: '#818cf8',
  accentBg: 'rgba(99, 102, 241, 0.2)',
  elevated: '#f97316',
  elevatedBg: 'rgba(249, 115, 22, 0.15)',
} as const;

const FONTS = {
  mono: '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

const RISK_CONFIG: Record<UncertaintyRisk, { label: string; color: string; bgColor: string; description: string }> = {
  low: {
    label: 'LOW RISK',
    color: COLORS.success,
    bgColor: COLORS.successBg,
    description: 'Calibrated uncertainty is low -- prediction likely reliable',
  },
  moderate: {
    label: 'MODERATE',
    color: COLORS.info,
    bgColor: COLORS.infoBg,
    description: 'Some uncertainty -- consider verifying critical decisions',
  },
  elevated: {
    label: 'ELEVATED',
    color: COLORS.elevated,
    bgColor: COLORS.elevatedBg,
    description: 'Model may be overconfident -- independent verification recommended',
  },
  high: {
    label: 'HIGH RISK',
    color: COLORS.error,
    bgColor: COLORS.errorBg,
    description: 'Strong overconfidence signal -- do not rely on this prediction alone',
  },
};

const GAUGE_SIZE = 72;
const GAUGE_STROKE = 5;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

const SPARKLINE_WIDTH = 140;
const SPARKLINE_HEIGHT = 28;
const MAX_SPARKLINE_POINTS = 40;

// =============================================================================
// CALIBRATION ALGORITHM
// =============================================================================

/**
 * Compute calibrated uncertainty from raw model confidence.
 *
 * The calibration applies an overconfidence penalty when raw confidence exceeds
 * a threshold.  The penalty increases non-linearly (quadratic) as confidence
 * approaches 1.0, reflecting the MIT finding that extreme confidence is the
 * strongest predictor of error.
 *
 * Formula:
 *   excess     = max(0, rawConfidence - threshold)
 *   penalty    = overconfidenceFactor * (excess / (1 - threshold))^2
 *   adjusted   = rawConfidence * (1 - penalty)
 *   uncertainty = 1 - adjusted
 *
 * For rawConfidence = 0.99, threshold = 0.80, factor = 0.34:
 *   excess     = 0.19
 *   penalty    = 0.34 * (0.19/0.20)^2 = 0.34 * 0.9025 = 0.307
 *   adjusted   = 0.99 * (1 - 0.307) = 0.686
 *   uncertainty = 0.314  (31.4%)
 *
 * This means a model reporting 99% confidence actually has ~31% calibrated
 * uncertainty -- a dramatically different risk picture.
 */
export function computeCalibratedUncertainty(
  rawConfidence: number,
  overconfidenceFactor: number = 0.34,
  penaltyThreshold: number = 0.80,
): { calibratedUncertainty: number; adjustedConfidence: number; penalty: number; risk: UncertaintyRisk } {
  const clamped = Math.max(0, Math.min(1, rawConfidence));
  const clampedThreshold = Math.max(0.01, Math.min(0.99, penaltyThreshold));

  const excess = Math.max(0, clamped - clampedThreshold);
  const normalizedExcess = excess / (1 - clampedThreshold);
  const penalty = overconfidenceFactor * normalizedExcess * normalizedExcess;
  const adjustedConfidence = clamped * (1 - penalty);
  const calibratedUncertainty = 1 - Math.max(0, Math.min(1, adjustedConfidence));

  let risk: UncertaintyRisk;
  if (calibratedUncertainty < 0.15) {
    risk = 'low';
  } else if (calibratedUncertainty < 0.30) {
    risk = 'moderate';
  } else if (calibratedUncertainty < 0.50) {
    risk = 'elevated';
  } else {
    risk = 'high';
  }

  return { calibratedUncertainty, adjustedConfidence, penalty, risk };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Risk tier badge */
const RiskBadge: React.FC<{ risk: UncertaintyRisk }> = ({ risk }) => {
  const cfg = RISK_CONFIG[risk];
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        fontFamily: FONTS.mono,
        padding: '2px 8px',
        borderRadius: 8,
        backgroundColor: cfg.bgColor,
        color: cfg.color,
        display: 'inline-flex',
        alignItems: 'center',
        letterSpacing: '0.06em',
      }}
      role="status"
      aria-label={`Risk level: ${cfg.label}`}
    >
      {cfg.label}
    </span>
  );
};

/** SVG ring gauge for calibrated uncertainty */
const UncertaintyGauge: React.FC<{
  uncertainty: number;
  riskColor: string;
}> = ({ uncertainty, riskColor }) => {
  const fillLength = uncertainty * GAUGE_CIRCUMFERENCE;
  const pctText = `${(uncertainty * 100).toFixed(0)}%`;

  return (
    <div style={{ position: 'relative', width: GAUGE_SIZE, height: GAUGE_SIZE, flexShrink: 0 }}>
      <svg width={GAUGE_SIZE} height={GAUGE_SIZE} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}>
        {/* Track */}
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke={COLORS.border}
          strokeWidth={GAUGE_STROKE}
        />
        {/* Fill */}
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke={riskColor}
          strokeWidth={GAUGE_STROKE}
          strokeDasharray={`${fillLength} ${GAUGE_CIRCUMFERENCE}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: FONTS.mono,
            fontVariantNumeric: 'tabular-nums',
            color: riskColor,
            lineHeight: 1,
          }}
          role="status"
          aria-label={`Calibrated uncertainty: ${pctText}`}
        >
          {pctText}
        </div>
        <div style={{ fontSize: 7, color: COLORS.textDim, marginTop: 1 }}>uncertainty</div>
      </div>
    </div>
  );
};

/** Comparison bar showing raw vs calibrated */
const ComparisonBar: React.FC<{
  rawConfidence: number;
  adjustedConfidence: number;
  calibratedUncertainty: number;
  riskColor: string;
}> = ({ rawConfidence, adjustedConfidence, calibratedUncertainty, riskColor }) => {
  const barHeight = 6;
  const barRadius = 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      {/* Raw confidence */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 8, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Raw Confidence
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, fontFamily: FONTS.mono, color: COLORS.accent, fontVariantNumeric: 'tabular-nums' }}>
            {(rawConfidence * 100).toFixed(1)}%
          </span>
        </div>
        <div
          style={{ width: '100%', height: barHeight, borderRadius: barRadius, backgroundColor: COLORS.border, overflow: 'hidden' }}
          role="meter"
          aria-label={`Raw confidence: ${(rawConfidence * 100).toFixed(1)}%`}
          aria-valuenow={Math.round(rawConfidence * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{
              height: '100%',
              width: `${rawConfidence * 100}%`,
              backgroundColor: COLORS.accent,
              borderRadius: barRadius,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Adjusted (calibrated) confidence */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 8, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Calibrated Confidence
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, fontFamily: FONTS.mono, color: riskColor, fontVariantNumeric: 'tabular-nums' }}>
            {(adjustedConfidence * 100).toFixed(1)}%
          </span>
        </div>
        <div
          style={{ width: '100%', height: barHeight, borderRadius: barRadius, backgroundColor: COLORS.border, overflow: 'hidden' }}
          role="meter"
          aria-label={`Calibrated confidence: ${(adjustedConfidence * 100).toFixed(1)}%`}
          aria-valuenow={Math.round(adjustedConfidence * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{
              height: '100%',
              width: `${adjustedConfidence * 100}%`,
              backgroundColor: riskColor,
              borderRadius: barRadius,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Delta indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 7, color: COLORS.textDim }}>
          Overconfidence penalty:
        </span>
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            fontFamily: FONTS.mono,
            color: calibratedUncertainty > 0.30 ? COLORS.error : calibratedUncertainty > 0.15 ? COLORS.warning : COLORS.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {rawConfidence > adjustedConfidence ? '-' : ''}{((rawConfidence - adjustedConfidence) * 100).toFixed(1)}pp
        </span>
      </div>
    </div>
  );
};

/** Sparkline of recent calibrated uncertainty values */
const UncertaintySparkline: React.FC<{
  history: CalibrationSnapshot[];
  overconfidenceFactor: number;
  penaltyThreshold: number;
}> = ({ history, overconfidenceFactor, penaltyThreshold }) => {
  const recentSnapshots = history.slice(-MAX_SPARKLINE_POINTS);
  if (recentSnapshots.length < 2) return null;

  const uncertaintyValues = recentSnapshots.map(
    (s) => computeCalibratedUncertainty(s.rawConfidence, overconfidenceFactor, penaltyThreshold).calibratedUncertainty,
  );

  const minV = 0;
  const maxV = 1;
  const range = maxV - minV;

  const points = uncertaintyValues.map((v, i) => {
    const x = (i / (uncertaintyValues.length - 1)) * SPARKLINE_WIDTH;
    const y = SPARKLINE_HEIGHT - ((v - minV) / range) * (SPARKLINE_HEIGHT - 2) - 1;
    return `${x},${y}`;
  });

  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT} L0,${SPARKLINE_HEIGHT} Z`;

  // Color the dots by correctness if available
  const lastValue = uncertaintyValues[uncertaintyValues.length - 1];
  const lineColor = lastValue > 0.50
    ? COLORS.error
    : lastValue > 0.30
      ? COLORS.elevated
      : lastValue > 0.15
        ? COLORS.info
        : COLORS.success;

  return (
    <div>
      <div style={{ fontSize: 8, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        Uncertainty History ({recentSnapshots.length} samples)
      </div>
      <svg
        width={SPARKLINE_WIDTH}
        height={SPARKLINE_HEIGHT}
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        role="img"
        aria-label="Calibrated uncertainty history sparkline"
        style={{ display: 'block' }}
      >
        <path d={areaPath} fill={`${lineColor}15`} />
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.5" />
        {/* Correctness dots */}
        {recentSnapshots.map((snapshot, i) => {
          if (snapshot.wasCorrect === null) return null;
          const x = (i / (recentSnapshots.length - 1)) * SPARKLINE_WIDTH;
          const y = SPARKLINE_HEIGHT - ((uncertaintyValues[i] - minV) / range) * (SPARKLINE_HEIGHT - 2) - 1;
          return (
            <circle
              key={snapshot.timestamp}
              cx={x}
              cy={y}
              r="2"
              fill={snapshot.wasCorrect ? COLORS.success : COLORS.error}
              opacity={0.8}
            />
          );
        })}
        {/* Current value dot */}
        <circle
          cx={SPARKLINE_WIDTH}
          cy={SPARKLINE_HEIGHT - ((lastValue - minV) / range) * (SPARKLINE_HEIGHT - 2) - 1}
          r="2.5"
          fill={lineColor}
        />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 7, color: COLORS.textDim }}>older</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 7, color: COLORS.success }}>correct</span>
          <span style={{ fontSize: 7, color: COLORS.error }}>wrong</span>
        </div>
        <span style={{ fontSize: 7, color: COLORS.textDim }}>now</span>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CalibrationUncertaintyIndicator
 *
 * Renders a calibrated uncertainty display that inversely correlates with raw
 * model confidence.  When a model reports very high confidence the indicator
 * shows _more_ uncertainty, reflecting the empirical finding that
 * overconfidence is the strongest predictor of model error.
 */
export const CalibrationUncertaintyIndicator = React.memo<CalibrationUncertaintyIndicatorProps>(
  function CalibrationUncertaintyIndicator({
    rawConfidence,
    modelId,
    history = [],
    overconfidenceFactor = 0.34,
    penaltyThreshold = 0.80,
    showComparison = true,
    showHistory = true,
    className,
    style,
  }) {
    const calibration = useMemo(
      () => computeCalibratedUncertainty(rawConfidence, overconfidenceFactor, penaltyThreshold),
      [rawConfidence, overconfidenceFactor, penaltyThreshold],
    );

    const riskConfig = RISK_CONFIG[calibration.risk];

    return (
      <div
        className={className}
        style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          lineHeight: 1.5,
          color: COLORS.textPrimary,
          backgroundColor: 'rgba(15, 15, 25, 0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: 10,
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          ...style,
        }}
        role="region"
        aria-label="Calibration uncertainty indicator"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: COLORS.textSecondary,
              }}
            >
              Calibrated Uncertainty
            </span>
            {modelId && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 8,
                  backgroundColor: COLORS.accentBg,
                  color: COLORS.accent,
                }}
              >
                {modelId}
              </span>
            )}
          </div>
          <RiskBadge risk={calibration.risk} />
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          {/* Top section: gauge + description */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <UncertaintyGauge
              uncertainty={calibration.calibratedUncertainty}
              riskColor={riskConfig.color}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>
                {riskConfig.description}
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: COLORS.textDim,
                  padding: '6px 8px',
                  backgroundColor: COLORS.bgCard,
                  borderRadius: 4,
                  border: `1px solid ${COLORS.borderLight}`,
                  lineHeight: 1.6,
                }}
              >
                Models are <span style={{ color: COLORS.warning, fontWeight: 700 }}>~{(overconfidenceFactor * 100).toFixed(0)}%</span> more
                confident when wrong (MIT). Raw confidence above{' '}
                <span style={{ color: COLORS.accent, fontWeight: 600 }}>{(penaltyThreshold * 100).toFixed(0)}%</span> triggers
                inverse calibration.
              </div>
            </div>
          </div>

          {/* Comparison bars */}
          {showComparison && (
            <div
              style={{
                padding: '12px',
                backgroundColor: COLORS.bgCard,
                borderRadius: 6,
                border: `1px solid ${COLORS.borderLight}`,
                marginBottom: showHistory && history.length >= 2 ? 16 : 0,
              }}
            >
              <ComparisonBar
                rawConfidence={rawConfidence}
                adjustedConfidence={calibration.adjustedConfidence}
                calibratedUncertainty={calibration.calibratedUncertainty}
                riskColor={riskConfig.color}
              />
            </div>
          )}

          {/* Sparkline history */}
          {showHistory && history.length >= 2 && (
            <div
              style={{
                padding: '12px',
                backgroundColor: COLORS.bgCard,
                borderRadius: 6,
                border: `1px solid ${COLORS.borderLight}`,
              }}
            >
              <UncertaintySparkline
                history={history}
                overconfidenceFactor={overconfidenceFactor}
                penaltyThreshold={penaltyThreshold}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default CalibrationUncertaintyIndicator;
