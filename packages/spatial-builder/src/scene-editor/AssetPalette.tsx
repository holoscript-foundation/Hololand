/**
 * @hololand/spatial-builder - AssetPalette
 *
 * Draggable palette of primitive shapes and lights.
 * Users drag items from this panel onto the 3D viewport to spawn objects.
 * Also supports click-to-add as a fallback.
 */

import React, { useCallback } from 'react';
import {
  Box,
  Circle,
  Cylinder,
  Triangle,
  CircleDot,
  Square,
  Pill,
  Lightbulb,
  Sun,
  Flashlight,
} from 'lucide-react';
import type { AssetPaletteItem } from './types';
import { PALETTE_ITEMS } from './types';
import type { SceneEditorAPI } from './useSceneEditor';
import { AssetDropZone } from './AssetDropZone';

export interface AssetPaletteProps {
  editor: SceneEditorAPI;
}

/** Map icon string name to Lucide component */
function PaletteIcon({ icon, color }: { icon: string; color?: string }) {
  const size = 20;
  const style = color ? { color } : undefined;

  switch (icon) {
    case 'Box':
      return <Box size={size} style={style} />;
    case 'Circle':
      return <Circle size={size} style={style} />;
    case 'Cylinder':
      return <Cylinder size={size} style={style} />;
    case 'Triangle':
      return <Triangle size={size} style={style} />;
    case 'CircleDot':
      return <CircleDot size={size} style={style} />;
    case 'Square':
      return <Square size={size} style={style} />;
    case 'Pill':
      return <Pill size={size} style={style} />;
    case 'Lightbulb':
      return <Lightbulb size={size} style={style} />;
    case 'Sun':
      return <Sun size={size} style={style} />;
    case 'Flashlight':
      return <Flashlight size={size} style={style} />;
    default:
      return <Box size={size} style={style} />;
  }
}

/**
 * Single draggable palette tile.
 */
function PaletteTile({
  item,
  editor,
}: {
  item: AssetPaletteItem;
  editor: SceneEditorAPI;
}) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/hololand-asset', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [item]
  );

  const handleClick = useCallback(() => {
    // Click-to-add fallback (places at origin with random offset)
    if (item.kind === 'primitive' && item.primitiveType) {
      editor.addPrimitive(item.primitiveType);
    } else if (item.kind === 'light' && item.lightType) {
      editor.addLight(item.lightType);
    }
  }, [item, editor]);

  const isLight = item.kind === 'light';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`
        flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg cursor-grab
        active:cursor-grabbing select-none transition-all
        border border-transparent
        hover:bg-white/10 hover:border-white/20
        active:scale-95 active:bg-white/15
      `}
      title={`Drag or click to add ${item.label}`}
    >
      <div
        className={`
          w-10 h-10 rounded-lg flex items-center justify-center
          ${isLight ? 'bg-yellow-500/15 text-yellow-400' : 'bg-indigo-500/15 text-indigo-300'}
        `}
      >
        <PaletteIcon icon={item.icon} color={item.defaultColor ?? (isLight ? '#facc15' : '#818cf8')} />
      </div>
      <span className="text-[10px] text-white/60 text-center leading-tight">
        {item.label}
      </span>
    </div>
  );
}

/**
 * AssetPalette
 *
 * Grid of draggable primitive shapes and light types.
 * Drag onto the viewport to spawn, or click to add at origin.
 */
export const AssetPalette: React.FC<AssetPaletteProps> = ({ editor }) => {
  const primitives = PALETTE_ITEMS.filter((i) => i.kind === 'primitive');
  const lights = PALETTE_ITEMS.filter((i) => i.kind === 'light');

  return (
    <div className="flex flex-col h-full bg-neutral-900/95 border-r border-white/10">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          Asset Palette
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Primitives section */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider px-1 mb-1">
            Primitives
          </div>
          <div className="grid grid-cols-3 gap-1">
            {primitives.map((item) => (
              <PaletteTile key={item.id} item={item} editor={editor} />
            ))}
          </div>
        </div>

        {/* Lights section */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider px-1 mb-1">
            Lights
          </div>
          <div className="grid grid-cols-3 gap-1">
            {lights.map((item) => (
              <PaletteTile key={item.id} item={item} editor={editor} />
            ))}
          </div>
        </div>

        {/* Import section */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider px-1 mb-1">
            Import
          </div>
          <AssetDropZone editor={editor} />
        </div>

        {/* Drag hint */}
        <div className="px-2 py-3 text-[10px] text-white/25 text-center leading-relaxed border-t border-white/5 mt-2">
          Drag items onto the viewport
          <br />
          or click to add at origin
        </div>
      </div>
    </div>
  );
};
