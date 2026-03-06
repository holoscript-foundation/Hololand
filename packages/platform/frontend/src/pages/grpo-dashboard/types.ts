/** GRPO Training Dashboard Types */

export interface RewardFunctionData {
  name: string;
  values: number[];
  timestamps: number[];
  color: string;
  weight: number;
}

export interface KLDivergencePoint {
  step: number;
  kl: number;
  timestamp: number;
}

export interface CompletionPair {
  prompt: string;
  best: { text: string; reward: number; rewardBreakdown: Record<string, number> };
  worst: { text: string; reward: number; rewardBreakdown: Record<string, number> };
  step: number;
}

export interface GRPOTrainingState {
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  epoch: number;
  learningRate: number;
  klCoefficient: number;
  groupSize: number;
  rewardFunctions: RewardFunctionData[];
  klDivergence: KLDivergencePoint[];
  completionPairs: CompletionPair[];
  elapsedTime: number;
  estimatedRemaining: number;
  loss: number;
}

export interface GRPOControlConfig {
  learningRate: number;
  klCoefficient: number;
  groupSize: number;
  maxSteps: number;
  batchSize: number;
  temperature: number;
  topP: number;
}

export type GRPOWebSocketMessage =
  | { type: 'state'; payload: GRPOTrainingState }
  | { type: 'reward_update'; payload: { name: string; value: number; step: number } }
  | { type: 'kl_update'; payload: KLDivergencePoint }
  | { type: 'completion_pair'; payload: CompletionPair }
  | { type: 'error'; payload: { message: string; code: string } };
