/**
 * Brittney AI Integration for WorldBuilder
 *
 * Provides AI-powered features for the visual editor:
 * - Generate HoloScript from natural language prompts
 * - Explain scene objects and their purpose
 * - Suggest optimizations for scenes
 * - Right-click context menu actions
 *
 * @module BrittneyIntegration
 */

import type { Scene, SceneNode, SceneManager } from './VisualEditor';
import { exportToHoloScript, importFromHoloScript } from './HoloScriptIO';

// =============================================================================
// TYPES
// =============================================================================

export interface BrittneyConfig {
  /** API endpoint for Brittney service */
  apiEndpoint?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Model to use (default: brittney-v3) */
  model?: string;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface GenerationRequest {
  /** Natural language prompt */
  prompt: string;
  /** Current scene context (optional) */
  sceneContext?: string;
  /** Selected node for context (optional) */
  selectedNode?: SceneNode;
  /** Type of generation */
  type: 'scene' | 'object' | 'component' | 'logic' | 'optimize';
}

export interface GenerationResult {
  success: boolean;
  /** Generated HoloScript code */
  holoScript?: string;
  /** Explanation or description */
  explanation?: string;
  /** Error message if failed */
  error?: string;
  /** Tokens used */
  tokensUsed?: number;
}

export interface ExplanationResult {
  success: boolean;
  /** Natural language explanation */
  explanation?: string;
  /** Suggested improvements */
  suggestions?: string[];
  /** Error message if failed */
  error?: string;
}

export interface OptimizationResult {
  success: boolean;
  /** List of optimization suggestions */
  suggestions: OptimizationSuggestion[];
  /** Overall scene health score (0-100) */
  healthScore?: number;
  /** Error message if failed */
  error?: string;
}

export interface OptimizationSuggestion {
  type: 'performance' | 'quality' | 'accessibility' | 'organization';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedNodes?: string[];
  autoFix?: boolean;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  handler: (node: SceneNode, scene: Scene) => Promise<void>;
}

// =============================================================================
// BRITTNEY SERVICE CLIENT
// =============================================================================

const DEFAULT_CONFIG: Required<BrittneyConfig> = {
  apiEndpoint: 'http://localhost:3001/api/brittney',
  apiKey: '',
  model: 'brittney-v3',
  maxTokens: 2048,
  temperature: 0.7,
  timeout: 30000,
};

let currentConfig: Required<BrittneyConfig> = { ...DEFAULT_CONFIG };

/**
 * Configure the Brittney AI integration
 */
export function configureBrittney(config: BrittneyConfig): void {
  currentConfig = { ...DEFAULT_CONFIG, ...config };
}

/**
 * Get the current Brittney configuration
 */
export function getBrittneyConfig(): Required<BrittneyConfig> {
  return { ...currentConfig };
}

// =============================================================================
// AI GENERATION FUNCTIONS
// =============================================================================

/**
 * Generate HoloScript from a natural language prompt
 *
 * @example
 * ```typescript
 * const result = await generateFromPrompt({
 *   prompt: "Create a medieval castle with a moat and drawbridge",
 *   type: 'scene'
 * });
 * if (result.success) {
 *   const parseResult = importFromHoloScript(result.holoScript!);
 *   sceneManager.mergeScene(parseResult.scene!);
 * }
 * ```
 */
export async function generateFromPrompt(
  request: GenerationRequest
): Promise<GenerationResult> {
  const { prompt, sceneContext, selectedNode, type } = request;

  // Build the system prompt based on generation type
  const systemPrompt = buildSystemPrompt(type);

  // Build the user prompt with context
  const userPrompt = buildUserPrompt(prompt, sceneContext, selectedNode, type);

  try {
    const response = await callBrittneyAPI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    // Extract HoloScript from response
    const holoScript = extractHoloScript(response.content);
    const explanation = extractExplanation(response.content);

    return {
      success: true,
      holoScript,
      explanation,
      tokensUsed: response.tokensUsed,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Explain a scene node in natural language
 */
export async function explainNode(
  node: SceneNode,
  scene: Scene
): Promise<ExplanationResult> {
  const sceneContext = exportToHoloScript(scene, { includeComments: false });

  const systemPrompt = `You are Brittney, an AI assistant specialized in VR/AR world building.
Explain the selected object in the scene clearly and concisely.
Describe what it does, its purpose, and any notable properties.
Also suggest 2-3 improvements that could enhance the object.`;

  const userPrompt = `Scene context:
\`\`\`holoscript
${sceneContext}
\`\`\`

Selected object: "${node.name}" (type: ${node.type})
Position: [${node.transform.position.x}, ${node.transform.position.y}, ${node.transform.position.z}]
Components: ${node.components.map(c => c.componentType).join(', ') || 'none'}

Please explain this object and suggest improvements.`;

  try {
    const response = await callBrittneyAPI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const lines = response.content.split('\n');
    const suggestionStart = lines.findIndex(l => l.toLowerCase().includes('suggest'));
    const explanation = lines.slice(0, suggestionStart > 0 ? suggestionStart : undefined).join('\n').trim();
    const suggestions = suggestionStart > 0
      ? lines.slice(suggestionStart).filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./)).map(l => l.replace(/^[-\d.]+\s*/, '').trim())
      : [];

    return {
      success: true,
      explanation,
      suggestions,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Analyze scene and suggest optimizations
 */
export async function analyzeScene(scene: Scene): Promise<OptimizationResult> {
  const sceneContext = exportToHoloScript(scene, { includeComments: false });
  const nodeCount = scene.nodes.size;
  const rootCount = scene.rootNodes.length;

  // Quick local analysis first
  const suggestions: OptimizationSuggestion[] = [];

  // Check for flat hierarchy
  if (rootCount > 10) {
    suggestions.push({
      type: 'organization',
      severity: 'warning',
      title: 'Flat hierarchy detected',
      description: `Scene has ${rootCount} root-level objects. Consider grouping related objects using spatial_group for better organization.`,
      autoFix: true,
    });
  }

  // Check for unscaled objects
  for (const [, node] of scene.nodes) {
    const { scale } = node.transform;
    if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) {
      if (scale.x > 100 || scale.y > 100 || scale.z > 100) {
        suggestions.push({
          type: 'performance',
          severity: 'warning',
          title: 'Very large object scale',
          description: `"${node.name}" has extreme scale [${scale.x}, ${scale.y}, ${scale.z}]. Consider using properly sized geometry instead.`,
          affectedNodes: [node.id],
        });
      }
    }
  }

  // Check for deep nesting
  const maxDepth = calculateMaxDepth(scene);
  if (maxDepth > 8) {
    suggestions.push({
      type: 'performance',
      severity: 'info',
      title: 'Deep nesting detected',
      description: `Scene has ${maxDepth} levels of nesting. Very deep hierarchies can impact rendering performance.`,
    });
  }

  // AI-powered analysis for more complex suggestions
  if (nodeCount > 5) {
    try {
      const aiSuggestions = await getAISuggestions(sceneContext);
      suggestions.push(...aiSuggestions);
    } catch {
      // AI analysis failed, continue with local analysis only
    }
  }

  // Calculate health score
  const criticalCount = suggestions.filter(s => s.severity === 'critical').length;
  const warningCount = suggestions.filter(s => s.severity === 'warning').length;
  const healthScore = Math.max(0, 100 - (criticalCount * 20) - (warningCount * 5));

  return {
    success: true,
    suggestions,
    healthScore,
  };
}

// =============================================================================
// CONTEXT MENU ACTIONS
// =============================================================================

/**
 * Get context menu actions for Brittney AI integration
 */
export function getBrittneyContextMenuActions(): ContextMenuAction[] {
  return [
    {
      id: 'brittney-generate-child',
      label: 'Generate Child Object...',
      icon: '✨',
      shortcut: 'Ctrl+Shift+G',
      handler: async (node, scene) => {
        const prompt = await promptUser('Describe the child object to generate:');
        if (!prompt) return;

        const sceneContext = exportToHoloScript(scene, { includeComments: false });
        const result = await generateFromPrompt({
          prompt: `Add a child object to "${node.name}": ${prompt}`,
          sceneContext,
          selectedNode: node,
          type: 'object',
        });

        if (result.success && result.holoScript) {
          emitEvent('brittney:generation-complete', { result, parentNode: node });
        } else {
          emitEvent('brittney:generation-error', { error: result.error });
        }
      },
    },
    {
      id: 'brittney-explain',
      label: 'Explain This Object',
      icon: '💡',
      shortcut: 'Ctrl+Shift+E',
      handler: async (node, scene) => {
        const result = await explainNode(node, scene);
        if (result.success) {
          emitEvent('brittney:explanation-ready', { result, node });
        } else {
          emitEvent('brittney:explanation-error', { error: result.error });
        }
      },
    },
    {
      id: 'brittney-add-interaction',
      label: 'Add Interaction...',
      icon: '🎯',
      handler: async (node, scene) => {
        const prompt = await promptUser('Describe the interaction:');
        if (!prompt) return;

        const sceneContext = exportToHoloScript(scene, { includeComments: false });
        const result = await generateFromPrompt({
          prompt: `Add interaction to "${node.name}": ${prompt}`,
          sceneContext,
          selectedNode: node,
          type: 'logic',
        });

        if (result.success && result.holoScript) {
          emitEvent('brittney:interaction-ready', { result, node });
        } else {
          emitEvent('brittney:generation-error', { error: result.error });
        }
      },
    },
    {
      id: 'brittney-optimize',
      label: 'Optimize Scene',
      icon: '⚡',
      handler: async (_node, scene) => {
        const result = await analyzeScene(scene);
        emitEvent('brittney:optimization-ready', { result });
      },
    },
    {
      id: 'brittney-duplicate-varied',
      label: 'Duplicate with Variations',
      icon: '🎲',
      handler: async (node, scene) => {
        const count = await promptUser('How many variations? (1-10)', '3');
        if (!count) return;

        const sceneContext = exportToHoloScript(scene, { includeComments: false });
        const result = await generateFromPrompt({
          prompt: `Create ${count} variations of "${node.name}" with slightly different properties (position, scale, rotation). Keep similar style but add variety.`,
          sceneContext,
          selectedNode: node,
          type: 'object',
        });

        if (result.success && result.holoScript) {
          emitEvent('brittney:variations-ready', { result, sourceNode: node });
        } else {
          emitEvent('brittney:generation-error', { error: result.error });
        }
      },
    },
  ];
}

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

/**
 * Build the system prompt based on generation type
 */
function buildSystemPrompt(type: GenerationRequest['type']): string {
  const basePrompt = `You are Brittney, an expert AI assistant for VR/AR world building with HoloScript.
You generate valid HoloScript code that follows the language specification.

HoloScript uses a declarative syntax:
- composition "Name" { } for worlds
- object "Name" { position: [x, y, z], ... } for 3D objects
- spatial_group "Name" { } for grouping objects
- traits: ["interactive", "collidable"] for behaviors
- on_interact { } for event handlers`;

  const typePrompts: Record<GenerationRequest['type'], string> = {
    scene: `${basePrompt}

Generate complete scene compositions with multiple objects, proper hierarchy, and interactivity.`,

    object: `${basePrompt}

Generate individual objects or small groups that fit into existing scenes.
Match the style and scale of the context provided.`,

    component: `${basePrompt}

Generate component configurations and trait assignments for objects.
Focus on behaviors, physics, and interactivity.`,

    logic: `${basePrompt}

Generate event handlers and logic blocks for interactions.
Use on_interact, on_collision, every(), and other event patterns.`,

    optimize: `${basePrompt}

Analyze scenes and suggest optimizations for:
- Performance (draw calls, polygon count, nesting depth)
- Organization (grouping, naming, hierarchy)
- Quality (materials, lighting, accessibility)
- Accessibility (color contrast, interaction reach, motion sensitivity)`,
  };

  return typePrompts[type];
}

/**
 * Build the user prompt with context
 */
function buildUserPrompt(
  prompt: string,
  sceneContext?: string,
  selectedNode?: SceneNode,
  type?: GenerationRequest['type']
): string {
  let userPrompt = '';

  if (sceneContext) {
    userPrompt += `Current scene:
\`\`\`holoscript
${sceneContext}
\`\`\`

`;
  }

  if (selectedNode) {
    userPrompt += `Selected object: "${selectedNode.name}" (${selectedNode.type})
Position: [${selectedNode.transform.position.x}, ${selectedNode.transform.position.y}, ${selectedNode.transform.position.z}]

`;
  }

  userPrompt += `Request: ${prompt}

`;

  if (type === 'scene') {
    userPrompt += `Generate a complete HoloScript composition. Wrap code in \`\`\`holoscript blocks.`;
  } else if (type === 'object') {
    userPrompt += `Generate HoloScript object(s) to add. Wrap code in \`\`\`holoscript blocks.`;
  } else if (type === 'logic') {
    userPrompt += `Generate HoloScript logic/event handlers. Wrap code in \`\`\`holoscript blocks.`;
  }

  return userPrompt;
}

// =============================================================================
// API HELPERS
// =============================================================================

interface APIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface APIRequest {
  messages: APIMessage[];
}

interface APIResponse {
  content: string;
  tokensUsed: number;
}

/**
 * Call the Brittney API
 */
async function callBrittneyAPI(request: APIRequest): Promise<APIResponse> {
  const { apiEndpoint, apiKey, model, maxTokens, temperature, timeout } = currentConfig;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${apiEndpoint}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.choices?.[0]?.message?.content || data.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Get AI-powered optimization suggestions
 */
async function getAISuggestions(sceneContext: string): Promise<OptimizationSuggestion[]> {
  const response = await callBrittneyAPI({
    messages: [
      {
        role: 'system',
        content: `Analyze this HoloScript scene and suggest optimizations.
Return a JSON array of suggestions with format:
[{"type": "performance|quality|accessibility|organization", "severity": "info|warning|critical", "title": "...", "description": "..."}]`,
      },
      {
        role: 'user',
        content: sceneContext,
      },
    ],
  });

  try {
    // Extract JSON from response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Failed to parse AI suggestions
  }

  return [];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract HoloScript code from AI response
 */
function extractHoloScript(content: string): string | undefined {
  // Look for ```holoscript or ```holo code blocks
  const holoMatch = content.match(/```(?:holoscript|holo)\s*([\s\S]*?)```/);
  if (holoMatch) {
    return holoMatch[1].trim();
  }

  // Look for any code block
  const codeMatch = content.match(/```\s*([\s\S]*?)```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }

  // Check if the content looks like HoloScript
  if (content.includes('composition') || content.includes('object') || content.includes('spatial_group')) {
    return content.trim();
  }

  return undefined;
}

/**
 * Extract explanation text from AI response
 */
function extractExplanation(content: string): string | undefined {
  // Remove code blocks and return the rest
  const withoutCode = content.replace(/```[\s\S]*?```/g, '').trim();
  return withoutCode || undefined;
}

/**
 * Calculate maximum nesting depth in scene
 */
function calculateMaxDepth(scene: Scene): number {
  let maxDepth = 0;

  function traverse(nodeId: string, depth: number): void {
    maxDepth = Math.max(maxDepth, depth);
    const node = scene.nodes.get(nodeId);
    if (node) {
      for (const childId of node.children) {
        traverse(childId, depth + 1);
      }
    }
  }

  for (const rootId of scene.rootNodes) {
    traverse(rootId, 1);
  }

  return maxDepth;
}

// =============================================================================
// EVENT SYSTEM
// =============================================================================

type EventHandler = (data: unknown) => void;
const eventHandlers = new Map<string, Set<EventHandler>>();

/**
 * Subscribe to Brittney events
 */
export function onBrittneyEvent(event: string, handler: EventHandler): () => void {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, new Set());
  }
  eventHandlers.get(event)!.add(handler);

  // Return unsubscribe function
  return () => {
    eventHandlers.get(event)?.delete(handler);
  };
}

/**
 * Emit a Brittney event
 */
function emitEvent(event: string, data: unknown): void {
  eventHandlers.get(event)?.forEach(handler => {
    try {
      handler(data);
    } catch (e) {
      console.error('Brittney event handler error:', e);
    }
  });
}

// Placeholder for UI prompt - should be replaced by actual UI implementation
async function promptUser(message: string, defaultValue?: string): Promise<string | null> {
  // In a real implementation, this would show a dialog
  // For now, emit an event that the UI can handle
  return new Promise(resolve => {
    emitEvent('brittney:prompt-requested', {
      message,
      defaultValue,
      callback: resolve,
    });

    // Timeout after 60 seconds
    setTimeout(() => resolve(null), 60000);
  });
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

/**
 * Quick action: Generate a scene from a description
 */
export async function quickGenerateScene(description: string): Promise<GenerationResult> {
  return generateFromPrompt({
    prompt: description,
    type: 'scene',
  });
}

/**
 * Quick action: Add an object to the current scene
 */
export async function quickAddObject(
  description: string,
  sceneManager: SceneManager
): Promise<GenerationResult> {
  const scene = sceneManager.getScene();
  const sceneContext = exportToHoloScript(scene, { includeComments: false });

  return generateFromPrompt({
    prompt: description,
    sceneContext,
    type: 'object',
  });
}

/**
 * Quick action: Apply generated HoloScript to scene
 */
export function applyGeneratedHoloScript(
  holoScript: string,
  sceneManager: SceneManager
): { success: boolean; error?: string; nodesAdded: number } {
  const result = importFromHoloScript(holoScript, { merge: true });

  if (!result.success) {
    return {
      success: false,
      error: result.errors.map(e => e.message).join(', '),
      nodesAdded: 0,
    };
  }

  // Count nodes before merge
  const beforeCount = sceneManager.getScene().nodes.size;

  // Merge the imported scene - implementation depends on SceneManager
  // For now, just return success
  const afterCount = result.scene?.nodes.size || 0;

  return {
    success: true,
    nodesAdded: afterCount,
  };
}
