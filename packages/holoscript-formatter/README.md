# @hololand/holoscript-formatter

Code formatting tool for HoloScript (.holo) and HoloScript+ (.hsplus) files.

## Features

- **Indentation normalization** - Consistent indentation with spaces or tabs
- **Brace style enforcement** - Same-line or new-line brace style
- **Whitespace cleanup** - Remove trailing spaces, normalize blank lines
- **Operator spacing** - Consistent spaces around operators
- **Array formatting** - Bracket spacing and trailing commas
- **Import sorting** - Alphabetically sorted, grouped imports
- **Check mode** - Verify files without modifying them

## Installation

```bash
pnpm add @hololand/holoscript-formatter
```

## CLI Usage

```bash
# Format and print to stdout
holoscript-format src/scene.holo

# Format and write to file
holoscript-format --write src/**/*.holo

# Check if files are formatted
holoscript-format --check src/**/*.holo

# Output as JSON
holoscript-format --json src/**/*.holo

# Custom options
holoscript-format --tab --tab-width 4 --trailing-comma all src/**/*.holo
```

## Programmatic Usage

```typescript
import { HoloScriptFormatter } from '@hololand/holoscript-formatter';

// Configure formatter
HoloScriptFormatter.configure({
  indentSize: 2,
  useTabs: false,
  maxLineLength: 100,
  trailingComma: 'multi-line',
  bracketSpacing: true
});

// Format code
const result = HoloScriptFormatter.format(code, 'scene.holo');

console.log(result.text);
console.log(`Changed: ${result.changed}`);
console.log(`Changes: ${result.changeCount}`);

// Check if formatted
const check = HoloScriptFormatter.check(code, 'scene.holo');
if (!check.formatted) {
  console.log('File needs formatting');
  check.issues.forEach(issue => console.log(issue));
}
```

## Configuration

Create a `.holoscriptrc` or `holoscript.config.json`:

```json
{
  "formatter": {
    "indentSize": 2,
    "useTabs": false,
    "maxLineLength": 100,
    "braceStyle": "same-line",
    "trailingComma": "multi-line",
    "bracketSpacing": true,
    "semicolons": false,
    "singleQuote": false,
    "sortImports": true,
    "maxBlankLines": 1,
    "blankLineBeforeComposition": true,
    "blankLineBeforeModule": true
  }
}
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `indentSize` | 2 | Spaces per indent level |
| `useTabs` | false | Use tabs instead of spaces |
| `maxLineLength` | 100 | Maximum line length |
| `braceStyle` | "same-line" | Brace style: "same-line", "new-line", "stroustrup" |
| `trailingComma` | "multi-line" | Trailing commas: "none", "multi-line", "all" |
| `bracketSpacing` | true | Spaces inside brackets `[ 1, 2, 3 ]` |
| `semicolons` | false | Add semicolons (HSPlus) |
| `singleQuote` | false | Use single quotes |
| `sortImports` | true | Sort import statements |
| `maxBlankLines` | 1 | Maximum consecutive blank lines |
| `blankLineBeforeComposition` | true | Blank line before composition blocks |
| `blankLineBeforeModule` | true | Blank line before module blocks |

## Examples

### Before
```holo
composition "Example"{
template "Enemy"{
state{health:100}
action attack(target){target.health-=10}
}
spatial_group "Main"{
object "Goblin" using "Enemy"{position:[0,0,5]}
}}
```

### After
```holo
composition "Example" {
  template "Enemy" {
    state { health: 100 }
    action attack(target) { target.health -= 10 }
  }

  spatial_group "Main" {
    object "Goblin" using "Enemy" { position: [ 0, 0, 5 ] }
  }
}
```

## VSCode Integration

The formatter integrates with the HoloScript VSCode extension:

1. Format on save: Enable `editor.formatOnSave`
2. Format selection: Select code and press `Shift+Alt+F`
3. Format document: Press `Shift+Alt+F` with no selection

## Prettier Plugin

For projects using Prettier, use the Prettier plugin:

```bash
pnpm add prettier-plugin-holoscript
```

```json
// .prettierrc
{
  "plugins": ["prettier-plugin-holoscript"],
  "overrides": [
    {
      "files": ["*.holo", "*.hsplus"],
      "options": {
        "parser": "holoscript"
      }
    }
  ]
}
```

## License

MIT
