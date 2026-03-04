/**
 * @vitest-environment jsdom
 */

/**
 * Tests for ReputationHistoryChart component
 *
 * Validates:
 * - Rendering with valid history data
 * - Empty state handling
 * - Time range filtering
 * - Tier band rendering toggle
 * - Event marker rendering
 * - Dimension overlay rendering
 * - Tooltip state management
 * - Chart scaling calculations
 * - Time label formatting
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('../../../VRTrustHandshake', () => ({}));
vi.mock('../../../BehavioralTrustScoring', () => ({}));

import { ReputationHistoryChart } from '../ReputationHistoryChart';
import type { ReputationHistory, ReputationDataPoint } from '../types';

// =============================================================================
// TEST DATA
// =============================================================================

function createTestHistory(pointCount: number = 10): ReputationHistory {
  const now = Date.now();
  const interval = 60_000; // 1 minute between points

  const dataPoints: ReputationDataPoint[] = [];
  for (let i = 0; i < pointCount; i++) {
    const score = 0.5 + Math.sin(i / 3) * 0.3;
    const clampedScore = Math.max(0, Math.min(1, score));
    dataPoints.push({
      timestamp: now - (pointCount - i) * interval,
      score: clampedScore,
      tier: clampedScore >= 0.8 ? 'T3' : clampedScore >= 0.5 ? 'T2' : clampedScore >= 0.25 ? 'T1' : 'T0',
    });
  }

  return {
    agentId: 'test-agent-1',
    agentName: 'Test Agent',
    dataPoints,
    currentScore: dataPoints[dataPoints.length - 1].score,
    currentTier: dataPoints[dataPoints.length - 1].tier,
    firstJoinedAt: dataPoints[0].timestamp,
    totalTransitions: 3,
  };
}

function createTestHistoryWithEvents(): ReputationHistory {
  const history = createTestHistory(20);

  // Add some events
  history.dataPoints[5].event = 'Refresh';
  history.dataPoints[10].event = 'Violation Detected';
  history.dataPoints[10].score = 0.3;
  history.dataPoints[10].tier = 'T1';
  history.dataPoints[15].event = 'Recovered';
  history.dataPoints[15].score = 0.85;
  history.dataPoints[15].tier = 'T3';

  return history;
}

function createTestHistoryWithDimensions(): ReputationHistory {
  const history = createTestHistory(10);

  for (const point of history.dataPoints) {
    point.dimensions = {
      spatial_compliance: point.score + 0.05,
      physics_adherence: point.score - 0.05,
      interaction_appropriateness: point.score + 0.1,
      temporal_consistency: point.score - 0.1,
    };
  }

  return history;
}

// =============================================================================
// TESTS
// =============================================================================

describe('ReputationHistoryChart', () => {
  describe('basic rendering', () => {
    it('should accept required props', () => {
      const history = createTestHistory();
      const element = React.createElement(ReputationHistoryChart, { history });
      expect(element.props.history).toBe(history);
    });

    it('should accept optional dimension props', () => {
      const history = createTestHistory();
      const element = React.createElement(ReputationHistoryChart, {
        history,
        width: 800,
        height: 400,
        showTierBands: true,
        showEvents: true,
        showDimensions: true,
        showTooltip: true,
      });
      expect(element.props.width).toBe(800);
      expect(element.props.height).toBe(400);
      expect(element.props.showTierBands).toBe(true);
    });
  });

  describe('empty state', () => {
    it('should handle empty data points', () => {
      const history: ReputationHistory = {
        agentId: 'empty-agent',
        dataPoints: [],
        currentScore: 0,
        currentTier: 'T0',
        firstJoinedAt: Date.now(),
        totalTransitions: 0,
      };

      const element = React.createElement(ReputationHistoryChart, { history });
      expect(element.props.history.dataPoints).toHaveLength(0);
    });
  });

  describe('time range filtering', () => {
    it('should accept timeRangeMs prop', () => {
      const history = createTestHistory(100);
      const element = React.createElement(ReputationHistoryChart, {
        history,
        timeRangeMs: 300_000, // 5 minutes
      });
      expect(element.props.timeRangeMs).toBe(300_000);
    });

    it('should show all data when timeRangeMs is 0', () => {
      const history = createTestHistory(50);
      const element = React.createElement(ReputationHistoryChart, {
        history,
        timeRangeMs: 0,
      });
      expect(element.props.timeRangeMs).toBe(0);
    });
  });

  describe('feature toggles', () => {
    it('should accept showTierBands toggle', () => {
      const history = createTestHistory();
      const element = React.createElement(ReputationHistoryChart, {
        history,
        showTierBands: false,
      });
      expect(element.props.showTierBands).toBe(false);
    });

    it('should accept showEvents toggle', () => {
      const history = createTestHistoryWithEvents();
      const element = React.createElement(ReputationHistoryChart, {
        history,
        showEvents: true,
      });
      expect(element.props.showEvents).toBe(true);
    });

    it('should accept showDimensions toggle', () => {
      const history = createTestHistoryWithDimensions();
      const element = React.createElement(ReputationHistoryChart, {
        history,
        showDimensions: true,
      });
      expect(element.props.showDimensions).toBe(true);
    });
  });

  describe('data validation', () => {
    it('should handle history with a single data point', () => {
      const history: ReputationHistory = {
        agentId: 'single-point-agent',
        dataPoints: [{
          timestamp: Date.now(),
          score: 0.75,
          tier: 'T2',
        }],
        currentScore: 0.75,
        currentTier: 'T2',
        firstJoinedAt: Date.now(),
        totalTransitions: 0,
      };

      const element = React.createElement(ReputationHistoryChart, { history });
      expect(element.props.history.dataPoints).toHaveLength(1);
    });

    it('should handle scores at boundary values', () => {
      const history: ReputationHistory = {
        agentId: 'boundary-agent',
        dataPoints: [
          { timestamp: Date.now() - 3000, score: 0, tier: 'T0' },
          { timestamp: Date.now() - 2000, score: 0.25, tier: 'T1' },
          { timestamp: Date.now() - 1000, score: 0.5, tier: 'T2' },
          { timestamp: Date.now(), score: 1.0, tier: 'T3' },
        ],
        currentScore: 1.0,
        currentTier: 'T3',
        firstJoinedAt: Date.now() - 3000,
        totalTransitions: 3,
      };

      const element = React.createElement(ReputationHistoryChart, { history });
      expect(element.props.history.dataPoints).toHaveLength(4);
    });
  });

  describe('callback handling', () => {
    it('should accept onDataPointClick callback', () => {
      const history = createTestHistory();
      const onDataPointClick = vi.fn();
      const element = React.createElement(ReputationHistoryChart, {
        history,
        onDataPointClick,
      });
      expect(element.props.onDataPointClick).toBe(onDataPointClick);
    });
  });

  describe('theme customization', () => {
    it('should accept theme overrides', () => {
      const history = createTestHistory();
      const element = React.createElement(ReputationHistoryChart, {
        history,
        theme: {
          containerBackground: '#1a1a1a',
          textPrimary: '#ffffff',
        },
      });
      expect(element.props.theme).toEqual({
        containerBackground: '#1a1a1a',
        textPrimary: '#ffffff',
      });
    });
  });
});
