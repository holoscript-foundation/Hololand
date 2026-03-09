/**
 * @hololand/spatial-builder - SceneHierarchyPanel
 *
 * Tree-view panel showing the scene object hierarchy.
 * Supports select, rename, visibility toggle, lock, duplicate, delete.
 */

import React, { useState, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  Box,
  Circle,
  Lightbulb,
  Sun,
  Flashlight,
  Cylinder,
  Triangle,
  Square,
} from 'lucide-react';
import type { SceneObject } from './types';
import type { SceneEditorAPI } from './useSceneEditor';

export interface SceneHierarchyPanelProps {
  editor: SceneEditorAPI;
}

/** Map object kind/type to an icon */
function ObjectIcon({ object }: { object: SceneObject }) {
  const size = 14;
  const cls = 'shrink-0';

  if (object.kind === 'light') {
    switch (object.lightProps?.lightType) {
      case 'directional':
        return <Sun size={size} className={`${cls} text-yellow-400`} />;
      case 'spot':
        return <Flashlight size={size} className={`${cls} text-yellow-300`} />;
      default:
        return <Lightbulb size={size} className={`${cls} text-yellow-400`} />;
    }
  }

  switch (object.primitiveType) {
    case 'sphere':
      return <Circle size={size} className={`${cls} text-pink-400`} />;
    case 'cylinder':
      return <Cylinder size={size} className={`${cls} text-teal-400`} />;
    case 'cone':
      return <Triangle size={size} className={`${cls} text-amber-400`} />;
    case 'plane':
      return <Square size={size} className={`${cls} text-slate-400`} />;
    default:
      return <Box size={size} className={`${cls} text-indigo-400`} />;
  }
}

/**
 * A single row in the hierarchy tree.
 */
function HierarchyRow({
  object,
  depth,
  editor,
}: {
  object: SceneObject;
  depth: number;
  editor: SceneEditorAPI;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(object.name);
  const [expanded, setExpanded] = useState(true);

  const isSelected = editor.selectedId === object.id;
  const hasChildren = object.childIds.length > 0;

  const handleSelect = useCallback(() => {
    editor.selectObject(object.id);
  }, [editor, object.id]);

  const handleDoubleClick = useCallback(() => {
    setIsRenaming(true);
    setRenameValue(object.name);
  }, [object.name]);

  const handleRenameSubmit = useCallback(() => {
    if (renameValue.trim()) {
      editor.renameObject(object.id, renameValue.trim());
    }
    setIsRenaming(false);
  }, [editor, object.id, renameValue]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  }, [handleRenameSubmit]);

  return (
    <>
      <div
        className={`
          flex items-center gap-1 px-2 py-1 cursor-pointer select-none text-xs
          hover:bg-white/5 transition-colors group
          ${isSelected ? 'bg-indigo-500/20 border-l-2 border-indigo-400' : 'border-l-2 border-transparent'}
        `}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
      >
        {/* Expand/Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-white/40 hover:text-white/80 p-0.5"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        <ObjectIcon object={object} />

        {/* Name */}
        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            autoFocus
            className="bg-neutral-700 text-white text-xs px-1 py-0.5 rounded outline-none border border-indigo-400 flex-1 min-w-0"
          />
        ) : (
          <span className={`truncate flex-1 ${object.locked ? 'text-white/40' : 'text-white/80'}`}>
            {object.name}
          </span>
        )}

        {/* Action buttons (visible on hover or when selected) */}
        <div className={`flex items-center gap-0.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button
            onClick={(e) => { e.stopPropagation(); editor.toggleVisibility(object.id); }}
            className="p-0.5 text-white/40 hover:text-white/80"
            title={object.visible ? 'Hide' : 'Show'}
          >
            {object.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); editor.toggleLock(object.id); }}
            className="p-0.5 text-white/40 hover:text-white/80"
            title={object.locked ? 'Unlock' : 'Lock'}
          >
            {object.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); editor.duplicateObject(object.id); }}
            className="p-0.5 text-white/40 hover:text-white/80"
            title="Duplicate"
          >
            <Copy size={12} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); editor.removeObject(object.id); }}
            className="p-0.5 text-white/40 hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Render children recursively */}
      {expanded && hasChildren && object.childIds.map((childId) => {
        const child = editor.state.objects.get(childId);
        if (!child) return null;
        return (
          <HierarchyRow
            key={childId}
            object={child}
            depth={depth + 1}
            editor={editor}
          />
        );
      })}
    </>
  );
}

/**
 * SceneHierarchyPanel
 *
 * Lists all scene objects in a collapsible tree. Supports:
 * - Click to select
 * - Double-click to rename
 * - Visibility/lock/duplicate/delete buttons
 */
export const SceneHierarchyPanel: React.FC<SceneHierarchyPanelProps> = ({ editor }) => {
  const rootObjects = editor.state.rootIds
    .map((id) => editor.state.objects.get(id))
    .filter(Boolean) as SceneObject[];

  return (
    <div className="flex flex-col h-full bg-neutral-900/95 border-r border-white/10">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          Scene Hierarchy
        </h3>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto py-1">
        {rootObjects.length === 0 ? (
          <div className="px-3 py-8 text-center text-white/30 text-xs">
            No objects in scene.
            <br />
            Drag items from the Asset Palette to add objects.
          </div>
        ) : (
          rootObjects.map((obj) => (
            <HierarchyRow key={obj.id} object={obj} depth={0} editor={editor} />
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-1.5 border-t border-white/10 text-[10px] text-white/30">
        {editor.objects.length} object{editor.objects.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
