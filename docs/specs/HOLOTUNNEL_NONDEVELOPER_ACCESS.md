# HoloTunnel Nondeveloper Access

**Status:** product ratchet
**Date:** 2026-05-19
**Layer:** HoloLand product surface
**Upstream primitive:** HoloScript Studio and HoloTunnel relay

## Decision

HoloLand owns quick and easy access. HoloScript Studio owns in-depth building.

```text
HoloScript Studio: expose, debug, inspect, control.
HoloLand: share, open, invite, enter.
```

That means HoloLand has more product-detail work than the tunnel itself. The
relay can be technically correct and still fail HoloLand if a nondeveloper sees
tunnel IDs, ports, counters, and raw local-server failure messages before they
understand what they can do.

## Product Promise

A nondeveloper should experience HoloTunnel-backed access as:

```text
Someone shared a live HoloLand world with me.
I can open it on this device or scan it into my headset.
If it fails, I get a clear next step.
```

The product should not feel like:

```text
Someone gave me a network tunnel and now I need to debug a developer machine.
```

## Primary Audiences

| Audience | What they need | What they should not need |
| --- | --- | --- |
| Player | Open the live world, join a party, return later if allowed. | Tunnel ID, local port, relay status. |
| Headset user | Scan a QR code and enter the experience safely. | Browser dev tools, exact proxy path. |
| Reviewer/client | Open a preview, know freshness, share feedback. | HoloScript Studio or MCP concepts. |
| Creator host | Share, revoke, extend, and see whether people can access it. | Raw WebSocket lifecycle. |
| Operator | See enough receipts to prove access and troubleshoot. | Force every recipient into advanced diagnostics. |

## Core User Journeys

### Share A World

```text
Host chooses Share World
  -> HoloLand checks readiness
  -> HoloLand asks audience and expiry
  -> HoloLand creates access card
  -> Host copies invite or shows QR
```

The host should see a product card, not a developer tunnel console.

Required visible fields:

- World or session name.
- Live status: preparing, live, needs attention, expired, or revoked.
- Primary access action: copy invite, open here, show QR, or open on headset.
- Audience scope: anyone with link, invited users, local device only, or review mode.
- Expiry or revocation state.
- Readiness summary: browser ready, headset ready, or fallback available.

Advanced-only fields:

- Tunnel ID.
- Direct `/t/:id` URL.
- Relay base.
- Local target.
- Proxy counters.
- Raw error details.

### Open An Invite

```text
Recipient opens invite
  -> HoloLand resolves the share/access object
  -> HoloLand checks whether the host is live
  -> HoloLand chooses the best device path
  -> Recipient enters the world or gets a plain next step
```

The recipient should never need to know whether the underlying access came from
a tunnel, deployed world, local preview, or future HoloLand hosting.

Plain failure states:

| State | Nondeveloper copy | Advanced detail |
| --- | --- | --- |
| Host offline | "The host is not live right now." | No active tunnel. |
| Expired | "This invite expired." | Expiry timestamp and receipt ID. |
| Revoked | "The host turned this invite off." | Revocation receipt. |
| Device unsupported | "This device can open the browser preview, but not headset mode." | WebXR capability result. |
| Safety blocked | "This share needs host approval before opening." | Policy gate and approval nonce. |
| Slow or unreachable | "The world is taking too long to respond." | Proxy timeout and relay request ID. |

### Open On Headset

```text
Host or recipient chooses Open On Headset
  -> HoloLand shows QR and short URL
  -> Headset opens stable access route
  -> HoloLand runs device/readiness checks
  -> User enters immersive view or falls back to browser preview
```

The headset path should prefer a stable HoloLand access URL or `/live` bookmark
over the direct tunnel URL. Direct tunnel URLs are for Studio debugging.

## Surface Model

HoloLand should represent tunnel-backed access as an access object:

```text
AccessCard
  world/session identity
  source provenance
  stable access URL
  QR/open actions
  audience and expiry policy
  readiness summary
  receipt and witness state
  advanced diagnostics
```

This object can appear in HoloShell, world build cockpit, creator preview, Quest
handoff, review mode, or future mobile companion surfaces.

## Copy Rules

Use product language first:

- "Share world"
- "Open on headset"
- "Copy invite"
- "Live now"
- "Host offline"
- "Invite expired"
- "Needs host approval"
- "Browser preview available"
- "Headset mode unavailable on this device"

Avoid exposing these terms on the first screen:

- Tunnel ID
- WebSocket
- Proxy
- `/t/:id`
- Localhost
- Port
- Relay counters

Those details belong behind an Advanced Details control for operators and
developers.

## Receipt Contract

HoloLand receipts should be safe to show in product surfaces. They should prove
access without leaking secrets or unnecessary local machine detail.

Suggested receipt shape:

```json
{
  "receiptVersion": "hololand.holotunnel-access.v1",
  "createdAt": "2026-05-19T00:00:00.000Z",
  "accessId": "access_...",
  "worldId": "world_...",
  "sessionName": "Frontier Shard Preview",
  "sourceRef": "apps/holoshell/source/...",
  "accessMode": "review|player|headset|operator",
  "audience": "anyone_with_link|invited|local_only",
  "stableUrl": "https://.../live",
  "directUrlAvailable": true,
  "expiresAt": "2026-05-19T01:00:00.000Z",
  "revokedAt": null,
  "readiness": {
    "browser": "ready",
    "headset": "ready|fallback|unknown",
    "safety": "approved|approval_required|blocked"
  },
  "witness": {
    "kind": "none|browser_open|headset_open|replay",
    "status": "pending|passed|failed"
  },
  "advanced": {
    "tunnelIdRedacted": true,
    "relayStatus": "summary"
  }
}
```

Developer-only data, including raw tunnel IDs and local ports, should stay in
the Studio or operator receipt unless the user explicitly opens advanced
diagnostics.

## Source-Backed Product Boundary

Because this is HoloLand product behavior, visible semantics should be backed by
HoloScript source before implementation hardens:

- `.holo`: access card room/object, QR/open affordance, visible states.
- `.hsplus`: access policy, audience/expiry/revoke rules, receipt contract.
- `.hs`: access pipeline from share intent to receipt and witness.
- TypeScript: narrow bridge only for browser APIs, QR rendering, local files,
  device probes, and relay calls.

Do not make this a TypeScript-only sharing implementation. If HoloLand needs a
missing reusable primitive, it should be requested or implemented upstream in
HoloScript.

## Integration With Studio

Studio should hand HoloLand a sanitized share packet, not a raw debugging dump.

Minimum packet:

```json
{
  "worldId": "world_...",
  "sessionName": "Frontier Shard Preview",
  "stableUrl": "https://.../live",
  "directUrl": "https://.../t/...",
  "sourceRef": "path/to/source.holo",
  "createdBy": "studio|agent",
  "expiresAt": "2026-05-19T01:00:00.000Z"
}
```

HoloLand then decides how much to expose:

- Recipients get stable access, QR, and plain status.
- Hosts get revoke/extend and readiness.
- Operators get advanced details.
- Developers go back to Studio for tunnel lifecycle debugging.

## First Build Slice

The first HoloLand slice should be small and nondeveloper-complete:

1. `Share World` action creates an access card from an existing tunnel/share packet.
2. Access card shows world name, stable URL, QR placeholder, expiry, and readiness.
3. Recipient view opens from stable URL and shows plain failure states.
4. Advanced Details reveals direct URL and tunnel status summary.
5. Receipt records access state, readiness, and witness status.
6. Source files exist for the visible flow before any bridge code becomes
   canonical.

Success is not "the tunnel connects." Success is "a nondeveloper can open the
world and understand what happened when they cannot."

Source ratchet:

- Room/object source: `apps/holoshell/source/holoshell-holotunnel-access-card.holo`
- Policy source: `apps/holoshell/source/holoshell-holotunnel-access-policy.hsplus`
- Pipeline source: `apps/holoshell/source/holoshell-holotunnel-access-pipeline.hs`
- Source map: `apps/holoshell/docs/HOLOSHELL_SOURCE_MAP.md`

These files define the product language, visible actions, hidden diagnostics,
failure copy, readiness states, and product-safe receipt boundary before any
runtime bridge claims the flow is implemented.
