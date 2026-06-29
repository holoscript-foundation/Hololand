# HoloLand Reboot Retirement Plan - 2026-06-29

Status: proposal only. No archive, delete, or move has been executed.

## Decision

HoloLand should stay as the source-control proof surface, but the active repo
should be narrowed to the HoloScript builder-proof spine:

```text
agent/business intent
-> HoloScript source
-> validation
-> render/run
-> interaction
-> receipt
```

Everything outside that loop is either:

- active proof kernel,
- runtime bridge debt,
- enterprise benchmark/gate material,
- intake material waiting promotion,
- or Jetson archive candidate.

The reboot should not preserve the old package garden as a product shape. In the
new shape, HoloLand packages are enterprise/business assemblies that depend on
and combine upstream HoloScript packages. They double as benchmarks and gates
for HoloScript. Human users do not need a visible package surface here.

## Canonical Anchors

- `NORTH_STAR.md`: HoloLand proves HoloScript can be authored, validated,
  executed/rendered, interacted with, and receipted.
- `docs/HOLOLAND_PURPOSE.md`: HoloLand owns lived runtime embodiment, builder
  proof, product experience downstream of proof, worlds/assets, Twin Earth,
  hardware reality, and agent presence.
- `docs/HOLOSCRIPT_SOURCE_CONTRACT.md`: hand-authored TypeScript/TSX behavior is
  migration debt unless it keeps a named migration alive, bridges runtime output,
  or upstreams a missing HoloScript primitive.
- `docs/specs/HOLOLAND_BUILDER_PROOF_REBOOT.md`: the first coherent reboot slice
  is Agent Builder Proof 0 plus enterprise package gates.
- `docs/HOLOLAND_HOUSEKEEPING.md`: untracked HoloScript experiments are intake
  candidates, not trash.

## Evidence Snapshot

Read-only scans on 2026-06-29 found:

- `source/**`: 23 HoloScript/HoloScript-plus files, 0 TypeScript files.
- `apps/holoshell/source/**`: 134 HoloScript-family files and 11 script-like
  bridge files.
- `packages/**`: 1,817 TypeScript/TSX files and 140 HoloScript-family files in
  the earlier full inventory; package-bucket scan excluding `node_modules`
  showed `platform` at 963 TS / 115 HoloScript, `adapters` at 124 TS / 0
  HoloScript, `ar` at 198 TS / 0 HoloScript, `brittney` at 150 TS / 13
  HoloScript, `components` at 0 TS / 9 HoloScript, and `holoshell` at 0 TS / 1
  HoloScript.
- `examples/**`: HoloScript-first examples exist, but many package examples are
  TS-only. Examples with TS and 0 HoloScript include `04-react-starter`,
  `05-desktop-app`, `06-mobile-app`, `07-hybrid-world`,
  `08-progressive-vr`, `09-multiplayer-lobby`, `09-quality-showcase`,
  `10-collaborative-building`, `11-social-hub`, `12-multi-user-ar`,
  `13-universal-dashboard`, `compilation-demo`, `hololand-landing`,
  `hololand-website`, `hybrid-dashboard`, and `oasis`.
- Tracked generated/package artifacts are present: `hololand-world-1.0.0.tgz`
  and package-lock files under `packages/platform/logger`,
  `packages/platform/voice`, and `packages/shared/inference`.
- Local debris exists in the worktree, including `node_modules`, `.next`,
  `.tmp`, `.scratch`, `.venv`, `coverage`, `.proprietary`, and
  `platform/backend/node_modules`.
- `node scripts/check-zero-typescript.mjs --strict` currently fails because the
  repo still contains 1,863 non-declaration TS/TSX source files.
- `node scripts/check-native-holoscript-proof.mjs` currently fails at parser
  validation because the HoloScript package boundary attempts a non-interactive
  `pnpm install` and hits `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. The
  source-signal checks pass, so the immediate blocker is package consumption,
  not absence of native HoloScript intent.

## Active Proof Kernel - Keep In The Mainline

Keep these surfaces active and make them easier for agents to find:

| Surface | Status | Why it stays |
| --- | --- | --- |
| `source/**` | active proof kernel | Canonical HoloLand HoloScript source spine: runtime atlas, domains, VR layers, Twin Earth layer, receipts, verticals, and proofs. |
| `apps/holoshell/source/**` | active proof kernel | Dense HoloScript/HoloScript-plus source for HoloShell, builder proof, Human OS rooms, and agent-operable runtime flows. |
| `apps/holoshell/enterprise-gates/**` | active gate surface | Enterprise gates define business benchmarks for HoloScript. Keep and expand even if the implementations call receipt scripts. |
| HoloScript-heavy examples | active examples | Keep `examples/01-hello-vr-world`, `02-physics-playground`, `03-vr-shop`, `14-holoscript-survival-benchmark`, `fresh`, `headless`, `native-authoring-pipeline`, `twin-earth`, and HoloScript-backed `demos`. |
| `packages/platform/library` | active library | HoloScript-heavy package surface that can become upstream package-consumption proof. |
| `packages/components` | active library | HoloScript-only components are aligned with source-first package gates. |
| `packages/holoshell` | active bridge | Small HoloScript-oriented package; keep if it remains tied to HoloShell proof flows. |
| Receipt/check scripts | active harness | The reboot needs receipts more than app surface area. Keep the scripts that prove source, validation, run/render, interaction, and enterprise gate outcomes. |

## Runtime Bridge Debt - Quarantine, Do Not Celebrate

These areas may still be load-bearing, but they should not define the new
product shape:

| Surface | Status | Next treatment |
| --- | --- | --- |
| `packages/platform/renderer` | bridge debt | Large TS renderer with some HoloScript. Keep only as a runtime bridge until HoloScript render/run receipts no longer depend on it. |
| `packages/platform/core`, `world`, `spatial`, `ui`, `audio` | bridge debt | Mixed TS/HoloScript packages. Require an explicit proof-loop role or upstream migration issue before further feature work. |
| `examples/hololand-central` | reference consumer | Keep as evidence of historical product direction, but drain canonical source into `source/**` and proof gates. Do not let the TS app become source truth. |
| `examples/hololand-legends` | watch / migrate | Contains HoloScript signals and TS. Keep only if it becomes a benchmark gate or source-authored game proof. |
| `packages/brittney/**` | conditional bridge | Keep only where it operates HoloShell, local agent proof, enterprise gates, or MCP receipts. Deprecated service surfaces should not receive new product work. |

Rule: bridge debt can exist, but every bridge must point to a HoloScript source
or receipt. A TS bridge with no source or receipt path is archive-bound.

## Jetson Archive Candidates

Proposed stable target:

```text
/mnt/nvme/archives/hololand/2026-06-29-reboot/
```

Use a manifest with original repo path, archive reason, git commit, checksum, and
restore command. Archive to Jetson should preserve history and receipts; deletion
from the repo is a separate approval step.

### A. Generated And Packaged Artifacts

| Candidate | Proposed action | Story |
| --- | --- | --- |
| `hololand-world-1.0.0.tgz` | archive to Jetson release/artifacts bucket | This is a package artifact, not active source. It can be kept as a historical release receipt without living at repo root. |
| `examples/compiled-outputs/` | archive unless promoted as golden fixtures | The directory is output-shaped and TS-only in the inventory. If any file is a golden expected output, promote it under a named fixture with source and receipt; otherwise regenerate on demand. |
| `packages/platform/logger/package-lock.json` | archive/remove after package-manager decision | Root package management is pnpm/workspace-shaped. Nested npm lockfiles add resolver noise unless a package is intentionally standalone. |
| `packages/platform/voice/package-lock.json` | archive/remove after package-manager decision | Same as above. Keep only with a written standalone-package reason. |
| `packages/shared/inference/package-lock.json` | archive/remove after package-manager decision | Same as above. Keep only with a written standalone-package reason. |

### B. Local Debris And Heavy Build Output

These should not be source truth. Some may be ignored already, but the worktree
contains them and they should be cleared or cold-stored only after approval:

- `node_modules/**`
- `.next/**`
- `.tmp/**`
- `.scratch/**`
- `.venv/**`
- `coverage/**`
- `platform/backend/node_modules/**`
- `examples/oasis/src-tauri/target/**`

`.proprietary/**` needs separate founder approval before any move because it may
represent private overlay source rather than disposable build output.

### C. TS-Only Example Garden

These examples have package scripts but no HoloScript source in the inventory.
They should be archived to Jetson unless a current deployment owner promotes
them into source-first benchmark gates:

| Candidate | Proposed action | Story |
| --- | --- | --- |
| `examples/04-react-starter` | archive or replace with HoloScript starter | React starter value is superseded by the source-first builder proof contract. |
| `examples/05-desktop-app` | archive | Existing audits already classified this as scaffold-like; it has TS and no HoloScript. |
| `examples/06-mobile-app` | archive | Scaffold-like example with TS and no HoloScript; not a benchmark gate. |
| `examples/07-hybrid-world` | archive | Hybrid TS example conflicts with source-first reboot unless rewritten as HoloScript. |
| `examples/08-progressive-vr` | archive/watch | Keep only if it proves a runtime target from HoloScript source; otherwise archive. |
| `examples/09-multiplayer-lobby` | archive | Scaffold-like TS-only example with no source contract. |
| `examples/09-quality-showcase` | archive/watch | Quality proof should be a receipt gate, not a TS-only showcase. |
| `examples/10-collaborative-building` | archive | Scaffold-like TS-only example; no HoloScript source. |
| `examples/11-social-hub` | archive | Scaffold-like TS-only example; no HoloScript source. |
| `examples/12-multi-user-ar` | archive/watch | AR proof belongs in Twin Earth or hardware receipts, not TS-only package demo. |
| `examples/13-universal-dashboard` | archive | Dashboard proof should become an enterprise gate if still wanted. |
| `examples/compilation-demo` | archive/watch | Compilation proof belongs in HoloScript package gates and receipts. |
| `examples/hololand-landing` | archive | Marketing/landing surface is not the builder-proof product. |
| `examples/hololand-website` | archive | Website surface is not the active proof kernel unless tied to deployment. |
| `examples/hybrid-dashboard` | archive | Dashboard should be reborn as business enterprise gate if needed. |
| `examples/oasis` | archive/watch | Heavy TS/Tauri surface. Keep only if there is an active deployment or a native HoloScript migration plan. |

### D. TS-Only Package Garden

These package buckets should stop receiving feature work until they either:

1. prove a current runtime bridge role,
2. become an enterprise package gate,
3. upstream a missing HoloScript primitive,
4. or are archived to Jetson.

| Candidate | Proposed action | Story |
| --- | --- | --- |
| `packages/adapters/**` | archive or convert to generated target fixtures | The adapter bucket is TS-only in the scan. R3F/Three/etc. should be compile targets or bridge fixtures, not hand-authored product truth. |
| `packages/ar/**` | archive/watch by package | The AR bucket is TS-only in the scan. Keep only the pieces that directly support Twin Earth, hardware receipts, or active deployments. |
| `packages/shared/ui` | archive/watch | TS-only UI package. HoloLand should not be a human-facing UI kit unless generated/consumed by proof flows. |
| `packages/shared/inference` | archive/watch | TS-only inference package plus nested lockfile. Keep only with an active enterprise gate or runtime receipt. |
| `packages/spatial-builder` | archive/watch | TS-only spatial builder package. If the builder matters, reboot it as HoloScript source plus receipt. |
| `packages/creation-tools` | archive/watch | TS-only creation tool package. Creation tools belong behind source-first HoloScript authoring contracts. |
| `packages/base-token-viz` | archive/watch | TS-only visualization package. Keep only if converted into an enterprise or protocol benchmark gate. |
| `packages/platform/services` | archive/watch | Previously identified as scaffold/service drift. Keep only if active deployment evidence exists. |

`packages/platform/renderer` is not in this bucket even though it is large TS
debt, because it may still be the only bridge to visible proof. Quarantine it
first; archive later only after a replacement render/run proof exists.

## Intake Candidates - Do Not Archive Blindly

The untracked `experiments/**` files are mostly HoloScript-family source and
should be read before any archive action.

| Candidate | Proposed action | Why |
| --- | --- | --- |
| `experiments/emergence-sim/c-struct-agent.hsplus` | promote/watch | HoloScript-plus paper/emergence source. Likely belongs under `source/domains/emergence` or research fixtures if still relevant. |
| `experiments/emergence-sim/village.holo` | promote/watch | HoloScript world source. Candidate for Frontier/emergence benchmark if it validates. |
| `experiments/holoshell-human-os-frontier/*` | triage by trio | These are room/policy/pipeline HoloScript-family trios for HoloShell Human OS tasks. They look closer to enterprise gates than trash. Promote useful trios into `apps/holoshell/source/**` or an enterprise gate; archive duplicates to Jetson with source receipts. |

Current untracked trios needing explicit intake include:

- asset folder playable shard,
- asset shard 2,
- browser account export,
- cloud drive permission cleanup,
- downloads import shelf,
- family photo backup custody,
- local codebase trust gate,
- partial download recovery.

Tracked experiment trios also exist for account custody, install/update,
slow-computer clinic, and target-device proof. Reconcile tracked versus
untracked status before moving anything.

## Start Fresh Here

The reboot should start with five narrow, source-first lanes:

1. Agent Builder Proof 0 - make the existing proof runner validate without
   triggering interactive package installs.
2. Enterprise Package Gate 1 - customer-success room gate as the first business
   package assembly. It should combine upstream HoloScript packages and emit a
   receipt.
3. Frontier Shard 0 - native HoloScript source to world/runtime receipt.
4. Twin Earth Micro-Slice - native HoloScript source to earth-layer player-loop
   receipt.
5. NPC Steward / Care Ethics Gate - native HoloScript source to behavior,
   reputation, and safety receipt.

Do not start fresh by making another frontend shell. Start with the receipts and
let UI/runtime bridges attach only where the proof loop requires them.

## First Work Orders

1. Fix the HoloScript package-consumption boundary so HoloLand proof runners can
   validate source without running a non-interactive `pnpm install`.
2. Add a machine-readable package status table with statuses:
   `active-proof`, `bridge-debt`, `enterprise-gate`, `intake`,
   `jetson-archive-candidate`, `local-debris`, and `watch`.
3. Triage every untracked `experiments/holoshell-human-os-frontier` trio into
   promote, archive, or duplicate.
4. Convert one TS-only business example into an enterprise package gate, then
   archive the old example path once the gate receipt exists.
5. Move root-level historical status docs behind a docs router or archive plan
   so agents hit `NORTH_STAR.md`, `HOLOLAND_PURPOSE.md`,
   `HOLOLAND_HOUSEKEEPING.md`, and builder-proof specs first.

## Approval Boundary

Approved now: classification, report writing, and targeted validation.

Requires explicit approval before execution:

- moving anything to Jetson,
- deleting repo paths,
- removing tracked package-lock files,
- archiving `.proprietary/**`,
- retiring any path with active deployment evidence,
- retiring any path needed by the current render/run proof.

