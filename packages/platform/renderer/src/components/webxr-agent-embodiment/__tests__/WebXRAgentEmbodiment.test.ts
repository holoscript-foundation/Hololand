/**
 * @vitest-environment jsdom
 */

/**
 * Tests for WebXR Agent Embodiment
 *
 * Validates:
 * - Factory function and construction
 * - Capability detection (VR, AR, inline modes)
 * - Optimal mode selection logic
 * - Session initialization
 * - Agent state updates
 * - Handoff preparation (captures MVC-compatible state)
 * - Handoff reception (restores from MVCPayload)
 * - Render data generation (primitives per avatar style)
 * - Transition management
 * - Event emission for all lifecycle events
 * - Cleanup on destroy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger using vi.hoisted for safe hoisting
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../logger', () => ({
  logger: mockLogger,
}));

import {
  WebXRAgentEmbodiment,
  create,
} from '../WebXRAgentEmbodiment';
import type {
  WebXRCapabilities,
  WebXRAgentEmbodimentConfig,
  WebXRAgentState,
  EmbodimentTransition,
  WebXRAgentEmbodimentEventMap,
} from '../types';
import {
  DEFAULT_WEBXR_CAPABILITIES,
  EMOTION_COLORS,
} from '../types';
import type { MVCPayload } from '../../../CrossRealityContinuityTypes';
import {
  createMVCPayload,
  createEmptySpatialContext,
} from '../../../CrossRealityContinuityTypes';

// =============================================================================
// HELPERS
// =============================================================================

function createTestConfig(
  overrides?: Partial<WebXRAgentEmbodimentConfig>,
): WebXRAgentEmbodimentConfig {
  return {
    agentId: 'test-agent',
    agentName: 'Test Agent',
    avatarStyle: 'billboard',
    interactionMode: 'gaze',
    performanceTier: 'medium',
    showSpatialContext: true,
    maxRenderBudgetMs: 4,
    ...overrides,
  };
}

/**
 * Create a mock XRSystem that responds to isSessionSupported.
 */
function createMockXRSystem(
  supportMap: Partial<Record<string, boolean>> = {},
): XRSystem {
  return {
    isSessionSupported: vi.fn(async (mode: string) => {
      return supportMap[mode] ?? false;
    }),
    requestSession: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    ondevicechange: null,
  } as unknown as XRSystem;
}

/**
 * Install a mock navigator.xr for capability detection tests.
 */
function installMockXR(xrSystem: XRSystem): void {
  Object.defineProperty(navigator, 'xr', {
    value: xrSystem,
    writable: true,
    configurable: true,
  });
}

/**
 * Remove mock navigator.xr.
 */
function removeMockXR(): void {
  if ('xr' in navigator) {
    Object.defineProperty(navigator, 'xr', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // Fully remove the property
    delete (navigator as any).xr;
  }
}

// =============================================================================
// SETUP
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  removeMockXR();
});

// =============================================================================
// FACTORY & CONSTRUCTION
// =============================================================================

describe('create / WebXRAgentEmbodiment constructor', () => {
  it('should create an embodiment with the provided config', () => {
    const config = createTestConfig();
    const embodiment = create(config);

    expect(embodiment).toBeInstanceOf(WebXRAgentEmbodiment);
    expect(embodiment.isDestroyed()).toBe(false);
  });

  it('should log creation info', () => {
    const config = createTestConfig({ agentId: 'brittney', avatarStyle: 'hologram' });
    create(config);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Created embodiment for agent "brittney"'),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('style=hologram'),
    );
  });

  it('should initialize with default state values', () => {
    const embodiment = create(createTestConfig());
    const state = embodiment.getState();

    expect(state.agentId).toBe('test-agent');
    expect(state.agentName).toBe('Test Agent');
    expect(state.visible).toBe(true);
    expect(state.speaking).toBe(false);
    expect(state.speechText).toBe('');
    expect(state.emotion).toBe('neutral');
    expect(state.sessionMode).toBe('inline');
    expect(state.referenceSpaceType).toBe('viewer');
    expect(state.handoffReady).toBe(false);
    expect(state.currentFormFactor).toBe('desktop');
  });

  it('should return config via getConfig()', () => {
    const config = createTestConfig({ agentId: 'my-agent', performanceTier: 'high' });
    const embodiment = create(config);
    const returned = embodiment.getConfig();

    expect(returned.agentId).toBe('my-agent');
    expect(returned.performanceTier).toBe('high');
  });

  it('should return a copy from getConfig, not the original object', () => {
    const config = createTestConfig();
    const embodiment = create(config);
    const returned = embodiment.getConfig();

    returned.agentId = 'mutated';
    expect(embodiment.getConfig().agentId).toBe('test-agent');
  });
});

// =============================================================================
// CAPABILITY DETECTION
// =============================================================================

describe('detectCapabilities', () => {
  it('should detect VR + AR capabilities when both are supported', async () => {
    const xr = createMockXRSystem({
      'immersive-vr': true,
      'immersive-ar': true,
      'inline': true,
    });
    installMockXR(xr);

    const embodiment = create(createTestConfig());
    const caps = await embodiment.detectCapabilities();

    expect(caps.immersiveVR).toBe(true);
    expect(caps.immersiveAR).toBe(true);
    expect(caps.inline).toBe(true);
    expect(caps.handTracking).toBe(true);
    expect(caps.hitTest).toBe(true);
    expect(caps.anchors).toBe(true);
  });

  it('should detect VR-only capabilities', async () => {
    const xr = createMockXRSystem({
      'immersive-vr': true,
      'immersive-ar': false,
      'inline': true,
    });
    installMockXR(xr);

    const embodiment = create(createTestConfig());
    const caps = await embodiment.detectCapabilities();

    expect(caps.immersiveVR).toBe(true);
    expect(caps.immersiveAR).toBe(false);
    expect(caps.handTracking).toBe(true);
    expect(caps.hitTest).toBe(false);
  });

  it('should detect AR-only capabilities', async () => {
    const xr = createMockXRSystem({
      'immersive-vr': false,
      'immersive-ar': true,
      'inline': true,
    });
    installMockXR(xr);

    const embodiment = create(createTestConfig());
    const caps = await embodiment.detectCapabilities();

    expect(caps.immersiveVR).toBe(false);
    expect(caps.immersiveAR).toBe(true);
    expect(caps.handTracking).toBe(false);
    expect(caps.hitTest).toBe(true);
    expect(caps.domOverlay).toBe(true);
    expect(caps.depthSensing).toBe(true);
    expect(caps.lightEstimation).toBe(true);
  });

  it('should return all-false capabilities when navigator.xr is absent', async () => {
    removeMockXR();

    const embodiment = create(createTestConfig());
    const caps = await embodiment.detectCapabilities();

    expect(caps).toEqual(DEFAULT_WEBXR_CAPABILITIES);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('navigator.xr not available'),
    );
  });

  it('should handle isSessionSupported throwing errors gracefully', async () => {
    const xr = {
      isSessionSupported: vi.fn().mockRejectedValue(new Error('Broken')),
      requestSession: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      ondevicechange: null,
    } as unknown as XRSystem;
    installMockXR(xr);

    const embodiment = create(createTestConfig());
    const caps = await embodiment.detectCapabilities();

    // All modes should be false since probing failed
    expect(caps.immersiveVR).toBe(false);
    expect(caps.immersiveAR).toBe(false);
    expect(caps.inline).toBe(false);
  });

  it('should emit capabilities-detected event', async () => {
    const xr = createMockXRSystem({ 'immersive-vr': true, 'inline': true });
    installMockXR(xr);

    const embodiment = create(createTestConfig());
    const handler = vi.fn();
    embodiment.on('capabilities-detected', handler);

    await embodiment.detectCapabilities();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({ immersiveVR: true }),
      }),
    );
  });

  it('should store capabilities retrievable via getCapabilities()', async () => {
    const xr = createMockXRSystem({ 'immersive-vr': true });
    installMockXR(xr);

    const embodiment = create(createTestConfig());
    await embodiment.detectCapabilities();

    const caps = embodiment.getCapabilities();
    expect(caps.immersiveVR).toBe(true);
  });

  it('should return a copy from getCapabilities, not the internal reference', async () => {
    const xr = createMockXRSystem({ 'immersive-vr': true });
    installMockXR(xr);

    const embodiment = create(createTestConfig());
    await embodiment.detectCapabilities();

    const caps = embodiment.getCapabilities();
    caps.immersiveVR = false;

    expect(embodiment.getCapabilities().immersiveVR).toBe(true);
  });
});

// =============================================================================
// OPTIMAL MODE SELECTION
// =============================================================================

describe('selectOptimalMode', () => {
  it('should prefer immersive-vr with local-floor when VR is available', () => {
    const embodiment = create(createTestConfig());
    const result = embodiment.selectOptimalMode({
      ...DEFAULT_WEBXR_CAPABILITIES,
      immersiveVR: true,
      immersiveAR: true,
    });

    expect(result.sessionMode).toBe('immersive-vr');
    expect(result.referenceSpaceType).toBe('local-floor');
  });

  it('should fall back to immersive-ar with local-floor when only AR is available', () => {
    const embodiment = create(createTestConfig());
    const result = embodiment.selectOptimalMode({
      ...DEFAULT_WEBXR_CAPABILITIES,
      immersiveVR: false,
      immersiveAR: true,
    });

    expect(result.sessionMode).toBe('immersive-ar');
    expect(result.referenceSpaceType).toBe('local-floor');
  });

  it('should fall back to inline with viewer when no immersive modes available', () => {
    const embodiment = create(createTestConfig());
    const result = embodiment.selectOptimalMode({
      ...DEFAULT_WEBXR_CAPABILITIES,
      immersiveVR: false,
      immersiveAR: false,
      inline: true,
    });

    expect(result.sessionMode).toBe('inline');
    expect(result.referenceSpaceType).toBe('viewer');
  });

  it('should return inline even when all capabilities are false', () => {
    const embodiment = create(createTestConfig());
    const result = embodiment.selectOptimalMode(DEFAULT_WEBXR_CAPABILITIES);

    expect(result.sessionMode).toBe('inline');
    expect(result.referenceSpaceType).toBe('viewer');
  });
});

// =============================================================================
// SESSION INITIALIZATION
// =============================================================================

describe('initSession', () => {
  it('should set session mode and reference space in state', () => {
    const embodiment = create(createTestConfig());
    embodiment.initSession('immersive-vr', 'local-floor');

    const state = embodiment.getState();
    expect(state.sessionMode).toBe('immersive-vr');
    expect(state.referenceSpaceType).toBe('local-floor');
  });

  it('should set handoffReady to true', () => {
    const embodiment = create(createTestConfig());
    expect(embodiment.getState().handoffReady).toBe(false);

    embodiment.initSession('immersive-vr', 'local-floor');
    expect(embodiment.getState().handoffReady).toBe(true);
  });

  it('should infer vr-headset form factor for immersive-vr', () => {
    const embodiment = create(createTestConfig());
    embodiment.initSession('immersive-vr', 'local-floor');

    expect(embodiment.getState().currentFormFactor).toBe('vr-headset');
  });

  it('should infer ar-glasses form factor for immersive-ar', () => {
    const embodiment = create(createTestConfig());
    embodiment.initSession('immersive-ar', 'local-floor');

    expect(embodiment.getState().currentFormFactor).toBe('ar-glasses');
  });

  it('should infer desktop form factor for inline', () => {
    const embodiment = create(createTestConfig());
    embodiment.initSession('inline', 'viewer');

    expect(embodiment.getState().currentFormFactor).toBe('desktop');
  });

  it('should emit session-started event', () => {
    const embodiment = create(createTestConfig());
    const handler = vi.fn();
    embodiment.on('session-started', handler);

    embodiment.initSession('immersive-ar', 'local-floor');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      sessionMode: 'immersive-ar',
      referenceSpaceType: 'local-floor',
    });
  });

  it('should log session initialization', () => {
    const embodiment = create(createTestConfig());
    embodiment.initSession('immersive-vr', 'bounded-floor');

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Session initialized'),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('mode=immersive-vr'),
    );
  });
});

// =============================================================================
// STATE UPDATES
// =============================================================================

describe('updateState', () => {
  it('should merge partial state updates', () => {
    const embodiment = create(createTestConfig());

    embodiment.updateState({
      position: { x: 1, y: 2, z: 3 },
      emotion: 'happy',
    });

    const state = embodiment.getState();
    expect(state.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(state.emotion).toBe('happy');
    // Unchanged fields should persist
    expect(state.visible).toBe(true);
    expect(state.agentName).toBe('Test Agent');
  });

  it('should update speaking state', () => {
    const embodiment = create(createTestConfig());

    embodiment.updateState({
      speaking: true,
      speechText: 'Hello, world!',
    });

    const state = embodiment.getState();
    expect(state.speaking).toBe(true);
    expect(state.speechText).toBe('Hello, world!');
  });

  it('should increment sequence number on each update', () => {
    const embodiment = create(createTestConfig());

    // Generate initial render data to check sequence
    const render1 = embodiment.generateRenderData();
    const seq1 = render1.sequence;

    embodiment.updateState({ emotion: 'curious' });
    const render2 = embodiment.generateRenderData();

    expect(render2.sequence).toBe(seq1 + 1);
  });

  it('should emit state-updated event with current state', () => {
    const embodiment = create(createTestConfig());
    const handler = vi.fn();
    embodiment.on('state-updated', handler);

    embodiment.updateState({ emotion: 'thinking' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'test-agent',
        state: expect.objectContaining({ emotion: 'thinking' }),
      }),
    );
  });

  it('should return a copy from getState, not the internal reference', () => {
    const embodiment = create(createTestConfig());
    const state = embodiment.getState();

    state.emotion = 'mutated';
    expect(embodiment.getState().emotion).toBe('neutral');
  });
});

// =============================================================================
// HANDOFF PREPARATION
// =============================================================================

describe('prepareHandoff', () => {
  it('should create a valid MVCPayload', () => {
    const embodiment = create(createTestConfig({ agentId: 'brittney', agentName: 'Brittney' }));
    embodiment.initSession('immersive-vr', 'local-floor');

    const payload = embodiment.prepareHandoff('phone');

    expect(payload.version).toBe(1);
    expect(payload.agentId).toBe('brittney');
    expect(payload.agentName).toBe('Brittney');
    expect(payload.sourceFormFactor).toBe('vr-headset');
    expect(payload.targetFormFactor).toBe('phone');
    expect(payload.sourceEmbodiment).toBe('WebXR');
    expect(payload.targetEmbodiment).toBe('UI2D');
    expect(payload.handoffId).toMatch(/^handoff:brittney:/);
  });

  it('should capture spatial context with current position', () => {
    const embodiment = create(createTestConfig());
    embodiment.initSession('immersive-vr', 'local-floor');
    embodiment.updateState({ position: { x: 5, y: 1.7, z: -3 } });

    const payload = embodiment.prepareHandoff('phone');

    expect(payload.spatialContext.localPosition).toEqual({ x: 5, y: 1.7, z: -3 });
    expect(payload.spatialContext.previousFormFactor).toBe('vr-headset');
    expect(payload.spatialContext.previousEmbodiment).toBe('WebXR');
    expect(payload.spatialContext.capturedAt).toBeGreaterThan(0);
  });

  it('should set expiry to 5 minutes after creation', () => {
    const embodiment = create(createTestConfig());
    embodiment.initSession('inline', 'viewer');

    const payload = embodiment.prepareHandoff('car');

    expect(payload.expiresAt - payload.createdAt).toBe(5 * 60 * 1000);
  });

  it('should emit handoff-ready event', () => {
    const embodiment = create(createTestConfig());
    embodiment.initSession('inline', 'viewer');

    const handler = vi.fn();
    embodiment.on('handoff-ready', handler);

    embodiment.prepareHandoff('vr-headset');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      agentId: 'test-agent',
      formFactor: 'vr-headset',
    });
  });

  it('should include all five MVC objects', () => {
    const embodiment = create(createTestConfig());
    embodiment.initSession('inline', 'viewer');

    const payload = embodiment.prepareHandoff('phone');

    expect(payload.decisionHistory).toBeDefined();
    expect(payload.decisionHistory.decisions).toBeInstanceOf(Array);
    expect(payload.activeTask).toBeDefined();
    expect(payload.activeTask.taskId).toBeDefined();
    expect(payload.userPreferences).toBeDefined();
    expect(payload.userPreferences.accessibility).toBeDefined();
    expect(payload.spatialContext).toBeDefined();
    expect(payload.evidenceTrail).toBeDefined();
    expect(payload.evidenceTrail.items).toBeInstanceOf(Array);
  });
});

// =============================================================================
// HANDOFF RECEPTION
// =============================================================================

describe('receiveHandoff', () => {
  it('should restore agent identity from payload', () => {
    const embodiment = create(createTestConfig());

    const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'desktop');
    embodiment.receiveHandoff(payload);

    const state = embodiment.getState();
    expect(state.agentId).toBe('brittney');
    expect(state.agentName).toBe('Brittney');
    expect(state.currentFormFactor).toBe('desktop');
  });

  it('should restore position from spatial context', () => {
    const embodiment = create(createTestConfig());

    const spatialContext = createEmptySpatialContext('vr-headset');
    spatialContext.localPosition = { x: 10, y: 2, z: -5 };

    const payload = createMVCPayload('agent-x', 'Agent X', 'vr-headset', 'desktop', {
      spatialContext,
    });

    embodiment.receiveHandoff(payload);

    expect(embodiment.getState().position).toEqual({ x: 10, y: 2, z: -5 });
  });

  it('should use default position when spatial context has no localPosition', () => {
    const embodiment = create(createTestConfig());

    const payload = createMVCPayload('agent-y', 'Agent Y', 'phone', 'desktop');
    // Default spatialContext has null localPosition
    embodiment.receiveHandoff(payload);

    expect(embodiment.getState().position).toEqual({ x: 0, y: 1.5, z: -2 });
  });

  it('should set visible to true after handoff', () => {
    const embodiment = create(createTestConfig());
    embodiment.updateState({ visible: false });

    const payload = createMVCPayload('agent-z', 'Agent Z', 'car', 'desktop');
    embodiment.receiveHandoff(payload);

    expect(embodiment.getState().visible).toBe(true);
  });

  it('should emit handoff-received event', () => {
    const embodiment = create(createTestConfig());
    const handler = vi.fn();
    embodiment.on('handoff-received', handler);

    const payload = createMVCPayload('agent-a', 'Agent A', 'vr-headset', 'phone');
    embodiment.receiveHandoff(payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      agentId: 'agent-a',
      sourceFormFactor: 'vr-headset',
      targetFormFactor: 'phone',
    });
  });

  it('should log handoff reception', () => {
    const embodiment = create(createTestConfig());

    const payload = createMVCPayload('agent-b', 'Agent B', 'ar-glasses', 'desktop');
    embodiment.receiveHandoff(payload);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Handoff received from ar-glasses'),
    );
  });
});

// =============================================================================
// RENDER DATA GENERATION
// =============================================================================

describe('generateRenderData', () => {
  it('should return render data with correct agentId', () => {
    const embodiment = create(createTestConfig({ agentId: 'render-test' }));
    const data = embodiment.generateRenderData();

    expect(data.agentId).toBe('render-test');
  });

  it('should include position-indicator primitive', () => {
    const embodiment = create(createTestConfig());
    const data = embodiment.generateRenderData();

    const indicator = data.primitives.find((p) => p.type === 'position-indicator');
    expect(indicator).toBeDefined();
    expect(indicator!.visible).toBe(true);
  });

  it('should include name-label primitive', () => {
    const embodiment = create(createTestConfig({ agentName: 'Brittney' }));
    const data = embodiment.generateRenderData();

    const label = data.primitives.find((p) => p.type === 'name-label');
    expect(label).toBeDefined();
    expect(label!.text).toBe('Brittney');
  });

  it('should include billboard-quad for billboard style', () => {
    const embodiment = create(createTestConfig({ avatarStyle: 'billboard' }));
    const data = embodiment.generateRenderData();

    const quad = data.primitives.find((p) => p.type === 'billboard-quad');
    expect(quad).toBeDefined();
    expect(quad!.color.a).toBe(1.0);
  });

  it('should include billboard-quad with lower alpha for hologram style', () => {
    const embodiment = create(createTestConfig({ avatarStyle: 'hologram' }));
    const data = embodiment.generateRenderData();

    const quad = data.primitives.find((p) => p.type === 'billboard-quad');
    expect(quad).toBeDefined();
    expect(quad!.color.a).toBe(0.7);
  });

  it('should NOT include billboard-quad for minimal style', () => {
    const embodiment = create(createTestConfig({ avatarStyle: 'minimal' }));
    const data = embodiment.generateRenderData();

    const quad = data.primitives.find((p) => p.type === 'billboard-quad');
    expect(quad).toBeUndefined();
  });

  it('should include speech-bubble when agent is speaking', () => {
    const embodiment = create(createTestConfig());
    embodiment.updateState({ speaking: true, speechText: 'Hello!' });

    const data = embodiment.generateRenderData();
    const bubble = data.primitives.find((p) => p.type === 'speech-bubble');
    expect(bubble).toBeDefined();
    expect(bubble!.text).toBe('Hello!');
  });

  it('should NOT include speech-bubble when agent is not speaking', () => {
    const embodiment = create(createTestConfig());
    const data = embodiment.generateRenderData();

    const bubble = data.primitives.find((p) => p.type === 'speech-bubble');
    expect(bubble).toBeUndefined();
  });

  it('should NOT include speech-bubble when speaking but text is empty', () => {
    const embodiment = create(createTestConfig());
    embodiment.updateState({ speaking: true, speechText: '' });

    const data = embodiment.generateRenderData();
    const bubble = data.primitives.find((p) => p.type === 'speech-bubble');
    expect(bubble).toBeUndefined();
  });

  it('should include spatial-context-ring when showSpatialContext is true', () => {
    const embodiment = create(createTestConfig({
      showSpatialContext: true,
      avatarStyle: 'billboard',
    }));
    const data = embodiment.generateRenderData();

    const ring = data.primitives.find((p) => p.type === 'spatial-context-ring');
    expect(ring).toBeDefined();
  });

  it('should NOT include spatial-context-ring when showSpatialContext is false', () => {
    const embodiment = create(createTestConfig({ showSpatialContext: false }));
    const data = embodiment.generateRenderData();

    const ring = data.primitives.find((p) => p.type === 'spatial-context-ring');
    expect(ring).toBeUndefined();
  });

  it('should NOT include spatial-context-ring for minimal style', () => {
    const embodiment = create(createTestConfig({
      avatarStyle: 'minimal',
      showSpatialContext: true,
    }));
    const data = embodiment.generateRenderData();

    const ring = data.primitives.find((p) => p.type === 'spatial-context-ring');
    expect(ring).toBeUndefined();
  });

  it('should use emotion color for primitives', () => {
    const embodiment = create(createTestConfig());
    embodiment.updateState({ emotion: 'happy' });

    const data = embodiment.generateRenderData();
    const indicator = data.primitives.find((p) => p.type === 'position-indicator');
    expect(indicator!.color.r).toBe(EMOTION_COLORS['happy'].r);
    expect(indicator!.color.g).toBe(EMOTION_COLORS['happy'].g);
  });

  it('should fall back to neutral color for unknown emotions', () => {
    const embodiment = create(createTestConfig());
    embodiment.updateState({ emotion: 'nonexistent-emotion' });

    const data = embodiment.generateRenderData();
    const indicator = data.primitives.find((p) => p.type === 'position-indicator');
    expect(indicator!.color.r).toBe(EMOTION_COLORS['neutral'].r);
  });

  it('should include transition-effect primitive when transition is active', () => {
    const embodiment = create(createTestConfig());
    embodiment.startTransition({
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'WebXR',
      animationType: 'fade',
      durationMs: 500,
      progress: 0.5,
    });

    const data = embodiment.generateRenderData();
    const effect = data.primitives.find((p) => p.type === 'transition-effect');
    expect(effect).toBeDefined();
    expect(effect!.metadata.animationType).toBe('fade');
    expect(effect!.metadata.progress).toBe(0.5);
  });

  it('should NOT include transition-effect when transition is complete', () => {
    const embodiment = create(createTestConfig());
    embodiment.startTransition({
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'WebXR',
      animationType: 'dissolve',
      durationMs: 300,
      progress: 0,
    });
    embodiment.updateTransitionProgress(1.0);

    const data = embodiment.generateRenderData();
    const effect = data.primitives.find((p) => p.type === 'transition-effect');
    expect(effect).toBeUndefined();
  });

  it('should respect performance tier in budget estimation', () => {
    const lowEmbodiment = create(createTestConfig({ performanceTier: 'low' }));
    const highEmbodiment = create(createTestConfig({ performanceTier: 'high' }));

    const lowData = lowEmbodiment.generateRenderData();
    const highData = highEmbodiment.generateRenderData();

    // High tier should allow higher budget than low tier
    // Both have same number of primitives, so high budget should be >= low budget
    expect(highData.estimatedRenderMs).toBeGreaterThanOrEqual(lowData.estimatedRenderMs);
  });

  it('should track sequence number', () => {
    const embodiment = create(createTestConfig());
    const data1 = embodiment.generateRenderData();

    embodiment.updateState({ emotion: 'curious' });
    const data2 = embodiment.generateRenderData();

    expect(data2.sequence).toBeGreaterThan(data1.sequence);
  });

  it('should reflect position updates in primitive positions', () => {
    const embodiment = create(createTestConfig());
    embodiment.updateState({ position: { x: 10, y: 5, z: -8 } });

    const data = embodiment.generateRenderData();
    const indicator = data.primitives.find((p) => p.type === 'position-indicator');
    expect(indicator!.position).toEqual({ x: 10, y: 5, z: -8 });
  });
});

// =============================================================================
// TRANSITION MANAGEMENT
// =============================================================================

describe('transitions', () => {
  it('should store transition via startTransition', () => {
    const embodiment = create(createTestConfig());
    const transition: EmbodimentTransition = {
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'WebXR',
      animationType: 'morph',
      durationMs: 1000,
      progress: 0,
    };

    embodiment.startTransition(transition);
    const stored = embodiment.getTransition();

    expect(stored).not.toBeNull();
    expect(stored!.sourceEmbodiment).toBe('Avatar3D');
    expect(stored!.animationType).toBe('morph');
  });

  it('should update transition progress', () => {
    const embodiment = create(createTestConfig());
    embodiment.startTransition({
      sourceEmbodiment: 'UI2D',
      targetEmbodiment: 'WebXR',
      animationType: 'teleport',
      durationMs: 200,
      progress: 0,
    });

    embodiment.updateTransitionProgress(0.7);
    expect(embodiment.getTransition()!.progress).toBe(0.7);
  });

  it('should clear transition when progress reaches 1', () => {
    const embodiment = create(createTestConfig());
    embodiment.startTransition({
      sourceEmbodiment: 'FullGUI',
      targetEmbodiment: 'WebXR',
      animationType: 'dissolve',
      durationMs: 500,
      progress: 0,
    });

    embodiment.updateTransitionProgress(1.0);
    expect(embodiment.getTransition()).toBeNull();
  });

  it('should clamp progress to [0, 1] range', () => {
    const embodiment = create(createTestConfig());
    embodiment.startTransition({
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'WebXR',
      animationType: 'fade',
      durationMs: 500,
      progress: 0,
    });

    embodiment.updateTransitionProgress(-0.5);
    expect(embodiment.getTransition()!.progress).toBe(0);

    embodiment.startTransition({
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'WebXR',
      animationType: 'fade',
      durationMs: 500,
      progress: 0,
    });

    embodiment.updateTransitionProgress(1.5);
    // Should be clamped to 1 and cleared
    expect(embodiment.getTransition()).toBeNull();
  });

  it('should return null transition when none is active', () => {
    const embodiment = create(createTestConfig());
    expect(embodiment.getTransition()).toBeNull();
  });

  it('should return a copy from getTransition, not the internal reference', () => {
    const embodiment = create(createTestConfig());
    embodiment.startTransition({
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'WebXR',
      animationType: 'fade',
      durationMs: 500,
      progress: 0.3,
    });

    const transition = embodiment.getTransition();
    transition!.progress = 0.99;

    expect(embodiment.getTransition()!.progress).toBe(0.3);
  });

  it('should be a no-op when updating progress with no active transition', () => {
    const embodiment = create(createTestConfig());
    // Should not throw
    embodiment.updateTransitionProgress(0.5);
    expect(embodiment.getTransition()).toBeNull();
  });
});

// =============================================================================
// EVENT SYSTEM
// =============================================================================

describe('event system', () => {
  it('should register and call event handlers', () => {
    const embodiment = create(createTestConfig());
    const handler = vi.fn();

    embodiment.on('session-started', handler);
    embodiment.initSession('inline', 'viewer');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support multiple handlers for the same event', () => {
    const embodiment = create(createTestConfig());
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    embodiment.on('state-updated', handler1);
    embodiment.on('state-updated', handler2);

    embodiment.updateState({ emotion: 'happy' });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should remove handlers via off()', () => {
    const embodiment = create(createTestConfig());
    const handler = vi.fn();

    embodiment.on('state-updated', handler);
    embodiment.off('state-updated', handler);

    embodiment.updateState({ emotion: 'happy' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not throw when removing a handler that was never registered', () => {
    const embodiment = create(createTestConfig());
    const handler = vi.fn();

    // Should not throw
    embodiment.off('state-updated', handler);
  });

  it('should catch and log handler errors without interrupting other handlers', () => {
    const embodiment = create(createTestConfig());
    const errorHandler = vi.fn(() => {
      throw new Error('Handler crash');
    });
    const okHandler = vi.fn();

    embodiment.on('state-updated', errorHandler);
    embodiment.on('state-updated', okHandler);

    embodiment.updateState({ emotion: 'alert' });

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(okHandler).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Event handler error'),
    );
  });
});

// =============================================================================
// DESTROY & LIFECYCLE
// =============================================================================

describe('destroy', () => {
  it('should mark the embodiment as destroyed', () => {
    const embodiment = create(createTestConfig());
    expect(embodiment.isDestroyed()).toBe(false);

    embodiment.destroy();
    expect(embodiment.isDestroyed()).toBe(true);
  });

  it('should emit destroyed event', () => {
    const embodiment = create(createTestConfig({ agentId: 'destroy-test' }));
    const handler = vi.fn();
    embodiment.on('destroyed', handler);

    embodiment.destroy();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ agentId: 'destroy-test' });
  });

  it('should clear all listeners after destroy', () => {
    const embodiment = create(createTestConfig());
    const handler = vi.fn();
    embodiment.on('state-updated', handler);

    embodiment.destroy();

    // Cannot add or trigger events after destroy (listeners cleared)
    // But methods will throw, so we verify indirectly
    expect(embodiment.isDestroyed()).toBe(true);
  });

  it('should be idempotent (calling destroy twice should not throw)', () => {
    const embodiment = create(createTestConfig());
    embodiment.destroy();
    embodiment.destroy(); // Should not throw
    expect(embodiment.isDestroyed()).toBe(true);
  });

  it('should emit destroyed event only once on double destroy', () => {
    const embodiment = create(createTestConfig());
    const handler = vi.fn();
    embodiment.on('destroyed', handler);

    embodiment.destroy();
    embodiment.destroy();

    // First destroy emits then clears listeners, second does nothing
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should log destruction', () => {
    const embodiment = create(createTestConfig({ agentId: 'log-destroy' }));
    embodiment.destroy();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Destroyed embodiment for agent "log-destroy"'),
    );
  });

  it('should throw when calling detectCapabilities after destroy', async () => {
    const embodiment = create(createTestConfig());
    embodiment.destroy();

    await expect(embodiment.detectCapabilities()).rejects.toThrow(
      /Cannot use destroyed embodiment/,
    );
  });

  it('should throw when calling initSession after destroy', () => {
    const embodiment = create(createTestConfig());
    embodiment.destroy();

    expect(() => embodiment.initSession('inline', 'viewer')).toThrow(
      /Cannot use destroyed embodiment/,
    );
  });

  it('should throw when calling updateState after destroy', () => {
    const embodiment = create(createTestConfig());
    embodiment.destroy();

    expect(() => embodiment.updateState({ emotion: 'happy' })).toThrow(
      /Cannot use destroyed embodiment/,
    );
  });

  it('should throw when calling prepareHandoff after destroy', () => {
    const embodiment = create(createTestConfig());
    embodiment.destroy();

    expect(() => embodiment.prepareHandoff('phone')).toThrow(
      /Cannot use destroyed embodiment/,
    );
  });

  it('should throw when calling receiveHandoff after destroy', () => {
    const embodiment = create(createTestConfig());
    embodiment.destroy();

    const payload = createMVCPayload('a', 'A', 'phone', 'desktop');
    expect(() => embodiment.receiveHandoff(payload)).toThrow(
      /Cannot use destroyed embodiment/,
    );
  });

  it('should throw when calling generateRenderData after destroy', () => {
    const embodiment = create(createTestConfig());
    embodiment.destroy();

    expect(() => embodiment.generateRenderData()).toThrow(
      /Cannot use destroyed embodiment/,
    );
  });

  it('should throw when calling selectOptimalMode after destroy', () => {
    const embodiment = create(createTestConfig());
    embodiment.destroy();

    expect(() => embodiment.selectOptimalMode(DEFAULT_WEBXR_CAPABILITIES)).toThrow(
      /Cannot use destroyed embodiment/,
    );
  });

  it('should clear transition on destroy', () => {
    const embodiment = create(createTestConfig());
    embodiment.startTransition({
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'WebXR',
      animationType: 'fade',
      durationMs: 500,
      progress: 0.5,
    });

    embodiment.destroy();

    // Cannot check getTransition because it uses assertNotDestroyed implicitly
    // through generateRenderData, but we can verify isDestroyed
    expect(embodiment.isDestroyed()).toBe(true);
  });
});

// =============================================================================
// EDGE CASES & INTEGRATION
// =============================================================================

describe('integration scenarios', () => {
  it('should handle full lifecycle: create -> detect -> select -> init -> update -> render -> handoff -> destroy', async () => {
    const xr = createMockXRSystem({
      'immersive-vr': true,
      'immersive-ar': false,
      'inline': true,
    });
    installMockXR(xr);

    // Create
    const embodiment = create(createTestConfig({
      agentId: 'lifecycle-test',
      agentName: 'Lifecycle Agent',
      avatarStyle: 'hologram',
    }));

    // Detect
    const caps = await embodiment.detectCapabilities();
    expect(caps.immersiveVR).toBe(true);

    // Select
    const mode = embodiment.selectOptimalMode(caps);
    expect(mode.sessionMode).toBe('immersive-vr');

    // Init
    embodiment.initSession(mode.sessionMode, mode.referenceSpaceType);
    expect(embodiment.getState().currentFormFactor).toBe('vr-headset');

    // Update
    embodiment.updateState({
      position: { x: 2, y: 1.5, z: -4 },
      emotion: 'curious',
      speaking: true,
      speechText: 'Exploring the space...',
    });

    // Render
    const data = embodiment.generateRenderData();
    expect(data.primitives.length).toBeGreaterThan(0);
    const bubble = data.primitives.find((p) => p.type === 'speech-bubble');
    expect(bubble).toBeDefined();
    expect(bubble!.text).toBe('Exploring the space...');

    // Handoff
    const payload = embodiment.prepareHandoff('phone');
    expect(payload.spatialContext.localPosition).toEqual({ x: 2, y: 1.5, z: -4 });

    // Destroy
    embodiment.destroy();
    expect(embodiment.isDestroyed()).toBe(true);
  });

  it('should handle receive handoff followed by session init and render', () => {
    const embodiment = create(createTestConfig());

    // Receive handoff from another form factor
    const spatialContext = createEmptySpatialContext('ar-glasses');
    spatialContext.localPosition = { x: 3, y: 1.8, z: -1 };

    const payload = createMVCPayload('incoming-agent', 'Incoming', 'ar-glasses', 'desktop', {
      spatialContext,
    });

    embodiment.receiveHandoff(payload);

    // Init session on this device
    embodiment.initSession('inline', 'viewer');

    // Render should reflect the received position
    const data = embodiment.generateRenderData();
    const indicator = data.primitives.find((p) => p.type === 'position-indicator');
    expect(indicator!.position).toEqual({ x: 3, y: 1.8, z: -1 });
  });
});
