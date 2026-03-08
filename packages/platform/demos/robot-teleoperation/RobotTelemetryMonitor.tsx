/**
 * Robot Telemetry Monitor Component
 *
 * Real-time React dashboard for monitoring robot teleoperation state.
 * Displays joint angles, forces, latency, battery, and performance metrics.
 *
 * FEATURES:
 * - Real-time joint angle visualization (37-DOF humanoid or 6-DOF UR5e)
 * - Contact force vector display
 * - Network latency graph
 * - Battery status with warnings
 * - Safety boundary violations
 * - Performance metrics (IK solve time, policy inference, camera FPS)
 * - Connection status indicators
 *
 * @module RobotTelemetryMonitor
 */

import React, { useEffect, useState, useMemo } from 'react';
import type {
  RobotState,
  TeleoperationHubMetrics,
  RobotJointName,
  Vec3,
} from '@hololand/platform/renderer';

// =============================================================================
// TYPES
// =============================================================================

export interface RobotTelemetryMonitorProps {
  // Real-time state from TeleoperationHub
  robotState: RobotState | null;
  metrics: TeleoperationHubMetrics | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';

  // Optional configuration
  updateRateHz?: number;
  showJointDiagram?: boolean;
  showForceVectors?: boolean;
  showLatencyGraph?: boolean;
  compactMode?: boolean;
}

interface JointAngles {
  [joint: string]: {
    angle: number;
    velocity: number;
    torque: number;
    temperature: number;
  };
}

interface LatencyDataPoint {
  timestamp: number;
  latency: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatJointAngle(radians: number): string {
  return `${(radians * (180 / Math.PI)).toFixed(1)}°`;
}

function formatForce(newtons: number): string {
  return `${newtons.toFixed(1)}N`;
}

function formatLatency(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

function formatBattery(level: number): string {
  return `${level.toFixed(0)}%`;
}

function getBatteryColor(level: number): string {
  if (level > 50) return '#00ff88';
  if (level > 20) return '#ffaa00';
  return '#ff4444';
}

function getLatencyColor(latency: number): string {
  if (latency < 50) return '#00ff88';
  if (latency < 100) return '#ffaa00';
  return '#ff4444';
}

function getForceColor(force: number): string {
  if (force < 20) return '#00ff88';
  if (force < 50) return '#ffaa00';
  if (force < 80) return '#ff6600';
  return '#ff0000';
}

function getConnectionColor(state: string): string {
  switch (state) {
    case 'connected':
      return '#00ff88';
    case 'connecting':
      return '#ffaa00';
    case 'error':
      return '#ff4444';
    default:
      return '#888888';
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const RobotTelemetryMonitor: React.FC<RobotTelemetryMonitorProps> = ({
  robotState,
  metrics,
  connectionState,
  updateRateHz = 10,
  showJointDiagram = true,
  showForceVectors = true,
  showLatencyGraph = true,
  compactMode = false,
}) => {
  // State for latency history
  const [latencyHistory, setLatencyHistory] = useState<LatencyDataPoint[]>([]);

  // Update latency history
  useEffect(() => {
    if (!metrics) return;

    const newPoint: LatencyDataPoint = {
      timestamp: Date.now(),
      latency: metrics.latencyMs,
    };

    setLatencyHistory((prev) => {
      const updated = [...prev, newPoint];
      // Keep last 60 samples (6 seconds at 10Hz)
      return updated.slice(-60);
    });
  }, [metrics?.latencyMs]);

  // Memoized joint groupings for UR5e
  const ur5eJoints = useMemo(() => {
    if (!robotState?.joints) return null;

    return {
      shoulder: [
        { name: 'shoulder_pan', ...robotState.joints.shoulder_pan },
        { name: 'shoulder_lift', ...robotState.joints.shoulder_lift },
      ],
      arm: [
        { name: 'elbow', ...robotState.joints.elbow },
      ],
      wrist: [
        { name: 'wrist_1', ...robotState.joints.wrist_1 },
        { name: 'wrist_2', ...robotState.joints.wrist_2 },
        { name: 'wrist_3', ...robotState.joints.wrist_3 },
      ],
    };
  }, [robotState?.joints]);

  // Render connection indicator
  const renderConnectionStatus = () => (
    <div className="connection-status" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '8px',
      borderLeft: `4px solid ${getConnectionColor(connectionState)}`,
    }}>
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: getConnectionColor(connectionState),
        animation: connectionState === 'connecting' ? 'pulse 1s infinite' : 'none',
      }} />
      <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: 500 }}>
        {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
      </span>
    </div>
  );

  // Render battery indicator
  const renderBattery = () => {
    if (!robotState) return null;

    const level = robotState.batteryLevel;
    const color = getBatteryColor(level);

    return (
      <div className="battery-indicator" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
      }}>
        <div style={{
          width: '40px',
          height: '20px',
          border: `2px solid ${color}`,
          borderRadius: '4px',
          padding: '2px',
          position: 'relative',
        }}>
          <div style={{
            width: `${level}%`,
            height: '100%',
            background: color,
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
          <div style={{
            position: 'absolute',
            right: '-6px',
            top: '6px',
            width: '4px',
            height: '8px',
            background: color,
            borderRadius: '0 2px 2px 0',
          }} />
        </div>
        <span style={{ color, fontSize: '14px', fontWeight: 500 }}>
          {formatBattery(level)}
        </span>
      </div>
    );
  };

  // Render latency indicator
  const renderLatency = () => {
    if (!metrics) return null;

    const latency = metrics.latencyMs;
    const color = getLatencyColor(latency);

    return (
      <div className="latency-indicator" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
      }}>
        <span style={{ color: '#9ca3af', fontSize: '12px' }}>Latency:</span>
        <span style={{ color, fontSize: '14px', fontWeight: 500 }}>
          {formatLatency(latency)}
        </span>
      </div>
    );
  };

  // Render joint diagram for UR5e
  const renderJointDiagram = () => {
    if (!showJointDiagram || !ur5eJoints) return null;

    const renderJointGroup = (title: string, joints: any[]) => (
      <div className="joint-group" style={{ marginBottom: '16px' }}>
        <h4 style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>
          {title}
        </h4>
        {joints.map((joint) => (
          <div key={joint.name} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 8px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            marginBottom: '4px',
          }}>
            <span style={{ color: '#d1d5db', fontSize: '12px' }}>
              {joint.name.replace(/_/g, ' ')}
            </span>
            <span style={{ color: '#00ff88', fontSize: '12px', fontWeight: 500 }}>
              {formatJointAngle(joint.angle)}
            </span>
          </div>
        ))}
      </div>
    );

    return (
      <div className="joint-diagram" style={{
        padding: '16px',
        background: 'rgba(20, 25, 35, 0.95)',
        borderRadius: '12px',
        marginTop: '16px',
      }}>
        <h3 style={{ color: '#e0e0e0', fontSize: '14px', marginBottom: '12px' }}>
          Joint Angles
        </h3>
        {renderJointGroup('Shoulder', ur5eJoints.shoulder)}
        {renderJointGroup('Arm', ur5eJoints.arm)}
        {renderJointGroup('Wrist', ur5eJoints.wrist)}
      </div>
    );
  };

  // Render force vectors
  const renderForceVectors = () => {
    if (!showForceVectors || !robotState) return null;

    const leftForce = robotState.contactForces.leftHand;
    const rightForce = robotState.contactForces.rightHand;

    const leftMagnitude = Math.sqrt(
      leftForce.x ** 2 + leftForce.y ** 2 + leftForce.z ** 2,
    );
    const rightMagnitude = Math.sqrt(
      rightForce.x ** 2 + rightForce.y ** 2 + rightForce.z ** 2,
    );

    const renderForce = (label: string, magnitude: number) => (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '4px',
        marginBottom: '8px',
      }}>
        <span style={{ color: '#d1d5db', fontSize: '12px' }}>{label}</span>
        <span style={{
          color: getForceColor(magnitude),
          fontSize: '14px',
          fontWeight: 500,
        }}>
          {formatForce(magnitude)}
        </span>
        <div style={{
          width: '100px',
          height: '8px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min((magnitude / 100) * 100, 100)}%`,
            height: '100%',
            background: getForceColor(magnitude),
            transition: 'width 0.2s ease',
          }} />
        </div>
      </div>
    );

    return (
      <div className="force-vectors" style={{
        padding: '16px',
        background: 'rgba(20, 25, 35, 0.95)',
        borderRadius: '12px',
        marginTop: '16px',
      }}>
        <h3 style={{ color: '#e0e0e0', fontSize: '14px', marginBottom: '12px' }}>
          Contact Forces
        </h3>
        {renderForce('Left Hand', leftMagnitude)}
        {renderForce('Right Hand', rightMagnitude)}
      </div>
    );
  };

  // Render latency graph
  const renderLatencyGraph = () => {
    if (!showLatencyGraph || latencyHistory.length === 0) return null;

    const maxLatency = Math.max(...latencyHistory.map((p) => p.latency), 100);
    const width = 280;
    const height = 80;
    const padding = 10;

    const points = latencyHistory
      .map((point, i) => {
        const x = padding + (i / (latencyHistory.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((point.latency / maxLatency) * (height - 2 * padding));
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="latency-graph" style={{
        padding: '16px',
        background: 'rgba(20, 25, 35, 0.95)',
        borderRadius: '12px',
        marginTop: '16px',
      }}>
        <h3 style={{ color: '#e0e0e0', fontSize: '14px', marginBottom: '12px' }}>
          Network Latency (6s window)
        </h3>
        <svg width={width} height={height} style={{ display: 'block' }}>
          {/* Grid lines */}
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="rgba(100, 110, 130, 0.3)"
            strokeWidth="1"
          />

          {/* Latency line */}
          <polyline
            points={points}
            fill="none"
            stroke="#00ff88"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Warning threshold (100ms) */}
          {maxLatency > 100 && (
            <line
              x1={padding}
              y1={height - padding - ((100 / maxLatency) * (height - 2 * padding))}
              x2={width - padding}
              y2={height - padding - ((100 / maxLatency) * (height - 2 * padding))}
              stroke="#ffaa00"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}
        </svg>
      </div>
    );
  };

  // Render performance metrics
  const renderPerformanceMetrics = () => {
    if (!metrics) return null;

    const metricItem = (label: string, value: string, color: string) => (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 8px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '4px',
        marginBottom: '4px',
      }}>
        <span style={{ color: '#9ca3af', fontSize: '11px' }}>{label}</span>
        <span style={{ color, fontSize: '12px', fontWeight: 500 }}>{value}</span>
      </div>
    );

    return (
      <div className="performance-metrics" style={{
        padding: '16px',
        background: 'rgba(20, 25, 35, 0.95)',
        borderRadius: '12px',
        marginTop: '16px',
      }}>
        <h3 style={{ color: '#e0e0e0', fontSize: '14px', marginBottom: '12px' }}>
          Performance
        </h3>
        {metricItem('IK Solve', `${metrics.ikSolveTimeMs.toFixed(2)}ms`, '#00ff88')}
        {metricItem('Policy Inference', `${metrics.npuInferenceTimeMs.toFixed(1)}ms`, '#00aaff')}
        {metricItem('Camera FPS', `${metrics.cameraFps.toFixed(0)}`, '#00ff88')}
        {metricItem('Command Rate', `${metrics.commandRateHz.toFixed(0)}Hz`, '#00ff88')}
        {metricItem('Boundary Violations', `${metrics.boundaryViolations}`, '#ffaa00')}
      </div>
    );
  };

  // Main render
  if (compactMode) {
    return (
      <div className="robot-telemetry-monitor-compact" style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        background: 'rgba(20, 25, 35, 0.95)',
        borderRadius: '12px',
      }}>
        {renderConnectionStatus()}
        {renderBattery()}
        {renderLatency()}
      </div>
    );
  }

  return (
    <div className="robot-telemetry-monitor" style={{
      width: '320px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: 'rgba(20, 25, 35, 0.95)',
        borderRadius: '12px',
      }}>
        <h2 style={{ color: '#e0e0e0', fontSize: '18px', margin: 0 }}>
          Robot Telemetry
        </h2>

        <div style={{ display: 'flex', gap: '12px' }}>
          {renderConnectionStatus()}
          {renderBattery()}
        </div>

        {renderLatency()}
      </div>

      {renderJointDiagram()}
      {renderForceVectors()}
      {renderLatencyGraph()}
      {renderPerformanceMetrics()}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default RobotTelemetryMonitor;
