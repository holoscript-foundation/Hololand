/**
 * Google AI Provider - BYOK Cloud Inference
 *
 * Supports Gemini models via user's API key
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
interface GoogleChatResponse {
  id?: string;
  choices: Array<{ message: { content: string }; delta?: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface GoogleProviderConfig {
  apiKey: string;
  defaultModel?: string;
}

export class GoogleProvider {
  private apiKey: string;
  private defaultModel: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';

  constructor(config: GoogleProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gemini-2.0-flash';
  }

  get type(): ProviderType {
    return 'google';
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
        type: 'google',
        available,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return { type: 'google', available: false, error: error.message };
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
      throw new Error(`Google AI error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GoogleChatResponse;
    const choice = data.choices[0];

    return {
      id: data.id || `google_${Date.now()}`,
      content: choice.message.content || '',
      model,
      provider: 'google',
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
      throw new Error(`Google AI stream error: ${response.status}`);
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
