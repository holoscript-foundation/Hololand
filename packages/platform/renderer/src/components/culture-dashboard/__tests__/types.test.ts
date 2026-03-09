/**
 * @vitest-environment jsdom
 */

/**
 * Tests for Culture Dashboard types module
 *
 * Validates:
 * - Theme default values and Layer 6 transparency
 * - Dimension configuration completeness
 * - Role configuration completeness
 * - Utility functions (formatCultureScore, formatDelta, getCultureHealthColor)
 * - Health state derivation (scoreToCultureHealth, computeDimensionHealth)
 * - Role derivation (deriveCultureRole)
 * - Alert ID generation uniqueness
 * - Overlay opacity application
 * - Frame budget constants
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CULTURE_DASHBOARD_THEME,
  CULTURE_FRAME_BUDGET,
  ALL_CULTURE_DIMENSIONS,
  CULTURE_DIMENSION_CONFIG,
  CULTURE_ROLE_CONFIG,
  getCultureHealthColor,
  getDimensionColor,
  scoreToCultureHealth,
  formatCultureScore,
  formatDelta,
  createCultureAlertId,
  clamp,
  applyOverlayOpacity,
  isDimensionHealthy,
  computeDimensionHealth,
  deriveCultureRole,
} from '../types';
import type { CultureHealthState, CultureDimension, CultureRole } from '../types';

// =============================================================================
// THEME
// =============================================================================

describe('DEFAULT_CULTURE_DASHBOARD_THEME', () => {
  it('has all required text fields', () => {
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.fontFamily).toBeTruthy();
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.fontScale).toBe(1.0);
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.textPrimary).toBeTruthy();
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.textSecondary).toBeTruthy();
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.textMuted).toBeTruthy();
  });

  it('has Layer 6 transparency fields', () => {
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.overlayOpacity).toBe(0.85);
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.containerBackground).toContain('rgba');
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.cardBackground).toContain('rgba');
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.glowColor).toContain('rgba');
  });

  it('has all health state colours', () => {
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.thrivingColor).toBeTruthy();
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.stableColor).toBeTruthy();
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.strainedColor).toBeTruthy();
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.criticalColor).toBeTruthy();
  });

  it('has radar chart colours', () => {
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.radarGridColor).toBeTruthy();
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.radarFillColor).toBeTruthy();
  });

  it('has sparkline and accent colours', () => {
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.sparklineColor).toBeTruthy();
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.sparklineFillColor).toBeTruthy();
    expect(DEFAULT_CULTURE_DASHBOARD_THEME.accentColor).toBeTruthy();
  });
});

// =============================================================================
// DIMENSION CONFIGURATION
// =============================================================================

describe('CULTURE_DIMENSION_CONFIG', () => {
  it('has entries for all five dimensions', () => {
    expect(ALL_CULTURE_DIMENSIONS).toHaveLength(5);
    for (const dim of ALL_CULTURE_DIMENSIONS) {
      const meta = CULTURE_DIMENSION_CONFIG[dim];
      expect(meta.dimension).toBe(dim);
      expect(meta.label).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(meta.icon).toBeTruthy();
      expect(meta.weight).toBeGreaterThan(0);
    }
  });

  it('has valid ideal ranges for all dimensions', () => {
    for (const dim of ALL_CULTURE_DIMENSIONS) {
      const meta = CULTURE_DIMENSION_CONFIG[dim];
      const [min, max] = meta.idealRange;
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(1);
      expect(min).toBeLessThan(max);
    }
  });

  it('contains expected dimension identifiers', () => {
    expect(ALL_CULTURE_DIMENSIONS).toContain('alignment');
    expect(ALL_CULTURE_DIMENSIONS).toContain('collaboration');
    expect(ALL_CULTURE_DIMENSIONS).toContain('norm_adherence');
    expect(ALL_CULTURE_DIMENSIONS).toContain('diversity');
    expect(ALL_CULTURE_DIMENSIONS).toContain('resilience');
  });
});

// =============================================================================
// ROLE CONFIGURATION
// =============================================================================

describe('CULTURE_ROLE_CONFIG', () => {
  const allRoles: CultureRole[] = [
    'leader', 'collaborator', 'conformist', 'innovator', 'observer', 'disruptor',
  ];

  it('has entries for all six roles', () => {
    for (const role of allRoles) {
      const meta = CULTURE_ROLE_CONFIG[role];
      expect(meta.role).toBe(role);
      expect(meta.label).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(meta.icon).toBeTruthy();
    }
  });
});

// =============================================================================
// FRAME BUDGET CONSTANTS
// =============================================================================

describe('CULTURE_FRAME_BUDGET', () => {
  it('has 11.1ms total frame budget for 90Hz VR', () => {
    expect(CULTURE_FRAME_BUDGET.TOTAL_FRAME_MS).toBe(11.1);
  });

  it('has dashboard budget well under 1ms', () => {
    expect(CULTURE_FRAME_BUDGET.DASHBOARD_BUDGET_MS).toBeLessThanOrEqual(1.0);
    expect(CULTURE_FRAME_BUDGET.DASHBOARD_BUDGET_MS).toBe(0.5);
  });

  it('has data push rate capped at 10Hz', () => {
    expect(CULTURE_FRAME_BUDGET.MAX_DATA_PUSH_RATE_HZ).toBe(10);
  });

  it('has reasonable staleness threshold', () => {
    expect(CULTURE_FRAME_BUDGET.STALENESS_THRESHOLD_MS).toBe(5000);
  });

  it('has bounded sparkline, alert, and profile counts', () => {
    expect(CULTURE_FRAME_BUDGET.MAX_SPARKLINE_SAMPLES).toBe(60);
    expect(CULTURE_FRAME_BUDGET.MAX_ALERTS).toBe(30);
    expect(CULTURE_FRAME_BUDGET.MAX_AGENT_PROFILES).toBe(20);
  });

  it('dashboard budget leaves headroom for splat rendering', () => {
    const splatBudget = 5.5;
    const remaining = CULTURE_FRAME_BUDGET.TOTAL_FRAME_MS - splatBudget - CULTURE_FRAME_BUDGET.DASHBOARD_BUDGET_MS;
    expect(remaining).toBeGreaterThan(4.0);
  });
});

// =============================================================================
// HEALTH STATE COLOUR MAPPING
// =============================================================================

describe('getCultureHealthColor', () => {
  it('returns correct colours for each health state', () => {
    const theme = DEFAULT_CULTURE_DASHBOARD_THEME;
    expect(getCultureHealthColor('thriving', theme)).toBe(theme.thrivingColor);
    expect(getCultureHealthColor('stable', theme)).toBe(theme.stableColor);
    expect(getCultureHealthColor('strained', theme)).toBe(theme.strainedColor);
    expect(getCultureHealthColor('critical', theme)).toBe(theme.criticalColor);
  });

  it('falls back to textMuted for unknown state', () => {
    const theme = DEFAULT_CULTURE_DASHBOARD_THEME;
    expect(getCultureHealthColor('unknown' as CultureHealthState, theme)).toBe(theme.textMuted);
  });
});

// =============================================================================
// DIMENSION COLOUR
// =============================================================================

describe('getDimensionColor', () => {
  it('returns config colour by default', () => {
    const theme = DEFAULT_CULTURE_DASHBOARD_THEME;
    for (const dim of ALL_CULTURE_DIMENSIONS) {
      expect(getDimensionColor(dim, theme)).toBe(CULTURE_DIMENSION_CONFIG[dim].color);
    }
  });

  it('returns theme override when provided', () => {
    const theme = {
      ...DEFAULT_CULTURE_DASHBOARD_THEME,
      dimensionColors: { alignment: '#ff0000' },
    };
    expect(getDimensionColor('alignment', theme)).toBe('#ff0000');
    // Non-overridden dimensions use config colour
    expect(getDimensionColor('collaboration', theme)).toBe(CULTURE_DIMENSION_CONFIG.collaboration.color);
  });
});

// =============================================================================
// SCORE TO HEALTH
// =============================================================================

describe('scoreToCultureHealth', () => {
  it('returns thriving for scores >= 0.75', () => {
    expect(scoreToCultureHealth(0.75)).toBe('thriving');
    expect(scoreToCultureHealth(0.9)).toBe('thriving');
    expect(scoreToCultureHealth(1.0)).toBe('thriving');
  });

  it('returns stable for scores >= 0.5 and < 0.75', () => {
    expect(scoreToCultureHealth(0.5)).toBe('stable');
    expect(scoreToCultureHealth(0.6)).toBe('stable');
    expect(scoreToCultureHealth(0.74)).toBe('stable');
  });

  it('returns strained for scores >= 0.25 and < 0.5', () => {
    expect(scoreToCultureHealth(0.25)).toBe('strained');
    expect(scoreToCultureHealth(0.35)).toBe('strained');
    expect(scoreToCultureHealth(0.49)).toBe('strained');
  });

  it('returns critical for scores < 0.25', () => {
    expect(scoreToCultureHealth(0.0)).toBe('critical');
    expect(scoreToCultureHealth(0.1)).toBe('critical');
    expect(scoreToCultureHealth(0.24)).toBe('critical');
  });
});

// =============================================================================
// FORMAT FUNCTIONS
// =============================================================================

describe('formatCultureScore', () => {
  it('formats scores as percentage with one decimal', () => {
    expect(formatCultureScore(0.85)).toBe('85.0%');
    expect(formatCultureScore(0)).toBe('0.0%');
    expect(formatCultureScore(1)).toBe('100.0%');
    expect(formatCultureScore(0.5555)).toBe('55.5%');
  });
});

describe('formatDelta', () => {
  it('formats positive deltas with plus sign', () => {
    expect(formatDelta(0.8, 0.7)).toBe('+10.0%');
    expect(formatDelta(0.5, 0.5)).toBe('+0.0%');
  });

  it('formats negative deltas with minus sign', () => {
    expect(formatDelta(0.7, 0.8)).toBe('-10.0%');
    expect(formatDelta(0.3, 0.5)).toBe('-20.0%');
  });
});

// =============================================================================
// DIMENSION HEALTH
// =============================================================================

describe('isDimensionHealthy', () => {
  it('returns true when score is within ideal range', () => {
    // alignment ideal: [0.6, 0.9]
    expect(isDimensionHealthy('alignment', 0.7)).toBe(true);
    expect(isDimensionHealthy('alignment', 0.6)).toBe(true);
    expect(isDimensionHealthy('alignment', 0.9)).toBe(true);
  });

  it('returns false when score is outside ideal range', () => {
    expect(isDimensionHealthy('alignment', 0.5)).toBe(false);
    expect(isDimensionHealthy('alignment', 0.95)).toBe(false);
  });
});

describe('computeDimensionHealth', () => {
  it('returns thriving when within ideal range', () => {
    expect(computeDimensionHealth('alignment', 0.75)).toBe('thriving');
  });

  it('returns stable when close to ideal range boundary', () => {
    // alignment ideal: [0.6, 0.9], so 0.55 is 0.05 below min -> stable
    expect(computeDimensionHealth('alignment', 0.55)).toBe('stable');
    // 0.95 is 0.05 above max -> stable
    expect(computeDimensionHealth('alignment', 0.95)).toBe('stable');
  });

  it('returns strained when moderately outside ideal range', () => {
    // alignment ideal min is 0.6, so 0.4 is 0.2 below -> strained
    expect(computeDimensionHealth('alignment', 0.4)).toBe('strained');
  });

  it('returns critical when far outside ideal range', () => {
    // alignment ideal min is 0.6, so 0.1 is 0.5 below -> critical
    expect(computeDimensionHealth('alignment', 0.1)).toBe('critical');
  });
});

// =============================================================================
// ROLE DERIVATION
// =============================================================================

describe('deriveCultureRole', () => {
  const makeScores = (overrides: Partial<Record<CultureDimension, number>> = {}): Record<CultureDimension, number> => ({
    alignment: 0.5,
    collaboration: 0.5,
    norm_adherence: 0.5,
    diversity: 0.5,
    resilience: 0.5,
    ...overrides,
  });

  it('identifies leaders with high alignment and collaboration', () => {
    expect(deriveCultureRole(makeScores({ alignment: 0.8, collaboration: 0.75 }))).toBe('leader');
  });

  it('identifies disruptors with low norm adherence', () => {
    expect(deriveCultureRole(makeScores({ norm_adherence: 0.2 }))).toBe('disruptor');
  });

  it('identifies collaborators with high collaboration', () => {
    expect(deriveCultureRole(makeScores({ collaboration: 0.8, alignment: 0.5 }))).toBe('collaborator');
  });

  it('identifies innovators with high diversity and moderate norms', () => {
    expect(deriveCultureRole(makeScores({ diversity: 0.8, norm_adherence: 0.5 }))).toBe('innovator');
  });

  it('identifies conformists with high norms and low diversity', () => {
    expect(deriveCultureRole(makeScores({ norm_adherence: 0.8, diversity: 0.3 }))).toBe('conformist');
  });

  it('defaults to observer when no strong patterns', () => {
    expect(deriveCultureRole(makeScores())).toBe('observer');
  });
});

// =============================================================================
// ALERT ID GENERATION
// =============================================================================

describe('createCultureAlertId', () => {
  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createCultureAlertId());
    }
    expect(ids.size).toBe(100);
  });

  it('starts with "culture-alert-" prefix', () => {
    const id = createCultureAlertId();
    expect(id.startsWith('culture-alert-')).toBe(true);
  });
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

describe('clamp', () => {
  it('clamps values to range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles edge cases at boundaries', () => {
    expect(clamp(0, 0, 1)).toBe(0);
    expect(clamp(1, 0, 1)).toBe(1);
  });
});

describe('applyOverlayOpacity', () => {
  it('replaces alpha in rgba string', () => {
    const result = applyOverlayOpacity('rgba(8, 12, 28, 0.85)', 0.5);
    expect(result).toBe('rgba(8, 12, 28, 0.50)');
  });

  it('handles rgb string (no alpha)', () => {
    const result = applyOverlayOpacity('rgb(8, 12, 28)', 0.7);
    expect(result).toBe('rgba(8, 12, 28, 0.70)');
  });

  it('clamps opacity to 0-1 range', () => {
    const result = applyOverlayOpacity('rgba(8, 12, 28, 0.85)', 1.5);
    expect(result).toBe('rgba(8, 12, 28, 1.00)');

    const result2 = applyOverlayOpacity('rgba(8, 12, 28, 0.85)', -0.5);
    expect(result2).toBe('rgba(8, 12, 28, 0.00)');
  });

  it('returns original string for non-rgba input', () => {
    const result = applyOverlayOpacity('#ff0000', 0.5);
    expect(result).toBe('#ff0000');
  });
});

// =============================================================================
// TYPE CORRECTNESS (compile-time checks)
// =============================================================================

describe('type correctness', () => {
  it('CultureHealthState accepts all valid values', () => {
    const states: CultureHealthState[] = ['thriving', 'stable', 'strained', 'critical'];
    expect(states).toHaveLength(4);
  });

  it('CultureDimension accepts all valid values', () => {
    const dims: CultureDimension[] = [
      'alignment', 'collaboration', 'norm_adherence', 'diversity', 'resilience',
    ];
    expect(dims).toHaveLength(5);
  });

  it('CultureRole accepts all valid values', () => {
    const roles: CultureRole[] = [
      'leader', 'collaborator', 'conformist', 'innovator', 'observer', 'disruptor',
    ];
    expect(roles).toHaveLength(6);
  });

  it('CULTURE_FRAME_BUDGET is readonly (const assertion)', () => {
    expect(typeof CULTURE_FRAME_BUDGET.TOTAL_FRAME_MS).toBe('number');
    expect(typeof CULTURE_FRAME_BUDGET.DASHBOARD_BUDGET_MS).toBe('number');
    expect(typeof CULTURE_FRAME_BUDGET.MAX_DATA_PUSH_RATE_HZ).toBe('number');
    expect(typeof CULTURE_FRAME_BUDGET.STALENESS_THRESHOLD_MS).toBe('number');
    expect(typeof CULTURE_FRAME_BUDGET.MAX_SPARKLINE_SAMPLES).toBe('number');
    expect(typeof CULTURE_FRAME_BUDGET.MAX_ALERTS).toBe('number');
    expect(typeof CULTURE_FRAME_BUDGET.MAX_AGENT_PROFILES).toBe('number');
  });
});
