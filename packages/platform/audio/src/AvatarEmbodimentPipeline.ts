/**
 * Avatar Embodiment Pipeline — Full AI avatar runtime orchestration
 *
 * Wires the complete pipeline: STT → LLM → TTS → Lip Sync → Expression → Animation
 *
 * Each pipeline stage is modular and event-driven. The pipeline manages
 * state transitions between stages and coordinates timing between
 * TTS audio playback and lip-sync/expression/animation updates.
 *
 * @example
 * ```typescript
 * import { AvatarEmbodimentPipeline } from '@hololand/audio';
 *
 * const pipeline = new AvatarEmbodimentPipeline({
 *   tts: { provider: 'elevenlabs', voiceId: 'aria' },
 *   lipSync: { method: 'fft', blendShapeSet: 'arkit' },
 *   emotion: { microExpressions: true },
 * });
 *
 * // Provide the LLM response handler
 * pipeline.setLLMHandler(async (userText) => {
 *   const response = await callLLM(userText);
 *   return response; // EmotionTaggedResponse
 * });
 *
 * // Connect mesh morph targets
 * pipeline.setMorphTargetApplicator({
 *   applyWeights: (w) => applyToMesh(w),
 *   getAvailableTargets: () => mesh.morphTargetDictionary,
 * });
 *
 * // Start the pipeline (enables listening)
 * await pipeline.start();
 * ```
 */

import type {
  LipSyncConfig,
  EmotionDirectiveConfig,
  EmotionTaggedResponse,
  EmotionTaggedSegment,
  AvatarEmbodimentConfig,
  PipelineStage,
} from '@holoscript/core';

import { LipSyncTrait, EmotionDirectiveTrait } from '@holoscript/core';
import { LipSyncProcessor } from './LipSyncProcessor';

// =============================================================================
// TYPES
// =============================================================================

/**
 * TTS provider configuration
 */
export interface TTSProviderConfig {
  /** TTS provider name */
  provider: 'browser' | 'azure' | 'google' | 'elevenlabs' | 'openai' | 'custom';

  /** Voice ID or name */
  voiceId?: string;

  /** Speaking rate (0.5-2.0) */
  rate?: number;

  /** Pitch adjustment (-1 to 1) */
  pitch?: number;

  /** Enable viseme callbacks from provider (Azure, Google) */
  visemeCallbacks?: boolean;

  /** Custom TTS function */
  customSynthesize?: (text: string, voiceStyle?: string) => Promise<TTSSynthesisResult>;
}

/**
 * TTS synthesis result
 */
export interface TTSSynthesisResult {
  /** Audio data (ArrayBuffer, AudioBuffer, or URL to audio file) */
  audio: ArrayBuffer | AudioBuffer | string;

  /** Viseme timestamps from provider (if available) */
  visemes?: Array<{ time: number; viseme: string; weight?: number }>;

  /** Word boundaries for segment timing */
  wordBoundaries?: Array<{ time: number; word: string; charIndex: number }>;

  /** Total duration in seconds */
  duration: number;
}

/**
 * LLM handler function signature
 * Takes user input text and returns a structured emotion-tagged response
 */
export type LLMHandler = (userText: string) => Promise<EmotionTaggedResponse>;

/**
 * STT handler function signature
 * Returns recognized text from speech
 */
export type STTHandler = () => Promise<string>;

/**
 * TTS handler function signature
 * Synthesizes speech from text with optional voice style
 */
export type TTSHandler = (text: string, voiceStyle?: string) => Promise<TTSSynthesisResult>;

/**
 * Pipeline event types
 */
export type PipelineEventType =
  | 'stage-change'
  | 'turn-start'
  | 'turn-end'
  | 'stt-result'
  | 'llm-response'
  | 'tts-start'
  | 'tts-end'
  | 'segment-start'
  | 'segment-end'
  | 'error';

/**
 * Pipeline event
 */
export interface PipelineEvent {
  type: PipelineEventType;
  stage?: PipelineStage;
  text?: string;
  segment?: EmotionTaggedSegment;
  segmentIndex?: number;
  error?: Error;
  timestamp: number;
}

/**
 * Pipeline event callback
 */
type PipelineEventCallback = (event: PipelineEvent) => void;

/**
 * Full pipeline configuration
 */
export interface AvatarEmbodimentPipelineConfig {
  /** TTS configuration */
  tts?: TTSProviderConfig;

  /** LipSync trait configuration */
  lipSync?: LipSyncConfig;

  /** Emotion directive configuration */
  emotion?: EmotionDirectiveConfig;

  /** Avatar embodiment configuration */
  avatar?: AvatarEmbodimentConfig;

  /** Audio context to share across audio subsystems */
  audioContext?: AudioContext;

  /** Enable auto-listening after each response */
  autoListen?: boolean;

  /** Enable filler gestures while LLM processes */
  fillerGestures?: boolean;
}

/**
 * Pipeline state
 */
export interface PipelineState {
  stage: PipelineStage;
  turnCount: number;
  isRunning: boolean;
  lastUserText: string | null;
  lastResponse: EmotionTaggedResponse | null;
  currentSegmentIndex: number;
}

// =============================================================================
// AVATAR EMBODIMENT PIPELINE
// =============================================================================

export class AvatarEmbodimentPipeline {
  private config: AvatarEmbodimentPipelineConfig;
  private lipSyncProcessor: LipSyncProcessor;
  private emotionTrait: EmotionDirectiveTrait;
  private eventListeners: Map<PipelineEventType, Set<PipelineEventCallback>> = new Map();

  // Handlers (injected by consumer)
  private llmHandler: LLMHandler | null = null;
  private sttHandler: STTHandler | null = null;
  private ttsHandler: TTSHandler | null = null;

  // State
  private stage: PipelineStage = 'idle';
  private turnCount: number = 0;
  private isRunning: boolean = false;
  private lastUserText: string | null = null;
  private lastResponse: EmotionTaggedResponse | null = null;
  private currentSegmentIndex: number = -1;
  private currentResponse: EmotionTaggedResponse | null = null;

  constructor(config?: AvatarEmbodimentPipelineConfig) {
    this.config = {
      autoListen: false,
      fillerGestures: true,
      ...config,
    };

    // Initialize lip sync processor
    const lipSyncTrait = new LipSyncTrait(config?.lipSync);
    this.lipSyncProcessor = new LipSyncProcessor(lipSyncTrait, {
      traitConfig: config?.lipSync,
      audioContext: config?.audioContext,
    });

    // Initialize emotion directive trait
    this.emotionTrait = new EmotionDirectiveTrait(config?.emotion);
  }

  // ===========================================================================
  // Handler Registration
  // ===========================================================================

  /**
   * Set the LLM handler (converts user text to emotion-tagged response)
   */
  public setLLMHandler(handler: LLMHandler): void {
    this.llmHandler = handler;
  }

  /**
   * Set the STT handler (speech-to-text recognition)
   */
  public setSTTHandler(handler: STTHandler): void {
    this.sttHandler = handler;
  }

  /**
   * Set the TTS handler (text-to-speech synthesis)
   */
  public setTTSHandler(handler: TTSHandler): void {
    this.ttsHandler = handler;
  }

  // ===========================================================================
  // Component Access
  // ===========================================================================

  /**
   * Get the lip sync processor for direct control
   */
  public getLipSyncProcessor(): LipSyncProcessor {
    return this.lipSyncProcessor;
  }

  /**
   * Get the emotion directive trait for direct control
   */
  public getEmotionTrait(): EmotionDirectiveTrait {
    return this.emotionTrait;
  }

  // ===========================================================================
  // Pipeline Control
  // ===========================================================================

  /**
   * Start the pipeline
   */
  public async start(): Promise<void> {
    this.isRunning = true;
    this.setStage('idle');

    this.emotionTrait.setConditionalState({
      type: 'conditional',
      state: 'idle',
      expression: 'neutral',
      animation: 'idle',
    });
  }

  /**
   * Stop the pipeline
   */
  public stop(): void {
    this.isRunning = false;
    this.setStage('idle');
    this.lipSyncProcessor.endSession();
  }

  /**
   * Get current pipeline state
   */
  public getState(): PipelineState {
    return {
      stage: this.stage,
      turnCount: this.turnCount,
      isRunning: this.isRunning,
      lastUserText: this.lastUserText,
      lastResponse: this.lastResponse,
      currentSegmentIndex: this.currentSegmentIndex,
    };
  }

  // ===========================================================================
  // Conversation Flow
  // ===========================================================================

  /**
   * Process a user text input through the full pipeline:
   * Text → LLM → TTS → LipSync/Expression → Animation
   */
  public async processUserInput(userText: string): Promise<void> {
    if (!this.isRunning) return;
    if (!this.llmHandler) {
      throw new Error('No LLM handler registered. Call setLLMHandler() first.');
    }

    this.turnCount++;
    this.lastUserText = userText;

    this.emitEvent({
      type: 'turn-start',
      text: userText,
      timestamp: Date.now(),
    });

    // Stage: Processing (LLM)
    this.setStage('processing');

    // Show thinking state with optional fillers
    this.emotionTrait.setConditionalState({
      type: 'conditional',
      state: 'thinking',
      expression: 'thinking',
      animation: 'thinking',
    });

    try {
      // Call LLM
      const response = await this.llmHandler(userText);
      this.lastResponse = response;
      this.currentResponse = response;

      this.emitEvent({
        type: 'llm-response',
        timestamp: Date.now(),
      });

      // Process response through emotion system
      this.emotionTrait.processResponse(response);

      // Speak segments sequentially
      await this.speakResponse(response);

    } catch (error) {
      this.emitEvent({
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: Date.now(),
      });

      // Return to idle on error
      this.setStage('idle');
      this.emotionTrait.setConditionalState({
        type: 'conditional',
        state: 'idle',
        expression: 'neutral',
        animation: 'idle',
      });
    }

    // Turn complete
    this.currentResponse = null;
    this.currentSegmentIndex = -1;

    this.emitEvent({
      type: 'turn-end',
      timestamp: Date.now(),
    });

    // Auto-listen for next input if configured
    if (this.config.autoListen && this.sttHandler) {
      this.setStage('listening');
      this.emotionTrait.setConditionalState({
        type: 'conditional',
        state: 'listening',
        expression: 'neutral',
        animation: 'listening',
      });
    } else {
      this.setStage('idle');
    }
  }

  /**
   * Process user speech input through the full pipeline:
   * STT → LLM → TTS → LipSync/Expression → Animation
   */
  public async processUserSpeech(): Promise<void> {
    if (!this.sttHandler) {
      throw new Error('No STT handler registered. Call setSTTHandler() first.');
    }

    this.setStage('listening');
    this.emotionTrait.setConditionalState({
      type: 'conditional',
      state: 'listening',
      expression: 'empathetic',
      animation: 'listening',
    });

    try {
      const userText = await this.sttHandler();

      this.emitEvent({
        type: 'stt-result',
        text: userText,
        timestamp: Date.now(),
      });

      await this.processUserInput(userText);
    } catch (error) {
      this.emitEvent({
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: Date.now(),
      });
      this.setStage('idle');
    }
  }

  // ===========================================================================
  // Per-Frame Update
  // ===========================================================================

  /**
   * Update all subsystems. Call every frame.
   * Returns combined morph target weights (lip sync + expression).
   */
  public update(deltaTime: number): Record<string, number> {
    // Update lip sync
    const lipSyncWeights = this.lipSyncProcessor.update(deltaTime);

    // Update emotion/expression
    const expressionWeights = this.emotionTrait.update(deltaTime);

    // Merge weights: lip sync takes priority for mouth shapes,
    // expression takes priority for everything else
    const combined: Record<string, number> = { ...expressionWeights };

    for (const [name, weight] of Object.entries(lipSyncWeights)) {
      // Lip sync overrides expression for mouth-related morph targets
      if (this.isMouthMorphTarget(name)) {
        combined[name] = weight;
      } else {
        // Additive blend for non-mouth targets (rare but possible)
        combined[name] = Math.min(1, (combined[name] ?? 0) + weight);
      }
    }

    return combined;
  }

  // ===========================================================================
  // Internal
  // ===========================================================================

  /**
   * Speak all segments of a response via TTS with lip sync
   */
  private async speakResponse(response: EmotionTaggedResponse): Promise<void> {
    this.setStage('speaking');

    for (let i = 0; i < response.segments.length; i++) {
      const segment = response.segments[i];
      this.currentSegmentIndex = i;

      // Apply segment emotion/animation
      if (i > 0) {
        this.emotionTrait.advanceSegment();
      }

      this.emitEvent({
        type: 'segment-start',
        segment,
        segmentIndex: i,
        timestamp: Date.now(),
      });

      // Synthesize and play speech
      if (this.ttsHandler && segment.text.trim()) {
        try {
          const result = await this.ttsHandler(segment.text, segment.voiceStyle);

          // If TTS provides viseme timestamps, use them
          if (result.visemes && result.visemes.length > 0) {
            this.lipSyncProcessor.setTimestampData(result.visemes);
          }

          // Start lip sync session for this segment
          this.lipSyncProcessor.startSession();

          // Wait for audio duration
          await this.waitDuration(result.duration);

          // End lip sync session
          this.lipSyncProcessor.endSession();
        } catch (error) {
          console.error('[Pipeline] TTS error for segment', i, error);
        }
      }

      this.emitEvent({
        type: 'segment-end',
        segment,
        segmentIndex: i,
        timestamp: Date.now(),
      });
    }

    // Set post-speech state
    this.setStage('transitioning');

    if (response.postSpeechState) {
      this.emotionTrait.setConditionalState({
        type: 'conditional',
        state: response.postSpeechState,
      });
    }
  }

  /**
   * Set pipeline stage and emit event
   */
  private setStage(stage: PipelineStage): void {
    const prev = this.stage;
    this.stage = stage;

    if (prev !== stage) {
      this.emitEvent({
        type: 'stage-change',
        stage,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Check if a morph target name is mouth-related
   */
  private isMouthMorphTarget(name: string): boolean {
    const mouthPrefixes = [
      'viseme_', 'mouth', 'jaw', 'lip', 'tongue',
      'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthLeft', 'mouthRight',
      'mouthSmile', 'mouthFrown', 'mouthDimple', 'mouthStretch',
      'mouthRoll', 'mouthShrug', 'mouthPress', 'mouthLowerDown', 'mouthUpperUp',
      'jawOpen', 'jawForward', 'jawLeft', 'jawRight',
    ];

    const lower = name.toLowerCase();
    return mouthPrefixes.some(prefix => lower.startsWith(prefix.toLowerCase()));
  }

  /**
   * Wait for a duration (used during TTS playback)
   */
  private waitDuration(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  /**
   * Register event listener
   */
  public on(event: PipelineEventType, callback: PipelineEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Unregister event listener
   */
  public off(event: PipelineEventType, callback: PipelineEventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emitEvent(event: PipelineEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event);
        } catch (e) {
          console.error('[Pipeline] Event listener error:', e);
        }
      }
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.stop();
    this.lipSyncProcessor.dispose();
    this.emotionTrait.dispose();
    this.eventListeners.clear();
  }
}

/**
 * Create an avatar embodiment pipeline
 */
export function createAvatarEmbodimentPipeline(
  config?: AvatarEmbodimentPipelineConfig,
): AvatarEmbodimentPipeline {
  return new AvatarEmbodimentPipeline(config);
}
