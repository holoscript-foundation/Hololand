/**
 * usePoseDetection — React hook wrapping MediaPipeDetector
 *
 * Provides real-time skeleton tracking from camera/video input.
 * Auto-initializes MediaPipe, runs detection loop, and cleans up on unmount.
 *
 * @module ar-hooks
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Re-export relevant types from @hololand/ar-detection
export interface Keypoint2D {
  x: number;
  y: number;
  confidence: number;
}

export interface Keypoint3D {
  x: number;
  y: number;
  z: number;
  confidence: number;
}

export interface Skeleton2D {
  keypoints: Keypoint2D[];
}

export interface Skeleton3D {
  keypoints: Keypoint3D[];
}

export interface PersonDetection {
  id: number;
  skeleton2D: Skeleton2D;
  skeleton3D?: Skeleton3D;
  mask?: Uint8Array;
  maskSize?: { width: number; height: number };
}

export interface DetectionResult {
  persons: PersonDetection[];
  timestamp: number;
  processingTime: number;
  imageSize: { width: number; height: number };
}

export interface PoseDetectionConfig {
  numPoses?: number;
  modelAssetPath?: string;
  delegate?: 'CPU' | 'GPU';
  targetFps?: number;
  smoothing?: boolean;
}

export interface PoseDetectionState {
  persons: PersonDetection[];
  isReady: boolean;
  isDetecting: boolean;
  processingTime: number;
  error: string | null;
  start: (video: HTMLVideoElement) => void;
  stop: () => void;
}

/**
 * React hook for real-time pose detection via MediaPipe.
 *
 * Usage:
 * ```tsx
 * const { persons, isReady, start, stop } = usePoseDetection({ numPoses: 2 });
 * // When video element is ready:
 * start(videoRef.current);
 * ```
 */
export function usePoseDetection(config?: PoseDetectionConfig): PoseDetectionState {
  const [persons, setPersons] = useState<PersonDetection[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const detectorRef = useRef<any>(null);
  const rafIdRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Initialize detector lazily
  const initDetector = useCallback(async () => {
    if (detectorRef.current) return;

    try {
      const { MediaPipeDetector } = await import('@hololand/ar-detection');
      const detector = new MediaPipeDetector({
        numPoses: configRef.current?.numPoses ?? 1,
        modelAssetPath: configRef.current?.modelAssetPath,
        delegate: configRef.current?.delegate ?? 'GPU',
      });
      await detector.initialize();
      detectorRef.current = detector;
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize pose detector');
    }
  }, []);

  // Detection loop
  const runDetectionLoop = useCallback(() => {
    const targetInterval = 1000 / (configRef.current?.targetFps ?? 30);
    let lastTime = 0;

    const loop = async (timestamp: number) => {
      if (!detectorRef.current || !videoRef.current) return;

      if (timestamp - lastTime >= targetInterval) {
        lastTime = timestamp;

        try {
          const result: DetectionResult = await detectorRef.current.detectForVideo(
            videoRef.current,
            timestamp,
          );
          setPersons(result.persons);
          setProcessingTime(result.processingTime);
        } catch {
          // Skip frame on detection error
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(async (video: HTMLVideoElement) => {
    videoRef.current = video;
    await initDetector();
    setIsDetecting(true);
    runDetectionLoop();
  }, [initDetector, runDetectionLoop]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    setIsDetecting(false);
    setPersons([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      if (detectorRef.current) {
        detectorRef.current.dispose?.();
        detectorRef.current = null;
      }
    };
  }, []);

  return { persons, isReady, isDetecting, processingTime, error, start, stop };
}
