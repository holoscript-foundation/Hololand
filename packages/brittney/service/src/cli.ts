/**
 * Brittney CLI
 *
 * Command-line interface for managing the Brittney service.
 *
 * Usage:
 *   brittney start         Start the Brittney service
 *   brittney stop          Stop the Brittney service
 *   brittney status        Check service status
 *   brittney chat          Interactive chat mode
 *   brittney download      Download the Brittney model
 *   brittney config        Show/edit configuration
 */

import { loadConfig, saveConfig, getConfigDir, getModelsDir, isModelDownloaded, ENV_VARS } from './config.js';

const VERSION = '1.0.0';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'start':
      await startService();
      break;

    case 'stop':
      await stopService();
      break;

    case 'status':
      await checkStatus();
      break;

    case 'chat':
      await interactiveChat();
      break;

    case 'download':
      await downloadModel(args[1]);
      break;

    case 'config':
      await handleConfig(args.slice(1));
      break;

    case 'env':
      showEnvVars();
      break;

    case 'version':
    case '-v':
    case '--version':
      console.log(`Brittney CLI v${VERSION}`);
      break;

    case 'help':
    case '-h':
    case '--help':
    default:
      showHelp();
  }
}

// =============================================================================
// Commands
// =============================================================================

async function startService(): Promise<void> {
  console.log('🚀 Starting Brittney service...');

  // Check if model exists - check configured path first, then default
  const config = await loadConfig();
  const { existsSync } = await import('fs');
  const modelExists = existsSync(config.modelPath);
  
  if (!modelExists) {
    console.log('⚠️  Model not found at: ' + config.modelPath);
    console.log('   Run `brittney download` or set BRITTNEY_MODEL_PATH.');
    console.log('   Starting in mock mode...\n');
  } else {
    console.log('📦 Using model: ' + config.modelPath);
  }

  // Import and start server using tsx for TypeScript execution
  const { spawn } = await import('child_process');
  const serverPath = new URL('./server.ts', import.meta.url).pathname.slice(1); // Remove leading /

  // Use npx tsx to run TypeScript directly
  const child = spawn('npx', ['tsx', serverPath], {
    detached: true,
    stdio: 'ignore',
    shell: true,
  });

  child.unref();
  console.log(`✓ Brittney service started (PID: ${child.pid})`);
  console.log(`  Listening at http://localhost:11435`);
  console.log('  WebSocket at ws://localhost:11435/ws');
}

async function stopService(): Promise<void> {
  console.log('🛑 Stopping Brittney service...');

  try {
    const response = await fetch('http://localhost:11435/health');
    if (response.ok) {
      // Send shutdown signal
      process.kill(process.pid, 'SIGTERM');
      console.log('✓ Stop signal sent');
    }
  } catch {
    console.log('⚠️  Service not running');
  }
}

async function checkStatus(): Promise<void> {
  console.log('📊 Brittney Service Status\n');

  try {
    const response = await fetch('http://localhost:11435/health');
    const data = await response.json();

    console.log(`Status:       ✓ Running`);
    console.log(`Version:      ${data.version}`);
    console.log(`Model:        ${data.model}`);
    console.log(`Model Loaded: ${data.modelLoaded ? '✓ Yes' : '✗ No'}`);
    console.log(`Cloud:        ${data.cloudConfigured ? '✓ Configured' : '✗ Not configured'}`);
  } catch {
    console.log(`Status: ✗ Not running`);
    console.log('\nStart with: brittney start');
  }

  // Show config info
  const config = await loadConfig();
  console.log(`\nConfiguration:`);
  console.log(`  Config dir:  ${getConfigDir()}`);
  console.log(`  Models dir:  ${getModelsDir()}`);
  console.log(`  Model path:  ${config.modelPath}`);
  console.log(`  Model exists: ${isModelDownloaded() ? '✓ Yes' : '✗ No (run: brittney download)'}`);
}

async function interactiveChat(): Promise<void> {
  const readline = await import('readline');

  console.log('💬 Brittney Interactive Chat');
  console.log('   Type your message and press Enter. Type "exit" to quit.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('Goodbye! 👋');
        rl.close();
        return;
      }

      try {
        const response = await fetch('http://localhost:11435/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: input }],
          }),
        });

        const data = await response.json();
        console.log(`\nBrittney: ${data.content}\n`);
      } catch {
        console.log('\n⚠️  Could not connect to Brittney service.');
        console.log('   Make sure it\'s running: brittney start\n');
      }

      prompt();
    });
  };

  prompt();
}

async function downloadModel(modelName?: string): Promise<void> {
  const name = modelName || 'brittney-v1';
  console.log(`📥 Downloading model: ${name}`);
  console.log('');

  // Model download URLs would be configured here
  const MODEL_URLS: Record<string, string> = {
    'brittney-v1': 'https://huggingface.co/hololand/brittney-v1-gguf/resolve/main/brittney-v1.Q4_K_M.gguf',
    // Add more models as they become available
  };

  const url = MODEL_URLS[name];

  if (!url) {
    console.log(`⚠️  Unknown model: ${name}`);
    console.log('   Available models:');
    Object.keys(MODEL_URLS).forEach((m) => console.log(`     - ${m}`));
    return;
  }

  console.log(`   URL: ${url}`);
  console.log(`   This may take a few minutes...\n`);

  try {
    const { createWriteStream, existsSync, mkdirSync } = await import('fs');
    const { pipeline } = await import('stream/promises');
    const { Readable } = await import('stream');

    const modelsDir = getModelsDir();
    if (!existsSync(modelsDir)) {
      mkdirSync(modelsDir, { recursive: true });
    }

    const destPath = `${modelsDir}/${name}.gguf`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const totalSize = parseInt(response.headers.get('content-length') || '0');
    let downloadedSize = 0;

    const progressStream = new TransformStream({
      transform(chunk, controller) {
        downloadedSize += chunk.length;
        const percent = totalSize ? Math.round((downloadedSize / totalSize) * 100) : 0;
        process.stdout.write(`\r   Progress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB)`);
        controller.enqueue(chunk);
      },
    });

    const readable = Readable.fromWeb(response.body!.pipeThrough(progressStream) as any);
    const writable = createWriteStream(destPath);

    await pipeline(readable, writable);

    console.log(`\n\n✓ Model downloaded to: ${destPath}`);
    console.log('  Start Brittney with: brittney start');
  } catch (error: any) {
    console.error(`\n✗ Download failed: ${error.message}`);
    console.log('\nManual download:');
    console.log(`  1. Download from: ${url}`);
    console.log(`  2. Save to: ${getModelsDir()}/${name}.gguf`);
  }
}

async function handleConfig(args: string[]): Promise<void> {
  const config = await loadConfig();

  if (args.length === 0) {
    // Show current config
    console.log('⚙️  Brittney Configuration\n');
    console.log(JSON.stringify(config, null, 2));
    console.log(`\nConfig file: ${getConfigDir()}/config.json`);
    return;
  }

  if (args[0] === 'set' && args[1] && args[2]) {
    const key = args[1];
    const value = args[2];

    // Parse value
    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    if (value === 'false') parsedValue = false;
    if (!isNaN(Number(value))) parsedValue = Number(value);

    await saveConfig({ [key]: parsedValue });
    console.log(`✓ Set ${key} = ${parsedValue}`);
    return;
  }

  if (args[0] === 'get' && args[1]) {
    const key = args[1] as keyof typeof config;
    console.log(config[key]);
    return;
  }

  console.log('Usage:');
  console.log('  brittney config              Show all config');
  console.log('  brittney config get <key>    Get a config value');
  console.log('  brittney config set <key> <value>  Set a config value');
}

function showEnvVars(): void {
  console.log('🔧 Environment Variables\n');

  for (const [key, description] of Object.entries(ENV_VARS)) {
    const value = process.env[key];
    console.log(`${key}`);
    console.log(`  ${description}`);
    if (value) {
      console.log(`  Current: ${key.includes('KEY') ? '***' : value}`);
    }
    console.log('');
  }
}

function showHelp(): void {
  console.log(`
🤖 Brittney CLI v${VERSION}

Local AI assistant for Hololand development.

USAGE
  brittney <command> [options]

COMMANDS
  start              Start the Brittney service
  stop               Stop the Brittney service
  status             Check service status
  chat               Interactive chat mode
  download [model]   Download a model (default: brittney-v1)
  config             Show/edit configuration
  env                Show environment variables
  version            Show version
  help               Show this help

EXAMPLES
  brittney start                    Start the service
  brittney chat                     Chat with Brittney
  brittney config set preferCloud true   Prefer cloud LLM
  brittney download brittney-v1     Download the default model

CONFIGURATION
  Config is stored in: ~/.hololand/config.json
  Models are stored in: ~/.hololand/models/

  Set cloud provider with environment variables:
    OPENAI_API_KEY=sk-xxx brittney start
    ANTHROPIC_API_KEY=sk-ant-xxx brittney start
    GROK_API_KEY=xai-xxx brittney start

  Or use the generic cloud API key:
    BRITTNEY_CLOUD_PROVIDER=grok BRITTNEY_CLOUD_API_KEY=xai-xxx brittney start

For more info: https://docs.hololand.io/brittney
`);
}

// Run
main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
