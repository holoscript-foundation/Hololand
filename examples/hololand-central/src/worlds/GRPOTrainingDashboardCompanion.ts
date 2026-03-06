/**
 * GRPOTrainingDashboardCompanion.ts
 *
 * TypeScript companion module for the GRPO Training Dashboard.
 * Provides:
 *  - Type definitions for all training metrics
 *  - Data polling service with configurable intervals
 *  - Mock data generators for development/preview
 *  - REST API integration for real training endpoints
 *  - Event emitter for dashboard state synchronization
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** A single data point on a reward curve */
export interface RewardDataPoint {
  step: number;
  value: number;
}

/** Reward curves for all 5 QualityScore functions plus composite */
export interface RewardCurves {
  test_pass_reward: RewardDataPoint[];
  type_check_reward: RewardDataPoint[];
  lint_reward: RewardDataPoint[];
  coverage_reward: RewardDataPoint[];
  circuit_breaker_reward: RewardDataPoint[];
  composite_reward: RewardDataPoint[];
}

/** Training progress metrics from the GRPO trainer */
export interface TrainingMetrics {
  step: number;
  total_steps: number;
  epoch: number;
  total_epochs: number;
  steps_per_sec: number;
  eta_minutes: number;
  elapsed_minutes: number;
  gpu_utilization: number;
  gpu_memory_used: number;
  gpu_memory_total: number;
  gpu_temperature: number;
  learning_rate: number;
  is_training: boolean;
}

/** KL divergence tracking data */
export interface KLDivergenceData {
  current_kl: number;
  kl_history: RewardDataPoint[];
}

/** Per-reward breakdown for a single completion */
export interface RewardBreakdown {
  test_pass: number;
  type_check: number;
  lint: number;
  coverage: number;
  circuit_breaker: number;
}

/** A GRPO completion sample for the quality sampler panel */
export interface CompletionSample {
  prompt: string;
  best_completion: string;
  best_score: number;
  worst_completion: string;
  worst_score: number;
  breakdown: RewardBreakdown;
  step: number;
  group_size: number;
}

/** Completions response from the GRPO training server */
export interface CompletionsResponse {
  recent_completions: CompletionSample[];
}

/** OPLoRA forgetting indicators */
export interface OPLoRAMetrics {
  orthogonal_satisfaction: number;
  humaneval_score: number;
  humaneval_history: RewardDataPoint[];
  mbpp_score: number;
  mbpp_history: RewardDataPoint[];
  holoscript_score: number;
  holoscript_history: RewardDataPoint[];
}

/** Configuration update payload */
export interface TrainingConfigUpdate {
  temperature?: number;
  beta?: number;
  learning_rate?: number;
}

// ============================================================================
// REWARD FUNCTION WEIGHTS (as defined in HoloScript QualityScore)
// ============================================================================

export const REWARD_WEIGHTS = {
  testPassReward: 0.40,
  typeCheckReward: 0.20,
  lintReward: 0.15,
  coverageReward: 0.15,
  circuitBreakerReward: 0.10,
} as const;

/** Compute composite reward from individual scores */
export function computeCompositeReward(breakdown: RewardBreakdown): number {
  return (
    breakdown.test_pass * REWARD_WEIGHTS.testPassReward +
    breakdown.type_check * REWARD_WEIGHTS.typeCheckReward +
    breakdown.lint * REWARD_WEIGHTS.lintReward +
    breakdown.coverage * REWARD_WEIGHTS.coverageReward +
    breakdown.circuit_breaker * REWARD_WEIGHTS.circuitBreakerReward
  );
}

// ============================================================================
// DATA POLLING SERVICE
// ============================================================================

type DataCallback<T> = (data: T) => void;

interface PollingTask {
  url: string;
  interval: number;
  callback: DataCallback<unknown>;
  timer: ReturnType<typeof setInterval> | null;
  active: boolean;
}

export class GRPODataService {
  private baseUrl: string;
  private tasks: Map<string, PollingTask> = new Map();
  private useMockData: boolean;

  constructor(baseUrl = 'http://localhost:8080', useMockData = false) {
    this.baseUrl = baseUrl;
    this.useMockData = useMockData;
  }

  /**
   * Register a polling endpoint with a callback.
   */
  registerEndpoint<T>(
    name: string,
    path: string,
    interval: number,
    callback: DataCallback<T>
  ): void {
    this.tasks.set(name, {
      url: `${this.baseUrl}${path}`,
      interval,
      callback: callback as DataCallback<unknown>,
      timer: null,
      active: false,
    });
  }

  /**
   * Start polling all registered endpoints.
   */
  startAll(): void {
    for (const [name, task] of this.tasks) {
      this.startTask(name, task);
    }
  }

  /**
   * Stop all polling tasks.
   */
  stopAll(): void {
    for (const [, task] of this.tasks) {
      if (task.timer) {
        clearInterval(task.timer);
        task.timer = null;
      }
      task.active = false;
    }
  }

  /**
   * Update polling interval for a specific endpoint.
   */
  updateInterval(name: string, newInterval: number): void {
    const task = this.tasks.get(name);
    if (task) {
      if (task.timer) {
        clearInterval(task.timer);
      }
      task.interval = newInterval;
      if (task.active) {
        this.startTask(name, task);
      }
    }
  }

  private startTask(name: string, task: PollingTask): void {
    task.active = true;

    // Immediate first fetch
    this.fetchData(name, task);

    // Then poll at interval
    task.timer = setInterval(() => {
      this.fetchData(name, task);
    }, task.interval);
  }

  private async fetchData(name: string, task: PollingTask): Promise<void> {
    try {
      if (this.useMockData) {
        const mockData = generateMockData(name);
        task.callback(mockData);
        return;
      }

      const response = await fetch(task.url);
      if (!response.ok) {
        console.warn(`[GRPO Dashboard] ${name}: HTTP ${response.status}`);
        return;
      }
      const data = await response.json();
      task.callback(data);
    } catch (error) {
      console.warn(`[GRPO Dashboard] ${name}: fetch error`, error);
    }
  }

  /**
   * Send a control command to the training server.
   */
  async sendCommand(path: string, method = 'POST', body?: unknown): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.ok;
    } catch (error) {
      console.error(`[GRPO Dashboard] Command failed: ${path}`, error);
      return false;
    }
  }

  /**
   * Pause training.
   */
  async pauseTraining(): Promise<boolean> {
    return this.sendCommand('/api/training/pause');
  }

  /**
   * Resume training.
   */
  async resumeTraining(): Promise<boolean> {
    return this.sendCommand('/api/training/resume');
  }

  /**
   * Update training configuration (temperature, beta, etc.).
   */
  async updateConfig(config: TrainingConfigUpdate): Promise<boolean> {
    return this.sendCommand('/api/training/config', 'PATCH', config);
  }

  /**
   * Trigger benchmark evaluation (HumanEval, MBPP).
   */
  async triggerBenchmark(): Promise<boolean> {
    return this.sendCommand('/api/training/benchmark');
  }
}

// ============================================================================
// MOCK DATA GENERATORS (for development without a live training server)
// ============================================================================

let mockStep = 0;
const mockRewardHistory: RewardCurves = {
  test_pass_reward: [],
  type_check_reward: [],
  lint_reward: [],
  coverage_reward: [],
  circuit_breaker_reward: [],
  composite_reward: [],
};
const mockKLHistory: RewardDataPoint[] = [];
const mockHumanEvalHistory: RewardDataPoint[] = [];
const mockMBPPHistory: RewardDataPoint[] = [];
const mockHoloScriptHistory: RewardDataPoint[] = [];

function generateMockData(endpoint: string): unknown {
  mockStep += 10;

  switch (endpoint) {
    case 'metrics':
      return generateMockMetrics();
    case 'rewards':
      return generateMockRewards();
    case 'completions':
      return generateMockCompletions();
    case 'kl':
      return generateMockKL();
    case 'oplora':
      return generateMockOPLoRA();
    default:
      return {};
  }
}

function generateMockMetrics(): TrainingMetrics {
  const progress = Math.min(mockStep / 10000, 1.0);
  return {
    step: mockStep,
    total_steps: 10000,
    epoch: mockStep > 5000 ? 2 : 1,
    total_epochs: 2,
    steps_per_sec: 1.2 + Math.random() * 0.4,
    eta_minutes: Math.round((10000 - mockStep) / (1.2 * 60)),
    elapsed_minutes: Math.round(mockStep / (1.2 * 60)),
    gpu_utilization: 92 + Math.round(Math.random() * 6),
    gpu_memory_used: 22.4 + Math.random() * 0.8,
    gpu_memory_total: 24.0,
    gpu_temperature: 68 + Math.round(Math.random() * 8),
    learning_rate: 0.0002 * Math.cos((progress * Math.PI) / 2), // cosine decay
    is_training: true,
  };
}

function generateMockRewards(): RewardCurves {
  const progress = Math.min(mockStep / 10000, 1.0);

  // Reward curves climb with training progress, with noise
  const addPoint = (
    arr: RewardDataPoint[],
    baseProgress: number,
    ceiling: number,
    noise: number
  ) => {
    const value = Math.min(
      ceiling,
      baseProgress * ceiling + (Math.random() - 0.5) * noise
    );
    arr.push({ step: mockStep, value: Math.max(0, value) });
    // Keep last 200 points
    if (arr.length > 200) arr.shift();
  };

  addPoint(mockRewardHistory.test_pass_reward, progress, 0.85, 0.08);
  addPoint(mockRewardHistory.type_check_reward, progress, 0.92, 0.05);
  addPoint(mockRewardHistory.lint_reward, progress, 0.95, 0.04);
  addPoint(mockRewardHistory.coverage_reward, progress, 0.78, 0.1);
  addPoint(mockRewardHistory.circuit_breaker_reward, progress, 0.98, 0.03);

  // Composite is weighted sum
  const lastIdx = mockRewardHistory.test_pass_reward.length - 1;
  const compositeValue =
    (mockRewardHistory.test_pass_reward[lastIdx]?.value ?? 0) * 0.40 +
    (mockRewardHistory.type_check_reward[lastIdx]?.value ?? 0) * 0.20 +
    (mockRewardHistory.lint_reward[lastIdx]?.value ?? 0) * 0.15 +
    (mockRewardHistory.coverage_reward[lastIdx]?.value ?? 0) * 0.15 +
    (mockRewardHistory.circuit_breaker_reward[lastIdx]?.value ?? 0) * 0.10;

  mockRewardHistory.composite_reward.push({ step: mockStep, value: compositeValue });
  if (mockRewardHistory.composite_reward.length > 200) {
    mockRewardHistory.composite_reward.shift();
  }

  return { ...mockRewardHistory };
}

function generateMockCompletions(): CompletionsResponse {
  const prompts = [
    'Write a HoloScript composition that creates a floating gallery with 5 picture frames',
    'Implement a portal system that connects two spatial groups in HoloScript',
    'Create a physics playground with grabbable spheres and a ramp',
    'Generate a VR meeting room with a holographic table and seats for 6 agents',
    'Build an NPC shopkeeper with dialogue tree and inventory system',
  ];

  const completions: CompletionSample[] = prompts.map((prompt, i) => ({
    prompt,
    best_completion: `composition "Gallery_${i}" {\n  environment { skybox: "studio" }\n  spatial_group "Frames" {\n    for j in range(5) {\n      object "Frame_\${j}" {\n        mesh: "plane"\n        position: [j * 2 - 4, 2, 0]\n        material: { color: "#FFFFFF" }\n      }\n    }\n  }\n}`,
    best_score: 0.75 + Math.random() * 0.2,
    worst_completion: `// incomplete or malformed code\ncomposition "Bad" {\n  object { mesh: "cube" }\n}`,
    worst_score: 0.1 + Math.random() * 0.3,
    breakdown: {
      test_pass: 0.6 + Math.random() * 0.3,
      type_check: 0.7 + Math.random() * 0.25,
      lint: 0.8 + Math.random() * 0.15,
      coverage: 0.5 + Math.random() * 0.3,
      circuit_breaker: 0.9 + Math.random() * 0.1,
    },
    step: mockStep - (prompts.length - i) * 50,
    group_size: 8,
  }));

  return { recent_completions: completions };
}

function generateMockKL(): KLDivergenceData {
  const progress = Math.min(mockStep / 10000, 1.0);

  // KL tends to rise during training, with some oscillation
  const klValue = 0.01 + progress * 0.025 + (Math.random() - 0.5) * 0.008;
  mockKLHistory.push({ step: mockStep, value: Math.max(0, klValue) });
  if (mockKLHistory.length > 200) mockKLHistory.shift();

  return {
    current_kl: klValue,
    kl_history: [...mockKLHistory],
  };
}

function generateMockOPLoRA(): OPLoRAMetrics {
  const progress = Math.min(mockStep / 10000, 1.0);

  // HumanEval stays near baseline with slight variation
  const humanEval = 33.5 + (Math.random() - 0.5) * 3;
  mockHumanEvalHistory.push({ step: mockStep, value: humanEval });
  if (mockHumanEvalHistory.length > 100) mockHumanEvalHistory.shift();

  // MBPP similarly stable
  const mbpp = 45.2 + (Math.random() - 0.5) * 3;
  mockMBPPHistory.push({ step: mockStep, value: mbpp });
  if (mockMBPPHistory.length > 100) mockMBPPHistory.shift();

  // HoloScript-specific improves with training
  const holoScript = 20 + progress * 60 + (Math.random() - 0.5) * 8;
  mockHoloScriptHistory.push({ step: mockStep, value: Math.min(100, holoScript) });
  if (mockHoloScriptHistory.length > 100) mockHoloScriptHistory.shift();

  return {
    orthogonal_satisfaction: 0.95 + Math.random() * 0.04,
    humaneval_score: humanEval,
    humaneval_history: [...mockHumanEvalHistory],
    mbpp_score: mbpp,
    mbpp_history: [...mockMBPPHistory],
    holoscript_score: holoScript,
    holoscript_history: [...mockHoloScriptHistory],
  };
}

// ============================================================================
// FACTORY: Create pre-configured data service for the GRPO dashboard
// ============================================================================

/**
 * Creates a fully configured GRPODataService with all polling endpoints
 * registered for the GRPO Training Dashboard.
 *
 * @param baseUrl - Training server base URL (default: http://localhost:8080)
 * @param useMock - Use mock data generators instead of real API calls
 * @returns Configured GRPODataService ready to start
 *
 * @example
 * ```ts
 * const service = createGRPODashboardService('http://localhost:8080');
 *
 * // Wire up callbacks to your dashboard state
 * service.registerEndpoint('metrics', '/api/training/metrics', 5000, (data) => {
 *   updateDashboardState(data);
 * });
 *
 * service.startAll();
 *
 * // Later: adjust polling or stop
 * service.updateInterval('metrics', 2000); // faster polling
 * service.stopAll();
 * ```
 */
export function createGRPODashboardService(
  baseUrl = 'http://localhost:8080',
  useMock = false
): GRPODataService {
  const service = new GRPODataService(baseUrl, useMock);

  // Register all 5 polling endpoints matching the .holo data_source blocks
  service.registerEndpoint<TrainingMetrics>(
    'metrics',
    '/api/training/metrics',
    5000,
    () => {} // Placeholder - caller should re-register with their callback
  );

  service.registerEndpoint<RewardCurves>(
    'rewards',
    '/api/training/rewards',
    5000,
    () => {}
  );

  service.registerEndpoint<CompletionsResponse>(
    'completions',
    '/api/training/completions',
    10000,
    () => {}
  );

  service.registerEndpoint<KLDivergenceData>(
    'kl',
    '/api/training/kl-divergence',
    5000,
    () => {}
  );

  service.registerEndpoint<OPLoRAMetrics>(
    'oplora',
    '/api/training/oplora',
    30000,
    () => {}
  );

  return service;
}

// ============================================================================
// API ENDPOINT SPECIFICATION (for implementing the training server)
// ============================================================================

/**
 * Required REST API endpoints for the GRPO Training Dashboard:
 *
 * GET  /api/training/metrics        -> TrainingMetrics        (poll: 5s)
 * GET  /api/training/rewards        -> RewardCurves           (poll: 5s)
 * GET  /api/training/completions    -> CompletionsResponse    (poll: 10s)
 * GET  /api/training/kl-divergence  -> KLDivergenceData       (poll: 5s)
 * GET  /api/training/oplora         -> OPLoRAMetrics           (poll: 30s)
 *
 * POST /api/training/pause          -> { success: boolean }
 * POST /api/training/resume         -> { success: boolean }
 * POST /api/training/benchmark      -> { success: boolean, job_id: string }
 * PATCH /api/training/config        -> { success: boolean }
 *       body: TrainingConfigUpdate
 */
