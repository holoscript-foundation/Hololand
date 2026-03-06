/**
 * AG-UI Protocol Types
 *
 * Type definitions implementing the AG-UI (Agent-User Interaction) protocol
 * for real-time, event-based communication between AI agent backends and
 * user-facing frontend applications.
 *
 * Protocol reference: https://docs.ag-ui.com/concepts/events
 *
 * AG-UI defines a lightweight, event-based protocol where agents emit a
 * sequence of typed JSON events over SSE (Server-Sent Events) or WebSocket.
 * Events cover the full lifecycle: run management, text streaming, tool calls,
 * state synchronization, and custom extensions.
 *
 * VR Safety:
 *   All state updates from the AG-UI stream are batched outside the render
 *   loop. The context provider throttles React re-renders to a configurable
 *   rate (default 10Hz) so dashboard overlays stay within their 0.5ms budget
 *   at 90Hz VR (per FRAME_BUDGET.DASHBOARD_BUDGET_MS).
 *
 * @module ag-ui/types
 */

// =============================================================================
// AG-UI EVENT TYPES (per protocol spec)
// =============================================================================

/**
 * All AG-UI event type discriminators.
 */
export type AGUIEventType =
  // Lifecycle
  | 'RunStarted'
  | 'RunFinished'
  | 'RunError'
  | 'StepStarted'
  | 'StepFinished'
  // Text messages
  | 'TextMessageStart'
  | 'TextMessageContent'
  | 'TextMessageEnd'
  // Tool calls
  | 'ToolCallStart'
  | 'ToolCallArgs'
  | 'ToolCallEnd'
  | 'ToolCallResult'
  // State management
  | 'StateSnapshot'
  | 'StateDelta'
  | 'MessagesSnapshot'
  // Custom
  | 'Custom'
  | 'Raw';

/**
 * Base properties shared by all AG-UI events.
 */
export interface AGUIBaseEvent {
  /** Event type discriminator */
  type: AGUIEventType;
  /** ISO 8601 timestamp (optional in protocol, always set by our client) */
  timestamp?: string;
  /** Original raw event data if transformed by middleware */
  rawEvent?: unknown;
}

// =============================================================================
// LIFECYCLE EVENTS
// =============================================================================

export interface RunStartedEvent extends AGUIBaseEvent {
  type: 'RunStarted';
  threadId: string;
  runId: string;
  parentRunId?: string;
  input?: Record<string, unknown>;
}

export interface RunFinishedEvent extends AGUIBaseEvent {
  type: 'RunFinished';
  threadId: string;
  runId: string;
  result?: unknown;
}

export interface RunErrorEvent extends AGUIBaseEvent {
  type: 'RunError';
  message: string;
  code?: string;
}

export interface StepStartedEvent extends AGUIBaseEvent {
  type: 'StepStarted';
  stepName: string;
}

export interface StepFinishedEvent extends AGUIBaseEvent {
  type: 'StepFinished';
  stepName: string;
}

// =============================================================================
// TEXT MESSAGE EVENTS
// =============================================================================

export interface TextMessageStartEvent extends AGUIBaseEvent {
  type: 'TextMessageStart';
  messageId: string;
  role: 'developer' | 'system' | 'assistant' | 'user' | 'tool';
}

export interface TextMessageContentEvent extends AGUIBaseEvent {
  type: 'TextMessageContent';
  messageId: string;
  delta: string;
}

export interface TextMessageEndEvent extends AGUIBaseEvent {
  type: 'TextMessageEnd';
  messageId: string;
}

// =============================================================================
// TOOL CALL EVENTS
// =============================================================================

export interface ToolCallStartEvent extends AGUIBaseEvent {
  type: 'ToolCallStart';
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface ToolCallArgsEvent extends AGUIBaseEvent {
  type: 'ToolCallArgs';
  toolCallId: string;
  delta: string;
}

export interface ToolCallEndEvent extends AGUIBaseEvent {
  type: 'ToolCallEnd';
  toolCallId: string;
}

export interface ToolCallResultEvent extends AGUIBaseEvent {
  type: 'ToolCallResult';
  messageId: string;
  toolCallId: string;
  content: unknown;
  role?: string;
}

// =============================================================================
// STATE MANAGEMENT EVENTS
// =============================================================================

/**
 * JSON Patch operation per RFC 6902, used by StateDelta events.
 */
export interface JSONPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

export interface StateSnapshotEvent extends AGUIBaseEvent {
  type: 'StateSnapshot';
  snapshot: Record<string, unknown>;
}

export interface StateDeltaEvent extends AGUIBaseEvent {
  type: 'StateDelta';
  delta: JSONPatchOperation[];
}

export interface MessagesSnapshotEvent extends AGUIBaseEvent {
  type: 'MessagesSnapshot';
  messages: AGUIMessage[];
}

// =============================================================================
// CUSTOM / RAW EVENTS
// =============================================================================

export interface CustomEvent extends AGUIBaseEvent {
  type: 'Custom';
  name: string;
  value: unknown;
}

export interface RawEvent extends AGUIBaseEvent {
  type: 'Raw';
  event: unknown;
  source?: string;
}

// =============================================================================
// UNION TYPE
// =============================================================================

/**
 * Discriminated union of all AG-UI events.
 */
export type AGUIEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | StepStartedEvent
  | StepFinishedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | ToolCallResultEvent
  | StateSnapshotEvent
  | StateDeltaEvent
  | MessagesSnapshotEvent
  | CustomEvent
  | RawEvent;

// =============================================================================
// MESSAGE TYPES (for MessagesSnapshot and local state)
// =============================================================================

/**
 * A complete message in the AG-UI conversation thread.
 */
export interface AGUIMessage {
  /** Unique message ID */
  id: string;
  /** Message role */
  role: 'developer' | 'system' | 'assistant' | 'user' | 'tool';
  /** Full text content (accumulated from streaming deltas) */
  content: string;
  /** Whether this message is still being streamed */
  isStreaming: boolean;
  /** Tool calls associated with this message (assistant messages) */
  toolCalls: AGUIToolCall[];
  /** Timestamp when message started */
  createdAt: number;
  /** Timestamp of last content update */
  updatedAt: number;
}

/**
 * A tool call made by the agent.
 */
export interface AGUIToolCall {
  /** Unique tool call ID */
  id: string;
  /** Tool name */
  name: string;
  /** Accumulated arguments JSON string */
  args: string;
  /** Parsed arguments (set when ToolCallEnd is received) */
  parsedArgs: Record<string, unknown> | null;
  /** Tool call result (set when ToolCallResult is received) */
  result: unknown | null;
  /** Tool call status */
  status: 'streaming' | 'pending' | 'completed' | 'error';
}

// =============================================================================
// CONNECTION & CLIENT TYPES
// =============================================================================

/**
 * Connection status for the AG-UI SSE client.
 */
export type AGUIConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Run status for the current agent run.
 */
export type AGUIRunStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'error';

/**
 * Configuration for the AG-UI SSE client.
 */
export interface AGUIClientConfig {
  /** SSE endpoint URL */
  url: string;
  /** HTTP headers to send with the SSE request */
  headers?: Record<string, string>;
  /** Initial reconnection delay in ms (default: 1000) */
  initialReconnectDelay?: number;
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Maximum reconnection attempts before giving up (default: 10) */
  maxReconnectAttempts?: number;
  /** Whether to automatically reconnect on disconnection (default: true) */
  autoReconnect?: boolean;
}

/**
 * Input for starting an agent run via the AG-UI protocol.
 */
export interface RunAgentInput {
  /** Thread ID for conversation context */
  threadId: string;
  /** Run ID (auto-generated if not provided) */
  runId?: string;
  /** Messages to send as context */
  messages?: AGUIMessage[];
  /** Custom state to attach to the run */
  state?: Record<string, unknown>;
  /** Tools available to the agent */
  tools?: AGUIToolDefinition[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tool definition for agent-available tools.
 */
export interface AGUIToolDefinition {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** JSON Schema for tool parameters */
  parameters: Record<string, unknown>;
}

// =============================================================================
// AG-UI CONTEXT STATE
// =============================================================================

/**
 * Complete AG-UI state managed by the context provider.
 */
export interface AGUIState {
  /** Current connection status */
  connectionStatus: AGUIConnectionStatus;
  /** Current run status */
  runStatus: AGUIRunStatus;
  /** Active run ID */
  currentRunId: string | null;
  /** Active thread ID */
  currentThreadId: string | null;
  /** All messages in the current thread */
  messages: AGUIMessage[];
  /** Active tool calls (not yet completed) */
  activeToolCalls: AGUIToolCall[];
  /** Agent-managed state (from StateSnapshot/StateDelta) */
  agentState: Record<string, unknown>;
  /** Current step name (if agent reports steps) */
  currentStep: string | null;
  /** Error message if run errored */
  error: string | null;
  /** Total events received in this session */
  totalEventsReceived: number;
  /** Events per second (rolling average) */
  eventsPerSecond: number;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Event log for debugging (last N events) */
  eventLog: AGUIEventLogEntry[];
}

/**
 * A logged event for the debug panel.
 */
export interface AGUIEventLogEntry {
  /** Event type */
  type: AGUIEventType;
  /** Timestamp */
  timestamp: number;
  /** Summary of event content */
  summary: string;
  /** Raw event data (for expandable debug view) */
  raw: AGUIEvent;
}

/**
 * Actions available from the AG-UI context.
 */
export interface AGUIActions {
  /** Connect to the AG-UI SSE endpoint */
  connect: (config?: Partial<AGUIClientConfig>) => void;
  /** Disconnect from the SSE endpoint */
  disconnect: () => void;
  /** Start a new agent run */
  startRun: (input: RunAgentInput) => void;
  /** Send a user message (queues a user message and triggers agent) */
  sendMessage: (content: string) => void;
  /** Provide a tool call result back to the agent */
  sendToolResult: (toolCallId: string, result: unknown) => void;
  /** Clear all messages and reset state */
  reset: () => void;
  /** Clear the event log */
  clearEventLog: () => void;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for AG-UI dashboard components.
 * Follows the same pattern as VRPerfTheme and EconDashboardTheme.
 */
export interface AGUITheme {
  fontFamily: string;
  fontScale: number;
  borderRadius: string;

  // Backgrounds
  containerBackground: string;
  cardBackground: string;
  messageBackground: string;
  assistantMessageBackground: string;
  userMessageBackground: string;
  toolCallBackground: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  borderColor: string;

  // Status colors
  connectedColor: string;
  disconnectedColor: string;
  errorColor: string;
  reconnectingColor: string;

  // Run status colors
  idleColor: string;
  runningColor: string;
  completedColor: string;

  // Message role colors
  assistantColor: string;
  userColor: string;
  systemColor: string;
  toolColor: string;

  // Tool call status colors
  toolStreamingColor: string;
  toolPendingColor: string;
  toolCompletedColor: string;
  toolErrorColor: string;

  // Accent
  accentColor: string;
  streamingCursorColor: string;
}

/**
 * Default dark theme for the AG-UI dashboard.
 * All foreground colours meet WCAG 2.1 AA contrast against the backgrounds.
 */
export const DEFAULT_AGUI_THEME: AGUITheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',

  containerBackground: '#0c0c1d',
  cardBackground: '#141428',
  messageBackground: '#1a1a36',
  assistantMessageBackground: '#1a2040',
  userMessageBackground: '#1a3a2a',
  toolCallBackground: '#2a1a3a',

  textPrimary: '#e4e4f0',       // 12.8:1 against container
  textSecondary: '#a0a0c0',     // 5.9:1
  textMuted: '#7878a0',         // 4.5:1 AA minimum

  borderColor: '#2c2c4c',

  connectedColor: '#22c55e',
  disconnectedColor: '#6b7280',
  errorColor: '#ef4444',
  reconnectingColor: '#eab308',

  idleColor: '#6b7280',
  runningColor: '#3b82f6',
  completedColor: '#22c55e',

  assistantColor: '#6366f1',
  userColor: '#22c55e',
  systemColor: '#eab308',
  toolColor: '#a855f7',

  toolStreamingColor: '#3b82f6',
  toolPendingColor: '#eab308',
  toolCompletedColor: '#22c55e',
  toolErrorColor: '#ef4444',

  accentColor: '#6366f1',
  streamingCursorColor: '#6366f1',
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum number of event log entries to retain.
 */
export const MAX_EVENT_LOG_SIZE = 200;

/**
 * Maximum number of messages to display.
 */
export const MAX_DISPLAY_MESSAGES = 500;

/**
 * Default SSE endpoint.
 */
export const DEFAULT_SSE_URL = 'http://localhost:5567/ag-ui/events';

/**
 * Default client configuration.
 */
export const DEFAULT_CLIENT_CONFIG: Required<AGUIClientConfig> = {
  url: DEFAULT_SSE_URL,
  headers: {},
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30_000,
  maxReconnectAttempts: 10,
  autoReconnect: true,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a unique ID for messages, runs, etc.
 */
export function generateId(prefix: string = 'agui'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the display color for a connection status.
 */
export function getConnectionStatusColor(
  status: AGUIConnectionStatus,
  theme: AGUITheme,
): string {
  switch (status) {
    case 'connected': return theme.connectedColor;
    case 'connecting': return theme.reconnectingColor;
    case 'reconnecting': return theme.reconnectingColor;
    case 'error': return theme.errorColor;
    case 'disconnected': return theme.disconnectedColor;
    default: return theme.textMuted;
  }
}

/**
 * Get the display color for a run status.
 */
export function getRunStatusColor(
  status: AGUIRunStatus,
  theme: AGUITheme,
): string {
  switch (status) {
    case 'running': return theme.runningColor;
    case 'completed': return theme.completedColor;
    case 'error': return theme.errorColor;
    case 'idle': return theme.idleColor;
    default: return theme.textMuted;
  }
}

/**
 * Get the display color for a tool call status.
 */
export function getToolCallStatusColor(
  status: AGUIToolCall['status'],
  theme: AGUITheme,
): string {
  switch (status) {
    case 'streaming': return theme.toolStreamingColor;
    case 'pending': return theme.toolPendingColor;
    case 'completed': return theme.toolCompletedColor;
    case 'error': return theme.toolErrorColor;
    default: return theme.textMuted;
  }
}

/**
 * Format an event type for display.
 */
export function formatEventType(type: AGUIEventType): string {
  // Convert PascalCase to readable: "TextMessageContent" -> "Text Message Content"
  return type.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Summarize an AG-UI event for the event log.
 */
export function summarizeEvent(event: AGUIEvent): string {
  switch (event.type) {
    case 'RunStarted':
      return `Run ${event.runId} started (thread: ${event.threadId})`;
    case 'RunFinished':
      return `Run ${event.runId} finished`;
    case 'RunError':
      return `Error: ${event.message}`;
    case 'StepStarted':
      return `Step "${event.stepName}" started`;
    case 'StepFinished':
      return `Step "${event.stepName}" finished`;
    case 'TextMessageStart':
      return `Message ${event.messageId} from ${event.role}`;
    case 'TextMessageContent':
      return `+${event.delta.length} chars to ${event.messageId}`;
    case 'TextMessageEnd':
      return `Message ${event.messageId} complete`;
    case 'ToolCallStart':
      return `Tool call: ${event.toolCallName} (${event.toolCallId})`;
    case 'ToolCallArgs':
      return `+${event.delta.length} chars to ${event.toolCallId} args`;
    case 'ToolCallEnd':
      return `Tool call ${event.toolCallId} complete`;
    case 'ToolCallResult':
      return `Result for ${event.toolCallId}`;
    case 'StateSnapshot':
      return `State snapshot (${Object.keys(event.snapshot).length} keys)`;
    case 'StateDelta':
      return `State delta (${event.delta.length} ops)`;
    case 'MessagesSnapshot':
      return `Messages snapshot (${event.messages.length} messages)`;
    case 'Custom':
      return `Custom: ${event.name}`;
    case 'Raw':
      return `Raw event${event.source ? ` from ${event.source}` : ''}`;
    default:
      return 'Unknown event';
  }
}
