/**
 * V3CMIVFallbackEncoder
 *
 * Generates an MPEG V3C MIV (Multiview Immersive Video) fallback representation
 * from Gaussian Splatting data. This enables legacy decoders that do not support
 * native 3DGS to render an approximation of the scene using standard multi-view
 * video decoding (H.264/HEVC).
 *
 * Based on:
 *   - ISO/IEC 23090-5 (V3C: Visual Volumetric Video-based Coding)
 *   - ISO/IEC 23090-12 (MIV: MPEG Immersive Video)
 *   - MIV Main profile (MVD: Multi-View + Depth)
 *   - MIV Geometry Absent profile (decoder-side depth estimation)
 *
 * Architecture:
 * 1. Render Gaussians from N source camera viewpoints
 * 2. Generate per-view depth maps from Gaussian positions
 * 3. Pack view patches into atlas textures using guillotine/row-first packing
 * 4. Encode atlas textures (raw RGBA for prototype, H.264/HEVC for production)
 * 5. Generate V3C bitstream metadata for the manifest
 *
 * Note: This prototype generates raw atlas data. Production encoding would
 * use WebCodecs (VideoEncoder) for H.264/HEVC compression.
 *
 * @module volumetric-bridge/nerf-to-gs
 */

import type {
  V3CMIVFallbackConfig,
  V3CMIVFallbackResult,
  V3CBitstreamMetadata,
  MIVEncodingStats,
  MIVAtlasPatch,
  MIVSourceView,
  V3CProfile,
  MIVAtlasConfig,
  NeRFFeatureExtractionResult,
} from './types';

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_ATLAS_CONFIG: MIVAtlasConfig = {
  atlasResolution: [2048, 2048],
  maxAtlasPages: 4,
  packingStrategy: 'row_first',
  minPatchSize: 32,
  patchPadding: 2,
};

const DEFAULT_MIV_CONFIG: V3CMIVFallbackConfig = {
  profile: 'miv_main',
  sourceViews: [],
  atlas: DEFAULT_ATLAS_CONFIG,
  depthBits: 16,
  depthRange: [0.1, 100.0],
  textureCodec: 'h264',
  textureQuality: 22,
  includeOccupancy: true,
  enablePruning: true,
  maxBitrateKbps: 10000,
};

// =============================================================================
// ATLAS PACKING
// =============================================================================

/**
 * Rectangle in the atlas for packing.
 */
interface PackRect {
  x: number;
  y: number;
  width: number;
  height: number;
  viewId: string;
  sourceRegion: [number, number, number, number];
}

/**
 * Row-first atlas packer.
 * Places patches left-to-right, top-to-bottom.
 */
class RowFirstPacker {
  private atlasWidth: number;
  private atlasHeight: number;
  private padding: number;
  private currentX = 0;
  private currentY = 0;
  private rowHeight = 0;
  private currentPage = 0;
  private maxPages: number;
  private placed: PackRect[] = [];

  constructor(atlasWidth: number, atlasHeight: number, padding: number, maxPages: number) {
    this.atlasWidth = atlasWidth;
    this.atlasHeight = atlasHeight;
    this.padding = padding;
    this.maxPages = maxPages;
  }

  /**
   * Place a patch of the given size. Returns placement or null if no room.
   */
  place(width: number, height: number, viewId: string, sourceRegion: [number, number, number, number]): {
    x: number;
    y: number;
    page: number;
  } | null {
    const pw = width + this.padding * 2;
    const ph = height + this.padding * 2;

    // Check if it fits on the current row
    if (this.currentX + pw > this.atlasWidth) {
      // Move to next row
      this.currentX = 0;
      this.currentY += this.rowHeight + this.padding;
      this.rowHeight = 0;
    }

    // Check if it fits on the current page
    if (this.currentY + ph > this.atlasHeight) {
      // Move to next page
      this.currentPage++;
      if (this.currentPage >= this.maxPages) {
        return null; // No more room
      }
      this.currentX = 0;
      this.currentY = 0;
      this.rowHeight = 0;
    }

    const x = this.currentX + this.padding;
    const y = this.currentY + this.padding;

    const rect: PackRect = {
      x, y, width, height, viewId, sourceRegion,
    };
    this.placed.push(rect);

    this.currentX += pw;
    if (ph > this.rowHeight) {
      this.rowHeight = ph;
    }

    return { x, y, page: this.currentPage };
  }

  getPlaced(): readonly PackRect[] {
    return this.placed;
  }

  getPageCount(): number {
    return this.currentPage + 1;
  }
}

// =============================================================================
// SOFTWARE RENDERER (for generating view textures from Gaussians)
// =============================================================================

/**
 * Simple software renderer that splatts Gaussians onto a 2D image plane.
 * Used to generate atlas textures and depth maps from Gaussian data.
 *
 * This is intentionally simple (no sorting, basic splatting) because the
 * MIV fallback is a low-fidelity approximation -- the real quality comes
 * from native GS rendering.
 */
class SoftwareGaussianRenderer {
  /**
   * Render Gaussians from a camera viewpoint into color and depth buffers.
   */
  static render(
    positions: Float32Array,
    colors: Float32Array,
    opacities: Float32Array,
    scales: Float32Array,
    count: number,
    view: MIVSourceView,
    depthRange: [number, number],
  ): { colorBuffer: Uint8Array; depthBuffer: Float32Array } {
    const [w, h] = view.resolution;
    const colorBuffer = new Uint8Array(w * h * 4);
    const depthBuffer = new Float32Array(w * h);
    const [fx, fy, cx, cy] = view.intrinsics;

    // Initialize depth to far plane
    depthBuffer.fill(depthRange[1]);

    // View matrix (4x4, column-major)
    const vm = view.extrinsics;

    for (let i = 0; i < count; i++) {
      const opacity = opacities[i];
      if (opacity < 0.01) continue;

      const px = positions[i * 3];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];

      // Transform to camera space (simplified: multiply by view matrix)
      const camX = vm[0] * px + vm[4] * py + vm[8] * pz + vm[12];
      const camY = vm[1] * px + vm[5] * py + vm[9] * pz + vm[13];
      const camZ = vm[2] * px + vm[6] * py + vm[10] * pz + vm[14];

      // Skip behind camera
      if (camZ <= depthRange[0] || camZ >= depthRange[1]) continue;

      // Project to screen
      const invZ = 1.0 / camZ;
      const screenX = Math.round(fx * camX * invZ + cx);
      const screenY = Math.round(fy * camY * invZ + cy);

      // Compute splat radius in pixels
      const avgScale = (scales[i * 3] + scales[i * 3 + 1] + scales[i * 3 + 2]) / 3;
      const pixelRadius = Math.max(1, Math.round(fx * avgScale * invZ));
      const radiusClamped = Math.min(pixelRadius, 32); // Prevent huge splats

      // Rasterize splat as a circle
      for (let dy = -radiusClamped; dy <= radiusClamped; dy++) {
        for (let dx = -radiusClamped; dx <= radiusClamped; dx++) {
          const sx = screenX + dx;
          const sy = screenY + dy;
          if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;

          const dist2 = dx * dx + dy * dy;
          const radius2 = radiusClamped * radiusClamped;
          if (dist2 > radius2) continue;

          // Gaussian falloff
          const alpha = opacity * Math.exp(-2.0 * dist2 / Math.max(1, radius2));
          if (alpha < 0.01) continue;

          const pixIdx = sy * w + sx;

          // Depth test (front-to-back)
          if (camZ < depthBuffer[pixIdx]) {
            depthBuffer[pixIdx] = camZ;

            // Alpha-blend color
            const oldAlpha = colorBuffer[pixIdx * 4 + 3] / 255;
            const blendAlpha = alpha + oldAlpha * (1 - alpha);

            if (blendAlpha > 0.001) {
              const invBlend = 1.0 / blendAlpha;
              colorBuffer[pixIdx * 4] = Math.round(
                (colors[i * 4] * alpha + (colorBuffer[pixIdx * 4] / 255) * oldAlpha * (1 - alpha)) * invBlend * 255,
              );
              colorBuffer[pixIdx * 4 + 1] = Math.round(
                (colors[i * 4 + 1] * alpha + (colorBuffer[pixIdx * 4 + 1] / 255) * oldAlpha * (1 - alpha)) * invBlend * 255,
              );
              colorBuffer[pixIdx * 4 + 2] = Math.round(
                (colors[i * 4 + 2] * alpha + (colorBuffer[pixIdx * 4 + 2] / 255) * oldAlpha * (1 - alpha)) * invBlend * 255,
              );
              colorBuffer[pixIdx * 4 + 3] = Math.round(blendAlpha * 255);
            }
          }
        }
      }
    }

    return { colorBuffer, depthBuffer };
  }

  /**
   * Generate an occupancy map (1 bit per pixel: occupied = 1, empty = 0).
   */
  static generateOccupancy(
    colorBuffer: Uint8Array,
    width: number,
    height: number,
  ): Uint8Array {
    const occupancy = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      occupancy[i] = colorBuffer[i * 4 + 3] > 10 ? 255 : 0;
    }
    return occupancy;
  }
}

// =============================================================================
// V3C MIV FALLBACK ENCODER
// =============================================================================

/**
 * Encodes Gaussian splat data into V3C MIV format for legacy decoder compatibility.
 *
 * Usage:
 * ```typescript
 * const encoder = new V3CMIVFallbackEncoder();
 *
 * const views = generateCameraViews(8); // 8 cameras around the scene
 * const result = await encoder.encode(gaussianData, {
 *   profile: 'miv_main',
 *   sourceViews: views,
 *   atlas: { atlasResolution: [2048, 2048], maxAtlasPages: 4 },
 *   depthBits: 16,
 *   depthRange: [0.1, 100],
 *   textureCodec: 'raw',
 *   textureQuality: 22,
 *   includeOccupancy: true,
 *   enablePruning: true,
 *   maxBitrateKbps: 10000,
 * });
 *
 * // result.atlasTextures - packed view textures
 * // result.atlasDepths - packed depth maps
 * // result.v3cMetadata - bitstream metadata for the manifest
 * ```
 */
export class V3CMIVFallbackEncoder {
  private onProgress?: (stage: string, progress: number) => void;

  constructor(onProgress?: (stage: string, progress: number) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Encode Gaussian data into V3C MIV format.
   */
  async encode(
    features: NeRFFeatureExtractionResult,
    config?: Partial<V3CMIVFallbackConfig>,
  ): Promise<V3CMIVFallbackResult> {
    const cfg: V3CMIVFallbackConfig = {
      ...DEFAULT_MIV_CONFIG,
      atlas: { ...DEFAULT_ATLAS_CONFIG, ...config?.atlas },
      ...config,
    };
    const startTime = performance.now();

    if (cfg.sourceViews.length === 0) {
      throw new Error('V3C MIV encoding requires at least one source view');
    }

    // ── Step 1: Render from each source view ──────────────────────────────
    this.onProgress?.('rendering_views', 0);

    const renderedViews: Array<{
      view: MIVSourceView;
      colorBuffer: Uint8Array;
      depthBuffer: Float32Array;
      occupancy?: Uint8Array;
    }> = [];

    for (let v = 0; v < cfg.sourceViews.length; v++) {
      const view = cfg.sourceViews[v];

      const { colorBuffer, depthBuffer } = SoftwareGaussianRenderer.render(
        features.positions,
        features.colors,
        features.opacities,
        features.scales,
        features.count,
        view,
        cfg.depthRange,
      );

      const occupancy = cfg.includeOccupancy
        ? SoftwareGaussianRenderer.generateOccupancy(
            colorBuffer,
            view.resolution[0],
            view.resolution[1],
          )
        : undefined;

      renderedViews.push({ view, colorBuffer, depthBuffer, occupancy });

      this.onProgress?.('rendering_views', (v + 1) / cfg.sourceViews.length);
    }

    // ── Step 2: Pruning (remove redundant non-basic view patches) ─────────
    this.onProgress?.('pruning', 0);

    let prunedCount = 0;
    const viewsToEncode = cfg.enablePruning
      ? this.pruneViews(renderedViews, cfg)
      : renderedViews;

    if (cfg.enablePruning) {
      prunedCount = renderedViews.length - viewsToEncode.length;
    }

    this.onProgress?.('pruning', 1);

    // ── Step 3: Pack view patches into atlas pages ────────────────────────
    this.onProgress?.('atlas_packing', 0);

    const [atlasW, atlasH] = cfg.atlas.atlasResolution;
    const packer = new RowFirstPacker(
      atlasW,
      atlasH,
      cfg.atlas.patchPadding,
      cfg.atlas.maxAtlasPages,
    );

    const patches: MIVAtlasPatch[] = [];

    for (const rv of viewsToEncode) {
      const [vw, vh] = rv.view.resolution;

      // For simplicity, each view is one patch (production would split into smaller patches)
      const placement = packer.place(
        vw,
        vh,
        rv.view.viewId,
        [0, 0, vw, vh],
      );

      if (placement) {
        patches.push({
          sourceViewId: rv.view.viewId,
          sourceRegion: [0, 0, vw, vh],
          atlasPosition: [placement.x, placement.y],
          atlasSize: [vw, vh],
          atlasPage: placement.page,
          rotation: 0,
          depthRange: cfg.depthRange,
        });
      }
    }

    this.onProgress?.('atlas_packing', 1);

    // ── Step 4: Render atlas textures ─────────────────────────────────────
    this.onProgress?.('atlas_rendering', 0);

    const pageCount = packer.getPageCount();
    const atlasTextures: Uint8Array[] = [];
    const atlasDepths: Uint8Array[] = [];
    const atlasOccupancy: Uint8Array[] = [];

    for (let page = 0; page < pageCount; page++) {
      const textureAtlas = new Uint8Array(atlasW * atlasH * 4);
      const depthAtlas = new Uint8Array(atlasW * atlasH * 2); // 16-bit depth

      // Copy patches for this page
      const pagePatches = patches.filter(p => p.atlasPage === page);

      for (const patch of pagePatches) {
        const rv = viewsToEncode.find(v => v.view.viewId === patch.sourceViewId);
        if (!rv) continue;

        const [sw, sh] = rv.view.resolution;
        const [ax, ay] = patch.atlasPosition;
        const [pw, ph] = patch.atlasSize;

        // Copy color pixels
        for (let y = 0; y < ph; y++) {
          for (let x = 0; x < pw; x++) {
            const srcIdx = (y * sw + x) * 4;
            const dstIdx = ((ay + y) * atlasW + (ax + x)) * 4;
            textureAtlas[dstIdx] = rv.colorBuffer[srcIdx];
            textureAtlas[dstIdx + 1] = rv.colorBuffer[srcIdx + 1];
            textureAtlas[dstIdx + 2] = rv.colorBuffer[srcIdx + 2];
            textureAtlas[dstIdx + 3] = rv.colorBuffer[srcIdx + 3];
          }
        }

        // Copy depth pixels (quantize to 16-bit)
        const [near, far] = cfg.depthRange;
        const depthScale = 65535 / (far - near);
        for (let y = 0; y < ph; y++) {
          for (let x = 0; x < pw; x++) {
            const srcIdx = y * sw + x;
            const depth = rv.depthBuffer[srcIdx];
            const quantized = Math.round(Math.max(0, Math.min(65535, (depth - near) * depthScale)));
            const dstIdx = ((ay + y) * atlasW + (ax + x)) * 2;
            depthAtlas[dstIdx] = quantized & 0xFF;
            depthAtlas[dstIdx + 1] = (quantized >> 8) & 0xFF;
          }
        }
      }

      atlasTextures.push(textureAtlas);
      atlasDepths.push(depthAtlas);

      if (cfg.includeOccupancy) {
        const occAtlas = new Uint8Array(atlasW * atlasH);
        for (const patch of pagePatches) {
          const rv = viewsToEncode.find(v => v.view.viewId === patch.sourceViewId);
          if (!rv?.occupancy) continue;

          const [sw] = rv.view.resolution;
          const [ax, ay] = patch.atlasPosition;
          const [pw, ph] = patch.atlasSize;

          for (let y = 0; y < ph; y++) {
            for (let x = 0; x < pw; x++) {
              occAtlas[(ay + y) * atlasW + (ax + x)] = rv.occupancy[y * sw + x];
            }
          }
        }
        atlasOccupancy.push(occAtlas);
      }

      this.onProgress?.('atlas_rendering', (page + 1) / pageCount);
    }

    // ── Step 5: Compute metadata and stats ────────────────────────────────
    let totalSizeBytes = 0;
    for (const tex of atlasTextures) totalSizeBytes += tex.byteLength;
    for (const dep of atlasDepths) totalSizeBytes += dep.byteLength;
    for (const occ of atlasOccupancy) totalSizeBytes += occ.byteLength;

    // Compute atlas utilization
    let usedPixels = 0;
    const totalPixels = atlasW * atlasH * pageCount;
    for (const patch of patches) {
      usedPixels += patch.atlasSize[0] * patch.atlasSize[1];
    }
    const atlasUtilization = totalPixels > 0 ? usedPixels / totalPixels : 0;

    const basicViewCount = cfg.sourceViews.filter(v => v.isBasicView).length;

    const v3cMetadata: V3CBitstreamMetadata = {
      profile: cfg.profile,
      atlasCount: pageCount,
      atlasResolution: cfg.atlas.atlasResolution,
      sourceViewCount: cfg.sourceViews.length,
      basicViewCount,
      patchCount: patches.length,
      depthBits: cfg.depthBits,
      depthRange: cfg.depthRange,
      textureCodec: cfg.textureCodec,
      totalSizeBytes,
    };

    const encodingTimeMs = performance.now() - startTime;
    const durationSec = 1; // Single-frame for prototype
    const bitrateKbps = (totalSizeBytes * 8) / (durationSec * 1000);

    const stats: MIVEncodingStats = {
      encodingTimeMs,
      atlasUtilization,
      patchCount: patches.length,
      prunedPatchCount: prunedCount,
      totalSizeBytes,
      bitrateKbps,
    };

    return {
      atlasTextures,
      atlasDepths,
      atlasOccupancy: cfg.includeOccupancy ? atlasOccupancy : undefined,
      patches,
      v3cMetadata,
      stats,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Prune redundant non-basic views.
   * A view is prunable if its content is well-represented by nearby basic views.
   */
  private pruneViews(
    renderedViews: Array<{
      view: MIVSourceView;
      colorBuffer: Uint8Array;
      depthBuffer: Float32Array;
      occupancy?: Uint8Array;
    }>,
    _config: V3CMIVFallbackConfig,
  ): typeof renderedViews {
    // Keep all basic views
    const basicViews = renderedViews.filter(rv => rv.view.isBasicView);
    const additionalViews = renderedViews.filter(rv => !rv.view.isBasicView);

    // For prototype: keep all views (production would compute view-overlap metrics)
    // A full implementation would:
    // 1. Compute per-pixel visibility overlap between views
    // 2. Remove additional views whose unique contribution < threshold
    // 3. Re-assign pruned patches to nearest basic view

    return [...basicViews, ...additionalViews];
  }
}

// =============================================================================
// HELPER: Generate Camera Views Around Scene
// =============================================================================

/**
 * Generate N camera views arranged in a circle around a scene center.
 * Useful for creating source views for MIV encoding.
 */
export function generateOrbitalViews(
  center: [number, number, number],
  radius: number,
  viewCount: number,
  resolution: [number, number] = [512, 512],
  fov = 60,
): MIVSourceView[] {
  const views: MIVSourceView[] = [];
  const halfW = resolution[0] / 2;
  const halfH = resolution[1] / 2;
  const f = halfW / Math.tan((fov * Math.PI) / 360);

  for (let i = 0; i < viewCount; i++) {
    const angle = (i / viewCount) * Math.PI * 2;
    const camX = center[0] + radius * Math.cos(angle);
    const camY = center[1];
    const camZ = center[2] + radius * Math.sin(angle);

    // Look-at matrix (camera at [camX, camY, camZ] looking at center)
    const fwd = [
      center[0] - camX,
      center[1] - camY,
      center[2] - camZ,
    ];
    const fwdLen = Math.sqrt(fwd[0] * fwd[0] + fwd[1] * fwd[1] + fwd[2] * fwd[2]);
    fwd[0] /= fwdLen; fwd[1] /= fwdLen; fwd[2] /= fwdLen;

    const up = [0, 1, 0];
    const right = [
      up[1] * fwd[2] - up[2] * fwd[1],
      up[2] * fwd[0] - up[0] * fwd[2],
      up[0] * fwd[1] - up[1] * fwd[0],
    ];
    const rightLen = Math.sqrt(right[0] * right[0] + right[1] * right[1] + right[2] * right[2]);
    right[0] /= rightLen; right[1] /= rightLen; right[2] /= rightLen;

    const realUp = [
      fwd[1] * right[2] - fwd[2] * right[1],
      fwd[2] * right[0] - fwd[0] * right[2],
      fwd[0] * right[1] - fwd[1] * right[0],
    ];

    // Column-major 4x4 view matrix
    const extrinsics = new Float32Array([
      right[0], realUp[0], -fwd[0], 0,
      right[1], realUp[1], -fwd[1], 0,
      right[2], realUp[2], -fwd[2], 0,
      -(right[0] * camX + right[1] * camY + right[2] * camZ),
      -(realUp[0] * camX + realUp[1] * camY + realUp[2] * camZ),
      -(-fwd[0] * camX + -fwd[1] * camY + -fwd[2] * camZ),
      1,
    ]);

    views.push({
      viewId: `view_${i}`,
      intrinsics: [f, f, halfW, halfH],
      extrinsics,
      resolution,
      isBasicView: i < Math.ceil(viewCount / 2), // First half are basic views
    });
  }

  return views;
}
