/**
 * @hololand/network StateSync
 *
 * State synchronization with interpolation and prediction
 * Handles smooth rendering of networked objects
 */

import { logger } from './logger';
import type { SyncConfig, SyncState, StateSnapshot, Vector3 } from './types';

const DEFAULT_CONFIG: Required<SyncConfig> = {
  interpolation: true,
  interpolationDelay: 100, // ms
  predictionEnabled: true,
  snapshotRate: 20,
  priorityByDistance: true,
};

interface InterpolationBuffer {
  states: SyncState[];
  maxSize: number;
}

export class StateSync {
  private config: Required<SyncConfig>;
  private buffers: Map<string, InterpolationBuffer> = new Map();
  private predictions: Map<string, SyncState> = new Map();
  private lastRenderTime: number = 0;
  private serverTimeOffset: number = 0;

  constructor(config: SyncConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('StateSync initialized', { config: this.config });
  }

  // ============================================================================
  // Snapshot Processing
  // ============================================================================

  processSnapshot(snapshot: StateSnapshot): void {
    // Calculate server time offset
    const clientTime = Date.now();
    const serverTime = snapshot.timestamp;
    this.serverTimeOffset = clientTime - serverTime;

    // Add states to interpolation buffers
    snapshot.states.forEach((state) => {
      this.addToBuffer(state);
    });
  }

  processState(state: SyncState): void {
    this.addToBuffer(state);
  }

  private addToBuffer(state: SyncState): void {
    let buffer = this.buffers.get(state.objectId);

    if (!buffer) {
      buffer = {
        states: [],
        maxSize: 10, // Keep last 10 snapshots
      };
      this.buffers.set(state.objectId, buffer);
    }

    // Add state in chronological order
    buffer.states.push(state);

    // Sort by timestamp
    buffer.states.sort((a, b) => a.timestamp - b.timestamp);

    // Trim to max size
    while (buffer.states.length > buffer.maxSize) {
      buffer.states.shift();
    }
  }

  // ============================================================================
  // Interpolation
  // ============================================================================

  getInterpolatedState(objectId: string): SyncState | null {
    if (!this.config.interpolation) {
      return this.getLatestState(objectId);
    }

    const buffer = this.buffers.get(objectId);
    if (!buffer || buffer.states.length < 2) {
      return this.getLatestState(objectId);
    }

    // Calculate render time (current time - delay)
    const renderTime =
      Date.now() - this.serverTimeOffset - this.config.interpolationDelay;

    // Find states to interpolate between
    let from: SyncState | null = null;
    let to: SyncState | null = null;

    for (let i = 0; i < buffer.states.length - 1; i++) {
      if (
        buffer.states[i].timestamp <= renderTime &&
        buffer.states[i + 1].timestamp >= renderTime
      ) {
        from = buffer.states[i];
        to = buffer.states[i + 1];
        break;
      }
    }

    // If no valid range, use extrapolation or latest
    if (!from || !to) {
      return this.getLatestState(objectId);
    }

    // Calculate interpolation factor
    const timeDiff = to.timestamp - from.timestamp;
    const t = timeDiff > 0 ? (renderTime - from.timestamp) / timeDiff : 0;
    const clampedT = Math.max(0, Math.min(1, t));

    return this.interpolateStates(from, to, clampedT);
  }

  private interpolateStates(
    from: SyncState,
    to: SyncState,
    t: number
  ): SyncState {
    return {
      objectId: from.objectId,
      position: this.lerpVector3(from.position, to.position, t),
      rotation: this.lerpVector3(from.rotation, to.rotation, t),
      scale: this.lerpVector3(from.scale, to.scale, t),
      velocity: this.lerpVector3(from.velocity, to.velocity, t),
      metadata: to.metadata, // Use latest metadata
      timestamp: from.timestamp + (to.timestamp - from.timestamp) * t,
      sequence: to.sequence,
    };
  }

  private lerpVector3(
    a: Vector3 | undefined,
    b: Vector3 | undefined,
    t: number
  ): Vector3 | undefined {
    if (!a || !b) return b || a;

    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
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

  reconcile(objectId: string, serverState: SyncState): SyncState {
    const prediction = this.predictions.get(objectId);

    if (!prediction) {
      return serverState;
    }

    // Calculate error between prediction and server state
    const positionError = this.calculateError(
      prediction.position,
      serverState.position
    );

    // If error is small, accept prediction
    if (positionError < 0.1) {
      return prediction;
    }

    // Blend between prediction and server state
    const blendFactor = 0.3; // 30% server, 70% client
    const blended = this.interpolateStates(
      serverState,
      prediction,
      1 - blendFactor
    );

    // Update prediction
    this.predictions.set(objectId, blended);

    return blended;
  }

  private calculateError(a: Vector3 | undefined, b: Vector3 | undefined): number {
    if (!a || !b) return 0;

    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
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
  }

  clear(): void {
    this.buffers.clear();
    this.predictions.clear();
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
