/**
 * DeviceCard Component
 *
 * Displays a single discovered device with its form factor icon (emoji),
 * capabilities list, and a "Select" button. Highlights the selected device
 * with an accent border and background shift.
 *
 * Used within HandoffInitiator to render the list of available handoff targets.
 *
 * @module handoff-ui/DeviceCard
 */

import React from 'react';
import type { DiscoveredDevice } from './types';
import { getFormFactorIcon, getFormFactorLabel } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface DeviceCardProps {
  /** Device data to display */
  device: DiscoveredDevice;
  /** Whether this device is currently selected */
  isSelected: boolean;
  /** Called when the user clicks the Select button */
  onSelect: (deviceId: string) => void;
}

// =============================================================================
// STYLES
// =============================================================================

const cardStyle = (isSelected: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '0.875rem 1rem',
  borderRadius: '8px',
  backgroundColor: isSelected ? '#1a1a2e' : '#0f0f17',
  border: `2px solid ${isSelected ? '#7c4dff' : '#1e1e2e'}`,
  cursor: 'pointer',
  transition: 'border-color 0.2s ease, background-color 0.2s ease',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  userSelect: 'none',
});

const iconContainerStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  lineHeight: 1,
  flexShrink: 0,
  width: '2.5rem',
  height: '2.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const deviceInfoStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  minWidth: 0,
};

const deviceIdStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#e0e0e0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const formFactorLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#888',
  fontWeight: 500,
};

const capabilitiesRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
  marginTop: '0.375rem',
};

const badgeStyle = (available: boolean): React.CSSProperties => ({
  fontSize: '0.65rem',
  padding: '0.1rem 0.35rem',
  borderRadius: '4px',
  backgroundColor: available ? 'rgba(76, 175, 80, 0.15)' : 'rgba(136, 136, 136, 0.15)',
  border: `1px solid ${available ? 'rgba(76, 175, 80, 0.5)' : 'rgba(136, 136, 136, 0.3)'}`,
  color: available ? '#4caf50' : '#888',
  fontWeight: 500,
  lineHeight: 1.3,
});

const selectButtonStyle = (isSelected: boolean): React.CSSProperties => ({
  padding: '0.35rem 0.75rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: isSelected ? '#fff' : '#ccc',
  backgroundColor: isSelected ? '#7c4dff' : 'transparent',
  border: `1px solid ${isSelected ? '#7c4dff' : '#555'}`,
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  flexShrink: 0,
  alignSelf: 'center',
  fontFamily: 'inherit',
});

// =============================================================================
// COMPONENT
// =============================================================================

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isSelected,
  onSelect,
}) => {
  const icon = getFormFactorIcon(device.formFactor);
  const label = getFormFactorLabel(device.formFactor);

  const handleClick = () => {
    onSelect(device.deviceId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className="device-card"
      style={cardStyle(isSelected)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="option"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`${label} ${device.deviceId}${isSelected ? ' - selected' : ''}`}
      data-testid={`device-card-${device.deviceId}`}
    >
      {/* Form factor icon */}
      <div style={iconContainerStyle} aria-hidden="true">
        {icon}
      </div>

      {/* Device info */}
      <div style={deviceInfoStyle}>
        <div style={deviceIdStyle} title={device.deviceId}>
          {device.deviceId}
        </div>
        <div style={formFactorLabelStyle}>
          {label}
        </div>

        {/* Capabilities */}
        <div style={capabilitiesRowStyle}>
          {device.embodiments.map((emb) => (
            <span key={`emb-${emb}`} style={badgeStyle(true)}>
              {emb}
            </span>
          ))}
          {device.inputModalities.map((mod) => (
            <span key={`mod-${mod}`} style={badgeStyle(true)}>
              {mod}
            </span>
          ))}
          <span
            key="geo"
            style={badgeStyle(device.hasGeospatial)}
          >
            {device.hasGeospatial ? 'Geospatial' : 'No Geospatial'}
          </span>
        </div>
      </div>

      {/* Select button */}
      <button
        style={selectButtonStyle(isSelected)}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        aria-label={isSelected ? `${device.deviceId} selected` : `Select ${device.deviceId}`}
        data-testid={`select-btn-${device.deviceId}`}
      >
        {isSelected ? 'Selected' : 'Select'}
      </button>
    </div>
  );
};

export default DeviceCard;
