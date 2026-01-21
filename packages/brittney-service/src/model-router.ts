/**
 * Dynamic Model Router for Brittney Service
 *
 * Intelligently routes requests to the best model based on:
 * - Request type (simple query, code generation, complex reasoning)
 * - Platform (VR/AR, mobile, desktop)
 * - Provider availability and latency requirements
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    Brittney Smart Router                       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                 │
 * │  Simple Tasks (autocomplete, quick queries)                    │
 * │  ──► Gemini Flash / GPT-4o-mini  (50-200ms, cheap)            │
 * │                                                                 │
 * │  HoloScript+ Generation (code, scenes)                         │
 * │  ──► GPT-4o / Claude Sonnet 4  (500-1500ms, quality)          │
 * │                                                                 │
 * │  Complex Reasoning (debugging, optimization)                   │
 * │  ──► Claude Sonnet 4.5 / GPT-4o  (quality over speed)         │
 * │                                                                 │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { ApiKeys, CloudProviderType } from './config.js';
import { tracer, RouteTrace, getModelCost } from './tracing.js';

// =============================================================================
// Types
// =============================================================================

export type RequestComplexity = 'simple' | 'standard' | 'complex';
export type RequestType = 'autocomplete' | 'chat' | 'code' | 'reasoning' | 'debug';
export type Platform = 'vr' | 'ar' | 'mobile' | 'desktop' | 'web' | 'unknown';

export interface RoutingHints {
  /** The platform making the request */
  platform?: Platform;
  /** Type of request */
  type?: RequestType;
  /** Explicit complexity override */
  complexity?: RequestComplexity;
  /** Maximum acceptable latency in ms */
  maxLatency?: number;
  /** Prefer quality over speed */
  preferQuality?: boolean;
  /** Prefer cost savings */
  preferCost?: boolean;
  /** Force a specific provider */
  forceProvider?: CloudProviderType;
}

export interface ModelConfig {
  provider: CloudProviderType;
  model: string;
  tier: 'fast' | 'balanced' | 'quality';
  avgLatency: number; // ms
  costPerMillion: number; // USD per million tokens (input)
}

export interface RouteDecision {
  provider: CloudProviderType;
  model: string;
  reason: string;
  fallbacks: Array<{ provider: CloudProviderType; model: string }>;
}

// =============================================================================
// Model Configurations
// =============================================================================

const MODEL_CONFIGS: ModelConfig[] = [
  // === FAST TIER (50-300ms, cheap) ===
  { provider: 'google', model: 'gemini-2.0-flash', tier: 'fast', avgLatency: 100, costPerMillion: 0.075 },
  { provider: 'openai', model: 'gpt-4o-mini', tier: 'fast', avgLatency: 150, costPerMillion: 0.15 },
  { provider: 'grok', model: 'grok-3-fast', tier: 'fast', avgLatency: 200, costPerMillion: 0.20 },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', tier: 'fast', avgLatency: 180, costPerMillion: 0.25 },

  // === BALANCED TIER (300-800ms, moderate cost) ===
  { provider: 'openai', model: 'gpt-4o', tier: 'balanced', avgLatency: 500, costPerMillion: 2.50 },
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', tier: 'balanced', avgLatency: 600, costPerMillion: 3.00 },
  { provider: 'grok', model: 'grok-3', tier: 'balanced', avgLatency: 450, costPerMillion: 2.00 },
  { provider: 'google', model: 'gemini-2.0-pro', tier: 'balanced', avgLatency: 400, costPerMillion: 1.25 },

  // === QUALITY TIER (800ms+, premium) ===
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', tier: 'quality', avgLatency: 800, costPerMillion: 3.00 },
  { provider: 'openai', model: 'gpt-4o', tier: 'quality', avgLatency: 700, costPerMillion: 2.50 },
];

// =============================================================================
// Pattern Detection
// =============================================================================

const CODE_PATTERNS = [
  /holoscript/i,
  /\bcode\b/i,
  /\bscript\b/i,
  /\bfunction\b/i,
  /\bclass\b/i,
  /\bobject\b/i,
  /\bscene\b/i,
  /\bworld\b/i,
  /\bcreate\b.*\b(cube|sphere|box|mesh|entity)/i,
  /\bgenerate\b/i,
  /\bparticle\b/i,
  /\banimation\b/i,
  /\bmaterial\b/i,
  /\bshader\b/i,
];

const SIMPLE_PATTERNS = [
  /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure)/i,
  /^what is/i,
  /^how do i/i,
  /^can you/i,
  /\?$/,
];

const COMPLEX_PATTERNS = [
  /debug/i,
  /\bfix\b/i,
  /\boptimize\b/i,
  /\bperformance\b/i,
  /\banalyze\b/i,
  /\bexplain\b.*\bwhy\b/i,
  /\barchitect/i,
  /\brefactor/i,
  /\bmultiple\b.*\b(files|components|scenes)/i,
  /\bcomplex\b/i,
  /bottleneck/i,
];

// =============================================================================
// Model Router
// =============================================================================

export class ModelRouter {
  private availableProviders: Set<CloudProviderType> = new Set();
  private providerLatencies: Map<CloudProviderType, number> = new Map();
  private defaultProvider: CloudProviderType = 'grok';
  private defaultModel: string = 'grok-3';

  constructor(apiKeys?: ApiKeys) {
    if (apiKeys) {
      this.updateAvailableProviders(apiKeys);
    }
  }

  /**
   * Update which providers are available based on configured API keys
   */
  updateAvailableProviders(apiKeys: ApiKeys): void {
    this.availableProviders.clear();
    
    if (apiKeys.grok) this.availableProviders.add('grok');
    if (apiKeys.openai) this.availableProviders.add('openai');
    if (apiKeys.anthropic) this.availableProviders.add('anthropic');
    if (apiKeys.google || apiKeys.gemini) this.availableProviders.add('google');
    if (apiKeys.azure) this.availableProviders.add('azure');

    console.log(`[ModelRouter] Available providers: ${[...this.availableProviders].join(', ')}`);
  }

  /**
   * Record latency for a provider (for adaptive routing)
   */
  recordLatency(provider: CloudProviderType, latencyMs: number): void {
    // Use exponential moving average
    const current = this.providerLatencies.get(provider) || latencyMs;
    const alpha = 0.3; // Weight for new observation
    this.providerLatencies.set(provider, alpha * latencyMs + (1 - alpha) * current);
  }

  /**
   * Route a request to the best model (with tracing)
   */
  route(content: string, hints: RoutingHints = {}): RouteDecision & { trace: RouteTrace } {
    // Start trace
    const trace = tracer.startRouteTrace(content, hints);

    // Forced provider override
    if (hints.forceProvider && this.availableProviders.has(hints.forceProvider)) {
      const model = this.getDefaultModel(hints.forceProvider, hints.complexity || 'standard');
      const decision = {
        provider: hints.forceProvider,
        model,
        reason: `Forced provider: ${hints.forceProvider}`,
        fallbacks: this.buildFallbacks(hints.forceProvider, hints.complexity || 'standard'),
      };
      
      tracer.recordDecision(trace, { ...decision, tier: hints.complexity || 'standard' });
      return { ...decision, trace };
    }

    // Detect complexity from content and hints
    const complexity = hints.complexity || this.detectComplexity(content, hints);
    const type = hints.type || this.detectType(content);

    // Determine target tier based on platform and complexity
    const tier = this.determineTier(complexity, hints);

    // Find best available model for this tier
    const decision = this.selectModel(tier, hints);

    // Record decision in trace
    tracer.recordDecision(trace, { ...decision, tier });

    console.log(`[ModelRouter] Route: type=${type}, complexity=${complexity}, tier=${tier} → ${decision.provider}/${decision.model}`);

    return { ...decision, trace };
  }

  /**
   * Complete a trace after execution
   */
  completeTrace(
    trace: RouteTrace,
    result: {
      provider: string;
      model: string;
      latencyMs: number;
      success: boolean;
      error?: string;
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    }
  ): void {
    tracer.recordExecution(trace, {
      actualProvider: result.provider,
      actualModel: result.model,
      latencyMs: result.latencyMs,
      success: result.success,
      error: result.error,
    });

    if (result.usage) {
      const costRate = getModelCost(result.model);
      tracer.recordUsage(trace, result.usage, costRate.input);
    }

    tracer.completeTrace(trace);
  }

  /**
   * Detect request complexity from content
   */
  private detectComplexity(content: string, hints: RoutingHints): RequestComplexity {
    // Platform-based defaults
    if (hints.platform === 'vr' || hints.platform === 'ar') {
      // VR/AR needs fast responses unless explicitly complex
      if (!COMPLEX_PATTERNS.some(p => p.test(content))) {
        return 'simple';
      }
    }

    // Pattern matching
    if (COMPLEX_PATTERNS.some(p => p.test(content))) {
      return 'complex';
    }

    if (CODE_PATTERNS.some(p => p.test(content))) {
      return 'standard';
    }

    if (SIMPLE_PATTERNS.some(p => p.test(content))) {
      return 'simple';
    }

    // Token count heuristic
    const estimatedTokens = content.length / 4;
    if (estimatedTokens > 2000) return 'complex';
    if (estimatedTokens > 500) return 'standard';

    return 'simple';
  }

  /**
   * Detect request type from content
   */
  private detectType(content: string): RequestType {
    if (content.length < 50 && /complete|suggest|auto/i.test(content)) {
      return 'autocomplete';
    }

    if (COMPLEX_PATTERNS.some(p => p.test(content))) {
      if (/debug|error|fix/i.test(content)) return 'debug';
      return 'reasoning';
    }

    if (CODE_PATTERNS.some(p => p.test(content))) {
      return 'code';
    }

    return 'chat';
  }

  /**
   * Determine model tier based on complexity and hints
   */
  private determineTier(complexity: RequestComplexity, hints: RoutingHints): 'fast' | 'balanced' | 'quality' {
    // Explicit quality preference
    if (hints.preferQuality) return 'quality';
    if (hints.preferCost) return 'fast';

    // Latency constraints
    if (hints.maxLatency) {
      if (hints.maxLatency < 200) return 'fast';
      if (hints.maxLatency < 600) return 'balanced';
    }

    // Platform-based defaults
    if (hints.platform === 'vr' || hints.platform === 'ar') {
      // VR needs speed
      return complexity === 'complex' ? 'balanced' : 'fast';
    }

    if (hints.platform === 'mobile') {
      // Mobile: balance cost and quality
      return complexity === 'complex' ? 'balanced' : 'fast';
    }

    // Desktop/web can handle any tier
    switch (complexity) {
      case 'simple': return 'fast';
      case 'standard': return 'balanced';
      case 'complex': return 'quality';
    }
  }

  /**
   * Select best available model for tier
   */
  private selectModel(tier: 'fast' | 'balanced' | 'quality', hints: RoutingHints): RouteDecision {
    const modelsForTier = MODEL_CONFIGS
      .filter(m => m.tier === tier)
      .filter(m => this.availableProviders.has(m.provider));

    if (modelsForTier.length === 0) {
      // Fall back to any available model
      const anyAvailable = MODEL_CONFIGS.find(m => this.availableProviders.has(m.provider));
      if (anyAvailable) {
        return {
          provider: anyAvailable.provider,
          model: anyAvailable.model,
          reason: `Fallback: no ${tier} tier models available`,
          fallbacks: [],
        };
      }

      // Ultimate fallback
      return {
        provider: this.defaultProvider,
        model: this.defaultModel,
        reason: 'No providers available, using default',
        fallbacks: [],
      };
    }

    // Sort by preference (latency, then cost)
    const sorted = modelsForTier.sort((a, b) => {
      // Use recorded latency if available
      const latencyA = this.providerLatencies.get(a.provider) || a.avgLatency;
      const latencyB = this.providerLatencies.get(b.provider) || b.avgLatency;

      if (hints.preferCost) {
        return a.costPerMillion - b.costPerMillion;
      }

      return latencyA - latencyB;
    });

    const selected = sorted[0];

    return {
      provider: selected.provider,
      model: selected.model,
      reason: `Best ${tier} model: ${selected.avgLatency}ms avg, $${selected.costPerMillion}/M tokens`,
      fallbacks: sorted.slice(1).map(m => ({ provider: m.provider, model: m.model })),
    };
  }

  /**
   * Get default model for a provider
   */
  private getDefaultModel(provider: CloudProviderType, complexity: RequestComplexity): string {
    const tier = complexity === 'simple' ? 'fast' : complexity === 'complex' ? 'quality' : 'balanced';
    const model = MODEL_CONFIGS.find(m => m.provider === provider && m.tier === tier);
    
    if (model) return model.model;

    // Provider defaults
    const defaults: Record<CloudProviderType, string> = {
      openai: 'gpt-4o',
      anthropic: 'claude-sonnet-4-20250514',
      google: 'gemini-2.0-flash',
      grok: 'grok-3',
      azure: 'gpt-4o',
    };

    return defaults[provider] || 'gpt-4o';
  }

  /**
   * Build fallback chain
   */
  private buildFallbacks(excludeProvider: CloudProviderType, complexity: RequestComplexity): Array<{ provider: CloudProviderType; model: string }> {
    return [...this.availableProviders]
      .filter(p => p !== excludeProvider)
      .map(p => ({
        provider: p,
        model: this.getDefaultModel(p, complexity),
      }));
  }

  /**
   * Get routing stats
   */
  getStats(): {
    availableProviders: CloudProviderType[];
    latencies: Record<string, number>;
  } {
    return {
      availableProviders: [...this.availableProviders],
      latencies: Object.fromEntries(this.providerLatencies),
    };
  }
}

// =============================================================================
// Exports
// =============================================================================

export const modelRouter = new ModelRouter();
