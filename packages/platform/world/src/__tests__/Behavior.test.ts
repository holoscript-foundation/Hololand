import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NPCSystem } from '../systems/NPCSystem';
import { DialogManager } from '../managers/DialogManager';
import { HoloScriptLoader } from '../utils/HoloScriptLoader';
import { EventBus } from '../EventBus';

describe('NPC Behavior Wiring', () => {
  let eventBus: EventBus;
  let npcSystem: NPCSystem;
  let dialogManager: DialogManager;
  let loader: HoloScriptLoader;

  beforeEach(() => {
    eventBus = new EventBus();
    // Mock event bus emit to capture events
    vi.spyOn(eventBus, 'emit');

    npcSystem = new NPCSystem(eventBus);
    dialogManager = new DialogManager(eventBus);
    loader = new HoloScriptLoader(npcSystem, dialogManager);
  });

  it('should trigger dialog when player gets close to Guide', () => {
    const source = `
        @npc "Guide" {
            model: "robot_v2"
            interact: @dialog "welcome_node"
            interaction_range: 5.0
        }

        @dialog "welcome_node" {
            text: "Hello Traveler!"
            option "Hi" -> @close
        }
        `;

    // 1. Load Content
    loader.load(source);

    const guide = npcSystem.getNPC('Guide');
    expect(guide).toBeDefined();
    expect(guide?.interactionRange).toBe(5.0);

    // 2. Simulate Player Far Away (10, 0, 0)
    npcSystem.update({ x: 10, y: 0, z: 0 });
    expect(eventBus.emit).not.toHaveBeenCalledWith('npc:interact', expect.anything());

    // 3. Simulate Player Close (2, 0, 0) - Within 5.0 range
    npcSystem.update({ x: 2, y: 0, z: 0 });

    expect(eventBus.emit).toHaveBeenCalledWith('npc:interact', {
      npcId: 'Guide',
      dialogId: 'welcome_node',
    });

    // 4. Verify Dialog Logic Triggered
    // DialogManager listens to 'npc:interact', which calls startDialog, which emits 'dialog:start'
    expect(eventBus.emit).toHaveBeenCalledWith(
      'dialog:start',
      expect.objectContaining({
        id: 'welcome_node',
        text: 'Hello Traveler!',
      })
    );
  });

  it('should not re-trigger transaction while active', () => {
    const source = `@npc "Shopkeeper" { interact: "shop_intro" } @dialog "shop_intro" { text: "Buy?" }`;
    loader.load(source);

    // Trigger once
    npcSystem.update({ x: 0, y: 0, z: 0 });
    expect(eventBus.emit).toHaveBeenCalledTimes(2); // interact + dialog:start (plus load logs etc?)

    vi.clearAllMocks();

    // Trigger again (still in range)
    npcSystem.update({ x: 0.1, y: 0, z: 0 });
    expect(eventBus.emit).not.toHaveBeenCalled(); // Should be blocked by activeDialogs set
  });
});
