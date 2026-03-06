import { describe, it, expect } from 'vitest';
import { SpatialPhaseManager, ProtocolPhase } from '../SpatialPhase';
import { HapticFeedbackManager } from '../HapticFeedback';
import { EmbodiedProtocol } from '../EmbodiedProtocol';

// ── SpatialPhaseManager ──────────────────────────────────────────────────────

describe('SpatialPhaseManager', () => {
  it('returns all 8 default environments', () => {
    const mgr = new SpatialPhaseManager();
    const envs = mgr.getAllEnvironments();
    expect(envs.length).toBe(8);
  });

  it('retrieves INTAKE environment by phase', () => {
    const mgr = new SpatialPhaseManager();
    const env = mgr.getEnvironment(ProtocolPhase.INTAKE);
    expect(env).toBeDefined();
    expect(env!.roomId).toBe('intake-nexus');
    expect(env!.geometry.shape).toBe('sphere');
  });

  it('allows agent to enter a phase', () => {
    const mgr = new SpatialPhaseManager();
    const result = mgr.enterPhase('agent-1', ProtocolPhase.INTAKE);
    expect(result.success).toBe(true);
    expect(result.environment).toBeDefined();
    expect(mgr.getAgentPhase('agent-1')).toBe(ProtocolPhase.INTAKE);
  });

  it('rejects entry when at max capacity', () => {
    const mgr = new SpatialPhaseManager();
    // REFLECT has maxOccupants = 3
    mgr.enterPhase('a1', ProtocolPhase.REFLECT);
    mgr.enterPhase('a2', ProtocolPhase.REFLECT);
    mgr.enterPhase('a3', ProtocolPhase.REFLECT);
    const result = mgr.enterPhase('a4', ProtocolPhase.REFLECT);
    expect(result.success).toBe(false);
    expect(result.error).toContain('max capacity');
  });

  it('tracks occupants per phase', () => {
    const mgr = new SpatialPhaseManager();
    mgr.enterPhase('a1', ProtocolPhase.EXECUTE);
    mgr.enterPhase('a2', ProtocolPhase.EXECUTE);
    mgr.enterPhase('a3', ProtocolPhase.INTAKE);
    expect(mgr.getOccupants(ProtocolPhase.EXECUTE)).toEqual(['a1', 'a2']);
    expect(mgr.getOccupants(ProtocolPhase.INTAKE)).toEqual(['a3']);
  });

  it('exits agent from phase', () => {
    const mgr = new SpatialPhaseManager();
    mgr.enterPhase('a1', ProtocolPhase.COMPRESS);
    expect(mgr.exitPhase('a1')).toBe(true);
    expect(mgr.getAgentPhase('a1')).toBeNull();
  });

  it('logs transitions', () => {
    const mgr = new SpatialPhaseManager();
    mgr.enterPhase('a1', ProtocolPhase.INTAKE);
    mgr.enterPhase('a1', ProtocolPhase.COMPRESS);
    const log = mgr.getTransitionLog();
    expect(log.length).toBe(2);
    expect(log[0].from).toBeNull();
    expect(log[0].to).toBe(ProtocolPhase.INTAKE);
    expect(log[1].from).toBe(ProtocolPhase.INTAKE);
    expect(log[1].to).toBe(ProtocolPhase.COMPRESS);
  });

  it('returns standard 8-phase cycle', () => {
    const mgr = new SpatialPhaseManager();
    const cycle = mgr.getStandardCycle();
    expect(cycle.length).toBe(8);
    expect(cycle[0]).toBe(ProtocolPhase.INTAKE);
    expect(cycle[7]).toBe(ProtocolPhase.COMPOUND);
  });

  it('validates forward transitions', () => {
    const mgr = new SpatialPhaseManager();
    expect(mgr.isValidTransition(null, ProtocolPhase.INTAKE)).toBe(true);
    expect(mgr.isValidTransition(ProtocolPhase.INTAKE, ProtocolPhase.COMPRESS)).toBe(true);
    expect(mgr.isValidTransition(ProtocolPhase.COMPOUND, ProtocolPhase.INTAKE)).toBe(true);
  });

  it('rejects invalid transitions', () => {
    const mgr = new SpatialPhaseManager();
    expect(mgr.isValidTransition(null, ProtocolPhase.EXECUTE)).toBe(false);
    expect(mgr.isValidTransition(ProtocolPhase.INTAKE, ProtocolPhase.EXECUTE)).toBe(false);
    expect(mgr.isValidTransition(ProtocolPhase.REFLECT, ProtocolPhase.INTAKE)).toBe(false);
  });
});

// ── HapticFeedbackManager ────────────────────────────────────────────────────

describe('HapticFeedbackManager', () => {
  it('returns all builtin patterns', () => {
    const mgr = new HapticFeedbackManager();
    const patterns = mgr.getAllPatterns();
    expect(patterns.length).toBe(8);
  });

  it('retrieves pattern by name', () => {
    const mgr = new HapticFeedbackManager();
    const p = mgr.getPattern('gentle-pulse');
    expect(p).toBeDefined();
    expect(p!.frequency).toBe(20);
    expect(p!.waveform).toBe('sine');
  });

  it('triggers a pattern for an agent', () => {
    const mgr = new HapticFeedbackManager();
    const result = mgr.trigger('power-surge', 'agent-1', 'EXECUTE');
    expect(result.success).toBe(true);
    expect(result.pattern!.name).toBe('power-surge');
    expect(mgr.getEventLog().length).toBe(1);
  });

  it('rejects unknown pattern', () => {
    const mgr = new HapticFeedbackManager();
    const result = mgr.trigger('nonexistent', 'agent-1', 'INTAKE');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown haptic pattern');
  });

  it('tracks active patterns per agent', () => {
    const mgr = new HapticFeedbackManager();
    mgr.trigger('gentle-pulse', 'a1', 'INTAKE');
    mgr.trigger('deep-resonance', 'a1', 'REFLECT');
    mgr.trigger('power-surge', 'a2', 'EXECUTE');
    expect(mgr.getActivePatterns('a1').length).toBe(2);
    expect(mgr.getActivePatterns('a2').length).toBe(1);
  });

  it('stops a specific pattern', () => {
    const mgr = new HapticFeedbackManager();
    mgr.trigger('gentle-pulse', 'a1', 'INTAKE');
    expect(mgr.stop('gentle-pulse', 'a1')).toBe(true);
    expect(mgr.getActivePatterns('a1').length).toBe(0);
  });

  it('stops all patterns for an agent', () => {
    const mgr = new HapticFeedbackManager();
    mgr.trigger('gentle-pulse', 'a1', 'INTAKE');
    mgr.trigger('deep-resonance', 'a1', 'REFLECT');
    expect(mgr.stopAll('a1')).toBe(2);
    expect(mgr.getActivePatterns('a1').length).toBe(0);
  });

  it('computes blended amplitude via RMS', () => {
    const mgr = new HapticFeedbackManager();
    mgr.trigger('gentle-pulse', 'a1', 'INTAKE'); // amplitude 0.3
    mgr.trigger('power-surge', 'a1', 'EXECUTE'); // amplitude 0.9
    const blended = mgr.getBlendedAmplitude('a1');
    // RMS of 0.3 and 0.9: sqrt((0.09 + 0.81) / 2) = sqrt(0.45) ≈ 0.6708
    expect(blended).toBeCloseTo(0.6708, 2);
  });

  it('returns 0 amplitude for no active patterns', () => {
    const mgr = new HapticFeedbackManager();
    expect(mgr.getBlendedAmplitude('nobody')).toBe(0);
  });

  it('registers custom patterns', () => {
    const mgr = new HapticFeedbackManager();
    mgr.registerPattern({
      name: 'custom-vibe',
      frequency: 100,
      amplitude: 0.5,
      durationMs: 400,
      waveform: 'triangle',
      repeatCount: 2,
      channels: ['chest'],
    });
    expect(mgr.getPattern('custom-vibe')).toBeDefined();
    const result = mgr.trigger('custom-vibe', 'a1', 'EVOLVE');
    expect(result.success).toBe(true);
  });
});

// ── EmbodiedProtocol ─────────────────────────────────────────────────────────

describe('EmbodiedProtocol', () => {
  it('registers and retrieves agents', () => {
    const protocol = new EmbodiedProtocol();
    const agent = protocol.registerAgent('a1', 'TestAgent');
    expect(agent.id).toBe('a1');
    expect(agent.cycleCount).toBe(0);
    expect(protocol.getAgent('a1')).toBeDefined();
  });

  it('advances agent through phases sequentially', () => {
    const protocol = new EmbodiedProtocol();
    protocol.registerAgent('a1', 'TestAgent');

    const r1 = protocol.advancePhase('a1', { topic: 'VR worlds' });
    expect(r1.success).toBe(true);
    expect(r1.phase).toBe(ProtocolPhase.INTAKE);
    expect(r1.hapticTriggered).toBe(true);

    const r2 = protocol.advancePhase('a1', r1.data);
    expect(r2.success).toBe(true);
    expect(r2.phase).toBe(ProtocolPhase.COMPRESS);
  });

  it('returns failure for unknown agent', () => {
    const protocol = new EmbodiedProtocol();
    const result = protocol.advancePhase('unknown', {});
    expect(result.success).toBe(false);
  });

  it('executes a full 8-phase cycle', async () => {
    const protocol = new EmbodiedProtocol();
    protocol.registerAgent('a1', 'CycleAgent');

    const result = await protocol.executeCycle('a1', { query: 'Build a VR forest' });
    expect(result.success).toBe(true);
    expect(result.phases.length).toBe(8);
    expect(result.compoundedKnowledge).toBeDefined();

    const agent = protocol.getAgent('a1')!;
    expect(agent.cycleCount).toBe(1);
  });

  it('returns failure cycle for unknown agent', async () => {
    const protocol = new EmbodiedProtocol();
    const result = await protocol.executeCycle('ghost', {});
    expect(result.success).toBe(false);
    expect(result.phases.length).toBe(0);
  });

  it('provides spatial environment for current phase', () => {
    const protocol = new EmbodiedProtocol();
    protocol.registerAgent('a1', 'EnvAgent');
    protocol.advancePhase('a1', {});
    const env = protocol.getAgentEnvironment('a1');
    expect(env).not.toBeNull();
    expect(env!.roomId).toBe('intake-nexus');
  });

  it('provides active haptic info', () => {
    const protocol = new EmbodiedProtocol();
    protocol.registerAgent('a1', 'HapticAgent');
    protocol.advancePhase('a1', {});
    const haptics = protocol.getAgentHaptics('a1');
    expect(haptics.length).toBeGreaterThan(0);
    expect(protocol.getAgentHapticAmplitude('a1')).toBeGreaterThan(0);
  });

  it('removes agent and cleans up', () => {
    const protocol = new EmbodiedProtocol();
    protocol.registerAgent('a1', 'RemoveMe');
    protocol.advancePhase('a1', {});
    expect(protocol.removeAgent('a1')).toBe(true);
    expect(protocol.getAgent('a1')).toBeUndefined();
  });

  it('allows custom phase handlers', async () => {
    const protocol = new EmbodiedProtocol();
    protocol.registerPhaseHandler(ProtocolPhase.INTAKE, (_agentId, input) => {
      return { customAbsorbed: true, original: input };
    });
    protocol.registerAgent('a1', 'CustomAgent');
    const result = protocol.advancePhase('a1', { test: true });
    expect(result.success).toBe(true);
    expect((result.data as Record<string, unknown>).customAbsorbed).toBe(true);
  });

  it('tracks multiple cycle results', async () => {
    const protocol = new EmbodiedProtocol();
    protocol.registerAgent('a1', 'MultiCycle');

    await protocol.executeCycle('a1', { cycle: 1 });
    await protocol.executeCycle('a1', { cycle: 2 });

    const results = protocol.getCycleResults();
    expect(results.length).toBe(2);
    expect(protocol.getAgent('a1')!.cycleCount).toBe(2);
  });

  it('lists all registered agents', () => {
    const protocol = new EmbodiedProtocol();
    protocol.registerAgent('a1', 'Agent1');
    protocol.registerAgent('a2', 'Agent2');
    expect(protocol.getAllAgents().length).toBe(2);
  });
});
