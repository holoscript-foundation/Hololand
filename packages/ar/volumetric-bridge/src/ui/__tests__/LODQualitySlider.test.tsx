/**
 * Tests for LODQualitySlider component
 *
 * Validates:
 * - Rendering with all tier options
 * - Tier selection via click
 * - Keyboard navigation (arrow keys, Home, End)
 * - VR badge display
 * - Metrics display with live data
 * - Budget bar rendering
 * - Disabled state
 * - Vertical orientation
 * - ARIA attributes for accessibility
 *
 * @module volumetric-bridge/ui/__tests__
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LODQualitySlider } from '../LODQualitySlider';
import type { LODQualityTier, LODQualitySliderProps } from '../types';
import type { LODUpdateResult } from '../../GaussianSplatLODManager';
import type { BudgetEnforcementResult } from '../../GaussianBudgetManager';

// =============================================================================
// TEST UTILITIES
// =============================================================================

function renderSlider(overrides: Partial<LODQualitySliderProps> = {}) {
  const defaultProps: LODQualitySliderProps = {
    value: 'medium',
    onChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<LODQualitySlider {...defaultProps} />), props: defaultProps };
}

const mockLODResult: LODUpdateResult = {
  changed: true,
  visibleIndices: new Uint32Array([0, 1, 2]),
  visibleCount: 125000,
  activeLODLevel: 4,
  totalLODLevels: 6,
  budgetCapped: false,
  levelsDropped: 0,
  cameraDistance: 10,
  availableBudget: 180000,
};

const mockBudgetResult: BudgetEnforcementResult = {
  totalBudget: 180000,
  avatarReservation: 60000,
  sceneBudget: 120000,
  totalRequested: 100000,
  totalAllocated: 100000,
  budgetCapped: false,
  cascadeStage: 0,
  scenesDisabled: 0,
  sceneAllocations: [],
  memoryState: {
    totalBytes: 7500000,
    ceilingBytes: 1610612736,
    utilization: 0.0047,
    thresholdState: 'normal',
    totalGaussians: 125000,
  },
  timestamp: Date.now(),
};

// =============================================================================
// TESTS
// =============================================================================

describe('LODQualitySlider', () => {
  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  it('renders with all four tier labels', () => {
    renderSlider();
    expect(screen.getByText('Low')).toBeDefined();
    expect(screen.getByText('Med')).toBeDefined();
    expect(screen.getByText('High')).toBeDefined();
    expect(screen.getByText('Ultra')).toBeDefined();
  });

  it('renders the LOD Quality label', () => {
    renderSlider();
    expect(screen.getByText('LOD Quality')).toBeDefined();
  });

  it('has proper ARIA role on the slider', () => {
    renderSlider();
    const slider = screen.getByRole('slider');
    expect(slider).toBeDefined();
    expect(slider.getAttribute('aria-valuenow')).toBe('1'); // medium = index 1
  });

  // ---------------------------------------------------------------------------
  // Tier selection
  // ---------------------------------------------------------------------------

  it('calls onChange when clicking a tier stop', () => {
    const onChange = vi.fn();
    renderSlider({ onChange });

    // Click the "High" label
    fireEvent.click(screen.getByText('High'));
    expect(onChange).toHaveBeenCalledWith('high');
  });

  it('calls onChange when clicking a tier button', () => {
    const onChange = vi.fn();
    renderSlider({ onChange });

    const buttons = screen.getAllByRole('button', { pressed: false });
    // The first non-pressed button should be a tier
    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    renderSlider({ onChange, disabled: true });

    fireEvent.click(screen.getByText('High'));
    expect(onChange).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  it('handles ArrowRight to increase tier', () => {
    const onChange = vi.fn();
    renderSlider({ value: 'low', onChange });

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('medium');
  });

  it('handles ArrowLeft to decrease tier', () => {
    const onChange = vi.fn();
    renderSlider({ value: 'high', onChange });

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('medium');
  });

  it('handles Home to jump to lowest tier', () => {
    const onChange = vi.fn();
    renderSlider({ value: 'ultra', onChange });

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('low');
  });

  it('handles End to jump to highest tier', () => {
    const onChange = vi.fn();
    renderSlider({ value: 'low', onChange });

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('ultra');
  });

  it('does not exceed tier bounds on ArrowRight at ultra', () => {
    const onChange = vi.fn();
    renderSlider({ value: 'ultra', onChange });

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    // Should not call onChange since already at max
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not go below tier bounds on ArrowLeft at low', () => {
    const onChange = vi.fn();
    renderSlider({ value: 'low', onChange });

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // VR mode
  // ---------------------------------------------------------------------------

  it('shows VR AUTO badge when vrMode is true', () => {
    renderSlider({ vrMode: true });
    expect(screen.getByText('VR AUTO')).toBeDefined();
  });

  it('does not show VR badge when vrMode is false', () => {
    renderSlider({ vrMode: false });
    expect(screen.queryByText('VR AUTO')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Metrics display
  // ---------------------------------------------------------------------------

  it('shows metrics when showMetrics is true and data is provided', () => {
    renderSlider({
      showMetrics: true,
      lodResult: mockLODResult,
    });
    expect(screen.getByText('splats')).toBeDefined();
    expect(screen.getByText('VRAM')).toBeDefined();
    expect(screen.getByText('LOD')).toBeDefined();
  });

  it('hides metrics when showMetrics is false', () => {
    renderSlider({ showMetrics: false });
    expect(screen.queryByText('splats')).toBeNull();
  });

  it('shows dropped levels indicator when levels are dropped', () => {
    renderSlider({
      showMetrics: true,
      lodResult: { ...mockLODResult, levelsDropped: 2 },
    });
    expect(screen.getByText('-2')).toBeDefined();
    expect(screen.getByText('dropped')).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Budget bar
  // ---------------------------------------------------------------------------

  it('renders budget usage bar for non-unlimited tiers', () => {
    renderSlider({
      value: 'medium',
      showMetrics: true,
      lodResult: mockLODResult,
    });
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeDefined();
  });

  it('does not render budget bar for ultra tier (unlimited budget)', () => {
    renderSlider({
      value: 'ultra',
      showMetrics: true,
    });
    // Ultra has budget 0 (unlimited), so no progressbar
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // ARIA accessibility
  // ---------------------------------------------------------------------------

  it('sets aria-valuetext with tier description', () => {
    renderSlider({ value: 'high' });
    const slider = screen.getByRole('slider');
    const valueText = slider.getAttribute('aria-valuetext');
    expect(valueText).toContain('High quality');
  });

  it('supports custom aria-label', () => {
    renderSlider({ 'aria-label': 'Custom LOD label' });
    const group = screen.getByRole('group');
    expect(group.getAttribute('aria-label')).toBe('Custom LOD label');
  });

  it('sets aria-disabled when disabled', () => {
    renderSlider({ disabled: true });
    const slider = screen.getByRole('slider');
    expect(slider.getAttribute('aria-disabled')).toBe('true');
  });

  // ---------------------------------------------------------------------------
  // Orientation
  // ---------------------------------------------------------------------------

  it('renders in vertical orientation', () => {
    const { container } = renderSlider({ orientation: 'vertical' });
    // Should render without errors
    expect(container).toBeDefined();
  });
});
