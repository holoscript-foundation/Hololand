/**
 * Hololand MCP Server
 * Enables AI agents to create and manage VR/AR worlds, execute HoloScript, and collaborate in spatial environments
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
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
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
    const response = await this.client.post('/api/v1/visualize', params);
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
}

/**
 * MCP Server
 */
const HOLOLAND_API_URL = process.env.HOLOLAND_API_URL || 'http://localhost:3001';
const HOLOLAND_API_KEY = process.env.HOLOLAND_API_KEY;

const hololandClient = new HololandClient(HOLOLAND_API_URL, HOLOLAND_API_KEY);

const server = new Server(
  {
    name: 'hololand',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool Definitions
 */
const tools: Tool[] = [
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
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'create_world': {
        const result = await hololandClient.createWorld(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'execute_holoscript': {
        const result = await hololandClient.executeHoloScript(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'visualize_data': {
        const result = await hololandClient.visualizeData(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'invite_agent': {
        const result = await hololandClient.inviteAgent(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_world': {
        const result = await hololandClient.getWorld(args.worldId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_worlds': {
        const result = await hololandClient.listWorlds(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_world': {
        const result = await hololandClient.updateWorld(args.worldId, args.updates);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_world': {
        const result = await hololandClient.deleteWorld(args.worldId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start Server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Hololand MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
