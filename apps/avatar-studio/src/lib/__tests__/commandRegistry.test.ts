import { describe, it, expect } from 'vitest';
import {
  filterCommands,
  groupCommands,
  type Command,
} from '../commandRegistry';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function makeCommand(overrides: Partial<Command> & { id: string }): Command {
  return {
    label: overrides.id,
    group: 'Default',
    keywords: [],
    action: () => {},
    ...overrides,
  };
}

const SAMPLE_COMMANDS: Command[] = [
  makeCommand({ id: 'nav-body', label: 'Go to Body', group: 'Navigation', keywords: ['body', 'proportions'] }),
  makeCommand({ id: 'nav-face', label: 'Go to Face', group: 'Navigation', keywords: ['face', 'eyes'] }),
  makeCommand({ id: 'nav-hair', label: 'Go to Hair', group: 'Navigation', keywords: ['hair', 'style'] }),
  makeCommand({ id: 'edit-undo', label: 'Undo', group: 'Edit', keywords: ['undo', 'back'] }),
  makeCommand({ id: 'edit-redo', label: 'Redo', group: 'Edit', keywords: ['redo', 'forward'] }),
  makeCommand({ id: 'edit-reset', label: 'Reset Avatar', group: 'Edit', keywords: ['reset', 'clear', 'default'] }),
  makeCommand({ id: 'quick-export', label: 'Export as VRM', group: 'Quick Actions', keywords: ['export', 'vrm', 'download'] }),
];

// ---------------------------------------------------------------------------
// groupCommands
// ---------------------------------------------------------------------------

describe('groupCommands', () => {
  it('should group commands by their group field', () => {
    const groups = groupCommands(SAMPLE_COMMANDS);
    expect(groups).toHaveLength(3);
    expect(groups[0].name).toBe('Navigation');
    expect(groups[0].commands).toHaveLength(3);
    expect(groups[1].name).toBe('Edit');
    expect(groups[1].commands).toHaveLength(3);
    expect(groups[2].name).toBe('Quick Actions');
    expect(groups[2].commands).toHaveLength(1);
  });

  it('should preserve insertion order of groups', () => {
    const cmds = [
      makeCommand({ id: 'b', group: 'Beta' }),
      makeCommand({ id: 'a', group: 'Alpha' }),
      makeCommand({ id: 'b2', group: 'Beta' }),
    ];
    const groups = groupCommands(cmds);
    expect(groups.map((g) => g.name)).toEqual(['Beta', 'Alpha']);
  });

  it('should return empty array for empty input', () => {
    expect(groupCommands([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// filterCommands
// ---------------------------------------------------------------------------

describe('filterCommands', () => {
  it('should return all commands for empty query', () => {
    const result = filterCommands(SAMPLE_COMMANDS, '');
    expect(result).toHaveLength(SAMPLE_COMMANDS.length);
  });

  it('should return all commands for whitespace-only query', () => {
    const result = filterCommands(SAMPLE_COMMANDS, '   ');
    expect(result).toHaveLength(SAMPLE_COMMANDS.length);
  });

  it('should match by label substring', () => {
    const result = filterCommands(SAMPLE_COMMANDS, 'body');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].id).toBe('nav-body');
  });

  it('should match by keyword', () => {
    const result = filterCommands(SAMPLE_COMMANDS, 'proportions');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].id).toBe('nav-body');
  });

  it('should be case-insensitive', () => {
    const result = filterCommands(SAMPLE_COMMANDS, 'UNDO');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].id).toBe('edit-undo');
  });

  it('should prioritize exact label matches over partial', () => {
    const result = filterCommands(SAMPLE_COMMANDS, 'Undo');
    expect(result[0].id).toBe('edit-undo');
  });

  it('should return empty array when nothing matches', () => {
    const result = filterCommands(SAMPLE_COMMANDS, 'xyznonexistent');
    expect(result).toHaveLength(0);
  });

  it('should support multi-token queries', () => {
    const result = filterCommands(SAMPLE_COMMANDS, 'go face');
    expect(result.length).toBeGreaterThanOrEqual(1);
    // "Go to Face" should score high because both tokens match
    expect(result[0].id).toBe('nav-face');
  });

  it('should match keyword vrm', () => {
    const result = filterCommands(SAMPLE_COMMANDS, 'vrm');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].id).toBe('quick-export');
  });

  it('should rank label-starts-with higher than label-contains', () => {
    const cmds = [
      makeCommand({ id: 'contains', label: 'The Reset Button', group: 'A' }),
      makeCommand({ id: 'startswith', label: 'Reset Avatar', group: 'A' }),
    ];
    const result = filterCommands(cmds, 'reset');
    expect(result[0].id).toBe('startswith');
  });
});
