# Founder OS Flagship Demo

**Source scene:** `apps/holoshell/source/holoshell-shell-world.holo`
**Executable behavior:** `apps/holoshell/source/holoshell-founder-command-pipeline.hs`
**Brittney policy:** `apps/holoshell/source/holoshell-founder-intent-policy.hsplus`
**Receipt bridge:** `scripts/holoshell-founder-command.mjs`
**Preview:** `apps/holoshell/prototype/local-capability-room.html`

## Command

```text
Brittney, open Claude, start a room marathon using Ollama Kimi Cloud, open a browser, and play lofi music on YouTube.
```

## Loop

```text
intent -> plan -> approval/trust policy -> app launcher/controller -> receipt
```

The Founder version exposes the whole OS surface: Brittney avatar, app/file/agent/browser bubbles, skins, workflow approvals, trust level, and receipts. User versions should project smaller packs from this same source rather than inventing a separate shell.

## Current Maturity

The flagship is staged, not fully autonomous. The current code can produce a
plan, dispatch record, workflow, approval bundle, brain intent gate, and
receipt flow. Local mutation execution remains disabled unless the guarded
daemon and nonce-bound approval path are explicitly enabled.

Current evidence from the local HoloShell receipts:

| Capability | State |
| --- | --- |
| Source substrate | 50/50 HoloShell source files validate. |
| Shell visibility | 86 shell objects are generated, including Founder host, Native Wrapper, Startup Gate, approvals, workflows, receipts, and Account Task Receipt. |
| Native startup path | Wrapper and startup adapter exist; startup registration is not enabled by default. |
| Brittney command | Founder command is `pending_user_approval` with staged workflow and intent gate. |
| Hardware/app control | Guarded infrastructure exists; polished end-user operation is not complete. |
| Trust | Latest trust level is `read_only`, so trusted self-operation is not claimed. |

## Evidence Ladder

The flagship only advances when a capability crosses a rung:

```text
source/spec -> receipt -> visible shell UX -> approved execution -> trusted execution
```

The next milestone is one narrow approved execution, not a bigger scripted
story.

## Anchor Demo

Before expanding the full command, prove one undeniable operating loop:

```text
Brittney, open one real app, show me what changed, and save the receipt.
```

Acceptance:

- Brittney turns the natural command into a visible plan.
- The shell shows the target app, adapter, risk, and expected receipt.
- The user approves a nonce-bound action.
- HoloShell operates one real app through the guarded local path.
- A receipt records before/after evidence or an honest witness-unavailable
  state.
- The HoloShell surface visibly changes after the operation.

Stage the full flagship receipt:

```powershell
node scripts\holoshell-founder-command.mjs
```

The bridge writes `.tmp/holoshell/founder-command-latest.json` and a browser bootstrap at `.tmp/holoshell/founder-command-latest.js`. It merges the dispatch, Claude surface staging, room marathon workflow, nonce approval bundle, brain intent gate, and live-feed receipt into one six-step command record.

## Demo Targets

- Excel: guarded app launch through agent dispatch.
- Terminal: workflow launcher surface.
- Claude: guarded peer app/chat surface.
- Browser: guarded URL/app surface.
- YouTube lofi: browser media target.
- Ollama Kimi Cloud: model route for the room marathon workflow.

Execution remains staged by default. Any real mutation still requires a nonce-bound approval bundle and a local daemon started with execution enabled.
