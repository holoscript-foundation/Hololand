/**
 * Affective Memory System
 * 
 * Maps Head-Mounted Display (HMD) and Controller interaction matrices into implicit emotional states.
 * Evaluates `valence` (positive/negative) and `arousal` (calm/excited) dynamically based on explicit interaction kinetics.
 */

export interface SpatialInput {
    headVelocity: number;      // m/s
    handVelocity: number;      // m/s
    headShakeFrequency: number;// Hz
    gripPressure: number;      // 0.0 - 1.0
    gazeDuration: number;      // Seconds staring at current scene focal point
}

export interface AffectiveState {
    valence: number; // -1.0 (Negative) to 1.0 (Positive)
    arousal: number; // 0.0 (Calm) to 1.0 (Excited)
    dominantEmotion: 'calm' | 'excited' | 'frustrated' | 'engaged' | 'bored' | 'anxious';
}

export class AffectiveMemorySystem {
    // Sliding Window holding past second of kinematic evaluations
    private history: SpatialInput[] = [];

    public evaluate(input: SpatialInput): AffectiveState {
        this.history.push(input);
        if(this.history.length > 60) this.history.shift(); // ~1 second @ 60hz

        const arousal = this.calculateArousal(input);
        const valence = this.calculateValence(input);

        return {
            valence: parseFloat(valence.toFixed(2)),
            arousal: parseFloat(arousal.toFixed(2)),
            dominantEmotion: this.deriveEmotion(valence, arousal)
        };
    }

    private calculateArousal(input: SpatialInput): number {
        // High generic kinematics map directly to arousal bounds
        const raw = (input.headVelocity * 0.4) + (input.handVelocity * 0.3) + (input.headShakeFrequency * 0.3);
        return Math.min(Math.max(raw, 0.0), 1.0);
    }

    private calculateValence(input: SpatialInput): number {
        // High grip pressure + erratic head shake usually = Frustration (Negative Valence)
        // Sustained Gaze + moderate hand movement = Engagement (Positive Valence)
        
        let valence = 0.0;
        
        if (input.gripPressure > 0.8 && input.headShakeFrequency > 2.0) {
            valence -= 0.6; // Frustration
        }

        if (input.gazeDuration > 2.0 && input.headVelocity < 0.5) {
            valence += 0.5; // Engaged focus
        }
        
        if (input.gripPressure < 0.2 && input.gazeDuration < 0.5 && input.headVelocity < 0.1) {
            valence -= 0.3; // Boredom / Disengagement
        }

        return Math.min(Math.max(valence, -1.0), 1.0);
    }

    private deriveEmotion(valence: number, arousal: number): AffectiveState['dominantEmotion'] {
        if (arousal > 0.7 && valence < -0.3) return 'frustrated';
        if (arousal > 0.6 && valence > 0.3) return 'excited';
        if (arousal > 0.7 && valence > -0.3 && valence < 0.3) return 'anxious';
        if (arousal < 0.3 && valence > 0.2) return 'calm';
        if (arousal < 0.3 && valence < -0.2) return 'bored';
        if (arousal > 0.3 && arousal < 0.7 && valence > 0.4) return 'engaged';
        
        return 'calm'; // Default fallback
    }

    public getSceneLoadingRecommendation(state: AffectiveState): string {
         if (state.valence < -0.5) {
             return "calming_fallback_scene";
         }
         if (state.dominantEmotion === 'engaged') {
             return "high_density_information_scene";
         }
         return "standard_scene";
    }
}
