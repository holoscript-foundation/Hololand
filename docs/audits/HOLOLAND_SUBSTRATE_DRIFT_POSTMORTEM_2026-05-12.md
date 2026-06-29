# HoloLand / HoloScript Substrate Drift Postmortem

**Date:** 2026-05-12
**Status:** Incident review
**Scope:** HoloLand product doctrine, HoloScript runtime/package history, paper programs, MCP/RCP/CLI canaries, Twin Earth robot/AI substrate, and fork trust boundaries.

> Vocabulary note (2026-06-29): This postmortem preserves the May 2026
> "Twin Earth" incident language. Current HoloLand product vocabulary is
> Twin Universe; Twin Earth remains legacy terminology and a compatibility
> identifier in older tools, receipts, and tasks.

## Incident

The ecosystem had important substrate ideas that were either deleted, retired,
separated into another repository, or never written into the paper/program
surface strongly enough to survive refactors. The user had to rediscover the
gap by asking why there were no Rust files, whether the Rust agent runtime had
been lost, whether HoloLand should revive it, and whether HoloLand's monopoly
Twin Earth substrate could be abused by hostile HoloScript forks.

This was not a single missing file. It was a governance and evidence failure:
ideas that were not written into specs, paper programs, tests, manifests, or
board tasks stopped being treated as important.

## What Happened

- HoloLand and HoloScript were separated correctly at the repo boundary, but the
  product implications were not fully re-written into HoloLand-facing doctrine.
- Old Rust runtime/spatial-engine work existed in history, then was phased out
  or retired without a durable product-facing decision record in HoloLand.
- HoloLand had many examples and legacy product slices, but no current
  first-class doctrine that HoloLand is the gamer proof world and Twin Earth
  substrate for robots and AI.
- The paper/program layer did not force missing runtime, trust, HoloLand, and
  fork-admission concerns to remain visible.
- MCP, RCP/receipt, and CLI surfaces were not being dogfooded as canaries for
  these strategic gaps.
- The open-source fork threat was only implicit in provenance/sandbox language,
  not explicit as an admission policy for HoloLand world-write authority.

## Impact

- Rust runtime history became a memory problem instead of a tracked product
  decision.
- HoloLand's sovereign tool needs were easy to misclassify as duplicate
  HoloScript work.
- Twin Earth robot/AI substrate authority was underspecified.
- Forked or hostile HoloScript-looking artifacts did not have an obvious
  HoloLand admission doctrine.
- Agents could optimize local docs or packages while missing ecosystem-level
  consequences.

## Root Cause

The system treated written artifacts as reality and did not have enough gates
for important unwritten intent.

The missing invariant was:

```text
If a capability is strategically important, it must exist in at least one durable surface:
spec, paper program, package manifest, tool manifest, test/canary, receipt schema, or board task.
```

When Rust runtime work, HoloLand sovereign tools, Twin Earth robot/AI substrate,
and fork-trust rules were not represented across those surfaces, later agents
had no reason to preserve or test them.

## Contributing Factors

- HoloLand's old docs mixed metaverse, VR hub, no-code builder, and platform
  language without a sharp Frontier MMO / Twin Earth substrate center.
- HoloScript's developer substrate role and HoloLand's gamer/product substrate
  role were not separated cleanly enough for agents to route work.
- The paper program rewarded what had evidence artifacts; missing product
  doctrine therefore vanished from paper gravity.
- The board had many tasks, but not enough canary tasks that forced MCP, RCP,
  CLI, and docs to disagree loudly when a strategic surface was absent.
- Open-source fork abuse was treated as an obvious future security topic rather
  than a first-class admission requirement for any world-writing system.

## What Changed In This Session

- Added HoloLand purpose doctrine: native HoloScript proof world, not competitor
  compiler showcase.
- Added HoloLand/HoloScript product authority split.
- Added HoloLand sovereign tools spec.
- Added Twin Earth robot/AI monopoly substrate language.
- Added Brittney sovereignty and fork-admission distinctions.
- Filed canary tasks for Rust, HoloLand legacy cleanup, sovereign tools,
  Brittney lineage, native proof, Twin Earth robot/AI substrate, and hostile
  fork admission.

## Remaining Failure Modes

1. **Paper invisibility repeats.** New doctrine lands in HoloLand docs but never
   enters paper programs, so research agents ignore it.
2. **Canary tasks pile up.** The board records gaps, but no single harness proves
   MCP, RCP/receipts, CLI, docs, and package manifests agree.
3. **Rust decision stays stale.** The retired Rust stack may remain retired, but
   the ecosystem still lacks a positive runtime ownership decision for whether
   Rust should return as agent/runtime/simulation infrastructure.
4. **Fork policy stays prose.** HoloLand says hostile forks do not inherit trust,
   but no admission gate rejects them in code.
5. **HoloLand product work keeps masquerading as HoloScript substrate.** Agents
   may keep trying to upstream game/product tools instead of building them in
   HoloLand with HoloScript source.

## Action Items

1. Add a paper-program row for HoloLand as native HoloScript proof world and
   Twin Earth robot/AI substrate.
2. Add a Rust runtime decision record: retired, revived, or replaced, with the
   exact package boundary and owner.
3. Build a cross-surface canary harness that runs MCP, RCP/receipt, CLI, docs,
   and package-manifest checks for HoloLand/HoloScript substrate claims.
4. Implement HoloLand fork admission gates for conformance, provenance,
   signatures, sandboxing, permissions, and receipts.
5. Add a recurring architecture drift check: any top-level strategy that is not
   represented in a spec, paper, task, manifest, or test is considered at risk.

## Decision

Do not revive Rust because it once existed. Do not reject Rust because it was
retired once. Decide based on the HoloLand/HoloScript substrate contract:

- If Rust gives HoloScript a safer or faster reusable runtime/simulation layer,
  it belongs in HoloScript with paper/test evidence.
- If Rust gives HoloLand a platform-specific runtime bridge or hardware
  validator, it can live in HoloLand as bridge infrastructure.
- If it only duplicates TypeScript runtime semantics without stronger safety,
  performance, determinism, or hardware evidence, it should stay retired.

The durable fix is not nostalgia. The durable fix is evidence surfaces that make
important ideas impossible to silently lose.
