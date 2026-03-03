/**
 * Voice Channel UI Module
 *
 * Complete voice chat UI for the HoloLand platform, wired to
 * @hololand/network WebRTCVoiceTransport and VoiceChannelManager APIs.
 *
 * Components:
 *   - VoiceChannelUI     — Main voice panel (channel list, participants, controls)
 *   - VoiceSettings      — Audio device and voice processing settings
 *   - SpatialVoiceIndicator — 3D overlay for spatial/VR voice indicators
 *   - VoiceNotification  — Toast notifications for voice events
 *
 * Hooks:
 *   - useVoiceChannels       — Channel CRUD and join/leave
 *   - useVoiceParticipants   — Participant list with audio levels
 *   - useVoiceControls       — Mic, deafen, input mode, volume
 *   - useAudioDevices        — Input/output device enumeration
 *   - useVoiceNotifications  — Notification queue with auto-dismiss
 *
 * @module voice
 */

// Components
export { VoiceChannelUI, type VoiceChannelUIProps } from './VoiceChannelUI';
export { VoiceSettings, type VoiceSettingsProps } from './VoiceSettings';
export { SpatialVoiceIndicator, type SpatialVoiceIndicatorProps } from './SpatialVoiceIndicator';
export { VoiceNotification, type VoiceNotificationProps } from './VoiceNotification';

// Hooks
export {
  useVoiceChannels,
  useVoiceParticipants,
  useVoiceControls,
  useAudioDevices,
  useVoiceNotifications,
} from './useVoice';

// Types
export type {
  VoiceNotificationEvent,
  AudioDeviceInfo,
  VoiceSettings as VoiceSettingsState,
  VoiceParticipantUI,
  SpatialSpeaker,
} from './useVoice';
