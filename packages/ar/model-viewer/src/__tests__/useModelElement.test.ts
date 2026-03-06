/**
 * Tests for useModelElement hook
 *
 * Verifies the React hook that manages the HTML <model> element JS API:
 * play/pause, entity transforms, camera control, loading/error lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModelElement } from '../useModelElement';
import type { UseModelElementOptions } from '../useModelElement';
import { createMockModelElement } from './setup';

describe('useModelElement', () => {
  let mockElement: any;

  beforeEach(() => {
    mockElement = createMockModelElement({
      readyResolves: false, // manual control
      animations: [
        { name: 'idle', duration: 5 },
        { name: 'walk', duration: 3 },
      ],
      entityNames: ['robot_arm', 'robot_head'],
      duration: 10,
    });

    // Prevent unhandled rejection noise
    mockElement.ready.catch(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper: renders the hook with the mock element pre-attached.
   * Uses a wrapper that allows us to change props via rerender.
   */
  async function renderModelHook(options?: Partial<UseModelElementOptions>) {
    const initialProps: UseModelElementOptions = {
      src: 'test.usdz',
      ...options,
    };

    const hookResult = renderHook(
      (props: UseModelElementOptions) => useModelElement(props),
      { initialProps },
    );

    // Attach mock element to the ref
    (hookResult.result.current.ref as any).current = mockElement;

    // Force the effect to re-run by changing src slightly
    hookResult.rerender({ ...initialProps, src: 'test.usdz?t=1' });

    // Allow microtasks to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    return hookResult;
  }

  describe('initial state', () => {
    it('starts with no error', () => {
      const { result } = renderHook(() =>
        useModelElement({ src: 'test.usdz' }),
      );
      expect(result.current.error).toBeNull();
    });

    it('starts with isPlaying false', () => {
      const { result } = renderHook(() =>
        useModelElement({ src: 'test.usdz' }),
      );
      expect(result.current.isPlaying).toBe(false);
    });

    it('starts with currentTime 0', () => {
      const { result } = renderHook(() =>
        useModelElement({ src: 'test.usdz' }),
      );
      expect(result.current.currentTime).toBe(0);
    });

    it('returns a ref object', () => {
      const { result } = renderHook(() =>
        useModelElement({ src: 'test.usdz' }),
      );
      expect(result.current.ref).toBeDefined();
      expect(result.current.ref).toHaveProperty('current');
    });
  });

  describe('loading lifecycle', () => {
    it('is in loading state when ref is attached but model not yet ready', async () => {
      const hookResult = await renderModelHook();
      expect(hookResult.result.current.loadingState).toBe('loading');
    });

    it('transitions to ready when model loads', async () => {
      const onLoad = vi.fn();
      const hookResult = await renderModelHook({ onLoad });

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(hookResult.result.current.loadingState).toBe('ready');
      expect(onLoad).toHaveBeenCalled();
    });

    it('populates animations from the model element on load', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(hookResult.result.current.animations).toEqual([
        { name: 'idle', duration: 5 },
        { name: 'walk', duration: 3 },
      ]);
    });

    it('populates entityNames from the model element on load', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(hookResult.result.current.entityNames).toEqual(['robot_arm', 'robot_head']);
    });

    it('populates duration from the model element on load', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(hookResult.result.current.duration).toBe(10);
    });

    it('transitions to error state when ready promise rejects', async () => {
      const onError = vi.fn();
      const hookResult = await renderModelHook({ onError });

      await act(async () => {
        mockElement._rejectReady(new Error('Network timeout'));
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(hookResult.result.current.loadingState).toBe('error');
      expect(hookResult.result.current.error).not.toBeNull();
      expect(hookResult.result.current.error!.message).toBe('Network timeout');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Network timeout' }),
      );
    });

    it('transitions to error state on error event', async () => {
      const onError = vi.fn();
      const hookResult = await renderModelHook({ onError });

      act(() => {
        mockElement._triggerError('404 Not Found');
      });

      expect(hookResult.result.current.loadingState).toBe('error');
      expect(hookResult.result.current.error!.message).toBe('404 Not Found');
    });
  });

  describe('playback control', () => {
    it('play() calls el.play()', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        hookResult.result.current.play();
      });

      expect(mockElement.play).toHaveBeenCalled();
    });

    it('pause() calls el.pause()', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        hookResult.result.current.pause();
      });

      expect(mockElement.pause).toHaveBeenCalled();
    });

    it('togglePlayback() plays when paused', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        hookResult.result.current.togglePlayback();
      });
      expect(mockElement.play).toHaveBeenCalled();
    });

    it('togglePlayback() pauses when playing', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Start playing
      act(() => {
        hookResult.result.current.play();
      });

      // Now toggle should pause
      act(() => {
        hookResult.result.current.togglePlayback();
      });
      expect(mockElement.pause).toHaveBeenCalled();
    });

    it('updates isPlaying when play event fires', async () => {
      const hookResult = await renderModelHook();

      act(() => {
        mockElement.dispatchEvent(new Event('play'));
      });

      expect(hookResult.result.current.isPlaying).toBe(true);
    });

    it('updates isPlaying when pause event fires', async () => {
      const hookResult = await renderModelHook();

      act(() => {
        mockElement.dispatchEvent(new Event('play'));
      });
      expect(hookResult.result.current.isPlaying).toBe(true);

      act(() => {
        mockElement.dispatchEvent(new Event('pause'));
      });
      expect(hookResult.result.current.isPlaying).toBe(false);
    });

    it('calls onPlaybackChange callback on play', async () => {
      const onPlaybackChange = vi.fn();
      await renderModelHook({ onPlaybackChange });

      act(() => {
        mockElement.dispatchEvent(new Event('play'));
      });

      expect(onPlaybackChange).toHaveBeenCalledWith('playing');
    });

    it('calls onPlaybackChange callback on ended', async () => {
      const onPlaybackChange = vi.fn();
      await renderModelHook({ onPlaybackChange });

      act(() => {
        mockElement._triggerEnded();
      });

      expect(onPlaybackChange).toHaveBeenCalledWith('stopped');
    });

    it('seekTo() clamps time to 0 for negative values', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        hookResult.result.current.seekTo(-5);
      });
      expect(mockElement.currentTime).toBe(0);
    });

    it('seekTo() clamps time to duration for large values', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        hookResult.result.current.seekTo(100);
      });
      expect(mockElement.currentTime).toBe(10);
    });

    it('seekTo() sets valid time', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        hookResult.result.current.seekTo(5);
      });
      expect(mockElement.currentTime).toBe(5);
    });
  });

  describe('time updates', () => {
    it('updates currentTime on timeupdate event', async () => {
      const onTimeUpdate = vi.fn();
      await renderModelHook({ onTimeUpdate });

      act(() => {
        mockElement._triggerTimeUpdate(3.5);
      });

      expect(onTimeUpdate).toHaveBeenCalledWith(3.5);
    });
  });

  describe('animation control', () => {
    it('setAnimation() changes the current animation', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        hookResult.result.current.setAnimation('walk');
      });

      expect(mockElement.currentAnimation).toBe('walk');
    });
  });

  describe('entity transforms', () => {
    it('getEntityTransform() returns transform for existing entity', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const transform = hookResult.result.current.getEntityTransform('robot_arm');
      expect(transform).not.toBeNull();
      expect(transform!.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(transform!.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(transform!.scale).toEqual({ x: 1, y: 1, z: 1 });
    });

    it('getEntityTransform() returns null for non-existent entity', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const transform = hookResult.result.current.getEntityTransform('nonexistent');
      expect(transform).toBeNull();
    });

    it('setEntityTransform() calls the element API', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        hookResult.result.current.setEntityTransform('robot_arm', {
          position: { x: 1, y: 2, z: 3 },
        });
      });

      expect(mockElement.setEntityTransform).toHaveBeenCalledWith('robot_arm', {
        position: { x: 1, y: 2, z: 3 },
      });
    });

    it('calls onEntityChange when entitychange event fires', async () => {
      const onEntityChange = vi.fn();
      await renderModelHook({ onEntityChange });

      act(() => {
        mockElement.dispatchEvent(
          new CustomEvent('entitychange', {
            detail: {
              entityName: 'robot_head',
              transform: {
                position: { x: 0, y: 1, z: 0 },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 },
              },
            },
          }),
        );
      });

      expect(onEntityChange).toHaveBeenCalledWith(
        'robot_head',
        expect.objectContaining({
          position: { x: 0, y: 1, z: 0 },
        }),
      );
    });
  });

  describe('camera control', () => {
    it('getCamera() returns the current camera state', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const camera = hookResult.result.current.getCamera();
      expect(camera).toEqual({ pitch: 0, yaw: 0, distance: 5 });
    });

    it('setCamera() calls the element API', async () => {
      const hookResult = await renderModelHook();

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        hookResult.result.current.setCamera({ pitch: 0.5, yaw: 1.2 });
      });

      expect(mockElement.setCamera).toHaveBeenCalledWith({
        pitch: 0.5,
        yaw: 1.2,
      });
    });
  });

  describe('autoplay option', () => {
    it('calls el.play() on load when autoplay is true', async () => {
      await renderModelHook({ autoplay: true });

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(mockElement.play).toHaveBeenCalled();
    });
  });

  describe('loop option', () => {
    it('sets el.loop on load when loop is true', async () => {
      await renderModelHook({ loop: true });

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(mockElement.loop).toBe(true);
    });
  });

  describe('initialAnimation option', () => {
    it('sets the initial animation on load', async () => {
      await renderModelHook({ initialAnimation: 'walk' });

      await act(async () => {
        mockElement._resolveReady();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(mockElement.currentAnimation).toBe('walk');
    });
  });

  describe('retry', () => {
    it('resets loading state and clears error', async () => {
      const hookResult = await renderModelHook();
      mockElement.src = 'test.usdz?t=1';

      // Trigger error
      await act(async () => {
        mockElement._rejectReady(new Error('Failed'));
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(hookResult.result.current.loadingState).toBe('error');

      // Retry
      act(() => {
        hookResult.result.current.retry();
      });

      expect(hookResult.result.current.loadingState).toBe('loading');
      expect(hookResult.result.current.error).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on unmount', async () => {
      const hookResult = await renderModelHook();

      hookResult.unmount();

      expect(mockElement.removeEventListener).toHaveBeenCalled();
    });
  });
});
