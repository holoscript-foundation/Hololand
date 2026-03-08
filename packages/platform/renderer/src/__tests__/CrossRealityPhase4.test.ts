/**
 * Cross-Reality Phase 4 Tests
 *
 * 1. CrossRealityAgent extends BaseAgent (7-phase integration)
 * 2. Extended platform support (car, wearable, desktop)
 * 3. Goal synthesis (AUTONOMIZE phase)
 * 4. Backwards compatibility aliases
 * 5. Learning & evolution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CrossRealityAgent,
  createCrossRealityAgent,
  AgentPhase,
  type AgentPhaseResult,
  type AgentCycleResult,
  type CrossRealityAgentIdentity,
  type HandoffDecision,
} from '../CrossRealityAgent';
import {
  BaseAgent,
  ProtocolPhase,
  type PhaseResult,
  type CycleResult,
} from '@holoscript/agent-protocol';
import type { DeviceCapabilities } from '../CrossRealityHandoffProtocol';
import { FORM_FACTOR_BUDGETS, DEFAULT_EMBODIMENT } from '../CrossRealityContinuityTypes';
import type { FormFactor } from '../CrossRealityContinuityTypes';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const TEST_IDENTITY = {
  id: 'agent-test-001',
  name: 'TestAgent',
  domain: 'cross-reality',
  version: '4.0.0',
  capabilities: ['handoff', 'spatial', 'mvc'],
};

function makeDevice(formFactor: FormFactor, overrides: Partial<DeviceCapabilities> = {}): DeviceCapabilities {
  return {
    deviceId: `device-${formFactor}`,
    formFactor,
    embodiments: [],
    inputModalities: ['touch'],
    hasGeospatial: false,
    maxPayloadBytes: 10240,
    ...overrides,
  } as DeviceCapabilities;
}

// =============================================================================
// 1. BaseAgent Integration
// =============================================================================

describe('CrossRealityAgent extends BaseAgent', () => {
  let agent: CrossRealityAgent;

  beforeEach(() => {
    agent = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: 'phone' });
  });

  it('is an instance of BaseAgent', () => {
    expect(agent).toBeInstanceOf(BaseAgent);
    expect(agent).toBeInstanceOf(CrossRealityAgent);
  });

  it('has identity matching AgentIdentity', () => {
    expect(agent.identity).toEqual(TEST_IDENTITY);
    expect(agent.identity.domain).toBe('cross-reality');
  });

  it('implements all 7 abstract phase methods', () => {
    expect(typeof agent.intake).toBe('function');
    expect(typeof agent.reflect).toBe('function');
    expect(typeof agent.execute).toBe('function');
    expect(typeof agent.compress).toBe('function');
    expect(typeof agent.reintake).toBe('function');
    expect(typeof agent.grow).toBe('function');
    expect(typeof agent.evolve).toBe('function');
  });

  it('runCycle completes all 7 phases via BaseAgent', async () => {
    const devices = [makeDevice('desktop', { inputModalities: ['keyboard', 'mouse'] })];
    const result = await agent.evaluateHandoff('test-handoff', { discoveredDevices: devices });

    expect(result.status).toBe('complete');
    expect(result.phases).toHaveLength(7);
    expect(result.cycleId).toMatch(/^cycle_/);
    expect(result.task).toBe('test-handoff');
    expect(result.domain).toBe('cross-reality');

    const phaseNumbers = result.phases.map(p => p.phase);
    expect(phaseNumbers).toEqual([
      ProtocolPhase.INTAKE,
      ProtocolPhase.REFLECT,
      ProtocolPhase.EXECUTE,
      ProtocolPhase.COMPRESS,
      ProtocolPhase.REINTAKE,
      ProtocolPhase.GROW,
      ProtocolPhase.EVOLVE,
    ]);
  });

  it('records cycle in history and emits event', async () => {
    const events: any[] = [];
    agent.on('cycle:complete', (e: any) => events.push(e));
    await agent.evaluateHandoff('test', { discoveredDevices: [] });
    expect(agent.getCycleHistory()).toHaveLength(1);
    expect(events).toHaveLength(1);
  });

  it('intake filters devices by known form factors', async () => {
    const result = await agent.intake({
      discoveredDevices: [
        makeDevice('desktop'),
        makeDevice('vr-headset'),
        { deviceId: 'bad', formFactor: 'hologram' as any, embodiments: [], inputModalities: [], hasGeospatial: false, maxPayloadBytes: 0 },
      ],
    });
    const viable = result.data as DeviceCapabilities[];
    expect(viable).toHaveLength(2);
  });

  it('reflect recommends handoff to better device', async () => {
    const a = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: 'wearable' });
    const result = await a.reflect([makeDevice('desktop', { inputModalities: ['keyboard'], hasGeospatial: true })]);
    const decision = result.data as HandoffDecision;
    expect(decision.shouldHandoff).toBe(true);
    expect(decision.targetDeviceId).toBe('device-desktop');
  });

  it('reflect does not recommend same form factor', async () => {
    const result = await agent.reflect([makeDevice('phone')]);
    const decision = result.data as HandoffDecision;
    expect(decision.shouldHandoff).toBe(false);
  });

  it('execute skips when no handoff', async () => {
    const result = await agent.execute({ shouldHandoff: false, reasoning: 'No targets' });
    expect(result.status).toBe('skipped');
    expect((result.data as any).action).toBe('no-handoff');
  });

  it('execute enforces rate limiting', async () => {
    const a = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: 'phone', maxHandoffsPerMinute: 1 });
    await a.execute({ shouldHandoff: true, confidence: 0.9, targetDeviceId: 'x', reasoning: 'test', estimatedLatencyMs: 100, gained: [], lost: [] });
    const result = await a.execute({ shouldHandoff: true, confidence: 0.9, targetDeviceId: 'x', reasoning: 'test', estimatedLatencyMs: 100, gained: [], lost: [] });
    expect(result.status).toBe('skipped');
    expect((result.data as any).action).toBe('rate-limited');
  });
});

// =============================================================================
// 2. Extended Platform Support
// =============================================================================

describe('Extended Platform Support', () => {
  const ALL_FORM_FACTORS: FormFactor[] = ['vr-headset', 'ar-glasses', 'phone', 'desktop', 'car', 'wearable'];

  it('all 6 form factors have budget definitions', () => {
    for (const ff of ALL_FORM_FACTORS) {
      expect(FORM_FACTOR_BUDGETS[ff]).toBeDefined();
      expect(FORM_FACTOR_BUDGETS[ff].frameBudgetMs).toBeGreaterThan(0);
      expect(FORM_FACTOR_BUDGETS[ff].agentBudgetMs).toBeGreaterThan(0);
    }
  });

  it('all 6 form factors have default embodiments', () => {
    for (const ff of ALL_FORM_FACTORS) {
      expect(DEFAULT_EMBODIMENT[ff]).toBeDefined();
    }
  });

  it('car uses safety-critical compute model', () => {
    expect(FORM_FACTOR_BUDGETS['car'].computeModel).toBe('safety-critical');
  });

  it('car has VoiceOnly embodiment', () => {
    expect(DEFAULT_EMBODIMENT['car']).toBe('VoiceOnly');
  });

  it('desktop has UI2D embodiment', () => {
    expect(DEFAULT_EMBODIMENT['desktop']).toBe('UI2D');
  });

  it('wearable has UIMinimal embodiment', () => {
    expect(DEFAULT_EMBODIMENT['wearable']).toBe('UIMinimal');
  });

  it('car handoff has safety penalty in scoring', async () => {
    const a = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: 'car' });
    const result = await a.reflect([makeDevice('vr-headset', { inputModalities: ['gesture'] })]);
    const decision = result.data as HandoffDecision;
    // Car transitions are penalized so heavily that no handoff is recommended
    expect(decision.shouldHandoff).toBe(false);
  });

  it('agent can be created for each form factor', () => {
    for (const ff of ALL_FORM_FACTORS) {
      const a = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: ff });
      expect(a.getMetrics().currentFormFactor).toBe(ff);
    }
  });

  it('updateFormFactor changes current platform', () => {
    const a = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: 'phone' });
    a.updateFormFactor('car');
    expect(a.getMetrics().currentFormFactor).toBe('car');
  });
});

// =============================================================================
// 3. Goal Synthesis (AUTONOMIZE)
// =============================================================================

describe('Goal Synthesis', () => {
  it('synthesizeGoal returns valid goal', () => {
    const a = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: 'phone' });
    const goal = a.synthesizeGoal();
    expect(goal.id).toMatch(/^GOAL-/);
    expect(goal.description).toBeTruthy();
    expect(goal.category).toBe('self-improvement');
    expect(goal.source).toBe('autonomous-boredom');
  });
});

// =============================================================================
// 4. Backwards Compatibility
// =============================================================================

describe('Backwards Compatibility Aliases', () => {
  it('AgentPhase equals ProtocolPhase', () => {
    expect(AgentPhase).toBe(ProtocolPhase);
    expect(AgentPhase.INTAKE).toBe(ProtocolPhase.INTAKE);
    expect(AgentPhase.EVOLVE).toBe(ProtocolPhase.EVOLVE);
  });

  it('AgentPhaseResult is assignable from PhaseResult', () => {
    const pr: PhaseResult = { phase: ProtocolPhase.INTAKE, status: 'success', data: null, durationMs: 0, timestamp: 0 };
    const apr: AgentPhaseResult = pr;
    expect(apr.phase).toBe(ProtocolPhase.INTAKE);
  });

  it('factory returns BaseAgent instance', () => {
    const a = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: 'desktop' });
    expect(a).toBeInstanceOf(BaseAgent);
  });
});

// =============================================================================
// 5. Learning & Evolution
// =============================================================================

describe('Learning and Evolution', () => {
  it('recordHandoffOutcome stores and emits', () => {
    const a = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: 'phone' });
    const events: any[] = [];
    a.on('learning:recorded', (e: any) => events.push(e));
    a.recordHandoffOutcome('phone', 'desktop', true, 150, 200, 'positive');
    expect(a.getLearnings()).toHaveLength(1);
    expect(a.getLearnings()[0].from).toBe('phone');
    expect(events).toHaveLength(1);
  });

  it('evolve adapts timing budgets', async () => {
    const a = createCrossRealityAgent({ identity: TEST_IDENTITY, currentFormFactor: 'phone' });
    a.recordHandoffOutcome('phone', 'desktop', true, 120, 200);
    a.recordHandoffOutcome('phone', 'desktop', true, 130, 200);
    const result = await a.evolve(null);
    const budgets = (result.data as any).adaptiveBudgets;
    expect(budgets['phone->desktop']).toBeDefined();
    expect(budgets['phone->desktop']).toBeGreaterThan(0);
  });
});
