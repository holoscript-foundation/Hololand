/**
 * HoloScript+ Orchestration Runtime
 *
 * Executes brittney-routing.hs graph and emits events for agent observation.
 * Agents subscribe to events to visualize routing decisions in their 3D environment.
 */

import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Types
// =============================================================================

export interface OrchestrationState {
  category: string | null;
  confidence: number;
  matched_keywords: string[];
  route: 'specialist' | 'primary' | 'hybrid' | null;
  selected_provider: string | null;
  fallback_chain: string[];
  attempt: number;
  response: unknown;
  error: string | null;
  latency_ms: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  color: string;
  endpoint: string;
  priority: number;
  enabled: boolean;
}

export interface OrchestrationEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// =============================================================================
// Orchestration Runtime
// =============================================================================

export class OrchestrationRuntime extends EventEmitter {
  private state: OrchestrationState;
  private providers: Map<string, ProviderConfig>;
  private config: {
    routing_threshold: number;
    fallback_enabled: boolean;
    timeout_ms: number;
  };

  // Keyword lists from HoloScript definition
  private specialistKeywords = [
    'holoscript', '@scene', '@object', '@ui', '@pointable', '@grabbable',
    'hololand', 'brittney', 'vr world', 'ar world', 'metaverse',
    'hand tracking', 'teleport', 'avatar', 'spatial audio',
    'mesh', 'gltf', 'position:', 'rotation:', 'scale:', 'animation',
  ];

  private primaryKeywords = [
    'typescript', 'javascript', 'python', 'react', 'api', 'database',
    'architecture', 'refactor', 'security', 'explain', 'plan',
  ];

  constructor() {
    super();
    this.state = this.initState();
    this.providers = new Map();
    this.config = {
      routing_threshold: 0.7,
      fallback_enabled: true,
      timeout_ms: 30000,
    };
  }

  private initState(): OrchestrationState {
    return {
      category: null,
      confidence: 0,
      matched_keywords: [],
      route: null,
      selected_provider: null,
      fallback_chain: [],
      attempt: 0,
      response: null,
      error: null,
      latency_ms: 0,
    };
  }

  /**
   * Register a provider
   */
  registerProvider(provider: ProviderConfig): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Emit event for agent observation
   */
  private emitEvent(type: string, data: Record<string, unknown>): void {
    const event: OrchestrationEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    this.emit('orchestration_event', event);
    this.emit(type, data);
  }

  /**
   * Execute the routing graph
   */
  async execute(input: string, messages: Array<{ role: string; content: string }>): Promise<{
    success: boolean;
    content?: string;
    provider?: string;
    route?: string;
    state: OrchestrationState;
  }> {
    // Reset state
    this.state = this.initState();

    // Node: classify_task
    await this.nodeClassifyTask(input);

    // Route based on classification
    if (['holoscript', 'vr_scene', 'debugging', 'performance'].includes(this.state.category || '')) {
      await this.nodeSpecialistRoute();
    } else if (this.state.confidence < this.config.routing_threshold) {
      await this.nodeHybridRoute(messages);
    } else {
      await this.nodePrimaryRoute();
    }

    // Try providers in chain
    const result = await this.nodeTryProvider(messages);

    // Emit completion
    this.emitEvent('routing_complete', {
      route: this.state.route,
      provider: this.state.selected_provider,
      category: this.state.category,
      confidence: this.state.confidence,
      latency_ms: this.state.latency_ms,
      attempts: this.state.attempt,
    });

    return {
      success: result.success,
      content: result.content,
      provider: this.state.selected_provider || undefined,
      route: this.state.route || undefined,
      state: this.state,
    };
  }

  /**
   * Node: Classify task based on keywords
   */
  private async nodeClassifyTask(input: string): Promise<void> {
    const lowerInput = input.toLowerCase();
    let specialistScore = 0;
    let primaryScore = 0;
    const matched: string[] = [];

    for (const keyword of this.specialistKeywords) {
      if (lowerInput.includes(keyword)) {
        specialistScore += keyword.length > 10 ? 2 : 1;
        matched.push(keyword);
      }
    }

    for (const keyword of this.primaryKeywords) {
      if (lowerInput.includes(keyword)) {
        primaryScore += 1;
      }
    }

    const total = specialistScore + primaryScore || 1;
    const specialistConfidence = specialistScore / total;

    // Determine category
    let category: string;
    if (specialistScore > primaryScore && specialistConfidence >= this.config.routing_threshold) {
      if (lowerInput.includes('holoscript') || lowerInput.includes('@scene')) {
        category = 'holoscript';
      } else if (lowerInput.includes('error') || lowerInput.includes('debug')) {
        category = 'debugging';
      } else if (lowerInput.includes('performance') || lowerInput.includes('fps')) {
        category = 'performance';
      } else {
        category = 'vr_scene';
      }
    } else if (primaryScore > 0) {
      category = lowerInput.includes('explain') ? 'explanation' : 'general_code';
    } else {
      category = 'other';
    }

    this.state.category = category;
    this.state.confidence = specialistScore > primaryScore ? specialistConfidence : 1 - specialistConfidence;
    this.state.matched_keywords = matched;

    this.emitEvent('task_classified', {
      category: this.state.category,
      confidence: this.state.confidence,
      matched_keywords: this.state.matched_keywords,
    });
  }

  /**
   * Node: Specialist route with fallback chain
   */
  private async nodeSpecialistRoute(): Promise<void> {
    this.state.route = 'specialist';

    // Build fallback chain based on enabled providers
    const chain: string[] = [];
    if (this.providers.get('foundry-local')?.enabled) chain.push('foundry-local');
    if (this.providers.get('azure-foundry')?.enabled) chain.push('azure-foundry');
    chain.push('brittney-cloud'); // Always available

    this.state.fallback_chain = chain;

    this.emitEvent('route_selected', {
      route: 'specialist',
      fallback_chain: chain,
    });
  }

  /**
   * Node: Primary route
   */
  private async nodePrimaryRoute(): Promise<void> {
    this.state.route = 'primary';
    this.state.fallback_chain = ['primary-grok'];

    this.emitEvent('route_selected', {
      route: 'primary',
      fallback_chain: ['primary-grok'],
    });
  }

  /**
   * Node: Hybrid route
   */
  private async nodeHybridRoute(messages: Array<{ role: string; content: string }>): Promise<void> {
    this.state.route = 'hybrid';

    this.emitEvent('route_selected', {
      route: 'hybrid',
      fallback_chain: ['primary-grok', 'brittney-cloud'],
    });

    // For hybrid, we use primary then potentially delegate
    this.state.fallback_chain = ['primary-grok'];
  }

  /**
   * Node: Try provider with fallback
   */
  private async nodeTryProvider(messages: Array<{ role: string; content: string }>): Promise<{
    success: boolean;
    content?: string;
  }> {
    for (const providerId of this.state.fallback_chain) {
      this.state.attempt++;
      this.state.selected_provider = providerId;

      const provider = this.providers.get(providerId);

      this.emitEvent('provider_attempt', {
        provider: providerId,
        provider_name: provider?.name,
        provider_color: provider?.color,
        attempt: this.state.attempt,
      });

      const startTime = Date.now();

      try {
        // Actual provider call would go here
        // For now, emit the attempt - the actual calling is done by the TypeScript orchestrator
        this.state.latency_ms = Date.now() - startTime;

        return {
          success: true,
          content: `[Routed to ${providerId}]`,
        };
      } catch (error) {
        this.state.error = error instanceof Error ? error.message : 'Unknown error';
        this.state.latency_ms = Date.now() - startTime;

        this.emitEvent('provider_fallback', {
          failed_provider: providerId,
          error: this.state.error,
          next_provider: this.state.fallback_chain[this.state.attempt] || null,
        });
      }
    }

    // All failed
    this.emitEvent('routing_failed', {
      route: this.state.route,
      attempts: this.state.attempt,
      last_error: this.state.error,
    });

    return { success: false };
  }

  /**
   * Get current state for agent inspection
   */
  getState(): OrchestrationState {
    return { ...this.state };
  }

  /**
   * Get provider info for visualization
   */
  getProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createOrchestrationRuntime(): OrchestrationRuntime {
  const runtime = new OrchestrationRuntime();

  // Register default providers
  runtime.registerProvider({
    id: 'foundry-local',
    name: 'Foundry Local',
    color: '#10b981',
    endpoint: 'http://localhost:5272/v1/chat/completions',
    priority: 1,
    enabled: false, // Disabled by default
  });

  runtime.registerProvider({
    id: 'azure-foundry',
    name: 'Azure AI Foundry',
    color: '#3b82f6',
    endpoint: 'https://brittney-resource.services.ai.azure.com',
    priority: 2,
    enabled: false, // Disabled by default
  });

  runtime.registerProvider({
    id: 'brittney-cloud',
    name: 'Brittney (Grok-3)',
    color: '#8b5cf6',
    endpoint: 'http://localhost:11435/chat',
    priority: 3,
    enabled: true,
  });

  runtime.registerProvider({
    id: 'primary-grok',
    name: 'Grok-4 Fast Reasoning',
    color: '#f59e0b',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    priority: 10,
    enabled: true,
  });

  return runtime;
}
