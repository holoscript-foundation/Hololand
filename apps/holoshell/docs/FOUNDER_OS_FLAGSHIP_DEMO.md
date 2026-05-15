# Founder OS Flagship Demo

**Source scene:** `apps/holoshell/source/holoshell-shell-world.holo`
**Executable behavior:** `apps/holoshell/source/holoshell-founder-command-pipeline.hs`
**Brittney policy:** `apps/holoshell/source/holoshell-founder-intent-policy.hsplus`
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

## Demo Targets

- Excel: guarded app launch through agent dispatch.
- Terminal: workflow launcher surface.
- Claude: guarded peer app/chat surface.
- Browser: guarded URL/app surface.
- YouTube lofi: browser media target.
- Ollama Kimi Cloud: model route for the room marathon workflow.

Execution remains staged by default. Any real mutation still requires a nonce-bound approval bundle and a local daemon started with execution enabled.
