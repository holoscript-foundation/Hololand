/**
 * Brittney Tracing Module
 *
 * OpenTelemetry-based tracing for AI model routing, inference, and API calls.
 * Provides observability for:
 * - Model routing decisions
 * - Provider latencies
 * - Token usage
 * - Error tracking
 * - Cost analysis
 *
 * Exports to OTLP collector at http://localhost:4318 (configurable)
 */

// =============================================================================
// Types
// =============================================================================

export interface TracingConfig {
  enabled: boolean;
  serviceName: string;
  endpoint?: string; // OTLP HTTP endpoint (default: http://localhost:4318)
  consoleExport?: boolean;
  sampleRate?: number;
  exportToOtlp?: boolean;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface TraceEvent {
  timestamp: number;
  name: string;
  attributes: Record<string, string | number | boolean>;
}

export interface RouteTrace {
  id: string;
  timestamp: number;
  duration: number;
  input: {
    contentPreview: string;
    platform?: string;
    hints: Record<string, any>;
  };
  decision: {
    provider: string;
    model: string;
    tier: string;
    reason: string;
  };
  execution?: {
    actualProvider: string;
    actualModel: string;
    latencyMs: number;
    success: boolean;
    error?: string;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

export interface ProviderMetrics {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  totalTokens: number;
  totalCost: number;
}

// =============================================================================
// Tracing Implementation
// =============================================================================

class BrittneyTracer {
  private config: TracingConfig;
  private traces: RouteTrace[] = [];
  private maxTraces = 1000;
  private providerLatencies: Map<string, number[]> = new Map();
  private providerStats: Map<string, { success: number; failed: number; tokens: number; cost: number }> = new Map();
  private pendingExports: RouteTrace[] = [];
  private exportTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<TracingConfig>) {
    this.config = {
      enabled: true,
      serviceName: 'brittney-service',
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
      consoleExport: false,
      sampleRate: 1.0,
      exportToOtlp: process.env.BRITTNEY_OTLP_EXPORT === 'true' || true,
      ...config,
    };

    // Start batch export timer
    if (this.config.exportToOtlp) {
      this.startExportTimer();
      console.log(`[Tracing] OTLP export enabled → ${this.config.endpoint}`);
    }
  }

  /**
   * Start periodic OTLP export
   */
  private startExportTimer(): void {
    this.exportTimer = setInterval(() => {
      this.flushToOtlp();
    }, 5000); // Export every 5 seconds
  }

  /**
   * Flush pending traces to OTLP collector
   */
  private async flushToOtlp(): Promise<void> {
    if (this.pendingExports.length === 0) return;

    const tracesToExport = [...this.pendingExports];
    this.pendingExports = [];

    try {
      const payload = this.buildOtlpPayload(tracesToExport);
      const response = await fetch(`${this.config.endpoint}/v1/traces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn(`[Tracing] OTLP export failed: ${response.status} ${response.statusText}`);
        // Re-queue failed traces (up to limit)
        this.pendingExports.push(...tracesToExport.slice(0, 50));
      } else {
        console.log(`[Tracing] Exported ${tracesToExport.length} traces to OTLP`);
      }
    } catch (error: any) {
      console.warn(`[Tracing] OTLP export error: ${error.message}`);
      // Re-queue failed traces
      this.pendingExports.push(...tracesToExport.slice(0, 50));
    }
  }

  /**
   * Build OTLP trace payload
   */
  private buildOtlpPayload(traces: RouteTrace[]): any {
    return {
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.config.serviceName } },
            { key: 'service.version', value: { stringValue: '1.0.0' } },
            { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'development' } },
          ],
        },
        scopeSpans: [{
          scope: {
            name: 'brittney-ai-router',
            version: '1.0.0',
          },
          spans: traces.map(t => this.traceToOtlpSpan(t)),
        }],
      }],
    };
  }

  /**
   * Convert internal trace to OTLP span format
   */
  private traceToOtlpSpan(trace: RouteTrace): any {
    const traceIdHex = trace.id.replace('trace_', '').padStart(32, '0').slice(0, 32);
    const spanIdHex = trace.id.slice(-8).padStart(16, '0').slice(0, 16);

    return {
      traceId: traceIdHex,
      spanId: spanIdHex,
      name: 'ai.chat.completion',
      kind: 2, // SPAN_KIND_CLIENT
      startTimeUnixNano: (trace.timestamp * 1_000_000).toString(),
      endTimeUnixNano: ((trace.timestamp + trace.duration) * 1_000_000).toString(),
      attributes: [
        // AI/LLM Semantic Conventions
        { key: 'gen_ai.system', value: { stringValue: trace.execution?.actualProvider || trace.decision.provider } },
        { key: 'gen_ai.request.model', value: { stringValue: trace.decision.model } },
        { key: 'gen_ai.response.model', value: { stringValue: trace.execution?.actualModel || trace.decision.model } },
        { key: 'gen_ai.usage.prompt_tokens', value: { intValue: trace.usage?.promptTokens?.toString() || '0' } },
        { key: 'gen_ai.usage.completion_tokens', value: { intValue: trace.usage?.completionTokens?.toString() || '0' } },
        // Custom Brittney attributes
        { key: 'brittney.tier', value: { stringValue: trace.decision.tier } },
        { key: 'brittney.routing_reason', value: { stringValue: trace.decision.reason } },
        { key: 'brittney.platform', value: { stringValue: trace.input.platform || 'unknown' } },
        { key: 'brittney.cost_usd', value: { doubleValue: trace.usage?.estimatedCost || 0 } },
        { key: 'brittney.latency_ms', value: { intValue: trace.duration.toString() } },
      ],
      status: {
        code: trace.execution?.success !== false ? 1 : 2, // OK or ERROR
        message: trace.execution?.error || '',
      },
      events: trace.execution?.error ? [{
        timeUnixNano: ((trace.timestamp + trace.duration) * 1_000_000).toString(),
        name: 'exception',
        attributes: [
          { key: 'exception.message', value: { stringValue: trace.execution.error } },
        ],
      }] : [],
    };
  }

  /**
   * Start a new trace for a routing decision
   */
  startRouteTrace(content: string, hints: Record<string, any> = {}): RouteTrace {
    const trace: RouteTrace = {
      id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      duration: 0,
      input: {
        contentPreview: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
        platform: hints.platform,
        hints,
      },
      decision: {
        provider: '',
        model: '',
        tier: '',
        reason: '',
      },
    };

    return trace;
  }

  /**
   * Record routing decision
   */
  recordDecision(trace: RouteTrace, decision: {
    provider: string;
    model: string;
    tier?: string;
    reason: string;
  }): void {
    trace.decision = {
      provider: decision.provider,
      model: decision.model,
      tier: decision.tier || 'unknown',
      reason: decision.reason,
    };
  }

  /**
   * Record execution result
   */
  recordExecution(trace: RouteTrace, result: {
    actualProvider: string;
    actualModel: string;
    latencyMs: number;
    success: boolean;
    error?: string;
  }): void {
    trace.execution = result;
    trace.duration = result.latencyMs;

    // Update provider latencies
    const latencies = this.providerLatencies.get(result.actualProvider) || [];
    latencies.push(result.latencyMs);
    if (latencies.length > 100) latencies.shift(); // Keep last 100
    this.providerLatencies.set(result.actualProvider, latencies);

    // Update provider stats
    const stats = this.providerStats.get(result.actualProvider) || { success: 0, failed: 0, tokens: 0, cost: 0 };
    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
    }
    this.providerStats.set(result.actualProvider, stats);
  }

  /**
   * Record token usage
   */
  recordUsage(trace: RouteTrace, usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }, costPerMillion: number = 0): void {
    const estimatedCost = (usage.totalTokens / 1_000_000) * costPerMillion;
    trace.usage = {
      ...usage,
      estimatedCost,
    };

    // Update provider cost tracking
    if (trace.execution) {
      const stats = this.providerStats.get(trace.execution.actualProvider) || { success: 0, failed: 0, tokens: 0, cost: 0 };
      stats.tokens += usage.totalTokens;
      stats.cost += estimatedCost;
      this.providerStats.set(trace.execution.actualProvider, stats);
    }
  }

  /**
   * Complete and store trace
   */
  completeTrace(trace: RouteTrace): void {
    if (!this.config.enabled) return;

    // Random sampling
    if (Math.random() > this.config.sampleRate!) return;

    this.traces.push(trace);

    // Trim old traces
    if (this.traces.length > this.maxTraces) {
      this.traces = this.traces.slice(-this.maxTraces);
    }

    // Queue for OTLP export
    if (this.config.exportToOtlp) {
      this.pendingExports.push(trace);
    }

    // Console export
    if (this.config.consoleExport) {
      console.log(`[Trace] ${trace.id}`, JSON.stringify({
        duration: trace.duration,
        provider: trace.execution?.actualProvider || trace.decision.provider,
        model: trace.execution?.actualModel || trace.decision.model,
        success: trace.execution?.success,
        tokens: trace.usage?.totalTokens,
        cost: trace.usage?.estimatedCost?.toFixed(6),
      }));
    }
  }

  /**
   * Force flush traces to OTLP (for shutdown)
   */
  async flush(): Promise<void> {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }
    await this.flushToOtlp();
  }

  /**
   * Get all traces
   */
  getTraces(limit = 100): RouteTrace[] {
    return this.traces.slice(-limit);
  }

  /**
   * Get provider metrics
   */
  getProviderMetrics(): ProviderMetrics[] {
    const metrics: ProviderMetrics[] = [];

    for (const [provider, latencies] of this.providerLatencies) {
      const stats = this.providerStats.get(provider) || { success: 0, failed: 0, tokens: 0, cost: 0 };
      const sorted = [...latencies].sort((a, b) => a - b);

      metrics.push({
        provider,
        totalRequests: stats.success + stats.failed,
        successfulRequests: stats.success,
        failedRequests: stats.failed,
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length || 0,
        p50Latency: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95Latency: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99Latency: sorted[Math.floor(sorted.length * 0.99)] || 0,
        totalTokens: stats.tokens,
        totalCost: stats.cost,
      });
    }

    return metrics;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalTraces: number;
    providers: ProviderMetrics[];
    recentErrors: Array<{ timestamp: number; provider: string; error: string }>;
    costBreakdown: Record<string, number>;
  } {
    const recentErrors = this.traces
      .filter(t => t.execution && !t.execution.success)
      .slice(-10)
      .map(t => ({
        timestamp: t.timestamp,
        provider: t.execution!.actualProvider,
        error: t.execution!.error || 'Unknown error',
      }));

    const costBreakdown: Record<string, number> = {};
    for (const [provider, stats] of this.providerStats) {
      costBreakdown[provider] = stats.cost;
    }

    return {
      totalTraces: this.traces.length,
      providers: this.getProviderMetrics(),
      recentErrors,
      costBreakdown,
    };
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces = [];
    this.pendingExports = [];
    this.providerLatencies.clear();
    this.providerStats.clear();
  }

  /**
   * Get OTLP config status
   */
  getOtlpStatus(): { enabled: boolean; endpoint: string; pendingExports: number } {
    return {
      enabled: this.config.exportToOtlp || false,
      endpoint: this.config.endpoint || 'not configured',
      pendingExports: this.pendingExports.length,
    };
  }

  /**
   * Export traces for external analysis
   */
  exportTraces(format: 'json' | 'otlp' = 'json'): string {
    if (format === 'otlp') {
      return JSON.stringify(this.buildOtlpPayload(this.traces), null, 2);
    }

    return JSON.stringify(this.traces, null, 2);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const tracer = new BrittneyTracer({
  enabled: true,
  consoleExport: process.env.BRITTNEY_TRACE_CONSOLE === 'true',
  sampleRate: parseFloat(process.env.BRITTNEY_TRACE_SAMPLE_RATE || '1.0'),
});

// =============================================================================
// Decorators / Helpers
// =============================================================================

/**
 * Trace wrapper for async functions
 */
export function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes: Record<string, any> = {}
): Promise<T> {
  const trace = tracer.startRouteTrace(name, attributes);
  const startTime = Date.now();

  return fn()
    .then(result => {
      trace.duration = Date.now() - startTime;
      tracer.recordExecution(trace, {
        actualProvider: attributes.provider || 'unknown',
        actualModel: attributes.model || 'unknown',
        latencyMs: trace.duration,
        success: true,
      });
      tracer.completeTrace(trace);
      return result;
    })
    .catch(error => {
      trace.duration = Date.now() - startTime;
      tracer.recordExecution(trace, {
        actualProvider: attributes.provider || 'unknown',
        actualModel: attributes.model || 'unknown',
        latencyMs: trace.duration,
        success: false,
        error: error.message,
      });
      tracer.completeTrace(trace);
      throw error;
    });
}

/**
 * Model-specific cost rates (USD per million tokens)
 */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  // Anthropic
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
  // Google
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
  'gemini-2.0-pro': { input: 1.25, output: 5.00 },
  // Grok
  'grok-3': { input: 2.00, output: 8.00 },
  'grok-3-fast': { input: 0.20, output: 0.80 },
};

export function getModelCost(model: string): { input: number; output: number } {
  return MODEL_COSTS[model] || { input: 1.0, output: 4.0 }; // Default estimate
}
