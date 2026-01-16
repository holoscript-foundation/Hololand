import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { Lexer } from '../parser/lexer';
import { Parser } from '../parser/parser';
import { R3FCompiler } from '../compiler/r3f-compiler';

export interface BuildOptions {
  input: string;
  output?: string;
  watch?: boolean;
  optimize?: boolean;
  verbose?: boolean;
  sourceMaps?: boolean;
}

export interface BuildResult {
  success: boolean;
  input: string;
  output: string;
  duration: number;
  size: number;
  errors: string[];
  warnings: string[];
}

export class HoloScriptBuilder {
  private options: BuildOptions;

  constructor(options: BuildOptions) {
    this.options = {
      optimize: false,
      verbose: false,
      sourceMaps: false,
      ...options,
    };
  }

  /**
   * Build a single HoloScript file
   */
  async build(): Promise<BuildResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate input
      const inputPath = resolve(this.options.input);
      if (!inputPath.endsWith('.hs')) {
        return {
          success: false,
          input: this.options.input,
          output: '',
          duration: Date.now() - startTime,
          size: 0,
          errors: ['Input file must have .hs extension'],
          warnings: [],
        };
      }

      // Read source
      let source: string;
      try {
        source = readFileSync(inputPath, 'utf-8');
      } catch (err: any) {
        return {
          success: false,
          input: this.options.input,
          output: '',
          duration: Date.now() - startTime,
          size: 0,
          errors: [`Failed to read file: ${err.message}`],
          warnings: [],
        };
      }

      if (!source.trim()) {
        return {
          success: false,
          input: this.options.input,
          output: '',
          duration: Date.now() - startTime,
          size: 0,
          errors: ['Input file is empty'],
          warnings: [],
        };
      }

      // Compile
      let code: string;
      try {
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();

        if (this.options.verbose) {
          console.log(`✓ Tokenized (${tokens.length} tokens)`);
        }

        const parser = new Parser(tokens);
        const ast = parser.parse();

        if (this.options.verbose) {
          console.log(`✓ Parsed (${ast.zones.length} zones)`);
        }

        const compiler = new R3FCompiler({
          target: 'react',
          optimize: this.options.optimize,
          sourceMaps: this.options.sourceMaps,
        });

        code = compiler.compile(ast);

        if (this.options.verbose) {
          console.log(`✓ Compiled to React Three Fiber`);
        }
      } catch (err: any) {
        // Extract line number if available
        const match = err.message.match(/line (\d+)/i);
        const lineInfo = match ? ` (line ${match[1]})` : '';
        return {
          success: false,
          input: this.options.input,
          output: '',
          duration: Date.now() - startTime,
          size: 0,
          errors: [`Compilation failed: ${err.message}${lineInfo}`],
          warnings,
        };
      }

      // Determine output path
      const outputPath = this.options.output
        ? resolve(this.options.output)
        : resolve(dirname(inputPath), basename(inputPath, '.hs') + '.tsx');

      // Write output
      try {
        writeFileSync(outputPath, code, 'utf-8');
      } catch (err: any) {
        return {
          success: false,
          input: this.options.input,
          output: outputPath,
          duration: Date.now() - startTime,
          size: code.length,
          errors: [`Failed to write output: ${err.message}`],
          warnings,
        };
      }

      if (this.options.verbose) {
        console.log(`✓ Wrote to ${outputPath}`);
      }

      return {
        success: true,
        input: inputPath,
        output: outputPath,
        duration: Date.now() - startTime,
        size: code.length,
        errors,
        warnings,
      };
    } catch (err: any) {
      return {
        success: false,
        input: this.options.input,
        output: '',
        duration: Date.now() - startTime,
        size: 0,
        errors: [`Unexpected error: ${err.message}`],
        warnings,
      };
    }
  }

  /**
   * Format build result for display
   */
  static formatResult(result: BuildResult): string {
    const parts: string[] = [];

    if (result.success) {
      parts.push(`✅ Build successful`);
      parts.push(`   Input:    ${result.input}`);
      parts.push(`   Output:   ${result.output}`);
      parts.push(`   Size:     ${result.size.toLocaleString()} bytes`);
      parts.push(`   Duration: ${result.duration}ms`);
    } else {
      parts.push(`❌ Build failed`);
      parts.push(`   Input: ${result.input}`);
      if (result.errors.length > 0) {
        parts.push(`\n   Errors:`);
        result.errors.forEach((err) => {
          parts.push(`     • ${err}`);
        });
      }
    }

    if (result.warnings.length > 0) {
      parts.push(`\n   Warnings:`);
      result.warnings.forEach((warn) => {
        parts.push(`     • ${warn}`);
      });
    }

    return parts.join('\n');
  }
}

/**
 * CLI entry for build command
 */
export async function runBuild(
  inputFile: string,
  options: Partial<BuildOptions> = {}
): Promise<void> {
  const builder = new HoloScriptBuilder({
    input: inputFile,
    ...options,
  });

  const result = await builder.build();
  console.log(HoloScriptBuilder.formatResult(result));

  if (!result.success) {
    process.exit(1);
  }
}
