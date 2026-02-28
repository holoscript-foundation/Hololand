/**
 * Metrics Service
 *
 * Prometheus metrics for monitoring:
 * - Request counts and latency
 * - Token usage
 * - Error rates
 * - Queue depth
 * - GPU utilization
 */

import { Request, Response } from 'express';

export interface MetricLabels {
  [key: string]: string;
}

/**
 * Counter metric
 */
class Counter {
  private counts: Map<string, number> = new Map();

  constructor(
    private name: string,
    private help: string,
    private labelNames: string[] = []
  ) {}

  inc(labels: MetricLabels = {}, value: number = 1): void {
    const key = this.labelsToKey(labels);
    this.counts.set(key, (this.counts.get(key) || 0) + value);
  }

  async get(): Promise<string> {
    const lines: string[] = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} counter`);

    for (const [key, value] of this.counts.entries()) {
      lines.push(`${this.name}${key} ${value}`);
    }

    return lines.join('\n');
  }

  private labelsToKey(labels: MetricLabels): string {
    if (Object.keys(labels).length === 0) return '';
    const pairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${pairs}}`;
  }
}

/**
 * Histogram metric for latency tracking
 */
class Histogram {
  private sums: Map<string, number> = new Map();
  private counts: Map<string, number> = new Map();
  private buckets: Map<string, Map<number, number>> = new Map();
  private bucketValues: number[];

  constructor(
    private name: string,
    private help: string,
    private labelNames: string[] = [],
    buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ) {
    this.bucketValues = buckets;
  }

  observe(labels: MetricLabels = {}, value: number): void {
    const key = this.labelsToKey(labels);

    // Update sum
    this.sums.set(key, (this.sums.get(key) || 0) + value);

    // Update count
    this.counts.set(key, (this.counts.get(key) || 0) + 1);

    // Update buckets
    if (!this.buckets.has(key)) {
      this.buckets.set(key, new Map());
    }
    const bucketMap = this.buckets.get(key)!;

    for (const bucket of this.bucketValues) {
      if (value <= bucket) {
        bucketMap.set(bucket, (bucketMap.get(bucket) || 0) + 1);
      }
    }
  }

  async get(): Promise<string> {
    const lines: string[] = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} histogram`);

    for (const [key, count] of this.counts.entries()) {
      const sum = this.sums.get(key) || 0;
      const bucketMap = this.buckets.get(key) || new Map();

      // Bucket values
      for (const bucket of this.bucketValues) {
        const bucketCount = bucketMap.get(bucket) || 0;
        const bucketKey = key ? `${key.slice(0, -1)},le="${bucket}"}` : `{le="${bucket}"}`;
        lines.push(`${this.name}_bucket${bucketKey} ${bucketCount}`);
      }

      // +Inf bucket
      const infKey = key ? `${key.slice(0, -1)},le="+Inf"}` : `{le="+Inf"}`;
      lines.push(`${this.name}_bucket${infKey} ${count}`);

      // Sum and count
      lines.push(`${this.name}_sum${key} ${sum}`);
      lines.push(`${this.name}_count${key} ${count}`);
    }

    return lines.join('\n');
  }

  private labelsToKey(labels: MetricLabels): string {
    if (Object.keys(labels).length === 0) return '';
    const pairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${pairs}}`;
  }
}

/**
 * Gauge metric for current values
 */
class Gauge {
  private values: Map<string, number> = new Map();

  constructor(
    private name: string,
    private help: string,
    private labelNames: string[] = []
  ) {}

  set(labels: MetricLabels = {}, value: number): void {
    const key = this.labelsToKey(labels);
    this.values.set(key, value);
  }

  inc(labels: MetricLabels = {}, value: number = 1): void {
    const key = this.labelsToKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }

  dec(labels: MetricLabels = {}, value: number = 1): void {
    const key = this.labelsToKey(labels);
    this.values.set(key, (this.values.get(key) || 0) - value);
  }

  async get(): Promise<string> {
    const lines: string[] = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} gauge`);

    for (const [key, value] of this.values.entries()) {
      lines.push(`${this.name}${key} ${value}`);
    }

    return lines.join('\n');
  }

  private labelsToKey(labels: MetricLabels): string {
    if (Object.keys(labels).length === 0) return '';
    const pairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${pairs}}`;
  }
}

/**
 * Metrics registry
 */
export class MetricsService {
  // Request metrics
  public readonly requestsTotal = new Counter(
    'brittney_requests_total',
    'Total number of API requests',
    ['method', 'endpoint', 'status', 'tier']
  );

  public readonly requestDuration = new Histogram(
    'brittney_request_duration_seconds',
    'Request latency in seconds',
    ['method', 'endpoint', 'tier']
  );

  // Token metrics
  public readonly tokensTotal = new Counter(
    'brittney_tokens_total',
    'Total number of tokens processed',
    ['model', 'type', 'tier']
  );

  // Error metrics
  public readonly errorsTotal = new Counter(
    'brittney_errors_total',
    'Total number of errors',
    ['type', 'endpoint']
  );

  // Queue metrics
  public readonly queueDepth = new Gauge(
    'brittney_queue_depth',
    'Current number of requests in queue',
    ['priority']
  );

  public readonly activeRequests = new Gauge(
    'brittney_active_requests',
    'Current number of active inference requests',
    ['model']
  );

  // Cost metrics
  public readonly costTotal = new Counter(
    'brittney_cost_usd_total',
    'Total cost in USD',
    ['tier', 'model']
  );

  // Rate limit metrics
  public readonly rateLimitHits = new Counter(
    'brittney_rate_limit_hits_total',
    'Number of rate limit hits',
    ['tier', 'limit_type']
  );

  /**
   * Track an HTTP request
   */
  trackRequest(
    method: string,
    endpoint: string,
    status: number,
    tier: string,
    durationSeconds: number
  ): void {
    this.requestsTotal.inc({
      method,
      endpoint,
      status: status.toString(),
      tier,
    });

    this.requestDuration.observe(
      { method, endpoint, tier },
      durationSeconds
    );
  }

  /**
   * Track token usage
   */
  trackTokens(
    model: string,
    promptTokens: number,
    completionTokens: number,
    tier: string
  ): void {
    this.tokensTotal.inc(
      { model, type: 'prompt', tier },
      promptTokens
    );

    this.tokensTotal.inc(
      { model, type: 'completion', tier },
      completionTokens
    );
  }

  /**
   * Track cost
   */
  trackCost(tier: string, model: string, costUsd: number): void {
    this.costTotal.inc({ tier, model }, costUsd);
  }

  /**
   * Track error
   */
  trackError(type: string, endpoint: string): void {
    this.errorsTotal.inc({ type, endpoint });
  }

  /**
   * Track rate limit hit
   */
  trackRateLimitHit(tier: string, limitType: 'minute' | 'day'): void {
    this.rateLimitHits.inc({ tier, limit_type: limitType });
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getAllMetrics(): Promise<string> {
    const metrics = await Promise.all([
      this.requestsTotal.get(),
      this.requestDuration.get(),
      this.tokensTotal.get(),
      this.errorsTotal.get(),
      this.queueDepth.get(),
      this.activeRequests.get(),
      this.costTotal.get(),
      this.rateLimitHits.get(),
    ]);

    return metrics.filter(m => m).join('\n\n') + '\n';
  }

  /**
   * Express middleware to track requests
   */
  middleware() {
    return (req: Request, res: Response, next: Function): void => {
      const startTime = Date.now();

      // Track response
      res.on('finish', () => {
        const durationSeconds = (Date.now() - startTime) / 1000;
        const tier = (req as any).user?.tier || 'unknown';
        const endpoint = this.normalizeEndpoint(req.path);

        this.trackRequest(
          req.method,
          endpoint,
          res.statusCode,
          tier,
          durationSeconds
        );
      });

      next();
    };
  }

  /**
   * Metrics endpoint handler
   */
  async metricsHandler(req: Request, res: Response): Promise<void> {
    const metrics = await this.getAllMetrics();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  }

  /**
   * Normalize endpoint path for metrics
   */
  private normalizeEndpoint(path: string): string {
    // Replace IDs with placeholders
    return path
      .replace(/\/[a-f0-9-]{36}/g, '/:id') // UUIDs
      .replace(/\/\d+/g, '/:id'); // Numeric IDs
  }
}

// Singleton instance
export const metricsService = new MetricsService();
