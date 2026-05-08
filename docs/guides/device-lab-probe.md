# HoloLand Device Lab Probe

HoloLand hardware readiness claims need local receipts, not prose. The device
lab runner is a bridge-only tool: it probes the real machine or headset and
emits a HoloScript-compatible `ValidationReceipt` JSON envelope for later
review.

## Commands

Node-only probe:

```powershell
node scripts/device-lab-probe.mjs
```

Desktop browser WebGPU/WebXR probe:

```powershell
node scripts/device-lab-probe.mjs --browser --open
```

Quest/headset probe from the same LAN:

```powershell
node scripts/device-lab-probe.mjs --browser --host 0.0.0.0 --expect-headset --timeout-ms 120000
```

The headset command prints localhost and LAN URLs. Open the LAN URL in the
headset browser; the page posts its result back to the runner and the runner
writes a receipt.

Use `--device-kind <kind>` when the target surface is known. Valid values are
`quest3`, `quest3s`, `quest-pro`, `vision-pro`, `pico4`, `lookingglass`,
`lidar-scanner`, `camera-rig`, and `hardware-other`.

## Receipt Output

By default receipts are written under:

```text
.device-lab/receipts/<receipt-id>.json
```

Use `--out <path>` to write elsewhere, or `--json --no-write` to print the
receipt without creating a file. Hardware-specific receipts should usually stay
local unless the task explicitly asks to commit an evidence artifact.

Each receipt includes:

- `hardwareReceipts`: local runtime/GPU fingerprint hash and device metadata.
- `replayInputs`: the probes the runner attempted.
- `replayOutcomes`: pass/fail/skipped/error result for each probe.
- `metadata.gotchas`: device-specific blockers such as missing WebGPU,
  missing WASM SIMD, GPU inventory failure, browser timeout, or headset
  mismatch.
- `verificationCommands`: repeatable commands for node-only, desktop browser,
  and headset validation.

For headset/LAN checks, WebGPU and WebXR may require a secure browser context.
If the LAN URL reports `browser-context-not-secure`, rerun from a trusted local
HTTPS endpoint or another headset browser path that exposes WebGPU/WebXR.

## Status Semantics

`passed` means all requested probes passed. `failed` means a requested hardware
capability failed, such as WebGPU missing when the browser probe ran.
`inconclusive` means the runner produced useful local evidence but at least one
expected real-device layer was not exercised. The default node-only run is
therefore usually `inconclusive` because it does not prove browser/headset
WebGPU.

Do not mark a HoloLand hardware row `validated` until there is a receipt from
the actual target surface, for example a Quest browser run for Quest readiness.
