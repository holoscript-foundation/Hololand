# HoloLand Living Competitor Gap Matrix

**Status:** Living strategic matrix
**Created:** 2026-05-07
**Owner:** HoloLand platform agents, reviewed by founder
**Update cadence:** Update after every product audit, competitor review, HoloScript source-gap audit, AI development milestone, or hardware validation pass.

## Purpose

Track the gap between HoloLand's target product and the surrounding market. HoloLand is the platform/product surface; HoloScript is the canonical source layer. When this matrix identifies a HoloLand gap, the default implementation path is:

```text
gap found -> define HoloScript primitive/schema/tool/validator -> consume in HoloLand -> validate on hardware -> update this matrix
```

## Status Legend

| Status | Meaning |
|---|---|
| `unknown` | Needs research or current verification. |
| `gap` | Competitor or market expectation is ahead of HoloLand. |
| `parity-target` | Need baseline parity before differentiation matters. |
| `differentiator` | HoloLand/HoloScript can credibly lead here. |
| `validated` | Backed by local code, tests, docs, or hardware receipts. |

## Vertical Map

| Vertical | HoloLand promise | HoloScript layer that should exist | HoloLand consumption surface | Status |
|---|---|---|---|---|
| Living MMO/frontier game loop | Persistent world worth mastering. | `Shard`, `Zone`, `Encounter`, `Quest`, `Item`, `Skill`, `LootTable`, `Receipt`. | `examples/hololand-central`, future Frontier Shard 0. | `gap` |
| Social VR / UGC worlds | Worlds are social, inspectable, and programmable. | Scene graph, permissions, identity, moderation, agent receipts. | Central hub, portals, social lounge, creator kiosk. | `parity-target` |
| Creator tooling | Prompt/template to playable challenge, not just decoration. | Creator templates, validator, compiler, publish review. | Studio/Brittney/HoloLand creator surfaces. | `gap` |
| AI development | Agents generate, validate, test, and evolve worlds/code. | Agent protocols, Absorb, impact analysis, eval receipts, tool manifests. | Brittney, agent docs, HoloLand dev surfaces. | `gap` |
| Hardware development | Hardware claims are validated locally, not just promised. | Hardware quality profiles, WebGPU/WASM/XR receipts, device capability schema. | Renderer, AR packages, headset/mobile/desktop validation. | `gap` |
| Agent stewardship | Agents run events, factions, economy, safety, and QA with receipts. | `AgentAction`, `StewardProposal`, `RollbackPlan`, `WorldIssue`. | Brittney/HoloMesh/HoloLand world stewards. | `gap` |
| Language/platform | HoloScript is visible and inspectable as the source of world truth. | Traits, parser, graph, compilers, validation, source contract. | HoloLand examples and runtime bridges. | `differentiator` |
| Digital twins / robotics / IoT | Real-world systems can be spatially controlled and simulated. | Twin schema, telemetry, solver/robot bridge, safety validation. | Robot teleoperation, geospatial, SNN demos. | `gap` |
| Enterprise/spatial collaboration | Teams can work inside live spatial dashboards and rooms. | Collaboration state, identity, data widgets, audit receipts. | Dashboards, collaboration examples, Brittney. | `unknown` |
| Commerce/economy | Creator rewards and marketplace are fair and inspectable. | Economy rules, ownership, payouts, audit events, anti-exploit checks. | Marketplace/shop/creator program surfaces. | `unknown` |

## Competitor / Benchmark Rows

These rows are seed benchmarks for living research. Do not cite them externally without a fresh source check.

| Benchmark | Vertical(s) | What users expect from them | HoloLand gap to track | HoloScript gap to build | Evidence link | Status | Next update |
|---|---|---|---|---|---|---|---|
| Roblox | UGC, creator economy, social games | Large creator network, publish loop, monetization, multiplayer defaults. | Creator publishing and economy loop is not yet first-class. | Creator template, publish review, economy receipt. | TBD | `gap` | 2026-06-07 |
| Fortnite / UEFN | UGC, live events, social play | High-production live events and creator tools. | HoloLand needs one polished shard/event loop. | Event receipt, shard schema, creator challenge compiler. | TBD | `gap` | 2026-06-07 |
| VRChat | Social VR, avatar/world culture | Strong avatar identity, social presence, user-created worlds. | Avatar/social identity loop needs sharper source contract. | Avatar schema, social reputation, moderation receipt. | TBD | `parity-target` | 2026-06-07 |
| Rec Room | Social games, accessible creation | Easy social games and casual creation. | First-session clarity and creation loop need validation. | Playable template and onboarding receipt. | TBD | `parity-target` | 2026-06-07 |
| Meta Horizon Worlds | Social VR platform | Native headset distribution and social VR baseline. | Hardware/headset validation receipts need to be routine. | XR profile, headset validation schema. | TBD | `parity-target` | 2026-06-07 |
| Spatial | Web/social/creator spaces | Fast web-accessible spatial rooms and events. | HoloLand needs fast browser entry and clear portal loop. | Lightweight scene/profile schema. | TBD | `unknown` | 2026-06-07 |
| Unity | Game engine, XR tooling | Mature engine workflow and asset/tool ecosystem. | HoloLand should not compete as a raw engine. It needs HoloScript-native playability. | Compile/bridge contracts and golden examples. | TBD | `parity-target` | 2026-06-07 |
| Unreal / UEFN | Engine and creator tooling | High-fidelity runtime and creator workflows. | Need HoloScript-to-runtime proof and gameplay templates. | Unreal/scene compiler fixtures, performance receipts. | TBD | `gap` | 2026-06-07 |
| NVIDIA Omniverse | Digital twins, simulation, USD workflows | Enterprise-grade simulation and digital twin interoperability. | HoloLand needs focused twin/simulation vertical slices. | Twin schema, telemetry, solver receipts. | TBD | `gap` | 2026-06-07 |
| Apple Vision Pro ecosystem | Spatial computing hardware/software | Premium spatial UX and hardware quality expectations. | Need VisionOS/WebXR strategy and quality profile. | Device capability manifest, comfort/accessibility profiles. | TBD | `unknown` | 2026-06-07 |
| Meta Quest ecosystem | Consumer VR hardware | Smooth headset UX and performance. | Need local headset validation gate for every shard. | Quest quality profile and XR receipt. | TBD | `gap` | 2026-06-07 |
| Microsoft Mesh | Enterprise spatial collaboration | Meetings, avatars, enterprise trust. | HoloLand enterprise collab story is scattered. | Collaboration room schema, identity/audit receipts. | TBD | `unknown` | 2026-06-07 |
| Niantic / ARKit / ARCore | AR, geospatial, anchors | Real-world anchoring and mobile AR. | AR packages need HoloScript contract examples. | Anchor schema, geospatial receipt, mobile profile. | TBD | `gap` | 2026-06-07 |
| Inworld / Convai-style agent NPCs | AI characters | Conversational agents in worlds. | Brittney needs shard-steward/NPC role contracts. | NPC memory, dialog policy, agent action receipt. | TBD | `gap` | 2026-06-07 |
| Cursor / Copilot / Replit-style AI dev | AI development | Fast code generation and IDE assistance. | HoloLand agents need validated HoloScript tool workflows. | Tool manifest, codegen eval, Absorb/impact receipts. | TBD | `gap` | 2026-06-07 |
| OpenAI / Foundry-style agent platforms | AI development, evaluations | Hosted agents, evals, observability, tool use. | HoloLand needs world-agent evals and receipts. | Agent eval schema, telemetry, rollback. | TBD | `gap` | 2026-06-07 |
| Hardware labs / XR device makers | Hardware development | Device-specific performance and interaction quality. | HoloLand needs repeatable hardware audit harness. | WebGPU/WASM/XR/haptics/hand tracking receipts. | TBD | `gap` | 2026-06-07 |

## Gap Record Template

Use this template when adding a new row.

```markdown
| <benchmark> | <verticals> | <user expectation> | <HoloLand product gap> | <HoloScript source gap> | <file/link/evidence> | <status> | <date> |
```

## Update Protocol For Agents

1. Read `NORTH_STAR.md`, `docs/AGENT_HOLOSCRIPT_TOOLING.md`, and this matrix.
2. Add or update rows only after reading local repo evidence or current external sources.
3. For every HoloLand gap, ask what HoloScript primitive, schema, compiler, validator, or receipt should exist first.
4. Link evidence to local docs, code paths, validation commands, or external sources.
5. Update `Next update` and `Status` every time a row changes.
6. Do not mark a row `validated` without a local test, build, hardware receipt, or HoloScript validation receipt.
