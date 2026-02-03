# 🤖 Brittney Game Integration - Quick Reference

## 5-Minute Setup

### 1. Import the Hook

```typescript
import useBrittneyGame from '@hooks/useBrittneyGame';
```

### 2. Use in Component

```typescript
const brittney = useBrittneyGame();
```

### 3. Generate Content

```typescript
// Generate dialogue
const dialogue = await brittney.generateNPCDialogue('Aldric', 'Warrior', 'friendly');

// Generate quest
const quest = await brittney.generateQuest('Dragon Hunt', 'hard');

// Generate ability
const ability = await brittney.generateAbility('Fireball', 'Mage', 5);

// Generate scene
const scene = await brittney.generateScene('Ancient Ruins', 3);
```

---

## Common Patterns

### Pattern 1: Interactive NPC Chat

```typescript
async function handleNPCClick(npcId: string, npcName: string, npcType: string) {
  const dialogue = await brittney.generateNPCDialogue(npcName, npcType);
  showDialogueBox(dialogue.dialogue);
}
```

### Pattern 2: Random Quest Generator

```typescript
async function generateDailyQuest() {
  const quest = await brittney.generateQuest(
    ['Dragon Hunting', 'Treasure Finding', 'Monster Slaying'][Math.floor(Math.random() * 3)],
    ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]
  );
  return quest;
}
```

### Pattern 3: Level-up Abilities

```typescript
async function unlockNewAbility(playerClass: string, newLevel: number) {
  const ability = await brittney.generateAbility(
    'Special Power',  // Will be named by Brittney
    playerClass,
    newLevel
  );
  playerAbilities.add(ability);
}
```

### Pattern 4: Procedural Scene Generation

```typescript
async function enterNewArea(areaName: string) {
  const scene = await brittney.generateScene(areaName, Math.random() * 5 + 2);
  loadScene(scene);
}
```

---

## State Management

### Set Context (Once)

```typescript
brittney.setGameContext({
  playerLevel: 15,
  currentScene: 'Dragon Peak',
  questLog: ['Main Quest', 'Side Quest 1'],
  inventory: ['Sword', 'Shield'],
});
```

### Get Context (Anytime)

```typescript
const context = brittney.getGameContext();
console.log(context.playerLevel);  // 15
```

---

## Error Handling

```typescript
try {
  const quest = await brittney.generateQuest('Dragon Hunt', 'hard');
} catch (error) {
  console.error('Failed to generate quest:', error);
  showErrorMessage('Unable to generate quest. Please try again.');
}
```

Or use the hook's error state:

```typescript
const brittney = useBrittneyGame();

{brittney.error && <div className="error">{brittney.error}</div>}
{brittney.loading && <div className="spinner">Generating...</div>}
```

---

## History Management

```typescript
// Get all dialogues from NPC
const aldricChats = brittney.getDialogueHistory('Aldric');

// Get all generation events
const allEvents = brittney.getEventHistory();

// Get only quest generations
const questEvents = brittney.getEventHistory('quest');

// Clear everything
brittney.clearHistory();
```

---

## Batch Generation

```typescript
// Generate 5 random dialogues quickly
const npcs = await brittney.generateMultiple('dialogue', 5, {
  npcType: 'Merchant',
  emotion: 'neutral',
});

// Generate 3 different quests
const quests = await brittney.generateMultiple('quest', 3, {
  difficulty: 'medium',
});

// Generate 10 combat abilities
const abilities = await brittney.generateMultiple('ability', 10, {
  characterClass: 'Mage',
  level: 10,
});
```

---

## Response Objects

### NPCDialogue

```typescript
{
  npcId: 'npc-1234567890',
  npcName: 'Aldric',
  dialogue: 'Greetings, adventurer!',
  emotion: 'friendly',
  suggestedAction: 'Accept quest'
}
```

### QuestSuggestion

```typescript
{
  questId: 'quest-1234567890',
  title: 'Slay the Dragon',
  description: 'A fearsome dragon terrorizes the kingdom...',
  rewards: {
    experience: 5000,
    gold: 1000,
    items: ['Dragon Scale', 'Ring of Power']
  },
  difficulty: 'hard',
  holoScriptCode: '// Generated HoloScript code...'
}
```

### AbilitySuggestion

```typescript
{
  abilityId: 'ability-1234567890',
  name: 'Meteor Strike',
  description: 'Rain meteors from the sky',
  cooldown: 15,
  manaCost: 100,
  damage: 250,
  holoScriptCode: '// Generated HoloScript code...'
}
```

### SceneGeneration

```typescript
{
  sceneId: 'scene-1234567890',
  sceneName: 'Dark Castle',
  description: 'A foreboding medieval castle surrounded by mist',
  npcs: [
    { id: 'npc-1', name: 'Guard Captain', type: 'Warrior' },
    { id: 'npc-2', name: 'Castle Mage', type: 'Mage' }
  ],
  hazards: ['Fire Traps', 'Spike Pits'],
  environmentCode: '// Generated HoloScript code...'
}
```

---

## Component Integration

### Add to Playground UI

**In App.tsx:**

```tsx
import BrittneyGameAssistant from '@components/BrittneyGameAssistant';

// Add to tab selection
<button onClick={() => setRightPanelTab('game-gen')}>
  🤖 Game Gen
</button>

// Add to conditional render
{rightPanelTab === 'game-gen' && <BrittneyGameAssistant />}
```

### Create Custom Component

```tsx
function MyGameGenerator() {
  const brittney = useBrittneyGame();
  const [results, setResults] = useState([]);

  const handleGenerate = async () => {
    const quest = await brittney.generateQuest('Sample', 'medium');
    setResults([...results, quest]);
  };

  return (
    <div>
      <button onClick={handleGenerate}>Generate</button>
      {results.map(r => <div key={r.questId}>{r.title}</div>)}
    </div>
  );
}
```

---

## Performance Checklist

- ✅ Use `generateMultiple()` for batch operations
- ✅ Call `setGameContext()` once, not repeatedly
- ✅ Clear history if you generate lots of content
- ✅ Wrap calls in try/catch for error handling
- ✅ Check `brittney.loading` before showing results
- ✅ Use `brittney.error` to display failures

---

## Useful Queries

```typescript
// Quest for specific level
const quest = await brittney.generateQuest(
  'Level 20 Challenge',
  playerLevel > 20 ? 'hard' : 'medium'
);

// Boss ability
const bossAbility = await brittney.generateAbility(
  'Boss Power',
  'Boss',
  999  // Very high level = very powerful
);

// Peaceful area with no hazards
const peacefulScene = await brittney.generateScene(
  'Peaceful village with traders and artisans',
  5
);

// Specific NPC response
const dialogue = await brittney.generateNPCDialogue(
  'King',
  'Royalty',
  'mysterious',
  'You bring important news about an ancient prophecy'
);
```

---

## Debugging

```typescript
// Log what Brittney knows about game state
console.log(brittney.getGameContext());

// See all past generations
brittney.getEventHistory().forEach(event => {
  console.log(`[${event.type}] ${event.content}`);
});

// Check specific NPC history
console.log(brittney.getDialogueHistory('Aldric'));

// See last generation
if (brittney.lastGenerated) {
  console.log(`Last generated: ${brittney.lastGenerated.type}`);
}
```

---

## Code Execution

All generated quests and abilities include HoloScript code you can execute:

```typescript
const ability = await brittney.generateAbility('Power Attack', 'Warrior', 10);

// Execute the ability code
if (ability.holoScriptCode) {
  const result = await executeHoloScript(ability.holoScriptCode);
}

// Similarly for quests
const quest = await brittney.generateQuest('Epic Battle', 'legendary');
if (quest.holoScriptCode) {
  await executeHoloScript(quest.holoScriptCode);
}
```

---

## Env Variables

```bash
# .env or .env.local
VITE_BRITTNEY_API=http://localhost:3001
VITE_BRITTNEY_API_KEY=optional-api-key
```

---

## File Locations

| Component | Path |
|-----------|------|
| Service | `packages/playground/src/services/BrittneyGameIntegration.ts` |
| Hook | `packages/playground/src/hooks/useBrittneyGame.ts` |
| UI Component | `packages/playground/src/components/BrittneyGameAssistant.tsx` |
| Full Docs | `BRITTNEY_GAME_INTEGRATION.md` |

---

## Quick Wins

### ✨ 1-Minute: Add NPC Chat

```tsx
const { generateNPCDialogue } = useBrittneyGame();

<button onClick={async () => {
  const d = await generateNPCDialogue('Npc', 'Type');
  alert(d.dialogue);
}}>Talk</button>
```

### ✨ 2-Minute: Random Daily Quest

```tsx
const { generateQuest } = useBrittneyGame();

useEffect(() => {
  generateQuest('Daily Challenge', 'medium').then(setDailyQuest);
}, []);
```

### ✨ 3-Minute: Boss Ability

```tsx
const { generateAbility } = useBrittneyGame();

const bossAbility = await generateAbility('Boss Attack', 'Boss', 100);
```

### ✨ 4-Minute: Random Scene

```tsx
const { generateScene } = useBrittneyGame();

const scene = await generateScene('Random Adventure', Math.random() * 5 + 1);
```

---

## That's It! 🎉

You now have everything you need to add AI-powered game content generation to Hololand Legends!

For details, see: [BRITTNEY_GAME_INTEGRATION.md](./BRITTNEY_GAME_INTEGRATION.md)
