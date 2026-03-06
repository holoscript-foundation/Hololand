import { describe, it, expect } from 'vitest';
import { SpatialVerifier } from '../SpatialVerifier';
import { ActionValidator } from '../ActionValidator';
import { ConsistencyChecker } from '../ConsistencyChecker';

describe('ActionValidator', () => {
  const validator = new ActionValidator(10);

  it('accepts valid movements', () => {
    const result = validator.validate(
      { agentId: 'a1', position: { x: 1, y: 0, z: 0 }, timestamp: 1000 },
      { position: { x: 0, y: 0, z: 0 }, timestamp: 0 },
    );
    expect(result.valid).toBe(true);
  });

  it('rejects teleportation (excessive speed)', () => {
    const result = validator.validate(
      { agentId: 'a1', position: { x: 100, y: 0, z: 0 }, timestamp: 1000 },
      { position: { x: 0, y: 0, z: 0 }, timestamp: 0 },
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Speed');
  });
});

describe('ConsistencyChecker', () => {
  const checker = new ConsistencyChecker(1);

  it('detects collisions', () => {
    const report = checker.check([
      { agentId: 'a1', entityId: 'e1', position: { x: 0, y: 0, z: 0 }, timestamp: 0 },
      { agentId: 'a2', entityId: 'e2', position: { x: 0.5, y: 0, z: 0 }, timestamp: 0 },
    ]);
    expect(report.collisions.length).toBe(1);
    expect(report.consistent).toBe(false);
  });

  it('reports consistent when no collisions', () => {
    const report = checker.check([
      { agentId: 'a1', entityId: 'e1', position: { x: 0, y: 0, z: 0 }, timestamp: 0 },
      { agentId: 'a2', entityId: 'e2', position: { x: 10, y: 0, z: 0 }, timestamp: 0 },
    ]);
    expect(report.consistent).toBe(true);
  });
});

describe('SpatialVerifier', () => {
  const verifier = new SpatialVerifier(10, 1);

  it('verifies claims', () => {
    const result = verifier.verifyClaim({ agentId: 'a1', entityId: 'e1', position: { x: 1, y: 0, z: 0 }, timestamp: 1000 });
    expect(result.valid).toBe(true);
  });

  it('checks consistency', () => {
    const report = verifier.checkConsistency([
      { agentId: 'a1', entityId: 'e1', position: { x: 0, y: 0, z: 0 }, timestamp: 0 },
      { agentId: 'a2', entityId: 'e2', position: { x: 50, y: 0, z: 0 }, timestamp: 0 },
    ]);
    expect(report.consistent).toBe(true);
  });
});
