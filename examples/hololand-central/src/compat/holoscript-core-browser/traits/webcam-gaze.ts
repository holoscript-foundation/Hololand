export const DEFAULT_WEBCAM_GAZE_CONFIG = {
  auto_start: false,
  smoothing: 0.5,
  confidence_threshold: 0.35,
  max_ray_angle_degrees: 18,
};

export class WebcamGazeTracker {
  private readonly onError?: (error: Error) => void;

  constructor(options: { onError?: (error: Error) => void } = {}) {
    this.onError = options.onError;
  }

  async start(): Promise<void> {
    const error = new Error('Webcam gaze tracking is unavailable in this browser compat build.');
    this.onError?.(error);
    throw error;
  }

  stop(): void {}

  getStream(): MediaStream | null {
    return null;
  }
}
