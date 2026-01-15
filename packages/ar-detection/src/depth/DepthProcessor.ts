/**
 * Depth Processor
 * 
 * Utilities for processing depth data from various sensors:
 * - LiDAR (iPhone Pro, iPad Pro)
 * - Time-of-Flight (Android phones)
 * - Stereo depth (Quest 3)
 * - WebXR Depth API
 */

import type { 
  DepthFrame, 
  CameraIntrinsics, 
  Vector3,
  Skeleton2D,
  Skeleton3D,
  Keypoint3D,
} from '../types';
import { KeypointIndex } from '../types';

export interface DepthProcessorConfig {
  /** Minimum valid depth in meters */
  minDepth: number;
  /** Maximum valid depth in meters */
  maxDepth: number;
  /** Apply temporal filtering */
  enableTemporalFilter: boolean;
  /** Temporal filter alpha (0-1, higher = more smoothing) */
  temporalAlpha: number;
  /** Fill invalid depth values */
  enableHoleFilling: boolean;
  /** Hole filling kernel size */
  holeFillKernel: number;
}

const DEFAULT_CONFIG: DepthProcessorConfig = {
  minDepth: 0.1,
  maxDepth: 10.0,
  enableTemporalFilter: true,
  temporalAlpha: 0.3,
  enableHoleFilling: true,
  holeFillKernel: 5,
};

/**
 * Depth Processor
 * 
 * Processes raw depth data for pose estimation.
 */
export class DepthProcessor {
  private config: DepthProcessorConfig;
  private previousFrame: DepthFrame | null = null;

  constructor(config?: Partial<DepthProcessorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process raw depth frame
   */
  processFrame(raw: DepthFrame): DepthFrame {
    let processed = this.clampDepth(raw);
    
    if (this.config.enableHoleFilling) {
      processed = this.fillHoles(processed);
    }
    
    if (this.config.enableTemporalFilter && this.previousFrame) {
      processed = this.temporalFilter(processed, this.previousFrame);
    }
    
    this.previousFrame = processed;
    return processed;
  }

  /**
   * Clamp depth values to valid range
   */
  private clampDepth(frame: DepthFrame): DepthFrame {
    const data = new Float32Array(frame.data.length);
    
    for (let i = 0; i < frame.data.length; i++) {
      const d = frame.data[i];
      if (d < this.config.minDepth || d > this.config.maxDepth || !isFinite(d)) {
        data[i] = 0; // Mark as invalid
      } else {
        data[i] = d;
      }
    }
    
    return {
      ...frame,
      data,
      minDepth: this.config.minDepth,
      maxDepth: this.config.maxDepth,
    };
  }

  /**
   * Fill invalid depth values using neighboring pixels
   */
  private fillHoles(frame: DepthFrame): DepthFrame {
    const data = new Float32Array(frame.data);
    const k = this.config.holeFillKernel;
    const halfK = Math.floor(k / 2);
    
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const idx = y * frame.width + x;
        
        if (data[idx] === 0) {
          // Collect valid neighbors
          const neighbors: number[] = [];
          
          for (let dy = -halfK; dy <= halfK; dy++) {
            for (let dx = -halfK; dx <= halfK; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < frame.width && ny >= 0 && ny < frame.height) {
                const nIdx = ny * frame.width + nx;
                if (frame.data[nIdx] > 0) {
                  neighbors.push(frame.data[nIdx]);
                }
              }
            }
          }
          
          // Use median of valid neighbors
          if (neighbors.length > 0) {
            neighbors.sort((a, b) => a - b);
            data[idx] = neighbors[Math.floor(neighbors.length / 2)];
          }
        }
      }
    }
    
    return { ...frame, data };
  }

  /**
   * Apply temporal filtering to reduce noise
   */
  private temporalFilter(current: DepthFrame, previous: DepthFrame): DepthFrame {
    if (current.width !== previous.width || current.height !== previous.height) {
      return current;
    }
    
    const alpha = this.config.temporalAlpha;
    const data = new Float32Array(current.data.length);
    
    for (let i = 0; i < current.data.length; i++) {
      const c = current.data[i];
      const p = previous.data[i];
      
      if (c === 0) {
        data[i] = p * (1 - alpha); // Fade out invalid
      } else if (p === 0) {
        data[i] = c; // Use current if previous invalid
      } else {
        // Exponential moving average
        data[i] = c * alpha + p * (1 - alpha);
      }
    }
    
    return { ...current, data };
  }

  /**
   * Project 2D point to 3D using depth
   */
  project2Dto3D(
    x: number,
    y: number,
    depth: number,
    intrinsics: CameraIntrinsics
  ): Vector3 {
    return {
      x: (x - intrinsics.cx) * depth / intrinsics.fx,
      y: (y - intrinsics.cy) * depth / intrinsics.fy,
      z: depth,
    };
  }

  /**
   * Project 3D point to 2D
   */
  project3Dto2D(
    point: Vector3,
    intrinsics: CameraIntrinsics
  ): { x: number; y: number; depth: number } {
    return {
      x: (point.x * intrinsics.fx / point.z) + intrinsics.cx,
      y: (point.y * intrinsics.fy / point.z) + intrinsics.cy,
      depth: point.z,
    };
  }

  /**
   * Sample depth at a point with subpixel interpolation
   */
  sampleDepth(frame: DepthFrame, x: number, y: number): number {
    // Clamp to valid range
    const px = Math.min(Math.max(0, x), frame.width - 1);
    const py = Math.min(Math.max(0, y), frame.height - 1);
    
    // Bilinear interpolation
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = Math.min(x0 + 1, frame.width - 1);
    const y1 = Math.min(y0 + 1, frame.height - 1);
    
    const fx = px - x0;
    const fy = py - y0;
    
    const d00 = frame.data[y0 * frame.width + x0];
    const d10 = frame.data[y0 * frame.width + x1];
    const d01 = frame.data[y1 * frame.width + x0];
    const d11 = frame.data[y1 * frame.width + x1];
    
    // Only interpolate valid values
    const validSamples: { depth: number; weight: number }[] = [];
    
    if (d00 > 0) validSamples.push({ depth: d00, weight: (1 - fx) * (1 - fy) });
    if (d10 > 0) validSamples.push({ depth: d10, weight: fx * (1 - fy) });
    if (d01 > 0) validSamples.push({ depth: d01, weight: (1 - fx) * fy });
    if (d11 > 0) validSamples.push({ depth: d11, weight: fx * fy });
    
    if (validSamples.length === 0) return 0;
    
    const totalWeight = validSamples.reduce((s, v) => s + v.weight, 0);
    return validSamples.reduce((s, v) => s + v.depth * v.weight, 0) / totalWeight;
  }

  /**
   * Lift 2D skeleton to 3D using depth
   */
  liftSkeleton(
    skeleton2D: Skeleton2D,
    depthFrame: DepthFrame,
    intrinsics: CameraIntrinsics
  ): Skeleton3D {
    const keypoints: Keypoint3D[] = skeleton2D.keypoints.map(kp => {
      const depth = this.sampleDepth(depthFrame, kp.x, kp.y);
      const point3D = this.project2Dto3D(kp.x, kp.y, depth, intrinsics);
      
      return {
        ...kp,
        x: point3D.x,
        y: point3D.y,
        z: point3D.z,
        zType: 'meters' as const,
        confidence: depth > 0 ? kp.confidence : kp.confidence * 0.5,
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
   * Create depth frame from WebXR depth API
   */
  static fromWebXRDepth(
    depthInfo: XRCPUDepthInformation,
    intrinsics?: CameraIntrinsics
  ): DepthFrame {
    const width = depthInfo.width;
    const height = depthInfo.height;
    const data = new Float32Array(width * height);
    
    // WebXR depth is in raw depth format
    // Need to convert using rawValueToMeters
    const rawData = new Uint16Array(depthInfo.data);
    
    for (let i = 0; i < rawData.length; i++) {
      data[i] = depthInfo.getDepthInMeters(
        (i % width) / width,
        Math.floor(i / width) / height
      );
    }
    
    return {
      data,
      width,
      height,
      minDepth: 0.1,
      maxDepth: 10.0,
      intrinsics,
      timestamp: Date.now(),
    };
  }

  /**
   * Create depth frame from LiDAR data (iOS ARKit format)
   */
  static fromLiDAR(
    depthData: Float32Array,
    width: number,
    height: number,
    intrinsics?: CameraIntrinsics
  ): DepthFrame {
    return {
      data: depthData,
      width,
      height,
      minDepth: 0.1,
      maxDepth: 5.0, // LiDAR typically has shorter range
      intrinsics,
      timestamp: Date.now(),
    };
  }

  /**
   * Visualize depth frame as RGBA image
   */
  visualize(frame: DepthFrame): ImageData {
    const rgba = new Uint8ClampedArray(frame.width * frame.height * 4);
    
    for (let i = 0; i < frame.data.length; i++) {
      const d = frame.data[i];
      const normalized = d > 0 
        ? (d - frame.minDepth) / (frame.maxDepth - frame.minDepth)
        : 0;
      
      // Turbo colormap approximation
      const r = Math.floor(255 * Math.min(1, Math.max(0, 4 * normalized - 1.5)));
      const g = Math.floor(255 * Math.sin(Math.PI * normalized));
      const b = Math.floor(255 * Math.min(1, Math.max(0, 1.5 - 4 * normalized)));
      
      const j = i * 4;
      rgba[j] = r;
      rgba[j + 1] = g;
      rgba[j + 2] = b;
      rgba[j + 3] = d > 0 ? 255 : 0;
    }
    
    return new ImageData(rgba, frame.width, frame.height);
  }

  /**
   * Reset temporal filter state
   */
  reset(): void {
    this.previousFrame = null;
  }
}

// WebXR type declaration
declare interface XRCPUDepthInformation {
  width: number;
  height: number;
  data: ArrayBuffer;
  getDepthInMeters(x: number, y: number): number;
}
