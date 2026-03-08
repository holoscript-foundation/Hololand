# Composition Editor Architecture

## Component Hierarchy

```
CompositionEditorPage
│
├─ Header
│  ├─ Title & Description
│  └─ Actions
│     ├─ Import Button (file input)
│     └─ Reset Button
│
├─ Controls
│  ├─ VerticalSelector (dropdown)
│  └─ Search Input
│
├─ Main Content (Grid Layout)
│  │
│  ├─ Left Panel (2fr)
│  │  └─ VerticalTraitMatrix
│  │     └─ Matrix Table
│  │        ├─ Header Row (trait names)
│  │        └─ Data Rows (vertical x trait cells)
│  │           └─ TraitCell
│  │              ├─ Relevance color/opacity
│  │              ├─ Relevance score %
│  │              ├─ Applied indicator ✓
│  │              └─ Selection highlight
│  │
│  └─ Right Panel (1fr)
│     ├─ TraitDetailPanel (top)
│     │  ├─ Header
│     │  │  ├─ Trait name
│     │  │  └─ Relevance badge
│     │  ├─ Rationale section
│     │  ├─ Configuration section
│     │  │  ├─ Config hint
│     │  │  ├─ JSON editor
│     │  │  └─ Update button
│     │  ├─ Usage example
│     │  └─ Actions
│     │     ├─ Add button
│     │     └─ Remove button
│     │
│     └─ CompositionPreview (bottom)
│        ├─ Header & Stats
│        └─ Tree View
│           ├─ Object header
│           ├─ Traits list
│           │  └─ Trait node
│           │     ├─ Trait name
│           │     ├─ Source vertical
│           │     └─ Config properties
│           └─ Object footer
│
└─ Footer
   └─ HoloCodeGenerator
      ├─ Header & Actions
      │  ├─ Copy button
      │  └─ Export button
      ├─ Code preview (syntax highlighted)
      └─ Statistics (lines, chars)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CompositionEditorPage                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          State (useReducer + editorReducer)             │ │
│  │  - composition: Composition                             │ │
│  │  - selectedTrait: string | null                         │ │
│  │  - activeVertical: string | null                        │ │
│  │  - searchQuery: string                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
       │                    │                      │
       ▼                    ▼                      ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│  Vertical    │   │ VerticalTrait    │   │    Trait     │
│  Selector    │   │     Matrix       │   │ DetailPanel  │
└──────────────┘   └──────────────────┘   └──────────────┘
       │                    │                      │
       │ onChange           │ onTraitClick         │ onAdd/Remove/Update
       ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                         Dispatch                             │
│  SET_VERTICAL | SELECT_TRAIT | ADD_TRAIT | REMOVE_TRAIT |   │
│  UPDATE_TRAIT_CONFIG | SET_SEARCH | LOAD | RESET            │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                      State Update                            │
└─────────────────────────────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐   ┌──────────────────┐
│ Composition  │   │  HoloCode        │
│   Preview    │   │   Generator      │
└──────────────┘   └──────────────────┘
```

## State Management Flow

```
┌────────────────────────────────────────────────────────┐
│                    Initial State                        │
│  composition: { objectId, objectType, vertical, ...}   │
│  selectedTrait: null                                    │
│  activeVertical: null                                   │
│  searchQuery: ''                                        │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
          ┌─────────────────────────────┐
          │   User Interaction Event    │
          └─────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌─────────────────┐          ┌──────────────────┐
│  UI Component   │          │  Event Handler   │
│  (onChange,     │─────────▶│  (callback)      │
│   onClick, etc) │          └──────────────────┘
└─────────────────┘                   │
                                      ▼
                        ┌────────────────────────┐
                        │  Dispatch Action       │
                        │  { type, payload }     │
                        └────────────────────────┘
                                      │
                                      ▼
                        ┌────────────────────────┐
                        │   editorReducer        │
                        │   (state, action)      │
                        └────────────────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
        ┌─────────────────┐  ┌─────────────┐  ┌──────────────────┐
        │  Update State   │  │   Validate  │  │  Side Effects    │
        │  (immutably)    │  │   Payload   │  │  (if needed)     │
        └─────────────────┘  └─────────────┘  └──────────────────┘
                 │                    │                    │
                 └────────────────────┴────────────────────┘
                                      │
                                      ▼
                        ┌────────────────────────┐
                        │      New State         │
                        └────────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
        ┌─────────────────┐                   ┌──────────────────┐
        │  Re-render       │                   │  Derived Data    │
        │  Components      │                   │  (useMemo)       │
        └─────────────────┘                   └──────────────────┘
```

## Action Types & Payloads

```typescript
// Vertical selection
SET_VERTICAL
  payload: { vertical: string | null }
  effect: Updates activeVertical and composition.vertical

// Trait selection
SELECT_TRAIT
  payload: { trait: string | null }
  effect: Updates selectedTrait

// Trait management
ADD_TRAIT
  payload: { trait: ConfiguredTrait }
  effect: Adds or updates trait in composition.traits
          Sets selectedTrait to trait.name

REMOVE_TRAIT
  payload: { traitName: string }
  effect: Removes trait from composition.traits
          Clears selectedTrait if it matches

UPDATE_TRAIT_CONFIG
  payload: { traitName: string, config: Record<...> }
  effect: Merges new config into existing trait

// Search
SET_SEARCH
  payload: { query: string }
  effect: Updates searchQuery

// Import/Export
LOAD_COMPOSITION
  payload: { composition: Composition }
  effect: Replaces entire composition
          Sets activeVertical from composition.vertical
          Clears selectedTrait

// Reset
RESET
  payload: none
  effect: Returns to initialEditorState
```

## Data Models

```typescript
// Vertical Mapping (from HoloScript LSP)
VerticalMapping {
  id: string                      // 'healthcare'
  displayName: string             // 'Healthcare'
  description: string             // 'Medical training...'
  matchTags: string[]             // ['medical', 'health', ...]
  traits: TraitRecommendation[]   // Array of recommended traits
}

// Trait Recommendation
TraitRecommendation {
  trait: string                   // '@hand_tracked'
  relevance: number               // 0.0-1.0
  rationale: string               // Why it matters
  configHint: string              // Recommended config
}

// Configured Trait (user's composition)
ConfiguredTrait {
  name: string                    // '@hand_tracked'
  config: Record<string, unknown> // { precision: 'high', ... }
  sourceVertical?: string         // 'healthcare'
}

// Composition (full object definition)
Composition {
  objectId: string                // 'MedicalTraining'
  objectType: string              // 'object'
  vertical: string | null         // Active vertical
  traits: ConfiguredTrait[]       // Applied traits
  metadata: {
    category?: string
    tags?: string[]
    description?: string
  }
}

// Editor State
EditorState {
  composition: Composition        // Current composition
  selectedTrait: string | null    // '@hand_tracked'
  activeVertical: string | null   // 'healthcare'
  searchQuery: string             // Filter string
}

// Matrix Cell (computed)
MatrixCell {
  vertical: string                // Vertical ID
  trait: string                   // Trait name
  relevance: number               // 0.0-1.0
  rationale: string               // Description
  configHint: string              // Config suggestion
  isSelected: boolean             // UI highlight
  isApplied: boolean              // In composition
}
```

## Import/Export Flow

```
┌─────────────────────────────────────────────────────────┐
│                        EXPORT                            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │  composition state │
                └────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │ generateHoloCode() │
                │  - Header comments │
                │  - Object decl     │
                │  - Trait configs   │
                └────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │  .holo file string │
                └────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │    Blob creation   │
                │  (text/plain)      │
                └────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │  Browser download  │
                │  (ObjectURL)       │
                └────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                        IMPORT                            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │  File input change │
                │  (.holo extension) │
                └────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │   FileReader API   │
                │  readAsText()      │
                └────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │  parseHoloFile()   │
                │  - Extract objectId│
                │  - Parse traits    │
                │  - Parse configs   │
                └────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │  Composition object│
                └────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │ LOAD_COMPOSITION   │
                │      action        │
                └────────────────────┘
                            │
                            ▼
                ┌────────────────────┐
                │   State updated    │
                │   UI re-renders    │
                └────────────────────┘
```

## Performance Optimizations

```
┌────────────────────────────────────────────────┐
│         Memoization Strategy                   │
├────────────────────────────────────────────────┤
│                                                │
│  useMemo(() => {                              │
│    // Extract all unique traits               │
│    return new Set(...)                        │
│  }, [verticals])                              │
│                                                │
│  useMemo(() => {                              │
│    // Filter traits by search                 │
│    return allTraits.filter(...)               │
│  }, [allTraits, searchQuery])                 │
│                                                │
│  useMemo(() => {                              │
│    // Filter verticals by active              │
│    return verticals.filter(...)               │
│  }, [verticals, activeVertical])              │
│                                                │
│  useMemo(() => {                              │
│    // Build matrix cells                      │
│    return filteredVerticals.map(...)          │
│  }, [filteredVerticals, filteredTraits, ...]) │
│                                                │
│  useMemo(() => {                              │
│    // Get applied traits Set                  │
│    return new Set(composition.traits)         │
│  }, [composition.traits])                     │
│                                                │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│         Event Handler Optimization             │
├────────────────────────────────────────────────┤
│                                                │
│  useCallback(() => {                          │
│    // Vertical change handler                 │
│  }, [])                                       │
│                                                │
│  useCallback(() => {                          │
│    // Trait click handler                     │
│  }, [activeVertical])                         │
│                                                │
│  useCallback(() => {                          │
│    // Export handler                          │
│  }, [composition.objectId])                   │
│                                                │
└────────────────────────────────────────────────┘
```

## Routing & Lazy Loading

```
App Routes
│
├─ /                        (Home)
├─ /grpo                    (GRPO Dashboard)
├─ /pipeline                (Pipeline Dashboard)
├─ /a11y-audit              (Accessibility Audit)
│
└─ /composition-editor      ◄── NEW ROUTE
   │
   ├─ Route Definition
   │  └─ React.lazy(() => import('./pages/composition-editor/...'))
   │
   ├─ Suspense Boundary
   │  └─ <RouteLoadingFallback label="Composition Editor" />
   │
   └─ Prefetch Function
      └─ import('./pages/composition-editor/...')
         (Called on link hover/focus)

Code Splitting Result:
┌──────────────────────────────────────────┐
│  Main Bundle                             │
│  - App shell                             │
│  - Navigation                            │
│  - Common components                     │
└──────────────────────────────────────────┘
                │
                ├─ composition-editor.chunk.js (lazy loaded)
                │  ├─ CompositionEditorPage
                │  ├─ VerticalTraitMatrix
                │  ├─ TraitDetailPanel
                │  ├─ CompositionPreview
                │  ├─ HoloCodeGenerator
                │  └─ All sub-components
                │
                ├─ grpo.chunk.js
                ├─ pipeline.chunk.js
                └─ a11y-audit.chunk.js
```

---

**Note**: This architecture follows React best practices with:
- Unidirectional data flow
- Component composition
- State co-location
- Performance optimizations
- Accessibility considerations
- Security-first design
