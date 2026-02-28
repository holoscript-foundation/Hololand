/**
 * Database Service
 *
 * PostgreSQL client wrapper for:
 * - User accounts
 * - Usage events (partitioned by month)
 * - Usage summaries (hourly aggregates)
 * - Invoices
 */

import { Pool, QueryResult } from 'pg';
import pino from 'pino';

const logger = pino({ name: 'database-service' });

export interface DatabaseConfig {
  connectionString: string;
  poolMin?: number;
  poolMax?: number;
}

export class DatabaseService {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      min: config.poolMin || 2,
      max: config.poolMax || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (error) => {
      logger.error({ error }, 'Unexpected database pool error');
    });

    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });
  }

  /**
   * Connect and verify database
   */
  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to database');
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.pool.end();
    logger.info('Database disconnected');
  }

  /**
   * Execute query
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug({ query: text, duration, rows: result.rowCount }, 'Query executed');
      return result;
    } catch (error) {
      logger.error({ error, query: text, params }, 'Query failed');
      throw error;
    }
  }

  /**
   * Batch insert records
   */
  async batchInsert(table: string, records: Record<string, any>[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const columns = Object.keys(records[0]);
    const placeholders: string[] = [];
    const values: any[] = [];

    let paramIndex = 1;
    for (const record of records) {
      const row: string[] = [];
      for (const column of columns) {
        row.push(`$${paramIndex++}`);
        values.push(record[column]);
      }
      placeholders.push(`(${row.join(', ')})`);
    }

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;

    await this.query(query, values);
  }

  /**
   * Run migrations (create tables if they don't exist)
   */
  async runMigrations(): Promise<void> {
    logger.info('Running database migrations...');

    // Users table
    await this.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        tier VARCHAR(50) NOT NULL DEFAULT 'free',
        active BOOLEAN DEFAULT true,
        stripe_customer_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // API keys table
    await this.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        key_prefix VARCHAR(50) NOT NULL,
        name VARCHAR(255),
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
    `);

    // Usage events table (partitioned by month)
    await this.query(`
      CREATE TABLE IF NOT EXISTS usage_events (
        id BIGSERIAL,
        user_id UUID NOT NULL,
        inference_id VARCHAR(50),
        model VARCHAR(50),
        prompt_tokens INT,
        completion_tokens INT,
        total_tokens INT,
        cost_usd DECIMAL(10,4),
        inference_time_ms INT,
        queue_time_ms INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, created_at)
      ) PARTITION BY RANGE (created_at);
      CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id, created_at);
    `);

    // Create partitions for current and next 3 months
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const partitionName = `usage_events_${month.getFullYear()}_${String(month.getMonth() + 1).padStart(2, '0')}`;

      await this.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName}
        PARTITION OF usage_events
        FOR VALUES FROM ('${month.toISOString()}') TO ('${nextMonth.toISOString()}');
      `);
    }

    // Usage summary table (hourly aggregates)
    await this.query(`
      CREATE TABLE IF NOT EXISTS usage_summary (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        model VARCHAR(50),
        hour TIMESTAMPTZ NOT NULL,
        total_requests INT DEFAULT 0,
        total_tokens BIGINT DEFAULT 0,
        total_cost_usd DECIMAL(10,4) DEFAULT 0,
        UNIQUE(user_id, model, hour)
      );
      CREATE INDEX IF NOT EXISTS idx_usage_summary_user_hour ON usage_summary(user_id, hour);
    `);

    // Invoices table
    await this.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(50) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        tier VARCHAR(50) NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        stripe_invoice_id VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        paid_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id, period_start);
    `);

    logger.info('Database migrations complete');
  }
}
