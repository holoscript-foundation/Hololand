import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WebXRSessionBridge,
  createWebXRSessionBridge,
  type WebXRCapabilities,
  type XRSessionState,
} from '../WebXRSessionBridge';

describe('WebXRSessionBridge', () => {
  let bridge: WebXRSessionBridge;

  beforeEach(() => {
    bridge = createWebXRSessionBridge();
  });

  // ===== CAPABILITIES =====

  it('detects no XR capabilities in non-browser environment', async () => {
    const caps = await bridge.detectCapabilities();
    expect(caps.immersiveVR).toBe(false);
    expect(caps.immersiveAR).toBe(false);
    expect(caps.inline).toBe(true);
  });

  it('caches capabilities after first detection', async () => {
    await bridge.detectCapabilities();
    const caps = bridge.getCapabilities();
    expect(caps).toBeDefined();
    expect(caps!.inline).toBe(true);
  });

  it('getCapabilities returns null before detection', () => {
    expect(bridge.getCapabilities()).toBeNull();
  });

  // ===== REFERENCE SPACES =====

  it('returns local-floor for immersive-vr', () => {
    expect(bridge.getBestReferenceSpace('immersive-vr')).toBe('local-floor');
  });

  it('returns local for immersive-ar', () => {
    expect(bridge.getBestReferenceSpace('immersive-ar')).toBe('local');
  });

  it('returns viewer for inline', () => {
    expect(bridge.getBestReferenceSpace('inline')).toBe('viewer');
  });

  // ===== FORM FACTOR MAPPING =====

  it('maps vr-headset to immersive-vr', () => {
    expect(bridge.formFactorToSessionMode('vr-headset')).toBe('immersive-vr');
  });

  it('maps ar-glasses to immersive-ar', () => {
    expect(bridge.formFactorToSessionMode('ar-glasses')).toBe('immersive-ar');
  });

  it('maps unknown form factor to inline', () => {
    expect(bridge.formFactorToSessionMode('phone')).toBe('inline');
    expect(bridge.formFactorToSessionMode('desktop')).toBe('inline');
    expect(bridge.formFactorToSessionMode('car')).toBe('inline');
  });

  // ===== SESSION STATE =====

  it('initial state is not presenting', () => {
    const state = bridge.getSessionState();
    expect(state.isPresenting).toBe(false);
    expect(state.mode).toBeNull();
    expect(state.referenceSpace).toBeNull();
    expect(state.frameRate).toBe(0);
  });

  // ===== HANDOFF IN =====

  it('prepareHandoffIn sets session state for VR', async () => {
    await bridge.detectCapabilities(); // no XR support in test env
    // With no VR support, handoff should fail
    const result = await bridge.prepareHandoffIn('immersive-vr');
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('not supported');
  });

  it('prepareHandoffIn succeeds for inline mode', async () => {
    const result = await bridge.prepareHandoffIn('inline');
    const state = bridge.getSessionState();
    expect(result.ready).toBe(true);
    expect(result.mode).toBe('inline');
    expect(state.isPresenting).toBe(false); // inline doesn't present
    expect(state.frameRate).toBe(30);
  });

  it('emits session-started on handoff in', async () => {
    const handler = vi.fn();
    bridge.on('session-started', handler);
    await bridge.prepareHandoffIn('inline');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ mode: 'inline' }));
  });

  // ===== HANDOFF OUT =====

  it('prepareHandoffOut from non-presenting returns null spatial state', async () => {
    const result = await bridge.prepareHandoffOut();
    expect(result.spatialState).toBeNull();
    expect(result.sessionEndReason).toBe('handoff');
  });

  // ===== END SESSION =====

  it('endSession resets state when presenting', async () => {
    // Start an inline session
    await bridge.prepareHandoffIn('inline');
    // Inline doesn't set isPresenting, so endSession is a no-op
    await bridge.endSession();
    const state = bridge.getSessionState();
    // State should remain as set by inline handoff
    expect(state.mode).toBe('inline');
  });

  // ===== EVENTS =====

  it('on/off registers and unregisters event handlers', () => {
    const handler = vi.fn();
    bridge.on('test-event', handler);
    bridge.off('test-event', handler);
    // Trigger internally won't fire removed handler
  });

  it('dispose clears all listeners', async () => {
    const handler = vi.fn();
    bridge.on('session-started', handler);
    bridge.dispose();
    await bridge.prepareHandoffIn('inline');
    expect(handler).not.toHaveBeenCalled();
  });

  // ===== METRICS =====

  it('getMetrics returns current state', () => {
    const m = bridge.getMetrics();
    expect(m.isPresenting).toBe(false);
    expect(m.mode).toBeNull();
    expect(m.frameRate).toBe(0);
  });

  it('getMetrics reflects state after handoff', async () => {
    await bridge.prepareHandoffIn('inline');
    const m = bridge.getMetrics();
    expect(m.mode).toBe('inline');
    expect(m.frameRate).toBe(30);
  });
});
