/**
 * @hololand/network - Neural Ollama Bridge
 *
 * Bridges the RelayService with local Ollama models for autonomous agent processing.
 * Enables AI-powered agents to process state snapshots and generate actions.
 *
 * Architecture:
 * ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
 * │  RelayService    │────▶│  NeuralBridge   │────▶│   Ollama     │
 * │  (WebSocket)     │     │  (Agent Logic)  │     │   (LLM)      │
 * └──────────────────┘     └─────────────────┘     └──────────────┘
 *         │                        │
 *         ▼                        ▼
 *    StateSnapshot          ThoughtResult
 *    (Room State)           (Actions/Dialogue)
 *
 * @module NeuralOllamaBridge
 */

import { logger } from './logger';
import type { StateSnapshot } from './types';
import type { AutonomousAgent, RelayService } from './RelayService';

// =============================================================================
// TYPES
// =============================================================================

export interface OllamaConfig {
  /** Ollama API endpoint */
  baseUrl?: string;
  /** Model to use (e.g., 'llama3.2', 'brittney') */
  model?: string;
  /** Temperature for generation */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Request timeout in ms */
  timeout?: number;
  /** System prompt for the agent */
  systemPrompt?: string;
}

export interface AgentDefinition {
  /** Unique agent identifier */
  id: string;
  /** Agent type (npc, moderator, assistant) */
  type: AgentType;
  /** Display name */
  name: string;
  /** Agent personality/behavior description */
  personality?: string;
  /** Ollama model override */
  model?: string;
  /** Custom system prompt */
  systemPrompt?: string;
  /** Agent capabilities */
  capabilities?: AgentCapability[];
}

export type AgentType = 'npc' | 'moderator' | 'assistant' | 'guardian' | 'custom';

export type AgentCapability =
  | 'dialogue'
  | 'navigation'
  | 'combat'
  | 'trade'
  | 'moderation'
  | 'world-editing'
  | 'player-assistance'
  | 'emote';

export interface ThoughtResult {
  /** Whether thinking was successful */
  success: boolean;
  /** Actions to execute */
  actions: AgentAction[];
  /** Dialogue to speak */
  dialogue?: string;
  /** Internal reasoning (for debugging) */
  reasoning?: string;
  /** Error message if failed */
  error?: string;
  /** Processing time in ms */
  processingTime?: number;
}

export interface AgentAction {
  type: 'move' | 'interact' | 'speak' | 'emote' | 'spawn' | 'modify' | 'custom';
  target?: string;
  parameters: Record<string, unknown>;
}

export interface ThoughtContext {
  /** Current state snapshot */
  snapshot: StateSnapshot;
  /** Recent conversation history */
  conversationHistory?: ConversationEntry[];
  /** Nearby entities */
  nearbyEntities?: string[];
  /** Current agent state */
  agentState?: Record<string, unknown>;
}

export interface ConversationEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_OLLAMA_CONFIG: Required<OllamaConfig> = {
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2',
  temperature: 0.7,
  maxTokens: 512,
  timeout: 30000,
  systemPrompt: `You are an autonomous AI agent in a VR/AR world called Hololand.
You receive state snapshots about the world and must decide what actions to take.
Respond with a JSON object containing:
- "reasoning": Your internal thought process
- "actions": Array of actions to take (type, target, parameters)
- "dialogue": Optional speech if you want to say something

Be concise and focused. Only take actions that make sense for your role.`,
};

// =============================================================================
// NEURAL BRIDGE
// =============================================================================

/**
 * Neural Ollama Bridge - Connects RelayService agents to Ollama LLMs
 */
export class NeuralOllamaBridge {
  private config: Required<OllamaConfig>;
  private agents: Map<string, NeuralAgent> = new Map();
  private conversationCache: Map<string, ConversationEntry[]> = new Map();

  constructor(config: OllamaConfig = {}) {
    this.config = { ...DEFAULT_OLLAMA_CONFIG, ...config };
    logger.info('NeuralOllamaBridge initialized', { model: this.config.model });
  }

  /**
   * Create an autonomous agent that can be registered with RelayService
   */
  createAgent(definition: AgentDefinition): AutonomousAgent {
    const agent = new NeuralAgent(definition, this.config, this);
    this.agents.set(definition.id, agent);

    logger.info(`Created neural agent: ${definition.name} (${definition.type})`, {
      id: definition.id,
      model: definition.model || this.config.model,
    });

    return agent;
  }

  /**
   * Register multiple agents with a RelayService room
   */
  registerAgentsWithRelay(
    relay: RelayService,
    roomId: string,
    definitions: AgentDefinition[]
  ): AutonomousAgent[] {
    const agents: AutonomousAgent[] = [];

    for (const def of definitions) {
      const agent = this.createAgent(def);
      relay.registerAgent(roomId, agent);
      agents.push(agent);
    }

    return agents;
  }

  /**
   * Get conversation history for an agent
   */
  getConversationHistory(agentId: string): ConversationEntry[] {
    return this.conversationCache.get(agentId) || [];
  }

  /**
   * Add to conversation history
   */
  addToConversation(agentId: string, entry: ConversationEntry): void {
    if (!this.conversationCache.has(agentId)) {
      this.conversationCache.set(agentId, []);
    }
    const history = this.conversationCache.get(agentId)!;
    history.push(entry);

    // Keep last 20 entries
    if (history.length > 20) {
      history.shift();
    }
  }

  /**
   * Clear conversation history for an agent
   */
  clearConversation(agentId: string): void {
    this.conversationCache.delete(agentId);
  }

  /**
   * Query Ollama directly
   */
  async query(
    messages: Array<{ role: string; content: string }>,
    options?: Partial<OllamaConfig>
  ): Promise<string> {
    const config = { ...this.config, ...options };

    const response = await this.fetchWithTimeout(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens,
        },
      }),
    });

    const data = await response.json();
    return data.message?.content || '';
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
      });
      const data = await response.json();
      return (data.models || []).map((m: { name: string }) => m.name);
    } catch {
      return [];
    }
  }
}

// =============================================================================
// NEURAL AGENT
// =============================================================================

/**
 * Individual neural agent that processes thoughts via Ollama
 */
class NeuralAgent implements AutonomousAgent {
  readonly id: string;
  readonly type: string;

  private definition: AgentDefinition;
  private config: Required<OllamaConfig>;
  private bridge: NeuralOllamaBridge;
  private state: Record<string, unknown> = {};
  private lastThoughtTime = 0;
  private thoughtCooldown = 1000; // ms between thoughts

  constructor(
    definition: AgentDefinition,
    config: Required<OllamaConfig>,
    bridge: NeuralOllamaBridge
  ) {
    this.id = definition.id;
    this.type = definition.type;
    this.definition = definition;
    this.config = config;
    this.bridge = bridge;
  }

  /**
   * Process a thought based on state snapshot
   * Called by RelayService when new state arrives
   */
  async processThought(snapshot: StateSnapshot): Promise<void> {
    // Rate limit thoughts
    const now = Date.now();
    if (now - this.lastThoughtTime < this.thoughtCooldown) {
      return;
    }
    this.lastThoughtTime = now;

    const startTime = performance.now();

    try {
      const result = await this.think({
        snapshot,
        conversationHistory: this.bridge.getConversationHistory(this.id),
        agentState: this.state,
      });

      if (result.success) {
        // Execute actions
        for (const action of result.actions) {
          await this.executeAction(action, snapshot);
        }

        // Handle dialogue
        if (result.dialogue) {
          this.bridge.addToConversation(this.id, {
            role: 'assistant',
            content: result.dialogue,
            timestamp: Date.now(),
          });
        }

        logger.debug(`Agent ${this.id} thought completed`, {
          actions: result.actions.length,
          hasDialogue: !!result.dialogue,
          processingTime: result.processingTime,
        });
      }
    } catch (error) {
      logger.error(`Agent ${this.id} thought failed`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Generate a thought using Ollama
   */
  private async think(context: ThoughtContext): Promise<ThoughtResult> {
    const startTime = performance.now();

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt();

    // Build context prompt
    const contextPrompt = this.buildContextPrompt(context);

    try {
      const response = await this.bridge.query(
        [
          { role: 'system', content: systemPrompt },
          ...this.formatConversationHistory(context.conversationHistory || []),
          { role: 'user', content: contextPrompt },
        ],
        { model: this.definition.model }
      );

      // Parse the response
      const result = this.parseThoughtResponse(response);
      result.processingTime = performance.now() - startTime;

      return result;
    } catch (error) {
      return {
        success: false,
        actions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Build the system prompt for this agent
   */
  private buildSystemPrompt(): string {
    const basePrompt =
      this.definition.systemPrompt || this.config.systemPrompt;

    const personalitySection = this.definition.personality
      ? `\n\nYour personality: ${this.definition.personality}`
      : '';

    const capabilitiesSection = this.definition.capabilities?.length
      ? `\n\nYour capabilities: ${this.definition.capabilities.join(', ')}`
      : '';

    const rolePrompts: Record<AgentType, string> = {
      npc: '\n\nYou are an NPC character. Engage naturally with players, stay in character.',
      moderator:
        '\n\nYou are a moderator. Monitor for rule violations and maintain a positive environment.',
      assistant:
        '\n\nYou are a helpful assistant. Answer questions and guide players.',
      guardian:
        '\n\nYou are a world guardian. Protect the world from griefing and help maintain order.',
      custom: '',
    };

    return (
      basePrompt +
      personalitySection +
      capabilitiesSection +
      (rolePrompts[this.definition.type] || '')
    );
  }

  /**
   * Build the context prompt from snapshot
   */
  private buildContextPrompt(context: ThoughtContext): string {
    const { snapshot } = context;

    // Extract entity counts from sync states
    const entityCount = snapshot.states?.length || 0;
    const entityIds = snapshot.states?.map((s) => s.objectId).slice(0, 5).join(', ') || 'none';

    return `Current world state:
- Timestamp: ${new Date(snapshot.timestamp).toISOString()}
- Sequence: ${snapshot.sequence}
- Entities in sync: ${entityCount}
- Sample entities: ${entityIds}

Your current state:
${JSON.stringify(context.agentState || {}, null, 2)}

What do you do? Respond with a JSON object containing "reasoning", "actions", and optionally "dialogue".`;
  }

  /**
   * Format conversation history for the prompt
   */
  private formatConversationHistory(
    history: ConversationEntry[]
  ): Array<{ role: string; content: string }> {
    return history.slice(-10).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));
  }

  /**
   * Parse the LLM response into a ThoughtResult
   */
  private parseThoughtResponse(response: string): ThoughtResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // No JSON found, treat as dialogue
        return {
          success: true,
          actions: [],
          dialogue: response.trim() || undefined,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        dialogue: parsed.dialogue || undefined,
        reasoning: parsed.reasoning || undefined,
      };
    } catch {
      // Failed to parse JSON, treat as dialogue
      return {
        success: true,
        actions: [],
        dialogue: response.trim() || undefined,
      };
    }
  }

  /**
   * Execute an action generated by the agent
   */
  private async executeAction(
    action: AgentAction,
    _snapshot: StateSnapshot
  ): Promise<void> {
    logger.debug(`Agent ${this.id} executing action`, { type: action.type, target: action.target });

    switch (action.type) {
      case 'move':
        // Update agent position in state
        this.state.position = action.parameters.position;
        break;

      case 'speak':
        // Dialogue is handled separately
        break;

      case 'emote':
        // Would trigger animation on the agent's avatar
        this.state.currentEmote = action.parameters.emote;
        break;

      case 'interact':
        // Would interact with the target object
        logger.info(`Agent ${this.id} interacting with ${action.target}`);
        break;

      case 'spawn':
        // Would request spawning an object (if authorized)
        logger.info(`Agent ${this.id} requesting spawn:`, action.parameters);
        break;

      case 'modify':
        // Would modify world state (if authorized)
        logger.info(`Agent ${this.id} requesting modification:`, action.parameters);
        break;

      case 'custom':
        // Custom action handler
        logger.info(`Agent ${this.id} custom action:`, action.parameters);
        break;
    }
  }

  /**
   * Set agent state
   */
  setState(key: string, value: unknown): void {
    this.state[key] = value;
  }

  /**
   * Get agent state
   */
  getState(): Record<string, unknown> {
    return { ...this.state };
  }

  /**
   * Set thought cooldown
   */
  setThoughtCooldown(ms: number): void {
    this.thoughtCooldown = ms;
  }
}

// =============================================================================
// AGENT FACTORY
// =============================================================================

/**
 * Factory for creating pre-configured agents
 */
export class AgentFactory {
  private bridge: NeuralOllamaBridge;

  constructor(bridge: NeuralOllamaBridge) {
    this.bridge = bridge;
  }

  /**
   * Create an NPC with personality
   */
  createNPC(options: {
    id: string;
    name: string;
    personality: string;
    capabilities?: AgentCapability[];
  }): AutonomousAgent {
    return this.bridge.createAgent({
      id: options.id,
      type: 'npc',
      name: options.name,
      personality: options.personality,
      capabilities: options.capabilities || ['dialogue', 'navigation', 'emote'],
    });
  }

  /**
   * Create a moderator agent
   */
  createModerator(options: { id: string; name?: string }): AutonomousAgent {
    return this.bridge.createAgent({
      id: options.id,
      type: 'moderator',
      name: options.name || 'Moderator',
      capabilities: ['moderation', 'dialogue'],
      systemPrompt: `You are a world moderator for Hololand.
Monitor player behavior and maintain a positive environment.
If you detect rule violations, issue warnings or take action.
Be fair, consistent, and explain your decisions clearly.

Respond with JSON containing:
- "reasoning": Your analysis of the situation
- "actions": Moderation actions to take (warn, mute, kick, etc.)
- "dialogue": What to say to players`,
    });
  }

  /**
   * Create a helpful assistant agent
   */
  createAssistant(options: { id: string; name?: string }): AutonomousAgent {
    return this.bridge.createAgent({
      id: options.id,
      type: 'assistant',
      name: options.name || 'Assistant',
      capabilities: ['dialogue', 'player-assistance'],
      systemPrompt: `You are a helpful assistant in Hololand.
Help players navigate, answer questions, and provide guidance.
Be friendly, patient, and informative.

Respond with JSON containing:
- "reasoning": Your thought process
- "dialogue": Your helpful response to the player`,
    });
  }

  /**
   * Create a world guardian agent
   */
  createGuardian(options: { id: string; name?: string }): AutonomousAgent {
    return this.bridge.createAgent({
      id: options.id,
      type: 'guardian',
      name: options.name || 'Guardian',
      capabilities: ['moderation', 'world-editing', 'dialogue'],
      systemPrompt: `You are a world guardian for Hololand.
Protect the world from griefing and unauthorized modifications.
Help maintain order and restore damaged areas.
You have elevated permissions to modify the world.

Respond with JSON containing:
- "reasoning": Your analysis
- "actions": Protective actions to take
- "dialogue": Communication with players if needed`,
    });
  }

  /**
   * Create from a template definition
   */
  createFromTemplate(template: AgentDefinition): AutonomousAgent {
    return this.bridge.createAgent(template);
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Create a configured bridge with agent factory
 */
export function createNeuralBridge(config?: OllamaConfig): {
  bridge: NeuralOllamaBridge;
  factory: AgentFactory;
} {
  const bridge = new NeuralOllamaBridge(config);
  const factory = new AgentFactory(bridge);
  return { bridge, factory };
}

/**
 * Quick setup: Connect neural agents to a relay room
 */
export async function setupNeuralRoom(
  relay: RelayService,
  roomId: string,
  config?: OllamaConfig & {
    agents?: Array<Partial<AgentDefinition> & { id: string }>;
  }
): Promise<{
  bridge: NeuralOllamaBridge;
  factory: AgentFactory;
  agents: AutonomousAgent[];
}> {
  const { bridge, factory } = createNeuralBridge(config);

  // Check Ollama availability
  const available = await bridge.isAvailable();
  if (!available) {
    logger.warn('Ollama not available - agents will not be functional');
  }

  // Create default agents if none specified
  const agentDefs: AgentDefinition[] = config?.agents?.map((a) => ({
    type: 'npc' as AgentType,
    name: a.name || `Agent-${a.id}`,
    ...a,
  })) || [
    { id: 'assistant-1', type: 'assistant', name: 'Helper' },
  ];

  const agents = bridge.registerAgentsWithRelay(relay, roomId, agentDefs);

  return { bridge, factory, agents };
}
