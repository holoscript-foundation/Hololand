/**
 * RealTimePerformanceMonitor Component
 *
 * Live scene performance monitoring dashboard with:
 *   - Real-time FPS, frame time, draw calls, GPU memory sparklines
 *   - Per-scene performance cards with quality tier indicators
 *   - Configurable alert thresholds
 *   - Active alert feed with acknowledge/dismiss
 *
 * Follows the PostProcessingControls/PreviewDashboard inline-style pattern.
 *
 * @module admin/RealTimePerformanceMonitor
 */

import React, { useState, useMemo, useCallback, useRef, useEffect, type CSSProperties } from 'react';
import {
  type ScenePerformanceSnapshot,
  type PerformanceAlert,
  type PerformanceThreshold,
} from './AdminTypes';
import { adminStyles, COLORS, getFPSColor, FONTS } from './AdminStyles';

// =============================================================================
// PROPS
// =============================================================================

export interface RealTimePerformanceMonitorProps {
  /** Live performance snapshots keyed by sceneId */
  snapshots: Map<string, ScenePerformanceSnapshot>;
  /** History of snapshots per scene (most recent last) */
  history: Map<string, ScenePerformanceSnapshot[]>;
  /** Active alerts */
  alerts: PerformanceAlert[];
  /** Current threshold configuration */
  thresholds: PerformanceThreshold[];
  /** Whether the monitor is actively polling */
  isLive: boolean;
  /** Polling interval in ms */
  pollingInterval: number;
  onToggleLive: () => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onUpdateThreshold: (threshold: PerformanceThreshold) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SPARKLINE_WIDTH = 120;
const SPARKLINE_HEIGHT = 24;
const MAX_SPARKLINE_POINTS = 60;

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Mini sparkline SVG for a metric time series */
const Sparkline: React.FC<{
  values: number[];
  color: string;
  min?: number;
  max?: number;
  label: string;
}> = ({ values, color, min: forcedMin, max: forcedMax, label }) => {
  if (values.length < 2) return null;

  const recentValues = values.slice(-MAX_SPARKLINE_POINTS);
  const minV = forcedMin ?? Math.min(...recentValues);
  const maxV = forcedMax ?? Math.max(...recentValues);
  const range = maxV - minV || 1;

  const points = recentValues.map((v, i) => {
    const x = (i / (recentValues.length - 1)) * SPARKLINE_WIDTH;
    const y = SPARKLINE_HEIGHT - ((v - minV) / range) * (SPARKLINE_HEIGHT - 2) - 1;
    return `${x},${y}`;
  });

  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT} L0,${SPARKLINE_HEIGHT} Z`;

  return (
    <svg
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      role="img"
      aria-label={`${label} sparkline`}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d={areaPath} fill={`${color}15`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1" />
      {/* Current value dot */}
      {recentValues.length > 0 && (
        <circle
          cx={SPARKLINE_WIDTH}
          cy={SPARKLINE_HEIGHT - ((recentValues[recentValues.length - 1] - minV) / range) * (SPARKLINE_HEIGHT - 2) - 1}
          r="2"
          fill={color}
        />
      )}
    </svg>
  );
};

/** Quality tier indicator */
const QualityTierBadge: React.FC<{ tier: ScenePerformanceSnapshot['qualityTier'] }> = ({ tier }) => {
  const map: Record<string, CSSProperties> = {
    ultra: { ...adminStyles.badge, ...adminStyles.badgeAccent },
    high: { ...adminStyles.badge, ...adminStyles.badgeSuccess },
    medium: { ...adminStyles.badge, ...adminStyles.badgeWarning },
    low: { ...adminStyles.badge, ...adminStyles.badgeError },
  };
  return <span style={map[tier] || adminStyles.badge}>{tier.toUpperCase()}</span>;
};

/** Single metric display with sparkline */
const MetricWithSparkline: React.FC<{
  label: string;
  value: string;
  unit: string;
  color: string;
  history: number[];
  min?: number;
  max?: number;
}> = ({ label, value, unit, color, history, min, max }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ minWidth: 60 }}>
      <div style={{ fontSize: 7, color: COLORS.textMuted, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color }}>
        {value}
        <span style={{ fontSize: 7, color: COLORS.textDim, marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
    <Sparkline values={history} color={color} min={min} max={max} label={label} />
  </div>
);

/** Per-scene performance card */
const ScenePerformanceCard: React.FC<{
  snapshot: ScenePerformanceSnapshot;
  history: ScenePerformanceSnapshot[];
  isSelected: boolean;
  onSelect: () => void;
  alertCount: number;
}> = ({ snapshot, history, isSelected, onSelect, alertCount }) => {
  const fpsHistory = history.map((h) => h.fps);
  const frameTimeHistory = history.map((h) => h.frameTimeMs);
  const gpuMemHistory = history.map((h) => h.gpuMemoryMB);
  const drawCallHistory = history.map((h) => h.drawCalls);

  return (
    <div
      style={{
        ...adminStyles.card,
        margin: '4px 16px',
        ...(isSelected ? adminStyles.cardSelected : {}),
        cursor: 'pointer',
      }}
      onClick={onSelect}
      role="button"
      aria-expanded={isSelected}
      aria-label={`Scene ${snapshot.sceneName} performance`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isSelected ? 8 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 11, color: COLORS.textPrimary }}>
            {snapshot.sceneName}
          </span>
          <QualityTierBadge tier={snapshot.qualityTier} />
          {alertCount > 0 && (
            <span style={{ ...adminStyles.badge, ...adminStyles.badgeError }}>
              {alertCount} alert{alertCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 8, color: COLORS.textDim }}>
            {snapshot.activeUsers} user{snapshot.activeUsers !== 1 ? 's' : ''}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: getFPSColor(snapshot.fps),
            }}
          >
            {snapshot.fps.toFixed(0)}
            <span style={{ fontSize: 8, color: COLORS.textDim }}> fps</span>
          </span>
        </div>
      </div>

      {/* Expanded metrics */}
      {isSelected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
          <MetricWithSparkline
            label="FPS"
            value={snapshot.fps.toFixed(1)}
            unit="fps"
            color={getFPSColor(snapshot.fps)}
            history={fpsHistory}
            min={0}
            max={120}
          />
          <MetricWithSparkline
            label="Frame Time"
            value={snapshot.frameTimeMs.toFixed(1)}
            unit="ms"
            color={snapshot.frameTimeMs > 16.6 ? COLORS.warning : COLORS.success}
            history={frameTimeHistory}
            min={0}
          />
          <MetricWithSparkline
            label="GPU Memory"
            value={snapshot.gpuMemoryMB.toFixed(0)}
            unit="MB"
            color={COLORS.chart5}
            history={gpuMemHistory}
            min={0}
          />
          <MetricWithSparkline
            label="Draw Calls"
            value={snapshot.drawCalls.toLocaleString()}
            unit=""
            color={COLORS.chart6}
            history={drawCallHistory}
            min={0}
          />
          <MetricWithSparkline
            label="CPU Time"
            value={snapshot.cpuTimeMs.toFixed(1)}
            unit="ms"
            color={COLORS.chart2}
            history={history.map((h) => h.cpuTimeMs)}
          />
          <MetricWithSparkline
            label="GPU Time"
            value={snapshot.gpuTimeMs.toFixed(1)}
            unit="ms"
            color={COLORS.chart3}
            history={history.map((h) => h.gpuTimeMs)}
          />

          {/* Additional stats row */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, paddingTop: 4, borderTop: `1px solid ${COLORS.borderLight}` }}>
            <span style={{ fontSize: 8, color: COLORS.textMuted }}>
              Triangles: <span style={{ color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{(snapshot.triangleCount / 1_000_000).toFixed(2)}M</span>
            </span>
            <span style={{ fontSize: 8, color: COLORS.textMuted }}>
              Gaussians: <span style={{ color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{(snapshot.gaussianSplatCount / 1_000_000).toFixed(2)}M</span>
            </span>
            <span style={{ fontSize: 8, color: COLORS.textMuted }}>
              Latency: <span style={{ color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{snapshot.networkLatencyMs.toFixed(0)}ms</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/** Alert feed item */
const AlertItem: React.FC<{
  alert: PerformanceAlert;
  onAcknowledge: () => void;
}> = ({ alert, onAcknowledge }) => {
  const severityStyles: Record<string, CSSProperties> = {
    info: { borderLeftColor: COLORS.info, backgroundColor: COLORS.infoBg },
    warning: { borderLeftColor: COLORS.warning, backgroundColor: COLORS.warningBg },
    critical: { borderLeftColor: COLORS.error, backgroundColor: COLORS.errorBg },
  };

  return (
    <div
      style={{
        padding: '6px 12px',
        marginBottom: 4,
        borderLeft: '3px solid',
        borderRadius: 3,
        opacity: alert.acknowledged ? 0.5 : 1,
        ...severityStyles[alert.severity],
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
      }}
      role="alert"
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: alert.severity === 'critical' ? COLORS.error : alert.severity === 'warning' ? COLORS.warning : COLORS.info,
              textTransform: 'uppercase',
            }}
          >
            {alert.severity}
          </span>
          <span style={{ fontSize: 9, color: COLORS.textSecondary, fontWeight: 600 }}>
            {alert.sceneName}
          </span>
          <span style={{ fontSize: 7, color: COLORS.textDim }}>
            {new Date(alert.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div style={{ fontSize: 9, color: COLORS.textPrimary }}>{alert.message}</div>
        <div style={{ fontSize: 7, color: COLORS.textMuted, marginTop: 2 }}>
          {alert.metric}: {alert.currentValue.toFixed(1)} (threshold: {alert.thresholdValue.toFixed(1)})
        </div>
      </div>
      {!alert.acknowledged && (
        <button
          style={{ ...adminStyles.button, padding: '2px 6px', fontSize: 8 }}
          onClick={onAcknowledge}
          aria-label={`Acknowledge alert for ${alert.sceneName}`}
        >
          ACK
        </button>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const RealTimePerformanceMonitor = React.memo<RealTimePerformanceMonitorProps>(
  function RealTimePerformanceMonitor({
    snapshots,
    history,
    alerts,
    thresholds,
    isLive,
    pollingInterval,
    onToggleLive,
    onAcknowledgeAlert,
  }) {
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
    const [showAlerts, setShowAlerts] = useState(true);
    const [filterSeverity, setFilterSeverity] = useState<'all' | 'info' | 'warning' | 'critical'>('all');

    // Sort scenes by FPS (worst first)
    const sortedScenes = useMemo(() => {
      return Array.from(snapshots.values()).sort((a, b) => a.fps - b.fps);
    }, [snapshots]);

    // Filter alerts
    const filteredAlerts = useMemo(() => {
      return alerts.filter((a) => filterSeverity === 'all' || a.severity === filterSeverity);
    }, [alerts, filterSeverity]);

    // Alert counts per scene
    const alertsByScene = useMemo(() => {
      const map = new Map<string, number>();
      alerts.filter((a) => !a.acknowledged).forEach((a) => {
        map.set(a.sceneId, (map.get(a.sceneId) || 0) + 1);
      });
      return map;
    }, [alerts]);

    // Summary stats
    const summary = useMemo(() => {
      const scenes = Array.from(snapshots.values());
      if (scenes.length === 0) return { avgFPS: 0, minFPS: 0, totalUsers: 0, criticalAlerts: 0 };
      return {
        avgFPS: scenes.reduce((s, sc) => s + sc.fps, 0) / scenes.length,
        minFPS: Math.min(...scenes.map((s) => s.fps)),
        totalUsers: scenes.reduce((s, sc) => s + sc.activeUsers, 0),
        criticalAlerts: alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length,
      };
    }, [snapshots, alerts]);

    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="Real-time performance monitor">
        {/* Header */}
        <div style={adminStyles.panelHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={adminStyles.panelTitle}>Performance Monitor</span>
            <span
              style={{
                ...adminStyles.badge,
                ...(isLive ? adminStyles.badgeSuccess : { backgroundColor: 'rgba(255,255,255,0.06)', color: COLORS.textDim }),
              }}
            >
              {isLive ? 'LIVE' : 'PAUSED'}
            </span>
            {isLive && (
              <span style={{ fontSize: 7, color: COLORS.textDim }}>
                {pollingInterval}ms
              </span>
            )}
          </div>
          <button
            style={{
              ...adminStyles.button,
              ...(isLive ? adminStyles.buttonDanger : adminStyles.buttonSuccess),
            }}
            onClick={onToggleLive}
            aria-label={isLive ? 'Pause monitoring' : 'Start monitoring'}
          >
            {isLive ? 'Pause' : 'Start'}
          </button>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '8px 16px' }}>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Avg FPS</span>
            <span style={{ ...adminStyles.statValue, color: getFPSColor(summary.avgFPS) }}>
              {summary.avgFPS.toFixed(1)}
            </span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Min FPS</span>
            <span style={{ ...adminStyles.statValue, color: getFPSColor(summary.minFPS) }}>
              {summary.minFPS.toFixed(1)}
            </span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Active Users</span>
            <span style={adminStyles.statValue}>{summary.totalUsers}</span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Critical</span>
            <span style={{ ...adminStyles.statValue, color: summary.criticalAlerts > 0 ? COLORS.error : COLORS.success }}>
              {summary.criticalAlerts}
            </span>
          </div>
        </div>

        {/* Body: split between scenes and alerts */}
        <div style={{ ...adminStyles.panelBody, display: 'flex', flexDirection: 'column' }}>
          {/* Scenes */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sortedScenes.length === 0 ? (
              <div style={adminStyles.emptyState}>
                {isLive ? 'Waiting for scene data...' : 'Monitor is paused.'}
              </div>
            ) : (
              sortedScenes.map((snapshot) => (
                <ScenePerformanceCard
                  key={snapshot.sceneId}
                  snapshot={snapshot}
                  history={history.get(snapshot.sceneId) || []}
                  isSelected={selectedSceneId === snapshot.sceneId}
                  onSelect={() =>
                    setSelectedSceneId((prev) =>
                      prev === snapshot.sceneId ? null : snapshot.sceneId,
                    )
                  }
                  alertCount={alertsByScene.get(snapshot.sceneId) || 0}
                />
              ))
            )}
          </div>

          {/* Alert feed */}
          <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <div
              style={{
                ...adminStyles.toolbar,
                cursor: 'pointer',
              }}
              onClick={() => setShowAlerts((s) => !s)}
              role="button"
              aria-expanded={showAlerts}
              aria-label="Toggle alert feed"
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.textSecondary }}>
                Alerts ({filteredAlerts.length})
              </span>
              {alerts.filter((a) => !a.acknowledged).length > 0 && (
                <span style={{ ...adminStyles.badge, ...adminStyles.badgeError }}>
                  {alerts.filter((a) => !a.acknowledged).length} unread
                </span>
              )}
              <div style={{ flex: 1 }} />
              {showAlerts && (
                <select
                  style={adminStyles.select}
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Filter alerts by severity"
                >
                  <option value="all">All</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              )}
            </div>

            {showAlerts && (
              <div style={{ maxHeight: 160, overflowY: 'auto', padding: '4px 16px' }}>
                {filteredAlerts.length === 0 ? (
                  <div style={{ ...adminStyles.emptyState, padding: '12px' }}>No alerts.</div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={() => onAcknowledgeAlert(alert.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export default RealTimePerformanceMonitor;
