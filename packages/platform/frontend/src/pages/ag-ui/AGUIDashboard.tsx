/**
 * AGUIDashboard Page
 *
 * Main container for the AG-UI Protocol Dashboard. Composes the AG-UI
 * protocol components into a responsive layout for monitoring and
 * interacting with AI agents via the AG-UI event stream.
 *
 * Layout:
 *   Header:      Title + connection status bar
 *   Left column: Message panel (chat stream with input)
 *   Right column: Tool calls panel + Event log + Agent state viewer
 *
 * Data is managed by the AGUIProvider context which connects to an SSE
 * endpoint for real-time AG-UI protocol events.
 *
 * Budget: 500KB (lazy-loaded)
 *
 * @module ag-ui/AGUIDashboard
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { AGUIProvider } from './AGUIProvider';
import {
  useAgentStream,
  useAgentState,
  useAgentEvents,
  useAgentConnection,
  useAgentToolCalls,
  useAgentRun,
} from './hooks';
import type {
  AGUIMessage,
  AGUIToolCall,
  AGUIEventLogEntry,
  AGUIEventType,
} from './types';
import styles from './AGUIDashboard.module.css';

// =============================================================================
// HELPERS
// =============================================================================

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getEventTypeCategory(type: AGUIEventType): string {
  if (type.startsWith('Run') || type.startsWith('Step')) return 'lifecycle';
  if (type.startsWith('TextMessage')) return 'message';
  if (type.startsWith('ToolCall')) return 'tool';
  if (type.startsWith('State') || type.startsWith('Messages')) return 'state';
  return 'other';
}

function getEventTypeClass(type: AGUIEventType): string {
  const cat = getEventTypeCategory(type);
  switch (cat) {
    case 'lifecycle': return styles.eventLogTypeLifecycle;
    case 'message': return styles.eventLogTypeMessage;
    case 'tool': return styles.eventLogTypeTool;
    case 'state': return styles.eventLogTypeState;
    default: return styles.eventLogTypeOther;
  }
}

function getToolCallStatusClass(status: AGUIToolCall['status']): string {
  switch (status) {
    case 'streaming': return styles.toolCallStatusStreaming;
    case 'pending': return styles.toolCallStatusPending;
    case 'completed': return styles.toolCallStatusCompleted;
    case 'error': return styles.toolCallStatusError;
    default: return '';
  }
}

function getConnectionDotClass(status: string): string {
  switch (status) {
    case 'connected': return styles.statusDotConnected;
    case 'disconnected': return styles.statusDotDisconnected;
    case 'reconnecting': return styles.statusDotReconnecting;
    case 'connecting': return styles.statusDotConnecting;
    case 'error': return styles.statusDotError;
    default: return styles.statusDotDisconnected;
  }
}

function getMessageBubbleClass(role: string): string {
  switch (role) {
    case 'assistant': return styles.messageAssistant;
    case 'user': return styles.messageUser;
    case 'system':
    case 'developer': return styles.messageSystem;
    case 'tool': return styles.messageTool;
    default: return styles.messageAssistant;
  }
}

function getMessageRoleClass(role: string): string {
  switch (role) {
    case 'assistant': return styles.messageRoleAssistant;
    case 'user': return styles.messageRoleUser;
    case 'system':
    case 'developer': return styles.messageRoleSystem;
    case 'tool': return styles.messageRoleTool;
    default: return styles.messageRoleAssistant;
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Connection status bar with connect/disconnect controls.
 */
const ConnectionStatusBar: React.FC = () => {
  const { connectionStatus, isConnected, reconnectAttempts, connect, disconnect } =
    useAgentConnection();
  const { runStatus, currentStep } = useAgentRun();
  const { totalEventsReceived, eventsPerSecond } = useAgentEvents();

  return (
    <div className={styles.statusBar} role="status" aria-live="polite">
      <div className={styles.statusItem}>
        <span
          className={`${styles.statusDot} ${getConnectionDotClass(connectionStatus)}`}
          aria-hidden="true"
        />
        <span className={styles.statusLabel}>SSE:</span>
        <span className={styles.statusValue}>{connectionStatus}</span>
      </div>

      <span className={styles.statusSeparator} aria-hidden="true" />

      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>Run:</span>
        <span className={styles.statusValue}>{runStatus}</span>
      </div>

      {currentStep && (
        <>
          <span className={styles.statusSeparator} aria-hidden="true" />
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Step:</span>
            <span className={styles.statusValue}>{currentStep}</span>
          </div>
        </>
      )}

      <span className={styles.statusSeparator} aria-hidden="true" />

      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>Events:</span>
        <span className={styles.statusValue}>{totalEventsReceived}</span>
      </div>

      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>Rate:</span>
        <span className={styles.statusValue}>{eventsPerSecond}/s</span>
      </div>

      {reconnectAttempts > 0 && (
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Retries:</span>
          <span className={styles.statusValue}>{reconnectAttempts}</span>
        </div>
      )}

      <div style={{ marginLeft: 'auto' }}>
        {isConnected ? (
          <button
            className={styles.disconnectButton}
            onClick={disconnect}
            aria-label="Disconnect from AG-UI endpoint"
          >
            Disconnect
          </button>
        ) : (
          <button
            className={styles.connectButton}
            onClick={() => connect()}
            aria-label="Connect to AG-UI endpoint"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Single message bubble.
 */
const MessageBubble: React.FC<{ message: AGUIMessage }> = ({ message }) => {
  return (
    <div
      className={`${styles.messageBubble} ${getMessageBubbleClass(message.role)}`}
      role="article"
      aria-label={`${message.role} message`}
    >
      <div className={`${styles.messageRole} ${getMessageRoleClass(message.role)}`}>
        {message.role}
      </div>
      <div className={styles.messageContent}>
        {message.content}
        {message.isStreaming && (
          <span className={styles.streamingCursor} aria-label="Streaming" />
        )}
      </div>
      {message.toolCalls.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          {message.toolCalls.map((tc) => (
            <InlineToolCall key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}
      <div className={styles.messageTimestamp}>
        {formatTime(message.updatedAt)}
      </div>
    </div>
  );
};

/**
 * Inline tool call display within a message bubble.
 */
const InlineToolCall: React.FC<{ toolCall: AGUIToolCall }> = ({ toolCall }) => (
  <div style={{ marginTop: '0.25rem' }}>
    <span className={styles.toolCallName}>{toolCall.name}</span>
    <span className={`${styles.toolCallStatus} ${getToolCallStatusClass(toolCall.status)}`} style={{ marginLeft: '0.5rem' }}>
      {toolCall.status}
    </span>
    {toolCall.args && (
      <div className={styles.toolCallArgs}>
        {toolCall.parsedArgs
          ? JSON.stringify(toolCall.parsedArgs, null, 2)
          : toolCall.args}
      </div>
    )}
    {toolCall.result !== null && (
      <div className={styles.toolCallResult}>
        {typeof toolCall.result === 'string'
          ? toolCall.result
          : JSON.stringify(toolCall.result, null, 2)}
      </div>
    )}
  </div>
);

/**
 * Message list with auto-scroll and input bar.
 */
const MessagePanel: React.FC = () => {
  const { messages, isStreaming, sendMessage } = useAgentStream();
  const [inputValue, setInputValue] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <section className={styles.messagePanel} aria-label="Agent messages">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Messages</h2>
        <span className={styles.panelBadge}>{messages.length}</span>
      </div>

      <div className={styles.messageList} ref={listRef} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>No messages yet. Connect to an AG-UI endpoint to begin.</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>

      <div className={styles.inputBar}>
        <input
          ref={inputRef}
          type="text"
          className={styles.inputField}
          placeholder="Send a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Message input"
          disabled={isStreaming}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={isStreaming || !inputValue.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </section>
  );
};

/**
 * Tool calls panel showing active and recent tool calls.
 */
const ToolCallsPanel: React.FC = () => {
  const { activeToolCalls, allToolCalls } = useAgentToolCalls();

  const displayCalls = activeToolCalls.length > 0
    ? activeToolCalls
    : allToolCalls.slice(-5).reverse();

  return (
    <section className={styles.toolCallsPanel} aria-label="Tool calls">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Tool Calls</h2>
        <span className={styles.panelBadge}>
          {activeToolCalls.length > 0
            ? `${activeToolCalls.length} active`
            : `${allToolCalls.length} total`}
        </span>
      </div>

      {displayCalls.length === 0 ? (
        <div className={styles.emptyToolCalls}>
          No tool calls yet.
        </div>
      ) : (
        displayCalls.map((tc) => (
          <div key={tc.id} className={styles.toolCallCard}>
            <div className={styles.toolCallHeader}>
              <span className={styles.toolCallName}>{tc.name}</span>
              <span className={`${styles.toolCallStatus} ${getToolCallStatusClass(tc.status)}`}>
                {tc.status}
              </span>
            </div>
            {tc.args && (
              <div className={styles.toolCallArgs}>
                {tc.parsedArgs
                  ? JSON.stringify(tc.parsedArgs, null, 2)
                  : tc.args.substring(0, 200)}
              </div>
            )}
            {tc.result !== null && (
              <div className={styles.toolCallResult}>
                {typeof tc.result === 'string'
                  ? tc.result.substring(0, 200)
                  : JSON.stringify(tc.result, null, 2).substring(0, 200)}
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
};

/**
 * Event log panel showing protocol events.
 */
const EventLogPanel: React.FC = () => {
  const { eventLog, clearEventLog } = useAgentEvents();

  return (
    <section className={styles.eventLogPanel} aria-label="Event log">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Event Log</h2>
        <button
          className={styles.clearButton}
          onClick={clearEventLog}
          aria-label="Clear event log"
        >
          Clear
        </button>
      </div>

      <div className={styles.eventLogList} role="log" aria-live="off">
        {eventLog.length === 0 ? (
          <div className={styles.emptyState}>No events recorded.</div>
        ) : (
          eventLog.map((entry, i) => (
            <div key={`${entry.timestamp}-${i}`} className={styles.eventLogEntry}>
              <span className={styles.eventLogTime}>
                {formatTime(entry.timestamp)}
              </span>
              <span className={`${styles.eventLogType} ${getEventTypeClass(entry.type)}`}>
                {entry.type}
              </span>
              <span className={styles.eventLogSummary} title={entry.summary}>
                {entry.summary}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

/**
 * Agent state viewer showing the current agent-managed state.
 */
const AgentStatePanel: React.FC = () => {
  const { agentState, hasState } = useAgentState();

  return (
    <section className={styles.agentStatePanel} aria-label="Agent state">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Agent State</h2>
        <span className={styles.panelBadge}>
          {Object.keys(agentState).length} keys
        </span>
      </div>

      {hasState ? (
        <div className={styles.agentStateContent}>
          {JSON.stringify(agentState, null, 2)}
        </div>
      ) : (
        <div className={styles.emptyState}>
          No agent state received yet.
        </div>
      )}
    </section>
  );
};

// =============================================================================
// MAIN DASHBOARD (INNER - uses hooks)
// =============================================================================

const DashboardInner: React.FC = () => {
  return (
    <main className={styles.page}>
      <a
        href="#agui-main-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => {
          e.currentTarget.style.cssText =
            'position:fixed;top:0;left:0;z-index:10000;padding:8px 16px;background:#000;color:#fff;font-size:1rem;';
        }}
        onBlur={(e) => {
          e.currentTarget.style.cssText =
            'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;';
        }}
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 id="agui-main-content" className={styles.title}>
              AG-UI Protocol Dashboard
            </h1>
            <p className={styles.subtitle}>
              Agent-User Interaction Protocol -- real-time event stream monitor
            </p>
          </div>
        </div>

        <Link to="/" className={styles.backLink}>
          &larr; Back to Home
        </Link>

        <ConnectionStatusBar />
      </header>

      {/* Main grid */}
      <div className={styles.grid}>
        {/* Left column: Messages */}
        <MessagePanel />

        {/* Right column: Tool calls + Event log + Agent state */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <ToolCallsPanel />
          <EventLogPanel />
          <AgentStatePanel />
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          AG-UI Protocol Dashboard | Bundle budget: 500KB max
        </p>
        <p>
          Components: MessagePanel, ToolCallsPanel, EventLogPanel, AgentStatePanel
        </p>
        <p>
          Protocol: SSE transport | Events: Lifecycle, Text, ToolCall, State, Custom
        </p>
      </footer>
    </main>
  );
};

// =============================================================================
// MAIN DASHBOARD (OUTER - wraps with provider)
// =============================================================================

const AGUIDashboard: React.FC = () => {
  return (
    <AGUIProvider>
      <DashboardInner />
    </AGUIProvider>
  );
};

export default AGUIDashboard;
