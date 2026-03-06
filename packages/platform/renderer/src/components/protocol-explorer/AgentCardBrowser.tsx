/**
 * AgentCardBrowser Component
 *
 * Browsable list of A2A Agent Cards showing discoverable capabilities
 * for each registered agent. Supports search/filter, capability drill-down,
 * and protocol badge display.
 *
 * @module protocol-explorer/AgentCardBrowser
 */

import React, { useMemo, useState, useCallback } from 'react';
import type {
  AgentCard,
  ProtocolType,
  ProtocolExplorerTheme,
} from './types';
import { PROTOCOL_CONFIG, getProtocolColor } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentCardBrowserProps {
  /** Known Agent Cards */
  agentCards: AgentCard[];
  /** Theme */
  theme: ProtocolExplorerTheme;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AgentCardBrowser: React.FC<AgentCardBrowserProps> = ({
  agentCards,
  theme,
  className,
  style,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  const filteredCards = useMemo(() => {
    if (!searchQuery) return agentCards;
    const lower = searchQuery.toLowerCase();
    return agentCards.filter(
      (card) =>
        card.name.toLowerCase().includes(lower) ||
        card.description.toLowerCase().includes(lower) ||
        card.agentId.toLowerCase().includes(lower) ||
        card.tags.some((t) => t.toLowerCase().includes(lower)) ||
        card.capabilities.some((c) => c.name.toLowerCase().includes(lower)),
    );
  }, [agentCards, searchQuery]);

  const toggleExpand = useCallback((agentId: string) => {
    setExpandedAgentId((prev) => (prev === agentId ? null : agentId));
  }, []);

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
      role="region"
      aria-label="Agent Card browser"
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
          Agent Cards ({filteredCards.length})
        </span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '0.5rem' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search agents, capabilities, tags..."
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
          aria-label="Search agent cards"
        />
      </div>

      {/* Agent card list */}
      {filteredCards.length === 0 ? (
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
          }}
        >
          {agentCards.length === 0
            ? 'No agent cards discovered yet.'
            : 'No agents match search query.'}
        </div>
      ) : (
        <div
          role="list"
          aria-label="Discovered agent cards"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            maxHeight: '350px',
            overflowY: 'auto',
          }}
        >
          {filteredCards.map((card) => (
            <AgentCardItem
              key={card.agentId}
              card={card}
              isExpanded={card.agentId === expandedAgentId}
              onToggle={() => toggleExpand(card.agentId)}
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

interface AgentCardItemProps {
  card: AgentCard;
  isExpanded: boolean;
  onToggle: () => void;
  theme: ProtocolExplorerTheme;
}

const AgentCardItem: React.FC<AgentCardItemProps> = ({
  card,
  isExpanded,
  onToggle,
  theme,
}) => {
  const lastSeenAgo = useMemo(() => {
    const diff = Date.now() - card.lastSeenAt;
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
  }, [card.lastSeenAt]);

  return (
    <div
      role="listitem"
      style={{
        borderRadius: theme.borderRadius,
        backgroundColor: theme.cardBackground,
        border: `1px solid ${isExpanded ? theme.accentColor + '40' : theme.borderColor}`,
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* Card header (clickable) */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.5rem 0.6rem',
          cursor: 'pointer',
        }}
        aria-expanded={isExpanded}
        aria-label={`Agent: ${card.name} (${card.agentId})`}
      >
        {/* Online indicator */}
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: card.isOnline ? theme.successColor : theme.textMuted,
            boxShadow: card.isOnline ? `0 0 4px ${theme.successColor}` : 'none',
            flexShrink: 0,
          }}
          aria-hidden="true"
          title={card.isOnline ? 'Online' : 'Offline'}
        />

        {/* Agent info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span
              style={{
                fontSize: `calc(0.75rem * ${theme.fontScale})`,
                fontWeight: 600,
                color: theme.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {card.name}
            </span>
            <span
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                color: theme.textMuted,
              }}
            >
              v{card.version}
            </span>
          </div>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            {card.provider} | {card.capabilities.length} capabilities | {lastSeenAgo}
          </span>
        </div>

        {/* Protocol badges */}
        <div style={{ display: 'flex', gap: '0.15rem', flexShrink: 0 }}>
          {card.protocols.map((proto) => {
            const color = getProtocolColor(proto, theme);
            return (
              <span
                key={proto}
                style={{
                  fontSize: `calc(0.5rem * ${theme.fontScale})`,
                  fontWeight: 700,
                  color,
                  backgroundColor: `${color}15`,
                  borderRadius: '2px',
                  padding: '0.05rem 0.15rem',
                }}
              >
                {proto}
              </span>
            );
          })}
        </div>

        {/* Expand arrow */}
        <span
          style={{
            color: theme.textMuted,
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            transition: 'transform 0.15s ease',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {'\u25B6'}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          style={{
            padding: '0 0.6rem 0.5rem',
            borderTop: `1px solid ${theme.borderColor}`,
          }}
        >
          {/* Description */}
          <div
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              color: theme.textSecondary,
              padding: '0.4rem 0',
              lineHeight: 1.4,
            }}
          >
            {card.description}
          </div>

          {/* Tags */}
          {card.tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.2rem',
                marginBottom: '0.4rem',
              }}
            >
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: `calc(0.5rem * ${theme.fontScale})`,
                    color: theme.accentColor,
                    backgroundColor: `${theme.accentColor}10`,
                    border: `1px solid ${theme.accentColor}30`,
                    borderRadius: '3px',
                    padding: '0.05rem 0.25rem',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Capabilities list */}
          <div
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.25rem',
            }}
          >
            Capabilities
          </div>
          <div
            role="list"
            aria-label={`Capabilities for ${card.name}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}
          >
            {card.capabilities.map((cap) => {
              const protoColor = getProtocolColor(cap.protocol, theme);
              return (
                <div
                  key={`${cap.protocol}-${cap.name}`}
                  role="listitem"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.3rem',
                    padding: '0.2rem 0.35rem',
                    borderRadius: '3px',
                    backgroundColor: cap.available
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.01)',
                    fontSize: `calc(0.6rem * ${theme.fontScale})`,
                    opacity: cap.available ? 1 : 0.5,
                  }}
                >
                  <span
                    style={{
                      fontSize: `calc(0.5rem * ${theme.fontScale})`,
                      fontWeight: 700,
                      color: protoColor,
                      minWidth: '25px',
                      flexShrink: 0,
                    }}
                  >
                    {cap.protocol}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: theme.textPrimary,
                        fontFamily: theme.monoFontFamily,
                      }}
                    >
                      {cap.name}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        color: theme.textMuted,
                        fontSize: `calc(0.55rem * ${theme.fontScale})`,
                        lineHeight: 1.3,
                      }}
                    >
                      {cap.description}
                    </span>
                    {cap.inputSchema && (
                      <span
                        style={{
                          display: 'block',
                          color: theme.textMuted,
                          fontFamily: theme.monoFontFamily,
                          fontSize: `calc(0.5rem * ${theme.fontScale})`,
                          marginTop: '0.1rem',
                        }}
                      >
                        in: {cap.inputSchema}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: `calc(0.5rem * ${theme.fontScale})`,
                      color: cap.available ? theme.successColor : theme.textMuted,
                      flexShrink: 0,
                    }}
                  >
                    {cap.available ? 'available' : 'unavailable'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Auth methods */}
          {card.authMethods.length > 0 && (
            <div style={{ marginTop: '0.3rem' }}>
              <span
                style={{
                  fontSize: `calc(0.55rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                }}
              >
                Auth: {card.authMethods.join(', ')}
              </span>
            </div>
          )}

          {/* Endpoint */}
          <div style={{ marginTop: '0.2rem' }}>
            <span
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                color: theme.textMuted,
                fontFamily: theme.monoFontFamily,
              }}
            >
              {card.url}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentCardBrowser;
