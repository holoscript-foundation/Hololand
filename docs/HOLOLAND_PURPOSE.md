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
| Platform bridges | Renderer adapters, host APIs, networking, storage, payments, analytics, and deployment glue. |
| Feedback loop | Discover missing primitives and push them upstream to HoloScript instead of hiding them here. |

## What HoloLand Does Not Own

| Boundary | Source of truth |
|---|---|
| Language syntax | HoloScript |
| Traits and semantic primitives | HoloScript |
| Parser, validator, compiler, runtime contracts | HoloScript |
| Canonical gameplay, simulation, world rules, NPC logic, quests, items, and encounters | HoloScript source files consumed by HoloLand |
| Hand-authored renderer output as product truth | Not allowed; generated output is disposable build material |

## TypeScript Boundary

TypeScript is allowed in HoloLand when it is infrastructure:

- runtime bootstrap
- renderer and host API bridges
- WebXR, AR, browser, native, and hardware integration
- networking, persistence, deployment, tests, tooling, and CI

TypeScript is not the canonical place for new world behavior. If a feature
changes what exists, how it behaves, how it progresses, or what the player can
do, it needs `.holo`, `.hs`, or `.hsplus` source.

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
