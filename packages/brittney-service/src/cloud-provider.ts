/**
 * Cloud Provider Integration
 *
 * Optional cloud LLM fallback for when local model can't handle the request
 * (large context, complex reasoning, etc.)
 */

import { ChatMessage, ChatRequest, ChatResponse } from './server.js';
import { BrittneyConfig } from './config.js';

export class CloudProvider {
  private config: BrittneyConfig;
  private openai: any = null;
  private anthropic: any = null;

  constructor(config: BrittneyConfig) {
    this.config = config;
    this.initializeProvider();
  }

  private async initializeProvider(): Promise<void> {
    if (!this.config.cloudProvider || !this.config.cloudApiKey) return;

    try {
      switch (this.config.cloudProvider) {
        case 'openai':
        case 'azure':
          const { OpenAI } = await import('openai');
          this.openai = new OpenAI({
            apiKey: this.config.cloudApiKey,
            baseURL: this.config.cloudProvider === 'azure' 
              ? this.config.cloudEndpoint 
              : undefined,
          });
          break;

        case 'anthropic':
          const { Anthropic } = await import('@anthropic-ai/sdk');
          this.anthropic = new Anthropic({
            apiKey: this.config.cloudApiKey,
          });
          break;

        case 'google':
          // Google AI SDK would go here
          console.log('[Brittney] Google AI not yet implemented');
          break;
      }
    } catch (error: any) {
      console.error(`[Brittney] Failed to initialize ${this.config.cloudProvider}:`, error.message);
    }
  }

  /**
   * Chat completion via cloud provider
   */
  async chat(messages: ChatMessage[], request: ChatRequest): Promise<ChatResponse> {
    const id = `cloud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    switch (this.config.cloudProvider) {
      case 'openai':
      case 'azure':
        return this.chatOpenAI(messages, request, id);

      case 'anthropic':
        return this.chatAnthropic(messages, request, id);

      default:
        throw new Error(`Unsupported cloud provider: ${this.config.cloudProvider}`);
    }
  }

  /**
   * Streaming chat via cloud provider
   */
  async *chatStream(
    messages: ChatMessage[],
    request: ChatRequest
  ): AsyncGenerator<{ content: string; done: boolean }> {
    switch (this.config.cloudProvider) {
      case 'openai':
      case 'azure':
        yield* this.streamOpenAI(messages, request);
        break;

      case 'anthropic':
        yield* this.streamAnthropic(messages, request);
        break;

      default:
        yield { content: `Unsupported provider: ${this.config.cloudProvider}`, done: true };
    }
  }

  // =============================================================================
  // OpenAI / Azure OpenAI
  // =============================================================================

  private async chatOpenAI(
    messages: ChatMessage[],
    request: ChatRequest,
    id: string
  ): Promise<ChatResponse> {
    if (!this.openai) throw new Error('OpenAI client not initialized');

    const response = await this.openai.chat.completions.create({
      model: this.config.cloudModel || 'gpt-4o-mini',
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: request.maxTokens || 2048,
      temperature: request.temperature || 0.7,
    });

    const choice = response.choices[0];

    return {
      id,
      content: choice.message.content || '',
      model: response.model,
      provider: this.config.cloudProvider as any,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  private async *streamOpenAI(
    messages: ChatMessage[],
    request: ChatRequest
  ): AsyncGenerator<{ content: string; done: boolean }> {
    if (!this.openai) {
      yield { content: 'OpenAI client not initialized', done: true };
      return;
    }

    const stream = await this.openai.chat.completions.create({
      model: this.config.cloudModel || 'gpt-4o-mini',
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: request.maxTokens || 2048,
      temperature: request.temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield { content, done: false };
      }
    }
    yield { content: '', done: true };
  }

  // =============================================================================
  // Anthropic
  // =============================================================================

  private async chatAnthropic(
    messages: ChatMessage[],
    request: ChatRequest,
    id: string
  ): Promise<ChatResponse> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized');

    // Extract system message
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const response = await this.anthropic.messages.create({
      model: this.config.cloudModel || 'claude-3-haiku-20240307',
      max_tokens: request.maxTokens || 2048,
      system: systemMessage?.content,
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b: any) => b.type === 'text');

    return {
      id,
      content: textBlock?.text || '',
      model: response.model,
      provider: 'anthropic',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  private async *streamAnthropic(
    messages: ChatMessage[],
    request: ChatRequest
  ): AsyncGenerator<{ content: string; done: boolean }> {
    if (!this.anthropic) {
      yield { content: 'Anthropic client not initialized', done: true };
      return;
    }

    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const stream = await this.anthropic.messages.stream({
      model: this.config.cloudModel || 'claude-3-haiku-20240307',
      max_tokens: request.maxTokens || 2048,
      system: systemMessage?.content,
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { content: event.delta.text, done: false };
      }
    }
    yield { content: '', done: true };
  }
}
