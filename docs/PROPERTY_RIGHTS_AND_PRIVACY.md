# Property Rights & Privacy

> **Status: design intent, not shipped.** This is the governance/UX policy
> for spatial ownership in HoloLand. The *primitives* (geofencing, geospatial
> anchors, anchor sharing) ship today; the **claim verification, owner
> attestation, per-zone permission system, and content moderation pipeline
> do not.** Any code block below describing `claimProperty()`,
> `BlockchainAddress`, `PrivateResidence` types, or NFT burn/re-mint flow
> is policy intent, not API. Cite the real primitives below for actual
> integration work.

## Core principles

Unlike speculative metaverse platforms (Decentraland, Upland), HoloLand
treats real-world space as having real-world rules:

1. **Only real property owners can claim their space.** No "first-mint
   wins." Squatting is a first-class anti-pattern.
2. **Homes are private by default.** No unauthorized AR content over a
   private residence without owner consent.
3. **Businesses curate their own zone.** Enable / disable AR; whitelist
   content; set tier (e.g. ads vs. art vs. quiet).
4. **Public spaces are open "chalk spaces."** Community-curated with
   moderation, not free-for-all.
5. **No digital trespassing or vandalism.** Misuse → claim revocation.

These principles are **policy, not code.** They constrain what we build,
not what is built.

## What ships today

| Primitive | Source-of-truth | Role |
|---|---|---|
| Circular geofencing (enter / exit / dwell events) | [`packages/ar/hooks/src/useGeoFence.ts`](../packages/ar/hooks/src/useGeoFence.ts) | React hook for GPS-based zone monitoring with hysteresis + dwell timer. |
| Geospatial anchor system | [`packages/platform/spatial/GeospatialAnchorSystem.ts`](../packages/platform/spatial/GeospatialAnchorSystem.ts) | WGS84 anchor storage, querying, and sharing protocol. |
| Anchor sharing protocol | Same file (`GeospatialSharingProtocol`) | Multi-user anchor distribution. |
| Per-platform anchor providers | [`packages/ar/anchors/src/`](../packages/ar/anchors/src/) | VPS / GPS / fiducial backends per device. |

These are the real building blocks. They give you "is the user inside
zone X" and "where in WGS84 is anchor Y" — they do not give you "who owns
zone X" or "is this content allowed in zone X."

## What does not ship

The following pieces of the policy require building and are listed here so
nobody mistakes the principles above for a product:

- **Owner verification.** No deed-lookup, no rental-lease attestation, no
  GPS-dwell-based renter verification. A future system needs to bind a
  zone to a verified owner identity (likely on-chain attestation, but
  this is unwritten).
- **Claim registry.** No on-chain or off-chain registry of "who claimed
  what zone." A future registry needs to enforce the no-squatting rule
  (re-mint after burn, dwell-time decay, dispute resolution).
- **Per-zone permission system.** `useGeoFence` fires enter/exit events
  but does not gate content rendering. A renderer policy layer is needed
  that asks "may I render this content here?" before drawing anything.
- **Content moderation pipeline.** No automated NSFW / hate / spam
  detection per zone. The `.holo` compiler-as-lexical-firewall
  ([W.GOLD.035](https://github.com/brianonbased-dev/HoloScript)) is the
  language-level safety net; per-zone moderation is a separate runtime
  layer.
- **Dispute resolution.** No appeals, no arbiter UI, no community vote.
  Open question for governance.

The original 970-line draft of this doc described all of the above as if
shipped, with TypeScript-flavoured pseudocode. It is preserved at
[`archive/PROPERTY_RIGHTS_AND_PRIVACY.md`](./archive/PROPERTY_RIGHTS_AND_PRIVACY.md)
for the design vocabulary; do not import its types.

## Zone framework (policy vocabulary)

Three property types worth designing around. None of these are runtime
types — they are the design vocabulary the future permission system
should encode.

| Type | Default posture | Owner control | Content allowed |
|---|---|---|---|
| **Private residence** | Maximum protection: no unauthorized AR. | Owner-only invite. | Owner-curated. |
| **Commercial property** | AR-on by default if owner enabled. | Business sets tier and whitelist. | Owner whitelist + global moderation. |
| **Public space** ("chalk space") | Open with moderation. | Civic / community curators. | Time-bounded ephemeral; moderation-gated. |

Implementing this is mostly: (a) attach a zone-type tag to each
geospatial anchor, (b) gate `render()` on a zone-policy lookup, (c) tie
the lookup to a verified owner registry. None of those layers exist yet.

## Privacy posture (real, today)

The following privacy posture ships today via the geospatial primitives,
even without the zone-claim system:

- **No background location tracking.** `useGeoFence` runs on `useGeoAnchor`
  which is foreground-only.
- **No anchor-content storage on third-party servers** unless the user
  shares via `GeospatialSharingProtocol`. Local IndexedDB by default.
- **Motion / biometric capture is opt-in per session.** See
  [`SECURITY_BEST_PRACTICES.md`](./SECURITY_BEST_PRACTICES.md) for
  HoloLand-specific PII surfaces (avatar, motion, spatial anchors).

## Open governance questions

Worth a founder-level decision before building the missing layers:

1. **Owner attestation mechanism.** On-chain (which chain?) vs. centralized
   trust authority vs. social attestation. Each has different privacy and
   sybil-resistance tradeoffs.
2. **Zone-content moderation authority.** Owner-only vs. community-vote
   vs. moderator-tier. Public-space "chalk" rules need a clear answer.
3. **Squatter mitigation.** Dwell-time decay, owner-challenge process,
   or NFT-burn re-mint — pick one before any registry ships.
4. **Cross-platform identity binding.** A claimed zone on iOS should be
   the same zone on Android / Quest / WebXR. Identity layer is
   pre-condition.

## Cross-references

- [`HOLOLAND_PURPOSE.md`](./HOLOLAND_PURPOSE.md) — what HoloLand owns.
- [`SECURITY_BEST_PRACTICES.md`](./SECURITY_BEST_PRACTICES.md) — spatial /
  motion / avatar threat surfaces.
- [`GEOSPATIAL_ANCHORING.md`](./GEOSPATIAL_ANCHORING.md) — the anchor
  primitives this policy will eventually compose with.
- [`specs/HOLOLAND_FRONTIER_NORTH_STAR.md`](./specs/HOLOLAND_FRONTIER_NORTH_STAR.md)
  — long-arc product direction.
