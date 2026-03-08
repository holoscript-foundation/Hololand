/**
 * CrossRealityAgent Tests
 *
 * Tests the 7-phase uAA2++ lifecycle integration with BaseAgent protocol,
 * handoff decision logic, learning patterns, and adaptive timing budgets.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CrossRealityAgent,
  createCrossRealityAgent,
  type CrossRealityAgentConfig,
  type HandoffDecision,
} from '../CrossRealityAgent';
import { ProtocolPhase, type CycleResult } from '@holoscript/agent-protocol';
import type { DeviceCapabilities } from '../CrossRealityHandoffProtocol';
import type { FormFactor } from '../CrossRealityContinuityTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestAgent(overrides?: Partial<CrossRealityAgentConfig>): CrossRealityAgent {
  return createCrossRealityAgent({
    identity: {
      id: 'test-agent-1',
      name: 'TestCrossRealityAgent',
      domain: 'cross-reality',
      version: '1.0.0',
      capabilities: ['handoff', 'learning', 'adaptation'],
    },
    currentFormFactor: 'vr-headset' as FormFactor,
    autoHandoff: false,
    autoHandoffThreshold: 0.8,
    maxHandoffsPerMinute: 3,
    ...overrides,
  });
}

function createTestDevice(formFactor: FormFactor, deviceId: string): DeviceCapabilities {
  return {
    deviceId,
    formFactor,
    inputModalities: formFactor === 'vr-headset' ? ['gesture', 'voice'] : ['touch'],
    outputModalities: formFactor === 'vr-headset' ? ['stereo-3d', 'spatial-audio'] : ['screen-2d'],
    hasGeospatial: formFactor === 'phone',
    networkQuality: 'good',
    batteryLevel: 0.8,
    availableMemoryMB: 2048,
  };
}

// =============================================================================
// PHASE 0: INTAKE
// =============================================================================

describe('CrossRealityAgent - Phase 0: INTAKE', () => {
  it('should gather and filter device capabilities', async () => {
    const agent = createTestAgent();
    const devices = [
      createTestDevice('phone', 'phone-1'),
      createTestDevice('vr-headset', 'vr-1'),
    ];

    const result = await agent.intake({ discoveredDevices: devices });

    expect(result.phase).toBe(ProtocolPhase.INTAKE);
    expect(result.status).toBe('success');
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as DeviceCapabilities[]).length).toBe(2);
  });

  it('should handle array input directly', async () => {
    const agent = createTestAgent();
    const devices = [createTestDevice('phone', 'phone-1')];

    const result = await agent.intake(devices);

    expect(result.status).toBe('success');
    expect((result.data as DeviceCapabilities[]).length).toBe(1);
  });

  it('should filter out devices without form factor budgets', async () => {
    const agent = createTestAgent();
    const devices = [
      createTestDevice('phone', 'phone-1'),
      { ...createTestDevice('phone', 'invalid-1'), formFactor: 'invalid-device' as FormFactor },
    ];

    const result = await agent.intake(devices);

    expect((result.data as DeviceCapabilities[]).length).toBe(1);
    expect((result.data as DeviceCapabilities[])[0].deviceId).toBe('phone-1');
  });

  it('should handle empty device list', async () => {
    const agent = createTestAgent();

    const result = await agent.intake({ discoveredDevices: [] });

    expect(result.status).toBe('success');
    expect((result.data as DeviceCapabilities[]).length).toBe(0);
  });
});

// =============================================================================
// PHASE 1: REFLECT
// =============================================================================

describe('CrossRealityAgent - Phase 1: REFLECT', () => {
  it('should analyze handoff feasibility and return decision', async () => {
    const agent = createTestAgent();
    const devices = [createTestDevice('phone', 'phone-1')];

    const result = await agent.reflect(devices);

    expect(result.phase).toBe(ProtocolPhase.REFLECT);
    expect(result.status).toBe('success');
    const decision = result.data as HandoffDecision;
    expect(decision).toHaveProperty('shouldHandoff');
    expect(decision).toHaveProperty('targetDeviceId');
    expect(decision).toHaveProperty('confidence');
    expect(decision).toHaveProperty('reasoning');
    expect(decision).toHaveProperty('estimatedLatencyMs');
    expect(decision).toHaveProperty('gained');
    expect(decision).toHaveProperty('lost');
  });

  it('should recommend handoff to phone from VR', async () => {
    const agent = createTestAgent({ currentFormFactor: 'vr-headset' });
    const devices = [createTestDevice('phone', 'phone-1')];

    const result = await agent.reflect(devices);

    const decision = result.data as HandoffDecision;
    expect(decision.shouldHandoff).toBe(true);
    expect(decision.targetDeviceId).toBe('phone-1');
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.gained).toContain('geospatial');
  });

  it('should not recommend handoff to same form factor', async () => {
    const agent = createTestAgent({ currentFormFactor: 'vr-headset' });
    const devices = [createTestDevice('vr-headset', 'vr-2')];

    const result = await agent.reflect(devices);

    const decision = result.data as HandoffDecision;
    expect(decision.shouldHandoff).toBe(false);
  });

  it('should penalize safety-critical transitions', async () => {
    const agent = createTestAgent({ currentFormFactor: 'car' });
    const devices = [createTestDevice('vr-headset', 'vr-1')];

    const result = await agent.reflect(devices);

    const decision = result.data as HandoffDecision;
    // Car transitions should be penalized heavily - should not handoff due to low score
    expect(decision.shouldHandoff).toBe(false);
    expect(decision.reasoning).toContain('No viable handoff targets');
  });

  it('should handle no devices available', async () => {
    const agent = createTestAgent();

    const result = await agent.reflect([]);

    const decision = result.data as HandoffDecision;
    expect(decision.shouldHandoff).toBe(false);
    expect(decision.reasoning).toBe('No devices available');
  });
});

// =============================================================================
// PHASE 2: EXECUTE
// =============================================================================

describe('CrossRealityAgent - Phase 2: EXECUTE', () => {
  it('should skip execution when no handoff recommended', async () => {
    const agent = createTestAgent();
    const decision: HandoffDecision = {
      shouldHandoff: false,
      targetDeviceId: null,
      confidence: 0,
      reasoning: 'No viable targets',
      estimatedLatencyMs: 0,
      gained: [],
      lost: [],
    };

    const result = await agent.execute(decision);

    expect(result.phase).toBe(ProtocolPhase.EXECUTE);
    expect(result.status).toBe('skipped');
    expect((result.data as any).action).toBe('no-handoff');
  });

  it('should execute handoff when recommended', async () => {
    const agent = createTestAgent();
    const decision: HandoffDecision = {
      shouldHandoff: true,
      targetDeviceId: 'phone-1',
      confidence: 0.9,
      reasoning: 'Best target available',
      estimatedLatencyMs: 200,
      gained: ['geospatial'],
      lost: [],
    };

    const handoffEvents: any[] = [];
    agent.on('handoff:recommended', (event) => handoffEvents.push(event));

    const result = await agent.execute(decision);

    expect(result.status).toBe('success');
    expect((result.data as any).action).toBe('handoff-recommended');
    expect(handoffEvents.length).toBe(1);
    expect(handoffEvents[0].targetDeviceId).toBe('phone-1');
  });

  it('should enforce rate limiting', async () => {
    const agent = createTestAgent({ maxHandoffsPerMinute: 2 });
    const decision: HandoffDecision = {
      shouldHandoff: true,
      targetDeviceId: 'phone-1',
      confidence: 0.9,
      reasoning: 'Test',
      estimatedLatencyMs: 200,
      gained: [],
      lost: [],
    };

    // Execute 2 handoffs (should succeed)
    await agent.execute(decision);
    await agent.execute(decision);

    // Third handoff should be rate limited
    const result = await agent.execute(decision);

    expect(result.status).toBe('skipped');
    expect((result.data as any).action).toBe('rate-limited');
  });

  it('should enforce auto-handoff threshold', async () => {
    const agent = createTestAgent({ autoHandoff: true, autoHandoffThreshold: 0.8 });
    const decision: HandoffDecision = {
      shouldHandoff: true,
      targetDeviceId: 'phone-1',
      confidence: 0.5, // Below threshold
      reasoning: 'Low confidence',
      estimatedLatencyMs: 200,
      gained: [],
      lost: [],
    };

    const result = await agent.execute(decision);

    expect(result.status).toBe('skipped');
    expect((result.data as any).action).toBe('below-threshold');
  });
});

// =============================================================================
// PHASE 3: COMPRESS
// =============================================================================

describe('CrossRealityAgent - Phase 3: COMPRESS', () => {
  it('should compress and trim cycle history', async () => {
    const agent = createTestAgent();

    const result = await agent.compress({ test: 'data' });

    expect(result.phase).toBe(ProtocolPhase.COMPRESS);
    expect(result.status).toBe('success');
    expect(result.data).toEqual({ test: 'data' });
  });

  it('should trim cycle history to last 50 entries', async () => {
    const agent = createTestAgent();

    // Simulate 60 cycles
    for (let i = 0; i < 60; i++) {
      (agent as any).cycleHistory.push({
        cycleId: `cycle-${i}`,
        task: 'test',
        domain: 'cross-reality',
        phases: [],
        status: 'complete',
        totalDurationMs: 100,
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
    }

    await agent.compress({});

    const history = agent.getCycleHistory();
    expect(history.length).toBe(50);
  });

  it('should trim learnings to last 100 entries', async () => {
    const agent = createTestAgent();

    // Simulate 150 learnings
    for (let i = 0; i < 150; i++) {
      agent.recordHandoffOutcome('vr-headset', 'phone', true, 200, 200, 'positive');
    }

    await agent.compress({});

    const learnings = agent.getLearnings();
    expect(learnings.length).toBe(100);
  });
});

// =============================================================================
// PHASE 4: REINTAKE
// =============================================================================

describe('CrossRealityAgent - Phase 4: REINTAKE', () => {
  it('should re-evaluate post-handoff state', async () => {
    const agent = createTestAgent();

    const result = await agent.reintake({ compressed: 'data' });

    expect(result.phase).toBe(ProtocolPhase.REINTAKE);
    expect(result.status).toBe('success');
    expect((result.data as any).currentFormFactor).toBe('vr-headset');
    expect((result.data as any).learningsCount).toBe(0);
  });

  it('should reflect current learnings count', async () => {
    const agent = createTestAgent();
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 200, 200);

    const result = await agent.reintake({});

    expect((result.data as any).learningsCount).toBe(1);
  });
});

// =============================================================================
// PHASE 5: GROW
// =============================================================================

describe('CrossRealityAgent - Phase 5: GROW', () => {
  it('should learn from handoff patterns', async () => {
    const agent = createTestAgent();

    const result = await agent.grow({});

    expect(result.phase).toBe(ProtocolPhase.GROW);
    expect(result.status).toBe('success');
    expect((result.data as any).pairStats).toBeDefined();
    expect((result.data as any).totalLearnings).toBe(0);
  });

  it('should compute success rate per form factor pair', async () => {
    const agent = createTestAgent();

    // Record successful handoffs
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 180, 200);
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 220, 200);
    // Record failed handoff
    agent.recordHandoffOutcome('vr-headset', 'phone', false, 500, 200);

    const result = await agent.grow({});

    const pairStats = (result.data as any).pairStats;
    expect(pairStats['vr-headset->phone']).toEqual({ success: 2, total: 3 });
  });

  it('should track multiple form factor pairs', async () => {
    const agent = createTestAgent();

    agent.recordHandoffOutcome('vr-headset', 'phone', true, 200, 200);
    agent.recordHandoffOutcome('phone', 'vr-headset', true, 300, 250);

    const result = await agent.grow({});

    const pairStats = (result.data as any).pairStats;
    expect(pairStats['vr-headset->phone']).toBeDefined();
    expect(pairStats['phone->vr-headset']).toBeDefined();
  });
});

// =============================================================================
// PHASE 6: EVOLVE
// =============================================================================

describe('CrossRealityAgent - Phase 6: EVOLVE', () => {
  it('should adapt timing budgets based on learnings', async () => {
    const agent = createTestAgent();

    const result = await agent.evolve({});

    expect(result.phase).toBe(ProtocolPhase.EVOLVE);
    expect(result.status).toBe('success');
    expect((result.data as any).adaptiveBudgets).toBeDefined();
  });

  it('should update adaptive latency using exponential moving average', async () => {
    const agent = createTestAgent();

    // Record handoffs with varying latencies
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 180, 200);
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 220, 200);
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 200, 200);

    const result = await agent.evolve({});

    const budgets = (result.data as any).adaptiveBudgets;
    expect(budgets['vr-headset->phone']).toBeGreaterThan(0);
    expect(budgets['vr-headset->phone']).toBeLessThan(300);
  });

  it('should only use last 20 learnings for evolution', async () => {
    const agent = createTestAgent();

    // Record 30 learnings
    for (let i = 0; i < 30; i++) {
      agent.recordHandoffOutcome('vr-headset', 'phone', true, 200, 200);
    }

    const result = await agent.evolve({});

    // Adaptive budgets should exist for the pair
    const budgets = (result.data as any).adaptiveBudgets;
    expect(budgets['vr-headset->phone']).toBeDefined();
  });
});

// =============================================================================
// FULL 7-PHASE CYCLE
// =============================================================================

describe('CrossRealityAgent - Full 7-Phase Cycle', () => {
  it('should complete full cycle for VR to phone handoff', async () => {
    const agent = createTestAgent({ currentFormFactor: 'vr-headset' });
    const devices = [
      createTestDevice('phone', 'phone-1'),
      createTestDevice('desktop', 'desktop-1'),
    ];

    const result = await agent.runCycle('evaluate-handoff', { discoveredDevices: devices });

    expect(result.status).toBe('complete');
    expect(result.phases.length).toBe(7);
    expect(result.phases[0].phase).toBe(ProtocolPhase.INTAKE);
    expect(result.phases[1].phase).toBe(ProtocolPhase.REFLECT);
    expect(result.phases[2].phase).toBe(ProtocolPhase.EXECUTE);
    expect(result.phases[3].phase).toBe(ProtocolPhase.COMPRESS);
    expect(result.phases[4].phase).toBe(ProtocolPhase.REINTAKE);
    expect(result.phases[5].phase).toBe(ProtocolPhase.GROW);
    expect(result.phases[6].phase).toBe(ProtocolPhase.EVOLVE);
  });

  it('should emit cycle:complete event', async () => {
    const agent = createTestAgent();
    const devices = [createTestDevice('phone', 'phone-1')];

    const events: any[] = [];
    agent.on('cycle:complete', (event) => events.push(event));

    await agent.runCycle('test-cycle', { discoveredDevices: devices });

    expect(events.length).toBe(1);
    expect(events[0].task).toBe('test-cycle');
    expect(events[0].status).toBe('complete');
  });

  it('should store cycle in history', async () => {
    const agent = createTestAgent();
    const devices = [createTestDevice('phone', 'phone-1')];

    await agent.runCycle('test-cycle', { discoveredDevices: devices });

    const history = agent.getCycleHistory();
    expect(history.length).toBe(1);
    expect(history[0].task).toBe('test-cycle');
  });

  it('should handle partial failures gracefully', async () => {
    const agent = createTestAgent();

    // Mock reflect to fail
    const originalReflect = agent.reflect.bind(agent);
    vi.spyOn(agent, 'reflect').mockImplementation(async () => {
      throw new Error('Simulated reflect failure');
    });

    const devices = [createTestDevice('phone', 'phone-1')];
    const result = await agent.runCycle('failing-cycle', { discoveredDevices: devices });

    expect(result.status).toBe('partial');
    expect(result.phases[1].status).toBe('failure');

    // Restore original
    vi.mocked(agent.reflect).mockRestore();
  });
});

// =============================================================================
// LEARNING & METRICS
// =============================================================================

describe('CrossRealityAgent - Learning & Metrics', () => {
  it('should record handoff outcomes', () => {
    const agent = createTestAgent();

    agent.recordHandoffOutcome('vr-headset', 'phone', true, 200, 200, 'positive');

    const learnings = agent.getLearnings();
    expect(learnings.length).toBe(1);
    expect(learnings[0].from).toBe('vr-headset');
    expect(learnings[0].to).toBe('phone');
    expect(learnings[0].success).toBe(true);
    expect(learnings[0].actualLatencyMs).toBe(200);
    expect(learnings[0].userSatisfaction).toBe('positive');
  });

  it('should emit learning:recorded event', () => {
    const agent = createTestAgent();

    const events: any[] = [];
    agent.on('learning:recorded', (event) => events.push(event));

    agent.recordHandoffOutcome('vr-headset', 'phone', true, 200, 200);

    expect(events.length).toBe(1);
    expect(events[0].from).toBe('vr-headset');
    expect(events[0].success).toBe(true);
  });

  it('should provide agent metrics', () => {
    const agent = createTestAgent();

    agent.recordHandoffOutcome('vr-headset', 'phone', true, 180, 200, 'positive');
    agent.recordHandoffOutcome('vr-headset', 'phone', false, 500, 200, 'negative');

    const metrics = agent.getMetrics();

    expect(metrics.identity.id).toBe('test-agent-1');
    expect(metrics.currentFormFactor).toBe('vr-headset');
    expect(metrics.totalLearnings).toBe(2);
    expect(metrics.overallSuccessRate).toBe(0.5);
    expect(metrics.averageLatencyMs).toBe(340);
    expect(metrics.autoHandoff).toBe(false);
  });

  it('should update form factor after handoff', () => {
    const agent = createTestAgent({ currentFormFactor: 'vr-headset' });

    agent.updateFormFactor('phone');

    const metrics = agent.getMetrics();
    expect(metrics.currentFormFactor).toBe('phone');
  });
});

// =============================================================================
// FACTORY
// =============================================================================

describe('CrossRealityAgent - Factory', () => {
  it('should create agent via factory function', () => {
    const agent = createCrossRealityAgent({
      identity: {
        id: 'factory-test',
        name: 'FactoryTestAgent',
        domain: 'cross-reality',
        version: '1.0.0',
        capabilities: ['handoff'],
      },
      currentFormFactor: 'phone',
    });

    expect(agent).toBeInstanceOf(CrossRealityAgent);
    expect(agent.identity.id).toBe('factory-test');
  });
});
