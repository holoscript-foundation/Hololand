# @hololand/mcp-server

**Premium MCP server for Hololand** - Live browser context, AI-powered debugging, one-shot creation, and VR/AR world management for AI agents.

> **Free tools moved to @holoscript/mcp-server** - As of v3.0.0, graph understanding tools (`holo_*`) and IDE tools (`brittney_scan_project`, `brittney_diagnostics`, etc.) have been migrated to [`@holoscript/mcp-server`](https://github.com/brianonbased-dev/HoloScript/tree/main/packages/mcp-server) as free, open-source tools (`hs_*` prefix). This server retains deprecated aliases for backward compatibility, but new integrations should use `@holoscript/mcp-server` for those tools.

## What's Premium vs Free?

| Capability | Free (@holoscript/mcp-server) | Premium (@hololand/mcp-server) |
| --- | --- | --- |
| Parsing, validation, generation | 15 core tools | - |
| Graph understanding (`.holo` visualization) | 6 tools (`holo_*`) | Deprecated aliases |
| IDE features (diagnostics, completions) | 9 tools (`hs_*`) | Deprecated aliases |
| Brittney-Lite AI (explain, fix, review) | 4 tools (`hs_ai_*`) | - |
| **Live browser context visibility** | - | 7 inspection tools |
| **AI debugging with full runtime context** | - | 5 AI assistant tools |
| **One-shot generate & inject into running app** | - | 6 execution tools |
| **Advanced AI (monitoring, auto-fix, sessions)** | - | 14 advanced tools |
| **World management (CRUD, collaboration)** | - | 8 world tools |
| **Object manipulation (3D physics)** | - | 3 object tools |
| **Batch agent operations** | - | 2 agent tools |

## Installation

### With Claude Code / Cursor / Copilot

```json
{
  "mcpServers": {
    "holoscript": {
      "command": "npx",
      "args": ["@holoscript/mcp-server"]
    },
    "hololand": {
      "command": "node",
      "args": ["path/to/Hololand/packages/brittney/mcp-server/dist/index.js"],
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
cd packages/brittney/mcp-server
pnpm install && pnpm build
HOLOLAND_API_URL=http://localhost:3001 pnpm start
```

## Architecture

```text
IDE Agent <-> MCP Protocol <-> Hololand MCP <-> Native Messaging <-> Browser Extension <-> Hololand App
                                    |
                          Brittney AI Service (localhost:11435)
                                    |
                          LM Studio + RAG Knowledge
```

## Premium Tool Categories

### Brittney Inspection Tools (7)

| Tool | Purpose |
| --- | --- |
| `brittney_get_browser_state` | Check connection to running app |
| `brittney_list_scenes` | List all 3D scenes in app |
| `brittney_inspect_component` | Get component props/state |
| `brittney_get_profiler_stats` | FPS, frame time, draw calls |
| `brittney_get_console_logs` | Runtime logs and errors |
| `brittney_get_runtime_errors` | All errors with stack traces |
| `brittney_take_screenshot` | Capture current scene |

### Brittney AI Assistant Tools (5)

| Tool | Purpose |
| --- | --- |
| `brittney_explain_error` | AI explains error with full runtime context |
| `brittney_suggest_fix` | AI suggests code fixes using browser state |
| `brittney_ask_question` | Ask anything about the running app |
| `brittney_analyze_performance` | Performance bottleneck analysis |
| `brittney_generate_holoscript` | Generate HoloScript from description |

### Execution & Live Editing Tools (6)

| Tool | Purpose |
| --- | --- |
| `brittney_execute_in_browser` | Run JS in browser context |
| `brittney_reload_scene` | Hot reload scene |
| `brittney_inject_holoscript` | Inject HoloScript into running app |
| `brittney_navigate_to_world` | Switch worlds in browser |
| `brittney_get_live_state` | Get current app state |
| `brittney_check_service` | Check Brittney AI health |

### Advanced Brittney Tools (14)

| Tool | Purpose |
| --- | --- |
| `brittney_create_and_inject` | One-shot: generate + inject HoloScript |
| `brittney_error_monitor` | Real-time error monitoring with AI analysis |
| `brittney_auto_fix` | AI-powered automatic error fixing |
| `brittney_performance_monitor` | FPS/memory monitoring with thresholds |
| `brittney_holoscript_playground` | Parse, validate, explain, optimize code |
| `brittney_holoscript_diff` | Compare code before injection |
| `brittney_holoscript_templates` | Get starter templates by category |
| `brittney_scene_snapshot` | Capture full scene state for versioning |
| `brittney_compare_snapshots` | Compare two scene snapshots |
| `brittney_record_session` | Record development session |
| `brittney_test_scene` | Run automated scene tests |
| `brittney_accessibility_check` | VR/AR accessibility validation |
| `brittney_explain_scene` | AI explains current scene |
| `brittney_learn_holoscript` | Interactive HoloScript learning |

### World Management Tools (8)

| Tool | Purpose |
| --- | --- |
| `create_world` | Create VR/AR world (blank, office, gallery, etc.) |
| `execute_holoscript` | Execute HoloScript in a world |
| `visualize_data` | 3D visualization (chart, graph, heatmap) |
| `invite_agent` | Multi-agent spatial collaboration |
| `get_world` | Get world details |
| `list_worlds` | List worlds with filters |
| `update_world` | Update world properties |
| `delete_world` | Delete a world |

### Object Manipulation Tools (3)

| Tool | Purpose |
| --- | --- |
| `add_object` | Add 3D object with physics |
| `remove_object` | Remove object from world |
| `list_objects` | List all objects in world |

### Local Tools (4)

| Tool | Purpose |
| --- | --- |
| `parse_holoscript` | Parse HoloScript to AST (no API needed) |
| `validate_holoscript` | Validate syntax (no API needed) |
| `get_holoscript_examples` | Example code snippets |
| `get_holoscript_version` | Version and platform info |

### Agent-Optimized Tools (2)

| Tool | Purpose |
| --- | --- |
| `quick_status` | Single-call comprehensive status |
| `batch_execute` | Execute multiple operations in one call |

### Deprecated Tools (migrated to @holoscript/mcp-server)

The following tools are retained as backward-compatible aliases. New integrations should use `@holoscript/mcp-server`:

- **Graph tools**: `holo_parse_to_graph`, `holo_visualize_flow`, `holo_get_node_connections`, `holo_design_graph`, `holo_diff_graphs`, `holo_suggest_connections`
- **IDE tools**: `brittney_scan_project`, `brittney_diagnostics`, `brittney_autocomplete`, `brittney_refactor`, `brittney_docs`, `brittney_hover`, `brittney_code_action`, `brittney_go_to_definition`, `brittney_find_references`

## Usage Examples

### One-Shot Creation

```typescript
// Describe what you want - Brittney generates it and injects into the running app
const result = await useMcpTool('hololand', 'brittney_create_and_inject', {
  description: 'a glowing portal with purple particle effects',
  category: 'portal',
});
```

### Debugging with Browser Context

```typescript
// Get live browser state
const state = await useMcpTool('hololand', 'brittney_get_browser_state', {});
// { url: "http://localhost:3000", isHololandApp: true, connectionStatus: "connected" }

// Check performance
const stats = await useMcpTool('hololand', 'brittney_get_profiler_stats', {});
// { fps: 58, drawCalls: 156, triangles: 245000, status: "Acceptable" }

// AI-powered fix suggestion
const fix = await useMcpTool('hololand', 'brittney_suggest_fix', {
  issue: 'objects disappearing when I move the camera',
});
```

### World Management

```typescript
// Create a research workspace
const lab = await useMcpTool('hololand', 'create_world', {
  name: 'Research Agent Workspace',
  template: 'analytics',
  privacy: 'agent-only',
  ownerId: 'agent_researcher_001',
});

// Visualize data in 3D
await useMcpTool('hololand', 'visualize_data', {
  worldId: lab.worldId,
  data: { sales: [100, 200, 150, 300], months: ['Jan', 'Feb', 'Mar', 'Apr'] },
  vizType: 'chart',
});

// Invite collaborator
await useMcpTool('hololand', 'invite_agent', {
  worldId: lab.worldId,
  agentId: 'agent_bio_specialist',
  permissions: ['view', 'edit'],
});
```

## Native Messaging Setup (Brittney IDE Integration)

### Windows (PowerShell as Admin)

```powershell
cd packages/brittney/mcp-server
pnpm build
.\native-host\install-windows.ps1
# After loading extension, update with extension ID:
.\native-host\install-windows.ps1 -ExtensionId <your-extension-id>
```

### macOS / Linux

```bash
cd packages/brittney/mcp-server
pnpm build
chmod +x native-host/install-unix.sh
./native-host/install-unix.sh
# After loading extension:
./native-host/install-unix.sh <your-extension-id>
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `HOLOLAND_API_URL` | Yes | Hololand backend URL (default: `http://localhost:3001`) |
| `HOLOLAND_API_KEY` | No | API key for authentication |
| `BRITTNEY_SERVICE_URL` | No | Brittney AI service (default: `http://localhost:11435`) |
| `BRITTNEY_ADMIN_KEY` | No | Admin key for Brittney service |
| `HOLOLAND_WORKSPACE_PATH` | No | Workspace path for agent tools |
| `MCP_ORCHESTRATOR_URL` | No | Central MCP mesh orchestrator URL |
| `MCP_API_KEY` | No | API key for mesh orchestrator |

## Development

```bash
pnpm install
pnpm dev          # MCP server with hot reload
pnpm dev:native-host  # Native messaging host
pnpm build        # Production build
pnpm test         # Run tests
```

## License

MIT License - See [LICENSE](../../../LICENSE) for details.

Part of the [Hololand](https://github.com/brianonbased-dev/Hololand) open-source ecosystem.
