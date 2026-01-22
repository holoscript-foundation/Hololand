# @hololand/holoscript-linter

Static analysis tool for HoloScript (.holo) and HoloScript+ (.hsplus) files.

## Features

- **Syntax validation** - Catch brace/bracket mismatches, unterminated strings
- **Naming conventions** - Enforce PascalCase for templates/modules, SCREAMING_CASE for constants
- **Best practices** - Detect empty blocks, duplicate templates, undefined references
- **Performance warnings** - Identify nested every() calls, inline complex objects
- **Type safety** (HSPlus) - Check state defaults, decorator usage
- **Auto-fix** - Automatically fix many common issues

## Installation

```bash
pnpm add @hololand/holoscript-linter
```

## CLI Usage

```bash
# Lint files
holoscript-lint src/**/*.holo src/**/*.hsplus

# Lint with auto-fix
holoscript-lint --fix src/**/*.holo

# Output as JSON
holoscript-lint --json src/**/*.holo

# Quiet mode (only errors)
holoscript-lint --quiet src/**/*.holo
```

## Programmatic Usage

```typescript
import { HoloScriptLinter, Severity } from '@hololand/holoscript-linter';

// Lint a file
const result = HoloScriptLinter.lint(code, 'scene.holo');

console.log(`Errors: ${result.errorCount}`);
console.log(`Warnings: ${result.warningCount}`);

for (const diagnostic of result.diagnostics) {
  console.log(`${diagnostic.line}:${diagnostic.column} ${diagnostic.message}`);
}

// Auto-fix
const { text: fixed, fixCount } = HoloScriptLinter.fix(code, 'scene.holo');
console.log(`Fixed ${fixCount} issues`);
```

## Configuration

Create a `.holoscriptrc` or `holoscript.config.json`:

```json
{
  "rules": {
    "naming/template-pascal-case": "warning",
    "naming/constant-screaming-case": false,
    "best-practice/no-empty-blocks": "info",
    "performance/no-nested-every": "error"
  },
  "ignore": [
    "node_modules/**",
    "dist/**"
  ]
}
```

## Rules

### Syntax
| Rule | Default | Description |
|------|---------|-------------|
| `syntax/brace-balance` | error | Ensure braces are balanced |
| `syntax/bracket-balance` | error | Ensure brackets are balanced |
| `syntax/string-termination` | error | Ensure strings are terminated |

### Naming
| Rule | Default | Description |
|------|---------|-------------|
| `naming/template-pascal-case` | warning | Template names should use PascalCase |
| `naming/module-pascal-case` | warning | Module names should use PascalCase |
| `naming/constant-screaming-case` | info | Constants should use SCREAMING_CASE |

### Best Practice
| Rule | Default | Description |
|------|---------|-------------|
| `best-practice/no-empty-blocks` | info | Avoid empty blocks |
| `best-practice/no-duplicate-templates` | error | Template names must be unique |
| `best-practice/undefined-template-reference` | error | Template references must be defined |
| `best-practice/state-should-have-default` | warning | State properties should have defaults |

### Performance
| Rule | Default | Description |
|------|---------|-------------|
| `performance/no-nested-every` | warning | Avoid nested every() calls |
| `performance/no-inline-complex-objects` | info | Cache objects outside handlers |

### Style
| Rule | Default | Description |
|------|---------|-------------|
| `style/consistent-spacing` | hint | Use consistent spacing |
| `style/trailing-comma` | off | Use trailing commas |

## Custom Rules

```typescript
import { HoloScriptLinter, RuleCategory, Severity } from '@hololand/holoscript-linter';

HoloScriptLinter.addRule({
  id: 'custom/no-magic-numbers',
  category: RuleCategory.BEST_PRACTICE,
  severity: Severity.WARNING,
  description: 'Avoid magic numbers',
  enabled: true,
  check: (context) => {
    const diagnostics = [];
    const pattern = /\b\d{3,}\b/g;
    
    for (let i = 0; i < context.lines.length; i++) {
      let match;
      while ((match = pattern.exec(context.lines[i])) !== null) {
        diagnostics.push({
          ruleId: 'custom/no-magic-numbers',
          message: `Magic number ${match[0]} - consider using a named constant`,
          severity: Severity.WARNING,
          line: i + 1,
          column: match.index + 1,
          endLine: i + 1,
          endColumn: match.index + match[0].length
        });
      }
    }
    
    return diagnostics;
  }
});
```

## VSCode Integration

The linter integrates with the HoloScript VSCode extension for real-time diagnostics.

## License

MIT
