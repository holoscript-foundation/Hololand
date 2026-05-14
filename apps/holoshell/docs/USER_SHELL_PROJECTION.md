# User Shell Projection

**Status:** Derived from founder boot
**Source:** `apps/holoshell/source/holoshell-user-shell-projection.hsplus`
**Receipt:** `.tmp/holoshell/user-shell-projection.json`

Founder HoloShell is the complete operating system surface. The user shell is
not a separate product with weaker ideas. It is a projection of founder power:
plain-language modes, safe capability packs, and Brittney translating intent
before any guarded action runs.

## Modes

| Mode | User | Purpose |
| --- | --- | --- |
| `user.daily` | Regular user | Music, browser, files, programs, room marathon, Brittney. |
| `user.creator` | HoloLand creator | Asset folder to playable shard, source format lessons, previews. |
| `user.operator` | Trusted power user | Room workflows, program control, visible receipts. |
| `founder.full` | Founder | Full source, wild promotion, hardware custody, process custody. |

## Run

```powershell
node scripts\holoshell-format-inventory.mjs --self-test
node scripts\holoshell-founder-boot-preview.mjs --self-test
node scripts\holoshell-user-shell-projection.mjs --self-test
node scripts\holoshell-shell-objects.mjs
node scripts\holoshell-live-feed.mjs
```

## Current Packs

| Pack | User phrase | Default |
| --- | --- | --- |
| `user-pack.browser-lofi` | Play lofi music | Staged approval |
| `user-pack.open-excel` | Open Excel | Staged approval |
| `user-pack.room-marathon` | Start room marathon with Kimi and lofi | Staged approval |
| `user-pack.open-claude-chat` | Open Claude and start a chat | Staged approval |
| `user-pack.asset-shard-preview` | Turn this folder into a playable shard | Preview first |
| `user-pack.format-learning` | Explain `.holo`, `.hs`, `.hsplus` | Read-only |

## Boundary

Founder-only powers are not deleted. They are hidden or translated in the user
surface until an approval, receipt, or founder mode makes them appropriate.

The invariant is simple: user HoloShell should feel magical, but not sneaky.
