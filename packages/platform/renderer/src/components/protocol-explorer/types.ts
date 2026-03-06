/**
 * Protocol Explorer - Shared Types
 *
 * Type definitions for the developer tool that explores MCP/A2A/ACP/ANP
 * protocol messages through a unified normalization gateway view.
 *
 * Supported Protocols:
 *   MCP  - Model Context Protocol (tool calls, resources, prompts)
 *   A2A  - Agent-to-Agent Protocol (agent cards, tasks, messages)
 *   ACP  - Agent Communication Protocol (direct agent messaging)
 *   ANP  - Agent Network Protocol (network-level agent discovery)
 *
 * Integration:
 *   - Captures protocol messages from the MCP Mesh Orchestrator
 *   - Normalizes heterogeneous protocol formats for unified display
 *   - Browses Agent Cards for A2A discoverable capabilities
 *   - Visualizes real-time protocol translation events
 *
 * Performance contract:
 *   - All rendering within 11.1ms VR frame budget (90Hz)
 *   - Message data pushed at max 10Hz, NEVER polled in render loop
 *   - No heavy JSON parsing in the render path
 *
 * @module protocol-explorer/types
 */

// =============================================================================
// PROTOCOL MODEL
// =============================================================================

/**
 * Supported protocol types.
 */
export type ProtocolType = 'MCP' | 'A2A' | 'ACP' | 'ANP';

/**
 * Direction of a protocol message.
 */
export type MessageDirection = 'inbound' | 'outbound';

/**
 * Protocol message category.
 */
export type MessageCategory =
  | 'tool_call'        // MCP: tool invocation
  | 'tool_result'      // MCP: tool response
  | 'resource_read'    // MCP: resource access
  | 'prompt'           // MCP: prompt template
  | 'agent_card'       // A2A: agent card exchange
  | 'task_create'      // A2A: task creation
  | 'task_update'      // A2A: task status update
  | 'task_result'      // A2A: task result
  | 'agent_message'    // ACP: direct agent message
  | 'discovery'        // ANP: agent discovery
  | 'heartbeat'        // ANP: keepalive
  | 'translation'      // Cross-protocol translation event
  | 'error'            // Protocol error
  | 'unknown';

/**
 * Metadata for each protocol type.
 */
export interface ProtocolMeta {
  /** Protocol identifier */
  protocol: ProtocolType;
  /** Human-readable label */
  label: string;
  /** Short description */
  description: string;
  /** Primary color */
  color: string;
  /** Background color */
  backgroundColor: string;
}

/**
 * Visual config for all protocol types.
 */
export const PROTOCOL_CONFIG: Record<ProtocolType, ProtocolMeta> = {
  MCP: {
    protocol: 'MCP',
    label: 'Model Context Protocol',
    description: 'Tool calls, resources, and prompts',
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  A2A: {
    protocol: 'A2A',
    label: 'Agent-to-Agent',
    description: 'Agent cards, tasks, and messages',
    color: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  ACP: {
    protocol: 'ACP',
    label: 'Agent Communication',
    description: 'Direct agent-to-agent messaging',
    color: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  ANP: {
    protocol: 'ANP',
    label: 'Agent Network',
    description: 'Network discovery and routing',
    color: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
};

// =============================================================================
// PROTOCOL MESSAGE
// =============================================================================

/**
 * A normalized protocol message captured from the gateway.
 */
export interface ProtocolMessage {
  /** Unique message ID */
  id: string;
  /** Timestamp (epoch ms) */
  timestamp: number;
  /** Source protocol */
  protocol: ProtocolType;
  /** Message direction */
  direction: MessageDirection;
  /** Message category */
  category: MessageCategory;
  /** Source agent or server ID */
  sourceId: string;
  /** Source display name */
  sourceName: string;
  /** Destination agent or server ID */
  destinationId: string;
  /** Destination display name */
  destinationName: string;
  /** Human-readable summary */
  summary: string;
  /** Full message payload (JSON-serializable) */
  payload: Record<string, unknown>;
  /** Message size in bytes (serialized payload) */
  sizeBytes: number;
  /** Latency in ms (time from send to receive, -1 if unknown) */
  latencyMs: number;
  /** Whether this message was translated from another protocol */
  isTranslated: boolean;
  /** Original protocol (if translated) */
  originalProtocol?: ProtocolType;
  /** Correlation ID for request/response pairing */
  correlationId?: string;
  /** Error message (if category is 'error') */
  error?: string;
}

// =============================================================================
// AGENT CARD (A2A)
// =============================================================================

/**
 * An A2A Agent Card describing an agent's discoverable capabilities.
 */
export interface AgentCard {
  /** Agent unique identifier */
  agentId: string;
  /** Human-readable agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent version */
  version: string;
  /** Agent provider/organization */
  provider: string;
  /** Agent endpoint URL */
  url: string;
  /** Supported protocols */
  protocols: ProtocolType[];
  /** Capabilities/skills the agent exposes */
  capabilities: AgentCapabilityEntry[];
  /** Authentication methods supported */
  authMethods: string[];
  /** Last time this agent card was refreshed */
  lastSeenAt: number;
  /** Whether the agent is currently online */
  isOnline: boolean;
  /** Agent metadata tags */
  tags: string[];
}

/**
 * A single capability entry in an Agent Card.
 */
export interface AgentCapabilityEntry {
  /** Capability name/identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Input schema summary (simplified for display) */
  inputSchema?: string;
  /** Output schema summary */
  outputSchema?: string;
  /** Protocol this capability is available on */
  protocol: ProtocolType;
  /** Whether this capability is currently available */
  available: boolean;
}

// =============================================================================
// TRANSLATION EVENT
// =============================================================================

/**
 * A protocol translation event from the normalization gateway.
 */
export interface TranslationEvent {
  /** Unique event ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Source protocol */
  fromProtocol: ProtocolType;
  /** Target protocol */
  toProtocol: ProtocolType;
  /** Message ID being translated */
  messageId: string;
  /** Translation status */
  status: 'success' | 'partial' | 'failed';
  /** Fields that were preserved in translation */
  preservedFields: string[];
  /** Fields that were lost or transformed */
  lostFields: string[];
  /** Translation latency in ms */
  translationMs: number;
  /** Notes about the translation */
  notes?: string;
}

// =============================================================================
// DASHBOARD STATE
// =============================================================================

/**
 * Display mode for the Protocol Explorer.
 */
export type ProtocolExplorerDisplayMode =
  | 'full'            // Full explorer with all panels
  | 'compact'         // Compact message stream
  | 'agent-cards'     // Agent Card browser only
  | 'translations';   // Translation visualization only

/**
 * Panels available in the explorer.
 */
export type ProtocolExplorerPanel =
  | 'message-stream'  // Real-time message feed
  | 'agent-cards'     // Agent Card browser
  | 'translations'    // Translation events
  | 'stats'           // Protocol statistics
  | 'detail';         // Selected message detail

/**
 * Protocol statistics summary.
 */
export interface ProtocolStats {
  /** Total messages captured */
  totalMessages: number;
  /** Messages per protocol */
  perProtocol: Record<ProtocolType, number>;
  /** Messages per category */
  perCategory: Partial<Record<MessageCategory, number>>;
  /** Total translations performed */
  totalTranslations: number;
  /** Translation success rate */
  translationSuccessRate: number;
  /** Average message latency per protocol */
  avgLatency: Record<ProtocolType, number>;
  /** Messages per second (current rate) */
  messagesPerSecond: number;
  /** Total data transferred in bytes */
  totalBytes: number;
  /** Time window start */
  windowStart: number;
}

/**
 * Filter criteria for the message stream.
 */
export interface MessageFilter {
  /** Filter by protocol type */
  protocols: Set<ProtocolType>;
  /** Filter by direction */
  directions: Set<MessageDirection>;
  /** Filter by category */
  categories: Set<MessageCategory>;
  /** Filter by source/destination (substring match) */
  agentFilter: string;
  /** Search in message summary/payload */
  searchQuery: string;
}

/**
 * Complete Protocol Explorer state.
 */
export interface ProtocolExplorerState {
  /** Captured protocol messages (newest first) */
  messages: ProtocolMessage[];
  /** Known Agent Cards */
  agentCards: AgentCard[];
  /** Translation events */
  translations: TranslationEvent[];
  /** Protocol statistics */
  stats: ProtocolStats;
  /** Current message filter */
  filter: MessageFilter;
  /** Currently selected message (for detail view) */
  selectedMessageId: string | null;
  /** Whether capturing is active */
  isCapturing: boolean;
  /** Display mode */
  displayMode: ProtocolExplorerDisplayMode;
  /** Visible panels */
  visiblePanels: Set<ProtocolExplorerPanel>;
  /** Last data update timestamp */
  lastUpdateTimestamp: number;
}

/**
 * Actions available from the useProtocolExplorer hook.
 */
export interface ProtocolExplorerActions {
  /** Push a new message */
  pushMessage: (message: ProtocolMessage) => void;
  /** Push or update an Agent Card */
  updateAgentCard: (card: AgentCard) => void;
  /** Push a translation event */
  pushTranslation: (event: TranslationEvent) => void;
  /** Select a message for detail view */
  selectMessage: (messageId: string | null) => void;
  /** Update message filter */
  setFilter: (filter: Partial<MessageFilter>) => void;
  /** Clear all captured messages */
  clearMessages: () => void;
  /** Toggle capture on/off */
  toggleCapture: () => void;
  /** Set display mode */
  setDisplayMode: (mode: ProtocolExplorerDisplayMode) => void;
  /** Toggle a panel's visibility */
  togglePanel: (panel: ProtocolExplorerPanel) => void;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the Protocol Explorer.
 */
export interface ProtocolExplorerTheme {
  /** Base font family */
  fontFamily: string;
  /** Monospace font family (for payloads) */
  monoFontFamily: string;
  /** Font size scale factor */
  fontScale: number;
  /** Border radius */
  borderRadius: string;
  /** Container background */
  containerBackground: string;
  /** Card background */
  cardBackground: string;
  /** Primary text color */
  textPrimary: string;
  /** Secondary text color */
  textSecondary: string;
  /** Muted text color */
  textMuted: string;
  /** Border color */
  borderColor: string;
  /** MCP protocol color */
  mcpColor: string;
  /** A2A protocol color */
  a2aColor: string;
  /** ACP protocol color */
  acpColor: string;
  /** ANP protocol color */
  anpColor: string;
  /** Inbound message color */
  inboundColor: string;
  /** Outbound message color */
  outboundColor: string;
  /** Error color */
  errorColor: string;
  /** Success color */
  successColor: string;
  /** Accent color */
  accentColor: string;
}

/**
 * Default theme for the Protocol Explorer.
 */
export const DEFAULT_PE_THEME: ProtocolExplorerTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  monoFontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  fontScale: 1.0,
  borderRadius: '8px',
  containerBackground: 'rgba(8, 12, 28, 0.92)',
  cardBackground: 'rgba(16, 20, 44, 0.88)',
  textPrimary: '#e8e8f8',
  textSecondary: '#a0a0c8',
  textMuted: '#7880a8',
  borderColor: 'rgba(48, 52, 80, 0.85)',
  mcpColor: '#3b82f6',
  a2aColor: '#8b5cf6',
  acpColor: '#06b6d4',
  anpColor: '#f97316',
  inboundColor: '#22c55e',
  outboundColor: '#3b82f6',
  errorColor: '#ef4444',
  successColor: '#22c55e',
  accentColor: '#6366f1',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the theme color for a protocol type.
 */
export function getProtocolColor(protocol: ProtocolType, theme: ProtocolExplorerTheme): string {
  switch (protocol) {
    case 'MCP': return theme.mcpColor;
    case 'A2A': return theme.a2aColor;
    case 'ACP': return theme.acpColor;
    case 'ANP': return theme.anpColor;
    default: return theme.textMuted;
  }
}

/**
 * Get the theme color for a message direction.
 */
export function getDirectionColor(direction: MessageDirection, theme: ProtocolExplorerTheme): string {
  return direction === 'inbound' ? theme.inboundColor : theme.outboundColor;
}

/**
 * Format bytes for display.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Format milliseconds for display.
 */
export function formatLatency(ms: number): string {
  if (ms < 0) return '--';
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Create a unique message ID.
 */
export function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create default message filter (all protocols, all directions).
 */
export function createDefaultFilter(): MessageFilter {
  return {
    protocols: new Set<ProtocolType>(['MCP', 'A2A', 'ACP', 'ANP']),
    directions: new Set<MessageDirection>(['inbound', 'outbound']),
    categories: new Set<MessageCategory>(),
    agentFilter: '',
    searchQuery: '',
  };
}

/**
 * Create empty protocol stats.
 */
export function createEmptyStats(): ProtocolStats {
  return {
    totalMessages: 0,
    perProtocol: { MCP: 0, A2A: 0, ACP: 0, ANP: 0 },
    perCategory: {},
    totalTranslations: 0,
    translationSuccessRate: 1.0,
    avgLatency: { MCP: 0, A2A: 0, ACP: 0, ANP: 0 },
    messagesPerSecond: 0,
    totalBytes: 0,
    windowStart: Date.now(),
  };
}

// =============================================================================
// PERFORMANCE BUDGET
// =============================================================================

export const PE_FRAME_BUDGET = {
  /** Maximum render time in ms */
  DASHBOARD_BUDGET_MS: 0.5,
  /** Maximum messages retained */
  MAX_MESSAGES: 500,
  /** Maximum translation events retained */
  MAX_TRANSLATIONS: 200,
  /** Maximum data push rate (Hz) */
  MAX_DATA_PUSH_RATE_HZ: 10,
} as const;
