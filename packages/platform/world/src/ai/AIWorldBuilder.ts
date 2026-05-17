/**
 * AI World Builder
 *
 * Uses Claude/Grok API to generate HoloScript from natural language descriptions,
 * then loads it into the Hololand world for VR rendering.
 */

import { createInferenceClient } from '@hololand/inference';
import { parseHoloScriptPlus } from '@holoscript/core';
import type { InferenceClient, ChatMessage } from '@hololand/inference';
import type { HololandWorld } from '../HololandWorld';
import { HoloScriptLoader } from '../utils/HoloScriptLoader';
import { logger } from '../logger';

export interface AIBuilderConfig {
  /** API provider to use: 'anthropic' or 'grok' */
  provider: 'anthropic' | 'grok';

  /** API key for the selected provider */
  apiKey: string;

  /** Model to use (optional, will use provider defaults) */
  model?: string;

  /** Temperature for generation (0-1) */
  temperature?: number;

  /** Max tokens to generate */
  maxTokens?: number;
}

export interface BuildRequest {
  /** Natural language description of what to build */
  prompt: string;

  /** Optional context about existing scene */
  sceneContext?: {
    existingObjects?: string[];
    worldName?: string;
    currentState?: string;
  };

  /** Whether to stream the response */
  stream?: boolean;
}

export interface BuildResult {
  /** Generated HoloScript code */
  holoScript: string;

  /** Parsed AST (if successful) */
  ast?: any;

  /** Parse errors (if any) */
  errors?: string[];

  /** Whether code was successfully loaded into world */
  loaded: boolean;

  /** Model that generated the code */
  model: string;

  /** Generation time in ms */
  generationTimeMs: number;
}

/**
 * AI World Builder
 *
 * Generates HoloScript from natural language and loads it into Hololand
 */
export class AIWorldBuilder {
  private inferenceClient: InferenceClient;
  private config: Required<Omit<AIBuilderConfig, 'model'>>;
  private conversationHistory: ChatMessage[] = [];

  constructor(config: AIBuilderConfig) {
    this.config = {
      provider: config.provider,
      apiKey: config.apiKey,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096,
    };

    // Initialize inference client with selected provider
    this.inferenceClient = createInferenceClient({
      activeProvider: config.provider,
      providers: {
        [config.provider]: {
          type: config.provider,
          apiKey: config.apiKey,
          enabled: true,
          defaultModel: config.model,
        },
      },
    });

    logger.info('[AIWorldBuilder] Initialized with provider', { provider: config.provider });
  }

  /**
   * Initialize the AI client
   */
  async initialize(): Promise<void> {
    await this.inferenceClient.initialize();

    const status = await this.inferenceClient.getStatus();
    logger.info('[AIWorldBuilder] Status', status);

    if (!status.ready) {
      throw new Error(`AI provider ${this.config.provider} not available`);
    }
  }

  /**
   * Generate HoloScript from natural language prompt
   */
  async build(request: BuildRequest): Promise<BuildResult> {
    const startTime = Date.now();

    // Build system prompt with HoloScript context
    const systemPrompt = this.buildSystemPrompt(request.sceneContext);

    // Build conversation
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory,
      { role: 'user', content: request.prompt },
    ];

    logger.info('[AIWorldBuilder] Generating HoloScript', {
      prompt: request.prompt,
      provider: this.config.provider,
    });

    // Generate code using AI
    const response = await this.inferenceClient.chat({
      messages,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    // Extract HoloScript code from response
    const holoScript = this.extractHoloScript(response.content);

    logger.info('[AIWorldBuilder] Generated HoloScript', {
      length: holoScript.length,
      generationTime: Date.now() - startTime,
      model: response.model,
    });

    // Parse the generated HoloScript
    const parseResult = parseHoloScriptPlus(holoScript);

    // Update conversation history (for context in follow-up requests)
    this.conversationHistory.push(
      { role: 'user', content: request.prompt },
      { role: 'assistant', content: response.content }
    );

    return {
      holoScript,
      ast: parseResult.success ? parseResult.ast : undefined,
      errors: parseResult.success ? undefined : parseResult.errors?.map((e) => e.message),
      loaded: parseResult.success,
      model: response.model,
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generate and load HoloScript into a Hololand world
   */
  async buildAndLoad(
    request: BuildRequest,
    world: HololandWorld,
    loader: HoloScriptLoader
  ): Promise<BuildResult> {
    const result = await this.build(request);

    if (result.loaded && result.holoScript) {
      try {
        loader.load(result.holoScript);
        logger.info('[AIWorldBuilder] Loaded HoloScript into world');
      } catch (error: any) {
        logger.error('[AIWorldBuilder] Failed to load HoloScript', { error: error.message });
        result.loaded = false;
        result.errors = result.errors || [];
        result.errors.push(error.message);
      }
    }

    return result;
  }

  /**
   * Stream HoloScript generation
   */
  async *buildStream(request: BuildRequest): AsyncGenerator<{
    chunk: string;
    holoScript: string;
    done: boolean;
  }> {
    const systemPrompt = this.buildSystemPrompt(request.sceneContext);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory,
      { role: 'user', content: request.prompt },
    ];

    let fullContent = '';

    for await (const chunk of this.inferenceClient.chatStream({ messages })) {
      fullContent += chunk.content;

      yield {
        chunk: chunk.content,
        holoScript: this.extractHoloScript(fullContent),
        done: chunk.done,
      };
    }

    // Update conversation history
    this.conversationHistory.push(
      { role: 'user', content: request.prompt },
      { role: 'assistant', content: fullContent }
    );
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    logger.info('[AIWorldBuilder] Cleared conversation history');
  }

  /**
   * Build system prompt with HoloScript context
   */
  private buildSystemPrompt(sceneContext?: BuildRequest['sceneContext']): string {
    let prompt = `You are an expert HoloScript developer building VR worlds for Hololand.

HoloScript is a declarative spatial computing language. Your job is to generate valid HoloScript code based on user descriptions.

# HoloScript Syntax

## Basic Object
\`\`\`holoscript
object "My Object" {
  @spatial @networked
  geometry: "box"
  position: [0, 1, 0]
  scale: [1, 1, 1]
  material: { color: "#FF0000" }
}
\`\`\`

## Composition (Scene)
\`\`\`holoscript
composition "My Scene" {
  object "Ground" {
    @spatial
    geometry: "plane"
    position: [0, 0, 0]
    scale: [10, 1, 10]
  }

  object "Cube" {
    @spatial @physics
    geometry: "box"
    position: [0, 2, 0]
  }
}
\`\`\`

## Traits (Attributes)
- @spatial - Has position in 3D space
- @networked - Synced across network
- @physics - Has physics simulation
- @controllable - Can be controlled by user
- @emissive - Emits light
- @interactive - Can be interacted with

## Geometries
- "box" - Cube
- "sphere" - Sphere
- "cylinder" - Cylinder
- "plane" - Flat plane
- "capsule" - Capsule shape

## Properties
- position: [x, y, z]
- rotation: [x, y, z] (Euler angles in degrees)
- scale: [x, y, z]
- material: { color, metalness, roughness, emissive }

## State & Bindings
\`\`\`holoscript
composition "Dynamic Scene" {
  state {
    counter: 0
    color: "#FF0000"
  }

  object "Counter" {
    material: { color: bind("state.color") }
  }
}
\`\`\`

# Instructions

1. **Generate ONLY HoloScript code** - No explanations, just code
2. **Wrap code in triple backticks** with \`holoscript\` language identifier
3. **Use proper indentation** - 2 spaces per level
4. **Include appropriate traits** - Think about what makes sense
5. **Use realistic positions** - Consider VR scale (1 unit ≈ 1 meter)
6. **Name objects descriptively** - Clear, readable names`;

    if (sceneContext) {
      prompt += `\n\n# Current Scene Context\n`;

      if (sceneContext.worldName) {
        prompt += `World: ${sceneContext.worldName}\n`;
      }

      if (sceneContext.existingObjects?.length) {
        prompt += `\nExisting objects:\n${sceneContext.existingObjects.map((o) => `- ${o}`).join('\n')}\n`;
      }

      if (sceneContext.currentState) {
        prompt += `\nCurrent state: ${sceneContext.currentState}\n`;
      }
    }

    return prompt;
  }

  /**
   * Extract HoloScript code from AI response
   */
  private extractHoloScript(content: string): string {
    // Look for code blocks
    const codeBlockMatch = content.match(/```holoscript\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Look for generic code blocks
    const genericCodeMatch = content.match(/```\n([\s\S]*?)```/);
    if (genericCodeMatch) {
      return genericCodeMatch[1].trim();
    }

    // Return as-is if no code blocks found
    return content.trim();
  }
}
