import { describe, it, expect, beforeEach } from 'vitest';
import { AgentTierManager, AgentTier } from '../AgentTierManager';
import { PerceptionLayer } from '../PerceptionLayer';
import { ReactiveLayer } from '../ReactiveLayer';
import { ReasoningLayer } from '../ReasoningLayer';
import { CloudEscalation } from '../CloudEscalation';

describe('AgentTierManager', () => {
  let manager: AgentTierManager;
  beforeEach(() => { manager = new AgentTierManager(); });

  it('registers agents at default tier', () => {
    manager.registerAgent('a1');
    expect(manager.getAgentTier('a1')).toBe(AgentTier.Reactive);
  });

  it('escalates based on complexity', () => {
    manager.registerAgent('a1');
    expect(manager.evaluateEscalation('a1', 0.1)).toBe(AgentTier.Perception);
    expect(manager.evaluateEscalation('a1', 0.5)).toBe(AgentTier.Reactive);
    expect(manager.evaluateEscalation('a1', 0.7)).toBe(AgentTier.Reasoning);
    expect(manager.evaluateEscalation('a1', 0.9)).toBe(AgentTier.CloudEscalation);
  });

  it('provides tier configs', () => {
    const config = manager.getTierConfig(AgentTier.Reactive);
    expect(config.name).toContain('MobileLLM');
    expect(config.maxLatencyMs).toBe(50);
  });
});

describe('PerceptionLayer', () => {
  it('processes perception input', async () => {
    const layer = new PerceptionLayer();
    const output = await layer.process({
      frameId: 1, gazeDirection: { x: 0, y: 0, z: 1 },
      handPositions: { left: { x: -0.3, y: 1, z: 0 }, right: { x: 0.3, y: 1, z: 0 } },
      audioLevel: 0, timestamp: Date.now(),
    });
    expect(output.frameId).toBe(1);
    expect(output.detectedObjects.length).toBeGreaterThan(0);
  });

  it('detects wave gesture', async () => {
    const layer = new PerceptionLayer();
    const output = await layer.process({
      frameId: 1, gazeDirection: { x: 0, y: 0, z: 0 },
      handPositions: { left: { x: 0, y: 1, z: 0 }, right: { x: 0, y: 2, z: 0 } },
      audioLevel: 0, timestamp: Date.now(),
    });
    expect(output.gestureDetected).toBe('wave');
  });
});

describe('ReactiveLayer', () => {
  it('responds to gestures', async () => {
    const layer = new ReactiveLayer();
    const output = await layer.process({
      perception: { detectedObjects: [], gazeTarget: null, gestureDetected: 'wave', speechDetected: false },
      agentState: { mood: 'neutral', activity: 'idle', position: { x: 0, y: 0, z: 0 } },
    });
    expect(output.action).toBe('greet');
  });
});

describe('ReasoningLayer', () => {
  it('processes reasoning queries', async () => {
    const layer = new ReasoningLayer();
    const output = await layer.process({
      query: 'How should I approach the castle?',
      context: {}, worldState: {}, conversationHistory: [],
    });
    expect(output.response).toContain('Reasoning');
    expect(output.plan.length).toBeGreaterThan(0);
  });
});

describe('CloudEscalation', () => {
  it('processes cloud requests', async () => {
    const cloud = new CloudEscalation();
    const response = await cloud.escalate({
      agentId: 'a1', query: 'Complex question', context: {}, maxTokens: 100, timeout: 5000,
    });
    expect(response.response).toContain('Cloud reasoning');
  });

  it('caches responses', async () => {
    const cloud = new CloudEscalation();
    await cloud.escalate({ agentId: 'a1', query: 'test', context: {}, maxTokens: 100, timeout: 5000 });
    const cached = await cloud.escalate({ agentId: 'a1', query: 'test', context: {}, maxTokens: 100, timeout: 5000 });
    expect(cached.fromCache).toBe(true);
    expect(cloud.getCacheHitRate()).toBeGreaterThan(0);
  });
});
