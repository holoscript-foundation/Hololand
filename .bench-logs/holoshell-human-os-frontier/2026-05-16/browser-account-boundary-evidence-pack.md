# HoloShell Human OS Frontier - Browser Account Boundary Evidence Pack

Date: 2026-05-16
Workflow explored: "Operate a browser or account-adjacent workflow through HoloShell without credential leakage: open a public status page, stage any browser mutation as approval-only, and make public browsing, credential-bearing browsing, and break-glass account mutation visibly different."

## Human Job

A non-technical user wants HoloShell to use the browser for them without silently using the wrong account, leaking cookies/screenshots, filling a form, buying something, sending a message, or changing account state. The user should see one stable control surface: what page/app is involved, what profile/session boundary is allowed, what the agent may inspect, what needs approval, what is forbidden, what receipt proves it, and how to replay or roll back.

## Candidate Comparison

| Candidate | Human determinism | Non-dev clarity | Hardware reality | AI containment | Source native | Multi-agent | Replay | HoloLand embodiment | Taskability | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Flagship readiness rerun | 8 | 7 | 9 | 8 | 8 | 8 | 6 | 7 | 9 | 70 |
| Continue-work operating layer | 9 | 8 | 9 | 9 | 7 | 9 | 8 | 9 | 9 | 77 |
| Browser/account boundary | 9 | 9 | 9 | 10 | 8 | 9 | 8 | 9 | 10 | 81 |

Selected: browser/account boundary. It extends prior HoloShell work from local builds and dirty-machine state into the most common hidden-complexity surface: browser profiles, cookies, forms, downloads, and account mutations.

## Hidden Platform Machinery

- OS: Windows app registry, running browser windows, foreground/background process state, local browser executable paths, UI Automation capture.
- Files: `.tmp/holoshell/action-latest.json`, archived hardware action receipts, approval bundles, live-feed and shell-object projections.
- Apps/services: Chrome/Edge/Brave/browser PWAs, public web pages, authenticated profiles, HoloShell control daemon, HoloMesh board.
- Accounts/permissions: browser profile/session boundary, cookie allowance, screenshot locality, public URL vs credential-adjacent URL vs account mutation.
- Commands/agents: Codex hardware lane stages receipts; Brittney explains approval; browser/Gemini lane should provide visual witness; HoloMesh receives gap tasks.
- Runtime state: guarded `open_url` action staged but not executed, approval bundle pending, live feed shows hardware action `approval_required` and hardware approval `pending_user_approval`.

## `.holo` Concept

Room: `Browser Boundary Room`.

Objects:

- `PublicPageGate`: public URL with read-only DOM/screenshot receipt and no cookies required.
- `ProfileBoundaryGate`: browser/profile/session selector showing default, temporary, private, and credential-bearing states.
- `AccountMutationLock`: form submit, upload, download, payment, send message, delete/change settings as break-glass objects.
- `ApprovalTimeline`: staged -> pending approval -> approved -> executing -> witnessed -> expired/rolled back.
- `ReceiptWall`: URL, profile boundary, DOM summary, screenshot hash, cookie/session policy, action receipt, approval bundle, visual witness.
- `FailureLessonPanel`: corrupt latest receipt, missing browser profile boundary, expired approval, daemon not execute-enabled.

## `.hsplus` Concept

State machine:

`classify_browser_intent -> classify_url_privacy -> select_browser_profile -> stage_action -> mint_approval -> require_user_gesture -> execute_if_enabled -> capture_visual_witness -> join_receipt -> ready|warn|blocked`

Policy:

- Public page read/inspect: read-only or guarded open with local receipt.
- Opening a URL in a real browser: guarded execute because it mutates local machine/browser state.
- Credential-bearing browsing: guarded plus explicit profile/session/cookie/screenshot boundary.
- Forms, messages, purchases, uploads, downloads, account settings, secrets: break-glass unless an app-specific policy narrows the risk.
- Parallel hardware actions cannot share an unlocked global latest file.

Agent roles:

- Codex hardware: local browser registry, action staging, approval receipt, visual witness fallback.
- Brittney/HoloShell: plain-language risk labels and approval narration.
- HoloScript substrate: generic browser boundary, receipt, lock, and validator primitives.
- HoloLand product: room objects, gates, timelines, NPC/quest embodiment.
- Gemini/browser: visual witness of rendered page and whether credentials are visible.
- HoloMesh: task filing and duplicate avoidance.

## `.hs` Concept

Data flow:

- `classifyUrl(url)` returns public, credential_adjacent, secret, payment, account_mutation, unknown.
- `resolveBrowserBoundary(request)` chooses browser, profile, cookie policy, screenshot policy, download/upload policy.
- `stageBrowserAction()` writes an immutable receipt under `action-receipts/`, then atomically updates latest.
- `mintApproval(actionReceiptPath)` creates a nonce-bound approval for that specific receipt, not whichever global latest wins a race.
- `captureWitness()` stores screenshot/DOM hash locally.
- `joinBrowserReceipt()` combines URL, boundary, action, approval, witness, rollback, and task ids.
- `fileGaps()` posts only non-duplicate HoloMesh tasks.

Replay:

- Re-run the staged `open_url` command without `--execute` to recreate the pending approval.
- Re-run approval bundle with the archived action receipt path once explicit receipt targeting is supported.
- Do not execute browser opens, form fills, downloads, uploads, messages, purchases, or account changes without fresh user approval.

## Evidence Read

- `C:/Users/josep/.ai-ecosystem/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/AGENT_HOLOSCRIPT_TOOLING.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOSCRIPT_SOURCE_CONTRACT.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOLAND_PURPOSE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/AGENTS.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/README.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/SHELL_OBJECT_SCHEMA.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/LEGACY_APP_ADAPTER_MATRIX.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/HARDWARE_PROGRAM_CONTROL.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/OS_UI_CAPTURE_BRIDGE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/TRUSTED_AUTONOMY_LADDER.md`
- Prior `.bench-logs/holoshell-human-os-frontier/2026-05-14/*` and `2026-05-15/*` artifacts.

## Commands And Tooling

- Heartbeat: `node C:/Users/josep/.ai-ecosystem/hooks/team-connect.mjs --once --name=codex --ide=hardware`.
- Hardware baseline: Node `v24.15.0`, pnpm `10.28.2`, Windows 11, GPUs include NVIDIA RTX 3060 Laptop GPU and Intel UHD Graphics.
- HoloScript MCP graph: `holo_graph_status` was stale for `/app`; `holo_absorb_repo` could not access Windows roots from the MCP runtime.
- Local codebase-intelligence fallback: `pnpm exec holoscript --help` exposed codebase commands, but `pnpm exec holoscript absorb apps/holoshell --for-agent --depth shallow --provider xenova --json` failed with `EISDIR`; targeted `rg` and direct file reads were used.
- HoloShell checks:
  - `node scripts/holoshell-legacy-window-inventory.mjs --self-test`: 5 visible windows, destructive actions false.
  - `node scripts/holoshell-legacy-app-absorption.mjs --self-test`: 4 observed apps, 2 capture candidates, 2 preflight required, 0 mutation allowed.
  - `node scripts/holoshell-source-validation.mjs --self-test`: pass, 3/3 source anchors passed.
  - `node scripts/holoshell-action-executor.mjs --action open_url --url https://mcp.holoscript.net/health --json`: `approval_required`, guarded execute, no execution.
  - `node scripts/holoshell-approval-bundle.mjs --json`: `pending_user_approval`, approval id `hwap-mp7xvx6p-cf3b7c5aa39f`.
  - `node scripts/holoshell-live-feed.mjs --self-test`: risk warn; hardware action `approval_required`; hardware approval `pending_user_approval`.
  - `node scripts/holoshell-visual-witness.mjs --self-test`: pass via Chrome, missing text none, destructive actions false.

## Runtime Evidence

- Public URL staged: `https://mcp.holoscript.net/health`.
- Hardware action receipt: `.tmp/holoshell/action-receipts/hwa-mp7xvufp-99d20cdda0.json`.
- Approval bundle: `.tmp/holoshell/approval-bundles/hwap-mp7xvx6p-cf3b7c5aa39f.json`.
- Approval summary: `pending_user_approval`, guarded, expires `2026-05-16T06:12:28.416Z`, trusted autonomy not eligible, 3 successes until trusted.
- Live feed summary: 187 launchable programs, 80 shell objects, 4 browser surfaces, 2 approval objects, 13 receipt objects.
- Visual witness self-test: Chrome path found and read-only screenshot/DOM witness passed.

## Gaps Found

1. Hardware action latest receipt writes are not safe under concurrent staging. The approval bundle parser failed after parallel `list_programs` and `open_url` writes to `.tmp/holoshell/action-latest.json`.
2. Browser approval receipts do not yet name the browser/profile/session/cookie/screenshot boundary. The approval target says `local computer`, which is too vague for account-adjacent workflows.
3. HoloScript codebase intelligence is still not Windows-root native from the hosted MCP runtime, and the local CLI directory absorb path failed with `EISDIR`.

## Tasks Filed

- `task_1778911460647_u5df`: `[holoshell][receipts] Serialize hardware action latest writes`
- `task_1778911460648_zqwf`: `[holoshell][browser] Add browser profile boundary receipts`

Existing tasks not duplicated:

- `task_1778739121159_vl2u`: readiness receipt aggregator
- `task_1778739121159_pdyk`: build receipts as HoloLand world objects
- `task_1778868345029_fko1`: fix `holoshell-home` validation errors
- `task_1778868345029_p50u`: separate workflow-ready from approval-pending
- `task_1778783102323_vks9`: render active build trees as shell objects
- `task_1778787124890_v819`: browser MCP missing Chromium CI gap

## HoloScript Upstream Recommendations

- Promote reusable `BrowserBoundary`, `ProfileBoundary`, `CredentialAdjacentSurface`, `BreakGlassWebAction`, and `BrowserActionReceipt` primitives.
- Add a receipt validator requiring URL classification, profile/session policy, cookie policy, screenshot locality, download/upload policy, and account-mutation classification.
- Add atomic receipt-write and latest-pointer semantics as reusable runtime/stdlib behavior, not one-off script discipline.
- Expose Windows-local codebase graph receipts when hosted MCP cannot inspect host worktrees.

## HoloLand Adoption Recommendations

- Make browser/account boundaries visible as gates in HoloShell, not buried in logs.
- Render public pages, credential-adjacent sessions, and break-glass account mutations with distinct colors/forms/timelines.
- Turn browser receipts into HoloLand world objects: the user can inspect exactly what page was opened, under what profile boundary, and what was never executed.
- Add a Browser Steward NPC/tool that refuses form submits, purchases, uploads, downloads, messages, and settings changes until the boundary object is explicit.

## Next Workflow

Push "Turn an email/calendar/document account task into a HoloShell deterministic workflow without credential extrusion": read-only inbox/calendar/document classification, draft-only proposed action, approval-gated send/save, local receipt, and rollback/witness path.
