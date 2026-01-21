
import { SpatialObject } from '../SpatialObject';
import { EventBus } from '../EventBus';

export interface NPCTrait {
  id: string;
  name: string;
  dialogId: string;
  interactionRange: number;
  currentAnimation: 'idle' | 'walk' | 'talk';
}

export class NPCSystem {
  private npcs: Map<string, NPCTrait> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  register(npc: NPCTrait) {
    this.npcs.set(npc.id, npc);
  }

  getNPC(id: string): NPCTrait | undefined {
    return this.npcs.get(id);
  }

  update(playerPos: { x: number, y: number, z: number }) {
    for (const npc of this.npcs.values()) {
      // Logic for proximity checks will go here
      // For now, just a placeholder
    }
  }

  interact(npcId: string) {
    const npc = this.npcs.get(npcId);
    if (npc) {
        this.eventBus.emit('npc:interact', { npcId, dialogId: npc.dialogId });
    }
  }
}
