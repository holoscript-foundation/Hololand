# HoloClaw Browser-Terminal Gap Matrix

**Date:** 2026-06-30
**Scope:** HoloClaw as the OpenClaw/NemoClaw replacement inside HoloShell/Brittney desktop, beyond Studio-only chat.
**Source contract:** `apps/holoshell/source/holoshell-holoclaw-production-frontier.hsplus`

## Verdict

HoloClaw is no longer missing the basic shell spine. The repo now proves:

- HoloClaw is the declared replacement runtime, not an OpenClaw/NemoClaw backend.
- Brittney Studio has isolated workspaces for Brittney, Sovereign, HoloClaw, Terminal, and Improvement.
- Browser refresh restores chat drafts, transcripts, cockpit state, runtime state, and the evidence ledger.
- `sessionId` scopes browser snapshots for simultaneous HoloClaw/Brittney/Terminal workspaces.
- The browser polls terminal evidence and rehydrates terminal proof after refresh.

What is still missing is the production contract that makes this feel like a new desktop app category instead of an IDE terminal plus a web panel.

## External Research Takeaways

Official products already prove the pieces, but not the full HoloShell shape:

- Claude Code is terminal-first: the official quickstart starts in a project terminal, asks permission before edits, and runs tests when available.
- Claude Code's VS Code integration supports graphical chats, multiple conversations, terminal mode, terminal output references, background process visibility, MCP, and Chrome automation.
- Claude Code with Chrome can test local apps, inspect console/DOM state, fill forms, use authenticated browser sessions, extract data, and record browser interactions, while asking the human to handle login/CAPTCHA.
- VS Code's integrated terminal is mature, with split/editor terminals, command tracking, links, selected-text execution, and terminal context for chat, but it is still editor-centered.
- Chrome DevTools Protocol and WebDriver BiDi provide the browser instrumentation substrate: DOM, console, network, screenshots, targets, events, user contexts, and navigation.
- MCP's official framing is the shared connection layer for AI applications to tools, data sources, and workflows.

HoloClaw's wedge is the permanent native symbiosis: browser/app surface for intent, context, approvals, and human legibility; terminal surface for execution, evidence, repair, and hardware truth; both bound by HoloScript source and replayable receipts.

## Priority Gaps

| Priority | Gap | Current proof | Missing production proof | Next slice |
|---|---|---|---|---|
| P0 | Per-session HoloClaw runtime execution | `POST /workflow/holoclaw-runtime-bridge` stages an AgentRunner tick and records approval requirements. | Approved HoloClaw ticks stream result, tool events, failure state, and receipts back into the active HoloClaw chat. | Add a session-bound runtime execution receipt stream behind workflow approval and `HOLOSHELL_HOLOCLAW_ALLOW_AGENT_TICK`. |
| P0 | Browser instrumentation as an app capability | Browser state and real refresh proof exist. | Visible Chrome tabs, console, network, DOM, screenshots, downloads, and authenticated app context are exposed as source-owned read tools, then consent-gated action tools. | Define CDP/BiDi-backed read-only observation adapter, then add consent-gated click/type actions. |
| P0 | Native terminal event stream | Browser polls `GET /api/operator-terminal/session` every 30000ms. | Terminal command lifecycle emits structured `start/stdout/stderr/exit/artifact/process` events with bounded nondeveloper summaries. | Replace polling-only refresh with append-only terminal event stream plus browser run cards. |
| P1 | Multiple HoloClaw chats as real sessions | Workspace IDs and session-scoped snapshots exist. | Each workspace binds its own runtime worker, browser target, terminal stream, approval queue, and replay bundle. | Promote chat workspaces into session objects with `runtimeTargetId`, `browserTargetId`, `terminalStreamId`, and `approvalQueueId`. |
| P1 | Replayable operating turn | Evidence ledger survives refresh. | One operating turn replays from browser actions, terminal events, source changes, approvals, model calls, and receipts. | Add HoloClaw turn bundle schema and export endpoint. |
| P1 | Nondeveloper terminal UX | Terminal lane and run cards exist. | Terminal evidence explains progress, risk, failure, retry, and artifacts without requiring shell literacy. | Add progress verbs, failure categories, artifact chips, and receipt summaries to terminal run cards. |
| P2 | Native desktop packaging | `Brittney Studio.lnk` opens browser and refreshes terminal receipts hidden by default; visible terminal requires `-OperatorTerminal`. | Install/update/startup/session restore are packaged with server custody, browser profile custody, terminal custody, crash recovery, and no manual ceremony. | Add source-backed desktop package contract and custody receipts. |

## Terminal Leverage For Agents

The terminal can benefit HoloClaw far beyond "run commands":

1. **Hardware truth:** GPU, filesystem, shell, package manager, local services, and process state become evidence, not guesses.
2. **Failure repair:** logs, exit codes, stderr, traces, and generated artifacts can trigger bounded repair loops.
3. **Reproducibility:** command receipts create replay anchors for builds, tests, deploys, imports, and browser proofs.
4. **Cross-surface continuity:** terminal events become browser cards; browser approvals become terminal-safe execution gates.
5. **Nondeveloper confidence:** the terminal can remain visible as proof while the browser explains what happened in human language.

The production rule: terminal output must become structured events before it becomes UI. Raw shell text is evidence, not the user experience.

## Architecture Decision

HoloClaw should not copy the IDE pattern where the terminal is a secondary developer pane. It should own:

- **Browser/app:** intent, chat, approvals, selected context, DOM/console/network observations, screenshots, artifacts, receipts.
- **Native terminal:** execution, local hardware proof, process health, command lifecycle, repair loops, artifact production.
- **HoloScript source:** policies, schemas, consent boundaries, workspace identity, replay bundle, source-owned product behavior.

This makes HoloClaw the production lane for "Claude Code + desktop + browser + terminal" without reducing it to any one of those surfaces.

## Official Sources Consulted

- [Claude Code quickstart](https://code.claude.com/docs/en/quickstart)
- [Claude Code VS Code integration](https://code.claude.com/docs/en/ide-integrations)
- [Claude Code with Chrome](https://code.claude.com/docs/en/chrome)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [WebDriver BiDi Working Draft](https://www.w3.org/TR/webdriver-bidi/)
- [VS Code terminal basics](https://code.visualstudio.com/docs/terminal/basics)
- [Model Context Protocol introduction](https://modelcontextprotocol.io/docs/getting-started/intro)

## Next Implementation Order

1. Implement a HoloClaw session object that binds chat workspace, runtime target, browser target, terminal stream, approval queue, and replay id.
2. Add append-only terminal event streaming and render events as browser run cards.
3. Add read-only Chrome observation receipts using CDP/BiDi concepts before any browser click/type action.
4. Add approved HoloClaw runtime tick streaming into the active session.
5. Export/import a single HoloClaw operating-turn replay bundle.
6. Package the launcher/server/browser-profile/terminal custody path as a native desktop app contract.
