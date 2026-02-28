/**
 * Inference Routes
 *
 * POST /api/v1/inference - Run inference
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'inference-routes' });
const router = Router();

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();

  try {
    const { prompt, model = 'brittney-qwen-v23', max_tokens = 2048, temperature = 0.7, stream = false } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Missing required field: prompt' });
      return;
    }

    const inferenceId = `inf_${uuidv4().split('-')[0]}`;

    // Call Ollama inference service
    const inferenceUrl = process.env.INFERENCE_SERVICE_URL || 'http://localhost:11434';
    const queueStart = Date.now();

    const ollamaResponse = await axios.post(
      `${inferenceUrl}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options: {
          num_predict: max_tokens,
          temperature,
        },
      },
      {
        timeout: parseInt(process.env.INFERENCE_TIMEOUT_MS || '30000', 10),
      }
    );

    const queueTime = Date.now() - queueStart;
    const totalTime = Date.now() - startTime;

    const response = ollamaResponse.data.response;

    // Estimate token counts (Ollama doesn't always return these)
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(response.length / 4);
    const totalTokens = promptTokens + completionTokens;

    // Calculate cost
    const tier = req.user!.tier;
    const costPerToken = getCostPerToken(tier);
    const costUsd = (totalTokens / 1000000) * costPerToken;

    // Track usage
    const { usageTracker } = req.services;
    await usageTracker.trackInference({
      userId: req.user!.id,
      inferenceId,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd,
      inferenceTimeMs: queueTime,
      queueTimeMs: 0,
      timestamp: new Date(),
    });

    // Return response
    res.json({
      id: inferenceId,
      choices: [
        {
          message: {
            role: 'assistant',
            content: response,
          },
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      },
      performance: {
        inference_time_ms: queueTime,
        total_time_ms: totalTime,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Inference error');
    res.status(500).json({
      error: 'Inference Failed',
      message: error.message,
    });
  }
});

function getCostPerToken(tier: string): number {
  const costs: Record<string, number> = {
    free: 0,
    payg: parseFloat(process.env.PRICE_PAYG || '0.30'),
    pro: parseFloat(process.env.PRICE_PRO_OVERAGE_1 || '0.25'),
    enterprise: parseFloat(process.env.PRICE_ENTERPRISE_OVERAGE || '0.15'),
  };
  return costs[tier] || 0;
}

export { router as inferenceRouter };
