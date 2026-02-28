/**
 * Job Scheduler
 *
 * Manages all scheduled jobs:
 * - Monthly billing (1st of month at 3:00 AM UTC)
 * - Usage cleanup (daily at 2:00 AM UTC)
 * - Metrics aggregation (hourly)
 */

import { CronJob } from 'cron';
import { DatabaseService } from '../services/database';
import { BillingService } from '../services/billing';
import { MonthlyBillingJob } from './monthly-billing';
import pino from 'pino';

const logger = pino({ name: 'job-scheduler' });

export class JobScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private monthlyBillingJob: MonthlyBillingJob;

  constructor(database: DatabaseService, billingService: BillingService) {
    this.monthlyBillingJob = new MonthlyBillingJob(database, billingService);
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    logger.info('Starting job scheduler');

    // Monthly billing job (1st of month at 3:00 AM UTC)
    const monthlyBilling = new CronJob(
      '0 3 1 * *', // cron: minute hour day month dayOfWeek
      async () => {
        try {
          // Double-check it should run and hasn't already
          if (
            this.monthlyBillingJob.shouldRunToday() &&
            !(await this.monthlyBillingJob.hasRunThisMonth())
          ) {
            await this.monthlyBillingJob.run();
          } else {
            logger.info('Monthly billing already ran this month, skipping');
          }
        } catch (error) {
          logger.error({ error }, 'Monthly billing job failed');
        }
      },
      null,
      true,
      'UTC'
    );

    this.jobs.set('monthly-billing', monthlyBilling);
    logger.info('Monthly billing job scheduled (1st of month at 3:00 AM UTC)');

    // Usage cleanup job (daily at 2:00 AM UTC)
    // Deletes usage events older than 90 days to save space
    const usageCleanup = new CronJob(
      '0 2 * * *',
      async () => {
        try {
          logger.info('Running usage cleanup job');
          // TODO: Implement usage cleanup
          logger.info('Usage cleanup job completed');
        } catch (error) {
          logger.error({ error }, 'Usage cleanup job failed');
        }
      },
      null,
      true,
      'UTC'
    );

    this.jobs.set('usage-cleanup', usageCleanup);
    logger.info('Usage cleanup job scheduled (daily at 2:00 AM UTC)');

    // Hourly metrics aggregation
    const metricsAggregation = new CronJob(
      '0 * * * *',
      async () => {
        try {
          logger.info('Running metrics aggregation');
          // Aggregation is already handled by UsageTracker
          logger.debug('Metrics aggregation triggered');
        } catch (error) {
          logger.error({ error }, 'Metrics aggregation failed');
        }
      },
      null,
      true,
      'UTC'
    );

    this.jobs.set('metrics-aggregation', metricsAggregation);
    logger.info('Metrics aggregation job scheduled (hourly)');

    logger.info({ jobCount: this.jobs.size }, 'Job scheduler started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    logger.info('Stopping job scheduler');

    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      logger.debug({ job: name }, 'Stopped job');
    }

    this.jobs.clear();
    logger.info('Job scheduler stopped');
  }

  /**
   * Manually trigger a job (for testing)
   */
  async triggerJob(jobName: string): Promise<void> {
    switch (jobName) {
      case 'monthly-billing':
        await this.monthlyBillingJob.run();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  /**
   * Get job status
   */
  getStatus(): Array<{ name: string; running: boolean }> {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.running,
    }));
  }
}
