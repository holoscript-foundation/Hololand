/**
 * A2A (Agent-to-Agent) Protocol Type Definitions
 *
 * Based on the A2A Protocol Specification:
 * https://a2a-protocol.org/latest/specification/
 *
 * These types model the AgentCard and related objects used for
 * agent discovery, capability advertisement, and interoperability.
 */

// --- Core Agent Card ---

export interface AgentCard {
  /** Unique identifier for the agent */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** Description of the agent's purpose and capabilities */
  description: string;
  /** Service endpoint URL where the agent can be reached */
  url: string;
  /** Version of the agent card */
  version: string;
  /** Provider organization information */
  provider: AgentProvider;
  /** List of skills the agent can perform */
  skills: AgentSkill[];
  /** Supported protocol capabilities */
  capabilities: AgentCapabilities;
  /** Security scheme definitions */
  securitySchemes?: Record<string, SecurityScheme>;
  /** Required security scheme references */
  security?: string[];
  /** Protocol interfaces supported */
  interfaces?: AgentInterface[];
  /** Extension declarations */
  extensions?: AgentExtension[];
  /** Digital signature for card verification */
  signature?: AgentCardSignature;
}

// --- Provider ---

export interface AgentProvider {
  /** Organization name */
  name: string;
  /** Organization website URL */
  url?: string;
  /** Support contact email */
  contactEmail?: string;
}

// --- Skills ---

export interface AgentSkill {
  /** Skill identifier/name */
  name: string;
  /** Human-readable description of the skill */
  description: string;
  /** JSON Schema defining expected input */
  inputSchema?: Record<string, unknown>;
  /** JSON Schema defining output format */
  outputSchema?: Record<string, unknown>;
  /** Supported MIME content types */
  contentTypes?: string[];
}

// --- Capabilities ---

export interface AgentCapabilities {
  /** Whether the agent supports real-time streaming responses */
  streaming: boolean;
  /** Whether the agent supports webhook-based push notifications */
  pushNotifications: boolean;
  /** Whether the agent provides an extended card behind authentication */
  extendedAgentCard: boolean;
}

// --- Security ---

export interface SecurityScheme {
  /** The type of security scheme (e.g., "oauth2", "apiKey", "http") */
  type: string;
  /** Optional human-readable description */
  description?: string;
  /** For apiKey: location of the key (header, query, cookie) */
  in?: string;
  /** For apiKey: name of the header/query parameter */
  name?: string;
  /** For http: authentication scheme (e.g., "bearer") */
  scheme?: string;
}

// --- Interfaces ---

export interface AgentInterface {
  /** Protocol type (e.g., "jsonrpc", "grpc") */
  type: string;
  /** URL for this interface */
  url?: string;
}

// --- Extensions ---

export interface AgentExtension {
  /** Extension URI identifier */
  uri: string;
  /** Human-readable extension description */
  description?: string;
  /** Extension-specific configuration */
  config?: Record<string, unknown>;
}

// --- Signature ---

export interface AgentCardSignature {
  /** The JWS signature value */
  value: string;
  /** Signing algorithm used */
  algorithm?: string;
  /** Key identifier */
  keyId?: string;
}

// --- UI-specific types for the discovery browser ---

export type CapabilityFilter = 'streaming' | 'pushNotifications' | 'extendedAgentCard';

export type SortField = 'name' | 'provider' | 'skills' | 'version';
export type SortDirection = 'asc' | 'desc';

export interface BrowserFilters {
  search: string;
  capabilities: CapabilityFilter[];
  providers: string[];
  securityTypes: string[];
  sortField: SortField;
  sortDirection: SortDirection;
}

export interface AgentCardWithStatus extends AgentCard {
  /** Whether the agent endpoint is reachable */
  status: 'online' | 'offline' | 'unknown';
  /** Last time the agent was checked */
  lastChecked?: string;
  /** Tags for categorization in the UI */
  tags?: string[];
}
