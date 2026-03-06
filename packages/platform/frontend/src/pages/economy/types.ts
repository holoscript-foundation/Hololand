/** Economy Visualization Types */

export interface FaucetSinkData {
  label: string;
  faucetRate: number;  // tokens/minute entering
  sinkRate: number;    // tokens/minute leaving
  netFlow: number;
  balance: number;
}

export interface GiniData {
  timestamp: number;
  coefficient: number; // 0 = perfect equality, 1 = perfect inequality
  topPercentShare: number;
  bottomPercentShare: number;
}

export interface VelocityData {
  timestamp: number;
  velocity: number;          // transactions per token per time period
  transactionVolume: number;
  activeSupply: number;
}

export interface BondingCurvePoint {
  supply: number;
  price: number;
  reserveRatio: number;
}

export interface BondingCurveState {
  currentSupply: number;
  currentPrice: number;
  reserveBalance: number;
  curve: BondingCurvePoint[];
  recentTrades: Array<{
    type: 'buy' | 'sell';
    amount: number;
    price: number;
    timestamp: number;
  }>;
}

export interface PIDState {
  setpoint: number;
  processVariable: number;
  error: number;
  pTerm: number;
  iTerm: number;
  dTerm: number;
  output: number;
  isActive: boolean;
  history: Array<{
    timestamp: number;
    setpoint: number;
    pv: number;
    output: number;
  }>;
}

export interface EconomyOverview {
  faucetSinks: FaucetSinkData[];
  giniHistory: GiniData[];
  velocityHistory: VelocityData[];
  bondingCurve: BondingCurveState;
  pidController: PIDState;
  totalSupply: number;
  circulatingSupply: number;
  treasuryBalance: number;
}
