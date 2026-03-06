/**
 * TranslationVisualization Component
 *
 * Visualizes real-time protocol translation events from the
 * normalization gateway. Shows source/target protocols, preserved
 * and lost fields, translation latency, and success/failure status.
 *
 * @module protocol-explorer/TranslationVisualization
 */

import React, { useMemo } from 'react';
import type {
  TranslationEvent,
  ProtocolType,
  ProtocolExplorerTheme,
} from './types';
import { getProtocolColor, formatLatency } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface TranslationVisualizationProps {
  /** Translation events (newest first) */
  translations: TranslationEvent[];
  /** Theme */
  theme: ProtocolExplorerTheme;
  /** Maximum visible events (default: 50) */
  maxVisible?: number;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TranslationVisualization: React.FC<TranslationVisualizationProps> = ({
  translations,
  theme,
  maxVisible = 50,
  className,
  style,
}) => {
  const visible = useMemo(
    () => translations.slice(0, maxVisible),
    [translations, maxVisible],
  );

  // Compute summary stats
  const stats = useMemo(() => {
    const total = translations.length;
    const successful = translations.filter((t) => t.status === 'success').length;
    const partial = translations.filter((t) => t.status === 'partial').length;
    const failed = translations.filter((t) => t.status === 'failed').length;
    const avgMs = total > 0
      ? translations.reduce((sum, t) => sum + t.translationMs, 0) / total
      : 0;
    return { total, successful, partial, failed, avgMs };
  }, [translations]);

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
      role="region"
      aria-label="Protocol translation visualization"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Protocol Translations ({stats.total})
        </span>
      </div>

      {/* Summary stats */}
      {stats.total > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '0.5rem',
            padding: '0.35rem 0.5rem',
            borderRadius: theme.borderRadius,
            backgroundColor: theme.cardBackground,
          }}
          role="status"
          aria-label="Translation statistics"
        >
          <StatBadge
            label="Success"
            value={stats.successful.toString()}
            color={theme.successColor}
            theme={theme}
          />
          <StatBadge
            label="Partial"
            value={stats.partial.toString()}
            color={theme.a2aColor}
            theme={theme}
          />
          <StatBadge
            label="Failed"
            value={stats.failed.toString()}
            color={theme.errorColor}
            theme={theme}
          />
          <StatBadge
            label="Avg Latency"
            value={formatLatency(stats.avgMs)}
            color={theme.textPrimary}
            theme={theme}
          />
        </div>
      )}

      {/* Translation events */}
      {visible.length === 0 ? (
        <div
          style={{
            padding: '0.75rem',
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
          }}
        >
          No protocol translations captured yet.
        </div>
      ) : (
        <div
          role="log"
          aria-label="Translation events"
          aria-live="polite"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            maxHeight: '250px',
            overflowY: 'auto',
          }}
        >
          {visible.map((event) => (
            <TranslationRow key={event.id} event={event} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatBadgeProps {
  label: string;
  value: string;
  color: string;
  theme: ProtocolExplorerTheme;
}

const StatBadge: React.FC<StatBadgeProps> = ({ label, value, color, theme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
    <span
      style={{
        fontSize: `calc(0.5rem * ${theme.fontScale})`,
        color: theme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: `calc(0.75rem * ${theme.fontScale})`,
        fontWeight: 600,
        color,
      }}
    >
      {value}
    </span>
  </div>
);

interface TranslationRowProps {
  event: TranslationEvent;
  theme: ProtocolExplorerTheme;
}

const TranslationRow: React.FC<TranslationRowProps> = ({ event, theme }) => {
  const fromColor = getProtocolColor(event.fromProtocol, theme);
  const toColor = getProtocolColor(event.toProtocol, theme);

  const statusColor = useMemo(() => {
    switch (event.status) {
      case 'success': return theme.successColor;
      case 'partial': return theme.a2aColor;
      case 'failed': return theme.errorColor;
      default: return theme.textMuted;
    }
  }, [event.status, theme]);

  const timestamp = new Date(event.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.3rem 0.4rem',
        borderRadius: '4px',
        backgroundColor: 'rgba(255,255,255,0.02)',
        fontSize: `calc(0.65rem * ${theme.fontScale})`,
      }}
    >
      {/* Timestamp */}
      <span
        style={{
          color: theme.textMuted,
          minWidth: '55px',
          flexShrink: 0,
          fontFamily: theme.monoFontFamily,
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
        }}
      >
        {timestamp}
      </span>

      {/* From protocol */}
      <span
        style={{
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          fontWeight: 700,
          color: fromColor,
          backgroundColor: `${fromColor}15`,
          borderRadius: '3px',
          padding: '0.05rem 0.2rem',
          minWidth: '28px',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {event.fromProtocol}
      </span>

      {/* Arrow */}
      <span
        style={{
          color: theme.textMuted,
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {'\u2192'}
      </span>

      {/* To protocol */}
      <span
        style={{
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          fontWeight: 700,
          color: toColor,
          backgroundColor: `${toColor}15`,
          borderRadius: '3px',
          padding: '0.05rem 0.2rem',
          minWidth: '28px',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {event.toProtocol}
      </span>

      {/* Status badge */}
      <span
        style={{
          fontSize: `calc(0.5rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: statusColor,
          border: `1px solid ${statusColor}40`,
          borderRadius: '3px',
          padding: '0.05rem 0.2rem',
          flexShrink: 0,
        }}
      >
        {event.status}
      </span>

      {/* Field info */}
      <span
        style={{
          flex: 1,
          color: theme.textMuted,
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {event.preservedFields.length} preserved
        {event.lostFields.length > 0 && (
          <span style={{ color: theme.errorColor }}>
            , {event.lostFields.length} lost
          </span>
        )}
        {event.notes && (
          <span style={{ color: theme.textMuted }}>
            {' '}- {event.notes}
          </span>
        )}
      </span>

      {/* Latency */}
      <span
        style={{
          color: theme.textMuted,
          fontSize: `calc(0.5rem * ${theme.fontScale})`,
          minWidth: '35px',
          textAlign: 'right',
          flexShrink: 0,
          fontFamily: theme.monoFontFamily,
        }}
      >
        {formatLatency(event.translationMs)}
      </span>
    </div>
  );
};

export default TranslationVisualization;
