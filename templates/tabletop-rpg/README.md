# Tabletop RPG Template for Hololand

Create D&D-style tabletop RPG campaigns in Hololand with **AI-powered quest generation**, **NPC dialogue trees**, and **optional 5e-compatible mechanics**.

---

## Quick Start (5 Minutes)

### Option 1: Use a Starter Kit (Fastest)

```bash
# Create new world from template
holoscript create my-dungeon --template tabletop-rpg/classic-dungeon-crawl

# Customize with voice commands
"Change the theme to ice cave"
"Make the boss a dragon instead of a mummy"
"Add 3 side quests"

# Publish
holoscript publish my-dungeon --public
```

### Option 2: Build from Scratch (Full Control)

```holoscript
// my-campaign.holo
world "MyCampaign" {
  @template("tabletop_rpg")

  features: {
    quest_system: true,
    ai_quest_generation: true,  // Brittney generates quests
    ai_npc_generation: true,    // Brittney generates NPCs
    dice_mechanics: "5e-compatible"  // Or "narrative" for story-focused
  }
}

// Use voice building
"Create a medieval tavern with a bartender and 3 patrons"
"Add a quest - rescue the merchant's daughter"
"Generate a dungeon with 5 rooms"
```

---

## What's Included

### Core Systems (Always Active)

- ✅ **Quest System** - Track objectives, reward XP/gold/items
- ✅ **NPC Dialogue** - Branching conversation trees
- ✅ **Inventory & Items** - Loot, equipment, currency
- ✅ **Character Progression** - Leveling, XP, cross-campaign reputation
- ✅ **Party System** - Multiplayer groups (2-6 players)
- ✅ **Session Persistence** - Progress saves across sessions

### Optional Features (Toggle On/Off)

- ⚙️ **AI Quest Generation** - Brittney creates side quests automatically
- ⚙️ **AI NPC Generation** - Brittney creates NPCs with personalities + dialogue
- ⚙️ **D&D 5e Mechanics** - d20 rolls, character sheets, armor class, saving throws
- ⚙️ **Cross-Campaign Memory** - NPCs remember player's actions from other campaigns

---

## Starter Kits (Pre-Built Templates)

### 1. Classic Dungeon Crawl
**Theme:** Ancient tomb with traps, monsters, puzzles
**Duration:** 2-3 hours
**Players:** 2-4
**Features:** Boss fight, treasure room, riddle puzzle
**File:** `starter-kits/classic-dungeon-crawl.holo`

### 2. Murder Mystery Tavern
**Theme:** Social deduction (like Among Us + D&D)
**Duration:** 1-2 hours
**Players:** 4-6
**Features:** 6 NPCs (one is murderer), clue gathering, interrogation
**File:** `starter-kits/murder-mystery-tavern.holo` *(coming soon)*

### 3. Wilderness Survival
**Theme:** Open-world exploration with resource management
**Duration:** 5-10 hours
**Players:** 1-4
**Features:** Crafting, hunting, random encounters, day/night cycle
**File:** `starter-kits/wilderness-survival.holo` *(coming soon)*

### 4. Political Intrigue
**Theme:** Social roleplay, no combat
**Duration:** 3-5 hours
**Players:** 3-6
**Features:** 3 factions, negotiation mechanics, reputation system
**File:** `starter-kits/political-intrigue.holo` *(coming soon)*

### 5. Blank Canvas
**Theme:** Custom (you build everything)
**Duration:** Variable
**Players:** Any
**Features:** Empty template with all RPG systems enabled
**File:** `starter-kits/blank-canvas.holo`

---

## Voice Building Examples

The RPG template is **optimized for voice building** - create complex scenes in seconds:

### Creating NPCs

```
Voice: "Create a grumpy dwarf blacksmith named Thorin who sells weapons"

Brittney generates:
  - Dwarf model with blacksmith outfit
  - Personality traits: grumpy, honest, skilled
  - Dialogue tree with merchant options
  - Shop inventory: iron sword, steel axe, mithril dagger
  - Catchphrase: "No refunds!"
```

### Creating Quests

```
Voice: "Generate a quest where players rescue a kidnapped merchant"

Brittney generates:
  - Quest title: "The Missing Merchant"
  - 3 objectives: Find clues, track bandits, rescue merchant
  - Rewards: 200 XP, 100 gold, reputation +5
  - Quest giver NPC (if none exists, creates one)
```

### Creating Dungeons

```
Voice: "Create a 3-room dungeon with traps and a boss fight"

Brittney generates:
  - Room 1: Entrance with pressure plate trap
  - Room 2: Corridor with 3 skeleton enemies
  - Room 3: Boss chamber with mini-boss + treasure
```

---

## D&D 5e Mechanics (Optional)

### Enable 5e Mode

```holoscript
world "MyCampaign" {
  @template("tabletop_rpg")

  features: {
    dice_mechanics: "5e-compatible",  // ← Enable 5e rules
    character_sheets: true             // ← Enable stat tracking
  }
}
```

### What You Get

- **d20 System** - Roll d20 + modifier vs. target number
- **Ability Scores** - STR, DEX, CON, INT, WIS, CHA (3-18 range)
- **Armor Class** - Defense rating (10-20 typical)
- **Hit Points** - Health pool
- **Saving Throws** - Resist effects (roll d20 + modifier)
- **Attack Rolls** - d20 + attack bonus vs. AC
- **Damage Rolls** - Weapon dice (1d8, 2d6, etc.) + modifier
- **Leveling** - 1-20 levels with XP thresholds

### Example: Character Creation

```holoscript
character "MyWarrior" {
  name: "Ragnar the Bold"
  class: "warrior"
  level: 3

  // 5e stats (rolled 4d6 drop lowest, or point buy)
  stats: {
    strength: 16,      // +3 modifier
    dexterity: 12,     // +1 modifier
    constitution: 14,  // +2 modifier
    intelligence: 8,   // -1 modifier
    wisdom: 10,        // +0 modifier
    charisma: 10       // +0 modifier
  }

  // Derived values
  armor_class: 16,         // Chainmail (AC 16)
  hit_points: 28,          // 3d10 + (CON modifier × 3)
  proficiency_bonus: 2     // Level 1-4 = +2

  // Equipment
  equipped_weapon: "longsword",  // 1d8+3 damage
  equipped_armor: "chainmail"
}
```

### Example: Combat

```holoscript
on_attack(attacker: PlayerCharacter, target: Enemy) {
  // 1. Roll d20 + attack modifier
  const attack_roll = d20() + attacker.stats.strength_modifier + attacker.proficiency_bonus;

  // 2. Compare to target's AC
  if (attack_roll >= target.armor_class) {
    // Hit!
    const damage = roll_damage("1d8+3");  // Longsword + STR
    target.hit_points -= damage;

    show_message(`${attacker.name} hits for ${damage} damage!`);

    // Check for critical hit (natural 20)
    if (attack_roll === 20) {
      show_message("💥 CRITICAL HIT!");
      target.hit_points -= damage;  // Double damage
    }
  } else {
    // Miss
    show_message(`${attacker.name} misses!`);
  }
}
```

---

## AI Quest Generation (Brittney-Powered)

### How It Works

1. **World Manifest** - Brittney scans your world for NPCs, items, locations
2. **Constrained Generation** - Only references entities that actually exist
3. **Validation** - Quest is checked before deployment to prevent hallucinations
4. **Fallback** - If AI fails, uses simple template quest

### Example

```typescript
// Automatically generates 3-5 side quests when world loads
QuestManager.generate_ai_quests_async();

// Manual generation via voice
"Generate a fetch quest in the Crystal Caves"
"Create a mystery quest involving the missing merchant"
"Add a combat quest with skeletons"
```

### What Brittney Generates

```json
{
  "title": "The Missing Crystals",
  "description": "Merchant Gerald's shipment of crystals was stolen by bandits. Retrieve them from their hideout in the North Cave.",
  "objectives": [
    { "type": "kill", "target": "Bandit Leader", "count": 1 },
    { "type": "collect", "target": "Crystal Shipment", "count": 1 },
    { "type": "talk", "target": "Merchant Gerald", "count": 1 }
  ],
  "rewards": {
    "xp": 200,
    "gold": 150,
    "items": ["ring_of_protection"]
  }
}
```

---

## AI NPC Generation (Brittney-Powered)

### Generate NPC with Voice

```
Voice: "Create a mysterious hooded figure who offers dark magic items"

Brittney generates:
```

```holoscript
npc "MysteriousStranger" {
  name: "The Shadow Merchant"
  model: "hooded_figure"
  position: [5, 0, 10]

  personality: {
    traits: ["mysterious", "morally_ambiguous", "persuasive"],
    voice_tone: "whisper",
    catchphrase: "Power comes at a price..."
  }

  dialogue_tree: {
    start: {
      text: "Looking for something... special? I deal in items most merchants won't touch.",
      options: [
        { text: "What do you have?", next_node: "shop" },
        { text: "How did you get these items?", next_node: "lore" },
        { text: "I don't trust you.", next_node: "suspicious" }
      ]
    },
    shop: {
      text: "Potions of shadow, cursed amulets, forbidden scrolls... for the right price.",
      action: "open_merchant_inventory"
    },
    lore: {
      text: "Questions, questions. Let's just say I know people in low places.",
      reputation_change: -2  // Slightly suspicious
    },
    suspicious: {
      text: "Smart. Trust is overrated anyway. But you'll be back when you need what I offer.",
      reputation_change: -5
    }
  }

  merchant_inventory: [
    { name: "Potion of Shadow", price: 200, effect: "invisibility_1min" },
    { name: "Cursed Amulet", price: 500, effect: "+2_damage_-1_AC" },
    { name: "Scroll of Dark Bolt", price: 300, effect: "3d6_necrotic" }
  ]
}
```

---

## Cross-Campaign Character Reputation

### How It Works

When a player enters your campaign, Brittney AI queries their **cross-campaign history** using RAG (Retrieval-Augmented Generation):

```typescript
// Automatic on player join
const player_history = await RAG_retrieve(player_id, {
  filter: "all_campaigns",
  limit: 20
});

// Calculate reputation (0-100)
const reputation = calculate_reputation(player_history);
// 80+ = "Legendary Hero"
// 50-79 = "Neutral Traveler"
// 0-49 = "Suspicious Character"
```

### NPC Reactions Change Based on Reputation

```holoscript
npc "GuardCaptain" {
  dialogue_tree: {
    // High reputation (80+)
    reputation_high: {
      text: "Ah, the legendary hero! We've heard tales of your deeds. Enter freely, friend.",
      reputation_change: +2
    },

    // Neutral (50-79)
    start: {
      text: "State your business, traveler.",
      options: [...]
    },

    // Low reputation (0-49)
    reputation_low: {
      text: "You... I've heard troubling stories about you. Watch yourself in this town.",
      reputation_change: -5
    }
  }

  on_interact(player: PlayerCharacter) {
    if (player.reputation_score >= 80) {
      this.current_dialogue_node = "reputation_high";
    } else if (player.reputation_score < 50) {
      this.current_dialogue_node = "reputation_low";
    } else {
      this.current_dialogue_node = "start";
    }

    this.show_dialogue(player);
  }
}
```

### What Affects Reputation

- ✅ Completing quests: +3 reputation
- ✅ Helping NPCs: +5 reputation
- ✅ Moral choices (good): +8 reputation
- ❌ Betraying NPCs: -10 reputation
- ❌ Moral choices (evil): -8 reputation
- ❌ Stealing: -5 reputation
- ❌ Killing innocent NPCs: -15 reputation

### Example: Player History

```json
{
  "player_id": "abc123",
  "campaigns_played": 5,
  "reputation_score": 72,
  "moral_alignment": "good",
  "notable_actions": [
    { "campaign": "Crystal Caves", "action": "Saved merchant from bandits", "reputation": +5 },
    { "campaign": "Dragon's Lair", "action": "Spared dragon's life", "reputation": +8 },
    { "campaign": "Haunted Mansion", "action": "Betrayed ghost for treasure", "reputation": -10 },
    { "campaign": "Elf Kingdom", "action": "Completed 12 quests", "reputation": +36 }
  ]
}
```

---

## Tips for Campaign Creators

### 1. Start with a Starter Kit

Don't build from scratch! Use a starter kit and customize:
- Classic Dungeon Crawl → Change theme to ice cave, lava dungeon, underwater temple
- Murder Mystery → Change setting to castle, spaceship, train
- Wilderness → Change biome to desert, jungle, arctic

### 2. Let Brittney AI Do the Heavy Lifting

- **Voice building** for rooms/NPCs: 60 seconds vs. 2 hours manual
- **AI quest generation** for side content: 10 minutes vs. 4 hours writing
- **AI NPC generation** for shopkeepers/guards: 5 minutes vs. 1 hour scripting

### 3. Balance Authored + Procedural Content

- **80% authored** - Main story, major NPCs, boss fights, key moments
- **20% procedural** - Side quests, random encounters, loot tables

### 4. Test with Friends First

Before publishing:
- Run through campaign with 2-3 friends
- Check for broken quests (objectives not triggering)
- Balance difficulty (too easy? too hard?)
- Get feedback on story pacing

### 5. Monetization Strategy

**Free Tier:**
- First chapter/dungeon free (2-3 hours)
- Lets players try before buying

**Paid Campaign ($3-5):**
- Full 10-20 hour experience
- Multiple chapters
- Unique rewards/items

**Subscription ($2/month):**
- New quests added weekly
- Early access to expansions

---

## Troubleshooting

### "AI generated quest references NPCs that don't exist"

**Cause:** World manifest not updated before AI generation

**Fix:**
```holoscript
// Manually regenerate manifest
await update_world_manifest();

// Then regenerate quests
await QuestManager.generate_ai_quests_async();
```

### "Players lose progress when they leave"

**Cause:** Session persistence not enabled

**Fix:**
```holoscript
world "MyCampaign" {
  @template("tabletop_rpg")

  features: {
    session_persistence: true  // ← Enable this
  }
}
```

### "Dice rolls don't show up"

**Cause:** dice_mechanics set to "narrative" instead of "5e-compatible"

**Fix:**
```holoscript
features: {
  dice_mechanics: "5e-compatible"  // Show d20 rolls
}
```

### "NPCs don't remember player from other campaigns"

**Cause:** cross_campaign_memory disabled

**Fix:**
```holoscript
features: {
  cross_campaign_memory: true  // Enable RAG-powered reputation
}
```

---

## API Reference

See [rpg-template-base.hsplus](./rpg-template-base.hsplus) for full API documentation.

### Key Classes

- `PlayerCharacter` - Player state, inventory, progression
- `QuestManager` - Quest tracking, AI generation
- `NPC` - Dialogue trees, merchants, quest givers
- `Quest` - Quest definition, objectives, rewards

### Key Functions

- `generate_npc_with_ai()` - Brittney generates NPC
- `QuestManager.generate_ai_quests_async()` - Brittney generates quests
- `d20()` - Roll 20-sided die (5e mode)
- `calculate_reputation()` - Compute cross-campaign reputation

---

## Examples

### Full Campaign Example

See [classic-dungeon-crawl.holo](./starter-kits/classic-dungeon-crawl.holo) for a complete 5-room dungeon with:
- Quest system
- NPC dialogue
- Traps and puzzles
- Boss fight
- Treasure room
- Voice customization

### Minimal Example

```holoscript
world "MyFirstCampaign" {
  @template("tabletop_rpg")
}

// That's it! Voice building takes care of the rest.
// Say: "Create a tavern with a quest giver"
```

---

## Support

- **Documentation:** [docs.hololand.com/templates/rpg](https://docs.hololand.com/templates/rpg)
- **Discord:** [discord.gg/hololand](https://discord.gg/hololand) #rpg-creators channel
- **Examples:** [github.com/hololand/rpg-examples](https://github.com/hololand/rpg-examples)

---

**Happy Campaign Creating! 🎲🐉**
