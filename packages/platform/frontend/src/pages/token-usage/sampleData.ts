/**
 * Sample Agent Token Usage Data
 *
 * Realistic token consumption data for the AI ecosystem agents.
 * Covers diverse agent categories with varied usage patterns,
 * model distributions, and alert conditions.
 */

import type { AgentTokenUsage, EcosystemMetrics, TokenUsageRecord } from './types';

// --- Helpers ---

function generateUsageHistory(baseTokens: number, variance: number, points: number = 24): TokenUsageRecord[] {
  const now = Date.now();
  const interval = 3600000; // 1 hour
  return Array.from({ length: points }, (_, i) => {
    const jitter = 1 + (Math.sin(i * 0.8) * 0.3) + ((Math.random() - 0.5) * variance);
    const total = Math.round(baseTokens * Math.max(0.1, jitter));
    const promptRatio = 0.55 + Math.random() * 0.15;
    const prompt = Math.round(total * promptRatio);
    const completion = total - prompt;
    return {
      timestamp: new Date(now - (points - i) * interval).toISOString(),
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens: total,
      estimatedCost: parseFloat((total * 0.000015).toFixed(4)),
    };
  });
}

// --- Agent Data ---

export const sampleAgentUsage: AgentTokenUsage[] = [
  {
    agentId: 'agent-code-reviewer',
    agentName: 'Code Reviewer',
    category: 'code-analysis',
    status: 'active',
    quotaLimit: 5000000,
    currentPeriodUsage: 3847210,
    quotaUtilization: 76.9,
    modelBreakdown: [
      { model: 'claude-opus-4-6', promptTokens: 1850000, completionTokens: 1200000, totalTokens: 3050000, estimatedCost: 45.75, callCount: 892 },
      { model: 'claude-sonnet-4', promptTokens: 420000, completionTokens: 377210, totalTokens: 797210, estimatedCost: 7.97, callCount: 315 },
    ],
    operationBreakdown: [
      { operation: 'pull-request-review', totalTokens: 2100000, count: 420, estimatedCost: 31.50 },
      { operation: 'security-scan', totalTokens: 980000, count: 245, estimatedCost: 14.70 },
      { operation: 'perf-analysis', totalTokens: 767210, count: 542, estimatedCost: 7.52 },
    ],
    usageHistory: generateUsageHistory(160000, 0.4),
    periodTotals: {
      promptTokens: 2270000,
      completionTokens: 1577210,
      totalTokens: 3847210,
      estimatedCost: 53.72,
      callCount: 1207,
      avgTokensPerCall: 3187,
      avgLatencyMs: 2340,
    },
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 100000, currentRequestRate: 42, currentTokenRate: 68000 },
    lastActivity: '2026-03-03T10:32:15Z',
    alerts: [
      { severity: 'warning', message: 'Quota utilization above 75%', triggeredAt: '2026-03-03T09:00:00Z', acknowledged: false },
    ],
  },
  {
    agentId: 'agent-test-runner',
    agentName: 'Test Runner',
    category: 'testing',
    status: 'active',
    quotaLimit: 3000000,
    currentPeriodUsage: 2145600,
    quotaUtilization: 71.5,
    modelBreakdown: [
      { model: 'claude-sonnet-4', promptTokens: 1200000, completionTokens: 745600, totalTokens: 1945600, estimatedCost: 19.46, callCount: 680 },
      { model: 'claude-haiku-3.5', promptTokens: 120000, completionTokens: 80000, totalTokens: 200000, estimatedCost: 0.50, callCount: 200 },
    ],
    operationBreakdown: [
      { operation: 'test-generation', totalTokens: 1200000, count: 340, estimatedCost: 12.00 },
      { operation: 'test-selection', totalTokens: 545600, count: 280, estimatedCost: 5.46 },
      { operation: 'flaky-test-analysis', totalTokens: 400000, count: 260, estimatedCost: 2.50 },
    ],
    usageHistory: generateUsageHistory(89400, 0.5),
    periodTotals: {
      promptTokens: 1320000,
      completionTokens: 825600,
      totalTokens: 2145600,
      estimatedCost: 19.96,
      callCount: 880,
      avgTokensPerCall: 2438,
      avgLatencyMs: 1820,
    },
    rateLimit: { requestsPerMinute: 40, tokensPerMinute: 80000, currentRequestRate: 28, currentTokenRate: 52000 },
    lastActivity: '2026-03-03T10:31:47Z',
    alerts: [],
  },
  {
    agentId: 'agent-k8s-operator',
    agentName: 'Kubernetes Operator',
    category: 'infrastructure',
    status: 'active',
    quotaLimit: 4000000,
    currentPeriodUsage: 3680000,
    quotaUtilization: 92.0,
    modelBreakdown: [
      { model: 'claude-opus-4-6', promptTokens: 2100000, completionTokens: 1180000, totalTokens: 3280000, estimatedCost: 49.20, callCount: 640 },
      { model: 'claude-sonnet-4', promptTokens: 250000, completionTokens: 150000, totalTokens: 400000, estimatedCost: 4.00, callCount: 120 },
    ],
    operationBreakdown: [
      { operation: 'deployment-rollout', totalTokens: 1500000, count: 180, estimatedCost: 22.50 },
      { operation: 'incident-diagnosis', totalTokens: 1280000, count: 220, estimatedCost: 19.20 },
      { operation: 'scaling-decision', totalTokens: 500000, count: 180, estimatedCost: 7.50 },
      { operation: 'security-audit', totalTokens: 400000, count: 180, estimatedCost: 4.00 },
    ],
    usageHistory: generateUsageHistory(153000, 0.3),
    periodTotals: {
      promptTokens: 2350000,
      completionTokens: 1330000,
      totalTokens: 3680000,
      estimatedCost: 53.20,
      callCount: 760,
      avgTokensPerCall: 4842,
      avgLatencyMs: 3200,
    },
    rateLimit: { requestsPerMinute: 50, tokensPerMinute: 90000, currentRequestRate: 45, currentTokenRate: 85000 },
    lastActivity: '2026-03-03T10:33:02Z',
    alerts: [
      { severity: 'critical', message: 'Quota utilization above 90% - throttling imminent', triggeredAt: '2026-03-03T10:15:00Z', acknowledged: false },
      { severity: 'warning', message: 'Token rate approaching limit (94%)', triggeredAt: '2026-03-03T10:20:00Z', acknowledged: false },
    ],
  },
  {
    agentId: 'agent-data-transformer',
    agentName: 'Data Transformer',
    category: 'data-processing',
    status: 'idle',
    quotaLimit: 2000000,
    currentPeriodUsage: 845300,
    quotaUtilization: 42.3,
    modelBreakdown: [
      { model: 'claude-sonnet-4', promptTokens: 500000, completionTokens: 295300, totalTokens: 795300, estimatedCost: 7.95, callCount: 310 },
      { model: 'claude-haiku-3.5', promptTokens: 30000, completionTokens: 20000, totalTokens: 50000, estimatedCost: 0.13, callCount: 50 },
    ],
    operationBreakdown: [
      { operation: 'format-conversion', totalTokens: 420000, count: 180, estimatedCost: 4.20 },
      { operation: 'schema-validation', totalTokens: 225300, count: 100, estimatedCost: 2.25 },
      { operation: 'pipeline-transform', totalTokens: 200000, count: 80, estimatedCost: 1.63 },
    ],
    usageHistory: generateUsageHistory(35200, 0.6),
    periodTotals: {
      promptTokens: 530000,
      completionTokens: 315300,
      totalTokens: 845300,
      estimatedCost: 8.08,
      callCount: 360,
      avgTokensPerCall: 2348,
      avgLatencyMs: 1450,
    },
    rateLimit: { requestsPerMinute: 30, tokensPerMinute: 60000, currentRequestRate: 2, currentTokenRate: 3200 },
    lastActivity: '2026-03-03T09:45:22Z',
    alerts: [],
  },
  {
    agentId: 'agent-content-writer',
    agentName: 'Content Writer',
    category: 'content-generation',
    status: 'offline',
    quotaLimit: 3000000,
    currentPeriodUsage: 1250000,
    quotaUtilization: 41.7,
    modelBreakdown: [
      { model: 'claude-opus-4-6', promptTokens: 600000, completionTokens: 500000, totalTokens: 1100000, estimatedCost: 16.50, callCount: 220 },
      { model: 'claude-sonnet-4', promptTokens: 80000, completionTokens: 70000, totalTokens: 150000, estimatedCost: 1.50, callCount: 60 },
    ],
    operationBreakdown: [
      { operation: 'article-generation', totalTokens: 800000, count: 160, estimatedCost: 12.00 },
      { operation: 'seo-optimization', totalTokens: 450000, count: 120, estimatedCost: 6.00 },
    ],
    usageHistory: generateUsageHistory(52000, 0.7),
    periodTotals: {
      promptTokens: 680000,
      completionTokens: 570000,
      totalTokens: 1250000,
      estimatedCost: 18.00,
      callCount: 280,
      avgTokensPerCall: 4464,
      avgLatencyMs: 4100,
    },
    rateLimit: { requestsPerMinute: 20, tokensPerMinute: 50000, currentRequestRate: 0, currentTokenRate: 0 },
    lastActivity: '2026-03-03T08:12:00Z',
    alerts: [
      { severity: 'info', message: 'Agent has been offline for 2+ hours', triggeredAt: '2026-03-03T10:12:00Z', acknowledged: true },
    ],
  },
  {
    agentId: 'agent-email-assistant',
    agentName: 'Email Assistant',
    category: 'communication',
    status: 'active',
    quotaLimit: 1500000,
    currentPeriodUsage: 678400,
    quotaUtilization: 45.2,
    modelBreakdown: [
      { model: 'claude-sonnet-4', promptTokens: 380000, completionTokens: 248400, totalTokens: 628400, estimatedCost: 6.28, callCount: 420 },
      { model: 'claude-haiku-3.5', promptTokens: 30000, completionTokens: 20000, totalTokens: 50000, estimatedCost: 0.13, callCount: 100 },
    ],
    operationBreakdown: [
      { operation: 'draft-reply', totalTokens: 340000, count: 220, estimatedCost: 3.40 },
      { operation: 'thread-summary', totalTokens: 210000, count: 140, estimatedCost: 2.10 },
      { operation: 'action-extraction', totalTokens: 128400, count: 160, estimatedCost: 0.91 },
    ],
    usageHistory: generateUsageHistory(28200, 0.5),
    periodTotals: {
      promptTokens: 410000,
      completionTokens: 268400,
      totalTokens: 678400,
      estimatedCost: 6.41,
      callCount: 520,
      avgTokensPerCall: 1305,
      avgLatencyMs: 890,
    },
    rateLimit: { requestsPerMinute: 30, tokensPerMinute: 40000, currentRequestRate: 12, currentTokenRate: 15200 },
    lastActivity: '2026-03-03T10:29:55Z',
    alerts: [],
  },
  {
    agentId: 'agent-doc-search',
    agentName: 'Documentation Search',
    category: 'search',
    status: 'active',
    quotaLimit: 2500000,
    currentPeriodUsage: 1920000,
    quotaUtilization: 76.8,
    modelBreakdown: [
      { model: 'claude-sonnet-4', promptTokens: 1100000, completionTokens: 620000, totalTokens: 1720000, estimatedCost: 17.20, callCount: 860 },
      { model: 'claude-haiku-3.5', promptTokens: 120000, completionTokens: 80000, totalTokens: 200000, estimatedCost: 0.50, callCount: 400 },
    ],
    operationBreakdown: [
      { operation: 'semantic-search', totalTokens: 950000, count: 620, estimatedCost: 9.50 },
      { operation: 'rag-answer', totalTokens: 770000, count: 440, estimatedCost: 7.70 },
      { operation: 'document-indexing', totalTokens: 200000, count: 200, estimatedCost: 0.50 },
    ],
    usageHistory: generateUsageHistory(80000, 0.35),
    periodTotals: {
      promptTokens: 1220000,
      completionTokens: 700000,
      totalTokens: 1920000,
      estimatedCost: 17.70,
      callCount: 1260,
      avgTokensPerCall: 1524,
      avgLatencyMs: 650,
    },
    rateLimit: { requestsPerMinute: 80, tokensPerMinute: 120000, currentRequestRate: 55, currentTokenRate: 78000 },
    lastActivity: '2026-03-03T10:33:40Z',
    alerts: [
      { severity: 'warning', message: 'Quota utilization above 75%', triggeredAt: '2026-03-03T08:30:00Z', acknowledged: true },
    ],
  },
  {
    agentId: 'agent-workflow-engine',
    agentName: 'Workflow Orchestrator',
    category: 'orchestration',
    status: 'active',
    quotaLimit: 6000000,
    currentPeriodUsage: 4510000,
    quotaUtilization: 75.2,
    modelBreakdown: [
      { model: 'claude-opus-4-6', promptTokens: 2200000, completionTokens: 1500000, totalTokens: 3700000, estimatedCost: 55.50, callCount: 520 },
      { model: 'claude-sonnet-4', promptTokens: 480000, completionTokens: 330000, totalTokens: 810000, estimatedCost: 8.10, callCount: 270 },
    ],
    operationBreakdown: [
      { operation: 'workflow-execution', totalTokens: 2200000, count: 310, estimatedCost: 33.00 },
      { operation: 'workflow-creation', totalTokens: 1310000, count: 180, estimatedCost: 19.65 },
      { operation: 'status-check', totalTokens: 1000000, count: 300, estimatedCost: 10.95 },
    ],
    usageHistory: generateUsageHistory(188000, 0.25),
    periodTotals: {
      promptTokens: 2680000,
      completionTokens: 1830000,
      totalTokens: 4510000,
      estimatedCost: 63.60,
      callCount: 790,
      avgTokensPerCall: 5709,
      avgLatencyMs: 4500,
    },
    rateLimit: { requestsPerMinute: 40, tokensPerMinute: 150000, currentRequestRate: 32, currentTokenRate: 118000 },
    lastActivity: '2026-03-03T10:34:10Z',
    alerts: [
      { severity: 'warning', message: 'Quota utilization above 75%', triggeredAt: '2026-03-03T09:45:00Z', acknowledged: false },
    ],
  },
  {
    agentId: 'agent-image-analyzer',
    agentName: 'Image Analyzer',
    category: 'data-processing',
    status: 'rate-limited',
    quotaLimit: 2000000,
    currentPeriodUsage: 1960000,
    quotaUtilization: 98.0,
    modelBreakdown: [
      { model: 'claude-opus-4-6', promptTokens: 1200000, completionTokens: 560000, totalTokens: 1760000, estimatedCost: 26.40, callCount: 440 },
      { model: 'claude-sonnet-4', promptTokens: 120000, completionTokens: 80000, totalTokens: 200000, estimatedCost: 2.00, callCount: 80 },
    ],
    operationBreakdown: [
      { operation: 'image-classification', totalTokens: 980000, count: 260, estimatedCost: 14.70 },
      { operation: 'object-detection', totalTokens: 580000, count: 140, estimatedCost: 8.70 },
      { operation: 'ocr-extraction', totalTokens: 400000, count: 120, estimatedCost: 5.00 },
    ],
    usageHistory: generateUsageHistory(81600, 0.2),
    periodTotals: {
      promptTokens: 1320000,
      completionTokens: 640000,
      totalTokens: 1960000,
      estimatedCost: 28.40,
      callCount: 520,
      avgTokensPerCall: 3769,
      avgLatencyMs: 2800,
    },
    rateLimit: { requestsPerMinute: 30, tokensPerMinute: 60000, currentRequestRate: 30, currentTokenRate: 60000 },
    lastActivity: '2026-03-03T10:30:05Z',
    alerts: [
      { severity: 'critical', message: 'Rate limit reached - requests are being throttled', triggeredAt: '2026-03-03T10:28:00Z', acknowledged: false },
      { severity: 'critical', message: 'Quota utilization at 98% - approaching hard limit', triggeredAt: '2026-03-03T10:25:00Z', acknowledged: false },
    ],
  },
  {
    agentId: 'agent-db-query',
    agentName: 'Database Query Agent',
    category: 'data-processing',
    status: 'active',
    quotaLimit: 1000000,
    currentPeriodUsage: 412000,
    quotaUtilization: 41.2,
    modelBreakdown: [
      { model: 'claude-sonnet-4', promptTokens: 250000, completionTokens: 142000, totalTokens: 392000, estimatedCost: 3.92, callCount: 340 },
      { model: 'claude-haiku-3.5', promptTokens: 12000, completionTokens: 8000, totalTokens: 20000, estimatedCost: 0.05, callCount: 40 },
    ],
    operationBreakdown: [
      { operation: 'natural-to-sql', totalTokens: 280000, count: 240, estimatedCost: 2.80 },
      { operation: 'query-optimization', totalTokens: 132000, count: 140, estimatedCost: 1.17 },
    ],
    usageHistory: generateUsageHistory(17200, 0.45),
    periodTotals: {
      promptTokens: 262000,
      completionTokens: 150000,
      totalTokens: 412000,
      estimatedCost: 3.97,
      callCount: 380,
      avgTokensPerCall: 1084,
      avgLatencyMs: 720,
    },
    rateLimit: { requestsPerMinute: 40, tokensPerMinute: 50000, currentRequestRate: 18, currentTokenRate: 19500 },
    lastActivity: '2026-03-03T10:27:33Z',
    alerts: [],
  },
  {
    agentId: 'agent-translation',
    agentName: 'Translation Service',
    category: 'content-generation',
    status: 'idle',
    quotaLimit: 1500000,
    currentPeriodUsage: 320000,
    quotaUtilization: 21.3,
    modelBreakdown: [
      { model: 'claude-sonnet-4', promptTokens: 180000, completionTokens: 120000, totalTokens: 300000, estimatedCost: 3.00, callCount: 150 },
      { model: 'claude-haiku-3.5', promptTokens: 12000, completionTokens: 8000, totalTokens: 20000, estimatedCost: 0.05, callCount: 20 },
    ],
    operationBreakdown: [
      { operation: 'text-translation', totalTokens: 260000, count: 130, estimatedCost: 2.60 },
      { operation: 'language-detection', totalTokens: 60000, count: 40, estimatedCost: 0.45 },
    ],
    usageHistory: generateUsageHistory(13300, 0.55),
    periodTotals: {
      promptTokens: 192000,
      completionTokens: 128000,
      totalTokens: 320000,
      estimatedCost: 3.05,
      callCount: 170,
      avgTokensPerCall: 1882,
      avgLatencyMs: 1100,
    },
    rateLimit: { requestsPerMinute: 30, tokensPerMinute: 40000, currentRequestRate: 1, currentTokenRate: 1800 },
    lastActivity: '2026-03-02T22:15:00Z',
    alerts: [],
  },
  {
    agentId: 'agent-log-analyzer',
    agentName: 'Log Analyzer',
    category: 'infrastructure',
    status: 'active',
    quotaLimit: 3500000,
    currentPeriodUsage: 2890000,
    quotaUtilization: 82.6,
    modelBreakdown: [
      { model: 'claude-opus-4-6', promptTokens: 1600000, completionTokens: 890000, totalTokens: 2490000, estimatedCost: 37.35, callCount: 430 },
      { model: 'claude-haiku-3.5', promptTokens: 250000, completionTokens: 150000, totalTokens: 400000, estimatedCost: 1.00, callCount: 800 },
    ],
    operationBreakdown: [
      { operation: 'anomaly-detection', totalTokens: 1690000, count: 580, estimatedCost: 25.35 },
      { operation: 'event-correlation', totalTokens: 1200000, count: 650, estimatedCost: 13.00 },
    ],
    usageHistory: generateUsageHistory(120400, 0.3),
    periodTotals: {
      promptTokens: 1850000,
      completionTokens: 1040000,
      totalTokens: 2890000,
      estimatedCost: 38.35,
      callCount: 1230,
      avgTokensPerCall: 2350,
      avgLatencyMs: 1680,
    },
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 100000, currentRequestRate: 48, currentTokenRate: 82000 },
    lastActivity: '2026-03-03T10:34:22Z',
    alerts: [
      { severity: 'warning', message: 'Quota utilization above 80%', triggeredAt: '2026-03-03T07:00:00Z', acknowledged: true },
    ],
  },
];

// --- Ecosystem aggregate ---

export function computeEcosystemMetrics(agents: AgentTokenUsage[]): EcosystemMetrics {
  const totalTokens = agents.reduce((sum, a) => sum + a.periodTotals.totalTokens, 0);
  const totalCost = agents.reduce((sum, a) => sum + a.periodTotals.estimatedCost, 0);
  const totalCalls = agents.reduce((sum, a) => sum + a.periodTotals.callCount, 0);
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const rateLimitedAgents = agents.filter(a => a.status === 'rate-limited').length;
  const activeAlerts = agents.reduce(
    (sum, a) => sum + a.alerts.filter(al => !al.acknowledged).length,
    0,
  );
  const tokensPerMinute = agents.reduce((sum, a) => sum + a.rateLimit.currentTokenRate, 0);

  return {
    totalTokens,
    totalCost: parseFloat(totalCost.toFixed(2)),
    totalCalls,
    activeAgents,
    rateLimitedAgents,
    activeAlerts,
    tokensPerMinute,
    costTrend: 12.4,
    usageTrend: 8.7,
  };
}
