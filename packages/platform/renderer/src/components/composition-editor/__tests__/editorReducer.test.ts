/**
 * @vitest-environment jsdom
 */

/**
 * Tests for editorReducer
 *
 * Validates:
 * - State initialization
 * - SET_VERTICAL action
 * - SELECT_TRAIT action
 * - ADD_TRAIT action (new and duplicate handling)
 * - REMOVE_TRAIT action
 * - UPDATE_TRAIT_CONFIG action
 * - SET_SEARCH action
 * - LOAD_COMPOSITION action
 * - RESET action
 */

import { describe, it, expect } from 'vitest';
import { editorReducer, initialEditorState } from '../editorReducer';
import type { EditorState, EditorAction, ConfiguredTrait } from '../types';

describe('editorReducer', () => {
  describe('initialEditorState', () => {
    it('should have correct initial state', () => {
      expect(initialEditorState.composition.objectId).toBe('untitled');
      expect(initialEditorState.composition.objectType).toBe('object');
      expect(initialEditorState.composition.vertical).toBeNull();
      expect(initialEditorState.composition.traits).toEqual([]);
      expect(initialEditorState.selectedTrait).toBeNull();
      expect(initialEditorState.activeVertical).toBeNull();
      expect(initialEditorState.searchQuery).toBe('');
    });
  });

  describe('SET_VERTICAL', () => {
    it('should set activeVertical and composition.vertical', () => {
      const action: EditorAction = { type: 'SET_VERTICAL', vertical: 'healthcare' };
      const newState = editorReducer(initialEditorState, action);

      expect(newState.activeVertical).toBe('healthcare');
      expect(newState.composition.vertical).toBe('healthcare');
    });

    it('should allow setting vertical to null', () => {
      const stateWithVertical: EditorState = {
        ...initialEditorState,
        activeVertical: 'healthcare',
        composition: { ...initialEditorState.composition, vertical: 'healthcare' },
      };

      const action: EditorAction = { type: 'SET_VERTICAL', vertical: null };
      const newState = editorReducer(stateWithVertical, action);

      expect(newState.activeVertical).toBeNull();
      expect(newState.composition.vertical).toBeNull();
    });
  });

  describe('SELECT_TRAIT', () => {
    it('should set selectedTrait', () => {
      const action: EditorAction = { type: 'SELECT_TRAIT', trait: '@hand_tracked' };
      const newState = editorReducer(initialEditorState, action);

      expect(newState.selectedTrait).toBe('@hand_tracked');
    });

    it('should allow deselecting trait', () => {
      const stateWithSelection: EditorState = {
        ...initialEditorState,
        selectedTrait: '@hand_tracked',
      };

      const action: EditorAction = { type: 'SELECT_TRAIT', trait: null };
      const newState = editorReducer(stateWithSelection, action);

      expect(newState.selectedTrait).toBeNull();
    });
  });

  describe('ADD_TRAIT', () => {
    it('should add a new trait to composition', () => {
      const trait: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'high' },
        sourceVertical: 'healthcare',
      };

      const action: EditorAction = { type: 'ADD_TRAIT', trait };
      const newState = editorReducer(initialEditorState, action);

      expect(newState.composition.traits).toHaveLength(1);
      expect(newState.composition.traits[0]).toEqual(trait);
      expect(newState.selectedTrait).toBe('@hand_tracked');
    });

    it('should update existing trait when adding duplicate', () => {
      const existingTrait: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'medium' },
      };

      const stateWithTrait: EditorState = {
        ...initialEditorState,
        composition: {
          ...initialEditorState.composition,
          traits: [existingTrait],
        },
      };

      const updatedTrait: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'high' },
        sourceVertical: 'healthcare',
      };

      const action: EditorAction = { type: 'ADD_TRAIT', trait: updatedTrait };
      const newState = editorReducer(stateWithTrait, action);

      expect(newState.composition.traits).toHaveLength(1);
      expect(newState.composition.traits[0]).toEqual(updatedTrait);
    });

    it('should add multiple different traits', () => {
      const trait1: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'high' },
      };

      const trait2: ConfiguredTrait = {
        name: '@haptic',
        config: { intensity: 0.8 },
      };

      let state = editorReducer(initialEditorState, { type: 'ADD_TRAIT', trait: trait1 });
      state = editorReducer(state, { type: 'ADD_TRAIT', trait: trait2 });

      expect(state.composition.traits).toHaveLength(2);
      expect(state.composition.traits[0].name).toBe('@hand_tracked');
      expect(state.composition.traits[1].name).toBe('@haptic');
    });
  });

  describe('REMOVE_TRAIT', () => {
    it('should remove trait from composition', () => {
      const trait: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'high' },
      };

      const stateWithTrait: EditorState = {
        ...initialEditorState,
        composition: {
          ...initialEditorState.composition,
          traits: [trait],
        },
      };

      const action: EditorAction = { type: 'REMOVE_TRAIT', traitName: '@hand_tracked' };
      const newState = editorReducer(stateWithTrait, action);

      expect(newState.composition.traits).toHaveLength(0);
    });

    it('should deselect trait if it was selected', () => {
      const trait: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'high' },
      };

      const stateWithTrait: EditorState = {
        ...initialEditorState,
        selectedTrait: '@hand_tracked',
        composition: {
          ...initialEditorState.composition,
          traits: [trait],
        },
      };

      const action: EditorAction = { type: 'REMOVE_TRAIT', traitName: '@hand_tracked' };
      const newState = editorReducer(stateWithTrait, action);

      expect(newState.selectedTrait).toBeNull();
    });

    it('should not deselect other selected trait', () => {
      const trait1: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'high' },
      };

      const trait2: ConfiguredTrait = {
        name: '@haptic',
        config: { intensity: 0.8 },
      };

      const stateWithTraits: EditorState = {
        ...initialEditorState,
        selectedTrait: '@haptic',
        composition: {
          ...initialEditorState.composition,
          traits: [trait1, trait2],
        },
      };

      const action: EditorAction = { type: 'REMOVE_TRAIT', traitName: '@hand_tracked' };
      const newState = editorReducer(stateWithTraits, action);

      expect(newState.selectedTrait).toBe('@haptic');
      expect(newState.composition.traits).toHaveLength(1);
      expect(newState.composition.traits[0].name).toBe('@haptic');
    });
  });

  describe('UPDATE_TRAIT_CONFIG', () => {
    it('should update trait configuration', () => {
      const trait: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'medium' },
      };

      const stateWithTrait: EditorState = {
        ...initialEditorState,
        composition: {
          ...initialEditorState.composition,
          traits: [trait],
        },
      };

      const action: EditorAction = {
        type: 'UPDATE_TRAIT_CONFIG',
        traitName: '@hand_tracked',
        config: { precision: 'high', solver: 'fabrik' },
      };

      const newState = editorReducer(stateWithTrait, action);

      expect(newState.composition.traits[0].config).toEqual({
        precision: 'high',
        solver: 'fabrik',
      });
    });

    it('should only update matching trait', () => {
      const trait1: ConfiguredTrait = {
        name: '@hand_tracked',
        config: { precision: 'medium' },
      };

      const trait2: ConfiguredTrait = {
        name: '@haptic',
        config: { intensity: 0.5 },
      };

      const stateWithTraits: EditorState = {
        ...initialEditorState,
        composition: {
          ...initialEditorState.composition,
          traits: [trait1, trait2],
        },
      };

      const action: EditorAction = {
        type: 'UPDATE_TRAIT_CONFIG',
        traitName: '@haptic',
        config: { intensity: 0.9 },
      };

      const newState = editorReducer(stateWithTraits, action);

      expect(newState.composition.traits[0].config.precision).toBe('medium');
      expect(newState.composition.traits[1].config.intensity).toBe(0.9);
    });
  });

  describe('SET_SEARCH', () => {
    it('should update search query', () => {
      const action: EditorAction = { type: 'SET_SEARCH', query: 'hand' };
      const newState = editorReducer(initialEditorState, action);

      expect(newState.searchQuery).toBe('hand');
    });
  });

  describe('LOAD_COMPOSITION', () => {
    it('should load composition and set activeVertical', () => {
      const composition = {
        objectId: 'MedicalTraining',
        objectType: 'scene',
        vertical: 'healthcare',
        traits: [
          { name: '@hand_tracked', config: { precision: 'high' } },
          { name: '@haptic', config: { intensity: 0.8 } },
        ],
        metadata: {
          category: 'medical',
          description: 'Surgical training scene',
        },
      };

      const action: EditorAction = { type: 'LOAD_COMPOSITION', composition };
      const newState = editorReducer(initialEditorState, action);

      expect(newState.composition).toEqual(composition);
      expect(newState.activeVertical).toBe('healthcare');
      expect(newState.selectedTrait).toBeNull();
    });
  });

  describe('RESET', () => {
    it('should reset to initial state', () => {
      const modifiedState: EditorState = {
        composition: {
          objectId: 'Test',
          objectType: 'object',
          vertical: 'gaming',
          traits: [{ name: '@rigidbody', config: { mass: 1.0 } }],
          metadata: {},
        },
        selectedTrait: '@rigidbody',
        activeVertical: 'gaming',
        searchQuery: 'physics',
      };

      const action: EditorAction = { type: 'RESET' };
      const newState = editorReducer(modifiedState, action);

      expect(newState).toEqual(initialEditorState);
    });
  });
});
