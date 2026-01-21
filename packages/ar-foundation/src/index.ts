/**
 * @hololand/ar-foundation
 *
 * Unified AR foundation for Hololand. This package serves as the single entry point
 * for all AR functionality, bridging HoloScript AR declarations to the underlying
 * AR runtime packages.
 *
 * Architecture:
 * ```
 * HoloScript AR syntax
 *        ↓
 * @hololand/ar-foundation (this package)
 *        ↓
 * ┌──────┴──────┬───────────┬────────────┐
 * │             │           │            │
 * ar-anchors  ar-detection  ar-tracking  ar-renderer
 * ```
 *
 * Usage:
 * ```typescript
 * import { createARRuntime, ARModuleAPI } from '@hololand/ar-foundation';
 *
 * const runtime = createARRuntime();
 * await runtime.api.startDetection({ detector: 'blazepose' });
 * ```
 */

// Re-export runtime
export {
  createARRuntime,
  executeARNode,
  AR_BINDINGS,
  type ARModuleState,
  type ARModuleAPI,
} from './runtime.js';

// Re-export types from AR packages for convenience
export type { Anchor, AnchorType, Pose as AnchorPose } from '@hololand/ar-anchors';

// Version
export const AR_FOUNDATION_VERSION = '1.0.0';
