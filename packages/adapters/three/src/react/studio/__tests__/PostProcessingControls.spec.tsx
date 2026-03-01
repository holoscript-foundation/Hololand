/**
 * Tests for PostProcessingControls component
 *
 * Verifies the Studio IDE panel renders correctly:
 *   - Renders with default state (all effects disabled)
 *   - Collapse/expand toggle
 *   - Effect section toggles
 *   - Preset selector
 *   - Export button
 *   - Accessibility attributes
 *
 * @module studio/__tests__/PostProcessingControls.spec
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostProcessingControls } from '../PostProcessingControls';

// =============================================================================
// MOCKS
// =============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Mock the export function
vi.mock('../postProcessingExport', () => ({
  exportPostProcessingToHoloScript: vi.fn(() => '@post_processing {\n  bloom_enabled: false\n}'),
}));

// =============================================================================
// TESTS
// =============================================================================

describe('PostProcessingControls', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('should render the panel with header', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      expect(
        screen.getByRole('region', { name: /post-processing controls/i }),
      ).toBeDefined();
    });

    it('should show "Post Processing" header text', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      expect(screen.getByText('Post Processing')).toBeDefined();
    });

    it('should render all 4 effect section headers', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      expect(screen.getByText('Bloom')).toBeDefined();
      expect(screen.getByText('Depth of Field')).toBeDefined();
      expect(screen.getByText('Motion Blur')).toBeDefined();
      expect(screen.getByText('Color Grading')).toBeDefined();
    });

    it('should render preset selector', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      expect(
        screen.getByRole('combobox', { name: /post-processing preset/i }),
      ).toBeDefined();
    });

    it('should render Export button', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      expect(
        screen.getByRole('button', { name: /export to holoscript/i }),
      ).toBeDefined();
    });

    it('should render Reset button', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      expect(
        screen.getByRole('button', { name: /reset all/i }),
      ).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Collapse/Expand
  // ---------------------------------------------------------------------------

  describe('collapse/expand', () => {
    it('should start expanded by default', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const expandBtn = screen.getByRole('button', {
        name: /collapse post-processing controls/i,
      });
      expect(expandBtn.getAttribute('aria-expanded')).toBe('true');
    });

    it('should start collapsed when defaultCollapsed is true', () => {
      render(
        <PostProcessingControls
          defaultCollapsed
          hookOptions={{ persist: false }}
        />,
      );

      const expandBtn = screen.getByRole('button', {
        name: /expand post-processing controls/i,
      });
      expect(expandBtn.getAttribute('aria-expanded')).toBe('false');
    });

    it('should toggle collapsed state on header click', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const collapseBtn = screen.getByRole('button', {
        name: /collapse post-processing controls/i,
      });

      fireEvent.click(collapseBtn);

      // Now it should show "Expand"
      expect(
        screen.getByRole('button', { name: /expand post-processing controls/i }),
      ).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Effect toggles
  // ---------------------------------------------------------------------------

  describe('effect toggles', () => {
    it('should have toggle switches for each effect', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      expect(screen.getByRole('switch', { name: /toggle bloom/i })).toBeDefined();
      expect(screen.getByRole('switch', { name: /toggle depth of field/i })).toBeDefined();
      expect(screen.getByRole('switch', { name: /toggle motion blur/i })).toBeDefined();
      expect(screen.getByRole('switch', { name: /toggle color grading/i })).toBeDefined();
    });

    it('should start with all effects disabled (aria-checked=false)', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const bloomToggle = screen.getByRole('switch', { name: /toggle bloom/i });
      expect(bloomToggle.getAttribute('aria-checked')).toBe('false');
    });

    it('should toggle bloom on click', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const bloomToggle = screen.getByRole('switch', { name: /toggle bloom/i });
      fireEvent.click(bloomToggle);
      expect(bloomToggle.getAttribute('aria-checked')).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  describe('accessibility', () => {
    it('should have region role with label', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      expect(
        screen.getByRole('region', { name: /post-processing controls/i }),
      ).toBeDefined();
    });

    it('should have aria-expanded on the main header', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const header = screen.getByRole('button', {
        name: /collapse post-processing controls/i,
      });
      expect(header.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have keyboard support on header (Enter key)', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const header = screen.getByRole('button', {
        name: /collapse post-processing controls/i,
      });

      fireEvent.keyDown(header, { key: 'Enter' });

      expect(
        screen.getByRole('button', { name: /expand post-processing controls/i }),
      ).toBeDefined();
    });

    it('should have keyboard support on toggle switches', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const bloomToggle = screen.getByRole('switch', { name: /toggle bloom/i });
      fireEvent.keyDown(bloomToggle, { key: ' ' });
      expect(bloomToggle.getAttribute('aria-checked')).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  describe('export', () => {
    it('should call onExport when Export button is clicked', () => {
      const onExport = vi.fn();

      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
          onExport={onExport}
        />,
      );

      const exportBtn = screen.getByRole('button', { name: /export to holoscript/i });
      fireEvent.click(exportBtn);

      expect(onExport).toHaveBeenCalledTimes(1);
      expect(typeof onExport.mock.calls[0][0]).toBe('string');
    });

    it('should show Copy button after export', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const exportBtn = screen.getByRole('button', { name: /export to holoscript/i });
      fireEvent.click(exportBtn);

      expect(
        screen.getByRole('button', { name: /copy holoscript to clipboard/i }),
      ).toBeDefined();
    });

    it('should show exported source preview', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const exportBtn = screen.getByRole('button', { name: /export to holoscript/i });
      fireEvent.click(exportBtn);

      expect(
        screen.getByLabelText('Exported HoloScript source'),
      ).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Presets
  // ---------------------------------------------------------------------------

  describe('presets', () => {
    it('should render preset options in the select', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const select = screen.getByRole('combobox', { name: /post-processing preset/i });
      const options = select.querySelectorAll('option');

      // "Presets" placeholder + 5 built-in presets
      expect(options.length).toBeGreaterThanOrEqual(6);
    });

    it('should apply preset on select change', () => {
      render(
        <PostProcessingControls
          hookOptions={{ persist: false }}
        />,
      );

      const select = screen.getByRole('combobox', { name: /post-processing preset/i });
      fireEvent.change(select, { target: { value: 'Cinematic' } });

      // After applying "Cinematic", bloom should be enabled
      const bloomToggle = screen.getByRole('switch', { name: /toggle bloom/i });
      expect(bloomToggle.getAttribute('aria-checked')).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // Position prop
  // ---------------------------------------------------------------------------

  describe('positioning', () => {
    it('should accept position prop without error', () => {
      const { container } = render(
        <PostProcessingControls
          position="top-left"
          hookOptions={{ persist: false }}
        />,
      );

      expect(container.firstChild).toBeDefined();
    });
  });
});
