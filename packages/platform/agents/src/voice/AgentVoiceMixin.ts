/**
 * Agent Voice Mixin
 *
 * Adds voice communication capabilities to AI agents
 *
 * Generic mixin for @hololand/agents
 */

import { VoiceService, AgentVoiceMessage, AgentVoiceProfile, AgentVoiceParticipant, ConversationEvent } from './VoiceIntegrationService.js';
import { AgentVoiceCoordinator } from './AgentVoiceCoordinator.js';
import { logger } from '@hololand/logger';

export interface VoiceCapableAgent {
  agentId: string;
  agentName: string;

  // Voice methods
  joinVoiceRoom(sessionId: string, voiceProfile?: Partial<AgentVoiceProfile>): Promise<boolean>;
  leaveVoiceRoom(): Promise<void>;
  speak(text: string, options?: VoiceSpeakOptions): Promise<boolean>;
  requestSpeakingTurn(urgency?: 'low' | 'medium' | 'high' | 'critical'): Promise<boolean>;
  processVoiceInput(audioData: ArrayBuffer, speakerId?: string): Promise<string | null>;
  getVoiceContext(): AgentVoiceContext | null;
  getConversationState(): ConversationState | null;
}

export interface AgentVoiceContext {
  isInVoiceRoom: boolean;
  sessionId: string | null;
  voiceProfile: AgentVoiceProfile | null;
  speakingPriority: number;
  lastSpokeAt: number;
  queuedMessages: number;
  conversationTopic: string;
  recentStatements?: string[];
}

export interface ConversationState {
  currentTopic: string;
  currentSpeaker: string | null;
  turnQueue: string[];
  activeParticipants: number;
}

export interface VoiceSpeakOptions {
  priority?: number;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  respondingTo?: string;
  voiceOptions?: { voice?: string; speed?: number };
}

export const AgentVoiceMixin = {
  // These dependencies must be injected by the host agent
  _voiceIntegration: null as VoiceService | null,
  _voiceCoordinator: null as AgentVoiceCoordinator | null,
  
  _currentVoiceRoom: null as string | null,
  _voiceProfile: null as AgentVoiceProfile | null,

  /**
   * Initialize voice capabilities
   */
  initializeVoiceCapabilities(this: VoiceCapableAgent, integration: VoiceService, coordinator: AgentVoiceCoordinator) {
    (this as any)._voiceIntegration = integration;
    (this as any)._voiceCoordinator = coordinator;
    logger.info(`[AgentVoiceMixin] Initialized voice capabilities for agent: ${this.agentId}`);
  },

  async joinVoiceRoom(
    this: VoiceCapableAgent,
    sessionId: string,
    voiceProfile: Partial<AgentVoiceProfile> = {}
  ): Promise<boolean> {
    try {
      const integration = (this as any)._voiceIntegration as VoiceService;
      if (!integration) throw new Error('Voice capabilities not initialized');

      const participant = await integration.joinAgentToVoiceRoom(
        this.agentId,
        this.agentName,
        sessionId,
        voiceProfile
      );

      (this as any)._currentVoiceRoom = sessionId;
      (this as any)._voiceProfile = participant.voiceProfile;

      return true;

    } catch (error) {
      logger.error(`[AgentVoiceMixin] Failed to join voice room: ${this.agentId}`, { error });
      return false;
    }
  },

  async leaveVoiceRoom(this: VoiceCapableAgent): Promise<void> {
    const integration = (this as any)._voiceIntegration as VoiceService;
    if (!integration || !(this as any)._currentVoiceRoom) return;

    await integration.removeAgentFromVoiceRoom(this.agentId);
    (this as any)._currentVoiceRoom = null;
  },

  async speak(this: VoiceCapableAgent, text: string, options: VoiceSpeakOptions = {}): Promise<boolean> {
      const integration = (this as any)._voiceIntegration as VoiceService;
      const currentRoom = (this as any)._currentVoiceRoom;
      if (!currentRoom || !integration) throw new Error('Not in voice room');

      const message: AgentVoiceMessage = {
          agentId: this.agentId,
          sessionId: currentRoom,
          text,
          voiceOptions: {
              voice: (options.voiceOptions?.voice as any) || 'alloy',
              speed: options.voiceOptions?.speed || 1.0
          },
          priority: options.priority || 5,
          context: { topicContinuation: true, urgency: options.urgency || 'medium' },
          timestamp: Date.now()
      };

      await integration.agentSpeak(this.agentId, message);
      return true;
  },

  async requestSpeakingTurn(this: VoiceCapableAgent, urgency: any = 'medium'): Promise<boolean> {
      const coordinator = (this as any)._voiceCoordinator as AgentVoiceCoordinator;
      const currentRoom = (this as any)._currentVoiceRoom;
      if (!currentRoom || !coordinator) return false;
      return await coordinator.requestToSpeak(this.agentId, currentRoom, { purpose: 'contribute', urgency });
  },

  async processVoiceInput(this: VoiceCapableAgent, audioData: ArrayBuffer, speakerId?: string): Promise<string | null> {
      const integration = (this as any)._voiceIntegration as VoiceService;
      if (!integration) return null;
      return await integration.processVoiceInput(this.agentId, audioData, speakerId);
  },

  getVoiceContext(this: VoiceCapableAgent): AgentVoiceContext | null {
      const integration = (this as any)._voiceIntegration as VoiceService;
      if (!integration) return null;
      const stats = integration.getAgentStats(this.agentId);
      if (!stats) return null;
      return {
          isInVoiceRoom: !!(this as any)._currentVoiceRoom,
          sessionId: (this as any)._currentVoiceRoom,
          voiceProfile: (this as any)._voiceProfile,
          speakingPriority: stats.speakingPriority,
          lastSpokeAt: stats.lastSpokeAt,
          queuedMessages: 0,
          conversationTopic: stats.conversationContext?.currentTopic || '',
          recentStatements: stats.conversationContext?.recentStatements
      };
  },

  async getConversationState(this: VoiceCapableAgent): Promise<ConversationState | null> {
      const coordinator = (this as any)._voiceCoordinator as AgentVoiceCoordinator;
      const currentRoom = (this as any)._currentVoiceRoom;
      if (!currentRoom || !coordinator) return null;
      const state = await coordinator.getConversationState(currentRoom);
      return {
          currentTopic: state.topic?.title || '',
          currentSpeaker: state.currentSpeaker?.agentId || null,
          turnQueue: state.turnQueue.map((t: any) => t.agentId),
          activeParticipants: state.activeAgents.length
      };
  }
};
