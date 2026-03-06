import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecuTorchRuntime } from '../ExecuTorchRuntime';
import { NPUDelegate } from '../NPUDelegate';
import { AsyncAgentLoop } from '../AsyncAgentLoop';
import { ThermalManager } from '../ThermalManager';

describe('ExecuTorchRuntime', () => {
  let runtime: ExecuTorchRuntime;
  beforeEach(async () => {
    runtime = new ExecuTorchRuntime({ maxModelsLoaded: 3, memoryBudgetBytes: 1_000_000 });
    await runtime.initialize();
  });
  afterEach(async () => { await runtime.shutdown(); });

  it('initializes', () => { expect(runtime.isInitialized()).toBe(true); });

  it('loads models within budget', async () => {
    expect(await runtime.loadModel({ modelId: 'm1', path: '/m1', sizeBytes: 500_000, quantization: 'int8', delegate: 'npu', maxBatchSize: 1, inputShape: [1, 128], outputShape: [1, 64] })).toBe(true);
    expect(runtime.getLoadedModelCount()).toBe(1);
  });

  it('rejects models exceeding budget', async () => {
    await runtime.loadModel({ modelId: 'm1', path: '/m1', sizeBytes: 900_000, quantization: 'int8', delegate: 'npu', maxBatchSize: 1, inputShape: [1, 128], outputShape: [1, 64] });
    expect(await runtime.loadModel({ modelId: 'm2', path: '/m2', sizeBytes: 200_000, quantization: 'int8', delegate: 'npu', maxBatchSize: 1, inputShape: [1, 128], outputShape: [1, 64] })).toBe(false);
  });

  it('runs inference', async () => {
    await runtime.loadModel({ modelId: 'm1', path: '/m1', sizeBytes: 100_000, quantization: 'int8', delegate: 'npu', maxBatchSize: 1, inputShape: [1, 128], outputShape: [1, 64] });
    const result = await runtime.infer('m1', new Float32Array(128));
    expect(result).not.toBeNull();
    expect(result!.output.length).toBe(64);
  });

  it('unloads models', async () => {
    await runtime.loadModel({ modelId: 'm1', path: '/m1', sizeBytes: 100_000, quantization: 'int8', delegate: 'npu', maxBatchSize: 1, inputShape: [1, 128], outputShape: [1, 64] });
    await runtime.unloadModel('m1');
    expect(runtime.getLoadedModelCount()).toBe(0);
    expect(runtime.getMemoryUsed()).toBe(0);
  });
});

describe('NPUDelegate', () => {
  let delegate: NPUDelegate;
  beforeEach(() => { delegate = new NPUDelegate({ maxConcurrentOps: 2, thermalThrottleTemp: 80 }); });

  it('selects NPU when available', () => { expect(delegate.selectDelegate()).toBe('npu'); });

  it('falls back when thermally throttled', () => {
    delegate.updateTemperature(85);
    expect(delegate.selectDelegate()).not.toBe('npu');
  });

  it('falls back when NPU unavailable', () => {
    delegate.setNPUAvailable(false);
    expect(delegate.selectDelegate()).not.toBe('npu');
  });

  it('tracks active ops', () => {
    delegate.acquireOp();
    delegate.acquireOp();
    expect(delegate.getStatus().activeOps).toBe(2);
    delegate.releaseOp();
    expect(delegate.getStatus().activeOps).toBe(1);
  });
});

describe('AsyncAgentLoop', () => {
  let loop: AsyncAgentLoop;
  afterEach(() => { loop?.stop(); });

  beforeEach(() => { loop = new AsyncAgentLoop({ targetFrequencyHz: 100, maxAgentsPerTick: 5 }); });

  it('registers and unregisters agents', () => {
    loop.registerAgent('a1', async () => {});
    expect(loop.getAgentCount()).toBe(1);
    loop.unregisterAgent('a1');
    expect(loop.getAgentCount()).toBe(0);
  });

  it('starts and stops', () => {
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });
});

describe('ThermalManager', () => {
  let thermal: ThermalManager;
  beforeEach(() => { thermal = new ThermalManager({ warmThreshold: 55, hotThreshold: 75, criticalThreshold: 85 }); });

  it('classifies thermal states', () => {
    thermal.updateTemperature(40);
    expect(thermal.getState()).toBe('cool');
    thermal.updateTemperature(60);
    expect(thermal.getState()).toBe('warm');
    thermal.updateTemperature(80);
    expect(thermal.getState()).toBe('hot');
    thermal.updateTemperature(90);
    expect(thermal.getState()).toBe('critical');
  });

  it('recommends workload reduction', () => {
    thermal.updateTemperature(40);
    expect(thermal.getWorkloadReduction()).toBe(0);
    thermal.updateTemperature(80);
    expect(thermal.getWorkloadReduction()).toBe(0.5);
  });

  it('detects emergency shutdown', () => {
    thermal.updateTemperature(90);
    expect(thermal.shouldEmergencyShutdown()).toBe(true);
  });
});
