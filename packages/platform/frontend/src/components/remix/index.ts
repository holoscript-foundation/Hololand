/**
 * Remix Components
 *
 * Instant Remix UX module for HoloLand's remix economy.
 * Provides one-click forking, attribution tracking, genealogy visualization,
 * and viral coefficient metrics dashboard.
 *
 * Barrel export for all remix frontend components.
 *
 * @module remix
 */

// Components
export { RemixButton, type RemixButtonProps } from './RemixButton';
export { RemixEditor, type RemixEditorProps } from './RemixEditor';
export { RemixChain, type RemixChainProps } from './RemixChain';
export { RemixMetrics, type RemixMetricsProps } from './RemixMetrics';

// API Client & Types
export { remixAPI } from './remixApi';

export type {
  // Core types
  AttributionNode,
  RemixInfo,
  RemixTree,
  ViralMetrics,
  RevenueDistribution,
  RemixDiffSummary,
  WorldRemixStats,
  RemixTimeSeriesPoint,
  // Request/Response types
  ForkSceneRequest,
  ForkAssetRequest,
  ForkResponse,
} from './remixApi';
