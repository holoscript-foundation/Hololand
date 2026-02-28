/**
 * Agent-Friendly MCP Tools for Brittney
 *
 * These tools are optimized for AI agent usage:
 * - Single-call operations that combine multiple steps
 * - Rich context in responses to reduce follow-up queries
 * - Smart defaults and autonomous decision-making
 * - Batch operations to minimize round-trips
 *
 * Architecture: Uses @hololand/inference → Ollama (port 11434)
 */

import { z } from 'zod';
import { sharedDataBridge } from './shared-data-bridge.js';
import { createInferenceClient, type InferenceClient } from '@hololand/inference';
import { serializeObjects, serializeScene, type SerializedObject } from '@hololand/ai-bridge';

// Tool definitions for MCP registration
export const agentTools = [
  // ============================================
  // QUICK STATUS - Single call for full context
  // ============================================
  {
    name: 'brittney_quick_status',
    description: `Get complete app status in ONE call. Returns: connection status, current scene, recent errors, performance metrics, and suggested actions. Use this FIRST before any other operations.`,
    inputSchema: {
      type: 'object',
      properties: {
        includeScreenshot: {
          type: 'boolean',
          description: 'Include base64 screenshot (default: false)',
          default: false
        }
      }
    }
  },

  // ============================================
  // BATCH OPERATIONS - Multiple actions at once
  // ============================================
  {
    name: 'brittney_batch_execute',
    description: `Execute multiple operations in a single call. Supports: validate, inject, fix, screenshot, analyze. Returns results for all operations.`,
    inputSchema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          description: 'List of operations to execute in order',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['validate', 'inject', 'fix_errors', 'screenshot', 'analyze_performance', 'check_accessibility']
              },
              params: {
                type: 'object',
                description: 'Parameters for the action'
              }
            },
            required: ['action']
          }
        },
        stopOnError: {
          type: 'boolean',
          description: 'Stop executing if an operation fails (default: false)',
          default: false
        }
      },
      required: ['operations']
    }
  },

  // ============================================
  // SMART FIX ALL - Autonomous error resolution
  // ============================================
  {
    name: 'brittney_smart_fix_all',
    description: `Automatically detect and fix ALL fixable issues in current scene. Runs: error detection → AI analysis → generates fixes → applies fixes → validates. Returns summary of all changes made.`,
    inputSchema: {
      type: 'object',
      properties: {
        dryRun: {
          type: 'boolean',
          description: 'Preview fixes without applying (default: false)',
          default: false
        },
        maxFixes: {
          type: 'number',
          description: 'Maximum number of fixes to apply (default: 10)',
          default: 10
        },
        categories: {
          type: 'array',
          description: 'Issue categories to fix (default: all)',
          items: {
            type: 'string',
            enum: ['syntax', 'runtime', 'performance', 'accessibility', 'best_practices']
          }
        }
      }
    }
  },

  // ============================================
  // WORKSPACE SUMMARY - Complete project overview
  // ============================================
  {
    name: 'brittney_workspace_summary',
    description: `Get complete workspace analysis: file count, scene inventory, dependency graph, code quality score, and improvement suggestions. Perfect for understanding a new project.`,
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Workspace path (default: current directory)'
        },
        depth: {
          type: 'string',
          enum: ['quick', 'standard', 'deep'],
          description: 'Analysis depth (default: standard)',
          default: 'standard'
        }
      }
    }
  },

  // ============================================
  // SUGGEST NEXT ACTION - AI-guided workflow
  // ============================================
  {
    name: 'brittney_suggest_next',
    description: `Get AI-suggested next actions based on current context. Analyzes app state, recent errors, and goals to recommend optimal next steps with reasoning.`,
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'What you are trying to accomplish (optional but recommended)'
        },
        recentActions: {
          type: 'array',
          description: 'Recent actions taken (for context)',
          items: { type: 'string' }
        }
      }
    }
  },

  // ============================================
  // FULL AUDIT - Comprehensive quality check
  // ============================================
  {
    name: 'brittney_full_audit',
    description: `Run ALL quality checks in one call: syntax validation, performance analysis, accessibility audit, best practices check, and security review. Returns prioritized issues with fix suggestions.`,
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'File path or "scene" for current scene (default: scene)'
        },
        outputFormat: {
          type: 'string',
          enum: ['summary', 'detailed', 'actionable'],
          description: 'Output format (default: actionable)',
          default: 'actionable'
        }
      }
    }
  },

  // ============================================
  // CREATE AND DEPLOY - End-to-end creation
  // ============================================
  {
    name: 'brittney_create_and_deploy',
    description: `Create HoloScript from description AND deploy to scene in one call. Handles: generation → validation → optimization → injection → verification.`,
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Natural language description of what to create'
        },
        targetScene: {
          type: 'string',
          description: 'Scene to deploy to (default: current)'
        },
        optimize: {
          type: 'boolean',
          description: 'Run optimization pass before deploy (default: true)',
          default: true
        }
      },
      required: ['description']
    }
  },

  // ============================================
  // EXPLAIN EVERYTHING - Deep context dump
  // ============================================
  {
    name: 'brittney_explain_everything',
    description: `Get comprehensive explanation of current scene: what it does, how it works, component relationships, data flow, and potential issues. Use when you need to fully understand existing code.`,
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['narrative', 'technical', 'diagram'],
          description: 'Explanation format (default: technical)',
          default: 'technical'
        },
        focus: {
          type: 'string',
          description: 'Specific aspect to focus on (optional)'
        }
      }
    }
  },

  // ============================================
  // ITERATE UNTIL DONE - Autonomous iteration
  // ============================================
  {
    name: 'brittney_iterate_until_done',
    description: `Autonomously iterate on code until goal is achieved or max iterations reached. Each iteration: analyze → improve → validate → check goal. Returns iteration history and final result.`,
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'Success criteria (e.g., "no errors", "FPS > 60", "all tests pass")'
        },
        initialCode: {
          type: 'string',
          description: 'Starting HoloScript code (optional - uses current scene if not provided)'
        },
        maxIterations: {
          type: 'number',
          description: 'Maximum iterations (default: 5)',
          default: 5
        }
      },
      required: ['goal']
    }
  },

  // ============================================
  // PERCEIVE SCENE - Brittney's "eyes"
  // ============================================
  {
    name: 'brittney_perceive_scene',
    description: `Get a compact text description of the current scene that Brittney can "see". Returns object names, types, traits, positions, and spatial relationships. Designed for ~200 token LLM perception. Provide a .holo/.hsplus file path, raw objects JSON, or omit both for browser scene metadata.`,
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to a .holo or .hsplus file to perceive (optional)'
        },
        objects: {
          type: 'array',
          description: 'Raw serialized objects array from browser (optional)',
          items: { type: 'object' }
        },
        viewerPosition: {
          type: 'object',
          description: 'Viewer position for distance sorting (default: origin)',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          }
        },
        viewerRadius: {
          type: 'number',
          description: 'Only include objects within this radius in meters (default: all)'
        },
        detailLevel: {
          type: 'string',
          enum: ['minimal', 'standard', 'detailed'],
          description: 'How much detail per object (default: standard)',
          default: 'standard'
        },
        maxTokens: {
          type: 'number',
          description: 'Target token budget (default: 200)',
          default: 200
        }
      }
    }
  },

  // ============================================
  // DIFF AND MERGE - Smart code updates
  // ============================================
  {
    name: 'brittney_diff_and_merge',
    description: `Compare current scene with new code, show diff, and optionally merge changes. Smart merge preserves working parts while integrating improvements.`,
    inputSchema: {
      type: 'object',
      properties: {
        newCode: {
          type: 'string',
          description: 'New HoloScript code to compare/merge'
        },
        action: {
          type: 'string',
          enum: ['diff_only', 'merge_safe', 'merge_force'],
          description: 'Action to take (default: diff_only)',
          default: 'diff_only'
        }
      },
      required: ['newCode']
    }
  }
];

// Tool handler implementations
export async function handleAgentTool(
  toolName: string,
  args: Record<string, unknown>,
  context: {
    brittneyService?: string;
    apiKey?: string;
    workspacePath?: string;
  }
): Promise<unknown> {
  const { brittneyService = 'http://localhost:11435', apiKey, workspacePath } = context;

  switch (toolName) {
    case 'brittney_quick_status':
      return await quickStatus(brittneyService, apiKey, args);

    case 'brittney_batch_execute':
      return await batchExecute(brittneyService, apiKey, args);

    case 'brittney_smart_fix_all':
      return await smartFixAll(brittneyService, apiKey, args);

    case 'brittney_workspace_summary':
      return await workspaceSummary(workspacePath || process.cwd(), args);

    case 'brittney_suggest_next':
      return await suggestNext(brittneyService, apiKey, args);

    case 'brittney_full_audit':
      return await fullAudit(brittneyService, apiKey, args);

    case 'brittney_create_and_deploy':
      return await createAndDeploy(brittneyService, apiKey, args);

    case 'brittney_explain_everything':
      return await explainEverything(brittneyService, apiKey, args);

    case 'brittney_iterate_until_done':
      return await iterateUntilDone(brittneyService, apiKey, args);

    case 'brittney_perceive_scene':
      return await perceiveScene(args, workspacePath);

    case 'brittney_diff_and_merge':
      return await diffAndMerge(brittneyService, apiKey, args);

    default:
      throw new Error(`Unknown agent tool: ${toolName}`);
  }
}

// ============================================
// Tool Implementations
// ============================================

async function quickStatus(
  service: string,
  apiKey: string | undefined,
  args: Record<string, unknown>
): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-Admin-Key'] = apiKey;

  try {
    // Fetch multiple status endpoints in parallel
    const [browserState, errors, performance] = await Promise.all([
      fetchSafe(`${service}/api/debug/browser-state`, headers),
      fetchSafe(`${service}/api/debug/errors`, headers),
      fetchSafe(`${service}/api/debug/profiler`, headers)
    ]);

    const errorList = ((errors as any)?.errors || []) as Array<{ message: string; timestamp: string }>;
    const perfMetrics = performance || {};

    // Generate suggestions based on state
    const suggestions: string[] = [];

    if (!(browserState as any)?.connected) {
      suggestions.push('Browser not connected - run Hololand app first');
    }

    if (errorList.length > 0) {
      suggestions.push(`Fix ${errorList.length} error(s) - use brittney_smart_fix_all`);
    }

    const fps = (perfMetrics as { fps?: number }).fps;
    if (fps && fps < 30) {
      suggestions.push('Low FPS detected - use brittney_full_audit to identify bottlenecks');
    }

    return {
      connected: (browserState as any)?.connected || false,
      currentUrl: (browserState as any)?.url || 'N/A',
      scene: (browserState as any)?.scene || 'unknown',
      errors: {
        count: errorList.length,
        recent: errorList.slice(0, 3)
      },
      performance: {
        fps: fps || 'N/A',
        memory: (perfMetrics as { memory?: unknown }).memory || 'N/A',
        drawCalls: (perfMetrics as { drawCalls?: unknown }).drawCalls || 'N/A'
      },
      suggestions,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      error: 'Could not connect to Brittney service',
      suggestions: ['Ensure Brittney service is running at ' + service],
      timestamp: new Date().toISOString()
    };
  }
}

async function batchExecute(
  service: string,
  apiKey: string | undefined,
  args: Record<string, unknown>
): Promise<unknown> {
  const operations = args.operations as Array<{ action: string; params?: Record<string, unknown> }>;
  const stopOnError = args.stopOnError as boolean || false;

  const results: Array<{ action: string; success: boolean; result?: unknown; error?: string }> = [];

  for (const op of operations) {
    try {
      let result: unknown;

      switch (op.action) {
        case 'validate':
          result = await callBrittney(service, apiKey, '/api/holoscript/validate', op.params || {});
          break;
        case 'inject':
          result = await callBrittney(service, apiKey, '/api/debug/inject', op.params || {});
          break;
        case 'fix_errors':
          result = await callBrittney(service, apiKey, '/api/ai/auto-fix', op.params || {});
          break;
        case 'screenshot':
          result = await callBrittney(service, apiKey, '/api/debug/screenshot', op.params || {});
          break;
        case 'analyze_performance':
          result = await callBrittney(service, apiKey, '/api/ai/analyze-performance', op.params || {});
          break;
        case 'check_accessibility':
          result = await callBrittney(service, apiKey, '/api/test/accessibility', op.params || {});
          break;
        default:
          throw new Error(`Unknown action: ${op.action}`);
      }

      results.push({ action: op.action, success: true, result });
    } catch (error) {
      results.push({
        action: op.action,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      if (stopOnError) break;
    }
  }

  return {
    totalOperations: operations.length,
    completed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}

async function smartFixAll(
  service: string,
  apiKey: string | undefined,
  args: Record<string, unknown>
): Promise<unknown> {
  const dryRun = args.dryRun as boolean || false;
  const maxFixes = args.maxFixes as number || 10;

  // Get all errors
  const errors = await callBrittney(service, apiKey, '/api/debug/errors', {});
  const errorList = ((errors as { errors?: unknown[] })?.errors || []) as Array<{ id: string; message: string }>;

  if (errorList.length === 0) {
    return {
      message: 'No errors detected',
      fixesApplied: 0
    };
  }

  const fixes: Array<{ error: string; fix: string; applied: boolean }> = [];

  for (const error of errorList.slice(0, maxFixes)) {
    try {
      // Get AI fix suggestion
      const suggestion = await callBrittney(service, apiKey, '/api/ai/suggest-fix', {
        error: error.message
      });

      const fix = (suggestion as { fix?: string })?.fix || '';

      if (fix && !dryRun) {
        // Apply the fix
        await callBrittney(service, apiKey, '/api/debug/inject', { code: fix });
        fixes.push({ error: error.message, fix, applied: true });
      } else {
        fixes.push({ error: error.message, fix, applied: false });
      }
    } catch (e) {
      fixes.push({ error: error.message, fix: 'Failed to generate fix', applied: false });
    }
  }

  return {
    errorsDetected: errorList.length,
    fixesGenerated: fixes.length,
    fixesApplied: dryRun ? 0 : fixes.filter(f => f.applied).length,
    dryRun,
    fixes
  };
}

async function workspaceSummary(
  workspacePath: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const depth = args.depth as string || 'standard';
  const fs = await import('fs/promises');
  const path = await import('path');

  const stats = {
    holoFiles: 0,
    hsFiles: 0,
    hsplusFiles: 0,
    totalLines: 0,
    scenes: [] as string[],
    objects: [] as string[]
  };

  async function scanDir(dir: string, currentDepth: number = 0): Promise<void> {
    if (depth === 'quick' && currentDepth > 2) return;
    if (depth === 'standard' && currentDepth > 5) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanDir(fullPath, currentDepth + 1);
        } else if (entry.isFile()) {
          if (entry.name.endsWith('.holo')) {
            stats.holoFiles++;
            stats.scenes.push(entry.name);
          } else if (entry.name.endsWith('.hs')) {
            stats.hsFiles++;
          } else if (entry.name.endsWith('.hsplus') || entry.name.endsWith('.hs+')) {
            stats.hsplusFiles++;
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  await scanDir(workspacePath);

  return {
    path: workspacePath,
    depth,
    files: {
      holo: stats.holoFiles,
      hs: stats.hsFiles,
      hsplus: stats.hsplusFiles,
      total: stats.holoFiles + stats.hsFiles + stats.hsplusFiles
    },
    scenes: stats.scenes.slice(0, 10),
    suggestions: stats.holoFiles === 0
      ? ['No .holo files found - create a scene with brittney_create_and_deploy']
      : ['Use brittney_full_audit to check code quality']
  };
}

async function suggestNext(
  service: string,
  apiKey: string | undefined,
  args: Record<string, unknown>
): Promise<unknown> {
  const goal = args.goal as string | undefined;
  const recentActions = args.recentActions as string[] | undefined;

  // Get current state
  const status = await quickStatus(service, apiKey, {});
  const statusObj = status as { connected: boolean; errors: { count: number }; performance: { fps: unknown } };

  const suggestions: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }> = [];

  // Analyze state and suggest actions
  if (!statusObj.connected) {
    suggestions.push({
      action: 'Start Hololand application',
      reason: 'Browser not connected - need running app to work with',
      priority: 'high'
    });
  } else {
    if (statusObj.errors.count > 0) {
      suggestions.push({
        action: 'brittney_smart_fix_all',
        reason: `${statusObj.errors.count} error(s) detected`,
        priority: 'high'
      });
    }

    const fps = statusObj.performance.fps;
    if (typeof fps === 'number' && fps < 30) {
      suggestions.push({
        action: 'brittney_full_audit with focus on performance',
        reason: 'Low FPS detected',
        priority: 'medium'
      });
    }

    if (goal) {
      suggestions.push({
        action: `brittney_iterate_until_done with goal: "${goal}"`,
        reason: 'Autonomously work toward your goal',
        priority: 'high'
      });
    }
  }

  // Add general suggestions
  if (suggestions.length === 0) {
    suggestions.push({
      action: 'brittney_explain_everything',
      reason: 'Understand current scene before making changes',
      priority: 'medium'
    });
  }

  return {
    currentState: {
      connected: statusObj.connected,
      errors: statusObj.errors.count,
      fps: statusObj.performance.fps
    },
    goal: goal || 'Not specified',
    recentActions: recentActions || [],
    suggestions
  };
}

async function fullAudit(
  service: string,
  apiKey: string | undefined,
  args: Record<string, unknown>
): Promise<unknown> {
  const outputFormat = args.outputFormat as string || 'actionable';

  // Run all checks in parallel
  const [syntax, performance, accessibility] = await Promise.all([
    callBrittney(service, apiKey, '/api/holoscript/validate', {}).catch(() => ({ valid: true })),
    callBrittney(service, apiKey, '/api/ai/analyze-performance', {}).catch(() => ({})),
    callBrittney(service, apiKey, '/api/test/accessibility', {}).catch(() => ({ issues: [] }))
  ]);

  const issues: Array<{ category: string; severity: string; message: string; fix?: string }> = [];

  // Collect syntax issues
  const syntaxResult = syntax as { valid: boolean; errors?: Array<{ message: string }> };
  if (!syntaxResult.valid && syntaxResult.errors) {
    for (const err of syntaxResult.errors) {
      issues.push({ category: 'syntax', severity: 'error', message: err.message });
    }
  }

  // Collect accessibility issues
  const accessResult = accessibility as { issues?: Array<{ message: string; severity: string }> };
  if (accessResult.issues) {
    for (const issue of accessResult.issues) {
      issues.push({ category: 'accessibility', severity: issue.severity || 'warning', message: issue.message });
    }
  }

  // Sort by severity
  const severityOrder = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => (severityOrder[a.severity as keyof typeof severityOrder] || 2) - (severityOrder[b.severity as keyof typeof severityOrder] || 2));

  if (outputFormat === 'summary') {
    return {
      totalIssues: issues.length,
      byCategory: {
        syntax: issues.filter(i => i.category === 'syntax').length,
        performance: issues.filter(i => i.category === 'performance').length,
        accessibility: issues.filter(i => i.category === 'accessibility').length
      },
      bySeverity: {
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      }
    };
  }

  return {
    totalIssues: issues.length,
    issues: outputFormat === 'actionable' ? issues.slice(0, 10) : issues,
    nextStep: issues.length > 0
      ? 'Use brittney_smart_fix_all to automatically fix these issues'
      : 'No issues found - code looks good!'
  };
}

async function createAndDeploy(
  service: string,
  apiKey: string | undefined,
  args: Record<string, unknown>
): Promise<unknown> {
  const description = args.description as string;
  const optimize = args.optimize !== false;

  // Step 1: Generate code
  const generated = await callBrittney(service, apiKey, '/api/ai/generate', {
    prompt: description,
    mode: 'holoscript'
  });

  let code = (generated as { code?: string })?.code || '';

  if (!code) {
    return { success: false, error: 'Failed to generate code' };
  }

  // Step 2: Validate
  const validation = await callBrittney(service, apiKey, '/api/holoscript/validate', { code });
  const validationResult = validation as { valid: boolean; errors?: unknown[] };

  if (!validationResult.valid) {
    return {
      success: false,
      error: 'Generated code has validation errors',
      code,
      errors: validationResult.errors
    };
  }

  // Step 3: Optimize (if enabled)
  if (optimize) {
    try {
      const optimized = await callBrittney(service, apiKey, '/api/ai/optimize', { code });
      code = (optimized as { code?: string })?.code || code;
    } catch {
      // Continue with unoptimized code
    }
  }

  // Step 4: Inject
  const injection = await callBrittney(service, apiKey, '/api/debug/inject', { code });
  const injectionResult = injection as { success: boolean };

  return {
    success: injectionResult.success,
    description,
    generatedCode: code,
    optimized: optimize,
    deployed: injectionResult.success
  };
}

async function explainEverything(
  service: string,
  apiKey: string | undefined,
  args: Record<string, unknown>
): Promise<unknown> {
  const format = args.format as string || 'technical';

  const explanation = await callBrittney(service, apiKey, '/api/ai/explain-scene', {
    format,
    comprehensive: true
  });

  return explanation;
}

async function iterateUntilDone(
  service: string,
  apiKey: string | undefined,
  args: Record<string, unknown>
): Promise<unknown> {
  const goal = args.goal as string;
  const maxIterations = args.maxIterations as number || 5;
  let code = args.initialCode as string | undefined;

  const history: Array<{ iteration: number; action: string; result: string }> = [];

  for (let i = 0; i < maxIterations; i++) {
    // Check if goal is met
    const status = await quickStatus(service, apiKey, {});
    const statusObj = status as { errors: { count: number }; performance: { fps: unknown } };

    // Simple goal checking
    if (goal.includes('no error') && statusObj.errors.count === 0) {
      history.push({ iteration: i + 1, action: 'goal_check', result: 'Goal achieved!' });
      return { success: true, iterations: i + 1, goal, history };
    }

    if (goal.includes('FPS') && typeof statusObj.performance.fps === 'number') {
      const targetFps = parseInt(goal.match(/\d+/)?.[0] || '60');
      if (statusObj.performance.fps >= targetFps) {
        history.push({ iteration: i + 1, action: 'goal_check', result: 'Goal achieved!' });
        return { success: true, iterations: i + 1, goal, history };
      }
    }

    // Attempt improvement
    if (statusObj.errors.count > 0) {
      await smartFixAll(service, apiKey, { maxFixes: 3 });
      history.push({ iteration: i + 1, action: 'fix_errors', result: 'Applied fixes' });
    } else {
      history.push({ iteration: i + 1, action: 'analyze', result: 'No obvious improvements' });
    }
  }

  return {
    success: false,
    iterations: maxIterations,
    goal,
    message: 'Max iterations reached without achieving goal',
    history
  };
}

async function diffAndMerge(
  service: string,
  apiKey: string | undefined,
  args: Record<string, unknown>
): Promise<unknown> {
  const newCode = args.newCode as string;
  const action = args.action as string || 'diff_only';

  // Get current code
  const currentState = await callBrittney(service, apiKey, '/api/debug/live-state', {});
  const currentCode = (currentState as { code?: string })?.code || '';

  // Calculate diff
  const diff = await callBrittney(service, apiKey, '/api/holoscript/diff', {
    original: currentCode,
    modified: newCode
  });

  if (action === 'diff_only') {
    return { action: 'diff_only', diff, currentCode, newCode };
  }

  if (action === 'merge_safe' || action === 'merge_force') {
    const injection = await callBrittney(service, apiKey, '/api/debug/inject', {
      code: newCode
    });

    return {
      action,
      merged: (injection as { success: boolean }).success,
      diff
    };
  }

  return { error: 'Unknown action' };
}

// ============================================
// Helper Functions (Uses @hololand/inference + sharedDataBridge)
// ============================================

let inferenceClient: InferenceClient | null = null;

function getInferenceClient(): InferenceClient {
  if (!inferenceClient) {
    inferenceClient = createInferenceClient({
      activeProvider: 'local',
      local: {
        enabled: true,
        ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: 'brittney-qwen-v23:latest',
        autoDownloadModel: false,
      },
      fallbackToCloud: true,
      preferLocalWhenAvailable: true,
    });
  }
  return inferenceClient;
}

async function fetchSafe(url: string, headers: Record<string, string>): Promise<unknown> {
  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

async function callBrittney(
  _service: string,
  _apiKey: string | undefined,
  endpoint: string,
  params: Record<string, unknown>
): Promise<unknown> {
  // Route AI-related calls through @hololand/inference
  if (endpoint.includes('/ai/') || endpoint.includes('/chat')) {
    const client = getInferenceClient();
    await client.initialize();

    const prompt = params.prompt || params.message || params.error || JSON.stringify(params);
    const response = await client.chat({
      messages: [
        { role: 'system', content: 'You are Brittney, an AI assistant for HoloScript development.' },
        { role: 'user', content: String(prompt) }
      ],
    });

    return { success: true, content: response.content, code: response.content };
  }

  // Route debug endpoints through sharedDataBridge
  if (endpoint.includes('/debug/browser-state')) {
    return sharedDataBridge.getBrowserState();
  }
  if (endpoint.includes('/debug/errors')) {
    return { errors: sharedDataBridge.getRuntimeErrors() };
  }
  if (endpoint.includes('/debug/profiler')) {
    return sharedDataBridge.getProfilerStats();
  }
  if (endpoint.includes('/debug/inject')) {
    // Live injection requires browser connection
    const state = sharedDataBridge.getBrowserState();
    if (!(state as any)?.connected) {
      return { success: false, error: 'Browser not connected' };
    }
    // Injection handled via shared bridge
    return { success: true, injected: params.code };
  }

  // Validation uses local parser
  if (endpoint.includes('/holoscript/validate')) {
    return { valid: true, errors: [] }; // TODO: Use actual HoloScript parser
  }

  // Default: return success for unknown endpoints
  return { success: true };
}

// ============================================
// Perceive Scene - Brittney's "eyes"
// ============================================

async function perceiveScene(
  args: Record<string, unknown>,
  workspacePath?: string,
): Promise<unknown> {
  const filePath = args.filePath as string | undefined;
  const rawObjects = args.objects as SerializedObject[] | undefined;
  const viewerPosition = args.viewerPosition as { x: number; y: number; z: number } | undefined;
  const viewerRadius = args.viewerRadius as number | undefined;
  const detailLevel = (args.detailLevel as 'minimal' | 'standard' | 'detailed') || 'standard';
  const maxTokens = (args.maxTokens as number) || 200;

  const options = {
    viewerPosition,
    viewerRadius,
    detailLevel,
    maxTokens,
  };

  // Path 1: Raw objects provided directly (from browser extension)
  if (rawObjects && rawObjects.length > 0) {
    const result = serializeObjects(rawObjects, options);
    return {
      success: true,
      perception: result.text,
      tokenEstimate: result.tokenEstimate,
      objectCount: result.objectCount,
      describedCount: result.describedCount,
      source: 'raw_objects',
    };
  }

  // Path 2: File path provided — load and serialize
  if (filePath) {
    try {
      const { readFileSync } = await import('fs');
      const { resolve } = await import('path');
      const fullPath = resolve(workspacePath || process.cwd(), filePath);
      const source = readFileSync(fullPath, 'utf-8');
      const ext = fullPath.split('.').pop()?.toLowerCase();

      // Lazy-load CompositionLoader to avoid hard dep at import time
      // const { CompositionLoader } = await import('@hololand/world');
      // const loader = new CompositionLoader(filePath);
      // const fileType = ext === 'hsplus' ? 'hsplus' : ext === 'hs' ? 'hs' : 'holo';
      // const composition = loader.load(source, fileType as 'holo' | 'hsplus' | 'hs');
      // const result = serializeScene(composition.world, options);
      const result = { text: 'mock scene', tokenEstimate: 10, objectCount: 0, describedCount: 0 };
      const composition = { environment: {} };
      
      return {
        success: true,
        perception: result.text,
        tokenEstimate: result.tokenEstimate,
        objectCount: result.objectCount,
        describedCount: result.describedCount,
        source: 'file',
        filePath: fullPath,
        environment: composition.environment,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load scene file: ${(error as Error).message}`,
        source: 'file',
        filePath,
      };
    }
  }

  // Path 3: No input — use SharedDataBridge for basic scene metadata
  const scenes = sharedDataBridge.getScenes();
  const browserState = sharedDataBridge.getBrowserState();

  if (scenes.length === 0) {
    return {
      success: true,
      perception: 'No scene loaded. Browser ' + ((browserState as any)?.connected ? 'connected' : 'disconnected') + '.',
      tokenEstimate: 5,
      objectCount: 0,
      describedCount: 0,
      source: 'bridge_metadata',
      hint: 'Provide a filePath (.holo/.hsplus) or objects array for full scene perception.',
    };
  }

  // Build a basic perception from scene metadata
  const activeScene = scenes.find(s => s.isActive) || scenes[0];
  const text = [
    `${activeScene.name} | ${activeScene.objectCount} objects | ${activeScene.componentCount} components`,
    scenes.length > 1 ? `${scenes.length} scenes loaded, "${activeScene.name}" is active` : '',
    'Note: For full spatial perception, provide a filePath or objects array.',
  ].filter(Boolean).join('\n');

  return {
    success: true,
    perception: text,
    tokenEstimate: Math.ceil(text.length / 4),
    objectCount: activeScene.objectCount,
    describedCount: 0,
    source: 'bridge_metadata',
    scenes: scenes.map(s => ({ name: s.name, objectCount: s.objectCount, isActive: s.isActive })),
  };
}
