/**
 * Health Check Routes
 */

import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1',
  });
});

export { router as healthRouter };
