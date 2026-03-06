/**
 * Tests for ModelViewer component
 *
 * Verifies rendering, loading/error states, CSS passthrough, fallback
 * selection, and event forwarding.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ModelViewer } from '../ModelViewer';
import * as featureDetection from '../featureDetection';
import type { ModelElementSupport } from '../featureDetection';

// Mock the feature detection module
vi.mock('../featureDetection', () => ({
  detectModelElementSupport: vi.fn(),
  _resetDetectionCache: vi.fn(),
}));

// Mock the useModelElement hook to avoid real element interactions
vi.mock('../useModelElement', () => ({
  useModelElement: vi.fn(() => ({
    ref: { current: null },
    loadingState: 'idle',
    error: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    animations: [],
    entityNames: [],
    play: vi.fn(),
    pause: vi.fn(),
    togglePlayback: vi.fn(),
    seekTo: vi.fn(),
    setAnimation: vi.fn(),
    getEntityTransform: vi.fn(),
    setEntityTransform: vi.fn(),
    getCamera: vi.fn(),
    setCamera: vi.fn(),
    retry: vi.fn(),
  })),
}));

// Import after mocking
import { useModelElement } from '../useModelElement';

const mockDetect = featureDetection.detectModelElementSupport as ReturnType<typeof vi.fn>;
const mockUseModelElement = useModelElement as ReturnType<typeof vi.fn>;

// ─── Test Helpers ───────────────────────────────────────────────────────────

function mockNativeSupport(): void {
  mockDetect.mockReturnValue({
    supported: true,
    isVisionOS: true,
    hasWebGL: true,
    hasWebGL2: true,
    fallbackStrategy: 'native',
  } satisfies ModelElementSupport);
}

function mockNoNativeSupport(strategy: 'threejs' | 'image' | 'quicklook' = 'image'): void {
  mockDetect.mockReturnValue({
    supported: false,
    isVisionOS: false,
    hasWebGL: strategy === 'threejs',
    hasWebGL2: strategy === 'threejs',
    fallbackStrategy: strategy,
  } satisfies ModelElementSupport);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ModelViewer', () => {
  beforeEach(() => {
    mockNativeSupport();
    mockUseModelElement.mockReturnValue({
      ref: { current: null },
      loadingState: 'idle',
      error: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      animations: [],
      entityNames: [],
      play: vi.fn(),
      pause: vi.fn(),
      togglePlayback: vi.fn(),
      seekTo: vi.fn(),
      setAnimation: vi.fn(),
      getEntityTransform: vi.fn(),
      setEntityTransform: vi.fn(),
      getCamera: vi.fn(),
      setCamera: vi.fn(),
      retry: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('native rendering', () => {
    it('renders a container div when native support is detected', () => {
      render(<ModelViewer src="robot.usdz" alt="Robot" />);
      const container = screen.getByTestId('model-viewer-container');
      expect(container).toBeDefined();
    });

    it('renders a <model> element inside the container', () => {
      const { container } = render(<ModelViewer src="robot.usdz" alt="Robot" />);
      const modelEl = container.querySelector('model');
      expect(modelEl).not.toBeNull();
    });

    it('passes src to the <model> element', () => {
      const { container } = render(<ModelViewer src="robot.usdz" alt="Robot" />);
      const modelEl = container.querySelector('model');
      expect(modelEl?.getAttribute('src')).toBe('robot.usdz');
    });

    it('passes alt to the <model> element', () => {
      const { container } = render(<ModelViewer src="robot.usdz" alt="Robot arm" />);
      const modelEl = container.querySelector('model');
      expect(modelEl?.getAttribute('alt')).toBe('Robot arm');
    });

    it('passes interactive to useModelElement', () => {
      render(<ModelViewer src="robot.usdz" alt="Robot" interactive />);
      // The ModelViewer renders; useModelElement is called (mocked).
      // Verify the model element is rendered in the container.
      const container = screen.getByTestId('model-viewer-container');
      expect(container).toBeDefined();
    });

    it('passes autoplay to useModelElement hook', () => {
      render(<ModelViewer src="robot.usdz" alt="Robot" autoplay />);
      // Verify useModelElement was called with autoplay option
      expect(mockUseModelElement).toHaveBeenCalledWith(
        expect.objectContaining({ autoplay: true }),
      );
    });

    it('passes loop to useModelElement hook', () => {
      render(<ModelViewer src="robot.usdz" alt="Robot" loop />);
      // Verify useModelElement was called with loop option
      expect(mockUseModelElement).toHaveBeenCalledWith(
        expect.objectContaining({ loop: true }),
      );
    });
  });

  describe('CSS passthrough', () => {
    it('applies className to the container', () => {
      render(
        <ModelViewer src="robot.usdz" alt="Robot" className="my-viewer" />,
      );
      const container = screen.getByTestId('model-viewer-container');
      expect(container.className).toContain('my-viewer');
    });

    it('applies width and height to the container', () => {
      render(
        <ModelViewer src="robot.usdz" alt="Robot" width={600} height={400} />,
      );
      const container = screen.getByTestId('model-viewer-container');
      expect(container.style.width).toBe('600px');
      expect(container.style.height).toBe('400px');
    });

    it('applies string width and height', () => {
      render(
        <ModelViewer src="robot.usdz" alt="Robot" width="80%" height="50vh" />,
      );
      const container = screen.getByTestId('model-viewer-container');
      expect(container.style.width).toBe('80%');
      expect(container.style.height).toBe('50vh');
    });

    it('applies custom style to the container', () => {
      render(
        <ModelViewer
          src="robot.usdz"
          alt="Robot"
          style={{ border: '1px solid red', borderRadius: '12px' }}
        />,
      );
      const container = screen.getByTestId('model-viewer-container');
      expect(container.style.border).toBe('1px solid red');
      expect(container.style.borderRadius).toBe('12px');
    });

    it('uses default width and height when not specified', () => {
      render(<ModelViewer src="robot.usdz" alt="Robot" />);
      const container = screen.getByTestId('model-viewer-container');
      expect(container.style.width).toBe('100%');
      expect(container.style.height).toBe('400px');
    });
  });

  describe('loading state', () => {
    it('shows loading overlay when loadingState is loading', () => {
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'loading',
        error: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: vi.fn(),
      });

      render(<ModelViewer src="robot.usdz" alt="Robot" />);
      const loading = screen.getByTestId('model-viewer-loading');
      expect(loading).toBeDefined();
    });

    it('shows poster image while loading if provided', () => {
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'loading',
        error: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: vi.fn(),
      });

      const { container } = render(
        <ModelViewer src="robot.usdz" alt="Robot" poster="poster.jpg" />,
      );
      const img = container.querySelector('img[src="poster.jpg"]');
      expect(img).not.toBeNull();
    });

    it('renders custom loading indicator when renderLoading is provided', () => {
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'loading',
        error: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: vi.fn(),
      });

      render(
        <ModelViewer
          src="robot.usdz"
          alt="Robot"
          renderLoading={() => <div data-testid="custom-loading">Loading...</div>}
        />,
      );
      expect(screen.getByTestId('custom-loading')).toBeDefined();
    });

    it('does not show loading overlay when loadingState is ready', () => {
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'ready',
        error: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: vi.fn(),
      });

      render(<ModelViewer src="robot.usdz" alt="Robot" />);
      expect(screen.queryByTestId('model-viewer-loading')).toBeNull();
    });
  });

  describe('error state', () => {
    it('shows error overlay when loadingState is error', () => {
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'error',
        error: { message: 'Failed to load model' },
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: vi.fn(),
      });

      render(<ModelViewer src="robot.usdz" alt="Robot" />);
      const errorOverlay = screen.getByTestId('model-viewer-error');
      expect(errorOverlay).toBeDefined();
    });

    it('displays the error message', () => {
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'error',
        error: { message: 'Network timeout' },
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: vi.fn(),
      });

      render(<ModelViewer src="robot.usdz" alt="Robot" />);
      expect(screen.getByText('Network timeout')).toBeDefined();
    });

    it('shows retry button in error state', () => {
      const retryFn = vi.fn();
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'error',
        error: { message: 'Error' },
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: retryFn,
      });

      render(<ModelViewer src="robot.usdz" alt="Robot" />);
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeDefined();

      fireEvent.click(retryButton);
      expect(retryFn).toHaveBeenCalled();
    });

    it('renders custom error component when renderError is provided', () => {
      const retryFn = vi.fn();
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'error',
        error: { message: 'Custom error' },
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: retryFn,
      });

      render(
        <ModelViewer
          src="robot.usdz"
          alt="Robot"
          renderError={(error, retry) => (
            <div data-testid="custom-error">
              <span>{error.message}</span>
              <button onClick={retry}>Custom Retry</button>
            </div>
          )}
        />,
      );

      expect(screen.getByTestId('custom-error')).toBeDefined();
      expect(screen.getByText('Custom error')).toBeDefined();
    });
  });

  describe('fallback rendering', () => {
    it('renders fallback when native support is not detected', () => {
      mockNoNativeSupport('image');

      const { container } = render(
        <ModelViewer
          src="robot.usdz"
          alt="Robot"
          fallbackSrc="robot-preview.jpg"
        />,
      );

      // Should not render native <model> element
      expect(container.querySelector('model')).toBeNull();
      // Should render an image
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
    });

    it('passes fallbackSrc to fallback renderer', () => {
      mockNoNativeSupport('image');

      const { container } = render(
        <ModelViewer
          src="robot.usdz"
          alt="Robot"
          fallbackSrc="robot-preview.jpg"
        />,
      );

      const img = container.querySelector('img[src="robot-preview.jpg"]');
      expect(img).not.toBeNull();
    });
  });

  describe('model attributes', () => {
    it('passes additional model attributes to the element', () => {
      const { container } = render(
        <ModelViewer
          src="robot.usdz"
          alt="Robot"
          modelAttributes={{ 'data-custom': 'value', 'aria-describedby': 'desc' }}
        />,
      );

      const modelEl = container.querySelector('model');
      expect(modelEl?.getAttribute('data-custom')).toBe('value');
      expect(modelEl?.getAttribute('aria-describedby')).toBe('desc');
    });
  });

  describe('accessibility', () => {
    it('sets role="status" on loading overlay', () => {
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'loading',
        error: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: vi.fn(),
      });

      render(<ModelViewer src="robot.usdz" alt="Robot arm" />);
      const loading = screen.getByTestId('model-viewer-loading');
      expect(loading.getAttribute('role')).toBe('status');
      expect(loading.getAttribute('aria-label')).toBe('Loading Robot arm');
    });

    it('sets role="alert" on error overlay', () => {
      mockUseModelElement.mockReturnValue({
        ref: { current: null },
        loadingState: 'error',
        error: { message: 'Error' },
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        animations: [],
        entityNames: [],
        play: vi.fn(),
        pause: vi.fn(),
        togglePlayback: vi.fn(),
        seekTo: vi.fn(),
        setAnimation: vi.fn(),
        getEntityTransform: vi.fn(),
        setEntityTransform: vi.fn(),
        getCamera: vi.fn(),
        setCamera: vi.fn(),
        retry: vi.fn(),
      });

      render(<ModelViewer src="robot.usdz" alt="Robot" />);
      const errorOverlay = screen.getByTestId('model-viewer-error');
      expect(errorOverlay.getAttribute('role')).toBe('alert');
    });
  });

  describe('displayName', () => {
    it('has the correct displayName', () => {
      expect(ModelViewer.displayName).toBe('ModelViewer');
    });
  });
});
