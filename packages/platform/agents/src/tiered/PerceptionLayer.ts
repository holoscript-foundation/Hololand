/**
 * @hololand/agents PerceptionLayer (Layer 0)
 *
 * Sentis-based perception processing. Handles sensor data at frame rate.
 * Outputs: detected objects, spatial relationships, gaze targets.
 */

export interface PerceptionInput {
  frameId: number;
  gazeDirection: { x: number; y: number; z: number };
  handPositions: { left: { x: number; y: number; z: number }; right: { x: number; y: number; z: number } };
  audioLevel: number;
  timestamp: number;
}

export interface PerceptionOutput {
  frameId: number;
  detectedObjects: Array<{ objectId: string; confidence: number; distance: number }>;
  gazeTarget: string | null;
  gestureDetected: string | null;
  speechDetected: boolean;
  processingTimeMs: number;
}

export class PerceptionLayer {
  private frameCount: number = 0;

  async process(input: PerceptionInput): Promise<PerceptionOutput> {
    const start = performance.now();
    this.frameCount++;

    // Simulated perception processing
    const detectedObjects = [
      { objectId: 'obj_nearest', confidence: 0.95, distance: 2.5 },
    ];

    return {
      frameId: input.frameId,
      detectedObjects,
      gazeTarget: input.gazeDirection.z > 0.5 ? 'forward_object' : null,
      gestureDetected: this.detectGesture(input.handPositions),
      speechDetected: input.audioLevel > 0.3,
      processingTimeMs: performance.now() - start,
    };
  }

  getFrameCount(): number { return this.frameCount; }

  private detectGesture(hands: PerceptionInput['handPositions']): string | null {
    const handDist = Math.sqrt(
      (hands.left.x - hands.right.x) ** 2 +
      (hands.left.y - hands.right.y) ** 2 +
      (hands.left.z - hands.right.z) ** 2,
    );
    if (handDist < 0.1) return 'pinch';
    if (hands.right.y > 1.5) return 'wave';
    return null;
  }
}
