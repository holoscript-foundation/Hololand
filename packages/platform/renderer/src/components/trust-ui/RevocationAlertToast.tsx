/**
 * RevocationAlertToast Component
 *
 * Displays toast notifications for trust revocation and degradation events.
 * Supports multiple concurrent alerts, auto-dismiss, and manual dismiss.
 *
 * Features:
 * - Stacked toast notifications (newest on top)
 * - Severity-based coloring (warning, critical, info)
 * - Auto-dismiss with configurable timeout
 * - Manual dismiss with close button
 * - Progress bar showing auto-dismiss countdown
 * - Accessible announcements via aria-live
 * - Animated entry and exit transitions
 * - Action buttons for responding to alerts
 *
 * Integration:
 * - Consumes TrustAction events from BehavioralTrustScoring.onTrustAction()
 * - Uses RevocationAlert from the types module
 * - Triggered by VRTrustHandshake trust level changes
 *
 * @module trust-ui/RevocationAlertToast
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  TrustUITheme,
  RevocationAlert,
  RevocationSeverity,
} from './types';
import {
  TRUST_TIER_CONFIG,
  DEFAULT_TRUST_UI_THEME,
  scoreToTier,
} from './types';
import { TierBadge } from './TierBadge';

// =============================================================================
// TYPES
// =============================================================================

export interface RevocationAlertToastProps {
  /** List of active alerts to display */
  alerts: RevocationAlert[];
  /** Position of the toast stack on screen */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  /** Maximum number of toasts visible at once */
  maxVisible?: number;
  /** Callback when an alert is dismissed */
  onDismiss?: (alertId: string) => void;
  /** Callback when the user clicks "View Details" on an alert */
  onViewDetails?: (alert: RevocationAlert) => void;
  /** Callback when the user clicks "Re-verify" on a degradation alert */
  onReverify?: (alert: RevocationAlert) => void;
  /** Custom CSS class name */
  className?: string;
  /** Theme overrides */
  theme?: Partial<TrustUITheme>;
}

export interface SingleToastProps {
  alert: RevocationAlert;
  onDismiss: (alertId: string) => void;
  onViewDetails?: (alert: RevocationAlert) => void;
  onReverify?: (alert: RevocationAlert) => void;
  theme: TrustUITheme;
}

// =============================================================================
// SEVERITY CONFIGURATION
// =============================================================================

interface SeverityConfig {
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
  icon: string;
  textColor: string;
}

const SEVERITY_CONFIGS: Record<RevocationSeverity, SeverityConfig> = {
  critical: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    iconColor: '#DC2626',
    icon: '\u26D4', // No Entry
    textColor: '#991B1B',
  },
  warning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    iconColor: '#D97706',
    icon: '\u26A0', // Warning
    textColor: '#92400E',
  },
  info: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    iconColor: '#2563EB',
    icon: '\u2139', // Info
    textColor: '#1E40AF',
  },
};

// =============================================================================
// POSITION CONFIGURATION
// =============================================================================

type ToastPosition = RevocationAlertToastProps['position'];

function getPositionStyles(position: ToastPosition): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    maxWidth: '400px',
    width: '100%',
    pointerEvents: 'none',
  };

  switch (position) {
    case 'top-right':
      return { ...base, top: '1rem', right: '1rem' };
    case 'top-left':
      return { ...base, top: '1rem', left: '1rem' };
    case 'bottom-right':
      return { ...base, bottom: '1rem', right: '1rem', flexDirection: 'column-reverse' };
    case 'bottom-left':
      return { ...base, bottom: '1rem', left: '1rem', flexDirection: 'column-reverse' };
    case 'top-center':
      return { ...base, top: '1rem', left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-center':
      return { ...base, bottom: '1rem', left: '50%', transform: 'translateX(-50%)', flexDirection: 'column-reverse' };
    default:
      return { ...base, top: '1rem', right: '1rem' };
  }
}

// =============================================================================
// TOAST CONTAINER COMPONENT
// =============================================================================

export const RevocationAlertToast: React.FC<RevocationAlertToastProps> = ({
  alerts,
  position = 'top-right',
  maxVisible = 5,
  onDismiss,
  onViewDetails,
  onReverify,
  className,
  theme: themeOverride,
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_TRUST_UI_THEME, ...themeOverride }),
    [themeOverride],
  );

  // Filter to visible, non-dismissed alerts
  const visibleAlerts = useMemo(() => {
    return alerts
      .filter((a) => !a.dismissed)
      .slice(0, maxVisible);
  }, [alerts, maxVisible]);

  const handleDismiss = useCallback((alertId: string) => {
    onDismiss?.(alertId);
  }, [onDismiss]);

  if (visibleAlerts.length === 0) return null;

  return (
    <div
      className={className}
      style={getPositionStyles(position)}
      role="region"
      aria-label="Trust alerts"
    >
      {/* Aria-live region for screen reader announcements */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
        }}
      >
        {visibleAlerts.length > 0 && (
          <span>
            {visibleAlerts[0].severity === 'critical' ? 'Critical' : 'Warning'} trust alert:
            {' '}{visibleAlerts[0].message}
          </span>
        )}
      </div>

      {visibleAlerts.map((alert) => (
        <SingleToast
          key={alert.id}
          alert={alert}
          onDismiss={handleDismiss}
          onViewDetails={onViewDetails}
          onReverify={onReverify}
          theme={theme}
        />
      ))}

      {/* Overflow indicator */}
      {alerts.filter((a) => !a.dismissed).length > maxVisible && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: theme.textMuted,
            fontFamily: theme.fontFamily,
            padding: '0.25rem',
            pointerEvents: 'auto',
          }}
        >
          +{alerts.filter((a) => !a.dismissed).length - maxVisible} more alerts
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SINGLE TOAST COMPONENT
// =============================================================================

const SingleToast: React.FC<SingleToastProps> = ({
  alert,
  onDismiss,
  onViewDetails,
  onReverify,
  theme,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const severityConfig = SEVERITY_CONFIGS[alert.severity];
  const tier = scoreToTier(alert.compositeScore);

  // Auto-dismiss countdown
  useEffect(() => {
    if (alert.autoDismissMs <= 0) return;

    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / alert.autoDismissMs) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        handleDismiss();
      }
    }, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [alert.autoDismissMs, alert.id]);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsExiting(true);
    // Allow exit animation to complete
    setTimeout(() => {
      onDismiss(alert.id);
    }, 200);
  }, [alert.id, onDismiss]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(alert);
  }, [alert, onViewDetails]);

  const handleReverify = useCallback(() => {
    onReverify?.(alert);
  }, [alert, onReverify]);

  // Pause auto-dismiss on hover
  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (alert.autoDismissMs <= 0) return;

    const elapsed = Date.now() - startTimeRef.current;
    const remainingMs = alert.autoDismissMs - elapsed;
    if (remainingMs <= 0) {
      handleDismiss();
      return;
    }

    timerRef.current = setInterval(() => {
      const totalElapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (totalElapsed / alert.autoDismissMs) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        handleDismiss();
      }
    }, 50);
  }, [alert.autoDismissMs, handleDismiss]);

  const timeAgo = useMemo(() => {
    const seconds = Math.floor((Date.now() - alert.timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [alert.timestamp]);

  const actionLabel = useMemo(() => {
    switch (alert.action) {
      case 'degrade': return 'Trust Degraded';
      case 'revoke': return 'Trust Revoked';
      case 'recover': return 'Trust Recovered';
      default: return 'Trust Alert';
    }
  }, [alert.action]);

  return (
    <div
      style={{
        fontFamily: theme.fontFamily,
        backgroundColor: severityConfig.backgroundColor,
        border: `1px solid ${severityConfig.borderColor}`,
        borderLeft: `4px solid ${severityConfig.iconColor}`,
        borderRadius: theme.borderRadius,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        pointerEvents: 'auto',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
      role="alert"
      aria-label={`${alert.severity} alert: ${alert.message}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Toast content */}
      <div style={{ padding: '0.75rem 0.75rem 0.5rem' }}>
        {/* Header row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}>
          {/* Severity icon */}
          <span
            style={{
              fontSize: '1.1rem',
              lineHeight: 1,
              flexShrink: 0,
              marginTop: '0.1rem',
            }}
            aria-hidden="true"
          >
            {severityConfig.icon}
          </span>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.3rem',
            }}>
              <span style={{
                fontWeight: 700,
                fontSize: '0.85rem',
                color: severityConfig.textColor,
              }}>
                {actionLabel}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TierBadge
                  tier={tier}
                  score={alert.compositeScore}
                  size="sm"
                  variant="pill"
                  showScore={true}
                  showIcon={false}
                />
                <span style={{
                  fontSize: '0.65rem',
                  color: theme.textMuted,
                  whiteSpace: 'nowrap',
                }}>
                  {timeAgo}
                </span>
              </div>
            </div>

            {/* Message */}
            <p style={{
              margin: '0 0 0.3rem 0',
              fontSize: '0.8rem',
              color: severityConfig.textColor,
              lineHeight: 1.4,
            }}>
              {alert.message}
            </p>

            {/* Agent info */}
            <div style={{
              fontSize: '0.72rem',
              color: theme.textMuted,
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}>
              <span>Agent: {alert.agentName ?? alert.agentId}</span>
              {alert.primaryCause && (
                <span>
                  Cause: {alert.primaryCause.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {/* Reason (if provided) */}
            {alert.reason && (
              <p style={{
                margin: '0.3rem 0 0 0',
                fontSize: '0.72rem',
                color: theme.textSecondary,
                fontStyle: 'italic',
              }}>
                {alert.reason}
              </p>
            )}

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              gap: '0.4rem',
              marginTop: '0.5rem',
            }}>
              {onViewDetails && (
                <button
                  onClick={handleViewDetails}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    backgroundColor: 'transparent',
                    border: `1px solid ${severityConfig.borderColor}`,
                    borderRadius: '4px',
                    color: severityConfig.textColor,
                    cursor: 'pointer',
                    fontFamily: theme.fontFamily,
                  }}
                  aria-label="View alert details"
                >
                  View Details
                </button>
              )}
              {onReverify && alert.action === 'degrade' && (
                <button
                  onClick={handleReverify}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    backgroundColor: TRUST_TIER_CONFIG.T2.color,
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontFamily: theme.fontFamily,
                  }}
                  aria-label="Re-verify agent trust"
                >
                  Re-verify
                </button>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              color: theme.textMuted,
              padding: '0',
              lineHeight: 1,
              flexShrink: 0,
            }}
            aria-label="Dismiss alert"
          >
            {'\u2715'}
          </button>
        </div>
      </div>

      {/* Auto-dismiss progress bar */}
      {alert.autoDismissMs > 0 && (
        <div
          style={{
            height: '3px',
            backgroundColor: `${severityConfig.borderColor}44`,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: severityConfig.iconColor,
              transition: 'width 0.1s linear',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default RevocationAlertToast;
