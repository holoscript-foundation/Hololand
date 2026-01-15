/**
 * EnvironmentManager
 *
 * Manages HDRI environments, skyboxes, fog, and ground planes.
 * Provides realistic lighting from environment maps.
 */

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { EnvironmentConfig, QualitySettings } from './types';
import { logger } from './logger';

// =============================================================================
// BUILT-IN HDRI PRESETS
// =============================================================================

/**
 * Built-in HDRI environment presets (using Poly Haven CDN)
 */
export const HDRI_PRESETS: Record<string, string> = {
  // Outdoor
  sunset: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_02_1k.hdr',
  daylight: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/meadow_1k.hdr',
  overcast: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/symmetrical_garden_02_1k.hdr',
  night: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/moonless_golf_1k.hdr',
  forest: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/spruit_sunrise_1k.hdr',

  // Indoor/Studio
  studio: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
  warehouse: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr',
  gallery: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/photo_studio_loft_hall_1k.hdr',

  // Urban
  city: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr',
  urban: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/urban_street_04_1k.hdr',
};

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

const DEFAULT_ENV_CONFIG: Required<EnvironmentConfig> = {
  hdri: '',
  skybox: 'gradient',
  skyColors: { top: 0x0077ff, bottom: 0x003355 },
  proceduralSky: {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
  },
  ground: {
    enabled: true,
    color: 0x808080,
    roughness: 0.8,
    metalness: 0.2,
    receiveShadow: true,
  },
  fog: {
    enabled: false,
    type: 'linear',
    color: 0xcccccc,
    near: 10,
    far: 100,
    density: 0.00025,
  },
};

// =============================================================================
// ENVIRONMENT MANAGER
// =============================================================================

export interface EnvironmentManagerOptions {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  qualitySettings: QualitySettings;
  config?: EnvironmentConfig;
}

export class EnvironmentManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private qualitySettings: QualitySettings;
  private config: Required<EnvironmentConfig>;

  // Environment objects
  private hdriTexture: THREE.Texture | null = null;
  private pmremGenerator: THREE.PMREMGenerator;
  private envMap: THREE.Texture | null = null;
  private sky: Sky | null = null;
  private ground: THREE.Mesh | null = null;
  private gradientBackground: THREE.Mesh | null = null;

  // Loaders
  private rgbeLoader: RGBELoader;

  // Loading state
  private loadingPromise: Promise<void> | null = null;

  constructor(options: EnvironmentManagerOptions) {
    this.scene = options.scene;
    this.renderer = options.renderer;
    this.qualitySettings = options.qualitySettings;
    this.config = { ...DEFAULT_ENV_CONFIG, ...options.config } as Required<EnvironmentConfig>;

    // Initialize loaders
    this.rgbeLoader = new RGBELoader();
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    logger.info('[EnvironmentManager] Created');
  }

  /**
   * Initialize the environment
   */
  async initialize(): Promise<void> {
    await this.setupSkybox();
    this.setupGround();
    this.setupFog();

    logger.info('[EnvironmentManager] Initialized');
  }

  /**
   * Setup skybox based on configuration
   */
  private async setupSkybox(): Promise<void> {
    switch (this.config.skybox) {
      case 'hdri':
        if (this.config.hdri) {
          await this.loadHDRI(this.config.hdri);
        }
        break;
      case 'procedural':
        this.createProceduralSky();
        break;
      case 'gradient':
        this.createGradientBackground();
        break;
      case 'none':
        this.scene.background = new THREE.Color(0x000000);
        break;
    }
  }

  /**
   * Load HDRI environment map
   */
  async loadHDRI(urlOrPreset: string): Promise<void> {
    // Resolve preset name to URL
    const url = HDRI_PRESETS[urlOrPreset] || urlOrPreset;

    // Adjust resolution based on quality
    const resolution = this.qualitySettings.envMapResolution;
    const adjustedUrl = url.replace(/(\d+)k\.hdr$/, `${Math.min(resolution / 256, 4)}k.hdr`);

    if (this.loadingPromise) {
      await this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      logger.debug('[EnvironmentManager] Loading HDRI', { url: adjustedUrl });

      this.rgbeLoader.load(
        adjustedUrl,
        (texture) => {
          // Dispose old textures
          this.hdriTexture?.dispose();
          this.envMap?.dispose();

          this.hdriTexture = texture;

          // Generate PMREM for PBR reflections
          this.envMap = this.pmremGenerator.fromEquirectangular(texture).texture;

          // Set as scene background and environment
          this.scene.background = this.envMap;
          this.scene.environment = this.envMap;

          // Update all materials to use new environment
          this.updateMaterialsEnvironment();

          logger.info('[EnvironmentManager] HDRI loaded', { url: adjustedUrl });
          resolve();
        },
        undefined,
        (error) => {
          logger.error('[EnvironmentManager] HDRI load failed', { error });
          reject(error);
        }
      );
    });

    await this.loadingPromise;
    this.loadingPromise = null;
  }

  /**
   * Create procedural sky (sun + atmosphere)
   */
  createProceduralSky(): void {
    // Remove existing sky
    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky = null;
    }

    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);

    const uniforms = this.sky.material.uniforms;
    const settings = this.config.proceduralSky;

    uniforms.turbidity.value = settings.turbidity;
    uniforms.rayleigh.value = settings.rayleigh;
    uniforms.mieCoefficient.value = settings.mieCoefficient;
    uniforms.mieDirectionalG.value = settings.mieDirectionalG;

    // Sun position
    const phi = THREE.MathUtils.degToRad(90 - settings.elevation);
    const theta = THREE.MathUtils.degToRad(settings.azimuth);
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);
    uniforms.sunPosition.value.copy(sunPosition);

    // Generate environment map from sky
    if (this.qualitySettings.hdriEnvironment) {
      const skyScene = new THREE.Scene();
      const skyCopy = new Sky();
      skyCopy.scale.setScalar(450000);
      Object.keys(uniforms).forEach(key => {
        if (skyCopy.material.uniforms[key]) {
          skyCopy.material.uniforms[key].value = uniforms[key].value;
        }
      });
      skyScene.add(skyCopy);

      this.envMap?.dispose();
      this.envMap = this.pmremGenerator.fromScene(skyScene).texture;
      this.scene.environment = this.envMap;

      skyScene.remove(skyCopy);
    }

    logger.debug('[EnvironmentManager] Procedural sky created');
  }

  /**
   * Create gradient background
   */
  createGradientBackground(): void {
    // Remove existing gradient mesh
    if (this.gradientBackground) {
      this.scene.remove(this.gradientBackground);
      this.gradientBackground = null;
    }

    const colors = this.config.skyColors;
    const topColor = new THREE.Color(colors.top);
    const bottomColor = new THREE.Color(colors.bottom);

    // Create gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, `#${topColor.getHexString()}`);
    gradient.addColorStop(1, `#${bottomColor.getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    this.scene.background = texture;

    // If HDRI environment is enabled, create a basic ambient environment
    if (this.qualitySettings.hdriEnvironment) {
      // Create simple environment from the gradient colors
      const avgColor = topColor.clone().lerp(bottomColor, 0.5);
      this.scene.environment = null; // Use scene lights instead
    }

    logger.debug('[EnvironmentManager] Gradient background created');
  }

  /**
   * Setup ground plane
   */
  setupGround(): void {
    // Remove existing ground
    if (this.ground) {
      this.scene.remove(this.ground);
      (this.ground.material as THREE.Material).dispose();
      this.ground.geometry.dispose();
      this.ground = null;
    }

    if (!this.config.ground.enabled) return;

    const groundConfig = this.config.ground;

    // Create ground geometry
    const geometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);

    // Create PBR material
    const material = this.qualitySettings.materialType === 'physical'
      ? new THREE.MeshPhysicalMaterial({
          color: groundConfig.color,
          roughness: groundConfig.roughness,
          metalness: groundConfig.metalness,
          envMapIntensity: this.qualitySettings.hdriEnvironment ? 1.0 : 0,
        })
      : new THREE.MeshStandardMaterial({
          color: groundConfig.color,
          roughness: groundConfig.roughness,
          metalness: groundConfig.metalness,
          envMapIntensity: this.qualitySettings.hdriEnvironment ? 1.0 : 0,
        });

    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = groundConfig.receiveShadow && this.qualitySettings.shadowsEnabled;
    this.ground.name = '__hololand_ground__';

    this.scene.add(this.ground);

    logger.debug('[EnvironmentManager] Ground created');
  }

  /**
   * Setup fog
   */
  setupFog(): void {
    if (!this.config.fog.enabled) {
      this.scene.fog = null;
      return;
    }

    const fogConfig = this.config.fog;

    if (fogConfig.type === 'exponential') {
      this.scene.fog = new THREE.FogExp2(fogConfig.color, fogConfig.density || 0.00025);
    } else {
      this.scene.fog = new THREE.Fog(
        fogConfig.color,
        fogConfig.near || 10,
        fogConfig.far || 100
      );
    }

    logger.debug('[EnvironmentManager] Fog created', { type: fogConfig.type });
  }

  /**
   * Update all materials to use current environment map
   */
  private updateMaterialsEnvironment(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach(mat => this.updateMaterialEnv(mat));
        } else {
          this.updateMaterialEnv(material);
        }
      }
    });
  }

  private updateMaterialEnv(material: THREE.Material): void {
    if (material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial) {
      material.envMap = this.envMap;
      material.envMapIntensity = this.qualitySettings.hdriEnvironment ? 1.0 : 0;
      material.needsUpdate = true;
    }
  }

  /**
   * Update configuration
   */
  async setConfig(config: Partial<EnvironmentConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.initialize();
  }

  /**
   * Update quality settings
   */
  setQualitySettings(settings: QualitySettings): void {
    this.qualitySettings = settings;

    // Re-setup with new quality
    if (this.config.skybox === 'hdri' && this.config.hdri) {
      this.loadHDRI(this.config.hdri);
    }

    this.setupGround();
  }

  /**
   * Set sun position for procedural sky
   */
  setSunPosition(elevation: number, azimuth: number): void {
    if (!this.sky) return;

    this.config.proceduralSky.elevation = elevation;
    this.config.proceduralSky.azimuth = azimuth;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms.sunPosition.value.copy(sunPosition);
  }

  /**
   * Set fog parameters
   */
  setFog(enabled: boolean, config?: Partial<EnvironmentConfig['fog']>): void {
    this.config.fog.enabled = enabled;
    if (config) {
      this.config.fog = { ...this.config.fog, ...config };
    }
    this.setupFog();
  }

  /**
   * Get current environment map
   */
  getEnvironmentMap(): THREE.Texture | null {
    return this.envMap;
  }

  /**
   * Get ground mesh
   */
  getGround(): THREE.Mesh | null {
    return this.ground;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.hdriTexture?.dispose();
    this.envMap?.dispose();
    this.pmremGenerator.dispose();

    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky = null;
    }

    if (this.ground) {
      this.scene.remove(this.ground);
      (this.ground.material as THREE.Material).dispose();
      this.ground.geometry.dispose();
      this.ground = null;
    }

    if (this.gradientBackground) {
      this.scene.remove(this.gradientBackground);
      this.gradientBackground = null;
    }

    logger.info('[EnvironmentManager] Disposed');
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an environment manager
 */
export function createEnvironmentManager(options: EnvironmentManagerOptions): EnvironmentManager {
  return new EnvironmentManager(options);
}
