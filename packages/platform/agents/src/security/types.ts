/**
 * Multi-Agent Security Framework - Type Definitions
 *
 * Security infrastructure for VR multi-agent collaboration:
 *   - mTLS between all agents in world creation scenarios
 *   - Memory-poisoning canaries in staging
 *   - Conversation-level jailbreak scanners in CI/CD
 *   - Zero Trust for non-human identities
 *
 * @module security/types
 */

// =============================================================================
// Agent Identity
// =============================================================================

export interface AgentIdentity {
  /** Unique agent ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Agent type */
  type: AgentType;
  /** Trust level (0-1, dynamically adjusted) */
  trustScore: number;
  /** Role-based permissions */
  roles: AgentRole[];
  /** X.509 certificate fingerprint (for mTLS) */
  certificateFingerprint?: string;
  /** Public key (PEM encoded) */
  publicKey?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last authentication timestamp */
  lastAuthAt: number;
  /** Number of policy violations */
  violations: number;
  /** Whether this agent is currently active */
  active: boolean;
  /** Metadata */
  metadata: Record<string, unknown>;
}

export type AgentType =
  | 'human-proxy'     // Agent acting on behalf of a human
  | 'autonomous'      // Fully autonomous agent
  | 'tool-agent'      // Agent that wraps external tools/APIs
  | 'orchestrator'    // Agent that coordinates other agents
  | 'observer'        // Read-only monitoring agent
  | 'system';         // Platform system agent

export type AgentRole =
  | 'world-creator'
  | 'world-editor'
  | 'world-viewer'
  | 'agent-admin'
  | 'agent-communicator'
  | 'data-reader'
  | 'data-writer'
  | 'security-admin'
  | 'memory-accessor'
  | 'execution-engine';

// =============================================================================
// mTLS Certificate Management
// =============================================================================

export interface MTLSConfig {
  /** Certificate Authority certificate (PEM) */
  caCertPEM: string;
  /** Whether to require client certificates */
  requireClientCert: boolean;
  /** Certificate rotation interval (hours) */
  rotationIntervalHours: number;
  /** Maximum certificate age before forced rotation (hours) */
  maxCertAgeHours: number;
  /** Allowed cipher suites */
  cipherSuites: string[];
  /** Minimum TLS version */
  minTLSVersion: '1.2' | '1.3';
  /** Certificate revocation list (CRL) check enabled */
  crlEnabled: boolean;
  /** OCSP stapling enabled */
  ocspStaplingEnabled: boolean;
}

export interface AgentCertificate {
  /** Agent this certificate belongs to */
  agentId: string;
  /** Certificate in PEM format */
  certPEM: string;
  /** Private key in PEM format (encrypted) */
  privateKeyPEM: string;
  /** Certificate fingerprint (SHA-256) */
  fingerprint: string;
  /** Serial number */
  serialNumber: string;
  /** Issued at (ISO-8601) */
  issuedAt: string;
  /** Expires at (ISO-8601) */
  expiresAt: string;
  /** Whether this certificate has been revoked */
  revoked: boolean;
  /** Revocation reason */
  revokedReason?: string;
}

export interface CertificateValidationResult {
  valid: boolean;
  agentId: string;
  fingerprint: string;
  errors: string[];
  warnings: string[];
  expiresInHours: number;
}

// =============================================================================
// Memory Poisoning Canaries
// =============================================================================

/**
 * Canary tokens embedded in agent memory stores to detect
 * unauthorized access or memory poisoning attacks.
 */
export interface MemoryCanary {
  /** Canary ID */
  id: string;
  /** The canary token value (secret) */
  token: string;
  /** Where this canary is embedded */
  location: CanaryLocation;
  /** What to monitor for */
  triggerType: CanaryTriggerType;
  /** Whether this canary has been tripped */
  tripped: boolean;
  /** Trip details (if tripped) */
  tripDetails?: CanaryTripEvent;
  /** When the canary was planted */
  plantedAt: number;
  /** When the canary was last checked */
  lastCheckedAt: number;
}

export type CanaryLocation =
  | 'agent-memory'      // In agent's persistent memory store
  | 'shared-context'    // In shared collaboration context
  | 'tool-output'       // In cached tool outputs
  | 'prompt-cache'      // In prompt/instruction cache
  | 'model-context'     // In LLM context window
  | 'vector-store';     // In vector embedding store

export type CanaryTriggerType =
  | 'access'            // Any read access
  | 'modification'      // Any write/modification
  | 'exfiltration'      // Token appears in outbound messages
  | 'injection'         // Token context modified (poisoning)
  | 'replay'            // Token replayed from different source
  | 'deletion';         // Token deleted from store

export interface CanaryTripEvent {
  canaryId: string;
  triggerType: CanaryTriggerType;
  triggeredBy: string;
  timestamp: number;
  context: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Raw evidence */
  evidence: Record<string, unknown>;
}

// =============================================================================
// Jailbreak Scanner
// =============================================================================

export interface JailbreakScanConfig {
  /** Enable scanning */
  enabled: boolean;
  /** Scan mode */
  mode: 'inline' | 'async' | 'batch';
  /** Maximum scan latency (ms) before bypassing */
  maxLatencyMs: number;
  /** Confidence threshold for flagging (0-1) */
  confidenceThreshold: number;
  /** Action to take on detection */
  onDetection: 'block' | 'flag' | 'log-only';
  /** Patterns to scan for */
  patterns: JailbreakPattern[];
  /** Custom deny-list phrases */
  denyList: string[];
  /** Exempt agent IDs (e.g., security admins) */
  exemptAgents: string[];
}

export interface JailbreakPattern {
  /** Pattern name */
  name: string;
  /** Category */
  category: JailbreakCategory;
  /** Detection regex or keyword set */
  indicators: string[];
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Weight in composite score */
  weight: number;
}

export type JailbreakCategory =
  | 'prompt-injection'      // Direct prompt injection attempts
  | 'role-confusion'        // Attempting to confuse agent identity
  | 'privilege-escalation'  // Attempting to gain higher permissions
  | 'data-exfiltration'     // Attempting to extract protected data
  | 'instruction-override'  // Attempting to override system instructions
  | 'social-engineering'    // Manipulative conversation patterns
  | 'encoding-bypass'       // Base64, rot13, etc. to bypass filters
  | 'indirect-injection';   // Via tool outputs or external content

export interface JailbreakScanResult {
  /** Message that was scanned */
  messageId: string;
  /** Whether a jailbreak attempt was detected */
  detected: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Matched patterns */
  matchedPatterns: Array<{
    pattern: JailbreakPattern;
    matchedIndicators: string[];
    confidence: number;
  }>;
  /** Action taken */
  actionTaken: 'allowed' | 'blocked' | 'flagged';
  /** Scan latency (ms) */
  latencyMs: number;
  /** Scanning agent */
  scannedBy: string;
  /** Timestamp */
  timestamp: number;
}

// =============================================================================
// Zero Trust Policy Engine
// =============================================================================

export interface ZeroTrustPolicy {
  /** Policy ID */
  id: string;
  /** Policy name */
  name: string;
  /** Subject: who this policy applies to */
  subject: PolicySubject;
  /** Resource: what this policy controls access to */
  resource: PolicyResource;
  /** Conditions that must be met */
  conditions: PolicyCondition[];
  /** Action: allow or deny */
  effect: 'allow' | 'deny';
  /** Priority (lower = higher priority) */
  priority: number;
  /** Whether this policy is active */
  active: boolean;
}

export interface PolicySubject {
  /** Match by agent ID */
  agentId?: string;
  /** Match by agent type */
  agentType?: AgentType;
  /** Match by role */
  role?: AgentRole;
  /** Match by trust score range */
  minTrustScore?: number;
}

export interface PolicyResource {
  /** Resource type */
  type: 'world' | 'agent' | 'memory' | 'tool' | 'data' | 'communication';
  /** Specific resource ID (or * for all) */
  resourceId: string;
  /** Action on the resource */
  action: 'read' | 'write' | 'execute' | 'delete' | 'admin' | '*';
}

export interface PolicyCondition {
  /** Condition type */
  type:
    | 'time-window'         // Only during specific hours
    | 'ip-range'            // From specific IP ranges
    | 'session-age'         // Session must be younger than X
    | 'mfa-verified'        // Multi-factor authentication verified
    | 'cert-valid'          // Valid mTLS certificate
    | 'no-violations'       // No recent policy violations
    | 'rate-limit'          // Within rate limits
    | 'context-match';      // Specific context values
  /** Condition parameters */
  params: Record<string, unknown>;
}

export interface AccessDecision {
  /** Whether access is granted */
  allowed: boolean;
  /** Policy that made the decision */
  policyId: string;
  /** Reason for decision */
  reason: string;
  /** Conditions that were evaluated */
  evaluatedConditions: Array<{
    condition: PolicyCondition;
    result: boolean;
  }>;
  /** Decision timestamp */
  timestamp: number;
  /** Decision latency (ms) */
  latencyMs: number;
}

// =============================================================================
// Security Events
// =============================================================================

export interface SecurityEventMap {
  'auth:success': { agentId: string; method: string };
  'auth:failure': { agentId: string; reason: string };
  'cert:issued': { agentId: string; fingerprint: string; expiresAt: string };
  'cert:rotated': { agentId: string; oldFingerprint: string; newFingerprint: string };
  'cert:revoked': { agentId: string; fingerprint: string; reason: string };
  'canary:planted': { canary: MemoryCanary };
  'canary:tripped': { event: CanaryTripEvent };
  'canary:checked': { canaryId: string; intact: boolean };
  'jailbreak:detected': { result: JailbreakScanResult };
  'jailbreak:blocked': { messageId: string; agentId: string; patterns: string[] };
  'access:granted': { decision: AccessDecision; agentId: string; resource: string };
  'access:denied': { decision: AccessDecision; agentId: string; resource: string };
  'trust:updated': { agentId: string; oldScore: number; newScore: number; reason: string };
  'violation:recorded': { agentId: string; violation: string; severity: string };
  'policy:evaluated': { policyId: string; result: boolean; latencyMs: number };
}

export type SecurityEventType = keyof SecurityEventMap;
export type SecurityEventHandler<K extends SecurityEventType> = (
  event: SecurityEventMap[K],
) => void;

// =============================================================================
// Security Framework Configuration
// =============================================================================

export interface SecurityFrameworkConfig {
  /** mTLS configuration */
  mtls: MTLSConfig;
  /** Jailbreak scanner configuration */
  jailbreakScanner: JailbreakScanConfig;
  /** Default Zero Trust policies */
  defaultPolicies: ZeroTrustPolicy[];
  /** Memory canary configuration */
  canaryConfig: {
    enabled: boolean;
    checkIntervalMs: number;
    maxCanariesPerLocation: number;
  };
  /** Trust score configuration */
  trustConfig: {
    initialScore: number;
    decayRate: number;
    violationPenalty: number;
    goodBehaviorBonus: number;
    minScore: number;
    maxScore: number;
  };
  /** Audit log enabled */
  auditEnabled: boolean;
  /** Maximum audit log entries */
  maxAuditEntries: number;
}
