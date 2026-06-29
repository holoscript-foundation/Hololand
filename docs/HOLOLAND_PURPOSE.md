# HoloLand Purpose

HoloLand is the builder-proof surface for native HoloScript.

2026-06-29 reboot: the active repo purpose is to prove that agents can author
HoloScript source, validate it, execute it, render it, interact with it, and
leave receipts on real hardware. The older gamer-facing frontier/MMO direction
is product context, not permission to revive every historical package or R3F
demo surface.

HoloScript defines the semantics: world rules, traits, runtime behavior,
validation, compilers, and provenance. HoloLand makes those semantics visible
and social. It hosts worlds, materializes them through runtime and renderer
bridges, gives creators and agents a place to act, and validates that the result
works on real hardware.

The goal is not to make HoloLand a developer showcase for every compiler target.
The goal is to build assets, worlds, NPCs, encounters, player loops, and
HoloLand-specific tools with HoloScript as the creative substrate. HoloScript is
for developers and ecosystem builders. HoloLand is for gamers, creators, and
players entering a world.

Twin Universe raises the ambition: HoloLand should become the flagship
operational layer and interoperability target for geospatial twins, robot
fleets, AI agents, sensors, actuators, tasks, permissions, and receipts. It
does not mean making Brittney a single locked cloud endpoint, and it does not
prevent HoloScript builders from creating their own worlds from scratch.

## One Sentence

HoloLand is where native HoloScript becomes something agents can build, run,
see, inspect, and receipt.

## Product Authority

HoloLand has a different governance shape than HoloScript:

| Layer | Decision model |
|---|---|
| HoloLand look, feel, world direction, art direction, player fantasy, and game-specific tools | Founder team controls the product. |
| HoloScript language, reusable traits, validators, compilers, developer APIs, and shared substrate | Ecosystem-wide decision process; everyone can shape what HoloScript provides. |

When HoloLand needs a reusable primitive, validator, receipt format, or runtime
capability, push that generic substrate upstream to HoloScript. When HoloLand
needs a game-specific tool, world asset, encounter pack, player loop, shard
operation, creator workflow, or visual/UX choice, keep it in HoloLand.

## What HoloLand Owns

| Area | HoloLand responsibility |
|---|---|
| Runtime embodiment | Load, execute, and materialize HoloScript-authored worlds. |
| Builder proof experience | Agent builder shells, render/runtime surfaces, source-to-receipt flows, and inspectable live proofs. |
| Product experience | Players, creators, portals, discovery, identity, parties, events, and publishing when they are downstream of the builder proof. |
| Assets and worlds | Game assets, zones, shards, NPCs, encounters, item arcs, maps, lore, art direction, and world composition authored with HoloScript. |
| HoloLand-specific tools | Gamer/creator/runtime tools that HoloScript does not need as developer substrate. |
| Twin Universe robot/AI substrate | Geo-anchored world state, robot and AI actor identity, sensor feeds, actuator permissions, fleet tasks, safety envelopes, operational receipts, and real-world-to-game synchronization. |
| Hardware reality | Browser, desktop, WebXR, headset, AR, performance, accessibility, and device validation. |
| Agent presence | Brittney and other agents operating inside live worlds with receipts. |
| Platform integration | Renderer targets, host APIs, networking, storage, payments, analytics, deployment glue, and the evidence that they are driven by HoloScript source. |
| Feedback loop | Discover missing generic primitives and push them upstream to HoloScript while keeping game-specific product work here. |

## What HoloLand Does Not Own

| Boundary | Source of truth |
|---|---|
| Language syntax | HoloScript |
| Traits and semantic primitives | HoloScript |
| Parser, validator, compiler, runtime contracts | HoloScript |
| Canonical gameplay, simulation, world rules, NPC logic, quests, items, and encounters | HoloScript source files consumed by HoloLand |
| HoloScript developer experience, public API surface, and competitor compiler parity | HoloScript |
| Hand-authored TypeScript or TSX as product truth | Not allowed; remaining `.ts` and `.tsx` are migration debt |
| Hand-authored renderer output as product truth | Not allowed; generated output is disposable build material |

## Proof Policy

HoloLand proves that **native HoloScript features** can render and run through
agent-operated builder flows. It is not primarily a proof that HoloScript can
export to every competitor runtime or compiler target.

Compiler/export targets matter for developers. HoloLand's proof loop is
different:

```text
agent intent -> HoloScript source -> validation -> execution/render -> live interaction -> receipt -> upstream substrate gap if needed
```

If a Unity, Unreal, Three.js, React, WebGPU, or other compiler target helps
HoloLand ship a surface, it can be used as an implementation bridge. The proof
claim should still be: "an agent built and verified this from native HoloScript
source," not "HoloLand is a demo of competitor compiler parity."

## Forks And Trust

HoloScript can be cloned or forked. HoloLand must treat that as a permanent
reality, not an edge case. A fork may be useful, experimental, or malicious; it
does not automatically inherit HoloLand trust.

Only artifacts that pass the relevant conformance, provenance, sandbox,
permission, and receipt gates may affect HoloLand world state. This is
especially strict for Twin Universe robot/AI operations, where source admission can
touch physical context, sensors, actuators, payments, property rights, or human
safety.

## Zero TypeScript Boundary

The strategic target is explicit: HoloLand should have **zero hand-authored
`.ts` and `.tsx` files**.

HoloLand source is HoloScript:

- `.holo` for worlds, scenes, UI surfaces, interactions, and spatial content
- `.hs` for reusable semantic programs, templates, agents, and utilities
- `.hsplus` for typed systems, state machines, runtime modules, and platform logic

Current TypeScript and TSX files are not acceptable end-state infrastructure.
They are migration debt. During the migration, they may exist only as clearly
bounded bridge/runtime/tooling work while the durable capability moves into one
of three places:

- HoloScript source in this repository
- HoloScript runtime/compiler/tooling upstream
- ignored generated output that can be recreated from HoloScript source

If a feature changes what exists, how it behaves, how it progresses, or what the
player can do, it needs `.holo`, `.hs`, or `.hsplus` source now. New
hand-authored `.ts` or `.tsx` requires an explicit migration exception, not a
casual "bridge" label.

HoloLand-specific tools and assets can absolutely live in HoloLand. The
constraint is source form and receipts, not that every product feature must move
to HoloScript. HoloScript receives reusable substrate; HoloLand keeps the game.

The same split applies to Twin Universe for robots and AI. Generic robot, agent,
safety, and receipt primitives should move upstream when they belong to every
HoloScript developer. HoloLand keeps the product substrate: the lived world
state, robot and AI actor registration, geospatial operational graph, fleet and
quest workflows, player-facing permissions, and real-world action receipts.

## Product Direction

The current strategic target is a programmable living frontier MMO: a
premium-scale game world where players explore persistent frontier zones and a
Twin Universe layer through browser, desktop, mobile, VR, and AR apps. Twin Universe
is not a separate enterprise demo; it is one layer of the game, where real
places, geospatial anchors, AR overlays, IoT/sensor context, and professional
or civic experiences can become quests, markets, events, showrooms, classrooms,
and social hubs.

That direction matters because it makes the platform more than a gallery of
rooms. Every world rule should have source, every agent action should leave a
receipt, every real-world anchor should have privacy and consent semantics, and
every hardware claim should be locally validated.

For robots and AI, Twin Universe is the operational layer where virtual world
state, physical context, perception, actuation, and human-facing gameplay meet.
Robots report through HoloLand anchors, AI agents reason over places, tasks, and
permissions, and real-world actions produce receipts that the game, operators,
and agents can inspect.

## Documentation Rule

When writing HoloLand docs, start from this boundary:

```text
HoloScript is the developer substrate. HoloLand is the gamer proof world.
```

Do not describe HoloLand as only a metaverse, a Three.js app, a Vite starter, or
a no-code builder. Those are surfaces. The active purpose is to prove that
HoloScript can be built, rendered, run, and inspected by agents.
