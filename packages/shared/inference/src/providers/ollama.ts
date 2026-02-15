/**
 * Ollama Provider - Local LLM Inference
 *
 * Connects to Ollama server (default: localhost:11434)
 * Used by both Hololand app and MCP tools
 */

import type {
  ChatMessage,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  ModelInfo,
  ProviderStatus,
  ProviderType,
} from '../types.js';

// API Response types
interface OllamaTagsResponse {
  models?: OllamaModel[];
}

interface OllamaChatResponse {
  message?: { content: string };
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaStreamChunk {
  message?: { content: string };
  done?: boolean;
}

export interface OllamaConfig {
  baseUrl: string;
  timeout: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export class OllamaProvider {
  private baseUrl: string;
  private timeout: number;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.timeout = config.timeout || 120000;
  }

  get type(): ProviderType {
    return 'local';
  }

  /**
   * Check if Ollama is available
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
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
      const available = await this.health();
      if (!available) {
        return { type: 'local', available: false, error: 'Ollama not running' };
      }

      const models = await this.listModels();
      return {
        type: 'local',
        available: true,
        models: models.map((m) => this.toModelInfo(m)),
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return { type: 'local', available: false, error: error.message };
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }
    const data = (await response.json()) as OllamaTagsResponse;
    return data.models || [];
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some((m) => m.name === modelName || m.name.startsWith(modelName.split(':')[0]));
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string, onProgress?: (status: string) => void): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = new TextDecoder().decode(value);
      const lines = text.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.status && onProgress) {
            onProgress(data.status);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * Chat completion
   */
  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    const start = Date.now();
    const model = request.model || 'brittney-qwen-v23:latest';

    const requestBody = {
      model,
      messages: request.messages,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxTokens ?? 2048,
      },
      stream: false,
    };

    console.log(`[Ollama] Chat request:`, {
      url: `${this.baseUrl}/api/chat`,
      model,
      messageCount: request.messages.length
    });

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unable to read error response');
      console.error(`[Ollama] Chat failed:`, {
        status: response.status,
        statusText: response.statusText,
        url: `${this.baseUrl}/api/chat`,
        model,
        errorBody
      });
      throw new Error(`Ollama chat failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;

    return {
      id: `ollama_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content: data.message?.content || data.response || '',
      model,
      provider: 'local',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      latencyMs: Date.now() - start,
    };
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(request: InferenceRequest): AsyncGenerator<StreamChunk> {
    const model = request.model || 'brittney-qwen-v23:latest';

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: request.messages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 2048,
        },
        stream: true,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Ollama stream failed: ${response.status}`);
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
      const lines = text.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            yield { content: data.message.content, done: false };
          }
          if (data.done) {
            yield { content: '', done: true };
            return;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    yield { content: '', done: true };
  }

  /**
   * Generate embeddings
   */
  async embeddings(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Embeddings failed: ${response.status}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  }

  /**
   * Convert Ollama model to ModelInfo
   */
  private toModelInfo(model: OllamaModel): ModelInfo {
    const isBrittney = model.name.toLowerCase().includes('brittney');

    return {
      name: model.name,
      displayName: model.name.split(':')[0],
      provider: 'local',
      size: model.size,
      quantization: model.details?.quantization_level,
      capabilities: isBrittney ? ['chat', 'code', 'holoscript'] : ['chat', 'code'],
      isLocal: true,
      isDownloaded: true,
    };
  }
}
