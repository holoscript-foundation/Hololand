/**
 * EmbodimentTransitionAnimator
 *
 * Manages smooth visual transitions between embodiment types during
 * cross-reality handoffs. Handles fade-out, morph, and fade-in phases
 * with timing adapted to each form factor's performance budget.
 *
 * TRANSITION PHASES:
 * 1. Fade-out:  Source embodiment fades to black/blur (opacity 1→0)
 * 2. Morph:     Intermediate state while embodiment switches
 * 3. Fade-in:   Target embodiment fades from black/blur (opacity 0→1)
 *
 * TIMING:
 * Total transition time adapts to form factor budget:
 * - VR headset:  150ms (tight frame budget, motion sickness risk)
 * - AR glasses:  200ms
 * - Phone:       300ms (can afford longer animation)
 * - Desktop:     400ms (smoothest transition)
 * - Car:         100ms (safety-critical, minimize distraction)
 * - Wearable:    200ms
 *
 * REDUCED MOTION:
 * When UserPreferences.accessibility.reducedMotion is true,
 * transitions are instant (0ms) with no animation.
 *
 * @module EmbodimentTransitionAnimator
 */

import { logger } from './logger';
import type { EmbodimentType, FormFactor } from './CrossRealityContinuityTypes';

// =============================================================================
// TRANSITION CONFIGURATION
// =============================================================================

/**
 * Timing configuration for a transition between embodiment types.
 */
export interface TransitionTiming {
  /** Fade-out duration in ms */
  fadeOutMs: number;
  /** Morph/switch duration in ms */
  morphMs: number;
  /** Fade-in duration in ms */
  fadeInMs: number;
  /** Total transition time */
  totalMs: number;
  /** Easing function name */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/** Default transition timings per form factor */
export const TRANSITION_TIMINGS: Record<FormFactor, TransitionTiming> = {
  'vr-headset':  { fadeOutMs: 50,  morphMs: 50,  fadeInMs: 50,  totalMs: 150, easing: 'ease-out' },
  'ar-glasses':  { fadeOutMs: 60,  morphMs: 60,  fadeInMs: 80,  totalMs: 200, easing: 'ease-in-out' },
  'phone':       { fadeOutMs: 100, morphMs: 80,  fadeInMs: 120, totalMs: 300, easing: 'ease-in-out' },
  'desktop':     { fadeOutMs: 120, morphMs: 100, fadeInMs: 180, totalMs: 400, easing: 'ease-in-out' },
  'car':         { fadeOutMs: 30,  morphMs: 40,  fadeInMs: 30,  totalMs: 100, easing: 'linear' },
  'wearable':    { fadeOutMs: 60,  morphMs: 60,  fadeInMs: 80,  totalMs: 200, easing: 'ease-out' },
};

/** Instant timing for reduced motion */
const INSTANT_TIMING: TransitionTiming = {
  fadeOutMs: 0, morphMs: 0, fadeInMs: 0, totalMs: 0, easing: 'linear',
};

// =============================================================================
// TRANSITION STATE
// =============================================================================

export type TransitionPhase = 'idle' | 'fade-out' | 'morph' | 'fade-in' | 'complete';

export interface TransitionState {
  /** Current phase */
  phase: TransitionPhase;
  /** Overall progress (0-1) */
  progress: number;
  /** Current opacity (for rendering) */
  opacity: number;
  /** Source embodiment */
  from: EmbodimentType;
  /** Target embodiment */
  to: EmbodimentType;
  /** Target form factor */
  targetFormFactor: FormFactor;
  /** Whether reduced motion is active */
  reducedMotion: boolean;
  /** When the transition started */
  startedAt: number;
  /** Expected completion time */
  expectedEndAt: number;
}

// =============================================================================
// ANIMATOR
// =============================================================================

export interface EmbodimentTransitionAnimatorConfig {
  /** Override default timings per form factor */
  timingOverrides?: Partial<Record<FormFactor, Partial<TransitionTiming>>>;
  /** Reduced motion setting (default: false) */
  reducedMotion?: boolean;
}

export class EmbodimentTransitionAnimator {
  private timings: Record<FormFactor, TransitionTiming>;
  private reducedMotion: boolean;
  private activeTransition: TransitionState | null = null;
  private listeners: Map<string, Set<(event: any) => void>> = new Map();
  private transitionHistory: Array<{ from: EmbodimentType; to: EmbodimentType; durationMs: number; timestamp: number }> = [];

  constructor(config?: EmbodimentTransitionAnimatorConfig) {
    this.reducedMotion = config?.reducedMotion ?? false;

    // Merge timing overrides
    this.timings = { ...TRANSITION_TIMINGS };
    if (config?.timingOverrides) {
      for (const [ff, override] of Object.entries(config.timingOverrides)) {
        const key = ff as FormFactor;
        this.timings[key] = { ...TRANSITION_TIMINGS[key], ...override };
        this.timings[key].totalMs = this.timings[key].fadeOutMs + this.timings[key].morphMs + this.timings[key].fadeInMs;
      }
    }

    logger.info('[EmbodimentTransitionAnimator] Initialized', { reducedMotion: this.reducedMotion });
  }

  // ---------------------------------------------------------------------------
  // TRANSITION LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Start a transition from one embodiment to another.
   * Returns the transition state for the renderer to observe.
   */
  startTransition(
    from: EmbodimentType,
    to: EmbodimentType,
    targetFormFactor: FormFactor,
  ): TransitionState {
    if (this.activeTransition && this.activeTransition.phase !== 'complete' && this.activeTransition.phase !== 'idle') {
      // Force-complete the current transition
      this.completeTransition();
    }

    const timing = this.reducedMotion ? INSTANT_TIMING : this.timings[targetFormFactor];
    const now = Date.now();

    this.activeTransition = {
      phase: timing.totalMs === 0 ? 'complete' : 'fade-out',
      progress: timing.totalMs === 0 ? 1 : 0,
      opacity: timing.totalMs === 0 ? 1 : 1,
      from,
      to,
      targetFormFactor,
      reducedMotion: this.reducedMotion,
      startedAt: now,
      expectedEndAt: now + timing.totalMs,
    };

    this.emit('transition:started', { from, to, targetFormFactor, durationMs: timing.totalMs });

    if (timing.totalMs === 0) {
      this.completeTransition();
    }

    return { ...this.activeTransition };
  }

  /**
   * Update the transition state based on elapsed time.
   * Called each frame by the renderer.
   * Returns the current transition state or null if no transition.
   */
  update(): TransitionState | null {
    if (!this.activeTransition || this.activeTransition.phase === 'complete' || this.activeTransition.phase === 'idle') {
      return null;
    }

    const timing = this.timings[this.activeTransition.targetFormFactor];
    const elapsed = Date.now() - this.activeTransition.startedAt;

    if (elapsed >= timing.totalMs) {
      this.completeTransition();
      return this.activeTransition ? { ...this.activeTransition } : null;
    }

    // Determine phase and progress
    if (elapsed < timing.fadeOutMs) {
      // Fade-out phase
      this.activeTransition.phase = 'fade-out';
      const phaseProgress = timing.fadeOutMs > 0 ? elapsed / timing.fadeOutMs : 1;
      this.activeTransition.opacity = 1 - this.applyEasing(phaseProgress, timing.easing);
      this.activeTransition.progress = elapsed / timing.totalMs;
    } else if (elapsed < timing.fadeOutMs + timing.morphMs) {
      // Morph phase
      this.activeTransition.phase = 'morph';
      this.activeTransition.opacity = 0;
      this.activeTransition.progress = elapsed / timing.totalMs;
    } else {
      // Fade-in phase
      this.activeTransition.phase = 'fade-in';
      const phaseElapsed = elapsed - timing.fadeOutMs - timing.morphMs;
      const phaseProgress = timing.fadeInMs > 0 ? phaseElapsed / timing.fadeInMs : 1;
      this.activeTransition.opacity = this.applyEasing(phaseProgress, timing.easing);
      this.activeTransition.progress = elapsed / timing.totalMs;
    }

    return { ...this.activeTransition };
  }

  /**
   * Get the current transition state.
   */
  getTransitionState(): TransitionState | null {
    return this.activeTransition ? { ...this.activeTransition } : null;
  }

  /**
   * Check if a transition is active.
   */
  isTransitioning(): boolean {
    return this.activeTransition !== null
      && this.activeTransition.phase !== 'complete'
      && this.activeTransition.phase !== 'idle';
  }

  /**
   * Get the transition timing for a form factor.
   */
  getTimingForFormFactor(formFactor: FormFactor): TransitionTiming {
    if (this.reducedMotion) return { ...INSTANT_TIMING };
    return { ...this.timings[formFactor] };
  }

  /**
   * Set reduced motion preference.
   */
  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  /**
   * Get the transition history.
   */
  getHistory() {
    return [...this.transitionHistory];
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: string, handler: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  private completeTransition(): void {
    if (!this.activeTransition) return;

    this.activeTransition.phase = 'complete';
    this.activeTransition.progress = 1;
    this.activeTransition.opacity = 1;

    const durationMs = Date.now() - this.activeTransition.startedAt;

    this.transitionHistory.push({
      from: this.activeTransition.from,
      to: this.activeTransition.to,
      durationMs,
      timestamp: Date.now(),
    });

    this.emit('transition:complete', {
      from: this.activeTransition.from,
      to: this.activeTransition.to,
      durationMs,
    });

    logger.info(`[EmbodimentTransitionAnimator] ${this.activeTransition.from} → ${this.activeTransition.to} in ${durationMs}ms`);
  }

  private applyEasing(t: number, easing: TransitionTiming['easing']): number {
    const clamped = Math.max(0, Math.min(1, t));
    switch (easing) {
      case 'linear': return clamped;
      case 'ease-in': return clamped * clamped;
      case 'ease-out': return 1 - (1 - clamped) * (1 - clamped);
      case 'ease-in-out':
        return clamped < 0.5
          ? 2 * clamped * clamped
          : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    }
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

export function createEmbodimentTransitionAnimator(
  config?: EmbodimentTransitionAnimatorConfig,
): EmbodimentTransitionAnimator {
  return new EmbodimentTransitionAnimator(config);
}
