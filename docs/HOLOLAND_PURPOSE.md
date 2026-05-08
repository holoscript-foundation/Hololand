# HoloLand Purpose

HoloLand is the lived platform for HoloScript worlds.

HoloScript defines the semantics: world rules, traits, runtime behavior,
validation, compilers, and provenance. HoloLand makes those semantics visible
and social. It hosts worlds, materializes them through runtime and renderer
bridges, gives creators and agents a place to act, and validates that the result
works on real hardware.

## One Sentence

HoloLand is where HoloScript becomes a persistent world people and agents can
enter.

## What HoloLand Owns

| Area | HoloLand responsibility |
|---|---|
| Runtime embodiment | Load, execute, and materialize HoloScript-authored worlds. |
| Product experience | Players, creators, portals, discovery, identity, parties, events, and publishing. |
| Hardware reality | Browser, desktop, WebXR, headset, AR, performance, accessibility, and device validation. |
| Agent presence | Brittney and other agents operating inside live worlds with receipts. |
| Platform integration | Renderer targets, host APIs, networking, storage, payments, analytics, deployment glue, and the evidence that they are driven by HoloScript source. |
| Feedback loop | Discover missing primitives and push them upstream to HoloScript instead of hiding them here. |

## What HoloLand Does Not Own

| Boundary | Source of truth |
|---|---|
| Language syntax | HoloScript |
| Traits and semantic primitives | HoloScript |
| Parser, validator, compiler, runtime contracts | HoloScript |
| Canonical gameplay, simulation, world rules, NPC logic, quests, items, and encounters | HoloScript source files consumed by HoloLand |
| Hand-authored TypeScript or TSX as product truth | Not allowed; remaining `.ts` and `.tsx` are migration debt |
| Hand-authored renderer output as product truth | Not allowed; generated output is disposable build material |

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

## Product Direction

The current strategic target is a programmable living frontier: a persistent
world where players explore, creators publish, and agents steward the ecology.
That direction matters because it makes the platform more than a gallery of
rooms. Every world rule should have source, every agent action should leave a
receipt, and every hardware claim should be locally validated.

## Documentation Rule

When writing HoloLand docs, start from this boundary:

```text
HoloLand is the platform experience. HoloScript is the source of reality.
```

Do not describe HoloLand as only a metaverse, a Three.js app, a Vite starter, or
a no-code builder. Those are surfaces. The purpose is to prove that HoloScript
can operate a living world.
