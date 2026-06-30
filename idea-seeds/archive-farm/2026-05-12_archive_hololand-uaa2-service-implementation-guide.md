# Hololand uaa2-service Implementation Guide

**Date:** 2026-05-12
**Class:** retired-component
**Status:** merged
**Repository:** Hololand
**Source context:** docs/archive/IMPLEMENTATION_GUIDE.md
**Archive score:** 50
**Archive signals:** future:1, next steps:1, phase:6, migration:1, agent:29, hologram:1, vr:13, ar:1, brittney:9

## What Might Be Valuable

Brittney Agent Example: typescript // uaa2-service/src/agents/CustomerServiceAgent.ts

## 2026-06-30 Reconciliation

**Action closed.** The original done evidence for the Implementation Guide seed
was incomplete because the supplied uaa2-service receipt reviewed the sibling
Integration seed, not this archive. Re-reviewing the archive shows one durable
signal: a Brittney/customer-service style agent can turn user intent into
HoloScript source and ask HoloLand to project it after validation.

That signal is already represented by the source-first uaa2-service seed gate:

- Gate source: `apps/holoshell/source/holoshell-uaa2-service-seed-gate.hsplus`
- Audit: `docs/audits/HOLOLAND_UAA2_SERVICE_SEED_GATE_2026-06-30.md`
- Reconciliation receipt:
  `docs/audits/HOLOLAND_UAA2_SERVICE_IMPLEMENTATION_GUIDE_RECONCILIATION_2026-06-30.md`

The archived TypeScript extension examples remain historical context only. They
should not be revived as a direct uaa2-service runtime dependency or copied into
current HoloLand without a new HoloScript source contract, adapter receipt, and
validation run. No additional board item required.

## Why Not Now

This came from an archive and describes a direct TypeScript/service integration
shape that current HoloLand has retired from runtime scope. The preserved value
has been merged into the source-first gate above.

## Smallest Next Experiment

If this reopens, express the Brittney/customer-service builder path as
HoloScript source first, then attach an adapter receipt before execution.

## Reopen Trigger

Reopen only when a current HoloScript-native Brittney/customer-service builder adapter needs a separate receipt beyond the existing uaa2-service seed gate.

## Do Not Preserve

Do not revive the archived implementation wholesale. Preserve the idea only if it survives current source contracts, product direction, and validation requirements.

## Links

- docs/archive/IMPLEMENTATION_GUIDE.md
