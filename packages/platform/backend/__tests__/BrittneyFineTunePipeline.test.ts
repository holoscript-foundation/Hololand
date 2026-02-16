/**
 * BrittneyFineTunePipeline Test Suite
 *
 * Tests for the end-to-end pipeline orchestrator: stage execution,
 * event system, dataset export, auto-promotion, and metrics.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BrittneyFineTunePipeline,
  type PipelineConfig,
  type PipelineRunConfig,
  type PipelineEvent,
} from '../src/services/BrittneyFineTunePipeline';

describe('BrittneyFineTunePipeline', () => {
  let pipeline: BrittneyFineTunePipeline;

  const defaultPipelineConfig: PipelineConfig = {
    autoPromote: false,
    promotionThreshold: 0.8,
    minExamplesBeforeTraining: 1, // low for tests
    trainingBackend: 'simulated',
    tmMockMode: true,
    tmEndpoint: 'http://localhost:5555',
    harvestQuality: 0.1,
  };

  const defaultRunConfig: PipelineRunConfig = {
    name: 'test-run',
    chatLogs: [
      {
        id: 'log_1',
        sessionId: 's1',
        messages: [
          { role: 'user' as const, content: 'Create a VR scene with physics-enabled cubes and grab interaction', timestamp: Date.now() },
          { role: 'assistant' as const, content: 'composition "PhysicsScene" {\n  template "GrabbableCube" {\n    @physics\n    @grabbable\n    geometry: "cube"\n    state { health: 100 }\n  }\n  object "Cube1" using "GrabbableCube" { position: [0, 1, -2] }\n}', timestamp: Date.now() },
        ],
        startedAt: Date.now(),
      },
    ],
    corrections: [
      {
        id: 'corr_1',
        sessionId: 's1',
        originalPrompt: 'Make a throwable sphere with HoloScript VR traits',
        originalOutput: 'orb { geometry: "ball" }',
        correctedOutput: 'template "ThrowSphere" {\n  @throwable\n  @physics\n  geometry: "sphere"\n}',
        correctionType: 'syntax' as const,
        timestamp: Date.now(),
      },
    ],
    format: 'alpaca',
  };

  beforeEach(() => {
    pipeline = new BrittneyFineTunePipeline(defaultPipelineConfig);
  });

  afterEach(() => {
    pipeline.stop();
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create with config', () => {
      expect(pipeline).toBeDefined();
    });

    it('should start successfully', () => {
      pipeline.start();
      expect(pipeline.isRunning()).toBe(true);
    });

    it('should stop gracefully', () => {
      pipeline.start();
      pipeline.stop();
      expect(pipeline.isRunning()).toBe(false);
      // Should not throw on double stop
      pipeline.stop();
    });
  });

  // --------------------------------------------------------------------------
  // Create Run
  // --------------------------------------------------------------------------

  describe('createRun', () => {
    it('should create a pipeline run', () => {
      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      expect(run.id).toBeDefined();
      expect(run.name).toBe('test-run');
      expect(run.status).toBe('created');
      expect(run.stages).toHaveLength(6);
    });

    it('should assign unique run IDs', () => {
      pipeline.start();
      const r1 = pipeline.createRun({ ...defaultRunConfig, name: 'run-1' });
      const r2 = pipeline.createRun({ ...defaultRunConfig, name: 'run-2' });
      expect(r1.id).not.toBe(r2.id);
    });

    it('should initialize all 6 stages', () => {
      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      const stageNames = run.stages.map(s => s.stage);
      expect(stageNames).toContain('harvest');
      expect(stageNames).toContain('generate');
      expect(stageNames).toContain('validate');
      expect(stageNames).toContain('train');
      expect(stageNames).toContain('evaluate');
      expect(stageNames).toContain('promote');
    });
  });

  // --------------------------------------------------------------------------
  // Execute Individual Stages
  // --------------------------------------------------------------------------

  describe('executeStage', () => {
    it('should execute harvest stage', async () => {
      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      const result = await pipeline.executeStage(run.id, 'harvest');
      const harvestStage = result.stages.find(s => s.stage === 'harvest');
      expect(harvestStage!.status).toBe('completed');
    });

    it('should execute generate stage after harvest', async () => {
      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      await pipeline.executeStage(run.id, 'harvest');
      const result = await pipeline.executeStage(run.id, 'generate');
      const genStage = result.stages.find(s => s.stage === 'generate');
      expect(genStage!.status).toBe('completed');
    });

    it('should fail for unknown run', async () => {
      pipeline.start();
      await expect(pipeline.executeStage('bad_id', 'harvest')).rejects.toThrow();
    });

    it('should require pipeline to be started', async () => {
      const run = pipeline.createRun(defaultRunConfig);
      await expect(pipeline.executeStage(run.id, 'harvest')).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Execute All Stages
  // --------------------------------------------------------------------------

  describe('executeAll', () => {
    it('should execute all stages in sequence', async () => {
      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      const finalRun = await pipeline.executeAll(run.id);
      expect(finalRun.status).toBe('completed');

      for (const stage of finalRun.stages) {
        expect(['completed', 'skipped']).toContain(stage.status);
      }
    }, 30000);

    it('should collect metrics across stages', async () => {
      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      const finalRun = await pipeline.executeAll(run.id);
      expect(finalRun.metrics).toBeDefined();
      expect(finalRun.metrics.totalExamplesHarvested).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  // --------------------------------------------------------------------------
  // Event System
  // --------------------------------------------------------------------------

  describe('events', () => {
    it('should emit pipeline events on wildcard', async () => {
      const events: PipelineEvent[] = [];
      pipeline.onEvent('*', (event) => {
        events.push(event);
      });

      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      await pipeline.executeStage(run.id, 'harvest');

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'stage_started' || e.type === 'stage_completed')).toBe(true);
    });

    it('should include run ID in events', async () => {
      const events: PipelineEvent[] = [];
      pipeline.onEvent('*', (event) => {
        events.push(event);
      });

      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      await pipeline.executeStage(run.id, 'harvest');

      for (const event of events) {
        expect(event.runId).toBe(run.id);
      }
    });

    it('should emit specific event types', async () => {
      const started: PipelineEvent[] = [];
      pipeline.onEvent('stage_started', (event) => {
        started.push(event);
      });

      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      await pipeline.executeStage(run.id, 'harvest');

      expect(started.length).toBeGreaterThan(0);
      expect(started[0].type).toBe('stage_started');
    });
  });

  // --------------------------------------------------------------------------
  // Dataset Export
  // --------------------------------------------------------------------------

  describe('exportDataset', () => {
    it('should export harvested data as JSONL', async () => {
      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      await pipeline.executeStage(run.id, 'harvest');

      const exported = pipeline.exportDataset(run.id, 'alpaca');
      expect(exported.content).toBeDefined();
      expect(typeof exported.content).toBe('string');
    });

    it('should throw for unknown run', () => {
      pipeline.start();
      expect(() => pipeline.exportDataset('bad_id')).toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  describe('getStats', () => {
    it('should return pipeline statistics', () => {
      pipeline.start();
      const stats = pipeline.getStats();
      expect(stats).toHaveProperty('totalRuns');
      expect(stats).toHaveProperty('completedRuns');
    });

    it('should track run counts', async () => {
      pipeline.start();
      const run = pipeline.createRun(defaultRunConfig);
      let stats = pipeline.getStats();
      expect(stats.totalRuns).toBe(1);

      await pipeline.executeAll(run.id);
      stats = pipeline.getStats();
      expect(stats.completedRuns).toBe(1);
    }, 30000);
  });
});
