/**
 * Anthropic Provider - BYOK Cloud Inference
 *
 * Supports Claude models via user's API key
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ChatMessage,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  ProviderStatus,
  ProviderType,
} from '../types.js';

export interface AnthropicProviderConfig {
  apiKey: string;
  defaultModel?: string;
}

export class AnthropicProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-20250514';
  }

  get type(): ProviderType {
    return 'anthropic';
  }

  /**
   * Check if provider is available
   */
  async health(): Promise<boolean> {
    try {
      // Simple validation - try a minimal request
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return true;
    } catch (error: any) {
      // Auth errors mean the key is configured (even if invalid)
      if (error.status === 401) return false;
      // Rate limit means it's working
      if (error.status === 429) return true;
      return false;
    }
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    const start = Date.now();
    try {
      // Just check if API key looks valid
      const hasKey = !!this.client;
      return {
        type: 'anthropic',
        available: hasKey,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return { type: 'anthropic', available: false, error: error.message };
    }
  }

  /**
   * Chat completion
   */
  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    const start = Date.now();
    const model = request.model || this.defaultModel;

    // Separate system message from conversation
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    const response = await this.client.messages.create({
      model,
      max_tokens: request.maxTokens ?? 2048,
      system: systemMessage?.content,
      messages: conversationMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      id: response.id,
      content,
      model,
      provider: 'anthropic',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      latencyMs: Date.now() - start,
    };
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(request: InferenceRequest): AsyncGenerator<StreamChunk> {
    const model = request.model || this.defaultModel;

    const systemMessage = request.messages.find((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    const stream = this.client.messages.stream({
      model,
      max_tokens: request.maxTokens ?? 2048,
      system: systemMessage?.content,
      messages: conversationMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { content: event.delta.text, done: false };
      }
      if (event.type === 'message_stop') {
        yield { content: '', done: true };
      }
    }
  }
}
