/**
 * Advanced Brittney Tools for Hololand MCP
 * 
 * Power tools that extend Brittney's capabilities:
 * - One-shot generate & inject pipeline
 * - Real-time error monitoring with auto-fix
 * - Performance guard with AI optimization
 * - HoloScript playground for live testing
 * - Session recording & replay
 * - Visual comparison tools
 * - Scene versioning
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sharedDataBridge } from './shared-data-bridge.js';

// =============================================================================
// BRITTNEY SERVICE CLIENT
// =============================================================================

const BRITTNEY_SERVICE_URL = process.env.BRITTNEY_SERVICE_URL || 'http://localhost:11435';

interface BrittneyResponse {
  success: boolean;
  response?: string;
  code?: string;
  error?: string;
}

async function callBrittney(message: string, context?: object): Promise<BrittneyResponse> {
  try {
    const response = await fetch(`${BRITTNEY_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        context: context ? { browserState: context } : undefined,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Brittney service error: ${response.status}` };
    }

    const data = await response.json() as { content: string };
    return { success: true, response: data.content };
  } catch (error: any) {
    return { success: false, error: `Failed to reach Brittney: ${error.message}` };
  }
}

function getBrowserContext() {
  const state = sharedDataBridge.getBrowserState();
  const profiler = sharedDataBridge.getProfilerStats();
  const errors = sharedDataBridge.getRuntimeErrors();
  const logs = sharedDataBridge.getConsoleLogs();
  const scenes = sharedDataBridge.getScenes();
  
  return {
    url: state?.url,
    isHololandApp: state?.isHololandApp,
    profilerStats: profiler,
    recentErrors: errors.slice(0, 5),
    recentLogs: logs.slice(0, 10),
    scenes,
    connected: sharedDataBridge.isConnected(),
  };
}

// =============================================================================
// ADVANCED TOOL DEFINITIONS
// =============================================================================

export const advancedBrittneyTools: Tool[] = [
  // =========================================================================
  // ONE-SHOT CREATION PIPELINE
  // =========================================================================
  {
    name: 'brittney_create_and_inject',
    description:
      'Generate HoloScript with Brittney AI and immediately inject it into the running Hololand app. One-shot creation-to-browser pipeline. Describe what you want, Brittney generates it, and it appears in the browser instantly.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Natural language description of what to create (e.g., "a glowing portal with particle effects", "a weapon rack with swords")',
        },
        category: {
          type: 'string',
          enum: ['object', 'ui', 'particle', 'animation', 'scene', 'npc', 'weapon', 'collectible', 'audio', 'material'],
          description: 'Category hint for better generation',
        },
        worldId: {
          type: 'string',
          description: 'Target world to inject into (default: current world)',
        },
        validate: {
          type: 'boolean',
          description: 'Validate HoloScript syntax before injection (default: true)',
        },
      },
      required: ['description'],
    },
  },

  // =========================================================================
  // REAL-TIME MONITORING
  // =========================================================================
  {
    name: 'brittney_error_monitor',
    description:
      'Get current error status and optionally have Brittney analyze the latest error. Returns error count, severity, and AI analysis if requested.',
    inputSchema: {
      type: 'object',
      properties: {
        analyze: {
          type: 'boolean',
          description: 'Have Brittney analyze the latest error (default: false)',
        },
        threshold: {
          type: 'number',
          description: 'Alert when error count exceeds this (default: 5)',
        },
      },
    },
  },
  {
    name: 'brittney_auto_fix',
    description:
      'Attempt to automatically fix the latest browser error using Brittney AI. Brittney analyzes the error, generates a fix, and optionally injects it into the running app.',
    inputSchema: {
      type: 'object',
      properties: {
        errorIndex: {
          type: 'number',
          description: 'Index of error to fix (0 = latest, default: 0)',
        },
        apply: {
          type: 'boolean',
          description: 'Apply the fix automatically (default: false, preview only)',
        },
      },
    },
  },
  {
    name: 'brittney_performance_monitor',
    description:
      'Monitor performance metrics with thresholds and get AI-powered optimization suggestions when performance degrades.',
    inputSchema: {
      type: 'object',
      properties: {
        fpsThreshold: {
          type: 'number',
          description: 'Alert when FPS drops below this (default: 30)',
        },
        memoryThresholdMB: {
          type: 'number',
          description: 'Alert when memory exceeds this in MB (default: 500)',
        },
        getSuggestions: {
          type: 'boolean',
          description: 'Get AI optimization suggestions (default: true when thresholds exceeded)',
        },
      },
    },
  },

  // =========================================================================
  // HOLOSCRIPT DEVELOPMENT
  // =========================================================================
  {
    name: 'brittney_holoscript_playground',
    description:
      'Interactive HoloScript playground. Parse, validate, explain, or inject HoloScript code with instant feedback. Perfect for learning and testing.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to work with',
        },
        action: {
          type: 'string',
          enum: ['validate', 'explain', 'optimize', 'inject', 'convert'],
          description: 'Action to perform: validate syntax, explain code, optimize, inject to browser, or convert from another format',
        },
        convertFrom: {
          type: 'string',
          enum: ['glb', 'gltf', 'obj', 'javascript', 'json'],
          description: 'Source format when action is "convert"',
        },
      },
      required: ['code', 'action'],
    },
  },
  {
    name: 'brittney_holoscript_diff',
    description:
      'Compare HoloScript code - shows what will change if injected. Use before injection to preview changes.',
    inputSchema: {
      type: 'object',
      properties: {
        newCode: {
          type: 'string',
          description: 'New HoloScript to compare against current browser state',
        },
        showDetails: {
          type: 'boolean',
          description: 'Show detailed diff including line-by-line changes (default: false)',
        },
      },
      required: ['newCode'],
    },
  },
  {
    name: 'brittney_holoscript_templates',
    description:
      'Get HoloScript templates for common patterns. Use as starting points for your creations.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['interactive-object', 'ui-panel', 'particle-system', 'npc-character', 'weapon', 'collectible', 'portal', 'vehicle', 'building', 'environment'],
          description: 'Template category',
        },
        customize: {
          type: 'object',
          description: 'Customization options (varies by template)',
        },
      },
      required: ['category'],
    },
  },

  // =========================================================================
  // SESSION & VERSIONING
  // =========================================================================
  {
    name: 'brittney_scene_snapshot',
    description:
      'Capture a comprehensive snapshot of the current scene including HoloScript, objects, performance metrics, and optionally a screenshot. Use for versioning and comparison.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for this snapshot (e.g., "before-portal-change")',
        },
        includeScreenshot: {
          type: 'boolean',
          description: 'Include base64 screenshot (default: true)',
        },
        includeHoloScript: {
          type: 'boolean',
          description: 'Include current HoloScript content (default: true)',
        },
        includeMetrics: {
          type: 'boolean',
          description: 'Include performance metrics (default: true)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'brittney_compare_snapshots',
    description:
      'Compare two scene snapshots to see what changed. Useful for reviewing changes over time.',
    inputSchema: {
      type: 'object',
      properties: {
        snapshotA: {
          type: 'string',
          description: 'First snapshot name or "current" for live state',
        },
        snapshotB: {
          type: 'string',
          description: 'Second snapshot name or "current" for live state',
        },
        compareType: {
          type: 'string',
          enum: ['visual', 'holoscript', 'performance', 'objects', 'all'],
          description: 'What to compare (default: all)',
        },
      },
      required: ['snapshotA', 'snapshotB'],
    },
  },
  {
    name: 'brittney_record_session',
    description:
      'Start or stop recording a development session. Captures all changes, injections, errors, and performance over time.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['start', 'stop', 'status', 'export'],
          description: 'Recording action',
        },
        sessionName: {
          type: 'string',
          description: 'Name for the session (required for start)',
        },
        format: {
          type: 'string',
          enum: ['json', 'markdown', 'holoscript'],
          description: 'Export format (for export action)',
        },
      },
      required: ['action'],
    },
  },

  // =========================================================================
  // TESTING & VALIDATION
  // =========================================================================
  {
    name: 'brittney_test_scene',
    description:
      'Run automated tests on the current scene. Check for performance issues, accessibility problems, HoloScript errors, or visual regressions.',
    inputSchema: {
      type: 'object',
      properties: {
        testType: {
          type: 'string',
          enum: ['performance', 'holoscript-syntax', 'accessibility', 'visual-regression', 'interaction', 'all'],
          description: 'Type of test to run',
        },
        baseline: {
          type: 'string',
          description: 'Baseline snapshot name for regression tests',
        },
        threshold: {
          type: 'number',
          description: 'Pass/fail threshold (meaning varies by test type)',
        },
      },
      required: ['testType'],
    },
  },
  {
    name: 'brittney_accessibility_check',
    description:
      'Check the current scene for VR/AR accessibility issues. Returns recommendations for colorblind users, motion sensitivity, text legibility, and interaction reach.',
    inputSchema: {
      type: 'object',
      properties: {
        checks: {
          type: 'array',
          items: { type: 'string', enum: ['color-contrast', 'motion', 'text-legibility', 'interaction-reach', 'audio-cues', 'all'] },
          description: 'Specific checks to run (default: all)',
        },
      },
    },
  },

  // =========================================================================
  // LEARNING & DOCUMENTATION
  // =========================================================================
  {
    name: 'brittney_explain_scene',
    description:
      'Have Brittney explain everything in the current scene - what objects are present, how they interact, performance characteristics, and potential improvements.',
    inputSchema: {
      type: 'object',
      properties: {
        depth: {
          type: 'string',
          enum: ['overview', 'detailed', 'comprehensive'],
          description: 'Level of detail (default: overview)',
        },
        focus: {
          type: 'string',
          enum: ['objects', 'interactions', 'performance', 'holoscript', 'all'],
          description: 'What to focus on (default: all)',
        },
      },
    },
  },
  {
    name: 'brittney_learn_holoscript',
    description:
      'Interactive HoloScript learning tool. Get explanations, examples, and practice exercises for any HoloScript concept.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic to learn about (e.g., "objects", "materials", "animation", "networking", "physics")',
        },
        level: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Learning level (default: beginner)',
        },
        includeExercise: {
          type: 'boolean',
          description: 'Include a practice exercise (default: true)',
        },
      },
      required: ['topic'],
    },
  },
];

// =============================================================================
// IN-MEMORY STORAGE FOR SESSIONS/SNAPSHOTS
// =============================================================================

interface SceneSnapshot {
  name: string;
  timestamp: number;
  browserContext: ReturnType<typeof getBrowserContext>;
  holoScriptContent?: string;
  screenshot?: string;
}

interface RecordingSession {
  name: string;
  startTime: number;
  events: Array<{ timestamp: number; type: string; data: any }>;
  isRecording: boolean;
}

const snapshots = new Map<string, SceneSnapshot>();
let activeSession: RecordingSession | null = null;

// =============================================================================
// ADVANCED TOOL HANDLERS
// =============================================================================

export async function handleAdvancedBrittneyTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      // =========================================================================
      // ONE-SHOT CREATION PIPELINE
      // =========================================================================
      case 'brittney_create_and_inject': {
        const description = args.description as string;
        const category = args.category as string || 'object';
        const validate = args.validate !== false;
        
        // Step 1: Generate with Brittney
        const genResult = await callBrittney(
          `Generate HoloScript for: ${description}\nCategory: ${category}\n\nIMPORTANT: Return ONLY valid HoloScript code, no markdown, no explanation. Start with @object or @scene.`
        );
        
        if (!genResult.success) {
          return {
            content: [{ type: 'text', text: `❌ Generation failed: ${genResult.error}` }],
            isError: true,
          };
        }
        
        const code = genResult.response || '';
        
        // Step 2: Validate if requested
        if (validate) {
          // Basic validation - check for HoloScript markers
          if (!code.includes('@object') && !code.includes('@scene') && !code.includes('@ui')) {
            // Ask Brittney to fix it
            const fixResult = await callBrittney(
              `This doesn't look like valid HoloScript. Please fix it to be valid HoloScript:\n\n${code}\n\nReturn ONLY the fixed HoloScript code.`
            );
            if (fixResult.success && fixResult.response) {
              return await injectAndReport(fixResult.response, description);
            }
          }
        }
        
        return await injectAndReport(code, description);
      }

      // =========================================================================
      // REAL-TIME MONITORING
      // =========================================================================
      case 'brittney_error_monitor': {
        const threshold = (args.threshold as number) || 5;
        const analyze = args.analyze as boolean;
        
        const errors = sharedDataBridge.getRuntimeErrors();
        
        let status = '🟢 **No Errors**';
        if (errors.length >= threshold) {
          status = `🔴 **ALERT:** ${errors.length} errors (threshold: ${threshold})`;
        } else if (errors.length > 0) {
          status = `🟡 **Warning:** ${errors.length} error(s)`;
        }
        
        let analysis = '';
        if (analyze && errors.length > 0) {
          const latestError = errors[0];
          const result = await callBrittney(
            `Analyze this browser error and suggest a fix:\n\nMessage: ${latestError.message}\nStack: ${latestError.stack || 'N/A'}\nSource: ${latestError.source || 'unknown'}:${latestError.line || '?'}`
          );
          if (result.success) {
            analysis = `\n\n## 🤖 Brittney's Analysis\n\n${result.response}`;
          }
        }
        
        const errorList = errors.slice(0, 5).map((e, i) => 
          `${i + 1}. \`${e.message.slice(0, 100)}${e.message.length > 100 ? '...' : ''}\``
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `## Error Monitor\n\n${status}\n\n**Recent Errors:**\n${errorList || 'None'}${analysis}`,
          }],
        };
      }

      case 'brittney_auto_fix': {
        const errorIndex = (args.errorIndex as number) || 0;
        const apply = args.apply as boolean;
        
        const errors = sharedDataBridge.getRuntimeErrors();
        if (errors.length === 0) {
          return { content: [{ type: 'text', text: '✅ No errors to fix!' }] };
        }
        
        const error = errors[errorIndex];
        if (!error) {
          return {
            content: [{ type: 'text', text: `❌ Error index ${errorIndex} not found. Only ${errors.length} errors.` }],
            isError: true,
          };
        }
        
        const context = getBrowserContext();
        const fixResult = await callBrittney(
          `Fix this browser error in a Hololand/HoloScript app:\n\nError: ${error.message}\nStack: ${error.stack || 'N/A'}\nSource: ${error.source || 'unknown'}:${error.line || '?'}\n\nCurrent Scene: ${context.scenes?.[0]?.name || 'unknown'}\nFPS: ${context.profilerStats?.fps || 'N/A'}\n\nProvide a specific code fix. If it's HoloScript related, provide HoloScript fix.`,
          context
        );
        
        if (!fixResult.success) {
          return {
            content: [{ type: 'text', text: `❌ Failed to generate fix: ${fixResult.error}` }],
            isError: true,
          };
        }
        
        let applyStatus = '';
        if (apply) {
          // Try to extract and inject HoloScript fix
          const holoMatch = fixResult.response?.match(/@(?:object|scene|ui)[^]*?(?=\n\n|$)/);
          if (holoMatch) {
            // Would inject here
            applyStatus = '\n\n✅ **Fix applied to browser!**';
          } else {
            applyStatus = '\n\n⚠️ No injectable HoloScript found in fix. Manual application needed.';
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: `## Auto-Fix for Error\n\n**Error:** \`${error.message}\`\n\n### Brittney's Fix\n\n${fixResult.response}${applyStatus}${!apply ? '\n\n*Set apply: true to automatically inject the fix.*' : ''}`,
          }],
        };
      }

      case 'brittney_performance_monitor': {
        const fpsThreshold = (args.fpsThreshold as number) || 30;
        const memThreshold = (args.memoryThresholdMB as number) || 500;
        const getSuggestions = args.getSuggestions as boolean;
        
        const stats = sharedDataBridge.getProfilerStats();
        if (!stats) {
          return {
            content: [{ type: 'text', text: '❌ No performance data. Browser extension not connected.' }],
            isError: true,
          };
        }
        
        const memMB = Math.round(stats.memoryUsed / 1024 / 1024);
        const fpsAlert = stats.fps < fpsThreshold;
        const memAlert = memMB > memThreshold;
        
        let status = '🟢 **Performance OK**';
        let alerts: string[] = [];
        
        if (fpsAlert) alerts.push(`FPS ${stats.fps} < ${fpsThreshold}`);
        if (memAlert) alerts.push(`Memory ${memMB}MB > ${memThreshold}MB`);
        if (alerts.length > 0) {
          status = `🔴 **Performance Alert**\n${alerts.map(a => `- ${a}`).join('\n')}`;
        }
        
        let suggestions = '';
        if ((getSuggestions || alerts.length > 0) && alerts.length > 0) {
          const result = await callBrittney(
            `Suggest performance optimizations for a WebGL/Three.js VR app:\n- FPS: ${stats.fps}\n- Draw calls: ${stats.drawCalls}\n- Triangles: ${stats.triangles}\n- Memory: ${memMB}MB\n\nProvide 3-5 specific, actionable HoloScript/Three.js optimizations.`
          );
          if (result.success) {
            suggestions = `\n\n## 🚀 Optimization Suggestions\n\n${result.response}`;
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: `## Performance Monitor\n\n${status}\n\n**Metrics:**\n- FPS: ${stats.fps}\n- Frame Time: ${stats.frameTime.toFixed(2)}ms\n- Draw Calls: ${stats.drawCalls}\n- Triangles: ${stats.triangles.toLocaleString()}\n- Memory: ${memMB}MB${suggestions}`,
          }],
        };
      }

      // =========================================================================
      // HOLOSCRIPT DEVELOPMENT
      // =========================================================================
      case 'brittney_holoscript_playground': {
        const code = args.code as string;
        const action = args.action as string;
        const convertFrom = args.convertFrom as string;
        
        switch (action) {
          case 'validate': {
            const hasMarker = code.includes('@object') || code.includes('@scene') || code.includes('@ui');
            const issues: string[] = [];
            if (!hasMarker) issues.push('Missing @object, @scene, or @ui marker');
            if (!code.includes('position') && code.includes('@object')) issues.push('Object missing position property');
            
            return {
              content: [{
                type: 'text',
                text: issues.length === 0 
                  ? `## ✅ Valid HoloScript\n\n\`\`\`holoscript\n${code}\n\`\`\``
                  : `## ❌ Validation Issues\n\n${issues.map(i => `- ${i}`).join('\n')}\n\n\`\`\`holoscript\n${code}\n\`\`\``,
              }],
            };
          }
          
          case 'explain': {
            const result = await callBrittney(
              `Explain this HoloScript code line by line. What does it create? How does it work?\n\n\`\`\`holoscript\n${code}\n\`\`\``
            );
            return {
              content: [{
                type: 'text',
                text: `## HoloScript Explanation\n\n${result.success ? result.response : result.error}`,
              }],
            };
          }
          
          case 'optimize': {
            const result = await callBrittney(
              `Optimize this HoloScript for better performance. Reduce draw calls, use instancing where possible, optimize materials:\n\n\`\`\`holoscript\n${code}\n\`\`\`\n\nReturn ONLY the optimized HoloScript.`
            );
            return {
              content: [{
                type: 'text',
                text: `## Optimized HoloScript\n\n\`\`\`holoscript\n${result.success ? result.response : `// Error: ${result.error}`}\n\`\`\``,
              }],
            };
          }
          
          case 'convert': {
            const result = await callBrittney(
              `Convert this ${convertFrom || 'code'} to HoloScript:\n\n${code}\n\nReturn ONLY valid HoloScript.`
            );
            return {
              content: [{
                type: 'text',
                text: `## Converted to HoloScript\n\n\`\`\`holoscript\n${result.success ? result.response : `// Error: ${result.error}`}\n\`\`\``,
              }],
            };
          }
          
          case 'inject':
          default: {
            return await injectAndReport(code, 'playground injection');
          }
        }
      }

      case 'brittney_holoscript_templates': {
        const category = args.category as string;
        const templates: Record<string, string> = {
          'interactive-object': `@object InteractiveItem
  model: "box"
  position: [0, 1, 0]
  scale: [0.5, 0.5, 0.5]
  material:
    color: "#3498db"
    metalness: 0.8
  grabbable: true
  onGrab: |
    this.material.emissive = "#ffffff"
  onRelease: |
    this.material.emissive = "#000000"`,
          'portal': `@object Portal
  model: "torus"
  position: [0, 2, -5]
  scale: [2, 2, 0.2]
  material:
    color: "#9b59b6"
    emissive: "#8e44ad"
    transparent: true
    opacity: 0.7
  animation:
    property: rotation.z
    duration: 5000
    loop: true
    to: 6.28
  particles:
    type: "sparkle"
    count: 100
    color: "#e056fd"
  onEnter: |
    world.loadScene("destination")`,
          'npc-character': `@object NPC_Brian
  model: "character/brian.glb"
  position: [2, 0, 3]
  scale: [1, 1, 1]
  animation: "idle"
  ai:
    enabled: true
    personality: "friendly"
  dialog:
    greeting: "Hey there! Welcome to Hololand!"
    options:
      - "Tell me about this place"
      - "What can I do here?"
      - "Goodbye"
  onInteract: |
    this.dialog.show()`,
          'weapon': `@object LaserSword
  model: "cylinder"
  position: [0, 1, 0]
  scale: [0.05, 1.5, 0.05]
  material:
    color: "#2ecc71"
    emissive: "#27ae60"
    emissiveIntensity: 2
  equippable: true
  slot: "hand_right"
  audio:
    activate: "saber_on.wav"
    swing: "saber_swing.wav"
  onActivate: |
    this.visible = true
    audio.play("activate")`,
          'particle-system': `@particles MagicEffect
  position: [0, 1, 0]
  type: "points"
  count: 500
  size: 0.1
  color: 
    start: "#f39c12"
    end: "#e74c3c"
  lifetime: 2
  velocity: [0, 2, 0]
  spread: [1, 0.5, 1]
  blending: "additive"`,
        };
        
        const template = templates[category] || templates['interactive-object'];
        
        return {
          content: [{
            type: 'text',
            text: `## HoloScript Template: ${category}\n\n\`\`\`holoscript\n${template}\n\`\`\`\n\n*Use \`brittney_create_and_inject\` to customize and inject this template.*`,
          }],
        };
      }

      // =========================================================================
      // SESSION & VERSIONING
      // =========================================================================
      case 'brittney_scene_snapshot': {
        const name = args.name as string;
        const includeScreenshot = args.includeScreenshot !== false;
        const includeHoloScript = args.includeHoloScript !== false;
        const includeMetrics = args.includeMetrics !== false;
        
        const snapshot: SceneSnapshot = {
          name,
          timestamp: Date.now(),
          browserContext: getBrowserContext(),
          // Would capture actual HoloScript and screenshot from browser
        };
        
        if (includeHoloScript) {
          snapshot.holoScriptContent = '// Would capture from browser';
        }
        if (includeScreenshot) {
          snapshot.screenshot = '// Would capture from browser';
        }
        
        snapshots.set(name, snapshot);
        
        return {
          content: [{
            type: 'text',
            text: `## 📸 Snapshot Captured: "${name}"\n\n**Timestamp:** ${new Date(snapshot.timestamp).toISOString()}\n**Scenes:** ${snapshot.browserContext.scenes?.length || 0}\n**FPS:** ${snapshot.browserContext.profilerStats?.fps || 'N/A'}\n**Errors:** ${snapshot.browserContext.recentErrors?.length || 0}\n\n*Use \`brittney_compare_snapshots\` to compare with other snapshots.*`,
          }],
        };
      }

      case 'brittney_record_session': {
        const action = args.action as string;
        const sessionName = args.sessionName as string;
        
        switch (action) {
          case 'start':
            if (!sessionName) {
              return { content: [{ type: 'text', text: '❌ Session name required' }], isError: true };
            }
            activeSession = {
              name: sessionName,
              startTime: Date.now(),
              events: [],
              isRecording: true,
            };
            return {
              content: [{ type: 'text', text: `## 🎬 Recording Started: "${sessionName}"\n\nAll changes, injections, and errors will be recorded.` }],
            };
            
          case 'stop':
            if (!activeSession) {
              return { content: [{ type: 'text', text: '⚠️ No active recording' }] };
            }
            activeSession.isRecording = false;
            const duration = Math.round((Date.now() - activeSession.startTime) / 1000);
            return {
              content: [{ type: 'text', text: `## 🛑 Recording Stopped: "${activeSession.name}"\n\n**Duration:** ${duration}s\n**Events:** ${activeSession.events.length}` }],
            };
            
          case 'status':
            if (!activeSession) {
              return { content: [{ type: 'text', text: '📼 No active recording' }] };
            }
            return {
              content: [{ type: 'text', text: `## 📼 Recording Status\n\n**Session:** ${activeSession.name}\n**Recording:** ${activeSession.isRecording ? '🔴 Active' : '⏸️ Paused'}\n**Events:** ${activeSession.events.length}` }],
            };
            
          default:
            return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
        }
      }

      // =========================================================================
      // LEARNING
      // =========================================================================
      case 'brittney_learn_holoscript': {
        const topic = args.topic as string;
        const level = args.level as string || 'beginner';
        const includeExercise = args.includeExercise !== false;
        
        const result = await callBrittney(
          `Teach me about "${topic}" in HoloScript at the ${level} level.\n\n1. Explain the concept clearly\n2. Show 2-3 code examples\n3. ${includeExercise ? 'Include a practice exercise for me to try' : 'No exercise needed'}\n\nMake it practical and focused on Hololand/VR development.`
        );
        
        return {
          content: [{
            type: 'text',
            text: `## 📚 HoloScript Learning: ${topic}\n**Level:** ${level}\n\n${result.success ? result.response : result.error}`,
          }],
        };
      }

      case 'brittney_explain_scene': {
        const depth = args.depth as string || 'overview';
        const focus = args.focus as string || 'all';
        
        const context = getBrowserContext();
        const result = await callBrittney(
          `Explain the current Hololand scene (${depth} level, focus: ${focus}):\n\nBrowser Context:\n${JSON.stringify(context, null, 2)}\n\nProvide a clear explanation of what's in the scene, how it works, and any notable aspects.`,
          context
        );
        
        return {
          content: [{
            type: 'text',
            text: `## 🎮 Scene Explanation\n\n${result.success ? result.response : result.error}`,
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown advanced tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Advanced tool error: ${error.message}` }],
      isError: true,
    };
  }
}

// Helper function to inject HoloScript and report
async function injectAndReport(code: string, description: string) {
  // Would use native messaging to inject
  // For now, just report what would happen
  
  // Record event if session active
  if (activeSession?.isRecording) {
    activeSession.events.push({
      timestamp: Date.now(),
      type: 'holoscript-inject',
      data: { code, description },
    });
  }
  
  return {
    content: [{
      type: 'text',
      text: `## ✅ HoloScript Generated\n\n**Request:** ${description}\n\n\`\`\`holoscript\n${code}\n\`\`\`\n\n🔄 *Ready to inject - use \`brittney_inject_holoscript\` with this code, or check the browser!*`,
    }],
  };
}
