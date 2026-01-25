/**
 * Download Brittney GGUF model for desktop app
 * 
 * Run: node scripts/download-model.mjs
 *      node scripts/download-model.mjs --model v1-q4  (for low memory devices)
 */

import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsDir = join(__dirname, '..', 'src-tauri', 'models');
const modelPath = join(modelsDir, 'brittney-f16.gguf');

// Model registry with GitHub releases URLs
const MODEL_REGISTRY = {
  'v1-free': {
    name: 'Brittney V1 Free',
    url: 'https://github.com/hololand/hololand/releases/download/brittney-v1.0.0/brittney-v1-free.gguf',
    size: '2.0 GB',
    sizeBytes: 2_147_483_648,
    minMemory: '4 GB',
  },
  'v1-q4': {
    name: 'Brittney V1 Q4 (Quantized)',
    url: 'https://github.com/hololand/hololand/releases/download/brittney-v1.0.0/brittney-v1-q4.gguf',
    size: '1.2 GB',
    sizeBytes: 1_288_490_189,
    minMemory: '2 GB',
  },
  'v1-q8': {
    name: 'Brittney V1 Q8',
    url: 'https://github.com/hololand/hololand/releases/download/brittney-v1.0.0/brittney-v1-q8.gguf',
    size: '1.6 GB',
    sizeBytes: 1_717_986_918,
    minMemory: '3 GB',
  },
};

// Parse arguments
const args = process.argv.slice(2);
let modelId = 'v1-free';
let force = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model' || args[i] === '-m') {
    modelId = args[++i];
  } else if (args[i] === '--force' || args[i] === '-f') {
    force = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Brittney Model Downloader
=========================

Usage:
  node scripts/download-model.mjs [options]

Options:
  --model, -m <id>   Model to download: v1-free (default), v1-q4, v1-q8
  --force, -f        Force re-download even if exists
  --help, -h         Show this help

Models:
  v1-free   Full precision (2.0 GB, needs 4 GB RAM)
  v1-q4     Quantized (1.2 GB, needs 2 GB RAM) - mobile friendly
  v1-q8     Better quality quantized (1.6 GB, needs 3 GB RAM)
`);
    process.exit(0);
  }
}

const model = MODEL_REGISTRY[modelId];
if (!model) {
  console.error(`❌ Unknown model: ${modelId}`);
  console.log('Available: v1-free, v1-q4, v1-q8');
  process.exit(1);
}

console.log(`
╔══════════════════════════════════════════════════╗
║     Brittney Desktop - Model Downloader          ║
║           V1 Free - Production Ready             ║
╚══════════════════════════════════════════════════╝

📦 Model: ${model.name}
📏 Size: ${model.size}
💾 Min RAM: ${model.minMemory}
`);

async function downloadModel() {
  // Check if model already exists
  if (!force && existsSync(modelPath)) {
    const stats = statSync(modelPath);
    console.log(`✅ Model already exists: ${modelPath}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log('\n   Use --force to re-download.\n');
    return;
  }

  // Ensure models directory exists
  if (!existsSync(modelsDir)) {
    console.log('📁 Creating models directory...');
    mkdirSync(modelsDir, { recursive: true });
  }

  console.log(`⬇️  Downloading from GitHub Releases...`);
  console.log(`   URL: ${model.url}\n`);

  try {
    const response = await fetch(model.url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    const total = contentLength || model.sizeBytes;

    const writeStream = createWriteStream(modelPath);
    const reader = response.body.getReader();

    let downloaded = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      writeStream.write(value);
      downloaded += value.length;

      const elapsed = (Date.now() - startTime) / 1000;
      const speed = downloaded / elapsed;
      const percent = Math.round((downloaded / total) * 100);
      const speedMB = (speed / 1024 / 1024).toFixed(1);
      const downloadedMB = (downloaded / 1024 / 1024).toFixed(0);
      const totalMB = (total / 1024 / 1024).toFixed(0);
      const eta = Math.round((total - downloaded) / speed);

      process.stdout.write(
        `\r[${'█'.repeat(Math.floor(percent / 3))}${'░'.repeat(33 - Math.floor(percent / 3))}] ` +
        `${percent}% | ${speedMB} MB/s | ${downloadedMB}/${totalMB} MB | ETA: ${eta}s   `
      );
    }

    writeStream.end();
    reader.releaseLock();

    console.log(`\n\n✅ Download complete!`);
    console.log(`   Location: ${modelPath}`);
    console.log(`
Next steps:
  pnpm tauri:dev     # Start development
  pnpm tauri:build   # Build for distribution
`);

  } catch (error) {
    console.error(`\n❌ Download failed: ${error.message}`);
    console.log(`
Manual download:
  1. Go to: ${model.url}
  2. Save as: ${modelPath}
  
Or try: curl -L -o "${modelPath}" "${model.url}"
`);
    process.exit(1);
  }
}

downloadModel().catch(console.error);
