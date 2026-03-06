/**
 * @hololand/networking ClientPrediction
 *
 * Client-side prediction with server reconciliation. Provides smooth
 * local movement while awaiting authoritative server state.
 *
 * Uses input replay for reconciliation: when server state arrives,
 * rewind to server tick, re-apply unacknowledged inputs, and smoothly
 * interpolate any correction.
 */

import type { Vector3, Quaternion, EntityState, ClientInput } from './ServerAuthority';

export interface PredictedState {
  entityId: string;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  predictedTick: number;
  confidence: number; // 0-1, decreases with prediction distance
}

export interface ReconciliationResult {
  entityId: string;
  correctionMagnitude: number;
  inputsReplayed: number;
  smoothingFrames: number;
}

export interface ClientPredictionConfig {
  /** Maximum number of unacknowledged inputs to buffer. */
  maxInputBufferSize: number;
  /** Smoothing factor for correction interpolation (0-1). */
  correctionSmoothingFactor: number;
  /** Prediction confidence decay per tick of prediction. */
  confidenceDecayPerTick: number;
  /** Maximum correction distance before snap (no interpolation). */
  snapThreshold: number;
}

const DEFAULT_CONFIG: ClientPredictionConfig = {
  maxInputBufferSize: 128,
  correctionSmoothingFactor: 0.1,
  confidenceDecayPerTick: 0.02,
  snapThreshold: 3.0,
};

/**
 * Client-side prediction engine with server reconciliation.
 */
export class ClientPrediction {
  private config: ClientPredictionConfig;
  private predictedStates: Map<string, PredictedState> = new Map();
  private inputHistory: Map<string, ClientInput[]> = new Map();
  private lastAcknowledgedTick: Map<string, number> = new Map();
  private correctionOffsets: Map<string, Vector3> = new Map();
  private correctionFramesRemaining: Map<string, number> = new Map();

  constructor(config?: Partial<ClientPredictionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a local input and predict the resulting state.
   */
  predictInput(entityId: string, input: ClientInput, dt: number): PredictedState {
    // Store input for potential replay
    if (!this.inputHistory.has(entityId)) {
      this.inputHistory.set(entityId, []);
    }
    const history = this.inputHistory.get(entityId)!;
    history.push(input);

    // Trim buffer if over limit
    if (history.length > this.config.maxInputBufferSize) {
      history.shift();
    }

    // Get or create predicted state
    let predicted = this.predictedStates.get(entityId);
    if (!predicted) {
      predicted = {
        entityId,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        velocity: { x: 0, y: 0, z: 0 },
        predictedTick: 0,
        confidence: 1.0,
      };
    }

    // Apply input to predicted state
    predicted.position = {
      x: predicted.position.x + input.moveDirection.x * dt,
      y: predicted.position.y + input.moveDirection.y * dt,
      z: predicted.position.z + input.moveDirection.z * dt,
    };
    predicted.velocity = { ...input.moveDirection };
    predicted.predictedTick = input.inputSequence;
    predicted.confidence = Math.max(0, predicted.confidence - this.config.confidenceDecayPerTick);

    // Apply any ongoing correction offset
    const offset = this.correctionOffsets.get(entityId);
    const frames = this.correctionFramesRemaining.get(entityId) ?? 0;
    if (offset && frames > 0) {
      const factor = this.config.correctionSmoothingFactor;
      predicted.position.x += offset.x * factor;
      predicted.position.y += offset.y * factor;
      predicted.position.z += offset.z * factor;

      offset.x *= 1 - factor;
      offset.y *= 1 - factor;
      offset.z *= 1 - factor;

      this.correctionFramesRemaining.set(entityId, frames - 1);
      if (frames - 1 <= 0) {
        this.correctionOffsets.delete(entityId);
        this.correctionFramesRemaining.delete(entityId);
      }
    }

    this.predictedStates.set(entityId, predicted);
    return { ...predicted };
  }

  /**
   * Reconcile with authoritative server state. Replays unacknowledged
   * inputs on top of server state and calculates correction.
   */
  reconcile(entityId: string, serverState: EntityState, serverTick: number): ReconciliationResult {
    const predicted = this.predictedStates.get(entityId);
    const history = this.inputHistory.get(entityId) ?? [];

    // Discard acknowledged inputs
    const unacknowledged = history.filter((i) => i.inputSequence > serverTick);
    this.inputHistory.set(entityId, unacknowledged);
    this.lastAcknowledgedTick.set(entityId, serverTick);

    // Start from server state
    let replayPosition: Vector3 = { ...serverState.position };

    // Replay unacknowledged inputs
    const dt = 1 / 60; // Assume 60Hz tick
    for (const input of unacknowledged) {
      replayPosition = {
        x: replayPosition.x + input.moveDirection.x * dt,
        y: replayPosition.y + input.moveDirection.y * dt,
        z: replayPosition.z + input.moveDirection.z * dt,
      };
    }

    // Calculate correction
    const correctionMagnitude = predicted
      ? this.distance(predicted.position, replayPosition)
      : 0;

    // Apply correction
    if (correctionMagnitude > this.config.snapThreshold) {
      // Snap: too far off, just teleport
      if (predicted) {
        predicted.position = { ...replayPosition };
        predicted.confidence = 1.0;
      }
    } else if (correctionMagnitude > 0.001 && predicted) {
      // Smooth correction
      const offset: Vector3 = {
        x: replayPosition.x - predicted.position.x,
        y: replayPosition.y - predicted.position.y,
        z: replayPosition.z - predicted.position.z,
      };
      this.correctionOffsets.set(entityId, offset);
      this.correctionFramesRemaining.set(entityId, 10);
      predicted.position = { ...replayPosition };
      predicted.confidence = 1.0;
    }

    if (predicted) {
      this.predictedStates.set(entityId, predicted);
    }

    return {
      entityId,
      correctionMagnitude,
      inputsReplayed: unacknowledged.length,
      smoothingFrames: correctionMagnitude > this.config.snapThreshold ? 0 : 10,
    };
  }

  /**
   * Initialize prediction state for a new entity from server state.
   */
  initializeEntity(state: EntityState): void {
    this.predictedStates.set(state.entityId, {
      entityId: state.entityId,
      position: { ...state.position },
      rotation: { ...state.rotation },
      velocity: { ...state.velocity },
      predictedTick: state.lastUpdateTick,
      confidence: 1.0,
    });
    this.inputHistory.set(state.entityId, []);
  }

  /**
   * Get the predicted state for an entity.
   */
  getPredictedState(entityId: string): PredictedState | undefined {
    const state = this.predictedStates.get(entityId);
    return state ? { ...state } : undefined;
  }

  /**
   * Get the number of unacknowledged inputs for an entity.
   */
  getUnacknowledgedCount(entityId: string): number {
    return this.inputHistory.get(entityId)?.length ?? 0;
  }

  /**
   * Remove an entity from prediction tracking.
   */
  removeEntity(entityId: string): void {
    this.predictedStates.delete(entityId);
    this.inputHistory.delete(entityId);
    this.lastAcknowledgedTick.delete(entityId);
    this.correctionOffsets.delete(entityId);
    this.correctionFramesRemaining.delete(entityId);
  }

  private distance(a: Vector3, b: Vector3): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }
}
