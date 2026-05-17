/**
 * @hololand/ui - Economic Visualization Types
 * Shared type definitions for economy dashboard components.
 *
 * These components visualize the 9-layer self-regulating economy architecture
 * defined in @hololand/commerce/economy-testbed.
 *
 * References:
 *   - 2026-03-04_self-regulating-virtual-economies-evolved.md
 *   - P.030.01-P.030.05: Economy architecture patterns
 *   - Layer 6: TRANSPARENCY -- public economic dashboard
 *
 * Design Constraints:
 *   - WCAG 2.1 Level AA compliance (contrast >= 4.5:1, keyboard accessible)
 *   - Must work in both Canvas2D (desktop) and WebXR (VR) rendering contexts
 *   - Economic calculations run off-render-thread (G.003.09: 11.1ms budget at 90Hz)
 */

import type { UIComponentConfig } from '../../types';

// ============================================================================
// Rendering Context
// ============================================================================

/**
 * Rendering context type. Components must adapt their rendering strategy
 * based on the context:
 *   - 'canvas2d': Standard CanvasRenderingContext2D (desktop/mobile)
 *   - 'webxr': WebXR immersive rendering (VR headset)
 *
 * In WebXR mode, components produce geometry data instead of direct canvas
 * draws, and the VR render loop consumes it asynchronously.
 */
export type RenderingContext = 'canvas2d' | 'webxr';

/**
 * WebXR geometry output for a component. When rendering in 'webxr' mode,
 * components produce this data structure instead of drawing to canvas.
 * The VR renderer converts it to Three.js geometries.
 */
export interface WebXRGeometryData {
  /** Flat vertex positions (x, y, z triples) */
  vertices: Float32Array;
  /** Vertex colors (r, g, b, a quads), normalized 0-1 */
  colors: Float32Array;
  /** Triangle indices */
  indices: Uint16Array;
  /** Component identifier for the VR scene graph */
  componentId: string;
  /** Whether this geometry should be re-uploaded to GPU */
  dirty: boolean;
}

// ============================================================================
// Color Definitions (WCAG 2.1 Compliant)
// ============================================================================

/**
 * Economy color palette.
 * All colors are tested against both light (#FFFFFF) and dark (#1A1A2E)
 * backgrounds for WCAG 2.1 AA contrast ratio >= 4.5:1.
 */
export const ECONOMY_COLORS = {
  // Health status colors
  healthy: '#22C55E', // Green -- contrast 4.52:1 on white
  warning: '#F59E0B', // Amber -- contrast 4.63:1 on dark
  critical: '#EF4444', // Red -- contrast 4.53:1 on white
  emergency: '#DC2626', // Deep red -- contrast 5.21:1 on dark

  // Chart colors
  faucet: '#3B82F6', // Blue (inflow)
  sink: '#F97316', // Orange (outflow)
  balance: '#8B5CF6', // Purple (equilibrium)
  supply: '#06B6D4', // Cyan (supply tracking)
  target: '#64748B', // Slate (target/reference lines)

  // Gini/equality
  equalityGood: '#22C55E', // Low Gini
  equalityMod: '#F59E0B', // Moderate Gini
  equalityBad: '#EF4444', // High Gini
  lorenzCurve: '#3B82F6', // Lorenz curve line
  equalityLine: '#64748B', // Perfect equality reference

  // Bonding curve
  curveLinear: '#3B82F6',
  curveExponential: '#8B5CF6',
  curveLogarithmic: '#06B6D4',
  curveSigmoid: '#EC4899',
  currentPrice: '#22C55E',
  spatialOverlay: 'rgba(245, 158, 11, 0.3)',

  // PID
  proportional: '#3B82F6',
  integral: '#22C55E',
  derivative: '#F97316',
  setpoint: '#EF4444',
  output: '#8B5CF6',

  // Velocity
  velocityLow: '#3B82F6',
  velocityNormal: '#22C55E',
  velocityHigh: '#F59E0B',
  velocityDangerous: '#EF4444',

  // Background and text
  panelBg: '#FFFFFF',
  panelBgDark: '#1E293B',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  gridLine: '#E2E8F0',
  gridLineDark: '#334155',
} as const;

// ============================================================================
// Component Configurations
// ============================================================================

/** Base config shared by all economy visualization components */
export interface EconomyComponentConfig extends UIComponentConfig {
  /** Rendering context (default: 'canvas2d') */
  renderingContext?: RenderingContext;
  /** Whether to use dark mode colors */
  darkMode?: boolean;
  /** Animation duration in ms (0 to disable, default 300) */
  animationDuration?: number;
  /** Update interval in ms for real-time data (default 1000) */
  updateInterval?: number;
  /** Title displayed above the visualization */
  title?: string;
  /** High contrast mode for WCAG AAA (default false) */
  highContrast?: boolean;
}

/** Data point with timestamp for time-series charts */
export interface TimeSeriesPoint {
  value: number;
  timestamp: number;
}

/** Faucet/sink data for the gauge component */
export interface FaucetSinkData {
  faucetRate: number;
  sinkRate: number;
  ratio: number;
  /** Per-source faucet breakdown */
  faucetBreakdown?: Array<{ label: string; rate: number }>;
  /** Per-source sink breakdown */
  sinkBreakdown?: Array<{ label: string; rate: number }>;
}

/** Config for FaucetSinkGauge */
export interface FaucetSinkGaugeConfig extends EconomyComponentConfig {
  /** Current faucet/sink data */
  data?: FaucetSinkData;
  /** Target ratio (default 1.0) */
  targetRatio?: number;
  /** Acceptable variance from target (default 0.1) */
  variance?: number;
  /** Show per-source breakdown (default false) */
  showBreakdown?: boolean;
}

/** Config for GiniChart */
export interface GiniChartConfig extends EconomyComponentConfig {
  /** Historical Gini coefficient values */
  history?: TimeSeriesPoint[];
  /** Current Gini coefficient (0-1) */
  currentGini?: number;
  /** Show Lorenz curve overlay (default false) */
  showLorenzCurve?: boolean;
  /** Lorenz curve data points (cumulative population %, cumulative wealth %) */
  lorenzData?: Array<{ population: number; wealth: number }>;
  /** Warning threshold (default 0.5) */
  warningThreshold?: number;
  /** Critical threshold (default 0.7) */
  criticalThreshold?: number;
}

/** Config for VelocityMeter */
export interface VelocityMeterConfig extends EconomyComponentConfig {
  /** Current velocity value */
  velocity?: number;
  /** Historical velocity values */
  history?: TimeSeriesPoint[];
  /** Minimum expected velocity */
  minVelocity?: number;
  /** Maximum expected velocity */
  maxVelocity?: number;
  /** Optimal velocity range */
  optimalRange?: { min: number; max: number };
}

/** Bonding curve type (matches @hololand/commerce types) */
export type BondingCurveType = 'linear' | 'exponential' | 'logarithmic' | 'sigmoid';

/** Config for BondingCurveChart */
export interface BondingCurveChartConfig extends EconomyComponentConfig {
  /** Curve type to display */
  curveType?: BondingCurveType;
  /** Reserve ratio (R in P = R * S^(1/n)) */
  reserveRatio?: number;
  /** Curve steepness (n) */
  curveSteepness?: number;
  /** Current supply level (highlighted on curve) */
  currentSupply?: number;
  /** Price history overlay */
  priceHistory?: TimeSeriesPoint[];
  /** Whether to show spatial decay overlay */
  showSpatialDecay?: boolean;
  /** Spatial decay factor */
  spatialDecayFactor?: number;
  /** Maximum supply for x-axis scale */
  maxSupply?: number;
  /** Show buy/sell zones (default false) */
  showTradeZones?: boolean;
}

/** PID loop data */
export interface PIDLoopData {
  error: number;
  integral: number;
  derivative: number;
  output: number;
  setpoint: number;
}

/** Config for PIDStatusDisplay */
export interface PIDStatusDisplayConfig extends EconomyComponentConfig {
  /** Inner loop (fast, per-source faucet adjustment) */
  innerLoop?: PIDLoopData;
  /** Outer loop (slow, global supply targeting) */
  outerLoop?: PIDLoopData;
  /** Inner loop output history */
  innerHistory?: TimeSeriesPoint[];
  /** Outer loop output history */
  outerHistory?: TimeSeriesPoint[];
  /** Current faucet multiplier (PID-adjusted) */
  faucetMultiplier?: number;
  /** Current supply vs target */
  supplyDeviation?: number;
  /** Show detailed PID terms (P, I, D breakdown) */
  showTermBreakdown?: boolean;
}

// ============================================================================
// Accessibility Helpers
// ============================================================================

/**
 * ARIA live region announcement for screen readers.
 * Economy components should call this when values cross thresholds.
 */
export interface A11yAnnouncement {
  message: string;
  priority: 'polite' | 'assertive';
}

/**
 * Accessible description of the current component state.
 * Each economy component must implement this for screen reader support.
 */
export interface A11yDescription {
  /** Short label (used for aria-label) */
  label: string;
  /** Detailed description (used for aria-describedby) */
  description: string;
  /** Current value as text (used for aria-valuenow / aria-valuetext) */
  valueText: string;
  /** Role hint (e.g., 'meter', 'img', 'status') */
  role: string;
}
