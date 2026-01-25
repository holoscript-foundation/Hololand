# HoloScript Ecosystem Audit - January 2026

## Executive Summary

This audit identifies misalignments between documentation and reality, duplicate/conflicting packages, and areas needing HoloScript-first refactoring.

---

## ✅ What's Correct

### HoloScript Repo (`C:\Users\josep\Documents\GitHub\HoloScript`)
| Item | Status | Notes |
|------|--------|-------|
| `.hs` parser | ✅ Working | `HoloScriptParser` in @holoscript/core |
| `.hsplus` parser | ✅ Working | `HoloScriptPlusParser` with VR traits |
| `.holo` parser | ✅ **DONE** | `HoloCompositionParser` - 26 tests passing |
| VS Code extension | ✅ Working | Syntax highlighting, snippets |
| CLI | ✅ Working | holoscript compile, dev, etc. |
| Linter | ✅ Working | @holoscript/linter |
| Formatter | ✅ Working | @holoscript/formatter |

### Hololand Repo - HoloScript Native
| Item | Status | Notes |
|------|--------|-------|
| packages/playground/playground.holo | ✅ Correct | IDE defined in HoloScript |
| packages/components/*.holo | ✅ Correct | NPC, weapons, UI templates |
| packages/platform/ui/*.hsplus | ✅ Correct | UI system in HoloScript |
| examples/demos/*.holo | ✅ Correct | Showcase demos |
| examples/fresh/*.holo | ✅ Correct | Beginner examples |
| .github/copilot-instructions.md | ✅ Updated | HoloScript-first enforcement |

### Legitimate TypeScript (Bridges/Tooling)
| Package | Why TypeScript is Valid |
|---------|-------------------------|
| packages/adapters/react-three/ | Bridge: HoloScript→React/Three.js |
| packages/devtools/extension/ | VS Code extension (must be TS) |
| packages/platform/auth/ | OAuth/Auth0 SDK integration |
| packages/brittney/service/ | MCP server, API routes |

---

## ⚠️ Issues Found

### 1. DOCUMENTATION OUTDATED - .holo Parser Status

**Files with wrong info:**
- `docs/HOLOSCRIPT_FILE_TYPES.md` line 13: Says `.holo` is "🚧 Planned"
- `docs/HOLOSCRIPT_FILE_TYPES.md` line 361: Says parser is "🚧 Planned"
- `AI_Workspace/AGENTS.md` line 143: Says `.holo` is "🚧 Planned"

**Reality:** The HoloCompositionParser is COMPLETE with 26 passing tests in HoloScript repo.

**Action:** Update all docs to say "✅ Working"

---

### 2. DUPLICATE PLAYGROUNDS

There are TWO playground implementations:

| Location | Tech | Status |
|----------|------|--------|
| `packages/playground/playground.holo` | HoloScript | ✅ NEW, CORRECT |
| `packages/devtools/playground/` | React/Vite | ❌ LEGACY, conflicts |

**Action Options:**
1. **Deprecate** devtools/playground, keep only playground.holo
2. **Rename** devtools/playground to "react-adapter-demo"
3. **Delete** devtools/playground if not needed

---

### 3. EXAMPLES FOLDER - Mixed Paradigms

The `examples/` folder has 621 .tsx files across multiple paradigms:

| Category | Examples | Status |
|----------|----------|--------|
| Fresh/Demos | demos/*.holo, fresh/*.holo | ✅ HoloScript native |
| React Starters | 04-react-starter | ⚠️ Should be adapter demo |
| Hybrid Examples | hybrid-dashboard | ⚠️ Shows bridge usage |
| Legacy Sites | hololand-website, hololand-landing | ⚠️ Marketing sites |
| Central/Legends | hololand-central, hololand-legends | ⚠️ Games - unclear status |

**Action:** Add README to examples/ clarifying:
- Which are "HoloScript native" examples
- Which are "adapter/bridge" examples
- Which are "legacy/marketing" (non-HoloScript)

---

### 4. packages/README.md Missing HoloScript Context

The packages README talks about `@hololand/core` and React integration but doesn't mention:
- HoloScript as the primary authoring format
- .holo/.hsplus/.hs file types
- @holoscript/* packages as the source-of-truth

**Action:** Update packages/README.md with HoloScript-first guidance.

---

### 5. Deleted Training Files Not Committed

Git shows many deleted files under `packages/brittney/service/training/` that are not staged:
- Old fine-tuning guides
- Training data (.jsonl files)
- Phi-3.5 model configs

**Action:** Either restore them or commit the deletions.

---

## 📊 File Count by Type

| Extension | Hololand | HoloScript | Notes |
|-----------|----------|------------|-------|
| .holo | 15+ | 5+ | Growing |
| .hsplus | 20+ | 10+ | Production format |
| .hs | 5+ | 20+ | Classic examples |
| .tsx | 621 | 3 | Mostly in examples/ |
| .ts | 500+ | 800+ | Tooling/parsers |

---

## Recommended Actions

### Priority 1: Fix Documentation
1. ~~Update `docs/HOLOSCRIPT_FILE_TYPES.md`~~ - Mark .holo parser as ✅ Working
2. ~~Update `AI_Workspace/AGENTS.md`~~ - Mark .holo parser as ✅ Working

### Priority 2: Clarify Examples
3. Add `examples/README.md` with category explanations
4. Move or flag React examples as "adapter demos"

### Priority 3: Resolve Duplicates
5. Decide fate of `packages/devtools/playground/`
6. Commit or restore Brittney training file deletions

### Priority 4: Future Alignment
7. Convert more examples to .holo format
8. Build HoloScript→React bridge compiler (so .holo can output React)

---

## Ecosystem Architecture (Current State)

```
┌─────────────────────────────────────────────┐
│  SOURCE OF TRUTH: @holoscript/*             │
│  - @holoscript/core (parsers)               │
│  - @holoscript/cli                          │
│  - @holoscript/runtime                      │
└─────────────────┬───────────────────────────┘
                  │ Compiles to
                  ▼
┌─────────────────────────────────────────────┐
│  TARGETS                                    │
│  - Three.js / WebXR                         │
│  - Unity / C#                               │
│  - VRChat / Udon (alpha)                    │
│  - Babylon.js                               │
│  - Native (via adapters)                    │
└─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  BRIDGES (legitimate TypeScript)            │
│  - @hololand/react-three                    │
│  - @hololand/unity-adapter                  │
│  - @hololand/flutter-adapter (planned)      │
└─────────────────────────────────────────────┘
```

---

## Conclusion

The ecosystem is **80% aligned** with HoloScript-first principles. Main gaps are:
1. **Outdated documentation** claiming .holo parser is planned (it's done)
2. **Unclear examples organization** mixing native vs adapter demos
3. **Duplicate playground** implementations

These are documentation/organization issues, not architectural problems. The core HoloScript tooling is solid.
