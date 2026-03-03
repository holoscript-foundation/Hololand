/**
 * @hololand/network Voice Module
 *
 * WebRTC voice transport, spatial audio engine, and voice channel management
 * for the Hololand multiplayer metaverse.
 *
 * Components:
 * - WebRTCVoiceTransport: SFU-based media transport with Opus codec, reconnection
 * - SpatialAudioEngine: Web Audio API HRTF 3D audio positioning, zones, occlusion
 * - VoiceChannelManager: Channel CRUD, permissions, VAD, push-to-talk, StateSync
 */

// WebRTC Voice Transport
export { WebRTCVoiceTransport } from './WebRTCVoiceTransport';

// Spatial Audio Engine
export { SpatialAudioEngine } from './SpatialAudioEngine';

// Voice Channel Manager
export { VoiceChannelManager } from './VoiceChannelManager';

// Types
export type {
  // Transport types
  ICEServerConfig,
  WebRTCVoiceTransportConfig,
  VoiceTransportState,
  VoiceParticipantInfo,
  VoiceTransportEventMap,
  VoiceTransportEventType,
  VoiceTransportEventHandler,

  // Spatial audio types
  SpatialAudioConfig,
  AudioZone,
  ReverbSettings,
  OcclusionRaycastCallback,
  AudioSourceNode,

  // Channel types
  ChannelPermission,
  VoiceChannel,
  ChannelParticipant,
  InputMode,
  VoiceChannelConfig,
  VoiceChannelEventMap,
  VoiceChannelEventType,
  VoiceChannelEventHandler,

  // Sync types
  VoiceSyncState,
} from './types';
