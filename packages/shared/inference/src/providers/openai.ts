/**
 * OpenAI Provider - BYOK Cloud Inference
 *
 * Supports:
 * - OpenAI API (gpt-4o, gpt-4o-mini, etc.)
 * - Fine-tuned Brittney models (ft:gpt-4o-mini:brittney)
 * - Azure OpenAI endpoints
 * - Any OpenAI-compatible API
 */

import OpenAI from 'openai';
import type {
  ChatMessage,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  ProviderStatus,
  ProviderType,
  BRITTNEY_MODELS,
} from '../types.js';

export interface OpenAIProviderConfig {
  apiKey: string;
  endpoint?: string;  // For Azure or custom endpoints
  organization?: string;
  defaultModel?: string;
}

export class OpenAIProvider {
  private client: OpenAI;
  private defaultModel: string;
  private providerType: ProviderType;

  constructor(config: OpenAIProviderConfig, providerType: ProviderType = 'openai') {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.endpoint,
      organization: config.organization,
    });
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
    this.providerType = providerType;
  }

  get type(): ProviderType {
    return this.providerType;
  }

  /**
   * Check if provider is available
   */
  async health(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
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
        type: this.providerType,
        available,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return { type: this.providerType, available: false, error: error.message };
    }
  }

  /**
   * Chat completion
   */
  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    const start = Date.now();
    const model = request.model || this.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    });

    const choice = response.choices[0];

    return {
      id: response.id,
      content: choice.message.content || '',
      model,
      provider: this.providerType,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
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

    const stream = await this.client.chat.completions.create({
      model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason === 'stop';
      yield { content, done };
    }
  }

  /**
   * Generate embeddings
   */
  async embeddings(text: string, model: string = 'text-embedding-3-small'): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model,
      input: text,
    });
    return response.data[0].embedding;
  }
}

/**
 * Create OpenAI provider with Brittney fine-tuned model
 */
export function createBrittneyCloudProvider(
  apiKey: string,
  variant: 'holoscript' | 'general' = 'holoscript'
): OpenAIProvider {
  const models = {
    holoscript: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
    general: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney-v2:CzuzuPXc',
  };

  return new OpenAIProvider({
    apiKey,
    defaultModel: models[variant],
  });
}
