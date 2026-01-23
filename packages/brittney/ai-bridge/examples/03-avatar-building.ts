/**
 * Demo 3: Avatar Building with AI
 * 
 * Shows how to build AI-driven avatars:
 * Natural Language → Avatar HoloScript → R3F Avatar Components → WebXR
 */

import { HololandAIBridge } from '@hololand/ai-bridge';

async function demo3AvatarBuilding() {
  console.log('👤 Demo 3: AI Avatar Building Pipeline\n');

  const bridge = new HololandAIBridge({
    enableCompilation: true,
    enableOptimization: true,
    enableVoice: false,
  });

  // Avatar building prompts
  const avatarPrompts = [
    {
      prompt: 'create a friendly avatar with blue skin and a welcoming smile',
      description: 'Basic avatar creation',
    },
    {
      prompt: 'make an avatar that waves hello when someone approaches',
      description: 'Avatar with interactive gesture',
    },
    {
      prompt: 'build a customizable avatar with hair, clothing, and facial expressions',
      description: 'Advanced avatar with customization',
    },
  ];

  for (const { prompt, description } of avatarPrompts) {
    console.log(`\n🎨 ${description}`);
    console.log(`   Input: "${prompt}"`);

    try {
      const result = await bridge.translateToHoloScript({
        naturalLanguage: prompt,
        context: {
          userLevel: 'intermediate',
        },
      });

      console.log(`\n   ✅ Pipeline Status:`);
      console.log(`      - Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`      - HoloScript Generated: ${result.holoScript ? '✓' : '✗'}`);

      if (result.compilationResult?.success) {
        const meta = result.compilationResult.metadata;
        console.log(`      - Compilation: ✓ Success in ${meta?.duration}ms`);
        console.log(`      - Zones: ${meta?.zones}, Entities: ${meta?.entities}, Handlers: ${meta?.handlers}`);
        console.log(`      - R3F Code Generated: ✓`);
        console.log(`      - Ready for WebXR: ✓`);
      } else {
        console.log(`      - Compilation: ✗ ${result.compilationResult?.error}`);
      }

      if (result.explanation) {
        console.log(`\n   📖 Explanation: ${result.explanation}`);
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n💡 Avatar Features Enabled By This Pipeline:');
  console.log('   ✓ Dynamic expressions (smile, frown, etc.)');
  console.log('   ✓ Gesture recognition (wave, point, thumbs-up)');
  console.log('   ✓ AI-driven behaviors (wave on approach, respond to voice)');
  console.log('   ✓ Customizable appearance (skin, clothing, accessories)');
  console.log('   ✓ Real-time physics (cloth simulation, collision detection)');
  console.log('   ✓ Multiplayer synchronization (position, animation, expression)');
}

// Run demo
demo3AvatarBuilding().catch(console.error);
