/**
 * Usage Tracking Service
 *
 * Real-time usage metering for Brittney Cloud API:
 * - Track inference events (tokens, cost, latency)
 * - Publish to Redis streams (<1ms writes)
 * - Background worker to batch insert to PostgreSQL
 * - Hourly aggregation job
 * - Real-time quota enforcement
 */

import { RedisService } from './redis';
import { DatabaseService } from './database';
import pino from 'pino';

const logger = pino({ name: 'usage-tracker' });

export interface InferenceEvent {
  userId: string;
  inferenceId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  inferenceTimeMs: number;
  queueTimeMs: number;
  timestamp: Date;
}

export interface UsageSummary {
  userId: string;
  model: string;
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  period: 'hour' | 'day' | 'month';
  periodStart: Date;
}

export class UsageTracker {
  private redis: RedisService;
  private database: DatabaseService;
  private workerInterval?: NodeJS.Timeout;
  private aggregationInterval?: NodeJS.Timeout;

  // Configuration
  private readonly STREAM_KEY = 'usage:events';
  private readonly CONSUMER_GROUP = 'usage-processor';
  private readonly CONSUMER_NAME = `worker-${process.pid}`;
  private readonly BATCH_SIZE = 100;
  private readonly WORKER_INTERVAL_MS = 10000; // 10 seconds
  private readonly AGGREGATION_INTERVAL_MS = 3600000; // 1 hour

  constructor(redis: RedisService, database: DatabaseService) {
    this.redis = redis;
    this.database = database;
  }

  /**
   * Start usage tracker workers
   */
  async start(): Promise<void> {
    logger.info('Starting usage tracker...');

    // Create Redis stream consumer group
    try {
      await this.redis.xgroupCreate(
        this.STREAM_KEY,
        this.CONSUMER_GROUP,
        '$',
        { MKSTREAM: true }
      );
    } catch (error: any) {
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
      // Group already exists, continue
    }

    // Start background worker
    this.workerInterval = setInterval(
      () => this.processEvents(),
      this.WORKER_INTERVAL_MS
    );

    // Start hourly aggregation job
    this.aggregationInterval = setInterval(
      () => this.aggregateHourly(),
      this.AGGREGATION_INTERVAL_MS
    );

    logger.info('Usage tracker started');
  }

  /**
   * Stop usage tracker workers
   */
  async stop(): Promise<void> {
    logger.info('Stopping usage tracker...');

    if (this.workerInterval) {
      clearInterval(this.workerInterval);
    }

    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }

    // Process remaining events
    await this.processEvents();

    logger.info('Usage tracker stopped');
  }

  /**
   * Track a single inference event
   */
  async trackInference(event: InferenceEvent): Promise<void> {
    try {
      // Publish to Redis stream (fast write)
      await this.redis.xadd(
        this.STREAM_KEY,
        '*',
        {
          userId: event.userId,
          inferenceId: event.inferenceId,
          model: event.model,
          promptTokens: event.promptTokens.toString(),
          completionTokens: event.completionTokens.toString(),
          totalTokens: event.totalTokens.toString(),
          costUsd: event.costUsd.toString(),
          inferenceTimeMs: event.inferenceTimeMs.toString(),
          queueTimeMs: event.queueTimeMs.toString(),
          timestamp: event.timestamp.toISOString(),
        }
      );

      // Update real-time counters in Redis
      const monthKey = `usage:month:${event.userId}:${this.getCurrentMonth()}`;
      await this.redis.hincrby(monthKey, 'total_tokens', event.totalTokens);
      await this.redis.hincrby(monthKey, 'total_requests', 1);
      await this.redis.hincrbyfloat(monthKey, 'total_cost_usd', event.costUsd);
      await this.redis.expire(monthKey, 86400 * 60); // Expire after 60 days

      logger.debug({ event }, 'Inference event tracked');
    } catch (error) {
      logger.error({ error, event }, 'Failed to track inference event');
      throw error;
    }
  }

  /**
   * Get current usage for a user (real-time from Redis)
   */
  async getCurrentUsage(userId: string, period: 'month' | 'day' = 'month'): Promise<UsageSummary> {
    try {
      const key = period === 'month'
        ? `usage:month:${userId}:${this.getCurrentMonth()}`
        : `usage:day:${userId}:${this.getCurrentDay()}`;

      const data = await this.redis.hgetall(key);

      return {
        userId,
        model: 'all',
        totalRequests: parseInt(data.total_requests || '0', 10),
        totalTokens: parseInt(data.total_tokens || '0', 10),
        totalCostUsd: parseFloat(data.total_cost_usd || '0'),
        period,
        periodStart: period === 'month'
          ? this.getMonthStart()
          : this.getDayStart(),
      };
    } catch (error) {
      logger.error({ error, userId, period }, 'Failed to get current usage');
      throw error;
    }
  }

  /**
   * Check if user has exceeded quota
   */
  async checkQuota(userId: string, tier: string): Promise<{
    withinQuota: boolean;
    usedTokens: number;
    quotaTokens: number;
    percentageUsed: number;
  }> {
    const usage = await this.getCurrentUsage(userId, 'month');
    const quota = this.getQuotaForTier(tier);

    const withinQuota = usage.totalTokens < quota;
    const percentageUsed = quota > 0 ? (usage.totalTokens / quota) * 100 : 0;

    return {
      withinQuota,
      usedTokens: usage.totalTokens,
      quotaTokens: quota,
      percentageUsed,
    };
  }

  /**
   * Background worker: Process events from Redis stream to PostgreSQL
   */
  private async processEvents(): Promise<void> {
    try {
      const events = await this.redis.xreadgroup(
        this.CONSUMER_GROUP,
        this.CONSUMER_NAME,
        [{ key: this.STREAM_KEY, id: '>' }],
        { COUNT: this.BATCH_SIZE, BLOCK: 1000 }
      );

      if (!events || events.length === 0) {
        return;
      }

      const streamEvents = events[0].messages;
      logger.info({ count: streamEvents.length }, 'Processing usage events');

      // Batch insert to PostgreSQL
      const values = streamEvents.map((msg) => ({
        user_id: msg.message.userId,
        inference_id: msg.message.inferenceId,
        model: msg.message.model,
        prompt_tokens: parseInt(msg.message.promptTokens, 10),
        completion_tokens: parseInt(msg.message.completionTokens, 10),
        total_tokens: parseInt(msg.message.totalTokens, 10),
        cost_usd: parseFloat(msg.message.costUsd),
        inference_time_ms: parseInt(msg.message.inferenceTimeMs, 10),
        queue_time_ms: parseInt(msg.message.queueTimeMs, 10),
        created_at: new Date(msg.message.timestamp),
      }));

      await this.database.batchInsert('usage_events', values);

      // Acknowledge processed events
      const messageIds = streamEvents.map((msg) => msg.id);
      await this.redis.xack(this.STREAM_KEY, this.CONSUMER_GROUP, messageIds);

      logger.info({ count: streamEvents.length }, 'Usage events processed successfully');
    } catch (error) {
      logger.error({ error }, 'Error processing usage events');
    }
  }

  /**
   * Hourly aggregation job: Create hourly summaries
   */
  private async aggregateHourly(): Promise<void> {
    try {
      logger.info('Running hourly aggregation...');

      const query = `
        INSERT INTO usage_summary (user_id, model, hour, total_requests, total_tokens, total_cost_usd)
        SELECT
          user_id,
          model,
          DATE_TRUNC('hour', created_at) AS hour,
          COUNT(*) AS total_requests,
          SUM(total_tokens) AS total_tokens,
          SUM(cost_usd) AS total_cost_usd
        FROM usage_events
        WHERE created_at >= NOW() - INTERVAL '2 hours'
          AND created_at < DATE_TRUNC('hour', NOW())
        GROUP BY user_id, model, DATE_TRUNC('hour', created_at)
        ON CONFLICT (user_id, model, hour)
        DO UPDATE SET
          total_requests = usage_summary.total_requests + EXCLUDED.total_requests,
          total_tokens = usage_summary.total_tokens + EXCLUDED.total_tokens,
          total_cost_usd = usage_summary.total_cost_usd + EXCLUDED.total_cost_usd;
      `;

      const result = await this.database.query(query);
      logger.info({ rowCount: result.rowCount }, 'Hourly aggregation complete');
    } catch (error) {
      logger.error({ error }, 'Error during hourly aggregation');
    }
  }

  /**
   * Helper: Get quota for a tier
   */
  private getQuotaForTier(tier: string): number {
    const quotas: Record<string, number> = {
      free: parseInt(process.env.QUOTA_FREE_MONTHLY_TOKENS || '100000', 10),
      payg: 999999999, // Unlimited with overage
      pro: parseInt(process.env.QUOTA_PRO_MONTHLY_TOKENS || '10000000', 10),
      enterprise: 999999999, // Unlimited
    };
    return quotas[tier] || 0;
  }

  /**
   * Helper: Get current month key (YYYY-MM)
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Helper: Get current day key (YYYY-MM-DD)
   */
  private getCurrentDay(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Helper: Get month start date
   */
  private getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Helper: Get day start date
   */
  private getDayStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
