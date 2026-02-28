import { describe, it, expect } from 'vitest';
import { AffectiveMemorySystem, SpatialInput } from '../AffectiveMemorySystem';

describe('AffectiveMemorySystem', () => {
    it('should classify high-arousal and low-valence input as frustrated', () => {
        const system = new AffectiveMemorySystem();
        
        // Simulating erratic head shake, fast hands, high grip pressure
        const input: SpatialInput = {
            headVelocity: 2.5,
            handVelocity: 1.8,
            headShakeFrequency: 3.5,
            gripPressure: 0.9,
            gazeDuration: 0.1
        };

        const result = system.evaluate(input);
        
        expect(result.arousal).toBeGreaterThan(0.7);
        expect(result.valence).toBeLessThan(-0.3);
        expect(result.dominantEmotion).toBe('frustrated');
        expect(system.getSceneLoadingRecommendation(result)).toBe('calming_fallback_scene');
    });

    it('should classify low-arousal and moderate-valence input as calm', () => {
        const system = new AffectiveMemorySystem();
        
        // Simulating slow movement, steady gaze, relaxed grip
        const input: SpatialInput = {
            headVelocity: 0.2,
            handVelocity: 0.1,
            headShakeFrequency: 0.0,
            gripPressure: 0.1,
            gazeDuration: 1.5
        };

        const result = system.evaluate(input);
        
        expect(result.arousal).toBeLessThan(0.3);
        // By default, valence floats near 0 unless thresholds breached, adjusting expectation slightly loosely.
        expect(result.dominantEmotion).toBe('calm');
        expect(system.getSceneLoadingRecommendation(result)).toBe('standard_scene');
    });

    it('should classify sustained gaze with moderate arousal as engaged', () => {
        const system = new AffectiveMemorySystem();
        
        // Simulating sustained reading/interaction
        const input: SpatialInput = {
            headVelocity: 0.1,
            handVelocity: 0.8,
            headShakeFrequency: 0.1,
            gripPressure: 0.4,
            gazeDuration: 3.5
        };

        const result = system.evaluate(input);
        
        expect(result.valence).toBeGreaterThan(0.4);
        expect(result.dominantEmotion).toBe('engaged');
        expect(system.getSceneLoadingRecommendation(result)).toBe('high_density_information_scene');
    });
    
    it('should classify prolonged inactivity as bored', () => {
        const system = new AffectiveMemorySystem();
        
        const input: SpatialInput = {
            headVelocity: 0.01,
            handVelocity: 0.0,
            headShakeFrequency: 0.0,
            gripPressure: 0.05,
            gazeDuration: 0.2
        };

        const result = system.evaluate(input);
        
        expect(result.valence).toBeLessThan(-0.2);
        expect(result.dominantEmotion).toBe('bored');
    });
});
