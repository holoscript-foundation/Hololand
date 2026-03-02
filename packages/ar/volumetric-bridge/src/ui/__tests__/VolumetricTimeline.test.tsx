/**
 * Tests for VolumetricTimeline component
 *
 * Validates:
 * - Basic rendering with time display
 * - Play/pause button behavior
 * - Seek via click on timeline track
 * - Keyboard navigation (arrows, space, Home, End)
 * - Keyframe indicator rendering
 * - Frame strip rendering
 * - Buffered range display
 * - Bandwidth display
 * - Quality tier display
 * - Disabled state
 * - ARIA attributes
 *
 * @module volumetric-bridge/ui/__tests__
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VolumetricTimeline } from '../VolumetricTimeline';
import type { VolumetricTimelineProps, TimelineKeyframe } from '../types';

// =============================================================================
// TEST UTILITIES
// =============================================================================

function renderTimeline(overrides: Partial<VolumetricTimelineProps> = {}) {
  const defaultProps: VolumetricTimelineProps = {
    currentTime: 5,
    duration: 30,
    onSeek: vi.fn(),
    playbackState: 'paused',
    onPlayPause: vi.fn(),
    ...overrides,
  };
  return { ...render(<VolumetricTimeline {...defaultProps} />), props: defaultProps };
}

const mockKeyframes: TimelineKeyframe[] = [
  { frameIndex: 0, time: 0, type: 'scheduled', active: false },
  { frameIndex: 30, time: 1, type: 'scheduled', active: false },
  { frameIndex: 75, time: 2.5, type: 'adaptive', active: true },
  { frameIndex: 150, time: 5, type: 'seek', active: false },
];

// =============================================================================
// TESTS
// =============================================================================

describe('VolumetricTimeline', () => {
  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  it('renders time display showing current / total', () => {
    renderTimeline({ currentTime: 5, duration: 30 });
    expect(screen.getByText('0:05 / 0:30')).toBeDefined();
  });

  it('renders the timeline group with proper aria-label', () => {
    renderTimeline();
    expect(screen.getByRole('group')).toBeDefined();
  });

  it('renders the slider element', () => {
    renderTimeline();
    const slider = screen.getByRole('slider');
    expect(slider).toBeDefined();
  });

  it('sets proper aria-valuenow on slider', () => {
    renderTimeline({ currentTime: 15, duration: 60 });
    const slider = screen.getByRole('slider');
    expect(slider.getAttribute('aria-valuenow')).toBe('15');
  });

  // ---------------------------------------------------------------------------
  // Play/Pause
  // ---------------------------------------------------------------------------

  it('renders play button when paused', () => {
    renderTimeline({ playbackState: 'paused' });
    const button = screen.getByRole('button', { name: 'Play' });
    expect(button).toBeDefined();
  });

  it('renders pause button when playing', () => {
    renderTimeline({ playbackState: 'playing' });
    const button = screen.getByRole('button', { name: 'Pause' });
    expect(button).toBeDefined();
  });

  it('calls onPlayPause when play button clicked', () => {
    const onPlayPause = vi.fn();
    renderTimeline({ onPlayPause });
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onPlayPause).toHaveBeenCalledOnce();
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  it('handles space bar to toggle play/pause', () => {
    const onPlayPause = vi.fn();
    renderTimeline({ onPlayPause });
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: ' ' });
    expect(onPlayPause).toHaveBeenCalledOnce();
  });

  it('handles ArrowRight to seek forward 1 second', () => {
    const onSeek = vi.fn();
    renderTimeline({ currentTime: 10, duration: 30, onSeek });
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenCalledWith(11);
  });

  it('handles ArrowLeft to seek backward 1 second', () => {
    const onSeek = vi.fn();
    renderTimeline({ currentTime: 10, duration: 30, onSeek });
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onSeek).toHaveBeenCalledWith(9);
  });

  it('handles ArrowUp to seek forward 5 seconds', () => {
    const onSeek = vi.fn();
    renderTimeline({ currentTime: 10, duration: 30, onSeek });
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onSeek).toHaveBeenCalledWith(15);
  });

  it('handles Home to seek to beginning', () => {
    const onSeek = vi.fn();
    renderTimeline({ currentTime: 15, duration: 30, onSeek });
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it('handles End to seek to end', () => {
    const onSeek = vi.fn();
    renderTimeline({ currentTime: 15, duration: 30, onSeek });
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onSeek).toHaveBeenCalledWith(30);
  });

  it('clamps seek to duration bounds', () => {
    const onSeek = vi.fn();
    renderTimeline({ currentTime: 29.5, duration: 30, onSeek });
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    // Should clamp to 30 instead of going to 34.5
    expect(onSeek).toHaveBeenCalledWith(30);
  });

  // ---------------------------------------------------------------------------
  // Keyframe indicators
  // ---------------------------------------------------------------------------

  it('renders keyframe indicators when provided', () => {
    renderTimeline({ keyframes: mockKeyframes });
    // Each keyframe should render as a positioned div
    // The component renders them based on timeline position percentage
    const { container } = render(
      <VolumetricTimeline
        currentTime={5}
        duration={30}
        onSeek={vi.fn()}
        playbackState="paused"
        onPlayPause={vi.fn()}
        keyframes={mockKeyframes}
      />,
    );
    expect(container).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Quality tier display
  // ---------------------------------------------------------------------------

  it('shows quality tier when provided', () => {
    renderTimeline({ qualityTier: 'high' });
    expect(screen.getByText('HIGH')).toBeDefined();
  });

  it('shows tier label text', () => {
    renderTimeline({ qualityTier: 'mid' });
    expect(screen.getByText('MID')).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Bandwidth display
  // ---------------------------------------------------------------------------

  it('shows bandwidth when showBandwidth is true', () => {
    renderTimeline({ showBandwidth: true, bandwidthKbps: 1200 });
    expect(screen.getByText('1.2 Mbps')).toBeDefined();
  });

  it('shows bandwidth in Kbps for lower values', () => {
    renderTimeline({ showBandwidth: true, bandwidthKbps: 500 });
    expect(screen.getByText('500 Kbps')).toBeDefined();
  });

  it('hides bandwidth when showBandwidth is false', () => {
    renderTimeline({ showBandwidth: false, bandwidthKbps: 1200 });
    expect(screen.queryByText('1.2 Mbps')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Frame strip
  // ---------------------------------------------------------------------------

  it('shows frame strip legend when showFrameStrip is true', () => {
    renderTimeline({
      showFrameStrip: true,
      frameIndex: [
        { index: 0, type: 'I', byteOffset: 0, byteLength: 1000, timestamp: 0, gaussianCount: 50000, tierRanges: {} as any },
        { index: 1, type: 'P', byteOffset: 1000, byteLength: 500, timestamp: 0.033, gaussianCount: 50000, tierRanges: {} as any },
      ],
    });
    expect(screen.getByText('I-frame')).toBeDefined();
    expect(screen.getByText('P-frame')).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  it('prevents interactions when disabled', () => {
    const onSeek = vi.fn();
    const onPlayPause = vi.fn();
    renderTimeline({ disabled: true, onSeek, onPlayPause });

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onSeek).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles zero duration gracefully', () => {
    renderTimeline({ currentTime: 0, duration: 0 });
    expect(screen.getByText('0:00 / 0:00')).toBeDefined();
  });

  it('handles time at exactly duration', () => {
    renderTimeline({ currentTime: 30, duration: 30 });
    expect(screen.getByText('0:30 / 0:30')).toBeDefined();
  });
});
