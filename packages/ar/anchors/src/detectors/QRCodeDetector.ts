/**
 * QR Code Detector
 * 
 * Detects QR codes in images and estimates 6DoF pose from corners.
 */

import type { 
  QRDetection, 
  Vector2, 
  Pose, 
  CameraIntrinsics,
  Vector3,
  Quaternion 
} from '../types';

// jsQR types (simplified)
interface QRCode {
  data: string;
  location: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  };
  version: number;
}

// Dynamic import for jsQR (browser/node compatibility)
let jsQR: ((data: Uint8ClampedArray, width: number, height: number) => QRCode | null) | null = null;

async function loadJsQR() {
  if (!jsQR) {
    const module = await import('jsqr');
    jsQR = module.default;
  }
  return jsQR;
}

export interface QRDetectorConfig {
  /** Physical QR code size in meters */
  physicalSize: number;
  /** Camera intrinsics for pose estimation */
  cameraIntrinsics?: CameraIntrinsics;
  /** Enable pose estimation */
  estimatePose: boolean;
}

export class QRCodeDetector {
  private config: QRDetectorConfig;

  constructor(config?: Partial<QRDetectorConfig>) {
    this.config = {
      physicalSize: 0.1,
      estimatePose: true,
      ...config,
    };
  }

  /**
   * Detect QR codes in an image
   */
  async detect(imageData: ImageData): Promise<QRDetection[]> {
    const decoder = await loadJsQR();
    if (!decoder) {
      throw new Error('QR decoder not available');
    }

    const result = decoder(imageData.data, imageData.width, imageData.height);
    
    if (!result) {
      return [];
    }

    const corners: [Vector2, Vector2, Vector2, Vector2] = [
      { x: result.location.topLeftCorner.x, y: result.location.topLeftCorner.y },
      { x: result.location.topRightCorner.x, y: result.location.topRightCorner.y },
      { x: result.location.bottomRightCorner.x, y: result.location.bottomRightCorner.y },
      { x: result.location.bottomLeftCorner.x, y: result.location.bottomLeftCorner.y },
    ];

    const detection: QRDetection = {
      content: result.data,
      corners,
      confidence: this.estimateConfidence(corners, imageData.width, imageData.height),
      version: result.version,
    };

    // Estimate pose if camera intrinsics available
    if (this.config.estimatePose && this.config.cameraIntrinsics) {
      detection.pose = this.estimatePose(corners, this.config.cameraIntrinsics);
    }

    return [detection];
  }

  /**
   * Detect from video frame (convenience method)
   */
  async detectFromVideo(video: HTMLVideoElement): Promise<QRDetection[]> {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    return this.detect(imageData);
  }

  /**
   * Estimate detection confidence from corner positions
   */
  private estimateConfidence(
    corners: [Vector2, Vector2, Vector2, Vector2],
    imageWidth: number,
    imageHeight: number
  ): number {
    // Check if QR is reasonably sized (not too small/large)
    const width = Math.abs(corners[1].x - corners[0].x);
    const height = Math.abs(corners[3].y - corners[0].y);
    const area = width * height;
    const imageArea = imageWidth * imageHeight;
    const areaRatio = area / imageArea;

    // Ideal: 5-25% of image
    let confidence = 1.0;
    
    if (areaRatio < 0.01) {
      confidence *= areaRatio / 0.01; // Too small
    } else if (areaRatio > 0.5) {
      confidence *= 0.5 / areaRatio; // Too large
    }

    // Check squareness (QR should be roughly square)
    const aspectRatio = width / height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      confidence *= 0.5; // Very skewed
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Estimate 6DoF pose from QR corners using PnP
   * 
   * Uses a simplified planar pose estimation (no OpenCV dependency)
   */
  private estimatePose(
    corners: [Vector2, Vector2, Vector2, Vector2],
    intrinsics: CameraIntrinsics
  ): Pose {
    const size = this.config.physicalSize;
    const halfSize = size / 2;

    // 3D object points (QR in its local frame, centered at origin)
    const objectPoints: Vector3[] = [
      { x: -halfSize, y: -halfSize, z: 0 }, // Top-left
      { x: halfSize, y: -halfSize, z: 0 },  // Top-right
      { x: halfSize, y: halfSize, z: 0 },   // Bottom-right
      { x: -halfSize, y: halfSize, z: 0 },  // Bottom-left
    ];

    // Normalize image points
    const normalizedPoints = corners.map(p => ({
      x: (p.x - intrinsics.cx) / intrinsics.fx,
      y: (p.y - intrinsics.cy) / intrinsics.fy,
    }));

    // Estimate pose using DLT (Direct Linear Transform) - simplified
    const pose = this.solvePnPPlanar(objectPoints, normalizedPoints);
    
    return pose;
  }

  /**
   * Simplified planar PnP solver
   * 
   * For a planar target, we can use homography decomposition
   */
  private solvePnPPlanar(
    objectPoints: Vector3[],
    imagePoints: Vector2[]
  ): Pose {
    // Compute homography from 4 point correspondences
    const H = this.computeHomography(
      objectPoints.map(p => ({ x: p.x, y: p.y })),
      imagePoints
    );

    // Decompose homography to get R and t
    // H = K * [r1 | r2 | t] for planar case
    // Since we're using normalized coordinates, K = I
    
    const r1 = { x: H[0][0], y: H[1][0], z: H[2][0] };
    const r2 = { x: H[0][1], y: H[1][1], z: H[2][1] };
    const t = { x: H[0][2], y: H[1][2], z: H[2][2] };

    // Normalize r1 and r2
    const norm1 = Math.sqrt(r1.x * r1.x + r1.y * r1.y + r1.z * r1.z);
    const norm2 = Math.sqrt(r2.x * r2.x + r2.y * r2.y + r2.z * r2.z);
    const scale = (norm1 + norm2) / 2;

    const r1n = { x: r1.x / norm1, y: r1.y / norm1, z: r1.z / norm1 };
    const r2n = { x: r2.x / norm2, y: r2.y / norm2, z: r2.z / norm2 };
    
    // r3 = r1 x r2
    const r3 = {
      x: r1n.y * r2n.z - r1n.z * r2n.y,
      y: r1n.z * r2n.x - r1n.x * r2n.z,
      z: r1n.x * r2n.y - r1n.y * r2n.x,
    };

    // Build rotation matrix and convert to quaternion
    const R = [
      [r1n.x, r2n.x, r3.x],
      [r1n.y, r2n.y, r3.y],
      [r1n.z, r2n.z, r3.z],
    ];

    const rotation = this.rotationMatrixToQuaternion(R);
    const position = { x: t.x / scale, y: t.y / scale, z: t.z / scale };

    return { position, rotation };
  }

  /**
   * Compute homography from 4 point correspondences
   */
  private computeHomography(
    src: Vector2[],
    dst: Vector2[]
  ): number[][] {
    // Build the system Ah = 0
    const A: number[][] = [];
    
    for (let i = 0; i < 4; i++) {
      const { x: X, y: Y } = src[i];
      const { x: u, y: v } = dst[i];
      
      A.push([-X, -Y, -1, 0, 0, 0, u * X, u * Y, u]);
      A.push([0, 0, 0, -X, -Y, -1, v * X, v * Y, v]);
    }

    // Solve using SVD (simplified - use last column of V)
    const h = this.solveHomogeneous(A);
    
    return [
      [h[0], h[1], h[2]],
      [h[3], h[4], h[5]],
      [h[6], h[7], h[8]],
    ];
  }

  /**
   * Solve homogeneous system Ah = 0 using power iteration for smallest eigenvalue
   */
  private solveHomogeneous(A: number[][]): number[] {
    const m = A.length;
    const n = A[0].length;
    
    // Compute A^T * A
    const ATA: number[][] = [];
    for (let i = 0; i < n; i++) {
      ATA[i] = [];
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < m; k++) {
          sum += A[k][i] * A[k][j];
        }
        ATA[i][j] = sum;
      }
    }

    // Power iteration to find eigenvector of smallest eigenvalue
    // (inverse iteration on A^T * A)
    let x = Array(n).fill(1 / Math.sqrt(n));
    
    for (let iter = 0; iter < 100; iter++) {
      // Solve (A^T A) y = x (approximately via Jacobi iteration)
      const y = this.jacobiSolve(ATA, x, 10);
      
      // Normalize
      const norm = Math.sqrt(y.reduce((s, v) => s + v * v, 0));
      x = y.map(v => v / norm);
    }

    return x;
  }

  /**
   * Simple Jacobi iterative solver
   */
  private jacobiSolve(A: number[][], b: number[], iterations: number): number[] {
    const n = b.length;
    let x = [...b];
    
    for (let iter = 0; iter < iterations; iter++) {
      const xNew = [...x];
      for (let i = 0; i < n; i++) {
        let sum = b[i];
        for (let j = 0; j < n; j++) {
          if (j !== i) {
            sum -= A[i][j] * x[j];
          }
        }
        xNew[i] = sum / (A[i][i] || 1);
      }
      x = xNew;
    }
    
    return x;
  }

  /**
   * Convert 3x3 rotation matrix to quaternion
   */
  private rotationMatrixToQuaternion(R: number[][]): Quaternion {
    const trace = R[0][0] + R[1][1] + R[2][2];
    
    let w: number, x: number, y: number, z: number;
    
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      w = 0.25 / s;
      x = (R[2][1] - R[1][2]) * s;
      y = (R[0][2] - R[2][0]) * s;
      z = (R[1][0] - R[0][1]) * s;
    } else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
      const s = 2.0 * Math.sqrt(1.0 + R[0][0] - R[1][1] - R[2][2]);
      w = (R[2][1] - R[1][2]) / s;
      x = 0.25 * s;
      y = (R[0][1] + R[1][0]) / s;
      z = (R[0][2] + R[2][0]) / s;
    } else if (R[1][1] > R[2][2]) {
      const s = 2.0 * Math.sqrt(1.0 + R[1][1] - R[0][0] - R[2][2]);
      w = (R[0][2] - R[2][0]) / s;
      x = (R[0][1] + R[1][0]) / s;
      y = 0.25 * s;
      z = (R[1][2] + R[2][1]) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + R[2][2] - R[0][0] - R[1][1]);
      w = (R[1][0] - R[0][1]) / s;
      x = (R[0][2] + R[2][0]) / s;
      y = (R[1][2] + R[2][1]) / s;
      z = 0.25 * s;
    }

    // Normalize
    const norm = Math.sqrt(w * w + x * x + y * y + z * z);
    return { x: x / norm, y: y / norm, z: z / norm, w: w / norm };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<QRDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
