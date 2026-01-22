/**
 * AI Service - Multi-provider cloud AI integration
 * Supports OpenAI, Claude, and local Brittney toolkit
 */

import type { ChatMessage } from '../types/playground';

export interface AIProvider {
  name: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface StreamAIResponse {
  onChunk: (chunk: string) => void;
  onComplete: (content: string) => void;
  onError: (error: Error) => void;
}

export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private activeProvider: string = 'brittney';

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize available AI providers
   */
  private initializeProviders(): void {
    // Brittney (local/workspace)
    this.providers.set('brittney', {
      name: 'Brittney',
      model: 'brittney-toolkit',
      baseUrl: import.meta.env.VITE_BRITTNEY_API || 'http://localhost:3001',
    });

    // OpenAI
    if (import.meta.env.VITE_OPENAI_API_KEY) {
      this.providers.set('openai', {
        name: 'OpenAI',
        model: 'gpt-4-turbo',
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
      });
    }

    // Claude (Anthropic)
    if (import.meta.env.VITE_CLAUDE_API_KEY) {
      this.providers.set('claude', {
        name: 'Claude',
        model: 'claude-3-opus',
        apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1',
      });
    }

    // Local Ollama
    if (import.meta.env.VITE_OLLAMA_BASE_URL) {
      this.providers.set('ollama', {
        name: 'Ollama',
        model: 'neural-chat',
        baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL,
      });
    }
  }

  /**
   * Set active provider
   */
  setProvider(name: string): void {
    if (this.providers.has(name)) {
      this.activeProvider = name;
    }
  }

  /**
   * Get available providers
   */
  getProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Generate code with streaming
   */
  async *generateCode(
    prompt: string,
    context: {
      currentCode: string;
      language: string;
      selectedObject?: string;
    }
  ): AsyncGenerator<string> {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) throw new Error(`Provider ${this.activeProvider} not found`);

    const systemPrompt = `You are Brittney, an AI assistant for HoloScript development.
Generate HoloScript code that is:
- Syntactically correct
- Well-commented
- Follows HoloScript best practices
- Includes proper error handling

Current code context:
${context.currentCode}

Language: ${context.language}
${context.selectedObject ? `Selected object: ${context.selectedObject}` : ''}

Respond ONLY with HoloScript code wrapped in \`\`\`holoscript\n...\n\`\`\` blocks.`;

    if (this.activeProvider === 'brittney') {
      yield* await this.streamBrittney(prompt, systemPrompt);
    } else if (this.activeProvider === 'openai') {
      yield* await this.streamOpenAI(prompt, systemPrompt);
    } else if (this.activeProvider === 'claude') {
      yield* await this.streamClaude(prompt, systemPrompt);
    } else if (this.activeProvider === 'ollama') {
      yield* await this.streamOllama(prompt, systemPrompt);
    }
  }

  /**
   * Stream from local Brittney toolkit
   */
  private async *streamBrittney(prompt: string, systemPrompt: string): AsyncGenerator<string> {
    try {
      // Try to use brittney-toolkit if available
      const response = await fetch(
        `${this.providers.get('brittney')?.baseUrl}/api/chat/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            stream: true,
          }),
        }
      );

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data && data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices?.[0]?.delta?.content) {
                    yield parsed.choices[0].delta.content;
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      // Fallback to mock response if toolkit not available
      yield* this.generateMockResponse(prompt);
    }
  }

  /**
   * Stream from OpenAI
   */
  private async *streamOpenAI(prompt: string, systemPrompt: string): AsyncGenerator<string> {
    const provider = this.providers.get('openai');
    if (!provider?.apiKey) throw new Error('OpenAI API key not configured');

    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data && data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices?.[0]?.delta?.content) {
                    yield parsed.choices[0].delta.content;
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      yield* this.generateMockResponse(prompt);
    }
  }

  /**
   * Stream from Claude (Anthropic)
   */
  private async *streamClaude(prompt: string, systemPrompt: string): AsyncGenerator<string> {
    const provider = this.providers.get('claude');
    if (!provider?.apiKey) throw new Error('Claude API key not configured');

    try {
      const response = await fetch(`${provider.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  yield parsed.delta.text;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      yield* this.generateMockResponse(prompt);
    }
  }

  /**
   * Stream from Ollama (local)
   */
  private async *streamOllama(prompt: string, systemPrompt: string): AsyncGenerator<string> {
    const provider = this.providers.get('ollama');
    if (!provider?.baseUrl) throw new Error('Ollama not configured');

    try {
      const response = await fetch(`${provider.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          stream: true,
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.message?.content) {
                  yield parsed.message.content;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      yield* this.generateMockResponse(prompt);
    }
  }

  /**
   * Generate mock response (fallback)
   */
  private async *generateMockResponse(prompt: string): AsyncGenerator<string> {
    const mockResponses: Record<string, string> = {
      cube: `\`\`\`holoscript
world SpinningCube {
  object cube {
    position: [0, 0, 0]
    rotation: [0, 0, 0]
    scale: [1, 1, 1]
    
    trait Material {
      color: 0x00ff00
      metalness: 0.5
      roughness: 0.5
    }
    
    behavior Rotate {
      speed: 2.0
      axis: [0, 1, 0]
    }
  }
}
\`\`\``,
      sphere: `\`\`\`holoscript
world SphereWorld {
  object sphere {
    position: [0, 2, 0]
    scale: [1.5, 1.5, 1.5]
    
    trait Material {
      color: 0x0080ff
      metalness: 0.8
      roughness: 0.2
    }
  }
}
\`\`\``,
    };

    const lower = prompt.toLowerCase();
    let response = '';

    if (lower.includes('cube')) {
      response = mockResponses.cube;
    } else if (lower.includes('sphere')) {
      response = mockResponses.sphere;
    } else {
      response = `\`\`\`holoscript
world GeneratedWorld {
  object cube {
    position: [0, 0, 0]
    // Generated from prompt: ${prompt}
  }
}
\`\`\``;
    }

    // Stream character by character for realistic effect
    for (const char of response) {
      yield char;
      // Small delay for streaming effect
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  /**
   * Extract code from response
   */
  static extractCode(response: string): string {
    const match = response.match(/```holoscript\n([\s\S]*?)\n```/);
    return match ? match[1] : response;
  }

  /**
   * Analyze code for errors
   */
  async analyzeCode(code: string): Promise<string> {
    const prompt = `Analyze this HoloScript code for potential issues:

\`\`\`holoscript
${code}
\`\`\`

Provide a brief analysis of:
1. Syntax correctness
2. Best practices
3. Performance concerns
4. Suggestions for improvement`;

    let analysis = '';
    for await (const chunk of this.generateCode(prompt, {
      currentCode: code,
      language: 'holoscript',
    })) {
      analysis += chunk;
    }
    return analysis;
  }

  /**
   * Generate documentation
   */
  async generateDocumentation(code: string, objectName: string): Promise<string> {
    const prompt = `Generate JSDoc-style documentation for this HoloScript object:

\`\`\`holoscript
${code}
\`\`\`

Include:
1. Description of what it does
2. Parameters/properties
3. Behaviors
4. Usage example`;

    let docs = '';
    for await (const chunk of this.generateCode(prompt, {
      currentCode: code,
      language: 'holoscript',
      selectedObject: objectName,
    })) {
      docs += chunk;
    }
    return docs;
  }
}
