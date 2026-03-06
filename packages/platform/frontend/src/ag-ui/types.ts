/**
 * AG-UI Protocol Types
 *
 * Core type definitions for the Agent-User Interaction Protocol.
 * Implements the AG-UI specification for real-time, event-driven
 * bidirectional communication between agentic backends and VR dashboard UIs.
 *
 * Specification reference: https://docs.ag-ui.com
 *
 * @module ag-ui/types
 */

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * All AG-UI event type identifiers.
 * Follows the official AG-UI specification event taxonomy.
 */
export type AGUIEventType =
  // Lifecycle events
  | 'RUN_STARTED'
  | 'RUN_FINISHED'
  | 'RUN_ERROR'
  | 'STEP_STARTED'
  | 'STEP_FINISHED'
  // Text message events
  | 'TEXT_MESSAGE_START'
  | 'TEXT_MESSAGE_CONTENT'
  | 'TEXT_MESSAGE_END'
  // Tool call events
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_ARGS'
  | 'TOOL_CALL_END'
  | 'TOOL_CALL_RESULT'
  // State management events
  | 'STATE_SNAPSHOT'
  | 'STATE_DELTA'
  | 'MESSAGES_SNAPSHOT'
  // Activity events
  | 'ACTIVITY_SNAPSHOT'
  | 'ACTIVITY_DELTA'
  // Reasoning events
  | 'REASONING_START'
  | 'REASONING_MESSAGE_START'
  | 'REASONING_MESSAGE_CONTENT'
  | 'REASONING_MESSAGE_END'
  | 'REASONING_END'
  // Extension events
  | 'RAW'
  | 'CUSTOM';

// =============================================================================
// MESSAGE ROLES
// =============================================================================

/** Roles that messages can have in the AG-UI protocol */
export type AGUIMessageRole =
  | 'user'
  | 'assistant'
  | 'system'
  | 'tool'
  | 'developer'
  | 'activity'
  | 'reasoning';

// =============================================================================
// BASE EVENT
// =============================================================================

/** Base structure shared by all AG-UI events */
export interface AGUIBaseEvent {
  /** Event type identifier */
  type: AGUIEventType;
  /** ISO 8601 timestamp of event creation */
  timestamp?: string;
  /** Original event data if this event was transformed */
  rawEvent?: unknown;
}

// =============================================================================
// LIFECYCLE EVENTS
// =============================================================================

export interface AGUIRunStartedEvent extends AGUIBaseEvent {
  type: 'RUN_STARTED';
  /** Conversation/session thread ID */
  threadId: string;
  /** Unique run identifier */
  runId: string;
  /** Parent run ID for sub-agent composition */
  parentRunId?: string;
  /** Optional input that triggered the run */
  input?: unknown;
}

export interface AGUIRunFinishedEvent extends AGUIBaseEvent {
  type: 'RUN_FINISHED';
  threadId: string;
  runId: string;
  /** Result of the run */
  result?: unknown;
}

export interface AGUIRunErrorEvent extends AGUIBaseEvent {
  type: 'RUN_ERROR';
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
}

export interface AGUIStepStartedEvent extends AGUIBaseEvent {
  type: 'STEP_STARTED';
  /** Step identifier within the run */
  stepId: string;
  /** Human-readable step name */
  stepName?: string;
}

export interface AGUIStepFinishedEvent extends AGUIBaseEvent {
  type: 'STEP_FINISHED';
  stepId: string;
}

// =============================================================================
// TEXT MESSAGE EVENTS
// =============================================================================

export interface AGUITextMessageStartEvent extends AGUIBaseEvent {
  type: 'TEXT_MESSAGE_START';
  /** Unique message ID */
  messageId: string;
  /** Role of the message sender */
  role: AGUIMessageRole;
}

export interface AGUITextMessageContentEvent extends AGUIBaseEvent {
  type: 'TEXT_MESSAGE_CONTENT';
  messageId: string;
  /** Text content delta (streaming chunk) */
  delta: string;
}

export interface AGUITextMessageEndEvent extends AGUIBaseEvent {
  type: 'TEXT_MESSAGE_END';
  messageId: string;
}

// =============================================================================
// TOOL CALL EVENTS
// =============================================================================

export interface AGUIToolCallStartEvent extends AGUIBaseEvent {
  type: 'TOOL_CALL_START';
  /** Unique tool call ID */
  toolCallId: string;
  /** Name of the tool being called */
  toolCallName: string;
  /** Message ID this tool call belongs to */
  parentMessageId?: string;
}

export interface AGUIToolCallArgsEvent extends AGUIBaseEvent {
  type: 'TOOL_CALL_ARGS';
  toolCallId: string;
  /** Streaming argument delta (JSON string chunk) */
  delta: string;
}

export interface AGUIToolCallEndEvent extends AGUIBaseEvent {
  type: 'TOOL_CALL_END';
  toolCallId: string;
}

export interface AGUIToolCallResultEvent extends AGUIBaseEvent {
  type: 'TOOL_CALL_RESULT';
  /** Message ID for the result */
  messageId: string;
  /** Tool call this result belongs to */
  toolCallId: string;
  /** Result content */
  content: string;
  /** Optional role override */
  role?: AGUIMessageRole;
}

// =============================================================================
// STATE MANAGEMENT EVENTS
// =============================================================================

/** JSON Patch operation (RFC 6902) */
export interface JSONPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

export interface AGUIStateSnapshotEvent extends AGUIBaseEvent {
  type: 'STATE_SNAPSHOT';
  /** Complete state object snapshot */
  snapshot: Record<string, unknown>;
}

export interface AGUIStateDeltaEvent extends AGUIBaseEvent {
  type: 'STATE_DELTA';
  /** JSON Patch operations (RFC 6902) */
  delta: JSONPatchOperation[];
}

export interface AGUIMessagesSnapshotEvent extends AGUIBaseEvent {
  type: 'MESSAGES_SNAPSHOT';
  /** Complete message history snapshot */
  messages: AGUIMessage[];
}

// =============================================================================
// ACTIVITY EVENTS
// =============================================================================

export interface AGUIActivitySnapshotEvent extends AGUIBaseEvent {
  type: 'ACTIVITY_SNAPSHOT';
  messageId: string;
  /** Activity type classifier */
  activityType: string;
  /** Structured activity content */
  content: Record<string, unknown>;
}

export interface AGUIActivityDeltaEvent extends AGUIBaseEvent {
  type: 'ACTIVITY_DELTA';
  messageId: string;
  activityType: string;
  /** JSON Patch operations */
  patch: JSONPatchOperation[];
}

// =============================================================================
// REASONING EVENTS
// =============================================================================

export interface AGUIReasoningStartEvent extends AGUIBaseEvent {
  type: 'REASONING_START';
}

export interface AGUIReasoningMessageStartEvent extends AGUIBaseEvent {
  type: 'REASONING_MESSAGE_START';
  messageId: string;
}

export interface AGUIReasoningMessageContentEvent extends AGUIBaseEvent {
  type: 'REASONING_MESSAGE_CONTENT';
  messageId: string;
  delta: string;
}

export interface AGUIReasoningMessageEndEvent extends AGUIBaseEvent {
  type: 'REASONING_MESSAGE_END';
  messageId: string;
}

export interface AGUIReasoningEndEvent extends AGUIBaseEvent {
  type: 'REASONING_END';
}

// =============================================================================
// EXTENSION EVENTS
// =============================================================================

export interface AGUIRawEvent extends AGUIBaseEvent {
  type: 'RAW';
  data: unknown;
}

export interface AGUICustomEvent extends AGUIBaseEvent {
  type: 'CUSTOM';
  /** Custom event name */
  name: string;
  /** Custom payload */
  data: unknown;
}

// =============================================================================
// UNION EVENT TYPE
// =============================================================================

/** Discriminated union of all AG-UI events */
export type AGUIEvent =
  | AGUIRunStartedEvent
  | AGUIRunFinishedEvent
  | AGUIRunErrorEvent
  | AGUIStepStartedEvent
  | AGUIStepFinishedEvent
  | AGUITextMessageStartEvent
  | AGUITextMessageContentEvent
  | AGUITextMessageEndEvent
  | AGUIToolCallStartEvent
  | AGUIToolCallArgsEvent
  | AGUIToolCallEndEvent
  | AGUIToolCallResultEvent
  | AGUIStateSnapshotEvent
  | AGUIStateDeltaEvent
  | AGUIMessagesSnapshotEvent
  | AGUIActivitySnapshotEvent
  | AGUIActivityDeltaEvent
  | AGUIReasoningStartEvent
  | AGUIReasoningMessageStartEvent
  | AGUIReasoningMessageContentEvent
  | AGUIReasoningMessageEndEvent
  | AGUIReasoningEndEvent
  | AGUIRawEvent
  | AGUICustomEvent;

// =============================================================================
// MESSAGE TYPES
// =============================================================================

/** Tool call embedded in assistant messages */
export interface AGUIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** Base message structure */
export interface AGUIMessage {
  id: string;
  role: AGUIMessageRole;
  content: string;
  name?: string;
  toolCalls?: AGUIToolCall[];
  toolCallId?: string;
}

// =============================================================================
// CONNECTION & CONFIGURATION
// =============================================================================

/** Agent run configuration */
export interface AGUIRunConfig {
  /** Conversation thread ID */
  threadId: string;
  /** Run identifier (auto-generated if not provided) */
  runId?: string;
  /** Initial shared state */
  state?: Record<string, unknown>;
  /** Message history to send with the run */
  messages?: AGUIMessage[];
  /** Available tools the agent can call */
  tools?: AGUIToolDefinition[];
  /** Custom configuration passed to the agent */
  config?: Record<string, unknown>;
}

/** Tool definition for agent capabilities */
export interface AGUIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** Connection configuration */
export interface AGUIConnectionConfig {
  /** Agent endpoint URL */
  url: string;
  /** Authentication token */
  token?: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Connection timeout in ms (default: 30000) */
  timeout?: number;
  /** Whether to automatically reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Reconnection delay in ms (default: 1000, doubles each attempt) */
  reconnectDelay?: number;
}

/** Connection status */
export type AGUIConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/** Run status */
export type AGUIRunStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'cancelled';

// =============================================================================
// VR DASHBOARD EXTENSIONS
// =============================================================================

/**
 * VR-specific AG-UI extensions for Hololand dashboards.
 * These custom event types enable agent interaction with
 * VR dashboard components while respecting the 11.1ms frame budget.
 */

/** Custom activity types for VR dashboard interactions */
export type VRDashboardActivityType =
  | 'dashboard_navigation'
  | 'metric_highlight'
  | 'alert_notification'
  | 'data_refresh'
  | 'filter_change'
  | 'visualization_update'
  | 'agent_suggestion'
  | 'voice_command';

/** VR Dashboard agent state synced via AG-UI */
export interface VRDashboardAgentState {
  /** Currently active dashboard panel/tab */
  activePanel?: string;
  /** Highlighted metrics or data points */
  highlights?: Array<{
    metricId: string;
    color?: string;
    label?: string;
    expiresAt?: number;
  }>;
  /** Agent suggestions for the user */
  suggestions?: Array<{
    id: string;
    text: string;
    action?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  /** Pending agent notifications */
  notifications?: Array<{
    id: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    dismissAfterMs?: number;
  }>;
  /** Agent-driven filter/query state */
  filters?: Record<string, unknown>;
  /** Whether the agent is currently thinking/processing */
  isThinking?: boolean;
  /** Current agent speech text for TTS overlay */
  speechText?: string;
}
