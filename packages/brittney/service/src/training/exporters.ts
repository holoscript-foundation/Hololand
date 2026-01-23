/**
 * Training Data Exporters
 *
 * Export training datasets to formats required by fine-tuning platforms:
 * - JSONL for Azure AI Foundry
 * - OpenAI fine-tuning format
 * - Hugging Face datasets format
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { TrainingDataset, TrainingExample } from './TrainingDataGenerator.js';

// =============================================================================
// Types
// =============================================================================

export interface ExportOptions {
  /** Output directory */
  outputDir: string;
  /** Include system message in each example */
  includeSystemMessage?: boolean;
  /** System message content */
  systemMessage?: string;
  /** Split into train/validation sets */
  splitValidation?: boolean;
  /** Validation split ratio (0-1) */
  validationRatio?: number;
  /** Maximum examples per file (for chunking) */
  maxPerFile?: number;
  /** Pretty print JSON (for debugging) */
  prettyPrint?: boolean;
}

export interface ExportResult {
  format: string;
  files: string[];
  totalExamples: number;
  trainExamples?: number;
  validationExamples?: number;
}

// =============================================================================
// JSONL Exporter (Azure AI Foundry / OpenAI format)
// =============================================================================

/**
 * Export to JSONL format for Azure AI Foundry fine-tuning
 *
 * Format:
 * {"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
 */
export function exportToJSONL(
  dataset: TrainingDataset,
  options: ExportOptions
): ExportResult {
  const {
    outputDir,
    includeSystemMessage = true,
    systemMessage = getDefaultSystemMessage(),
    splitValidation = true,
    validationRatio = 0.1,
    maxPerFile,
    prettyPrint = false,
  } = options;

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const files: string[] = [];
  let trainCount = 0;
  let valCount = 0;

  // Convert examples to JSONL format
  const jsonlExamples = dataset.examples.map((example) => {
    const messages: Array<{ role: string; content: string }> = [];

    if (includeSystemMessage && systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }

    messages.push({ role: 'user', content: example.prompt });
    messages.push({ role: 'assistant', content: example.completion });

    return { messages };
  });

  if (splitValidation) {
    // Shuffle and split
    const shuffled = [...jsonlExamples].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(shuffled.length * (1 - validationRatio));

    const trainExamples = shuffled.slice(0, splitIndex);
    const valExamples = shuffled.slice(splitIndex);

    // Write train file
    const trainPath = join(outputDir, 'train.jsonl');
    writeJSONL(trainPath, trainExamples, prettyPrint, maxPerFile);
    files.push(trainPath);
    trainCount = trainExamples.length;

    // Write validation file
    const valPath = join(outputDir, 'validation.jsonl');
    writeJSONL(valPath, valExamples, prettyPrint, maxPerFile);
    files.push(valPath);
    valCount = valExamples.length;
  } else {
    // Write single file
    const outPath = join(outputDir, 'training.jsonl');
    writeJSONL(outPath, jsonlExamples, prettyPrint, maxPerFile);
    files.push(outPath);
    trainCount = jsonlExamples.length;
  }

  // Write metadata
  const metadataPath = join(outputDir, 'metadata.json');
  const metadata = {
    name: dataset.name,
    version: dataset.version,
    generated: dataset.generated,
    exportedAt: new Date().toISOString(),
    format: 'jsonl',
    totalExamples: dataset.totalExamples,
    trainExamples: trainCount,
    validationExamples: valCount,
    byCategory: dataset.byCategory,
    byIntent: dataset.byIntent,
    expansionRatio: dataset.expansionRatio,
  };
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  files.push(metadataPath);

  return {
    format: 'jsonl',
    files,
    totalExamples: dataset.totalExamples,
    trainExamples: trainCount,
    validationExamples: valCount,
  };
}

/**
 * Write JSONL file(s)
 */
function writeJSONL(
  basePath: string,
  examples: object[],
  prettyPrint: boolean,
  maxPerFile?: number
): void {
  if (maxPerFile && examples.length > maxPerFile) {
    // Chunk into multiple files
    const chunks = chunkArray(examples, maxPerFile);
    const ext = basePath.slice(basePath.lastIndexOf('.'));
    const base = basePath.slice(0, basePath.lastIndexOf('.'));

    chunks.forEach((chunk, i) => {
      const path = `${base}_${String(i + 1).padStart(3, '0')}${ext}`;
      const content = chunk
        .map((ex) => (prettyPrint ? JSON.stringify(ex, null, 2) : JSON.stringify(ex)))
        .join('\n');
      writeFileSync(path, content + '\n');
    });
  } else {
    const content = examples
      .map((ex) => (prettyPrint ? JSON.stringify(ex, null, 2) : JSON.stringify(ex)))
      .join('\n');
    writeFileSync(basePath, content + '\n');
  }
}

// =============================================================================
// OpenAI Fine-tuning Format
// =============================================================================

/**
 * Export to OpenAI fine-tuning format
 * Same as JSONL but with specific validation
 */
export function exportToOpenAI(
  dataset: TrainingDataset,
  options: ExportOptions
): ExportResult {
  // OpenAI uses same JSONL format
  const result = exportToJSONL(dataset, {
    ...options,
    includeSystemMessage: true,
    systemMessage: options.systemMessage || getDefaultSystemMessage(),
  });

  // Add OpenAI-specific validation
  validateOpenAIFormat(result.files.filter((f) => f.endsWith('.jsonl')));

  return {
    ...result,
    format: 'openai',
  };
}

/**
 * Validate OpenAI format requirements
 */
function validateOpenAIFormat(files: string[]): void {
  // OpenAI requirements:
  // - At least 10 examples
  // - Each example must have messages array
  // - Each message must have role and content
  // - Max 100k examples per file

  for (const file of files) {
    const content = require('fs').readFileSync(file, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 10) {
      console.warn(`[OpenAI Export] Warning: ${file} has fewer than 10 examples`);
    }

    if (lines.length > 100000) {
      throw new Error(`[OpenAI Export] File ${file} exceeds 100k examples`);
    }
  }
}

// =============================================================================
// Azure AI Foundry Format
// =============================================================================

/**
 * Export specifically for Azure AI Foundry
 * Adds Azure-specific metadata and formatting
 */
export function exportToAzureFoundry(
  dataset: TrainingDataset,
  options: ExportOptions & {
    deploymentName?: string;
    baseModel?: string;
  }
): ExportResult {
  const result = exportToJSONL(dataset, options);

  // Write Azure-specific config
  const azureConfig = {
    $schema: 'https://azuremlschemas.azureedge.net/latest/commandJob.schema.json',
    type: 'fine_tuning',
    training_data: {
      path: './train.jsonl',
      type: 'uri_file',
    },
    validation_data: {
      path: './validation.jsonl',
      type: 'uri_file',
    },
    model: options.baseModel || 'gpt-4o-mini',
    hyperparameters: {
      n_epochs: 3,
      batch_size: 'auto',
      learning_rate_multiplier: 'auto',
    },
    suffix: options.deploymentName || 'brittney-holoscript',
  };

  const configPath = join(options.outputDir, 'azure-finetune-config.json');
  writeFileSync(configPath, JSON.stringify(azureConfig, null, 2));
  result.files.push(configPath);

  return {
    ...result,
    format: 'azure-foundry',
  };
}

// =============================================================================
// Utilities
// =============================================================================

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function getDefaultSystemMessage(): string {
  return `You are Brittney, the AI assistant for Hololand and HoloScript development.
You help developers build immersive VR/AR experiences using HoloScript, the declarative DSL for the Hololand platform.

Guidelines:
- Always use correct HoloScript syntax
- Use traits for behavior: @grabbable, @pointable, @hoverable, etc.
- Consider VR ergonomics (scale, reachability, comfort)
- Be concise and provide working code examples

When generating HoloScript code, use proper syntax:
\`\`\`holoscript
object Name @trait1 @trait2 {
  geometry: 'type'
  position: [x, y, z]
  // ... properties
}
\`\`\``;
}

// =============================================================================
// CLI Export Helper
// =============================================================================

/**
 * Main export function for CLI usage
 */
export async function exportDataset(
  format: 'jsonl' | 'openai' | 'azure',
  outputDir: string
): Promise<ExportResult> {
  const { TrainingDataGenerator } = await import('./TrainingDataGenerator.js');

  const generator = new TrainingDataGenerator({
    maxVariations: 5,
    includeRelated: true,
  });

  const dataset = generator.generate();

  console.log(`[Export] Generated ${dataset.totalExamples} examples from ${dataset.originalExamples} base`);
  console.log(`[Export] Expansion ratio: ${dataset.expansionRatio.toFixed(2)}x`);

  const options: ExportOptions = {
    outputDir,
    splitValidation: true,
    validationRatio: 0.1,
  };

  let result: ExportResult;

  switch (format) {
    case 'openai':
      result = exportToOpenAI(dataset, options);
      break;
    case 'azure':
      result = exportToAzureFoundry(dataset, {
        ...options,
        deploymentName: 'brittney-holoscript',
        baseModel: 'gpt-4o-mini',
      });
      break;
    case 'jsonl':
    default:
      result = exportToJSONL(dataset, options);
  }

  console.log(`[Export] Created ${result.files.length} files in ${outputDir}`);
  console.log(`[Export] Train: ${result.trainExamples}, Validation: ${result.validationExamples}`);

  return result;
}
