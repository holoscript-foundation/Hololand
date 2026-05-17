'use client';

import { useMemo } from 'react';
import type { Command } from '@/lib/commandRegistry';
import type { UseBlueprintReturn } from '@/hooks/useBlueprint';
import type { StudioTab } from '@/lib/types';

/**
 * Builds the full command list for the CommandPalette based on the
 * current blueprint store state.
 */
export function useStudioCommands(store: UseBlueprintReturn): Command[] {
  return useMemo(() => {
    const commands: Command[] = [];

    // -----------------------------------------------------------------------
    // Navigation commands (switch tabs)
    // -----------------------------------------------------------------------
    const tabs: { id: StudioTab; label: string; keywords: string[] }[] = [
      {
        id: 'body',
        label: 'Go to Body',
        keywords: ['body', 'proportions', 'height', 'build', 'skin', 'physique'],
      },
      {
        id: 'face',
        label: 'Go to Face',
        keywords: ['face', 'eyes', 'nose', 'mouth', 'shape', 'morphs'],
      },
      { id: 'hair', label: 'Go to Hair', keywords: ['hair', 'hairstyle', 'color', 'bangs'] },
      {
        id: 'clothing',
        label: 'Go to Clothing',
        keywords: ['clothing', 'clothes', 'outfit', 'shirt', 'pants', 'dress'],
      },
      {
        id: 'accessories',
        label: 'Go to Accessories',
        keywords: ['accessories', 'hat', 'glasses', 'jewelry', 'earrings'],
      },
      {
        id: 'expressions',
        label: 'Go to Expressions',
        keywords: ['expressions', 'emotion', 'smile', 'angry', 'happy', 'sad'],
      },
      {
        id: 'export',
        label: 'Go to Compile/Export',
        keywords: ['export', 'compile', 'ast', 'hsplus', 'save', 'file'],
      },
    ];

    for (const tab of tabs) {
      commands.push({
        id: `nav-${tab.id}`,
        label: tab.label,
        group: 'Navigation',
        icon: 'navigate',
        keywords: tab.keywords,
        action: () => store.setTab(tab.id),
      });
    }

    // -----------------------------------------------------------------------
    // Edit commands
    // -----------------------------------------------------------------------
    commands.push({
      id: 'edit-undo',
      label: 'Undo',
      group: 'Edit',
      icon: 'undo',
      shortcut: 'Ctrl+Z',
      keywords: ['undo', 'back', 'revert'],
      disabled: !store.canUndo,
      action: () => store.undo(),
    });

    commands.push({
      id: 'edit-redo',
      label: 'Redo',
      group: 'Edit',
      icon: 'redo',
      shortcut: 'Ctrl+Y',
      keywords: ['redo', 'forward'],
      disabled: !store.canRedo,
      action: () => store.redo(),
    });

    commands.push({
      id: 'edit-reset',
      label: 'Reset Avatar',
      group: 'Edit',
      icon: 'reset',
      keywords: ['reset', 'clear', 'default', 'start over', 'new'],
      action: () => store.reset(),
    });

    // -----------------------------------------------------------------------
    // Blueprint commands
    // -----------------------------------------------------------------------
    commands.push({
      id: 'blueprint-save',
      label: 'Mark as Saved',
      group: 'Blueprint',
      icon: 'save',
      shortcut: 'Ctrl+S',
      keywords: ['save', 'mark saved', 'persist'],
      disabled: !store.isDirty,
      action: () => store.markSaved(),
    });

    // -----------------------------------------------------------------------
    // Quick customization shortcuts
    // -----------------------------------------------------------------------
    commands.push({
      id: 'quick-skin-color',
      label: 'Change Skin Color',
      group: 'Quick Actions',
      icon: 'settings',
      keywords: ['skin', 'color', 'complexion', 'tone'],
      action: () => store.setTab('body'),
    });

    commands.push({
      id: 'quick-eye-color',
      label: 'Change Eye Color',
      group: 'Quick Actions',
      icon: 'settings',
      keywords: ['eye', 'color', 'iris'],
      action: () => store.setTab('face'),
    });

    commands.push({
      id: 'quick-hair-style',
      label: 'Change Hair Style',
      group: 'Quick Actions',
      icon: 'settings',
      keywords: ['hair', 'style', 'hairstyle', 'cut'],
      action: () => store.setTab('hair'),
    });

    commands.push({
      id: 'quick-export-hsplus',
      label: 'Compile to .hsplus',
      group: 'Quick Actions',
      icon: 'export',
      keywords: ['export', 'hsplus', 'compile', 'holoscript', 'avatar'],
      action: () => store.setTab('export'),
    });

    return commands;
  }, [store]);
}
