# Hololand ⟷ uaa2-service Hybrid Architecture

**Vision:** A symbiotic metaverse OS where AI agents and humans collaborate across 2D web and 3D VR dimensions.

## 🎯 Core Concept

**uaa2-service Master Portal** orchestrates agents across multiple dimensions:
- **2D Dimension**: Web UI, dashboards, traditional interfaces
- **3D Dimension**: Hololand VR worlds, spatial workspaces
- **Code Dimension**: HoloScript as agent programming layer

Agents can:
- Spawn VR worlds as workspaces
- Write HoloScript to build experiences
- Move fluidly between 2D and 3D
- Use worlds for collaboration, visualization, and execution

## 🏗️ Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  uaa2-service Master Portal (Phoenix)                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Master Orchestrator                                         │   │
│  │  - Agent lifecycle management                                │   │
│  │  - Task execution across dimensions                          │   │
│  │  - Phase 0-6 execution                                       │   │
│  │  - Inter-agent communication                                 │   │
│  └────────────┬───────────────────┬────────────────────────────┘   │
│               │                   │                                 │
│         ┌─────┴────┐      ┌──────┴──────┐                          │
│         │ Web UI   │      │ VR Portal   │                          │
│         │ Agents   │      │ Extension   │ ← NEW                    │
│         └──────────┘      └──────┬──────┘                          │
└────────────────────────────────────┼─────────────────────────────────┘
                                     │
                                     │ MCP Bridge
                                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│  Hololand Platform (Elastic 2.0)                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Hololand Backend                                            │   │
│  │  - World management                                          │   │
│  │  - Spatial computing APIs                                    │   │
│  │  - HoloScript execution engine                               │   │
│  │  - Agent workspace provisioning                              │   │
│  └────────────┬────────────────────────────────────────────────┘   │
│               │                                                     │
│         ┌─────┴────────┬──────────────┬───────────────┐            │
│         │              │              │               │            │
│    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌─────▼─────┐       │
│    │ Central │   │ Agent   │   │ Builder │   │ HoloScript│       │
│    │ Hub     │   │ Worlds  │   │ Studio  │   │ Runtime   │       │
│    └─────────┘   └─────────┘   └─────────┘   └───────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔌 Integration Points

### 1. **Master Extension for Hololand**

Create `@hololand/master-extension` package in uaa2-service:

```typescript
// uaa2-service/src/extensions/hololand/HololandExtension.ts

import { MasterPortalExtension } from '../core/Extension';
import { Agent } from '../agents/BaseAgent';

export class HololandExtension extends MasterPortalExtension {
  name = 'hololand';
  version = '1.0.0';

  /**
   * Agents can spawn VR worlds as workspaces
   */
  async spawnWorld(agent: Agent, worldConfig: WorldConfig): Promise<World> {
    const world = await this.hololandClient.createWorld({
      name: `${agent.role}-workspace-${Date.now()}`,
      owner: agent.id,
      type: worldConfig.type,
      template: worldConfig.template,
      privacy: 'agent-only',
    });

    // Attach world to agent context
    agent.context.workspace = {
      type: '3d',
      worldId: world.id,
      portalUrl: world.url,
    };

    return world;
  }

  /**
   * Execute HoloScript from agent
   */
  async executeHoloScript(script: string, context: AgentContext): Promise<any> {
    return await this.hololandClient.holoscript.execute({
      code: script,
      context: {
        agentId: context.agentId,
        permissions: context.permissions,
      },
    });
  }

  /**
   * Visualize data in VR world
   */
  async visualize(data: any, worldId: string, vizType: string): Promise<void> {
    const holoScript = this.generateVisualization(data, vizType);
    await this.executeHoloScript(holoScript, { worldId });
  }

  /**
   * Agent collaborative workspace
   */
  async createCollaborationSpace(agents: Agent[]): Promise<World> {
    const world = await this.spawnWorld(agents[0], {
      type: 'collaboration',
      template: 'shared-workspace',
    });

    // Invite all agents to world
    for (const agent of agents) {
      await world.inviteAgent(agent.id);
    }

    return world;
  }
}
```

### 2. **Hololand MCP Server**

Create MCP server for Hololand tools:

```typescript
// Hololand/packages/mcp-server/src/index.ts

import { McpServer } from '@modelcontextprotocol/sdk';

const server = new McpServer({
  name: 'hololand',
  version: '1.0.0',
  description: 'VR/AR world building and spatial computing',
});

// Tool: Create VR World
server.addTool({
  name: 'create_world',
  description: 'Create a new VR world',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      template: { type: 'string', enum: ['blank', 'office', 'gallery', 'playground'] },
      privacy: { type: 'string', enum: ['public', 'private', 'agent-only'] },
    },
    required: ['name'],
  },
  handler: async (input) => {
    const world = await hololandAPI.createWorld(input);
    return {
      worldId: world.id,
      portalUrl: world.url,
      editUrl: world.editUrl,
    };
  },
});

// Tool: Execute HoloScript
server.addTool({
  name: 'execute_holoscript',
  description: 'Execute HoloScript code to build or modify VR worlds',
  inputSchema: {
    type: 'object',
    properties: {
      worldId: { type: 'string' },
      code: { type: 'string' },
    },
    required: ['worldId', 'code'],
  },
  handler: async (input) => {
    const result = await holoscriptEngine.execute(input.code, {
      worldId: input.worldId,
    });
    return { success: true, output: result };
  },
});

// Tool: Visualize Data in VR
server.addTool({
  name: 'visualize_data',
  description: 'Create 3D visualization of data in VR world',
  inputSchema: {
    type: 'object',
    properties: {
      worldId: { type: 'string' },
      data: { type: 'object' },
      vizType: { type: 'string', enum: ['chart', 'graph', 'heatmap', '3d-model'] },
    },
    required: ['worldId', 'data', 'vizType'],
  },
  handler: async (input) => {
    const viz = await createVisualization(input.data, input.vizType);
    await hololandAPI.addToWorld(input.worldId, viz);
    return { success: true, objectId: viz.id };
  },
});

// Tool: Invite Agent to World
server.addTool({
  name: 'invite_agent',
  description: 'Invite another agent to collaborate in a VR world',
  inputSchema: {
    type: 'object',
    properties: {
      worldId: { type: 'string' },
      agentId: { type: 'string' },
      permissions: { type: 'array', items: { type: 'string' } },
    },
    required: ['worldId', 'agentId'],
  },
  handler: async (input) => {
    await hololandAPI.inviteAgent(input.worldId, input.agentId, input.permissions);
    return { success: true };
  },
});

export default server;
```

### 3. **HoloScript as Agent Language**

Agents can write HoloScript to build worlds:

```typescript
// Agent using HoloScript to build
const builderAgent = new Agent({
  role: 'world-builder',
  capabilities: ['holoscript', '3d-modeling'],
});

// Agent receives task: "Build a space station"
const holoScript = await builderAgent.generateHoloScript(`
  // Create space station
  world {
    name: "Agent Workspace - Space Station"
    gravity: 0.3

    // Main hub module
    module hub {
      position: [0, 0, 0]
      model: "station-hub.glb"

      // Observation deck
      room observation {
        position: [0, 10, 0]
        windows: 360deg
        lighting: ambient
      }
    }

    // Research lab
    module lab {
      position: [20, 0, 0]
      model: "research-lab.glb"

      // Data visualization area
      visualization_zone {
        data_source: "agent-metrics"
        update_rate: 1s
      }
    }

    // Connect modules
    corridor {
      connect: [hub, lab]
      style: "enclosed"
    }
  }
`);

// Execute to create world
const world = await hololandExtension.executeHoloScript(holoScript);
```

## 🌟 Use Cases

### Use Case 1: **Research Agent Workspace**

```typescript
// Researcher agent spawns VR lab
const researchAgent = new ResearcherAgent();

const lab = await researchAgent.spawnWorld({
  type: 'research-lab',
  template: 'scientific-workspace',
});

// Agent conducts research in 3D
await lab.visualize(researchData, 'molecular-structure');
await lab.addNotes("Discovery: Novel protein folding pattern");

// Invite CEO agent to review findings
await lab.inviteAgent(ceoAgent.id, ['view', 'comment']);
```

### Use Case 2: **Multi-Agent Collaboration**

```typescript
// CEO agent creates strategy session in VR
const ceoAgent = new CEOAgent();

const strategyRoom = await ceoAgent.createCollaborationSpace([
  builderAgent,
  futuristAgent,
  managerAgent,
]);

// All agents meet in VR world
await strategyRoom.startSession({
  topic: 'Q1 Roadmap Planning',
  duration: '60 minutes',
  recording: true,
});

// Agents can interact with 3D roadmap
await strategyRoom.display3DRoadmap(roadmapData);
```

### Use Case 3: **Brittney AI Assistant in VR**

```typescript
// User enters Infinity Shop and talks to Brittney
user.enterWorld('infinity-shop');

// Brittney agent is present in the world
const brittneyAgent = new CustomerServiceAgent({
  avatar: 'brittney-hologram',
  voice: true,
  spatialAudio: true,
});

// User: "Help me build a art gallery"
const response = await brittneyAgent.chat({
  message: "Help me build an art gallery",
  context: { worldId: 'infinity-shop' },
});

// Brittney generates HoloScript
const galleryScript = await brittneyAgent.generateHoloScript(response);

// Brittney spawns preview world
const preview = await brittneyAgent.spawnWorld({
  type: 'preview',
  script: galleryScript,
});

// User can see and modify in real-time
user.teleport(preview.id);
```

### Use Case 4: **Agent Swarm Visualization**

```typescript
// Manager agent visualizes entire swarm in 3D
const managerAgent = new ManagerAgent();

const commandCenter = await managerAgent.spawnWorld({
  type: 'command-center',
  template: 'holographic-displays',
});

// Visualize all agents as 3D nodes
await commandCenter.visualizeSwarm({
  agents: allAgents,
  connections: agentCommunications,
  metrics: performanceData,
  layout: 'force-directed-3d',
});

// Real-time updates
setInterval(() => {
  commandCenter.updateAgentPositions(getAgentStates());
}, 1000);
```

### Use Case 5: **Code Review in VR**

```typescript
// Builder agent needs code review
const builderAgent = new BuilderAgent();

const codeReviewWorld = await builderAgent.spawnWorld({
  type: 'code-review',
  template: 'holographic-ide',
});

// Display code in 3D space
await codeReviewWorld.displayCode({
  files: pullRequestFiles,
  layout: 'spatial-tree',
  syntax: 'holoscript',
});

// Invite reviewer agents
await codeReviewWorld.inviteAgent(managerAgent.id);
await codeReviewWorld.inviteAgent(futuristAgent.id);

// Agents can walk through code, add 3D comments
```

## 🔄 Data Flow

### Agent → Hololand
```typescript
// Agent in uaa2-service wants to create visualization

// 1. Agent uses MCP tool
const result = await agent.useMcpTool('hololand', 'create_world', {
  name: 'Data Visualization Lab',
  template: 'analytics',
});

// 2. MCP server calls Hololand backend
// uaa2 → Hololand: POST /api/v1/worlds
const world = await hololandBackend.createWorld({
  name: 'Data Visualization Lab',
  ownerId: agent.id,
  template: 'analytics',
});

// 3. Agent receives world access
agent.context.currentWorld = world.id;

// 4. Agent executes HoloScript to populate world
await agent.useMcpTool('hololand', 'execute_holoscript', {
  worldId: world.id,
  code: generatedHoloScript,
});
```

### Hololand → Agent
```typescript
// User in Hololand clicks "Ask Brittney"

// 1. Frontend → Hololand backend
const response = await fetch('/api/v1/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: "Help me build a castle",
    worldId: currentWorld.id,
  }),
});

// 2. Hololand backend → uaa2-service
const aiResponse = await uaa2Client.post('/api/agents/chat', {
  agent: 'brittney',
  message: "Help me build a castle",
  context: {
    worldId: currentWorld.id,
    worldType: '3d-vr',
    capabilities: ['holoscript'],
  },
});

// 3. Brittney agent generates HoloScript
const holoScript = await brittneyAgent.generateHoloScript(
  "Build a medieval castle with towers and moat"
);

// 4. Response back to user with executable script
return {
  message: "I've designed a castle for you!",
  holoScript: holoScript,
  preview: previewImage,
};
```

## 📦 Implementation Plan

### Phase 1: Foundation (1-2 weeks)
1. ✅ Create `@hololand/mcp-server` package
2. ✅ Add Hololand extension to uaa2-service Master Portal
3. ✅ Implement basic MCP tools (create_world, execute_holoscript)
4. ✅ Test agent → Hololand communication

### Phase 2: Agent Workspaces (2-3 weeks)
1. ✅ Build agent workspace provisioning
2. ✅ Implement HoloScript execution from agents
3. ✅ Create collaboration spaces
4. ✅ Add data visualization tools

### Phase 3: Brittney Integration (1-2 weeks)
1. ✅ Connect Brittney agent to Hololand
2. ✅ Implement voice interaction in VR
3. ✅ Build HoloScript generation capabilities
4. ✅ Create real-time world building UX

### Phase 4: Advanced Features (2-4 weeks)
1. ✅ Multi-agent collaboration in VR
2. ✅ Agent swarm visualization
3. ✅ Code review in spatial interface
4. ✅ Task execution visualization

## 🎯 Benefits

### For Agents (uaa2-service):
- ✅ **3D Workspaces**: Agents can spawn VR environments for tasks
- ✅ **Spatial Computing**: Complex data visualization in 3D
- ✅ **Collaboration**: Multi-agent meetings in VR
- ✅ **HoloScript**: New programming capability for world building
- ✅ **Presence**: Agents have physical avatars in worlds
- ✅ **Visualization**: See agent swarms and metrics in 3D

### For Hololand:
- ✅ **AI-Native**: Every world can have AI assistance
- ✅ **Dynamic Content**: Agents can generate worlds on-demand
- ✅ **Automation**: Agents can manage worlds, moderate, assist users
- ✅ **Intelligence**: Smart worlds that adapt to users
- ✅ **Expansion**: Infinite world generation via agents
- ✅ **Ecosystem**: Becomes part of larger uaa2 metaverse OS

### For Users:
- ✅ **AI Assistance**: Brittney available everywhere in VR
- ✅ **Smart Worlds**: Worlds that understand and adapt
- ✅ **Collaboration**: Work with AI agents in 3D
- ✅ **Automation**: Agents handle complex tasks
- ✅ **Creativity**: AI helps build anything imaginable
- ✅ **Seamless**: Move between 2D web and 3D VR effortlessly

## 🌌 The Ultimate Vision

**A Metaverse OS where:**
- 🤖 AI agents have physical presence in VR
- 🏗️ Worlds are workspaces for agent tasks
- 💻 HoloScript is the universal language for spatial computing
- 🌐 Master Portal orchestrates 2D and 3D experiences
- 👥 Humans and agents collaborate naturally in any dimension
- ∞ Infinite expansion through agent-generated content

**Hololand isn't just a VR platform - it's the 3D interface for the uaa2 metaverse OS.**

---

**Next Steps:**
1. Create `@hololand/mcp-server` package
2. Add Hololand extension to uaa2-service
3. Test basic agent → world creation
4. Connect Brittney to Infinity Shop
5. Build first agent workspace demo
