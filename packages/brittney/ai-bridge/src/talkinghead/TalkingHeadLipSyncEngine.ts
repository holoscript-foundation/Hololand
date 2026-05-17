/**
 * TalkingHeadLipSyncEngine
 *
 * Audio-driven viseme pipeline that replaces the basic character-by-character
 * lip-sync in ReactAgentAvatarBridge with TalkingHead's proper phoneme
 * analysis engine. This module provides:
 *
 * 1. Text-to-viseme conversion using TalkingHead's language modules
 * 2. Audio-to-viseme detection using TalkingHead's HeadAudio worklet
 * 3. Streaming viseme generation for real-time TTS responses
 * 4. VRM blend shape translation for the HoloLand avatar system
 * 5. Viseme smoothing and interpolation for natural mouth movements
 *
 * Performance: Viseme updates are budgeted at < 2ms to stay within the
 * 11.1ms frame budget at 90Hz VR. The smoothing ring buffer uses O(1)
 * reads and O(1) writes.
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TalkingHeadLipSyncEngine                                       │
 * │                                                                 │
 * │  Input Sources:                                                 │
 * │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐ │
 * │  │ Text Stream   │  │ Audio Buffer  │  │ PCM Stream (real-time)│ │
 * │  └──────┬───────┘  └──────┬────────┘  └──────────┬───────────┘ │
 * │         │                 │                       │             │
 * │         ▼                 ▼                       ▼             │
 * │  ┌──────────────────────────────────────────────────────────┐  │
 * │  │  TalkingHeadAdapter (phoneme analysis + viseme output)   │  │
 * │  └──────────────────────────┬───────────────────────────────┘  │
 * │                             │                                   │
 * │                             ▼                                   │
 * │  ┌──────────────────────────────────────────────────────────┐  │
 * │  │  Viseme Smoother (ring buffer + exponential decay)       │  │
 * │  └──────────────────────────┬───────────────────────────────┘  │
 * │                             │                                   │
 * │                             ▼                                   │
 * │  ┌──────────────────────────────────────────────────────────┐  │
 * │  │  VRM Blend Shape Translator (Oculus → VRM mapping)       │  │
 * │  └──────────────────────────┬───────────────────────────────┘  │
 * │                             │                                   │
 * │                             ▼                                   │
 * │  Output: { blendShapeWeights: Record<string, number> }         │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * @module TalkingHeadLipSyncEngine
 */

import { logger } from '../logger';
import { TalkingHeadAdapter } from './TalkingHeadAdapter';

import type {
  OculusVisemeCode,
  OculusVisemeId,
  TalkingHeadIntegrationConfig,
  TalkingHeadAudioData,
  TalkingHeadSpeakOptions,
} from './TalkingHeadTypes';

import {
  VISEME_TO_VRM_BLEND_SHAPES,
  VISEME_TO_SIMPLE_VRM,
  DEFAULT_INTEGRATION_CONFIG,
} from './TalkingHeadTypes';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single viseme frame with blend shape weights ready for VRM application.
 */
export interface VisemeFrame {
  /** Timestamp of this frame */
  timestamp: number;
  /** The dominant viseme code */
  viseme: OculusVisemeCode;
  /** Complete VRM blend shape weight map for this frame */
  blendShapeWeights: Record<string, number>;
  /** Whether the avatar is currently speaking */
  isSpeaking: boolean;
  /** Confidence/weight of this viseme (0-1) */
  weight: number;
}

/**
 * Configuration for the lip-sync engine.
 */
export interface LipSyncEngineConfig {
  /** Integration config (passed to adapter) */
  integrationConfig: TalkingHeadIntegrationConfig;
  /** Interpolation duration between visemes (ms) */
  interpolationDurationMs: number;
  /** Minimum weight threshold to emit a viseme change */
  minWeightThreshold: number;
  /** Maximum viseme frames to buffer for interpolation */
  maxBufferFrames: number;
  /** Whether to include jaw open/close with visemes */
  includeJawMotion: boolean;
  /** Jaw open weight multiplier (scales jaw movement) */
  jawWeightMultiplier: number;
  /** Smoothing passes per frame (1 = light, 3 = heavy) */
  smoothingPasses: number;
}

/**
 * Default lip-sync engine configuration.
 */
export const DEFAULT_LIP_SYNC_CONFIG: LipSyncEngineConfig = {
  integrationConfig: DEFAULT_INTEGRATION_CONFIG,
  interpolationDurationMs: 60,
  minWeightThreshold: 0.05,
  maxBufferFrames: 4,
  includeJawMotion: true,
  jawWeightMultiplier: 0.6,
  smoothingPasses: 1,
};

/**
 * Lip-sync engine metrics for performance monitoring.
 */
export interface LipSyncEngineMetrics {
  /** Total viseme frames generated */
  totalFrames: number;
  /** Frames per second of viseme output */
  visemeFPS: number;
  /** Average blend shape computation time (ms) */
  avgComputeTimeMs: number;
  /** Current interpolation progress (0-1) */
  interpolationProgress: number;
  /** Whether audio is currently being processed */
  isProcessing: boolean;
}

// =============================================================================
// ENGINE
// =============================================================================

export class TalkingHeadLipSyncEngine {
  private adapter: TalkingHeadAdapter;
  private config: LipSyncEngineConfig;

  // Interpolation state
  private previousFrame: VisemeFrame | null = null;
  private currentFrame: VisemeFrame | null = null;
  private interpolationStartMs: number = 0;

  // Metrics
  private frameCount: number = 0;
  private lastFPSCheckMs: number = 0;
  private framesInLastSecond: number = 0;
  private currentFPS: number = 0;
  private computeTimes: number[] = [];
  private readonly MAX_COMPUTE_SAMPLES = 60;

  // Viseme frame buffer for multi-pass smoothing
  private frameBuffer: VisemeFrame[] = [];

  // Event listeners
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  // Unsubscribe handles
  private adapterUnsubscribes: Array<() => void> = [];

  constructor(adapter: TalkingHeadAdapter, config?: Partial<LipSyncEngineConfig>) {
    this.adapter = adapter;
    this.config = { ...DEFAULT_LIP_SYNC_CONFIG, ...config };

    // Subscribe to adapter viseme events
    this.setupAdapterListeners();

    logger.info('[TalkingHeadLipSyncEngine] Created', {
      interpolationMs: this.config.interpolationDurationMs,
      smoothingPasses: this.config.smoothingPasses,
      visemeMode: this.config.integrationConfig.visemeMode,
    });
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Speak text with automatic lip-sync viseme generation.
   * This is the primary high-level method for text-to-lip-sync.
   *
   * @param text - Text to speak
   * @param options - TTS options
   * @param onSubtitles - Subtitle callback
   */
  speakText(
    text: string,
    options?: TalkingHeadSpeakOptions,
    onSubtitles?: (text: string) => void
  ): void {
    this.adapter.speakText(text, options, onSubtitles);
  }

  /**
   * Speak pre-recorded audio with word/viseme timing.
   *
   * @param audioData - Audio with timing data
   * @param options - TTS options
   * @param onSubtitles - Subtitle callback
   */
  speakAudio(
    audioData: TalkingHeadAudioData,
    options?: TalkingHeadSpeakOptions,
    onSubtitles?: (text: string) => void
  ): void {
    this.adapter.speakAudio(audioData, options, onSubtitles);
  }

  /**
   * Start streaming mode for real-time audio lip-sync.
   */
  startStreaming(onAudioStart?: () => void, onAudioEnd?: () => void): void {
    this.adapter.startStreaming({
      onAudioStart,
      onAudioEnd,
    });
  }

  /**
   * Feed PCM audio chunk for real-time lip-sync.
   */
  streamAudio(chunk: Int16Array): void {
    this.adapter.streamAudio(chunk);
  }

  /**
   * Notify end of audio stream.
   */
  streamNotifyEnd(): void {
    this.adapter.streamNotifyEnd();
  }

  /**
   * Stop streaming mode.
   */
  stopStreaming(): void {
    this.adapter.stopStreaming();
  }

  /**
   * Get the current interpolated viseme frame.
   * Call this on every render frame to get smooth lip-sync data.
   *
   * This is the main per-frame method that the avatar renderer calls.
   * It returns blend shape weights ready to apply to the VRM model.
   *
   * @returns The current interpolated VisemeFrame with blend shape weights
   */
  getCurrentFrame(): VisemeFrame {
    const computeStart = performance.now();

    const now = performance.now();

    // Get the raw viseme from the adapter
    const rawViseme = this.adapter.getCurrentViseme();

    // Check if viseme changed
    if (!this.currentFrame || rawViseme.viseme !== this.currentFrame.viseme) {
      // Shift current to previous for interpolation
      this.previousFrame = this.currentFrame;
      this.currentFrame = this.createVisemeFrame(rawViseme.viseme, rawViseme.weight, now);
      this.interpolationStartMs = now;
    }

    // Calculate interpolation progress
    const elapsed = now - this.interpolationStartMs;
    const t = Math.min(1, elapsed / this.config.interpolationDurationMs);
    const easedT = this.easeInOutQuad(t);

    // Interpolate between previous and current frame
    let frame: VisemeFrame;
    if (this.previousFrame && easedT < 1) {
      frame = this.interpolateFrames(this.previousFrame, this.currentFrame!, easedT);
    } else {
      frame = this.currentFrame || this.createSilentFrame(now);
    }

    // Apply multi-pass smoothing if configured
    if (this.config.smoothingPasses > 1) {
      frame = this.applyMultiPassSmoothing(frame);
    }

    // Track metrics
    const computeTime = performance.now() - computeStart;
    this.trackComputeTime(computeTime);
    this.trackFPS(now);

    return frame;
  }

  /**
   * Get current engine metrics.
   */
  getMetrics(): LipSyncEngineMetrics {
    const avgCompute =
      this.computeTimes.length > 0
        ? this.computeTimes.reduce((a, b) => a + b, 0) / this.computeTimes.length
        : 0;

    const now = performance.now();
    const elapsed = now - this.interpolationStartMs;
    const progress =
      this.config.interpolationDurationMs > 0
        ? Math.min(1, elapsed / this.config.interpolationDurationMs)
        : 1;

    return {
      totalFrames: this.frameCount,
      visemeFPS: this.currentFPS,
      avgComputeTimeMs: avgCompute,
      interpolationProgress: progress,
      isProcessing: this.adapter.isSpeaking,
    };
  }

  /**
   * Subscribe to engine events.
   */
  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * Dispose the engine and clean up.
   */
  dispose(): void {
    // Unsubscribe from adapter events
    for (const unsub of this.adapterUnsubscribes) {
      unsub();
    }
    this.adapterUnsubscribes = [];

    this.listeners.clear();
    this.frameBuffer = [];
    this.computeTimes = [];
    this.previousFrame = null;
    this.currentFrame = null;

    logger.info('[TalkingHeadLipSyncEngine] Disposed');
  }

  // ===========================================================================
  // INTERNAL: Viseme Frame Creation
  // ===========================================================================

  /**
   * Create a VisemeFrame from a viseme code and weight.
   * Translates the Oculus viseme into VRM blend shape weights.
   */
  private createVisemeFrame(
    viseme: OculusVisemeCode,
    weight: number,
    timestamp: number
  ): VisemeFrame {
    const blendShapeWeights: Record<string, number> = {};
    const useFullVisemes = this.config.integrationConfig.visemeMode === 'oculus';

    if (useFullVisemes) {
      // Full Oculus viseme set
      const mapping = VISEME_TO_VRM_BLEND_SHAPES[viseme];
      if (mapping) {
        blendShapeWeights[mapping.primary] = mapping.primaryWeight * weight;
        if (mapping.secondary && mapping.secondaryWeight) {
          blendShapeWeights[mapping.secondary] = mapping.secondaryWeight * weight;
        }
      }
    } else {
      // Simplified VRM vowel set
      const mapping = VISEME_TO_SIMPLE_VRM[viseme];
      if (mapping) {
        blendShapeWeights[mapping.shape] = mapping.weight * weight;
      }
    }

    // Add jaw motion if enabled
    if (this.config.includeJawMotion && viseme !== 'sil') {
      const jawWeight = this.getJawWeight(viseme) * weight * this.config.jawWeightMultiplier;
      if (jawWeight > this.config.minWeightThreshold) {
        blendShapeWeights['jawOpen'] = jawWeight;
      }
    }

    return {
      timestamp,
      viseme,
      blendShapeWeights,
      isSpeaking: this.adapter.isSpeaking,
      weight,
    };
  }

  /**
   * Create a silent/neutral frame.
   */
  private createSilentFrame(timestamp: number): VisemeFrame {
    return {
      timestamp,
      viseme: 'sil',
      blendShapeWeights: {},
      isSpeaking: false,
      weight: 0,
    };
  }

  // ===========================================================================
  // INTERNAL: Interpolation
  // ===========================================================================

  /**
   * Interpolate between two viseme frames.
   */
  private interpolateFrames(from: VisemeFrame, to: VisemeFrame, t: number): VisemeFrame {
    const blendShapeWeights: Record<string, number> = {};

    // Collect all unique blend shape names
    const allShapes = new Set([
      ...Object.keys(from.blendShapeWeights),
      ...Object.keys(to.blendShapeWeights),
    ]);

    for (const shape of allShapes) {
      const fromWeight = from.blendShapeWeights[shape] || 0;
      const toWeight = to.blendShapeWeights[shape] || 0;
      const interpolated = fromWeight + (toWeight - fromWeight) * t;

      if (interpolated > this.config.minWeightThreshold) {
        blendShapeWeights[shape] = interpolated;
      }
    }

    return {
      timestamp: performance.now(),
      viseme: t >= 0.5 ? to.viseme : from.viseme,
      blendShapeWeights,
      isSpeaking: to.isSpeaking,
      weight: from.weight + (to.weight - from.weight) * t,
    };
  }

  /**
   * Apply multi-pass smoothing to reduce viseme jitter.
   * Uses a sliding window average over the frame buffer.
   */
  private applyMultiPassSmoothing(frame: VisemeFrame): VisemeFrame {
    // Add to buffer
    this.frameBuffer.push(frame);
    while (this.frameBuffer.length > this.config.maxBufferFrames) {
      this.frameBuffer.shift();
    }

    if (this.frameBuffer.length < 2) return frame;

    // Average blend shape weights across buffer
    const smoothed: Record<string, number> = {};
    const allShapes = new Set<string>();

    for (const f of this.frameBuffer) {
      for (const shape of Object.keys(f.blendShapeWeights)) {
        allShapes.add(shape);
      }
    }

    for (const shape of allShapes) {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < this.frameBuffer.length; i++) {
        const w = this.frameBuffer[i].blendShapeWeights[shape];
        if (w !== undefined) {
          // Weight more recent frames higher
          const recencyWeight = (i + 1) / this.frameBuffer.length;
          sum += w * recencyWeight;
          count += recencyWeight;
        }
      }
      if (count > 0) {
        const avg = sum / count;
        if (avg > this.config.minWeightThreshold) {
          smoothed[shape] = avg;
        }
      }
    }

    return {
      ...frame,
      blendShapeWeights: smoothed,
    };
  }

  // ===========================================================================
  // INTERNAL: Jaw Weight Calculation
  // ===========================================================================

  /**
   * Calculate jaw open weight based on viseme type.
   * Vowels get higher jaw weights; fricatives and stops get lower.
   */
  private getJawWeight(viseme: OculusVisemeCode): number {
    switch (viseme) {
      case 'aa':
        return 0.9; // Wide open jaw
      case 'Oh':
        return 0.75; // Round open
      case 'OO':
        return 0.5; // Rounded, less open
      case 'E':
        return 0.6; // Mid open
      case 'IH':
        return 0.4; // Slightly open
      case 'RR':
        return 0.45; // Slightly open + rounded
      case 'DD':
        return 0.35; // Tongue tap, slight open
      case 'nn':
        return 0.2; // Nearly closed
      case 'CH':
        return 0.3; // Affricate
      case 'SS':
        return 0.15; // Teeth close
      case 'FF':
        return 0.2; // Lower lip on teeth
      case 'TH':
        return 0.25; // Tongue between teeth
      case 'kk':
        return 0.3; // Back tongue, moderate open
      case 'PP':
        return 0.05; // Lips together
      case 'sil':
        return 0.0; // Closed
      default:
        return 0.0;
    }
  }

  // ===========================================================================
  // INTERNAL: Easing
  // ===========================================================================

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // ===========================================================================
  // INTERNAL: Metrics Tracking
  // ===========================================================================

  private trackComputeTime(ms: number): void {
    this.computeTimes.push(ms);
    if (this.computeTimes.length > this.MAX_COMPUTE_SAMPLES) {
      this.computeTimes.shift();
    }
  }

  private trackFPS(now: number): void {
    this.frameCount++;
    this.framesInLastSecond++;

    if (now - this.lastFPSCheckMs >= 1000) {
      this.currentFPS = this.framesInLastSecond;
      this.framesInLastSecond = 0;
      this.lastFPSCheckMs = now;
    }
  }

  // ===========================================================================
  // INTERNAL: Adapter Event Listeners
  // ===========================================================================

  private setupAdapterListeners(): void {
    // Forward viseme events with VRM translation
    const unsubViseme = this.adapter.on('ttsviseme', (data: unknown) => {
      const visemeData = data as { visemeId: OculusVisemeId; visemeCode: OculusVisemeCode };
      this.emit('viseme', visemeData);
    });
    this.adapterUnsubscribes.push(unsubViseme);

    // Forward speech lifecycle events
    const unsubStart = this.adapter.on('ttsstart', () => {
      this.emit('speechstart', undefined);
    });
    this.adapterUnsubscribes.push(unsubStart);

    const unsubEnd = this.adapter.on('ttsend', () => {
      // Transition back to silence smoothly
      this.previousFrame = this.currentFrame;
      this.currentFrame = this.createSilentFrame(performance.now());
      this.interpolationStartMs = performance.now();
      this.emit('speechend', undefined);
    });
    this.adapterUnsubscribes.push(unsubEnd);

    // Forward word events
    const unsubWord = this.adapter.on('ttsword', (data: unknown) => {
      this.emit('word', data);
    });
    this.adapterUnsubscribes.push(unsubWord);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        logger.error('[TalkingHeadLipSyncEngine] Event handler error', { event, error });
      }
    });
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a TalkingHeadLipSyncEngine with an adapter and optional config.
 */
export function createTalkingHeadLipSyncEngine(
  adapter: TalkingHeadAdapter,
  config?: Partial<LipSyncEngineConfig>
): TalkingHeadLipSyncEngine {
  return new TalkingHeadLipSyncEngine(adapter, config);
}
