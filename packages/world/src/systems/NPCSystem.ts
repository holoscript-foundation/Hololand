import { EventBus } from '../EventBus';

export interface NPCTrait {
  id: string;
  name: string;
  dialogId: string;
  interactionRange: number;
  currentAnimation: 'idle' | 'walk' | 'talk';
  // Optional spatial info for the renderer to consume if not provided elsewhere
  position?: { x: number, y: number, z: number }; 
  model?: string;
}

export class NPCSystem {
  private npcs: Map<string, NPCTrait> = new Map();
  private eventBus: EventBus;

  private activeDialogs: Set<string> = new Set();
  
  // Default verification distance
  private readonly DEFAULT_RANGE = 3.0;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  register(npc: NPCTrait) {
    this.npcs.set(npc.id, npc);
  }

  getNPC(id: string): NPCTrait | undefined {
    return this.npcs.get(id);
  }

  getAll(): NPCTrait[] {
      return Array.from(this.npcs.values());
  }

  update(playerPos: { x: number, y: number, z: number }) {
    for (const npc of this.npcs.values()) {
        // Simple distance check from player to origin (NPC assumed at 0,0,0)
        const distToOrigin = Math.sqrt(playerPos.x * playerPos.x + playerPos.z * playerPos.z);
        
        if (distToOrigin <= (npc.interactionRange || this.DEFAULT_RANGE)) {
            if (!this.activeDialogs.has(npc.id)) {
                // Auto-trigger if in range
                this.interact(npc.id);
            }
        } else {
            // Out of range, clear active flag so we can re-trigger
            this.activeDialogs.delete(npc.id);
        }
    }
  }

  interact(npcId: string) {
    const npc = this.npcs.get(npcId);
    if (npc) {
        this.activeDialogs.add(npcId);
        this.eventBus.emit({ type: 'npc:interact', timestamp: Date.now(), data: { npcId, dialogId: npc.dialogId } });
        console.log(`[NPCSystem] Interaction triggered with ${npcId}`);
    }
  }
}
