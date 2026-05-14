# HoloShell Trusted Autonomy Ladder

Date: 2026-05-14

Purpose: make Brittney's program control become more autonomous through receipts instead of blanket permission.

## Levels

| Level | Meaning | Default behavior |
| --- | --- | --- |
| `read_only` | Inspecting windows, programs, controls, targets, or dry runs. | Runs quietly with receipts. |
| `guarded` | Local machine mutations such as launch app, focus window, open URL, hotkey, click, type. | Requires approval. |
| `trusted` | A guarded action target with enough approved successful receipts and no failures. | Eligible for future trusted autonomy only when the daemon explicitly enables it. |
| `break_glass` | Secrets, deletion, payment, install/uninstall, publishing, system settings. | Never auto-promotes. |

## Receipts

Adapter:

- `scripts/holoshell-trust-ledger.mjs`
- source contract: `apps/holoshell/source/holoshell-trusted-autonomy.hsplus`
- ledger receipt: `.tmp/holoshell/trust-ledger.json`
- browser bootstrap: `.tmp/holoshell/trust-ledger.js`

The ledger fingerprints an action by action kind, permission envelope, and local target identity. It stores only local receipts under `.tmp`; the committed UI shows summary counts and trust level.

## Promotion Rule

Default promotion threshold: 3 approved successful guarded executions for the same action target with zero failures.

Promotion means "trusted autonomy eligible," not silent execution. Execution still requires the local control daemon to be started with explicit execution support, and break-glass actions remain blocked.

## Why This Matters

This is the bridge from a dashboard to an operating shell:

```text
intent -> capability -> guarded receipt -> repeated success -> trusted eligibility -> visible autonomy
```

Brittney can eventually operate Excel, browser music, Claude, terminal, Grok, and other wrapped programs with less friction because the trust is earned per action target, not granted globally.
