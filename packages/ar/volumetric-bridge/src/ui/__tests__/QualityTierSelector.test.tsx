/**
 * Tests for QualityTierSelector component
 *
 * Validates:
 * - All three tier buttons rendered (Low/Mid/High)
 * - Tier selection via click
 * - Per-tier frame size display
 * - Adaptive quality toggle
 * - Bandwidth display and bar
 * - Metrics display (FPS, P95)
 * - Disabled state
 * - ARIA attributes
 *
 * @module volumetric-bridge/ui/__tests__
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QualityTierSelector } from '../QualityTierSelector';
import type { QualityTierSelectorProps } from '../types';
import type { PerformanceMetrics } from '../../volumetric-video/types';

// =============================================================================
// TEST UTILITIES
// =============================================================================

function renderSelector(overrides: Partial<QualityTierSelectorProps> = {}) {
  const defaultProps: QualityTierSelectorProps = {
    value: 'mid',
    onChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<QualityTierSelector {...defaultProps} />), props: defaultProps };
}

const mockMetrics: PerformanceMetrics = {
  avgDecodeTimeMs: 5.2,
  avgRenderTimeMs: 3.1,
  avgTotalTimeMs: 8.3,
  effectiveFPS: 58.5,
  p95TotalTimeMs: 12.4,
  frameDropRate: 0.02,
  memoryUsageMB: 128,
  recentTierChanges: 0,
};

// =============================================================================
// TESTS
// =============================================================================

describe('QualityTierSelector', () => {
  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  it('renders all three tier buttons', () => {
    renderSelector();
    expect(screen.getByText('Low')).toBeDefined();
    expect(screen.getByText('Mid')).toBeDefined();
    expect(screen.getByText('High')).toBeDefined();
  });

  it('renders the Quality Tier label', () => {
    renderSelector();
    expect(screen.getByText('Quality Tier')).toBeDefined();
  });

  it('has proper radiogroup role', () => {
    renderSelector();
    expect(screen.getByRole('radiogroup')).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Tier selection
  // ---------------------------------------------------------------------------

  it('calls onChange when clicking a tier button', () => {
    const onChange = vi.fn();
    renderSelector({ value: 'mid', onChange });

    fireEvent.click(screen.getByRole('radio', { name: /High quality/i }));
    expect(onChange).toHaveBeenCalledWith('high');
  });

  it('marks the current tier as checked', () => {
    renderSelector({ value: 'mid' });
    const midRadio = screen.getByRole('radio', { name: /Mid quality/i });
    expect(midRadio.getAttribute('aria-checked')).toBe('true');
  });

  it('marks non-selected tiers as unchecked', () => {
    renderSelector({ value: 'mid' });
    const lowRadio = screen.getByRole('radio', { name: /Low quality/i });
    expect(lowRadio.getAttribute('aria-checked')).toBe('false');
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    renderSelector({ onChange, disabled: true });
    const button = screen.getByRole('radio', { name: /High quality/i });
    fireEvent.click(button);
    expect(onChange).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Per-tier info
  // ---------------------------------------------------------------------------

  it('displays frame size per tier', () => {
    renderSelector();
    // Mid tier is ~660 KB/frame
    expect(screen.getByText('660 KB/f')).toBeDefined();
  });

  it('displays layer count for selected tier', () => {
    renderSelector({ value: 'mid' });
    expect(screen.getByText('4')).toBeDefined(); // Mid = 4 layers
  });

  it('displays max Gaussians for selected tier', () => {
    renderSelector({ value: 'mid' });
    expect(screen.getByText('150K')).toBeDefined(); // Mid = 150K max
  });

  // ---------------------------------------------------------------------------
  // Adaptive quality toggle
  // ---------------------------------------------------------------------------

  it('shows ADAPTIVE badge when adaptive is enabled', () => {
    renderSelector({ adaptiveEnabled: true });
    expect(screen.getByText('ADAPTIVE')).toBeDefined();
  });

  it('does not show ADAPTIVE badge when adaptive is disabled', () => {
    renderSelector({ adaptiveEnabled: false });
    expect(screen.queryByText('ADAPTIVE')).toBeNull();
  });

  it('renders toggle switch when onAdaptiveToggle is provided', () => {
    renderSelector({ onAdaptiveToggle: vi.fn() });
    expect(screen.getByRole('switch')).toBeDefined();
    expect(screen.getByText('Adaptive Quality')).toBeDefined();
  });

  it('calls onAdaptiveToggle when toggle is clicked', () => {
    const onAdaptiveToggle = vi.fn();
    renderSelector({ adaptiveEnabled: true, onAdaptiveToggle });
    fireEvent.click(screen.getByRole('switch'));
    expect(onAdaptiveToggle).toHaveBeenCalledWith(false);
  });

  it('handles keyboard interaction on toggle', () => {
    const onAdaptiveToggle = vi.fn();
    renderSelector({ adaptiveEnabled: false, onAdaptiveToggle });
    const toggle = screen.getByRole('switch');
    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(onAdaptiveToggle).toHaveBeenCalledWith(true);
  });

  it('does not render toggle when onAdaptiveToggle is not provided', () => {
    renderSelector();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Bandwidth display
  // ---------------------------------------------------------------------------

  it('shows bandwidth value when bandwidthKbps is provided', () => {
    renderSelector({ bandwidthKbps: 1500 });
    expect(screen.getByText('1.5 Mbps')).toBeDefined();
  });

  it('shows bandwidth bar with progressbar role', () => {
    renderSelector({ bandwidthKbps: 1500 });
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('does not show bandwidth when bandwidthKbps is 0', () => {
    renderSelector({ bandwidthKbps: 0 });
    expect(screen.queryByText('Bandwidth')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Performance metrics
  // ---------------------------------------------------------------------------

  it('shows FPS when metrics are provided', () => {
    renderSelector({ metrics: mockMetrics });
    expect(screen.getByText('59')).toBeDefined(); // 58.5 rounded to 59
  });

  it('shows P95 time when metrics and toggle are provided', () => {
    renderSelector({ metrics: mockMetrics, onAdaptiveToggle: vi.fn() });
    expect(screen.getByText('P95: 12.4ms')).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Group ARIA
  // ---------------------------------------------------------------------------

  it('has proper group aria-label', () => {
    renderSelector();
    const group = screen.getByRole('group');
    expect(group.getAttribute('aria-label')).toBe('Volumetric video quality tier selector');
  });
});
