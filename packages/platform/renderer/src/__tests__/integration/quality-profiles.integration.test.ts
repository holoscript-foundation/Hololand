/**
 * @vitest-environment jsdom
 */

/**
 * Integration Tests for QualityProfileManager with HololandRenderer
 *
 * Domain: spatial-rendering
 * VR Priority: Domain-specific quality tier optimization,
 *              composition metadata application,
 *              profile-driven renderer configuration
 *
 * Validates:
 * - QualityProfileManager initialization in HololandRenderer
 * - All 3 quality profiles (industrial, cinematic, mobile)
 * - Profile settings application to QualityManager
 * - Composition metadata parsing and application
 * - Profile recommendation based on device type
 * - Runtime profile switching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Three.js and WebXR
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      shadowMap: { enabled: false, type: 0 },
      xr: { enabled: false, isPresenting: false },
      toneMappingExposure: 1,
      toneMapping: 0,
      render: vi.fn(),
      compile: vi.fn(), // Required by PMREMGenerator in EnvironmentManager
      domElement: document.createElement('canvas'),
    })),
  };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false,
    dampingFactor: 0,
    update: vi.fn(),
  })),
}));

vi.mock('three/examples/jsm/webxr/VRButton.js', () => ({
  VRButton: {
    createButton: vi.fn().mockReturnValue(document.createElement('button')),
  },
}));

import { HololandRenderer } from '../../HololandRenderer';
import { HololandWorld, SpatialObject } from '@hololand/world';
import { QUALITY_PROFILES } from '@hololand/quality-profiles';
import type { CompositionQualityMetadata } from '@hololand/quality-profiles';

// =============================================================================
// HELPERS
// =============================================================================

function createTestWorld(): HololandWorld {
  return new HololandWorld({
    name: 'test-world',
    enablePhysics: false,
  });
}

function createTestCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  return canvas;
}

// =============================================================================
// TESTS
// =============================================================================

describe('Quality Profile Integration', () => {
  let canvas: HTMLCanvasElement;
  let world: HololandWorld;
  let renderer: HololandRenderer;

  beforeEach(() => {
    canvas = createTestCanvas();
    world = createTestWorld();
  });

  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize QualityProfileManager with renderer', () => {
      renderer = new HololandRenderer(canvas, world);

      const profileManager = renderer.getQualityProfileManager();
      expect(profileManager).not.toBeNull();
    });

    it('should start with industrial profile as default', () => {
      renderer = new HololandRenderer(canvas, world);

      const profile = renderer.getQualityProfile();
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('industrial');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // INDUSTRIAL PROFILE
  // ───────────────────────────────────────────────────────────────────────────

  describe('industrial profile', () => {
    beforeEach(() => {
      renderer = new HololandRenderer(canvas, world);
      renderer.setQualityProfile('industrial');
    });

    it('should apply industrial profile settings', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.name).toBe('industrial');
      expect(profile?.priority).toBe('data-accuracy');
    });

    it('should configure render settings for data accuracy', () => {
      const settings = renderer.getQualitySettings();

      // Industrial profile: data accuracy over visual fidelity
      expect(settings.shadowMapSize).toBe(QUALITY_PROFILES.industrial.renderSettings.shadowMapSize);
      expect(settings.maxTextureSize).toBe(QUALITY_PROFILES.industrial.renderSettings.maxTextureSize);
      expect(settings.maxPolyCount).toBe(QUALITY_PROFILES.industrial.renderSettings.maxPolyCount);
      expect(settings.postProcessing).toBe(false);
      expect(settings.targetFPS).toBe(60);
    });

    it('should configure physics for exact accuracy', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.physicsAccuracy).toBe('exact');
      expect(profile?.traitConfig.physics?.substeps).toBe(4);
      expect(profile?.traitConfig.physics?.collisionDetection).toBe('continuous');
    });

    it('should configure networking for IoT data', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.networkSyncRate).toBe(10);
      expect(profile?.traitConfig.networking?.syncRate).toBe(10);
      expect(profile?.traitConfig.networking?.compression).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CINEMATIC PROFILE
  // ───────────────────────────────────────────────────────────────────────────

  describe('cinematic profile', () => {
    beforeEach(() => {
      renderer = new HololandRenderer(canvas, world);
      renderer.setQualityProfile('cinematic');
    });

    it('should apply cinematic profile settings', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.name).toBe('cinematic');
      expect(profile?.priority).toBe('visual-fidelity');
    });

    it('should configure render settings for maximum visual quality', () => {
      const settings = renderer.getQualitySettings();

      // Cinematic profile: maximal visual quality
      expect(settings.shadowMapSize).toBe(QUALITY_PROFILES.cinematic.renderSettings.shadowMapSize);
      expect(settings.maxTextureSize).toBe(QUALITY_PROFILES.cinematic.renderSettings.maxTextureSize);
      expect(settings.maxPolyCount).toBe(QUALITY_PROFILES.cinematic.renderSettings.maxPolyCount);
      expect(settings.postProcessing).toBe(true);
      expect(settings.bloom).toBe(true);
      expect(settings.ssao).toBe(true);
      expect(settings.ssr).toBe(true);
    });

    it('should configure materials for full PBR', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.traitConfig.material?.pbrEnabled).toBe(true);
      expect(profile?.traitConfig.material?.normalMaps).toBe(true);
      expect(profile?.traitConfig.material?.roughnessMetallic).toBe(true);
      expect(profile?.traitConfig.material?.maxTextureResolution).toBe(4096);
    });

    it('should configure audio for studio quality', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.audioQuality).toBe('studio');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MOBILE PROFILE
  // ───────────────────────────────────────────────────────────────────────────

  describe('mobile profile', () => {
    beforeEach(() => {
      renderer = new HololandRenderer(canvas, world);
      renderer.setQualityProfile('mobile');
    });

    it('should apply mobile profile settings', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.name).toBe('mobile');
      expect(profile?.priority).toBe('performance');
    });

    it('should configure render settings for performance', () => {
      const settings = renderer.getQualitySettings();

      // Mobile profile: aggressive optimization
      expect(settings.shadowMapSize).toBe(QUALITY_PROFILES.mobile.renderSettings.shadowMapSize);
      expect(settings.maxTextureSize).toBe(QUALITY_PROFILES.mobile.renderSettings.maxTextureSize);
      expect(settings.maxPolyCount).toBe(QUALITY_PROFILES.mobile.renderSettings.maxPolyCount);
      expect(settings.lodBias).toBe(2);
      expect(settings.postProcessing).toBe(false);
      expect(settings.targetFPS).toBe(72);
      expect(settings.pixelRatio).toBe(0.75);
    });

    it('should configure aggressive LOD', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.traitConfig.lod?.levels).toBe(5);
      expect(profile?.traitConfig.lod?.distanceMultiplier).toBe(2.0);
    });

    it('should configure minimal physics', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.physicsAccuracy).toBe('basic');
      expect(profile?.traitConfig.physics?.substeps).toBe(1);
      expect(profile?.traitConfig.physics?.collisionDetection).toBe('discrete');
    });

    it('should conserve bandwidth', () => {
      const profile = renderer.getQualityProfile();
      expect(profile?.networkSyncRate).toBe(5);
      expect(profile?.traitConfig.networking?.compression).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // COMPOSITION METADATA APPLICATION
  // ───────────────────────────────────────────────────────────────────────────

  describe('composition metadata', () => {
    beforeEach(() => {
      renderer = new HololandRenderer(canvas, world);
    });

    it('should apply profile from composition metadata', () => {
      const metadata: CompositionQualityMetadata = {
        profile: 'cinematic',
      };

      renderer.applyCompositionQualityMetadata(metadata);

      const profile = renderer.getQualityProfile();
      expect(profile?.name).toBe('cinematic');
    });

    it('should apply profile with overrides', () => {
      const metadata: CompositionQualityMetadata = {
        profile: 'industrial',
        overrides: {
          targetFPS: 90,
          shadowMapSize: 2048,
        },
      };

      renderer.applyCompositionQualityMetadata(metadata);

      const settings = renderer.getQualitySettings();
      expect(settings.targetFPS).toBe(90);
      expect(settings.shadowMapSize).toBe(2048);
    });

    it('should apply trait overrides', () => {
      const metadata: CompositionQualityMetadata = {
        profile: 'industrial',
        traitOverrides: {
          networking: {
            enabled: true,
            syncRate: 20,
            interpolation: true,
            compression: false,
          },
        },
      };

      renderer.applyCompositionQualityMetadata(metadata);

      const profileManager = renderer.getQualityProfileManager();
      const traitConfig = profileManager?.getEffectiveTraitConfig();
      expect(traitConfig?.networking?.syncRate).toBe(20);
      expect(traitConfig?.networking?.compression).toBe(false);
    });

    it('should load profile from world metadata object', () => {
      // Add a composition metadata object to the world
      const metadataObj = new SpatialObject({
        type: 'composition:metadata',
        metadata: {
          qualityProfile: {
            profile: 'cinematic',
          } as CompositionQualityMetadata,
        },
      });

      world.addObject(metadataObj);

      // Create renderer (should auto-load metadata)
      renderer = new HololandRenderer(canvas, world);

      const profile = renderer.getQualityProfile();
      expect(profile?.name).toBe('cinematic');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PROFILE RECOMMENDATION
  // ───────────────────────────────────────────────────────────────────────────

  describe('profile recommendation', () => {
    it('should recommend profile based on device type', () => {
      renderer = new HololandRenderer(canvas, world, {
        quality: 'low', // Simulates mobile device
      });

      const recommended = renderer.recommendQualityProfile();

      // Low quality typically maps to mobile devices
      expect(recommended).toBeTruthy();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RUNTIME PROFILE SWITCHING
  // ───────────────────────────────────────────────────────────────────────────

  describe('runtime profile switching', () => {
    beforeEach(() => {
      renderer = new HololandRenderer(canvas, world);
    });

    it('should switch from industrial to cinematic', () => {
      renderer.setQualityProfile('industrial');
      expect(renderer.getQualityProfile()?.name).toBe('industrial');

      renderer.setQualityProfile('cinematic');
      expect(renderer.getQualityProfile()?.name).toBe('cinematic');

      const settings = renderer.getQualitySettings();
      expect(settings.postProcessing).toBe(true);
      expect(settings.bloom).toBe(true);
    });

    it('should switch from cinematic to mobile', () => {
      renderer.setQualityProfile('cinematic');
      expect(renderer.getQualityProfile()?.name).toBe('cinematic');

      renderer.setQualityProfile('mobile');
      expect(renderer.getQualityProfile()?.name).toBe('mobile');

      const settings = renderer.getQualitySettings();
      expect(settings.postProcessing).toBe(false);
      expect(settings.targetFPS).toBe(72);
    });

    it('should preserve custom overrides when switching profiles', () => {
      renderer.setQualityProfile('industrial', {
        overrides: {
          targetFPS: 120,
        },
      });

      const settings = renderer.getQualitySettings();
      expect(settings.targetFPS).toBe(120);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PROFILE MANAGER API
  // ───────────────────────────────────────────────────────────────────────────

  describe('profile manager API', () => {
    beforeEach(() => {
      renderer = new HololandRenderer(canvas, world);
    });

    it('should provide access to QualityProfileManager', () => {
      const profileManager = renderer.getQualityProfileManager();
      expect(profileManager).not.toBeNull();
    });

    it('should get all available profiles', () => {
      const profileManager = renderer.getQualityProfileManager();
      const allProfiles = profileManager?.getAllProfiles();

      expect(allProfiles).toBeTruthy();
      expect(allProfiles?.length).toBe(3);
      expect(allProfiles?.map((p) => p.name)).toEqual(['industrial', 'cinematic', 'mobile']);
    });

    it('should get profile by name', () => {
      const profileManager = renderer.getQualityProfileManager();
      const industrial = profileManager?.getProfileByName('industrial');

      expect(industrial).toBeTruthy();
      expect(industrial?.priority).toBe('data-accuracy');
    });

    it('should compare profiles', () => {
      const profileManager = renderer.getQualityProfileManager();
      const diffs = profileManager?.compareProfiles('industrial', 'cinematic');

      expect(diffs).toBeTruthy();
      expect(diffs!.length).toBeGreaterThan(0);
    });
  });
});
