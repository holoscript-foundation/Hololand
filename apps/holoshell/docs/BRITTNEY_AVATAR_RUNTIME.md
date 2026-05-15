# Brittney Avatar Runtime

HoloShell treats Brittney as an embodied shell actor, not a mascot beside a
chat box. The visual avatar is a HoloLand runtime projection of HoloScript's
canonical `@holoscript/aibrittney` agent loop and avatar trait contracts.

## Source Contract

```text
apps/holoshell/source/holoshell-brittney-avatar.hsplus
```

This source names the runtime package, agent events, avatar embodiment traits,
voice hook, accessibility handle, policies, and receipt behavior.

Runtime turns are specified by:

```text
apps/holoshell/source/holoshell-brittney-runtime-bridge.hsplus
```

That contract maps AIBrittney events into avatar states and shell-object
proposals.

## Manifest Bridge

```text
scripts/holoshell-brittney-avatar.mjs
```

The bridge reads HoloScript package metadata and source anchors from the local
HoloScript checkout, then writes:

```text
.tmp/holoshell/brittney-avatar.json
.tmp/holoshell/brittney-avatar.js
```

The manifest records whether `@holoscript/aibrittney`, `runAgentTurn`,
`Session`, avatar traits, and voice hooks are present. It only records route
class such as `local`, `lan`, or `remote`; it does not write API keys or
secrets into the shell feed.

The turn bridge is:

```text
scripts/holoshell-brittney-turn.mjs
```

It imports the built HoloScript `@holoscript/aibrittney` package, sends the
user prompt into `runAgentTurn`, records runtime events, classifies shell
object proposals, and writes the latest turn receipt to:

```text
.tmp/holoshell/brittney-turn-latest.json
.tmp/holoshell/brittney-turn-latest.js
```

## HoloShell Projection

`prototype/local-capability-room.html` consumes the manifest through
`live-feed.js` and renders Brittney as a focusable avatar button with:

- keyboard focus and `Alt+B` activation,
- screen-reader live status,
- runtime/emotion/voice state attributes,
- lip-sync and voice-ring states,
- microphone-gated voice input when browser speech recognition is available,
- latest runtime turn/proposal receipts,
- receipt/evidence rows in Shell Memory.

## Boundary

HoloScript owns the intelligence substrate and traits. HoloLand owns the
product embodiment: how Brittney appears in the operating shell, how she is
made reachable, and which receipts prove her runtime route and shell effects.
