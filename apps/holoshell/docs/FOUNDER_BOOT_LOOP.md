# Founder Boot Loop

**Status:** Source-backed preview loop
**Source:** `apps/holoshell/source/holoshell-founder-boot-loop.hsplus`
**Receipts:** `.tmp/holoshell/format-inventory.json`, `.tmp/holoshell/founder-boot-preview.json`

This is the first HoloShell loop that treats the founder shell as bootable
source instead of a dashboard mock.

The loop is:

1. Scan canonical HoloScript and wild uAA2 source as separate `.holo`, `.hs`,
   and `.hsplus` lanes.
2. Load `holoshell-shell-world.holo` as the first-screen world graph.
3. Embed `holoshell-shell-render.holo` as the compact render/action slice.
4. Mount a Format Viewer bubble for the three formats.
5. Derive the first user capability packs from founder powers.
6. Let Brittney inspect selected shell objects, explain risk, and stage
   approval without executing guarded actions by default.
7. Project daily, creator, and operator user modes from the founder surface.

## Run

```powershell
node scripts\holoshell-format-inventory.mjs --self-test
node scripts\holoshell-founder-boot-preview.mjs --self-test
node scripts\holoshell-user-shell-projection.mjs --self-test
node scripts\holoshell-shell-objects.mjs
node scripts\holoshell-live-feed.mjs
```

## Receipts

| Receipt | Purpose |
| --- | --- |
| `format-inventory.json` | Merges canonical HoloScript and wild uAA2 feature lanes. |
| `founder-boot-preview.json` | Proves `.holo` world + `.hs` render slice + format viewer + user packs + Brittney operator bridge are wired. |
| `user-shell-projection.json` | Derives daily, creator, and operator user modes from founder HoloShell. |
| `shell-objects.json` | Turns the boot preview into shell objects. |
| `live-feed.json` | Carries the boot loop into the prototype. |

## Current User Packs

| Pack | Founder power | User surface |
| --- | --- | --- |
| `user-pack.browser-lofi` | Browser/media control | Guarded media portal bubble |
| `user-pack.open-excel` | Program launch/control | Guarded document app bubble |
| `user-pack.sovereign-room-marathon` | Agent room surface | Guarded local room bubble |

These packs do not execute by default. They stage approval and receipt paths so
the user version is derived from founder power without becoming sneaky.
