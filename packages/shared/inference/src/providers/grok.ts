/**
 * Grok (xAI) Provider - BYOK Cloud Inference
 *
 * Supports Grok models via user's API key
 * Uses OpenAI-compatible endpoint
 */

import type {
  ChatMessage,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  ProviderStatus,
  ProviderType,
} from '../types.js';

// API Response types
interface GrokChatResponse {
  id?: string;
  choices: Array<{ message: { content: string }; delta?: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface GrokProviderConfig {
  apiKey: string;
  defaultModel?: string;
}

export class GrokProvider {
  private apiKey: string;
  private defaultModel: string;
  private baseUrl = 'https://api.x.ai/v1';

  constructor(config: GrokProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'grok-3';
  }

  get type(): ProviderType {
    return 'grok';
  }

  /**
   * Check if provider is available
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    const start = Date.now();
    try {
      const available = await this.health();
      return {
        type: 'grok',
        available,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return { type: 'grok', available: false, error: error.message };
    }
  }

  /**
   * Chat completion (OpenAI-compatible endpoint)
   */
  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    const start = Date.now();
    const model = request.model || this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GrokChatResponse;
    const choice = data.choices[0];

    return {
      id: data.id || `grok_${Date.now()}`,
      content: choice.message.content || '',
      model,
      provider: 'grok',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      latencyMs: Date.now() - start,
    };
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(request: InferenceRequest): AsyncGenerator<StreamChunk> {
    const model = request.model || this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok stream error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { content: '', done: true };
      return;
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { content: '', done: true };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          yield { content, done: false };
        } catch {
          // Ignore parse errors
        }
      }
    }

    yield { content: '', done: true };
  }
}
