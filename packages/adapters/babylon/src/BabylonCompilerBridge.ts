/**
 * BabylonCompilerBridge
 *
 * Wires the BabylonCompiler from @holoscript/core into the Babylon.js adapter.
 * Compiles .holo composition files and .hsplus source into Babylon.js TypeScript.
 *
 * Follows the same lazy-init pattern as brittney/ai-bridge/CompilerBridge.
 */

import type { HoloComposition } from '@holoscript/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BabylonCompilationResult {
  success: boolean;
  code?: string;
  error?: string;
  metadata?: {
    objects: number;
    lights: number;
    cameras: number;
    duration: number;
  };
}

export interface BabylonCompilerBridgeOptions {
  /** Generated class name (default: 'HoloScene') */
  className?: string;
  /** Enable Havok physics (default: false) */
  useHavok?: boolean;
  /** Enable XR support (default: false) */
  enableXR?: boolean;
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

export class BabylonCompilerBridge {
  private modules: {
    HoloCompositionParser: any;
    BabylonCompiler: any;
  } | null = null;
  private initialized = false;
  private options: BabylonCompilerBridgeOptions;

  constructor(options: BabylonCompilerBridgeOptions = {}) {
    this.options = options;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const core = await import('@holoscript/core');
      this.modules = {
        HoloCompositionParser: core.HoloCompositionParser,
        BabylonCompiler: core.BabylonCompiler,
      };
      this.initialized = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load HoloScript compiler modules: ${message}`);
    }
  }

  /**
   * Compile a .holo composition string to Babylon.js TypeScript code.
   */
  async compileHolo(source: string): Promise<BabylonCompilationResult> {
    const startTime = performance.now();

    try {
      await this.initialize();
      if (!this.modules) throw new Error('Modules not loaded');

      if (!source || source.trim().length === 0) {
        return { success: false, error: 'Empty source input' };
      }

      const parser = new this.modules.HoloCompositionParser();
      const parseResult = parser.parse(source);

      if (parseResult.errors.length > 0) {
        return {
          success: false,
          error: parseResult.errors.map((e: { message: string }) => e.message).join('; '),
        };
      }

      const compiler = new this.modules.BabylonCompiler({
        className: this.options.className ?? 'HoloScene',
        useHavok: this.options.useHavok ?? false,
        enableXR: this.options.enableXR ?? false,
      });

      const code = compiler.compile(parseResult.ast as HoloComposition);
      const duration = performance.now() - startTime;

      const composition = parseResult.ast as HoloComposition;

      return {
        success: true,
        code,
        metadata: {
          objects: composition.objects?.length ?? 0,
          lights: composition.lights?.length ?? 0,
          cameras: composition.cameras?.length ?? 0,
          duration: Math.round(duration * 100) / 100,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Compile a pre-parsed HoloComposition AST to Babylon.js code.
   */
  async compileAST(composition: HoloComposition): Promise<BabylonCompilationResult> {
    const startTime = performance.now();

    try {
      await this.initialize();
      if (!this.modules) throw new Error('Modules not loaded');

      const compiler = new this.modules.BabylonCompiler({
        className: this.options.className ?? 'HoloScene',
        useHavok: this.options.useHavok ?? false,
        enableXR: this.options.enableXR ?? false,
      });

      const code = compiler.compile(composition);
      const duration = performance.now() - startTime;

      return {
        success: true,
        code,
        metadata: {
          objects: composition.objects?.length ?? 0,
          lights: composition.lights?.length ?? 0,
          cameras: composition.cameras?.length ?? 0,
          duration: Math.round(duration * 100) / 100,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}

let instance: BabylonCompilerBridge | null = null;

export function getBabylonCompilerBridge(
  options?: BabylonCompilerBridgeOptions,
): BabylonCompilerBridge {
  if (!instance) {
    instance = new BabylonCompilerBridge(options);
  }
  return instance;
}
