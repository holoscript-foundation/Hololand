#!/usr/bin/env npx tsx
/**
 * Auto-start Brittney AI Service
 * 
 * Detects GGUF model and starts the Brittney service on port 11435
 * for HoloScript MCP tools to use.
 * 
 * Usage:
 *   npx tsx scripts/start-brittney.ts
 *   npm run brittney
 */

import { existsSync } from 'fs';
import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// GGUF model locations (in priority order)
const GGUF_PATHS = [
  path.join(ROOT, 'models', 'brittney-v4-expert.gguf'),
  path.join(ROOT, 'packages', 'brittney', 'service', 'models', 'brittney-v4-expert.gguf'),
  process.env.BRITTNEY_MODEL_PATH || '',
].filter(Boolean);

const BRITTNEY_PORT = 11435;
const BRITTNEY_HOST = 'localhost';

async function checkPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;
    
    exec(cmd, (error, stdout) => {
      resolve(stdout.toString().trim().length > 0);
    });
  });
}

async function checkBrittneyHealth(): Promise<boolean> {
  try {
    const response = await fetch(`http://${BRITTNEY_HOST}:${BRITTNEY_PORT}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function findGGUFModel(): string | null {
  for (const ggufPath of GGUF_PATHS) {
    if (existsSync(ggufPath)) {
      return ggufPath;
    }
  }
  return null;
}

async function startBrittneyService(modelPath: string): Promise<void> {
  console.log('🚀 Starting Brittney AI Service...');
  console.log(`📦 Model: ${modelPath}`);
  console.log(`🌐 URL: http://${BRITTNEY_HOST}:${BRITTNEY_PORT}`);
  
  const serviceDir = path.join(ROOT, 'packages', 'brittney', 'service');
  
  // Check if service is built
  const distPath = path.join(serviceDir, 'dist', 'server.js');
  if (!existsSync(distPath)) {
    console.log('📦 Building Brittney service first...');
    await new Promise<void>((resolve, reject) => {
      const build = spawn('pnpm', ['build'], { 
        cwd: serviceDir, 
        shell: true,
        stdio: 'inherit' 
      });
      build.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });
  }
  
  // Start the service
  const env = {
    ...process.env,
    BRITTNEY_PORT: String(BRITTNEY_PORT),
    BRITTNEY_MODEL_PATH: modelPath,
    NODE_ENV: 'production',
  };
  
  const server = spawn('node', ['dist/server.js'], {
    cwd: serviceDir,
    env,
    stdio: 'inherit',
    detached: false,
  });
  
  server.on('error', (err) => {
    console.error('❌ Failed to start Brittney:', err.message);
    process.exit(1);
  });
  
  // Wait for health check
  let retries = 30;
  while (retries > 0) {
    await new Promise(r => setTimeout(r, 1000));
    if (await checkBrittneyHealth()) {
      console.log('✅ Brittney AI Service is ready!');
      console.log('');
      console.log('🔧 MCP tools are now available:');
      console.log('   - mcp_hololand_brittney_generate_holoscript');
      console.log('   - mcp_hololand_brittney_create_and_inject');
      console.log('   - mcp_hololand_brittney_learn_holoscript');
      console.log('');
      return;
    }
    retries--;
  }
  
  console.log('⚠️ Brittney started but health check failed. Check logs above.');
}

async function main() {
  console.log('');
  console.log('🐿️  Brittney AI Auto-Start');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  // Check if already running
  if (await checkBrittneyHealth()) {
    console.log('✅ Brittney is already running at http://localhost:11435');
    console.log('');
    return;
  }
  
  // Check if port is in use by something else - with retry for TIME_WAIT
  let portRetries = 10;
  while (await checkPortInUse(BRITTNEY_PORT) && portRetries > 0) {
    // Port in use but Brittney not responding - might be TIME_WAIT
    if (portRetries === 10) {
      console.log(`⏳ Port ${BRITTNEY_PORT} is in use (possibly TIME_WAIT). Waiting...`);
    }
    await new Promise(r => setTimeout(r, 3000));
    portRetries--;
    
    // Re-check if Brittney became available
    if (await checkBrittneyHealth()) {
      console.log('✅ Brittney is already running at http://localhost:11435');
      console.log('');
      return;
    }
  }
  
  if (await checkPortInUse(BRITTNEY_PORT) && portRetries === 0) {
    console.log(`⚠️ Port ${BRITTNEY_PORT} is still in use after waiting.`);
    console.log('   Another service may be using this port.');
    console.log('');
    return;
  }
  
  // Find GGUF model
  const modelPath = findGGUFModel();
  
  if (!modelPath) {
    console.log('❌ No Brittney GGUF model found.');
    console.log('');
    console.log('   Expected locations:');
    GGUF_PATHS.forEach(p => console.log(`   - ${p}`));
    console.log('');
    console.log('   Download the model:');
    console.log('   npm run brittney:download');
    console.log('');
    process.exit(1);
  }
  
  console.log(`✅ Found GGUF model: ${path.basename(modelPath)}`);
  console.log('');
  
  await startBrittneyService(modelPath);
}

main().catch(console.error);
