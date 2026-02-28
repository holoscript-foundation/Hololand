/**
 * Account Routes
 *
 * GET /api/v1/account - Get account details
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    tier: req.user!.tier,
  });
});

export { router as accountRouter };
