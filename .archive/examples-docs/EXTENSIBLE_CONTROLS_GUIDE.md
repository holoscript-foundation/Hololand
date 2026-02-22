# Hololand: Extensible Controls System
## Custom Powers & Game Mechanics Framework

**Version**: 1.0
**For**: Game creators, experience designers, interactive world builders

---

## Overview

Hololand's control system has two layers:

1. **Base Controls** (Move, Rotate, Scale) - Universal across all worlds
2. **Custom Controls** (Powers, Abilities, Interactions) - Defined per-world by creators

This guide focuses on **Custom Controls** - how to add game-specific mechanics like:
- Fireball spells (Ctrl+1 on keyboard, throw gesture in VR)
- Health shrines (E key to heal, hand touch in VR)
- Double-jump (Spacebar twice, hand flick in VR)
- Telekinesis (Hold F, pinch gesture in VR)

**No code required** - configure via UI, HoloScript traits, or AI generation.

---

## Control Modes: Context-Aware Interface

**Hololand is a developer playground in 3D** - controls adapt based on what you're doing:

| Mode | Purpose | Active Controls | UI Overlay |
|------|---------|-----------------|------------|
| **Edit Mode** | Modify world (move/rotate/scale objects) | G/R/S keys, WoW-style camera | Inspector panel, object properties |
| **Play Mode** | Test gameplay with custom powers | Custom power shortcuts (E, Ctrl+1, etc.) | HUD, health bar, power icons |
| **Build Mode** | Advanced construction (duplicate, grid snap) | Ctrl+D, Alt+drag, grid shortcuts | Build tools, asset library |
| **View Mode** | Spectate, explore (no editing) | WASD movement, camera controls only | Minimal UI, no editor tools |

**Mode Switching**:
- **Tab**: Toggle between Edit ↔ Play
- **Ctrl+B**: Enter Build Mode
- **Esc**: Return to View Mode
- **Auto-detect**: Automatically enters Play Mode when custom powers detected

**Example Flow**:
1. **Edit Mode**: Place health shrine, configure @power trait
2. **Press Tab** → Enters Play Mode
3. **Play Mode**: Test healing by pressing E key
4. **Press Tab** → Returns to Edit Mode to tweak cooldown
5. **Repeat** until gameplay feels right

This ensures controls are **always appropriate** for the current task - no keybind conflicts, no accidental edits during gameplay.

---

## Philosophy: "Learn Once, Play Anywhere"

Custom controls follow the same pattern across platforms:

| Action | Desktop | VR (Hand) | VR (Controller) | Mobile |
|--------|---------|-----------|-----------------|--------|
| Activate Power | Keyboard Shortcut | Hand Gesture | Button Press | Screen Button |
| Aim Power | Mouse Direction | Head Gaze / Hand Point | Controller Point | Swipe Direction |
| Charge Power | Hold Key | Hold Gesture | Hold Trigger | Press & Hold |
| Cancel Power | Release / Esc | Open Hand | Release Trigger | Swipe Away |

**Example**: Fireball spell
- Desktop: Hold Ctrl+1, aim with mouse, release to cast
- VR Hand: Make fist, aim hand, throw gesture to cast
- VR Controller: Hold trigger, aim controller, release to cast
- Mobile: Tap fireball button, swipe direction to aim, release to cast

**Consistent logic** across all platforms = lower learning curve for players.

---

## Part 1: Power Configuration UI

### Creating a Custom Power (No Code)

**Step 1: Select Object**

1. Click the object in your world (e.g., a glowing shrine)
2. Open Inspector panel (Tab key or click Inspector icon)
3. Click "Add Behavior" button

**Step 2: Choose Power Type**

| Power Type | Description | Examples |
|------------|-------------|----------|
| **Toggle** | On/off state | Light switches, doors |
| **Instant** | One-time effect | Heal, damage, teleport |
| **Channeled** | Continuous effect while held | Flashlight, force field |
| **Charged** | Power increases with hold duration | Bow & arrow, jump pad |

**Step 3: Configure Inputs**

Desktop Keyboard:
```
Primary Key: E (heal)
Modifier: None
Cooldown: 10 seconds
Range: Touch (0m) / Near (5m) / Far (50m)
```

VR Hand Tracking:
```
Gesture: Hand Touch (pinch near object)
Alternative: Point + Pinch
Feedback: Green glow on contact
```

VR Controller:
```
Button: Trigger (on proximity)
Haptic Feedback: Medium vibration
Visual Feedback: Particle burst
```

Mobile:
```
UI Button: Bottom-right FAB
Icon: Green cross (⊕)
Activation: Tap when in range
```

**Step 4: Define Effect**

```
Effect Type: Modify Player Stat
Target: Player Health
Modifier: +50 HP
Max Value: 100 HP
Animation: Green particle burst
Sound: "heal_sound.mp3"
```

**Step 5: Save & Test**

- Click "Save Behavior"
- Enter Play Mode (P key)
- Test on all platforms (desktop, VR, mobile)

---

## Part 2: HoloScript Trait System

### Adding Powers via Code (Advanced)

For developers who prefer code over UI, use HoloScript traits:

**Example: Health Shrine**

```holoscript
# Health Shrine with custom power
sphere #health_shrine {
  position: [0, 1, 0]
  size: 0.5
  color: "#00FF00"
  @material(type: "standard", emissive: "#00FF00", emissiveIntensity: 2)

  # Custom power trait
  @power(
    name: "Heal",
    type: "instant",
    effect: {
      target: "player",
      stat: "health",
      modifier: +50,
      max: 100
    },
    cooldown: 10,
    inputs: {
      desktop: { key: "E", range: 5 },
      vr_hand: { gesture: "touch", feedback: "haptic_medium" },
      vr_controller: { button: "trigger", range: 5 },
      mobile: { button: "fab_heal", icon: "⊕" }
    },
    feedback: {
      visual: "particle_burst_green",
      audio: "heal_sound",
      ui: "HP +50 (popup)"
    }
  )
}
```

**Trait Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Power display name |
| `type` | enum | instant, toggle, channeled, charged |
| `effect` | object | What happens when activated |
| `cooldown` | number | Seconds before reuse |
| `inputs` | object | Platform-specific controls |
| `feedback` | object | Visual/audio/haptic responses |

---

## Part 3: Common Power Templates

### 1. Fireball Spell

**Desktop**: Ctrl+1, aim with mouse, click to cast

**VR Hand**: Make fist, throw gesture

**VR Controller**: Trigger + flick controller forward

```holoscript
@power(
  name: "Fireball",
  type: "charged",
  effect: {
    projectile: {
      speed: 20,
      damage: 30,
      explosion_radius: 3,
      particle_trail: "fire_trail"
    }
  },
  inputs: {
    desktop: {
      key: "Ctrl+1",
      aim: "mouse_direction",
      charge: "hold_duration"
    },
    vr_hand: {
      gesture: "fist_throw",
      aim: "hand_direction",
      charge: "hold_duration"
    },
    vr_controller: {
      button: "trigger",
      aim: "controller_direction",
      charge: "hold_duration"
    }
  },
  feedback: {
    visual: "fireball_projectile",
    audio: "whoosh_fire",
    haptic: "strong_rumble"
  }
)
```

---

### 2. Double Jump

**Desktop**: Spacebar (twice)

**VR Hand**: Flick both hands upward

**VR Controller**: A button (twice)

```holoscript
@power(
  name: "Double Jump",
  type: "instant",
  effect: {
    impulse: {
      direction: "up",
      force: 500,
      max_uses_in_air: 1
    }
  },
  inputs: {
    desktop: {
      key: "Space",
      sequence: "double_tap",
      timeout: 0.3
    },
    vr_hand: {
      gesture: "both_hands_flick_up"
    },
    vr_controller: {
      button: "A",
      sequence: "double_tap",
      timeout: 0.3
    }
  },
  feedback: {
    visual: "jump_trail",
    audio: "jump_boost",
    haptic: "quick_pulse"
  }
)
```

---

### 3. Telekinesis (Move Objects with Mind)

**Desktop**: Hold F, aim with mouse, drag object

**VR Hand**: Pinch air, move hand to drag

**VR Controller**: Hold grip, move controller

```holoscript
@power(
  name: "Telekinesis",
  type: "channeled",
  effect: {
    grab_object: {
      max_distance: 10,
      max_weight: 100,
      smooth_follow: true,
      collision: false
    }
  },
  inputs: {
    desktop: {
      key: "F",
      mode: "hold",
      aim: "mouse_raycast",
      drag: "mouse_movement"
    },
    vr_hand: {
      gesture: "pinch_air",
      aim: "hand_raycast",
      drag: "hand_position"
    },
    vr_controller: {
      button: "grip",
      mode: "hold",
      aim: "controller_raycast",
      drag: "controller_position"
    }
  },
  feedback: {
    visual: "telekinesis_glow",
    audio: "telekinesis_hum",
    haptic: "continuous_vibration"
  }
)
```

---

### 4. Dash / Sprint Boost

**Desktop**: Shift (hold)

**VR Hand**: Pump arms (armswinger boost)

**VR Controller**: Thumbstick click

```holoscript
@power(
  name: "Sprint",
  type: "toggle",
  effect: {
    speed_multiplier: 2.0,
    stamina_drain: 10, // per second
    max_duration: 5
  },
  inputs: {
    desktop: {
      key: "Shift",
      mode: "hold"
    },
    vr_hand: {
      gesture: "arm_pump",
      threshold: "fast_motion"
    },
    vr_controller: {
      button: "thumbstick_click",
      mode: "toggle"
    }
  },
  feedback: {
    visual: "speed_lines",
    audio: "breathing_heavy",
    ui: "stamina_bar"
  }
)
```

---

## Part 4: VR Gesture Library

### Pre-Built Hand Tracking Gestures

Hololand includes 20+ pre-configured gestures for Quest 3, Vision Pro, etc.

| Gesture | Description | Use Cases |
|---------|-------------|-----------|
| **Point + Pinch** | Index finger + thumb touch | Select, activate, click |
| **Fist** | Close all fingers | Grab, hold, charge power |
| **Open Palm** | Fingers spread | Cancel, release, shield |
| **Throw** | Fist → open palm (fast) | Cast spell, throw object |
| **Punch** | Fist forward (fast) | Melee attack, break object |
| **Swipe** | Hand sweep (left/right/up/down) | Navigate UI, dodge |
| **Pinch Air** | Pinch without touching object | Telekinesis, distance grab |
| **Twist Wrist** | Rotate hand 90° | Turn valve, unlock door |
| **Clap** | Both hands together | Applause, summon |
| **Peace Sign** | ✌️ | Photo mode, confirm |
| **Thumbs Up** | 👍 | Approve, like, save |
| **Thumbs Down** | 👎 | Reject, dislike, delete |
| **Wave** | Hand side-to-side | Greet NPC, trigger event |
| **Snap** | Finger snap motion | Quick cast, instant action |
| **Salute** | Hand to forehead | Respect, acknowledge |

### Custom Gesture Builder (Advanced)

For unique gestures, use the gesture builder:

```holoscript
@custom_gesture(
  name: "Hadouken",
  description: "Street Fighter style energy blast",
  sequence: [
    { hand: "right", pose: "fist", position: "hip_right" },
    { hand: "right", pose: "fist", position: "chest_center" },
    { hand: "right", pose: "open_palm", position: "extended_forward" },
    { hand: "both", pose: "cupped", position: "extended_forward" } // optional
  ],
  duration: 1.0, // seconds
  confidence: 0.8 // recognition threshold (0-1)
)
```

**Gesture Recognition Settings**:

| Setting | Value | Note |
|---------|-------|------|
| Confidence Threshold | 0.6 - 0.9 | Higher = more precise, lower = more forgiving |
| Sequence Timeout | 0.5 - 2.0s | Max time between gesture steps |
| Hand Distance | 0.5m - 2m | Optimal tracking range (Quest 3) |
| Lighting | Bright | Hand tracking requires good lighting |

---

## Part 5: AI-Generated Powers

### Creating Powers with Natural Language

Instead of configuring manually, use AI generation:

**Prompt**:
> "Add a heal power to this shrine. E key on desktop, touch in VR. Heals 50 HP, 10 second cooldown, green particles."

**AI Output**:
```holoscript
sphere #health_shrine {
  // ... existing geometry ...

  @power(
    name: "Heal",
    type: "instant",
    effect: { target: "player", stat: "health", modifier: +50 },
    cooldown: 10,
    inputs: {
      desktop: { key: "E", range: 5 },
      vr_hand: { gesture: "touch" },
      vr_controller: { button: "trigger", range: 5 }
    },
    feedback: { visual: "particle_burst_green", audio: "heal_sound" }
  )
}
```

**Advanced Prompts**:

> "Add a fireball spell. Ctrl+1 on desktop, throw gesture in VR. Charges up for 2 seconds, explodes on impact."

> "Make this door open when player gets close. No key required, just proximity."

> "Add a jump pad that launches player 20 meters up. Spacebar to activate, hand slap in VR."

**AI Capabilities**:
- ✅ Generate @power trait from description
- ✅ Choose appropriate gesture (throw, punch, touch)
- ✅ Set reasonable cooldowns/ranges
- ✅ Suggest visual/audio feedback
- ⏳ Multi-step power sequences (coming Month 3)
- ⏳ Conditional triggers (if/else logic)

---

## Part 6: Power Balancing & Game Design

### Best Practices

**1. Cooldowns Prevent Spam**
- Healing: 10-15 seconds
- Damage spells: 2-5 seconds
- Movement abilities: 3-8 seconds
- Ultimate powers: 30-60 seconds

**2. Range Matters for Immersion**
- Touch powers (0-1m): Healing shrines, switches
- Near powers (1-10m): Fireball, telekinesis
- Far powers (10-50m): Sniper rifle, long-range spells
- Global powers (unlimited): Map reveal, time slow

**3. Visual Feedback is Critical**
- **Before activation**: Glow, outline, hover text
- **During activation**: Particle trail, progress bar
- **After activation**: Explosion, flash, cooldown indicator
- **On cooldown**: Greyed out icon, timer

**4. Audio Feedback Complements**
- **Activation**: "Whoosh", "Zap", "Ding"
- **Success**: "Ding", "Success chime"
- **Failure**: "Error beep", "Deny sound"
- **Cooldown ready**: "Ready ping"

**5. Cross-Platform Testing**
- Always test desktop + VR + mobile
- Gestures that feel good in VR may not work on desktop (vice versa)
- Mobile users need larger UI buttons (thumb-friendly)

---

## Part 7: Example Game Scenarios

### Scenario 1: Boss Battle Arena

**Powers Needed**:
1. **Attack Spell** (Ctrl+1, throw gesture) - 30 damage, 2s cooldown
2. **Heal Shrine** (E key, touch) - +50 HP, 15s cooldown
3. **Dodge Roll** (Shift, swipe hand) - Invincibility frames, 5s cooldown
4. **Ultimate** (Ctrl+Q, both hands clap) - 100 damage AoE, 60s cooldown

**Implementation**:
```holoscript
# Attack Spell
cube #fireball_wand {
  @power(name: "Fireball", type: "instant", effect: { damage: 30 },
         inputs: { desktop: { key: "Ctrl+1" }, vr_hand: { gesture: "throw" } })
}

# Heal Shrine
sphere #heal_shrine {
  @power(name: "Heal", type: "instant", effect: { health: +50 }, cooldown: 15,
         inputs: { desktop: { key: "E" }, vr_hand: { gesture: "touch" } })
}

# Dodge Roll
@player_power(name: "Dodge", type: "instant", effect: { invincibility: 0.5s }, cooldown: 5,
              inputs: { desktop: { key: "Shift" }, vr_hand: { gesture: "swipe" } })

# Ultimate
@player_power(name: "Ultimate", type: "instant", effect: { damage_aoe: 100, radius: 10 }, cooldown: 60,
              inputs: { desktop: { key: "Ctrl+Q" }, vr_hand: { gesture: "clap" } })
```

---

### Scenario 2: Escape Room Puzzle

**Powers Needed**:
1. **Inspect Object** (E key, point+pinch) - Show hint text
2. **Toggle Lever** (F key, hand pull) - On/off switch
3. **Insert Key** (G key, hand place) - Unlock door
4. **Read Note** (R key, hand grab) - Display text overlay

**Implementation**:
```holoscript
# Inspectable clue
cube #clue_box {
  @power(name: "Inspect", type: "toggle",
         effect: { ui_text: "The safe code is hidden in the painting." },
         inputs: { desktop: { key: "E" }, vr_hand: { gesture: "point_pinch" } })
}

# Lever puzzle
cylinder #lever {
  @power(name: "Pull Lever", type: "toggle",
         effect: { state: "on/off", trigger_event: "door_unlock" },
         inputs: { desktop: { key: "F" }, vr_hand: { gesture: "pull_down" } })
}

# Key insertion
sphere #keyhole {
  @power(name: "Insert Key", type: "instant",
         effect: { requires_item: "golden_key", unlock: "door_1" },
         inputs: { desktop: { key: "G" }, vr_hand: { gesture: "hand_place" } })
}
```

---

### Scenario 3: Social VR Hangout

**Powers Needed**:
1. **Emotes** (1-9 keys, hand gestures) - Wave, dance, sit, laugh
2. **Voice Chat** (V key, talk button) - Spatial audio
3. **Photo Mode** (P key, peace sign) - Take screenshot
4. **Teleport** (T key, point+click) - Move around space

**Implementation**:
```holoscript
# Emotes
@player_power(name: "Wave", type: "instant", effect: { animation: "wave" },
              inputs: { desktop: { key: "1" }, vr_hand: { gesture: "wave" } })

@player_power(name: "Dance", type: "toggle", effect: { animation: "dance_loop" },
              inputs: { desktop: { key: "2" }, vr_hand: { gesture: "body_shake" } })

# Photo Mode
@player_power(name: "Screenshot", type: "instant", effect: { capture_screenshot: true },
              inputs: { desktop: { key: "P" }, vr_hand: { gesture: "peace_sign" } })

# Teleport
@player_power(name: "Teleport", type: "instant", effect: { move_to: "cursor_position" },
              inputs: { desktop: { key: "T", cursor: "mouse_raycast" },
                        vr_hand: { gesture: "point_pinch" } })
```

---

## Part 8: Performance Considerations

### Optimization Tips

**1. Limit Active Powers**
- Max 10-15 active powers per player (avoid keybind conflicts)
- Max 50 active powers per world (avoid physics overhead)

**2. Debounce High-Frequency Gestures**
- Clap: Min 0.3s between activations
- Wave: Min 0.5s between activations
- Punch: Min 0.2s between activations

**3. Cache Power Configurations**
- Load @power traits once on world load
- Don't re-parse HoloScript every frame

**4. Use Spatial Partitioning**
- Only check powers within 50m of player
- Disable distant powers (beyond render distance)

**5. Network Sync Optimization**
- Only sync power activations (not continuous state)
- Use delta compression for gesture data

---

## Part 9: Testing & Debugging

### Power Testing Checklist

For each custom power, test:

- [ ] Desktop keyboard shortcut works
- [ ] VR hand gesture triggers correctly
- [ ] VR controller button activates
- [ ] Mobile UI button responsive
- [ ] Visual feedback displays
- [ ] Audio feedback plays
- [ ] Cooldown timer accurate
- [ ] Power effect applies correctly
- [ ] Multi-user sync works (if multiplayer)
- [ ] Performance impact acceptable (<5ms per activation)

### Common Issues & Fixes

**Issue 1: Gesture not recognized**
- **Cause**: Confidence threshold too high (>0.9)
- **Fix**: Lower to 0.7-0.8

**Issue 2: Power activates twice**
- **Cause**: No debounce delay
- **Fix**: Add `debounce: 0.3` to inputs

**Issue 3: VR hand tracking lost**
- **Cause**: Hands too close to headset (<0.5m) or too far (>2m)
- **Fix**: Display warning UI when hands out of range

**Issue 4: Cooldown not syncing across clients**
- **Cause**: Local cooldown only (not networked)
- **Fix**: Use `@power(sync: "all_clients")` for multiplayer

---

## Conclusion

Hololand's extensible control system enables creators to build **interactive experiences**, not just static worlds. By providing:

1. **No-code UI** for simple powers (heal, toggle, instant)
2. **HoloScript traits** for advanced mechanics (fireballs, telekinesis)
3. **AI generation** for natural language power creation
4. **Pre-built gesture library** for VR hand tracking
5. **Cross-platform consistency** (desktop, VR, mobile)

We empower creators to build **games** (not just scenes) with custom mechanics that feel native on every platform.

**Next Steps**:
- Explore the power templates (fireball, double-jump, telekinesis)
- Try the gesture builder for unique VR interactions
- Use AI to generate powers from natural language prompts
- Test your powers on all platforms before publishing

**Need Help?**
- Discord: #extensible-controls
- Docs: hololand.io/docs/custom-powers
- Video Tutorials: hololand.io/tutorials

---

**Version History**:
- v1.0 (Feb 19, 2026): Initial release
- Power types: instant, toggle, channeled, charged
- 20+ pre-built VR gestures
- AI integration for power generation
