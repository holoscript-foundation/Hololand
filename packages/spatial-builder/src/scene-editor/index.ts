/**
 * @hololand/spatial-builder - Scene Editor Module
 *
 * Drag-and-drop 3D scene editor viewport built with R3F + drei TransformControls.
 *
 * Features:
 * - R3F Canvas viewport with OrbitControls and TransformControls gizmos
 * - Asset palette with draggable primitives (box, sphere, cylinder, etc.) and lights
 * - Scene hierarchy tree with select, rename, visibility, lock, duplicate, delete
 * - Properties inspector for transform, material, and light editing
 * - Toolbar with transform mode (W/E/R), snap, grid/axes toggle, undo/redo
 * - Full keyboard shortcuts support
 *
 * Usage:
 * ```tsx
 * import { SceneEditorApp } from '@hololand/spatial-builder/scene-editor';
 *
 * function App() {
 *   return <SceneEditorApp style={{ width: '100vw', height: '100vh' }} />;
 * }
 * ```
 *
 * For custom layouts, import individual components:
 * ```tsx
 * import {
 *   useSceneEditor,
 *   SceneEditorViewport,
 *   SceneHierarchyPanel,
 *   AssetPalette,
 *   PropertiesPanel,
 *   EditorToolbar,
 * } from '@hololand/spatial-builder/scene-editor';
 * ```
 */

// Main integrated app
export { SceneEditorApp } from './SceneEditorApp';
export type { SceneEditorAppProps } from './SceneEditorApp';

// Core state hook
export { useSceneEditor } from './useSceneEditor';
export type { SceneEditorAPI } from './useSceneEditor';

// Viewport (R3F Canvas)
export { SceneEditorViewport } from './SceneEditorViewport';
export type { SceneEditorViewportProps } from './SceneEditorViewport';

// Panels
export { SceneHierarchyPanel } from './SceneHierarchyPanel';
export type { SceneHierarchyPanelProps } from './SceneHierarchyPanel';

export { AssetPalette } from './AssetPalette';
export type { AssetPaletteProps } from './AssetPalette';

export { PropertiesPanel } from './PropertiesPanel';
export type { PropertiesPanelProps } from './PropertiesPanel';

export { EditorToolbar } from './EditorToolbar';
export type { EditorToolbarProps } from './EditorToolbar';

// 3D components
export { EditorObject } from './EditorObject';
export type { EditorObjectProps } from './EditorObject';

export { EditorTransformControls } from './EditorTransformControls';
export type { EditorTransformControlsProps } from './EditorTransformControls';

// Asset import components
export { AssetDropZone } from './AssetDropZone';
export type { AssetDropZoneProps } from './AssetDropZone';

export { GLTFPreview } from './GLTFPreview';
export type { GLTFPreviewProps } from './GLTFPreview';

// Types
export type {
  PrimitiveType,
  LightType,
  AssetFileType,
  SceneObjectKind,
  TransformMode,
  TransformSpace,
  Vec3,
  EulerRotation,
  SceneMaterial,
  SceneLightProps,
  SceneObject,
  SceneEditorState,
  SceneEditorAction,
  SceneSnapshot,
  AssetPaletteItem,
  ImportedAssetMeta,
} from './types';

export {
  DEFAULT_MATERIAL,
  DEFAULT_LIGHT_PROPS,
  PALETTE_ITEMS,
  ACCEPTED_ASSET_EXTENSIONS,
  MAX_ASSET_FILE_SIZE,
} from './types';
