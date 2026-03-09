/**
 * @hololand/spatial-builder - useSceneEditor Hook
 *
 * Central state management for the scene editor viewport.
 * Uses useReducer for predictable state transitions with undo/redo support.
 */

import { useReducer, useCallback, useMemo } from 'react';
import type {
  SceneEditorState,
  SceneEditorAction,
  SceneObject,
  SceneSnapshot,
  TransformMode,
  TransformSpace,
  Vec3,
  EulerRotation,
  SceneMaterial,
  SceneLightProps,
  PrimitiveType,
  LightType,
  ImportedAssetMeta,
} from './types';
import { DEFAULT_MATERIAL, DEFAULT_LIGHT_PROPS } from './types';

// =============================================================================
// HELPERS
// =============================================================================

let objectCounter = 0;

function generateId(): string {
  objectCounter += 1;
  return `obj-${Date.now().toString(36)}-${objectCounter}`;
}

function createSnapshot(state: SceneEditorState): SceneSnapshot {
  return {
    objects: Array.from(state.objects.entries()).map(([k, v]) => [k, { ...v }]),
    rootIds: [...state.rootIds],
    selectedId: state.selectedId,
    timestamp: Date.now(),
  };
}

function cloneObject(obj: SceneObject, newId: string): SceneObject {
  return {
    ...obj,
    id: newId,
    name: `${obj.name} (copy)`,
    position: { ...obj.position, x: obj.position.x + 1 },
    rotation: { ...obj.rotation },
    scale: { ...obj.scale },
    material: { ...obj.material },
    lightProps: obj.lightProps ? { ...obj.lightProps } : undefined,
    assetMeta: obj.assetMeta ? { ...obj.assetMeta } : undefined,
    childIds: [],
    parentId: obj.parentId,
  };
}

// =============================================================================
// REDUCER
// =============================================================================

const MAX_UNDO_DEPTH = 50;

function sceneReducer(state: SceneEditorState, action: SceneEditorAction): SceneEditorState {
  switch (action.type) {
    case 'ADD_OBJECT': {
      const obj = action.payload;
      const newObjects = new Map(state.objects);
      newObjects.set(obj.id, obj);
      const newRootIds = obj.parentId === null
        ? [...state.rootIds, obj.id]
        : state.rootIds;
      return {
        ...state,
        objects: newObjects,
        rootIds: newRootIds,
        selectedId: obj.id,
      };
    }

    case 'REMOVE_OBJECT': {
      const { id } = action.payload;
      const obj = state.objects.get(id);
      if (!obj) return state;

      const newObjects = new Map(state.objects);

      // Recursively remove children
      const removeRecursive = (objId: string) => {
        const o = newObjects.get(objId);
        if (!o) return;
        for (const childId of o.childIds) {
          removeRecursive(childId);
        }
        newObjects.delete(objId);
      };
      removeRecursive(id);

      // Remove from parent's children
      if (obj.parentId) {
        const parent = newObjects.get(obj.parentId);
        if (parent) {
          newObjects.set(obj.parentId, {
            ...parent,
            childIds: parent.childIds.filter(cid => cid !== id),
          });
        }
      }

      const newRootIds = state.rootIds.filter(rid => rid !== id);
      const newSelectedId = state.selectedId === id ? null : state.selectedId;

      return {
        ...state,
        objects: newObjects,
        rootIds: newRootIds,
        selectedId: newSelectedId,
      };
    }

    case 'SELECT_OBJECT': {
      return { ...state, selectedId: action.payload.id };
    }

    case 'UPDATE_TRANSFORM': {
      const { id, position, rotation, scale } = action.payload;
      const obj = state.objects.get(id);
      if (!obj) return state;

      const newObjects = new Map(state.objects);
      newObjects.set(id, {
        ...obj,
        position: position ?? obj.position,
        rotation: rotation ?? obj.rotation,
        scale: scale ?? obj.scale,
      });
      return { ...state, objects: newObjects };
    }

    case 'UPDATE_MATERIAL': {
      const { id, material } = action.payload;
      const obj = state.objects.get(id);
      if (!obj) return state;

      const newObjects = new Map(state.objects);
      newObjects.set(id, {
        ...obj,
        material: { ...obj.material, ...material },
      });
      return { ...state, objects: newObjects };
    }

    case 'UPDATE_LIGHT': {
      const { id, lightProps } = action.payload;
      const obj = state.objects.get(id);
      if (!obj || !obj.lightProps) return state;

      const newObjects = new Map(state.objects);
      newObjects.set(id, {
        ...obj,
        lightProps: { ...obj.lightProps, ...lightProps },
      });
      return { ...state, objects: newObjects };
    }

    case 'RENAME_OBJECT': {
      const { id, name } = action.payload;
      const obj = state.objects.get(id);
      if (!obj) return state;

      const newObjects = new Map(state.objects);
      newObjects.set(id, { ...obj, name });
      return { ...state, objects: newObjects };
    }

    case 'TOGGLE_VISIBILITY': {
      const { id } = action.payload;
      const obj = state.objects.get(id);
      if (!obj) return state;

      const newObjects = new Map(state.objects);
      newObjects.set(id, { ...obj, visible: !obj.visible });
      return { ...state, objects: newObjects };
    }

    case 'TOGGLE_LOCK': {
      const { id } = action.payload;
      const obj = state.objects.get(id);
      if (!obj) return state;

      const newObjects = new Map(state.objects);
      newObjects.set(id, { ...obj, locked: !obj.locked });
      return { ...state, objects: newObjects };
    }

    case 'SET_TRANSFORM_MODE':
      return { ...state, transformMode: action.payload };

    case 'SET_TRANSFORM_SPACE':
      return { ...state, transformSpace: action.payload };

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'TOGGLE_AXES':
      return { ...state, showAxes: !state.showAxes };

    case 'TOGGLE_SNAP':
      return { ...state, snapEnabled: !state.snapEnabled };

    case 'SET_SNAP_VALUES':
      return {
        ...state,
        snapTranslate: action.payload.translate ?? state.snapTranslate,
        snapRotate: action.payload.rotate ?? state.snapRotate,
        snapScale: action.payload.scale ?? state.snapScale,
      };

    case 'DUPLICATE_OBJECT': {
      const { id } = action.payload;
      const original = state.objects.get(id);
      if (!original) return state;

      const newId = generateId();
      const duplicate = cloneObject(original, newId);

      const newObjects = new Map(state.objects);
      newObjects.set(newId, duplicate);

      const newRootIds = duplicate.parentId === null
        ? [...state.rootIds, newId]
        : state.rootIds;

      return {
        ...state,
        objects: newObjects,
        rootIds: newRootIds,
        selectedId: newId,
      };
    }

    case 'PUSH_UNDO': {
      const snapshot = createSnapshot(state);
      const undoStack = [...state.undoStack, snapshot].slice(-MAX_UNDO_DEPTH);
      return { ...state, undoStack, redoStack: [] };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const currentSnapshot = createSnapshot(state);
      const undoStack = [...state.undoStack];
      const restoreSnapshot = undoStack.pop()!;

      const restoredObjects = new Map(restoreSnapshot.objects);
      return {
        ...state,
        objects: restoredObjects,
        rootIds: restoreSnapshot.rootIds,
        selectedId: restoreSnapshot.selectedId,
        undoStack,
        redoStack: [...state.redoStack, currentSnapshot],
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const currentSnapshot = createSnapshot(state);
      const redoStack = [...state.redoStack];
      const restoreSnapshot = redoStack.pop()!;

      const restoredObjects = new Map(restoreSnapshot.objects);
      return {
        ...state,
        objects: restoredObjects,
        rootIds: restoreSnapshot.rootIds,
        selectedId: restoreSnapshot.selectedId,
        undoStack: [...state.undoStack, currentSnapshot],
        redoStack,
      };
    }

    case 'LOAD_SCENE': {
      const newObjects = new Map(action.payload.objects);
      return {
        ...state,
        objects: newObjects,
        rootIds: action.payload.rootIds,
        selectedId: null,
        undoStack: [],
        redoStack: [],
      };
    }

    default:
      return state;
  }
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: SceneEditorState = {
  objects: new Map(),
  rootIds: [],
  selectedId: null,
  transformMode: 'translate',
  transformSpace: 'world',
  showGrid: true,
  showAxes: true,
  undoStack: [],
  redoStack: [],
  snapEnabled: false,
  snapTranslate: 1,
  snapRotate: 15,
  snapScale: 0.25,
};

// =============================================================================
// HOOK
// =============================================================================

export function useSceneEditor() {
  const [state, dispatch] = useReducer(sceneReducer, initialState);

  // ------ Object Management ------

  const addPrimitive = useCallback((primitiveType: PrimitiveType, dropPosition?: Vec3) => {
    dispatch({ type: 'PUSH_UNDO' });

    const id = generateId();
    const obj: SceneObject = {
      id,
      name: `${primitiveType.charAt(0).toUpperCase() + primitiveType.slice(1)}`,
      kind: 'primitive',
      primitiveType,
      visible: true,
      locked: false,
      position: dropPosition ?? { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: { ...DEFAULT_MATERIAL },
      parentId: null,
      childIds: [],
    };

    dispatch({ type: 'ADD_OBJECT', payload: obj });
    return id;
  }, []);

  const addLight = useCallback((lightType: LightType, dropPosition?: Vec3) => {
    dispatch({ type: 'PUSH_UNDO' });

    const id = generateId();
    const label = lightType.charAt(0).toUpperCase() + lightType.slice(1);
    const obj: SceneObject = {
      id,
      name: `${label} Light`,
      kind: 'light',
      visible: true,
      locked: false,
      position: dropPosition ?? { x: 0, y: 3, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: { ...DEFAULT_MATERIAL },
      lightProps: { ...DEFAULT_LIGHT_PROPS, lightType },
      parentId: null,
      childIds: [],
    };

    dispatch({ type: 'ADD_OBJECT', payload: obj });
    return id;
  }, []);

  const addImportedAsset = useCallback((
    name: string,
    assetMeta: ImportedAssetMeta,
    dropPosition?: Vec3,
  ) => {
    dispatch({ type: 'PUSH_UNDO' });

    const id = generateId();
    const obj: SceneObject = {
      id,
      name,
      kind: 'imported',
      visible: true,
      locked: false,
      position: dropPosition ?? { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: { ...DEFAULT_MATERIAL },
      assetMeta,
      parentId: null,
      childIds: [],
    };

    dispatch({ type: 'ADD_OBJECT', payload: obj });
    return id;
  }, []);

  const removeObject = useCallback((id: string) => {
    dispatch({ type: 'PUSH_UNDO' });
    dispatch({ type: 'REMOVE_OBJECT', payload: { id } });
  }, []);

  const duplicateObject = useCallback((id: string) => {
    dispatch({ type: 'PUSH_UNDO' });
    dispatch({ type: 'DUPLICATE_OBJECT', payload: { id } });
  }, []);

  // ------ Selection ------

  const selectObject = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_OBJECT', payload: { id } });
  }, []);

  const selectedObject = useMemo(
    () => (state.selectedId ? state.objects.get(state.selectedId) ?? null : null),
    [state.selectedId, state.objects]
  );

  // ------ Transforms ------

  const updateTransform = useCallback((id: string, transform: {
    position?: Vec3;
    rotation?: EulerRotation;
    scale?: Vec3;
  }) => {
    dispatch({ type: 'UPDATE_TRANSFORM', payload: { id, ...transform } });
  }, []);

  const commitTransform = useCallback(() => {
    dispatch({ type: 'PUSH_UNDO' });
  }, []);

  const setTransformMode = useCallback((mode: TransformMode) => {
    dispatch({ type: 'SET_TRANSFORM_MODE', payload: mode });
  }, []);

  const setTransformSpace = useCallback((space: TransformSpace) => {
    dispatch({ type: 'SET_TRANSFORM_SPACE', payload: space });
  }, []);

  // ------ Material/Light ------

  const updateMaterial = useCallback((id: string, material: Partial<SceneMaterial>) => {
    dispatch({ type: 'PUSH_UNDO' });
    dispatch({ type: 'UPDATE_MATERIAL', payload: { id, material } });
  }, []);

  const updateLight = useCallback((id: string, lightProps: Partial<SceneLightProps>) => {
    dispatch({ type: 'PUSH_UNDO' });
    dispatch({ type: 'UPDATE_LIGHT', payload: { id, lightProps } });
  }, []);

  // ------ Hierarchy ------

  const renameObject = useCallback((id: string, name: string) => {
    dispatch({ type: 'RENAME_OBJECT', payload: { id, name } });
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_VISIBILITY', payload: { id } });
  }, []);

  const toggleLock = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_LOCK', payload: { id } });
  }, []);

  // ------ Editor Settings ------

  const toggleGrid = useCallback(() => dispatch({ type: 'TOGGLE_GRID' }), []);
  const toggleAxes = useCallback(() => dispatch({ type: 'TOGGLE_AXES' }), []);
  const toggleSnap = useCallback(() => dispatch({ type: 'TOGGLE_SNAP' }), []);

  // ------ Undo / Redo ------

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  // ------ Computed ------

  const objectList = useMemo(
    () => Array.from(state.objects.values()),
    [state.objects]
  );

  return {
    // State
    state,
    objects: objectList,
    selectedId: state.selectedId,
    selectedObject,
    transformMode: state.transformMode,
    transformSpace: state.transformSpace,
    showGrid: state.showGrid,
    showAxes: state.showAxes,
    snapEnabled: state.snapEnabled,
    snapTranslate: state.snapTranslate,
    snapRotate: state.snapRotate,
    snapScale: state.snapScale,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,

    // Actions
    addPrimitive,
    addLight,
    addImportedAsset,
    removeObject,
    duplicateObject,
    selectObject,
    updateTransform,
    commitTransform,
    setTransformMode,
    setTransformSpace,
    updateMaterial,
    updateLight,
    renameObject,
    toggleVisibility,
    toggleLock,
    toggleGrid,
    toggleAxes,
    toggleSnap,
    undo,
    redo,
    dispatch,
  };
}

export type SceneEditorAPI = ReturnType<typeof useSceneEditor>;
