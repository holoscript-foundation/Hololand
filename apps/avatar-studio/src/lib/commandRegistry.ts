/**
 * Command Registry for the CommandPalette (Cmd+K).
 *
 * Each command has an id, label, optional group, shortcut hint,
 * keywords for fuzzy matching, and an action callback.
 */

export interface Command {
  /** Unique identifier */
  id: string;
  /** Display label shown in the palette */
  label: string;
  /** Grouping category (e.g. "Navigation", "Edit", "Export") */
  group: string;
  /** Optional keyboard shortcut hint (for display only) */
  shortcut?: string;
  /** Extra keywords that help search matching beyond the label */
  keywords?: string[];
  /** Icon name hint (svg key for the palette to render) */
  icon?: CommandIcon;
  /** Whether the command is currently disabled */
  disabled?: boolean;
  /** Execute the command */
  action: () => void;
}

export type CommandIcon =
  | 'navigate'
  | 'undo'
  | 'redo'
  | 'reset'
  | 'save'
  | 'export'
  | 'search'
  | 'settings';

export interface CommandGroup {
  name: string;
  commands: Command[];
}

/**
 * Group an array of commands by their `group` field, preserving
 * insertion order of groups.
 */
export function groupCommands(commands: Command[]): CommandGroup[] {
  const map = new Map<string, Command[]>();
  for (const cmd of commands) {
    const existing = map.get(cmd.group);
    if (existing) {
      existing.push(cmd);
    } else {
      map.set(cmd.group, [cmd]);
    }
  }
  return Array.from(map.entries()).map(([name, commands]) => ({
    name,
    commands,
  }));
}

/**
 * Filter commands by a search query. Matches against label and keywords.
 * Returns commands sorted by relevance (label match first, then keyword match).
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) return commands;

  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/);

  type ScoredCommand = { command: Command; score: number };
  const scored: ScoredCommand[] = [];

  for (const cmd of commands) {
    const label = cmd.label.toLowerCase();
    const allKeywords = (cmd.keywords ?? []).map((k) => k.toLowerCase());

    let score = 0;

    // Exact label match (highest)
    if (label === q) {
      score += 100;
    }
    // Label starts with query
    else if (label.startsWith(q)) {
      score += 80;
    }
    // Label contains query
    else if (label.includes(q)) {
      score += 60;
    }

    // Token-based matching
    for (const token of tokens) {
      if (label.includes(token)) {
        score += 20;
      }
      for (const kw of allKeywords) {
        if (kw.includes(token)) {
          score += 10;
        }
      }
    }

    if (score > 0) {
      scored.push({ command: cmd, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.command);
}
