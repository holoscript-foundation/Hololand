/**
 * @hololand/gestures - Body Pose Recognition
 */

import {
  Vec3,
  Quaternion,
  BodyJoint,
  BodyJointData,
  BodyPose,
  BodyGesture,
  BodyStance,
  BodyGestureResult,
  BodyPoseRecognizerConfig,
  DEFAULT_BODY_RECOGNIZER_CONFIG,
  GestureEvent,
  GestureEventHandler,
} from './types';

// ============================================================================
// Body Pose Analyzer
// ============================================================================

/**
 * Analyzes body pose for stance and gesture detection
 */
export class BodyPoseAnalyzer {
  private config: BodyPoseRecognizerConfig;
  private previousPose: BodyPose | null = null;
  private smoothedJoints: Map<BodyJoint, BodyJointData> = new Map();

  constructor(config: Partial<BodyPoseRecognizerConfig> = {}) {
    this.config = { ...DEFAULT_BODY_RECOGNIZER_CONFIG, ...config };
  }

  /**
   * Analyze pose and detect stance
   */
  detectStance(pose: BodyPose): BodyStance {
    const hips = pose.joints.get(BodyJoint.HIPS);
    const leftKnee = pose.joints.get(BodyJoint.LEFT_KNEE);
    const rightKnee = pose.joints.get(BodyJoint.RIGHT_KNEE);
    const head = pose.joints.get(BodyJoint.HEAD);

    if (!hips || !head) {
      return BodyStance.UNKNOWN;
    }

    // Calculate relative heights
    const hipHeight = hips.position.y;
    const headHeight = head.position.y;
    const heightRatio = headHeight / hipHeight;

    // Lying down check (head at similar or lower height than hips)
    if (headHeight < hipHeight + 0.3) {
      return BodyStance.LYING;
    }

    // Kneeling check
    if (leftKnee && rightKnee) {
      const kneeHeight = (leftKnee.position.y + rightKnee.position.y) / 2;
      if (kneeHeight < 0.2 && hipHeight < 0.8) {
        return BodyStance.KNEELING;
      }
    }

    // Sitting check (hips low, head moderate)
    if (hipHeight < 0.6 && headHeight < 1.3) {
      return BodyStance.SITTING;
    }

    // Default to standing
    return BodyStance.STANDING;
  }

  /**
   * Check if body is in T-pose
   */
  isTPose(pose: BodyPose): boolean {
    const leftShoulder = pose.joints.get(BodyJoint.LEFT_SHOULDER);
    const rightShoulder = pose.joints.get(BodyJoint.RIGHT_SHOULDER);
    const leftWrist = pose.joints.get(BodyJoint.LEFT_WRIST);
    const rightWrist = pose.joints.get(BodyJoint.RIGHT_WRIST);

    if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
      return false;
    }

    // Arms should be roughly horizontal and extended
    const leftArmHorizontal = Math.abs(leftWrist.position.y - leftShoulder.position.y) < 0.15;
    const rightArmHorizontal = Math.abs(rightWrist.position.y - rightShoulder.position.y) < 0.15;

    // Arms should be extended outward
    const leftArmExtended = Math.abs(leftWrist.position.x - leftShoulder.position.x) > 0.4;
    const rightArmExtended = Math.abs(rightWrist.position.x - rightShoulder.position.x) > 0.4;

    return leftArmHorizontal && rightArmHorizontal && leftArmExtended && rightArmExtended;
  }

  /**
   * Check if reaching up
   */
  isReachingUp(pose: BodyPose): boolean {
    const head = pose.joints.get(BodyJoint.HEAD);
    const leftWrist = pose.joints.get(BodyJoint.LEFT_WRIST);
    const rightWrist = pose.joints.get(BodyJoint.RIGHT_WRIST);

    if (!head) return false;

    const leftReaching = !!(leftWrist && leftWrist.position.y > head.position.y);
    const rightReaching = !!(rightWrist && rightWrist.position.y > head.position.y);

    return leftReaching || rightReaching;
  }

  /**
   * Check if jumping (vertical velocity and feet position)
   */
  isJumping(pose: BodyPose): boolean {
    const hips = pose.joints.get(BodyJoint.HIPS);
    const leftFoot = pose.joints.get(BodyJoint.LEFT_FOOT);
    const rightFoot = pose.joints.get(BodyJoint.RIGHT_FOOT);

    // Check upward velocity
    if (pose.velocity.y < 0.5) return false;

    // Check feet off ground
    if (leftFoot && rightFoot) {
      return leftFoot.position.y > 0.15 && rightFoot.position.y > 0.15;
    }

    return false;
  }

  /**
   * Check if crouching
   */
  isCrouching(pose: BodyPose): boolean {
    const head = pose.joints.get(BodyJoint.HEAD);
    const hips = pose.joints.get(BodyJoint.HIPS);

    if (!head || !hips) return false;

    // Head should be significantly lower than normal standing height
    return head.position.y < 1.2 && hips.position.y < 0.6;
  }

  /**
   * Apply smoothing to pose
   */
  smooth(pose: BodyPose): BodyPose {
    if (!this.config.predictionEnabled) {
      return pose;
    }

    const smoothedJoints = new Map<BodyJoint, BodyJointData>();
    const factor = this.config.smoothingFactor;

    for (const [joint, data] of pose.joints) {
      const prev = this.smoothedJoints.get(joint);
      if (prev) {
        smoothedJoints.set(joint, {
          position: {
            x: prev.position.x * factor + data.position.x * (1 - factor),
            y: prev.position.y * factor + data.position.y * (1 - factor),
            z: prev.position.z * factor + data.position.z * (1 - factor),
          },
          rotation: data.rotation, // Quaternion slerp would be better
          confidence: data.confidence,
          velocity: data.velocity,
        });
      } else {
        smoothedJoints.set(joint, data);
      }
    }

    this.smoothedJoints = smoothedJoints;

    return {
      ...pose,
      joints: smoothedJoints,
    };
  }

  /**
   * Get body facing direction
   */
  getFacingDirection(pose: BodyPose): Vec3 {
    const chest = pose.joints.get(BodyJoint.CHEST);
    const leftShoulder = pose.joints.get(BodyJoint.LEFT_SHOULDER);
    const rightShoulder = pose.joints.get(BodyJoint.RIGHT_SHOULDER);

    if (leftShoulder && rightShoulder) {
      // Cross product of shoulder vector and up vector
      const shoulderVec = {
        x: rightShoulder.position.x - leftShoulder.position.x,
        y: rightShoulder.position.y - leftShoulder.position.y,
        z: rightShoulder.position.z - leftShoulder.position.z,
      };

      // Normalize and return forward direction
      const facing = {
        x: -shoulderVec.z,
        y: 0,
        z: shoulderVec.x,
      };

      const len = Math.sqrt(facing.x ** 2 + facing.z ** 2);
      if (len > 0) {
        facing.x /= len;
        facing.z /= len;
      }

      return facing;
    }

    return pose.facing;
  }

  /**
   * Update with new pose
   */
  update(pose: BodyPose): void {
    this.previousPose = pose;
  }
}

// ============================================================================
// Body Gesture Detector
// ============================================================================

/**
 * Detects body-level gestures
 */
export class BodyGestureDetector {
  private config: BodyPoseRecognizerConfig;
  private analyzer: BodyPoseAnalyzer;
  private handlers: Set<GestureEventHandler> = new Set();
  private lastGestureTime: Map<string, number> = new Map();
  private gestureStartTime: Map<string, number> = new Map();

  constructor(config: Partial<BodyPoseRecognizerConfig> = {}) {
    this.config = { ...DEFAULT_BODY_RECOGNIZER_CONFIG, ...config };
    this.analyzer = new BodyPoseAnalyzer(config);
  }

  /**
   * Subscribe to body gesture events
   */
  on(handler: GestureEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Process body pose and detect gestures
   */
  process(pose: BodyPose): BodyGestureResult | null {
    const now = Date.now();
    const smoothedPose = this.analyzer.smooth(pose);
    const stance = this.analyzer.detectStance(smoothedPose);

    let gesture: BodyGesture | null = null;

    // Check for specific gestures
    if (this.analyzer.isTPose(smoothedPose)) {
      gesture = BodyGesture.T_POSE;
    } else if (this.analyzer.isJumping(smoothedPose)) {
      gesture = BodyGesture.JUMPING;
    } else if (this.analyzer.isCrouching(smoothedPose)) {
      gesture = BodyGesture.CROUCHING;
    } else if (this.analyzer.isReachingUp(smoothedPose)) {
      gesture = BodyGesture.REACHING_UP;
    }

    if (!gesture) {
      this.analyzer.update(smoothedPose);
      return null;
    }

    // Track gesture duration
    const gestureKey = gesture;
    if (!this.gestureStartTime.has(gestureKey)) {
      this.gestureStartTime.set(gestureKey, now);
    }

    const duration = now - (this.gestureStartTime.get(gestureKey) ?? now);

    // Debounce
    const lastTime = this.lastGestureTime.get(gestureKey) ?? 0;
    if (now - lastTime < 500) {
      return null;
    }

    this.lastGestureTime.set(gestureKey, now);

    const result: BodyGestureResult = {
      gesture,
      stance,
      confidence: smoothedPose.confidence,
      duration,
      timestamp: now,
    };

    // Emit event
    this.emit({ type: 'body', result, timestamp: now });

    this.analyzer.update(smoothedPose);
    return result;
  }

  /**
   * Get current stance
   */
  getCurrentStance(pose: BodyPose): BodyStance {
    return this.analyzer.detectStance(pose);
  }

  private emit(event: GestureEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BodyGestureDetector] Handler error:', error);
      }
    }
  }
}

/**
 * Factory function for body gesture detector
 */
export function createBodyGestureDetector(config?: Partial<BodyPoseRecognizerConfig>): BodyGestureDetector {
  return new BodyGestureDetector(config);
}

/**
 * Factory function for body pose analyzer
 */
export function createBodyPoseAnalyzer(config?: Partial<BodyPoseRecognizerConfig>): BodyPoseAnalyzer {
  return new BodyPoseAnalyzer(config);
}

// ============================================================================
// Three-Point Tracker
// ============================================================================

/**
 * Simplified body tracking using only head and two controllers
 * (common for VR headsets without full body tracking)
 */
export class ThreePointTracker {
  private headPosition: Vec3 = { x: 0, y: 1.6, z: 0 };
  private headRotation: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
  private leftHandPosition: Vec3 = { x: -0.3, y: 1.0, z: -0.3 };
  private rightHandPosition: Vec3 = { x: 0.3, y: 1.0, z: -0.3 };

  /**
   * Update tracking data
   */
  update(head: { position: Vec3; rotation: Quaternion }, leftHand: Vec3, rightHand: Vec3): void {
    this.headPosition = head.position;
    this.headRotation = head.rotation;
    this.leftHandPosition = leftHand;
    this.rightHandPosition = rightHand;
  }

  /**
   * Estimate full body pose from three points
   */
  estimateBodyPose(): BodyPose {
    const joints = new Map<BodyJoint, BodyJointData>();

    // Head
    joints.set(BodyJoint.HEAD, {
      position: this.headPosition,
      rotation: this.headRotation,
      confidence: 1.0,
    });

    // Estimate neck (slightly below head)
    joints.set(BodyJoint.NECK, {
      position: {
        x: this.headPosition.x,
        y: this.headPosition.y - 0.15,
        z: this.headPosition.z,
      },
      rotation: this.headRotation,
      confidence: 0.9,
    });

    // Estimate chest
    const chestY = this.headPosition.y - 0.4;
    joints.set(BodyJoint.CHEST, {
      position: { x: this.headPosition.x, y: chestY, z: this.headPosition.z },
      rotation: this.headRotation,
      confidence: 0.8,
    });

    // Hands
    joints.set(BodyJoint.LEFT_HAND, {
      position: this.leftHandPosition,
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      confidence: 1.0,
    });

    joints.set(BodyJoint.RIGHT_HAND, {
      position: this.rightHandPosition,
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      confidence: 1.0,
    });

    // Estimate wrists (slightly behind hands)
    joints.set(BodyJoint.LEFT_WRIST, {
      position: {
        x: this.leftHandPosition.x + 0.05,
        y: this.leftHandPosition.y,
        z: this.leftHandPosition.z + 0.05,
      },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      confidence: 0.9,
    });

    joints.set(BodyJoint.RIGHT_WRIST, {
      position: {
        x: this.rightHandPosition.x - 0.05,
        y: this.rightHandPosition.y,
        z: this.rightHandPosition.z + 0.05,
      },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      confidence: 0.9,
    });

    // Estimate shoulders
    const shoulderY = chestY + 0.1;
    joints.set(BodyJoint.LEFT_SHOULDER, {
      position: { x: this.headPosition.x - 0.2, y: shoulderY, z: this.headPosition.z },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      confidence: 0.7,
    });

    joints.set(BodyJoint.RIGHT_SHOULDER, {
      position: { x: this.headPosition.x + 0.2, y: shoulderY, z: this.headPosition.z },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      confidence: 0.7,
    });

    // Estimate hips (based on head height)
    const hipY = this.headPosition.y - 0.8;
    joints.set(BodyJoint.HIPS, {
      position: { x: this.headPosition.x, y: hipY, z: this.headPosition.z },
      rotation: this.headRotation,
      confidence: 0.6,
    });

    // Calculate facing direction from head rotation
    const facing = this.quaternionToForward(this.headRotation);

    return {
      joints,
      height: this.headPosition.y,
      facing,
      velocity: { x: 0, y: 0, z: 0 },
      timestamp: Date.now(),
      confidence: 0.7,
    };
  }

  private quaternionToForward(q: Quaternion): Vec3 {
    // Convert quaternion to forward vector
    const x = 2 * (q.x * q.z + q.w * q.y);
    const y = 2 * (q.y * q.z - q.w * q.x);
    const z = 1 - 2 * (q.x * q.x + q.y * q.y);
    return { x, y, z };
  }
}

/**
 * Factory function for three-point tracker
 */
export function createThreePointTracker(): ThreePointTracker {
  return new ThreePointTracker();
}
