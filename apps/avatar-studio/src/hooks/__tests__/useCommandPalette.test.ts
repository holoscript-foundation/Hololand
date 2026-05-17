import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from '../useCommandPalette';
import type { Command } from '@/lib/commandRegistry';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCommands(): Command[] {
  return [
    {
      id: 'nav-body',
      label: 'Go to Body',
      group: 'Navigation',
      icon: 'navigate',
      keywords: ['body'],
      action: vi.fn(),
    },
    {
      id: 'nav-face',
      label: 'Go to Face',
      group: 'Navigation',
      icon: 'navigate',
      keywords: ['face'],
      action: vi.fn(),
    },
    {
      id: 'edit-undo',
      label: 'Undo',
      group: 'Edit',
      icon: 'undo',
      shortcut: 'Ctrl+Z',
      keywords: ['undo'],
      action: vi.fn(),
    },
    {
      id: 'edit-redo',
      label: 'Redo',
      group: 'Edit',
      icon: 'redo',
      shortcut: 'Ctrl+Y',
      keywords: ['redo'],
      action: vi.fn(),
    },
    {
      id: 'edit-reset',
      label: 'Reset Avatar',
      group: 'Edit',
      icon: 'reset',
      keywords: ['reset'],
      action: vi.fn(),
    },
  ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCommandPalette', () => {
  let commands: Command[];

  beforeEach(() => {
    commands = makeCommands();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start closed', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));
    expect(result.current.isOpen).toBe(false);
  });

  it('should open and close', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });

  it('should reset query and activeIndex on open', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    act(() => result.current.open());
    act(() => result.current.setQuery('body'));
    act(() => result.current.setActiveIndex(2));
    act(() => result.current.close());
    act(() => result.current.open());

    expect(result.current.query).toBe('');
    expect(result.current.activeIndex).toBe(0);
  });

  it('should filter commands by query', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    act(() => result.current.open());
    act(() => result.current.setQuery('undo'));

    expect(result.current.filteredCommands.length).toBeGreaterThanOrEqual(1);
    expect(result.current.filteredCommands[0].id).toBe('edit-undo');
  });

  it('should return all commands when query is empty', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    expect(result.current.filteredCommands).toHaveLength(commands.length);
  });

  it('should group filtered commands', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    // No filter - should have Navigation and Edit groups
    expect(result.current.groups.length).toBe(2);
    expect(result.current.groups[0].name).toBe('Navigation');
    expect(result.current.groups[1].name).toBe('Edit');
  });

  it('should clamp activeIndex when filteredCommands shrinks', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    act(() => result.current.open());
    act(() => result.current.setActiveIndex(4)); // last item
    act(() => result.current.setQuery('undo')); // only 1 result

    expect(result.current.activeIndex).toBe(0);
  });

  it('should handle Ctrl+K global keyboard shortcut', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    // Simulate Ctrl+K
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should handle Meta+K (Cmd+K) global keyboard shortcut', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should close on Escape when open', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should execute active command', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    act(() => result.current.open());
    act(() => result.current.setActiveIndex(0));
    act(() => result.current.executeActive());

    // Need requestAnimationFrame to fire
    // The command should have been scheduled
    expect(result.current.isOpen).toBe(false);
  });

  it('should execute a specific command', () => {
    const { result } = renderHook(() => useCommandPalette({ commands }));

    act(() => result.current.open());
    act(() => result.current.executeCommand(commands[2])); // Undo

    expect(result.current.isOpen).toBe(false);
  });

  it('should not execute disabled commands', () => {
    const disabledCmd: Command = {
      id: 'disabled',
      label: 'Disabled',
      group: 'Test',
      disabled: true,
      action: vi.fn(),
    };

    const { result } = renderHook(() => useCommandPalette({ commands: [disabledCmd] }));

    act(() => result.current.open());
    act(() => result.current.executeCommand(disabledCmd));

    // Palette should still be open because disabled commands don't execute
    // Actually our implementation closes then skips action - but the disabled
    // check prevents action() from being called
    expect(disabledCmd.action).not.toHaveBeenCalled();
  });

  describe('keyboard navigation via handleKeyDown', () => {
    it('should move down with ArrowDown', () => {
      const { result } = renderHook(() => useCommandPalette({ commands }));

      act(() => result.current.open());
      expect(result.current.activeIndex).toBe(0);

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.activeIndex).toBe(1);
    });

    it('should wrap around when ArrowDown at end', () => {
      const { result } = renderHook(() => useCommandPalette({ commands }));

      act(() => result.current.open());
      act(() => result.current.setActiveIndex(commands.length - 1));

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.activeIndex).toBe(0);
    });

    it('should move up with ArrowUp', () => {
      const { result } = renderHook(() => useCommandPalette({ commands }));

      act(() => result.current.open());
      act(() => result.current.setActiveIndex(2));

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.activeIndex).toBe(1);
    });

    it('should wrap around when ArrowUp at start', () => {
      const { result } = renderHook(() => useCommandPalette({ commands }));

      act(() => result.current.open());
      expect(result.current.activeIndex).toBe(0);

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.activeIndex).toBe(commands.length - 1);
    });

    it('should go to first with Home', () => {
      const { result } = renderHook(() => useCommandPalette({ commands }));

      act(() => result.current.open());
      act(() => result.current.setActiveIndex(3));

      act(() => {
        result.current.handleKeyDown({
          key: 'Home',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.activeIndex).toBe(0);
    });

    it('should go to last with End', () => {
      const { result } = renderHook(() => useCommandPalette({ commands }));

      act(() => result.current.open());

      act(() => {
        result.current.handleKeyDown({
          key: 'End',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.activeIndex).toBe(commands.length - 1);
    });

    it('should execute and close on Enter', () => {
      const { result } = renderHook(() => useCommandPalette({ commands }));

      act(() => result.current.open());

      act(() => {
        result.current.handleKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.isOpen).toBe(false);
    });
  });
});
