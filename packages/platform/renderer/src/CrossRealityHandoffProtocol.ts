/**
 * CrossRealityHandoffProtocol
 *
 * Runtime implementation of the 5-phase cross-reality device handoff protocol.
 * Manages the lifecycle of transferring an agent from one form factor to another
 * while maintaining continuity via the MVC payload.
 *
 * PHASES:
 * 1. Capability Negotiation  -- Target device reports its capabilities
 * 2. MVC Transfer            -- 5 MVC objects sent (<10KB, <100ms)
 * 3. Embodiment Adaptation   -- Agent adapts visual form to target device
 * 4. Context Loading         -- Full context lazy-loaded in background
 * 5. Complete                -- Agent operational on new device
 *
 * TIMING BUDGET:
 * - Phase 1 (negotiation):  <50ms   (local capability check)
 * - Phase 2 (MVC transfer): <100ms  (serialize + transmit <10KB)
 * - Phase 3 (adaptation):   <200ms  (embodiment switch)
 * - Phase 4 (context load): 1-10s   (lazy, non-blocking)
 * - Total (blocking):       <350ms  (user perceives instant switch)
 *
 * @module CrossRealityHandoffProtocol
 */

import { logger } from './logger';
import type {
  FormFactor,
  EmbodimentType,
  MVCPayload,
  HandoffPhase,
  HandoffStatus,
  FormFactorBudget,
  DecisionHistory,
  ActiveTaskState,
  UserPreferences,
  SpatialContextSummary,
  EvidenceTrail,
} from './CrossRealityContinuityTypes';
import {
  DEFAULT_EMBODIMENT,
  FORM_FACTOR_BUDGETS,
  createMVCPayload,
  estimateMVCPayloadSize,
} from './CrossRealityContinuityTypes';

// =============================================================================
// DEVICE CAPABILITIES
// =============================================================================

/**
 * Capabilities reported by the target device during negotiation.
 */
export interface DeviceCapabilities {
  formFactor: FormFactor;
  deviceId: string;
  /** Human-readable device or agent label from discovery */
  displayName?: string;
  /** Supported embodiment types on this device */
  supportedEmbodiments?: EmbodimentType[];
  /** Available input modalities */
  inputModalities: string[];
  /** Legacy output modality summary, retained for older discovery callers */
  outputModalities?: string[];
  /** Performance budget */
  budget?: FormFactorBudget;
  /** Legacy network quality hint */
  networkQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  /** Legacy battery level hint (0-1) */
  batteryLevel?: number;
  /** Legacy memory hint */
  availableMemoryMB?: number;
  /** Available sensors */
  sensors?: string[];
  /** Whether the device has geospatial positioning */
  hasGeospatial: boolean;
  /** WebXR session modes available */
  webxrModes?: string[];
}

// =============================================================================
// HANDOFF CALLBACKS
// =============================================================================

/**
 * Callbacks invoked during different phases of the handoff.
 */
export interface HandoffCallbacks {
  /** Called to gather current agent state for MVC payload */
  gatherDecisionHistory: () => DecisionHistory;
  gatherActiveTask: () => ActiveTaskState;
  gatherUserPreferences: () => UserPreferences;
  gatherSpatialContext: () => SpatialContextSummary;
  gatherEvidenceTrail: () => EvidenceTrail;

  /** Called when agent should adapt to new embodiment */
  onEmbodimentChange: (from: EmbodimentType, to: EmbodimentType) => void;
  /** Called to begin lazy-loading full context */
  onContextLoadStart: () => void;
  /** Called when handoff is fully complete */
  onComplete: (status: HandoffStatus) => void;
  /** Called on handoff failure */
  onError: (status: HandoffStatus, error: string) => void;
}

// =============================================================================
// HANDOFF PROTOCOL
// =============================================================================

export class CrossRealityHandoffProtocol {
  private agentId: string;
  private agentName: string;
  private currentFormFactor: FormFactor;
  private currentEmbodiment: EmbodimentType;
  private activeHandoff: HandoffStatus | null = null;
  private handoffHistory: HandoffStatus[] = [];
  private listeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(
    agentId: string,
    agentName: string,
    currentFormFactor: FormFactor,
    currentEmbodiment?: EmbodimentType
  ) {
    this.agentId = agentId;
    this.agentName = agentName;
    this.currentFormFactor = currentFormFactor;
    this.currentEmbodiment = currentEmbodiment ?? DEFAULT_EMBODIMENT[currentFormFactor];
  }

  // ---------------------------------------------------------------------------
  // INITIATING A HANDOFF (Source Device)
  // ---------------------------------------------------------------------------

  /**
   * Initiate a handoff to a target device.
   * Returns the MVC payload to transmit.
   */
  initiateHandoff(
    targetCapabilities: DeviceCapabilities,
    callbacks: HandoffCallbacks
  ): MVCPayload | null {
    if (this.activeHandoff) {
      logger.warn('[Handoff] Cannot initiate: handoff already in progress');
      return null;
    }

    const handoffId = `handoff:${this.agentId}:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;
    const targetFormFactor = targetCapabilities.formFactor;

    // --- Phase 1: Capability Negotiation ---
    this.activeHandoff = {
      handoffId,
      phase: 'capability-negotiation',
      progress: 0,
      source: {
        formFactor: this.currentFormFactor,
        deviceId: 'local',
        embodiment: this.currentEmbodiment,
      },
      target: {
        formFactor: targetFormFactor,
        deviceId: targetCapabilities.deviceId,
        embodiment: this.selectTargetEmbodiment(targetCapabilities),
        capabilities: targetCapabilities.inputModalities,
      },
      elapsedMs: 0,
      errors: [],
      initiatedAt: Date.now(),
    };
    this.emit('handoff:initiated', {
      handoffId,
      source: this.currentFormFactor,
      target: targetFormFactor,
    });

    this.activeHandoff.phase = 'mvc-transfer';
    this.activeHandoff.progress = 20;

    // --- Phase 2: MVC Transfer ---
    const payload = createMVCPayload(
      this.agentId,
      this.agentName,
      this.currentFormFactor,
      targetFormFactor,
      {
        decisionHistory: callbacks.gatherDecisionHistory(),
        activeTask: callbacks.gatherActiveTask(),
        userPreferences: callbacks.gatherUserPreferences(),
        spatialContext: callbacks.gatherSpatialContext(),
        evidenceTrail: callbacks.gatherEvidenceTrail(),
        targetEmbodiment: this.activeHandoff.target.embodiment,
      }
    );

    const payloadSize = estimateMVCPayloadSize(payload);
    if (payloadSize > 10 * 1024) {
      logger.warn(`[Handoff] MVC payload exceeds 10KB: ${payloadSize} bytes`);
    }

    this.activeHandoff.phase = 'embodiment-adaptation';
    this.activeHandoff.progress = 60;

    this.emit('handoff:mvc-transferred', {
      handoffId,
      payloadSizeBytes: payloadSize,
      transferMs: Date.now() - this.activeHandoff.initiatedAt,
    });

    logger.info(
      `[Handoff] ${handoffId}: MVC payload created (${payloadSize} bytes) for ${this.currentFormFactor} → ${targetFormFactor}`
    );

    // Source-side handoff is complete once the payload is created and ready to transmit.
    // The target device will call receiveHandoff() with this payload.
    this.completeHandoff(true);

    return payload;
  }

  // ---------------------------------------------------------------------------
  // RECEIVING A HANDOFF (Target Device)
  // ---------------------------------------------------------------------------

  /**
   * Receive a handoff on the target device.
   */
  receiveHandoff(payload: MVCPayload, callbacks: HandoffCallbacks): HandoffStatus {
    const handoffId = payload.handoffId;

    this.activeHandoff = {
      handoffId,
      phase: 'embodiment-adaptation',
      progress: 60,
      source: {
        formFactor: payload.sourceFormFactor,
        deviceId: 'remote',
        embodiment: payload.sourceEmbodiment,
      },
      target: {
        formFactor: payload.targetFormFactor,
        deviceId: 'local',
        embodiment: payload.targetEmbodiment,
        capabilities: [],
      },
      elapsedMs: Date.now() - payload.createdAt,
      errors: [],
      initiatedAt: payload.createdAt,
    };

    // Check payload expiry
    if (Date.now() > payload.expiresAt) {
      const error = `MVC payload expired (created ${Date.now() - payload.createdAt}ms ago)`;
      this.activeHandoff.errors.push(error);
      this.activeHandoff.phase = 'capability-negotiation'; // Reset
      callbacks.onError(this.activeHandoff, error);
      return this.completeHandoff(false, error);
    }

    // --- Phase 3: Embodiment Adaptation ---
    try {
      callbacks.onEmbodimentChange(payload.sourceEmbodiment, payload.targetEmbodiment);
      this.currentFormFactor = payload.targetFormFactor;
      this.currentEmbodiment = payload.targetEmbodiment;

      this.emit('handoff:embodiment-adapted', {
        handoffId,
        embodiment: payload.targetEmbodiment,
      });
    } catch (err) {
      const error = `Embodiment adaptation failed: ${err}`;
      this.activeHandoff.errors.push(error);
      callbacks.onError(this.activeHandoff, error);
      return this.completeHandoff(false, error);
    }

    // --- Phase 4: Context Loading (async, non-blocking) ---
    this.activeHandoff.phase = 'context-loading';
    this.activeHandoff.progress = 80;
    callbacks.onContextLoadStart();

    // --- Phase 5: Complete ---
    const status = this.completeHandoff(true);
    callbacks.onComplete(status);

    logger.info(
      `[Handoff] ${handoffId}: Complete (${payload.sourceFormFactor} → ${payload.targetFormFactor}) in ${status.elapsedMs}ms`
    );
    return status;
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Get the current form factor.
   */
  getCurrentFormFactor(): FormFactor {
    return this.currentFormFactor;
  }

  /**
   * Get the current embodiment type.
   */
  getCurrentEmbodiment(): EmbodimentType {
    return this.currentEmbodiment;
  }

  /**
   * Get the active handoff status (null if no handoff in progress).
   */
  getActiveHandoff(): HandoffStatus | null {
    return this.activeHandoff;
  }

  /**
   * Get the handoff history.
   */
  getHandoffHistory(): HandoffStatus[] {
    return [...this.handoffHistory];
  }

  /**
   * Check if a handoff is currently in progress.
   */
  isHandoffInProgress(): boolean {
    return this.activeHandoff !== null && this.activeHandoff.phase !== 'complete';
  }

  /**
   * Cancel an in-progress handoff.
   */
  cancelHandoff(): void {
    if (this.activeHandoff) {
      this.activeHandoff.errors.push('Cancelled by user');
      this.completeHandoff(false, 'cancelled');
    }
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: string, handler: (event: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: (event: any) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  private selectTargetEmbodiment(capabilities: DeviceCapabilities): EmbodimentType {
    const defaultEmb = DEFAULT_EMBODIMENT[capabilities.formFactor];
    const supportedEmbodiments = capabilities.supportedEmbodiments ?? [defaultEmb];
    if (supportedEmbodiments.includes(defaultEmb)) {
      return defaultEmb;
    }
    // Fallback: WebXR if available, otherwise first supported
    if (supportedEmbodiments.includes('WebXR')) {
      return 'WebXR';
    }
    return supportedEmbodiments[0] ?? defaultEmb;
  }

  private completeHandoff(success: boolean, error?: string): HandoffStatus {
    if (!this.activeHandoff) {
      throw new Error('No active handoff to complete');
    }

    if (success) {
      this.activeHandoff.phase = 'complete';
      this.activeHandoff.progress = 100;
    }

    this.activeHandoff.elapsedMs = Date.now() - this.activeHandoff.initiatedAt;
    if (error) {
      this.activeHandoff.errors.push(error);
    }

    const status = { ...this.activeHandoff };
    this.handoffHistory.push(status);

    if (success) {
      this.emit('handoff:complete', {
        handoffId: status.handoffId,
        totalMs: status.elapsedMs,
      });
    } else {
      this.emit('handoff:failed', {
        handoffId: status.handoffId,
        phase: status.phase,
        error: error ?? 'unknown',
      });
    }

    this.activeHandoff = null;
    return status;
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createCrossRealityHandoffProtocol(
  agentId: string,
  agentName: string,
  currentFormFactor: FormFactor,
  currentEmbodiment?: EmbodimentType
): CrossRealityHandoffProtocol {
  return new CrossRealityHandoffProtocol(agentId, agentName, currentFormFactor, currentEmbodiment);
}
