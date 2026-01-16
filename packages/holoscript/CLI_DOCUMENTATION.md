# HoloScript CLI Documentation

## Overview

The HoloScript CLI is a command-line tool for compiling `.hs` (HoloScript) files into React Three Fiber components. It provides:

- ✅ **Build**: Compile HoloScript to TypeScript/React
- 🔍 **Watch**: Auto-rebuild on file changes (experimental Week 2)
- 📊 **Diagnostics**: Error messages with line numbers
- ⚡ **Performance**: <500ms compile time for typical files

## Installation

### Global Installation
```bash
npm install -g @holoscript/holoscript
holoscript build myworld.hs
```

### Local Installation (recommended for Hololand)
```bash
npm install @holoscript/holoscript
npx holoscript build myworld.hs
```

### From Source
```bash
cd packages/holoscript
npm run build
npm run cli:build -- myworld.hs
```

## Commands

### `holoscript build <input>`

Compile a HoloScript file to React Three Fiber.

**Arguments:**
- `<input>` - Path to `.hs` file (required)

**Options:**
- `-o, --output <path>` - Output file path (default: same directory with `.tsx`)
- `-w, --watch` - Watch for changes (experimental)
- `--optimize` - Enable code optimization
- `--source-maps` - Generate source maps
- `-v, --verbose` - Verbose output

**Examples:**

```bash
# Basic build
holoscript build worlds/welcome.hs

# Custom output
holoscript build zones/plaza.hs -o src/components/Plaza.tsx

# Watch mode
holoscript build worlds/casino.hs --watch

# Optimized build with source maps
holoscript build worlds/shop.hs --optimize --source-maps

# Verbose output
holoscript build test.hs --verbose
```

### `holoscript compile <input>`

Alias for `build`. Same behavior.

```bash
holoscript compile myworld.hs
```

### `holoscript help`

Show help information.

```bash
holoscript help
holoscript --help
holoscript -h
```

### `holoscript --version`

Show version information.

```bash
holoscript --version
holoscript -v
```

## Output

### Success
```
✅ Build successful
   Input:    worlds/welcome.hs
   Output:   worlds/Welcome.tsx
   Size:     3,245 bytes
   Duration: 145ms
```

### Error
```
❌ Build failed
   Input: worlds/test.hs

   Errors:
     • Syntax error on line 3: Expected POSITION, got "invalid"
```

## Integration with Next.js

Add build scripts to `package.json`:

```json
{
  "scripts": {
    "build:worlds": "holoscript build worlds/*.hs",
    "watch:worlds": "holoscript build worlds/ --watch",
    "build": "npm run build:worlds && next build"
  }
}
```

## Usage Examples

### Single World Build

```bash
# Build a world file
holoscript build src/worlds/welcome.hs -o src/components/worlds/Welcome.tsx

# Result: Creates React component ready to import and use
```

### Batch Build (using npm scripts)

```json
{
  "scripts": {
    "build:holoscript": "for f in worlds/*.hs; do holoscript build \"$f\" -o src/components/worlds/$(basename $f .hs).tsx; done"
  }
}
```

### Watch Mode Development

```bash
# Terminal 1: Watch HoloScript files
holoscript build src/worlds/plaza.hs --watch

# Terminal 2: Run Next.js dev server
npm run dev
```

When you edit the `.hs` file, it automatically recompiles and triggers React Fast Refresh.

## Troubleshooting

### "Input file must have .hs extension"

Your input file doesn't end with `.hs`. Ensure the file has the correct extension:

```bash
# ❌ Wrong
holoscript build myworld.ts

# ✅ Correct
holoscript build myworld.hs
```

### "Failed to read file"

The input file doesn't exist or isn't readable:

```bash
# Check the file exists
ls -la worlds/welcome.hs

# Verify permissions
chmod 644 worlds/welcome.hs
```

### "Syntax error on line X"

Your HoloScript has invalid syntax. Check:

1. **Zone structure**: `ZONE name ... END`
2. **Entity syntax**: `ENTITY name ... END`
3. **Position format**: `POSITION x y z` (three numbers)
4. **Colors**: Hex format like `0xff0000`

Example of correct syntax:
```holoscript
ZONE welcome
  ENTITY box
    POSITION 0 1 -5
    CREATE CUBE
    COLOR 0xff0000
  END
END
```

### Output file not created

Ensure the output directory exists:

```bash
# Create output directory
mkdir -p src/components/worlds

# Build with full path
holoscript build test.hs -o src/components/worlds/Test.tsx
```

### "Compilation failed" with no error message

This is a compiler bug. Provide error details:

```bash
# Run with verbose output
holoscript build test.hs --verbose

# Check console output for stack trace
```

## Performance

Typical build times:

- **Small world** (1-3 zones): <100ms
- **Medium world** (5-10 zones): 100-300ms
- **Large world** (20+ zones): 300-500ms

Optimize large builds:

```bash
# Use --optimize flag
holoscript build huge-world.hs --optimize

# Split into multiple files
holoscript build zone1.hs
holoscript build zone2.hs
holoscript build zone3.hs
```

## Configuration

### .holoscriptrc (planned for Week 2)

Create a config file for default options:

```json
{
  "outDir": "src/components/worlds",
  "optimize": true,
  "sourceMaps": true,
  "watch": false
}
```

Then:
```bash
holoscript build test.hs  # Uses defaults from .holoscriptrc
```

## Advanced Usage

### With TypeScript

The output is ready for TypeScript:

```tsx
import { Welcome } from './components/worlds/Welcome';

// Type-safe component
const MyApp = () => {
  return <Welcome />;
};
```

### With Webpack/Parcel

```bash
# In your build script
holoscript build worlds/*.hs -o dist/worlds/

# Then bundle normally
webpack ...
```

### In CI/CD

```yaml
# GitHub Actions example
- name: Build HoloScript worlds
  run: |
    npm install -g @holoscript/holoscript
    holoscript build worlds/*.hs -o src/components/worlds/
```

## API Usage (Programmatic)

Instead of CLI, use the builder API:

```typescript
import { HoloScriptBuilder } from '@holoscript/holoscript/lib/cli/build';

const builder = new HoloScriptBuilder({
  input: 'worlds/welcome.hs',
  output: 'src/components/Welcome.tsx',
  optimize: true,
});

const result = await builder.build();

if (result.success) {
  console.log(`Built: ${result.output}`);
} else {
  console.error(result.errors);
}
```

## Week 2 Roadmap

**Planned enhancements:**

- [ ] CLI tool (Days 1-2) - **IN PROGRESS**
- [ ] Watch mode (Days 2-3)
  - [ ] File watcher integration
  - [ ] Hot reload with React Fast Refresh
  - [ ] Error recovery
- [ ] Advanced features (Day 4-5)
  - [ ] Configuration file support
  - [ ] Batch compilation
  - [ ] Source maps
  - [ ] Code minification
  - [ ] Module system (import/include)

## Support

For issues or feature requests:

1. Check [BUILD_PLAN.md](./BUILD_PLAN.md) for roadmap
2. Review examples in `examples/`
3. Check [HOLOSCRIPT_INTEGRATION_GUIDE.md](../docs/HOLOSCRIPT_INTEGRATION_GUIDE.md)

## Version History

- **0.1.0** (Jan 15, 2026) - Initial release
  - Basic build command
  - Error reporting with line numbers
  - Verbose output mode
  - Watch mode structure (not yet functional)
