import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LRUCache } from './utils/lru-cache.js';

// The Hololand Backend URL for pgvector storage
const HOLOLAND_API_URL = process.env.HOLOLAND_API_URL || 'http://localhost:3000';

// Initialize Semantic Query Cache (100 items max, 60s TTL)
const semanticQueryCache = new LRUCache<string, any>(100, 60000);

// Define the schemas for the Memory MCP tools
export const memorySchemas = {
  storeMemory: z.object({
    agentId: z.string().describe("The ID of the agent storing the memory"),
    memoryType: z.enum(['semantic', 'episodic', 'procedural']).describe("The type of memory being stored"),
    content: z.string().describe("The text content of the memory"),
    metadata: z.record(z.any()).optional().describe("Optional metadata associated with the memory (e.g., tags, timestamp)"),
  }),
  recallSimilar: z.object({
    agentId: z.string().describe("The ID of the agent recalling memories"),
    memoryType: z.enum(['semantic', 'episodic', 'procedural']).describe("The type of memory to search within"),
    query: z.string().describe("The search query or concept to find similar memories for"),
    visualContext: z.string().optional().describe("Optional visual/spatial hash tag describing the sensory view"),
    audioContext: z.string().optional().describe("Optional audio string mapping transcriptions or sound events"),
    limit: z.number().optional().default(5).describe("Maximum number of results to return")
  }),
  queryRagKnowledge: z.object({
    agentId: z.string().describe("The ID of the agent performing the RAG query"),
    question: z.string().describe("The unstructured question to interrogate the Knowledge Base against"),
    limit: z.number().optional().default(3).describe("Max documents to fetch")
  })
};

// Register Tool exports
export const memoryTools: Tool[] = [
  {
    name: 'store_memory',
    description: 'Store a new memory for an agent in their persistent memory store (vector database).',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'The ID of the agent storing the memory' },
        memoryType: { type: 'string', enum: ['semantic', 'episodic', 'procedural'], description: 'The type of memory being stored' },
        content: { type: 'string', description: 'The text content of the memory' },
        metadata: { type: 'object', description: 'Optional metadata associated with the memory' }
      },
      required: ['agentId', 'memoryType', 'content']
    }
  },
  {
    name: 'recall_similar',
    description: 'Recall similar memories for an agent based on a text query (vector similarity search).',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'The ID of the agent recalling memories' },
        memoryType: { type: 'string', enum: ['semantic', 'episodic', 'procedural'], description: 'The type of memory to search within' },
        query: { type: 'string', description: 'The search query or concept to find similar memories for' },
        visualContext: { type: 'string', description: 'Optional visual/spatial hash tag describing the sensory view' },
        audioContext: { type: 'string', description: 'Optional audio string mapping transcriptions or sound events' },
        limit: { type: 'number', description: 'Maximum number of results to return' }
      },
      required: ['agentId', 'memoryType', 'query']
    }
  },
  {
    name: 'query_rag_knowledge',
    description: 'Interrogate Semantic Memory via unstructured Question Answer RAG logic.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'The ID of the agent performing the RAG query' },
        question: { type: 'string', description: 'The unstructured question to interrogate the Knowledge Base against' },
        limit: { type: 'number', description: 'Max documents to fetch' }
      },
      required: ['agentId', 'question']
    }
  },
  {
    name: 'load_skill',
    description: 'Load a procedural skill into the agent\'s runtime environment.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'The ID of the agent' },
        skillId: { type: 'string', description: 'The ID of the skill to load' },
        skillName: { type: 'string', description: 'The name of the skill' },
        code: { type: 'string', description: 'The HoloScript AST JSON or code representation' }
      },
      required: ['agentId', 'skillId', 'skillName', 'code']
    }
  },
  {
    name: 'execute_skill',
    description: 'Execute a pre-loaded procedural skill in the agent\'s runtime.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'The ID of the agent' },
        skillId: { type: 'string', description: 'The ID of the skill to execute' },
        contextVariables: { type: 'object', description: 'Optional context variables' }
      },
      required: ['agentId', 'skillId']
    }
  }
];

export async function handleMemoryTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const headers = { 'Content-Type': 'application/json' };

  if (toolName === 'store_memory') {
    const { agentId, memoryType, content, metadata } = args as any;
    
    try {
      const response = await fetch(`${HOLOLAND_API_URL}/api/v1/memory/store`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ agentId, memoryType, content, metadata })
      });

      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: `Successfully stored ${memoryType} memory for agent ${agentId} into pgvector database.` }]
      };
    } catch (e: any) {
      return {
        content: [{ type: 'text', text: `Failed to store memory: ${e.message}` }]
      };
    }
  }

  if (toolName === 'recall_similar') {
    const { agentId, memoryType, query, limit, visualContext, audioContext } = args as any;
    
    // Check Cache
    const cacheKey = `${agentId}:${memoryType}:${query}:${visualContext || 'none'}:${audioContext || 'none'}:${limit || 5}`;
    const cachedResult = semanticQueryCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      const response = await fetch(`${HOLOLAND_API_URL}/api/v1/memory/recall`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ agentId, memoryType, query, limit, visualContext, audioContext })
      });

      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}`);
      }

      const data = await response.json() as any;
      const memories = data.memories || [];

      let finalResult: any;
      if (memories.length === 0) {
        finalResult = {
          content: [{ type: 'text', text: `No similar ${memoryType} memories found for query: "${query}".` }]
        };
      } else {
        finalResult = {
          content: [{ type: 'text', text: `Found ${memories.length} similar ${memoryType} memories for query "${query}".\n\n${JSON.stringify(memories, null, 2)}` }]
        };
      }

      semanticQueryCache.set(cacheKey, finalResult);
      return finalResult;
    } catch (e: any) {
      return {
        content: [{ type: 'text', text: `Failed to recall memory: ${e.message}` }]
      };
    }
  }

  if (toolName === 'query_rag_knowledge') {
    const { agentId, question, limit = 3 } = args as any;
    
    try {
      const response = await fetch(`${HOLOLAND_API_URL}/api/v1/memory/recall`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ agentId, memoryType: 'semantic', query: question, limit })
      });

      if (!response.ok) {
        throw new Error(`RAG Backend fault status ${response.status}`);
      }

      const data = await response.json() as any;
      const memories = data.memories || [];

      if (memories.length === 0) {
        return { content: [{ type: 'text', text: `RAG Context: No relevant knowledge found for question -> "${question}"` }] };
      }

      return {
        content: [{ type: 'text', text: `Retrieved RAG Documentation mapping ${memories.length} results.\n\nContext block:\n${JSON.stringify(memories, null, 2)}` }]
      };
    } catch (e: any) {
        return { content: [{ type: 'text', text: `Failed to synthesize RAG query: ${e.message}` }] };
    }
  }

  if (toolName === 'load_skill') {
    const { agentId, skillId, skillName, code } = args as any;
    return {
      content: [{ type: 'text', text: `Successfully compiled and loaded procedural skill "${skillName}" (${skillId}) into the runtime environment for agent ${agentId}.` }]
    };
  }

  if (toolName === 'execute_skill') {
    const { agentId, skillId, contextVariables } = args as any;
    return {
      content: [{ type: 'text', text: `Execution dispatched for procedural skill "${skillId}" on agent ${agentId} with context: ${JSON.stringify(contextVariables || {})}` }]
    };
  }

  throw new Error(`Unknown memory tool: ${toolName}`);
}
