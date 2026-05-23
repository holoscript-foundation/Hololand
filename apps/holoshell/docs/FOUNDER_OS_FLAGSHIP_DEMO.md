# Founder OS Flagship Demo

**Source scene:** `apps/holoshell/source/holoshell-shell-world.holo`
**Executable behavior:** `apps/holoshell/source/holoshell-founder-command-pipeline.hs`
**Brittney policy:** `apps/holoshell/source/holoshell-founder-intent-policy.hsplus`
**Receipt bridge:** `scripts/holoshell-founder-command.mjs`
**Founder evidence bridge:** `scripts/holoshell-founder-evidence-demo.mjs`
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

The full flagship is staged, not fully autonomous. The current code can produce
a plan, dispatch record, workflow, approval bundle, brain intent gate, and
receipt flow. The narrow Founder evidence demo has now performed one
nonce-approved browser operation and recorded a shell-visible browser navigation
witness.

Current evidence from the local HoloShell receipts:

| Capability | State |
| --- | --- |
| Source substrate | Latest `.tmp/holoshell/source-validation.json` (2026-05-23) reports 118/118 committed HoloShell source files passing: 21 `.holo`, 20 `.hs`, 77 `.hsplus`. Includes `holoshell-account-export-room.holo` + `holoshell-account-export-policy.hsplus` (committed 2026-05-23). |
| Shell visibility | Latest `.tmp/holoshell/shell-objects.json` reports 95 shell objects, including Founder host, Native Wrapper, Startup Gate, approvals, workflows, receipts, Account Task Receipt, and Founder Evidence Demo. |
| Native startup path | Latest `.tmp/holoshell/startup-integration.json` reports `registration_adapter_present`; startup registration is not enabled by default and approval is required. |
| Brittney command | Founder command is `pending_user_approval` with staged workflow and intent gate. |
| Hardware/app control | Historical approved browser operation is receipted with `browser_navigation_dispatched`; current `.tmp/holoshell/control-daemon-service.json` reports daemon offline and execute disabled. |
| Trust | Latest trust level is `read_only`, so trusted self-operation is not claimed. |

## Evidence Ladder

The flagship only advances when a capability crosses a rung:

```text
source/spec -> receipt -> visible shell UX -> approved execution -> trusted execution
```

The current narrow evidence demo has crossed source/spec, receipt, visible shell
UX, and approved execution. It remains below trusted execution until repeated
success receipts justify promotion.

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

Stage the narrow evidence demo without mutating the machine:

```powershell
pnpm run holoshell:founder-evidence-demo
```

The bridge writes `.tmp/holoshell/founder-evidence-demo-latest.json`, a browser
bootstrap at `.tmp/holoshell/founder-evidence-demo-latest.js`, and a shell
object named `Founder Evidence Demo`. It plans the action, mints a nonce-bound
approval bundle, captures before/after local window witnesses, and leaves
execution unperformed by default.

Execute the narrow demo only after approving the real app operation:

```powershell
pnpm run holoshell:founder-evidence-demo -- --execute-approved --confirm execute-founder-demo
```

For browser targets, a successful action can now count as visibly witnessed
through `browser_navigation_dispatched` even when Windows reuses an existing
browser window and the OS window count does not change.

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
