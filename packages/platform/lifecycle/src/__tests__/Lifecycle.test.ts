import { describe, it, expect } from 'vitest';
import { WorldLifecycle } from '../WorldLifecycle';
import { StageManager } from '../StageManager';
import { AWUMetric } from '../AWUMetric';

describe('StageManager', () => {
  it('advances through stages', () => {
    const mgr = new StageManager('w1');
    expect(mgr.getCurrentStage()).toBe('Design');
    mgr.advance();
    expect(mgr.getCurrentStage()).toBe('Train');
    mgr.advance();
    expect(mgr.getCurrentStage()).toBe('Test');
  });

  it('cannot advance past Decommission', () => {
    const mgr = new StageManager('w1');
    for (let i = 0; i < 10; i++) mgr.advance();
    expect(mgr.getCurrentStage()).toBe('Decommission');
    expect(mgr.canAdvance()).toBe(false);
  });
});

describe('AWUMetric', () => {
  it('tracks unique weekly users', () => {
    const awu = new AWUMetric('w1');
    awu.recordUser('u1');
    awu.recordUser('u2');
    awu.recordUser('u1'); // duplicate
    expect(awu.getAWU()).toBe(2);
  });
});

describe('WorldLifecycle', () => {
  it('creates and manages worlds', () => {
    const lc = new WorldLifecycle();
    lc.createWorld({ worldId: 'w1', name: 'Test World', template: 'office', maxUsers: 32 });
    expect(lc.getStage('w1')).toBe('Design');
    lc.advanceStage('w1');
    expect(lc.getStage('w1')).toBe('Train');
  });

  it('tracks AWU', () => {
    const lc = new WorldLifecycle();
    lc.createWorld({ worldId: 'w1', name: 'Test', template: 'blank', maxUsers: 10 });
    lc.recordUsage('w1', 'user1');
    expect(lc.getAWU('w1')).toBe(1);
  });
});
