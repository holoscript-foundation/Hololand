/**
 * Compiler Bridge
 * 
 * Integrates HoloScript compiler into AI Bridge pipeline.
 * Converts HoloScript code to React Three Fiber components.
 */

// Using dynamic imports to avoid build-time dependency issues
type ZoneNode = any;

export interface CompilationResult {
  success: boolean;
  r3fCode?: string;
  error?: string;
  metadata?: {
    zones: number;
    entities: number;
    handlers: number;
    duration: number;
  };
}

export class CompilerBridge {
  private modules: any = null;
  private initialized = false;

  /**
   * Initialize compiler modules (lazy load to avoid circular dependencies)
   * Uses require() at runtime to avoid TypeScript compilation errors
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // At runtime, require the actual modules (they'll be available in dist/)
      // This avoids TypeScript trying to resolve them at compile-time
      this.modules = {
        tokenize: require('@holoscript/holoscript').tokenize,
        Parser: require('@holoscript/holoscript').Parser,
        R3FCompiler: require('@holoscript/holoscript').R3FCompiler,
      };
      this.initialized = true;
    } catch (error: any) {
      console.error('[CompilerBridge] Failed to initialize:', error.message);
      throw new Error('Failed to load HoloScript compiler modules');
    }
  }

  /**
   * Compile HoloScript code to React Three Fiber components
   * 
   * @param holoScript - HoloScript source code
   * @returns Compiled R3F component code
   */
  async compile(holoScript: string): Promise<CompilationResult> {
    const startTime = performance.now();

    try {
      await this.initialize();

      if (!holoScript || holoScript.trim().length === 0) {
        return {
          success: false,
          error: 'Empty HoloScript input',
        };
      }

      // Tokenize
      const tokens = this.modules.tokenize(holoScript);

      if (tokens.length === 0) {
        return {
          success: false,
          error: 'No valid tokens found',
        };
      }

      // Parse
      const parser = new this.modules.Parser(tokens);
      const ast = parser.parse() as ZoneNode[];

      if (!ast || ast.length === 0) {
        return {
          success: false,
          error: 'Failed to parse HoloScript',
        };
      }

      // Compile to R3F
      const compiler = new this.modules.R3FCompiler({
        target: 'r3f',
        optimize: true,
        sourceMaps: false,
      });

      const r3fCode = compiler.compile(ast);

      const duration = performance.now() - startTime;

      return {
        success: true,
        r3fCode,
        metadata: {
          zones: ast.length,
          entities: ast.reduce((sum: number, zone: any) => sum + (zone.entities?.length || 0), 0),
          handlers: ast.reduce((sum: number, zone: any) => 
            sum + (zone.entities?.reduce((s: number, e: any) => s + (e.handlers?.length || 0), 0) || 0), 0),
          duration: Math.round(duration * 100) / 100,
        },
      };
    } catch (error: any) {
      const duration = performance.now() - startTime;

      return {
        success: false,
        error: error.message || 'Unknown compilation error',
        metadata: {
          zones: 0,
          entities: 0,
          handlers: 0,
          duration: Math.round(duration * 100) / 100,
        },
      };
    }
  }

  /**
   * Validate HoloScript syntax without compilation
   * 
   * @param holoScript - HoloScript source code
   * @returns Validation result
   */
  async validate(holoScript: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      await this.initialize();

      if (!holoScript || holoScript.trim().length === 0) {
        errors.push('Empty input');
        return { valid: false, errors };
      }

      const tokens = this.modules.tokenize(holoScript);
      if (tokens.length === 0) {
        errors.push('No valid tokens found');
        return { valid: false, errors };
      }

      const parser = new this.modules.Parser(tokens);
      const ast = parser.parse();

      if (!ast || ast.length === 0) {
        errors.push('Failed to parse HoloScript');
        return { valid: false, errors };
      }

      return { valid: true, errors: [] };
    } catch (error: any) {
      errors.push(error.message || 'Unknown validation error');
      return { valid: false, errors };
    }
  }

  /**
   * Get estimated compilation metrics
   * 
   * @param holoScript - HoloScript source code
   * @returns Metrics for display
   */
  getMetrics(holoScript: string): {
    lines: number;
    characters: number;
    estimatedZones: number;
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
  } {
    const lines = holoScript.split('\n').length;
    const characters = holoScript.length;
    
    // Rough estimation based on keywords
    const zoneMatches = holoScript.match(/\borb\b/gi) || [];
    const estimatedZones = zoneMatches.length;

    // Complexity based on handlers
    const handlerMatches = holoScript.match(/\bon_\w+/gi) || [];
    const handlerCount = handlerMatches.length;

    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (handlerCount > 5 || estimatedZones > 3) {
      complexity = 'moderate';
    }
    if (handlerCount > 15 || estimatedZones > 8) {
      complexity = 'complex';
    }

    return {
      lines,
      characters,
      estimatedZones,
      estimatedComplexity: complexity,
    };
  }
}

// Export singleton
let instance: CompilerBridge | null = null;

export function getCompilerBridge(): CompilerBridge {
  if (!instance) {
    instance = new CompilerBridge();
  }
  return instance;
}
