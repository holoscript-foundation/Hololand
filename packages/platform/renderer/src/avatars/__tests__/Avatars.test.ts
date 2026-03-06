import { describe, it, expect, beforeEach } from 'vitest';
import { CompressedGaussianAvatar } from '../CompressedGaussianAvatar';
import { GazeDrivenLOD } from '../GazeDrivenLOD';
import { AvatarBudgetManager } from '../AvatarBudgetManager';

describe('CompressedGaussianAvatar', () => {
  it('reduces splat count at higher LOD', () => {
    const avatar = new CompressedGaussianAvatar({ avatarId: 'a1', baseSplatCount: 10000, compressionRatio: 0.5, lodLevels: 4 });
    const lod0 = avatar.setLOD(0);
    const lod2 = avatar.setLOD(2);
    expect(lod2.activeSplatCount).toBeLessThan(lod0.activeSplatCount);
  });
});

describe('GazeDrivenLOD', () => {
  it('returns LOD 0 for foveal center', () => {
    const lod = new GazeDrivenLOD();
    expect(lod.computeLOD(0, 1)).toBe(0);
  });

  it('returns higher LOD for peripheral and distant', () => {
    const lod = new GazeDrivenLOD();
    expect(lod.computeLOD(45, 40)).toBeGreaterThan(0);
  });
});

describe('AvatarBudgetManager', () => {
  it('enforces budget by increasing LOD', () => {
    const mgr = new AvatarBudgetManager(1000);
    for (let i = 0; i < 5; i++) {
      const avatar = new CompressedGaussianAvatar({ avatarId: `a${i}`, baseSplatCount: 1000, compressionRatio: 0.5, lodLevels: 4 });
      avatar.setLOD(0);
      mgr.addAvatar(avatar);
    }
    expect(mgr.isOverBudget()).toBe(true);
    mgr.enforceBudget();
    expect(mgr.isOverBudget()).toBe(false);
  });
});
