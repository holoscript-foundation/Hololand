/**
 * Marketplace Trading UI - Shared Types
 *
 * Type definitions and bonding curve mathematics for the interactive
 * marketplace trading component. Visualises how player buy/sell transactions
 * move along a bonding curve, with real-time price impact prediction.
 *
 * Bonding Curve Model:
 *   The default curve is a polynomial bonding curve:
 *     price(supply) = basePrice + slope * supply ^ exponent
 *
 *   This maps total token supply to a deterministic unit price.
 *   - Buying tokens moves RIGHT along the curve (price increases).
 *   - Selling tokens moves LEFT along the curve (price decreases).
 *   - The area under the curve between two supply points is the total
 *     cost/proceeds of the transaction (integral).
 *
 * Performance Contract:
 *   - All bonding curve math is O(1) per invocation (closed-form integrals).
 *   - No iteration, binary search, or numerical integration in the render path.
 *   - Chart rendering uses pre-computed SVG polyline data, O(n) on sample count
 *     which is capped at MAX_CHART_SAMPLES (200).
 *   - Price impact preview is O(1): single integral evaluation.
 *   - All updates are push-based; no polling.
 *
 * References: P.030.02, W.038
 *
 * @module marketplace-trading/types
 */

// =============================================================================
// BONDING CURVE PARAMETERS
// =============================================================================

/**
 * Bonding curve type.
 * Determines the mathematical model used for price calculation.
 */
export type BondingCurveType =
  | 'polynomial'    // price = basePrice + slope * supply^exponent
  | 'linear'        // price = basePrice + slope * supply (exponent = 1)
  | 'quadratic'     // price = basePrice + slope * supply^2 (exponent = 2)
  | 'sigmoid';      // price = maxPrice / (1 + e^(-steepness * (supply - midpoint)))

/**
 * Parameters defining a polynomial bonding curve.
 *
 * price(supply) = basePrice + slope * supply ^ exponent
 *
 * The integral (total cost to buy from s0 to s1):
 *   cost = basePrice * (s1 - s0) + slope * (s1^(exp+1) - s0^(exp+1)) / (exp+1)
 */
export interface PolynomialCurveParams {
  type: 'polynomial' | 'linear' | 'quadratic';
  /** Base price (y-intercept when supply = 0) */
  basePrice: number;
  /** Slope coefficient controlling price growth rate */
  slope: number;
  /** Exponent controlling curve steepness (1 = linear, 2 = quadratic, etc.) */
  exponent: number;
}

/**
 * Parameters defining a sigmoid bonding curve.
 *
 * price(supply) = maxPrice / (1 + e^(-steepness * (supply - midpoint)))
 *
 * Sigmoid curves create an S-shaped price curve with a natural ceiling.
 * Useful for capped-supply tokens.
 */
export interface SigmoidCurveParams {
  type: 'sigmoid';
  /** Maximum price the curve asymptotically approaches */
  maxPrice: number;
  /** Steepness of the sigmoid transition */
  steepness: number;
  /** Supply value at the inflection point (price = maxPrice / 2) */
  midpoint: number;
}

/**
 * Union type for all supported bonding curve parameter sets.
 */
export type BondingCurveParams = PolynomialCurveParams | SigmoidCurveParams;

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

/**
 * Direction of a marketplace trade.
 */
export type TradeDirection = 'buy' | 'sell';

/**
 * A completed marketplace transaction record.
 */
export interface MarketplaceTransaction {
  /** Unique transaction ID */
  id: string;
  /** Trade direction */
  direction: TradeDirection;
  /** Number of tokens traded */
  amount: number;
  /** Total cost/proceeds in base currency */
  totalCost: number;
  /** Average price per token for this transaction */
  averagePrice: number;
  /** Supply before the transaction */
  supplyBefore: number;
  /** Supply after the transaction */
  supplyAfter: number;
  /** Spot price before the transaction */
  priceBefore: number;
  /** Spot price after the transaction */
  priceAfter: number;
  /** Timestamp (epoch ms) */
  timestamp: number;
  /** Player/agent identifier */
  traderId: string;
}

/**
 * A pending transaction preview showing predicted price impact.
 * Computed in O(1) from the bonding curve integral.
 */
export interface PriceImpactPreview {
  /** Trade direction */
  direction: TradeDirection;
  /** Number of tokens in the pending trade */
  amount: number;
  /** Current spot price (before trade) */
  currentPrice: number;
  /** Predicted spot price after trade completes */
  predictedPrice: number;
  /** Total cost to buy / total proceeds from sell */
  totalCost: number;
  /** Average price per token for this trade */
  averagePrice: number;
  /** Price impact as a percentage: ((predictedPrice - currentPrice) / currentPrice) * 100 */
  priceImpactPercent: number;
  /** Price slippage: difference between average price and current spot price */
  slippage: number;
  /** Slippage as a percentage of current price */
  slippagePercent: number;
  /** Whether this trade would exceed the maximum allowed price impact */
  exceedsMaxImpact: boolean;
  /** Current supply */
  currentSupply: number;
  /** Predicted supply after trade */
  predictedSupply: number;
}

/**
 * Severity level for price impact warnings.
 */
export type PriceImpactSeverity =
  | 'negligible'   // < 0.5% impact -- green, no warning
  | 'low'          // 0.5% - 2% -- yellow, informational
  | 'medium'       // 2% - 5% -- orange, caution
  | 'high'         // 5% - 10% -- red, warning
  | 'extreme';     // > 10% -- pulsing red, strong warning

// =============================================================================
// MARKETPLACE STATE
// =============================================================================

/**
 * Display mode for the marketplace trading UI.
 */
export type MarketplaceDisplayMode =
  | 'full'         // Full trading interface with chart + order panel
  | 'compact'      // Compact price ticker with quick-trade buttons
  | 'chart-only'   // Only the bonding curve chart visualisation
  | 'overlay';     // Semi-transparent Layer 6 holographic overlay

/**
 * Complete marketplace trading state consumed by the UI.
 */
export interface MarketplaceTradingState {
  /** Bonding curve parameters */
  curveParams: BondingCurveParams;
  /** Current token supply */
  currentSupply: number;
  /** Current spot price (computed from curve at currentSupply) */
  currentPrice: number;
  /** Player's token balance */
  playerBalance: number;
  /** Player's base currency balance */
  playerCurrency: number;
  /** Token name */
  tokenName: string;
  /** Base currency name (e.g. "Gold", "Credits") */
  currencyName: string;
  /** Token ticker symbol (e.g. "LAND", "MANA") */
  tokenSymbol: string;
  /** Currency ticker symbol (e.g. "GOLD", "CR") */
  currencySymbol: string;
  /** Pending trade amount (user input) */
  pendingAmount: number;
  /** Pending trade direction */
  pendingDirection: TradeDirection;
  /** Computed price impact preview for the pending trade */
  priceImpact: PriceImpactPreview | null;
  /** Recent transaction history */
  recentTransactions: MarketplaceTransaction[];
  /** Whether a transaction is currently being processed */
  isProcessing: boolean;
  /** Display mode */
  displayMode: MarketplaceDisplayMode;
  /** Whether the chart is in live-updating mode */
  isLive: boolean;
  /** Maximum allowed price impact percentage before blocking trade */
  maxPriceImpactPercent: number;
  /** Last data update timestamp */
  lastUpdateTimestamp: number;
  /** Error message from last failed transaction, if any */
  lastError: string | null;
}

/**
 * Actions available from the useMarketplaceTrading hook.
 */
export interface MarketplaceTradingActions {
  /** Set the pending trade amount */
  setPendingAmount: (amount: number) => void;
  /** Set the pending trade direction */
  setPendingDirection: (direction: TradeDirection) => void;
  /** Execute the pending trade (returns success/failure) */
  executeTrade: () => Promise<boolean>;
  /** Update current supply from external source (e.g. backend push) */
  updateSupply: (supply: number) => void;
  /** Update player balances */
  updatePlayerBalances: (tokenBalance: number, currencyBalance: number) => void;
  /** Push a new transaction to the history */
  pushTransaction: (tx: MarketplaceTransaction) => void;
  /** Update bonding curve parameters */
  updateCurveParams: (params: BondingCurveParams) => void;
  /** Toggle live/paused chart updates */
  toggleLive: () => void;
  /** Set display mode */
  setDisplayMode: (mode: MarketplaceDisplayMode) => void;
  /** Clear error state */
  clearError: () => void;
}

// =============================================================================
// CHART TYPES
// =============================================================================

/**
 * A single point on the bonding curve chart.
 */
export interface CurveChartPoint {
  /** Supply value (x-axis) */
  supply: number;
  /** Price value (y-axis) */
  price: number;
}

/**
 * Annotation marker on the bonding curve chart.
 * Used to highlight current position, trade preview, and transaction history.
 */
export interface CurveAnnotation {
  /** Supply position on the curve */
  supply: number;
  /** Price at that supply */
  price: number;
  /** Annotation label */
  label: string;
  /** Annotation colour */
  color: string;
  /** Annotation type */
  type: 'current' | 'preview' | 'transaction';
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the marketplace trading UI.
 *
 * Follows the same Layer 6 transparency pattern as EconDashboardTheme.
 * All backgrounds use RGBA with configurable alpha. All text meets
 * WCAG 2.1 AA contrast ratios at default 0.85 opacity.
 */
export interface MarketplaceTheme {
  /** Base font family */
  fontFamily: string;
  /** Font size scale factor (1.0 = default VR-readable size) */
  fontScale: number;
  /** Border radius for panels */
  borderRadius: string;

  // --- Layer 6 Transparency ---
  /** Global overlay opacity (0.0 - 1.0). Default 0.85. */
  overlayOpacity: number;
  /** Container background (RGBA) */
  containerBackground: string;
  /** Card/panel background (RGBA) */
  cardBackground: string;

  // --- Text ---
  /** Primary text colour */
  textPrimary: string;
  /** Secondary text colour */
  textSecondary: string;
  /** Muted text colour */
  textMuted: string;

  // --- Borders ---
  /** Panel border colour */
  borderColor: string;
  /** Holographic glow colour */
  glowColor: string;

  // --- Trade Colours ---
  /** Buy action colour (green) */
  buyColor: string;
  /** Sell action colour (red) */
  sellColor: string;

  // --- Price Impact Severity Colours ---
  /** Negligible impact colour */
  impactNegligibleColor: string;
  /** Low impact colour */
  impactLowColor: string;
  /** Medium impact colour */
  impactMediumColor: string;
  /** High impact colour */
  impactHighColor: string;
  /** Extreme impact colour */
  impactExtremeColor: string;

  // --- Chart Colours ---
  /** Bonding curve line colour */
  curveLineColor: string;
  /** Area fill under the curve */
  curveFillColor: string;
  /** Current position marker colour */
  currentPositionColor: string;
  /** Preview/predicted position colour */
  previewPositionColor: string;
  /** Trade cost/proceeds shaded area colour */
  tradeAreaColor: string;
  /** Chart grid line colour */
  gridColor: string;
  /** Chart axis label colour */
  axisLabelColor: string;

  // --- Accent ---
  /** Accent colour for interactive elements */
  accentColor: string;
}

/**
 * Default holographic theme for the marketplace trading UI.
 */
export const DEFAULT_MARKETPLACE_THEME: MarketplaceTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',

  // Layer 6 transparency
  overlayOpacity: 0.85,
  containerBackground: 'rgba(8, 12, 28, 0.85)',
  cardBackground: 'rgba(16, 20, 44, 0.85)',

  // Text
  textPrimary: '#e8e8f8',
  textSecondary: '#a0a0c8',
  textMuted: '#7880a8',

  // Borders
  borderColor: 'rgba(48, 52, 80, 0.85)',
  glowColor: 'rgba(100, 130, 255, 0.15)',

  // Trade colours
  buyColor: '#22c55e',          // Green -- buying
  sellColor: '#ef4444',         // Red -- selling

  // Price impact severity
  impactNegligibleColor: '#22c55e',  // Green
  impactLowColor: '#eab308',         // Yellow
  impactMediumColor: '#f97316',      // Orange
  impactHighColor: '#ef4444',        // Red
  impactExtremeColor: '#dc2626',     // Deep red

  // Chart
  curveLineColor: '#6366f1',         // Indigo
  curveFillColor: 'rgba(99, 102, 241, 0.10)',
  currentPositionColor: '#3b82f6',   // Blue
  previewPositionColor: '#a855f7',   // Purple
  tradeAreaColor: 'rgba(99, 102, 241, 0.20)',
  gridColor: 'rgba(48, 52, 80, 0.4)',
  axisLabelColor: '#7880a8',

  // Accent
  accentColor: '#6366f1',
};

// =============================================================================
// PERFORMANCE BUDGET CONSTANTS
// =============================================================================

/**
 * Performance constants for the marketplace trading UI.
 */
export const MARKETPLACE_BUDGET = {
  /** Maximum chart sample points for the bonding curve SVG */
  MAX_CHART_SAMPLES: 200,
  /** Maximum recent transactions retained */
  MAX_RECENT_TRANSACTIONS: 50,
  /** Chart animation duration in ms */
  CHART_TRANSITION_MS: 300,
  /** Default maximum price impact percentage (blocks trade above this) */
  DEFAULT_MAX_PRICE_IMPACT_PERCENT: 15,
  /** Price impact severity thresholds (percent) */
  IMPACT_THRESHOLDS: {
    negligible: 0.5,
    low: 2,
    medium: 5,
    high: 10,
  },
} as const;

// =============================================================================
// BONDING CURVE MATH (O(1) closed-form)
// =============================================================================

/**
 * Compute the spot price at a given supply for a polynomial bonding curve.
 *
 * price(supply) = basePrice + slope * supply ^ exponent
 *
 * O(1) -- single exponentiation.
 */
export function polynomialSpotPrice(
  supply: number,
  params: PolynomialCurveParams,
): number {
  if (supply < 0) return params.basePrice;
  return params.basePrice + params.slope * Math.pow(supply, params.exponent);
}

/**
 * Compute the spot price at a given supply for a sigmoid bonding curve.
 *
 * price(supply) = maxPrice / (1 + e^(-steepness * (supply - midpoint)))
 *
 * O(1) -- single exponential.
 */
export function sigmoidSpotPrice(
  supply: number,
  params: SigmoidCurveParams,
): number {
  return params.maxPrice / (1 + Math.exp(-params.steepness * (supply - params.midpoint)));
}

/**
 * Compute the spot price for any supported bonding curve type.
 */
export function spotPrice(supply: number, params: BondingCurveParams): number {
  if (params.type === 'sigmoid') {
    return sigmoidSpotPrice(supply, params);
  }
  return polynomialSpotPrice(supply, params);
}

/**
 * Compute the definite integral of a polynomial bonding curve from s0 to s1.
 *
 * integral(s0, s1) = basePrice * (s1 - s0)
 *                  + slope * (s1^(exp+1) - s0^(exp+1)) / (exp+1)
 *
 * This gives the total cost to buy tokens from supply s0 to s1,
 * or the total proceeds from selling from s1 back to s0.
 *
 * O(1) -- closed-form definite integral.
 */
export function polynomialIntegral(
  s0: number,
  s1: number,
  params: PolynomialCurveParams,
): number {
  const { basePrice, slope, exponent } = params;
  const expPlus1 = exponent + 1;
  const linearPart = basePrice * (s1 - s0);
  const curvePart = slope * (Math.pow(s1, expPlus1) - Math.pow(s0, expPlus1)) / expPlus1;
  return linearPart + curvePart;
}

/**
 * Compute the definite integral of a sigmoid bonding curve from s0 to s1
 * using numerical approximation (Simpson's rule with n=100 intervals).
 *
 * For sigmoid curves, no simple closed-form integral exists in terms of
 * elementary functions, so we use Simpson's rule which is accurate enough
 * for UI display purposes and still well within O(1) bounds (fixed 100
 * evaluations regardless of input).
 */
export function sigmoidIntegral(
  s0: number,
  s1: number,
  params: SigmoidCurveParams,
): number {
  const n = 100; // Fixed number of intervals (even)
  const h = (s1 - s0) / n;
  if (h === 0) return 0;

  let sum = sigmoidSpotPrice(s0, params) + sigmoidSpotPrice(s1, params);

  for (let i = 1; i < n; i++) {
    const s = s0 + i * h;
    const weight = i % 2 === 0 ? 2 : 4;
    sum += weight * sigmoidSpotPrice(s, params);
  }

  return (h / 3) * sum;
}

/**
 * Compute the total cost of a trade (integral under the bonding curve).
 *
 * For buys: cost = integral(currentSupply, currentSupply + amount)
 * For sells: proceeds = integral(currentSupply - amount, currentSupply)
 *
 * O(1) for polynomial curves (closed-form).
 * O(1) for sigmoid curves (fixed-iteration Simpson's rule).
 */
export function computeTradeCost(
  currentSupply: number,
  amount: number,
  direction: TradeDirection,
  params: BondingCurveParams,
): number {
  let s0: number;
  let s1: number;

  if (direction === 'buy') {
    s0 = currentSupply;
    s1 = currentSupply + amount;
  } else {
    s0 = Math.max(0, currentSupply - amount);
    s1 = currentSupply;
  }

  if (params.type === 'sigmoid') {
    return sigmoidIntegral(s0, s1, params);
  }
  return polynomialIntegral(s0, s1, params);
}

/**
 * Compute a full price impact preview for a pending trade.
 *
 * O(1) -- single integral + spot price evaluations.
 */
export function computePriceImpact(
  currentSupply: number,
  amount: number,
  direction: TradeDirection,
  params: BondingCurveParams,
  maxImpactPercent: number,
): PriceImpactPreview {
  if (amount <= 0) {
    const price = spotPrice(currentSupply, params);
    return {
      direction,
      amount: 0,
      currentPrice: price,
      predictedPrice: price,
      totalCost: 0,
      averagePrice: price,
      priceImpactPercent: 0,
      slippage: 0,
      slippagePercent: 0,
      exceedsMaxImpact: false,
      currentSupply,
      predictedSupply: currentSupply,
    };
  }

  const currentPrice = spotPrice(currentSupply, params);
  const predictedSupply = direction === 'buy'
    ? currentSupply + amount
    : Math.max(0, currentSupply - amount);
  const predictedPrice = spotPrice(predictedSupply, params);
  const totalCost = computeTradeCost(currentSupply, amount, direction, params);
  const averagePrice = amount > 0 ? totalCost / amount : currentPrice;
  const priceImpactPercent = currentPrice !== 0
    ? ((predictedPrice - currentPrice) / currentPrice) * 100
    : 0;
  const slippage = averagePrice - currentPrice;
  const slippagePercent = currentPrice !== 0
    ? (slippage / currentPrice) * 100
    : 0;
  const exceedsMaxImpact = Math.abs(priceImpactPercent) > maxImpactPercent;

  return {
    direction,
    amount,
    currentPrice,
    predictedPrice,
    totalCost,
    averagePrice,
    priceImpactPercent,
    slippage,
    slippagePercent,
    exceedsMaxImpact,
    currentSupply,
    predictedSupply,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the price impact severity level from a percentage.
 */
export function getPriceImpactSeverity(impactPercent: number): PriceImpactSeverity {
  const abs = Math.abs(impactPercent);
  if (abs >= MARKETPLACE_BUDGET.IMPACT_THRESHOLDS.high) return 'extreme';
  if (abs >= MARKETPLACE_BUDGET.IMPACT_THRESHOLDS.medium) return 'high';
  if (abs >= MARKETPLACE_BUDGET.IMPACT_THRESHOLDS.low) return 'medium';
  if (abs >= MARKETPLACE_BUDGET.IMPACT_THRESHOLDS.negligible) return 'low';
  return 'negligible';
}

/**
 * Get the theme colour for a price impact severity level.
 */
export function getImpactSeverityColor(
  severity: PriceImpactSeverity,
  theme: MarketplaceTheme,
): string {
  switch (severity) {
    case 'negligible': return theme.impactNegligibleColor;
    case 'low': return theme.impactLowColor;
    case 'medium': return theme.impactMediumColor;
    case 'high': return theme.impactHighColor;
    case 'extreme': return theme.impactExtremeColor;
    default: return theme.textMuted;
  }
}

/**
 * Format a token amount for display.
 * Uses compact notation: 1234 -> "1.2K", 1234567 -> "1.2M"
 */
export function formatTokenAmount(amount: number): string {
  if (amount < 0) return `-${formatTokenAmount(-amount)}`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount >= 1) return amount.toFixed(0);
  return amount.toFixed(2);
}

/**
 * Format a price for display.
 * Shows up to 4 significant digits for precision.
 */
export function formatPrice(price: number): string {
  if (price < 0) return `-${formatPrice(-price)}`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(2)}M`;
  if (price >= 1_000) return `${(price / 1_000).toFixed(2)}K`;
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toExponential(2);
}

/**
 * Format a percentage for display.
 */
export function formatImpactPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Generate bonding curve chart points.
 * Produces an array of (supply, price) pairs sampled along the curve.
 *
 * O(n) where n = sampleCount, capped at MAX_CHART_SAMPLES.
 */
export function generateCurvePoints(
  params: BondingCurveParams,
  minSupply: number,
  maxSupply: number,
  sampleCount: number = MARKETPLACE_BUDGET.MAX_CHART_SAMPLES,
): CurveChartPoint[] {
  const count = Math.min(sampleCount, MARKETPLACE_BUDGET.MAX_CHART_SAMPLES);
  if (count < 2) return [];

  const step = (maxSupply - minSupply) / (count - 1);
  const points: CurveChartPoint[] = [];

  for (let i = 0; i < count; i++) {
    const supply = minSupply + i * step;
    const price = spotPrice(supply, params);
    points.push({ supply, price });
  }

  return points;
}

/**
 * Create a unique transaction ID.
 */
export function createTransactionId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Clamp a number to a range.
 */
export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Apply overlay opacity to an RGBA background string.
 * Mirrors applyOverlayOpacity from economic-dashboard/types.
 */
export function applyMarketplaceOverlayOpacity(
  rgbaBase: string,
  opacity: number,
): string {
  const match = rgbaBase.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/,
  );
  if (!match) return rgbaBase;
  const [, r, g, b] = match;
  return `rgba(${r}, ${g}, ${b}, ${clampValue(opacity, 0, 1).toFixed(2)})`;
}
