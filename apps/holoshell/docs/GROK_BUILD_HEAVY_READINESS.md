# Grok Build Heavy Readiness

Date: 2026-05-14

Purpose: make Grok Build a first-class HoloShell coding-agent lane before the planned Grok Heavy upgrade on 2026-05-15.

## Current Receipt

Adapter:

- `scripts/holoshell-grok-build-workflow.mjs`
- `apps/holoshell/source/holoshell-grok-build-workflow.hsplus`
- setup receipt: `.tmp/holoshell/grok-build-setup.json`
- browser bootstrap: `.tmp/holoshell/grok-build-setup.js`

Observed local state:

- Grok CLI installed at `C:\Users\josep\.grok\bin\grok.exe`
- version: `0.1.210`
- auth: present, token contents not read
- default model: `grok-build`
- available model: `grok-build`
- current PowerShell process does not resolve `grok` on `PATH`, so HoloShell uses the absolute user-bin fallback
- project trust: `untrusted`
- Grok sees 5 project hooks and 14 skipped Claude-style permission entries

## HoloShell Wiring

Grok Build is now exposed as:

- Brittney dispatch capability: `grok_build`
- daemon route: `POST /workflow/grok-build`
- setup route: `GET /workflow/grok-build/setup`
- shell object: `workflow.grok-build`
- local gate case: `holoshell-grok-build-local-approval.v0`
- `.hsplus` workflow source: `holoshell-grok-build-workflow.hsplus`

Default behavior is staged-only. HoloShell can stage either an interactive Grok Build terminal or a single-turn read-only inspection, but execution remains behind a nonce-bound workflow approval bundle.

## Tomorrow Night Recheck

After Grok Heavy is active on 2026-05-15:

1. Run `node scripts/holoshell-grok-build-workflow.mjs --setup-only --json`.
2. Confirm `summary.modelStatus` is still `available` and record any new Heavy model names.
3. Open Grok Build in this repo and approve `/hooks-trust` if the hooks should run.
4. Stage the first safe inspection through HoloShell:

```powershell
node scripts/holoshell-grok-build-workflow.mjs --prompt "Inspect HoloShell Grok Build readiness and summarize only" --permission-mode plan --json
```

5. If the receipt is clean, use Brittney or the daemon route to stage real Grok Build sessions.

## Gaps

- Project trust is still manual because Grok asks for an explicit trust gesture.
- Heavy-specific model inventory cannot be verified until the paid tier is active.
- The Claude permission warnings are compatibility noise from shared settings; they should not block Grok Build, but they are recorded in the setup receipt.
