/**
 * CameraBridge - Native camera bridge for AR/volumetric capture
 *
 * Provides access to device cameras for AR scene input, volumetric capture,
 * and frame-by-frame image acquisition for spatial computing pipelines.
 *
 * Uses @capacitor/camera plugin API underneath.
 */

import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';

// =============================================================================
// TYPES
// =============================================================================

/** Camera facing direction */
export type CameraFacing = 'front' | 'back';

/** Supported capture resolutions */
export type CameraResolution = '720p' | '1080p' | '4K';

/** Camera configuration for opening the camera */
export interface CameraConfig {
  /** Which camera to use */
  facing: CameraFacing;
  /** Desired capture resolution */
  resolution: CameraResolution;
}

/** Result from a single frame capture */
export interface CapturedFrame {
  /** Base64-encoded image data (JPEG) */
  base64: string;
  /** MIME type of the captured image */
  mimeType: string;
  /** Timestamp of capture (ms since epoch) */
  timestamp: number;
  /** Width in pixels (approximate, based on requested resolution) */
  width: number;
  /** Height in pixels (approximate, based on requested resolution) */
  height: number;
}

/** Camera capabilities reported by the device */
export interface CameraCapabilities {
  /** Whether the front camera is available */
  hasFrontCamera: boolean;
  /** Whether the back camera is available */
  hasBackCamera: boolean;
  /** Available resolutions the device can produce */
  availableResolutions: CameraResolution[];
  /** Whether video capture is supported */
  supportsVideoCapture: boolean;
  /** Whether flash/torch is available */
  hasFlash: boolean;
}

/** Video capture state */
interface VideoCaptureState {
  active: boolean;
  intervalId: ReturnType<typeof setInterval> | null;
  frames: CapturedFrame[];
  startTime: number;
  onFrame?: (frame: CapturedFrame) => void;
}

// =============================================================================
// RESOLUTION MAPPING
// =============================================================================

const RESOLUTION_MAP: Record<CameraResolution, { width: number; height: number; quality: number }> = {
  '720p': { width: 1280, height: 720, quality: 80 },
  '1080p': { width: 1920, height: 1080, quality: 85 },
  '4K': { width: 3840, height: 2160, quality: 90 },
};

// =============================================================================
// CAMERA BRIDGE
// =============================================================================

export class CameraBridge {
  private videoState: VideoCaptureState = {
    active: false,
    intervalId: null,
    frames: [],
    startTime: 0,
  };

  private currentConfig: CameraConfig | null = null;
  private permissionGranted = false;

  /**
   * Request camera permission from the user.
   * Must be called before any camera operations.
   *
   * @returns true if permission was granted, false otherwise
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const status = await Camera.checkPermissions();

      if (status.camera === 'granted') {
        this.permissionGranted = true;
        return true;
      }

      if (status.camera === 'denied') {
        // Permission permanently denied - user must enable in system settings
        this.permissionGranted = false;
        return false;
      }

      // Request permission
      const result = await Camera.requestPermissions({ permissions: ['camera'] });
      this.permissionGranted = result.camera === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('[CameraBridge] Permission request failed:', error);
      this.permissionGranted = false;
      return false;
    }
  }

  /**
   * Open the camera with the specified configuration.
   * Stores the config for subsequent capture operations.
   *
   * @param config - Camera facing direction and resolution
   * @throws Error if camera permission has not been granted
   */
  async openCamera(config: CameraConfig): Promise<void> {
    if (!this.permissionGranted) {
      const granted = await this.requestCameraPermission();
      if (!granted) {
        throw new Error('[CameraBridge] Camera permission not granted. Call requestCameraPermission() first.');
      }
    }

    this.currentConfig = config;

    // Validate resolution
    if (!RESOLUTION_MAP[config.resolution]) {
      throw new Error(`[CameraBridge] Unsupported resolution: ${config.resolution}`);
    }

    console.info('[CameraBridge] Camera opened', {
      facing: config.facing,
      resolution: config.resolution,
    });
  }

  /**
   * Capture a single frame from the camera.
   * Returns the frame as a base64-encoded JPEG image.
   *
   * @returns CapturedFrame with base64 image data
   * @throws Error if camera has not been opened
   */
  async captureFrame(): Promise<CapturedFrame> {
    if (!this.currentConfig) {
      throw new Error('[CameraBridge] Camera not opened. Call openCamera() first.');
    }

    const resolution = RESOLUTION_MAP[this.currentConfig.resolution];
    const direction = this.currentConfig.facing === 'front'
      ? CameraDirection.Front
      : CameraDirection.Rear;

    try {
      const photo = await Camera.getPhoto({
        quality: resolution.quality,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        direction,
        width: resolution.width,
        height: resolution.height,
        correctOrientation: true,
        saveToGallery: false,
      });

      const frame: CapturedFrame = {
        base64: photo.base64String ?? '',
        mimeType: `image/${photo.format || 'jpeg'}`,
        timestamp: Date.now(),
        width: resolution.width,
        height: resolution.height,
      };

      return frame;
    } catch (error) {
      console.error('[CameraBridge] Frame capture failed:', error);
      throw new Error(`[CameraBridge] Failed to capture frame: ${error}`);
    }
  }

  /**
   * Start continuous video capture for volumetric input.
   * Captures frames at approximately 10 FPS and invokes the optional callback
   * for each frame. Frames are also accumulated in an internal buffer.
   *
   * @param onFrame - Optional callback invoked for each captured frame
   * @throws Error if camera has not been opened or capture is already active
   */
  async startVideoCapture(onFrame?: (frame: CapturedFrame) => void): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('[CameraBridge] Camera not opened. Call openCamera() first.');
    }

    if (this.videoState.active) {
      throw new Error('[CameraBridge] Video capture already active. Call stopVideoCapture() first.');
    }

    this.videoState = {
      active: true,
      intervalId: null,
      frames: [],
      startTime: Date.now(),
      onFrame,
    };

    // Capture frames at ~10 FPS interval (100ms)
    // Using a polling approach since Capacitor Camera plugin
    // does not provide a native streaming API
    const captureLoop = async () => {
      if (!this.videoState.active) return;

      try {
        const frame = await this.captureFrame();
        this.videoState.frames.push(frame);

        if (this.videoState.onFrame) {
          this.videoState.onFrame(frame);
        }
      } catch (error) {
        console.warn('[CameraBridge] Frame dropped during video capture:', error);
      }
    };

    this.videoState.intervalId = setInterval(captureLoop, 100);

    console.info('[CameraBridge] Video capture started', {
      facing: this.currentConfig.facing,
      resolution: this.currentConfig.resolution,
    });
  }

  /**
   * Stop continuous video capture.
   *
   * @returns Array of all captured frames during the session
   */
  async stopVideoCapture(): Promise<CapturedFrame[]> {
    if (!this.videoState.active) {
      console.warn('[CameraBridge] No active video capture to stop.');
      return [];
    }

    if (this.videoState.intervalId !== null) {
      clearInterval(this.videoState.intervalId);
    }

    const capturedFrames = [...this.videoState.frames];
    const duration = Date.now() - this.videoState.startTime;

    console.info('[CameraBridge] Video capture stopped', {
      framesCaptured: capturedFrames.length,
      durationMs: duration,
      avgFPS: capturedFrames.length > 0
        ? Math.round((capturedFrames.length / duration) * 1000)
        : 0,
    });

    this.videoState = {
      active: false,
      intervalId: null,
      frames: [],
      startTime: 0,
    };

    return capturedFrames;
  }

  /**
   * Query the device camera capabilities.
   * Returns information about available cameras, resolutions, and features.
   *
   * @returns CameraCapabilities describing what the device supports
   */
  async getCameraCapabilities(): Promise<CameraCapabilities> {
    // Check permissions status to infer camera availability
    let hasFrontCamera = true;
    let hasBackCamera = true;
    let hasFlash = true;

    try {
      const permissions = await Camera.checkPermissions();
      // If permissions are explicitly denied we can still report capabilities,
      // but we note that they may not be usable without permission
      if (permissions.camera === 'denied') {
        console.warn('[CameraBridge] Camera permission denied; capabilities may be limited.');
      }
    } catch {
      // Camera plugin not available on this platform
      hasFrontCamera = false;
      hasBackCamera = false;
      hasFlash = false;
    }

    // All modern mobile devices support at least these resolutions
    const availableResolutions: CameraResolution[] = ['720p', '1080p'];

    // 4K support is common on devices from 2020+
    // We include it optimistically; the plugin will downscale if unsupported
    if (typeof window !== 'undefined' && window.screen) {
      const maxDim = Math.max(window.screen.width, window.screen.height);
      if (maxDim >= 2160) {
        availableResolutions.push('4K');
      }
    }

    return {
      hasFrontCamera,
      hasBackCamera,
      availableResolutions,
      supportsVideoCapture: true,
      hasFlash,
    };
  }

  /**
   * Check whether video capture is currently active.
   */
  isCapturing(): boolean {
    return this.videoState.active;
  }

  /**
   * Clean up resources. Call when the bridge is no longer needed.
   */
  async dispose(): Promise<void> {
    if (this.videoState.active) {
      await this.stopVideoCapture();
    }
    this.currentConfig = null;
    this.permissionGranted = false;
  }
}
