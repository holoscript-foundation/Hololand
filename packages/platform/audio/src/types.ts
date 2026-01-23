/**
 * @hololand/audio - Type Definitions
 *
 * Core types for spatial audio, voice chat, and audio effects.
 */

// =============================================================================
// SPATIAL PRIMITIVES
// =============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

// =============================================================================
// AUDIO SOURCE TYPES
// =============================================================================

export type AudioSourceType = 'point' | 'ambient' | 'directional' | 'cone';

export interface AudioSourceConfig {
  /** Unique source identifier */
  id: string;
  /** Source type */
  type: AudioSourceType;
  /** 3D position in world space */
  position: Vector3;
  /** Source orientation (for directional sources) */
  orientation?: Vector3;
  /** Volume (0-1) */
  volume: number;
  /** Playback rate */
  playbackRate: number;
  /** Loop audio */
  loop: boolean;
  /** Auto-play on creation */
  autoPlay: boolean;
  /** Distance model */
  distanceModel: 'linear' | 'inverse' | 'exponential';
  /** Reference distance */
  refDistance: number;
  /** Maximum distance */
  maxDistance: number;
  /** Rolloff factor */
  rolloffFactor: number;
  /** Inner cone angle (degrees) - for cone sources */
  coneInnerAngle?: number;
  /** Outer cone angle (degrees) - for cone sources */
  coneOuterAngle?: number;
  /** Outer cone gain - for cone sources */
  coneOuterGain?: number;
}

export const DEFAULT_AUDIO_SOURCE_CONFIG: Omit<AudioSourceConfig, 'id'> = {
  type: 'point',
  position: { x: 0, y: 0, z: 0 },
  volume: 1.0,
  playbackRate: 1.0,
  loop: false,
  autoPlay: false,
  distanceModel: 'inverse',
  refDistance: 1,
  maxDistance: 10000,
  rolloffFactor: 1,
};

// =============================================================================
// LISTENER TYPES
// =============================================================================

export interface ListenerConfig {
  /** 3D position */
  position: Vector3;
  /** Forward direction */
  forward: Vector3;
  /** Up direction */
  up: Vector3;
}

// =============================================================================
// HRTF TYPES
// =============================================================================

export type HRTFModel = 'default' | 'custom' | 'cipic' | 'listen' | 'sadie';

export interface HRTFConfig {
  /** HRTF model to use */
  model: HRTFModel;
  /** Custom HRIR data URL */
  customHRIR?: string;
  /** Enable HRTF processing */
  enabled: boolean;
}

// =============================================================================
// REVERB TYPES
// =============================================================================

export type ReverbPreset =
  | 'none'
  | 'small-room'
  | 'medium-room'
  | 'large-room'
  | 'hall'
  | 'cathedral'
  | 'outdoor'
  | 'cave'
  | 'underwater';

export interface ReverbConfig {
  /** Reverb preset */
  preset: ReverbPreset;
  /** Decay time in seconds */
  decayTime: number;
  /** Pre-delay in milliseconds */
  preDelay: number;
  /** Wet/dry mix (0-1) */
  wetMix: number;
  /** High frequency damping (0-1) */
  highFrequencyDamping: number;
  /** Room size multiplier */
  roomSize: number;
}

export const DEFAULT_REVERB_CONFIG: ReverbConfig = {
  preset: 'medium-room',
  decayTime: 1.5,
  preDelay: 20,
  wetMix: 0.3,
  highFrequencyDamping: 0.5,
  roomSize: 1.0,
};

// =============================================================================
// EFFECTS TYPES
// =============================================================================

export interface EffectNode {
  id: string;
  type: 'gain' | 'filter' | 'compressor' | 'delay' | 'reverb' | 'distortion' | 'chorus' | 'phaser';
  enabled: boolean;
  parameters: Record<string, number>;
}

export interface FilterConfig {
  type: 'lowpass' | 'highpass' | 'bandpass' | 'lowshelf' | 'highshelf' | 'peaking' | 'notch' | 'allpass';
  frequency: number;
  Q: number;
  gain: number;
}

export interface CompressorConfig {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}

export interface DelayConfig {
  delayTime: number;
  feedback: number;
  wetMix: number;
}

// =============================================================================
// VOICE CHAT TYPES
// =============================================================================

export type VoiceActivityState = 'silent' | 'speaking' | 'muted';

export interface VoiceChatConfig {
  /** Enable voice activity detection */
  vadEnabled: boolean;
  /** VAD threshold (0-1) */
  vadThreshold: number;
  /** Enable echo cancellation */
  echoCancellation: boolean;
  /** Enable noise suppression */
  noiseSuppression: boolean;
  /** Enable auto gain control */
  autoGainControl: boolean;
  /** Sample rate */
  sampleRate: 16000 | 24000 | 48000;
  /** Channels */
  channelCount: 1 | 2;
  /** Enable spatial voice (3D positioned) */
  spatialVoice: boolean;
  /** Voice range (max distance to hear) */
  voiceRange: number;
  /** Push-to-talk mode */
  pushToTalk: boolean;
}

export const DEFAULT_VOICE_CONFIG: VoiceChatConfig = {
  vadEnabled: true,
  vadThreshold: 0.02,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 24000,
  channelCount: 1,
  spatialVoice: true,
  voiceRange: 15,
  pushToTalk: false,
};

export interface VoiceParticipant {
  id: string;
  displayName: string;
  position: Vector3;
  state: VoiceActivityState;
  volume: number;
  muted: boolean;
  localMuted: boolean;
}

// =============================================================================
// MUSIC STREAMING TYPES
// =============================================================================

export interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  duration: number;
  url: string;
  format: 'mp3' | 'ogg' | 'wav' | 'webm' | 'aac';
}

export interface PlaylistConfig {
  id: string;
  name: string;
  tracks: MusicTrack[];
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  crossfade: number;
}

// =============================================================================
// ENGINE TYPES
// =============================================================================

export interface SpatialAudioEngineConfig {
  /** Audio context sample rate */
  sampleRate: 44100 | 48000 | 96000;
  /** Maximum concurrent sources */
  maxSources: number;
  /** Enable HRTF spatialization */
  hrtfEnabled: boolean;
  /** HRTF configuration */
  hrtf: HRTFConfig;
  /** Default reverb configuration */
  reverb: ReverbConfig;
  /** Enable automatic listener tracking */
  autoListenerUpdate: boolean;
  /** Enable distance attenuation */
  distanceAttenuation: boolean;
  /** Master volume */
  masterVolume: number;
  /** Enable Doppler effect */
  dopplerEnabled: boolean;
  /** Doppler factor */
  dopplerFactor: number;
  /** Speed of sound (m/s) */
  speedOfSound: number;
}

export const DEFAULT_ENGINE_CONFIG: SpatialAudioEngineConfig = {
  sampleRate: 48000,
  maxSources: 32,
  hrtfEnabled: true,
  hrtf: {
    model: 'default',
    enabled: true,
  },
  reverb: DEFAULT_REVERB_CONFIG,
  autoListenerUpdate: true,
  distanceAttenuation: true,
  masterVolume: 1.0,
  dopplerEnabled: false,
  dopplerFactor: 1.0,
  speedOfSound: 343,
};

// =============================================================================
// EVENTS
// =============================================================================

export type AudioEventType =
  | 'source-started'
  | 'source-ended'
  | 'source-paused'
  | 'source-resumed'
  | 'source-error'
  | 'voice-started'
  | 'voice-ended'
  | 'voice-activity'
  | 'participant-joined'
  | 'participant-left'
  | 'context-state-change';

export interface AudioEvent {
  type: AudioEventType;
  sourceId?: string;
  participantId?: string;
  timestamp: number;
  data?: unknown;
}

export type AudioEventListener = (event: AudioEvent) => void;
