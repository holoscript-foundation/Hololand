# HoloLand Cross-MCP Receipt Envelope

**Status:** Runtime evidence schema
**Date:** 2026-05-12
**Schema:** [hololand-cross-mcp-receipt-envelope.schema.json](hololand-cross-mcp-receipt-envelope.schema.json)
**Example:** [hololand-cross-mcp-receipt-envelope.example.json](hololand-cross-mcp-receipt-envelope.example.json)

## Purpose

Mutating HoloLand actions need one receipt that connects source truth,
orchestration truth, and runtime truth:

```text
HoloScript source -> HoloScript validation -> MCP/Orchestrator trace -> HoloLand runtime mutation -> browser/hardware evidence -> rollback metadata
```

This envelope is required for HoloLand tools that mutate world, shard, zone,
Twin Universe anchor, player, creator, robot, AI, sensor, actuator, payment,
inventory, reward, moderation, or safety state.

## Required Evidence

Every receipt must include:

- Actor ID, surface, session, and authority scope.
- Tool trace ID, MCP server, tool name, and arguments hash.
- HoloScript artifact path, hash, repository, and source trust status.
- HoloScript validation result, validator, validation time, and diagnostics
  hash or explicit diagnostics absence.
- HoloLand world ID, shard ID, and the zone ID or Twin Universe anchor ID affected
  by the action.
- Runtime outcome, mutation hash, affected references, and timing.
- Hardware or browser evidence when applicable, or an explicit not-applicable
  reason.
- Rollback metadata: availability, strategy, snapshot/reference, plan, and
  expiry or immutable reason.

## Trust Boundary

The receipt proves that a HoloScript-looking artifact was not allowed to mutate
HoloLand merely because it parsed. The action must identify source trust,
validation, permissions, runtime target, and rollback. Forks, generated source,
agent suggestions, and creator submissions remain untrusted until this envelope
or a stricter successor records the admission path.

## Validation

Run:

```powershell
pnpm run check:cross-mcp-receipt-envelope
```

The check validates the schema shape, required evidence paths, manifest linkage,
and the example receipt.
