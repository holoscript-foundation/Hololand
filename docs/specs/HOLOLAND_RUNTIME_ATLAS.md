# HoloLand Runtime Atlas

**Status:** Architecture and source layout directive
**Date:** 2026-05-19
**Source layer:** HoloScript remains canonical for runtime-visible behavior
**Scope:** HoloLand runtime files, Twin Earth, HoloLand Central, verticals, domains, and receipts

## Thesis

HoloLand should not be organized like a normal application that happens to
render Earth. It should be organized like a living Earth runtime.

The runtime atlas has four orthogonal axes:

| Axis | Question | Examples |
|---|---|---|
| Layer | Which reality surface is active? | VR, VRR, AR |
| Place | Where does this run? | Earth cell, public plaza, venue, home, building, shard |
| Domain | What authority or runtime concern is involved? | Geo, privacy, identity, receipts, agents, safety, sensors, actuators |
| Vertical | What lived use case is being served? | Civic, commerce, education, healthcare, industrial, real estate, robotics, entertainment |

Every runtime-facing file should be locatable by at least one layer and one
domain. Earth-bound content should also declare a place. Product slices should
declare one or more verticals.

```text
layer + place + domains + verticals + surfaces + receipts
```

## Layer Model

### VR: HoloLand Central And Frontier

The VR layer is the HoloLand Central / Oasis-style social frontier. External
references such as Ready Player One and Shangri-La Frontier are quality bars
for social gravity, scale, mastery, and return desire. They are not content
sources. Shipped HoloLand names, lore, factions, encounters, visual identity,
and UI language must remain original and franchise-neutral unless a license is
explicitly recorded.

VR owns:

- HoloLand Central as the social gravity well.
- Frontier shards as playable MMO zones beyond Central.
- Creator shards as validated player and agent authored spaces.
- Events, parties, guilds, reputation, creator kiosks, and agent stewards.

### VRR: Virtual Reality Reality

The VRR layer is the 1:1 professional and simulation surface. It is reality
constrained: accurate scale, accurate physics where required, real measurements,
CAD or scan provenance, training receipts, and surface-specific performance
budgets.

VRR owns:

- Training simulations.
- Real estate and venue walkthroughs.
- Industrial and manufacturing twins.
- Healthcare and education simulations.
- Professional proofs that need 1:1 scale and traceable inputs.

### AR: Twin Earth

The AR layer is the live geospatial overlay. It binds real places, foreground
location, mobile AR, privacy, consent, robot and AI participants, and action
receipts into the game layer.

AR owns:

- GeoAnchors and Places.
- Foreground-only location consent.
- Public, private, civic, and owner-governed boundaries.
- Location-aware quests and commerce overlays.
- Robot and AI operational context.

## Directory Contract

The HoloLand source root starts at:

```text
source/
```

Initial atlas layout:

```text
source/
  runtime-atlas.holo
  layers/
    vr/
      central/
      frontier/
    vrr/
      reality-sims/
    ar/
      twin-earth/
  domains/
    geo/
    privacy/
    receipts/
    agents/
    safety/
  verticals/
    civic/
    commerce/
    education/
    healthcare/
    industrial/
    real-estate/
    robotics/
    entertainment/
```

The folders are not package boundaries. They are runtime meaning boundaries.
Generated renderer output does not belong here unless it is explicitly marked
as source and can be validated as HoloScript.

## Domain Authority

Domains are reusable runtime authority surfaces. They answer: "What kind of
power is being exercised?"

| Domain | Owns |
|---|---|
| Geo | Earth cells, WGS84 anchors, spatial accuracy, place membership, surface mapping |
| Privacy | Consent, owner policy, retention, no-background-location, residential denial defaults |
| Receipts | Replayable proof, source provenance, action summaries, event hashes |
| Agents | Brittney descendants, NPCs, stewards, world directors, faction actors |
| Safety | Moderation, robot or AI safety envelopes, permission gates, rollback paths |
| Identity | Player, creator, agent, robot, and organization identity |
| Sensors | Sensor feeds, freshness, calibration, provenance, trust level |
| Actuators | Commands that can affect physical or world state |
| Quests | Player objectives, rewards, completion conditions, event triggers |
| Economy | Inventory, market, creator payouts, scarcity, non-pay-to-win reward rules |

## Vertical Authority

Verticals are product slices. They answer: "Who is this for and what real use
case are they living inside?"

| Vertical | Runtime posture |
|---|---|
| Entertainment | Central, frontier shards, rare events, social reputation, creator fun |
| Civic | Public spaces, community events, local quests, moderated civic overlays |
| Commerce | Shops, showrooms, product previews, location-aware offers |
| Education | Lessons, labs, field trips, campus overlays, learning receipts |
| Healthcare | Training, patient education, wellness, strict privacy defaults |
| Industrial | Factory twins, safety drills, maintenance, fleet supervision |
| Real estate | Property tours, staging, venue walkthroughs, owner-attested content |
| Robotics | Robot actors, tasks, sensor feeds, actuator permissions, safety envelopes |

Vertical files must not bypass domains. A healthcare vertical that needs a
location-aware training quest still composes geo, privacy, receipts, and safety.

## Place Authority

Places are not just coordinates. A Place declares:

- Coordinate frame and location accuracy.
- Public, private, venue, civic, or owner-governed policy.
- Which domains can operate there.
- Which verticals can render there.
- Which surfaces can enter.
- Which receipts are required for mutation.

The default for private residences is deny. Public spaces can allow ephemeral
moderated overlays only when consent and receipt rules are visible in source.

## File Admission Rule

Runtime files are admitted when they answer these questions:

1. Which layer does this belong to?
2. Which place or Earth cell does this affect?
3. Which domains grant authority?
4. Which verticals are served?
5. Which surfaces can enter?
6. Which receipts prove what happened?
7. Which HoloScript source files are canonical?
8. What fails closed if validation, consent, or hardware capability is missing?

If a runtime file cannot answer those questions, it is likely engine glue,
generated output, or migration debt rather than atlas source.

## Production Admission Check

The first production gate is:

```powershell
node scripts/check-runtime-atlas-admission.mjs --root C:/Users/josep/Documents/GitHub/Hololand
```

The checker scans `source/**/*.holo`, `source/**/*.hs`, and
`source/**/*.hsplus`. It fails layer, domain, vertical, proof, or atlas files
that do not declare the runtime fields needed for production admission.

The first proof is:

```text
source/proofs/central-frontier-receipt-proof.hsplus
```

It binds HoloLand Central to Frontier Shard 0 through the runtime receipt
envelope:

```text
source/domains/receipts/runtime-receipt-envelope.hsplus
```

The executable local proof is:

```powershell
node scripts/hololand-central-frontier-proof.mjs --json
```

It emits:

```text
.tmp/hololand/receipts/central-frontier-latest.json
```

The receipt simulates the first production loop:

```text
central_entered -> portal_used -> shard_entered -> encounter_completed -> reward_earned
```

The single production-readiness gate is:

```powershell
node scripts/hololand-production-readiness.mjs --json
```

It is sourced by:

```text
source/proofs/central-frontier-production-readiness.hsplus
```

It emits:

```text
.tmp/hololand/readiness/central-frontier-latest.json
```

The readiness receipt passes only when atlas admission, the Central to Frontier
proof, and readiness receipt coverage all pass.

## First Slice

The first source slice is:

```text
source/runtime-atlas.holo
source/layers/vr/central/hololand-central.holo
source/layers/vr/frontier/shard-0/frontier-shard-0.holo
source/layers/vrr/reality-sims/reality-sims-layer.holo
source/layers/ar/twin-earth/twin-earth-layer.holo
```

The existing `examples/twin-earth/first_playable_slice.holo` remains valid
evidence. The atlas promotes that direction into the runtime source tree rather
than leaving Twin Earth as only an example.

## HoloScript Boundary

HoloLand owns the product experience. HoloScript owns reusable language,
traits, validators, compilers, runtime contracts, and generic primitives.

Atlas work stays in HoloLand when it is a world, shard, vertical, place,
product workflow, asset, or lived runtime experience. It moves upstream to
HoloScript when it becomes a reusable primitive, validator, receipt format,
compiler capability, or generic runtime contract every HoloScript developer
should have.

## Decision

Adopt the HoloLand Runtime Atlas as the organizing principle for runtime files:

```text
HoloLand Central is the VR social frontier layer.
Twin Earth is the geospatial reality layer.
VRR is the 1:1 simulation layer.
Domains grant runtime authority.
Verticals provide lived use cases.
Places bind the atlas to Earth.
Receipts prove every live-world mutation.
HoloScript is the source of all world behavior.
```
