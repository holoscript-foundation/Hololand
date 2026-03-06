/**
 * Interactive Marketplace Trading UI with Bonding Curve Visualization
 *
 * Real-time trading interface showing how player transactions move along
 * a bonding curve, with predicted price impact before confirmation.
 *
 * @example
 * ```tsx
 * import {
 *   MarketplaceTradingUI,
 *   useMarketplaceTrading,
 * } from '@hololand/renderer/components/marketplace-trading';
 *
 * function MyMarketplace() {
 *   const [state, actions] = useMarketplaceTrading({
 *     curveParams: { type: 'quadratic', basePrice: 1, slope: 0.0001, exponent: 2 },
 *     initialSupply: 1000,
 *     tokenName: 'Land Shard',
 *     tokenSymbol: 'LAND',
 *     currencyName: 'Gold',
 *     currencySymbol: 'GOLD',
 *   });
 *
 *   return (
 *     <MarketplaceTradingUI
 *       externalState={state}
 *       externalActions={actions}
 *       mode="overlay"
 *       overlayOpacity={0.85}
 *     />
 *   );
 * }
 * ```
 *
 * @module marketplace-trading
 */

// Main component
export {
  MarketplaceTradingUI,
  type MarketplaceTradingUIProps,
} from './MarketplaceTradingUI';

// Hook
export {
  useMarketplaceTrading,
  type UseMarketplaceTradingConfig,
} from './useMarketplaceTrading';

// Types
export type {
  BondingCurveType,
  PolynomialCurveParams,
  SigmoidCurveParams,
  BondingCurveParams,
  TradeDirection,
  MarketplaceTransaction,
  PriceImpactPreview,
  PriceImpactSeverity,
  MarketplaceDisplayMode,
  MarketplaceTradingState,
  MarketplaceTradingActions,
  CurveChartPoint,
  CurveAnnotation,
  MarketplaceTheme,
} from './types';

export {
  DEFAULT_MARKETPLACE_THEME,
  MARKETPLACE_BUDGET,
  polynomialSpotPrice,
  sigmoidSpotPrice,
  spotPrice,
  polynomialIntegral,
  sigmoidIntegral,
  computeTradeCost,
  computePriceImpact,
  getPriceImpactSeverity,
  getImpactSeverityColor,
  formatTokenAmount,
  formatPrice,
  formatImpactPercent,
  generateCurvePoints,
  createTransactionId,
  clampValue,
  applyMarketplaceOverlayOpacity,
} from './types';
