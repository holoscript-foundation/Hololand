/**
 * @hololand/backend — TrainingMonkeyBridge
 *
 * Bridge between the Hololand fine-tuning pipeline and TrainingMonkey's
 * MCP server. Calls TrainingMonkey tools (generate_dynamic_training,
 * validate_training_data, audit_training_data) to generate and validate
 * training examples remotely.
 *
 * In production, connects to TrainingMonkey via HTTP endpoint.
 * In test/dev, can use in-process mock responses.
 *
 * Usage:
 *   const bridge = new TrainingMonkeyBridge({ endpoint: 'http://localhost:5567' });
 *   const examples = await bridge.generateTraining({ count: 100, domain: 'holoscript' });
 *   const validation = await bridge.validateExamples(examples);
 */

import type { TrainingExample } from './BrittneyFineTuneService';

// ============================================================================
// Types
// ============================================================================

export interface BridgeConfig {
  /** TrainingMonkey MCP endpoint (via orchestrator). Default: http://localhost:5567 */
  endpoint?: string;
  /** API key for authentication. */
  apiKey?: string;
  /** Server name in mesh. Default: 'training-monkey-mcp' */
  serverName?: string;
  /** Request timeout in ms. Default: 30000 */
  timeoutMs?: number;
  /** Use mock mode for testing. Default: false */
  mockMode?: boolean;
}

export interface GenerateRequest {
  /** Number of examples to generate. */
  count: number;
  /** Domain: 'holoscript' | 'uaa2' | 'hololand' | 'dynamic'. Default: 'dynamic' */
  domain?: string;
  /** Difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'. */
  difficulty?: string;
  /** Category filter. */
  category?: string;
  /** Specific template types to use. */
  templateTypes?: string[];
  /** Scene pool for dynamic generation. */
  scenePool?: string;
  /** Run audit on generated data. Default: true */
  audit?: boolean;
}

export interface ValidateRequest {
  /** Examples to validate. */
  examples: TrainingExample[];
  /** Check for duplicates. Default: true */
  checkDuplicates?: boolean;
  /** Check quality scores. Default: true */
  checkQuality?: boolean;
}

export interface AuditRequest {
  /** Examples to audit. */
  examples: TrainingExample[];
  /** Max issues per example. Default: 5 */
  maxIssuesPerExample?: number;
  /** Severity filter. */
  severityFilter?: 'info' | 'warning' | 'error' | 'critical';
}

export interface BridgeCallResult {
  success: boolean;
  tool: string;
  data?: unknown;
  error?: string;
  traceId?: string;
  latencyMs: number;
}

export interface GenerateResult {
  examples: TrainingExample[];
  stats: {
    requested: number;
    generated: number;
    auditPassed: number;
    auditFailed: number;
  };
}

export interface ValidateResult {
  valid: boolean;
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  duplicateCount: number;
  issues: Array<{
    exampleId: string;
    field: string;
    message: string;
    severity: string;
  }>;
}

export interface AuditResult {
  totalAudited: number;
  passed: number;
  failed: number;
  issues: Array<{
    exampleIndex: number;
    issueType: string;
    message: string;
    severity: string;
  }>;
}

// ============================================================================
// V2.0 Pipeline Tool Types
// ============================================================================

export interface PipelineBridgeRequest {
  /** Number of examples to generate. */
  count: number;
  /** Domain: 'holoscript' | 'uaa2' | 'hololand'. */
  domain: string;
  /** Difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'. */
  difficulty?: string;
  /** Category filter. */
  category?: string;
  /** Deduplication mode. Default: true */
  deduplicate?: boolean;
}

export interface PipelineBridgeResult {
  examples: TrainingExample[];
  stats: {
    requested: number;
    generated: number;
    deduped: number;
    byDifficulty: Record<string, number>;
  };
}

export interface QualityAnalysisRequest {
  /** Examples to analyze. */
  examples: TrainingExample[];
  /** Domain for domain-specific checks. */
  domain?: string;
}

export interface QualityAnalysisResult {
  overallScore: number;
  totalAnalyzed: number;
  distributions: {
    difficulty: Record<string, number>;
    category: Record<string, number>;
    quality: { high: number; medium: number; low: number };
  };
  issues: Array<{ type: string; message: string; count: number }>;
  recommendations: string[];
}

export interface CoverageGapRequest {
  /** Examples to analyze for coverage. */
  examples: TrainingExample[];
  /** Domain to check. */
  domain?: string;
  /** Minimum category count before considered a gap. */
  minimumCount?: number;
}

export interface CoverageGapResult {
  totalGaps: number;
  gaps: Array<{
    type: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    suggestedCount: number;
  }>;
  coverage: {
    categories: number;
    difficulties: number;
    estimatedCompleteness: number;
  };
  generationTasks: Array<{ domain: string; category: string; difficulty: string; count: number }>;
}

export interface RLHFPairRequest {
  /** Good examples to create RLHF pairs from. */
  examples: TrainingExample[];
  /** Number of rejection variants per example. Default: 2 */
  rejectionsPerExample?: number;
  /** Rejection strategies to use. */
  strategies?: string[];
}

export interface RLHFPairResult {
  pairs: Array<{
    chosen: { instruction: string; output: string };
    rejected: { instruction: string; output: string; strategy: string };
  }>;
  stats: {
    totalPairs: number;
    byStrategy: Record<string, number>;
  };
}

export interface ConversationRequest {
  /** Domain for conversation generation. */
  domain: string;
  /** Number of conversations. */
  count: number;
  /** Min turns per conversation. Default: 2 */
  minTurns?: number;
  /** Max turns per conversation. Default: 6 */
  maxTurns?: number;
}

export interface ConversationResult {
  conversations: Array<{
    id: string;
    domain: string;
    turns: Array<{ role: 'user' | 'assistant'; content: string }>;
  }>;
  stats: {
    totalConversations: number;
    totalTurns: number;
    avgTurns: number;
  };
}

export interface HoloScriptValidationRequest {
  /** Examples containing HoloScript in their output field. */
  examples: TrainingExample[];
  /** Check traits validity. Default: true */
  checkTraits?: boolean;
  /** Check geometry types. Default: true */
  checkGeometry?: boolean;
}

export interface HoloScriptValidationResult {
  totalChecked: number;
  passed: number;
  failed: number;
  issues: Array<{
    exampleIndex: number;
    issueType: string;
    message: string;
    severity: string;
  }>;
  summary: {
    traitErrors: number;
    syntaxErrors: number;
    geometryErrors: number;
  };
}

// ============================================================================
// TrainingMonkeyBridge
// ============================================================================

export class TrainingMonkeyBridge {
  private config: Required<BridgeConfig>;

  constructor(config: BridgeConfig = {}) {
    this.config = {
      endpoint: config.endpoint ?? 'http://localhost:5567',
      apiKey: config.apiKey ?? 'dev-key-12345',
      serverName: config.serverName ?? 'training-monkey-mcp',
      timeoutMs: config.timeoutMs ?? 30000,
      mockMode: config.mockMode ?? false,
    };
  }

  // --------------------------------------------------------------------------
  // Training Generation
  // --------------------------------------------------------------------------

  /**
   * Generate training examples via TrainingMonkey.
   * Selects the appropriate generator tool based on domain.
   */
  async generateTraining(request: GenerateRequest): Promise<GenerateResult> {
    const { count, domain = 'dynamic', difficulty, category, templateTypes, scenePool, audit = true } = request;

    let toolName: string;
    let args: Record<string, unknown>;

    switch (domain) {
      case 'holoscript':
        toolName = 'generate_holoscript_training';
        args = { category: category ?? 'syntax', difficulty: difficulty ?? 'intermediate', count, trait_focus: [], target_platform: 'web' };
        break;
      case 'uaa2':
        toolName = 'generate_uaa2_training';
        args = { category: category ?? 'phase_execution', difficulty: difficulty ?? 'intermediate', count };
        break;
      case 'hololand':
        toolName = 'generate_hololand_training';
        args = { category: category ?? 'scene_composition', difficulty: difficulty ?? 'intermediate', count, framework: 'threejs', include_best_practices: true };
        break;
      case 'dynamic':
      default:
        toolName = 'generate_dynamic_training';
        args = { count, difficulty: difficulty ?? 'intermediate', scene_pool: scenePool ?? 'mixed', template_types: templateTypes ?? [], audit };
        break;
    }

    const result = await this.callTool(toolName, args);

    if (!result.success) {
      return {
        examples: [],
        stats: { requested: count, generated: 0, auditPassed: 0, auditFailed: 0 },
      };
    }

    const data = result.data as Record<string, unknown>;
    const examples = this.convertToTrainingExamples(data);

    return {
      examples,
      stats: {
        requested: count,
        generated: examples.length,
        auditPassed: (data.audit_passed as number) ?? examples.length,
        auditFailed: (data.audit_failed as number) ?? 0,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  /**
   * Validate training examples via TrainingMonkey's validator.
   */
  async validateExamples(request: ValidateRequest): Promise<ValidateResult> {
    const result = await this.callTool('validate_training_data', {
      examples: request.examples.map(ex => ({
        instruction: ex.instruction,
        input: ex.input ?? '',
        output: ex.output,
        system: ex.system ?? '',
      })),
      format: 'alpaca',
      check_duplicates: request.checkDuplicates ?? true,
      check_quality: request.checkQuality ?? true,
    });

    if (!result.success) {
      return {
        valid: false,
        totalChecked: request.examples.length,
        passedCount: 0,
        failedCount: request.examples.length,
        duplicateCount: 0,
        issues: [{ exampleId: '*', field: 'validation', message: result.error || 'Validation failed', severity: 'error' }],
      };
    }

    const data = result.data as Record<string, unknown>;
    return {
      valid: (data.valid as boolean) ?? false,
      totalChecked: (data.total_checked as number) ?? request.examples.length,
      passedCount: (data.passed as number) ?? 0,
      failedCount: (data.failed as number) ?? 0,
      duplicateCount: (data.duplicates as number) ?? 0,
      issues: (data.issues as ValidateResult['issues']) ?? [],
    };
  }

  // --------------------------------------------------------------------------
  // Audit
  // --------------------------------------------------------------------------

  /**
   * Run a quality audit on training examples via TrainingMonkey.
   */
  async auditExamples(request: AuditRequest): Promise<AuditResult> {
    const result = await this.callTool('audit_training_data', {
      examples: request.examples.map(ex => ({
        instruction: ex.instruction,
        input: ex.input ?? '',
        output: ex.output,
      })),
      max_issues_per_example: request.maxIssuesPerExample ?? 5,
      severity_filter: request.severityFilter,
    });

    if (!result.success) {
      return {
        totalAudited: request.examples.length,
        passed: 0,
        failed: request.examples.length,
        issues: [{ exampleIndex: -1, issueType: 'audit_error', message: result.error || 'Audit failed', severity: 'error' }],
      };
    }

    const data = result.data as Record<string, unknown>;
    return {
      totalAudited: (data.total_audited as number) ?? request.examples.length,
      passed: (data.passed as number) ?? 0,
      failed: (data.failed as number) ?? 0,
      issues: (data.issues as AuditResult['issues']) ?? [],
    };
  }

  // --------------------------------------------------------------------------
  // Health & Info
  // --------------------------------------------------------------------------

  /**
   * Check if TrainingMonkey MCP server is reachable.
   */
  async healthCheck(): Promise<{ healthy: boolean; info?: Record<string, unknown>; error?: string }> {
    const result = await this.callTool('mcp_get_health', {});
    return {
      healthy: result.success,
      info: result.data as Record<string, unknown>,
      error: result.error,
    };
  }

  /**
   * Get TrainingMonkey server capabilities.
   */
  async getCapabilities(): Promise<BridgeCallResult> {
    return this.callTool('mcp_get_capabilities', {});
  }

  // --------------------------------------------------------------------------
  // V2.0 Pipeline Tools
  // --------------------------------------------------------------------------

  /**
   * Bridge to dedicated pipeline generators with deduplication.
   * Calls the `bridge_to_pipeline` tool.
   */
  async bridgeToPipeline(request: PipelineBridgeRequest): Promise<PipelineBridgeResult> {
    const result = await this.callTool('bridge_to_pipeline', {
      count: request.count,
      domain: request.domain,
      difficulty: request.difficulty ?? 'intermediate',
      category: request.category,
      deduplicate: request.deduplicate ?? true,
    });

    if (!result.success) {
      return {
        examples: [],
        stats: { requested: request.count, generated: 0, deduped: 0, byDifficulty: {} },
      };
    }

    const data = result.data as Record<string, unknown>;
    return {
      examples: this.convertToTrainingExamples(data),
      stats: {
        requested: request.count,
        generated: (data.generated as number) ?? 0,
        deduped: (data.deduped as number) ?? 0,
        byDifficulty: (data.by_difficulty as Record<string, number>) ?? {},
      },
    };
  }

  /**
   * Analyze quality of training examples.
   * Calls the `analyze_quality` tool.
   */
  async analyzeQuality(request: QualityAnalysisRequest): Promise<QualityAnalysisResult> {
    const result = await this.callTool('analyze_quality', {
      examples: request.examples.map(ex => ({
        instruction: ex.instruction,
        input: ex.input ?? '',
        output: ex.output,
        difficulty: ex.difficulty,
        category: ex.category,
      })),
      domain: request.domain,
    });

    if (!result.success) {
      return {
        overallScore: 0,
        totalAnalyzed: request.examples.length,
        distributions: { difficulty: {}, category: {}, quality: { high: 0, medium: 0, low: 0 } },
        issues: [{ type: 'error', message: result.error || 'Analysis failed', count: 1 }],
        recommendations: [],
      };
    }

    const data = result.data as Record<string, unknown>;
    return {
      overallScore: (data.overall_score as number) ?? 0,
      totalAnalyzed: (data.total_analyzed as number) ?? request.examples.length,
      distributions: (data.distributions as QualityAnalysisResult['distributions']) ?? {
        difficulty: {}, category: {}, quality: { high: 0, medium: 0, low: 0 },
      },
      issues: (data.issues as QualityAnalysisResult['issues']) ?? [],
      recommendations: (data.recommendations as string[]) ?? [],
    };
  }

  /**
   * Analyze coverage gaps to find underrepresented areas.
   * Calls the `analyze_coverage_gaps` tool.
   */
  async analyzeCoverageGaps(request: CoverageGapRequest): Promise<CoverageGapResult> {
    const result = await this.callTool('analyze_coverage_gaps', {
      examples: request.examples.map(ex => ({
        instruction: ex.instruction,
        output: ex.output,
        difficulty: ex.difficulty,
        category: ex.category,
      })),
      domain: request.domain,
      minimum_count: request.minimumCount ?? 5,
    });

    if (!result.success) {
      return {
        totalGaps: 0,
        gaps: [],
        coverage: { categories: 0, difficulties: 0, estimatedCompleteness: 0 },
        generationTasks: [],
      };
    }

    const data = result.data as Record<string, unknown>;
    return {
      totalGaps: (data.total_gaps as number) ?? 0,
      gaps: (data.gaps as CoverageGapResult['gaps']) ?? [],
      coverage: (data.coverage as CoverageGapResult['coverage']) ?? {
        categories: 0, difficulties: 0, estimatedCompleteness: 0,
      },
      generationTasks: (data.generation_tasks as CoverageGapResult['generationTasks']) ?? [],
    };
  }

  /**
   * Generate RLHF preference pairs from good examples.
   * Calls the `generate_rlhf_pairs` tool.
   */
  async generateRLHFPairs(request: RLHFPairRequest): Promise<RLHFPairResult> {
    const result = await this.callTool('generate_rlhf_pairs', {
      examples: request.examples.map(ex => ({
        instruction: ex.instruction,
        output: ex.output,
      })),
      rejections_per_example: request.rejectionsPerExample ?? 2,
      strategies: request.strategies ?? ['incomplete', 'wrong_syntax', 'missing_traits'],
    });

    if (!result.success) {
      return { pairs: [], stats: { totalPairs: 0, byStrategy: {} } };
    }

    const data = result.data as Record<string, unknown>;
    return {
      pairs: (data.pairs as RLHFPairResult['pairs']) ?? [],
      stats: {
        totalPairs: (data.total_pairs as number) ?? 0,
        byStrategy: (data.by_strategy as Record<string, number>) ?? {},
      },
    };
  }

  /**
   * Generate multi-turn ShareGPT-format conversations.
   * Calls the `generate_conversations` tool.
   */
  async generateConversations(request: ConversationRequest): Promise<ConversationResult> {
    const result = await this.callTool('generate_conversations', {
      domain: request.domain,
      count: request.count,
      min_turns: request.minTurns ?? 2,
      max_turns: request.maxTurns ?? 6,
    });

    if (!result.success) {
      return {
        conversations: [],
        stats: { totalConversations: 0, totalTurns: 0, avgTurns: 0 },
      };
    }

    const data = result.data as Record<string, unknown>;
    return {
      conversations: (data.conversations as ConversationResult['conversations']) ?? [],
      stats: {
        totalConversations: (data.total_conversations as number) ?? 0,
        totalTurns: (data.total_turns as number) ?? 0,
        avgTurns: (data.avg_turns as number) ?? 0,
      },
    };
  }

  /**
   * Validate HoloScript syntax in training example outputs.
   * Calls the `validate_holoscript_examples` tool.
   */
  async validateHoloScriptExamples(request: HoloScriptValidationRequest): Promise<HoloScriptValidationResult> {
    const result = await this.callTool('validate_holoscript_examples', {
      examples: request.examples.map(ex => ({
        instruction: ex.instruction,
        output: ex.output,
      })),
      check_traits: request.checkTraits ?? true,
      check_geometry: request.checkGeometry ?? true,
    });

    if (!result.success) {
      return {
        totalChecked: request.examples.length,
        passed: 0,
        failed: request.examples.length,
        issues: [{ exampleIndex: -1, issueType: 'error', message: result.error || 'Validation failed', severity: 'error' }],
        summary: { traitErrors: 0, syntaxErrors: 0, geometryErrors: 0 },
      };
    }

    const data = result.data as Record<string, unknown>;
    return {
      totalChecked: (data.total_checked as number) ?? request.examples.length,
      passed: (data.passed as number) ?? 0,
      failed: (data.failed as number) ?? 0,
      issues: (data.issues as HoloScriptValidationResult['issues']) ?? [],
      summary: (data.summary as HoloScriptValidationResult['summary']) ?? {
        traitErrors: 0, syntaxErrors: 0, geometryErrors: 0,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private async callTool(tool: string, args: Record<string, unknown>): Promise<BridgeCallResult> {
    const start = Date.now();

    if (this.config.mockMode) {
      return this.mockToolCall(tool, args, start);
    }

    try {
      const response = await fetch(`${this.config.endpoint}/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mcp-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          server: this.config.serverName,
          tool,
          args,
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      const data = await response.json();

      return {
        success: data.ok ?? response.ok,
        tool,
        data: data.data ?? data,
        error: data.error?.message,
        traceId: data.traceId,
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      return {
        success: false,
        tool,
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
      };
    }
  }

  private mockToolCall(tool: string, args: Record<string, unknown>, start: number): BridgeCallResult {
    // Return realistic mock data for testing
    switch (tool) {
      case 'mcp_get_health':
        return { success: true, tool, data: { status: 'ok', server: 'TrainingMonkey (mock)' }, latencyMs: Date.now() - start };

      case 'mcp_get_capabilities':
        return { success: true, tool, data: { tools: ['generate_dynamic_training', 'validate_training_data', 'audit_training_data'] }, latencyMs: Date.now() - start };

      case 'generate_dynamic_training':
      case 'generate_holoscript_training':
      case 'generate_uaa2_training':
      case 'generate_hololand_training': {
        const count = (args.count as number) || 10;
        const examples = Array.from({ length: count }, (_, i) => ({
          instruction: `Mock instruction ${i + 1} for ${tool}`,
          input: '',
          output: `Mock output ${i + 1}`,
          category: 'mock',
          difficulty: 'intermediate',
        }));
        return {
          success: true, tool,
          data: { examples, total_generated: count, audit_passed: count, audit_failed: 0 },
          latencyMs: Date.now() - start,
        };
      }

      case 'validate_training_data': {
        const exs = (args.examples as unknown[]) || [];
        return {
          success: true, tool,
          data: { valid: true, total_checked: exs.length, passed: exs.length, failed: 0, duplicates: 0, issues: [] },
          latencyMs: Date.now() - start,
        };
      }

      case 'audit_training_data': {
        const exs = (args.examples as unknown[]) || [];
        return {
          success: true, tool,
          data: { total_audited: exs.length, passed: exs.length, failed: 0, issues: [] },
          latencyMs: Date.now() - start,
        };
      }

      // ── V2.0 Pipeline Tools ──

      case 'bridge_to_pipeline': {
        const count = (args.count as number) || 10;
        const domain = (args.domain as string) || 'holoscript';
        const examples = Array.from({ length: count }, (_, i) => ({
          instruction: `Pipeline instruction ${i + 1} (${domain})`,
          input: '',
          output: `composition "Example_${i + 1}" { object "Obj" { geometry: "cube" } }`,
          category: domain,
          difficulty: (args.difficulty as string) || 'intermediate',
        }));
        return {
          success: true, tool,
          data: { examples, generated: count, deduped: 0, by_difficulty: { [(args.difficulty as string) || 'intermediate']: count } },
          latencyMs: Date.now() - start,
        };
      }

      case 'analyze_quality': {
        const exs = (args.examples as unknown[]) || [];
        return {
          success: true, tool,
          data: {
            overall_score: 0.85,
            total_analyzed: exs.length,
            distributions: {
              difficulty: { basic: 2, intermediate: 5, advanced: 3 },
              category: { syntax: 4, traits: 3, scenes: 3 },
              quality: { high: 6, medium: 3, low: 1 },
            },
            issues: [],
            recommendations: ['Add more expert-level examples', 'Cover networking traits'],
          },
          latencyMs: Date.now() - start,
        };
      }

      case 'analyze_coverage_gaps': {
        const exs = (args.examples as unknown[]) || [];
        return {
          success: true, tool,
          data: {
            total_gaps: 2,
            gaps: [
              { type: 'category_missing', description: 'No networking examples', severity: 'high', suggestedCount: 20 },
              { type: 'difficulty_gap', description: 'Expert level underrepresented', severity: 'medium', suggestedCount: 10 },
            ],
            coverage: { categories: 5, difficulties: 3, estimatedCompleteness: 0.72 },
            generation_tasks: [
              { domain: 'holoscript', category: 'networking', difficulty: 'intermediate', count: 20 },
            ],
          },
          latencyMs: Date.now() - start,
        };
      }

      case 'generate_rlhf_pairs': {
        const exs = (args.examples as unknown[]) || [];
        const rpe = (args.rejections_per_example as number) || 2;
        const pairs = (exs as Array<Record<string, unknown>>).slice(0, 5).flatMap((ex, i) =>
          Array.from({ length: rpe }, (_, j) => ({
            chosen: { instruction: (ex.instruction as string) || `Instr ${i}`, output: (ex.output as string) || 'good' },
            rejected: { instruction: (ex.instruction as string) || `Instr ${i}`, output: `bad output ${j}`, strategy: 'wrong_syntax' },
          }))
        );
        return {
          success: true, tool,
          data: { pairs, total_pairs: pairs.length, by_strategy: { wrong_syntax: pairs.length } },
          latencyMs: Date.now() - start,
        };
      }

      case 'generate_conversations': {
        const count = (args.count as number) || 5;
        const domain = (args.domain as string) || 'holoscript';
        const conversations = Array.from({ length: count }, (_, i) => ({
          id: `conv_${i}`,
          domain,
          turns: [
            { role: 'user', content: `How do I create a ${domain} scene?` },
            { role: 'assistant', content: `Use composition {} syntax with objects inside.` },
            { role: 'user', content: 'Can I add physics?' },
            { role: 'assistant', content: 'Yes, add @physics and @collidable traits.' },
          ],
        }));
        return {
          success: true, tool,
          data: {
            conversations,
            total_conversations: count,
            total_turns: count * 4,
            avg_turns: 4,
          },
          latencyMs: Date.now() - start,
        };
      }

      case 'validate_holoscript_examples': {
        const exs = (args.examples as unknown[]) || [];
        return {
          success: true, tool,
          data: {
            total_checked: exs.length,
            passed: exs.length,
            failed: 0,
            issues: [],
            summary: { traitErrors: 0, syntaxErrors: 0, geometryErrors: 0 },
          },
          latencyMs: Date.now() - start,
        };
      }

      default:
        return { success: false, tool, error: `Unknown mock tool: ${tool}`, latencyMs: Date.now() - start };
    }
  }

  private convertToTrainingExamples(data: Record<string, unknown>): TrainingExample[] {
    const raw = (data.examples as Array<Record<string, unknown>>) || [];
    return raw.map((item, i) => ({
      id: `tm_gen_${Date.now()}_${i}`,
      instruction: (item.instruction as string) || '',
      input: (item.input as string) || undefined,
      output: (item.output as string) || '',
      difficulty: this.difficultyToNumber(item.difficulty as string),
      category: (item.category as string) || 'generated',
      metadata: {
        source: 'training_monkey',
        generatedAt: Date.now(),
      },
    }));
  }

  private difficultyToNumber(diff?: string): number {
    switch (diff) {
      case 'basic': return 1;
      case 'intermediate': return 2;
      case 'advanced': return 3;
      case 'expert': return 4;
      default: return 2;
    }
  }
}
