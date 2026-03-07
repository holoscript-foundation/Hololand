/**
 * Cross-Reality Monitor Types
 */

export interface DeviceStatus {
  deviceId: string;
  formFactor: string;
  displayName: string;
  connectionState: 'connected' | 'disconnected' | 'connecting';
  transportType: 'webrtc' | 'websocket';
  latencyMs: number;
  connectedAt: number;
}

export interface HandoffEvent {
  id: string;
  sourceDevice: string;
  targetDevice: string;
  sourceFormFactor: string;
  targetFormFactor: string;
  status: 'success' | 'failed' | 'blocked';
  reason?: string;
  durationMs: number;
  payloadSizeBytes: number;
  compressionRatio: number;
  normViolations: number;
  timestamp: number;
}

export interface CRDTConflictEvent {
  key: string;
  localValue: string;
  remoteValue: string;
  resolvedTo: 'local' | 'remote';
  timestamp: number;
}

export interface NormViolationEvent {
  ruleId: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  blocking: boolean;
  timestamp: number;
}

export interface CrossRealityMonitorState {
  /** Connected devices */
  devices: DeviceStatus[];
  /** Handoff history (most recent first) */
  handoffHistory: HandoffEvent[];
  /** Recent CRDT conflicts */
  crdtConflicts: CRDTConflictEvent[];
  /** Recent norm violations */
  normViolations: NormViolationEvent[];
  /** Session metrics */
  metrics: {
    totalHandoffs: number;
    successfulHandoffs: number;
    failedHandoffs: number;
    averageHandoffMs: number;
    totalCrdtOps: number;
    totalConflicts: number;
    totalNormViolations: number;
    uptime: number;
  };
  /** Current session state */
  sessionState: string;
  /** Agent identity */
  agentId: string;
  agentName: string;
}

export type MonitorPanel = 'devices' | 'handoffs' | 'crdt' | 'norms' | 'metrics';

export interface CrossRealityMonitorTheme {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  accent: string;
}

export const DEFAULT_MONITOR_THEME: CrossRealityMonitorTheme = {
  bg: '#0a0a0f',
  surface: '#12121a',
  border: '#1e1e2e',
  text: '#e0e0e0',
  textSecondary: '#888',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
  accent: '#7c4dff',
};

export interface CrossRealityMonitorProps {
  state: CrossRealityMonitorState;
  theme?: Partial<CrossRealityMonitorTheme>;
  activePanel?: MonitorPanel;
  onPanelChange?: (panel: MonitorPanel) => void;
  maxHistoryItems?: number;
}
