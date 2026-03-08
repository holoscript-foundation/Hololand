/**
 * Type definitions for the Composition Editor
 *
 * These types define the structure of composition state, trait configuration,
 * and the data models used throughout the composition editor UI.
 */

// Re-export types from HoloScript LSP
// NOTE: These would normally be imported from @holoscript/lsp package
// For now, we define them inline to avoid cross-package dependencies

export interface TraitRecommendation {
  /** Trait annotation name (e.g., "@hand_tracked") */
  trait: string;
  /** Relevance score for this vertical (0.0 - 1.0, higher = more relevant) */
  relevance: number;
  /** Short rationale explaining why this trait matters for the vertical */
  rationale: string;
  /** Key config properties to highlight in completion documentation */
  configHint: string;
}

export interface VerticalMapping {
  /** Machine-readable vertical identifier */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** Brief description of the vertical */
  description: string;
  /** Tags that may appear in metadata.tags to match this vertical */
  matchTags: string[];
  /** Ordered list of trait recommendations (highest relevance first) */
  traits: TraitRecommendation[];
}

/**
 * Represents a configured trait instance in the composition
 */
export interface ConfiguredTrait {
  /** The trait name (e.g., "@hand_tracked") */
  name: string;
  /** User-configured properties for this trait */
  config: Record<string, unknown>;
  /** Source vertical that recommended this trait (if applicable) */
  sourceVertical?: string;
}

/**
 * Represents the full composition being edited
 */
export interface Composition {
  /** Object identifier */
  objectId: string;
  /** Object type (e.g., "avatar", "prop", "scene") */
  objectType: string;
  /** Target vertical for this composition */
  vertical: string | null;
  /** Applied traits with their configurations */
  traits: ConfiguredTrait[];
  /** Metadata about the composition */
  metadata: {
    category?: string;
    tags?: string[];
    description?: string;
  };
}

/**
 * UI state for the composition editor
 */
export interface EditorState {
  /** Current composition being edited */
  composition: Composition;
  /** Selected trait for detail view (null if none selected) */
  selectedTrait: string | null;
  /** Active vertical filter (null shows all) */
  activeVertical: string | null;
  /** Search query for trait filtering */
  searchQuery: string;
}

/**
 * Actions for the editor reducer
 */
export type EditorAction =
  | { type: 'SET_VERTICAL'; vertical: string | null }
  | { type: 'SELECT_TRAIT'; trait: string | null }
  | { type: 'ADD_TRAIT'; trait: ConfiguredTrait }
  | { type: 'REMOVE_TRAIT'; traitName: string }
  | { type: 'UPDATE_TRAIT_CONFIG'; traitName: string; config: Record<string, unknown> }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'LOAD_COMPOSITION'; composition: Composition }
  | { type: 'RESET' };

/**
 * Matrix cell data for the vertical-trait grid
 */
export interface MatrixCell {
  vertical: string;
  trait: string;
  relevance: number;
  rationale: string;
  configHint: string;
  isSelected: boolean;
  isApplied: boolean;
}
