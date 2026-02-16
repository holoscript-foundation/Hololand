/**
 * BrittneyFineTuneService — Tests
 *
 * Fine-tuning pipeline: datasets, validation, training jobs,
 * checkpoints, evaluation, and model promotion.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BrittneyFineTuneService,
  type TrainingExample,
  type BenchmarkPrompt,
  type FineTuneEvent,
} from '../src/services/BrittneyFineTuneService';

// ─── Helpers ──────────────────────────────────────────────────────
function makeExamples(n: number, category?: string): TrainingExample[] {
  const cat = category ?? 'general';
  return Array.from({ length: n }, (_, i) => ({
    id: `ex-${cat}-${i}`,
    instruction: `What is ${cat} item ${i}?`,
    output: `Item ${i} is a ${cat} test example for training data.`,
    category: cat,
    difficulty: ((i % 4) + 1) as 1 | 2 | 3 | 4,
  }));
}

function makeRLHFExamples(n: number): TrainingExample[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `rlhf-${i}`,
    instruction: `Explain concept ${i} in HoloScript`,
    output: `Good explanation of concept ${i}`,
    metadata: { rejected: `Bad explanation of concept ${i}` },
    category: 'holoscript',
  }));
}

function makeBenchmarks(n: number): BenchmarkPrompt[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `bp-${i}`,
    instruction: `Benchmark prompt ${i}: generate a HoloScript object`,
    expectedOutput: `object "Obj${i}" { geometry: "cube" }`,
    category: 'generation',
    difficulty: ((i % 4) + 1) as 1 | 2 | 3 | 4,
    weight: 1,
  }));
}

function setupService(config = {}) {
  const svc = new BrittneyFineTuneService({ minExamplesForTraining: 5, ...config });
  svc.start();
  return svc;
}

function createValidDataset(svc: BrittneyFineTuneService, count = 10) {
  const ds = svc.createDataset({ name: 'test-dataset', format: 'alpaca' });
  svc.addExamples(ds.id, makeExamples(count));
  svc.validateDataset(ds.id);
  return svc.getDataset(ds.id)!;
}

function createCompletedJob(svc: BrittneyFineTuneService) {
  const ds = createValidDataset(svc, 20);
  const job = svc.createJob({ datasetId: ds.id, baseModel: 'brittney-v4', epochs: 2 });
  svc.startJob(job.id);
  svc.saveCheckpoint(job.id, { epoch: 1, step: 5, trainingLoss: 0.5, validationLoss: 0.4 });
  svc.saveCheckpoint(job.id, { epoch: 2, step: 10, trainingLoss: 0.3, validationLoss: 0.25 });
  svc.completeJob(job.id, { trainingLoss: 0.3, validationLoss: 0.25 });
  return svc.getJob(job.id)!;
}

// ═════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════

describe('BrittneyFineTuneService', () => {
  let svc: BrittneyFineTuneService;

  beforeEach(() => {
    svc = setupService();
  });

  // ─── Lifecycle ────────────────────────────────────────────────
  describe('lifecycle', () => {
    it('starts and stops', () => {
      const s = new BrittneyFineTuneService();
      expect(s.isRunning()).toBe(false);
      s.start();
      expect(s.isRunning()).toBe(true);
      s.stop();
      expect(s.isRunning()).toBe(false);
    });

    it('throws on operations when not started', () => {
      const s = new BrittneyFineTuneService();
      expect(() => s.createDataset({ name: 'x', format: 'alpaca' })).toThrow('not started');
    });

    it('emits events and supports unsubscribe', () => {
      const events: FineTuneEvent[] = [];
      const unsub = svc.onEvent(e => events.push(e));
      svc.createDataset({ name: 'test', format: 'alpaca' });
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('dataset_created');
      unsub();
      svc.createDataset({ name: 'test2', format: 'alpaca' });
      expect(events.length).toBe(1); // no new event after unsub
    });

    it('swallows listener errors', () => {
      svc.onEvent(() => { throw new Error('boom'); });
      expect(() => svc.createDataset({ name: 'x', format: 'alpaca' })).not.toThrow();
    });
  });

  // ─── Datasets ─────────────────────────────────────────────────
  describe('datasets', () => {
    it('creates a dataset', () => {
      const ds = svc.createDataset({ name: 'holoscript-v5', format: 'alpaca', description: 'Training data' });
      expect(ds.id).toMatch(/^ds_/);
      expect(ds.name).toBe('holoscript-v5');
      expect(ds.format).toBe('alpaca');
      expect(ds.status).toBe('draft');
      expect(ds.exampleCount).toBe(0);
    });

    it('rejects empty name', () => {
      expect(() => svc.createDataset({ name: '', format: 'alpaca' })).toThrow('name is required');
    });

    it('trims name', () => {
      const ds = svc.createDataset({ name: '  spaces  ', format: 'alpaca' });
      expect(ds.name).toBe('spaces');
    });

    it('enforces max datasets', () => {
      const s = setupService({ maxDatasets: 2 });
      s.createDataset({ name: 'a', format: 'alpaca' });
      s.createDataset({ name: 'b', format: 'alpaca' });
      expect(() => s.createDataset({ name: 'c', format: 'alpaca' })).toThrow('Maximum datasets');
    });

    it('lists datasets', () => {
      svc.createDataset({ name: 'a', format: 'alpaca' });
      svc.createDataset({ name: 'b', format: 'sharegpt' });
      expect(svc.listDatasets()).toHaveLength(2);
    });

    it('gets dataset by id', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      expect(svc.getDataset(ds.id)?.name).toBe('x');
      expect(svc.getDataset('nonexistent')).toBeUndefined();
    });

    it('deletes dataset', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      expect(svc.deleteDataset(ds.id)).toBe(true);
      expect(svc.getDataset(ds.id)).toBeUndefined();
    });

    it('returns false for deleting nonexistent dataset', () => {
      expect(svc.deleteDataset('nope')).toBe(false);
    });

    it('cannot delete dataset with active job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      expect(() => svc.deleteDataset(ds.id)).toThrow('active job');
    });
  });

  // ─── Examples ─────────────────────────────────────────────────
  describe('examples', () => {
    it('adds examples to dataset', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      const result = svc.addExamples(ds.id, makeExamples(5));
      expect(result.added).toBe(5);
      expect(result.duplicates).toBe(0);
      expect(svc.getDataset(ds.id)!.exampleCount).toBe(5);
    });

    it('deduplicates examples', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      const examples = makeExamples(3);
      svc.addExamples(ds.id, examples);
      const result = svc.addExamples(ds.id, examples); // same again
      expect(result.added).toBe(0);
      expect(result.duplicates).toBe(3);
    });

    it('tracks categories', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, [
        ...makeExamples(3, 'holoscript_syntax'),
        ...makeExamples(2, 'vr_traits'),
      ]);
      const info = svc.getDataset(ds.id)!;
      expect(info.categories['holoscript_syntax']).toBe(3);
      expect(info.categories['vr_traits']).toBe(2);
    });

    it('enforces max examples', () => {
      const s = setupService({ maxExamplesPerDataset: 3 });
      const ds = s.createDataset({ name: 'x', format: 'alpaca' });
      const result = s.addExamples(ds.id, makeExamples(10));
      expect(result.added).toBe(3);
    });

    it('throws for nonexistent dataset', () => {
      expect(() => svc.addExamples('nope', makeExamples(1))).toThrow('not found');
    });

    it('rejects adding to archived dataset', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      // Force archive status
      (svc as any).datasets.get(ds.id)!.status = 'archived';
      expect(() => svc.addExamples(ds.id, makeExamples(1))).toThrow('archived');
    });

    it('retrieves examples', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, makeExamples(5));
      expect(svc.getExamples(ds.id)).toHaveLength(5);
    });

    it('resets validation status when new examples added', () => {
      const ds = createValidDataset(svc);
      expect(svc.getDataset(ds.id)!.status).toBe('valid');
      svc.addExamples(ds.id, [{ id: 'new-1', instruction: 'new instruction', output: 'new output' }]);
      expect(svc.getDataset(ds.id)!.status).toBe('draft');
    });
  });

  // ─── Validation ───────────────────────────────────────────────
  describe('validation', () => {
    it('validates a valid alpaca dataset', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, makeExamples(5));
      const result = svc.validateDataset(ds.id);
      expect(result.status).toBe('valid');
      expect(result.validCount).toBe(5);
      expect(result.invalidCount).toBe(0);
    });

    it('marks empty dataset as invalid', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      const result = svc.validateDataset(ds.id);
      expect(result.status).toBe('invalid');
      expect(result.validationErrors[0].message).toContain('empty');
    });

    it('catches missing instruction', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, [{ id: 'bad', instruction: '', output: 'out' }]);
      const result = svc.validateDataset(ds.id);
      expect(result.status).toBe('invalid');
      expect(result.validationErrors.some(e => e.field === 'instruction')).toBe(true);
    });

    it('catches missing output', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, [{ id: 'bad', instruction: 'hello', output: '' }]);
      const result = svc.validateDataset(ds.id);
      expect(result.status).toBe('invalid');
    });

    it('validates RLHF format requires rejected output', () => {
      const ds = svc.createDataset({ name: 'x', format: 'rlhf' });
      svc.addExamples(ds.id, [{ id: 'no-reject', instruction: 'prompt', output: 'good answer' }]);
      const result = svc.validateDataset(ds.id);
      expect(result.status).toBe('invalid');
      expect(result.validationErrors.some(e => e.field === 'metadata.rejected')).toBe(true);
    });

    it('validates RLHF format accepts proper examples', () => {
      const ds = svc.createDataset({ name: 'x', format: 'rlhf' });
      svc.addExamples(ds.id, makeRLHFExamples(5));
      const result = svc.validateDataset(ds.id);
      expect(result.status).toBe('valid');
    });

    it('validates ShareGPT minimum length', () => {
      const ds = svc.createDataset({ name: 'x', format: 'sharegpt' });
      svc.addExamples(ds.id, [{ id: 'short', instruction: 'hi', output: 'response' }]);
      const result = svc.validateDataset(ds.id);
      expect(result.status).toBe('invalid');
    });

    it('catches invalid difficulty', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, [{ id: 'bad-diff', instruction: 'q', output: 'a', difficulty: 5 }]);
      const result = svc.validateDataset(ds.id);
      expect(result.validationErrors.some(e => e.field === 'difficulty')).toBe(true);
    });

    it('catches oversized instruction', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, [{ id: 'big', instruction: 'x'.repeat(10001), output: 'a' }]);
      const result = svc.validateDataset(ds.id);
      expect(result.validationErrors.some(e => e.message.includes('10000'))).toBe(true);
    });

    it('catches oversized output', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, [{ id: 'big', instruction: 'q', output: 'x'.repeat(50001) }]);
      const result = svc.validateDataset(ds.id);
      expect(result.validationErrors.some(e => e.message.includes('50000'))).toBe(true);
    });

    it('emits dataset_validated event', () => {
      const events: FineTuneEvent[] = [];
      svc.onEvent(e => events.push(e));
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, makeExamples(3));
      svc.validateDataset(ds.id);
      expect(events.some(e => e.type === 'dataset_validated')).toBe(true);
    });

    it('emits dataset_invalid event', () => {
      const events: FineTuneEvent[] = [];
      svc.onEvent(e => events.push(e));
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.validateDataset(ds.id);
      expect(events.some(e => e.type === 'dataset_invalid')).toBe(true);
    });
  });

  // ─── Training Jobs ────────────────────────────────────────────
  describe('training jobs', () => {
    it('creates a job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'brittney-v4' });
      expect(job.id).toMatch(/^job_/);
      expect(job.status).toBe('pending');
      expect(job.baseModel).toBe('brittney-v4');
      expect(job.totalEpochs).toBe(3);
      expect(job.totalSteps).toBeGreaterThan(0);
    });

    it('rejects job for unvalidated dataset', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, makeExamples(10));
      expect(() => svc.createJob({ datasetId: ds.id, baseModel: 'test' })).toThrow('validated');
    });

    it('rejects job for too few examples', () => {
      const ds = svc.createDataset({ name: 'x', format: 'alpaca' });
      svc.addExamples(ds.id, makeExamples(3));
      svc.validateDataset(ds.id);
      expect(() => svc.createJob({ datasetId: ds.id, baseModel: 'test' })).toThrow('at least');
    });

    it('rejects job for nonexistent dataset', () => {
      expect(() => svc.createJob({ datasetId: 'nope', baseModel: 'test' })).toThrow('not found');
    });

    it('starts a job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      const started = svc.startJob(job.id);
      expect(started.status).toBe('training');
      expect(started.startedAt).not.toBeNull();
    });

    it('rejects starting an already training job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      expect(() => svc.startJob(job.id)).toThrow('Cannot start');
    });

    it('enforces max concurrent jobs', () => {
      const s = setupService({ maxConcurrentJobs: 1 });
      const ds = createValidDataset(s, 20);
      const j1 = s.createJob({ datasetId: ds.id, baseModel: 'a' });
      s.startJob(j1.id);
      const j2 = s.createJob({ datasetId: ds.id, baseModel: 'b' });
      expect(() => s.startJob(j2.id)).toThrow('concurrent');
    });

    it('enforces max total jobs', () => {
      const s = setupService({ maxJobs: 1 });
      const ds = createValidDataset(s, 20);
      s.createJob({ datasetId: ds.id, baseModel: 'a' });
      expect(() => s.createJob({ datasetId: ds.id, baseModel: 'b' })).toThrow('Maximum jobs');
    });

    it('pauses a training job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      const paused = svc.pauseJob(job.id);
      expect(paused.status).toBe('paused');
    });

    it('cannot pause a pending job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      expect(() => svc.pauseJob(job.id)).toThrow('Cannot pause');
    });

    it('resumes a paused job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      svc.pauseJob(job.id);
      const resumed = svc.startJob(job.id);
      expect(resumed.status).toBe('training');
    });

    it('cancels a job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      const cancelled = svc.cancelJob(job.id);
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.completedAt).not.toBeNull();
    });

    it('cannot cancel a completed job', () => {
      const job = createCompletedJob(svc);
      expect(() => svc.cancelJob(job.id)).toThrow('Cannot cancel');
    });

    it('lists jobs with filter', () => {
      const ds = createValidDataset(svc, 20);
      svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      const j2 = svc.createJob({ datasetId: ds.id, baseModel: 'test2' });
      svc.startJob(j2.id);
      expect(svc.listJobs({ status: 'pending' })).toHaveLength(1);
      expect(svc.listJobs({ status: 'training' })).toHaveLength(1);
      expect(svc.listJobs()).toHaveLength(2);
    });

    it('gets job by id', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      expect(svc.getJob(job.id)?.baseModel).toBe('test');
      expect(svc.getJob('nope')).toBeUndefined();
    });

    it('uses custom config values', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({
        datasetId: ds.id,
        baseModel: 'test',
        epochs: 5,
        learningRate: 1e-4,
        batchSize: 8,
        loraRank: 32,
        name: 'custom-job',
      });
      expect(job.totalEpochs).toBe(5);
      expect(job.name).toBe('custom-job');
    });
  });

  // ─── Progress Reporting ───────────────────────────────────────
  describe('progress reporting', () => {
    it('reports progress', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test', epochs: 2 });
      svc.startJob(job.id);
      const updated = svc.reportProgress(job.id, {
        epoch: 1, step: 5, trainingLoss: 0.5, validationLoss: 0.4,
      });
      expect(updated.currentEpoch).toBe(1);
      expect(updated.currentStep).toBe(5);
      expect(updated.trainingLoss).toBe(0.5);
      expect(updated.validationLoss).toBe(0.4);
      expect(updated.progress).toBeGreaterThan(0);
    });

    it('tracks best validation loss', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test', epochs: 3 });
      svc.startJob(job.id);
      svc.reportProgress(job.id, { epoch: 1, step: 3, trainingLoss: 0.8, validationLoss: 0.7 });
      svc.reportProgress(job.id, { epoch: 2, step: 6, trainingLoss: 0.5, validationLoss: 0.3 });
      svc.reportProgress(job.id, { epoch: 3, step: 9, trainingLoss: 0.4, validationLoss: 0.5 });
      expect(svc.getJob(job.id)!.bestValidationLoss).toBe(0.3);
    });

    it('auto-completes at final epoch/step', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test', epochs: 1, batchSize: 20 });
      svc.startJob(job.id);
      const totalSteps = svc.getJob(job.id)!.totalSteps;
      const result = svc.reportProgress(job.id, {
        epoch: 1, step: totalSteps, trainingLoss: 0.2, validationLoss: 0.15,
      });
      expect(result.status).toBe('completed');
    });

    it('cannot report progress for non-training job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      expect(() => svc.reportProgress(job.id, { epoch: 1, step: 1, trainingLoss: 0.5 })).toThrow('Cannot report');
    });

    it('completes a job manually', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      const completed = svc.completeJob(job.id, { trainingLoss: 0.2, validationLoss: 0.15 });
      expect(completed.status).toBe('completed');
      expect(completed.trainingLoss).toBe(0.2);
    });

    it('fails a job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      const failed = svc.failJob(job.id, 'OOM error');
      expect(failed.status).toBe('failed');
      expect(failed.error).toBe('OOM error');
    });

    it('emits progress events', () => {
      const events: FineTuneEvent[] = [];
      svc.onEvent(e => events.push(e));
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      svc.reportProgress(job.id, { epoch: 1, step: 1, trainingLoss: 0.5 });
      expect(events.some(e => e.type === 'job_started')).toBe(true);
      expect(events.some(e => e.type === 'job_progress')).toBe(true);
    });
  });

  // ─── Checkpoints ──────────────────────────────────────────────
  describe('checkpoints', () => {
    it('saves a checkpoint', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      const ckpt = svc.saveCheckpoint(job.id, {
        epoch: 1, step: 5, trainingLoss: 0.5, validationLoss: 0.4,
        modelPath: '/models/ckpt-1', sizeMB: 250,
      });
      expect(ckpt.id).toMatch(/^ckpt_/);
      expect(ckpt.epoch).toBe(1);
      expect(ckpt.stage).toBe('checkpoint');
      expect(ckpt.sizeMB).toBe(250);
    });

    it('lists checkpoints', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      svc.saveCheckpoint(job.id, { epoch: 1, step: 5, trainingLoss: 0.5, validationLoss: 0.4 });
      svc.saveCheckpoint(job.id, { epoch: 2, step: 10, trainingLoss: 0.3, validationLoss: 0.2 });
      expect(svc.getCheckpoints(job.id)).toHaveLength(2);
    });

    it('finds best checkpoint by validation loss', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      svc.saveCheckpoint(job.id, { epoch: 1, step: 5, trainingLoss: 0.5, validationLoss: 0.4 });
      svc.saveCheckpoint(job.id, { epoch: 2, step: 10, trainingLoss: 0.3, validationLoss: 0.2 });
      svc.saveCheckpoint(job.id, { epoch: 3, step: 15, trainingLoss: 0.25, validationLoss: 0.35 });
      const best = svc.getBestCheckpoint(job.id);
      expect(best!.validationLoss).toBe(0.2);
      expect(best!.epoch).toBe(2);
    });

    it('returns undefined for no checkpoints', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      expect(svc.getBestCheckpoint(job.id)).toBeUndefined();
    });

    it('emits checkpoint_saved event', () => {
      const events: FineTuneEvent[] = [];
      svc.onEvent(e => events.push(e));
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      svc.saveCheckpoint(job.id, { epoch: 1, step: 5, trainingLoss: 0.5, validationLoss: 0.4 });
      expect(events.some(e => e.type === 'checkpoint_saved')).toBe(true);
    });
  });

  // ─── Evaluation ───────────────────────────────────────────────
  describe('evaluation', () => {
    it('creates an evaluation', () => {
      const job = createCompletedJob(svc);
      const evalRun = svc.createEvaluation(job.id, makeBenchmarks(5));
      expect(evalRun.id).toMatch(/^eval_/);
      expect(evalRun.status).toBe('pending');
      expect(evalRun.promptCount).toBe(5);
    });

    it('requires at least one benchmark', () => {
      const job = createCompletedJob(svc);
      expect(() => svc.createEvaluation(job.id, [])).toThrow('At least one');
    });

    it('validates checkpoint existence', () => {
      const job = createCompletedJob(svc);
      expect(() => svc.createEvaluation(job.id, makeBenchmarks(1), 'bad-ckpt')).toThrow('not found');
    });

    it('starts evaluation', () => {
      const job = createCompletedJob(svc);
      const evalRun = svc.createEvaluation(job.id, makeBenchmarks(3));
      const started = svc.startEvaluation(evalRun.id);
      expect(started.status).toBe('running');
      expect(started.startedAt).not.toBeNull();
    });

    it('cannot start already running evaluation', () => {
      const job = createCompletedJob(svc);
      const evalRun = svc.createEvaluation(job.id, makeBenchmarks(1));
      svc.startEvaluation(evalRun.id);
      expect(() => svc.startEvaluation(evalRun.id)).toThrow('Cannot start');
    });

    it('submits eval results', () => {
      const job = createCompletedJob(svc);
      const benchmarks = makeBenchmarks(2);
      const evalRun = svc.createEvaluation(job.id, benchmarks);
      svc.startEvaluation(evalRun.id);

      const result1 = svc.submitEvalResult(evalRun.id, {
        promptId: benchmarks[0].id, generatedOutput: 'output', score: 0.9,
        accuracy: 0.85, coherence: 0.95, relevance: 0.9, latencyMs: 150,
      });
      expect(result1.completedCount).toBe(1);
      expect(result1.status).toBe('running');
    });

    it('auto-completes when all prompts have results', () => {
      const job = createCompletedJob(svc);
      const benchmarks = makeBenchmarks(2);
      const evalRun = svc.createEvaluation(job.id, benchmarks);
      svc.startEvaluation(evalRun.id);

      svc.submitEvalResult(evalRun.id, {
        promptId: benchmarks[0].id, generatedOutput: 'a', score: 0.8,
        accuracy: 0.8, coherence: 0.8, relevance: 0.8, latencyMs: 100,
      });
      const final = svc.submitEvalResult(evalRun.id, {
        promptId: benchmarks[1].id, generatedOutput: 'b', score: 0.9,
        accuracy: 0.9, coherence: 0.9, relevance: 0.9, latencyMs: 120,
      });
      expect(final.status).toBe('completed');
      expect(final.overallScore).toBeCloseTo(0.85, 10);
      expect(final.accuracy).toBeCloseTo(0.85, 10);
    });

    it('rejects duplicate result submission', () => {
      const job = createCompletedJob(svc);
      const benchmarks = makeBenchmarks(2);
      const evalRun = svc.createEvaluation(job.id, benchmarks);
      svc.startEvaluation(evalRun.id);
      svc.submitEvalResult(evalRun.id, {
        promptId: benchmarks[0].id, generatedOutput: 'a', score: 0.8,
        accuracy: 0.8, coherence: 0.8, relevance: 0.8, latencyMs: 100,
      });
      expect(() => svc.submitEvalResult(evalRun.id, {
        promptId: benchmarks[0].id, generatedOutput: 'a2', score: 0.9,
        accuracy: 0.9, coherence: 0.9, relevance: 0.9, latencyMs: 100,
      })).toThrow('already submitted');
    });

    it('rejects result for non-existent prompt', () => {
      const job = createCompletedJob(svc);
      const evalRun = svc.createEvaluation(job.id, makeBenchmarks(1));
      svc.startEvaluation(evalRun.id);
      expect(() => svc.submitEvalResult(evalRun.id, {
        promptId: 'nonexistent', generatedOutput: 'a', score: 0.8,
        accuracy: 0.8, coherence: 0.8, relevance: 0.8, latencyMs: 100,
      })).toThrow('not found');
    });

    it('supports weighted scoring', () => {
      const job = createCompletedJob(svc);
      const benchmarks: BenchmarkPrompt[] = [
        { id: 'w1', instruction: 'easy', weight: 1 },
        { id: 'w2', instruction: 'hard', weight: 3 },
      ];
      const evalRun = svc.createEvaluation(job.id, benchmarks);
      svc.startEvaluation(evalRun.id);
      svc.submitEvalResult(evalRun.id, {
        promptId: 'w1', generatedOutput: 'a', score: 1.0,
        accuracy: 1.0, coherence: 1.0, relevance: 1.0, latencyMs: 100,
      });
      const final = svc.submitEvalResult(evalRun.id, {
        promptId: 'w2', generatedOutput: 'b', score: 0.5,
        accuracy: 0.5, coherence: 0.5, relevance: 0.5, latencyMs: 100,
      });
      // Weight: (1*1 + 3*0.5) / (1+3) = 2.5/4 = 0.625
      expect(final.overallScore).toBe(0.625);
    });

    it('lists evaluations filtered by job', () => {
      const job = createCompletedJob(svc);
      svc.createEvaluation(job.id, makeBenchmarks(1));
      svc.createEvaluation(job.id, makeBenchmarks(1));
      expect(svc.listEvaluations(job.id)).toHaveLength(2);
      expect(svc.listEvaluations('other')).toHaveLength(0);
    });

    it('gets evaluation by id', () => {
      const job = createCompletedJob(svc);
      const evalRun = svc.createEvaluation(job.id, makeBenchmarks(1));
      expect(svc.getEvaluation(evalRun.id)!.jobId).toBe(job.id);
      expect(svc.getEvaluation('nope')).toBeUndefined();
    });

    it('emits evaluation events', () => {
      const events: FineTuneEvent[] = [];
      svc.onEvent(e => events.push(e));
      const job = createCompletedJob(svc);
      const benchmarks = makeBenchmarks(1);
      const evalRun = svc.createEvaluation(job.id, benchmarks);
      svc.startEvaluation(evalRun.id);
      svc.submitEvalResult(evalRun.id, {
        promptId: benchmarks[0].id, generatedOutput: 'a', score: 0.9,
        accuracy: 0.9, coherence: 0.9, relevance: 0.9, latencyMs: 100,
      });
      expect(events.some(e => e.type === 'evaluation_started')).toBe(true);
      expect(events.some(e => e.type === 'evaluation_completed')).toBe(true);
    });
  });

  // ─── Model Promotion ──────────────────────────────────────────
  describe('model promotion', () => {
    it('promotes model to staging', () => {
      const job = createCompletedJob(svc);
      const model = svc.promoteModel(job.id, 'staging');
      expect(model.id).toMatch(/^model_/);
      expect(model.stage).toBe('staging');
      expect(model.baseModel).toBe('brittney-v4');
    });

    it('promotes to production, retires previous', () => {
      const job1 = createCompletedJob(svc);
      const m1 = svc.promoteModel(job1.id, 'production');
      
      const job2 = createCompletedJob(svc);
      const m2 = svc.promoteModel(job2.id, 'production');

      expect(svc.getModel(m1.id)!.stage).toBe('retired');
      expect(svc.getModel(m2.id)!.stage).toBe('production');
    });

    it('cannot promote from non-completed job', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      expect(() => svc.promoteModel(job.id, 'staging')).toThrow('Cannot promote');
    });

    it('cannot promote without checkpoints', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      svc.completeJob(job.id);
      expect(() => svc.promoteModel(job.id, 'staging')).toThrow('No checkpoints');
    });

    it('promotes specific checkpoint', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      const ckpt1 = svc.saveCheckpoint(job.id, { epoch: 1, step: 5, trainingLoss: 0.5, validationLoss: 0.4 });
      svc.saveCheckpoint(job.id, { epoch: 2, step: 10, trainingLoss: 0.3, validationLoss: 0.2 });
      svc.completeJob(job.id);
      const model = svc.promoteModel(job.id, 'staging', { checkpointId: ckpt1.id });
      expect(model).toBeDefined();
    });

    it('retires a model', () => {
      const job = createCompletedJob(svc);
      const model = svc.promoteModel(job.id, 'staging');
      const retired = svc.retireModel(model.id);
      expect(retired.stage).toBe('retired');
    });

    it('cannot retire already retired model', () => {
      const job = createCompletedJob(svc);
      const model = svc.promoteModel(job.id, 'staging');
      svc.retireModel(model.id);
      expect(() => svc.retireModel(model.id)).toThrow('already retired');
    });

    it('lists models with filter', () => {
      const job = createCompletedJob(svc);
      svc.promoteModel(job.id, 'staging');
      const j2 = createCompletedJob(svc);
      svc.promoteModel(j2.id, 'production');
      expect(svc.listModels({ stage: 'staging' })).toHaveLength(1);
      expect(svc.listModels({ stage: 'production' })).toHaveLength(1);
      expect(svc.listModels()).toHaveLength(2);
    });

    it('gets production model', () => {
      const job = createCompletedJob(svc);
      svc.promoteModel(job.id, 'production', { name: 'brittney-v5-prod' });
      const prod = svc.getProductionModel();
      expect(prod!.name).toBe('brittney-v5-prod');
    });

    it('returns undefined when no production model', () => {
      expect(svc.getProductionModel()).toBeUndefined();
    });

    it('filters production model by base', () => {
      const job = createCompletedJob(svc);
      svc.promoteModel(job.id, 'production');
      expect(svc.getProductionModel('brittney-v4')).toBeDefined();
      expect(svc.getProductionModel('other-model')).toBeUndefined();
    });

    it('custom name and version', () => {
      const job = createCompletedJob(svc);
      const model = svc.promoteModel(job.id, 'staging', {
        name: 'brittney-holoscript-v5',
        version: '5.0.0',
      });
      expect(model.name).toBe('brittney-holoscript-v5');
      expect(model.version).toBe('5.0.0');
    });

    it('emits model_promoted event', () => {
      const events: FineTuneEvent[] = [];
      svc.onEvent(e => events.push(e));
      const job = createCompletedJob(svc);
      svc.promoteModel(job.id, 'production');
      expect(events.some(e => e.type === 'model_promoted')).toBe(true);
    });

    it('emits model_retired event on auto-retire', () => {
      const events: FineTuneEvent[] = [];
      const j1 = createCompletedJob(svc);
      svc.promoteModel(j1.id, 'production');
      svc.onEvent(e => events.push(e));
      const j2 = createCompletedJob(svc);
      svc.promoteModel(j2.id, 'production');
      expect(events.some(e => e.type === 'model_retired')).toBe(true);
    });

    it('includes evaluation score from completed evals', () => {
      const job = createCompletedJob(svc);
      const benchmarks = makeBenchmarks(1);
      const evalRun = svc.createEvaluation(job.id, benchmarks);
      svc.startEvaluation(evalRun.id);
      svc.submitEvalResult(evalRun.id, {
        promptId: benchmarks[0].id, generatedOutput: 'a', score: 0.92,
        accuracy: 0.9, coherence: 0.95, relevance: 0.9, latencyMs: 100,
      });
      const model = svc.promoteModel(job.id, 'production');
      expect(model.evaluationScore).toBe(0.92);
    });
  });

  // ─── Stats ────────────────────────────────────────────────────
  describe('stats', () => {
    it('returns comprehensive stats', () => {
      const ds = createValidDataset(svc, 20);
      const job = svc.createJob({ datasetId: ds.id, baseModel: 'test' });
      svc.startJob(job.id);
      svc.saveCheckpoint(job.id, { epoch: 1, step: 5, trainingLoss: 0.5, validationLoss: 0.4 });
      svc.completeJob(job.id);
      svc.promoteModel(job.id, 'production');

      const stats = svc.getStats();
      expect(stats.datasetCount).toBe(1);
      expect(stats.totalExamples).toBe(20);
      expect(stats.jobCount).toBe(1);
      expect(stats.completedJobs).toBe(1);
      expect(stats.checkpointCount).toBe(1);
      expect(stats.modelCount).toBe(1);
      expect(stats.productionModels).toBe(1);
    });

    it('returns empty stats initially', () => {
      const stats = svc.getStats();
      expect(stats.datasetCount).toBe(0);
      expect(stats.jobCount).toBe(0);
      expect(stats.averageScore).toBe(0);
    });

    it('calculates average eval score', () => {
      const j1 = createCompletedJob(svc);
      const b1 = makeBenchmarks(1);
      const e1 = svc.createEvaluation(j1.id, b1);
      svc.startEvaluation(e1.id);
      svc.submitEvalResult(e1.id, {
        promptId: b1[0].id, generatedOutput: 'a', score: 0.8,
        accuracy: 0.8, coherence: 0.8, relevance: 0.8, latencyMs: 100,
      });

      const j2 = createCompletedJob(svc);
      const b2 = makeBenchmarks(1);
      const e2 = svc.createEvaluation(j2.id, b2);
      svc.startEvaluation(e2.id);
      svc.submitEvalResult(e2.id, {
        promptId: b2[0].id, generatedOutput: 'b', score: 0.9,
        accuracy: 0.9, coherence: 0.9, relevance: 0.9, latencyMs: 100,
      });

      const stats = svc.getStats();
      expect(stats.averageScore).toBe(0.85);
    });
  });
});
