# World GIFs

This folder contains animated GIFs showcasing HoloScript worlds and features.

## How to Record GIFs

### Option 1: ScreenToGif (Windows) - Recommended

1. Download: https://www.screentogif.com/
2. Open your world in the playground
3. Record the viewport
4. Export as GIF (use 15-20 FPS for file size)

### Option 2: LICEcap (Windows/Mac)

1. Download: https://www.cockos.com/licecap/
2. Position over the 3D preview
3. Record directly to GIF

### Option 3: OBS + ffmpeg (Any OS)

```bash
# Record with OBS, then convert to GIF:
ffmpeg -i recording.mp4 -vf "fps=15,scale=640:-1:flags=lanczos" -c:v gif output.gif
```

### Option 4: Browser DevTools (Chrome)

1. Open playground in Chrome
2. DevTools → Performance → Record
3. Capture → Export as video
4. Convert with ffmpeg

---

## File Naming Convention

```
<world-name>-<feature>.gif
```

Examples:

- `battle-arena-fireballs.gif`
- `coffee-shop-walkthrough.gif`
- `procedural-island-generation.gif`
- `multiplayer-sync-demo.gif`

---

## Size Guidelines

| Use Case | Max Width | Max FPS | Target Size |
|----------|-----------|---------|-------------|
| README hero | 800px | 15 | < 5MB |
| Feature demo | 640px | 15 | < 3MB |
| Quick preview | 400px | 10 | < 1MB |

---

## Using GIFs in Documentation

```markdown
<!-- In README.md -->
![Battle Arena Demo](docs/assets/gifs/battle-arena-demo.gif)

<!-- With alt text -->
![Fire Mage shooting fireballs at Water Elemental](docs/assets/gifs/battle-arena-fireballs.gif)

<!-- Centered with HTML -->
<p align="center">
  <img src="docs/assets/gifs/world-preview.gif" alt="World Preview" width="600">
</p>
```

---

## Current GIFs

These GIFs are referenced in documentation and need to be recorded:

| GIF File | Location | Description | Priority |
|----------|----------|-------------|----------|
| `hololand-hero.gif` | README.md | Voice command building a floating island | 🔴 High |
| `playground-demo.gif` | playground/README.md | Live coding a 3D scene | 🔴 High |
| `ai-voice-demo.gif` | QUICKSTART.md | "Create a coffee shop" voice demo | 🔴 High |
| `holoscript-compile-demo.gif` | HoloScript/README.md | Code compiling to multiple platforms | 🟡 Medium |
| `holo-simple-demo.gif` | HOLOSCRIPT_FILE_TYPES.md | Simple .holo cube creation | 🟡 Medium |
| `hsplus-multiplayer-demo.gif` | HOLOSCRIPT_FILE_TYPES.md | .hsplus multiplayer sync | 🟡 Medium |
| `multiplayer-sync.gif` | TIER3_TIER4_GUIDE.md | Objects syncing across clients | 🟢 Nice to have |
| `physics-constraints.gif` | TIER3_TIER4_GUIDE.md | Joints, springs, ragdoll | 🟢 Nice to have |
| `procedural-terrain.gif` | TIER3_TIER4_GUIDE.md | Terrain/island generation | 🟢 Nice to have |

### Recording Checklist

- [ ] `hololand-hero.gif` - 5-8 sec, voice command demo
- [ ] `playground-demo.gif` - 5-8 sec, typing code → 3D render
- [ ] `ai-voice-demo.gif` - 3-5 sec, coffee shop generation
- [ ] `holoscript-compile-demo.gif` - 3-5 sec, build output
- [ ] `holo-simple-demo.gif` - 3-5 sec, cube with color
- [ ] `hsplus-multiplayer-demo.gif` - 5-8 sec, two players syncing
- [ ] `multiplayer-sync.gif` - 3-5 sec, object position sync
- [ ] `physics-constraints.gif` - 3-5 sec, door hinge or rope
- [ ] `procedural-terrain.gif` - 5-8 sec, island growing

---

## Tips for Good GIFs

1. **Keep it short** - 3-10 seconds is ideal
2. **Loop seamlessly** - End where you started if possible
3. **Focus on one feature** - Don't try to show everything
4. **Use consistent lighting** - Avoid flickering
5. **Crop tightly** - Remove UI unless it's the focus
