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
