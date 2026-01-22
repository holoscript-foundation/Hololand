# @holoscript/core

**HoloScript Language Core** - Parser, validator, and runtime for HoloScript.

## Overview

The core package for the HoloScript language. Parses both `.holo` and `.hsplus` files into an AST, validates syntax, and provides runtime execution.

```typescript
import { parse, validate, createRuntime } from '@holoscript/core';

const ast = parse(`
  orb#sphere @grabbable {
    position: [0, 1, 0]
    color: "#00ffff"
  }
`);

const errors = validate(ast);
if (errors.length === 0) {
  const runtime = createRuntime(ast);
  runtime.start();
}
```

## Features

- **Dual Format Support** - Parses both `.holo` and `.hsplus`
- **Full AST** - Complete abstract syntax tree with source locations
- **Validator** - Type checking and semantic validation
- **Runtime** - Execute HoloScript in Node.js or browser

## Installation

```bash
npm install @holoscript/core
```

## Quick Start

### Parsing

```typescript
import { parse, parseFile } from '@holoscript/core/parser';

// Parse string
const ast = parse(`
  cube#box {
    size: [1, 1, 1]
    color: "red"
  }
`);

// Parse file
const fileAst = await parseFile('./scene.hsplus');
```

### Validation

```typescript
import { validate, createValidator } from '@holoscript/core/validator';

const errors = validate(ast);

errors.forEach(err => {
  console.log(`${err.severity}: ${err.message} at line ${err.location.line}`);
});
```

### Runtime

```typescript
import { createRuntime } from '@holoscript/core/runtime';

const runtime = createRuntime(ast, {
  onUpdate: (delta) => { /* frame update */ },
  onEvent: (event) => { /* handle events */ },
});

runtime.start();
```

## API Reference

### Parser Exports

```typescript
import { 
  parse,           // Parse string to AST
  parseFile,       // Parse file to AST
  tokenize,        // Tokenize string
} from '@holoscript/core/parser';
```

### Type Exports

```typescript
import type {
  // Nodes
  Program,
  OrbDeclaration,
  WorldDeclaration,
  SystemDeclaration,
  FunctionDeclaration,
  
  // Expressions
  Expression,
  CallExpression,
  MemberExpression,
  BinaryExpression,
  
  // Statements
  Statement,
  IfStatement,
  ForStatement,
  WhileStatement,
  
  // Literals
  Literal,
  NumberLiteral,
  StringLiteral,
  Vec3Literal,
  ColorLiteral,
  
  // Source info
  SourceLocation,
  SourceRange,
} from '@holoscript/core';
```

### Validator Exports

```typescript
import {
  validate,
  createValidator,
  type ValidationError,
  type ValidationOptions,
} from '@holoscript/core/validator';
```

### Runtime Exports

```typescript
import {
  createRuntime,
  type Runtime,
  type RuntimeConfig,
  type RuntimeEvent,
} from '@holoscript/core/runtime';
```

## File Formats

### HoloScript Plus (.hsplus) - Recommended

Full programming language with systems, async, networking:

```hsplus
import { NetworkedWorldState } from "./systems/NetworkedWorldState.hsplus"

system GameLoop {
  state { score: 0 }
  
  update(dt) {
    // Game logic
  }
  
  on_player_score(points) {
    state.score += points
  }
}

orb#player @networked @grabbable {
  position: [0, 1, 0]
  on_grab: (hand) -> { haptics.pulse(hand, 0.5) }
}
```

### HoloScript (.holo) - Learning

Simpler declarative syntax for beginners:

```holo
cube my_cube
  position: 0, 1, 0
  color: blue
  on_click: toggle_color
```

## Related

- [@holoscript/cli](../../HoloScript/packages/cli/) - Command line tools
- [@holoscript/three-adapter](../../HoloScript/packages/three-adapter/) - Three.js integration
- [@hololand/holoscript-compiler](../holoscript-compiler/) - Compilation pipeline

## License

MIT - See [LICENSE](../../HoloScript/LICENSE)
