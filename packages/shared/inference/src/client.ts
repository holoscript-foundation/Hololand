/**
 * @hololand/inference - Unified Inference Client
 *
 * Single client that manages all providers:
 * - Local (Ollama/embedded llama.cpp)
 * - BYOK Cloud (OpenAI, Anthropic, Google, Grok, Azure)
 *
 * Features:
 * - Automatic provider selection
 * - Fallback chain
 * - Settings persistence
 * - Model routing for HoloScript tasks
 */

import {
  OllamaProvider,
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  GrokProvider,
  InfinityAssistantProvider,
} from './providers/index.js';

import type {
  ProviderType,
  ProviderConfig,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  InferenceSettings,
  InferenceStatus,
  ProviderStatus,
  BRITTNEY_MODELS,
  DEFAULT_SETTINGS,
} from './types.js';

type Provider = OllamaProvider | OpenAIProvider | AnthropicProvider | GoogleProvider | GrokProvider | InfinityAssistantProvider;

export class InferenceClient {
  private settings: InferenceSettings;
  private providers: Map<ProviderType, Provider> = new Map();
  private initialized = false;

  constructor(settings?: Partial<InferenceSettings>) {
    // Merge with defaults
    this.settings = {
      activeProvider: 'local',
      local: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        defaultModel: 'brittney-v4-expert:latest',
        autoDownloadModel: true,
      },
      providers: {
        local: { type: 'local', enabled: true },
        openai: { type: 'openai', enabled: false },
        anthropic: { type: 'anthropic', enabled: false },
        google: { type: 'google', enabled: false },
        grok: { type: 'grok', enabled: false },
        azure: { type: 'azure', enabled: false },
        infinityassistant: { type: 'infinityassistant', enabled: false },
        custom: { type: 'custom', enabled: false },
      },
      fallbackToCloud: true,
      preferLocalWhenAvailable: true,
      maxRetries: 2,
      timeoutMs: 120000,
      ...settings,
    };
  }

  /**
   * Initialize providers based on settings
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Always initialize local provider
    if (this.settings.local.enabled) {
      this.providers.set(
        'local',
        new OllamaProvider({
          baseUrl: this.settings.local.ollamaUrl,
          timeout: this.settings.timeoutMs,
        })
      );
    }

    // Initialize BYOK providers
    for (const [type, config] of Object.entries(this.settings.providers)) {
      if (!config.enabled || type === 'local') continue;
      // InfinityAssistant doesn't require API key (optional auth)
      if (type !== 'infinityassistant' && !config.apiKey) continue;

      const provider = this.createProvider(type as ProviderType, config);
      if (provider) {
        this.providers.set(type as ProviderType, provider);
      }
    }

    this.initialized = true;
  }

  /**
   * Create a provider from config
   */
  private createProvider(type: ProviderType, config: ProviderConfig): Provider | null {
    // Most providers require API key, InfinityAssistant is optional
    if (!config.apiKey && type !== 'infinityassistant') return null;

    switch (type) {
      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey!,
          endpoint: config.endpoint,
          defaultModel: config.model || 'gpt-4o-mini',
        });

      case 'anthropic':
        return new AnthropicProvider({
          apiKey: config.apiKey!,
          defaultModel: config.model || 'claude-sonnet-4-20250514',
        });

      case 'google':
        return new GoogleProvider({
          apiKey: config.apiKey!,
          defaultModel: config.model || 'gemini-2.0-flash',
        });

      case 'grok':
        return new GrokProvider({
          apiKey: config.apiKey!,
          defaultModel: config.model || 'grok-3',
        });

      case 'azure':
        return new OpenAIProvider(
          {
            apiKey: config.apiKey!,
            endpoint: config.endpoint,
            defaultModel: config.model || 'gpt-4o',
          },
          'azure'
        );

      case 'infinityassistant':
        return new InfinityAssistantProvider({
          apiKey: config.apiKey,  // Optional for InfinityAssistant
          endpoint: config.endpoint || 'http://localhost:3002',
          defaultModel: config.model || 'mistral-nemo:12b',
        });

      case 'custom':
        return new OpenAIProvider(
          {
            apiKey: config.apiKey!,
            endpoint: config.endpoint,
            defaultModel: config.model,
          },
          'custom'
        );

      default:
        return null;
    }
  }

  /**
   * Get current status of all providers
   */
  async getStatus(): Promise<InferenceStatus> {
    await this.initialize();

    const statuses: ProviderStatus[] = [];

    for (const [type, provider] of this.providers) {
      const status = await provider.getStatus();
      statuses.push(status);
    }

    const localProvider = this.providers.get('local') as OllamaProvider | undefined;
    const localAvailable = statuses.find((s) => s.type === 'local')?.available || false;

    let localModelDownloaded = false;
    if (localProvider && localAvailable) {
      localModelDownloaded = await localProvider.hasModel(this.settings.local.defaultModel);
    }

    return {
      ready: statuses.some((s) => s.available),
      activeProvider: this.settings.activeProvider,
      providers: statuses,
      localModelDownloaded,
    };
  }

  /**
   * Configure a BYOK provider
   */
  configureProvider(type: ProviderType, config: Partial<ProviderConfig>): void {
    const current = this.settings.providers[type] || { type, enabled: false };
    this.settings.providers[type] = { ...current, ...config };

    // Recreate provider if it has an API key
    if (config.apiKey || current.apiKey) {
      const provider = this.createProvider(type, this.settings.providers[type]);
      if (provider) {
        this.providers.set(type, provider);
      }
    }
  }

  /**
   * Set the active provider
   */
  setActiveProvider(type: ProviderType): void {
    if (!this.providers.has(type)) {
      throw new Error(`Provider ${type} is not configured`);
    }
    this.settings.activeProvider = type;
  }

  /**
   * Chat completion with automatic provider selection and fallback
   */
  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    await this.initialize();

    // Determine provider order
    const providerOrder = this.getProviderOrder(request);

    let lastError: Error | null = null;

    for (const providerType of providerOrder) {
      const provider = this.providers.get(providerType);
      if (!provider) continue;

      try {
        // Select appropriate model for HoloScript tasks
        const enhancedRequest = this.enhanceRequest(request, providerType);
        return await provider.chat(enhancedRequest);
      } catch (error: any) {
        lastError = error;
        console.warn(`[inference] ${providerType} failed: ${error.message}`);
        continue;
      }
    }

    throw lastError || new Error('No providers available');
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(request: InferenceRequest): AsyncGenerator<StreamChunk> {
    await this.initialize();

    const providerType = request.forceProvider || this.settings.activeProvider;
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new Error(`Provider ${providerType} is not configured`);
    }

    const enhancedRequest = this.enhanceRequest(request, providerType);
    yield* provider.chatStream(enhancedRequest);
  }

  /**
   * Get provider order based on settings and request
   */
  private getProviderOrder(request: InferenceRequest): ProviderType[] {
    // Forced provider
    if (request.forceProvider) {
      return [request.forceProvider];
    }

    const order: ProviderType[] = [];

    // Prefer local if available and requested
    if (request.preferLocal ?? this.settings.preferLocalWhenAvailable) {
      order.push('local');
    }

    // Active provider
    if (!order.includes(this.settings.activeProvider)) {
      order.push(this.settings.activeProvider);
    }

    // Fallback providers
    if (this.settings.fallbackToCloud) {
      for (const type of Object.keys(this.settings.providers) as ProviderType[]) {
        if (!order.includes(type) && this.settings.providers[type]?.enabled) {
          order.push(type);
        }
      }
    }

    return order;
  }

  /**
   * Enhance request with appropriate model selection
   */
  private enhanceRequest(request: InferenceRequest, providerType: ProviderType): InferenceRequest {
    // If model already specified, use it
    if (request.model) return request;

    // Detect HoloScript-related requests
    const isHoloScript = this.isHoloScriptRequest(request);

    // Select model based on provider and task
    let model: string | undefined;

    if (providerType === 'local') {
      model = isHoloScript
        ? 'brittney-v4-expert:latest'
        : this.settings.local.defaultModel;
    } else if (providerType === 'openai' && isHoloScript) {
      // Use fine-tuned Brittney model for HoloScript on OpenAI
      model = 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4';
    }

    return { ...request, model };
  }

  /**
   * Detect if request is HoloScript-related
   */
  private isHoloScriptRequest(request: InferenceRequest): boolean {
    const keywords = [
      'holoscript', 'holo', 'scene', 'world', 'npc', 'player',
      'spawn', 'entity', 'spatial', '3d', 'vr', 'ar', 'mesh',
      'composition', 'orb', 'template', 'spatial_group',
    ];

    const content = request.messages
      .map((m) => m.content.toLowerCase())
      .join(' ');

    return keywords.some((kw) => content.includes(kw)) || !!request.holoContext;
  }

  /**
   * Download the default local model
   */
  async downloadLocalModel(onProgress?: (status: string) => void): Promise<void> {
    const localProvider = this.providers.get('local') as OllamaProvider;
    if (!localProvider) {
      throw new Error('Local provider not configured');
    }

    await localProvider.pullModel(this.settings.local.defaultModel, onProgress);
  }

  /**
   * Get current settings
   */
  getSettings(): InferenceSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<InferenceSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.initialized = false; // Force re-initialization
  }
}

/**
 * Create a pre-configured inference client
 */
export function createInferenceClient(settings?: Partial<InferenceSettings>): InferenceClient {
  return new InferenceClient(settings);
}
