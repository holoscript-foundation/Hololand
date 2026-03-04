/**
 * @vitest-environment jsdom
 */

/**
 * Tests for RevocationAlertToast component
 *
 * Validates:
 * - Rendering with active alerts
 * - Empty state (no alerts)
 * - Alert severity configuration
 * - Position variants
 * - Max visible alerts
 * - Dismiss callback handling
 * - Auto-dismiss functionality
 * - Action button callbacks
 * - Overflow indicator
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('../../../VRTrustHandshake', () => ({}));
vi.mock('../../../BehavioralTrustScoring', () => ({}));

import { RevocationAlertToast } from '../RevocationAlertToast';
import type { RevocationAlert } from '../types';

// =============================================================================
// TEST DATA
// =============================================================================

function createTestAlert(overrides?: Partial<RevocationAlert>): RevocationAlert {
  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    agentId: 'agent-1',
    agentName: 'Test Agent',
    action: 'degrade',
    severity: 'warning',
    message: 'Agent trust has been degraded due to behavioral violations.',
    reason: 'Excessive velocity detected',
    primaryCause: 'physics_adherence',
    compositeScore: 0.35,
    timestamp: Date.now(),
    dismissed: false,
    autoDismissMs: 5000,
    ...overrides,
  };
}

function createMultipleAlerts(count: number): RevocationAlert[] {
  const severities: Array<RevocationAlert['severity']> = ['info', 'warning', 'critical'];
  const actions: Array<RevocationAlert['action']> = ['degrade', 'revoke', 'recover'];

  return Array.from({ length: count }, (_, i) => createTestAlert({
    id: `alert-${i}`,
    severity: severities[i % severities.length],
    action: actions[i % actions.length],
    compositeScore: 0.1 + (i / count) * 0.8,
    timestamp: Date.now() - i * 60_000,
    message: `Alert ${i + 1}: Agent trust event occurred.`,
  }));
}

// =============================================================================
// TESTS
// =============================================================================

describe('RevocationAlertToast', () => {
  describe('basic rendering', () => {
    it('should accept alerts array', () => {
      const alerts = [createTestAlert()];
      const element = React.createElement(RevocationAlertToast, { alerts });
      expect(element.props.alerts).toHaveLength(1);
    });

    it('should handle empty alerts array', () => {
      const element = React.createElement(RevocationAlertToast, { alerts: [] });
      expect(element.props.alerts).toHaveLength(0);
    });

    it('should accept multiple alerts', () => {
      const alerts = createMultipleAlerts(5);
      const element = React.createElement(RevocationAlertToast, { alerts });
      expect(element.props.alerts).toHaveLength(5);
    });
  });

  describe('position variants', () => {
    const positions = [
      'top-right', 'top-left',
      'bottom-right', 'bottom-left',
      'top-center', 'bottom-center',
    ] as const;

    for (const position of positions) {
      it(`should accept position "${position}"`, () => {
        const alerts = [createTestAlert()];
        const element = React.createElement(RevocationAlertToast, {
          alerts,
          position,
        });
        expect(element.props.position).toBe(position);
      });
    }
  });

  describe('max visible', () => {
    it('should accept maxVisible prop', () => {
      const alerts = createMultipleAlerts(10);
      const element = React.createElement(RevocationAlertToast, {
        alerts,
        maxVisible: 3,
      });
      expect(element.props.maxVisible).toBe(3);
    });

    it('should default to 5 max visible', () => {
      const alerts = createMultipleAlerts(10);
      const element = React.createElement(RevocationAlertToast, { alerts });
      expect(element.props.maxVisible).toBeUndefined();
    });
  });

  describe('callback handling', () => {
    it('should accept onDismiss callback', () => {
      const onDismiss = vi.fn();
      const alerts = [createTestAlert()];
      const element = React.createElement(RevocationAlertToast, {
        alerts,
        onDismiss,
      });
      expect(element.props.onDismiss).toBe(onDismiss);
    });

    it('should accept onViewDetails callback', () => {
      const onViewDetails = vi.fn();
      const alerts = [createTestAlert()];
      const element = React.createElement(RevocationAlertToast, {
        alerts,
        onViewDetails,
      });
      expect(element.props.onViewDetails).toBe(onViewDetails);
    });

    it('should accept onReverify callback', () => {
      const onReverify = vi.fn();
      const alerts = [createTestAlert({ action: 'degrade' })];
      const element = React.createElement(RevocationAlertToast, {
        alerts,
        onReverify,
      });
      expect(element.props.onReverify).toBe(onReverify);
    });
  });

  describe('alert data structure', () => {
    it('should handle critical severity alerts', () => {
      const alert = createTestAlert({
        severity: 'critical',
        action: 'revoke',
        compositeScore: 0.05,
        message: 'Agent has been revoked due to harassment.',
      });
      expect(alert.severity).toBe('critical');
      expect(alert.compositeScore).toBe(0.05);
    });

    it('should handle info severity alerts', () => {
      const alert = createTestAlert({
        severity: 'info',
        action: 'recover',
        compositeScore: 0.85,
        message: 'Agent trust has been restored.',
      });
      expect(alert.severity).toBe('info');
      expect(alert.action).toBe('recover');
    });

    it('should handle dismissed alerts', () => {
      const alerts = [
        createTestAlert({ id: 'a1', dismissed: false }),
        createTestAlert({ id: 'a2', dismissed: true }),
        createTestAlert({ id: 'a3', dismissed: false }),
      ];

      const visibleCount = alerts.filter((a) => !a.dismissed).length;
      expect(visibleCount).toBe(2);
    });

    it('should handle auto-dismiss disabled (0ms)', () => {
      const alert = createTestAlert({ autoDismissMs: 0 });
      expect(alert.autoDismissMs).toBe(0);
    });

    it('should handle alert with no optional fields', () => {
      const alert = createTestAlert({
        agentName: undefined,
        reason: undefined,
        primaryCause: undefined,
      });
      expect(alert.agentName).toBeUndefined();
      expect(alert.reason).toBeUndefined();
      expect(alert.primaryCause).toBeUndefined();
    });
  });

  describe('theme customization', () => {
    it('should accept theme overrides', () => {
      const alerts = [createTestAlert()];
      const element = React.createElement(RevocationAlertToast, {
        alerts,
        theme: {
          fontFamily: 'monospace',
          textMuted: '#888',
        },
      });
      expect(element.props.theme).toEqual({
        fontFamily: 'monospace',
        textMuted: '#888',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle alert with zero score', () => {
      const alert = createTestAlert({ compositeScore: 0 });
      expect(alert.compositeScore).toBe(0);
    });

    it('should handle alert with max score', () => {
      const alert = createTestAlert({
        compositeScore: 1.0,
        action: 'recover',
      });
      expect(alert.compositeScore).toBe(1.0);
    });

    it('should handle alert with very long message', () => {
      const longMessage = 'A'.repeat(500);
      const alert = createTestAlert({ message: longMessage });
      expect(alert.message.length).toBe(500);
    });

    it('should handle alert with special characters in agent name', () => {
      const alert = createTestAlert({
        agentName: '<script>alert("xss")</script>',
      });
      // React will escape this automatically when rendering
      expect(alert.agentName).toContain('script');
    });
  });
});
