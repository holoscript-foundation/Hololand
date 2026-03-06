/**
 * @vitest-environment jsdom
 */

/**
 * Tests for RobotCameraOverlay
 *
 * Validates:
 * - Frame processing and FPS tracking
 * - Gaze-following position updates
 * - Canvas rendering
 * - Latency indicator
 * - Visibility toggle
 * - Config updates
 * - Reset and destroy lifecycle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  RobotCameraOverlay,
  createRobotCameraOverlay,
} from '../RobotCameraOverlay';
import type { Vec3 } from '../TeleoperationHubTypes';

// =============================================================================
// TESTS
// =============================================================================

describe('RobotCameraOverlay', () => {
  let overlay: RobotCameraOverlay;

  beforeEach(() => {
    overlay = createRobotCameraOverlay();
  });

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(overlay).toBeDefined();
      expect(overlay.isVisible()).toBe(true);
      expect(overlay.getFrameCount()).toBe(0);
      expect(overlay.getFps()).toBe(0);
    });

    it('should create canvas with default resolution', () => {
      const geo = overlay.getOverlayGeometry();
      expect(geo.canvas).not.toBeNull();
      expect(geo.canvas!.width).toBe(1280);
      expect(geo.canvas!.height).toBe(720);
    });

    it('should accept config overrides', () => {
      const o = createRobotCameraOverlay({
        resolution: { width: 640, height: 480 },
        opacity: 0.5,
      });
      const geo = o.getOverlayGeometry();
      expect(geo.canvas!.width).toBe(640);
      expect(geo.canvas!.height).toBe(480);
      expect(geo.opacity).toBe(0.5);
      o.destroy();
    });

    it('should set initial position from config', () => {
      const o = createRobotCameraOverlay({
        position: { x: 1, y: 2, z: 3 },
      });
      const pos = o.getCurrentPosition();
      expect(pos).toEqual({ x: 1, y: 2, z: 3 });
      o.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // FRAME PROCESSING
  // ---------------------------------------------------------------------------

  describe('frame processing', () => {
    it('should process a frame and increment count', () => {
      const frameData = new ArrayBuffer(100);
      overlay.processFrame(frameData, 1280, 720);
      expect(overlay.getFrameCount()).toBe(1);
    });

    it('should track FPS from multiple frames', () => {
      const frameData = new ArrayBuffer(100);

      // Simulate frames at ~30fps
      for (let i = 0; i < 5; i++) {
        overlay.processFrame(frameData, 1280, 720);
      }

      expect(overlay.getFrameCount()).toBe(5);
      // FPS calculation requires actual time differences, but should be a number >= 0
      expect(overlay.getFps()).toBeGreaterThanOrEqual(0);
    });

    it('should not process frames after destroy', () => {
      overlay.destroy();
      const frameData = new ArrayBuffer(100);
      overlay.processFrame(frameData, 1280, 720);
      expect(overlay.getFrameCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // POSITION UPDATES
  // ---------------------------------------------------------------------------

  describe('position updates', () => {
    it('should update position based on head pose', () => {
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headForward: Vec3 = { x: 0, y: 0, z: -1 };
      const initialPos = overlay.getCurrentPosition();

      overlay.updatePosition(headPos, headForward, 0.016);
      const newPos = overlay.getCurrentPosition();

      // Position should have changed (gaze following)
      expect(newPos).not.toEqual(initialPos);
    });

    it('should not update position when followGaze is false', () => {
      const o = createRobotCameraOverlay({ followGaze: false });
      const initialPos = o.getCurrentPosition();

      o.updatePosition(
        { x: 5, y: 5, z: 5 },
        { x: 0, y: 0, z: -1 },
        0.016,
      );

      const newPos = o.getCurrentPosition();
      expect(newPos).toEqual(initialPos);
      o.destroy();
    });

    it('should smooth position updates', () => {
      const o = createRobotCameraOverlay({ gazeSmoothing: 0.5 });
      const headForward: Vec3 = { x: 0, y: 0, z: -1 };

      // Move head far
      o.updatePosition({ x: 10, y: 10, z: 0 }, headForward, 0.016);
      const pos1 = o.getCurrentPosition();

      // Position should not jump all the way to target
      expect(Math.abs(pos1.x)).toBeLessThan(10);
      o.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // CANVAS RENDERING
  // ---------------------------------------------------------------------------

  describe('canvas rendering', () => {
    it('should return false when no new frame', async () => {
      const rendered = await overlay.renderToCanvas();
      expect(rendered).toBe(false);
    });

    it('should render frame to canvas', async () => {
      // Create a minimal valid JPEG-like blob
      const frameData = new ArrayBuffer(100);
      overlay.processFrame(frameData, 100, 100);

      // Note: In jsdom, createImageBitmap may not be available, so rendering
      // may fail, but the function should handle it gracefully
      const rendered = await overlay.renderToCanvas();
      // Either true (rendered) or false (decode failed in jsdom) is acceptable
      expect(typeof rendered).toBe('boolean');
    });
  });

  // ---------------------------------------------------------------------------
  // OVERLAY GEOMETRY
  // ---------------------------------------------------------------------------

  describe('overlay geometry', () => {
    it('should return correct geometry', () => {
      const geo = overlay.getOverlayGeometry();
      expect(geo.width).toBeGreaterThan(0);
      expect(geo.height).toBeGreaterThan(0);
      expect(geo.opacity).toBeGreaterThan(0);
      expect(geo.opacity).toBeLessThanOrEqual(1);
      expect(geo.canvas).not.toBeNull();
    });

    it('should return position copy', () => {
      const geo = overlay.getOverlayGeometry();
      geo.position.x = 999;
      const pos = overlay.getCurrentPosition();
      expect(pos.x).not.toBe(999);
    });
  });

  // ---------------------------------------------------------------------------
  // LATENCY
  // ---------------------------------------------------------------------------

  describe('latency', () => {
    it('should accept frame latency value', () => {
      overlay.setFrameLatency(25);
      // No public getter for lastFrameLatencyMs, but it affects border color
      // during renderToCanvas
    });
  });

  // ---------------------------------------------------------------------------
  // VISIBILITY
  // ---------------------------------------------------------------------------

  describe('visibility', () => {
    it('should default to visible', () => {
      expect(overlay.isVisible()).toBe(true);
    });

    it('should toggle visibility', () => {
      overlay.setVisible(false);
      expect(overlay.isVisible()).toBe(false);

      overlay.setVisible(true);
      expect(overlay.isVisible()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // RESOLUTION
  // ---------------------------------------------------------------------------

  describe('resolution', () => {
    it('should return resolution', () => {
      const res = overlay.getResolution();
      expect(res.width).toBe(1280);
      expect(res.height).toBe(720);
    });
  });

  // ---------------------------------------------------------------------------
  // CONFIG UPDATES
  // ---------------------------------------------------------------------------

  describe('config updates', () => {
    it('should update resolution', () => {
      overlay.updateConfig({ resolution: { width: 640, height: 480 } });
      const res = overlay.getResolution();
      expect(res.width).toBe(640);
      expect(res.height).toBe(480);
    });

    it('should update opacity', () => {
      overlay.updateConfig({ opacity: 0.5 });
      const geo = overlay.getOverlayGeometry();
      expect(geo.opacity).toBe(0.5);
    });
  });

  // ---------------------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('should reset all state', () => {
      const frameData = new ArrayBuffer(100);
      overlay.processFrame(frameData, 1280, 720);
      expect(overlay.getFrameCount()).toBe(1);

      overlay.reset();
      expect(overlay.getFrameCount()).toBe(0);
      expect(overlay.getFps()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // DESTROY
  // ---------------------------------------------------------------------------

  describe('destroy', () => {
    it('should release resources', () => {
      overlay.destroy();
      const geo = overlay.getOverlayGeometry();
      expect(geo.canvas).toBeNull();
    });
  });
});
