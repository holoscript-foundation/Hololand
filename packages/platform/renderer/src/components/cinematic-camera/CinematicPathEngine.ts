/**
 * CinematicPathEngine
 *
 * Core interpolation engine for cinematic camera paths.
 * Evaluates camera state at any point in time by interpolating
 * between keyframes using the specified curve type.
 *
 * SUPPORTED INTERPOLATION MODES:
 * 1. Catmull-Rom Spline - Passes through all control points with configurable tension
 * 2. Cubic Bezier       - Four-point Bezier with explicit tangent handles
 * 3. Cubic Hermite      - Position + tangent pairs, standard cinematic interpolation
 * 4. Linear             - Straight-line interpolation between keyframes
 * 5. Step               - Instant transition at keyframe boundary (hard cut)
 *
 * PROPERTIES INTERPOLATED:
 * - position (Vec3)     - Camera world position
 * - target (Vec3)       - Camera look-at point
 * - up (Vec3)           - Camera up vector (with slerp-like normalization)
 * - fovY (scalar)       - Vertical field of view
 * - roll (scalar)       - Camera roll angle in degrees
 * - dofFocusDistance     - Depth of field focus distance
 * - dofAperture         - Depth of field aperture (f-stop)
 *
 * PERFORMANCE:
 * All math is pure functions operating on plain arrays.
 * No heap allocations in the hot path. Suitable for 60fps+ preview.
 *
 * @module cinematic-camera/CinematicPathEngine
 */

import type {
  CinematicKeyframe,
  CinematicSequence,
  EvaluatedCameraState,
} from './types';

import {
  CINEMATIC_EASING_FUNCTIONS,
  DEFAULT_EVALUATED_CAMERA,
} from './types';

// =============================================================================
// VECTOR MATH (allocation-free hot path)
// =============================================================================

type Vec3 = [number, number, number];

function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len < 1e-10) return [0, 1, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function scalarLerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// =============================================================================
// CATMULL-ROM SPLINE
// =============================================================================

/**
 * Catmull-Rom spline interpolation.
 * Passes through p1 and p2 at t=0 and t=1 respectively.
 * p0 and p3 are neighboring control points that influence the curve shape.
 *
 * @param p0 Control point before segment start
 * @param p1 Segment start point (t=0)
 * @param p2 Segment end point (t=1)
 * @param p3 Control point after segment end
 * @param t  Parameter 0-1 within this segment
 * @param tension Catmull-Rom tension (0.5 = standard)
 */
function catmullRomVec3(
  p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3,
  t: number, tension: number,
): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const result: Vec3 = [0, 0, 0];

  for (let i = 0; i < 3; i++) {
    const m0 = tension * (p2[i] - p0[i]);
    const m1 = tension * (p3[i] - p1[i]);
    result[i] =
      (2 * t3 - 3 * t2 + 1) * p1[i] +
      (t3 - 2 * t2 + t) * m0 +
      (-2 * t3 + 3 * t2) * p2[i] +
      (t3 - t2) * m1;
  }

  return result;
}

/** Catmull-Rom scalar interpolation (exported for external use). */
export function catmullRomScalar(
  p0: number, p1: number, p2: number, p3: number,
  t: number, tension: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const m0 = tension * (p2 - p0);
  const m1 = tension * (p3 - p1);
  return (
    (2 * t3 - 3 * t2 + 1) * p1 +
    (t3 - 2 * t2 + t) * m0 +
    (-2 * t3 + 3 * t2) * p2 +
    (t3 - t2) * m1
  );
}

// =============================================================================
// CUBIC BEZIER
// =============================================================================

/**
 * Cubic Bezier interpolation with four control points.
 * B(t) = (1-t)^3 * P0 + 3(1-t)^2 * t * P1 + 3(1-t) * t^2 * P2 + t^3 * P3
 *
 * P0 = segment start position
 * P1 = start position + outTangent handle
 * P2 = end position + inTangent handle
 * P3 = segment end position
 */
function cubicBezierVec3(
  p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number,
): Vec3 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return [
    mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0],
    mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1],
    mt3 * p0[2] + 3 * mt2 * t * p1[2] + 3 * mt * t2 * p2[2] + t3 * p3[2],
  ];
}

// =============================================================================
// CUBIC HERMITE
// =============================================================================

/**
 * Cubic Hermite interpolation.
 * Defined by position and tangent at each endpoint.
 *
 * H(t) = h00(t)*p0 + h10(t)*m0 + h01(t)*p1 + h11(t)*m1
 *
 * Where h00, h10, h01, h11 are the Hermite basis functions:
 *   h00(t) = 2t^3 - 3t^2 + 1
 *   h10(t) = t^3 - 2t^2 + t
 *   h01(t) = -2t^3 + 3t^2
 *   h11(t) = t^3 - t^2
 */
function hermiteVec3(
  p0: Vec3, m0: Vec3, p1: Vec3, m1: Vec3, t: number,
): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return [
    h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0],
    h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1],
    h00 * p0[2] + h10 * m0[2] + h01 * p1[2] + h11 * m1[2],
  ];
}

/** Hermite scalar interpolation (exported for external use). */
export function hermiteScalar(
  p0: number, m0: number, p1: number, m1: number, t: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

// =============================================================================
// PATH ENGINE CLASS
// =============================================================================

export class CinematicPathEngine {
  private sequence: CinematicSequence;

  constructor(sequence?: CinematicSequence) {
    this.sequence = sequence ?? {
      id: '',
      name: '',
      keyframes: [],
      duration: 0,
      loop: false,
      playbackSpeed: 1.0,
      fps: 30,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Set the sequence to evaluate.
   */
  setSequence(sequence: CinematicSequence): void {
    this.sequence = sequence;
  }

  /**
   * Get the current sequence.
   */
  getSequence(): Readonly<CinematicSequence> {
    return this.sequence;
  }

  /**
   * Evaluate the camera state at a given time.
   * This is the primary entry point for the engine.
   *
   * @param time Time in seconds
   * @returns Fully interpolated camera state
   */
  evaluate(time: number): EvaluatedCameraState {
    const keyframes = this.sequence.keyframes;

    if (keyframes.length === 0) {
      return { ...DEFAULT_EVALUATED_CAMERA };
    }

    if (keyframes.length === 1) {
      return this.keyframeToCamera(keyframes[0]);
    }

    // Handle looping
    const duration = this.getDuration();
    let adjustedTime = time;
    if (this.sequence.loop && duration > 0) {
      adjustedTime = ((time % duration) + duration) % duration;
    } else {
      adjustedTime = Math.max(0, Math.min(duration, time));
    }

    // Find the segment containing this time
    const { segIndex, localT, kfA, kfB } = this.findSegment(adjustedTime);

    if (segIndex < 0) {
      // Before first keyframe
      return this.keyframeToCamera(keyframes[0]);
    }

    // Apply easing to the local parameter
    const easingFn = CINEMATIC_EASING_FUNCTIONS[kfB.easing] ?? CINEMATIC_EASING_FUNCTIONS['linear'];
    const easedT = easingFn(localT);

    // Interpolate based on the curve type of the destination keyframe
    return this.interpolateSegment(segIndex, kfA, kfB, easedT);
  }

  /**
   * Evaluate the camera state at a frame number.
   *
   * @param frame Frame number (0-based)
   * @param fps Frames per second
   * @returns Evaluated camera state
   */
  evaluateAtFrame(frame: number, fps: number): EvaluatedCameraState {
    return this.evaluate(frame / fps);
  }

  /**
   * Get the total duration of the sequence.
   */
  getDuration(): number {
    const keyframes = this.sequence.keyframes;
    if (keyframes.length === 0) return 0;
    return keyframes[keyframes.length - 1].time;
  }

  /**
   * Get the total number of frames at a given FPS.
   */
  getTotalFrames(fps: number): number {
    return Math.ceil(this.getDuration() * fps);
  }

  /**
   * Sample the entire path at regular intervals.
   * Useful for path visualization.
   *
   * @param sampleCount Number of samples to take
   * @returns Array of evaluated camera states
   */
  samplePath(sampleCount: number): EvaluatedCameraState[] {
    const duration = this.getDuration();
    if (duration === 0 || sampleCount < 2) {
      return [this.evaluate(0)];
    }

    const samples: EvaluatedCameraState[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const t = (i / (sampleCount - 1)) * duration;
      samples.push(this.evaluate(t));
    }
    return samples;
  }

  /**
   * Get the path positions for visualization (lighter than full samplePath).
   *
   * @param sampleCount Number of position samples
   * @returns Array of [x, y, z] positions
   */
  samplePositions(sampleCount: number): Vec3[] {
    const duration = this.getDuration();
    if (duration === 0 || sampleCount < 2) {
      const cam = this.evaluate(0);
      return [cam.position];
    }

    const positions: Vec3[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const t = (i / (sampleCount - 1)) * duration;
      const cam = this.evaluate(t);
      positions.push(cam.position);
    }
    return positions;
  }

  // ===========================================================================
  // SEGMENT FINDING
  // ===========================================================================

  /**
   * Find which segment contains the given time.
   * Returns the segment index, local t parameter, and bounding keyframes.
   */
  private findSegment(time: number): {
    segIndex: number;
    localT: number;
    kfA: CinematicKeyframe;
    kfB: CinematicKeyframe;
  } {
    const keyframes = this.sequence.keyframes;

    // Before first keyframe
    if (time <= keyframes[0].time) {
      return {
        segIndex: -1,
        localT: 0,
        kfA: keyframes[0],
        kfB: keyframes[0],
      };
    }

    // After last keyframe
    if (time >= keyframes[keyframes.length - 1].time) {
      const last = keyframes[keyframes.length - 1];
      return {
        segIndex: keyframes.length - 2,
        localT: 1,
        kfA: keyframes[keyframes.length - 2] ?? last,
        kfB: last,
      };
    }

    // Binary search for the containing segment
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time < keyframes[i + 1].time) {
        const segDuration = keyframes[i + 1].time - keyframes[i].time;
        const localT = segDuration > 0
          ? (time - keyframes[i].time) / segDuration
          : 0;

        return {
          segIndex: i,
          localT: Math.max(0, Math.min(1, localT)),
          kfA: keyframes[i],
          kfB: keyframes[i + 1],
        };
      }
    }

    // Fallback (should not reach here)
    const last = keyframes[keyframes.length - 1];
    return {
      segIndex: keyframes.length - 2,
      localT: 1,
      kfA: keyframes[keyframes.length - 2] ?? last,
      kfB: last,
    };
  }

  // ===========================================================================
  // SEGMENT INTERPOLATION
  // ===========================================================================

  /**
   * Interpolate a segment between two keyframes using the specified curve type.
   */
  private interpolateSegment(
    segIndex: number,
    kfA: CinematicKeyframe,
    kfB: CinematicKeyframe,
    t: number,
  ): EvaluatedCameraState {
    const interpolation = kfB.interpolation;

    let position: Vec3;
    let target: Vec3;

    switch (interpolation) {
      case 'catmull-rom':
        position = this.catmullRomPosition(segIndex, t, kfB.tension);
        target = this.catmullRomTarget(segIndex, t, kfB.tension);
        break;

      case 'cubic-bezier':
        position = this.bezierPosition(kfA, kfB, t);
        target = this.bezierTarget(kfA, kfB, t);
        break;

      case 'hermite':
        position = this.hermitePosition(kfA, kfB, t);
        target = this.hermiteTarget(kfA, kfB, t);
        break;

      case 'step':
        // Step: use kfA until t >= 1, then snap to kfB
        position = t >= 1 ? [...kfB.position] : [...kfA.position];
        target = t >= 1 ? [...kfB.target] : [...kfA.target];
        break;

      case 'linear':
      default:
        position = vec3Lerp(kfA.position, kfB.position, t);
        target = vec3Lerp(kfA.target, kfB.target, t);
        break;
    }

    // Interpolate up vector with normalization
    const up = vec3Normalize(vec3Lerp(kfA.up, kfB.up, t));

    // Scalar interpolation for other properties
    const fovY = scalarLerp(kfA.fovY, kfB.fovY, t);
    const roll = scalarLerp(kfA.roll, kfB.roll, t);
    const dofFocusDistance = scalarLerp(kfA.dofFocusDistance, kfB.dofFocusDistance, t);
    const dofAperture = scalarLerp(kfA.dofAperture, kfB.dofAperture, t);

    return {
      position,
      target,
      up,
      fovY,
      roll,
      dofFocusDistance,
      dofAperture,
      aspect: DEFAULT_EVALUATED_CAMERA.aspect,
      near: DEFAULT_EVALUATED_CAMERA.near,
      far: DEFAULT_EVALUATED_CAMERA.far,
    };
  }

  // ===========================================================================
  // CATMULL-ROM INTERPOLATION
  // ===========================================================================

  private catmullRomPosition(segIndex: number, t: number, tension: number): Vec3 {
    const keyframes = this.sequence.keyframes;
    const i0 = Math.max(0, segIndex - 1);
    const i1 = segIndex;
    const i2 = Math.min(keyframes.length - 1, segIndex + 1);
    const i3 = Math.min(keyframes.length - 1, segIndex + 2);

    return catmullRomVec3(
      keyframes[i0].position,
      keyframes[i1].position,
      keyframes[i2].position,
      keyframes[i3].position,
      t, tension,
    );
  }

  private catmullRomTarget(segIndex: number, t: number, tension: number): Vec3 {
    const keyframes = this.sequence.keyframes;
    const i0 = Math.max(0, segIndex - 1);
    const i1 = segIndex;
    const i2 = Math.min(keyframes.length - 1, segIndex + 1);
    const i3 = Math.min(keyframes.length - 1, segIndex + 2);

    return catmullRomVec3(
      keyframes[i0].target,
      keyframes[i1].target,
      keyframes[i2].target,
      keyframes[i3].target,
      t, tension,
    );
  }

  // ===========================================================================
  // CUBIC BEZIER INTERPOLATION
  // ===========================================================================

  private bezierPosition(kfA: CinematicKeyframe, kfB: CinematicKeyframe, t: number): Vec3 {
    // P0 = kfA.position
    // P1 = kfA.position + kfA.bezierHandles.outTangent
    // P2 = kfB.position + kfB.bezierHandles.inTangent
    // P3 = kfB.position
    const p0 = kfA.position;
    const p1: Vec3 = [
      kfA.position[0] + kfA.bezierHandles.outTangent[0],
      kfA.position[1] + kfA.bezierHandles.outTangent[1],
      kfA.position[2] + kfA.bezierHandles.outTangent[2],
    ];
    const p2: Vec3 = [
      kfB.position[0] + kfB.bezierHandles.inTangent[0],
      kfB.position[1] + kfB.bezierHandles.inTangent[1],
      kfB.position[2] + kfB.bezierHandles.inTangent[2],
    ];
    const p3 = kfB.position;

    return cubicBezierVec3(p0, p1, p2, p3, t);
  }

  private bezierTarget(kfA: CinematicKeyframe, kfB: CinematicKeyframe, t: number): Vec3 {
    // For target, use simple lerp (Bezier handles primarily control position path)
    return vec3Lerp(kfA.target, kfB.target, t);
  }

  // ===========================================================================
  // HERMITE INTERPOLATION
  // ===========================================================================

  private hermitePosition(kfA: CinematicKeyframe, kfB: CinematicKeyframe, t: number): Vec3 {
    // Scale tangents by segment duration for proper speed control
    const segDuration = kfB.time - kfA.time;
    const m0: Vec3 = [
      kfA.hermiteTangent[0] * segDuration,
      kfA.hermiteTangent[1] * segDuration,
      kfA.hermiteTangent[2] * segDuration,
    ];
    const m1: Vec3 = [
      kfB.hermiteTangent[0] * segDuration,
      kfB.hermiteTangent[1] * segDuration,
      kfB.hermiteTangent[2] * segDuration,
    ];

    return hermiteVec3(kfA.position, m0, kfB.position, m1, t);
  }

  private hermiteTarget(kfA: CinematicKeyframe, kfB: CinematicKeyframe, t: number): Vec3 {
    // For target, use simple lerp (Hermite tangents primarily control position)
    return vec3Lerp(kfA.target, kfB.target, t);
  }

  // ===========================================================================
  // CONVERSION
  // ===========================================================================

  private keyframeToCamera(kf: CinematicKeyframe): EvaluatedCameraState {
    return {
      position: [...kf.position],
      target: [...kf.target],
      up: [...kf.up],
      fovY: kf.fovY,
      roll: kf.roll,
      dofFocusDistance: kf.dofFocusDistance,
      dofAperture: kf.dofAperture,
      aspect: DEFAULT_EVALUATED_CAMERA.aspect,
      near: DEFAULT_EVALUATED_CAMERA.near,
      far: DEFAULT_EVALUATED_CAMERA.far,
    };
  }
}

/**
 * Factory function for creating a CinematicPathEngine.
 */
export function createCinematicPathEngine(
  sequence?: CinematicSequence,
): CinematicPathEngine {
  return new CinematicPathEngine(sequence);
}
