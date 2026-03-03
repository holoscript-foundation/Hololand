/**
 * @hololand/backend -- MonitoringService
 *
 * Platform health monitoring, metrics collection, alerting, and a
 * dashboard data endpoint for the HoloLand Ground Station.
 *
 * Subsystems:
 *
 * 1. Metrics Collection -- collectMetrics()
 *    Gathers real-time platform health data:
 *    - Active users (5-minute window from PresenceTracker)
 *    - Active worlds (from PresenceTracker room count)
 *    - API response times: p50 / p95 / p99 from a sliding window
 *    - Error rate (errors / total requests in the last 5 min)
 *    - Queue depths (from QueueWorker)
 *    - Cache hit rate (from CacheLayer)
 *    - Process memory usage (from process.memoryUsage())
 *
 * 2. Alert Rule System
 *    - defineAlertRule(name, metric, operator, threshold, durationMs, callback)
 *    - evaluate() checks all rules against current metrics
 *    - alertCallback fires when a rule is triggered and resets after
 *      the metric drops below threshold for the same duration
 *
 * 3. Health Dashboard Endpoint -- getHealthDashboard()
 *    Returns all metrics formatted for the admin dashboard including
 *    status traffic-light (green/yellow/red), uptime, and alert state.
 *
 * Usage:
 *   const monitor = MonitoringService.getInstance();
 *
 *   // Record request timing
 *   monitor.recordRequest('/api/worlds', 45, false);
 *   monitor.recordRequest('/api/auth/login', 120, true);
 *
 *   // Collect current metrics snapshot
 *   const metrics = monitor.collectMetrics();
 *
 *   // Define alert rules
 *   monitor.defineAlertRule({
 *     name: 'high-error-rate',
 *     metric: 'errorRate',
 *     operator: '>',
 *     threshold: 0.05,
 *     durationMs: 60_000,
 *     callback: (rule, value) => console.error(`Alert: error rate is ${value}`),
 *   });
 *
 *   // Run evaluation (typically on an interval)
 *   monitor.evaluate();
 *
 *   // Get dashboard data
 *   const dashboard = monitor.getHealthDashboard();
 *
 * @version 1.0.0
 */

// =============================================================================
// Types
// =============================================================================

export type MetricOperator = '>' | '>=' | '<' | '<=' | '==' | '!=';

export type PlatformStatus = 'healthy' | 'degraded' | 'critical';

export interface PlatformMetrics {
  /** Timestamp when metrics were collected. */
  collectedAt: number;

  /** Number of active users in the last 5 minutes. */
  activeUsers: number;

  /** Number of active worlds (rooms with at least one peer). */
  activeWorlds: number;

  /** API response times in milliseconds. */
  responseTimesMs: {
    p50: number;
    p95: number;
    p99: number;
    mean: number;
    min: number;
    max: number;
    sampleCount: number;
  };

  /** Fraction of requests that resulted in errors (0.0 - 1.0). */
  errorRate: number;

  /** Total requests in the current window. */
  totalRequests: number;

  /** Total errors in the current window. */
  totalErrors: number;

  /** Queue depths by job type. */
  queueDepths: Record<string, number>;

  /** Total jobs across all queues. */
  totalQueuedJobs: number;

  /** Cache hit/miss statistics. */
  cacheHitRate: number;
  cacheEntries: number;

  /** Node.js process memory usage. */
  memoryUsage: {
    rssBytes: number;
    heapTotalBytes: number;
    heapUsedBytes: number;
    externalBytes: number;
    heapUsedPercent: number;
  };

  /** Process uptime in seconds. */
  uptimeSeconds: number;
}

export interface AlertRule {
  /** Unique rule name. */
  name: string;
  /** Which metric to evaluate. */
  metric: keyof Pick<PlatformMetrics, 'activeUsers' | 'activeWorlds' | 'errorRate' | 'totalRequests' | 'totalErrors' | 'totalQueuedJobs' | 'cacheHitRate' | 'cacheEntries'> | 'responseTimeP95' | 'responseTimeP99' | 'heapUsedPercent';
  /** Comparison operator. */
  operator: MetricOperator;
  /** Threshold value. */
  threshold: number;
  /** How long the condition must be true before firing (ms). */
  durationMs: number;
  /** Callback when the alert fires. */
  callback: AlertCallback;
  /** Optional: cooldown period between alert fires (ms). Default: same as durationMs. */
  cooldownMs?: number;
}

export type AlertCallback = (rule: AlertRule, currentValue: number) => void;

export interface AlertState {
  ruleName: string;
  /** Whether the condition is currently met. */
  conditionMet: boolean;
  /** Timestamp when the condition first became true. */
  conditionStartAt: number | null;
  /** Whether the alert has been fired (and not yet resolved). */
  fired: boolean;
  /** Timestamp when the alert last fired. */
  lastFiredAt: number | null;
  /** Timestamp when the alert last resolved. */
  lastResolvedAt: number | null;
  /** Current metric value. */
  currentValue: number;
}

export interface HealthDashboard {
  /** Overall platform status. */
  status: PlatformStatus;
  /** Collected metrics snapshot. */
  metrics: PlatformMetrics;
  /** Alert states. */
  alerts: AlertState[];
  /** Number of currently firing alerts. */
  firingAlerts: number;
  /** Service uptime formatted as human-readable string. */
  uptimeFormatted: string;
  /** ISO timestamp. */
  generatedAt: string;
}

export interface RequestRecord {
  path: string;
  durationMs: number;
  isError: boolean;
  timestamp: number;
}

export interface MonitoringServiceConfig {
  /** Sliding window for request metrics in ms. Default: 300000 (5 min). */
  metricsWindowMs?: number;
  /** Maximum request records to retain in the window. Default: 10000. */
  maxRequestRecords?: number;
  /** Auto-evaluation interval in ms. Set 0 to disable. Default: 30000. */
  autoEvalIntervalMs?: number;
}

// =============================================================================
// Defaults
// =============================================================================

const MONITORING_DEFAULTS: Required<MonitoringServiceConfig> = {
  metricsWindowMs: 300_000,  // 5 minutes
  maxRequestRecords: 10_000,
  autoEvalIntervalMs: 30_000,
};

// =============================================================================
// Service
// =============================================================================

export class MonitoringService {
  private static instance: MonitoringService | null = null;

  private readonly config: Required<MonitoringServiceConfig>;

  /** Sliding window of recent request records. */
  private requestRecords: RequestRecord[] = [];

  /** Alert rules. */
  private alertRules: Map<string, AlertRule> = new Map();

  /** Alert states (one per rule). */
  private alertStates: Map<string, AlertState> = new Map();

  /** Service start time for uptime calculation. */
  private readonly startedAt: number = Date.now();

  /** Auto-evaluation timer. */
  private evalTimer: ReturnType<typeof setInterval> | null = null;

  /** Externally injected metric sources (for loose coupling). */
  private metricSources: {
    getActiveUsers?: () => number;
    getActiveWorlds?: () => number;
    getQueueDepths?: () => Record<string, number>;
    getCacheHitRate?: () => number;
    getCacheEntries?: () => number;
  } = {};

  constructor(config: MonitoringServiceConfig = {}) {
    this.config = {
      metricsWindowMs: config.metricsWindowMs ?? MONITORING_DEFAULTS.metricsWindowMs,
      maxRequestRecords: config.maxRequestRecords ?? MONITORING_DEFAULTS.maxRequestRecords,
      autoEvalIntervalMs: config.autoEvalIntervalMs ?? MONITORING_DEFAULTS.autoEvalIntervalMs,
    };

    if (this.config.autoEvalIntervalMs > 0) {
      this.startAutoEval();
    }
  }

  static getInstance(config?: MonitoringServiceConfig): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService(config);
    }
    return MonitoringService.instance;
  }

  // ---------------------------------------------------------------------------
  // Metric Source Registration
  // ---------------------------------------------------------------------------

  /**
   * Register external metric source functions.
   * This allows loose coupling with PresenceTracker, CacheLayer, QueueWorker, etc.
   */
  registerMetricSources(sources: {
    getActiveUsers?: () => number;
    getActiveWorlds?: () => number;
    getQueueDepths?: () => Record<string, number>;
    getCacheHitRate?: () => number;
    getCacheEntries?: () => number;
  }): void {
    this.metricSources = { ...this.metricSources, ...sources };
  }

  // ---------------------------------------------------------------------------
  // 1. Request Recording
  // ---------------------------------------------------------------------------

  /**
   * Record an API request for metrics tracking.
   *
   * @param path       Request path (e.g. '/api/worlds').
   * @param durationMs Response time in milliseconds.
   * @param isError    Whether the response was an error (4xx/5xx).
   */
  recordRequest(path: string, durationMs: number, isError: boolean = false): void {
    const record: RequestRecord = {
      path,
      durationMs,
      isError,
      timestamp: Date.now(),
    };

    this.requestRecords.push(record);

    // Trim to max records
    if (this.requestRecords.length > this.config.maxRequestRecords) {
      this.requestRecords = this.requestRecords.slice(-this.config.maxRequestRecords);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Metrics Collection
  // ---------------------------------------------------------------------------

  /**
   * Collect a snapshot of all platform metrics.
   */
  collectMetrics(): PlatformMetrics {
    const now = Date.now();
    const windowStart = now - this.config.metricsWindowMs;

    // Filter request records within the window
    const windowRecords = this.requestRecords.filter((r) => r.timestamp > windowStart);
    const durations = windowRecords.map((r) => r.durationMs).sort((a, b) => a - b);
    const errors = windowRecords.filter((r) => r.isError);

    // Compute percentiles
    const responseTimesMs = this.computePercentiles(durations);

    // Error rate
    const errorRate = windowRecords.length > 0 ? errors.length / windowRecords.length : 0;

    // External metrics
    const activeUsers = this.metricSources.getActiveUsers?.() ?? 0;
    const activeWorlds = this.metricSources.getActiveWorlds?.() ?? 0;
    const queueDepths = this.metricSources.getQueueDepths?.() ?? {};
    const cacheHitRate = this.metricSources.getCacheHitRate?.() ?? 0;
    const cacheEntries = this.metricSources.getCacheEntries?.() ?? 0;

    const totalQueuedJobs = Object.values(queueDepths).reduce((sum, n) => sum + n, 0);

    // Memory usage
    const mem = process.memoryUsage();
    const heapUsedPercent = mem.heapTotal > 0 ? mem.heapUsed / mem.heapTotal : 0;

    return {
      collectedAt: now,
      activeUsers,
      activeWorlds,
      responseTimesMs,
      errorRate,
      totalRequests: windowRecords.length,
      totalErrors: errors.length,
      queueDepths,
      totalQueuedJobs,
      cacheHitRate,
      cacheEntries,
      memoryUsage: {
        rssBytes: mem.rss,
        heapTotalBytes: mem.heapTotal,
        heapUsedBytes: mem.heapUsed,
        externalBytes: mem.external,
        heapUsedPercent,
      },
      uptimeSeconds: Math.floor((now - this.startedAt) / 1000),
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Alert Rule System
  // ---------------------------------------------------------------------------

  /**
   * Define an alert rule. If a rule with the same name already exists,
   * it is replaced.
   */
  defineAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.name, rule);

    // Initialize state if new
    if (!this.alertStates.has(rule.name)) {
      this.alertStates.set(rule.name, {
        ruleName: rule.name,
        conditionMet: false,
        conditionStartAt: null,
        fired: false,
        lastFiredAt: null,
        lastResolvedAt: null,
        currentValue: 0,
      });
    }
  }

  /**
   * Remove an alert rule by name.
   */
  removeAlertRule(name: string): boolean {
    this.alertStates.delete(name);
    return this.alertRules.delete(name);
  }

  /**
   * Evaluate all alert rules against current metrics.
   * Fires callbacks for rules that have been in violation for their
   * configured duration.
   */
  evaluate(): void {
    const metrics = this.collectMetrics();
    const now = Date.now();

    for (const [name, rule] of this.alertRules.entries()) {
      const state = this.alertStates.get(name)!;
      const value = this.extractMetricValue(metrics, rule.metric);
      state.currentValue = value;

      const conditionMet = this.evaluateCondition(value, rule.operator, rule.threshold);

      if (conditionMet) {
        if (!state.conditionMet) {
          // Condition just became true
          state.conditionMet = true;
          state.conditionStartAt = now;
        }

        // Check if duration threshold has been exceeded
        const elapsed = now - (state.conditionStartAt ?? now);
        if (elapsed >= rule.durationMs && !state.fired) {
          // Check cooldown
          const cooldown = rule.cooldownMs ?? rule.durationMs;
          const sinceLastFire = state.lastFiredAt ? now - state.lastFiredAt : Infinity;

          if (sinceLastFire >= cooldown) {
            state.fired = true;
            state.lastFiredAt = now;

            try {
              rule.callback(rule, value);
            } catch (err) {
              console.error(`[MonitoringService] Alert callback error for "${name}":`, err);
            }
          }
        }
      } else {
        // Condition no longer met
        if (state.conditionMet) {
          state.conditionMet = false;
          state.conditionStartAt = null;

          if (state.fired) {
            state.fired = false;
            state.lastResolvedAt = now;
          }
        }
      }
    }
  }

  /**
   * Get all alert states.
   */
  getAlertStates(): AlertState[] {
    return Array.from(this.alertStates.values());
  }

  /**
   * Get the number of currently firing alerts.
   */
  getFiringAlertCount(): number {
    let count = 0;
    for (const state of this.alertStates.values()) {
      if (state.fired) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // 4. Health Dashboard
  // ---------------------------------------------------------------------------

  /**
   * Get the health dashboard data for the admin UI.
   */
  getHealthDashboard(): HealthDashboard {
    const metrics = this.collectMetrics();
    const alerts = this.getAlertStates();
    const firingAlerts = alerts.filter((a) => a.fired).length;

    // Determine overall status
    let status: PlatformStatus = 'healthy';
    if (firingAlerts > 0 || metrics.errorRate > 0.05) {
      status = 'degraded';
    }
    if (firingAlerts > 2 || metrics.errorRate > 0.15 || metrics.memoryUsage.heapUsedPercent > 0.95) {
      status = 'critical';
    }

    return {
      status,
      metrics,
      alerts,
      firingAlerts,
      uptimeFormatted: this.formatUptime(metrics.uptimeSeconds),
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Stats & Diagnostics
  // ---------------------------------------------------------------------------

  /**
   * Get monitoring service statistics.
   */
  getStats(): {
    requestRecords: number;
    alertRules: number;
    firingAlerts: number;
    uptimeSeconds: number;
  } {
    return {
      requestRecords: this.requestRecords.length,
      alertRules: this.alertRules.size,
      firingAlerts: this.getFiringAlertCount(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this.evalTimer) {
      clearInterval(this.evalTimer);
      this.evalTimer = null;
    }
    this.requestRecords = [];
    this.alertRules.clear();
    this.alertStates.clear();
    this.metricSources = {};

    if (MonitoringService.instance === this) {
      MonitoringService.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /** Start the auto-evaluation loop. */
  private startAutoEval(): void {
    this.evalTimer = setInterval(() => {
      try {
        this.evaluate();
      } catch (err) {
        console.error('[MonitoringService] Auto-evaluation error:', err);
      }
    }, this.config.autoEvalIntervalMs);

    if (this.evalTimer && typeof this.evalTimer === 'object' && 'unref' in this.evalTimer) {
      (this.evalTimer as NodeJS.Timeout).unref();
    }
  }

  /** Compute p50, p95, p99, mean, min, max from a sorted array of values. */
  private computePercentiles(sortedValues: number[]): PlatformMetrics['responseTimesMs'] {
    if (sortedValues.length === 0) {
      return { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0, sampleCount: 0 };
    }

    const n = sortedValues.length;
    const sum = sortedValues.reduce((a, b) => a + b, 0);

    return {
      p50: sortedValues[Math.floor(n * 0.50)] ?? 0,
      p95: sortedValues[Math.floor(n * 0.95)] ?? 0,
      p99: sortedValues[Math.floor(n * 0.99)] ?? 0,
      mean: Math.round(sum / n),
      min: sortedValues[0],
      max: sortedValues[n - 1],
      sampleCount: n,
    };
  }

  /** Extract a numeric metric value from the metrics object for alert evaluation. */
  private extractMetricValue(
    metrics: PlatformMetrics,
    metric: AlertRule['metric'],
  ): number {
    switch (metric) {
      case 'activeUsers':
        return metrics.activeUsers;
      case 'activeWorlds':
        return metrics.activeWorlds;
      case 'errorRate':
        return metrics.errorRate;
      case 'totalRequests':
        return metrics.totalRequests;
      case 'totalErrors':
        return metrics.totalErrors;
      case 'totalQueuedJobs':
        return metrics.totalQueuedJobs;
      case 'cacheHitRate':
        return metrics.cacheHitRate;
      case 'cacheEntries':
        return metrics.cacheEntries;
      case 'responseTimeP95':
        return metrics.responseTimesMs.p95;
      case 'responseTimeP99':
        return metrics.responseTimesMs.p99;
      case 'heapUsedPercent':
        return metrics.memoryUsage.heapUsedPercent;
      default:
        return 0;
    }
  }

  /** Evaluate a single condition. */
  private evaluateCondition(value: number, operator: MetricOperator, threshold: number): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return false;
    }
  }

  /** Format uptime seconds to a human-readable string. */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

// =============================================================================
// Singleton Accessor
// =============================================================================

export function getMonitoringService(): MonitoringService {
  return MonitoringService.getInstance();
}
