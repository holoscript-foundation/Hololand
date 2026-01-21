/**
 * Brittney Local Inference Engine
 *
 * Uses node-llama-cpp to run GGUF models locally.
 * Designed for the Brittney model but works with any compatible GGUF.
 */

import { ChatMessage, ChatRequest, ChatResponse } from './server.js';
import { BrittneyConfig } from './config.js';

// =============================================================================
// Types
// =============================================================================

interface LlamaContext {
  // node-llama-cpp types will be imported at runtime
  model: any;
  context: any;
  session: any;
}

// =============================================================================
// Inference Engine
// =============================================================================

export class BrittneyInference {
  private config: BrittneyConfig;
  private llama: LlamaContext | null = null;
  private loading = false;

  constructor(config: BrittneyConfig) {
    this.config = config;
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return this.llama !== null;
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): { modelSize: number; contextSize: number } | null {
    if (!this.llama) return null;

    return {
      modelSize: 0, // Will be populated when model is loaded
      contextSize: 0,
    };
  }

  /**
   * Load the model
   */
  async load(): Promise<void> {
    if (this.llama || this.loading) return;

    this.loading = true;

    try {
      // Dynamic import to handle optional dependency
      const { getLlama, LlamaChatSession } = await import('node-llama-cpp');

      console.log('[✱brittney] Loading model...');
      console.log('[✱brittney] Model path:', this.config.modelPath);
      
      // Let node-llama-cpp choose the best settings
      const llama = await getLlama();
      
      const model = await llama.loadModel({
        modelPath: this.config.modelPath,
      });

      // Use smaller context to reduce memory usage
      const context = await model.createContext({
        contextSize: Math.min(this.config.contextSize || 4096, 2048),
      });

      const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
      });

      this.llama = { model, context, session };
      console.log(`[✱brittney] Model loaded successfully: ${this.config.modelName}`);
    } catch (error: any) {
      console.error('[✱brittney] Failed to load model:', error.message);
      console.log('[✱brittney] Running in mock mode (no local inference)');
      // Continue without model - will use mock responses or cloud
    } finally {
      this.loading = false;
    }
  }

  /**
   * Unload the model
   */
  async unload(): Promise<void> {
    if (!this.llama) return;

    try {
      await this.llama.model.dispose();
      this.llama = null;
      console.log('[✱brittney] Model unloaded');
    } catch (error: any) {
      console.error('[✱brittney] Error unloading model:', error.message);
    }
  }

  /**
   * Chat completion
   */
  async chat(messages: ChatMessage[], request: ChatRequest): Promise<ChatResponse> {
    const id = `brit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!this.llama) {
      // Mock response when model isn't loaded
      return this.mockChat(messages, id);
    }

    try {
      // Build prompt from messages
      const prompt = this.buildPrompt(messages);

      // Generate response
      const response = await this.llama.session.prompt(prompt, {
        maxTokens: request.maxTokens || 2048,
        temperature: request.temperature || 0.7,
      });

      return {
        id,
        content: response,
        model: this.config.modelName,
        provider: 'local',
        usage: {
          promptTokens: Math.ceil(prompt.length / 4),
          completionTokens: Math.ceil(response.length / 4),
          totalTokens: Math.ceil((prompt.length + response.length) / 4),
        },
      };
    } catch (error: any) {
      console.error('[✱brittney] Inference error:', error.message);
      return this.mockChat(messages, id);
    }
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(
    messages: ChatMessage[],
    request: ChatRequest
  ): AsyncGenerator<{ content: string; done: boolean }> {
    if (!this.llama) {
      // Mock streaming
      const mockResponse = await this.mockChat(messages, 'stream');
      const words = mockResponse.content.split(' ');
      for (const word of words) {
        yield { content: word + ' ', done: false };
        await new Promise((r) => setTimeout(r, 50));
      }
      yield { content: '', done: true };
      return;
    }

    try {
      const prompt = this.buildPrompt(messages);

      // Use streaming API
      const stream = await this.llama.session.promptStreaming(prompt, {
        maxTokens: request.maxTokens || 2048,
        temperature: request.temperature || 0.7,
      });

      for await (const chunk of stream) {
        yield { content: chunk, done: false };
      }
      yield { content: '', done: true };
    } catch (error: any) {
      console.error('[✱brittney] Streaming error:', error.message);
      yield { content: `Error: ${error.message}`, done: true };
    }
  }

  /**
   * Build prompt from messages
   */
  private buildPrompt(messages: ChatMessage[]): string {
    // ChatML format (works with most models)
    return messages
      .map((m) => {
        switch (m.role) {
          case 'system':
            return `<|im_start|>system\n${m.content}<|im_end|>`;
          case 'user':
            return `<|im_start|>user\n${m.content}<|im_end|>`;
          case 'assistant':
            return `<|im_start|>assistant\n${m.content}<|im_end|>`;
        }
      })
      .join('\n') + '\n<|im_start|>assistant\n';
  }

  /**
   * Mock response when model isn't available
   */
  private async mockChat(messages: ChatMessage[], id: string): Promise<ChatResponse> {
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage?.content || '';

    // Provide helpful response based on keywords
    let content = '';

    if (userMessage.toLowerCase().includes('error')) {
      content = `I see you're encountering an error. Here's what I can suggest:

1. **Check the console logs** for the full stack trace
2. **Verify your HoloScript syntax** - common issues include missing brackets or typos
3. **Check component references** - ensure all referenced objects exist in the scene

Would you like me to analyze specific error details? Share the error message and I'll provide more targeted help.

*Note: Running without local model. For full AI analysis, ensure Brittney.GGUF is downloaded.*`;
    } else if (userMessage.toLowerCase().includes('performance') || userMessage.toLowerCase().includes('fps')) {
      content = `Here are common performance optimization tips for Hololand:

1. **Reduce draw calls** - Use instancing for repeated objects
2. **Lower triangle count** - Use LOD (Level of Detail) for distant objects
3. **Optimize textures** - Use compressed formats and appropriate resolutions
4. **Batch materials** - Fewer unique materials = better performance

For specific analysis, I'd need the current profiler stats.

*Note: Running without local model. For detailed AI analysis, ensure Brittney.GGUF is downloaded.*`;
    } else if (userMessage.toLowerCase().includes('holoscript')) {
      content = `HoloScript is Hololand's spatial programming language. Here's a quick example:

\`\`\`holoscript
world "My Scene" {
  entity "cube" {
    position: [0, 1, 0]
    scale: [1, 1, 1]
    material: { color: "blue" }
  }
}
\`\`\`

Key concepts:
- **world** - The root container for your scene
- **entity** - Objects in 3D space
- **traits** - Behaviors attached to entities

Would you like examples of specific HoloScript features?`;
    } else {
      content = `I'm Brittney, your Hololand development assistant. I can help with:

- 🎮 **HoloScript** - Writing and debugging spatial code
- 🔧 **Performance** - Optimizing your VR/AR experiences
- 🐛 **Debugging** - Understanding and fixing errors
- 📚 **Learning** - Explaining Hololand concepts

What would you like help with?

*Note: Running without local model. Download Brittney.GGUF for full offline AI capabilities.*`;
    }

    return {
      id,
      content,
      model: 'brittney-mock',
      provider: 'local',
      usage: {
        promptTokens: Math.ceil(userMessage.length / 4),
        completionTokens: Math.ceil(content.length / 4),
        totalTokens: Math.ceil((userMessage.length + content.length) / 4),
      },
    };
  }
}
