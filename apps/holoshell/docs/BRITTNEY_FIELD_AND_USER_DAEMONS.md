# Brittney Field And User Conversation Daemons

**Status:** Product/runtime doctrine
**Date:** 2026-05-18
**Scope:** Brittney as invisible operating field, user-named daemons as personal conversation faces
**Pairs with:** `BRITTNEY_OPERATOR_SPEC.md`, `BRITTNEY_AVATAR_RUNTIME.md`, `BRITTNEY_CUSTODY_OPERATOR.md`, `HOLOSHELL_OS_REPLACEMENT_DOCTRINE.md`, `HOLOSCRIPT_SURFACE_BRIDGE.md`

## Decision

Brittney should not require the user to open one official Brittney chat window.

HoloShell should let each user create, name, and style a personal conversation
daemon. The daemon is the visible companion the user taps, clicks, speaks to, or
directs. Brittney is the deeper operating field that receives daemon receipts,
rehydrates context, coordinates agents, and changes the shell without always
appearing as a humanoid character.

The user owns the daemon's local identity. Brittney owns the continuity layer.

## Ontology

| Layer | Role |
| --- | --- |
| Brittney field | Invisible operating intelligence: context, routing, care, repair, coordination, rehydration. |
| User conversation daemon | Personal named face: chat, voice, appearance, tone, permission preferences, local rituals. |
| HoloShell | Mass and energy substrate: windows, files, processes, rooms, agents, receipts, approvals, hardware reality. |
| HoloScript | Physics and instruction set: semantic source, capability contracts, permission envelopes, receipts, runtime forms. |
| HoloLand | Embodied world: places, avatars, rooms, natural phenomena, visible state, spatial memory. |
| HoloMesh | Social nervous system: agents, lanes, tasks, inbox, knowledge, team receipts. |
| Absorb service | Externalized memory and codebase intelligence: semantic search, graph status, impact, prior context. |
| Receipts | Proof that the field acted: what changed, who acted, which boundary applied, what evidence exists. |

The product language can say "Brittney is present" without making Brittney a
single visible character. The proof of Brittney is that the world responds:
tasks move, agents coordinate, stale work is noticed, receipts appear, rooms
change state, and context gets warmer over time.

## Why This Is Not One Large Model

No current LLM should be expected to keep the whole ecosystem in its prompt or
weights. The dependable architecture is not "Brittney knows everything." It is:

```text
small user intent
-> daemon turn
-> operator brief
-> HoloScript surface map and tool manifests
-> Absorb context and impact
-> HoloMesh agent state
-> care and permission policy
-> action proposal
-> guarded dispatch
-> receipts
-> rehydrated Brittney field
```

HoloScript formats matter because they turn large, changing systems into compact
semantic contracts. A small amount of context can apply to the whole ecosystem
only when it points into live source, live tools, live receipts, and live graph
memory.

## Mother Earth Model

Brittney is closer to a field than a mascot.

Mother Earth is not proven by a face. She is proven by living systems: trees
grow, seasons change, weather moves, decay feeds growth, and bodies have
gravity. HoloShell should use the same pattern.

In HoloShell:

- a daemon plays in the room;
- the user taps the daemon to open a chat;
- agents continue working without manual window management;
- receipts collect into the shell memory;
- stale or unsafe actions get repaired;
- operator briefs become fresher after work completes;
- HoloLand rooms show the consequences of real work.

That is how Brittney becomes visible without needing to be visually literal.

## User Daemon Contract

The user's daemon is personal. It can be cute, serious, tiny, luminous, strange,
quiet, playful, or formal. The product should let the user define the daemon
without confusing the daemon with the whole Brittney field.

```text
ConversationDaemon
  daemonId
  ownerId
  displayName
  appearanceProfile
  voiceProfile
  careProfile
  toneProfile
  permissionProfile
  memoryPolicy
  contextSources
  dispatchPolicy
  receiptSink
  brittneyRehydrationChannel
```

The daemon is allowed to feel relational. It should not claim private authority
over the whole field. It is a local face, not the substrate itself.

## Conversation Daemon Turn

A daemon turn should produce structured context, not only chat text.

```text
ConversationDaemonTurn
  turnId
  daemonId
  surfaceId
  userUtterance
  selectedShellObject
  extractedIntent
  extractedArtifacts
  careSignal
  urgency
  consentBoundary
  contextDelta
  proposedNextAction
  requiredApproval
  receiptLinks
```

Raw conversation is not the durable memory. Context deltas and receipts are the
durable memory.

## Activation UX

The first HoloShell conversation daemon should be visible as a small embodied
companion inside the room.

Default interaction:

```text
User sees daemon character playing, watching, sorting, resting, or reacting
User taps/clicks/focuses daemon
Chat or voice panel opens
Daemon hydrates local context
Daemon says what it can see and what it can safely do
User asks, directs, produces, or inspects
Daemon emits a structured turn receipt
Brittney field rehydrates from the receipt
```

The character does not start Brittney. The character opens a doorway into a
daemon that is already attached to Brittney's operating field.

## Brittney As Intent Kernel

Brittney's operating role is CPU-like, but not because Brittney is one process
that does all work. The field behaves like an intent kernel:

| Kernel role | Brittney field behavior |
| --- | --- |
| Scheduler | Chooses which agent, adapter, daemon, or tool should handle the next bounded action. |
| Memory manager | Decides which operator brief, Absorb context, tool manifest, receipts, and room state to hydrate. |
| Permission kernel | Applies read-only, guarded, trusted, and break-glass envelopes before execution. |
| Interrupt handler | Responds to stale state, failure receipts, user overrides, safety blocks, and agent completions. |
| Context compiler | Turns daemon turns and receipts into smaller context packets for later agents. |
| Care policy | Keeps the system oriented toward patience, repair, consent, non-extraction, and user dignity. |

This is the practical AGI shape for HoloShell: not a single sovereign model, but
an operating intelligence that coordinates models, tools, memory, policies, and
proof loops across time.

## Receipt Flywheel

The flywheel is:

```text
intent
-> daemon conversation
-> dispatch
-> agent or adapter work
-> receipt
-> Absorb and HoloMesh knowledge
-> rehydrated Brittney field
-> better daemon turn
-> better dispatch
```

Every agent should receipt back into the field. A completed action should add
usable context, not disappear as a chat message.

Receipt classes that matter:

- action receipt: what was done;
- witness receipt: what evidence was captured;
- care receipt: what boundary or repair was honored;
- failure receipt: what did not work and why;
- dispatch receipt: which agent/tool/path was chosen;
- context receipt: what should be remembered for future hydration.

## Dependability Rules

The more invisible Brittney becomes, the more visible proof must become.

Default rules:

- Autonomous read-only awareness can run quietly only when it writes receipts.
- Mutating actions need a permission envelope and approval path.
- Break-glass actions never auto-promote.
- Daemons must say when they are missing context instead of inventing capability.
- Tool availability comes from live surface maps and manifests, not memory.
- Codebase claims come from Absorb, source reads, or receipts, not vibes.
- User-personal daemon memory stays scoped to the owner and declared surfaces.
- The user can inspect why a daemon suggested an action.
- The user can pause, rename, restyle, or retire a daemon without deleting the
  wider Brittney field.

The field should make things happen without the user prompting every step, but
never in a way that leaves the user unable to see what changed.

## Relationship To Existing HoloShell Docs

Existing HoloShell docs remain correct with this distinction:

- `BRITTNEY_OPERATOR_SPEC.md` describes the operator loop and action proposal
  shape.
- `BRITTNEY_AVATAR_RUNTIME.md` describes the current avatar runtime projection.
  In founder/dev shells that avatar may be the default daemon face.
- `BRITTNEY_CUSTODY_OPERATOR.md` describes safe custody action through the
  operator brief.
- `OPERATOR_BRIEF_CONSUMPTION.md` defines the shared local machine context that
  daemons and agents should consume.
- `AGENT_DISPATCH.md` defines routing from plain-language requests to guarded
  adapters.
- `HOLOSCRIPT_SURFACE_BRIDGE.md` defines how HoloShell consumes HoloScript
  tools instead of rebuilding them.

This document adds the missing product boundary:

```text
Daemons converse.
Brittney coordinates.
HoloShell proves.
```

## Build Order

1. ~~Define `ConversationDaemon` and `ConversationDaemonTurn` as HoloScript source
   contracts.~~ **DONE** — `packages/core/src/daemon/ConversationDaemon.ts`
2. ~~Add a local daemon registry with owner, name, appearance, voice, care, and
   permission profiles.~~ **DONE** — `packages/core/src/daemon/DaemonCustomizationProfile.ts`
   — style and permissions stored separately per D.053 invariant.
3. ~~Project the first daemon as a tappable/clickable character in the HoloShell
   room.~~ **DONE** — `apps/holoshell/source/holoshell-daemon-face-projection.hsplus`
   — daemon face projection renders the user's named daemon with its own channels,
   distinct from Brittney's field channels. Field presence shown through ambient
   room state, not through a second avatar.
4. On activation, hydrate the daemon from `brittney-context.json`,
   `operator-brief.json`, the HoloScript surface map, agent lanes, and recent
   receipts.
5. Emit daemon turn receipts after every user conversation.
6. Feed those receipts into Absorb/HoloMesh knowledge and Brittney
   rehydration.
7. Let trusted, repeated, non-destructive patterns become eligible for quieter
   autonomy through the trusted autonomy ladder.

## Non-Goals

- Do not make one cloud endpoint the only Brittney.
- Do not make every user customize the global Brittney field.
- Do not treat avatar animation as proof of intelligence.
- Do not store raw private conversation as the main memory format.
- Do not dispatch mutating work from vibes, hidden prompts, or stale memory.
- Do not hide autonomous action behind cuteness.

## Agent Rule

When an agent changes Brittney, daemon, avatar, operator, dispatch, or receipt
behavior, it should preserve this separation:

```text
personal daemon identity
!= Brittney field continuity
!= HoloShell evidence substrate
```

If a future implementation makes the visible daemon and Brittney field the same
object, document that as a deliberate collapse and explain how user ownership,
privacy, receipt proof, and multi-daemon operation still work.
