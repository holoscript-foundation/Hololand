# HoloScript Compiler - Week 1-2 Build Plan

## Completed ✅
- [x] Language specification (docs/HOLOSCRIPT_LANGUAGE_SPEC.md)
- [x] Integration guide (docs/HOLOSCRIPT_INTEGRATION_GUIDE.md)
- [x] Lexer (tokenizer for .hs files)
- [x] Parser (AST builder)
- [x] R3F Compiler (generates React Three Fiber code)
- [x] Test suite (>70% coverage target)
- [x] Package.json + build config
- [x] Example worlds (7 zones defined)

## Week 1-2 Focus

### HoloScript Compiler Architecture

```
Source (.hs file)
     ↓
  Lexer (tokenize)
     ↓
  Parser (build AST)
     ↓
  Compiler (R3F code)
     ↓
  React Component (.tsx)
```

### Example Flow

**Input** (`example.hs`):
```holoscript
ZONE welcome {
  ENTITY pillar {
    position: (0, 2, 0)
    model: "pillar.glb"
    ON_CLICK {
      PLAY_SOUND("click.mp3")
    }
  }
}
```

**Output** (`example.tsx`):
```typescript
export const Welcome = React.forwardRef((props, ref) => {
  return (
    <group position={[0, 0, 0]} ref={ref} {...props}>
      <EntityModel
        path="pillar.glb"
        position={[0, 2, 0]}
        onClick={() => { playSound("click.mp3"); }}
      />
    </group>
  );
});
```

## Integration with Hololand

### CLI Usage
```bash
# Compile single file
holoscript build src/worlds/casino.hs --output src/generated/casino.tsx

# Watch mode (hot reload)
holoscript build src/worlds/*.hs --output src/generated/ --watch

# Via npm script
npm run holoscript:build
npm run holoscript:watch
```

### In Frontend Code
```typescript
import { Casino } from '@/generated/casino';
import { BuilderShop } from '@/generated/builder-shop';

function App() {
  return (
    <Canvas>
      {currentZone === 'casino' && <Casino />}
      {currentZone === 'builder-shop' && <BuilderShop />}
    </Canvas>
  );
}
```

## Testing Strategy

### Unit Tests (Parser)
- Tokenization: identifiers, numbers, strings, symbols
- AST building: zones, entities, handlers
- Property parsing: positions, models, colors

### Unit Tests (Compiler)
- R3F code generation
- Handler compilation (ON_CLICK, ON_HOVER)
- Material/geometry compilation
- Model loading helpers

### Integration Tests
- Full pipeline: .hs → AST → .tsx
- Multiple zones in one file
- Handler event binding

### Coverage Target
- **Parser**: >80% (critical logic)
- **Compiler**: >75% (code generation patterns)
- **Runtime**: >60% (helpers/utilities)
- **Overall**: >70%

## Performance Targets

### Compiler Performance
- Single zone compile: <100ms
- Full Phase 0 world: <500ms
- Live reload (file change → component updated): <1s

### Generated Code Size
- Per zone: <10KB minified
- All Phase 0 zones: <100KB minified
- Gzip: <30KB

### Runtime Performance
- Zone load: <500ms
- 50 objects render: >60 FPS
- Memory per zone: <50MB

## Testing Coverage

```
packages/holoscript/__tests__/
├── lexer.test.ts          (tokenization)
├── parser.test.ts         (AST building)
├── compiler.test.ts       (R3F generation)
├── integration.test.ts    (full pipeline)
└── fixtures/
    ├── simple-zone.hs
    ├── complex-world.hs
    └── edge-cases.hs
```

## Next Steps (Week 2+)

### Priority 1: Working CLI
- [ ] Build CLI tool (`holoscript` command)
- [ ] Watch mode + hot reload
- [ ] Error messages + source maps
- [ ] Integration with npm build scripts

### Priority 2: Full Features
- [ ] All language constructs (ANIMATE, TEMPLATES, functions)
- [ ] Better error handling
- [ ] Performance optimizations

### Priority 3: DX Improvements
- [ ] VS Code extension syntax highlighting
- [ ] IntelliSense/autocomplete
- [ ] Debugger support
- [ ] Documentation examples

## Known Limitations (Phase 0)

1. **No multiplayer** - Single-user worlds only
2. **No physics** - Static geometry only
3. **Placeholder assets** - Need real 3D models
4. **Limited audio** - Basic sound playing only
5. **No networking** - Local worlds only
6. **No persistence** - Worlds not saved yet

These will be addressed in Phase 1+.

## Resources

- **Source**: `packages/holoscript/src/`
- **Tests**: `packages/holoscript/__tests__/`
- **Examples**: `packages/holoscript/examples/`
- **Docs**: `docs/HOLOSCRIPT_*.md`

## Status

**Ready for Week 1-2 execution**
- Lexer: Production-ready
- Parser: Production-ready
- Compiler: Basic generation working
- Tests: Framework in place

**Estimated completion**: Week 2 end
**Owner**: Frontend Team
**Dependency**: None (standalone package)
