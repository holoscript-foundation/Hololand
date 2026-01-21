/**
 * Brittney Game Integration Service - Ollama Support
 * 
 * Enhanced integration with local Ollama Mistral 7B
 * Provides cost-effective on-device inference
 * Falls back to OpenAI if Ollama unavailable
 */

import type { ChatMessage } from '../types/playground';
import OllamaService from './OllamaService';

export interface BrittneyConfig {
  useLocal: boolean;
  ollamaUrl: string;
  ollamaModel: string;
  openaiKey?: string;
  fallbackToOpenAI: boolean;
}

export const DEFAULT_BRITTNEY_CONFIG: BrittneyConfig = {
  useLocal: true,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'brittney-finetuned',
  fallbackToOpenAI: false,
};

export class BrittneyGameIntegrationOllama {
  private config: BrittneyConfig;
  private ollamaService: OllamaService | null = null;
  private isOllamaAvailable: boolean = false;

  constructor(config: Partial<BrittneyConfig> = {}) {
    this.config = { ...DEFAULT_BRITTNEY_CONFIG, ...config };

    if (this.config.useLocal) {
      this.ollamaService = new OllamaService(this.config.ollamaUrl, this.config.ollamaModel);
      this.checkOllamaAvailability();
    }
  }

  /**
   * Check if Ollama is available
   */
  private async checkOllamaAvailability(): Promise<void> {
    try {
      if (!this.ollamaService) return;
      this.isOllamaAvailable = await this.ollamaService.isHealthy();
      if (this.isOllamaAvailable) {
        console.log('✅ Ollama service available - using local inference');
      } else {
        console.warn('⚠️ Ollama service not available - check if running on port 11434');
      }
    } catch (error) {
      console.warn('⚠️ Ollama service unavailable:', error);
      this.isOllamaAvailable = false;
    }
  }

  /**
   * Generate NPC dialogue using local Ollama or OpenAI
   */
  async generateNPCDialogue(npcName: string, context: string): Promise<string> {
    // Try local Ollama first
    if (this.isOllamaAvailable && this.ollamaService) {
      try {
        console.log(`🤖 Generating dialogue for ${npcName} using local Ollama...`);
        const dialogue = await this.ollamaService.generateNPCDialogue(npcName, context);
        return dialogue;
      } catch (error) {
        console.error('Ollama generation failed:', error);
        if (!this.config.fallbackToOpenAI) {
          throw error;
        }
      }
    }

    // Fall back to OpenAI if configured
    if (this.config.fallbackToOpenAI && this.config.openaiKey) {
      console.log(`🌐 Falling back to OpenAI for ${npcName} dialogue...`);
      return this.generateNPCDialogueOpenAI(npcName, context);
    }

    throw new Error(
      'No inference backend available. Please ensure Ollama is running or configure OpenAI fallback.'
    );
  }

  /**
   * Generate quest using local inference
   */
  async generateQuest(questTitle: string, description: string): Promise<string> {
    if (this.isOllamaAvailable && this.ollamaService) {
      try {
        console.log(`🎯 Generating quest "${questTitle}" using local Ollama...`);
        const quest = await this.ollamaService.generateQuest(questTitle, description);
        return quest;
      } catch (error) {
        console.error('Quest generation failed:', error);
        if (!this.config.fallbackToOpenAI) throw error;
      }
    }

    if (this.config.fallbackToOpenAI && this.config.openaiKey) {
      console.log(`🌐 Falling back to OpenAI for quest generation...`);
      return this.generateQuestOpenAI(questTitle, description);
    }

    throw new Error('No inference backend available');
  }

  /**
   * Generate NPC behavior/code
   */
  async generateNPCBehavior(npcName: string, npcType: string, behaviors: string): Promise<string> {
    if (this.isOllamaAvailable && this.ollamaService) {
      try {
        console.log(`👾 Generating NPC code for ${npcName} using local Ollama...`);
        const code = await this.ollamaService.generateNPCBehavior(npcName, npcType, behaviors);
        return code;
      } catch (error) {
        console.error('NPC behavior generation failed:', error);
        if (!this.config.fallbackToOpenAI) throw error;
      }
    }

    if (this.config.fallbackToOpenAI && this.config.openaiKey) {
      console.log(`🌐 Falling back to OpenAI for NPC generation...`);
      return this.generateNPCBehaviorOpenAI(npcName, npcType, behaviors);
    }

    throw new Error('No inference backend available');
  }

  /**
   * Generate ability/spell code
   */
  async generateAbility(abilityName: string, abilityType: string, description: string): Promise<string> {
    if (this.isOllamaAvailable && this.ollamaService) {
      try {
        console.log(`⚡ Generating ability "${abilityName}" using local Ollama...`);
        const code = await this.ollamaService.generateAbility(abilityName, abilityType, description);
        return code;
      } catch (error) {
        console.error('Ability generation failed:', error);
        if (!this.config.fallbackToOpenAI) throw error;
      }
    }

    if (this.config.fallbackToOpenAI && this.config.openaiKey) {
      console.log(`🌐 Falling back to OpenAI for ability generation...`);
      return this.generateAbilityOpenAI(abilityName, abilityType, description);
    }

    throw new Error('No inference backend available');
  }

  /**
   * Generate scene code
   */
  async generateScene(sceneName: string, sceneType: string, objects: string): Promise<string> {
    if (this.isOllamaAvailable && this.ollamaService) {
      try {
        console.log(`🌍 Generating scene "${sceneName}" using local Ollama...`);
        const code = await this.ollamaService.generateScene(sceneName, sceneType, objects);
        return code;
      } catch (error) {
        console.error('Scene generation failed:', error);
        if (!this.config.fallbackToOpenAI) throw error;
      }
    }

    if (this.config.fallbackToOpenAI && this.config.openaiKey) {
      console.log(`🌐 Falling back to OpenAI for scene generation...`);
      return this.generateSceneOpenAI(sceneName, sceneType, objects);
    }

    throw new Error('No inference backend available');
  }

  /**
   * Generate complete battle arena
   */
  async generateBattleArena(description: string): Promise<string> {
    if (this.isOllamaAvailable && this.ollamaService) {
      try {
        console.log('⚔️ Generating battle arena using local Ollama...');
        const code = await this.ollamaService.generateBattleArena(description);
        return code;
      } catch (error) {
        console.error('Battle arena generation failed:', error);
        if (!this.config.fallbackToOpenAI) throw error;
      }
    }

    if (this.config.fallbackToOpenAI && this.config.openaiKey) {
      console.log('🌐 Falling back to OpenAI for battle arena...');
      return this.generateBattleArenaOpenAI(description);
    }

    throw new Error('No inference backend available');
  }

  /**
   * Stream generation for real-time UI updates
   */
  async *generateStreaming(prompt: string): AsyncGenerator<string, void, unknown> {
    if (this.isOllamaAvailable && this.ollamaService) {
      try {
        yield* this.ollamaService.generateStreaming(prompt);
        return;
      } catch (error) {
        console.error('Streaming generation failed:', error);
        if (!this.config.fallbackToOpenAI) throw error;
      }
    }

    if (this.config.fallbackToOpenAI && this.config.openaiKey) {
      yield* this.generateStreamingOpenAI(prompt);
      return;
    }

    throw new Error('No inference backend available');
  }

  /**
   * Get system status
   */
  async getStatus(): Promise<{
    ollamaAvailable: boolean;
    ollamaModel: string;
    fallbackConfigured: boolean;
    activeBackend: string;
  }> {
    return {
      ollamaAvailable: this.isOllamaAvailable,
      ollamaModel: this.config.ollamaModel,
      fallbackConfigured: this.config.fallbackToOpenAI,
      activeBackend: this.isOllamaAvailable ? 'Ollama (Local)' : 'OpenAI (Cloud)',
    };
  }

  // ========== OpenAI Fallback Methods ==========

  private async generateNPCDialogueOpenAI(npcName: string, context: string): Promise<string> {
    // Placeholder - would use OpenAI SDK if configured
    throw new Error('OpenAI fallback not configured in this example');
  }

  private async generateQuestOpenAI(questTitle: string, description: string): Promise<string> {
    throw new Error('OpenAI fallback not configured in this example');
  }

  private async generateNPCBehaviorOpenAI(npcName: string, npcType: string, behaviors: string): Promise<string> {
    throw new Error('OpenAI fallback not configured in this example');
  }

  private async generateAbilityOpenAI(abilityName: string, abilityType: string, description: string): Promise<string> {
    throw new Error('OpenAI fallback not configured in this example');
  }

  private async generateSceneOpenAI(sceneName: string, sceneType: string, objects: string): Promise<string> {
    throw new Error('OpenAI fallback not configured in this example');
  }

  private async generateBattleArenaOpenAI(description: string): Promise<string> {
    throw new Error('OpenAI fallback not configured in this example');
  }

  private async *generateStreamingOpenAI(prompt: string): AsyncGenerator<string, void, unknown> {
    throw new Error('OpenAI fallback not configured in this example');
  }
}

export default BrittneyGameIntegrationOllama;
