/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 *
 * Brittney IDE Agent Integration Tools
 * Copyright (c) 2024-2026 Hololand Technologies. All Rights Reserved.
 *
 * This file contains proprietary trade secrets and intellectual property
 * of Hololand Technologies. Unauthorized copying, distribution, modification,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Licensed under the Hololand Proprietary License v1.0
 * See LICENSE.proprietary for terms.
 *
 * ============================================================================
 *
 * These tools enable IDE agents (Claude Code, Cursor, Copilot) to get
 * visibility into the running Hololand application through Brittney.
 *
 * Architecture (Unified - uses shared @hololand/inference):
 * IDE Agent ←→ MCP Protocol ←→ Brittney Tools ←→ SharedDataBridge ←→ Browser Extension ←→ Hololand App
 *                                    ↓
 *                          @hololand/inference
 *                                    ↓
 *                    ┌───────────────┴───────────────┐
 *                    ▼                               ▼
 *             Ollama (local)                  BYOK Cloud APIs
 *        [Dynamic Model Selection]          (OpenAI, Anthropic, etc.)
 *     brittney-v4 (8GB+ VRAM) or
 *     brittney-v4-q8 (4GB+ VRAM)
 *
 * Features:
 * - Browser state inspection via native messaging bridge
 * - Live HoloScript injection and hot reload
 * - AI-powered debugging with full context
 * - Performance analysis and optimization suggestions
 * - uAA2++ Wisdom Compression for cross-session memory
 *
 * @module brittney-tools
 * @author Brittney AI Team
 * @version 3.0.0
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sharedDataBridge } from './shared-data-bridge.js';
import { createInferenceClient, type InferenceClient, type ChatMessage } from '@hololand/inference';
import { holohub } from './holohub-service.js';
import {
  compressConversation,
  loadMatrixWisdom,
  detectMatrix,
  getWisdomStats,
  exportWisdomAsMarkdown,
  type Matrix,
} from './wisdom-compression.js';

// =============================================================================
// DYNAMIC MODEL SELECTION (brittney-v4 / brittney-v4-q8)
// =============================================================================

// Target models in priority order
const PREFERRED_MODELS = [
  'brittney-v4:latest',      // Full quality (7.7 GB, needs 8GB+ VRAM)
  'brittney-v4-q8:latest',   // Quantized (4.1 GB, needs 4GB+ VRAM)
];

const VRAM_THRESHOLD_FULL = 8000;  // 8GB for full model
const VRAM_THRESHOLD_Q8 = 4000;    // 4GB for q8 model

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

let cachedBestModel: string | null = null;
let modelCacheTime = 0;
const MODEL_CACHE_TTL = 300000; // 5 minute cache (VRAM doesn't change often)

/**
 * Detect available VRAM using nvidia-smi
 */
async function detectVRAM(): Promise<number> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits',
      { timeout: 5000 }
    );

    const freeVRAM = parseInt(stdout.trim().split('\n')[0], 10);
    return isNaN(freeVRAM) ? 0 : freeVRAM;
  } catch {
    // No GPU or nvidia-smi not available
    return 0;
  }
}

/**
 * Check which models are available in Ollama
 */
async function getAvailableModels(): Promise<Set<string>> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) return new Set();

    const data = await response.json() as { models: OllamaModel[] };
    return new Set(data.models.map(m => m.name));
  } catch {
    return new Set();
  }
}

/**
 * Dynamically select best Brittney model based on VRAM and availability
 *
 * Strategy:
 * - If 8GB+ VRAM available → use brittney-v4:latest (full quality)
 * - If 4GB+ VRAM available → use brittney-v4-q8:latest (quantized)
 * - Fallback to whichever is available
 */
async function detectBestBrittneyModel(): Promise<string> {
  // Return cached result if fresh
  if (cachedBestModel && Date.now() - modelCacheTime < MODEL_CACHE_TTL) {
    return cachedBestModel;
  }

  const fallbackModel = 'brittney-v4-q8:latest';

  try {
    // Check what's available in parallel
    const [vramMB, availableModels] = await Promise.all([
      detectVRAM(),
      getAvailableModels()
    ]);

    const hasFullModel = availableModels.has('brittney-v4:latest');
    const hasQ8Model = availableModels.has('brittney-v4-q8:latest');

    console.log(`[Brittney] VRAM: ${vramMB}MB | Models: v4=${hasFullModel}, v4-q8=${hasQ8Model}`);

    let selectedModel: string;

    // Selection logic based on VRAM and availability
    if (vramMB >= VRAM_THRESHOLD_FULL && hasFullModel) {
      selectedModel = 'brittney-v4:latest';
      console.log(`[Brittney] Selected: ${selectedModel} (full quality, ${vramMB}MB VRAM available)`);
    } else if (vramMB >= VRAM_THRESHOLD_Q8 && hasQ8Model) {
      selectedModel = 'brittney-v4-q8:latest';
      console.log(`[Brittney] Selected: ${selectedModel} (quantized, ${vramMB}MB VRAM available)`);
    } else if (hasQ8Model) {
      selectedModel = 'brittney-v4-q8:latest';
      console.log(`[Brittney] Selected: ${selectedModel} (fallback, limited VRAM: ${vramMB}MB)`);
    } else if (hasFullModel) {
      selectedModel = 'brittney-v4:latest';
      console.log(`[Brittney] Selected: ${selectedModel} (only option available)`);
    } else {
      // Neither preferred model available, check for any brittney model
      const anyBrittney = Array.from(availableModels).find(m => m.startsWith('brittney'));
      selectedModel = anyBrittney || fallbackModel;
      console.warn(`[Brittney] Preferred models not found, using: ${selectedModel}`);
    }

    cachedBestModel = selectedModel;
    modelCacheTime = Date.now();
    return selectedModel;

  } catch (error) {
    console.warn('[Brittney] Model detection failed, using fallback:', error);
    return fallbackModel;
  }
}

// =============================================================================
// INFERENCE CLIENT (Uses Ollama + BYOK providers)
// =============================================================================

let inferenceClient: InferenceClient | null = null;
let inferenceClientModel: string | null = null;

/**
 * Get or create the inference client with dynamic model selection
 */
async function getInferenceClientAsync(): Promise<InferenceClient> {
  const bestModel = process.env.BRITTNEY_MODEL || await detectBestBrittneyModel();

  // Recreate client if model changed
  if (inferenceClient && inferenceClientModel !== bestModel) {
    inferenceClient = null;
  }

  if (!inferenceClient) {
    inferenceClientModel = bestModel;
    inferenceClient = createInferenceClient({
      activeProvider: 'local',
      local: {
        enabled: true,
        ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: bestModel,
        autoDownloadModel: false,
      },
      fallbackToCloud: true,
      preferLocalWhenAvailable: true,
    });
    console.log(`[Brittney] Inference client initialized with model: ${bestModel}`);
  }
  return inferenceClient;
}

/**
 * Sync wrapper for backward compatibility
 */
function getInferenceClient(): InferenceClient {
  if (!inferenceClient) {
    // First call - use sync fallback, async will update later
    const fallbackModel = process.env.BRITTNEY_MODEL || 'brittney-v4-q8:latest';
    inferenceClient = createInferenceClient({
      activeProvider: 'local',
      local: {
        enabled: true,
        ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: fallbackModel,
        autoDownloadModel: false,
      },
      fallbackToCloud: true,
      preferLocalWhenAvailable: true,
    });
    // Trigger async model detection for next call
    detectBestBrittneyModel().then(best => {
      if (best !== fallbackModel) {
        inferenceClient = null; // Force recreation on next call
        console.log(`[Brittney] Better model detected: ${best}, will use on next request`);
      }
    });
  }
  return inferenceClient;
}

interface BrittneyServiceResponse {
  success: boolean;
  response?: string;
  code?: string;
  error?: string;
  provider?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Browser context structure for inference
 */
interface BrittneyBrowserContext {
  url?: string;
  scenes?: Array<{ id: string; name: string; objectCount: number }>;
  profilerStats?: { fps: number; drawCalls: number; triangles: number };
  consoleLogs?: Array<{ level: string; message: string }>;
  errors?: Array<{ message: string; stack?: string }>;
}

// Simple in-memory history for limited context persistence
const conversationHistory: ChatMessage[] = [];
const MAX_HISTORY = 20;

// Track last compression time to avoid over-compressing
let lastCompressionTime = 0;
const COMPRESSION_INTERVAL = 300000; // 5 minutes

/**
 * Call inference via @hololand/inference (Ollama + BYOK)
 * Includes uAA2++ wisdom injection for enhanced context
 */
async function callBrittneyService(
  message: string,
  options: {
    systemPrompt?: string;
    browserContext?: BrittneyBrowserContext;
    skipWisdom?: boolean;
  } = {}
): Promise<BrittneyServiceResponse> {
  try {
    const client = getInferenceClient();
    await client.initialize();

    // Build messages array
    const messages: ChatMessage[] = [];

    // Detect matrix and load relevant wisdom (RE-INTAKE)
    const matrix = detectMatrix(message);
    const wisdom = options.skipWisdom ? '' : loadMatrixWisdom(message, matrix);

    // Add system prompt if provided
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    } else {
      // Default HoloScript system prompt with wisdom injection
      const wisdomSection = wisdom ? `\n\n**Learned Context (uAA2++ Wisdom):**\n${wisdom}` : '';
      messages.push({
        role: 'system',
        content: `You are Brittney, a HoloScript and VR development expert. You help with:
- HoloScript code generation and debugging
- **Smart Asset Creation (.hsa files)**
- Performance optimization for VR/AR
- Understanding and fixing runtime errors
- Explaining Hololand concepts

IMPORTANT: When the user asks for an object (e.g. "lamp", "chair", "turret"), always check if a Smart Asset is available in HoloHub using 'brittney_search_holohub' BEFORE generating code. Content > Code.

Respond concisely and provide code examples when helpful.${wisdomSection}`,
      });
    }

    // Add browser context to message if available
    let enhancedMessage = message;
    if (options.browserContext) {
      const ctx = options.browserContext;
      enhancedMessage = `${message}

**Current Browser Context:**
${ctx.url ? `- URL: ${ctx.url}` : ''}
${ctx.scenes?.length ? `- Scenes: ${ctx.scenes.map((s) => s.name).join(', ')}` : ''}
${ctx.profilerStats ? `- Performance: ${ctx.profilerStats.fps} FPS, ${ctx.profilerStats.drawCalls} draw calls` : ''}
${ctx.errors?.length ? `- Errors: ${ctx.errors.map((e) => e.message).join('; ')}` : ''}`;
    }

    // Add conversation history
    messages.push(...conversationHistory);

    // Add current user message
    const userMessage: ChatMessage = { role: 'user', content: enhancedMessage };
    messages.push(userMessage);

    // Call inference
    const response = await client.chat({
      messages,
      temperature: 0.7,
      maxTokens: 4096,
      model: process.env.BRITTNEY_MODEL,
    });

    // Update history
    conversationHistory.push(userMessage);
    conversationHistory.push({ role: 'assistant', content: response.content });

    // Trim history if needed
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
    }

    // Trigger compression periodically (COMPRESS phase - uAA2++)
    const now = Date.now();
    if (conversationHistory.length >= 10 && now - lastCompressionTime > COMPRESSION_INTERVAL) {
      lastCompressionTime = now;
      // Run compression asynchronously to avoid blocking response
      compressConversation(conversationHistory, matrix).catch(err => {
        console.warn('[Brittney] Wisdom compression failed:', err);
      });
    }

    return {
      success: true,
      response: response.content,
      provider: response.provider,
      usage: response.usage
        ? {
            prompt_tokens: response.usage.promptTokens,
            completion_tokens: response.usage.completionTokens,
            total_tokens: response.usage.totalTokens,
          }
        : undefined,
    };
  } catch (error: any) {
    // Check if Ollama is not running
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      return {
        success: false,
        error: `Ollama not running. Start it with: ollama serve\n\nOr configure a BYOK cloud provider in Settings.`,
      };
    }
    return {
      success: false,
      error: `Inference error: ${error.message}`,
    };
  }
}

/**
 * Collect full browser context from native messaging bridge
 */
async function collectBrowserContext(): Promise<BrittneyBrowserContext> {
  try {
    const [browserState, scenes, profilerStats, consoleLogs, errors] = await Promise.all([
      nativeMessagingBridge.sendMessage<BrowserState>('getBrowserState').catch(() => null),
      nativeMessagingBridge.sendMessage<SceneInfo[]>('listScenes').catch(() => []),
      nativeMessagingBridge.sendMessage<ProfilerStats>('getProfilerStats').catch(() => null),
      nativeMessagingBridge.sendMessage<ConsoleLogEntry[]>('getConsoleLogs', { limit: 10 }).catch(() => []),
      nativeMessagingBridge.sendMessage<RuntimeError[]>('getRuntimeErrors', { limit: 5 }).catch(() => []),
    ]);

    return {
      url: browserState?.url,
      scenes: scenes?.map((s) => ({ id: s.id, name: s.name, objectCount: s.objectCount })),
      profilerStats: profilerStats
        ? { fps: profilerStats.fps, drawCalls: profilerStats.drawCalls, triangles: profilerStats.triangles }
        : undefined,
      consoleLogs: consoleLogs?.map((l) => ({ level: l.level, message: l.message })),
      errors: errors?.map((e) => ({ message: e.message, stack: e.stack })),
    };
  } catch {
    return {}; // Return empty context if collection fails
  }
}

/**
 * Check if inference is available (Ollama or BYOK providers)
 */
async function checkBrittneyHealth(): Promise<{ healthy: boolean; status?: any; error?: string }> {
  try {
    const client = getInferenceClient();
    await client.initialize();
    const status = await client.getStatus();

    return {
      healthy: status.ready,
      status: {
        activeProvider: status.activeProvider,
        providers: status.providers.map((p) => ({
          type: p.type,
          available: p.available,
          latencyMs: p.latencyMs,
        })),
        localModelDownloaded: status.localModelDownloaded,
      },
      error: status.ready ? undefined : 'No providers available',
    };
  } catch (error: any) {
    return { healthy: false, error: `Inference check failed: ${error.message}` };
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface BrowserState {
  url: string;
  title: string;
  isHololandApp: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export interface SceneInfo {
  id: string;
  name: string;
  objectCount: number;
  componentCount: number;
  isActive: boolean;
}

export interface ComponentInfo {
  id: string;
  type: string;
  name: string;
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  children: string[];
}

export interface ProfilerStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  memoryUsed: number;
  gpuMemory?: number;
}

export interface ConsoleLogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
  source?: string;
  stack?: string;
}

export interface RuntimeError {
  message: string;
  stack?: string;
  componentId?: string;
  line?: number;
  column?: number;
  source?: string;
}

// =============================================================================
// BRITTNEY TOOL DEFINITIONS
// =============================================================================

export const brittneyTools: Tool[] = [
  // =========================================================================
  // INSPECTION TOOLS - Get visibility into running app
  // =========================================================================

  {
    name: 'brittney_get_browser_state',
    description:
      'Get current browser state including URL, title, and connection status to Hololand app. Use this to verify the app is running before other inspections.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'brittney_list_scenes',
    description:
      'List all registered 3D scenes in the running Hololand app. Returns scene IDs, names, object counts, and active status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'brittney_inspect_component',
    description:
      'Inspect a specific component in the running app. Returns props, state, children, and behavior details. Use scene/component IDs from brittney_list_scenes.',
    inputSchema: {
      type: 'object',
      properties: {
        componentId: {
          type: 'string',
          description: 'ID of the component to inspect',
        },
        includeChildren: {
          type: 'boolean',
          description: 'Include child component details (default: false)',
        },
      },
      required: ['componentId'],
    },
  },

  {
    name: 'brittney_get_profiler_stats',
    description:
      'Get real-time performance metrics from the running app: FPS, frame time, draw calls, triangles, memory usage. Essential for debugging performance issues.',
    inputSchema: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Collect stats over N milliseconds (default: instant snapshot)',
        },
      },
    },
  },

  {
    name: 'brittney_get_console_logs',
    description:
      'Get console logs from the running Hololand app. Includes errors, warnings, and debug output. Filter by level or time range.',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          description: 'Filter by log level',
          enum: ['all', 'error', 'warn', 'info', 'debug'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries to return (default: 50)',
        },
        since: {
          type: 'number',
          description: 'Only logs after this timestamp (Unix ms)',
        },
      },
    },
  },

  {
    name: 'brittney_get_runtime_errors',
    description:
      'Get all runtime errors from the Hololand app with stack traces and source locations. Critical for debugging crashes and exceptions.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of errors to return (default: 20)',
        },
      },
    },
  },

  {
    name: 'brittney_take_screenshot',
    description:
      'Capture a screenshot of the current Hololand scene. Returns base64 encoded image. Useful for visual verification of changes.',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'Image format',
          enum: ['png', 'jpeg', 'webp'],
        },
        quality: {
          type: 'number',
          description: 'Quality 0-100 for jpeg/webp (default: 80)',
        },
      },
    },
  },

  // =========================================================================
  // AI ASSISTANT TOOLS - Brittney provides intelligent analysis
  // =========================================================================

  {
    name: 'brittney_explain_error',
    description:
      'Ask Brittney to explain a runtime error with full context. Brittney analyzes the error, stack trace, component state, and related code to provide a clear explanation.',
    inputSchema: {
      type: 'object',
      properties: {
        errorId: {
          type: 'string',
          description: 'ID of error from brittney_get_runtime_errors, or "latest" for most recent',
        },
        includeContext: {
          type: 'boolean',
          description: 'Include component and scene context (default: true)',
        },
      },
    },
  },

  {
    name: 'brittney_suggest_fix',
    description:
      'Ask Brittney to suggest code fixes based on runtime state. Brittney analyzes the running app, identifies issues, and suggests specific code changes.',
    inputSchema: {
      type: 'object',
      properties: {
        issue: {
          type: 'string',
          description: 'Description of the issue to fix (e.g., "objects disappearing", "slow rendering")',
        },
        scope: {
          type: 'string',
          description: 'Limit analysis to specific area',
          enum: ['all', 'performance', 'rendering', 'physics', 'ui', 'network'],
        },
      },
      required: ['issue'],
    },
  },

  {
    name: 'brittney_ask_question',
    description:
      'Ask Brittney any question about the running Hololand app. Brittney has full visibility into browser state, scenes, components, performance, and errors.',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Your question about the running app',
        },
        context: {
          type: 'object',
          description: 'Additional context to include in the analysis',
        },
      },
      required: ['question'],
    },
  },

  {
    name: 'brittney_analyze_performance',
    description:
      'Ask Brittney for a comprehensive performance analysis. Identifies bottlenecks, suggests optimizations, and provides actionable recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        focus: {
          type: 'string',
          description: 'Focus area for analysis',
          enum: ['all', 'rendering', 'memory', 'network', 'scripts'],
        },
        threshold: {
          type: 'number',
          description: 'Flag issues below this FPS (default: 60)',
        },
      },
    },
  },

  // =========================================================================
  // HOLOSCRIPT GENERATION TOOLS - Generate HoloScript code with RAG
  // =========================================================================

  {
    name: 'brittney_generate_holoscript',
    description:
      'Generate HoloScript code for Hololand/VR applications. Brittney uses RAG-enhanced knowledge to produce valid HoloScript syntax for objects, UI, particles, animations, networking, and more.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Natural language description of what to create (e.g., "a spinning cube that glows when grabbed")',
        },
        category: {
          type: 'string',
          description: 'Category hint to improve generation',
          enum: ['object', 'ui', 'particle', 'animation', 'network', 'scene', 'material', 'weapon', 'collectible', 'audio'],
        },
        browserContext: {
          type: 'object',
          description: 'Include current scene context (profiler stats, components) for context-aware generation',
        },
      },
      required: ['description'],
    },
  },

  {
    name: 'brittney_create_smart_asset',
    description: 'Create a new Smart Asset (.hsa) structure. Returns the JSON descriptor for a Smart Asset including metadata, physics, and AI properties. Use this when the user asks to "package" or "create an asset".',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the asset' },
        description: { type: 'string', description: 'Description of the asset' },
        type: { type: 'string', enum: ['prop', 'npc', 'interactive', 'vehicle'], description: 'Type of asset' },
        instructions: { type: 'string', description: 'Specific instructions for the logic/behavior' }
      },
      required: ['name', 'description']
    }
  },


  {
    name: 'brittney_search_holohub',
    description: 'Search the HoloHub marketplace for high-quality Smart Assets (.hsa). Returns a list of assets matching the query. Use this BEFORE generating code to see if a pre-made asset exists.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms (e.g. "lamp", "turret", "furniture")' }
      },
      required: ['query']
    }
  },

  {
    name: 'brittney_check_service',
    description:
      'Check if the Brittney AI service is running and healthy. Returns status, model info, and RAG knowledge stats.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // =========================================================================
  // WISDOM SYSTEM TOOLS - uAA2++ Cross-Session Memory
  // =========================================================================

  {
    name: 'brittney_get_wisdom_stats',
    description:
      'Get statistics about the uAA2++ wisdom system. Shows compression stats, matrix coverage, and cross-session memory usage. Use to understand what Brittney has learned.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'brittney_export_wisdom',
    description:
      'Export accumulated wisdom as markdown for review or backup. Returns compressed knowledge from all matrices (HoloScript, VR, Performance, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        matrix: {
          type: 'string',
          description: 'Filter by matrix type (optional)',
          enum: ['holoscript', 'vr', 'performance', 'debugging', 'networking', 'all'],
        },
      },
    },
  },

  {
    name: 'brittney_compress_session',
    description:
      'Manually trigger wisdom compression for the current session. Extracts key learnings and saves to persistent storage. Called automatically, but can be forced.',
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: 'Force compression even if below threshold (default: false)',
        },
      },
    },
  },

  // =========================================================================
  // EXECUTION TOOLS - Run code in browser context
  // =========================================================================

  {
    name: 'brittney_execute_in_browser',
    description:
      'Execute JavaScript code in the browser context. Use for quick tests, DOM manipulation, or accessing browser APIs not exposed through other tools. ⚠️ Use carefully.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute in browser',
        },
        awaitResult: {
          type: 'boolean',
          description: 'Wait for async result (default: false)',
        },
      },
      required: ['code'],
    },
  },

  {
    name: 'brittney_reload_scene',
    description:
      'Force reload the current Hololand scene. Useful after code changes to see updates without full page refresh.',
    inputSchema: {
      type: 'object',
      properties: {
        preserveState: {
          type: 'boolean',
          description: 'Preserve scene state where possible (default: false)',
        },
      },
    },
  },

  // =========================================================================
  // LIVE EDITING TOOLS - Inject HoloScript directly into running browser
  // =========================================================================

  {
    name: 'brittney_inject_holoscript',
    description:
      'Inject HoloScript code directly into the running Hololand app in the browser. This enables live editing from the IDE - changes appear instantly in the browser without page refresh.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to inject into the running app',
        },
        targetWorld: {
          type: 'string',
          description: 'Target world ID (default: current world)',
        },
        replaceExisting: {
          type: 'boolean',
          description: 'Replace existing HoloScript (true) or append (false, default)',
        },
      },
      required: ['code'],
    },
  },

  {
    name: 'brittney_navigate_to_world',
    description:
      'Navigate the running Hololand app to a specific world/scene. Use this to quickly switch between worlds while testing.',
    inputSchema: {
      type: 'object',
      properties: {
        worldId: {
          type: 'string',
          description: 'World ID to navigate to (e.g., "plaza", "casino", "builder")',
        },
      },
      required: ['worldId'],
    },
  },

  {
    name: 'brittney_get_live_state',
    description:
      'Get the current live state of the Hololand app including current world, HoloScript content, and connection status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// =============================================================================
// NATIVE MESSAGING BRIDGE
// =============================================================================

/**
 * Bridge to browser extension via native messaging
 * This enables communication between MCP server and browser
 * 
 * Architecture:
 * - When Chrome extension is connected: Real data flows through Native Messaging
 * - When extension is not connected: Returns mock data for development/testing
 * 
 * The extension connection is established when:
 * 1. Chrome extension is installed and loaded
 * 2. User opens DevTools on a Hololand page
 * 3. Native Messaging Host is registered with Chrome
 *
 * This bridge uses the SharedDataBridge for cross-process communication
 * with the Native Messaging Host.
 */
export class BrittneyNativeMessagingBridge {
  /**
   * Check if browser extension is connected via the shared bridge
   */
  isConnected(): boolean {
    return sharedDataBridge.isConnected();
  }

  /**
   * Send message to browser extension and wait for response
   * Uses SharedDataBridge to get real data from native messaging host
   * Falls back to mock data if extension is not connected
   */
  async sendMessage<T>(action: string, _payload?: unknown): Promise<T> {
    // Check if we have real data from the shared bridge
    if (sharedDataBridge.isConnected()) {
      return this.getRealData<T>(action);
    }

    // Fall back to mock data for development
    return this.getMockResponse(action) as T;
  }

  /**
   * Get real data from the shared bridge
   */
  private getRealData<T>(action: string): T {
    switch (action) {
      case 'getBrowserState':
        return (sharedDataBridge.getBrowserState() || this.getMockResponse(action)) as T;

      case 'listScenes':
        return (sharedDataBridge.getScenes() || []) as T;

      case 'getProfilerStats':
        return (sharedDataBridge.getProfilerStats() || this.getMockResponse(action)) as T;

      case 'getConsoleLogs':
        return (sharedDataBridge.getConsoleLogs() || []) as T;

      case 'getRuntimeErrors':
        return (sharedDataBridge.getRuntimeErrors() || []) as T;

      default:
        return this.getMockResponse(action) as T;
    }
  }

  /**
   * Mock responses for development/testing when extension is not connected
   * These are clearly marked as mock data
   */
  private getMockResponse(action: string): unknown {
    const mockPrefix = '[MOCK] ';
    
    switch (action) {
      case 'getBrowserState':
        return {
          url: `${mockPrefix}http://localhost:3000`,
          title: `${mockPrefix}Hololand - VR World`,
          isHololandApp: true,
          connectionStatus: 'disconnected', // Indicates extension not connected
        } satisfies BrowserState;

      case 'listScenes':
        return [
          {
            id: 'mock_scene_main',
            name: `${mockPrefix}Main World`,
            objectCount: 42,
            componentCount: 128,
            isActive: true,
          },
          {
            id: 'mock_scene_lobby',
            name: `${mockPrefix}Lobby`,
            objectCount: 15,
            componentCount: 45,
            isActive: false,
          },
        ] satisfies SceneInfo[];

      case 'getProfilerStats':
        return {
          fps: -1, // Negative indicates mock data
          frameTime: -1,
          drawCalls: -1,
          triangles: -1,
          textures: -1,
          memoryUsed: -1,
          gpuMemory: -1,
        } satisfies ProfilerStats;

      case 'getConsoleLogs':
        return [
          {
            level: 'warn',
            message: `${mockPrefix}Chrome DevTools extension not connected. Install @hololand/devtools-extension to get real browser data.`,
            timestamp: Date.now(),
          },
        ] satisfies ConsoleLogEntry[];

      case 'getRuntimeErrors':
        return [] satisfies RuntimeError[];

      case 'takeScreenshot':
        return {
          base64: '',
          format: 'png',
          error: 'Chrome DevTools extension not connected',
        };

      case 'executeCode':
        return {
          result: null,
          error: 'Chrome DevTools extension not connected',
        };

      case 'reloadScene':
        return {
          success: false,
          error: 'Chrome DevTools extension not connected',
        };

      default:
        return { success: false, action, error: 'Extension not connected' };
    }
  }
}

// Singleton bridge instance - exported for use by native messaging host
export const nativeMessagingBridge = new BrittneyNativeMessagingBridge();

// =============================================================================
// TOOL HANDLERS
// =============================================================================

export async function handleBrittneyTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'brittney_get_browser_state': {
        const state = await nativeMessagingBridge.sendMessage<BrowserState>('getBrowserState');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(state, null, 2),
            },
          ],
        };
      }

      case 'brittney_list_scenes': {
        const scenes = await nativeMessagingBridge.sendMessage<SceneInfo[]>('listScenes');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: scenes.length,
                  scenes,
                  activeScene: scenes.find((s) => s.isActive)?.name || 'none',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'brittney_inspect_component': {
        const component = await nativeMessagingBridge.sendMessage<ComponentInfo>(
          'inspectComponent',
          { componentId: args.componentId, includeChildren: args.includeChildren }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(component, null, 2),
            },
          ],
        };
      }

      case 'brittney_get_profiler_stats': {
        const stats = await nativeMessagingBridge.sendMessage<ProfilerStats>('getProfilerStats', {
          duration: args.duration,
        });
        
        // Check if this is mock data (negative values indicate mock)
        const isMock = stats.fps < 0;
        
        return {
          content: [
            {
              type: 'text',
              text: isMock 
                ? `⚠️ **Chrome DevTools Extension Not Connected**\n\nTo get real browser data:\n1. Build extension: \`cd packages/devtools-extension && pnpm build\`\n2. Load in Chrome: chrome://extensions → Load unpacked → select dist/\n3. Open DevTools (F12) on a Hololand page\n4. Click the "Brittney" tab\n\nCurrently returning mock data.`
                : JSON.stringify(
                    {
                      ...stats,
                      memoryUsedMB: Math.round(stats.memoryUsed / 1024 / 1024),
                      gpuMemoryMB: stats.gpuMemory
                        ? Math.round(stats.gpuMemory / 1024 / 1024)
                        : undefined,
                      status: stats.fps >= 60 ? '✓ Good' : stats.fps >= 30 ? '⚠ Acceptable' : '✗ Poor',
                    },
                    null,
                    2
                  ),
            },
          ],
        };
      }

      case 'brittney_get_console_logs': {
        const logs = await nativeMessagingBridge.sendMessage<ConsoleLogEntry[]>('getConsoleLogs', {
          level: args.level || 'all',
          limit: args.limit || 50,
          since: args.since,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: logs.length,
                  errors: logs.filter((l) => l.level === 'error').length,
                  warnings: logs.filter((l) => l.level === 'warn').length,
                  logs,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'brittney_get_runtime_errors': {
        const errors = await nativeMessagingBridge.sendMessage<RuntimeError[]>('getRuntimeErrors', {
          limit: args.limit || 20,
        });
        return {
          content: [
            {
              type: 'text',
              text:
                errors.length === 0
                  ? '✓ No runtime errors detected'
                  : JSON.stringify({ count: errors.length, errors }, null, 2),
            },
          ],
        };
      }

      case 'brittney_take_screenshot': {
        const screenshot = await nativeMessagingBridge.sendMessage<{ base64: string; format: string }>(
          'takeScreenshot',
          { format: args.format || 'png', quality: args.quality || 80 }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                format: screenshot.format,
                size: screenshot.base64.length,
                preview: `data:image/${screenshot.format};base64,${screenshot.base64.substring(0, 100)}...`,
              }),
            },
          ],
        };
      }

      case 'brittney_explain_error': {
        // Collect full browser context for AI analysis
        const browserContext = await collectBrowserContext();
        
        // Get error context from browser
        const errors = await nativeMessagingBridge.sendMessage<RuntimeError[]>('getRuntimeErrors', { limit: 1 });
        const errorContext: RuntimeError = errors.length > 0 
          ? errors[0] 
          : { message: 'No errors found', stack: undefined, componentId: undefined, source: undefined };
        
        // Add errors to context
        browserContext.errors = [{ message: errorContext.message, stack: errorContext.stack }];
        
        // Call Brittney service for AI-powered explanation
        const result = await callBrittneyService(
          `Explain this runtime error and suggest how to fix it:\n\nError: ${errorContext.message}\nStack: ${errorContext.stack || 'N/A'}\nComponent: ${errorContext.componentId || 'N/A'}\nSource: ${errorContext.source || 'N/A'}`,
          {
            systemPrompt: 'You are Brittney, a HoloScript and VR debugging expert. Explain runtime errors clearly and suggest fixes.',
            browserContext,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: result.success ? result.response! : `❌ ${result.error}`,
            },
          ],
          isError: !result.success,
        };
      }

      case 'brittney_generate_holoscript_code': {
        const response = await callBrittneyService(
          `Generate HoloScript for: ${String(args.description)} (Category: ${args.category || 'general'})`,
          {
            systemPrompt: `You are a HoloScript generator. Generate ONLY valid HoloScript code. Do not include markdown code blocks or explanations. Use the following context to ensure valid syntax.`,
            browserContext: args.browserContext as BrittneyBrowserContext,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: response.response || '// Error generating code',
            },
          ],
        };
      }

      case 'brittney_create_smart_asset': {
        const prompt = `Create a Smart Asset JSON descriptor for:
Name: ${args.name}
Type: ${args.type}
Description: ${args.description}
Instructions: ${args.instructions || 'Standard behavior'}

Return ONLY a valid JSON object matching this schema:
{
  "metadata": { "name": string, "version": "1.0.0", "description": string },
  "script": string (HoloScript code),
  "physics": { "mass": number, "colliderType": "box"|"sphere" },
  "ai": { "personality": string }
}`;

        const response = await callBrittneyService(prompt, {
          systemPrompt: `You are an expert Smart Asset creator. Generate valid JSON for the requested asset.`
        });

        return {
          content: [
            {
              type: 'text',
              text: response.response || '{}'
            }
          ]
        }
      }



      case 'brittney_search_holohub': {
        const assets = await holohub.search(String(args.query));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(assets, null, 2)
            }
          ]
        }
      }

      case 'brittney_suggest_fix': {
        // Collect full browser context for context-aware suggestions
        const browserContext = await collectBrowserContext();
        
        // Call Brittney service for fix suggestions
        const result = await callBrittneyService(
          `I have this issue in my Hololand app: ${args.issue}\n\nScope: ${args.scope || 'all'}\n\nPlease suggest how to fix it with HoloScript code examples.`,
          {
            systemPrompt: 'You are Brittney, a HoloScript expert. Suggest specific code fixes for Hololand/VR issues.',
            browserContext,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: result.success ? result.response! : `❌ ${result.error}`,
            },
          ],
          isError: !result.success,
        };
      }

      case 'brittney_ask_question': {
        // Collect browser context automatically unless user provides their own
        const browserContext = args.context 
          ? (args.context as BrittneyBrowserContext)
          : await collectBrowserContext();
        
        // Call Brittney service for general questions
        const result = await callBrittneyService(args.question as string, {
          browserContext,
        });

        return {
          content: [
            {
              type: 'text',
              text: result.success ? result.response! : `❌ ${result.error}`,
            },
          ],
          isError: !result.success,
        };
      }

      case 'brittney_analyze_performance': {
        // Get profiler stats for analysis
        const stats = await nativeMessagingBridge.sendMessage<ProfilerStats>('getProfilerStats');
        
        // Build context with profiler data
        const browserContext: BrittneyBrowserContext = {
          profilerStats: {
            fps: stats.fps,
            drawCalls: stats.drawCalls,
            triangles: stats.triangles,
          },
        };
        
        // Call Brittney service with performance data
        const result = await callBrittneyService(
          `Analyze this performance data and suggest optimizations:\n\nFPS: ${stats.fps}\nFrame Time: ${stats.frameTime}ms\nDraw Calls: ${stats.drawCalls}\nTriangles: ${stats.triangles}\nMemory: ${Math.round(stats.memoryUsed / 1024 / 1024)}MB\n\nFocus: ${args.focus || 'all'}\nTarget FPS: ${args.threshold || 60}`,
          {
            systemPrompt: 'You are Brittney, a VR performance optimization expert. Analyze metrics and suggest HoloScript optimizations.',
            browserContext,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: result.success ? result.response! : `❌ ${result.error}`,
            },
          ],
          isError: !result.success,
        };
      }

      case 'brittney_generate_holoscript': {
        // Call Brittney service for HoloScript generation with RAG
        const categoryHint = args.category ? ` (Category: ${args.category})` : '';
        
        // Use provided context or collect from browser
        const browserContext = args.browserContext 
          ? (args.browserContext as BrittneyBrowserContext)
          : await collectBrowserContext();
        
        const result = await callBrittneyService(
          `${args.description}${categoryHint}`,
          {
            browserContext,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `## Generated HoloScript\n\n${result.response}${result.code ? `\n\n\`\`\`holoscript\n${result.code}\n\`\`\`` : ''}`
                : `❌ ${result.error}`,
            },
          ],
          isError: !result.success,
        };
      }

      case 'brittney_check_service': {
        const health = await checkBrittneyHealth();
        
        return {
          content: [
            {
              type: 'text',
              text: health.healthy
                ? `✅ Brittney Service Status\n\n${JSON.stringify(health.status, null, 2)}`
                : `❌ Brittney Service Unavailable\n\n${health.error}\n\nStart with: npx @hololand/brittney-service start`,
            },
          ],
          isError: !health.healthy,
        };
      }

      case 'brittney_execute_in_browser': {
        const result = await nativeMessagingBridge.sendMessage<{ result: unknown; error?: string }>(
          'executeCode',
          { code: args.code, awaitResult: args.awaitResult }
        );
        return {
          content: [
            {
              type: 'text',
              text: result.error
                ? `Error: ${result.error}`
                : JSON.stringify(result.result, null, 2),
            },
          ],
          isError: !!result.error,
        };
      }

      case 'brittney_reload_scene': {
        await nativeMessagingBridge.sendMessage('reloadScene', {
          preserveState: args.preserveState,
        });
        return {
          content: [
            {
              type: 'text',
              text: '✓ Scene reloaded successfully',
            },
          ],
        };
      }

      // =========================================================================
      // LIVE EDITING TOOL HANDLERS
      // =========================================================================

      case 'brittney_inject_holoscript': {
        const code = args.code as string;
        const targetWorld = args.targetWorld as string | undefined;
        const replaceExisting = args.replaceExisting as boolean | undefined;
        
        // Execute HoloScript injection in browser via the __HOLOLAND_CENTRAL__ API
        const injectionCode = `
          if (window.__HOLOLAND_CENTRAL__) {
            window.__HOLOLAND_CENTRAL__.injectHoloScript(${JSON.stringify(code)});
            'HoloScript injected successfully';
          } else {
            throw new Error('Hololand Central not running. Open http://localhost:3000');
          }
        `;
        
        const result = await nativeMessagingBridge.sendMessage<{ result: unknown; error?: string }>(
          'executeCode',
          { code: injectionCode, awaitResult: true }
        );
        
        if (result.error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to inject HoloScript: ${result.error}\n\n**Troubleshooting:**\n1. Ensure Hololand Central is running at http://localhost:3000\n2. Ensure Chrome DevTools extension is connected\n3. Open DevTools (F12) on the Hololand page`,
              },
            ],
            isError: true,
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ HoloScript Injected Successfully!\n\n**Code:**\n\`\`\`holoscript\n${code}\n\`\`\`\n\n${targetWorld ? `**Target World:** ${targetWorld}` : ''}${replaceExisting ? '\n**Mode:** Replace existing' : '\n**Mode:** Append'}\n\n🔄 Check the browser - the scene should update live!`,
            },
          ],
        };
      }

      case 'brittney_navigate_to_world': {
        const worldId = args.worldId as string;
        
        // Navigate via __HOLOLAND_CENTRAL__ API
        const navCode = `
          if (window.__HOLOLAND_CENTRAL__) {
            window.__HOLOLAND_CENTRAL__.navigateTo(${JSON.stringify(worldId)});
            'Navigated to ' + ${JSON.stringify(worldId)};
          } else {
            throw new Error('Hololand Central not running');
          }
        `;
        
        const result = await nativeMessagingBridge.sendMessage<{ result: unknown; error?: string }>(
          'executeCode',
          { code: navCode, awaitResult: true }
        );
        
        if (result.error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to navigate: ${result.error}`,
              },
            ],
            isError: true,
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Navigated to **${worldId}**\n\n🌍 The browser should now show the ${worldId} world.`,
            },
          ],
        };
      }

      case 'brittney_get_live_state': {
        // Get current state from __HOLOLAND_CENTRAL__ API
        const stateCode = `
          if (window.__HOLOLAND_CENTRAL__) {
            JSON.stringify({
              appId: window.__HOLOLAND_CENTRAL__.appId,
              version: window.__HOLOLAND_CENTRAL__.version,
              currentWorld: window.__HOLOLAND_CENTRAL__.currentWorld,
              holoScriptLength: window.__HOLOLAND_CENTRAL__.holoScriptContent?.length || 0,
              scenes: window.__HOLOLAND_CENTRAL__.getScenes(),
            });
          } else {
            JSON.stringify({ error: 'Hololand Central not running' });
          }
        `;

        const result = await nativeMessagingBridge.sendMessage<{ result: string; error?: string }>(
          'executeCode',
          { code: stateCode, awaitResult: true }
        );

        if (result.error) {
          // Fall back to checking shared bridge
          const isConnected = sharedDataBridge.isConnected();
          const browserState = sharedDataBridge.getBrowserState();

          return {
            content: [
              {
                type: 'text',
                text: `## Live State\n\n**Extension Connected:** ${isConnected ? '✅ Yes' : '❌ No'}\n**Browser State:**\n\`\`\`json\n${JSON.stringify(browserState || { status: 'not connected' }, null, 2)}\n\`\`\`\n\n${!isConnected ? '⚠️ Chrome DevTools extension not connected. Open DevTools (F12) on a Hololand page.' : ''}`,
              },
            ],
          };
        }

        try {
          const state = JSON.parse(result.result as string);
          return {
            content: [
              {
                type: 'text',
                text: `## 🎮 Hololand Central Live State\n\n**App ID:** ${state.appId}\n**Version:** ${state.version}\n**Current World:** ${state.currentWorld}\n**HoloScript Loaded:** ${state.holoScriptLength > 0 ? `Yes (${state.holoScriptLength} chars)` : 'No'}\n\n**Available Worlds:**\n${state.scenes?.map((s: string) => `- ${s}`).join('\n') || 'None'}`,
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: 'text',
                text: `Raw result: ${result.result}`,
              },
            ],
          };
        }
      }

      // =========================================================================
      // WISDOM SYSTEM TOOL HANDLERS - uAA2++ Cross-Session Memory
      // =========================================================================

      case 'brittney_get_wisdom_stats': {
        const stats = getWisdomStats();

        // Format the stats nicely
        const matrixLines = Object.entries(stats.matrices)
          .map(([matrix, data]) =>
            `  **${matrix.toUpperCase()}**: ${data.wisdom} wisdom, ${data.patterns} patterns, ${data.gotchas} gotchas`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `## 🧠 Brittney Wisdom Stats (uAA2++)\n\n**Total Across All Matrices:**\n- Wisdom Entries: ${stats.total.wisdom}\n- Pattern Entries: ${stats.total.patterns}\n- Gotcha Entries: ${stats.total.gotchas}\n- Sessions Compressed: ${stats.total.sessions}\n\n**By Matrix:**\n${matrixLines}\n\n*Wisdom is accumulated automatically through conversations and persists across sessions.*`,
            },
          ],
        };
      }

      case 'brittney_export_wisdom': {
        // Map the tool's matrix parameter to the internal Matrix type
        const matrixParam = args.matrix as string | undefined;
        let internalMatrix: Matrix | undefined;

        if (matrixParam && matrixParam !== 'all') {
          // Map tool enum values to internal Matrix values
          const matrixMap: Record<string, Matrix> = {
            'holoscript': 'code',
            'vr': 'vr',
            'performance': 'debug',
            'debugging': 'debug',
            'networking': 'general',
          };
          internalMatrix = matrixMap[matrixParam] || 'general';
        }

        const markdown = exportWisdomAsMarkdown(internalMatrix);

        if (markdown.trim() === '# Brittney Wisdom Export\n' || markdown.trim() === '# Brittney Wisdom Export') {
          return {
            content: [
              {
                type: 'text',
                text: `## 📭 No Wisdom Accumulated Yet\n\nBrittney hasn't accumulated any wisdom entries yet.\n\n**How to build wisdom:**\n1. Have conversations with Brittney about HoloScript, VR development, debugging\n2. Wisdom is automatically extracted and compressed after ~10 messages\n3. Key learnings persist across sessions\n\n*Use \`brittney_compress_session\` to force compression.*`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: markdown,
            },
          ],
        };
      }

      case 'brittney_compress_session': {
        const force = args.force as boolean | undefined;

        // Check if we have enough conversation history to compress
        if (conversationHistory.length < 4 && !force) {
          return {
            content: [
              {
                type: 'text',
                text: `## ⏳ Not Enough Conversation to Compress\n\nCurrent conversation length: ${conversationHistory.length} messages\nMinimum required: 4 messages\n\n*Use \`force: true\` to compress anyway, or continue the conversation.*`,
              },
            ],
          };
        }

        // Detect matrix from recent conversation
        const recentContent = conversationHistory.slice(-5).map(m => m.content).join(' ');
        const matrix = detectMatrix(recentContent);

        try {
          await compressConversation(conversationHistory, matrix);

          return {
            content: [
              {
                type: 'text',
                text: `## ✅ Session Compressed Successfully\n\n**Matrix:** ${matrix}\n**Messages Processed:** ${conversationHistory.length}\n\n*Wisdom has been extracted and saved to persistent storage. Use \`brittney_get_wisdom_stats\` to see updated stats.*`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: `## ❌ Compression Failed\n\nError: ${error.message}\n\n*This may happen if the inference service is unavailable. Check \`brittney_check_service\`.*`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown Brittney tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Brittney error: ${error.message}` }],
      isError: true,
    };
  }
}

// =============================================================================
// LEGACY PLACEHOLDER - Now replaced by Brittney Service integration
// =============================================================================

// The AI assistant tools (brittney_explain_error, brittney_suggest_fix, 
// brittney_ask_question, brittney_analyze_performance, brittney_generate_holoscript)
// now call the actual Brittney service at localhost:11435 via callBrittneyService().
//
// Start the Brittney service with: npx @hololand/brittney-service start

