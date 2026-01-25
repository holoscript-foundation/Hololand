#!/usr/bin/env node

/**
 * Brittney Model Download CLI
 * 
 * Usage:
 *   brittney-download                    # Download recommended model
 *   brittney-download --model v1-free    # Download specific model
 *   brittney-download --list             # List available models
 *   brittney-download --help             # Show help
 */

import { 
  MODEL_REGISTRY, 
  getModelInfo, 
  getDefaultModel,
  getFreeModels,
} from '../dist/registry.js';
import { downloadModel, getDefaultModelsDir } from '../dist/download.js';

const args = process.argv.slice(2);

// Parse arguments
const options = {
  model: 'v1-free',
  destination: getDefaultModelsDir(),
  force: false,
  list: false,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--model' || arg === '-m') {
    options.model = args[++i];
  } else if (arg === '--dest' || arg === '-d') {
    options.destination = args[++i];
  } else if (arg === '--force' || arg === '-f') {
    options.force = true;
  } else if (arg === '--list' || arg === '-l') {
    options.list = true;
  } else if (arg === '--help' || arg === '-h') {
    options.help = true;
  } else if (!arg.startsWith('-')) {
    // Positional: model ID
    options.model = arg;
  }
}

// Show help
if (options.help) {
  console.log(`
Brittney Model Downloader
=========================

Usage:
  brittney-download [model-id] [options]

Options:
  --model, -m <id>    Model ID to download (default: v1-free)
  --dest, -d <path>   Destination directory (default: ~/.brittney/models)
  --force, -f         Force re-download even if exists
  --list, -l          List available models
  --help, -h          Show this help

Examples:
  brittney-download                   # Download v1-free (recommended)
  brittney-download v1-q4             # Download quantized model
  brittney-download --list            # Show all models
  brittney-download -m v1-free -d ./models

Available Models:
`);
  
  for (const model of getFreeModels()) {
    console.log(`  ${model.id.padEnd(12)} ${model.size.padEnd(8)} ${model.name}`);
  }
  
  process.exit(0);
}

// List models
if (options.list) {
  console.log(`
Brittney AI Models
==================

Free Tier (MIT License):
`);
  
  for (const model of getFreeModels()) {
    const rec = model.recommended ? ' ⭐ RECOMMENDED' : '';
    console.log(`  ${model.id}`);
    console.log(`    Name:     ${model.name}${rec}`);
    console.log(`    Size:     ${model.size}`);
    console.log(`    Memory:   ${model.minMemory} minimum`);
    console.log(`    Features: ${model.features.slice(0, 3).join(', ')}`);
    console.log();
  }
  
  console.log(`
Download with:
  brittney-download <model-id>

Example:
  brittney-download v1-free
`);
  
  process.exit(0);
}

// Download model
console.log(`
╔══════════════════════════════════════════════════╗
║        Brittney AI - Model Downloader            ║
║          Free V1 - Production Ready              ║
╚══════════════════════════════════════════════════╝
`);

try {
  const result = await downloadModel(options.model, {
    destination: options.destination,
    force: options.force,
    showProgress: true,
    verify: true,
  });
  
  console.log(`
╔══════════════════════════════════════════════════╗
║                    Complete!                     ║
╚══════════════════════════════════════════════════╝

Model: ${result.model.name}
Path:  ${result.path}
Size:  ${result.model.size}

Next steps:
  1. Use with Brittney Desktop: pnpm tauri:dev
  2. Use with Brittney Toolkit: 
     import { BrittneyEngine } from '@hololand/brittney-toolkit';
     const engine = new BrittneyEngine({ modelPath: '${result.path}' });

Documentation: https://hololand.io/docs/brittney
`);
  
} catch (error) {
  console.error('\n❌ Download failed:', error.message);
  process.exit(1);
}
