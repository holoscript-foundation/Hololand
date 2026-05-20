# HoloTunnel Target-Device Correction

Date: 2026-05-20

## Correction

The target-device WebXR path should not be treated as blocked by the absence of
a Quest USB/ADB cable. HoloTunnel is the intended wireless transport for this
slice: HoloScript creates the tunnel/share packet, and HoloLand turns that
packet into the nondeveloper access card, QR payload, and receipt.

The earlier ADB-only interpretation is incomplete. Cable absence blocks ADB
enumeration and USB log capture, not Quest access through HoloTunnel.

## Local Proof

I validated the HoloTunnel path with a live local-to-relay smoke test:

- Local proof server: `http://localhost:4310`
- Relay websocket: `wss://mcp-orchestrator-production-45f9.up.railway.app/tunnel-ws`
- Public tunnel URL: `https://mcp-orchestrator-production-45f9.up.railway.app/t/bf9524a132d946f2`
- Request: `GET /codex-proof?transport=holotunnel`
- Response: `200`, with `transport: "holotunnel"`, `proof: "codex-holotunnel-quest-proof-2026-05-20"`, and local host `localhost:4310`
- Response timestamp: `2026-05-20T06:05:10.27Z`
- Stable URL: `https://mcp-orchestrator-production-45f9.up.railway.app/live`
- Stable URL browser-style request: `200`, forwarded to local path `/` with the same proof token

The generated HoloTunnel share packet was then consumed by HoloLand's
nondeveloper access bridge:

- Share packet: `.bench-logs/holoshell-human-os-frontier/2026-05-20/holotunnel-correction/live-share-packet.json`
- Access receipt: `.bench-logs/holoshell-human-os-frontier/2026-05-20/holotunnel-correction/live-receipts/holotunnel-access-72b737886291ce.json`
- Receipt hash: `a0ed39ead2675d4d614c8f9bce3c95e3339dc57d20907b2f895448bcf30dc1f4`
- Receipt status: `live`
- Witness: `holotunnel-http-smoke`, `passed`
- Headset readiness: `wireless_route_ready`

## Validation

Passed:

```powershell
node scripts/__tests__/holoshell-holotunnel-access.test.mjs
node scripts/holoshell-holotunnel-access.mjs --self-test --json
node scripts/holoshell-holotunnel-access.mjs --share-packet .bench-logs/holoshell-human-os-frontier/2026-05-20/holotunnel-correction/live-share-packet.json --browser-readiness ready --headset-readiness wireless_route_ready --safety-state approved --witness-kind holotunnel-http-smoke --witness-status passed --json
```

## Remaining Headset Proof

The next target-device proof should open the stable HoloTunnel URL or generated
QR payload in Quest Browser and capture a headset-side visual/runtime witness.
That proof should not depend on ADB unless USB diagnostics are specifically
required.
