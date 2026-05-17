'use client';

import { useEffect, useRef } from 'react';
import type { Command, CommandGroup, CommandIcon } from '@/lib/commandRegistry';
import type { UseCommandPaletteReturn } from '@/hooks/useCommandPalette';

interface CommandPaletteProps {
  palette: UseCommandPaletteReturn;
}

// ---------------------------------------------------------------------------
// Icon Components
// ---------------------------------------------------------------------------

function CommandIconSvg({ icon }: { icon?: CommandIcon }) {
  const cls = 'w-4 h-4 text-studio-muted flex-shrink-0';

  switch (icon) {
    case 'navigate':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      );
    case 'undo':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4"
          />
        </svg>
      );
    case 'redo':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4"
          />
        </svg>
      );
    case 'reset':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      );
    case 'save':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
      );
    case 'export':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'search':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      );
    case 'settings':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Keyboard shortcut badge
// ---------------------------------------------------------------------------

function ShortcutBadge({ shortcut }: { shortcut: string }) {
  const parts = shortcut.split('+');
  return (
    <span className="flex items-center gap-0.5 ml-auto flex-shrink-0">
      {parts.map((part, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                     text-[10px] font-mono font-medium leading-none
                     text-studio-muted bg-studio-bg border border-studio-border rounded"
        >
          {part}
        </kbd>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Command Item
// ---------------------------------------------------------------------------

interface CommandItemProps {
  command: Command;
  isActive: boolean;
  onMouseEnter: () => void;
  onSelect: () => void;
}

function CommandItem({ command, isActive, onMouseEnter, onSelect }: CommandItemProps) {
  const ref = useRef<HTMLButtonElement>(null);

  // Scroll into view when active via keyboard
  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isActive]);

  return (
    <button
      ref={ref}
      id={`cmd-${command.id}`}
      role="option"
      aria-selected={isActive}
      aria-disabled={command.disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm
        transition-colors duration-75 cursor-pointer
        ${
          isActive ? 'bg-holo-600/20 text-studio-text' : 'text-studio-muted hover:bg-studio-surface'
        }
        ${command.disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      tabIndex={-1}
    >
      <CommandIconSvg icon={command.icon} />
      <span className="flex-1 truncate">{command.label}</span>
      {command.shortcut && <ShortcutBadge shortcut={command.shortcut} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Command Group Section
// ---------------------------------------------------------------------------

function GroupSection({
  group,
  commands,
  flatStartIndex,
  activeIndex,
  onSetActive,
  onSelect,
}: {
  group: CommandGroup;
  commands: Command[];
  flatStartIndex: number;
  activeIndex: number;
  onSetActive: (index: number) => void;
  onSelect: (command: Command) => void;
}) {
  return (
    <div role="group" aria-label={group.name}>
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-studio-muted/70">
        {group.name}
      </div>
      {commands.map((cmd, i) => {
        const flatIndex = flatStartIndex + i;
        return (
          <CommandItem
            key={cmd.id}
            command={cmd}
            isActive={flatIndex === activeIndex}
            onMouseEnter={() => onSetActive(flatIndex)}
            onSelect={() => onSelect(cmd)}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CommandPalette Component
// ---------------------------------------------------------------------------

export function CommandPalette({ palette }: CommandPaletteProps) {
  const {
    isOpen,
    close,
    query,
    setQuery,
    groups,
    filteredCommands,
    activeIndex,
    setActiveIndex,
    executeCommand,
    inputRef,
    handleKeyDown,
  } = palette;

  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      close();
    }
  };

  if (!isOpen) return null;

  // Build flat index offsets for each group
  let flatOffset = 0;

  return (
    <div ref={backdropRef} className="cmd-palette-backdrop" onClick={handleBackdropClick}>
      <div
        className="cmd-palette-container"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-studio-border"
          role="combobox"
          aria-expanded={true}
          aria-haspopup="listbox"
          aria-owns="cmd-palette-listbox"
        >
          <svg
            className="w-5 h-5 text-studio-muted flex-shrink-0"
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
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-studio-text placeholder-studio-muted
                       outline-none border-none"
            aria-label="Search commands"
            aria-controls="cmd-palette-listbox"
            aria-activedescendant={
              filteredCommands[activeIndex] ? `cmd-${filteredCommands[activeIndex].id}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono
                          text-studio-muted bg-studio-bg border border-studio-border rounded"
          >
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div
          id="cmd-palette-listbox"
          role="listbox"
          aria-label="Commands"
          className="max-h-[min(400px,60vh)] overflow-y-auto py-1 scroll-smooth"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-studio-muted">
              No commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups.map((group) => {
              const section = (
                <GroupSection
                  key={group.name}
                  group={group}
                  commands={group.commands}
                  flatStartIndex={flatOffset}
                  activeIndex={activeIndex}
                  onSetActive={setActiveIndex}
                  onSelect={executeCommand}
                />
              );
              flatOffset += group.commands.length;
              return section;
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-studio-border text-[10px] text-studio-muted">
          <span className="flex items-center gap-1">
            <kbd
              className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-mono
                            bg-studio-bg border border-studio-border rounded"
            >
              &uarr;
            </kbd>
            <kbd
              className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-mono
                            bg-studio-bg border border-studio-border rounded"
            >
              &darr;
            </kbd>
            <span className="ml-0.5">Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className="inline-flex items-center justify-center min-w-[20px] h-4 px-1 text-[9px] font-mono
                            bg-studio-bg border border-studio-border rounded"
            >
              &crarr;
            </kbd>
            <span className="ml-0.5">Select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className="inline-flex items-center justify-center min-w-[20px] h-4 px-1 text-[9px] font-mono
                            bg-studio-bg border border-studio-border rounded"
            >
              Esc
            </kbd>
            <span className="ml-0.5">Close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
