# Hololand Hero Templates

This directory contains the 10 foundational "Hero Templates" that provide instant-start experiences for creators.

## Template Categories

### Professional (3 templates)
1. **modern-office.holo** - Professional workspace with desk, monitors, and ambient lighting
2. **meeting-room.holo** - Conference room with table, chairs, and presentation screen
3. **dashboard.holo** - Data visualization space with floating screens and analytics

### Natural Environments (3 templates)
4. **meditation-garden.holo** - Peaceful zen garden with water features and natural elements
5. **forest.holo** - Woodland scene with trees, rocks, mushrooms, and atmospheric fog
6. **beach.holo** - Tropical beach with ocean, sand, palm trees, and sunny weather

### Sci-Fi/Future (2 templates)
7. **space-station.holo** - Futuristic station interior with viewports and control panels
8. **cyberpunk-alley.holo** - Neon-lit alleyway with holographic signs and urban atmosphere

### Entertainment (2 templates)
9. **art-gallery.holo** - Minimalist gallery with white walls and spotlit artworks
10. **boss-arena.holo** - Epic circular battle arena with dramatic lighting and lava

## Usage

Each template is a complete `.holo` file that can be:
1. **Remixed** - Load and modify colors, positions, or objects
2. **Extended** - Add new objects while keeping the base scene
3. **Learned From** - Study HoloScript syntax and patterns

## Template Structure

Each template includes:
- ✅ Floor/ground plane
- ✅ Environmental lighting (ambient + directional)
- ✅ Thematic objects (5-30 objects per scene)
- ✅ Material properties (PBR, emissive, transparency)
- ✅ Atmospheric elements (fog, background, effects)

## Quick Start

```bash
# Load a template
curl http://localhost:3000/templates/modern-office.holo

# Or in your app
fetch('/templates/beach.holo')
  .then(res => res.text())
  .then(holoScript => {
    // Parse and render with HoloScript engine
  })
```

## Template Philosophy

Based on research showing:
- **70% of creators start by modifying existing work** (not blank canvas)
- **Template-first UX reduces time-to-first-world from 15 min → 5 min**
- **Remix culture drives 3-5x higher engagement** than create-from-scratch

## Adding New Templates

When adding templates, ensure they:
1. Load in <3 seconds (keep object count reasonable)
2. Work on mobile devices (30+ FPS on iPhone 12)
3. Follow HoloScript best practices (explicit sizes, colors, materials)
4. Include at least one interactive element (portal, NPC, or clickable object)
