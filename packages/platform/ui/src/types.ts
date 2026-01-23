/**
 * @hololand/ui - Type Definitions
 * 2D UI components for desktop and mobile applications
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// ============================================================================
// UICanvas Configuration
// ============================================================================

export interface UICanvasConfig {
  width?: number;
  height?: number;
  transparent?: boolean;
  pixelRatio?: number;
  virtualRendering?: boolean;
  cullingMargin?: number;
  breakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

// ============================================================================
// Component Base Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ResponsiveSize {
  mobile?: { width: number; height: number };
  tablet?: { width: number; height: number };
  desktop?: { width: number; height: number };
}

export interface UIComponentConfig {
  position: { x: number; y: number };
  size?: { width: number; height: number };
  visible?: boolean;
  enabled?: boolean;
  zIndex?: number;
  accessible?: boolean;
  ariaLabel?: string;
  tabIndex?: number;
}

// Component configurations continue...
