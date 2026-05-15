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
