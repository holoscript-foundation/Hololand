/**
 * Kalman Filter for 3D person tracking
 * 
 * State vector: [x, y, z, vx, vy, vz] (position + velocity)
 * Measurement: [x, y, z] (position only)
 */

import type { Vector3, KalmanState } from '../types';

export class KalmanFilter3D {
  // State: [x, y, z, vx, vy, vz]
  private state: number[];
  
  // State covariance matrix (6x6)
  private P: number[][];
  
  // Process noise
  private processNoise: number;
  
  // Measurement noise
  private measurementNoise: number;
  
  // Whether the filter has been initialized
  private initialized: boolean = false;

  constructor(
    initialPosition?: Vector3,
    processNoise: number = 0.1,
    measurementNoise: number = 0.3
  ) {
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
    
    // Initialize state with position or zero
    if (initialPosition) {
      this.state = [
        initialPosition.x, initialPosition.y, initialPosition.z,
        0, 0, 0
      ];
      this.initialized = true;
    } else {
      this.state = [0, 0, 0, 0, 0, 0];
    }

    // Initialize covariance with high uncertainty
    this.P = this.createIdentityMatrix(6, 10);
  }

  /**
   * Initialize/reset the filter with a position
   */
  initialize(position: Vector3): void {
    this.state = [position.x, position.y, position.z, 0, 0, 0];
    this.P = this.createIdentityMatrix(6, 10);
    this.initialized = true;
  }

  /**
   * Get full state as object { x, y, z, vx, vy, vz }
   */
  getState(): { x: number; y: number; z: number; vx: number; vy: number; vz: number } {
    return {
      x: this.state[0],
      y: this.state[1],
      z: this.state[2],
      vx: this.state[3],
      vy: this.state[4],
      vz: this.state[5],
    };
  }

  /**
   * Get current position estimate
   */
  getPosition(): Vector3 {
    return {
      x: this.state[0],
      y: this.state[1],
      z: this.state[2],
    };
  }

  /**
   * Get diagonal of covariance matrix (uncertainty values)
   */
  getCovariance(): number[] {
    return [
      this.P[0][0], this.P[1][1], this.P[2][2],
      this.P[3][3], this.P[4][4], this.P[5][5]
    ];
  }

  /**
   * Predict next state (time update)
   * @param dt Time delta in seconds
   */
  predict(dt: number): void {
    // State transition matrix F
    // x' = x + vx*dt
    // vx' = vx
    const F = [
      [1, 0, 0, dt, 0, 0],
      [0, 1, 0, 0, dt, 0],
      [0, 0, 1, 0, 0, dt],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
    ];

    // Process noise covariance Q
    const q = this.processNoise;
    const dt2 = dt * dt;
    const dt3 = dt2 * dt / 2;
    const dt4 = dt2 * dt2 / 4;
    
    const Q = [
      [dt4*q, 0, 0, dt3*q, 0, 0],
      [0, dt4*q, 0, 0, dt3*q, 0],
      [0, 0, dt4*q, 0, 0, dt3*q],
      [dt3*q, 0, 0, dt2*q, 0, 0],
      [0, dt3*q, 0, 0, dt2*q, 0],
      [0, 0, dt3*q, 0, 0, dt2*q],
    ];

    // Predict state: x = F * x
    this.state = this.matVecMul(F, this.state);

    // Predict covariance: P = F * P * F' + Q
    const FP = this.matMul(F, this.P);
    const FT = this.transpose(F);
    const FPFT = this.matMul(FP, FT);
    this.P = this.matAdd(FPFT, Q);
  }

  /**
   * Update state with measurement (measurement update)
   * @param measurement Measured 3D position
   */
  update(measurement: Vector3): void {
    // Measurement matrix H (we only measure position, not velocity)
    const H = [
      [1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
    ];

    // Measurement noise covariance R
    const r = this.measurementNoise;
    const R = [
      [r, 0, 0],
      [0, r, 0],
      [0, 0, r],
    ];

    // Measurement vector z
    const z = [measurement.x, measurement.y, measurement.z];

    // Innovation: y = z - H * x
    const Hx = this.matVecMul(H, this.state);
    const y = z.map((zi, i) => zi - Hx[i]);

    // Innovation covariance: S = H * P * H' + R
    const HP = this.matMul(H, this.P);
    const HT = this.transpose(H);
    const HPHT = this.matMul(HP, HT);
    const S = this.matAdd(HPHT, R);

    // Kalman gain: K = P * H' * S^(-1)
    const PHT = this.matMul(this.P, HT);
    const Sinv = this.invert3x3(S);
    const K = this.matMul(PHT, Sinv);

    // Update state: x = x + K * y
    const Ky = this.matVecMul(K, y);
    this.state = this.state.map((xi, i) => xi + Ky[i]);

    // Update covariance: P = (I - K * H) * P
    const KH = this.matMul(K, H);
    const I = this.createIdentityMatrix(6, 1);
    const IKH = this.matSub(I, KH);
    this.P = this.matMul(IKH, this.P);
  }

  /**
   * Get predicted position for gating/association
   */
  getPredictedPosition(): Vector3 {
    return {
      x: this.state[0],
      y: this.state[1],
      z: this.state[2],
    };
  }

  /**
   * Get current velocity estimate
   */
  getVelocity(): Vector3 {
    return {
      x: this.state[3],
      y: this.state[4],
      z: this.state[5],
    };
  }

  /**
   * Get full Kalman state for serialization
   */
  getKalmanState(): KalmanState {
    return {
      position: this.getPredictedPosition(),
      velocity: this.getVelocity(),
      positionCovariance: (this.P[0][0] + this.P[1][1] + this.P[2][2]) / 3,
      velocityCovariance: (this.P[3][3] + this.P[4][4] + this.P[5][5]) / 3,
    };
  }

  /**
   * Compute Mahalanobis distance for gating
   */
  mahalanobisDistance(measurement: Vector3): number {
    const H = [
      [1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
    ];
    
    const r = this.measurementNoise;
    const R = [
      [r, 0, 0],
      [0, r, 0],
      [0, 0, r],
    ];

    // Innovation
    const z = [measurement.x, measurement.y, measurement.z];
    const Hx = this.matVecMul(H, this.state);
    const y = z.map((zi, i) => zi - Hx[i]);

    // Innovation covariance
    const HP = this.matMul(H, this.P);
    const HT = this.transpose(H);
    const HPHT = this.matMul(HP, HT);
    const S = this.matAdd(HPHT, R);
    const Sinv = this.invert3x3(S);

    // Mahalanobis distance: sqrt(y' * S^-1 * y)
    const Sinvy = this.matVecMul(Sinv, y);
    const d2 = y.reduce((sum, yi, i) => sum + yi * Sinvy[i], 0);
    
    return Math.sqrt(Math.max(0, d2));
  }

  // ==========================================================================
  // Matrix utilities (simple implementations for 6x6 / 3x3 matrices)
  // ==========================================================================

  private createIdentityMatrix(n: number, scale: number): number[][] {
    const I: number[][] = [];
    for (let i = 0; i < n; i++) {
      I[i] = [];
      for (let j = 0; j < n; j++) {
        I[i][j] = i === j ? scale : 0;
      }
    }
    return I;
  }

  private matMul(A: number[][], B: number[][]): number[][] {
    const m = A.length;
    const n = B[0].length;
    const p = B.length;
    const C: number[][] = [];
    
    for (let i = 0; i < m; i++) {
      C[i] = [];
      for (let j = 0; j < n; j++) {
        C[i][j] = 0;
        for (let k = 0; k < p; k++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return C;
  }

  private matVecMul(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, a, i) => sum + a * v[i], 0));
  }

  private transpose(A: number[][]): number[][] {
    const m = A.length;
    const n = A[0].length;
    const AT: number[][] = [];
    
    for (let j = 0; j < n; j++) {
      AT[j] = [];
      for (let i = 0; i < m; i++) {
        AT[j][i] = A[i][j];
      }
    }
    return AT;
  }

  private matAdd(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((a, j) => a + B[i][j]));
  }

  private matSub(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((a, j) => a - B[i][j]));
  }

  private invert3x3(M: number[][]): number[][] {
    const [[a, b, c], [d, e, f], [g, h, i]] = M;
    
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    
    if (Math.abs(det) < 1e-10) {
      // Return identity if singular
      return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }
    
    const invDet = 1 / det;
    
    return [
      [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
      [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
      [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
    ];
  }
}
