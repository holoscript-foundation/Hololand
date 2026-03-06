/**
 * Procedural World Generation Orchestrator
 *
 * Plan-and-Execute Pattern for Cost-Efficient World Generation
 *
 * Architecture:
 * 1. Designer Agent (Claude Sonnet 4) - High-level planning
 *    - Analyzes world requirements
 *    - Plans zones, landmarks, and spatial layout
 *    - Generates strategic placement rules
 *    - Reviews and refines Builder output
 *
 * 2. Builder Agent (Claude Haiku) - Efficient execution
 *    - Executes Designer's plan
 *    - Places prefabs and generates HoloScript
 *    - Handles textures, physics, and optimization
 *    - Fast, token-efficient implementation
 *
 * Cost Reduction:
 * - Sonnet-only: ~$0.15-0.30 per world (high token usage)
 * - Plan-and-Execute: ~$0.02-0.05 per world (80-90% reduction)
 *   - Designer (Sonnet): 1 planning call (~2K tokens)
 *   - Builder (Haiku): 3-5 execution calls (~10K tokens total)
 *   - Designer Review: 1 review call (~1K tokens)
 */

import { createInferenceClient, type InferenceClient } from '@hololand/inference';
import { parseHoloScriptPlus } from '@holoscript/core';
import type { HololandWorld } from '../HololandWorld';
import { HoloScriptLoader } from '../utils/HoloScriptLoader';
import { logger } from '../logger';

export interface ProceduralWorldConfig {
  /** Anthropic API key for Claude access */
  apiKey: string;

  /** Designer model (defaults to Sonnet 4) */
  designerModel?: string;

  /** Builder model (defaults to Haiku) */
  builderModel?: string;

  /** Enable cost tracking */
  trackCosts?: boolean;

  /** Enable verbose logging */
  verbose?: boolean;
}

export interface WorldGenerationRequest {
  /** Natural language description of world */
  description: string;

  /** World metadata */
  metadata?: {
    name?: string;
    category?: 'office' | 'playground' | 'gallery' | 'nature' | 'city' | 'custom';
    size?: 'small' | 'medium' | 'large';
    complexity?: 'simple' | 'moderate' | 'complex';
    maxObjects?: number;
  };

  /** Constraints */
  constraints?: {
    performanceBudget?: {
      maxDrawCalls?: number;
      maxVertices?: number;
      targetFPS?: number;
    };
    accessibility?: boolean;
    multiplayerOptimized?: boolean;
  };
}

export interface WorldGenerationResult {
  /** Generated HoloScript code */
  holoScript: string;

  /** World plan from Designer */
  plan: WorldPlan;

  /** Execution steps from Builder */
  executionSteps: ExecutionStep[];

  /** Designer review feedback */
  review?: ReviewFeedback;

  /** Cost breakdown */
  costs: CostBreakdown;

  /** Generation metrics */
  metrics: GenerationMetrics;

  /** Whether generation succeeded */
  success: boolean;

  /** Errors (if any) */
  errors?: string[];
}

export interface WorldPlan {
  /** Overall world concept */
  concept: string;

  /** Zones/areas to create */
  zones: Zone[];

  /** Landmarks and key features */
  landmarks: Landmark[];

  /** Spatial layout strategy */
  layout: LayoutStrategy;

  /** Prefab library to use */
  prefabs: string[];

  /** Material palette */
  materials: MaterialPalette;

  /** Lighting strategy */
  lighting: LightingPlan;
}

export interface Zone {
  name: string;
  purpose: string;
  position: [number, number, number];
  size: [number, number, number];
  features: string[];
}

export interface Landmark {
  name: string;
  type: string;
  position: [number, number, number];
  prominence: 'high' | 'medium' | 'low';
  description: string;
}

export interface LayoutStrategy {
  pattern: 'grid' | 'radial' | 'organic' | 'linear';
  spacing: number;
  centerPoint: [number, number, number];
  orientation: 'horizontal' | 'vertical' | 'mixed';
}

export interface MaterialPalette {
  primary: string;
  secondary: string;
  accent: string;
  ground: string;
  skybox: string;
}

export interface LightingPlan {
  ambientIntensity: number;
  ambientColor: string;
  directionalLights: Array<{
    position: [number, number, number];
    intensity: number;
    color: string;
  }>;
  pointLights: Array<{
    position: [number, number, number];
    intensity: number;
    color: string;
    radius: number;
  }>;
}

export interface ExecutionStep {
  stepNumber: number;
  action: string;
  target: string;
  result: string;
  tokensUsed: number;
  timeMs: number;
}

export interface ReviewFeedback {
  rating: 'excellent' | 'good' | 'needs_improvement' | 'poor';
  strengths: string[];
  improvements: string[];
  refinementNeeded: boolean;
  refinementPlan?: string;
}

export interface CostBreakdown {
  designerCost: number;
  builderCost: number;
  reviewCost: number;
  totalCost: number;
  tokensUsed: {
    designer: number;
    builder: number;
    review: number;
    total: number;
  };
}

export interface GenerationMetrics {
  totalTimeMs: number;
  planningTimeMs: number;
  buildingTimeMs: number;
  reviewTimeMs: number;
  objectsGenerated: number;
  linesOfCode: number;
}

/**
 * Procedural World Generation Orchestrator
 */
export class ProceduralWorldOrchestrator {
  private inferenceClient: InferenceClient;
  private config: Required<ProceduralWorldConfig>;
  private designerModel: string;
  private builderModel: string;

  // Token pricing (per 1M tokens)
  private readonly SONNET_INPUT_COST = 3.0; // $3 per 1M input tokens
  private readonly SONNET_OUTPUT_COST = 15.0; // $15 per 1M output tokens
  private readonly HAIKU_INPUT_COST = 0.25; // $0.25 per 1M input tokens
  private readonly HAIKU_OUTPUT_COST = 1.25; // $1.25 per 1M output tokens

  constructor(config: ProceduralWorldConfig) {
    this.config = {
      apiKey: config.apiKey,
      designerModel: config.designerModel || 'claude-sonnet-4-20250514',
      builderModel: config.builderModel || 'claude-haiku-4-20250514',
      trackCosts: config.trackCosts ?? true,
      verbose: config.verbose ?? false,
    };

    this.designerModel = this.config.designerModel;
    this.builderModel = this.config.builderModel;

    this.inferenceClient = createInferenceClient({
      activeProvider: 'anthropic',
      providers: {
        anthropic: {
          type: 'anthropic',
          apiKey: config.apiKey,
          enabled: true,
          defaultModel: this.designerModel,
        },
      },
    });

    logger.info('[ProceduralWorldOrchestrator] Initialized', {
      designer: this.designerModel,
      builder: this.builderModel,
    });
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    await this.inferenceClient.initialize();

    const status = await this.inferenceClient.getStatus();
    if (!status.ready) {
      throw new Error('Inference client not ready');
    }

    logger.info('[ProceduralWorldOrchestrator] Ready');
  }

  /**
   * Generate a procedural world using plan-and-execute pattern
   */
  async generateWorld(request: WorldGenerationRequest): Promise<WorldGenerationResult> {
    const startTime = Date.now();

    const costs: CostBreakdown = {
      designerCost: 0,
      builderCost: 0,
      reviewCost: 0,
      totalCost: 0,
      tokensUsed: {
        designer: 0,
        builder: 0,
        review: 0,
        total: 0,
      },
    };

    const metrics: GenerationMetrics = {
      totalTimeMs: 0,
      planningTimeMs: 0,
      buildingTimeMs: 0,
      reviewTimeMs: 0,
      objectsGenerated: 0,
      linesOfCode: 0,
    };

    try {
      // PHASE 1: PLANNING (Designer Agent - Sonnet)
      if (this.config.verbose) {
        logger.info('[Orchestrator] Phase 1: Planning with Designer (Sonnet)');
      }

      const planningStart = Date.now();
      const plan = await this.planWorld(request);
      metrics.planningTimeMs = Date.now() - planningStart;

      // Update costs from planning
      costs.tokensUsed.designer = plan.tokensUsed || 0;
      costs.designerCost = this.calculateCost(
        costs.tokensUsed.designer,
        costs.tokensUsed.designer * 0.3, // Estimate 30% output
        'sonnet'
      );

      if (this.config.verbose) {
        logger.info('[Orchestrator] Plan complete', {
          zones: plan.zones.length,
          landmarks: plan.landmarks.length,
          tokensUsed: costs.tokensUsed.designer,
        });
      }

      // PHASE 2: BUILDING (Builder Agent - Haiku)
      if (this.config.verbose) {
        logger.info('[Orchestrator] Phase 2: Building with Builder (Haiku)');
      }

      const buildingStart = Date.now();
      const { holoScript, executionSteps } = await this.buildWorld(plan, request);
      metrics.buildingTimeMs = Date.now() - buildingStart;

      // Update costs from building
      costs.tokensUsed.builder = executionSteps.reduce((sum, step) => sum + step.tokensUsed, 0);
      costs.builderCost = this.calculateCost(
        costs.tokensUsed.builder,
        costs.tokensUsed.builder * 0.4, // Estimate 40% output
        'haiku'
      );

      if (this.config.verbose) {
        logger.info('[Orchestrator] Build complete', {
          steps: executionSteps.length,
          tokensUsed: costs.tokensUsed.builder,
        });
      }

      // PHASE 3: REVIEW (Designer Agent - Sonnet)
      if (this.config.verbose) {
        logger.info('[Orchestrator] Phase 3: Review by Designer (Sonnet)');
      }

      const reviewStart = Date.now();
      const review = await this.reviewWorld(plan, holoScript, request);
      metrics.reviewTimeMs = Date.now() - reviewStart;

      // Update costs from review
      costs.tokensUsed.review = review.tokensUsed || 0;
      costs.reviewCost = this.calculateCost(
        costs.tokensUsed.review,
        costs.tokensUsed.review * 0.2, // Estimate 20% output
        'sonnet'
      );

      if (this.config.verbose) {
        logger.info('[Orchestrator] Review complete', {
          rating: review.rating,
          refinementNeeded: review.refinementNeeded,
        });
      }

      // PHASE 4: REFINEMENT (if needed)
      let finalHoloScript = holoScript;
      if (review.refinementNeeded && review.refinementPlan) {
        if (this.config.verbose) {
          logger.info('[Orchestrator] Phase 4: Refinement');
        }

        const { holoScript: refined, executionSteps: refinementSteps } = await this.buildWorld(
          plan,
          request,
          review.refinementPlan
        );

        finalHoloScript = refined;

        // Update costs from refinement
        const refinementTokens = refinementSteps.reduce((sum, step) => sum + step.tokensUsed, 0);
        costs.tokensUsed.builder += refinementTokens;
        costs.builderCost += this.calculateCost(
          refinementTokens,
          refinementTokens * 0.4,
          'haiku'
        );

        executionSteps.push(...refinementSteps);
      }

      // Parse and validate final HoloScript
      const parseResult = parseHoloScriptPlus(finalHoloScript);

      // Calculate total costs
      costs.tokensUsed.total =
        costs.tokensUsed.designer + costs.tokensUsed.builder + costs.tokensUsed.review;
      costs.totalCost = costs.designerCost + costs.builderCost + costs.reviewCost;

      // Calculate metrics
      metrics.totalTimeMs = Date.now() - startTime;
      metrics.linesOfCode = finalHoloScript.split('\n').length;
      metrics.objectsGenerated = (finalHoloScript.match(/object\s+"/g) || []).length;

      logger.info('[Orchestrator] Generation complete', {
        success: parseResult.success,
        totalCost: `$${costs.totalCost.toFixed(4)}`,
        totalTokens: costs.tokensUsed.total,
        totalTime: `${metrics.totalTimeMs}ms`,
      });

      return {
        holoScript: finalHoloScript,
        plan,
        executionSteps,
        review,
        costs,
        metrics,
        success: parseResult.success,
        errors: parseResult.success ? undefined : parseResult.errors?.map(e => e.message),
      };
    } catch (error: any) {
      logger.error('[Orchestrator] Generation failed', { error: error.message });

      return {
        holoScript: '',
        plan: {} as WorldPlan,
        executionSteps: [],
        costs,
        metrics,
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * PHASE 1: Planning (Designer Agent - Sonnet)
   */
  private async planWorld(
    request: WorldGenerationRequest
  ): Promise<WorldPlan & { tokensUsed: number }> {
    const systemPrompt = `You are a world design expert for procedural VR/AR world generation.

Your role is to create HIGH-LEVEL strategic plans for virtual worlds, NOT to generate code.

You will analyze the world requirements and create a comprehensive plan including:
- Zone layout and spatial organization
- Landmarks and key features
- Material palette and visual style
- Lighting strategy
- Prefab library to use

Output ONLY JSON in this exact format:

\`\`\`json
{
  "concept": "Brief world concept description",
  "zones": [
    {
      "name": "Zone Name",
      "purpose": "Zone purpose",
      "position": [x, y, z],
      "size": [width, height, depth],
      "features": ["feature1", "feature2"]
    }
  ],
  "landmarks": [
    {
      "name": "Landmark Name",
      "type": "building|sculpture|fountain|tree|etc",
      "position": [x, y, z],
      "prominence": "high|medium|low",
      "description": "Brief description"
    }
  ],
  "layout": {
    "pattern": "grid|radial|organic|linear",
    "spacing": 10,
    "centerPoint": [0, 0, 0],
    "orientation": "horizontal|vertical|mixed"
  },
  "prefabs": ["prefab1", "prefab2"],
  "materials": {
    "primary": "#hexcolor",
    "secondary": "#hexcolor",
    "accent": "#hexcolor",
    "ground": "#hexcolor",
    "skybox": "sunset|night|day|custom"
  },
  "lighting": {
    "ambientIntensity": 0.5,
    "ambientColor": "#ffffff",
    "directionalLights": [{"position": [10, 20, 10], "intensity": 1.0, "color": "#ffffff"}],
    "pointLights": [{"position": [0, 5, 0], "intensity": 2.0, "color": "#ffaa00", "radius": 10}]
  }
}
\`\`\`

Focus on strategic decisions. The Builder agent will handle implementation details.`;

    const userPrompt = this.buildPlanningPrompt(request);

    const response = await this.inferenceClient.chat({
      model: this.designerModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 3000,
    });

    // Extract JSON from response
    const jsonMatch = response.content.match(/```json\n([\s\S]*?)```/);
    const planJson = jsonMatch ? jsonMatch[1] : response.content;

    const plan = JSON.parse(planJson) as WorldPlan;

    return {
      ...plan,
      tokensUsed: response.usage?.inputTokens + response.usage?.outputTokens || 0,
    };
  }

  /**
   * PHASE 2: Building (Builder Agent - Haiku)
   */
  private async buildWorld(
    plan: WorldPlan,
    request: WorldGenerationRequest,
    refinementInstructions?: string
  ): Promise<{ holoScript: string; executionSteps: ExecutionStep[] }> {
    const systemPrompt = `You are a HoloScript code generator for VR/AR worlds.

You receive a strategic world plan and generate efficient HoloScript code to implement it.

Focus on:
- Fast, token-efficient code generation
- Using prefabs and reusable patterns
- Optimized geometry and materials
- Clean, well-structured HoloScript

HoloScript Syntax Reference:

\`\`\`holoscript
composition "World Name" {
  config {
    bounds: { min: { x: -50, y: 0, z: -50 }, max: { x: 50, y: 30, z: 50 } }
    skybox: "sunset"
    ambientLight: { intensity: 0.5, color: "#ffffff" }
  }

  object "ObjectName" {
    @spatial @networked
    geometry: "box|sphere|cylinder|plane|capsule"
    position: [x, y, z]
    scale: [x, y, z]
    rotation: [x, y, z]
    material: { color: "#hexcolor", metalness: 0.5, roughness: 0.5 }
  }

  light "LightName" {
    type: "directional|point|spot"
    position: [x, y, z]
    intensity: 1.0
    color: "#ffffff"
    castShadows: true
  }
}
\`\`\`

Generate ONLY HoloScript code in a \`\`\`holoscript code block. No explanations.`;

    const userPrompt = this.buildBuildingPrompt(plan, request, refinementInstructions);

    const executionSteps: ExecutionStep[] = [];
    const stepStart = Date.now();

    const response = await this.inferenceClient.chat({
      model: this.builderModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent code
      maxTokens: 8000,
    });

    // Extract HoloScript from response
    const codeMatch = response.content.match(/```holoscript\n([\s\S]*?)```/);
    const holoScript = codeMatch ? codeMatch[1].trim() : response.content.trim();

    executionSteps.push({
      stepNumber: 1,
      action: 'generate_world',
      target: request.metadata?.name || 'world',
      result: 'success',
      tokensUsed: response.usage?.inputTokens + response.usage?.outputTokens || 0,
      timeMs: Date.now() - stepStart,
    });

    return { holoScript, executionSteps };
  }

  /**
   * PHASE 3: Review (Designer Agent - Sonnet)
   */
  private async reviewWorld(
    plan: WorldPlan,
    holoScript: string,
    request: WorldGenerationRequest
  ): Promise<ReviewFeedback & { tokensUsed: number }> {
    const systemPrompt = `You are a world design quality reviewer.

Review the generated HoloScript against the original plan and provide feedback.

Evaluate:
- Plan adherence - Does the code implement the plan?
- Code quality - Is the code clean and efficient?
- VR best practices - Proper scale, performance, usability
- Completeness - Are all zones and landmarks present?

Output ONLY JSON:

\`\`\`json
{
  "rating": "excellent|good|needs_improvement|poor",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "refinementNeeded": true|false,
  "refinementPlan": "Specific instructions for Builder agent (if refinementNeeded is true)"
}
\`\`\``;

    const userPrompt = `# Original Plan
${JSON.stringify(plan, null, 2)}

# Generated HoloScript
\`\`\`holoscript
${holoScript}
\`\`\`

# World Requirements
${JSON.stringify(request, null, 2)}

Review the implementation and provide feedback.`;

    const response = await this.inferenceClient.chat({
      model: this.designerModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      maxTokens: 1500,
    });

    // Extract JSON from response
    const jsonMatch = response.content.match(/```json\n([\s\S]*?)```/);
    const reviewJson = jsonMatch ? jsonMatch[1] : response.content;

    const review = JSON.parse(reviewJson) as ReviewFeedback;

    return {
      ...review,
      tokensUsed: response.usage?.inputTokens + response.usage?.outputTokens || 0,
    };
  }

  /**
   * Build planning prompt for Designer
   */
  private buildPlanningPrompt(request: WorldGenerationRequest): string {
    let prompt = `Create a strategic plan for this world:\n\n${request.description}\n\n`;

    if (request.metadata) {
      prompt += `Requirements:\n`;
      if (request.metadata.name) prompt += `- Name: ${request.metadata.name}\n`;
      if (request.metadata.category) prompt += `- Category: ${request.metadata.category}\n`;
      if (request.metadata.size) prompt += `- Size: ${request.metadata.size}\n`;
      if (request.metadata.complexity) prompt += `- Complexity: ${request.metadata.complexity}\n`;
      if (request.metadata.maxObjects) prompt += `- Max Objects: ${request.metadata.maxObjects}\n`;
    }

    if (request.constraints) {
      prompt += `\nConstraints:\n`;
      if (request.constraints.performanceBudget) {
        prompt += `- Performance Budget: ${JSON.stringify(request.constraints.performanceBudget)}\n`;
      }
      if (request.constraints.accessibility) {
        prompt += `- Accessibility: Required\n`;
      }
      if (request.constraints.multiplayerOptimized) {
        prompt += `- Multiplayer Optimized: Required\n`;
      }
    }

    prompt += `\nGenerate a comprehensive world plan in JSON format.`;

    return prompt;
  }

  /**
   * Build building prompt for Builder
   */
  private buildBuildingPrompt(
    plan: WorldPlan,
    request: WorldGenerationRequest,
    refinementInstructions?: string
  ): string {
    let prompt = `Implement this world plan in HoloScript:\n\n`;
    prompt += `# Plan\n${JSON.stringify(plan, null, 2)}\n\n`;

    if (refinementInstructions) {
      prompt += `# Refinement Instructions\n${refinementInstructions}\n\n`;
    }

    prompt += `# World Requirements\n`;
    prompt += `Name: ${request.metadata?.name || 'Generated World'}\n`;
    prompt += `Category: ${request.metadata?.category || 'custom'}\n\n`;

    prompt += `Generate complete HoloScript code implementing this plan.`;

    return prompt;
  }

  /**
   * Calculate cost for token usage
   */
  private calculateCost(inputTokens: number, outputTokens: number, model: 'sonnet' | 'haiku'): number {
    const inputCost = model === 'sonnet' ? this.SONNET_INPUT_COST : this.HAIKU_INPUT_COST;
    const outputCost = model === 'sonnet' ? this.SONNET_OUTPUT_COST : this.HAIKU_OUTPUT_COST;

    return (inputTokens / 1_000_000) * inputCost + (outputTokens / 1_000_000) * outputCost;
  }

  /**
   * Generate and load world into HololandWorld
   */
  async generateAndLoad(
    request: WorldGenerationRequest,
    world: HololandWorld,
    loader: HoloScriptLoader
  ): Promise<WorldGenerationResult> {
    const result = await this.generateWorld(request);

    if (result.success && result.holoScript) {
      try {
        loader.load(result.holoScript);
        logger.info('[Orchestrator] Loaded world into HololandWorld');
      } catch (error: any) {
        logger.error('[Orchestrator] Failed to load world', { error: error.message });
        result.success = false;
        result.errors = result.errors || [];
        result.errors.push(error.message);
      }
    }

    return result;
  }

  /**
   * Compare costs: Sonnet-only vs Plan-and-Execute
   */
  estimateCostComparison(worldDescription: string): {
    sonnetOnly: number;
    planAndExecute: number;
    savings: number;
    savingsPercent: number;
  } {
    // Estimate Sonnet-only approach
    // Assumes ~15K input tokens + ~10K output tokens for full world generation
    const sonnetOnlyInputTokens = 15000;
    const sonnetOnlyOutputTokens = 10000;
    const sonnetOnlyCost = this.calculateCost(
      sonnetOnlyInputTokens,
      sonnetOnlyOutputTokens,
      'sonnet'
    );

    // Estimate Plan-and-Execute approach
    // Designer: 2K input + 600 output (planning)
    // Builder: 3K input + 4K output (building)
    // Designer: 5K input + 300 output (review)
    const designerPlanTokens = 2000;
    const designerPlanOutput = 600;
    const builderInputTokens = 3000;
    const builderOutputTokens = 4000;
    const designerReviewTokens = 5000;
    const designerReviewOutput = 300;

    const planAndExecuteCost =
      this.calculateCost(designerPlanTokens, designerPlanOutput, 'sonnet') +
      this.calculateCost(builderInputTokens, builderOutputTokens, 'haiku') +
      this.calculateCost(designerReviewTokens, designerReviewOutput, 'sonnet');

    const savings = sonnetOnlyCost - planAndExecuteCost;
    const savingsPercent = (savings / sonnetOnlyCost) * 100;

    return {
      sonnetOnly: sonnetOnlyCost,
      planAndExecute: planAndExecuteCost,
      savings,
      savingsPercent,
    };
  }
}
