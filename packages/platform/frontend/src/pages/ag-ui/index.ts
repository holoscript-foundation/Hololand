/**
 * AG-UI Protocol Module
 *
 * Provides a complete implementation of the AG-UI (Agent-User Interaction)
 * protocol for React applications. Includes SSE client, context provider,
 * custom hooks, and dashboard UI components.
 *
 * @example
 * ```tsx
 * import { AGUIProvider, useAgentStream, useAgentState } from './ag-ui';
 *
 * function App() {
 *   return (
 *     <AGUIProvider url="http://localhost:5567/ag-ui/events" autoConnect>
 *       <AgentChat />
 *     </AGUIProvider>
 *   );
 * }
 *
 * function AgentChat() {
 *   const { messages, sendMessage, isStreaming } = useAgentStream();
 *   const { agentState } = useAgentState();
 *   // ...
 * }
 * ```
 *
 * @module ag-ui
 */

// Client
export { AGUIClient, createAGUIClient, parseAGUIEvent } from './AGUIClient';

// Provider
export { AGUIProvider, useAGUIContext } from './AGUIProvider';
export type { AGUIProviderProps } from './AGUIProvider';

// Hooks
export {
  useAgentStream,
  useAgentState,
  useAgentEvents,
  useAgentConnection,
  useAgentToolCalls,
  useAgentRun,
  useAgentActions,
} from './hooks';
export type {
  AgentStreamState,
  AgentStateResult,
  AgentEventsResult,
  AgentConnectionResult,
  AgentToolCallsResult,
  AgentRunResult,
} from './hooks';

// Types
export type {
  AGUIEventType,
  AGUIBaseEvent,
  AGUIEvent,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  StepStartedEvent,
  StepFinishedEvent,
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
  JSONPatchOperation,
  AGUIMessage,
  AGUIToolCall,
  AGUIConnectionStatus,
  AGUIRunStatus,
  AGUIClientConfig,
  RunAgentInput,
  AGUIToolDefinition,
  AGUIState,
  AGUIActions,
  AGUIEventLogEntry,
  AGUITheme,
} from './types';

export {
  DEFAULT_AGUI_THEME,
  DEFAULT_CLIENT_CONFIG,
  DEFAULT_SSE_URL,
  MAX_EVENT_LOG_SIZE,
  MAX_DISPLAY_MESSAGES,
  generateId,
  getConnectionStatusColor,
  getRunStatusColor,
  getToolCallStatusColor,
  formatEventType,
  summarizeEvent,
} from './types';
