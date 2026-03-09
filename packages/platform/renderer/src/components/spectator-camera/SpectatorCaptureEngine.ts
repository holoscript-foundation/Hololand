/**
 * SpectatorCaptureEngine
 *
 * Scene capture engine for the non-XR spectator camera system.
 * Handles rendering the scene from the spectator camera viewpoint
 * to an offscreen canvas and exporting as PNG/JPEG/WebP images.
 *
 * CAPTURE PIPELINE:
 * ```
 *   Three.js Scene Graph
 *        |
 *        v
 *   [1] Create offscreen canvas at target resolution
 *        |
 *        v
 *   [2] Read the existing canvas via toDataURL / toBlob
 *        |   (preserves current render state including post-processing)
 *        |
 *        v
 *   [3] Scale to target resolution if needed (supersampling)
 *        |
 *        v
 *   [4] Export as PNG/JPEG/WebP with configurable quality
 *        |
 *        v
 *   [5] Generate filename from template
 *        |
 *        +---> CaptureResult (dataUrl + blob + metadata)
 *        +---> Auto-download (optional)
 *        +---> Thumbnail generation (for history)
 * ```
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Capture uses toBlob for efficient memory usage
 * - Thumbnails are generated at 128x128 resolution to save memory
 * - Capture is asynchronous and does not block the render loop
 * - Supersampling renders at Nx resolution, then downscales for AA
 *
 * @module spectator-camera/SpectatorCaptureEngine
 */

import type {
  SpectatorCaptureConfig,
  SpectatorCameraState,
  CaptureResult,
  CaptureHistoryEntry,
  CaptureFormat,
  CaptureResolutionPreset,
} from './types';

import {
  DEFAULT_CAPTURE_CONFIG,
  CAPTURE_RESOLUTION_PRESETS,
} from './types';

// =============================================================================
// THUMBNAIL SIZE
// =============================================================================

const THUMBNAIL_SIZE = 128;

// =============================================================================
// CAPTURE ENGINE CLASS
// =============================================================================

export class SpectatorCaptureEngine {
  private config: SpectatorCaptureConfig;
  private captureCount: number = 0;

  constructor(config?: Partial<SpectatorCaptureConfig>) {
    this.config = { ...DEFAULT_CAPTURE_CONFIG, ...config };
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Capture the current scene from the given canvas.
   *
   * @param sourceCanvas The renderer canvas to capture from
   * @param cameraState Current spectator camera state (for metadata)
   * @returns CaptureResult with image data, blob, and metadata
   */
  async capture(
    sourceCanvas: HTMLCanvasElement,
    cameraState: SpectatorCameraState,
  ): Promise<CaptureResult> {
    const startTime = performance.now();

    // Determine target resolution
    const { width: targetWidth, height: targetHeight } = this.getTargetResolution();

    // Get format MIME type
    const mimeType = this.getMimeType(this.config.format);
    const quality = this.config.format === 'png' ? undefined : this.config.quality;

    // Capture the canvas
    let captureCanvas: HTMLCanvasElement;

    if (
      sourceCanvas.width === targetWidth &&
      sourceCanvas.height === targetHeight &&
      this.config.supersampleFactor <= 1
    ) {
      // Direct capture: canvas is already at target resolution
      captureCanvas = sourceCanvas;
    } else {
      // Scale capture: render to offscreen canvas at target resolution
      captureCanvas = this.createScaledCanvas(sourceCanvas, targetWidth, targetHeight);
    }

    // Generate blob
    const blob = await this.canvasToBlob(captureCanvas, mimeType, quality);

    // Generate data URL
    const dataUrl = captureCanvas.toDataURL(mimeType, quality);

    // Generate filename
    const filename = this.generateFilename();

    // Build result
    const captureTimeMs = performance.now() - startTime;
    this.captureCount++;

    const result: CaptureResult = {
      dataUrl,
      blob,
      width: targetWidth,
      height: targetHeight,
      format: this.config.format,
      sizeBytes: blob.size,
      captureTimeMs,
      filename,
      timestamp: Date.now(),
      cameraState: { ...cameraState },
    };

    // Auto-download
    if (this.config.autoDownload) {
      this.downloadBlob(blob, filename, mimeType);
    }

    // Clean up temporary canvas
    if (captureCanvas !== sourceCanvas) {
      // Allow GC
    }

    return result;
  }

  /**
   * Generate a thumbnail from a capture result.
   */
  generateThumbnail(dataUrl: string, width: number, height: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = THUMBNAIL_SIZE;
    canvas.height = THUMBNAIL_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    const img = new Image();
    img.src = dataUrl;

    // Calculate crop to fit square
    const aspectRatio = width / height;
    let sx = 0, sy = 0, sw = width, sh = height;
    if (aspectRatio > 1) {
      sx = (width - height) / 2;
      sw = height;
    } else {
      sy = (height - width) / 2;
      sh = width;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
    return canvas.toDataURL('image/jpeg', 0.6);
  }

  /**
   * Create a CaptureHistoryEntry from a CaptureResult.
   */
  createHistoryEntry(result: CaptureResult): CaptureHistoryEntry {
    return {
      id: this.generateId(),
      thumbnailDataUrl: this.generateThumbnail(result.dataUrl, result.width, result.height),
      dataUrl: result.dataUrl,
      width: result.width,
      height: result.height,
      format: result.format,
      sizeBytes: result.sizeBytes,
      timestamp: result.timestamp,
      cameraState: result.cameraState,
    };
  }

  /**
   * Download a capture as a file.
   */
  downloadCapture(entry: CaptureHistoryEntry): void {
    const mimeType = this.getMimeType(entry.format);
    // Convert data URL to blob
    const byteString = atob(entry.dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    const filename = `hololand-capture-${new Date(entry.timestamp).toISOString().replace(/[:.]/g, '-')}.${entry.format}`;
    this.downloadBlob(blob, filename, mimeType);
  }

  /**
   * Update capture configuration.
   */
  setConfig(config: Partial<SpectatorCaptureConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get the current capture configuration.
   */
  getConfig(): Readonly<SpectatorCaptureConfig> {
    return this.config;
  }

  /**
   * Get the number of captures taken.
   */
  getCaptureCount(): number {
    return this.captureCount;
  }

  /**
   * Estimate the memory used by a set of history entries (bytes).
   */
  estimateHistoryMemory(entries: CaptureHistoryEntry[]): number {
    return entries.reduce((total, entry) => {
      // Data URL length * 2 (UTF-16) + thumbnail
      return total + entry.dataUrl.length * 2 + entry.thumbnailDataUrl.length * 2;
    }, 0);
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  private getTargetResolution(): { width: number; height: number } {
    if (this.config.resolution === 'custom') {
      return {
        width: this.config.customWidth * this.config.supersampleFactor,
        height: this.config.customHeight * this.config.supersampleFactor,
      };
    }
    const preset = CAPTURE_RESOLUTION_PRESETS[this.config.resolution as Exclude<CaptureResolutionPreset, 'custom'>];
    return {
      width: preset.width * this.config.supersampleFactor,
      height: preset.height * this.config.supersampleFactor,
    };
  }

  private getMimeType(format: CaptureFormat): string {
    switch (format) {
      case 'png': return 'image/png';
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      default: return 'image/png';
    }
  }

  private createScaledCanvas(
    source: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number,
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create 2D context for capture canvas');

    // Enable image smoothing for quality downscale
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw the source canvas scaled to target dimensions
    ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, targetWidth, targetHeight);

    return canvas;
  }

  private canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality?: number,
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        mimeType,
        quality,
      );
    });
  }

  private downloadBlob(blob: Blob, filename: string, _mimeType: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Defer URL revocation to allow download to start
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  private generateFilename(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const resolution = this.config.resolution === 'custom'
      ? `${this.config.customWidth}x${this.config.customHeight}`
      : this.config.resolution;

    let filename = this.config.filenameTemplate
      .replace('{date}', date)
      .replace('{time}', time)
      .replace('{mode}', 'spectator')
      .replace('{resolution}', resolution);

    return `${filename}.${this.config.format}`;
  }

  private generateId(): string {
    return `cap-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Factory function for creating a SpectatorCaptureEngine.
 */
export function createSpectatorCaptureEngine(
  config?: Partial<SpectatorCaptureConfig>,
): SpectatorCaptureEngine {
  return new SpectatorCaptureEngine(config);
}
