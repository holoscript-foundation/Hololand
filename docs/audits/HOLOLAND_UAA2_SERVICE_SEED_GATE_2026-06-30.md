# HoloLand uaa2-service Seed Gate

Status: promoted seed, current source-first gate.

The archived `Hololand uaa2-service Integration` seed is useful, but not as a
direct runtime dependency plan. Current HoloLand treats it as a builder-proof
gate:

```text
archive seed -> HoloScript gate source -> read-only wild intake ->
adapter-required promotion map -> receipt -> learning signal
```

## Source

- Gate source: `apps/holoshell/source/holoshell-uaa2-service-seed-gate.hsplus`
- Bridge: `scripts/holoshell-uaa2-service-seed-gate.mjs`
- Test: `scripts/__tests__/holoshell-uaa2-service-seed-gate.test.mjs`
- Seed: `docs/archive/HOLOLAND_UAA2_INTEGRATION.md`
- Wild intake: `scripts/holoshell-wild-holoscript-intake.mjs`

## Decision

HoloLand may consume validated HoloScript produced by agents and may scan
`uaa2-service` as a read-only wild HoloScript corpus. It must not import
`uaa2-service` internals or claim direct backend runtime integration without a
separate source contract and adapter receipt.

Retired from current HoloLand runtime scope:

- direct HoloLand-to-uaa2 API dependency as the product contract
- payment splits as an implementation claim
- true singularity operations as a current product requirement

Promoted into the current gate:

- prompt-to-HoloScript builder proof
- wild source compatibility corpus
- adapter-required promotion map
- validated JSONL learning signal

## Canonical Run

```powershell
node scripts\holoshell-uaa2-service-seed-gate.mjs --uaa2-root C:\Users\josep\Documents\GitHub\uaa2-service
```

Expected outputs:

- `.tmp/holoshell/uaa2-service-seed-gate/receipt.json`
- `.tmp/holoshell/uaa2-service-seed-gate/wild-holoscript-intake.json`
- `.tmp/holoshell/uaa2-service-seed-gate/wild-holoscript-intake.js`
- `.tmp/holoshell/uaa2-service-seed-gate/learning-signal.jsonl`

Canonical local result on 2026-06-30:

- Receipt status: `pass`
- Receipt hash: `168af2bfd8450dff37cd0a92d91bf1376bc8866bad3f5e038e7c9fe57a8b9abf`
- Seed review: `reviewed`
- Real seed signals: `ai_assisted_building`, `agent_services`,
  `payment_processing`, `holoscript_output`
- Speculative markers retained as research-only: `20`
- Wild scan: `47` files (`3` `.holo`, `5` `.hs`, `39` `.hsplus`)
- Adapter-needed files: `4`
- Frontier-syntax files: `36`
- Canonical candidates: `7`
- Top pattern: `xr_world`
- Next move: `promote_terminal_and_brittney_modules_with_adapter_receipts`

## Validation

Run before closing the seed promotion:

```powershell
node --check scripts\holoshell-uaa2-service-seed-gate.mjs
node --check scripts\__tests__\holoshell-uaa2-service-seed-gate.test.mjs
node scripts\__tests__\holoshell-uaa2-service-seed-gate.test.mjs
node C:\Users\josep\Documents\GitHub\HoloScript\packages\cli\dist\cli.js parse C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-uaa2-service-seed-gate.hsplus
node scripts\holoshell-uaa2-service-seed-gate.mjs --uaa2-root C:\Users\josep\Documents\GitHub\uaa2-service
```

## HoloTune Runway

The bridge emits three corpus-candidate rows:

- `pattern`: uaa2-service seed as source gate
- `decision`: direct service dependency retired
- `next_action`: promote flagship adapters

These rows are training candidates only after the receipt status is `pass`.
