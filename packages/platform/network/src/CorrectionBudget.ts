/**
 * @hololand/network CorrectionBudget
 *
 * Manages per-frame visual correction budget to prevent jarring teleportation.
 * Queues corrections by priority and applies them within a displacement budget,
 * ensuring local player corrections are never deferred.
 */

import type { Vector3, ObjectPriority } from './types';
import { vec3Distance, vec3Lerp, vec3Scale, vec3Sub, vec3Add, cubicBezier } from './MathUtils';

// =============================================================================
// Types
// =============================================================================

export type BlendType = 'invisible' | 'exponential' | 'bezier' | 'snap';

export interface PendingCorrection {
  objectId: string;
  priority: ObjectPriority;
  errorMagnitude: number;
  currentPosition: Vector3;
  targetPosition: Vector3;
  blendType: BlendType;
  /** Blend duration in ms */
  duration: number;
  /** Time elapsed so far in ms */
  elapsed: number;
}

export interface CorrectedState {
  objectId: string;
  position: Vector3;
  /** true if this correction completed this frame */
  completed: boolean;
}

/** Thresholds per priority for choosing blend type */
interface CorrectionTier {
  invisibleMax: number;
  exponentialMax: number;
  exponentialDuration: number;
  bezierMax: number;
  bezierDuration: number;
}

// =============================================================================
// Tiered Correction Thresholds
// =============================================================================

const CORRECTION_TIERS: Record<ObjectPriority, CorrectionTier> = {
  local:  { invisibleMax: 0.05, exponentialMax: 0.3, exponentialDuration: 200, bezierMax: 1.5, bezierDuration: 300 },
  high:   { invisibleMax: 0.1,  exponentialMax: 0.5, exponentialDuration: 200, bezierMax: 2.0, bezierDuration: 300 },
  medium: { invisibleMax: 0.15, exponentialMax: 0.75, exponentialDuration: 250, bezierMax: 3.0, bezierDuration: 400 },
  low:    { invisibleMax: 0.25, exponentialMax: 1.0, exponentialDuration: 300, bezierMax: 5.0, bezierDuration: 500 },
};

// Priority ordering for sort (lower = more important)
const PRIORITY_ORDER: Record<ObjectPriority, number> = {
  local: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// =============================================================================
// CorrectionBudget
// =============================================================================

export class CorrectionBudget {
  private pending: Map<string, PendingCorrection> = new Map();
  private readonly budgetPerFrame: number;
  private burstModeUntil: number = 0;
  private readonly burstMultiplier: number = 10;
  private readonly burstDuration: number = 500; // ms

  /**
   * @param budgetPerFrame  Max displacement in meters applied per frame (default 0.05m)
   */
  constructor(budgetPerFrame: number = 0.05) {
    this.budgetPerFrame = budgetPerFrame;
  }

  /**
   * Classify a correction error into a blend type and duration.
   */
  classifyCorrection(
    errorMagnitude: number,
    priority: ObjectPriority,
  ): { blendType: BlendType; duration: number } {
    const tier = CORRECTION_TIERS[priority];

    if (errorMagnitude <= tier.invisibleMax) {
      return { blendType: 'invisible', duration: 0 };
    }
    if (errorMagnitude <= tier.exponentialMax) {
      return { blendType: 'exponential', duration: tier.exponentialDuration };
    }
    if (errorMagnitude <= tier.bezierMax) {
      return { blendType: 'bezier', duration: tier.bezierDuration };
    }
    return { blendType: 'snap', duration: 0 };
  }

  /**
   * Enqueue a correction for an object.
   * If a correction already exists for this object, it's replaced.
   */
  enqueue(
    objectId: string,
    priority: ObjectPriority,
    currentPosition: Vector3,
    targetPosition: Vector3,
  ): void {
    const errorMagnitude = vec3Distance(currentPosition, targetPosition);
    const { blendType, duration } = this.classifyCorrection(errorMagnitude, priority);

    this.pending.set(objectId, {
      objectId,
      priority,
      errorMagnitude,
      currentPosition,
      targetPosition,
      blendType,
      duration,
      elapsed: 0,
    });
  }

  /**
   * Enable burst mode (10x budget) for reconnection scenarios.
   */
  enableBurst(now: number = Date.now()): void {
    this.burstModeUntil = now + this.burstDuration;
  }

  /**
   * Process one frame of corrections within the budget.
   * Returns corrected positions for objects that had corrections applied.
   */
  processFrame(deltaMs: number, now: number = Date.now()): Map<string, CorrectedState> {
    const results = new Map<string, CorrectedState>();
    if (this.pending.size === 0) return results;

    // Determine effective budget
    const isBurst = now < this.burstModeUntil;
    let remainingBudget = this.budgetPerFrame * (isBurst ? this.burstMultiplier : 1);

    // Sort corrections: local always first, then by priority, then by error magnitude (desc)
    const sorted = [...this.pending.values()].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority];
      const pb = PRIORITY_ORDER[b.priority];
      if (pa !== pb) return pa - pb;
      return b.errorMagnitude - a.errorMagnitude;
    });

    const toRemove: string[] = [];

    for (const correction of sorted) {
      // Local player corrections are never deferred
      const isLocal = correction.priority === 'local';

      if (!isLocal && remainingBudget <= 0) continue;

      const result = this.applyCorrection(correction, deltaMs);

      // Deduct from budget (local doesn't consume budget)
      if (!isLocal) {
        const displacement = vec3Distance(correction.currentPosition, result.position);
        remainingBudget -= displacement;
      }

      results.set(correction.objectId, result);

      if (result.completed) {
        toRemove.push(correction.objectId);
      } else {
        // Update current position for next frame
        correction.currentPosition = result.position;
        correction.elapsed += deltaMs;
      }
    }

    // Clean up completed corrections
    for (const id of toRemove) {
      this.pending.delete(id);
    }

    return results;
  }

  private applyCorrection(correction: PendingCorrection, deltaMs: number): CorrectedState {
    const { objectId, currentPosition, targetPosition, blendType, duration, elapsed } = correction;

    switch (blendType) {
      case 'invisible':
      case 'snap':
        // Instant — jump to target
        return { objectId, position: { ...targetPosition }, completed: true };

      case 'exponential': {
        // Exponential blend: approach target by a fraction per frame
        const t = Math.min(1, (elapsed + deltaMs) / duration);
        const smoothT = 1 - Math.pow(1 - t, 3); // ease-out cubic
        const position = vec3Lerp(currentPosition, targetPosition, smoothT);
        const completed = t >= 1 || vec3Distance(position, targetPosition) < 0.001;
        return { objectId, position: completed ? { ...targetPosition } : position, completed };
      }

      case 'bezier': {
        // Cubic Bezier: smooth S-curve from current to target
        const t = Math.min(1, (elapsed + deltaMs) / duration);
        const diff = vec3Sub(targetPosition, currentPosition);
        // Control points: ease out from current, ease into target
        const c1 = vec3Add(currentPosition, vec3Scale(diff, 0.33));
        const c2 = vec3Add(currentPosition, vec3Scale(diff, 0.67));
        const position = cubicBezier(currentPosition, c1, c2, targetPosition, t);
        const completed = t >= 1;
        return { objectId, position: completed ? { ...targetPosition } : position, completed };
      }
    }
  }

  /** Number of pending corrections. */
  get pendingCount(): number {
    return this.pending.size;
  }

  /** Remove a pending correction (e.g., object despawned). */
  cancel(objectId: string): void {
    this.pending.delete(objectId);
  }

  /** Clear all pending corrections. */
  clearAll(): void {
    this.pending.clear();
  }
}
