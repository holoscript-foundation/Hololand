/**
 * Monthly Billing Job
 *
 * Runs on the 1st of each month at 3:00 AM UTC
 * Processes billing for all active paid users
 */

import { DatabaseService } from '../services/database';
import { BillingService } from '../services/billing';
import pino from 'pino';

const logger = pino({ name: 'monthly-billing-job' });

export class MonthlyBillingJob {
  private database: DatabaseService;
  private billingService: BillingService;
  private isRunning = false;

  constructor(database: DatabaseService, billingService: BillingService) {
    this.database = database;
    this.billingService = billingService;
  }

  /**
   * Run the monthly billing job
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Monthly billing job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting monthly billing job');

      // Run the billing service
      await this.billingService.runMonthlyBilling();

      const duration = Date.now() - startTime;
      logger.info({ duration }, 'Monthly billing job completed successfully');

      // Record job execution
      await this.recordJobExecution(true, duration, null);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error({ error, duration }, 'Monthly billing job failed');

      // Record job execution with error
      await this.recordJobExecution(false, duration, error.message);

      // Re-throw to trigger monitoring alerts
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Record job execution in database for audit trail
   */
  private async recordJobExecution(
    success: boolean,
    durationMs: number,
    error: string | null
  ): Promise<void> {
    try {
      await this.database.query(
        `INSERT INTO job_executions (job_name, success, duration_ms, error_message, executed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        ['monthly-billing', success, durationMs, error]
      );
    } catch (error) {
      logger.error({ error }, 'Failed to record job execution');
    }
  }

  /**
   * Check if billing should run today
   * (1st of the month)
   */
  shouldRunToday(): boolean {
    const today = new Date();
    return today.getDate() === 1;
  }

  /**
   * Check if billing has already run this month
   */
  async hasRunThisMonth(): Promise<boolean> {
    const result = await this.database.query(
      `SELECT EXISTS(
         SELECT 1 FROM job_executions
         WHERE job_name = 'monthly-billing'
           AND success = true
           AND executed_at >= DATE_TRUNC('month', NOW())
       ) AS has_run`
    );

    return result.rows[0].has_run;
  }
}
