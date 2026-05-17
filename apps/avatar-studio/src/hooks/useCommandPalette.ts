'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Command } from '@/lib/commandRegistry';
import { filterCommands, groupCommands } from '@/lib/commandRegistry';

export interface UseCommandPaletteOptions {
  /** All registered commands */
  commands: Command[];
}

export interface UseCommandPaletteReturn {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Open the palette */
  open: () => void;
  /** Close the palette */
  close: () => void;
  /** Toggle the palette */
  toggle: () => void;
  /** Current search query */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Filtered and grouped commands */
  groups: ReturnType<typeof groupCommands>;
  /** Flat list of filtered commands (for keyboard navigation) */
  filteredCommands: Command[];
  /** Index of the currently highlighted command in the flat list */
  activeIndex: number;
  /** Set the active index (e.g. on mouse hover) */
  setActiveIndex: (index: number) => void;
  /** Execute the currently highlighted command and close the palette */
  executeActive: () => void;
  /** Execute a specific command and close the palette */
  executeCommand: (command: Command) => void;
  /** Ref for the search input element */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Handle keyboard events on the palette container */
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useCommandPalette({ commands }: UseCommandPaletteOptions): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset query and active index when opening/closing
  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        setQuery('');
        setActiveIndex(0);
      }
      return !prev;
    });
  }, []);

  // Filter commands based on query
  const filteredCommands = useMemo(() => filterCommands(commands, query), [commands, query]);

  // Group filtered commands
  const groups = useMemo(() => groupCommands(filteredCommands), [filteredCommands]);

  // Clamp active index when filtered results change
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(0, filteredCommands.length - 1)));
  }, [filteredCommands.length]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      // Slight delay to allow the modal to mount
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, toggle, close]);

  const executeCommand = useCallback(
    (command: Command) => {
      if (command.disabled) return;
      close();
      // Execute after close animation starts
      requestAnimationFrame(() => {
        command.action();
      });
    },
    [close]
  );

  const executeActive = useCallback(() => {
    const cmd = filteredCommands[activeIndex];
    if (cmd) {
      executeCommand(cmd);
    }
  }, [filteredCommands, activeIndex, executeCommand]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          executeActive();
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(Math.max(0, filteredCommands.length - 1));
          break;
      }
    },
    [filteredCommands.length, executeActive]
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    query,
    setQuery,
    groups,
    filteredCommands,
    activeIndex,
    setActiveIndex,
    executeActive,
    executeCommand,
    inputRef,
    handleKeyDown,
  };
}
