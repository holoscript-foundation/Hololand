/**
 * MVC Editor Component Types
 *
 * Shared types, themes, and utilities for MVC (Model-View-Controller) state editors.
 * Integrates with @holoscript/mvc-schema CRDT types for cross-reality agent state management.
 *
 * @module mvc-editor/types
 */

import type {
  DecisionHistory,
  DecisionEntry,
  ActiveTaskState,
  TaskEntry,
  TaskStatus,
  TaskPriority,
  UserPreferences,
  SpatialPreferences,
  CommunicationPreferences,
  VisualPreferences,
  PrivacyPreferences,
  SpatialContextSummary,
  SpatialAnchor,
  AgentPose,
  EnvironmentalContext,
  EvidenceTrail,
  EvidenceEntry,
  EvidenceType,
  ChainVerificationResult,
} from '@holoscript/mvc-schema';

// ============================================================================
// Common MVC Editor Props
// ============================================================================

/**
 * Common editor theme
 */
export interface MVCEditorTheme {
  /** Primary brand color */
  primaryColor: string;

  /** Secondary accent color */
  secondaryColor: string;

  /** Background color */
  backgroundColor: string;

  /** Text color */
  textColor: string;

  /** Border color */
  borderColor: string;

  /** Success state color */
  successColor: string;

  /** Warning state color */
  warningColor: string;

  /** Error state color */
  errorColor: string;

  /** Disabled state color */
  disabledColor: string;

  /** Overlay opacity (0-1) */
  overlayOpacity: number;

  /** Font family */
  fontFamily: string;

  /** Base font size (px) */
  baseFontSize: number;

  /** Border radius (px) */
  borderRadius: number;

  /** Panel spacing (px) */
  panelSpacing: number;
}

/**
 * Default MVC editor theme
 */
export const DEFAULT_MVC_EDITOR_THEME: MVCEditorTheme = {
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#1f2937',
  textColor: '#f3f4f6',
  borderColor: '#374151',
  successColor: '#10b981',
  warningColor: '#f59e0b',
  errorColor: '#ef4444',
  disabledColor: '#6b7280',
  overlayOpacity: 0.85,
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  baseFontSize: 14,
  borderRadius: 8,
  panelSpacing: 16,
};

/**
 * Editor display mode
 */
export type EditorDisplayMode = 'full' | 'compact' | 'overlay' | 'readonly';

/**
 * Base editor props
 */
export interface BaseEditorProps {
  /** Display mode */
  displayMode?: EditorDisplayMode;

  /** Custom theme */
  theme?: Partial<MVCEditorTheme>;

  /** CSS class name */
  className?: string;

  /** CSS styles */
  style?: React.CSSProperties;

  /** ARIA label */
  ariaLabel?: string;

  /** Is editor disabled */
  disabled?: boolean;
}

// ============================================================================
// DecisionHistoryEditor Types
// ============================================================================

/**
 * Decision history editor props
 */
export interface DecisionHistoryEditorProps extends BaseEditorProps {
  /** Decision history CRDT */
  decisionHistory: DecisionHistory;

  /** Callback when decision is added */
  onAddDecision?: (decision: Omit<DecisionEntry, 'id' | 'timestamp'>) => void;

  /** Callback when decision is selected */
  onSelectDecision?: (decisionId: string) => void;

  /** Maximum decisions to display */
  maxDecisions?: number;

  /** Filter by decision type */
  filterType?: DecisionEntry['type'] | 'all';

  /** Sort order */
  sortOrder?: 'newest' | 'oldest' | 'type';

  /** Show outcome badges */
  showOutcomes?: boolean;

  /** Show confidence scores */
  showConfidence?: boolean;

  /** Show causal relationships */
  showCausalChains?: boolean;
}

/**
 * Decision history editor state
 */
export interface DecisionHistoryEditorState {
  /** Selected decision ID */
  selectedDecisionId: string | null;

  /** Filter type */
  filterType: DecisionEntry['type'] | 'all';

  /** Sort order */
  sortOrder: 'newest' | 'oldest' | 'type';

  /** Search query */
  searchQuery: string;

  /** View mode (timeline/list/graph) */
  viewMode: 'timeline' | 'list' | 'graph';
}

// ============================================================================
// ActiveTaskEditor Types
// ============================================================================

/**
 * Active task editor props
 */
export interface ActiveTaskEditorProps extends BaseEditorProps {
  /** Active task state CRDT */
  activeTaskState: ActiveTaskState;

  /** Callback when task is created */
  onCreateTask?: (task: Omit<TaskEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;

  /** Callback when task is updated */
  onUpdateTask?: (taskId: string, updates: Partial<TaskEntry>) => void;

  /** Callback when task is deleted */
  onDeleteTask?: (taskId: string) => void;

  /** Callback when task is moved (kanban drag-drop) */
  onMoveTask?: (taskId: string, newStatus: TaskStatus) => void;

  /** Show subtasks inline */
  showSubtasks?: boolean;

  /** Show task duration estimates */
  showDurations?: boolean;

  /** Group by (status/priority/assignee) */
  groupBy?: 'status' | 'priority' | 'assignee';

  /** Kanban columns to display */
  kanbanColumns?: TaskStatus[];
}

/**
 * Active task editor state
 */
export interface ActiveTaskEditorState {
  /** Selected task ID */
  selectedTaskId: string | null;

  /** Filter by status */
  filterStatus: TaskStatus | 'all';

  /** Filter by priority */
  filterPriority: TaskPriority | 'all';

  /** Search query */
  searchQuery: string;

  /** View mode (kanban/list/calendar) */
  viewMode: 'kanban' | 'list' | 'calendar';

  /** Is task form open */
  isTaskFormOpen: boolean;

  /** Editing task ID (null if creating new) */
  editingTaskId: string | null;
}

// ============================================================================
// UserPreferencesEditor Types
// ============================================================================

/**
 * User preferences editor props
 */
export interface UserPreferencesEditorProps extends BaseEditorProps {
  /** User preferences CRDT */
  userPreferences: UserPreferences;

  /** Callback when preference is updated */
  onUpdatePreference?: (
    category: 'spatial' | 'communication' | 'visual' | 'privacy',
    field: string,
    value: unknown
  ) => void;

  /** Callback when preference is reset */
  onResetPreference?: (category: string, field: string) => void;

  /** Show learned vs explicit distinction */
  showLearnedVsExplicit?: boolean;

  /** Show last updated metadata */
  showMetadata?: boolean;

  /** Categories to display */
  categories?: Array<'spatial' | 'communication' | 'visual' | 'privacy'>;

  /** Allow editing (false = readonly) */
  allowEditing?: boolean;
}

/**
 * User preferences editor state
 */
export interface UserPreferencesEditorState {
  /** Active category */
  activeCategory: 'spatial' | 'communication' | 'visual' | 'privacy';

  /** Search query */
  searchQuery: string;

  /** Editing field key */
  editingField: string | null;

  /** Show only modified preferences */
  showModifiedOnly: boolean;
}

/**
 * Preference field metadata
 */
export interface PreferenceFieldMetadata {
  /** Field key */
  key: string;

  /** Field label */
  label: string;

  /** Field description */
  description: string;

  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'select' | 'range';

  /** Default value */
  defaultValue: unknown;

  /** Is this a learned preference (vs explicit) */
  isLearned?: boolean;

  /** Last updated timestamp */
  lastUpdated?: number;

  /** Actor DID that last updated */
  actorDid?: string;

  /** Validation rules */
  validation?: {
    min?: number;
    max?: number;
    options?: Array<{ value: unknown; label: string }>;
    pattern?: string;
  };
}

// ============================================================================
// SpatialContextEditor Types
// ============================================================================

/**
 * Spatial context editor props
 */
export interface SpatialContextEditorProps extends BaseEditorProps {
  /** Spatial context summary CRDT */
  spatialContext: SpatialContextSummary;

  /** Callback when anchor is added */
  onAddAnchor?: (anchor: Omit<SpatialAnchor, 'id' | 'createdAt' | 'lastVerified'>) => void;

  /** Callback when anchor is updated */
  onUpdateAnchor?: (anchorId: string, updates: Partial<SpatialAnchor>) => void;

  /** Callback when anchor is deleted */
  onDeleteAnchor?: (anchorId: string) => void;

  /** Callback when anchor is selected */
  onSelectAnchor?: (anchorId: string) => void;

  /** Map center coordinates */
  mapCenter?: { latitude: number; longitude: number };

  /** Map zoom level */
  mapZoom?: number;

  /** Show movement history */
  showMovementHistory?: boolean;

  /** Show environment details */
  showEnvironment?: boolean;

  /** Show 3D pose visualization */
  show3DPose?: boolean;
}

/**
 * Spatial context editor state
 */
export interface SpatialContextEditorState {
  /** Selected anchor ID */
  selectedAnchorId: string | null;

  /** Map center */
  mapCenter: { latitude: number; longitude: number };

  /** Map zoom level */
  mapZoom: number;

  /** View mode (map/list/3d) */
  viewMode: 'map' | 'list' | '3d';

  /** Is anchor form open */
  isAnchorFormOpen: boolean;

  /** Editing anchor ID (null if creating new) */
  editingAnchorId: string | null;
}

// ============================================================================
// EvidenceTrailViewer Types
// ============================================================================

/**
 * Evidence trail viewer props
 */
export interface EvidenceTrailViewerProps extends BaseEditorProps {
  /** Evidence trail CRDT */
  evidenceTrail: EvidenceTrail;

  /** Callback when entry is selected */
  onSelectEntry?: (entrySequence: number) => void;

  /** Callback when verification is requested */
  onVerify?: () => Promise<ChainVerificationResult>;

  /** Show cryptographic details */
  showCryptoDetails?: boolean;

  /** Show signature verification */
  showSignatures?: boolean;

  /** Filter by evidence type */
  filterType?: EvidenceType | 'all';

  /** Maximum entries to display */
  maxEntries?: number;

  /** Highlight broken chain links */
  highlightBrokenLinks?: boolean;
}

/**
 * Evidence trail viewer state
 */
export interface EvidenceTrailViewerState {
  /** Selected entry sequence */
  selectedSequence: number | null;

  /** Filter type */
  filterType: EvidenceType | 'all';

  /** Search query */
  searchQuery: string;

  /** View mode (chain/list/graph) */
  viewMode: 'chain' | 'list' | 'graph';

  /** Verification result */
  verificationResult: ChainVerificationResult | null;

  /** Is verification in progress */
  isVerifying: boolean;

  /** Show hash details */
  showHashDetails: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Apply overlay opacity to color
 */
export function applyOverlayOpacity(color: string, opacity: number): string {
  if (color.startsWith('rgba')) {
    return color.replace(/,\s*[\d.]+\)/, `, ${opacity})`);
  }
  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
  }
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

/**
 * Format timestamp as relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format timestamp as ISO string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Get status color
 */
export function getTaskStatusColor(status: TaskStatus, theme: MVCEditorTheme): string {
  switch (status) {
    case 'completed':
      return theme.successColor;
    case 'in_progress':
      return theme.primaryColor;
    case 'blocked':
      return theme.errorColor;
    case 'cancelled':
      return theme.disabledColor;
    case 'pending':
    default:
      return theme.secondaryColor;
  }
}

/**
 * Get priority color
 */
export function getTaskPriorityColor(priority: TaskPriority, theme: MVCEditorTheme): string {
  switch (priority) {
    case 'critical':
      return theme.errorColor;
    case 'high':
      return theme.warningColor;
    case 'medium':
      return theme.primaryColor;
    case 'low':
    default:
      return theme.disabledColor;
  }
}

/**
 * Get evidence type color
 */
export function getEvidenceTypeColor(type: EvidenceType, theme: MVCEditorTheme): string {
  switch (type) {
    case 'credential':
    case 'attestation':
      return theme.successColor;
    case 'reasoning':
    case 'observation':
      return theme.primaryColor;
    case 'action':
      return theme.secondaryColor;
    case 'external_data':
    case 'measurement':
    default:
      return theme.textColor;
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Merge theme with defaults
 */
export function mergeTheme(theme?: Partial<MVCEditorTheme>): MVCEditorTheme {
  return { ...DEFAULT_MVC_EDITOR_THEME, ...theme };
}
