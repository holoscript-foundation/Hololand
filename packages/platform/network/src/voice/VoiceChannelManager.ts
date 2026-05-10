import type { VoiceParticipant } from './types';

export class VoiceChannelManager {
  private participants: VoiceParticipant[] = [];

  async joinChannel(): Promise<void> {
    throw new Error('@hololand/network voice channels are served by HoloMesh, not the local facade.');
  }

  leaveChannel(): void {
    this.participants = [];
  }

  getParticipants(): VoiceParticipant[] {
    return [...this.participants];
  }
}
