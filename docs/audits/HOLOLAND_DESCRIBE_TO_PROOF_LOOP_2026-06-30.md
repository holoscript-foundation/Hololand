# HoloLand Describe-To-Proof Loop - 2026-06-30

Status: active tracer-bullet proof loop.

This receipt records the next HoloLand reboot slice after Agent Builder Proof 0:

```text
plain-language description
-> generated HoloScript world source
-> HoloScript CLI parse validation
-> HoloLand/HoloShell projection registration
-> rendered HTML proof surface
-> agent action trace
-> structured JSONL learning signal
```

## Source

- Contract source:
  `apps/holoshell/source/holoshell-describe-to-hololand-proof-loop.hsplus`
- Bridge command:
  `node scripts/holoshell-describe-to-hololand-proof-loop.mjs`
- Test:
  `node scripts/__tests__/holoshell-describe-to-hololand-proof-loop.test.mjs`

## Learning Signal

The bridge emits `.tmp/holoshell/describe-to-hololand-proof-loop/learning-signal.jsonl`
with three validated rows:

- `pattern`: description to generated HoloScript proof loop
- `decision`: source must parse before HoloLand projection
- `next_action`: cold-agent continuation command

These rows are corpus candidates for HoloTune or future HoloMesh knowledge
distillation. They are not adapter-promotion evidence by themselves; HoloTune
promotion still requires curated corpus, eval receipts, and founder-gated
promotion.

## Validation

Run:

```powershell
node scripts\__tests__\holoshell-describe-to-hololand-proof-loop.test.mjs
```

The test executes the bridge, validates the tracked `.hsplus` contract source
and generated `.holo` world source through the local HoloScript CLI, checks the
registration receipt, checks the render HTML, and parses the JSONL learning
signal.

Canonical proof run:

```powershell
node scripts\holoshell-describe-to-hololand-proof-loop.mjs --description "Turn the HoloLand reboot decisions into a source-first room where agents can inspect the generated HoloScript, validation, registration, receipt, and next command."
```

Result: pass.

Outputs:

- `.tmp/holoshell/describe-to-hololand-proof-loop/receipt.json`
- `.tmp/holoshell/describe-to-hololand-proof-loop/generated-world.holo`
- `.tmp/holoshell/describe-to-hololand-proof-loop/proof-loop.html`
- `.tmp/holoshell/describe-to-hololand-proof-loop/learning-signal.jsonl`

## HoloTune Runway

The proof loop emits corpus-candidate rows, but adapter promotion is still gated
by HoloTune governance. The safe runway run was:

```powershell
node scripts\holotune.mjs curate --identity agent_codex --out .scratch\holotune\agent_codex.jsonl
node scripts\holotune.mjs launch --identity agent_codex --corpus .scratch\holotune\agent_codex.jsonl
```

Result:

- curated identity: `agent_codex`
- corpus rows: `13`
- corpus hash:
  `sha256:1f1a57fdff28f563ac4781f275e8f38ece940c4beb094e341266c3dad8798ec0`
- launch mode: dry-run only
- launch run id: `run-mr05uwxy`
- launch receipt hash:
  `sha256:dd2ea32caed152ed3badc0086ece5dcc7b4c46bd59fa92df46fa2b9e64f411d3`

No GPU spend, adapter promotion, or GGUF serving was performed.
