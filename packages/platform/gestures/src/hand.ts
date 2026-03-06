/**
 * @hololand/gestures - Hand Gesture Recognition
 */

import {
  Vec3,
  HandPose,
  HandData,
  FingerName,
  FingerState,
  GestureType,
  GestureResult,
  HandGestureRecognizerConfig,
  CustomGestureDefinition,
  DEFAULT_HAND_RECOGNIZER_CONFIG,
  GestureEvent,
  GestureEventHandler,
} from './types';

// ============================================================================
// Hand Pose Analyzer
// ============================================================================

/**
 * Analyzes hand pose data for gesture detection
 */
export class HandPoseAnalyzer {
  /**
   * Calculate pinch strength between thumb and index
   */
  calculatePinchStrength(pose: HandPose): number {
    const thumb = pose.fingers.find((f) => f.name === FingerName.THUMB);
    const index = pose.fingers.find((f) => f.name === FingerName.INDEX);

    if (!thumb || !index) return 0;

    const distance = this.distance(thumb.tipPosition, index.tipPosition);
    // Normalize: <2cm = 1.0, >10cm = 0.0
    return Math.max(0, Math.min(1, 1 - (distance - 0.02) / 0.08));
  }

  /**
   * Calculate grab strength (all fingers curled)
   */
  calculateGrabStrength(pose: HandPose): number {
    const nonThumbFingers = pose.fingers.filter((f) => f.name !== FingerName.THUMB);
    if (nonThumbFingers.length === 0) return 0;

    const avgCurl = nonThumbFingers.reduce((sum, f) => sum + f.curlAmount, 0) / nonThumbFingers.length;
    return avgCurl;
  }

  /**
   * Check if all fingers are extended
   */
  isOpenPalm(pose: HandPose, threshold = 0.6): boolean {
    return pose.fingers.every((f) => f.isExtended || f.curlAmount < threshold);
  }

  /**
   * Check if all non-thumb fingers are curled
   */
  isFist(pose: HandPose, threshold = 0.7): boolean {
    const nonThumb = pose.fingers.filter((f) => f.name !== FingerName.THUMB);
    return nonThumb.every((f) => f.curlAmount > threshold);
  }

  /**
   * Check if only index finger is extended
   */
  isPointing(pose: HandPose): boolean {
    const index = pose.fingers.find((f) => f.name === FingerName.INDEX);
    const others = pose.fingers.filter((f) => f.name !== FingerName.INDEX && f.name !== FingerName.THUMB);

    return (index?.isExtended ?? false) && others.every((f) => !f.isExtended);
  }

  /**
   * Check for peace sign (index + middle extended)
   */
  isPeaceSign(pose: HandPose): boolean {
    const index = pose.fingers.find((f) => f.name === FingerName.INDEX);
    const middle = pose.fingers.find((f) => f.name === FingerName.MIDDLE);
    const ring = pose.fingers.find((f) => f.name === FingerName.RING);
    const pinky = pose.fingers.find((f) => f.name === FingerName.PINKY);

    return (
      (index?.isExtended ?? false) &&
      (middle?.isExtended ?? false) &&
      !(ring?.isExtended ?? true) &&
      !(pinky?.isExtended ?? true)
    );
  }

  /**
   * Check for OK sign (pinch with other fingers extended)
   */
  isOkSign(pose: HandPose): boolean {
    const pinchStrength = this.calculatePinchStrength(pose);
    const middle = pose.fingers.find((f) => f.name === FingerName.MIDDLE);
    const ring = pose.fingers.find((f) => f.name === FingerName.RING);
    const pinky = pose.fingers.find((f) => f.name === FingerName.PINKY);

    return (
      pinchStrength > 0.8 &&
      (middle?.isExtended ?? false) &&
      (ring?.isExtended ?? false) &&
      (pinky?.isExtended ?? false)
    );
  }

  /**
   * Check for thumbs up
   */
  isThumbsUp(pose: HandPose): boolean {
    const thumb = pose.fingers.find((f) => f.name === FingerName.THUMB);
    const others = pose.fingers.filter((f) => f.name !== FingerName.THUMB);

    // Thumb extended and pointing up, others curled
    if (!thumb || !thumb.isExtended) return false;
    if (!others.every((f) => !f.isExtended)) return false;

    // Check thumb is pointing roughly up
    const palmNormal = pose.palmNormal;
    const isUpward = palmNormal.y > 0.5 || thumb.tipPosition.y > pose.palmPosition.y + 0.05;

    return isUpward;
  }

  /**
   * Calculate palm velocity magnitude
   */
  getPalmSpeed(pose: HandPose): number {
    const v = pose.palmVelocity;
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  private distance(a: Vec3, b: Vec3): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }
}

// ============================================================================
// Static Gesture Detector
// ============================================================================

/**
 * Detects static hand gestures
 */
export class StaticGestureDetector {
  private analyzer: HandPoseAnalyzer;
  private config: HandGestureRecognizerConfig;

  constructor(config: Partial<HandGestureRecognizerConfig> = {}) {
    this.analyzer = new HandPoseAnalyzer();
    this.config = { ...DEFAULT_HAND_RECOGNIZER_CONFIG, ...config };
  }

  /**
   * Detect gesture from hand pose
   */
  detect(pose: HandPose): GestureResult | null {
    if (pose.confidence < this.config.confidenceThreshold) {
      return null;
    }

    const timestamp = Date.now();

    // Check for pinch
    if (pose.pinchStrength >= this.config.pinchThreshold) {
      // Check for OK sign first (more specific)
      if (this.analyzer.isOkSign(pose)) {
        return this.createResult(GestureType.OK, pose, timestamp);
      }
      return this.createResult(GestureType.PINCH, pose, timestamp);
    }

    // Check for grab/fist
    if (pose.grabStrength >= this.config.grabThreshold) {
      if (this.analyzer.isFist(pose)) {
        return this.createResult(GestureType.FIST, pose, timestamp);
      }
      return this.createResult(GestureType.GRAB, pose, timestamp);
    }

    // Check for open palm
    if (this.analyzer.isOpenPalm(pose)) {
      return this.createResult(GestureType.OPEN_PALM, pose, timestamp);
    }

    // Check for point
    if (this.analyzer.isPointing(pose)) {
      return this.createResult(GestureType.POINT, pose, timestamp);
    }

    // Check for peace sign
    if (this.analyzer.isPeaceSign(pose)) {
      return this.createResult(GestureType.PEACE, pose, timestamp);
    }

    // Check for thumbs up
    if (this.analyzer.isThumbsUp(pose)) {
      return this.createResult(GestureType.THUMBS_UP, pose, timestamp);
    }

    // Check custom gestures
    for (const custom of this.config.customGestures) {
      if (this.matchesCustomGesture(pose, custom)) {
        const result = this.createResult(GestureType.CUSTOM, pose, timestamp);
        result.customName = custom.name;
        return result;
      }
    }

    return null;
  }

  private matchesCustomGesture(pose: HandPose, def: CustomGestureDefinition): boolean {
    if (def.handedness !== 'both' && def.handedness !== pose.handedness) {
      return false;
    }

    // Check finger states
    for (const [fingerName, required] of Object.entries(def.fingerStates)) {
      if (required === 'any') continue;

      const finger = pose.fingers.find((f) => f.name === fingerName);
      if (!finger) continue;

      if (required === 'extended' && !finger.isExtended) return false;
      if (required === 'curled' && finger.isExtended) return false;
    }

    // Check pinch range
    if (def.pinchRange) {
      if (pose.pinchStrength < def.pinchRange.min || pose.pinchStrength > def.pinchRange.max) {
        return false;
      }
    }

    // Check grab range
    if (def.grabRange) {
      if (pose.grabStrength < def.grabRange.min || pose.grabStrength > def.grabRange.max) {
        return false;
      }
    }

    return true;
  }

  private createResult(gesture: GestureType, pose: HandPose, timestamp: number): GestureResult {
    return {
      gesture,
      handedness: pose.handedness,
      confidence: pose.confidence,
      startPosition: { ...pose.palmPosition },
      duration: 0,
      timestamp,
    };
  }
}

// ============================================================================
// Hand Gesture Recognizer
// ============================================================================

/**
 * Full hand gesture recognizer with motion and static gesture detection
 */
export class HandGestureRecognizer {
  private config: HandGestureRecognizerConfig;
  private staticDetector: StaticGestureDetector;
  private analyzer: HandPoseAnalyzer;
  private handlers: Set<GestureEventHandler> = new Set();
  private lastGestureTime: Map<string, number> = new Map();
  private previousHands: HandData | null = null;
  private gestureStartPosition: Map<string, Vec3> = new Map();

  constructor(config: Partial<HandGestureRecognizerConfig> = {}) {
    this.config = { ...DEFAULT_HAND_RECOGNIZER_CONFIG, ...config };
    this.staticDetector = new StaticGestureDetector(this.config);
    this.analyzer = new HandPoseAnalyzer();
  }

  /**
   * Subscribe to gesture events
   */
  on(handler: GestureEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Process hand data and detect gestures
   */
  process(handData: HandData): GestureResult[] {
    const results: GestureResult[] = [];
    const now = Date.now();

    // Detect static gestures for each hand
    if (handData.left) {
      const result = this.staticDetector.detect(handData.left);
      if (result && this.shouldEmit(result, now)) {
        results.push(result);
      }
    }

    if (handData.right) {
      const result = this.staticDetector.detect(handData.right);
      if (result && this.shouldEmit(result, now)) {
        results.push(result);
      }
    }

    // Detect motion gestures
    if (this.config.enableMotionGestures && this.previousHands) {
      if (handData.left && this.previousHands.left) {
        const motionResults = this.detectMotionGestures(handData.left, this.previousHands.left, now);
        for (const r of motionResults) {
          if (this.shouldEmit(r, now)) {
            results.push(r);
          }
        }
      }
      if (handData.right && this.previousHands.right) {
        const motionResults = this.detectMotionGestures(handData.right, this.previousHands.right, now);
        for (const r of motionResults) {
          if (this.shouldEmit(r, now)) {
            results.push(r);
          }
        }
      }
    }

    // Detect two-handed gestures
    if (this.config.enableTwoHandedGestures && handData.left && handData.right) {
      const twoHandedResults = this.detectTwoHandedGestures(handData, now);
      for (const r of twoHandedResults) {
        if (this.shouldEmit(r, now)) {
          results.push(r);
        }
      }
    }

    // Store for next frame
    this.previousHands = handData;

    // Emit events
    for (const result of results) {
      this.emit({ type: 'gesture', result, timestamp: now });
    }

    return results;
  }

  /**
   * Register custom gesture
   */
  registerCustomGesture(definition: CustomGestureDefinition): void {
    this.config.customGestures.push(definition);
  }

  /**
   * Get configuration
   */
  getConfig(): HandGestureRecognizerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HandGestureRecognizerConfig>): void {
    this.config = { ...this.config, ...config };
    this.staticDetector = new StaticGestureDetector(this.config);
  }

  private detectMotionGestures(current: HandPose, previous: HandPose, now: number): GestureResult[] {
    const results: GestureResult[] = [];
    const velocity = current.palmVelocity;
    const speed = this.analyzer.getPalmSpeed(current);

    if (speed < this.config.swipeVelocityThreshold) {
      return results;
    }

    const absX = Math.abs(velocity.x);
    const absY = Math.abs(velocity.y);
    const absZ = Math.abs(velocity.z);

    let gesture: GestureType | null = null;

    if (absX > absY && absX > absZ) {
      gesture = velocity.x > 0 ? GestureType.SWIPE_RIGHT : GestureType.SWIPE_LEFT;
    } else if (absY > absX && absY > absZ) {
      gesture = velocity.y > 0 ? GestureType.SWIPE_UP : GestureType.SWIPE_DOWN;
    } else if (absZ > absX && absZ > absY) {
      gesture = velocity.z > 0 ? GestureType.PULL : GestureType.PUSH;
    }

    if (gesture) {
      results.push({
        gesture,
        handedness: current.handedness,
        confidence: current.confidence,
        startPosition: previous.palmPosition,
        endPosition: current.palmPosition,
        velocity,
        duration: now - previous.timestamp,
        timestamp: now,
      });
    }

    return results;
  }

  private detectTwoHandedGestures(data: HandData, now: number): GestureResult[] {
    const results: GestureResult[] = [];
    if (!data.left || !data.right) return results;

    const distance = this.distance(data.left.palmPosition, data.right.palmPosition);
    const prevDistance =
      this.previousHands?.left && this.previousHands?.right
        ? this.distance(this.previousHands.left.palmPosition, this.previousHands.right.palmPosition)
        : distance;

    const distanceDelta = distance - prevDistance;

    // Scale gesture
    if (Math.abs(distanceDelta) > 0.02) {
      const gesture = distanceDelta > 0 ? GestureType.SCALE_UP : GestureType.SCALE_DOWN;
      results.push({
        gesture,
        handedness: 'both',
        confidence: Math.min(data.left.confidence, data.right.confidence),
        startPosition: data.left.palmPosition,
        endPosition: data.right.palmPosition,
        scaleFactor: distance / prevDistance,
        duration: now - (this.previousHands?.timestamp ?? now),
        timestamp: now,
      });
    }

    // Clap detection
    if (data.left.grabStrength > 0.5 && data.right.grabStrength > 0.5 && distance < 0.1) {
      results.push({
        gesture: GestureType.CLAP,
        handedness: 'both',
        confidence: Math.min(data.left.confidence, data.right.confidence),
        startPosition: data.left.palmPosition,
        duration: 0,
        timestamp: now,
      });
    }

    return results;
  }

  private shouldEmit(result: GestureResult, now: number): boolean {
    const key = `${result.gesture}:${result.handedness}`;
    const lastTime = this.lastGestureTime.get(key) ?? 0;

    if (now - lastTime < this.config.debounceTime) {
      return false;
    }

    this.lastGestureTime.set(key, now);
    return true;
  }

  private emit(event: GestureEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[HandGestureRecognizer] Handler error:', error);
      }
    }
  }

  private distance(a: Vec3, b: Vec3): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }
}

/**
 * Factory function to create hand gesture recognizer
 */
export function createHandGestureRecognizer(
  config?: Partial<HandGestureRecognizerConfig>
): HandGestureRecognizer {
  return new HandGestureRecognizer(config);
}
