/**
 * @holoscript/ai - LLM Providers
 *
 * Implementations for various LLM providers.
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
 * Base provider with common HTTP functionality
 */
abstract class BaseProvider implements AIProvider {
  abstract readonly name: string;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.config = config;
  }

  abstract chat(messages: Message[], options?: CompletionOptions): Promise<CompletionResponse>;
  abstract chatStream(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk>;
  abstract embed(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResponse>;
  abstract listModels(): Promise<string[]>;

  protected async fetch(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = this.config.timeout
      ? setTimeout(() => controller.abort(), this.config.timeout)
      : undefined;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error (${response.status}): ${error}`);
      }

      return response;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}

/**
 * Ollama provider (local models)
 */
export class OllamaProvider extends BaseProvider {
  readonly name = 'ollama';

  constructor(config: ProviderConfig = {}) {
    super({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'llama3.2',
      ...config,
    });
  }

  async chat(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResponse> {
    const response = await this.fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
          top_p: options.topP,
          stop: options.stop,
        },
      }),
    });

    const data = await response.json() as any as any;

    return {
      content: data.message?.content || '',
      finishReason: 'stop',
      model: data.model,
      id: `ollama-${Date.now()}`,
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
    const response = await this.fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
          top_p: options.topP,
          stop: options.stop,
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
      const response = await this.fetch(`${this.config.baseUrl}/api/embeddings`, {
        method: 'POST',
        body: JSON.stringify({ model, prompt: text }),
      });

      const data = await response.json() as any;
      embeddings.push(data.embedding);
    }

    return {
      embeddings,
      model,
    };
  }

  async listModels(): Promise<string[]> {
    const response = await this.fetch(`${this.config.baseUrl}/api/tags`, {
      method: 'GET',
    });

    const data = await response.json() as any;
    return data.models?.map((m: { name: string }) => m.name) || [];
  }
}

/**
 * LM Studio provider (local OpenAI-compatible server)
 */
export class LMStudioProvider extends BaseProvider {
  readonly name = 'lmstudio';

  constructor(config: ProviderConfig = {}) {
    super({
      baseUrl: 'http://localhost:1234/v1',
      defaultModel: 'local-model',
      ...config,
    });
  }

  async chat(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResponse> {
    const response = await this.fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          name: m.name,
          tool_call_id: m.toolCallId,
          tool_calls: m.toolCalls,
        })),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stop,
        tools: options.tools,
        tool_choice: options.toolChoice,
        stream: false,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      }),
    });

    const data = await response.json() as any;
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      toolCalls: choice?.message?.tool_calls,
      finishReason: choice?.finish_reason || 'stop',
      model: data.model,
      id: data.id,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *chatStream(messages: Message[], options: CompletionOptions = {}): AsyncIterable<StreamChunk> {
    const response = await this.fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
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
            toolCalls: delta?.tool_calls,
            done: false,
            finishReason: parsed.choices?.[0]?.finish_reason,
          };
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<EmbeddingResponse> {
    const response = await this.fetch(`${this.config.baseUrl}/embeddings`, {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || 'text-embedding-3-small',
        input: texts,
        dimensions: options.dimensions,
      }),
    });

    const data = await response.json() as any;

    return {
      embeddings: data.data.map((d: { embedding: number[] }) => d.embedding),
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async listModels(): Promise<string[]> {
    const response = await this.fetch(`${this.config.baseUrl}/models`, {
      method: 'GET',
    });

    const data = await response.json() as any;
    return data.data?.map((m: { id: string }) => m.id) || [];
  }
}

/**
 * Claude provider (Anthropic API)
 */
export class ClaudeProvider extends BaseProvider {
  readonly name = 'claude';

  constructor(config: ProviderConfig = {}) {
    super({
      baseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-3-5-sonnet-20241022',
      ...config,
    });

    if (!this.config.apiKey) {
      this.config.apiKey = process.env.ANTHROPIC_API_KEY;
    }
  }

  async chat(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResponse> {
    // Extract system message
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const response = await this.fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        max_tokens: options.maxTokens || 4096,
        system: options.system || systemMessage?.content,
        messages: chatMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        temperature: options.temperature,
        top_p: options.topP,
        stop_sequences: options.stop,
        tools: options.tools?.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters,
        })),
      }),
    });

    const data = await response.json() as any;

    // Extract text content
    const textContent = data.content?.find((c: { type: string }) => c.type === 'text');
    const toolUseContent = data.content?.filter((c: { type: string }) => c.type === 'tool_use');

    return {
      content: textContent?.text || '',
      toolCalls: toolUseContent?.map((t: { id: string; name: string; input: unknown }) => ({
        id: t.id,
        type: 'function' as const,
        function: {
          name: t.name,
          arguments: JSON.stringify(t.input),
        },
      })),
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
      model: data.model,
      id: data.id,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
    };
  }

  async *chatStream(messages: Message[], options: CompletionOptions = {}): AsyncIterable<StreamChunk> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const response = await this.fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        max_tokens: options.maxTokens || 4096,
        system: options.system || systemMessage?.content,
        messages: chatMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        temperature: options.temperature,
        stream: true,
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
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            yield {
              content: parsed.delta.text || '',
              done: false,
            };
          } else if (parsed.type === 'message_stop') {
            yield { done: true, finishReason: 'stop' };
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  async embed(_texts: string[], _options: EmbeddingOptions = {}): Promise<EmbeddingResponse> {
    // Claude doesn't have a native embedding API
    throw new Error('Claude does not support embeddings. Use a different provider.');
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't have a models endpoint
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }
}

/**
 * Create a provider by name
 */
export function createProvider(name: string, config?: ProviderConfig): AIProvider {
  switch (name.toLowerCase()) {
    case 'ollama':
      return new OllamaProvider(config);
    case 'lmstudio':
    case 'lm-studio':
      return new LMStudioProvider(config);
    case 'claude':
    case 'anthropic':
      return new ClaudeProvider(config);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

/**
 * Get the default provider (prefers local, falls back to cloud)
 */
export async function getDefaultProvider(): Promise<AIProvider> {
  // Try Ollama first
  try {
    const ollama = new OllamaProvider();
    await ollama.listModels();
    return ollama;
  } catch {
    // Ollama not available
  }

  // Try LM Studio
  try {
    const lmstudio = new LMStudioProvider();
    await lmstudio.listModels();
    return lmstudio;
  } catch {
    // LM Studio not available
  }

  // Fall back to Claude if API key is set
  if (process.env.ANTHROPIC_API_KEY) {
    return new ClaudeProvider();
  }

  throw new Error('No AI provider available. Please start Ollama, LM Studio, or set ANTHROPIC_API_KEY.');
}
