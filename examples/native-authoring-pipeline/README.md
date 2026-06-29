# Native Authoring Pipeline

This example is the HoloLand product-side proof that native HoloScript can author gamer-facing content, not just describe compiler targets.

`asset_world_pipeline.holo` is the source of truth for:

| Surface | Defined in source |
|---------|-------------------|
| Asset pack | `frontier-lantern-pack` with three source-bound assets |
| World assembly | `frontier-shard-0` placement graph and runtime surfaces |
| Encounter | `ember-market-first-light` playable restore loop |
| NPC | `mira-wayfinder` with sovereign dialogue traits |
| Item arc | `stormglass-lantern-restoration` progression stages |
| Shard flow | parse, materialize, assemble, bind, publish, validate |
| Receipts | replayable local receipts for every material action |
| Runtime validation | local checks for source, assets, placements, encounter, NPC, item arc, and receipts |

Validate the source with the HoloScript CLI:

```powershell
cd C:\Users\josep\Documents\GitHub\HoloScript
pnpm exec holoscript parse ..\Hololand\examples\native-authoring-pipeline\asset_world_pipeline.holo
```

The paired sample receipt shows the shape HoloLand should persist after local runtime validation.

Run the proof harness to validate the native Frontier Shard 0, Twin Universe, and NPC stewardship paths together:

```powershell
cd C:\Users\josep\Documents\GitHub\Hololand
pnpm check:native-proof
```
