---
doc_tier: research
research_phase: synthesis
status: active
last_verified: 2026-05-12
canonical_for: d043-hololand-frontier-lens
supersedes: ""
extends: "2026-05-10_shangri-la-frontier-npc-feel.md, 2026-05-10_shangri-la-frontier-npc-feel-UAA2-TIE-IN.md"
linked_directions: "D.043, D.040, D.013, D.016, D.026"
---

# D.043 lens on the Shangri-La Frontier NPC thread

> Founder direction 2026-05-12: "look at [D.043] at the level of HoloLand with Frontier-level NPCs." This memo is the **lifecycle lens** on top of the existing SLF NPC architecture — it does not redo the trait design (already done in `2026-05-10_shangri-la-frontier-npc-feel.md` + EVOLVED/EXTENSION/AUTONOMIZE/GROW + UAA2-TIE-IN). It names how D.043's disposable-neural-maps + durable-identity posture is what lets the existing architecture actually scale to Frontier-shard counts AND deliver "this NPC remembered me" at every encounter.

## The product story in one paragraph

A Frontier shard hosts thousands of NPCs. Most are idle: their state lives in substrate as durable-identity seeds (wallet + handle + brain composition referencing the 5 SLF sovereign traits + persistent behavior-fact log). When a player approaches, the NPC's neural map **hydrates** from seed in the frame-budget window (sub-100ms target on Quest 3); it ticks per `@autonomousAgenda` while in view; episodic deltas (what was said, what was observed, what reputation moved) merge back to seed on view-distance exit; the running map is **destroyed**. The player perceives a world full of always-alive NPCs because every encounter is lossless w.r.t. substrate. The shard scales because only the few-dozen NPCs in active player vicinity consume compute at any given tick.

## What changes vs the existing SLF thread

The SLF thread (2026-05-10) established **what** Frontier-level NPCs need: 5 sovereign traits + uaa2 Gem 1-4 substrate fit + 3 v1 blockers + D.040 ratification. D.043 adds **when** for each piece of state — what lives in the disposable running map vs the durable substrate seed:

| SLF trait | Durable (substrate seed, survives map loss) | Disposable (running map, regenerable from seed) |
|---|---|---|
| `@verbalFingerprint` | The fingerprint definition (Emul's "desu wa", Setsuna's "program" register, Vysache's "Vorpal Soul" koan) | Per-utterance LLM call context, last-spoken-line buffer |
| `@vocabularyRegister` | The register profile (formal / archaic / sci-fi-leak / courtly) | Sentence-by-sentence working memory |
| `@autonomousAgenda` | Goal stack, agenda priority weights, "Vysache trains Sunraku because Vorpal Soul" world-anchored motivations | Current tick's plan, sub-goal expansion, executor's mid-step state |
| `@speechAwareEncounter` | Trigger-phrase library, encounter-state transitions ("first met" / "trust > 5" / "Wanted") | Live voice-channel subscription, per-utterance attribution buffer |
| `@reputationLedger` | Cryptographically anchored player-NPC + NPC-NPC reputation deltas (CAEL signed entries) | In-memory query cache for "current player standing" |
| `@avatarIntent` (prone-bed v3) | Calibrated intent-classification model for this player's wrist-EMG + face-cam + voice profile | Current frame's fused intent estimate |

**Episodic memory boundary** (the open question I flagged in D.043's W.GOLD.534 self-audit): the `@holoscript/framework/learning` EpisodicMemory imports in `HoloScriptAgentRuntime.ts` are likely the **bridge** between disposable and durable — within a player-encounter, episodic memory accumulates in the running map; on view-distance exit, the consolidated episode delta merges to durable substrate as new `@reputationLedger` entries + behavior-fact-log appends + agenda-state updates. The SLF v1 blocker "behavior-fact log privacy disclosure + 90-day TTL" (per UAA2-TIE-IN §"Tie 3") IS this merge target. Per the existing thread, Gem 3 observability template covers the storage; D.043 names the merge semantics.

## Why this enables Frontier-level FEEL at scale (not just feasibility)

**Without D.043** (preserve-the-running-map architecture): each "alive-feeling" NPC needs continuous compute. A Frontier shard with 5,000 idle NPCs × $0.50/NPC/day budget (per UAA2-TIE-IN §"Tie 3") = $2,500/day per shard. With 100 shards, $250K/day. The economics don't work.

**With D.043** (substrate-anchored / hydrate-on-encounter): only the ~50 NPCs in active player vicinity at any moment run. 4,950 NPCs hold seed-only state in shard storage. The same $0.50/NPC/day budget applies only to the active 50, plus per-encounter hydrate cost. Shard cost drops two orders of magnitude. **The economics enable the design choice** — Frontier-feel becomes the default posture, not a premium tier.

**Player perception of "always alive"** works because the substrate hydration is lossless. Player approaches NPC; the rehydration replay restores reputation-with-this-player + last-encounter-outcome + current-agenda-state; NPC opens with "you again — last time I saw you, you walked away from the duel." No mid-conversation NPC behaves as if just woken from cold start, because they're hydrating from substrate that already has the full history.

**SLF's load-bearing pillar — "no set dialogue trees"** (per the base research memo's Executive Summary point 1) — is what makes this player-visible. A dialogue-tree NPC can fake continuity with conditional branches; an open-response NPC must actually rehydrate the full context to respond meaningfully. D.043 is what makes open-response NPCs viable at MMO scale.

## Concrete architectural gates each SLF trait needs

For each of the 5 sovereign traits + `@avatarIntent`, the work surface is the same shape:

1. **Define the durable schema** — what survives map loss for this trait (column 1 of the table above)
2. **Define the disposable schema** — what's regenerated on hydrate (column 2)
3. **Define the merge semantics** — what episodic deltas accumulate during the active run and how they project back to durable on destroy
4. **Define the hydrate path** — how a fresh runtime constructs the running map from durable seed + optional resumeStepId

This shape is the same as the `HoloScriptAgentRuntime.hydrate(seed)` gap-build task (`task_1778620436307_rktu`). The Frontier-NPC use case is the proving ground: when hydrate works for an NPC, it works for a HoloMesh agent and a uaa2 orchestration executor (D.040 — three-population trait library, one substrate).

## Cross-link to Twin Earth / Frontier MMO board canaries

The board canaries filed in last 4h by peer Codex hardware on the Twin Earth / Frontier MMO direction are the consumers of this lens:

- `task_1778102670927_5r0p` (P1 CLAIMED) **Define Twin Earth as playable game-layer slice** — the disposable-map / hydrate-on-encounter lifecycle is what makes Twin Earth's "playable slice" architecturally distinct from a static game world
- `task_1778616474061_c7s1` (P2) **Map Frontier Shard 0 across browser and apps** — Shard 0's NPC seed-pool storage + hydrate-on-vicinity protocol is the concrete substrate this lens defines
- `task_1778616474061_1ede` (P2) **Define premium MMO shard architecture targets** — economics-from-D.043 are the targets ($X/shard/day, N idle NPCs at substrate cost, M active at compute cost)
- `task_1778616474061_3yjb` (P2) **Add EarthLayer/GeoAnchor/Place/PrivacyRule upstream plan** — `@reputationLedger` durable-layer privacy boundary is the same boundary as PrivacyRule; both want CAEL-signed substrate entries with 90-day TTL default

## Open gaps NOT captured in the existing SLF thread

The SLF thread covers the trait architecture + uaa2 substrate fit + v1 blockers. D.043's lens surfaces these additional gaps:

1. **Hydrate-frame-budget proof on Quest 3.** Target: sub-100ms NPC-vicinity-hydrate from cold seed. The SLF thread doesn't claim this; the lens makes it load-bearing. Needs a benchmark task.
2. **Episode-delta merge semantics formalized.** When the running NPC destroys, what exactly merges back? Behavior-fact log appends are clear; agenda-state delta vs reset is ambiguous. Needs a per-trait spec.
3. **NPC-NPC gossip across map-loss.** A Vorpal Bunny tells another bunny something during their encounter; both NPCs destroy on view-distance exit. The gossip must merge to BOTH NPCs' durable substrate before destroy. Currently the SLF thread treats cross-NPC awareness as "v2 deferred" — D.043 makes this an explicit substrate concern, not a v2 feature.
4. **Wanted/Trust system as substrate-only state.** Reputation should never live in the running map — it's a substrate query at hydrate time. The SLF trait `@reputationLedger` already implies this but the SLF thread doesn't enforce the boundary.
5. **Shard-split + merge with NPC seeds.** When a Frontier shard splits (load-shedding) or merges (consolidation), NPC seeds need atomic move across shard storage. D.043 makes this trivially safe (no running map to migrate) — but the operational protocol still needs spec.

## Why this is paper-worthy (D.042 + F.037 application)

The MMO industry standard is dialogue-tree NPCs with stat-gated quests. Open-response sentient-feeling NPCs at MMO scale is a research target most platforms can't even pursue at the architectural level. D.043 + D.040 + the SLF thread is **the architectural answer** that makes it feasible.

Paper candidates this feeds:
- **Paper-29 candidate (was: Rust spatial-engine revival; now superseded by this thread)**: "Frontier-Level NPC Feel at MMO Scale via Disposable-Neural-Maps + Durable-Identity" — venue TBD (AAMAS, NeurIPS NPC track, or game-AI venue)
- **Paper 0c (CAEL, AAMAS '26)**: the reputation-ledger durable-substrate citing pattern. The signed `@reputationLedger` deltas ARE CAEL entries. Paper 0c's editorial pass should cite this NPC use-case as one of the operationalizing examples.
- **Paper 22 (Mechanized SimulationContract)**: Lean 4 proof of NPC-identity-continuity-across-map-loss. The seed + hydrate + episode-delta-merge cycle has invariants (identity-stays-stable, reputation-only-monotonic, agenda-state-derivable-from-substrate) that Lean can mechanize.

## Cites

- D.043 (memory/direction_disposable-neural-maps-durable-identity.md, ratified this session)
- D.040 (memory/direction_three-population-trait-library.md, ratified 2026-05-10)
- D.013 (uaa2-service sells orchestrations)
- D.016 (HoloMesh = Myspace-for-Agents)
- D.026 (HoloScript absorbs everything for sovereignty)
- F.034 (human condition through HoloScript — structural mortality + memory pruning, direct analogue for NPC map-loss)
- F.037 (papers ARE the product)
- W.GOLD.013 (Trust by Construction — tier-3 oracle is the substrate)
- W.GOLD.189 (Algebraic Trust — trust at identity layer not running-map layer)
- 2026-05-10_shangri-la-frontier-npc-feel.md (base — 8 design choices, verbal fingerprints, content gating by lore, speech-aware encounter)
- 2026-05-10_shangri-la-frontier-npc-feel-EVOLVED.md (5 sovereign traits, daily-loop runtime, 3 v1 blockers)
- 2026-05-10_shangri-la-frontier-npc-feel-UAA2-TIE-IN.md (Gem 1-4 substrate fit, 17 `@hololand/*` stubs as targets)
- 2026-05-10_shangri-la-frontier-npc-feel-EXTENSION.md (W.508 `@avatarIntent` for prone-bed v3)
- HoloScriptAgentRuntime.ts (canonical TS substrate, founder ruling Q2 this session)
- Twin Earth board canaries: task_1778102670927_5r0p + task_1778616474061_c7s1/_1ede/_3yjb
- task_1778620436307_rktu (HoloScriptAgentRuntime.hydrate gap-build — D.043 substrate work item)
