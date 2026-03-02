/**
 * GaussianBudgetManager -- Production Test Suite
 *
 * Tests per-frame Gaussian budget enforcement for VR/AR:
 * - Per-frame enforcement (not per-scene)
 * - Avatar reservation (60K each, max 3)
 * - LOD fallback cascade (3-stage)
 * - Memory footprint monitoring (1.5GB mobile VR ceiling)
 * - Event system
 * - Preset configurations
 * - Edge cases and stress scenarios
 *
 * Research references:
 *   W.034  - VR Gaussian budget
 *   P.030.05 - VR Budget Management
 *   G.030.03 - Avatar budget reservation
 *   G.030.06 - Memory footprint pre-check
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GaussianBudgetManager,
  BUDGET_VR_OPTIMIZED,
  BUDGET_VR_CONSERVATIVE,
  BUDGET_DESKTOP,
  BUDGET_UNLIMITED,
  type BudgetScene,
  type BudgetEvent,
} from '../GaussianBudgetManager';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a test scene with configurable Gaussians per LOD level */
function makeScene(
  id: string,
  opts: Partial<BudgetScene> & { gaussiansPerLevel?: number[] } = {},
): BudgetScene {
  const gaussiansPerLevel = opts.gaussiansPerLevel ?? [5000, 10000, 15000, 20000, 30000];
  const totalGaussians = gaussiansPerLevel.reduce((a, b) => a + b, 0);
  const visibleGaussians = opts.visibleGaussians ?? totalGaussians;
  return {
    id,
    priority: opts.priority ?? 1,
    totalGaussians,
    visibleGaussians,
    activeLODLevel: opts.activeLODLevel ?? gaussiansPerLevel.length - 1,
    maxLODLevels: gaussiansPerLevel.length,
    gaussiansPerLevel,
    enabled: opts.enabled ?? true,
    memoryBytes: visibleGaussians * 60,
  };
}

// ─── Suite: Construction ─────────────────────────────────────────────────────

describe('GaussianBudgetManager: construction', () => {
  it('constructs with default config', () => {
    const mgr = new GaussianBudgetManager();
    const config = mgr.getConfig();
    expect(config.totalBudget).toBe(180_000);
    expect(config.perAvatarReservation).toBe(60_000);
    expect(config.maxAvatars).toBe(3);
    expect(config.memoryCeilingBytes).toBe(1.5 * 1024 * 1024 * 1024);
    expect(config.perFrameEnforcement).toBe(true);
    expect(config.lodCascadeEnabled).toBe(true);
    expect(config.cascadeStages).toBe(3);
  });

  it('constructs with VR optimized preset', () => {
    const mgr = new GaussianBudgetManager(BUDGET_VR_OPTIMIZED);
    const config = mgr.getConfig();
    expect(config.totalBudget).toBe(180_000);
    expect(config.perAvatarReservation).toBe(60_000);
    expect(config.maxAvatars).toBe(3);
  });

  it('constructs with VR conservative preset', () => {
    const mgr = new GaussianBudgetManager(BUDGET_VR_CONSERVATIVE);
    const config = mgr.getConfig();
    expect(config.totalBudget).toBe(100_000);
    expect(config.perAvatarReservation).toBe(30_000);
    expect(config.maxAvatars).toBe(2);
  });

  it('constructs with desktop preset', () => {
    const mgr = new GaussianBudgetManager(BUDGET_DESKTOP);
    const config = mgr.getConfig();
    expect(config.totalBudget).toBe(500_000);
    expect(config.maxAvatars).toBe(5);
  });

  it('constructs with unlimited preset', () => {
    const mgr = new GaussianBudgetManager(BUDGET_UNLIMITED);
    const config = mgr.getConfig();
    expect(config.totalBudget).toBe(0);
    expect(config.perFrameEnforcement).toBe(false);
  });
});

// ─── Suite: Scene Management ─────────────────────────────────────────────────

describe('GaussianBudgetManager: scene management', () => {
  let mgr: GaussianBudgetManager;

  beforeEach(() => {
    mgr = new GaussianBudgetManager({ ...BUDGET_VR_OPTIMIZED, enforcementIntervalMs: 0 });
  });

  it('registers and retrieves a scene', () => {
    const scene = makeScene('env-1');
    mgr.registerScene(scene);
    const retrieved = mgr.getScene('env-1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('env-1');
    expect(retrieved!.totalGaussians).toBe(80000);
  });

  it('lists all registered scenes', () => {
    mgr.registerScene(makeScene('a'));
    mgr.registerScene(makeScene('b'));
    const scenes = mgr.getScenes();
    expect(scenes.length).toBe(2);
  });

  it('updates scene state', () => {
    mgr.registerScene(makeScene('env-1'));
    mgr.updateScene('env-1', { visibleGaussians: 50000 });
    const scene = mgr.getScene('env-1');
    expect(scene!.visibleGaussians).toBe(50000);
    // Memory should be recalculated
    expect(scene!.memoryBytes).toBe(50000 * 60);
  });

  it('unregisters a scene', () => {
    mgr.registerScene(makeScene('env-1'));
    mgr.unregisterScene('env-1');
    expect(mgr.getScene('env-1')).toBeUndefined();
  });

  it('emits events on register and unregister', () => {
    const events: BudgetEvent[] = [];
    mgr.on((e) => events.push(e));

    mgr.registerScene(makeScene('env-1'));
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('scene:registered');

    mgr.unregisterScene('env-1');
    expect(events.length).toBe(2);
    expect(events[1].type).toBe('scene:unregistered');
  });
});

// ─── Suite: Avatar Management ────────────────────────────────────────────────

describe('GaussianBudgetManager: avatar management', () => {
  let mgr: GaussianBudgetManager;

  beforeEach(() => {
    mgr = new GaussianBudgetManager({ ...BUDGET_VR_OPTIMIZED, enforcementIntervalMs: 0 });
  });

  it('adds avatar with default reservation (60K)', () => {
    expect(mgr.addAvatar('avatar-1')).toBe(true);
    expect(mgr.getAvatarReservation()).toBe(60_000);
  });

  it('adds avatar with custom Gaussian count', () => {
    expect(mgr.addAvatar('avatar-1', 40_000)).toBe(true);
    expect(mgr.getAvatarReservation()).toBe(40_000);
  });

  it('reserves 60K per avatar, up to max 3', () => {
    mgr.addAvatar('a1');
    mgr.addAvatar('a2');
    mgr.addAvatar('a3');
    expect(mgr.getAvatarReservation()).toBe(180_000);
    expect(mgr.getActiveAvatarCount()).toBe(3);
  });

  it('rejects avatar beyond max limit', () => {
    mgr.addAvatar('a1');
    mgr.addAvatar('a2');
    mgr.addAvatar('a3');
    expect(mgr.addAvatar('a4')).toBe(false);
    expect(mgr.getActiveAvatarCount()).toBe(3);
  });

  it('removes avatar and frees reservation', () => {
    mgr.addAvatar('a1');
    mgr.addAvatar('a2');
    expect(mgr.getAvatarReservation()).toBe(120_000);
    mgr.removeAvatar('a1');
    expect(mgr.getAvatarReservation()).toBe(60_000);
    expect(mgr.getActiveAvatarCount()).toBe(1);
  });

  it('inactive avatars do not consume budget', () => {
    mgr.addAvatar('a1');
    mgr.addAvatar('a2');
    expect(mgr.getAvatarReservation()).toBe(120_000);
    mgr.setAvatarActive('a1', false);
    expect(mgr.getAvatarReservation()).toBe(60_000);
    expect(mgr.getActiveAvatarCount()).toBe(1);
  });

  it('emits events on add and remove', () => {
    const events: BudgetEvent[] = [];
    mgr.on((e) => events.push(e));

    mgr.addAvatar('a1');
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('avatar:added');

    mgr.removeAvatar('a1');
    expect(events.length).toBe(2);
    expect(events[1].type).toBe('avatar:removed');
  });
});

// ─── Suite: Per-Frame Budget Enforcement ─────────────────────────────────────

describe('GaussianBudgetManager: per-frame enforcement', () => {
  let mgr: GaussianBudgetManager;

  beforeEach(() => {
    mgr = new GaussianBudgetManager({
      ...BUDGET_VR_OPTIMIZED,
      enforcementIntervalMs: 0,
    });
  });

  it('allocates full budget when under limit', () => {
    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [20000, 30000, 50000],
      visibleGaussians: 100000,
    }));

    const result = mgr.enforceFrame(true);
    expect(result.totalBudget).toBe(180_000);
    expect(result.avatarReservation).toBe(0);
    expect(result.sceneBudget).toBe(180_000);
    expect(result.totalAllocated).toBe(100_000);
    expect(result.budgetCapped).toBe(false);
    expect(result.cascadeStage).toBe(0);
  });

  it('avatar reservation reduces scene budget', () => {
    mgr.addAvatar('a1');
    mgr.addAvatar('a2');
    // 2 avatars * 60K = 120K reserved, 60K for scenes
    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [10000, 20000, 30000],
      visibleGaussians: 60000,
    }));

    const result = mgr.enforceFrame(true);
    expect(result.avatarReservation).toBe(120_000);
    expect(result.sceneBudget).toBe(60_000);
    expect(result.totalAllocated).toBe(60_000);
    expect(result.budgetCapped).toBe(false);
  });

  it('3 avatars at 60K each exhausts full 180K budget', () => {
    mgr.addAvatar('a1');
    mgr.addAvatar('a2');
    mgr.addAvatar('a3');
    // 3 * 60K = 180K, scene budget = 0

    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [10000],
      visibleGaussians: 10000,
    }));

    const result = mgr.enforceFrame(true);
    expect(result.avatarReservation).toBe(180_000);
    expect(result.sceneBudget).toBe(0);
    expect(result.totalAllocated).toBe(0);
    expect(result.budgetCapped).toBe(true);
  });

  it('caps scenes when over budget', () => {
    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [20000, 40000, 60000, 80000],
      visibleGaussians: 200000,
    }));

    const result = mgr.enforceFrame(true);
    expect(result.budgetCapped).toBe(true);
    expect(result.totalAllocated).toBeLessThanOrEqual(180_000);
  });

  it('enforces per-frame (not per-scene)', () => {
    // Two scenes that together exceed budget
    mgr.registerScene(makeScene('env-1', {
      gaussiansPerLevel: [20000, 30000, 50000],
      visibleGaussians: 100000,
    }));
    mgr.registerScene(makeScene('env-2', {
      gaussiansPerLevel: [20000, 30000, 50000],
      visibleGaussians: 100000,
    }));

    // Total requested: 200K > 180K budget
    const result = mgr.enforceFrame(true);
    expect(result.budgetCapped).toBe(true);
    expect(result.totalAllocated).toBeLessThanOrEqual(180_000);
    // Both scenes should have allocations
    expect(result.sceneAllocations.length).toBe(2);
  });

  it('emits budget:enforced event', () => {
    const events: BudgetEvent[] = [];
    mgr.on((e) => events.push(e));

    mgr.registerScene(makeScene('env'));
    mgr.enforceFrame(true);

    const enforcedEvents = events.filter((e) => e.type === 'budget:enforced');
    expect(enforcedEvents.length).toBe(1);
  });

  it('respects enforcement interval throttling', () => {
    mgr = new GaussianBudgetManager({
      ...BUDGET_VR_OPTIMIZED,
      enforcementIntervalMs: 100, // 100ms interval
    });

    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [10000],
      visibleGaussians: 10000,
    }));

    const result1 = mgr.enforceFrame(true); // Force first
    const result2 = mgr.enforceFrame(); // Throttled (same timestamp)

    // Both should return the same result (throttled returns cached)
    expect(result2.timestamp).toBe(result1.timestamp);
  });
});

// ─── Suite: LOD Fallback Cascade ─────────────────────────────────────────────

describe('GaussianBudgetManager: LOD fallback cascade', () => {
  let mgr: GaussianBudgetManager;

  beforeEach(() => {
    mgr = new GaussianBudgetManager({
      totalBudget: 100_000,
      perAvatarReservation: 60_000,
      maxAvatars: 3,
      memoryCeilingBytes: 1.5 * 1024 * 1024 * 1024,
      memoryThresholds: { warning: 0.70, reduction: 0.85, emergency: 0.95 },
      perFrameEnforcement: true,
      enforcementIntervalMs: 0,
      lodCascadeEnabled: true,
      cascadeStages: 3,
    });
  });

  it('Stage 1: drops finest LOD levels to fit budget', () => {
    // Scene with 150K visible across 5 levels, budget is 100K
    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [5000, 10000, 15000, 40000, 80000],
      visibleGaussians: 150000,
      activeLODLevel: 4,
    }));

    const result = mgr.enforceFrame(true);
    expect(result.cascadeStage).toBeGreaterThanOrEqual(1);
    expect(result.totalAllocated).toBeLessThanOrEqual(100_000);

    const alloc = result.sceneAllocations.find((a) => a.sceneId === 'env')!;
    expect(alloc.lodLevelsDropped).toBeGreaterThan(0);
  });

  it('Stage 2: proportional capping when Stage 1 insufficient', () => {
    // Two scenes that are still over budget after LOD drops
    // All Gaussians at level 0 (can't be dropped further)
    mgr.registerScene(makeScene('env-1', {
      gaussiansPerLevel: [60000],
      visibleGaussians: 60000,
      activeLODLevel: 0,
      priority: 2,
    }));
    mgr.registerScene(makeScene('env-2', {
      gaussiansPerLevel: [60000],
      visibleGaussians: 60000,
      activeLODLevel: 0,
      priority: 1,
    }));

    // Total requested: 120K > 100K, stage 1 can't help (all at level 0)
    const result = mgr.enforceFrame(true);
    expect(result.cascadeStage).toBeGreaterThanOrEqual(2);
    expect(result.totalAllocated).toBeLessThanOrEqual(100_000);
  });

  it('cascade with single-level scenes falls through all stages', () => {
    // Two single-level scenes at level 0, total 120K > 100K budget.
    // Stage 1: cannot drop levels (both at level 0).
    // Stage 2: proportional cap resolves it (total <= budget).
    // Stage 3: not needed since stage 2 resolves.

    mgr.registerScene(makeScene('high-priority', {
      gaussiansPerLevel: [60000],
      visibleGaussians: 60000,
      activeLODLevel: 0,
      priority: 9,
    }));
    mgr.registerScene(makeScene('low-priority', {
      gaussiansPerLevel: [60000],
      visibleGaussians: 60000,
      activeLODLevel: 0,
      priority: 1,
    }));

    const result = mgr.enforceFrame(true);
    // Stage 1 fires but cannot help, stage 2 proportional cap resolves
    expect(result.cascadeStage).toBeGreaterThanOrEqual(2);
    expect(result.totalAllocated).toBeLessThanOrEqual(100_000);
    expect(result.budgetCapped).toBe(true);

    // High priority (9) should get ~9x more than low priority (1)
    const highAlloc = result.sceneAllocations.find(
      (a) => a.sceneId === 'high-priority',
    )!;
    const lowAlloc = result.sceneAllocations.find(
      (a) => a.sceneId === 'low-priority',
    )!;
    expect(highAlloc.allocated).toBeGreaterThan(lowAlloc.allocated);
    expect(highAlloc.enabled).toBe(true);
    expect(lowAlloc.enabled).toBe(true);
  });

  it('Stage 2 proportional capping gives higher priority more budget', () => {
    mgr = new GaussianBudgetManager({
      totalBudget: 50_000,
      perAvatarReservation: 0,
      maxAvatars: 0,
      memoryCeilingBytes: 0,
      memoryThresholds: { warning: 0.70, reduction: 0.85, emergency: 0.95 },
      perFrameEnforcement: true,
      enforcementIntervalMs: 0,
      lodCascadeEnabled: true,
      cascadeStages: 3,
    });

    mgr.registerScene(makeScene('high-priority', {
      gaussiansPerLevel: [60000],
      visibleGaussians: 60000,
      activeLODLevel: 0,
      priority: 9,
    }));
    mgr.registerScene(makeScene('low-priority', {
      gaussiansPerLevel: [60000],
      visibleGaussians: 60000,
      activeLODLevel: 0,
      priority: 1,
    }));

    // Stage 1: no levels to drop. Stage 2: proportional cap.
    // high gets floor(9/10 * 50K) = 45000, low gets floor(1/10 * 50K) = 5000.
    const result = mgr.enforceFrame(true);
    expect(result.cascadeStage).toBeGreaterThanOrEqual(2);
    expect(result.budgetCapped).toBe(true);
    expect(result.totalAllocated).toBeLessThanOrEqual(50_000);

    const highAlloc = result.sceneAllocations.find(
      (a) => a.sceneId === 'high-priority',
    )!;
    const lowAlloc = result.sceneAllocations.find(
      (a) => a.sceneId === 'low-priority',
    )!;
    expect(highAlloc.allocated).toBeGreaterThan(lowAlloc.allocated);
    expect(highAlloc.enabled).toBe(true);
    expect(lowAlloc.enabled).toBe(true);
  });

  it('emits cascade event when cascade is triggered', () => {
    const events: BudgetEvent[] = [];
    mgr.on((e) => events.push(e));

    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [5000, 10000, 15000, 40000, 80000],
      visibleGaussians: 150000,
      activeLODLevel: 4,
    }));

    mgr.enforceFrame(true);

    const cascadeEvents = events.filter((e) => e.type === 'budget:cascade');
    expect(cascadeEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('no cascade when disabled', () => {
    mgr.updateConfig({ lodCascadeEnabled: false });

    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [20000, 40000, 60000, 80000],
      visibleGaussians: 200000,
    }));

    const result = mgr.enforceFrame(true);
    expect(result.cascadeStage).toBe(0);
    // Should use proportional capping instead
    expect(result.budgetCapped).toBe(true);
  });
});

// ─── Suite: Memory Footprint Monitoring ──────────────────────────────────────

describe('GaussianBudgetManager: memory footprint monitoring', () => {
  it('computes memory state from Gaussian count', () => {
    const mgr = new GaussianBudgetManager({
      ...BUDGET_VR_OPTIMIZED,
      enforcementIntervalMs: 0,
    });

    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [100000],
      visibleGaussians: 100000,
    }));

    const state = mgr.getMemoryState();
    // 100K * 60 bytes = 6MB
    expect(state.totalBytes).toBe(100_000 * 60);
    expect(state.totalGaussians).toBe(100_000);
  });

  it('includes avatar memory in total', () => {
    const mgr = new GaussianBudgetManager({
      ...BUDGET_VR_OPTIMIZED,
      enforcementIntervalMs: 0,
    });

    mgr.addAvatar('a1'); // 60K Gaussians
    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [40000],
      visibleGaussians: 40000,
    }));

    const state = mgr.getMemoryState();
    expect(state.totalGaussians).toBe(100_000); // 60K avatar + 40K scene
  });

  it('tracks additional non-Gaussian memory', () => {
    const mgr = new GaussianBudgetManager({
      ...BUDGET_VR_OPTIMIZED,
      enforcementIntervalMs: 0,
    });

    const additionalMB = 500; // 500MB of textures/shaders
    mgr.setAdditionalMemoryBytes(additionalMB * 1024 * 1024);

    const state = mgr.getMemoryState();
    expect(state.totalBytes).toBe(additionalMB * 1024 * 1024);
  });

  it('computes utilization against 1.5GB ceiling', () => {
    const ceiling = 1.5 * 1024 * 1024 * 1024; // 1.5GB
    const mgr = new GaussianBudgetManager({
      memoryCeilingBytes: ceiling,
      totalBudget: 0,
      enforcementIntervalMs: 0,
    });

    // Add 750MB of additional memory (50% of 1.5GB)
    mgr.setAdditionalMemoryBytes(750 * 1024 * 1024);

    const state = mgr.getMemoryState();
    expect(state.utilization).toBeCloseTo(0.5, 1);
    expect(state.thresholdState).toBe('normal');
  });

  it('transitions to warning at 70%', () => {
    const ceiling = 1.5 * 1024 * 1024 * 1024;
    const mgr = new GaussianBudgetManager({
      memoryCeilingBytes: ceiling,
      totalBudget: 0,
      enforcementIntervalMs: 0,
      memoryThresholds: { warning: 0.70, reduction: 0.85, emergency: 0.95 },
    });

    // Add 75% of ceiling
    mgr.setAdditionalMemoryBytes(Math.floor(ceiling * 0.75));

    const state = mgr.getMemoryState();
    expect(state.thresholdState).toBe('warning');
  });

  it('transitions to reduction at 85%', () => {
    const ceiling = 1.5 * 1024 * 1024 * 1024;
    const mgr = new GaussianBudgetManager({
      memoryCeilingBytes: ceiling,
      totalBudget: 0,
      enforcementIntervalMs: 0,
      memoryThresholds: { warning: 0.70, reduction: 0.85, emergency: 0.95 },
    });

    mgr.setAdditionalMemoryBytes(Math.floor(ceiling * 0.90));

    const state = mgr.getMemoryState();
    expect(state.thresholdState).toBe('reduction');
  });

  it('transitions to emergency at 95%', () => {
    const ceiling = 1.5 * 1024 * 1024 * 1024;
    const mgr = new GaussianBudgetManager({
      memoryCeilingBytes: ceiling,
      totalBudget: 0,
      enforcementIntervalMs: 0,
      memoryThresholds: { warning: 0.70, reduction: 0.85, emergency: 0.95 },
    });

    mgr.setAdditionalMemoryBytes(Math.floor(ceiling * 0.96));

    const state = mgr.getMemoryState();
    expect(state.thresholdState).toBe('emergency');
  });

  it('emits memory threshold events on state change', () => {
    const ceiling = 1.5 * 1024 * 1024 * 1024;
    const mgr = new GaussianBudgetManager({
      memoryCeilingBytes: ceiling,
      totalBudget: 180_000,
      enforcementIntervalMs: 0,
      memoryThresholds: { warning: 0.70, reduction: 0.85, emergency: 0.95 },
    });

    const events: BudgetEvent[] = [];
    mgr.on((e) => events.push(e));

    // Start normal
    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [10000],
      visibleGaussians: 10000,
    }));
    mgr.enforceFrame(true);

    // Push to warning
    mgr.setAdditionalMemoryBytes(Math.floor(ceiling * 0.75));
    mgr.enforceFrame(true);

    const warningEvents = events.filter((e) => e.type === 'memory:warning');
    expect(warningEvents.length).toBe(1);
  });

  it('checkMemoryHeadroom returns safe Gaussian count', () => {
    const ceiling = 1.5 * 1024 * 1024 * 1024;
    const mgr = new GaussianBudgetManager({
      memoryCeilingBytes: ceiling,
      totalBudget: 0,
      enforcementIntervalMs: 0,
    });

    // With no existing data, lots of headroom
    const headroom = mgr.checkMemoryHeadroom(1_000_000);
    expect(headroom).toBe(1_000_000);

    // Nearly full
    mgr.setAdditionalMemoryBytes(Math.floor(ceiling * 0.999));
    const limited = mgr.checkMemoryHeadroom(1_000_000);
    expect(limited).toBeLessThan(1_000_000);
    expect(limited).toBeGreaterThanOrEqual(0);
  });

  it('returns -1 for unlimited memory ceiling', () => {
    const mgr = new GaussianBudgetManager({
      memoryCeilingBytes: 0,
      totalBudget: 0,
    });
    expect(mgr.checkMemoryHeadroom(999999)).toBe(-1);
  });
});

// ─── Suite: Unlimited Budget Mode ────────────────────────────────────────────

describe('GaussianBudgetManager: unlimited mode', () => {
  it('does not cap scenes in unlimited mode', () => {
    const mgr = new GaussianBudgetManager({
      ...BUDGET_UNLIMITED,
      enforcementIntervalMs: 0,
    });

    mgr.registerScene(makeScene('big', {
      gaussiansPerLevel: [1_000_000],
      visibleGaussians: 1_000_000,
    }));

    const result = mgr.enforceFrame(true);
    expect(result.budgetCapped).toBe(false);
    expect(result.totalAllocated).toBe(1_000_000);
    expect(result.totalBudget).toBe(0);
  });
});

// ─── Suite: Multi-Scene Budget Distribution ──────────────────────────────────

describe('GaussianBudgetManager: multi-scene distribution', () => {
  let mgr: GaussianBudgetManager;

  beforeEach(() => {
    mgr = new GaussianBudgetManager({
      totalBudget: 100_000,
      perAvatarReservation: 60_000,
      maxAvatars: 3,
      memoryCeilingBytes: 0,
      memoryThresholds: { warning: 0.70, reduction: 0.85, emergency: 0.95 },
      perFrameEnforcement: true,
      enforcementIntervalMs: 0,
      lodCascadeEnabled: true,
      cascadeStages: 3,
    });
  });

  it('distributes budget across multiple scenes under limit', () => {
    mgr.registerScene(makeScene('env-1', {
      gaussiansPerLevel: [20000],
      visibleGaussians: 20000,
    }));
    mgr.registerScene(makeScene('env-2', {
      gaussiansPerLevel: [30000],
      visibleGaussians: 30000,
    }));
    mgr.registerScene(makeScene('env-3', {
      gaussiansPerLevel: [40000],
      visibleGaussians: 40000,
    }));

    // Total: 90K < 100K budget
    const result = mgr.enforceFrame(true);
    expect(result.budgetCapped).toBe(false);
    expect(result.totalAllocated).toBe(90_000);
  });

  it('priority-based allocation in cascade stage 2', () => {
    // Two scenes with different priorities, both at level 0
    mgr.registerScene(makeScene('important', {
      gaussiansPerLevel: [80000],
      visibleGaussians: 80000,
      activeLODLevel: 0,
      priority: 10,
    }));
    mgr.registerScene(makeScene('optional', {
      gaussiansPerLevel: [80000],
      visibleGaussians: 80000,
      activeLODLevel: 0,
      priority: 1,
    }));

    const result = mgr.enforceFrame(true);

    const importantAlloc = result.sceneAllocations.find(
      (a) => a.sceneId === 'important',
    )!;
    const optionalAlloc = result.sceneAllocations.find(
      (a) => a.sceneId === 'optional',
    )!;

    // Higher priority should get larger share
    expect(importantAlloc.allocated).toBeGreaterThan(optionalAlloc.allocated);
  });

  it('disabled scenes get zero allocation', () => {
    mgr.registerScene(makeScene('enabled', {
      gaussiansPerLevel: [50000],
      visibleGaussians: 50000,
    }));
    mgr.registerScene(makeScene('disabled', {
      gaussiansPerLevel: [50000],
      visibleGaussians: 50000,
      enabled: false,
    }));

    const result = mgr.enforceFrame(true);
    const disabledAlloc = result.sceneAllocations.find(
      (a) => a.sceneId === 'disabled',
    )!;
    expect(disabledAlloc.allocated).toBe(0);
    expect(disabledAlloc.enabled).toBe(false);
  });
});

// ─── Suite: Configuration Updates ────────────────────────────────────────────

describe('GaussianBudgetManager: runtime configuration', () => {
  it('updateConfig changes budget and forces re-enforcement', () => {
    const mgr = new GaussianBudgetManager({
      totalBudget: 100_000,
      enforcementIntervalMs: 0,
    });

    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [80000],
      visibleGaussians: 80000,
    }));

    const result1 = mgr.enforceFrame(true);
    expect(result1.budgetCapped).toBe(false);

    // Reduce budget to 50K
    mgr.updateConfig({ totalBudget: 50_000 });

    const result2 = mgr.enforceFrame(true);
    expect(result2.totalBudget).toBe(50_000);
    expect(result2.budgetCapped).toBe(true);
  });

  it('updateConfig preserves memory thresholds', () => {
    const mgr = new GaussianBudgetManager({
      memoryThresholds: { warning: 0.60, reduction: 0.75, emergency: 0.90 },
    });

    mgr.updateConfig({ totalBudget: 200_000 });

    const config = mgr.getConfig();
    expect(config.memoryThresholds.warning).toBe(0.60);
  });
});

// ─── Suite: Event System ─────────────────────────────────────────────────────

describe('GaussianBudgetManager: event system', () => {
  it('on returns unsubscribe function', () => {
    const mgr = new GaussianBudgetManager({ enforcementIntervalMs: 0 });
    const events: BudgetEvent[] = [];
    const unsub = mgr.on((e) => events.push(e));

    mgr.registerScene(makeScene('a'));
    expect(events.length).toBe(1);

    unsub();
    mgr.registerScene(makeScene('b'));
    expect(events.length).toBe(1); // No new events after unsub
  });
});

// ─── Suite: Diagnostics ──────────────────────────────────────────────────────

describe('GaussianBudgetManager: diagnostics', () => {
  it('generateReport produces readable output', () => {
    const mgr = new GaussianBudgetManager({
      ...BUDGET_VR_OPTIMIZED,
      enforcementIntervalMs: 0,
    });

    mgr.addAvatar('a1');
    mgr.registerScene(makeScene('env-1', {
      gaussiansPerLevel: [5000, 10000, 15000, 20000],
      visibleGaussians: 50000,
    }));
    mgr.enforceFrame(true);

    const report = mgr.generateReport();
    expect(report).toContain('GAUSSIAN BUDGET MANAGER REPORT');
    expect(report).toContain('180,000');
    expect(report).toContain('env-1');
    expect(report).toContain('a1');
  });

  it('getAvailableSceneBudget accounts for avatars', () => {
    const mgr = new GaussianBudgetManager({
      ...BUDGET_VR_OPTIMIZED,
      enforcementIntervalMs: 0,
    });

    expect(mgr.getAvailableSceneBudget()).toBe(180_000);
    mgr.addAvatar('a1');
    expect(mgr.getAvailableSceneBudget()).toBe(120_000);
    mgr.addAvatar('a2');
    expect(mgr.getAvailableSceneBudget()).toBe(60_000);
    mgr.addAvatar('a3');
    expect(mgr.getAvailableSceneBudget()).toBe(0);
  });

  it('getAvailableSceneBudget returns Infinity for unlimited', () => {
    const mgr = new GaussianBudgetManager(BUDGET_UNLIMITED);
    expect(mgr.getAvailableSceneBudget()).toBe(Infinity);
  });

  it('getLastResult returns null before first enforcement', () => {
    const mgr = new GaussianBudgetManager();
    expect(mgr.getLastResult()).toBeNull();
  });
});

// ─── Suite: Clear and Dispose ────────────────────────────────────────────────

describe('GaussianBudgetManager: cleanup', () => {
  it('clear removes all state', () => {
    const mgr = new GaussianBudgetManager({ enforcementIntervalMs: 0 });
    mgr.addAvatar('a1');
    mgr.registerScene(makeScene('env'));
    mgr.enforceFrame(true);

    mgr.clear();
    expect(mgr.getScenes().length).toBe(0);
    expect(mgr.getAvatars().length).toBe(0);
    expect(mgr.getLastResult()).toBeNull();
    expect(mgr.getAdditionalMemoryBytes()).toBe(0);
  });

  it('dispose removes event handlers', () => {
    const mgr = new GaussianBudgetManager({ enforcementIntervalMs: 0 });
    const events: BudgetEvent[] = [];
    mgr.on((e) => events.push(e));

    mgr.dispose();
    mgr.registerScene(makeScene('env'));
    expect(events.length).toBe(0); // No events after dispose
  });
});

// ─── Suite: Edge Cases ───────────────────────────────────────────────────────

describe('GaussianBudgetManager: edge cases', () => {
  it('handles zero-Gaussian scene', () => {
    const mgr = new GaussianBudgetManager({ enforcementIntervalMs: 0 });
    mgr.registerScene(makeScene('empty', {
      gaussiansPerLevel: [],
      visibleGaussians: 0,
    }));

    const result = mgr.enforceFrame(true);
    expect(result.totalAllocated).toBe(0);
    expect(result.budgetCapped).toBe(false);
  });

  it('handles scene with no enabled scenes', () => {
    const mgr = new GaussianBudgetManager({ enforcementIntervalMs: 0 });
    mgr.registerScene(makeScene('off', {
      gaussiansPerLevel: [50000],
      visibleGaussians: 50000,
      enabled: false,
    }));

    const result = mgr.enforceFrame(true);
    expect(result.totalAllocated).toBe(0);
    expect(result.budgetCapped).toBe(false);
  });

  it('removing non-existent avatar returns false', () => {
    const mgr = new GaussianBudgetManager();
    expect(mgr.removeAvatar('ghost')).toBe(false);
  });

  it('updating non-existent scene is no-op', () => {
    const mgr = new GaussianBudgetManager();
    mgr.updateScene('ghost', { visibleGaussians: 9999 });
    expect(mgr.getScene('ghost')).toBeUndefined();
  });

  it('handles rapid avatar add/remove', () => {
    const mgr = new GaussianBudgetManager({
      ...BUDGET_VR_OPTIMIZED,
      enforcementIntervalMs: 0,
    });

    for (let i = 0; i < 10; i++) {
      mgr.addAvatar(`a-${i % 3}`);
      mgr.removeAvatar(`a-${i % 3}`);
    }

    expect(mgr.getActiveAvatarCount()).toBe(0);
    expect(mgr.getAvatarReservation()).toBe(0);
  });

  it('handles scene registration during enforcement', () => {
    const mgr = new GaussianBudgetManager({ enforcementIntervalMs: 0 });

    mgr.registerScene(makeScene('env-1', {
      gaussiansPerLevel: [50000],
      visibleGaussians: 50000,
    }));

    const result1 = mgr.enforceFrame(true);
    expect(result1.sceneAllocations.length).toBeGreaterThanOrEqual(1);

    // Add another scene after enforcement
    mgr.registerScene(makeScene('env-2', {
      gaussiansPerLevel: [50000],
      visibleGaussians: 50000,
    }));

    const result2 = mgr.enforceFrame(true);
    expect(result2.sceneAllocations.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Suite: Integration with Avatar Budget Pattern ───────────────────────────

describe('GaussianBudgetManager: W.034 / P.030.05 compliance', () => {
  it('avatar reservation is 60K by default (P.030.05)', () => {
    const mgr = new GaussianBudgetManager(BUDGET_VR_OPTIMIZED);
    const config = mgr.getConfig();
    expect(config.perAvatarReservation).toBe(60_000);
  });

  it('max 3 simultaneous avatars (P.030.05)', () => {
    const mgr = new GaussianBudgetManager(BUDGET_VR_OPTIMIZED);
    const config = mgr.getConfig();
    expect(config.maxAvatars).toBe(3);

    mgr.addAvatar('a1');
    mgr.addAvatar('a2');
    mgr.addAvatar('a3');
    expect(mgr.addAvatar('a4')).toBe(false);
  });

  it('total VR budget is 180K (W.034)', () => {
    const mgr = new GaussianBudgetManager(BUDGET_VR_OPTIMIZED);
    expect(mgr.getConfig().totalBudget).toBe(180_000);
  });

  it('1.5GB mobile VR memory ceiling (G.030.06)', () => {
    const mgr = new GaussianBudgetManager(BUDGET_VR_OPTIMIZED);
    expect(mgr.getConfig().memoryCeilingBytes).toBe(1.5 * 1024 * 1024 * 1024);
  });

  it('per-frame enforcement prevents transient budget spikes', () => {
    const mgr = new GaussianBudgetManager({
      ...BUDGET_VR_OPTIMIZED,
      enforcementIntervalMs: 0,
    });

    mgr.addAvatar('a1'); // 60K reserved
    mgr.registerScene(makeScene('env', {
      gaussiansPerLevel: [20000, 40000, 60000, 80000],
      visibleGaussians: 200000,
    }));

    // Frame 1: Over budget
    const result1 = mgr.enforceFrame(true);
    expect(result1.budgetCapped).toBe(true);
    expect(result1.totalAllocated + result1.avatarReservation).toBeLessThanOrEqual(180_000);

    // Simulate scene LOD reduction
    mgr.updateScene('env', { visibleGaussians: 100000, activeLODLevel: 2 });

    // Frame 2: Still enforcing per-frame
    const result2 = mgr.enforceFrame(true);
    expect(result2.totalAllocated + result2.avatarReservation).toBeLessThanOrEqual(180_000);
  });
});
