/**
 * PostProcessingPipeline
 *
 * Handles all post-processing effects for enhanced visuals.
 * Uses Three.js EffectComposer with various passes.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import type { QualitySettings, PostProcessingConfig } from './types';
import { logger } from './logger';

// =============================================================================
// CUSTOM SHADERS
// =============================================================================

// Vignette shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vig = 1.0 - dot(uv, uv);
      vig = clamp(pow(vig, darkness), 0.0, 1.0);
      gl_FragColor = vec4(texel.rgb * vig, texel.a);
    }
  `,
};

// Color grading shader
const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    varying vec2 vUv;

    vec3 adjustBrightness(vec3 color, float value) {
      return color + value;
    }

    vec3 adjustContrast(vec3 color, float value) {
      return 0.5 + (value * (color - 0.5));
    }

    vec3 adjustSaturation(vec3 color, float value) {
      float grey = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(vec3(grey), color, value);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;
      color = adjustBrightness(color, brightness);
      color = adjustContrast(color, contrast);
      color = adjustSaturation(color, saturation);
      gl_FragColor = vec4(color, texel.a);
    }
  `,
};

// Chromatic aberration shader
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 0.005 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    varying vec2 vUv;

    void main() {
      vec2 direction = vUv - vec2(0.5);
      float dist = length(direction);

      vec2 offsetR = direction * offset * dist;
      vec2 offsetB = -direction * offset * dist;

      float r = texture2D(tDiffuse, vUv + offsetR).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + offsetB).b;

      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

// =============================================================================
// POST PROCESSING PIPELINE
// =============================================================================

export interface PostProcessingOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  qualitySettings: QualitySettings;
  config?: PostProcessingConfig;
}

export class PostProcessingPipeline {
  private composer: EffectComposer;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private enabled: boolean = true;

  // Individual passes
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass | null = null;
  private ssaoPass: SSAOPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  private smaaPass: SMAAPass | null = null;
  private vignettePass: ShaderPass | null = null;
  private colorGradingPass: ShaderPass | null = null;
  private chromaticAberrationPass: ShaderPass | null = null;
  private outputPass: OutputPass;

  constructor(options: PostProcessingOptions) {
    this.renderer = options.renderer;
    this.scene = options.scene;
    this.camera = options.camera;

    // Create composer
    this.composer = new EffectComposer(this.renderer);

    // Base render pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Output pass (always last for color space conversion)
    this.outputPass = new OutputPass();

    // Apply initial settings
    this.applyQualitySettings(options.qualitySettings, options.config);

    logger.info('[PostProcessing] Pipeline created');
  }

  /**
   * Apply quality settings to configure post-processing passes
   */
  applyQualitySettings(settings: QualitySettings, config?: PostProcessingConfig): void {
    // Clear existing passes (except render pass)
    this.clearPasses();

    if (!settings.postProcessing) {
      this.enabled = false;
      // Just add output pass for proper color space
      this.composer.addPass(this.outputPass);
      return;
    }

    this.enabled = true;
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    // SSAO Pass
    if (settings.ssao && (this.camera instanceof THREE.PerspectiveCamera)) {
      this.ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
      this.ssaoPass.kernelRadius = config?.ssao?.radius ?? 16;
      this.ssaoPass.minDistance = config?.ssao?.bias ?? 0.005;
      this.ssaoPass.maxDistance = config?.ssao?.intensity ?? 0.1;
      this.composer.addPass(this.ssaoPass);
      logger.debug('[PostProcessing] SSAO enabled');
    }

    // Bloom Pass
    if (settings.bloom) {
      const resolution = new THREE.Vector2(width, height);
      this.bloomPass = new UnrealBloomPass(
        resolution,
        config?.bloom?.strength ?? 0.5,
        config?.bloom?.radius ?? 0.4,
        config?.bloom?.threshold ?? 0.85
      );
      this.composer.addPass(this.bloomPass);
      logger.debug('[PostProcessing] Bloom enabled');
    }

    // Vignette
    if (config?.vignette?.enabled) {
      this.vignettePass = new ShaderPass(VignetteShader);
      this.vignettePass.uniforms.offset.value = config.vignette.offset ?? 1.0;
      this.vignettePass.uniforms.darkness.value = config.vignette.darkness ?? 1.0;
      this.composer.addPass(this.vignettePass);
      logger.debug('[PostProcessing] Vignette enabled');
    }

    // Color Grading
    if (config?.colorGrading?.enabled) {
      this.colorGradingPass = new ShaderPass(ColorGradingShader);
      this.colorGradingPass.uniforms.brightness.value = config.colorGrading.brightness ?? 0;
      this.colorGradingPass.uniforms.contrast.value = config.colorGrading.contrast ?? 1;
      this.colorGradingPass.uniforms.saturation.value = config.colorGrading.saturation ?? 1;
      this.composer.addPass(this.colorGradingPass);
      logger.debug('[PostProcessing] Color grading enabled');
    }

    // Chromatic Aberration
    if (config?.chromaticAberration?.enabled) {
      this.chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
      this.chromaticAberrationPass.uniforms.offset.value = config.chromaticAberration.offset ?? 0.005;
      this.composer.addPass(this.chromaticAberrationPass);
      logger.debug('[PostProcessing] Chromatic aberration enabled');
    }

    // Anti-aliasing (last before output)
    switch (settings.antialiasing) {
      case 'fxaa':
        this.fxaaPass = new ShaderPass(FXAAShader);
        this.fxaaPass.uniforms.resolution.value.set(1 / width, 1 / height);
        this.composer.addPass(this.fxaaPass);
        logger.debug('[PostProcessing] FXAA enabled');
        break;
      case 'smaa':
        this.smaaPass = new SMAAPass(width, height);
        this.composer.addPass(this.smaaPass);
        logger.debug('[PostProcessing] SMAA enabled');
        break;
      case 'taa':
        // TAA would require custom implementation or different library
        // Fall back to SMAA for now
        this.smaaPass = new SMAAPass(width, height);
        this.composer.addPass(this.smaaPass);
        logger.debug('[PostProcessing] TAA requested, using SMAA fallback');
        break;
    }

    // Output pass (color space conversion)
    this.composer.addPass(this.outputPass);
  }

  /**
   * Clear all passes except render pass
   */
  private clearPasses(): void {
    // Remove all passes
    while (this.composer.passes.length > 0) {
      this.composer.passes.pop();
    }

    // Re-add render pass
    this.composer.addPass(this.renderPass);

    // Dispose old passes
    this.bloomPass?.dispose();
    this.ssaoPass?.dispose();
    this.fxaaPass?.dispose();
    this.smaaPass?.dispose();
    this.vignettePass?.dispose();
    this.colorGradingPass?.dispose();
    this.chromaticAberrationPass?.dispose();

    this.bloomPass = null;
    this.ssaoPass = null;
    this.fxaaPass = null;
    this.smaaPass = null;
    this.vignettePass = null;
    this.colorGradingPass = null;
    this.chromaticAberrationPass = null;
  }

  /**
   * Update camera reference (e.g., when switching cameras)
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    this.renderPass.camera = camera;
    if (this.ssaoPass && camera instanceof THREE.PerspectiveCamera) {
      this.ssaoPass.camera = camera;
    }
  }

  /**
   * Handle window resize
   */
  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);

    // Update FXAA resolution uniform
    if (this.fxaaPass) {
      this.fxaaPass.uniforms.resolution.value.set(1 / width, 1 / height);
    }
  }

  /**
   * Render the post-processed scene
   */
  render(): void {
    if (this.enabled) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Enable/disable post-processing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if post-processing is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Update bloom settings at runtime
   */
  setBloomSettings(strength: number, radius: number, threshold: number): void {
    if (this.bloomPass) {
      this.bloomPass.strength = strength;
      this.bloomPass.radius = radius;
      this.bloomPass.threshold = threshold;
    }
  }

  /**
   * Update vignette settings at runtime
   */
  setVignetteSettings(offset: number, darkness: number): void {
    if (this.vignettePass) {
      this.vignettePass.uniforms.offset.value = offset;
      this.vignettePass.uniforms.darkness.value = darkness;
    }
  }

  /**
   * Update color grading at runtime
   */
  setColorGrading(brightness: number, contrast: number, saturation: number): void {
    if (this.colorGradingPass) {
      this.colorGradingPass.uniforms.brightness.value = brightness;
      this.colorGradingPass.uniforms.contrast.value = contrast;
      this.colorGradingPass.uniforms.saturation.value = saturation;
    }
  }

  /**
   * Get the effect composer (for advanced usage)
   */
  getComposer(): EffectComposer {
    return this.composer;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.clearPasses();
    this.composer.dispose();
    this.outputPass.dispose();
    logger.info('[PostProcessing] Disposed');
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a post-processing pipeline
 */
export function createPostProcessingPipeline(options: PostProcessingOptions): PostProcessingPipeline {
  return new PostProcessingPipeline(options);
}
