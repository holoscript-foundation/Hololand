# Hololand Platform Roadmap 2026

**The VR/AR platform powered by HoloScript.**

Hololand consumes [HoloScript](https://github.com/brianonbased-dev/HoloScript) as its language and runtime engine. This roadmap covers **platform-specific work only** — language, parser, compiler, traits, and dev tool development lives in the [HoloScript Roadmap](https://github.com/brianonbased-dev/HoloScript/blob/main/ROADMAP.md).

> **Relationship:** HoloScript is the language. Hololand is the platform that hosts, renders, and deploys HoloScript worlds — plus Brittney AI, adapters, and social/commerce infrastructure.

**Current Status**: Multiplayer Runtime In Progress 🔨 | Matchmaking Integration Next  
**Last Updated**: February 16, 2026

---

## Architecture

```
HoloScript (Language Repo)              Hololand (Platform Repo)
─────────────────────────               ─────────────────────────
@holoscript/core (parser)         →     @hololand/core (runtime bridge)
@holoscript/runtime (engine)      →     @hololand/react-three (R3F renderer)
@holoscript/traits (1,800+)       →     @hololand/world (physics/scene graph)
@holoscript/compiler (R3F/Unity)  →     @hololand/renderer (Three.js/WebGPU)
@holoscript/collaboration (CRDT)  →     @hololand/network (WebRTC/WebSocket)
@holoscript/components (25 .holo) →     @hololand/playground (Monaco IDE)
                                        @hololand/brittney-* (AI assistant)
                                        @hololand/adapters/* (Babylon/Unity/VRChat)
                                        @hololand/platform/* (43 packages)
```

---

## ✅ Completed

### Platform Foundation (Nov 2025 – Feb 2026)

All foundational platform packages are built, tested, and integrated:

| Area | Packages | Status |
|------|----------|--------|
| **Core Runtime** | core, world, renderer, react-three | ✅ Ready |
| **Brittney AI** | brittney-service, brittney-toolkit, mcp-server (22 tools), ai-bridge | ✅ Ready |
| **Adapters** | three, babylon, playcanvas, react-three | ✅ Ready |
| **AR/VR** | holofilter, ar-detection, ar-tracking, ar-anchors, ar-renderer | ✅ Ready |
| **Social** | social, auth, voice, gestures | ✅ Ready |
| **Platform** | haptics, navigation, pcg, portals, accessibility, lod, streaming, animation, audio | ✅ Ready |
| **DevTools** | builder (v1.1.0), creator-tools, devtools-extension, playground IDE | ✅ Ready |
| **Network** | network (CRDT state sync + WebRTC) | ✅ Ready |
| **Infrastructure** | logger, ui, spatial, library, ar-embeddings | ✅ Ready |

**Package Count**: 43 open-source + 4 proprietary (commerce, unity-adapter, vrchat-export, backend)

### Builder Tools (packages/devtools/builder — @hololand/builder v1.1.0)

| Module | Lines | Tests | Purpose |
|--------|-------|-------|---------|
| HoloScriptIO.ts | 1,421 | 17 | Import/export .holo files, diffing, version control |
| VisualEditor.ts | 1,601 | — | Node-based scene editor, SceneManager API |
| BrittneyIntegration.ts | 768 | 8 | AI scene generation, explanation, optimization |
| MultiObjectEditor.ts | 1,118 | 50 | Batch editing, 42 VR traits, alignment, constraints |
| PerformanceTools.ts | 1,119 | 34 | Profiler, complexity analysis, budget presets |
| **Total** | **~6,000** | **109** | |

### Playground IDE (packages/playground/ide.html)

Standalone browser IDE — Monaco Editor + Three.js r161 + OrbitControls:
- HoloScript syntax highlighting, completion, validation
- Live 3D preview with trait visualization
- 12 built-in examples, AST viewer, error panel
- Multi-object selection, performance dashboard, multi-edit panel
- 5-tab bottom panel (Output, Errors, AST, Performance, Multi-Edit)

### Component Library (packages/components — 25 templates)

| Category | Templates |
|----------|-----------|
| NPCs (5) | Warrior, Mage, Scout, Merchant, Boss |
| Weapons (5) | Sword, Bow, Staff, Hammer, Spear |
| UI (5) | Health Bar, Inventory, Chat, Menu, HUD |
| Environmental (5) | Portal, Door, Trap, Fire, Water |
| Game Systems (5) | Dialogue, Quest, Achievement, Save, Crafting |

### HoloScript Integration (consumed from HoloScript repo)

These milestones are tracked in the [HoloScript Roadmap](https://github.com/brianonbased-dev/HoloScript/blob/main/ROADMAP.md):

- ✅ **v3.0** — Parser, WASM, VS Code/IntelliJ, Academy, certified packages
- ✅ **v3.1** — Agentic Choreography (agent registry, multi-agent negotiation, spatial context)
- ✅ **v3.4** — Full runtime engine (287 modules, 1,800+ traits, 113 test suites)
- ✅ **v3.5 Phases 0-5** — Language foundations, pipeline, Brittney training data, spatial Brittney, migration, self-building world
- ✅ **Enterprise** — OpenTelemetry, security hardening, edge deployment, rate limiting, multi-tenant, audit logging
- ✅ **Plugins** — robotics, medical, alphafold, scientific (all published to npm)
- ✅ **Collaboration** — CRDT (42 tests), self-improvement pipeline (14 tests)

---

## 🔨 Next: Multiplayer Runtime (4 weeks)

**Goal**: Wire the existing network packages to a live server so `@networked` objects actually sync between clients.

The infrastructure is partially built:
- ✅ CRDT collaborative editing (CRDTDocument, CollaborationSession, CollaborationTransport — 42 tests)
- ✅ VR-aware awareness protocol (worldPosition, platform tracking)
- ✅ HoloScript v3.4 networking modules (Matchmaker, AntiCheat, Prediction — 18 modules)
- ✅ @hololand/network package (WebRTC + WebSocket + CRDT)

### Completed

| Task | Deliverable | Tests |
|------|-------------|-------|
| `@networked` TraitHandler (HoloScript) | `NetworkedTraitHandler.ts` — bridges `NetworkedTrait` class into `VRTraitRegistry` lifecycle | 22 |
| `@networked` registered in VRTraitSystem | Import + register + export in `VRTraitSystem.ts` | — |
| `NetworkedRuntime` (Hololand) | Platform runtime connecting trait events → CoPresenceBridge → NetworkClient | 20 |
| `StateAuthority` module | Centralized ownership with server/owner/shared modes, conflict resolution, lock/unlock, peer disconnect | 45 |
| `PresenceTracker` (backend) | Heartbeat monitoring, online/idle/away status, room location tracking, reaper | 43 |
| `RoomService` (backend) | Room CRUD, join/leave, search/filter, categories, password protection, host migration | 64 |
| `LobbyServer` (backend) | Session management, 16 message handlers, broadcasting, pluggable auth, presence+room orchestration | 60 |
| `SpatialHashGrid` (network) | O(1) spatial partitioning — cell-based 3D grid, radius queries, neighbor lookups | 35 |
| `ServerInterestManager` (network) | Multi-viewer server-side interest — priority tiers, rate throttling, bandwidth budget, snapshot filtering | 62 |
| `NetworkServer` interest integration | Per-client filtered snapshots, viewer/entity lifecycle hooks, always-relevant entities | 16 |
| **Total** | | **367** |

### Remaining Work

| Task | Package | Priority |
|------|---------|----------|
| Matchmaking integration — connect HoloScript Matchmaker to live rooms | @hololand/network | P1 |
| Voice chat relay — spatial voice via WebRTC | @hololand/voice | P2 |
| Anti-cheat enforcement — server-side validation | @hololand/backend | P2 |

### Success Metrics
- 2-8 players in shared VR space with < 50ms sync latency
- `@networked` trait "just works" on any object in `.holo` files
- Voice chat with spatial falloff

---

## 📋 Planned: Brittney v5 Fine-Tune

**Goal**: Fine-tune Brittney with Hololand-specific training data (system/component/import syntax, v3.5 features).

| Task | Source | Status |
|------|--------|--------|
| Training data generated (9 categories × 4 difficulties) | TrainingMonkey | ✅ Complete |
| MCP schema updated (holoscript/r3f frameworks, production difficulty) | TrainingMonkey | ✅ Complete |
| Brittney v5 fine-tune execution | Hololand/brittney | 🔲 Not started |
| Validation against 100 Hololand-specific prompts | Hololand/brittney | 🔲 Not started |

---

## 📋 Planned: Marketplace & Distribution (3 weeks)

**Goal**: Let creators publish, share, and sell HoloScript worlds and templates.

| Task | Package |
|------|---------|
| Template marketplace (browse, search, install) | @hololand/library |
| World publishing (one-click deploy from Playground) | @hololand/frontend |
| Revenue sharing for creators | @hololand/commerce |
| CDN distribution for published worlds | @hololand/streaming |
| Version management and updates | @hololand/library |

---

## 📋 Planned: Production Deployment

**Goal**: Ship Hololand as a production service.

| Task | Notes |
|------|-------|
| Server infrastructure (containers, scaling, monitoring) | Docker + Railway/Fly.io |
| Database (user data, worlds, assets) | PostgreSQL + S3 |
| Auth integration (OAuth, guest accounts) | @hololand/auth |
| CI/CD pipeline (automated builds, tests, deploy) | GitHub Actions |
| npm publish all @hololand/* packages | pnpm workspaces |
| Hololand Central live deployment | Frontend + backend |

---

## 📋 Future: Advanced Platform Features

These are longer-term platform capabilities (not language features):

| Feature | Description | Depends On |
|---------|-------------|------------|
| **VRR Scanning** | Turn real objects into VR assets via holofilter | @hololand/holofilter |
| **AI Companions** | NPCs with persistent memory using Brittney | @hololand/brittney-service |
| **Procedural Worlds** | AI-generated infinite exploration | @hololand/pcg + Brittney |
| **Cross-Platform Export** | Unity/VRChat/Unreal output from .holo | @hololand/adapters/* |
| **Mobile AR App** | Standalone AR viewer for published worlds | @hololand/ar-* |
| **Desktop App** | Tauri-based native Hololand editor | @hololand/devtools/native-host |

---

## 📦 Package Inventory (47 total)

### Open Source (43)

| Category | Count | Packages |
|----------|-------|----------|
| Core | 4 | core, world, renderer, react-three |
| AI | 4 | ai-bridge, brittney-service, brittney-toolkit, mcp-server |
| AR/VR | 5 | holofilter, ar-detection, ar-tracking, ar-anchors, ar-renderer |
| Platform | 12 | haptics, navigation, pcg, portals, accessibility, lod, voice, gestures, streaming, animation, audio, spatial |
| Social/Auth | 3 | social, auth, network |
| DevTools | 4 | builder, creator-tools, devtools-extension, native-host |
| Adapters | 4 | three, babylon, playcanvas, react-three |
| Infrastructure | 5 | logger, ui, library, ar-embeddings, shared/inference |
| Apps | 2 | frontend, playground |

### Proprietary (4)

| Package | Purpose |
|---------|---------|
| @hololand/commerce | Virtual goods, payments |
| @hololand/backend | API server |
| @hololand/unity-adapter | Unity XR export |
| @hololand/vrchat-export | VRChat/UdonSharp export |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | [HoloScript](https://github.com/brianonbased-dev/HoloScript) v3.4+ (1,800+ traits, 6,000+ tests) |
| Rendering | Three.js r161, WebGPU (experimental), React Three Fiber |
| Physics | Cannon.js / Rapier (via @hololand/world) |
| Networking | WebRTC (P2P) + WebSocket (signaling) + Yjs (CRDT) |
| AI | OpenAI (cloud) + llama.cpp (local) via brittney-toolkit |
| Editor | Monaco Editor v0.45.0, VS Code Extension, IntelliJ Plugin |
| Mobile | React Native (client), Tauri (desktop) |
| Backend | Node.js, PostgreSQL, S3 |
| Deployment | Vercel (web), Railway (API), Docker |
| Testing | Vitest (254+ multiplayer + builder tests), HoloScript test suite (6,000+) |

---

## Links

| Resource | URL |
|----------|-----|
| HoloScript Language | [github.com/brianonbased-dev/HoloScript](https://github.com/brianonbased-dev/HoloScript) |
| HoloScript Roadmap | [HoloScript/ROADMAP.md](https://github.com/brianonbased-dev/HoloScript/blob/main/ROADMAP.md) |
| Ecosystem Status | [ECOSYSTEM_STATUS.md](./ECOSYSTEM_STATUS.md) |
| Brittney MCP Server | [packages/brittney/mcp-server](./packages/brittney/mcp-server) |
| Playground IDE | [packages/playground/ide.html](./packages/playground/ide.html) |
| Builder Tools | [packages/devtools/builder](./packages/devtools/builder) |

---

**Last Updated**: February 15, 2026

