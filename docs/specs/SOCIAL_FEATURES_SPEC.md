# Social Features Spec

Spec for the social surface inside HoloLand: discovery, profiles, ratings,
sharing, community, leaderboards, feed, moderation.

> **Status:** spec; not fully shipped. Today, `@hololand/social` exists as a
> compat facade with friends / parties / emotes / notifications **only**.
> Discovery, ratings, the social feed, leaderboards, and moderation tooling
> described below are NOT yet built. Use this doc as the design target;
> verify the live API in [`packages/platform/social/src/index.ts`](../../packages/platform/social/src/index.ts)
> before depending on any specific call.

## What ships today

The package self-identifies as a "Compatibility social facade for HoloLand
demos" (see [`packages/platform/social/package.json`](../../packages/platform/social/package.json)).
Source-of-truth: [`packages/platform/social/src/index.ts`](../../packages/platform/social/src/index.ts).

| Surface | Symbols | Notes |
|---|---|---|
| Friends | `FriendSystem`, `Friend`, `FriendRequest`, `BlockedUser`, `createFriendSystem` | Friend list, requests, block, favourites, presence (`online`/`away`/`busy`/`offline`/`invisible`/`dnd`). |
| Parties | `PartySystem`, `Party`, `PartyMember`, `PartyInvite`, `createPartySystem` | Party formation + invites. |
| Emotes | `EmoteSystem`, `Emote`, `createEmoteSystem` | Emote registry / playback wiring. |
| Notifications | `NotificationSystem`, `Notification`, `createNotificationSystem` | In-app notification surface. |
| Version constant | `HOLOLAND_SOCIAL_VERSION = '1.0.0-compat'` | Tag to confirm at runtime that you're hitting the compat layer. |

Everything below is the spec for a fuller social surface that does **not yet
exist** in this repo. Per [HOLOSCRIPT_SOURCE_CONTRACT.md](../HOLOSCRIPT_SOURCE_CONTRACT.md),
when these features land they should be expressed in HoloScript first
(profile schemas, feed ranking rules, moderation policies as `.hsplus`)
with TS bridges where the platform API surface forces it.

## Spec — discovery

Browse / filter / search across published worlds. Top-level categories:

- Games (competitive, casual, RPG)
- Shops (retail, NFT, digital goods)
- Offices (work, collaboration, meetings)
- Education (courses, training)
- Art & Entertainment (galleries, concerts, performances)
- Social (hangouts, networking)
- Sports & Fitness
- Music & Dance
- Worlds & Exploration
- Creator Spotlights

Filters: genre, max players, language, rating, update frequency, price,
duration, creator-experience tier, monetization type, performance tier,
accessibility features.

Search: full-text over world title, description, creator handle. Trending
searches surfaced at the top.

## Spec — creator profiles

Profile content:

- Identity: handle, badge, location, bio (≤ 250 chars).
- Links: website, YouTube, Discord, Twitter, TikTok.
- Featured worlds: up to 5, reorderable.
- Stats: total worlds, visits, average rating, follower count, monthly earnings.
- Visibility: public / private / creators only.

Badges: tier (bronze / silver / gold / founding), top earner, trending,
community favourite, verified.

## Spec — ratings & reviews

5-star rating prompt on world exit. Rating-distribution bar on world detail.

Required review fields: rating, title (≤ 100 chars), body (≤ 500 chars),
playstyle, gameplay-hours bin. Optional: screenshot, recommendation,
purchase intent.

Review sorting: most helpful, most recent, highest, lowest, verified-purchase
first.

Creator response: one response per review, displayed under it, marked as
creator response.

Moderation: spam / harassment / promotional / spoilers all out; constructive
criticism allowed.

## Spec — content sharing

Share surface: copy link, share to Discord / Twitter / Facebook / WhatsApp /
email / Reddit, generate QR, invite friends by handle.

Embed surfaces: Discord embed, Twitter card, Facebook link preview, email
template.

Referral links: per-creator + per-world; reward creator + new player.

UGC capture: clip recording (30 s / 60 s / 5 min) + screenshot with optional
watermark; auto-shareable to short-form platforms.

## Spec — community

- **Social feed** — followed creators' new worlds + posts, friends'
  achievements, trending content, platform events.
- **Follows** — see followed creators' content first; notification on new
  releases.
- **Direct + group messaging** — text, image, world invite, emoji; group
  chats up to 100 members with creator / moderator / member roles.
- **Notifications** — DM (real-time), group mention, world invite (pop-up),
  follow (batched).
- **Events** — weekly creator highlight + world spotlight + community
  showcase; monthly creator competition + theme jam + voting + Q&A;
  quarterly hackathon + summit + awards.

## Spec — leaderboards

- **Top earners** (monthly).
- **Most visited** worlds (rolling window).
- **Highest rated** worlds (min review threshold).
- **Per-creator** dashboard: global / category / regional rank with trend.
- **Per-player** profile: visits, purchases, level, achievements, friends
  comparison.

## Spec — feed algorithm

Ranking inputs: engagement (likes / comments / shares), recency
(decay over ~7 days), relevance to user-interest profile, social proof
(friends who engaged).

Initial weight target: `0.4 × engagement + 0.3 × recency + 0.2 × relevance + 0.1 × socialProof`.
Tune from telemetry; do not pin weights in docs.

User-side controls: following-only toggle, hide category, less-from-creator,
mute / snooze, report.

Creator-side controls: post privacy, schedule, boost, pin.

## Spec — moderation & safety

Content review on publish (human + AI-assisted). Categorical bans for
sexual content in public worlds, harassment, spam, scams.

Age ratings: All / Teen 13+ / Mature 18+ / Adult (limited distribution).

Reporting categories: inappropriate (incl. CSAM), spam, scam, bug,
copyright. Response SLAs: CSAM 1 h (escalated), harassment 4 h, spam 24 h,
other 3–5 days.

## Implementation notes

- Profile schemas, world rating types, feed-event types, moderation policies
  belong in HoloScript per [`HOLOSCRIPT_SOURCE_CONTRACT.md`](../HOLOSCRIPT_SOURCE_CONTRACT.md).
- The compat-facade's typed surface (`Friend`, `Party`, `Emote`,
  `Notification`) is the starting point for those schemas — extend it in
  HoloScript first, then mirror in TS.
- Persistent storage, federation, and moderation tooling are platform-backend
  concerns (the audit flags `platform/backend` as needing workspace
  reintegration); spec these against that backend, not against the compat
  facade.

## Claims dropped

- **"50+ daily active interactions per creator" / "40% of users / 12% current"
  engagement-target table** — synthetic numbers; restate against live
  telemetry when surfaces ship.
- **"$45,600 / $32,400 / 2.4M visits" leaderboard examples** — illustrative;
  read as schema, not data.
- **All `nebula-arena.holo.io` / `central.hololand.io` URLs** — sample
  domains, not production endpoints. Verify the live deploy URL before
  citing in user-facing copy.
- **"Status: Complete System Design"** — replaced with explicit spec /
  not-shipped framing.

## See also

- [`packages/platform/social/src/index.ts`](../../packages/platform/social/src/index.ts)
  — current compat-facade source.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](../HOLOSCRIPT_SOURCE_CONTRACT.md) —
  social product behaviour belongs in HoloScript.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](../audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
  — `packages/platform/social` not flagged as Should Not Exist; consume
  cautiously.
