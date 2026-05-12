# HoloLand Central — Accessibility Gameplan

Plan for bringing [`examples/hololand-central/`](../../examples/hololand-central/)
to WCAG 2.1 AA + W3C XR Accessibility coverage.

> **Status:** plan, not shipped. The accessibility primitives exist as a
> standalone package (`@hololand/accessibility`), but Central does not yet
> consume them. The hololand-central app does NOT have a `src/accessibility/`
> folder — that's the gap this gameplan closes. Verify with
> `ls examples/hololand-central/src/accessibility/` (no such directory at the
> time of writing).

## What's already shipped

Central has the standard onboarding + control surfaces:

| Surface | Source-of-truth file |
|---|---|
| Tutorial overlay | [`examples/hololand-central/src/components/TutorialOverlay.tsx`](../../examples/hololand-central/src/components/TutorialOverlay.tsx) |
| Oasis onboarding entry | [`examples/hololand-central/src/components/OasisEntry.tsx`](../../examples/hololand-central/src/components/OasisEntry.tsx) |
| Mobile controls (virtual joystick) | [`examples/hololand-central/src/components/MobileControls.tsx`](../../examples/hololand-central/src/components/MobileControls.tsx) |
| Settings modal | [`examples/hololand-central/src/components/SettingsModal.tsx`](../../examples/hololand-central/src/components/SettingsModal.tsx) |
| Theme system | [`examples/hololand-central/src/themes/themes.ts`](../../examples/hololand-central/src/themes/themes.ts) |
| Easter eggs (proximity layer + eggs registry) | [`examples/hololand-central/src/easter-eggs/`](../../examples/hololand-central/src/easter-eggs/) (`EasterEggsProximityLayer.tsx`, `eggs.ts`, `usePlayerPosition.ts`) |
| Worlds / zones | [`examples/hololand-central/src/worlds/`](../../examples/hololand-central/src/worlds/), [`examples/hololand-central/src/zones/`](../../examples/hololand-central/src/zones/) |

The audit lists Central's strongest HoloScript surface as
[`zones/`](../../examples/hololand-central/src/zones/) (audit:
"Should exist; strongest HoloScript-first surface"). A11y work should land in
HoloScript per [HOLOSCRIPT_SOURCE_CONTRACT.md](../HOLOSCRIPT_SOURCE_CONTRACT.md)
where it expresses product behaviour, with TS bridges only where the DOM /
ARIA surface forces it.

## The accessibility package already exists

`@hololand/accessibility` is shipped and ready to be wired into Central:

| Module | Source-of-truth file |
|---|---|
| Manager | [`packages/platform/accessibility/src/AccessibilityManager.ts`](../../packages/platform/accessibility/src/AccessibilityManager.ts) |
| Bridge | [`packages/platform/accessibility/src/AccessibilityBridge.ts`](../../packages/platform/accessibility/src/AccessibilityBridge.ts) |
| HoloScript bridge | [`packages/platform/accessibility/src/HoloScriptAccessibilityBridge.ts`](../../packages/platform/accessibility/src/HoloScriptAccessibilityBridge.ts) |
| Haptics | [`packages/platform/accessibility/src/haptics.ts`](../../packages/platform/accessibility/src/haptics.ts) |
| Screen reader | [`packages/platform/accessibility/src/screenreader.ts`](../../packages/platform/accessibility/src/screenreader.ts) |
| Motor accommodations | [`packages/platform/accessibility/src/motor.ts`](../../packages/platform/accessibility/src/motor.ts) |
| Vision (colourblind / contrast) | [`packages/platform/accessibility/src/vision.ts`](../../packages/platform/accessibility/src/vision.ts) |
| Public exports | [`packages/platform/accessibility/src/index.ts`](../../packages/platform/accessibility/src/index.ts) |

Audit-classified: `packages/platform/accessibility` is a TS package with 0
HoloScript files; the audit notes "Accessibility rules should have HoloScript
policy/source if product behavior". A11y rules belong in HoloScript with the TS
package as the runtime bridge — that direction is open work.

## Gap

What Central needs that does not yet exist:

| Gap | Where it would land |
|---|---|
| ARIA labels on every interactive control in `examples/hololand-central/src/components/` | Inline edits to existing TSX (acceptable as bridge / accessibility-DOM work). |
| Keyboard navigation surface (focus order, shortcut registry) | New `examples/hololand-central/src/accessibility/KeyboardNavigation.tsx` consuming `@hololand/accessibility`. |
| Screen-reader announcer (zone changes, easter-egg discovery, theme switch) | `examples/hololand-central/src/accessibility/ScreenReaderAnnouncer.tsx` calling `AccessibilityManager.announceToScreenReader`. |
| Reduced-motion toggle (system preference + override) | `examples/hololand-central/src/accessibility/MotionPreferences.tsx`. |
| Easter-egg reward UI (modal + collection page) | `examples/hololand-central/src/components/EasterEggRewardModal.tsx`, `examples/hololand-central/src/pages/CollectionPage.tsx`. |
| Voice-command wiring | Update `examples/hololand-central/src/services/VoiceCommandService.ts` (verify file before editing — service shape may differ). |
| Multiplayer wiring (out-of-scope for a11y; tracked as Phase 3 below) | `examples/hololand-central/src/services/MultiplayerService.tsx`, depends on a `@hololand/network` surface. |

`examples/hololand-central/src/services/VoiceCommandService.ts` and
`@hololand/network` were referenced in the original gameplan; verify both exist
on disk before scheduling work against them. The original gameplan assumed
both — this refresh does not.

## Phases

### Phase 1 — WCAG 2.1 AA (HIGH)

1. **ARIA labels** on every interactive control in `src/components/` and
   zone entry points. Quick wins; touch existing TSX inline.
2. **Keyboard navigation** — new `src/accessibility/KeyboardNavigation.tsx`,
   wraps the app, exposes a shortcut registry. Integrate with
   `AccessibilityManager`'s motor module.
3. **Screen-reader support** — new `src/accessibility/ScreenReaderAnnouncer.tsx`
   delegating to `AccessibilityManager.announceToScreenReader` from
   `@hololand/accessibility`.
4. **Reduced-motion toggle** — `src/accessibility/MotionPreferences.tsx` honoring
   `prefers-reduced-motion` and an in-app override; consume from animation
   sites (zone transitions, easter-egg reveals, theme switches, tutorial).

### Phase 2 — UX (MEDIUM)

1. **Easter-egg reward modal** + **rewards collection page** — turns the
   already-shipped easter-egg detection (`src/easter-eggs/`) into a complete
   discover → reward → collection loop.
2. **Voice-command wiring** — connect existing voice service to handlers for
   common navigation / menu actions.

### Phase 3 — Multiplayer wiring (LOW)

Depends on a `@hololand/network` package being available. Not on the
critical a11y path.

## Testing

- **Automated:** axe-core in CI against the built Central app.
- **Screen readers:** NVDA (Windows), VoiceOver (macOS / iOS), TalkBack (Android).
- **Keyboard:** tab through every interactive surface; verify focus indicators.
- **Reduced motion:** toggle the OS preference and verify animation suppression.

## Success criteria

- WCAG 2.1 AA pass (axe-core: zero violations).
- Every interactive control reachable by keyboard.
- Screen reader announces zone transitions, easter-egg discovery, theme changes.
- Reduced-motion preference suppresses zone-transition / easter-egg /
  theme-switch animations.
- HoloScript-side accessibility policies expressed in `.holo` / `.hs` /
  `.hsplus` source where they describe product behaviour, per
  [HOLOSCRIPT_SOURCE_CONTRACT.md](../HOLOSCRIPT_SOURCE_CONTRACT.md).

## Quick wins

- Add ARIA labels to [`TutorialOverlay.tsx`](../../examples/hololand-central/src/components/TutorialOverlay.tsx).
- Add a `prefers-reduced-motion` CSS guard in [`styles.css`](../../examples/hololand-central/src/styles.css).
- Add `?` keyboard shortcut → opens tutorial.
- Wire screen-reader announce on zone change in
  [`zones/`](../../examples/hololand-central/src/zones/) entry points.

## Claims dropped

- **"Phase 0 Complete (7 zones, 5 themes, 16 easter eggs)" hardcoded counts** —
  re-verify by listing the live directories. F.014 (zero hardcoded stats).
- **"Hardware Detection Service at `src/services/HardwareDetectionService.ts`"
  / "Menu overlay at `src/components/MenuOverlay.tsx`"** — neither file was
  verified on disk in this refresh; verify before editing. The plan above only
  cites files that I confirmed exist.

## See also

- [`packages/platform/accessibility/src/index.ts`](../../packages/platform/accessibility/src/index.ts)
  — public API the gameplan consumes.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](../HOLOSCRIPT_SOURCE_CONTRACT.md) — a11y
  rules belong in HoloScript when they describe product behaviour.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](../audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
  — `packages/platform/accessibility` flagged as needing HoloScript source.
