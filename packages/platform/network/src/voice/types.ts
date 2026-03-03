/**
 * @hololand/network Voice Types
 *
 * Type definitions for WebRTC voice transport, spatial audio, and voice channels.
 */

import type { Vector3 } from '../types';

// ============================================================================
// WebRTC Voice Transport Types
// ============================================================================

export interface ICEServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRTCVoiceTransportConfig {
  /** ICE servers for STUN/TURN connectivity. */
  iceServers?: ICEServerConfig[];
  /** Opus codec sample rate in Hz (default 48000). */
  sampleRate?: number;
  /** Opus stereo mode for spatial audio (default true). */
  stereo?: boolean;
  /** Enable echo cancellation (default true). */
  echoCancellation?: boolean;
  /** Enable noise suppression (default true). */
  noiseSuppression?: boolean;
  /** Enable automatic gain control (default true). */
  autoGainControl?: boolean;
  /** Initial reconnection delay in ms (default 1000). */
  reconnectBaseDelay?: number;
  /** Maximum reconnection delay in ms (default 30000). */
  reconnectMaxDelay?: number;
  /** Maximum reconnection attempts before giving up (default 10). */
  reconnectMaxAttempts?: number;
  /** Audio level polling interval in ms for speaking indicators (default 100). */
  audioLevelInterval?: number;
  /** Threshold for considering a participant as speaking (0-1, default 0.05). */
  speakingThreshold?: number;
}

export type VoiceTransportState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export interface VoiceParticipantInfo {
  participantId: string;
  displayName: string;
  audioTrack: MediaStreamTrack | null;
  stream: MediaStream | null;
  audioLevel: number;
  isSpeaking: boolean;
  isMuted: boolean;
}

export interface VoiceTransportEventMap {
  connected: { roomId: string; participantId: string };
  disconnected: { reason: string };
  reconnecting: { attempt: number; delay: number };
  reconnectFailed: { attempts: number };
  participantJoined: { participant: VoiceParticipantInfo };
  participantLeft: { participantId: string };
  audioLevelChanged: { participantId: string; level: number; isSpeaking: boolean };
  trackSubscribed: { participantId: string; track: MediaStreamTrack; stream: MediaStream };
  trackUnsubscribed: { participantId: string };
  stateChanged: { state: VoiceTransportState };
  error: { message: string; code?: string };
}

export type VoiceTransportEventType = keyof VoiceTransportEventMap;
export type VoiceTransportEventHandler<T extends VoiceTransportEventType> = (
  event: VoiceTransportEventMap[T]
) => void;

// ============================================================================
// Spatial Audio Types
// ============================================================================

export interface SpatialAudioConfig {
  /** HRTF model URL (default uses browser built-in). */
  hrtfModel?: string;
  /** Distance model for attenuation (default 'inverse'). */
  distanceModel?: DistanceModelType;
  /** Rolloff factor for inverse distance model (default 1.0). */
  rolloffFactor?: number;
  /** Reference distance below which no attenuation occurs (default 1.0). */
  refDistance?: number;
  /** Max distance beyond which no further attenuation occurs (default 50). */
  maxDistance?: number;
  /** Inner cone angle for directional audio in degrees (default 360). */
  coneInnerAngle?: number;
  /** Outer cone angle for directional audio in degrees (default 360). */
  coneOuterAngle?: number;
  /** Gain outside the outer cone (default 0). */
  coneOuterGain?: number;
  /** Gain ramp time in seconds for smooth transitions (default 0.05). */
  gainRampTime?: number;
}

export interface AudioZone {
  id: string;
  /** Zone shape. */
  shape: 'rectangular' | 'spherical';
  /** Center position of the zone. */
  center: Vector3;
  /** Half-extents for rectangular zones. */
  halfExtents?: Vector3;
  /** Radius for spherical zones. */
  radius?: number;
  /** Volume multiplier within this zone (0-2, default 1). */
  volumeMultiplier: number;
  /** Reverb settings within this zone. */
  reverb?: ReverbSettings;
  /** Priority for overlapping zones (higher = takes precedence). */
  priority: number;
}

export interface ReverbSettings {
  /** Convolver impulse response URL, or 'none' to disable. */
  impulseResponseUrl?: string;
  /** Dry/wet mix (0 = fully dry, 1 = fully wet, default 0.3). */
  mix: number;
  /** Decay time in seconds (used for synthetic reverb, default 1.5). */
  decayTime?: number;
}

/** Callback for wall occlusion raycasting. Returns occlusion factor (0 = no occlusion, 1 = fully occluded). */
export type OcclusionRaycastCallback = (
  listenerPos: Vector3,
  sourcePos: Vector3
) => number;

export interface AudioSourceNode {
  participantId: string;
  sourceNode: MediaStreamAudioSourceNode;
  gainNode: GainNode;
  pannerNode: PannerNode;
  convolverNode?: ConvolverNode;
  convolverGainNode?: GainNode;
  dryGainNode?: GainNode;
  position: Vector3;
  currentGain: number;
  occlusionFactor: number;
}

// ============================================================================
// Voice Channel Types
// ============================================================================

export type ChannelPermission = 'owner' | 'moderator' | 'member';

export interface VoiceChannel {
  id: string;
  name: string;
  ownerId: string;
  capacity: number;
  participantIds: string[];
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface ChannelParticipant {
  participantId: string;
  displayName: string;
  permission: ChannelPermission;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  joinedAt: number;
}

export type InputMode = 'vad' | 'push-to-talk';

export interface VoiceChannelConfig {
  /** Default channel capacity (default 25). */
  defaultCapacity?: number;
  /** Maximum channels per user (default 1 at a time). */
  maxChannelsPerUser?: number;
  /** VAD FFT size for AnalyserNode (default 256). */
  vadFftSize?: number;
  /** VAD threshold for detecting speech (0-255 byte value, default 30). */
  vadThreshold?: number;
  /** VAD smoothing time constant (0-1, default 0.8). */
  vadSmoothingTimeConstant?: number;
  /** Input mode: voice activity detection or push-to-talk (default 'vad'). */
  inputMode?: InputMode;
  /** Push-to-talk key code (default 'KeyV'). */
  pushToTalkKey?: string;
}

export interface VoiceChannelEventMap {
  channelCreated: { channel: VoiceChannel };
  channelDeleted: { channelId: string };
  channelUpdated: { channel: VoiceChannel };
  participantJoined: { channelId: string; participant: ChannelParticipant };
  participantLeft: { channelId: string; participantId: string };
  participantMuted: { channelId: string; participantId: string; byId: string };
  participantUnmuted: { channelId: string; participantId: string; byId: string };
  voiceActivity: { channelId: string; participantId: string; isSpeaking: boolean };
  inputModeChanged: { mode: InputMode };
  error: { message: string; code?: string };
}

export type VoiceChannelEventType = keyof VoiceChannelEventMap;
export type VoiceChannelEventHandler<T extends VoiceChannelEventType> = (
  event: VoiceChannelEventMap[T]
) => void;

// ============================================================================
// Voice State Sync Types (wired into StateSync)
// ============================================================================

export interface VoiceSyncState {
  /** Channel the participant is in. */
  channelId: string;
  /** Whether the participant's mic is active. */
  isMuted: boolean;
  /** Whether the participant is deafened. */
  isDeafened: boolean;
  /** Whether the participant is currently speaking (VAD). */
  isSpeaking: boolean;
  /** Current audio level (0-1). */
  audioLevel: number;
  /** Input mode. */
  inputMode: InputMode;
  /** Timestamp for this state. */
  timestamp: number;
}
