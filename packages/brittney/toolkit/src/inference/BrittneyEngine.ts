/**
 * Brittney Engine - Unified inference with automatic fallback
 * 
 * Default: Local GGUF (bundled with app)
 * Optional: Cloud providers (user's API key)
 */

import type { InferenceProvider, ChatRequest, ChatResponse, StreamCallback } from '../types';
import { LocalInference, type LocalInferenceConfig } from './LocalInference';
import { CloudInference, type CloudProvider } from './CloudInference';
import { getBestAvailableModel, DEFAULT_MODEL_CONFIG, type ModelConfig } from './modelConfig';

export interface BrittneyEngineConfig {
  /** Path to bundled GGUF model (optional - auto-detects if not provided) */
  modelPath?: string;
  /** Optional user API key for cloud provider */
  userApiKey?: string;
  /** Cloud provider if user provides API key */
  cloudProvider?: CloudProvider;
  /** Prefer cloud over local when both available */
  preferCloud?: boolean;
  /** Local inference config overrides */
  localConfig?: Partial<LocalInferenceConfig>;
  /** Model config overrides */
  modelConfig?: Partial<ModelConfig>;
}

/**
 * Main Brittney Engine
 * 
 * Handles inference routing:
 * 1. If user provides API key → use cloud (if preferCloud) or fallback
 * 2. Otherwise → use bundled local GGUF model
 */
export class BrittneyEngine implements InferenceProvider {
  readonly name = 'brittney-engine';
  
  private config: BrittneyEngineConfig;
  private localProvider: LocalInference | null = null;
  private cloudProvider: CloudInference | null = null;
  private activeProvider: InferenceProvider | null = null;
  private ready = false;

  constructor(config: BrittneyEngineConfig) {
    this.config = {
      preferCloud: false, // Default to local
      ...config,
    };
  }

  async isReady(): Promise<boolean> {
    return this.ready;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;

    console.log('[Brittney] Initializing engine...');

    // Auto-detect model if not provided
    const modelPath = this.config.modelPath ?? getBestAvailableModel();
    
    if (!modelPath && !this.config.userApiKey) {
      throw new Error(
        'No Brittney model found. Either:\n' +
        '  1. Copy brittney-base.gguf to packages/brittney-toolkit/models/\n' +
        '  2. Set BRITTNEY_MODEL_PATH environment variable\n' +
        '  3. Provide userApiKey and cloudProvider for cloud inference'
      );
    }

    // Always set up local inference if model available
    if (modelPath) {
      this.localProvider = new LocalInference({
        modelPath,
        ...DEFAULT_MODEL_CONFIG,
        ...this.config.modelConfig,
        ...this.config.localConfig,
      });
    }

    // Set up cloud if user provided API key
    if (this.config.userApiKey && this.config.cloudProvider) {
      this.cloudProvider = new CloudInference({
        provider: this.config.cloudProvider,
        apiKey: this.config.userApiKey,
      });
      
      try {
        await this.cloudProvider.initialize();
        console.log('[Brittney] Cloud provider ready (user API key)');
        
        if (this.config.preferCloud) {
          this.activeProvider = this.cloudProvider;
        }
      } catch (error: any) {
        console.warn('[Brittney] Cloud init failed, using local:', error.message);
        this.cloudProvider = null;
      }
    }

    // Initialize local if needed
    if (!this.activeProvider && this.localProvider) {
      try {
        await this.localProvider.initialize();
        this.activeProvider = this.localProvider;
        console.log('[Brittney] Using local inference (bundled model)');
      } catch (error: any) {
        // If local fails and cloud is available, use cloud
        if (this.cloudProvider) {
          this.activeProvider = this.cloudProvider;
          console.log('[Brittney] Local init failed, using cloud fallback');
        } else {
          throw new Error('No inference provider available');
        }
      }
    }

    this.ready = true;
    console.log(`[Brittney] Engine ready (provider: ${this.activeProvider?.name ?? 'none'})`);
  }

  /**
   * Switch to cloud provider (user added API key at runtime)
   */
  async enableCloud(provider: CloudProvider, apiKey: string): Promise<void> {
    this.cloudProvider = new CloudInference({ provider, apiKey });
    await this.cloudProvider.initialize();
    
    if (this.config.preferCloud) {
      this.activeProvider = this.cloudProvider;
    }
    
    console.log(`[Brittney] Cloud provider ${provider} enabled`);
  }

  /**
   * Switch back to local inference
   */
  useLocal(): void {
    if (this.localProvider) {
      this.activeProvider = this.localProvider;
      console.log('[Brittney] Switched to local inference');
    }
  }

  /**
   * Switch to cloud inference (if available)
   */
  useCloud(): boolean {
    if (this.cloudProvider) {
      this.activeProvider = this.cloudProvider;
      console.log('[Brittney] Switched to cloud inference');
      return true;
    }
    return false;
  }

  /**
   * Get current provider name
   */
  getCurrentProvider(): string {
    return this.activeProvider?.name ?? 'none';
  }

  /**
   * Check if using cloud provider
   */
  isUsingCloud(): boolean {
    return this.activeProvider === this.cloudProvider && this.cloudProvider !== null;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.ready || !this.activeProvider) {
      await this.initialize();
    }

    // Add HoloScript system prompt if not present
    const hasSystem = request.messages.some(m => m.role === 'system');
    if (!hasSystem) {
      request.messages = [
        {
          role: 'system',
          content: BRITTNEY_SYSTEM_PROMPT,
        },
        ...request.messages,
      ];
    }

    return this.activeProvider!.chat(request);
  }

  async chatStream(request: ChatRequest, callback: StreamCallback): Promise<void> {
    if (!this.ready || !this.activeProvider) {
      await this.initialize();
    }

    // Add HoloScript system prompt if not present
    const hasSystem = request.messages.some(m => m.role === 'system');
    if (!hasSystem) {
      request.messages = [
        {
          role: 'system',
          content: BRITTNEY_SYSTEM_PROMPT,
        },
        ...request.messages,
      ];
    }

    return this.activeProvider!.chatStream(request, callback);
  }

  async dispose(): Promise<void> {
    if (this.localProvider) {
      await this.localProvider.dispose();
    }
    if (this.cloudProvider) {
      await this.cloudProvider.dispose();
    }
    this.ready = false;
  }
}

// Default system prompt for HoloScript assistance
const BRITTNEY_SYSTEM_PROMPT = `You are Brittney, the AI assistant for Hololand and HoloScript development.

You help creators build immersive 3D worlds using HoloScript - a declarative language for spatial computing.

Key HoloScript concepts:
- composition: Define scenes with objects, environments, and logic
- template: Reusable object definitions
- traits: @grabbable, @networked, @physics, @ai_agent
- environment: lighting, audio, fog, time_of_day
- logic: on_start, on_collision, on_user_gesture
- spawn/despawn: Dynamic object creation

Always respond with working HoloScript code when asked to create something.
Keep responses concise and focused on the code.`;
