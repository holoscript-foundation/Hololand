/**
 * Hololand MCP Server (Premium)
 *
 * Enables AI agents to create and manage VR/AR worlds, execute HoloScript,
 * and collaborate in spatial environments.
 *
 * Premium features:
 * - Live browser context visibility via Brittney
 * - AI-powered debugging with full context
 * - One-shot generate & inject pipeline
 * - Real-time error monitoring with auto-fix
 * - Performance guard with AI optimization
 * - Session recording & replay
 * - Scene versioning
 * - Batch agent operations
 *
 * NOTE: Graph understanding tools (holo_*) and IDE tools (brittney_scan_project,
 * brittney_diagnostics, brittney_autocomplete, brittney_refactor, brittney_docs,
 * brittney_hover, brittney_code_action, brittney_go_to_definition, brittney_find_references)
 * have been migrated to @holoscript/mcp-server (free tier) as of v3.0.0.
 * Use the holoscript-mcp server for those tools. This server retains them as
 * deprecated aliases that delegate to the same logic for backward compatibility.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Brittney IDE Agent Integration Tools
import { brittneyTools, handleBrittneyTool } from './brittney-tools.js';
import { advancedBrittneyTools, handleAdvancedBrittneyTool } from './advanced-brittney-tools.js';
import { brittneyIDETools, handleBrittneyIDETool } from './brittney-ide-tools.js';

// HoloScript Graph Understanding Tools (helps agents understand .holo as visual graphs)
import { holoGraphTools, handleHoloGraphTool } from './holo-graph-tools.js';

// Agent-Friendly Tools (optimized for AI agent efficiency)
import { agentTools, handleAgentTool } from './agent-tools.js';

// Memory Persistence Tools
import { memoryTools, handleMemoryTool } from './memory-tools.js';

// Spatial Indexing Tools
import { spatialTools, handleSpatialTool } from './spatial-tools.js';

// Dataset Extraction Tools
import { datasetTools, handleDatasetTool } from './dataset-tools.js';

// Import HoloScript code parser for local validation
// Using dynamic require to work around @holoscript/core ESM resolution issue
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const holoscriptCore = require('@holoscript/core');
const HoloScriptCodeParser = holoscriptCore.HoloScriptCodeParser;
const HOLOSCRIPT_DEMO_SCRIPTS = holoscriptCore.HOLOSCRIPT_DEMO_SCRIPTS;
const HOLOSCRIPT_VERSION = holoscriptCore.HOLOSCRIPT_VERSION;

// Mesh registration with central orchestrator (optional — loaded lazily)
let MeshClient: any = null;
try {
  MeshClient = require('@infinitus/shared').MeshClient;
} catch {
  // @infinitus/shared not installed — mesh features disabled
}

/**
 * Hololand API Client
 */
class HololandClient {
  private client: AxiosInstance;

  constructor(apiUrl: string, apiKey?: string) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        // Use X-API-Key header for agent authentication
        ...(apiKey && { 'X-API-Key': apiKey }),
      },
    });
  }

  async createWorld(params: {
    name: string;
    template?: string;
    privacy?: 'public' | 'private' | 'agent-only';
    ownerId?: string;
  }) {
    const response = await this.client.post('/api/v1/worlds', params);
    return response.data;
  }

  async executeHoloScript(params: { worldId: string; code: string; context?: any }) {
    const response = await this.client.post('/api/v1/holoscript/execute', params);
    return response.data;
  }

  async visualizeData(params: {
    worldId: string;
    data: any;
    vizType: 'chart' | 'graph' | 'heatmap' | '3d-model';
  }) {
    const response = await this.client.post('/api/v1/holoscript/visualize', params);
    return response.data;
  }

  async inviteAgent(params: {
    worldId: string;
    agentId: string;
    permissions?: string[];
  }) {
    const response = await this.client.post(
      `/api/v1/worlds/${params.worldId}/invite`,
      {
        agentId: params.agentId,
        permissions: params.permissions || ['view', 'edit'],
      }
    );
    return response.data;
  }

  async getWorld(worldId: string) {
    const response = await this.client.get(`/api/v1/worlds/${worldId}`);
    return response.data;
  }

  async listWorlds(filters?: { ownerId?: string; type?: string }) {
    const response = await this.client.get('/api/v1/worlds', { params: filters });
    return response.data;
  }

  async updateWorld(worldId: string, updates: any) {
    const response = await this.client.put(`/api/v1/worlds/${worldId}`, updates);
    return response.data;
  }

  async deleteWorld(worldId: string) {
    const response = await this.client.delete(`/api/v1/worlds/${worldId}`);
    return response.data;
  }

  async addObject(params: {
    worldId: string;
    type: string;
    position: { x: number; y: number; z: number };
    metadata?: Record<string, any>;
    physics?: { enabled: boolean; mass?: number; restitution?: number };
  }) {
    const response = await this.client.post(
      `/api/v1/worlds/${params.worldId}/objects`,
      params
    );
    return response.data;
  }

  async removeObject(worldId: string, objectId: string) {
    const response = await this.client.delete(
      `/api/v1/worlds/${worldId}/objects/${objectId}`
    );
    return response.data;
  }

  async listObjects(worldId: string) {
    const response = await this.client.get(`/api/v1/worlds/${worldId}/objects`);
    return response.data;
  }
}

/**
 * Local HoloScript Parser Instance (no API needed)
 */
const holoScriptParser = new HoloScriptCodeParser();

/**
 * MCP Server
 */
const HOLOLAND_API_URL = process.env.HOLOLAND_API_URL || 'http://localhost:3001';
const HOLOLAND_API_KEY = process.env.HOLOLAND_API_KEY;

const hololandClient = new HololandClient(HOLOLAND_API_URL, HOLOLAND_API_KEY);

const server = new Server(
  {
    name: 'hololand',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const buildResponse = (tool: string, traceId: string, data: unknown) => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        ok: true,
        server: 'hololand',
        tool,
        traceId,
        timestamp: new Date().toISOString(),
        data,
      }, null, 2),
    },
  ],
});

const buildErrorResponse = (tool: string, traceId: string, error: unknown) => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        ok: false,
        server: 'hololand',
        tool,
        traceId,
        timestamp: new Date().toISOString(),
        error: (error && typeof error === 'object') ? error : { message: String(error) },
      }, null, 2),
    },
  ],
  isError: true,
});

/**
 * Tool Definitions
 */
const tools: Tool[] = [
  {
    name: 'mcp_get_info',
    description: 'Return MCP server metadata and tool inventory',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'mcp_get_health',
    description: 'Return MCP server health status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'mcp_get_capabilities',
    description: 'Return MCP tool capability schemas',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_world',
    description:
      'Create a new VR/AR world. Agents can use this to spawn workspaces, visualization environments, or collaboration spaces.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the world (e.g., "Agent Workspace - Data Analysis")',
        },
        template: {
          type: 'string',
          description: 'World template',
          enum: ['blank', 'office', 'gallery', 'playground', 'analytics', 'collaboration'],
        },
        privacy: {
          type: 'string',
          description: 'World privacy setting',
          enum: ['public', 'private', 'agent-only'],
        },
        ownerId: {
          type: 'string',
          description: 'Agent ID that owns this world',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'execute_holoscript',
    description:
      'Execute HoloScript code to build or modify VR worlds. HoloScript is the declarative language for spatial computing.',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'ID of the world to execute script in',
        },
        code: {
          type: 'string',
          description: 'HoloScript code to execute',
        },
        context: {
          type: 'object',
          description: 'Additional context for script execution',
        },
      },
      required: ['worldId', 'code'],
    },
  },
  {
    name: 'visualize_data',
    description:
      'Create 3D visualization of data in a VR world. Useful for data analysis, metrics display, and spatial analytics.',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'World to add visualization to',
        },
        data: {
          type: 'object',
          description: 'Data to visualize (JSON format)',
        },
        vizType: {
          type: 'string',
          description: 'Type of visualization',
          enum: ['chart', 'graph', 'heatmap', '3d-model'],
        },
      },
      required: ['worldId', 'data', 'vizType'],
    },
  },
  {
    name: 'invite_agent',
    description:
      'Invite another agent to collaborate in a VR world. Enables multi-agent spatial collaboration.',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'World to invite agent to',
        },
        agentId: {
          type: 'string',
          description: 'ID of agent to invite',
        },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Permissions for invited agent',
        },
      },
      required: ['worldId', 'agentId'],
    },
  },
  {
    name: 'get_world',
    description: 'Get details about a specific VR world',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'World ID',
        },
      },
      required: ['worldId'],
    },
  },
  {
    name: 'list_worlds',
    description: 'List all VR worlds, optionally filtered by owner or type',
    inputSchema: {
      type: 'object',
      properties: {
        ownerId: {
          type: 'string',
          description: 'Filter by owner agent ID',
        },
        type: {
          type: 'string',
          description: 'Filter by world type',
        },
      },
    },
  },
  {
    name: 'update_world',
    description: 'Update world properties (name, description, settings)',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'World ID to update',
        },
        updates: {
          type: 'object',
          description: 'Properties to update',
        },
      },
      required: ['worldId', 'updates'],
    },
  },
  {
    name: 'delete_world',
    description: 'Delete a VR world (permanent action)',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'World ID to delete',
        },
      },
      required: ['worldId'],
    },
  },

  // =====================================================
  // LOCAL TOOLS (no API required) - Use HoloScriptCodeParser
  // =====================================================

  {
    name: 'parse_holoscript',
    description:
      'Parse HoloScript code locally and return the AST (Abstract Syntax Tree). No API connection required. Use this to validate code structure before execution.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to parse',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'validate_holoscript',
    description:
      'Validate HoloScript code syntax without executing. Returns errors and warnings. No API connection required.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to validate',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'get_holoscript_examples',
    description:
      'Get example HoloScript code snippets for learning and reference. No API connection required.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Category of examples',
          enum: ['helloWorld', 'aiAgent', 'neuralNetwork', 'loginForm', 'dashboard', 'all'],
        },
      },
    },
  },
  {
    name: 'get_holoscript_version',
    description: 'Get the current HoloScript version and supported platforms. No API connection required.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // =====================================================
  // OBJECT MANIPULATION TOOLS
  // =====================================================

  {
    name: 'add_object',
    description:
      'Add a 3D object to a VR world. Supports spheres, cubes, planes, and custom models with physics.',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'World to add object to',
        },
        type: {
          type: 'string',
          description: 'Object type',
          enum: ['sphere', 'cube', 'plane', 'cylinder', 'cone', 'torus', 'model'],
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
          required: ['x', 'y', 'z'],
          description: '3D position in world',
        },
        metadata: {
          type: 'object',
          description: 'Object properties (color, size, texture, etc.)',
        },
        physics: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            mass: { type: 'number' },
            restitution: { type: 'number' },
          },
          description: 'Physics properties for the object',
        },
      },
      required: ['worldId', 'type', 'position'],
    },
  },
  {
    name: 'remove_object',
    description: 'Remove a 3D object from a VR world',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'World containing the object',
        },
        objectId: {
          type: 'string',
          description: 'ID of object to remove',
        },
      },
      required: ['worldId', 'objectId'],
    },
  },
  {
    name: 'list_objects',
    description: 'List all objects in a VR world',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'World to list objects from',
        },
      },
      required: ['worldId'],
    },
  },

  // =====================================================
  // BRITTNEY IDE AGENT INTEGRATION TOOLS
  // =====================================================
  ...brittneyTools,
  
  // =====================================================
  // ADVANCED BRITTNEY TOOLS (AI + Automation + Learning)
  // =====================================================
  ...advancedBrittneyTools,

  // =====================================================
  // HOLOSCRIPT GRAPH UNDERSTANDING TOOLS (DEPRECATED)
  // Migrated to @holoscript/mcp-server (free tier) as of v3.0.0
  // Kept here as backward-compatible aliases
  // Use holoscript-mcp: holo_parse_to_graph, holo_visualize_flow, etc.
  // =====================================================
  ...holoGraphTools,

  // =====================================================
  // BRITTNEY IDE TOOLS (DEPRECATED)
  // Migrated to @holoscript/mcp-server as hs_* tools (free tier)
  // Use holoscript-mcp: hs_scan_project, hs_diagnostics, etc.
  // =====================================================
  ...brittneyIDETools,

  // =====================================================
  // AGENT-FRIENDLY TOOLS (NEW)
  // Optimized for AI agents: batch ops, single-call status, autonomous workflows
  // =====================================================
  ...agentTools,

  // =====================================================
  // AI PERSISTENCE & SPATIAL INDEXING
  // =====================================================
  ...(memoryTools as any),
  ...(spatialTools as any),
  ...(datasetTools as any),
];

/**
 * List Tools Handler
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

/**
 * Call Tool Handler
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params as any;
  const args = rawArgs || {};
  const traceId = `hololand_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  try {

    switch (name) {
      case 'mcp_get_info': {
        return buildResponse(name, traceId, {
          server: 'hololand',
          version: '3.0.0',
          toolCount: tools.length,
          tools: tools.map(tool => tool.name),
        });
      }
      case 'mcp_get_health': {
        return buildResponse(name, traceId, {
          status: 'ok',
          server: 'hololand',
        });
      }
      case 'mcp_get_capabilities': {
        return buildResponse(name, traceId, {
          server: 'hololand',
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          })),
        });
      }
      case 'create_world': {
        const result = await hololandClient.createWorld(args as any);
        return buildResponse(name, traceId, result);
      }

      case 'execute_holoscript': {
        const result = await hololandClient.executeHoloScript(args as any);
        return buildResponse(name, traceId, result);
      }

      case 'visualize_data': {
        const result = await hololandClient.visualizeData(args as any);
        return buildResponse(name, traceId, result);
      }

      case 'invite_agent': {
        const result = await hololandClient.inviteAgent(args as any);
        return buildResponse(name, traceId, result);
      }

      case 'get_world': {
        const result = await hololandClient.getWorld(args.worldId);
        return buildResponse(name, traceId, result);
      }

      case 'list_worlds': {
        const result = await hololandClient.listWorlds(args as any);
        return buildResponse(name, traceId, result);
      }

      case 'update_world': {
        const result = await hololandClient.updateWorld(args.worldId, args.updates);
        return buildResponse(name, traceId, result);
      }

      case 'delete_world': {
        const result = await hololandClient.deleteWorld(args.worldId);
        return buildResponse(name, traceId, result);
      }

      // =====================================================
      // LOCAL TOOLS (no API required)
      // =====================================================

      case 'parse_holoscript': {
        const parseResult = holoScriptParser.parse(args.code);
        return buildResponse(name, traceId, {
          success: parseResult.success,
          ast: parseResult.ast,
          nodeCount: parseResult.ast?.length || 0,
          errors: parseResult.errors,
          warnings: parseResult.warnings,
        });
      }

      case 'validate_holoscript': {
        const validationResult = holoScriptParser.parse(args.code);
        const isValid = validationResult.success && validationResult.errors.length === 0;
        return buildResponse(name, traceId, {
          valid: isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          summary: isValid
            ? `✓ Code is valid (${validationResult.ast?.length || 0} nodes parsed)`
            : `✗ Found ${validationResult.errors.length} error(s)`,
        });
      }

      case 'get_holoscript_examples': {
        const category = args.category || 'all';
        let examples: Record<string, string>;

        if (category === 'all') {
          examples = HOLOSCRIPT_DEMO_SCRIPTS;
        } else {
          examples = {
            [category]: (HOLOSCRIPT_DEMO_SCRIPTS as any)[category] || 'Example not found',
          };
        }

        return buildResponse(name, traceId, {
          category,
          examples,
          availableCategories: Object.keys(HOLOSCRIPT_DEMO_SCRIPTS),
        });
      }

      case 'get_holoscript_version': {
        return buildResponse(name, traceId, {
          version: HOLOSCRIPT_VERSION,
          mcpServerVersion: '3.0.0',
          features: [
            '3D VR world creation',
            '2D UI components',
            'Physics simulation',
            'Voice command parsing',
            'Gesture recognition',
            'Multi-agent collaboration',
          ],
          supportedPlatforms: [
            'WebXR',
            'Oculus Quest',
            'HTC Vive',
            'Valve Index',
            'Apple Vision Pro',
            'Windows Mixed Reality',
          ],
        });
      }

      // =====================================================
      // OBJECT MANIPULATION TOOLS
      // =====================================================

      case 'add_object': {
        const result = await hololandClient.addObject(args as any);
        return buildResponse(name, traceId, result);
      }

      case 'remove_object': {
        const result = await hololandClient.removeObject(args.worldId, args.objectId);
        return buildResponse(name, traceId, result);
      }

      case 'list_objects': {
        const result = await hololandClient.listObjects(args.worldId);
        return buildResponse(name, traceId, result);
      }

      // =====================================================
      // DATASET EXTRACTION TOOLS
      // =====================================================
      case 'generate_spatial_dataset': {
        const result = await handleDatasetTool(name, args as Record<string, unknown>);
        return buildResponse(name, traceId, result);
      }

      // =====================================================
      // BRITTNEY IDE AGENT INTEGRATION TOOLS
      // =====================================================
      default:
        // Check if it's a Brittney tool
        if (name.startsWith('brittney_')) {
          // Check if it's an Agent-Friendly tool FIRST (most specific)
          const agentToolNames = agentTools.map((t: any) => t.name);
          if (agentToolNames.includes(name)) {
            const result = await handleAgentTool(name, args as Record<string, unknown>, {
              brittneyService: process.env.BRITTNEY_SERVICE_URL || 'http://localhost:11435',
              apiKey: process.env.BRITTNEY_ADMIN_KEY,
              workspacePath: process.env.HOLOLAND_WORKSPACE_PATH || process.cwd()
            });
            return buildResponse(name, traceId, result);
          }
          // Check if it's an advanced Brittney tool
          const advancedToolNames = advancedBrittneyTools.map(t => t.name);
          if (advancedToolNames.includes(name)) {
            const result = await handleAdvancedBrittneyTool(name, args as Record<string, unknown>);
            return buildResponse(name, traceId, result);
          }
          // Check if it's an IDE tool
          const ideToolNames = brittneyIDETools.map(t => t.name);
          if (ideToolNames.includes(name)) {
            const result = await handleBrittneyIDETool(name, args as Record<string, unknown>);
            return buildResponse(name, traceId, { result });
          }
          // Otherwise use standard Brittney handler
          const result = await handleBrittneyTool(name, args as Record<string, unknown>);
          return buildResponse(name, traceId, result);
        }

        // Check if it's a HoloScript Graph tool
        if (name.startsWith('holo_')) {
          const result = await handleHoloGraphTool(name, args as Record<string, unknown>);
          return buildResponse(name, traceId, result);
        }

        // Check Memory & Spatial Tools
        if (memoryTools.map(t => t.name).includes(name)) {
          const result = await handleMemoryTool(name, args as Record<string, unknown>);
          return buildResponse(name, traceId, result);
        }
        
        if (spatialTools.map(t => t.name).includes(name)) {
          const result = await handleSpatialTool(name, args as Record<string, unknown>);
          return buildResponse(name, traceId, result);
        }

        return buildErrorResponse(name, traceId, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return buildErrorResponse(name, traceId, error);
  }
});

/**
 * Start Server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Hololand MCP Server running on stdio');

  // Register with central MCP orchestrator mesh (if configured and @infinitus/shared available)
  const orchestratorUrl = process.env.MCP_ORCHESTRATOR_URL;
  const apiKey = process.env.MCP_API_KEY;

  if (orchestratorUrl && apiKey && MeshClient) {
    const toolNames = tools.map((t: Tool) => t.name);
    const meshClient = new MeshClient({
      orchestratorUrl,
      apiKey,
      serviceId: 'hololand-mcp',
      serviceName: 'Hololand VR/AR MCP Server',
      workspace: 'hololand',
      tools: toolNames,
    });

    const registered = await meshClient.register();
    if (registered) {
      console.error(`[Mesh] Registered ${toolNames.length} tools with orchestrator`);
    }

    process.on('SIGINT', async () => {
      await meshClient.deregister();
      process.exit(0);
    });
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
