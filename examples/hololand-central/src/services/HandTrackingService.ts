/**
 * Hand Tracking Service
 * 
 * Implements WebXR Hand Tracking API with gesture recognition.
 * Tracks 25 hand joints per hand and detects common gestures.
 */

import {
  HandTrackingData,
  HandJoint,
  GestureName,
  XRHandJointName,
} from '../types/hardware';

export class HandTrackingService {
  private session: XRSession | null = null;
  private leftHandData: HandTrackingData | null = null;
  private rightHandData: HandTrackingData | null = null;
  private gestureCallbacks: Map<GestureName, Set<(hand: 'left' | 'right', data: HandTrackingData) => void>> = new Map();

  /**
   * Initialize hand tracking
   */
  async initialize(session: XRSession): Promise<boolean> {
    this.session = session;
    
    // Check if hand tracking is available
    const inputSources = Array.from(session.inputSources);
    const hasHandTracking = inputSources.some((source: any) => source.hand);
    
    return hasHandTracking;
  }

  /**
   * Update hand tracking data (call this every frame)
   */
  update(frame: XRFrame, referenceSpace: XRReferenceSpace): void {
    if (!this.session) return;

    const inputSources = Array.from(this.session.inputSources);

    for (const source of inputSources) {
      // @ts-ignore - WebXR Hand Tracking types
      const hand = source.hand;
      if (!hand) continue;

      const handedness = source.handedness;
      if (handedness !== 'left' && handedness !== 'right') continue;

      // Get joint data
      const joints = this.getHandJoints(hand, frame, referenceSpace);
      
      // Detect gesture
      const gesture = this.detectGesture(joints);

      const handData: HandTrackingData = {
        hand: handedness,
        joints,
        gesture,
        confidence: this.calculateConfidence(joints),
      };

      // Store data
      if (handedness === 'left') {
        this.leftHandData = handData;
      } else {
        this.rightHandData = handData;
      }

      // Trigger gesture callbacks
      if (gesture) {
        this.triggerGestureCallbacks(gesture, handedness, handData);
      }
    }
  }

  /**
   * Extract joint data from XRHand
   */
  private getHandJoints(hand: any, frame: XRFrame, referenceSpace: XRReferenceSpace): HandJoint[] {
    const joints: HandJoint[] = [];
    
    // Standard WebXR hand joint names
    const jointNames: XRHandJointName[] = [
      'wrist',
      'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
      'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
      'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
      'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
      'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
    ];

    for (const jointName of jointNames) {
      const joint = hand.get(jointName);
      if (!joint) continue;

      const jointPose = frame.getJointPose?.(joint, referenceSpace);
      if (!jointPose) continue;

      joints.push({
        name: jointName,
        position: {
          x: jointPose.transform.position.x,
          y: jointPose.transform.position.y,
          z: jointPose.transform.position.z,
        },
        rotation: {
          x: jointPose.transform.orientation.x,
          y: jointPose.transform.orientation.y,
          z: jointPose.transform.orientation.z,
          w: jointPose.transform.orientation.w,
        },
        radius: jointPose.radius || 0.01,
      });
    }

    return joints;
  }

  /**
   * Detect gesture from joint positions
   */
  private detectGesture(joints: HandJoint[]): GestureName | null {
    // Get key joints
    const thumbTip = joints.find(j => j.name === 'thumb-tip');
    const indexTip = joints.find(j => j.name === 'index-finger-tip');
    const middleTip = joints.find(j => j.name === 'middle-finger-tip');
    const ringTip = joints.find(j => j.name === 'ring-finger-tip');
    const pinkyTip = joints.find(j => j.name === 'pinky-finger-tip');
    const wrist = joints.find(j => j.name === 'wrist');

    if (!thumbTip || !indexTip || !middleTip || !ringTip || !pinkyTip || !wrist) {
      return null;
    }

    // Pinch: thumb and index finger close together
    const thumbIndexDist = this.distance(thumbTip.position, indexTip.position);
    if (thumbIndexDist < 0.03) { // 3cm threshold
      return 'pinch';
    }

    // Fist: all fingers close to palm
    const indexToWrist = this.distance(indexTip.position, wrist.position);
    const middleToWrist = this.distance(middleTip.position, wrist.position);
    const ringToWrist = this.distance(ringTip.position, wrist.position);
    const pinkyToWrist = this.distance(pinkyTip.position, wrist.position);
    
    if (indexToWrist < 0.08 && middleToWrist < 0.08 && ringToWrist < 0.08 && pinkyToWrist < 0.08) {
      return 'fist';
    }

    // Point: index finger extended, others curled
    const indexExtended = indexToWrist > 0.12;
    const othersCurled = middleToWrist < 0.08 && ringToWrist < 0.08 && pinkyToWrist < 0.08;
    
    if (indexExtended && othersCurled) {
      return 'point';
    }

    // Thumbs up: thumb extended up, fingers curled
    const thumbUp = thumbTip.position.y > wrist.position.y + 0.08;
    const fingersCurled = indexToWrist < 0.09 && middleToWrist < 0.09;
    
    if (thumbUp && fingersCurled) {
      return 'thumbs_up';
    }

    // Open hand: all fingers extended
    const allExtended = indexToWrist > 0.11 && middleToWrist > 0.11 && ringToWrist > 0.10 && pinkyToWrist > 0.09;
    
    if (allExtended) {
      return 'open';
    }

    // Grab: fingers forming a cup shape
    const cupped = indexToWrist > 0.08 && indexToWrist < 0.12 && 
                   middleToWrist > 0.08 && middleToWrist < 0.12;
    
    if (cupped) {
      return 'grab';
    }

    return null;
  }

  /**
   * Calculate distance between two 3D points
   */
  private distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate tracking confidence based on joint data quality
   */
  private calculateConfidence(joints: HandJoint[]): number {
    // More joints = higher confidence
    const jointRatio = joints.length / 25;
    
    // Check if key joints are present
    const hasKeyJoints = joints.some(j => j.name === 'wrist') &&
                         joints.some(j => j.name === 'thumb-tip') &&
                         joints.some(j => j.name === 'index-finger-tip');
    
    const baseConfidence = jointRatio * 0.8;
    const keyJointBonus = hasKeyJoints ? 0.2 : 0;
    
    return Math.min(baseConfidence + keyJointBonus, 1.0);
  }

  /**
   * Register a callback for gesture detection
   */
  onGesture(gesture: GestureName, callback: (hand: 'left' | 'right', data: HandTrackingData) => void): void {
    if (!this.gestureCallbacks.has(gesture)) {
      this.gestureCallbacks.set(gesture, new Set());
    }
    this.gestureCallbacks.get(gesture)!.add(callback);
  }

  /**
   * Unregister a gesture callback
   */
  offGesture(gesture: GestureName, callback: (hand: 'left' | 'right', data: HandTrackingData) => void): void {
    this.gestureCallbacks.get(gesture)?.delete(callback);
  }

  /**
   * Trigger gesture callbacks
   */
  private triggerGestureCallbacks(gesture: GestureName, hand: 'left' | 'right', data: HandTrackingData): void {
    const callbacks = this.gestureCallbacks.get(gesture);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(hand, data);
      } catch (err) {
        console.error(`Error in gesture callback for ${gesture}:`, err);
      }
    });
  }

  /**
   * Get current hand data
   */
  getHandData(hand: 'left' | 'right'): HandTrackingData | null {
    return hand === 'left' ? this.leftHandData : this.rightHandData;
  }

  /**
   * Get overall tracking confidence (max of both hands)
   */
  get confidence(): number {
    const leftConf = this.leftHandData?.confidence || 0;
    const rightConf = this.rightHandData?.confidence || 0;
    return Math.max(leftConf, rightConf);
  }

  /**
   * Placeholder for recalibration logic
   */
  recalibrate(): void {
    console.log('Recalibrating hand tracking sensors...');
    // In a real implementation, this might reset joint smoothing or anchor offsets
  }

  /**
   * Get position of a specific joint
   */
  getJointPosition(hand: 'left' | 'right', jointName: XRHandJointName): { x: number; y: number; z: number } | null {
    const handData = this.getHandData(hand);
    if (!handData) return null;

    const joint = handData.joints.find(j => j.name === jointName);
    return joint?.position || null;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.session = null;
    this.leftHandData = null;
    this.rightHandData = null;
    this.gestureCallbacks.clear();
  }

  /**
   * Singleton instance
   */
  private static instance: HandTrackingService | null = null;

  static getInstance(): HandTrackingService {
    if (!HandTrackingService.instance) {
      HandTrackingService.instance = new HandTrackingService();
    }
    return HandTrackingService.instance;
  }
}

// Export singleton
export const getHandTrackingService = () => HandTrackingService.getInstance();
