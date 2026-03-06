/**
 * Holoverse Zone Generator Demo
 *
 * Shows how to use AI (Claude/Grok) to generate zones for the Holoverse metaverse.
 *
 * In the Holoverse (like Ready Player One's OASIS):
 * - ONE persistent world
 * - Zones are PLACES that exist in the world
 * - Users portal between zones
 * - Everything is social, multiplayer, persistent
 * - HoloScript defines what exists
 */

import { HololandZoneGenerator } from '../src/ai/HololandZoneGenerator';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🌍 Holoverse Zone Generator\n');
  console.log('Generate zones for the metaverse using AI\n');

  // Get API key
  const provider = (process.env.AI_PROVIDER as 'anthropic' | 'grok') || 'anthropic';
  const apiKey = process.env.CLAUDE_API_KEY || process.env.GROK_API_KEY;

  if (!apiKey) {
    console.error('❌ Set CLAUDE_API_KEY or GROK_API_KEY environment variable');
    process.exit(1);
  }

  console.log(`✅ Using ${provider === 'anthropic' ? 'Claude' : 'Grok'}\n`);

  // Initialize generator
  const generator = new HololandZoneGenerator({
    provider,
    apiKey,
    temperature: 0.7,
  });

  await generator.initialize();
  console.log('🤖 AI Generator ready\n');

  // Example zone requests
  const zones = [
    {
      name: 'Cyberpunk Coffee Shop',
      prompt: `Create a cyberpunk-themed coffee shop with:
- Neon lighting and holographic menus
- Seating areas for socializing
- A barista NPC who serves drinks
- Ambient electronic music
- Windows showing a futuristic city view`,
      metadata: {
        name: 'Neon Brew Cafe',
        category: 'social' as const,
        maxPlayers: 30,
      },
    },
    {
      name: 'Physics Sandbox',
      prompt: `Create an interactive physics playground with:
- Cubes, spheres, and ramps
- A cannon that shoots objects
- Domino setups
- Zero-gravity zone in the center
- Trampoline pads`,
      metadata: {
        name: 'Gravity Lab',
        category: 'entertainment' as const,
        maxPlayers: 20,
      },
    },
    {
      name: 'Art Gallery',
      prompt: `Create a modern art gallery with:
- White walls and spot lighting
- 10 paintings on display
- Sculpture pedestals
- A curator NPC who explains the art
- Ambient classical music
- VIP lounge area`,
      metadata: {
        name: 'Infinite Canvas',
        category: 'art' as const,
        maxPlayers: 50,
      },
    },
    {
      name: 'Casino Floor',
      prompt: `Create a Las Vegas-style casino with:
- Slot machines
- Blackjack and poker tables
- Roulette wheel
- Dealer NPCs
- Jazzy lounge music
- VIP area with velvet ropes`,
      metadata: {
        name: 'Lucky Star Casino',
        category: 'entertainment' as const,
        maxPlayers: 100,
      },
    },
  ];

  // Let user choose which zone to generate
  const zoneIndex = parseInt(process.argv[2] || '0');
  const zoneRequest = zones[zoneIndex] || zones[0];

  console.log(`📝 Generating: ${zoneRequest.name}\n`);
  console.log(`Category: ${zoneRequest.metadata.category}`);
  console.log(`Max Players: ${zoneRequest.metadata.maxPlayers}\n`);

  // Generate zone
  console.log('🔮 AI is designing your zone...\n');

  const startTime = Date.now();

  // Stream generation for real-time output
  let chunks = '';
  for await (const { chunk, done } of generator.generateZoneStream(zoneRequest)) {
    if (chunk) {
      process.stdout.write(chunk);
      chunks += chunk;
    }

    if (done) {
      console.log('\n\n');
    }
  }

  // Parse the final zone
  const zone = await generator.generateZone(zoneRequest);

  console.log('✅ Zone generated!\n');

  // Show stats
  console.log('📊 Zone Stats:');
  console.log(`  - Name: ${zone.name}`);
  console.log(`  - Category: ${zone.metadata.category}`);
  console.log(`  - Description: ${zone.metadata.description}`);
  console.log(`  - Features: ${zone.metadata.features.join(', ')}`);
  console.log(`  - HoloScript Size: ${zone.holoScript.length} chars`);
  console.log(`  - Lines: ${zone.holoScript.split('\n').length}`);
  console.log(`  - Generation Time: ${zone.generationTimeMs}ms\n`);

  // Show portal config
  console.log('🌀 Portal Configuration:');
  console.log(`  - Position: [${zone.portal.position.join(', ')}]`);
  console.log(`  - Color: ${zone.portal.color}`);
  console.log(`  - Label: ${zone.portal.label}\n`);

  // Validate HoloScript
  if (zone.errors) {
    console.error('❌ HoloScript has parse errors:');
    zone.errors.forEach(err => console.error(`  - ${err}`));
    console.log('');
  } else {
    console.log('✅ HoloScript is valid\n');
  }

  // Save zone files
  const outputDir = join(process.cwd(), 'output', 'zones');
  mkdirSync(outputDir, { recursive: true });

  const zoneSlug = zone.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Save HoloScript
  const holoPath = join(outputDir, `${zoneSlug}.holo`);
  writeFileSync(holoPath, zone.holoScript);
  console.log(`💾 Saved HoloScript: ${holoPath}`);

  // Save zone manifest
  const manifestPath = join(outputDir, `${zoneSlug}.json`);
  writeFileSync(manifestPath, JSON.stringify({
    name: zone.name,
    category: zone.metadata.category,
    description: zone.metadata.description,
    features: zone.metadata.features,
    portal: zone.portal,
    holoScriptFile: `${zoneSlug}.holo`,
    generatedAt: new Date().toISOString(),
    generationTimeMs: zone.generationTimeMs,
  }, null, 2));
  console.log(`💾 Saved manifest: ${manifestPath}\n`);

  // Next steps
  console.log('🎉 Zone ready for the Holoverse!\n');
  console.log('Next steps:');
  console.log('  1. Review the generated HoloScript');
  console.log('  2. Test in Hololand Central');
  console.log('  3. Add portal to Main Plaza');
  console.log('  4. Deploy to Holoverse\n');

  console.log('To add this zone to Hololand Central:');
  console.log('  - Copy .holo file to examples/hololand-central/src/zones/');
  console.log('  - Add portal in MainPlaza.tsx');
  console.log('  - Register in zone router\n');
}

main().catch(console.error);
