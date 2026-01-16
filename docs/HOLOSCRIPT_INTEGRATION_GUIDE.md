# HoloScript Integration Guide - Hololand Phase 0

**Version**: 1.0.0  
**Date**: January 15, 2026  
**Target**: Phase 0 MVP (Week 1-4)

---

## Overview

This guide implements a **minimal viable HoloScript** for Hololand's Phase 0 launch. We focus on:
1. ✅ Text-based syntax (no VR IDE yet)
2. ✅ Copy & Menu authoring (already built!)
3. ✅ Template system integration
4. ✅ Compile to React Three Fiber

Full VR spatial programming comes in Phase 1+.

---

## Phase 0 Scope: Text-Based HoloScript

### What We're Building

```
Markdown/JSON → HoloScript Compiler → React Three Fiber Components
```

**Example**:
```holoscript
// casino-rules.hs
ZONE casino_floor {
  position: (0, 0, 0)
  
  ENTITY slot_machine_1 {
    position: (-8, 0, -8)
    model: "slot-machine.glb"
    
    ON_CLICK {
      PLAY_SOUND("slot-spin.mp3")
      score += RANDOM(0, 100)
    }
  }
}
```

**Compiles to**:
```tsx
// Generated React component
export const CasinoFloor = () => {
  const [score, setScore] = useState(0);
  
  const handleSlotClick = () => {
    playSound("slot-spin.mp3");
    setScore(s => s + Math.floor(Math.random() * 100));
  };
  
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[-8, 0, -8]} onClick={handleSlotClick}>
        <Model src="slot-machine.glb" />
      </mesh>
    </group>
  );
};
```

---

## Architecture

### Directory Structure

```
Hololand/
├── packages/
│   └── holoscript/
│       ├── package.json
│       ├── src/
│       │   ├── parser/
│       │   │   ├── lexer.ts          # Tokenize .hs files
│       │   │   ├── parser.ts         # Build AST
│       │   │   └── types.ts          # AST node definitions
│       │   ├── compiler/
│       │   │   ├── r3f-compiler.ts   # Compile to React Three Fiber
│       │   │   ├── templates.ts      # Code generation templates
│       │   │   └── optimizer.ts      # Tree shaking, minification
│       │   ├── runtime/
│       │   │   ├── entity.ts         # Runtime entity management
│       │   │   ├── physics.ts        # Physics helpers
│       │   │   └── audio.ts          # Audio management
│       │   └── cli/
│       │       ├── build.ts          # CLI build command
│       │       └── watch.ts          # Hot reload
│       └── examples/
│           ├── basic.hs
│           ├── casino.hs
│           └── builder-shop.hs
```

---

## Implementation Steps

### Step 1: Parser (Week 1)

**File**: `packages/holoscript/src/parser/lexer.ts`

```typescript
// Minimal lexer for Phase 0
export type TokenType =
  | 'ZONE' | 'ENTITY' | 'ON_CLICK' | 'PLAY_SOUND'
  | 'POSITION' | 'MODEL' | 'COLOR' | 'SIZE'
  | 'IDENTIFIER' | 'NUMBER' | 'STRING'
  | 'LBRACE' | 'RBRACE' | 'LPAREN' | 'RPAREN'
  | 'COLON' | 'COMMA';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export function tokenize(source: string): Token[] {
  // Simple regex-based tokenizer
  const tokens: Token[] = [];
  const keywords = ['ZONE', 'ENTITY', 'ON_CLICK', 'PLAY_SOUND'];
  
  // ... implementation
  return tokens;
}
```

**File**: `packages/holoscript/src/parser/parser.ts`

```typescript
export interface ASTNode {
  type: string;
  [key: string]: any;
}

export interface ZoneNode extends ASTNode {
  type: 'Zone';
  name: string;
  position: [number, number, number];
  entities: EntityNode[];
}

export interface EntityNode extends ASTNode {
  type: 'Entity';
  name: string;
  properties: Record<string, any>;
  handlers: HandlerNode[];
}

export function parse(tokens: Token[]): ZoneNode[] {
  // Recursive descent parser
  // ... implementation
}
```

---

### Step 2: Compiler (Week 2)

**File**: `packages/holoscript/src/compiler/r3f-compiler.ts`

```typescript
import { ZoneNode, EntityNode } from '../parser/types';

export interface CompilerOptions {
  target: 'r3f' | 'unity' | 'native';
  optimize: boolean;
  sourceMaps: boolean;
}

export class HoloScriptCompiler {
  constructor(private options: CompilerOptions) {}
  
  compile(ast: ZoneNode[]): string {
    const imports = this.generateImports();
    const components = ast.map(zone => this.compileZone(zone));
    
    return `
${imports}

${components.join('\n\n')}
    `.trim();
  }
  
  private generateImports(): string {
    return `
import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Model, playSound } from '@hololand/runtime';
    `.trim();
  }
  
  private compileZone(zone: ZoneNode): string {
    const entities = zone.entities.map(e => this.compileEntity(e));
    
    return `
export const ${this.toPascalCase(zone.name)} = () => {
  return (
    <group position={[${zone.position.join(', ')}]}>
      ${entities.join('\n      ')}
    </group>
  );
};
    `.trim();
  }
  
  private compileEntity(entity: EntityNode): string {
    const props = this.compileProperties(entity.properties);
    const handlers = this.compileHandlers(entity.handlers);
    
    return `
<mesh ${props} ${handlers}>
  <Model src="${entity.properties.model}" />
</mesh>
    `.trim();
  }
  
  private compileProperties(props: Record<string, any>): string {
    const position = props.position || [0, 0, 0];
    return `position={[${position.join(', ')}]}`;
  }
  
  private compileHandlers(handlers: any[]): string {
    return handlers.map(h => {
      if (h.type === 'onClick') {
        return `onClick={() => { ${this.compileAction(h.action)} }}`;
      }
      return '';
    }).join(' ');
  }
  
  private compileAction(action: any): string {
    if (action.type === 'PLAY_SOUND') {
      return `playSound("${action.file}")`;
    }
    return '';
  }
  
  private toPascalCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
              .replace(/^[a-z]/, c => c.toUpperCase());
  }
}
```

---

### Step 3: Runtime Helpers (Week 2)

**File**: `packages/holoscript/src/runtime/audio.ts`

```typescript
const audioCache = new Map<string, HTMLAudioElement>();

export function playSound(url: string, volume = 1.0) {
  if (!audioCache.has(url)) {
    const audio = new Audio(url);
    audio.volume = volume;
    audioCache.set(url, audio);
  }
  
  const audio = audioCache.get(url)!;
  audio.currentTime = 0;
  audio.play().catch(console.error);
}

export function playSoundAt(
  position: [number, number, number],
  url: string,
  volume = 1.0
) {
  // TODO: Spatial audio implementation
  playSound(url, volume);
}
```

**File**: `packages/holoscript/src/runtime/entity.ts`

```typescript
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

export function useEntity(config: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  physics?: boolean;
}) {
  const ref = useRef<any>(null);
  const [state, setState] = useState<any>({});
  
  useFrame((_, delta) => {
    if (config.physics && ref.current) {
      // Apply physics
    }
  });
  
  return { ref, state, setState };
}
```

---

### Step 4: CLI Tool (Week 3)

**File**: `packages/holoscript/src/cli/build.ts`

```typescript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { tokenize } from '../parser/lexer';
import { parse } from '../parser/parser';
import { HoloScriptCompiler } from '../compiler/r3f-compiler';

interface BuildOptions {
  input: string;
  output: string;
  watch?: boolean;
  optimize?: boolean;
}

export async function build(options: BuildOptions) {
  console.log(`🔨 Building HoloScript: ${options.input}`);
  
  // Read source
  const source = fs.readFileSync(options.input, 'utf-8');
  
  // Tokenize
  const tokens = tokenize(source);
  console.log(`✓ Tokenized ${tokens.length} tokens`);
  
  // Parse
  const ast = parse(tokens);
  console.log(`✓ Parsed ${ast.length} zones`);
  
  // Compile
  const compiler = new HoloScriptCompiler({
    target: 'r3f',
    optimize: options.optimize ?? true,
    sourceMaps: true,
  });
  const output = compiler.compile(ast);
  console.log(`✓ Compiled to React component`);
  
  // Write output
  fs.writeFileSync(options.output, output);
  console.log(`✅ Built: ${options.output}`);
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const input = args[0] || 'src/worlds/index.hs';
  const output = args[1] || 'src/worlds/generated.tsx';
  
  build({ input, output }).catch(console.error);
}
```

---

### Step 5: Integration with Existing Hololand Code

**Use Case 1: Convert Copy Registry to HoloScript**

```holoscript
// examples/hololand-central/src/ui/copy.hs
COPY_REGISTRY {
  welcome_title {
    zone: "welcome_plaza"
    default: "Welcome to Hololand Central!"
    
    THEME_VARIANT cyberpunk "Welcome to the Neon Grid, Runner!"
    THEME_VARIANT wild_west "Howdy, Partner! Welcome to the Frontier!"
    THEME_VARIANT cityscape "Welcome to the Urban Nexus!"
  }
  
  casino_greeting {
    zone: "casino"
    default: "Try your luck at our cosmic slots!"
    
    THEME_VARIANT cyberpunk "Jack into the Grid Casino!"
    THEME_VARIANT wild_west "Step right up to the Saloon!"
  }
}
```

**Compiles to**: `src/ui/copy.ts` (existing file format)

---

**Use Case 2: Convert Menus to HoloScript**

```holoscript
// examples/hololand-central/src/ui/menus.hs
MENU plaza_orientation {
  zone: "welcome_plaza"
  title: "Where would you like to go?"
  subtitle: "Choose your destination"
  
  ACTION visit_casino {
    label: "Visit Casino"
    icon: "🎰"
    intent: "navigate"
    payload: { target: "casino" }
  }
  
  ACTION visit_builder_shop {
    label: "Builder Shop"
    icon: "🏗️"
    intent: "navigate"
    payload: { target: "builder-shop" }
  }
}
```

**Compiles to**: `src/ui/menus.ts`

---

## Usage in Hololand

### npm Scripts

Add to `examples/hololand-central/package.json`:

```json
{
  "scripts": {
    "holoscript:build": "holoscript build src/**/*.hs --output src/generated/",
    "holoscript:watch": "holoscript build src/**/*.hs --output src/generated/ --watch",
    "dev": "npm run holoscript:watch & next dev"
  }
}
```

### Import Generated Components

```typescript
// examples/hololand-central/src/App.tsx
import { CasinoFloor } from './generated/casino-floor';
import { BuilderShopMain } from './generated/builder-shop-main';

function App() {
  return (
    <Canvas>
      {currentWorld === 'casino' && <CasinoFloor />}
      {currentWorld === 'builder-shop' && <BuilderShopMain />}
    </Canvas>
  );
}
```

---

## Testing

```typescript
// packages/holoscript/__tests__/compiler.test.ts
import { tokenize } from '../src/parser/lexer';
import { parse } from '../src/parser/parser';
import { HoloScriptCompiler } from '../src/compiler/r3f-compiler';

describe('HoloScript Compiler', () => {
  it('should compile simple zone', () => {
    const source = `
      ZONE test {
        position: (0, 0, 0)
      }
    `;
    
    const tokens = tokenize(source);
    const ast = parse(tokens);
    const compiler = new HoloScriptCompiler({ target: 'r3f', optimize: false });
    const output = compiler.compile(ast);
    
    expect(output).toContain('export const Test');
    expect(output).toContain('position={[0, 0, 0]}');
  });
});
```

---

## Phase 0 Deliverables

### Week 2 (Jan 22-28)
- ✅ Lexer + Parser for basic syntax
- ✅ R3F compiler for ZONE, ENTITY, basic properties
- ✅ CLI tool (`holoscript build`)

### Week 3 (Jan 29 - Feb 4)
- ✅ Runtime helpers (audio, entity)
- ✅ Convert copy.ts and menus.ts to HoloScript
- ✅ Auto-generate from .hs files on save

### Week 4 (Feb 5-11)
- ✅ Tests (>70% coverage)
- ✅ Documentation
- ✅ Example worlds in HoloScript

---

## Next Phase (Phase 1+)

- **VR Editor**: Visual node-graph editing in VR
- **AI Integration**: "Create a casino zone with 5 slot machines"
- **Hot Reload**: See code changes instantly in VR
- **Multiplayer Editing**: Collaborate in real-time
- **Unity Compiler**: Export to Unity for mobile

---

## Resources

- **Spec**: `docs/HOLOSCRIPT_LANGUAGE_SPEC.md`
- **Examples**: `packages/holoscript/examples/`
- **Discord**: #holoscript channel
- **GitHub**: Issues for bugs/features

---

**Status**: Ready for Week 2 implementation  
**Owner**: Frontend team  
**Priority**: Medium (Week 2-3 focus)
