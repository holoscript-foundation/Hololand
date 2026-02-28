/**
 * AI Companion System
 *
 * Integrates OpenAI GPT-4 for dynamic NPC dialogue
 * Companions adapt to player progress and provide contextual guidance
 */

import OpenAI from 'openai';
import type { QuestProgress } from '../state/QuestState';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface CompanionPersonality {
  traits: string[];
  voiceTone: string;
  catchphrase: string;
  humorLevel: number; // 0-1
}

export interface CompanionConfig {
  id: string;
  name: string;
  role: string;
  genre: string;
  personality: CompanionPersonality;
  knowledgeDomains: string[];
  systemPrompt: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  message: string;
  playerContext?: QuestProgress;
  maxTokens?: number;
  temperature?: number;
}

// ==========================================
// AI COMPANION CLASS
// ==========================================

export class AICompanion {
  private client: OpenAI | null = null;
  private config: CompanionConfig;
  private conversationHistory: ChatMessage[] = [];
  private maxHistoryLength = 10;

  constructor(config: CompanionConfig) {
    this.config = config;

    // Initialize OpenAI client if API key is available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Only for demo - use backend in production!
      });
    } else {
      console.warn(`[AICompanion] No OpenAI API key found. ${this.config.name} will use fallback responses.`);
    }
  }

  /**
   * Generate dynamic dialogue based on player message and context
   */
  async chat(options: ChatOptions): Promise<string> {
    const { message, playerContext, maxTokens = 150, temperature = 0.8 } = options;

    // If no API key, return fallback response
    if (!this.client) {
      return this.getFallbackResponse(message, playerContext);
    }

    try {
      // Build system prompt with player context
      const systemPrompt = this.buildSystemPrompt(playerContext);

      // Build messages array
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory,
        { role: 'user', content: message }
      ];

      // Call OpenAI API
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: maxTokens,
        temperature,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      const assistantMessage = response.choices[0]?.message?.content || '';

      // Add to conversation history
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: assistantMessage }
      );

      // Trim history if too long
      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
      }

      return assistantMessage;

    } catch (error) {
      console.error(`[AICompanion] Error calling OpenAI:`, error);
      return this.getFallbackResponse(message, playerContext);
    }
  }

  /**
   * Build system prompt with player context
   */
  private buildSystemPrompt(playerContext?: QuestProgress): string {
    let prompt = this.config.systemPrompt;

    // Inject player context if available
    if (playerContext) {
      const { player, skills, quests, portals } = playerContext;

      prompt += `\n\nCurrent Player Context:\n`;
      prompt += `- Player: ${player.name} (Level ${player.level})\n`;
      prompt += `- Skills:\n`;
      prompt += `  - Courage: ${skills.courage}/100\n`;
      prompt += `  - Imagination: ${skills.imagination}/100\n`;
      prompt += `  - Resilience: ${skills.resilience}/100\n`;
      prompt += `  - Wisdom: ${skills.wisdom}/100\n`;
      prompt += `- Quests Completed: ${quests.completed.length}\n`;
      prompt += `- Active Quest: ${quests.active[0]?.id || 'none'}\n`;
      prompt += `- Unlocked Portals: ${Object.entries(portals).filter(([_, unlocked]) => unlocked).map(([name]) => name).join(', ')}\n`;
    }

    return prompt;
  }

  /**
   * Fallback responses when AI is not available
   */
  private getFallbackResponse(message: string, playerContext?: QuestProgress): string {
    const lowerMessage = message.toLowerCase();

    // Genre-specific fallback responses
    switch (this.config.genre) {
      case 'adventure':
        if (lowerMessage.includes('quest') || lowerMessage.includes('adventure')) {
          return "Ahoy! Ready for an adventure? The seas are calling, and treasure awaits! Step through the portal when you're ready!";
        }
        if (lowerMessage.includes('help') || lowerMessage.includes('stuck')) {
          return "Don't worry, every great adventure has its challenges! Take a moment, look around, and trust your instincts. Fortune favors the bold!";
        }
        if (lowerMessage.includes('scared') || lowerMessage.includes('afraid')) {
          return "Fear is natural, friend! But remember - courage isn't the absence of fear, it's taking action despite it. You've got this!";
        }
        return `${this.config.personality.catchphrase} What brings you to my corner of the Grand Hall?`;

      case 'fantasy':
        if (lowerMessage.includes('magic') || lowerMessage.includes('fantasy')) {
          return "Ah, seeking the mysteries of magic? Wonderful! The Fantasy Portal reveals worlds where imagination becomes reality. Shall we explore together?";
        }
        if (lowerMessage.includes('creative') || lowerMessage.includes('imagine')) {
          return "Creativity is the truest magic. Sometimes the answer isn't in logic, but in seeing things from a different perspective...";
        }
        return `${this.config.personality.catchphrase} How may I guide you through the realms of wonder?`;

      case 'horror':
        if (lowerMessage.includes('scary') || lowerMessage.includes('horror')) {
          return "The Horror Portal... not for the faint of heart. But facing your fears teaches resilience. Darkness makes us appreciate the light.";
        }
        if (lowerMessage.includes('help') || lowerMessage.includes('courage')) {
          return "Fear is information. Listen to it. What is it trying to tell you? Sometimes the scariest step is the most important one to take.";
        }
        return `${this.config.personality.catchphrase} Are you prepared to face what lies beyond?`;

      default:
        return `Welcome! I'm ${this.config.name}, your ${this.config.role}. How can I help you today?`;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get companion info
   */
  getInfo(): CompanionConfig {
    return { ...this.config };
  }
}

// ==========================================
// COMPANION REGISTRY
// ==========================================

export const COMPANIONS: Record<string, CompanionConfig> = {
  adventure_guide: {
    id: 'adventure_guide',
    name: 'Captain Compass',
    role: 'Adventure Guide',
    genre: 'adventure',
    personality: {
      traits: ['brave', 'optimistic', 'encouraging', 'action-oriented'],
      voiceTone: 'energetic_confident',
      catchphrase: 'Fortune favors the bold!',
      humorLevel: 0.7
    },
    knowledgeDomains: ['navigation', 'exploration', 'courage', 'leadership'],
    systemPrompt: `You are Captain Compass, the Adventure Guide in the Hololand Grand Hall.

Your Role:
- Guide players through adventure quests
- Encourage risk-taking and exploration
- Provide hints when players are stuck (without spoiling puzzles)
- Celebrate successes enthusiastically

Your Personality:
- Bold and optimistic
- Action-oriented (bias toward trying things)
- Use nautical metaphors occasionally ("chart your course", "smooth sailing", "brave the storm")
- Encouraging without being patronizing
- Enthusiastic but not overwhelming

Communication Style:
- Keep responses concise (2-3 sentences max)
- Use exclamation points to show energy
- Reference player's actual progress when relevant
- Adapt difficulty of advice to player skill level

Remember: You're a mentor who believes in the player's potential. Help them discover their own courage!`
  },

  fantasy_guide: {
    id: 'fantasy_guide',
    name: 'Lumina Starweaver',
    role: 'Fantasy Guide',
    genre: 'fantasy',
    personality: {
      traits: ['imaginative', 'wise', 'patient', 'mystical'],
      voiceTone: 'calm_melodic',
      catchphrase: 'Magic is just science we don\'t understand yet...',
      humorLevel: 0.5
    },
    knowledgeDomains: ['creative_problem_solving', 'pattern_recognition', 'metaphorical_thinking', 'wonder'],
    systemPrompt: `You are Lumina Starweaver, the Fantasy Guide in the Hololand Grand Hall.

Your Role:
- Guide players through fantasy quests
- Encourage creative thinking and wonder
- Help players see possibilities beyond logic
- Speak in gentle, mystical tones

Your Personality:
- Imaginative and wise
- Patient and encouraging
- Use metaphors about light, stars, magic, and transformation
- Gentle but not condescending
- See beauty and potential in everything

Communication Style:
- Poetic language (but not overly flowery)
- Use "..." for contemplative pauses
- Reference imagination and possibility
- Encourage "what if" thinking

Remember: You help players discover magic through imagination, not just facts!`
  },

  horror_guide: {
    id: 'horror_guide',
    name: 'Raven Shadowmere',
    role: 'Horror Guide',
    genre: 'horror',
    personality: {
      traits: ['cautious', 'analytical', 'dark_humor', 'protective'],
      voiceTone: 'measured_slightly_ominous',
      catchphrase: 'Fear is information. Listen to it.',
      humorLevel: 0.6
    },
    knowledgeDomains: ['risk_management', 'critical_thinking', 'emotional_intelligence', 'resilience'],
    systemPrompt: `You are Raven Shadowmere, the Horror Guide in the Hololand Grand Hall.

Your Role:
- Guide players through horror quests
- Teach facing fears with wisdom
- Use dark humor to ease tension
- Encourage calculated courage

Your Personality:
- Cautious but not cowardly
- Analytical and perceptive
- Dark humor (dry wit, not mean)
- Protective of players while pushing them to grow
- Realistic about dangers

Communication Style:
- Measured, thoughtful responses
- Occasional dark humor to lighten mood
- Acknowledge fears as valid
- Distinguish between recklessness and courage

Remember: Fear is a teacher. Help players learn from it, not run from it!`
  }
};

// ==========================================
// COMPANION FACTORY
// ==========================================

const companionInstances: Map<string, AICompanion> = new Map();

/**
 * Get or create an AI companion instance
 */
export function getCompanion(companionId: string): AICompanion {
  if (!companionInstances.has(companionId)) {
    const config = COMPANIONS[companionId];
    if (!config) {
      throw new Error(`Unknown companion: ${companionId}`);
    }
    companionInstances.set(companionId, new AICompanion(config));
  }
  return companionInstances.get(companionId)!;
}

/**
 * Clear all companion conversation histories
 */
export function clearAllCompanionHistories(): void {
  companionInstances.forEach(companion => companion.clearHistory());
}
