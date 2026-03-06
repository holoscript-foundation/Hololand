/**
 * Agent Voice Integration Service
 *
 * Bridges AI agents with VR voice communication systems
 * Enables verbal agent-to-agent and agent-to-human conversations
 *
 * Refactored to be generic and reusable in @hololand/agents.
 */

import { logger } from '@hololand/logger';
import { TextToSpeech, SpeechRecognizer } from '@hololand/voice';

// Mock WebRTC for now as we transition to @hololand/network
const mockWebRTC = {
    joinVoiceRoom: async (sessionId: string, agentId: string, name: string) => ({ sessionId }),
    leaveVoiceRoom: async (sessionId: string) => {},
    // injectAudio removed as Browser TTS plays locally
};

export interface AgentVoiceHostAdapter {
    checkPermissions(sessionId: string, agentId: string): Promise<boolean>;
    getSessionGuests(sessionId: string): Promise<any[]>;
}

export interface TextToSpeechOptions {
    voice?: string;
    speed?: number;
    pitch?: number;
}

export interface AgentVoiceParticipant {
  agentId: string;
  agentName: string;
  sessionId: string;
  voiceRoomId: string;
  voiceProfile: AgentVoiceProfile;
  isActive: boolean;
  lastSpokeAt: number;
  speakingPriority: number;
  conversationContext: AgentConversationContext;
}

export interface AgentVoiceProfile {
  voiceId: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed: number;
  pitch?: number;
  personality: 'professional' | 'friendly' | 'technical' | 'creative' | 'analytical';
  speakingStyle: 'concise' | 'detailed' | 'conversational' | 'formal';
  baseEmotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'empathetic';
  emotionIntensity?: number;
}

export interface AgentConversationContext {
  currentTopic: string;
  recentStatements: string[];
  activeListeners: string[];
  turnQueue: string[];
  interruptionAllowed: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  dominantEmotion?: string;
}

export interface AgentVoiceMessage {
  agentId: string;
  sessionId: string;
  text: string;
  voiceOptions: TextToSpeechOptions & {
    emotion?: string;
    intensity?: number;
  };
  priority: number;
  context: {
    respondingTo?: string;
    topicContinuation: boolean;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
  timestamp: number;
}

export enum ConversationEvent {
  AGENT_JOINED = 'agent_joined',
  AGENT_LEFT = 'agent_left',
  AGENT_SPOKE = 'agent_spoke',
  TURN_GRANTED = 'turn_granted',
  TURN_REVOKED = 'turn_revoked',
  TOPIC_CHANGED = 'topic_changed',
  URGENCY_ESCALATED = 'urgency_escalated',
  CONVERSATION_ENDED = 'conversation_ended'
}

export class VoiceService {
  
  // HoloLand Voice Instances
  private tts: TextToSpeech;
  private stt: SpeechRecognizer;
  private hostAdapter: AgentVoiceHostAdapter;

  constructor(hostAdapter: AgentVoiceHostAdapter) {
      this.hostAdapter = hostAdapter;
      this.tts = new TextToSpeech(); 
      this.stt = new SpeechRecognizer();
  }

  private activeAgents = new Map<string, AgentVoiceParticipant>();
  private conversationQueues = new Map<string, AgentVoiceMessage[]>();

  // Voice room management - Transitioning to @hololand/network
  private voiceRooms = new Map<string, any>();

  async joinAgentToVoiceRoom(
    agentId: string,
    agentName: string,
    sessionId: string,
    voiceProfile: Partial<AgentVoiceProfile> = {}
  ): Promise<AgentVoiceParticipant> {
    try {
      const hasPermission = await this.hostAdapter.checkPermissions(sessionId, agentId);

      if (!hasPermission) {
         logger.warn(`Agent ${agentId} missing voice permissions, proceeding (Legacy Bypass)`);
      }

      const defaultProfile: AgentVoiceProfile = {
        voiceId: 'alloy',
        speed: 1.0,
        personality: 'professional',
        speakingStyle: 'conversational',
        ...voiceProfile,
      };

      // Use Mock WebRTC / @hololand/network replacement
      const voiceRoom = await mockWebRTC.joinVoiceRoom(sessionId, agentId, agentName);

      const participant: AgentVoiceParticipant = {
        agentId,
        agentName,
        sessionId,
        voiceRoomId: voiceRoom.sessionId,
        voiceProfile: defaultProfile,
        isActive: true,
        lastSpokeAt: 0,
        speakingPriority: 5,
        conversationContext: {
          currentTopic: '',
          recentStatements: [],
          activeListeners: [],
          turnQueue: [],
          interruptionAllowed: true,
          urgencyLevel: 'low',
        },
      };

      this.activeAgents.set(agentId, participant);
      this.voiceRooms.set(sessionId, voiceRoom);
      this.conversationQueues.set(agentId, []);

      logger.info(`[AgentVoice] Joined (HoloLand Powered): ${agentId}`);
      return participant;

    } catch (error) {
      logger.error('[AgentVoice] Join failed', { error });
      throw error;
    }
  }

  async removeAgentFromVoiceRoom(agentId: string): Promise<void> {
      const participant = this.activeAgents.get(agentId);
      if (!participant) return;
      
      await mockWebRTC.leaveVoiceRoom(participant.sessionId);
      this.activeAgents.delete(agentId);
      logger.info(`[AgentVoice] Left: ${agentId}`);
  }

  async agentSpeak(agentId: string, message: AgentVoiceMessage): Promise<void> {
    try {
        const participant = this.activeAgents.get(agentId);
        if (!participant) return;

        // Use @hololand/voice for TTS
        // Browser TTS plays locally. In future, we might want to capture stream to send over WebRTC.
        await this.tts.speak(message.text, {
            voice: message.voiceOptions.voice || 'default',
            rate: message.voiceOptions.speed || 1.0,
            priority: message.priority
        });

        participant.lastSpokeAt = Date.now();
        this.broadcastConversationEvent(participant.sessionId, ConversationEvent.AGENT_SPOKE, {
            agentId,
            text: message.text
        });

    } catch (error) {
        logger.error('[AgentVoice] Speak failed', { error });
    }
  }

  async processVoiceInput(agentId: string, audioData: ArrayBuffer, speakerId?: string): Promise<string | null> {
      // @hololand/voice SpeechRecognizer uses Browser API (Microphone), not arbitrary AudioBuffers.
      // TODO: Implement server-side Whisper or equivalent for processing AudioBuffers.
      logger.warn('[AgentVoice] processVoiceInput with AudioBuffer not supported by current @hololand/voice.');
      return null;
  }

  private updateConversationContext(agentId: string, text: string, speakerId?: string): void {
      const participant = this.activeAgents.get(agentId);
      if (participant) {
          participant.conversationContext.recentStatements.push(text);
      }
  }

  private broadcastConversationEvent(sessionId: string, event: ConversationEvent, data: any): void {
      logger.info(`[AgentVoice] Event: ${event}`, data);
  }

  getActiveAgentsInSession(sessionId: string): AgentVoiceParticipant[] {
    return Array.from(this.activeAgents.values())
      .filter(p => p.sessionId === sessionId && p.isActive);
  }

  getAgentStats(agentId: string): any {
    return this.activeAgents.get(agentId);
  }
}

export { VoiceService as AgentVoiceIntegrationService };
export const getAgentVoiceIntegrationService = (hostAdapter: AgentVoiceHostAdapter) => new VoiceService(hostAdapter);
export { VoiceService as AgentVoiceIntegrationServiceClass }; // For class reference if needed
