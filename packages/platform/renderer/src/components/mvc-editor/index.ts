/**
 * MVC Editor Components
 *
 * React components for editing MVC (Model-View-Controller) state with CRDT integration.
 * All components integrate with @holoscript/mvc-schema for cross-reality agent state management.
 *
 * @module mvc-editor
 */

// Components
export { DecisionHistoryEditor } from './DecisionHistoryEditor';
export { ActiveTaskEditor } from './ActiveTaskEditor';
export { UserPreferencesEditor } from './UserPreferencesEditor';
export { SpatialContextEditor } from './SpatialContextEditor';
export { EvidenceTrailViewer } from './EvidenceTrailViewer';

// Types
export type {
  // Common types
  MVCEditorTheme,
  EditorDisplayMode,
  BaseEditorProps,
  PreferenceFieldMetadata,

  // DecisionHistoryEditor types
  DecisionHistoryEditorProps,
  DecisionHistoryEditorState,

  // ActiveTaskEditor types
  ActiveTaskEditorProps,
  ActiveTaskEditorState,

  // UserPreferencesEditor types
  UserPreferencesEditorProps,
  UserPreferencesEditorState,

  // SpatialContextEditor types
  SpatialContextEditorProps,
  SpatialContextEditorState,

  // EvidenceTrailViewer types
  EvidenceTrailViewerProps,
  EvidenceTrailViewerState,
} from './types';

// Constants and utilities
export {
  DEFAULT_MVC_EDITOR_THEME,
  applyOverlayOpacity,
  formatRelativeTime,
  formatTimestamp,
  getTaskStatusColor,
  getTaskPriorityColor,
  getEvidenceTypeColor,
  truncateText,
  mergeTheme,
} from './types';
