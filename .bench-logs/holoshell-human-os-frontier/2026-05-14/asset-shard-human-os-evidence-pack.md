# HoloShell Human OS Frontier - Asset Shard Evidence Pack

Date: 2026-05-14
Workflow explored: "Turn a local folder of assets into a playable HoloLand shard."

## Human Job

A non-technical creator points HoloShell at a local asset folder and asks for a playable HoloLand shard. The user should see what files were found, which were blocked, what `.holo` preview was generated, whether source assets were mutated, what import would change, what approval is required, how to replay the staging run, and how to roll back generated runtime files.

## Hidden Platform Machinery

- OS/files: Windows paths, `.tmp/holoshell/sample-shard-assets`, private absolute-path receipts, generated `.holo` preview, ignored runtime import directory.
- Apps/commands: Node, pnpm, HoloScript CLI, Next build, HoloShell bridge scripts, shell-object graph generator.
- Accounts/agents: `codex-hardware` heartbeat, HoloMesh board, active local agent lanes, stale shell/process custody.
- Permissions: folder scan is `read_only`; preview/receipts are tmp writes; import/publish is `guarded_execute`; overwrite/delete remains `break_glass`.
- Runtime state: HoloLand and HoloScript worktrees were dirty before this run; HoloLand full build failed under custody.

## Docs And Repos Read

- `C:/Users/josep/.ai-ecosystem/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/Hololand/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/AGENT_HOLOSCRIPT_TOOLING.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOSCRIPT_SOURCE_CONTRACT.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOLAND_PURPOSE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/PHASE_1_ROADMAP.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/SHELL_OBJECT_SCHEMA.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/source/holoshell-asset-shard-workflow.hsplus`
- `C:/Users/josep/Documents/GitHub/HoloScript/AGENTS.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/docs/architecture/2026-05-14_trust-primitives-decision-record.md` via local search results

`experiments/holoshell-human-os-frontier/` was not present in the HoloLand repo at run start. Prior artifact compared: `.bench-logs/holoshell-human-os-frontier/2026-05-14/flagship-readiness-evidence-pack.md`.

## Commands And Tooling

- Heartbeat: `node C:/Users/josep/.ai-ecosystem/hooks/team-connect.mjs --once --name=codex --ide=hardware`
- Hardware baseline: Node `v24.15.0`, pnpm `10.28.2`, npm `11.6.2`; GPU inventory found NVIDIA RTX 3060 Laptop GPU plus Intel UHD; Node WASM SIMD byte-probe returned `false`.
- HoloScript MCP graph: `holo_graph_status` reported stale `/app` cache; `holo_absorb_repo` could not access Windows local roots, so local CLI/search were used.
- Local HoloScript CLI: `pnpm --dir C:/Users/josep/Documents/GitHub/HoloScript exec holoscript parse ...`
- Asset workflow: `node scripts/holoshell-asset-shard-workflow.mjs --json`
- Import approval: `node scripts/holoshell-shard-import-approval.mjs --json`
- Import self-test: `node scripts/holoshell-shard-import-approval.mjs --self-test`
- Shell graph: `node scripts/holoshell-shell-objects.mjs --json`
- Build custody: `node scripts/holoshell-build-custody.mjs --json`
- Build smoke: `node scripts/holoshell-run.mjs --run-class build --expected-minutes 10 --allow-warn --reason "holoshell human os frontier asset shard smoke" -- pnpm build`

## Runtime Evidence

- Staging receipt: `.tmp/holoshell/shard-workflow-latest.json`
- Preview source: `.tmp/holoshell/shard-preview.holo`
- Private receipt: `.tmp/holoshell/shard-receipts/shard.sample-shard-assets.e0952733b5-private.json`
- Import approval: `.tmp/holoshell/shard-import-approval-latest.json`
- Import placeholder: `.tmp/holoshell/shard-import-latest.json`
- Shell object graph: `.tmp/holoshell/shell-objects.json`
- Failed build receipt: `.tmp/holoshell/run-receipts/run-mp5t7hm8-63ef7cc5177e8999.json`

Observed staged shard:

- 5 assets scanned: 1 model, 1 image, 1 audio, 1 source, 1 unknown README.
- 0 blocked assets.
- Public workflow did not expose absolute source paths.
- Source assets were not mutated.
- Import approval was created with nonce, 10-minute expiry, command preview, and `sourceAssetsMutated: false`.
- Actual import was not executed for the live workflow because it is `guarded_execute`.
- Fixture import self-test completed and wrote runtime-local manifest/source/receipt under `.tmp`.

Validation:

- `holoshell-asset-shard-workflow.hsplus` validated successfully.
- Generated `.tmp/holoshell/shard-preview.holo` validated successfully.

Build evidence:

- Full HoloLand build failed under HoloShell custody. First failure was `examples/hololand-website` with Next `PageNotFoundError: Cannot find module for page: /_document`.
- After deleting only generated `examples/hololand-website/.next`, focused `pnpm --filter hololand-website build` did not return within 3 minutes and left child `next build` processes, which were stopped by exact PID.
- Build custody then showed other active build trees from the wider workspace, but shell-object summary still reported `processObjectCount: 0`.

## `.holo` Concept

Room: `Asset Folder to Playable Shard`.

Objects:

- `SourceFolderGate`: shows folder basename, privacy class, hash, and blocked-file count.
- `AssetObjectCloud`: each file becomes an inspectable proxy with kind, hash state, blocked state, and relative path only.
- `PreviewShardRoot`: visible playable-shard placeholder generated as `.holo`.
- `ImportApprovalGate`: guarded consent object with nonce, expiry, risk, and rollback summary.
- `ReceiptStack`: public workflow receipt, private path receipt, rollback receipt, import placeholder, and validation result.
- `FailureLessonPanel`: build and render blockers become replayable lessons with exact receipts.

## `.hsplus` Concept

State machine:

`choose_folder -> scan_assets -> classify_assets -> block_secrets -> generate_preview -> validate_preview -> write_receipts -> stage_import_approval -> wait_for_user -> import_runtime_copy -> visual_witness -> publish_or_retry`

Policies:

- Scanning/hashing is `read_only` and emits receipts.
- Preview source and receipts are tmp writes.
- Importing into a runtime HoloLand shard is `guarded_execute`.
- Publishing, overwrite, delete, credential-bearing assets, or real user file mutation are `break_glass`.
- Absolute paths stay in private local receipts; browser/world projection gets basename, relative paths, counts, hashes, and status only.

## `.hs` Concept

Data flow:

- `collectFolder()` resolves the local folder and writes a private path receipt.
- `classifyFiles()` maps extensions to model/image/audio/media/source/unknown and blocks credential-like files.
- `generatePreviewHolo()` writes a preview shard graph.
- `validatePreview()` calls HoloScript parse/validate.
- `stageApproval()` hashes the workflow and mints a nonce-bound command.
- `importShard()` writes runtime-local manifest/source/receipt after approval only.
- `joinReceipts()` produces one timeline node for HoloShell and HoloLand.

## Multi-Agent Hardware Orchestration

- Codex hardware lane: local file scan, process custody, HoloScript validation, build smoke, exact-PID cleanup of its own timed-out build children.
- Brittney/HoloShell lane: turns the workflow into plain-language object controls and approval gates.
- HoloScript source lane: owns reusable receipt schema, validators, permission envelopes, and local-first ledger.
- HoloLand product lane: owns the creator-facing room, preview shard, import UX, and world embodiment.
- Gemini/browser lane: should provide visual witness for the generated preview and imported shard.
- HoloMesh lane: owns filed tasks and team-visible receipts.

## HoloLand Adoption Path

Adopt as a creator-surface loop: "Make Playable Shard" bubble in HoloShell. In HoloLand, the output becomes a shard preview room with asset proxies, import approval gate, receipt stack, and Brittney explanation. The imported runtime shard should later be a creator kiosk path in Frontier Shard 0.

## HoloScript Upstream Path

- Reusable `TrustReceipt` / `AssetIntakeReceipt` / `CommandReceipt` shapes should converge with the 2026-05-14 trust primitives decision record.
- Add a validator for staged asset workflows: no absolute paths in public graph, blocked-file gate, preview validation, approval nonce, rollback path, source mutation flag.
- Add a local-first ledger append/query primitive for HoloShell receipts.
- Add a local graph-unavailable receipt for hosted MCP tools that cannot access local hardware paths.

## Scorecard

| Axis | Score | Notes |
| --- | ---: | --- |
| Human determinism | 8 | Clear states through approval; live import intentionally not executed. |
| Non-developer clarity | 8 | Shell object graph has an Asset Shard bubble and approval object. |
| Hardware reality | 8 | Local file scan, validation, build, process cleanup, and custody checks ran on Windows. |
| AI containment | 9 | Import is staged behind nonce approval; source assets read-only. |
| HoloScript source nativeness | 8 | `.hsplus` contract and generated `.holo` validate. |
| Multi-agent value | 8 | Good split across hardware, product, source, browser, and mesh lanes. |
| Reversibility/replay | 7 | Rollback paths exist for tmp outputs; no live import replay witness yet. |
| HoloLand embodiment | 8 | Shell graph surfaces workflow and approval as first-screen objects. |
| Taskability | 9 | Build blocker and process-object graph gap are actionable. |

## Gaps Found

1. Full local `pnpm build` is not currently a clean gate. `examples/hololand-website` fails with missing `/_document` on the full build, and the focused build hung after cache cleanup.
2. HoloShell build custody can see active build trees, but the shell object graph summary can still report `processObjectCount: 0`, so the human-visible room can lose hardware-custody state.
3. Hosted HoloScript MCP graph tools cannot inspect Windows local roots from the remote `/app` runtime; HoloShell needs a first-class local graph-unavailable receipt. A board task for this already exists.
4. The source-native asset manifest and preview/import validation gaps already have fresh board tasks; this run did not duplicate them.

## Tasks Filed

Tasks were filed from `.bench-logs/holoshell-human-os-frontier/2026-05-14/holoshell-gap-tasks.json` after checking the board for existing HoloShell tasks.

- `task_1778783102322_ggj3`: `[holoshell][build] Fix HoloLand website build blocker`
- `task_1778783102323_vks9`: `[holoshell][custody] Render active build trees as shell objects`

## Next Workflow

Push the same asset-shard loop from sample assets to a real user folder with a browser/visual witness: stage folder, validate preview, show HoloShell room screenshot, then require explicit approval before runtime import.
