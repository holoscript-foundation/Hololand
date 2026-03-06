/**
 * Quality Gate Dashboard - Shared Types
 *
 * Type definitions for the progressive quality gate dashboard that
 * visualizes three-tier confidence levels for autonomous agent workflows.
 *
 * Confidence Tier Model:
 *   Tier 1 (Green)  - High confidence, fully autonomous execution
 *   Tier 2 (Yellow) - Medium confidence, automated with monitoring
 *   Tier 3 (Red)    - Low confidence, requires human escalation
 *
 * Integration:
 *   - Reads agent workflow status from the uAA2++ autonomize pipeline
 *   - Maps confidence scores to visual risk indicators
 *   - Provides human escalation interface for Tier 3 approvals
 *   - Displays trust calibration metrics across agent workflows
 *
 * Performance contract:
 *   - All rendering completes within the 11.1ms VR frame budget (90Hz)
 *   - Data updates pushed at 1-10Hz, NEVER polled in the render loop
 *   - No classifiers or heavy computation in the render path
 *     (per G.003.09: NEVER put classifiers in VR render loop)
 *
 * @module quality-gate-dashboard/types
 */

// =============================================================================
// CONFIDENCE TIER MODEL
// =============================================================================

/**
 * Confidence tier levels.
 * Maps autonomous decision confidence to visual risk indicators.
 */
export type ConfidenceTier = 'tier1' | 'tier2' | 'tier3';

/**
 * Metadata for each confidence tier.
 */
export interface ConfidenceTierMeta {
  /** Tier identifier */
  tier: ConfidenceTier;
  /** Human-readable label */
  label: string;
  /** Short description */
  description: string;
  /** Primary color (hex) */
  color: string;
  /** Background color (hex with alpha) */
  backgroundColor: string;
  /** Border color (hex) */
  borderColor: string;
  /** Minimum confidence score for this tier (0-1) */
  minScore: number;
  /** Maximum confidence score for this tier (0-1, exclusive) */
  maxScore: number;
  /** Whether human approval is required */
  requiresHumanApproval: boolean;
}

/**
 * Configuration for all confidence tier visual properties.
 */
export const CONFIDENCE_TIER_CONFIG: Record<ConfidenceTier, ConfidenceTierMeta> = {
  tier1: {
    tier: 'tier1',
    label: 'High Confidence',
    description: 'Fully autonomous execution with high reliability',
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: '#86efac',
    minScore: 0.85,
    maxScore: 1.0,
    requiresHumanApproval: false,
  },
  tier2: {
    tier: 'tier2',
    label: 'Medium Confidence',
    description: 'Automated execution with active monitoring',
    color: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderColor: '#fde047',
    minScore: 0.5,
    maxScore: 0.85,
    requiresHumanApproval: false,
  },
  tier3: {
    tier: 'tier3',
    label: 'Low Confidence',
    description: 'Requires human review and explicit approval',
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: '#fca5a5',
    minScore: 0.0,
    maxScore: 0.5,
    requiresHumanApproval: true,
  },
};

// =============================================================================
// MAPPING UTILITIES
// =============================================================================

/**
 * Derive a ConfidenceTier from a confidence score (0-1).
 */
export function scoreToConfidenceTier(score: number): ConfidenceTier {
  if (score >= 0.85) return 'tier1';
  if (score >= 0.5) return 'tier2';
  return 'tier3';
}

/**
 * Get the tier metadata for a given tier.
 */
export function getConfidenceTierMeta(tier: ConfidenceTier): ConfidenceTierMeta {
  return CONFIDENCE_TIER_CONFIG[tier];
}

/**
 * Get the color for a confidence score.
 */
export function getConfidenceColor(score: number): string {
  return getConfidenceTierMeta(scoreToConfidenceTier(score)).color;
}

// =============================================================================
// AGENT WORKFLOW TYPES
// =============================================================================

/**
 * Current execution status of an agent workflow.
 */
export type WorkflowStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'pending_approval'
  | 'paused'
  | 'cancelled';

/**
 * Failure detection status categories.
 */
export type FailureCategory =
  | 'timeout'
  | 'assertion_failure'
  | 'resource_exhaustion'
  | 'permission_denied'
  | 'dependency_failure'
  | 'validation_error'
  | 'unknown';

/**
 * An individual agent workflow being monitored.
 */
export interface AgentWorkflow {
  /** Unique workflow ID */
  id: string;
  /** Agent that owns this workflow */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Workflow display name */
  workflowName: string;
  /** Current execution status */
  status: WorkflowStatus;
  /** Confidence score (0-1) */
  confidenceScore: number;
  /** Derived confidence tier */
  tier: ConfidenceTier;
  /** Number of steps completed */
  stepsCompleted: number;
  /** Total steps in the workflow */
  totalSteps: number;
  /** Workflow start timestamp (epoch ms) */
  startedAt: number;
  /** Workflow completion timestamp (epoch ms, 0 if still running) */
  completedAt: number;
  /** Last status update timestamp */
  lastUpdateAt: number;
  /** Failure details (if status is 'failed') */
  failure?: WorkflowFailure;
  /** Escalation request (if status is 'pending_approval') */
  escalation?: EscalationRequest;
}

/**
 * Details of a workflow failure.
 */
export interface WorkflowFailure {
  /** Failure category */
  category: FailureCategory;
  /** Human-readable error message */
  message: string;
  /** Stack trace or diagnostic info (optional) */
  details?: string;
  /** Step number where failure occurred */
  failedAtStep: number;
  /** Whether automatic retry is possible */
  retryable: boolean;
  /** Number of retry attempts already made */
  retryCount: number;
  /** Maximum retry attempts allowed */
  maxRetries: number;
}

/**
 * A human escalation request for Tier 3 workflows.
 */
export interface EscalationRequest {
  /** Unique escalation ID */
  id: string;
  /** Workflow ID this escalation belongs to */
  workflowId: string;
  /** Agent requesting escalation */
  agentId: string;
  /** What the agent is requesting approval for */
  requestDescription: string;
  /** Risk assessment summary */
  riskSummary: string;
  /** Confidence score that triggered escalation */
  confidenceScore: number;
  /** Proposed action if approved */
  proposedAction: string;
  /** Alternative safer action */
  alternativeAction?: string;
  /** When the escalation was created */
  createdAt: number;
  /** Deadline for human response (epoch ms, 0 = no deadline) */
  deadline: number;
  /** Whether this has been resolved */
  resolved: boolean;
  /** Resolution: approved, rejected, or deferred */
  resolution?: 'approved' | 'rejected' | 'deferred';
  /** Who resolved it */
  resolvedBy?: string;
  /** When it was resolved */
  resolvedAt?: number;
}

// =============================================================================
// TRUST CALIBRATION
// =============================================================================

/**
 * Trust calibration metrics for the quality gate system.
 */
export interface TrustCalibration {
  /** Overall calibration score (0-1, 1 = perfectly calibrated) */
  calibrationScore: number;
  /** How often Tier 1 decisions were actually correct */
  tier1Accuracy: number;
  /** How often Tier 2 decisions needed human intervention */
  tier2EscalationRate: number;
  /** How often Tier 3 escalations were approved vs rejected */
  tier3ApprovalRate: number;
  /** Total decisions made in the calibration window */
  totalDecisions: number;
  /** Number of false positives (unnecessarily escalated) */
  falsePositives: number;
  /** Number of false negatives (should have escalated but didn't) */
  falseNegatives: number;
  /** Calibration window start (epoch ms) */
  windowStart: number;
  /** Calibration window end (epoch ms) */
  windowEnd: number;
  /** Per-tier distribution */
  tierDistribution: Record<ConfidenceTier, number>;
}

// =============================================================================
// DASHBOARD STATE
// =============================================================================

/**
 * Display mode for the Quality Gate Dashboard.
 */
export type QualityGateDisplayMode =
  | 'dashboard'     // Full dashboard with all panels
  | 'compact'       // Compact HUD bar
  | 'escalation'    // Escalation-only view for human operators
  | 'overlay';      // Semi-transparent overlay for VR HUD

/**
 * Panels available in the dashboard.
 */
export type QualityGatePanel =
  | 'tier-overview'   // Tier distribution and counts
  | 'workflows'       // Active workflow list
  | 'failures'        // Failure detection panel
  | 'escalations'     // Human escalation queue
  | 'calibration'     // Trust calibration display
  | 'alerts';         // Quality gate alerts

/**
 * Complete quality gate dashboard state.
 */
export interface QualityGateDashboardState {
  /** All monitored workflows */
  workflows: AgentWorkflow[];
  /** Pending escalation requests */
  pendingEscalations: EscalationRequest[];
  /** Trust calibration metrics */
  calibration: TrustCalibration | null;
  /** Quality gate alerts */
  alerts: QualityGateAlert[];
  /** Whether the dashboard is receiving live data */
  isLive: boolean;
  /** Current display mode */
  displayMode: QualityGateDisplayMode;
  /** Visible panels */
  visiblePanels: Set<QualityGatePanel>;
  /** Last data update timestamp */
  lastUpdateTimestamp: number;
  /** Whether data is considered stale */
  isStale: boolean;
  /** Summary counts per tier */
  tierCounts: Record<ConfidenceTier, number>;
  /** Summary counts per workflow status */
  statusCounts: Record<WorkflowStatus, number>;
  /** Active failure count */
  activeFailureCount: number;
}

/**
 * Actions available from the useQualityGateDashboard hook.
 */
export interface QualityGateDashboardActions {
  /** Push or update a workflow */
  updateWorkflow: (workflow: AgentWorkflow) => void;
  /** Remove a workflow by ID */
  removeWorkflow: (workflowId: string) => void;
  /** Push a new escalation request */
  addEscalation: (escalation: EscalationRequest) => void;
  /** Resolve an escalation */
  resolveEscalation: (
    escalationId: string,
    resolution: 'approved' | 'rejected' | 'deferred',
    resolvedBy: string,
  ) => void;
  /** Update trust calibration metrics */
  updateCalibration: (calibration: TrustCalibration) => void;
  /** Dismiss an alert */
  dismissAlert: (id: string) => void;
  /** Clear all alerts */
  clearAlerts: () => void;
  /** Toggle live/paused data feed */
  toggleLive: () => void;
  /** Set display mode */
  setDisplayMode: (mode: QualityGateDisplayMode) => void;
  /** Toggle a panel's visibility */
  togglePanel: (panel: QualityGatePanel) => void;
}

// =============================================================================
// ALERTS
// =============================================================================

/**
 * A quality gate alert.
 */
export interface QualityGateAlert {
  /** Unique alert ID */
  id: string;
  /** Alert timestamp */
  timestamp: number;
  /** Alert severity */
  severity: 'info' | 'warning' | 'critical';
  /** Alert category */
  category: 'escalation' | 'failure' | 'calibration' | 'threshold' | 'general';
  /** Human-readable message */
  message: string;
  /** Whether the alert has been dismissed */
  dismissed: boolean;
}

/**
 * Create a unique quality gate alert ID.
 */
export function createQGAlertId(): string {
  return `qg-alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the Quality Gate Dashboard.
 */
export interface QualityGateTheme {
  /** Base font family */
  fontFamily: string;
  /** Font size scale factor */
  fontScale: number;
  /** Border radius */
  borderRadius: string;
  /** Container background */
  containerBackground: string;
  /** Card background */
  cardBackground: string;
  /** Primary text color */
  textPrimary: string;
  /** Secondary text color */
  textSecondary: string;
  /** Muted text color */
  textMuted: string;
  /** Border color */
  borderColor: string;
  /** Tier 1 (high confidence) color */
  tier1Color: string;
  /** Tier 2 (medium confidence) color */
  tier2Color: string;
  /** Tier 3 (low confidence) color */
  tier3Color: string;
  /** Success/approved color */
  successColor: string;
  /** Warning color */
  warningColor: string;
  /** Error/rejected color */
  errorColor: string;
  /** Accent color */
  accentColor: string;
}

/**
 * Default theme for the Quality Gate Dashboard.
 */
export const DEFAULT_QG_THEME: QualityGateTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',
  containerBackground: 'rgba(8, 12, 28, 0.92)',
  cardBackground: 'rgba(16, 20, 44, 0.88)',
  textPrimary: '#e8e8f8',
  textSecondary: '#a0a0c8',
  textMuted: '#7880a8',
  borderColor: 'rgba(48, 52, 80, 0.85)',
  tier1Color: '#22c55e',
  tier2Color: '#eab308',
  tier3Color: '#ef4444',
  successColor: '#22c55e',
  warningColor: '#f97316',
  errorColor: '#ef4444',
  accentColor: '#6366f1',
};

/**
 * Get the theme color for a confidence tier.
 */
export function getTierColor(tier: ConfidenceTier, theme: QualityGateTheme): string {
  switch (tier) {
    case 'tier1': return theme.tier1Color;
    case 'tier2': return theme.tier2Color;
    case 'tier3': return theme.tier3Color;
    default: return theme.textMuted;
  }
}

/**
 * Get the theme color for a workflow status.
 */
export function getStatusColor(status: WorkflowStatus, theme: QualityGateTheme): string {
  switch (status) {
    case 'running': return theme.accentColor;
    case 'completed': return theme.successColor;
    case 'failed': return theme.errorColor;
    case 'pending_approval': return theme.tier3Color;
    case 'paused': return theme.warningColor;
    case 'cancelled': return theme.textMuted;
    default: return theme.textMuted;
  }
}

// =============================================================================
// PERFORMANCE BUDGET CONSTANTS
// =============================================================================

export const QG_FRAME_BUDGET = {
  /** Maximum dashboard render time in ms */
  DASHBOARD_BUDGET_MS: 0.5,
  /** Maximum data push rate (Hz) */
  MAX_DATA_PUSH_RATE_HZ: 10,
  /** Data staleness threshold (ms) */
  STALENESS_THRESHOLD_MS: 5000,
  /** Maximum alerts retained */
  MAX_ALERTS: 50,
  /** Alert cooldown (ms) */
  ALERT_COOLDOWN_MS: 3000,
  /** Maximum workflows displayed */
  MAX_VISIBLE_WORKFLOWS: 50,
} as const;
