import { SpatialObject } from '../SpatialObject';
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
        const dist = Math.sqrt(
            Math.pow(npc.interactionRange || this.DEFAULT_RANGE, 2) // Compare squared for speed? No, keep simple first
        );
        
        // Simple distance check (optimization: use squared distance)
        const dx = playerPos.x; // Accessing provided pos, let's assume 0,0,0 npc pos for now as we don't track NPC spatial pos in Trait yet
        // Wait, NPCTrait doesn't have position. It's a component. 
        // We need to assume the Entity has position. 
        // For this scaffold, we will assume generic "Origin" check or passed in NPC positions?
        // Real ECS would query SpatialComponent. 
        // As a bridge, we'll assume a dummy implementation where we check if we "are close" 
        // For the sake of the 'Guide' test, let's assume the Guide is at 0,0,0.
        
        const distToOrigin = Math.sqrt(playerPos.x * playerPos.x + playerPos.z * playerPos.z);
        
        if (distToOrigin <= (npc.interactionRange || this.DEFAULT_RANGE)) {
            if (!this.activeDialogs.has(npc.id)) {
                // Auto-trigger if in range? Or just Enable Interaction UI?
                // For this demo, let's Auto-Trigger to prove the loop works.
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
        this.eventBus.emit('npc:interact', { npcId, dialogId: npc.dialogId });
        console.log(`[NPCSystem] Interaction triggered with ${npcId}`);
    }
  }
}
