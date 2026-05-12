# Twin Earth First Playable Slice

This directory defines the first HoloLand Twin Earth vertical slice as HoloScript source.

The slice treats Twin Earth as a playable game layer:

- `EarthLayer` binds the layer to shared identity, inventory, discoveries, and receipts.
- `GeoAnchor` models a WGS84 public-space anchor that can appear in browser preview and mobile AR.
- `Place` connects the anchor to a real-world place vocabulary.
- `PrivacyRule` makes consent and no-background-location policy visible in the source.
- `LocationAwareQuest` gives the player a concrete objective and reward.
- `SurfaceEntry` defines browser and mobile/AR entry paths.
- `ConsentReceipt` plus `write_receipt()` records consent, entry, discovery, and quest completion.

Validation:

```powershell
cd C:\Users\josep\Documents\GitHub\HoloScript
pnpm exec holoscript parse ..\Hololand\examples\twin-earth\first_playable_slice.holo
```

This is intentionally a narrow product slice, not a global geospatial platform. It is the smallest source artifact that proves the founder clarification: Twin Earth belongs inside HoloLand's game loop.
