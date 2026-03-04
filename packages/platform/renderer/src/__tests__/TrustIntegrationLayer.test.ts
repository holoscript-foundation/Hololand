/**
 * @vitest-environment jsdom
 */

/**
 * Tests for TrustIntegrationLayer
 *
 * Validates all three wiring paths:
 * - Path 1: VRTrustHandshake.onTrustLevelChanged -> GossipTrustMesh.onLocalTrustChange()
 * - Path 2: GossipTrustMesh.onRemoteTrustUpdate -> VRTrustHandshake.exitAgent()
 * - Path 3a: BehavioralTrustScoring.onTrustAction('revoke') -> VRTrustHandshake.exitAgent()
 * - Path 3b: BehavioralTrustScoring.onTrustAction('degrade') -> logged
 * - Path 3c: BehavioralTrustScoring.onTrustAction('recover') -> logged
 * - Unified TrustMetrics aggregation
 * - Lifecycle: start()/stop()/dispose()
 * - Factory function with proper callback wiring
 * - Error handling in wiring paths
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
  TrustIntegrationLayer,
  createTrustIntegrationLayer,
  type TrustIntegrationLayerConfig,
  type TrustIntegrationEvent,
  type TrustMetrics,
  type TrustIntegrationFactoryConfig,
} from '../TrustIntegrationLayer';

import {
  VRTrustHandshake,
  DefaultTrustCryptoProvider,
  type TrustLevel,
  type AgentManifest,
} from '../VRTrustHandshake';

import {
  GossipTrustMesh,
  type TrustUpdate,
  type GossipMessage,
} from '../GossipTrustMesh';

import {
  BehavioralTrustScoring,
  type TrustAction,
  type TrustActionDetails,
} from '../BehavioralTrustScoring';

// =============================================================================
// TEST HELPERS
// =============================================================================

const cryptoProvider = new DefaultTrustCryptoProvider();

function createTestManifest(agentId: string): AgentManifest {
  return {
    agentId,
    name: `Agent ${agentId}`,
    publicKey: cryptoProvider.randomBytes(32),
    requestedCapabilities: ['read_state', 'write_position'],
    protocolVersion: '1.0',
    nonce: cryptoProvider.randomBytes(32),
    timestamp: Date.now(),
  };
}

function createTestTrustHandshake(
  onTrustLevelChanged?: (agentId: string, oldLevel: TrustLevel, newLevel: TrustLevel) => void,
  onAgentExited?: (agentId: string, reason: string) => void,
): VRTrustHandshake {
  return new VRTrustHandshake({
    worldId: 'test-world',
    autoStart: false,
    crypto: cryptoProvider,
    onTrustLevelChanged: onTrustLevelChanged ?? (() => {}),
    onAgentExited: onAgentExited ?? (() => {}),
  });
}

function createTestGossipMesh(
  onRemoteTrustUpdate?: (update: TrustUpdate) => void,
): GossipTrustMesh {
  return new GossipTrustMesh({
    nodeId: 'test-node',
    onRemoteTrustUpdate: onRemoteTrustUpdate ?? (() => {}),
  });
}

function createTestBehavioralScoring(
  onTrustAction?: (agentId: string, action: TrustAction, compositeScore: number, details: TrustActionDetails) => void,
): BehavioralTrustScoring {
  return new BehavioralTrustScoring({
    autoStart: false,
    onTrustAction: onTrustAction ?? (() => {}),
  });
}

function createTestLayer(overrides?: Partial<TrustIntegrationLayerConfig>): {
  layer: TrustIntegrationLayer;
  trustHandshake: VRTrustHandshake;
  gossipMesh: GossipTrustMesh;
  behavioralScoring: BehavioralTrustScoring;
} {
  const trustHandshake = overrides?.trustHandshake ?? createTestTrustHandshake();
  const gossipMesh = overrides?.gossipMesh ?? createTestGossipMesh();
  const behavioralScoring = overrides?.behavioralScoring ?? createTestBehavioralScoring();

  const layer = new TrustIntegrationLayer({
    trustHandshake,
    gossipMesh,
    behavioralScoring,
    onIntegrationEvent: overrides?.onIntegrationEvent,
  });

  return { layer, trustHandshake, gossipMesh, behavioralScoring };
}

async function joinAgentToWorld(
  trustHandshake: VRTrustHandshake,
  agentId: string,
): Promise<void> {
  const manifest = createTestManifest(agentId);
  const challenge = await trustHandshake.requestJoin(manifest);
  await trustHandshake.respondToChallenge({
    challengeId: challenge.challengeId,
    agentSignature: cryptoProvider.randomBytes(32),
    nonce: manifest.nonce,
  });
}

// =============================================================================
// TESTS: CONSTRUCTOR AND INITIALIZATION
// =============================================================================

describe('TrustIntegrationLayer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should accept all three trust subsystem instances', () => {
      const { layer, trustHandshake, gossipMesh, behavioralScoring } = createTestLayer();

      expect(layer.getTrustHandshake()).toBe(trustHandshake);
      expect(layer.getGossipMesh()).toBe(gossipMesh);
      expect(layer.getBehavioralScoring()).toBe(behavioralScoring);
    });

    it('should not be running after construction', () => {
      const { layer } = createTestLayer();
      expect(layer.getIsRunning()).toBe(false);
    });

    it('should accept optional onIntegrationEvent callback', () => {
      const callback = vi.fn();
      const { layer } = createTestLayer({ onIntegrationEvent: callback });
      expect(layer).toBeDefined();
    });
  });

  // ===========================================================================
  // TESTS: WIRING PATH 1 (VRTrustHandshake -> GossipTrustMesh)
  // ===========================================================================

  describe('Path 1: VRTrustHandshake -> GossipTrustMesh', () => {
    it('should propagate trust level changes to gossip mesh via handleLocalTrustChange', async () => {
      const gossipMesh = createTestGossipMesh();
      const onLocalTrustChangeSpy = vi.spyOn(gossipMesh, 'onLocalTrustChange');

      const trustHandshake = createTestTrustHandshake();
      const { layer } = createTestLayer({ trustHandshake, gossipMesh });

      await trustHandshake.genesis();
      await joinAgentToWorld(trustHandshake, 'agent-1');

      // Manually trigger the wiring path
      layer.handleLocalTrustChange('agent-1', 'none', 'trusted');

      expect(onLocalTrustChangeSpy).toHaveBeenCalledWith(
        'agent-1',
        'trusted',
        expect.any(Number),
        expect.any(Array),
        expect.any(String),
      );
    });

    it('should propagate revocation events to gossip mesh', async () => {
      const gossipMesh = createTestGossipMesh();
      const onLocalTrustChangeSpy = vi.spyOn(gossipMesh, 'onLocalTrustChange');

      const trustHandshake = createTestTrustHandshake();
      const { layer } = createTestLayer({ trustHandshake, gossipMesh });

      await trustHandshake.genesis();
      await joinAgentToWorld(trustHandshake, 'agent-1');

      // Trigger revocation
      layer.handleLocalTrustChange('agent-1', 'trusted', 'revoked');

      expect(onLocalTrustChangeSpy).toHaveBeenCalledWith(
        'agent-1',
        'revoked',
        expect.any(Number),
        expect.any(Array),
        expect.any(String),
      );
    });

    it('should increment gossip propagation counter', () => {
      const { layer } = createTestLayer();

      layer.handleLocalTrustChange('agent-1', 'none', 'trusted');

      const metrics = layer.getMetrics();
      expect(metrics.integration.totalGossipPropagations).toBe(1);
    });

    it('should emit gossip_propagation integration event', () => {
      const callback = vi.fn();
      const { layer } = createTestLayer({ onIntegrationEvent: callback });

      layer.handleLocalTrustChange('agent-1', 'none', 'trusted');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'gossip_propagation',
          agentId: 'agent-1',
          details: expect.objectContaining({
            oldLevel: 'none',
            newLevel: 'trusted',
          }),
        }),
      );
    });

    it('should handle errors in gossip propagation gracefully', () => {
      const gossipMesh = createTestGossipMesh();
      vi.spyOn(gossipMesh, 'onLocalTrustChange').mockImplementation(() => {
        throw new Error('Gossip send failed');
      });

      const { layer } = createTestLayer({ gossipMesh });

      // Should not throw
      expect(() => layer.handleLocalTrustChange('agent-1', 'none', 'trusted')).not.toThrow();

      const metrics = layer.getMetrics();
      expect(metrics.integration.totalWiringErrors).toBe(1);
    });

    it('should emit wiring_error event on gossip propagation failure', () => {
      const callback = vi.fn();
      const gossipMesh = createTestGossipMesh();
      vi.spyOn(gossipMesh, 'onLocalTrustChange').mockImplementation(() => {
        throw new Error('Network error');
      });

      const { layer } = createTestLayer({ gossipMesh, onIntegrationEvent: callback });

      layer.handleLocalTrustChange('agent-1', 'none', 'trusted');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wiring_error',
          agentId: 'agent-1',
          details: expect.objectContaining({
            path: 'handshake_to_gossip',
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // TESTS: WIRING PATH 2 (GossipTrustMesh -> VRTrustHandshake)
  // ===========================================================================

  describe('Path 2: GossipTrustMesh -> VRTrustHandshake', () => {
    it('should apply remote revocation to local trust handshake', async () => {
      const trustHandshake = createTestTrustHandshake();
      const exitAgentSpy = vi.spyOn(trustHandshake, 'exitAgent');

      const { layer } = createTestLayer({ trustHandshake });

      await trustHandshake.genesis();
      await joinAgentToWorld(trustHandshake, 'agent-1');

      // Verify agent is trusted
      expect(trustHandshake.isAgentTrusted('agent-1')).toBe(true);

      // Simulate remote revocation via gossip
      const remoteUpdate: TrustUpdate = {
        updateId: 'remote-update-1',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Session expired on remote node',
        originNodeId: 'remote-node-1',
        vectorClock: { 'remote-node-1': 1 },
        timestamp: Date.now(),
        ttl: 10,
      };

      layer.handleRemoteTrustUpdate(remoteUpdate);

      expect(exitAgentSpy).toHaveBeenCalledWith(
        'agent-1',
        expect.stringContaining('Remote revocation from node remote-node-1'),
      );
    });

    it('should NOT apply non-revocation updates from gossip', async () => {
      const trustHandshake = createTestTrustHandshake();
      const exitAgentSpy = vi.spyOn(trustHandshake, 'exitAgent');

      const { layer } = createTestLayer({ trustHandshake });

      await trustHandshake.genesis();
      await joinAgentToWorld(trustHandshake, 'agent-1');

      // Simulate remote degradation (should not trigger exitAgent)
      const remoteUpdate: TrustUpdate = {
        updateId: 'remote-update-2',
        agentId: 'agent-1',
        trustLevel: 'degraded',
        trustScore: 0.4,
        grantedCapabilities: ['read_state'],
        reason: 'Trust score low',
        originNodeId: 'remote-node-1',
        vectorClock: { 'remote-node-1': 2 },
        timestamp: Date.now(),
        ttl: 10,
      };

      layer.handleRemoteTrustUpdate(remoteUpdate);

      expect(exitAgentSpy).not.toHaveBeenCalled();
    });

    it('should NOT apply revocation for agents not in the local handshake', () => {
      const trustHandshake = createTestTrustHandshake();
      const exitAgentSpy = vi.spyOn(trustHandshake, 'exitAgent');

      const { layer } = createTestLayer({ trustHandshake });

      // Agent 'unknown' has trust level 'none' (not in the system)
      const remoteUpdate: TrustUpdate = {
        updateId: 'remote-update-3',
        agentId: 'unknown-agent',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Unknown agent',
        originNodeId: 'remote-node-1',
        vectorClock: { 'remote-node-1': 3 },
        timestamp: Date.now(),
        ttl: 10,
      };

      layer.handleRemoteTrustUpdate(remoteUpdate);

      // Should not call exitAgent since the agent is not locally known
      expect(exitAgentSpy).not.toHaveBeenCalled();
    });

    it('should NOT re-apply revocation for already-revoked agents', async () => {
      const trustHandshake = createTestTrustHandshake();
      const { layer } = createTestLayer({ trustHandshake });

      await trustHandshake.genesis();
      await joinAgentToWorld(trustHandshake, 'agent-1');

      // First, exit the agent locally
      trustHandshake.exitAgent('agent-1', 'local revocation');

      const exitAgentSpy = vi.spyOn(trustHandshake, 'exitAgent');

      // Now try remote revocation on the already-revoked agent
      const remoteUpdate: TrustUpdate = {
        updateId: 'remote-update-4',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Duplicate revocation',
        originNodeId: 'remote-node-1',
        vectorClock: { 'remote-node-1': 4 },
        timestamp: Date.now(),
        ttl: 10,
      };

      layer.handleRemoteTrustUpdate(remoteUpdate);

      // Should not call exitAgent again since already revoked
      expect(exitAgentSpy).not.toHaveBeenCalled();
    });

    it('should increment remote revocation counter', async () => {
      const trustHandshake = createTestTrustHandshake();
      const { layer } = createTestLayer({ trustHandshake });

      await trustHandshake.genesis();
      await joinAgentToWorld(trustHandshake, 'agent-1');

      const remoteUpdate: TrustUpdate = {
        updateId: 'remote-update-5',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Test',
        originNodeId: 'remote-node-1',
        vectorClock: { 'remote-node-1': 5 },
        timestamp: Date.now(),
        ttl: 10,
      };

      layer.handleRemoteTrustUpdate(remoteUpdate);

      const metrics = layer.getMetrics();
      expect(metrics.integration.totalRemoteRevocationsApplied).toBe(1);
    });

    it('should emit remote_revocation integration event', async () => {
      const callback = vi.fn();
      const trustHandshake = createTestTrustHandshake();
      const { layer } = createTestLayer({ trustHandshake, onIntegrationEvent: callback });

      await trustHandshake.genesis();
      await joinAgentToWorld(trustHandshake, 'agent-1');

      const remoteUpdate: TrustUpdate = {
        updateId: 'remote-update-6',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Remote test reason',
        originNodeId: 'remote-node-1',
        vectorClock: { 'remote-node-1': 6 },
        timestamp: Date.now(),
        ttl: 10,
      };

      layer.handleRemoteTrustUpdate(remoteUpdate);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'remote_revocation',
          agentId: 'agent-1',
          details: expect.objectContaining({
            originNodeId: 'remote-node-1',
            reason: 'Remote test reason',
            previousLocalLevel: 'trusted',
          }),
        }),
      );
    });

    it('should handle errors in remote revocation gracefully', async () => {
      const trustHandshake = createTestTrustHandshake();
      const { layer } = createTestLayer({ trustHandshake });

      await trustHandshake.genesis();
      await joinAgentToWorld(trustHandshake, 'agent-1');

      // Make exitAgent throw
      vi.spyOn(trustHandshake, 'exitAgent').mockImplementation(() => {
        throw new Error('Exit failed');
      });

      const remoteUpdate: TrustUpdate = {
        updateId: 'remote-update-7',
        agentId: 'agent-1',
        trustLevel: 'revoked',
        trustScore: 0,
        grantedCapabilities: [],
        reason: 'Test',
        originNodeId: 'remote-node-1',
        vectorClock: { 'remote-node-1': 7 },
        timestamp: Date.now(),
        ttl: 10,
      };

      expect(() => layer.handleRemoteTrustUpdate(remoteUpdate)).not.toThrow();

      const metrics = layer.getMetrics();
      expect(metrics.integration.totalWiringErrors).toBe(1);
    });
  });

  // ===========================================================================
  // TESTS: WIRING PATH 3 (BehavioralTrustScoring -> VRTrustHandshake)
  // ===========================================================================

  describe('Path 3a: BehavioralTrustScoring revoke -> VRTrustHandshake.exitAgent()', () => {
    it('should call exitAgent when behavioral scoring triggers revoke', async () => {
      const trustHandshake = createTestTrustHandshake();
      const exitAgentSpy = vi.spyOn(trustHandshake, 'exitAgent');

      const { layer } = createTestLayer({ trustHandshake });

      await trustHandshake.genesis();
      await joinAgentToWorld(trustHandshake, 'agent-1');

      const details: TrustActionDetails = {
        action: 'revoke',
        compositeScore: 0.15,
        dimensionScores: {
          spatial_compliance: 0.1,
          physics_adherence: 0.2,
          interaction_appropriateness: 0.1,
          temporal_consistency: 0.2,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: ['spatial_compliance: 5 violations'],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'revoke', 0.15, details);

      expect(exitAgentSpy).toHaveBeenCalledWith(
        'agent-1',
        expect.stringContaining('Behavioral violation'),
      );
    });

    it('should increment behavioral revocations counter', () => {
      const { layer } = createTestLayer();

      const details: TrustActionDetails = {
        action: 'revoke',
        compositeScore: 0.15,
        dimensionScores: {
          spatial_compliance: 0.1,
          physics_adherence: 0.2,
          interaction_appropriateness: 0.1,
          temporal_consistency: 0.2,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: [],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'revoke', 0.15, details);

      const metrics = layer.getMetrics();
      expect(metrics.integration.totalBehavioralRevocations).toBe(1);
    });

    it('should emit behavioral_revoke integration event', () => {
      const callback = vi.fn();
      const { layer } = createTestLayer({ onIntegrationEvent: callback });

      const details: TrustActionDetails = {
        action: 'revoke',
        compositeScore: 0.15,
        dimensionScores: {
          spatial_compliance: 0.1,
          physics_adherence: 0.2,
          interaction_appropriateness: 0.1,
          temporal_consistency: 0.2,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: ['spatial_compliance: 5 violations'],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'revoke', 0.15, details);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'behavioral_revoke',
          agentId: 'agent-1',
          details: expect.objectContaining({
            compositeScore: 0.15,
            primaryCause: 'spatial_compliance',
          }),
        }),
      );
    });
  });

  describe('Path 3b: BehavioralTrustScoring degrade', () => {
    it('should increment behavioral degrades counter', () => {
      const { layer } = createTestLayer();

      const details: TrustActionDetails = {
        action: 'degrade',
        compositeScore: 0.4,
        dimensionScores: {
          spatial_compliance: 0.3,
          physics_adherence: 0.5,
          interaction_appropriateness: 0.4,
          temporal_consistency: 0.4,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: [],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'degrade', 0.4, details);

      const metrics = layer.getMetrics();
      expect(metrics.integration.totalBehavioralDegrades).toBe(1);
    });

    it('should NOT call exitAgent for degrade action', () => {
      const trustHandshake = createTestTrustHandshake();
      const exitAgentSpy = vi.spyOn(trustHandshake, 'exitAgent');

      const { layer } = createTestLayer({ trustHandshake });

      const details: TrustActionDetails = {
        action: 'degrade',
        compositeScore: 0.4,
        dimensionScores: {
          spatial_compliance: 0.3,
          physics_adherence: 0.5,
          interaction_appropriateness: 0.4,
          temporal_consistency: 0.4,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: [],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'degrade', 0.4, details);

      expect(exitAgentSpy).not.toHaveBeenCalled();
    });

    it('should emit behavioral_degrade integration event', () => {
      const callback = vi.fn();
      const { layer } = createTestLayer({ onIntegrationEvent: callback });

      const details: TrustActionDetails = {
        action: 'degrade',
        compositeScore: 0.4,
        dimensionScores: {
          spatial_compliance: 0.3,
          physics_adherence: 0.5,
          interaction_appropriateness: 0.4,
          temporal_consistency: 0.4,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: [],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'degrade', 0.4, details);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'behavioral_degrade',
          agentId: 'agent-1',
        }),
      );
    });
  });

  describe('Path 3c: BehavioralTrustScoring recover', () => {
    it('should increment behavioral recoveries counter', () => {
      const { layer } = createTestLayer();

      const details: TrustActionDetails = {
        action: 'recover',
        compositeScore: 0.85,
        dimensionScores: {
          spatial_compliance: 0.9,
          physics_adherence: 0.85,
          interaction_appropriateness: 0.8,
          temporal_consistency: 0.85,
        },
        primaryCause: 'interaction_appropriateness',
        recentViolations: [],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'recover', 0.85, details);

      const metrics = layer.getMetrics();
      expect(metrics.integration.totalBehavioralRecoveries).toBe(1);
    });

    it('should NOT call exitAgent for recover action', () => {
      const trustHandshake = createTestTrustHandshake();
      const exitAgentSpy = vi.spyOn(trustHandshake, 'exitAgent');

      const { layer } = createTestLayer({ trustHandshake });

      const details: TrustActionDetails = {
        action: 'recover',
        compositeScore: 0.85,
        dimensionScores: {
          spatial_compliance: 0.9,
          physics_adherence: 0.85,
          interaction_appropriateness: 0.8,
          temporal_consistency: 0.85,
        },
        primaryCause: 'interaction_appropriateness',
        recentViolations: [],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'recover', 0.85, details);

      expect(exitAgentSpy).not.toHaveBeenCalled();
    });

    it('should emit behavioral_recover integration event', () => {
      const callback = vi.fn();
      const { layer } = createTestLayer({ onIntegrationEvent: callback });

      const details: TrustActionDetails = {
        action: 'recover',
        compositeScore: 0.85,
        dimensionScores: {
          spatial_compliance: 0.9,
          physics_adherence: 0.85,
          interaction_appropriateness: 0.8,
          temporal_consistency: 0.85,
        },
        primaryCause: 'interaction_appropriateness',
        recentViolations: [],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'recover', 0.85, details);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'behavioral_recover',
          agentId: 'agent-1',
        }),
      );
    });
  });

  describe('Path 3 error handling', () => {
    it('should handle errors in behavioral trust action gracefully', async () => {
      const trustHandshake = createTestTrustHandshake();
      vi.spyOn(trustHandshake, 'exitAgent').mockImplementation(() => {
        throw new Error('Exit failed');
      });

      const { layer } = createTestLayer({ trustHandshake });

      const details: TrustActionDetails = {
        action: 'revoke',
        compositeScore: 0.1,
        dimensionScores: {
          spatial_compliance: 0.1,
          physics_adherence: 0.1,
          interaction_appropriateness: 0.1,
          temporal_consistency: 0.1,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: [],
        timestamp: Date.now(),
      };

      expect(() => layer.handleBehavioralTrustAction('agent-1', 'revoke', 0.1, details)).not.toThrow();

      const metrics = layer.getMetrics();
      expect(metrics.integration.totalWiringErrors).toBe(1);
    });

    it('should emit wiring_error event on behavioral action failure', () => {
      const callback = vi.fn();
      const trustHandshake = createTestTrustHandshake();
      vi.spyOn(trustHandshake, 'exitAgent').mockImplementation(() => {
        throw new Error('Exit failed');
      });

      const { layer } = createTestLayer({ trustHandshake, onIntegrationEvent: callback });

      const details: TrustActionDetails = {
        action: 'revoke',
        compositeScore: 0.1,
        dimensionScores: {
          spatial_compliance: 0.1,
          physics_adherence: 0.1,
          interaction_appropriateness: 0.1,
          temporal_consistency: 0.1,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: [],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'revoke', 0.1, details);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wiring_error',
          agentId: 'agent-1',
          details: expect.objectContaining({
            path: 'behavioral_to_handshake',
            action: 'revoke',
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // TESTS: UNIFIED TRUST METRICS
  // ===========================================================================

  describe('Unified TrustMetrics', () => {
    it('should aggregate metrics from all three subsystems', () => {
      const { layer } = createTestLayer();

      const metrics: TrustMetrics = layer.getMetrics();

      // Should have all three subsystem metrics
      expect(metrics.handshake).toBeDefined();
      expect(metrics.gossip).toBeDefined();
      expect(metrics.behavioral).toBeDefined();
      expect(metrics.integration).toBeDefined();

      // Integration metrics should be zeroed initially
      expect(metrics.integration.isRunning).toBe(false);
      expect(metrics.integration.totalGossipPropagations).toBe(0);
      expect(metrics.integration.totalRemoteRevocationsApplied).toBe(0);
      expect(metrics.integration.totalBehavioralRevocations).toBe(0);
      expect(metrics.integration.totalBehavioralDegrades).toBe(0);
      expect(metrics.integration.totalBehavioralRecoveries).toBe(0);
      expect(metrics.integration.totalWiringErrors).toBe(0);
    });

    it('should include a timestamp', () => {
      const { layer } = createTestLayer();
      const before = Date.now();
      const metrics = layer.getMetrics();
      const after = Date.now();

      expect(metrics.timestamp).toBeGreaterThanOrEqual(before);
      expect(metrics.timestamp).toBeLessThanOrEqual(after);
    });

    it('should reflect accumulated integration counters', () => {
      const { layer } = createTestLayer();

      // Trigger various actions
      layer.handleLocalTrustChange('agent-1', 'none', 'trusted');
      layer.handleLocalTrustChange('agent-2', 'none', 'trusted');

      const details: TrustActionDetails = {
        action: 'degrade',
        compositeScore: 0.4,
        dimensionScores: {
          spatial_compliance: 0.3,
          physics_adherence: 0.5,
          interaction_appropriateness: 0.4,
          temporal_consistency: 0.4,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: [],
        timestamp: Date.now(),
      };

      layer.handleBehavioralTrustAction('agent-1', 'degrade', 0.4, details);

      const metrics = layer.getMetrics();
      expect(metrics.integration.totalGossipPropagations).toBe(2);
      expect(metrics.integration.totalBehavioralDegrades).toBe(1);
    });
  });

  // ===========================================================================
  // TESTS: LIFECYCLE
  // ===========================================================================

  describe('Lifecycle: start()', () => {
    it('should start all three subsystems', () => {
      const trustHandshake = createTestTrustHandshake();
      const gossipMesh = createTestGossipMesh();
      const behavioralScoring = createTestBehavioralScoring();

      const startHandshakeSpy = vi.spyOn(trustHandshake, 'start');
      const startGossipSpy = vi.spyOn(gossipMesh, 'start');
      const startBehavioralSpy = vi.spyOn(behavioralScoring, 'start');

      const { layer } = createTestLayer({ trustHandshake, gossipMesh, behavioralScoring });

      layer.start();

      expect(startHandshakeSpy).toHaveBeenCalled();
      expect(startGossipSpy).toHaveBeenCalled();
      expect(startBehavioralSpy).toHaveBeenCalled();
      expect(layer.getIsRunning()).toBe(true);

      layer.stop();
    });

    it('should be idempotent (no-op if already running)', () => {
      const trustHandshake = createTestTrustHandshake();
      const startSpy = vi.spyOn(trustHandshake, 'start');

      const { layer } = createTestLayer({ trustHandshake });

      layer.start();
      layer.start(); // Second call should be no-op

      // start on handshake is called once (second layer.start() is gated)
      expect(startSpy).toHaveBeenCalledTimes(1);

      layer.stop();
    });
  });

  describe('Lifecycle: stop()', () => {
    it('should stop all three subsystems', () => {
      const trustHandshake = createTestTrustHandshake();
      const gossipMesh = createTestGossipMesh();
      const behavioralScoring = createTestBehavioralScoring();

      const stopHandshakeSpy = vi.spyOn(trustHandshake, 'stop');
      const stopGossipSpy = vi.spyOn(gossipMesh, 'stop');
      const stopBehavioralSpy = vi.spyOn(behavioralScoring, 'stop');

      const { layer } = createTestLayer({ trustHandshake, gossipMesh, behavioralScoring });

      layer.start();
      layer.stop();

      expect(stopHandshakeSpy).toHaveBeenCalled();
      expect(stopGossipSpy).toHaveBeenCalled();
      expect(stopBehavioralSpy).toHaveBeenCalled();
      expect(layer.getIsRunning()).toBe(false);
    });

    it('should be idempotent (no-op if already stopped)', () => {
      const trustHandshake = createTestTrustHandshake();
      const stopSpy = vi.spyOn(trustHandshake, 'stop');

      const { layer } = createTestLayer({ trustHandshake });

      layer.stop(); // Should be no-op since not running

      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle: dispose()', () => {
    it('should dispose all three subsystems', () => {
      const trustHandshake = createTestTrustHandshake();
      const gossipMesh = createTestGossipMesh();
      const behavioralScoring = createTestBehavioralScoring();

      const disposeHandshakeSpy = vi.spyOn(trustHandshake, 'dispose');
      const disposeGossipSpy = vi.spyOn(gossipMesh, 'dispose');
      const disposeBehavioralSpy = vi.spyOn(behavioralScoring, 'dispose');

      const { layer } = createTestLayer({ trustHandshake, gossipMesh, behavioralScoring });

      layer.start();
      layer.dispose();

      expect(disposeHandshakeSpy).toHaveBeenCalled();
      expect(disposeGossipSpy).toHaveBeenCalled();
      expect(disposeBehavioralSpy).toHaveBeenCalled();
      expect(layer.getIsRunning()).toBe(false);
    });

    it('should stop before disposing', () => {
      const trustHandshake = createTestTrustHandshake();
      const stopSpy = vi.spyOn(trustHandshake, 'stop');
      const disposeSpy = vi.spyOn(trustHandshake, 'dispose');

      const { layer } = createTestLayer({ trustHandshake });

      layer.start();
      layer.dispose();

      // stop should be called before dispose
      const stopOrder = stopSpy.mock.invocationCallOrder[0];
      const disposeOrder = disposeSpy.mock.invocationCallOrder[0];
      expect(stopOrder).toBeLessThan(disposeOrder);
    });
  });

  // ===========================================================================
  // TESTS: FACTORY FUNCTION (createTrustIntegrationLayer)
  // ===========================================================================

  describe('createTrustIntegrationLayer factory', () => {
    it('should create all three subsystems and the integration layer', () => {
      const result = createTrustIntegrationLayer({
        trustHandshakeConfig: { worldId: 'factory-world' },
        gossipMeshConfig: { nodeId: 'factory-node' },
      });

      expect(result.layer).toBeInstanceOf(TrustIntegrationLayer);
      expect(result.trustHandshake).toBeInstanceOf(VRTrustHandshake);
      expect(result.gossipMesh).toBeInstanceOf(GossipTrustMesh);
      expect(result.behavioralScoring).toBeInstanceOf(BehavioralTrustScoring);

      result.layer.dispose();
    });

    it('should wire Path 1: trust level changes propagate to gossip', async () => {
      const result = createTrustIntegrationLayer({
        trustHandshakeConfig: { worldId: 'wire-test-world' },
        gossipMeshConfig: { nodeId: 'wire-test-node' },
      });

      const onLocalTrustChangeSpy = vi.spyOn(result.gossipMesh, 'onLocalTrustChange');

      await result.trustHandshake.genesis();
      await joinAgentToWorld(result.trustHandshake, 'agent-1');

      // Exit agent triggers onTrustLevelChanged callback which should route
      // through the integration layer to gossipMesh.onLocalTrustChange
      result.trustHandshake.exitAgent('agent-1', 'test-exit');

      expect(onLocalTrustChangeSpy).toHaveBeenCalledWith(
        'agent-1',
        'revoked',
        expect.any(Number),
        expect.any(Array),
        expect.any(String),
      );

      result.layer.dispose();
    });

    it('should wire Path 2: remote gossip revocations apply locally', async () => {
      const result = createTrustIntegrationLayer({
        trustHandshakeConfig: { worldId: 'wire-test-world-2' },
        gossipMeshConfig: { nodeId: 'wire-test-node-2' },
      });

      await result.trustHandshake.genesis();
      await joinAgentToWorld(result.trustHandshake, 'agent-1');

      expect(result.trustHandshake.isAgentTrusted('agent-1')).toBe(true);

      // Simulate receiving a gossip message with a revocation
      const gossipMessage: GossipMessage = {
        fromNodeId: 'remote-peer',
        sequence: 1,
        updates: [{
          updateId: 'factory-remote-update-1',
          agentId: 'agent-1',
          trustLevel: 'revoked',
          trustScore: 0,
          grantedCapabilities: [],
          reason: 'Remote revocation test',
          originNodeId: 'remote-peer',
          vectorClock: { 'remote-peer': 1 },
          timestamp: Date.now(),
          ttl: 10,
        }],
        bloomSnapshot: null,
        senderClock: { 'remote-peer': 1 },
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };

      // The gossip mesh will call onRemoteTrustUpdate which routes through
      // the integration layer to trustHandshake.exitAgent
      result.gossipMesh.onGossipReceived(gossipMessage);

      // Agent should now be revoked
      expect(result.trustHandshake.getAgentTrustLevel('agent-1')).toBe('revoked');

      result.layer.dispose();
    });

    it('should wire Path 3: behavioral actions route to handshake', async () => {
      const result = createTrustIntegrationLayer({
        trustHandshakeConfig: { worldId: 'wire-test-world-3' },
        gossipMeshConfig: { nodeId: 'wire-test-node-3' },
        behavioralScoringConfig: {
          scoringHz: 5,
          revokeThreshold: 0.2,
          degradeThreshold: 0.5,
        },
      });

      await result.trustHandshake.genesis();
      await joinAgentToWorld(result.trustHandshake, 'agent-1');

      expect(result.trustHandshake.isAgentTrusted('agent-1')).toBe(true);

      // Feed severe violation events across ALL four dimensions to drive
      // the composite score below the revoke threshold (0.2).
      // With EWMA alpha=0.3 and 20 events at score 0.0, each dimension
      // drops to ~0.7^20 ≈ 0.001. All dimensions being near 0 ensures
      // the composite score is also near 0.
      result.behavioralScoring.registerAgent('agent-1');
      const violationTypes: Array<{ type: 'bounds_violation' | 'gravity_violation' | 'harassment_flag' | 'impossible_movement' }> = [
        { type: 'bounds_violation' },       // spatial_compliance
        { type: 'gravity_violation' },      // physics_adherence
        { type: 'harassment_flag' },        // interaction_appropriateness
        { type: 'impossible_movement' },    // temporal_consistency
      ];

      for (let i = 0; i < 20; i++) {
        for (const vt of violationTypes) {
          result.behavioralScoring.ingestEvent({
            type: vt.type,
            agentId: 'agent-1',
            timestamp: Date.now(),
            data: {},
            severity: 1.0, // Maximum severity
          });
        }
      }

      // Manually trigger a scoring cycle by accessing the private method
      // via type assertion (since the scoring loop isn't running in tests)
      (result.behavioralScoring as any).scoringCycle();

      // After severe violations across all dimensions, the behavioral scoring
      // should have triggered revocation which routes through integration
      // layer to exitAgent. The agent should be revoked.
      expect(result.trustHandshake.getAgentTrustLevel('agent-1')).toBe('revoked');

      result.layer.dispose();
    });

    it('should call user-provided additional callbacks alongside wiring', async () => {
      const userTrustLevelChanged = vi.fn();
      const userRemoteTrustUpdate = vi.fn();
      const userTrustAction = vi.fn();

      const result = createTrustIntegrationLayer({
        trustHandshakeConfig: {
          worldId: 'callback-test-world',
          onTrustLevelChanged: userTrustLevelChanged,
        },
        gossipMeshConfig: {
          nodeId: 'callback-test-node',
          onRemoteTrustUpdate: userRemoteTrustUpdate,
        },
        behavioralScoringConfig: {
          onTrustAction: userTrustAction,
        },
      });

      await result.trustHandshake.genesis();
      await joinAgentToWorld(result.trustHandshake, 'agent-1');

      // Exit agent should trigger both the wiring AND the user callback
      result.trustHandshake.exitAgent('agent-1', 'test');

      expect(userTrustLevelChanged).toHaveBeenCalledWith(
        'agent-1',
        'trusted',
        'revoked',
      );

      result.layer.dispose();
    });

    it('should emit integration events via onIntegrationEvent callback', async () => {
      const integrationCallback = vi.fn();

      const result = createTrustIntegrationLayer({
        trustHandshakeConfig: { worldId: 'event-test-world' },
        gossipMeshConfig: { nodeId: 'event-test-node' },
        onIntegrationEvent: integrationCallback,
      });

      await result.trustHandshake.genesis();
      await joinAgentToWorld(result.trustHandshake, 'agent-1');

      result.trustHandshake.exitAgent('agent-1', 'test-exit');

      expect(integrationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'gossip_propagation',
          agentId: 'agent-1',
        }),
      );

      result.layer.dispose();
    });

    it('should pass through custom config to subsystems', () => {
      const result = createTrustIntegrationLayer({
        trustHandshakeConfig: {
          worldId: 'config-world',
          checkHz: 20,
        },
        gossipMeshConfig: {
          nodeId: 'config-node',
          fanOut: 5,
          gossipIntervalMs: 500,
        },
        behavioralScoringConfig: {
          scoringHz: 10,
          degradeThreshold: 0.6,
        },
      });

      const metrics = result.layer.getMetrics();
      expect(metrics.handshake.checkHz).toBe(20);
      expect(metrics.gossip.fanOut).toBe(5);
      expect(metrics.gossip.gossipIntervalMs).toBe(500);
      expect(metrics.behavioral.scoringHz).toBe(10);
      expect(metrics.behavioral.thresholds.degrade).toBe(0.6);

      result.layer.dispose();
    });
  });

  // ===========================================================================
  // TESTS: ACCESSOR METHODS
  // ===========================================================================

  describe('Accessor methods', () => {
    it('should return the correct trustHandshake instance', () => {
      const trustHandshake = createTestTrustHandshake();
      const { layer } = createTestLayer({ trustHandshake });

      expect(layer.getTrustHandshake()).toBe(trustHandshake);
    });

    it('should return the correct gossipMesh instance', () => {
      const gossipMesh = createTestGossipMesh();
      const { layer } = createTestLayer({ gossipMesh });

      expect(layer.getGossipMesh()).toBe(gossipMesh);
    });

    it('should return the correct behavioralScoring instance', () => {
      const behavioralScoring = createTestBehavioralScoring();
      const { layer } = createTestLayer({ behavioralScoring });

      expect(layer.getBehavioralScoring()).toBe(behavioralScoring);
    });
  });

  // ===========================================================================
  // TESTS: INTEGRATION EVENT CALLBACK ERROR HANDLING
  // ===========================================================================

  describe('Integration event callback error handling', () => {
    it('should swallow errors from onIntegrationEvent callback', () => {
      const callback = vi.fn().mockImplementation(() => {
        throw new Error('Callback failed');
      });

      const { layer } = createTestLayer({ onIntegrationEvent: callback });

      // Should not throw even though callback throws
      expect(() => layer.handleLocalTrustChange('agent-1', 'none', 'trusted')).not.toThrow();
    });
  });

  // ===========================================================================
  // TESTS: END-TO-END WIRING SCENARIOS
  // ===========================================================================

  describe('End-to-end scenarios', () => {
    it('should handle complete agent lifecycle: join -> degrade -> revoke -> propagate', async () => {
      const events: TrustIntegrationEvent[] = [];

      const result = createTrustIntegrationLayer({
        trustHandshakeConfig: { worldId: 'e2e-world' },
        gossipMeshConfig: { nodeId: 'e2e-node' },
        behavioralScoringConfig: {
          revokeThreshold: 0.2,
          degradeThreshold: 0.5,
        },
        onIntegrationEvent: (event) => events.push(event),
      });

      // Genesis
      await result.trustHandshake.genesis();

      // Join
      await joinAgentToWorld(result.trustHandshake, 'agent-1');
      expect(result.trustHandshake.isAgentTrusted('agent-1')).toBe(true);

      // Note: The join flow (respondToChallenge) calls onAgentJoined, NOT
      // onTrustLevelChanged. So no gossip_propagation event is emitted
      // during join. Gossip propagation happens on trust level changes
      // like degradation, revocation, and exit.

      // Behavioral degrade
      const degradeDetails: TrustActionDetails = {
        action: 'degrade',
        compositeScore: 0.4,
        dimensionScores: {
          spatial_compliance: 0.3,
          physics_adherence: 0.5,
          interaction_appropriateness: 0.4,
          temporal_consistency: 0.4,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: ['spatial_compliance: 3 violations'],
        timestamp: Date.now(),
      };
      result.layer.handleBehavioralTrustAction('agent-1', 'degrade', 0.4, degradeDetails);
      expect(events.some(e => e.type === 'behavioral_degrade')).toBe(true);

      // Behavioral revoke
      const revokeDetails: TrustActionDetails = {
        action: 'revoke',
        compositeScore: 0.15,
        dimensionScores: {
          spatial_compliance: 0.1,
          physics_adherence: 0.2,
          interaction_appropriateness: 0.1,
          temporal_consistency: 0.2,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: ['spatial_compliance: 10 violations'],
        timestamp: Date.now(),
      };
      result.layer.handleBehavioralTrustAction('agent-1', 'revoke', 0.15, revokeDetails);
      expect(events.some(e => e.type === 'behavioral_revoke')).toBe(true);
      expect(result.trustHandshake.getAgentTrustLevel('agent-1')).toBe('revoked');

      // The revocation triggered a gossip propagation
      // (via handshake exitAgent -> onTrustLevelChanged -> Path 1)
      const gossipPropagations = events.filter(e =>
        e.type === 'gossip_propagation' && e.agentId === 'agent-1',
      );
      // At least 1 from revocation exit
      expect(gossipPropagations.length).toBeGreaterThanOrEqual(1);

      // Check final metrics
      const metrics = result.layer.getMetrics();
      expect(metrics.integration.totalBehavioralDegrades).toBe(1);
      expect(metrics.integration.totalBehavioralRevocations).toBe(1);
      expect(metrics.integration.totalGossipPropagations).toBeGreaterThanOrEqual(1);

      result.layer.dispose();
    });

    it('should handle multiple agents concurrently', async () => {
      const result = createTrustIntegrationLayer({
        trustHandshakeConfig: { worldId: 'multi-agent-world' },
        gossipMeshConfig: { nodeId: 'multi-agent-node' },
      });

      await result.trustHandshake.genesis();

      // Join multiple agents
      await joinAgentToWorld(result.trustHandshake, 'agent-1');
      await joinAgentToWorld(result.trustHandshake, 'agent-2');
      await joinAgentToWorld(result.trustHandshake, 'agent-3');

      expect(result.trustHandshake.isAgentTrusted('agent-1')).toBe(true);
      expect(result.trustHandshake.isAgentTrusted('agent-2')).toBe(true);
      expect(result.trustHandshake.isAgentTrusted('agent-3')).toBe(true);

      // Revoke agent-2 via behavioral scoring
      const details: TrustActionDetails = {
        action: 'revoke',
        compositeScore: 0.1,
        dimensionScores: {
          spatial_compliance: 0.1,
          physics_adherence: 0.1,
          interaction_appropriateness: 0.1,
          temporal_consistency: 0.1,
        },
        primaryCause: 'spatial_compliance',
        recentViolations: [],
        timestamp: Date.now(),
      };

      result.layer.handleBehavioralTrustAction('agent-2', 'revoke', 0.1, details);

      // Only agent-2 should be revoked
      expect(result.trustHandshake.isAgentTrusted('agent-1')).toBe(true);
      expect(result.trustHandshake.getAgentTrustLevel('agent-2')).toBe('revoked');
      expect(result.trustHandshake.isAgentTrusted('agent-3')).toBe(true);

      result.layer.dispose();
    });
  });
});
