/**
 * @hololand/backend — BrittneyFineTuneService
 *
 * Manages the Brittney v5 fine-tuning pipeline: dataset validation,
 * training execution, checkpoint management, evaluation, and
 * model promotion. Transport-agnostic — integrates with LobbyServer
 * via message handlers.
 *
 * Architecture:
 *   Training Data (JSONL / Alpaca / ShareGPT / RLHF)
 *       ↓
 *   BrittneyFineTuneService
 *       ├── Dataset validation (format, schema, dedup, quality)
 *       ├── Training job management (create, start, stop, resume)
 *       ├── Checkpoint tracking (epoch, metrics, size)
 *       ├── Evaluation pipeline (benchmark prompts, scoring)
 *       └── Model promotion (staging → production, rollback)
 *
 * Usage:
 *   const fts = new BrittneyFineTuneService({ maxConcurrentJobs: 2 });
 *   fts.start();
 *
 *   const ds = fts.createDataset({ name: 'holoscript-v5', format: 'alpaca' });
 *   fts.addExamples(ds.id, examples);
 *   fts.validateDataset(ds.id);
 *
 *   const job = fts.createJob({ datasetId: ds.id, baseModel: 'brittney-v4' });
 *   fts.startJob(job.id);
 *
 *   // When training completes:
 *   const eval = fts.evaluate(job.id, benchmarkPrompts);
 *   fts.promoteModel(job.id, 'production');
 */

// ============================================================================
// Types
// ============================================================================

export type DatasetFormat = 'alpaca' | 'sharegpt' | 'rlhf' | 'completion' | 'custom';
export type DatasetStatus = 'draft' | 'validating' | 'valid' | 'invalid' | 'archived';
export type JobStatus = 'pending' | 'preparing' | 'training' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type ModelStage = 'checkpoint' | 'staging' | 'production' | 'retired';
export type EvalStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface TrainingExample {
  /** Unique example ID. */
  id: string;
  /** Input prompt or instruction. */
  instruction: string;
  /** Optional context/input for the instruction. */
  input?: string;
  /** Expected output/response. */
  output: string;
  /** Optional system prompt. */
  system?: string;
  /** Difficulty tier: 1 (basic) to 4 (production). */
  difficulty?: number;
  /** Category tag (e.g., 'holoscript_syntax', 'vr_traits'). */
  category?: string;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

export interface DatasetRecord {
  id: string;
  name: string;
  description?: string;
  format: DatasetFormat;
  status: DatasetStatus;
  exampleCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  categories: Map<string, number>;
  createdAt: number;
  updatedAt: number;
  validationErrors: ValidationError[];
  metadata?: Record<string, unknown>;
}

export interface ValidationError {
  exampleId: string;
  field: string;
  message: string;
}

export interface DatasetInfo {
  id: string;
  name: string;
  description?: string;
  format: DatasetFormat;
  status: DatasetStatus;
  exampleCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  categories: Record<string, number>;
  validationErrors: ValidationError[];
  createdAt: number;
  updatedAt: number;
}

export interface TrainingJobConfig {
  /** Dataset to train on. */
  datasetId: string;
  /** Base model to fine-tune. */
  baseModel: string;
  /** Number of training epochs. Default: 3 */
  epochs?: number;
  /** Learning rate. Default: 2e-5 */
  learningRate?: number;
  /** Batch size. Default: 4 */
  batchSize?: number;
  /** LoRA rank (for LoRA fine-tuning). Default: 16 */
  loraRank?: number;
  /** LoRA alpha. Default: 32 */
  loraAlpha?: number;
  /** Warmup steps. Default: 100 */
  warmupSteps?: number;
  /** Weight decay. Default: 0.01 */
  weightDecay?: number;
  /** Max sequence length. Default: 2048 */
  maxSeqLength?: number;
  /** Custom job name. */
  name?: string;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

export interface TrainingJob {
  id: string;
  name: string;
  datasetId: string;
  baseModel: string;
  status: JobStatus;
  config: Required<Omit<TrainingJobConfig, 'datasetId' | 'baseModel' | 'name' | 'metadata'>>;
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  trainingLoss: number;
  validationLoss: number;
  bestValidationLoss: number;
  checkpoints: CheckpointRecord[];
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface TrainingJobInfo {
  id: string;
  name: string;
  datasetId: string;
  baseModel: string;
  status: JobStatus;
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  trainingLoss: number;
  validationLoss: number;
  bestValidationLoss: number;
  checkpointCount: number;
  progress: number;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  error?: string;
}

export interface CheckpointRecord {
  id: string;
  jobId: string;
  epoch: number;
  step: number;
  trainingLoss: number;
  validationLoss: number;
  stage: ModelStage;
  modelPath?: string;
  sizeMB: number;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface EvaluationRun {
  id: string;
  jobId: string;
  checkpointId?: string;
  status: EvalStatus;
  benchmarkPrompts: BenchmarkPrompt[];
  results: EvalResult[];
  overallScore: number;
  accuracy: number;
  coherence: number;
  relevance: number;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
}

export interface BenchmarkPrompt {
  id: string;
  instruction: string;
  expectedOutput?: string;
  category?: string;
  difficulty?: number;
  weight?: number;
}

export interface EvalResult {
  promptId: string;
  generatedOutput: string;
  score: number;
  accuracy: number;
  coherence: number;
  relevance: number;
  latencyMs: number;
}

export interface EvaluationInfo {
  id: string;
  jobId: string;
  checkpointId?: string;
  status: EvalStatus;
  promptCount: number;
  completedCount: number;
  overallScore: number;
  accuracy: number;
  coherence: number;
  relevance: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface ModelRecord {
  id: string;
  jobId: string;
  checkpointId: string;
  name: string;
  stage: ModelStage;
  version: string;
  baseModel: string;
  evaluationScore: number;
  promotedAt: number | null;
  retiredAt: number | null;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface ModelInfo {
  id: string;
  jobId: string;
  name: string;
  stage: ModelStage;
  version: string;
  baseModel: string;
  evaluationScore: number;
  createdAt: number;
}

export interface FineTuneServiceConfig {
  /** Maximum concurrent training jobs. Default: 2 */
  maxConcurrentJobs?: number;
  /** Maximum examples per dataset. Default: 100000 */
  maxExamplesPerDataset?: number;
  /** Minimum examples required to start training. Default: 50 */
  minExamplesForTraining?: number;
  /** Maximum datasets. Default: 100 */
  maxDatasets?: number;
  /** Maximum jobs. Default: 500 */
  maxJobs?: number;
  /** Auto-promote models scoring above this threshold. Default: 0.85 */
  autoPromoteThreshold?: number;
  /** Default number of epochs. Default: 3 */
  defaultEpochs?: number;
  /** Default learning rate. Default: 2e-5 */
  defaultLearningRate?: number;
  /** Default batch size. Default: 4 */
  defaultBatchSize?: number;
}

export type FineTuneEventType =
  | 'dataset_created'
  | 'dataset_validated'
  | 'dataset_invalid'
  | 'job_created'
  | 'job_started'
  | 'job_progress'
  | 'job_paused'
  | 'job_completed'
  | 'job_failed'
  | 'job_cancelled'
  | 'checkpoint_saved'
  | 'evaluation_started'
  | 'evaluation_completed'
  | 'model_promoted'
  | 'model_retired';

export interface FineTuneEvent {
  type: FineTuneEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface FineTuneStats {
  datasetCount: number;
  totalExamples: number;
  jobCount: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  checkpointCount: number;
  evaluationCount: number;
  modelCount: number;
  productionModels: number;
  averageScore: number;
}

// ============================================================================
// Service
// ============================================================================

export class BrittneyFineTuneService {
  private readonly config: Required<FineTuneServiceConfig>;
  private datasets: Map<string, DatasetRecord> = new Map();
  private examples: Map<string, Map<string, TrainingExample>> = new Map();
  private jobs: Map<string, TrainingJob> = new Map();
  private evaluations: Map<string, EvaluationRun> = new Map();
  private models: Map<string, ModelRecord> = new Map();
  private running = false;
  private listeners: Array<(event: FineTuneEvent) => void> = [];
  private idCounter = 0;

  constructor(config: FineTuneServiceConfig = {}) {
    this.config = {
      maxConcurrentJobs: config.maxConcurrentJobs ?? 2,
      maxExamplesPerDataset: config.maxExamplesPerDataset ?? 100000,
      minExamplesForTraining: config.minExamplesForTraining ?? 50,
      maxDatasets: config.maxDatasets ?? 100,
      maxJobs: config.maxJobs ?? 500,
      autoPromoteThreshold: config.autoPromoteThreshold ?? 0.85,
      defaultEpochs: config.defaultEpochs ?? 3,
      defaultLearningRate: config.defaultLearningRate ?? 2e-5,
      defaultBatchSize: config.defaultBatchSize ?? 4,
    };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  onEvent(listener: (event: FineTuneEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(type: FineTuneEventType, data: Record<string, unknown>): void {
    const event: FineTuneEvent = { type, timestamp: Date.now(), data };
    for (const l of this.listeners) {
      try { l(event); } catch { /* swallow listener errors */ }
    }
  }

  private nextId(prefix: string): string {
    return `${prefix}_${++this.idCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // --------------------------------------------------------------------------
  // Datasets
  // --------------------------------------------------------------------------

  createDataset(opts: {
    name: string;
    format: DatasetFormat;
    description?: string;
    metadata?: Record<string, unknown>;
  }): DatasetInfo {
    if (!this.running) throw new Error('Service not started');
    if (this.datasets.size >= this.config.maxDatasets) {
      throw new Error(`Maximum datasets reached (${this.config.maxDatasets})`);
    }
    if (!opts.name || opts.name.trim().length === 0) {
      throw new Error('Dataset name is required');
    }

    const id = this.nextId('ds');
    const now = Date.now();
    const record: DatasetRecord = {
      id,
      name: opts.name.trim(),
      description: opts.description,
      format: opts.format,
      status: 'draft',
      exampleCount: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      categories: new Map(),
      createdAt: now,
      updatedAt: now,
      validationErrors: [],
      metadata: opts.metadata,
    };

    this.datasets.set(id, record);
    this.examples.set(id, new Map());
    this.emit('dataset_created', { datasetId: id, name: record.name });
    return this.toDatasetInfo(record);
  }

  getDataset(datasetId: string): DatasetInfo | undefined {
    const ds = this.datasets.get(datasetId);
    return ds ? this.toDatasetInfo(ds) : undefined;
  }

  listDatasets(): DatasetInfo[] {
    return Array.from(this.datasets.values()).map(d => this.toDatasetInfo(d));
  }

  deleteDataset(datasetId: string): boolean {
    if (!this.running) throw new Error('Service not started');
    const ds = this.datasets.get(datasetId);
    if (!ds) return false;

    // Can't delete a dataset that has active jobs
    for (const job of this.jobs.values()) {
      if (job.datasetId === datasetId && ['pending', 'preparing', 'training', 'paused'].includes(job.status)) {
        throw new Error(`Cannot delete dataset with active job ${job.id}`);
      }
    }

    this.datasets.delete(datasetId);
    this.examples.delete(datasetId);
    return true;
  }

  addExamples(datasetId: string, newExamples: TrainingExample[]): { added: number; duplicates: number } {
    if (!this.running) throw new Error('Service not started');
    const ds = this.datasets.get(datasetId);
    if (!ds) throw new Error(`Dataset ${datasetId} not found`);
    if (ds.status === 'archived') throw new Error('Cannot add examples to archived dataset');

    const store = this.examples.get(datasetId)!;
    let added = 0;
    let duplicates = 0;

    for (const ex of newExamples) {
      if (store.size >= this.config.maxExamplesPerDataset) break;

      // Dedup by content hash
      const hash = this.hashExample(ex);
      if (store.has(hash)) {
        duplicates++;
        continue;
      }

      const example: TrainingExample = {
        id: ex.id || this.nextId('ex'),
        instruction: ex.instruction,
        input: ex.input,
        output: ex.output,
        system: ex.system,
        difficulty: ex.difficulty,
        category: ex.category,
        metadata: ex.metadata,
      };
      store.set(hash, example);
      added++;

      if (ex.category) {
        ds.categories.set(ex.category, (ds.categories.get(ex.category) ?? 0) + 1);
      }
    }

    ds.exampleCount = store.size;
    ds.duplicateCount += duplicates;
    ds.updatedAt = Date.now();

    // Reset validation status when examples change
    if (added > 0 && ds.status !== 'draft') {
      ds.status = 'draft';
    }

    return { added, duplicates };
  }

  getExamples(datasetId: string): TrainingExample[] {
    const store = this.examples.get(datasetId);
    if (!store) throw new Error(`Dataset ${datasetId} not found`);
    return Array.from(store.values());
  }

  validateDataset(datasetId: string): DatasetInfo {
    if (!this.running) throw new Error('Service not started');
    const ds = this.datasets.get(datasetId);
    if (!ds) throw new Error(`Dataset ${datasetId} not found`);

    ds.status = 'validating';
    ds.validationErrors = [];
    ds.validCount = 0;
    ds.invalidCount = 0;

    const store = this.examples.get(datasetId)!;

    if (store.size === 0) {
      ds.status = 'invalid';
      ds.validationErrors.push({
        exampleId: '',
        field: 'dataset',
        message: 'Dataset is empty',
      });
      ds.updatedAt = Date.now();
      this.emit('dataset_invalid', { datasetId, errors: ds.validationErrors.length });
      return this.toDatasetInfo(ds);
    }

    for (const ex of store.values()) {
      const errors = this.validateExample(ex, ds.format);
      if (errors.length > 0) {
        ds.invalidCount++;
        ds.validationErrors.push(...errors);
      } else {
        ds.validCount++;
      }
    }

    ds.status = ds.invalidCount === 0 ? 'valid' : 'invalid';
    ds.updatedAt = Date.now();

    if (ds.status === 'valid') {
      this.emit('dataset_validated', { datasetId, validCount: ds.validCount });
    } else {
      this.emit('dataset_invalid', { datasetId, errors: ds.validationErrors.length });
    }

    return this.toDatasetInfo(ds);
  }

  private validateExample(ex: TrainingExample, format: DatasetFormat): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!ex.instruction || ex.instruction.trim().length === 0) {
      errors.push({ exampleId: ex.id, field: 'instruction', message: 'Instruction is required' });
    }
    if (!ex.output || ex.output.trim().length === 0) {
      errors.push({ exampleId: ex.id, field: 'output', message: 'Output is required' });
    }

    if (format === 'sharegpt') {
      // ShareGPT requires instruction to look like conversational
      // We just check for minimum length
      if (ex.instruction && ex.instruction.length < 5) {
        errors.push({ exampleId: ex.id, field: 'instruction', message: 'ShareGPT instruction too short (min 5 chars)' });
      }
    }

    if (format === 'rlhf') {
      // RLHF requires both good and bad outputs — we check metadata
      if (!ex.metadata?.rejected) {
        errors.push({ exampleId: ex.id, field: 'metadata.rejected', message: 'RLHF format requires rejected output in metadata' });
      }
    }

    if (ex.difficulty !== undefined && (ex.difficulty < 1 || ex.difficulty > 4)) {
      errors.push({ exampleId: ex.id, field: 'difficulty', message: 'Difficulty must be 1-4' });
    }

    // Max length checks
    if (ex.instruction && ex.instruction.length > 10000) {
      errors.push({ exampleId: ex.id, field: 'instruction', message: 'Instruction exceeds 10000 chars' });
    }
    if (ex.output && ex.output.length > 50000) {
      errors.push({ exampleId: ex.id, field: 'output', message: 'Output exceeds 50000 chars' });
    }

    return errors;
  }

  private hashExample(ex: TrainingExample): string {
    const content = `${ex.instruction}|${ex.input ?? ''}|${ex.output}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const chr = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `h_${hash.toString(36)}`;
  }

  // --------------------------------------------------------------------------
  // Training Jobs
  // --------------------------------------------------------------------------

  createJob(config: TrainingJobConfig): TrainingJobInfo {
    if (!this.running) throw new Error('Service not started');
    if (this.jobs.size >= this.config.maxJobs) {
      throw new Error(`Maximum jobs reached (${this.config.maxJobs})`);
    }

    const ds = this.datasets.get(config.datasetId);
    if (!ds) throw new Error(`Dataset ${config.datasetId} not found`);
    if (ds.status !== 'valid') throw new Error(`Dataset must be validated (current: ${ds.status})`);
    if (ds.validCount < this.config.minExamplesForTraining) {
      throw new Error(`Dataset needs at least ${this.config.minExamplesForTraining} valid examples (has ${ds.validCount})`);
    }

    const epochs = config.epochs ?? this.config.defaultEpochs;
    const totalSteps = Math.ceil(ds.validCount / (config.batchSize ?? this.config.defaultBatchSize)) * epochs;

    const id = this.nextId('job');
    const now = Date.now();
    const job: TrainingJob = {
      id,
      name: config.name ?? `${config.baseModel}-finetune-${Date.now()}`,
      datasetId: config.datasetId,
      baseModel: config.baseModel,
      status: 'pending',
      config: {
        epochs,
        learningRate: config.learningRate ?? this.config.defaultLearningRate,
        batchSize: config.batchSize ?? this.config.defaultBatchSize,
        loraRank: config.loraRank ?? 16,
        loraAlpha: config.loraAlpha ?? 32,
        warmupSteps: config.warmupSteps ?? 100,
        weightDecay: config.weightDecay ?? 0.01,
        maxSeqLength: config.maxSeqLength ?? 2048,
      },
      currentEpoch: 0,
      totalEpochs: epochs,
      currentStep: 0,
      totalSteps,
      trainingLoss: 0,
      validationLoss: 0,
      bestValidationLoss: Infinity,
      checkpoints: [],
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      metadata: config.metadata,
    };

    this.jobs.set(id, job);
    this.emit('job_created', { jobId: id, datasetId: config.datasetId, baseModel: config.baseModel });
    return this.toJobInfo(job);
  }

  getJob(jobId: string): TrainingJobInfo | undefined {
    const job = this.jobs.get(jobId);
    return job ? this.toJobInfo(job) : undefined;
  }

  listJobs(filter?: { status?: JobStatus; datasetId?: string }): TrainingJobInfo[] {
    let jobs = Array.from(this.jobs.values());
    if (filter?.status) {
      jobs = jobs.filter(j => j.status === filter.status);
    }
    if (filter?.datasetId) {
      jobs = jobs.filter(j => j.datasetId === filter.datasetId);
    }
    return jobs.map(j => this.toJobInfo(j));
  }

  startJob(jobId: string): TrainingJobInfo {
    if (!this.running) throw new Error('Service not started');
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== 'pending' && job.status !== 'paused') {
      throw new Error(`Cannot start job in ${job.status} status`);
    }

    const activeJobs = Array.from(this.jobs.values()).filter(
      j => j.status === 'training' || j.status === 'preparing'
    );
    if (activeJobs.length >= this.config.maxConcurrentJobs) {
      throw new Error(`Maximum concurrent jobs reached (${this.config.maxConcurrentJobs})`);
    }

    job.status = 'preparing';
    job.startedAt = job.startedAt ?? Date.now();
    job.updatedAt = Date.now();

    // Simulate immediate transition to training
    job.status = 'training';
    this.emit('job_started', { jobId, baseModel: job.baseModel });
    return this.toJobInfo(job);
  }

  pauseJob(jobId: string): TrainingJobInfo {
    if (!this.running) throw new Error('Service not started');
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== 'training') {
      throw new Error(`Cannot pause job in ${job.status} status`);
    }

    job.status = 'paused';
    job.updatedAt = Date.now();
    this.emit('job_paused', { jobId, currentEpoch: job.currentEpoch, currentStep: job.currentStep });
    return this.toJobInfo(job);
  }

  cancelJob(jobId: string): TrainingJobInfo {
    if (!this.running) throw new Error('Service not started');
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      throw new Error(`Cannot cancel job in ${job.status} status`);
    }

    job.status = 'cancelled';
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    this.emit('job_cancelled', { jobId });
    return this.toJobInfo(job);
  }

  reportProgress(jobId: string, progress: {
    epoch: number;
    step: number;
    trainingLoss: number;
    validationLoss?: number;
  }): TrainingJobInfo {
    if (!this.running) throw new Error('Service not started');
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== 'training') {
      throw new Error(`Cannot report progress for job in ${job.status} status`);
    }

    job.currentEpoch = progress.epoch;
    job.currentStep = progress.step;
    job.trainingLoss = progress.trainingLoss;
    if (progress.validationLoss !== undefined) {
      job.validationLoss = progress.validationLoss;
      if (progress.validationLoss < job.bestValidationLoss) {
        job.bestValidationLoss = progress.validationLoss;
      }
    }
    job.updatedAt = Date.now();

    this.emit('job_progress', {
      jobId,
      epoch: progress.epoch,
      step: progress.step,
      trainingLoss: progress.trainingLoss,
      validationLoss: progress.validationLoss,
    });

    // Check if training is complete
    if (progress.epoch >= job.totalEpochs && progress.step >= job.totalSteps) {
      job.status = 'completed';
      job.completedAt = Date.now();
      this.emit('job_completed', {
        jobId,
        trainingLoss: job.trainingLoss,
        validationLoss: job.validationLoss,
        bestValidationLoss: job.bestValidationLoss,
      });
    }

    return this.toJobInfo(job);
  }

  completeJob(jobId: string, finalMetrics?: {
    trainingLoss?: number;
    validationLoss?: number;
  }): TrainingJobInfo {
    if (!this.running) throw new Error('Service not started');
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== 'training' && job.status !== 'paused') {
      throw new Error(`Cannot complete job in ${job.status} status`);
    }

    if (finalMetrics?.trainingLoss !== undefined) job.trainingLoss = finalMetrics.trainingLoss;
    if (finalMetrics?.validationLoss !== undefined) {
      job.validationLoss = finalMetrics.validationLoss;
      if (finalMetrics.validationLoss < job.bestValidationLoss) {
        job.bestValidationLoss = finalMetrics.validationLoss;
      }
    }

    job.status = 'completed';
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    this.emit('job_completed', {
      jobId,
      trainingLoss: job.trainingLoss,
      validationLoss: job.validationLoss,
    });
    return this.toJobInfo(job);
  }

  failJob(jobId: string, error: string): TrainingJobInfo {
    if (!this.running) throw new Error('Service not started');
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = 'failed';
    job.error = error;
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    this.emit('job_failed', { jobId, error });
    return this.toJobInfo(job);
  }

  // --------------------------------------------------------------------------
  // Checkpoints
  // --------------------------------------------------------------------------

  saveCheckpoint(jobId: string, checkpoint: {
    epoch: number;
    step: number;
    trainingLoss: number;
    validationLoss: number;
    modelPath?: string;
    sizeMB?: number;
  }): CheckpointRecord {
    if (!this.running) throw new Error('Service not started');
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const record: CheckpointRecord = {
      id: this.nextId('ckpt'),
      jobId,
      epoch: checkpoint.epoch,
      step: checkpoint.step,
      trainingLoss: checkpoint.trainingLoss,
      validationLoss: checkpoint.validationLoss,
      stage: 'checkpoint',
      modelPath: checkpoint.modelPath,
      sizeMB: checkpoint.sizeMB ?? 0,
      createdAt: Date.now(),
    };

    job.checkpoints.push(record);
    job.updatedAt = Date.now();

    this.emit('checkpoint_saved', {
      jobId,
      checkpointId: record.id,
      epoch: record.epoch,
      validationLoss: record.validationLoss,
    });

    return record;
  }

  getCheckpoints(jobId: string): CheckpointRecord[] {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    return [...job.checkpoints];
  }

  getBestCheckpoint(jobId: string): CheckpointRecord | undefined {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.checkpoints.length === 0) return undefined;
    return [...job.checkpoints].sort((a, b) => a.validationLoss - b.validationLoss)[0];
  }

  // --------------------------------------------------------------------------
  // Evaluation
  // --------------------------------------------------------------------------

  createEvaluation(jobId: string, benchmarks: BenchmarkPrompt[], checkpointId?: string): EvaluationInfo {
    if (!this.running) throw new Error('Service not started');
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (checkpointId) {
      const ckpt = job.checkpoints.find(c => c.id === checkpointId);
      if (!ckpt) throw new Error(`Checkpoint ${checkpointId} not found in job ${jobId}`);
    }

    if (benchmarks.length === 0) {
      throw new Error('At least one benchmark prompt is required');
    }

    const id = this.nextId('eval');
    const now = Date.now();
    const evaluation: EvaluationRun = {
      id,
      jobId,
      checkpointId,
      status: 'pending',
      benchmarkPrompts: benchmarks.map(b => ({
        id: b.id || this.nextId('bp'),
        instruction: b.instruction,
        expectedOutput: b.expectedOutput,
        category: b.category,
        difficulty: b.difficulty,
        weight: b.weight ?? 1,
      })),
      results: [],
      overallScore: 0,
      accuracy: 0,
      coherence: 0,
      relevance: 0,
      startedAt: null,
      completedAt: null,
      createdAt: now,
    };

    this.evaluations.set(id, evaluation);
    return this.toEvalInfo(evaluation);
  }

  startEvaluation(evalId: string): EvaluationInfo {
    if (!this.running) throw new Error('Service not started');
    const evaluation = this.evaluations.get(evalId);
    if (!evaluation) throw new Error(`Evaluation ${evalId} not found`);
    if (evaluation.status !== 'pending') {
      throw new Error(`Cannot start evaluation in ${evaluation.status} status`);
    }

    evaluation.status = 'running';
    evaluation.startedAt = Date.now();
    this.emit('evaluation_started', { evalId, jobId: evaluation.jobId });
    return this.toEvalInfo(evaluation);
  }

  submitEvalResult(evalId: string, result: EvalResult): EvaluationInfo {
    if (!this.running) throw new Error('Service not started');
    const evaluation = this.evaluations.get(evalId);
    if (!evaluation) throw new Error(`Evaluation ${evalId} not found`);
    if (evaluation.status !== 'running') {
      throw new Error(`Cannot submit results for evaluation in ${evaluation.status} status`);
    }

    // Validate prompt exists
    const prompt = evaluation.benchmarkPrompts.find(p => p.id === result.promptId);
    if (!prompt) throw new Error(`Benchmark prompt ${result.promptId} not found`);

    // Avoid duplicate results
    if (evaluation.results.find(r => r.promptId === result.promptId)) {
      throw new Error(`Result for prompt ${result.promptId} already submitted`);
    }

    evaluation.results.push(result);

    // Recalculate aggregate scores
    this.recalculateEvalScores(evaluation);

    // Complete if all prompts have results
    if (evaluation.results.length === evaluation.benchmarkPrompts.length) {
      evaluation.status = 'completed';
      evaluation.completedAt = Date.now();
      this.emit('evaluation_completed', {
        evalId,
        jobId: evaluation.jobId,
        overallScore: evaluation.overallScore,
        accuracy: evaluation.accuracy,
        coherence: evaluation.coherence,
        relevance: evaluation.relevance,
      });
    }

    return this.toEvalInfo(evaluation);
  }

  private recalculateEvalScores(evaluation: EvaluationRun): void {
    if (evaluation.results.length === 0) return;

    let totalWeight = 0;
    let weightedScore = 0;
    let weightedAccuracy = 0;
    let weightedCoherence = 0;
    let weightedRelevance = 0;

    for (const result of evaluation.results) {
      const prompt = evaluation.benchmarkPrompts.find(p => p.id === result.promptId);
      const weight = prompt?.weight ?? 1;
      totalWeight += weight;
      weightedScore += result.score * weight;
      weightedAccuracy += result.accuracy * weight;
      weightedCoherence += result.coherence * weight;
      weightedRelevance += result.relevance * weight;
    }

    evaluation.overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    evaluation.accuracy = totalWeight > 0 ? weightedAccuracy / totalWeight : 0;
    evaluation.coherence = totalWeight > 0 ? weightedCoherence / totalWeight : 0;
    evaluation.relevance = totalWeight > 0 ? weightedRelevance / totalWeight : 0;
  }

  getEvaluation(evalId: string): EvaluationInfo | undefined {
    const evaluation = this.evaluations.get(evalId);
    return evaluation ? this.toEvalInfo(evaluation) : undefined;
  }

  listEvaluations(jobId?: string): EvaluationInfo[] {
    let evals = Array.from(this.evaluations.values());
    if (jobId) {
      evals = evals.filter(e => e.jobId === jobId);
    }
    return evals.map(e => this.toEvalInfo(e));
  }

  // --------------------------------------------------------------------------
  // Model Promotion
  // --------------------------------------------------------------------------

  promoteModel(jobId: string, stage: ModelStage, opts?: {
    checkpointId?: string;
    name?: string;
    version?: string;
  }): ModelInfo {
    if (!this.running) throw new Error('Service not started');
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== 'completed') {
      throw new Error(`Cannot promote model from job in ${job.status} status`);
    }

    const checkpointId = opts?.checkpointId ?? this.getBestCheckpoint(jobId)?.id;
    if (!checkpointId) throw new Error('No checkpoints available to promote');

    const checkpoint = job.checkpoints.find(c => c.id === checkpointId);
    if (!checkpoint) throw new Error(`Checkpoint ${checkpointId} not found`);

    // If promoting to production, retire existing production models for same base
    if (stage === 'production') {
      for (const model of this.models.values()) {
        if (model.stage === 'production' && model.baseModel === job.baseModel) {
          model.stage = 'retired';
          model.retiredAt = Date.now();
          this.emit('model_retired', { modelId: model.id, name: model.name });
        }
      }
    }

    // Find best evaluation score
    const evals = Array.from(this.evaluations.values()).filter(e => e.jobId === jobId && e.status === 'completed');
    const bestEval = evals.length > 0 ? Math.max(...evals.map(e => e.overallScore)) : 0;

    const id = this.nextId('model');
    const now = Date.now();
    const model: ModelRecord = {
      id,
      jobId,
      checkpointId,
      name: opts?.name ?? `${job.baseModel}-v5-${stage}`,
      stage,
      version: opts?.version ?? `1.0.${this.models.size}`,
      baseModel: job.baseModel,
      evaluationScore: bestEval,
      promotedAt: now,
      retiredAt: null,
      createdAt: now,
      metadata: job.metadata,
    };

    this.models.set(id, model);
    checkpoint.stage = stage;

    this.emit('model_promoted', {
      modelId: id,
      name: model.name,
      stage,
      evaluationScore: bestEval,
    });

    return this.toModelInfo(model);
  }

  retireModel(modelId: string): ModelInfo {
    if (!this.running) throw new Error('Service not started');
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);
    if (model.stage === 'retired') throw new Error('Model already retired');

    model.stage = 'retired';
    model.retiredAt = Date.now();
    this.emit('model_retired', { modelId, name: model.name });
    return this.toModelInfo(model);
  }

  getModel(modelId: string): ModelInfo | undefined {
    const model = this.models.get(modelId);
    return model ? this.toModelInfo(model) : undefined;
  }

  listModels(filter?: { stage?: ModelStage; baseModel?: string }): ModelInfo[] {
    let models = Array.from(this.models.values());
    if (filter?.stage) models = models.filter(m => m.stage === filter.stage);
    if (filter?.baseModel) models = models.filter(m => m.baseModel === filter.baseModel);
    return models.map(m => this.toModelInfo(m));
  }

  getProductionModel(baseModel?: string): ModelInfo | undefined {
    const prodModels = Array.from(this.models.values()).filter(m => m.stage === 'production');
    if (baseModel) {
      const model = prodModels.find(m => m.baseModel === baseModel);
      return model ? this.toModelInfo(model) : undefined;
    }
    // Return most recently promoted production model
    const sorted = prodModels.sort((a, b) => (b.promotedAt ?? 0) - (a.promotedAt ?? 0));
    return sorted.length > 0 ? this.toModelInfo(sorted[0]) : undefined;
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  getStats(): FineTuneStats {
    const jobs = Array.from(this.jobs.values());
    const models = Array.from(this.models.values());
    const evals = Array.from(this.evaluations.values()).filter(e => e.status === 'completed');

    let totalExamples = 0;
    for (const ds of this.datasets.values()) {
      totalExamples += ds.exampleCount;
    }

    let totalCheckpoints = 0;
    for (const job of jobs) {
      totalCheckpoints += job.checkpoints.length;
    }

    const avgScore = evals.length > 0
      ? evals.reduce((sum, e) => sum + e.overallScore, 0) / evals.length
      : 0;

    return {
      datasetCount: this.datasets.size,
      totalExamples,
      jobCount: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'training' || j.status === 'preparing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      checkpointCount: totalCheckpoints,
      evaluationCount: this.evaluations.size,
      modelCount: models.length,
      productionModels: models.filter(m => m.stage === 'production').length,
      averageScore: Math.round(avgScore * 1000) / 1000,
    };
  }

  // --------------------------------------------------------------------------
  // DTO Converters
  // --------------------------------------------------------------------------

  private toDatasetInfo(ds: DatasetRecord): DatasetInfo {
    return {
      id: ds.id,
      name: ds.name,
      description: ds.description,
      format: ds.format,
      status: ds.status,
      exampleCount: ds.exampleCount,
      validCount: ds.validCount,
      invalidCount: ds.invalidCount,
      duplicateCount: ds.duplicateCount,
      categories: Object.fromEntries(ds.categories),
      validationErrors: ds.validationErrors,
      createdAt: ds.createdAt,
      updatedAt: ds.updatedAt,
    };
  }

  private toJobInfo(job: TrainingJob): TrainingJobInfo {
    return {
      id: job.id,
      name: job.name,
      datasetId: job.datasetId,
      baseModel: job.baseModel,
      status: job.status,
      currentEpoch: job.currentEpoch,
      totalEpochs: job.totalEpochs,
      currentStep: job.currentStep,
      totalSteps: job.totalSteps,
      trainingLoss: job.trainingLoss,
      validationLoss: job.validationLoss,
      bestValidationLoss: job.bestValidationLoss,
      checkpointCount: job.checkpoints.length,
      progress: job.totalSteps > 0 ? Math.round((job.currentStep / job.totalSteps) * 10000) / 100 : 0,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      error: job.error,
    };
  }

  private toEvalInfo(evaluation: EvaluationRun): EvaluationInfo {
    return {
      id: evaluation.id,
      jobId: evaluation.jobId,
      checkpointId: evaluation.checkpointId,
      status: evaluation.status,
      promptCount: evaluation.benchmarkPrompts.length,
      completedCount: evaluation.results.length,
      overallScore: evaluation.overallScore,
      accuracy: evaluation.accuracy,
      coherence: evaluation.coherence,
      relevance: evaluation.relevance,
      startedAt: evaluation.startedAt,
      completedAt: evaluation.completedAt,
    };
  }

  private toModelInfo(model: ModelRecord): ModelInfo {
    return {
      id: model.id,
      jobId: model.jobId,
      name: model.name,
      stage: model.stage,
      version: model.version,
      baseModel: model.baseModel,
      evaluationScore: model.evaluationScore,
      createdAt: model.createdAt,
    };
  }
}
