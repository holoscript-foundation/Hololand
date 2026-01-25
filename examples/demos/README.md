# HoloScript Demo Gallery

Showcase examples demonstrating HoloScript's power.

## 🌲 Enchanted Forest
**File**: [enchanted-forest.holo](./enchanted-forest.holo)

Demonstrates:
- **VR Traits**: `@grabbable`, `@throwable`, `@physics`, `@glowing`
- **NPC System**: Wizard with branching dialogue tree
- **Teleportation Orbs**: Throw to teleport
- **Procedural Generation**: Trees, mushrooms scattered via `for` loops
- **Particle Systems**: Fireflies, magic dust
- **Quest Integration**: Collect 5 orbs to unlock portal

```holo
object "Orb" using "TeleportOrb" {
  @grabbable @throwable @glowing
  position: [0, 1.2, -2]
  color: "#00ffff"
  
  on_throw(direction) {
    teleport(player, landing.point)
  }
}
```

---

## 🎮 VRChat Multiplayer Room
**File**: [vrchat-multiplayer-room.holo](./vrchat-multiplayer-room.holo)

Demonstrates:
- **VRChat Export**: Compiles to Udon graphs + VRC SDK
- **Networked Objects**: `@networked`, `@synced` for real-time sync
- **Multiplayer Logic**: Scoring, ownership transfer
- **Master Client Pattern**: `@master_only` for authoritative state

```holo
template "SyncedOrb" {
  @grabbable @networked @physics
  
  state {
    @synced
    owner_id: null
    throw_count: 0
  }
  
  on_throw {
    state.total_throws += 1  // Synced globally
  }
}

export vrchat {
  trait_mapping: {
    "@grabbable": "VRC_Pickup",
    "@networked": "UdonSynced"
  }
}
```

---

## 🎙️ Voice Builder Studio
**File**: [voice-builder.holo](./voice-builder.holo)

Demonstrates:
- **Voice Commands**: Web Speech API → HoloScript generation
- **AI Integration**: Brittney AI generates .holo code from natural language
- **Real-time Creation**: "Add a glowing blue orb" → instant object
- **Context Awareness**: AI knows existing scene, style preferences

```holo
on_voice_command(transcript) {
  // "Create a magical garden with a fountain"
  result = await BrittneyAI.generate(transcript)
  instantiate_from_ast(result.ast)
  speak("Created ${count} objects!")
}
```

---

## Platform Compilation Targets

Each demo compiles to:

| Target | Engine | Status |
|--------|--------|--------|
| Web | Three.js | ✅ Ready |
| VR | WebXR | ✅ Ready |
| AR Mobile | WebXR AR | ✅ Ready |
| Desktop | Tauri | ✅ Ready |
| Unity | C# + XR | ✅ Ready |
| VRChat | UdonSharp | 🟡 Alpha |
| Babylon.js | Babylon | ✅ Ready |
| PlayCanvas | PlayCanvas | ✅ Ready |

---

## Running Demos

```bash
# Compile to Three.js web
npx holoscript compile enchanted-forest.holo --target threejs

# Compile to Unity project
npx holoscript compile enchanted-forest.holo --target unity --output ./unity-project

# Compile to VRChat
npx holoscript compile vrchat-multiplayer-room.holo --target vrchat

# Live preview with hot reload
npx holoscript dev voice-builder.holo
```

---

## The HoloScript Difference

### Before (React + Three.js)
```
📁 enchanted-forest-react/
├── src/
│   ├── App.tsx (80 lines)
│   ├── components/
│   │   ├── Wizard.tsx (150 lines)
│   │   ├── TeleportOrb.tsx (120 lines)
│   │   ├── DialogueSystem.tsx (200 lines)
│   │   ├── Forest.tsx (100 lines)
│   │   └── ... (15 more files)
│   ├── hooks/
│   │   ├── useVR.ts (60 lines)
│   │   ├── usePhysics.ts (80 lines)
│   │   └── useDialogue.ts (100 lines)
│   └── utils/
│       └── ... (10 files)
├── package.json
└── tsconfig.json
Total: ~2,500 lines, 30+ files
```

### After (HoloScript)
```
📁 enchanted-forest/
└── enchanted-forest.holo (280 lines, 1 file)
```

**90% code reduction. 100% cross-platform.**
