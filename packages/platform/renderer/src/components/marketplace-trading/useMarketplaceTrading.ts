/**
 * useMarketplaceTrading Hook
 *
 * React hook that manages the marketplace trading state, including
 * bonding curve computation, price impact prediction, and trade execution.
 *
 * Architecture:
 *   - All bonding curve math is O(1) closed-form (no iteration in render path).
 *   - Price impact is recomputed whenever pendingAmount or pendingDirection changes.
 *   - Trade execution is async to allow integration with backend confirmation.
 *   - Supply and balance updates are imperative push methods (no polling).
 *
 * Performance contract:
 *   - No polling, subscriptions, or heavy computation in the hook.
 *   - Price impact computation is O(1) per invocation.
 *   - React state batching prevents excessive re-renders.
 *   - The caller is responsible for throttling external data pushes.
 *
 * References: P.030.02, W.038
 *
 * @module marketplace-trading/useMarketplaceTrading
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  MarketplaceTradingState,
  MarketplaceTradingActions,
  MarketplaceDisplayMode,
  MarketplaceTransaction,
  BondingCurveParams,
  TradeDirection,
} from './types';
import {
  spotPrice,
  computePriceImpact,
  computeTradeCost,
  createTransactionId,
  MARKETPLACE_BUDGET,
} from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseMarketplaceTradingConfig {
  /** Bonding curve parameters */
  curveParams: BondingCurveParams;
  /** Initial token supply */
  initialSupply?: number;
  /** Player's initial token balance */
  initialTokenBalance?: number;
  /** Player's initial base currency balance */
  initialCurrencyBalance?: number;
  /** Token display name */
  tokenName?: string;
  /** Base currency display name */
  currencyName?: string;
  /** Token ticker symbol */
  tokenSymbol?: string;
  /** Currency ticker symbol */
  currencySymbol?: string;
  /** Initial display mode */
  initialDisplayMode?: MarketplaceDisplayMode;
  /** Maximum allowed price impact percentage (default: 15%) */
  maxPriceImpactPercent?: number;
  /** Callback invoked when a trade is executed. Return true to confirm, false to reject. */
  onTradeExecute?: (tx: Omit<MarketplaceTransaction, 'id' | 'timestamp'>) => Promise<boolean>;
}

const DEFAULT_CURVE: BondingCurveParams = {
  type: 'linear',
  basePrice: 1.0,
  slope: 0.001,
  exponent: 1,
};

// =============================================================================
// HOOK
// =============================================================================

export function useMarketplaceTrading(
  config?: UseMarketplaceTradingConfig,
): [MarketplaceTradingState, MarketplaceTradingActions] {
  const cfg = useMemo(() => ({
    curveParams: config?.curveParams ?? DEFAULT_CURVE,
    initialSupply: config?.initialSupply ?? 0,
    initialTokenBalance: config?.initialTokenBalance ?? 0,
    initialCurrencyBalance: config?.initialCurrencyBalance ?? 10000,
    tokenName: config?.tokenName ?? 'Token',
    currencyName: config?.currencyName ?? 'Gold',
    tokenSymbol: config?.tokenSymbol ?? 'TKN',
    currencySymbol: config?.currencySymbol ?? 'GOLD',
    initialDisplayMode: config?.initialDisplayMode ?? 'full',
    maxPriceImpactPercent: config?.maxPriceImpactPercent
      ?? MARKETPLACE_BUDGET.DEFAULT_MAX_PRICE_IMPACT_PERCENT,
    onTradeExecute: config?.onTradeExecute,
  }), [config]);

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [curveParams, setCurveParams] = useState<BondingCurveParams>(cfg.curveParams);
  const [currentSupply, setCurrentSupply] = useState(cfg.initialSupply);
  const [playerBalance, setPlayerBalance] = useState(cfg.initialTokenBalance);
  const [playerCurrency, setPlayerCurrency] = useState(cfg.initialCurrencyBalance);
  const [pendingAmount, setPendingAmountState] = useState(0);
  const [pendingDirection, setPendingDirectionState] = useState<TradeDirection>('buy');
  const [recentTransactions, setRecentTransactions] = useState<MarketplaceTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayMode, setDisplayModeState] = useState<MarketplaceDisplayMode>(cfg.initialDisplayMode);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(Date.now());
  const [lastError, setLastError] = useState<string | null>(null);
  const [maxPriceImpactPercent] = useState(cfg.maxPriceImpactPercent);

  // -------------------------------------------------------
  // DERIVED VALUES (O(1))
  // -------------------------------------------------------

  const currentPrice = useMemo(
    () => spotPrice(currentSupply, curveParams),
    [currentSupply, curveParams],
  );

  const priceImpact = useMemo(
    () => {
      if (pendingAmount <= 0) return null;
      // Validate: cannot sell more than player balance
      if (pendingDirection === 'sell' && pendingAmount > playerBalance) return null;
      // Validate: cannot sell more than current supply
      if (pendingDirection === 'sell' && pendingAmount > currentSupply) return null;
      return computePriceImpact(
        currentSupply,
        pendingAmount,
        pendingDirection,
        curveParams,
        maxPriceImpactPercent,
      );
    },
    [currentSupply, pendingAmount, pendingDirection, curveParams, maxPriceImpactPercent, playerBalance],
  );

  // -------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------

  const setPendingAmount = useCallback((amount: number) => {
    setPendingAmountState(Math.max(0, amount));
    setLastError(null);
  }, []);

  const setPendingDirection = useCallback((direction: TradeDirection) => {
    setPendingDirectionState(direction);
    setLastError(null);
  }, []);

  const executeTrade = useCallback(async (): Promise<boolean> => {
    if (pendingAmount <= 0) {
      setLastError('Trade amount must be greater than zero.');
      return false;
    }

    const impact = computePriceImpact(
      currentSupply,
      pendingAmount,
      pendingDirection,
      curveParams,
      maxPriceImpactPercent,
    );

    // Validate trade
    if (pendingDirection === 'buy') {
      if (impact.totalCost > playerCurrency) {
        setLastError(`Insufficient ${cfg.currencyName}. Need ${impact.totalCost.toFixed(2)}, have ${playerCurrency.toFixed(2)}.`);
        return false;
      }
    } else {
      if (pendingAmount > playerBalance) {
        setLastError(`Insufficient ${cfg.tokenName} balance. Have ${playerBalance.toFixed(2)}, need ${pendingAmount.toFixed(2)}.`);
        return false;
      }
      if (pendingAmount > currentSupply) {
        setLastError('Cannot sell more tokens than current supply.');
        return false;
      }
    }

    if (impact.exceedsMaxImpact) {
      setLastError(`Price impact ${Math.abs(impact.priceImpactPercent).toFixed(2)}% exceeds maximum allowed ${maxPriceImpactPercent}%.`);
      return false;
    }

    setIsProcessing(true);
    setLastError(null);

    try {
      const txData: Omit<MarketplaceTransaction, 'id' | 'timestamp'> = {
        direction: pendingDirection,
        amount: pendingAmount,
        totalCost: impact.totalCost,
        averagePrice: impact.averagePrice,
        supplyBefore: currentSupply,
        supplyAfter: impact.predictedSupply,
        priceBefore: impact.currentPrice,
        priceAfter: impact.predictedPrice,
        traderId: 'local-player',
      };

      // Call external confirmation callback if provided
      if (cfg.onTradeExecute) {
        const confirmed = await cfg.onTradeExecute(txData);
        if (!confirmed) {
          setIsProcessing(false);
          setLastError('Trade rejected by server.');
          return false;
        }
      }

      // Apply trade locally
      const tx: MarketplaceTransaction = {
        ...txData,
        id: createTransactionId(),
        timestamp: Date.now(),
      };

      if (pendingDirection === 'buy') {
        setCurrentSupply(impact.predictedSupply);
        setPlayerBalance((prev) => prev + pendingAmount);
        setPlayerCurrency((prev) => prev - impact.totalCost);
      } else {
        setCurrentSupply(impact.predictedSupply);
        setPlayerBalance((prev) => prev - pendingAmount);
        setPlayerCurrency((prev) => prev + impact.totalCost);
      }

      setRecentTransactions((prev) => {
        const next = [tx, ...prev];
        return next.length > MARKETPLACE_BUDGET.MAX_RECENT_TRANSACTIONS
          ? next.slice(0, MARKETPLACE_BUDGET.MAX_RECENT_TRANSACTIONS)
          : next;
      });

      setLastUpdateTimestamp(Date.now());
      setPendingAmountState(0);
      setIsProcessing(false);
      return true;
    } catch (err) {
      setIsProcessing(false);
      setLastError(err instanceof Error ? err.message : 'Trade execution failed.');
      return false;
    }
  }, [
    pendingAmount,
    pendingDirection,
    currentSupply,
    curveParams,
    maxPriceImpactPercent,
    playerCurrency,
    playerBalance,
    cfg.currencyName,
    cfg.tokenName,
    cfg.onTradeExecute,
  ]);

  const updateSupply = useCallback((supply: number) => {
    if (!isLive) return;
    setCurrentSupply(Math.max(0, supply));
    setLastUpdateTimestamp(Date.now());
  }, [isLive]);

  const updatePlayerBalances = useCallback((tokenBalance: number, currencyBalance: number) => {
    setPlayerBalance(tokenBalance);
    setPlayerCurrency(currencyBalance);
  }, []);

  const pushTransaction = useCallback((tx: MarketplaceTransaction) => {
    if (!isLive) return;
    setRecentTransactions((prev) => {
      const next = [tx, ...prev];
      return next.length > MARKETPLACE_BUDGET.MAX_RECENT_TRANSACTIONS
        ? next.slice(0, MARKETPLACE_BUDGET.MAX_RECENT_TRANSACTIONS)
        : next;
    });
    setLastUpdateTimestamp(Date.now());
  }, [isLive]);

  const updateCurveParams = useCallback((params: BondingCurveParams) => {
    setCurveParams(params);
    setLastUpdateTimestamp(Date.now());
  }, []);

  const toggleLive = useCallback(() => {
    setIsLive((prev) => !prev);
  }, []);

  const setDisplayMode = useCallback((mode: MarketplaceDisplayMode) => {
    setDisplayModeState(mode);
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // -------------------------------------------------------
  // ASSEMBLED STATE
  // -------------------------------------------------------

  const state: MarketplaceTradingState = useMemo(
    () => ({
      curveParams,
      currentSupply,
      currentPrice,
      playerBalance,
      playerCurrency,
      tokenName: cfg.tokenName,
      currencyName: cfg.currencyName,
      tokenSymbol: cfg.tokenSymbol,
      currencySymbol: cfg.currencySymbol,
      pendingAmount,
      pendingDirection,
      priceImpact,
      recentTransactions,
      isProcessing,
      displayMode,
      isLive,
      maxPriceImpactPercent,
      lastUpdateTimestamp,
      lastError,
    }),
    [
      curveParams,
      currentSupply,
      currentPrice,
      playerBalance,
      playerCurrency,
      cfg.tokenName,
      cfg.currencyName,
      cfg.tokenSymbol,
      cfg.currencySymbol,
      pendingAmount,
      pendingDirection,
      priceImpact,
      recentTransactions,
      isProcessing,
      displayMode,
      isLive,
      maxPriceImpactPercent,
      lastUpdateTimestamp,
      lastError,
    ],
  );

  const actions: MarketplaceTradingActions = useMemo(
    () => ({
      setPendingAmount,
      setPendingDirection,
      executeTrade,
      updateSupply,
      updatePlayerBalances,
      pushTransaction,
      updateCurveParams,
      toggleLive,
      setDisplayMode,
      clearError,
    }),
    [
      setPendingAmount,
      setPendingDirection,
      executeTrade,
      updateSupply,
      updatePlayerBalances,
      pushTransaction,
      updateCurveParams,
      toggleLive,
      setDisplayMode,
      clearError,
    ],
  );

  return [state, actions];
}
