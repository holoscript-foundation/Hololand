/**
 * @hololand/spatial-builder - EditorToolbar
 *
 * Horizontal toolbar for the scene editor.
 * Controls: Transform mode, transform space, snap, grid/axes toggles, undo/redo.
 */

import React from 'react';
import {
  Move,
  RotateCw,
  Maximize2,
  Globe,
  Compass,
  Grid3x3 as GridIcon,
  Axis3D,
  Magnet,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { SceneEditorAPI } from './useSceneEditor';
import type { TransformMode } from './types';

export interface EditorToolbarProps {
  editor: SceneEditorAPI;
}

/** Small toolbar button */
function ToolButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        p-1.5 rounded transition-all
        ${active
          ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
          : 'text-white/50 hover:text-white/80 hover:bg-white/10 border border-transparent'
        }
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Icon size={16} />
    </button>
  );
}

/** Vertical separator */
function Separator() {
  return <div className="w-px h-5 bg-white/10 mx-1" />;
}

/**
 * EditorToolbar
 *
 * Horizontal bar at the top of the editor with transform mode toggles,
 * snapping, grid/axes visibility, and undo/redo.
 */
export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  const modeIcons: Record<TransformMode, React.FC<{ size?: number; className?: string }>> = {
    translate: Move,
    rotate: RotateCw,
    scale: Maximize2,
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 bg-neutral-900/95 border-b border-white/10">
      {/* Transform mode */}
      {(['translate', 'rotate', 'scale'] as TransformMode[]).map((mode) => (
        <ToolButton
          key={mode}
          icon={modeIcons[mode]}
          label={`${mode.charAt(0).toUpperCase() + mode.slice(1)} (${mode === 'translate' ? 'W' : mode === 'rotate' ? 'E' : 'R'})`}
          active={editor.transformMode === mode}
          onClick={() => editor.setTransformMode(mode)}
        />
      ))}

      <Separator />

      {/* Transform space */}
      <ToolButton
        icon={editor.transformSpace === 'world' ? Globe : Compass}
        label={`Space: ${editor.transformSpace} (click to toggle)`}
        active={false}
        onClick={() => editor.setTransformSpace(editor.transformSpace === 'world' ? 'local' : 'world')}
      />
      <span className="text-[10px] text-white/30 mx-0.5">
        {editor.transformSpace}
      </span>

      <Separator />

      {/* Snap */}
      <ToolButton
        icon={Magnet}
        label="Toggle Snapping"
        active={editor.snapEnabled}
        onClick={editor.toggleSnap}
      />

      {/* Grid */}
      <ToolButton
        icon={GridIcon}
        label="Toggle Grid"
        active={editor.showGrid}
        onClick={editor.toggleGrid}
      />

      {/* Axes */}
      <ToolButton
        icon={Axis3D}
        label="Toggle Axes"
        active={editor.showAxes}
        onClick={editor.toggleAxes}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo/Redo */}
      <ToolButton
        icon={Undo2}
        label="Undo (Ctrl+Z)"
        disabled={!editor.canUndo}
        onClick={editor.undo}
      />
      <ToolButton
        icon={Redo2}
        label="Redo (Ctrl+Shift+Z)"
        disabled={!editor.canRedo}
        onClick={editor.redo}
      />

      {/* Keyboard shortcut indicator */}
      <div className="ml-2 text-[9px] text-white/20 hidden lg:block">
        W/E/R: mode | Del: delete | Ctrl+D: duplicate | Ctrl+Z/Y: undo/redo
      </div>
    </div>
  );
};
