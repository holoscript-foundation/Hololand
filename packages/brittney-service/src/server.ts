/**
 * Brittney Service - Local AI Assistant for Hololand
 *
 * Runs a local GGUF model that both the Hololand app and IDE tools can connect to.
 * Provides free, private AI assistance without requiring API keys.
 *
 * Architecture:
 * ┌─────────────────┐     ┌─────────────────┐
 * │ Hololand App    │────►│                 │
 * │ (Browser)       │     │   Brittney      │
 * └─────────────────┘     │   Service       │
 *                         │   :11435        │
 * ┌─────────────────┐     │                 │
 * │ MCP Server      │────►│   ┌───────────┐ │
 * │ (IDE Tools)     │     │   │ Brittney  │ │
 * └─────────────────┘     │   │ .GGUF     │ │
 *                         │   └───────────┘ │
 * ┌─────────────────┐     │                 │
 * │ CLI             │────►│   Optional:     │
 * │ (Terminal)      │     │   Cloud LLM     │
 * └─────────────────┘     └─────────────────┘
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { BrittneyInference } from './inference.js';
import { CloudProvider } from './cloud-provider.js';
import { BrittneyConfig, loadConfig } from './config.js';

const PORT = process.env.BRITTNEY_PORT || 11435;
const HOST = process.env.BRITTNEY_HOST || 'localhost';

// =============================================================================
// Types
// =============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: BrittneyContext;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface BrittneyContext {
  // Browser context from Hololand app
  browserState?: {
    url: string;
    scenes: Array<{ id: string; name: string; objectCount: number }>;
    profilerStats?: { fps: number; drawCalls: number; triangles: number };
    consoleLogs?: Array<{ level: string; message: string }>;
    errors?: Array<{ message: string; stack?: string }>;
  };
  // Code context from IDE
  codeContext?: {
    file?: string;
    selection?: string;
    diagnostics?: Array<{ message: string; line: number }>;
  };
  // HoloScript context
  holoScriptContext?: {
    currentScene?: string;
    recentCommands?: string[];
  };
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  provider: 'local' | 'openai' | 'anthropic' | 'azure' | 'google';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// =============================================================================
// Server
// =============================================================================

export class BrittneyServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private inference: BrittneyInference;
  private cloudProvider: CloudProvider | null = null;
  private config: BrittneyConfig;
  private clients: Set<WebSocket> = new Set();

  constructor(config: BrittneyConfig) {
    this.config = config;
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server, path: '/ws' });
    this.inference = new BrittneyInference(config);

    if (config.cloudProvider && config.cloudApiKey) {
      this.cloudProvider = new CloudProvider(config);
    }

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    this.app.use(
      cors({
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://hololand.io',
          'chrome-extension://*',
        ],
      })
    );
    this.app.use(express.json({ limit: '10mb' }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '1.0.0',
        model: this.config.modelName,
        modelLoaded: this.inference.isLoaded(),
        cloudConfigured: !!this.cloudProvider,
      });
    });

    // Chat completion (OpenAI-compatible)
    this.app.post('/v1/chat/completions', async (req, res) => {
      try {
        const request: ChatRequest = req.body;
        const response = await this.chat(request);

        // OpenAI-compatible response format
        res.json({
          id: response.id,
          object: 'chat.completion',
          created: Date.now(),
          model: response.model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: response.content,
              },
              finish_reason: 'stop',
            },
          ],
          usage: response.usage,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Brittney-specific chat endpoint
    this.app.post('/chat', async (req, res) => {
      try {
        const request: ChatRequest = req.body;
        const response = await this.chat(request);
        res.json(response);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Streaming chat
    this.app.post('/chat/stream', async (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const request: ChatRequest = req.body;
        request.stream = true;

        for await (const chunk of this.chatStream(request)) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error: any) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    });

    // Context-aware endpoints for specific use cases
    this.app.post('/explain-error', async (req, res) => {
      try {
        const { error, context } = req.body;
        const response = await this.explainError(error, context);
        res.json(response);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/suggest-fix', async (req, res) => {
      try {
        const { issue, context } = req.body;
        const response = await this.suggestFix(issue, context);
        res.json(response);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/analyze-performance', async (req, res) => {
      try {
        const { stats, focus } = req.body;
        const response = await this.analyzePerformance(stats, focus);
        res.json(response);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Model management
    this.app.get('/model/status', (req, res) => {
      res.json({
        loaded: this.inference.isLoaded(),
        name: this.config.modelName,
        path: this.config.modelPath,
        memoryUsage: this.inference.getMemoryUsage(),
      });
    });

    this.app.post('/model/load', async (req, res) => {
      try {
        await this.inference.load();
        res.json({ success: true, message: 'Model loaded' });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/model/unload', async (req, res) => {
      try {
        await this.inference.unload();
        res.json({ success: true, message: 'Model unloaded' });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Config endpoints
    this.app.get('/config', (req, res) => {
      res.json({
        modelName: this.config.modelName,
        cloudProvider: this.config.cloudProvider,
        preferCloud: this.config.preferCloud,
        // Don't expose API keys
      });
    });

    this.app.put('/config', async (req, res) => {
      try {
        const updates = req.body;
        Object.assign(this.config, updates);

        // Reinitialize cloud provider if changed
        if (updates.cloudProvider || updates.cloudApiKey) {
          this.cloudProvider =
            this.config.cloudProvider && this.config.cloudApiKey
              ? new CloudProvider(this.config)
              : null;
        }

        res.json({ success: true, config: this.config });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[Brittney] Client connected (${this.clients.size} total)`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(ws, message);
        } catch (error: any) {
          ws.send(JSON.stringify({ error: error.message }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[Brittney] Client disconnected (${this.clients.size} total)`);
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: 'connected',
          version: '1.0.0',
          modelLoaded: this.inference.isLoaded(),
        })
      );
    });
  }

  private async handleWebSocketMessage(ws: WebSocket, message: any): Promise<void> {
    switch (message.type) {
      case 'chat':
        const response = await this.chat(message.data);
        ws.send(JSON.stringify({ type: 'chat-response', id: message.id, data: response }));
        break;

      case 'chat-stream':
        for await (const chunk of this.chatStream(message.data)) {
          ws.send(JSON.stringify({ type: 'chat-chunk', id: message.id, data: chunk }));
        }
        ws.send(JSON.stringify({ type: 'chat-done', id: message.id }));
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        ws.send(JSON.stringify({ error: `Unknown message type: ${message.type}` }));
    }
  }

  // =============================================================================
  // Chat Methods
  // =============================================================================

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const systemPrompt = this.buildSystemPrompt(request.context);
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.messages,
    ];

    // Decide whether to use local or cloud
    const useCloud = this.shouldUseCloud(request);

    if (useCloud && this.cloudProvider) {
      return await this.cloudProvider.chat(messagesWithSystem, request);
    }

    return await this.inference.chat(messagesWithSystem, request);
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<{ content: string; done: boolean }> {
    const systemPrompt = this.buildSystemPrompt(request.context);
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.messages,
    ];

    const useCloud = this.shouldUseCloud(request);

    if (useCloud && this.cloudProvider) {
      yield* this.cloudProvider.chatStream(messagesWithSystem, request);
    } else {
      yield* this.inference.chatStream(messagesWithSystem, request);
    }
  }

  private shouldUseCloud(request: ChatRequest): boolean {
    if (!this.cloudProvider) return false;
    if (this.config.preferCloud) return true;

    // Use cloud for large context that local model can't handle
    const totalTokens = this.estimateTokens(request.messages);
    const localContextLimit = 8192; // Typical for small models

    if (totalTokens > localContextLimit) {
      console.log(`[Brittney] Context too large (${totalTokens} tokens), using cloud`);
      return true;
    }

    return false;
  }

  private estimateTokens(messages: ChatMessage[]): number {
    // Rough estimate: 4 chars per token
    return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  }

  private buildSystemPrompt(context?: BrittneyContext): string {
    let prompt = `You are Brittney, an AI assistant specialized in Hololand and HoloScript development.

You help users:
- Build VR/AR experiences with HoloScript
- Debug 3D scenes and performance issues
- Understand the Hololand ecosystem
- Write and optimize HoloScript code

Be concise, helpful, and specific. When suggesting code, use HoloScript syntax.`;

    if (context?.browserState) {
      prompt += `\n\n## Current Browser State
URL: ${context.browserState.url}
Scenes: ${JSON.stringify(context.browserState.scenes)}`;

      if (context.browserState.profilerStats) {
        const stats = context.browserState.profilerStats;
        prompt += `\nPerformance: ${stats.fps} FPS, ${stats.drawCalls} draw calls, ${stats.triangles} triangles`;
      }

      if (context.browserState.errors?.length) {
        prompt += `\nErrors: ${JSON.stringify(context.browserState.errors)}`;
      }
    }

    if (context?.codeContext) {
      prompt += `\n\n## Current Code Context
File: ${context.codeContext.file || 'unknown'}`;

      if (context.codeContext.selection) {
        prompt += `\nSelected code:\n\`\`\`\n${context.codeContext.selection}\n\`\`\``;
      }

      if (context.codeContext.diagnostics?.length) {
        prompt += `\nDiagnostics: ${JSON.stringify(context.codeContext.diagnostics)}`;
      }
    }

    return prompt;
  }

  // =============================================================================
  // Specialized Methods
  // =============================================================================

  async explainError(
    error: { message: string; stack?: string },
    context?: BrittneyContext
  ): Promise<ChatResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `Explain this error and suggest how to fix it:

Error: ${error.message}
${error.stack ? `Stack trace:\n${error.stack}` : ''}

Provide:
1. What this error means
2. Why it likely happened
3. How to fix it
4. How to prevent it in the future`,
      },
    ];

    return this.chat({ messages, context });
  }

  async suggestFix(issue: string, context?: BrittneyContext): Promise<ChatResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `I'm experiencing this issue: ${issue}

Based on the current state of my Hololand app, suggest specific code changes to fix this.
Include the exact file and code to modify.`,
      },
    ];

    return this.chat({ messages, context });
  }

  async analyzePerformance(
    stats: { fps: number; drawCalls: number; triangles: number; memoryUsed: number },
    focus?: string
  ): Promise<ChatResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `Analyze my Hololand app's performance and suggest optimizations.

Current metrics:
- FPS: ${stats.fps}
- Draw calls: ${stats.drawCalls}
- Triangles: ${stats.triangles.toLocaleString()}
- Memory: ${Math.round(stats.memoryUsed / 1024 / 1024)}MB

${focus ? `Focus area: ${focus}` : 'Analyze all areas.'}

Provide specific, actionable recommendations.`,
      },
    ];

    return this.chat({ messages });
  }

  // =============================================================================
  // Lifecycle
  // =============================================================================

  async start(): Promise<void> {
    // Load model
    console.log('[Brittney] Loading model...');
    await this.inference.load();
    console.log('[Brittney] Model loaded');

    // Start server
    return new Promise((resolve) => {
      this.server.listen(Number(PORT), HOST, () => {
        console.log(`[Brittney] Service running at http://${HOST}:${PORT}`);
        console.log('[Brittney] WebSocket at ws://${HOST}:${PORT}/ws');
        console.log('[Brittney] Ready to assist!');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    console.log('[Brittney] Shutting down...');

    // Close WebSocket connections
    for (const client of this.clients) {
      client.close();
    }

    // Unload model
    await this.inference.unload();

    // Close server
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('[Brittney] Stopped');
        resolve();
      });
    });
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const config = await loadConfig();
  const server = new BrittneyServer(config);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  await server.start();
}

main().catch((error) => {
  console.error('[Brittney] Fatal error:', error);
  process.exit(1);
});
