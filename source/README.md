# HoloLand Source Atlas

This tree contains HoloScript source for HoloLand runtime-facing product
behavior. It is organized as a runtime atlas, not a conventional app folder.

```text
source/
  runtime-atlas.holo
  layers/
  domains/
  verticals/
```

The atlas rule is:

```text
layer + place + domains + verticals + surfaces + receipts
```

Docs:

- `docs/specs/HOLOLAND_RUNTIME_ATLAS.md`
- `docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md`
- `docs/HOLOSCRIPT_SOURCE_CONTRACT.md`

Source posture:

- `.holo` declares spatial scenes, places, layers, surfaces, and visible objects.
- `.hs` declares reusable semantic programs and pipelines.
- `.hsplus` declares typed policies, state machines, runtime modules, and contracts.
- Hand-authored `.ts` and `.tsx` are migration debt and do not belong in this source tree.
