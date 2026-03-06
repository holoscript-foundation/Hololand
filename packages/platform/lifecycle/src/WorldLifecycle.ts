/**
 * @hololand/lifecycle WorldLifecycle
 *
 * 7-stage VR world lifecycle: Design, Train, Test, Deploy, Monitor, Optimize, Decommission.
 */

import { StageManager, type LifecycleStage } from './StageManager';
import { AWUMetric } from './AWUMetric';

export interface WorldConfig { worldId: string; name: string; template: string; maxUsers: number; }

export class WorldLifecycle {
  private worlds: Map<string, { config: WorldConfig; stage: StageManager; awu: AWUMetric }> = new Map();

  createWorld(config: WorldConfig): void {
    this.worlds.set(config.worldId, { config, stage: new StageManager(config.worldId), awu: new AWUMetric(config.worldId) });
  }

  advanceStage(worldId: string): LifecycleStage | null {
    const world = this.worlds.get(worldId);
    if (!world) return null;
    return world.stage.advance();
  }

  getStage(worldId: string): LifecycleStage | undefined { return this.worlds.get(worldId)?.stage.getCurrentStage(); }
  recordUsage(worldId: string, userId: string): void { this.worlds.get(worldId)?.awu.recordUser(userId); }
  getAWU(worldId: string): number { return this.worlds.get(worldId)?.awu.getAWU() ?? 0; }
  getWorldCount(): number { return this.worlds.size; }

  decommission(worldId: string): boolean {
    const world = this.worlds.get(worldId);
    if (!world) return false;
    world.stage.setStage('Decommission');
    return true;
  }
}
