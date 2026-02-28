/**
 * Usage Routes
 *
 * GET /api/v1/usage - Get current usage
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { usageTracker } = req.services;
    const usage = await usageTracker.getCurrentUsage(req.user!.id, 'month');

    res.json({
      period: 'month',
      periodStart: usage.periodStart,
      totalRequests: usage.totalRequests,
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCostUsd,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve usage' });
  }
});

export { router as usageRouter };
