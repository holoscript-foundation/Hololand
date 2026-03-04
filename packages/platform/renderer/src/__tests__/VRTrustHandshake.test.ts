/**
 * @vitest-environment jsdom
 */

/**
 * Tests for VRTrustHandshake
 *
 * Validates the 5-phase VR Trust Handshake protocol:
 * - Phase 0: GENESIS (world trust anchor creation)
 * - Phase 1: JOIN (manifest → challenge → verify)
 * - Phase 2: INTERACT (render-loop trust gate)
 * - Phase 3: REFRESH (continuous verification)
 * - Phase 4: EXIT (agent removal)
 * - Trust check loop (expiration, decay, cleanup)
 * - Performance: <1ms per frame for render-loop operations
 * - Metrics tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  VRTrustHandshake,
  createVRTrustHandshake,
  createEmptyTrustWorldState,
  DEFAULT_TRUST_POLICY,
  type AgentManifest,
  type ChallengeResponse,
  type TrustCryptoProvider,
  type TrustChallenge,
  type TrustSessionToken,
  type AgentCapability,
} from '../VRTrustHandshake';

// =============================================================================
// MOCK CRYPTO PROVIDER (Deterministic for testing)
// =============================================================================

function createMockCryptoProvider(): TrustCryptoProvider {
  let callCount = 0;

  return {
    async generateKeyPair() {
      callCount++;
      return {
        publicKey: `mock-pub-key-${callCount}`.padEnd(64, '0'),
        privateKey: `mock-priv-key-${callCount}`.padEnd(64, '0'),
      };
    },

    async sign(data: string, _privateKey: string) {
      // Deterministic signature: hash of data
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
      }
      return Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
    },

    async verify(_data: string, signature: string, _publicKey: string) {
      // Accept any 64-char hex signature as valid
      return signature.length === 64 && /^[0-9a-f]+$/i.test(signature);
    },

    randomBytes(length: number) {
      callCount++;
      return `${'ab'.repeat(length)}`.slice(0, length * 2);
    },

    async hmac(data: string, _secret: string) {
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
      }
      return Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
    },
  };
}

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestManifest(agentId: string, overrides?: Partial<AgentManifest>): AgentManifest {
  return {
    agentId,
    name: agentId,
    publicKey: `agent-pub-key-${agentId}`.padEnd(64, '0'),
    requestedCapabilities: ['read_state', 'write_position', 'write_emotion'],
    protocolVersion: '1.0',
    nonce: 'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8', // 32 hex chars
    timestamp: Date.now(),
    ...overrides,
  };
}

async function createTrustHandshakeWithGenesis(
  overrides?: Record<string, unknown>,
): Promise<VRTrustHandshake> {
  const ths = new VRTrustHandshake({
    worldId: 'test-world',
    crypto: createMockCryptoProvider(),
    ...(overrides as Record<string, unknown>),
  });
  await ths.genesis();
  return ths;
}

async function joinAgentFully(
  ths: VRTrustHandshake,
  agentId: string,
): Promise<{ challenge: TrustChallenge; token: TrustSessionToken }> {
  const manifest = createTestManifest(agentId);
  const challenge = await ths.requestJoin(manifest);

  const mockCrypto = createMockCryptoProvider();
  const agentSignature = await mockCrypto.sign(
    challenge.challengeBytes + manifest.nonce,
    'mock-private-key',
  );

  const response: ChallengeResponse = {
    challengeId: challenge.challengeId,
    agentSignature,
    nonce: manifest.nonce,
  };

  const token = await ths.respondToChallenge(response);
  return { challenge, token };
}

// =============================================================================
// TESTS
// =============================================================================

describe('VRTrustHandshake', () => {
  let ths: VRTrustHandshake;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (ths) {
      ths.dispose();
    }
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize without errors', () => {
      ths = new VRTrustHandshake({
        worldId: 'test-world',
        crypto: createMockCryptoProvider(),
      });
      expect(ths).toBeDefined();
      expect(ths.getIsRunning()).toBe(false);
    });

    it('should use factory function', () => {
      ths = createVRTrustHandshake({
        worldId: 'factory-world',
        crypto: createMockCryptoProvider(),
      });
      expect(ths).toBeDefined();
    });

    it('should not have genesis complete initially', () => {
      ths = new VRTrustHandshake({
        worldId: 'test',
        crypto: createMockCryptoProvider(),
      });
      expect(ths.isGenesisComplete()).toBe(false);
    });

    it('should create empty trust world state', () => {
      const state = createEmptyTrustWorldState();
      expect(state.worldPublicKey).toBe('');
      expect(state.genesisComplete).toBe(false);
      expect(state.agents).toEqual({});
      expect(state.sequence).toBe(0);
    });

    it('should auto-start when configured', () => {
      ths = new VRTrustHandshake({
        worldId: 'test',
        autoStart: true,
        crypto: createMockCryptoProvider(),
      });
      expect(ths.getIsRunning()).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 0: GENESIS
  // ─────────────────────────────────────────────────────────────────────────

  describe('Phase 0: GENESIS', () => {
    it('should complete genesis and generate world public key', async () => {
      ths = new VRTrustHandshake({
        worldId: 'genesis-test',
        crypto: createMockCryptoProvider(),
      });

      const result = await ths.genesis();
      expect(result.worldPublicKey).toBeDefined();
      expect(result.worldPublicKey.length).toBeGreaterThan(0);
      expect(ths.isGenesisComplete()).toBe(true);
    });

    it('should make genesis state visible in trust state', async () => {
      ths = new VRTrustHandshake({
        worldId: 'genesis-visible',
        crypto: createMockCryptoProvider(),
      });

      await ths.genesis();
      const state = ths.getCurrentTrustState();
      expect(state.genesisComplete).toBe(true);
      expect(state.worldId).toBe('genesis-visible');
      expect(state.worldPublicKey.length).toBeGreaterThan(0);
    });

    it('should set policy in trust state', async () => {
      ths = new VRTrustHandshake({
        worldId: 'policy-test',
        crypto: createMockCryptoProvider(),
        policy: { sessionTtlMs: 60000 },
      });

      await ths.genesis();
      const state = ths.getCurrentTrustState();
      expect(state.policy.sessionTtlMs).toBe(60000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1: JOIN (Manifest → Challenge → Verify)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Phase 1: JOIN', () => {
    beforeEach(async () => {
      ths = await createTrustHandshakeWithGenesis();
    });

    it('should issue a challenge on requestJoin', async () => {
      const manifest = createTestManifest('brittney');
      const challenge = await ths.requestJoin(manifest);

      expect(challenge).toBeDefined();
      expect(challenge.challengeId).toContain('ch-brittney-');
      expect(challenge.challengeBytes.length).toBe(64); // 32 bytes hex
      expect(challenge.worldPublicKey.length).toBeGreaterThan(0);
      expect(challenge.worldSignature.length).toBe(64);
      expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should set agent to PENDING after requestJoin', async () => {
      const manifest = createTestManifest('brittney');
      await ths.requestJoin(manifest);

      const trustLevel = ths.getAgentTrustLevel('brittney');
      expect(trustLevel).toBe('pending');
    });

    it('should reject join if genesis not complete', async () => {
      const noGenesis = new VRTrustHandshake({
        worldId: 'no-genesis',
        crypto: createMockCryptoProvider(),
      });

      const manifest = createTestManifest('agent');
      await expect(noGenesis.requestJoin(manifest)).rejects.toThrow('GENESIS not complete');
      noGenesis.dispose();
    });

    it('should reject manifest with empty agentId', async () => {
      const manifest = createTestManifest('', { agentId: '' });
      await expect(ths.requestJoin(manifest)).rejects.toThrow('agentId is required');
    });

    it('should reject manifest with empty publicKey', async () => {
      const manifest = createTestManifest('agent', { publicKey: '' });
      await expect(ths.requestJoin(manifest)).rejects.toThrow('publicKey is required');
    });

    it('should reject manifest with short nonce', async () => {
      const manifest = createTestManifest('agent', { nonce: 'short' });
      await expect(ths.requestJoin(manifest)).rejects.toThrow('nonce must be at least 16');
    });

    it('should reject manifest with wrong protocol version', async () => {
      const manifest = createTestManifest('agent', { protocolVersion: '2.0' });
      await expect(ths.requestJoin(manifest)).rejects.toThrow('unsupported protocol version');
    });

    it('should reject manifest with no capabilities', async () => {
      const manifest = createTestManifest('agent', { requestedCapabilities: [] });
      await expect(ths.requestJoin(manifest)).rejects.toThrow('at least one capability');
    });

    it('should verify challenge response and issue session token', async () => {
      const { token } = await joinAgentFully(ths, 'brittney');

      expect(token).toBeDefined();
      expect(token.tokenId).toContain('tk-brittney-');
      expect(token.agentId).toBe('brittney');
      expect(token.grantedCapabilities.length).toBeGreaterThan(0);
      expect(token.expiresAt).toBeGreaterThan(Date.now());
      expect(token.refreshCount).toBe(0);
      expect(token.tokenHmac.length).toBe(64);
    });

    it('should set agent to TRUSTED after successful challenge response', async () => {
      await joinAgentFully(ths, 'brittney');

      expect(ths.getAgentTrustLevel('brittney')).toBe('trusted');
      expect(ths.getAgentTrustScore('brittney')).toBe(1.0);
    });

    it('should reject response with non-existent challengeId', async () => {
      const response: ChallengeResponse = {
        challengeId: 'non-existent',
        agentSignature: 'a'.repeat(64),
        nonce: 'a'.repeat(32),
      };

      await expect(ths.respondToChallenge(response)).rejects.toThrow('No pending challenge');
    });

    it('should reject response with nonce mismatch', async () => {
      const manifest = createTestManifest('agent');
      const challenge = await ths.requestJoin(manifest);

      const mockCrypto = createMockCryptoProvider();
      const sig = await mockCrypto.sign(challenge.challengeBytes + 'wrong-nonce', 'key');

      const response: ChallengeResponse = {
        challengeId: challenge.challengeId,
        agentSignature: sig,
        nonce: 'different-nonce-1234567890',  // Does not match manifest nonce
      };

      await expect(ths.respondToChallenge(response)).rejects.toThrow('Nonce mismatch');
    });

    it('should reject already-trusted agent from re-joining', async () => {
      await joinAgentFully(ths, 'brittney');

      const manifest = createTestManifest('brittney');
      await expect(ths.requestJoin(manifest)).rejects.toThrow('already has an active trusted session');
    });

    it('should negotiate capabilities (intersection with defaults)', async () => {
      const { token } = await joinAgentFully(ths, 'agent');

      // Default caps: read_state, write_position, write_emotion
      // Requested: read_state, write_position, write_emotion
      expect(token.grantedCapabilities).toContain('read_state');
      expect(token.grantedCapabilities).toContain('write_position');
      expect(token.grantedCapabilities).toContain('write_emotion');
    });

    it('should not grant unrequested admin capability', async () => {
      const manifest = createTestManifest('agent', {
        requestedCapabilities: ['read_state', 'admin'],
      });
      const challenge = await ths.requestJoin(manifest);

      const mockCrypto = createMockCryptoProvider();
      const sig = await mockCrypto.sign(
        challenge.challengeBytes + manifest.nonce,
        'key',
      );

      const token = await ths.respondToChallenge({
        challengeId: challenge.challengeId,
        agentSignature: sig,
        nonce: manifest.nonce,
      });

      // Admin is not in default capabilities, so should not be granted
      expect(token.grantedCapabilities).not.toContain('admin');
      expect(token.grantedCapabilities).toContain('read_state');
    });

    it('should handle multiple agents joining simultaneously', async () => {
      const agents = ['brittney', 'builder', 'manager', 'researcher'];

      for (const agentId of agents) {
        await joinAgentFully(ths, agentId);
      }

      for (const agentId of agents) {
        expect(ths.isAgentTrusted(agentId)).toBe(true);
      }

      const trustedIds = ths.getTrustedAgentIds();
      expect(trustedIds).toHaveLength(4);
    });

    it('should call onAgentJoined callback', async () => {
      const onJoined = vi.fn();
      const custom = await createTrustHandshakeWithGenesis({ onAgentJoined: onJoined });

      await joinAgentFully(custom, 'brittney');

      expect(onJoined).toHaveBeenCalledWith('brittney', expect.any(Array));
      custom.dispose();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: INTERACT (Render-loop trust gate)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Phase 2: INTERACT', () => {
    beforeEach(async () => {
      ths = await createTrustHandshakeWithGenesis();
    });

    it('should return true for trusted agent', async () => {
      await joinAgentFully(ths, 'brittney');
      expect(ths.isAgentTrusted('brittney')).toBe(true);
    });

    it('should return false for unknown agent', () => {
      expect(ths.isAgentTrusted('unknown')).toBe(false);
    });

    it('should return false for pending agent', async () => {
      const manifest = createTestManifest('pending-agent');
      await ths.requestJoin(manifest);
      expect(ths.isAgentTrusted('pending-agent')).toBe(false);
    });

    it('should check capability: has granted capability', async () => {
      await joinAgentFully(ths, 'brittney');
      expect(ths.hasCapability('brittney', 'read_state')).toBe(true);
      expect(ths.hasCapability('brittney', 'write_position')).toBe(true);
    });

    it('should check capability: does not have ungranted capability', async () => {
      await joinAgentFully(ths, 'brittney');
      expect(ths.hasCapability('brittney', 'admin')).toBe(false);
      expect(ths.hasCapability('brittney', 'modify_world')).toBe(false);
    });

    it('should check capability: returns false for untrusted agent', () => {
      expect(ths.hasCapability('unknown', 'read_state')).toBe(false);
    });

    it('should return trust score of 1.0 for freshly joined agent', async () => {
      await joinAgentFully(ths, 'brittney');
      expect(ths.getAgentTrustScore('brittney')).toBe(1.0);
    });

    it('should return trust score of 0 for unknown agent', () => {
      expect(ths.getAgentTrustScore('unknown')).toBe(0);
    });

    it('should return trust level "none" for unknown agent', () => {
      expect(ths.getAgentTrustLevel('unknown')).toBe('none');
    });

    it('should provide full trust state', async () => {
      await joinAgentFully(ths, 'brittney');
      const state = ths.getCurrentTrustState();

      expect(state.genesisComplete).toBe(true);
      expect(state.agents['brittney']).toBeDefined();
      expect(state.agents['brittney'].trustLevel).toBe('trusted');
      expect(state.trustCounts.trusted).toBe(1);
    });

    it('isAgentTrusted should be fast (render-loop budget test)', async () => {
      // Join 50 agents
      for (let i = 0; i < 50; i++) {
        await joinAgentFully(ths, `agent-${i}`);
      }

      // Measure 1000 trust checks
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        ths.isAgentTrusted(`agent-${i % 50}`);
      }
      const duration = performance.now() - start;

      // 1000 checks should take well under 1ms
      // (typically <0.1ms for cache reads)
      expect(duration).toBeLessThan(10); // generous bound for CI
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3: REFRESH
  // ─────────────────────────────────────────────────────────────────────────

  describe('Phase 3: REFRESH', () => {
    beforeEach(async () => {
      ths = await createTrustHandshakeWithGenesis();
    });

    it('should refresh session and issue new token', async () => {
      const { token: oldToken } = await joinAgentFully(ths, 'brittney');

      // Advance time so the new token gets a different timestamp/ID
      vi.advanceTimersByTime(1000);

      const mockCrypto = createMockCryptoProvider();
      const sig = await mockCrypto.sign(oldToken.tokenId, 'agent-key');

      const newToken = await ths.refreshSession('brittney', sig);

      expect(newToken.tokenId).not.toBe(oldToken.tokenId);
      expect(newToken.refreshCount).toBe(1);
      expect(newToken.expiresAt).toBeGreaterThan(oldToken.expiresAt);
    });

    it('should reset trust score on refresh', async () => {
      await joinAgentFully(ths, 'brittney');

      // Manually check that trust score resets
      const mockCrypto = createMockCryptoProvider();
      const state = ths.getCurrentTrustState();
      const sig = await mockCrypto.sign(
        state.agents['brittney'].sessionToken!.tokenId,
        'key',
      );

      const newToken = await ths.refreshSession('brittney', sig);
      expect(newToken).toBeDefined();
      expect(ths.getAgentTrustScore('brittney')).toBe(1.0);
    });

    it('should throw if agent has no active session', async () => {
      await expect(ths.refreshSession('unknown', 'sig')).rejects.toThrow('No active session');
    });

    it('should throw if agent is revoked', async () => {
      await joinAgentFully(ths, 'brittney');
      ths.exitAgent('brittney', 'test');

      await expect(ths.refreshSession('brittney', 'sig')).rejects.toThrow('has been revoked');
    });

    it('should recover from degraded on successful refresh', async () => {
      const onChanged = vi.fn();
      const custom = await createTrustHandshakeWithGenesis({
        onTrustLevelChanged: onChanged,
        policy: {
          trustDecayRate: 1,          // 100% per second decay
          degradationThreshold: 0.5,  // Degrades at 0.5
          sessionTtlMs: 300000,       // Long TTL so it won't expire
          allowRecover: true,
        },
      });

      await joinAgentFully(custom, 'brittney');

      // Start trust checks which will decay the trust score
      custom.start();

      // Advance 600ms: score = 1 - 1.0*0.6 = 0.4 (below 0.5 threshold = degraded)
      // But NOT zero yet, so won't be revoked
      vi.advanceTimersByTime(600);

      expect(custom.getAgentTrustLevel('brittney')).toBe('degraded');

      // Now refresh to recover
      const mockCrypto = createMockCryptoProvider();
      const state = custom.getCurrentTrustState();
      const agent = state.agents['brittney'];

      expect(agent).toBeDefined();
      expect(agent.sessionToken).not.toBeNull();

      const sig = await mockCrypto.sign(agent.sessionToken!.tokenId, 'key');
      await custom.refreshSession('brittney', sig);

      expect(custom.getAgentTrustLevel('brittney')).toBe('trusted');
      expect(custom.getAgentTrustScore('brittney')).toBe(1.0);

      custom.dispose();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 4: EXIT
  // ─────────────────────────────────────────────────────────────────────────

  describe('Phase 4: EXIT', () => {
    beforeEach(async () => {
      ths = await createTrustHandshakeWithGenesis();
    });

    it('should revoke trust on exit', async () => {
      await joinAgentFully(ths, 'brittney');
      ths.exitAgent('brittney', 'voluntary');

      expect(ths.getAgentTrustLevel('brittney')).toBe('revoked');
      expect(ths.isAgentTrusted('brittney')).toBe(false);
    });

    it('should clear capabilities on exit', async () => {
      await joinAgentFully(ths, 'brittney');
      ths.exitAgent('brittney', 'voluntary');

      expect(ths.hasCapability('brittney', 'read_state')).toBe(false);
    });

    it('should set trust score to 0 on exit', async () => {
      await joinAgentFully(ths, 'brittney');
      ths.exitAgent('brittney', 'eviction');

      expect(ths.getAgentTrustScore('brittney')).toBe(0);
    });

    it('should handle exit of non-existent agent', () => {
      // Should not throw
      ths.exitAgent('nonexistent', 'test');
    });

    it('should call onAgentExited callback', async () => {
      const onExited = vi.fn();
      const custom = await createTrustHandshakeWithGenesis({ onAgentExited: onExited });

      await joinAgentFully(custom, 'brittney');
      custom.exitAgent('brittney', 'voluntary');

      expect(onExited).toHaveBeenCalledWith('brittney', 'voluntary');
      custom.dispose();
    });

    it('should call onTrustLevelChanged callback on exit', async () => {
      const onChanged = vi.fn();
      const custom = await createTrustHandshakeWithGenesis({
        onTrustLevelChanged: onChanged,
      });

      await joinAgentFully(custom, 'brittney');
      custom.exitAgent('brittney', 'test');

      expect(onChanged).toHaveBeenCalledWith('brittney', 'trusted', 'revoked');
      custom.dispose();
    });

    it('should update trust counts on exit', async () => {
      await joinAgentFully(ths, 'brittney');
      await joinAgentFully(ths, 'builder');

      expect(ths.getTrustCounts().trusted).toBe(2);

      ths.exitAgent('brittney', 'test');
      expect(ths.getTrustCounts().trusted).toBe(1);
      expect(ths.getTrustCounts().revoked).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TRUST CHECK LOOP
  // ─────────────────────────────────────────────────────────────────────────

  describe('Trust check loop', () => {
    it('should start and stop', async () => {
      ths = await createTrustHandshakeWithGenesis();
      ths.start();
      expect(ths.getIsRunning()).toBe(true);

      ths.stop();
      expect(ths.getIsRunning()).toBe(false);
    });

    it('should warn when starting while already running', async () => {
      ths = await createTrustHandshakeWithGenesis();
      ths.start();
      ths.start(); // Should warn, not error
      expect(ths.getIsRunning()).toBe(true);
    });

    it('should expire sessions after TTL', async () => {
      ths = await createTrustHandshakeWithGenesis({
        policy: { sessionTtlMs: 1000 }, // 1 second TTL for testing
      });

      await joinAgentFully(ths, 'brittney');
      expect(ths.isAgentTrusted('brittney')).toBe(true);

      ths.start();

      // Advance time past TTL
      vi.advanceTimersByTime(1500);

      expect(ths.isAgentTrusted('brittney')).toBe(false);
      expect(ths.getAgentTrustLevel('brittney')).toBe('revoked');
    });

    it('should expire pending challenges', async () => {
      ths = await createTrustHandshakeWithGenesis({
        policy: { challengeTimeoutMs: 500 }, // 500ms timeout
      });

      const manifest = createTestManifest('slow-agent');
      await ths.requestJoin(manifest);
      expect(ths.getAgentTrustLevel('slow-agent')).toBe('pending');

      ths.start();

      // Advance past challenge timeout
      vi.advanceTimersByTime(1000);

      expect(ths.getAgentTrustLevel('slow-agent')).toBe('revoked');
    });

    it('should decay trust scores', async () => {
      ths = await createTrustHandshakeWithGenesis({
        policy: {
          trustDecayRate: 0.1,        // 10% per second
          degradationThreshold: 0.5,
          sessionTtlMs: 300000,       // 5 min TTL (won't expire)
        },
      });

      await joinAgentFully(ths, 'brittney');
      ths.start();

      // After 6 seconds: score = 1 - 0.1*6 = 0.4 (below 0.5 threshold)
      vi.advanceTimersByTime(6000);

      // Should be degraded (score < 0.5)
      expect(ths.getAgentTrustLevel('brittney')).toBe('degraded');
    });

    it('should clean up revoked agents after delay', async () => {
      ths = await createTrustHandshakeWithGenesis();

      await joinAgentFully(ths, 'brittney');
      ths.exitAgent('brittney', 'test');

      ths.start();

      // After 2+ seconds, revoked agent should be cleaned up
      vi.advanceTimersByTime(3000);

      const state = ths.getCurrentTrustState();
      expect(state.agents['brittney']).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('should dispose cleanly', async () => {
      ths = await createTrustHandshakeWithGenesis();
      ths.start();
      await joinAgentFully(ths, 'brittney');

      ths.dispose();

      expect(ths.getIsRunning()).toBe(false);
    });

    it('should provide buffer access', async () => {
      ths = await createTrustHandshakeWithGenesis();
      const buffer = ths.getBuffer();
      expect(buffer).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should track join requests', async () => {
      ths = await createTrustHandshakeWithGenesis();

      await joinAgentFully(ths, 'brittney');
      await joinAgentFully(ths, 'builder');

      const metrics = ths.getMetrics();
      expect(metrics.totalJoinRequests).toBe(2);
      expect(metrics.totalSuccessfulJoins).toBe(2);
    });

    it('should track failed joins', async () => {
      ths = await createTrustHandshakeWithGenesis();

      try {
        await ths.requestJoin(createTestManifest('', { agentId: '' }));
      } catch {
        // Expected
      }

      const metrics = ths.getMetrics();
      expect(metrics.totalFailedJoins).toBe(1);
    });

    it('should track revocations', async () => {
      ths = await createTrustHandshakeWithGenesis();

      await joinAgentFully(ths, 'brittney');
      ths.exitAgent('brittney', 'test');

      const metrics = ths.getMetrics();
      expect(metrics.totalRevocations).toBe(1);
    });

    it('should report genesis state', async () => {
      ths = new VRTrustHandshake({
        worldId: 'test',
        crypto: createMockCryptoProvider(),
      });

      expect(ths.getMetrics().genesisComplete).toBe(false);

      await ths.genesis();
      expect(ths.getMetrics().genesisComplete).toBe(true);
    });

    it('should report running state', async () => {
      ths = await createTrustHandshakeWithGenesis();

      expect(ths.getMetrics().isRunning).toBe(false);
      ths.start();
      expect(ths.getMetrics().isRunning).toBe(true);
    });

    it('should report trust counts', async () => {
      ths = await createTrustHandshakeWithGenesis();

      await joinAgentFully(ths, 'a');
      await joinAgentFully(ths, 'b');

      const manifest = createTestManifest('c');
      await ths.requestJoin(manifest); // pending

      const metrics = ths.getMetrics();
      expect(metrics.trustCounts.trusted).toBe(2);
      expect(metrics.trustCounts.pending).toBe(1);
    });

    it('should track check Hz', async () => {
      ths = await createTrustHandshakeWithGenesis({ checkHz: 20 });
      expect(ths.getMetrics().checkHz).toBe(20);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DEFAULT TRUST POLICY
  // ─────────────────────────────────────────────────────────────────────────

  describe('trust policy', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_TRUST_POLICY.sessionTtlMs).toBe(5 * 60 * 1000);
      expect(DEFAULT_TRUST_POLICY.refreshWindowMs).toBe(30 * 1000);
      expect(DEFAULT_TRUST_POLICY.maxFailedRefreshes).toBe(3);
      expect(DEFAULT_TRUST_POLICY.challengeTimeoutMs).toBe(10 * 1000);
      expect(DEFAULT_TRUST_POLICY.trustDecayRate).toBe(0.01);
      expect(DEFAULT_TRUST_POLICY.degradationThreshold).toBe(0.5);
      expect(DEFAULT_TRUST_POLICY.allowRecover).toBe(true);
    });

    it('should include basic capabilities in defaults', () => {
      expect(DEFAULT_TRUST_POLICY.defaultCapabilities).toContain('read_state');
      expect(DEFAULT_TRUST_POLICY.defaultCapabilities).toContain('write_position');
      expect(DEFAULT_TRUST_POLICY.defaultCapabilities).toContain('write_emotion');
    });

    it('should override policy via config', async () => {
      ths = await createTrustHandshakeWithGenesis({
        policy: {
          sessionTtlMs: 1000,
          maxFailedRefreshes: 1,
          defaultCapabilities: ['read_state'] as AgentCapability[],
        },
      });

      const state = ths.getCurrentTrustState();
      expect(state.policy.sessionTtlMs).toBe(1000);
      expect(state.policy.maxFailedRefreshes).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    beforeEach(async () => {
      ths = await createTrustHandshakeWithGenesis();
    });

    it('should handle rapid join/exit cycles', async () => {
      for (let i = 0; i < 10; i++) {
        await joinAgentFully(ths, `cycle-${i}`);
        ths.exitAgent(`cycle-${i}`, 'cycle');
      }

      const metrics = ths.getMetrics();
      expect(metrics.totalSuccessfulJoins).toBe(10);
      expect(metrics.totalRevocations).toBe(10);
    });

    it('should handle concurrent join requests from different agents', async () => {
      const manifests = Array.from({ length: 20 }, (_, i) =>
        createTestManifest(`concurrent-${i}`),
      );

      // Issue all challenges concurrently
      const challenges = await Promise.all(
        manifests.map(m => ths.requestJoin(m)),
      );

      // Respond to all challenges concurrently
      const mockCrypto = createMockCryptoProvider();
      const tokens = await Promise.all(
        challenges.map(async (challenge, i) => {
          const sig = await mockCrypto.sign(
            challenge.challengeBytes + manifests[i].nonce,
            'key',
          );
          return ths.respondToChallenge({
            challengeId: challenge.challengeId,
            agentSignature: sig,
            nonce: manifests[i].nonce,
          });
        }),
      );

      expect(tokens).toHaveLength(20);
      expect(ths.getTrustedAgentIds()).toHaveLength(20);
    });

    it('should handle getTrustedAgentIds with mixed trust levels', async () => {
      await joinAgentFully(ths, 'trusted-1');
      await joinAgentFully(ths, 'trusted-2');
      await joinAgentFully(ths, 'will-exit');

      const manifest = createTestManifest('pending-1');
      await ths.requestJoin(manifest);

      ths.exitAgent('will-exit', 'test');

      const trustedIds = ths.getTrustedAgentIds();
      expect(trustedIds).toContain('trusted-1');
      expect(trustedIds).toContain('trusted-2');
      expect(trustedIds).not.toContain('will-exit');
      expect(trustedIds).not.toContain('pending-1');
    });
  });
});
