/**
 * Download Brittney GGUF model for bundling
 * 
 * Run: node scripts/download-model.mjs
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsDir = join(__dirname, '..', 'src-tauri', 'models');
const modelPath = join(modelsDir, 'brittney-f16.gguf');

// Model sources (try in order)
const MODEL_SOURCES = [
  // Primary: Local Ollama export
  'file://~/.ollama/models/blobs/sha256-*', // Would need to find the right blob
  
  // Secondary: Hugging Face (if uploaded)
  // 'https://huggingface.co/hololand/brittney/resolve/main/brittney-f16.gguf',
  
  // Tertiary: Direct download from our CDN (if set up)
  // 'https://models.hololand.io/brittney/brittney-f16.gguf',
];

// For now, we'll copy from the local Brittney directory
const LOCAL_MODEL_PATH = join(__dirname, '..', '..', '..', '✱brittney', '✦brittney', 'brittney-f16.gguf');

async function downloadModel() {
  console.log('📦 Brittney Model Downloader');
  console.log('============================\n');
  
  // Check if model already exists
  if (existsSync(modelPath)) {
    console.log('✅ Model already exists at:', modelPath);
    console.log('   Delete it manually to re-download.\n');
    return;
  }
  
  // Ensure models directory exists
  if (!existsSync(modelsDir)) {
    console.log('📁 Creating models directory...');
    mkdirSync(modelsDir, { recursive: true });
  }
  
  // Check for local model first
  if (existsSync(LOCAL_MODEL_PATH)) {
    console.log('📂 Found local model at:', LOCAL_MODEL_PATH);
    console.log('📋 Copying to bundle location...\n');
    
    const { copyFileSync } = await import('fs');
    copyFileSync(LOCAL_MODEL_PATH, modelPath);
    
    console.log('✅ Model copied successfully!');
    console.log('   Location:', modelPath);
    return;
  }
  
  // Try downloading from sources
  console.log('⬇️  Model not found locally, attempting download...\n');
  console.log('   Note: You may need to:');
  console.log('   1. Export from Ollama: ollama show brittney:latest --modelfile');
  console.log('   2. Or copy brittney-f16.gguf to:', modelPath);
  console.log('\n');
  
  // For now, just show instructions
  console.log('📝 Manual steps:');
  console.log('   1. Locate your brittney-f16.gguf file');
  console.log('   2. Copy it to:', modelPath);
  console.log('\n');
  console.log('   Expected file size: ~2.05 GB');
}

downloadModel().catch(console.error);
