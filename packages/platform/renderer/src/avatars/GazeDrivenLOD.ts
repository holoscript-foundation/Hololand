/**
 * @hololand/renderer GazeDrivenLOD
 *
 * Selects avatar LOD level based on viewer gaze direction and distance.
 * Implements foveal/parafoveal/peripheral region mapping, saccade detection,
 * smooth LOD transitions, and hysteresis to prevent flickering.
 */

export interface GazeLODConfig {
  /** Foveal cone half-angle (degrees). Objects here get LOD 0 */
  fovealAngle: number;
  /** Parafoveal cone half-angle (degrees). Objects here get LOD 1 */
  parafovealAngle: number;
  /** Maximum render distance (meters) */
  maxDistance: number;
  /** Number of discrete LOD levels */
  lodLevels: number;
  /** Hysteresis margin (degrees) to prevent LOD flicker at boundaries */
  hysteresisAngleDeg: number;
  /** Hysteresis margin (meters) for distance-based LOD transitions */
  hysteresisDistanceM: number;
  /** Saccade speed threshold (degrees/second) */
  saccadeThresholdDegPerSec: number;
  /** LOD transition smoothing duration (seconds). 0 = instant */
  transitionDurationSec: number;
}

const DEFAULT_CONFIG: GazeLODConfig = {
  fovealAngle: 15,
  parafovealAngle: 30,
  maxDistance: 50,
  lodLevels: 4,
  hysteresisAngleDeg: 3,
  hysteresisDistanceM: 5,
  saccadeThresholdDegPerSec: 300,
  transitionDurationSec: 0.15,
};

export interface GazeRegion {
  region: 'foveal' | 'parafoveal' | 'peripheral';
  angleDeg: number;
  distanceM: number;
}

interface LODState {
  currentLOD: number;
  targetLOD: number;
  /** Blending factor 0-1 for smooth transitions (0 = fully currentLOD, 1 = fully targetLOD) */
  transitionProgress: number;
  lastUpdateTimestamp: number;
}

export class GazeDrivenLOD {
  private config: GazeLODConfig;

  // Per-avatar LOD state keyed by avatar ID
  private avatarStates: Map<string, LODState> = new Map();

  // Saccade detection
  private lastGazeAngle: number | null = null;
  private lastGazeTimestamp: number = 0;
  private inSaccade: boolean = false;
  private saccadeStartTime: number = 0;

  constructor(config?: Partial<GazeLODConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Original API (preserved) ─────────────────────────────────────

  computeLOD(gazeAngleDeg: number, distanceM: number): number {
    const angleFactor = Math.min(1, gazeAngleDeg / (this.config.fovealAngle * 3));
    const distanceFactor = Math.min(1, distanceM / this.config.maxDistance);
    const combined = angleFactor * 0.5 + distanceFactor * 0.5;
    return Math.min(this.config.lodLevels - 1, Math.floor(combined * this.config.lodLevels));
  }

  // ── Region classification ────────────────────────────────────────

  /**
   * Classify which gaze region an object falls into based on its
   * angular offset from gaze center and distance.
   */
  classifyRegion(gazeAngleDeg: number, distanceM: number): GazeRegion {
    let region: GazeRegion['region'];
    if (gazeAngleDeg <= this.config.fovealAngle) {
      region = 'foveal';
    } else if (gazeAngleDeg <= this.config.parafovealAngle) {
      region = 'parafoveal';
    } else {
      region = 'peripheral';
    }
    return { region, angleDeg: gazeAngleDeg, distanceM };
  }

  /**
   * Get the LOD level recommended for a given gaze region.
   * Foveal = LOD 0, Parafoveal = LOD 1, Peripheral = LOD 2+.
   */
  getRegionLOD(region: GazeRegion): number {
    const distanceLod = this.distanceToLOD(region.distanceM);

    switch (region.region) {
      case 'foveal':
        return Math.min(distanceLod, 0); // Always LOD 0 in fovea if close enough
      case 'parafoveal':
        return Math.max(1, distanceLod); // At least LOD 1
      case 'peripheral':
        return Math.max(2, distanceLod); // At least LOD 2
    }
  }

  private distanceToLOD(distanceM: number): number {
    // Map distance into LOD range: closer = lower LOD number (higher detail)
    const t = Math.min(1, distanceM / this.config.maxDistance);
    return Math.min(this.config.lodLevels - 1, Math.floor(t * this.config.lodLevels));
  }

  // ── Full LOD computation with hysteresis and transitions ─────────

  /**
   * Compute LOD for a specific avatar with hysteresis and smooth transitions.
   * Must be called each frame with the current gaze angle and distance.
   *
   * @param avatarId Unique avatar identifier for state tracking
   * @param gazeAngleDeg Angle from gaze center (degrees)
   * @param distanceM Distance from viewer (meters)
   * @param timestampSec Current time in seconds (monotonic)
   * @returns Effective LOD level (may be fractional during transitions)
   */
  computeLODSmooth(
    avatarId: string,
    gazeAngleDeg: number,
    distanceM: number,
    timestampSec: number,
  ): number {
    const region = this.classifyRegion(gazeAngleDeg, distanceM);
    const desiredLOD = this.getRegionLOD(region);

    let state = this.avatarStates.get(avatarId);
    if (!state) {
      state = {
        currentLOD: desiredLOD,
        targetLOD: desiredLOD,
        transitionProgress: 1,
        lastUpdateTimestamp: timestampSec,
      };
      this.avatarStates.set(avatarId, state);
      return desiredLOD;
    }

    const dt = timestampSec - state.lastUpdateTimestamp;
    state.lastUpdateTimestamp = timestampSec;

    // Apply hysteresis: only change target LOD if the desired LOD is different
    // AND the angle/distance has moved beyond the hysteresis margin
    const shouldSwitch = this.shouldSwitchLOD(
      state.targetLOD,
      desiredLOD,
      gazeAngleDeg,
      distanceM,
    );

    if (shouldSwitch && desiredLOD !== state.targetLOD) {
      state.targetLOD = desiredLOD;
      state.transitionProgress = 0;
    }

    // During saccade, lock LOD to prevent flicker from rapid gaze changes
    if (this.inSaccade) {
      return state.currentLOD;
    }

    // Advance transition
    if (state.transitionProgress < 1 && this.config.transitionDurationSec > 0) {
      state.transitionProgress = Math.min(1, state.transitionProgress + dt / this.config.transitionDurationSec);
    } else {
      state.transitionProgress = 1;
    }

    // Interpolate for smooth transition
    if (state.transitionProgress >= 1) {
      state.currentLOD = state.targetLOD;
      return state.targetLOD;
    }

    // Ease-in-out interpolation
    const t = state.transitionProgress;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return state.currentLOD + (state.targetLOD - state.currentLOD) * eased;
  }

  /**
   * Check hysteresis: only allow LOD switch if the gaze has moved sufficiently
   * beyond the current LOD's region boundary.
   */
  private shouldSwitchLOD(
    currentLOD: number,
    desiredLOD: number,
    gazeAngleDeg: number,
    distanceM: number,
  ): boolean {
    if (currentLOD === desiredLOD) return false;

    // Going to higher detail (lower LOD): require crossing boundary + hysteresis inward
    if (desiredLOD < currentLOD) {
      if (gazeAngleDeg <= this.config.fovealAngle - this.config.hysteresisAngleDeg) return true;
      if (gazeAngleDeg <= this.config.parafovealAngle - this.config.hysteresisAngleDeg && desiredLOD <= 1) return true;
      if (distanceM < this.config.maxDistance * 0.5 - this.config.hysteresisDistanceM) return true;
    }

    // Going to lower detail (higher LOD): require crossing boundary + hysteresis outward
    if (desiredLOD > currentLOD) {
      if (gazeAngleDeg >= this.config.fovealAngle + this.config.hysteresisAngleDeg && desiredLOD >= 1) return true;
      if (gazeAngleDeg >= this.config.parafovealAngle + this.config.hysteresisAngleDeg && desiredLOD >= 2) return true;
      if (distanceM > this.config.maxDistance * 0.5 + this.config.hysteresisDistanceM) return true;
    }

    return false;
  }

  // ── Saccade detection ────────────────────────────────────────────

  /**
   * Update saccade state based on gaze angular velocity.
   * During saccades, LOD transitions are frozen to prevent flickering.
   *
   * @param gazeAngleDeg Current gaze angle (degrees)
   * @param timestampSec Current time in seconds
   * @returns true if a saccade is currently detected
   */
  updateSaccadeDetection(gazeAngleDeg: number, timestampSec: number): boolean {
    if (this.lastGazeAngle !== null) {
      const dt = timestampSec - this.lastGazeTimestamp;
      if (dt > 0) {
        const angularVelocity = Math.abs(gazeAngleDeg - this.lastGazeAngle) / dt;

        if (angularVelocity > this.config.saccadeThresholdDegPerSec) {
          if (!this.inSaccade) {
            this.saccadeStartTime = timestampSec;
          }
          this.inSaccade = true;
        } else {
          // End saccade after a brief settling period (50ms)
          if (this.inSaccade && (timestampSec - this.saccadeStartTime) > 0.05) {
            this.inSaccade = false;
          }
        }
      }
    }

    this.lastGazeAngle = gazeAngleDeg;
    this.lastGazeTimestamp = timestampSec;
    return this.inSaccade;
  }

  isInSaccade(): boolean {
    return this.inSaccade;
  }

  // ── Utility ──────────────────────────────────────────────────────

  /**
   * Remove tracking state for an avatar that is no longer visible.
   */
  removeAvatar(avatarId: string): void {
    this.avatarStates.delete(avatarId);
  }

  /**
   * Get the number of avatars currently being tracked.
   */
  getTrackedAvatarCount(): number {
    return this.avatarStates.size;
  }

  /**
   * Reset all state.
   */
  reset(): void {
    this.avatarStates.clear();
    this.lastGazeAngle = null;
    this.lastGazeTimestamp = 0;
    this.inSaccade = false;
  }

  getConfig(): GazeLODConfig {
    return { ...this.config };
  }
}
