/**
 * Token Usage Dashboard Type Definitions
 *
 * Data models for tracking real-time per-agent token consumption
 * across the AI ecosystem. Supports granular breakdown by model,
 * operation type, and time period.
 */

// --- Core Token Usage ---

export interface TokenUsageRecord {
  /** ISO timestamp of the usage record */
  timestamp: string;
  /** Number of prompt/input tokens consumed */
  promptTokens: number;
  /** Number of completion/output tokens consumed */
  completionTokens: number;
  /** Total tokens (prompt + completion) */
  totalTokens: number;
  /** Estimated cost in USD */
  estimatedCost: number;
}

export interface ModelUsageBreakdown {
  /** Model identifier (e.g., "claude-opus-4-6", "gpt-4o") */
  model: string;
  /** Total prompt tokens for this model */
  promptTokens: number;
  /** Total completion tokens for this model */
  completionTokens: number;
  /** Total tokens for this model */
  totalTokens: number;
  /** Estimated cost for this model's usage */
  estimatedCost: number;
  /** Number of API calls made to this model */
  callCount: number;
}

export interface OperationUsageBreakdown {
  /** Operation type (e.g., "code-review", "test-generation", "deployment") */
  operation: string;
  /** Total tokens consumed by this operation type */
  totalTokens: number;
  /** Number of times this operation was performed */
  count: number;
  /** Estimated cost for this operation type */
  estimatedCost: number;
}

// --- Per-Agent Usage ---

export interface AgentTokenUsage {
  /** Unique agent identifier */
  agentId: string;
  /** Human-readable agent name */
  agentName: string;
  /** Agent category/role */
  category: AgentCategory;
  /** Current status of the agent */
  status: 'active' | 'idle' | 'rate-limited' | 'offline';
  /** Token quota limit per period (0 = unlimited) */
  quotaLimit: number;
  /** Current period token usage */
  currentPeriodUsage: number;
  /** Percentage of quota used */
  quotaUtilization: number;
  /** Token usage broken down by model */
  modelBreakdown: ModelUsageBreakdown[];
  /** Token usage broken down by operation type */
  operationBreakdown: OperationUsageBreakdown[];
  /** Time-series usage data (last 24 data points) */
  usageHistory: TokenUsageRecord[];
  /** Cumulative totals for current billing period */
  periodTotals: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    callCount: number;
    avgTokensPerCall: number;
    avgLatencyMs: number;
  };
  /** Rate limit info */
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    currentRequestRate: number;
    currentTokenRate: number;
  };
  /** Last activity timestamp */
  lastActivity: string;
  /** Alert thresholds */
  alerts: AgentAlert[];
}

export interface AgentAlert {
  /** Alert severity */
  severity: 'info' | 'warning' | 'critical';
  /** Alert message */
  message: string;
  /** When the alert was triggered */
  triggeredAt: string;
  /** Whether the alert has been acknowledged */
  acknowledged: boolean;
}

// --- Dashboard State ---

export type AgentCategory =
  | 'code-analysis'
  | 'testing'
  | 'deployment'
  | 'data-processing'
  | 'content-generation'
  | 'communication'
  | 'infrastructure'
  | 'search'
  | 'orchestration';

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

export type SortField = 'name' | 'totalTokens' | 'cost' | 'quotaUtilization' | 'callCount' | 'lastActivity';
export type SortDirection = 'asc' | 'desc';

export interface DashboardFilters {
  /** Text search across agent names and categories */
  search: string;
  /** Filter by agent categories */
  categories: AgentCategory[];
  /** Filter by agent status */
  statuses: Array<'active' | 'idle' | 'rate-limited' | 'offline'>;
  /** Time range for usage data */
  timeRange: TimeRange;
  /** Sort field */
  sortField: SortField;
  /** Sort direction */
  sortDirection: SortDirection;
}

// --- Aggregate Metrics ---

export interface EcosystemMetrics {
  /** Total tokens consumed across all agents */
  totalTokens: number;
  /** Total estimated cost */
  totalCost: number;
  /** Total API calls */
  totalCalls: number;
  /** Number of active agents */
  activeAgents: number;
  /** Number of agents at or near rate limit */
  rateLimitedAgents: number;
  /** Number of unacknowledged alerts */
  activeAlerts: number;
  /** Tokens per minute across ecosystem */
  tokensPerMinute: number;
  /** Cost trend compared to previous period (percentage) */
  costTrend: number;
  /** Usage trend compared to previous period (percentage) */
  usageTrend: number;
}

// --- Category metadata ---

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
  'code-analysis': 'Code Analysis',
  'testing': 'Testing',
  'deployment': 'Deployment',
  'data-processing': 'Data Processing',
  'content-generation': 'Content Generation',
  'communication': 'Communication',
  'infrastructure': 'Infrastructure',
  'search': 'Search',
  'orchestration': 'Orchestration',
};

export const CATEGORY_COLORS: Record<AgentCategory, string> = {
  'code-analysis': '#3b82f6',
  'testing': '#22c55e',
  'deployment': '#f59e0b',
  'data-processing': '#8b5cf6',
  'content-generation': '#ec4899',
  'communication': '#06b6d4',
  'infrastructure': '#ef4444',
  'search': '#14b8a6',
  'orchestration': '#f97316',
};

export const STATUS_CONFIG = {
  active: { color: '#22c55e', bg: '#f0fdf4', label: 'Active' },
  idle: { color: '#94a3b8', bg: '#f8fafc', label: 'Idle' },
  'rate-limited': { color: '#f59e0b', bg: '#fffbeb', label: 'Rate Limited' },
  offline: { color: '#ef4444', bg: '#fef2f2', label: 'Offline' },
} as const;

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1h': 'Last Hour',
  '6h': 'Last 6 Hours',
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
};
