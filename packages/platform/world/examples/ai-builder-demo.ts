/**
 * AI World Builder Demo
 *
 * Shows how to use Claude or Grok API to build Hololand worlds in VR
 */

import { HololandWorld } from '../src/HololandWorld';
import { AIWorldBuilder } from '../src/ai/AIWorldBuilder';
import { NPCSystem } from '../src/systems/NPCSystem';
import { DialogManager } from '../src/managers/DialogManager';
import { HoloScriptLoader } from '../src/utils/HoloScriptLoader';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🎨 AI World Builder Demo\n');

  // Get API key from environment
  const provider = (process.env.AI_PROVIDER as 'anthropic' | 'grok') || 'anthropic';
  const apiKey = process.env.CLAUDE_API_KEY || process.env.GROK_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: Set CLAUDE_API_KEY or GROK_API_KEY environment variable');
    process.exit(1);
  }

  console.log(`✅ Using ${provider === 'anthropic' ? 'Claude' : 'Grok'} API\n`);

  // Initialize Hololand world
  const world = new HololandWorld({
    name: 'AI Generated World',
    enablePhysics: true,
    bounds: {
      min: { x: -100, y: -100, z: -100 },
      max: { x: 100, y: 100, z: 100 },
    },
  });

  // Initialize systems
  const npcSystem = new NPCSystem();
  const dialogManager = new DialogManager();
  const holoScriptLoader = new HoloScriptLoader(npcSystem, dialogManager);

  // Initialize AI builder
  const aiBuilder = new AIWorldBuilder({
    provider,
    apiKey,
    temperature: 0.7,
    maxTokens: 4096,
  });

  await aiBuilder.initialize();

  console.log('🤖 AI Builder initialized\n');

  // Example prompts to build different VR scenes
  const examples = [
    {
      name: 'VR Art Gallery',
      prompt: `Create a VR art gallery with:
- A large room with white walls
- 5 paintings hanging on the walls at eye level
- Pedestals with sculptures
- Ambient lighting
- A glass skylight above`,
    },
    {
      name: 'Physics Playground',
      prompt: `Create a physics playground with:
- A large platform
- Several cubes and spheres that can be moved
- A ramp for objects to roll down
- Walls to contain the objects
- Everything should have physics enabled`,
    },
    {
      name: 'Cyberpunk City Block',
      prompt: `Create a cyberpunk city scene with:
- Neon-lit buildings
- Holographic billboards
- Flying vehicles
- Street level with shops
- Atmospheric fog`,
    },
    {
      name: 'Nature Scene',
      prompt: `Create a peaceful nature scene with:
- Rolling hills
- Trees and grass
- A small pond with reflection
- Rocks and boulders
- Ambient nature sounds (as objects)`,
    },
  ];

  // Let user pick which scene to generate
  const sceneIndex = parseInt(process.argv[2] || '0');
  const example = examples[sceneIndex] || examples[0];

  console.log(`📝 Generating: ${example.name}\n`);
  console.log(`Prompt: ${example.prompt}\n`);

  // Generate HoloScript using AI
  const startTime = Date.now();

  console.log('🔮 Asking AI to generate HoloScript...\n');

  // Use streaming for real-time output
  let finalResult;
  for await (const { chunk, holoScript, done } of aiBuilder.buildStream({
    prompt: example.prompt,
    stream: true,
  })) {
    if (chunk) {
      process.stdout.write(chunk);
    }

    if (done) {
      console.log('\n\n');
      finalResult = holoScript;
    }
  }

  const generationTime = Date.now() - startTime;

  if (!finalResult) {
    console.error('❌ No HoloScript generated');
    process.exit(1);
  }

  console.log('✅ HoloScript generated\n');
  console.log(`📊 Stats:`);
  console.log(`  - Generation time: ${generationTime}ms`);
  console.log(`  - Code length: ${finalResult.length} characters`);
  console.log(`  - Lines: ${finalResult.split('\n').length}\n`);

  // Save generated HoloScript
  const outputPath = join(process.cwd(), 'output', `${example.name.toLowerCase().replace(/\s+/g, '-')}.holo`);
  writeFileSync(outputPath, finalResult);
  console.log(`💾 Saved: ${outputPath}\n`);

  // Parse and validate
  console.log('🔍 Parsing HoloScript...');

  const parseResult = await aiBuilder.build({ prompt: example.prompt });

  if (parseResult.errors) {
    console.error('❌ Parse errors:');
    parseResult.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log('✅ HoloScript is valid\n');

  // Load into Hololand world
  console.log('🌍 Loading into Hololand world...');

  try {
    holoScriptLoader.load(finalResult);
    console.log('✅ Loaded into world\n');
  } catch (error: any) {
    console.error('❌ Failed to load:', error.message);
    process.exit(1);
  }

  // Start world simulation
  world.start();
  console.log('🚀 World simulation started\n');

  // Show world state
  const state = world.getState();
  console.log('📊 World State:');
  console.log(`  - Name: ${state.name}`);
  console.log(`  - Objects: ${state.totalObjects}`);
  console.log(`  - Uptime: ${state.uptime}ms\n`);

  // Run for a few seconds to show it's working
  console.log('⏱️  Running simulation for 5 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  world.stop();
  console.log('✅ Simulation stopped\n');

  console.log('🎉 Demo complete!\n');
  console.log('Next steps:');
  console.log(`  1. Open ${outputPath} to see the generated HoloScript`);
  console.log('  2. Compile to your target platform (Unity, Unreal, WebXR, etc.)');
  console.log('  3. Experience in VR!\n');
}

main().catch(console.error);
