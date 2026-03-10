/**
 * @hololand/spatial-builder - Scene Editor Types
 *
 * Shared type definitions for the drag-and-drop scene editor viewport.
 * Integrates with HoloLand's renderer types and SpatialBridgeService.
 */

// =============================================================================
// SCENE OBJECT TYPES
// =============================================================================

/** Supported primitive geometry types for spawning */
export type PrimitiveType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'capsule';

/** Supported light types */
export type LightType = 'point' | 'directional' | 'spot' | 'ambient';

/** Supported 3D asset file formats for import */
export type AssetFileType = 'gltf' | 'glb' | 'obj' | 'fbx';

/** Union of all spawnable object kinds */
export type SceneObjectKind = 'primitive' | 'light' | 'group' | 'imported';

// =============================================================================
// IMPORTED ASSET METADATA
// =============================================================================

/** Metadata for an imported 3D asset (GLTF/GLB/OBJ/FBX) */
export interface ImportedAssetMeta {
  /** Original file name */
  fileName: string;
  /** File format */
  fileType: AssetFileType;
  /** File size in bytes */
  fileSize: number;
  /** Object URL or blob URL for loading */
  objectUrl: string;
  /** Computed bounding box after loading (world units) */
  boundingBox?: {
    min: Vec3;
    max: Vec3;
  };
  /** Number of triangles in the model */
  triangleCount?: number;
}

/** Accepted file extensions for drag-and-drop import */
export const ACCEPTED_ASSET_EXTENSIONS: Record<string, AssetFileType> = {
  '.gltf': 'gltf',
  '.glb': 'glb',
  '.obj': 'obj',
  '.fbx': 'fbx',
};

/** Maximum file size for import (50 MB) */
export const MAX_ASSET_FILE_SIZE = 50 * 1024 * 1024;

/** Transform gizmo modes */
export type TransformMode = 'translate' | 'rotate' | 'scale';

/** Transform gizmo coordinate space */
export type TransformSpace = 'world' | 'local';

/** 3D vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Euler rotation (degrees for UI, radians internally) */
export interface EulerRotation {
  x: number;
  y: number;
  z: number;
}

// =============================================================================
// MATERIAL
// =============================================================================

export interface SceneMaterial {
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
  wireframe: boolean;
}

export const DEFAULT_MATERIAL: SceneMaterial = {
  color: '#6366f1',
  metalness: 0.1,
  roughness: 0.6,
  emissive: '#000000',
  emissiveIntensity: 0,
  opacity: 1,
  transparent: false,
  wireframe: false,
};

// =============================================================================
// ANIMATION BEHAVIOR
// =============================================================================

/**
 * Loop mode controlling animation playback repetition.
 * Mirrors @holoscript/animation-presets LoopMode.
 */
export type AnimationLoopMode = 'once' | 'loop' | 'pingpong' | 'clamp';

/**
 * Preset category for organizational grouping.
 * Mirrors @holoscript/animation-presets PresetCategory.
 */
export type AnimationPresetCategory =
  | 'locomotion'
  | 'combat'
  | 'social'
  | 'emote'
  | 'environmental';

/**
 * The 15 canonical animation preset names.
 * Mirrors @holoscript/animation-presets PresetName.
 */
export type AnimationPresetName =
  | 'walk'
  | 'idle'
  | 'attack'
  | 'speak'
  | 'dance'
  | 'run'
  | 'jump'
  | 'wave'
  | 'sit'
  | 'sleep'
  | 'crouch'
  | 'swim'
  | 'fly'
  | 'climb'
  | 'emote';

/**
 * Animation behavior assigned to a scene object via the @animated trait.
 * Stores the selected preset and user-customizable overrides.
 */
export interface SceneAnimationBehavior {
  /** Selected animation preset name. */
  presetName: AnimationPresetName;
  /** Playback speed multiplier (1.0 = normal). */
  speedMultiplier: number;
  /** Whether the animation loops. */
  loop: boolean;
  /** Blend weight for animation layering (0.0 - 1.0). */
  blendWeight: number;
}

export const DEFAULT_ANIMATION_BEHAVIOR: SceneAnimationBehavior = {
  presetName: 'idle',
  speedMultiplier: 1.0,
  loop: true,
  blendWeight: 1.0,
};

// =============================================================================
// LIGHT PROPERTIES
// =============================================================================

export interface SceneLightProps {
  lightType: LightType;
  color: string;
  intensity: number;
  distance?: number;
  decay?: number;
  angle?: number;
  penumbra?: number;
  castShadow: boolean;
}

export const DEFAULT_LIGHT_PROPS: SceneLightProps = {
  lightType: 'point',
  color: '#ffffff',
  intensity: 1,
  distance: 0,
  decay: 2,
  castShadow: true,
};

// =============================================================================
// SCENE OBJECT (the core node in the scene graph)
// =============================================================================

export interface SceneObject {
  /** Unique identifier */
  id: string;
  /** Display name in the hierarchy */
  name: string;
  /** What kind of object this is */
  kind: SceneObjectKind;
  /** Primitive type (if kind === 'primitive') */
  primitiveType?: PrimitiveType;
  /** Whether the object is visible */
  visible: boolean;
  /** Whether the object is locked (cannot be selected/moved) */
  locked: boolean;

  // Transform
  position: Vec3;
  rotation: EulerRotation;
  scale: Vec3;

  // Appearance
  material: SceneMaterial;

  // Light-specific props
  lightProps?: SceneLightProps;

  // Animation behavior (set via BehaviorDropdown / @animated trait)
  animationBehavior?: SceneAnimationBehavior;

  // Imported asset metadata (if kind === 'imported')
  assetMeta?: ImportedAssetMeta;

  // Hierarchy
  parentId: string | null;
  childIds: string[];
}

// =============================================================================
// EDITOR STATE
// =============================================================================

export interface SceneEditorState {
  /** All scene objects keyed by ID */
  objects: Map<string, SceneObject>;
  /** Root-level object IDs (no parent) */
  rootIds: string[];
  /** Currently selected object ID (null = nothing selected) */
  selectedId: string | null;
  /** Active transform gizmo mode */
  transformMode: TransformMode;
  /** Transform coordinate space */
  transformSpace: TransformSpace;
  /** Whether the grid helper is visible */
  showGrid: boolean;
  /** Whether axes helper is visible */
  showAxes: boolean;
  /** Undo/redo history */
  undoStack: SceneSnapshot[];
  /** Redo stack */
  redoStack: SceneSnapshot[];
  /** Whether snapping is enabled */
  snapEnabled: boolean;
  /** Snap increment for translation (world units) */
  snapTranslate: number;
  /** Snap increment for rotation (degrees) */
  snapRotate: number;
  /** Snap increment for scale */
  snapScale: number;
}

/** Serializable snapshot for undo/redo */
export interface SceneSnapshot {
  objects: Array<[string, SceneObject]>;
  rootIds: string[];
  selectedId: string | null;
  timestamp: number;
}

// =============================================================================
// EDITOR ACTIONS
// =============================================================================

export type SceneEditorAction =
  | { type: 'ADD_OBJECT'; payload: SceneObject }
  | { type: 'REMOVE_OBJECT'; payload: { id: string } }
  | { type: 'SELECT_OBJECT'; payload: { id: string | null } }
  | { type: 'UPDATE_TRANSFORM'; payload: { id: string; position?: Vec3; rotation?: EulerRotation; scale?: Vec3 } }
  | { type: 'UPDATE_MATERIAL'; payload: { id: string; material: Partial<SceneMaterial> } }
  | { type: 'UPDATE_LIGHT'; payload: { id: string; lightProps: Partial<SceneLightProps> } }
  | { type: 'UPDATE_BEHAVIOR'; payload: { id: string; behavior: SceneAnimationBehavior | null } }
  | { type: 'RENAME_OBJECT'; payload: { id: string; name: string } }
  | { type: 'TOGGLE_VISIBILITY'; payload: { id: string } }
  | { type: 'TOGGLE_LOCK'; payload: { id: string } }
  | { type: 'SET_TRANSFORM_MODE'; payload: TransformMode }
  | { type: 'SET_TRANSFORM_SPACE'; payload: TransformSpace }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_AXES' }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'SET_SNAP_VALUES'; payload: { translate?: number; rotate?: number; scale?: number } }
  | { type: 'DUPLICATE_OBJECT'; payload: { id: string } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_UNDO' }
  | { type: 'LOAD_SCENE'; payload: { objects: Array<[string, SceneObject]>; rootIds: string[] } };

// =============================================================================
// ASSET PALETTE
// =============================================================================

export interface AssetPaletteItem {
  id: string;
  label: string;
  kind: SceneObjectKind;
  primitiveType?: PrimitiveType;
  lightType?: LightType;
  icon: string;
  /** Default color when spawned */
  defaultColor?: string;
}

/** Pre-defined palette items for the asset palette */
export const PALETTE_ITEMS: AssetPaletteItem[] = [
  { id: 'box', label: 'Box', kind: 'primitive', primitiveType: 'box', icon: 'Box', defaultColor: '#6366f1' },
  { id: 'sphere', label: 'Sphere', kind: 'primitive', primitiveType: 'sphere', icon: 'Circle', defaultColor: '#ec4899' },
  { id: 'cylinder', label: 'Cylinder', kind: 'primitive', primitiveType: 'cylinder', icon: 'Cylinder', defaultColor: '#14b8a6' },
  { id: 'cone', label: 'Cone', kind: 'primitive', primitiveType: 'cone', icon: 'Triangle', defaultColor: '#f59e0b' },
  { id: 'torus', label: 'Torus', kind: 'primitive', primitiveType: 'torus', icon: 'CircleDot', defaultColor: '#8b5cf6' },
  { id: 'plane', label: 'Plane', kind: 'primitive', primitiveType: 'plane', icon: 'Square', defaultColor: '#64748b' },
  { id: 'capsule', label: 'Capsule', kind: 'primitive', primitiveType: 'capsule', icon: 'Pill', defaultColor: '#22c55e' },
  { id: 'point-light', label: 'Point Light', kind: 'light', lightType: 'point', icon: 'Lightbulb' },
  { id: 'directional-light', label: 'Dir. Light', kind: 'light', lightType: 'directional', icon: 'Sun' },
  { id: 'spot-light', label: 'Spot Light', kind: 'light', lightType: 'spot', icon: 'Flashlight' },
];
