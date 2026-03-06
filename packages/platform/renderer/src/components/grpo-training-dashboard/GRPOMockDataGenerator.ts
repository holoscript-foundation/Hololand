/**
 * GRPO Mock Data Generator
 *
 * Generates realistic GRPO training metrics for development and demo mode
 * when no actual training run is active. Produces data that mimics a real
 * training trajectory:
 *   - Reward signals that gradually improve with realistic noise
 *   - KL divergence that oscillates around the beta threshold
 *   - Completion samples with plausible code completions
 *   - OPLoRA constraint values that occasionally spike
 *   - GPU stats with realistic utilization patterns
 *   - Training progress that advances at consistent rate
 *
 * Usage with useGRPOData hook:
 * ```tsx
 * const generator = new GRPOMockDataGenerator({ totalSteps: 10000 });
 * generator.start(); // begins emitting events
 *
 * // In the hook config:
 * const [state, actions] = useGRPOData({
 *   mockGenerator: generator,
 * });
 * ```
 *
 * Usage with GRPOEventEmitter (server-side):
 * ```ts
 * const emitter = new GRPOEventEmitter(wss);
 * const generator = new GRPOMockDataGenerator({ totalSteps: 10000 });
 * generator.start((event) => {
 *   switch (event.type) {
 *     case 'reward': emitter.emitReward(event.point); break;
 *     case 'kl': emitter.emitKL(event.point); break;
 *     // ... etc
 *   }
 * });
 * ```
 *
 * @module grpo-training-dashboard/GRPOMockDataGenerator
 */

import type {
  RewardDataPoint,
  RewardSignalName,
  KLDataPoint,
  CompletionGroup,
  CompletionSample,
  ForgettingMetrics,
  GPUStats,
  TrainingParams,
  TrainingProgress,
  TrainingStatus,
} from './types';

import type { GRPOEvent } from './GRPOEventEmitter';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface GRPOMockDataGeneratorConfig {
  /** Total training steps to simulate (default: 10000) */
  totalSteps?: number;
  /** Interval between emitted events in ms (default: 1000) */
  intervalMs?: number;
  /** Steps to advance per interval (default: 10) */
  stepsPerInterval?: number;
  /** Starting step (default: 0) */
  startStep?: number;
  /** Initial temperature (default: 0.7) */
  initialTemperature?: number;
  /** Initial beta (default: 0.04) */
  initialBeta?: number;
  /** Emit completion groups every N steps (default: 200) */
  completionEveryNSteps?: number;
  /** Emit forgetting metrics every N steps (default: 500) */
  forgettingEveryNSteps?: number;
  /** Emit GPU stats every N steps (default: 50) */
  gpuEveryNSteps?: number;
  /** Random seed for reproducible runs (default: uses Math.random) */
  seed?: number;
}

/**
 * Callback for mock event emission.
 */
export type MockEventCallback = (event: GRPOEvent) => void;

// =============================================================================
// SEEDED RANDOM
// =============================================================================

/**
 * Simple seeded pseudo-random number generator (xoshiro128**).
 * Falls back to Math.random when no seed is provided.
 */
function createRandom(seed?: number): () => number {
  if (seed === undefined) return Math.random;

  // Simple seed-based PRNG (mulberry32)
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// =============================================================================
// SAMPLE CODE SNIPPETS (for completion generation)
// =============================================================================

const SAMPLE_PROMPTS = [
  'function fibonacci(n: number): number {',
  'function mergeSort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {',
  'class EventEmitter {\n  private listeners: Map<string, Function[]> = new Map();\n\n  on(event: string, listener: Function): void {',
  'function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {',
  'async function fetchWithRetry(url: string, retries: number = 3): Promise<Response> {',
  'function deepClone<T>(obj: T): T {',
  'function parseQueryString(qs: string): Record<string, string> {',
  'class LRUCache<K, V> {\n  constructor(private capacity: number) {}\n\n  get(key: K): V | undefined {',
  'function throttle(fn: Function, limit: number): Function {',
  'function flattenObject(obj: Record<string, any>, prefix: string = ""): Record<string, any> {',
];

const GOOD_COMPLETIONS = [
  '  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}',
  '  if (arr.length <= 1) return arr;\n  const mid = Math.floor(arr.length / 2);\n  const left = mergeSort(arr.slice(0, mid), compare);\n  const right = mergeSort(arr.slice(mid), compare);\n  return merge(left, right, compare);\n}',
  '    const existing = this.listeners.get(event) || [];\n    existing.push(listener);\n    this.listeners.set(event, existing);\n  }',
  '  let timer: ReturnType<typeof setTimeout> | null = null;\n  return ((...args: Parameters<T>) => {\n    if (timer) clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  }) as T;\n}',
  '  for (let i = 0; i < retries; i++) {\n    try {\n      const response = await fetch(url);\n      if (response.ok) return response;\n    } catch (err) {\n      if (i === retries - 1) throw err;\n    }\n    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));\n  }\n  throw new Error("Max retries exceeded");\n}',
  '  if (obj === null || typeof obj !== "object") return obj;\n  if (Array.isArray(obj)) return obj.map(deepClone) as T;\n  const result: any = {};\n  for (const key of Object.keys(obj)) result[key] = deepClone((obj as any)[key]);\n  return result as T;\n}',
  '  const params: Record<string, string> = {};\n  const pairs = qs.replace(/^\\?/, "").split("&");\n  for (const pair of pairs) {\n    const [key, value] = pair.split("=");\n    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || "");\n  }\n  return params;\n}',
  '    const node = this.cache.get(key);\n    if (!node) return undefined;\n    this.moveToFront(node);\n    return node.value;\n  }',
  '  let inThrottle = false;\n  return function(...args: any[]) {\n    if (!inThrottle) {\n      fn.apply(this, args);\n      inThrottle = true;\n      setTimeout(() => inThrottle = false, limit);\n    }\n  };\n}',
  '  const result: Record<string, any> = {};\n  for (const [key, value] of Object.entries(obj)) {\n    const newKey = prefix ? `${prefix}.${key}` : key;\n    if (typeof value === "object" && value !== null && !Array.isArray(value)) {\n      Object.assign(result, flattenObject(value, newKey));\n    } else {\n      result[newKey] = value;\n    }\n  }\n  return result;\n}',
];

const BAD_COMPLETIONS = [
  '  return n * fibonacci(n);\n}',
  '  return arr.sort();\n}',
  '    this.listeners = listener;\n  }',
  '  return fn;\n}',
  '  return await fetch(url);\n}',
  '  return obj;\n}',
  '  return qs;\n}',
  '    return this.cache[key];\n  }',
  '  return fn;\n}',
  '  return obj;\n}',
];

// =============================================================================
// MOCK DATA GENERATOR
// =============================================================================

export class GRPOMockDataGenerator {
  private readonly config: Required<GRPOMockDataGeneratorConfig>;
  private readonly random: () => number;

  private currentStep: number;
  private startTime: number = 0;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private callback: MockEventCallback | null = null;
  private running: boolean = false;

  // Internal state
  private temperature: number;
  private beta: number;
  private baseRewards: Record<RewardSignalName, number>;
  private humanEvalBaseline: number;
  private mbppBaseline: number;

  constructor(config?: GRPOMockDataGeneratorConfig) {
    this.config = {
      totalSteps: config?.totalSteps ?? 10000,
      intervalMs: config?.intervalMs ?? 1000,
      stepsPerInterval: config?.stepsPerInterval ?? 10,
      startStep: config?.startStep ?? 0,
      initialTemperature: config?.initialTemperature ?? 0.7,
      initialBeta: config?.initialBeta ?? 0.04,
      completionEveryNSteps: config?.completionEveryNSteps ?? 200,
      forgettingEveryNSteps: config?.forgettingEveryNSteps ?? 500,
      gpuEveryNSteps: config?.gpuEveryNSteps ?? 50,
      seed: config?.seed ?? undefined as unknown as number,
    };

    this.random = createRandom(config?.seed);
    this.currentStep = this.config.startStep;
    this.temperature = this.config.initialTemperature;
    this.beta = this.config.initialBeta;

    // Starting reward baselines (will improve over training)
    this.baseRewards = {
      testPassReward: 0.35,
      typeCheckReward: 0.45,
      lintReward: 0.55,
      coverageReward: 0.30,
      circuitBreakerReward: 0.70,
      composite: 0.40,
    };

    this.humanEvalBaseline = 0.68;
    this.mbppBaseline = 0.55;
  }

  // ---------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------

  /**
   * Start generating mock data at the configured interval.
   * Each interval advances the training step and emits events.
   */
  start(callback?: MockEventCallback): void {
    if (this.running) return;

    this.running = true;
    this.callback = callback ?? null;
    this.startTime = Date.now();

    // Emit initial status
    this.emit({ type: 'status', status: 'running' as TrainingStatus });
    this.emit({
      type: 'params',
      params: { temperature: this.temperature, beta: this.beta },
    });

    this.intervalHandle = setInterval(() => {
      this.tick();
    }, this.config.intervalMs);
  }

  /**
   * Stop generating mock data.
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Whether the generator is currently running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the current training step.
   */
  get step(): number {
    return this.currentStep;
  }

  // ---------------------------------------------------
  // TICK (main simulation loop)
  // ---------------------------------------------------

  /**
   * Advance one interval's worth of training steps and emit events.
   * Can be called manually for testing (step-by-step mode).
   */
  tick(): void {
    this.currentStep += this.config.stepsPerInterval;

    if (this.currentStep >= this.config.totalSteps) {
      this.currentStep = this.config.totalSteps;
      this.emit({ type: 'status', status: 'completed' as TrainingStatus });
      this.stop();
      return;
    }

    // Progress fraction (0 to 1)
    const frac = this.currentStep / this.config.totalSteps;

    // Always emit: reward, kl, progress
    this.emitRewardEvent(frac);
    this.emitKLEvent(frac);
    this.emitProgressEvent();

    // Periodic events
    if (this.currentStep % this.config.gpuEveryNSteps === 0) {
      this.emitGPUEvent();
    }

    if (this.currentStep % this.config.completionEveryNSteps === 0) {
      this.emitCompletionEvent(frac);
    }

    if (this.currentStep % this.config.forgettingEveryNSteps === 0) {
      this.emitForgettingEvent(frac);
    }
  }

  // ---------------------------------------------------
  // EVENT GENERATORS
  // ---------------------------------------------------

  private emitRewardEvent(frac: number): void {
    // Rewards improve along a noisy sigmoid curve
    const improvement = this.sigmoid(frac, 0.5, 8);
    const noise = () => (this.random() - 0.5) * 0.04;

    const rewards: Record<RewardSignalName, number> = {
      testPassReward: this.clamp(this.baseRewards.testPassReward + improvement * 0.55 + noise()),
      typeCheckReward: this.clamp(this.baseRewards.typeCheckReward + improvement * 0.45 + noise()),
      lintReward: this.clamp(this.baseRewards.lintReward + improvement * 0.35 + noise()),
      coverageReward: this.clamp(this.baseRewards.coverageReward + improvement * 0.60 + noise()),
      circuitBreakerReward: this.clamp(this.baseRewards.circuitBreakerReward + improvement * 0.20 + noise()),
      composite: 0, // computed below
    };

    // Composite is weighted sum
    rewards.composite = this.clamp(
      rewards.testPassReward * 0.40 +
      rewards.typeCheckReward * 0.20 +
      rewards.lintReward * 0.15 +
      rewards.coverageReward * 0.15 +
      rewards.circuitBreakerReward * 0.10,
    );

    const point: RewardDataPoint = { step: this.currentStep, rewards };
    this.emit({ type: 'reward', point });
  }

  private emitKLEvent(frac: number): void {
    // KL divergence starts low, increases mid-training, then stabilizes
    const baseKL = 0.015 + 0.025 * Math.sin(frac * Math.PI);
    const noise = (this.random() - 0.5) * 0.008;
    const kl = Math.max(0, baseKL + noise);

    const point: KLDataPoint = {
      step: this.currentStep,
      kl,
      beta: this.beta,
    };
    this.emit({ type: 'kl', point });
  }

  private emitProgressEvent(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const stepsPerSecond = this.currentStep / Math.max(elapsed, 1);
    const remaining = (this.config.totalSteps - this.currentStep) / Math.max(stepsPerSecond, 0.1);

    const progress: TrainingProgress = {
      currentStep: this.currentStep,
      totalSteps: this.config.totalSteps,
      elapsedSeconds: Math.round(elapsed),
      estimatedRemainingSeconds: Math.round(remaining),
    };
    this.emit({ type: 'progress', progress });
  }

  private emitGPUEvent(): void {
    const stats: GPUStats = {
      gpuUtilization: 85 + this.random() * 12,
      memoryUsedGB: 18 + this.random() * 4,
      memoryTotalGB: 24,
      temperatureCelsius: 68 + this.random() * 12,
    };
    this.emit({ type: 'gpu', stats });
  }

  private emitCompletionEvent(frac: number): void {
    const idx = Math.floor(this.random() * SAMPLE_PROMPTS.length);
    const prompt = SAMPLE_PROMPTS[idx];

    const improvement = this.sigmoid(frac, 0.5, 8);
    const bestScore = 0.50 + improvement * 0.45 + this.random() * 0.05;
    const worstScore = 0.10 + improvement * 0.15 + this.random() * 0.10;

    const best = this.createSample(`best-${this.currentStep}`, prompt, GOOD_COMPLETIONS[idx], bestScore);
    const worst = this.createSample(`worst-${this.currentStep}`, prompt, BAD_COMPLETIONS[idx], worstScore);

    const group: CompletionGroup = {
      step: this.currentStep,
      prompt,
      best,
      worst,
    };
    this.emit({ type: 'completion', group });
  }

  private emitForgettingEvent(frac: number): void {
    // OPLoRA constraint slowly increases
    const constraintValue = 0.005 + frac * 0.03 + (this.random() - 0.5) * 0.005;
    const constraintThreshold = 0.05;

    // Benchmark scores slowly degrade (realistic forgetting)
    const humanEvalDelta = -frac * 0.03 + (this.random() - 0.5) * 0.01;
    const mbppDelta = -frac * 0.02 + (this.random() - 0.5) * 0.01;

    const currentHumanEval = this.humanEvalBaseline + humanEvalDelta;
    const currentMBPP = this.mbppBaseline + mbppDelta;

    const forgettingAlert =
      currentHumanEval < this.humanEvalBaseline * 0.98 ||
      currentMBPP < this.mbppBaseline * 0.98;

    const metrics: ForgettingMetrics = {
      oplora: {
        constraintValue: Math.max(0, constraintValue),
        constraintThreshold,
      },
      benchmarks: [
        {
          step: this.currentStep,
          humanEval: currentHumanEval,
          mbpp: currentMBPP,
        },
      ],
      humanEvalBaseline: this.humanEvalBaseline,
      mbppBaseline: this.mbppBaseline,
      forgettingAlert,
    };
    this.emit({ type: 'forgetting', metrics });
  }

  // ---------------------------------------------------
  // HELPERS
  // ---------------------------------------------------

  private createSample(
    id: string,
    prompt: string,
    completion: string,
    totalScore: number,
  ): CompletionSample {
    return {
      id,
      step: this.currentStep,
      prompt,
      completion,
      totalScore,
      rewardBreakdown: {
        testPassReward: totalScore * 0.40,
        typeCheckReward: totalScore * 0.20,
        lintReward: totalScore * 0.15,
        coverageReward: totalScore * 0.15,
        circuitBreakerReward: totalScore * 0.10,
        composite: totalScore,
      },
    };
  }

  private emit(event: GRPOEvent): void {
    if (this.callback) {
      this.callback(event);
    }
  }

  /** Sigmoid function for smooth improvement curves. */
  private sigmoid(x: number, midpoint: number, steepness: number): number {
    return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
  }

  /** Clamp value between 0 and 1. */
  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  // ---------------------------------------------------
  // SNAPSHOT (for initial hydration)
  // ---------------------------------------------------

  /**
   * Generate a full initial snapshot with N pre-computed steps.
   * Useful for immediately populating the dashboard with historical data
   * without waiting for real-time events.
   */
  generateSnapshot(steps: number = 100): GRPOEvent {
    const rewardHistory: RewardDataPoint[] = [];
    const klHistory: KLDataPoint[] = [];
    const completionGroups: CompletionGroup[] = [];

    for (let i = 0; i < steps; i++) {
      const step = Math.floor((i / steps) * this.config.totalSteps * 0.3);
      const frac = step / this.config.totalSteps;

      const improvement = this.sigmoid(frac, 0.5, 8);
      const noise = () => (this.random() - 0.5) * 0.04;

      const rewards: Record<RewardSignalName, number> = {
        testPassReward: this.clamp(this.baseRewards.testPassReward + improvement * 0.55 + noise()),
        typeCheckReward: this.clamp(this.baseRewards.typeCheckReward + improvement * 0.45 + noise()),
        lintReward: this.clamp(this.baseRewards.lintReward + improvement * 0.35 + noise()),
        coverageReward: this.clamp(this.baseRewards.coverageReward + improvement * 0.60 + noise()),
        circuitBreakerReward: this.clamp(this.baseRewards.circuitBreakerReward + improvement * 0.20 + noise()),
        composite: 0,
      };
      rewards.composite = this.clamp(
        rewards.testPassReward * 0.40 +
        rewards.typeCheckReward * 0.20 +
        rewards.lintReward * 0.15 +
        rewards.coverageReward * 0.15 +
        rewards.circuitBreakerReward * 0.10,
      );

      rewardHistory.push({ step, rewards });

      const baseKL = 0.015 + 0.025 * Math.sin(frac * Math.PI);
      klHistory.push({
        step,
        kl: Math.max(0, baseKL + (this.random() - 0.5) * 0.008),
        beta: this.beta,
      });

      if (i % 20 === 0 && i > 0) {
        const idx = Math.floor(this.random() * SAMPLE_PROMPTS.length);
        const bestScore = 0.50 + improvement * 0.45;
        const worstScore = 0.10 + improvement * 0.15;
        completionGroups.push({
          step,
          prompt: SAMPLE_PROMPTS[idx],
          best: this.createSample(`snap-best-${step}`, SAMPLE_PROMPTS[idx], GOOD_COMPLETIONS[idx], bestScore),
          worst: this.createSample(`snap-worst-${step}`, SAMPLE_PROMPTS[idx], BAD_COMPLETIONS[idx], worstScore),
        });
      }
    }

    return {
      type: 'snapshot',
      rewardHistory,
      klHistory,
      completionGroups,
      trainingStatus: 'running' as TrainingStatus,
      trainingParams: { temperature: this.temperature, beta: this.beta },
      progress: {
        currentStep: this.currentStep,
        totalSteps: this.config.totalSteps,
        elapsedSeconds: 0,
        estimatedRemainingSeconds: 0,
      },
      gpuStats: {
        gpuUtilization: 88,
        memoryUsedGB: 19.2,
        memoryTotalGB: 24,
        temperatureCelsius: 72,
      },
      connected: true,
      lastUpdateTimestamp: Date.now(),
    };
  }
}
