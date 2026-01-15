/**
 * Multi-Target Tracking (MTT) Service
 * 
 * Server-side tracker that fuses detections from multiple headsets
 * and maintains globally consistent person IDs using:
 * - Kalman filter for state estimation
 * - Hungarian algorithm for optimal data association
 * - ReID appearance embeddings for robust matching
 */

import { KalmanFilter3D } from './KalmanFilter';
import { hungarianAssignment, computeCostMatrix } from './HungarianAlgorithm';
import type {
  PersonDetection,
  TrackedPerson,
  TrackState,
  Vector3,
  TrackingConfig,
  DEFAULT_TRACKING_CONFIG,
} from '../types';

/** Internal track representation */
interface Track {
  id: string;
  kalman: KalmanFilter3D;
  appearanceEmbedding: number[];
  skeleton?: PersonDetection['skeleton'];
  age: number;
  timeSinceUpdate: number;
  hitCount: number;
  state: TrackState;
  userId?: string;
  characterId?: string;
}

/**
 * Multi-Target Tracker
 * 
 * Maintains a set of tracks and associates incoming detections
 * to tracks using optimal assignment.
 */
export class MultiTargetTracker {
  private tracks: Map<string, Track> = new Map();
  private nextTrackId: number = 1;
  private config: TrackingConfig;
  private frameNumber: number = 0;

  constructor(config?: Partial<TrackingConfig>) {
    this.config = {
      maxTrackedPersons: 20,
      processNoise: 0.1,
      measurementNoise: 0.3,
      maxAssociationDistance: 2.0,
      appearanceWeight: 0.4,
      positionWeight: 0.6,
      confirmationFrames: 3,
      maxTimeSinceUpdate: 30,
      minDetectionConfidence: 0.5,
      enableFaceRecognition: false,
      broadcastRate: 30,
      ...config,
    };
  }

  /**
   * Process detections from a single frame
   * 
   * @param detections Array of person detections
   * @param dt Time delta since last frame (seconds)
   * @returns Current tracked persons
   */
  update(detections: PersonDetection[], dt: number = 1/30): TrackedPerson[] {
    this.frameNumber++;

    // 1. Predict all tracks forward
    for (const track of this.tracks.values()) {
      track.kalman.predict(dt);
      track.age++;
      track.timeSinceUpdate++;
    }

    // 2. Filter detections by confidence
    const validDetections = detections.filter(
      d => d.confidence >= this.config.minDetectionConfidence
    );

    // 3. Build cost matrix and solve assignment
    const trackArray = Array.from(this.tracks.values());
    const tracksForMatching = trackArray.map(t => ({
      position: t.kalman.getPredictedPosition(),
      appearanceEmbedding: t.appearanceEmbedding,
    }));
    const detectionsForMatching = validDetections.map(d => ({
      position: d.position,
      appearanceEmbedding: d.appearanceEmbedding,
    }));

    const costMatrix = computeCostMatrix(
      tracksForMatching,
      detectionsForMatching,
      this.config.positionWeight,
      this.config.appearanceWeight,
      this.config.maxAssociationDistance
    );

    // Max cost for gating (reject impossible matches)
    const maxCost = 0.8;
    const assignment = hungarianAssignment(costMatrix, maxCost);

    // 4. Update matched tracks
    for (let i = 0; i < trackArray.length; i++) {
      const detectionIdx = assignment.trackToDetection[i];
      
      if (detectionIdx !== -1) {
        const track = trackArray[i];
        const detection = validDetections[detectionIdx];
        
        // Update Kalman filter with measurement
        track.kalman.update(detection.position);
        track.timeSinceUpdate = 0;
        track.hitCount++;
        
        // Update appearance embedding (exponential moving average)
        if (detection.appearanceEmbedding && track.appearanceEmbedding.length > 0) {
          const alpha = 0.1; // Smoothing factor
          track.appearanceEmbedding = track.appearanceEmbedding.map(
            (v, j) => v * (1 - alpha) + (detection.appearanceEmbedding![j] ?? 0) * alpha
          );
        } else if (detection.appearanceEmbedding) {
          track.appearanceEmbedding = [...detection.appearanceEmbedding];
        }
        
        // Update skeleton
        if (detection.skeleton) {
          track.skeleton = detection.skeleton;
        }
        
        // Promote tentative to confirmed
        if (track.state === 'tentative' && track.hitCount >= this.config.confirmationFrames) {
          track.state = 'confirmed';
        } else if (track.state === 'occluded') {
          track.state = 'confirmed';
        }
      }
    }

    // 5. Handle unmatched tracks
    for (const trackIdx of assignment.unmatchedTracks) {
      const track = trackArray[trackIdx];
      
      if (track.timeSinceUpdate > this.config.maxTimeSinceUpdate) {
        track.state = 'deleted';
      } else if (track.state === 'confirmed' && track.timeSinceUpdate > 3) {
        track.state = 'occluded';
      }
    }

    // 6. Create new tracks for unmatched detections
    for (const detectionIdx of assignment.unmatchedDetections) {
      if (this.tracks.size >= this.config.maxTrackedPersons) break;
      
      const detection = validDetections[detectionIdx];
      this.createTrack(detection);
    }

    // 7. Remove deleted tracks
    for (const [id, track] of this.tracks) {
      if (track.state === 'deleted') {
        this.tracks.delete(id);
      }
    }

    // 8. Return current tracked persons
    return this.getTrackedPersons();
  }

  /**
   * Create a new track from a detection
   */
  private createTrack(detection: PersonDetection): void {
    const id = `person_${this.nextTrackId++}`;
    
    const track: Track = {
      id,
      kalman: new KalmanFilter3D(
        detection.position,
        this.config.processNoise,
        this.config.measurementNoise
      ),
      appearanceEmbedding: detection.appearanceEmbedding 
        ? [...detection.appearanceEmbedding]
        : [],
      skeleton: detection.skeleton,
      age: 1,
      timeSinceUpdate: 0,
      hitCount: 1,
      state: 'tentative',
    };

    this.tracks.set(id, track);
  }

  /**
   * Get all confirmed/occluded tracked persons
   */
  getTrackedPersons(): TrackedPerson[] {
    const result: TrackedPerson[] = [];

    for (const track of this.tracks.values()) {
      if (track.state === 'deleted') continue;
      
      const kalmanState = track.kalman.getKalmanState();
      
      result.push({
        globalId: track.id,
        userId: track.userId,
        characterId: track.characterId,
        position: kalmanState.position,
        velocity: kalmanState.velocity,
        kalmanState,
        skeleton: track.skeleton,
        appearanceEmbedding: track.appearanceEmbedding,
        age: track.age,
        timeSinceUpdate: track.timeSinceUpdate,
        confidence: this.computeTrackConfidence(track),
        state: track.state,
      });
    }

    return result;
  }

  /**
   * Bind a user to a tracked person
   */
  bindUser(globalId: string, userId: string, characterId?: string): boolean {
    const track = this.tracks.get(globalId);
    if (!track) return false;
    
    track.userId = userId;
    if (characterId) {
      track.characterId = characterId;
    }
    return true;
  }

  /**
   * Unbind a user from a tracked person
   */
  unbindUser(globalId: string): boolean {
    const track = this.tracks.get(globalId);
    if (!track) return false;
    
    track.userId = undefined;
    track.characterId = undefined;
    return true;
  }

  /**
   * Get current user bindings
   */
  getUserBindings(): Record<string, string> {
    const bindings: Record<string, string> = {};
    for (const track of this.tracks.values()) {
      if (track.userId) {
        bindings[track.id] = track.userId;
      }
    }
    return bindings;
  }

  /**
   * Get current character bindings
   */
  getCharacterBindings(): Record<string, string> {
    const bindings: Record<string, string> = {};
    for (const track of this.tracks.values()) {
      if (track.characterId) {
        bindings[track.id] = track.characterId;
      }
    }
    return bindings;
  }

  /**
   * Compute confidence score for a track
   */
  private computeTrackConfidence(track: Track): number {
    // Base confidence from state
    let confidence = track.state === 'confirmed' ? 0.8 : 
                     track.state === 'tentative' ? 0.4 : 0.2;
    
    // Boost from hit count
    confidence += Math.min(track.hitCount * 0.01, 0.1);
    
    // Penalty for time since update
    confidence -= track.timeSinceUpdate * 0.02;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Reset tracker state
   */
  reset(): void {
    this.tracks.clear();
    this.nextTrackId = 1;
    this.frameNumber = 0;
  }

  /**
   * Get current frame number
   */
  getFrameNumber(): number {
    return this.frameNumber;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalTracks: this.tracks.size,
      confirmedTracks: Array.from(this.tracks.values()).filter(t => t.state === 'confirmed').length,
      tentativeTracks: Array.from(this.tracks.values()).filter(t => t.state === 'tentative').length,
      occludedTracks: Array.from(this.tracks.values()).filter(t => t.state === 'occluded').length,
      frameNumber: this.frameNumber,
    };
  }
}
