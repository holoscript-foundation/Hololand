/**
 * ProtocolExplorer Component
 *
 * Top-level developer tool for exploring MCP/A2A/ACP/ANP protocol
 * messages through a unified normalization gateway view.
 *
 * Architecture:
 * ```
 *   <ProtocolExplorer>
 *       |
 *       |-- useProtocolExplorer() hook (or external state)
 *       |
 *       |-- Header (capture toggle, stats, mode)
 *       |-- <MessageStream />
 *       |-- <AgentCardBrowser />
 *       |-- <TranslationVisualization />
 *       |-- StatsPanel
 *       |-- MessageDetailPanel
 * ```
 *
 * @module protocol-explorer/ProtocolExplorer
 */

import React, { useMemo } from 'react';
import {
  useProtocolExplorer,
  type UseProtocolExplorerConfig,
} from './useProtocolExplorer';
import { MessageStream } from './MessageStream';
import { AgentCardBrowser } from './AgentCardBrowser';
import { TranslationVisualization } from './TranslationVisualization';
import type {
  ProtocolExplorerTheme,
  ProtocolExplorerDisplayMode,
  ProtocolExplorerPanel,
  ProtocolExplorerState,
  ProtocolExplorerActions,
  ProtocolType,
  ProtocolMessage,
} from './types';
import {
  DEFAULT_PE_THEME,
  PROTOCOL_CONFIG,
  getProtocolColor,
  formatBytes,
  formatLatency,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface ProtocolExplorerProps {
  /** Display mode (default: 'full') */
  mode?: ProtocolExplorerDisplayMode;
  /** Which panels to show (default: all) */
  panels?: ProtocolExplorerPanel[];
  /** Hook configuration */
  config?: UseProtocolExplorerConfig;
  /** Externally managed state */
  externalState?: ProtocolExplorerState;
  /** Externally managed actions */
  externalActions?: ProtocolExplorerActions;
  /** Theme overrides */
  theme?: Partial<ProtocolExplorerTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
}

const ALL_PANELS: ProtocolExplorerPanel[] = [
  'message-stream', 'agent-cards', 'translations', 'stats', 'detail',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ProtocolExplorer: React.FC<ProtocolExplorerProps> = ({
  mode = 'full',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'Protocol Explorer',
}) => {
  const [internalState, internalActions] = useProtocolExplorer(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo(
    () => ({ ...DEFAULT_PE_THEME, ...themeOverride }),
    [themeOverride],
  );

  const containerStyles = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontFamily: theme.fontFamily,
      fontSize: `calc(0.85rem * ${theme.fontScale})`,
      color: theme.textPrimary,
      backgroundColor: theme.containerBackground,
      borderRadius: theme.borderRadius,
      border: `1px solid ${theme.borderColor}`,
      overflow: 'hidden',
    };

    switch (mode) {
      case 'compact':
        return {
          ...base,
          display: 'flex',
          flexDirection: 'column',
        };
      case 'agent-cards':
      case 'translations':
        return {
          ...base,
          display: 'flex',
          flexDirection: 'column',
        };
      case 'full':
      default:
        return {
          ...base,
          display: 'flex',
          flexDirection: 'column',
        };
    }
  }, [mode, theme]);

  // Agent Cards only mode
  if (mode === 'agent-cards') {
    return (
      <div className={className} style={{ ...containerStyles, ...style }} role="region" aria-label={ariaLabel}>
        <ExplorerHeader state={state} actions={actions} theme={theme} />
        <AgentCardBrowser agentCards={state.agentCards} theme={theme} />
      </div>
    );
  }

  // Translations only mode
  if (mode === 'translations') {
    return (
      <div className={className} style={{ ...containerStyles, ...style }} role="region" aria-label={ariaLabel}>
        <ExplorerHeader state={state} actions={actions} theme={theme} />
        <TranslationVisualization translations={state.translations} theme={theme} />
      </div>
    );
  }

  // Selected message for detail panel
  const selectedMessage = state.selectedMessageId
    ? state.messages.find((m) => m.id === state.selectedMessageId) ?? null
    : null;

  // Full and compact modes
  return (
    <div
      className={className}
      style={{ ...containerStyles, ...style }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <ExplorerHeader state={state} actions={actions} theme={theme} />

      {/* Stats panel */}
      {panels.includes('stats') && (
        <StatsPanel state={state} theme={theme} />
      )}

      {/* Message stream */}
      {panels.includes('message-stream') && (
        <MessageStream
          messages={state.messages}
          filter={state.filter}
          selectedMessageId={state.selectedMessageId}
          actions={actions}
          theme={theme}
        />
      )}

      {/* Message detail */}
      {panels.includes('detail') && selectedMessage && (
        <MessageDetailPanel
          message={selectedMessage}
          onClose={() => actions.selectMessage(null)}
          theme={theme}
        />
      )}

      {/* Agent Card browser */}
      {panels.includes('agent-cards') && mode !== 'compact' && (
        <AgentCardBrowser agentCards={state.agentCards} theme={theme} />
      )}

      {/* Translation visualization */}
      {panels.includes('translations') && mode !== 'compact' && (
        <TranslationVisualization translations={state.translations} theme={theme} />
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SubProps {
  state: ProtocolExplorerState;
  actions: ProtocolExplorerActions;
  theme: ProtocolExplorerTheme;
}

// -- Explorer Header --

const ExplorerHeader: React.FC<SubProps> = ({ state, actions, theme }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        backgroundColor: theme.cardBackground,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Capture indicator */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: state.isCapturing ? theme.successColor : theme.textMuted,
            display: 'inline-block',
            boxShadow: state.isCapturing ? `0 0 6px ${theme.successColor}` : 'none',
          }}
          aria-hidden="true"
        />
        <span style={{ fontWeight: 600, fontSize: `calc(0.9rem * ${theme.fontScale})` }}>
          Protocol Explorer
        </span>
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          {state.stats.totalMessages} msgs
        </span>
        {state.stats.messagesPerSecond > 0 && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.accentColor,
            }}
          >
            ({state.stats.messagesPerSecond}/s)
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        {/* Protocol count badges */}
        {(['MCP', 'A2A', 'ACP', 'ANP'] as ProtocolType[]).map((proto) => {
          const count = state.stats.perProtocol[proto];
          if (count === 0) return null;
          const color = getProtocolColor(proto, theme);
          return (
            <span
              key={proto}
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                fontWeight: 600,
                color,
                border: `1px solid ${color}40`,
                borderRadius: '3px',
                padding: '0.05rem 0.25rem',
              }}
            >
              {proto}:{count}
            </span>
          );
        })}

        {/* Clear button */}
        <button
          type="button"
          onClick={() => actions.clearMessages()}
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            fontFamily: theme.fontFamily,
            color: theme.textMuted,
            backgroundColor: 'transparent',
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '4px',
            padding: '0.1rem 0.35rem',
            cursor: 'pointer',
          }}
          aria-label="Clear all captured messages"
        >
          Clear
        </button>

        {/* Capture toggle */}
        <button
          type="button"
          onClick={() => actions.toggleCapture()}
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 500,
            fontFamily: theme.fontFamily,
            color: state.isCapturing ? theme.successColor : theme.errorColor,
            backgroundColor: 'transparent',
            border: `1px solid ${state.isCapturing ? theme.successColor : theme.errorColor}`,
            borderRadius: '4px',
            padding: '0.15rem 0.5rem',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          aria-label={state.isCapturing ? 'Pause message capture' : 'Resume message capture'}
          onMouseEnter={(e) => {
            const c = state.isCapturing ? theme.successColor : theme.errorColor;
            (e.target as HTMLButtonElement).style.backgroundColor = `${c}20`;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          {state.isCapturing ? 'Capturing' : 'Paused'}
        </button>
      </div>
    </div>
  );
};

// -- Stats Panel --

interface StatsPanelProps {
  state: ProtocolExplorerState;
  theme: ProtocolExplorerTheme;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ state, theme }) => {
  const s = state.stats;

  return (
    <div
      style={{
        padding: '0.5rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.5rem',
        }}
        role="status"
        aria-label="Protocol statistics"
      >
        <MetricCell
          label="Total Messages"
          value={s.totalMessages.toString()}
          theme={theme}
        />
        <MetricCell
          label="Translations"
          value={s.totalTranslations.toString()}
          theme={theme}
        />
        <MetricCell
          label="Translation Rate"
          value={`${(s.translationSuccessRate * 100).toFixed(0)}%`}
          valueColor={s.translationSuccessRate >= 0.95 ? theme.successColor : theme.errorColor}
          theme={theme}
        />
        <MetricCell
          label="Data Volume"
          value={formatBytes(s.totalBytes)}
          theme={theme}
        />
        <MetricCell
          label="Msg/s"
          value={s.messagesPerSecond.toString()}
          valueColor={theme.accentColor}
          theme={theme}
        />
      </div>
    </div>
  );
};

// -- Message Detail Panel --

interface MessageDetailPanelProps {
  message: ProtocolMessage;
  onClose: () => void;
  theme: ProtocolExplorerTheme;
}

const MessageDetailPanel: React.FC<MessageDetailPanelProps> = ({
  message,
  onClose,
  theme,
}) => {
  const protocolColor = getProtocolColor(message.protocol, theme);
  const payloadJson = useMemo(
    () => JSON.stringify(message.payload, null, 2),
    [message.payload],
  );

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        backgroundColor: theme.cardBackground,
      }}
      role="region"
      aria-label={`Message detail: ${message.summary}`}
    >
      {/* Detail header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 700,
              color: protocolColor,
              backgroundColor: `${protocolColor}15`,
              borderRadius: '3px',
              padding: '0.05rem 0.2rem',
            }}
          >
            {message.protocol}
          </span>
          <span
            style={{
              fontSize: `calc(0.75rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textPrimary,
            }}
          >
            {message.summary}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontFamily: theme.fontFamily,
            color: theme.textMuted,
            backgroundColor: 'transparent',
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '3px',
            padding: '0.1rem 0.3rem',
            cursor: 'pointer',
          }}
          aria-label="Close message detail"
        >
          Close
        </button>
      </div>

      {/* Metadata */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.4rem',
          marginBottom: '0.5rem',
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
        }}
      >
        <div>
          <span style={{ color: theme.textMuted }}>Direction: </span>
          <span style={{ color: theme.textSecondary }}>{message.direction}</span>
        </div>
        <div>
          <span style={{ color: theme.textMuted }}>Category: </span>
          <span style={{ color: theme.textSecondary }}>{message.category}</span>
        </div>
        <div>
          <span style={{ color: theme.textMuted }}>Size: </span>
          <span style={{ color: theme.textSecondary }}>{formatBytes(message.sizeBytes)}</span>
        </div>
        <div>
          <span style={{ color: theme.textMuted }}>From: </span>
          <span style={{ color: theme.textSecondary }}>{message.sourceName} ({message.sourceId})</span>
        </div>
        <div>
          <span style={{ color: theme.textMuted }}>To: </span>
          <span style={{ color: theme.textSecondary }}>{message.destinationName} ({message.destinationId})</span>
        </div>
        <div>
          <span style={{ color: theme.textMuted }}>Latency: </span>
          <span style={{ color: theme.textSecondary }}>{formatLatency(message.latencyMs)}</span>
        </div>
        {message.isTranslated && (
          <div>
            <span style={{ color: theme.textMuted }}>Translated from: </span>
            <span style={{ color: theme.accentColor }}>{message.originalProtocol}</span>
          </div>
        )}
        {message.correlationId && (
          <div>
            <span style={{ color: theme.textMuted }}>Correlation: </span>
            <span style={{ color: theme.textSecondary, fontFamily: theme.monoFontFamily }}>
              {message.correlationId}
            </span>
          </div>
        )}
      </div>

      {/* Payload */}
      <div>
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Payload
        </span>
        <pre
          style={{
            marginTop: '0.25rem',
            padding: '0.5rem',
            borderRadius: '4px',
            backgroundColor: theme.containerBackground,
            border: `1px solid ${theme.borderColor}`,
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            fontFamily: theme.monoFontFamily,
            color: theme.textSecondary,
            overflow: 'auto',
            maxHeight: '200px',
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {payloadJson}
        </pre>
      </div>
    </div>
  );
};

// -- Shared MetricCell --

interface MetricCellProps {
  label: string;
  value: string;
  valueColor?: string;
  theme: ProtocolExplorerTheme;
}

const MetricCell: React.FC<MetricCellProps> = ({ label, value, valueColor, theme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
    <span
      style={{
        fontSize: `calc(0.55rem * ${theme.fontScale})`,
        color: theme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: `calc(0.8rem * ${theme.fontScale})`,
        fontWeight: 600,
        color: valueColor ?? theme.textPrimary,
      }}
    >
      {value}
    </span>
  </div>
);

export default ProtocolExplorer;
