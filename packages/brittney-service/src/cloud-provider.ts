/**
 * Cloud Provider Integration
 *
 * Hololand uses Brittney V1 - fine-tuned on 94 HoloScript examples
 * This is the FREE LLM for HoloScript code generation
 * 
 * V2 (general assistant) is used in uAA2 service instead
 */

import { ChatMessage, ChatRequest, ChatResponse } from './server.js';
import { BrittneyConfig, BRITTNEY_MODELS } from './config.js';

// Keywords that indicate HoloScript code generation requests
const HOLOSCRIPT_KEYWORDS = [
  'holoscript', 'holo script', 'create', 'build', 'make', 'generate',
  'scene', 'object', 'animation', 'vr', 'ar', 'trait', '@grabbable',
  '@networked', 'physics', 'material', 'shader', 'particle', 'spawn',
  'npc', 'character', 'game', 'world', 'environment', 'ui panel'
];

/**
 * Select the best Brittney model based on the request
 * For Hololand: Default to V1 (HoloScript specialist) for all requests
 */
function selectBrittneyModel(messages: ChatMessage[], request: ChatRequest): string {
  // Hololand always uses V1 (HoloScript specialist) - it's free for users!
  // V2 is reserved for uAA2 agent service
  console.log('[✱brittney] Using V1 (HoloScript specialist - FREE)');
  return BRITTNEY_MODELS.holoscript;
}

export class CloudProvider {
  private config: BrittneyConfig;
  private openai: any = null;
  private anthropic: any = null;
  private grok: any = null;
  private ready: Promise<void>;

  constructor(config: BrittneyConfig) {
    this.config = config;
    this.ready = this.initializeProvider();
  }

  /** Wait for the provider to be ready before use */
  async waitReady(): Promise<void> {
    return this.ready;
  }

  private async initializeProvider(): Promise<void> {
    if (!this.config.cloudProvider || !this.config.cloudApiKey) return;

    try {
      switch (this.config.cloudProvider) {
        case 'openai':
          const { OpenAI } = await import('openai');
          this.openai = new OpenAI({
            apiKey: this.config.cloudApiKey,
            baseURL: this.config.cloudEndpoint || 'https://api.openai.com/v1',
          });
          console.log(`[✱brittney] OpenAI provider initialized`);
          break;

        case 'azure':
          // Azure OpenAI requires special configuration
          const { AzureOpenAI } = await import('openai');
          if (!this.config.cloudEndpoint) {
            console.warn('[✱brittney] Azure requires cloudEndpoint (e.g., https://YOUR-RESOURCE.openai.azure.com)');
          }
          this.openai = new AzureOpenAI({
            apiKey: this.config.cloudApiKey,
            endpoint: this.config.cloudEndpoint,
            apiVersion: '2024-08-01-preview',
          });
          console.log(`[✱brittney] Azure OpenAI provider initialized`);
          if (this.config.cloudEndpoint) {
            console.log(`[✱brittney] Using endpoint: ${this.config.cloudEndpoint}`);
          }
          break;

        case 'anthropic':
          const { Anthropic } = await import('@anthropic-ai/sdk');
          this.anthropic = new Anthropic({
            apiKey: this.config.cloudApiKey,
          });
          console.log('[✱brittney] Anthropic provider initialized');
          break;

        case 'google':
          // Google/Gemini uses OpenAI-compatible API
          const { OpenAI: GeminiOpenAI } = await import('openai');
          this.openai = new GeminiOpenAI({
            apiKey: this.config.cloudApiKey,
            baseURL: this.config.cloudEndpoint || 'https://generativelanguage.googleapis.com/v1beta/openai',
          });
          console.log('[✱brittney] Google/Gemini provider initialized');
          break;

        case 'grok':
          // Grok uses OpenAI-compatible API
          const { OpenAI: GrokOpenAI } = await import('openai');
          this.grok = new GrokOpenAI({
            apiKey: this.config.cloudApiKey,
            baseURL: this.config.cloudEndpoint || 'https://api.x.ai/v1',
          });
          console.log('[✱brittney] Grok (xAI) provider initialized');
          break;
      }
    } catch (error: any) {
      console.error(`[✱brittney] Failed to initialize ${this.config.cloudProvider}:`, error.message);
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
      case 'google':
        return this.chatOpenAI(messages, request, id);

      case 'anthropic':
        return this.chatAnthropic(messages, request, id);

      case 'grok':
        return this.chatGrok(messages, request, id);

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
      case 'google':
        yield* this.streamOpenAI(messages, request);
        break;

      case 'anthropic':
        yield* this.streamAnthropic(messages, request);
        break;

      case 'grok':
        yield* this.streamGrok(messages, request);
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

    // Use smart model selection for fine-tuned Brittney models
    const model = this.config.cloudModel?.startsWith('ft:')
      ? selectBrittneyModel(messages, request)
      : (this.config.cloudModel || 'gpt-4o-mini');

    const response = await this.openai.chat.completions.create({
      model,
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
      model: this.config.cloudModel || 'claude-sonnet-4-20250514',
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
      model: this.config.cloudModel || 'claude-sonnet-4-20250514',
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

  // =============================================================================
  // Grok (xAI) - OpenAI-compatible API
  // =============================================================================

  private async chatGrok(
    messages: ChatMessage[],
    request: ChatRequest,
    id: string
  ): Promise<ChatResponse> {
    if (!this.grok) throw new Error('Grok client not initialized');

    const response = await this.grok.chat.completions.create({
      model: this.config.cloudModel || 'grok-2-latest',
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: request.maxTokens || 2048,
      temperature: request.temperature || 0.7,
    });

    const choice = response.choices[0];

    return {
      id,
      content: choice.message.content || '',
      model: response.model,
      provider: 'grok',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  private async *streamGrok(
    messages: ChatMessage[],
    request: ChatRequest
  ): AsyncGenerator<{ content: string; done: boolean }> {
    if (!this.grok) {
      yield { content: 'Grok client not initialized', done: true };
      return;
    }

    const stream = await this.grok.chat.completions.create({
      model: this.config.cloudModel || 'grok-2-latest',
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
}
