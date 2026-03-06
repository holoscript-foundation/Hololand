/**
 * AG-UI Protocol Module
 *
 * Agent-User Interaction Protocol implementation for Hololand VR dashboards.
 * Provides real-time, event-driven bidirectional communication between
 * agentic backends and dashboard frontend components.
 *
 * Architecture:
 * - types.ts: Core AG-UI event types, message formats, state types
 * - client.ts: SSE-based AG-UI protocol client
 * - provider.tsx: React context provider for AG-UI state
 * - hooks.ts: React hooks for consuming AG-UI state and events
 * - components.tsx: Reusable UI components for agent interaction
 *
 * Integration with VR renderer:
 * The AG-UI provider accepts bridge callbacks (onEvent, onStateChange)
 * that can propagate agent state to the AgentCommunicationManager,
 * which in turn writes to the AgentStateBuffer for render-loop-safe
 * consumption by the HololandRenderer.
 *
 * @module ag-ui
 */

// Types
export type {
  AGUIEventType,
  AGUIMessageRole,
  AGUIBaseEvent,
  AGUIRunStartedEvent,
  AGUIRunFinishedEvent,
  AGUIRunErrorEvent,
  AGUIStepStartedEvent,
  AGUIStepFinishedEvent,
  AGUITextMessageStartEvent,
  AGUITextMessageContentEvent,
  AGUITextMessageEndEvent,
  AGUIToolCallStartEvent,
  AGUIToolCallArgsEvent,
  AGUIToolCallEndEvent,
  AGUIToolCallResultEvent,
  AGUIStateSnapshotEvent,
  AGUIStateDeltaEvent,
  AGUIMessagesSnapshotEvent,
  AGUIActivitySnapshotEvent,
  AGUIActivityDeltaEvent,
  AGUIReasoningStartEvent,
  AGUIReasoningMessageStartEvent,
  AGUIReasoningMessageContentEvent,
  AGUIReasoningMessageEndEvent,
  AGUIReasoningEndEvent,
  AGUIRawEvent,
  AGUICustomEvent,
  AGUIEvent,
  AGUIMessage,
  AGUIToolCall,
  AGUIToolDefinition,
  AGUIRunConfig,
  AGUIConnectionConfig,
  AGUIConnectionStatus,
  AGUIRunStatus,
  JSONPatchOperation,
  VRDashboardActivityType,
  VRDashboardAgentState,
} from './types';

// Client
export { AGUIClient, createAGUIClient } from './client';

// Provider
export { AGUIProvider, AGUIContext } from './provider';
export type { AGUIContextValue, AGUIProviderProps } from './provider';

// Hooks
export {
  useAGUI,
  useAGUIEvents,
  useAGUIState,
  useAGUIMessages,
  useAGUIRun,
  useAGUIStreamingText,
  useAGUIThinking,
  useAGUIToolCalls,
  useVRDashboardAgent,
} from './hooks';

// Components
export {
  AgentThinkingIndicator,
  AgentStreamingText,
  AgentNotificationBar,
  AgentSuggestionCards,
  AgentChatInput,
  AgentOverlay,
} from './components';
