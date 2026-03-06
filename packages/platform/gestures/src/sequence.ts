/**
 * @hololand/gestures - Gesture Sequence Detection
 */

import {
  GestureType,
  GestureResult,
  GestureSequence,
  GestureSequenceStep,
  SequenceProgress,
  GestureEvent,
  GestureEventHandler,
  GESTURE_SEQUENCE_PRESETS,
} from './types';

// ============================================================================
// Gesture Sequence Builder
// ============================================================================

/**
 * Builder for creating gesture sequences
 */
export class GestureSequenceBuilder {
  private name: string;
  private steps: GestureSequenceStep[] = [];
  private timeout = 2000;
  private loopable = false;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Add a gesture step
   */
  addStep(
    gesture: GestureType,
    options?: { handedness?: 'left' | 'right' | 'both'; maxDuration?: number; minDuration?: number }
  ): this {
    this.steps.push({
      gesture,
      handedness: options?.handedness,
      maxDuration: options?.maxDuration,
      minDuration: options?.minDuration,
    });
    return this;
  }

  /**
   * Set sequence timeout
   */
  setTimeout(ms: number): this {
    this.timeout = ms;
    return this;
  }

  /**
   * Make sequence loopable
   */
  setLoopable(loopable: boolean): this {
    this.loopable = loopable;
    return this;
  }

  /**
   * Build the sequence
   */
  build(): GestureSequence {
    if (this.steps.length === 0) {
      throw new Error('Sequence must have at least one step');
    }

    return {
      name: this.name,
      steps: [...this.steps],
      timeout: this.timeout,
      loopable: this.loopable,
    };
  }
}

// ============================================================================
// Gesture Sequence Detector
// ============================================================================

interface ActiveSequence {
  sequence: GestureSequence;
  currentStep: number;
  startTime: number;
  lastStepTime: number;
  lastStepEndTime: number;
}

/**
 * Detects gesture sequences (combos)
 */
export class GestureSequenceDetector {
  private sequences: Map<string, GestureSequence> = new Map();
  private activeSequences: Map<string, ActiveSequence> = new Map();
  private handlers: Set<GestureEventHandler> = new Set();

  constructor() {
    // Register presets
    for (const [name, sequence] of Object.entries(GESTURE_SEQUENCE_PRESETS)) {
      this.registerSequence(sequence);
    }
  }

  /**
   * Subscribe to sequence events
   */
  on(handler: GestureEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Register a gesture sequence
   */
  registerSequence(sequence: GestureSequence): void {
    this.sequences.set(sequence.name, sequence);
  }

  /**
   * Unregister a sequence
   */
  unregisterSequence(name: string): void {
    this.sequences.delete(name);
    this.activeSequences.delete(name);
  }

  /**
   * Get registered sequence names
   */
  getSequenceNames(): string[] {
    return Array.from(this.sequences.keys());
  }

  /**
   * Process a detected gesture
   */
  process(result: GestureResult): SequenceProgress[] {
    const now = Date.now();
    const completedSequences: SequenceProgress[] = [];

    // Check each registered sequence
    for (const [name, sequence] of this.sequences) {
      const active = this.activeSequences.get(name);

      if (!active) {
        // Check if this gesture starts the sequence
        if (this.matchesStep(result, sequence.steps[0])) {
          this.activeSequences.set(name, {
            sequence,
            currentStep: 0,
            startTime: now,
            lastStepTime: now,
            lastStepEndTime: now,
          });
        }
        continue;
      }

      // Check for timeout
      if (now - active.lastStepTime > sequence.timeout) {
        this.activeSequences.delete(name);

        // Check if this gesture restarts the sequence
        if (this.matchesStep(result, sequence.steps[0])) {
          this.activeSequences.set(name, {
            sequence,
            currentStep: 0,
            startTime: now,
            lastStepTime: now,
            lastStepEndTime: now,
          });
        }
        continue;
      }

      const currentStep = sequence.steps[active.currentStep];
      const nextStep = sequence.steps[active.currentStep + 1];

      // Check if current step has duration requirements
      if (currentStep.minDuration) {
        const stepDuration = now - active.lastStepTime;
        if (stepDuration < currentStep.minDuration) {
          continue;
        }
      }

      // Check if next step matches
      if (nextStep && this.matchesStep(result, nextStep)) {
        active.currentStep++;
        active.lastStepTime = now;

        // Check if sequence is complete
        if (active.currentStep === sequence.steps.length - 1) {
          const progress: SequenceProgress = {
            sequence: name,
            currentStep: active.currentStep,
            totalSteps: sequence.steps.length,
            startTime: active.startTime,
            lastStepTime: now,
            completed: true,
          };

          completedSequences.push(progress);
          this.emit({ type: 'sequence', result: progress, timestamp: now });

          // Reset or remove sequence
          if (sequence.loopable) {
            active.currentStep = 0;
            active.startTime = now;
          } else {
            this.activeSequences.delete(name);
          }
        }
      }
    }

    return completedSequences;
  }

  /**
   * Get progress for all active sequences
   */
  getActiveProgress(): SequenceProgress[] {
    const now = Date.now();
    const progress: SequenceProgress[] = [];

    for (const [name, active] of this.activeSequences) {
      // Skip timed out sequences
      if (now - active.lastStepTime > active.sequence.timeout) {
        this.activeSequences.delete(name);
        continue;
      }

      progress.push({
        sequence: name,
        currentStep: active.currentStep,
        totalSteps: active.sequence.steps.length,
        startTime: active.startTime,
        lastStepTime: active.lastStepTime,
        completed: false,
      });
    }

    return progress;
  }

  /**
   * Reset all active sequences
   */
  reset(): void {
    this.activeSequences.clear();
  }

  private matchesStep(result: GestureResult, step: GestureSequenceStep): boolean {
    if (result.gesture !== step.gesture) {
      return false;
    }

    if (step.handedness && step.handedness !== result.handedness) {
      return false;
    }

    return true;
  }

  private emit(event: GestureEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[GestureSequenceDetector] Handler error:', error);
      }
    }
  }
}

/**
 * Factory function to create gesture sequence detector
 */
export function createGestureSequenceDetector(): GestureSequenceDetector {
  return new GestureSequenceDetector();
}
