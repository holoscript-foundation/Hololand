/**
 * InfinityAssistant Provider - External AI Service
 *
 * Connects to InfinityAssistant.io service for AI inference.
 * Uses custom API format (not OpenAI-compatible)
 *
 * Default endpoint: http://localhost:3002/api/ollama
 * Production: https://infinityassistant.io/api/ollama
 */

import type {
  ChatMessage,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  ProviderStatus,
  ProviderType,
} from '../types.js';

// InfinityAssistant API response types
interface InfinityAssistantChatResponse {
  response: string;
  model: string;
  source: string;
}

interface InfinityAssistantStatusResponse {
  available: boolean;
  version?: string;
  models: Array<{ name: string; size: number }>;
  defaultModel: string;
  error?: string;
}

export interface InfinityAssistantProviderConfig {
  apiKey?: string;
  endpoint?: string;
  defaultModel?: string;
}

export class InfinityAssistantProvider {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: InfinityAssistantProviderConfig = {}) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.endpoint || process.env.INFINITYASSISTANT_URL || 'http://localhost:3002';
    this.defaultModel = config.defaultModel || 'mistral-nemo:12b';
  }

  get type(): ProviderType {
    return 'infinityassistant' as ProviderType;
  }

  /**
   * Check if InfinityAssistant is available
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ollama`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get provider status with available models
   */
  async getStatus(): Promise<ProviderStatus> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/ollama`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = (await response.json()) as InfinityAssistantStatusResponse;
        return {
          type: 'infinityassistant' as ProviderType,
          available: data.available,
          latencyMs: Date.now() - start,
          models: data.models?.map((m) => ({
            name: m.name,
            displayName: m.name,
            provider: 'infinityassistant' as ProviderType,
            size: m.size,
            capabilities: ['chat', 'code'] as const,
            isLocal: false,
          })),
          error: data.error,
        };
      }

      return {
        type: 'infinityassistant' as ProviderType,
        available: false,
        error: `HTTP ${response.status}`,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return {
        type: 'infinityassistant' as ProviderType,
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Chat completion
   */
  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    const start = Date.now();
    const model = request.model || this.defaultModel;

    // Extract system message for InfinityAssistant's systemPrompt field
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const messagesWithoutSystem = request.messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/api/ollama`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: messagesWithoutSystem,
        model,
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 2048,
        systemPrompt: systemMessage?.content,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`InfinityAssistant API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as InfinityAssistantChatResponse;

    return {
      id: `infinity_${Date.now()}`,
      content: data.response || '',
      model: data.model || model,
      provider: 'infinityassistant' as ProviderType,
      latencyMs: Date.now() - start,
    };
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(request: InferenceRequest): AsyncGenerator<StreamChunk> {
    const model = request.model || this.defaultModel;

    // Extract system message
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const messagesWithoutSystem = request.messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/api/ollama`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: messagesWithoutSystem,
        model,
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 2048,
        systemPrompt: systemMessage?.content,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`InfinityAssistant stream error: ${response.status}`);
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
          if (parsed.done) {
            yield { content: '', done: true };
            return;
          }
          if (parsed.content) {
            yield { content: parsed.content, done: false };
          }
          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch {
          // Ignore parse errors for malformed chunks
        }
      }
    }

    yield { content: '', done: true };
  }

  /**
   * Get headers for requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}
