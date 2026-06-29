# HoloLand Builder-Proof Reboot

**Status:** Ratified repo posture
**Ratified by:** Founder directive, 2026-06-29
**Source layer:** HoloScript
**HoloLand role:** Builder proof that HoloScript renders and runs for agents

## Decision

HoloLand is no longer optimized around keeping the historical Hololand package
monorepo alive. The repo is the proof harness for HoloScript:

```text
agent intent -> HoloScript source -> validation -> execution/render -> interaction -> receipt
```

The central product question is not "can every stale HoloLand package install?"
It is "can an agent build something real in HoloScript, see it run, and leave
evidence that the language drove the result?"

2026-06-29 update: HoloLand packages are enterprise and business deployment
assemblies. They consume and combine HoloScript packages, then double as
benchmarks/gates for whether HoloScript can support a real business workflow.
They are not human-user package surfaces.

## What This Replaces

This reboot supersedes the old default behavior where agents treated package
install failures, R3F examples, and legacy platform packages as the product
center. Those surfaces may still exist and may still support deployments, but
they are not the direction by themselves.

Do not turn HoloLand into:

- a TypeScript/R3F platform parallel to HoloScript
- a package-gardening project
- a gallery of disconnected demos
- a compiler-parity theater for export targets
- a proof that hand-authored renderer output can be dressed up as HoloScript

## Active Proof Loop

A HoloLand reboot slice is done only when it proves this loop end to end:

1. An agent or builder expresses intent.
2. HoloScript source is created or selected (`.holo`, `.hs`, or `.hsplus`).
3. HoloScript validation or diagnostics run.
4. The source executes or compiles through a HoloScript-owned path.
5. HoloLand renders or operates the result.
6. A user or agent can interact with the live surface.
7. The run leaves a receipt with source path, validation, runtime/render target,
   interaction evidence, and hardware/browser notes where relevant.

If a change does not move one of those steps forward, it is probably not reboot
work.

## Enterprise Package Gate

An enterprise package is a vertical HoloLand assembly for business use cases
such as a healthcare room, retail showroom, factory twin, real-estate
walkthrough, training simulation, customer support world, robot operations
center, or Twin Universe venue.

Each enterprise package must declare:

- the business workflow it proves
- the HoloScript packages, traits, schemas, validators, and runtime primitives it
  consumes
- the HoloScript benchmark or acceptance gate it represents
- the source, validation, runtime/render, interaction, and hardware/browser
  receipt evidence required for promotion
- any reusable capability that belongs upstream in HoloScript before the package
  can be considered healthy

Promotion fails when the package only proves local TypeScript behavior, hides a
missing HoloScript primitive behind HoloLand-specific glue, or cannot leave a
receipt that ties the business workflow back to HoloScript source.

## Keep

Keep or strengthen surfaces that help prove the loop:

- HoloShell and Brittney surfaces when they operate HoloScript builder flows.
- Receipt runners that capture source, validation, runtime, render, and hardware
  evidence.
- HoloScript-authored worlds, scenes, tools, agents, and test fixtures.
- Minimal runtime bridges needed to render or operate HoloScript output.
- Existing deployments that are still running and can become proof surfaces.

## Deprioritize

Deprioritize surfaces that exist mainly because old HoloLand once wanted a broad
package platform:

- stale `packages/platform/*`, `packages/ar/*`, `examples/*`, and adapter graphs
  unless they directly support the proof loop
- package install cleanup that only reveals the next stale peer dependency
- R3F compile targets that do not prove HoloScript semantics at runtime
- examples whose only evidence is "the bundle built"
- TypeScript features that should be HoloScript source

Do not delete these casually. Treat them as migration debt to be archived,
converted, or reconnected to the proof loop with evidence.

## First Reboot Slice

The first coherent slice should be:

```text
Agent Builder Proof 0
```

Minimum scope:

- one HoloScript source artifact
- one agent-facing builder command or UI path
- one validation receipt
- one live render/runtime surface
- one interaction check
- one browser or hardware receipt

The receipt should answer:

- Which HoloScript source drove the result?
- Which validator or diagnostic accepted it?
- Which runtime or render path materialized it?
- What did the agent or user actually see or do?
- What hardware/browser/device evidence was captured?

## Package Graph Rule

When a package install fails, classify it before fixing it:

| Failure type | Action |
|---|---|
| Blocks Agent Builder Proof 0 | Fix narrowly and validate. |
| Blocks an enterprise package gate | Fix narrowly if the package is already tied to HoloScript source and receipts; otherwise define the missing gate first. |
| Blocks an active deployment | Fix narrowly and validate. |
| Exposes stale legacy package graph only | Record as migration debt; do not chase during reboot work. |
| Reveals a missing HoloScript runtime/compiler primitive | Build or file the gap upstream in HoloScript. |

The default answer is not "make pnpm install the whole old workspace." The
default answer is "does this help prove HoloScript renders and runs for agents?"

## Success Metric

HoloLand is healthy when a fresh agent can:

1. Open the repo.
2. Find the builder-proof path.
3. Author or select HoloScript.
4. Validate it.
5. Run/render it.
6. Capture a receipt.
7. Know whether any failure belongs in HoloLand or upstream HoloScript.

Everything else is support structure.
