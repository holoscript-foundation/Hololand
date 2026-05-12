# IoT Digital Twins

`@hololand/iot-digital-twins` — IoT device discovery and HoloScript digital-twin generation.
Lives in [`packages/brittney/iot-digital-twins/`](../packages/brittney/iot-digital-twins/).

## Status

Alive. The 2026-05-07 [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
classifies `packages/brittney/*` as **Keep**. The IoT package emits HoloScript
source from device telemetry — that output is the product of the package, and
HoloScript remains source of truth for the resulting twin. See
[BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md) for the broader Brittney layout.

## What it does

The package converts an IoT device inventory (Home Assistant entity list, MQTT
discovery, or hand-authored device JSON) into a `.holo` composition that the
HoloLand runtime can render and a backend can two-way bind to physical devices.

| Stage | Source-of-truth file | Role |
|---|---|---|
| Mappings | [`device-mappings.ts`](../packages/brittney/iot-digital-twins/src/device-mappings.ts) | Per-device-class mapping rules: traits, geometry, state schema, default colour. |
| Generator | [`clawdbot-generator.ts`](../packages/brittney/iot-digital-twins/src/clawdbot-generator.ts) | Emits HoloScript composition from devices + spatial-layout strategy. |
| MQTT bridge | [`mqtt-bridge.ts`](../packages/brittney/iot-digital-twins/src/mqtt-bridge.ts) | Two-way state sync between physical devices and the HoloScript runtime. |
| Types | [`types.ts`](../packages/brittney/iot-digital-twins/src/types.ts) | `DeviceClass`, `DeviceMapping`, generator config types. |
| Public exports | [`src/index.ts`](../packages/brittney/iot-digital-twins/src/index.ts) | `DEVICE_MAPPINGS`, `ClawdbotGenerator`, `MQTTBridge`. |
| Tests | [`src/__tests__/`](../packages/brittney/iot-digital-twins/src/__tests__/) | `types.test.ts` — read for current behaviour contract. |

The supported device classes (`light`, `climate`, `camera`, `lock`, `switch`,
`sensor`, `binary_sensor`, `cover`, `media_player`, etc.) are enumerated in
[`device-mappings.ts`](../packages/brittney/iot-digital-twins/src/device-mappings.ts).
Read the file rather than pinning a count here — new classes are added as the
package grows.

## Demo

A working demo lives in
[`packages/brittney/iot-digital-twins/demo/`](../packages/brittney/iot-digital-twins/demo/):

| File | What it is |
|---|---|
| [`smart-home-showcase.mjs`](../packages/brittney/iot-digital-twins/demo/smart-home-showcase.mjs) | End-to-end script: device JSON in, `.holo` out, generation stats. |
| [`output/smart-home-dashboard.holo`](../packages/brittney/iot-digital-twins/demo/output/smart-home-dashboard.holo) | Latest generated twin. |
| [`visualizer.html`](../packages/brittney/iot-digital-twins/demo/visualizer.html) | Static browser preview of the output. |
| [`PRESENTATION_GUIDE.md`](../packages/brittney/iot-digital-twins/demo/PRESENTATION_GUIDE.md) | How to walk a stakeholder through the demo. |
| [`AUTOMATED_RECORDING.md`](../packages/brittney/iot-digital-twins/demo/AUTOMATED_RECORDING.md) | Headless recording rig. |

Run it:

```bash
node packages/brittney/iot-digital-twins/demo/smart-home-showcase.mjs
```

The script prints generation stats (device count, output LOC, time) — those
numbers come from the generator at runtime; do not pin them in docs, they will
drift with mappings + device input.

## Programmatic use

```ts
import { ClawdbotGenerator } from '@hololand/iot-digital-twins';

const generator = new ClawdbotGenerator({
  layoutStrategy: 'room',  // see types.ts for current options
  enableBindings: true,    // emit MQTT binding stubs
});

const result = await generator.generateFromHomeAssistant(devices, 'My Home');
// result.holoScript is the .holo source string.
```

Constructor options, return shape, and supported layout strategies are defined
in [`clawdbot-generator.ts`](../packages/brittney/iot-digital-twins/src/clawdbot-generator.ts)
and [`types.ts`](../packages/brittney/iot-digital-twins/src/types.ts) — read those
rather than relying on a doc list.

## MQTT sync

`MQTTBridge` ([`mqtt-bridge.ts`](../packages/brittney/iot-digital-twins/src/mqtt-bridge.ts))
opens a connection to a broker, subscribes to device topics, and publishes
state changes from the runtime. The wire protocol matches Home Assistant's
default MQTT discovery scheme. Connection options, topic patterns, and the
publish/subscribe surface are in the source.

## HoloScript-first contract

The package emits `.holo` source — that is the product. Per the
[HoloScript Source Contract](./HOLOSCRIPT_SOURCE_CONTRACT.md), the generated
HoloScript is the canonical representation of the digital twin; downstream
consumers (renderers, compilers, Studio) work from that source, not from the
TypeScript intermediate. The TS code in this package is the generator
(bridge/runtime work), not product behaviour.

## Compilation targets

The generated `.holo` runs through the standard HoloScript compile pipeline.
Discover live targets via the HoloScript MCP `tools/list` — do not pin a target
list here; the registry moves. See
[`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) for why this
indirection matters.

## Claims dropped

- **"24 devices / 18+ platforms / 50ms target / 408 LOC" badge counts** — those
  were specific to one demo run and burn stale on every mapping change. The
  demo prints live stats; the visualizer renders the live output; pinning
  numbers in docs broke F.014 (zero hardcoded stats).
- **Industrial / healthcare / agriculture ROI percentages** — synthetic and
  unverifiable. The package generates a twin from devices; downstream value is
  per-deployment.
- **Marketplace / Discord / signup CTAs** — community channels, not API
  surfaces; do not belong in package documentation.

## See also

- [BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md) — full Brittney sub-package layout.
- [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md) — why the
  emitted `.holo` is the product, not the TS generator.
- [audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
  — keep-in-scope audit.
