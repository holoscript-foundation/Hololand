/**
 * AR Module - Overlay & Filters
 *
 * Augmented reality overlays including:
 * - Face filters (masks, effects, makeup)
 * - Body tracking overlays
 * - Environment effects
 * - Surface anchoring
 *
 * @packageDocumentation
 */

export { ARFilterManager, createARFilterManager, createPresetFilters } from './ARFilterManager';
export type { ARFilterManagerConfig, AttachmentResult } from './ARFilterManager';

export type {
  ARFilter,
  ARFilterAsset,
  ARAttachment,
  ARFilterAnimation,
  AROverlayState,
  FaceDetection,
  FaceLandmark,
  SurfaceAnchor,
  WorldAnchor,
  FilterCategory,
} from '../types';
