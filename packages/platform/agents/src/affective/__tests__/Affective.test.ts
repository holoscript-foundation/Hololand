import { describe, it, expect, beforeEach } from 'vitest';
import { AffectiveMemory } from '../AffectiveMemory';
import { EmotionDetector } from '../EmotionDetector';
import { ValenceSceneLoader } from '../ValenceSceneLoader';

describe('AffectiveMemory', () => {
  let mem: AffectiveMemory;
  beforeEach(() => { mem = new AffectiveMemory(50); });

  it('stores and recalls memories', () => {
    mem.store('agent1', 'user1', { joy: 0.8, sadness: 0, anger: 0, fear: 0, surprise: 0.2, trust: 0.5 }, 'Happy greeting');
    expect(mem.getMemoryCount('agent1')).toBe(1);
    const recalled = mem.recall('agent1');
    expect(recalled.length).toBe(1);
    expect(recalled[0].valence).toBeGreaterThan(0);
  });

  it('recalls by user', () => {
    mem.store('agent1', 'user1', { joy: 0.5, sadness: 0, anger: 0, fear: 0, surprise: 0, trust: 0 }, 'Test');
    mem.store('agent1', 'user2', { joy: 0.3, sadness: 0, anger: 0, fear: 0, surprise: 0, trust: 0 }, 'Test2');
    expect(mem.recallByUser('agent1', 'user1').length).toBe(1);
  });

  it('computes average valence', () => {
    mem.store('agent1', 'u1', { joy: 1, sadness: 0, anger: 0, fear: 0, surprise: 0, trust: 0 }, 'Happy');
    mem.store('agent1', 'u1', { joy: 0, sadness: 1, anger: 0, fear: 0, surprise: 0, trust: 0 }, 'Sad');
    const avg = mem.getAverageValence('agent1');
    expect(avg).toBeCloseTo(0, 0);
  });
});

describe('EmotionDetector', () => {
  let detector: EmotionDetector;
  beforeEach(() => { detector = new EmotionDetector(); });

  it('detects positive emotion from positive signals', () => {
    const result = detector.detect({ voiceTone: 0.8, speechSpeed: 120, gazeStability: 0.9, headMovement: 0.2, handGestures: ['thumbsUp'], textSentiment: 0.7 });
    expect(result.valence).toBeGreaterThan(0);
    expect(result.dominant).toBe('joy');
  });

  it('detects negative emotion from negative signals', () => {
    const result = detector.detect({ voiceTone: -0.8, speechSpeed: 200, gazeStability: 0.2, headMovement: 0.8, handGestures: [], textSentiment: -0.7 });
    expect(result.valence).toBeLessThan(0);
  });
});

describe('ValenceSceneLoader', () => {
  let loader: ValenceSceneLoader;
  beforeEach(() => {
    loader = new ValenceSceneLoader();
    loader.registerTemplate({ sceneId: 'sunny', name: 'Sunny Garden', valenceRange: [0.5, 1.0], arousalRange: [0.3, 0.7], lightingPreset: 'warm', colorPalette: 'bright', ambientSoundId: 'birds' });
    loader.registerTemplate({ sceneId: 'calm', name: 'Calm Forest', valenceRange: [-0.5, 0.5], arousalRange: [0, 0.3], lightingPreset: 'soft', colorPalette: 'green', ambientSoundId: 'stream' });
  });

  it('selects scene matching positive valence', () => {
    const result = loader.selectScene(0.8, 0.5);
    expect(result!.sceneId).toBe('sunny');
  });

  it('selects calming scene for neutral valence', () => {
    const result = loader.selectScene(0, 0.1);
    expect(result!.sceneId).toBe('calm');
  });
});
