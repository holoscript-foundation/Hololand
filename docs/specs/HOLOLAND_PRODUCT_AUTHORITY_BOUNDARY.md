# HoloLand Product Authority Boundary

**Status:** Governance spec
**Date:** 2026-05-12
**Manifest:** [hololand-product-authority-boundary.v1.json](hololand-product-authority-boundary.v1.json)

## Decision

HoloLand product direction is controlled by the founder team. HoloScript
substrate direction is controlled by the broader HoloScript ecosystem.

This boundary exists because HoloLand is the gamer-facing product world, while
HoloScript is the reusable developer substrate. The same HoloScript primitive
can support many products, but HoloLand's look, feel, player fantasy, shard
shape, and live product experience are not open-ended substrate decisions.

## Authority Split

| Domain | Authority | Examples |
|---|---|---|
| HoloLand product direction | Founder team | Art direction, gamer loops, assets, shard choices, product UX, world canon, creator economy policy, live-ops tone, event cadence. |
| HoloScript substrate | HoloScript ecosystem | Language syntax, semantic traits, parser, validator, compiler, runtime primitives, developer APIs, MCP source tools, graph/Absorb intelligence. |
| Cross-boundary handshake | Both | A new HoloScript primitive required by a HoloLand loop, a reusable receipt format, a world-write admission gate, or a compiler/runtime capability needed by the product. |

Founder-team authority does not mean product work can ignore HoloScript source.
Any shipped behavior that changes what exists, how it behaves, how it
progresses, or what a player can do still needs native HoloScript source and
validation. The founder team controls the product decision; HoloScript controls
the reusable substrate semantics.

## Governance Rules

1. Every product-impacting change must be classified before review as
   `founder-team-product`, `holoscript-substrate`, or `cross-boundary`.
2. Founder-team product changes must not be upstreamed to HoloScript merely
   because they are important to HoloLand.
3. HoloScript substrate changes must not encode HoloLand-specific art
   direction, world canon, content taste, shard policy, or monetization policy.
4. Cross-boundary changes require both a founder-team product receipt and a
   HoloScript substrate routing note.
5. Agents, model output, forked packages, generated assets, and creator
   submissions are advisory until they pass the relevant authority gates.
6. Live-world, Twin Universe, payment, safety, robot/AI, or player-impacting
   changes require receipts that identify the product authority, source
   artifact, runtime target, rollback path, and reviewer.
7. If HoloLand and HoloScript disagree about reusable language/runtime
   semantics, HoloScript wins. If the question is HoloLand look, feel, content,
   player fantasy, or product direction, the founder team wins.

## Required Review Gates

| Gate | Blocks | Required evidence |
|---|---|---|
| `authority-classification` | All product or substrate changes | Declared class, owner, affected surfaces, and rationale. |
| `founder-team-product-receipt` | Art direction, gamer loops, assets, shard choices, product UX, world canon, creator economy, and live-ops policy | Founder-team decision receipt or explicit existing product doctrine citation. |
| `holoscript-substrate-routing` | Language, trait, validator, compiler, runtime primitive, developer API, MCP source tool, graph, or Absorb change | HoloScript upstream issue/PR/commit or a note that the need remains HoloLand-specific. |
| `holoScript-source-contract` | Any HoloLand feature behavior | `.holo`, `.hs`, or `.hsplus` source plus validation evidence, or an explicit bridge-only exception. |
| `asset-world-shard-review` | Assets, world composition, zones, encounters, shard staging, and live events | Originality check, performance target, source/provenance receipt, rollback plan. |
| `product-ux-review` | Player, creator, steward, admin, browser, desktop, mobile, VR, AR, or HoloShell UX | User-facing flow summary, hardware validation target, accessibility note, and founder-team product receipt when direction changes. |
| `world-write-authority` | Live world state, Twin Universe, robot/AI, payment, inventory, rewards, moderation, or safety effects | Actor/session, permission, source hash, safety envelope, runtime outcome, rollback path. |

## Prohibited Shortcuts

- Do not let a HoloScript parser/compiler/trait improvement decide HoloLand
  product taste.
- Do not move HoloLand-only assets, art direction, player loops, or shard
  operations into HoloScript unless a reusable substrate primitive has been
  named.
- Do not accept creator, agent, or forked source into live-world authority
  because it parses.
- Do not ship founder-team product decisions as anonymous "agent consensus."
- Do not use hand-authored TypeScript as the durable product authority for a
  new HoloLand feature.

## Change-Class Checklist

Use this before editing:

```text
1. Is this about what HoloLand should feel like, show, reward, sell, stage, or
   expose to players? -> founder-team-product.
2. Is this about reusable language/runtime/source tooling any HoloScript user
   should get? -> holoscript-substrate.
3. Does HoloLand need a reusable primitive to ship a product loop? ->
   cross-boundary; route product decision and substrate primitive separately.
```
