# Browser Account Export Room

HoloShell wraps credential-adjacent provider exports as a visible room instead
of a hidden browser chore. The human job is: export account data into local
files, prove which browser/account boundary was used, verify what changed, and
keep raw private data local unless a redacted subset is explicitly promoted.

## Source

| Surface | Source |
| --- | --- |
| Room | `apps/holoshell/source/holoshell-browser-account-export-room.holo` |
| Policy and state machine | `apps/holoshell/source/holoshell-browser-account-export-policy.hsplus` |
| Pipeline | `apps/holoshell/source/holoshell-browser-account-export-pipeline.hs` |
| Prototype dock | `apps/holoshell/prototype/browser-account-export-room.html` |
| HoloScript validators | `packages/framework/src/board/holoshell-account-export-receipts.ts` |

## Product Contract

The room has five visible lanes:

- Browser/account boundary: provider, redacted account label, profile/session,
  cookie policy, screenshot policy, and wrong-profile blockers.
- Export approval: nonce-bound fresh user gesture for provider export mutation.
- Provider wait state: not requested, requested, provider waiting, ready,
  expired, or blocked.
- Download quarantine: archive hash, file count, MIME scan, executable block,
  and private absolute-path receipt.
- HoloLand import dock: preview-only world object and provenance props.

The dock must not display absolute local paths, raw private archive contents, or
credential-bearing screenshots. HoloLand can render receipts and provenance
objects; HoloScript owns the reusable validators, replay contract, and runtime
adapters.

## User-shell variant

The founder-facing room above is the substrate. The non-developer surface is
the user-shell projection:

| Surface | Source |
| --- | --- |
| User-shell room | `apps/holoshell/source/holoshell-user-shell-account-export-room.holo` |
| User-shell policy | `apps/holoshell/source/holoshell-user-shell-account-export-policy.hsplus` |
| User-shell pipeline | `apps/holoshell/source/holoshell-user-shell-account-export-pipeline.hs` |
| User-shell prototype | `apps/holoshell/prototype/user-shell-account-export-room.html` |
| Capability pack | `user-pack.account-export` (via `holoshell-user-shell-projection.hsplus`) |
