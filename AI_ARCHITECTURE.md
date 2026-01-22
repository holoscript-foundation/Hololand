# AI Architecture: The Self-Building World

**Status**: 🟢 Production Ready  
**Core Components**: Brittney Architect / Spatial Intelligence  
**Concept**: "The game that builds itself"

---

## 1. Brittney: The AI Architect

**Brittney** is the native AI agent embedded within Hololand. She allows games to generate infinite content on the fly.

### Integration Stack

```mermaid
graph TD
    App["Game Logic"] -->|useBrittneyGame()| Service["Brittney Service"]
    Service -->|Context Window| GPT["Brittney Backend (GPT-4o)"]
    GPT -->|Structured JSON| Service
    Service -->|Hydration| ECS["ECS World State"]
```

### Capabilities

| Feature | Description | Architecture |
|---------|-------------|--------------|
| **QuestGen** | Dynamic quest chains based on player history | Context-Aware Prompting |
| **Living NPCs** | Real-time dialogue and behavior trees | `generateNPCDialogue()` |
| **Scene Composition** | Procedural placement of assets | `generateScene()` |
| **Game Balance** | AI-tuned item stats and abilities | Differential Evolution |

### Usage

```typescript
// React Hook for AI Generation
const { generateQuest, loading } = useBrittneyGame();

const onAcceptMission = async () => {
    // Generates a unique quest based on player level and location
    const quest = await generateQuest({
        theme: "Dragon Slaying",
        difficulty: "Hard",
        context: gameState
    });
    
    questLog.add(quest);
};
```

---

## 2. Spatial Intelligence (AR Suite)

The **AR Suite** (`@hololand/ar-*`) gives agents "eyes" to understand the physical world.

### Components

#### A. `@hololand/ar-tracking` (The Eyes)
- **SLAM (Simultaneous Localization and Mapping)**: Tracks device position in 3D space.
- **Image Tracking**: Recognizes posters, cards, and objects.

#### B. `@hololand/ar-anchors` (The Memory)
- **Geo-Spatial Persistence**: "Remembering" where virtual objects are placed in the real world.
- **Cloud Anchors**: Sharing object positions between multiple players.

#### C. `@hololand/ar-detection` (The Brain)
- **Plane Detection**: Identifying floors, walls, and tables.
- **Object Classification**: "This is a chair", "This is a door".

---

## 3. The "Hidden Velocity" Patterns

We observed that AI agents (including Brittney herself) are building features faster than human documentation can track.

**P.AI.AUTO_DISCOVERY.01**
- **Principle**: The codebase is a living organism.
- **Practice**: Periodic filesystem scans are required to find "Dark Matter" features.
- **Evidence**: Discovery of the complete AR Suite and VRChat Compiler in `packages/`.

---

## 4. Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| **Phase 1** | Generative Content (Quests/NPCs) | ✅ Live |
| **Phase 2** | Spatial Anchoring (Shared AR) | ✅ Live |
| **Phase 3** | "Living World" (Agents modify own code) | 🟡 Beta |
| **Phase 4** | Full Autonomy (Brittney releases updates) | 🧪 Alpha |
