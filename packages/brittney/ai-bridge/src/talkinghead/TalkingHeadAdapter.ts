/**
 * TalkingHeadAdapter
 *
 * Low-level adapter wrapping the @met4citizen/talkinghead library for
 * use within the HoloLand avatar system. This adapter manages the lifecycle
 * of a TalkingHead instance, provides a type-safe API, and enforces
 * VR performance constraints (11.1ms frame budget at 90Hz).
 *
 * Architecture:
 * ```
 * ┌────────────────────────────────────────────────────────────┐
 * │  TalkingHeadAdapter                                        │
 * │  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐ │
 * │  │ TalkingHead  │  │ Viseme Buffer │  │ Mood Manager   │ │
 * │  │ (3rd party)  │──│ (ring buffer) │  │ (emotion sync) │ │
 * │  └──────┬───────┘  └───────┬───────┘  └───────┬────────┘ │
 * │         │                  │                   │          │
 * │         ▼                  ▼                   ▼          │
 * │  ┌─────────────────────────────────────────────────────┐  │
 * │  │  Event Dispatcher (ttsstart, ttsend, ttsviseme)     │  │
 * │  └─────────────────────────────────────────────────────┘  │
 * └────────────────────────────────────────────────────────────┘
 * ```
 *
 * Security Considerations:
 * - TTS API keys must NEVER be passed directly; use jwtGet provider
 * - Audio context creation requires user gesture in modern browsers
 * - GLB avatar URLs are validated for same-origin or CORS compliance
 *
 * @module TalkingHeadAdapter
 */

import { logger } from '../logger';

import type {
  TalkingHeadConstructorOptions,
  TalkingHeadAvatarSpec,
  TalkingHeadAudioData,
  TalkingHeadSpeakOptions,
  TalkingHeadMood,
  TalkingHeadCameraView,
  TalkingHeadIntegrationConfig,
  TalkingHeadAdapterState,
  TalkingHeadAdapterMetrics,
  TalkingHeadEventType,
  OculusVisemeCode,
  OculusVisemeId,
  TalkingHeadStreamConfig,
  StreamingMetrics,
} from './TalkingHeadTypes';

import {
  DEFAULT_INTEGRATION_CONFIG,
  DEFAULT_BRITTNEY_TTS_CONFIG,
  VISEME_ID_TO_CODE,
} from './TalkingHeadTypes';

// =============================================================================
// TYPES FOR THE EXTERNAL LIBRARY (declared, not imported)
// =============================================================================

/**
 * The TalkingHead class interface as provided by @met4citizen/talkinghead.
 * We declare it here rather than importing to avoid hard dependency failures
 * when the library is not yet installed.
 */
interface TalkingHeadInstance {
  showAvatar(
    avatar: TalkingHeadAvatarSpec,
    onProgress?: ((p: number) => void) | null
  ): Promise<void>;
  speakText(
    text: string,
    opt?: TalkingHeadSpeakOptions,
    onSubtitles?: ((text: string) => void) | null,
    excludes?: number[][]
  ): void;
  speakAudio(
    audio: TalkingHeadAudioData,
    opt?: TalkingHeadSpeakOptions,
    onSubtitles?: ((text: string) => void) | null
  ): void;
  speakEmoji(emoji: string): void;
  speakBreak(milliseconds: number): void;
  speakMarker(onMarker: () => void): void;
  setView(view: TalkingHeadCameraView, opt?: Record<string, number>): void;
  setLighting(opt: Record<string, unknown>): void;
  setMood(mood: TalkingHeadMood): void;
  lookAt(x: number, y: number, t: number): void;
  lookAhead(t: number): void;
  lookAtCamera(t: number): void;
  makeEyeContact(t: number): void;
  playBackgroundAudio(url: string): void;
  stopBackgroundAudio(): void;
  setMixerGain(speech: number | null, background?: number | null, fadeSecs?: number): void;
  playAnimation(
    url: string,
    onProgress?: ((p: number) => void) | null,
    dur?: number,
    ndx?: number,
    scale?: number
  ): void;
  stopAnimation(): void;
  playPose(
    url: string,
    onProgress?: ((p: number) => void) | null,
    dur?: number,
    ndx?: number,
    scale?: number
  ): void;
  stopPose(): void;
  // Streaming
  streamStart(
    opt: Record<string, unknown>,
    onAudioStart?: () => void,
    onAudioEnd?: () => void,
    onSubtitles?: (text: string) => void,
    onMetrics?: (metrics: StreamingMetrics) => void
  ): void;
  streamAudio(audio: Int16Array): void;
  streamNotifyEnd(): void;
  streamInterrupt(): void;
  streamStop(): void;
  // Events
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
}

// =============================================================================
// ADAPTER CLASS
// =============================================================================

export class TalkingHeadAdapter {
  private instance: TalkingHeadInstance | null = null;
  private config: TalkingHeadIntegrationConfig;
  private domElement: HTMLElement | null = null;

  // State tracking
  private _state: TalkingHeadAdapterState = {
    initialized: false,
    avatarLoaded: false,
    isSpeaking: false,
    isStreaming: false,
    currentMood: 'neutral',
    currentViseme: 'sil',
    speechQueueDepth: 0,
    lastVisemeUpdateMs: 0,
  };

  // Metrics
  private _metrics: TalkingHeadAdapterMetrics = {
    totalSpeechRequests: 0,
    totalVisemeUpdates: 0,
    avgVisemeLatencyMs: 0,
    peakVisemeLatencyMs: 0,
    droppedVisemeUpdates: 0,
    totalAudioDurationSec: 0,
    totalMoodChanges: 0,
    avgSpeechQueueDepth: 0,
  };

  // Viseme ring buffer for smoothing
  private visemeBuffer: Array<{ viseme: OculusVisemeCode; weight: number; timestamp: number }> = [];
  private readonly VISEME_BUFFER_SIZE = 8;

  // Event listeners
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();

  // Latency tracking
  private visemeLatencies: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 100;

  constructor(config?: Partial<TalkingHeadIntegrationConfig>) {
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };

    logger.info('[TalkingHeadAdapter] Created', {
      renderMode: this.config.renderMode,
      visemeMode: this.config.visemeMode,
      ttsMode: this.config.ttsMode,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize the TalkingHead instance.
   *
   * @param domElement - The DOM element to render into (required for standalone mode)
   * @param options - TalkingHead constructor options
   */
  async initialize(
    domElement: HTMLElement,
    options?: Partial<TalkingHeadConstructorOptions>
  ): Promise<void> {
    if (this._state.initialized) {
      logger.warn('[TalkingHeadAdapter] Already initialized, skipping');
      return;
    }

    this.domElement = domElement;

    try {
      // Dynamically import the TalkingHead library
      const TalkingHeadModule = await import('@met4citizen/talkinghead');
      const TalkingHead = TalkingHeadModule.default || TalkingHeadModule.TalkingHead;

      if (!TalkingHead) {
        throw new Error(
          '@met4citizen/talkinghead module loaded but TalkingHead class not found. ' +
            'Ensure the package is installed: npm install @met4citizen/talkinghead'
        );
      }

      // Build constructor options with Brittney defaults
      const constructorOpts: TalkingHeadConstructorOptions = {
        ttsLang: DEFAULT_BRITTNEY_TTS_CONFIG.ttsLang,
        ttsVoice: DEFAULT_BRITTNEY_TTS_CONFIG.ttsVoice,
        ttsRate: DEFAULT_BRITTNEY_TTS_CONFIG.ttsRate,
        ttsPitch: DEFAULT_BRITTNEY_TTS_CONFIG.ttsPitch,
        ttsVolume: DEFAULT_BRITTNEY_TTS_CONFIG.ttsVolume,
        ttsTrimStart: DEFAULT_BRITTNEY_TTS_CONFIG.ttsTrimStart,
        ttsTrimEnd: DEFAULT_BRITTNEY_TTS_CONFIG.ttsTrimEnd,
        lipsyncModules: ['en'],
        lipsyncLang: 'en',
        pcmSampleRate: 22050,
        modelFPS: 30,
        modelPixelRatio: 1,
        cameraView: 'upper',
        avatarMood: 'happy',
        avatarIdleEyeContact: 0.6,
        avatarIdleHeadMove: 0.4,
        avatarSpeakingEyeContact: 0.7,
        avatarSpeakingHeadMove: 0.5,
        ...options,
      };

      // Embedded mode: TalkingHead manages its own scene inside the given DOM element
      this.instance = new TalkingHead(domElement, constructorOpts) as TalkingHeadInstance;

      // Register internal event handlers
      this.registerInternalEventHandlers();

      this._state.initialized = true;
      this._state.currentMood = constructorOpts.avatarMood || 'neutral';

      logger.info('[TalkingHeadAdapter] Initialized successfully', {
        ttsLang: constructorOpts.ttsLang,
        lipsyncLang: constructorOpts.lipsyncLang,
      });
    } catch (error) {
      logger.error('[TalkingHeadAdapter] Initialization failed', { error });
      throw new Error(`TalkingHead initialization failed: ${error}`);
    }
  }

  /**
   * Load an avatar model into the TalkingHead instance.
   *
   * @param avatarSpec - Avatar specification with GLB URL and configuration
   * @param onProgress - Optional progress callback (0-1)
   */
  async loadAvatar(
    avatarSpec: TalkingHeadAvatarSpec,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    this.assertInitialized();

    try {
      logger.info('[TalkingHeadAdapter] Loading avatar', { url: avatarSpec.url });

      await this.instance!.showAvatar(avatarSpec, onProgress || null);

      this._state.avatarLoaded = true;
      this._state.currentMood = avatarSpec.avatarMood || 'neutral';

      logger.info('[TalkingHeadAdapter] Avatar loaded successfully');
    } catch (error) {
      logger.error('[TalkingHeadAdapter] Avatar loading failed', { error });
      throw new Error(`Avatar loading failed: ${error}`);
    }
  }

  /**
   * Dispose of the TalkingHead instance and clean up resources.
   */
  dispose(): void {
    if (this.instance) {
      // Stop any ongoing speech/streaming
      try {
        if (this._state.isStreaming) {
          this.instance.streamStop();
        }
        this.instance.stopAnimation();
        this.instance.stopPose();
      } catch {
        // Ignore cleanup errors
      }

      this.instance = null;
    }

    this.eventListeners.clear();
    this.visemeBuffer = [];
    this.visemeLatencies = [];
    this.domElement = null;

    this._state = {
      initialized: false,
      avatarLoaded: false,
      isSpeaking: false,
      isStreaming: false,
      currentMood: 'neutral',
      currentViseme: 'sil',
      speechQueueDepth: 0,
      lastVisemeUpdateMs: 0,
    };

    logger.info('[TalkingHeadAdapter] Disposed');
  }

  // ===========================================================================
  // SPEECH
  // ===========================================================================

  /**
   * Queue text for speech synthesis with lip-sync.
   * Uses TalkingHead's built-in phoneme-to-viseme engine.
   *
   * @param text - Text to speak (supports emoji for expressions)
   * @param options - Per-call TTS overrides
   * @param onSubtitles - Callback for subtitle text
   */
  speakText(
    text: string,
    options?: TalkingHeadSpeakOptions,
    onSubtitles?: (text: string) => void
  ): void {
    this.assertReady();

    if (this._state.speechQueueDepth >= this.config.maxSpeechQueueDepth) {
      logger.warn('[TalkingHeadAdapter] Speech queue full, dropping request', {
        text: text.substring(0, 50),
        queueDepth: this._state.speechQueueDepth,
      });
      return;
    }

    this._state.speechQueueDepth++;
    this._metrics.totalSpeechRequests++;

    this.instance!.speakText(text, options, onSubtitles || null);
  }

  /**
   * Queue pre-recorded audio with word/viseme timing.
   * Used when an external TTS engine (ElevenLabs, Azure, etc.) provides audio.
   *
   * @param audioData - Audio buffer with word/viseme timing
   * @param options - Per-call overrides
   * @param onSubtitles - Subtitle callback
   */
  speakAudio(
    audioData: TalkingHeadAudioData,
    options?: TalkingHeadSpeakOptions,
    onSubtitles?: (text: string) => void
  ): void {
    this.assertReady();

    if (this._state.speechQueueDepth >= this.config.maxSpeechQueueDepth) {
      logger.warn('[TalkingHeadAdapter] Speech queue full, dropping audio request');
      return;
    }

    this._state.speechQueueDepth++;
    this._metrics.totalSpeechRequests++;

    this.instance!.speakAudio(audioData, options, onSubtitles || null);
  }

  /**
   * Queue an emoji to trigger facial expression.
   */
  speakEmoji(emoji: string): void {
    this.assertReady();
    this.instance!.speakEmoji(emoji);
  }

  /**
   * Queue a silence pause.
   */
  speakBreak(milliseconds: number): void {
    this.assertReady();
    this.instance!.speakBreak(milliseconds);
  }

  // ===========================================================================
  // STREAMING AUDIO (Real-time TTS Playback)
  // ===========================================================================

  /**
   * Start audio streaming mode for real-time TTS playback.
   * This enables incremental viseme detection from streamed PCM audio.
   *
   * @param streamConfig - Streaming configuration
   */
  startStreaming(streamConfig?: Partial<TalkingHeadStreamConfig>): void {
    this.assertReady();

    if (this._state.isStreaming) {
      logger.warn('[TalkingHeadAdapter] Already streaming, stopping first');
      this.stopStreaming();
    }

    const config = {
      pcmSampleRate: streamConfig?.pcmSampleRate || 22050,
    };

    this.instance!.streamStart(
      config,
      () => {
        this._state.isSpeaking = true;
        streamConfig?.onAudioStart?.();
        this.dispatchEvent('ttsstart', undefined);
      },
      () => {
        this._state.isSpeaking = false;
        streamConfig?.onAudioEnd?.();
        this.dispatchEvent('ttsend', undefined);
      },
      streamConfig?.onSubtitles,
      streamConfig?.onMetrics
    );

    this._state.isStreaming = true;

    logger.info('[TalkingHeadAdapter] Streaming started', { sampleRate: config.pcmSampleRate });
  }

  /**
   * Feed a PCM audio chunk to the streaming pipeline.
   *
   * @param audioChunk - Int16Array of PCM 16-bit LE samples
   */
  streamAudio(audioChunk: Int16Array): void {
    if (!this._state.isStreaming) {
      logger.warn('[TalkingHeadAdapter] Not in streaming mode, ignoring audio chunk');
      return;
    }

    this.instance!.streamAudio(audioChunk);
  }

  /**
   * Notify that the audio stream has ended (last chunk sent).
   */
  streamNotifyEnd(): void {
    if (!this._state.isStreaming) return;
    this.instance!.streamNotifyEnd();
  }

  /**
   * Interrupt the current streaming playback.
   */
  streamInterrupt(): void {
    if (!this._state.isStreaming) return;
    this.instance!.streamInterrupt();
    this._state.isSpeaking = false;
  }

  /**
   * Stop streaming mode entirely.
   */
  stopStreaming(): void {
    if (!this._state.isStreaming) return;

    this.instance!.streamStop();
    this._state.isStreaming = false;
    this._state.isSpeaking = false;

    logger.info('[TalkingHeadAdapter] Streaming stopped');
  }

  // ===========================================================================
  // MOOD & EXPRESSION
  // ===========================================================================

  /**
   * Set the avatar's mood.
   * This controls the avatar's baseline facial expression.
   */
  setMood(mood: TalkingHeadMood): void {
    this.assertReady();

    if (mood === this._state.currentMood) return;

    this.instance!.setMood(mood);
    this._state.currentMood = mood;
    this._metrics.totalMoodChanges++;

    logger.debug('[TalkingHeadAdapter] Mood set', { mood });
  }

  // ===========================================================================
  // GAZE & HEAD CONTROL
  // ===========================================================================

  /**
   * Make the avatar look at a screen position.
   */
  lookAt(x: number, y: number, durationMs: number): void {
    this.assertReady();
    this.instance!.lookAt(x, y, durationMs);
  }

  /**
   * Make the avatar look straight ahead.
   */
  lookAhead(durationMs: number): void {
    this.assertReady();
    this.instance!.lookAhead(durationMs);
  }

  /**
   * Make the avatar look at the camera.
   */
  lookAtCamera(durationMs: number): void {
    this.assertReady();
    this.instance!.lookAtCamera(durationMs);
  }

  /**
   * Maintain eye contact for at least the specified duration.
   */
  makeEyeContact(durationMs: number): void {
    this.assertReady();
    this.instance!.makeEyeContact(durationMs);
  }

  // ===========================================================================
  // CAMERA & VIEW
  // ===========================================================================

  /**
   * Set the camera framing.
   */
  setView(view: TalkingHeadCameraView, options?: Record<string, number>): void {
    this.assertReady();
    this.instance!.setView(view, options);
  }

  /**
   * Update lighting parameters.
   */
  setLighting(options: Record<string, unknown>): void {
    this.assertReady();
    this.instance!.setLighting(options);
  }

  // ===========================================================================
  // ANIMATION
  // ===========================================================================

  /**
   * Play a Mixamo FBX animation.
   */
  playAnimation(
    url: string,
    onProgress?: (progress: number) => void,
    duration?: number,
    index?: number,
    scale?: number
  ): void {
    this.assertReady();
    this.instance!.playAnimation(url, onProgress || null, duration, index, scale);
  }

  /**
   * Stop the current animation.
   */
  stopAnimation(): void {
    this.assertReady();
    this.instance!.stopAnimation();
  }

  /**
   * Play a Mixamo FBX pose.
   */
  playPose(
    url: string,
    onProgress?: (progress: number) => void,
    duration?: number,
    index?: number,
    scale?: number
  ): void {
    this.assertReady();
    this.instance!.playPose(url, onProgress || null, duration, index, scale);
  }

  /**
   * Stop the current pose.
   */
  stopPose(): void {
    this.assertReady();
    this.instance!.stopPose();
  }

  // ===========================================================================
  // AUDIO MIXER
  // ===========================================================================

  /**
   * Adjust audio mixer gain levels.
   */
  setMixerGain(speechGain: number | null, backgroundGain?: number | null, fadeSecs?: number): void {
    this.assertReady();
    this.instance!.setMixerGain(speechGain, backgroundGain, fadeSecs);
  }

  /**
   * Play background audio (looped).
   */
  playBackgroundAudio(url: string): void {
    this.assertReady();
    this.instance!.playBackgroundAudio(url);
  }

  /**
   * Stop background audio.
   */
  stopBackgroundAudio(): void {
    this.assertReady();
    this.instance!.stopBackgroundAudio();
  }

  // ===========================================================================
  // VISEME ACCESS (for external consumers)
  // ===========================================================================

  /**
   * Get the current viseme with smoothing applied.
   * This is the primary interface for external renderers that need
   * viseme data without using TalkingHead's built-in rendering.
   *
   * @returns Current smoothed viseme state
   */
  getCurrentViseme(): { viseme: OculusVisemeCode; weight: number } {
    if (this.visemeBuffer.length === 0) {
      return { viseme: 'sil', weight: 0 };
    }

    // Apply exponential smoothing from the ring buffer
    const now = performance.now();
    let weightedViseme = this.visemeBuffer[this.visemeBuffer.length - 1];

    // Decay older visemes
    for (let i = this.visemeBuffer.length - 1; i >= 0; i--) {
      const entry = this.visemeBuffer[i];
      const age = now - entry.timestamp;
      const decay = Math.exp(-age / (this.config.visemeSmoothingFactor * 100));

      if (decay > 0.1 && entry.weight * decay > weightedViseme.weight) {
        weightedViseme = { ...entry, weight: entry.weight * decay };
      }
    }

    return { viseme: weightedViseme.viseme, weight: Math.min(1, weightedViseme.weight) };
  }

  /**
   * Get the raw viseme buffer for advanced consumers.
   */
  getVisemeBuffer(): ReadonlyArray<{
    viseme: OculusVisemeCode;
    weight: number;
    timestamp: number;
  }> {
    return this.visemeBuffer;
  }

  // ===========================================================================
  // STATE & METRICS
  // ===========================================================================

  get state(): Readonly<TalkingHeadAdapterState> {
    return { ...this._state };
  }

  get metrics(): Readonly<TalkingHeadAdapterMetrics> {
    return { ...this._metrics };
  }

  get isInitialized(): boolean {
    return this._state.initialized;
  }

  get isAvatarLoaded(): boolean {
    return this._state.avatarLoaded;
  }

  get isSpeaking(): boolean {
    return this._state.isSpeaking;
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  /**
   * Subscribe to adapter events.
   */
  on(event: TalkingHeadEventType | string, handler: (data: unknown) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    return () => {
      this.eventListeners.get(event)?.delete(handler);
    };
  }

  /**
   * Unsubscribe from adapter events.
   */
  off(event: string, handler: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private assertInitialized(): void {
    if (!this._state.initialized || !this.instance) {
      throw new Error('TalkingHeadAdapter not initialized. Call initialize() first.');
    }
  }

  private assertReady(): void {
    this.assertInitialized();
    if (!this._state.avatarLoaded) {
      throw new Error('No avatar loaded. Call loadAvatar() after initialize().');
    }
  }

  /**
   * Register event handlers on the TalkingHead instance to track
   * internal state and bridge events to our event system.
   */
  private registerInternalEventHandlers(): void {
    if (!this.instance) return;

    // TTS lifecycle
    this.instance.addEventListener('ttsstart', () => {
      this._state.isSpeaking = true;
      this.dispatchEvent('ttsstart', undefined);
    });

    this.instance.addEventListener('ttsend', () => {
      this._state.isSpeaking = false;
      this._state.speechQueueDepth = Math.max(0, this._state.speechQueueDepth - 1);
      this.dispatchEvent('ttsend', undefined);
    });

    // Word events
    this.instance.addEventListener('ttsword', (event: unknown) => {
      this.dispatchEvent('ttsword', event);
    });

    // Viseme events - this is the critical path for lip-sync
    this.instance.addEventListener('ttsviseme', (event: unknown) => {
      const now = performance.now();
      const latency = now - this._state.lastVisemeUpdateMs;

      // Track latency
      if (this._state.lastVisemeUpdateMs > 0) {
        this.visemeLatencies.push(latency);
        if (this.visemeLatencies.length > this.MAX_LATENCY_SAMPLES) {
          this.visemeLatencies.shift();
        }
        this._metrics.avgVisemeLatencyMs =
          this.visemeLatencies.reduce((a, b) => a + b, 0) / this.visemeLatencies.length;
        this._metrics.peakVisemeLatencyMs = Math.max(this._metrics.peakVisemeLatencyMs, latency);
      }

      this._state.lastVisemeUpdateMs = now;

      // Budget check: skip if we'd exceed the frame budget
      if (latency < this.config.visemeUpdateBudgetMs && this.visemeBuffer.length > 0) {
        this._metrics.droppedVisemeUpdates++;
        return;
      }

      // Extract viseme data from the event
      const visemeEvent = event as { visemeId?: number; viseme?: number };
      const visemeId = (visemeEvent.visemeId ?? visemeEvent.viseme ?? 0) as OculusVisemeId;
      const visemeCode = VISEME_ID_TO_CODE[visemeId] || 'sil';

      // Push to ring buffer
      this.visemeBuffer.push({
        viseme: visemeCode,
        weight: 1.0,
        timestamp: now,
      });

      // Trim ring buffer
      while (this.visemeBuffer.length > this.VISEME_BUFFER_SIZE) {
        this.visemeBuffer.shift();
      }

      this._state.currentViseme = visemeCode;
      this._metrics.totalVisemeUpdates++;

      this.dispatchEvent('ttsviseme', {
        visemeId,
        visemeCode,
        timestamp: now,
      });
    });

    // Marker events
    this.instance.addEventListener('ttsmarker', (event: unknown) => {
      this.dispatchEvent('ttsmarker', event);
    });
  }

  private dispatchEvent(event: string, data: unknown): void {
    this.eventListeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        logger.error('[TalkingHeadAdapter] Event handler error', { event, error });
      }
    });
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a TalkingHeadAdapter with optional configuration overrides.
 */
export function createTalkingHeadAdapter(
  config?: Partial<TalkingHeadIntegrationConfig>
): TalkingHeadAdapter {
  return new TalkingHeadAdapter(config);
}
