/**
 * MediaPipe Pose Detector
 * 
 * MediaPipe's pose detection solution.
 * Uses the @mediapipe/tasks-vision package.
 */

import type {
  DetectorConfig,
  DetectionResult,
  PersonDetection,
  Skeleton2D,
  Skeleton3D,
  Keypoint2D,
  Keypoint3D,
  BoundingBox,
  DepthFrame,
} from '../types';
import { KeypointIndex, KEYPOINT_NAMES, DEFAULT_DETECTOR_CONFIG } from '../types';

// MediaPipe types
type PoseLandmarker = any;
type PoseLandmarkerResult = any;

export interface MediaPipeConfig extends Partial<DetectorConfig> {
  /** Number of poses to detect */
  numPoses?: number;
  /** Model asset path (CDN or local) */
  modelAssetPath?: string;
  /** Delegate: 'CPU' or 'GPU' */
  delegate?: 'CPU' | 'GPU';
}

/**
 * MediaPipe Pose Detector
 * 
 * Uses MediaPipe's pose landmarker for detection.
 */
export class MediaPipeDetector {
  private config: DetectorConfig & MediaPipeConfig;
  private landmarker: PoseLandmarker | null = null;
  private isInitialized: boolean = false;
  private lastProcessingTime: number = 0;

  // Default MediaPipe model URL
  private static readonly DEFAULT_MODEL_PATH = 
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

  constructor(config?: MediaPipeConfig) {
    this.config = {
      ...DEFAULT_DETECTOR_CONFIG,
      model: 'mediapipe',
      numPoses: 4,
      delegate: 'GPU',
      modelAssetPath: MediaPipeDetector.DEFAULT_MODEL_PATH,
      ...config,
    };
  }

  /**
   * Initialize the detector
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const vision = await import('@mediapipe/tasks-vision');
      const { PoseLandmarker, FilesetResolver } = vision;

      // Initialize vision WASM
      const wasmFileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      );

      // Create landmarker
      this.landmarker = await PoseLandmarker.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath: this.config.modelAssetPath,
          delegate: this.config.delegate,
        },
        runningMode: 'VIDEO',
        numPoses: this.config.numPoses,
        minPoseDetectionConfidence: this.config.minConfidence,
        minPosePresenceConfidence: this.config.minConfidence,
        minTrackingConfidence: this.config.minConfidence,
        outputSegmentationMasks: this.config.enableSegmentation,
      });

      this.isInitialized = true;
      console.log('MediaPipe Pose Landmarker initialized');
    } catch (error: any) {
      throw new Error(`Failed to initialize MediaPipe: ${error.message}`);
    }
  }

  /**
   * Detect poses from video frame
   */
  async detectForVideo(
    video: HTMLVideoElement,
    timestamp: number,
    depthFrame?: DepthFrame
  ): Promise<DetectionResult> {
    if (!this.isInitialized || !this.landmarker) {
      await this.initialize();
    }

    const startTime = performance.now();

    // Run detection
    const result: PoseLandmarkerResult = this.landmarker!.detectForVideo(video, timestamp);

    // Convert to our format
    const persons = this.processResults(
      result,
      { width: video.videoWidth, height: video.videoHeight },
      depthFrame
    );

    this.lastProcessingTime = performance.now() - startTime;

    return {
      persons,
      timestamp,
      processingTime: this.lastProcessingTime,
      imageSize: { width: video.videoWidth, height: video.videoHeight },
    };
  }

  /**
   * Detect poses from image
   */
  async detect(
    image: HTMLImageElement | HTMLCanvasElement | ImageData,
    depthFrame?: DepthFrame
  ): Promise<DetectionResult> {
    if (!this.isInitialized || !this.landmarker) {
      await this.initialize();
    }

    const startTime = performance.now();

    // For images, we need to use IMAGE mode
    // This requires re-creating the landmarker or using a separate instance
    // For simplicity, we'll use the video mode with timestamp 0
    
    let element: HTMLImageElement | HTMLCanvasElement;
    let imageSize: { width: number; height: number };

    if (image instanceof ImageData) {
      // Convert ImageData to canvas
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(image, 0, 0);
      element = canvas;
      imageSize = { width: image.width, height: image.height };
    } else {
      element = image;
      imageSize = image instanceof HTMLImageElement
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : { width: image.width, height: image.height };
    }

    // Run detection
    const result: PoseLandmarkerResult = this.landmarker!.detect(element);

    // Convert to our format
    const persons = this.processResults(result, imageSize, depthFrame);

    this.lastProcessingTime = performance.now() - startTime;

    return {
      persons,
      timestamp: Date.now(),
      processingTime: this.lastProcessingTime,
      imageSize,
    };
  }

  /**
   * Process MediaPipe results
   */
  private processResults(
    result: PoseLandmarkerResult,
    imageSize: { width: number; height: number },
    depthFrame?: DepthFrame
  ): PersonDetection[] {
    const persons: PersonDetection[] = [];

    const landmarks = result.landmarks || [];
    const worldLandmarks = result.worldLandmarks || [];
    const masks = result.segmentationMasks || [];

    for (let i = 0; i < landmarks.length; i++) {
      const poseLandmarks = landmarks[i];
      const poseWorldLandmarks = worldLandmarks[i];
      
      // Convert to 2D skeleton
      const skeleton2D = this.landmarksToSkeleton2D(poseLandmarks, imageSize);

      // Filter by confidence
      if (skeleton2D.confidence < this.config.minConfidence) continue;

      const person: PersonDetection = {
        id: i,
        skeleton2D,
      };

      // Add 3D skeleton if world landmarks available
      if (this.config.enable3D && poseWorldLandmarks) {
        person.skeleton3D = this.worldLandmarksToSkeleton3D(
          poseWorldLandmarks,
          skeleton2D
        );
      } else if (this.config.enable3D && depthFrame) {
        // Project 2D to 3D using depth
        person.skeleton3D = this.project2Dto3D(skeleton2D, depthFrame);
      }

      // Add segmentation mask if available
      if (masks[i]) {
        const mask = masks[i];
        person.mask = new Uint8Array(mask.width * mask.height);
        // MediaPipe returns mask as Float32Array, convert to binary
        const maskData = mask.getAsFloat32Array();
        for (let j = 0; j < maskData.length; j++) {
          person.mask[j] = maskData[j] > 0.5 ? 255 : 0;
        }
        person.maskSize = { width: mask.width, height: mask.height };
      }

      persons.push(person);
    }

    return persons;
  }

  /**
   * Convert normalized landmarks to 2D skeleton
   */
  private landmarksToSkeleton2D(
    landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
    imageSize: { width: number; height: number }
  ): Skeleton2D {
    const keypoints: Keypoint2D[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let totalConfidence = 0;
    let validCount = 0;

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const keypoint: Keypoint2D = {
        index: i,
        name: KEYPOINT_NAMES[i] || `keypoint_${i}`,
        x: lm.x * imageSize.width,
        y: lm.y * imageSize.height,
        confidence: lm.visibility ?? 1.0,
      };
      keypoints.push(keypoint);

      if (keypoint.confidence > 0.3) {
        minX = Math.min(minX, keypoint.x);
        minY = Math.min(minY, keypoint.y);
        maxX = Math.max(maxX, keypoint.x);
        maxY = Math.max(maxY, keypoint.y);
        totalConfidence += keypoint.confidence;
        validCount++;
      }
    }

    const padding = 20;
    const boundingBox: BoundingBox = {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.max(1, maxX - minX + padding * 2),
      height: Math.max(1, maxY - minY + padding * 2),
    };

    return {
      keypoints,
      boundingBox,
      confidence: validCount > 0 ? totalConfidence / validCount : 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Convert world landmarks to 3D skeleton
   */
  private worldLandmarksToSkeleton3D(
    worldLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
    skeleton2D: Skeleton2D
  ): Skeleton3D {
    const keypoints: Keypoint3D[] = worldLandmarks.map((wl, i) => ({
      index: i,
      name: KEYPOINT_NAMES[i] || `keypoint_${i}`,
      x: skeleton2D.keypoints[i]?.x ?? 0,
      y: skeleton2D.keypoints[i]?.y ?? 0,
      z: wl.z, // World Z is in meters
      confidence: wl.visibility ?? skeleton2D.keypoints[i]?.confidence ?? 0,
      zType: 'meters' as const,
    }));

    // Calculate root position (hip center) in world coordinates
    const leftHip = worldLandmarks[KeypointIndex.LEFT_HIP];
    const rightHip = worldLandmarks[KeypointIndex.RIGHT_HIP];
    const rootPosition = leftHip && rightHip ? {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2,
    } : undefined;

    // Calculate orientation from shoulders
    const leftShoulder = worldLandmarks[KeypointIndex.LEFT_SHOULDER];
    const rightShoulder = worldLandmarks[KeypointIndex.RIGHT_SHOULDER];
    let orientation = undefined;

    if (leftShoulder && rightShoulder) {
      const dx = rightShoulder.x - leftShoulder.x;
      const dz = rightShoulder.z - leftShoulder.z;
      const angle = Math.atan2(dz, dx);
      orientation = {
        x: 0,
        y: Math.sin(angle / 2),
        z: 0,
        w: Math.cos(angle / 2),
      };
    }

    return {
      keypoints,
      boundingBox: skeleton2D.boundingBox,
      confidence: skeleton2D.confidence,
      timestamp: skeleton2D.timestamp,
      rootPosition,
      orientation,
    };
  }

  /**
   * Project 2D skeleton to 3D using depth frame
   */
  private project2Dto3D(skeleton2D: Skeleton2D, depthFrame: DepthFrame): Skeleton3D {
    const intrinsics = depthFrame.intrinsics || this.config.cameraIntrinsics;
    if (!intrinsics) {
      throw new Error('Camera intrinsics required for 2D→3D projection');
    }

    const keypoints: Keypoint3D[] = skeleton2D.keypoints.map(kp2d => {
      const depth = this.sampleDepth(depthFrame, kp2d.x, kp2d.y);
      const x3d = (kp2d.x - intrinsics.cx) * depth / intrinsics.fx;
      const y3d = (kp2d.y - intrinsics.cy) * depth / intrinsics.fy;
      
      return {
        ...kp2d,
        z: depth,
        zType: 'meters' as const,
        confidence: depth > depthFrame.minDepth && depth < depthFrame.maxDepth
          ? kp2d.confidence
          : kp2d.confidence * 0.5,
      };
    });

    const leftHip = keypoints[KeypointIndex.LEFT_HIP];
    const rightHip = keypoints[KeypointIndex.RIGHT_HIP];
    const rootPosition = leftHip && rightHip ? {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2,
    } : undefined;

    return {
      keypoints,
      boundingBox: skeleton2D.boundingBox,
      confidence: skeleton2D.confidence,
      timestamp: skeleton2D.timestamp,
      rootPosition,
    };
  }

  /**
   * Sample depth with bilinear interpolation
   */
  private sampleDepth(depthFrame: DepthFrame, x: number, y: number): number {
    const intrinsics = this.config.cameraIntrinsics;
    const scaleX = depthFrame.width / (intrinsics?.width || depthFrame.width);
    const scaleY = depthFrame.height / (intrinsics?.height || depthFrame.height);
    
    const dx = Math.min(Math.max(0, x * scaleX), depthFrame.width - 1);
    const dy = Math.min(Math.max(0, y * scaleY), depthFrame.height - 1);
    
    const x0 = Math.floor(dx);
    const y0 = Math.floor(dy);
    
    return depthFrame.data[y0 * depthFrame.width + x0];
  }

  /**
   * Get last processing time
   */
  getProcessingTime(): number {
    return this.lastProcessingTime;
  }

  /**
   * Check if detector is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Dispose detector resources
   */
  async dispose(): Promise<void> {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
      this.isInitialized = false;
    }
  }
}
