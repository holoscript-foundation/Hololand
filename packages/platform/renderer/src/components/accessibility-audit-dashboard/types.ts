/**
 * Accessibility Audit Dashboard - Shared Types
 *
 * Type definitions for the WCAG 2.1 accessibility audit dashboard that scans
 * .holo files for compliance gaps. The scanner checks for the 10 HoloScript
 * accessibility traits and maps them to WCAG 2.1 Level AA success criteria.
 *
 * HoloScript Accessibility Traits:
 *   1.  @accessible       - ARIA semantics, keyboard navigation, focus management
 *   2.  @alt_text         - Alternative text descriptions for 3D objects
 *   3.  @screen_reader    - Semantic structure for blind/low-vision navigation
 *   4.  @subtitle         - Real-time speech-to-text for deaf/hard-of-hearing
 *   5.  @high_contrast    - High contrast mode for low-vision visitors
 *   6.  @motion_reduced   - Reduced motion for vestibular sensitivity
 *   7.  @haptic_cue       - Non-visual haptic cues for interactions
 *   8.  @haptic           - Proximity and collision haptic feedback
 *   9.  @voice_input      - Voice command navigation
 *  10.  @voice_output     - Text-to-speech audio descriptions and narration
 *
 * WCAG 2.1 Level AA Criteria Mapped:
 *   Perceivable   - 1.1.1, 1.2.1, 1.3.1, 1.3.2, 1.4.3, 1.4.4, 1.4.11
 *   Operable      - 2.1.1, 2.3.1, 2.4.1, 2.4.3, 2.4.6, 2.4.7, 2.5.1
 *   Understandable- 3.1.1, 3.3.2
 *   Robust        - 4.1.2, 4.1.3
 *
 * Performance contract:
 *   - Scanning is performed off the render loop
 *   - Dashboard rendering stays within 0.5ms budget
 *   - No classifiers in the render path (per G.003.09)
 *
 * @module accessibility-audit-dashboard/types
 */

// =============================================================================
// WCAG 2.1 CRITERION MODEL
// =============================================================================

/**
 * WCAG 2.1 principle categories.
 */
export type WCAGPrinciple = 'perceivable' | 'operable' | 'understandable' | 'robust';

/**
 * Conformance levels for WCAG 2.1.
 */
export type WCAGLevel = 'A' | 'AA' | 'AAA';

/**
 * Severity levels for audit findings.
 */
export type AuditSeverity = 'critical' | 'major' | 'minor' | 'info';

/**
 * Status of a single audit check.
 */
export type AuditCheckStatus = 'pass' | 'fail' | 'warning' | 'not_applicable';

/**
 * A WCAG 2.1 success criterion definition.
 */
export interface WCAGCriterion {
  /** Criterion identifier (e.g., "1.1.1") */
  id: string;
  /** Human-readable name */
  name: string;
  /** WCAG principle category */
  principle: WCAGPrinciple;
  /** Conformance level */
  level: WCAGLevel;
  /** Description of the criterion */
  description: string;
  /** HoloScript traits that satisfy this criterion */
  requiredTraits: HoloAccessibilityTrait[];
}

// =============================================================================
// HOLOSCRIPT TRAIT MODEL
// =============================================================================

/**
 * The 10 HoloScript accessibility traits.
 */
export type HoloAccessibilityTrait =
  | '@accessible'
  | '@alt_text'
  | '@screen_reader'
  | '@subtitle'
  | '@high_contrast'
  | '@motion_reduced'
  | '@haptic_cue'
  | '@haptic'
  | '@voice_input'
  | '@voice_output';

/**
 * Metadata for a HoloScript accessibility trait.
 */
export interface TraitMeta {
  /** Trait identifier */
  trait: HoloAccessibilityTrait;
  /** Human-readable label */
  label: string;
  /** Short description */
  description: string;
  /** WCAG criteria this trait addresses */
  wcagCriteria: string[];
  /** Category color (hex) */
  color: string;
}

/**
 * Trait metadata registry.
 */
export const TRAIT_REGISTRY: Record<HoloAccessibilityTrait, TraitMeta> = {
  '@accessible': {
    trait: '@accessible',
    label: 'Accessible',
    description: 'ARIA semantics, keyboard navigation, focus management',
    wcagCriteria: ['1.3.2', '2.1.1', '2.4.1', '2.4.3', '2.4.6', '2.4.7', '3.3.2', '4.1.2'],
    color: '#6366f1',
  },
  '@alt_text': {
    trait: '@alt_text',
    label: 'Alt Text',
    description: 'Alternative text descriptions for 3D objects',
    wcagCriteria: ['1.1.1'],
    color: '#22c55e',
  },
  '@screen_reader': {
    trait: '@screen_reader',
    label: 'Screen Reader',
    description: 'Semantic structure for blind/low-vision navigation',
    wcagCriteria: ['1.3.1', '1.3.2'],
    color: '#3b82f6',
  },
  '@subtitle': {
    trait: '@subtitle',
    label: 'Subtitle',
    description: 'Real-time speech-to-text for deaf/hard-of-hearing',
    wcagCriteria: ['1.2.1'],
    color: '#f59e0b',
  },
  '@high_contrast': {
    trait: '@high_contrast',
    label: 'High Contrast',
    description: 'High contrast mode for low-vision visitors',
    wcagCriteria: ['1.4.3', '1.4.11'],
    color: '#eab308',
  },
  '@motion_reduced': {
    trait: '@motion_reduced',
    label: 'Motion Reduced',
    description: 'Reduced motion for vestibular sensitivity',
    wcagCriteria: ['2.3.1'],
    color: '#a855f7',
  },
  '@haptic_cue': {
    trait: '@haptic_cue',
    label: 'Haptic Cue',
    description: 'Non-visual haptic cues for interactions',
    wcagCriteria: ['1.4.11'],
    color: '#ec4899',
  },
  '@haptic': {
    trait: '@haptic',
    label: 'Haptic',
    description: 'Proximity and collision haptic feedback',
    wcagCriteria: ['1.4.11'],
    color: '#f43f5e',
  },
  '@voice_input': {
    trait: '@voice_input',
    label: 'Voice Input',
    description: 'Voice command navigation',
    wcagCriteria: ['2.5.1'],
    color: '#14b8a6',
  },
  '@voice_output': {
    trait: '@voice_output',
    label: 'Voice Output',
    description: 'Text-to-speech audio descriptions and narration',
    wcagCriteria: ['1.2.1'],
    color: '#06b6d4',
  },
};

// =============================================================================
// WCAG 2.1 CRITERIA REGISTRY
// =============================================================================

/**
 * All WCAG 2.1 Level A and AA criteria checked by the scanner.
 */
export const WCAG_CRITERIA: WCAGCriterion[] = [
  // Perceivable
  {
    id: '1.1.1',
    name: 'Non-text Content',
    principle: 'perceivable',
    level: 'A',
    description: 'All non-text content has a text alternative',
    requiredTraits: ['@alt_text'],
  },
  {
    id: '1.2.1',
    name: 'Audio-only and Video-only',
    principle: 'perceivable',
    level: 'A',
    description: 'Alternatives provided for time-based media',
    requiredTraits: ['@voice_output', '@subtitle'],
  },
  {
    id: '1.3.1',
    name: 'Info and Relationships',
    principle: 'perceivable',
    level: 'A',
    description: 'Information, structure, and relationships are programmatically determined',
    requiredTraits: ['@screen_reader'],
  },
  {
    id: '1.3.2',
    name: 'Meaningful Sequence',
    principle: 'perceivable',
    level: 'A',
    description: 'Content order is meaningful and programmatically determined',
    requiredTraits: ['@accessible', '@screen_reader'],
  },
  {
    id: '1.4.3',
    name: 'Contrast (Minimum)',
    principle: 'perceivable',
    level: 'AA',
    description: 'Text has a contrast ratio of at least 4.5:1',
    requiredTraits: ['@high_contrast'],
  },
  {
    id: '1.4.4',
    name: 'Resize Text',
    principle: 'perceivable',
    level: 'AA',
    description: 'Text can be resized without loss of content or functionality',
    requiredTraits: ['@accessible'],
  },
  {
    id: '1.4.11',
    name: 'Non-text Contrast',
    principle: 'perceivable',
    level: 'AA',
    description: 'UI components and graphical objects have 3:1 contrast ratio',
    requiredTraits: ['@high_contrast'],
  },
  // Operable
  {
    id: '2.1.1',
    name: 'Keyboard',
    principle: 'operable',
    level: 'A',
    description: 'All functionality is keyboard accessible',
    requiredTraits: ['@accessible'],
  },
  {
    id: '2.3.1',
    name: 'Three Flashes or Below',
    principle: 'operable',
    level: 'A',
    description: 'No content flashes more than three times per second',
    requiredTraits: ['@motion_reduced'],
  },
  {
    id: '2.4.1',
    name: 'Bypass Blocks',
    principle: 'operable',
    level: 'A',
    description: 'A mechanism to bypass repeated blocks of content',
    requiredTraits: ['@accessible'],
  },
  {
    id: '2.4.3',
    name: 'Focus Order',
    principle: 'operable',
    level: 'A',
    description: 'Focus order preserves meaning and operability',
    requiredTraits: ['@accessible'],
  },
  {
    id: '2.4.6',
    name: 'Headings and Labels',
    principle: 'operable',
    level: 'AA',
    description: 'Headings and labels describe topic or purpose',
    requiredTraits: ['@accessible'],
  },
  {
    id: '2.4.7',
    name: 'Focus Visible',
    principle: 'operable',
    level: 'AA',
    description: 'Keyboard focus indicator is visible',
    requiredTraits: ['@accessible'],
  },
  {
    id: '2.5.1',
    name: 'Pointer Gestures',
    principle: 'operable',
    level: 'A',
    description: 'All multipoint or path-based gestures have single-pointer alternative',
    requiredTraits: ['@voice_input'],
  },
  // Understandable
  {
    id: '3.1.1',
    name: 'Language of Page',
    principle: 'understandable',
    level: 'A',
    description: 'Default human language can be programmatically determined',
    requiredTraits: ['@accessible'],
  },
  {
    id: '3.3.2',
    name: 'Labels or Instructions',
    principle: 'understandable',
    level: 'A',
    description: 'Labels or instructions provided for user input',
    requiredTraits: ['@accessible'],
  },
  // Robust
  {
    id: '4.1.2',
    name: 'Name, Role, Value',
    principle: 'robust',
    level: 'A',
    description: 'Name, role, and value can be programmatically determined',
    requiredTraits: ['@accessible'],
  },
  {
    id: '4.1.3',
    name: 'Status Messages',
    principle: 'robust',
    level: 'AA',
    description: 'Status messages are programmatically determined without focus',
    requiredTraits: ['@accessible'],
  },
];

// =============================================================================
// AUDIT RESULT TYPES
// =============================================================================

/**
 * A single audit check result for a specific WCAG criterion on a specific object.
 */
export interface AuditCheckResult {
  /** Unique check ID */
  id: string;
  /** WCAG criterion being checked */
  criterionId: string;
  /** Object name in the .holo file */
  objectName: string;
  /** Line number in the source file (1-based) */
  lineNumber: number;
  /** Audit check status */
  status: AuditCheckStatus;
  /** Severity of the finding */
  severity: AuditSeverity;
  /** Human-readable message */
  message: string;
  /** Suggested fix (if status is 'fail' or 'warning') */
  suggestedFix?: string;
  /** Trait that would address this issue */
  missingTrait?: HoloAccessibilityTrait;
  /** Specific sub-properties missing from an existing trait */
  missingProperties?: string[];
}

/**
 * Aggregated result for a single WCAG criterion across all objects.
 */
export interface CriterionAuditResult {
  /** WCAG criterion definition */
  criterion: WCAGCriterion;
  /** Overall status for this criterion */
  status: AuditCheckStatus;
  /** Individual check results */
  checks: AuditCheckResult[];
  /** Number of objects that pass */
  passCount: number;
  /** Number of objects that fail */
  failCount: number;
  /** Number of warnings */
  warningCount: number;
}

/**
 * A parsed HoloScript object with its accessibility traits.
 */
export interface HoloObject {
  /** Object name */
  name: string;
  /** Object type (e.g., "object", "template") */
  type: string;
  /** Line number where the object starts */
  lineNumber: number;
  /** Whether it's interactive (has on_activate, onClick, etc.) */
  isInteractive: boolean;
  /** Whether it has visual content (geometry, src, text) */
  hasVisualContent: boolean;
  /** Whether it has audio content */
  hasAudioContent: boolean;
  /** Whether it has animation */
  hasAnimation: boolean;
  /** Accessibility traits present on this object */
  traits: HoloAccessibilityTrait[];
  /** Properties within @accessible trait */
  accessibleProps: AccessibleProperties;
  /** Properties within @alt_text trait */
  altTextProps: AltTextProperties;
  /** Properties within @screen_reader trait */
  screenReaderProps: ScreenReaderProperties;
  /** Template name this object extends (if any) */
  templateRef?: string;
  /** Whether it's a child of a composition */
  isCompositionChild: boolean;
}

/**
 * Properties parsed from the @accessible trait.
 */
export interface AccessibleProperties {
  role?: string;
  label?: string;
  description?: string;
  tabIndex?: number;
  focusVisible?: boolean;
  keyboardShortcut?: string;
  liveRegion?: string;
}

/**
 * Properties parsed from the @alt_text trait.
 */
export interface AltTextProperties {
  text?: string;
  verbose?: string;
  language?: string;
  contextAware?: boolean;
  includeSpatial?: boolean;
}

/**
 * Properties parsed from the @screen_reader trait.
 */
export interface ScreenReaderProperties {
  semanticStructure?: boolean;
  navigationOrder?: number;
  readingMode?: string;
  verbosity?: string;
  announceChanges?: boolean;
}

/**
 * A parsed .holo file with all its objects extracted.
 */
export interface ParsedHoloFile {
  /** File name */
  fileName: string;
  /** File path */
  filePath: string;
  /** Raw source content */
  source: string;
  /** Total line count */
  lineCount: number;
  /** All parsed objects */
  objects: HoloObject[];
  /** Top-level composition names */
  compositions: string[];
  /** Templates defined */
  templates: string[];
  /** Whether the file has a global accessibility block */
  hasAccessibilityBlock: boolean;
  /** Locale set in the accessibility block (if any) */
  locale?: string;
}

// =============================================================================
// FULL AUDIT REPORT
// =============================================================================

/**
 * Complete audit report for one or more .holo files.
 */
export interface AccessibilityAuditReport {
  /** Unique report ID */
  id: string;
  /** Timestamp when the audit was performed */
  timestamp: number;
  /** Files that were audited */
  files: ParsedHoloFile[];
  /** Results per WCAG criterion */
  criterionResults: CriterionAuditResult[];
  /** All individual check results */
  allChecks: AuditCheckResult[];
  /** Summary statistics */
  summary: AuditSummary;
  /** Overall compliance score (0-100) */
  complianceScore: number;
  /** Whether the scene passes WCAG 2.1 Level AA */
  passesLevelAA: boolean;
}

/**
 * Summary statistics for an audit report.
 */
export interface AuditSummary {
  /** Total objects scanned */
  totalObjects: number;
  /** Total interactive objects */
  interactiveObjects: number;
  /** Objects with visual content */
  visualObjects: number;
  /** Objects with audio content */
  audioObjects: number;
  /** Objects with animation */
  animatedObjects: number;
  /** Total WCAG criteria checked */
  totalCriteria: number;
  /** Criteria that pass */
  criteriaPassed: number;
  /** Criteria that fail */
  criteriaFailed: number;
  /** Criteria with warnings */
  criteriaWarning: number;
  /** Criteria not applicable */
  criteriaNotApplicable: number;
  /** Total individual checks */
  totalChecks: number;
  /** Passed checks */
  passedChecks: number;
  /** Failed checks */
  failedChecks: number;
  /** Warning checks */
  warningChecks: number;
  /** Trait coverage: which traits are used at all */
  traitCoverage: Record<HoloAccessibilityTrait, number>;
  /** Per-principle pass rates */
  principleScores: Record<WCAGPrinciple, number>;
}

// =============================================================================
// DASHBOARD STATE
// =============================================================================

/**
 * Display mode for the Accessibility Audit Dashboard.
 */
export type A11yDisplayMode =
  | 'dashboard'     // Full dashboard with all panels
  | 'compact'       // Compact summary bar
  | 'overlay';      // Semi-transparent overlay

/**
 * Available panels in the dashboard.
 */
export type A11yPanel =
  | 'score-overview'     // Compliance score and principle breakdown
  | 'criterion-list'     // WCAG criterion results list
  | 'trait-coverage'     // Trait usage heatmap
  | 'object-inspector'   // Per-object audit results
  | 'file-list';         // Scanned files list

/**
 * Complete accessibility audit dashboard state.
 */
export interface A11yDashboardState {
  /** Current audit report (null if no scan has been run) */
  report: AccessibilityAuditReport | null;
  /** Whether a scan is currently in progress */
  isScanning: boolean;
  /** Error message from the last scan (if any) */
  scanError: string | null;
  /** Selected file for detailed view */
  selectedFile: string | null;
  /** Selected WCAG criterion for filtered view */
  selectedCriterion: string | null;
  /** Filter: which severity levels to show */
  severityFilter: Set<AuditSeverity>;
  /** Filter: which status types to show */
  statusFilter: Set<AuditCheckStatus>;
  /** Display mode */
  displayMode: A11yDisplayMode;
  /** Visible panels */
  visiblePanels: Set<A11yPanel>;
  /** Expanded object names in the inspector */
  expandedObjects: Set<string>;
}

/**
 * Actions available from the useAccessibilityAudit hook.
 */
export interface A11yDashboardActions {
  /** Run a scan on one or more .holo file contents */
  runScan: (files: Array<{ fileName: string; filePath: string; source: string }>) => void;
  /** Clear the current report */
  clearReport: () => void;
  /** Select a file for detailed view */
  selectFile: (fileName: string | null) => void;
  /** Select a WCAG criterion for filtered view */
  selectCriterion: (criterionId: string | null) => void;
  /** Toggle a severity filter */
  toggleSeverityFilter: (severity: AuditSeverity) => void;
  /** Toggle a status filter */
  toggleStatusFilter: (status: AuditCheckStatus) => void;
  /** Set display mode */
  setDisplayMode: (mode: A11yDisplayMode) => void;
  /** Toggle a panel's visibility */
  togglePanel: (panel: A11yPanel) => void;
  /** Toggle an object's expanded state in the inspector */
  toggleObjectExpanded: (objectName: string) => void;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the Accessibility Audit Dashboard.
 */
export interface A11yTheme {
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
  /** Pass color */
  passColor: string;
  /** Fail color */
  failColor: string;
  /** Warning color */
  warningColor: string;
  /** Info color */
  infoColor: string;
  /** Accent color */
  accentColor: string;
  /** Perceivable principle color */
  perceivableColor: string;
  /** Operable principle color */
  operableColor: string;
  /** Understandable principle color */
  understandableColor: string;
  /** Robust principle color */
  robustColor: string;
}

/**
 * Default theme for the Accessibility Audit Dashboard.
 */
export const DEFAULT_A11Y_THEME: A11yTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',
  containerBackground: 'rgba(8, 12, 28, 0.92)',
  cardBackground: 'rgba(16, 20, 44, 0.88)',
  textPrimary: '#e8e8f8',
  textSecondary: '#a0a0c8',
  textMuted: '#7880a8',
  borderColor: 'rgba(48, 52, 80, 0.85)',
  passColor: '#22c55e',
  failColor: '#ef4444',
  warningColor: '#f59e0b',
  infoColor: '#3b82f6',
  accentColor: '#6366f1',
  perceivableColor: '#22c55e',
  operableColor: '#3b82f6',
  understandableColor: '#f59e0b',
  robustColor: '#a855f7',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the theme color for a WCAG principle.
 */
export function getPrincipleColor(principle: WCAGPrinciple, theme: A11yTheme): string {
  switch (principle) {
    case 'perceivable': return theme.perceivableColor;
    case 'operable': return theme.operableColor;
    case 'understandable': return theme.understandableColor;
    case 'robust': return theme.robustColor;
    default: return theme.textMuted;
  }
}

/**
 * Get the theme color for an audit check status.
 */
export function getStatusColor(status: AuditCheckStatus, theme: A11yTheme): string {
  switch (status) {
    case 'pass': return theme.passColor;
    case 'fail': return theme.failColor;
    case 'warning': return theme.warningColor;
    case 'not_applicable': return theme.textMuted;
    default: return theme.textMuted;
  }
}

/**
 * Get the theme color for an audit severity.
 */
export function getSeverityColor(severity: AuditSeverity, theme: A11yTheme): string {
  switch (severity) {
    case 'critical': return theme.failColor;
    case 'major': return theme.warningColor;
    case 'minor': return theme.infoColor;
    case 'info': return theme.textSecondary;
    default: return theme.textMuted;
  }
}

/**
 * Human-readable label for a WCAG principle.
 */
export function getPrincipleLabel(principle: WCAGPrinciple): string {
  switch (principle) {
    case 'perceivable': return 'Perceivable';
    case 'operable': return 'Operable';
    case 'understandable': return 'Understandable';
    case 'robust': return 'Robust';
    default: return principle;
  }
}

/**
 * Create a unique audit check ID.
 */
export function createAuditCheckId(): string {
  return `a11y-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a unique report ID.
 */
export function createReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// =============================================================================
// PERFORMANCE BUDGET CONSTANTS
// =============================================================================

export const A11Y_FRAME_BUDGET = {
  /** Maximum dashboard render time in ms */
  DASHBOARD_BUDGET_MS: 0.5,
  /** Maximum objects to display without virtualization */
  MAX_VISIBLE_OBJECTS: 100,
  /** Maximum check results to render at once */
  MAX_VISIBLE_CHECKS: 200,
  /** Scan timeout in ms */
  SCAN_TIMEOUT_MS: 10000,
} as const;
