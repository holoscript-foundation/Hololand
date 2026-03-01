/**
 * HoloScript Design Token System - Shadows & Effects
 *
 * Elevation levels for layered UI elements.
 * Kept subtle for IDE-style interfaces.
 */

export const shadow = {
  /** No shadow */
  none: 'none',
  /** Subtle depth for cards */
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  /** Medium elevation for dropdowns, tooltips */
  md: '0 2px 8px rgba(0, 0, 0, 0.4)',
  /** High elevation for modals, dialogs */
  lg: '0 4px 16px rgba(0, 0, 0, 0.5)',
  /** Overlay depth for command palette */
  xl: '0 8px 32px rgba(0, 0, 0, 0.6)',
} as const;

export const transition = {
  /** Ultra-fast for hover states */
  fast: '0.1s ease',
  /** Default for most interactive elements */
  normal: '0.15s ease',
  /** Smooth for panels, reveals */
  slow: '0.3s ease',
  /** Loading/fade transitions */
  fade: '0.4s ease',
} as const;

export const zIndex = {
  /** Base content layer */
  base: 0,
  /** Floating elements above content */
  dropdown: 100,
  /** Sticky headers */
  sticky: 200,
  /** Modal overlays */
  overlay: 500,
  /** Modal dialogs */
  modal: 1000,
  /** Toast notifications */
  toast: 5000,
  /** Loading screens */
  loading: 9999,
} as const;
