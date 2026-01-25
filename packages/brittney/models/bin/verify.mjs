#!/usr/bin/env node

/**
 * Brittney Model Verification CLI
 * 
 * Verifies integrity of downloaded models.
 */

import { createHash } from 'crypto';
import { createReadStream, existsSync, statSync } from 'fs';
import { MODEL_REGISTRY, getModelInfo } from '../dist/registry.js';

const args = process.argv.slice(2);

let modelId = null;
let filePath = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--model' || arg === '-m') {
    modelId = args[++i];
  } else if (arg === '--file' || arg === '-f') {
    filePath = args[++i];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Brittney Model Verifier
=======================

Usage:
  brittney-verify --model <id> --file <path>

Options:
  --model, -m <id>    Model ID to verify against
  --file, -f <path>   Path to model file
  --help, -h          Show this help

Example:
  brittney-verify --model v1-free --file ./models/brittney-v1-free.gguf
`);
    process.exit(0);
  }
}

if (!modelId || !filePath) {
  console.error('❌ Both --model and --file are required');
  process.exit(1);
}

const model = getModelInfo(modelId);
if (!model) {
  console.error(`❌ Unknown model: ${modelId}`);
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

console.log(`\n🔍 Verifying ${model.name}...`);
console.log(`   File: ${filePath}\n`);

// Check file size
const stats = statSync(filePath);
console.log(`Size: ${stats.size} bytes`);
console.log(`Expected: ${model.sizeBytes} bytes`);

if (stats.size !== model.sizeBytes) {
  console.log(`\n⚠️  Size mismatch! File may be corrupted or incomplete.`);
}

// Calculate checksum
console.log(`\nCalculating SHA-256 checksum...`);

const hash = createHash('sha256');
const stream = createReadStream(filePath);

let processed = 0;
stream.on('data', (chunk) => {
  hash.update(chunk);
  processed += chunk.length;
  const percent = Math.round((processed / stats.size) * 100);
  process.stdout.write(`\rProgress: ${percent}%   `);
});

stream.on('end', () => {
  const checksum = hash.digest('hex');
  console.log(`\n\nChecksum: sha256:${checksum}`);
  
  if (model.checksum.includes('pending')) {
    console.log(`\n✅ Checksum calculated (no reference checksum available yet)`);
  } else {
    const expected = model.checksum.split(':')[1];
    if (checksum === expected) {
      console.log(`\n✅ Checksum verified! Model is authentic.`);
    } else {
      console.log(`\n❌ Checksum mismatch!`);
      console.log(`Expected: ${expected}`);
      console.log(`Got:      ${checksum}`);
      process.exit(1);
    }
  }
});

stream.on('error', (err) => {
  console.error(`\n❌ Error reading file:`, err.message);
  process.exit(1);
});
