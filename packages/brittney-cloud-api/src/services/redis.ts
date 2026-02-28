/**
 * Redis Service
 *
 * Redis client wrapper for:
 * - API key caching
 * - Rate limiting (token bucket)
 * - Usage event streams
 * - Real-time counters
 */

import Redis, { RedisOptions } from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'redis-service' });

export interface RedisConfig {
  url: string;
  keyPrefix?: string;
}

export class RedisService {
  private client: Redis;
  private keyPrefix: string;

  constructor(config: RedisConfig) {
    this.keyPrefix = config.keyPrefix || '';

    const options: RedisOptions = {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    };

    this.client = new Redis(config.url, options);

    this.client.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    await this.client.connect();
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(this.prefixKey(key));
  }

  /**
   * Set value with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const prefixedKey = this.prefixKey(key);
    if (ttlSeconds) {
      await this.client.setex(prefixedKey, ttlSeconds, value);
    } else {
      await this.client.set(prefixedKey, value);
    }
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<void> {
    await this.client.del(this.prefixKey(key));
  }

  /**
   * Get hash field value
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(this.prefixKey(key), field);
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(this.prefixKey(key));
  }

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(this.prefixKey(key), field, value);
  }

  /**
   * Increment hash field (integer)
   */
  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(this.prefixKey(key), field, increment);
  }

  /**
   * Increment hash field (float)
   */
  async hincrbyfloat(key: string, field: string, increment: number): Promise<number> {
    const result = await this.client.hincrbyfloat(this.prefixKey(key), field, increment);
    return parseFloat(result);
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(this.prefixKey(key), seconds);
  }

  /**
   * Add to stream
   */
  async xadd(
    key: string,
    id: string,
    fields: Record<string, string>
  ): Promise<string> {
    const args: (string | number)[] = [this.prefixKey(key), id];
    for (const [field, value] of Object.entries(fields)) {
      args.push(field, value);
    }
    return this.client.xadd(...args);
  }

  /**
   * Create consumer group for stream
   */
  async xgroupCreate(
    key: string,
    groupName: string,
    id: string,
    options?: { MKSTREAM: boolean }
  ): Promise<void> {
    const args: (string | number)[] = [
      'CREATE',
      this.prefixKey(key),
      groupName,
      id,
    ];
    if (options?.MKSTREAM) {
      args.push('MKSTREAM');
    }
    await this.client.xgroup(...args);
  }

  /**
   * Read from stream as consumer group
   */
  async xreadgroup(
    groupName: string,
    consumerName: string,
    streams: Array<{ key: string; id: string }>,
    options?: { COUNT?: number; BLOCK?: number }
  ): Promise<Array<{ name: string; messages: Array<{ id: string; message: Record<string, string> }> }> | null> {
    const args: (string | number)[] = ['GROUP', groupName, consumerName];

    if (options?.COUNT) {
      args.push('COUNT', options.COUNT);
    }
    if (options?.BLOCK !== undefined) {
      args.push('BLOCK', options.BLOCK);
    }

    args.push('STREAMS');
    for (const stream of streams) {
      args.push(this.prefixKey(stream.key));
    }
    for (const stream of streams) {
      args.push(stream.id);
    }

    const result = await this.client.xreadgroup(...args);
    if (!result) return null;

    return result.map(([name, messages]) => ({
      name,
      messages: messages.map(([id, fields]) => ({
        id,
        message: this.parseStreamFields(fields),
      })),
    }));
  }

  /**
   * Acknowledge stream messages
   */
  async xack(key: string, groupName: string, ids: string[]): Promise<number> {
    return this.client.xack(this.prefixKey(key), groupName, ...ids);
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(this.prefixKey(key));
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    return this.client.decr(this.prefixKey(key));
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(this.prefixKey(key));
    return result === 1;
  }

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(this.prefixKey(key));
  }

  /**
   * Helper: Prefix key with namespace
   */
  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Helper: Parse stream fields array into object
   */
  private parseStreamFields(fields: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      result[fields[i]] = fields[i + 1];
    }
    return result;
  }
}
