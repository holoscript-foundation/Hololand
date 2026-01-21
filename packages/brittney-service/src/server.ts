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
import path from 'path';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { BrittneyInference } from './inference.js';
import { CloudProvider } from './cloud-provider.js';
import { BrittneyConfig, loadConfig, getAssetsDir } from './config.js';
import { getEnhancedSystemPrompt, buildRAGPrompt } from './holoscript-knowledge.js';
import { ModelRouter, RoutingHints, RouteDecision, Platform, RequestType } from './model-router.js';
import { tracer, RouteTrace } from './tracing.js';
import { boostPrompt, BoosterConfig, DEFAULT_BOOSTER_CONFIG } from './prompt-booster.js';
import { KnowledgePipeline, getKnowledgePipeline } from './knowledge-pipeline.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // Dynamic routing hints
  routing?: {
    platform?: Platform;
    type?: RequestType;
    maxLatency?: number;
    preferQuality?: boolean;
    preferCost?: boolean;
    forceProvider?: string;
  };
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
    // Spatial awareness of holograms in the scene
    holograms?: Array<{
      id: string;
      type: string;
      position?: { x: number; y: number; z: number };
      traits?: string[];
    }>;
  };
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  provider: 'local' | 'openai' | 'anthropic' | 'azure' | 'google' | 'grok';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  // Routing decision info
  routing?: {
    reason: string;
    latencyMs?: number;
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
  private cloudProviders: Map<string, CloudProvider> = new Map();
  private modelRouter: ModelRouter;
  private config: BrittneyConfig;
  private clients: Set<WebSocket> = new Set();
  private knowledgePipeline: KnowledgePipeline;

  constructor(config: BrittneyConfig) {
    this.config = config;
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server, path: '/ws' });
    this.inference = new BrittneyInference(config);

    // Initialize model router with available API keys
    this.modelRouter = new ModelRouter(config.apiKeys);

    // Initialize default cloud provider
    if (config.cloudProvider && config.cloudApiKey) {
      this.cloudProvider = new CloudProvider(config);
      this.cloudProviders.set(config.cloudProvider, this.cloudProvider);
    }

    // Pre-initialize all available providers for faster routing
    this.initializeAllProviders();

    // Initialize knowledge pipeline for RAG and network training
    this.knowledgePipeline = getKnowledgePipeline();
    this.knowledgePipeline.initialize().catch(err => {
      console.warn('[✱brittney] Knowledge pipeline initialization warning:', err.message);
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Pre-initialize all configured providers for faster dynamic routing
   */
  private async initializeAllProviders(): Promise<void> {
    type ApiKeyName = 'grok' | 'openai' | 'anthropic' | 'google' | 'azure';
    const providers: Array<{ key: ApiKeyName; provider: string }> = [
      { key: 'grok', provider: 'grok' },
      { key: 'openai', provider: 'openai' },
      { key: 'anthropic', provider: 'anthropic' },
      { key: 'google', provider: 'google' },
      { key: 'azure', provider: 'azure' },
    ];

    for (const { key, provider } of providers) {
      const apiKey = this.config.apiKeys?.[key];
      if (apiKey && !this.cloudProviders.has(provider)) {
        try {
          const providerConfig = this.getProviderConfig(provider, apiKey);
          const cloudProvider = new CloudProvider(providerConfig);
          this.cloudProviders.set(provider, cloudProvider);
          console.log(`[✱brittney] Pre-initialized ${provider} provider for dynamic routing`);
        } catch (error: any) {
          console.warn(`[✱brittney] Failed to pre-initialize ${provider}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Get provider-specific config
   */
  private getProviderConfig(provider: string, apiKey: string): BrittneyConfig {
    const endpoints: Record<string, string | undefined> = {
      openai: 'https://api.openai.com/v1',
      grok: 'https://api.x.ai/v1',
      google: 'https://generativelanguage.googleapis.com/v1beta/openai',
      azure: this.config.providerEndpoints?.azure,
    };

    const models: Record<string, string> = {
      openai: 'gpt-4o',
      grok: 'grok-3',
      google: 'gemini-2.0-flash',
      anthropic: 'claude-sonnet-4-20250514',
      azure: 'gpt-4o',
    };

    return {
      ...this.config,
      cloudProvider: provider as any,
      cloudApiKey: apiKey,
      cloudEndpoint: endpoints[provider],
      cloudModel: models[provider],
    };
  }

  private setupMiddleware(): void {
    this.app.use(
      cors({
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:11435',
          'https://hololand.io',
          'chrome-extension://*',
        ],
      })
    );
    this.app.use(express.json({ limit: '10mb' }));
    
    // Security middleware: Check if request is authenticated for cloud operations
    this.app.use((req: any, res, next) => {
      // Extract auth token from header or query
      const authHeader = req.headers.authorization || req.query.auth;
      const token = authHeader?.replace('Bearer ', '');
      
      // Attach auth info to request
      req.isAuthenticated = token === this.config.adminApiKey && !!this.config.adminApiKey;
      req.disallowPublicCloud = this.config.disallowPublicCloudAccess && !req.isAuthenticated;
      
      next();
    });
    
    // Serve static files for chat UI
    const publicPath = path.join(__dirname, '..', 'public');
    this.app.use(express.static(publicPath));

    // Serve 3D assets from ~/.hololand/assets/models
    const assetsPath = getAssetsDir();
    if (existsSync(assetsPath)) {
      this.app.use('/assets/models', express.static(assetsPath));
      console.log(`[✱brittney] Serving 3D assets from ${assetsPath}`);
    }
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

    // Redirect root to chat UI
    this.app.get('/', (req, res) => {
      res.redirect('/chat.html');
    });

    // Chat completion (OpenAI-compatible)
    this.app.post('/v1/chat/completions', async (req: any, res) => {
      try {
        // Block cloud access if disallowed
        if (req.disallowPublicCloud && this.config.preferCloud) {
          return res.status(403).json({
            error: 'Cloud API access is disabled for public users. Contact administrator for credentials.',
            hint: 'Use local Ollama endpoint instead: http://localhost:11434/v1/chat/completions'
          });
        }
        
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
    this.app.post('/chat', async (req: any, res) => {
      try {
        // Block cloud access if disallowed
        if (req.disallowPublicCloud && this.config.preferCloud) {
          return res.status(403).json({
            error: 'Cloud API access is disabled for public users. Contact administrator for credentials.',
            hint: 'Use local Ollama endpoint instead'
          });
        }
        
        const request: ChatRequest = req.body;
        const response = await this.chat(request);
        res.json(response);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Streaming chat
    this.app.post('/chat/stream', async (req: any, res) => {
      // Block cloud access if disallowed
      if (req.disallowPublicCloud && this.config.preferCloud) {
        res.status(403).json({
          error: 'Cloud API access is disabled for public users. Contact administrator for credentials.',
          hint: 'Use local Ollama endpoint instead'
        });
        return;
      }
      
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
        // Don't expose API keys, but show which are configured
        configuredProviders: Object.entries(this.config.apiKeys || {})
          .filter(([_, key]) => key && key.length > 0)
          .map(([provider]) => provider),
      });
    });

    // List available providers (those with API keys configured)
    this.app.get('/providers', (req, res) => {
      const providers = Object.entries(this.config.apiKeys || {})
        .filter(([_, key]) => key && key.length > 0)
        .map(([provider]) => ({
          id: provider,
          active: provider === this.config.cloudProvider,
          hasKey: true,
          initialized: this.cloudProviders.has(provider),
        }));

      res.json({
        active: this.config.cloudProvider,
        available: providers,
        preferCloud: this.config.preferCloud,
        dynamicRouting: true,
      });
    });

    // Get routing stats and configuration
    this.app.get('/routing', (req, res) => {
      const stats = this.modelRouter.getStats();
      res.json({
        enabled: true,
        availableProviders: stats.availableProviders,
        recordedLatencies: stats.latencies,
        initializedProviders: [...this.cloudProviders.keys()],
        tiers: {
          fast: 'Simple queries, VR/AR, mobile - Gemini Flash, GPT-4o-mini',
          balanced: 'HoloScript generation, code - GPT-4o, Claude Sonnet 4',
          quality: 'Complex reasoning, debugging - Claude Sonnet 4.5, GPT-4o',
        },
      });
    });

    // 3D Asset Manifest
    this.app.get('/assets/manifest', (req, res) => {
      const assetsPath = getAssetsDir();
      const assets: Array<{ name: string; url: string; type: string }> = [];

      if (existsSync(assetsPath)) {
        try {
          const files = readdirSync(assetsPath);
          files.forEach(file => {
            if (file.endsWith('.glb') || file.endsWith('.gltf')) {
              const name = path.parse(file).name.toLowerCase();
              assets.push({
                name,
                url: `/assets/models/${file}`,
                type: file.endsWith('.glb') ? 'glb' : 'gltf'
              });
            }
          });
        } catch (error) {
          console.error('[✱brittney] Failed to read assets directory:', error);
        }
      }

      res.json({
        count: assets.length,
        base_url: `http://${HOST}:${PORT}`,
        assets
      });
    });

    // Test routing decision without executing
    this.app.post('/routing/test', (req, res) => {
      const { content, platform, type, maxLatency, preferQuality, preferCost } = req.body;
      
      const route = this.modelRouter.route(content || '', {
        platform,
        type,
        maxLatency,
        preferQuality,
        preferCost,
      });

      res.json({
        decision: route,
        wouldUse: {
          provider: route.provider,
          model: route.model,
        },
        fallbacks: route.fallbacks,
        reason: route.reason,
      });
    });

    // =============================================================================
    // Tracing Endpoints
    // =============================================================================

    // Get tracing summary
    this.app.get('/tracing', (req, res) => {
      const summary = tracer.getSummary();
      res.json(summary);
    });

    // Get recent traces
    this.app.get('/tracing/traces', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 100;
      const traces = tracer.getTraces(limit);
      res.json({ count: traces.length, traces });
    });

    // Get provider metrics
    this.app.get('/tracing/metrics', (req, res) => {
      const metrics = tracer.getProviderMetrics();
      res.json({ providers: metrics });
    });

    // Get OTLP export status
    this.app.get('/tracing/otlp', (req, res) => {
      const status = tracer.getOtlpStatus();
      res.json(status);
    });

    // Force flush traces to OTLP
    this.app.post('/tracing/flush', async (req, res) => {
      try {
        await tracer.flush();
        res.json({ success: true, message: 'Traces flushed to OTLP' });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Export traces
    this.app.get('/tracing/export', (req, res) => {
      const format = (req.query.format as 'json' | 'otlp') || 'json';
      const data = tracer.exportTraces(format);
      
      if (format === 'otlp') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=brittney-traces.otlp.json');
      }
      
      res.send(data);
    });

    // Clear traces
    this.app.delete('/tracing', (req, res) => {
      tracer.clear();
      res.json({ success: true, message: 'Traces cleared' });
    });

    // Switch active provider (ADMIN ONLY)
    this.app.post('/providers/:provider', async (req: any, res) => {
      // Require authentication to switch providers
      if (req.disallowPublicCloud) {
        return res.status(401).json({ 
          error: 'Authentication required to switch providers',
          hint: 'Include Authorization: Bearer <admin-key> header'
        });
      }
      
      const provider = req.params.provider as any;
      const validProviders = ['openai', 'anthropic', 'azure', 'google', 'grok', 'gemini'];

      if (!validProviders.includes(provider)) {
        return res.status(400).json({ error: `Invalid provider: ${provider}` });
      }

      // Handle gemini as alias for google (bidirectional)
      const normalizedProvider = provider === 'gemini' ? 'google' : provider;
      
      // Look for API key - try both google and gemini for Google/Gemini provider
      let apiKey: string | undefined;
      if (provider === 'google' || provider === 'gemini') {
        apiKey = this.config.apiKeys?.google || this.config.apiKeys?.gemini;
      } else {
        apiKey = this.config.apiKeys?.[provider as keyof typeof this.config.apiKeys];
      }
      
      if (!apiKey) {
        return res.status(400).json({ 
          error: `No API key configured for ${provider}`,
          hint: `Add it to apiKeys.${provider} in ~/.hololand/config.json`
        });
      }

      // Provider-specific endpoints and default models
      const providerConfig: Record<string, { endpoint?: string; defaultModel: string }> = {
        openai: { endpoint: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
        anthropic: { defaultModel: 'claude-sonnet-4-20250514' },
        azure: { endpoint: this.config.providerEndpoints?.azure, defaultModel: 'gpt-4o' },
        google: { endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-2.0-flash' },
        gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-2.0-flash' },
        grok: { endpoint: 'https://api.x.ai/v1', defaultModel: 'grok-3' },
      };

      const config = providerConfig[provider] || providerConfig[normalizedProvider];

      // Update active provider with correct endpoint
      this.config.cloudProvider = normalizedProvider as any;
      this.config.cloudApiKey = apiKey;
      this.config.cloudEndpoint = config?.endpoint;
      this.config.cloudModel = req.body?.model || config?.defaultModel || this.config.cloudModel;
      
      this.cloudProvider = new CloudProvider(this.config);
      await this.cloudProvider.waitReady();

      res.json({ 
        success: true, 
        activeProvider: provider,
        endpoint: config?.endpoint || 'default',
        model: this.config.cloudModel,
        message: `Switched to ${provider}`
      });
    });

    this.app.put('/config', async (req: any, res) => {
      try {
        // Require authentication to update config
        if (req.disallowPublicCloud) {
          return res.status(401).json({
            error: 'Authentication required to update configuration',
            hint: 'Include Authorization: Bearer <admin-key> header'
          });
        }
        
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

    // =========================================================================
    // Knowledge Pipeline Routes (Network Feature)
    // =========================================================================

    // Search knowledge base (public)
    this.app.get('/knowledge/search', async (req, res) => {
      try {
        const query = req.query.q as string;
        const limit = parseInt(req.query.limit as string) || 5;
        const categories = req.query.categories
          ? (req.query.categories as string).split(',')
          : undefined;

        if (!query) {
          return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const results = this.knowledgePipeline.search(query, { limit, categories });
        res.json({ results, count: results.length });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get RAG context for a query (public)
    this.app.get('/knowledge/rag', async (req, res) => {
      try {
        const query = req.query.q as string;
        const limit = parseInt(req.query.limit as string) || 3;

        if (!query) {
          return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const context = this.knowledgePipeline.buildRAGContext(query, limit);
        res.json({ context, hasResults: context.length > 0 });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get knowledge stats (public)
    this.app.get('/knowledge/stats', (req, res) => {
      try {
        const stats = this.knowledgePipeline.getStats();
        res.json(stats);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Contribute knowledge (requires authentication)
    this.app.post('/knowledge/contribute', async (req: any, res) => {
      try {
        // Require authentication
        if (!req.isAuthenticated) {
          return res.status(401).json({
            error: 'Authentication required to contribute knowledge',
            hint: 'Include Authorization: Bearer <client-key> header'
          });
        }

        const { category, content, keywords, source } = req.body;

        if (!category || !content || !keywords) {
          return res.status(400).json({
            error: 'Missing required fields: category, content, keywords'
          });
        }

        const result = await this.knowledgePipeline.contribute(
          { category, content, keywords, source: source || 'contributed' },
          req.clientId || 'anonymous'
        );

        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get VRAM status (requires authentication)
    this.app.get('/knowledge/vram', async (req: any, res) => {
      try {
        if (!req.isAuthenticated) {
          return res.status(401).json({
            error: 'Authentication required to check VRAM status'
          });
        }

        const status = await this.knowledgePipeline.checkVRAM();
        res.json(status);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get training queue status (admin only)
    this.app.get('/knowledge/training', async (req: any, res) => {
      try {
        if (!req.isAuthenticated) {
          return res.status(401).json({
            error: 'Authentication required to view training status'
          });
        }

        const status = this.knowledgePipeline.getTrainingQueueStatus();
        res.json(status);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Flush training queue (admin only)
    this.app.post('/knowledge/training/flush', async (req: any, res) => {
      try {
        if (!req.isAuthenticated) {
          return res.status(401).json({
            error: 'Admin authentication required to flush training queue'
          });
        }

        const result = await this.knowledgePipeline.flushTrainingQueue();
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[✱brittney] Client connected (${this.clients.size} total)`);

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
        console.log(`[✱brittney] Client disconnected (${this.clients.size} total)`);
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
    const startTime = Date.now();
    
    // Extract the last user message for RAG context and routing
    const lastUserMessage = [...request.messages].reverse().find((m) => m.role === 'user');
    const userQuery = lastUserMessage?.content || '';

    const systemPrompt = this.buildSystemPrompt(request.context, userQuery);
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.messages,
    ];

    // Use dynamic routing if hints provided, otherwise use configured provider
    if (request.routing || this.cloudProviders.size > 1) {
      return await this.chatWithRouting(messagesWithSystem, request, userQuery, startTime);
    }

    // Fallback to simple routing
    const useCloud = this.shouldUseCloud(request);

    if (useCloud && this.cloudProvider) {
      const response = await this.cloudProvider.chat(messagesWithSystem, request);
      return {
        ...response,
        routing: { reason: 'Default cloud provider', latencyMs: Date.now() - startTime },
      };
    }

    return await this.inference.chat(messagesWithSystem, request);
  }

  /**
   * Chat with intelligent model routing
   */
  private async chatWithRouting(
    messages: ChatMessage[],
    request: ChatRequest,
    userQuery: string,
    startTime: number
  ): Promise<ChatResponse> {
    // Build routing hints from request
    const hints: RoutingHints = {
      platform: request.routing?.platform,
      type: request.routing?.type,
      maxLatency: request.routing?.maxLatency,
      preferQuality: request.routing?.preferQuality,
      preferCost: request.routing?.preferCost,
      forceProvider: request.routing?.forceProvider as any,
    };

    // Get routing decision (includes trace)
    const route = this.modelRouter.route(userQuery, hints);
    const { trace } = route;
    console.log(`[✱brittney] Routing decision: ${route.provider}/${route.model} - ${route.reason}`);

    // Try the primary route
    let response: ChatResponse | null = null;
    let usedProvider = route.provider;
    let usedModel = route.model;
    let routeError: string | undefined;

    try {
      response = await this.executeWithProvider(route.provider, route.model, messages, request);
    } catch (error: any) {
      console.warn(`[✱brittney] Primary route failed (${route.provider}): ${error.message}`);
      routeError = error.message;

      // Try fallbacks
      for (const fallback of route.fallbacks) {
        try {
          console.log(`[✱brittney] Trying fallback: ${fallback.provider}/${fallback.model}`);
          response = await this.executeWithProvider(fallback.provider, fallback.model, messages, request);
          usedProvider = fallback.provider;
          usedModel = fallback.model;
          routeError = undefined;
          break;
        } catch (fallbackError: any) {
          console.warn(`[✱brittney] Fallback failed (${fallback.provider}): ${fallbackError.message}`);
          routeError = fallbackError.message;
        }
      }
    }

    // Record latency for adaptive routing
    const latencyMs = Date.now() - startTime;
    this.modelRouter.recordLatency(usedProvider, latencyMs);

    // Complete the trace
    this.modelRouter.completeTrace(trace, {
      provider: usedProvider,
      model: usedModel,
      latencyMs,
      success: !!response,
      error: routeError,
      usage: response?.usage,
    });

    if (!response) {
      throw new Error('All providers failed');
    }

    return {
      ...response,
      model: usedModel,
      routing: {
        reason: route.reason,
        latencyMs,
      },
    };
  }

  /**
   * Execute chat with a specific provider
   */
  private async executeWithProvider(
    providerName: string,
    model: string,
    messages: ChatMessage[],
    request: ChatRequest
  ): Promise<ChatResponse> {
    let provider = this.cloudProviders.get(providerName);

    // Initialize provider on demand if not cached
    if (!provider) {
      const apiKey = this.config.apiKeys?.[providerName as keyof typeof this.config.apiKeys];
      if (!apiKey) {
        throw new Error(`No API key for ${providerName}`);
      }

      const providerConfig = this.getProviderConfig(providerName, apiKey);
      providerConfig.cloudModel = model;
      provider = new CloudProvider(providerConfig);
      await provider.waitReady();
      this.cloudProviders.set(providerName, provider);
    }

    // Override model for this request
    const requestWithModel = { ...request, model };
    return await provider.chat(messages, requestWithModel);
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<{ content: string; done: boolean }> {
    // Extract the last user message for RAG context
    const lastUserMessage = [...request.messages].reverse().find((m) => m.role === 'user');
    const userQuery = lastUserMessage?.content;

    const systemPrompt = this.buildSystemPrompt(request.context, userQuery);
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
      console.log(`[✱brittney] Context too large (${totalTokens} tokens), using cloud`);
      return true;
    }

    return false;
  }

  private estimateTokens(messages: ChatMessage[]): number {
    // Rough estimate: 4 chars per token
    return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  }

  private buildSystemPrompt(context?: BrittneyContext, userQuery?: string): string {
    // Start with comprehensive HoloScript knowledge
    let prompt = getEnhancedSystemPrompt();

    // Add RAG-based relevant examples if we have a user query
    if (userQuery) {
      const ragContext = buildRAGPrompt(userQuery);
      if (ragContext) {
        prompt += ragContext;
      }

      // Boost prompt with physics, materials, and details
      const boosterConfig = this.config.promptBooster || DEFAULT_BOOSTER_CONFIG;
      if (boosterConfig.level !== 'off') {
        const enhancement = boostPrompt(userQuery, boosterConfig);
        if (enhancement) {
          prompt += enhancement;
        }
      }
    }

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

    if (context?.holoScriptContext) {
      prompt += `\n\n## HoloScript Scene Context`;
      if (context.holoScriptContext.currentScene) {
        prompt += `\nCurrent Scene: ${context.holoScriptContext.currentScene}`;
      }
      
      if (context.holoScriptContext.holograms?.length) {
        prompt += `\nActive Holograms (use #id to target):\n`;
        context.holoScriptContext.holograms.forEach(h => {
          const pos = h.position ? `at [${h.position.x}, ${h.position.y}, ${h.position.z}]` : '';
          const traits = h.traits?.length ? `with traits: ${h.traits.join(', ')}` : '';
          prompt += `- ${h.type}#${h.id} ${pos} ${traits}\n`;
        });
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
    console.log('[✱brittney] Loading model...');
    await this.inference.load();
    console.log('[✱brittney] Model loaded');

    // Start server
    return new Promise((resolve) => {
      this.server.listen(Number(PORT), HOST, () => {
        console.log(`[✱brittney] Service running at http://${HOST}:${PORT}`);
        console.log('[✱brittney] WebSocket at ws://${HOST}:${PORT}/ws');
        console.log('[✱brittney] Ready to assist!');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    console.log('[✱brittney] Shutting down...');

    // Close WebSocket connections
    for (const client of this.clients) {
      client.close();
    }

    // Unload model
    await this.inference.unload();

    // Close server
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('[✱brittney] Stopped');
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

  // Keep the process alive
  const keepAlive = setInterval(() => {
    // Heartbeat - prevents Node from exiting if there are no pending operations
  }, 30000);

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`[✱brittney] Received ${signal}, shutting down...`);
    clearInterval(keepAlive);
    await server.stop();
    process.exit(0);
  };

  // Handle various shutdown signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // Windows-specific: handle console close
  if (process.platform === 'win32') {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.on('SIGINT', () => shutdown('SIGINT'));
    // Keep readline open
    rl.on('close', () => {
      // Only shutdown if explicitly closed
    });
  }

  // Handle uncaught errors gracefully
  process.on('uncaughtException', (error) => {
    console.error('[✱brittney] Uncaught exception:', error);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[✱brittney] Unhandled rejection:', reason);
  });

  await server.start();
}

main().catch((error) => {
  console.error('[✱brittney] Fatal error:', error);
  process.exit(1);
});
