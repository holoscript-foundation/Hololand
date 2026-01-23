
import { EventBus, WorldEvent } from '../EventBus';

export interface DialogOption {
  text: string;
  nextId?: string;
  action?: string;
}

export interface DialogNode {
  id: string;
  text: string;
  options: DialogOption[];
}

export class DialogManager {
  private dialogs: Map<string, DialogNode> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    
    // Default fallback dialog
    this.dialogs.set('default', {
        id: 'default',
        text: 'Hello there!',
        options: [{ text: 'Bye', action: 'close' }]
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.eventBus.on('npc:interact', (event: WorldEvent) => {
        const data = event.data as { npcId: string, dialogId: string };
        if (data?.dialogId) {
          this.startDialog(data.dialogId);
        }
    });
    
    // Listen for UI events (simulated for now)
    this.eventBus.on('dialog:option', (event: WorldEvent) => {
        const data = event.data as { nextId?: string, action?: string };
        if (data?.action === 'close') {
            this.closeDialog();
        } else if (data?.nextId) {
            this.startDialog(data.nextId);
        }
    });
  }

  startDialog(id: string) {
    const dialog = this.dialogs.get(id);
    if (!dialog) {
        console.warn(`[DialogManager] Dialog ${id} not found.`);
        return;
    }
    
    this.eventBus.emit({ type: 'dialog:start', timestamp: Date.now(), data: dialog });
    console.log(`[DialogManager] Started dialog: ${dialog.text}`);
  }

  closeDialog() {
    this.eventBus.emit({ type: 'dialog:end', timestamp: Date.now() });
    console.log(`[DialogManager] Dialog closed.`);
  }

  loadDialogs(dialogs: DialogNode[]) {
    dialogs.forEach(d => this.dialogs.set(d.id, d));
  }

  getDialog(id: string): DialogNode | undefined {
    return this.dialogs.get(id);
  }
}
