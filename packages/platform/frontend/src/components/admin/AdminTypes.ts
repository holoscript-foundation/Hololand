/**
 * Admin Dashboard Types
 *
 * Defines the type system for the multi-tenant admin UI including tenant management,
 * usage quotas, analytics, A/B testing, performance monitoring, and audit logging.
 *
 * @module admin/AdminTypes
 */

// =============================================================================
// TENANT / ORGANIZATION TYPES
// =============================================================================

/** Subscription tier for an organization */
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

/** Role within an organization */
export type OrgRole = 'owner' | 'admin' | 'editor' | 'viewer';

/** Status of an organization */
export type OrgStatus = 'active' | 'suspended' | 'trial' | 'deactivated';

/** Organization / Tenant */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: SubscriptionTier;
  status: OrgStatus;
  ownerUserId: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  /** Custom domain, if configured */
  customDomain?: string;
  /** Logo URL */
  logoUrl?: string;
}

/** Organization member */
export interface OrgMember {
  id: string;
  userId: string;
  orgId: string;
  displayName: string;
  email: string;
  role: OrgRole;
  avatarUrl?: string;
  lastActiveAt: string;
  joinedAt: string;
}

/** Organization invite */
export interface OrgInvite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
}

// =============================================================================
// USAGE QUOTA TYPES
// =============================================================================

/** Usage quota limits per tier */
export interface QuotaLimits {
  maxScenes: number;
  maxStorageMB: number;
  maxRenderCredits: number;
  maxGaussianBudget: number;
  maxMembers: number;
  maxCustomDomains: number;
}

/** Current usage for an organization */
export interface QuotaUsage {
  orgId: string;
  orgName: string;
  tier: SubscriptionTier;
  sceneCount: number;
  storageMB: number;
  renderCreditsUsed: number;
  gaussianBudgetUsed: number;
  limits: QuotaLimits;
}

/** Tier-based quota defaults */
export const TIER_QUOTAS: Record<SubscriptionTier, QuotaLimits> = {
  free: {
    maxScenes: 3,
    maxStorageMB: 500,
    maxRenderCredits: 100,
    maxGaussianBudget: 1_000_000,
    maxMembers: 2,
    maxCustomDomains: 0,
  },
  starter: {
    maxScenes: 25,
    maxStorageMB: 5_000,
    maxRenderCredits: 1_000,
    maxGaussianBudget: 10_000_000,
    maxMembers: 10,
    maxCustomDomains: 1,
  },
  professional: {
    maxScenes: 100,
    maxStorageMB: 50_000,
    maxRenderCredits: 10_000,
    maxGaussianBudget: 100_000_000,
    maxMembers: 50,
    maxCustomDomains: 3,
  },
  enterprise: {
    maxScenes: -1, // unlimited
    maxStorageMB: -1,
    maxRenderCredits: -1,
    maxGaussianBudget: -1,
    maxMembers: -1,
    maxCustomDomains: -1,
  },
};

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

/** Time-series data point */
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

/** FPS distribution bucket */
export interface FPSBucket {
  range: string;
  count: number;
  percentage: number;
}

/** Session duration bucket */
export interface SessionDurationBucket {
  range: string;
  count: number;
  avgMinutes: number;
}

/** Engagement heatmap cell */
export interface HeatmapCell {
  dayOfWeek: number;
  hourOfDay: number;
  value: number;
}

/** Scene completion funnel step */
export interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  dropoffRate: number;
}

/** Full analytics snapshot for a tenant */
export interface TenantAnalytics {
  orgId: string;
  period: { start: string; end: string };
  fpsDistribution: FPSBucket[];
  sessionDurations: SessionDurationBucket[];
  engagementHeatmap: HeatmapCell[];
  sceneCompletionFunnel: FunnelStep[];
  dailyActiveUsers: TimeSeriesPoint[];
  avgSessionMinutes: number;
  totalSessions: number;
  avgFPS: number;
  p95FPS: number;
}

// =============================================================================
// A/B TEST TYPES
// =============================================================================

/** Status of an A/B test experiment */
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';

/** A single variant within an experiment */
export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  /** Traffic allocation percentage (0-100) */
  trafficPercent: number;
  /** Number of users assigned to this variant */
  sampleSize: number;
  /** Primary metric value */
  metricValue: number;
  /** Conversion rate (0-1) */
  conversionRate: number;
}

/** Statistical significance results */
export interface StatisticalResult {
  /** Whether the result is statistically significant */
  isSignificant: boolean;
  /** p-value */
  pValue: number;
  /** Confidence level (e.g. 0.95) */
  confidenceLevel: number;
  /** Confidence interval [lower, upper] */
  confidenceInterval: [number, number];
  /** Relative improvement over control (percentage) */
  relativeImprovement: number;
  /** Effect size (Cohen's d) */
  effectSize: number;
  /** Required sample size for desired power */
  requiredSampleSize: number;
  /** Current statistical power */
  power: number;
}

/** A/B test experiment */
export interface Experiment {
  id: string;
  name: string;
  description: string;
  orgId: string;
  status: ExperimentStatus;
  /** Primary metric being measured */
  primaryMetric: string;
  /** Target scene or feature */
  targetFeature: string;
  variants: ExperimentVariant[];
  statisticalResult?: StatisticalResult;
  startDate: string;
  endDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// REAL-TIME PERFORMANCE TYPES
// =============================================================================

/** Real-time scene performance snapshot */
export interface ScenePerformanceSnapshot {
  sceneId: string;
  sceneName: string;
  timestamp: string;
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangleCount: number;
  gpuMemoryMB: number;
  cpuTimeMs: number;
  gpuTimeMs: number;
  gaussianSplatCount: number;
  activeUsers: number;
  networkLatencyMs: number;
  /** Quality tier currently applied */
  qualityTier: 'low' | 'medium' | 'high' | 'ultra';
}

/** Performance alert threshold */
export interface PerformanceThreshold {
  metric: keyof ScenePerformanceSnapshot;
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  value: number;
  severity: 'info' | 'warning' | 'critical';
}

/** Performance alert */
export interface PerformanceAlert {
  id: string;
  sceneId: string;
  sceneName: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

// =============================================================================
// AUDIT LOG TYPES
// =============================================================================

/** Audit log action categories */
export type AuditAction =
  | 'tenant.create'
  | 'tenant.update'
  | 'tenant.delete'
  | 'tenant.suspend'
  | 'member.invite'
  | 'member.remove'
  | 'member.role_change'
  | 'scene.create'
  | 'scene.publish'
  | 'scene.delete'
  | 'experiment.create'
  | 'experiment.start'
  | 'experiment.stop'
  | 'quota.override'
  | 'settings.update'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'billing.subscription_change'
  | 'billing.payment';

/** Audit log entry */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorEmail: string;
  orgId: string;
  orgName: string;
  /** Resource that was acted upon */
  targetType: string;
  targetId: string;
  targetName?: string;
  /** Before/after diff for update actions */
  changes?: Record<string, { before: unknown; after: unknown }>;
  /** IP address of the actor */
  ipAddress: string;
  /** User agent string */
  userAgent: string;
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Audit log filter options */
export interface AuditLogFilters {
  dateRange?: { start: string; end: string };
  actions?: AuditAction[];
  actorId?: string;
  orgId?: string;
  severity?: ('info' | 'warning' | 'critical')[];
  searchQuery?: string;
}

// =============================================================================
// ADMIN DASHBOARD NAVIGATION
// =============================================================================

/** Available admin dashboard tabs */
export type AdminTab =
  | 'tenants'
  | 'quotas'
  | 'analytics'
  | 'experiments'
  | 'performance'
  | 'audit'
  | 'founders'
  | 'marketplace';

/** Admin dashboard tab metadata */
export interface AdminTabMeta {
  id: AdminTab;
  label: string;
  icon: string;
  description: string;
}

export const ADMIN_TABS: AdminTabMeta[] = [
  { id: 'tenants', label: 'Tenants', icon: 'ORG', description: 'Manage organizations and members' },
  { id: 'quotas', label: 'Quotas', icon: 'BAR', description: 'Usage quotas and limits' },
  { id: 'analytics', label: 'Analytics', icon: 'CHT', description: 'Platform analytics and insights' },
  { id: 'experiments', label: 'A/B Tests', icon: 'EXP', description: 'Experiment management' },
  { id: 'performance', label: 'Performance', icon: 'MON', description: 'Real-time scene monitoring' },
  { id: 'audit', label: 'Audit Log', icon: 'LOG', description: 'Activity and change logs' },
  { id: 'founders', label: 'Founders', icon: 'FND', description: 'Founders Program management' },
  { id: 'marketplace', label: 'Marketplace', icon: 'MKT', description: 'Asset marketplace' },
];
