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

## Package Manager Blocker

`pnpm run ...` can still fail before script execution in this checkout. Two
separate blockers have been observed:

- legacy Hololand peer/package resolution can try to fetch internal packages
  such as `@hololand/renderer` from npm;
- HoloScript file-linked packages can expose upstream `workspace:^`
  dependencies, for example `@holoscript/framework` asking for
  `@holoscript/llm-provider`.

Do not paper this over with broad package-graph churn in HoloLand. The safe
builder-proof commands remain direct Node commands until the HoloScript package
consumption boundary is fixed deliberately.

Reference proof commands:

```powershell
node scripts/holoshell-agent-builder-proof-0.mjs --mcp-status pass --mcp-format hsplus --mcp-summary "Valid HoloScript code"
node scripts/__tests__/holoshell-agent-builder-proof-0.test.mjs
```

## Next Housekeeping Candidates

1. Promote or archive each visible `experiments/holoshell-human-os-frontier/*`
   trio after reading it and deciding whether it still supports the builder
   proof.
2. Fix the HoloScript package consumption boundary so external consumers do not
   inherit unresolved `workspace:^` dependencies from file-linked packages.
3. Only then restore ergonomic root `pnpm run` wrappers for builder-proof
   commands.
