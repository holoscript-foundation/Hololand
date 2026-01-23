/**
 * Demo 1: Basic Natural Language → R3F Pipeline
 * 
 * Shows the complete pipeline:
 * Natural Language → HoloScript → React Three Fiber Code
 */

import { HololandAIBridge } from '@hololand/ai-bridge';

async function demo1BasicPipeline() {
  console.log('🚀 Demo 1: Natural Language → R3F Pipeline\n');

  const bridge = new HololandAIBridge({
    enableCompilation: true,
    enableOptimization: true,
    enableVoice: false, // Not using voice in this demo
  });

  const prompts = [
    'create a coffee shop with a counter and menu board',
    'build a marketplace with product shelves',
    'make a greeting zone with a podium',
  ];

  for (const prompt of prompts) {
    console.log(`\n📝 Input: "${prompt}"\n`);

    try {
      const result = await bridge.translateToHoloScript({
        naturalLanguage: prompt,
        context: {
          userLevel: 'beginner',
          location: { x: 0, y: 0, z: 0 },
        },
      });

      console.log('✅ Translation Result:');
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`  HoloScript: ${result.holoScript?.substring(0, 100)}...`);

      if (result.compilationResult?.success) {
        console.log(`  Compilation: ✅ Success`);
        console.log(`    - Zones: ${result.compilationResult.metadata?.zones || 0}`);
        console.log(`    - Entities: ${result.compilationResult.metadata?.entities || 0}`);
        console.log(`    - Duration: ${result.compilationResult.metadata?.duration}ms`);
        console.log(`    - R3F Preview: ${result.r3fCode?.substring(0, 80)}...`);
      } else {
        console.log(`  Compilation: ❌ ${result.compilationResult?.error}`);
      }

      if (result.suggestion) {
        console.log(`  💡 Suggestion: ${result.suggestion}`);
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

// Run demo
demo1BasicPipeline().catch(console.error);
