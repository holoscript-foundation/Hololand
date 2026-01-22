
import { EventBus } from '../EventBus';

export interface DialogNode {
  id: string;
  text: string;
  options: { text: string; nextId?: string; action?: string }[];
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
  }

  loadDialogs(dialogs: DialogNode[]) {
    dialogs.forEach(d => this.dialogs.set(d.id, d));
  }

  getDialog(id: string): DialogNode | undefined {
    return this.dialogs.get(id);
  }
}
