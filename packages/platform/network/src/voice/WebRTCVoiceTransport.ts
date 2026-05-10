import type { VoiceParticipant } from './types';

export class WebRTCVoiceTransport {
  private participants = new Map<string, VoiceParticipant>();

  async connect(): Promise<void> {
    throw new Error('@hololand/network voice transport requires the HoloMesh voice service.');
  }

  disconnect(): void {
    this.participants.clear();
  }

  getParticipants(): VoiceParticipant[] {
    return Array.from(this.participants.values());
  }
}
