/**
 * TrustIntegrationLayer
 *
 * Wires together the three trust subsystems (VRTrustHandshake, GossipTrustMesh,
 * BehavioralTrustScoring) into a unified trust management layer for VR worlds.
 *
 * WIRING PATHS:
 * ```
 *   VRTrustHandshake.onTrustLevelChanged
 *        |
 *        v
 *   GossipTrustMesh.onLocalTrustChange()       <-- Path 1: Propagate to peers
 *
 *   GossipTrustMesh.onRemoteTrustUpdate
 *        |
 *        v
 *   VRTrustHandshake.exitAgent()               <-- Path 2: Apply remote revocation
 *
 *   BehavioralTrustScoring.onTrustAction
 *        |
 *        ├── action === 'revoke'
 *        │     └── VRTrustHandshake.exitAgent() <-- Path 3a: Behavioral revoke
 *        │
 *        └── action === 'degrade'
 *              └── (logged, trust level adjusted  <-- Path 3b: Behavioral degrade
 *                   via handshake trust check)
 *
 *   BehavioralTrustScoring.onTrustAction('recover')
 *        |
 *        └── (logged, recovery handled by        <-- Path 3c: Behavioral recover
 *             handshake refresh cycle)
 * ```
 *
 * LIFECYCLE:
 * - start(): Starts all three subsystems
 * - stop(): Stops all three subsystems
 * - dispose(): Disposes all three subsystems
 *
 * USAGE:
 * ```typescript
 * // Option 1: Use the factory function (recommended)
 * const { layer, trustHandshake, gossipMesh, behavioralScoring } =
 *   createTrustIntegrationLayer({
 *     trustHandshakeConfig: { worldId: 'world-1' },
 *     gossipMeshConfig: { nodeId: 'node-1' },
 *     behavioralScoringConfig: { scoringHz: 5 },
 *   });
 *
 * await layer.initialize();
 * layer.start();
 *
 * // Option 2: Pass pre-constructed instances
 * const layer = new TrustIntegrationLayer({
 *   trustHandshake,
 *   gossipMesh,
 *   behavioralScoring,
 * });
 * ```
 *
 * @module TrustIntegrationLayer
 */

import { logger } from './logger';
import type { TrustLevel, AgentCapability } from './VRTrustHandshake';
import type { VRTrustHandshakeConfig, VRTrustHandshakeMetrics } from './VRTrustHandshake';
import { VRTrustHandshake } from './VRTrustHandshake';
import type { GossipTrustMeshConfig, GossipTrustMeshMetrics, TrustUpdate } from './GossipTrustMesh';
import { GossipTrustMesh } from './GossipTrustMesh';
import type {
  BehavioralTrustScoringConfig,
  BehavioralTrustScoringMetrics,
  TrustAction,
  TrustActionDetails,
} from './BehavioralTrustScoring';
import { BehavioralTrustScoring } from './BehavioralTrustScoring';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Unified trust metrics aggregating all three subsystems.
 */
export interface TrustMetrics {
  /** Timestamp when metrics were captured */
  timestamp: number;

  /** VRTrustHandshake metrics */
  handshake: VRTrustHandshakeMetrics;

  /** GossipTrustMesh metrics */
  gossip: GossipTrustMeshMetrics;

  /** BehavioralTrustScoring metrics */
  behavioral: BehavioralTrustScoringMetrics;

  /** Integration layer specific metrics */
  integration: {
    /** Whether the integration layer is running */
    isRunning: boolean;
    /** Total trust changes propagated to gossip (Path 1) */
    totalGossipPropagations: number;
    /** Total remote revocations applied locally (Path 2) */
    totalRemoteRevocationsApplied: number;
    /** Total behavioral revocations (Path 3a) */
    totalBehavioralRevocations: number;
    /** Total behavioral degrades (Path 3b) */
    totalBehavioralDegrades: number;
    /** Total behavioral recoveries (Path 3c) */
    totalBehavioralRecoveries: number;
    /** Total wiring errors (callback failures) */
    totalWiringErrors: number;
  };
}

/**
 * Configuration for the TrustIntegrationLayer.
 */
export interface TrustIntegrationLayerConfig {
  /** Pre-constructed VRTrustHandshake instance */
  trustHandshake: VRTrustHandshake;
  /** Pre-constructed GossipTrustMesh instance */
  gossipMesh: GossipTrustMesh;
  /** Pre-constructed BehavioralTrustScoring instance */
  behavioralScoring: BehavioralTrustScoring;
  /** Callback when a trust integration event occurs */
  onIntegrationEvent?: (event: TrustIntegrationEvent) => void;
}

/**
 * Events emitted by the integration layer for observability.
 */
export interface TrustIntegrationEvent {
  /** Event type */
  type: TrustIntegrationEventType;
  /** Agent ID involved */
  agentId: string;
  /** Additional details */
  details: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
}

/**
 * Types of integration events.
 */
export type TrustIntegrationEventType =
  | 'gossip_propagation'     // Path 1: trust change sent to gossip
  | 'remote_revocation'      // Path 2: remote revocation applied
  | 'behavioral_revoke'      // Path 3a: behavioral scoring triggered revoke
  | 'behavioral_degrade'     // Path 3b: behavioral scoring triggered degrade
  | 'behavioral_recover'     // Path 3c: behavioral scoring triggered recover
  | 'wiring_error';          // Error in a wiring callback

/**
 * Configuration for the factory function that creates all three subsystems
 * with proper wiring.
 */
export interface TrustIntegrationFactoryConfig {
  /** Config for VRTrustHandshake (worldId required) */
  trustHandshakeConfig: Omit<VRTrustHandshakeConfig, 'onTrustLevelChanged' | 'onAgentJoined' | 'onAgentExited'> & {
    /** Optional additional callback for trust level changes (called after wiring) */
    onTrustLevelChanged?: (agentId: string, oldLevel: TrustLevel, newLevel: TrustLevel) => void;
    /** Optional additional callback for agent joins */
    onAgentJoined?: (agentId: string, capabilities: AgentCapability[]) => void;
    /** Optional additional callback for agent exits */
    onAgentExited?: (agentId: string, reason: string) => void;
  };
  /** Config for GossipTrustMesh (nodeId required) */
  gossipMeshConfig: Omit<GossipTrustMeshConfig, 'onRemoteTrustUpdate'> & {
    /** Optional additional callback for remote trust updates */
    onRemoteTrustUpdate?: (update: TrustUpdate) => void;
  };
  /** Config for BehavioralTrustScoring */
  behavioralScoringConfig?: Omit<BehavioralTrustScoringConfig, 'onTrustAction'> & {
    /** Optional additional callback for trust actions */
    onTrustAction?: (agentId: string, action: TrustAction, compositeScore: number, details: TrustActionDetails) => void;
  };
  /** Integration layer event callback */
  onIntegrationEvent?: (event: TrustIntegrationEvent) => void;
}

/**
 * Result of the factory function.
 */
export interface TrustIntegrationFactoryResult {
  /** The integration layer */
  layer: TrustIntegrationLayer;
  /** The VRTrustHandshake instance */
  trustHandshake: VRTrustHandshake;
  /** The GossipTrustMesh instance */
  gossipMesh: GossipTrustMesh;
  /** The BehavioralTrustScoring instance */
  behavioralScoring: BehavioralTrustScoring;
}

// =============================================================================
// TRUST INTEGRATION LAYER
// =============================================================================

/**
 * Trust Integration Layer that wires all trust components together.
 *
 * This module serves as the central nervous system for the VR trust
 * architecture, connecting:
 * - **VRTrustHandshake**: Cryptographic agent authentication and session management
 * - **GossipTrustMesh**: Epidemic protocol for trust state propagation across nodes
 * - **BehavioralTrustScoring**: Continuous behavioral monitoring and trust scoring
 *
 * The three wiring paths ensure that:
 * 1. Local trust changes are propagated to the mesh (VRTrustHandshake -> GossipTrustMesh)
 * 2. Remote revocations are applied locally (GossipTrustMesh -> VRTrustHandshake)
 * 3. Behavioral violations trigger appropriate trust actions (BehavioralTrustScoring -> VRTrustHandshake)
 */
export class TrustIntegrationLayer {
  private readonly trustHandshake: VRTrustHandshake;
  private readonly gossipMesh: GossipTrustMesh;
  private readonly behavioralScoring: BehavioralTrustScoring;
  private readonly onIntegrationEvent: (event: TrustIntegrationEvent) => void;

  private isRunning: boolean = false;

  // Integration metrics
  private totalGossipPropagations: number = 0;
  private totalRemoteRevocationsApplied: number = 0;
  private totalBehavioralRevocations: number = 0;
  private totalBehavioralDegrades: number = 0;
  private totalBehavioralRecoveries: number = 0;
  private totalWiringErrors: number = 0;

  constructor(config: TrustIntegrationLayerConfig) {
    this.trustHandshake = config.trustHandshake;
    this.gossipMesh = config.gossipMesh;
    this.behavioralScoring = config.behavioralScoring;
    this.onIntegrationEvent = config.onIntegrationEvent ?? (() => {});

    logger.info('[TrustIntegrationLayer] Initialized', {
      handshakeRunning: this.trustHandshake.getIsRunning(),
      gossipRunning: this.gossipMesh.getIsRunning(),
      behavioralRunning: this.behavioralScoring.getIsRunning(),
    });
  }

  // ===========================================================================
  // WIRING PATH 1: VRTrustHandshake -> GossipTrustMesh
  // ===========================================================================

  /**
   * Handle a local trust level change from VRTrustHandshake.
   *
   * Propagates the change to the GossipTrustMesh for epidemic spreading
   * to all peer nodes in the mesh.
   *
   * This is called when VRTrustHandshake changes an agent's trust level
   * (join, refresh, degradation, revocation, exit).
   *
   * @param agentId - Agent whose trust changed
   * @param _oldLevel - Previous trust level
   * @param newLevel - New trust level
   */
  handleLocalTrustChange(
    agentId: string,
    _oldLevel: TrustLevel,
    newLevel: TrustLevel,
  ): void {
    try {
      // Get agent state from handshake for capabilities and score
      const trustScore = this.trustHandshake.getAgentTrustScore(agentId);
      const trustState = this.trustHandshake.getCurrentTrustState();
      const agentState = trustState.agents[agentId];
      const capabilities = agentState?.grantedCapabilities ?? [];

      // Determine reason
      const reason = agentState?.revocationReason ?? `Trust level changed to ${newLevel}`;

      // Propagate to gossip mesh
      this.gossipMesh.onLocalTrustChange(
        agentId,
        newLevel,
        trustScore,
        capabilities,
        reason,
      );

      this.totalGossipPropagations++;

      this.emitEvent({
        type: 'gossip_propagation',
        agentId,
        details: {
          oldLevel: _oldLevel,
          newLevel,
          trustScore,
          capabilities,
        },
        timestamp: Date.now(),
      });

      logger.debug('[TrustIntegrationLayer] Path 1: Trust change propagated to gossip', {
        agentId,
        oldLevel: _oldLevel,
        newLevel,
      });
    } catch (error) {
      this.totalWiringErrors++;
      this.emitEvent({
        type: 'wiring_error',
        agentId,
        details: {
          path: 'handshake_to_gossip',
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: Date.now(),
      });

      logger.error('[TrustIntegrationLayer] Path 1 wiring error', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ===========================================================================
  // WIRING PATH 2: GossipTrustMesh -> VRTrustHandshake
  // ===========================================================================

  /**
   * Handle a remote trust update received via the gossip mesh.
   *
   * When a gossip message brings a revocation from another node,
   * this method applies it locally via VRTrustHandshake.exitAgent().
   *
   * Only revocation updates are applied locally (most restrictive wins).
   * Other trust level changes from gossip are informational only.
   *
   * @param update - The remote trust update from gossip
   */
  handleRemoteTrustUpdate(update: TrustUpdate): void {
    try {
      // Only apply revocations from remote nodes
      if (update.trustLevel === 'revoked') {
        // Check if agent is currently in a non-revoked state locally
        const localLevel = this.trustHandshake.getAgentTrustLevel(update.agentId);

        if (localLevel !== 'none' && localLevel !== 'revoked') {
          // Apply remote revocation locally
          this.trustHandshake.exitAgent(
            update.agentId,
            `Remote revocation from node ${update.originNodeId}: ${update.reason}`,
          );

          this.totalRemoteRevocationsApplied++;

          this.emitEvent({
            type: 'remote_revocation',
            agentId: update.agentId,
            details: {
              originNodeId: update.originNodeId,
              reason: update.reason,
              previousLocalLevel: localLevel,
            },
            timestamp: Date.now(),
          });

          logger.info('[TrustIntegrationLayer] Path 2: Remote revocation applied', {
            agentId: update.agentId,
            originNodeId: update.originNodeId,
            previousLocalLevel: localLevel,
            reason: update.reason,
          });
        }
      }
    } catch (error) {
      this.totalWiringErrors++;
      this.emitEvent({
        type: 'wiring_error',
        agentId: update.agentId,
        details: {
          path: 'gossip_to_handshake',
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: Date.now(),
      });

      logger.error('[TrustIntegrationLayer] Path 2 wiring error', {
        agentId: update.agentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ===========================================================================
  // WIRING PATH 3: BehavioralTrustScoring -> VRTrustHandshake
  // ===========================================================================

  /**
   * Handle a trust action triggered by behavioral scoring.
   *
   * Maps behavioral trust actions to VRTrustHandshake operations:
   * - 'revoke': Calls trustHandshake.exitAgent() to remove the agent
   * - 'degrade': Logged for the handshake trust check cycle to pick up
   * - 'recover': Logged for the handshake refresh cycle to pick up
   *
   * @param agentId - Agent whose behavior triggered the action
   * @param action - The trust action (degrade, revoke, recover)
   * @param compositeScore - The composite behavioral score
   * @param details - Detailed breakdown of the action
   */
  handleBehavioralTrustAction(
    agentId: string,
    action: TrustAction,
    compositeScore: number,
    details: TrustActionDetails,
  ): void {
    try {
      switch (action) {
        case 'revoke': {
          // Path 3a: Behavioral violation severe enough for revocation
          this.trustHandshake.exitAgent(
            agentId,
            `Behavioral violation: ${details.primaryCause} (score: ${compositeScore.toFixed(3)})`,
          );
          this.totalBehavioralRevocations++;

          this.emitEvent({
            type: 'behavioral_revoke',
            agentId,
            details: {
              compositeScore,
              primaryCause: details.primaryCause,
              dimensionScores: details.dimensionScores,
              recentViolations: details.recentViolations,
            },
            timestamp: Date.now(),
          });

          logger.info('[TrustIntegrationLayer] Path 3a: Behavioral revocation', {
            agentId,
            compositeScore: compositeScore.toFixed(3),
            primaryCause: details.primaryCause,
          });
          break;
        }

        case 'degrade': {
          // Path 3b: Behavioral degradation
          // The VRTrustHandshake trust check loop will pick up the degraded
          // state on its next cycle. We log the event for observability.
          this.totalBehavioralDegrades++;

          this.emitEvent({
            type: 'behavioral_degrade',
            agentId,
            details: {
              compositeScore,
              primaryCause: details.primaryCause,
              dimensionScores: details.dimensionScores,
              recentViolations: details.recentViolations,
            },
            timestamp: Date.now(),
          });

          logger.info('[TrustIntegrationLayer] Path 3b: Behavioral degradation', {
            agentId,
            compositeScore: compositeScore.toFixed(3),
            primaryCause: details.primaryCause,
          });
          break;
        }

        case 'recover': {
          // Path 3c: Behavioral recovery
          // The VRTrustHandshake refresh cycle handles recovery via
          // the allowRecover policy flag. We log for observability.
          this.totalBehavioralRecoveries++;

          this.emitEvent({
            type: 'behavioral_recover',
            agentId,
            details: {
              compositeScore,
              dimensionScores: details.dimensionScores,
            },
            timestamp: Date.now(),
          });

          logger.info('[TrustIntegrationLayer] Path 3c: Behavioral recovery', {
            agentId,
            compositeScore: compositeScore.toFixed(3),
          });
          break;
        }
      }
    } catch (error) {
      this.totalWiringErrors++;
      this.emitEvent({
        type: 'wiring_error',
        agentId,
        details: {
          path: 'behavioral_to_handshake',
          action,
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: Date.now(),
      });

      logger.error('[TrustIntegrationLayer] Path 3 wiring error', {
        agentId,
        action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ===========================================================================
  // UNIFIED TRUST METRICS
  // ===========================================================================

  /**
   * Get unified trust metrics aggregating all three subsystems.
   *
   * Provides a single snapshot of the entire trust system state,
   * including per-subsystem metrics and integration-specific counters.
   *
   * @returns Comprehensive TrustMetrics object
   */
  getMetrics(): TrustMetrics {
    return {
      timestamp: Date.now(),
      handshake: this.trustHandshake.getMetrics(),
      gossip: this.gossipMesh.getMetrics(),
      behavioral: this.behavioralScoring.getMetrics(),
      integration: {
        isRunning: this.isRunning,
        totalGossipPropagations: this.totalGossipPropagations,
        totalRemoteRevocationsApplied: this.totalRemoteRevocationsApplied,
        totalBehavioralRevocations: this.totalBehavioralRevocations,
        totalBehavioralDegrades: this.totalBehavioralDegrades,
        totalBehavioralRecoveries: this.totalBehavioralRecoveries,
        totalWiringErrors: this.totalWiringErrors,
      },
    };
  }

  // ===========================================================================
  // ACCESSOR METHODS
  // ===========================================================================

  /**
   * Get the VRTrustHandshake instance.
   */
  getTrustHandshake(): VRTrustHandshake {
    return this.trustHandshake;
  }

  /**
   * Get the GossipTrustMesh instance.
   */
  getGossipMesh(): GossipTrustMesh {
    return this.gossipMesh;
  }

  /**
   * Get the BehavioralTrustScoring instance.
   */
  getBehavioralScoring(): BehavioralTrustScoring {
    return this.behavioralScoring;
  }

  /**
   * Check if the integration layer is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start all trust subsystems.
   *
   * Starts the VRTrustHandshake trust check loop, the GossipTrustMesh
   * gossip loop, and the BehavioralTrustScoring scoring loop.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[TrustIntegrationLayer] Already running');
      return;
    }

    this.trustHandshake.start();
    this.gossipMesh.start();
    this.behavioralScoring.start();
    this.isRunning = true;

    logger.info('[TrustIntegrationLayer] Started all trust subsystems');
  }

  /**
   * Stop all trust subsystems.
   *
   * Stops the VRTrustHandshake trust check loop, the GossipTrustMesh
   * gossip loop, and the BehavioralTrustScoring scoring loop.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[TrustIntegrationLayer] Already stopped');
      return;
    }

    this.trustHandshake.stop();
    this.gossipMesh.stop();
    this.behavioralScoring.stop();
    this.isRunning = false;

    logger.info('[TrustIntegrationLayer] Stopped all trust subsystems');
  }

  /**
   * Dispose all trust subsystems and release resources.
   *
   * After disposal, this instance cannot be reused.
   */
  dispose(): void {
    this.stop();
    this.trustHandshake.dispose();
    this.gossipMesh.dispose();
    this.behavioralScoring.dispose();

    logger.info('[TrustIntegrationLayer] Disposed all trust subsystems');
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  /**
   * Emit an integration event.
   */
  private emitEvent(event: TrustIntegrationEvent): void {
    try {
      this.onIntegrationEvent(event);
    } catch {
      // Swallow callback errors to prevent cascading failures
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a fully wired trust integration layer.
 *
 * This factory function creates all three trust subsystems
 * (VRTrustHandshake, GossipTrustMesh, BehavioralTrustScoring) with
 * proper callback wiring through the TrustIntegrationLayer.
 *
 * This is the recommended way to set up the trust system, as it
 * ensures all wiring paths are correctly configured.
 *
 * @param config - Factory configuration with sub-configs for each subsystem
 * @returns The integration layer and all three subsystem instances
 *
 * @example
 * ```typescript
 * const { layer, trustHandshake, gossipMesh, behavioralScoring } =
 *   createTrustIntegrationLayer({
 *     trustHandshakeConfig: { worldId: 'world-1' },
 *     gossipMeshConfig: { nodeId: 'node-1' },
 *     behavioralScoringConfig: { scoringHz: 5 },
 *   });
 *
 * await trustHandshake.genesis();
 * layer.start();
 * ```
 */
export function createTrustIntegrationLayer(
  config: TrustIntegrationFactoryConfig,
): TrustIntegrationFactoryResult {
  // We need to create the integration layer first (as a reference holder),
  // then the subsystems with callbacks that route through the layer.
  // Since TrustIntegrationLayer's constructor requires the instances,
  // we use a deferred wiring pattern.

  // Temporary callback holders that get bound after layer creation
  let layerRef: TrustIntegrationLayer | null = null;

  // Create VRTrustHandshake with wired callbacks
  const trustHandshake = new VRTrustHandshake({
    ...config.trustHandshakeConfig,
    autoStart: false,
    onTrustLevelChanged: (agentId: string, oldLevel: TrustLevel, newLevel: TrustLevel) => {
      // Path 1: Route trust changes to integration layer
      if (layerRef) {
        layerRef.handleLocalTrustChange(agentId, oldLevel, newLevel);
      }
      // Call user's additional callback if provided
      config.trustHandshakeConfig.onTrustLevelChanged?.(agentId, oldLevel, newLevel);
    },
    onAgentJoined: (agentId: string, capabilities: AgentCapability[]) => {
      config.trustHandshakeConfig.onAgentJoined?.(agentId, capabilities);
    },
    onAgentExited: (agentId: string, reason: string) => {
      config.trustHandshakeConfig.onAgentExited?.(agentId, reason);
    },
  });

  // Create GossipTrustMesh with wired callbacks
  const gossipMesh = new GossipTrustMesh({
    ...config.gossipMeshConfig,
    onRemoteTrustUpdate: (update: TrustUpdate) => {
      // Path 2: Route remote trust updates to integration layer
      if (layerRef) {
        layerRef.handleRemoteTrustUpdate(update);
      }
      // Call user's additional callback if provided
      config.gossipMeshConfig.onRemoteTrustUpdate?.(update);
    },
  });

  // Create BehavioralTrustScoring with wired callbacks
  const behavioralScoring = new BehavioralTrustScoring({
    ...(config.behavioralScoringConfig ?? {}),
    autoStart: false,
    onTrustAction: (agentId: string, action: TrustAction, compositeScore: number, details: TrustActionDetails) => {
      // Path 3: Route behavioral actions to integration layer
      if (layerRef) {
        layerRef.handleBehavioralTrustAction(agentId, action, compositeScore, details);
      }
      // Call user's additional callback if provided
      config.behavioralScoringConfig?.onTrustAction?.(agentId, action, compositeScore, details);
    },
  });

  // Create the integration layer
  const layer = new TrustIntegrationLayer({
    trustHandshake,
    gossipMesh,
    behavioralScoring,
    onIntegrationEvent: config.onIntegrationEvent,
  });

  // Bind the layer reference so callbacks can route to it
  layerRef = layer;

  logger.info('[TrustIntegrationLayer] Factory: Fully wired trust system created', {
    worldId: config.trustHandshakeConfig.worldId,
    nodeId: config.gossipMeshConfig.nodeId,
  });

  return {
    layer,
    trustHandshake,
    gossipMesh,
    behavioralScoring,
  };
}
