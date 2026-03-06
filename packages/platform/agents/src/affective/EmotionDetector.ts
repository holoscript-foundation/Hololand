/**
 * @hololand/agents EmotionDetector
 *
 * Detects user emotions from multimodal VR input signals.
 */

import type { EmotionVector } from './AffectiveMemory';

export interface EmotionInput {
  voiceTone: number; // -1 (negative) to 1 (positive)
  speechSpeed: number; // words per minute
  gazeStability: number; // 0 (erratic) to 1 (stable)
  headMovement: number; // 0 (still) to 1 (active)
  handGestures: string[];
  textSentiment: number; // -1 to 1
}

export interface EmotionDetectionResult {
  dominant: string;
  vector: EmotionVector;
  valence: number;
  arousal: number;
  confidence: number;
}

export class EmotionDetector {
  private detectionCount: number = 0;

  detect(input: EmotionInput): EmotionDetectionResult {
    this.detectionCount++;
    const vector: EmotionVector = {
      joy: Math.max(0, input.voiceTone * 0.4 + input.textSentiment * 0.3 + (input.handGestures.includes('thumbsUp') ? 0.3 : 0)),
      sadness: Math.max(0, -input.voiceTone * 0.4 + -input.textSentiment * 0.3 + (1 - input.gazeStability) * 0.2),
      anger: Math.max(0, input.headMovement * 0.3 + -input.voiceTone * 0.2 + (input.speechSpeed > 180 ? 0.3 : 0)),
      fear: Math.max(0, (1 - input.gazeStability) * 0.3 + -input.textSentiment * 0.2),
      surprise: Math.max(0, input.headMovement * 0.3 + (input.speechSpeed > 160 ? 0.2 : 0)),
      trust: Math.max(0, input.gazeStability * 0.4 + input.voiceTone * 0.2 + input.textSentiment * 0.2),
    };

    const entries = Object.entries(vector) as [string, number][];
    const dominant = entries.reduce((max, [k, v]) => v > max[1] ? [k, v] : max, ['neutral', 0])[0];
    const valence = (vector.joy + vector.trust) - (vector.sadness + vector.anger + vector.fear);
    const arousal = (vector.joy + vector.anger + vector.surprise + vector.fear) / 4;

    return {
      dominant,
      vector,
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(0, Math.min(1, arousal)),
      confidence: Math.min(1, entries.reduce((sum, [, v]) => sum + v, 0) / 3),
    };
  }

  getDetectionCount(): number { return this.detectionCount; }
}
