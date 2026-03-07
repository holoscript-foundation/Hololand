/**
 * React hook for cross-reality session monitoring.
 * Connects to CrossRealitySessionManager events and aggregates state.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  CrossRealityMonitorState,
  DeviceStatus,
  HandoffEvent,
  CRDTConflictEvent,
  NormViolationEvent,
  MonitorPanel,
} from './types';

export interface UseCrossRealityMonitorConfig {
  agentId: string;
  agentName: string;
  maxHistory?: number;
  refreshIntervalMs?: number;
}

export interface UseCrossRealityMonitorResult {
  state: CrossRealityMonitorState;
  activePanel: MonitorPanel;
  setActivePanel: (panel: MonitorPanel) => void;
  addDevice: (device: DeviceStatus) => void;
  removeDevice: (deviceId: string) => void;
  recordHandoff: (event: HandoffEvent) => void;
  recordConflict: (conflict: CRDTConflictEvent) => void;
  recordNormViolation: (violation: NormViolationEvent) => void;
  clearHistory: () => void;
}

export function useCrossRealityMonitor(config: UseCrossRealityMonitorConfig): UseCrossRealityMonitorResult {
  const maxHistory = config.maxHistory ?? 100;
  const startTime = useRef(Date.now());

  const [state, setState] = useState<CrossRealityMonitorState>({
    devices: [],
    handoffHistory: [],
    crdtConflicts: [],
    normViolations: [],
    metrics: {
      totalHandoffs: 0, successfulHandoffs: 0, failedHandoffs: 0,
      averageHandoffMs: 0, totalCrdtOps: 0, totalConflicts: 0,
      totalNormViolations: 0, uptime: 0,
    },
    sessionState: 'idle',
    agentId: config.agentId,
    agentName: config.agentName,
  });

  const [activePanel, setActivePanel] = useState<MonitorPanel>('devices');

  const addDevice = useCallback((device: DeviceStatus) => {
    setState(prev => ({
      ...prev,
      devices: [...prev.devices.filter(d => d.deviceId !== device.deviceId), device],
    }));
  }, []);

  const removeDevice = useCallback((deviceId: string) => {
    setState(prev => ({
      ...prev,
      devices: prev.devices.filter(d => d.deviceId !== deviceId),
    }));
  }, []);

  const recordHandoff = useCallback((event: HandoffEvent) => {
    setState(prev => {
      const history = [event, ...prev.handoffHistory].slice(0, maxHistory);
      const total = prev.metrics.totalHandoffs + 1;
      const successful = prev.metrics.successfulHandoffs + (event.status === 'success' ? 1 : 0);
      const failed = prev.metrics.failedHandoffs + (event.status === 'failed' ? 1 : 0);
      const avgMs = (prev.metrics.averageHandoffMs * prev.metrics.totalHandoffs + event.durationMs) / total;
      return {
        ...prev,
        handoffHistory: history,
        metrics: { ...prev.metrics, totalHandoffs: total, successfulHandoffs: successful, failedHandoffs: failed, averageHandoffMs: avgMs },
      };
    });
  }, [maxHistory]);

  const recordConflict = useCallback((conflict: CRDTConflictEvent) => {
    setState(prev => ({
      ...prev,
      crdtConflicts: [conflict, ...prev.crdtConflicts].slice(0, maxHistory),
      metrics: { ...prev.metrics, totalConflicts: prev.metrics.totalConflicts + 1 },
    }));
  }, [maxHistory]);

  const recordNormViolation = useCallback((violation: NormViolationEvent) => {
    setState(prev => ({
      ...prev,
      normViolations: [violation, ...prev.normViolations].slice(0, maxHistory),
      metrics: { ...prev.metrics, totalNormViolations: prev.metrics.totalNormViolations + 1 },
    }));
  }, [maxHistory]);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      handoffHistory: [],
      crdtConflicts: [],
      normViolations: [],
    }));
  }, []);

  // Update uptime periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        metrics: { ...prev.metrics, uptime: Date.now() - startTime.current },
      }));
    }, config.refreshIntervalMs ?? 1000);
    return () => clearInterval(interval);
  }, [config.refreshIntervalMs]);

  return {
    state, activePanel, setActivePanel,
    addDevice, removeDevice, recordHandoff, recordConflict, recordNormViolation, clearHistory,
  };
}
