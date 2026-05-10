/**
 * OptimizationBridge
 *
 * Wires @holoscript/core OptimizationPass into the Three.js adapter.
 * Provides scene analysis, LOD recommendations, batching suggestions,
 * and performance scoring for HoloScript compositions.
 */

import type { OptimizationReport, OptimizationOptions } from '@holoscript/core';

type OptimizationPassInstance = {
  analyze?: (tree: unknown) => OptimizationReport | Promise<OptimizationReport>;
  analyzeComposition?: (
    ast: unknown,
    compiler?: unknown
  ) => OptimizationReport | Promise<OptimizationReport>;
};

type OptimizationPassCtor = new (options?: OptimizationOptions) => OptimizationPassInstance;

type CoreWithOptimization = typeof import('@holoscript/core') & {
  OptimizationPass?: OptimizationPassCtor;
  R3FCompiler?: new (options?: unknown) => unknown;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { OptimizationReport, OptimizationOptions };

export interface OptimizationBridgeConfig {
  /** Target platform (default: 'desktop') */
  platform?: 'desktop' | 'mobile' | 'vr' | 'ar';
  /** Triangle budget (default: 500_000) */
  triangleBudget?: number;
  /** VRAM budget in MB (default: 256) */
  vramBudget_MB?: number;
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

export class OptimizationBridge {
  private modules: {
    OptimizationPass: OptimizationPassCtor;
    R3FCompiler?: new (options?: unknown) => unknown;
  } | null = null;
  private initialized = false;
  private config: OptimizationBridgeConfig;

  constructor(config: OptimizationBridgeConfig = {}) {
    this.config = config;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const core = (await import('@holoscript/core')) as CoreWithOptimization;
      if (!core.OptimizationPass) {
        throw new Error('@holoscript/core does not export OptimizationPass');
      }
      this.modules = {
        OptimizationPass: core.OptimizationPass,
        R3FCompiler: core.R3FCompiler,
      };
      this.initialized = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load OptimizationPass: ${message}`);
    }
  }

  /**
   * Analyze a .holo source string for optimization opportunities.
   * Parses the source, then runs OptimizationPass.analyzeComposition().
   */
  async analyzeSource(source: string): Promise<OptimizationReport> {
    await this.initialize();
    if (!this.modules) throw new Error('Modules not loaded');

    const core = await import('@holoscript/core');
    const parser = new core.HoloCompositionParser();
    const parseResult = parser.parse(source);

    if (parseResult.errors.length > 0) {
      throw new Error(
        `Parse errors: ${parseResult.errors.map((e: { message: string }) => e.message).join('; ')}`
      );
    }

    const pass = new this.modules.OptimizationPass(this.buildOptions());
    if (typeof pass.analyzeComposition !== 'function') {
      throw new Error('OptimizationPass does not expose analyzeComposition');
    }

    const compiler = this.modules.R3FCompiler ? new this.modules.R3FCompiler() : undefined;
    return pass.analyzeComposition(parseResult.ast, compiler);
  }

  /**
   * Analyze a pre-compiled R3FNode tree.
   */
  async analyzeTree(tree: unknown): Promise<OptimizationReport> {
    await this.initialize();
    if (!this.modules) throw new Error('Modules not loaded');

    const pass = new this.modules.OptimizationPass(this.buildOptions());
    if (typeof pass.analyze !== 'function') {
      throw new Error('OptimizationPass does not expose analyze');
    }
    return pass.analyze(tree);
  }

  private buildOptions(): OptimizationOptions {
    return {
      platform: this.config.platform ?? 'desktop',
      triangleBudget: this.config.triangleBudget ?? 500_000,
      vramBudget_MB: this.config.vramBudget_MB ?? 256,
      analyzeLOD: true,
      analyzeBatching: true,
      analyzeTextures: true,
    };
  }
}

let instance: OptimizationBridge | null = null;

export function getOptimizationBridge(config?: OptimizationBridgeConfig): OptimizationBridge {
  if (!instance) {
    instance = new OptimizationBridge(config);
  }
  return instance;
}
