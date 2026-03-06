/**
 * MessageStream Component
 *
 * Displays a real-time stream of normalized protocol messages from
 * the MCP/A2A/ACP/ANP normalization gateway. Messages are filtered
 * based on the current filter criteria and color-coded by protocol.
 *
 * @module protocol-explorer/MessageStream
 */

import React, { useMemo, useCallback } from 'react';
import type {
  ProtocolMessage,
  MessageFilter,
  ProtocolType,
  ProtocolExplorerTheme,
  ProtocolExplorerActions,
} from './types';
import {
  PROTOCOL_CONFIG,
  getProtocolColor,
  getDirectionColor,
  formatBytes,
  formatLatency,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface MessageStreamProps {
  /** All captured messages (newest first) */
  messages: ProtocolMessage[];
  /** Active filter */
  filter: MessageFilter;
  /** Currently selected message ID */
  selectedMessageId: string | null;
  /** Actions */
  actions: ProtocolExplorerActions;
  /** Theme */
  theme: ProtocolExplorerTheme;
  /** Maximum visible messages (default: 100) */
  maxVisible?: number;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

// =============================================================================
// FILTER LOGIC
// =============================================================================

function matchesFilter(message: ProtocolMessage, filter: MessageFilter): boolean {
  // Protocol filter
  if (filter.protocols.size > 0 && !filter.protocols.has(message.protocol)) {
    return false;
  }

  // Direction filter
  if (filter.directions.size > 0 && !filter.directions.has(message.direction)) {
    return false;
  }

  // Category filter
  if (filter.categories.size > 0 && !filter.categories.has(message.category)) {
    return false;
  }

  // Agent filter (substring match on source/destination)
  if (filter.agentFilter) {
    const lowerAgent = filter.agentFilter.toLowerCase();
    const matchesSource = message.sourceName.toLowerCase().includes(lowerAgent)
      || message.sourceId.toLowerCase().includes(lowerAgent);
    const matchesDest = message.destinationName.toLowerCase().includes(lowerAgent)
      || message.destinationId.toLowerCase().includes(lowerAgent);
    if (!matchesSource && !matchesDest) {
      return false;
    }
  }

  // Search query (substring match on summary)
  if (filter.searchQuery) {
    const lowerQuery = filter.searchQuery.toLowerCase();
    if (!message.summary.toLowerCase().includes(lowerQuery)) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const MessageStream: React.FC<MessageStreamProps> = ({
  messages,
  filter,
  selectedMessageId,
  actions,
  theme,
  maxVisible = 100,
  className,
  style,
}) => {
  const filteredMessages = useMemo(
    () => messages.filter((m) => matchesFilter(m, filter)).slice(0, maxVisible),
    [messages, filter, maxVisible],
  );

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
      role="region"
      aria-label="Protocol message stream"
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
          Message Stream ({filteredMessages.length})
        </span>

        {/* Protocol filter pills */}
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          {(['MCP', 'A2A', 'ACP', 'ANP'] as ProtocolType[]).map((proto) => {
            const isActive = filter.protocols.has(proto);
            const color = getProtocolColor(proto, theme);
            return (
              <button
                key={proto}
                type="button"
                onClick={() => {
                  const next = new Set(filter.protocols);
                  if (next.has(proto)) {
                    next.delete(proto);
                  } else {
                    next.add(proto);
                  }
                  actions.setFilter({ protocols: next });
                }}
                style={{
                  fontSize: `calc(0.55rem * ${theme.fontScale})`,
                  fontWeight: 600,
                  fontFamily: theme.fontFamily,
                  color: isActive ? color : theme.textMuted,
                  backgroundColor: isActive ? `${color}15` : 'transparent',
                  border: `1px solid ${isActive ? color : theme.borderColor}`,
                  borderRadius: '3px',
                  padding: '0.1rem 0.3rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                aria-pressed={isActive}
                aria-label={`Filter ${PROTOCOL_CONFIG[proto].label}`}
              >
                {proto}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: '0.4rem' }}>
        <input
          type="text"
          value={filter.searchQuery}
          onChange={(e) => actions.setFilter({ searchQuery: e.target.value })}
          placeholder="Search messages..."
          style={{
            width: '100%',
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            fontFamily: theme.fontFamily,
            color: theme.textPrimary,
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '4px',
            padding: '0.3rem 0.5rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          aria-label="Search protocol messages"
        />
      </div>

      {/* Message list */}
      {filteredMessages.length === 0 ? (
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
          }}
        >
          No messages match current filters.
        </div>
      ) : (
        <div
          role="log"
          aria-label="Protocol messages"
          aria-live="polite"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.15rem',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {filteredMessages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              isSelected={message.id === selectedMessageId}
              onSelect={() => actions.selectMessage(
                message.id === selectedMessageId ? null : message.id,
              )}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface MessageRowProps {
  message: ProtocolMessage;
  isSelected: boolean;
  onSelect: () => void;
  theme: ProtocolExplorerTheme;
}

const MessageRow: React.FC<MessageRowProps> = ({
  message,
  isSelected,
  onSelect,
  theme,
}) => {
  const protocolColor = getProtocolColor(message.protocol, theme);
  const directionColor = getDirectionColor(message.direction, theme);
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.25rem 0.4rem',
        borderRadius: '4px',
        backgroundColor: isSelected ? `${theme.accentColor}15` : 'transparent',
        border: isSelected ? `1px solid ${theme.accentColor}40` : '1px solid transparent',
        cursor: 'pointer',
        fontSize: `calc(0.65rem * ${theme.fontScale})`,
        transition: 'background-color 0.1s ease',
      }}
      aria-label={`${message.protocol} ${message.direction} ${message.category}: ${message.summary}`}
      aria-selected={isSelected}
    >
      {/* Timestamp */}
      <span
        style={{
          color: theme.textMuted,
          minWidth: '55px',
          flexShrink: 0,
          fontFamily: theme.monoFontFamily,
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
        }}
      >
        {timestamp}
      </span>

      {/* Protocol badge */}
      <span
        style={{
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          fontWeight: 700,
          color: protocolColor,
          backgroundColor: `${protocolColor}15`,
          borderRadius: '3px',
          padding: '0.05rem 0.2rem',
          minWidth: '28px',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {message.protocol}
      </span>

      {/* Direction arrow */}
      <span
        style={{
          color: directionColor,
          flexShrink: 0,
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
        }}
        aria-hidden="true"
      >
        {message.direction === 'inbound' ? '\u2190' : '\u2192'}
      </span>

      {/* Category */}
      <span
        style={{
          color: theme.textMuted,
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          minWidth: '60px',
          flexShrink: 0,
        }}
      >
        {message.category.replace(/_/g, ' ')}
      </span>

      {/* Summary */}
      <span
        style={{
          color: message.error ? theme.errorColor : theme.textSecondary,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {message.summary}
      </span>

      {/* Translation indicator */}
      {message.isTranslated && (
        <span
          style={{
            fontSize: `calc(0.5rem * ${theme.fontScale})`,
            color: theme.accentColor,
            border: `1px solid ${theme.accentColor}40`,
            borderRadius: '2px',
            padding: '0 0.15rem',
            flexShrink: 0,
          }}
          title={`Translated from ${message.originalProtocol}`}
        >
          xlat
        </span>
      )}

      {/* Size */}
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
        {formatBytes(message.sizeBytes)}
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
        {formatLatency(message.latencyMs)}
      </span>
    </div>
  );
};

export default MessageStream;
