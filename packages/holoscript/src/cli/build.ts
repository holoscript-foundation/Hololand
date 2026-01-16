import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { tokenize } from '../parser/lexer';
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
    const spinner = ora('Compiling HoloScript...').start();

    try {
      // Validate input
      const inputPath = resolve(this.options.input);
      if (!inputPath.endsWith('.hs')) {
        spinner.fail(chalk.red('Invalid file extension'));
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
      spinner.text = 'Reading source file...';
      let source: string;
      try {
        source = readFileSync(inputPath, 'utf-8');
      } catch (err: any) {
        spinner.fail(chalk.red('Failed to read file'));
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
        spinner.fail(chalk.red('Empty file'));
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
        spinner.text = 'Tokenizing...';
        const tokens = tokenize(source);

        if (this.options.verbose) {
          spinner.info(chalk.gray(`Tokenized ${tokens.length} tokens`));
          spinner.start('Parsing...');
        } else {
          spinner.text = 'Parsing...';
        }

        const parser = new Parser(tokens);
        const ast = parser.parse();

        if (this.options.verbose) {
          spinner.info(chalk.gray(`Parsed ${ast.length} zones`));
          spinner.start('Compiling to React Three Fiber...');
        } else {
          spinner.text = 'Compiling to React Three Fiber...';
        }

        const compiler = new R3FCompiler({
          target: 'r3f',
          optimize: this.options.optimize || false,
          sourceMaps: this.options.sourceMaps || false,
        });

        code = compiler.compile(ast);
      } catch (err: any) {
        spinner.fail(chalk.red('Compilation failed'));
        // Extract line number if available
        const match = err.message.match(/line (\d+)/i);
        const lineInfo = match ? ` (line ${match[1]})` : '';
        return {
          success: false,
          input: this.options.input,
          output: '',
          duration: Date.now() - startTime,
          size: 0,
          errors: [`${err.message}${lineInfo}`],
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
      spinner.fail(chalk.red('Unexpected error'));
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
   * Format file size for display
   */
  static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Format build result for display
   */
  static formatResult(result: BuildResult): string {
    const parts: string[] = [];

    if (result.success) {
      parts.push('');
      parts.push(chalk.bold('  Build Summary'));
      parts.push(chalk.gray('  ─────────────'));
      parts.push(`  ${chalk.cyan('Input:')}    ${chalk.white(result.input)}`);
      parts.push(`  ${chalk.cyan('Output:')}   ${chalk.white(result.output)}`);
      parts.push(`  ${chalk.cyan('Size:')}     ${chalk.white(this.formatSize(result.size))}`);
      parts.push(`  ${chalk.cyan('Duration:')} ${chalk.white(result.duration + 'ms')}`);
      parts.push('');
    } else {
      parts.push('');
      if (result.errors.length > 0) {
        parts.push(chalk.bold.red('  Errors:'));
        result.errors.forEach((err) => {
          parts.push(chalk.red(`  ✖ ${err}`));
        });
        parts.push('');
      }
    }

    if (result.warnings.length > 0) {
      parts.push(chalk.bold.yellow('  Warnings:'));
      result.warnings.forEach((warn) => {
        parts.push(chalk.yellow(`  ⚠ ${warn}`));
      });
      parts.push('');
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
