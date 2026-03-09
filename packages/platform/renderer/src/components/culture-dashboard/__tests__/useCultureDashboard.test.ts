/**
 * @vitest-environment jsdom
 */

/**
 * Tests for useCultureDashboard hook
 *
 * Validates:
 * - Initial state defaults
 * - Config overrides
 * - Health update actions
 * - Agent profile updates with max limit
 * - Norm updates
 * - Alert generation and cooldown
 * - Alert dismissal and clearing
 * - Live/paused toggle
 * - Display mode changes
 * - Panel toggle
 * - Staleness detection
 * - Paused state blocks updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock BehavioralTrustScoring to avoid import issues
vi.mock('../../../BehavioralTrustScoring', () => ({}));

import { renderHook, act } from '@testing-library/react';
import { useCultureDashboard } from '../useCultureDashboard';
import type { UseCultureDashboardConfig } from '../useCultureDashboard';
import type {
  CultureHealthSnapshot,
  CultureDimensionSnapshot,
  AgentCultureProfile,
  CommunityNorm,
  CultureDimension,
} from '../types';
import { ALL_CULTURE_DIMENSIONS, CULTURE_FRAME_BUDGET } from '../types';

// =============================================================================
// HELPERS
// =============================================================================

function createDimSnapshot(dim: CultureDimension, score = 0.7): CultureDimensionSnapshot {
  return {
    dimension: dim,
    score,
    previousScore: score - 0.05,
    health: score >= 0.75 ? 'thriving' : 'stable',
    contributingAgents: 10,
    trend: [
      { timestamp: Date.now() - 1000, value: score - 0.05 },
      { timestamp: Date.now(), value: score },
    ],
  };
}

function createHealthSnapshot(composite = 0.7): CultureHealthSnapshot {
  const dims = {} as Record<CultureDimension, CultureDimensionSnapshot>;
  for (const d of ALL_CULTURE_DIMENSIONS) {
    dims[d] = createDimSnapshot(d, composite);
  }
  return {
    compositeScore: composite,
    previousComposite: composite - 0.03,
    health: composite >= 0.75 ? 'thriving' : 'stable',
    dimensions: dims,
    totalAgents: 20,
    compositeTrend: [
      { timestamp: Date.now() - 1000, value: composite - 0.05 },
      { timestamp: Date.now(), value: composite },
    ],
  };
}

function createProfile(id: string): AgentCultureProfile {
  return {
    agentId: id,
    agentName: `Agent ${id}`,
    dimensionScores: {
      alignment: 0.7,
      collaboration: 0.6,
      norm_adherence: 0.8,
      diversity: 0.5,
      resilience: 0.65,
    },
    compositeScore: 0.65,
    role: 'collaborator',
    normViolations: 0,
    collaborativeInteractions: 5,
    lastActiveTimestamp: Date.now(),
  };
}

function createNorm(id: string, compliance = 0.85): CommunityNorm {
  return {
    id,
    name: `Norm ${id}`,
    description: `Test norm ${id}`,
    complianceRate: compliance,
    compliantAgents: Math.round(compliance * 20),
    totalAgents: 20,
    health: compliance >= 0.75 ? 'thriving' : compliance >= 0.5 ? 'stable' : 'critical',
    category: 'interaction',
    enforced: true,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('useCultureDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns correct initial state with defaults', () => {
      const { result } = renderHook(() => useCultureDashboard());
      const [state] = result.current;

      expect(state.health).toBeNull();
      expect(state.agentProfiles).toEqual([]);
      expect(state.norms).toEqual([]);
      expect(state.alerts).toEqual([]);
      expect(state.isLive).toBe(true);
      expect(state.displayMode).toBe('full');
      expect(state.visiblePanels).toBeInstanceOf(Set);
      expect(state.visiblePanels.size).toBe(6);
      expect(state.lastUpdateTimestamp).toBe(0);
      expect(state.isStale).toBe(false);
    });

    it('respects custom config', () => {
      const config: UseCultureDashboardConfig = {
        initialDisplayMode: 'compact',
        initialPanels: ['health-gauge', 'dimensions'],
      };
      const { result } = renderHook(() => useCultureDashboard(config));
      const [state] = result.current;

      expect(state.displayMode).toBe('compact');
      expect(state.visiblePanels.size).toBe(2);
      expect(state.visiblePanels.has('health-gauge')).toBe(true);
      expect(state.visiblePanels.has('dimensions')).toBe(true);
      expect(state.visiblePanels.has('alerts')).toBe(false);
    });
  });

  describe('updateHealth', () => {
    it('updates health state', () => {
      const { result } = renderHook(() => useCultureDashboard());
      const snapshot = createHealthSnapshot(0.8);

      act(() => {
        result.current[1].updateHealth(snapshot);
      });

      expect(result.current[0].health).toBe(snapshot);
      expect(result.current[0].lastUpdateTimestamp).toBeGreaterThan(0);
    });

    it('generates critical alert when health is critical', () => {
      const config: UseCultureDashboardConfig = { enableAlerts: true };
      const { result } = renderHook(() => useCultureDashboard(config));
      const snapshot = createHealthSnapshot(0.15);
      snapshot.health = 'critical';

      act(() => {
        vi.setSystemTime(Date.now());
        result.current[1].updateHealth(snapshot);
      });

      expect(result.current[0].alerts.length).toBeGreaterThan(0);
      expect(result.current[0].alerts[0].severity).toBe('critical');
    });

    it('does not update when paused', () => {
      const { result } = renderHook(() => useCultureDashboard());
      const snapshot = createHealthSnapshot(0.8);

      act(() => {
        result.current[1].toggleLive(); // Pause
      });

      act(() => {
        result.current[1].updateHealth(snapshot);
      });

      expect(result.current[0].health).toBeNull();
    });
  });

  describe('updateAgentProfiles', () => {
    it('updates agent profiles', () => {
      const { result } = renderHook(() => useCultureDashboard());
      const profiles = [createProfile('a1'), createProfile('a2')];

      act(() => {
        result.current[1].updateAgentProfiles(profiles);
      });

      expect(result.current[0].agentProfiles).toHaveLength(2);
    });

    it('limits profiles to maxAgentProfiles', () => {
      const config: UseCultureDashboardConfig = { maxAgentProfiles: 3 };
      const { result } = renderHook(() => useCultureDashboard(config));
      const profiles = Array.from({ length: 10 }, (_, i) => createProfile(`a${i}`));

      act(() => {
        result.current[1].updateAgentProfiles(profiles);
      });

      expect(result.current[0].agentProfiles).toHaveLength(3);
    });

    it('alerts on high disruptor ratio', () => {
      const config: UseCultureDashboardConfig = { enableAlerts: true };
      const { result } = renderHook(() => useCultureDashboard(config));

      // 3 out of 5 are disruptors (60%)
      const profiles = [
        { ...createProfile('a1'), role: 'disruptor' as const },
        { ...createProfile('a2'), role: 'disruptor' as const },
        { ...createProfile('a3'), role: 'disruptor' as const },
        createProfile('a4'),
        createProfile('a5'),
      ];

      act(() => {
        vi.setSystemTime(Date.now());
        result.current[1].updateAgentProfiles(profiles);
      });

      const warnings = result.current[0].alerts.filter((a) => a.dimension === 'norm_adherence');
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('updateNorms', () => {
    it('updates norms', () => {
      const { result } = renderHook(() => useCultureDashboard());
      const norms = [createNorm('n1'), createNorm('n2')];

      act(() => {
        result.current[1].updateNorms(norms);
      });

      expect(result.current[0].norms).toHaveLength(2);
    });

    it('alerts on critical norm compliance', () => {
      const config: UseCultureDashboardConfig = { enableAlerts: true };
      const { result } = renderHook(() => useCultureDashboard(config));
      const norm = createNorm('critical-norm', 0.1);
      norm.health = 'critical';

      act(() => {
        vi.setSystemTime(Date.now());
        result.current[1].updateNorms([norm]);
      });

      expect(result.current[0].alerts.length).toBeGreaterThan(0);
    });
  });

  describe('alert management', () => {
    it('dismisses individual alerts', () => {
      const { result } = renderHook(() => useCultureDashboard());
      const snapshot = createHealthSnapshot(0.15);
      snapshot.health = 'critical';

      act(() => {
        vi.setSystemTime(Date.now());
        result.current[1].updateHealth(snapshot);
      });

      const alertsBefore = result.current[0].alerts.length;
      expect(alertsBefore).toBeGreaterThan(0);

      const alertId = result.current[0].alerts[0].id;
      act(() => {
        result.current[1].dismissAlert(alertId);
      });

      // Dismissed alerts are filtered out of state
      expect(result.current[0].alerts.length).toBeLessThan(alertsBefore);
    });

    it('clears all alerts', () => {
      const { result } = renderHook(() => useCultureDashboard());
      const snapshot = createHealthSnapshot(0.15);
      snapshot.health = 'critical';

      act(() => {
        vi.setSystemTime(Date.now());
        result.current[1].updateHealth(snapshot);
      });

      expect(result.current[0].alerts.length).toBeGreaterThan(0);

      act(() => {
        result.current[1].clearAlerts();
      });

      expect(result.current[0].alerts).toEqual([]);
    });

    it('respects alert cooldown', () => {
      const config: UseCultureDashboardConfig = {
        enableAlerts: true,
        alertCooldownMs: 5000,
      };
      const { result } = renderHook(() => useCultureDashboard(config));
      const snapshot = createHealthSnapshot(0.15);
      snapshot.health = 'critical';

      const now = Date.now();
      act(() => {
        vi.setSystemTime(now);
        result.current[1].updateHealth(snapshot);
      });

      const alertCount1 = result.current[0].alerts.length;

      // Push again within cooldown
      act(() => {
        vi.setSystemTime(now + 1000); // 1s later, within 5s cooldown
        result.current[1].updateHealth(snapshot);
      });

      // Should not have generated a new alert
      expect(result.current[0].alerts.length).toBe(alertCount1);
    });

    it('does not generate alerts when disabled', () => {
      const config: UseCultureDashboardConfig = { enableAlerts: false };
      const { result } = renderHook(() => useCultureDashboard(config));
      const snapshot = createHealthSnapshot(0.15);
      snapshot.health = 'critical';

      act(() => {
        result.current[1].updateHealth(snapshot);
      });

      expect(result.current[0].alerts).toEqual([]);
    });
  });

  describe('toggleLive', () => {
    it('toggles between live and paused', () => {
      const { result } = renderHook(() => useCultureDashboard());
      expect(result.current[0].isLive).toBe(true);

      act(() => {
        result.current[1].toggleLive();
      });
      expect(result.current[0].isLive).toBe(false);

      act(() => {
        result.current[1].toggleLive();
      });
      expect(result.current[0].isLive).toBe(true);
    });
  });

  describe('setDisplayMode', () => {
    it('changes display mode', () => {
      const { result } = renderHook(() => useCultureDashboard());

      act(() => {
        result.current[1].setDisplayMode('compact');
      });
      expect(result.current[0].displayMode).toBe('compact');

      act(() => {
        result.current[1].setDisplayMode('radar-only');
      });
      expect(result.current[0].displayMode).toBe('radar-only');
    });
  });

  describe('togglePanel', () => {
    it('adds and removes panels', () => {
      const config: UseCultureDashboardConfig = {
        initialPanels: ['health-gauge', 'dimensions'],
      };
      const { result } = renderHook(() => useCultureDashboard(config));
      expect(result.current[0].visiblePanels.has('alerts')).toBe(false);

      act(() => {
        result.current[1].togglePanel('alerts');
      });
      expect(result.current[0].visiblePanels.has('alerts')).toBe(true);

      act(() => {
        result.current[1].togglePanel('alerts');
      });
      expect(result.current[0].visiblePanels.has('alerts')).toBe(false);
    });
  });
});
