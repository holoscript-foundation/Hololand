# HoloMap Replay Preview

**Status:** Local preview bridge  
**Date:** 2026-05-27  
**Scope:** S23 Ultra ARCore depth receipt into HoloLand/HoloShell

`scripts/holoshell-holomap-replay-preview.mjs` turns a HoloScript HoloMap
Android ARCore replay receipt into a HoloShell-safe projection. It is the
bridge for Joseph's S23 Ultra as Fleet mobile capture hardware.

The adapter reads:

- `native-depth-frame.json`
- `native-depth-holomap-replay.json`

It writes:

- `.tmp/holoshell/holomap-replay-preview.json`
- `.tmp/holoshell/holomap-replay-preview.js`
- `window.HOLOSHELL_HOLOMAP_REPLAY_PREVIEW`

The projection includes shell objects for the S23, the preview room, the frame
receipt, the replay receipt, a point-cloud preview, and the preview boundary.
It intentionally does not include raw RGB arrays, raw depth arrays, or raw pose
matrices. HoloLand receives counts, hashes, status, relationships, and honest
scope.

```bash
pnpm holoshell:holomap-replay-preview -- --frame C:/Users/josep/Documents/GitHub/HoloScript/.scratch/android-arcore-depth/2026-05-27/native-depth-frame.json --replay C:/Users/josep/Documents/GitHub/HoloScript/.scratch/android-arcore-depth/2026-05-27/native-depth-holomap-replay.json
pnpm holoshell:holomap-replay-preview -- --source C:/Users/josep/Documents/GitHub/HoloScript/.scratch/android-arcore-depth/2026-05-27/native-depth-holomap-replay.json
pnpm test:holoshell-holomap-replay-preview
```

This proves the local S23 ARCore depth capture reached HoloMap replay. It is not
yet a production room-scale world map; the next promotion step is a multi-frame
S23 sweep with stable anchors and a room-scale reconstruction receipt.
