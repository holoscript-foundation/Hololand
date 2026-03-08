/**
 * Reducer for composition editor state management
 *
 * Manages the state of the composition being edited, including trait selection,
 * vertical filtering, and trait configuration updates.
 */

import type { EditorState, EditorAction, Composition } from './types';

/**
 * Initial editor state
 */
export const initialEditorState: EditorState = {
  composition: {
    objectId: 'untitled',
    objectType: 'object',
    vertical: null,
    traits: [],
    metadata: {},
  },
  selectedTrait: null,
  activeVertical: null,
  searchQuery: '',
};

/**
 * Editor state reducer
 */
export function editorReducer(
  state: EditorState,
  action: EditorAction
): EditorState {
  switch (action.type) {
    case 'SET_VERTICAL':
      return {
        ...state,
        activeVertical: action.vertical,
        composition: {
          ...state.composition,
          vertical: action.vertical,
        },
      };

    case 'SELECT_TRAIT':
      return {
        ...state,
        selectedTrait: action.trait,
      };

    case 'ADD_TRAIT': {
      // Prevent duplicate traits
      const existingIndex = state.composition.traits.findIndex(
        (t) => t.name === action.trait.name
      );

      if (existingIndex !== -1) {
        // Update existing trait
        const updatedTraits = [...state.composition.traits];
        updatedTraits[existingIndex] = action.trait;
        return {
          ...state,
          composition: {
            ...state.composition,
            traits: updatedTraits,
          },
          selectedTrait: action.trait.name,
        };
      }

      // Add new trait
      return {
        ...state,
        composition: {
          ...state.composition,
          traits: [...state.composition.traits, action.trait],
        },
        selectedTrait: action.trait.name,
      };
    }

    case 'REMOVE_TRAIT': {
      const filteredTraits = state.composition.traits.filter(
        (t) => t.name !== action.traitName
      );
      return {
        ...state,
        composition: {
          ...state.composition,
          traits: filteredTraits,
        },
        selectedTrait:
          state.selectedTrait === action.traitName ? null : state.selectedTrait,
      };
    }

    case 'UPDATE_TRAIT_CONFIG': {
      const updatedTraits = state.composition.traits.map((t) =>
        t.name === action.traitName
          ? { ...t, config: { ...t.config, ...action.config } }
          : t
      );
      return {
        ...state,
        composition: {
          ...state.composition,
          traits: updatedTraits,
        },
      };
    }

    case 'SET_SEARCH':
      return {
        ...state,
        searchQuery: action.query,
      };

    case 'LOAD_COMPOSITION':
      return {
        ...state,
        composition: action.composition,
        activeVertical: action.composition.vertical,
        selectedTrait: null,
      };

    case 'RESET':
      return initialEditorState;

    default:
      return state;
  }
}
