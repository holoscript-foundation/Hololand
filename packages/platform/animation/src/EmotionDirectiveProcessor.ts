/**
 * Emotion Directive Processor — Runtime integration for @hololand/animation
 *
 * Bridges the @holoscript/core EmotionDirectiveTrait with the HoloLand
 * AnimationSystem. Applies expression morph weights and resolves animation
 * clip names from the EmotionDirectiveTrait's output to actual AnimationClip
 * playback on a Skeleton.
 *
 * Usage:
 * ```typescript
 * import { EmotionDirectiveProcessor } from '@hololand/animation';
 * import { createEmotionDirectiveTrait } from '@holoscript/core';
 *
 * const trait = createEmotionDirectiveTrait();
 * const processor = new EmotionDirectiveProcessor(trait, animationSystem, skeletonId);
 *
 * // When LLM response arrives
 * processor.processLLMResponse({
 *   segments: [
 *     { text: "Hello!", facialExpression: "happy", animation: "waving", gestures: ["wave"] },
 *     { text: "How can I help?", facialExpression: "empathetic", animation: "talking" }
 *   ],
 *   mood: "happy"
 * });
 *
 * // Each frame
 * const expressionWeights = processor.update(deltaTime);
 * // Apply expressionWeights to morph targets on avatar mesh
 * ```
 */

import type {
  EmotionDirectiveConfig,
  EmotionDirectiveEvent,
  EmotionDirectiveEventType,
  EmotionTaggedResponse,
  EmotionTaggedSegment,
  TriggeringDirective,
  ConditionalDirective,
} from '@holoscript/core';

import { EmotionDirectiveTrait } from '@holoscript/core';
import type { AnimationSystem, AnimationClip, Skeleton } from './index';

type EmotionDirectiveRuntime = Omit<EmotionDirectiveTrait, 'update' | 'on' | 'off'> & {
  update(deltaTime: number): Record<string, number>;
  on(event: string, callback: (event: EmotionDirectiveEvent) => void): void;
  off(event: string, callback: (event: EmotionDirectiveEvent) => void): void;
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Morph target applicator interface
 * Implement this to connect expression weights to your 3D mesh
 */
export interface MorphTargetApplicator {
  /** Apply a set of morph target weights to the mesh */
  applyWeights(weights: Record<string, number>): void;

  /** Get available morph target names */
  getAvailableTargets(): string[];
}

/**
 * Animation clip resolver
 * Maps animation preset names to actual AnimationClip instances
 */
export interface AnimationClipResolver {
  /** Resolve a clip name to an AnimationClip */
  resolve(clipName: string): AnimationClip | undefined;
}

/**
 * Emotion directive processor configuration
 */
export interface EmotionDirectiveProcessorConfig {
  /** EmotionDirectiveTrait config */
  traitConfig?: EmotionDirectiveConfig;

  /** Skeleton ID to animate */
  skeletonId?: string;

  /** Morph target applicator (optional, if not using manual weights) */
  morphApplicator?: MorphTargetApplicator;

  /** Animation clip resolver (optional, if not providing clips directly) */
  clipResolver?: AnimationClipResolver;

  /** Auto-apply expression weights via morph applicator */
  autoApplyExpressions?: boolean;

  /** Auto-play animation clips on the skeleton */
  autoPlayAnimations?: boolean;

  /** Crossfade duration for animation transitions (seconds) */
  animationCrossfade?: number;

  /** Enable automatic filler generation during idle processing */
  autoFillers?: boolean;

  /** Filler interval range [min, max] in milliseconds */
  fillerInterval?: [number, number];
}

/**
 * Processor state
 */
export interface EmotionDirectiveProcessorState {
  isProcessingResponse: boolean;
  currentSegmentIndex: number;
  totalSegments: number;
  currentExpression: string;
  currentAnimation: string;
  mood: string;
  moodIntensity: number;
  pendingTriggers: number;
}

// =============================================================================
// EMOTION DIRECTIVE PROCESSOR
// =============================================================================

export class EmotionDirectiveProcessor {
  private trait: EmotionDirectiveRuntime;
  private config: EmotionDirectiveProcessorConfig;
  private animationSystem: AnimationSystem | null;
  private skeletonId: string | null;
  private currentClipName: string | null = null;
  private fillerTimer: ReturnType<typeof setTimeout> | null = null;
  private isFillerMode: boolean = false;

  // Trigger playback tracking
  private activeTrigger: TriggeringDirective | null = null;
  private triggerElapsed: number = 0;

  constructor(
    trait?: EmotionDirectiveTrait,
    animationSystem?: AnimationSystem,
    skeletonId?: string,
    config?: EmotionDirectiveProcessorConfig
  ) {
    this.config = {
      autoApplyExpressions: false,
      autoPlayAnimations: true,
      animationCrossfade: 0.3,
      autoFillers: true,
      fillerInterval: [2000, 5000],
      ...config,
    };

    this.trait = (trait ??
      new EmotionDirectiveTrait(config?.traitConfig)) as unknown as EmotionDirectiveRuntime;
    this.animationSystem = animationSystem ?? null;
    this.skeletonId = skeletonId ?? config?.skeletonId ?? null;

    // Wire trait events to animation playback
    this.trait.on('animation-change', (event: EmotionDirectiveEvent & { animation?: string }) => {
      if (this.config.autoPlayAnimations && event.animation) {
        this.playAnimationClip(event.animation);
      }
    });

    this.trait.on('trigger-fire', () => {
      this.processNextTrigger();
    });

    this.trait.on('response-end', () => {
      this.stopFillerMode();
    });
  }

  /**
   * Get the underlying EmotionDirectiveTrait
   */
  public getTrait(): EmotionDirectiveTrait {
    return this.trait as unknown as EmotionDirectiveTrait;
  }

  /**
   * Get current processor state
   */
  public getState(): EmotionDirectiveProcessorState {
    const traitState = this.trait.getState();
    return {
      isProcessingResponse: this.trait.getCurrentSegment() !== null,
      currentSegmentIndex: this.trait.getCurrentSegmentIndex(),
      totalSegments: 0,
      currentExpression: traitState.expression,
      currentAnimation: traitState.animation,
      mood: traitState.mood,
      moodIntensity: traitState.moodIntensity,
      pendingTriggers: traitState.pendingTriggers.length,
    };
  }

  // ===========================================================================
  // LLM Response Processing
  // ===========================================================================

  /**
   * Process a structured LLM response with emotion tags
   * This is the main entry point for driving the avatar's emotional state
   */
  public processLLMResponse(response: EmotionTaggedResponse): void {
    this.stopFillerMode();
    this.trait.processResponse(response);
  }

  /**
   * Advance to the next segment (call when TTS finishes a segment)
   */
  public advanceSegment(): EmotionTaggedSegment | null {
    return this.trait.advanceSegment();
  }

  /**
   * Get the current segment being spoken
   */
  public getCurrentSegment(): EmotionTaggedSegment | null {
    return this.trait.getCurrentSegment();
  }

  // ===========================================================================
  // State Control
  // ===========================================================================

  /**
   * Set a conditional state (e.g., 'listening', 'thinking', 'idle')
   */
  public setConditionalState(directive: ConditionalDirective): void {
    this.trait.setConditionalState(directive);
  }

  /**
   * Set expression directly
   */
  public setExpression(expression: string, blendTime?: number): void {
    this.trait.setExpression(expression, blendTime);
  }

  /**
   * Set animation directly
   */
  public setAnimation(animation: string): void {
    this.trait.setAnimation(animation);
  }

  /**
   * Fire a triggering directive (one-shot gesture)
   */
  public fireTrigger(directive: TriggeringDirective): void {
    this.trait.fireTrigger(directive);
  }

  /**
   * Enter filler mode (avatar appears engaged while LLM processes)
   */
  public startFillerMode(): void {
    if (!this.config.autoFillers || this.isFillerMode) return;

    this.isFillerMode = true;
    this.trait.setConditionalState({
      type: 'conditional',
      state: 'thinking',
      expression: 'thinking',
      animation: 'thinking',
    });

    this.scheduleNextFiller();
  }

  /**
   * Exit filler mode
   */
  public stopFillerMode(): void {
    this.isFillerMode = false;
    if (this.fillerTimer) {
      clearTimeout(this.fillerTimer);
      this.fillerTimer = null;
    }
  }

  // ===========================================================================
  // Per-Frame Update
  // ===========================================================================

  /**
   * Update the emotion system and return expression morph weights
   * Call this every frame in the render loop
   */
  public update(deltaTime: number): Record<string, number> {
    // Update trait (blends expressions, decays mood)
    const weights = this.trait.update(deltaTime);

    // Process active trigger animation
    if (this.activeTrigger) {
      const duration = this.activeTrigger.duration ?? 1.0;
      this.triggerElapsed += deltaTime;

      if (this.triggerElapsed >= duration) {
        this.activeTrigger = null;
        this.triggerElapsed = 0;
        this.processNextTrigger();
      }
    }

    // Auto-apply to morph targets if applicator is configured
    if (this.config.autoApplyExpressions && this.config.morphApplicator) {
      this.config.morphApplicator.applyWeights(weights);
    }

    return weights;
  }

  // ===========================================================================
  // Animation Playback
  // ===========================================================================

  /**
   * Connect to an AnimationSystem and skeleton
   */
  public connectAnimationSystem(system: AnimationSystem, skeletonId: string): void {
    this.animationSystem = system;
    this.skeletonId = skeletonId;
  }

  /**
   * Play an animation clip by preset name
   */
  private playAnimationClip(presetName: string): void {
    if (!this.animationSystem || !this.skeletonId) return;

    const clipName = this.trait.getCurrentAnimationClip();
    if (!clipName || clipName === this.currentClipName) return;

    // Stop current clip
    if (this.currentClipName) {
      this.animationSystem.stopClip(this.skeletonId, this.currentClipName);
    }

    // Resolve and play new clip
    let clip: AnimationClip | undefined;

    if (this.config.clipResolver) {
      clip = this.config.clipResolver.resolve(clipName);
    }

    if (clip) {
      this.animationSystem.playClip(this.skeletonId, clip, {
        loop: true,
        weight: 1.0,
        speed: 1.0,
        blendMode: 'override',
        startTime: 0,
      });
    }

    this.currentClipName = clipName;
  }

  /**
   * Process the next pending trigger
   */
  private processNextTrigger(): void {
    if (this.activeTrigger) return;

    const trigger = this.trait.consumeTrigger();
    if (!trigger) return;

    this.activeTrigger = trigger;
    this.triggerElapsed = 0;

    // Resolve trigger animation
    if (this.animationSystem && this.skeletonId && this.config.clipResolver) {
      const gestureClipName = trigger.action;
      const clip = this.config.clipResolver.resolve(gestureClipName);

      if (clip) {
        this.animationSystem.playClip(this.skeletonId, clip, {
          loop: false,
          weight: trigger.intensity ?? 1.0,
          speed: 1.0,
          blendMode: 'additive',
          startTime: 0,
        });
      }
    }
  }

  /**
   * Schedule the next filler gesture
   */
  private scheduleNextFiller(): void {
    if (!this.isFillerMode) return;

    const [min, max] = this.config.fillerInterval ?? [2000, 5000];
    const delay = min + Math.random() * (max - min);

    this.fillerTimer = setTimeout(() => {
      if (this.isFillerMode) {
        this.trait.generateFiller();
        this.scheduleNextFiller();
      }
    }, delay);
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  /**
   * Register event listener
   */
  public on(
    event: EmotionDirectiveEventType,
    callback: (event: EmotionDirectiveEvent) => void
  ): void {
    this.trait.on(event, callback);
  }

  /**
   * Unregister event listener
   */
  public off(
    event: EmotionDirectiveEventType,
    callback: (event: EmotionDirectiveEvent) => void
  ): void {
    this.trait.off(event, callback);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.stopFillerMode();

    if (this.currentClipName && this.animationSystem && this.skeletonId) {
      this.animationSystem.stopClip(this.skeletonId, this.currentClipName);
    }

    this.trait.dispose();
    this.animationSystem = null;
    this.skeletonId = null;
  }
}

/**
 * Create an emotion directive processor
 */
export function createEmotionDirectiveProcessor(
  animationSystem?: AnimationSystem,
  skeletonId?: string,
  config?: EmotionDirectiveProcessorConfig
): EmotionDirectiveProcessor {
  return new EmotionDirectiveProcessor(undefined, animationSystem, skeletonId, config);
}
