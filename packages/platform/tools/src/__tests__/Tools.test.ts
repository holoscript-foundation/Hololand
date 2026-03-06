import { describe, it, expect } from 'vitest';
import { VRHarvester, type HarvestedSample } from '../VRHarvester';
import { HololandSelfImprove } from '../HololandSelfImprove';

// ── VRHarvester ──────────────────────────────────────────────────────────────

function makeSample(overrides: Partial<HarvestedSample> = {}): HarvestedSample {
  return {
    id: `sample-${Math.random().toString(36).slice(2, 8)}`,
    type: 'scene-metric',
    qualityScore: 0.8,
    data: { fps: 90, splatCount: 50000 },
    timestamp: Date.now(),
    sourceWorldId: 'world-1',
    ...overrides,
  };
}

describe('VRHarvester', () => {
  it('registers sources and counts samples', () => {
    const harvester = new VRHarvester();
    harvester.registerSource('w1', [makeSample(), makeSample()]);
    harvester.registerSource('w2', [makeSample()]);
    expect(harvester.getSourceCount()).toBe(2);
    expect(harvester.getTotalSampleCount()).toBe(3);
  });

  it('adds individual samples', () => {
    const harvester = new VRHarvester();
    harvester.addSample('w1', makeSample());
    harvester.addSample('w1', makeSample());
    expect(harvester.getTotalSampleCount()).toBe(2);
  });

  it('harvests samples above quality threshold', () => {
    const harvester = new VRHarvester({ minQualityScore: 0.7 });
    harvester.registerSource('w1', [
      makeSample({ qualityScore: 0.9 }),
      makeSample({ qualityScore: 0.5 }), // below threshold
      makeSample({ qualityScore: 0.8 }),
    ]);
    const result = harvester.harvest();
    expect(result.totalScanned).toBe(3);
    expect(result.totalHarvested).toBe(2);
    expect(result.belowThreshold).toBe(1);
  });

  it('removes duplicates', () => {
    const harvester = new VRHarvester();
    const dup = makeSample({ id: 's1', data: { x: 1 }, sourceWorldId: 'w1' });
    const dup2 = makeSample({ id: 's2', data: { x: 1 }, sourceWorldId: 'w1' }); // same fingerprint
    harvester.registerSource('w1', [dup, dup2]);
    const result = harvester.harvest();
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.totalHarvested).toBe(1);
  });

  it('respects maxSamples', () => {
    const harvester = new VRHarvester({ maxSamples: 2 });
    harvester.registerSource('w1', [
      makeSample({ data: { a: 1 } }),
      makeSample({ data: { b: 2 } }),
      makeSample({ data: { c: 3 } }),
    ]);
    const result = harvester.harvest();
    expect(result.totalHarvested).toBeLessThanOrEqual(2);
  });

  it('filters by type inclusion', () => {
    const harvester = new VRHarvester({ includeAgentTraces: false });
    harvester.registerSource('w1', [
      makeSample({ type: 'agent-trace', data: { trace: 1 } }),
      makeSample({ type: 'scene-metric', data: { fps: 90 } }),
    ]);
    const result = harvester.harvest();
    expect(result.totalHarvested).toBe(1);
    expect(result.samples[0].type).toBe('scene-metric');
  });

  it('computes quality distribution', () => {
    const harvester = new VRHarvester({ minQualityScore: 0 });
    harvester.registerSource('w1', [
      makeSample({ qualityScore: 0.1, data: { a: 1 } }),
      makeSample({ qualityScore: 0.5, data: { b: 2 } }),
      makeSample({ qualityScore: 0.9, data: { c: 3 } }),
    ]);
    const result = harvester.harvest();
    expect(result.qualityDistribution.length).toBe(5);
    const totalBucketCounts = result.qualityDistribution.reduce((s, b) => s + b.count, 0);
    expect(totalBucketCounts).toBe(result.totalHarvested);
  });

  it('exports to JSONL format', () => {
    const harvester = new VRHarvester({ outputFormat: 'jsonl' });
    const samples = [makeSample(), makeSample({ data: { different: true } })];
    const output = harvester.exportToFormat(samples);
    const lines = output.split('\n');
    expect(lines.length).toBe(2);
    expect(() => JSON.parse(lines[0])).not.toThrow();
  });

  it('exports to CSV format', () => {
    const harvester = new VRHarvester({ outputFormat: 'csv' });
    const samples = [makeSample()];
    const output = harvester.exportToFormat(samples);
    expect(output).toContain('id,type,qualityScore');
    expect(output.split('\n').length).toBe(2); // header + 1 row
  });

  it('exports to parquet metadata', () => {
    const harvester = new VRHarvester({ outputFormat: 'parquet' });
    const samples = [makeSample()];
    const output = harvester.exportToFormat(samples);
    const meta = JSON.parse(output);
    expect(meta.format).toBe('parquet');
    expect(meta.rowCount).toBe(1);
  });

  it('tracks harvest history', () => {
    const harvester = new VRHarvester();
    harvester.registerSource('w1', [makeSample()]);
    harvester.harvest();
    harvester.harvest();
    expect(harvester.getHarvestHistory().length).toBe(2);
  });

  it('clears sources', () => {
    const harvester = new VRHarvester();
    harvester.registerSource('w1', [makeSample()]);
    harvester.clearSources();
    expect(harvester.getSourceCount()).toBe(0);
    expect(harvester.getTotalSampleCount()).toBe(0);
  });

  it('updates config', () => {
    const harvester = new VRHarvester({ minQualityScore: 0.5 });
    expect(harvester.getConfig().minQualityScore).toBe(0.5);
    harvester.updateConfig({ minQualityScore: 0.8 });
    expect(harvester.getConfig().minQualityScore).toBe(0.8);
  });
});

// ── HololandSelfImprove ──────────────────────────────────────────────────────

describe('HololandSelfImprove', () => {
  it('creates with default config', () => {
    const pipeline = new HololandSelfImprove();
    const config = pipeline.getConfig();
    expect(config.maxIterations).toBe(10);
    expect(config.minImprovementThreshold).toBe(0.01);
  });

  it('accepts custom config', () => {
    const pipeline = new HololandSelfImprove({ maxIterations: 5, dryRun: true });
    expect(pipeline.getConfig().maxIterations).toBe(5);
    expect(pipeline.getConfig().dryRun).toBe(true);
  });

  it('runs harvest-only mode', async () => {
    const harvester = new VRHarvester();
    harvester.registerSource('w1', [makeSample()]);
    const pipeline = new HololandSelfImprove({}, harvester);
    const result = await pipeline.runHarvestOnly();
    expect(result.totalHarvested).toBe(1);
  });

  it('runs full pipeline in dry-run mode', async () => {
    const pipeline = new HololandSelfImprove({ dryRun: true });
    const result = await pipeline.runPipeline();
    expect(result.stages.length).toBeGreaterThan(0);
    expect(result.stages.every(s => s.success)).toBe(true);
    expect(result.iterationNumber).toBe(1);
  });

  it('runs pipeline with real data', async () => {
    const harvester = new VRHarvester();
    harvester.registerSource('w1', [
      makeSample({ qualityScore: 0.9, data: { a: 1 } }),
      makeSample({ qualityScore: 0.5, data: { b: 2 } }),
      makeSample({ qualityScore: 0.3, data: { c: 3 } }),
    ]);
    const pipeline = new HololandSelfImprove({ autoDeployOnPass: true }, harvester);
    const result = await pipeline.runPipeline();
    expect(result.stages.length).toBeGreaterThan(0);

    // Harvest stage should succeed
    const harvestStage = result.stages.find(s => s.stage === 'HARVEST');
    expect(harvestStage?.success).toBe(true);
  });

  it('tracks iteration results', async () => {
    const pipeline = new HololandSelfImprove({ dryRun: true });
    await pipeline.runPipeline();
    await pipeline.runPipeline();
    expect(pipeline.getIterationResults().length).toBe(2);
    expect(pipeline.getCurrentIteration()).toBe(2);
  });

  it('manages baseline score', () => {
    const pipeline = new HololandSelfImprove();
    expect(pipeline.getBaselineScore()).toBe(0);
    pipeline.setBaselineScore(0.85);
    expect(pipeline.getBaselineScore()).toBe(0.85);
  });

  it('registers custom stage handlers', async () => {
    const pipeline = new HololandSelfImprove({ dryRun: true });
    pipeline.registerStageHandler('HARVEST', async () => ({
      stage: 'HARVEST' as const,
      success: true,
      durationMs: 10,
      metrics: { custom: 'true' },
    }));
    const result = await pipeline.runPipeline();
    const harvestStage = result.stages.find(s => s.stage === 'HARVEST');
    expect(harvestStage?.metrics.custom).toBe('true');
  });

  it('updates config', () => {
    const pipeline = new HololandSelfImprove();
    pipeline.updateConfig({ verbose: true });
    expect(pipeline.getConfig().verbose).toBe(true);
  });

  it('exposes harvester', () => {
    const pipeline = new HololandSelfImprove();
    expect(pipeline.getHarvester()).toBeInstanceOf(VRHarvester);
  });

  it('parses CLI arguments', () => {
    const args1 = HololandSelfImprove.parseArgs(['--harvest']);
    expect(args1.harvest).toBe(true);
    expect(args1.dryRun).toBe(false);

    const args2 = HololandSelfImprove.parseArgs(['--dry-run', '--iterations', '5', '-v']);
    expect(args2.dryRun).toBe(true);
    expect(args2.iterations).toBe(5);
    expect(args2.verbose).toBe(true);

    const args3 = HololandSelfImprove.parseArgs(['--verbose']);
    expect(args3.verbose).toBe(true);
    expect(args3.iterations).toBe(10); // default
  });

  it('returns training pairs after generate stage', async () => {
    const harvester = new VRHarvester({ minQualityScore: 0 });
    harvester.registerSource('w1', [
      makeSample({ qualityScore: 0.9, data: { a: 1 } }),
      makeSample({ qualityScore: 0.5, data: { b: 2 } }),
      makeSample({ qualityScore: 0.2, data: { c: 3 } }),
    ]);
    const pipeline = new HololandSelfImprove({}, harvester);
    await pipeline.runPipeline();
    const pairs = pipeline.getTrainingPairs();
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs[0].chosen.qualityScore).toBeGreaterThan(pairs[0].rejected.qualityScore);
  });

  it('returns last harvest result', async () => {
    const harvester = new VRHarvester();
    harvester.registerSource('w1', [makeSample()]);
    const pipeline = new HololandSelfImprove({}, harvester);
    expect(pipeline.getLastHarvestResult()).toBeNull();
    await pipeline.runPipeline();
    expect(pipeline.getLastHarvestResult()).not.toBeNull();
  });
});
