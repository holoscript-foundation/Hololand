/**
 * Brittney Cloud Provider
 *
 * Connects to the managed Brittney Cloud API for inference
 * (https://api.brittney.ai/v1/inference)
 */

import type {
  InferenceRequest,
  InferenceResponse,
  ProviderStatus,
  StreamChunk,
} from '../types.js';

export interface BrittneyCloudConfig {
  apiKey: string;
  apiUrl?: string;
  timeout?: number;
}

interface BrittneyCloudResponse {
  id?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class BrittneyCloudProvider {
  private config: Required<BrittneyCloudConfig>;

  constructor(config: BrittneyCloudConfig) {
    this.config = {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || 'https://api.brittney.ai/v1',
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Run inference via Brittney Cloud API
   */
  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.config.apiUrl}/inference`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: this.formatMessages(request.messages),
          model: request.model || 'brittney-qwen-v23',
          max_tokens: request.maxTokens || 2048,
          temperature: request.temperature || 0.7,
          stream: false,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Brittney Cloud API error (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as BrittneyCloudResponse;

      // Transform Brittney Cloud API response to InferenceResponse format
      const content = data.choices?.[0]?.message?.content || '';

      return {
        id: data.id || `brittney_cloud_${Date.now()}`,
        content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: request.model || 'brittney-qwen-v23',
        provider: 'brittney-cloud',
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error('[BrittneyCloud] Inference failed:', error.message);
      throw error;
    }
  }

  /**
   * Stream inference via Brittney Cloud API
   * TODO: Implement WebSocket streaming
   */
  async *stream(request: InferenceRequest): AsyncGenerator<StreamChunk> {
    // For now, fall back to regular chat and yield as single chunk
    const response = await this.chat(request);
    yield {
      content: response.content,
      done: true,
    };
  }

  async *chatStream(request: InferenceRequest): AsyncGenerator<StreamChunk> {
    yield* this.stream(request);
  }

  async getStatus(): Promise<ProviderStatus> {
    const start = Date.now();
    try {
      const available = await this.isAvailable();
      return {
        type: 'brittney-cloud',
        available,
        latencyMs: Date.now() - start,
        error: available ? undefined : 'Brittney Cloud API unavailable',
      };
    } catch (error: any) {
      return {
        type: 'brittney-cloud',
        available: false,
        latencyMs: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * Check if Brittney Cloud API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Format messages array to single prompt
   */
  private formatMessages(messages: Array<{ role: string; content: string }>): string {
    return messages
      .map((msg) => {
        if (msg.role === 'system') {
          return `System: ${msg.content}\n\n`;
        } else if (msg.role === 'user') {
          return `User: ${msg.content}\n\n`;
        } else {
          return `Assistant: ${msg.content}\n\n`;
        }
      })
      .join('');
  }
}
