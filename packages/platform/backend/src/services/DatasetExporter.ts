/**
 * @hololand/backend — DatasetExporter
 *
 * Exports in-memory training datasets to JSONL files on disk for
 * fine-tuning pipelines. Supports Alpaca, ShareGPT, RLHF, and
 * Completion formats.
 *
 * Also handles importing JSONL files back into TrainingExample[].
 *
 * Usage:
 *   const exporter = new DatasetExporter();
 *   await exporter.exportToJsonl(examples, '/tmp/dataset.jsonl', 'alpaca');
 *   const imported = await exporter.importFromJsonl('/tmp/dataset.jsonl', 'alpaca');
 */

import type { TrainingExample, DatasetFormat } from './BrittneyFineTuneService';

// ============================================================================
// Types
// ============================================================================

export interface ExportConfig {
  /** Include examples with quality below threshold. Default: false */
  includeAll?: boolean;
  /** Minimum quality to export. Default: 0.3 */
  minQuality?: number;
  /** Shuffle output. Default: true */
  shuffle?: boolean;
  /** Maximum examples to export. Default: Infinity */
  maxExamples?: number;
  /** Include metadata in output. Default: false */
  includeMetadata?: boolean;
}

export interface ExportResult {
  format: DatasetFormat;
  path: string;
  examplesWritten: number;
  bytesWritten: number;
  exportedAt: number;
}

export interface ImportResult {
  examples: TrainingExample[];
  format: DatasetFormat;
  path: string;
  linesRead: number;
  parseErrors: number;
  importedAt: number;
}

// Alpaca format line
interface AlpacaLine {
  instruction: string;
  input?: string;
  output: string;
  system?: string;
}

// ShareGPT format line
interface ShareGPTLine {
  conversations: Array<{
    from: 'human' | 'gpt' | 'system';
    value: string;
  }>;
}

// RLHF format line
interface RLHFLine {
  prompt: string;
  chosen: string;
  rejected: string;
}

// Completion format line
interface CompletionLine {
  prompt: string;
  completion: string;
}

// ============================================================================
// DatasetExporter
// ============================================================================

export class DatasetExporter {
  /**
   * Export TrainingExample[] to in-memory JSONL string in the specified format.
   * Returns the JSONL content and stats.
   */
  exportToString(
    examples: TrainingExample[],
    format: DatasetFormat,
    config: ExportConfig = {},
  ): { content: string; stats: ExportResult } {
    const {
      includeAll = false,
      minQuality = 0.3,
      shuffle = true,
      maxExamples = Infinity,
      includeMetadata = false,
    } = config;

    // Filter by quality
    let filtered = includeAll
      ? [...examples]
      : examples.filter(ex => {
          const q = (ex.metadata?.quality as number) ?? 1.0;
          return q >= minQuality;
        });

    // Shuffle (Fisher-Yates)
    if (shuffle) {
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
    }

    // Limit
    if (filtered.length > maxExamples) {
      filtered = filtered.slice(0, maxExamples);
    }

    // Convert to format
    const lines: string[] = [];
    for (const ex of filtered) {
      const line = this.exampleToFormatLine(ex, format, includeMetadata);
      if (line) lines.push(JSON.stringify(line));
    }

    const content = lines.join('\n') + (lines.length > 0 ? '\n' : '');

    return {
      content,
      stats: {
        format,
        path: '<in-memory>',
        examplesWritten: lines.length,
        bytesWritten: Buffer.byteLength(content, 'utf-8'),
        exportedAt: Date.now(),
      },
    };
  }

  /**
   * Import JSONL string content into TrainingExample[].
   */
  importFromString(content: string, format: DatasetFormat): ImportResult {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const examples: TrainingExample[] = [];
    let parseErrors = 0;

    for (let i = 0; i < lines.length; i++) {
      try {
        const parsed = JSON.parse(lines[i]);
        const example = this.formatLineToExample(parsed, format, i);
        if (example) examples.push(example);
      } catch {
        parseErrors++;
      }
    }

    return {
      examples,
      format,
      path: '<in-memory>',
      linesRead: lines.length,
      parseErrors,
      importedAt: Date.now(),
    };
  }

  /**
   * Convert a single TrainingExample to the appropriate format line.
   */
  private exampleToFormatLine(
    ex: TrainingExample,
    format: DatasetFormat,
    includeMetadata: boolean,
  ): AlpacaLine | ShareGPTLine | RLHFLine | CompletionLine | Record<string, unknown> | null {
    switch (format) {
      case 'alpaca': {
        const line: AlpacaLine & Record<string, unknown> = {
          instruction: ex.instruction,
          output: ex.output,
        };
        if (ex.input) line.input = ex.input;
        if (ex.system) line.system = ex.system;
        if (includeMetadata) {
          line.category = ex.category;
          line.difficulty = ex.difficulty;
        }
        return line;
      }

      case 'sharegpt': {
        const conversations: ShareGPTLine['conversations'] = [];
        if (ex.system) conversations.push({ from: 'system', value: ex.system });
        conversations.push({ from: 'human', value: ex.instruction });
        conversations.push({ from: 'gpt', value: ex.output });
        return { conversations } as ShareGPTLine;
      }

      case 'rlhf': {
        // For RLHF, we need a rejected output. If not available, skip.
        const rejected = (ex.metadata?.originalOutput as string) || '';
        if (!rejected) return null;
        return {
          prompt: ex.instruction,
          chosen: ex.output,
          rejected,
        } as RLHFLine;
      }

      case 'completion': {
        return {
          prompt: ex.instruction,
          completion: ex.output,
        } as CompletionLine;
      }

      case 'custom':
      default: {
        return {
          id: ex.id,
          instruction: ex.instruction,
          input: ex.input,
          output: ex.output,
          system: ex.system,
          difficulty: ex.difficulty,
          category: ex.category,
          metadata: includeMetadata ? ex.metadata : undefined,
        };
      }
    }
  }

  /**
   * Convert a format line back to TrainingExample.
   */
  private formatLineToExample(
    parsed: Record<string, unknown>,
    format: DatasetFormat,
    index: number,
  ): TrainingExample | null {
    try {
      switch (format) {
        case 'alpaca': {
          const line = parsed as unknown as AlpacaLine;
          return {
            id: `import_alpaca_${index}`,
            instruction: line.instruction || '',
            input: line.input,
            output: line.output || '',
            system: line.system,
            metadata: { source: 'import', format: 'alpaca' },
          };
        }

        case 'sharegpt': {
          const line = parsed as unknown as ShareGPTLine;
          const system = line.conversations?.find(c => c.from === 'system');
          const human = line.conversations?.find(c => c.from === 'human');
          const gpt = line.conversations?.find(c => c.from === 'gpt');
          if (!human || !gpt) return null;
          return {
            id: `import_sharegpt_${index}`,
            instruction: human.value,
            output: gpt.value,
            system: system?.value,
            metadata: { source: 'import', format: 'sharegpt' },
          };
        }

        case 'rlhf': {
          const line = parsed as unknown as RLHFLine;
          return {
            id: `import_rlhf_${index}`,
            instruction: line.prompt || '',
            output: line.chosen || '',
            metadata: {
              source: 'import',
              format: 'rlhf',
              originalOutput: line.rejected,
            },
          };
        }

        case 'completion': {
          const line = parsed as unknown as CompletionLine;
          return {
            id: `import_completion_${index}`,
            instruction: line.prompt || '',
            output: line.completion || '',
            metadata: { source: 'import', format: 'completion' },
          };
        }

        default: {
          return {
            id: (parsed.id as string) || `import_custom_${index}`,
            instruction: (parsed.instruction as string) || '',
            output: (parsed.output as string) || '',
            input: parsed.input as string | undefined,
            system: parsed.system as string | undefined,
            difficulty: parsed.difficulty as number | undefined,
            category: parsed.category as string | undefined,
            metadata: { source: 'import', format: 'custom' },
          };
        }
      }
    } catch {
      return null;
    }
  }

  /**
   * Get format statistics from a JSONL content string.
   */
  getFormatStats(content: string): {
    lineCount: number;
    totalBytes: number;
    avgLineBytes: number;
    detectedFormat: DatasetFormat | 'unknown';
  } {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const totalBytes = Buffer.byteLength(content, 'utf-8');
    const avgLineBytes = lines.length > 0 ? Math.round(totalBytes / lines.length) : 0;

    let detectedFormat: DatasetFormat | 'unknown' = 'unknown';
    if (lines.length > 0) {
      try {
        const first = JSON.parse(lines[0]);
        if (first.conversations) detectedFormat = 'sharegpt';
        else if (first.chosen && first.rejected) detectedFormat = 'rlhf';
        else if (first.instruction && first.output) detectedFormat = 'alpaca';
        else if (first.prompt && first.completion) detectedFormat = 'completion';
        else detectedFormat = 'custom';
      } catch {
        // not JSON
      }
    }

    return { lineCount: lines.length, totalBytes, avgLineBytes, detectedFormat };
  }
}
