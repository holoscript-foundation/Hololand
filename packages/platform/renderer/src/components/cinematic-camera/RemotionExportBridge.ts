/**
 * RemotionExportBridge
 *
 * Bridge between the CinematicPathEngine and Remotion's video export pipeline.
 * Generates frame-by-frame camera state data that Remotion compositions
 * consume to render each video frame.
 *
 * ARCHITECTURE:
 * ```
 *   CinematicPathEngine
 *        |
 *        v
 *   RemotionExportBridge
 *        |
 *        +---> generateCompositionProps()  -> Remotion <Composition> props
 *        +---> evaluateFrame(n)            -> Camera state for frame n
 *        +---> exportToRemotionBundle()    -> Serialized bundle for SSR
 *        +---> startBrowserExport()        -> Client-side MediaRecorder export
 * ```
 *
 * TWO EXPORT MODES:
 *
 * 1. REMOTION SSR (Server-Side Rendering):
 *    Requires Remotion CLI / Lambda. The bridge generates a composition
 *    config and serialized keyframe data. The host application calls
 *    the Remotion render function with these props.
 *
 * 2. CLIENT-SIDE CAPTURE (Browser-Only Fallback):
 *    Uses MediaRecorder API to capture the Three.js canvas stream.
 *    Lower quality than Remotion but works without a server.
 *    Renders each frame by driving the SpectatorCameraController
 *    through the timeline at the target FPS.
 *
 * @module cinematic-camera/RemotionExportBridge
 */

import { CinematicPathEngine } from './CinematicPathEngine';

import type {
  RemotionExportConfig,
  RemotionRenderRequest,
  RemotionRenderResult,
  ExportProgress,
  EvaluatedCameraState,
  VideoResolutionPreset,
} from './types';

import {
  DEFAULT_REMOTION_EXPORT,
  DEFAULT_EXPORT_PROGRESS,
  VIDEO_RESOLUTION_PRESETS,
} from './types';

// =============================================================================
// EXPORT BRIDGE CLASS
// =============================================================================

export class RemotionExportBridge {
  private engine: CinematicPathEngine;
  private config: RemotionExportConfig;
  private progress: ExportProgress;
  private abortController: AbortController | null = null;
  private onProgressCallback?: (progress: ExportProgress) => void;

  constructor(
    engine: CinematicPathEngine,
    config?: Partial<RemotionExportConfig>,
  ) {
    this.engine = engine;
    this.config = { ...DEFAULT_REMOTION_EXPORT, ...config };
    this.progress = { ...DEFAULT_EXPORT_PROGRESS };
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Set the export configuration.
   */
  setConfig(config: Partial<RemotionExportConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get the current export configuration.
   */
  getConfig(): Readonly<RemotionExportConfig> {
    return this.config;
  }

  /**
   * Set the progress callback.
   */
  onProgress(callback: (progress: ExportProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Get the current export progress.
   */
  getProgress(): Readonly<ExportProgress> {
    return this.progress;
  }

  /**
   * Get the resolved export dimensions (width x height).
   */
  getResolution(): { width: number; height: number } {
    if (this.config.resolution === 'custom') {
      return {
        width: this.config.customWidth,
        height: this.config.customHeight,
      };
    }
    const preset = VIDEO_RESOLUTION_PRESETS[this.config.resolution as Exclude<VideoResolutionPreset, 'custom'>];
    return preset
      ? { width: preset.width, height: preset.height }
      : { width: 1920, height: 1080 };
  }

  /**
   * Calculate total frames for the current sequence at the configured FPS.
   */
  getTotalFrames(): number {
    return this.engine.getTotalFrames(this.config.fps);
  }

  /**
   * Get the estimated file size in bytes (rough approximation).
   * Based on resolution, duration, and CRF.
   */
  estimateFileSize(): number {
    const { width, height } = this.getResolution();
    const duration = this.engine.getDuration();
    const pixelsPerFrame = width * height;
    const fps = this.config.fps;

    // Rough bitrate estimation based on CRF
    // CRF 18 = ~high quality, CRF 28 = ~medium, CRF 38 = ~low
    const crfFactor = Math.max(0.1, 1.0 - (this.config.crf - 18) * 0.04);
    const baseBitsPerPixel = 0.1 * crfFactor;
    const bitrate = pixelsPerFrame * baseBitsPerPixel * fps;
    const totalBits = bitrate * duration;

    return Math.round(totalBits / 8);
  }

  /**
   * Generate a filename from the template.
   */
  generateFilename(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    let ext = 'mp4';
    switch (this.config.format) {
      case 'webm': ext = 'webm'; break;
      case 'gif': ext = 'gif'; break;
      case 'png-sequence': ext = 'zip'; break;
    }

    return this.config.filenameTemplate
      .replace('{date}', date)
      .replace('{time}', time) + `.${ext}`;
  }

  /**
   * Generate the Remotion composition props for SSR.
   * This is the data that gets passed to the Remotion <Composition>.
   */
  generateCompositionProps(): RemotionRenderRequest {
    const { width, height } = this.getResolution();
    const totalFrames = this.getTotalFrames();
    const duration = this.engine.getDuration();

    return {
      compositionId: this.config.compositionId,
      format: this.config.format,
      width,
      height,
      fps: this.config.fps,
      totalFrames,
      durationInSeconds: duration,
      keyframesJson: JSON.stringify(this.engine.getSequence().keyframes),
      codec: this.config.codec,
      crf: this.config.crf,
      pixelFormat: this.config.pixelFormat,
      includeAudio: this.config.includeAudio,
      audioPath: this.config.audioPath,
      applyPostProcessing: this.config.applyPostProcessing,
      supersampleFactor: this.config.supersampleFactor,
      outputFilename: this.generateFilename(),
    };
  }

  /**
   * Evaluate the camera state for a specific frame.
   * This is called by the Remotion composition on each frame.
   */
  evaluateFrame(frame: number): EvaluatedCameraState {
    return this.engine.evaluateAtFrame(frame, this.config.fps);
  }

  /**
   * Export using a Remotion server-side render function.
   * The render function is provided by the host application.
   *
   * @param renderFn The Remotion render function (e.g., from @remotion/renderer)
   * @returns The render result
   */
  async exportWithRemotion(
    renderFn: (config: RemotionRenderRequest) => Promise<RemotionRenderResult>,
  ): Promise<RemotionRenderResult> {
    this.abortController = new AbortController();
    const startTime = performance.now();

    this.updateProgress({
      status: 'preparing',
      currentFrame: 0,
      totalFrames: this.getTotalFrames(),
      percentage: 0,
      estimatedTimeRemaining: 0,
      elapsedTime: 0,
      errorMessage: null,
      outputUrl: null,
      outputSizeBytes: 0,
    });

    try {
      const compositionProps = this.generateCompositionProps();

      // Attach progress callback
      compositionProps.onProgress = (frame: number, totalFrames: number) => {
        if (this.abortController?.signal.aborted) return;

        const elapsed = (performance.now() - startTime) / 1000;
        const framesPerSecond = frame / Math.max(elapsed, 0.001);
        const remainingFrames = totalFrames - frame;
        const eta = remainingFrames / Math.max(framesPerSecond, 0.001);

        this.updateProgress({
          status: 'rendering',
          currentFrame: frame,
          totalFrames,
          percentage: Math.round((frame / totalFrames) * 100),
          estimatedTimeRemaining: eta,
          elapsedTime: elapsed,
        });
      };

      this.updateProgress({ status: 'rendering' });

      const result = await renderFn(compositionProps);

      if (result.success) {
        this.updateProgress({
          status: 'complete',
          percentage: 100,
          currentFrame: this.getTotalFrames(),
          elapsedTime: (performance.now() - startTime) / 1000,
          estimatedTimeRemaining: 0,
          outputUrl: result.outputUrl,
          outputSizeBytes: result.sizeBytes,
        });
      } else {
        this.updateProgress({
          status: 'error',
          errorMessage: result.error ?? 'Unknown render error',
        });
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed';
      this.updateProgress({
        status: 'error',
        errorMessage: errorMsg,
        elapsedTime: (performance.now() - startTime) / 1000,
      });

      return {
        success: false,
        outputUrl: '',
        sizeBytes: 0,
        renderTimeSeconds: (performance.now() - startTime) / 1000,
        error: errorMsg,
      };
    }
  }

  /**
   * Export using the browser-side MediaRecorder API.
   * Fallback for when Remotion SSR is not available.
   *
   * Captures from the provided canvas element by driving the camera
   * controller through the timeline and recording each frame.
   *
   * @param canvas The Three.js renderer canvas
   * @param applyCamera Callback to apply camera state to the scene
   * @param renderFrame Callback to render a single frame
   * @returns Blob of the recorded video
   */
  async exportWithMediaRecorder(
    canvas: HTMLCanvasElement,
    applyCamera: (state: EvaluatedCameraState) => void,
    renderFrame: () => void,
  ): Promise<Blob> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const startTime = performance.now();
    const totalFrames = this.getTotalFrames();
    const fps = this.config.fps;
    const frameDurationMs = 1000 / fps;

    this.updateProgress({
      status: 'preparing',
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      estimatedTimeRemaining: 0,
      elapsedTime: 0,
      errorMessage: null,
      outputUrl: null,
      outputSizeBytes: 0,
    });

    // Determine MIME type
    let mimeType = 'video/webm;codecs=vp9';
    if (this.config.format === 'mp4') {
      // Browser MediaRecorder typically supports webm, not mp4 natively
      // We'll use webm as the container
      mimeType = 'video/webm;codecs=vp9';
    } else if (this.config.format === 'gif') {
      mimeType = 'video/webm;codecs=vp9'; // Will need post-processing for GIF
    }

    return new Promise<Blob>((resolve, reject) => {
      const stream = canvas.captureStream(0); // 0 = manual frame capture
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const elapsed = (performance.now() - startTime) / 1000;

        this.updateProgress({
          status: 'complete',
          percentage: 100,
          currentFrame: totalFrames,
          elapsedTime: elapsed,
          estimatedTimeRemaining: 0,
          outputSizeBytes: blob.size,
        });

        // Create download URL
        const url = URL.createObjectURL(blob);
        this.updateProgress({ outputUrl: url });

        resolve(blob);
      };

      recorder.onerror = (e) => {
        const errorMsg = `MediaRecorder error: ${(e as ErrorEvent).message || 'unknown'}`;
        this.updateProgress({
          status: 'error',
          errorMessage: errorMsg,
        });
        reject(new Error(errorMsg));
      };

      recorder.start();
      this.updateProgress({ status: 'rendering' });

      // Render frames sequentially
      let currentFrame = 0;

      const renderNextFrame = () => {
        if (signal.aborted) {
          recorder.stop();
          reject(new Error('Export cancelled'));
          return;
        }

        if (currentFrame >= totalFrames) {
          this.updateProgress({ status: 'encoding' });
          recorder.stop();
          return;
        }

        // Evaluate camera at this frame
        const cameraState = this.evaluateFrame(currentFrame);
        applyCamera(cameraState);
        renderFrame();

        // Request frame from the captured stream
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && 'requestFrame' in videoTrack) {
          (videoTrack as any).requestFrame();
        }

        currentFrame++;

        // Update progress
        const elapsed = (performance.now() - startTime) / 1000;
        const framesPerSecond = currentFrame / Math.max(elapsed, 0.001);
        const remainingFrames = totalFrames - currentFrame;
        const eta = remainingFrames / Math.max(framesPerSecond, 0.001);

        this.updateProgress({
          currentFrame,
          percentage: Math.round((currentFrame / totalFrames) * 100),
          estimatedTimeRemaining: eta,
          elapsedTime: elapsed,
        });

        // Schedule next frame (use setTimeout to avoid blocking the main thread)
        setTimeout(renderNextFrame, frameDurationMs * 0.1);
      };

      renderNextFrame();
    });
  }

  /**
   * Export as a PNG sequence.
   * Renders each frame and collects as individual PNG data URLs.
   *
   * @param canvas The Three.js renderer canvas
   * @param applyCamera Callback to apply camera state
   * @param renderFrame Callback to render a frame
   * @returns Array of PNG data URLs (one per frame)
   */
  async exportAsPngSequence(
    canvas: HTMLCanvasElement,
    applyCamera: (state: EvaluatedCameraState) => void,
    renderFrame: () => void,
  ): Promise<string[]> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const startTime = performance.now();
    const totalFrames = this.getTotalFrames();
    const frames: string[] = [];

    this.updateProgress({
      status: 'rendering',
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      estimatedTimeRemaining: 0,
      elapsedTime: 0,
      errorMessage: null,
      outputUrl: null,
      outputSizeBytes: 0,
    });

    for (let i = 0; i < totalFrames; i++) {
      if (signal.aborted) {
        throw new Error('Export cancelled');
      }

      const cameraState = this.evaluateFrame(i);
      applyCamera(cameraState);
      renderFrame();

      const dataUrl = canvas.toDataURL('image/png');
      frames.push(dataUrl);

      const elapsed = (performance.now() - startTime) / 1000;
      const fps = (i + 1) / Math.max(elapsed, 0.001);
      const eta = (totalFrames - i - 1) / Math.max(fps, 0.001);

      this.updateProgress({
        currentFrame: i + 1,
        percentage: Math.round(((i + 1) / totalFrames) * 100),
        estimatedTimeRemaining: eta,
        elapsedTime: elapsed,
      });

      // Yield to the event loop periodically
      if (i % 10 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    this.updateProgress({
      status: 'complete',
      percentage: 100,
      currentFrame: totalFrames,
      elapsedTime: (performance.now() - startTime) / 1000,
      estimatedTimeRemaining: 0,
    });

    return frames;
  }

  /**
   * Cancel an in-progress export.
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.updateProgress({
        status: 'idle',
        errorMessage: 'Export cancelled by user',
      });
    }
  }

  /**
   * Reset progress state.
   */
  resetProgress(): void {
    this.progress = { ...DEFAULT_EXPORT_PROGRESS };
    this.emitProgress();
  }

  // ===========================================================================
  // SERIALIZATION (for passing to Remotion compositions)
  // ===========================================================================

  /**
   * Serialize the entire sequence + config to a JSON string.
   * This can be passed as inputProps to a Remotion composition.
   */
  serializeForRemotion(): string {
    return JSON.stringify({
      sequence: this.engine.getSequence(),
      config: this.config,
      resolution: this.getResolution(),
      totalFrames: this.getTotalFrames(),
    });
  }

  /**
   * Generate a Remotion composition component definition.
   * Returns a string of JSX/TSX code that can be used as a Remotion composition.
   */
  generateCompositionCode(): string {
    const { width, height } = this.getResolution();
    const totalFrames = this.getTotalFrames();
    const fps = this.config.fps;

    return `
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion';
import { Canvas } from '@react-three/fiber';

// Camera keyframes (serialized from CinematicPathEngine)
const KEYFRAMES_JSON = ${JSON.stringify(JSON.stringify(this.engine.getSequence().keyframes))};

export const CinematicExport: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  // Re-create path engine from serialized keyframes
  // (In production, import CinematicPathEngine from @hololand/renderer)
  const keyframes = JSON.parse(KEYFRAMES_JSON);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Canvas
        camera={{
          // Camera state would be driven by CinematicPathEngine.evaluate(time)
          position: [5, 3, 5],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        style={{ width: ${width}, height: ${height} }}
      >
        {/* Your scene contents here */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
      </Canvas>
    </AbsoluteFill>
  );
};

// Remotion configuration
export const config = {
  id: '${this.config.compositionId}',
  component: CinematicExport,
  durationInFrames: ${totalFrames},
  fps: ${fps},
  width: ${width},
  height: ${height},
};
`.trim();
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private updateProgress(partial: Partial<ExportProgress>): void {
    this.progress = { ...this.progress, ...partial };
    this.emitProgress();
  }

  private emitProgress(): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({ ...this.progress });
    }
  }
}

/**
 * Factory function for creating a RemotionExportBridge.
 */
export function createRemotionExportBridge(
  engine: CinematicPathEngine,
  config?: Partial<RemotionExportConfig>,
): RemotionExportBridge {
  return new RemotionExportBridge(engine, config);
}
