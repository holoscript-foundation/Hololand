/**
 * @hololand/spatial-builder - SceneEditorApp
 *
 * Top-level layout component that composes all scene editor panels:
 *   - EditorToolbar (top)
 *   - AssetPalette (left sidebar)
 *   - SceneHierarchyPanel (left sidebar, below palette)
 *   - SceneEditorViewport (center, 3D canvas)
 *   - PropertiesPanel (right sidebar)
 *
 * Also handles global keyboard shortcuts for the editor.
 */

import React, { useEffect, useCallback } from 'react';
import { useSceneEditor } from './useSceneEditor';
import { SceneEditorViewport } from './SceneEditorViewport';
import { SceneHierarchyPanel } from './SceneHierarchyPanel';
import { AssetPalette } from './AssetPalette';
import { PropertiesPanel } from './PropertiesPanel';
import { EditorToolbar } from './EditorToolbar';

export interface SceneEditorAppProps {
  /** Optional CSS class for the root container */
  className?: string;
  /** Optional inline style for the root container */
  style?: React.CSSProperties;
}

/**
 * SceneEditorApp
 *
 * Full drag-and-drop scene editor with:
 * - R3F viewport with TransformControls gizmos
 * - Asset palette for spawning primitives and lights
 * - Scene hierarchy tree with rename/visibility/lock/delete
 * - Properties inspector for transform, material, and light editing
 * - Toolbar with transform mode, snap, grid/axes toggles, undo/redo
 * - Global keyboard shortcuts (W/E/R, Delete, Ctrl+D, Ctrl+Z/Y)
 */
export const SceneEditorApp: React.FC<SceneEditorAppProps> = ({
  className,
  style,
}) => {
  const editor = useSceneEditor();

  // ------ Global Keyboard Shortcuts ------

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      switch (e.key.toLowerCase()) {
        // Transform modes
        case 'w':
          if (!ctrl) editor.setTransformMode('translate');
          break;
        case 'e':
          if (!ctrl) editor.setTransformMode('rotate');
          break;
        case 'r':
          if (!ctrl) editor.setTransformMode('scale');
          break;

        // Delete selected
        case 'delete':
        case 'backspace':
          if (editor.selectedId) {
            editor.removeObject(editor.selectedId);
          }
          break;

        // Duplicate
        case 'd':
          if (ctrl && editor.selectedId) {
            e.preventDefault();
            editor.duplicateObject(editor.selectedId);
          }
          break;

        // Undo
        case 'z':
          if (ctrl && !e.shiftKey) {
            e.preventDefault();
            editor.undo();
          }
          // Redo (Ctrl+Shift+Z)
          if (ctrl && e.shiftKey) {
            e.preventDefault();
            editor.redo();
          }
          break;

        // Redo (Ctrl+Y)
        case 'y':
          if (ctrl) {
            e.preventDefault();
            editor.redo();
          }
          break;

        // Deselect
        case 'escape':
          editor.selectObject(null);
          break;

        // Toggle snap
        case 'x':
          if (!ctrl) editor.toggleSnap();
          break;

        // Toggle grid
        case 'g':
          if (!ctrl) editor.toggleGrid();
          break;

        default:
          break;
      }
    },
    [editor]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0a0a14',
        color: 'white',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        ...style,
      }}
    >
      {/* Top Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Main content area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar: Asset Palette + Hierarchy */}
        <div
          style={{
            width: '220px',
            minWidth: '180px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Asset Palette (top half) */}
          <div style={{ flex: '0 0 auto', maxHeight: '50%', overflow: 'auto' }}>
            <AssetPalette editor={editor} />
          </div>

          {/* Scene Hierarchy (bottom half) */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <SceneHierarchyPanel editor={editor} />
          </div>
        </div>

        {/* Center: 3D Viewport */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <SceneEditorViewport editor={editor} />
        </div>

        {/* Right sidebar: Properties Inspector */}
        <div
          style={{
            width: '260px',
            minWidth: '200px',
            overflow: 'hidden',
          }}
        >
          <PropertiesPanel editor={editor} />
        </div>
      </div>
    </div>
  );
};
