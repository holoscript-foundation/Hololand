# HoloLand Frontier North Star

**Status:** Product north-star spec, not an implementation task
**Date:** 2026-05-07
**Source layer:** HoloScript is the upstream source of truth
**HoloLand repo posture:** Product/platform surface that consumes HoloScript as the canonical source layer

---

## One Sentence

HoloLand is the first programmable living MMO world: players explore a persistent frontier, creators shape reality with HoloScript, and agents keep the world alive between sessions.

## Inspiration Boundary

The product target is the feeling of a living frontier MMO: mastery, discovery, strange systems, personal builds, rare events, social reputation, and a world that keeps changing. HoloLand must not copy protected story, characters, names, locations, monsters, UI, or lore from any existing show, game, or franchise.

Originality rule:

- Copy the emotional target: "I am inside a world worth mastering."
- Do not copy fictional content: names, narrative arcs, signature creatures, guilds, places, plot devices, or visual identity.
- Make HoloLand's differentiator explicit: the world is authored, validated, and evolved through HoloScript.

## Strategic Reframe

Older HoloLand docs describe an open metaverse, creator platform, VR game hub, and no-code world builder. Those remain useful, but the end product needs a sharper center:

**HoloLand is not a gallery of disconnected rooms. It is a living frontier.**

The default user fantasy is no longer "browse VR worlds." It is:

1. Enter a persistent world.
2. Discover systems other players have not fully mapped.
3. Build a personal style through skill, items, companions, social role, and world knowledge.
4. Join or form teams to defeat rare encounters and unlock zones.
5. Create places, events, and mechanics that other players can actually live inside.
6. Watch agents, creators, and players change the world over time.

## Product Pillars

| Pillar | Meaning | HoloScript/HoloLand implication |
|---|---|---|
| Living frontier | The world has unknowns, shifting routes, rare events, and persistent consequences. | Zones, encounters, NPCs, markets, and unlocks are HoloScript-authored state machines with replayable provenance. |
| Mastery over grind | Progression should reward learning systems, movement, timing, social strategy, and discovery. | Combat, traversal, crafting, and puzzles must expose rules players can study and exploit fairly. |
| Personal builds | Players become recognizable through abilities, equipment, tactics, companions, and titles. | Items, skills, traits, and avatar state compile from semantic definitions, not hardcoded one-off scripts. |
| Social reputation | The world remembers who found, beat, built, helped, taught, traded, or broke things. | Identity, achievements, guilds, market actions, and moderation receipts are persistent and inspectable. |
| Creator-native world growth | New zones and mechanics come from players, agents, and founders without traditional studio bottlenecks. | Brittney/Studio generate HoloScript; HoloScript validates; HoloLand hosts and measures. |
| Agent-run ecology | Agents are not just chat NPCs; they manage factions, events, lore, economy, safety, and world maintenance. | HoloMesh coordinates world stewards, quest directors, faction agents, market auditors, and safety agents. |
| Hardware truth | The world must feel good on real devices before any claim becomes strategy. | Every vertical slice needs desktop, mobile, WebXR, and headset validation receipts where possible. |

## What Makes It HoloLand

The product should not compete by being another VRChat, Roblox, Rec Room, MMO, or AI coding demo. It competes by making world rules programmable and verifiable.

HoloLand-specific claims:

- Every world rule has a source artifact.
- Every generated zone has provenance.
- Every major event has replay inputs and outcomes.
- Every item, skill, NPC, and encounter can be inspected at the semantic layer.
- Every creator-facing template can graduate into reusable HoloScript.
- Every agent action leaves a receipt.
- Every hardware/runtime claim has local validation.

## Experience Layers

### Layer 1: Player

The player should be able to enter HoloLand and immediately understand:

- Where the action is.
- What they can try in the next 30 seconds.
- What they are getting better at.
- What is rare, hidden, or socially meaningful.
- How to invite a friend or join a party.

Baseline player verbs:

- Explore
- Fight
- Dodge
- Climb
- Gather
- Craft
- Trade
- Join
- Teach
- Build
- Discover
- Publish

### Layer 2: Creator

Creators should build playable things, not just decorative scenes.

Creator verbs:

- Generate a zone from a prompt.
- Choose a ruleset template.
- Add enemies, secrets, loot, traversal, puzzles, and NPCs.
- Test with bots or friends.
- Publish with safety/performance checks.
- Earn status and revenue when players engage.

The creator workflow must feel closer to "make a playable frontier encounter" than "open a professional game engine."

### Layer 3: Agent Steward

Agents should make the world feel alive without hiding accountability.

Agent steward roles:

- World director: schedules events and escalations.
- Faction keeper: maintains NPC groups, goals, and conflicts.
- Economy auditor: watches inflation, scarcity, exploits, and creator payouts.
- Lore keeper: turns player discoveries into canon when approved.
- Safety steward: handles griefing, moderation, age gates, and accessibility.
- QA steward: runs replay checks and flags broken mechanics.

### Layer 4: HoloScript Substrate

HoloScript is the reality layer beneath HoloLand.

Required primitive families:

- `WorldRule`
- `Zone`
- `Encounter`
- `Faction`
- `NPC`
- `Skill`
- `Item`
- `LootTable`
- `Quest`
- `TraversalRule`
- `EconomyRule`
- `SafetyRule`
- `AgentAction`
- `ValidationReceipt`

## Core Loops

### 1. Exploration Loop

```text
Enter zone -> notice mystery -> test interaction -> discover rule -> unlock route/reward -> share or keep secret
```

This loop creates the frontier feeling. Secrets should be systemic, not just hidden collectibles.

### 2. Mastery Loop

```text
Attempt challenge -> fail with readable cause -> adjust build/tactic -> improve execution -> clear challenge -> earn durable marker
```

Failure should teach. HoloLand should avoid opaque stat walls where the only answer is grinding.

### 3. Social Loop

```text
Meet player -> solve small task -> form party -> attempt rare event -> earn shared history -> create guild/team identity
```

The world should make players need each other without forcing scheduled commitment for every session.

### 4. Creation Loop

```text
Prompt/choose template -> generate playable draft -> test with bots/friends -> publish -> observe telemetry -> evolve
```

Creator tools should produce playable content with measurable session quality, not just screenshots.

### 5. World Evolution Loop

```text
Player activity -> agent analysis -> proposed event/update -> validation -> live event -> lore/economy/state update
```

This is where HoloLand becomes living software instead of static content.

## First Playable Vertical Slice

### Codename: Frontier Shard 0

Goal: Prove that one small HoloLand shard can feel alive, social, and authorable.

Scope:

- One central hub.
- One wilderness/combat/exploration zone.
- One rare event.
- One creator kiosk.
- One agent steward.
- One persistent player profile loop.
- One validation receipt format.

### Player Session Target

A new player should have a good first session in 12 minutes:

1. Spawn in the hub.
2. See other players or believable agent/player stand-ins.
3. Pick a role style: scout, fighter, builder, support.
4. Enter the frontier zone.
5. Discover at least one secret or route.
6. Fight or solve one encounter.
7. Earn a title, item, badge, or map mark.
8. Return to the hub with proof of what happened.
9. See a clear next objective.

### Zone Design

Hub:

- Spawn point with portal board.
- Party finder.
- Creator kiosk.
- Equipment/skill station.
- Event board.
- Agent steward presence.

Frontier zone:

- Traversal challenge.
- Combat encounter.
- Environmental rule.
- Hidden route.
- Gatherable/craftable object.
- Rare event trigger.
- Exit/return path.

Rare event:

- Triggered by player behavior, time window, or multi-step discovery.
- Has visible world change.
- Requires a party or clever solo strategy.
- Drops cosmetic/status reward first, not pay-to-win power.
- Produces a replay/evidence receipt.

Creator kiosk:

- "Make a small frontier challenge."
- Choose template: traversal, combat, puzzle, social, gathering.
- Generate HoloScript draft.
- Test in sandbox.
- Publish only after validation passes.

Agent steward:

- Explains what happened in-world.
- Tracks broken events.
- Suggests next objectives.
- Summarizes community discoveries.
- Files issues for failed validation.

## Systems Matrix

| System | MVP behavior | Later behavior |
|---|---|---|
| Identity | One persistent profile with title, role, inventory, and discoveries. | Wallet/account portability, guild reputation, creator identity, verified receipts. |
| Traversal | Walk, jump, climb/teleport comfort path, one skill-based route. | Movement builds, mounts/vehicles, spatial puzzles, accessibility variants. |
| Combat | One readable encounter type with dodge/attack/support loop. | Buildcraft, parties, bosses, enemy ecology, seasonal events. |
| Progression | Titles, map marks, cosmetics, and unlocks. | Skill trees, crafting professions, guild ranks, creator reputation. |
| Items | Semantic item definitions with rarity and provenance. | Player crafting, marketplace, rentals, seasonal cosmetics, verified ownership. |
| NPCs | Agent steward plus simple faction NPCs. | Multi-agent factions, memory, negotiation, quests, dynamic conflicts. |
| Quests | Short discoverable objectives. | Agent-authored quest chains with provenance and safety review. |
| Economy | Non-pay-to-win rewards and test currency. | Creator payouts, x402/payment integration, marketplace governance. |
| Creator tools | Prompt/template to playable challenge. | Full visual builder, remix rights, asset marketplace, agent co-builders. |
| Moderation | Basic safe zone and report flow. | Agent-assisted moderation, age gates, consent boundaries, exploit detection. |
| Persistence | Save profile, discoveries, event receipts. | World state history, player-created canon, replayable event ledger. |
| Hardware | Desktop-first plus WebXR/headset validation target. | Device-specific quality profiles, haptics, AR anchors, local GPU receipts. |

## HoloScript Contract

Any frontier feature should be accepted only when it can be described through these questions:

1. What semantic object or rule is this?
2. What player-facing verb does it support?
3. What state does it read and mutate?
4. What validation proves it behaves correctly?
5. What agent, creator, or player owns it?
6. What happens when it fails?
7. How does it compile or degrade across desktop, mobile, WebXR, and headset?

If a feature cannot answer those questions, it is probably engine glue, not HoloLand substrate.

## Platform Implementation Policy

Because HoloLand is the platform that fully utilizes HoloScript:

- Do not add MMO systems here as TypeScript-only canonical implementation.
- Build missing primitives, schemas, validators, receipts, and runtime capabilities in HoloScript first.
- Consume those HoloScript capabilities in HoloLand as playable product experience.
- Keep HoloLand as the reference experience, demo surface, product design memory, and hardware-validation proving ground.
- Treat examples in this repo as product slices that should either consume HoloScript source or clearly document bridge/runtime scope.

Candidate upstream HoloScript work:

- Frontier schema primitives.
- Validation receipt format.
- Agent steward protocol.
- Creator template compiler.
- Persistent profile/event receipt schema.
- Hardware quality profile manifest.
- Cross-target playability checks.

## Anti-Goals

- Do not make a clone of any existing anime/game franchise.
- Do not make a static VR mall with mini-games bolted on.
- Do not make an MMO promise before the first shard proves retention and technical stability.
- Do not make pay-to-win progression.
- Do not let agent autonomy modify live world state without receipts and rollback.
- Do not make creation tools that produce scenes but not gameplay.
- Do not hide HoloScript behind opaque generation; players and creators should eventually understand the rules.

## Validation Gates

Frontier Shard 0 is credible only when:

- A first-time player completes the 12-minute session without a human guide.
- The central hub and frontier zone run locally without blocking errors.
- The shard has at least one replayable event receipt.
- A creator can generate and test one small challenge from a template.
- An agent steward can summarize what happened and file a useful issue when validation fails.
- The experience has a clear desktop path and a measured XR/headset path.
- The demo makes HoloScript's role obvious without requiring the player to read docs.

## 30/60/90-Day Strategy

### 30 Days: Define the Substrate

- Finalize Frontier Shard 0 scope.
- Draft HoloScript schema primitives for zone, encounter, item, skill, event, and receipt.
  - Encounter manifests start at [`frontier-encounter-manifest.holo`](frontier-encounter-manifest.holo) and [`frontier-encounter-manifest.schema.json`](frontier-encounter-manifest.schema.json).
  - Apex-tier encounter PRs must include `cognitiveAttackVector.targetedAssumption`: one sentence naming the player's model-of-world assumption the encounter targets, or review rejects the manifest.
  - Shipped manifests must stay franchise-neutral unless a license is explicitly recorded; outside media examples belong in research notes, not product content.
- Inventory which existing HoloLand examples can serve as migration evidence.
- Define the first player profile and validation receipt shape.

### 60 Days: Prove the Shard

- Build the smallest playable hub-to-frontier loop in the HoloScript-first repo path.
- Add one creator template that produces a playable challenge.
- Add one agent steward loop that watches telemetry and writes a useful report.
- Validate on desktop and one XR/headset path if hardware is available.

### 90 Days: Make It Alive

- Add one rare event with replay evidence.
- Add party/social proof.
- Add creator publishing review.
- Add economy-safe reward loop.
- Open a small player test and measure completion, confusion, replay intent, and creator success.

## Success Metrics

Player metrics:

- First-session completion rate.
- Time to first meaningful discovery.
- Time to first social interaction.
- Return intent after first session.
- Rare event participation.

Creator metrics:

- Time from prompt/template to playable test.
- Validation pass rate.
- Published challenge completion rate.
- Remix count.
- Creator retention.

World metrics:

- Events generated.
- Events completed.
- Broken event rate.
- Agent issue usefulness.
- Receipt completeness.

Technical metrics:

- Desktop frame rate.
- WebXR/headset frame rate.
- Load time.
- Crash/error rate.
- Deterministic replay success.
- Hardware quality profile coverage.

## Decision

Make HoloLand a frontier MMO substrate, not just a metaverse shell.

The first product proof is not "a giant world." It is one small shard that demonstrates the full loop:

```text
player enters -> discovers -> masters -> earns -> returns -> creates -> agents evolve the world -> HoloScript proves what happened
```

That is the HoloLand end product.
