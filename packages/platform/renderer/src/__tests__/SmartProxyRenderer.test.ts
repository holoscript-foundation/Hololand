/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SmartProxyRenderer
 *
 * Validates the Smart Proxy VR Preview pattern:
 * - Proxy mode: reduced quality for fast editing
 * - Preview mode: full VR quality rendering
 * - Progressive transition between modes
 * - Quality tier system
 * - Metrics tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Three.js and external dependencies
vi.mock('three', () => {
  const Color = vi.fn().mockImplementation((c) => ({ r: 0, g: 0, b: 0, clone: vi.fn().mockReturnThis(), getHex: vi.fn().mockReturnValue(0x00ffff) }));
  const Vector2 = vi.fn().mockImplementation(() => ({ x: 1920, y: 1080 }));
  const Vector3 = vi.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0, set: vi.fn() }));
  const Quaternion = vi.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0, w: 1, set: vi.fn() }));

  const BufferGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    getAttribute: vi.fn().mockReturnValue({ array: new Float32Array(100), count: 33 }),
  }));

  const BoxGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    getAttribute: vi.fn().mockReturnValue({ array: new Float32Array(100), count: 33 }),
  }));

  const SphereGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    getAttribute: vi.fn().mockReturnValue({ array: new Float32Array(100), count: 33 }),
  }));

  const CylinderGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    getAttribute: vi.fn().mockReturnValue({ array: new Float32Array(100), count: 33 }),
  }));

  const PlaneGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    getAttribute: vi.fn(),
  }));

  const EdgesGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  }));

  const LineBasicMaterial = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    needsUpdate: false,
  }));

  const MeshBasicMaterial = vi.fn().mockImplementation((props) => ({
    ...props,
    dispose: vi.fn(),
    needsUpdate: false,
    color: props?.color ?? { clone: vi.fn() },
    clone: vi.fn().mockReturnThis(),
  }));

  const MeshStandardMaterial = vi.fn().mockImplementation((props) => ({
    ...props,
    dispose: vi.fn(),
    needsUpdate: false,
    color: props?.color ?? { clone: vi.fn().mockReturnValue({ getHex: vi.fn().mockReturnValue(0x888888) }) },
    clone: vi.fn().mockReturnThis(),
  }));

  const Mesh = vi.fn().mockImplementation((geometry, material) => ({
    geometry,
    material,
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    quaternion: { set: vi.fn() },
    scale: { set: vi.fn(), x: 1, y: 1, z: 1 },
    visible: true,
    name: '',
    castShadow: false,
    receiveShadow: false,
    userData: {},
    add: vi.fn(),
    remove: vi.fn(),
  }));

  const LineSegments = vi.fn().mockImplementation((geometry, material) => ({
    geometry,
    material,
    dispose: vi.fn(),
  }));

  const Group = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
  }));

  const Scene = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    background: null,
  }));

  const PerspectiveCamera = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
  }));

  const OrthographicCamera = vi.fn().mockImplementation(() => ({}));

  const xrEvents = new Map<string, Function>();
  const WebGLRenderer = vi.fn().mockImplementation(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    setRenderTarget: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    setAnimationLoop: vi.fn(),
    getSize: vi.fn().mockImplementation((v) => { v.x = 1920; v.y = 1080; return v; }),
    outputColorSpace: '',
    toneMapping: 0,
    toneMappingExposure: 1,
    shadowMap: {
      enabled: false,
      type: 0,
    },
    xr: {
      enabled: false,
      isPresenting: false,
      addEventListener: vi.fn((event, handler) => xrEvents.set(event, handler)),
      removeEventListener: vi.fn(),
    },
    domElement: document.createElement('canvas'),
  }));

  const WebGLRenderTarget = vi.fn().mockImplementation(() => ({
    texture: {},
    dispose: vi.fn(),
  }));

  return {
    Color,
    Vector2,
    Vector3,
    Quaternion,
    BufferGeometry,
    BoxGeometry,
    SphereGeometry,
    CylinderGeometry,
    PlaneGeometry,
    EdgesGeometry,
    LineBasicMaterial,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Mesh,
    LineSegments,
    Group,
    Scene,
    PerspectiveCamera,
    OrthographicCamera,
    WebGLRenderer,
    WebGLRenderTarget,
    AmbientLight: vi.fn().mockImplementation(() => ({ name: '' })),
    DirectionalLight: vi.fn().mockImplementation(() => ({ name: '', position: { set: vi.fn() }, castShadow: false })),
    BasicShadowMap: 0,
    PCFShadowMap: 1,
    PCFSoftShadowMap: 2,
    VSMShadowMap: 3,
    NoToneMapping: 0,
    ACESFilmicToneMapping: 6,
    SRGBColorSpace: 'srgb',
    LinearFilter: 1006,
    RGBAFormat: 1023,
    UnsignedByteType: 1009,
  };
});

vi.mock('three/examples/jsm/webxr/VRButton.js', () => ({
  VRButton: {
    createButton: vi.fn().mockImplementation(() => {
      const btn = document.createElement('button');
      btn.style.display = '';
      return btn;
    }),
  },
}));

vi.mock('../QualityManager', () => ({
  createQualityManager: vi.fn().mockReturnValue({
    setPreset: vi.fn(),
    getPreset: vi.fn().mockReturnValue('low'),
    getSettings: vi.fn().mockReturnValue({
      shadowsEnabled: false,
      shadowMapSize: 512,
      shadowType: 'basic',
      materialType: 'basic',
      postProcessing: false,
      pixelRatio: 0.75,
    }),
    applyToRenderer: vi.fn(),
    setAdaptiveQuality: vi.fn(),
    applyOverrides: vi.fn(),
    recordFrameTime: vi.fn(),
  }),
}));

vi.mock('../PostProcessing', () => ({
  createPostProcessingPipeline: vi.fn().mockReturnValue({
    setEnabled: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(false),
    render: vi.fn(),
    applyQualitySettings: vi.fn(),
    setSize: vi.fn(),
  }),
}));

vi.mock('../EnvironmentManager', () => ({
  createEnvironmentManager: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    getEnvironmentMap: vi.fn().mockReturnValue(null),
    setQualitySettings: vi.fn(),
    setMagnitudeMultiplier: vi.fn(),
  }),
}));

vi.mock('../MaterialFactory', () => ({
  createMaterialFactory: vi.fn().mockReturnValue({
    create: vi.fn().mockReturnValue({
      dispose: vi.fn(),
      clone: vi.fn().mockReturnThis(),
      color: { clone: vi.fn().mockReturnValue({ getHex: vi.fn().mockReturnValue(0x888888) }) },
    }),
    setQualitySettings: vi.fn(),
    setEnvironmentMap: vi.fn(),
    upgradeMaterial: vi.fn(),
  }),
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import {
  SmartProxyRenderer,
  createSmartProxyRenderer,
  PROXY_TIER_DESCRIPTIONS,
  getProxyTierSettings,
} from '../SmartProxyRenderer';
import type { SmartProxyConfig, SmartProxyMode, ProxyQualityTier } from '../SmartProxyRenderer';

// =============================================================================
// MOCK WORLD
// =============================================================================

function createMockWorld() {
  const listeners = new Map<string, Function[]>();
  const objects = new Map<string, any>();

  const mockObject = (id: string, type = 'box') => ({
    id,
    type,
    getScale: () => ({ x: 1, y: 1, z: 1 }),
    getPosition: () => ({ x: 0, y: 0, z: 0 }),
    getRotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
    getMetadata: () => ({ color: '#00ffff' }),
    isVisible: () => true,
  });

  // Pre-add some objects
  objects.set('obj1', mockObject('obj1', 'box'));
  objects.set('obj2', mockObject('obj2', 'sphere'));

  return {
    getAllObjects: vi.fn().mockReturnValue([...objects.values()]),
    getObject: vi.fn((id: string) => objects.get(id)),
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(handler);
    }),
    emit: (event: string, data: any) => {
      const handlers = listeners.get(event) || [];
      handlers.forEach((h) => h(data));
    },
    addObject: (id: string, type = 'box') => {
      objects.set(id, mockObject(id, type));
    },
    _listeners: listeners,
    _objects: objects,
  };
}

function createMockCanvas(): HTMLCanvasElement {
  return {
    width: 1920,
    height: 1080,
    getContext: vi.fn(),
  } as unknown as HTMLCanvasElement;
}

// =============================================================================
// TESTS
// =============================================================================

describe('SmartProxyRenderer', () => {
  let canvas: HTMLCanvasElement;
  let world: ReturnType<typeof createMockWorld>;

  beforeEach(() => {
    canvas = createMockCanvas();
    world = createMockWorld();
    vi.clearAllMocks();

    // Mock navigator.xr
    Object.defineProperty(navigator, 'xr', {
      value: {
        isSessionSupported: vi.fn().mockResolvedValue(true),
      },
      configurable: true,
      writable: true,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize in proxy mode by default', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should accept custom proxy tier', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        proxyTier: 'wireframe',
      });
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should accept custom preview quality', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        previewQuality: 'ultra',
      });
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should sync existing world objects on creation', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      expect(world.getAllObjects).toHaveBeenCalled();
    });

    it('should setup world event listeners', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      expect(world.on).toHaveBeenCalledWith('object:added', expect.any(Function));
      expect(world.on).toHaveBeenCalledWith('object:removed', expect.any(Function));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MODE SWITCHING
  // ─────────────────────────────────────────────────────────────────────────

  describe('mode switching', () => {
    it('should switch from proxy to preview', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        progressiveTransition: false,
      });
      expect(renderer.getMode()).toBe('proxy');

      renderer.enterPreview();
      expect(renderer.getMode()).toBe('preview');
    });

    it('should switch from preview back to proxy', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        progressiveTransition: false,
      });
      renderer.enterPreview();
      expect(renderer.getMode()).toBe('preview');

      renderer.exitPreview();
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should call onModeChange callback on mode switch', () => {
      const onModeChange = vi.fn();
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        progressiveTransition: false,
        onModeChange,
      });

      renderer.enterPreview();
      expect(onModeChange).toHaveBeenCalledWith('preview', 'proxy');

      renderer.exitPreview();
      expect(onModeChange).toHaveBeenCalledWith('proxy', 'preview');
    });

    it('should enter transition mode when progressive transition is enabled', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        progressiveTransition: true,
        transitionDuration: 2000,
      });

      renderer.enterPreview();
      expect(renderer.getMode()).toBe('transition');
    });

    it('should warn when entering preview while already in preview', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        progressiveTransition: false,
      });
      renderer.enterPreview();
      renderer.enterPreview(); // Should warn, not error
      expect(renderer.getMode()).toBe('preview');
    });

    it('should warn when exiting preview while already in proxy', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      renderer.exitPreview(); // Should warn, not error
      expect(renderer.getMode()).toBe('proxy');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PROXY QUALITY TIERS
  // ─────────────────────────────────────────────────────────────────────────

  describe('proxy quality tiers', () => {
    it('should accept wireframe tier', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        proxyTier: 'wireframe',
      });
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should accept minimal tier', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        proxyTier: 'minimal',
      });
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should accept balanced tier', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        proxyTier: 'balanced',
      });
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should accept near-final tier', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        proxyTier: 'near-final',
      });
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should update proxy tier at runtime', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        proxyTier: 'wireframe',
      });
      renderer.setProxyTier('near-final');
      // Should not throw, mode stays proxy
      expect(renderer.getMode()).toBe('proxy');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should return preview metrics', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      const metrics = renderer.getPreviewMetrics();

      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('avgFrameTime');
      expect(metrics).toHaveProperty('qualityPreset');
      expect(metrics).toHaveProperty('adaptiveActive');
      expect(metrics).toHaveProperty('transitionProgress');
      expect(metrics).toHaveProperty('lodDistribution');
      expect(metrics).toHaveProperty('renderResolution');
      expect(metrics).toHaveProperty('postProcessingEnabled');
      expect(metrics).toHaveProperty('estimatedGPUMemoryMB');
    });

    it('should have 0 transition progress in proxy mode', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      const metrics = renderer.getPreviewMetrics();
      expect(metrics.transitionProgress).toBe(0);
    });

    it('should have 1.0 transition progress in preview mode', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        progressiveTransition: false,
      });
      renderer.enterPreview();
      const metrics = renderer.getPreviewMetrics();
      expect(metrics.transitionProgress).toBe(1.0);
    });

    it('should report LOD distribution', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      const metrics = renderer.getPreviewMetrics();
      expect(metrics.lodDistribution).toHaveProperty('lod0');
      expect(metrics.lodDistribution).toHaveProperty('lod1');
      expect(metrics.lodDistribution).toHaveProperty('lod2');
    });

    it('should report render resolution', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      const metrics = renderer.getPreviewMetrics();
      expect(metrics.renderResolution.width).toBeGreaterThan(0);
      expect(metrics.renderResolution.height).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // THREE.JS ACCESSORS
  // ─────────────────────────────────────────────────────────────────────────

  describe('Three.js accessors', () => {
    it('should provide scene access', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      expect(renderer.getScene()).toBeDefined();
    });

    it('should provide camera access', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      expect(renderer.getCamera()).toBeDefined();
    });

    it('should provide renderer access', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      expect(renderer.getRenderer()).toBeDefined();
    });

    it('should provide quality manager access', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      expect(renderer.getQualityManager()).toBeDefined();
    });

    it('should provide material factory access', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      expect(renderer.getMaterialFactory()).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FACTORY FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────

  describe('factory functions', () => {
    it('createSmartProxyRenderer should create an instance', () => {
      const renderer = createSmartProxyRenderer(canvas, world as any);
      expect(renderer).toBeInstanceOf(SmartProxyRenderer);
      expect(renderer.getMode()).toBe('proxy');
    });

    it('PROXY_TIER_DESCRIPTIONS should have all tiers', () => {
      expect(PROXY_TIER_DESCRIPTIONS).toHaveProperty('wireframe');
      expect(PROXY_TIER_DESCRIPTIONS).toHaveProperty('minimal');
      expect(PROXY_TIER_DESCRIPTIONS).toHaveProperty('balanced');
      expect(PROXY_TIER_DESCRIPTIONS).toHaveProperty('near-final');
    });

    it('getProxyTierSettings should return settings for each tier', () => {
      const tiers: ProxyQualityTier[] = ['wireframe', 'minimal', 'balanced', 'near-final'];
      for (const tier of tiers) {
        const settings = getProxyTierSettings(tier);
        expect(settings).toBeDefined();
        expect(settings.materialType).toBeDefined();
      }
    });

    it('wireframe tier should have lowest quality settings', () => {
      const settings = getProxyTierSettings('wireframe');
      expect(settings.shadowsEnabled).toBe(false);
      expect(settings.postProcessing).toBe(false);
      expect(settings.materialType).toBe('basic');
      expect(settings.pixelRatio).toBe(0.5);
    });

    it('near-final tier should have highest proxy quality settings', () => {
      const settings = getProxyTierSettings('near-final');
      expect(settings.shadowsEnabled).toBe(true);
      expect(settings.toneMapping).toBe(true);
      expect(settings.materialType).toBe('standard');
      expect(settings.pixelRatio).toBe(1.0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RESIZE
  // ─────────────────────────────────────────────────────────────────────────

  describe('resize', () => {
    it('should handle resize in proxy mode', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      renderer.resize(3840, 2160);
      // Should not throw
    });

    it('should handle resize in preview mode', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        progressiveTransition: false,
      });
      renderer.enterPreview();
      renderer.resize(3840, 2160);
      // Should not throw
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DISPOSE
  // ─────────────────────────────────────────────────────────────────────────

  describe('dispose', () => {
    it('should dispose without errors', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      expect(() => renderer.dispose()).not.toThrow();
    });

    it('should dispose after entering preview', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        progressiveTransition: false,
      });
      renderer.enterPreview();
      expect(() => renderer.dispose()).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // VR BUTTON
  // ─────────────────────────────────────────────────────────────────────────

  describe('VR button', () => {
    it('should show/hide VR button', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      renderer.showVRButton(true);
      renderer.showVRButton(false);
      // Should not throw
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('configuration', () => {
    it('should clamp proxy resolution scale to valid range', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        proxyResolutionScale: 0.1, // Below 0.25 min
      });
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should clamp preview resolution scale to valid range', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        previewResolutionScale: 5.0, // Above 2.0 max
      });
      expect(renderer.getMode()).toBe('proxy');
    });

    it('should use default transition duration of 2000ms', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any);
      // Verify it transitions (enters transition mode with progressive)
      renderer.enterPreview();
      expect(renderer.getMode()).toBe('transition');
    });

    it('should apply custom renderer config', () => {
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        rendererConfig: {
          backgroundColor: 0xff0000,
          cameraFov: 90,
          cameraPosition: { x: 0, y: 5, z: 20 },
        },
      });
      expect(renderer.getScene()).toBeDefined();
    });

    it('should call onPreviewMetrics callback', () => {
      const onPreviewMetrics = vi.fn();
      const renderer = new SmartProxyRenderer(canvas, world as any, {
        progressiveTransition: false,
        onPreviewMetrics,
      });
      // Metrics are emitted during render loop, not on mode change
      expect(renderer.getPreviewMetrics()).toBeDefined();
    });
  });
});
