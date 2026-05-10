
import { parseHoloScriptPlus as parse } from '@holoscript/core';
import { NPCSystem, NPCTrait } from '../systems/NPCSystem';
import { DialogManager, DialogNode } from '../managers/DialogManager';

export class HoloScriptLoader {
  constructor(
    private npcSystem: NPCSystem,
    private dialogManager: DialogManager
  ) {}

  load(source: string) {
    const result = parse(source);
    const errors = result.errors || [];
    
    if (errors.length > 0 || !result.ast) {
      console.error('Failed to parse HoloScript source', errors);
      return;
    }

    // Handle both conventional root and fragment root
    const ast = result.ast as any;
    const directives = ast.root?.directives || ast.body || [];

    directives.forEach((d: unknown) => {
      // Cast to any to access custom properties not yet in the strict type definition if necessary
      const directive = d as any;
      
      if (directive.type === 'npc') {
        this.registerNPC(directive);
      } else if (directive.type === 'dialog') {
        this.registerDialog(directive);
      }
    });

    console.log(`Loaded content from HoloScript source.`);
  }

  private registerNPC(d: any) {
    // Parser might return strings with or without quotes depending on Lexer/Parser tests
    // Logic assumes unquoted based on recent fix, but robust handling doesn't hurt
    const cleanId = (s: string) => s ? s.replace(/^"|"$/g, '') : s;

    let dialogRef = d.props.start_dialog;
    if (!dialogRef && d.props.interact) {
       // Handle @dialog inline usage if parser supports it
       if (d.props.interact.type === 'directive' && d.props.interact.value.name) {
           dialogRef = d.props.interact.value.name;
       } else {
           dialogRef = d.props.interact;
       }
    }

    // Extract position if available [x, y, z]
    let position: { x: number, y: number, z: number } | undefined = undefined;
    const posProp = d.props.position;
    if (Array.isArray(posProp) && posProp.length === 3) {
        position = { 
            x: Number(posProp[0]), 
            y: Number(posProp[1]), 
            z: Number(posProp[2]) 
        };
    }

    const trait: NPCTrait = {
      id: cleanId(d.name),
      name: cleanId(d.name),
      dialogId: cleanId(dialogRef),
      interactionRange: Number(d.props.interaction_range || d.props.vision_range || 3.0),
      currentAnimation: cleanId(d.props.idle) as any || 'idle',
      model: d.props.model ? cleanId(d.props.model) : undefined,
      position
    };
    
    this.npcSystem.register(trait);
  }

  private registerDialog(d: any) {
    const cleanId = (s: string) => s ? s.replace(/^"|"$/g, '') : s;

    const node: DialogNode = {
      id: cleanId(d.name),
      text: cleanId(d.props.text),
      options: d.options.map((opt: any) => {
        let nextId: string | undefined;
        let action: string | undefined;

        if (opt.target && typeof opt.target === 'object' && opt.target.type === 'directive') {
             // Handle @close, @trigger
             const targetDir = opt.target.value;
             if (targetDir.name === 'close') action = 'close';
             else if (targetDir.name === 'trigger') action = targetDir.name; // Simplification
        } else {
             nextId = cleanId(opt.target);
        }

        return {
            text: cleanId(opt.text),
            nextId,
            action
        };
      })
    };
    
    this.dialogManager.loadDialogs([node]);
  }
}
