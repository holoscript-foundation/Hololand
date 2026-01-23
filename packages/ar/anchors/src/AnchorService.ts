/**
 * Anchor Service
 * 
 * Central manager for all anchor types.
 * Handles anchor lifecycle, fusion, and coordinate alignment.
 */

import type { 
  Anchor, 
  AnchorType, 
  AnchorServiceConfig, 
  QRAnchor,
  AprilTagAnchor,
  GPSAnchor,
  VPSAnchor,
  Pose,
  QRDetection,
  AprilTagDetection,
} from './types';
import { DEFAULT_ANCHOR_CONFIG } from './types';
import { CoordinateTransform, identityPose, interpolatePoses, distanceBetween } from './CoordinateTransform';
import { QRCodeDetector } from './detectors/QRCodeDetector';
import { AprilTagDetector } from './detectors/AprilTagDetector';
import { GPSAnchorProvider, type GPSPosition } from './detectors/GPSAnchorProvider';
import { VPSClient, type VPSConfig, type VPSResponse } from './detectors/VPSClient';

export interface AnchorObservation {
  anchor: Anchor;
  localPose: Pose;
  timestamp: number;
}

export type AnchorEventType = 'detected' | 'lost' | 'updated' | 'aligned';

export interface AnchorEvent {
  type: AnchorEventType;
  anchor: Anchor;
  timestamp: number;
}

export type AnchorEventHandler = (event: AnchorEvent) => void;

/**
 * Anchor Service
 * 
 * Manages all anchor types and coordinate alignment for AR experiences.
 */
export class AnchorService {
  private config: AnchorServiceConfig;
  
  // Anchor registry
  private anchors: Map<string, Anchor> = new Map();
  
  // World coordinate transform
  private worldTransform: CoordinateTransform;
  
  // Detectors
  private qrDetector: QRCodeDetector;
  private aprilTagDetector: AprilTagDetector;
  private gpsProvider: GPSAnchorProvider;
  private vpsClient?: VPSClient;
  
  // Known anchor world poses (from configuration)
  private knownAnchorPoses: Map<string, Pose> = new Map();
  
  // Event handlers
  private eventHandlers: Set<AnchorEventHandler> = new Set();
  
  // Alignment state
  private isAligned: boolean = false;
  private alignmentQuality: number = 0;

  constructor(config?: Partial<AnchorServiceConfig>) {
    this.config = { ...DEFAULT_ANCHOR_CONFIG, ...config };
    
    // Initialize detectors
    this.qrDetector = new QRCodeDetector({
      physicalSize: this.config.defaultQRSize,
      cameraIntrinsics: this.config.cameraIntrinsics,
      estimatePose: true,
    });
    
    this.aprilTagDetector = new AprilTagDetector({
      physicalSize: this.config.defaultAprilTagSize,
      cameraIntrinsics: this.config.cameraIntrinsics,
      estimatePose: true,
    });
    
    this.gpsProvider = new GPSAnchorProvider();
    
    // Initialize VPS if configured
    if (this.config.vpsConfig) {
      this.vpsClient = new VPSClient(this.config.vpsConfig as VPSConfig);
    }
    
    // Initialize world transform (identity until first anchor detected)
    this.worldTransform = new CoordinateTransform();
  }

  // ==========================================================================
  // ANCHOR REGISTRATION
  // ==========================================================================

  /**
   * Register a known anchor with its world pose
   * 
   * Call this to set up the world coordinate system.
   * For example, register QR codes placed at known locations.
   */
  registerKnownAnchor(anchorId: string, worldPose: Pose): void {
    this.knownAnchorPoses.set(anchorId, worldPose);
  }

  /**
   * Register multiple known anchors
   */
  registerKnownAnchors(anchors: Array<{ id: string; worldPose: Pose }>): void {
    for (const { id, worldPose } of anchors) {
      this.knownAnchorPoses.set(id, worldPose);
    }
  }

  // ==========================================================================
  // DETECTION PROCESSING
  // ==========================================================================

  /**
   * Process QR code detections
   */
  async processQRDetections(
    imageData: ImageData,
    cameraPose: Pose
  ): Promise<QRAnchor[]> {
    const detections = await this.qrDetector.detect(imageData);
    const anchors: QRAnchor[] = [];

    for (const detection of detections) {
      if (detection.confidence < this.config.minConfidence) continue;

      const anchorId = `qr_${detection.content}`;
      
      // Compute local pose (camera-relative)
      const localPose = detection.pose ?? identityPose();
      
      // Create anchor
      const anchor: QRAnchor = {
        id: anchorId,
        type: 'qr',
        worldPose: this.worldTransform.localPoseToWorld(localPose),
        confidence: detection.confidence,
        lastSeen: Date.now(),
        isVisible: true,
        content: detection.content,
        version: detection.version,
        errorCorrectionLevel: 'M', // Default, actual would come from detection
        corners: detection.corners,
      };

      // Check if this is a known anchor
      const knownPose = this.knownAnchorPoses.get(anchorId) 
        ?? this.knownAnchorPoses.get(detection.content);
      
      if (knownPose) {
        // Use known anchor for alignment
        this.alignToAnchor(anchor, localPose, knownPose);
        anchor.worldPose = knownPose;
      }

      // Update or add anchor
      this.updateAnchor(anchor);
      anchors.push(anchor);
    }

    return anchors;
  }

  /**
   * Process GPS position update
   */
  processGPSPosition(position: GPSPosition): GPSAnchor | null {
    const anchor = this.gpsProvider.createAnchor(position);
    
    if (anchor && anchor.confidence >= this.config.minConfidence) {
      // GPS anchors are always in world coordinates (lat/long)
      // Transform to local coordinate system
      this.updateAnchor(anchor);
      return anchor;
    }
    
    return null;
  }

  /**
   * Process VPS response
   */
  processVPSResponse(response: VPSResponse, locationId: string): VPSAnchor | null {
    if (!this.vpsClient) return null;
    
    const anchor = this.vpsClient.createAnchor(response, locationId);
    
    if (anchor) {
      this.updateAnchor(anchor);
      return anchor;
    }
    
    return null;
  }

  // ==========================================================================
  // ALIGNMENT
  // ==========================================================================

  /**
   * Align world coordinate system to a detected anchor
   */
  private alignToAnchor(
    detectedAnchor: Anchor,
    localPose: Pose,
    knownWorldPose: Pose
  ): void {
    if (!this.isAligned) {
      // First alignment - set transform directly
      this.worldTransform.setFromAnchor(knownWorldPose, localPose);
      this.isAligned = true;
      this.alignmentQuality = detectedAnchor.confidence;
      
      this.emitEvent({
        type: 'aligned',
        anchor: detectedAnchor,
        timestamp: Date.now(),
      });
    } else if (this.config.enableFusion) {
      // Refine existing alignment
      const weight = this.calculateRefinementWeight(detectedAnchor);
      this.worldTransform.refineFromAnchor(knownWorldPose, localPose, weight);
      
      // Update alignment quality
      const error = this.worldTransform.computeAlignmentError(knownWorldPose, localPose);
      this.alignmentQuality = Math.max(0, 1 - error.positionError / 0.1);
    }
  }

  /**
   * Calculate weight for transform refinement based on anchor quality
   */
  private calculateRefinementWeight(anchor: Anchor): number {
    // Higher confidence = higher weight
    let weight = anchor.confidence * 0.3;
    
    // Visual anchors (QR, AprilTag) are more accurate than GPS
    if (anchor.type === 'qr' || anchor.type === 'apriltag') {
      weight *= 1.5;
    } else if (anchor.type === 'gps') {
      weight *= 0.5;
    }
    
    return Math.min(0.5, weight);
  }

  // ==========================================================================
  // ANCHOR MANAGEMENT
  // ==========================================================================

  /**
   * Update or add an anchor
   */
  private updateAnchor(anchor: Anchor): void {
    const existing = this.anchors.get(anchor.id);
    
    if (existing) {
      // Update existing anchor
      if (this.config.fusionStrategy === 'weighted_average' && existing.type === anchor.type) {
        // Weighted average of poses
        const weight = anchor.confidence / (existing.confidence + anchor.confidence);
        anchor.worldPose = interpolatePoses(existing.worldPose, anchor.worldPose, weight);
        anchor.confidence = Math.max(existing.confidence, anchor.confidence);
      }
      
      this.anchors.set(anchor.id, anchor);
      this.emitEvent({ type: 'updated', anchor, timestamp: Date.now() });
    } else {
      // New anchor
      this.anchors.set(anchor.id, anchor);
      this.emitEvent({ type: 'detected', anchor, timestamp: Date.now() });
    }
  }

  /**
   * Mark stale anchors as not visible
   */
  pruneStaleAnchors(): void {
    const now = Date.now();
    
    for (const [id, anchor] of this.anchors) {
      if (anchor.isVisible && now - anchor.lastSeen > this.config.maxAnchorAge) {
        anchor.isVisible = false;
        this.anchors.set(id, anchor);
        this.emitEvent({ type: 'lost', anchor, timestamp: now });
      }
    }
  }

  /**
   * Get anchor by ID
   */
  getAnchor(id: string): Anchor | undefined {
    return this.anchors.get(id);
  }

  /**
   * Get all anchors of a specific type
   */
  getAnchorsByType(type: AnchorType): Anchor[] {
    return Array.from(this.anchors.values()).filter(a => a.type === type);
  }

  /**
   * Get all visible anchors
   */
  getVisibleAnchors(): Anchor[] {
    return Array.from(this.anchors.values()).filter(a => a.isVisible);
  }

  /**
   * Get all anchors
   */
  getAllAnchors(): Anchor[] {
    return Array.from(this.anchors.values());
  }

  /**
   * Find nearest anchor to a world position
   */
  findNearestAnchor(worldPosition: { x: number; y: number; z: number }): Anchor | null {
    let nearest: Anchor | null = null;
    let minDistance = Infinity;
    
    for (const anchor of this.anchors.values()) {
      if (!anchor.isVisible) continue;
      
      const dist = distanceBetween(worldPosition, anchor.worldPose.position);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = anchor;
      }
    }
    
    return nearest;
  }

  // ==========================================================================
  // COORDINATE TRANSFORMS
  // ==========================================================================

  /**
   * Transform a local point to world coordinates
   */
  localToWorld(localPoint: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    return this.worldTransform.localPointToWorld(localPoint);
  }

  /**
   * Transform a world point to local coordinates
   */
  worldToLocal(worldPoint: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    return this.worldTransform.worldPointToLocal(worldPoint);
  }

  /**
   * Transform a local pose to world coordinates
   */
  localPoseToWorld(localPose: Pose): Pose {
    return this.worldTransform.localPoseToWorld(localPose);
  }

  /**
   * Transform a world pose to local coordinates
   */
  worldPoseToLocal(worldPose: Pose): Pose {
    return this.worldTransform.worldPoseToLocal(worldPose);
  }

  /**
   * Check if world alignment is established
   */
  getIsAligned(): boolean {
    return this.isAligned;
  }

  /**
   * Get alignment quality (0-1)
   */
  getAlignmentQuality(): number {
    return this.alignmentQuality;
  }

  // ==========================================================================
  // EVENTS
  // ==========================================================================

  /**
   * Subscribe to anchor events
   */
  on(handler: AnchorEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Emit an anchor event
   */
  private emitEvent(event: AnchorEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Anchor event handler error:', error);
      }
    }
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Start GPS watching
   */
  startGPSTracking(callback?: (anchor: GPSAnchor) => void): void {
    this.gpsProvider.startWatching((position) => {
      const anchor = this.processGPSPosition(position);
      if (anchor && callback) {
        callback(anchor);
      }
    });
  }

  /**
   * Stop GPS watching
   */
  stopGPSTracking(): void {
    this.gpsProvider.stopWatching();
  }

  /**
   * Set GPS origin for local coordinate conversion
   */
  setGPSOrigin(position?: GPSPosition): void {
    this.gpsProvider.setOrigin(position);
  }

  /**
   * Clear all anchors and reset alignment
   */
  reset(): void {
    this.anchors.clear();
    this.worldTransform = new CoordinateTransform();
    this.isAligned = false;
    this.alignmentQuality = 0;
  }

  /**
   * Get service status
   */
  getStatus(): {
    isAligned: boolean;
    alignmentQuality: number;
    anchorCount: number;
    visibleAnchorCount: number;
    anchorTypes: Record<AnchorType, number>;
  } {
    const types: Record<AnchorType, number> = {
      qr: 0,
      apriltag: 0,
      vps: 0,
      gps: 0,
      image: 0,
      plane: 0,
      manual: 0,
    };
    
    let visibleCount = 0;
    for (const anchor of this.anchors.values()) {
      types[anchor.type]++;
      if (anchor.isVisible) visibleCount++;
    }
    
    return {
      isAligned: this.isAligned,
      alignmentQuality: this.alignmentQuality,
      anchorCount: this.anchors.size,
      visibleAnchorCount: visibleCount,
      anchorTypes: types,
    };
  }
}
