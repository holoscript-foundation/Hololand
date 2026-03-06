/**
 * @hololand/agents -- W3C DID (Decentralized Identifier) for Cross-Scene Agent Identity
 *
 * Implements W3C DID Core v1.0 compliant identifiers for agents in HoloLand.
 * Each agent gets a persistent DID that follows it across scene transitions,
 * world changes, and platform reconnections.
 *
 * DID Format: did:holo:<agent-id>
 *
 * Features:
 *   - W3C DID Core v1.0 compliant DID Documents
 *   - Ed25519 verification method stubs (real crypto in production)
 *   - Service endpoints for MCP, A2A, and WAL services
 *   - DID resolution with caching
 *   - Cross-scene identity continuity
 *   - Revocation via deactivation flag
 *
 * Architecture:
 *   Agent registers DID once --> DID persists across scenes
 *   Scene A: Agent uses did:holo:brittney --> transitions to Scene B
 *   Scene B: Same did:holo:brittney resolves --> identity preserved
 *
 * @version 1.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * W3C DID Verification Method
 * @see https://www.w3.org/TR/did-core/#verification-methods
 */
export interface DIDVerificationMethod {
  /** Fully qualified ID: did:holo:<id>#key-1 */
  id: string;
  /** The type of verification method */
  type: 'Ed25519VerificationKey2020' | 'JsonWebKey2020' | 'X25519KeyAgreementKey2020';
  /** The DID that controls this method */
  controller: string;
  /** Base58-encoded public key (Ed25519) */
  publicKeyMultibase?: string;
  /** JWK format public key */
  publicKeyJwk?: JsonWebKey;
}

/**
 * JWK (JSON Web Key) representation
 */
export interface JsonWebKey {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  alg?: string;
  use?: string;
  kid?: string;
}

/**
 * W3C DID Service Endpoint
 * @see https://www.w3.org/TR/did-core/#services
 */
export interface DIDServiceEndpoint {
  /** Unique service ID: did:holo:<id>#service-1 */
  id: string;
  /** Service type (MCP, A2A, WAL, etc.) */
  type: string;
  /** Service endpoint URL or object */
  serviceEndpoint: string | Record<string, string>;
  /** Optional description */
  description?: string;
}

/**
 * W3C DID Document
 * @see https://www.w3.org/TR/did-core/#did-document-properties
 */
export interface DIDDocument {
  /** JSON-LD context */
  '@context': string[];
  /** The DID subject: did:holo:<agent-id> */
  id: string;
  /** Optional controller DIDs */
  controller?: string | string[];
  /** Verification methods (public keys) */
  verificationMethod?: DIDVerificationMethod[];
  /** Authentication verification methods */
  authentication?: (string | DIDVerificationMethod)[];
  /** Assertion verification methods */
  assertionMethod?: (string | DIDVerificationMethod)[];
  /** Key agreement verification methods */
  keyAgreement?: (string | DIDVerificationMethod)[];
  /** Service endpoints */
  service?: DIDServiceEndpoint[];
  /** When the DID was created */
  created?: string;
  /** When the DID was last updated */
  updated?: string;
  /** Whether the DID has been deactivated (revoked) */
  deactivated?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * DID Resolution result
 * @see https://www.w3.org/TR/did-core/#did-resolution
 */
export interface DIDResolutionResult {
  /** The resolved DID Document (null if not found) */
  didDocument: DIDDocument | null;
  /** Resolution metadata */
  didResolutionMetadata: {
    /** Content type */
    contentType?: string;
    /** Error code (if resolution failed) */
    error?: 'notFound' | 'invalidDid' | 'deactivated' | 'internalError';
    /** Duration of resolution in ms */
    duration?: number;
  };
  /** DID Document metadata */
  didDocumentMetadata: {
    /** When the DID was created */
    created?: string;
    /** When the DID was last updated */
    updated?: string;
    /** Whether the DID is deactivated */
    deactivated?: boolean;
    /** Next version DID (for key rotation) */
    nextUpdate?: string;
    /** Version ID */
    versionId?: string;
  };
}

/**
 * Agent DID registration options
 */
export interface AgentDIDOptions {
  /** Agent ID (used to generate did:holo:<agentId>) */
  agentId: string;
  /** Agent display name */
  name?: string;
  /** Agent role */
  role?: string;
  /** Agent capabilities for service discovery */
  capabilities?: string[];
  /** Optional controller DID(s) */
  controller?: string | string[];
  /** Optional service endpoints to register */
  services?: DIDServiceEndpoint[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * DID Registry metrics
 */
export interface DIDRegistryMetrics {
  /** Total DIDs registered */
  totalRegistered: number;
  /** Active (non-deactivated) DIDs */
  activeDIDs: number;
  /** Deactivated DIDs */
  deactivatedDIDs: number;
  /** Total resolutions performed */
  totalResolutions: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  /** Average resolution time in ms */
  avgResolutionTime: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** DID method name for HoloLand */
export const DID_METHOD = 'holo';

/** DID method prefix */
export const DID_PREFIX = `did:${DID_METHOD}:`;

/** W3C DID Core JSON-LD context */
export const DID_CONTEXT = [
  'https://www.w3.org/ns/did/v1',
  'https://w3id.org/security/suites/ed25519-2020/v1',
];

/** Maximum cached DID resolution results */
const MAX_CACHE_SIZE = 1000;

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 300_000;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a DID string from an agent ID.
 *
 * @param agentId - The agent identifier
 * @returns The DID string: did:holo:<agentId>
 */
export function createDID(agentId: string): string {
  return `${DID_PREFIX}${agentId}`;
}

/**
 * Parse a DID string and extract the agent ID.
 *
 * @param did - The DID string
 * @returns The agent ID, or null if the DID is invalid
 */
export function parseDID(did: string): string | null {
  if (!did.startsWith(DID_PREFIX)) {
    return null;
  }
  const agentId = did.slice(DID_PREFIX.length);
  if (agentId.length === 0) {
    return null;
  }
  return agentId;
}

/**
 * Validate a DID string format.
 *
 * @param did - The DID to validate
 * @returns true if the DID is a valid did:holo: identifier
 */
export function isValidDID(did: string): boolean {
  return parseDID(did) !== null;
}

/**
 * Generate a pseudo-random multibase key (z-prefix Base58btc).
 * In production, this would use actual Ed25519 key generation.
 */
function generateMultibaseKey(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let key = 'z'; // multibase prefix for base58btc
  for (let i = 0; i < 44; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// =============================================================================
// DID DOCUMENT FACTORY
// =============================================================================

/**
 * Create a W3C DID Document for an agent.
 *
 * @param options - Agent DID registration options
 * @returns A fully formed DID Document
 */
export function createDIDDocument(options: AgentDIDOptions): DIDDocument {
  const did = createDID(options.agentId);
  const now = new Date().toISOString();

  // Primary verification method
  const primaryKey: DIDVerificationMethod = {
    id: `${did}#key-1`,
    type: 'Ed25519VerificationKey2020',
    controller: did,
    publicKeyMultibase: generateMultibaseKey(),
  };

  // Key agreement method (for encrypted DID Comm)
  const keyAgreement: DIDVerificationMethod = {
    id: `${did}#key-agreement-1`,
    type: 'X25519KeyAgreementKey2020',
    controller: did,
    publicKeyMultibase: generateMultibaseKey(),
  };

  // Default services
  const services: DIDServiceEndpoint[] = [
    {
      id: `${did}#agent-profile`,
      type: 'AgentProfile',
      serviceEndpoint: `https://hololand.io/agents/${options.agentId}`,
      description: `Profile for agent ${options.name ?? options.agentId}`,
    },
  ];

  // Add capability services
  if (options.capabilities && options.capabilities.length > 0) {
    services.push({
      id: `${did}#capabilities`,
      type: 'AgentCapabilities',
      serviceEndpoint: {
        capabilities: options.capabilities.join(','),
        role: options.role ?? 'agent',
      } as unknown as string,
    });
  }

  // Add custom services
  if (options.services) {
    services.push(...options.services);
  }

  const doc: DIDDocument = {
    '@context': DID_CONTEXT,
    id: did,
    verificationMethod: [primaryKey, keyAgreement],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
    keyAgreement: [`${did}#key-agreement-1`],
    service: services,
    created: now,
    updated: now,
    deactivated: false,
    metadata: {
      name: options.name ?? options.agentId,
      role: options.role ?? 'agent',
      ...options.metadata,
    },
  };

  if (options.controller) {
    doc.controller = options.controller;
  }

  return doc;
}

// =============================================================================
// DID REGISTRY (IN-MEMORY, CROSS-SCENE)
// =============================================================================

interface CacheEntry {
  result: DIDResolutionResult;
  timestamp: number;
}

/**
 * In-memory DID Registry for cross-scene agent identity persistence.
 *
 * This registry lives for the lifetime of the platform session.
 * Agents register their DID once and it persists across scene transitions.
 *
 * Thread safety: Single-threaded (JS event loop), no lock needed.
 * Memory: O(n) where n = number of registered agents. Bounded by MAX_CACHE_SIZE.
 */
export class AgentDIDRegistry {
  private documents: Map<string, DIDDocument> = new Map();
  private resolutionCache: Map<string, CacheEntry> = new Map();

  // Metrics
  private totalResolutions: number = 0;
  private cacheHits: number = 0;
  private resolutionTimes: number[] = [];
  private readonly MAX_RESOLUTION_HISTORY = 100;

  // =========================================================================
  // Registration
  // =========================================================================

  /**
   * Register a new agent DID.
   * If the agent already has a DID, updates the existing document.
   *
   * @param options - Agent DID registration options
   * @returns The created DID Document
   */
  register(options: AgentDIDOptions): DIDDocument {
    const did = createDID(options.agentId);
    const existing = this.documents.get(did);

    if (existing && !existing.deactivated) {
      // Update existing document
      existing.updated = new Date().toISOString();
      if (options.metadata) {
        existing.metadata = { ...existing.metadata, ...options.metadata };
      }
      if (options.services) {
        existing.service = [...(existing.service ?? []), ...options.services];
      }
      this.invalidateCache(did);
      return existing;
    }

    const doc = createDIDDocument(options);
    this.documents.set(did, doc);
    this.invalidateCache(did);
    return doc;
  }

  /**
   * Deactivate (revoke) a DID. The document remains but is marked deactivated.
   *
   * @param did - The DID to deactivate
   * @returns true if deactivated, false if not found
   */
  deactivate(did: string): boolean {
    const doc = this.documents.get(did);
    if (!doc) return false;

    doc.deactivated = true;
    doc.updated = new Date().toISOString();
    this.invalidateCache(did);
    return true;
  }

  /**
   * Reactivate a previously deactivated DID.
   *
   * @param did - The DID to reactivate
   * @returns true if reactivated, false if not found
   */
  reactivate(did: string): boolean {
    const doc = this.documents.get(did);
    if (!doc) return false;

    doc.deactivated = false;
    doc.updated = new Date().toISOString();
    this.invalidateCache(did);
    return true;
  }

  /**
   * Remove a DID entirely from the registry.
   *
   * @param did - The DID to remove
   * @returns true if removed, false if not found
   */
  remove(did: string): boolean {
    const result = this.documents.delete(did);
    this.invalidateCache(did);
    return result;
  }

  // =========================================================================
  // Resolution
  // =========================================================================

  /**
   * Resolve a DID to its DID Document.
   *
   * Implements W3C DID Resolution algorithm:
   * 1. Parse the DID
   * 2. Look up in registry
   * 3. Return DID Document with resolution metadata
   *
   * @param did - The DID to resolve
   * @returns DID Resolution result
   */
  resolve(did: string): DIDResolutionResult {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.totalResolutions++;

    // Check cache first
    const cached = this.resolutionCache.get(did);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      this.cacheHits++;
      this.recordResolutionTime(startTime);
      return cached.result;
    }

    // Validate DID format
    const agentId = parseDID(did);
    if (!agentId) {
      const result: DIDResolutionResult = {
        didDocument: null,
        didResolutionMetadata: {
          error: 'invalidDid',
          contentType: 'application/did+ld+json',
        },
        didDocumentMetadata: {},
      };
      this.recordResolutionTime(startTime);
      return result;
    }

    // Look up document
    const doc = this.documents.get(did);
    if (!doc) {
      const result: DIDResolutionResult = {
        didDocument: null,
        didResolutionMetadata: {
          error: 'notFound',
          contentType: 'application/did+ld+json',
        },
        didDocumentMetadata: {},
      };
      this.cacheResult(did, result);
      this.recordResolutionTime(startTime);
      return result;
    }

    // Check deactivation
    if (doc.deactivated) {
      const result: DIDResolutionResult = {
        didDocument: doc,
        didResolutionMetadata: {
          error: 'deactivated',
          contentType: 'application/did+ld+json',
        },
        didDocumentMetadata: {
          created: doc.created,
          updated: doc.updated,
          deactivated: true,
        },
      };
      this.cacheResult(did, result);
      this.recordResolutionTime(startTime);
      return result;
    }

    // Successful resolution
    const result: DIDResolutionResult = {
      didDocument: doc,
      didResolutionMetadata: {
        contentType: 'application/did+ld+json',
      },
      didDocumentMetadata: {
        created: doc.created,
        updated: doc.updated,
        deactivated: false,
      },
    };
    this.cacheResult(did, result);
    this.recordResolutionTime(startTime);
    return result;
  }

  /**
   * Resolve by agent ID (convenience).
   *
   * @param agentId - The agent identifier
   * @returns DID Resolution result
   */
  resolveByAgentId(agentId: string): DIDResolutionResult {
    return this.resolve(createDID(agentId));
  }

  // =========================================================================
  // Query
  // =========================================================================

  /**
   * Get all registered DID Documents.
   *
   * @param includeDeactivated - Whether to include deactivated DIDs
   * @returns Array of DID Documents
   */
  listAll(includeDeactivated = false): DIDDocument[] {
    const docs = Array.from(this.documents.values());
    if (includeDeactivated) return docs;
    return docs.filter(d => !d.deactivated);
  }

  /**
   * Find agents by role.
   *
   * @param role - The role to search for
   * @returns Array of matching DID Documents
   */
  findByRole(role: string): DIDDocument[] {
    return this.listAll().filter(d =>
      d.metadata?.role === role
    );
  }

  /**
   * Find agents by capability.
   *
   * @param capability - The capability to search for
   * @returns Array of matching DID Documents
   */
  findByCapability(capability: string): DIDDocument[] {
    return this.listAll().filter(doc => {
      const capService = doc.service?.find(s => s.type === 'AgentCapabilities');
      if (!capService) return false;
      const endpoint = capService.serviceEndpoint;
      if (typeof endpoint === 'string') return endpoint.includes(capability);
      return endpoint?.capabilities?.includes(capability) ?? false;
    });
  }

  /**
   * Check if a DID exists and is active.
   *
   * @param did - The DID to check
   * @returns true if the DID exists and is not deactivated
   */
  isActive(did: string): boolean {
    const doc = this.documents.get(did);
    return doc !== undefined && !doc.deactivated;
  }

  /**
   * Get the total number of registered DIDs.
   */
  get size(): number {
    return this.documents.size;
  }

  // =========================================================================
  // Service Management
  // =========================================================================

  /**
   * Add a service endpoint to an existing DID Document.
   *
   * @param did - The DID to add the service to
   * @param service - The service endpoint to add
   * @returns true if added, false if DID not found
   */
  addService(did: string, service: DIDServiceEndpoint): boolean {
    const doc = this.documents.get(did);
    if (!doc || doc.deactivated) return false;

    if (!doc.service) {
      doc.service = [];
    }

    // Avoid duplicates
    const existing = doc.service.find(s => s.id === service.id);
    if (existing) {
      Object.assign(existing, service);
    } else {
      doc.service.push(service);
    }

    doc.updated = new Date().toISOString();
    this.invalidateCache(did);
    return true;
  }

  /**
   * Remove a service endpoint from a DID Document.
   *
   * @param did - The DID
   * @param serviceId - The service ID to remove
   * @returns true if removed, false if not found
   */
  removeService(did: string, serviceId: string): boolean {
    const doc = this.documents.get(did);
    if (!doc || !doc.service) return false;

    const idx = doc.service.findIndex(s => s.id === serviceId);
    if (idx === -1) return false;

    doc.service.splice(idx, 1);
    doc.updated = new Date().toISOString();
    this.invalidateCache(did);
    return true;
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Get registry metrics.
   */
  getMetrics(): DIDRegistryMetrics {
    const all = Array.from(this.documents.values());
    const active = all.filter(d => !d.deactivated).length;
    const deactivated = all.length - active;

    let avgTime = 0;
    if (this.resolutionTimes.length > 0) {
      avgTime = this.resolutionTimes.reduce((a, b) => a + b, 0) / this.resolutionTimes.length;
    }

    return {
      totalRegistered: all.length,
      activeDIDs: active,
      deactivatedDIDs: deactivated,
      totalResolutions: this.totalResolutions,
      cacheHitRate: this.totalResolutions > 0
        ? Math.round((this.cacheHits / this.totalResolutions) * 1000) / 1000
        : 0,
      avgResolutionTime: Math.round(avgTime * 1000) / 1000,
    };
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Clear all state. Use for testing or shutdown.
   */
  destroy(): void {
    this.documents.clear();
    this.resolutionCache.clear();
    this.totalResolutions = 0;
    this.cacheHits = 0;
    this.resolutionTimes = [];
  }

  // =========================================================================
  // Internals
  // =========================================================================

  private invalidateCache(did: string): void {
    this.resolutionCache.delete(did);
  }

  private cacheResult(did: string, result: DIDResolutionResult): void {
    // Enforce cache size limit
    if (this.resolutionCache.size >= MAX_CACHE_SIZE) {
      // Evict oldest entry
      const oldest = this.resolutionCache.keys().next().value;
      if (oldest) {
        this.resolutionCache.delete(oldest);
      }
    }
    this.resolutionCache.set(did, { result, timestamp: Date.now() });
  }

  private recordResolutionTime(startTime: number): void {
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    this.resolutionTimes.push(duration);
    if (this.resolutionTimes.length > this.MAX_RESOLUTION_HISTORY) {
      this.resolutionTimes.shift();
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let _registry: AgentDIDRegistry | null = null;

/**
 * Get the singleton AgentDIDRegistry instance.
 */
export function getAgentDIDRegistry(): AgentDIDRegistry {
  if (!_registry) {
    _registry = new AgentDIDRegistry();
  }
  return _registry;
}

/**
 * Reset the registry (for testing).
 */
export function resetAgentDIDRegistry(): void {
  if (_registry) {
    _registry.destroy();
    _registry = null;
  }
}
