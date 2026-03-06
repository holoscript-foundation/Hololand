/**
 * @vitest-environment jsdom
 */

/**
 * Tests for Spatial Inference UI - Shared Types
 *
 * Validates:
 * - Status label mapping
 * - Status color mapping
 * - Formatting utilities (ms, bytes)
 * - Event ID generation
 * - Theme defaults
 */

import { describe, it, expect } from 'vitest';

import {
  getStatusLabel,
  getStatusColor,
  formatMs,
  formatBytes,
  createEventId,
  DEFAULT_SPATIAL_INFERENCE_THEME,
} from '../types';

import type {
  PipelineStatus,
  SpatialInferenceTheme,
} from '../types';

// =============================================================================
// TESTS
// =============================================================================

describe('Spatial Inference Types', () => {

  // ─── getStatusLabel ──────────────────────────────────────────────

  describe('getStatusLabel', () => {
    const cases: Array<[PipelineStatus, string]> = [
      ['idle', 'Idle'],
      ['initializing', 'Initializing'],
      ['ready', 'Ready'],
      ['running', 'Running'],
      ['paused', 'Paused'],
      ['error', 'Error'],
      ['fallback', 'CPU Fallback'],
    ];

    it.each(cases)('should return "%s" for status "%s"', (status, expectedLabel) => {
      expect(getStatusLabel(status)).toBe(expectedLabel);
    });
  });

  // ─── getStatusColor ──────────────────────────────────────────────

  describe('getStatusColor', () => {
    const theme = DEFAULT_SPATIAL_INFERENCE_THEME;

    it('should return muted color for idle', () => {
      expect(getStatusColor('idle', theme)).toBe(theme.textMuted);
    });

    it('should return accent color for initializing', () => {
      expect(getStatusColor('initializing', theme)).toBe(theme.accentColor);
    });

    it('should return success color for running', () => {
      expect(getStatusColor('running', theme)).toBe(theme.successColor);
    });

    it('should return warning color for paused', () => {
      expect(getStatusColor('paused', theme)).toBe(theme.warningColor);
    });

    it('should return error color for error', () => {
      expect(getStatusColor('error', theme)).toBe(theme.errorColor);
    });

    it('should return CPU color for fallback', () => {
      expect(getStatusColor('fallback', theme)).toBe(theme.cpuColor);
    });
  });

  // ─── formatMs ────────────────────────────────────────────────────

  describe('formatMs', () => {
    it('should format sub-millisecond values as microseconds', () => {
      expect(formatMs(0.5)).toBe('500us');
      expect(formatMs(0.001)).toBe('1us');
    });

    it('should format millisecond values with 1 decimal', () => {
      expect(formatMs(1.5)).toBe('1.5ms');
      expect(formatMs(42.7)).toBe('42.7ms');
      expect(formatMs(99.9)).toBe('99.9ms');
    });

    it('should format large values without decimals', () => {
      expect(formatMs(100)).toBe('100ms');
      expect(formatMs(1500)).toBe('1500ms');
    });
  });

  // ─── formatBytes ─────────────────────────────────────────────────

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500B');
      expect(formatBytes(0)).toBe('0B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.0KB');
      expect(formatBytes(2560)).toBe('2.5KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1.00MB');
      expect(formatBytes(5242880)).toBe('5.00MB');
    });
  });

  // ─── createEventId ───────────────────────────────────────────────

  describe('createEventId', () => {
    it('should create unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(createEventId());
      }
      expect(ids.size).toBe(100);
    });

    it('should start with "evt-" prefix', () => {
      const id = createEventId();
      expect(id.startsWith('evt-')).toBe(true);
    });

    it('should contain a timestamp', () => {
      const before = Date.now();
      const id = createEventId();
      const after = Date.now();

      const parts = id.split('-');
      const timestamp = parseInt(parts[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ─── DEFAULT_SPATIAL_INFERENCE_THEME ─────────────────────────────

  describe('DEFAULT_SPATIAL_INFERENCE_THEME', () => {
    it('should have all required theme properties', () => {
      const theme: SpatialInferenceTheme = DEFAULT_SPATIAL_INFERENCE_THEME;

      expect(theme.fontFamily).toBeTruthy();
      expect(theme.fontScale).toBe(1.0);
      expect(theme.borderRadius).toBeTruthy();
      expect(theme.containerBackground).toBeTruthy();
      expect(theme.cardBackground).toBeTruthy();
      expect(theme.textPrimary).toBeTruthy();
      expect(theme.textSecondary).toBeTruthy();
      expect(theme.textMuted).toBeTruthy();
      expect(theme.borderColor).toBeTruthy();
      expect(theme.successColor).toBeTruthy();
      expect(theme.warningColor).toBeTruthy();
      expect(theme.errorColor).toBeTruthy();
      expect(theme.accentColor).toBeTruthy();
      expect(theme.gpuColor).toBeTruthy();
      expect(theme.cpuColor).toBeTruthy();
    });

    it('should use dark theme colors', () => {
      // Container background should be dark
      expect(DEFAULT_SPATIAL_INFERENCE_THEME.containerBackground).toMatch(/^#0/);
    });
  });
});
