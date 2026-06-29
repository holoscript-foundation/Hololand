# HoloLand Frontier North Star

**Status:** Product north-star spec, not an implementation task
**Date:** 2026-05-07
**Source layer:** HoloScript is the upstream source of truth
**HoloLand repo posture:** Gamer-facing product/world surface that consumes native HoloScript as the canonical source layer

---

## One Sentence

HoloLand is the first programmable living MMO world: a premium-scale frontier game where players explore persistent fantasy and Twin Universe layers through browser, desktop, mobile, VR, and AR apps; creators shape reality with HoloScript; and agents keep the world alive between sessions.

## Inspiration Boundary

The product target is the feeling of a premium living frontier MMO: the scale and social gravity of a top-tier persistent online world, plus the mastery, discovery, strange systems, personal builds, rare events, reputation, and changing ecology of a world worth studying. HoloLand must not copy protected story, characters, names, locations, monsters, UI, or lore from any existing show, game, or franchise.

Originality rule:

- Copy the emotional target: "I am inside a world worth mastering."
- Do not copy fictional content: names, narrative arcs, signature creatures, guilds, places, plot devices, or visual identity.
- Make HoloLand's differentiator explicit: the world is authored, validated, and evolved through HoloScript.

Reference franchises can only be quality bars, never source material. "World-class MMO" means depth, clarity, persistence, social consequence, and craft. It does not mean cloning any protected game, anime, visual style, combat system, or lore.

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

## World Shape

HoloLand has one game identity with multiple playable layers:

| Layer | Meaning | Product consequence |
|---|---|---|
| Frontier MMO | Original fantasy/sci-fi frontier zones, factions, encounters, traversal, loot, player builds, and social reputation. | This is the primary game loop: explore, master, fight, build, discover, trade, and return. |
| Twin Universe | A playable digital-twin layer of the real world with geospatial anchors, local AR overlays, real places, IoT/sensor context, commerce, civic/professional experiences, location-aware quests, robot fleets, and AI agents. | Twin Universe is not a separate enterprise mode; it is a layer of the game and the flagship substrate target for robots and AI. Real places can become quests, markets, robot work zones, events, classrooms, showrooms, and social hubs. |
| Creator shards | Player/agent-created worlds, dungeons, events, shops, classrooms, galleries, and simulations. | Creator content must pass HoloScript validation before it can affect the live world. |
| Agent ecology | Agents operate as stewards, faction actors, guides, market auditors, safety reviewers, and world builders. | Agents are in-world systems with receipts, not hidden backend automation. |
| Brittney lineage | Brittney is the mother intelligence pattern: the mother of HoloScript and mother-earth steward presence of HoloLand. | Brittney must not collapse into one monopoly cloud endpoint. Local, self-hosted, BYOK, managed, CLI, in-world, and NPC forms are all valid embodiments with receipts and boundaries. |

Surfaces:

- Browser is the zero-install doorway.
- Desktop app is the high-fidelity creator/player surface.
- Mobile app is the Twin Universe and AR companion surface.
- VR/headset app is the deepest immersion surface.
- All surfaces share identity, inventory, world state, receipts, and HoloScript source provenance.

## Governance Boundary

HoloScript is the developer substrate. The broader ecosystem decides what
HoloScript provides as reusable language, trait, compiler, validator, runtime,
MCP, and CLI capability.

HoloLand is the game. The founder team controls what HoloLand looks like, how
it feels, which worlds exist, which assets ship, how shards are staged, and
which HoloLand-specific tools are built for players, creators, and live
operations.

HoloLand should request or contribute upstream HoloScript features when a need
is reusable substrate. HoloLand should not upstream every game-specific asset,
world, visual decision, creator workflow, or shard operation just because it is
important to the product.

## Product Pillars

| Pillar | Meaning | HoloScript/HoloLand implication |
|---|---|---|
| Living frontier | The world has unknowns, shifting routes, rare events, and persistent consequences. | Zones, encounters, NPCs, markets, and unlocks are HoloScript-authored state machines with replayable provenance. |
| Mastery over grind | Progression should reward learning systems, movement, timing, social strategy, and discovery. | Combat, traversal, crafting, and puzzles must expose rules players can study and exploit fairly. |
| Personal builds | Players become recognizable through abilities, equipment, tactics, companions, and titles. | Items, skills, traits, and avatar state compile from semantic definitions, not hardcoded one-off scripts. |
| Social reputation | The world remembers who found, beat, built, helped, taught, traded, or broke things. | Identity, achievements, guilds, market actions, and moderation receipts are persistent and inspectable. |
| Creator-native world growth | New zones and mechanics come from players, agents, and founders without traditional studio bottlenecks. | Brittney/Studio generate HoloScript; HoloScript validates; HoloLand hosts and measures. |
| Agent-run ecology | Agents are not just chat NPCs; they manage factions, events, lore, economy, safety, and world maintenance. | HoloMesh coordinates world stewards, quest directors, faction agents, market auditors, and safety agents. |
| Living NPCs and AGI lineage | NPCs, HoloMesh teammates, and uaa2 services are the same kind of entity at different scales. | HoloLand NPCs are scoped Brittney descendants using HoloScript sovereign traits, not one-off TypeScript chatbots or remote-only inference calls. |
| Twin Universe as game layer | The real world can be playable through AR, geospatial anchors, digital twins, sensor context, and local events. | Geospatial objects, places, portals, quests, commerce, privacy rules, and device permissions must be HoloScript-visible. |
| Robot and AI substrate | HoloLand is the default operational layer for robots and AI acting inside Twin Universe. | Robot and AI actors, perception feeds, task plans, actuator permissions, safety envelopes, and action receipts must be world-visible HoloLand product surfaces backed by reusable HoloScript primitives where appropriate. |
| Hardware truth | The world must feel good on real devices before any claim becomes strategy. | Every vertical slice needs desktop, mobile, WebXR, and headset validation receipts where possible. |

## What Makes It HoloLand

The product should not compete by being another VRChat, Roblox, Rec Room, MMO, or AI coding demo. It competes by making world rules programmable and verifiable.

HoloLand-specific claims:

- Every world rule has a source artifact.
- Every generated zone has provenance.
- Every asset, shard, encounter, NPC, item arc, and creator tool is authored or
  governed through native HoloScript source and receipts where it affects the
  live game.
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
- `TwinUniverseLayer`
- `GeoAnchor`
- `Place`
- `RobotActor`
- `AIAgentActor`
- `SensorFeed`
- `ActuatorCommand`
- `RobotTask`
- `SafetyEnvelope`
- `TwinUniverseReceipt`
- `Encounter`
- `Faction`
- `NPC`
- `NPCManifest`
- `VerbalFingerprint`
- `AutonomousAgenda`
- `ReputationLedger`
- `VocabularyRegister`
- `SpeechAwareEncounter`
- `Skill`
- `Item`
- `LootTable`
- `Quest`
- `TraversalRule`
- `EconomyRule`
- `SafetyRule`
- `PrivacyRule`
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
- One Twin Universe/geospatial layer entry point, even if it starts as a tiny local proof.
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
- Twin Universe map/portal surface.
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
| Twin Universe | One geospatial place/anchor represented as game content with privacy-safe metadata. | Global digital-twin layer, location-aware quests, IoT context, real-world events, civic/professional overlays. |
| Robots and AI | One robot or AI actor represented as a receipted Twin Universe participant with a constrained task and safety envelope. | Fleet-scale robot operations, AI/robot handoffs, world-visible task planning, sensor/actuator bridges, and operator/player-facing receipts. |
| Moderation | Basic safe zone and report flow. | Agent-assisted moderation, age gates, consent boundaries, exploit detection. |
| Persistence | Save profile, discoveries, event receipts. | World state history, player-created canon, replayable event ledger. |
| Hardware | Browser-first entry plus desktop/mobile/WebXR/headset validation target. | Device-specific quality profiles, haptics, AR anchors, app-store packaging, local GPU receipts. |

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
- Build reusable primitives, schemas, validators, receipts, and runtime capabilities in HoloScript when they are developer substrate.
- Build HoloLand-specific assets, worlds, gamer tools, shard operations, creator workflows, visual direction, encounters, and product features in HoloLand using HoloScript source.
- Treat Twin Universe robot/AI substrate as HoloLand product surface. Upstream reusable robot, agent, safety, and receipt primitives to HoloScript when they generalize beyond HoloLand.
- Consume native HoloScript capabilities in HoloLand as playable product experience.
- Keep HoloLand as the reference experience, demo surface, product design memory, and hardware-validation proving ground.
- Treat examples in this repo as product slices that should either consume HoloScript source or clearly document bridge/runtime scope.
- Keep HoloLand's sovereign MCP tools product-focused: shard operations, Twin Universe anchors, creator publishing, agent stewardship, runtime receipts, and hardware validation. Source-layer parsing, compiling, traits, diagnostics, and graph understanding remain HoloScript MCP responsibilities; cross-repo routing and receipts are MCP Orchestrator responsibilities. See [HoloLand Sovereign Tools](HOLOLAND_SOVEREIGN_TOOLS.md).

## Native Proof Policy

HoloLand is the proof that native HoloScript features work in a real game world.
It is not primarily the proof that HoloScript's competitor/export compilers work.

Compiler targets are developer infrastructure. They matter when HoloLand needs
to reach a surface, but the product claim is native authorship and live-world
behavior:

```text
native HoloScript source -> HoloLand asset/world/tool -> player experience -> receipt
```

Do not measure HoloLand success by how many external compiler targets it can
show. Measure it by whether native HoloScript can produce a world that gamers
want to enter, master, return to, and create inside.

Candidate upstream HoloScript work:

- Frontier schema primitives.
- Twin Universe/geospatial game-layer primitives.
- Robot and AI actor primitives.
- Sensor feed, actuator command, safety envelope, and task receipt contracts.
- Validation receipt format.
- Agent steward protocol.
- Brittney sovereignty and deployment contract.
- Shangri-La-inspired NPC manifest and daily-loop traits.
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
- Do not make HoloLand a competitor-compiler showcase instead of a native
  HoloScript game world.

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
- Add one Twin Universe anchor/quest proof across browser and mobile/AR path.
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
- Robot/AI actor registration completeness.
- Robot task receipt completion rate.
- Safety envelope coverage.

Technical metrics:

- Browser entry success.
- Mobile/AR entry success.
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
