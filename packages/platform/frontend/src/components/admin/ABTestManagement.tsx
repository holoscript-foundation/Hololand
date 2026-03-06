/**
 * ABTestManagement Component
 *
 * A/B test experiment management UI with:
 *   - Create new experiments
 *   - Assign traffic to variants
 *   - View statistical significance results with confidence intervals
 *   - Start/pause/complete experiments
 *
 * Follows the PostProcessingControls inline-style + ARIA pattern.
 *
 * @module admin/ABTestManagement
 */

import React, { useState, useCallback, useMemo, type CSSProperties } from 'react';
import {
  type Experiment,
  type ExperimentVariant,
  type ExperimentStatus,
  type StatisticalResult,
} from './AdminTypes';
import { adminStyles, COLORS, getChartColor, FONTS } from './AdminStyles';

// =============================================================================
// PROPS
// =============================================================================

export interface ABTestManagementProps {
  experiments: Experiment[];
  onCreateExperiment: (data: {
    name: string;
    description: string;
    primaryMetric: string;
    targetFeature: string;
    variants: { name: string; description: string; trafficPercent: number }[];
  }) => void;
  onStartExperiment: (experimentId: string) => void;
  onPauseExperiment: (experimentId: string) => void;
  onCompleteExperiment: (experimentId: string) => void;
  onArchiveExperiment: (experimentId: string) => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Status badge for experiment */
const ExperimentStatusBadge: React.FC<{ status: ExperimentStatus }> = ({ status }) => {
  const map: Record<ExperimentStatus, CSSProperties> = {
    draft: { ...adminStyles.badge, backgroundColor: 'rgba(255,255,255,0.06)', color: COLORS.textMuted },
    running: { ...adminStyles.badge, ...adminStyles.badgeSuccess },
    paused: { ...adminStyles.badge, ...adminStyles.badgeWarning },
    completed: { ...adminStyles.badge, ...adminStyles.badgeInfo },
    archived: { ...adminStyles.badge, backgroundColor: 'rgba(255,255,255,0.04)', color: COLORS.textDim },
  };
  return <span style={map[status]}>{status.toUpperCase()}</span>;
};

/** Confidence interval visualization */
const ConfidenceIntervalChart: React.FC<{ result: StatisticalResult }> = ({ result }) => {
  const [lower, upper] = result.confidenceInterval;
  const range = Math.max(Math.abs(lower), Math.abs(upper), 0.01) * 1.5;
  const center = 50; // center of chart (0 point)

  const lowerPx = center + (lower / range) * 40;
  const upperPx = center + (upper / range) * 40;
  const midpointPx = (lowerPx + upperPx) / 2;

  return (
    <div style={{ padding: '4px 0' }}>
      <svg width="100%" height="24" viewBox="0 0 100 24" role="img" aria-label="Confidence interval">
        {/* Zero line */}
        <line x1={center} x2={center} y1="2" y2="22" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2 2" />

        {/* Interval line */}
        <line
          x1={lowerPx}
          x2={upperPx}
          y1="12"
          y2="12"
          stroke={result.isSignificant ? COLORS.success : COLORS.textMuted}
          strokeWidth="2"
        />

        {/* Lower cap */}
        <line
          x1={lowerPx}
          x2={lowerPx}
          y1="8"
          y2="16"
          stroke={result.isSignificant ? COLORS.success : COLORS.textMuted}
          strokeWidth="1.5"
        />

        {/* Upper cap */}
        <line
          x1={upperPx}
          x2={upperPx}
          y1="8"
          y2="16"
          stroke={result.isSignificant ? COLORS.success : COLORS.textMuted}
          strokeWidth="1.5"
        />

        {/* Midpoint diamond */}
        <circle
          cx={midpointPx}
          cy="12"
          r="2.5"
          fill={result.isSignificant ? COLORS.success : COLORS.textMuted}
        />

        {/* Labels */}
        <text x={lowerPx} y="22" textAnchor="middle" fontSize="5" fill={COLORS.textDim} fontFamily={FONTS.mono}>
          {(lower * 100).toFixed(1)}%
        </text>
        <text x={upperPx} y="22" textAnchor="middle" fontSize="5" fill={COLORS.textDim} fontFamily={FONTS.mono}>
          {(upper * 100).toFixed(1)}%
        </text>
      </svg>
    </div>
  );
};

/** Statistical results panel */
const StatisticalResultsPanel: React.FC<{ result: StatisticalResult }> = ({ result }) => (
  <div
    style={{
      ...adminStyles.card,
      margin: '8px 0',
      backgroundColor: result.isSignificant ? 'rgba(74, 222, 128, 0.05)' : 'rgba(255,255,255,0.02)',
      borderColor: result.isSignificant ? 'rgba(74, 222, 128, 0.2)' : COLORS.borderLight,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.textSecondary }}>
        Statistical Results
      </span>
      <span
        style={{
          ...adminStyles.badge,
          ...(result.isSignificant ? adminStyles.badgeSuccess : adminStyles.badgeWarning),
        }}
      >
        {result.isSignificant ? 'SIGNIFICANT' : 'NOT SIGNIFICANT'}
      </span>
    </div>

    {/* Confidence interval chart */}
    <ConfidenceIntervalChart result={result} />

    {/* Stats grid */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: COLORS.textMuted }}>p-value</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: result.pValue < 0.05 ? COLORS.success : COLORS.warning,
          }}
        >
          {result.pValue.toFixed(4)}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: COLORS.textMuted }}>Confidence</div>
        <div style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: COLORS.textPrimary }}>
          {(result.confidenceLevel * 100).toFixed(0)}%
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: COLORS.textMuted }}>Improvement</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: result.relativeImprovement > 0 ? COLORS.success : COLORS.error,
          }}
        >
          {result.relativeImprovement > 0 ? '+' : ''}
          {result.relativeImprovement.toFixed(1)}%
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: COLORS.textMuted }}>Power</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: result.power >= 0.8 ? COLORS.success : COLORS.warning,
          }}
        >
          {(result.power * 100).toFixed(0)}%
        </div>
      </div>
    </div>

    {/* Additional details */}
    <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center' }}>
      <span style={{ fontSize: 8, color: COLORS.textDim }}>
        Effect Size (d): {result.effectSize.toFixed(3)}
      </span>
      <span style={{ fontSize: 8, color: COLORS.textDim }}>
        Required n: {result.requiredSampleSize.toLocaleString()}
      </span>
    </div>
  </div>
);

/** Variant comparison bars */
const VariantComparisonChart: React.FC<{ variants: ExperimentVariant[] }> = ({ variants }) => {
  const maxConversion = Math.max(...variants.map((v) => v.conversionRate), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {variants.map((variant, i) => (
        <div key={variant.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 9,
              color: COLORS.textSecondary,
              minWidth: 60,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {variant.name}
          </span>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ ...adminStyles.progressTrack, height: 12, borderRadius: 3 }}>
              <div
                style={{
                  height: '100%',
                  width: `${(variant.conversionRate / maxConversion) * 100}%`,
                  backgroundColor: getChartColor(i),
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 8, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>
              {(variant.conversionRate * 100).toFixed(2)}%
            </span>
            <span style={{ fontSize: 8, color: COLORS.textDim, fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right' }}>
              n={variant.sampleSize.toLocaleString()}
            </span>
            <span style={{ fontSize: 8, color: COLORS.textDim, fontVariantNumeric: 'tabular-nums', minWidth: 26, textAlign: 'right' }}>
              {variant.trafficPercent}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

/** Create experiment form */
const CreateExperimentForm: React.FC<{
  onSubmit: ABTestManagementProps['onCreateExperiment'];
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryMetric, setPrimaryMetric] = useState('conversion_rate');
  const [targetFeature, setTargetFeature] = useState('');
  const [variants, setVariants] = useState([
    { name: 'Control', description: 'Original version', trafficPercent: 50 },
    { name: 'Variant A', description: '', trafficPercent: 50 },
  ]);

  const addVariant = useCallback(() => {
    const remaining = 100 - variants.reduce((s, v) => s + v.trafficPercent, 0);
    setVariants([
      ...variants,
      { name: `Variant ${String.fromCharCode(65 + variants.length - 1)}`, description: '', trafficPercent: Math.max(0, remaining) },
    ]);
  }, [variants]);

  const updateVariant = useCallback(
    (idx: number, field: string, value: string | number) => {
      setVariants((prev) =>
        prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
      );
    },
    [],
  );

  const removeVariant = useCallback((idx: number) => {
    if (variants.length > 2) {
      setVariants((prev) => prev.filter((_, i) => i !== idx));
    }
  }, [variants.length]);

  const totalTraffic = variants.reduce((s, v) => s + v.trafficPercent, 0);
  const isValid = name.trim() && targetFeature.trim() && totalTraffic === 100 && variants.length >= 2;

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(99, 102, 241, 0.06)',
        borderTop: `1px solid ${COLORS.accentBorder}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      role="form"
      aria-label="Create experiment"
    >
      <div style={adminStyles.sectionTitle}>Create Experiment</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input
          style={adminStyles.input}
          placeholder="Experiment name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Experiment name"
        />
        <input
          style={adminStyles.input}
          placeholder="Target feature / scene..."
          value={targetFeature}
          onChange={(e) => setTargetFeature(e.target.value)}
          aria-label="Target feature"
        />
      </div>

      <input
        style={adminStyles.input}
        placeholder="Description..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="Experiment description"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, color: COLORS.textMuted }}>Metric:</span>
        <select
          style={adminStyles.select}
          value={primaryMetric}
          onChange={(e) => setPrimaryMetric(e.target.value)}
          aria-label="Primary metric"
        >
          <option value="conversion_rate">Conversion Rate</option>
          <option value="engagement_time">Engagement Time</option>
          <option value="scene_completion">Scene Completion</option>
          <option value="fps_improvement">FPS Improvement</option>
          <option value="retention">Retention</option>
        </select>
      </div>

      {/* Variants */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: COLORS.textMuted }}>
            Variants ({variants.length})
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span
              style={{
                fontSize: 8,
                color: totalTraffic === 100 ? COLORS.success : COLORS.error,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Traffic: {totalTraffic}%
            </span>
            <button
              style={adminStyles.button}
              onClick={addVariant}
              aria-label="Add variant"
            >
              + Add
            </button>
          </div>
        </div>
        {variants.map((v, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 4,
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <input
              style={{ ...adminStyles.input, width: 80 }}
              value={v.name}
              onChange={(e) => updateVariant(i, 'name', e.target.value)}
              aria-label={`Variant ${i + 1} name`}
            />
            <input
              style={{ ...adminStyles.input, flex: 1 }}
              placeholder="Description..."
              value={v.description}
              onChange={(e) => updateVariant(i, 'description', e.target.value)}
              aria-label={`Variant ${i + 1} description`}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <input
                style={{ ...adminStyles.input, width: 40, textAlign: 'center' }}
                type="number"
                min={0}
                max={100}
                value={v.trafficPercent}
                onChange={(e) => updateVariant(i, 'trafficPercent', parseInt(e.target.value, 10) || 0)}
                aria-label={`Variant ${i + 1} traffic percent`}
              />
              <span style={{ fontSize: 8, color: COLORS.textDim }}>%</span>
            </div>
            {variants.length > 2 && (
              <button
                style={{ ...adminStyles.button, ...adminStyles.buttonDanger, padding: '3px 6px' }}
                onClick={() => removeVariant(i)}
                aria-label={`Remove variant ${v.name}`}
              >
                x
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button style={adminStyles.button} onClick={onCancel}>
          Cancel
        </button>
        <button
          style={{
            ...adminStyles.button,
            ...adminStyles.buttonPrimary,
            opacity: isValid ? 1 : 0.4,
          }}
          onClick={() => isValid && onSubmit({ name, description, primaryMetric, targetFeature, variants })}
          disabled={!isValid}
          aria-label="Create experiment"
        >
          Create Experiment
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ABTestManagement = React.memo<ABTestManagementProps>(
  function ABTestManagement({
    experiments,
    onCreateExperiment,
    onStartExperiment,
    onPauseExperiment,
    onCompleteExperiment,
    onArchiveExperiment,
  }) {
    const [showCreate, setShowCreate] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<ExperimentStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = useMemo(() => {
      return experiments.filter((exp) => {
        const matchesStatus = filterStatus === 'all' || exp.status === filterStatus;
        const matchesSearch =
          !searchQuery ||
          exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.targetFeature.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      });
    }, [experiments, filterStatus, searchQuery]);

    const getActions = useCallback(
      (exp: Experiment) => {
        const actions: { label: string; style: CSSProperties; action: () => void }[] = [];
        switch (exp.status) {
          case 'draft':
            actions.push({
              label: 'Start',
              style: { ...adminStyles.button, ...adminStyles.buttonSuccess },
              action: () => onStartExperiment(exp.id),
            });
            break;
          case 'running':
            actions.push({
              label: 'Pause',
              style: { ...adminStyles.button, ...adminStyles.badgeWarning },
              action: () => onPauseExperiment(exp.id),
            });
            actions.push({
              label: 'Complete',
              style: { ...adminStyles.button, ...adminStyles.buttonPrimary },
              action: () => onCompleteExperiment(exp.id),
            });
            break;
          case 'paused':
            actions.push({
              label: 'Resume',
              style: { ...adminStyles.button, ...adminStyles.buttonSuccess },
              action: () => onStartExperiment(exp.id),
            });
            actions.push({
              label: 'Complete',
              style: { ...adminStyles.button, ...adminStyles.buttonPrimary },
              action: () => onCompleteExperiment(exp.id),
            });
            break;
          case 'completed':
            actions.push({
              label: 'Archive',
              style: adminStyles.button,
              action: () => onArchiveExperiment(exp.id),
            });
            break;
        }
        return actions;
      },
      [onStartExperiment, onPauseExperiment, onCompleteExperiment, onArchiveExperiment],
    );

    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="A/B test management">
        {/* Header */}
        <div style={adminStyles.panelHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={adminStyles.panelTitle}>A/B Tests</span>
            <span style={{ ...adminStyles.badge, ...adminStyles.badgeAccent }}>
              {experiments.filter((e) => e.status === 'running').length} running
            </span>
          </div>
          <button
            style={{ ...adminStyles.button, ...adminStyles.buttonPrimary }}
            onClick={() => setShowCreate((s) => !s)}
            aria-label="Create new experiment"
          >
            + New Test
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <CreateExperimentForm
            onSubmit={(data) => {
              onCreateExperiment(data);
              setShowCreate(false);
            }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* Toolbar */}
        <div style={adminStyles.toolbar}>
          <input
            style={{ ...adminStyles.input, maxWidth: 200 }}
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search experiments"
          />
          <select
            style={adminStyles.select}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ExperimentStatus | 'all')}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Experiment list */}
        <div style={adminStyles.panelBody}>
          {filtered.length === 0 ? (
            <div style={adminStyles.emptyState}>No experiments found.</div>
          ) : (
            filtered.map((exp) => (
              <div
                key={exp.id}
                style={{
                  ...adminStyles.card,
                  margin: '4px 16px',
                  ...(expandedId === exp.id ? { borderColor: COLORS.accentBorder } : {}),
                }}
              >
                {/* Experiment header row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedId((prev) => (prev === exp.id ? null : exp.id))}
                  role="button"
                  aria-expanded={expandedId === exp.id}
                  aria-label={`Experiment ${exp.name}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedId((prev) => (prev === exp.id ? null : exp.id));
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg
                      style={{
                        width: 8,
                        height: 8,
                        color: COLORS.textDim,
                        transition: 'transform 0.15s ease',
                        transform: expandedId === exp.id ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 2 7 5 3 8" />
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: 11, color: COLORS.textPrimary }}>
                      {exp.name}
                    </span>
                    <ExperimentStatusBadge status={exp.status} />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    {getActions(exp).map((action) => (
                      <button
                        key={action.label}
                        style={action.style}
                        onClick={action.action}
                        aria-label={`${action.label} ${exp.name}`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expanded content */}
                {expandedId === exp.id && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${COLORS.borderLight}` }}>
                    {/* Meta info */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 8, color: COLORS.textMuted }}>
                        Metric: <span style={{ color: COLORS.textSecondary }}>{exp.primaryMetric}</span>
                      </span>
                      <span style={{ fontSize: 8, color: COLORS.textMuted }}>
                        Target: <span style={{ color: COLORS.textSecondary }}>{exp.targetFeature}</span>
                      </span>
                      <span style={{ fontSize: 8, color: COLORS.textMuted }}>
                        Started: <span style={{ color: COLORS.textSecondary }}>{new Date(exp.startDate).toLocaleDateString()}</span>
                      </span>
                      {exp.endDate && (
                        <span style={{ fontSize: 8, color: COLORS.textMuted }}>
                          Ended: <span style={{ color: COLORS.textSecondary }}>{new Date(exp.endDate).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {exp.description && (
                      <div style={{ fontSize: 9, color: COLORS.textMuted, marginBottom: 8 }}>
                        {exp.description}
                      </div>
                    )}

                    {/* Variant comparison */}
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4, display: 'block' }}>
                        Variants
                      </span>
                      <VariantComparisonChart variants={exp.variants} />
                    </div>

                    {/* Statistical results */}
                    {exp.statisticalResult && (
                      <StatisticalResultsPanel result={exp.statisticalResult} />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  },
);

export default ABTestManagement;
