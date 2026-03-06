import { describe, it, expect } from 'vitest';
import { TrustHandshake } from '../TrustHandshake';
import { GossipMesh } from '../GossipMesh';
import { BloomRevocation } from '../BloomRevocation';
import { BehavioralScoring } from '../BehavioralScoring';
import { TrustConvergence } from '../TrustConvergence';

describe('TrustHandshake', () => {
  it('progresses through 5 phases', () => {
    const th = new TrustHandshake();
    th.genesis('a1');
    expect(th.getState('a1')!.phase).toBe('GENESIS');
    th.join('a1');
    expect(th.getState('a1')!.phase).toBe('JOIN');
    th.interact('a1');
    expect(th.getState('a1')!.phase).toBe('INTERACT');
    th.refresh('a1');
    expect(th.getState('a1')!.phase).toBe('REFRESH');
    expect(th.getState('a1')!.trustLevel).toBeGreaterThan(0.6);
  });

  it('exits cleanly', () => {
    const th = new TrustHandshake();
    th.genesis('a1');
    expect(th.exit('a1')).toBe(true);
    expect(th.getState('a1')).toBeUndefined();
  });
});

describe('GossipMesh', () => {
  it('propagates trust via gossip', () => {
    const mesh = new GossipMesh(2);
    mesh.addNode('n1'); mesh.addNode('n2'); mesh.addNode('n3');
    mesh.connect('n1', 'n2'); mesh.connect('n1', 'n3'); mesh.connect('n2', 'n3');
    mesh.gossip({ fromId: 'n1', aboutId: 'a1', trustScore: 0.8, timestamp: Date.now(), ttl: 3 });
    expect(mesh.getMessageCount()).toBe(1);
  });

  it('computes convergence rounds', () => {
    const mesh = new GossipMesh(3);
    expect(mesh.getConvergenceRounds(100)).toBeLessThanOrEqual(7);
  });
});

describe('BloomRevocation', () => {
  it('detects revoked agents', () => {
    const bloom = new BloomRevocation();
    bloom.revoke('bad_agent');
    expect(bloom.isRevoked('bad_agent')).toBe(true);
    expect(bloom.isRevoked('good_agent')).toBe(false);
  });
});

describe('BehavioralScoring', () => {
  it('scores agents based on behavior', () => {
    const scorer = new BehavioralScoring();
    const score = scorer.score('a1', 0, 0, 0.9);
    expect(score.overallScore).toBeGreaterThan(0.5);
    expect(score.spatialCompliance).toBe(1);
  });

  it('penalizes violations', () => {
    const scorer = new BehavioralScoring();
    const good = scorer.score('a1', 0, 0, 0.9);
    const bad = scorer.score('a2', 5, 3, 0.3);
    expect(bad.overallScore).toBeLessThan(good.overallScore);
  });
});

describe('TrustConvergence', () => {
  it('detects convergence', () => {
    const conv = new TrustConvergence();
    conv.recordSnapshot(new Map([['a1', 0.5]]));
    conv.recordSnapshot(new Map([['a1', 0.51]]));
    expect(conv.hasConverged(0.05)).toBe(true);
  });
});
