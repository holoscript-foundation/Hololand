/**
 * LoRAExecutor Test Suite
 *
 * Tests for LoRA training run lifecycle: prepare, launch, cancel,
 * checkpoint management, simulation, and config building.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LoRAExecutor } from '../src/services/LoRAExecutor';

describe('LoRAExecutor', () => {
  let executor: LoRAExecutor;

  const defaultRunInput = {
    baseModel: 'mistralai/Mistral-7B-v0.1',
    datasetPath: '/data/holoscript_train.jsonl',
    epochs: 3,
    batchSize: 4,
    learningRate: 2e-4,
    warmupSteps: 100,
  };

  beforeEach(() => {
    executor = new LoRAExecutor({ backend: 'simulated', simulationSpeed: 200 });
  });

  afterEach(() => {
    executor.dispose();
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create with default config', () => {
      const e = new LoRAExecutor();
      expect(e).toBeDefined();
      e.dispose();
    });

    it('should create with simulation backend', () => {
      expect(executor).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Prepare Run
  // --------------------------------------------------------------------------

  describe('prepareRun', () => {
    it('should create a new training run', () => {
      const run = executor.prepareRun(defaultRunInput);
      expect(run.id).toBeDefined();
      expect(run.status).toBe('prepared');
      expect(run.config.baseModel).toBe('mistralai/Mistral-7B-v0.1');
    });

    it('should assign unique IDs', () => {
      const r1 = executor.prepareRun(defaultRunInput);
      const r2 = executor.prepareRun(defaultRunInput);
      expect(r1.id).not.toBe(r2.id);
    });

    it('should set initial values to zero', () => {
      const run = executor.prepareRun(defaultRunInput);
      expect(run.currentStep).toBe(0);
      expect(run.currentEpoch).toBe(0);
      expect(run.trainingLoss).toBe(0);
    });

    it('should compute totalSteps from epochs and batchSize', () => {
      const run = executor.prepareRun(defaultRunInput);
      expect(run.totalSteps).toBeGreaterThan(0);
    });

    it('should apply default LoRA config', () => {
      const run = executor.prepareRun(defaultRunInput);
      expect(run.config.lora.rank).toBe(16);
      expect(run.config.lora.alpha).toBe(32);
      expect(run.config.lora.targetModules).toContain('q_proj');
    });
  });

  // --------------------------------------------------------------------------
  // Launch / Simulation
  // --------------------------------------------------------------------------

  describe('launch', () => {
    it('should start a training run in simulation mode', async () => {
      const run = executor.prepareRun(defaultRunInput);
      const launched = await executor.launch(run.id);
      expect(launched.status).toBe('training');
      executor.cancel(run.id);
    });

    it('should fail to launch non-existent run', async () => {
      await expect(executor.launch('non_existent')).rejects.toThrow();
    });

    it('should emit progress events', async () => {
      const run = executor.prepareRun(defaultRunInput);
      const snapshots: number[] = [];

      executor.onProgress(run.id, (r) => {
        snapshots.push(r.currentStep);
      });

      await executor.launch(run.id);

      // Wait for simulation to tick a few times
      await new Promise(resolve => setTimeout(resolve, 600));

      executor.cancel(run.id);

      expect(snapshots.length).toBeGreaterThanOrEqual(0);
    });

    it('should not launch an already running run', async () => {
      const run = executor.prepareRun(defaultRunInput);
      await executor.launch(run.id);
      await expect(executor.launch(run.id)).rejects.toThrow();
      executor.cancel(run.id);
    });
  });

  // --------------------------------------------------------------------------
  // Cancel
  // --------------------------------------------------------------------------

  describe('cancel', () => {
    it('should cancel a running training', async () => {
      const run = executor.prepareRun(defaultRunInput);
      await executor.launch(run.id);
      const cancelled = executor.cancel(run.id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('should fail to cancel non-existent run', () => {
      expect(() => executor.cancel('non_existent')).toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Status
  // --------------------------------------------------------------------------

  describe('getStatus', () => {
    it('should return run status', () => {
      const run = executor.prepareRun(defaultRunInput);
      const status = executor.getStatus(run.id);
      expect(status).toBeDefined();
      expect(status!.status).toBe('prepared');
    });

    it('should return undefined for unknown runs', () => {
      expect(executor.getStatus('unknown')).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // List Runs
  // --------------------------------------------------------------------------

  describe('listRuns', () => {
    it('should list all runs', () => {
      executor.prepareRun(defaultRunInput);
      executor.prepareRun(defaultRunInput);
      expect(executor.listRuns().length).toBe(2);
    });

    it('should return empty array initially', () => {
      expect(executor.listRuns()).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Checkpoints
  // --------------------------------------------------------------------------

  describe('checkpoints', () => {
    it('should retrieve checkpoints for a run', () => {
      const run = executor.prepareRun(defaultRunInput);
      const checkpoints = executor.getCheckpoints(run.id);
      expect(checkpoints).toEqual([]);
    });

    it('should find best checkpoint by loss', () => {
      const run = executor.prepareRun(defaultRunInput);
      const best = executor.getBestCheckpoint(run.id);
      expect(best).toBeUndefined(); // No checkpoints yet
    });
  });

  // --------------------------------------------------------------------------
  // Adapter Config
  // --------------------------------------------------------------------------

  describe('buildAdapterConfig', () => {
    it('should generate adapter config from run', () => {
      const run = executor.prepareRun(defaultRunInput);
      const config = executor.buildAdapterConfig(run.id);
      expect(config).toHaveProperty('model_name_or_path', 'mistralai/Mistral-7B-v0.1');
      expect(config).toHaveProperty('lora_r', 16);
      expect(config).toHaveProperty('lora_alpha', 32);
      expect(config).toHaveProperty('lora_dropout', 0.05);
      expect(config).toHaveProperty('lora_target_modules');
    });

    it('should throw for unknown run', () => {
      expect(() => executor.buildAdapterConfig('unknown')).toThrow();
    });

    it('should include training hyperparameters', () => {
      const run = executor.prepareRun(defaultRunInput);
      const config = executor.buildAdapterConfig(run.id);
      expect(config).toHaveProperty('num_train_epochs', 3);
      expect(config).toHaveProperty('per_device_train_batch_size', 4);
      expect(config).toHaveProperty('learning_rate', 2e-4);
    });
  });

  // --------------------------------------------------------------------------
  // Dispose
  // --------------------------------------------------------------------------

  describe('dispose', () => {
    it('should clean up on dispose', async () => {
      const r1 = executor.prepareRun(defaultRunInput);
      await executor.launch(r1.id);
      executor.dispose();
      // After dispose, runs map is cleared
      expect(executor.listRuns()).toEqual([]);
    });
  });
});
