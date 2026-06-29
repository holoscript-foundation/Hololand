# HoloLand Housekeeping

**Status:** Active operational guide
**Updated:** 2026-06-29
**Repo posture:** HoloLand is the HoloScript builder-proof surface, not a legacy package-garden restoration project.

## Current Cleanliness Rule

Housekeeping must protect the builder-proof loop:

```text
agent intent -> HoloScript source -> validation -> render/run -> interaction -> receipt
```

Safe cleanup is work that makes that loop easier for agents to run, inspect, and
trust. Do not erase, archive, or hide source-like work just to make `git status`
look quiet.

## Ignored Local Debris

The repo intentionally ignores new local debris from:

- `.tmp/`
- `.scratch/`
- `**/.scratch/`
- `.bench-logs/`

Older tracked `.bench-logs` files remain tracked as historical evidence. The
ignore rule only keeps new local receipt debris from flooding agent status
checks.

## Visible Untracked Work

Untracked source-like files under `experiments/` stay visible. They may be real
HoloScript work that needs promotion, archive, or board follow-up. Do not add a
broad `experiments/` ignore rule.

Current known visible untracked families include:

- `experiments/holoshell-human-os-frontier/*-room.holo`
- `experiments/holoshell-human-os-frontier/*-policy.hsplus`
- `experiments/holoshell-human-os-frontier/*-pipeline.hs`
- `experiments/emergence-sim/`

Treat these as intake candidates, not trash.

## Package Boundary

Two package-manager failure modes were observed during the reboot audit:

- legacy Hololand peer/package resolution can try to fetch internal packages
  such as `@hololand/renderer` from npm;
- HoloScript file-linked packages can expose upstream `workspace:^`
  dependencies, for example `@holoscript/framework` asking for
  `@holoscript/llm-provider`.

The active fix is narrow local consumption, not broad package-graph churn:
private HoloLand peer links use `workspace:*`, root HoloScript dependencies are
limited to active proof/gate packages, and `pnpm-workspace.yaml` carries only
the conditional/bridge overrides still needed by local validation.

Package consumption source of truth:
[`docs/HOLOSCRIPT_PACKAGE_CONSUMPTION.md`](HOLOSCRIPT_PACKAGE_CONSUMPTION.md).

Reference proof commands:

```powershell
corepack pnpm@10.28.2 check:native-proof
node scripts/holoshell-agent-builder-proof-0.mjs --mcp-status pass --mcp-format hsplus --mcp-summary "Valid HoloScript code"
node scripts/__tests__/holoshell-agent-builder-proof-0.test.mjs
```

## Next Housekeeping Candidates

1. Promote or archive each visible `experiments/holoshell-human-os-frontier/*`
   trio after reading it and deciding whether it still supports the builder
   proof.
2. Keep shrinking the HoloScript package boundary to the named active,
   conditional, and bridge-debt sets in `docs/HOLOSCRIPT_PACKAGE_CONSUMPTION.md`.
3. Promote additional root `pnpm run` wrappers only when they reach the direct
   proof harness reliably.
