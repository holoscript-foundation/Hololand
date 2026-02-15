/**
 * @hololand/inference - Cost Tracker
 *
 * Tracks per-call costs across all providers for budgeting and smart routing.
 * Pricing data from public provider pricing pages (as of Feb 2026).
 */

import type { ProviderType, InferenceResponse } from './types.js';

// =============================================================================
// Types
// =============================================================================

export interface CallCostRecord {
  provider: ProviderType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: number;
}

export interface CostSummary {
  period: string;
  totalCostUsd: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byProvider: Record<string, { calls: number; costUsd: number; tokens: number }>;
  byModel: Record<string, { calls: number; costUsd: number }>;
}

export interface ModelPricing {
  inputPer1M: number;   // USD per 1M input tokens
  outputPer1M: number;  // USD per 1M output tokens
}

// =============================================================================
// Pricing Data (USD per 1M tokens)
// =============================================================================

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // DeepSeek (86% cheaper than GPT-4)
  'deepseek-chat':       { inputPer1M: 0.14,  outputPer1M: 0.28 },
  'deepseek-coder':      { inputPer1M: 0.14,  outputPer1M: 0.28 },
  'deepseek-reasoner':   { inputPer1M: 0.55,  outputPer1M: 2.19 },

  // OpenAI
  'gpt-4o':              { inputPer1M: 2.50,  outputPer1M: 10.00 },
  'gpt-4o-mini':         { inputPer1M: 0.15,  outputPer1M: 0.60 },
  'gpt-4-turbo':         { inputPer1M: 10.00, outputPer1M: 30.00 },
  'o1':                  { inputPer1M: 15.00, outputPer1M: 60.00 },

  // Anthropic
  'claude-opus-4-6':              { inputPer1M: 15.00, outputPer1M: 75.00 },
  'claude-sonnet-4-5-20250929':   { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'claude-haiku-4-5-20251001':    { inputPer1M: 0.80,  outputPer1M: 4.00 },

  // Google Gemini
  'gemini-2.0-flash':    { inputPer1M: 0.075, outputPer1M: 0.30 },
  'gemini-2.0-pro':      { inputPer1M: 1.25,  outputPer1M: 5.00 },

  // Grok (xAI)
  'grok-3':              { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'grok-3-mini':         { inputPer1M: 0.30,  outputPer1M: 0.50 },

  // Local (Ollama) - free
  'mistral-nemo:12b':    { inputPer1M: 0, outputPer1M: 0 },
  'llama3.1:8b':         { inputPer1M: 0, outputPer1M: 0 },
  'qwen2.5-coder:7b':    { inputPer1M: 0, outputPer1M: 0 },
};

// =============================================================================
// Cost Tracker
// =============================================================================

const costRecords: CallCostRecord[] = [];

export class CostTracker {
  /**
   * Record a call's cost from an InferenceResponse.
   */
  recordCall(response: InferenceResponse): CallCostRecord {
    const inputTokens = response.usage?.promptTokens ?? 0;
    const outputTokens = response.usage?.completionTokens ?? 0;
    const costUsd = this.calculateCost(response.model, inputTokens, outputTokens);

    const record: CallCostRecord = {
      provider: response.provider as ProviderType,
      model: response.model,
      inputTokens,
      outputTokens,
      costUsd,
      timestamp: Date.now(),
    };

    costRecords.push(record);
    return record;
  }

  /**
   * Calculate cost for a given model and token counts.
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) return 0; // Unknown model = assume free/unpriced

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
    return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal places
  }

  /**
   * Get aggregated cost summary for a period (YYYY-MM or 'all').
   */
  getCostSummary(period?: string): CostSummary {
    const p = period ?? currentPeriod();
    const records = p === 'all'
      ? costRecords
      : costRecords.filter(r => toPeriod(r.timestamp) === p);

    const byProvider: CostSummary['byProvider'] = {};
    const byModel: CostSummary['byModel'] = {};
    let totalCostUsd = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const r of records) {
      totalCostUsd += r.costUsd;
      totalInputTokens += r.inputTokens;
      totalOutputTokens += r.outputTokens;

      if (!byProvider[r.provider]) {
        byProvider[r.provider] = { calls: 0, costUsd: 0, tokens: 0 };
      }
      byProvider[r.provider].calls++;
      byProvider[r.provider].costUsd += r.costUsd;
      byProvider[r.provider].tokens += r.inputTokens + r.outputTokens;

      if (!byModel[r.model]) {
        byModel[r.model] = { calls: 0, costUsd: 0 };
      }
      byModel[r.model].calls++;
      byModel[r.model].costUsd += r.costUsd;
    }

    return {
      period: p,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      totalCalls: records.length,
      totalInputTokens,
      totalOutputTokens,
      byProvider,
      byModel,
    };
  }

  /**
   * Get the cheapest provider+model that meets a quality threshold.
   * Quality levels: 'high' (opus/gpt-4o), 'medium' (sonnet/gpt-4o-mini/deepseek), 'low' (haiku/flash/local)
   */
  getSmartRouteRecommendation(quality: 'high' | 'medium' | 'low' = 'medium'): {
    provider: ProviderType;
    model: string;
    estimatedCostPer1kTokens: number;
  } {
    const tiers: Record<string, { provider: ProviderType; model: string }[]> = {
      high: [
        { provider: 'deepseek', model: 'deepseek-reasoner' },
        { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'grok', model: 'grok-3' },
      ],
      medium: [
        { provider: 'deepseek', model: 'deepseek-chat' },
        { provider: 'google', model: 'gemini-2.0-flash' },
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'grok', model: 'grok-3-mini' },
      ],
      low: [
        { provider: 'local', model: 'mistral-nemo:12b' },
        { provider: 'deepseek', model: 'deepseek-chat' },
        { provider: 'google', model: 'gemini-2.0-flash' },
      ],
    };

    const candidates = tiers[quality];
    let cheapest = candidates[0];
    let cheapestCost = Infinity;

    for (const c of candidates) {
      const pricing = MODEL_PRICING[c.model];
      if (!pricing) continue;
      // Average of input + output per 1k tokens
      const avgCost = ((pricing.inputPer1M + pricing.outputPer1M) / 2) / 1000;
      if (avgCost < cheapestCost) {
        cheapestCost = avgCost;
        cheapest = c;
      }
    }

    return {
      ...cheapest,
      estimatedCostPer1kTokens: Math.round(cheapestCost * 1_000_000) / 1_000_000,
    };
  }

  /** Prune old records */
  prune(monthsToKeep: number = 6): number {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsToKeep);
    const cutoffTs = cutoff.getTime();
    let i = 0;
    while (i < costRecords.length && costRecords[i].timestamp < cutoffTs) i++;
    costRecords.splice(0, i);
    return i;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toPeriod(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Singleton
let instance: CostTracker | null = null;
export function getCostTracker(): CostTracker {
  if (!instance) instance = new CostTracker();
  return instance;
}
