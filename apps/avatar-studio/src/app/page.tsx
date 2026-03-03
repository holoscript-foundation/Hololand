'use client';

import { useBlueprint } from '@/hooks/useBlueprint';
import { useStudioCommands } from '@/hooks/useStudioCommands';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { AvatarPreview } from '@/components/preview/AvatarPreview';
import { TabBar } from '@/components/editor/TabBar';
import { CommandPalette } from '@/components/command-palette';
import {
  BodyTab,
  FaceTab,
  HairTab,
  ClothingTab,
  AccessoriesTab,
  ExpressionsTab,
  ExportTab,
} from '@/components/editor';

export default function StudioPage() {
  const store = useBlueprint();
  const commands = useStudioCommands(store);
  const palette = useCommandPalette({ commands });

  const renderActiveTab = () => {
    switch (store.activeTab) {
      case 'body':
        return <BodyTab store={store} />;
      case 'face':
        return <FaceTab store={store} />;
      case 'hair':
        return <HairTab store={store} />;
      case 'clothing':
        return <ClothingTab store={store} />;
      case 'accessories':
        return <AccessoriesTab store={store} />;
      case 'expressions':
        return <ExpressionsTab store={store} />;
      case 'export':
        return <ExportTab store={store} />;
      default:
        return <BodyTab store={store} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-studio-bg">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-studio-border bg-studio-panel">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-studio-text tracking-wide">
            HOLOLAND
          </h1>
          <span className="text-xs text-studio-muted">Avatar Studio</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Command Palette trigger */}
          <button
            onClick={palette.open}
            className="studio-btn-secondary flex items-center gap-2 px-2.5 py-1.5 text-xs"
            title="Command Palette"
          >
            <svg
              className="w-3.5 h-3.5 text-studio-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="hidden sm:inline text-studio-muted">Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1 py-0.5 text-[10px] font-mono
                            text-studio-muted bg-studio-bg border border-studio-border rounded ml-1">
              {typeof navigator !== 'undefined' &&
              /Mac|iPod|iPhone|iPad/.test(navigator.platform)
                ? '\u2318K'
                : 'Ctrl+K'}
            </kbd>
          </button>

          <div className="w-px h-5 bg-studio-border mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={store.undo}
            disabled={!store.canUndo}
            className="studio-btn-secondary p-1.5 disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4"
              />
            </svg>
          </button>
          <button
            onClick={store.redo}
            disabled={!store.canRedo}
            className="studio-btn-secondary p-1.5 disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4"
              />
            </svg>
          </button>

          <div className="w-px h-5 bg-studio-border mx-1" />

          {/* Dirty indicator */}
          {store.isDirty && (
            <span className="text-[10px] text-amber-400 font-medium">
              Unsaved
            </span>
          )}

          {/* Avatar name */}
          <span className="text-xs text-studio-muted font-mono">
            {store.blueprint.name}
          </span>
        </div>
      </header>

      {/* Main Content: Preview + Editor */}
      <div className="flex flex-1 min-h-0">
        {/* 3D Preview (left) */}
        <div className="flex-1 min-w-0">
          <AvatarPreview blueprint={store.blueprint} />
        </div>

        {/* Editor Panel (right) */}
        <aside className="w-[360px] flex-shrink-0 border-l border-studio-border bg-studio-panel flex flex-col">
          <TabBar activeTab={store.activeTab} onTabChange={store.setTab} />
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderActiveTab()}
          </div>
        </aside>
      </div>

      {/* Command Palette overlay */}
      <CommandPalette palette={palette} />
    </div>
  );
}
