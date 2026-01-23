/**
 * Agent Orchestrator
 *
 * A smart routing layer that uses Brittney as a specialist for Hololand/HoloScript tasks
 * while delegating other tasks to a primary agent (configurable provider).
 *
 * Supports:
 * - Multiple cloud providers (Grok, OpenAI, Anthropic, Azure, Gemini)
 * - Azure AI Foundry fine-tuned models
 * - Foundry Local for offline inference
 * - Intelligent task routing based on content classification
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                     Agent Orchestrator                          │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  User Input → Classifier → Route Decision                      │
 * │                              │                                   │
 * │              ┌───────────────┼───────────────┐                  │
 * │              ▼               ▼               ▼                  │
 * │        ┌─────────┐    ┌───────────┐   ┌──────────┐             │
 * │        │ Azure   │    │  Brittney │   │ Primary  │             │
 * │        │ Foundry │    │  (Grok-3) │   │ (GPT/etc)│             │
 * │        │Fine-tune│    └─────┬─────┘   └────┬─────┘             │
 * │        └────┬────┘          │              │                    │
 * │             └───────────────┼──────────────┘                    │
 * │                             ▼                                   │
 * │                     Combined Response                           │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { BrittneyConfig, CloudProviderType, getApiKeyForProvider, loadConfig } from './config.js';
import { OrchestrationRuntime, createOrchestrationRuntime } from './orchestration/index.js';
import { KnowledgeService, createKnowledgeService } from './knowledge/index.js';

// =============================================================================
// Types
// =============================================================================

export interface OrchestratorConfig {
  /** Primary agent for general tasks (default: grok-4-fast-reasoning) */
  primaryProvider: CloudProviderType;
  primaryModel: string;

  /** Specialist agent (Brittney) for Hololand/HoloScript tasks */
  specialistProvider: CloudProviderType;
  specialistModel: string;

  /** Brittney service endpoint */
  brittneyEndpoint: string;

  /** Enable hybrid mode (orchestrator can use both) */
  hybridMode: boolean;

  /** Classification confidence threshold (0-1) */
  routingThreshold: number;

  /** Azure AI Foundry settings for fine-tuned models */
  azureFoundry?: {
    enabled: boolean;
    endpoint: string;
    deployment: string;
    apiVersion: string;
  };

  /** Foundry Local settings for offline inference */
  foundryLocal?: {
    enabled: boolean;
    endpoint: string;
    modelAlias: string;
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OrchestratorRequest {
  messages: Message[];
  /** Force a specific route */
  forceRoute?: 'primary' | 'specialist' | 'hybrid';
  /** Stream response */
  stream?: boolean;
  /** Additional context */
  context?: {
    currentScene?: string;
    recentErrors?: string[];
    projectType?: string;
  };
}

export interface OrchestratorResponse {
  content: string;
  route: 'primary' | 'specialist' | 'hybrid';
  model: string;
  provider: string;
  reasoning?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type TaskCategory =
  | 'holoscript' // HoloScript code generation/modification
  | 'vr_scene' // VR scene design and layout
  | 'debugging' // Error fixing in Hololand context
  | 'performance' // VR performance optimization
  | 'general_code' // General programming (not HoloScript)
  | 'explanation' // Explaining concepts
  | 'planning' // Architecture and planning
  | 'other'; // Everything else

// =============================================================================
// Classification Keywords
// =============================================================================

const SPECIALIST_KEYWORDS = [
  // HoloScript specific
  'holoscript',
  'holo script',
  '@scene',
  '@object',
  '@ui',
  '@pointable',
  '@grabbable',
  '@physics',
  'holoworld',
  'scene {',

  // Hololand platform
  'hololand',
  'brittney',
  'vr world',
  'ar world',
  'virtual reality',
  'augmented reality',
  'immersive',
  '3d scene',
  'metaverse',

  // VR/AR concepts
  'vr interaction',
  'hand tracking',
  'controller',
  'teleport',
  'locomotion',
  'avatar',
  'spatial audio',
  'portal',

  // 3D primitives and concepts
  'mesh',
  'gltf',
  'glb',
  'fbx',
  'position:',
  'rotation:',
  'scale:',
  'animation',
  'keyframe',
  'easing',
  'tween',

  // Hololand-specific features
  'multiplayer',
  'sync',
  'networked',
  'world builder',
  'creator tools',
  'infinity assistant',
  'brittney ai',
];

const PRIMARY_KEYWORDS = [
  // General programming
  'typescript',
  'javascript',
  'python',
  'react',
  'node',
  'api',
  'database',
  'sql',
  'prisma',
  'rest',
  'graphql',

  // Architecture
  'architecture',
  'design pattern',
  'refactor',
  'optimize',
  'best practice',
  'security',
  'authentication',

  // General AI/reasoning
  'explain',
  'analyze',
  'compare',
  'summarize',
  'research',
  'strategy',
  'plan',
  'roadmap',
];

// =============================================================================
// Orchestrator
// =============================================================================

export class AgentOrchestrator {
  private config: OrchestratorConfig;
  private brittneyConfig: BrittneyConfig | null = null;
  private primaryClient: any = null;
  private runtime: OrchestrationRuntime;
  private knowledge: KnowledgeService;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      primaryProvider: 'grok',
      primaryModel: 'grok-4-fast-reasoning',
      specialistProvider: 'grok',
      specialistModel: 'grok-3',
      brittneyEndpoint: 'http://localhost:11435',
      hybridMode: true,
      routingThreshold: 0.7,
      azureFoundry: {
        enabled: false,
        endpoint: 'https://brittney-resource.services.ai.azure.com',
        deployment: 'brittney-holoscript',
        apiVersion: '2024-10-21',
      },
      foundryLocal: {
        enabled: false,
        endpoint: 'http://localhost:5272',
        modelAlias: 'brittney',
      },
      ...config,
    };

    // Initialize HoloScript+ orchestration runtime for agent observation
    this.runtime = createOrchestrationRuntime();

    // Initialize knowledge service from HoloScript+ files
    this.knowledge = createKnowledgeService();

    // Sync provider states with runtime
    if (this.config.foundryLocal?.enabled) {
      this.runtime.registerProvider({
        id: 'foundry-local',
        name: 'Foundry Local',
        color: '#10b981',
        endpoint: this.config.foundryLocal.endpoint,
        priority: 1,
        enabled: true,
      });
    }
    if (this.config.azureFoundry?.enabled) {
      this.runtime.registerProvider({
        id: 'azure-foundry',
        name: 'Azure AI Foundry',
        color: '#3b82f6',
        endpoint: this.config.azureFoundry.endpoint,
        priority: 2,
        enabled: true,
      });
    }
  }

  async initialize(): Promise<void> {
    this.brittneyConfig = await loadConfig();
    await this.initializePrimaryClient();

    // Load HoloScript+ knowledge base
    try {
      await this.knowledge.load();
      console.log('[Orchestrator] Knowledge base loaded from HoloScript+ files');
    } catch (error) {
      console.warn('[Orchestrator] Failed to load knowledge base:', error);
    }

    console.log('[Orchestrator] Initialized');
    console.log(`  Primary: ${this.config.primaryProvider}/${this.config.primaryModel}`);
    console.log(`  Specialist: Brittney at ${this.config.brittneyEndpoint}`);
    if (this.config.azureFoundry?.enabled) {
      console.log(
        `  Azure Foundry: ${this.config.azureFoundry.endpoint} (${this.config.azureFoundry.deployment})`
      );
    }
    if (this.config.foundryLocal?.enabled) {
      console.log(
        `  Foundry Local: ${this.config.foundryLocal.endpoint} (${this.config.foundryLocal.modelAlias})`
      );
    }
  }

  private async initializePrimaryClient(): Promise<void> {
    if (!this.brittneyConfig) return;

    const apiKey = getApiKeyForProvider(this.brittneyConfig, this.config.primaryProvider);
    if (!apiKey) {
      console.warn(
        `[Orchestrator] No API key for primary provider: ${this.config.primaryProvider}`
      );
      return;
    }

    const { OpenAI } = await import('openai');

    // Map provider to base URL
    const baseURLs: Record<CloudProviderType, string> = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
      azure: this.brittneyConfig.cloudEndpoint || 'https://api.openai.com/v1',
      google: 'https://generativelanguage.googleapis.com/v1beta/openai',
      grok: 'https://api.x.ai/v1',
    };

    this.primaryClient = new OpenAI({
      apiKey,
      baseURL: baseURLs[this.config.primaryProvider],
    });
  }

  /**
   * Classify the task to determine routing
   */
  classifyTask(messages: Message[]): {
    category: TaskCategory;
    confidence: number;
    reasoning: string;
  } {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    const allContent = messages.map((m) => m.content.toLowerCase()).join(' ');

    // Count keyword matches
    let specialistScore = 0;
    let primaryScore = 0;
    const matchedSpecialist: string[] = [];
    const matchedPrimary: string[] = [];

    for (const keyword of SPECIALIST_KEYWORDS) {
      if (allContent.includes(keyword)) {
        specialistScore += keyword.length > 10 ? 2 : 1; // Longer keywords = stronger signal
        matchedSpecialist.push(keyword);
      }
    }

    for (const keyword of PRIMARY_KEYWORDS) {
      if (allContent.includes(keyword)) {
        primaryScore += 1;
        matchedPrimary.push(keyword);
      }
    }

    // Determine category and confidence
    const total = specialistScore + primaryScore || 1;
    const specialistConfidence = specialistScore / total;

    let category: TaskCategory;
    let confidence: number;
    let reasoning: string;

    if (specialistScore > primaryScore && specialistConfidence >= this.config.routingThreshold) {
      // Determine specific specialist category
      if (
        lastMessage.includes('holoscript') ||
        lastMessage.includes('@scene') ||
        lastMessage.includes('@object')
      ) {
        category = 'holoscript';
      } else if (
        lastMessage.includes('error') ||
        lastMessage.includes('fix') ||
        lastMessage.includes('debug')
      ) {
        category = 'debugging';
      } else if (
        lastMessage.includes('performance') ||
        lastMessage.includes('optimize') ||
        lastMessage.includes('fps')
      ) {
        category = 'performance';
      } else if (
        lastMessage.includes('scene') ||
        lastMessage.includes('world') ||
        lastMessage.includes('vr')
      ) {
        category = 'vr_scene';
      } else {
        category = 'holoscript'; // Default specialist category
      }
      confidence = specialistConfidence;
      reasoning = `Specialist route: matched [${matchedSpecialist.slice(0, 5).join(', ')}]`;
    } else if (primaryScore > 0) {
      if (lastMessage.includes('explain') || lastMessage.includes('what is')) {
        category = 'explanation';
      } else if (lastMessage.includes('plan') || lastMessage.includes('architect')) {
        category = 'planning';
      } else {
        category = 'general_code';
      }
      confidence = 1 - specialistConfidence;
      reasoning = `Primary route: matched [${matchedPrimary.slice(0, 5).join(', ')}]`;
    } else {
      category = 'other';
      confidence = 0.5;
      reasoning = 'No strong signals, defaulting to primary agent';
    }

    return { category, confidence, reasoning };
  }

  /**
   * Route request to appropriate agent
   */
  async chat(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const { category, confidence, reasoning } = this.classifyTask(request.messages);

    // Determine route
    let route: 'primary' | 'specialist' | 'hybrid' = 'primary';

    if (request.forceRoute) {
      route = request.forceRoute;
    } else if (['holoscript', 'vr_scene', 'debugging', 'performance'].includes(category)) {
      route = 'specialist';
    } else if (this.config.hybridMode && confidence < this.config.routingThreshold) {
      route = 'hybrid';
    }

    console.log(`[Orchestrator] Task: ${category} (${(confidence * 100).toFixed(0)}%) → ${route}`);

    // Emit events for agent observation via HoloScript+ runtime
    this.runtime.emit('task_classified', {
      category,
      confidence,
      reasoning,
    });
    this.runtime.emit('route_selected', {
      route,
      fallback_chain:
        route === 'specialist'
          ? ['foundry-local', 'azure-foundry', 'brittney-cloud'].filter((p) => {
              if (p === 'foundry-local') return this.config.foundryLocal?.enabled;
              if (p === 'azure-foundry') return this.config.azureFoundry?.enabled;
              return true;
            })
          : [this.config.primaryProvider],
    });

    switch (route) {
      case 'specialist': {
        // Priority: Foundry Local (offline) > Azure Foundry (fine-tuned) > Brittney (cloud)
        if (this.config.foundryLocal?.enabled) {
          this.runtime.emit('provider_attempt', {
            provider: 'foundry-local',
            provider_name: 'Foundry Local',
            provider_color: '#10b981',
          });
          try {
            const result = await this.callFoundryLocal(request, reasoning + ' [Foundry Local]');
            this.runtime.emit('routing_complete', {
              route: 'specialist',
              provider: 'foundry-local',
              success: true,
            });
            return result;
          } catch (error) {
            console.warn('[Orchestrator] Foundry Local failed, falling back:', error);
            this.runtime.emit('provider_fallback', {
              failed_provider: 'foundry-local',
              error: error instanceof Error ? error.message : 'Unknown error',
              next_provider: this.config.azureFoundry?.enabled ? 'azure-foundry' : 'brittney-cloud',
            });
          }
        }
        if (this.config.azureFoundry?.enabled) {
          this.runtime.emit('provider_attempt', {
            provider: 'azure-foundry',
            provider_name: 'Azure AI Foundry',
            provider_color: '#3b82f6',
          });
          try {
            const result = await this.callAzureFoundry(request, reasoning + ' [Azure Foundry]');
            this.runtime.emit('routing_complete', {
              route: 'specialist',
              provider: 'azure-foundry',
              success: true,
            });
            return result;
          } catch (error) {
            console.warn('[Orchestrator] Azure Foundry failed, falling back:', error);
            this.runtime.emit('provider_fallback', {
              failed_provider: 'azure-foundry',
              error: error instanceof Error ? error.message : 'Unknown error',
              next_provider: 'brittney-cloud',
            });
          }
        }
        this.runtime.emit('provider_attempt', {
          provider: 'brittney-cloud',
          provider_name: 'Brittney (Grok-3)',
          provider_color: '#8b5cf6',
        });
        const brittneyResult = await this.callBrittney(request, reasoning);
        this.runtime.emit('routing_complete', {
          route: 'specialist',
          provider: 'brittney-cloud',
          success: true,
        });
        return brittneyResult;
      }

      case 'hybrid':
        return this.callHybrid(request, reasoning);

      case 'primary':
      default:
        return this.callPrimary(request, reasoning);
    }
  }

  /**
   * Call Azure AI Foundry fine-tuned model
   */
  private async callAzureFoundry(
    request: OrchestratorRequest,
    reasoning: string
  ): Promise<OrchestratorResponse> {
    const foundryConfig = this.config.azureFoundry!;
    const apiKey = this.brittneyConfig?.apiKeys?.azure;

    if (!apiKey) {
      throw new Error('Azure API key not configured for Foundry');
    }

    const url = `${foundryConfig.endpoint}/openai/deployments/${foundryConfig.deployment}/chat/completions?api-version=${foundryConfig.apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Foundry error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content || '',
      route: 'specialist',
      model: `azure-foundry/${foundryConfig.deployment}`,
      provider: 'azure-foundry',
      reasoning,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Call Foundry Local for offline inference
   */
  private async callFoundryLocal(
    request: OrchestratorRequest,
    reasoning: string
  ): Promise<OrchestratorResponse> {
    const localConfig = this.config.foundryLocal!;

    const response = await fetch(`${localConfig.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: localConfig.modelAlias,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Foundry Local error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content || '',
      route: 'specialist',
      model: `foundry-local/${localConfig.modelAlias}`,
      provider: 'foundry-local',
      reasoning,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Call Brittney specialist
   */
  private async callBrittney(
    request: OrchestratorRequest,
    reasoning: string
  ): Promise<OrchestratorResponse> {
    // Build RAG context from HoloScript+ knowledge base
    const messagesWithRAG = [...request.messages];
    if (this.knowledge.isLoaded()) {
      const lastUserMessage = request.messages.filter((m) => m.role === 'user').pop();
      if (lastUserMessage) {
        const ragContext = this.knowledge.buildRAGContext(lastUserMessage.content, 3);
        if (ragContext) {
          // Inject RAG context into system message
          const systemIdx = messagesWithRAG.findIndex((m) => m.role === 'system');
          if (systemIdx >= 0) {
            messagesWithRAG[systemIdx] = {
              ...messagesWithRAG[systemIdx],
              content: messagesWithRAG[systemIdx].content + ragContext,
            };
          } else {
            messagesWithRAG.unshift({
              role: 'system',
              content: this.knowledge.buildSystemPrompt('holoscript_generation') + ragContext,
            });
          }
        }
      }
    }

    const response = await fetch(`${this.config.brittneyEndpoint}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesWithRAG,
        preferCloud: true,
        context: request.context,
      }),
    });

    if (!response.ok) {
      throw new Error(`Brittney error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.content,
      route: 'specialist',
      model: data.model,
      provider: data.provider,
      reasoning,
      usage: data.usage,
    };
  }

  /**
   * Call primary agent
   */
  private async callPrimary(
    request: OrchestratorRequest,
    reasoning: string
  ): Promise<OrchestratorResponse> {
    if (!this.primaryClient) {
      // Fall back to Brittney if primary not configured
      console.warn('[Orchestrator] Primary client not available, falling back to Brittney');
      return this.callBrittney(request, reasoning + ' (fallback)');
    }

    const response = await this.primaryClient.chat.completions.create({
      model: this.config.primaryModel,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 4096,
      temperature: 0.7,
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content || '',
      route: 'primary',
      model: response.model,
      provider: this.config.primaryProvider,
      reasoning,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Hybrid: Use primary for reasoning, Brittney for specialist knowledge
   */
  private async callHybrid(
    request: OrchestratorRequest,
    reasoning: string
  ): Promise<OrchestratorResponse> {
    // First, ask primary agent to analyze and potentially break down the task
    const analysisRequest: OrchestratorRequest = {
      messages: [
        {
          role: 'system',
          content: `You are an AI orchestrator. Analyze the user's request and determine:
1. What parts require general reasoning/coding knowledge
2. What parts require specialized Hololand/HoloScript/VR knowledge

For VR/HoloScript parts, indicate [SPECIALIST: description of what Brittney should handle]
For general parts, provide your response directly.

Keep your analysis concise.`,
        },
        ...request.messages,
      ],
    };

    const primaryResponse = await this.callPrimary(analysisRequest, reasoning);

    // Check if specialist assistance is needed
    if (primaryResponse.content.includes('[SPECIALIST:')) {
      // Extract specialist request
      const specialistMatch = primaryResponse.content.match(/\[SPECIALIST:\s*([^\]]+)\]/);
      if (specialistMatch) {
        const specialistTask = specialistMatch[1];

        // Call Brittney for specialist part
        const specialistRequest: OrchestratorRequest = {
          messages: [...request.messages, { role: 'user', content: `Focus on: ${specialistTask}` }],
          context: request.context,
        };

        const specialistResponse = await this.callBrittney(specialistRequest, reasoning);

        // Combine responses
        const combinedContent = primaryResponse.content.replace(
          /\[SPECIALIST:[^\]]+\]/,
          `\n\n**From Brittney (HoloScript Specialist):**\n${specialistResponse.content}`
        );

        return {
          content: combinedContent,
          route: 'hybrid',
          model: `${this.config.primaryModel} + ${specialistResponse.model}`,
          provider: `${this.config.primaryProvider} + ${specialistResponse.provider}`,
          reasoning: `Hybrid: Primary analyzed, Specialist provided VR/HoloScript expertise`,
          usage: {
            promptTokens:
              (primaryResponse.usage?.promptTokens || 0) +
              (specialistResponse.usage?.promptTokens || 0),
            completionTokens:
              (primaryResponse.usage?.completionTokens || 0) +
              (specialistResponse.usage?.completionTokens || 0),
            totalTokens:
              (primaryResponse.usage?.totalTokens || 0) +
              (specialistResponse.usage?.totalTokens || 0),
          },
        };
      }
    }

    // No specialist needed, return primary response
    return {
      ...primaryResponse,
      route: 'hybrid',
      reasoning: 'Hybrid: Primary handled entirely (no specialist knowledge needed)',
    };
  }

  /**
   * Get the HoloScript+ orchestration runtime for agent observation
   * Agents can subscribe to events: task_classified, route_selected,
   * provider_attempt, provider_fallback, routing_complete
   */
  getRuntime(): OrchestrationRuntime {
    return this.runtime;
  }

  /**
   * Get the knowledge service for RAG and prompt building
   */
  getKnowledge(): KnowledgeService {
    return this.knowledge;
  }

  /**
   * Get orchestrator status
   */
  getStatus(): {
    primaryProvider: string;
    primaryModel: string;
    specialistEndpoint: string;
    hybridMode: boolean;
    primaryAvailable: boolean;
    azureFoundryEnabled: boolean;
    azureFoundryDeployment?: string;
    foundryLocalEnabled: boolean;
    foundryLocalEndpoint?: string;
    knowledgeLoaded: boolean;
    knowledgeCategories?: string[];
  } {
    return {
      primaryProvider: this.config.primaryProvider,
      primaryModel: this.config.primaryModel,
      specialistEndpoint: this.config.brittneyEndpoint,
      hybridMode: this.config.hybridMode,
      primaryAvailable: this.primaryClient !== null,
      azureFoundryEnabled: this.config.azureFoundry?.enabled ?? false,
      azureFoundryDeployment: this.config.azureFoundry?.deployment,
      foundryLocalEnabled: this.config.foundryLocal?.enabled ?? false,
      foundryLocalEndpoint: this.config.foundryLocal?.endpoint,
      knowledgeLoaded: this.knowledge.isLoaded(),
      knowledgeCategories: this.knowledge.isLoaded() ? this.knowledge.getCategories() : undefined,
    };
  }
}

// =============================================================================
// Standalone test
// =============================================================================

async function main() {
  const orchestrator = new AgentOrchestrator({
    primaryProvider: 'grok',
    primaryModel: 'grok-4-fast-reasoning', // Use the powerful model for orchestration
    hybridMode: true,
  });

  await orchestrator.initialize();

  console.log('\n=== Orchestrator Status ===');
  console.log(orchestrator.getStatus());

  // Test classification
  const testCases = [
    'Create a HoloScript scene with a spinning cube',
    'Explain how TypeScript generics work',
    'Fix this VR controller error in my scene',
    'Design a REST API for user authentication',
    'Optimize the performance of my Hololand world',
  ];

  console.log('\n=== Classification Tests ===');
  for (const test of testCases) {
    const result = orchestrator.classifyTask([{ role: 'user', content: test }]);
    console.log(
      `"${test.slice(0, 50)}..." → ${result.category} (${(result.confidence * 100).toFixed(0)}%)`
    );
  }

  // Test actual chat
  console.log('\n=== Live Chat Test ===');
  const response = await orchestrator.chat({
    messages: [
      {
        role: 'user',
        content:
          'Create a simple HoloScript scene with a red sphere that plays a sound when touched',
      },
    ],
  });

  console.log(`Route: ${response.route}`);
  console.log(`Model: ${response.model}`);
  console.log(`Provider: ${response.provider}`);
  console.log(`Reasoning: ${response.reasoning}`);
  console.log(`Response:\n${response.content.slice(0, 500)}...`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
