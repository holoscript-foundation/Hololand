/**
 * User Dashboard Routes
 *
 * GET /api/v1/dashboard - Get user usage dashboard data
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { usageTracker, database } = req.services;
    const userId = req.user!.id;
    const tier = req.user!.tier;

    // Get current month usage
    const currentUsage = await usageTracker.getCurrentUsage(userId, 'month');

    // Get quota info
    const quotaInfo = await usageTracker.checkQuota(userId, tier);

    // Get historical usage (last 6 months)
    const historicalQuery = `
      SELECT
        DATE_TRUNC('month', hour) AS month,
        SUM(total_requests) AS total_requests,
        SUM(total_tokens) AS total_tokens,
        SUM(total_cost_usd) AS total_cost_usd
      FROM usage_summary
      WHERE user_id = $1
        AND hour >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', hour)
      ORDER BY month DESC
      LIMIT 6;
    `;

    const historicalResult = await database.query(historicalQuery, [userId]);

    // Get usage by model (current month)
    const modelUsageQuery = `
      SELECT
        model,
        SUM(total_requests) AS total_requests,
        SUM(total_tokens) AS total_tokens,
        SUM(total_cost_usd) AS total_cost_usd
      FROM usage_summary
      WHERE user_id = $1
        AND hour >= DATE_TRUNC('month', NOW())
      GROUP BY model;
    `;

    const modelUsageResult = await database.query(modelUsageQuery, [userId]);

    // Get daily trend (last 30 days)
    const dailyTrendQuery = `
      SELECT
        DATE_TRUNC('day', hour) AS day,
        SUM(total_requests) AS total_requests,
        SUM(total_tokens) AS total_tokens
      FROM usage_summary
      WHERE user_id = $1
        AND hour >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', hour)
      ORDER BY day ASC;
    `;

    const dailyTrendResult = await database.query(dailyTrendQuery, [userId]);

    // Calculate cost projection
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    const currentDay = new Date().getDate();
    const projectedMonthlyTokens = (currentUsage.totalTokens / currentDay) * daysInMonth;
    const projectedMonthlyCost = (currentUsage.totalCostUsd / currentDay) * daysInMonth;

    // Get recent invoices
    const invoicesQuery = `
      SELECT
        id,
        period_start,
        period_end,
        total,
        status,
        created_at
      FROM invoices
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 6;
    `;

    const invoicesResult = await database.query(invoicesQuery, [userId]);

    res.json({
      tier,
      currentMonth: {
        periodStart: currentUsage.periodStart,
        requests: currentUsage.totalRequests,
        tokens: currentUsage.totalTokens,
        cost: currentUsage.totalCostUsd,
      },
      quota: {
        used: quotaInfo.usedTokens,
        limit: quotaInfo.quotaTokens,
        percentageUsed: quotaInfo.percentageUsed,
        withinQuota: quotaInfo.withinQuota,
      },
      projection: {
        monthlyTokens: Math.round(projectedMonthlyTokens),
        monthlyCost: Number(projectedMonthlyCost.toFixed(2)),
      },
      historical: historicalResult.rows.map((row) => ({
        month: row.month,
        requests: parseInt(row.total_requests, 10),
        tokens: parseInt(row.total_tokens, 10),
        cost: parseFloat(row.total_cost_usd),
      })),
      byModel: modelUsageResult.rows.map((row) => ({
        model: row.model,
        requests: parseInt(row.total_requests, 10),
        tokens: parseInt(row.total_tokens, 10),
        cost: parseFloat(row.total_cost_usd),
      })),
      dailyTrend: dailyTrendResult.rows.map((row) => ({
        day: row.day,
        requests: parseInt(row.total_requests, 10),
        tokens: parseInt(row.total_tokens, 10),
      })),
      recentInvoices: invoicesResult.rows.map((row) => ({
        id: row.id,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        total: parseFloat(row.total),
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

export { router as dashboardRouter };
