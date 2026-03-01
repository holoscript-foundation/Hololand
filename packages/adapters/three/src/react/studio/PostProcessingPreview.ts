/**
 * PostProcessingPreview
 *
 * Bridge between the Studio IDE post-processing settings and the Three.js
 * render pipeline. Manages EffectComposer passes for real-time preview
 * of bloom, depth of field, motion blur, and color grading.
 *
 * This class is renderer-agnostic at the interface level but maps to
 * Three.js postprocessing passes internally:
 *   - UnrealBloomPass     -> bloom
 *   - BokehPass           -> depth of field
 *   - ShaderPass (custom) -> motion blur
 *   - ShaderPass (custom) -> color grading + vignette + tone mapping
 *
 * Usage:
 *   const preview = new PostProcessingPreview(renderer, scene, camera);
 *   // On settings change:
 *   preview.applySettings(settings);
 *   // In render loop:
 *   preview.render(); // replaces renderer.render(scene, camera)
 *   // Cleanup:
 *   preview.dispose();
 *
 * @module studio/PostProcessingPreview
 */

import type * as THREE from 'three';
import type {
  PostProcessingSettings,
  BloomSettings,
  DepthOfFieldSettings,
  MotionBlurSettings,
  ColorGradingSettings,
} from './PostProcessingTypes';
import { DEFAULT_POST_PROCESSING } from './PostProcessingTypes';

// =============================================================================
// TYPES
// =============================================================================

export interface PostProcessingPreviewConfig {
  /** Whether to render to the default framebuffer or a render target */
  renderToScreen?: boolean;
  /** Output pixel ratio (default: uses renderer's pixel ratio) */
  pixelRatio?: number;
}

/** Minimal interface for an EffectComposer pass */
interface ComposerPass {
  enabled: boolean;
  dispose?: () => void;
  [key: string]: unknown;
}

/**
 * Describes a uniform value that should be set on a shader pass.
 * Used to batch updates before the next render.
 */
interface PendingUniform {
  pass: ComposerPass;
  key: string;
  value: unknown;
}

// =============================================================================
// COLOR GRADING SHADER
// =============================================================================

/**
 * Custom color grading fragment shader.
 * Performs: exposure -> contrast -> saturation -> temperature/tint -> vignette
 */
const COLOR_GRADING_FRAGMENT = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform float uTemperature;
uniform float uTint;
uniform float uVignetteIntensity;
uniform float uVignetteSmoothness;
uniform vec3 uShadows;
uniform vec3 uMidtones;
uniform vec3 uHighlights;
varying vec2 vUv;

vec3 adjustTemperature(vec3 color, float temp, float tint) {
  // Simplified Planckian locus approximation
  float t = (temp - 6500.0) / 6500.0;
  color.r += t * 0.1;
  color.b -= t * 0.1;
  color.g += tint * 0.05;
  return color;
}

vec3 liftGammaGain(vec3 color, vec3 shadows, vec3 midtones, vec3 highlights) {
  // Lift (shadows): offset
  vec3 lift = (shadows - 0.5) * 2.0;
  // Gamma (midtones): power curve
  vec3 gamma = 1.0 / max(midtones * 2.0, vec3(0.01));
  // Gain (highlights): multiplier
  vec3 gain = highlights * 2.0;

  color = color * gain + lift;
  color = pow(max(color, vec3(0.0)), gamma);
  return color;
}

void main() {
  vec4 texColor = texture2D(tDiffuse, vUv);
  vec3 color = texColor.rgb;

  // Exposure
  color *= pow(2.0, uExposure);

  // Contrast
  color = mix(vec3(0.5), color, 1.0 + uContrast);

  // Saturation
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luminance), color, 1.0 + uSaturation);

  // Temperature & Tint
  color = adjustTemperature(color, uTemperature, uTint);

  // Lift/Gamma/Gain
  color = liftGammaGain(color, uShadows, uMidtones, uHighlights);

  // Vignette
  if (uVignetteIntensity > 0.0) {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float vignette = smoothstep(0.5, 0.5 - uVignetteSmoothness * 0.5, dist);
    color = mix(color * (1.0 - uVignetteIntensity), color, vignette);
  }

  // Clamp to valid range
  color = clamp(color, vec3(0.0), vec3(1.0));

  gl_FragColor = vec4(color, texColor.a);
}
`;

const COLOR_GRADING_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// =============================================================================
// MOTION BLUR SHADER (velocity-based approximation)
// =============================================================================

const MOTION_BLUR_FRAGMENT = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uIntensity;
uniform int uSamples;
uniform vec2 uVelocity;
varying vec2 vUv;

void main() {
  vec4 color = vec4(0.0);
  vec2 velocity = uVelocity * uIntensity * 0.01;
  float sampleCount = float(uSamples);

  for (int i = 0; i < 16; i++) {
    if (i >= uSamples) break;
    float t = (float(i) / sampleCount) - 0.5;
    vec2 offset = velocity * t;
    color += texture2D(tDiffuse, vUv + offset);
  }

  gl_FragColor = color / sampleCount;
}
`;

const MOTION_BLUR_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// =============================================================================
// MAIN CLASS
// =============================================================================

export class PostProcessingPreview {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private config: PostProcessingPreviewConfig;

  // Current settings
  private currentSettings: PostProcessingSettings;

  // EffectComposer (dynamically imported)
  private composer: any = null;
  private renderPass: ComposerPass | null = null;
  private bloomPass: ComposerPass | null = null;
  private bokehPass: ComposerPass | null = null;
  private motionBlurPass: ComposerPass | null = null;
  private colorGradingPass: ComposerPass | null = null;

  // Initialization state
  private initialized: boolean = false;
  private initializing: boolean = false;
  private pendingSettings: PostProcessingSettings | null = null;

  // Viewport size tracking
  private width: number = 0;
  private height: number = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config?: PostProcessingPreviewConfig,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.config = config || {};
    this.currentSettings = { ...DEFAULT_POST_PROCESSING };

    // Track viewport size
    const size = renderer.getSize(new (globalThis as any).THREE?.Vector2?.() || { x: 0, y: 0 });
    this.width = size.x || renderer.domElement.width;
    this.height = size.y || renderer.domElement.height;
  }

  // -------------------------------------------------------------------------
  // PUBLIC API
  // -------------------------------------------------------------------------

  /**
   * Initialize the post-processing pipeline.
   * Lazy-loads EffectComposer and required passes.
   * Safe to call multiple times (idempotent).
   */
  async initialize(): Promise<void> {
    if (this.initialized || this.initializing) return;
    this.initializing = true;

    try {
      // Dynamic imports for tree-shaking when post-processing is not used
      const [
        { EffectComposer },
        { RenderPass },
        { UnrealBloomPass },
        { BokehPass },
        { ShaderPass },
      ] = await Promise.all([
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
        import('three/examples/jsm/postprocessing/RenderPass.js'),
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        import('three/examples/jsm/postprocessing/BokehPass.js'),
        import('three/examples/jsm/postprocessing/ShaderPass.js'),
      ]);

      const THREE = await import('three');

      // Create composer
      this.composer = new EffectComposer(this.renderer);

      const pixelRatio = this.config.pixelRatio || this.renderer.getPixelRatio();
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(this.width, this.height);

      // 1. Render pass (always first)
      this.renderPass = new RenderPass(this.scene, this.camera) as unknown as ComposerPass;
      this.composer.addPass(this.renderPass);

      // 2. Bloom pass
      const resolution = new THREE.Vector2(this.width, this.height);
      this.bloomPass = new UnrealBloomPass(
        resolution,
        this.currentSettings.bloom.intensity,
        this.currentSettings.bloom.radius,
        this.currentSettings.bloom.threshold,
      ) as unknown as ComposerPass;
      this.bloomPass.enabled = this.currentSettings.bloom.enabled;
      this.composer.addPass(this.bloomPass);

      // 3. Bokeh (DOF) pass
      this.bokehPass = new BokehPass(this.scene, this.camera, {
        focus: this.currentSettings.depthOfField.focusDistance,
        aperture: this.currentSettings.depthOfField.aperture * 0.00001,
        maxblur: 0.01,
      }) as unknown as ComposerPass;
      this.bokehPass.enabled = this.currentSettings.depthOfField.enabled;
      this.composer.addPass(this.bokehPass);

      // 4. Motion blur (custom shader pass)
      const motionBlurShader = {
        uniforms: {
          tDiffuse: { value: null },
          uIntensity: { value: this.currentSettings.motionBlur.intensity },
          uSamples: { value: this.currentSettings.motionBlur.samples },
          uVelocity: { value: new THREE.Vector2(0.0, 0.0) },
        },
        vertexShader: MOTION_BLUR_VERTEX,
        fragmentShader: MOTION_BLUR_FRAGMENT,
      };
      this.motionBlurPass = new ShaderPass(motionBlurShader) as unknown as ComposerPass;
      this.motionBlurPass.enabled = this.currentSettings.motionBlur.enabled;
      this.composer.addPass(this.motionBlurPass);

      // 5. Color grading (custom shader pass)
      const colorGradingShader = {
        uniforms: {
          tDiffuse: { value: null },
          uExposure: { value: this.currentSettings.colorGrading.exposure },
          uContrast: { value: this.currentSettings.colorGrading.contrast },
          uSaturation: { value: this.currentSettings.colorGrading.saturation },
          uTemperature: { value: this.currentSettings.colorGrading.temperature },
          uTint: { value: this.currentSettings.colorGrading.tint },
          uVignetteIntensity: { value: this.currentSettings.colorGrading.vignetteIntensity },
          uVignetteSmoothness: { value: this.currentSettings.colorGrading.vignetteSmoothness },
          uShadows: { value: new THREE.Vector3(...this.currentSettings.colorGrading.shadows) },
          uMidtones: { value: new THREE.Vector3(...this.currentSettings.colorGrading.midtones) },
          uHighlights: { value: new THREE.Vector3(...this.currentSettings.colorGrading.highlights) },
        },
        vertexShader: COLOR_GRADING_VERTEX,
        fragmentShader: COLOR_GRADING_FRAGMENT,
      };
      this.colorGradingPass = new ShaderPass(colorGradingShader) as unknown as ComposerPass;
      this.colorGradingPass.enabled = this.currentSettings.colorGrading.enabled;
      this.composer.addPass(this.colorGradingPass);

      this.initialized = true;

      // Apply any settings that were queued while initializing
      if (this.pendingSettings) {
        this.applySettings(this.pendingSettings);
        this.pendingSettings = null;
      }
    } catch (error) {
      console.warn('[PostProcessingPreview] Failed to initialize:', error);
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Apply new post-processing settings. Updates pass uniforms in-place
   * without recreating the pipeline (efficient for real-time slider changes).
   */
  applySettings(settings: PostProcessingSettings): void {
    this.currentSettings = settings;

    if (!this.initialized) {
      this.pendingSettings = settings;
      return;
    }

    this.applyBloomSettings(settings.bloom);
    this.applyDepthOfFieldSettings(settings.depthOfField);
    this.applyMotionBlurSettings(settings.motionBlur);
    this.applyColorGradingSettings(settings.colorGrading);
  }

  /**
   * Render the scene with post-processing applied.
   * Call this instead of renderer.render(scene, camera) when
   * post-processing is active.
   */
  render(): void {
    if (!this.initialized || !this.composer) {
      // Fallback: render without post-processing
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Check if any effect is actually enabled
    const anyEnabled =
      this.currentSettings.bloom.enabled ||
      this.currentSettings.depthOfField.enabled ||
      this.currentSettings.motionBlur.enabled ||
      this.currentSettings.colorGrading.enabled;

    if (!anyEnabled) {
      // No effects enabled -- render directly for performance
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.composer.render();
  }

  /**
   * Update viewport size (call on window resize).
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  /**
   * Update the scene reference (if the scene changes).
   */
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
    if (this.renderPass) {
      (this.renderPass as any).scene = scene;
    }
    if (this.bokehPass) {
      (this.bokehPass as any).scene = scene;
    }
  }

  /**
   * Update the camera reference (if the camera changes).
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    if (this.renderPass) {
      (this.renderPass as any).camera = camera;
    }
    if (this.bokehPass) {
      (this.bokehPass as any).camera = camera;
    }
  }

  /**
   * Whether the pipeline is initialized and ready to render.
   */
  get isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get current settings (readonly).
   */
  getSettings(): Readonly<PostProcessingSettings> {
    return { ...this.currentSettings };
  }

  /**
   * Clean up all GPU resources.
   */
  dispose(): void {
    if (this.bloomPass?.dispose) this.bloomPass.dispose();
    if (this.bokehPass?.dispose) this.bokehPass.dispose();
    if (this.motionBlurPass?.dispose) this.motionBlurPass.dispose();
    if (this.colorGradingPass?.dispose) this.colorGradingPass.dispose();

    if (this.composer) {
      // EffectComposer.dispose() cleans up render targets
      if (typeof this.composer.dispose === 'function') {
        this.composer.dispose();
      }
    }

    this.composer = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.bokehPass = null;
    this.motionBlurPass = null;
    this.colorGradingPass = null;
    this.initialized = false;
  }

  // -------------------------------------------------------------------------
  // PER-EFFECT UPDATERS
  // -------------------------------------------------------------------------

  private applyBloomSettings(bloom: BloomSettings): void {
    if (!this.bloomPass) return;
    this.bloomPass.enabled = bloom.enabled;

    const pass = this.bloomPass as any;
    if (pass.strength !== undefined) pass.strength = bloom.intensity;
    if (pass.threshold !== undefined) pass.threshold = bloom.threshold;
    if (pass.radius !== undefined) pass.radius = bloom.radius;
    // smoothing is applied via threshold softness in UnrealBloomPass
    if (pass.bloomTintColors) {
      // Some builds expose smoothing differently
    }
  }

  private applyDepthOfFieldSettings(dof: DepthOfFieldSettings): void {
    if (!this.bokehPass) return;
    this.bokehPass.enabled = dof.enabled;

    const uniforms = (this.bokehPass as any).uniforms;
    if (uniforms) {
      if (uniforms.focus) uniforms.focus.value = dof.focusDistance;
      if (uniforms.aperture) uniforms.aperture.value = dof.aperture * 0.00001;
      if (uniforms.maxblur) {
        // Scale maxblur with focal length
        uniforms.maxblur.value = Math.min(0.02, dof.focalLength / 10000);
      }
    }
  }

  private applyMotionBlurSettings(mb: MotionBlurSettings): void {
    if (!this.motionBlurPass) return;
    this.motionBlurPass.enabled = mb.enabled;

    const uniforms = (this.motionBlurPass as any).uniforms;
    if (uniforms) {
      if (uniforms.uIntensity) uniforms.uIntensity.value = mb.intensity;
      if (uniforms.uSamples) uniforms.uSamples.value = mb.samples;
    }
  }

  private applyColorGradingSettings(cg: ColorGradingSettings): void {
    if (!this.colorGradingPass) return;
    this.colorGradingPass.enabled = cg.enabled;

    const uniforms = (this.colorGradingPass as any).uniforms;
    if (uniforms) {
      if (uniforms.uExposure) uniforms.uExposure.value = cg.exposure;
      if (uniforms.uContrast) uniforms.uContrast.value = cg.contrast;
      if (uniforms.uSaturation) uniforms.uSaturation.value = cg.saturation;
      if (uniforms.uTemperature) uniforms.uTemperature.value = cg.temperature;
      if (uniforms.uTint) uniforms.uTint.value = cg.tint;
      if (uniforms.uVignetteIntensity) uniforms.uVignetteIntensity.value = cg.vignetteIntensity;
      if (uniforms.uVignetteSmoothness) uniforms.uVignetteSmoothness.value = cg.vignetteSmoothness;
      if (uniforms.uShadows) uniforms.uShadows.value.set(...cg.shadows);
      if (uniforms.uMidtones) uniforms.uMidtones.value.set(...cg.midtones);
      if (uniforms.uHighlights) uniforms.uHighlights.value.set(...cg.highlights);
    }
  }
}
