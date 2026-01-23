# HoloScript Playground - Visual Architecture Guide

## 🎨 UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│                          HoloScript Playground                        │
│  📄 New | Cube | Sphere | Grid  |  💾 Save  |  ▶ Compile            │
│  🤖 AI  |  ⚠️ Errors  |  🌙  |  📚 Docs  |  ⭐ GitHub              │
├─────────────────────────────────────────────────────────────────────
│ ✓ All changes saved • Version 1.0.0-alpha • HoloScript 1.0           │
├──────────────────────────────────────────────────────────┬────────────┤
│                                                          │            │
│  HoloScript Editor                                       │ Live Preview
│  ┌────────────────────────────────────────────────┐     │ ┌──────────┐
│  │ world MyWorld {                                │     │ │          │
│  │   object cube {                                │     │ │    🟩    │
│  │     position: [0, 0, 0]                        │     │ │          │
│  │     color: 0x00ff00                            │  ▼  │ │ FPS: 60  │
│  │   }                                            │ 60%  │ │ Objs: 1  │
│  │ }                                              │     │ │          │
│  │                                                │     │ │          │
│  │ ✓ No errors • Ln 1, Col 1                      │     │ │          │
│  └────────────────────────────────────────────────┘     │ └──────────┘
│  (Monaco Editor)                         40%             │   30%
├──────────────────────────────────────────┬───────────────┤
│  Brittney AI                             │ Error Report  │
│  ┌────────────────────────────────────┐  │ ┌──────────┐  │
│  │ 🤖: I'll create a cube for you...  │  │ │ ✓ No     │  │
│  │                                    │  │ │   errors │  │
│  │ 👤: create a spinning cube         │  │ │          │  │
│  │                                    │  │ │ Your     │  │
│  │ 💬 Ask Brittney... [Send]          │  │ │ code     │  │
│  └────────────────────────────────────┘  │ │ looks    │  │
│           50%                 30%         │ │ good!    │  │
│                                           │ └──────────┘  │
│                                           │   20%        │
└───────────────────────────────────────────┴────────────────┘
```

## 🏗️ Component Hierarchy

```
App (Dark Mode Theme)
├── TopBar
│   ├── File Controls (New, Load Examples, Save, Compile)
│   ├── View Toggles (AI, Errors, Dark Mode)
│   └── Links (Docs, GitHub)
│
├── Main Content Area (Flex Grid Layout)
│   │
│   ├── Left Panel (60%) - MonacoEditor
│   │   ├── Toolbar
│   │   │   ├── Title & Save Indicator
│   │   │   └── Keyboard Shortcuts
│   │   └── Editor Container
│   │       └── Monaco Instance
│   │
│   └── Right Panels (40%)
│       │
│       ├── Top Panel (50%) - PreviewPanel
│       │   ├── Metrics Bar (FPS, Frame Time, Objects)
│       │   └── Canvas (Three.js Renderer)
│       │
│       └── Bottom Panels (50%) - Horizontal Split
│           ├── Chat (if visible) - BrittneyChat
│           │   ├── Messages Container (scrollable)
│           │   │   ├── User Messages (blue, right-aligned)
│           │   │   └── AI Responses (purple border, left-aligned)
│           │   └── Input Area
│           │       └── Text Input + Send Button
│           │
│           └── Errors (if visible) - ErrorVisualizer
│               ├── Toolbar
│               │   ├── Count Badges (Syntax, Runtime, Warning)
│               │   └── Clear Button
│               └── Errors List
│                   ├── Error Items (color-coded)
│                   │   ├── Icon + Message
│                   │   ├── Line/Column Info
│                   │   └── Expandable Stack Trace
│                   └── Success State (if no errors)
```

## 🔄 Data Flow

```
User Input (Editor)
     ↓
MonacoEditor Component
     ↓
HoloScriptService.validate()
     ↓
Zustand Store (setCode, setErrors)
     ↓
┌─────────────────────────────────────┐
│ Multiple Components Subscribe       │
├─────────────────────────────────────┤
│ • MonacoEditor (show markers)        │
│ • PreviewPanel (compile & render)    │
│ • ErrorVisualizer (display errors)   │
│ • BrittneyChat (context-aware)       │
└─────────────────────────────────────┘
     ↓
Real-time Updates (< 100ms)
```

## 🎯 Service Architecture

```
MonacoEditor.tsx
├── Uses: HoloScriptService
│   ├── validate() → Error detection
│   ├── compile() → AST generation
│   ├── getMonacoTokensProvider() → Syntax highlighting
│   ├── getCompletionSuggestions() → Auto-complete
│   └── extractImports() → Dependency tracking
└── Updates: Zustand Store (code, errors)

PreviewPanel.tsx
├── Uses: PreviewService
│   ├── initialize() → Scene setup
│   ├── createObject() → 3D object creation
│   ├── updateObject() → Property updates
│   ├── getMetrics() → Performance data
│   └── render() → Continuous rendering
└── Updates: Zustand Store (metrics, fps)

BrittneyChat.tsx
├── Generates AI responses
├── Uses: Editor context from Store
└── Updates: Chat messages to Store

ErrorVisualizer.tsx
├── Reads: Errors from Store
└── Provides: Error filtering & navigation
```

## 🗂️ File Organization

```
playground/
├── 📄 Configuration Files
│   ├── vite.config.ts ........................ Build tool config
│   ├── tsconfig.json ......................... TypeScript settings
│   ├── tailwind.config.js .................... CSS framework
│   ├── postcss.config.js ..................... CSS processing
│   ├── package.json .......................... Dependencies
│   └── .gitignore ............................ Git rules
│
├── 🌐 Public Assets
│   └── index.html ............................ Entry point
│
├── 📦 Source Code
│   └── src/
│       ├── 🎨 Components
│       │   ├── App.tsx ........................ Root component
│       │   ├── TopBar.tsx ..................... Navigation
│       │   ├── MonacoEditor.tsx .............. Code editor
│       │   ├── PreviewPanel.tsx .............. 3D preview
│       │   ├── BrittneyChat.tsx .............. AI chat
│       │   └── ErrorVisualizer.tsx ........... Error panel
│       │
│       ├── ⚙️ Services
│       │   ├── HoloScriptService.ts .......... Language support
│       │   └── PreviewService.ts ............ Rendering engine
│       │
│       ├── 🪝 Hooks & State
│       │   └── usePlaygroundStore.ts ........ State management
│       │
│       ├── 📝 Types
│       │   └── playground.ts ................. TypeScript types
│       │
│       ├── 🎨 Styles
│       │   ├── globals.css ................... Global styles
│       │   └── editor.css .................... Editor theme
│       │
│       └── 📄 Entry Points
│           ├── main.tsx ...................... React root
│           └── App.tsx ....................... App component
│
└── 📚 Documentation
    ├── README.md ............................ User guide
    └── IMPLEMENTATION_SUMMARY.md ........... Technical summary
```

## 🔌 State Management Schema

```
PlaygroundStore (Zustand + Immer)
│
├── Editor State
│   ├── code: string (HoloScript source)
│   ├── language: 'holoscript'
│   ├── isSaved: boolean
│   └── lastSaved?: Date
│
├── Playground State
│   ├── code: string
│   ├── errors: PlaygroundError[]
│   ├── isRunning: boolean
│   └── selectedObject?: string
│
├── Preview State
│   ├── isLoading: boolean
│   ├── error?: PlaygroundError
│   ├── fps: number
│   ├── renderTime: number
│   └── objectCount: number
│
├── Chat State
│   ├── messages: ChatMessage[]
│   └── isLoading: boolean
│
├── Inspector State
│   ├── selectedId?: string
│   ├── properties: Record<string, any>
│   └── traits: string[]
│
└── UI State
    ├── showChat: boolean
    ├── showErrors: boolean
    ├── showInspector: boolean
    └── darkMode: boolean
```

## 🔗 Dependencies Graph

```
React 18.2
├── react-dom 18.2
├── zustand 4.4 (+ immer middleware)
│
Monaco Editor 0.50
├── Language services
└── Custom token provider
│
Three.js r160
├── Scene, Camera, Renderer
├── Geometry, Material, Mesh
└── Lighting, Grid
│
React Three Fiber 8.15
├── Canvas wrapper
├── useFrame hook
└── useThree context
│
Drei 9.100
├── Helper geometries
└── Pre-built components
│
Tailwind CSS 3.4
├── PostCSS 8
└── Autoprefixer
│
TypeScript 5.0
├── Strict mode
└── Path aliases
│
Vite 5.0
├── @vitejs/plugin-react 4.0
└── HMR server
```

## 🚀 Build & Runtime Flow

```
Source Files (TypeScript + JSX)
    ↓
Vite Bundler
├── TypeScript Compilation
├── JSX to React calls
├── CSS Processing (Tailwind → CSS)
├── Code Splitting
│   ├── react-dom chunk
│   ├── monaco chunk
│   ├── three chunk
│   └── main chunk
└── Minification
    ↓
Output Files (JavaScript + CSS)
    ↓
Browser Load
├── Parse HTML (index.html)
├── Load Main Chunk
├── Lazy-load Others
└── Bootstrap React
    ↓
Runtime Execution
├── App Mount
├── Initialize Store
├── Render Components
└── Event Listeners
    ↓
User Interaction
├── Type in Editor → HoloScriptService validates
├── Errors in Store → Components subscribe & update
├── Preview renders → Metrics flow back
└── Chat sends → AI generates code
```

## 🎛️ Hot Reload Flow (Development)

```
User Edits Code (Ctrl+S)
    ↓
Vite Detects Change
    ↓
HMR (Hot Module Replacement)
├── JSX Compiled
├── CSS Updated
└── Component Re-rendered
    ↓
React Reconciliation
├── Diff Virtual DOM
├── Update Real DOM
└── Re-run Hooks
    ↓
Store Still Valid (Zustand)
├── Editor code persists
├── State is preserved
└── No full reload needed
    ↓
< 100ms from edit to browser update
```

## 📊 Performance Optimizations

```
Load Time Optimization
├── Code Splitting (Monaco, Three.js separate)
├── Tree Shaking (unused code removed)
├── Minification (production build)
└── Gzip Compression
    → Target: < 2MB main bundle

Runtime Optimization
├── useCallback for event handlers
├── Memoization of expensive computations
├── Lazy Three.js initialization
├── RequestAnimationFrame for 60 FPS
└── Proper cleanup in useEffect
    → Target: 60 FPS with 100+ objects

Memory Optimization
├── Object pooling for particles
├── Texture atlasing
├── Geometry instancing
└── Proper disposal on cleanup
    → Target: < 200MB heap usage
```

## 🔐 Error Handling Flow

```
User Code → HoloScriptService.validate()
    ↓
┌─────────────────────────────────┐
│ Error Detection                 │
├─────────────────────────────────┤
│ • Syntax errors (unmatched {})  │
│ • Type errors                   │
│ • Missing imports               │
│ • Invalid properties            │
└─────────────────────────────────┘
    ↓
Zustand Store Updated (setErrors)
    ↓
┌────────────────────────────────────────┐
│ Multiple Renderers                     │
├────────────────────────────────────────┤
│ 1. MonacoEditor                        │
│    └→ Red squiggly lines & markers     │
│ 2. ErrorVisualizer                     │
│    └→ Error list with details          │
│ 3. PreviewPanel                        │
│    └→ Red overlay with message         │
│ 4. BrittneyChat                        │
│    └→ Debugging suggestions            │
└────────────────────────────────────────┘
```

---

This architecture ensures:
- ✅ **Separation of Concerns** - Each component has single responsibility
- ✅ **Loose Coupling** - Components communicate via store
- ✅ **Easy Testing** - Services are pure functions
- ✅ **Scalability** - Can add features without refactoring
- ✅ **Performance** - Optimized render cycles and lazy loading
- ✅ **User Experience** - Real-time feedback and smooth interactions
