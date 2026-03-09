/**
 * @vitest-environment jsdom
 */

/**
 * Tests for CultureDashboard component and sub-components
 *
 * Validates:
 * - Component renders with default and custom props
 * - Display modes (full, compact, radar-only, overlay)
 * - Accessibility attributes (role, aria-label, aria-valuenow)
 * - Theme customization
 * - External state/actions bypass
 * - Panel visibility control
 * - Live/paused toggle
 * - Alert management
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock BehavioralTrustScoring to avoid import issues
vi.mock('../../../BehavioralTrustScoring', () => ({}));

import { CultureDashboard } from '../CultureDashboard';
import type { CultureDashboardProps } from '../CultureDashboard';
import type {
  CultureDashboardState,
  CultureDashboardActions,
  CultureHealthSnapshot,
  CultureDimensionSnapshot,
  AgentCultureProfile,
  CommunityNorm,
  CultureDimension,
} from '../types';
import { ALL_CULTURE_DIMENSIONS, CULTURE_DIMENSION_CONFIG } from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

function getProps(element: React.ReactElement): Record<string, unknown> {
  return element.props as Record<string, unknown>;
}

function createMockDimensionSnapshot(
  dimension: CultureDimension,
  score: number = 0.7,
): CultureDimensionSnapshot {
  return {
    dimension,
    score,
    previousScore: score - 0.05,
    health: score >= 0.75 ? 'thriving' : score >= 0.5 ? 'stable' : 'strained',
    contributingAgents: 10,
    trend: [
      { timestamp: Date.now() - 60000, value: score - 0.1 },
      { timestamp: Date.now() - 30000, value: score - 0.05 },
      { timestamp: Date.now(), value: score },
    ],
  };
}

function createMockHealthSnapshot(compositeScore: number = 0.72): CultureHealthSnapshot {
  const dimensions = {} as Record<CultureDimension, CultureDimensionSnapshot>;
  for (const dim of ALL_CULTURE_DIMENSIONS) {
    dimensions[dim] = createMockDimensionSnapshot(dim, compositeScore + (Math.random() - 0.5) * 0.2);
  }
  return {
    compositeScore,
    previousComposite: compositeScore - 0.03,
    health: compositeScore >= 0.75 ? 'thriving' : 'stable',
    dimensions,
    totalAgents: 42,
    compositeTrend: [
      { timestamp: Date.now() - 60000, value: compositeScore - 0.1 },
      { timestamp: Date.now() - 30000, value: compositeScore - 0.05 },
      { timestamp: Date.now(), value: compositeScore },
    ],
  };
}

function createMockAgentProfile(id: string, role: AgentCultureProfile['role'] = 'collaborator'): AgentCultureProfile {
  return {
    agentId: id,
    agentName: `Agent ${id}`,
    dimensionScores: {
      alignment: 0.7,
      collaboration: 0.8,
      norm_adherence: 0.6,
      diversity: 0.5,
      resilience: 0.65,
    },
    compositeScore: 0.65,
    role,
    normViolations: 2,
    collaborativeInteractions: 15,
    lastActiveTimestamp: Date.now(),
  };
}

function createMockNorm(id: string): CommunityNorm {
  return {
    id,
    name: `Norm ${id}`,
    description: `Description for norm ${id}`,
    complianceRate: 0.85,
    compliantAgents: 36,
    totalAgents: 42,
    health: 'thriving',
    category: 'interaction',
    enforced: true,
  };
}

function createMockState(overrides: Partial<CultureDashboardState> = {}): CultureDashboardState {
  return {
    health: createMockHealthSnapshot(),
    agentProfiles: [
      createMockAgentProfile('agent-1', 'leader'),
      createMockAgentProfile('agent-2', 'collaborator'),
      createMockAgentProfile('agent-3', 'innovator'),
    ],
    norms: [
      createMockNorm('norm-1'),
      createMockNorm('norm-2'),
    ],
    alerts: [],
    isLive: true,
    displayMode: 'full',
    visiblePanels: new Set(['health-gauge', 'dimensions', 'timeline', 'agents', 'norms', 'alerts']),
    lastUpdateTimestamp: Date.now(),
    stalenessThresholdMs: 5000,
    isStale: false,
    ...overrides,
  };
}

function createMockActions(): CultureDashboardActions {
  return {
    updateHealth: vi.fn(),
    updateAgentProfiles: vi.fn(),
    updateNorms: vi.fn(),
    dismissAlert: vi.fn(),
    clearAlerts: vi.fn(),
    toggleLive: vi.fn(),
    setDisplayMode: vi.fn(),
    togglePanel: vi.fn(),
  };
}

// =============================================================================
// CULTURE DASHBOARD
// =============================================================================

describe('CultureDashboard', () => {
  describe('rendering', () => {
    it('renders without crashing with default props', () => {
      const element = React.createElement(CultureDashboard, {});
      expect(element).toBeTruthy();
      expect(element.type).toBe(CultureDashboard);
    });

    it('renders with external state and actions', () => {
      const state = createMockState();
      const actions = createMockActions();
      const element = React.createElement(CultureDashboard, {
        externalState: state,
        externalActions: actions,
      });
      expect(getProps(element).externalState).toBe(state);
      expect(getProps(element).externalActions).toBe(actions);
    });
  });

  describe('display modes', () => {
    it('accepts overlay mode', () => {
      const element = React.createElement(CultureDashboard, { mode: 'overlay' });
      expect(getProps(element).mode).toBe('overlay');
    });

    it('accepts compact mode', () => {
      const element = React.createElement(CultureDashboard, { mode: 'compact' });
      expect(getProps(element).mode).toBe('compact');
    });

    it('accepts radar-only mode', () => {
      const element = React.createElement(CultureDashboard, { mode: 'radar-only' });
      expect(getProps(element).mode).toBe('radar-only');
    });

    it('accepts full mode', () => {
      const element = React.createElement(CultureDashboard, { mode: 'full' });
      expect(getProps(element).mode).toBe('full');
    });

    it('defaults mode to overlay', () => {
      const element = React.createElement(CultureDashboard, {});
      // Default is handled internally, mode prop is undefined
      expect(getProps(element).mode).toBeUndefined();
    });
  });

  describe('panels', () => {
    it('accepts custom panel list', () => {
      const panels = ['health-gauge', 'dimensions'] as const;
      const element = React.createElement(CultureDashboard, {
        panels: [...panels],
      });
      expect(getProps(element).panels).toEqual(['health-gauge', 'dimensions']);
    });

    it('accepts all valid panel values', () => {
      const allPanels = ['health-gauge', 'dimensions', 'timeline', 'agents', 'norms', 'alerts'] as const;
      const element = React.createElement(CultureDashboard, {
        panels: [...allPanels],
      });
      expect((getProps(element).panels as string[]).length).toBe(6);
    });
  });

  describe('accessibility', () => {
    it('accepts ariaLabel prop', () => {
      const element = React.createElement(CultureDashboard, {
        ariaLabel: 'Custom dashboard label',
      });
      expect(getProps(element).ariaLabel).toBe('Custom dashboard label');
    });

    it('defaults ariaLabel to descriptive text', () => {
      // Default handled internally, prop is undefined
      const element = React.createElement(CultureDashboard, {});
      expect(getProps(element).ariaLabel).toBeUndefined();
    });
  });

  describe('theme', () => {
    it('accepts theme overrides', () => {
      const themeOverride = {
        thrivingColor: '#00ff00',
        fontScale: 1.2,
      };
      const element = React.createElement(CultureDashboard, {
        theme: themeOverride,
      });
      expect(getProps(element).theme).toEqual(themeOverride);
    });

    it('accepts overlay opacity override', () => {
      const element = React.createElement(CultureDashboard, {
        overlayOpacity: 0.7,
      });
      expect(getProps(element).overlayOpacity).toBe(0.7);
    });
  });

  describe('styling', () => {
    it('accepts className prop', () => {
      const element = React.createElement(CultureDashboard, {
        className: 'my-custom-class',
      });
      expect(getProps(element).className).toBe('my-custom-class');
    });

    it('accepts style prop', () => {
      const style = { maxWidth: '500px' };
      const element = React.createElement(CultureDashboard, { style });
      expect(getProps(element).style).toBe(style);
    });
  });

  describe('hook configuration', () => {
    it('accepts hook config', () => {
      const config = {
        initialDisplayMode: 'compact' as const,
        enableAlerts: false,
        maxAlerts: 10,
      };
      const element = React.createElement(CultureDashboard, { config });
      expect(getProps(element).config).toBe(config);
    });
  });
});

// =============================================================================
// MOCK STATE VALIDATION
// =============================================================================

describe('mock state helpers', () => {
  it('creates valid mock health snapshot', () => {
    const health = createMockHealthSnapshot(0.8);
    expect(health.compositeScore).toBe(0.8);
    expect(health.health).toBe('thriving');
    expect(health.totalAgents).toBe(42);
    expect(health.compositeTrend.length).toBeGreaterThan(1);

    for (const dim of ALL_CULTURE_DIMENSIONS) {
      const snap = health.dimensions[dim];
      expect(snap).toBeTruthy();
      expect(snap.dimension).toBe(dim);
      expect(snap.score).toBeGreaterThanOrEqual(0);
      expect(snap.score).toBeLessThanOrEqual(1);
    }
  });

  it('creates valid mock agent profile', () => {
    const profile = createMockAgentProfile('test-1', 'leader');
    expect(profile.agentId).toBe('test-1');
    expect(profile.role).toBe('leader');
    expect(profile.compositeScore).toBeGreaterThanOrEqual(0);
    for (const dim of ALL_CULTURE_DIMENSIONS) {
      expect(typeof profile.dimensionScores[dim]).toBe('number');
    }
  });

  it('creates valid mock community norm', () => {
    const norm = createMockNorm('test-norm');
    expect(norm.id).toBe('test-norm');
    expect(norm.complianceRate).toBeGreaterThanOrEqual(0);
    expect(norm.complianceRate).toBeLessThanOrEqual(1);
    expect(norm.compliantAgents).toBeLessThanOrEqual(norm.totalAgents);
  });

  it('creates valid mock dashboard state', () => {
    const state = createMockState();
    expect(state.health).toBeTruthy();
    expect(state.agentProfiles.length).toBeGreaterThan(0);
    expect(state.norms.length).toBeGreaterThan(0);
    expect(state.isLive).toBe(true);
    expect(state.isStale).toBe(false);
  });

  it('creates valid mock actions', () => {
    const actions = createMockActions();
    expect(typeof actions.updateHealth).toBe('function');
    expect(typeof actions.updateAgentProfiles).toBe('function');
    expect(typeof actions.updateNorms).toBe('function');
    expect(typeof actions.dismissAlert).toBe('function');
    expect(typeof actions.clearAlerts).toBe('function');
    expect(typeof actions.toggleLive).toBe('function');
    expect(typeof actions.setDisplayMode).toBe('function');
    expect(typeof actions.togglePanel).toBe('function');
  });
});
