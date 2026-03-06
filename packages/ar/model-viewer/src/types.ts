/**
 * TypeScript type definitions for the HTML <model> element API
 *
 * The <model> element is a visionOS Safari HTML element for displaying
 * interactive 3D content (USDZ models) natively within a web page.
 * It provides a JavaScript API for controlling playback, camera, and
 * entity transforms.
 *
 * @see https://developer.apple.com/documentation/safari-release-notes/safari-18-release-notes
 * @module model-viewer/types
 */

// ─── Vector & Transform Types ───────────────────────────────────────────────

/** 3D position vector */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** Quaternion rotation (x, y, z, w) */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Scale vector */
export interface Scale3 {
  x: number;
  y: number;
  z: number;
}

/** Entity transform combining position, rotation, and scale */
export interface EntityTransform {
  position: Vector3;
  rotation: Quaternion;
  scale: Scale3;
}

/** Bounding box for a 3D entity */
export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

// ─── Animation Types ────────────────────────────────────────────────────────

/** Animation playback state */
export type AnimationPlaybackState = 'playing' | 'paused' | 'stopped';

/** Named animation within a USDZ model */
export interface ModelAnimation {
  name: string;
  duration: number;
}

// ─── Camera Types ───────────────────────────────────────────────────────────

/** Camera orientation for the model viewer */
export interface ModelCamera {
  /** Pitch angle in radians */
  pitch: number;
  /** Yaw angle in radians */
  yaw: number;
  /** Distance from the model center */
  distance: number;
}

// ─── Entity Types ───────────────────────────────────────────────────────────

/** A named entity within the USDZ scene graph */
export interface ModelEntity {
  name: string;
  transform: EntityTransform;
  boundingBox: BoundingBox;
  children: ModelEntity[];
}

// ─── Event Types ────────────────────────────────────────────────────────────

/** Events emitted by the HTMLModelElement */
export interface ModelElementEventMap {
  'load': Event;
  'error': ErrorEvent;
  'play': Event;
  'pause': Event;
  'ended': Event;
  'timeupdate': Event;
  'entitychange': CustomEvent<{ entityName: string; transform: EntityTransform }>;
}

// ─── HTMLModelElement Interface ──────────────────────────────────────────────

/**
 * HTMLModelElement interface for the visionOS Safari <model> element.
 *
 * This element renders USDZ 3D models natively in the browser on Apple
 * Vision Pro. It provides a JS API for controlling playback, querying
 * entities, and manipulating transforms.
 *
 * Usage:
 * ```html
 * <model src="scene.usdz" interactive></model>
 * ```
 *
 * ```typescript
 * const el = document.querySelector('model') as HTMLModelElement;
 * await el.ready;
 * el.play();
 * const transform = el.getEntityTransform('robot_arm');
 * ```
 */
export interface HTMLModelElement extends HTMLElement {
  // ── Source Attributes ──────────────────────────────────────────────

  /** URL of the USDZ model file */
  src: string;

  /** Alt text for accessibility */
  alt: string;

  /** Whether the model supports user interaction (rotate, zoom) */
  interactive: boolean;

  /** Whether the model should autoplay animations */
  autoplay: boolean;

  // ── Ready State ────────────────────────────────────────────────────

  /**
   * Promise that resolves when the model is loaded and ready for interaction.
   * Rejects if loading fails.
   */
  readonly ready: Promise<void>;

  /** Whether the model has finished loading */
  readonly complete: boolean;

  // ── Playback Control ───────────────────────────────────────────────

  /** Start or resume animation playback */
  play(): void;

  /** Pause animation playback */
  pause(): void;

  /** Whether the model is currently paused */
  readonly paused: boolean;

  /** Current playback time in seconds */
  currentTime: number;

  /** Total animation duration in seconds */
  readonly duration: number;

  /** Whether animations should loop */
  loop: boolean;

  // ── Animation Queries ──────────────────────────────────────────────

  /** List all animations available in the model */
  readonly animations: ReadonlyArray<ModelAnimation>;

  /** Currently active animation name */
  currentAnimation: string;

  // ── Entity / Scene Graph ───────────────────────────────────────────

  /**
   * Get the transform of a named entity in the scene graph.
   * Returns null if the entity does not exist.
   */
  getEntityTransform(entityName: string): EntityTransform | null;

  /**
   * Set the transform of a named entity in the scene graph.
   * Throws if the entity does not exist.
   */
  setEntityTransform(entityName: string, transform: Partial<EntityTransform>): void;

  /**
   * Get the bounding box of a named entity.
   * Returns null if the entity does not exist.
   */
  getEntityBoundingBox(entityName: string): BoundingBox | null;

  /**
   * List all entity names in the scene graph (flat list).
   */
  readonly entityNames: ReadonlyArray<string>;

  // ── Camera ─────────────────────────────────────────────────────────

  /** Get the current camera orientation */
  getCamera(): ModelCamera;

  /** Set the camera orientation (animated transition) */
  setCamera(camera: Partial<ModelCamera>): void;

  // ── Events ─────────────────────────────────────────────────────────

  addEventListener<K extends keyof ModelElementEventMap>(
    type: K,
    listener: (ev: ModelElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener<K extends keyof ModelElementEventMap>(
    type: K,
    listener: (ev: ModelElementEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
}

// ─── Global Declaration Augmentation ────────────────────────────────────────

/**
 * Augment the global HTMLElementTagNameMap so that
 * `document.createElement('model')` returns `HTMLModelElement`.
 */
declare global {
  interface HTMLElementTagNameMap {
    'model': HTMLModelElement;
  }
}

// ─── Component Props Types ──────────────────────────────────────────────────

/** Loading state for the ModelViewer component */
export type ModelLoadingState = 'idle' | 'loading' | 'ready' | 'error';

/** Error information when model loading fails */
export interface ModelError {
  message: string;
  code?: string;
  /** The original error event, if available */
  originalEvent?: ErrorEvent;
}

/** Props for the ModelViewer component */
export interface ModelViewerProps {
  /** URL of the USDZ model file */
  src: string;

  /** Alt text for accessibility. Required. */
  alt: string;

  /** Whether the model supports user interaction (rotate, zoom). Default: true */
  interactive?: boolean;

  /** Whether animations should autoplay. Default: false */
  autoplay?: boolean;

  /** Whether animations should loop. Default: false */
  loop?: boolean;

  /** Initial animation to play by name */
  initialAnimation?: string;

  /** CSS class name applied to the container */
  className?: string;

  /** Inline CSS styles applied to the <model> element */
  style?: React.CSSProperties;

  /** Width of the model viewer. Default: '100%' */
  width?: string | number;

  /** Height of the model viewer. Default: '400px' */
  height?: string | number;

  /** Poster image URL shown while loading (also used as fallback) */
  poster?: string;

  /** Fallback image URL for non-visionOS browsers */
  fallbackSrc?: string;

  /** Called when the model finishes loading */
  onLoad?: () => void;

  /** Called when model loading fails */
  onError?: (error: ModelError) => void;

  /** Called when playback state changes */
  onPlaybackChange?: (state: AnimationPlaybackState) => void;

  /** Called when the current time updates */
  onTimeUpdate?: (currentTime: number) => void;

  /** Called when an entity transform changes */
  onEntityChange?: (entityName: string, transform: EntityTransform) => void;

  /** Render custom loading indicator. Receives progress (0-1) if available. */
  renderLoading?: (progress?: number) => React.ReactNode;

  /** Render custom error display */
  renderError?: (error: ModelError, retry: () => void) => React.ReactNode;

  /** Additional HTML attributes passed to the <model> element */
  modelAttributes?: Record<string, string>;
}

/** Props for the ModelGallery component */
export interface ModelGalleryProps {
  /** Array of model sources to display */
  models: ModelGalleryItem[];

  /** CSS class name for the gallery container */
  className?: string;

  /** Inline styles for the gallery container */
  style?: React.CSSProperties;

  /** Number of columns in grid layout. Default: 3 */
  columns?: number;

  /** Gap between grid items in pixels. Default: 16 */
  gap?: number;

  /** Width of each model viewer. Default: '100%' */
  itemWidth?: string | number;

  /** Height of each model viewer. Default: '300px' */
  itemHeight?: string | number;

  /** Index of the currently selected model */
  selectedIndex?: number;

  /** Called when a model is selected */
  onSelect?: (index: number, model: ModelGalleryItem) => void;

  /** Whether to show model title/caption. Default: true */
  showCaptions?: boolean;

  /** Whether to lazy-load models not in viewport. Default: true */
  lazyLoad?: boolean;

  /** Shared props applied to all ModelViewer instances */
  viewerProps?: Partial<Omit<ModelViewerProps, 'src' | 'alt'>>;
}

/** Individual model item in the gallery */
export interface ModelGalleryItem {
  /** Unique identifier */
  id: string;

  /** URL of the USDZ model file */
  src: string;

  /** Alt text for accessibility */
  alt: string;

  /** Display title */
  title?: string;

  /** Description text */
  description?: string;

  /** Poster/thumbnail image URL */
  poster?: string;

  /** Fallback image for non-visionOS browsers */
  fallbackSrc?: string;
}

/** Return type for the useModelElement hook */
export interface UseModelElementReturn {
  /** Ref to attach to the <model> element */
  ref: React.RefObject<HTMLModelElement | null>;

  /** Current loading state */
  loadingState: ModelLoadingState;

  /** Error information if loading failed */
  error: ModelError | null;

  /** Whether the model is currently playing */
  isPlaying: boolean;

  /** Current playback time in seconds */
  currentTime: number;

  /** Total animation duration in seconds */
  duration: number;

  /** List of available animations */
  animations: ModelAnimation[];

  /** List of entity names in the scene */
  entityNames: string[];

  /** Start or resume playback */
  play: () => void;

  /** Pause playback */
  pause: () => void;

  /** Toggle play/pause */
  togglePlayback: () => void;

  /** Seek to a specific time */
  seekTo: (time: number) => void;

  /** Set the active animation by name */
  setAnimation: (name: string) => void;

  /** Get the transform of a named entity */
  getEntityTransform: (entityName: string) => EntityTransform | null;

  /** Set the transform of a named entity */
  setEntityTransform: (entityName: string, transform: Partial<EntityTransform>) => void;

  /** Get the current camera orientation */
  getCamera: () => ModelCamera | null;

  /** Set the camera orientation */
  setCamera: (camera: Partial<ModelCamera>) => void;

  /** Retry loading after an error */
  retry: () => void;
}
