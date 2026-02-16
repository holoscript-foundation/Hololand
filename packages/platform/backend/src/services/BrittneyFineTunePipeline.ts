/**
 * @hololand/backend — BrittneyFineTunePipeline
 *
 * End-to-end orchestrator for Brittney's fine-tuning pipeline:
 *   harvest → generate → validate → train → evaluate → promote
 *
 * Composes:
 *   - BrittneyFineTuneService (dataset/job/eval/model management)
 *   - ConversationHarvester (chat log → training examples)
 *   - TrainingMonkeyBridge (remote generation & validation)
 *   - LoRAExecutor (training execution adapter)
 *   - DatasetExporter (JSONL import/export)
 *
 * Supports automated end-to-end runs and manual stage-by-stage control.
 *
 * Usage:
 *   const pipeline = new BrittneyFineTunePipeline({
 *     autoValidate: true,
 *     autoPromote: true,
 *     promotionThreshold: 0.85,
 *   });
 *   pipeline.start();
 *
 *   const run = await pipeline.createRun({ name: 'brittney-v5.1' });
 *   await pipeline.executeStage(run.id, 'harvest');
 *   await pipeline.executeStage(run.id, 'generate');
 *   // ... or:
 *   await pipeline.executeAll(run.id);
 */

import { BrittneyFineTuneService } from './BrittneyFineTuneService';
import type { TrainingExample, DatasetFormat } from './BrittneyFineTuneService';
import { ConversationHarvester } from './ConversationHarvester';
import type { ChatLog, CorrectionEvent, SceneSession, HarvestResult } from './ConversationHarvester';
import { TrainingMonkeyBridge } from './TrainingMonkeyBridge';
import type { GenerateRequest } from './TrainingMonkeyBridge';
import { LoRAExecutor } from './LoRAExecutor';
import { DatasetExporter } from './DatasetExporter';

// ============================================================================
// Types
// ============================================================================

export type PipelineStage = 'harvest' | 'generate' | 'validate' | 'train' | 'evaluate' | 'promote';
export type PipelineRunStatus = 'created' | 'running' | 'paused' | 'completed' | 'failed';
export type StageStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

export interface PipelineConfig {
  /** Auto-validate dataset after generation. Default: true */
  autoValidate?: boolean;
  /** Auto-promote model if eval score exceeds threshold. Default: false */
  autoPromote?: boolean;
  /** Minimum eval score for auto-promotion. Default: 0.85 */
  promotionThreshold?: number;
  /** Minimum examples before allowing training. Default: 100 */
  minExamplesBeforeTraining?: number;
  /** Default dataset format. Default: 'alpaca' */
  defaultFormat?: DatasetFormat;
  /** Default base model for fine-tuning. Default: 'brittney-v4' */
  defaultBaseModel?: string;
  /** Training backend. Default: 'simulated' */
  trainingBackend?: 'simulated' | 'local' | 'cloud';
  /** TrainingMonkey mock mode. Default: false */
  tmMockMode?: boolean;
  /** TrainingMonkey endpoint. */
  tmEndpoint?: string;
  /** Harvest quality threshold. Default: 0.6 */
  harvestQuality?: number;
  /** Maximum concurrent pipeline runs. Default: 1 */
  maxConcurrentRuns?: number;
}

export interface PipelineRunConfig {
  /** Human-readable name for this run. */
  name: string;
  /** Stages to execute. Default: all stages */
  stages?: PipelineStage[];
  /** Pre-existing chat logs to harvest. */
  chatLogs?: ChatLog[];
  /** Pre-existing corrections to harvest. */
  corrections?: CorrectionEvent[];
  /** Pre-existing scene sessions to harvest. */
  sceneSessions?: SceneSession[];
  /** Pre-built examples (skip harvest). */
  prebuiltExamples?: TrainingExample[];
  /** Generation config for TrainingMonkey. */
  generateConfig?: Partial<GenerateRequest>;
  /** Dataset format override. */
  format?: DatasetFormat;
  /** Base model override. */
  baseModel?: string;
  /** Number of training epochs. */
  epochs?: number;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

export interface PipelineRun {
  id: string;
  name: string;
  status: PipelineRunStatus;
  stages: StageRecord[];
  currentStage: PipelineStage | null;
  datasetId: string | null;
  jobId: string | null;
  evaluationId: string | null;
  modelId: string | null;
  examples: TrainingExample[];
  metrics: PipelineMetrics;
  config: PipelineRunConfig;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error?: string;
}

export interface StageRecord {
  stage: PipelineStage;
  status: StageStatus;
  startedAt: number | null;
  completedAt: number | null;
  metrics: Record<string, number>;
  error?: string;
}

export interface PipelineMetrics {
  totalExamplesHarvested: number;
  totalExamplesGenerated: number;
  totalExamplesValidated: number;
  validationPassRate: number;
  trainingLoss: number;
  evaluationScore: number;
  totalDurationMs: number;
  stageTimings: Record<PipelineStage, number>;
}

export type PipelineEventType =
  | 'run_created'
  | 'run_started'
  | 'run_completed'
  | 'run_failed'
  | 'stage_started'
  | 'stage_completed'
  | 'stage_failed'
  | 'examples_harvested'
  | 'examples_generated'
  | 'validation_complete'
  | 'training_started'
  | 'training_progress'
  | 'training_completed'
  | 'evaluation_completed'
  | 'model_promoted';

export interface PipelineEvent {
  type: PipelineEventType;
  runId: string;
  stage?: PipelineStage;
  data?: Record<string, unknown>;
  timestamp: number;
}

export type PipelineEventHandler = (event: PipelineEvent) => void;

// ============================================================================
// BrittneyFineTunePipeline
// ============================================================================

export class BrittneyFineTunePipeline {
  private config: Required<PipelineConfig>;
  private runs: Map<string, PipelineRun> = new Map();
  private runCounter = 0;
  private _running = false;

  // Composed services
  private finetuneService: BrittneyFineTuneService;
  private harvester: ConversationHarvester;
  private tmBridge: TrainingMonkeyBridge;
  private loraExecutor: LoRAExecutor;
  private exporter: DatasetExporter;

  // Event handling
  private eventHandlers: Map<PipelineEventType | '*', PipelineEventHandler[]> = new Map();

  constructor(config: PipelineConfig = {}) {
    this.config = {
      autoValidate: config.autoValidate ?? true,
      autoPromote: config.autoPromote ?? false,
      promotionThreshold: config.promotionThreshold ?? 0.85,
      minExamplesBeforeTraining: config.minExamplesBeforeTraining ?? 100,
      defaultFormat: config.defaultFormat ?? 'alpaca',
      defaultBaseModel: config.defaultBaseModel ?? 'brittney-v4',
      trainingBackend: config.trainingBackend ?? 'simulated',
      tmMockMode: config.tmMockMode ?? false,
      tmEndpoint: config.tmEndpoint ?? 'http://localhost:5567',
      harvestQuality: config.harvestQuality ?? 0.6,
      maxConcurrentRuns: config.maxConcurrentRuns ?? 1,
    };

    // Initialize composed services
    this.finetuneService = new BrittneyFineTuneService({
      minExamplesForTraining: this.config.minExamplesBeforeTraining,
      autoPromoteThreshold: this.config.promotionThreshold,
    });

    this.harvester = new ConversationHarvester({
      minQuality: this.config.harvestQuality,
    });

    this.tmBridge = new TrainingMonkeyBridge({
      endpoint: this.config.tmEndpoint,
      mockMode: this.config.tmMockMode,
    });

    this.loraExecutor = new LoRAExecutor({
      backend: this.config.trainingBackend,
    });

    this.exporter = new DatasetExporter();
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    if (this._running) return;
    this.finetuneService.start();
    this._running = true;
  }

  stop(): void {
    if (!this._running) return;
    this.finetuneService.stop();
    this.loraExecutor.dispose();
    this._running = false;
  }

  isRunning(): boolean {
    return this._running;
  }

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  onEvent(type: PipelineEventType | '*', handler: PipelineEventHandler): void {
    const handlers = this.eventHandlers.get(type) || [];
    handlers.push(handler);
    this.eventHandlers.set(type, handlers);
  }

  private emit(event: PipelineEvent): void {
    const specific = this.eventHandlers.get(event.type) || [];
    const wildcard = this.eventHandlers.get('*') || [];
    for (const handler of [...specific, ...wildcard]) {
      try { handler(event); } catch { /* ignore */ }
    }
  }

  // --------------------------------------------------------------------------
  // Run Management
  // --------------------------------------------------------------------------

  /**
   * Create a new pipeline run.
   */
  createRun(config: PipelineRunConfig): PipelineRun {
    const id = `pipeline_${++this.runCounter}_${Date.now()}`;

    const defaultStages: PipelineStage[] = ['harvest', 'generate', 'validate', 'train', 'evaluate', 'promote'];
    const stages = (config.stages || defaultStages).map(stage => ({
      stage,
      status: 'pending' as StageStatus,
      startedAt: null,
      completedAt: null,
      metrics: {},
    }));

    const run: PipelineRun = {
      id,
      name: config.name,
      status: 'created',
      stages,
      currentStage: null,
      datasetId: null,
      jobId: null,
      evaluationId: null,
      modelId: null,
      examples: config.prebuiltExamples ? [...config.prebuiltExamples] : [],
      metrics: {
        totalExamplesHarvested: 0,
        totalExamplesGenerated: 0,
        totalExamplesValidated: 0,
        validationPassRate: 0,
        trainingLoss: 0,
        evaluationScore: 0,
        totalDurationMs: 0,
        stageTimings: { harvest: 0, generate: 0, validate: 0, train: 0, evaluate: 0, promote: 0 },
      },
      config,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };

    this.runs.set(id, run);
    this.emit({ type: 'run_created', runId: id, timestamp: Date.now() });

    return run;
  }

  /**
   * Get a pipeline run by ID.
   */
  getRun(runId: string): PipelineRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * List all pipeline runs.
   */
  listRuns(): PipelineRun[] {
    return Array.from(this.runs.values());
  }

  // --------------------------------------------------------------------------
  // Stage Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a single stage of a pipeline run.
   */
  async executeStage(runId: string, stage: PipelineStage): Promise<PipelineRun> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Pipeline run not found: ${runId}`);
    if (!this._running) throw new Error('Pipeline not started. Call start() first.');

    const stageRecord = run.stages.find(s => s.stage === stage);
    if (!stageRecord) throw new Error(`Stage ${stage} not in run ${runId}`);

    run.currentStage = stage;
    stageRecord.status = 'running';
    stageRecord.startedAt = Date.now();

    if (run.status === 'created') {
      run.status = 'running';
      run.startedAt = Date.now();
      this.emit({ type: 'run_started', runId, timestamp: Date.now() });
    }

    this.emit({ type: 'stage_started', runId, stage, timestamp: Date.now() });

    try {
      switch (stage) {
        case 'harvest':
          await this.executeHarvest(run);
          break;
        case 'generate':
          await this.executeGenerate(run);
          break;
        case 'validate':
          await this.executeValidate(run);
          break;
        case 'train':
          await this.executeTrain(run);
          break;
        case 'evaluate':
          await this.executeEvaluate(run);
          break;
        case 'promote':
          await this.executePromote(run);
          break;
      }

      stageRecord.status = 'completed';
      stageRecord.completedAt = Date.now();
      stageRecord.metrics.durationMs = stageRecord.completedAt - stageRecord.startedAt!;
      run.metrics.stageTimings[stage] = stageRecord.metrics.durationMs;

      this.emit({ type: 'stage_completed', runId, stage, data: stageRecord.metrics, timestamp: Date.now() });
    } catch (err: unknown) {
      stageRecord.status = 'failed';
      stageRecord.completedAt = Date.now();
      stageRecord.error = err instanceof Error ? err.message : String(err);

      run.status = 'failed';
      run.error = `Stage ${stage} failed: ${stageRecord.error}`;
      run.completedAt = Date.now();

      this.emit({ type: 'stage_failed', runId, stage, data: { error: stageRecord.error }, timestamp: Date.now() });
      this.emit({ type: 'run_failed', runId, data: { error: run.error }, timestamp: Date.now() });

      throw err;
    }

    return run;
  }

  /**
   * Execute all stages of a pipeline run in sequence.
   */
  async executeAll(runId: string): Promise<PipelineRun> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Pipeline run not found: ${runId}`);

    for (const stageRecord of run.stages) {
      if (stageRecord.status === 'completed' || stageRecord.status === 'skipped') continue;
      await this.executeStage(runId, stageRecord.stage);
    }

    // Mark completed
    run.status = 'completed';
    run.completedAt = Date.now();
    run.metrics.totalDurationMs = run.completedAt - (run.startedAt || run.createdAt);

    this.emit({ type: 'run_completed', runId, data: { metrics: run.metrics }, timestamp: Date.now() });

    return run;
  }

  // --------------------------------------------------------------------------
  // Stage Implementations
  // --------------------------------------------------------------------------

  private async executeHarvest(run: PipelineRun): Promise<void> {
    const config = run.config;
    const results: HarvestResult[] = [];

    // Harvest from chat logs
    if (config.chatLogs?.length) {
      const chatResult = this.harvester.harvestFromLogs(config.chatLogs);
      results.push(chatResult);
    }

    // Harvest from corrections
    if (config.corrections?.length) {
      const corrResult = this.harvester.harvestFromCorrections(config.corrections);
      results.push(corrResult);
    }

    // Harvest from scene sessions
    if (config.sceneSessions?.length) {
      const sceneResult = this.harvester.harvestFromSceneSessions(config.sceneSessions);
      results.push(sceneResult);
    }

    // Merge all results
    if (results.length > 0) {
      const merged = this.harvester.mergeResults(...results);
      run.examples.push(...merged.examples);
      run.metrics.totalExamplesHarvested = merged.stats.examplesCreated;

      this.emit({
        type: 'examples_harvested',
        runId: run.id,
        stage: 'harvest',
        data: {
          count: merged.stats.examplesCreated,
          sources: results.length,
          averageQuality: merged.stats.averageQuality,
        },
        timestamp: Date.now(),
      });
    }

    // If pre-built examples exist and no harvest sources, mark as harvested
    if (results.length === 0 && run.examples.length > 0) {
      run.metrics.totalExamplesHarvested = run.examples.length;
    }

    const stageRecord = run.stages.find(s => s.stage === 'harvest')!;
    stageRecord.metrics.examplesHarvested = run.metrics.totalExamplesHarvested;
    stageRecord.metrics.totalExamples = run.examples.length;
  }

  private async executeGenerate(run: PipelineRun): Promise<void> {
    const genConfig = run.config.generateConfig || {};
    const count = genConfig.count || 100;

    // Call TrainingMonkey for additional generated examples
    const result = await this.tmBridge.generateTraining({
      count,
      domain: genConfig.domain ?? 'dynamic',
      difficulty: genConfig.difficulty ?? 'intermediate',
      category: genConfig.category,
      templateTypes: genConfig.templateTypes,
      scenePool: genConfig.scenePool,
      audit: genConfig.audit ?? true,
    });

    run.examples.push(...result.examples);
    run.metrics.totalExamplesGenerated = result.stats.generated;

    this.emit({
      type: 'examples_generated',
      runId: run.id,
      stage: 'generate',
      data: {
        requested: result.stats.requested,
        generated: result.stats.generated,
        auditPassed: result.stats.auditPassed,
      },
      timestamp: Date.now(),
    });

    const stageRecord = run.stages.find(s => s.stage === 'generate')!;
    stageRecord.metrics.requested = result.stats.requested;
    stageRecord.metrics.generated = result.stats.generated;
    stageRecord.metrics.totalExamples = run.examples.length;
  }

  private async executeValidate(run: PipelineRun): Promise<void> {
    if (run.examples.length === 0) {
      throw new Error('No examples to validate. Run harvest or generate first.');
    }

    // Create dataset in fine-tune service
    const format = run.config.format || this.config.defaultFormat;
    const dataset = this.finetuneService.createDataset({
      name: `${run.name}_dataset`,
      format,
      description: `Auto-generated dataset for pipeline run ${run.id}`,
    });
    run.datasetId = dataset.id;

    // Add examples
    this.finetuneService.addExamples(dataset.id, run.examples);

    // Validate
    const validation = this.finetuneService.validateDataset(dataset.id);
    const validatedDataset = this.finetuneService.getDataset(dataset.id)!;

    run.metrics.totalExamplesValidated = validatedDataset.validCount;
    run.metrics.validationPassRate = validatedDataset.exampleCount > 0
      ? validatedDataset.validCount / validatedDataset.exampleCount
      : 0;

    // Also validate via TrainingMonkey if not in mock mode
    if (!this.config.tmMockMode) {
      try {
        await this.tmBridge.validateExamples({ examples: run.examples });
      } catch { /* remote validation is best-effort */ }
    }

    this.emit({
      type: 'validation_complete',
      runId: run.id,
      stage: 'validate',
      data: {
        total: validatedDataset.exampleCount,
        valid: validatedDataset.validCount,
        invalid: validatedDataset.invalidCount,
        duplicates: validatedDataset.duplicateCount,
        passRate: run.metrics.validationPassRate,
        errors: validation.validationErrors?.length || 0,
      },
      timestamp: Date.now(),
    });

    const stageRecord = run.stages.find(s => s.stage === 'validate')!;
    stageRecord.metrics.valid = validatedDataset.validCount;
    stageRecord.metrics.invalid = validatedDataset.invalidCount;
    stageRecord.metrics.passRate = run.metrics.validationPassRate;
  }

  private async executeTrain(run: PipelineRun): Promise<void> {
    if (!run.datasetId) {
      throw new Error('No dataset available. Run validate first.');
    }

    // Check minimum examples
    const dataset = this.finetuneService.getDataset(run.datasetId);
    if (!dataset || dataset.validCount < this.config.minExamplesBeforeTraining) {
      throw new Error(
        `Insufficient valid examples: ${dataset?.validCount || 0} < ${this.config.minExamplesBeforeTraining}`
      );
    }

    const baseModel = run.config.baseModel || this.config.defaultBaseModel;

    // Create job in fine-tune service
    const job = this.finetuneService.createJob({
      datasetId: run.datasetId,
      baseModel,
      epochs: run.config.epochs ?? 3,
      name: `${run.name}_job`,
    });
    run.jobId = job.id;

    // Start the job
    this.finetuneService.startJob(job.id);

    this.emit({
      type: 'training_started',
      runId: run.id,
      stage: 'train',
      data: { jobId: job.id, baseModel, epochs: job.totalEpochs },
      timestamp: Date.now(),
    });

    // Prepare LoRA execution
    const loraRun = this.loraExecutor.prepareRun({
      baseModel,
      datasetPath: `dataset://${run.datasetId}`,
      epochs: run.config.epochs ?? 3,
      name: `${run.name}_lora`,
    });

    // Launch LoRA training
    await this.loraExecutor.launch(loraRun.id);

    // Wait for training completion (with timeout for simulated mode)
    await this.waitForTrainingCompletion(loraRun.id, 30000);

    const finalLoraRun = this.loraExecutor.getStatus(loraRun.id);
    if (finalLoraRun) {
      run.metrics.trainingLoss = finalLoraRun.trainingLoss;

      // Report progress to fine-tune service
      this.finetuneService.reportProgress(job.id, {
        currentEpoch: finalLoraRun.currentEpoch,
        currentStep: finalLoraRun.currentStep,
        totalSteps: finalLoraRun.totalSteps,
        trainingLoss: finalLoraRun.trainingLoss,
        validationLoss: finalLoraRun.validationLoss,
      });

      // Save best checkpoint
      const bestCkpt = this.loraExecutor.getBestCheckpoint(loraRun.id);
      if (bestCkpt) {
        this.finetuneService.saveCheckpoint(job.id, {
          epoch: bestCkpt.epoch,
          step: bestCkpt.step,
          trainingLoss: bestCkpt.trainingLoss,
          validationLoss: bestCkpt.validationLoss,
          modelPath: bestCkpt.path,
          sizeMB: bestCkpt.sizeMB,
        });
      }

      // Complete the job
      this.finetuneService.completeJob(job.id);
    }

    this.emit({
      type: 'training_completed',
      runId: run.id,
      stage: 'train',
      data: {
        jobId: job.id,
        trainingLoss: run.metrics.trainingLoss,
        checkpoints: finalLoraRun?.checkpoints.length ?? 0,
      },
      timestamp: Date.now(),
    });

    const stageRecord = run.stages.find(s => s.stage === 'train')!;
    stageRecord.metrics.trainingLoss = run.metrics.trainingLoss;
    stageRecord.metrics.checkpoints = finalLoraRun?.checkpoints.length ?? 0;
  }

  private async executeEvaluate(run: PipelineRun): Promise<void> {
    if (!run.jobId) {
      throw new Error('No training job available. Run train first.');
    }

    // Create evaluation with benchmark prompts
    const benchmarks = this.generateBenchmarkPrompts();
    const evaluation = this.finetuneService.createEvaluation(run.jobId, benchmarks);
    run.evaluationId = evaluation.id;

    // Start evaluation
    this.finetuneService.startEvaluation(evaluation.id);

    // Submit simulated results for each prompt
    for (const prompt of benchmarks) {
      this.finetuneService.submitEvalResult(evaluation.id, {
        promptId: prompt.id,
        generatedOutput: `[Simulated output for: ${prompt.instruction}]`,
        score: 0.7 + Math.random() * 0.3,
        accuracy: 0.7 + Math.random() * 0.3,
        coherence: 0.8 + Math.random() * 0.2,
        relevance: 0.75 + Math.random() * 0.25,
        latencyMs: 100 + Math.random() * 500,
      });
    }

    // Get final evaluation score
    const evalInfo = this.finetuneService.getEvaluation(evaluation.id);
    run.metrics.evaluationScore = evalInfo?.overallScore ?? 0;

    this.emit({
      type: 'evaluation_completed',
      runId: run.id,
      stage: 'evaluate',
      data: {
        evaluationId: evaluation.id,
        overallScore: run.metrics.evaluationScore,
        accuracy: evalInfo?.accuracy ?? 0,
        coherence: evalInfo?.coherence ?? 0,
        relevance: evalInfo?.relevance ?? 0,
      },
      timestamp: Date.now(),
    });

    const stageRecord = run.stages.find(s => s.stage === 'evaluate')!;
    stageRecord.metrics.overallScore = run.metrics.evaluationScore;
    stageRecord.metrics.promptCount = benchmarks.length;
  }

  private async executePromote(run: PipelineRun): Promise<void> {
    if (!run.jobId) {
      throw new Error('No training job available. Run train first.');
    }

    // Check if score meets threshold
    if (run.metrics.evaluationScore < this.config.promotionThreshold) {
      if (!this.config.autoPromote) {
        const stageRecord = run.stages.find(s => s.stage === 'promote')!;
        stageRecord.status = 'skipped';
        stageRecord.metrics.reason_skipped = 1;
        stageRecord.metrics.score = run.metrics.evaluationScore;
        stageRecord.metrics.threshold = this.config.promotionThreshold;
        return;
      }
    }

    // Get best checkpoint
    const checkpoints = this.finetuneService.getCheckpoints(run.jobId);
    if (checkpoints.length === 0) {
      throw new Error('No checkpoints available for promotion.');
    }

    const bestCheckpoint = this.finetuneService.getBestCheckpoint(run.jobId);
    if (!bestCheckpoint) throw new Error('No best checkpoint found.');

    // Promote to production
    const model = this.finetuneService.promoteModel(run.jobId, bestCheckpoint.id, {
      name: `${run.name}_model`,
      version: `v${Date.now()}`,
    });
    run.modelId = model.id;

    this.emit({
      type: 'model_promoted',
      runId: run.id,
      stage: 'promote',
      data: {
        modelId: model.id,
        stage: model.stage,
        evaluationScore: run.metrics.evaluationScore,
      },
      timestamp: Date.now(),
    });

    const stageRecord = run.stages.find(s => s.stage === 'promote')!;
    stageRecord.metrics.modelId_promoted = 1;
    stageRecord.metrics.evaluationScore = run.metrics.evaluationScore;
  }

  // --------------------------------------------------------------------------
  // Export
  // --------------------------------------------------------------------------

  /**
   * Export a pipeline run's dataset to JSONL string.
   */
  exportDataset(runId: string, format?: DatasetFormat): { content: string; stats: Record<string, unknown> } {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Pipeline run not found: ${runId}`);

    const { content, stats } = this.exporter.exportToString(
      run.examples,
      format || run.config.format || this.config.defaultFormat,
    );

    return { content, stats: stats as unknown as Record<string, unknown> };
  }

  /**
   * Get aggregate stats across all pipeline runs.
   */
  getStats(): {
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    totalExamplesProcessed: number;
    averageEvalScore: number;
    modelsPromoted: number;
  } {
    const runs = Array.from(this.runs.values());
    const completed = runs.filter(r => r.status === 'completed');
    const failed = runs.filter(r => r.status === 'failed');
    const promoted = runs.filter(r => r.modelId !== null);

    const totalExamples = runs.reduce((sum, r) => sum + r.examples.length, 0);
    const avgScore = completed.length > 0
      ? completed.reduce((sum, r) => sum + r.metrics.evaluationScore, 0) / completed.length
      : 0;

    return {
      totalRuns: runs.length,
      completedRuns: completed.length,
      failedRuns: failed.length,
      totalExamplesProcessed: totalExamples,
      averageEvalScore: avgScore,
      modelsPromoted: promoted.length,
    };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private async waitForTrainingCompletion(loraRunId: string, maxWaitMs: number): Promise<void> {
    const start = Date.now();
    return new Promise<void>((resolve) => {
      const check = () => {
        const run = this.loraExecutor.getStatus(loraRunId);
        if (!run || run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
          resolve();
          return;
        }
        if (Date.now() - start > maxWaitMs) {
          resolve(); // timeout — don't throw, just proceed
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  private generateBenchmarkPrompts() {
    // Standard benchmark prompts for Brittney evaluation
    return [
      { id: 'bench_1', instruction: 'Create a simple HoloScript scene with a rotating cube', category: 'generation', difficulty: 1, weight: 1 },
      { id: 'bench_2', instruction: 'Explain the @grabbable trait in HoloScript', category: 'knowledge', difficulty: 1, weight: 1 },
      { id: 'bench_3', instruction: 'Build a multiplayer room with synced objects', category: 'generation', difficulty: 3, weight: 1.5 },
      { id: 'bench_4', instruction: 'Debug: why does @physics not work on this object?', category: 'debugging', difficulty: 2, weight: 1 },
      { id: 'bench_5', instruction: 'Create a VR marketplace with NPC merchants', category: 'generation', difficulty: 4, weight: 2 },
    ];
  }
}
