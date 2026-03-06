/** Marketplace Trading Types */

export interface TradeOrder {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  pricePerToken: number;
  totalCost: number;
  slippage: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface BondingCurveData {
  supply: number;
  price: number;
}

export interface MarketState {
  currentPrice: number;
  currentSupply: number;
  reserveBalance: number;
  volume24h: number;
  priceChange24h: number;
  curve: BondingCurveData[];
  recentTrades: TradeOrder[];
  userBalance: number;
  userTokens: number;
}

export interface TradeParams {
  type: 'buy' | 'sell';
  amount: number;
  maxSlippage: number;
}
