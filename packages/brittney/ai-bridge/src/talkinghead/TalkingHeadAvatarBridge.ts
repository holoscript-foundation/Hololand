/**
 * TalkingHeadAvatarBridge
 *
 * High-level bridge that connects the ReactAgentAvatarBridge (AI agent)
 * to TalkingHead's lip-sync engine. This is the integration point that
 * replaces the basic word-to-viseme mapping in ReactAgentAvatarBridge
 * with TalkingHead's proper phoneme analysis, audio-driven visemes,
 * and mood synchronization.
 *
 * Architecture:
 * ```
 * ┌──────────────────────────────────────────────────────────────┐
 * │  React Component                                             │
 * │  ┌────────────────────────┐                                  │
 * │  │ useAvatarAgent()       │                                  │
 * │  │  └─ ReactAgentAvatar   │                                  │
 * │  │     Bridge              │                                  │
 * │  └──────────┬─────────────┘                                  │
 * │             │ onStreamChunk / speech events                   │
 * │             ▼                                                 │
 * │  ┌──────────────────────────────────────────────────────────┐│
 * │  │  TalkingHeadAvatarBridge ◄── THIS MODULE                ││
 * │  │  ┌───────────────────┐  ┌───────────────────────────┐   ││
 * │  │  │ Emotion→Mood Sync │  │ Text→TalkingHead Speech   │   ││
 * │  │  │ (AvatarEmotion →  │  │ (speakText / speakAudio)  │   ││
 * │  │  │  TalkingHead Mood)│  │                           │   ││
 * │  │  └───────────────────┘  └─────────────┬─────────────┘   ││
 * │  │                                       │                  ││
 * │  │                                       ▼                  ││
 * │  │  ┌──────────────────────────────────────────────────┐    ││
 * │  │  │  TalkingHeadLipSyncEngine                        │    ││
 * │  │  │  (phoneme analysis → viseme interpolation)       │    ││
 * │  │  └──────────────────────────┬───────────────────────┘    ││
 * │  │                             │                            ││
 * │  │                             ▼                            ││
 * │  │  ┌──────────────────────────────────────────────────┐    ││
 * │  │  │  VisemeFrame { blendShapeWeights }               │    ││
 * │  │  │  → applied to VRM via AvatarStudio               │    ││
 * │  │  └──────────────────────────────────────────────────┘    ││
 * │  └──────────────────────────────────────────────────────────┘│
 * └──────────────────────────────────────────────────────────────┘
 * ```
 *
 * Usage:
 * ```typescript
 * import { TalkingHeadAvatarBridge } from './talkinghead';
 *
 * // Create the bridge
 * const thBridge = new TalkingHeadAvatarBridge();
 *
 * // Initialize with a DOM element for TalkingHead rendering
 * await thBridge.initialize(document.getElementById('avatar-container')!, {
 *   ttsEndpoint: '/api/tts-proxy',
 *   jwtGet: async () => getJWT(),
 * });
 *
 * // Load Brittney's avatar model
 * await thBridge.loadBrittneyAvatar();
 *
 * // Connect to the ReactAgentAvatarBridge
 * thBridge.connectToAgentBridge(reactAgentBridge);
 *
 * // On each render frame, get viseme data
 * function renderLoop() {
 *   const frame = thBridge.getCurrentVisemeFrame();
 *   applyBlendShapes(vrmModel, frame.blendShapeWeights);
 *   requestAnimationFrame(renderLoop);
 * }
 * ```
 *
 * @module TalkingHeadAvatarBridge
 */

import { logger } from '../logger';

import { TalkingHeadAdapter, createTalkingHeadAdapter } from './TalkingHeadAdapter';
import {
  TalkingHeadLipSyncEngine,
  createTalkingHeadLipSyncEngine,
} from './TalkingHeadLipSyncEngine';

import type { VisemeFrame, LipSyncEngineConfig } from './TalkingHeadLipSyncEngine';

import type {
  TalkingHeadConstructorOptions,
  TalkingHeadAvatarSpec,
  TalkingHeadMood,
  TalkingHeadIntegrationConfig,
  TalkingHeadAdapterState,
  TalkingHeadAdapterMetrics,
  TalkingHeadAudioData,
  TalkingHeadSpeakOptions,
} from './TalkingHeadTypes';

import { DEFAULT_BRITTNEY_AVATAR_SPEC, DEFAULT_INTEGRATION_CONFIG } from './TalkingHeadTypes';

import type { AvatarEmotion } from '../react-agent/types';

// =============================================================================
// EMOTION TO MOOD MAPPING
// =============================================================================

/**
 * Maps HoloLand AvatarEmotion values to TalkingHead Mood values.
 * Not all HoloLand emotions have exact TalkingHead equivalents,
 * so we use the closest available mood.
 */
const EMOTION_TO_MOOD: Record<AvatarEmotion, TalkingHeadMood> = {
  neutral: 'neutral',
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  surprised: 'fear', // TalkingHead has 'fear' but not 'surprised'
  thinking: 'neutral', // No thinking mood; use neutral with head animation
  confused: 'neutral', // No confused mood; use neutral
  excited: 'happy', // Excited maps to happy with higher intensity
  empathetic: 'love', // Empathetic maps to love (warm, caring)
};

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for the TalkingHeadAvatarBridge.
 */
export interface TalkingHeadAvatarBridgeConfig {
  /** Integration config */
  integrationConfig: Partial<TalkingHeadIntegrationConfig>;
  /** Lip-sync engine config */
  lipSyncConfig: Partial<LipSyncEngineConfig>;
  /** Whether to auto-sync emotions to moods */
  enableEmotionMoodSync: boolean;
  /** Whether to auto-sync gaze from agent bridge */
  enableGazeSync: boolean;
  /** Duration for eye contact when speaking (ms) */
  speakingEyeContactMs: number;
  /** Whether to play idle animations when not speaking */
  enableIdleAnimations: boolean;
  /** Brittney avatar GLB URL override */
  brittneyAvatarUrl?: string;
  /** TTS configuration overrides */
  ttsConfig?: {
    /** JWT provider for TTS authentication */
    jwtGet?: () => Promise<string>;
    /** TTS proxy endpoint */
    ttsEndpoint?: string;
    /** Direct API key (NOT recommended for production) */
    ttsApikey?: string;
  };
}

/**
 * Default bridge configuration.
 */
export const DEFAULT_AVATAR_BRIDGE_CONFIG: TalkingHeadAvatarBridgeConfig = {
  integrationConfig: DEFAULT_INTEGRATION_CONFIG,
  lipSyncConfig: {},
  enableEmotionMoodSync: true,
  enableGazeSync: true,
  speakingEyeContactMs: 3000,
  enableIdleAnimations: true,
};

// =============================================================================
// BRIDGE CLASS
// =============================================================================

export class TalkingHeadAvatarBridge {
  private adapter: TalkingHeadAdapter;
  private lipSyncEngine: TalkingHeadLipSyncEngine;
  private config: TalkingHeadAvatarBridgeConfig;

  // Connected agent bridge reference
  private agentBridgeUnsubscribes: Array<() => void> = [];

  // State
  private _initialized = false;
  private _avatarLoaded = false;
  private _currentEmotion: AvatarEmotion = 'neutral';

  // Event listeners
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(config?: Partial<TalkingHeadAvatarBridgeConfig>) {
    this.config = { ...DEFAULT_AVATAR_BRIDGE_CONFIG, ...config };

    // Create adapter and lip-sync engine
    this.adapter = createTalkingHeadAdapter(
      this.config.integrationConfig as TalkingHeadIntegrationConfig
    );
    this.lipSyncEngine = createTalkingHeadLipSyncEngine(this.adapter, this.config.lipSyncConfig);

    logger.info('[TalkingHeadAvatarBridge] Created');
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize the TalkingHead system.
   *
   * @param domElement - DOM element for TalkingHead rendering
   * @param options - Additional TalkingHead constructor options
   */
  async initialize(
    domElement: HTMLElement,
    options?: Partial<TalkingHeadConstructorOptions>
  ): Promise<void> {
    if (this._initialized) {
      logger.warn('[TalkingHeadAvatarBridge] Already initialized');
      return;
    }

    const constructorOpts: Partial<TalkingHeadConstructorOptions> = {
      ...options,
    };

    // Apply TTS config if provided
    if (this.config.ttsConfig) {
      if (this.config.ttsConfig.jwtGet) {
        constructorOpts.jwtGet = this.config.ttsConfig.jwtGet;
      }
      if (this.config.ttsConfig.ttsEndpoint) {
        constructorOpts.ttsEndpoint = this.config.ttsConfig.ttsEndpoint;
      }
      if (this.config.ttsConfig.ttsApikey) {
        constructorOpts.ttsApikey = this.config.ttsConfig.ttsApikey;
      }
    }

    await this.adapter.initialize(domElement, constructorOpts);
    this._initialized = true;

    // Setup internal event forwarding
    this.setupInternalListeners();

    logger.info('[TalkingHeadAvatarBridge] Initialized');
    this.emit('initialized', undefined);
  }

  /**
   * Load Brittney's avatar model.
   * Uses the default Brittney avatar spec, or a custom URL if configured.
   *
   * @param customSpec - Override avatar specification
   * @param onProgress - Progress callback (0-1)
   */
  async loadBrittneyAvatar(
    customSpec?: Partial<TalkingHeadAvatarSpec>,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (!this._initialized) {
      throw new Error('TalkingHeadAvatarBridge not initialized. Call initialize() first.');
    }

    const spec: TalkingHeadAvatarSpec = {
      ...DEFAULT_BRITTNEY_AVATAR_SPEC,
      ...customSpec,
    };

    // Apply URL override from config
    if (this.config.brittneyAvatarUrl) {
      spec.url = this.config.brittneyAvatarUrl;
    }

    await this.adapter.loadAvatar(spec, onProgress);
    this._avatarLoaded = true;

    logger.info('[TalkingHeadAvatarBridge] Brittney avatar loaded', { url: spec.url });
    this.emit('avatarLoaded', { url: spec.url });
  }

  /**
   * Connect to a ReactAgentAvatarBridge to receive speech, emotion,
   * and gaze events from the AI agent.
   *
   * This wires up the agent's events to TalkingHead's speech and
   * expression systems, replacing the basic lip-sync.
   *
   * @param agentBridge - The ReactAgentAvatarBridge instance
   */
  connectToAgentBridge(agentBridge: {
    on: (event: string, handler: (...args: unknown[]) => void) => () => void;
  }): void {
    // Clean up previous connections
    this.disconnectFromAgentBridge();

    // Listen for speech requests
    const unsubSpeech = agentBridge.on('speech:start', (data: unknown) => {
      const speechData = data as { text: string; speed?: number };
      this.handleAgentSpeech(speechData.text, speechData.speed);
    });
    this.agentBridgeUnsubscribes.push(unsubSpeech);

    // Listen for emotion changes and sync to mood
    if (this.config.enableEmotionMoodSync) {
      const unsubEmotion = agentBridge.on('emotion:change', (data: unknown) => {
        const emotionData = data as { emotion: AvatarEmotion; intensity: number };
        this.handleEmotionChange(emotionData.emotion, emotionData.intensity);
      });
      this.agentBridgeUnsubscribes.push(unsubEmotion);

      const unsubDetected = agentBridge.on('emotion:detected', (data: unknown) => {
        const emotionData = data as { emotion: AvatarEmotion };
        this.handleEmotionChange(emotionData.emotion, 0.7);
      });
      this.agentBridgeUnsubscribes.push(unsubDetected);
    }

    // Listen for gaze events
    if (this.config.enableGazeSync) {
      const unsubGaze = agentBridge.on('gaze:target', (data: unknown) => {
        const gazeData = data as { target: string; position?: { x: number; y: number } };
        this.handleGazeTarget(gazeData);
      });
      this.agentBridgeUnsubscribes.push(unsubGaze);
    }

    // Listen for stream lifecycle
    const unsubStreamStart = agentBridge.on('stream:start', () => {
      // Avatar starts paying attention
      if (this.config.enableGazeSync && this._avatarLoaded) {
        this.adapter.makeEyeContact(this.config.speakingEyeContactMs);
      }
    });
    this.agentBridgeUnsubscribes.push(unsubStreamStart);

    const unsubStreamComplete = agentBridge.on('stream:complete', () => {
      // Return to idle gaze
      if (this._avatarLoaded) {
        this.adapter.lookAhead(2000);
      }
    });
    this.agentBridgeUnsubscribes.push(unsubStreamComplete);

    // Listen for gesture events to trigger animations
    const unsubGesture = agentBridge.on('gesture:perform', (data: unknown) => {
      const gestureData = data as { gesture: string };
      this.handleGesture(gestureData.gesture);
    });
    this.agentBridgeUnsubscribes.push(unsubGesture);

    // Listen for lip-sync viseme events from the basic engine
    // and suppress them (we handle lip-sync via TalkingHead now)
    const unsubLipSync = agentBridge.on('lipsync:viseme', () => {
      // Intentionally suppress: TalkingHead handles visemes now
    });
    this.agentBridgeUnsubscribes.push(unsubLipSync);

    logger.info('[TalkingHeadAvatarBridge] Connected to ReactAgentAvatarBridge');
    this.emit('agentConnected', undefined);
  }

  /**
   * Disconnect from the agent bridge.
   */
  disconnectFromAgentBridge(): void {
    for (const unsub of this.agentBridgeUnsubscribes) {
      unsub();
    }
    this.agentBridgeUnsubscribes = [];
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.disconnectFromAgentBridge();
    this.lipSyncEngine.dispose();
    this.adapter.dispose();
    this.listeners.clear();

    this._initialized = false;
    this._avatarLoaded = false;

    logger.info('[TalkingHeadAvatarBridge] Disposed');
  }

  // ===========================================================================
  // SPEECH API (can be called directly, not just from agent bridge)
  // ===========================================================================

  /**
   * Speak text using TalkingHead's TTS + lip-sync.
   * This is the primary method for making Brittney speak.
   *
   * @param text - Text to speak (supports emoji for expressions)
   * @param options - TTS overrides
   */
  speak(text: string, options?: TalkingHeadSpeakOptions): void {
    if (!this._avatarLoaded) {
      logger.warn('[TalkingHeadAvatarBridge] Avatar not loaded, cannot speak');
      return;
    }

    this.lipSyncEngine.speakText(text, options, (subtitle) => {
      this.emit('subtitle', { text: subtitle });
    });

    this.emit('speak', { text });
  }

  /**
   * Speak pre-recorded audio with timing data.
   * Used with external TTS engines (ElevenLabs, Azure, etc.).
   *
   * @param audioData - Audio with word/viseme timing
   * @param options - TTS overrides
   */
  speakAudio(audioData: TalkingHeadAudioData, options?: TalkingHeadSpeakOptions): void {
    if (!this._avatarLoaded) {
      logger.warn('[TalkingHeadAvatarBridge] Avatar not loaded, cannot speak audio');
      return;
    }

    this.lipSyncEngine.speakAudio(audioData, options, (subtitle) => {
      this.emit('subtitle', { text: subtitle });
    });

    this.emit('speakAudio', { wordCount: audioData.words.length });
  }

  /**
   * Start real-time audio streaming for lip-sync.
   */
  startStreamingSpeech(): void {
    this.lipSyncEngine.startStreaming(
      () => this.emit('streamAudioStart', undefined),
      () => this.emit('streamAudioEnd', undefined)
    );
  }

  /**
   * Feed streaming audio chunk.
   */
  feedStreamingAudio(chunk: Int16Array): void {
    this.lipSyncEngine.streamAudio(chunk);
  }

  /**
   * End the audio stream.
   */
  endStreamingSpeech(): void {
    this.lipSyncEngine.streamNotifyEnd();
  }

  /**
   * Stop streaming mode.
   */
  stopStreamingSpeech(): void {
    this.lipSyncEngine.stopStreaming();
  }

  // ===========================================================================
  // VISEME OUTPUT (called per render frame)
  // ===========================================================================

  /**
   * Get the current interpolated viseme frame.
   * Call this every render frame (at 90Hz for VR) to get smooth
   * lip-sync blend shape weights.
   *
   * @returns VisemeFrame with blend shape weights ready for VRM application
   */
  getCurrentVisemeFrame(): VisemeFrame {
    return this.lipSyncEngine.getCurrentFrame();
  }

  // ===========================================================================
  // MOOD / EMOTION
  // ===========================================================================

  /**
   * Set the avatar's mood directly.
   */
  setMood(mood: TalkingHeadMood): void {
    if (!this._avatarLoaded) return;
    this.adapter.setMood(mood);
  }

  /**
   * Set the avatar's mood from a HoloLand AvatarEmotion.
   */
  setEmotionAsMood(emotion: AvatarEmotion): void {
    if (!this._avatarLoaded) return;
    const mood = EMOTION_TO_MOOD[emotion] || 'neutral';
    this._currentEmotion = emotion;
    this.adapter.setMood(mood);
  }

  /**
   * Express an emoji (triggers facial expression without speech).
   */
  expressEmoji(emoji: string): void {
    if (!this._avatarLoaded) return;
    this.adapter.speakEmoji(emoji);
  }

  // ===========================================================================
  // GAZE
  // ===========================================================================

  /**
   * Make the avatar look at a screen position.
   */
  lookAt(x: number, y: number, durationMs: number): void {
    if (!this._avatarLoaded) return;
    this.adapter.lookAt(x, y, durationMs);
  }

  /**
   * Make the avatar maintain eye contact.
   */
  makeEyeContact(durationMs: number): void {
    if (!this._avatarLoaded) return;
    this.adapter.makeEyeContact(durationMs);
  }

  // ===========================================================================
  // STATE
  // ===========================================================================

  get initialized(): boolean {
    return this._initialized;
  }

  get avatarLoaded(): boolean {
    return this._avatarLoaded;
  }

  get isSpeaking(): boolean {
    return this.adapter.isSpeaking;
  }

  get currentEmotion(): AvatarEmotion {
    return this._currentEmotion;
  }

  get adapterState(): Readonly<TalkingHeadAdapterState> {
    return this.adapter.state;
  }

  get adapterMetrics(): Readonly<TalkingHeadAdapterMetrics> {
    return this.adapter.metrics;
  }

  get lipSyncMetrics() {
    return this.lipSyncEngine.getMetrics();
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: (data: unknown) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  // ===========================================================================
  // INTERNAL HANDLERS
  // ===========================================================================

  /**
   * Handle a speech request from the agent bridge.
   */
  private handleAgentSpeech(text: string, speed?: number): void {
    const options: TalkingHeadSpeakOptions | undefined = speed ? { ttsRate: speed } : undefined;

    this.speak(text, options);
  }

  /**
   * Handle emotion change from the agent bridge.
   */
  private handleEmotionChange(emotion: AvatarEmotion, _intensity: number): void {
    this.setEmotionAsMood(emotion);
  }

  /**
   * Handle gaze target from the agent bridge.
   */
  private handleGazeTarget(gazeData: {
    target: string;
    position?: { x: number; y: number };
  }): void {
    if (!this._avatarLoaded) return;

    switch (gazeData.target) {
      case 'user':
        this.adapter.lookAtCamera(2000);
        break;
      case 'object':
      case 'direction':
        if (gazeData.position) {
          this.adapter.lookAt(gazeData.position.x, gazeData.position.y, 2000);
        } else {
          this.adapter.lookAhead(2000);
        }
        break;
      default:
        this.adapter.lookAhead(2000);
    }
  }

  /**
   * Handle gesture from the agent bridge.
   * Maps HoloLand gestures to TalkingHead animations/poses.
   */
  private handleGesture(gesture: string): void {
    if (!this._avatarLoaded) return;

    // Map gestures to emoji expressions as a lightweight approach
    // For full animation support, load Mixamo FBX files
    const gestureEmojiMap: Record<string, string> = {
      wave: '\u{1F44B}', // Waving hand
      nod: '\u{1F60A}', // Smiling (gentle agreement)
      shake_head: '\u{1F615}', // Confused face
      thumbs_up: '\u{1F44D}', // Thumbs up
      shrug: '\u{1F937}', // Shrug
      clap: '\u{1F44F}', // Clapping
      think_pose: '\u{1F914}', // Thinking face
      present: '\u{1F449}', // Pointing right
      bow: '\u{1F647}', // Bowing
      point: '\u{261D}\u{FE0F}', // Pointing up
    };

    const emoji = gestureEmojiMap[gesture];
    if (emoji) {
      this.adapter.speakEmoji(emoji);
    }

    this.emit('gesture', { gesture, emoji });
  }

  /**
   * Setup internal event forwarding from lip-sync engine.
   */
  private setupInternalListeners(): void {
    this.lipSyncEngine.on('speechstart', () => {
      this.emit('speechstart', undefined);
    });

    this.lipSyncEngine.on('speechend', () => {
      this.emit('speechend', undefined);
    });

    this.lipSyncEngine.on('viseme', (data: unknown) => {
      this.emit('viseme', data);
    });

    this.lipSyncEngine.on('word', (data: unknown) => {
      this.emit('word', data);
    });
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        logger.error('[TalkingHeadAvatarBridge] Event handler error', { event, error });
      }
    });
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a TalkingHeadAvatarBridge with optional configuration.
 *
 * @example
 * ```typescript
 * const bridge = createTalkingHeadAvatarBridge({
 *   brittneyAvatarUrl: '/models/brittney-v2.glb',
 *   ttsConfig: {
 *     ttsEndpoint: '/api/tts-proxy',
 *     jwtGet: () => getAuthToken(),
 *   },
 * });
 *
 * await bridge.initialize(containerEl);
 * await bridge.loadBrittneyAvatar();
 * bridge.connectToAgentBridge(agentBridge);
 * ```
 */
export function createTalkingHeadAvatarBridge(
  config?: Partial<TalkingHeadAvatarBridgeConfig>
): TalkingHeadAvatarBridge {
  return new TalkingHeadAvatarBridge(config);
}
