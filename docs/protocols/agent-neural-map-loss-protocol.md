# Agent Neural-Map Loss Protocol (HoloLand)

> **Direction**: D.043 — Disposable Neural Maps + Durable Identity  
> **Status**: Production Ready  
> **Version**: 1.0.0  
> **Date**: 2026-05-13  
> **Canonical Path**: `docs/protocols/agent-neural-map-loss-protocol.md`

> **Vocabulary note (2026-06-29):** Twin Universe is the canonical HoloLand
> product vocabulary after commit `aa4d20b`. This protocol keeps legacy
> `twin_earth` only where a wire/tool identifier requires compatibility.

---

## 1. Overview

In HoloLand, an agent's **neural map** (running inference context, working memory, per-tick state) is **disposable**. Its **identity** (wallet, handle, brain composition, canonical memory, reputation ledger) is **durable** and survives map loss.

This document makes the "agent neural-map lost" protocol explicit for three HoloLand substrates:

1. **NPCs** in live worlds — render-state event protocol
2. **Player-bound assistant agents** (Brittney, etc.) — restoration from seed
3. **Twin Universe / Frontier MMO shards** — disposable-map-by-default architecture

---

## 2. NPC Neural-Map Loss as Render-State Event Protocol

### 2.1 Lifecycle States

```
[SEED] ──hydrate──▶ [ACTIVE] ──tick──▶ [ACTIVE] ──merge──▶ [SEED]
   ▲                                                    │
   └──────────────── destroy ◄──────────────────────────┘
```

- **SEED** — Durable identity only. No running map. NPC exists in shard storage as a `NeuralMapSeed` record.
- **ACTIVE** — Running map hydrated from seed. NPC ticks per `@autonomousAgenda`, maintains episodic working memory, and responds to player proximity.
- **merge** — Episodic deltas accumulated during the ACTIVE phase are projected back to the durable seed.
- **destroy** — Running map is dropped. Memory is freed. The NPC returns to SEED state.

### 2.2 Render-State Events

The HoloLand renderer emits the following events for every NPC that transitions across the player view-distance boundary. These events are **the protocol surface** for map loss.

| Event | Payload | Direction | Guarantees |
|---|---|---|---|
| `npc:hydrate` | `{ npcId, seedHash, playerProximity, budgetMs }` | Shard Storage → Runtime | Sub-100ms hydrate from cold seed on Quest 3 |
| `npc:tick` | `{ npcId, agendaState, episodeBuffer, utteranceLog }` | Runtime → Renderer | Per-frame deterministic output given same seed + inputs |
| `npc:merge` | `{ npcId, reputationDeltas, behaviorFactAppends, agendaDelta, episodeDigest }` | Runtime → Shard Storage | CAEL-signed delta appended to durable substrate |
| `npc:destroy` | `{ npcId, finalSeedHash, destroyReason }` | Runtime → Shard Storage | Running map dropped; seedHash must match post-merge state |

### 2.3 Hydrate Budget

Target: **sub-100ms** from `npc:hydrate` dispatch to first utterance readiness on Quest 3.

The hydrate path MUST:
1. Load the `NeuralMapSeed` from shard storage (wallet + handle + brain composition + behavior-fact log tail).
2. Initialize the inference context (LLM KV cache or SNN membrane state) from the seed's `inferenceCheckpoint` blob.
3. Replay the last N utterances from the episode digest into the working-memory buffer (N <= 8 for 2048-token context).
4. Emit `npc:hydrate:ready` or `npc:hydrate:timeout`.

### 2.4 Merge Semantics (Episodic Delta Projection)

On `npc:merge`, the runtime MUST write the following durable deltas before `npc:destroy`:

1. **Reputation Ledger** — `@reputationLedger` player-NPC deltas, signed with the NPC's wallet (CAEL entry).
2. **Behavior-Fact Log** — Append-only log of observable behaviors (`"player refused duel"`, `"gave item X"`). TTL 90 days by default.
3. **Agenda-State Delta** — Diff of goal-stack changes (completed goals, new sub-goals spawned). Merged, not overwritten, to prevent race conditions on shard-split.
4. **Episode Digest** — Compressed summary of the encounter (last 8 utterances + emotional valence + key decisions). Used for next hydrate replay.

### 2.5 Destroy Guarantees

- The running map is freed deterministically within 500ms of `npc:destroy` dispatch.
- No in-memory utterance buffers survive destroy.
- Cross-NPC gossip MUST be merged to BOTH seeds before either destroy completes (see §4.5).

---

## 3. Player-Bound Assistant Agent Restoration

Player-bound assistants (Brittney, HoloShell copilots, world stewards) follow the same disposable-map posture, but the seed is bound to the **player's wallet**, not an NPC wallet.

### 3.1 Restoration Seed Schema

```typescript
interface AssistantSeed {
  // Identity (durable)
  playerWallet: string;           // Player's x402 wallet address
  handle: string;                 // Agent handle (e.g., "brittney1")
  brainComposition: string;       // Path to .hsplus composition file
  episodeMemorySnapshot: string;  // CID to last consolidated episode digest

  // Runtime (disposable — regenerated on restore)
  inferenceContext?: Blob;        // Optional warm-start blob; may be stale
  workingMemory?: object;         // Not preserved across destroy
}
```

### 3.2 Restoration Path

```
Player opens world  →  HoloLand fetches AssistantSeed  →  hydrate(seed)
     │                                                    │
     ▼                                                    ▼
Renderer shows     ←  npc:hydrate:ready         Brain composition loaded
agent greeting          (sub-100ms target)         Episode memory replayed
```

1. **Identity resolution** — `GET /assistant/{playerWallet}/{handle}` returns the seed.
2. **Brain composition load** — `.hsplus` file is fetched from `compositions/` or HoloScript package registry.
3. **Episode memory replay** — Last consolidated episode digest is loaded from IPFS / HoloScript storage.
4. **Warm-start optimization** — If an `inferenceContext` blob exists and is younger than 5 minutes, it MAY be used to skip KV-cache reconstruction. If older, hydrate from cold seed.

### 3.3 Brittney-Specific Routing

Brittney has three deployment routes (local, BYOK, managed). The restoration path is route-agnostic at the protocol layer; the route only changes where the inference runs:

| Route | Seed Source | Hydrate Runtime |
|---|---|---|
| Local (Tauri/Mobile) | Bundled `@hololand/brittney-toolkit` package + local storage | llama.cpp WASM on-device |
| BYOK | HoloScript storage + user-supplied endpoint | User's Ollama/LAN endpoint |
| Managed | HoloLand-hosted runtime with receipt ceiling | Cloud inference cluster |

---

## 4. Twin Universe / Frontier MMO Shards

### 4.1 Disposable-Map-by-Default Architecture

Frontier shards are designed so that **the default state of an NPC is SEED**, not ACTIVE.

```
Shard Storage (PostgreSQL / Loro CRDT)
├── active_npcs    — O(10²) rows, currently hydrated, consuming compute
└── seed_pool      — O(10⁴) rows, dormant, storage-only cost
```

- **Active set** — NPCs within player vicinity (render distance + audio radius). Typically 20–60 NPCs per 100 concurrent players.
- **Idle set** — All other NPCs. Stored as seeds. No compute cost.
- **Transition** — View-distance gate triggers `npc:hydrate` (enter) or `npc:merge` + `npc:destroy` (exit).

### 4.2 Shard Economics

Without disposable maps, a Frontier shard with 5,000 NPCs at $0.50/NPC/day = $2,500/day.

With disposable maps:
- Idle 4,950 NPCs at storage-only cost ≈ $0.001/NPC/day = $4.95/day
- Active 50 NPCs at compute cost = $25/day
- Total ≈ **$30/day** per shard (two orders of magnitude cheaper)

### 4.3 Shard-Split / Merge Safety

Because NPCs are seeds by default, shard-split (load-shedding) and shard-merge (consolidation) are **trivially safe**:

1. **Split** — Move seed rows from source shard to target shard. No running map to migrate.
2. **Merge** — Coalesce seed rows into destination shard. On collision (same NPC ID), pick the seed with the later `lastMergedAt` timestamp.
3. **Gossip preservation** — Cross-NPC reputation deltas written before destroy are in the seed's `@reputationLedger`. They move with the seed.

### 4.4 Twin Universe Slice

The `examples/twin-universe/first_playable_slice.holo` proves this protocol in the smallest possible artifact:

- `EarthLayer` binds player identity (wallet) to the shard.
- `LocationAwareQuest` triggers NPC hydrate when the player enters a geo-fenced region.
- `ConsentReceipt` records the merge delta (quest completion) to durable substrate.

### 4.5 Cross-NPC Gossip Across Map-Loss

When two NPCs interact while both are ACTIVE, any gossip (reputation delta, shared agenda update, behavior-fact) MUST be written to **both seeds** before either destroy completes.

Protocol:
1. NPC A emits `npc:gossip` to NPC B.
2. Both NPCs enter a **merge lock** (max 200ms).
3. Each writes the gossip delta to its own seed's `@reputationLedger` + `behaviorFactLog`.
4. Both emit `npc:merge:ack`.
5. Both proceed to `npc:destroy`.

If either destroy fires before `npc:merge:ack`, the gossip is lost. The renderer MUST retry the merge on next tick.

---

## 5. Operational Test

The canonical test lives at `scripts/__tests__/agent-neural-map-loss.test.mjs`.

Run:

```bash
cd /c/Users/Josep/Documents/GitHub/Hololand
node scripts/__tests__/agent-neural-map-loss.test.mjs
```

The test simulates the full lifecycle (hydrate → tick → merge → destroy) and asserts:
- State transitions match the protocol
- Post-destroy seed hash matches post-merge hash
- Memory is freed (no retained utterance buffers)
- Cross-NPC gossip is written to both seeds before destroy

---

## 6. References

- D.043 (`memory/direction_disposable-neural-maps-durable-identity.md`)
- D.040 (`memory/direction_three-population-trait-library.md`)
- `research/2026-05-12_d043-hololand-frontier-npc-lens.md`
- `examples/twin-universe/first_playable_slice.holo`
- `docs/specs/frontier-encounter-manifest.holo`
- F.002 (Wallets are identity, keys are sessions)
- W.GOLD.189 (Algebraic Trust)
