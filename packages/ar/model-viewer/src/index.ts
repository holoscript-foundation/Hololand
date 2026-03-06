/**
 * @hololand/ar-model-viewer
 *
 * React component library wrapping the HTML <model> element for USDZ 3D
 * model display on visionOS Safari. Provides automatic fallback for
 * non-visionOS browsers via three.js or static image rendering.
 *
 * Components:
 * - ModelViewer — Primary component for displaying a single USDZ model
 * - ModelGallery — Composite grid for browsing multiple models
 *
 * Hooks:
 * - useModelElement — Manages the <model> element JS API (play/pause/transforms)
 *
 * Utilities:
 * - detectModelElementSupport — Browser feature detection
 *
 * @module ar-model-viewer
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type {
  // Core model element types
  HTMLModelElement,
  Vector3,
  Quaternion,
  Scale3,
  EntityTransform,
  BoundingBox,
  ModelAnimation,
  AnimationPlaybackState,
  ModelCamera,
  ModelEntity,
  ModelElementEventMap,

  // Component prop types
  ModelViewerProps,
  ModelGalleryProps,
  ModelGalleryItem,

  // State types
  ModelLoadingState,
  ModelError,
  UseModelElementReturn,
} from './types';

// ── Components ────────────────────────────────────────────────────────────

export { ModelViewer } from './ModelViewer';
export { ModelGallery } from './ModelGallery';
export {
  StaticImageFallback,
  ThreeJSFallback,
  FallbackRenderer,
} from './ModelFallback';
export type {
  StaticImageFallbackProps,
  ThreeJSFallbackProps,
  FallbackRendererProps,
} from './ModelFallback';

// ── Hooks ─────────────────────────────────────────────────────────────────

export { useModelElement } from './useModelElement';
export type { UseModelElementOptions } from './useModelElement';

// ── Feature Detection ─────────────────────────────────────────────────────

export {
  detectModelElementSupport,
  _resetDetectionCache,
} from './featureDetection';
export type {
  ModelElementSupport,
  FallbackStrategy,
} from './featureDetection';
