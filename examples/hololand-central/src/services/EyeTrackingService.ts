/**
 * Eye Tracking Service
 * 
 * Implements WebXR Gaze Input Module for eye tracking.
 * Supports gaze-based interactions with dwell-time actions.
 */

import { EyeTrackingData } from '../types/hardware';

export interface GazeTarget {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  dwellTime: number; // milliseconds
  onGaze?: (duration: number) => void;
  onGazeEnter?: () => void;
  onGazeExit?: () => void;
}

export class EyeTrackingService {
  private session: XRSession | null = null;
  private eyeTrackingData: EyeTrackingData | null = null;
  private gazeTargets: Map<string, GazeTarget> = new Map();
  private currentGazeTarget: string | null = null;
  private gazeStartTime: number = 0;

  /**
   * Initialize eye tracking
   */
  async initialize(session: XRSession): Promise<boolean> {
    this.session = session;
    
    // Check if eye tracking is available
    const inputSources = Array.from(session.inputSources);
    const hasGazeInput = inputSources.some((source: any) => 
      source.targetRayMode === 'gaze'
    );
    
    return hasGazeInput;
  }

  /**
   * Update eye tracking data (call this every frame)
   */
  update(frame: XRFrame, referenceSpace: XRReferenceSpace): void {
    if (!this.session) return;

    const inputSources = Array.from(this.session.inputSources);
    
    for (const source of inputSources) {
      // @ts-ignore - Gaze input may not be fully typed
      if (source.targetRayMode === 'gaze') {
        const pose = frame.getPose(source.targetRaySpace, referenceSpace);
        if (!pose) continue;

        // Extract gaze point and direction
        const transform = pose.transform;
        
        this.eyeTrackingData = {
          gazePoint: {
            x: transform.position.x,
            y: transform.position.y,
            z: transform.position.z,
          },
          gazeDirection: {
            x: transform.orientation.x,
            y: transform.orientation.y,
            z: transform.orientation.z,
          },
          pupilDilation: null, // Not available in standard WebXR
          blinkState: 'open', // Not available in standard WebXR
        };

        // Check for gaze targets
        this.updateGazeTargets(frame.predictedDisplayTime || 0);
      }
    }
  }

  /**
   * Update gaze target detection
   */
  private updateGazeTargets(_timestamp: number): void {
    if (!this.eyeTrackingData?.gazePoint) return;

    let closestTarget: string | null = null;
    let closestDistance = Infinity;

    // Find closest target in gaze direction
    for (const [id, target] of this.gazeTargets.entries()) {
      const distance = this.distance(this.eyeTrackingData.gazePoint, target.position);
      
      if (distance < target.radius && distance < closestDistance) {
        closestTarget = id;
        closestDistance = distance;
      }
    }

    // Handle gaze enter/exit
    if (closestTarget !== this.currentGazeTarget) {
      // Exit previous target
      if (this.currentGazeTarget) {
        const prevTarget = this.gazeTargets.get(this.currentGazeTarget);
        prevTarget?.onGazeExit?.();
      }

      // Enter new target
      if (closestTarget) {
        const newTarget = this.gazeTargets.get(closestTarget);
        newTarget?.onGazeEnter?.();
        this.gazeStartTime = _timestamp || 0;
      } else {
        this.gazeStartTime = 0;
      }

      this.currentGazeTarget = closestTarget;
    }

    // Handle dwell time
    if (this.currentGazeTarget && this.gazeStartTime > 0 && _timestamp) {
      const target = this.gazeTargets.get(this.currentGazeTarget);
      if (!target) return;

      const gazeDuration = _timestamp - this.gazeStartTime;
      
      // Call onGaze callback with duration
      target.onGaze?.(gazeDuration);

      // Check if dwell time threshold is met
      if (gazeDuration >= target.dwellTime) {
        // Trigger action (same as a click)
        // This is handled by the onGaze callback
      }
    }
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
   * Register a gaze target
   */
  registerGazeTarget(target: GazeTarget): void {
    this.gazeTargets.set(target.id, target);
  }

  /**
   * Unregister a gaze target
   */
  unregisterGazeTarget(id: string): void {
    this.gazeTargets.delete(id);
  }

  /**
   * Get current eye tracking data
   */
  getEyeTrackingData(): EyeTrackingData | null {
    return this.eyeTrackingData;
  }

  /**
   * Get gaze point
   */
  getGazePoint(): { x: number; y: number; z: number } | null {
    return this.eyeTrackingData?.gazePoint || null;
  }

  /**
   * Get gaze direction
   */
  getGazeDirection(): { x: number; y: number; z: number } | null {
    return this.eyeTrackingData?.gazeDirection || null;
  }

  /**
   * Check if currently gazing at a target
   */
  isGazingAt(targetId: string): boolean {
    return this.currentGazeTarget === targetId;
  }

  /**
   * Get current gaze target
   */
  getCurrentGazeTarget(): string | null {
    return this.currentGazeTarget;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.session = null;
    this.eyeTrackingData = null;
    this.gazeTargets.clear();
    this.currentGazeTarget = null;
    this.gazeStartTime = 0;
  }

  /**
   * Singleton instance
   */
  private static instance: EyeTrackingService | null = null;

  static getInstance(): EyeTrackingService {
    if (!EyeTrackingService.instance) {
      EyeTrackingService.instance = new EyeTrackingService();
    }
    return EyeTrackingService.instance;
  }
}

// Export singleton
export const getEyeTrackingService = () => EyeTrackingService.getInstance();
