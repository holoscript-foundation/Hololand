/**
 * @hololand/network StateSync
 *
 * State synchronization with interpolation, extrapolation, and prediction.
 * Handles smooth rendering of networked objects using:
 * - Catmull-Rom spline interpolation (4+ buffer states)
 * - Hermite velocity-aware interpolation (2-3 states with velocity)
 * - Quaternion SLERP for rotation (gimbal-lock free)
 * - Velocity-based extrapolation with acceleration
 * - Tiered correction blending via CorrectionBudget
 * - Adaptive interpolation delay from LatencyTracker
 */

import { logger } from './logger';
import type { SyncConfig, SyncState, StateSnapshot, Vector3, Quaternion, ObjectPriority } from './types';
import {
  vec3Lerp, vec3Add, vec3Scale, vec3Sub, vec3Distance,
  quatSlerp, quatFromEuler, quatToEuler,
  catmullRom, hermiteInterpolate,
} from './MathUtils';
import type { LatencyTracker } from './LatencyTracker';
import type { CorrectionBudget } from './CorrectionBudget';
import type { JitterBuffer } from './JitterBuffer';

const DEFAULT_CONFIG: Required<SyncConfig> = {
  interpolation: true,
  interpolationDelay: 100, // ms
  predictionEnabled: true,
  snapshotRate: 20,
  priorityByDistance: true,
  adaptiveDelay: false,
  extrapolationEnabled: true,
  extrapolationLimit: 300,    // ms
  correctionBudgetPerFrame: 0.05,
  jitterBufferSize: 32,
};

interface InterpolationBuffer {
  states: SyncState[];
  maxSize: number;
}

export class StateSync {
  private config: Required<SyncConfig>;
  private buffers: Map<string, InterpolationBuffer> = new Map();
  private predictions: Map<string, SyncState> = new Map();
  private priorities: Map<string, ObjectPriority> = new Map();
  private serverTimeOffset: number = 0;

  /** Optional subsystems — injected via setters after construction */
  private latencyTracker: LatencyTracker | null = null;
  private correctionBudget: CorrectionBudget | null = null;
  private jitterBuffer: JitterBuffer | null = null;

  constructor(config: SyncConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('StateSync initialized', { config: this.config });
  }

  // ============================================================================
  // Subsystem Wiring
  // ============================================================================

  setLatencyTracker(tracker: LatencyTracker): void {
    this.latencyTracker = tracker;
  }

  setCorrectionBudget(budget: CorrectionBudget): void {
    this.correctionBudget = budget;
  }

  setJitterBuffer(jitter: JitterBuffer): void {
    this.jitterBuffer = jitter;
  }

  /** Set priority for an object (affects correction thresholds). */
  setObjectPriority(objectId: string, priority: ObjectPriority): void {
    this.priorities.set(objectId, priority);
  }

  /** Bulk-set priorities from interest manager distances. */
  syncPrioritiesFromInterest(
    localPlayerId: string,
    objectDistances: Map<string, number>,
  ): void {
    for (const [objectId, distance] of objectDistances) {
      if (objectId === localPlayerId) {
        this.priorities.set(objectId, 'local');
      } else if (distance < 10) {
        this.priorities.set(objectId, 'high');
      } else if (distance < 30) {
        this.priorities.set(objectId, 'medium');
      } else {
        this.priorities.set(objectId, 'low');
      }
    }
  }

  // ============================================================================
  // Snapshot Processing
  // ============================================================================

  processSnapshot(snapshot: StateSnapshot): void {
    const clientTime = Date.now();
    const serverTime = snapshot.timestamp;
    this.serverTimeOffset = clientTime - serverTime;

    for (const state of snapshot.states) {
      this.ingestState(state);
    }
  }

  processState(state: SyncState): void {
    this.ingestState(state);
  }

  /**
   * Ingest a state: run through jitter buffer if available, then add to interpolation buffer.
   */
  private ingestState(state: SyncState): void {
    if (this.jitterBuffer && this.latencyTracker) {
      const holdTime = this.latencyTracker.jitter;
      const ready = this.jitterBuffer.insert(state, holdTime);
      for (const s of ready) {
        this.addToBuffer(s);
      }
    } else {
      this.addToBuffer(state);
    }
  }

  private addToBuffer(state: SyncState): void {
    let buffer = this.buffers.get(state.objectId);

    if (!buffer) {
      buffer = {
        states: [],
        maxSize: 10,
      };
      this.buffers.set(state.objectId, buffer);
    }

    buffer.states.push(state);
    buffer.states.sort((a, b) => a.timestamp - b.timestamp);

    while (buffer.states.length > buffer.maxSize) {
      buffer.states.shift();
    }
  }

  // ============================================================================
  // Interpolation
  // ============================================================================

  /** Get the effective interpolation delay (adaptive or fixed). */
  private getInterpolationDelay(): number {
    if (this.config.adaptiveDelay && this.latencyTracker) {
      return this.latencyTracker.adaptiveDelay;
    }
    return this.config.interpolationDelay;
  }

  getInterpolatedState(objectId: string): SyncState | null {
    if (!this.config.interpolation) {
      return this.getLatestState(objectId);
    }

    const buffer = this.buffers.get(objectId);
    if (!buffer || buffer.states.length < 2) {
      // Try extrapolation with a single state
      if (buffer && buffer.states.length === 1 && this.config.extrapolationEnabled) {
        return this.extrapolate(buffer.states[0]);
      }
      return this.getLatestState(objectId);
    }

    const delay = this.getInterpolationDelay();
    const renderTime = Date.now() - this.serverTimeOffset - delay;

    // Find bracketing states
    let from: SyncState | null = null;
    let to: SyncState | null = null;
    let fromIdx = -1;

    for (let i = 0; i < buffer.states.length - 1; i++) {
      if (
        buffer.states[i].timestamp <= renderTime &&
        buffer.states[i + 1].timestamp >= renderTime
      ) {
        from = buffer.states[i];
        to = buffer.states[i + 1];
        fromIdx = i;
        break;
      }
    }

    // If render time is past all buffered states, try extrapolation
    if (!from || !to) {
      const latest = buffer.states[buffer.states.length - 1];
      if (renderTime > latest.timestamp && this.config.extrapolationEnabled) {
        return this.extrapolate(latest);
      }
      return this.getLatestState(objectId);
    }

    const timeDiff = to.timestamp - from.timestamp;
    const t = timeDiff > 0 ? (renderTime - from.timestamp) / timeDiff : 0;
    const clampedT = Math.max(0, Math.min(1, t));

    // Choose interpolation method based on buffer depth
    if (buffer.states.length >= 4 && fromIdx >= 1 && fromIdx + 2 < buffer.states.length) {
      // Catmull-Rom: use 4 surrounding points
      const p0 = buffer.states[fromIdx - 1];
      const p1 = from;
      const p2 = to;
      const p3 = buffer.states[fromIdx + 2];
      return this.catmullRomInterpolate(p0, p1, p2, p3, clampedT);
    }

    if (from.velocity && to.velocity) {
      // Hermite: velocity-aware interpolation
      return this.hermiteInterpolateStates(from, to, clampedT, timeDiff);
    }

    // Fallback: linear lerp
    return this.interpolateStates(from, to, clampedT);
  }

  /**
   * Catmull-Rom interpolation through 4 points for smooth position curves.
   * Rotation uses SLERP between the two bracketing states.
   */
  private catmullRomInterpolate(
    p0: SyncState, p1: SyncState, p2: SyncState, p3: SyncState, t: number,
  ): SyncState {
    const position = (p1.position && p2.position && p0.position && p3.position)
      ? catmullRom(p0.position, p1.position, p2.position, p3.position, t)
      : this.lerpVector3(p1.position, p2.position, t);

    return {
      objectId: p1.objectId,
      position,
      rotation: this.slerpRotation(p1, p2, t),
      rotationQuat: this.slerpQuaternion(p1, p2, t),
      scale: this.lerpVector3(p1.scale, p2.scale, t),
      velocity: this.lerpVector3(p1.velocity, p2.velocity, t),
      metadata: p2.metadata,
      timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
      sequence: p2.sequence,
    };
  }

  /**
   * Hermite interpolation using positions and velocities at two endpoints.
   */
  private hermiteInterpolateStates(
    from: SyncState, to: SyncState, t: number, dtMs: number,
  ): SyncState {
    const dtSec = dtMs / 1000;
    const position = (from.position && to.position && from.velocity && to.velocity)
      ? hermiteInterpolate(from.position, from.velocity, to.position, to.velocity, t, dtSec)
      : this.lerpVector3(from.position, to.position, t);

    return {
      objectId: from.objectId,
      position,
      rotation: this.slerpRotation(from, to, t),
      rotationQuat: this.slerpQuaternion(from, to, t),
      scale: this.lerpVector3(from.scale, to.scale, t),
      velocity: this.lerpVector3(from.velocity, to.velocity, t),
      metadata: to.metadata,
      timestamp: from.timestamp + (to.timestamp - from.timestamp) * t,
      sequence: to.sequence,
    };
  }

  /**
   * Linear interpolation fallback.
   */
  private interpolateStates(
    from: SyncState,
    to: SyncState,
    t: number,
  ): SyncState {
    return {
      objectId: from.objectId,
      position: this.lerpVector3(from.position, to.position, t),
      rotation: this.slerpRotation(from, to, t),
      rotationQuat: this.slerpQuaternion(from, to, t),
      scale: this.lerpVector3(from.scale, to.scale, t),
      velocity: this.lerpVector3(from.velocity, to.velocity, t),
      metadata: to.metadata,
      timestamp: from.timestamp + (to.timestamp - from.timestamp) * t,
      sequence: to.sequence,
    };
  }

  /**
   * SLERP quaternion rotation between two states.
   * Falls back to converting Euler if quaternion not provided.
   */
  private slerpQuaternion(from: SyncState, to: SyncState, t: number): Quaternion | undefined {
    const a = from.rotationQuat ?? (from.rotation ? quatFromEuler(from.rotation) : undefined);
    const b = to.rotationQuat ?? (to.rotation ? quatFromEuler(to.rotation) : undefined);
    if (!a || !b) return b || a;
    return quatSlerp(a, b, t);
  }

  /**
   * Rotation via SLERP converted back to Euler for backward compatibility.
   */
  private slerpRotation(from: SyncState, to: SyncState, t: number): Vector3 | undefined {
    const q = this.slerpQuaternion(from, to, t);
    if (!q) return this.lerpVector3(from.rotation, to.rotation, t);
    return quatToEuler(q);
  }

  private lerpVector3(
    a: Vector3 | undefined,
    b: Vector3 | undefined,
    t: number,
  ): Vector3 | undefined {
    if (!a || !b) return b || a;
    return vec3Lerp(a, b, t);
  }

  // ============================================================================
  // Extrapolation
  // ============================================================================

  /**
   * Extrapolate from the latest known state using velocity and acceleration.
   * p = p0 + v*dt + 0.5*a*dt²
   * Capped by extrapolationLimit to prevent runaway prediction.
   */
  private extrapolate(state: SyncState): SyncState {
    const now = Date.now() - this.serverTimeOffset;
    const dt = now - state.timestamp;
    const limit = this.config.extrapolationLimit;

    // Don't extrapolate beyond limit
    if (dt <= 0 || dt > limit) return state;

    const dtSec = dt / 1000;
    let position = state.position;

    if (position && state.velocity) {
      // Linear + quadratic extrapolation
      position = vec3Add(position, vec3Scale(state.velocity, dtSec));
      if (state.acceleration) {
        position = vec3Add(position, vec3Scale(state.acceleration, 0.5 * dtSec * dtSec));
      }
    }

    let rotation = state.rotation;
    let rotationQuat = state.rotationQuat;

    if (state.angularVelocity) {
      // Simple angular extrapolation (Euler integration)
      if (rotation) {
        rotation = vec3Add(rotation, vec3Scale(state.angularVelocity, dtSec));
      }
      // For quaternion, convert angular velocity to delta rotation
      if (rotationQuat) {
        const euler = quatToEuler(rotationQuat);
        const extrapolatedEuler = vec3Add(euler, vec3Scale(state.angularVelocity, dtSec));
        rotationQuat = quatFromEuler(extrapolatedEuler);
      }
    }

    return {
      ...state,
      position,
      rotation,
      rotationQuat,
      timestamp: now,
    };
  }

  // ============================================================================
  // Prediction (Client-Side)
  // ============================================================================

  applyPrediction(objectId: string, state: SyncState): void {
    if (!this.config.predictionEnabled) return;
    this.predictions.set(objectId, state);
  }

  getPredictedState(objectId: string): SyncState | null {
    return this.predictions.get(objectId) || null;
  }

  /**
   * Reconcile prediction with server state using tiered correction.
   * Uses CorrectionBudget if available, otherwise falls back to simple blend.
   */
  reconcile(objectId: string, serverState: SyncState): SyncState {
    const prediction = this.predictions.get(objectId);

    if (!prediction) {
      return serverState;
    }

    const positionError = this.calculateError(
      prediction.position,
      serverState.position,
    );

    const priority = this.priorities.get(objectId) ?? 'medium';

    // If CorrectionBudget is available, use tiered correction
    if (this.correctionBudget && prediction.position && serverState.position) {
      if (positionError > 0.001) {
        this.correctionBudget.enqueue(
          objectId,
          priority,
          prediction.position,
          serverState.position,
        );
      }
      // CorrectionBudget will apply the correction over time via processFrame()
      // For now return prediction (correction is applied externally)
      return prediction;
    }

    // Fallback: simple threshold + blend (original behavior)
    if (positionError < 0.1) {
      return prediction;
    }

    const blendFactor = 0.3;
    const blended = this.interpolateStates(
      serverState,
      prediction,
      1 - blendFactor,
    );

    this.predictions.set(objectId, blended);
    return blended;
  }

  private calculateError(a: Vector3 | undefined, b: Vector3 | undefined): number {
    if (!a || !b) return 0;
    return vec3Distance(a, b);
  }

  // ============================================================================
  // Per-Frame Update
  // ============================================================================

  /**
   * Call each frame to:
   * 1. Flush jitter buffer
   * 2. Process correction budget
   *
   * @returns Corrected positions to apply (objectId → position)
   */
  update(deltaMs: number): Map<string, Vector3> {
    const corrections = new Map<string, Vector3>();

    // Flush jitter buffer
    if (this.jitterBuffer && this.latencyTracker) {
      const holdTime = this.latencyTracker.jitter;
      const ready = this.jitterBuffer.flushAll(holdTime);
      for (const state of ready) {
        this.addToBuffer(state);
      }
    }

    // Process correction budget
    if (this.correctionBudget) {
      const results = this.correctionBudget.processFrame(deltaMs);
      for (const [objectId, corrected] of results) {
        corrections.set(objectId, corrected.position);
      }
    }

    return corrections;
  }

  // ============================================================================
  // State Access
  // ============================================================================

  getLatestState(objectId: string): SyncState | null {
    const buffer = this.buffers.get(objectId);
    if (!buffer || buffer.states.length === 0) {
      return null;
    }
    return buffer.states[buffer.states.length - 1];
  }

  getAllObjects(): string[] {
    return Array.from(this.buffers.keys());
  }

  hasObject(objectId: string): boolean {
    return this.buffers.has(objectId);
  }

  removeObject(objectId: string): void {
    this.buffers.delete(objectId);
    this.predictions.delete(objectId);
    this.priorities.delete(objectId);
    if (this.jitterBuffer) this.jitterBuffer.clear(objectId);
    if (this.correctionBudget) this.correctionBudget.cancel(objectId);
  }

  clear(): void {
    this.buffers.clear();
    this.predictions.clear();
    this.priorities.clear();
    if (this.jitterBuffer) this.jitterBuffer.clearAll();
    if (this.correctionBudget) this.correctionBudget.clearAll();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  setInterpolationDelay(delay: number): void {
    this.config.interpolationDelay = delay;
  }

  enablePrediction(enabled: boolean): void {
    this.config.predictionEnabled = enabled;
  }

  enableInterpolation(enabled: boolean): void {
    this.config.interpolation = enabled;
  }

  enableAdaptiveDelay(enabled: boolean): void {
    this.config.adaptiveDelay = enabled;
  }

  enableExtrapolation(enabled: boolean): void {
    this.config.extrapolationEnabled = enabled;
  }

  getConfig(): Required<SyncConfig> {
    return { ...this.config };
  }

  // ============================================================================
  // Debug
  // ============================================================================

  getBufferStats(): Map<string, { size: number; latestTimestamp: number }> {
    const stats = new Map<string, { size: number; latestTimestamp: number }>();

    this.buffers.forEach((buffer, objectId) => {
      const latest = buffer.states[buffer.states.length - 1];
      stats.set(objectId, {
        size: buffer.states.length,
        latestTimestamp: latest?.timestamp || 0,
      });
    });

    return stats;
  }
}
