# Hololand Central - Accessibility & User Experience Game Plan

## Overview

Improve user accessibility and complete Phase 1 features for Hololand Central, the public VR hub and gateway to the Hololand metaverse.

**Current State**: Phase 0 Complete (7 zones, 5 themes, 16 easter eggs, basic onboarding)
**Goal**: WCAG 2.1 AA compliance + complete user experience features

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HOLOLAND CENTRAL                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  User Entry Flow                     │    │
│  │  Landing → Oasis → Onboarding → Tutorial → Central  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Desktop    │  │   Mobile    │  │     VR      │         │
│  │  Mouse/KB   │  │   Touch     │  │   WebXR     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           ▼                                  │
│             ┌───────────────────────┐                        │
│             │   Accessibility       │                        │
│             │   Layer (New)         │                        │
│             │   - ARIA labels       │                        │
│             │   - Keyboard nav      │                        │
│             │   - Screen reader     │                        │
│             │   - Reduced motion    │                        │
│             └───────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Current State (Audit Summary)

### Already Implemented

| Component | Location | Status |
|-----------|----------|--------|
| Tutorial Overlay | `src/components/TutorialOverlay.tsx` | 5-step guide |
| Oasis Entry | `src/components/OasisEntry.tsx` | 3-step onboarding |
| Mobile Controls | `src/components/MobileControls.tsx` | Virtual joystick |
| Hardware Detection | `src/services/HardwareDetectionService.ts` | Device-aware |
| Theme System | `src/themes/themes.ts` | 5 rotating themes |
| Easter Eggs | `src/easter-eggs/eggs.ts` | 16 eggs, detection working |

### Not Yet Implemented

| Component | Priority | Complexity |
|-----------|----------|------------|
| ARIA Labels | HIGH | Low |
| Keyboard Navigation | HIGH | Medium |
| Screen Reader Support | HIGH | Medium |
| Reduced Motion Toggle | MEDIUM | Low |
| Easter Egg Rewards UI | MEDIUM | Low |
| Voice Commands Wiring | MEDIUM | Medium |
| Social/Multiplayer Wiring | LOW | High |

---

## Implementation Tasks

### Phase 1: WCAG Accessibility (Priority: HIGH)

**1.1 ARIA Labels**

Location: All interactive components in `src/components/`

```typescript
// Example: TutorialOverlay.tsx
<button
  aria-label="Next tutorial step"
  aria-describedby="tutorial-step-description"
  role="button"
>
  Next
</button>

<div id="tutorial-step-description" className="sr-only">
  {currentStep.description}
</div>
```

Components to update:
- `TutorialOverlay.tsx` - Tutorial navigation buttons
- `OasisEntry.tsx` - Onboarding buttons
- `MobileControls.tsx` - Virtual joystick, action buttons
- `MenuOverlay.tsx` - Menu items
- All zone entry points in `src/worlds/`

**1.2 Keyboard Navigation**

Location: `src/accessibility/KeyboardNavigation.tsx` (NEW)

```typescript
interface KeyboardShortcuts {
  // Navigation
  'ArrowUp' | 'W': 'move-forward';
  'ArrowDown' | 'S': 'move-backward';
  'ArrowLeft' | 'A': 'move-left';
  'ArrowRight' | 'D': 'move-right';
  'Space': 'jump';

  // UI
  'Tab': 'focus-next';
  'Shift+Tab': 'focus-prev';
  'Enter': 'activate';
  'Escape': 'close-menu';

  // Accessibility
  '?': 'show-shortcuts';
  'M': 'toggle-motion';
  'H': 'toggle-high-contrast';
}
```

**1.3 Screen Reader Support**

Location: `src/accessibility/ScreenReaderAnnouncer.tsx` (NEW)

```typescript
interface ScreenReaderAnnouncer {
  announce(message: string, priority: 'polite' | 'assertive'): void;
  announceZoneChange(zoneName: string): void;
  announceInteraction(objectName: string, action: string): void;
}

// Usage
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announcement}
</div>
```

Announcements needed:
- Zone transitions ("Entering Builder Shop")
- Tutorial progress ("Step 2 of 5")
- Easter egg discoveries ("Easter egg found!")
- Theme changes ("Theme changed to Cyberpunk")

**1.4 Reduced Motion Toggle**

Location: `src/accessibility/MotionPreferences.tsx` (NEW)

```typescript
interface MotionPreferences {
  reducedMotion: boolean;
  setReducedMotion(enabled: boolean): void;
}

// Check system preference on load
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// Apply to animations
const animationDuration = reducedMotion ? 0 : 300;
```

Animations to control:
- Zone transitions
- Easter egg reveals
- Theme switching
- Tutorial step transitions
- Floating UI elements

---

### Phase 2: User Experience (Priority: MEDIUM)

**2.1 Easter Egg Rewards UI**

Location: `src/components/EasterEggRewardModal.tsx` (NEW)

```typescript
interface EasterEggReward {
  id: string;
  name: string;
  type: 'badge' | 'sticker' | 'emote' | 'title';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  imageUrl: string;
  unlockedAt: Date;
}

// Modal shows when egg is discovered
<EasterEggRewardModal
  reward={discoveredReward}
  onClose={() => setShowReward(false)}
  onEquip={(reward) => equipReward(reward)}
/>
```

Features:
- Animated reveal (respects reduced motion)
- Rarity-based visual effects
- "Equip" button for applicable rewards
- "View Collection" link
- Share to social (optional)

**2.2 Rewards Collection Page**

Location: `src/pages/CollectionPage.tsx` (NEW)

```typescript
// Grid view of all discovered easter eggs and rewards
<CollectionGrid>
  {rewards.map(reward => (
    <RewardCard
      key={reward.id}
      reward={reward}
      isEquipped={equipped.includes(reward.id)}
      onEquip={() => equipReward(reward.id)}
    />
  ))}
</CollectionGrid>

// Show undiscovered eggs as silhouettes
{undiscoveredEggs.map(egg => (
  <MysteryCard hint={egg.hint} zone={egg.zone} />
))}
```

**2.3 Voice Commands Wiring**

Location: `src/services/VoiceCommandService.ts` (UPDATE)

```typescript
// Already has detection, needs command handlers
const voiceCommands = {
  'go to [zone]': (zone) => navigateToZone(zone),
  'open menu': () => toggleMenu(),
  'help': () => showTutorial(),
  'theme': () => cycleTheme(),
  'back': () => goBack(),
};

// Wire to existing VoiceProcessor
voiceProcessor.onCommand((command) => {
  const handler = voiceCommands[command.intent];
  if (handler) handler(command.params);
});
```

---

### Phase 3: Social Wiring (Priority: LOW)

**3.1 Connect to @hololand/network**

Location: `src/services/MultiplayerService.tsx` (NEW)

```typescript
import { HololandNetwork } from '@hololand/network';

// Local-first: User hosts, friends join via ngrok
const network = new HololandNetwork({
  mode: 'local-host',  // or 'join'
  tunnelProvider: 'ngrok',
});

// Avatar sync
network.on('player-join', (player) => {
  spawnAvatar(player.id, player.avatar);
});

network.on('player-move', (player, position) => {
  updateAvatarPosition(player.id, position);
});

// Host session
async function hostSession() {
  const tunnel = await network.createTunnel();
  return tunnel.url; // https://abc123.ngrok.io
}
```

**3.2 Multiplayer UI**

Location: `src/components/MultiplayerPanel.tsx` (NEW)

- "Host Session" button
- Share link display
- "Join Session" input
- Player list
- Voice chat toggle

---

## File Changes Summary

### New Files

```
src/accessibility/
├── KeyboardNavigation.tsx      # Keyboard shortcut system
├── ScreenReaderAnnouncer.tsx   # Live region announcements
├── MotionPreferences.tsx       # Reduced motion toggle
├── AccessibilityProvider.tsx   # Context wrapper
└── index.ts

src/components/
├── EasterEggRewardModal.tsx    # Reward reveal modal
└── MultiplayerPanel.tsx        # Multiplayer UI

src/pages/
└── CollectionPage.tsx          # Rewards collection

src/services/
└── MultiplayerService.tsx      # Network integration
```

### Modified Files

```
src/components/TutorialOverlay.tsx    # Add ARIA labels
src/components/OasisEntry.tsx         # Add ARIA labels
src/components/MobileControls.tsx     # Add ARIA labels
src/components/MenuOverlay.tsx        # Add ARIA labels
src/App.tsx                           # Wrap with AccessibilityProvider
src/services/VoiceCommandService.ts   # Wire command handlers
```

---

## Testing Plan

### Accessibility Testing

1. **Screen Reader Testing**
   - NVDA (Windows)
   - VoiceOver (Mac/iOS)
   - TalkBack (Android)

2. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify focus indicators
   - Test all shortcuts

3. **WCAG Compliance**
   - Run axe-core automated tests
   - Manual color contrast check
   - Focus order verification

### User Experience Testing

1. **Easter Egg Flow**
   - Discover egg → Modal appears → Reward saved
   - View collection page
   - Equip reward

2. **Voice Commands**
   - Test each command
   - Error handling for unrecognized commands

3. **Multiplayer (when ready)**
   - Host session
   - Join via link
   - See other players

---

## Implementation Order

| Phase | Focus | Dependencies |
|-------|-------|--------------|
| 1.1 | ARIA Labels | None |
| 1.2 | Keyboard Navigation | 1.1 |
| 1.3 | Screen Reader | 1.1 |
| 1.4 | Reduced Motion | None |
| 2.1 | Easter Egg Rewards UI | None |
| 2.2 | Collection Page | 2.1 |
| 2.3 | Voice Commands | None |
| 3.1 | Multiplayer Service | @hololand/network |
| 3.2 | Multiplayer UI | 3.1 |

Phases 1.1-1.4 and 2.1-2.3 can run in parallel.
Phase 3 depends on @hololand/network being ready.

---

## Success Metrics

- WCAG 2.1 AA compliance (axe-core zero violations)
- All interactive elements keyboard accessible
- Screen reader announces all state changes
- Easter egg discovery → reward flow complete
- Voice commands working for core actions
- (Future) Friends can join via ngrok link

---

## Quick Wins (Start Here)

1. **Add ARIA labels to TutorialOverlay.tsx** (~30 min)
2. **Add reduced motion CSS media query** (~15 min)
3. **Create EasterEggRewardModal.tsx** (~1 hr)
4. **Add keyboard shortcut "?" for help** (~30 min)

These can be done immediately without dependencies.
