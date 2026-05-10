export type InputMode = 'push-to-talk' | 'voice-activity' | 'muted';

export interface VoiceParticipant {
  id: string;
  displayName: string;
  muted: boolean;
  speaking: boolean;
}
