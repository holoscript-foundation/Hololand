/**
 * @hololand/audio
 *
 * Spatial audio engine for Hololand - 3D positional sound, HRTF,
 * voice chat with VAD, and audio effects processing.
 *
 * @example
 * ```typescript
 * import {
 *   getSpatialAudioEngine,
 *   getVoiceChat,
 *   createEffectsChain
 * } from '@hololand/audio';
 *
 * // Initialize spatial audio
 * const engine = getSpatialAudioEngine();
 * await engine.initialize();
 *
 * // Create a sound source
 * const source = engine.createSource({
 *   id: 'ambient-music',
 *   position: { x: 0, y: 0, z: 0 },
 *   loop: true,
 * });
 * await source.loadFromURL('/sounds/music.mp3');
 * source.play();
 *
 * // Update listener position (from VR headset)
 * engine.updateListener({
 *   position: { x: 1, y: 1.6, z: 0 },
 *   forward: { x: 0, y: 0, z: -1 },
 *   up: { x: 0, y: 1, z: 0 },
 * });
 *
 * // Initialize voice chat
 * const voiceChat = getVoiceChat({ spatialVoice: true });
 * await voiceChat.initialize();
 * await voiceChat.startCapture();
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  Vector3,
  Quaternion,
  AudioSourceType,
  AudioSourceConfig,
  ListenerConfig,
  HRTFModel,
  HRTFConfig,
  ReverbPreset,
  ReverbConfig,
  EffectNode,
  FilterConfig,
  CompressorConfig,
  DelayConfig,
  VoiceActivityState,
  VoiceChatConfig,
  VoiceParticipant,
  MusicTrack,
  PlaylistConfig,
  SpatialAudioEngineConfig,
  AudioEventType,
  AudioEvent,
  AudioEventListener,
} from './types';

export {
  DEFAULT_AUDIO_SOURCE_CONFIG,
  DEFAULT_REVERB_CONFIG,
  DEFAULT_VOICE_CONFIG,
  DEFAULT_ENGINE_CONFIG,
} from './types';

// =============================================================================
// SPATIAL AUDIO ENGINE
// =============================================================================

export {
  SpatialAudioEngine,
  SpatialAudioSource,
  getSpatialAudioEngine,
  createSpatialAudioEngine,
} from './SpatialAudioEngine';
export * from './SpatialAudioBridge';

// =============================================================================
// VOICE CHAT
// =============================================================================

export {
  VoiceChat,
  getVoiceChat,
  createVoiceChat,
} from './VoiceChat';

// =============================================================================
// AUDIO EFFECTS
// =============================================================================

export {
  FilterEffect,
  CompressorEffect,
  DelayEffect,
  DistortionEffect,
  ChorusEffect,
  EffectsChain,
  createEffectsChain,
} from './AudioEffects';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate distance between two 3D points
 */
export function distance3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Convert decibels to linear gain
 */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear gain to decibels
 */
export function gainToDb(gain: number): number {
  return 20 * Math.log10(Math.max(gain, 0.0001));
}

/**
 * Calculate volume attenuation based on distance
 */
export function calculateDistanceAttenuation(
  distance: number,
  refDistance: number = 1,
  maxDistance: number = 10000,
  rolloffFactor: number = 1,
  model: 'linear' | 'inverse' | 'exponential' = 'inverse'
): number {
  distance = Math.max(distance, refDistance);
  distance = Math.min(distance, maxDistance);

  switch (model) {
    case 'linear':
      return 1 - rolloffFactor * (distance - refDistance) / (maxDistance - refDistance);
    case 'exponential':
      return Math.pow(distance / refDistance, -rolloffFactor);
    case 'inverse':
    default:
      return refDistance / (refDistance + rolloffFactor * (distance - refDistance));
  }
}

/**
 * Check if Web Audio API is supported
 */
export function isWebAudioSupported(): boolean {
  return typeof AudioContext !== 'undefined' || typeof (window as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined';
}

/**
 * Check if spatial audio (HRTF) is supported
 */
export function isHRTFSupported(): boolean {
  if (!isWebAudioSupported()) return false;

  try {
    const ctx = new AudioContext();
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    ctx.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if getUserMedia is supported (for voice chat)
 */
export function isVoiceChatSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// =============================================================================
// LIP SYNC PROCESSOR
// =============================================================================

export {
  LipSyncProcessor,
  createLipSyncProcessor,
} from './LipSyncProcessor';

export type {
  LipSyncSource,
  LipSyncProcessorConfig,
  LipSyncProcessorState,
} from './LipSyncProcessor';

// =============================================================================
// AVATAR EMBODIMENT PIPELINE
// =============================================================================

export {
  AvatarEmbodimentPipeline,
  createAvatarEmbodimentPipeline,
} from './AvatarEmbodimentPipeline';

export type {
  TTSProviderConfig,
  TTSSynthesisResult,
  LLMHandler,
  STTHandler,
  TTSHandler,
  PipelineEventType,
  PipelineEvent,
  AvatarEmbodimentPipelineConfig,
  PipelineState,
} from './AvatarEmbodimentPipeline';

// =============================================================================
// VERSION
// =============================================================================

export const VERSION = '1.0.0-alpha.1';
