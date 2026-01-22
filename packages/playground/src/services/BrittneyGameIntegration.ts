/**
 * Brittney Game Integration Service
 * 
 * Enhanced Brittney AI integration for Hololand Legends with:
 * - NPC dialogue generation
 * - Quest creation and description
 * - Dynamic scene generation
 * - Combat ability suggestions
 * - Story context management
 */

import type { ChatMessage } from '../types/playground';

export interface BrittneyGameContext {
  currentScene?: string;
  activNPCs?: string[];
  playerLevel?: number;
  questLog?: string[];
  inventory?: string[];
  recentEvents?: string[];
}

export interface NPCDialogue {
  npcId: string;
  npcName: string;
  dialogue: string;
  emotion: 'friendly' | 'hostile' | 'neutral' | 'mysterious';
  suggestedAction?: string;
}

export interface QuestSuggestion {
  questId: string;
  title: string;
  description: string;
  rewards: {
    experience: number;
    gold: number;
    items?: string[];
  };
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  holoScriptCode?: string;
}

export interface AbilitySuggestion {
  abilityId: string;
  name: string;
  description: string;
  cooldown: number;
  manaCost: number;
  damage?: number;
  holoScriptCode: string;
}

export interface SceneGeneration {
  sceneId: string;
  sceneName: string;
  description: string;
  environmentCode: string;
  npcs: Array<{ id: string; name: string; type: string }>;
  hazards?: string[];
}

export interface GameEvent {
  timestamp: Date;
  type: 'dialogue' | 'quest' | 'ability' | 'scene' | 'combat' | 'exploration';
  content: string;
  context?: BrittneyGameContext;
}

export class BrittneyGameIntegration {
  private apiBaseUrl: string;
  private apiKey: string;
  private gameContext: BrittneyGameContext = {};
  private eventHistory: GameEvent[] = [];
  private dialogueHistory: Map<string, NPCDialogue[]> = new Map();

  constructor(apiBaseUrl: string = 'http://localhost:3001', apiKey: string = '') {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey || import.meta.env.VITE_BRITTNEY_API_KEY || '';
  }

  /**
   * Set game context for better Brittney responses
   */
  setGameContext(context: Partial<BrittneyGameContext>): void {
    this.gameContext = { ...this.gameContext, ...context };
  }

  /**
   * Get game context
   */
  getGameContext(): BrittneyGameContext {
    return { ...this.gameContext };
  }

  /**
   * Generate NPC dialogue based on game context
   */
  async generateNPCDialogue(
    npcName: string,
    npcType: string,
    emotion: 'friendly' | 'hostile' | 'neutral' | 'mysterious' = 'neutral',
    playerContext?: string
  ): Promise<NPCDialogue> {
    const prompt = `
Generate an immersive NPC dialogue for a VR game character:
- NPC Name: ${npcName}
- NPC Type: ${npcType}
- Emotion: ${emotion}
- Player Context: ${playerContext || 'Player just arrived'}
- Game State: ${JSON.stringify(this.gameContext, null, 2)}

Requirements:
- Keep dialogue concise (1-2 sentences)
- Include character personality
- Make it engaging and immersive
- Consider the player's current level and inventory

Respond with ONLY the dialogue text, no labels or additional text.`;

    try {
      const dialogue = await this.callBrittneyAPI(prompt);
      const npcDialogue: NPCDialogue = {
        npcId: `npc-${Date.now()}`,
        npcName,
        dialogue,
        emotion,
        suggestedAction: this.extractSuggestedAction(dialogue),
      };

      // Store dialogue history
      const history = this.dialogueHistory.get(npcName) || [];
      history.push(npcDialogue);
      this.dialogueHistory.set(npcName, history.slice(-10)); // Keep last 10

      this.recordEvent('dialogue', dialogue);
      return npcDialogue;
    } catch (error) {
      console.error('Failed to generate NPC dialogue:', error);
      throw error;
    }
  }

  /**
   * Generate a new quest with HoloScript implementation
   */
  async generateQuest(
    theme: string,
    difficulty: 'easy' | 'medium' | 'hard' | 'legendary' = 'medium',
    location?: string
  ): Promise<QuestSuggestion> {
    const prompt = `
Generate a quest for an RPG game with HoloScript implementation:
- Theme: ${theme}
- Difficulty: ${difficulty}
- Location: ${location || 'Unknown'}
- Current Game State: ${JSON.stringify(this.gameContext, null, 2)}

Requirements:
1. Create an engaging quest title and description
2. Define rewards based on difficulty
3. Include HoloScript Plus code to implement the quest mechanics
4. Make the quest feel immersive and rewarding

Response format (use === separators):
QUEST_TITLE===
[Quest Title]
===DESCRIPTION===
[Detailed description]
===REWARDS_XP===
[Experience points as number]
===REWARDS_GOLD===
[Gold amount as number]
===REWARDS_ITEMS===
[Comma-separated list or "none"]
===HOLOSCRIPT===
[HoloScript Plus code for quest mechanics]
===`;

    try {
      const response = await this.callBrittneyAPI(prompt);
      const quest = this.parseQuestResponse(response, difficulty);
      this.recordEvent('quest', `Quest "${quest.title}" generated`);
      return quest;
    } catch (error) {
      console.error('Failed to generate quest:', error);
      throw error;
    }
  }

  /**
   * Generate combat abilities with HoloScript code
   */
  async generateAbility(
    abilityType: string,
    characterClass: string,
    level: number = 1
  ): Promise<AbilitySuggestion> {
    const prompt = `
Generate a combat ability for a game character:
- Ability Type: ${abilityType}
- Character Class: ${characterClass}
- Character Level: ${level}

Requirements:
1. Create an engaging ability name and description
2. Set cooldown (seconds) and mana cost based on power level
3. If damage ability, include damage value
4. Provide HoloScript Plus code for the ability mechanic
5. Make it feel powerful and game-changing

Response format (use === separators):
ABILITY_NAME===
[Ability Name]
===DESCRIPTION===
[Detailed description of effect]
===COOLDOWN===
[Cooldown in seconds as number]
===MANA_COST===
[Mana cost as number]
===DAMAGE===
[Damage value or "0" if no damage]
===HOLOSCRIPT===
[HoloScript Plus code for ability mechanics]
===`;

    try {
      const response = await this.callBrittneyAPI(prompt);
      const ability = this.parseAbilityResponse(response);
      this.recordEvent('ability', `Ability "${ability.name}" generated`);
      return ability;
    } catch (error) {
      console.error('Failed to generate ability:', error);
      throw error;
    }
  }

  /**
   * Generate a complete scene with environment and NPCs
   */
  async generateScene(
    sceneConcept: string,
    npcCount: number = 3
  ): Promise<SceneGeneration> {
    const prompt = `
Generate a complete game scene for Hololand:
- Scene Concept: ${sceneConcept}
- Number of NPCs: ${npcCount}

Requirements:
1. Create engaging scene name and atmosphere description
2. Design ${npcCount} unique NPCs with different roles
3. Include environmental hazards if appropriate
4. Provide HoloScript Plus code to render the environment
5. Make the scene feel immersive and interactive

Response format (use === separators):
SCENE_NAME===
[Scene Name]
===DESCRIPTION===
[Atmospheric description]
===NPCS===
[NPC1 Name: Type | NPC2 Name: Type | ...]
===HAZARDS===
[Hazards list or "none"]
===HOLOSCRIPT===
[HoloScript Plus code for scene environment]
===`;

    try {
      const response = await this.callBrittneyAPI(prompt);
      const scene = this.parseSceneResponse(response, npcCount);
      this.recordEvent('scene', `Scene "${scene.sceneName}" generated`);
      return scene;
    } catch (error) {
      console.error('Failed to generate scene:', error);
      throw error;
    }
  }

  /**
   * Get dialogue history for an NPC
   */
  getDialogueHistory(npcName: string): NPCDialogue[] {
    return this.dialogueHistory.get(npcName) || [];
  }

  /**
   * Get game event history
   */
  getEventHistory(type?: GameEvent['type'], limit: number = 50): GameEvent[] {
    let events = [...this.eventHistory];
    if (type) {
      events = events.filter(e => e.type === type);
    }
    return events.slice(-limit);
  }

  /**
   * Clear history (optional)
   */
  clearHistory(): void {
    this.eventHistory = [];
    this.dialogueHistory.clear();
  }

  /**
   * Private helper: Call Brittney API
   */
  private async callBrittneyAPI(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/brittney/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          prompt,
          temperature: 0.7,
          maxTokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Brittney API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content || data.text || '';
    } catch (error) {
      console.error('Brittney API call failed:', error);
      throw error;
    }
  }

  /**
   * Private helper: Record game events
   */
  private recordEvent(type: GameEvent['type'], content: string): void {
    this.eventHistory.push({
      timestamp: new Date(),
      type,
      content,
      context: { ...this.gameContext },
    });
  }

  /**
   * Private helper: Extract suggested action from dialogue
   */
  private extractSuggestedAction(dialogue: string): string | undefined {
    const actionMatch = dialogue.match(/\[([^\]]+)\]/);
    return actionMatch ? actionMatch[1] : undefined;
  }

  /**
   * Private helper: Parse quest response
   */
  private parseQuestResponse(response: string, difficulty: string): QuestSuggestion {
    const sections = response.split('===').filter(s => s.trim());
    const quest: QuestSuggestion = {
      questId: `quest-${Date.now()}`,
      title: this.extractSection(sections, 0) || 'Untitled Quest',
      description: this.extractSection(sections, 1) || '',
      rewards: {
        experience: parseInt(this.extractSection(sections, 2) || '100'),
        gold: parseInt(this.extractSection(sections, 3) || '50'),
        items: this.extractSection(sections, 4)?.split(',').map(s => s.trim()).filter(s => s && s !== 'none'),
      },
      difficulty: difficulty as any,
      holoScriptCode: this.extractSection(sections, 5) || '',
    };
    return quest;
  }

  /**
   * Private helper: Parse ability response
   */
  private parseAbilityResponse(response: string): AbilitySuggestion {
    const sections = response.split('===').filter(s => s.trim());
    return {
      abilityId: `ability-${Date.now()}`,
      name: this.extractSection(sections, 0) || 'Unnamed Ability',
      description: this.extractSection(sections, 1) || '',
      cooldown: parseInt(this.extractSection(sections, 2) || '5'),
      manaCost: parseInt(this.extractSection(sections, 3) || '20'),
      damage: parseInt(this.extractSection(sections, 4) || '0') || undefined,
      holoScriptCode: this.extractSection(sections, 5) || '',
    };
  }

  /**
   * Private helper: Parse scene response
   */
  private parseSceneResponse(response: string, npcCount: number): SceneGeneration {
    const sections = response.split('===').filter(s => s.trim());
    const npcString = this.extractSection(sections, 2) || '';
    const npcs = npcString
      .split('|')
      .map(npc => {
        const [name, type] = npc.split(':').map(s => s.trim());
        return { id: `npc-${Date.now()}-${Math.random()}`, name: name || 'Unknown', type: type || 'NPC' };
      })
      .slice(0, npcCount);

    return {
      sceneId: `scene-${Date.now()}`,
      sceneName: this.extractSection(sections, 0) || 'Untitled Scene',
      description: this.extractSection(sections, 1) || '',
      environmentCode: this.extractSection(sections, 4) || '',
      npcs,
      hazards: this.extractSection(sections, 3)?.split('|').map(s => s.trim()).filter(s => s && s !== 'none'),
    };
  }

  /**
   * Private helper: Extract section from parsed response
   */
  private extractSection(sections: string[], index: number): string {
    if (index >= sections.length) return '';
    return sections[index].trim();
  }
}

export default BrittneyGameIntegration;
