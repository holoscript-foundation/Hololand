
import { EventBus } from '../EventBus';

export interface DialogNode {
  id: string;
  text: string;
  options: { text: string; nextId?: string; action?: string }[];
}

export class DialogManager {
  private dialogs: Map<string, DialogNode> = new Map();
  private eventBus: EventBus;

  private currentDialog: DialogNode | null = null;

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
    this.eventBus.on('npc:interact', (data: { npcId: string, dialogId: string }) => {
        this.startDialog(data.dialogId);
    });
    
    // Listen for UI events (simulated for now)
    this.eventBus.on('dialog:option', (data: { nextId?: string, action?: string }) => {
        if (data.action === 'close') {
            this.closeDialog();
        } else if (data.nextId) {
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
    
    this.currentDialog = dialog;
    this.eventBus.emit('dialog:start', dialog); // UI would listen to this
    console.log(`[DialogManager] Started dialog: ${dialog.text}`);
  }

  closeDialog() {
    this.currentDialog = null;
    this.eventBus.emit('dialog:end', {});
    console.log(`[DialogManager] Dialog closed.`);
  }

  loadDialogs(dialogs: DialogNode[]) {
    dialogs.forEach(d => this.dialogs.set(d.id, d));
  }

  getDialog(id: string): DialogNode | undefined {
    return this.dialogs.get(id);
  }
}
