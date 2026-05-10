# HoloLand Codebase Should-Exist Audit

**Date:** 2026-05-07
**Scope:** HoloLand repo inventory, HoloScript consumption gaps, generated artifacts, workspace shape, agent docs, and strategic missing artifacts
**Strategic correction:** HoloLand is not merely legacy/sunset. HoloLand is the platform/product surface that fully utilizes HoloScript. If HoloLand has a product gap, the canonical behavior should be built in HoloScript first, then consumed in HoloLand.

## Audit Rubric

Something **should exist** in this repo when it is one of:

- A HoloLand product/platform experience that consumes HoloScript.
- A HoloScript-authored world, system, schema, trait, validation receipt, or runtime primitive used by HoloLand.
- A bridge/runtime/hardware integration layer with a clear reason to be TypeScript, Rust, native, or platform-specific code.
- A Brittney/agent surface that is part of the HoloLand lived product experience.
- Documentation that helps agents and humans keep HoloLand and HoloScript aligned.
- A reproducible evidence artifact that cannot be regenerated cheaply or safely.

Something **should not exist** when it is one of:

- Generated build cache, local dependency output, local virtualenv, or packaged release artifact tracked in git.
- Product behavior implemented only in TypeScript without `.holo`, `.hs`, or `.hsplus` source.
- Empty scaffolding that claims a platform capability but has no source, tests, or HoloScript contract.
- Stale workspace/config state that hides packages from normal build/test commands.
- Duplicated backend/platform trees outside the workspace shape.
- Strategy docs that conflict with the HoloLand/HoloScript source boundary.

## Executive Tally

| Area | Count / finding | Classification |
|---|---:|---|
| Tracked files | 5,724 | Too high because generated Rust target output is tracked. |
| On-disk source files excluding common generated dirs | 3,270 | Reasonable working source size, but still docs/package sprawl. |
| Root markdown docs | 41 | Too many first-class root docs; needs tiering. |
| Package manifests | 83 | Monorepo is broad; workspace coverage is inconsistent. |
| Tracked `examples/oasis/src-tauri/target` files | 2,675 files / 701.21 MB | Should not be tracked. |
| On-disk `examples/oasis/src-tauri/target` | 3,320 files / 959.29 MB | Should be ignored/local only. |
| Tracked `examples/compiled-outputs` files | 286 | Should be regenerated or explicitly blessed as snapshots. |
| Tracked package lock / tgz artifacts | 4 files | Should not be tracked in pnpm monorepo unless justified. |
| Deleted tracked files in dirty worktree | 45 | Needs intentional restore-or-remove decision. |
| `.gitignore` NUL bytes | 203 | Corrupted; should be repaired. |
| TS-only feature-domain package candidates | 39 | Need HoloScript source or bridge rationale. |
| HoloScript-backed package/example candidates | 15 | Should exist; these are migration/product proof assets. |
| Empty/scaffold package candidates | 10 | Archive, fill, or remove from workspace. |
| TODO/unsafe-code-marker hits excluding maps/generated dirs | 1,351 | Needs triage; many are tests but still noisy. |

## Source Shape

| Domain | Total files | TS | TSX | HoloScript (`.holo/.hs/.hsplus`) | Notes |
|---|---:|---:|---:|---:|---|
| `packages/platform` | 1,181 | 648 | 258 | 115 | Platform runtime has HoloScript backing, but TS dominates. |
| `packages/ar` | 212 | 145 | 25 | 0 | Likely bridge-heavy, but needs explicit bridge classification. |
| `packages/adapters` | 132 | 84 | 29 | 0 | Should stay bridge code or gain HoloScript contract tests/examples. |
| `examples` | 836 | 178 | 107 | 140 | Good evidence base, but several examples are TS-only or empty. |

## HoloLand Central

`examples/hololand-central/src` is the strongest HoloLand platform proof, but still has a split source-of-truth problem.

| Extension | Count |
|---|---:|
| `.ts` | 57 |
| `.tsx` | 54 |
| `.hsplus` | 27 |
| `.holo` | 23 |
| `.json` | 10 |
| `.css` | 3 |

High-density subdirectories:

| Subdir | Count | Audit note |
|---|---:|---|
| `zones` | 36 | Should exist; strongest HoloScript-first surface. |
| `components` | 33 | Needs source-boundary review; many UI/product behaviors remain React. |
| `worlds` | 20 | Needs consolidation with `zones`; avoid duplicate world definitions. |
| `server` | 13 | Keep if it backs product state; add HoloScript schemas/receipts for player/world semantics. |
| `pages`, `services` | 10 each | Bridge/runtime likely valid; feature behavior needs HoloScript source. |

Verdict: **keep and harden**. Central is not junk; it is the platform slice that should become the living reference for how HoloLand consumes HoloScript.

## Should Exist

These are the assets that should be protected and strengthened.

| Asset | Why it should exist | Required next condition |
|---|---|---|
| `NORTH_STAR.md` | Agent decision spine for HoloLand/HoloScript boundary. | Keep corrected platform framing. |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md` | Agent entrypoints for local and IDE agents. | Keep them consistent and short; no stale sunset language. |
| `docs/AGENT_HOLOSCRIPT_TOOLING.md` | Agent workflow for using HoloScript tools before HoloLand changes. | Add concrete MCP receipts when tools are exposed. |
| `docs/HOLOSCRIPT_SOURCE_CONTRACT.md` | Prevents TypeScript-only product truth. | Enforce in CI and PR labels. |
| `.github/workflows/holoscript-source-contract.yml` and `scripts/check-holoscript-source-contract.mjs` | Automated guard for the source contract. | Validate after workspace cleanup. |
| `docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md` | Product target: programmable living frontier MMO. | Treat as product direction, not decorative vision doc. |
| `examples/hololand-central` | Main product proof surface. | Reduce duplicate TS world/component behavior by moving rules into HoloScript. |
| `examples/hololand-legends` | Game-loop reference with HoloScript backing. | Decide whether it becomes a reusable shard template. |
| `packages/platform/library` | 57 HoloScript files; core semantic library proof. | Promote reusable primitives upstream to HoloScript where appropriate. |
| `packages/platform/ui`, `spatial`, `core`, `audio`, `world`, `quality-profiles` | HoloScript-backed platform modules. | Keep TS as runtime bridge, not source of product semantics. |
| `packages/brittney/*` | Brittney is a product-critical HoloLand interface. | Keep until HoloScript/Studio has full replacement or direct consumption path. |
| `packages/ar/*`, `packages/adapters/*` | Valid bridge/hardware/adaptation layers. | Add bridge rationale and HoloScript contract examples, not necessarily `.holo` in every package. |
| `docs/strategy/HOLOLAND_LIVING_COMPETITOR_GAP_MATRIX.md` | Needed living gap matrix across verticals/competitors/AI/hardware. | Update after each strategic/product audit. |

## Should Exist But Is Missing Or Underspecified

These gaps should generally be built in HoloScript first, then consumed by HoloLand.

| Missing/weak area | Evidence | Build in HoloScript first |
|---|---|---|
| Living competitor gap matrix | No dedicated living matrix found; only scattered competitive mentions. | Create/update vertical x competitor x HoloScript gap x HoloLand gap matrix. |
| Frontier Shard 0 implementation manifest | North-star spec exists; no single executable acceptance matrix. | `Shard`, `Zone`, `Encounter`, `Item`, `Skill`, `Receipt` schemas and validation. |
| Validation receipt format | Product spec requires receipts; implementation is not first-class. | `ValidationReceipt`, `ReplayInput`, `ReplayOutcome`, `HardwareReceipt`. |
| Agent steward protocol | Product spec calls for world stewards; repo has Brittney tools but no shard-specific steward contract. | `AgentAction`, `StewardProposal`, `RollbackPlan`, `WorldIssue`. |
| Player profile / discovery ledger | Central has TS server/auth/quest files; source contract should be semantic. | `PlayerProfile`, `Discovery`, `Title`, `InventoryItem`, `WorldMemory`. |
| Creator template compiler | Scattered creator tooling exists, but HoloScript-first template lifecycle is not crisp. | `CreatorTemplate`, `PlayableChallenge`, `PublishReview`. |
| AI development vertical | User explicitly asked to track AI development; no living matrix row set. | Define AI-dev capabilities HoloLand consumes: agents, codegen, validation, evaluation, memory. |
| Hardware development vertical | User explicitly asked to track hardware development; no living matrix row set. | Define hardware profile manifests, XR validation, WebGPU/WASM receipts, device capability gaps. |
| AR/adapters HoloScript contract examples | `packages/ar` and `packages/adapters` have 0 HoloScript files. | Add examples/fixtures that prove how HoloScript source compiles/bridges to each target. |
| Workspace ownership matrix | 83 package manifests but no clear package ownership/status table. | Add package status: product, bridge, upstream-candidate, archive, generated. |

## TS-Only Feature-Domain Candidates

These are not automatically wrong. Many are valid bridges. But each needs either HoloScript source, an explicit `ts-bridge-only` rationale, or archival.

| Package/example | Src files | Tests | HoloScript | Classification |
|---|---:|---:|---:|---|
| `examples/oasis` | 51 | 1 | 0 | Product slice is TS-only; needs HoloScript source or archive as native demo. |
| `packages/adapters/three` | 49 | 11 | 0 | Likely bridge; add bridge contract examples. |
| `packages/ar/volumetric-bridge` | 42 | 9 | 0 | Likely hardware/runtime bridge; document boundary. |
| `packages/ar/avatar-studio` | 20 | 5 | 0 | Needs bridge rationale or HoloScript-backed avatar schema. |
| `packages/ar/mobile-companion` | 18 | 3 | 0 | Bridge likely valid; add hardware receipt expectations. |
| `packages/adapters/react-three` | 18 | 0 | 0 | Bridge likely valid; tests missing. |
| `packages/adapters/vrchat` | 18 | 1 | 0 | Bridge likely valid; add HoloScript source fixtures. |
| `packages/ar/model-viewer` | 14 | 7 | 0 | Bridge likely valid. |
| `packages/ar/tracking` | 13 | 2 | 0 | Hardware bridge; add capability receipts. |
| `packages/ar/akida-bridge` | 12 | 5 | 0 | Hardware/AI bridge; add source-contract rationale. |
| `packages/platform/mobile` | 11 | 4 | 0 | Platform bridge; add HoloScript use case fixtures. |
| `examples/08-progressive-vr` | 10 | 0 | 0 | Example needs HoloScript source. |
| `packages/ar/anchors` | 10 | 1 | 0 | AR bridge; add semantic anchor schema in HoloScript. |
| `examples/hololand-website` | 9 | 0 | 0 | Marketing/app surface; classify as docs/site or add product source. |
| `packages/platform/accessibility` | 9 | 0 | 0 | Accessibility rules should have HoloScript policy/source if product behavior. |
| `packages/platform/navigation` | 7 | 3 | 0 | Traversal/navigation rules likely need HoloScript definitions. |
| `packages/platform/holofilter` | 7 | 0 | 0 | Product/security behavior needs source contract. |
| `packages/platform/gestures` | 6 | 0 | 0 | Hardware input bridge; add receipts/tests. |
| `packages/platform/streaming` | 6 | 0 | 0 | Runtime bridge; document boundary. |
| `packages/platform/voice` | 3 | 0 | 0 | Agent/voice behavior should connect to HoloScript or Brittney contract. |

## HoloScript-Backed Candidates To Keep

| Package/example | HoloScript files | Src files | Tests | Classification |
|---|---:|---:|---:|---|
| `examples/hololand-central` | 107 | 111 | 4 | Keep; main platform proof. |
| `packages/platform/library` | 57 | 0 | 0 | Keep; semantic library. |
| `packages/platform/ui` | 18 | 35 | 0 | Keep; reduce TS product logic. |
| `packages/platform/spatial` | 10 | 10 | 3 | Keep; strong bridge/source balance. |
| `packages/platform/renderer` | 9 | 447 | 134 | Keep as runtime bridge; enormous blast radius. |
| `packages/platform/core` | 7 | 25 | 3 | Keep; sync with HoloScript upstream. |
| `packages/components` | 7 | 0 | 0 | Keep if components are HoloScript source assets. |
| `packages/platform/audio` | 5 | 10 | 0 | Keep; add tests. |
| `examples/hololand-legends` | 4 | 15 | 0 | Keep as game-loop proof; add tests. |
| `packages/platform/quality-profiles` | 3 | 5 | 2 | Keep; tie to hardware receipts. |
| `packages/platform/world` | 1 | 20 | 1 | Keep; needs more HoloScript source. |

## Should Not Exist As-Is

| Item | Evidence | Action |
|---|---|---|
| Tracked Tauri build output | `git ls-files examples/oasis/src-tauri/target` -> 2,675 files / 701.21 MB. | Remove from git index and add `target/` ignore. |
| Corrupted `.gitignore` | 1,434 bytes with 203 NUL bytes; visible UTF-16/NUL fragments. | Rewrite clean ASCII `.gitignore`; include `target/`, `.venv/`, `.next/`, package artifacts. |
| `hololand-world-1.0.0.tgz` | Tracked root release archive. | Move to release artifact storage or regenerate on demand. |
| `packages/platform/logger/package-lock.json` | npm lock inside pnpm monorepo. | Remove or justify isolated npm package. |
| `packages/platform/voice/package-lock.json` | npm lock inside pnpm monorepo. | Remove or justify isolated npm package. |
| `packages/shared/inference/package-lock.json` | npm lock inside pnpm monorepo. | Remove or justify isolated npm package. |
| `examples/compiled-outputs/**` | 286 tracked generated files. | Keep only if treated as golden compiler snapshots with source and verification. |
| Local `.venv` | 28,144 files / 1.16 GB on disk, not tracked. | Ignore and remove locally when not needed. |
| Local `.next` caches | 223.52 MB + 40.29 MB on disk. | Ignore and clean locally. |
| Local `.proprietary` tree | 10,807 files / 1.85 GB on disk, ignored and untracked. | Keep outside repo or document private overlay contract. |
| Root `platform/backend` tree | 79 ignored/untracked files; duplicates package/workspace shape. | Move into workspace, external service repo, or archive. |
| Empty example scaffolds | 10 emptyish candidates. | Fill with HoloScript source or archive. |

## Dirty Worktree Decisions

The audit found 45 deleted tracked files in the current dirty worktree. These should not stay ambiguous.

| Deleted group | Count | Decision needed |
|---|---:|---|
| `apps/brittney-desktop` | 18 | Restore if still a shipped surface; otherwise replace with migration note. |
| `apps/brittney-mobile` | 9 | Restore if mobile companion is still product-critical; otherwise replace with HoloScript/AR mobile path. |
| `packages/platform/auth` | 13 | Dangerous deletion because identity/profile is product-critical. Restore or replace with HoloScript-backed identity contract. |
| `packages/platform/dashboard` | 5 | Restore if deployment dashboard still used; otherwise archive with replacement path. |

## Workspace Problems

| Problem | Evidence | Action |
|---|---|---|
| Root `package.json` workspaces are stale | Root says only `["packages/*"]`; `pnpm-workspace.yaml` is the real workspace map. | Either remove root workspaces or mirror pnpm workspace intent. |
| 11 package manifests are not covered by pnpm workspace | `.proprietary/*`, `packages/creation-tools`, `packages/spatial-builder`, nested demos, `platform/backend`. | Add to workspace intentionally, move out, or archive. |
| Generated target output is tracked despite build ignores | `.gitignore` ignores `dist/` but not `target/`; tracked files remain tracked even after ignore. | Remove from index and enforce with pre-commit/check. |
| Root docs are overloaded | 41 root markdown files. | Keep root small; move status/old reports to `docs/archive` or tiered docs. |

## Empty Or Scaffold Candidates

These should either become real HoloScript-backed examples/packages or be archived.

| Path | Files | Note |
|---|---:|---|
| `examples/05-desktop-app` | 4 | No source/HoloScript. |
| `examples/06-mobile-app` | 4 | No source/HoloScript. |
| `examples/07-hybrid-world` | 4 | No source/HoloScript. |
| `examples/09-multiplayer-lobby` | 4 | No source/HoloScript. |
| `examples/10-collaborative-building` | 4 | No source/HoloScript. |
| `examples/11-social-hub` | 4 | No source/HoloScript. |
| `examples/hololand-landing` | 17 | Site/app shape but no `src` or HoloScript in counted source. |
| `packages/platform/demos/geospatial-anchoring` | 6 | Demo shell; no HoloScript. |
| `packages/platform/mobile/examples/geospatial-demo` | 6 | Demo shell; no HoloScript. |
| `packages/platform/services` | 11 | Tests/docs but no product source counted. |

## Strategic Missing Matrix

The repo did not have a living competitor/gap matrix. This should now be tracked in:

- `docs/strategy/HOLOLAND_LIVING_COMPETITOR_GAP_MATRIX.md`

That matrix must cover at least:

- Social VR / UGC worlds
- MMO/frontier game loops
- Creator tooling
- AI development
- Hardware development
- Agent stewardship
- HoloScript language/platform
- XR/headset/mobile hardware validation
- Digital twins, simulation, IoT, robotics
- Commerce/economy
- Education/training/enterprise

The matrix should be updated whenever a product audit, competitor review, hardware validation, or HoloScript source-gap audit runs.

## Priority Cleanup Order

1. Repair `.gitignore` and remove tracked `examples/oasis/src-tauri/target` output from git index.
2. Decide restore-or-remove for the 45 deleted tracked files.
3. Fix workspace shape: root `package.json.workspaces`, uncovered packages, nested demos, and ignored `platform/backend`.
4. Classify the 39 TS-only candidates as `bridge`, `needs HoloScript source`, or `archive`.
5. Turn HoloLand Central into the reference consumer: product rules in HoloScript, TS as runtime bridge.
6. Promote missing Frontier Shard primitives into HoloScript packages.
7. Add validation receipts for hardware, replay, agent action, and creator publishing.
8. Fold root docs into a smaller tiered documentation set.

## Validation Snapshot

| Check | Result | Notes |
|---|---|---|
| `node --version` | `v24.15.0` | Satisfies local Node >= 22 expectation. |
| `pnpm --version` | `10.28.2` | Satisfies local pnpm expectation. |
| WASM SIMD probe | Pass | `WebAssembly.validate` returned `true` for a valid SIMD module. |
| Headless Chrome WebGPU probe | Inconclusive / unavailable | Playwright launched HeadlessChrome 147, but `navigator.gpu` was absent in headless mode. Needs visible browser/headset validation before claiming WebGPU support. |
| `git diff --check` on touched tracked docs | Pass | Only CRLF warnings on existing tracked files. |
| Stale sunset/legacy language search in active agent docs | Pass | No matches for the removed "SUNSET"/legacy posture in checked active entrypoints. |
| `pnpm build` | Fail | First failure: `packages/adapters/playcanvas/src/World.ts` DTS errors against `ParseResult` and `HoloScriptPlusRuntimeImpl`; Babylon reports the same runtime API mismatch. |
| `pnpm run check:holoscript-source-contract` without env | Fail | Script requires `BASE_REF` and `HEAD_REF`. |
| `BASE_REF=main; HEAD_REF=HEAD; pnpm run check:holoscript-source-contract` | Pass but not meaningful for working tree | It reported "No changed files detected" because it compares refs, not dirty working-tree docs/files. |

## Evidence Commands

Key commands used during this audit:

```powershell
git status --short
git ls-files
git ls-files examples/oasis/src-tauri/target
rg --files
rg --files examples/hololand-central/src
rg -n "TODO|FIXME|HACK|XXX|@ts-ignore|@ts-expect-error|as any|test\.skip|describe\.skip|it\.skip" packages examples apps scripts -g "!node_modules" -g "!**/target/**" -g "!**/.next/**" -g "!**/dist/**" -g "!**/*.map"
node --version
pnpm --version
```

HoloScript CLI/Absorb note: `pnpm exec holoscript graph-status` from the HoloScript repo returned the local Brittney interactive prompt rather than a graph-status report in this shell. Treat the CLI route as unresolved until the HoloScript MCP/Absorb surface is available in the agent environment.
