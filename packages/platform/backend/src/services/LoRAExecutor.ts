/**
 * @hololand/backend — LoRAExecutor
 *
 * Wraps LoRA fine-tuning execution. In-process simulation for testing,
 * with hooks for connecting to real training backends (Unsloth, Axolotl,
 * Hugging Face Trainer, etc.).
 *
 * Responsibilities:
 *   - Prepare adapter configuration
 *   - Launch training (simulated or real CLI)
 *   - Poll progress via callbacks
 *   - Manage checkpoint downloads
 *
 * Usage:
 *   const executor = new LoRAExecutor({ backend: 'simulated' });
 *   const run = executor.prepareRun(jobConfig, datasetPath);
 *   await executor.launch(run.id);
 *   const status = executor.getStatus(run.id);
 */

// ============================================================================
// Types
// ============================================================================

export type TrainingBackend = 'simulated' | 'local' | 'cloud';
export type RunStatus = 'prepared' | 'launching' | 'training' | 'completed' | 'failed' | 'cancelled';

export interface LoRAConfig {
  /** LoRA rank. Default: 16 */
  rank: number;
  /** LoRA alpha. Default: 32 */
  alpha: number;
  /** Dropout. Default: 0.05 */
  dropout: number;
  /** Target modules. Default: ['q_proj', 'v_proj'] */
  targetModules: string[];
  /** Use gradient checkpointing. Default: true */
  gradientCheckpointing: boolean;
  /** Use 4-bit quantization. Default: true */
  use4bit: boolean;
}

export interface TrainingRunConfig {
  /** Base model identifier. */
  baseModel: string;
  /** Path or content of training dataset. */
  datasetPath: string;
  /** Number of epochs. */
  epochs: number;
  /** Learning rate. */
  learningRate: number;
  /** Batch size. */
  batchSize: number;
  /** Max sequence length. */
  maxSeqLength: number;
  /** Warmup steps. */
  warmupSteps: number;
  /** Weight decay. */
  weightDecay: number;
  /** LoRA config. */
  lora: LoRAConfig;
  /** Output directory for checkpoints. */
  outputDir: string;
  /** Custom run name. */
  name?: string;
}

export interface TrainingRun {
  id: string;
  config: TrainingRunConfig;
  status: RunStatus;
  currentEpoch: number;
  currentStep: number;
  totalSteps: number;
  trainingLoss: number;
  validationLoss: number;
  learningRate: number;
  checkpoints: CheckpointInfo[];
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  error?: string;
  metrics: TrainingMetrics;
}

export interface CheckpointInfo {
  id: string;
  epoch: number;
  step: number;
  trainingLoss: number;
  validationLoss: number;
  path: string;
  sizeMB: number;
  createdAt: number;
}

export interface TrainingMetrics {
  totalTokensProcessed: number;
  peakMemoryMB: number;
  averageStepMs: number;
  estimatedRemainingMs: number;
  throughputTokensPerSec: number;
}

export interface ExecutorConfig {
  /** Training backend. Default: 'simulated' */
  backend?: TrainingBackend;
  /** Default LoRA rank. Default: 16 */
  defaultLoraRank?: number;
  /** Default LoRA alpha. Default: 32 */
  defaultLoraAlpha?: number;
  /** Checkpoint save interval (steps). Default: 500 */
  checkpointInterval?: number;
  /** Log interval (steps). Default: 10 */
  logInterval?: number;
  /** Simulation speed multiplier. Default: 100 (100x faster) */
  simulationSpeed?: number;
}

export type ProgressCallback = (run: TrainingRun) => void;

// ============================================================================
// LoRAExecutor
// ============================================================================

export class LoRAExecutor {
  private config: Required<ExecutorConfig>;
  private runs: Map<string, TrainingRun> = new Map();
  private progressCallbacks: Map<string, ProgressCallback[]> = new Map();
  private activeTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private runCounter = 0;

  constructor(config: ExecutorConfig = {}) {
    this.config = {
      backend: config.backend ?? 'simulated',
      defaultLoraRank: config.defaultLoraRank ?? 16,
      defaultLoraAlpha: config.defaultLoraAlpha ?? 32,
      checkpointInterval: config.checkpointInterval ?? 500,
      logInterval: config.logInterval ?? 10,
      simulationSpeed: config.simulationSpeed ?? 100,
    };
  }

  // --------------------------------------------------------------------------
  // Run Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Prepare a new training run with configuration.
   */
  prepareRun(config: Partial<TrainingRunConfig> & { baseModel: string; datasetPath: string }): TrainingRun {
    const id = `lora_run_${++this.runCounter}_${Date.now()}`;

    const loraConfig: LoRAConfig = {
      rank: this.config.defaultLoraRank,
      alpha: this.config.defaultLoraAlpha,
      dropout: 0.05,
      targetModules: ['q_proj', 'v_proj'],
      gradientCheckpointing: true,
      use4bit: true,
      ...config.lora,
    };

    const fullConfig: TrainingRunConfig = {
      baseModel: config.baseModel,
      datasetPath: config.datasetPath,
      epochs: config.epochs ?? 3,
      learningRate: config.learningRate ?? 2e-5,
      batchSize: config.batchSize ?? 4,
      maxSeqLength: config.maxSeqLength ?? 2048,
      warmupSteps: config.warmupSteps ?? 100,
      weightDecay: config.weightDecay ?? 0.01,
      lora: loraConfig,
      outputDir: config.outputDir ?? `/tmp/lora-checkpoints/${id}`,
      name: config.name ?? `lora-${id}`,
    };

    // Estimate total steps (simulation assumes 1000 examples)
    const estimatedExamples = 1000;
    const stepsPerEpoch = Math.ceil(estimatedExamples / fullConfig.batchSize);
    const totalSteps = stepsPerEpoch * fullConfig.epochs;

    const run: TrainingRun = {
      id,
      config: fullConfig,
      status: 'prepared',
      currentEpoch: 0,
      currentStep: 0,
      totalSteps,
      trainingLoss: 0,
      validationLoss: 0,
      learningRate: fullConfig.learningRate,
      checkpoints: [],
      startedAt: null,
      completedAt: null,
      createdAt: Date.now(),
      metrics: {
        totalTokensProcessed: 0,
        peakMemoryMB: 0,
        averageStepMs: 0,
        estimatedRemainingMs: 0,
        throughputTokensPerSec: 0,
      },
    };

    this.runs.set(id, run);
    return run;
  }

  /**
   * Launch a prepared training run.
   * In simulated mode, runs a timer that advances training state.
   */
  async launch(runId: string): Promise<TrainingRun> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    if (run.status !== 'prepared') throw new Error(`Run ${runId} is ${run.status}, expected 'prepared'`);

    run.status = 'launching';
    run.startedAt = Date.now();

    if (this.config.backend === 'simulated') {
      run.status = 'training';
      this.startSimulation(run);
    } else {
      // For 'local' or 'cloud' backends, this would launch CLI or API call
      run.status = 'training';
    }

    return run;
  }

  /**
   * Cancel a running training run.
   */
  cancel(runId: string): TrainingRun {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);

    if (run.status === 'training' || run.status === 'launching') {
      run.status = 'cancelled';
      run.completedAt = Date.now();
      this.stopSimulation(runId);
    }

    return run;
  }

  /**
   * Get current status of a training run.
   */
  getStatus(runId: string): TrainingRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * List all training runs.
   */
  listRuns(): TrainingRun[] {
    return Array.from(this.runs.values());
  }

  /**
   * Register a progress callback for a run.
   */
  onProgress(runId: string, callback: ProgressCallback): void {
    const cbs = this.progressCallbacks.get(runId) || [];
    cbs.push(callback);
    this.progressCallbacks.set(runId, cbs);
  }

  /**
   * Get checkpoints for a run.
   */
  getCheckpoints(runId: string): CheckpointInfo[] {
    return this.runs.get(runId)?.checkpoints ?? [];
  }

  /**
   * Get the best checkpoint (lowest validation loss).
   */
  getBestCheckpoint(runId: string): CheckpointInfo | undefined {
    const checkpoints = this.getCheckpoints(runId);
    if (checkpoints.length === 0) return undefined;
    return checkpoints.reduce((best, cp) =>
      cp.validationLoss < best.validationLoss ? cp : best
    );
  }

  /**
   * Build a LoRA adapter config suitable for Unsloth/Axolotl.
   */
  buildAdapterConfig(runId: string): Record<string, unknown> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);

    return {
      model_name_or_path: run.config.baseModel,
      output_dir: run.config.outputDir,
      num_train_epochs: run.config.epochs,
      per_device_train_batch_size: run.config.batchSize,
      learning_rate: run.config.learningRate,
      warmup_steps: run.config.warmupSteps,
      weight_decay: run.config.weightDecay,
      max_seq_length: run.config.maxSeqLength,
      lora_r: run.config.lora.rank,
      lora_alpha: run.config.lora.alpha,
      lora_dropout: run.config.lora.dropout,
      lora_target_modules: run.config.lora.targetModules,
      gradient_checkpointing: run.config.lora.gradientCheckpointing,
      load_in_4bit: run.config.lora.use4bit,
      fp16: true,
      logging_steps: this.config.logInterval,
      save_steps: this.config.checkpointInterval,
      report_to: 'none',
    };
  }

  /**
   * Stop all simulations and clean up.
   */
  dispose(): void {
    for (const [id] of this.activeTimers) {
      this.stopSimulation(id);
    }
    this.runs.clear();
    this.progressCallbacks.clear();
  }

  // --------------------------------------------------------------------------
  // Simulation
  // --------------------------------------------------------------------------

  private startSimulation(run: TrainingRun): void {
    const stepsPerTick = Math.max(1, Math.floor(this.config.simulationSpeed / 10));
    const intervalMs = 100; // tick every 100ms

    const timer = setInterval(() => {
      if (run.status !== 'training') {
        this.stopSimulation(run.id);
        return;
      }

      // Advance steps
      run.currentStep = Math.min(run.totalSteps, run.currentStep + stepsPerTick);
      run.currentEpoch = Math.floor(run.currentStep / (run.totalSteps / run.config.epochs));

      // Simulate loss curve (exponential decay with noise)
      const progress = run.currentStep / run.totalSteps;
      run.trainingLoss = 2.5 * Math.exp(-3 * progress) + 0.1 + (Math.random() * 0.05);
      run.validationLoss = run.trainingLoss * (1.1 + Math.random() * 0.1);

      // Update learning rate (linear warmup then cosine decay)
      if (run.currentStep < run.config.warmupSteps) {
        run.learningRate = run.config.learningRate * (run.currentStep / run.config.warmupSteps);
      } else {
        const decayProgress = (run.currentStep - run.config.warmupSteps) / (run.totalSteps - run.config.warmupSteps);
        run.learningRate = run.config.learningRate * 0.5 * (1 + Math.cos(Math.PI * decayProgress));
      }

      // Update metrics
      run.metrics.totalTokensProcessed = run.currentStep * run.config.batchSize * run.config.maxSeqLength;
      run.metrics.peakMemoryMB = 8000 + Math.random() * 2000;
      run.metrics.averageStepMs = 200 + Math.random() * 50;
      run.metrics.estimatedRemainingMs = (run.totalSteps - run.currentStep) * run.metrics.averageStepMs;
      run.metrics.throughputTokensPerSec = (run.config.batchSize * run.config.maxSeqLength) / (run.metrics.averageStepMs / 1000);

      // Checkpoint saves
      if (run.currentStep > 0 && run.currentStep % this.config.checkpointInterval === 0) {
        const checkpoint: CheckpointInfo = {
          id: `ckpt_${run.id}_step${run.currentStep}`,
          epoch: run.currentEpoch,
          step: run.currentStep,
          trainingLoss: run.trainingLoss,
          validationLoss: run.validationLoss,
          path: `${run.config.outputDir}/checkpoint-${run.currentStep}`,
          sizeMB: 50 + Math.random() * 200,
          createdAt: Date.now(),
        };
        run.checkpoints.push(checkpoint);
      }

      // Notify progress
      const cbs = this.progressCallbacks.get(run.id) || [];
      for (const cb of cbs) {
        try { cb(run); } catch { /* ignore */ }
      }

      // Check completion
      if (run.currentStep >= run.totalSteps) {
        run.status = 'completed';
        run.completedAt = Date.now();
        this.stopSimulation(run.id);
      }
    }, intervalMs);

    this.activeTimers.set(run.id, timer);
  }

  private stopSimulation(runId: string): void {
    const timer = this.activeTimers.get(runId);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(runId);
    }
  }
}
