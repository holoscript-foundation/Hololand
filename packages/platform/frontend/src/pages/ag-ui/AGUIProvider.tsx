/**
 * AGUIProvider - React Context Provider for the AG-UI Protocol
 *
 * Provides centralized AG-UI state management via React context.
 * Wraps the AGUIClient SSE connection and dispatches protocol events
 * into structured React state that child components consume through
 * custom hooks (useAgentStream, useAgentState, useAgentEvents, etc.).
 *
 * Architecture:
 *   The provider creates an AGUIClient internally and subscribes to all
 *   events via the wildcard listener. Each event is processed through a
 *   reducer that updates the consolidated AGUIState. State changes are
 *   batched using React's automatic batching (React 18+) to minimize
 *   re-renders when many events arrive in quick succession.
 *
 * VR Safety:
 *   State updates from the SSE stream do NOT run on the render loop.
 *   The EventSource runs on the browser's network thread, and React's
 *   batched state updates are reconciled during React's commit phase,
 *   which is separate from the rAF-driven VR render loop.
 *
 * Usage:
 * ```tsx
 * import { AGUIProvider } from './AGUIProvider';
 * import { useAgentStream, useAgentState } from './hooks';
 *
 * function App() {
 *   return (
 *     <AGUIProvider url="http://localhost:5567/ag-ui/events">
 *       <Dashboard />
 *     </AGUIProvider>
 *   );
 * }
 *
 * function Dashboard() {
 *   const { messages, runStatus } = useAgentStream();
 *   const agentState = useAgentState();
 *   // ...
 * }
 * ```
 *
 * @module ag-ui/AGUIProvider
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';

import { AGUIClient } from './AGUIClient';
import type {
  AGUIState,
  AGUIActions,
  AGUIEvent,
  AGUIClientConfig,
  AGUIConnectionStatus,
  AGUIMessage,
  AGUIToolCall,
  AGUIEventLogEntry,
  RunAgentInput,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  StateSnapshotEvent,
  StateDeltaEvent,
  MessagesSnapshotEvent,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  StepStartedEvent,
  StepFinishedEvent,
  JSONPatchOperation,
} from './types';
import {
  generateId,
  summarizeEvent,
  MAX_EVENT_LOG_SIZE,
  MAX_DISPLAY_MESSAGES,
  DEFAULT_CLIENT_CONFIG,
} from './types';

// =============================================================================
// CONTEXT
// =============================================================================

interface AGUIContextValue {
  state: AGUIState;
  actions: AGUIActions;
}

const AGUIContext = createContext<AGUIContextValue | null>(null);

/**
 * Access the AG-UI context. Must be used within an AGUIProvider.
 */
export function useAGUIContext(): AGUIContextValue {
  const ctx = useContext(AGUIContext);
  if (!ctx) {
    throw new Error('useAGUIContext must be used within an <AGUIProvider>');
  }
  return ctx;
}

// =============================================================================
// STATE REDUCER
// =============================================================================

function createInitialState(): AGUIState {
  return {
    connectionStatus: 'disconnected',
    runStatus: 'idle',
    currentRunId: null,
    currentThreadId: null,
    messages: [],
    activeToolCalls: [],
    agentState: {},
    currentStep: null,
    error: null,
    totalEventsReceived: 0,
    eventsPerSecond: 0,
    reconnectAttempts: 0,
    eventLog: [],
  };
}

type Action =
  | { type: 'SET_CONNECTION_STATUS'; status: AGUIConnectionStatus }
  | { type: 'SET_RECONNECT_ATTEMPTS'; attempts: number }
  | { type: 'SET_EVENTS_PER_SECOND'; eps: number }
  | { type: 'PROCESS_EVENT'; event: AGUIEvent }
  | { type: 'RESET' }
  | { type: 'CLEAR_EVENT_LOG' };

function reducer(state: AGUIState, action: Action): AGUIState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.status };

    case 'SET_RECONNECT_ATTEMPTS':
      return { ...state, reconnectAttempts: action.attempts };

    case 'SET_EVENTS_PER_SECOND':
      return { ...state, eventsPerSecond: action.eps };

    case 'PROCESS_EVENT':
      return processEvent(state, action.event);

    case 'RESET':
      return {
        ...createInitialState(),
        connectionStatus: state.connectionStatus,
        reconnectAttempts: state.reconnectAttempts,
      };

    case 'CLEAR_EVENT_LOG':
      return { ...state, eventLog: [] };

    default:
      return state;
  }
}

// =============================================================================
// EVENT PROCESSING
// =============================================================================

function processEvent(state: AGUIState, event: AGUIEvent): AGUIState {
  // Create event log entry
  const logEntry: AGUIEventLogEntry = {
    type: event.type,
    timestamp: Date.now(),
    summary: summarizeEvent(event),
    raw: event,
  };

  const eventLog = [logEntry, ...state.eventLog].slice(0, MAX_EVENT_LOG_SIZE);
  const totalEventsReceived = state.totalEventsReceived + 1;

  // Base state with updated log and counter
  let next: AGUIState = { ...state, eventLog, totalEventsReceived };

  switch (event.type) {
    case 'RunStarted':
      next = handleRunStarted(next, event as RunStartedEvent);
      break;
    case 'RunFinished':
      next = handleRunFinished(next, event as RunFinishedEvent);
      break;
    case 'RunError':
      next = handleRunError(next, event as RunErrorEvent);
      break;
    case 'StepStarted':
      next = handleStepStarted(next, event as StepStartedEvent);
      break;
    case 'StepFinished':
      next = handleStepFinished(next, event as StepFinishedEvent);
      break;
    case 'TextMessageStart':
      next = handleTextMessageStart(next, event as TextMessageStartEvent);
      break;
    case 'TextMessageContent':
      next = handleTextMessageContent(next, event as TextMessageContentEvent);
      break;
    case 'TextMessageEnd':
      next = handleTextMessageEnd(next, event as TextMessageEndEvent);
      break;
    case 'ToolCallStart':
      next = handleToolCallStart(next, event as ToolCallStartEvent);
      break;
    case 'ToolCallArgs':
      next = handleToolCallArgs(next, event as ToolCallArgsEvent);
      break;
    case 'ToolCallEnd':
      next = handleToolCallEnd(next, event as ToolCallEndEvent);
      break;
    case 'ToolCallResult':
      next = handleToolCallResult(next, event as ToolCallResultEvent);
      break;
    case 'StateSnapshot':
      next = handleStateSnapshot(next, event as StateSnapshotEvent);
      break;
    case 'StateDelta':
      next = handleStateDelta(next, event as StateDeltaEvent);
      break;
    case 'MessagesSnapshot':
      next = handleMessagesSnapshot(next, event as MessagesSnapshotEvent);
      break;
  }

  return next;
}

// -- Lifecycle handlers -------------------------------------------------------

function handleRunStarted(state: AGUIState, event: RunStartedEvent): AGUIState {
  return {
    ...state,
    runStatus: 'running',
    currentRunId: event.runId,
    currentThreadId: event.threadId,
    error: null,
  };
}

function handleRunFinished(state: AGUIState, _event: RunFinishedEvent): AGUIState {
  return {
    ...state,
    runStatus: 'completed',
    currentStep: null,
  };
}

function handleRunError(state: AGUIState, event: RunErrorEvent): AGUIState {
  return {
    ...state,
    runStatus: 'error',
    error: event.message,
    currentStep: null,
  };
}

function handleStepStarted(state: AGUIState, event: StepStartedEvent): AGUIState {
  return {
    ...state,
    currentStep: event.stepName,
  };
}

function handleStepFinished(state: AGUIState, _event: StepFinishedEvent): AGUIState {
  return {
    ...state,
    currentStep: null,
  };
}

// -- Text message handlers ----------------------------------------------------

function handleTextMessageStart(state: AGUIState, event: TextMessageStartEvent): AGUIState {
  const newMessage: AGUIMessage = {
    id: event.messageId,
    role: event.role,
    content: '',
    isStreaming: true,
    toolCalls: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const messages = [...state.messages, newMessage].slice(-MAX_DISPLAY_MESSAGES);
  return { ...state, messages };
}

function handleTextMessageContent(state: AGUIState, event: TextMessageContentEvent): AGUIState {
  const messages = state.messages.map((msg) => {
    if (msg.id === event.messageId) {
      return {
        ...msg,
        content: msg.content + event.delta,
        updatedAt: Date.now(),
      };
    }
    return msg;
  });

  return { ...state, messages };
}

function handleTextMessageEnd(state: AGUIState, event: TextMessageEndEvent): AGUIState {
  const messages = state.messages.map((msg) => {
    if (msg.id === event.messageId) {
      return {
        ...msg,
        isStreaming: false,
        updatedAt: Date.now(),
      };
    }
    return msg;
  });

  return { ...state, messages };
}

// -- Tool call handlers -------------------------------------------------------

function handleToolCallStart(state: AGUIState, event: ToolCallStartEvent): AGUIState {
  const newToolCall: AGUIToolCall = {
    id: event.toolCallId,
    name: event.toolCallName,
    args: '',
    parsedArgs: null,
    result: null,
    status: 'streaming',
  };

  // Add tool call to the parent message if parentMessageId is specified
  let messages = state.messages;
  if (event.parentMessageId) {
    messages = messages.map((msg) => {
      if (msg.id === event.parentMessageId) {
        return {
          ...msg,
          toolCalls: [...msg.toolCalls, newToolCall],
          updatedAt: Date.now(),
        };
      }
      return msg;
    });
  }

  return {
    ...state,
    messages,
    activeToolCalls: [...state.activeToolCalls, newToolCall],
  };
}

function handleToolCallArgs(state: AGUIState, event: ToolCallArgsEvent): AGUIState {
  const activeToolCalls = state.activeToolCalls.map((tc) => {
    if (tc.id === event.toolCallId) {
      return { ...tc, args: tc.args + event.delta };
    }
    return tc;
  });

  // Also update in messages
  const messages = state.messages.map((msg) => ({
    ...msg,
    toolCalls: msg.toolCalls.map((tc) => {
      if (tc.id === event.toolCallId) {
        return { ...tc, args: tc.args + event.delta };
      }
      return tc;
    }),
  }));

  return { ...state, activeToolCalls, messages };
}

function handleToolCallEnd(state: AGUIState, event: ToolCallEndEvent): AGUIState {
  const activeToolCalls = state.activeToolCalls.map((tc) => {
    if (tc.id === event.toolCallId) {
      let parsedArgs: Record<string, unknown> | null = null;
      try {
        parsedArgs = JSON.parse(tc.args);
      } catch {
        // Args may not be valid JSON; leave as null
      }
      return { ...tc, status: 'pending' as const, parsedArgs };
    }
    return tc;
  });

  const messages = state.messages.map((msg) => ({
    ...msg,
    toolCalls: msg.toolCalls.map((tc) => {
      if (tc.id === event.toolCallId) {
        let parsedArgs: Record<string, unknown> | null = null;
        try {
          parsedArgs = JSON.parse(tc.args);
        } catch {
          // noop
        }
        return { ...tc, status: 'pending' as const, parsedArgs };
      }
      return tc;
    }),
  }));

  return { ...state, activeToolCalls, messages };
}

function handleToolCallResult(state: AGUIState, event: ToolCallResultEvent): AGUIState {
  // Remove from active, mark as completed in messages
  const activeToolCalls = state.activeToolCalls.filter(
    (tc) => tc.id !== event.toolCallId,
  );

  const messages = state.messages.map((msg) => ({
    ...msg,
    toolCalls: msg.toolCalls.map((tc) => {
      if (tc.id === event.toolCallId) {
        return { ...tc, status: 'completed' as const, result: event.content };
      }
      return tc;
    }),
  }));

  return { ...state, activeToolCalls, messages };
}

// -- State management handlers ------------------------------------------------

function handleStateSnapshot(state: AGUIState, event: StateSnapshotEvent): AGUIState {
  return { ...state, agentState: { ...event.snapshot } };
}

function handleStateDelta(state: AGUIState, event: StateDeltaEvent): AGUIState {
  // Apply JSON Patch (RFC 6902) operations to agent state
  const agentState = applyJsonPatch({ ...state.agentState }, event.delta);
  return { ...state, agentState };
}

function handleMessagesSnapshot(state: AGUIState, event: MessagesSnapshotEvent): AGUIState {
  return { ...state, messages: event.messages };
}

/**
 * Apply JSON Patch (RFC 6902) operations to an object.
 * Supports: add, remove, replace. Other ops are ignored for safety.
 */
function applyJsonPatch(
  obj: Record<string, unknown>,
  ops: JSONPatchOperation[],
): Record<string, unknown> {
  const result = { ...obj };

  for (const op of ops) {
    const pathParts = op.path.split('/').filter(Boolean);
    if (pathParts.length === 0) continue;

    switch (op.op) {
      case 'add':
      case 'replace': {
        let target: Record<string, unknown> = result;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const key = pathParts[i];
          if (typeof target[key] !== 'object' || target[key] === null) {
            target[key] = {};
          }
          target = target[key] as Record<string, unknown>;
        }
        target[pathParts[pathParts.length - 1]] = op.value;
        break;
      }
      case 'remove': {
        let target: Record<string, unknown> = result;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const key = pathParts[i];
          if (typeof target[key] !== 'object' || target[key] === null) break;
          target = target[key] as Record<string, unknown>;
        }
        delete target[pathParts[pathParts.length - 1]];
        break;
      }
      // move, copy, test are ignored for safety in this minimal implementation
    }
  }

  return result;
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export interface AGUIProviderProps {
  /** SSE endpoint URL */
  url?: string;
  /** Full client configuration (overrides url if both provided) */
  config?: Partial<AGUIClientConfig>;
  /** Whether to auto-connect on mount (default: false) */
  autoConnect?: boolean;
  /** Children */
  children: React.ReactNode;
}

export const AGUIProvider: React.FC<AGUIProviderProps> = ({
  url,
  config,
  autoConnect = false,
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const clientRef = useRef<AGUIClient | null>(null);
  const epsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build effective config
  const effectiveConfig = useMemo<Partial<AGUIClientConfig>>(
    () => ({
      ...config,
      ...(url ? { url } : {}),
    }),
    [url, config],
  );

  // -- Client lifecycle -------------------------------------------------------

  // Create client on mount
  useEffect(() => {
    const client = new AGUIClient(effectiveConfig);
    clientRef.current = client;

    // Subscribe to all events
    const unsubEvent = client.on('*', (event: AGUIEvent) => {
      dispatch({ type: 'PROCESS_EVENT', event });
    });

    // Subscribe to status changes
    const unsubStatus = client.onStatus((status: AGUIConnectionStatus) => {
      dispatch({ type: 'SET_CONNECTION_STATUS', status });
      dispatch({
        type: 'SET_RECONNECT_ATTEMPTS',
        attempts: client.getReconnectAttempts(),
      });
    });

    // Periodic EPS update (every 2s)
    epsIntervalRef.current = setInterval(() => {
      if (clientRef.current) {
        dispatch({
          type: 'SET_EVENTS_PER_SECOND',
          eps: clientRef.current.getEventsPerSecond(),
        });
      }
    }, 2000);

    // Auto-connect if configured
    if (autoConnect) {
      client.connect();
    }

    return () => {
      unsubEvent();
      unsubStatus();
      if (epsIntervalRef.current) {
        clearInterval(epsIntervalRef.current);
      }
      client.dispose();
      clientRef.current = null;
    };
    // Only create client once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Actions ----------------------------------------------------------------

  const connect = useCallback((configOverride?: Partial<AGUIClientConfig>) => {
    clientRef.current?.connect(configOverride);
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  const startRun = useCallback((_input: RunAgentInput) => {
    // In a full implementation, this would POST to the agent backend
    // to initiate a new run. The SSE stream would then emit RunStarted.
    // For now, we simulate the RunStarted event locally.
    const runId = _input.runId ?? generateId('run');
    const event: RunStartedEvent = {
      type: 'RunStarted',
      threadId: _input.threadId,
      runId,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'PROCESS_EVENT', event });
  }, []);

  const sendMessage = useCallback((content: string) => {
    // Add user message locally
    const messageId = generateId('msg');
    const startEvent: TextMessageStartEvent = {
      type: 'TextMessageStart',
      messageId,
      role: 'user',
      timestamp: new Date().toISOString(),
    };
    const contentEvent: TextMessageContentEvent = {
      type: 'TextMessageContent',
      messageId,
      delta: content,
      timestamp: new Date().toISOString(),
    };
    const endEvent: TextMessageEndEvent = {
      type: 'TextMessageEnd',
      messageId,
      timestamp: new Date().toISOString(),
    };

    dispatch({ type: 'PROCESS_EVENT', event: startEvent });
    dispatch({ type: 'PROCESS_EVENT', event: contentEvent });
    dispatch({ type: 'PROCESS_EVENT', event: endEvent });
  }, []);

  const sendToolResult = useCallback((toolCallId: string, result: unknown) => {
    const event: ToolCallResultEvent = {
      type: 'ToolCallResult',
      messageId: generateId('msg'),
      toolCallId,
      content: result,
      role: 'tool',
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'PROCESS_EVENT', event });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const clearEventLog = useCallback(() => {
    dispatch({ type: 'CLEAR_EVENT_LOG' });
  }, []);

  // -- Context value ----------------------------------------------------------

  const actions = useMemo<AGUIActions>(
    () => ({
      connect,
      disconnect,
      startRun,
      sendMessage,
      sendToolResult,
      reset,
      clearEventLog,
    }),
    [connect, disconnect, startRun, sendMessage, sendToolResult, reset, clearEventLog],
  );

  const contextValue = useMemo<AGUIContextValue>(
    () => ({ state, actions }),
    [state, actions],
  );

  return (
    <AGUIContext.Provider value={contextValue}>
      {children}
    </AGUIContext.Provider>
  );
};

export default AGUIProvider;
