/**
 * AG-UI Custom React Hooks
 *
 * Provides focused, composable hooks for consuming AG-UI protocol state
 * from the AGUIProvider context. Each hook extracts a specific slice of
 * the AG-UI state, enabling fine-grained subscriptions and minimal
 * re-renders for components that only need a subset of the full state.
 *
 * Hooks:
 *   - useAgentStream: Messages + streaming state for chat UIs
 *   - useAgentState: Agent-managed state (StateSnapshot/StateDelta)
 *   - useAgentEvents: Event log for debugging/monitoring
 *   - useAgentConnection: Connection status + reconnection info
 *   - useAgentToolCalls: Active tool calls + results
 *   - useAgentRun: Run lifecycle status
 *   - useAgentActions: All available actions (connect, send, etc.)
 *
 * All hooks must be used within an <AGUIProvider>.
 *
 * @module ag-ui/hooks
 */

import { useMemo, useCallback } from 'react';
import { useAGUIContext } from './AGUIProvider';
import type {
  AGUIState,
  AGUIActions,
  AGUIMessage,
  AGUIToolCall,
  AGUIEventLogEntry,
  AGUIConnectionStatus,
  AGUIRunStatus,
  AGUIClientConfig,
  RunAgentInput,
} from './types';

// =============================================================================
// useAgentStream
// =============================================================================

/**
 * Return type for useAgentStream.
 */
export interface AgentStreamState {
  /** All messages in the current thread */
  messages: AGUIMessage[];
  /** Whether any message is currently streaming */
  isStreaming: boolean;
  /** The currently streaming message (if any) */
  streamingMessage: AGUIMessage | null;
  /** Current run status */
  runStatus: AGUIRunStatus;
  /** Current step name (if agent reports steps) */
  currentStep: string | null;
  /** Send a user message */
  sendMessage: (content: string) => void;
  /** Reset all messages */
  reset: () => void;
}

/**
 * Hook for chat/streaming UIs that need messages and streaming state.
 *
 * Usage:
 * ```tsx
 * function ChatPanel() {
 *   const { messages, isStreaming, sendMessage } = useAgentStream();
 *
 *   return (
 *     <div>
 *       {messages.map(msg => (
 *         <MessageBubble key={msg.id} message={msg} />
 *       ))}
 *       {isStreaming && <StreamingIndicator />}
 *       <MessageInput onSend={sendMessage} disabled={isStreaming} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentStream(): AgentStreamState {
  const { state, actions } = useAGUIContext();

  const isStreaming = useMemo(
    () => state.messages.some((msg) => msg.isStreaming),
    [state.messages],
  );

  const streamingMessage = useMemo(
    () => state.messages.find((msg) => msg.isStreaming) ?? null,
    [state.messages],
  );

  return useMemo(
    () => ({
      messages: state.messages,
      isStreaming,
      streamingMessage,
      runStatus: state.runStatus,
      currentStep: state.currentStep,
      sendMessage: actions.sendMessage,
      reset: actions.reset,
    }),
    [
      state.messages,
      isStreaming,
      streamingMessage,
      state.runStatus,
      state.currentStep,
      actions.sendMessage,
      actions.reset,
    ],
  );
}

// =============================================================================
// useAgentState
// =============================================================================

/**
 * Return type for useAgentState.
 */
export interface AgentStateResult {
  /** Full agent-managed state */
  agentState: Record<string, unknown>;
  /** Get a specific value from agent state by dot-path */
  get: <T = unknown>(path: string, defaultValue?: T) => T;
  /** Whether any state has been received */
  hasState: boolean;
}

/**
 * Hook for accessing agent-managed state (StateSnapshot/StateDelta).
 *
 * The agent can publish arbitrary state via StateSnapshot and StateDelta
 * events. This hook provides access to the accumulated state object with
 * a convenient path-based getter.
 *
 * Usage:
 * ```tsx
 * function AgentInfo() {
 *   const { agentState, get } = useAgentState();
 *
 *   const confidence = get<number>('model.confidence', 0);
 *   const currentTask = get<string>('task.name', 'None');
 *
 *   return (
 *     <div>
 *       <p>Confidence: {confidence}</p>
 *       <p>Task: {currentTask}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentState(): AgentStateResult {
  const { state } = useAGUIContext();

  const get = useCallback(
    <T = unknown>(path: string, defaultValue?: T): T => {
      const parts = path.split('.');
      let current: unknown = state.agentState;

      for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object') {
          return (defaultValue ?? undefined) as T;
        }
        current = (current as Record<string, unknown>)[part];
      }

      return (current ?? defaultValue ?? undefined) as T;
    },
    [state.agentState],
  );

  const hasState = useMemo(
    () => Object.keys(state.agentState).length > 0,
    [state.agentState],
  );

  return useMemo(
    () => ({
      agentState: state.agentState,
      get,
      hasState,
    }),
    [state.agentState, get, hasState],
  );
}

// =============================================================================
// useAgentEvents
// =============================================================================

/**
 * Return type for useAgentEvents.
 */
export interface AgentEventsResult {
  /** Event log entries (most recent first) */
  eventLog: AGUIEventLogEntry[];
  /** Total events received in this session */
  totalEventsReceived: number;
  /** Events per second (rolling average) */
  eventsPerSecond: number;
  /** Clear the event log */
  clearEventLog: () => void;
}

/**
 * Hook for the debug/monitoring event log.
 *
 * Provides the raw event stream for debugging and protocol monitoring.
 * Events are stored in reverse chronological order (newest first).
 *
 * Usage:
 * ```tsx
 * function EventMonitor() {
 *   const { eventLog, totalEventsReceived, eventsPerSecond, clearEventLog } = useAgentEvents();
 *
 *   return (
 *     <div>
 *       <p>Total: {totalEventsReceived} | Rate: {eventsPerSecond}/s</p>
 *       <button onClick={clearEventLog}>Clear</button>
 *       {eventLog.map((entry, i) => (
 *         <div key={i}>{entry.type}: {entry.summary}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentEvents(): AgentEventsResult {
  const { state, actions } = useAGUIContext();

  return useMemo(
    () => ({
      eventLog: state.eventLog,
      totalEventsReceived: state.totalEventsReceived,
      eventsPerSecond: state.eventsPerSecond,
      clearEventLog: actions.clearEventLog,
    }),
    [
      state.eventLog,
      state.totalEventsReceived,
      state.eventsPerSecond,
      actions.clearEventLog,
    ],
  );
}

// =============================================================================
// useAgentConnection
// =============================================================================

/**
 * Return type for useAgentConnection.
 */
export interface AgentConnectionResult {
  /** Current connection status */
  connectionStatus: AGUIConnectionStatus;
  /** Whether the client is connected */
  isConnected: boolean;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Connect to the SSE endpoint */
  connect: (config?: Partial<AGUIClientConfig>) => void;
  /** Disconnect from the SSE endpoint */
  disconnect: () => void;
}

/**
 * Hook for connection management.
 *
 * Provides connection status and control methods.
 *
 * Usage:
 * ```tsx
 * function ConnectionBar() {
 *   const { connectionStatus, isConnected, connect, disconnect } = useAgentConnection();
 *
 *   return (
 *     <div>
 *       <span>{connectionStatus}</span>
 *       {isConnected
 *         ? <button onClick={disconnect}>Disconnect</button>
 *         : <button onClick={() => connect()}>Connect</button>
 *       }
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentConnection(): AgentConnectionResult {
  const { state, actions } = useAGUIContext();

  const isConnected = state.connectionStatus === 'connected';

  return useMemo(
    () => ({
      connectionStatus: state.connectionStatus,
      isConnected,
      reconnectAttempts: state.reconnectAttempts,
      connect: actions.connect,
      disconnect: actions.disconnect,
    }),
    [
      state.connectionStatus,
      isConnected,
      state.reconnectAttempts,
      actions.connect,
      actions.disconnect,
    ],
  );
}

// =============================================================================
// useAgentToolCalls
// =============================================================================

/**
 * Return type for useAgentToolCalls.
 */
export interface AgentToolCallsResult {
  /** Currently active tool calls (streaming or pending) */
  activeToolCalls: AGUIToolCall[];
  /** Whether any tool calls are active */
  hasActiveToolCalls: boolean;
  /** All tool calls from all messages (for history view) */
  allToolCalls: AGUIToolCall[];
  /** Send a tool result back to the agent */
  sendToolResult: (toolCallId: string, result: unknown) => void;
}

/**
 * Hook for tool call monitoring and interaction.
 *
 * Provides active tool calls and the ability to send results back
 * to the agent for human-in-the-loop workflows.
 *
 * Usage:
 * ```tsx
 * function ToolCallPanel() {
 *   const { activeToolCalls, sendToolResult } = useAgentToolCalls();
 *
 *   return (
 *     <div>
 *       {activeToolCalls.map(tc => (
 *         <ToolCallCard
 *           key={tc.id}
 *           toolCall={tc}
 *           onApprove={(result) => sendToolResult(tc.id, result)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentToolCalls(): AgentToolCallsResult {
  const { state, actions } = useAGUIContext();

  const allToolCalls = useMemo(
    () => state.messages.flatMap((msg) => msg.toolCalls),
    [state.messages],
  );

  const hasActiveToolCalls = state.activeToolCalls.length > 0;

  return useMemo(
    () => ({
      activeToolCalls: state.activeToolCalls,
      hasActiveToolCalls,
      allToolCalls,
      sendToolResult: actions.sendToolResult,
    }),
    [
      state.activeToolCalls,
      hasActiveToolCalls,
      allToolCalls,
      actions.sendToolResult,
    ],
  );
}

// =============================================================================
// useAgentRun
// =============================================================================

/**
 * Return type for useAgentRun.
 */
export interface AgentRunResult {
  /** Current run status */
  runStatus: AGUIRunStatus;
  /** Current run ID */
  currentRunId: string | null;
  /** Current thread ID */
  currentThreadId: string | null;
  /** Current step name */
  currentStep: string | null;
  /** Error message if run errored */
  error: string | null;
  /** Whether a run is active */
  isRunning: boolean;
  /** Start a new agent run */
  startRun: (input: RunAgentInput) => void;
}

/**
 * Hook for run lifecycle management.
 *
 * Usage:
 * ```tsx
 * function RunControl() {
 *   const { runStatus, currentStep, isRunning, startRun, error } = useAgentRun();
 *
 *   return (
 *     <div>
 *       <p>Status: {runStatus}</p>
 *       {currentStep && <p>Step: {currentStep}</p>}
 *       {error && <p>Error: {error}</p>}
 *       <button
 *         onClick={() => startRun({ threadId: 'thread-1' })}
 *         disabled={isRunning}
 *       >
 *         Start Run
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentRun(): AgentRunResult {
  const { state, actions } = useAGUIContext();

  const isRunning = state.runStatus === 'running';

  return useMemo(
    () => ({
      runStatus: state.runStatus,
      currentRunId: state.currentRunId,
      currentThreadId: state.currentThreadId,
      currentStep: state.currentStep,
      error: state.error,
      isRunning,
      startRun: actions.startRun,
    }),
    [
      state.runStatus,
      state.currentRunId,
      state.currentThreadId,
      state.currentStep,
      state.error,
      isRunning,
      actions.startRun,
    ],
  );
}

// =============================================================================
// useAgentActions
// =============================================================================

/**
 * Hook that returns all available AG-UI actions.
 *
 * Use this when a component needs access to multiple action types.
 * For focused usage, prefer the specific hooks above.
 */
export function useAgentActions(): AGUIActions {
  const { actions } = useAGUIContext();
  return actions;
}
