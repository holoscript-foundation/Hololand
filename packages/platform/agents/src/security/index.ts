/**
 * Multi-Agent Security Framework
 *
 * Security infrastructure for VR multi-agent collaboration:
 * - mTLS between all agents in world creation scenarios
 * - Memory-poisoning canaries in staging
 * - Conversation-level jailbreak scanners in CI/CD
 * - Zero Trust for non-human identities
 *
 * @module security
 */

// Core framework
export { SecurityFramework } from './SecurityFramework';

// Jailbreak scanner
export { JailbreakScanner, getDefaultJailbreakPatterns } from './JailbreakScanner';

// Types
export type {
  // Agent identity
  AgentIdentity,
  AgentType,
  AgentRole,
  // mTLS
  MTLSConfig,
  AgentCertificate,
  CertificateValidationResult,
  // Memory canaries
  MemoryCanary,
  CanaryLocation,
  CanaryTriggerType,
  CanaryTripEvent,
  // Jailbreak
  JailbreakScanConfig,
  JailbreakPattern,
  JailbreakCategory,
  JailbreakScanResult,
  // Zero Trust
  ZeroTrustPolicy,
  PolicySubject,
  PolicyResource,
  PolicyCondition,
  AccessDecision,
  // Events
  SecurityEventMap,
  SecurityEventType,
  SecurityEventHandler,
  // Config
  SecurityFrameworkConfig,
} from './types';
