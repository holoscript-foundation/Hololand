/**
 * @hololand/lifecycle StageManager
 *
 * Manages the 7-stage lifecycle of a VR world.
 */

export type LifecycleStage = 'Design' | 'Train' | 'Test' | 'Deploy' | 'Monitor' | 'Optimize' | 'Decommission';
const STAGE_ORDER: LifecycleStage[] = ['Design', 'Train', 'Test', 'Deploy', 'Monitor', 'Optimize', 'Decommission'];

export interface StageTransition { from: LifecycleStage; to: LifecycleStage; timestamp: number; }

export class StageManager {
  readonly worldId: string;
  private currentStage: LifecycleStage = 'Design';
  private transitions: StageTransition[] = [];

  constructor(worldId: string) { this.worldId = worldId; }

  advance(): LifecycleStage {
    const idx = STAGE_ORDER.indexOf(this.currentStage);
    if (idx < STAGE_ORDER.length - 1) {
      const next = STAGE_ORDER[idx + 1];
      this.transitions.push({ from: this.currentStage, to: next, timestamp: Date.now() });
      this.currentStage = next;
    }
    return this.currentStage;
  }

  setStage(stage: LifecycleStage): void {
    this.transitions.push({ from: this.currentStage, to: stage, timestamp: Date.now() });
    this.currentStage = stage;
  }

  getCurrentStage(): LifecycleStage { return this.currentStage; }
  getTransitions(): StageTransition[] { return [...this.transitions]; }
  canAdvance(): boolean { return STAGE_ORDER.indexOf(this.currentStage) < STAGE_ORDER.length - 1; }
}
