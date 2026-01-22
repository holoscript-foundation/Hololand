/**
 * Local Inference using bundled GGUF model
 * 
 * Uses node-llama-cpp for native inference.
 * Model is bundled with Tauri/mobile app.
 */

import type { InferenceProvider, ChatRequest, ChatResponse, StreamCallback, ChatMessage } from '../types';

export interface LocalInferenceConfig {
  /** Path to GGUF model file */
  modelPath: string;
  /** Context window size (default: 2048) */
  contextSize?: number;
  /** Number of threads (default: auto) */
  threads?: number;
  /** GPU layers to offload (default: 0) */
  gpuLayers?: number;
}

/**
 * Local GGUF inference provider
 * Ships with the app - no internet required
 */
export class LocalInference implements InferenceProvider {
  readonly name = 'local-gguf';
  
  private config: LocalInferenceConfig;
  private llama: any = null;
  private model: any = null;
  private context: any = null;
  private ready = false;

  constructor(config: LocalInferenceConfig) {
    this.config = {
      contextSize: 2048,
      threads: 0, // Auto-detect
      gpuLayers: 0,
      ...config,
    };
  }

  async isReady(): Promise<boolean> {
    return this.ready;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;

    try {
      // Dynamic import for node-llama-cpp
      const { getLlama, LlamaChatSession: _LlamaChatSession } = await import('node-llama-cpp');
      
      console.log('[Brittney] Initializing local inference...');
      console.log(`[Brittney] Model: ${this.config.modelPath}`);
      
      // Get llama instance
      this.llama = await getLlama();
      
      // Load model
      this.model = await this.llama.loadModel({
        modelPath: this.config.modelPath,
        gpuLayers: this.config.gpuLayers,
      });
      
      // Create context
      this.context = await this.model.createContext({
        contextSize: this.config.contextSize,
        threads: this.config.threads || undefined,
      });
      
      this.ready = true;
      console.log('[Brittney] Local inference ready!');
      
    } catch (error: any) {
      console.error('[Brittney] Failed to initialize local inference:', error.message);
      throw error;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.ready) {
      await this.initialize();
    }

    const { LlamaChatSession } = await import('node-llama-cpp');
    
    const session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
      systemPrompt: this.extractSystemPrompt(request.messages),
    });

    const userMessage = this.extractLastUserMessage(request.messages);
    
    const response = await session.prompt(userMessage, {
      maxTokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
    });

    return {
      id: `local_${Date.now()}`,
      content: response,
      model: 'brittney-f16',
      usage: {
        promptTokens: 0, // Not available from node-llama-cpp
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason: 'stop',
    };
  }

  async chatStream(request: ChatRequest, callback: StreamCallback): Promise<void> {
    if (!this.ready) {
      await this.initialize();
    }

    const { LlamaChatSession } = await import('node-llama-cpp');
    
    const session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
      systemPrompt: this.extractSystemPrompt(request.messages),
    });

    const userMessage = this.extractLastUserMessage(request.messages);
    
    await session.prompt(userMessage, {
      maxTokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      onTextChunk: (chunk: string) => {
        callback(chunk, false);
      },
    });
    
    callback('', true);
  }

  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
    if (this.model) {
      await this.model.dispose();
      this.model = null;
    }
    this.ready = false;
    console.log('[Brittney] Local inference disposed');
  }

  private extractSystemPrompt(messages: ChatMessage[]): string {
    const systemMsg = messages.find(m => m.role === 'system');
    return systemMsg?.content ?? 'You are Brittney, the AI assistant for HoloScript world building.';
  }

  private extractLastUserMessage(messages: ChatMessage[]): string {
    const userMsgs = messages.filter(m => m.role === 'user');
    return userMsgs[userMsgs.length - 1]?.content ?? '';
  }
}
