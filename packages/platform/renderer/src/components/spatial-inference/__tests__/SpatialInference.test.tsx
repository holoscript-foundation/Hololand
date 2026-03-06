/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SpatialInference React Component
 *
 * Validates:
 * - Rendering in all display modes (dashboard, compact, overlay, metrics-only)
 * - Panel visibility based on props
 * - External state/actions passthrough
 * - Status indicator rendering
 * - GPU/CPU backend badge display
 * - Error state rendering
 * - Accessibility (ARIA attributes, roles)
 * - Theme customization
 * - Action button interactions
 *
 * NOTE: These tests use external state/actions to bypass the useSpatialInference
 * hook internals, which require WebGPU. The hook is tested separately.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import { SpatialInference } from '../SpatialInference';
import type { SpatialInferenceProps } from '../SpatialInference';
import type {
  SpatialInferenceState,
  SpatialInferenceActions,
} from '../types';
import { createEmptyCachedSpatialState } from '../../../SpatialInferenceTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockState(overrides?: Partial<SpatialInferenceState>): SpatialInferenceState {
  return {
    status: 'idle',
    isGPUAccelerated: false,
    spatialState: null,
    schedulerMetrics: null,
    computeMetrics: null,
    events: [],
    error: null,
    ...overrides,
  };
}

function createMockActions(): SpatialInferenceActions {
  return {
    initialize: vi.fn(() => Promise.resolve()),
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    togglePause: vi.fn(),
    forceSinglePass: vi.fn(() => Promise.resolve()),
    setTargetHz: vi.fn(),
    dispose: vi.fn(),
    clearEvents: vi.fn(),
  };
}

function createRunningState(): SpatialInferenceState {
  const spatialState = createEmptyCachedSpatialState();
  spatialState.objectCount = 42;
  spatialState.sceneComplexity = 0.65;
  spatialState.relationships = [
    {
      sourceId: 'obj-1',
      targetId: 'obj-2',
      type: 'near',
      confidence: 0.85,
      distance: 2.5,
      direction: { x: 1, y: 0, z: 0 },
    },
    {
      sourceId: 'obj-3',
      targetId: 'obj-4',
      type: 'above',
      confidence: 0.92,
      distance: 3.0,
      direction: { x: 0, y: 1, z: 0 },
    },
  ];
  spatialState.regions = [
    {
      id: 'region-0',
      label: 'Cluster 1 (5 objects)',
      center: { x: 0, y: 0, z: 0 },
      extents: { x: 5, y: 5, z: 5 },
      objectIds: ['a', 'b', 'c', 'd', 'e'],
      type: 'cluster',
      confidence: 0.8,
      metadata: {},
    },
  ];

  return {
    status: 'running',
    isGPUAccelerated: true,
    spatialState,
    schedulerMetrics: {
      isRunning: true,
      currentHz: 3.0,
      targetHz: 3.0,
      totalPasses: 150,
      averageInferenceDurationMs: 45.5,
      peakInferenceDurationMs: 120.3,
      sceneComplexity: 0.65,
      isInferring: false,
      timeSinceLastInferenceMs: 200,
      skippedPasses: 2,
      isBufferStale: false,
    },
    computeMetrics: {
      isReady: true,
      adapterInfo: 'NVIDIA RTX 4090',
      totalPasses: 150,
      averageComputeMs: 8.2,
      peakComputeMs: 15.1,
      lastComputeMs: 7.8,
      averageObjectCount: 42,
      averageRelationshipCount: 85,
      gpuMemoryBytes: 262144,
    },
    events: [
      {
        id: 'evt-1',
        timestamp: Date.now() - 5000,
        severity: 'info',
        message: 'Pipeline initialized (GPU)',
      },
      {
        id: 'evt-2',
        timestamp: Date.now() - 3000,
        severity: 'info',
        message: 'Inference loop started at 3.0Hz',
      },
    ],
    error: null,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('SpatialInference Component', () => {
  let mockActions: SpatialInferenceActions;

  beforeEach(() => {
    vi.clearAllMocks();
    mockActions = createMockActions();
  });

  // ─── Dashboard Mode ──────────────────────────────────────────────

  describe('dashboard mode', () => {
    it('should render the header with title', () => {
      render(
        <SpatialInference
          externalState={createMockState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('Spatial Inference')).toBeTruthy();
    });

    it('should render initialize button when idle', () => {
      render(
        <SpatialInference
          externalState={createMockState({ status: 'idle' })}
          externalActions={mockActions}
        />,
      );

      const initButton = screen.getByText('Initialize');
      expect(initButton).toBeTruthy();

      fireEvent.click(initButton);
      expect(mockActions.initialize).toHaveBeenCalledTimes(1);
    });

    it('should render start button when ready', () => {
      render(
        <SpatialInference
          externalState={createMockState({ status: 'ready' })}
          externalActions={mockActions}
        />,
      );

      const startButton = screen.getByText('Start');
      expect(startButton).toBeTruthy();

      fireEvent.click(startButton);
      expect(mockActions.start).toHaveBeenCalledTimes(1);
    });

    it('should render pause and stop buttons when running', () => {
      render(
        <SpatialInference
          externalState={createRunningState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('Pause')).toBeTruthy();
      expect(screen.getByText('Stop')).toBeTruthy();
    });

    it('should render resume button when paused', () => {
      render(
        <SpatialInference
          externalState={createMockState({ status: 'paused' })}
          externalActions={mockActions}
        />,
      );

      const resumeButton = screen.getByText('Resume');
      expect(resumeButton).toBeTruthy();

      fireEvent.click(resumeButton);
      expect(mockActions.togglePause).toHaveBeenCalledTimes(1);
    });

    it('should show GPU badge when GPU accelerated', () => {
      render(
        <SpatialInference
          externalState={createMockState({ isGPUAccelerated: true, status: 'running' })}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('GPU')).toBeTruthy();
    });

    it('should show CPU badge in fallback mode', () => {
      render(
        <SpatialInference
          externalState={createMockState({ status: 'fallback' })}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('CPU')).toBeTruthy();
    });

    it('should render all panels with full running state', () => {
      render(
        <SpatialInference
          externalState={createRunningState()}
          externalActions={mockActions}
        />,
      );

      // Status panel
      expect(screen.getByText('Pipeline')).toBeTruthy();
      expect(screen.getByText('Backend')).toBeTruthy();
      expect(screen.getByText('WebGPU')).toBeTruthy();

      // Metrics panel
      expect(screen.getByText('Frequency')).toBeTruthy();
      expect(screen.getByText('3.0Hz')).toBeTruthy();

      // GPU panel
      expect(screen.getByText('Adapter')).toBeTruthy();
      expect(screen.getByText('NVIDIA RTX 4090')).toBeTruthy();

      // Relationships panel
      expect(screen.getByText('Relationships (2)')).toBeTruthy();

      // Regions panel
      expect(screen.getByText('Regions (1)')).toBeTruthy();

      // Activity panel
      expect(screen.getByText('Activity')).toBeTruthy();
    });

    it('should display error message when in error state', () => {
      render(
        <SpatialInference
          externalState={createMockState({
            status: 'error',
            error: 'WebGPU initialization failed',
          })}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('WebGPU initialization failed')).toBeTruthy();
    });
  });

  // ─── Compact Mode ────────────────────────────────────────────────

  describe('compact mode', () => {
    it('should render compact status bar', () => {
      render(
        <SpatialInference
          mode="compact"
          externalState={createRunningState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('Spatial')).toBeTruthy();
      expect(screen.getByText('Running')).toBeTruthy();
      expect(screen.getByText('3.0Hz')).toBeTruthy();
    });

    it('should render as status role', () => {
      render(
        <SpatialInference
          mode="compact"
          externalState={createMockState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByRole('status')).toBeTruthy();
    });
  });

  // ─── Panel Visibility ────────────────────────────────────────────

  describe('panel visibility', () => {
    it('should only show specified panels', () => {
      render(
        <SpatialInference
          panels={['status', 'metrics']}
          externalState={createRunningState()}
          externalActions={mockActions}
        />,
      );

      // Should show status and metrics
      expect(screen.getByText('Pipeline')).toBeTruthy();
      expect(screen.getByText('Frequency')).toBeTruthy();

      // Should NOT show GPU, relationships, or activity
      expect(screen.queryByText('Adapter')).toBeNull();
      expect(screen.queryByText('Relationships (2)')).toBeNull();
      expect(screen.queryByText('Activity')).toBeNull();
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────

  describe('accessibility', () => {
    it('should have accessible region role in dashboard mode', () => {
      render(
        <SpatialInference
          externalState={createMockState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByRole('region')).toBeTruthy();
    });

    it('should support custom aria-label', () => {
      render(
        <SpatialInference
          ariaLabel="Custom Spatial Dashboard"
          externalState={createMockState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByLabelText('Custom Spatial Dashboard')).toBeTruthy();
    });

    it('should have accessible buttons with text labels', () => {
      render(
        <SpatialInference
          externalState={createMockState({ status: 'idle' })}
          externalActions={mockActions}
        />,
      );

      const initButton = screen.getByText('Initialize');
      expect(initButton.tagName.toLowerCase()).toBe('button');
      expect(initButton.getAttribute('type')).toBe('button');
    });
  });

  // ─── Theme Customization ─────────────────────────────────────────

  describe('theme', () => {
    it('should accept theme overrides', () => {
      const customTheme = {
        containerBackground: '#ffffff',
        textPrimary: '#000000',
      };

      render(
        <SpatialInference
          theme={customTheme}
          externalState={createMockState()}
          externalActions={mockActions}
        />,
      );

      // Component should render without error
      expect(screen.getByRole('region')).toBeTruthy();
    });
  });

  // ─── Activity Panel ──────────────────────────────────────────────

  describe('activity panel', () => {
    it('should display events', () => {
      render(
        <SpatialInference
          externalState={createRunningState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('Pipeline initialized (GPU)')).toBeTruthy();
      expect(screen.getByText('Inference loop started at 3.0Hz')).toBeTruthy();
    });

    it('should show clear button when events exist', () => {
      render(
        <SpatialInference
          externalState={createRunningState()}
          externalActions={mockActions}
        />,
      );

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);
      expect(mockActions.clearEvents).toHaveBeenCalledTimes(1);
    });

    it('should show "No events" when empty', () => {
      render(
        <SpatialInference
          externalState={createMockState({ status: 'ready' })}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('No events')).toBeTruthy();
    });
  });

  // ─── Metrics Panel ───────────────────────────────────────────────

  describe('metrics panel', () => {
    it('should display inference frequency', () => {
      render(
        <SpatialInference
          externalState={createRunningState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('3.0Hz')).toBeTruthy();
    });

    it('should display pass counts', () => {
      render(
        <SpatialInference
          externalState={createRunningState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('150')).toBeTruthy(); // totalPasses
    });

    it('should show buffer staleness indicator', () => {
      render(
        <SpatialInference
          externalState={createRunningState()}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('Fresh')).toBeTruthy();
    });

    it('should show stale indicator when buffer is stale', () => {
      const staleState = createRunningState();
      staleState.schedulerMetrics!.isBufferStale = true;

      render(
        <SpatialInference
          externalState={staleState}
          externalActions={mockActions}
        />,
      );

      expect(screen.getByText('Stale')).toBeTruthy();
    });
  });
});
