/** Self-Improve Pipeline Types */

export type CyclePhase = 'idle' | 'generating' | 'evaluating' | 'training' | 'validating' | 'deploying' | 'paused' | 'error';

export interface CycleInfo {
  id: string;
  phase: CyclePhase;
  startedAt: number;
  completedAt?: number;
  iteration: number;
  qualityBefore: number;
  qualityAfter?: number;
  improvement?: number;
  grpoEnabled: boolean;
  promptsProcessed: number;
  promptsTotal: number;
  error?: string;
}

export interface PromptQueueItem {
  id: string;
  prompt: string;
  source: string;
  priority: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  addedAt: number;
  completedAt?: number;
  quality?: number;
}

export interface PipelineConfig {
  autoStart: boolean;
  grpoEnabled: boolean;
  maxIterations: number;
  qualityThreshold: number;
  cooldownMinutes: number;
  promptBatchSize: number;
}

export interface PipelineState {
  isRunning: boolean;
  currentCycle: CycleInfo | null;
  history: CycleInfo[];
  promptQueue: PromptQueueItem[];
  config: PipelineConfig;
  totalCycles: number;
  averageImprovement: number;
}
