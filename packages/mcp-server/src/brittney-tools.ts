/**
 * Brittney IDE Agent Integration Tools
 *
 * These tools enable IDE agents (Claude Code, Cursor, Copilot) to get
 * visibility into the running Hololand application through Brittney.
 *
 * Architecture:
 * IDE Agent ←→ MCP Protocol ←→ Brittney Tools ←→ Native Messaging ←→ Browser Extension ←→ Hololand App
 *
 * Brittney is a browser-context specialist that helps IDE agents understand
 * what's happening in the running app - debugging without the blindfold.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

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
];

// =============================================================================
// NATIVE MESSAGING BRIDGE
// =============================================================================

/**
 * Bridge to browser extension via native messaging
 * This enables communication between MCP server and browser
 */
export class BrittneyNativeMessagingBridge {
  private connected = false;
  private messageQueue: Array<{ id: string; resolve: Function; reject: Function }> = [];
  private messageIdCounter = 0;

  /**
   * Check if browser extension is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send message to browser extension and wait for response
   */
  async sendMessage<T>(action: string, payload?: unknown): Promise<T> {
    const messageId = `msg_${++this.messageIdCounter}_${Date.now()}`;

    // In production, this would use native messaging
    // For now, return mock data for development
    return this.getMockResponse(action, payload) as T;
  }

  /**
   * Mock responses for development/testing
   */
  private getMockResponse(action: string, payload?: unknown): unknown {
    switch (action) {
      case 'getBrowserState':
        return {
          url: 'http://localhost:3000',
          title: 'Hololand - VR World',
          isHololandApp: true,
          connectionStatus: 'connected',
        } satisfies BrowserState;

      case 'listScenes':
        return [
          {
            id: 'scene_main',
            name: 'Main World',
            objectCount: 42,
            componentCount: 128,
            isActive: true,
          },
          {
            id: 'scene_lobby',
            name: 'Lobby',
            objectCount: 15,
            componentCount: 45,
            isActive: false,
          },
        ] satisfies SceneInfo[];

      case 'getProfilerStats':
        return {
          fps: 58,
          frameTime: 17.2,
          drawCalls: 156,
          triangles: 245000,
          textures: 32,
          memoryUsed: 128 * 1024 * 1024,
          gpuMemory: 256 * 1024 * 1024,
        } satisfies ProfilerStats;

      case 'getConsoleLogs':
        return [
          {
            level: 'info',
            message: 'Scene loaded: Main World',
            timestamp: Date.now() - 5000,
          },
          {
            level: 'warn',
            message: 'High draw call count: 156',
            timestamp: Date.now() - 2000,
          },
        ] satisfies ConsoleLogEntry[];

      case 'getRuntimeErrors':
        return [] satisfies RuntimeError[];

      default:
        return { success: true, action, payload };
    }
  }
}

// Singleton bridge instance
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
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
        // This would invoke Brittney's local model for explanation
        const errorId = args.errorId || 'latest';
        const explanation = await generateBrittneyExplanation('explain_error', { errorId });
        return {
          content: [
            {
              type: 'text',
              text: explanation,
            },
          ],
        };
      }

      case 'brittney_suggest_fix': {
        const suggestion = await generateBrittneyExplanation('suggest_fix', {
          issue: args.issue,
          scope: args.scope || 'all',
        });
        return {
          content: [
            {
              type: 'text',
              text: suggestion,
            },
          ],
        };
      }

      case 'brittney_ask_question': {
        const answer = await generateBrittneyExplanation('answer_question', {
          question: args.question,
          context: args.context,
        });
        return {
          content: [
            {
              type: 'text',
              text: answer,
            },
          ],
        };
      }

      case 'brittney_analyze_performance': {
        const stats = await nativeMessagingBridge.sendMessage<ProfilerStats>('getProfilerStats');
        const analysis = await generateBrittneyExplanation('analyze_performance', {
          stats,
          focus: args.focus || 'all',
          threshold: args.threshold || 60,
        });
        return {
          content: [
            {
              type: 'text',
              text: analysis,
            },
          ],
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
// BRITTNEY LOCAL MODEL INTEGRATION
// =============================================================================

/**
 * Generate explanation using Brittney's local model
 * This is where Brittney.GGUF would be invoked
 */
async function generateBrittneyExplanation(
  task: 'explain_error' | 'suggest_fix' | 'answer_question' | 'analyze_performance',
  context: Record<string, unknown>
): Promise<string> {
  // In production, this would call the local Brittney.GGUF model
  // For now, return structured placeholder responses

  switch (task) {
    case 'explain_error':
      return `## Error Analysis

**Error ID:** ${context.errorId}

Based on my analysis of the browser state and runtime context:

1. **Root Cause:** [Brittney.GGUF would analyze the stack trace and component state]
2. **Affected Components:** [List of components involved]
3. **Recommendation:** [Specific fix suggestion]

*Note: Connect Brittney.GGUF model for AI-powered analysis*`;

    case 'suggest_fix':
      return `## Fix Suggestion for: ${context.issue}

**Scope:** ${context.scope}

Based on the running application state:

1. **Identified Issue:** [Brittney.GGUF analysis]
2. **Suggested Code Change:**
\`\`\`typescript
// Brittney.GGUF would generate specific code here
\`\`\`
3. **Verification Steps:** Run brittney_get_profiler_stats after applying fix

*Note: Connect Brittney.GGUF model for AI-powered suggestions*`;

    case 'answer_question':
      return `## Answer to: ${context.question}

Based on the current browser state and Hololand app:

[Brittney.GGUF would provide a context-aware answer here]

*Note: Connect Brittney.GGUF model for AI-powered answers*`;

    case 'analyze_performance':
      const stats = context.stats as ProfilerStats;
      const threshold = context.threshold as number;
      return `## Performance Analysis

**Current Metrics:**
- FPS: ${stats.fps} (target: ${threshold})
- Frame Time: ${stats.frameTime}ms
- Draw Calls: ${stats.drawCalls}
- Triangles: ${stats.triangles.toLocaleString()}
- Memory: ${Math.round(stats.memoryUsed / 1024 / 1024)}MB

**Status:** ${stats.fps >= threshold ? '✓ Meeting target' : '⚠ Below target'}

**Recommendations:**
${
  stats.drawCalls > 100
    ? '- Consider batching draw calls or using instancing\n'
    : ''
}${
        stats.triangles > 500000
          ? '- Reduce triangle count with LOD or mesh simplification\n'
          : ''
      }${
        stats.fps < threshold
          ? '- Profile specific components to identify bottlenecks\n'
          : '- Performance is acceptable\n'
      }

*Note: Connect Brittney.GGUF model for deeper AI analysis*`;

    default:
      return 'Unknown task';
  }
}
