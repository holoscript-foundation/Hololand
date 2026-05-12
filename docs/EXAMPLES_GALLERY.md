# Examples Gallery

Navigation hub for [`examples/`](../examples/). Generate the live tree with:

```bash
ls examples/
find examples -maxdepth 4 -name '*.holo' -o -name '*.hsplus'
```

Do not hand-list examples here — the tree drifts on every commit. The README
inside [`examples/README.md`](../examples/README.md) is the per-example walkthrough.

## Status

Alive. The 2026-05-07 [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
classifies the strongest examples — `hololand-central`, `hololand-legends`,
`14-holoscript-survival-benchmark` — as Keep. Several numbered scaffolds
(`05-desktop-app`, `06-mobile-app`, `07-hybrid-world`, `09-multiplayer-lobby`,
`10-collaborative-building`, `11-social-hub`) are flagged in the audit as
empty scaffolds — they are tracked but contain no HoloScript source yet.

## Categories on disk

| Group | Path | What's there |
|---|---|---|
| Numbered tutorials | [`examples/01-hello-vr-world`](../examples/01-hello-vr-world) → [`examples/14-holoscript-survival-benchmark`](../examples/14-holoscript-survival-benchmark) | Mix of `.holo`/`.hsplus` walkthroughs and HTML/React starters. Some are scaffolds (see audit). |
| `examples/demos/` | [`examples/demos/`](../examples/demos/) | Single-file `.holo` showcases (collaborative building, voice builder, multiplayer lobby, VRChat room, etc.). Listed in [`demos/README.md`](../examples/demos/README.md). |
| `examples/fresh/` | [`examples/fresh/`](../examples/fresh/) | Beginner-friendly compact examples (`hello_vr.holo`, `combat_arena.hsplus`, `npc_dialogue.holo`, `quest_tracker.hsplus`, `inventory_system.hsplus`, `interactive_basics.holo`). |
| `examples/headless/` | [`examples/headless/`](../examples/headless/) | Agent-only `.hsplus` examples (`debate-society`, `knowledge-graph`, `task-swarm`). |
| `examples/hololand-central/` | [`examples/hololand-central/`](../examples/hololand-central/) | The reference HoloLand consumer; product proof surface (zones, worlds, components). Audit "main platform proof". |
| `examples/hololand-legends/` | [`examples/hololand-legends/`](../examples/hololand-legends/) | Game-loop proof with creatures, maps, and `.hsplus` source. |
| `examples/14-holoscript-survival-benchmark/` | [`examples/14-holoscript-survival-benchmark/`](../examples/14-holoscript-survival-benchmark/) | HoloScript-first survival/crafting benchmark. See its README — explicitly no TS game loop. |
| `examples/oasis/` | [`examples/oasis/`](../examples/oasis/) | Tauri desktop slice; audit flags as TS-only with zero HoloScript source. |
| `examples/hololand-website/`, `hololand-landing/` | — | Marketing/site shapes; audit flagged as docs-or-TS, not product source. |
| `examples/holoscript-studio/` | [`examples/holoscript-studio/`](../examples/holoscript-studio/) | Studio-in-browser demo (single `scene.holo` plus harness). |
| `examples/compiled-outputs/` | — | Generated artefacts. Audit flags 286 tracked files as needing snapshot rationale or removal. |

For the actual file inventory, run the `find` command at the top of this doc.

## Featured / live

These are the examples the audit considers strongest as product proof:

| Example | Why it matters |
|---|---|
| [`examples/hololand-central/`](../examples/hololand-central/) | Reference consumer for HoloLand. 27 `.hsplus` + 23 `.holo` files across `zones/`, `worlds/`, `components/`. Source-of-truth tension visible (114 TS/TSX vs 50 HoloScript) — the audit tracks this as the migration target. |
| [`examples/hololand-legends/`](../examples/hololand-legends/) | Game-loop proof. `game.hsplus`, `creatures.hsplus`, `maps/return_to_oasis.hsplus`, `maps/starting_town.hsplus`. |
| [`examples/14-holoscript-survival-benchmark/survival_frontier.holo`](../examples/14-holoscript-survival-benchmark/survival_frontier.holo) | HoloScript-first survival/crafting source — explicit "no TS game loop" charter. See [its README](../examples/14-holoscript-survival-benchmark/README.md). |
| [`examples/headless/`](../examples/headless/) | Agent-only `.hsplus` proofs (`debate-society`, `knowledge-graph`, `task-swarm`) — useful for showing HoloScript works without a renderer. |
| [`examples/01-hello-vr-world`](../examples/01-hello-vr-world), [`02-physics-playground`](../examples/02-physics-playground), [`03-vr-shop`](../examples/03-vr-shop) | Numbered tutorials with both `main.hsplus` and `scene.holo` — the cleanest beginner path. |

## Empty / scaffold (per audit)

The audit flagged the following as empty scaffolds — they should either gain
`.holo`/`.hsplus` source or be archived:

- `examples/05-desktop-app`, `examples/06-mobile-app`, `examples/07-hybrid-world`
- `examples/09-multiplayer-lobby`, `examples/10-collaborative-building`, `examples/11-social-hub`
- `examples/hololand-landing` (site shape, no HoloScript source)

If you find one of these and it now has source, update the audit row.

## Templates

`examples/hololand-central/templates/` ships ten reusable `.holo` worlds
(`art-gallery`, `beach`, `boss-arena`, `cyberpunk-alley`, `dashboard`,
`forest`, `meditation-garden`, `meeting-room`, `modern-office`, `space-station`).
These are the closest thing to a starter library; clone one and modify.

Reusable component libraries live in [`packages/components/`](../packages/components/)
(`fitness/FitnessGym.hsplus`, `templates/environment.holo`, `templates/npcs.holo`,
`templates/ui.holo`, `templates/weapons.holo`, `templates/game-systems.holo`).

## Running an example

```bash
# Pure-HoloScript single-file demo:
#   inspect the source, then drive through the HoloScript runtime/compiler.
cat examples/demos/enchanted-forest.holo

# Numbered tutorials with their own harness:
cd examples/01-hello-vr-world && open index.html

# hololand-central (full app):
#   see examples/hololand-central/README.md or its package.json scripts.
```

The Studio playground at [`packages/playground/`](../packages/playground/) can
also load any `.holo` from the tree.

## Claims dropped

- **"50+ examples / 60+ examples / 17,500+ LOC totals"** — hardcoded counts
  burn on every commit. Use the `find` commands above. F.014 (zero hardcoded
  stats) prohibits these in docs.
- **Named examples that don't exist on disk** — Battle Arena, Procedural
  Island (`examples/procedural/`), Art Gallery (`examples/art-gallery/`),
  Ping Pong (`examples/games/`), Target Practice, Puzzle Rooms, Board Game
  Table, Industrial Factory Dashboard, Patient Monitoring, Smart Farm,
  Building Management, Physics Classroom, Biology VR, Historical
  Recreations, Flight Simulator, Data Viz Dashboard, Real Estate Tour,
  Retail Store, Conference Room, Painting Studio, Theater, Music
  Visualizer, Photography Studio, Virtual Cafe, Study Room, Party Space,
  Networking Stress Test, Input Systems, Material Showcase, and the
  templates/{minimal,standard-scene,game-template,multiplayer-template}.
  None of those paths exist; the previous version of this doc was a
  marketing wishlist, not a reflection of the tree.
- **Per-category LOC totals + "GitHub Stars / Discord / video tutorial"
  promotion CTAs** — community + marketing chrome, not gallery navigation.

## See also

- [`examples/README.md`](../examples/README.md) — per-example READMEs.
- [`examples/14-holoscript-survival-benchmark/README.md`](../examples/14-holoscript-survival-benchmark/README.md)
  — the HoloScript-first benchmark charter.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) — why
  feature-domain examples need `.holo`/`.hs`/`.hsplus` source.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
  — Should Exist / Should Not Exist verdicts on individual examples.
