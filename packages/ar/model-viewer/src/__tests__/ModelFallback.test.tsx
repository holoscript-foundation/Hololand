/**
 * Tests for ModelFallback components
 *
 * Verifies StaticImageFallback, FallbackRenderer strategy selection,
 * and accessibility of fallback renderers.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  StaticImageFallback,
  FallbackRenderer,
} from '../ModelFallback';

describe('StaticImageFallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders a container with role="img"', () => {
      const { container } = render(
        <StaticImageFallback src="robot.usdz" alt="Robot" />,
      );
      const imgContainer = container.querySelector('[role="img"]');
      expect(imgContainer).not.toBeNull();
    });

    it('sets aria-label from alt text', () => {
      const { container } = render(
        <StaticImageFallback src="robot.usdz" alt="Robot arm" />,
      );
      const imgContainer = container.querySelector('[role="img"]');
      expect(imgContainer?.getAttribute('aria-label')).toBe('Robot arm');
    });

    it('renders an image when poster is provided', () => {
      const { container } = render(
        <StaticImageFallback src="robot.usdz" alt="Robot" poster="poster.jpg" />,
      );
      const img = container.querySelector('img[src="poster.jpg"]');
      expect(img).not.toBeNull();
    });

    it('renders an image when fallbackSrc is provided', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.usdz"
          alt="Robot"
          fallbackSrc="fallback.png"
        />,
      );
      const img = container.querySelector('img[src="fallback.png"]');
      expect(img).not.toBeNull();
    });

    it('prefers fallbackSrc over poster', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.usdz"
          alt="Robot"
          poster="poster.jpg"
          fallbackSrc="fallback.png"
        />,
      );
      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('fallback.png');
    });

    it('renders placeholder text when no image is provided', () => {
      const { container } = render(
        <StaticImageFallback src="robot.usdz" alt="Robot" />,
      );
      expect(container.textContent).toContain('3D Model');
    });

    it('renders alt text in placeholder', () => {
      const { container } = render(
        <StaticImageFallback src="robot.usdz" alt="Cool robot" />,
      );
      expect(container.textContent).toContain('Cool robot');
    });
  });

  describe('Quick Look AR link', () => {
    it('renders an AR link for .usdz files when showQuickLook is true', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.usdz"
          alt="Robot"
          showQuickLook
        />,
      );
      const arLink = container.querySelector('a[rel="ar"]');
      expect(arLink).not.toBeNull();
      expect(arLink?.getAttribute('href')).toBe('robot.usdz');
    });

    it('does not render AR link when showQuickLook is false', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.usdz"
          alt="Robot"
          showQuickLook={false}
        />,
      );
      const arLink = container.querySelector('a[rel="ar"]');
      expect(arLink).toBeNull();
    });

    it('does not render AR link for non-.usdz files', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.glb"
          alt="Robot"
          showQuickLook
        />,
      );
      const arLink = container.querySelector('a[rel="ar"]');
      expect(arLink).toBeNull();
    });

    it('sets accessible label on AR link', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.usdz"
          alt="Robot arm"
          showQuickLook
        />,
      );
      const arLink = container.querySelector('a[rel="ar"]');
      expect(arLink?.getAttribute('aria-label')).toBe(
        'View Robot arm in augmented reality',
      );
    });
  });

  describe('sizing', () => {
    it('applies width and height', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.usdz"
          alt="Robot"
          width={500}
          height={300}
        />,
      );
      const el = container.querySelector('[role="img"]') as HTMLElement;
      expect(el.style.width).toBe('500px');
      expect(el.style.height).toBe('300px');
    });

    it('applies string width and height', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.usdz"
          alt="Robot"
          width="80%"
          height="50vh"
        />,
      );
      const el = container.querySelector('[role="img"]') as HTMLElement;
      expect(el.style.width).toBe('80%');
      expect(el.style.height).toBe('50vh');
    });

    it('applies className', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.usdz"
          alt="Robot"
          className="my-fallback"
        />,
      );
      const el = container.querySelector('.my-fallback');
      expect(el).not.toBeNull();
    });

    it('applies custom style', () => {
      const { container } = render(
        <StaticImageFallback
          src="robot.usdz"
          alt="Robot"
          style={{ borderRadius: '12px' }}
        />,
      );
      const el = container.querySelector('[role="img"]') as HTMLElement;
      expect(el.style.borderRadius).toBe('12px');
    });
  });
});

describe('FallbackRenderer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders StaticImageFallback for image strategy', () => {
    const { container } = render(
      <FallbackRenderer
        strategy="image"
        src="robot.usdz"
        alt="Robot"
        fallbackSrc="robot.jpg"
      />,
    );
    // Should render an image fallback
    const imgContainer = container.querySelector('[role="img"]');
    expect(imgContainer).not.toBeNull();
  });

  it('renders Quick Look fallback for quicklook strategy', () => {
    const { container } = render(
      <FallbackRenderer
        strategy="quicklook"
        src="robot.usdz"
        alt="Robot"
      />,
    );
    const arLink = container.querySelector('a[rel="ar"]');
    expect(arLink).not.toBeNull();
  });

  it('renders StaticImageFallback for none strategy', () => {
    const { container } = render(
      <FallbackRenderer
        strategy="none"
        src="robot.usdz"
        alt="Robot"
      />,
    );
    const imgContainer = container.querySelector('[role="img"]');
    expect(imgContainer).not.toBeNull();
    // No AR link for 'none' strategy
    const arLink = container.querySelector('a[rel="ar"]');
    expect(arLink).toBeNull();
  });

  it('passes width and height to the fallback', () => {
    const { container } = render(
      <FallbackRenderer
        strategy="image"
        src="robot.usdz"
        alt="Robot"
        width={600}
        height={400}
      />,
    );
    const el = container.querySelector('[role="img"]') as HTMLElement;
    expect(el.style.width).toBe('600px');
    expect(el.style.height).toBe('400px');
  });
});
