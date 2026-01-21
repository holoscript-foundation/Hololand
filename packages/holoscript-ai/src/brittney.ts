/**
 * @holoscript/ai - Brittney Integration
 *
 * Native integration with the Brittney local AI assistant for HoloScript.
 * Brittney is specialized for spatial programming, world building,
 * and HoloScript code generation.
 */

import type {
  AIProvider,
  Message,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
} from './types.js';

/**
 * Brittney-specific configuration
 */
export interface BrittneyConfig extends ProviderConfig {
  /** Brittney service URL */
  serviceUrl?: string;
  /** Enable HoloScript-aware responses */
  holoScriptMode?: boolean;
  /** Enable spatial reasoning */
  spatialMode?: boolean;
  /** Knowledge domains to enable */
  domains?: Array<'holoscript' | 'spatial' | 'physics' | 'materials' | 'audio' | 'networking'>;
  /** Personality mode */
  personality?: 'friendly' | 'professional' | 'creative' | 'technical';
}

/**
 * Brittney system prompts for different modes
 */
const BRITTNEY_PROMPTS = {
  base: `You are Brittney, an AI assistant specialized in HoloScript and spatial programming for the Hololand platform.

You help developers:
- Write HoloScript (.holo) and HoloScript Plus (.hsplus) code
- Design and build 3D worlds and environments
- Create interactive experiences with physics and audio
- Debug and optimize spatial applications

Always provide working code examples when relevant. Use proper HoloScript syntax.`,

  holoscript: `

HoloScript Syntax Reference:
- Orbs are 3D objects: orb MyOrb { geometry: sphere; color: #ff0000; position: [0, 1, 0]; }
- Worlds contain orbs: world MyWorld { light: ambient; ground: plane; }
- Materials: material MyMat { color: #ffffff; metalness: 0.5; roughness: 0.5; }
- Physics: physics { gravity: [0, -9.8, 0]; collision: true; }
- Audio: audio { spatial: true; reverb: 0.3; }

HoloScript Plus (.hsplus) adds:
- Variables: let x = 5; const PI = 3.14159;
- Functions: fn greet(name: string) -> string { return "Hello, " + name; }
- Control flow: if/else, for, while, match
- Systems: system GameLoop { state: { score: 0 }; update: fn(dt) { ... }; }
- Async: async fn loadData() { let data = await fetch("/api"); }
- Imports: import { Vec3 } from "@holoscript/std";`,

  spatial: `

Spatial Programming Guidelines:
- Use right-handed coordinate system (Y-up)
- Positions are Vec3 [x, y, z]
- Rotations can be Euler [x, y, z] in radians or quaternions
- Scale is Vec3 [x, y, z] or uniform number
- Transforms: position, rotation, scale
- Hierarchies: parent-child relationships for scene graphs
- Raycasting for interactions
- Bounding boxes (AABB) and spheres for collisions`,

  physics: `

Physics Guidelines:
- RigidBody types: static, dynamic, kinematic
- Collider types: box, sphere, capsule, mesh
- Forces: apply at center or point
- Constraints: fixed, hinge, spring, distance
- Layers and masks for collision filtering
- Continuous collision detection for fast objects`,

  creative: `

When being creative:
- Suggest visually interesting designs
- Consider user experience and interaction patterns
- Think about lighting, atmosphere, and mood
- Propose procedural generation where appropriate
- Consider performance implications`,
};

/**
 * Brittney AI Provider
 *
 * Connects to the local Brittney service for HoloScript-optimized AI assistance.
 */
export class BrittneyProvider implements AIProvider {
  readonly name = 'brittney';
  private config: BrittneyConfig;
  private systemPrompt: string;

  constructor(config: BrittneyConfig = {}) {
    this.config = {
      serviceUrl: 'http://localhost:11435',
      holoScriptMode: true,
      spatialMode: true,
      domains: ['holoscript', 'spatial'],
      personality: 'friendly',
      ...config,
    };

    // Build system prompt based on config
    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    let prompt = BRITTNEY_PROMPTS.base;

    if (this.config.holoScriptMode) {
      prompt += BRITTNEY_PROMPTS.holoscript;
    }

    if (this.config.spatialMode) {
      prompt += BRITTNEY_PROMPTS.spatial;
    }

    if (this.config.domains?.includes('physics')) {
      prompt += BRITTNEY_PROMPTS.physics;
    }

    if (this.config.personality === 'creative') {
      prompt += BRITTNEY_PROMPTS.creative;
    }

    return prompt;
  }

  async chat(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResponse> {
    // Prepend system prompt if not already present
    const hasSystem = messages.some((m) => m.role === 'system');
    const fullMessages = hasSystem
      ? messages
      : [{ role: 'system' as const, content: this.systemPrompt }, ...messages];

    try {
      // Try Brittney service first
      const response = await fetch(`${this.config.serviceUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || 'brittney',
          messages: fullMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 2048,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Brittney service error: ${response.status}`);
      }

      const data = await response.json() as any;
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content || '',
        finishReason: choice?.finish_reason || 'stop',
        model: data.model || 'brittney',
        id: data.id || `brittney-${Date.now()}`,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      // Fallback to Ollama if Brittney service unavailable
      console.warn('Brittney service unavailable, falling back to Ollama');
      return this.fallbackChat(fullMessages, options);
    }
  }

  private async fallbackChat(messages: Message[], options: CompletionOptions): Promise<CompletionResponse> {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'brittney',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens || 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Neither Brittney service nor Ollama available');
    }

    const data = await response.json() as any;

    return {
      content: data.message?.content || '',
      finishReason: 'stop',
      model: data.model || 'brittney',
      id: `brittney-${Date.now()}`,
      usage: data.eval_count
        ? {
            promptTokens: data.prompt_eval_count || 0,
            completionTokens: data.eval_count || 0,
            totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          }
        : undefined,
    };
  }

  async *chatStream(messages: Message[], options: CompletionOptions = {}): AsyncIterable<StreamChunk> {
    const hasSystem = messages.some((m) => m.role === 'system');
    const fullMessages = hasSystem
      ? messages
      : [{ role: 'system' as const, content: this.systemPrompt }, ...messages];

    try {
      const response = await fetch(`${this.config.serviceUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || 'brittney',
          messages: fullMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 2048,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Brittney service error: ${response.status}`);
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
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            yield {
              content: delta?.content || '',
              done: false,
              finishReason: parsed.choices?.[0]?.finish_reason,
            };
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch {
      // Fallback to Ollama streaming
      yield* this.fallbackStream(fullMessages, options);
    }
  }

  private async *fallbackStream(
    messages: Message[],
    options: CompletionOptions
  ): AsyncIterable<StreamChunk> {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'brittney',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens || 2048,
        },
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          yield {
            content: data.message?.content || '',
            done: data.done || false,
            finishReason: data.done ? 'stop' : undefined,
          };
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<EmbeddingResponse> {
    const model = options.model || 'nomic-embed-text';
    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
      });

      const data = await response.json() as any;
      embeddings.push(data.embedding);
    }

    return { embeddings, model };
  }

  async listModels(): Promise<string[]> {
    return ['brittney', 'brittney-chat', 'brittney-code'];
  }

  /**
   * Generate HoloScript code
   */
  async generateHoloScript(prompt: string, type: 'holo' | 'hsplus' = 'hsplus'): Promise<string> {
    const response = await this.chat([
      {
        role: 'user',
        content: `Generate ${type === 'holo' ? 'HoloScript (.holo)' : 'HoloScript Plus (.hsplus)'} code for: ${prompt}

Return only the code, no explanations.`,
      },
    ]);

    // Extract code block if present
    const codeMatch = response.content.match(/```(?:holo|hsplus)?\n?([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : response.content.trim();
  }

  /**
   * Explain HoloScript code
   */
  async explainCode(code: string): Promise<string> {
    const response = await this.chat([
      {
        role: 'user',
        content: `Explain this HoloScript code:

\`\`\`hsplus
${code}
\`\`\`

Explain what it does, how it works, and any important concepts.`,
      },
    ]);

    return response.content;
  }

  /**
   * Suggest improvements for HoloScript code
   */
  async suggestImprovements(code: string): Promise<string> {
    const response = await this.chat([
      {
        role: 'user',
        content: `Review this HoloScript code and suggest improvements:

\`\`\`hsplus
${code}
\`\`\`

Consider:
- Performance optimizations
- Code clarity and organization
- Best practices
- Potential bugs or issues`,
      },
    ]);

    return response.content;
  }

  /**
   * Generate a world from a description
   */
  async generateWorld(description: string): Promise<string> {
    return this.generateHoloScript(
      `Create a 3D world environment: ${description}

Include:
- Appropriate lighting and atmosphere
- Ground/terrain
- Key objects and features
- Optional: ambient sounds, physics`,
      'hsplus'
    );
  }

  /**
   * Convert between .holo and .hsplus
   */
  async convertCode(code: string, from: 'holo' | 'hsplus', to: 'holo' | 'hsplus'): Promise<string> {
    if (from === to) return code;

    const response = await this.chat([
      {
        role: 'user',
        content: `Convert this ${from === 'holo' ? 'HoloScript (.holo)' : 'HoloScript Plus (.hsplus)'} code to ${to === 'holo' ? 'HoloScript (.holo)' : 'HoloScript Plus (.hsplus)'}:

\`\`\`${from}
${code}
\`\`\`

Return only the converted code.`,
      },
    ]);

    const codeMatch = response.content.match(/```(?:holo|hsplus)?\n?([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : response.content.trim();
  }
}

/**
 * Create a Brittney instance with default config
 */
export function brittney(config?: BrittneyConfig): BrittneyProvider {
  return new BrittneyProvider(config);
}

/**
 * Quick chat with Brittney
 */
export async function askBrittney(question: string, config?: BrittneyConfig): Promise<string> {
  const provider = brittney(config);
  const response = await provider.chat([{ role: 'user', content: question }]);
  return response.content;
}

/**
 * Generate HoloScript with Brittney
 */
export async function generateWithBrittney(
  prompt: string,
  type: 'holo' | 'hsplus' = 'hsplus',
  config?: BrittneyConfig
): Promise<string> {
  const provider = brittney(config);
  return provider.generateHoloScript(prompt, type);
}
