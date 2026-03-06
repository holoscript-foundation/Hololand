/**
 * Tests for ModelGallery component
 *
 * Verifies grid rendering, selection state, captions, keyboard navigation,
 * lazy loading, and empty state handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ModelGallery } from '../ModelGallery';
import type { ModelGalleryItem } from '../types';

// Mock ModelViewer to avoid its complex internals in gallery tests
vi.mock('../ModelViewer', () => ({
  ModelViewer: vi.fn(({ src, alt }: any) => (
    <div data-testid={`mock-model-viewer-${src}`} data-alt={alt}>
      Mock ModelViewer: {src}
    </div>
  )),
}));

// Mock feature detection
vi.mock('../featureDetection', () => ({
  detectModelElementSupport: vi.fn(() => ({
    supported: true,
    isVisionOS: true,
    hasWebGL: true,
    hasWebGL2: true,
    fallbackStrategy: 'native',
  })),
  _resetDetectionCache: vi.fn(),
}));

// ─── Test Data ──────────────────────────────────────────────────────────────

const sampleModels: ModelGalleryItem[] = [
  {
    id: 'robot',
    src: 'robot.usdz',
    alt: 'Industrial robot arm',
    title: 'Robot Arm',
    description: 'A 6-axis industrial robot arm',
    poster: 'robot-thumb.jpg',
  },
  {
    id: 'car',
    src: 'car.usdz',
    alt: 'Sports car',
    title: 'Sports Car',
    description: 'A red sports car',
  },
  {
    id: 'chair',
    src: 'chair.usdz',
    alt: 'Office chair',
    title: 'Office Chair',
  },
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ModelGallery', () => {
  beforeEach(() => {
    // Mock IntersectionObserver for lazy loading tests
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    });
    (window as any).IntersectionObserver = mockIntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).IntersectionObserver;
  });

  describe('rendering', () => {
    it('renders a grid container', () => {
      render(<ModelGallery models={sampleModels} />);
      const gallery = screen.getByTestId('model-gallery');
      expect(gallery).toBeDefined();
    });

    it('renders correct number of gallery items', () => {
      render(<ModelGallery models={sampleModels} />);
      expect(screen.getByTestId('gallery-item-0')).toBeDefined();
      expect(screen.getByTestId('gallery-item-1')).toBeDefined();
      expect(screen.getByTestId('gallery-item-2')).toBeDefined();
    });

    it('sets grid columns from columns prop', () => {
      render(<ModelGallery models={sampleModels} columns={4} />);
      const gallery = screen.getByTestId('model-gallery');
      expect(gallery.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
    });

    it('sets gap from gap prop', () => {
      render(<ModelGallery models={sampleModels} gap={24} />);
      const gallery = screen.getByTestId('model-gallery');
      expect(gallery.style.gap).toBe('24px');
    });

    it('applies className to the gallery container', () => {
      render(<ModelGallery models={sampleModels} className="my-gallery" />);
      const gallery = screen.getByTestId('model-gallery');
      expect(gallery.className).toContain('my-gallery');
    });

    it('applies style to the gallery container', () => {
      render(
        <ModelGallery
          models={sampleModels}
          style={{ maxWidth: '1200px', margin: '0 auto' }}
        />,
      );
      const gallery = screen.getByTestId('model-gallery');
      expect(gallery.style.maxWidth).toBe('1200px');
    });

    it('uses default columns (3) and gap (16)', () => {
      render(<ModelGallery models={sampleModels} />);
      const gallery = screen.getByTestId('model-gallery');
      expect(gallery.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
      expect(gallery.style.gap).toBe('16px');
    });
  });

  describe('empty state', () => {
    it('shows empty message when no models provided', () => {
      render(<ModelGallery models={[]} />);
      const empty = screen.getByTestId('gallery-empty');
      expect(empty).toBeDefined();
      expect(empty.textContent).toContain('No models to display');
    });

    it('does not render grid when models array is empty', () => {
      render(<ModelGallery models={[]} />);
      expect(screen.queryByTestId('model-gallery')).toBeNull();
    });
  });

  describe('captions', () => {
    it('displays title and description when showCaptions is true', () => {
      render(<ModelGallery models={sampleModels} showCaptions />);
      expect(screen.getByText('Robot Arm')).toBeDefined();
      expect(screen.getByText('A 6-axis industrial robot arm')).toBeDefined();
    });

    it('displays title without description when description is undefined', () => {
      render(<ModelGallery models={sampleModels} showCaptions />);
      expect(screen.getByText('Office Chair')).toBeDefined();
    });

    it('hides captions when showCaptions is false', () => {
      render(<ModelGallery models={sampleModels} showCaptions={false} />);
      expect(screen.queryByText('Robot Arm')).toBeNull();
    });
  });

  describe('selection', () => {
    it('calls onSelect when a gallery item is clicked', () => {
      const onSelect = vi.fn();
      render(<ModelGallery models={sampleModels} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('gallery-item-1'));
      expect(onSelect).toHaveBeenCalledWith(1, sampleModels[1]);
    });

    it('supports controlled selectedIndex', () => {
      const { rerender } = render(
        <ModelGallery models={sampleModels} selectedIndex={0} />,
      );

      const item0 = screen.getByTestId('gallery-item-0');
      expect(item0.getAttribute('aria-pressed')).toBe('true');

      const item1 = screen.getByTestId('gallery-item-1');
      expect(item1.getAttribute('aria-pressed')).toBe('false');

      // Change selected index
      rerender(<ModelGallery models={sampleModels} selectedIndex={2} />);
      const item2 = screen.getByTestId('gallery-item-2');
      expect(item2.getAttribute('aria-pressed')).toBe('true');
    });

    it('manages selection internally when selectedIndex is not controlled', () => {
      const onSelect = vi.fn();
      render(<ModelGallery models={sampleModels} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('gallery-item-1'));

      // After clicking, item 1 should be selected
      const item1 = screen.getByTestId('gallery-item-1');
      expect(item1.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('keyboard navigation', () => {
    it('selects item on Enter key press', () => {
      const onSelect = vi.fn();
      render(<ModelGallery models={sampleModels} onSelect={onSelect} />);

      const item = screen.getByTestId('gallery-item-0');
      fireEvent.keyDown(item, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledWith(0, sampleModels[0]);
    });

    it('selects item on Space key press', () => {
      const onSelect = vi.fn();
      render(<ModelGallery models={sampleModels} onSelect={onSelect} />);

      const item = screen.getByTestId('gallery-item-2');
      fireEvent.keyDown(item, { key: ' ' });

      expect(onSelect).toHaveBeenCalledWith(2, sampleModels[2]);
    });

    it('gallery items are focusable (tabIndex=0)', () => {
      render(<ModelGallery models={sampleModels} />);
      const item = screen.getByTestId('gallery-item-0');
      expect(item.getAttribute('tabindex')).toBe('0');
    });

    it('sets role="button" on gallery items', () => {
      render(<ModelGallery models={sampleModels} />);
      const item = screen.getByTestId('gallery-item-0');
      expect(item.getAttribute('role')).toBe('button');
    });
  });

  describe('accessibility', () => {
    it('sets role="group" on the gallery container', () => {
      render(<ModelGallery models={sampleModels} />);
      const gallery = screen.getByTestId('model-gallery');
      expect(gallery.getAttribute('role')).toBe('group');
    });

    it('sets aria-label describing the gallery', () => {
      render(<ModelGallery models={sampleModels} />);
      const gallery = screen.getByTestId('model-gallery');
      expect(gallery.getAttribute('aria-label')).toBe('Model gallery with 3 items');
    });

    it('sets aria-label on gallery items from title or alt', () => {
      render(<ModelGallery models={sampleModels} />);
      const item = screen.getByTestId('gallery-item-0');
      expect(item.getAttribute('aria-label')).toBe('Robot Arm');
    });

    it('uses alt text for aria-label when title is not provided', () => {
      const modelsNoTitle: ModelGalleryItem[] = [
        { id: '1', src: 'test.usdz', alt: 'Test model' },
      ];
      render(<ModelGallery models={modelsNoTitle} />);
      const item = screen.getByTestId('gallery-item-0');
      expect(item.getAttribute('aria-label')).toBe('Test model');
    });
  });

  describe('lazy loading', () => {
    it('observes elements with IntersectionObserver when lazyLoad is true', () => {
      render(<ModelGallery models={sampleModels} lazyLoad />);
      expect(window.IntersectionObserver).toHaveBeenCalled();
    });

    it('does not observe elements when lazyLoad is false', () => {
      render(<ModelGallery models={sampleModels} lazyLoad={false} />);
      // When lazyLoad is false, the mock viewer should render immediately
      expect(screen.getByText('Mock ModelViewer: robot.usdz')).toBeDefined();
    });
  });

  describe('displayName', () => {
    it('has the correct displayName', () => {
      expect(ModelGallery.displayName).toBe('ModelGallery');
    });
  });
});
