'use client';

import { useCallback, useReducer } from 'react';
import type {
  AvatarBlueprint,
  BodyConfig,
  BodyProportions,
  FaceConfig,
  FaceMorphs,
  HairConfig,
  ClothingSlot,
  ClothingSlotName,
  AccessorySlot,
  AccessorySlotName,
  ExpressionPreset,
  VRMMetadata,
  StudioTab,
} from '@/lib/types';
import { createDefaultBlueprint } from '@/lib/defaults';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface BlueprintState {
  blueprint: AvatarBlueprint;
  activeTab: StudioTab;
  undoStack: AvatarBlueprint[];
  redoStack: AvatarBlueprint[];
  isDirty: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type BlueprintAction =
  | { type: 'SET_BLUEPRINT'; blueprint: AvatarBlueprint }
  | { type: 'UPDATE_BODY'; body: Partial<BodyConfig> }
  | { type: 'UPDATE_BODY_PROPORTIONS'; proportions: Partial<BodyProportions> }
  | { type: 'SET_SKIN_COLOR'; hex: string }
  | { type: 'UPDATE_FACE'; face: Partial<FaceConfig> }
  | { type: 'UPDATE_FACE_MORPHS'; morphs: Partial<FaceMorphs> }
  | { type: 'SET_EYE_COLOR'; hex: string }
  | { type: 'UPDATE_HAIR'; hair: Partial<HairConfig> }
  | { type: 'SET_HAIR_STYLE'; styleId: string }
  | { type: 'EQUIP_CLOTHING'; slot: ClothingSlot }
  | { type: 'UNEQUIP_CLOTHING'; slotName: ClothingSlotName }
  | { type: 'EQUIP_ACCESSORY'; slot: AccessorySlot }
  | { type: 'UNEQUIP_ACCESSORY'; slotName: AccessorySlotName }
  | { type: 'SET_EXPRESSION'; expression: ExpressionPreset }
  | { type: 'REMOVE_EXPRESSION'; name: string }
  | { type: 'SET_VRM_META'; meta: Partial<VRMMetadata> }
  | { type: 'SET_TAB'; tab: StudioTab }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_SAVED' }
  | { type: 'RESET'; initial?: Partial<AvatarBlueprint> };

const MAX_UNDO = 50;

function pushUndo(state: BlueprintState): Pick<BlueprintState, 'undoStack' | 'redoStack'> {
  const stack = [...state.undoStack, state.blueprint];
  if (stack.length > MAX_UNDO) stack.shift();
  return { undoStack: stack, redoStack: [] };
}

function blueprintReducer(state: BlueprintState, action: BlueprintAction): BlueprintState {
  switch (action.type) {
    case 'SET_BLUEPRINT':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: action.blueprint,
        isDirty: true,
      };

    case 'UPDATE_BODY':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          body: { ...state.blueprint.body, ...action.body },
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'UPDATE_BODY_PROPORTIONS':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          body: {
            ...state.blueprint.body,
            proportions: {
              ...state.blueprint.body.proportions,
              ...action.proportions,
            },
          },
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'SET_SKIN_COLOR':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          body: {
            ...state.blueprint.body,
            skinColor: { hex: action.hex },
          },
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'UPDATE_FACE':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          face: { ...state.blueprint.face, ...action.face },
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'UPDATE_FACE_MORPHS':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          face: {
            ...state.blueprint.face,
            morphs: {
              ...state.blueprint.face.morphs,
              ...action.morphs,
            },
          },
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'SET_EYE_COLOR':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          face: {
            ...state.blueprint.face,
            eyes: {
              ...state.blueprint.face.eyes,
              irisColor: { hex: action.hex },
            },
          },
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'UPDATE_HAIR':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          hair: { ...state.blueprint.hair, ...action.hair },
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'SET_HAIR_STYLE':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          hair: { ...state.blueprint.hair, styleId: action.styleId },
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'EQUIP_CLOTHING': {
      const existing = state.blueprint.clothing.filter((c) => c.slot !== action.slot.slot);
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          clothing: [...existing, action.slot],
          updatedAt: Date.now(),
        },
        isDirty: true,
      };
    }

    case 'UNEQUIP_CLOTHING':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          clothing: state.blueprint.clothing.filter((c) => c.slot !== action.slotName),
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'EQUIP_ACCESSORY': {
      const existing = state.blueprint.accessories.filter((a) => a.slot !== action.slot.slot);
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          accessories: [...existing, action.slot],
          updatedAt: Date.now(),
        },
        isDirty: true,
      };
    }

    case 'UNEQUIP_ACCESSORY':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          accessories: state.blueprint.accessories.filter((a) => a.slot !== action.slotName),
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'SET_EXPRESSION': {
      const existing = state.blueprint.expressions.filter((e) => e.name !== action.expression.name);
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          expressions: [...existing, action.expression],
          updatedAt: Date.now(),
        },
        isDirty: true,
      };
    }

    case 'REMOVE_EXPRESSION':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          expressions: state.blueprint.expressions.filter((e) => e.name !== action.name),
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'SET_VRM_META':
      return {
        ...state,
        ...pushUndo(state),
        blueprint: {
          ...state.blueprint,
          vrmMeta: { ...state.blueprint.vrmMeta, ...action.meta },
          updatedAt: Date.now(),
        },
        isDirty: true,
      };

    case 'SET_TAB':
      return { ...state, activeTab: action.tab };

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        blueprint: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.blueprint],
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        blueprint: next,
        undoStack: [...state.undoStack, state.blueprint],
        redoStack: state.redoStack.slice(0, -1),
        isDirty: true,
      };
    }

    case 'MARK_SAVED':
      return { ...state, isDirty: false };

    case 'RESET':
      return {
        ...state,
        blueprint: createDefaultBlueprint(action.initial),
        undoStack: [],
        redoStack: [],
        isDirty: false,
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBlueprint(initial?: Partial<AvatarBlueprint>) {
  const [state, dispatch] = useReducer(blueprintReducer, {
    blueprint: createDefaultBlueprint(initial),
    activeTab: 'body' as StudioTab,
    undoStack: [],
    redoStack: [],
    isDirty: false,
  });

  // Memoized dispatch helpers
  const setTab = useCallback((tab: StudioTab) => dispatch({ type: 'SET_TAB', tab }), []);
  const updateBody = useCallback(
    (body: Partial<BodyConfig>) => dispatch({ type: 'UPDATE_BODY', body }),
    []
  );
  const updateBodyProportions = useCallback(
    (proportions: Partial<BodyProportions>) =>
      dispatch({ type: 'UPDATE_BODY_PROPORTIONS', proportions }),
    []
  );
  const setSkinColor = useCallback((hex: string) => dispatch({ type: 'SET_SKIN_COLOR', hex }), []);
  const updateFace = useCallback(
    (face: Partial<FaceConfig>) => dispatch({ type: 'UPDATE_FACE', face }),
    []
  );
  const updateFaceMorphs = useCallback(
    (morphs: Partial<FaceMorphs>) => dispatch({ type: 'UPDATE_FACE_MORPHS', morphs }),
    []
  );
  const setEyeColor = useCallback((hex: string) => dispatch({ type: 'SET_EYE_COLOR', hex }), []);
  const updateHair = useCallback(
    (hair: Partial<HairConfig>) => dispatch({ type: 'UPDATE_HAIR', hair }),
    []
  );
  const setHairStyle = useCallback(
    (styleId: string) => dispatch({ type: 'SET_HAIR_STYLE', styleId }),
    []
  );
  const equipClothing = useCallback(
    (slot: ClothingSlot) => dispatch({ type: 'EQUIP_CLOTHING', slot }),
    []
  );
  const unequipClothing = useCallback(
    (slotName: ClothingSlotName) => dispatch({ type: 'UNEQUIP_CLOTHING', slotName }),
    []
  );
  const equipAccessory = useCallback(
    (slot: AccessorySlot) => dispatch({ type: 'EQUIP_ACCESSORY', slot }),
    []
  );
  const unequipAccessory = useCallback(
    (slotName: AccessorySlotName) => dispatch({ type: 'UNEQUIP_ACCESSORY', slotName }),
    []
  );
  const setExpression = useCallback(
    (expression: ExpressionPreset) => dispatch({ type: 'SET_EXPRESSION', expression }),
    []
  );
  const removeExpression = useCallback(
    (name: string) => dispatch({ type: 'REMOVE_EXPRESSION', name }),
    []
  );
  const setVRMMeta = useCallback(
    (meta: Partial<VRMMetadata>) => dispatch({ type: 'SET_VRM_META', meta }),
    []
  );
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const markSaved = useCallback(() => dispatch({ type: 'MARK_SAVED' }), []);
  const reset = useCallback(
    (initial?: Partial<AvatarBlueprint>) => dispatch({ type: 'RESET', initial }),
    []
  );

  return {
    blueprint: state.blueprint,
    activeTab: state.activeTab,
    isDirty: state.isDirty,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,

    setTab,
    updateBody,
    updateBodyProportions,
    setSkinColor,
    updateFace,
    updateFaceMorphs,
    setEyeColor,
    updateHair,
    setHairStyle,
    equipClothing,
    unequipClothing,
    equipAccessory,
    unequipAccessory,
    setExpression,
    removeExpression,
    setVRMMeta,
    undo,
    redo,
    markSaved,
    reset,
  };
}

export type UseBlueprintReturn = ReturnType<typeof useBlueprint>;
