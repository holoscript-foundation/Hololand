/**
 * AG-UI React Hooks
 *
 * React hooks for integrating AG-UI protocol into dashboard components.
 * Provides ergonomic access to agent events, shared state, messages,
 * and VR-specific dashboard interactions.
 *
 * These hooks are designed to be lightweight and non-blocking,
 * respecting the VR render loop timing constraints.
 *
 * @module ag-ui/hooks
 */

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { AGUIContext } from './provider';
import type {
  AGUIEvent,
  AGUIEventType,
  AGUIMessage,
  AGUIConnectionStatus,
  AGUIRunStatus,
  AGUIRunConfig,
  VRDashboardAgentState,
  VRDashboardActivityType,
} from './types';

// =============================================================================
// useAGUI - Primary hook for accessing the AG-UI context
// =============================================================================

/**
 * Access the AG-UI client and state from the nearest AGUIProvider.
 *
 * Usage:
 * ```tsx
 * function MyDashboard() {
 *   const { client, connectionStatus, runStatus, state, messages } = useAGUI();
 *   // ...
 * }
 * ```
 */
export function useAGUI() {
  const context = useContext(AGUIContext);
  if (!context) {
    throw new Error('useAGUI must be used within an <AGUIProvider>');
  }
  return context;
}

// =============================================================================
// useAGUIEvents - Subscribe to specific event types
// =============================================================================

/**
 * Subscribe to specific AG-UI event types with automatic cleanup.
 *
 * Usage:
 * ```tsx
 * useAGUIEvents(['TEXT_MESSAGE_CONTENT', 'TOOL_CALL_START'], (event) => {
 *   console.log('Agent event:', event);
 * });
 * ```
 */
export function useAGUIEvents(
  eventTypes: AGUIEventType[],
  handler: (event: AGUIEvent) => void,
): void {
  const { client } = useAGUI();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const eventTypesKey = eventTypes.join(',');

  useEffect(() => {
    if (!client) return;

    const unsubscribe = client.on('event', (event: AGUIEvent) => {
      if (eventTypes.includes(event.type)) {
        handlerRef.current(event);
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, eventTypesKey]);
}

// =============================================================================
// useAGUIState - Access and update shared state
// =============================================================================

/**
 * Access and update the AG-UI shared state.
 *
 * Returns the current state and an update function that merges
 * partial updates into the shared state.
 *
 * Usage:
 * ```tsx
 * const [state, updateState] = useAGUIState();
 * updateState({ activePanel: 'analytics', selectedMetric: 'fps' });
 * ```
 */
export function useAGUIState<T extends Record<string, unknown> = Record<string, unknown>>(): [
  Readonly<T>,
  (updates: Partial<T>) => void,
] {
  const { state, updateState } = useAGUI();

  const typedUpdateState = useCallback(
    (updates: Partial<T>) => {
      updateState(updates as Record<string, unknown>);
    },
    [updateState],
  );

  return [state as unknown as T, typedUpdateState];
}

// =============================================================================
// useAGUIMessages - Access message history
// =============================================================================

/**
 * Access the AG-UI message history with optional role filtering.
 *
 * Usage:
 * ```tsx
 * const assistantMessages = useAGUIMessages('assistant');
 * const allMessages = useAGUIMessages();
 * ```
 */
export function useAGUIMessages(
  roleFilter?: AGUIMessage['role'] | AGUIMessage['role'][],
): readonly AGUIMessage[] {
  const { messages } = useAGUI();

  return useMemo(() => {
    if (!roleFilter) return messages;

    const roles = Array.isArray(roleFilter) ? roleFilter : [roleFilter];
    return messages.filter((msg) => roles.includes(msg.role));
  }, [messages, roleFilter]);
}

// =============================================================================
// useAGUIRun - Run management
// =============================================================================

interface UseAGUIRunReturn {
  /** Start a new agent run */
  startRun: (config: AGUIRunConfig) => Promise<void>;
  /** Cancel the current run */
  cancelRun: () => Promise<void>;
  /** Send a message to the agent */
  sendMessage: (content: string) => Promise<void>;
  /** Current run status */
  runStatus: AGUIRunStatus;
  /** Connection status */
  connectionStatus: AGUIConnectionStatus;
  /** Whether a run is currently active */
  isActive: boolean;
  /** Whether the agent is currently streaming content */
  isStreaming: boolean;
  /** Last error, if any */
  error: Error | null;
}

/**
 * Manage AG-UI agent runs with start, cancel, and message sending.
 *
 * Usage:
 * ```tsx
 * const { startRun, sendMessage, isActive, isStreaming } = useAGUIRun();
 *
 * const handleAsk = async () => {
 *   await startRun({
 *     threadId: 'dashboard-thread',
 *     state: { panel: 'analytics' },
 *   });
 * };
 * ```
 */
export function useAGUIRun(): UseAGUIRunReturn {
  const { client, runStatus, connectionStatus } = useAGUI();
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client) return;

    const unsubscribe = client.on('error', (err: Error) => {
      setError(err);
    });

    return unsubscribe;
  }, [client]);

  const startRun = useCallback(
    async (config: AGUIRunConfig) => {
      if (!client) throw new Error('AG-UI client not initialized');
      setError(null);
      await client.startRun(config);
    },
    [client],
  );

  const cancelRun = useCallback(async () => {
    if (!client) return;
    await client.cancelRun();
  }, [client]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!client) throw new Error('AG-UI client not initialized');
      await client.sendMessage(content);
    },
    [client],
  );

  return {
    startRun,
    cancelRun,
    sendMessage,
    runStatus,
    connectionStatus,
    isActive: runStatus === 'running' || runStatus === 'streaming' || runStatus === 'starting',
    isStreaming: runStatus === 'streaming',
    error,
  };
}

// =============================================================================
// useAGUIStreamingText - Track streaming text from agent
// =============================================================================

/**
 * Track streaming text content from the agent in real-time.
 *
 * Returns the currently streaming text that has not yet been
 * finalized into a complete message.
 *
 * Usage:
 * ```tsx
 * const streamingText = useAGUIStreamingText();
 * return <p>{streamingText || 'Waiting for agent...'}</p>;
 * ```
 */
export function useAGUIStreamingText(): string {
  const [text, setText] = useState('');
  const textRef = useRef('');

  useAGUIEvents(
    ['TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END'],
    (event) => {
      switch (event.type) {
        case 'TEXT_MESSAGE_START':
          textRef.current = '';
          setText('');
          break;
        case 'TEXT_MESSAGE_CONTENT':
          textRef.current += event.delta;
          setText(textRef.current);
          break;
        case 'TEXT_MESSAGE_END':
          textRef.current = '';
          setText('');
          break;
      }
    },
  );

  return text;
}

// =============================================================================
// useAGUIThinking - Track agent thinking/reasoning state
// =============================================================================

interface AGUIThinkingState {
  /** Whether the agent is currently in a thinking/reasoning phase */
  isThinking: boolean;
  /** Current thinking/reasoning text being streamed */
  thinkingText: string;
  /** All completed reasoning steps */
  completedSteps: string[];
}

/**
 * Track the agent's thinking/reasoning state.
 *
 * Usage:
 * ```tsx
 * const { isThinking, thinkingText, completedSteps } = useAGUIThinking();
 * ```
 */
export function useAGUIThinking(): AGUIThinkingState {
  const [state, dispatch] = useReducer(
    (
      prev: AGUIThinkingState,
      action:
        | { type: 'start' }
        | { type: 'content'; delta: string }
        | { type: 'messageEnd'; text: string }
        | { type: 'end' },
    ): AGUIThinkingState => {
      switch (action.type) {
        case 'start':
          return { ...prev, isThinking: true, thinkingText: '' };
        case 'content':
          return { ...prev, thinkingText: prev.thinkingText + action.delta };
        case 'messageEnd':
          return {
            ...prev,
            thinkingText: '',
            completedSteps: [...prev.completedSteps, action.text],
          };
        case 'end':
          return { ...prev, isThinking: false, thinkingText: '' };
        default:
          return prev;
      }
    },
    { isThinking: false, thinkingText: '', completedSteps: [] },
  );

  const thinkingTextRef = useRef('');

  useAGUIEvents(
    [
      'REASONING_START',
      'REASONING_MESSAGE_START',
      'REASONING_MESSAGE_CONTENT',
      'REASONING_MESSAGE_END',
      'REASONING_END',
    ],
    (event) => {
      switch (event.type) {
        case 'REASONING_START':
          thinkingTextRef.current = '';
          dispatch({ type: 'start' });
          break;
        case 'REASONING_MESSAGE_CONTENT':
          thinkingTextRef.current += event.delta;
          dispatch({ type: 'content', delta: event.delta });
          break;
        case 'REASONING_MESSAGE_END':
          dispatch({ type: 'messageEnd', text: thinkingTextRef.current });
          thinkingTextRef.current = '';
          break;
        case 'REASONING_END':
          dispatch({ type: 'end' });
          break;
      }
    },
  );

  return state;
}

// =============================================================================
// useAGUIToolCalls - Track active tool calls
// =============================================================================

interface AGUIActiveToolCall {
  id: string;
  name: string;
  args: string;
  result?: string;
  status: 'calling' | 'streaming_args' | 'completed';
}

/**
 * Track active tool calls from the agent.
 *
 * Usage:
 * ```tsx
 * const toolCalls = useAGUIToolCalls();
 * return toolCalls.map(tc => (
 *   <div key={tc.id}>{tc.name}: {tc.status}</div>
 * ));
 * ```
 */
export function useAGUIToolCalls(): AGUIActiveToolCall[] {
  const [toolCalls, setToolCalls] = useState<Map<string, AGUIActiveToolCall>>(new Map());

  useAGUIEvents(
    ['TOOL_CALL_START', 'TOOL_CALL_ARGS', 'TOOL_CALL_END', 'TOOL_CALL_RESULT'],
    (event) => {
      setToolCalls((prev) => {
        const next = new Map(prev);
        switch (event.type) {
          case 'TOOL_CALL_START':
            next.set(event.toolCallId, {
              id: event.toolCallId,
              name: event.toolCallName,
              args: '',
              status: 'calling',
            });
            break;
          case 'TOOL_CALL_ARGS': {
            const existing = next.get(event.toolCallId);
            if (existing) {
              next.set(event.toolCallId, {
                ...existing,
                args: existing.args + event.delta,
                status: 'streaming_args',
              });
            }
            break;
          }
          case 'TOOL_CALL_END': {
            const tc = next.get(event.toolCallId);
            if (tc) {
              next.set(event.toolCallId, { ...tc, status: 'completed' });
            }
            break;
          }
          case 'TOOL_CALL_RESULT': {
            const tcr = next.get(event.toolCallId);
            if (tcr) {
              next.set(event.toolCallId, {
                ...tcr,
                result: event.content,
                status: 'completed',
              });
            }
            break;
          }
        }
        return next;
      });
    },
  );

  return useMemo(() => Array.from(toolCalls.values()), [toolCalls]);
}

// =============================================================================
// useVRDashboardAgent - VR Dashboard-specific agent interaction
// =============================================================================

interface UseVRDashboardAgentReturn {
  /** Current VR dashboard agent state */
  agentState: VRDashboardAgentState;
  /** Whether the agent is currently thinking */
  isThinking: boolean;
  /** Agent's current speech text */
  speechText: string;
  /** Active highlights on metrics */
  highlights: VRDashboardAgentState['highlights'];
  /** Agent suggestions */
  suggestions: VRDashboardAgentState['suggestions'];
  /** Agent notifications */
  notifications: VRDashboardAgentState['notifications'];
  /** Navigate to a dashboard panel via the agent */
  navigateToPanel: (panel: string) => void;
  /** Dismiss a notification */
  dismissNotification: (notificationId: string) => void;
  /** Accept a suggestion */
  acceptSuggestion: (suggestionId: string) => void;
  /** Report an activity to the agent */
  reportActivity: (activityType: VRDashboardActivityType, data: Record<string, unknown>) => void;
}

/**
 * VR Dashboard-specific agent interaction hook.
 *
 * Provides high-level access to agent state, suggestions, notifications,
 * and metric highlights within VR dashboard components.
 *
 * Usage:
 * ```tsx
 * function AnalyticsDashboard() {
 *   const {
 *     isThinking,
 *     highlights,
 *     suggestions,
 *     notifications,
 *     reportActivity,
 *   } = useVRDashboardAgent();
 *
 *   useEffect(() => {
 *     reportActivity('dashboard_navigation', { panel: 'analytics' });
 *   }, []);
 *
 *   return (
 *     <div>
 *       {isThinking && <AgentThinkingIndicator />}
 *       {suggestions?.map(s => <SuggestionCard key={s.id} suggestion={s} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVRDashboardAgent(): UseVRDashboardAgentReturn {
  const { state, updateState, client } = useAGUI();

  const agentState = useMemo((): VRDashboardAgentState => {
    return (state.__vrDashboard as VRDashboardAgentState) ?? {};
  }, [state]);

  const navigateToPanel = useCallback(
    (panel: string) => {
      updateState({
        __vrDashboard: {
          ...agentState,
          activePanel: panel,
        },
      });
    },
    [agentState, updateState],
  );

  const dismissNotification = useCallback(
    (notificationId: string) => {
      const currentNotifications = agentState.notifications ?? [];
      updateState({
        __vrDashboard: {
          ...agentState,
          notifications: currentNotifications.filter((n) => n.id !== notificationId),
        },
      });
    },
    [agentState, updateState],
  );

  const acceptSuggestion = useCallback(
    (suggestionId: string) => {
      const currentSuggestions = agentState.suggestions ?? [];
      const suggestion = currentSuggestions.find((s) => s.id === suggestionId);
      if (suggestion?.action && client) {
        // Send the suggestion action as a user message
        client.sendMessage(`Accept suggestion: ${suggestion.action}`);
      }
      // Remove the accepted suggestion
      updateState({
        __vrDashboard: {
          ...agentState,
          suggestions: currentSuggestions.filter((s) => s.id !== suggestionId),
        },
      });
    },
    [agentState, client, updateState],
  );

  const reportActivity = useCallback(
    (activityType: VRDashboardActivityType, data: Record<string, unknown>) => {
      updateState({
        __vrDashboard: {
          ...agentState,
          _lastActivity: {
            type: activityType,
            data,
            timestamp: new Date().toISOString(),
          },
        },
      });
    },
    [agentState, updateState],
  );

  // Auto-dismiss expired notifications
  useEffect(() => {
    const notifications = agentState.notifications;
    if (!notifications || notifications.length === 0) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    for (const notification of notifications) {
      if (notification.dismissAfterMs) {
        const timeout = setTimeout(() => {
          dismissNotification(notification.id);
        }, notification.dismissAfterMs);
        timeouts.push(timeout);
      }
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [agentState.notifications, dismissNotification]);

  return {
    agentState,
    isThinking: agentState.isThinking ?? false,
    speechText: agentState.speechText ?? '',
    highlights: agentState.highlights ?? [],
    suggestions: agentState.suggestions ?? [],
    notifications: agentState.notifications ?? [],
    navigateToPanel,
    dismissNotification,
    acceptSuggestion,
    reportActivity,
  };
}
