# HoloLand Hardware Validation

HoloLand hardware claims are validated with a local `HardwareReceipt`. The receipt records the host runtime, WASM SIMD support, browser WebGPU/WebXR API surfaces, and any manual device notes from headset/mobile testing.

This harness is runtime tooling, not source-level product behavior. It is intentionally TypeScript-free and dependency-free so it can run before package installation and so HoloScript remains the source of truth for world semantics.

## Command

```bash
pnpm audit:hardware
```

Useful variants:

```bash
pnpm audit:hardware -- --no-browser
pnpm audit:hardware -- --self-test --no-browser
pnpm audit:hardware -- --json
pnpm audit:hardware -- --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
pnpm audit:hardware -- --manual-note "Quest 3 Browser: navigator.xr visible over HTTPS"
pnpm audit:hardware -- --output .tmp/hardware-receipts/local.json
```

Receipts default to `.tmp/hardware-receipts/`, which is ignored by git. Use `--output` when a specific artifact path is needed.

## What It Checks

The critical local checks are:

- Node.js v22 or newer.
- pnpm v9 or newer.
- WASM SIMD validation in Node.js using a minimal `v128.const` module.

The browser checks are advisory because WebGPU and WebXR are commonly gated by browser flags, secure context, attached devices, and headless mode:

- Chromium-family browser detection.
- `navigator.gpu` presence.
- `navigator.gpu.requestAdapter()` result when available.
- `navigator.xr` presence.
- Mobile/headset input surfaces such as touch points, `XRHand`, and `GamepadHapticActuator`.

Browser warnings do not fail the receipt. A warning means "recorded gap or inconclusive surface," not "platform broken." Re-run with a visible browser or headset and add `--manual-note` when the headless result does not represent the physical device.

## Receipt Shape

Each receipt uses schema `hololand.hardware-receipt.v1`:

```json
{
  "schemaVersion": "hololand.hardware-receipt.v1",
  "generatedAt": "2026-05-07T00:00:00.000Z",
  "taskSource": "hololand-audit-2026-05-07",
  "host": {
    "platform": "win32",
    "arch": "x64",
    "nodeVersion": "v24.15.0",
    "pnpmVersion": "10.28.2"
  },
  "checks": [
    {
      "id": "wasm-simd-node",
      "target": "WASM SIMD in Node.js",
      "status": "pass",
      "critical": true
    }
  ],
  "summary": {
    "status": "pass"
  }
}
```

Statuses are `pass`, `warn`, `skip`, and `fail`. Only critical `fail` checks make the command exit nonzero.
