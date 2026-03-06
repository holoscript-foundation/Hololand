import React from 'react';
import { TokPerSecond } from './TokPerSecond';
import { MemoryPressure } from './MemoryPressure';
import { ThermalWarning } from './ThermalWarning';
import type { OverlayMetrics } from './types';

interface VRPerformanceOverlayProps { metrics: OverlayMetrics; visible?: boolean; }

const NET_COLORS = { connected: '#4ade80', degraded: '#fbbf24', disconnected: '#ef4444' };

/** VRPerformanceOverlay -- Compact HUD overlay for VR. WCAG 2.1 compliant. */
export function VRPerformanceOverlay({ metrics, visible = true }: VRPerformanceOverlayProps) {
  if (!visible) return null;
  const fpsColor = metrics.fps >= 72 ? '#4ade80' : metrics.fps >= 45 ? '#fbbf24' : '#f87171';

  return (
    <div
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 9999,
        background: 'rgba(8, 9, 15, 0.9)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
        padding: '12px 16px', minWidth: 200, color: '#d0d0e8', fontFamily: "'Inter', sans-serif",
      }}
      role="complementary"
      aria-label="VR performance overlay"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: fpsColor, fontFamily: 'monospace' }}>{metrics.fps}</span>
        <span style={{ fontSize: 9, color: '#556677' }}>FPS</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <TokPerSecond value={metrics.tokPerSecond} />
        <MemoryPressure pressure={metrics.memoryPressure} usedMB={metrics.memoryUsedMB} totalMB={metrics.memoryTotalMB} />
        <ThermalWarning level={metrics.thermalLevel} temperatureC={metrics.temperatureC} />

        {/* Network */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: NET_COLORS[metrics.networkStatus] }} />
          <span style={{ fontSize: 10, color: NET_COLORS[metrics.networkStatus] }}>{metrics.networkLatencyMs}ms</span>
          <span style={{ fontSize: 9, color: '#556677' }}>{metrics.networkBandwidthKbps}kbps</span>
        </div>
      </div>
    </div>
  );
}
export default VRPerformanceOverlay;
