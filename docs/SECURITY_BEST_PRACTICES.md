# HoloLand Security Best Practices

> Generic web/app security (auth, encryption, input validation, OWASP Top
> 10, RBAC, SQL injection, XSS, CSRF) is HoloScript-canonical. This doc
> only covers **HoloLand-specific threat surfaces**: spatial, avatar,
> social, hardware, and `.holo` content moderation.

## HoloScript-canonical security material

Read these first; everything below assumes they are in force.

| Topic | Where |
|---|---|
| HoloScript security policy + vuln reporting | [`HoloScript/docs/security/SECURITY.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/security/SECURITY.md) |
| Production hardening guide (crypto, validation, rate limiting, RBAC) | [`HoloScript/docs/security/SECURITY_HARDENING_GUIDE.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/security/SECURITY_HARDENING_GUIDE.md) |
| Sandbox keys + input validation review | [`HoloScript/docs/security/sandbox-keys-input-validation-review.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/security/sandbox-keys-input-validation-review.md) |
| x402 threat model (agent payment / auth) | [`HoloScript/docs/security/x402-threat-model.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/security/x402-threat-model.md) |
| Agentic constitutional security (compiler-level firewalling) | [`HoloScript/docs/security/agentic-constitutionalism.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/security/agentic-constitutionalism.md) |

## HoloLand-specific threat surfaces

### Spatial threats

- **Personal-space invasion** — proximity in VR can be hostile. The
  avatar pipeline must enforce distance and occlusion rules. Source-of-
  truth: [`packages/ar/avatar-studio/`](../packages/ar/avatar-studio/) +
  [AVATAR_STUDIO_BRIDGE.md](./AVATAR_STUDIO_BRIDGE.md).
- **Position spoofing / impossible-speed cheats** — server-side
  movement validation belongs in the runtime service that owns
  multiplayer state. See [RUNTIME_SERVICE_CATALOG.md](./RUNTIME_SERVICE_CATALOG.md)
  for the live service surface; never trust client positions.
- **Geo-anchored content abuse** — anchored content can be weaponized
  to harass at locations. See [GEOSPATIAL_ANCHORING.md](./GEOSPATIAL_ANCHORING.md)
  for the anchoring trust model.

### Biometric / motion-tracking privacy

- VR motion data is biometric — gait, head sway, hand kinematics can
  re-identify a user. Treat motion streams as PII.
- Don't persist raw head/hand transforms beyond the session unless the
  user has explicitly consented and you have a deletion path.
- Aggregate before storing — averages and counts are fine; per-user
  per-frame transforms are not.
- Eye-tracking and face-blendshape data carry the same risk and require
  the same handling.

### Avatar pipeline

- VRM 1.0 export can embed metadata that leaks identity. Validate via
  the export pipeline in [`packages/ar/avatar-studio/src/VRMExporter.ts`](../packages/ar/avatar-studio/src/VRMExporter.ts);
  read [AVATAR_STUDIO_BRIDGE.md](./AVATAR_STUDIO_BRIDGE.md).
- Imported third-party avatars (post-RPM migration) carry unknown
  scripts/textures — apply the same content-moderation pipeline as user-
  uploaded `.holo`.
- Quality tier presets affect what's exported (`full`/`optimized`/
  `mobile`); know the tier before publishing — see
  [QUALITY_TIER_PROFILES.md](./QUALITY_TIER_PROFILES.md).

### `.holo` / `.hs` / `.hsplus` content moderation

- User-authored HoloScript runs in the renderer with the privileges of
  the HoloLand surface. The compiler is the lexical firewall (HoloScript
  agentic-constitutionalism) — do not bypass it by injecting raw
  TypeScript or `eval`-equivalents.
- All user-uploaded `.holo` files must pass through the
  HoloScript validator before being rendered. Reject anything that:
  - declares unregistered traits (compiler will already block this; do
    not patch around it)
  - exceeds polygon / texture / draw-call budgets per the active
    quality tier (see [QUALITY_TIER_PROFILES.md](./QUALITY_TIER_PROFILES.md))
  - imports unsigned external assets without provenance
- Hand-authored `.ts` / `.tsx` in user content is forbidden by
  [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md). If
  user contributions arrive as TypeScript, reject at intake — do not
  promote it to runtime.

### Social / multiplayer

- Social state lives in the platform runtime — see
  [DISTRIBUTED_SCENE_GRAPH.md](./DISTRIBUTED_SCENE_GRAPH.md) and
  [`docs/specs/SOCIAL_FEATURES_SPEC.md`](./specs/SOCIAL_FEATURES_SPEC.md)
  for what's authoritative server-side.
- Tiered chat enforcement lives in
  [`docs/specs/TIERED_CHAT_GAMEPLAN.md`](./specs/TIERED_CHAT_GAMEPLAN.md)
  — do not implement parallel chat surfaces that bypass it.
- Report/block surfaces are part of the platform; do not let
  HoloScript-authored worlds re-implement them.

### Hardware / device validation

- Hardware claims (Quest, Vision Pro, AR phones, desktop XR) require
  on-device validation receipts before product claims. See
  [HARDWARE_VALIDATION.md](./HARDWARE_VALIDATION.md).

## What is NOT HoloLand-specific

The original 2026-02-27 version of this doc included long sections on:
- OAuth 2.0 token management
- AES-256-GCM encryption at rest
- TLS 1.2+ enforcement
- SQL injection / parameterized queries
- File upload sanitization (mimetype, size, malware scan)
- Rate limiting via `express-rate-limit`
- WSS authentication
- DDoS protection / connection pooling
- bcrypt password hashing

All of that is generic web app security and is HoloScript-canonical or
upstream OWASP material. Do not duplicate it here. See the HoloScript
hardening guide linked above and:

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)

## Reporting vulnerabilities

Use the HoloScript-canonical reporting flow:
[`HoloScript/docs/security/SECURITY.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/security/SECURITY.md)
(GitHub Security Advisories on the HoloScript repo, or its email path).

For HoloLand-only spatial/avatar/social findings, file via the same
path and tag with `hololand-specific` in the report.

The original `security@hololand.io` mailbox, PGP key, and bug-bounty
table from the 2026-02-27 version are not verified to exist; use the
HoloScript path until confirmed.

## See also

- [HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md) — what HoloLand owns
- [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md) — `.ts`/`.tsx` are migration debt
- [HARDWARE_VALIDATION.md](./HARDWARE_VALIDATION.md) — on-device receipts
- [AGENT_HOLOSCRIPT_TOOLING.md](./AGENT_HOLOSCRIPT_TOOLING.md) — agent surfaces
