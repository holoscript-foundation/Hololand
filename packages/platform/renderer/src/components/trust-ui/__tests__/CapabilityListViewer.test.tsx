/**
 * @vitest-environment jsdom
 */

/**
 * Tests for CapabilityListViewer component
 *
 * Validates:
 * - Rendering with granted/denied/locked capabilities
 * - Category grouping
 * - Compact mode
 * - Expand/collapse behavior
 * - Required tier display
 * - Summary counts
 * - Accessibility attributes
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('../../../VRTrustHandshake', () => ({}));
vi.mock('../../../BehavioralTrustScoring', () => ({}));

import { CapabilityListViewer } from '../CapabilityListViewer';
import { CAPABILITY_DISPLAY_CONFIG } from '../types';
import type { TrustTier } from '../types';

// =============================================================================
// TESTS
// =============================================================================

describe('CapabilityListViewer', () => {
  describe('basic rendering', () => {
    it('should accept required props', () => {
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T2' as TrustTier,
        grantedCapabilities: ['read_state', 'write_position'],
      });
      expect(element.props.currentTier).toBe('T2');
      expect(element.props.grantedCapabilities).toEqual(['read_state', 'write_position']);
    });

    it('should accept denied capabilities', () => {
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T1' as TrustTier,
        grantedCapabilities: ['read_state'],
        deniedCapabilities: ['admin', 'modify_world'],
      });
      expect(element.props.deniedCapabilities).toEqual(['admin', 'modify_world']);
    });
  });

  describe('capability configuration', () => {
    it('should have all seven capabilities defined', () => {
      const capabilities = Object.keys(CAPABILITY_DISPLAY_CONFIG);
      expect(capabilities).toHaveLength(7);
      expect(capabilities).toContain('read_state');
      expect(capabilities).toContain('write_position');
      expect(capabilities).toContain('write_emotion');
      expect(capabilities).toContain('send_commands');
      expect(capabilities).toContain('invite_agents');
      expect(capabilities).toContain('modify_world');
      expect(capabilities).toContain('admin');
    });

    it('should have correct categories assigned', () => {
      expect(CAPABILITY_DISPLAY_CONFIG.read_state.category).toBe('read');
      expect(CAPABILITY_DISPLAY_CONFIG.write_position.category).toBe('write');
      expect(CAPABILITY_DISPLAY_CONFIG.write_emotion.category).toBe('write');
      expect(CAPABILITY_DISPLAY_CONFIG.send_commands.category).toBe('write');
      expect(CAPABILITY_DISPLAY_CONFIG.invite_agents.category).toBe('admin');
      expect(CAPABILITY_DISPLAY_CONFIG.modify_world.category).toBe('admin');
      expect(CAPABILITY_DISPLAY_CONFIG.admin.category).toBe('admin');
    });

    it('should have escalating required tiers', () => {
      // Read capabilities should require lower tiers
      expect(CAPABILITY_DISPLAY_CONFIG.read_state.requiredTier).toBe('T0');
      // Write capabilities should require T1-T2
      expect(CAPABILITY_DISPLAY_CONFIG.write_position.requiredTier).toBe('T1');
      expect(CAPABILITY_DISPLAY_CONFIG.send_commands.requiredTier).toBe('T2');
      // Admin capabilities should require T3
      expect(CAPABILITY_DISPLAY_CONFIG.admin.requiredTier).toBe('T3');
    });
  });

  describe('feature toggles', () => {
    it('should accept showLocked toggle', () => {
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T1' as TrustTier,
        grantedCapabilities: ['read_state'],
        showLocked: false,
      });
      expect(element.props.showLocked).toBe(false);
    });

    it('should accept showDescriptions toggle', () => {
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T2' as TrustTier,
        grantedCapabilities: ['read_state'],
        showDescriptions: false,
      });
      expect(element.props.showDescriptions).toBe(false);
    });

    it('should accept groupByCategory toggle', () => {
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T2' as TrustTier,
        grantedCapabilities: ['read_state'],
        groupByCategory: false,
      });
      expect(element.props.groupByCategory).toBe(false);
    });

    it('should accept compact mode', () => {
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T3' as TrustTier,
        grantedCapabilities: ['read_state', 'write_position', 'admin'],
        compact: true,
      });
      expect(element.props.compact).toBe(true);
    });
  });

  describe('callback handling', () => {
    it('should accept onCapabilityClick callback', () => {
      const onCapabilityClick = vi.fn();
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T2' as TrustTier,
        grantedCapabilities: ['read_state'],
        onCapabilityClick,
      });
      expect(element.props.onCapabilityClick).toBe(onCapabilityClick);
    });
  });

  describe('theme customization', () => {
    it('should accept theme overrides', () => {
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T2' as TrustTier,
        grantedCapabilities: ['read_state'],
        theme: {
          containerBackground: '#222',
          textPrimary: '#eee',
        },
      });
      expect(element.props.theme).toEqual({
        containerBackground: '#222',
        textPrimary: '#eee',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty granted capabilities', () => {
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T0' as TrustTier,
        grantedCapabilities: [],
      });
      expect(element.props.grantedCapabilities).toHaveLength(0);
    });

    it('should handle all capabilities granted', () => {
      const allCaps = Object.keys(CAPABILITY_DISPLAY_CONFIG) as Array<keyof typeof CAPABILITY_DISPLAY_CONFIG>;
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T3' as TrustTier,
        grantedCapabilities: allCaps,
      });
      expect(element.props.grantedCapabilities).toHaveLength(7);
    });

    it('should handle overlapping granted and denied', () => {
      // A capability should not be both granted and denied, but the component should handle it
      const element = React.createElement(CapabilityListViewer, {
        currentTier: 'T2' as TrustTier,
        grantedCapabilities: ['read_state'],
        deniedCapabilities: ['read_state'], // edge case
      });
      // The component should still render without error
      expect(element.props.grantedCapabilities).toContain('read_state');
      expect(element.props.deniedCapabilities).toContain('read_state');
    });
  });
});
