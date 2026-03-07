/**
 * CrossRealityMonitor — React dashboard for cross-reality sessions.
 */
import React from 'react';
import type {
  CrossRealityMonitorProps,
  CrossRealityMonitorTheme,
  MonitorPanel,
  DeviceStatus,
  HandoffEvent,
  CRDTConflictEvent,
  NormViolationEvent,
} from './types';
import { DEFAULT_MONITOR_THEME } from './types';

const PANELS: { id: MonitorPanel; label: string }[] = [
  { id: 'devices', label: 'Devices' },
  { id: 'handoffs', label: 'Handoffs' },
  { id: 'crdt', label: 'CRDT Sync' },
  { id: 'norms', label: 'Norms' },
  { id: 'metrics', label: 'Metrics' },
];

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function StatusDot({ color }: { color: string }) {
  return React.createElement('span', {
    style: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: color, marginRight: 6 },
  });
}

function DevicesPanel({ devices, theme }: { devices: DeviceStatus[]; theme: CrossRealityMonitorTheme }) {
  if (devices.length === 0) {
    return React.createElement('div', { style: { color: theme.textSecondary, padding: 16, textAlign: 'center' as const } }, 'No devices connected');
  }
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: 8 } },
    devices.map(d =>
      React.createElement('div', {
        key: d.deviceId,
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6, backgroundColor: theme.surface, border: `1px solid ${theme.border}` },
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement(StatusDot, { color: d.connectionState === 'connected' ? theme.success : d.connectionState === 'connecting' ? theme.warning : theme.error }),
          React.createElement('span', { style: { fontWeight: 600 } }, d.displayName),
          React.createElement('span', { style: { color: theme.textSecondary, fontSize: 12 } }, `(${d.formFactor})`),
        ),
        React.createElement('div', { style: { display: 'flex', gap: 12, fontSize: 12, color: theme.textSecondary } },
          React.createElement('span', null, d.transportType.toUpperCase()),
          React.createElement('span', null, d.latencyMs >= 0 ? `${d.latencyMs}ms` : '--'),
        ),
      ),
    ),
  );
}

function HandoffsPanel({ handoffs, theme }: { handoffs: HandoffEvent[]; theme: CrossRealityMonitorTheme }) {
  if (handoffs.length === 0) {
    return React.createElement('div', { style: { color: theme.textSecondary, padding: 16, textAlign: 'center' as const } }, 'No handoff history');
  }
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: 6 } },
    handoffs.slice(0, 20).map(h =>
      React.createElement('div', {
        key: h.id,
        style: { padding: '6px 12px', borderRadius: 4, backgroundColor: theme.surface, border: `1px solid ${theme.border}`, fontSize: 13 },
      },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between' } },
          React.createElement('span', null,
            React.createElement(StatusDot, { color: h.status === 'success' ? theme.success : h.status === 'blocked' ? theme.warning : theme.error }),
            `${h.sourceFormFactor} → ${h.targetFormFactor}`,
          ),
          React.createElement('span', { style: { color: theme.textSecondary } }, formatMs(h.durationMs)),
        ),
        React.createElement('div', { style: { fontSize: 11, color: theme.textSecondary, marginTop: 2 } },
          `${formatBytes(h.payloadSizeBytes)} | ratio: ${(h.compressionRatio * 100).toFixed(0)}% | violations: ${h.normViolations}`,
        ),
      ),
    ),
  );
}

function CRDTPanel({ conflicts, theme }: { conflicts: CRDTConflictEvent[]; theme: CrossRealityMonitorTheme }) {
  if (conflicts.length === 0) {
    return React.createElement('div', { style: { color: theme.textSecondary, padding: 16, textAlign: 'center' as const } }, 'No CRDT conflicts');
  }
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: 6 } },
    conflicts.slice(0, 20).map((c, i) =>
      React.createElement('div', {
        key: `${c.key}-${i}`,
        style: { padding: '6px 12px', borderRadius: 4, backgroundColor: theme.surface, border: `1px solid ${theme.border}`, fontSize: 13 },
      },
        React.createElement('div', { style: { fontFamily: 'monospace' } }, c.key),
        React.createElement('div', { style: { fontSize: 11, color: theme.textSecondary } }, `Resolved: ${c.resolvedTo} | ${new Date(c.timestamp).toLocaleTimeString()}`),
      ),
    ),
  );
}

function NormsPanel({ violations, theme }: { violations: NormViolationEvent[]; theme: CrossRealityMonitorTheme }) {
  if (violations.length === 0) {
    return React.createElement('div', { style: { color: theme.textSecondary, padding: 16, textAlign: 'center' as const } }, 'No norm violations');
  }
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: 6 } },
    violations.slice(0, 20).map((v, i) =>
      React.createElement('div', {
        key: `${v.ruleId}-${i}`,
        style: { padding: '6px 12px', borderRadius: 4, backgroundColor: theme.surface, border: `1px solid ${v.severity === 'critical' ? theme.error : v.severity === 'warning' ? theme.warning : theme.border}`, fontSize: 13 },
      },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between' } },
          React.createElement('span', { style: { fontWeight: 600 } }, v.ruleId),
          React.createElement('span', { style: { color: v.blocking ? theme.error : theme.warning, fontSize: 11 } }, v.blocking ? 'BLOCKING' : 'non-blocking'),
        ),
        React.createElement('div', { style: { fontSize: 11, color: theme.textSecondary } }, v.description),
      ),
    ),
  );
}

function MetricsPanel({ metrics, theme }: { metrics: CrossRealityMonitorProps['state']['metrics']; theme: CrossRealityMonitorTheme }) {
  const items = [
    { label: 'Total Handoffs', value: String(metrics.totalHandoffs) },
    { label: 'Successful', value: String(metrics.successfulHandoffs), color: theme.success },
    { label: 'Failed', value: String(metrics.failedHandoffs), color: theme.error },
    { label: 'Avg Handoff Time', value: formatMs(metrics.averageHandoffMs) },
    { label: 'CRDT Conflicts', value: String(metrics.totalConflicts), color: metrics.totalConflicts > 0 ? theme.warning : theme.text },
    { label: 'Norm Violations', value: String(metrics.totalNormViolations), color: metrics.totalNormViolations > 0 ? theme.error : theme.text },
    { label: 'Uptime', value: formatUptime(metrics.uptime) },
  ];
  return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 } },
    items.map(item =>
      React.createElement('div', {
        key: item.label,
        style: { padding: 12, borderRadius: 6, backgroundColor: theme.surface, border: `1px solid ${theme.border}` },
      },
        React.createElement('div', { style: { fontSize: 11, color: theme.textSecondary, marginBottom: 4 } }, item.label),
        React.createElement('div', { style: { fontSize: 20, fontWeight: 700, color: item.color ?? theme.text } }, item.value),
      ),
    ),
  );
}

export function CrossRealityMonitor(props: CrossRealityMonitorProps) {
  const theme: CrossRealityMonitorTheme = { ...DEFAULT_MONITOR_THEME, ...props.theme };
  const activePanel = props.activePanel ?? 'devices';
  const onPanelChange = props.onPanelChange ?? (() => {});

  return React.createElement('div', {
    style: {
      backgroundColor: theme.bg, color: theme.text, fontFamily: 'system-ui, -apple-system, sans-serif',
      borderRadius: 12, border: `1px solid ${theme.border}`, overflow: 'hidden', minWidth: 380,
    },
  },
    // Header
    React.createElement('div', {
      style: { padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 14, fontWeight: 700 } }, 'Cross-Reality Monitor'),
        React.createElement('div', { style: { fontSize: 11, color: theme.textSecondary } }, `${props.state.agentName} | ${props.state.sessionState}`),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement(StatusDot, { color: props.state.devices.length > 0 ? theme.success : theme.textSecondary }),
        React.createElement('span', { style: { fontSize: 12, color: theme.textSecondary } }, `${props.state.devices.length} device(s)`),
      ),
    ),
    // Tab bar
    React.createElement('div', {
      style: { display: 'flex', borderBottom: `1px solid ${theme.border}`, padding: '0 8px' },
    },
      PANELS.map(p =>
        React.createElement('button', {
          key: p.id,
          onClick: () => onPanelChange(p.id),
          style: {
            padding: '8px 12px', fontSize: 12, fontWeight: activePanel === p.id ? 600 : 400,
            color: activePanel === p.id ? theme.accent : theme.textSecondary,
            borderBottom: activePanel === p.id ? `2px solid ${theme.accent}` : '2px solid transparent',
            background: 'none', border: 'none', cursor: 'pointer',
          },
        }, p.label),
      ),
    ),
    // Panel content
    React.createElement('div', { style: { padding: 12, maxHeight: 400, overflowY: 'auto' as const } },
      activePanel === 'devices' && React.createElement(DevicesPanel, { devices: props.state.devices, theme }),
      activePanel === 'handoffs' && React.createElement(HandoffsPanel, { handoffs: props.state.handoffHistory, theme }),
      activePanel === 'crdt' && React.createElement(CRDTPanel, { conflicts: props.state.crdtConflicts, theme }),
      activePanel === 'norms' && React.createElement(NormsPanel, { violations: props.state.normViolations, theme }),
      activePanel === 'metrics' && React.createElement(MetricsPanel, { metrics: props.state.metrics, theme }),
    ),
  );
}
