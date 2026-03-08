/**
 * @vitest-environment jsdom
 */

/**
 * Integration Tests for Composition Editor
 *
 * Validates:
 * - End-to-end composition creation workflow
 * - Vertical selection -> trait selection -> configuration -> code generation
 * - Import/export round-trip
 * - State synchronization between components
 */

import { describe, it, expect } from 'vitest';
import { editorReducer, initialEditorState } from '../editorReducer';
import type { EditorAction, ConfiguredTrait, Composition } from '../types';

describe('Composition Editor Integration', () => {
  describe('Complete workflow: vertical -> trait -> config -> code', () => {
    it('should support full composition creation flow', () => {
      let state = initialEditorState;

      // Step 1: Select vertical
      const selectVertical: EditorAction = {
        type: 'SET_VERTICAL',
        vertical: 'healthcare',
      };
      state = editorReducer(state, selectVertical);

      expect(state.activeVertical).toBe('healthcare');
      expect(state.composition.vertical).toBe('healthcare');

      // Step 2: Select trait
      const selectTrait: EditorAction = {
        type: 'SELECT_TRAIT',
        trait: '@hand_tracked',
      };
      state = editorReducer(state, selectTrait);

      expect(state.selectedTrait).toBe('@hand_tracked');

      // Step 3: Add trait with configuration
      const addTrait: EditorAction = {
        type: 'ADD_TRAIT',
        trait: {
          name: '@hand_tracked',
          config: {
            precision: 'high',
            solver: 'fabrik',
            iterations: 20,
          },
          sourceVertical: 'healthcare',
        },
      };
      state = editorReducer(state, addTrait);

      expect(state.composition.traits).toHaveLength(1);
      expect(state.composition.traits[0].name).toBe('@hand_tracked');
      expect(state.composition.traits[0].config.precision).toBe('high');

      // Step 4: Add second trait
      const selectTrait2: EditorAction = {
        type: 'SELECT_TRAIT',
        trait: '@haptic',
      };
      state = editorReducer(state, selectTrait2);

      const addTrait2: EditorAction = {
        type: 'ADD_TRAIT',
        trait: {
          name: '@haptic',
          config: {
            intensity: 0.8,
            pattern: 'pulse',
          },
          sourceVertical: 'healthcare',
        },
      };
      state = editorReducer(state, addTrait2);

      expect(state.composition.traits).toHaveLength(2);

      // Step 5: Update first trait configuration
      const updateConfig: EditorAction = {
        type: 'UPDATE_TRAIT_CONFIG',
        traitName: '@hand_tracked',
        config: {
          precision: 'high',
          solver: 'fabrik',
          iterations: 30, // Updated value
        },
      };
      state = editorReducer(state, updateConfig);

      expect(state.composition.traits[0].config.iterations).toBe(30);

      // Step 6: Remove a trait
      const removeTrait: EditorAction = {
        type: 'REMOVE_TRAIT',
        traitName: '@haptic',
      };
      state = editorReducer(state, removeTrait);

      expect(state.composition.traits).toHaveLength(1);
      expect(state.composition.traits[0].name).toBe('@hand_tracked');

      // Verify final state
      expect(state.activeVertical).toBe('healthcare');
      expect(state.composition.traits).toHaveLength(1);
      expect(state.composition.traits[0].config.iterations).toBe(30);
    });
  });

  describe('Multi-vertical workflow', () => {
    it('should support switching between verticals and accumulating traits', () => {
      let state = initialEditorState;

      // Add trait from healthcare vertical
      state = editorReducer(state, { type: 'SET_VERTICAL', vertical: 'healthcare' });
      state = editorReducer(state, {
        type: 'ADD_TRAIT',
        trait: {
          name: '@hand_tracked',
          config: { precision: 'high' },
          sourceVertical: 'healthcare',
        },
      });

      // Switch to gaming vertical
      state = editorReducer(state, { type: 'SET_VERTICAL', vertical: 'gaming' });

      expect(state.activeVertical).toBe('gaming');
      expect(state.composition.vertical).toBe('gaming');
      // Previous trait should still be there
      expect(state.composition.traits).toHaveLength(1);

      // Add trait from gaming vertical
      state = editorReducer(state, {
        type: 'ADD_TRAIT',
        trait: {
          name: '@rigidbody',
          config: { mass: 1.0, type: 'dynamic' },
          sourceVertical: 'gaming',
        },
      });

      expect(state.composition.traits).toHaveLength(2);
      expect(state.composition.traits[0].sourceVertical).toBe('healthcare');
      expect(state.composition.traits[1].sourceVertical).toBe('gaming');
    });
  });

  describe('Import/Export round-trip', () => {
    it('should export and re-import composition without data loss', () => {
      // Create a composition
      let state = initialEditorState;

      state = editorReducer(state, { type: 'SET_VERTICAL', vertical: 'healthcare' });

      const trait1: ConfiguredTrait = {
        name: '@hand_tracked',
        config: {
          precision: 'high',
          solver: 'fabrik',
          iterations: 20,
        },
        sourceVertical: 'healthcare',
      };

      const trait2: ConfiguredTrait = {
        name: '@haptic',
        config: {
          intensity: 0.8,
          pattern: 'pulse',
        },
        sourceVertical: 'healthcare',
      };

      state = editorReducer(state, { type: 'ADD_TRAIT', trait: trait1 });
      state = editorReducer(state, { type: 'ADD_TRAIT', trait: trait2 });

      const originalComposition = state.composition;

      // Export (simulate code generation)
      expect(originalComposition.traits).toHaveLength(2);
      expect(originalComposition.vertical).toBe('healthcare');

      // Import (load composition back)
      const importedComposition: Composition = {
        ...originalComposition,
        objectId: originalComposition.objectId,
        objectType: originalComposition.objectType,
        vertical: originalComposition.vertical,
        traits: [...originalComposition.traits],
        metadata: { ...originalComposition.metadata },
      };

      const newState = editorReducer(
        initialEditorState,
        { type: 'LOAD_COMPOSITION', composition: importedComposition }
      );

      // Verify imported composition matches original
      expect(newState.composition.objectId).toBe(originalComposition.objectId);
      expect(newState.composition.vertical).toBe(originalComposition.vertical);
      expect(newState.composition.traits).toHaveLength(2);
      expect(newState.composition.traits[0].name).toBe('@hand_tracked');
      expect(newState.composition.traits[1].name).toBe('@haptic');
      expect(newState.activeVertical).toBe('healthcare');
    });
  });

  describe('Search filtering integration', () => {
    it('should filter traits and maintain selection state', () => {
      let state = initialEditorState;

      // Set search query
      state = editorReducer(state, { type: 'SET_SEARCH', query: 'hand' });

      expect(state.searchQuery).toBe('hand');

      // Select a trait that matches the search
      state = editorReducer(state, { type: 'SELECT_TRAIT', trait: '@hand_tracked' });

      expect(state.selectedTrait).toBe('@hand_tracked');

      // Change search query
      state = editorReducer(state, { type: 'SET_SEARCH', query: 'haptic' });

      // Selection should still be maintained
      expect(state.selectedTrait).toBe('@hand_tracked');
      expect(state.searchQuery).toBe('haptic');
    });
  });

  describe('Edge cases', () => {
    it('should handle adding duplicate trait (should update, not duplicate)', () => {
      let state = initialEditorState;

      const trait1: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'medium' },
      };

      const trait2: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'high', solver: 'fabrik' },
      };

      state = editorReducer(state, { type: 'ADD_TRAIT', trait: trait1 });
      expect(state.composition.traits).toHaveLength(1);

      state = editorReducer(state, { type: 'ADD_TRAIT', trait: trait2 });
      expect(state.composition.traits).toHaveLength(1); // Still 1, not 2
      expect(state.composition.traits[0].config.precision).toBe('high');
      expect(state.composition.traits[0].config.solver).toBe('fabrik');
    });

    it('should handle removing non-existent trait gracefully', () => {
      let state = initialEditorState;

      state = editorReducer(state, {
        type: 'ADD_TRAIT',
        trait: { name: '@hand_tracked', config: {} },
      });

      expect(state.composition.traits).toHaveLength(1);

      state = editorReducer(state, { type: 'REMOVE_TRAIT', traitName: '@haptic' });

      // Should not crash, should keep existing trait
      expect(state.composition.traits).toHaveLength(1);
      expect(state.composition.traits[0].name).toBe('@hand_tracked');
    });

    it('should handle updating config of non-existent trait gracefully', () => {
      let state = initialEditorState;

      state = editorReducer(state, {
        type: 'ADD_TRAIT',
        trait: { name: '@hand_tracked', config: { precision: 'medium' } },
      });

      state = editorReducer(state, {
        type: 'UPDATE_TRAIT_CONFIG',
        traitName: '@haptic',
        config: { intensity: 0.9 },
      });

      // Should not crash, should keep existing trait unchanged
      expect(state.composition.traits).toHaveLength(1);
      expect(state.composition.traits[0].config.precision).toBe('medium');
    });

    it('should handle reset after complex operations', () => {
      let state = initialEditorState;

      // Perform multiple operations
      state = editorReducer(state, { type: 'SET_VERTICAL', vertical: 'healthcare' });
      state = editorReducer(state, { type: 'SELECT_TRAIT', trait: '@hand_tracked' });
      state = editorReducer(state, {
        type: 'ADD_TRAIT',
        trait: { name: '@hand_tracked', config: { precision: 'high' } },
      });
      state = editorReducer(state, { type: 'SET_SEARCH', query: 'hand' });

      // Reset
      state = editorReducer(state, { type: 'RESET' });

      // Should be back to initial state
      expect(state).toEqual(initialEditorState);
    });
  });
});
