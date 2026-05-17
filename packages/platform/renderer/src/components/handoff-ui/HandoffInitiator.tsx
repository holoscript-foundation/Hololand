/**
 * HandoffInitiator Component
 *
 * Main orchestrator for cross-reality device handoffs. Displays discovered
 * devices, an MVC payload preview, capability warnings, and a transfer
 * button that progresses through the handoff state machine:
 *
 *   Idle -> Negotiating -> Compressing -> Transferring -> Verified -> Complete
 *
 * The component is fully controlled: transfer state, progress, and payload
 * preview are provided via props by the parent (typically a session manager
 * or handoff hook). The onInitiateHandoff callback triggers the actual
 * handoff logic upstream.
 *
 * @module handoff-ui/HandoffInitiator
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  CrossRealitySessionManager,
  DeviceInfo,
  DiscoveredDevice,
  TransferState,
  PayloadPreview,
} from './types';
import { DeviceCard } from './DeviceCard';
import { PreviewPane } from './PreviewPane';

// =============================================================================
// PROPS
// =============================================================================

export interface HandoffInitiatorProps {
  /** List of devices discovered on the network */
  discoveredDevices?: DiscoveredDevice[];
  /** Legacy session-manager driven API */
  sessionManager?: CrossRealitySessionManager;
  /** Legacy current device descriptor */
  currentDevice?: DeviceInfo;
  /** Legacy discovered-device prop name */
  availableDevices?: DeviceInfo[];
  /** Current device's form factor (e.g. 'vr-headset') */
  currentFormFactor?: string;
  /** Called when the user initiates a handoff to a target device */
  onInitiateHandoff?: (targetDeviceId: string) => void;
  /** Called when the user cancels the handoff */
  onCancel?: () => void;
  /** Current transfer state (controlled) */
  transferState?: TransferState;
  /** Transfer progress percentage (0-100) */
  transferProgress?: number;
  /** MVC payload preview data */
  payloadPreview?: PayloadPreview;
  /** Capability degradation warnings */
  capabilityWarnings?: string[];
  /** Legacy callback fired by parent-driven handoff tests */
  onHandoffComplete?: (result: unknown) => void;
  /** Optional legacy visual theme */
  theme?: 'dark' | 'light' | Record<string, string>;
}

// =============================================================================
// TRANSFER BUTTON TEXT & COLORS
// =============================================================================

function getTransferButtonText(state: TransferState): string {
  switch (state) {
    case 'idle': return 'Transfer';
    case 'negotiating': return 'Negotiating...';
    case 'compressing': return 'Compressing...';
    case 'transferring': return 'Transferring...';
    case 'verified': return 'Verified';
    case 'complete': return 'Complete';
    case 'error': return 'Retry';
    default: return 'Transfer';
  }
}

function getTransferButtonColor(state: TransferState): string {
  switch (state) {
    case 'idle': return '#7c4dff';
    case 'complete': return '#4caf50';
    case 'verified': return '#4caf50';
    case 'error': return '#f44336';
    default: return '#2196f3';
  }
}

function isTransferActive(state: TransferState): boolean {
  return state === 'negotiating'
    || state === 'compressing'
    || state === 'transferring'
    || state === 'verified';
}

// =============================================================================
// STYLES
// =============================================================================

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  padding: '1.5rem',
  backgroundColor: '#0a0a0f',
  borderRadius: '8px',
  border: '1px solid #1e1e2e',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#e0e0e0',
};

const headerStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.2rem',
  fontWeight: 700,
  color: '#e0e0e0',
};

const subtitleStyle: React.CSSProperties = {
  margin: '0.25rem 0 0 0',
  fontSize: '0.8rem',
  color: '#888',
};

const deviceListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
};

const sectionLabelStyle: React.CSSProperties = {
  margin: '0 0 0.5rem 0',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#ccc',
};

const warningContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
};

const warningItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  backgroundColor: 'rgba(255, 152, 0, 0.1)',
  border: '1px solid rgba(255, 152, 0, 0.3)',
  fontSize: '0.8rem',
  color: '#e0e0e0',
  lineHeight: 1.4,
};

const warningIconStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: '0.9rem',
};

const transferButtonStyle = (
  disabled: boolean,
  state: TransferState,
): React.CSSProperties => ({
  width: '100%',
  padding: '0.75rem 1.25rem',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: disabled ? '#555' : getTransferButtonColor(state),
  border: 'none',
  borderRadius: '8px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background-color 0.2s ease, opacity 0.2s ease',
  fontFamily: 'inherit',
  opacity: disabled ? 0.5 : 1,
});

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#aaa',
  backgroundColor: 'transparent',
  border: '1px solid #444',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s ease',
};

const progressBarOuterStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  backgroundColor: '#1e1e2e',
  borderRadius: '3px',
  overflow: 'hidden',
};

const progressBarInnerStyle = (
  progress: number,
  state: TransferState,
): React.CSSProperties => ({
  width: `${Math.min(Math.max(progress, 0), 100)}%`,
  height: '100%',
  backgroundColor: state === 'error' ? '#f44336' : '#7c4dff',
  transition: 'width 0.3s ease',
});

const errorBoxStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  backgroundColor: 'rgba(244, 67, 54, 0.1)',
  border: '1px solid rgba(244, 67, 54, 0.4)',
  fontSize: '0.8rem',
  color: '#f44336',
  lineHeight: 1.4,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
};

const emptyStyle: React.CSSProperties = {
  padding: '2rem',
  textAlign: 'center',
  color: '#888',
  fontSize: '0.85rem',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const HandoffInitiator: React.FC<HandoffInitiatorProps> = ({
  discoveredDevices,
  availableDevices,
  currentDevice,
  currentFormFactor,
  sessionManager,
  onInitiateHandoff,
  onCancel,
  transferState = 'idle',
  transferProgress = 0,
  payloadPreview,
  capabilityWarnings,
}) => {
  const resolvedDevices = discoveredDevices ?? availableDevices ?? [];
  const resolvedFormFactor = currentFormFactor ?? currentDevice?.formFactor ?? 'unknown';
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const selectedDevice = useMemo(
    () => resolvedDevices.find((d) => d.deviceId === selectedDeviceId) ?? null,
    [resolvedDevices, selectedDeviceId],
  );

  const handleSelectDevice = useCallback((deviceId: string) => {
    if (!isTransferActive(transferState) && transferState !== 'complete') {
      setSelectedDeviceId(deviceId);
    }
  }, [transferState]);

  const handleTransfer = useCallback(() => {
    if (selectedDeviceId && transferState === 'idle') {
      if (onInitiateHandoff) {
        onInitiateHandoff(selectedDeviceId);
      } else {
        void sessionManager?.initiateHandoff(selectedDeviceId);
      }
    } else if (transferState === 'error' && selectedDeviceId) {
      // Allow retry from error state
      if (onInitiateHandoff) {
        onInitiateHandoff(selectedDeviceId);
      } else {
        void sessionManager?.initiateHandoff(selectedDeviceId);
      }
    }
  }, [selectedDeviceId, transferState, onInitiateHandoff, sessionManager]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  const canTransfer =
    selectedDevice !== null
    && (transferState === 'idle' || transferState === 'error');

  const showProgress =
    isTransferActive(transferState)
    || transferState === 'error';

  return (
    <div
      className="handoff-initiator"
      style={containerStyle}
      data-testid="handoff-initiator"
      role="dialog"
      aria-label="Cross-Reality Handoff"
    >
      {/* Header */}
      <div>
        <h2 style={headerStyle}>
          Cross-Reality Handoff
        </h2>
        <p style={subtitleStyle}>
          Transfer your agent session to another device. Current: {resolvedFormFactor}
        </p>
      </div>

      {/* Device list */}
      <div>
        <h3 style={sectionLabelStyle}>
          Discovered Devices ({resolvedDevices.length})
        </h3>
        {resolvedDevices.length === 0 ? (
          <div style={emptyStyle} data-testid="no-devices">
            No devices discovered
          </div>
        ) : (
          <div
            style={deviceListStyle}
            role="listbox"
            aria-label="Available devices"
          >
            {resolvedDevices.map((device) => (
              <DeviceCard
                key={device.deviceId}
                device={device}
                isSelected={device.deviceId === selectedDeviceId}
                onSelect={handleSelectDevice}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payload preview */}
      {payloadPreview && selectedDevice && (
        <PreviewPane payloadPreview={payloadPreview} />
      )}

      {/* Capability warnings */}
      {capabilityWarnings && capabilityWarnings.length > 0 && selectedDevice && (
        <div style={warningContainerStyle} data-testid="capability-warnings">
          <h3 style={sectionLabelStyle}>Capability Warnings</h3>
          {capabilityWarnings.map((warning, idx) => (
            <div
              key={idx}
              style={warningItemStyle}
              role="alert"
            >
              <span style={warningIconStyle} aria-hidden="true">
                {'\u26A0\uFE0F'}
              </span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {showProgress && (
        <div data-testid="progress-section">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.375rem',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: '#ccc', fontWeight: 500 }}>
              {getTransferButtonText(transferState)}
            </span>
            <span style={{ color: '#888' }}>
              {Math.round(transferProgress)}%
            </span>
          </div>
          <div style={progressBarOuterStyle}>
            <div
              style={progressBarInnerStyle(transferProgress, transferState)}
              role="progressbar"
              aria-valuenow={transferProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              data-testid="progress-bar"
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {transferState === 'error' && (
        <div style={errorBoxStyle} role="alert" data-testid="error-message">
          Handoff failed. Please check connectivity and try again.
        </div>
      )}

      {/* Transfer complete display */}
      {transferState === 'complete' && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.4)',
            fontSize: '0.85rem',
            color: '#4caf50',
            fontWeight: 500,
            textAlign: 'center',
          }}
          data-testid="complete-message"
        >
          Handoff complete. Agent session transferred successfully.
        </div>
      )}

      {/* Footer buttons */}
      <div style={footerStyle}>
        <button
          style={transferButtonStyle(!canTransfer, transferState)}
          onClick={handleTransfer}
          disabled={!canTransfer}
          aria-label={getTransferButtonText(transferState)}
          data-testid="transfer-button"
        >
          {getTransferButtonText(transferState)}
        </button>
        <button
          style={cancelButtonStyle}
          onClick={handleCancel}
          aria-label="Cancel handoff"
          data-testid="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default HandoffInitiator;
