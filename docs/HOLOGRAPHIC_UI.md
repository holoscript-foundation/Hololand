# Holographic UI Guide

**The Future of Spatial Interface Design**

HoloLand's holographic UI system creates an intuitive, non-intrusive interface for VR/AR experiences. Inspired by advanced AR systems, it combines gesture control, voice commands, and spatial awareness for seamless interaction.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Interface States](#interface-states)
3. [Gesture Controls](#gesture-controls)
4. [Voice Commands](#voice-commands)
5. [UI Components](#ui-components)
6. [Spatial Interaction](#spatial-interaction)
7. [Accessibility](#accessibility)
8. [Developer Integration](#developer-integration)

---

## Design Philosophy

### Core Principles

**1. Immersion First**
- UI hidden by default - you see the world, not menus
- Minimal persistent elements (compass, friend indicators)
- Appears only when invoked or contextually needed
- Smooth fade-in/out animations

**2. Spatial Native**
- Panels float in 3D space at comfortable viewing distance
- Follow your gaze naturally (subtle, non-intrusive tracking)
- Depth and parallax for realistic holographic effect
- Can be grabbed and repositioned in space

**3. Gesture-Driven**
- Primary input is natural hand gestures
- Swipe, pinch, point, grab
- No need to reach for controllers constantly
- Works with hands or controllers

**4. Voice-Augmented**
- Natural language commands
- "Show worlds" - instant response
- Fallback when hands are occupied
- Optional for accessibility

**5. Context-Aware**
- Shows relevant options based on activity
- Near portal → show destination info
- Near player → show social options
- Building mode → show creation tools

---

## Interface States

### Minimal State (Default)

**What you see:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         WORLD VIEW (Full)           │
│                                     │
│                                     │
│  ○ ○ ○            N                │  ← Friend dots + compass
└─────────────────────────────────────┘
```

**Elements:**
- **Friend Indicators** - Small colored dots showing nearby friends (bottom-left)
- **Compass** - Subtle directional indicator (bottom-right)
- **Notifications** - Toast messages slide in from right (auto-dismiss)

**When active:**
- Exploring worlds
- Playing games
- Watching events
- Any time full immersion is desired

### Menu State (Swipe Up)

**What you see:**
```
┌─────────────────────────────────────┐
│  ╔═══════════════════════════════╗ │
│  ║  🌍 Worlds    👥 Friends      ║ │  ← Main menu bar
│  ║  🎒 Inventory  ⚙️ Settings    ║ │
│  ╚═══════════════════════════════╝ │
│                                     │
│         WORLD VIEW (Dimmed)         │
│                                     │
│  [Panels can overlay here]         │
└─────────────────────────────────────┘
```

**Elements:**
- **Menu Bar** - Floats at top of vision, 4 primary sections
- **Background Dim** - World darkens 30% for focus
- **Selected Panel** - Expands below menu when tapped

**When active:**
- Need to browse worlds
- Check friends list
- Access inventory
- Adjust settings

### Panel State (Menu Item Selected)

**What you see:**
```
┌─────────────────────────────────────┐
│  ╔═══════════════════════════════╗ │
│  ║  🌍 Worlds    👥 Friends      ║ │
│  ╚═══════════════════════════════╝ │
│  ╔═══════════════════════════════╗ │
│  ║  World Browser               ║ │
│  ║  ─────────────────────────── ║ │
│  ║  🔍 Search...                ║ │
│  ║                               ║ │
│  ║  [3D Portal Preview]         ║ │  ← Interactive 3D miniature
│  ║  "Neon City Racers"          ║ │
│  ║  👥 2,431  ⭐ 4.8  🔥 #4    ║ │
│  ║                               ║ │
│  ║  [Visit] [Favorite] [Share]  ║ │
│  ╚═══════════════════════════════╝ │
│         WORLD VIEW (More dimmed)    │
└─────────────────────────────────────┘
```

**Elements:**
- **Menu Bar** - Stays at top for quick switching
- **Active Panel** - Full details and interaction
- **3D Previews** - Miniature worlds rotate in space
- **Action Buttons** - Large, easy to tap

---

## Gesture Controls

### Primary Gestures

#### Swipe Up (Open Menu)

**How to perform:**
1. Place palm facing up at bottom of vision
2. Swipe hand upward quickly
3. Menu bar appears at top

**Alternative:**
- Controller: Joystick up + A button
- Voice: "Show menu"

#### Swipe Down (Dismiss All)

**How to perform:**
1. Hand at top of vision, palm down
2. Swipe downward
3. All UI panels close

**Alternative:**
- Controller: Joystick down + B button
- Voice: "Hide menu"

#### Swipe Left/Right (Cycle Panels)

**How to perform:**
1. With menu open
2. Swipe hand left/right in front of panel
3. Cycles through tabs/options

**Alternative:**
- Controller: Joystick left/right
- Touch: Swipe on panel itself

#### Point & Tap (Select)

**How to perform:**
1. Point index finger at UI element
2. Tap in air or press trigger
3. Element activates

**Visual feedback:**
- Cursor appears where you're pointing
- Element highlights on hover
- Haptic pulse on selection

#### Pinch & Drag (Move Panel)

**How to perform:**
1. Pinch thumb and index at panel edge
2. Drag to reposition panel
3. Release to place

**Use case:**
- Move panels to comfortable positions
- Position multiple panels side-by-side
- Clear view of world behind panels

#### Double Tap (Quick Actions)

**How to perform:**
1. Quickly tap twice in air (no pointing)
2. Quick actions wheel appears

**Actions available:**
```
        [📷 Camera]
             ↑
  [😄 Emotes] ← ● → [🎒 Inventory]
             ↓
       [⚙️ Settings]
```

**Alternative:**
- Controller: Double-click A button
- Voice: "Quick actions"

### Gesture Detection Zones

```
        [Head Zone - Menu bar area]
              ↓
    ╔═══════════════════════╗
    ║ Menu: Swipe here      ║
    ╚═══════════════════════╝
         ↓ [Interaction Zone] ↓
    ╔═══════════════════════╗
    ║                       ║
    ║  Point, Tap, Pinch    ║
    ║  Most UI here         ║
    ║                       ║
    ╚═══════════════════════╝
         ↓ [Lower Zone] ↓
      Persistent indicators
```

---

## Voice Commands

### Global Commands

| Command | Action |
|---------|--------|
| "Show menu" | Open main menu |
| "Hide menu" | Close all panels |
| "Show worlds" | Open world browser |
| "Show friends" | Open friends list |
| "Show inventory" | Open inventory panel |
| "Settings" | Open settings |
| "Help" | Context-sensitive help |

### Navigation Commands

| Command | Action |
|---------|--------|
| "Go to [world name]" | Quick travel to world |
| "Go to hub" | Return to HoloLand Central |
| "Follow [friend name]" | Join friend's world |
| "Go home" | Return to personal space |

### Social Commands

| Command | Action |
|---------|--------|
| "Call [friend name]" | Voice call friend |
| "Invite [friend name]" | Send world invite |
| "Party invite [friend]" | Add to party |
| "Mute all" / "Unmute all" | Toggle all voice |

### Action Commands

| Command | Action |
|---------|--------|
| "Take photo" | Screenshot |
| "Record" / "Stop recording" | Video capture |
| "Emote [name]" | Play emote animation |
| "Wave" / "Dance" / "Clap" | Quick emotes |

### Building Commands (Creation Mode)

| Command | Action |
|---------|--------|
| "Create [object]" | Spawn object |
| "Delete this" | Remove selected object |
| "Copy this" | Duplicate object |
| "Save world" | Save changes |
| "Undo" / "Redo" | Undo/redo actions |

---

## UI Components

### World Browser Panel

**Purpose:** Discover and join worlds

```
╔══════════════════════════════════════╗
║  🌍 World Browser                    ║
║  ─────────────────────────────────── ║
║  🔍 [Search: racing, horror, etc.]   ║
║  ─────────────────────────────────── ║
║  🔥 Trending    ⭐ Top     🆕 New   ║
║  🎮 Games       🎨 Creative          ║
║  ─────────────────────────────────── ║
║  ┌────────────────────────────────┐  ║
║  │  [3D Portal Preview - Rotates] │  ║  ← 3D miniature world
║  └────────────────────────────────┘  ║
║                                      ║
║  Neon City Racers                    ║
║  by @SpeedDemon                      ║
║  ─────────────────────────────────── ║
║  ⭐ 4.7/5  👥 523 online  🔥 #4     ║
║  🎮 Racing  🌃 Cyberpunk  💵 Free   ║
║  ─────────────────────────────────── ║
║  [Visit World] [Favorite] [Share]   ║
║  ─────────────────────────────────── ║
║  < Previous    1 of 247    Next >    ║
╚══════════════════════════════════════╝
```

**Interactions:**
- Tap portal preview to rotate 360°
- Pinch/zoom on preview for closer look
- Swipe left/right for next/previous
- Tap "Visit World" to portal instantly

### Friends Panel

**Purpose:** See online friends and join them

```
╔══════════════════════════════════════╗
║  👥 Friends (12 online / 48 total)   ║
║  ─────────────────────────────────── ║
║  🔍 [Search friends...]              ║
║  ─────────────────────────────────── ║
║  🟢 Alex                             ║
║     📍 Medieval Castle Quest          ║
║     Online 23min                      ║
║     [Join] [Call] [Message]          ║
║  ─────────────────────────────────── ║
║  🟢 Jordan                           ║
║     📍 Beach Sunset Hangout           ║
║     Online 1hr                        ║
║     [Join] [Call] [Message]          ║
║  ─────────────────────────────────── ║
║  🔵 Sam                              ║
║     Last seen: 2 hours ago            ║
║     [Message] [Profile]               ║
║  ─────────────────────────────────── ║
║  [+ Add Friend]  [Find Friends]      ║
╚══════════════════════════════════════╝
```

**Status Colors:**
- 🟢 Green - Online
- 🔵 Blue - Away
- ⚪ Gray - Offline

**Interactions:**
- Tap "Join" to portal to friend's world
- Tap "Call" for voice chat
- Tap name for full profile

### Inventory Panel

**Purpose:** Manage items and equipment

```
╔══════════════════════════════════════╗
║  🎒 Inventory                        ║
║  ─────────────────────────────────── ║
║  👕 Wearables  🎨 Items  🛠️ Tools  ║
║  ─────────────────────────────────── ║
║  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    ║
║  │[👔]│ │[🎩]│ │[🥽]│ │[👟]│ │[🎒]│  ║  ← 3D item previews
║  └───┘ └───┘ └───┘ └───┘ └───┘    ║
║  Suit   Hat  Visor Shoes  Bag      ║
║  ─────────────────────────────────── ║
║  Selected: Cyberpunk Jacket          ║
║  ┌────────────────────────────────┐  ║
║  │  [3D Preview - Avatar Wearing] │  ║
║  └────────────────────────────────┘  ║
║  Rarity: Epic  ⭐⭐⭐⭐              ║
║  Creator: @NeonStyle                 ║
║  ─────────────────────────────────── ║
║  [Equip] [Unequip] [Sell] [Trade]  ║
╚══════════════════════════════════════╝
```

**Interactions:**
- Drag items onto avatar to equip
- Tap item for 3D preview
- Long-press for item details

### Settings Panel

**Purpose:** Configure preferences

```
╔══════════════════════════════════════╗
║  ⚙️ Settings                         ║
║  ─────────────────────────────────── ║
║  🎮 Controls  🎨 Graphics  🔊 Audio ║
║  👤 Account   🔒 Privacy   ℹ️ About  ║
║  ─────────────────────────────────── ║
║  🎮 Controls                         ║
║  ─────────────────────────────────── ║
║  ✅ Gesture Controls Enabled         ║
║  ✅ Voice Commands Enabled           ║
║  ⬜ Snap Turning                     ║
║  ✅ Smooth Locomotion                ║
║                                      ║
║  Comfort Mode: ● Medium              ║
║  ────────●──────────────             ║
║  Low    Med    High    Max           ║
║                                      ║
║  Personal Space Bubble: 1.5m         ║
║  ────────────●──────────             ║
║  0m    1m    2m    3m    5m          ║
║  ─────────────────────────────────── ║
║  [Save Changes] [Reset Defaults]     ║
╚══════════════════════════════════════╝
```

---

## Spatial Interaction

### In-World UI Elements

**Portal Previews**

When near a portal:
```
         [Portal Object]
              │
              ├─ Destination name floats above
              ├─ Creator name below
              ├─ Player count indicator
              └─ [Interaction prompt on gaze]
```

**Player Name Tags**

Above each player:
```
         [Alex]  ← Name
         🎤 Lv.25 ← Voice active + Level
```

**Object Interaction Prompts**

When looking at interactable objects:
```
    [Treasure Chest]
         │
    Press A to Open
```

**World Info Panel**

Appears on world entry (5 seconds, then fades):
```
╔══════════════════════════════════╗
║  Welcome to:                     ║
║  ★ NEON CITY RACERS ★           ║
║  by @SpeedDemon                  ║
║  ─────────────────────────────── ║
║  👥 523 players here now         ║
║  ⭐ 4.7/5 (2,431 reviews)        ║
╚══════════════════════════════════╝
```

---

## Accessibility

### Vision Accessibility

**High Contrast Mode**
- UI panels use 4.5:1 contrast ratio minimum
- Option for black/white high-contrast themes
- Adjustable text size (100%-200%)

**Color Blind Support**
- Friend status uses shapes + colors
- Important info doesn't rely on color alone
- Deuteranopia/Protanopia/Tritanopia modes

### Hearing Accessibility

**Visual Indicators**
- Voice chat shows visual waveform
- Sounds trigger on-screen indicators
- Subtitles for all audio cues

### Motor Accessibility

**Alternative Inputs**
- Full voice control (no hands needed)
- Eye gaze tracking support
- Switch control support
- Customizable hold durations
- Simplified gesture options

### Cognitive Accessibility

**Reduced Motion**
- Option to disable animations
- Instant panel transitions
- No auto-moving UI elements

**Simplified UI**
- "Simple Mode" with fewer options
- Larger buttons, more spacing
- Clear, plain language
- Optional guided tutorials

---

## Developer Integration

### Using Holographic UI in Your Worlds

```typescript
import { HolographicUI } from '@hololand/ui';

// Show custom panel
const myPanel = HolographicUI.createPanel({
  title: 'My Custom UI',
  width: 400,
  height: 600,
  position: { x: 0, y: 1.5, z: -1 },  // In front of player
  content: `
    <div class="panel-content">
      <h2>Welcome!</h2>
      <button id="start-btn">Start Game</button>
    </div>
  `
});

myPanel.show();

// Listen for interactions
myPanel.on('button-click', (buttonId) => {
  if (buttonId === 'start-btn') {
    startGame();
    myPanel.hide();
  }
});
```

### Custom Notifications

```typescript
import { HolographicUI } from '@hololand/ui';

// Show toast notification
HolographicUI.notify({
  message: 'You found a secret!',
  icon: '🎉',
  duration: 3000,  // milliseconds
  type: 'success'  // success, info, warning, error
});
```

### World-Specific UI

```typescript
// Add custom menu item to world browser
HolographicUI.addMenuItem({
  section: 'worlds',
  label: 'My Worlds',
  icon: '🏠',
  action: () => {
    showMyCreatedWorlds();
  }
});
```

### Holographic Billboards

```typescript
// Create 3D billboard in world
const billboard = HolographicUI.createBillboard({
  position: { x: 10, y: 2, z: 5 },
  rotation: { x: 0, y: Math.PI / 4, z: 0 },
  width: 2,
  height: 1.5,
  content: `
    <div class="ad-content">
      <h1>Visit our Store!</h1>
      <img src="store-preview.png" />
      <button>Portal Here</button>
    </div>
  `,
  interactive: true
});

// Billboard faces player automatically
billboard.setFacePlayer(true);
```

---

## Best Practices

### DO ✅

- **Keep UI minimal** - Less is more in VR
- **Use gestures first** - Most natural in spatial computing
- **Provide voice alternatives** - Accessibility and convenience
- **Test at comfortable distance** - UI should be 1-2 meters from eyes
- **Use spatial audio** - UI sounds should be localized
- **Smooth animations** - 60-90fps minimum
- **Clear visual hierarchy** - Primary actions prominent

### DON'T ❌

- **Don't block the view** - UI should be dismissible
- **Don't require head movement** - Keep UI in comfortable field of view
- **Don't use small text** - Minimum 24pt font equivalent
- **Don't overload panels** - Max 7 options per screen
- **Don't auto-play videos** - User should initiate
- **Don't flash rapidly** - Avoid seizure triggers
- **Don't ignore comfort** - Test with motion-sensitive users

---

## UI Performance

### Optimization Tips

- **Lazy load panels** - Don't render all UI at once
- **Occlusion culling** - Don't render hidden panels
- **Texture atlases** - Combine UI textures
- **Level of detail** - Reduce quality for distant UI
- **Reuse elements** - Object pooling for frequently shown UI
- **Minimize reflows** - Batch DOM updates

### Target Performance

| Platform | UI Frame Time Budget |
|----------|----------------------|
| **Quest 2/3** | < 2ms per frame |
| **Desktop VR** | < 3ms per frame |
| **High-end PC** | < 5ms per frame |

---

## Future Features (Roadmap)

- **Eye Tracking Integration** - Gaze-based selection
- **Neural Input** - Brain-computer interface support
- **Haptic Feedback** - Touch sensation for UI interactions
- **Adaptive UI** - Learns your preferences over time
- **Multi-Language** - 20+ languages supported
- **Custom Themes** - User-created UI skins

---

## Resources

- [UI Component Library](../packages/ui/README.md)
- [Gesture Recognition API](../packages/gestures/README.md)
- [Voice Commands API](../packages/voice/README.md)
- [UI Examples](../examples/ui-showcase)

---

**Last Updated**: February 23, 2026

---

*Building the interface of the future.* ✨
