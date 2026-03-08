/**
 * Composition Editor - Public API
 *
 * Exports all public components and types for the composition editor.
 */

// Main page component
export { CompositionEditorPage as default } from './CompositionEditorPage';
export { CompositionEditorPage } from './CompositionEditorPage';

// Sub-components
export { VerticalSelector } from './VerticalSelector';
export { VerticalTraitMatrix } from './VerticalTraitMatrix';
export { TraitDetailPanel } from './TraitDetailPanel';
export { CompositionPreview } from './CompositionPreview';
export { HoloCodeGenerator } from './HoloCodeGenerator';

// State management
export { editorReducer, initialEditorState } from './editorReducer';

// Types
export type {
  TraitRecommendation,
  VerticalMapping,
  ConfiguredTrait,
  Composition,
  EditorState,
  EditorAction,
  MatrixCell,
} from './types';

// Data
export { VERTICAL_MAPPINGS } from './traitVerticalData-full';
