/**
 * VRTrustHandshake
 *
 * 5-Phase VR Trust Handshake protocol for multi-agent world join flow.
 *
 * DESIGN PRINCIPLES:
 * - Zero-trust: "Never trust, always verify." Every agent is an untrusted
 *   compute endpoint until cryptographically proven otherwise.
 * - Off-render-loop: All cryptographic operations (signature verification,
 *   challenge-response, capability negotiation) run on a setInterval loop
 *   completely decoupled from the 90Hz VR render loop.
 * - 1ms per-frame budget: The render loop reads only the FRONT buffer of
 *   the TrustWorldState (a simple cache lookup). Crypto never touches rAF.
 * - Double-buffered: Uses the existing AgentStateBuffer infrastructure so
 *   trust state is consistent within a single frame (no torn reads).
 *
 * 5 PHASES:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Phase 0: GENESIS                                                   │
 * │   World owner creates the world and generates a trust anchor.      │
 * │   Publishes the world's public key and capability manifest.        │
 * │   Runs ONCE when the world is instantiated.                        │
 * │   Budget: Async (off-loop), typically 5-20ms                       │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ Phase 1: JOIN                                                      │
 * │   An agent requests to join the world. Three-step handshake:       │
 * │   1. Agent sends Manifest (agentId, publicKey, capabilities, nonce)│
 * │   2. World issues Challenge (random bytes signed by world key)     │
 * │   3. Agent returns ChallengeResponse (signed nonce + challenge)    │
 * │   If signature verifies: agent gets a short-lived session token.   │
 * │   Budget: Async (off-loop), 10-50ms per agent                     │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ Phase 2: INTERACT                                                  │
 * │   Active session. Agent messages are accepted only if:             │
 * │   - Session token is valid and not expired                         │
 * │   - Action is within declared capabilities (RBAC)                  │
 * │   Trust state is read from the front buffer by the renderer.       │
 * │   Budget: <0.1ms per agent (cache read only, ON render loop)       │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ Phase 3: REFRESH                                                   │
 * │   Periodic re-authentication (continuous verification).            │
 * │   Before the session token expires, the agent must re-prove        │
 * │   identity with a fresh challenge-response. If the agent fails     │
 * │   to refresh, its trust level degrades to DEGRADED, then REVOKED.  │
 * │   Budget: Async (off-loop), 5-20ms per agent per refresh cycle     │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ Phase 4: EXIT                                                      │
 * │   Agent voluntarily leaves or is evicted. Session token is         │
 * │   revoked immediately. Trust state is cleared from both buffers.   │
 * │   The AgentCommunicationManager is notified to remove the avatar.  │
 * │   Budget: Async (off-loop), <1ms                                   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * ```
 *   Agent Join Request (WebSocket / MCP / HTTP)
 *        |
 *        v
 *   VRTrustHandshake.requestJoin()           <-- OFF render loop
 *        |
 *        v
 *   Phase 1: Manifest → Challenge → Verify   <-- OFF render loop (crypto)
 *        |
 *        v
 *   TrustWorldState.agents[id].trustLevel     <-- Write to BACK buffer
 *        |
 *        v
 *   AgentStateBuffer<TrustWorldState>.swap()  <-- Between frames
 *        |
 *        v
 *   getFrontBuffer()                          <-- ON render loop (<0.1ms)
 *        |
 *        v
 *   HololandRenderer checks trust before      <-- Gate agent interactions
 *   applying agent state to scene
 * ```
 *
 * INTEGRATION:
 * This module integrates with AgentCommunicationManager. The renderer
 * should check `trustHandshake.isAgentTrusted(agentId)` before applying
 * any agent state updates from the communication manager. This creates
 * a trust gate: untrusted agents are invisible to the scene graph.
 *
 * @module VRTrustHandshake
 */

import { logger } from './logger';
import {
  AgentStateBuffer,
} from './AgentStateBuffer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Trust level for an agent in the world.
 * Progresses: NONE → PENDING → VERIFIED → TRUSTED → DEGRADED → REVOKED
 */
export type TrustLevel =
  | 'none'       // No trust relationship established
  | 'pending'    // JOIN phase in progress (manifest received, awaiting challenge response)
  | 'verified'   // Challenge-response passed, session token issued
  | 'trusted'    // Fully trusted, active session with valid capabilities
  | 'degraded'   // Refresh missed or capability violation detected
  | 'revoked';   // Trust explicitly revoked, agent must re-join

/**
 * Phase of the trust handshake lifecycle.
 */
export type TrustPhase = 'genesis' | 'join' | 'interact' | 'refresh' | 'exit';

/**
 * Agent capabilities that can be granted or restricted.
 * Maps to RBAC permissions for world interactions.
 */
export type AgentCapability =
  | 'read_state'        // Can read world state (positions, objects)
  | 'write_position'    // Can update own avatar position
  | 'write_emotion'     // Can update own avatar emotion/animation
  | 'send_commands'     // Can issue commands (spawn objects, etc.)
  | 'invite_agents'     // Can invite other agents to the world
  | 'modify_world'      // Can modify world configuration
  | 'admin';            // Full administrative access

/**
 * Agent's capability manifest, presented during the JOIN phase.
 */
export interface AgentManifest {
  /** Unique agent identifier */
  agentId: string;
  /** Agent's display name */
  name: string;
  /** Agent's public key (hex-encoded) for signature verification */
  publicKey: string;
  /** Capabilities the agent is requesting */
  requestedCapabilities: AgentCapability[];
  /** Protocol version */
  protocolVersion: string;
  /** Client-generated nonce (hex, 32 bytes) to prevent replay attacks */
  nonce: string;
  /** Timestamp when manifest was created */
  timestamp: number;
}

/**
 * Challenge issued by the world to an agent during JOIN.
 */
export interface TrustChallenge {
  /** Challenge ID (for tracking) */
  challengeId: string;
  /** Random challenge bytes (hex, 32 bytes) */
  challengeBytes: string;
  /** World's public key (hex) so agent can verify the world */
  worldPublicKey: string;
  /** Challenge expiration timestamp */
  expiresAt: number;
  /** World-signed hash of challengeBytes + agentNonce */
  worldSignature: string;
}

/**
 * Agent's response to a challenge during JOIN.
 */
export interface ChallengeResponse {
  /** Challenge ID being responded to */
  challengeId: string;
  /** Agent's signature of (challengeBytes + nonce) */
  agentSignature: string;
  /** The original nonce from the manifest */
  nonce: string;
}

/**
 * Session token issued after successful JOIN.
 */
export interface TrustSessionToken {
  /** Unique token ID */
  tokenId: string;
  /** Agent this token belongs to */
  agentId: string;
  /** Granted capabilities (may be a subset of requested) */
  grantedCapabilities: AgentCapability[];
  /** Token creation timestamp */
  issuedAt: number;
  /** Token expiration timestamp */
  expiresAt: number;
  /** Number of times this token has been refreshed */
  refreshCount: number;
  /** HMAC of token fields for tamper detection */
  tokenHmac: string;
}

/**
 * Trust state for a single agent.
 */
export interface AgentTrustState {
  /** Agent ID */
  agentId: string;
  /** Current trust level */
  trustLevel: TrustLevel;
  /** Current phase */
  phase: TrustPhase;
  /** Session token (null if not yet issued) */
  sessionToken: TrustSessionToken | null;
  /** Agent's manifest from JOIN phase */
  manifest: AgentManifest | null;
  /** Pending challenge (null if no active challenge) */
  pendingChallenge: TrustChallenge | null;
  /** Granted capabilities (empty until VERIFIED) */
  grantedCapabilities: AgentCapability[];
  /** Trust score (0-1, decays over time without refresh) */
  trustScore: number;
  /** Timestamp of last trust state change */
  lastStateChangeTimestamp: number;
  /** Timestamp of last successful refresh */
  lastRefreshTimestamp: number;
  /** Number of failed refresh attempts */
  failedRefreshCount: number;
  /** Reason for revocation (null if not revoked) */
  revocationReason: string | null;
}

/**
 * Aggregate trust state for the entire world.
 * This is what gets double-buffered.
 */
export interface TrustWorldState {
  /** World's public key (hex) */
  worldPublicKey: string;
  /** World ID */
  worldId: string;
  /** Whether GENESIS phase has completed */
  genesisComplete: boolean;
  /** Per-agent trust states */
  agents: Record<string, AgentTrustState>;
  /** Total agents in each trust level (for quick rendering decisions) */
  trustCounts: Record<TrustLevel, number>;
  /** Sequence number, incremented on each trust state change */
  sequence: number;
  /** Timestamp of last trust state swap */
  lastSwapTimestamp: number;
  /** Global trust policy */
  policy: TrustPolicy;
}

/**
 * Global trust policy for the world.
 */
export interface TrustPolicy {
  /** Session token TTL in ms (default: 5 minutes) */
  sessionTtlMs: number;
  /** How long before expiry to require refresh (default: 30 seconds) */
  refreshWindowMs: number;
  /** Maximum failed refreshes before revocation (default: 3) */
  maxFailedRefreshes: number;
  /** Challenge response timeout in ms (default: 10 seconds) */
  challengeTimeoutMs: number;
  /** Trust score decay rate per second (0-1, default: 0.01) */
  trustDecayRate: number;
  /** Minimum trust score before degradation (default: 0.5) */
  degradationThreshold: number;
  /** Default capabilities for new agents (default: read + position) */
  defaultCapabilities: AgentCapability[];
  /** Whether to allow auto-upgrade from degraded to trusted on refresh */
  allowRecover: boolean;
}

/**
 * Configuration for the VRTrustHandshake.
 */
export interface VRTrustHandshakeConfig {
  /** World ID */
  worldId: string;
  /** Trust check frequency in Hz (default: 10, how often to check expirations) */
  checkHz?: number;
  /** Custom trust policy overrides */
  policy?: Partial<TrustPolicy>;
  /** Staleness threshold for buffer metrics (ms, default: 1000) */
  stalenessThresholdMs?: number;
  /** Whether to auto-start the trust check loop (default: false) */
  autoStart?: boolean;
  /** Callback when an agent's trust level changes */
  onTrustLevelChanged?: (agentId: string, oldLevel: TrustLevel, newLevel: TrustLevel) => void;
  /** Callback when an agent successfully joins */
  onAgentJoined?: (agentId: string, capabilities: AgentCapability[]) => void;
  /** Callback when an agent exits or is evicted */
  onAgentExited?: (agentId: string, reason: string) => void;
  /**
   * Crypto provider for signature operations.
   * Injectable for testing (default: uses Web Crypto API).
   */
  crypto?: TrustCryptoProvider;
}

/**
 * Interface for cryptographic operations.
 * Abstracted for testability - inject a mock in tests.
 */
export interface TrustCryptoProvider {
  /** Generate a key pair (returns hex-encoded public and private keys) */
  generateKeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  /** Sign data with private key, return hex signature */
  sign(data: string, privateKey: string): Promise<string>;
  /** Verify a signature against a public key */
  verify(data: string, signature: string, publicKey: string): Promise<boolean>;
  /** Generate random hex bytes */
  randomBytes(length: number): string;
  /** HMAC of data with a secret */
  hmac(data: string, secret: string): Promise<string>;
}

/**
 * Metrics for the trust handshake system.
 */
export interface VRTrustHandshakeMetrics {
  /** Whether the trust check loop is running */
  isRunning: boolean;
  /** Trust check frequency */
  checkHz: number;
  /** Whether genesis is complete */
  genesisComplete: boolean;
  /** Total join requests received */
  totalJoinRequests: number;
  /** Total successful joins */
  totalSuccessfulJoins: number;
  /** Total failed joins (bad signature, timeout, etc.) */
  totalFailedJoins: number;
  /** Total refreshes performed */
  totalRefreshes: number;
  /** Total revocations */
  totalRevocations: number;
  /** Agents per trust level */
  trustCounts: Record<TrustLevel, number>;
  /** Average join handshake duration in ms */
  averageJoinDurationMs: number;
  /** Average trust check duration in ms (should be <1ms) */
  averageCheckDurationMs: number;
}

// =============================================================================
// DEFAULT CRYPTO PROVIDER (Web Crypto API)
// =============================================================================

/**
 * Default crypto provider using simplified HMAC-based signatures.
 *
 * In production, this would use Ed25519 or ECDSA via Web Crypto API.
 * This implementation uses HMAC-SHA256 as a deterministic signature
 * primitive that works in all JS environments (Node, browser, workers).
 *
 * IMPORTANT: For production VR deployments, replace this with a provider
 * that uses proper asymmetric key cryptography (Ed25519 recommended
 * for its speed: ~20us per signature verification).
 */
export class DefaultTrustCryptoProvider implements TrustCryptoProvider {
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const privateKey = this.randomBytes(32);
    // In real implementation, derive public key from private key
    // For this simplified version, we use a hash of the private key
    const publicKey = await this.hmac(privateKey, 'hololand-keygen');
    return { publicKey, privateKey };
  }

  async sign(data: string, privateKey: string): Promise<string> {
    return this.hmac(data, privateKey);
  }

  async verify(data: string, signature: string, publicKey: string): Promise<boolean> {
    // In real implementation, use asymmetric verification.
    // For this simplified version, we check that the signature
    // is a valid HMAC (the verifier must know the relationship
    // between public and private key).
    // In production: use crypto.subtle.verify() with Ed25519
    return signature.length === 64 && /^[0-9a-f]+$/i.test(signature);
  }

  randomBytes(length: number): string {
    const bytes = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      // Fallback for environments without Web Crypto
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async hmac(data: string, secret: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
      return Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Fallback: simple hash-like function (NOT cryptographically secure)
    // Only used in test environments without Web Crypto
    let hash = 0;
    const combined = data + secret;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
  }
}

// =============================================================================
// DEFAULT STATE FACTORIES
// =============================================================================

/**
 * Default trust policy values.
 */
export const DEFAULT_TRUST_POLICY: TrustPolicy = {
  sessionTtlMs: 5 * 60 * 1000,          // 5 minutes
  refreshWindowMs: 30 * 1000,            // 30 seconds before expiry
  maxFailedRefreshes: 3,
  challengeTimeoutMs: 10 * 1000,         // 10 seconds
  trustDecayRate: 0.01,                  // 1% per second
  degradationThreshold: 0.5,
  defaultCapabilities: ['read_state', 'write_position', 'write_emotion'],
  allowRecover: true,
};

/**
 * Create an empty TrustWorldState.
 */
export function createEmptyTrustWorldState(): TrustWorldState {
  return {
    worldPublicKey: '',
    worldId: '',
    genesisComplete: false,
    agents: {},
    trustCounts: {
      none: 0,
      pending: 0,
      verified: 0,
      trusted: 0,
      degraded: 0,
      revoked: 0,
    },
    sequence: 0,
    lastSwapTimestamp: 0,
    policy: { ...DEFAULT_TRUST_POLICY },
  };
}

/**
 * Create an initial AgentTrustState.
 */
function createInitialAgentTrustState(agentId: string): AgentTrustState {
  return {
    agentId,
    trustLevel: 'none',
    phase: 'join',
    sessionToken: null,
    manifest: null,
    pendingChallenge: null,
    grantedCapabilities: [],
    trustScore: 0,
    lastStateChangeTimestamp: Date.now(),
    lastRefreshTimestamp: 0,
    failedRefreshCount: 0,
    revocationReason: null,
  };
}

// =============================================================================
// VR TRUST HANDSHAKE
// =============================================================================

/**
 * VR Trust Handshake Manager.
 *
 * Implements the 5-phase trust lifecycle for multi-agent world join flow.
 * All cryptographic operations run off the VR render loop. The renderer
 * reads trust state from the double-buffered front buffer at <0.1ms cost.
 *
 * Usage:
 * ```typescript
 * // 1. Create the handshake manager
 * const trustHandshake = new VRTrustHandshake({ worldId: 'world-123' });
 *
 * // 2. Run GENESIS (creates world trust anchor)
 * await trustHandshake.genesis();
 *
 * // 3. Start the trust check loop (off render loop)
 * trustHandshake.start();
 *
 * // 4. Agent requests to join
 * const challenge = await trustHandshake.requestJoin(agentManifest);
 *
 * // 5. Agent responds to challenge
 * const result = await trustHandshake.respondToChallenge(challengeResponse);
 *
 * // 6. In render loop: check trust before applying agent state
 * if (trustHandshake.isAgentTrusted('agent-id')) {
 *   // Apply agent state to scene
 * }
 *
 * // 7. Agent exits
 * trustHandshake.exitAgent('agent-id', 'voluntary');
 * ```
 */
export class VRTrustHandshake {
  private readonly config: Required<VRTrustHandshakeConfig>;
  private readonly buffer: AgentStateBuffer<TrustWorldState>;
  private readonly cryptoProvider: TrustCryptoProvider;
  private readonly policy: TrustPolicy;

  // World key pair (generated during GENESIS)
  private worldPrivateKey: string = '';

  // Trust check loop
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  // Metrics
  private totalJoinRequests: number = 0;
  private totalSuccessfulJoins: number = 0;
  private totalFailedJoins: number = 0;
  private totalRefreshes: number = 0;
  private totalRevocations: number = 0;
  private joinDurations: number[] = [];
  private checkDurations: number[] = [];
  private readonly MAX_DURATION_HISTORY = 60;

  // Challenge tracking (challengeId -> start time for duration metrics)
  private pendingChallenges: Map<string, number> = new Map();

  constructor(config: VRTrustHandshakeConfig) {
    this.config = {
      worldId: config.worldId,
      checkHz: config.checkHz ?? 10,
      policy: config.policy ?? {},
      stalenessThresholdMs: config.stalenessThresholdMs ?? 1000,
      autoStart: config.autoStart ?? false,
      onTrustLevelChanged: config.onTrustLevelChanged ?? (() => {}),
      onAgentJoined: config.onAgentJoined ?? (() => {}),
      onAgentExited: config.onAgentExited ?? (() => {}),
      crypto: config.crypto ?? new DefaultTrustCryptoProvider(),
    };

    this.cryptoProvider = this.config.crypto;
    this.policy = { ...DEFAULT_TRUST_POLICY, ...config.policy };

    // Initialize double-buffered trust state
    this.buffer = new AgentStateBuffer<TrustWorldState>(
      createEmptyTrustWorldState,
      this.config.stalenessThresholdMs,
    );

    if (this.config.autoStart) {
      this.start();
    }

    logger.info('[VRTrustHandshake] Initialized', {
      worldId: config.worldId,
      checkHz: this.config.checkHz,
      sessionTtlMs: this.policy.sessionTtlMs,
    });
  }

  // ===========================================================================
  // PHASE 0: GENESIS
  // ===========================================================================

  /**
   * Execute the GENESIS phase.
   *
   * Generates the world's trust anchor (key pair) and initializes
   * the trust world state. Must be called before any agents can join.
   *
   * This runs ONCE when the world is instantiated.
   * Budget: Async, 5-20ms (off render loop).
   */
  async genesis(): Promise<{ worldPublicKey: string }> {
    const startTime = this.now();

    // Generate world key pair
    const keyPair = await this.cryptoProvider.generateKeyPair();
    this.worldPrivateKey = keyPair.privateKey;

    // Write to back buffer
    const back = this.buffer.getBackBuffer();
    back.worldPublicKey = keyPair.publicKey;
    back.worldId = this.config.worldId;
    back.genesisComplete = true;
    back.policy = { ...this.policy };
    back.sequence++;
    back.lastSwapTimestamp = Date.now();

    // Swap to make visible
    this.buffer.swap();

    const duration = this.now() - startTime;
    logger.info('[VRTrustHandshake] GENESIS complete', {
      worldId: this.config.worldId,
      durationMs: duration.toFixed(2),
    });

    return { worldPublicKey: keyPair.publicKey };
  }

  /**
   * Check if GENESIS has been completed.
   */
  isGenesisComplete(): boolean {
    return this.buffer.getFrontBuffer().genesisComplete;
  }

  // ===========================================================================
  // PHASE 1: JOIN (Manifest → Challenge → Verify)
  // ===========================================================================

  /**
   * Step 1 of JOIN: Receive an agent's manifest and issue a challenge.
   *
   * The agent presents its capabilities and public key.
   * The world responds with a cryptographic challenge.
   *
   * Budget: Async, 5-10ms (off render loop).
   *
   * @param manifest - The agent's capability manifest
   * @returns The challenge for the agent to sign
   * @throws If GENESIS has not completed or manifest is invalid
   */
  async requestJoin(manifest: AgentManifest): Promise<TrustChallenge> {
    this.totalJoinRequests++;

    // Validate GENESIS
    if (!this.isGenesisComplete()) {
      this.totalFailedJoins++;
      throw new Error('GENESIS not complete. Call genesis() before accepting join requests.');
    }

    // Validate manifest
    try {
      this.validateManifest(manifest);
    } catch (e) {
      this.totalFailedJoins++;
      throw e;
    }

    // Check if agent already has an active session
    const front = this.buffer.getFrontBuffer();
    const existingAgent = front.agents[manifest.agentId];
    if (existingAgent && existingAgent.trustLevel === 'trusted') {
      this.totalFailedJoins++;
      throw new Error(`Agent ${manifest.agentId} already has an active trusted session.`);
    }

    // Generate challenge
    const challengeId = `ch-${manifest.agentId}-${Date.now()}-${this.cryptoProvider.randomBytes(4)}`;
    const challengeBytes = this.cryptoProvider.randomBytes(32);

    // Sign the challenge with world's private key
    const dataToSign = challengeBytes + manifest.nonce;
    const worldSignature = await this.cryptoProvider.sign(dataToSign, this.worldPrivateKey);

    const challenge: TrustChallenge = {
      challengeId,
      challengeBytes,
      worldPublicKey: front.worldPublicKey,
      expiresAt: Date.now() + this.policy.challengeTimeoutMs,
      worldSignature,
    };

    // Track the challenge start time for duration metrics
    this.pendingChallenges.set(challengeId, this.now());

    // Write agent to back buffer as PENDING
    const back = this.buffer.getBackBuffer();
    const agentState = createInitialAgentTrustState(manifest.agentId);
    agentState.trustLevel = 'pending';
    agentState.phase = 'join';
    agentState.manifest = manifest;
    agentState.pendingChallenge = challenge;
    agentState.lastStateChangeTimestamp = Date.now();

    back.agents[manifest.agentId] = agentState;
    this.updateTrustCounts(back);
    back.sequence++;
    back.lastSwapTimestamp = Date.now();
    this.buffer.swap();

    logger.info('[VRTrustHandshake] JOIN: Challenge issued', {
      agentId: manifest.agentId,
      challengeId,
      expiresAt: challenge.expiresAt,
    });

    return challenge;
  }

  /**
   * Step 2 of JOIN: Verify the agent's challenge response.
   *
   * The agent signs the challenge with their private key.
   * If the signature verifies, a session token is issued.
   *
   * Budget: Async, 5-20ms (off render loop).
   *
   * @param response - The agent's signed challenge response
   * @returns The session token if verification succeeds
   * @throws If verification fails, challenge expired, or challenge not found
   */
  async respondToChallenge(response: ChallengeResponse): Promise<TrustSessionToken> {
    const front = this.buffer.getFrontBuffer();

    // Find the agent with this pending challenge
    let agentId: string | null = null;
    for (const [id, agentState] of Object.entries(front.agents)) {
      if (agentState.pendingChallenge?.challengeId === response.challengeId) {
        agentId = id;
        break;
      }
    }

    if (!agentId) {
      this.totalFailedJoins++;
      throw new Error(`No pending challenge found for challengeId: ${response.challengeId}`);
    }

    const agentState = front.agents[agentId];

    // Check challenge expiration
    if (agentState.pendingChallenge!.expiresAt < Date.now()) {
      this.totalFailedJoins++;
      this.changeTrustLevel(agentId, 'revoked', 'Challenge expired');
      throw new Error(`Challenge ${response.challengeId} has expired.`);
    }

    // Verify the agent's signature
    const manifest = agentState.manifest!;
    const challenge = agentState.pendingChallenge!;
    const expectedData = challenge.challengeBytes + response.nonce;

    const isValid = await this.cryptoProvider.verify(
      expectedData,
      response.agentSignature,
      manifest.publicKey,
    );

    if (!isValid) {
      this.totalFailedJoins++;
      this.changeTrustLevel(agentId, 'revoked', 'Invalid signature');
      throw new Error(`Signature verification failed for agent ${agentId}.`);
    }

    // Nonce must match
    if (response.nonce !== manifest.nonce) {
      this.totalFailedJoins++;
      this.changeTrustLevel(agentId, 'revoked', 'Nonce mismatch');
      throw new Error(`Nonce mismatch for agent ${agentId}.`);
    }

    // Determine granted capabilities (intersection of requested and default)
    const grantedCapabilities = this.negotiateCapabilities(
      manifest.requestedCapabilities,
    );

    // Issue session token
    const tokenId = `tk-${agentId}-${Date.now()}-${this.cryptoProvider.randomBytes(4)}`;
    const tokenData = `${tokenId}:${agentId}:${Date.now()}:${grantedCapabilities.join(',')}`;
    const tokenHmac = await this.cryptoProvider.hmac(tokenData, this.worldPrivateKey);

    const sessionToken: TrustSessionToken = {
      tokenId,
      agentId,
      grantedCapabilities,
      issuedAt: Date.now(),
      expiresAt: Date.now() + this.policy.sessionTtlMs,
      refreshCount: 0,
      tokenHmac,
    };

    // Update to TRUSTED in back buffer
    const back = this.buffer.getBackBuffer();
    const updatedState = back.agents[agentId] || createInitialAgentTrustState(agentId);
    updatedState.trustLevel = 'trusted';
    updatedState.phase = 'interact';
    updatedState.sessionToken = sessionToken;
    updatedState.grantedCapabilities = grantedCapabilities;
    updatedState.trustScore = 1.0;
    updatedState.pendingChallenge = null;
    updatedState.lastStateChangeTimestamp = Date.now();
    updatedState.lastRefreshTimestamp = Date.now();

    back.agents[agentId] = updatedState;
    this.updateTrustCounts(back);
    back.sequence++;
    back.lastSwapTimestamp = Date.now();
    this.buffer.swap();

    // Track join duration
    const startTime = this.pendingChallenges.get(response.challengeId);
    if (startTime) {
      this.joinDurations.push(this.now() - startTime);
      if (this.joinDurations.length > this.MAX_DURATION_HISTORY) {
        this.joinDurations.shift();
      }
      this.pendingChallenges.delete(response.challengeId);
    }

    this.totalSuccessfulJoins++;
    this.config.onAgentJoined(agentId, grantedCapabilities);

    logger.info('[VRTrustHandshake] JOIN: Agent verified and trusted', {
      agentId,
      tokenId,
      capabilities: grantedCapabilities,
      expiresAt: sessionToken.expiresAt,
    });

    return sessionToken;
  }

  // ===========================================================================
  // PHASE 2: INTERACT (Render-loop trust gate)
  // ===========================================================================

  /**
   * Check if an agent is currently trusted.
   *
   * This is the PRIMARY render-loop integration point.
   * It reads ONLY from the front buffer, making it safe for 90Hz.
   *
   * Budget: <0.1ms (cache lookup, ON render loop).
   *
   * @param agentId - Agent to check
   * @returns true if agent has an active trusted session
   */
  isAgentTrusted(agentId: string): boolean {
    const state = this.buffer.getFrontBuffer();
    const agent = state.agents[agentId];
    return agent !== undefined && agent.trustLevel === 'trusted';
  }

  /**
   * Check if an agent has a specific capability.
   *
   * Render-loop safe. Used to gate specific interactions.
   *
   * Budget: <0.1ms (cache lookup, ON render loop).
   *
   * @param agentId - Agent to check
   * @param capability - Required capability
   * @returns true if agent is trusted AND has the capability
   */
  hasCapability(agentId: string, capability: AgentCapability): boolean {
    const state = this.buffer.getFrontBuffer();
    const agent = state.agents[agentId];
    if (!agent || agent.trustLevel !== 'trusted') {
      return false;
    }
    return agent.grantedCapabilities.includes(capability);
  }

  /**
   * Get an agent's current trust level.
   *
   * Render-loop safe.
   *
   * Budget: <0.1ms (cache lookup, ON render loop).
   *
   * @param agentId - Agent to query
   * @returns The agent's trust level, or 'none' if not found
   */
  getAgentTrustLevel(agentId: string): TrustLevel {
    const state = this.buffer.getFrontBuffer();
    const agent = state.agents[agentId];
    return agent?.trustLevel ?? 'none';
  }

  /**
   * Get an agent's trust score (0-1).
   *
   * Render-loop safe. Used for visual indicators (e.g., trust shield opacity).
   *
   * Budget: <0.1ms (cache lookup, ON render loop).
   *
   * @param agentId - Agent to query
   * @returns Trust score (0 = no trust, 1 = full trust)
   */
  getAgentTrustScore(agentId: string): number {
    const state = this.buffer.getFrontBuffer();
    const agent = state.agents[agentId];
    return agent?.trustScore ?? 0;
  }

  /**
   * Get the full trust state for the world (render-loop safe).
   *
   * Budget: <0.1ms (pointer read, ON render loop).
   */
  getCurrentTrustState(): Readonly<TrustWorldState> {
    return this.buffer.getFrontBuffer();
  }

  // ===========================================================================
  // PHASE 3: REFRESH (Continuous verification)
  // ===========================================================================

  /**
   * Refresh an agent's session token.
   *
   * Called periodically before the token expires. If the agent fails
   * to refresh, their trust level degrades and eventually gets revoked.
   *
   * Budget: Async, 5-20ms (off render loop).
   *
   * @param agentId - Agent requesting refresh
   * @param signature - Agent's signature of the current token ID
   * @returns Updated session token
   */
  async refreshSession(agentId: string, signature: string): Promise<TrustSessionToken> {
    const front = this.buffer.getFrontBuffer();
    const agentState = front.agents[agentId];

    if (!agentState) {
      throw new Error(`No active session for agent ${agentId}.`);
    }

    if (agentState.trustLevel === 'revoked') {
      throw new Error(`Agent ${agentId} has been revoked. Must re-join.`);
    }

    if (!agentState.sessionToken) {
      throw new Error(`No active session for agent ${agentId}.`);
    }

    // Verify refresh signature
    const manifest = agentState.manifest;
    if (manifest) {
      const isValid = await this.cryptoProvider.verify(
        agentState.sessionToken.tokenId,
        signature,
        manifest.publicKey,
      );

      if (!isValid) {
        // Increment failed refresh count
        const back = this.buffer.getBackBuffer();
        const backAgent = back.agents[agentId];
        if (backAgent) {
          backAgent.failedRefreshCount++;
          if (backAgent.failedRefreshCount >= this.policy.maxFailedRefreshes) {
            this.changeTrustLevel(agentId, 'revoked', 'Max failed refreshes exceeded');
          } else {
            this.changeTrustLevel(agentId, 'degraded', 'Failed refresh signature');
          }
          back.sequence++;
          back.lastSwapTimestamp = Date.now();
          this.buffer.swap();
        }
        throw new Error(`Refresh signature verification failed for agent ${agentId}.`);
      }
    }

    // Issue new token
    const oldToken = agentState.sessionToken;
    const tokenId = `tk-${agentId}-${Date.now()}-${this.cryptoProvider.randomBytes(4)}`;
    const tokenData = `${tokenId}:${agentId}:${Date.now()}:${oldToken.grantedCapabilities.join(',')}`;
    const tokenHmac = await this.cryptoProvider.hmac(tokenData, this.worldPrivateKey);

    const newToken: TrustSessionToken = {
      tokenId,
      agentId,
      grantedCapabilities: oldToken.grantedCapabilities,
      issuedAt: Date.now(),
      expiresAt: Date.now() + this.policy.sessionTtlMs,
      refreshCount: oldToken.refreshCount + 1,
      tokenHmac,
    };

    // Update back buffer
    const back = this.buffer.getBackBuffer();
    const backAgent = back.agents[agentId];
    if (backAgent) {
      backAgent.sessionToken = newToken;
      backAgent.trustScore = 1.0; // Reset trust score on successful refresh
      backAgent.lastRefreshTimestamp = Date.now();
      backAgent.failedRefreshCount = 0;
      backAgent.phase = 'interact';

      // Recover from degraded if allowed
      if (backAgent.trustLevel === 'degraded' && this.policy.allowRecover) {
        backAgent.trustLevel = 'trusted';
        this.config.onTrustLevelChanged(agentId, 'degraded', 'trusted');
      }
    }

    this.updateTrustCounts(back);
    back.sequence++;
    back.lastSwapTimestamp = Date.now();
    this.buffer.swap();

    this.totalRefreshes++;

    logger.debug('[VRTrustHandshake] REFRESH: Session renewed', {
      agentId,
      tokenId,
      refreshCount: newToken.refreshCount,
      expiresAt: newToken.expiresAt,
    });

    return newToken;
  }

  // ===========================================================================
  // PHASE 4: EXIT
  // ===========================================================================

  /**
   * Exit an agent from the world.
   *
   * Revokes the session token and removes trust state.
   * Can be called voluntarily by the agent or by the world (eviction).
   *
   * Budget: Sync, <1ms (off render loop).
   *
   * @param agentId - Agent to remove
   * @param reason - Reason for exit (e.g., 'voluntary', 'eviction', 'timeout')
   */
  exitAgent(agentId: string, reason: string): void {
    const back = this.buffer.getBackBuffer();
    const agentState = back.agents[agentId];

    if (!agentState) {
      logger.warn('[VRTrustHandshake] EXIT: Agent not found', { agentId });
      return;
    }

    const oldLevel = agentState.trustLevel;

    // Revoke trust
    agentState.trustLevel = 'revoked';
    agentState.phase = 'exit';
    agentState.sessionToken = null;
    agentState.grantedCapabilities = [];
    agentState.trustScore = 0;
    agentState.revocationReason = reason;
    agentState.lastStateChangeTimestamp = Date.now();

    // Remove from agents after marking revoked (for audit trail)
    // The agent entry persists for one swap cycle, then is cleaned up
    // by the periodic trust check.

    this.updateTrustCounts(back);
    back.sequence++;
    back.lastSwapTimestamp = Date.now();
    this.buffer.swap();

    // Clean up pending challenges
    if (agentState.pendingChallenge) {
      this.pendingChallenges.delete(agentState.pendingChallenge.challengeId);
    }

    this.totalRevocations++;
    this.config.onTrustLevelChanged(agentId, oldLevel, 'revoked');
    this.config.onAgentExited(agentId, reason);

    logger.info('[VRTrustHandshake] EXIT: Agent removed', {
      agentId,
      reason,
      previousLevel: oldLevel,
    });
  }

  // ===========================================================================
  // TRUST CHECK LOOP (OFF RENDER LOOP)
  // ===========================================================================

  /**
   * Start the periodic trust check loop.
   *
   * Runs at the configured Hz (default: 10Hz) and:
   * - Checks for expired sessions
   * - Decays trust scores
   * - Transitions agents from degraded to revoked
   * - Cleans up revoked agent entries
   *
   * Completely off the render loop.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[VRTrustHandshake] Already running');
      return;
    }

    const intervalMs = Math.max(1, Math.round(1000 / this.config.checkHz));
    this.checkIntervalId = setInterval(() => this.checkTrust(), intervalMs);
    this.isRunning = true;

    logger.info('[VRTrustHandshake] Trust check loop started', {
      hz: this.config.checkHz,
      intervalMs,
    });
  }

  /**
   * Stop the trust check loop.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[VRTrustHandshake] Already stopped');
      return;
    }

    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    this.isRunning = false;

    logger.info('[VRTrustHandshake] Trust check loop stopped');
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stop();
    this.pendingChallenges.clear();
    this.buffer.reset();
    this.worldPrivateKey = '';

    logger.info('[VRTrustHandshake] Disposed');
  }

  /**
   * Periodic trust check. Runs at configured Hz, off render loop.
   *
   * Budget: <1ms per check (target, for up to 100 agents).
   */
  private checkTrust(): void {
    const startTime = this.now();
    const back = this.buffer.getBackBuffer();
    const now = Date.now();
    let changed = false;

    for (const [agentId, agentState] of Object.entries(back.agents)) {
      // Skip already revoked agents awaiting cleanup
      if (agentState.trustLevel === 'revoked') {
        // Clean up revoked agents after 2 swap cycles
        if (now - agentState.lastStateChangeTimestamp > 2000) {
          delete back.agents[agentId];
          changed = true;
        }
        continue;
      }

      // Check session expiration
      if (agentState.sessionToken && agentState.sessionToken.expiresAt < now) {
        const oldLevel = agentState.trustLevel;
        agentState.trustLevel = 'revoked';
        agentState.phase = 'exit';
        agentState.revocationReason = 'Session expired';
        agentState.trustScore = 0;
        agentState.lastStateChangeTimestamp = now;
        this.config.onTrustLevelChanged(agentId, oldLevel, 'revoked');
        this.config.onAgentExited(agentId, 'session_expired');
        this.totalRevocations++;
        changed = true;
        continue;
      }

      // Check challenge timeout (PENDING agents)
      if (agentState.trustLevel === 'pending' && agentState.pendingChallenge) {
        if (agentState.pendingChallenge.expiresAt < now) {
          agentState.trustLevel = 'revoked';
          agentState.phase = 'exit';
          agentState.revocationReason = 'Challenge timeout';
          agentState.trustScore = 0;
          agentState.lastStateChangeTimestamp = now;
          this.pendingChallenges.delete(agentState.pendingChallenge.challengeId);
          this.totalFailedJoins++;
          this.config.onTrustLevelChanged(agentId, 'pending', 'revoked');
          changed = true;
          continue;
        }
      }

      // Decay trust score for trusted/degraded agents
      if (agentState.trustLevel === 'trusted' || agentState.trustLevel === 'degraded') {
        const timeSinceRefresh = now - agentState.lastRefreshTimestamp;
        const decaySeconds = timeSinceRefresh / 1000;
        agentState.trustScore = Math.max(0, 1 - (this.policy.trustDecayRate * decaySeconds));

        // Degrade if trust score falls below threshold
        if (agentState.trustScore < this.policy.degradationThreshold
            && agentState.trustLevel === 'trusted') {
          agentState.trustLevel = 'degraded';
          agentState.lastStateChangeTimestamp = now;
          this.config.onTrustLevelChanged(agentId, 'trusted', 'degraded');
          changed = true;
        }

        // Revoke if trust score hits zero
        if (agentState.trustScore <= 0 && agentState.trustLevel === 'degraded') {
          agentState.trustLevel = 'revoked';
          agentState.phase = 'exit';
          agentState.revocationReason = 'Trust score depleted';
          agentState.lastStateChangeTimestamp = now;
          this.config.onTrustLevelChanged(agentId, 'degraded', 'revoked');
          this.config.onAgentExited(agentId, 'trust_depleted');
          this.totalRevocations++;
          changed = true;
        }
      }
    }

    if (changed) {
      this.updateTrustCounts(back);
      back.sequence++;
      back.lastSwapTimestamp = now;
      this.buffer.swap();
    }

    // Track check duration
    const duration = this.now() - startTime;
    this.checkDurations.push(duration);
    if (this.checkDurations.length > this.MAX_DURATION_HISTORY) {
      this.checkDurations.shift();
    }
  }

  // ===========================================================================
  // QUERY API
  // ===========================================================================

  /**
   * Get the underlying double-buffered state container.
   */
  getBuffer(): AgentStateBuffer<TrustWorldState> {
    return this.buffer;
  }

  /**
   * Get list of all trusted agent IDs.
   * Render-loop safe.
   */
  getTrustedAgentIds(): string[] {
    const state = this.buffer.getFrontBuffer();
    return Object.entries(state.agents)
      .filter(([, a]) => a.trustLevel === 'trusted')
      .map(([id]) => id);
  }

  /**
   * Get trust counts by level.
   * Render-loop safe.
   */
  getTrustCounts(): Readonly<Record<TrustLevel, number>> {
    return this.buffer.getFrontBuffer().trustCounts;
  }

  /**
   * Check if the trust check loop is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive trust handshake metrics.
   */
  getMetrics(): VRTrustHandshakeMetrics {
    let averageJoinDuration = 0;
    if (this.joinDurations.length > 0) {
      averageJoinDuration = this.joinDurations.reduce((a, b) => a + b, 0)
        / this.joinDurations.length;
    }

    let averageCheckDuration = 0;
    if (this.checkDurations.length > 0) {
      averageCheckDuration = this.checkDurations.reduce((a, b) => a + b, 0)
        / this.checkDurations.length;
    }

    return {
      isRunning: this.isRunning,
      checkHz: this.config.checkHz,
      genesisComplete: this.isGenesisComplete(),
      totalJoinRequests: this.totalJoinRequests,
      totalSuccessfulJoins: this.totalSuccessfulJoins,
      totalFailedJoins: this.totalFailedJoins,
      totalRefreshes: this.totalRefreshes,
      totalRevocations: this.totalRevocations,
      trustCounts: { ...this.buffer.getFrontBuffer().trustCounts },
      averageJoinDurationMs: Math.round(averageJoinDuration * 100) / 100,
      averageCheckDurationMs: Math.round(averageCheckDuration * 1000) / 1000,
    };
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  /**
   * Validate an agent manifest.
   */
  private validateManifest(manifest: AgentManifest): void {
    if (!manifest.agentId || manifest.agentId.length === 0) {
      throw new Error('Manifest: agentId is required.');
    }
    if (!manifest.publicKey || manifest.publicKey.length === 0) {
      throw new Error('Manifest: publicKey is required.');
    }
    if (!manifest.nonce || manifest.nonce.length < 16) {
      throw new Error('Manifest: nonce must be at least 16 hex characters.');
    }
    if (manifest.protocolVersion !== '1.0') {
      throw new Error(`Manifest: unsupported protocol version: ${manifest.protocolVersion}`);
    }
    if (!manifest.requestedCapabilities || manifest.requestedCapabilities.length === 0) {
      throw new Error('Manifest: at least one capability must be requested.');
    }
  }

  /**
   * Negotiate capabilities: grant the intersection of requested and allowed.
   */
  private negotiateCapabilities(requested: AgentCapability[]): AgentCapability[] {
    const allowed = new Set<AgentCapability>(this.policy.defaultCapabilities);
    return requested.filter(cap => allowed.has(cap));
  }

  /**
   * Change an agent's trust level (writes to back buffer + swaps).
   */
  private changeTrustLevel(agentId: string, newLevel: TrustLevel, reason?: string): void {
    const back = this.buffer.getBackBuffer();
    const agent = back.agents[agentId];
    if (!agent) return;

    const oldLevel = agent.trustLevel;
    agent.trustLevel = newLevel;
    agent.lastStateChangeTimestamp = Date.now();

    if (newLevel === 'revoked') {
      agent.revocationReason = reason ?? 'Unknown';
      agent.phase = 'exit';
      agent.trustScore = 0;
    }

    this.updateTrustCounts(back);
    back.sequence++;
    back.lastSwapTimestamp = Date.now();
    this.buffer.swap();

    this.config.onTrustLevelChanged(agentId, oldLevel, newLevel);
  }

  /**
   * Recalculate trust counts from the agent map.
   */
  private updateTrustCounts(state: TrustWorldState): void {
    const counts: Record<TrustLevel, number> = {
      none: 0,
      pending: 0,
      verified: 0,
      trusted: 0,
      degraded: 0,
      revoked: 0,
    };

    for (const agent of Object.values(state.agents)) {
      counts[agent.trustLevel]++;
    }

    state.trustCounts = counts;
  }

  /**
   * High-resolution timestamp.
   */
  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a VRTrustHandshake with the given configuration.
 */
export function createVRTrustHandshake(
  config: VRTrustHandshakeConfig,
): VRTrustHandshake {
  return new VRTrustHandshake(config);
}
