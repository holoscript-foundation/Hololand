/**
 * AG-UI Dashboard UI Components
 *
 * Reusable UI components for displaying AG-UI agent state
 * within VR dashboard panels. These components render agent
 * thinking indicators, suggestions, notifications, and
 * streaming text overlays.
 *
 * Design:
 * - Uses inline styles matching the PostProcessingControls pattern
 * - ARIA-compliant for accessibility
 * - Lightweight rendering for VR frame budget compatibility
 *
 * @module ag-ui/components
 */

import React, { useEffect, useState, useCallback, type CSSProperties } from 'react';
import {
  useVRDashboardAgent,
  useAGUIStreamingText,
  useAGUIThinking,
  useAGUIRun,
} from './hooks';
import type { VRDashboardAgentState } from './types';

// =============================================================================
// STYLES
// =============================================================================

const AGUI_COLORS = {
  accent: '#6366f1',
  accentBg: 'rgba(99, 102, 241, 0.1)',
  accentBorder: 'rgba(99, 102, 241, 0.3)',
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.1)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.1)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  bg: 'rgba(15, 23, 42, 0.95)',
  bgPanel: 'rgba(30, 41, 59, 0.95)',
  border: 'rgba(148, 163, 184, 0.15)',
} as const;

// =============================================================================
// AgentThinkingIndicator
// =============================================================================

/**
 * Animated indicator showing the agent is thinking/processing.
 * Displays the current reasoning text if available.
 */
export const AgentThinkingIndicator: React.FC<{
  style?: CSSProperties;
}> = ({ style }) => {
  const { isThinking, thinkingText } = useAGUIThinking();
  const { agentState } = useVRDashboardAgent();
  const isActive = isThinking || agentState.isThinking;

  if (!isActive) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        backgroundColor: AGUI_COLORS.accentBg,
        border: `1px solid ${AGUI_COLORS.accentBorder}`,
        borderRadius: 6,
        fontSize: 11,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        color: AGUI_COLORS.accent,
        ...style,
      }}
      role="status"
      aria-live="polite"
      aria-label="Agent is thinking"
    >
      {/* Animated dots */}
      <span style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: AGUI_COLORS.accent,
              animation: `agui-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </span>
      <span>{thinkingText ? thinkingText.slice(-80) : 'Agent is thinking...'}</span>
      <style>{`
        @keyframes agui-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

// =============================================================================
// AgentStreamingText
// =============================================================================

/**
 * Displays streaming text from the agent in real-time.
 */
export const AgentStreamingText: React.FC<{
  style?: CSSProperties;
  placeholder?: string;
}> = ({ style, placeholder }) => {
  const streamingText = useAGUIStreamingText();

  if (!streamingText) {
    if (placeholder) {
      return (
        <span style={{ color: AGUI_COLORS.textMuted, fontSize: 11, ...style }}>
          {placeholder}
        </span>
      );
    }
    return null;
  }

  return (
    <div
      style={{
        padding: '8px 12px',
        backgroundColor: AGUI_COLORS.bgPanel,
        border: `1px solid ${AGUI_COLORS.border}`,
        borderRadius: 6,
        fontSize: 11,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        color: AGUI_COLORS.text,
        lineHeight: 1.5,
        maxHeight: 200,
        overflowY: 'auto',
        ...style,
      }}
      role="log"
      aria-live="polite"
      aria-label="Agent response"
    >
      {streamingText}
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 14,
          backgroundColor: AGUI_COLORS.accent,
          marginLeft: 2,
          animation: 'agui-blink 1s step-start infinite',
          verticalAlign: 'text-bottom',
        }}
      />
      <style>{`
        @keyframes agui-blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// =============================================================================
// AgentNotificationBar
// =============================================================================

/**
 * Displays agent notifications as a dismissible bar.
 */
export const AgentNotificationBar: React.FC<{
  style?: CSSProperties;
}> = ({ style }) => {
  const { notifications, dismissNotification } = useVRDashboardAgent();

  if (!notifications || notifications.length === 0) return null;

  const severityColors: Record<string, { bg: string; border: string; text: string }> = {
    info: { bg: AGUI_COLORS.infoBg, border: AGUI_COLORS.info, text: AGUI_COLORS.info },
    warning: { bg: AGUI_COLORS.warningBg, border: AGUI_COLORS.warning, text: AGUI_COLORS.warning },
    error: { bg: AGUI_COLORS.errorBg, border: AGUI_COLORS.error, text: AGUI_COLORS.error },
    success: { bg: AGUI_COLORS.successBg, border: AGUI_COLORS.success, text: AGUI_COLORS.success },
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        ...style,
      }}
      role="alert"
      aria-live="assertive"
    >
      {notifications.map((notification) => {
        const colors = severityColors[notification.severity] ?? severityColors.info;
        return (
          <div
            key={notification.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              backgroundColor: colors.bg,
              borderLeft: `3px solid ${colors.border}`,
              borderRadius: 4,
              fontSize: 10,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              color: colors.text,
            }}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => dismissNotification(notification.id)}
              style={{
                background: 'none',
                border: 'none',
                color: colors.text,
                cursor: 'pointer',
                padding: '0 4px',
                fontSize: 12,
                opacity: 0.7,
                lineHeight: 1,
              }}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
};

// =============================================================================
// AgentSuggestionCards
// =============================================================================

/**
 * Displays agent suggestions as actionable cards.
 */
export const AgentSuggestionCards: React.FC<{
  style?: CSSProperties;
  onAccept?: (suggestionId: string, action?: string) => void;
}> = ({ style, onAccept }) => {
  const { suggestions, acceptSuggestion } = useVRDashboardAgent();

  if (!suggestions || suggestions.length === 0) return null;

  const priorityColors: Record<string, string> = {
    high: AGUI_COLORS.error,
    medium: AGUI_COLORS.warning,
    low: AGUI_COLORS.info,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        ...style,
      }}
      role="region"
      aria-label="Agent suggestions"
    >
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            backgroundColor: AGUI_COLORS.bgPanel,
            border: `1px solid ${AGUI_COLORS.border}`,
            borderRadius: 6,
            fontSize: 10,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          }}
        >
          {/* Priority dot */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: priorityColors[suggestion.priority] ?? AGUI_COLORS.info,
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1, color: AGUI_COLORS.text }}>{suggestion.text}</span>
          {suggestion.action && (
            <button
              onClick={() => {
                onAccept?.(suggestion.id, suggestion.action);
                acceptSuggestion(suggestion.id);
              }}
              style={{
                padding: '3px 8px',
                backgroundColor: AGUI_COLORS.accentBg,
                border: `1px solid ${AGUI_COLORS.accentBorder}`,
                borderRadius: 4,
                color: AGUI_COLORS.accent,
                cursor: 'pointer',
                fontSize: 9,
                fontWeight: 600,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              }}
              aria-label={`Accept suggestion: ${suggestion.text}`}
            >
              Apply
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// AgentChatInput
// =============================================================================

/**
 * Inline chat input for sending messages to the agent.
 */
export const AgentChatInput: React.FC<{
  placeholder?: string;
  style?: CSSProperties;
}> = ({ placeholder = 'Ask the agent...', style }) => {
  const [input, setInput] = useState('');
  const { sendMessage, isActive, isStreaming } = useAGUIRun();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isStreaming) return;
      const text = input.trim();
      setInput('');
      await sendMessage(text);
    },
    [input, isStreaming, sendMessage],
  );

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: 6,
        ...style,
      }}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={isStreaming}
        style={{
          flex: 1,
          padding: '6px 10px',
          backgroundColor: AGUI_COLORS.bgPanel,
          border: `1px solid ${AGUI_COLORS.border}`,
          borderRadius: 4,
          color: AGUI_COLORS.text,
          fontSize: 11,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          outline: 'none',
        }}
        aria-label="Message to agent"
      />
      <button
        type="submit"
        disabled={!input.trim() || isStreaming}
        style={{
          padding: '6px 12px',
          backgroundColor: input.trim() ? AGUI_COLORS.accent : 'rgba(99, 102, 241, 0.3)',
          border: 'none',
          borderRadius: 4,
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          cursor: input.trim() ? 'pointer' : 'default',
          opacity: isStreaming ? 0.5 : 1,
        }}
        aria-label="Send message"
      >
        Send
      </button>
    </form>
  );
};

// =============================================================================
// AgentOverlay - Composite overlay for dashboards
// =============================================================================

/**
 * Composite AG-UI overlay that combines all agent UI components.
 * Drop this into any dashboard to get full agent interaction.
 *
 * Usage:
 * ```tsx
 * <div style={{ position: 'relative' }}>
 *   <MyDashboardContent />
 *   <AgentOverlay position="bottom-right" />
 * </div>
 * ```
 */
export const AgentOverlay: React.FC<{
  /** Position of the overlay */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Whether to show the chat input */
  showChat?: boolean;
  /** Whether to show suggestion cards */
  showSuggestions?: boolean;
  /** Custom style overrides */
  style?: CSSProperties;
}> = ({
  position = 'bottom-right',
  showChat = true,
  showSuggestions = true,
  style,
}) => {
  const { isActive } = useAGUIRun();
  const { notifications, suggestions, isThinking } = useVRDashboardAgent();
  const streamingText = useAGUIStreamingText();

  const hasContent =
    isThinking ||
    !!streamingText ||
    (notifications && notifications.length > 0) ||
    (suggestions && suggestions.length > 0);

  if (!hasContent && !showChat) return null;

  const positionStyles: Record<string, CSSProperties> = {
    'bottom-right': { bottom: 12, right: 12 },
    'bottom-left': { bottom: 12, left: 12 },
    'top-right': { top: 12, right: 12 },
    'top-left': { top: 12, left: 12 },
  };

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 100,
        width: 320,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        ...positionStyles[position],
        ...style,
      }}
      role="complementary"
      aria-label="Agent assistant overlay"
    >
      <AgentNotificationBar />
      <AgentThinkingIndicator />
      {streamingText && <AgentStreamingText />}
      {showSuggestions && <AgentSuggestionCards />}
      {showChat && <AgentChatInput />}
    </div>
  );
};
