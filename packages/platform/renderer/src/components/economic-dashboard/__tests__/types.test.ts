/**
 * @vitest-environment jsdom
 */

/**
 * Tests for Economic Dashboard types module
 *
 * Validates:
 * - Theme default values and Layer 6 transparency
 * - Utility functions (formatCurrency, formatPercent, formatRatio, formatGini)
 * - Health state colour mapping
 * - computeHealthState logic
 * - Alert ID generation uniqueness
 * - Overlay opacity application
 * - Frame budget constants
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ECON_DASHBOARD_THEME,
  FRAME_BUDGET,
  getHealthStateColor,
  formatCurrency,
  formatPercent,
  formatRatio,
  formatGini,
  computeHealthState,
  createEconAlertId,
  clamp,
  applyOverlayOpacity,
} from '../types';
import type { EconHealthState } from '../types';

// =============================================================================
// THEME
// =============================================================================

describe('DEFAULT_ECON_DASHBOARD_THEME', () => {
  it('has all required text fields', () => {
    expect(DEFAULT_ECON_DASHBOARD_THEME.fontFamily).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.fontScale).toBe(1.0);
    expect(DEFAULT_ECON_DASHBOARD_THEME.textPrimary).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.textSecondary).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.textMuted).toBeTruthy();
  });

  it('has Layer 6 transparency fields', () => {
    expect(DEFAULT_ECON_DASHBOARD_THEME.overlayOpacity).toBe(0.85);
    expect(DEFAULT_ECON_DASHBOARD_THEME.containerBackground).toContain('rgba');
    expect(DEFAULT_ECON_DASHBOARD_THEME.cardBackground).toContain('rgba');
    expect(DEFAULT_ECON_DASHBOARD_THEME.glowColor).toContain('rgba');
  });

  it('has all health state colours', () => {
    expect(DEFAULT_ECON_DASHBOARD_THEME.healthyColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.cautionColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.warningColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.criticalColor).toBeTruthy();
  });

  it('has all metric-specific colours', () => {
    expect(DEFAULT_ECON_DASHBOARD_THEME.inflationColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.giniColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.velocityColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.faucetColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.sinkColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.pidOutputColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.pidSetpointColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.pidErrorColor).toBeTruthy();
  });

  it('has sparkline and accent colours', () => {
    expect(DEFAULT_ECON_DASHBOARD_THEME.sparklineColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.sparklineFillColor).toBeTruthy();
    expect(DEFAULT_ECON_DASHBOARD_THEME.accentColor).toBeTruthy();
  });
});

// =============================================================================
// FRAME BUDGET CONSTANTS
// =============================================================================

describe('FRAME_BUDGET', () => {
  it('has 11.1ms total frame budget for 90Hz VR', () => {
    expect(FRAME_BUDGET.TOTAL_FRAME_MS).toBe(11.1);
  });

  it('has dashboard budget well under 1ms', () => {
    expect(FRAME_BUDGET.DASHBOARD_BUDGET_MS).toBeLessThanOrEqual(1.0);
    expect(FRAME_BUDGET.DASHBOARD_BUDGET_MS).toBe(0.5);
  });

  it('has data push rate capped at 10Hz', () => {
    expect(FRAME_BUDGET.MAX_DATA_PUSH_RATE_HZ).toBe(10);
  });

  it('has reasonable staleness threshold', () => {
    expect(FRAME_BUDGET.STALENESS_THRESHOLD_MS).toBe(5000);
  });

  it('has bounded sparkline and alert counts', () => {
    expect(FRAME_BUDGET.MAX_SPARKLINE_SAMPLES).toBe(60);
    expect(FRAME_BUDGET.MAX_ALERTS).toBe(30);
  });

  it('dashboard budget leaves headroom for splat rendering', () => {
    // Splat rendering ~5.5ms, dashboard 0.5ms, leaves ~5.1ms for other systems
    const splatBudget = 5.5;
    const remaining = FRAME_BUDGET.TOTAL_FRAME_MS - splatBudget - FRAME_BUDGET.DASHBOARD_BUDGET_MS;
    expect(remaining).toBeGreaterThan(4.0);
  });
});

// =============================================================================
// HEALTH STATE COLOUR MAPPING
// =============================================================================

describe('getHealthStateColor', () => {
  it('returns correct colours for each health state', () => {
    const theme = DEFAULT_ECON_DASHBOARD_THEME;
    expect(getHealthStateColor('healthy', theme)).toBe(theme.healthyColor);
    expect(getHealthStateColor('caution', theme)).toBe(theme.cautionColor);
    expect(getHealthStateColor('warning', theme)).toBe(theme.warningColor);
    expect(getHealthStateColor('critical', theme)).toBe(theme.criticalColor);
  });

  it('falls back to textMuted for unknown state', () => {
    const theme = DEFAULT_ECON_DASHBOARD_THEME;
    // Force an unknown state through type cast
    expect(getHealthStateColor('unknown' as EconHealthState, theme)).toBe(theme.textMuted);
  });
});

// =============================================================================
// FORMAT FUNCTIONS
// =============================================================================

describe('formatCurrency', () => {
  it('formats small values as integers', () => {
    expect(formatCurrency(0)).toBe('0.00');
    expect(formatCurrency(42)).toBe('42');
    expect(formatCurrency(999)).toBe('999');
  });

  it('formats sub-unit values with decimals', () => {
    expect(formatCurrency(0.5)).toBe('0.50');
    expect(formatCurrency(0.01)).toBe('0.01');
  });

  it('formats thousands with K suffix', () => {
    expect(formatCurrency(1000)).toBe('1.0K');
    expect(formatCurrency(5600)).toBe('5.6K');
    expect(formatCurrency(999999)).toBe('1000.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatCurrency(1000000)).toBe('1.0M');
    expect(formatCurrency(2500000)).toBe('2.5M');
  });

  it('formats billions with B suffix', () => {
    expect(formatCurrency(1000000000)).toBe('1.0B');
    expect(formatCurrency(7500000000)).toBe('7.5B');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-5000)).toBe('-5.0K');
    expect(formatCurrency(-42)).toBe('-42');
  });
});

describe('formatPercent', () => {
  it('formats with default 2 decimal places', () => {
    expect(formatPercent(2.15)).toBe('2.15%');
    expect(formatPercent(0.05)).toBe('0.05%');
    expect(formatPercent(3.14159)).toBe('3.14%');
  });

  it('respects custom decimal places', () => {
    expect(formatPercent(2.16, 1)).toBe('2.2%');
    expect(formatPercent(2.15, 0)).toBe('2%');
    expect(formatPercent(2.15, 3)).toBe('2.150%');
  });

  it('handles negative values', () => {
    expect(formatPercent(-1.5)).toBe('-1.50%');
  });
});

describe('formatRatio', () => {
  it('formats with 2 decimal places and x suffix', () => {
    expect(formatRatio(1.05)).toBe('1.05x');
    expect(formatRatio(0.95)).toBe('0.95x');
    expect(formatRatio(1.0)).toBe('1.00x');
  });
});

describe('formatGini', () => {
  it('formats with 3 decimal places', () => {
    expect(formatGini(0.42)).toBe('0.420');
    expect(formatGini(0)).toBe('0.000');
    expect(formatGini(1)).toBe('1.000');
    expect(formatGini(0.3456)).toBe('0.346');
  });
});

// =============================================================================
// HEALTH STATE COMPUTATION
// =============================================================================

describe('computeHealthState', () => {
  it('returns healthy when value is at target', () => {
    expect(computeHealthState(2.0, 2.0, 0.5, 1.0, 2.0)).toBe('healthy');
  });

  it('returns caution when deviation exceeds caution delta', () => {
    expect(computeHealthState(2.6, 2.0, 0.5, 1.0, 2.0)).toBe('caution');
    expect(computeHealthState(1.4, 2.0, 0.5, 1.0, 2.0)).toBe('caution');
  });

  it('returns warning when deviation exceeds warning delta', () => {
    expect(computeHealthState(3.1, 2.0, 0.5, 1.0, 2.0)).toBe('warning');
    expect(computeHealthState(0.9, 2.0, 0.5, 1.0, 2.0)).toBe('warning');
  });

  it('returns critical when deviation exceeds critical delta', () => {
    expect(computeHealthState(4.1, 2.0, 0.5, 1.0, 2.0)).toBe('critical');
    expect(computeHealthState(-0.1, 2.0, 0.5, 1.0, 2.0)).toBe('critical');
  });

  it('uses absolute deviation (symmetric)', () => {
    expect(computeHealthState(2.0 - 0.6, 2.0, 0.5, 1.0, 2.0)).toBe('caution');
    expect(computeHealthState(2.0 + 0.6, 2.0, 0.5, 1.0, 2.0)).toBe('caution');
  });

  it('critical takes precedence over all others at exact boundary', () => {
    // At exactly the critical boundary
    expect(computeHealthState(4.0, 2.0, 0.5, 1.0, 2.0)).toBe('critical');
  });
});

// =============================================================================
// ALERT ID GENERATION
// =============================================================================

describe('createEconAlertId', () => {
  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createEconAlertId());
    }
    expect(ids.size).toBe(100);
  });

  it('starts with "econ-alert-" prefix', () => {
    const id = createEconAlertId();
    expect(id.startsWith('econ-alert-')).toBe(true);
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

  it('supports Layer 6 transparency default (0.85)', () => {
    const result = applyOverlayOpacity('rgba(8, 12, 28, 0.5)', 0.85);
    expect(result).toBe('rgba(8, 12, 28, 0.85)');
  });
});

// =============================================================================
// TYPE CORRECTNESS (compile-time checks)
// =============================================================================

describe('type correctness', () => {
  it('EconHealthState accepts all valid values', () => {
    const states: EconHealthState[] = ['healthy', 'caution', 'warning', 'critical'];
    expect(states).toHaveLength(4);
  });

  it('FRAME_BUDGET is readonly (const assertion)', () => {
    // This just verifies the constant is accessible and has expected shape
    expect(typeof FRAME_BUDGET.TOTAL_FRAME_MS).toBe('number');
    expect(typeof FRAME_BUDGET.DASHBOARD_BUDGET_MS).toBe('number');
    expect(typeof FRAME_BUDGET.MAX_DATA_PUSH_RATE_HZ).toBe('number');
    expect(typeof FRAME_BUDGET.STALENESS_THRESHOLD_MS).toBe('number');
    expect(typeof FRAME_BUDGET.MAX_SPARKLINE_SAMPLES).toBe('number');
    expect(typeof FRAME_BUDGET.MAX_ALERTS).toBe('number');
    expect(typeof FRAME_BUDGET.ALERT_COOLDOWN_MS).toBe('number');
  });
});
