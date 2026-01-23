#!/usr/bin/env node
/**
 * Brittney Model Setup Helper
 * 
 * Verifies model installation and provides setup guidance.
 * Run: npx brittney-setup
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODELS_DIR = resolve(__dirname, '../models');
const MODEL_FILES = {
  base: 'brittney-base.gguf',
  v2: 'brittney-v2.gguf',
};

console.log('\n🤖 Brittney Model Setup\n');
console.log('Models directory:', MODELS_DIR);
console.log('');

let hasModel = false;

for (const [name, file] of Object.entries(MODEL_FILES)) {
  const path = resolve(MODELS_DIR, file);
  const exists = existsSync(path);
  const icon = exists ? '✅' : '❌';
  console.log(`${icon} ${name}: ${file}`);
  if (exists) hasModel = true;
}

console.log('');

// Check environment variable
const envPath = process.env.BRITTNEY_MODEL_PATH;
if (envPath) {
  const exists = existsSync(envPath);
  console.log(`📁 BRITTNEY_MODEL_PATH: ${envPath}`);
  console.log(`   ${exists ? '✅ Found' : '❌ Not found'}`);
  if (exists) hasModel = true;
}

console.log('');

if (hasModel) {
  console.log('✅ Brittney is ready to use!\n');
  console.log('Usage:');
  console.log('```typescript');
  console.log("import { BrittneyEngine } from '@hololand/brittney-toolkit';");
  console.log('');
  console.log('const engine = new BrittneyEngine({});');
  console.log('await engine.initialize();');
  console.log('```');
} else {
  console.log('⚠️  No model found!\n');
  console.log('To set up Brittney:');
  console.log('');
  console.log('1. Copy your GGUF model to the models directory:');
  console.log(`   ${MODELS_DIR}/brittney-base.gguf`);
  console.log('');
  console.log('2. Or set the BRITTNEY_MODEL_PATH environment variable:');
  console.log('   export BRITTNEY_MODEL_PATH=/path/to/your/model.gguf');
  console.log('');
  console.log('3. Or use cloud inference (bring your own API key):');
  console.log('```typescript');
  console.log("const engine = new BrittneyEngine({");
  console.log("  userApiKey: 'your-api-key',");
  console.log("  cloudProvider: 'openai',");
  console.log('});');
  console.log('```');
}

console.log('');
