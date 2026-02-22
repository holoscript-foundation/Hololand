# 🚀 StoryWeaver Protocol - Quick Start Guide

**Get the interactive Library zone running in 15 minutes!**

---

## 📋 Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Basic React/TypeScript knowledge
- (Optional) OpenAI API key for AI companions

---

## ⚡ Quick Setup

### Step 1: Install Dependencies (2 minutes)

```bash
cd examples/hololand-central
pnpm install

# Add HoloScript packages
pnpm add @holoscript/core@^3.41.0
pnpm add @holoscript/runtime@^3.1.1
pnpm add @holoscript/llm-provider@latest
pnpm add @react-three/fiber three cannon-es
```

### Step 2: Configure Environment (1 minute)

```bash
# Create .env.local
cat > .env.local << EOF
# Optional: For AI companions
OPENAI_API_KEY=sk-your-key-here

# Optional: Analytics
ANALYTICS_ENABLED=false
EOF
```

### Step 3: Run Development Server (1 minute)

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎮 What You'll See

### The Grand Hall Experience

1. **Spawn at Entrance** - You appear at the library entrance (south side)

2. **Knowledge Tower** - Central glowing orb that brightens as you complete quests

3. **Four Genre Portals**:
   - 🗺️ **Adventure** (North) - Always unlocked, glowing red
   - ✨ **Fantasy** (East) - Locked, purple shimmer
   - 🌙 **Horror** (West) - Locked, dark shadows
   - ⏳ **History** (South) - Locked, golden time spiral

4. **AI Companions**:
   - **Captain Compass** near Adventure portal - Enthusiastic explorer
   - **Lumina Starweaver** near Fantasy portal (appears when unlocked)
   - **Raven Shadowmere** near Horror portal (appears when unlocked)

5. **Quest Books** - Glowing books near portals trigger quests

### Try It Out!

**5-Minute Demo Flow**:

1. Walk to Adventure portal (North) → Click it
2. Talk to Captain Compass → "What quests are available?"
3. Pick up glowing "Treasure Island" book → Quest triggers
4. Portal activates → Adventure Hub loads
5. Complete intro quest → Earn courage skill
6. Return to Grand Hall → Fantasy portal starts unlocking!
7. Watch Knowledge Tower glow brighter ✨

---

## 🔧 Architecture Overview

### Key Files

```
Hololand/
├── STORYWEAVER_PROTOCOL.md           # Vision & blueprint
├── LIBRARY_INTERACTIVE_UPGRADE.md   # Technical guide
├── HOLOSCRIPT_INTEGRATION_GAP_ANALYSIS.md  # What we're solving
│
└── examples/hololand-central/
    └── src/
        └── zones/
            ├── library.holo              # Original static version
            └── library-interactive.holo  # NEW! Interactive version
```

### HoloScript Features Demonstrated

| Feature | Where to See It | Code Location |
|---------|----------------|---------------|
| **@state** | Quest progress tracking | Line 24-56 |
| **@event** | Portal activation, quest triggers | Line 63-96 |
| **@reactive** | Portal unlock states | Line 186-240 |
| **@ai-powered** | Dynamic NPC dialogue | Line 522-570 |
| **computed** properties | Portal materials change based on state | Line 200-220 |

---

## 🎯 Testing Checklist

### Basic Functionality

- [ ] Grand Hall loads without errors
- [ ] Knowledge Tower is visible and glowing
- [ ] Adventure portal is unlocked (red glow)
- [ ] Other portals show locked state
- [ ] Captain Compass NPC is present

### Interactive Features

- [ ] Clicking Adventure portal shows activation effect
- [ ] Clicking locked portal shows message
- [ ] Quest book can be picked up
- [ ] Quest trigger notification appears
- [ ] State persists on page refresh

### AI Companions (Requires API Key)

- [ ] Captain Compass responds to greetings
- [ ] Dialogue adapts to player skill level
- [ ] Hints are contextual
- [ ] Multiple NPCs can interact

### Progressive Unlocks

- [ ] Complete 1 adventure quest → Fantasy portal starts unlocking
- [ ] Click unlocking portal → Unlocks with animation
- [ ] Fantasy portal becomes active
- [ ] Lumina Starweaver appears
- [ ] Complete 1 fantasy quest → Horror portal unlocks
- [ ] Complete 3 total quests → History portal unlocks

---

## 🐛 Troubleshooting

### Issue: Portals Not Rendering

**Solution**:
```bash
# Check HoloScript parser is working
import { parse } from '@holoscript/core/parser';
const ast = parse(holoSource);
console.log(ast); // Should show AST structure
```

### Issue: State Not Persisting

**Solution**:
```typescript
// Check localStorage
console.log(localStorage.getItem('hololand_quest_progress'));

// Reset state
localStorage.removeItem('hololand_quest_progress');
window.location.reload();
```

### Issue: AI Not Responding

**Solution**:
```bash
# Check API key
echo $OPENAI_API_KEY

# Test API directly
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Test"}]}'
```

### Issue: Portal Effects Not Showing

**Solution**:
```typescript
// Check particle system is enabled
import { enableParticles } from '@holoscript/runtime/effects';
enableParticles(true);
```

---

## 📊 Performance Tips

### Optimize for 60 FPS

1. **Lazy Load Genre Worlds**
   ```typescript
   // Don't load all worlds at startup
   const loadWorld = async (genre: string) => {
     return import(`./worlds/${genre}-hub.holo`);
   };
   ```

2. **Throttle State Updates**
   ```typescript
   // Batch state changes
   questState.batch(() => {
     questState.update({ skills: { courage: +10 } });
     questState.update({ portals: { fantasy: true } });
   });
   ```

3. **Memoize Computed Properties**
   ```typescript
   // Cache expensive computations
   const portalState = useMemo(() => {
     return computePortalState(questProgress);
   }, [questProgress.quests.completed]);
   ```

---

## 🎨 Customization

### Change Portal Colors

```holoscript
// library-interactive.holo, line 200
material: {
  color: "#your-color"      // Change base color
  emissive: "#your-color"   // Change glow color
  emissiveIntensity: 0.8    // Change glow strength
}
```

### Add New Genre

```holoscript
// 1. Add to state (line 32)
portals: {
  // ... existing
  science: boolean  // NEW genre
}

// 2. Create portal
portal "SciencePortal" {
  @spatial @networked @interactive
  position: [20, 3, -20]  // Custom position
  genre: "science"
  // ... rest of portal config
}

// 3. Create companion
npc "ScienceGuide" {
  @ai-powered
  name: "Professor Atom"
  // ... rest of NPC config
}
```

### Modify Unlock Requirements

```holoscript
// library-interactive.holo, line 283
state: computed {
  // Change unlock logic
  if (QuestProgress.portals.fantasy) return "unlocked"

  // Custom requirement (e.g., skill level)
  if (QuestProgress.skills.courage > 50) return "unlocking"

  return "locked"
}
```

---

## 🚀 Next Steps

### Short Term (This Week)

1. **Build First Quest** - Create "Treasure Island Intro" adventure
2. **Test with Users** - Get 5 people to try the demo
3. **Add Quest UI** - Show active quests, progress bars

### Medium Term (This Month)

1. **Complete Adventure Hub** - Full world with 3 quests
2. **Add Fantasy Portal** - Second genre with magic theme
3. **Create Quest Editor** - Let educators upload PDFs

### Long Term (3 Months)

1. **Launch MVP** - 3 genres, 9 quests total
2. **Deploy to 10 Libraries** - Pilot program
3. **Validate Learning Outcomes** - Research study

---

## 📚 Resources

### Documentation

- [StoryWeaver Protocol](STORYWEAVER_PROTOCOL.md) - Full vision
- [Interactive Upgrade Guide](LIBRARY_INTERACTIVE_UPGRADE.md) - Technical details
- [HoloScript Gap Analysis](HOLOSCRIPT_INTEGRATION_GAP_ANALYSIS.md) - Features we're showcasing

### HoloScript Docs

- [@holoscript/core](https://github.com/brianonbased-dev/Holoscript/tree/main/packages/core) - Parser, runtime, type-checker
- [@holoscript/runtime](https://github.com/brianonbased-dev/Holoscript/tree/main/packages/runtime) - React Three Fiber integration
- [@holoscript/llm-provider](https://github.com/brianonbased-dev/Holoscript/tree/main/packages/llm-provider) - AI companions

### Community

- [HoloScript Discord](https://discord.gg/holoscript) - Ask questions
- [Hololand GitHub](https://github.com/your-org/hololand) - Contribute
- [StoryWeaver Forum](https://forum.hololand.dev/storyweaver) - Share quests

---

## 🎉 Success Criteria

You'll know it's working when:

- ✅ Grand Hall loads with glowing Knowledge Tower
- ✅ Adventure portal is active and clickable
- ✅ Captain Compass greets you with dynamic dialogue
- ✅ Quest book triggers quest notification
- ✅ Completing quest unlocks Fantasy portal
- ✅ Portal unlock animation plays
- ✅ Lumina Starweaver appears
- ✅ Skills increase and persist

**When all checked: You have a working StoryWeaver Protocol demo!** 🎊

---

## 💬 Need Help?

**Issues**:
1. Check [Troubleshooting](#troubleshooting) section above
2. Search [GitHub Issues](https://github.com/your-org/hololand/issues)
3. Ask in [Discord #storyweaver channel](https://discord.gg/holoscript)

**Questions**:
- "How do I add a new quest?" → See [Interactive Upgrade Guide](LIBRARY_INTERACTIVE_UPGRADE.md#quest-system)
- "How do I customize NPCs?" → See [Interactive Upgrade Guide](LIBRARY_INTERACTIVE_UPGRADE.md#ai-powered-companions)
- "How do portals work?" → See [StoryWeaver Protocol](STORYWEAVER_PROTOCOL.md#genre-worlds)

**Contributions**:
- Have a quest idea? Open a PR!
- Found a bug? File an issue!
- Built something cool? Share in Discord!

---

## 🌟 What's Next?

Once you have the basic demo running:

1. **Explore the Code** - See how @state, @event, @reactive work together
2. **Modify Portal States** - Change unlock requirements
3. **Create Custom Quests** - Write your first adventure
4. **Deploy to Friends** - Share the experience
5. **Contribute Back** - Help make Hololand amazing!

**The StoryWeaver Protocol is ready. The Library is alive. Time to make magic!** ✨📚🚀

---

**Made with ❤️ by the Hololand community**
**Powered by HoloScript - Write once, deploy everywhere**
