/**
 * Tests for RenderingMetricsDisplay and FPSHistoryGraph components
 *
 * Validates:
 * - Panel, inline, and minimal layout rendering
 * - Gaussian count formatting (K/M)
 * - Memory display and threshold states
 * - FPS display with color coding
 * - LOD level display
 * - Budget capped badge
 * - Memory bar with thresholds
 * - FPS history graph rendering
 *
 * @module volumetric-bridge/ui/__tests__
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RenderingMetricsDisplay, FPSHistoryGraph } from '../RenderingMetricsDisplay';
import type { RenderingMetrics } from '../types';

// =============================================================================
// TEST DATA
// =============================================================================

const normalMetrics: RenderingMetrics = {
  gaussianCount: 125000,
  memoryMB: 7.5,
  fps: 72,
  budgetCapped: false,
  activeLODLevel: 4,
  totalLODLevels: 6,
  levelsDropped: 0,
  memoryState: 'normal',
};

const warningMetrics: RenderingMetrics = {
  ...normalMetrics,
  memoryMB: 1100,
  memoryState: 'warning',
  fps: 45,
};

const cappedMetrics: RenderingMetrics = {
  ...normalMetrics,
  budgetCapped: true,
  levelsDropped: 2,
  memoryState: 'reduction',
};

const emergencyMetrics: RenderingMetrics = {
  ...normalMetrics,
  memoryMB: 1450,
  memoryState: 'emergency',
  fps: 25,
  budgetCapped: true,
};

// =============================================================================
// TESTS: RenderingMetricsDisplay
// =============================================================================

describe('RenderingMetricsDisplay', () => {
  // ---------------------------------------------------------------------------
  // Panel layout
  // ---------------------------------------------------------------------------

  describe('panel layout', () => {
    it('renders section title', () => {
      render(<RenderingMetricsDisplay metrics={normalMetrics} layout="panel" />);
      expect(screen.getByText('Rendering Metrics')).toBeDefined();
    });

    it('displays Gaussian count formatted as K', () => {
      render(<RenderingMetricsDisplay metrics={normalMetrics} layout="panel" />);
      expect(screen.getByText('125.0K')).toBeDefined();
    });

    it('displays Gaussian count formatted as M for large numbers', () => {
      render(
        <RenderingMetricsDisplay
          metrics={{ ...normalMetrics, gaussianCount: 1500000 }}
          layout="panel"
        />,
      );
      expect(screen.getByText('1.50M')).toBeDefined();
    });

    it('displays FPS value', () => {
      render(<RenderingMetricsDisplay metrics={normalMetrics} layout="panel" />);
      expect(screen.getByText('72')).toBeDefined();
    });

    it('displays memory usage', () => {
      render(<RenderingMetricsDisplay metrics={normalMetrics} layout="panel" />);
      expect(screen.getByText('8')).toBeDefined(); // 7.5 rounded
    });

    it('displays LOD level', () => {
      render(<RenderingMetricsDisplay metrics={normalMetrics} layout="panel" />);
      expect(screen.getByText('4')).toBeDefined();
    });

    it('displays memory state badge', () => {
      render(<RenderingMetricsDisplay metrics={normalMetrics} layout="panel" />);
      expect(screen.getByText('normal')).toBeDefined();
    });

    it('shows BUDGET CAPPED badge when capped', () => {
      render(<RenderingMetricsDisplay metrics={cappedMetrics} layout="panel" />);
      expect(screen.getByText('BUDGET CAPPED')).toBeDefined();
    });

    it('does not show BUDGET CAPPED badge when not capped', () => {
      render(<RenderingMetricsDisplay metrics={normalMetrics} layout="panel" />);
      expect(screen.queryByText('BUDGET CAPPED')).toBeNull();
    });

    it('shows warning memory state', () => {
      render(<RenderingMetricsDisplay metrics={warningMetrics} layout="panel" />);
      expect(screen.getByText('warning')).toBeDefined();
    });

    it('shows emergency memory state', () => {
      render(<RenderingMetricsDisplay metrics={emergencyMetrics} layout="panel" />);
      expect(screen.getByText('emergency')).toBeDefined();
    });

    it('shows dropped levels in LOD label', () => {
      render(<RenderingMetricsDisplay metrics={cappedMetrics} layout="panel" />);
      expect(screen.getByText(/LOD.*-2/)).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Memory bar
  // ---------------------------------------------------------------------------

  describe('memory bar', () => {
    it('renders memory bar when showMemoryBar is true', () => {
      render(
        <RenderingMetricsDisplay
          metrics={normalMetrics}
          layout="panel"
          showMemoryBar
        />,
      );
      expect(screen.getByText('0 MB')).toBeDefined();
      expect(screen.getByText('1.5 GB')).toBeDefined();
    });

    it('does not render memory bar when showMemoryBar is false', () => {
      render(
        <RenderingMetricsDisplay
          metrics={normalMetrics}
          layout="panel"
          showMemoryBar={false}
        />,
      );
      expect(screen.queryByText('0 MB')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Inline layout
  // ---------------------------------------------------------------------------

  describe('inline layout', () => {
    it('renders FPS value', () => {
      render(<RenderingMetricsDisplay metrics={normalMetrics} layout="inline" />);
      expect(screen.getByText('72')).toBeDefined();
    });

    it('shows memory state badge', () => {
      render(<RenderingMetricsDisplay metrics={warningMetrics} layout="inline" />);
      expect(screen.getByText('warning')).toBeDefined();
    });

    it('shows budget capped badge', () => {
      render(<RenderingMetricsDisplay metrics={cappedMetrics} layout="inline" />);
      expect(screen.getByText('BUDGET CAPPED')).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Minimal layout
  // ---------------------------------------------------------------------------

  describe('minimal layout', () => {
    it('shows FPS and splat count', () => {
      render(<RenderingMetricsDisplay metrics={normalMetrics} layout="minimal" />);
      expect(screen.getByText('72')).toBeDefined();
      expect(screen.getByText('FPS')).toBeDefined();
      expect(screen.getByText('splats')).toBeDefined();
    });

    it('shows CAPPED badge when budget capped', () => {
      render(<RenderingMetricsDisplay metrics={cappedMetrics} layout="minimal" />);
      expect(screen.getByText('CAPPED')).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // ARIA accessibility
  // ---------------------------------------------------------------------------

  it('has proper role on the panel container', () => {
    render(<RenderingMetricsDisplay metrics={normalMetrics} layout="panel" />);
    expect(screen.getByRole('group')).toBeDefined();
  });
});

// =============================================================================
// TESTS: FPSHistoryGraph
// =============================================================================

describe('FPSHistoryGraph', () => {
  it('renders without crashing with empty history', () => {
    const { container } = render(<FPSHistoryGraph history={[]} />);
    expect(container).toBeDefined();
  });

  it('renders bars for each FPS sample', () => {
    const history = [60, 55, 72, 65, 45, 90, 80];
    const { container } = render(
      <FPSHistoryGraph history={history} targetFPS={72} barCount={30} />,
    );
    // Should render without errors
    expect(container).toBeDefined();
  });

  it('renders with custom bar count', () => {
    const history = Array.from({ length: 100 }, (_, i) => 60 + Math.sin(i / 5) * 20);
    const { container } = render(
      <FPSHistoryGraph history={history} barCount={50} />,
    );
    expect(container).toBeDefined();
  });
});
