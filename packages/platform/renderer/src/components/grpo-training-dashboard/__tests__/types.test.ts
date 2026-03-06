/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GRPO Training Dashboard shared types and utility functions.
 *
 * Validates:
 * - getKLStatus threshold logic
 * - getKLStatusColor mapping
 * - formatStep number formatting
 * - formatDuration time formatting
 * - formatPercent percentage formatting
 * - DEFAULT_GRPO_THEME completeness
 * - DEFAULT_REWARD_CONFIGS correctness
 */

import { describe, it, expect } from 'vitest';
import {
  getKLStatus,
  getKLStatusColor,
  formatStep,
  formatDuration,
  formatPercent,
  DEFAULT_GRPO_THEME,
  DEFAULT_REWARD_CONFIGS,
} from '../types';
import type {
  RewardSignalName,
  KLStatus,
  GRPOTheme,
} from '../types';

// =============================================================================
// getKLStatus
// =============================================================================

describe('getKLStatus', () => {
  const threshold = 0.04;

  it('returns nominal when KL is well below threshold', () => {
    expect(getKLStatus(0.01, threshold)).toBe('nominal');
  });

  it('returns nominal when KL is below 75% of threshold', () => {
    expect(getKLStatus(0.02, threshold)).toBe('nominal');
  });

  it('returns elevated when KL is at 75% of threshold', () => {
    expect(getKLStatus(0.03, threshold)).toBe('elevated');
  });

  it('returns elevated when KL is between 75% and 100% of threshold', () => {
    expect(getKLStatus(0.035, threshold)).toBe('elevated');
  });

  it('returns critical when KL equals threshold', () => {
    expect(getKLStatus(0.04, threshold)).toBe('critical');
  });

  it('returns critical when KL exceeds threshold', () => {
    expect(getKLStatus(0.06, threshold)).toBe('critical');
  });

  it('returns nominal for zero KL', () => {
    expect(getKLStatus(0, threshold)).toBe('nominal');
  });
});

// =============================================================================
// getKLStatusColor
// =============================================================================

describe('getKLStatusColor', () => {
  const theme = DEFAULT_GRPO_THEME;

  it('returns successColor for nominal status', () => {
    expect(getKLStatusColor('nominal', theme)).toBe(theme.successColor);
  });

  it('returns warningColor for elevated status', () => {
    expect(getKLStatusColor('elevated', theme)).toBe(theme.warningColor);
  });

  it('returns dangerColor for critical status', () => {
    expect(getKLStatusColor('critical', theme)).toBe(theme.dangerColor);
  });
});

// =============================================================================
// formatStep
// =============================================================================

describe('formatStep', () => {
  it('formats small numbers as-is', () => {
    expect(formatStep(42)).toBe('42');
    expect(formatStep(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatStep(1000)).toBe('1.0K');
    expect(formatStep(5500)).toBe('5.5K');
    expect(formatStep(10000)).toBe('10.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatStep(1000000)).toBe('1.0M');
    expect(formatStep(2500000)).toBe('2.5M');
  });

  it('formats zero correctly', () => {
    expect(formatStep(0)).toBe('0');
  });
});

// =============================================================================
// formatDuration
// =============================================================================

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(0)).toBe('0s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3599)).toBe('59m 59s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(7260)).toBe('2h 1m');
  });
});

// =============================================================================
// formatPercent
// =============================================================================

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    expect(formatPercent(0.856)).toBe('85.6%');
    expect(formatPercent(1.0)).toBe('100.0%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('respects decimal places parameter', () => {
    expect(formatPercent(0.8567, 2)).toBe('85.67%');
    expect(formatPercent(0.8567, 0)).toBe('86%');
  });
});

// =============================================================================
// DEFAULT_GRPO_THEME
// =============================================================================

describe('DEFAULT_GRPO_THEME', () => {
  it('has all required theme properties', () => {
    const requiredKeys: (keyof GRPOTheme)[] = [
      'fontFamily', 'fontScale', 'borderRadius',
      'containerBackground', 'cardBackground',
      'textPrimary', 'textSecondary', 'textMuted',
      'borderColor', 'successColor', 'warningColor', 'dangerColor', 'accentColor',
      'testPassColor', 'typeCheckColor', 'lintColor',
      'coverageColor', 'circuitBreakerColor', 'compositeColor',
      'klLineColor', 'klAreaColor', 'klThresholdColor',
      'bestCompletionColor', 'worstCompletionColor',
      'humanEvalColor', 'mbppColor', 'baselineColor',
    ];

    for (const key of requiredKeys) {
      expect(DEFAULT_GRPO_THEME).toHaveProperty(key);
      expect(DEFAULT_GRPO_THEME[key]).toBeTruthy();
    }
  });

  it('has fontScale of 1.0 by default', () => {
    expect(DEFAULT_GRPO_THEME.fontScale).toBe(1.0);
  });

  it('uses proper color format (hex or rgba)', () => {
    const colorKeys = [
      'textPrimary', 'successColor', 'warningColor', 'dangerColor',
      'testPassColor', 'typeCheckColor', 'lintColor',
    ] as const;

    for (const key of colorKeys) {
      const color = DEFAULT_GRPO_THEME[key];
      expect(color).toMatch(/^(#[0-9a-fA-F]{6}|rgba?\()/);
    }
  });
});

// =============================================================================
// DEFAULT_REWARD_CONFIGS
// =============================================================================

describe('DEFAULT_REWARD_CONFIGS', () => {
  it('has exactly 6 reward signals', () => {
    expect(DEFAULT_REWARD_CONFIGS).toHaveLength(6);
  });

  it('includes all required signal names', () => {
    const names = DEFAULT_REWARD_CONFIGS.map((c) => c.name);
    expect(names).toContain('testPassReward');
    expect(names).toContain('typeCheckReward');
    expect(names).toContain('lintReward');
    expect(names).toContain('coverageReward');
    expect(names).toContain('circuitBreakerReward');
    expect(names).toContain('composite');
  });

  it('has correct weights summing approximately to 1.0', () => {
    const weightedConfigs = DEFAULT_REWARD_CONFIGS.filter((c) => c.weight !== null);
    const weightSum = weightedConfigs.reduce((sum, c) => sum + (c.weight ?? 0), 0);
    expect(weightSum).toBeCloseTo(1.0, 2);
  });

  it('composite has null weight', () => {
    const composite = DEFAULT_REWARD_CONFIGS.find((c) => c.name === 'composite');
    expect(composite).toBeDefined();
    expect(composite!.weight).toBeNull();
  });

  it('testPassReward has weight 0.40', () => {
    const config = DEFAULT_REWARD_CONFIGS.find((c) => c.name === 'testPassReward');
    expect(config!.weight).toBe(0.40);
  });

  it('all configs start visible', () => {
    for (const config of DEFAULT_REWARD_CONFIGS) {
      expect(config.visible).toBe(true);
    }
  });

  it('all configs have non-empty color and label', () => {
    for (const config of DEFAULT_REWARD_CONFIGS) {
      expect(config.color).toBeTruthy();
      expect(config.label).toBeTruthy();
    }
  });
});
