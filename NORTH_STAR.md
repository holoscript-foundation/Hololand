# North Star -- HoloLand

**Role**: HoloLand is the builder-proof surface for HoloScript: this repo proves that
HoloScript source can be authored by agents, validated, executed, rendered, interacted
with, and receipted on real hardware.
**Non-goal**: reviving HoloLand as a parallel TypeScript/R3F platform, package
garden, or compiler-parity theater.
**Upstream oracle**: `~/.ai-ecosystem/NORTH_STAR.md`
**Vault**: `D:/GOLD/` when mounted

## 2026-06-29 Reboot

HoloLand's active center is no longer "keep every historical Hololand package
installing." The active center is the agent builder proof:

```text
agent intent -> HoloScript source -> HoloScript validation -> execution/render -> live interaction -> receipt
```

Legacy R3F, AR, platform, and example packages are debt unless they are on that
proof path. Do not chase stale workspace/package errors merely to make the old
monorepo feel alive. Fix package graph issues only when they block the active
builder proof loop or a still-running deployment.

## 30/60-Day Canonicality Rule

HoloLand moves fast enough that age flips the burden of proof. Work older than
30 days is suspect unless it clearly supports the builder-proof loop, a current
deployment, the HoloScript source contract, or the Frontier Shard product
north-star. Work older than 60 days is archive-by-default unless it has explicit
current evidence.

This is not an auto-delete rule. It is a canonicality rule: old HoloLand work
must prove why it still belongs in the active source path. Old model weights,
checkpoints, generated artifacts, package-garden experiments, and local runtime
debris belong in artifact/archive lanes or retirement plans, not in the active
canonical product surface.

## Enterprise Package Gates

HoloLand packages are for businesses and enterprise deployments, not for human
users to install as a developer-facing package marketplace. Human users should
experience worlds, workspaces, agents, receipts, and deployed operations.

A HoloLand package is healthy only when it composes upstream HoloScript packages
into a business solution and also acts as a HoloScript benchmark gate. Each
package should prove a real vertical workflow, expose which HoloScript
primitives it depends on, run validation/runtime/render/interaction receipts,
and push missing reusable primitives back upstream to HoloScript instead of
papering them over locally.

## This project's rules

1. **Build gaps in HoloScript first.** HoloLand consumes HoloScript packages, schemas, traits, compilers, validation receipts, and runtime primitives.
2. **Prove the agent builder loop.** A successful HoloLand change helps an agent create, validate, run, render, inspect, or receipt real HoloScript.
3. **TypeScript is bridge debt.** Runtime bridges, hardware integration, tests, tools, and deployment glue may be TypeScript only while they prove HoloScript execution. Product behavior needs `.holo`, `.hs`, or `.hsplus` source.
4. **Do not do package gardening.** Legacy package graph cleanup is not the product unless it directly blocks the builder proof or an active deployment.
5. **Brittney is product-critical when she operates the proof loop.** Agent orchestration logic may live here when it helps agents build and verify HoloScript, but document the HoloScript boundary.
6. **Don't break existing deployments.** Someone might still be running this.
7. **Use HoloScript tools first.** Before changing behavior, read `docs/AGENT_HOLOSCRIPT_TOOLING.md` and `docs/HOLOSCRIPT_SOURCE_CONTRACT.md`.
8. **Enterprise packages gate HoloScript.** Business packages must benchmark upstream HoloScript capabilities and record upstream gaps instead of becoming local rewrites.

## What to check before asking the user

1. "Should I implement this in TypeScript only?" -- No. Define the product behavior in HoloScript first, then let HoloLand consume it.
2. Architecture question? Read `~/.ai-ecosystem/NORTH_STAR.md`
3. Agent/tooling question? Read `docs/AGENT_HOLOSCRIPT_TOOLING.md`
