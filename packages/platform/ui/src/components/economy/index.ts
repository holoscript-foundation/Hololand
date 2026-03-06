/**
 * @hololand/ui - Economy Dashboard Components
 *
 * Visualization components for the 9-layer self-regulating economy architecture.
 * Designed for Layer 6 (Transparency) -- public economic health dashboard.
 *
 * Components:
 *   - FaucetSinkGauge: Faucet/sink balance ratio gauge (Layer 1)
 *   - GiniChart: Wealth equality time-series + Lorenz curve (Layer 4/6)
 *   - VelocityMeter: Currency velocity bar meter (Layer 1)
 *   - BondingCurveChart: Bonding curve price discovery chart (Layer 2)
 *   - PIDStatusDisplay: Dual-loop PID controller status (Layer 1)
 *
 * All components:
 *   - WCAG 2.1 Level AA compliant
 *   - Support Canvas2D (desktop) and WebXR (VR) rendering contexts
 *   - Follow @hololand/ui component patterns (extend UIComponent)
 *   - Support dark mode and high contrast themes
 *   - Provide accessible descriptions for screen readers
 *
 * References:
 *   - 2026-03-04_self-regulating-virtual-economies-evolved.md
 *   - @hololand/commerce/economy-testbed (data sources)
 */

// Base class
export { EconomyComponent } from './EconomyComponent';

// Components
export { FaucetSinkGauge } from './FaucetSinkGauge';
export { GiniChart } from './GiniChart';
export { VelocityMeter } from './VelocityMeter';
export { BondingCurveChart } from './BondingCurveChart';
export { PIDStatusDisplay } from './PIDStatusDisplay';

// Types
export type {
  RenderingContext,
  WebXRGeometryData,
  EconomyComponentConfig,
  TimeSeriesPoint,
  FaucetSinkData,
  FaucetSinkGaugeConfig,
  GiniChartConfig,
  VelocityMeterConfig,
  BondingCurveType,
  BondingCurveChartConfig,
  PIDLoopData,
  PIDStatusDisplayConfig,
  A11yAnnouncement,
  A11yDescription,
} from './types';

export { ECONOMY_COLORS } from './types';
