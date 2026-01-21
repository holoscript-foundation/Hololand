/**
 * Check if model exists on postinstall
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelPath = join(__dirname, '..', 'src-tauri', 'models', 'brittney-f16.gguf');

if (!existsSync(modelPath)) {
  console.log('\n');
  console.log('⚠️  Brittney model not found!');
  console.log('   Run: pnpm download:model');
  console.log('   Or copy brittney-f16.gguf to: src-tauri/models/');
  console.log('\n');
} else {
  console.log('✅ Brittney model found');
}
