/**
 * Cloud Inference - Optional for users who bring their own API key
 * 
 * Supports: OpenAI, Anthropic, Google, Groq, Together, Ollama
 */

import type { InferenceProvider, ChatRequest, ChatResponse, StreamCallback, ChatMessage, SupportedCloudProvider } from '../types';

export type CloudProvider = SupportedCloudProvider;

export interface CloudInferenceConfig {
  /** Cloud provider */
  provider: CloudProvider;
  /** API key (user provides their own) */
  apiKey: string;
  /** Optional model override */
  model?: string;
  /** Optional base URL (for Ollama or custom endpoints) */
  baseUrl?: string;
}

// Default models per provider
const DEFAULT_MODELS: Record<CloudProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  google: 'gemini-1.5-flash',
  groq: 'llama-3.1-8b-instant',
  together: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
  ollama: 'llama3.1',
};

// Base URLs per provider
const BASE_URLS: Record<CloudProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  together: 'https://api.together.xyz/v1',
  ollama: 'http://localhost:11434/v1',
};

/**
 * Cloud inference provider
 * User brings their own API key
 */
export class CloudInference implements InferenceProvider {
  readonly name: string;
  
  private config: CloudInferenceConfig;
  private client: any = null;
  private ready = false;

  constructor(config: CloudInferenceConfig) {
    this.config = config;
    this.name = `cloud-${config.provider}`;
  }

  async isReady(): Promise<boolean> {
    return this.ready;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;

    const provider = this.config.provider;
    const baseUrl = this.config.baseUrl || BASE_URLS[provider];

    try {
      if (provider === 'anthropic') {
        // Anthropic has its own SDK
        const { Anthropic } = await import('@anthropic-ai/sdk');
        this.client = new Anthropic({ apiKey: this.config.apiKey });
      } else {
        // All others use OpenAI-compatible API
        const { OpenAI } = await import('openai');
        this.client = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: baseUrl,
          dangerouslyAllowBrowser: true, // For Tauri/browser use
        });
      }

      this.ready = true;
      console.log(`[Brittney] Cloud provider ${provider} ready`);
      
    } catch (error: any) {
      console.error(`[Brittney] Failed to initialize ${provider}:`, error.message);
      throw error;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.ready) {
      await this.initialize();
    }

    const model = this.config.model || DEFAULT_MODELS[this.config.provider];

    if (this.config.provider === 'anthropic') {
      return this.chatAnthropic(request, model);
    } else {
      return this.chatOpenAI(request, model);
    }
  }

  private async chatOpenAI(request: ChatRequest, model: string): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1024,
    });

    return {
      id: response.id,
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
      finishReason: response.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length',
    };
  }

  private async chatAnthropic(request: ChatRequest, model: string): Promise<ChatResponse> {
    const systemMsg = request.messages.find(m => m.role === 'system');
    const nonSystemMsgs = request.messages.filter(m => m.role !== 'system');

    const response = await this.client.messages.create({
      model,
      max_tokens: request.maxTokens ?? 1024,
      system: systemMsg?.content,
      messages: nonSystemMsgs.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    });

    return {
      id: response.id,
      content: response.content[0]?.type === 'text' ? response.content[0].text : '',
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
    };
  }

  async chatStream(request: ChatRequest, callback: StreamCallback): Promise<void> {
    if (!this.ready) {
      await this.initialize();
    }

    const model = this.config.model || DEFAULT_MODELS[this.config.provider];

    if (this.config.provider === 'anthropic') {
      await this.streamAnthropic(request, model, callback);
    } else {
      await this.streamOpenAI(request, model, callback);
    }
  }

  private async streamOpenAI(request: ChatRequest, model: string, callback: StreamCallback): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        callback(content, false);
      }
    }
    callback('', true);
  }

  private async streamAnthropic(request: ChatRequest, model: string, callback: StreamCallback): Promise<void> {
    const systemMsg = request.messages.find(m => m.role === 'system');
    const nonSystemMsgs = request.messages.filter(m => m.role !== 'system');

    const stream = await this.client.messages.stream({
      model,
      max_tokens: request.maxTokens ?? 1024,
      system: systemMsg?.content,
      messages: nonSystemMsgs.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        callback(event.delta.text, false);
      }
    }
    callback('', true);
  }

  async dispose(): Promise<void> {
    this.client = null;
    this.ready = false;
  }
}
