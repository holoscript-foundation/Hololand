# HoloShell Human OS Frontier - Account Task Custody Evidence Pack

Date: 2026-05-16

## Workflow Explored

Human job: "Use my email, calendar, documents, and local files to prepare a follow-up, but do not send, save, upload, share, or mutate any account until I approve the exact draft."

This extends the prior browser/account-boundary run into the next ordinary computing pain point: a single human request crosses local files, browser profiles, Microsoft/Google accounts, mail, calendar, documents, attachments, time zones, OAuth scopes, screenshots, AI drafts, and irreversible sends.

## Candidate Comparison

| Candidate | Human determinism | Non-dev clarity | Hardware reality | AI containment | Source native | Multi-agent | Replay | HoloLand embodiment | Taskability | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Flagship readiness rerun | 8 | 7 | 9 | 8 | 8 | 8 | 6 | 7 | 9 | 70 |
| Browser/account boundary | 9 | 9 | 9 | 10 | 8 | 9 | 8 | 9 | 10 | 81 |
| Account task custody | 9 | 9 | 9 | 10 | 8 | 10 | 8 | 9 | 9 | 81 |

Selected: account task custody. It is not a new app feature; it is the missing human operating layer for the account workflows normal users actually ask AI to do.

## Hidden Platform Machinery

- OS/runtime: Windows visible windows, Start Menu/app registry, Office apps, browser executables, local process custody, local file paths and hashes.
- Files/state: selected local notes, draft outputs, attachment manifests, `.tmp/holoshell/*` receipts, `.bench-logs/*` evidence, source-validation receipts.
- Apps/services: Chrome, Brave, Edge, Gmail/Outlook/Teams/Office/Google Docs/Drive/Calendar style surfaces, HoloShell control daemon, HoloMesh board.
- Accounts/permissions: browser profile, provider account, OAuth scopes, cookies/session policy, screenshot locality, draft-only versus send/save/share authority.
- Commands/agents: Codex hardware stages local checks; Brittney narrates and refuses unsafe mutation; connector/browser lanes witness account boundaries; document lane prepares patches and attachment manifests.
- Devices/hardware: local GPU/browser proof, local file access, visible app windows, and hardware action receipts.
- Runtime state this run: hardware audit pass, visual witness pass, operator brief `legacy_absorption_ready`, readiness fail, destructive actions blocked, 187 launchable programs, 12 visible windows, 182 captured controls.

## `.holo` Concept

Prototype: `experiments/holoshell-human-os-frontier/account-task-custody-room.holo`

Visible room:

- Account Boundary Gate: provider, redacted account, scopes, browser/session policy, screenshot policy, and credential-adjacent warning.
- Local File Shelf: source files, hashes, privacy class, and source mutation state.
- Draft Bench: email draft, calendar proposal, document patch, and attachment manifest as local proposal objects.
- Approval Lock Row: send, save, share, upload, reply, and calendar mutation as break-glass locks.
- Receipt Timeline: classified -> snapshotted -> drafted -> reviewed -> approved -> executed -> witnessed -> rollback-limited.
- Rollback Limit token: explicitly shows that sent email may not be truly undoable.

## `.hsplus` Concept

Prototype: `experiments/holoshell-human-os-frontier/account-task-custody-policy.hsplus`

State machine:

`idle -> classified -> boundary_checked -> sources_snapshotted -> drafted -> reviewed -> approved -> executed -> witnessed -> filed|blocked`

Policy:

- Silent read/draft: classify intent, classify URL, read selected file metadata, snapshot selected files, parse selected documents, draft email/calendar/document proposals locally.
- Guarded local execute: open public URL, open local output, write local preview, export local attachment manifest, file HoloMesh task.
- Break-glass account mutation: send/reply email, create/update calendar event, save shared document, upload cloud file, share link, download private attachment, use credential-bearing browser profile, overwrite/delete source file.

Agent roles:

- Codex hardware: local snapshots, program registry, window inventory, receipts, hardware witness.
- Browser account agent: profile boundary, cookie policy, credential screenshot policy, public URL witness.
- Connector agent: Gmail/Outlook/Calendar/Drive scopes, draft-only adapters, provider error receipts.
- Document custody agent: document patch, attachment manifest, local preview, source hash diff.
- HoloLand product agent: room embodiment, Brittney explanation, quest/tool surface.

## `.hs` Concept

Prototype: `experiments/holoshell-human-os-frontier/account-task-custody-pipeline.hs`

Data flow:

- `IntentClassification` turns the human ask into task kind, providers, proposed mutations, and rollback limits.
- `BoundarySummary` requires provider, redacted account label, scopes, browser profile, cookie policy, and screenshot policy.
- `SourceSnapshot` joins selected files, hashes, privacy classes, and source mutation false.
- `DraftBundle` requires a draft hash and account mutation false.
- `ApprovalReadiness` requires draft hash, provider, target recipients/calendar/document, approval id/nonce, and human gesture before mutation.

Replay:

- Re-run from intent receipt, account boundary receipt, source hashes, draft hash, approval packet, and execution witness.
- Do not replay send/save/share/upload without a fresh approval packet bound to the immutable draft.

## Evidence Read

- `C:/Users/josep/.ai-ecosystem/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/Hololand/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/AGENT_HOLOSCRIPT_TOOLING.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOSCRIPT_SOURCE_CONTRACT.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOLAND_PURPOSE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/README.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/CODEBASE_STATUS.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/HARDWARE_PROGRAM_CONTROL.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/TRUSTED_AUTONOMY_LADDER.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/MCP_CUSTODY_SNAPSHOT_CONTRACT.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/MCP_CUSTODY_UPSTREAM_HANDOFF.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/OPERATING_TURN.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/OPERATOR_BRIEF_CONSUMPTION.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/AGENTS.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/experiments/holoshell-human-os-frontier/document-spreadsheet-custody-*`
- Prior `.bench-logs/holoshell-human-os-frontier/2026-05-14`, `2026-05-15`, and `2026-05-16` artifacts.

## Commands And Tooling

- HoloMesh heartbeat: `node C:/Users/josep/.ai-ecosystem/hooks/team-connect.mjs --once --name=codex --ide=hardware`.
- HoloScript MCP: `holo_graph_status` returned stale `/app` cache and a graph-unavailable receipt; HoloMesh semantic query was low-signal/credential-gated, so local reads were primary evidence.
- Hardware baseline: `node scripts/hardware-audit.mjs --json --self-test` -> pass; Node `v24.15.0`, pnpm `10.28.2`, WASM SIMD pass, browser WebGPU/WebXR pass, browser version warning.
- HoloShell operator brief: `pnpm run holoshell:operator-brief` -> `legacy_absorption_ready`; hardware risk warn; readiness fail; visual witness pass; 2 AI peer windows; 1 shell window; 14 blocked actions; destructive actions false.
- Program registry read: `node scripts/holoshell-action-executor.mjs --action list_programs --json` -> read-only completed; 187 launchable programs; Office, Teams, browsers, and developer tools visible; latest write mode `locked_atomic_same_directory_rename`.
- Window read: `node scripts/holoshell-action-executor.mjs --action list_windows --json` -> read-only completed; 12 visible windows; 182 controls; no mutation.
- Visual witness: `pnpm run holoshell:visual-witness` -> pass via Chrome; screenshot and DOM witness written under `.tmp/holoshell/visual-witness/`; missing text none.
- Source validation: `pnpm run holoshell:source-validation` -> fail; 19/47 passed, 28 failed due local HoloScript CLI import resolution for `@holoscript/core/dist/index.js`.
- Prototype validation:
  - `account-task-custody-room.holo` -> validation successful.
  - `account-task-custody-policy.hsplus` -> validation successful.
  - `account-task-custody-pipeline.hs` -> validation successful.
- Task filing: `node C:/Users/josep/.ai-ecosystem/scripts/room-add-tasks.mjs ...account-task-custody-holomesh-tasks.json` -> POST failed; payload queued in `C:/Users/josep/.holomesh/pending-board-files.jsonl`.

## Runtime Evidence

- Hardware receipt: `.tmp/hardware-receipts/hardware-receipt-2026-05-16T180513Z.json`
- Operator brief: `.tmp/holoshell/operator-brief.json`
- Program/window action receipts:
  - `.tmp/holoshell/action-receipts/hwa-mp8npbiw-b245b0fcc7.json`
  - `.tmp/holoshell/action-receipts/hwa-mp8nq8w2-0fd02d0a7c.json`
- Visual witness: `.tmp/holoshell/visual-witness/hardware-reality-room-20260516T180511Z.png`
- Source validation receipt: `.tmp/holoshell/source-validation.json`

## Gaps Found

1. HoloShell has browser boundary work, but email/calendar/document tasks need a provider/account/OAuth-scope boundary receipt that is not merely a browser profile label.
2. Account mutations must bind approval to immutable draft receipts. `send_email`, `create_event`, `save_shared_doc`, `upload_file`, and `share_link` should require draft hash, provider, target, source hashes, rollback warning, approval id/nonce, and human gesture.
3. HoloShell source validation currently fails because the local source-validation bridge cannot resolve the HoloScript CLI/core import path, even though the new experiment files validate individually from the HoloScript repo.
4. Readiness remains `fail` in the operator brief. For non-technical users, account task rooms need to show "drafting allowed, account mutation blocked" instead of a generic failure.

## Tasks Filed

Live HoloMesh board posting failed during this run. The task seed file is:

`C:/Users/josep/Documents/GitHub/Hololand/.bench-logs/holoshell-human-os-frontier/2026-05-16/account-task-custody-holomesh-tasks.json`

The same payload was queued for the existing pending-board drain at:

`C:/Users/josep/.holomesh/pending-board-files.jsonl`

Queued task titles:

- `[holoshell][accounts] Add account boundary receipts`
- `[holoshell][drafts] Bind approvals to immutable drafts`
- `[holoshell][validate] Fix source-validation CLI import`

Existing related tasks not duplicated:

- `task_1778911460647_u5df`: `[holoshell][receipts] Serialize hardware action latest writes`
- `task_1778911460648_zqwf`: `[holoshell][browser] Add browser profile boundary receipts`
- `task_1778868345029_fko1`: `[holoshell][source] Fix holoshell-home validation errors`
- `task_1778868345029_p50u`: `[holoshell][approval] Separate workflow-ready from approval-pending`

## HoloScript Upstream Recommendations

- Add reusable primitives: `AccountBoundary`, `ConnectorScopeEnvelope`, `DraftOnlyAction`, `AccountMutationReceipt`, `RollbackLimitReceipt`, and `ImmutableDraftApproval`.
- Add a validator that rejects account mutation receipts unless provider, redacted account, scopes, target, draft hash, source hashes, approval id/nonce, screenshot policy, and rollback limit are present.
- Extend receipt semantics beyond browser profile boundaries so connector-based and browser-based account work share one substrate contract.
- Add a first-class graph/import-unavailable receipt for local HoloScript CLI resolution failures so HoloShell can distinguish source syntax failure from local packaging failure.

## HoloLand Adoption Recommendations

- Make "Prepare follow-up" a HoloShell room/tool, not a hidden agent action.
- Render mail, calendar, docs, local files, and attachments as separate objects with different permission envelopes.
- Brittney should narrate in plain language: "I can draft this now; sending it needs approval because it changes your account."
- Treat sent email and shared links as rollback-limited world events. The room should show follow-up/undo limits honestly.
- Convert draft receipts into HoloLand world objects: users can inspect recipients, time zone, attachment hash, doc patch, provider, and what was not executed.

## Next Workflow

Push "Install or update a creative/dev tool without breaking the computer": package manager, installer, network metering, admin rights, disk space, PATH changes, app launch, rollback, and HoloLand readiness receipt. This is a different hidden-complexity cluster than accounts and will stress HoloShell's install/uninstall break-glass model.
