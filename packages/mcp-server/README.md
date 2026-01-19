# @hololand/mcp-server

**Model Context Protocol server for Hololand** - Enables AI agents to create and manage VR/AR worlds, execute HoloScript, and collaborate in spatial environments.

## Overview

This MCP server bridges AI agents (like those in uaa2-service) with the Hololand VR/AR platform. Agents can use these tools to:

- 🌍 **Create VR worlds** as workspaces
- 💻 **Execute HoloScript** to build spatial experiences
- 📊 **Visualize data** in 3D
- 🤝 **Collaborate** with other agents in VR
- 🏗️ **Manage worlds** (CRUD operations)
- 🔍 **Brittney Integration** - Browser context visibility for IDE agents

## Brittney IDE Agent Integration

Brittney helps IDE coding agents (Claude Code, Cursor, Copilot) see what's happening in the running Hololand app. No more "programming with a blindfold on."

### Architecture
```
IDE Agent ←→ MCP Protocol ←→ Brittney Tools ←→ Native Messaging ←→ Browser Extension ←→ Hololand App
```

### Brittney Tools

| Tool | Purpose |
|------|---------|
| `brittney_get_browser_state` | Check connection to running app |
| `brittney_list_scenes` | List all 3D scenes in app |
| `brittney_inspect_component` | Get component props/state |
| `brittney_get_profiler_stats` | FPS, frame time, draw calls |
| `brittney_get_console_logs` | Runtime logs and errors |
| `brittney_get_runtime_errors` | All errors with stack traces |
| `brittney_take_screenshot` | Capture current scene |
| `brittney_explain_error` | AI explains error with context |
| `brittney_suggest_fix` | AI suggests code fixes |
| `brittney_ask_question` | Ask anything about running app |
| `brittney_analyze_performance` | Performance bottleneck analysis |
| `brittney_execute_in_browser` | Run JS in browser context |
| `brittney_reload_scene` | Hot reload scene |

### Example: Debugging with Brittney

```typescript
// Claude Code workflow
const browserState = await useMcpTool('hololand', 'brittney_get_browser_state', {});
// { url: "http://localhost:3000", isHololandApp: true, connectionStatus: "connected" }

const stats = await useMcpTool('hololand', 'brittney_get_profiler_stats', {});
// { fps: 58, drawCalls: 156, triangles: 245000, status: "⚠ Acceptable" }

const analysis = await useMcpTool('hololand', 'brittney_suggest_fix', {
  issue: "objects disappearing when I move the camera"
});
// Returns AI analysis with specific code fix suggestions
```

---

## Tools Provided

### 1. `create_world`
Create a new VR/AR world for agent workspaces, visualizations, or collaboration.

**Parameters:**
- `name` (required): World name
- `template` (optional): Template type (`blank`, `office`, `gallery`, `playground`, `analytics`, `collaboration`)
- `privacy` (optional): Privacy setting (`public`, `private`, `agent-only`)
- `ownerId` (optional): Agent ID that owns the world

**Example:**
```typescript
const result = await useMcpTool('hololand', 'create_world', {
  name: 'Research Agent Workspace',
  template: 'analytics',
  privacy: 'agent-only',
  ownerId: 'agent_researcher_001',
});
// Returns: { worldId, portalUrl, editUrl }
```

### 2. `execute_holoscript`
Execute HoloScript code to build or modify VR worlds.

**Parameters:**
- `worldId` (required): Target world ID
- `code` (required): HoloScript code
- `context` (optional): Additional context

**Example:**
```typescript
const holoScript = `
  world {
    name: "Data Visualization Lab"

    chart {
      type: bar3d
      data: sales_data
      position: [0, 2, 0]
    }

    heatmap {
      data: user_activity
      position: [5, 1, 0]
    }
  }
`;

await useMcpTool('hololand', 'execute_holoscript', {
  worldId: 'world_123',
  code: holoScript,
});
```

### 3. `visualize_data`
Create 3D visualizations of data in VR.

**Parameters:**
- `worldId` (required): World to add visualization
- `data` (required): Data object (JSON)
- `vizType` (required): Visualization type (`chart`, `graph`, `heatmap`, `3d-model`)

**Example:**
```typescript
await useMcpTool('hololand', 'visualize_data', {
  worldId: 'world_123',
  data: {
    sales: [100, 200, 150, 300],
    months: ['Jan', 'Feb', 'Mar', 'Apr'],
  },
  vizType: 'chart',
});
```

### 4. `invite_agent`
Invite another agent to collaborate in a VR world.

**Parameters:**
- `worldId` (required): World ID
- `agentId` (required): Agent to invite
- `permissions` (optional): Array of permissions (`view`, `edit`, `admin`)

**Example:**
```typescript
await useMcpTool('hololand', 'invite_agent', {
  worldId: 'world_123',
  agentId: 'agent_builder_002',
  permissions: ['view', 'edit'],
});
```

### 5. `get_world`
Get details about a specific world.

**Example:**
```typescript
const world = await useMcpTool('hololand', 'get_world', {
  worldId: 'world_123',
});
```

### 6. `list_worlds`
List all worlds, with optional filters.

**Parameters:**
- `ownerId` (optional): Filter by owner
- `type` (optional): Filter by type

**Example:**
```typescript
const worlds = await useMcpTool('hololand', 'list_worlds', {
  ownerId: 'agent_researcher_001',
});
```

### 7. `update_world`
Update world properties.

**Example:**
```typescript
await useMcpTool('hololand', 'update_world', {
  worldId: 'world_123',
  updates: {
    name: 'Updated World Name',
    description: 'New description',
  },
});
```

### 8. `delete_world`
Delete a world (permanent).

**Example:**
```typescript
await useMcpTool('hololand', 'delete_world', {
  worldId: 'world_123',
});
```

## Installation

### In uaa2-service

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "hololand": {
      "command": "node",
      "args": [
        "/path/to/Hololand/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "HOLOLAND_API_URL": "http://localhost:3001",
        "HOLOLAND_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Standalone

```bash
cd packages/mcp-server
npm install
npm run build

# Run server
HOLOLAND_API_URL=http://localhost:3001 npm start
```

## Environment Variables

- `HOLOLAND_API_URL` (required): URL to Hololand backend API (default: `http://localhost:3001`)
- `HOLOLAND_API_KEY` (optional): API key for authentication

## Use Cases

### 1. Research Agent Workspace

```typescript
// Agent spawns VR lab for data analysis
const lab = await createWorld({
  name: 'Research Lab - Protein Analysis',
  template: 'analytics',
  privacy: 'agent-only',
});

// Visualize research data
await visualizeData({
  worldId: lab.worldId,
  data: proteinStructures,
  vizType: '3d-model',
});

// Invite collaborator
await inviteAgent({
  worldId: lab.worldId,
  agentId: 'agent_bio_specialist',
});
```

### 2. Multi-Agent Strategy Session

```typescript
// CEO agent creates meeting room
const strategyRoom = await createWorld({
  name: 'Q1 Strategy Session',
  template: 'collaboration',
});

// Invite team
for (const agentId of teamAgents) {
  await inviteAgent({
    worldId: strategyRoom.worldId,
    agentId,
  });
}

// Display 3D roadmap
await executeHoloScript({
  worldId: strategyRoom.worldId,
  code: generate3DRoadmap(roadmapData),
});
```

### 3. Real-time Data Dashboard

```typescript
// Build live monitoring dashboard
const dashboard = await createWorld({
  name: 'System Monitoring Dashboard',
  template: 'analytics',
});

// Update visualizations every second
setInterval(async () => {
  const metrics = await getSystemMetrics();

  await visualizeData({
    worldId: dashboard.worldId,
    data: metrics,
    vizType: 'heatmap',
  });
}, 1000);
```

## Architecture

```
┌─────────────────────────────────────────┐
│  uaa2-service (AI Agents)               │
│  ┌──────────────────────────────────┐   │
│  │  Agent uses MCP tool             │   │
│  │  await createWorld(...)          │   │
│  └──────────────┬───────────────────┘   │
└─────────────────┼───────────────────────┘
                  │ MCP Protocol (stdio)
                  ↓
┌─────────────────────────────────────────┐
│  @hololand/mcp-server                   │
│  ┌──────────────────────────────────┐   │
│  │  Translates MCP calls            │   │
│  │  to Hololand API requests        │   │
│  └──────────────┬───────────────────┘   │
└─────────────────┼───────────────────────┘
                  │ HTTPS REST API
                  ↓
┌─────────────────────────────────────────┐
│  Hololand Backend                       │
│  ┌──────────────────────────────────┐   │
│  │  POST /api/v1/worlds             │   │
│  │  POST /api/v1/holoscript/execute │   │
│  │  POST /api/v1/visualize          │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## License

MIT License - See [LICENSE](../../LICENSE) for details.

This MCP server is part of the Hololand open-source ecosystem.

---

**Built for the uaa2-service Master Portal** 🌌
