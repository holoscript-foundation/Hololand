/**
 * BlazePose Detector
 * 
 * Google's BlazePose model for full-body pose estimation.
 * Supports 33 keypoints including hands and feet.
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
  CameraIntrinsics,
  DepthFrame,
} from '../types';
import { KeypointIndex, KEYPOINT_NAMES, DEFAULT_DETECTOR_CONFIG } from '../types';

// TensorFlow types (loaded dynamically)
type PoseDetector = any;
type Pose = any;

export interface BlazePoseConfig extends Partial<DetectorConfig> {
  /** Model type: 'lite', 'full', or 'heavy' */
  modelType?: 'lite' | 'full' | 'heavy';
  /** Enable smooth filtering */
  enableSmoothing?: boolean;
  /** Score threshold for pose detection */
  scoreThreshold?: number;
}

/**
 * BlazePose Detector
 * 
 * Uses TensorFlow.js pose-detection API.
 */
export class BlazePoseDetector {
  private config: DetectorConfig & BlazePoseConfig;
  private detector: PoseDetector | null = null;
  private isInitialized: boolean = false;
  private lastProcessingTime: number = 0;

  constructor(config?: BlazePoseConfig) {
    this.config = {
      ...DEFAULT_DETECTOR_CONFIG,
      model: 'blazepose',
      modelType: 'lite',
      enableSmoothing: true,
      scoreThreshold: 0.3,
      ...config,
    };
  }

  /**
   * Initialize the detector
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import to avoid bundling TF.js if not used
      const tf = await import('@tensorflow/tfjs');
      const poseDetection = await import('@tensorflow-models/pose-detection');

      // Set backend
      await tf.setBackend(this.config.backend);
      await tf.ready();

      // Create detector
      const model = poseDetection.SupportedModels.BlazePose;
      this.detector = await poseDetection.createDetector(model, {
        runtime: 'tfjs',
        modelType: this.config.modelType,
        enableSmoothing: this.config.enableSmoothing,
        enableSegmentation: this.config.enableSegmentation,
      });

      this.isInitialized = true;
      console.log(`BlazePose initialized with ${this.config.modelType} model`);
    } catch (error: any) {
      throw new Error(`Failed to initialize BlazePose: ${error.message}`);
    }
  }

  /**
   * Detect poses in an image
   */
  async detect(
    input: ImageData | HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    depthFrame?: DepthFrame
  ): Promise<DetectionResult> {
    if (!this.isInitialized || !this.detector) {
      await this.initialize();
    }

    const startTime = performance.now();

    // Get image dimensions
    const imageSize = this.getImageSize(input);

    // Run detection
    const poses: Pose[] = await this.detector!.estimatePoses(input, {
      maxPoses: this.config.maxPoses,
      flipHorizontal: this.config.flipHorizontal,
      scoreThreshold: this.config.scoreThreshold,
    });

    // Convert to our format
    const persons: PersonDetection[] = [];

    for (let i = 0; i < poses.length; i++) {
      const pose = poses[i];
      
      // Filter by overall confidence
      if (pose.score && pose.score < this.config.minConfidence) continue;

      // Extract 2D skeleton
      const skeleton2D = this.extractSkeleton2D(pose, Date.now());

      // Create person detection
      const person: PersonDetection = {
        id: i,
        skeleton2D,
      };

      // Add 3D skeleton if available
      if (this.config.enable3D && pose.keypoints3D) {
        person.skeleton3D = this.extractSkeleton3D(
          pose,
          skeleton2D.boundingBox,
          depthFrame
        );
      } else if (this.config.enable3D && depthFrame) {
        // Project 2D to 3D using depth
        person.skeleton3D = this.project2Dto3D(skeleton2D, depthFrame);
      }

      // Extract crop if enabled
      if (this.config.extractCrops && input instanceof ImageData) {
        person.crop = this.extractCrop(input, skeleton2D.boundingBox);
      }

      // Extract segmentation mask if available
      if (pose.segmentation) {
        person.mask = new Uint8Array(pose.segmentation.data);
        person.maskSize = {
          width: pose.segmentation.width,
          height: pose.segmentation.height,
        };
      }

      persons.push(person);
    }

    this.lastProcessingTime = performance.now() - startTime;

    return {
      persons,
      timestamp: Date.now(),
      processingTime: this.lastProcessingTime,
      imageSize,
    };
  }

  /**
   * Detect from video stream (convenience method)
   */
  async detectFromVideo(
    video: HTMLVideoElement,
    depthFrame?: DepthFrame
  ): Promise<DetectionResult> {
    return this.detect(video, depthFrame);
  }

  /**
   * Extract 2D skeleton from pose
   */
  private extractSkeleton2D(pose: Pose, timestamp: number): Skeleton2D {
    const keypoints: Keypoint2D[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let totalConfidence = 0;
    let validCount = 0;

    for (const kp of pose.keypoints) {
      const keypoint: Keypoint2D = {
        index: kp.name ? this.getKeypointIndex(kp.name) : keypoints.length,
        name: kp.name || KEYPOINT_NAMES[keypoints.length] || `keypoint_${keypoints.length}`,
        x: kp.x,
        y: kp.y,
        confidence: kp.score ?? 0,
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

    // Expand bounding box slightly
    const padding = 20;
    const boundingBox: BoundingBox = {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };

    return {
      keypoints,
      boundingBox,
      confidence: validCount > 0 ? totalConfidence / validCount : 0,
      timestamp,
    };
  }

  /**
   * Extract 3D skeleton from pose with 3D keypoints
   */
  private extractSkeleton3D(
    pose: Pose,
    boundingBox: BoundingBox,
    depthFrame?: DepthFrame
  ): Skeleton3D {
    const keypoints: Keypoint3D[] = [];
    let totalConfidence = 0;
    let validCount = 0;

    for (const kp of pose.keypoints3D || pose.keypoints) {
      const keypoint: Keypoint3D = {
        index: kp.name ? this.getKeypointIndex(kp.name) : keypoints.length,
        name: kp.name || KEYPOINT_NAMES[keypoints.length] || `keypoint_${keypoints.length}`,
        x: kp.x,
        y: kp.y,
        z: kp.z ?? 0,
        confidence: kp.score ?? 0,
        zType: 'relative', // BlazePose 3D is relative
      };
      keypoints.push(keypoint);

      if (keypoint.confidence > 0.3) {
        totalConfidence += keypoint.confidence;
        validCount++;
      }
    }

    // Calculate root position (hip center)
    const leftHip = keypoints[KeypointIndex.LEFT_HIP];
    const rightHip = keypoints[KeypointIndex.RIGHT_HIP];
    let rootPosition = undefined;

    if (leftHip && rightHip && leftHip.confidence > 0.3 && rightHip.confidence > 0.3) {
      rootPosition = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2,
        z: (leftHip.z + rightHip.z) / 2,
      };
    }

    // Calculate body orientation from shoulders
    const leftShoulder = keypoints[KeypointIndex.LEFT_SHOULDER];
    const rightShoulder = keypoints[KeypointIndex.RIGHT_SHOULDER];
    let orientation = undefined;

    if (leftShoulder && rightShoulder && 
        leftShoulder.confidence > 0.3 && rightShoulder.confidence > 0.3) {
      // Compute facing direction from shoulder vector
      const dx = rightShoulder.x - leftShoulder.x;
      const dz = rightShoulder.z - leftShoulder.z;
      const angle = Math.atan2(dz, dx);
      
      // Convert to quaternion (rotation around Y axis)
      orientation = {
        x: 0,
        y: Math.sin(angle / 2),
        z: 0,
        w: Math.cos(angle / 2),
      };
    }

    return {
      keypoints,
      boundingBox,
      confidence: validCount > 0 ? totalConfidence / validCount : 0,
      timestamp: Date.now(),
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
      // Get depth at keypoint location
      const depth = this.sampleDepth(depthFrame, kp2d.x, kp2d.y);
      
      // Project to 3D using pinhole model
      const x3d = (kp2d.x - intrinsics.cx) * depth / intrinsics.fx;
      const y3d = (kp2d.y - intrinsics.cy) * depth / intrinsics.fy;
      
      return {
        ...kp2d,
        z: depth,
        zType: 'meters' as const,
        // Reduce confidence if depth is invalid
        confidence: depth > depthFrame.minDepth && depth < depthFrame.maxDepth
          ? kp2d.confidence
          : kp2d.confidence * 0.5,
      };
    });

    // Calculate root position
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
   * Sample depth at a pixel location with bilinear interpolation
   */
  private sampleDepth(depthFrame: DepthFrame, x: number, y: number): number {
    // Scale coordinates if depth image has different resolution
    const scaleX = depthFrame.width / (this.config.cameraIntrinsics?.width || depthFrame.width);
    const scaleY = depthFrame.height / (this.config.cameraIntrinsics?.height || depthFrame.height);
    
    const dx = x * scaleX;
    const dy = y * scaleY;
    
    // Bilinear interpolation
    const x0 = Math.floor(dx);
    const y0 = Math.floor(dy);
    const x1 = Math.min(x0 + 1, depthFrame.width - 1);
    const y1 = Math.min(y0 + 1, depthFrame.height - 1);
    
    const fx = dx - x0;
    const fy = dy - y0;
    
    const d00 = depthFrame.data[y0 * depthFrame.width + x0];
    const d10 = depthFrame.data[y0 * depthFrame.width + x1];
    const d01 = depthFrame.data[y1 * depthFrame.width + x0];
    const d11 = depthFrame.data[y1 * depthFrame.width + x1];
    
    // Interpolate, but only if all samples are valid
    const validSamples = [d00, d10, d01, d11].filter(
      d => d > depthFrame.minDepth && d < depthFrame.maxDepth
    );
    
    if (validSamples.length === 0) {
      return 0; // No valid depth
    }
    
    if (validSamples.length < 4) {
      // Use median of valid samples
      validSamples.sort((a, b) => a - b);
      return validSamples[Math.floor(validSamples.length / 2)];
    }
    
    // Bilinear interpolation
    const d0 = d00 * (1 - fx) + d10 * fx;
    const d1 = d01 * (1 - fx) + d11 * fx;
    return d0 * (1 - fy) + d1 * fy;
  }

  /**
   * Extract image crop for a person
   */
  private extractCrop(imageData: ImageData, box: BoundingBox): ImageData {
    const x = Math.max(0, Math.floor(box.x));
    const y = Math.max(0, Math.floor(box.y));
    const width = Math.min(Math.ceil(box.width), imageData.width - x);
    const height = Math.min(Math.ceil(box.height), imageData.height - y);
    
    const cropData = new Uint8ClampedArray(width * height * 4);
    
    for (let row = 0; row < height; row++) {
      const srcOffset = ((y + row) * imageData.width + x) * 4;
      const dstOffset = row * width * 4;
      cropData.set(
        imageData.data.slice(srcOffset, srcOffset + width * 4),
        dstOffset
      );
    }
    
    return new ImageData(cropData, width, height);
  }

  /**
   * Get keypoint index from name
   */
  private getKeypointIndex(name: string): number {
    const normalized = name.toLowerCase().replace(/ /g, '_');
    for (const [index, kpName] of Object.entries(KEYPOINT_NAMES)) {
      if (kpName === normalized) {
        return parseInt(index);
      }
    }
    return -1;
  }

  /**
   * Get image dimensions from various input types
   */
  private getImageSize(input: ImageData | HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): { width: number; height: number } {
    if (input instanceof ImageData) {
      return { width: input.width, height: input.height };
    } else if (input instanceof HTMLVideoElement) {
      return { width: input.videoWidth, height: input.videoHeight };
    } else if (input instanceof HTMLCanvasElement) {
      return { width: input.width, height: input.height };
    } else {
      return { width: input.naturalWidth, height: input.naturalHeight };
    }
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
    if (this.detector) {
      await this.detector.dispose();
      this.detector = null;
      this.isInitialized = false;
    }
  }
}
