/**
 * Ollama Local Inference Service
 * Provides local Mistral 7B inference via Ollama
 * Replaces OpenAI API calls for cost-effective local generation
 */

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;
  private temperature: number;

  constructor(
    baseUrl: string = 'http://localhost:11434',
    model: string = 'brittney-finetuned',
    temperature: number = 0.7
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.temperature = temperature;
  }

  /**
   * Check if Ollama service is running
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = (await response.json()) as { models: Array<{ name: string }> };
      return data.models.map((m) => m.name);
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  /**
   * Generate text using local Mistral model
   */
  async generate(prompt: string, options?: Partial<OllamaGenerateRequest>): Promise<string> {
    const request: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      stream: false,
      temperature: this.temperature,
      top_p: 0.9,
      top_k: 40,
      num_predict: 2000,
      ...options,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response;
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw error;
    }
  }

  /**
   * Generate NPC dialogue
   */
  async generateNPCDialogue(npcName: string, context: string): Promise<string> {
    const prompt = `Generate an engaging NPC dialogue for "${npcName}" in the following context: ${context}

Respond with HoloScript dialogue code in this format:
dialogue("npc_${npcName.toLowerCase()}", {
  character: "${npcName}",
  emotion: "friendly",
  content: "...",
  options: [...]
})`;

    return this.generate(prompt, { num_predict: 1000 });
  }

  /**
   * Generate quest code
   */
  async generateQuest(questTitle: string, description: string): Promise<string> {
    const prompt = `Create a complete HoloScript quest named "${questTitle}".
Description: ${description}

Generate complete quest code with objectives, rewards, and branching conditions.`;

    return this.generate(prompt, { num_predict: 1500 });
  }

  /**
   * Generate NPC behavior
   */
  async generateNPCBehavior(npcName: string, npcType: string, behaviors: string): Promise<string> {
    const prompt = `Create an NPC named "${npcName}" of type "${npcType}" with behaviors: ${behaviors}

Generate complete HoloScript NPC code with behavior trees, triggers, and actions.`;

    return this.generate(prompt, { num_predict: 1200 });
  }

  /**
   * Generate ability/spell
   */
  async generateAbility(abilityName: string, abilityType: string, description: string): Promise<string> {
    const prompt = `Create a HoloScript ability named "${abilityName}" of type "${abilityType}".
Description: ${description}

Generate complete ability code with stats, scaling, effects, and projectiles if applicable.`;

    return this.generate(prompt, { num_predict: 1000 });
  }

  /**
   * Generate scene
   */
  async generateScene(sceneName: string, sceneType: string, objects: string): Promise<string> {
    const prompt = `Create a HoloScript scene named "${sceneName}" of type "${sceneType}".
Objects: ${objects}

Generate complete scene code with environment, lighting, NPCs, hazards, and audio.`;

    return this.generate(prompt, { num_predict: 1500 });
  }

  /**
   * Generate battle arena with NPCs
   */
  async generateBattleArena(description: string): Promise<string> {
    const prompt = `${description}

Generate complete HoloScript code for a battle arena with:
- Multiple NPC combatants with behaviors
- Hazards and environmental effects
- Scene setup with lighting and audio
- State machines for combat phases`;

    return this.generate(prompt, { num_predict: 2000 });
  }

  /**
   * Stream generation for real-time UI updates
   */
  async *generateStreaming(
    prompt: string,
    options?: Partial<OllamaGenerateRequest>
  ): AsyncGenerator<string, void, unknown> {
    const request: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      stream: true,
      temperature: this.temperature,
      ...options,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line) as OllamaGenerateResponse;
              if (data.response) {
                yield data.response;
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw error;
    }
  }

  /**
   * Validate generated HoloScript code
   */
  validateHoloScriptCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic checks
    if (!code.trim()) {
      errors.push('Code is empty');
    }

    // Check for common HoloScript structures
    const hasValidStructure =
      code.includes('npc(') ||
      code.includes('quest(') ||
      code.includes('ability(') ||
      code.includes('dialogue(') ||
      code.includes('scene(') ||
      code.includes('stateMachine(') ||
      code.includes('sequence(') ||
      code.includes('achievement(') ||
      code.includes('talentTree(');

    if (!hasValidStructure) {
      errors.push('Code does not contain recognizable HoloScript structures');
    }

    // Check for balanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
    }

    // Check for common mistakes
    if (code.includes('async') && !code.includes('=>')) {
      errors.push('Async functions should use arrow syntax');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }
}

export default OllamaService;
