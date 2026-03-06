/**
 * Lip Sync Processor — Runtime integration for @hololand/audio
 *
 * Bridges the @holoscript/core LipSyncTrait with the HoloLand audio engine.
 * Connects TTS audio output, voice chat streams, or any AudioNode to the
 * lip sync analysis pipeline, then delivers morph target weights each frame.
 *
 * Usage:
 * ```typescript
 * import { LipSyncProcessor } from '@hololand/audio';
 * import { createLipSyncTrait } from '@holoscript/core';
 *
 * const trait = createLipSyncTrait({ method: 'fft', blendShapeSet: 'oculus' });
 * const processor = new LipSyncProcessor(trait);
 *
 * // Connect to a TTS audio element
 * await processor.connectAudioElement(ttsAudioElement);
 *
 * // Each frame, get morph weights to apply to the avatar mesh
 * const weights = processor.update(deltaTime);
 * for (const [name, weight] of Object.entries(weights)) {
 *   mesh.morphTargetInfluences[morphIndex[name]] = weight;
 * }
 * ```
 */

import type {
  LipSyncConfig,
  LipSyncEvent,
  LipSyncEventType,
  VisemeTimestamp,
} from '@holoscript/core';

import { LipSyncTrait } from '@holoscript/core';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported audio input sources for lip sync
 */
export type LipSyncSource =
  | { type: 'element'; element: HTMLAudioElement | HTMLMediaElement }
  | { type: 'stream'; stream: MediaStream }
  | { type: 'node'; node: AudioNode; context: AudioContext }
  | { type: 'tts-timestamps'; visemeData: VisemeTimestamp[] };

/**
 * Lip sync processor configuration
 */
export interface LipSyncProcessorConfig {
  /** LipSyncTrait config forwarded to core */
  traitConfig?: LipSyncConfig;

  /** Audio context to use (will create one if not provided) */
  audioContext?: AudioContext;

  /** Auto-start session when audio source is connected */
  autoStart?: boolean;

  /** Output gain for monitoring (0 = muted monitor, 1 = full passthrough) */
  monitorGain?: number;
}

/**
 * Lip sync processor state
 */
export interface LipSyncProcessorState {
  connected: boolean;
  sourceType: string | null;
  sessionActive: boolean;
  isSpeaking: boolean;
  currentViseme: string;
}

// =============================================================================
// LIP SYNC PROCESSOR
// =============================================================================

/**
 * LipSyncProcessor — Runtime audio integration
 *
 * Manages the AudioContext plumbing: connects audio sources (HTMLAudioElement,
 * MediaStream, raw AudioNode) to the LipSyncTrait's FFT analyser, and
 * provides a per-frame update() call that returns morph target weights.
 */
export class LipSyncProcessor {
  private trait: LipSyncTrait;
  private config: LipSyncProcessorConfig;
  private audioContext: AudioContext | null = null;
  private ownsContext: boolean = false;
  private sourceNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private connected: boolean = false;
  private sourceType: string | null = null;

  constructor(trait?: LipSyncTrait, config?: LipSyncProcessorConfig) {
    this.config = {
      autoStart: true,
      monitorGain: 0,
      ...config,
    };

    this.trait = trait ?? new LipSyncTrait(config?.traitConfig);
  }

  /**
   * Get the underlying LipSyncTrait
   */
  public getTrait(): LipSyncTrait {
    return this.trait;
  }

  /**
   * Get current processor state
   */
  public getState(): LipSyncProcessorState {
    return {
      connected: this.connected,
      sourceType: this.sourceType,
      sessionActive: this.trait.getActiveSession() !== null,
      isSpeaking: this.trait.getIsSpeaking(),
      currentViseme: this.trait.getCurrentViseme(),
    };
  }

  // ===========================================================================
  // Audio Source Connection
  // ===========================================================================

  /**
   * Connect to an HTMLAudioElement (e.g. from TTS playback)
   */
  public async connectAudioElement(element: HTMLAudioElement | HTMLMediaElement): Promise<void> {
    const ctx = await this.ensureContext();
    this.disconnect();

    const source = ctx.createMediaElementSource(element);
    this.wireSource(ctx, source);
    this.sourceType = 'element';

    if (this.config.autoStart) {
      this.trait.startSession({ audioSource: element });
    }
  }

  /**
   * Connect to a MediaStream (e.g. from voice chat or microphone)
   */
  public async connectStream(stream: MediaStream): Promise<void> {
    const ctx = await this.ensureContext();
    this.disconnect();

    const source = ctx.createMediaStreamSource(stream);
    this.wireSource(ctx, source);
    this.sourceType = 'stream';

    if (this.config.autoStart) {
      this.trait.startSession({ audioSource: stream });
    }
  }

  /**
   * Connect to a raw AudioNode (for custom audio chains)
   */
  public connectNode(node: AudioNode, context: AudioContext): void {
    this.disconnect();

    this.audioContext = context;
    this.ownsContext = false;
    this.wireSource(context, node);
    this.sourceType = 'node';

    if (this.config.autoStart) {
      this.trait.startSession({ audioSource: node });
    }
  }

  /**
   * Provide viseme timestamp data from a TTS provider
   * (Azure Speech SDK, Google Cloud TTS, etc.)
   */
  public setTimestampData(visemeData: VisemeTimestamp[]): void {
    this.sourceType = 'timestamps';
    this.connected = true;
    this.trait.setVisemeTimestamps(visemeData);

    if (this.config.autoStart) {
      this.trait.startSession({ visemeData });
    }
  }

  /**
   * Disconnect current audio source
   */
  public disconnect(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Already disconnected
      }
      this.sourceNode = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // Already disconnected
      }
      this.gainNode = null;
    }

    this.trait.disposeFFT();
    this.trait.endSession();
    this.connected = false;
    this.sourceType = null;
  }

  // ===========================================================================
  // Per-Frame Update
  // ===========================================================================

  /**
   * Update lip sync and return morph target weights
   * Call this every frame in the render loop
   */
  public update(deltaTime: number): Record<string, number> {
    return this.trait.update(deltaTime);
  }

  /**
   * Get current morph target weights without advancing time
   */
  public getMorphWeights(): Record<string, number> {
    return this.trait.getMorphWeights();
  }

  // ===========================================================================
  // External Viseme Input
  // ===========================================================================

  /**
   * Set viseme directly (for NVIDIA Audio2Face or custom ML pipeline)
   */
  public setViseme(viseme: string, weight?: number): void {
    this.trait.setViseme(viseme, weight);
  }

  /**
   * Set multiple blend shape weights (for Audio2Face 72-blendshape output)
   */
  public setBlendShapeWeights(weights: Record<string, number>): void {
    this.trait.setBlendShapeWeights(weights);
  }

  // ===========================================================================
  // Session Control
  // ===========================================================================

  /**
   * Manually start a lip sync session
   */
  public startSession(options?: {
    audioSource?: unknown;
    visemeData?: VisemeTimestamp[];
  }): string {
    return this.trait.startSession(options);
  }

  /**
   * Manually end the current lip sync session
   */
  public endSession(): void {
    this.trait.endSession();
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  /**
   * Register event listener
   */
  public on(event: LipSyncEventType, callback: (event: LipSyncEvent) => void): void {
    this.trait.on(event, callback);
  }

  /**
   * Unregister event listener
   */
  public off(event: LipSyncEventType, callback: (event: LipSyncEvent) => void): void {
    this.trait.off(event, callback);
  }

  // ===========================================================================
  // Internal
  // ===========================================================================

  /**
   * Ensure an AudioContext exists
   */
  private async ensureContext(): Promise<AudioContext> {
    if (this.config.audioContext) {
      this.audioContext = this.config.audioContext;
      this.ownsContext = false;
    }

    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext();
      this.ownsContext = true;
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Wire an AudioNode to the FFT analyser and optional output
   */
  private wireSource(context: AudioContext, source: AudioNode): void {
    this.sourceNode = source;

    // Initialize FFT analysis on the trait
    this.trait.initFFT(context, source);

    // Create a gain node for optional audio monitoring
    this.gainNode = context.createGain();
    this.gainNode.gain.value = this.config.monitorGain ?? 0;
    source.connect(this.gainNode);
    this.gainNode.connect(context.destination);

    this.connected = true;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.disconnect();

    if (this.ownsContext && this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.trait.dispose();
  }
}

/**
 * Create a lip sync processor
 */
export function createLipSyncProcessor(
  config?: LipSyncProcessorConfig
): LipSyncProcessor {
  return new LipSyncProcessor(undefined, config);
}
