# Geospatial Anchoring

HoloLand's persistent, cross-platform AR anchor system. Uses WGS84 (lat/lon/alt) as the universal reference frame so anchors survive sessions, share across users, and work on any AR runtime.

Two layers: a per-platform AR anchor / fiducial / VPS layer ([`packages/ar/anchors/`](../packages/ar/anchors/)) for fiducials, GPS, VPS, and coordinate transforms; and a HoloLand-side WGS84 + IndexedDB + sharing layer ([`packages/platform/spatial/`](../packages/platform/spatial/)) for the persistent geospatial anchors that products consume.

## Status

Alive. Bridge code is permitted under the [HoloScript Source Contract](./HOLOSCRIPT_SOURCE_CONTRACT.md) for hardware/runtime adapters; semantic anchor schemas should move upstream into HoloScript when promoted.

## Modules

### `packages/platform/spatial/` — geospatial system

| Module | Source-of-truth file | Role |
|---|---|---|
| Top-level system | [`GeospatialAnchorSystem.ts`](../packages/platform/spatial/GeospatialAnchorSystem.ts) | `init`, `createAnchor`, `getAnchor`, `queryNearby`, `anchorToLocalPose`, `publishAnchor`, `fetchSharedAnchors`, `shareAnchor`, `deleteAnchor`. |
| Coordinate converter | same file (class `GeospatialCoordinateConverter`) | `wgs84ToENU`, `enuToWGS84`, `haversineDistance`, `calculateBearing`. Flat-earth approximation valid <10 km. |
| IndexedDB storage | same file (class `GeospatialAnchorStorage`) | CRUD with lat/lon/createdBy/createdAt indexes. Brute-force radius filter today (acceptable <10K anchors). |
| AR-platform integration | same file (class `ARPlatformIntegration`) | Detects ARCore / ARKit / WebXR / HoloLens capabilities. |
| Sharing protocol | same file (class `GeospatialSharingProtocol`) | Publish, fetch, share, delete via server endpoint. |
| Public exports | [`index.ts`](../packages/platform/spatial/index.ts) | Re-exports the system + types and pulls `CoordinateTransform` + pose types from `packages/ar/anchors`. |

### `packages/ar/anchors/` — AR anchor layer

| Module | Source-of-truth file | Role |
|---|---|---|
| Anchor service | [`AnchorService.ts`](../packages/ar/anchors/src/AnchorService.ts) | Multi-source anchor fusion (QR, AprilTag, GPS, VPS), alignment quality, lifecycle events. |
| Coordinate transform | [`CoordinateTransform.ts`](../packages/ar/anchors/src/CoordinateTransform.ts) | Local ↔ world pose math; `composePoses`, `invertPose`, `interpolatePoses`. |
| Detectors | [`detectors/`](../packages/ar/anchors/src/detectors/) | QR, AprilTag, GPS, VPS providers. |
| Types | [`types.ts`](../packages/ar/anchors/src/types.ts) | `Pose`, `Vector3`, `Quaternion`, `AnchorType`. |

## Why WGS84 as the universal frame

ARCore, ARKit, WebXR, and HoloLens use incompatible session-local coordinate systems that reset between sessions and don't interoperate. WGS84 is the only frame that's global, persistent across sessions, and shareable across devices. Trade-off: meter-level accuracy outdoors vs. the centimeter-level accuracy of native AR tracking. The system runs WGS84 ↔ ENU at the rendering boundary so anchors *store* universally and *render* locally. See [`packages/platform/spatial/GeospatialAnchorSystem.ts`](../packages/platform/spatial/GeospatialAnchorSystem.ts) preamble for the full rationale.

## Two-package split

`packages/ar/anchors` covers the *device-relative* anchor problem: detect a fiducial / GPS / VPS observation, build a local→world transform, expose pose math. `packages/platform/spatial` builds on that to make anchors *persistent and shareable* via WGS84 + IndexedDB + a sharing protocol. Most product code consumes the spatial layer; ar-anchors is the lower-level primitive.

## AR runtime support

`ARPlatformIntegration.detectCapabilities()` returns a `PlatformCapabilities` shape with `platform` (`arcore` / `arkit` / `webxr` / `hololens` / `unknown`), `supportsGeospatial`, `supportsVPS`, and accuracy estimates. Each platform has a different best path:

| Platform | Path | Notes |
|---|---|---|
| ARCore (Android) | Geospatial API + VPS fusion | Best accuracy where covered. Requires native bridge. |
| ARKit (iOS) | Location Anchors | GPS + barometer altitude. Outdoor-best. |
| WebXR (browser) | Manual GPS → ENU fallback | No native geospatial-anchor support; conversion happens in JS. |
| HoloLens | Spatial anchors (Mixed Reality) | Indoor-strong; outdoor-weak. |

The native bridges into ARCore Geospatial API and ARKit Location Anchors are wired through `packages/ar/anchors`'s VPS / GPS providers; the WebXR path uses `wgs84ToENU` directly.

## Demo

[`packages/platform/demos/geospatial-anchoring/`](../packages/platform/demos/geospatial-anchoring/) — create anchors at the current GPS, query nearby anchors, render AR content.

## See also

- [`packages/platform/spatial/README.md`](../packages/platform/spatial/README.md) — package-level README and quick-start.
- [`packages/ar/anchors/README.md`](../packages/ar/anchors/README.md) — fiducial / GPS / VPS API reference.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) — semantic anchor schemas should move upstream.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md).
