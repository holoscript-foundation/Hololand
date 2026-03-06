/**
 * MarketplaceTradingUI Component
 *
 * Interactive marketplace trading interface that visualizes the bonding curve
 * in real-time, showing how player transactions affect price. Includes
 * predicted price impact before confirmation.
 *
 * Architecture:
 * ```
 *   <MarketplaceTradingUI>
 *       |
 *       |-- useMarketplaceTrading() hook (or external state)
 *       |
 *       |-- Header (token info, live/paused toggle)
 *       |-- BondingCurveChart (SVG curve + current position + preview)
 *       |-- PriceImpactPreview (slippage, cost, severity indicator)
 *       |-- TradePanel (buy/sell toggle, amount input, execute button)
 *       |-- TransactionHistory (recent trades list)
 * ```
 *
 * Performance Contract:
 *   - Bonding curve math is O(1) closed-form (no iteration in render path).
 *   - Chart uses pre-computed SVG polyline, O(n) on sample count capped at 200.
 *   - Price impact preview is O(1): single integral evaluation.
 *   - All updates are push-based; no polling.
 *   - Total render budget < 0.5ms per frame.
 *
 * Layer 6 Transparency:
 *   - Backgrounds use rgba() with configurable overlayOpacity.
 *   - Holographic glow on panel borders for VR spatial presence.
 *   - All text meets WCAG 2.1 AA contrast at default 0.85 opacity.
 *
 * References: P.030.02, W.038
 *
 * @module marketplace-trading/MarketplaceTradingUI
 */

import React, { useMemo } from 'react';
import {
  useMarketplaceTrading,
  type UseMarketplaceTradingConfig,
} from './useMarketplaceTrading';
import type {
  MarketplaceTradingState,
  MarketplaceTradingActions,
  MarketplaceDisplayMode,
  MarketplaceTheme,
  CurveChartPoint,
  CurveAnnotation,
  PriceImpactSeverity,
} from './types';
import {
  DEFAULT_MARKETPLACE_THEME,
  MARKETPLACE_BUDGET,
  spotPrice,
  generateCurvePoints,
  getPriceImpactSeverity,
  getImpactSeverityColor,
  formatTokenAmount,
  formatPrice,
  formatImpactPercent,
  applyMarketplaceOverlayOpacity,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface MarketplaceTradingUIProps {
  /** Display mode (default: 'full') */
  mode?: MarketplaceDisplayMode;
  /** Hook configuration (used when no external state is provided) */
  config?: UseMarketplaceTradingConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: MarketplaceTradingState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: MarketplaceTradingActions;
  /** Theme overrides */
  theme?: Partial<MarketplaceTheme>;
  /** Override overlay opacity (0.0 - 1.0) for Layer 6 transparency */
  overlayOpacity?: number;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
}

// =============================================================================
// CHART CONSTANTS
// =============================================================================

const CHART_WIDTH = 400;
const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, right: 20, bottom: 30, left: 55 };
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function BondingCurveChart({
  state,
  theme,
}: {
  state: MarketplaceTradingState;
  theme: MarketplaceTheme;
}) {
  const { curveParams, currentSupply, currentPrice, priceImpact } = state;

  // Compute chart domain
  const domain = useMemo(() => {
    const margin = Math.max(currentSupply * 0.3, 10);
    const minSupply = Math.max(0, currentSupply - margin);
    const maxSupply = currentSupply + margin;
    const points = generateCurvePoints(curveParams, minSupply, maxSupply, 200);
    const prices = points.map((p) => p.price);
    const minPrice = Math.min(...prices) * 0.9;
    const maxPrice = Math.max(...prices) * 1.1;
    return { minSupply, maxSupply, minPrice, maxPrice, points };
  }, [curveParams, currentSupply]);

  const toX = (supply: number) =>
    CHART_PADDING.left +
    ((supply - domain.minSupply) / (domain.maxSupply - domain.minSupply)) *
      PLOT_WIDTH;

  const toY = (price: number) =>
    CHART_PADDING.top +
    PLOT_HEIGHT -
    ((price - domain.minPrice) / (domain.maxPrice - domain.minPrice)) *
      PLOT_HEIGHT;

  // Build polyline
  const curvePath = domain.points
    .map((p) => `${toX(p.supply).toFixed(1)},${toY(p.price).toFixed(1)}`)
    .join(' ');

  // Trade area fill (shaded region between current and predicted supply)
  const tradeAreaPath = useMemo(() => {
    if (!priceImpact || priceImpact.amount <= 0) return null;
    const s0 = Math.min(priceImpact.currentSupply, priceImpact.predictedSupply);
    const s1 = Math.max(priceImpact.currentSupply, priceImpact.predictedSupply);
    const steps = 40;
    const step = (s1 - s0) / steps;
    const topPoints: string[] = [];
    const bottomY = toY(domain.minPrice);

    for (let i = 0; i <= steps; i++) {
      const s = s0 + i * step;
      const p = spotPrice(s, curveParams);
      topPoints.push(`${toX(s).toFixed(1)},${toY(p).toFixed(1)}`);
    }

    return `M ${toX(s0).toFixed(1)},${bottomY.toFixed(1)} ` +
      topPoints.map((pt, i) => (i === 0 ? `L ${pt}` : `L ${pt}`)).join(' ') +
      ` L ${toX(s1).toFixed(1)},${bottomY.toFixed(1)} Z`;
  }, [priceImpact, curveParams, domain, toX, toY]);

  // Y-axis labels (5 ticks)
  const yTicks = useMemo(() => {
    const ticks: { value: number; y: number }[] = [];
    for (let i = 0; i <= 4; i++) {
      const value =
        domain.minPrice +
        (i / 4) * (domain.maxPrice - domain.minPrice);
      ticks.push({ value, y: toY(value) });
    }
    return ticks;
  }, [domain, toY]);

  // X-axis labels (5 ticks)
  const xTicks = useMemo(() => {
    const ticks: { value: number; x: number }[] = [];
    for (let i = 0; i <= 4; i++) {
      const value =
        domain.minSupply +
        (i / 4) * (domain.maxSupply - domain.minSupply);
      ticks.push({ value, x: toX(value) });
    }
    return ticks;
  }, [domain, toX]);

  return (
    <svg
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label={`Bonding curve chart. Current supply: ${formatTokenAmount(currentSupply)}, Current price: ${formatPrice(currentPrice)}`}
      style={{ width: '100%', height: 'auto' }}
    >
      {/* Background */}
      <rect
        x={0}
        y={0}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        fill="transparent"
      />

      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <line
          key={`y-${i}`}
          x1={CHART_PADDING.left}
          y1={tick.y}
          x2={CHART_WIDTH - CHART_PADDING.right}
          y2={tick.y}
          stroke={theme.gridColor}
          strokeWidth={0.5}
        />
      ))}
      {xTicks.map((tick, i) => (
        <line
          key={`x-${i}`}
          x1={tick.x}
          y1={CHART_PADDING.top}
          x2={tick.x}
          y2={CHART_HEIGHT - CHART_PADDING.bottom}
          stroke={theme.gridColor}
          strokeWidth={0.5}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <text
          key={`yl-${i}`}
          x={CHART_PADDING.left - 5}
          y={tick.y + 3}
          textAnchor="end"
          fill={theme.axisLabelColor}
          fontSize={9}
          fontFamily={theme.fontFamily}
        >
          {formatPrice(tick.value)}
        </text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((tick, i) => (
        <text
          key={`xl-${i}`}
          x={tick.x}
          y={CHART_HEIGHT - CHART_PADDING.bottom + 14}
          textAnchor="middle"
          fill={theme.axisLabelColor}
          fontSize={9}
          fontFamily={theme.fontFamily}
        >
          {formatTokenAmount(tick.value)}
        </text>
      ))}

      {/* Axis labels */}
      <text
        x={CHART_PADDING.left - 40}
        y={CHART_PADDING.top + PLOT_HEIGHT / 2}
        textAnchor="middle"
        fill={theme.textSecondary}
        fontSize={10}
        fontFamily={theme.fontFamily}
        transform={`rotate(-90, ${CHART_PADDING.left - 40}, ${CHART_PADDING.top + PLOT_HEIGHT / 2})`}
      >
        Price
      </text>
      <text
        x={CHART_PADDING.left + PLOT_WIDTH / 2}
        y={CHART_HEIGHT - 2}
        textAnchor="middle"
        fill={theme.textSecondary}
        fontSize={10}
        fontFamily={theme.fontFamily}
      >
        Supply
      </text>

      {/* Trade area fill */}
      {tradeAreaPath && (
        <path
          d={tradeAreaPath}
          fill={theme.tradeAreaColor}
          opacity={0.6}
        />
      )}

      {/* Curve fill */}
      <polygon
        points={`${toX(domain.minSupply).toFixed(1)},${toY(domain.minPrice).toFixed(1)} ${curvePath} ${toX(domain.maxSupply).toFixed(1)},${toY(domain.minPrice).toFixed(1)}`}
        fill={theme.curveFillColor}
      />

      {/* Curve line */}
      <polyline
        points={curvePath}
        fill="none"
        stroke={theme.curveLineColor}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Current position marker */}
      <circle
        cx={toX(currentSupply)}
        cy={toY(currentPrice)}
        r={5}
        fill={theme.currentPositionColor}
        stroke="#fff"
        strokeWidth={1.5}
      />
      {/* Current position crosshair */}
      <line
        x1={toX(currentSupply)}
        y1={CHART_PADDING.top}
        x2={toX(currentSupply)}
        y2={CHART_HEIGHT - CHART_PADDING.bottom}
        stroke={theme.currentPositionColor}
        strokeWidth={0.5}
        strokeDasharray="3,3"
        opacity={0.5}
      />
      <line
        x1={CHART_PADDING.left}
        y1={toY(currentPrice)}
        x2={CHART_WIDTH - CHART_PADDING.right}
        y2={toY(currentPrice)}
        stroke={theme.currentPositionColor}
        strokeWidth={0.5}
        strokeDasharray="3,3"
        opacity={0.5}
      />

      {/* Preview position marker */}
      {priceImpact && priceImpact.amount > 0 && (
        <>
          <circle
            cx={toX(priceImpact.predictedSupply)}
            cy={toY(priceImpact.predictedPrice)}
            r={5}
            fill={theme.previewPositionColor}
            stroke="#fff"
            strokeWidth={1.5}
            opacity={0.8}
          />
          {/* Arrow from current to predicted */}
          <line
            x1={toX(currentSupply)}
            y1={toY(currentPrice)}
            x2={toX(priceImpact.predictedSupply)}
            y2={toY(priceImpact.predictedPrice)}
            stroke={theme.previewPositionColor}
            strokeWidth={1.5}
            strokeDasharray="4,3"
            opacity={0.7}
          />
        </>
      )}

      {/* Legend */}
      <circle cx={CHART_PADDING.left + 8} cy={CHART_PADDING.top + 8} r={3} fill={theme.currentPositionColor} />
      <text x={CHART_PADDING.left + 15} y={CHART_PADDING.top + 11} fill={theme.textMuted} fontSize={8} fontFamily={theme.fontFamily}>Current</text>
      {priceImpact && priceImpact.amount > 0 && (
        <>
          <circle cx={CHART_PADDING.left + 65} cy={CHART_PADDING.top + 8} r={3} fill={theme.previewPositionColor} />
          <text x={CHART_PADDING.left + 72} y={CHART_PADDING.top + 11} fill={theme.textMuted} fontSize={8} fontFamily={theme.fontFamily}>Preview</text>
        </>
      )}
    </svg>
  );
}

function PriceImpactPanel({
  state,
  theme,
}: {
  state: MarketplaceTradingState;
  theme: MarketplaceTheme;
}) {
  const { priceImpact, currencySymbol, tokenSymbol } = state;

  if (!priceImpact || priceImpact.amount <= 0) {
    return (
      <div
        style={{
          padding: '0.5rem 0.75rem',
          color: theme.textMuted,
          fontSize: '0.8rem',
          textAlign: 'center',
        }}
        role="status"
        aria-label="No pending trade"
      >
        Enter an amount to see price impact preview
      </div>
    );
  }

  const severity = getPriceImpactSeverity(priceImpact.priceImpactPercent);
  const severityColor = getImpactSeverityColor(severity, theme);
  const dirColor =
    priceImpact.direction === 'buy' ? theme.buyColor : theme.sellColor;

  return (
    <div
      style={{
        padding: '0.5rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        fontSize: '0.8rem',
      }}
      role="status"
      aria-label={`Price impact: ${formatImpactPercent(priceImpact.priceImpactPercent)}, severity: ${severity}`}
    >
      {/* Top row: direction + total cost */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: dirColor, fontWeight: 600, textTransform: 'uppercase' }}>
          {priceImpact.direction} {formatTokenAmount(priceImpact.amount)} {tokenSymbol}
        </span>
        <span style={{ color: theme.textPrimary }}>
          {formatPrice(priceImpact.totalCost)} {currencySymbol}
        </span>
      </div>

      {/* Price impact bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: theme.textSecondary, minWidth: '70px' }}>Impact:</span>
        <div
          style={{
            flex: 1,
            height: '6px',
            backgroundColor: theme.gridColor,
            borderRadius: '3px',
            overflow: 'hidden',
          }}
          role="meter"
          aria-valuenow={Math.abs(priceImpact.priceImpactPercent)}
          aria-valuemin={0}
          aria-valuemax={state.maxPriceImpactPercent}
          aria-label={`Price impact: ${formatImpactPercent(priceImpact.priceImpactPercent)}`}
        >
          <div
            style={{
              width: `${Math.min(100, (Math.abs(priceImpact.priceImpactPercent) / state.maxPriceImpactPercent) * 100)}%`,
              height: '100%',
              backgroundColor: severityColor,
              borderRadius: '3px',
              transition: 'width 0.2s ease-out',
            }}
          />
        </div>
        <span
          style={{
            color: severityColor,
            fontWeight: 600,
            minWidth: '55px',
            textAlign: 'right',
          }}
        >
          {formatImpactPercent(priceImpact.priceImpactPercent)}
        </span>
      </div>

      {/* Details row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: theme.textMuted,
          fontSize: '0.75rem',
        }}
      >
        <span>Avg price: {formatPrice(priceImpact.averagePrice)}</span>
        <span>Slippage: {formatImpactPercent(priceImpact.slippagePercent)}</span>
      </div>

      {/* Price change */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: theme.textMuted,
          fontSize: '0.75rem',
        }}
      >
        <span>Before: {formatPrice(priceImpact.currentPrice)}</span>
        <span>After: {formatPrice(priceImpact.predictedPrice)}</span>
      </div>

      {/* Warning for excessive impact */}
      {priceImpact.exceedsMaxImpact && (
        <div
          role="alert"
          style={{
            color: theme.impactExtremeColor,
            fontWeight: 600,
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          Price impact exceeds {state.maxPriceImpactPercent}% limit
        </div>
      )}
    </div>
  );
}

function TradePanel({
  state,
  actions,
  theme,
}: {
  state: MarketplaceTradingState;
  actions: MarketplaceTradingActions;
  theme: MarketplaceTheme;
}) {
  const {
    pendingDirection,
    pendingAmount,
    playerBalance,
    playerCurrency,
    isProcessing,
    priceImpact,
    tokenSymbol,
    currencySymbol,
    tokenName,
    currencyName,
    lastError,
  } = state;

  const canExecute =
    pendingAmount > 0 &&
    !isProcessing &&
    (!priceImpact || !priceImpact.exceedsMaxImpact);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    actions.setPendingAmount(isNaN(val) ? 0 : val);
  };

  return (
    <div
      style={{
        padding: '0.5rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}
    >
      {/* Buy/Sell toggle */}
      <div
        style={{ display: 'flex', gap: '0' }}
        role="radiogroup"
        aria-label="Trade direction"
      >
        <button
          onClick={() => actions.setPendingDirection('buy')}
          role="radio"
          aria-checked={pendingDirection === 'buy'}
          style={{
            flex: 1,
            padding: '0.4rem',
            border: `1px solid ${pendingDirection === 'buy' ? theme.buyColor : theme.borderColor}`,
            borderRadius: '4px 0 0 4px',
            backgroundColor:
              pendingDirection === 'buy'
                ? 'rgba(34, 197, 94, 0.15)'
                : 'transparent',
            color:
              pendingDirection === 'buy'
                ? theme.buyColor
                : theme.textSecondary,
            fontWeight: pendingDirection === 'buy' ? 700 : 400,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          BUY
        </button>
        <button
          onClick={() => actions.setPendingDirection('sell')}
          role="radio"
          aria-checked={pendingDirection === 'sell'}
          style={{
            flex: 1,
            padding: '0.4rem',
            border: `1px solid ${pendingDirection === 'sell' ? theme.sellColor : theme.borderColor}`,
            borderRadius: '0 4px 4px 0',
            backgroundColor:
              pendingDirection === 'sell'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'transparent',
            color:
              pendingDirection === 'sell'
                ? theme.sellColor
                : theme.textSecondary,
            fontWeight: pendingDirection === 'sell' ? 700 : 400,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          SELL
        </button>
      </div>

      {/* Amount input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <label
          htmlFor="trade-amount"
          style={{ fontSize: '0.75rem', color: theme.textSecondary }}
        >
          Amount ({tokenSymbol})
        </label>
        <input
          id="trade-amount"
          type="number"
          min={0}
          step={1}
          value={pendingAmount || ''}
          onChange={handleAmountChange}
          placeholder="0"
          aria-label={`Trade amount in ${tokenName}`}
          style={{
            padding: '0.4rem 0.5rem',
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '4px',
            color: theme.textPrimary,
            fontSize: '0.9rem',
            fontFamily: theme.fontFamily,
            outline: 'none',
          }}
        />
      </div>

      {/* Balances */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: theme.textMuted,
        }}
      >
        <span>
          {tokenSymbol}: {formatTokenAmount(playerBalance)}
        </span>
        <span>
          {currencySymbol}: {formatPrice(playerCurrency)}
        </span>
      </div>

      {/* Execute button */}
      <button
        onClick={() => actions.executeTrade()}
        disabled={!canExecute}
        aria-label={`Execute ${pendingDirection} trade for ${pendingAmount} ${tokenName}`}
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: canExecute
            ? pendingDirection === 'buy'
              ? theme.buyColor
              : theme.sellColor
            : theme.borderColor,
          color: canExecute ? '#fff' : theme.textMuted,
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: canExecute ? 'pointer' : 'not-allowed',
          opacity: isProcessing ? 0.6 : 1,
          transition: 'background-color 0.2s, opacity 0.2s',
        }}
      >
        {isProcessing
          ? 'Processing...'
          : `${pendingDirection.toUpperCase()} ${tokenSymbol}`}
      </button>

      {/* Error message */}
      {lastError && (
        <div
          role="alert"
          style={{
            fontSize: '0.75rem',
            color: theme.impactHighColor,
            padding: '0.25rem 0.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '4px',
          }}
        >
          {lastError}
        </div>
      )}
    </div>
  );
}

function TransactionHistory({
  state,
  theme,
}: {
  state: MarketplaceTradingState;
  theme: MarketplaceTheme;
}) {
  const { recentTransactions, tokenSymbol, currencySymbol } = state;

  if (recentTransactions.length === 0) {
    return (
      <div
        style={{
          padding: '0.5rem 0.75rem',
          color: theme.textMuted,
          fontSize: '0.75rem',
          textAlign: 'center',
        }}
      >
        No transactions yet
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '0.25rem 0.75rem',
        maxHeight: '120px',
        overflowY: 'auto',
      }}
      role="log"
      aria-label="Recent transactions"
    >
      {recentTransactions.slice(0, 10).map((tx) => (
        <div
          key={tx.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.2rem 0',
            fontSize: '0.7rem',
            borderBottom: `1px solid ${theme.gridColor}`,
          }}
        >
          <span
            style={{
              color:
                tx.direction === 'buy' ? theme.buyColor : theme.sellColor,
              fontWeight: 600,
              textTransform: 'uppercase',
              minWidth: '30px',
            }}
          >
            {tx.direction}
          </span>
          <span style={{ color: theme.textSecondary }}>
            {formatTokenAmount(tx.amount)} {tokenSymbol}
          </span>
          <span style={{ color: theme.textMuted }}>
            @ {formatPrice(tx.averagePrice)}
          </span>
          <span style={{ color: theme.textSecondary }}>
            {formatPrice(tx.totalCost)} {currencySymbol}
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// SECTION DIVIDER
// =============================================================================

function SectionDivider({
  label,
  theme,
}: {
  label: string;
  theme: MarketplaceTheme;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.3rem 0.75rem 0.1rem',
      }}
    >
      <span
        style={{
          fontSize: '0.65rem',
          color: theme.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: '1px',
          backgroundColor: theme.borderColor,
        }}
      />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const MarketplaceTradingUI: React.FC<MarketplaceTradingUIProps> = ({
  mode = 'full',
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  overlayOpacity,
  className,
  style,
  ariaLabel = 'Marketplace Trading Interface',
}) => {
  const [internalState, internalActions] = useMarketplaceTrading(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo((): MarketplaceTheme => {
    const merged = { ...DEFAULT_MARKETPLACE_THEME, ...themeOverride };
    if (overlayOpacity !== undefined) {
      merged.overlayOpacity = overlayOpacity;
      merged.containerBackground = applyMarketplaceOverlayOpacity(
        merged.containerBackground,
        overlayOpacity,
      );
      merged.cardBackground = applyMarketplaceOverlayOpacity(
        merged.cardBackground,
        overlayOpacity,
      );
    }
    return merged;
  }, [themeOverride, overlayOpacity]);

  const containerStyles = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontFamily: theme.fontFamily,
      fontSize: `calc(0.85rem * ${theme.fontScale})`,
      color: theme.textPrimary,
      backgroundColor: theme.containerBackground,
      borderRadius: theme.borderRadius,
      border: `1px solid ${theme.borderColor}`,
      boxShadow: `0 0 12px ${theme.glowColor}, inset 0 0 4px ${theme.glowColor}`,
      overflow: 'hidden',
    };

    switch (mode) {
      case 'overlay':
        return {
          ...base,
          backdropFilter: 'blur(8px)',
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '420px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 1000,
        };
      case 'compact':
        return {
          ...base,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
        };
      case 'chart-only':
        return {
          ...base,
          padding: '0.5rem',
        };
      case 'full':
      default:
        return {
          ...base,
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        };
    }
  }, [mode, theme]);

  // Compact mode: inline price ticker
  if (mode === 'compact') {
    const severity = state.priceImpact
      ? getPriceImpactSeverity(state.priceImpact.priceImpactPercent)
      : 'negligible';
    const sevColor = getImpactSeverityColor(severity, theme);

    return (
      <div
        className={className}
        style={{ ...containerStyles, ...style }}
        role="region"
        aria-label={ariaLabel}
      >
        <span style={{ fontWeight: 700, color: theme.accentColor }}>
          {state.tokenSymbol}
        </span>
        <span style={{ color: theme.textPrimary }}>
          {formatPrice(state.currentPrice)} {state.currencySymbol}
        </span>
        <span style={{ color: theme.textMuted, fontSize: '0.75rem' }}>
          Supply: {formatTokenAmount(state.currentSupply)}
        </span>
        {state.priceImpact && state.priceImpact.amount > 0 && (
          <span style={{ color: sevColor, fontWeight: 600, fontSize: '0.75rem' }}>
            {formatImpactPercent(state.priceImpact.priceImpactPercent)}
          </span>
        )}
        <button
          onClick={() => actions.toggleLive()}
          aria-label={state.isLive ? 'Pause updates' : 'Resume updates'}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '4px',
            color: state.isLive ? theme.buyColor : theme.textMuted,
            padding: '0.15rem 0.4rem',
            cursor: 'pointer',
            fontSize: '0.7rem',
          }}
        >
          {state.isLive ? 'LIVE' : 'PAUSED'}
        </button>
      </div>
    );
  }

  // Chart-only mode
  if (mode === 'chart-only') {
    return (
      <div
        className={className}
        style={{ ...containerStyles, ...style }}
        role="region"
        aria-label={ariaLabel}
      >
        <BondingCurveChart state={state} theme={theme} />
      </div>
    );
  }

  // Full / Overlay mode
  return (
    <div
      className={className}
      style={{ ...containerStyles, ...style }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 0.75rem',
          borderBottom: `1px solid ${theme.borderColor}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: theme.accentColor }}>
            {state.tokenName}
          </span>
          <span style={{ color: theme.textMuted, fontSize: '0.75rem' }}>
            {state.tokenSymbol}/{state.currencySymbol}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: theme.textPrimary, fontWeight: 600 }}>
            {formatPrice(state.currentPrice)}
          </span>
          <button
            onClick={() => actions.toggleLive()}
            aria-label={state.isLive ? 'Pause live updates' : 'Resume live updates'}
            style={{
              background: 'none',
              border: `1px solid ${state.isLive ? theme.buyColor : theme.borderColor}`,
              borderRadius: '4px',
              color: state.isLive ? theme.buyColor : theme.textMuted,
              padding: '0.15rem 0.4rem',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontWeight: 600,
            }}
          >
            {state.isLive ? 'LIVE' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* Bonding Curve Chart */}
      <SectionDivider label="Bonding Curve" theme={theme} />
      <div style={{ padding: '0 0.5rem' }}>
        <BondingCurveChart state={state} theme={theme} />
      </div>

      {/* Price Impact Preview */}
      <SectionDivider label="Price Impact" theme={theme} />
      <PriceImpactPanel state={state} theme={theme} />

      {/* Trade Panel */}
      <SectionDivider label="Trade" theme={theme} />
      <TradePanel state={state} actions={actions} theme={theme} />

      {/* Transaction History */}
      <SectionDivider label="History" theme={theme} />
      <TransactionHistory state={state} theme={theme} />
    </div>
  );
};
